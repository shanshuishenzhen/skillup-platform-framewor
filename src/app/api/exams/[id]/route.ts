/**
 * 考试详情API路由
 * GET /api/exams/[id] - 获取考试详情
 * PUT /api/exams/[id] - 更新考试信息
 * DELETE /api/exams/[id] - 删除考试
 */

import { NextRequest, NextResponse } from 'next/server';
import { examService } from '@/services/examService';
import { verifyAdminAccess } from '@/middleware/rbac';
import { UpdateExamRequest } from '@/types/exam';
import { z } from 'zod';

// 更新考试验证模式
const UpdateExamSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(1).optional(),
  category: z.string().min(1).optional(),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  duration: z.number().min(1).max(480).optional(),
  totalQuestions: z.number().min(1).max(200).optional(),
  passingScore: z.number().min(0).max(100).optional(),
  maxAttempts: z.number().min(1).max(10).optional(),
  allowRetake: z.boolean().optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  registrationDeadline: z.string().datetime().optional(),
  isPublic: z.boolean().optional(),
  requiresApproval: z.boolean().optional(),
  fee: z.number().min(0).optional(),
  currency: z.string().optional(),
  tags: z.array(z.string()).optional(),
  skills: z.array(z.string()).optional(),
  prerequisites: z.array(z.string()).optional(),
  instructions: z.string().optional(),
  rules: z.array(z.string()).optional(),
  status: z.enum(['draft', 'published', 'ongoing', 'finished', 'cancelled']).optional()
});

interface RouteParams {
  id: string;
}

/**
 * 获取考试详情
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<RouteParams> }
) {
  try {
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json({
        success: false,
        message: '考试ID不能为空'
      }, { status: 400 });
    }

    // 获取查询参数
    const { searchParams } = new URL(request.url);
    const includeQuestions = searchParams.get('includeQuestions') === 'true';
    const includeStatistics = searchParams.get('includeStatistics') === 'true';
    const includeUserData = searchParams.get('includeUserData') === 'true';

    // 获取用户信息（如果已登录）
    let userId: string | undefined;
    try {
      const authResult = await verifyAdminAccess(request, ['admin', 'teacher', 'student']);
      if (authResult.success) {
        userId = authResult.user.id;
      }
    } catch {
      // 忽略认证错误，允许匿名访问公开考试
    }

    // 获取考试详情
    const exam = await examService.getExamById(id, {
      includeQuestions,
      includeStatistics,
      includeUserData: includeUserData && !!userId,
      userId
    });

    if (!exam) {
      return NextResponse.json({
        success: false,
        message: '考试不存在'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: exam
    });

  } catch (error) {
    console.error('获取考试详情失败:', error);
    
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : '获取考试详情失败',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    }, { status: 500 });
  }
}

/**
 * 更新考试信息
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<RouteParams> }
) {
  try {
    const { id } = await params;
    
    if (!id) {
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
    const validationResult = UpdateExamSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json({
        success: false,
        message: '数据验证失败',
        errors: validationResult.error.errors
      }, { status: 400 });
    }

    const updateData: UpdateExamRequest = validationResult.data;

    // 检查考试是否存在
    const existingExam = await examService.getExamById(id);
    if (!existingExam) {
      return NextResponse.json({
        success: false,
        message: '考试不存在'
      }, { status: 404 });
    }

    // 检查权限（只有创建者或管理员可以修改）
    if (user.role !== 'admin' && existingExam.createdBy !== user.id) {
      return NextResponse.json({
        success: false,
        message: '没有权限修改此考试'
      }, { status: 403 });
    }

    // 更新考试
    const updatedExam = await examService.updateExam(id, updateData, user.id);

    return NextResponse.json({
      success: true,
      message: '考试更新成功',
      data: updatedExam
    });

  } catch (error) {
    console.error('更新考试失败:', error);
    
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : '更新考试失败',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    }, { status: 500 });
  }
}

/**
 * 删除考试
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<RouteParams> }
) {
  try {
    const { id } = await params;

    if (!id) {
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

    // 检查考试是否存在
    const existingExam = await examService.getExamById(id);
    if (!existingExam) {
      return NextResponse.json({
        success: false,
        message: '考试不存在'
      }, { status: 404 });
    }

    // 检查权限（只有创建者或管理员可以删除）
    if (user.role !== 'admin' && existingExam.createdBy !== user.id) {
      return NextResponse.json({
        success: false,
        message: '没有权限删除此考试'
      }, { status: 403 });
    }

    // 检查是否可以删除（有考试记录的考试不能删除，只能取消）
    const canDelete = await examService.canDeleteExam(id);
    if (!canDelete) {
      return NextResponse.json({
        success: false,
        message: '该考试已有用户参与，不能删除，只能取消'
      }, { status: 400 });
    }

    // 删除考试
    await examService.deleteExam(id, user.id);

    return NextResponse.json({
      success: true,
      message: '考试删除成功'
    });

  } catch (error) {
    console.error('删除考试失败:', error);

    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : '删除考试失败',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    }, { status: 500 });
  }
}
