/**
 * 考试题目管理API路由
 * GET /api/exams/[id]/questions - 获取考试题目列表
 * POST /api/exams/[id]/questions - 创建新题目
 */

import { NextRequest, NextResponse } from 'next/server';
import { examService } from '@/services/examService';
import { verifyAdminAccess } from '@/middleware/rbac';
import { CreateQuestionRequest } from '@/types/exam';
import { z } from 'zod';

// 创建题目验证模式
const CreateQuestionSchema = z.object({
  type: z.enum(['single_choice', 'multiple_choice', 'true_false', 'fill_blank', 'essay']),
  title: z.string().min(1, '题目标题不能为空'),
  content: z.string().min(1, '题目内容不能为空'),
  options: z.array(z.object({
    text: z.string(),
    isCorrect: z.boolean(),
    explanation: z.string().optional()
  })).optional(),
  correctAnswer: z.union([z.string(), z.array(z.string())]),
  explanation: z.string().optional(),
  score: z.number().min(1, '题目分数至少1分'),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  category: z.string().min(1, '题目分类不能为空'),
  tags: z.array(z.string()).default([]),
  timeLimit: z.number().optional(),
  attachments: z.array(z.string()).default([])
});

interface RouteParams {
  id: string;
}

/**
 * 获取考试题目列表
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<RouteParams> }
) {
  try {
    const { id: examId } = await params;
    
    if (!examId) {
      return NextResponse.json({
        success: false,
        message: '考试ID不能为空'
      }, { status: 400 });
    }

    // 检查用户权限
    let includeAnswers = false;
    try {
      const authResult = await verifyAdminAccess(request, ['admin', 'teacher']);
      if (authResult.success) {
        includeAnswers = true;
      }
    } catch {
      // 学生或未登录用户不能看到答案
    }

    // 获取题目列表
    const questions = await examService.getExamQuestions(examId, includeAnswers);

    return NextResponse.json({
      success: true,
      data: questions
    });

  } catch (error) {
    console.error('获取题目列表失败:', error);
    
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : '获取题目列表失败',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    }, { status: 500 });
  }
}

/**
 * 创建新题目
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<RouteParams> }
) {
  try {
    const { id: examId } = await params;
    
    if (!examId) {
      return NextResponse.json({
        success: false,
        message: '考试ID不能为空'
      }, { status: 400 });
    }

    // 验证管理员权限
    const authResult = await verifyAdminAccess(request, ['admin', 'teacher']);
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, message: authResult.error },
        { status: authResult.status }
      );
    }

    const { user } = authResult;
    const body = await request.json();

    // 验证请求数据
    const validationResult = CreateQuestionSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json({
        success: false,
        message: '数据验证失败',
        errors: validationResult.error.errors
      }, { status: 400 });
    }

    const questionData: CreateQuestionRequest = {
      ...validationResult.data,
      examId
    };

    // 检查考试是否存在
    const exam = await examService.getExamById(examId);
    if (!exam) {
      return NextResponse.json({
        success: false,
        message: '考试不存在'
      }, { status: 404 });
    }

    // 检查权限（只有创建者或管理员可以添加题目）
    if (user.role !== 'admin' && exam.createdBy !== user.id) {
      return NextResponse.json({
        success: false,
        message: '没有权限为此考试添加题目'
      }, { status: 403 });
    }

    // 创建题目
    const question = await examService.createQuestion(questionData, user.id);

    return NextResponse.json({
      success: true,
      message: '题目创建成功',
      data: question
    }, { status: 201 });

  } catch (error) {
    console.error('创建题目失败:', error);
    
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : '创建题目失败',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    }, { status: 500 });
  }
}

/**
 * 批量导入题目
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<RouteParams> }
) {
  try {
    const { id: examId } = await params;
    
    if (!examId) {
      return NextResponse.json({
        success: false,
        message: '考试ID不能为空'
      }, { status: 400 });
    }

    // 验证管理员权限
    const authResult = await verifyAdminAccess(request, ['admin', 'teacher']);
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, message: authResult.error },
        { status: authResult.status }
      );
    }

    const { user } = authResult;
    const body = await request.json();
    const { questions } = body;

    if (!Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json({
        success: false,
        message: '请提供有效的题目列表'
      }, { status: 400 });
    }

    // 检查考试是否存在
    const exam = await examService.getExamById(examId);
    if (!exam) {
      return NextResponse.json({
        success: false,
        message: '考试不存在'
      }, { status: 404 });
    }

    // 检查权限
    if (user.role !== 'admin' && exam.createdBy !== user.id) {
      return NextResponse.json({
        success: false,
        message: '没有权限为此考试添加题目'
      }, { status: 403 });
    }

    // 批量创建题目
    const results = await examService.batchCreateQuestions(examId, questions, user.id);

    return NextResponse.json({
      success: true,
      message: `成功导入 ${results.success} 道题目`,
      data: results
    });

  } catch (error) {
    console.error('批量导入题目失败:', error);
    
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : '批量导入题目失败',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    }, { status: 500 });
  }
}

/**
 * 删除所有题目
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<RouteParams> }
) {
  try {
    const { id: examId } = await params;
    
    if (!examId) {
      return NextResponse.json({
        success: false,
        message: '考试ID不能为空'
      }, { status: 400 });
    }

    // 验证管理员权限
    const authResult = await verifyAdminAccess(request, ['admin']);
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, message: authResult.error },
        { status: authResult.status }
      );
    }

    // 删除所有题目
    await examService.deleteAllQuestions(examId);

    return NextResponse.json({
      success: true,
      message: '所有题目已删除'
    });

  } catch (error) {
    console.error('删除题目失败:', error);
    
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : '删除题目失败',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    }, { status: 500 });
  }
}
