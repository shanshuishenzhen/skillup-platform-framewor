/**
 * 考试导入模板下载API
 * GET /api/admin/exams/import/template - 下载考试导入模板
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAccess } from '@/middleware/rbac';

/**
 * 下载考试导入模板
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
      '考试名称*',
      '考试类型*',
      '难度等级*',
      '考试时长(分钟)*',
      '总分*',
      '及格分*',
      '考试描述',
      '开始时间',
      '结束时间',
      '状态'
    ];

    const csvExample = [
      'JavaScript基础认证考试',
      '技能认证',
      'intermediate',
      '120',
      '100',
      '60',
      '测试JavaScript基础知识和编程能力',
      '2024-02-01 09:00:00',
      '2024-02-01 11:00:00',
      'published'
    ];

    const csvNotes = [
      '# 考试导入模板说明',
      '# 1. 带*号的字段为必填项',
      '# 2. 难度等级：beginner(初级)、intermediate(中级)、advanced(高级)',
      '# 3. 状态：draft(草稿)、published(已发布)、archived(已归档)',
      '# 4. 时间格式：YYYY-MM-DD HH:mm:ss',
      '# 5. 考试时长单位为分钟',
      ''
    ];

    const csvContent = [
      ...csvNotes,
      csvHeaders.join(','),
      csvExample.join(','),
      // 添加一些空行供用户填写
      ',,,,,,,,',
      ',,,,,,,,',
      ',,,,,,,,',
      ',,,,,,,,',
      ',,,,,,,,',
    ].join('\n');

    // 添加BOM以支持中文显示
    const bom = '\uFEFF';
    const finalContent = bom + csvContent;

    return new Response(finalContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="考试导入模板.csv"',
        'Cache-Control': 'no-cache'
      }
    });

  } catch (error) {
    console.error('下载考试导入模板失败:', error);
    
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : '下载模板失败'
    }, { status: 500 });
  }
}
