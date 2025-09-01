/**
 * 考试提交API路由
 * POST /api/exams/[id]/submit - 提交考试答案
 * PUT /api/exams/[id]/submit - 保存答案（自动保存）
 */

import { NextRequest, NextResponse } from 'next/server';
import { examService } from '@/services/examService';
import { verifyAdminAccess } from '@/middleware/rbac';
import { SubmitExamRequest, SubmitAnswerRequest } from '@/types/exam';
import { z } from 'zod';

// 提交答案验证模式
const SubmitAnswerSchema = z.object({
  questionId: z.string().min(1, '题目ID不能为空'),
  answer: z.union([z.string(), z.array(z.string())]),
  timeSpent: z.number().min(0, '答题时间不能为负数'),
  submittedAt: z.string()
});

// 提交考试验证模式
const SubmitExamSchema = z.object({
  attemptId: z.string().min(1, '考试尝试ID不能为空'),
  answers: z.array(SubmitAnswerSchema),
  violations: z.array(z.object({
    type: z.string(),
    description: z.string(),
    timestamp: z.string(),
    severity: z.enum(['low', 'medium', 'high']),
    evidence: z.string().optional()
  })).optional()
});

interface RouteParams {
  id: string;
}

/**
 * 提交考试答案
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

    // 验证用户身份
    const authResult = await verifyAdminAccess(request, ['student', 'teacher', 'admin']);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { success: false, message: authResult.message || '用户未经授权' },
        { status: 403 }
      );
    }

    const { user } = authResult;
    const body = await request.json();

    // 验证请求数据
    const validationResult = SubmitExamSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json({
        success: false,
        message: '数据验证失败',
        errors: validationResult.error.errors
      }, { status: 400 });
    }

    const submitData: SubmitExamRequest = validationResult.data;

    // 检查考试是否存在
    const exam = await examService.getExamById(examId);
    if (!exam) {
      return NextResponse.json({
        success: false,
        message: '考试不存在'
      }, { status: 404 });
    }

    // 检查考试尝试是否存在且属于当前用户
    const attempt = await examService.getExamAttemptById(submitData.attemptId);
    if (!attempt || attempt.userId !== user.userId || attempt.examId !== examId) {
      return NextResponse.json({
        success: false,
        message: '无效的考试尝试'
      }, { status: 403 });
    }

    // 检查考试状态
    if (attempt.status !== 'in_progress') {
      return NextResponse.json({
        success: false,
        message: '考试已结束，无法提交'
      }, { status: 400 });
    }

    // 检查考试时间
    const now = new Date();
    const endTime = new Date(exam.endTime);
    if (now > endTime) {
      return NextResponse.json({
        success: false,
        message: '考试时间已结束'
      }, { status: 400 });
    }

    // 提交考试
    const result = await examService.submitExam(submitData, user.userId);

    return NextResponse.json({
      success: true,
      message: '考试提交成功',
      data: result
    });

  } catch (error) {
    console.error('提交考试失败:', error);
    
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : '提交考试失败',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    }, { status: 500 });
  }
}

/**
 * 保存答案（自动保存）
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

    // 验证用户身份
    const authResult = await verifyAdminAccess(request, ['student', 'teacher', 'admin']);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { success: false, message: authResult.message || '用户未经授权' },
        { status: 403 }
      );
    }

    const { user } = authResult;
    const body = await request.json();

    // 验证请求数据
    const validationResult = SubmitAnswerSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json({
        success: false,
        message: '数据验证失败',
        errors: validationResult.error.errors
      }, { status: 400 });
    }

    const answerData: SubmitAnswerRequest = validationResult.data;

    // 获取进行中的考试尝试
    const attempt = await examService.getOngoingExamAttempt(examId, user.userId);
    if (!attempt) {
      return NextResponse.json({
        success: false,
        message: '没有进行中的考试'
      }, { status: 404 });
    }

    // 保存答案
    await examService.saveAnswer(attempt.id, answerData);

    return NextResponse.json({
      success: true,
      message: '答案保存成功'
    });

  } catch (error) {
    console.error('保存答案失败:', error);
    
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : '保存答案失败',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    }, { status: 500 });
  }
}

/**
 * 获取考试进度
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

    // 验证用户身份
    const authResult = await verifyAdminAccess(request, ['student', 'teacher', 'admin']);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { success: false, message: authResult.message || '用户未经授权' },
        { status: 403 }
      );
    }

    const { user } = authResult;

    // 获取进行中的考试尝试
    const attempt = await examService.getOngoingExamAttempt(examId, user.userId);
    if (!attempt) {
      return NextResponse.json({
        success: false,
        message: '没有进行中的考试'
      }, { status: 404 });
    }

    // 获取考试信息
    const exam = await examService.getExamById(examId);
    if (!exam) {
      return NextResponse.json({
        success: false,
        message: '考试不存在'
      }, { status: 404 });
    }

    // 计算剩余时间
    const timeRemaining = examService.calculateTimeRemaining(attempt, exam.duration);

    // 获取题目（不包含答案）
    const questions = await examService.getExamQuestions(examId, false);

    return NextResponse.json({
      success: true,
      data: {
        attempt,
        questions,
        timeRemaining,
        exam: {
          id: exam.id,
          title: exam.title,
          duration: exam.duration,
          totalQuestions: exam.totalQuestions
        }
      }
    });

  } catch (error) {
    console.error('获取考试进度失败:', error);
    
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : '获取考试进度失败',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    }, { status: 500 });
  }
}
