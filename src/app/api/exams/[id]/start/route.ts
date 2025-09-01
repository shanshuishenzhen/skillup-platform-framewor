/**
 * 开始考试API路由
 * POST /api/exams/[id]/start - 开始考试
 */

import { NextRequest, NextResponse } from 'next/server';
import { examService } from '@/services/examService';
import { verifyAdminAccess } from '@/middleware/rbac';

interface RouteParams {
  id: string;
}

/**
 * 开始考试
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

    // 检查考试是否存在
    const exam = await examService.getExamById(examId);
    if (!exam) {
      return NextResponse.json({
        success: false,
        message: '考试不存在'
      }, { status: 404 });
    }

    // 检查考试状态
    if (exam.status !== 'published' && exam.status !== 'ongoing') {
      return NextResponse.json({
        success: false,
        message: '考试未开放'
      }, { status: 400 });
    }

    // 检查考试时间
    const now = new Date();
    const startTime = new Date(exam.startTime);
    const endTime = new Date(exam.endTime);
    
    if (now < startTime) {
      return NextResponse.json({
        success: false,
        message: '考试尚未开始',
        data: { startTime: exam.startTime }
      }, { status: 400 });
    }
    
    if (now > endTime) {
      return NextResponse.json({
        success: false,
        message: '考试已结束'
      }, { status: 400 });
    }

    // 检查报名状态
    const registration = await examService.getExamRegistration(examId, user.userId);
    if (!registration || registration.status !== 'approved') {
      return NextResponse.json({
        success: false,
        message: '您未报名此考试或报名未通过审核'
      }, { status: 403 });
    }

    // 检查考试资格
    const eligibility = await examService.checkExamEligibility(examId, user.userId);
    if (!eligibility.canStart) {
      return NextResponse.json({
        success: false,
        message: eligibility.reason || '不符合考试条件',
        data: {
          remainingAttempts: eligibility.remainingAttempts,
          nextAvailableTime: eligibility.nextAvailableTime
        }
      }, { status: 400 });
    }

    // 检查是否有进行中的考试
    const ongoingAttempt = await examService.getOngoingExamAttempt(examId, user.userId);
    if (ongoingAttempt) {
      // 返回现有的考试会话
      const questions = await examService.getExamQuestions(examId, false); // 不包含答案
      const timeRemaining = examService.calculateTimeRemaining(ongoingAttempt, exam.duration);
      
      return NextResponse.json({
        success: true,
        message: '继续进行中的考试',
        data: {
          attempt: ongoingAttempt,
          questions,
          timeRemaining
        }
      });
    }

    // 获取客户端信息
    const userAgent = request.headers.get('user-agent') || '';
    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const ipAddress = forwardedFor?.split(',')[0] || realIp || 'unknown';

    // 创建新的考试尝试
    const attempt = await examService.startExam(examId, user.userId, {
      userAgent,
      ipAddress,
      screenResolution: '', // 前端会通过WebSocket发送
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    });

    // 获取考试题目（不包含正确答案）
    const questions = await examService.getExamQuestions(examId, false);
    
    // 计算剩余时间
    const timeRemaining = exam.duration * 60; // 转换为秒

    return NextResponse.json({
      success: true,
      message: '考试开始',
      data: {
        attempt,
        questions,
        timeRemaining
      }
    }, { status: 201 });

  } catch (error) {
    console.error('开始考试失败:', error);
    
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : '开始考试失败',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    }, { status: 500 });
  }
}

/**
 * 获取考试状态
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

    // 检查是否有进行中的考试
    const ongoingAttempt = await examService.getOngoingExamAttempt(examId, user.userId);
    
    if (!ongoingAttempt) {
      return NextResponse.json({
        success: true,
        data: {
          hasOngoingAttempt: false
        }
      });
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
    const timeRemaining = examService.calculateTimeRemaining(ongoingAttempt, exam.duration);
    
    // 如果时间已到，自动提交考试
    if (timeRemaining <= 0) {
      await examService.autoSubmitExam(ongoingAttempt.id);
      
      return NextResponse.json({
        success: true,
        data: {
          hasOngoingAttempt: false,
          autoSubmitted: true,
          message: '考试时间已到，已自动提交'
        }
      });
    }

    // 获取题目（不包含答案）
    const questions = await examService.getExamQuestions(examId, false);

    return NextResponse.json({
      success: true,
      data: {
        hasOngoingAttempt: true,
        attempt: ongoingAttempt,
        questions,
        timeRemaining
      }
    });

  } catch (error) {
    console.error('获取考试状态失败:', error);
    
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : '获取考试状态失败',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    }, { status: 500 });
  }
}
