import { NextRequest, NextResponse } from 'next/server';
import { examService } from '@/services/examService';
import { UpdateExamRequest } from '@/types/exam';

/**
 * GET /api/exams/[id]
 * 获取单个考试详情
 * 
 * @param request - Next.js请求对象
 * @param params - 路由参数
 * @returns 考试详情响应
 * 
 * @example
 * GET /api/exams/123e4567-e89b-12d3-a456-426614174000
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: '缺少考试ID参数'
        },
        { status: 400 }
      );
    }

    // 获取考试详情
    const exam = await examService.getExamById(id);
    
    if (!exam) {
      return NextResponse.json(
        {
          success: false,
          error: '考试不存在'
        },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: exam,
      message: '获取考试详情成功'
    });
  } catch (error) {
    console.error('获取考试详情失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: '获取考试详情失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/exams/[id]
 * 更新单个考试
 * 
 * @param request - Next.js请求对象
 * @param params - 路由参数
 * @returns 更新结果响应
 * 
 * @example
 * PUT /api/exams/123e4567-e89b-12d3-a456-426614174000
 * {
 *   "title": "更新后的考试标题",
 *   "description": "更新后的考试描述"
 * }
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: '缺少考试ID参数'
        },
        { status: 400 }
      );
    }

    // 验证考试是否存在
    const existingExam = await examService.getExamById(id);
    if (!existingExam) {
      return NextResponse.json(
        {
          success: false,
          error: '考试不存在'
        },
        { status: 404 }
      );
    }

    // 构建更新请求
    const updateRequest: UpdateExamRequest = {
      id,
      ...body
    };

    // 验证数值字段（如果提供）
    if (body.duration !== undefined && body.duration <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: '考试时长必须大于0'
        },
        { status: 400 }
      );
    }

    if (body.totalQuestions !== undefined && body.totalQuestions <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: '题目数量必须大于0'
        },
        { status: 400 }
      );
    }

    if (body.passingScore !== undefined && (body.passingScore < 0 || body.passingScore > 100)) {
      return NextResponse.json(
        {
          success: false,
          error: '及格分数必须在0-100之间'
        },
        { status: 400 }
      );
    }

    // 更新考试
    const updatedExam = await examService.updateExam(updateRequest);
    
    return NextResponse.json({
      success: true,
      data: updatedExam,
      message: '考试更新成功'
    });
  } catch (error) {
    console.error('更新考试失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: '更新考试失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/exams/[id]
 * 删除单个考试
 * 
 * @param request - Next.js请求对象
 * @param params - 路由参数
 * @returns 删除结果响应
 * 
 * @example
 * DELETE /api/exams/123e4567-e89b-12d3-a456-426614174000
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: '缺少考试ID参数'
        },
        { status: 400 }
      );
    }

    // 验证考试是否存在
    const existingExam = await examService.getExamById(id);
    if (!existingExam) {
      return NextResponse.json(
        {
          success: false,
          error: '考试不存在'
        },
        { status: 404 }
      );
    }

    // 检查考试是否可以删除（例如：是否有用户正在参加）
    const canDelete = await examService.canDeleteExam(id);
    if (!canDelete) {
      return NextResponse.json(
        {
          success: false,
          error: '考试无法删除，可能有用户正在参加或已完成'
        },
        { status: 409 }
      );
    }

    // 删除考试
    await examService.deleteExam(id);
    
    return NextResponse.json({
      success: true,
      message: '考试删除成功'
    });
  } catch (error) {
    console.error('删除考试失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: '删除考试失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}