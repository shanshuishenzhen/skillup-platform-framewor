import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface PermissionRequest {
  resource: string;
  action: string;
  granted: boolean;
  inherit_from_parent?: boolean;
  override_children?: boolean;
  conditions?: any;
  expires_at?: string;
}

interface BatchPermissionRequest {
  permissions: PermissionRequest[];
  apply_to_children?: boolean;
  apply_to_members?: boolean;
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
 * 计算有效权限（包含继承）
 * @param departmentId - 部门ID
 * @param resource - 资源
 * @param action - 操作
 * @returns 有效权限状态
 */
async function calculateEffectivePermission(
  departmentId: string, 
  resource: string, 
  action: string
): Promise<{
  granted: boolean;
  source: 'direct' | 'inherited';
  source_department_id?: string;
  source_department_name?: string;
}> {
  // 首先检查直接权限
  const { data: directPermission } = await supabase
    .from('department_permissions')
    .select('*')
    .eq('department_id', departmentId)
    .eq('resource', resource)
    .eq('action', action)
    .eq('status', 'active')
    .single();

  if (directPermission && !directPermission.inherit_from_parent) {
    return {
      granted: directPermission.granted,
      source: 'direct'
    };
  }

  // 获取部门信息以查找父部门
  const { data: department } = await supabase
    .from('departments')
    .select('id, name, parent_id, path')
    .eq('id', departmentId)
    .single();

  if (!department || !department.parent_id) {
    return {
      granted: directPermission?.granted || false,
      source: 'direct'
    };
  }

  // 递归检查父部门权限
  const parentPermission = await calculateEffectivePermission(
    department.parent_id,
    resource,
    action
  );

  // 如果有直接权限且不继承父级，使用直接权限
  if (directPermission && !directPermission.inherit_from_parent) {
    return {
      granted: directPermission.granted,
      source: 'direct'
    };
  }

  // 否则使用父级权限
  return {
    granted: parentPermission.granted,
    source: 'inherited',
    source_department_id: parentPermission.source === 'direct' 
      ? department.parent_id 
      : parentPermission.source_department_id,
    source_department_name: parentPermission.source === 'direct'
      ? (await supabase.from('departments').select('name').eq('id', department.parent_id).single()).data?.name
      : parentPermission.source_department_name
  };
}

/**
 * 记录权限变更历史
 * @param targetType - 目标类型
 * @param targetId - 目标ID
 * @param resource - 资源
 * @param action - 操作
 * @param oldGranted - 旧权限状态
 * @param newGranted - 新权限状态
 * @param changeType - 变更类型
 * @param changedBy - 变更人
 * @param reason - 变更原因
 * @param request - 请求对象
 */
async function logPermissionChange(
  targetType: string,
  targetId: string,
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
      target_type: targetType,
      target_id: targetId,
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
 * 获取部门权限配置
 * GET /api/admin/departments/[id]/permissions
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

    const departmentId = params.id;
    const { searchParams } = new URL(request.url);
    const includeInherited = searchParams.get('include_inherited') === 'true';
    const includeEffective = searchParams.get('include_effective') === 'true';
    const resource = searchParams.get('resource');
    const action = searchParams.get('action');

    // 获取直接权限
    let query = supabase
      .from('department_permissions')
      .select('*')
      .eq('department_id', departmentId)
      .eq('status', 'active');

    if (resource) {
      query = query.eq('resource', resource);
    }
    if (action) {
      query = query.eq('action', action);
    }

    const { data: directPermissions, error: directError } = await query;

    if (directError) {
      throw directError;
    }

    let result: any = {
      department_id: departmentId,
      direct_permissions: directPermissions || []
    };

    // 如果需要包含继承权限
    if (includeInherited) {
      const { data: department } = await supabase
        .from('departments')
        .select('id, name, parent_id, path')
        .eq('id', departmentId)
        .single();

      if (department && department.parent_id) {
        // 递归获取父部门权限
        const parentResponse = await GET(
          new NextRequest(request.url.replace(departmentId, department.parent_id)),
          { params: { id: department.parent_id } }
        );
        
        if (parentResponse.ok) {
          const parentData = await parentResponse.json();
          result.inherited_permissions = parentData.direct_permissions || [];
          result.inheritance_chain = [
            ...(parentData.inheritance_chain || []),
            {
              department_id: department.parent_id,
              department_name: (await supabase
                .from('departments')
                .select('name')
                .eq('id', department.parent_id)
                .single()).data?.name
            }
          ];
        }
      }
    }

    // 如果需要计算有效权限
    if (includeEffective) {
      const effectivePermissions = [];
      
      // 获取所有可能的资源和操作组合
      const { data: allPermissions } = await supabase
        .from('department_permissions')
        .select('resource, action')
        .eq('status', 'active');

      if (allPermissions) {
        const uniqueCombinations = new Set(
          allPermissions.map(p => `${p.resource}:${p.action}`)
        );

        for (const combination of uniqueCombinations) {
          const [res, act] = combination.split(':');
          const effective = await calculateEffectivePermission(departmentId, res, act);
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
    console.error('获取部门权限失败:', error);
    return NextResponse.json(
      { error: '获取部门权限失败' },
      { status: 500 }
    );
  }
}

/**
 * 配置部门权限
 * POST /api/admin/departments/[id]/permissions
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

    const departmentId = params.id;
    const body: BatchPermissionRequest = await request.json();

    // 验证部门是否存在
    const { data: department, error: deptError } = await supabase
      .from('departments')
      .select('*')
      .eq('id', departmentId)
      .single();

    if (deptError || !department) {
      return NextResponse.json({ error: '部门不存在' }, { status: 404 });
    }

    const results = [];
    const errors = [];

    // 处理每个权限配置
    for (const permission of body.permissions) {
      try {
        // 检查是否已存在
        const { data: existing } = await supabase
          .from('department_permissions')
          .select('*')
          .eq('department_id', departmentId)
          .eq('resource', permission.resource)
          .eq('action', permission.action)
          .single();

        const permissionData = {
          department_id: departmentId,
          resource: permission.resource,
          action: permission.action,
          granted: permission.granted,
          inherit_from_parent: permission.inherit_from_parent ?? true,
          override_children: permission.override_children ?? false,
          department_level: department.level,
          conditions: permission.conditions,
          expires_at: permission.expires_at,
          updated_by: admin.id,
          updated_at: new Date().toISOString()
        };

        let result;
        if (existing) {
          // 更新现有权限
          const { data, error } = await supabase
            .from('department_permissions')
            .update(permissionData)
            .eq('id', existing.id)
            .select()
            .single();

          if (error) throw error;
          result = data;

          // 记录变更历史
          await logPermissionChange(
            'department',
            departmentId,
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
          // 创建新权限
          const { data, error } = await supabase
            .from('department_permissions')
            .insert({
              ...permissionData,
              created_by: admin.id
            })
            .select()
            .single();

          if (error) throw error;
          result = data;

          // 记录变更历史
          await logPermissionChange(
            'department',
            departmentId,
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

        // 如果需要应用到子部门
        if (body.apply_to_children && permission.override_children) {
          const { data: children } = await supabase
            .from('departments')
            .select('id')
            .like('path', `${department.path}%`)
            .neq('id', departmentId);

          if (children) {
            for (const child of children) {
              await supabase
                .from('department_permissions')
                .upsert({
                  department_id: child.id,
                  resource: permission.resource,
                  action: permission.action,
                  granted: permission.granted,
                  inherit_from_parent: false,
                  override_children: false,
                  department_level: department.level + 1,
                  conditions: permission.conditions,
                  created_by: admin.id,
                  updated_by: admin.id
                });
            }
          }
        }

        // 如果需要应用到成员
        if (body.apply_to_members) {
          const { data: members } = await supabase
            .from('user_departments')
            .select('user_id')
            .eq('department_id', departmentId)
            .eq('status', 'active');

          if (members) {
            for (const member of members) {
              await supabase
                .from('user_permissions')
                .upsert({
                  user_id: member.user_id,
                  resource: permission.resource,
                  action: permission.action,
                  granted: permission.granted,
                  source_type: 'department',
                  source_id: departmentId,
                  conditions: permission.conditions,
                  expires_at: permission.expires_at,
                  created_by: admin.id,
                  updated_by: admin.id
                });
            }
          }
        }

      } catch (error) {
        console.error(`配置权限失败 ${permission.resource}:${permission.action}:`, error);
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
    console.error('配置部门权限失败:', error);
    return NextResponse.json(
      { error: '配置部门权限失败' },
      { status: 500 }
    );
  }
}

/**
 * 删除部门权限
 * DELETE /api/admin/departments/[id]/permissions
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

    const departmentId = params.id;
    const { searchParams } = new URL(request.url);
    const resource = searchParams.get('resource');
    const action = searchParams.get('action');
    const permissionId = searchParams.get('permission_id');

    if (!resource || !action) {
      return NextResponse.json(
        { error: '必须提供resource和action参数' },
        { status: 400 }
      );
    }

    // 获取要删除的权限
    const { data: permission, error: getError } = await supabase
      .from('department_permissions')
      .select('*')
      .eq('department_id', departmentId)
      .eq('resource', resource)
      .eq('action', action)
      .single();

    if (getError || !permission) {
      return NextResponse.json({ error: '权限不存在' }, { status: 404 });
    }

    // 删除权限
    const { error: deleteError } = await supabase
      .from('department_permissions')
      .delete()
      .eq('id', permission.id);

    if (deleteError) {
      throw deleteError;
    }

    // 记录变更历史
    await logPermissionChange(
      'department',
      departmentId,
      resource,
      action,
      permission.granted,
      false,
      'delete',
      admin.id,
      '删除权限配置',
      request
    );

    return NextResponse.json({
      success: true,
      message: '权限删除成功'
    });

  } catch (error) {
    console.error('删除部门权限失败:', error);
    return NextResponse.json(
      { error: '删除部门权限失败' },
      { status: 500 }
    );
  }
}