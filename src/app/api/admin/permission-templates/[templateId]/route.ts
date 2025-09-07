/**
 * 单个权限模板管理API
 * 提供权限模板的查看、更新、删除功能
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { verifyRBAC } from '@/middleware/rbac';
import { UserRole } from '@/types/roles';

// 初始化 Supabase 客户端
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 权限模板更新验证模式
const PermissionTemplateUpdateSchema = z.object({
  name: z.string().min(1, '模板名称不能为空').max(100, '模板名称不能超过100个字符').optional(),
  description: z.string().optional(),
  permissions: z.array(z.string()).min(1, '至少需要包含一个权限').optional(),
  category: z.string().optional(),
  is_active: z.boolean().optional()
});

/**
 * GET /api/admin/permission-templates/[templateId]
 * 获取单个权限模板详情
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  try {
    // 验证管理员权限
    const rbacResult = await verifyRBAC(request, [UserRole.ADMIN, UserRole.SUPER_ADMIN]);
    if (!rbacResult.success) {
      return NextResponse.json(
        { error: rbacResult.error },
        { status: rbacResult.status }
      );
    }

    const { templateId } = await params;

    // 获取权限模板详情
    const { data: template, error } = await supabase
      .from('permission_templates')
      .select(`
        id,
        name,
        description,
        permissions,
        category,
        is_system,
        is_active,
        created_by,
        created_at,
        updated_at,
        creator:users!created_by(name, email)
      `)
      .eq('id', templateId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: '权限模板不存在' },
          { status: 404 }
        );
      }
      throw new Error(`获取权限模板失败: ${error.message}`);
    }

    // 获取模板使用统计
    const { data: usageStats, error: statsError } = await supabase
      .from('template_usage_logs')
      .select('user_count, successful_count, failed_count, operation, created_at')
      .eq('template_id', templateId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (statsError) {
      console.warn('获取模板使用统计失败:', statsError);
    }

    // 获取当前使用该模板的用户数量
    const { count: activeUsers, error: countError } = await supabase
      .from('user_permissions')
      .select('user_id', { count: 'exact', head: true })
      .eq('template_id', templateId)
      .eq('is_active', true);

    if (countError) {
      console.warn('获取活跃用户数量失败:', countError);
    }

    // 计算总使用统计
    const totalUsage = usageStats?.reduce((acc, log) => {
      acc.totalApplications += 1;
      acc.totalUsers += log.user_count;
      acc.totalSuccessful += log.successful_count;
      acc.totalFailed += log.failed_count;
      return acc;
    }, {
      totalApplications: 0,
      totalUsers: 0,
      totalSuccessful: 0,
      totalFailed: 0
    }) || {
      totalApplications: 0,
      totalUsers: 0,
      totalSuccessful: 0,
      totalFailed: 0
    };

    return NextResponse.json({
      success: true,
      data: {
        template,
        statistics: {
          activeUsers: activeUsers || 0,
          ...totalUsage,
          recentUsage: usageStats || []
        }
      }
    });

  } catch (error) {
    console.error('获取权限模板详情失败:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/permission-templates/[templateId]
 * 更新权限模板
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  try {
    // 验证管理员权限
    const rbacResult = await verifyRBAC(request, [UserRole.ADMIN, UserRole.SUPER_ADMIN]);
    if (!rbacResult.success) {
      return NextResponse.json(
        { error: rbacResult.error },
        { status: rbacResult.status }
      );
    }

    const { templateId } = await params;
    const body = await request.json();
    const updateData = PermissionTemplateUpdateSchema.parse(body);

    // 检查模板是否存在
    const { data: existingTemplate, error: checkError } = await supabase
      .from('permission_templates')
      .select('id, name, is_system, created_by')
      .eq('id', templateId)
      .single();

    if (checkError) {
      if (checkError.code === 'PGRST116') {
        return NextResponse.json(
          { error: '权限模板不存在' },
          { status: 404 }
        );
      }
      throw new Error(`检查权限模板失败: ${checkError.message}`);
    }

    // 检查是否为系统模板
    if (existingTemplate.is_system) {
      return NextResponse.json(
        { error: '系统模板不允许修改' },
        { status: 403 }
      );
    }

    // 检查权限（只有创建者或超级管理员可以修改）
    if (existingTemplate.created_by !== rbacResult.user.id && rbacResult.user.role !== UserRole.SUPER_ADMIN) {
      return NextResponse.json(
        { error: '只有模板创建者或超级管理员可以修改模板' },
        { status: 403 }
      );
    }

    // 如果更新名称，检查名称是否已存在
    if (updateData.name && updateData.name !== existingTemplate.name) {
      const { data: nameCheck } = await supabase
        .from('permission_templates')
        .select('id')
        .eq('name', updateData.name)
        .neq('id', templateId)
        .single();

      if (nameCheck) {
        return NextResponse.json(
          { error: '模板名称已存在' },
          { status: 400 }
        );
      }
    }

    // 更新权限模板
    const { data: updatedTemplate, error: updateError } = await supabase
      .from('permission_templates')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', templateId)
      .select(`
        id,
        name,
        description,
        permissions,
        category,
        is_system,
        is_active,
        created_by,
        created_at,
        updated_at
      `)
      .single();

    if (updateError) {
      throw new Error(`更新权限模板失败: ${updateError.message}`);
    }

    // 记录模板变更历史
    await supabase
      .from('template_change_logs')
      .insert({
        template_id: templateId,
        operator_id: rbacResult.user.id,
        operation: 'update',
        changes: updateData,
        created_at: new Date().toISOString()
      });

    return NextResponse.json({
      success: true,
      message: '权限模板更新成功',
      data: updatedTemplate
    });

  } catch (error) {
    console.error('更新权限模板失败:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '请求数据格式错误', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : '服务器内部错误' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/permission-templates/[templateId]
 * 删除权限模板
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  try {
    // 验证管理员权限
    const rbacResult = await verifyRBAC(request, [UserRole.ADMIN, UserRole.SUPER_ADMIN]);
    if (!rbacResult.success) {
      return NextResponse.json(
        { error: rbacResult.error },
        { status: rbacResult.status }
      );
    }

    const { templateId } = await params;

    // 检查模板是否存在
    const { data: existingTemplate, error: checkError } = await supabase
      .from('permission_templates')
      .select('id, name, is_system, created_by')
      .eq('id', templateId)
      .single();

    if (checkError) {
      if (checkError.code === 'PGRST116') {
        return NextResponse.json(
          { error: '权限模板不存在' },
          { status: 404 }
        );
      }
      throw new Error(`检查权限模板失败: ${checkError.message}`);
    }

    // 检查是否为系统模板
    if (existingTemplate.is_system) {
      return NextResponse.json(
        { error: '系统模板不允许删除' },
        { status: 403 }
      );
    }

    // 检查权限（只有创建者或超级管理员可以删除）
    if (existingTemplate.created_by !== rbacResult.user.id && rbacResult.user.role !== UserRole.SUPER_ADMIN) {
      return NextResponse.json(
        { error: '只有模板创建者或超级管理员可以删除模板' },
        { status: 403 }
      );
    }

    // 检查是否有用户正在使用该模板
    const { count: activeUsers, error: countError } = await supabase
      .from('user_permissions')
      .select('user_id', { count: 'exact', head: true })
      .eq('template_id', templateId)
      .eq('is_active', true);

    if (countError) {
      console.warn('检查模板使用情况失败:', countError);
    }

    if (activeUsers && activeUsers > 0) {
      return NextResponse.json(
        { 
          error: `无法删除模板，当前有 ${activeUsers} 个用户正在使用该模板`,
          activeUsers 
        },
        { status: 400 }
      );
    }

    // 删除权限模板
    const { error: deleteError } = await supabase
      .from('permission_templates')
      .delete()
      .eq('id', templateId);

    if (deleteError) {
      throw new Error(`删除权限模板失败: ${deleteError.message}`);
    }

    // 记录模板变更历史
    await supabase
      .from('template_change_logs')
      .insert({
        template_id: templateId,
        operator_id: rbacResult.user.id,
        operation: 'delete',
        changes: { deleted: true },
        created_at: new Date().toISOString()
      });

    return NextResponse.json({
      success: true,
      message: '权限模板删除成功'
    });

  } catch (error) {
    console.error('删除权限模板失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '服务器内部错误' },
      { status: 500 }
    );
  }
}