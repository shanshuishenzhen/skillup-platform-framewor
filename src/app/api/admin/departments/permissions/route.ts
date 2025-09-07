/**
 * 部门权限管理 API 路由
 * 处理部门权限的创建、查询、更新和删除操作
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requirePermission } from '@/middleware/departmentAuth';

// 初始化 Supabase 客户端
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * 部门权限接口
 */
interface DepartmentPermission {
  id?: string;
  department_id: string;
  resource: string;
  action: string;
  granted: boolean;
  inherit_from_parent?: boolean;
  override_children?: boolean;
  conditions?: Record<string, any>;
  priority?: number;
  expires_at?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * 获取部门权限列表
 * GET /api/admin/departments/permissions
 */
export async function GET(request: NextRequest) {
  try {
    // 权限验证
    const authResult = await requirePermission('departments', 'view')(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    
    const { searchParams } = new URL(request.url);
    const departmentId = searchParams.get('department_id');
    const includeInherited = searchParams.get('include_inherited') === 'true';
    const resource = searchParams.get('resource');
    const action = searchParams.get('action');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;
    
    if (!departmentId) {
      return NextResponse.json({
        success: false,
        error: '部门ID不能为空'
      }, { status: 400 });
    }
    
    // 构建查询条件
    let query = supabase
      .from('department_permissions')
      .select(`
        *,
        department:departments(id, name, path),
        created_by_user:profiles!department_permissions_created_by_fkey(id, username, full_name)
      `);
    
    // 如果包含继承权限，需要获取父级部门的权限
    if (includeInherited) {
      // 获取部门路径
      const { data: department } = await supabase
        .from('departments')
        .select('path')
        .eq('id', departmentId)
        .single();
      
      if (department?.path) {
        // 获取所有父级部门ID
        const parentIds = department.path.split('.').filter(id => id !== departmentId);
        
        if (parentIds.length > 0) {
          query = query.or(`department_id.eq.${departmentId},department_id.in.(${parentIds.join(',')})`);
        } else {
          query = query.eq('department_id', departmentId);
        }
      } else {
        query = query.eq('department_id', departmentId);
      }
    } else {
      query = query.eq('department_id', departmentId);
    }
    
    // 添加筛选条件
    if (resource) {
      query = query.eq('resource', resource);
    }
    if (action) {
      query = query.eq('action', action);
    }
    
    // 获取总数
    const { count } = await query.select('*', { count: 'exact', head: true });
    
    // 获取分页数据
    const { data: permissions, error } = await query
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (error) {
      console.error('获取部门权限失败:', error);
      return NextResponse.json({
        success: false,
        error: '获取部门权限失败'
      }, { status: 500 });
    }
    
    // 如果包含继承权限，需要处理权限继承逻辑
    let processedPermissions = permissions || [];
    
    if (includeInherited) {
      processedPermissions = await processInheritedPermissions(permissions || [], departmentId);
    }
    
    return NextResponse.json({
      success: true,
      data: {
        permissions: processedPermissions,
        pagination: {
          page,
          limit,
          total: count || 0,
          pages: Math.ceil((count || 0) / limit)
        }
      }
    });
    
  } catch (error) {
    console.error('获取部门权限失败:', error);
    return NextResponse.json({
      success: false,
      error: '获取部门权限失败'
    }, { status: 500 });
  }
}

/**
 * 创建或更新部门权限
 * POST /api/admin/departments/permissions
 */
export async function POST(request: NextRequest) {
  try {
    // 权限验证
    const authResult = await requirePermission('departments', 'manage')(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    
    const body = await request.json();
    const {
      id,
      department_id,
      resource,
      action,
      granted,
      inherit_from_parent = true,
      override_children = false,
      conditions,
      priority = 0,
      expires_at
    } = body;
    
    // 验证必填字段
    if (!department_id || !resource || !action || typeof granted !== 'boolean') {
      return NextResponse.json({
        success: false,
        error: '缺少必填字段：department_id, resource, action, granted'
      }, { status: 400 });
    }
    
    // 验证部门是否存在
    const { data: department, error: deptError } = await supabase
      .from('departments')
      .select('id, name')
      .eq('id', department_id)
      .single();
    
    if (deptError || !department) {
      return NextResponse.json({
        success: false,
        error: '部门不存在'
      }, { status: 404 });
    }
    
    const now = new Date().toISOString();
    const userId = authResult.user.id;
    
    let result;
    
    if (id) {
      // 更新现有权限
      const { data, error } = await supabase
        .from('department_permissions')
        .update({
          resource,
          action,
          granted,
          inherit_from_parent,
          override_children,
          conditions,
          priority,
          expires_at,
          updated_at: now
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        console.error('更新部门权限失败:', error);
        return NextResponse.json({
          success: false,
          error: '更新部门权限失败'
        }, { status: 500 });
      }
      
      result = data;
      
      // 记录审计日志
      await createAuditLog({
        user_id: userId,
        department_id,
        resource,
        action,
        change_type: 'update',
        new_value: { granted, inherit_from_parent, override_children, conditions, priority, expires_at },
        reason: '更新部门权限',
        changed_by: userId
      });
      
    } else {
      // 检查是否已存在相同的权限
      const { data: existing } = await supabase
        .from('department_permissions')
        .select('id')
        .eq('department_id', department_id)
        .eq('resource', resource)
        .eq('action', action)
        .single();
      
      if (existing) {
        return NextResponse.json({
          success: false,
          error: '该部门已存在相同的权限配置'
        }, { status: 409 });
      }
      
      // 创建新权限
      const { data, error } = await supabase
        .from('department_permissions')
        .insert({
          department_id,
          resource,
          action,
          granted,
          inherit_from_parent,
          override_children,
          conditions,
          priority,
          expires_at,
          created_by: userId,
          created_at: now,
          updated_at: now
        })
        .select()
        .single();
      
      if (error) {
        console.error('创建部门权限失败:', error);
        return NextResponse.json({
          success: false,
          error: '创建部门权限失败'
        }, { status: 500 });
      }
      
      result = data;
      
      // 记录审计日志
      await createAuditLog({
        user_id: userId,
        department_id,
        resource,
        action,
        change_type: 'create',
        new_value: { granted, inherit_from_parent, override_children, conditions, priority, expires_at },
        reason: '创建部门权限',
        changed_by: userId
      });
    }
    
    // 如果设置了覆盖子部门，需要更新子部门的权限
    if (override_children) {
      await updateChildDepartmentPermissions(department_id, resource, action, {
        granted,
        conditions,
        priority,
        expires_at
      });
    }
    
    return NextResponse.json({
      success: true,
      data: {
        permission: result,
        message: id ? '部门权限更新成功' : '部门权限创建成功'
      }
    });
    
  } catch (error) {
    console.error('处理部门权限失败:', error);
    return NextResponse.json({
      success: false,
      error: '处理部门权限失败'
    }, { status: 500 });
  }
}

/**
 * 批量操作部门权限
 * PUT /api/admin/departments/permissions
 */
export async function PUT(request: NextRequest) {
  try {
    // 权限验证
    const authResult = await requirePermission('departments', 'manage')(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    
    const body = await request.json();
    const { action, permission_ids, department_id, permissions } = body;
    
    if (!action) {
      return NextResponse.json({
        success: false,
        error: '操作类型不能为空'
      }, { status: 400 });
    }
    
    const userId = authResult.user.id;
    let result;
    
    switch (action) {
      case 'delete':
        if (!permission_ids || !Array.isArray(permission_ids)) {
          return NextResponse.json({
            success: false,
            error: '权限ID列表不能为空'
          }, { status: 400 });
        }
        
        // 获取要删除的权限信息（用于审计日志）
        const { data: permissionsToDelete } = await supabase
          .from('department_permissions')
          .select('*')
          .in('id', permission_ids);
        
        // 批量删除权限
        const { error: deleteError } = await supabase
          .from('department_permissions')
          .delete()
          .in('id', permission_ids);
        
        if (deleteError) {
          console.error('批量删除部门权限失败:', deleteError);
          return NextResponse.json({
            success: false,
            error: '批量删除部门权限失败'
          }, { status: 500 });
        }
        
        // 记录审计日志
        if (permissionsToDelete) {
          for (const permission of permissionsToDelete) {
            await createAuditLog({
              user_id: userId,
              department_id: permission.department_id,
              resource: permission.resource,
              action: permission.action,
              change_type: 'delete',
              old_value: {
                granted: permission.granted,
                inherit_from_parent: permission.inherit_from_parent,
                override_children: permission.override_children,
                conditions: permission.conditions,
                priority: permission.priority,
                expires_at: permission.expires_at
              },
              reason: '批量删除部门权限',
              changed_by: userId
            });
          }
        }
        
        result = {
          deleted_count: permission_ids.length,
          message: `成功删除 ${permission_ids.length} 个权限`
        };
        break;
        
      case 'batch_create':
        if (!permissions || !Array.isArray(permissions)) {
          return NextResponse.json({
            success: false,
            error: '权限列表不能为空'
          }, { status: 400 });
        }
        
        const now = new Date().toISOString();
        const permissionsToCreate = permissions.map(p => ({
          ...p,
          created_by: userId,
          created_at: now,
          updated_at: now
        }));
        
        const { data: createdPermissions, error: createError } = await supabase
          .from('department_permissions')
          .insert(permissionsToCreate)
          .select();
        
        if (createError) {
          console.error('批量创建部门权限失败:', createError);
          return NextResponse.json({
            success: false,
            error: '批量创建部门权限失败'
          }, { status: 500 });
        }
        
        // 记录审计日志
        if (createdPermissions) {
          for (const permission of createdPermissions) {
            await createAuditLog({
              user_id: userId,
              department_id: permission.department_id,
              resource: permission.resource,
              action: permission.action,
              change_type: 'create',
              new_value: {
                granted: permission.granted,
                inherit_from_parent: permission.inherit_from_parent,
                override_children: permission.override_children,
                conditions: permission.conditions,
                priority: permission.priority,
                expires_at: permission.expires_at
              },
              reason: '批量创建部门权限',
              changed_by: userId
            });
          }
        }
        
        result = {
          created_permissions: createdPermissions,
          created_count: createdPermissions?.length || 0,
          message: `成功创建 ${createdPermissions?.length || 0} 个权限`
        };
        break;
        
      case 'copy_from_department':
        if (!department_id) {
          return NextResponse.json({
            success: false,
            error: '源部门ID不能为空'
          }, { status: 400 });
        }
        
        const targetDepartmentId = body.target_department_id;
        if (!targetDepartmentId) {
          return NextResponse.json({
            success: false,
            error: '目标部门ID不能为空'
          }, { status: 400 });
        }
        
        result = await copyDepartmentPermissions(department_id, targetDepartmentId, userId);
        break;
        
      default:
        return NextResponse.json({
          success: false,
          error: '不支持的操作类型'
        }, { status: 400 });
    }
    
    return NextResponse.json({
      success: true,
      data: result
    });
    
  } catch (error) {
    console.error('批量操作部门权限失败:', error);
    return NextResponse.json({
      success: false,
      error: '批量操作部门权限失败'
    }, { status: 500 });
  }
}

/**
 * 处理继承权限逻辑
 * @param permissions 权限列表
 * @param departmentId 当前部门ID
 * @returns 处理后的权限列表
 */
async function processInheritedPermissions(
  permissions: any[],
  departmentId: string
): Promise<any[]> {
  // 按部门分组权限
  const permissionsByDept = permissions.reduce((acc, permission) => {
    const deptId = permission.department_id;
    if (!acc[deptId]) {
      acc[deptId] = [];
    }
    acc[deptId].push(permission);
    return acc;
  }, {} as Record<string, any[]>);
  
  // 获取部门层级信息
  const { data: department } = await supabase
    .from('departments')
    .select('path')
    .eq('id', departmentId)
    .single();
  
  if (!department?.path) {
    return permissions;
  }
  
  const departmentPath = department.path.split('.');
  const result: any[] = [];
  const processedPermissions = new Set<string>();
  
  // 按层级处理权限（从当前部门到根部门）
  for (const deptId of departmentPath.reverse()) {
    const deptPermissions = permissionsByDept[deptId] || [];
    
    for (const permission of deptPermissions) {
      const key = `${permission.resource}:${permission.action}`;
      
      // 如果权限已被处理（被更高优先级的部门覆盖），跳过
      if (processedPermissions.has(key)) {
        continue;
      }
      
      // 标记权限来源
      permission.is_inherited = deptId !== departmentId;
      permission.inherited_from = deptId !== departmentId ? deptId : null;
      
      result.push(permission);
      processedPermissions.add(key);
    }
  }
  
  return result;
}

/**
 * 更新子部门权限
 * @param parentDepartmentId 父部门ID
 * @param resource 资源
 * @param action 操作
 * @param permissionData 权限数据
 */
async function updateChildDepartmentPermissions(
  parentDepartmentId: string,
  resource: string,
  action: string,
  permissionData: any
) {
  try {
    // 获取所有子部门
    const { data: childDepartments } = await supabase
      .from('departments')
      .select('id')
      .like('path', `%${parentDepartmentId}%`)
      .neq('id', parentDepartmentId);
    
    if (!childDepartments || childDepartments.length === 0) {
      return;
    }
    
    const childDepartmentIds = childDepartments.map(d => d.id);
    
    // 更新或创建子部门权限
    for (const childDeptId of childDepartmentIds) {
      // 检查是否已存在权限
      const { data: existingPermission } = await supabase
        .from('department_permissions')
        .select('id')
        .eq('department_id', childDeptId)
        .eq('resource', resource)
        .eq('action', action)
        .single();
      
      if (existingPermission) {
        // 更新现有权限
        await supabase
          .from('department_permissions')
          .update({
            granted: permissionData.granted,
            conditions: permissionData.conditions,
            priority: permissionData.priority,
            expires_at: permissionData.expires_at,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingPermission.id);
      } else {
        // 创建新权限
        await supabase
          .from('department_permissions')
          .insert({
            department_id: childDeptId,
            resource,
            action,
            granted: permissionData.granted,
            inherit_from_parent: true,
            override_children: false,
            conditions: permissionData.conditions,
            priority: permissionData.priority,
            expires_at: permissionData.expires_at,
            created_by: 'system',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
      }
    }
  } catch (error) {
    console.error('更新子部门权限失败:', error);
  }
}

/**
 * 复制部门权限
 * @param sourceDepartmentId 源部门ID
 * @param targetDepartmentId 目标部门ID
 * @param userId 操作用户ID
 * @returns 复制结果
 */
async function copyDepartmentPermissions(
  sourceDepartmentId: string,
  targetDepartmentId: string,
  userId: string
) {
  try {
    // 获取源部门的权限
    const { data: sourcePermissions, error } = await supabase
      .from('department_permissions')
      .select('resource, action, granted, inherit_from_parent, override_children, conditions, priority, expires_at')
      .eq('department_id', sourceDepartmentId);
    
    if (error) {
      throw new Error('获取源部门权限失败');
    }
    
    if (!sourcePermissions || sourcePermissions.length === 0) {
      return {
        copied_count: 0,
        message: '源部门没有权限可复制'
      };
    }
    
    const now = new Date().toISOString();
    const permissionsToCreate = sourcePermissions.map(p => ({
      ...p,
      department_id: targetDepartmentId,
      created_by: userId,
      created_at: now,
      updated_at: now
    }));
    
    // 批量创建权限
    const { data: createdPermissions, error: createError } = await supabase
      .from('department_permissions')
      .insert(permissionsToCreate)
      .select();
    
    if (createError) {
      throw new Error('创建目标部门权限失败');
    }
    
    // 记录审计日志
    if (createdPermissions) {
      for (const permission of createdPermissions) {
        await createAuditLog({
          user_id: userId,
          department_id: permission.department_id,
          resource: permission.resource,
          action: permission.action,
          change_type: 'create',
          new_value: {
            granted: permission.granted,
            inherit_from_parent: permission.inherit_from_parent,
            override_children: permission.override_children,
            conditions: permission.conditions,
            priority: permission.priority,
            expires_at: permission.expires_at
          },
          reason: `从部门 ${sourceDepartmentId} 复制权限`,
          changed_by: userId
        });
      }
    }
    
    return {
      copied_count: createdPermissions?.length || 0,
      created_permissions: createdPermissions,
      message: `成功复制 ${createdPermissions?.length || 0} 个权限`
    };
    
  } catch (error) {
    console.error('复制部门权限失败:', error);
    throw error;
  }
}

/**
 * 创建审计日志
 * @param logData 日志数据
 */
async function createAuditLog(logData: any) {
  try {
    await supabase
      .from('permission_audit_logs')
      .insert({
        ...logData,
        created_at: new Date().toISOString()
      });
  } catch (error) {
    console.error('创建审计日志失败:', error);
  }
}