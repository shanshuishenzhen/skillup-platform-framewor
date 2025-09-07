import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAdminAuth } from '@/lib/auth';
import { logAdminOperation } from '@/lib/admin-logs';

/**
 * 部门报表导出API接口
 * 支持Excel、PDF、CSV等格式的报表导出
 */

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/admin/departments/reports
 * 生成并导出部门报表
 * 
 * @param request - HTTP请求对象
 * @returns 报表文件或下载链接
 */
export async function POST(request: NextRequest) {
  try {
    // 验证管理员权限
    const authResult = await verifyAdminAuth(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const body = await request.json();
    const {
      report_type, // personnel, performance, budget, comprehensive
      format, // excel, pdf, csv
      department_ids = [],
      time_range = '30d',
      include_sub_depts = false,
      template_id,
      custom_fields = [],
      filters = {}
    } = body;

    // 验证必需参数
    if (!report_type || !format) {
      return NextResponse.json(
        { error: '缺少必需参数：report_type 和 format' },
        { status: 400 }
      );
    }

    // 生成报表数据
    const reportData = await generateReportData({
      report_type,
      department_ids,
      time_range,
      include_sub_depts,
      custom_fields,
      filters
    });

    // 根据格式生成文件
    let fileBuffer: Buffer;
    let fileName: string;
    let mimeType: string;

    switch (format.toLowerCase()) {
      case 'excel':
        const excelResult = await generateExcelReport(reportData, report_type);
        fileBuffer = excelResult.buffer;
        fileName = excelResult.fileName;
        mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        break;
      case 'pdf':
        const pdfResult = await generatePDFReport(reportData, report_type);
        fileBuffer = pdfResult.buffer;
        fileName = pdfResult.fileName;
        mimeType = 'application/pdf';
        break;
      case 'csv':
        const csvResult = await generateCSVReport(reportData, report_type);
        fileBuffer = Buffer.from(csvResult.content, 'utf-8');
        fileName = csvResult.fileName;
        mimeType = 'text/csv';
        break;
      default:
        return NextResponse.json(
          { error: '不支持的文件格式' },
          { status: 400 }
        );
    }

    // 记录操作日志
    await logAdminOperation({
      admin_id: authResult.user.id,
      action: 'export_department_report',
      resource_type: 'department_report',
      resource_id: `${report_type}_${format}`,
      details: {
        report_type,
        format,
        department_ids,
        time_range,
        include_sub_depts,
        file_name: fileName
      }
    });

    // 返回文件
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': fileBuffer.length.toString()
      }
    });

  } catch (error) {
    console.error('生成报表失败:', error);
    return NextResponse.json(
      { error: '生成报表失败' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/departments/reports
 * 获取报表模板列表和配置
 * 
 * @param request - HTTP请求对象
 * @returns 报表模板列表
 */
export async function GET(request: NextRequest) {
  try {
    // 验证管理员权限
    const authResult = await verifyAdminAuth(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'templates';

    if (action === 'templates') {
      // 获取报表模板列表
      const templates = await getReportTemplates();
      return NextResponse.json({
        success: true,
        data: templates
      });
    } else if (action === 'history') {
      // 获取报表生成历史
      const history = await getReportHistory(authResult.user.id);
      return NextResponse.json({
        success: true,
        data: history
      });
    }

    return NextResponse.json(
      { error: '不支持的操作' },
      { status: 400 }
    );

  } catch (error) {
    console.error('获取报表信息失败:', error);
    return NextResponse.json(
      { error: '获取报表信息失败' },
      { status: 500 }
    );
  }
}

/**
 * 生成报表数据
 * @param params - 报表参数
 * @returns 报表数据
 */
async function generateReportData(params: any) {
  const { report_type, department_ids, time_range, include_sub_depts, custom_fields, filters } = params;
  
  let data: any = {};

  switch (report_type) {
    case 'personnel':
      data = await generatePersonnelReportData(department_ids, time_range, include_sub_depts, filters);
      break;
    case 'performance':
      data = await generatePerformanceReportData(department_ids, time_range, include_sub_depts, filters);
      break;
    case 'budget':
      data = await generateBudgetReportData(department_ids, time_range, include_sub_depts, filters);
      break;
    case 'comprehensive':
      data = await generateComprehensiveReportData(department_ids, time_range, include_sub_depts, filters);
      break;
    default:
      throw new Error('不支持的报表类型');
  }

  return {
    ...data,
    meta: {
      report_type,
      generated_at: new Date().toISOString(),
      time_range,
      department_count: department_ids.length || 'all',
      include_sub_depts
    }
  };
}

/**
 * 生成人员报表数据
 * @param departmentIds - 部门ID列表
 * @param timeRange - 时间范围
 * @param includeSubDepts - 是否包含子部门
 * @param filters - 过滤条件
 * @returns 人员报表数据
 */
async function generatePersonnelReportData(departmentIds: string[], timeRange: string, includeSubDepts: boolean, filters: any) {
  const { data: personnelData } = await supabase
    .from('user_departments')
    .select(`
      id,
      position,
      is_primary,
      is_manager,
      status,
      created_at,
      updated_at,
      users!inner(id, email, full_name, status, created_at),
      departments!inner(id, name, code, level)
    `)
    .eq('deleted_at', null);

  return {
    title: '部门人员统计报表',
    summary: {
      total_personnel: personnelData?.length || 0,
      active_personnel: personnelData?.filter(p => p.users.status === 'active').length || 0,
      managers: personnelData?.filter(p => p.is_manager).length || 0,
      departments_covered: new Set(personnelData?.map(p => p.department_id)).size
    },
    details: personnelData?.map(item => ({
      user_id: item.users.id,
      user_name: item.users.full_name,
      user_email: item.users.email,
      department_name: item.departments.name,
      department_code: item.departments.code,
      position: item.position || '未设置',
      is_primary: item.is_primary ? '是' : '否',
      is_manager: item.is_manager ? '是' : '否',
      status: item.status === 'active' ? '在职' : '离职',
      join_date: new Date(item.created_at).toLocaleDateString('zh-CN'),
      user_status: item.users.status === 'active' ? '激活' : '未激活'
    })) || []
  };
}

/**
 * 生成绩效报表数据
 * @param departmentIds - 部门ID列表
 * @param timeRange - 时间范围
 * @param includeSubDepts - 是否包含子部门
 * @param filters - 过滤条件
 * @returns 绩效报表数据
 */
async function generatePerformanceReportData(departmentIds: string[], timeRange: string, includeSubDepts: boolean, filters: any) {
  // 模拟绩效数据
  return {
    title: '部门绩效统计报表',
    summary: {
      average_score: 85.6,
      total_evaluations: 156,
      completion_rate: 92.3
    },
    details: [
      { department: '技术部', avg_score: 88.5, evaluations: 45, completion: 95.6 },
      { department: '产品部', avg_score: 86.2, evaluations: 32, completion: 93.8 },
      { department: '运营部', avg_score: 83.7, evaluations: 28, completion: 89.3 },
      { department: '市场部', avg_score: 84.9, evaluations: 25, completion: 92.0 },
      { department: '人事部', avg_score: 87.1, evaluations: 26, completion: 96.2 }
    ]
  };
}

/**
 * 生成预算报表数据
 * @param departmentIds - 部门ID列表
 * @param timeRange - 时间范围
 * @param includeSubDepts - 是否包含子部门
 * @param filters - 过滤条件
 * @returns 预算报表数据
 */
async function generateBudgetReportData(departmentIds: string[], timeRange: string, includeSubDepts: boolean, filters: any) {
  // 模拟预算数据
  return {
    title: '部门预算执行报表',
    summary: {
      total_budget: 5000000,
      used_budget: 3750000,
      remaining_budget: 1250000,
      utilization_rate: 75
    },
    details: [
      { department: '技术部', budget: 1500000, used: 1200000, rate: 80.0, category: '人员+设备' },
      { department: '产品部', budget: 800000, used: 600000, rate: 75.0, category: '人员+研发' },
      { department: '运营部', budget: 600000, used: 450000, rate: 75.0, category: '人员+推广' },
      { department: '市场部', budget: 1000000, used: 800000, rate: 80.0, category: '人员+营销' },
      { department: '人事部', budget: 400000, used: 300000, rate: 75.0, category: '人员+培训' }
    ]
  };
}

/**
 * 生成综合报表数据
 * @param departmentIds - 部门ID列表
 * @param timeRange - 时间范围
 * @param includeSubDepts - 是否包含子部门
 * @param filters - 过滤条件
 * @returns 综合报表数据
 */
async function generateComprehensiveReportData(departmentIds: string[], timeRange: string, includeSubDepts: boolean, filters: any) {
  const personnelData = await generatePersonnelReportData(departmentIds, timeRange, includeSubDepts, filters);
  const performanceData = await generatePerformanceReportData(departmentIds, timeRange, includeSubDepts, filters);
  const budgetData = await generateBudgetReportData(departmentIds, timeRange, includeSubDepts, filters);

  return {
    title: '部门综合统计报表',
    personnel: personnelData,
    performance: performanceData,
    budget: budgetData,
    summary: {
      total_departments: 5,
      total_personnel: personnelData.summary.total_personnel,
      avg_performance: performanceData.summary.average_score,
      budget_utilization: budgetData.summary.utilization_rate
    }
  };
}

/**
 * 生成Excel报表
 * @param data - 报表数据
 * @param reportType - 报表类型
 * @returns Excel文件缓冲区和文件名
 */
async function generateExcelReport(data: any, reportType: string) {
  // 这里应该使用Excel生成库如 exceljs
  // 暂时返回模拟数据
  const fileName = `${reportType}_report_${new Date().toISOString().split('T')[0]}.xlsx`;
  const content = JSON.stringify(data, null, 2);
  
  return {
    buffer: Buffer.from(content, 'utf-8'),
    fileName
  };
}

/**
 * 生成PDF报表
 * @param data - 报表数据
 * @param reportType - 报表类型
 * @returns PDF文件缓冲区和文件名
 */
async function generatePDFReport(data: any, reportType: string) {
  // 这里应该使用PDF生成库如 puppeteer 或 jsPDF
  // 暂时返回模拟数据
  const fileName = `${reportType}_report_${new Date().toISOString().split('T')[0]}.pdf`;
  const content = JSON.stringify(data, null, 2);
  
  return {
    buffer: Buffer.from(content, 'utf-8'),
    fileName
  };
}

/**
 * 生成CSV报表
 * @param data - 报表数据
 * @param reportType - 报表类型
 * @returns CSV文件内容和文件名
 */
async function generateCSVReport(data: any, reportType: string) {
  const fileName = `${reportType}_report_${new Date().toISOString().split('T')[0]}.csv`;
  
  let csvContent = '';
  
  if (data.details && Array.isArray(data.details)) {
    // 生成CSV头部
    const headers = Object.keys(data.details[0] || {});
    csvContent += headers.join(',') + '\n';
    
    // 生成CSV数据行
    data.details.forEach((row: any) => {
      const values = headers.map(header => {
        const value = row[header] || '';
        // 处理包含逗号的值
        return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
      });
      csvContent += values.join(',') + '\n';
    });
  }
  
  return {
    content: csvContent,
    fileName
  };
}

/**
 * 获取报表模板列表
 * @returns 报表模板列表
 */
async function getReportTemplates() {
  return [
    {
      id: 'personnel_basic',
      name: '基础人员报表',
      type: 'personnel',
      description: '包含基本人员信息和部门分布',
      fields: ['user_name', 'department', 'position', 'status', 'join_date']
    },
    {
      id: 'personnel_detailed',
      name: '详细人员报表',
      type: 'personnel',
      description: '包含详细人员信息、权限和历史记录',
      fields: ['user_name', 'email', 'department', 'position', 'is_manager', 'permissions', 'history']
    },
    {
      id: 'performance_summary',
      name: '绩效汇总报表',
      type: 'performance',
      description: '部门绩效汇总和对比分析',
      fields: ['department', 'avg_score', 'evaluations', 'trends']
    },
    {
      id: 'budget_execution',
      name: '预算执行报表',
      type: 'budget',
      description: '预算分配、执行和分析报表',
      fields: ['department', 'budget', 'used', 'remaining', 'categories']
    },
    {
      id: 'comprehensive_dashboard',
      name: '综合管理报表',
      type: 'comprehensive',
      description: '包含人员、绩效、预算的综合报表',
      fields: ['all_metrics']
    }
  ];
}

/**
 * 获取报表生成历史
 * @param adminId - 管理员ID
 * @returns 报表生成历史
 */
async function getReportHistory(adminId: string) {
  // 这里应该从数据库获取历史记录
  // 暂时返回模拟数据
  return [
    {
      id: '1',
      report_type: 'personnel',
      format: 'excel',
      generated_at: '2024-01-15T10:30:00Z',
      file_name: 'personnel_report_2024-01-15.xlsx',
      status: 'completed'
    },
    {
      id: '2',
      report_type: 'budget',
      format: 'pdf',
      generated_at: '2024-01-14T15:45:00Z',
      file_name: 'budget_report_2024-01-14.pdf',
      status: 'completed'
    }
  ];
}