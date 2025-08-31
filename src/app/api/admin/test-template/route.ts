/**
 * 测试模板下载API
 * GET /api/admin/test-template - 简单的测试模板下载
 */

import { NextRequest, NextResponse } from 'next/server';

/**
 * 简单的测试模板下载（无权限验证）
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 测试模板API被调用');
    
    // 生成简单的CSV内容
    const csvContent = [
      '# 这是一个测试模板',
      '姓名,邮箱,部门',
      '张三,zhangsan@example.com,技术部',
      '李四,lisi@example.com,产品部',
      '',
      '# 请在上面的格式基础上添加更多数据'
    ].join('\n');

    // 添加BOM以支持中文显示
    const bom = '\uFEFF';
    const finalContent = bom + csvContent;

    console.log('✅ 测试模板内容生成成功');

    return new Response(finalContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="测试模板.csv"',
        'Cache-Control': 'no-cache'
      }
    });

  } catch (error) {
    console.error('❌ 测试模板下载失败:', error);
    
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : '下载模板失败',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    }, { status: 500 });
  }
}
