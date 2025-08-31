import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { verifyAdminAccess } from '@/middleware/rbac';

/**
 * GET /api/admin/users/import/template
 * 下载用户导入模板
 */
export async function GET(request: NextRequest) {
  try {
    // 验证管理员权限
    const authResult = await verifyAdminAccess(request);
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, message: authResult.message },
        { status: 403 }
      );
    }
    // 定义模板数据结构
    const templateHeaders = [
      '姓名*',
      '手机号*', 
      '身份证号码*',
      '角色*',
      '密码',
      '邮箱',
      '员工ID',
      '部门',
      '职位',
      '组织机构',
      '状态'
    ];
    
    // 示例数据行
    const exampleData = [
      [
        '张三',
        '13800138001',
        '110101199001011234',
        'student',
        'password123',
        'zhangsan@example.com',
        'EMP001',
        '技术部',
        '软件工程师',
        '总公司',
        'active'
      ],
      [
        '李四',
        '13800138002', 
        '110101199002021234',
        'teacher',
        'password456',
        'lisi@example.com',
        'EMP002',
        '教学部',
        '高级讲师',
        '总公司',
        'active'
      ]
    ];
    
    // 字段说明数据
    const fieldDescriptions = [
      ['字段名', '是否必填', '格式要求', '示例', '说明'],
      ['姓名', '是', '1-50个字符', '张三', '用户真实姓名'],
      ['手机号', '是', '11位数字，1开头', '13800138001', '用于登录和接收通知'],
      ['身份证号码', '是', '18位身份证号', '110101199001011234', '用于身份验证'],
      ['角色', '是', 'admin/expert/teacher/student/examiner/internal_supervisor/guest', 'student', '用户在系统中的角色'],
      ['密码', '否', '至少6位字符', 'password123', '留空则系统自动生成'],
      ['邮箱', '否', '有效邮箱格式', 'user@example.com', '用于接收系统通知'],
      ['员工ID', '否', '字符串', 'EMP001', '企业内部员工编号'],
      ['部门', '否', '字符串', '技术部', '所属部门'],
      ['职位', '否', '字符串', '软件工程师', '职位名称'],
      ['组织机构', '否', '字符串', '总公司', '所属组织机构'],
      ['状态', '否', 'active/inactive', 'active', '用户状态，默认为active']
    ];
    
    // 角色说明数据
    const roleDescriptions = [
      ['角色代码', '角色名称', '权限说明'],
      ['admin', '系统管理员', '拥有系统最高权限，可管理所有功能'],
      ['expert', '专家', '可参与评审、审核等专业活动'],
      ['teacher', '教师', '可创建课程、管理学生、批改作业'],
      ['student', '学生', '可学习课程、提交作业、参加考试'],
      ['examiner', '考官', '可创建和管理考试、评阅试卷'],
      ['internal_supervisor', '内部监督员', '可监督和审核内部流程'],
      ['guest', '访客', '只有基本的浏览权限']
    ];
    
    // 创建工作簿
    const workbook = XLSX.utils.book_new();
    
    // 创建用户数据工作表
    const userData = [templateHeaders, ...exampleData];
    const userSheet = XLSX.utils.aoa_to_sheet(userData);
    
    // 设置列宽
    const colWidths = [
      { wch: 10 }, // 姓名
      { wch: 15 }, // 手机号
      { wch: 20 }, // 身份证号码
      { wch: 15 }, // 角色
      { wch: 12 }, // 密码
      { wch: 25 }, // 邮箱
      { wch: 12 }, // 员工ID
      { wch: 12 }, // 部门
      { wch: 15 }, // 职位
      { wch: 15 }, // 组织机构
      { wch: 10 }  // 状态
    ];
    userSheet['!cols'] = colWidths;
    
    // 设置表头样式（加粗、背景色）
    const headerRange = XLSX.utils.decode_range(userSheet['!ref'] || 'A1');
    for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
      if (!userSheet[cellAddress]) continue;
      
      userSheet[cellAddress].s = {
        font: { bold: true },
        fill: { fgColor: { rgb: 'E3F2FD' } },
        alignment: { horizontal: 'center' }
      };
    }
    
    // 添加用户数据工作表
    XLSX.utils.book_append_sheet(workbook, userSheet, '用户数据');
    
    // 创建字段说明工作表
    const fieldSheet = XLSX.utils.aoa_to_sheet(fieldDescriptions);
    fieldSheet['!cols'] = [
      { wch: 12 }, // 字段名
      { wch: 10 }, // 是否必填
      { wch: 30 }, // 格式要求
      { wch: 20 }, // 示例
      { wch: 25 }  // 说明
    ];
    
    // 设置字段说明表头样式
    const fieldHeaderRange = XLSX.utils.decode_range(fieldSheet['!ref'] || 'A1');
    for (let col = fieldHeaderRange.s.c; col <= fieldHeaderRange.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
      if (!fieldSheet[cellAddress]) continue;
      
      fieldSheet[cellAddress].s = {
        font: { bold: true },
        fill: { fgColor: { rgb: 'FFF3E0' } },
        alignment: { horizontal: 'center' }
      };
    }
    
    XLSX.utils.book_append_sheet(workbook, fieldSheet, '字段说明');
    
    // 创建角色说明工作表
    const roleSheet = XLSX.utils.aoa_to_sheet(roleDescriptions);
    roleSheet['!cols'] = [
      { wch: 15 }, // 角色代码
      { wch: 15 }, // 角色名称
      { wch: 40 }  // 权限说明
    ];
    
    // 设置角色说明表头样式
    const roleHeaderRange = XLSX.utils.decode_range(roleSheet['!ref'] || 'A1');
    for (let col = roleHeaderRange.s.c; col <= roleHeaderRange.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
      if (!roleSheet[cellAddress]) continue;
      
      roleSheet[cellAddress].s = {
        font: { bold: true },
        fill: { fgColor: { rgb: 'E8F5E8' } },
        alignment: { horizontal: 'center' }
      };
    }
    
    XLSX.utils.book_append_sheet(workbook, roleSheet, '角色说明');
    
    // 生成Excel文件
    const excelBuffer = XLSX.write(workbook, {
      type: 'buffer',
      bookType: 'xlsx'
    });
    
    // 设置响应头
    const headers = new Headers();
    headers.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    headers.set('Content-Disposition', 'attachment; filename="用户导入模板.xlsx"');
    headers.set('Content-Length', excelBuffer.length.toString());
    
    return new NextResponse(excelBuffer, {
      status: 200,
      headers
    });
    
  } catch (error) {
    console.error('生成模板文件错误:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '生成模板文件失败'
      },
      { status: 500 }
    );
  }
}