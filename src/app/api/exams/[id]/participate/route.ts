/**
 * 考试参与API路由
 * 处理用户报名、开始考试、提交答案等操作
 * 
 * @author SOLO Coding
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { ExamService } from '@/services/examService';
import { supabaseAdmin } from '@/lib/supabase';
import { headers } from 'next/headers';

// 初始化考试服务
const examService = new ExamService(supabaseAdmin);

/**
 * 从请求头中获取用户ID
 * 在实际应用中，这应该从JWT token或session中获取
 * 
 * @param request - Next.js请求对象
 * @returns 用户ID或null
 */
function getUserIdFromRequest(request: NextRequest): string | null {
  // 这里应该实现真实的用户认证逻辑
  // 暂时从请求头中获取用户ID用于测试
  return request.headers.get('x-user-id') || null;
}

/**
 * POST /api/exams/[id]/participate
 * 用户报名参加考试
 * 
 * @param request - Next.js请求对象
 * @param params - 路由参数
 * @returns 报名结果响应
 * 
 * @example
 * POST /api/exams/123e4567-e89b-12d3-a456-426614174000/participate
 * Headers: { "x-user-id": "user123" }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: examId } = params;
    const userId = getUserIdFromRequest(request);
    
    if (!examId) {
      return NextResponse.json(
        {
          success: false,
          error: '缺少考试ID参数'
        },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: '用户未登录'
        },
        { status: 401 }
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

    // 检查考试状态
    if (exam.status !== 'published') {
      return NextResponse.json(
        {
          success: false,
          error: '考试未发布或已结束'
        },
        { status: 400 }
      );
    }

    // 检查用户是否已经报名
    const existingParticipation = await examService.getUserParticipation(examId, userId);
    if (existingParticipation) {
      return NextResponse.json(
        {
          success: false,
          error: '您已经报名了这个考试'
        },
        { status: 409 }
      );
    }

    // 用户报名考试
    const participation = await examService.enrollUser(examId, userId);
    
    return NextResponse.json({
      success: true,
      data: participation,
      message: '报名成功'
    }, { status: 201 });
  } catch (error) {
    console.error('考试报名失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: '考试报名失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/exams/[id]/participate
 * 获取用户的考试参与状态
 * 
 * @param request - Next.js请求对象
 * @param params - 路由参数
 * @returns 参与状态响应
 * 
 * @example
 * GET /api/exams/123e4567-e89b-12d3-a456-426614174000/participate
 * Headers: { "x-user-id": "user123" }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: examId } = params;
    const userId = getUserIdFromRequest(request);
    
    if (!examId) {
      return NextResponse.json(
        {
          success: false,
          error: '缺少考试ID参数'
        },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: '用户未登录'
        },
        { status: 401 }
      );
    }

    // 获取用户参与状态
    const participation = await examService.getUserParticipation(examId, userId);
    
    if (!participation) {
      return NextResponse.json(
        {
          success: false,
          error: '用户未报名此考试'
        },
        { status: 404 }
      );
    }

    // 获取用户的考试结果（如果有）
    const results = await examService.getUserExamResults(examId, userId);
    
    return NextResponse.json({
      success: true,
      data: {
        participation,
        results
      },
      message: '获取参与状态成功'
    });
  } catch (error) {
    console.error('获取参与状态失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: '获取参与状态失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/exams/[id]/participate
 * 更新考试参与状态（如开始考试、暂停等）
 * 
 * @param request - Next.js请求对象
 * @param params - 路由参数
 * @returns 更新结果响应
 * 
 * @example
 * PUT /api/exams/123e4567-e89b-12d3-a456-426614174000/participate
 * Headers: { "x-user-id": "user123" }
 * Body: { "action": "start" }
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: examId } = params;
    const userId = getUserIdFromRequest(request);
    const body = await request.json();
    const { action } = body;
    
    if (!examId) {
      return NextResponse.json(
        {
          success: false,
          error: '缺少考试ID参数'
        },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: '用户未登录'
        },
        { status: 401 }
      );
    }

    if (!action) {
      return NextResponse.json(
        {
          success: false,
          error: '缺少操作类型'
        },
        { status: 400 }
      );
    }

    // 验证用户是否已报名
    const participation = await examService.getUserParticipation(examId, userId);
    if (!participation) {
      return NextResponse.json(
        {
          success: false,
          error: '用户未报名此考试'
        },
        { status: 404 }
      );
    }

    let result;
    
    switch (action) {
      case 'start':
        // 开始考试
        result = await examService.startExam(examId, userId);
        break;
      
      case 'pause':
        // 暂停考试（如果支持）
        result = await examService.pauseExam(examId, userId);
        break;
      
      case 'resume':
        // 恢复考试（如果支持）
        result = await examService.resumeExam(examId, userId);
        break;
      
      default:
        return NextResponse.json(
          {
            success: false,
            error: '不支持的操作类型'
          },
          { status: 400 }
        );
    }
    
    return NextResponse.json({
      success: true,
      data: result,
      message: `${action === 'start' ? '开始' : action === 'pause' ? '暂停' : '恢复'}考试成功`
    });
  } catch (error) {
    console.error('更新考试状态失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: '更新考试状态失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/exams/[id]/participate
 * 取消考试报名
 * 
 * @param request - Next.js请求对象
 * @param params - 路由参数
 * @returns 取消结果响应
 * 
 * @example
 * DELETE /api/exams/123e4567-e89b-12d3-a456-426614174000/participate
 * Headers: { "x-user-id": "user123" }
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: examId } = params;
    const userId = getUserIdFromRequest(request);
    
    if (!examId) {
      return NextResponse.json(
        {
          success: false,
          error: '缺少考试ID参数'
        },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: '用户未登录'
        },
        { status: 401 }
      );
    }

    // 验证用户是否已报名
    const participation = await examService.getUserParticipation(examId, userId);
    if (!participation) {
      return NextResponse.json(
        {
          success: false,
          error: '用户未报名此考试'
        },
        { status: 404 }
      );
    }

    // 检查是否可以取消报名（例如：考试是否已开始）
    if (participation.status === 'in_progress' || participation.status === 'completed') {
      return NextResponse.json(
        {
          success: false,
          error: '考试已开始或已完成，无法取消报名'
        },
        { status: 409 }
      );
    }

    // 取消报名
    await examService.cancelEnrollment(examId, userId);
    
    return NextResponse.json({
      success: true,
      message: '取消报名成功'
    });
  } catch (error) {
    console.error('取消报名失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: '取消报名失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}