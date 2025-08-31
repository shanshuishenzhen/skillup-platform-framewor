/**
 * 题库导入模板下载API
 * GET /api/admin/questions/import/template - 下载题库导入模板
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAccess } from '@/middleware/rbac';

/**
 * 下载题库导入模板
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
      '题目类型*',
      '题目内容*',
      '选项A',
      '选项B',
      '选项C',
      '选项D',
      '正确答案*',
      '分值*',
      '难度等级*',
      '知识点',
      '解析'
    ];

    const csvExamples = [
      [
        'single_choice',
        'JavaScript中用于声明变量的关键字是？',
        'var',
        'let',
        'const',
        '以上都是',
        'D',
        '2',
        'easy',
        'JavaScript基础',
        'JavaScript中var、let、const都可以用来声明变量'
      ],
      [
        'multiple_choice',
        '以下哪些是JavaScript的数据类型？',
        'string',
        'number',
        'boolean',
        'object',
        'A,B,C,D',
        '3',
        'medium',
        'JavaScript数据类型',
        'JavaScript有多种基本数据类型'
      ],
      [
        'true_false',
        'JavaScript是一种编译型语言',
        '正确',
        '错误',
        '',
        '',
        'B',
        '1',
        'easy',
        'JavaScript特性',
        'JavaScript是解释型语言，不是编译型语言'
      ]
    ];

    const csvNotes = [
      '# 题库导入模板说明',
      '# 1. 带*号的字段为必填项',
      '# 2. 题目类型：single_choice(单选)、multiple_choice(多选)、true_false(判断)、fill_blank(填空)、essay(问答)',
      '# 3. 难度等级：easy(简单)、medium(中等)、hard(困难)',
      '# 4. 单选题正确答案填写选项字母，如：A',
      '# 5. 多选题正确答案用逗号分隔，如：A,B,C',
      '# 6. 判断题选项A填"正确"，选项B填"错误"',
      '# 7. 填空题和问答题不需要填写选项',
      ''
    ];

    const csvContent = [
      ...csvNotes,
      csvHeaders.join(','),
      ...csvExamples.map(example => example.join(',')),
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
        'Content-Disposition': 'attachment; filename="题库导入模板.csv"',
        'Cache-Control': 'no-cache'
      }
    });

  } catch (error) {
    console.error('下载题库导入模板失败:', error);
    
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : '下载模板失败'
    }, { status: 500 });
  }
}
