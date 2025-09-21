/**
 * 考试提交API路由
 * 处理用户答题保存、考试提交和评分等操作
 * 
 * @author SOLO Coding
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { ExamService } from '@/services/examService';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyAdminAccess } from '@/middleware/rbac';

// 初始化考试服务
const examService = new ExamService(supabaseAdmin);

/**
 * POST /api/exams/[id]/submit
 * 提交考试答案
 * 
 * @param request - Next.js请求对象
 * @param params - 路由参数
 * @returns 提交结果响应
 * 
 * @example
 * POST /api/exams/123e4567-e89b-12d3-a456-426614174000/submit
 * Headers: { "x-user-id": "user123" }
 * Body: {
 *   "answers": {
 *     "question1": { "answer": "A", "answeredAt": "2024-01-15T10:30:00Z" },
 *     "question2": { "answer": "选项B", "answeredAt": "2024-01-15T10:32:00Z" }
 *   },
 *   "submissionType": "final"
 * }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: examId } = await params;
    const body = await request.json();
    const { answers, submissionType = 'final' } = body;
    
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
        { success: false, error: authResult.message },
        { status: 401 }
      );
    }

    const { user } = authResult;
    const userId = user.userId;

    if (!answers || typeof answers !== 'object') {
      return NextResponse.json(
        {
          success: false,
          error: '答案格式无效'
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

    // 验证用户是否已报名并开始考试
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

    if (participation.status !== 'in_progress') {
      return NextResponse.json(
        {
          success: false,
          error: '考试未开始或已结束'
        },
        { status: 400 }
      );
    }

    let result;
    
    if (submissionType === 'save') {
      // 保存答案（不提交）
      result = await examService.saveAnswers(examId, userId, answers);
      
      return NextResponse.json({
        success: true,
        data: result,
        message: '答案保存成功'
      });
    } else if (submissionType === 'final') {
      // 最终提交考试
      result = await examService.submitExam(examId, userId, answers);
      
      return NextResponse.json({
        success: true,
        data: result,
        message: '考试提交成功'
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: '无效的提交类型'
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('提交考试失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: '提交考试失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/exams/[id]/submit
 * 获取用户的考试提交记录
 * 
 * @param request - Next.js请求对象
 * @param params - 路由参数
 * @returns 提交记录响应
 * 
 * @example
 * GET /api/exams/123e4567-e89b-12d3-a456-426614174000/submit
 * Headers: { "x-user-id": "user123" }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: examId } = await params;
    const { searchParams } = new URL(request.url);
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
        { success: false, error: authResult.message },
        { status: 401 }
      );
    }

    const { user } = authResult;
    const userId = user.userId;

    // 获取用户的提交记录
    const submissions = await examService.getUserSubmissions(examId, userId, attemptNumber ? parseInt(attemptNumber) : undefined);
    
    if (!submissions || submissions.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: '未找到提交记录'
        },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: submissions,
      message: '获取提交记录成功'
    });
  } catch (error) {
    console.error('获取提交记录失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: '获取提交记录失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/exams/[id]/submit
 * 更新考试提交状态或重新评分
 * 
 * @param request - Next.js请求对象
 * @param params - 路由参数
 * @returns 更新结果响应
 * 
 * @example
 * PUT /api/exams/123e4567-e89b-12d3-a456-426614174000/submit
 * Headers: { "x-user-id": "user123" }
 * Body: {
 *   "action": "regrade",
 *   "submissionId": "submission123"
 * }
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: examId } = params;
    
    // 验证用户身份
    const authResult = await verifyAdminAccess(request);
    if (!authResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: authResult.message || '用户未登录'
        },
        { status: 401 }
      );
    }

    const { user } = authResult;
    const userId = user.userId;
    const body = await request.json();
    const { action, submissionId } = body;
    
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

    let result;
    
    switch (action) {
      case 'regrade':
        // 重新评分
        if (!submissionId) {
          return NextResponse.json(
            {
              success: false,
              error: '缺少提交记录ID'
            },
            { status: 400 }
          );
        }
        result = await examService.regradeSubmission(submissionId);
        break;
      
      case 'timeout':
        // 处理考试超时
        result = await examService.handleExamTimeout(examId, userId);
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
      message: `${action === 'regrade' ? '重新评分' : '处理超时'}成功`
    });
  } catch (error) {
    console.error('更新提交状态失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: '更新提交状态失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/exams/[id]/submit
 * 删除考试提交记录（仅限管理员或特殊情况）
 * 
 * @param request - Next.js请求对象
 * @param params - 路由参数
 * @returns 删除结果响应
 * 
 * @example
 * DELETE /api/exams/123e4567-e89b-12d3-a456-426614174000/submit?submissionId=submission123
 * Headers: { "x-user-id": "admin123" }
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: examId } = params;
    
    // 验证用户身份
    const authResult = await verifyAdminAccess(request);
    if (!authResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: authResult.message || '用户未登录'
        },
        { status: 401 }
      );
    }

    const { user } = authResult;
    const userId = user.userId;
    const { searchParams } = new URL(request.url);
    const submissionId = searchParams.get('submissionId');
    
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

    if (!submissionId) {
      return NextResponse.json(
        {
          success: false,
          error: '缺少提交记录ID'
        },
        { status: 400 }
      );
    }

    // 这里应该检查用户权限（是否为管理员或考试创建者）
    // 暂时跳过权限检查
    
    // 删除提交记录
    await examService.deleteSubmission(submissionId);
    
    return NextResponse.json({
      success: true,
      message: '提交记录删除成功'
    });
  } catch (error) {
    console.error('删除提交记录失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: '删除提交记录失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}