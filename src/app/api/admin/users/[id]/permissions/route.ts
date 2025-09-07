import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface UserPermissionRequest {
  resource: string;
  action: string;
  granted: boolean;
  source_type: 'direct' | 'department' | 'role' | 'group';
  source_id?: string;
  conditions?: any;
  expires_at?: string;
  priority?: number;
}

interface BatchUserPermissionRequest {
  permissions: UserPermissionRequest[];
  override_existing?: boolean;
  inherit_from_departments?: boolean;
}

/**
 * 验证管理员权限
 * @param token - JWT令牌
 * @returns 管理员用户信息或null
 */
async function verifyAdminToken(token: string) {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    const { data: admin } = await supabase
      .from('admin_users')
      .select('*')
      .eq('id', decoded.userId)
      .eq('status', 'active')
      .single();
    
    return admin;
  } catch (error) {
    return null;
  }
}

/**
 * 计算用户的有效权限（包含部门继承）
 * @param userId - 用户ID
 * @param resource - 资源
 * @param action - 操作
 * @returns 有效权限信息
 */
async function calculateUserEffectivePermission(
  userId: string,
  resource: string,
  action: string
): Promise<{
  granted: boolean;
  source: 'direct' | 'department' | 'role' | 'group';
  source_id?: string;
  source_name?: string;
  priority: number;
  conditions?: any;
  expires_at?: string;
}> {
  const permissions = [];

  // 1. 获取直接权限
  const { data: directPermissions } = await supabase
    .from('user_permissions')
    .select('*')
    .eq('user_id', userId)
    .eq('resource', resource)
    .eq('action', action)
    .eq('status', 'active')
    .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString());

  if (directPermissions) {
    permissions.push(...directPermissions.map(p => ({
      granted: p.granted,
      source: p.source_type,
      source_id: p.source_id,
      source_name: p.source_type === 'direct' ? '直接授权' : undefined,
      priority: p.priority || 100,
      conditions: p.conditions,
      expires_at: p.expires_at
    })));
  }

  // 2. 获取部门权限
  const { data: userDepartments } = await supabase
    .from('user_departments')
    .select(`
      department_id,
      departments!inner(
        id, name, path,
        department_permissions!inner(
          resource, action, granted, conditions, expires_at, priority
        )
      )
    `)
    .eq('user_id', userId)
    .eq('status', 'active')
    .eq('departments.department_permissions.resource', resource)
    .eq('departments.department_permissions.action', action)
    .eq('departments.department_permissions.status', 'active');

  if (userDepartments) {
    for (const userDept of userDepartments) {
      const dept = userDept.departments;
      if (dept && dept.department_permissions) {
        for (const perm of dept.department_permissions) {
          permissions.push({
            granted: perm.granted,
            source: 'department' as const,
            source_id: dept.id,
            source_name: dept.name,
            priority: perm.priority || 50,
            conditions: perm.conditions,
            expires_at: perm.expires_at
          });
        }
      }
    }
  }

  // 3. 按优先级排序（数字越大优先级越高）
  permissions.sort((a, b) => b.priority - a.priority);

  // 4. 返回最高优先级的权限
  if (permissions.length > 0) {
    return permissions[0];
  }

  // 5. 默认拒绝
  return {
    granted: false,
    source: 'direct',
    priority: 0
  };
}

/**
 * 记录权限变更历史
 * @param userId - 用户ID
 * @param resource - 资源
 * @param action - 操作
 * @param oldGranted - 旧权限状态
 * @param newGranted - 新权限状态
 * @param changeType - 变更类型
 * @param changedBy - 变更人
 * @param reason - 变更原因
 * @param request - 请求对象
 */
async function logUserPermissionChange(
  userId: string,
  resource: string,
  action: string,
  oldGranted: boolean | null,
  newGranted: boolean,
  changeType: string,
  changedBy: string,
  reason?: string,
  request?: NextRequest
) {
  const clientIP = request?.headers.get('x-forwarded-for') || 
                   request?.headers.get('x-real-ip') || 
                   'unknown';
  const userAgent = request?.headers.get('user-agent') || 'unknown';

  await supabase
    .from('permission_change_history')
    .insert({
      target_type: 'user',
      target_id: userId,
      resource,
      action,
      old_granted: oldGranted,
      new_granted: newGranted,
      change_type: changeType,
      change_reason: reason,
      changed_by: changedBy,
      ip_address: clientIP,
      user_agent: userAgent
    });
}

/**
 * 获取用户权限配置
 * GET /api/admin/users/[id]/permissions
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: '未提供认证令牌' }, { status: 401 });
    }

    const admin = await verifyAdminToken(token);
    if (!admin) {
      return NextResponse.json({ error: '无效的认证令牌' }, { status: 401 });
    }

    const userId = params.id;
    const { searchParams } = new URL(request.url);
    const includeEffective = searchParams.get('include_effective') === 'true';
    const includeDepartment = searchParams.get('include_department') === 'true';
    const resource = searchParams.get('resource');
    const action = searchParams.get('action');
    const sourceType = searchParams.get('source_type');

    // 验证用户是否存在
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, name')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    // 获取直接权限
    let directQuery = supabase
      .from('user_permissions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active');

    if (resource) {
      directQuery = directQuery.eq('resource', resource);
    }
    if (action) {
      directQuery = directQuery.eq('action', action);
    }
    if (sourceType) {
      directQuery = directQuery.eq('source_type', sourceType);
    }

    const { data: directPermissions, error: directError } = await directQuery;

    if (directError) {
      throw directError;
    }

    let result: any = {
      user_id: userId,
      user_info: user,
      direct_permissions: directPermissions || []
    };

    // 如果需要包含部门权限
    if (includeDepartment) {
      const { data: departmentPermissions } = await supabase
        .from('user_departments')
        .select(`
          department_id,
          role,
          departments!inner(
            id, name, path, level,
            department_permissions(
              id, resource, action, granted, conditions, expires_at, priority,
              inherit_from_parent, created_at, updated_at
            )
          )
        `)
        .eq('user_id', userId)
        .eq('status', 'active');

      result.department_permissions = departmentPermissions || [];
    }

    // 如果需要计算有效权限
    if (includeEffective) {
      const effectivePermissions = [];
      
      // 获取所有可能的资源和操作组合
      const { data: allPermissions } = await supabase
        .from('user_permissions')
        .select('resource, action')
        .eq('status', 'active');

      const { data: allDeptPermissions } = await supabase
        .from('department_permissions')
        .select('resource, action')
        .eq('status', 'active');

      const allCombinations = new Set();
      
      if (allPermissions) {
        allPermissions.forEach(p => allCombinations.add(`${p.resource}:${p.action}`));
      }
      
      if (allDeptPermissions) {
        allDeptPermissions.forEach(p => allCombinations.add(`${p.resource}:${p.action}`));
      }

      for (const combination of allCombinations) {
        const [res, act] = combination.split(':');
        if ((!resource || res === resource) && (!action || act === action)) {
          const effective = await calculateUserEffectivePermission(userId, res, act);
          effectivePermissions.push({
            resource: res,
            action: act,
            ...effective
          });
        }
      }

      result.effective_permissions = effectivePermissions;
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error('获取用户权限失败:', error);
    return NextResponse.json(
      { error: '获取用户权限失败' },
      { status: 500 }
    );
  }
}

/**
 * 配置用户权限
 * POST /api/admin/users/[id]/permissions
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: '未提供认证令牌' }, { status: 401 });
    }

    const admin = await verifyAdminToken(token);
    if (!admin) {
      return NextResponse.json({ error: '无效的认证令牌' }, { status: 401 });
    }

    const userId = params.id;
    const body: BatchUserPermissionRequest = await request.json();

    // 验证用户是否存在
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    const results = [];
    const errors = [];

    // 如果需要从部门继承权限
    if (body.inherit_from_departments) {
      const { data: userDepartments } = await supabase
        .from('user_departments')
        .select(`
          department_id,
          departments!inner(
            department_permissions(
              resource, action, granted, conditions, expires_at, priority
            )
          )
        `)
        .eq('user_id', userId)
        .eq('status', 'active');

      if (userDepartments) {
        for (const userDept of userDepartments) {
          const dept = userDept.departments;
          if (dept && dept.department_permissions) {
            for (const deptPerm of dept.department_permissions) {
              body.permissions.push({
                resource: deptPerm.resource,
                action: deptPerm.action,
                granted: deptPerm.granted,
                source_type: 'department',
                source_id: userDept.department_id,
                conditions: deptPerm.conditions,
                expires_at: deptPerm.expires_at,
                priority: (deptPerm.priority || 50) - 10 // 部门权限优先级稍低
              });
            }
          }
        }
      }
    }

    // 处理每个权限配置
    for (const permission of body.permissions) {
      try {
        // 检查是否已存在
        const { data: existing } = await supabase
          .from('user_permissions')
          .select('*')
          .eq('user_id', userId)
          .eq('resource', permission.resource)
          .eq('action', permission.action)
          .eq('source_type', permission.source_type)
          .eq('source_id', permission.source_id || '')
          .single();

        const permissionData = {
          user_id: userId,
          resource: permission.resource,
          action: permission.action,
          granted: permission.granted,
          source_type: permission.source_type,
          source_id: permission.source_id,
          conditions: permission.conditions,
          expires_at: permission.expires_at,
          priority: permission.priority || 100,
          updated_by: admin.id,
          updated_at: new Date().toISOString()
        };

        let result;
        if (existing) {
          if (body.override_existing) {
            // 更新现有权限
            const { data, error } = await supabase
              .from('user_permissions')
              .update(permissionData)
              .eq('id', existing.id)
              .select()
              .single();

            if (error) throw error;
            result = data;

            // 记录变更历史
            await logUserPermissionChange(
              userId,
              permission.resource,
              permission.action,
              existing.granted,
              permission.granted,
              'update',
              admin.id,
              '权限配置更新',
              request
            );
          } else {
            // 跳过已存在的权限
            continue;
          }
        } else {
          // 创建新权限
          const { data, error } = await supabase
            .from('user_permissions')
            .insert({
              ...permissionData,
              created_by: admin.id
            })
            .select()
            .single();

          if (error) throw error;
          result = data;

          // 记录变更历史
          await logUserPermissionChange(
            userId,
            permission.resource,
            permission.action,
            null,
            permission.granted,
            'create',
            admin.id,
            '新增权限配置',
            request
          );
        }

        results.push(result);

      } catch (error) {
        console.error(`配置用户权限失败 ${permission.resource}:${permission.action}:`, error);
        errors.push({
          resource: permission.resource,
          action: permission.action,
          error: error instanceof Error ? error.message : '未知错误'
        });
      }
    }

    return NextResponse.json({
      success: true,
      results,
      errors: errors.length > 0 ? errors : undefined,
      message: `成功配置 ${results.length} 个权限${errors.length > 0 ? `，${errors.length} 个失败` : ''}`
    });

  } catch (error) {
    console.error('配置用户权限失败:', error);
    return NextResponse.json(
      { error: '配置用户权限失败' },
      { status: 500 }
    );
  }
}

/**
 * 删除用户权限
 * DELETE /api/admin/users/[id]/permissions
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: '未提供认证令牌' }, { status: 401 });
    }

    const admin = await verifyAdminToken(token);
    if (!admin) {
      return NextResponse.json({ error: '无效的认证令牌' }, { status: 401 });
    }

    const userId = params.id;
    const { searchParams } = new URL(request.url);
    const resource = searchParams.get('resource');
    const action = searchParams.get('action');
    const sourceType = searchParams.get('source_type');
    const sourceId = searchParams.get('source_id');
    const permissionId = searchParams.get('permission_id');

    if (!resource || !action) {
      return NextResponse.json(
        { error: '必须提供resource和action参数' },
        { status: 400 }
      );
    }

    // 构建查询条件
    let query = supabase
      .from('user_permissions')
      .select('*')
      .eq('user_id', userId)
      .eq('resource', resource)
      .eq('action', action);

    if (sourceType) {
      query = query.eq('source_type', sourceType);
    }
    if (sourceId) {
      query = query.eq('source_id', sourceId);
    }
    if (permissionId) {
      query = query.eq('id', permissionId);
    }

    const { data: permissions, error: getError } = await query;

    if (getError) {
      throw getError;
    }

    if (!permissions || permissions.length === 0) {
      return NextResponse.json({ error: '权限不存在' }, { status: 404 });
    }

    const deletedPermissions = [];

    for (const permission of permissions) {
      // 删除权限
      const { error: deleteError } = await supabase
        .from('user_permissions')
        .delete()
        .eq('id', permission.id);

      if (deleteError) {
        throw deleteError;
      }

      deletedPermissions.push(permission);

      // 记录变更历史
      await logUserPermissionChange(
        userId,
        permission.resource,
        permission.action,
        permission.granted,
        false,
        'delete',
        admin.id,
        '删除权限配置',
        request
      );
    }

    return NextResponse.json({
      success: true,
      deleted_permissions: deletedPermissions,
      message: `成功删除 ${deletedPermissions.length} 个权限`
    });

  } catch (error) {
    console.error('删除用户权限失败:', error);
    return NextResponse.json(
      { error: '删除用户权限失败' },
      { status: 500 }
    );
  }
}