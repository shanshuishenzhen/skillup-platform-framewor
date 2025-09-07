/**
 * 用户批量取消分配考试API接口
 * 支持批量取消用户的考试分配
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyAdminAccess } from '@/middleware/rbac';
import { ErrorHandler, AppError, ErrorType } from '@/utils/errorHandler';
import { batchUnassignExam } from '@/services/userService';

// 批量取消分配请求验证模式
const BatchUnassignExamSchema = z.object({
  userIds: z.array(z.string().min(1, '用户ID不能为空')).min(1, '至少需要选择一个用户')
});

type BatchUnassignExamRequest = z.infer<typeof BatchUnassignExamSchema>;

/**
 * POST /api/admin/users/batch-unassign-exam
 * 批量取消分配考试
 */
export async function POST(request: NextRequest) {
  try {
    // 验证管理员权限
    const rbacResult = await verifyAdminAccess(request, {
      checkDBRole: true // 从数据库检查最新角色
    });

    if (!rbacResult.success) {
      return NextResponse.json(
        { success: false, error: rbacResult.message || '权限不足，需要管理员权限' },
        { status: 403 }
      );
    }

    // 解析请求体
    const body = await request.json();
    const requestData = BatchUnassignExamSchema.parse(body);
    const { userIds } = requestData;

    // 调用服务层函数执行批量取消分配
    const result = await batchUnassignExam(userIds);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.message
        },
        { status: 400 }
      );
    }

    // 返回成功结果
    return NextResponse.json({
      success: true,
      data: {
        processedCount: result.processedCount,
        skippedCount: result.skippedCount,
        totalRequested: userIds.length
      },
      message: result.message
    });

  } catch (error) {
    console.error('批量取消分配考试错误:', error);
    
    // 处理验证错误
    if (error instanceof z.ZodError) {
      const fieldErrors = error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ');
      return NextResponse.json(
        {
          success: false,
          error: '请求参数验证失败',
          details: fieldErrors
        },
        { status: 400 }
      );
    }

    // 处理应用错误
    if (error instanceof AppError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message
        },
        { status: error.statusCode || 500 }
      );
    }
    
    // 处理其他错误
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '批量取消分配考试失败'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/users/batch-unassign-exam
 * 获取可以取消分配的用户统计信息
 */
export async function GET(request: NextRequest) {
  try {
    // 验证管理员权限
    const rbacResult = await verifyAdminAccess(request, {
      checkDBRole: true // 从数据库检查最新角色
    });

    if (!rbacResult.success) {
      return NextResponse.json(
        { success: false, error: rbacResult.message || '权限不足，需要管理员权限' },
        { status: 403 }
      );
    }

    // 获取URL参数
    const { searchParams } = new URL(request.url);
    const userIdsParam = searchParams.get('userIds');
    
    if (!userIdsParam) {
      return NextResponse.json(
        { success: false, error: '缺少用户ID参数' },
        { status: 400 }
      );
    }

    const userIds = userIdsParam.split(',').filter(id => id.trim());
    
    if (userIds.length === 0) {
      return NextResponse.json(
        { success: false, error: '用户ID列表不能为空' },
        { status: 400 }
      );
    }

    // 这里可以添加获取用户状态统计的逻辑
    // 暂时返回基本信息
    return NextResponse.json({
      success: true,
      data: {
        totalUsers: userIds.length,
        message: '请在前端调用POST接口执行实际的取消分配操作'
      }
    });

  } catch (error) {
    console.error('获取取消分配统计信息错误:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '获取统计信息失败'
      },
      { status: 500 }
    );
  }
}