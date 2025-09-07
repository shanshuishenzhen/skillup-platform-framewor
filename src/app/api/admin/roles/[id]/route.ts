/**
 * 单个角色管理API路由
 * 提供角色的更新和删除功能
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyRBAC } from '@/middleware/rbac';
import { UserRole } from '@/types/roles';
import { supabase } from '@/lib/supabase';

/**
 * 更新角色
 * PUT /api/admin/roles/[id]
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const { id } = params;
    const body = await request.json();
    const { name, displayName, description, permissions } = body;

    // 验证必填字段
    if (!name || !displayName) {
      return NextResponse.json(
        { error: '角色名称和显示名称不能为空' },
        { status: 400 }
      );
    }

    // 检查角色是否存在
    const { data: existingRole, error: fetchError } = await supabase
      .from('roles')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existingRole) {
      return NextResponse.json(
        { error: '角色不存在' },
        { status: 404 }
      );
    }

    // 检查是否为系统角色
    if (existingRole.is_system) {
      return NextResponse.json(
        { error: '系统角色不能修改' },
        { status: 403 }
      );
    }

    // 如果修改了角色名称，检查新名称是否已存在
    if (name !== existingRole.name) {
      const { data: duplicateRole } = await supabase
        .from('roles')
        .select('id')
        .eq('name', name)
        .neq('id', id)
        .single();

      if (duplicateRole) {
        return NextResponse.json(
          { error: '角色名称已存在' },
          { status: 400 }
        );
      }
    }

    // 更新角色
    const { data: updatedRole, error: updateError } = await supabase
      .from('roles')
      .update({
        name,
        display_name: displayName,
        description: description || '',
        permissions: permissions || [],
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('更新角色失败:', updateError);
      return NextResponse.json(
        { error: '更新角色失败' },
        { status: 500 }
      );
    }

    // 如果角色名称发生变化，需要更新所有使用该角色的用户
    if (name !== existingRole.name) {
      const { error: updateUsersError } = await supabase
        .from('users')
        .update({ role: name })
        .eq('role', existingRole.name);

      if (updateUsersError) {
        console.error('更新用户角色失败:', updateUsersError);
        // 这里不返回错误，因为角色已经更新成功，只是用户角色更新失败
        // 可以考虑记录日志或者发送通知
      }
    }

    // 获取用户数量
    const { count: userCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('role', updatedRole.name);

    return NextResponse.json({
      success: true,
      role: {
        id: updatedRole.id,
        name: updatedRole.name,
        displayName: updatedRole.display_name,
        description: updatedRole.description,
        permissions: updatedRole.permissions,
        userCount: userCount || 0,
        isSystem: updatedRole.is_system,
        createdAt: updatedRole.created_at,
        updatedAt: updatedRole.updated_at
      }
    });
  } catch (error) {
    console.error('更新角色失败:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

/**
 * 删除角色
 * DELETE /api/admin/roles/[id]
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const { id } = params;

    // 检查角色是否存在
    const { data: existingRole, error: fetchError } = await supabase
      .from('roles')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existingRole) {
      return NextResponse.json(
        { error: '角色不存在' },
        { status: 404 }
      );
    }

    // 检查是否为系统角色
    if (existingRole.is_system) {
      return NextResponse.json(
        { error: '系统角色不能删除' },
        { status: 403 }
      );
    }

    // 检查是否有用户使用该角色
    const { count: userCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('role', existingRole.name);

    if (userCount && userCount > 0) {
      return NextResponse.json(
        { error: `该角色下还有 ${userCount} 个用户，不能删除` },
        { status: 400 }
      );
    }

    // 删除角色
    const { error: deleteError } = await supabase
      .from('roles')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('删除角色失败:', deleteError);
      return NextResponse.json(
        { error: '删除角色失败' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '角色删除成功'
    });
  } catch (error) {
    console.error('删除角色失败:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

/**
 * 获取单个角色详情
 * GET /api/admin/roles/[id]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const { id } = params;

    // 获取角色详情
    const { data: role, error: fetchError } = await supabase
      .from('roles')
      .select(`
        id,
        name,
        display_name,
        description,
        permissions,
        is_system,
        created_at,
        updated_at
      `)
      .eq('id', id)
      .single();

    if (fetchError || !role) {
      return NextResponse.json(
        { error: '角色不存在' },
        { status: 404 }
      );
    }

    // 获取用户数量
    const { count: userCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('role', role.name);

    return NextResponse.json({
      success: true,
      role: {
        id: role.id,
        name: role.name,
        displayName: role.display_name,
        description: role.description,
        permissions: role.permissions || [],
        userCount: userCount || 0,
        isSystem: role.is_system,
        createdAt: role.created_at,
        updatedAt: role.updated_at
      }
    });
  } catch (error) {
    console.error('获取角色详情失败:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}