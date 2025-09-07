/**
 * 角色管理API路由
 * 提供角色的增删改查功能
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyRBAC } from '@/middleware/rbac';
import { UserRole } from '@/types/roles';
import { supabase } from '@/lib/supabase';

/**
 * 获取角色列表
 * GET /api/admin/roles
 */
export async function GET(request: NextRequest) {
  try {
    // 验证管理员权限
    const rbacResult = await verifyRBAC(request, [UserRole.ADMIN, UserRole.SUPER_ADMIN]);
    if (!rbacResult.success) {
      return NextResponse.json(
        { error: rbacResult.error },
        { status: rbacResult.status }
      );
    }

    // 获取角色列表
    const { data: roles, error: rolesError } = await supabase
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
      .order('created_at', { ascending: false });

    if (rolesError) {
      console.error('获取角色列表失败:', rolesError);
      return NextResponse.json(
        { error: '获取角色列表失败' },
        { status: 500 }
      );
    }

    // 获取每个角色的用户数量
    const rolesWithUserCount = await Promise.all(
      (roles || []).map(async (role) => {
        const { count: userCount } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .eq('role', role.name);

        return {
          id: role.id,
          name: role.name,
          displayName: role.display_name,
          description: role.description,
          permissions: role.permissions || [],
          userCount: userCount || 0,
          isSystem: role.is_system,
          createdAt: role.created_at,
          updatedAt: role.updated_at
        };
      })
    );

    return NextResponse.json({
      success: true,
      roles: rolesWithUserCount
    });
  } catch (error) {
    console.error('获取角色列表失败:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

/**
 * 创建新角色
 * POST /api/admin/roles
 */
export async function POST(request: NextRequest) {
  try {
    // 验证管理员权限
    const rbacResult = await verifyRBAC(request, [UserRole.ADMIN, UserRole.SUPER_ADMIN]);
    if (!rbacResult.success) {
      return NextResponse.json(
        { error: rbacResult.error },
        { status: rbacResult.status }
      );
    }

    const body = await request.json();
    const { name, displayName, description, permissions } = body;

    // 验证必填字段
    if (!name || !displayName) {
      return NextResponse.json(
        { error: '角色名称和显示名称不能为空' },
        { status: 400 }
      );
    }

    // 检查角色名称是否已存在
    const { data: existingRole } = await supabase
      .from('roles')
      .select('id')
      .eq('name', name)
      .single();

    if (existingRole) {
      return NextResponse.json(
        { error: '角色名称已存在' },
        { status: 400 }
      );
    }

    // 创建角色
    const { data: newRole, error: createError } = await supabase
      .from('roles')
      .insert({
        name,
        display_name: displayName,
        description: description || '',
        permissions: permissions || [],
        is_system: false
      })
      .select()
      .single();

    if (createError) {
      console.error('创建角色失败:', createError);
      return NextResponse.json(
        { error: '创建角色失败' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      role: {
        id: newRole.id,
        name: newRole.name,
        displayName: newRole.display_name,
        description: newRole.description,
        permissions: newRole.permissions,
        userCount: 0,
        isSystem: newRole.is_system,
        createdAt: newRole.created_at,
        updatedAt: newRole.updated_at
      }
    });
  } catch (error) {
    console.error('创建角色失败:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}