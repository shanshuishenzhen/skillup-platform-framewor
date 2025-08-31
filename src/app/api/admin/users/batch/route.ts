/**
 * 用户批量更新API接口
 * 处理批量状态更新操作
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { verifyAdminAccess } from '@/middleware/rbac';

// 初始化 Supabase 客户端
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 批量更新请求验证模式
const BatchUpdateSchema = z.object({
  user_ids: z.array(z.string()).min(1, '至少需要选择一个用户'),
  update_data: z.object({
    status: z.enum(['active', 'inactive', 'suspended']).optional(),
    role: z.enum(['admin', 'expert', 'teacher', 'student', 'user', 'examiner', 'internal_supervisor']).optional(),
    department: z.string().optional(),
    position: z.string().optional(),
    organization: z.string().optional(),
    learning_level: z.enum(['beginner', 'intermediate', 'advanced', 'expert']).optional(),
    certification_status: z.enum(['pending', 'in_progress', 'certified', 'expired', 'rejected']).optional()
  }).refine(data => Object.keys(data).length > 0, {
    message: '至少需要提供一个更新字段'
  })
});

// 批量删除请求验证模式
const BatchDeleteSchema = z.object({
  user_ids: z.array(z.string()).min(1, '至少需要选择一个用户')
});

/**
 * PUT /api/admin/users/batch
 * 批量更新用户信息
 */
export async function PUT(request: NextRequest) {
  try {
    console.log('收到批量更新用户请求');
    
    // 检查管理员权限
    const rbacResult = await verifyAdminAccess(request);
    if (!rbacResult.success) {
      console.error('权限验证失败:', rbacResult.message);
      return NextResponse.json(
        { success: false, error: rbacResult.message || '权限验证失败' },
        { status: 403 }
      );
    }

    // 解析请求体
    const body = await request.json();
    console.log('请求体数据:', body);
    
    // 验证请求数据
    const validationResult = BatchUpdateSchema.safeParse(body);
    if (!validationResult.success) {
      console.error('数据验证失败:', validationResult.error.errors);
      return NextResponse.json(
        { 
          success: false, 
          error: '请求数据格式错误',
          details: validationResult.error.errors
        },
        { status: 400 }
      );
    }

    const { user_ids, update_data } = validationResult.data;
    
    // 准备更新数据
    const updatePayload: Record<string, unknown> = {
      ...update_data,
      updated_at: new Date().toISOString()
    };
    
    // 如果更新状态，同时更新验证状态
    if (update_data.status) {
      updatePayload.is_verified = update_data.status === 'active';
    }
    
    console.log('准备更新数据:', updatePayload);
    console.log('目标用户ID:', user_ids);

    // 执行批量更新
    const { data: updatedUsers, error } = await supabase
      .from('users')
      .update(updatePayload)
      .in('id', user_ids)
      .select();

    if (error) {
      console.error('数据库更新失败:', error);
      return NextResponse.json(
        { 
          success: false, 
          error: '批量更新失败',
          details: error.message
        },
        { status: 500 }
      );
    }

    console.log('批量更新成功，影响用户数:', updatedUsers?.length || 0);
    
    // 记录操作日志
    const logData = {
      operation_type: 'batch_update',
      operator_id: rbacResult.user?.userId || 'unknown',
      operator_role: (rbacResult.user as any)?.role || 'unknown',
      affected_user_count: updatedUsers?.length || 0,
      affected_user_ids: user_ids,
      operation_description: `批量更新用户信息`,
      operation_data: update_data,
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      user_agent: request.headers.get('user-agent') || 'unknown',
      success: true,
      created_at: new Date().toISOString()
    };
    
    // 保存操作日志（不阻塞主流程）
    supabase.from('operation_logs').insert(logData).then(({ error: logError }) => {
      if (logError) {
        console.error('保存操作日志失败:', logError);
      } else {
        console.log('操作日志已保存');
      }
    });

    return NextResponse.json({
      success: true,
      message: `成功更新了 ${updatedUsers?.length || 0} 个用户`,
      data: {
        updated_count: updatedUsers?.length || 0,
        updated_users: updatedUsers
      }
    });

  } catch (error) {
    console.error('批量更新用户异常:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: '服务器内部错误',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/users/batch
 * 批量删除用户
 */
export async function DELETE(request: NextRequest) {
  try {
    console.log('收到批量删除用户请求');
    
    // 检查管理员权限
    const rbacResult = await verifyAdminAccess(request);
    if (!rbacResult.success) {
      console.error('权限验证失败:', rbacResult.message);
      return NextResponse.json(
        { success: false, error: rbacResult.message || '权限验证失败' },
        { status: 403 }
      );
    }

    // 解析请求体
    const body = await request.json();
    console.log('请求体数据:', body);
    
    // 验证请求数据
    const validationResult = BatchDeleteSchema.safeParse(body);
    if (!validationResult.success) {
      console.error('数据验证失败:', validationResult.error.errors);
      return NextResponse.json(
        { 
          success: false, 
          error: '请求数据格式错误',
          details: validationResult.error.errors
        },
        { status: 400 }
      );
    }

    const { user_ids } = validationResult.data;
    
    console.log('准备删除用户ID:', user_ids);

    // 执行批量删除
    const { data: deletedUsers, error } = await supabase
      .from('users')
      .delete()
      .in('id', user_ids)
      .select();

    if (error) {
      console.error('数据库删除失败:', error);
      return NextResponse.json(
        { 
          success: false, 
          error: '批量删除失败',
          details: error.message
        },
        { status: 500 }
      );
    }

    console.log('批量删除成功，删除用户数:', deletedUsers?.length || 0);
    
    // 记录操作日志
    const logData = {
      operation_type: 'batch_delete',
      operator_id: rbacResult.user?.userId || 'unknown',
      operator_role: (rbacResult.user as any)?.role || 'unknown',
      affected_user_count: deletedUsers?.length || 0,
      affected_user_ids: user_ids,
      operation_description: `批量删除用户`,
      operation_data: { deleted_user_ids: user_ids },
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      user_agent: request.headers.get('user-agent') || 'unknown',
      success: true,
      created_at: new Date().toISOString()
    };
    
    // 保存操作日志（不阻塞主流程）
    supabase.from('operation_logs').insert(logData).then(({ error: logError }) => {
      if (logError) {
        console.error('保存操作日志失败:', logError);
      } else {
        console.log('操作日志已保存');
      }
    });

    return NextResponse.json({
      success: true,
      message: `成功删除了 ${deletedUsers?.length || 0} 个用户`,
      data: {
        deleted_count: deletedUsers?.length || 0,
        deleted_users: deletedUsers
      }
    });

  } catch (error) {
    console.error('批量删除用户异常:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: '服务器内部错误',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}