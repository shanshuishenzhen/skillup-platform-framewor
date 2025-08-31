/**
 * 考试结果导入模板下载API
 * GET /api/admin/results/import/template - 下载考试结果导入模板
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAccess } from '@/middleware/rbac';

/**
 * 下载考试结果导入模板
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

    // 生成CSV模板内容
    const csvHeaders = [
      '考生姓名*',
      '考生邮箱*',
      '考试名称*',
      '得分*',
      '总分*',
      '考试时间*',
      '用时(分钟)',
      '状态*',
      '准考证号',
      '部门',
      '职位'
    ];

    const csvExample = [
      '张三',
      'zhangsan@example.com',
      'JavaScript基础认证考试',
      '85',
      '100',
      '2024-01-20 10:00:00',
      '95',
      'completed',
      'T2024001',
      '技术部',
      '软件工程师'
    ];

    const csvNotes = [
      '# 考试结果导入模板说明',
      '# 1. 带*号的字段为必填项',
      '# 2. 状态：completed(已完成)、absent(缺考)、cheating(作弊)',
      '# 3. 考试时间格式：YYYY-MM-DD HH:mm:ss',
      '# 4. 用时单位为分钟',
      '# 5. 得分不能超过总分',
      '# 6. 考生邮箱用于匹配系统中的用户',
      ''
    ];

    const csvContent = [
      ...csvNotes,
      csvHeaders.join(','),
      csvExample.join(','),
      // 添加一些空行供用户填写
      ',,,,,,,,,,',
      ',,,,,,,,,,',
      ',,,,,,,,,,',
      ',,,,,,,,,,',
      ',,,,,,,,,,',
    ].join('\n');

    // 添加BOM以支持中文显示
    const bom = '\uFEFF';
    const finalContent = bom + csvContent;

    return new Response(finalContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="考试结果导入模板.csv"',
        'Cache-Control': 'no-cache'
      }
    });

  } catch (error) {
    console.error('下载考试结果导入模板失败:', error);
    
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : '下载模板失败'
    }, { status: 500 });
  }
}
