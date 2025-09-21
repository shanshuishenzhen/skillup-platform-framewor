/**
 * 考试结果API路由
 * 处理考试结果查询、统计和分析等操作
 * 
 * @author SOLO Coding
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { ExamService } from '@/services/examService';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyAdminAccess, UserRole } from '@/middleware/rbac';

// 初始化考试服务
const examService = new ExamService(supabaseAdmin);

interface RouteParams {
  id: string;
}

/**
 * GET /api/exams/[id]/results
 * 获取考试结果
 * 
 * @param request - Next.js请求对象
 * @param params - 路由参数
 * @returns 考试结果响应
 * 
 * @example
 * GET /api/exams/123e4567-e89b-12d3-a456-426614174000/results
 * GET /api/exams/123e4567-e89b-12d3-a456-426614174000/results?userId=user123
 * GET /api/exams/123e4567-e89b-12d3-a456-426614174000/results?type=statistics
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<RouteParams> }
) {
  try {
    const { id: examId } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const type = searchParams.get('type'); // 'user', 'statistics', 'analytics'
    const attemptNumber = searchParams.get('attempt');
    
    if (!examId) {
      return NextResponse.json(
        {
          success: false,
          error: '缺少考试ID参数'
        },
        { status: 400 }
      );
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

    // 验证考试是否存在
    const exam = await examService.getExamById(examId);
    if (!exam) {
      return NextResponse.json(
        {
          success: false,
          error: '考试不存在'
        },
        { status: 404 }
      );
    }

    let result;

    switch (type) {
      case 'statistics':
        // 获取考试统计信息（需要管理员权限）
        if (user.role !== UserRole.ADMIN && user.role !== UserRole.TEACHER) {
          return NextResponse.json(
            {
              success: false,
              error: '权限不足'
            },
            { status: 403 }
          );
        }
        result = await examService.getExamStats(examId);
        break;

      case 'analytics':
        // 获取考试分析数据（需要管理员权限）
        if (user.role !== UserRole.ADMIN && user.role !== UserRole.TEACHER) {
          return NextResponse.json(
            {
              success: false,
              error: '权限不足'
            },
            { status: 403 }
          );
        }
        result = await examService.getExamAnalytics(examId);
        break;

      case 'user':
      default:
        // 获取用户考试结果
        const targetUserId = userId || user.userId;
        
        // 如果查询其他用户的结果，需要管理员权限
        if (targetUserId !== user.userId && user.role !== UserRole.ADMIN && user.role !== UserRole.TEACHER) {
          return NextResponse.json(
            {
              success: false,
              error: '权限不足'
            },
            { status: 403 }
          );
        }

        result = await examService.getUserExamResults(
          examId, 
          targetUserId,
          attemptNumber ? parseInt(attemptNumber) : undefined
        );
        break;
    }

    if (!result) {
      return NextResponse.json(
        {
          success: false,
          error: '未找到结果数据'
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result,
      message: '获取考试结果成功'
    });
  } catch (error) {
    console.error('获取考试结果失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: '获取考试结果失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/exams/[id]/results
 * 创建或更新考试结果
 * 
 * @param request - Next.js请求对象
 * @param params - 路由参数
 * @returns 创建结果响应
 * 
 * @example
 * POST /api/exams/123e4567-e89b-12d3-a456-426614174000/results
 * Body: {
 *   "userId": "user123",
 *   "score": 85,
 *   "answers": {...},
 *   "timeSpent": 3600
 * }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<RouteParams> }
) {
  try {
    const { id: examId } = await params;
    const body = await request.json();
    const { userId, score, answers, timeSpent, feedback } = body;
    
    if (!examId) {
      return NextResponse.json(
        {
          success: false,
          error: '缺少考试ID参数'
        },
        { status: 400 }
      );
    }

    // 验证用户身份（通常只有系统或管理员可以创建结果）
    const authResult = await verifyAdminAccess(request, ['admin', 'teacher']);
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, message: authResult.error },
        { status: authResult.status }
      );
    }

    if (!userId || score === undefined) {
      return NextResponse.json(
        {
          success: false,
          error: '缺少必要参数'
        },
        { status: 400 }
      );
    }

    // 验证考试是否存在
    const exam = await examService.getExamById(examId);
    if (!exam) {
      return NextResponse.json(
        {
          success: false,
          error: '考试不存在'
        },
        { status: 404 }
      );
    }

    // 创建考试结果
    const result = await examService.createExamResult({
      examId,
      userId,
      score,
      answers,
      timeSpent,
      feedback
    });

    return NextResponse.json({
      success: true,
      data: result,
      message: '考试结果创建成功'
    }, { status: 201 });
  } catch (error) {
    console.error('创建考试结果失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: '创建考试结果失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/exams/[id]/results
 * 更新考试结果
 * 
 * @param request - Next.js请求对象
 * @param params - 路由参数
 * @returns 更新结果响应
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<RouteParams> }
) {
  try {
    const { id: examId } = await params;
    const body = await request.json();
    const { resultId, score, feedback, status } = body;
    
    if (!examId) {
      return NextResponse.json(
        {
          success: false,
          error: '缺少考试ID参数'
        },
        { status: 400 }
      );
    }

    // 验证用户身份
    const authResult = await verifyAdminAccess(request, ['admin', 'teacher']);
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, message: authResult.error },
        { status: authResult.status }
      );
    }

    if (!resultId) {
      return NextResponse.json(
        {
          success: false,
          error: '缺少结果ID参数'
        },
        { status: 400 }
      );
    }

    // 更新考试结果
    const result = await examService.updateExamResult(resultId, {
      score,
      feedback,
      status
    });

    return NextResponse.json({
      success: true,
      data: result,
      message: '考试结果更新成功'
    });
  } catch (error) {
    console.error('更新考试结果失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: '更新考试结果失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/exams/[id]/results
 * 删除考试结果
 * 
 * @param request - Next.js请求对象
 * @param params - 路由参数
 * @returns 删除结果响应
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<RouteParams> }
) {
  try {
    const { id: examId } = await params;
    const { searchParams } = new URL(request.url);
    const resultId = searchParams.get('resultId');
    
    if (!examId) {
      return NextResponse.json(
        {
          success: false,
          error: '缺少考试ID参数'
        },
        { status: 400 }
      );
    }

    // 验证用户身份（只有管理员可以删除结果）
    const authResult = await verifyAdminAccess(request, ['admin']);
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, message: authResult.error },
        { status: authResult.status }
      );
    }

    if (!resultId) {
      return NextResponse.json(
        {
          success: false,
          error: '缺少结果ID参数'
        },
        { status: 400 }
      );
    }

    // 删除考试结果
    await examService.deleteExamResult(resultId);

    return NextResponse.json({
      success: true,
      message: '考试结果删除成功'
    });
  } catch (error) {
    console.error('删除考试结果失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: '删除考试结果失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}