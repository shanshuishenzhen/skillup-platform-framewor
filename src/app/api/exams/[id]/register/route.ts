/**
 * 考试报名API路由
 * POST /api/exams/[id]/register - 报名参加考试
 * DELETE /api/exams/[id]/register - 取消报名
 */

import { NextRequest, NextResponse } from 'next/server';
import { examService } from '@/services/examService';
import { verifyAdminAccess } from '@/middleware/rbac';

interface RouteParams {
  id: string;
}

/**
 * 报名参加考试
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
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, message: authResult.error },
        { status: authResult.status }
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
    if (exam.status !== 'published') {
      return NextResponse.json({
        success: false,
        message: '考试未发布，无法报名'
      }, { status: 400 });
    }

    // 检查报名截止时间
    const now = new Date();
    const deadline = new Date(exam.registrationDeadline);
    if (now > deadline) {
      return NextResponse.json({
        success: false,
        message: '报名时间已截止'
      }, { status: 400 });
    }

    // 检查是否已经报名
    const existingRegistration = await examService.getExamRegistration(examId, user.id);
    if (existingRegistration) {
      if (existingRegistration.status === 'approved') {
        return NextResponse.json({
          success: false,
          message: '您已经报名了此考试'
        }, { status: 400 });
      } else if (existingRegistration.status === 'pending') {
        return NextResponse.json({
          success: false,
          message: '您的报名申请正在审核中'
        }, { status: 400 });
      }
    }

    // 检查用户资格
    const eligibility = await examService.checkExamEligibility(examId, user.id);
    if (!eligibility.eligible) {
      return NextResponse.json({
        success: false,
        message: eligibility.reason || '不符合报名条件',
        details: eligibility.requirements
      }, { status: 400 });
    }

    // 创建报名记录
    const registration = await examService.registerForExam(examId, user.id);

    return NextResponse.json({
      success: true,
      message: exam.requiresApproval ? '报名申请已提交，等待审核' : '报名成功',
      data: registration
    }, { status: 201 });

  } catch (error) {
    console.error('考试报名失败:', error);
    
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : '报名失败',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    }, { status: 500 });
  }
}

/**
 * 取消报名
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

    // 验证用户身份
    const authResult = await verifyAdminAccess(request, ['student', 'teacher', 'admin']);
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, message: authResult.error },
        { status: authResult.status }
      );
    }

    const { user } = authResult;

    // 检查报名记录是否存在
    const registration = await examService.getExamRegistration(examId, user.id);
    if (!registration) {
      return NextResponse.json({
        success: false,
        message: '您未报名此考试'
      }, { status: 404 });
    }

    // 检查是否可以取消报名
    if (registration.status === 'cancelled') {
      return NextResponse.json({
        success: false,
        message: '报名已经取消'
      }, { status: 400 });
    }

    // 检查考试是否已经开始
    const exam = await examService.getExamById(examId);
    if (exam) {
      const now = new Date();
      const startTime = new Date(exam.startTime);
      if (now >= startTime) {
        return NextResponse.json({
          success: false,
          message: '考试已开始，无法取消报名'
        }, { status: 400 });
      }
    }

    // 检查是否已经参加考试
    const attempts = await examService.getUserExamAttempts(examId, user.id);
    if (attempts.length > 0) {
      return NextResponse.json({
        success: false,
        message: '已参加考试，无法取消报名'
      }, { status: 400 });
    }

    // 取消报名
    await examService.cancelExamRegistration(examId, user.id);

    return NextResponse.json({
      success: true,
      message: '报名已取消'
    });

  } catch (error) {
    console.error('取消报名失败:', error);
    
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : '取消报名失败',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    }, { status: 500 });
  }
}

/**
 * 获取报名状态
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
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, message: authResult.error },
        { status: authResult.status }
      );
    }

    const { user } = authResult;

    // 获取报名记录
    const registration = await examService.getExamRegistration(examId, user.id);
    
    // 检查考试资格
    const eligibility = await examService.checkExamEligibility(examId, user.id);

    return NextResponse.json({
      success: true,
      data: {
        registration,
        eligibility
      }
    });

  } catch (error) {
    console.error('获取报名状态失败:', error);
    
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : '获取报名状态失败',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    }, { status: 500 });
  }
}
