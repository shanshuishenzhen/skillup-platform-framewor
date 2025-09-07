import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

/**
 * 定期报表生成和邮件推送API接口
 * 支持创建、管理和执行定期报表任务
 */

// 环境变量验证
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// 定期报表配置验证模式
const scheduledReportSchema = z.object({
  name: z.string().min(1, '报表名称不能为空'),
  description: z.string().optional(),
  report_type: z.enum(['personnel', 'performance', 'budget', 'overview', 'custom']),
  schedule_type: z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'yearly']),
  schedule_config: z.object({
    time: z.string(), // HH:MM 格式
    day_of_week: z.number().min(0).max(6).optional(), // 0-6，周日到周六
    day_of_month: z.number().min(1).max(31).optional(), // 1-31
    timezone: z.string().default('Asia/Shanghai')
  }),
  recipients: z.array(z.object({
    email: z.string().email('邮箱格式不正确'),
    name: z.string().optional(),
    role: z.enum(['admin', 'manager', 'viewer']).optional()
  })).min(1, '至少需要一个收件人'),
  filters: z.object({
    department_ids: z.array(z.string()).optional(),
    date_range: z.object({
      start: z.string().optional(),
      end: z.string().optional(),
      relative: z.enum(['last_week', 'last_month', 'last_quarter', 'last_year']).optional()
    }).optional(),
    include_sub_departments: z.boolean().default(true)
  }).optional(),
  format: z.enum(['pdf', 'excel', 'csv']).default('pdf'),
  template_id: z.string().optional(),
  is_active: z.boolean().default(true)
});

// 报表执行记录验证模式
const reportExecutionSchema = z.object({
  scheduled_report_id: z.string(),
  execution_time: z.string(),
  status: z.enum(['pending', 'running', 'completed', 'failed']),
  file_url: z.string().optional(),
  error_message: z.string().optional(),
  recipients_sent: z.array(z.string()).optional()
});

/**
 * 验证管理员权限
 */
async function verifyAdminPermission(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { error: '未提供认证令牌', status: 401 };
  }

  const token = authHeader.substring(7);
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
    return { error: '认证失败', status: 401 };
  }

  // 检查用户是否为管理员
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    return { error: '权限不足', status: 403 };
  }

  return { user, profile };
}

/**
 * 记录操作日志
 */
async function logOperation(
  userId: string,
  action: string,
  details: any,
  resourceType: string = 'scheduled_report'
) {
  await supabase.from('admin_operation_logs').insert({
    user_id: userId,
    action,
    resource_type: resourceType,
    resource_id: details.id || null,
    details,
    ip_address: '127.0.0.1', // 在实际应用中应该获取真实IP
    user_agent: 'API'
  });
}

/**
 * GET /api/admin/departments/scheduled-reports
 * 获取定期报表列表
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAdminPermission(request);
    if (authResult.error) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.status }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status'); // active, inactive, all
    const reportType = searchParams.get('report_type');
    const scheduleType = searchParams.get('schedule_type');

    let query = supabase
      .from('scheduled_reports')
      .select(`
        *,
        created_by:user_profiles!scheduled_reports_created_by_fkey(
          id,
          full_name,
          email
        ),
        executions:report_executions(
          id,
          execution_time,
          status,
          file_url
        )
      `);

    // 应用筛选条件
    if (status && status !== 'all') {
      query = query.eq('is_active', status === 'active');
    }
    if (reportType) {
      query = query.eq('report_type', reportType);
    }
    if (scheduleType) {
      query = query.eq('schedule_type', scheduleType);
    }

    // 分页
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);
    query = query.order('created_at', { ascending: false });

    const { data: reports, error, count } = await query;

    if (error) {
      console.error('获取定期报表失败:', error);
      return NextResponse.json(
        { success: false, error: '获取定期报表失败' },
        { status: 500 }
      );
    }

    // 计算下次执行时间
    const reportsWithNextExecution = reports?.map(report => ({
      ...report,
      next_execution: calculateNextExecution(report.schedule_type, report.schedule_config),
      last_execution: report.executions?.[0] || null
    }));

    await logOperation(
      authResult.user!.id,
      'view_scheduled_reports',
      { page, limit, filters: { status, reportType, scheduleType } }
    );

    return NextResponse.json({
      success: true,
      data: {
        reports: reportsWithNextExecution,
        pagination: {
          page,
          limit,
          total: count || 0,
          pages: Math.ceil((count || 0) / limit)
        }
      }
    });
  } catch (error) {
    console.error('获取定期报表失败:', error);
    return NextResponse.json(
      { success: false, error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/departments/scheduled-reports
 * 创建定期报表
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAdminPermission(request);
    if (authResult.error) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.status }
      );
    }

    const body = await request.json();
    const validationResult = scheduledReportSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: '数据验证失败',
          details: validationResult.error.errors
        },
        { status: 400 }
      );
    }

    const reportData = validationResult.data;

    // 验证报表模板是否存在（如果指定了模板）
    if (reportData.template_id) {
      const { data: template } = await supabase
        .from('report_templates')
        .select('id')
        .eq('id', reportData.template_id)
        .single();

      if (!template) {
        return NextResponse.json(
          { success: false, error: '指定的报表模板不存在' },
          { status: 400 }
        );
      }
    }

    // 验证部门权限（如果指定了部门筛选）
    if (reportData.filters?.department_ids?.length) {
      const { data: departments } = await supabase
        .from('departments')
        .select('id')
        .in('id', reportData.filters.department_ids);

      if (departments?.length !== reportData.filters.department_ids.length) {
        return NextResponse.json(
          { success: false, error: '部分指定的部门不存在' },
          { status: 400 }
        );
      }
    }

    // 创建定期报表
    const { data: newReport, error } = await supabase
      .from('scheduled_reports')
      .insert({
        ...reportData,
        created_by: authResult.user!.id,
        next_execution: calculateNextExecution(reportData.schedule_type, reportData.schedule_config)
      })
      .select()
      .single();

    if (error) {
      console.error('创建定期报表失败:', error);
      return NextResponse.json(
        { success: false, error: '创建定期报表失败' },
        { status: 500 }
      );
    }

    await logOperation(
      authResult.user!.id,
      'create_scheduled_report',
      { report_id: newReport.id, ...reportData }
    );

    return NextResponse.json({
      success: true,
      data: newReport,
      message: '定期报表创建成功'
    });
  } catch (error) {
    console.error('创建定期报表失败:', error);
    return NextResponse.json(
      { success: false, error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/departments/scheduled-reports
 * 批量更新定期报表状态
 */
export async function PUT(request: NextRequest) {
  try {
    const authResult = await verifyAdminPermission(request);
    if (authResult.error) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.status }
      );
    }

    const body = await request.json();
    const { report_ids, action } = body;

    if (!Array.isArray(report_ids) || report_ids.length === 0) {
      return NextResponse.json(
        { success: false, error: '请提供要操作的报表ID列表' },
        { status: 400 }
      );
    }

    if (!['activate', 'deactivate', 'delete'].includes(action)) {
      return NextResponse.json(
        { success: false, error: '无效的操作类型' },
        { status: 400 }
      );
    }

    let result;
    if (action === 'delete') {
      // 软删除
      result = await supabase
        .from('scheduled_reports')
        .update({ deleted_at: new Date().toISOString() })
        .in('id', report_ids)
        .select();
    } else {
      // 激活或停用
      const isActive = action === 'activate';
      result = await supabase
        .from('scheduled_reports')
        .update({ 
          is_active: isActive,
          next_execution: isActive ? calculateNextExecution : null
        })
        .in('id', report_ids)
        .select();
    }

    if (result.error) {
      console.error('批量更新定期报表失败:', result.error);
      return NextResponse.json(
        { success: false, error: '批量更新定期报表失败' },
        { status: 500 }
      );
    }

    await logOperation(
      authResult.user!.id,
      `batch_${action}_scheduled_reports`,
      { report_ids, action, affected_count: result.data?.length }
    );

    return NextResponse.json({
      success: true,
      data: result.data,
      message: `成功${action === 'activate' ? '激活' : action === 'deactivate' ? '停用' : '删除'}${result.data?.length}个定期报表`
    });
  } catch (error) {
    console.error('批量更新定期报表失败:', error);
    return NextResponse.json(
      { success: false, error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

/**
 * 计算下次执行时间
 */
function calculateNextExecution(scheduleType: string, scheduleConfig: any): string {
  const now = new Date();
  const { time, day_of_week, day_of_month, timezone = 'Asia/Shanghai' } = scheduleConfig;
  
  // 解析时间
  const [hours, minutes] = time.split(':').map(Number);
  
  let nextExecution = new Date(now);
  nextExecution.setHours(hours, minutes, 0, 0);
  
  switch (scheduleType) {
    case 'daily':
      if (nextExecution <= now) {
        nextExecution.setDate(nextExecution.getDate() + 1);
      }
      break;
      
    case 'weekly':
      const currentDay = nextExecution.getDay();
      const targetDay = day_of_week || 1; // 默认周一
      let daysToAdd = targetDay - currentDay;
      if (daysToAdd <= 0 || (daysToAdd === 0 && nextExecution <= now)) {
        daysToAdd += 7;
      }
      nextExecution.setDate(nextExecution.getDate() + daysToAdd);
      break;
      
    case 'monthly':
      const targetDate = day_of_month || 1;
      nextExecution.setDate(targetDate);
      if (nextExecution <= now) {
        nextExecution.setMonth(nextExecution.getMonth() + 1);
      }
      break;
      
    case 'quarterly':
      const currentMonth = nextExecution.getMonth();
      const quarterStartMonth = Math.floor(currentMonth / 3) * 3;
      nextExecution.setMonth(quarterStartMonth + 3, 1);
      break;
      
    case 'yearly':
      nextExecution.setFullYear(nextExecution.getFullYear() + 1, 0, 1);
      break;
  }
  
  return nextExecution.toISOString();
}

/**
 * 执行定期报表（由定时任务调用）
 */
export async function executeScheduledReport(reportId: string) {
  try {
    // 获取报表配置
    const { data: report } = await supabase
      .from('scheduled_reports')
      .select('*')
      .eq('id', reportId)
      .single();

    if (!report || !report.is_active) {
      return { success: false, error: '报表不存在或已停用' };
    }

    // 创建执行记录
    const { data: execution } = await supabase
      .from('report_executions')
      .insert({
        scheduled_report_id: reportId,
        execution_time: new Date().toISOString(),
        status: 'running'
      })
      .select()
      .single();

    try {
      // 生成报表数据
      const reportData = await generateReportData(report);
      
      // 生成报表文件
      const fileUrl = await generateReportFile(reportData, report.format);
      
      // 发送邮件
      const emailResults = await sendReportEmails(report, fileUrl);
      
      // 更新执行记录
      await supabase
        .from('report_executions')
        .update({
          status: 'completed',
          file_url: fileUrl,
          recipients_sent: emailResults.successful
        })
        .eq('id', execution.id);

      // 更新下次执行时间
      await supabase
        .from('scheduled_reports')
        .update({
          next_execution: calculateNextExecution(report.schedule_type, report.schedule_config),
          last_execution: new Date().toISOString()
        })
        .eq('id', reportId);

      return { success: true, execution_id: execution.id };
    } catch (error) {
      // 更新执行记录为失败状态
      await supabase
        .from('report_executions')
        .update({
          status: 'failed',
          error_message: error instanceof Error ? error.message : '未知错误'
        })
        .eq('id', execution.id);

      throw error;
    }
  } catch (error) {
    console.error('执行定期报表失败:', error);
    return { success: false, error: error instanceof Error ? error.message : '未知错误' };
  }
}

/**
 * 生成报表数据
 */
async function generateReportData(report: any) {
  // 根据报表类型和筛选条件生成数据
  // 这里应该调用相应的统计API
  const filters = report.filters || {};
  const params = new URLSearchParams({
    type: report.report_type,
    ...(filters.department_ids && { department_ids: filters.department_ids.join(',') }),
    ...(filters.include_sub_departments && { include_sub_departments: 'true' }),
    ...(filters.date_range?.relative && { time_range: filters.date_range.relative })
  });

  // 模拟API调用
  return {
    title: report.name,
    generated_at: new Date().toISOString(),
    data: {}, // 实际数据
    filters: filters
  };
}

/**
 * 生成报表文件
 */
async function generateReportFile(data: any, format: string): Promise<string> {
  // 这里应该实现实际的文件生成逻辑
  // 返回文件的URL
  return `https://example.com/reports/${Date.now()}.${format}`;
}

/**
 * 发送报表邮件
 */
async function sendReportEmails(report: any, fileUrl: string) {
  const successful: string[] = [];
  const failed: string[] = [];

  for (const recipient of report.recipients) {
    try {
      // 这里应该实现实际的邮件发送逻辑
      // 使用邮件服务提供商的API
      console.log(`发送报表邮件到: ${recipient.email}`);
      successful.push(recipient.email);
    } catch (error) {
      console.error(`发送邮件失败 ${recipient.email}:`, error);
      failed.push(recipient.email);
    }
  }

  return { successful, failed };
}