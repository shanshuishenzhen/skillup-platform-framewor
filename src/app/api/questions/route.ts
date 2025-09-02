/**
 * 题目管理API路由
 * 处理题目的CRUD操作和相关业务逻辑
 * 
 * @author SOLO Coding
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { QuestionService } from '@/services/questionService';
import { CreateQuestionRequest, QuestionQueryParams } from '@/types/question';
import { supabaseAdmin } from '@/lib/supabase';

// 初始化题目服务
const questionService = new QuestionService(supabaseAdmin);

/**
 * GET /api/questions
 * 获取题目列表
 * 
 * @param request - Next.js请求对象
 * @returns 题目列表响应
 * 
 * @example
 * GET /api/questions?search=javascript&type=choice&difficulty=intermediate&page=1&limit=10
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // 构建查询参数
    const queryParams: QuestionQueryParams = {
      search: searchParams.get('search') || undefined,
      type: searchParams.get('type') as any || undefined,
      difficulty: searchParams.get('difficulty') as any || undefined,
      status: searchParams.get('status') as any || undefined,
      category: searchParams.get('category') || undefined,
      tags: searchParams.get('tags')?.split(',') || undefined,
      createdBy: searchParams.get('createdBy') || undefined,
      sortBy: searchParams.get('sortBy') || 'created_at',
      sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc',
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20')
    };

    // 获取题目列表
    const result = await questionService.getQuestions(queryParams);
    
    return NextResponse.json({
      success: true,
      data: result,
      message: '获取题目列表成功'
    });
  } catch (error) {
    console.error('获取题目列表失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: '获取题目列表失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/questions
 * 创建新题目
 * 
 * @param request - Next.js请求对象
 * @returns 创建结果响应
 * 
 * @example
 * POST /api/questions
 * {
 *   "type": "choice",
 *   "title": "JavaScript变量声明",
 *   "content": "以下哪种方式可以声明JavaScript变量？",
 *   "difficulty": "beginner",
 *   "options": [
 *     { "id": "A", "content": "var x = 1;", "isCorrect": true },
 *     { "id": "B", "content": "variable x = 1;", "isCorrect": false }
 *   ]
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // 解析请求体
    const body: CreateQuestionRequest = await request.json();
    
    // 验证必填字段
    if (!body.type || !body.title || !body.content || !body.difficulty) {
      return NextResponse.json(
        {
          success: false,
          error: '缺少必填字段',
          details: '题目类型、标题、内容和难度为必填字段'
        },
        { status: 400 }
      );
    }

    // 根据题目类型验证特定字段
    if (body.type === 'choice' || body.type === 'multiple_choice') {
      if (!body.options || !Array.isArray(body.options) || body.options.length < 2) {
        return NextResponse.json(
          {
            success: false,
            error: '选择题必须提供至少2个选项'
          },
          { status: 400 }
        );
      }
      
      // 验证是否有正确答案
      const hasCorrectAnswer = body.options.some(option => option.isCorrect);
      if (!hasCorrectAnswer) {
        return NextResponse.json(
          {
            success: false,
            error: '选择题必须至少有一个正确答案'
          },
          { status: 400 }
        );
      }
    }

    if (body.type === 'coding') {
      if (!body.testCases || !Array.isArray(body.testCases) || body.testCases.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: '编程题必须提供测试用例'
          },
          { status: 400 }
        );
      }
    }

    // 创建题目
    const question = await questionService.createQuestion(body);
    
    return NextResponse.json({
      success: true,
      data: question,
      message: '题目创建成功'
    }, { status: 201 });
  } catch (error) {
    console.error('创建题目失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: '创建题目失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/questions
 * 批量更新题目
 * 
 * @param request - Next.js请求对象
 * @returns 更新结果响应
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { ids, updates } = body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: '无效的题目ID列表'
        },
        { status: 400 }
      );
    }

    // 批量更新题目
    const results = await Promise.all(
      ids.map(id => questionService.updateQuestion({ id, ...updates }))
    );
    
    return NextResponse.json({
      success: true,
      data: results,
      message: `成功更新${results.length}个题目`
    });
  } catch (error) {
    console.error('批量更新题目失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: '批量更新题目失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/questions
 * 批量删除题目
 * 
 * @param request - Next.js请求对象
 * @returns 删除结果响应
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const idsParam = searchParams.get('ids');
    
    if (!idsParam) {
      return NextResponse.json(
        {
          success: false,
          error: '缺少题目ID参数'
        },
        { status: 400 }
      );
    }

    const ids = idsParam.split(',');
    
    // 批量删除题目
    const results = await Promise.all(
      ids.map(id => questionService.deleteQuestion(id))
    );
    
    return NextResponse.json({
      success: true,
      data: { deletedCount: results.length },
      message: `成功删除${results.length}个题目`
    });
  } catch (error) {
    console.error('批量删除题目失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: '批量删除题目失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}