/**
 * 考试管理API路由
 * GET /api/exams - 获取考试列表
 * POST /api/exams - 创建新考试
 */

import { NextRequest, NextResponse } from 'next/server';
import { examService } from '@/services/examService';
import { verifyAdminAccess } from '@/middleware/rbac';
import { ExamQueryParams, CreateExamRequest } from '@/types/exam';
import { z } from 'zod';

// 创建考试验证模式
const CreateExamSchema = z.object({
  title: z.string().min(1, '考试标题不能为空').max(200, '考试标题不能超过200字符'),
  description: z.string().min(1, '考试描述不能为空'),
  category: z.string().min(1, '考试分类不能为空'),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  duration: z.number().min(1, '考试时长至少1分钟').max(480, '考试时长不能超过8小时'),
  totalQuestions: z.number().min(1, '题目数量至少1题').max(200, '题目数量不能超过200题'),
  passingScore: z.number().min(0, '及格分数不能为负数').max(100, '及格分数不能超过100分'),
  maxAttempts: z.number().min(1, '最大尝试次数至少1次').max(10, '最大尝试次数不能超过10次'),
  allowRetake: z.boolean(),
  startTime: z.string().datetime('开始时间格式不正确'),
  endTime: z.string().datetime('结束时间格式不正确'),
  registrationDeadline: z.string().datetime('报名截止时间格式不正确'),
  isPublic: z.boolean(),
  requiresApproval: z.boolean(),
  fee: z.number().min(0, '考试费用不能为负数'),
  currency: z.string().default('CNY'),
  tags: z.array(z.string()).default([]),
  skills: z.array(z.string()).default([]),
  prerequisites: z.array(z.string()).default([]),
  instructions: z.string().default(''),
  rules: z.array(z.string()).default([])
}).refine(data => {
  const start = new Date(data.startTime);
  const end = new Date(data.endTime);
  const deadline = new Date(data.registrationDeadline);
  
  return deadline <= start && start < end;
}, {
  message: '时间设置不正确：报名截止时间 <= 开始时间 < 结束时间'
});

/**
 * 获取考试列表
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // 解析查询参数
    const params: ExamQueryParams = {
      page: parseInt(searchParams.get('page') || '1'),
      limit: Math.min(parseInt(searchParams.get('limit') || '20'), 100),
      category: searchParams.get('category') || undefined,
      difficulty: searchParams.get('difficulty') as any || undefined,
      status: searchParams.get('status') as any || undefined,
      search: searchParams.get('search') || undefined,
      tags: searchParams.get('tags')?.split(',').filter(Boolean) || undefined,
      sortBy: searchParams.get('sortBy') as any || 'createdAt',
      sortOrder: searchParams.get('sortOrder') as any || 'desc',
      includeExpired: searchParams.get('includeExpired') === 'true'
    };

    // 获取考试列表
    const result = await examService.getExams(params);

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('获取考试列表失败:', error);
    
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : '获取考试列表失败',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    }, { status: 500 });
  }
}

/**
 * 创建新考试
 */
export async function POST(request: NextRequest) {
  try {
    // 验证管理员权限（允许管理员和教师创建考试）
    const authResult = await verifyAdminAccess(request, ['admin', 'teacher']);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { success: false, message: authResult.message || '用户未经授权' },
        { status: 403 }
      );
    }

    const { user } = authResult;
    const body = await request.json();

    // 验证请求数据
    const validationResult = CreateExamSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json({
        success: false,
        message: '数据验证失败',
        errors: validationResult.error.errors
      }, { status: 400 });
    }

    const examData: CreateExamRequest = validationResult.data;

    // 创建考试
    const exam = await examService.createExam(examData, user.userId);

    return NextResponse.json({
      success: true,
      message: '考试创建成功',
      data: exam
    }, { status: 201 });

  } catch (error) {
    console.error('创建考试失败:', error);
    
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : '创建考试失败',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    }, { status: 500 });
  }
}

/**
 * 批量操作考试
 */
export async function PATCH(request: NextRequest) {
  try {
    // 验证管理员权限（只允许管理员进行批量操作）
    const authResult = await verifyAdminAccess(request, ['admin']);
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, message: authResult.message },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action, examIds } = body;

    if (!action || !Array.isArray(examIds) || examIds.length === 0) {
      return NextResponse.json({
        success: false,
        message: '请提供有效的操作类型和考试ID列表'
      }, { status: 400 });
    }

    let result;
    switch (action) {
      case 'publish':
        result = await examService.batchPublishExams(examIds);
        break;
      case 'unpublish':
        result = await examService.batchUnpublishExams(examIds);
        break;
      case 'delete':
        result = await examService.batchDeleteExams(examIds);
        break;
      default:
        return NextResponse.json({
          success: false,
          message: '不支持的操作类型'
        }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: `批量${action}操作完成`,
      data: result
    });

  } catch (error) {
    console.error('批量操作考试失败:', error);
    
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : '批量操作失败',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    }, { status: 500 });
  }
}

/**
 * 获取考试分类和统计信息
 */
export async function OPTIONS(request: NextRequest) {
  try {
    const stats = await examService.getExamStatsSummary();
    
    return NextResponse.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('获取考试统计失败:', error);
    
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : '获取统计信息失败'
    }, { status: 500 });
  }
}
