/**
 * 基于部门的数据访问控制中间件
 * 提供部门级别的数据访问权限验证和过滤功能
 */

import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyToken } from './auth';

// 初始化 Supabase 客户端
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 数据访问级别枚举
export enum DataAccessLevel {
  NONE = 'none',           // 无访问权限
  OWN = 'own',             // 仅自己的数据
  DEPARTMENT = 'department', // 本部门数据
  SUB_DEPARTMENTS = 'sub_departments', // 本部门及子部门数据
  ALL_DEPARTMENTS = 'all_departments'  // 所有部门数据
}

// 数据访问权限接口
interface DataAccessPermission {
  resource: string;
  access_level: DataAccessLevel;
  conditions?: Record<string, any>;
  inherited_from?: string;
  priority: number;
}

// 部门访问控制结果接口
interface DepartmentAccessResult {
  success: boolean;
  user: any;
  userDepartments: string[];
  accessibleDepartments: string[];
  dataFilters: Record<string, any>;
  error?: string;
  status?: number;
}

/**
 * 验证用户的部门访问权限
 * @param request - HTTP请求对象
 * @param resource - 要访问的资源名称
 * @param operation - 操作类型（read, write, delete等）
 * @returns 部门访问控制结果
 */
export async function verifyDepartmentAccess(
  request: NextRequest,
  resource: string,
  operation: string = 'read'
): Promise<DepartmentAccessResult> {
  try {
    // 验证用户身份
    const authResult = await verifyToken(request);
    if (!authResult.success) {
      return {
        success: false,
        user: null,
        userDepartments: [],
        accessibleDepartments: [],
        dataFilters: {},
        error: authResult.error,
        status: authResult.status
      };
    }

    const user = authResult.user;

    // 获取用户的部门信息
    const { data: userDepartments, error: deptError } = await supabase
      .from('user_departments')
      .select(`
        department_id,
        role,
        department:departments(
          id,
          name,
          parent_id,
          level,
          path
        )
      `)
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (deptError) {
      throw new Error(`获取用户部门信息失败: ${deptError.message}`);
    }

    const userDeptIds = userDepartments?.map(ud => ud.department_id) || [];

    // 获取用户对指定资源的数据访问权限
    const accessPermissions = await getUserDataAccessPermissions(
      user.id,
      userDeptIds,
      resource,
      operation
    );

    // 计算可访问的部门列表
    const accessibleDepartments = await calculateAccessibleDepartments(
      userDeptIds,
      accessPermissions
    );

    // 生成数据过滤条件
    const dataFilters = generateDataFilters(
      user.id,
      userDeptIds,
      accessibleDepartments,
      accessPermissions
    );

    return {
      success: true,
      user,
      userDepartments: userDeptIds,
      accessibleDepartments,
      dataFilters
    };

  } catch (error) {
    console.error('部门访问控制验证失败:', error);
    return {
      success: false,
      user: null,
      userDepartments: [],
      accessibleDepartments: [],
      dataFilters: {},
      error: error instanceof Error ? error.message : '服务器内部错误',
      status: 500
    };
  }
}

/**
 * 获取用户的数据访问权限
 * @param userId - 用户ID
 * @param userDepartments - 用户所属部门ID列表
 * @param resource - 资源名称
 * @param operation - 操作类型
 * @returns 数据访问权限列表
 */
async function getUserDataAccessPermissions(
  userId: string,
  userDepartments: string[],
  resource: string,
  operation: string
): Promise<DataAccessPermission[]> {
  const permissions: DataAccessPermission[] = [];

  // 获取直接分配的权限
  const { data: directPermissions, error: directError } = await supabase
    .from('user_permissions')
    .select(`
      permission:permissions(
        id,
        name,
        resource,
        action,
        data_access_level,
        conditions
      )
    `)
    .eq('user_id', userId)
    .eq('granted', true)
    .eq('permissions.resource', resource)
    .eq('permissions.action', operation);

  if (!directError && directPermissions) {
    permissions.push(...directPermissions.map(dp => ({
      resource: dp.permission.resource,
      access_level: dp.permission.data_access_level as DataAccessLevel,
      conditions: dp.permission.conditions,
      priority: 100 // 直接权限优先级最高
    })));
  }

  // 获取通过部门继承的权限
  if (userDepartments.length > 0) {
    const { data: inheritedPermissions, error: inheritedError } = await supabase
      .from('department_permissions')
      .select(`
        department_id,
        granted,
        conditions,
        priority,
        permission:permissions(
          id,
          name,
          resource,
          action,
          data_access_level,
          conditions
        ),
        department:departments(
          id,
          name,
          level
        )
      `)
      .in('department_id', userDepartments)
      .eq('granted', true)
      .eq('permissions.resource', resource)
      .eq('permissions.action', operation)
      .order('priority', { ascending: false });

    if (!inheritedError && inheritedPermissions) {
      permissions.push(...inheritedPermissions.map(ip => ({
        resource: ip.permission.resource,
        access_level: ip.permission.data_access_level as DataAccessLevel,
        conditions: { ...ip.permission.conditions, ...ip.conditions },
        inherited_from: ip.department_id,
        priority: ip.priority || 50
      })));
    }
  }

  // 按优先级排序，优先级高的在前
  return permissions.sort((a, b) => b.priority - a.priority);
}

/**
 * 计算用户可访问的部门列表
 * @param userDepartments - 用户所属部门ID列表
 * @param permissions - 数据访问权限列表
 * @returns 可访问的部门ID列表
 */
async function calculateAccessibleDepartments(
  userDepartments: string[],
  permissions: DataAccessPermission[]
): Promise<string[]> {
  const accessibleDepts = new Set<string>();

  // 根据权限级别计算可访问部门
  for (const permission of permissions) {
    switch (permission.access_level) {
      case DataAccessLevel.ALL_DEPARTMENTS:
        // 获取所有部门
        const { data: allDepts } = await supabase
          .from('departments')
          .select('id')
          .eq('is_active', true);
        allDepts?.forEach(dept => accessibleDepts.add(dept.id));
        break;

      case DataAccessLevel.SUB_DEPARTMENTS:
        // 获取用户部门及其所有子部门
        for (const deptId of userDepartments) {
          accessibleDepts.add(deptId);
          const subDepts = await getSubDepartments(deptId);
          subDepts.forEach(subDept => accessibleDepts.add(subDept));
        }
        break;

      case DataAccessLevel.DEPARTMENT:
        // 仅用户所属部门
        userDepartments.forEach(deptId => accessibleDepts.add(deptId));
        break;

      case DataAccessLevel.OWN:
        // 不添加部门，仅个人数据
        break;

      case DataAccessLevel.NONE:
      default:
        // 无访问权限
        break;
    }
  }

  return Array.from(accessibleDepts);
}

/**
 * 获取指定部门的所有子部门
 * @param departmentId - 部门ID
 * @returns 子部门ID列表
 */
async function getSubDepartments(departmentId: string): Promise<string[]> {
  const { data: subDepts, error } = await supabase
    .from('departments')
    .select('id')
    .like('path', `%.${departmentId}.%`)
    .eq('is_active', true);

  if (error) {
    console.error('获取子部门失败:', error);
    return [];
  }

  return subDepts?.map(dept => dept.id) || [];
}

/**
 * 生成数据过滤条件
 * @param userId - 用户ID
 * @param userDepartments - 用户所属部门ID列表
 * @param accessibleDepartments - 可访问的部门ID列表
 * @param permissions - 数据访问权限列表
 * @returns 数据过滤条件对象
 */
function generateDataFilters(
  userId: string,
  userDepartments: string[],
  accessibleDepartments: string[],
  permissions: DataAccessPermission[]
): Record<string, any> {
  const filters: Record<string, any> = {};

  // 获取最高优先级的权限
  const topPermission = permissions[0];
  if (!topPermission) {
    // 无权限时，只能访问自己的数据
    return {
      user_id: userId,
      _access_level: DataAccessLevel.OWN
    };
  }

  switch (topPermission.access_level) {
    case DataAccessLevel.ALL_DEPARTMENTS:
      // 可访问所有部门数据，无需过滤
      filters._access_level = DataAccessLevel.ALL_DEPARTMENTS;
      break;

    case DataAccessLevel.SUB_DEPARTMENTS:
    case DataAccessLevel.DEPARTMENT:
      // 按部门过滤
      if (accessibleDepartments.length > 0) {
        filters.department_id = accessibleDepartments;
        filters._access_level = topPermission.access_level;
      } else {
        // 无可访问部门时，只能访问自己的数据
        filters.user_id = userId;
        filters._access_level = DataAccessLevel.OWN;
      }
      break;

    case DataAccessLevel.OWN:
      // 仅自己的数据
      filters.user_id = userId;
      filters._access_level = DataAccessLevel.OWN;
      break;

    case DataAccessLevel.NONE:
    default:
      // 无访问权限
      filters._no_access = true;
      filters._access_level = DataAccessLevel.NONE;
      break;
  }

  // 应用额外的条件过滤
  if (topPermission.conditions) {
    Object.assign(filters, topPermission.conditions);
  }

  return filters;
}

/**
 * 应用数据过滤条件到Supabase查询
 * @param query - Supabase查询对象
 * @param filters - 数据过滤条件
 * @returns 应用过滤条件后的查询对象
 */
export function applyDataFilters(query: any, filters: Record<string, any>): any {
  let filteredQuery = query;

  // 如果明确标记为无访问权限，返回空结果
  if (filters._no_access) {
    return filteredQuery.eq('id', 'impossible-id-to-match-nothing');
  }

  // 应用用户ID过滤
  if (filters.user_id) {
    filteredQuery = filteredQuery.eq('user_id', filters.user_id);
  }

  // 应用部门ID过滤
  if (filters.department_id) {
    if (Array.isArray(filters.department_id)) {
      filteredQuery = filteredQuery.in('department_id', filters.department_id);
    } else {
      filteredQuery = filteredQuery.eq('department_id', filters.department_id);
    }
  }

  // 应用其他自定义过滤条件
  Object.entries(filters).forEach(([key, value]) => {
    if (!key.startsWith('_') && key !== 'user_id' && key !== 'department_id') {
      if (Array.isArray(value)) {
        filteredQuery = filteredQuery.in(key, value);
      } else {
        filteredQuery = filteredQuery.eq(key, value);
      }
    }
  });

  return filteredQuery;
}

/**
 * 检查用户是否有权限访问特定部门的数据
 * @param request - HTTP请求对象
 * @param targetDepartmentId - 目标部门ID
 * @param resource - 资源名称
 * @param operation - 操作类型
 * @returns 是否有权限访问
 */
export async function canAccessDepartmentData(
  request: NextRequest,
  targetDepartmentId: string,
  resource: string,
  operation: string = 'read'
): Promise<boolean> {
  const accessResult = await verifyDepartmentAccess(request, resource, operation);
  
  if (!accessResult.success) {
    return false;
  }

  // 检查目标部门是否在可访问部门列表中
  return accessResult.accessibleDepartments.includes(targetDepartmentId);
}

/**
 * 获取用户可访问的部门数据范围
 * @param request - HTTP请求对象
 * @param resource - 资源名称
 * @param operation - 操作类型
 * @returns 可访问的部门ID列表
 */
export async function getUserAccessibleDepartments(
  request: NextRequest,
  resource: string,
  operation: string = 'read'
): Promise<string[]> {
  const accessResult = await verifyDepartmentAccess(request, resource, operation);
  
  if (!accessResult.success) {
    return [];
  }

  return accessResult.accessibleDepartments;
}