/**
 * 课程导入模板下载API
 * GET /api/admin/courses/import/template - 下载课程导入模板
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAccess } from '@/middleware/rbac';

/**
 * 下载课程导入模板
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
      '课程名称*',
      '课程分类*',
      '课程级别*',
      '课程时长(小时)*',
      '讲师姓名*',
      '课程价格',
      '课程描述',
      '课程封面URL',
      '状态*',
      '标签'
    ];

    const csvExample = [
      'JavaScript从入门到精通',
      '前端开发',
      'beginner',
      '40',
      '李老师',
      '299',
      '全面学习JavaScript编程语言，从基础语法到高级应用',
      'https://example.com/course-cover.jpg',
      'published',
      'JavaScript,前端,编程'
    ];

    const csvNotes = [
      '# 课程导入模板说明',
      '# 1. 带*号的字段为必填项',
      '# 2. 课程级别：beginner(初级)、intermediate(中级)、advanced(高级)',
      '# 3. 状态：draft(草稿)、published(已发布)、archived(已归档)',
      '# 4. 课程时长单位为小时',
      '# 5. 价格单位为元，免费课程填写0',
      '# 6. 标签用逗号分隔，如：JavaScript,前端,编程',
      '# 7. 课程封面URL为可选项',
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
        'Content-Disposition': 'attachment; filename="课程导入模板.csv"',
        'Cache-Control': 'no-cache'
      }
    });

  } catch (error) {
    console.error('下载课程导入模板失败:', error);
    
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : '下载模板失败'
    }, { status: 500 });
  }
}
