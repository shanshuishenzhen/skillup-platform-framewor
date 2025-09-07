/**
 * 单个用户管理API接口
 * 支持获取、更新、删除单个用户
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { ErrorHandler } from '@/utils/errorHandler';
import { verifyAdminAccess } from '@/middleware/rbac';

// 初始化 Supabase 客户端
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 用户更新数据验证模式
const UserUpdateSchema = z.object({
  name: z.string().min(1, '姓名不能为空').optional(),
  email: z.string().email('邮箱格式不正确').optional(),
  phone: z.string().optional(),
  employee_id: z.string().optional(),
  department: z.string().optional(),
  position: z.string().optional(),
  organization: z.string().optional(),
  learning_level: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  learning_progress: z.number().min(0).max(100).optional(),
  learning_hours: z.number().min(0).optional(),
  exam_permissions: z.array(z.string()).optional(),
  certification_status: z.enum(['none', 'in_progress', 'certified', 'expired']).optional(),
  certification_date: z.string().optional(),
  role: z.enum(['student', 'teacher', 'admin']).optional(),
  status: z.enum(['active', 'inactive', 'suspended']).optional(),
  sync_status: z.enum(['pending', 'synced', 'failed']).optional()
});

type UserUpdate = z.infer<typeof UserUpdateSchema>;

/**
 * GET /api/admin/users/[id]
 * 获取单个用户详情
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 检查管理员权限
    const rbacResult = await verifyAdminAccess(request);
    if (!rbacResult.success) {
      return NextResponse.json(
        { success: false, error: rbacResult.message || '权限验证失败' },
        { status: 403 }
      );
    }

    const { id: userId } = await params;

    // 获取用户详情
    const { data: user, error } = await supabase
      .from('users')
      .select(`
        id,
        name,
        email,
        phone,
        employee_id,
        department,
        position,
        organization,
        learning_level,
        learning_progress,
        learning_hours,
        last_learning_time,
        exam_permissions,
        exam_history,
        certification_status,
        certification_date,
        role,
        status,
        import_batch_id,
        import_source,
        import_date,
        sync_status,
        last_sync_time,
        sync_error_message,
        created_at,
        updated_at
      `)
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { success: false, error: '用户不存在' },
          { status: 404 }
        );
      }
      throw new Error(`获取用户详情失败: ${error.message}`);
    }

    // 获取用户的学习统计信息
    const { data: learningStats } = await supabase
      .from('learning_progress')
      .select('course_id, progress, completed_at')
      .eq('user_id', userId);

    // 获取用户的考试记录
    const { data: examRecords } = await supabase
      .from('exam_records')
      .select('exam_id, score, status, completed_at')
      .eq('user_id', userId)
      .order('completed_at', { ascending: false })
      .limit(10);

    // 获取用户的同步日志
    const { data: syncLogs } = await supabase
      .from('user_sync_logs')
      .select('sync_type, status, error_message, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5);

    return NextResponse.json({
      success: true,
      data: {
        user,
        learningStats: learningStats || [],
        examRecords: examRecords || [],
        syncLogs: syncLogs || []
      }
    });

  } catch (error) {
    console.error('获取用户详情错误:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '获取用户详情失败'
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/users/[id]
 * 更新单个用户信息
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 检查管理员权限
    const rbacResult = await verifyAdminAccess(request);
    if (!rbacResult.success) {
      return NextResponse.json(
        { success: false, error: rbacResult.message || '权限验证失败' },
        { status: 403 }
      );
    }

    const { id: userId } = await params;
    const body = await request.json();
    const updateData = UserUpdateSchema.parse(body);

    // 检查用户是否存在
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id, email')
      .eq('id', userId)
      .single();

    if (checkError) {
      if (checkError.code === 'PGRST116') {
        return NextResponse.json(
          { success: false, error: '用户不存在' },
          { status: 404 }
        );
      }
      throw new Error(`检查用户失败: ${checkError.message}`);
    }

    // 如果更新邮箱，检查邮箱是否已被其他用户使用
    if (updateData.email && updateData.email !== existingUser.email) {
      const { data: emailUser } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('email', updateData.email)
        .neq('id', userId)
        .single();

      if (emailUser) {
        return NextResponse.json(
          { success: false, error: '该邮箱已被其他用户使用' },
          { status: 400 }
        );
      }
    }

    // 更新用户信息
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    if (updateError) {
      throw new Error(`更新用户失败: ${updateError.message}`);
    }

    return NextResponse.json({
      success: true,
      data: updatedUser,
      message: '用户信息更新成功'
    });

  } catch (error) {
    console.error('更新用户错误:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: '数据验证失败',
          details: error.errors
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '更新用户失败'
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/users/[id]
 * 删除单个用户
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 检查管理员权限
    const rbacResult = await verifyAdminAccess(request);
    if (!rbacResult.success) {
      return NextResponse.json(
        { success: false, error: rbacResult.message || '权限验证失败' },
        { status: 403 }
      );
    }

    const { id: userId } = await params;

    // 检查用户是否存在
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id, name, email')
      .eq('id', userId)
      .single();

    if (checkError) {
      if (checkError.code === 'PGRST116') {
        return NextResponse.json(
          { success: false, error: '用户不存在' },
          { status: 404 }
        );
      }
      throw new Error(`检查用户失败: ${checkError.message}`);
    }

    // 软删除用户（标记为已删除状态）
    const { error: deleteError } = await supabase
      .from('users')
      .update({
        status: 'deleted',
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (deleteError) {
      throw new Error(`删除用户失败: ${deleteError.message}`);
    }

    return NextResponse.json({
      success: true,
      message: `用户 ${existingUser.name} 已成功删除`
    });

  } catch (error) {
    console.error('删除用户错误:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '删除用户失败'
      },
      { status: 500 }
    );
  }
}