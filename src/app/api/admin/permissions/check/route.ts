import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAdminAuth } from '@/lib/auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * 检查用户权限
 * @param request - HTTP请求对象
 * @returns 权限检查结果
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, resource, action, departmentId } = body;

    // 验证必填字段
    if (!userId || !resource || !action) {
      return NextResponse.json({ error: '缺少必填字段' }, { status: 400 });
    }

    // 检查用户权限
    const permissionResult = await checkUserPermission(userId, resource, action, departmentId);

    return NextResponse.json({
      hasPermission: permissionResult.hasPermission,
      source: permissionResult.source,
      details: permissionResult.details,
      effectivePermissions: permissionResult.effectivePermissions
    });
  } catch (error) {
    console.error('权限检查错误:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}

/**
 * 批量检查用户权限
 * @param request - HTTP请求对象
 * @returns 批量权限检查结果
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, permissions } = body;

    if (!userId || !permissions || !Array.isArray(permissions)) {
      return NextResponse.json({ error: '参数格式错误' }, { status: 400 });
    }

    const results = [];

    for (const perm of permissions) {
      const { resource, action, departmentId } = perm;
      const result = await checkUserPermission(userId, resource, action, departmentId);
      
      results.push({
        resource,
        action,
        departmentId,
        hasPermission: result.hasPermission,
        source: result.source
      });
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error('批量权限检查错误:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}

/**
 * 获取用户的所有有效权限
 * @param request - HTTP请求对象
 * @returns 用户权限列表
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const departmentId = searchParams.get('departmentId');
    const includeInherited = searchParams.get('includeInherited') === 'true';

    if (!userId) {
      return NextResponse.json({ error: '缺少用户ID' }, { status: 400 });
    }

    const effectivePermissions = await getUserEffectivePermissions(userId, departmentId, includeInherited);

    return NextResponse.json({ permissions: effectivePermissions });
  } catch (error) {
    console.error('获取用户权限错误:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}

/**
 * 检查用户权限的核心函数
 * @param userId - 用户ID
 * @param resource - 资源
 * @param action - 操作
 * @param departmentId - 部门ID（可选）
 * @returns 权限检查结果
 */
async function checkUserPermission(userId: string, resource: string, action: string, departmentId?: string) {
  try {
    const result = {
      hasPermission: false,
      source: 'none',
      details: {},
      effectivePermissions: []
    };

    // 1. 检查直接用户权限
    const { data: userPermissions } = await supabase
      .from('user_permissions')
      .select('*')
      .eq('user_id', userId)
      .eq('resource', resource)
      .eq('action', action)
      .eq('status', 'active')
      .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString());

    if (userPermissions && userPermissions.length > 0) {
      const directPermission = userPermissions.find(p => p.granted);
      if (directPermission) {
        result.hasPermission = true;
        result.source = 'direct';
        result.details = {
          permissionId: directPermission.id,
          sourceType: directPermission.source_type,
          conditions: directPermission.conditions
        };
        return result;
      }
    }

    // 2. 检查角色权限
    const rolePermissions = await checkRolePermissions(userId, resource, action);
    if (rolePermissions.hasPermission) {
      result.hasPermission = true;
      result.source = 'role';
      result.details = rolePermissions.details;
      return result;
    }

    // 3. 检查部门权限（包括继承）
    const departmentPermissions = await checkDepartmentPermissions(userId, resource, action, departmentId);
    if (departmentPermissions.hasPermission) {
      result.hasPermission = true;
      result.source = 'department';
      result.details = departmentPermissions.details;
      result.effectivePermissions = departmentPermissions.effectivePermissions;
      return result;
    }

    // 4. 检查系统默认权限
    const defaultPermissions = await checkDefaultPermissions(resource, action);
    if (defaultPermissions.hasPermission) {
      result.hasPermission = true;
      result.source = 'default';
      result.details = defaultPermissions.details;
      return result;
    }

    return result;
  } catch (error) {
    console.error('权限检查失败:', error);
    return {
      hasPermission: false,
      source: 'error',
      details: { error: error.message },
      effectivePermissions: []
    };
  }
}

/**
 * 检查角色权限
 * @param userId - 用户ID
 * @param resource - 资源
 * @param action - 操作
 * @returns 角色权限检查结果
 */
async function checkRolePermissions(userId: string, resource: string, action: string) {
  try {
    // 获取用户角色
    const { data: userRoles } = await supabase
      .from('user_roles')
      .select(`
        role_id,
        role:roles(id, name, permissions)
      `)
      .eq('user_id', userId)
      .eq('status', 'active');

    if (!userRoles || userRoles.length === 0) {
      return { hasPermission: false, details: {} };
    }

    for (const userRole of userRoles) {
      const role = userRole.role;
      if (role && role.permissions) {
        const rolePermissions = Array.isArray(role.permissions) ? role.permissions : [];
        const hasPermission = rolePermissions.some(p => 
          p.resource === resource && 
          p.action === action && 
          p.granted === true
        );

        if (hasPermission) {
          return {
            hasPermission: true,
            details: {
              roleId: role.id,
              roleName: role.name,
              permissions: rolePermissions
            }
          };
        }
      }
    }

    return { hasPermission: false, details: {} };
  } catch (error) {
    console.error('检查角色权限失败:', error);
    return { hasPermission: false, details: { error: error.message } };
  }
}

/**
 * 检查部门权限（包括继承）
 * @param userId - 用户ID
 * @param resource - 资源
 * @param action - 操作
 * @param departmentId - 指定部门ID
 * @returns 部门权限检查结果
 */
async function checkDepartmentPermissions(userId: string, resource: string, action: string, departmentId?: string) {
  try {
    // 获取用户所属部门
    let userDepartments = [];
    
    if (departmentId) {
      // 检查用户是否属于指定部门
      const { data: userDept } = await supabase
        .from('user_departments')
        .select(`
          department_id,
          department:departments(id, name, level, parent_id)
        `)
        .eq('user_id', userId)
        .eq('department_id', departmentId)
        .eq('status', 'active');
      
      userDepartments = userDept || [];
    } else {
      // 获取用户所有部门
      const { data: userDepts } = await supabase
        .from('user_departments')
        .select(`
          department_id,
          department:departments(id, name, level, parent_id)
        `)
        .eq('user_id', userId)
        .eq('status', 'active');
      
      userDepartments = userDepts || [];
    }

    if (userDepartments.length === 0) {
      return { hasPermission: false, details: {}, effectivePermissions: [] };
    }

    const effectivePermissions = [];

    for (const userDept of userDepartments) {
      const department = userDept.department;
      if (!department) continue;

      // 检查部门直接权限
      const { data: deptPermissions } = await supabase
        .from('department_permissions')
        .select('*')
        .eq('department_id', department.id)
        .eq('resource', resource)
        .eq('action', action)
        .eq('status', 'active');

      if (deptPermissions && deptPermissions.length > 0) {
        const directPermission = deptPermissions.find(p => p.granted);
        if (directPermission) {
          effectivePermissions.push({
            type: 'direct',
            departmentId: department.id,
            departmentName: department.name,
            permission: directPermission
          });
          
          return {
            hasPermission: true,
            details: {
              departmentId: department.id,
              departmentName: department.name,
              permissionType: 'direct',
              permission: directPermission
            },
            effectivePermissions
          };
        }
      }

      // 检查继承权限
      const inheritedPermissions = await getInheritedDepartmentPermissions(department.id, resource, action);
      if (inheritedPermissions.length > 0) {
        const grantedInherited = inheritedPermissions.find(p => p.granted);
        if (grantedInherited) {
          effectivePermissions.push({
            type: 'inherited',
            departmentId: department.id,
            departmentName: department.name,
            inheritedFrom: grantedInherited.inheritedFrom,
            permission: grantedInherited
          });
          
          return {
            hasPermission: true,
            details: {
              departmentId: department.id,
              departmentName: department.name,
              permissionType: 'inherited',
              inheritedFrom: grantedInherited.inheritedFrom,
              permission: grantedInherited
            },
            effectivePermissions
          };
        }
      }
    }

    return { hasPermission: false, details: {}, effectivePermissions };
  } catch (error) {
    console.error('检查部门权限失败:', error);
    return { hasPermission: false, details: { error: error.message }, effectivePermissions: [] };
  }
}

/**
 * 获取部门继承的权限
 * @param departmentId - 部门ID
 * @param resource - 资源
 * @param action - 操作
 * @returns 继承的权限列表
 */
async function getInheritedDepartmentPermissions(departmentId: string, resource: string, action: string) {
  try {
    const inheritedPermissions = [];
    
    // 获取部门信息
    const { data: department } = await supabase
      .from('departments')
      .select('parent_id, level')
      .eq('id', departmentId)
      .single();

    if (!department || !department.parent_id) {
      return [];
    }

    // 递归获取父级部门权限
    let currentParentId = department.parent_id;
    
    while (currentParentId) {
      const { data: parentPermissions } = await supabase
        .from('department_permissions')
        .select(`
          *,
          department:departments(id, name, level)
        `)
        .eq('department_id', currentParentId)
        .eq('resource', resource)
        .eq('action', action)
        .eq('status', 'active')
        .eq('inherit_from_parent', true);

      if (parentPermissions && parentPermissions.length > 0) {
        for (const perm of parentPermissions) {
          inheritedPermissions.push({
            ...perm,
            inheritedFrom: {
              departmentId: perm.department.id,
              departmentName: perm.department.name,
              level: perm.department.level
            }
          });
        }
      }

      // 获取下一个父级
      const { data: nextParent } = await supabase
        .from('departments')
        .select('parent_id')
        .eq('id', currentParentId)
        .single();

      currentParentId = nextParent?.parent_id;
    }

    return inheritedPermissions;
  } catch (error) {
    console.error('获取继承权限失败:', error);
    return [];
  }
}

/**
 * 检查系统默认权限
 * @param resource - 资源
 * @param action - 操作
 * @returns 默认权限检查结果
 */
async function checkDefaultPermissions(resource: string, action: string) {
  // 定义系统默认权限
  const defaultPermissions = {
    'users': {
      'read': false, // 默认不允许查看用户
    },
    'departments': {
      'read': true, // 默认允许查看部门结构
    },
    'reports': {
      'read': false, // 默认不允许查看报表
    }
  };

  const resourcePerms = defaultPermissions[resource];
  if (resourcePerms && typeof resourcePerms[action] === 'boolean') {
    return {
      hasPermission: resourcePerms[action],
      details: {
        type: 'system_default',
        resource,
        action,
        granted: resourcePerms[action]
      }
    };
  }

  return { hasPermission: false, details: {} };
}

/**
 * 获取用户的所有有效权限
 * @param userId - 用户ID
 * @param departmentId - 部门ID（可选）
 * @param includeInherited - 是否包含继承权限
 * @returns 用户权限列表
 */
async function getUserEffectivePermissions(userId: string, departmentId?: string, includeInherited: boolean = true) {
  try {
    const permissions = [];

    // 1. 获取直接用户权限
    const { data: userPermissions } = await supabase
      .from('user_permissions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString());

    if (userPermissions) {
      permissions.push(...userPermissions.map(p => ({
        ...p,
        source: 'direct',
        sourceType: 'user'
      })));
    }

    // 2. 获取角色权限
    const { data: userRoles } = await supabase
      .from('user_roles')
      .select(`
        role_id,
        role:roles(id, name, permissions)
      `)
      .eq('user_id', userId)
      .eq('status', 'active');

    if (userRoles) {
      for (const userRole of userRoles) {
        const role = userRole.role;
        if (role && role.permissions) {
          const rolePermissions = Array.isArray(role.permissions) ? role.permissions : [];
          permissions.push(...rolePermissions.map(p => ({
            ...p,
            source: 'role',
            sourceType: 'role',
            roleId: role.id,
            roleName: role.name
          })));
        }
      }
    }

    // 3. 获取部门权限
    let userDepartments = [];
    
    if (departmentId) {
      const { data: userDept } = await supabase
        .from('user_departments')
        .select(`
          department_id,
          department:departments(id, name, level, parent_id)
        `)
        .eq('user_id', userId)
        .eq('department_id', departmentId)
        .eq('status', 'active');
      
      userDepartments = userDept || [];
    } else {
      const { data: userDepts } = await supabase
        .from('user_departments')
        .select(`
          department_id,
          department:departments(id, name, level, parent_id)
        `)
        .eq('user_id', userId)
        .eq('status', 'active');
      
      userDepartments = userDepts || [];
    }

    for (const userDept of userDepartments) {
      const department = userDept.department;
      if (!department) continue;

      // 获取部门直接权限
      const { data: deptPermissions } = await supabase
        .from('department_permissions')
        .select('*')
        .eq('department_id', department.id)
        .eq('status', 'active');

      if (deptPermissions) {
        permissions.push(...deptPermissions.map(p => ({
          ...p,
          source: 'department',
          sourceType: 'department',
          departmentId: department.id,
          departmentName: department.name
        })));
      }

      // 获取继承权限
      if (includeInherited) {
        const inheritedPerms = await getAllInheritedPermissions(department.id);
        permissions.push(...inheritedPerms.map(p => ({
          ...p,
          source: 'inherited',
          sourceType: 'department',
          departmentId: department.id,
          departmentName: department.name,
          inheritedFrom: p.inheritedFrom
        })));
      }
    }

    // 去重和优先级处理
    const uniquePermissions = [];
    const permissionMap = new Map();

    for (const perm of permissions) {
      const key = `${perm.resource}:${perm.action}`;
      const existing = permissionMap.get(key);
      
      if (!existing || getPermissionPriority(perm.source) > getPermissionPriority(existing.source)) {
        permissionMap.set(key, perm);
      }
    }

    return Array.from(permissionMap.values());
  } catch (error) {
    console.error('获取用户有效权限失败:', error);
    return [];
  }
}

/**
 * 获取所有继承权限
 * @param departmentId - 部门ID
 * @returns 继承权限列表
 */
async function getAllInheritedPermissions(departmentId: string) {
  try {
    const inheritedPermissions = [];
    
    const { data: department } = await supabase
      .from('departments')
      .select('parent_id')
      .eq('id', departmentId)
      .single();

    if (!department || !department.parent_id) {
      return [];
    }

    let currentParentId = department.parent_id;
    
    while (currentParentId) {
      const { data: parentPermissions } = await supabase
        .from('department_permissions')
        .select(`
          *,
          department:departments(id, name, level)
        `)
        .eq('department_id', currentParentId)
        .eq('status', 'active')
        .eq('inherit_from_parent', true);

      if (parentPermissions) {
        inheritedPermissions.push(...parentPermissions.map(p => ({
          ...p,
          inheritedFrom: {
            departmentId: p.department.id,
            departmentName: p.department.name,
            level: p.department.level
          }
        })));
      }

      const { data: nextParent } = await supabase
        .from('departments')
        .select('parent_id')
        .eq('id', currentParentId)
        .single();

      currentParentId = nextParent?.parent_id;
    }

    return inheritedPermissions;
  } catch (error) {
    console.error('获取所有继承权限失败:', error);
    return [];
  }
}

/**
 * 获取权限来源的优先级
 * @param source - 权限来源
 * @returns 优先级数值（越大优先级越高）
 */
function getPermissionPriority(source: string): number {
  const priorities = {
    'direct': 4,      // 直接用户权限优先级最高
    'role': 3,        // 角色权限
    'department': 2,  // 部门权限
    'inherited': 1,   // 继承权限
    'default': 0      // 默认权限优先级最低
  };
  
  return priorities[source] || 0;
}