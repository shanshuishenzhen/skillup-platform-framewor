/**
 * 权限冲突检测和管理API接口
 * 提供权限冲突的检测、查询、解决等功能
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/middleware/departmentAuth';

/**
 * 权限冲突类型
 */
type ConflictType = 'inheritance' | 'override' | 'priority' | 'condition';

/**
 * 权限冲突严重程度
 */
type ConflictSeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * 权限冲突解决策略
 */
type ResolutionStrategy = 'keep_parent' | 'keep_child' | 'merge' | 'manual' | 'priority_based';

/**
 * 权限信息接口
 */
interface Permission {
  id: string;
  resource: string;
  action: string;
  granted: boolean;
  inherit_from_parent: boolean;
  override_children: boolean;
  priority: number;
  source: 'direct' | 'inherited';
  inherited_from?: string;
  conditions?: Record<string, any>;
  department_id: string;
}

/**
 * 权限冲突接口
 */
interface PermissionConflict {
  id: string;
  type: ConflictType;
  severity: ConflictSeverity;
  resource: string;
  action: string;
  department_id: string;
  department_name: string;
  parent_department_id?: string;
  parent_department_name?: string;
  conflicting_permissions: Permission[];
  description: string;
  suggested_resolution: ResolutionStrategy;
  auto_resolvable: boolean;
  created_at: string;
  resolved: boolean;
  resolved_at?: string;
  resolved_by?: string;
  resolution_notes?: string;
}

/**
 * GET /api/admin/permissions/conflicts
 * 获取权限冲突列表
 */
export async function GET(request: NextRequest) {
  try {
    // 验证管理员权限
    const authResult = await requireAdmin(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    
    const { user } = authResult;
    const { searchParams } = new URL(request.url);
    
    // 获取查询参数
    const departmentId = searchParams.get('department_id');
    const severity = searchParams.get('severity') as ConflictSeverity | null;
    const type = searchParams.get('type') as ConflictType | null;
    const resolved = searchParams.get('resolved');
    const autoResolvable = searchParams.get('auto_resolvable');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;
    
    const supabase = createClient();
    
    // 检测权限冲突
    const conflicts = await detectPermissionConflicts(supabase, {
      departmentId,
      severity,
      type,
      resolved: resolved ? resolved === 'true' : undefined,
      autoResolvable: autoResolvable ? autoResolvable === 'true' : undefined
    });
    
    // 分页处理
    const total = conflicts.length;
    const paginatedConflicts = conflicts.slice(offset, offset + limit);
    
    // 获取统计信息
    const stats = {
      total: conflicts.length,
      unresolved: conflicts.filter(c => !c.resolved).length,
      resolved: conflicts.filter(c => c.resolved).length,
      auto_resolvable: conflicts.filter(c => c.auto_resolvable && !c.resolved).length,
      by_severity: {
        low: conflicts.filter(c => c.severity === 'low' && !c.resolved).length,
        medium: conflicts.filter(c => c.severity === 'medium' && !c.resolved).length,
        high: conflicts.filter(c => c.severity === 'high' && !c.resolved).length,
        critical: conflicts.filter(c => c.severity === 'critical' && !c.resolved).length
      },
      by_type: {
        inheritance: conflicts.filter(c => c.type === 'inheritance' && !c.resolved).length,
        override: conflicts.filter(c => c.type === 'override' && !c.resolved).length,
        priority: conflicts.filter(c => c.type === 'priority' && !c.resolved).length,
        condition: conflicts.filter(c => c.type === 'condition' && !c.resolved).length
      }
    };
    
    return NextResponse.json({
      success: true,
      data: {
        conflicts: paginatedConflicts,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        },
        stats
      }
    });
    
  } catch (error) {
    console.error('获取权限冲突失败:', error);
    return NextResponse.json(
      { success: false, error: '获取权限冲突失败' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/permissions/conflicts
 * 手动触发权限冲突检测
 */
export async function POST(request: NextRequest) {
  try {
    // 验证管理员权限
    const authResult = await requireAdmin(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    
    const { user } = authResult;
    const body = await request.json();
    const { department_id, force_recheck = false } = body;
    
    const supabase = createClient();
    
    // 执行冲突检测
    const conflicts = await detectPermissionConflicts(supabase, {
      departmentId: department_id,
      forceRecheck: force_recheck
    });
    
    // 记录检测操作
    await createAuditLog(supabase, {
      user_id: user.id,
      action: 'conflict_detection',
      resource: 'permissions',
      details: {
        department_id,
        conflicts_found: conflicts.length,
        force_recheck
      }
    });
    
    return NextResponse.json({
      success: true,
      data: {
        conflicts,
        detected_count: conflicts.length,
        message: `检测到 ${conflicts.length} 个权限冲突`
      }
    });
    
  } catch (error) {
    console.error('权限冲突检测失败:', error);
    return NextResponse.json(
      { success: false, error: '权限冲突检测失败' },
      { status: 500 }
    );
  }
}

/**
 * 检测权限冲突
 * @param supabase Supabase客户端
 * @param options 检测选项
 * @returns 权限冲突列表
 */
async function detectPermissionConflicts(
  supabase: any,
  options: {
    departmentId?: string | null;
    severity?: ConflictSeverity | null;
    type?: ConflictType | null;
    resolved?: boolean;
    autoResolvable?: boolean;
    forceRecheck?: boolean;
  } = {}
): Promise<PermissionConflict[]> {
  const conflicts: PermissionConflict[] = [];
  
  try {
    // 获取部门数据
    let departmentsQuery = supabase
      .from('departments')
      .select('*')
      .order('path');
    
    if (options.departmentId) {
      departmentsQuery = departmentsQuery.eq('id', options.departmentId);
    }
    
    const { data: departments, error: deptError } = await departmentsQuery;
    if (deptError) throw deptError;
    
    // 获取权限数据
    const { data: permissions, error: permError } = await supabase
      .from('department_permissions')
      .select(`
        *,
        department:departments(id, name, parent_id, path)
      `)
      .eq('active', true);
    
    if (permError) throw permError;
    
    // 按部门分组权限
    const permissionsByDept = new Map<string, any[]>();
    permissions.forEach((perm: any) => {
      const deptId = perm.department_id;
      if (!permissionsByDept.has(deptId)) {
        permissionsByDept.set(deptId, []);
      }
      permissionsByDept.get(deptId)!.push(perm);
    });
    
    // 检测各种类型的冲突
    for (const dept of departments) {
      const deptPermissions = permissionsByDept.get(dept.id) || [];
      
      // 1. 检测继承冲突
      const inheritanceConflicts = await detectInheritanceConflicts(
        supabase, dept, deptPermissions, departments
      );
      conflicts.push(...inheritanceConflicts);
      
      // 2. 检测覆盖冲突
      const overrideConflicts = await detectOverrideConflicts(
        supabase, dept, deptPermissions, departments
      );
      conflicts.push(...overrideConflicts);
      
      // 3. 检测优先级冲突
      const priorityConflicts = detectPriorityConflicts(deptPermissions);
      conflicts.push(...priorityConflicts);
      
      // 4. 检测条件冲突
      const conditionConflicts = detectConditionConflicts(deptPermissions);
      conflicts.push(...conditionConflicts);
    }
    
    // 应用筛选条件
    let filteredConflicts = conflicts;
    
    if (options.severity) {
      filteredConflicts = filteredConflicts.filter(c => c.severity === options.severity);
    }
    
    if (options.type) {
      filteredConflicts = filteredConflicts.filter(c => c.type === options.type);
    }
    
    if (options.resolved !== undefined) {
      filteredConflicts = filteredConflicts.filter(c => c.resolved === options.resolved);
    }
    
    if (options.autoResolvable !== undefined) {
      filteredConflicts = filteredConflicts.filter(c => c.auto_resolvable === options.autoResolvable);
    }
    
    return filteredConflicts;
    
  } catch (error) {
    console.error('检测权限冲突失败:', error);
    throw error;
  }
}

/**
 * 检测继承冲突
 */
async function detectInheritanceConflicts(
  supabase: any,
  department: any,
  permissions: any[],
  allDepartments: any[]
): Promise<PermissionConflict[]> {
  const conflicts: PermissionConflict[] = [];
  
  if (!department.parent_id) {
    return conflicts; // 根部门没有继承冲突
  }
  
  try {
    // 获取父部门权限
    const { data: parentPermissions, error } = await supabase
      .from('department_permissions')
      .select('*')
      .eq('department_id', department.parent_id)
      .eq('active', true);
    
    if (error) throw error;
    
    // 检查每个资源-操作组合
    const permissionMap = new Map<string, any[]>();
    
    // 添加当前部门权限
    permissions.forEach(perm => {
      const key = `${perm.resource}:${perm.action}`;
      if (!permissionMap.has(key)) {
        permissionMap.set(key, []);
      }
      permissionMap.get(key)!.push({ ...perm, source: 'direct' });
    });
    
    // 添加父部门权限（如果设置了继承）
    parentPermissions.forEach(perm => {
      if (perm.inherit_from_parent) {
        const key = `${perm.resource}:${perm.action}`;
        if (!permissionMap.has(key)) {
          permissionMap.set(key, []);
        }
        permissionMap.get(key)!.push({ ...perm, source: 'inherited', inherited_from: department.parent_id });
      }
    });
    
    // 检测冲突
    for (const [key, perms] of permissionMap) {
      if (perms.length > 1) {
        const [resource, action] = key.split(':');
        const grantedValues = new Set(perms.map(p => p.granted));
        
        if (grantedValues.size > 1) {
          // 存在冲突
          const parentDept = allDepartments.find(d => d.id === department.parent_id);
          
          conflicts.push({
            id: `inheritance_${department.id}_${key}_${Date.now()}`,
            type: 'inheritance',
            severity: determineSeverity(resource, action, perms),
            resource,
            action,
            department_id: department.id,
            department_name: department.name,
            parent_department_id: department.parent_id,
            parent_department_name: parentDept?.name,
            conflicting_permissions: perms,
            description: `部门 "${department.name}" 的权限 "${resource}:${action}" 与父部门 "${parentDept?.name}" 的继承权限存在冲突`,
            suggested_resolution: 'priority_based',
            auto_resolvable: true,
            created_at: new Date().toISOString(),
            resolved: false
          });
        }
      }
    }
    
  } catch (error) {
    console.error('检测继承冲突失败:', error);
  }
  
  return conflicts;
}

/**
 * 检测覆盖冲突
 */
async function detectOverrideConflicts(
  supabase: any,
  department: any,
  permissions: any[],
  allDepartments: any[]
): Promise<PermissionConflict[]> {
  const conflicts: PermissionConflict[] = [];
  
  try {
    // 获取子部门
    const childDepartments = allDepartments.filter(d => d.parent_id === department.id);
    
    for (const childDept of childDepartments) {
      // 获取子部门权限
      const { data: childPermissions, error } = await supabase
        .from('department_permissions')
        .select('*')
        .eq('department_id', childDept.id)
        .eq('active', true);
      
      if (error) continue;
      
      // 检查覆盖冲突
      for (const parentPerm of permissions) {
        if (parentPerm.override_children) {
          const conflictingChildPerms = childPermissions.filter((childPerm: any) => 
            childPerm.resource === parentPerm.resource &&
            childPerm.action === parentPerm.action &&
            childPerm.granted !== parentPerm.granted
          );
          
          if (conflictingChildPerms.length > 0) {
            conflicts.push({
              id: `override_${department.id}_${childDept.id}_${parentPerm.resource}_${parentPerm.action}_${Date.now()}`,
              type: 'override',
              severity: determineSeverity(parentPerm.resource, parentPerm.action, [parentPerm, ...conflictingChildPerms]),
              resource: parentPerm.resource,
              action: parentPerm.action,
              department_id: childDept.id,
              department_name: childDept.name,
              parent_department_id: department.id,
              parent_department_name: department.name,
              conflicting_permissions: [parentPerm, ...conflictingChildPerms],
              description: `父部门 "${department.name}" 设置了覆盖子部门的权限 "${parentPerm.resource}:${parentPerm.action}"，但子部门 "${childDept.name}" 有不同的配置`,
              suggested_resolution: 'keep_parent',
              auto_resolvable: true,
              created_at: new Date().toISOString(),
              resolved: false
            });
          }
        }
      }
    }
    
  } catch (error) {
    console.error('检测覆盖冲突失败:', error);
  }
  
  return conflicts;
}

/**
 * 检测优先级冲突
 */
function detectPriorityConflicts(permissions: any[]): PermissionConflict[] {
  const conflicts: PermissionConflict[] = [];
  
  // 按资源-操作分组
  const permissionGroups = new Map<string, any[]>();
  
  permissions.forEach(perm => {
    const key = `${perm.resource}:${perm.action}`;
    if (!permissionGroups.has(key)) {
      permissionGroups.set(key, []);
    }
    permissionGroups.get(key)!.push(perm);
  });
  
  // 检查每组权限的优先级
  for (const [key, perms] of permissionGroups) {
    if (perms.length > 1) {
      const [resource, action] = key.split(':');
      
      // 检查是否有相同优先级但不同授权状态的权限
      const priorityMap = new Map<number, any[]>();
      perms.forEach(perm => {
        if (!priorityMap.has(perm.priority)) {
          priorityMap.set(perm.priority, []);
        }
        priorityMap.get(perm.priority)!.push(perm);
      });
      
      for (const [priority, samePriorityPerms] of priorityMap) {
        if (samePriorityPerms.length > 1) {
          const grantedValues = new Set(samePriorityPerms.map(p => p.granted));
          if (grantedValues.size > 1) {
            conflicts.push({
              id: `priority_${perms[0].department_id}_${key}_${priority}_${Date.now()}`,
              type: 'priority',
              severity: 'medium',
              resource,
              action,
              department_id: perms[0].department_id,
              department_name: perms[0].department?.name || '',
              conflicting_permissions: samePriorityPerms,
              description: `权限 "${resource}:${action}" 存在相同优先级 (${priority}) 但不同授权状态的配置`,
              suggested_resolution: 'manual',
              auto_resolvable: false,
              created_at: new Date().toISOString(),
              resolved: false
            });
          }
        }
      }
    }
  }
  
  return conflicts;
}

/**
 * 检测条件冲突
 */
function detectConditionConflicts(permissions: any[]): PermissionConflict[] {
  const conflicts: PermissionConflict[] = [];
  
  // 按资源-操作分组
  const permissionGroups = new Map<string, any[]>();
  
  permissions.forEach(perm => {
    if (perm.conditions && Object.keys(perm.conditions).length > 0) {
      const key = `${perm.resource}:${perm.action}`;
      if (!permissionGroups.has(key)) {
        permissionGroups.set(key, []);
      }
      permissionGroups.get(key)!.push(perm);
    }
  });
  
  // 检查条件冲突
  for (const [key, perms] of permissionGroups) {
    if (perms.length > 1) {
      const [resource, action] = key.split(':');
      
      // 检查是否有重叠或冲突的条件
      for (let i = 0; i < perms.length; i++) {
        for (let j = i + 1; j < perms.length; j++) {
          const perm1 = perms[i];
          const perm2 = perms[j];
          
          if (hasConflictingConditions(perm1.conditions, perm2.conditions)) {
            conflicts.push({
              id: `condition_${perm1.department_id}_${key}_${i}_${j}_${Date.now()}`,
              type: 'condition',
              severity: 'low',
              resource,
              action,
              department_id: perm1.department_id,
              department_name: perm1.department?.name || '',
              conflicting_permissions: [perm1, perm2],
              description: `权限 "${resource}:${action}" 存在冲突的条件配置`,
              suggested_resolution: 'manual',
              auto_resolvable: false,
              created_at: new Date().toISOString(),
              resolved: false
            });
          }
        }
      }
    }
  }
  
  return conflicts;
}

/**
 * 判断冲突严重程度
 */
function determineSeverity(resource: string, action: string, permissions: any[]): ConflictSeverity {
  // 关键资源的冲突更严重
  const criticalResources = ['users', 'departments', 'roles', 'permissions'];
  const criticalActions = ['create', 'delete', 'manage'];
  
  if (criticalResources.includes(resource) && criticalActions.includes(action)) {
    return 'critical';
  }
  
  if (criticalResources.includes(resource) || criticalActions.includes(action)) {
    return 'high';
  }
  
  // 根据权限数量判断
  if (permissions.length > 3) {
    return 'medium';
  }
  
  return 'low';
}

/**
 * 检查条件是否冲突
 */
function hasConflictingConditions(conditions1: Record<string, any>, conditions2: Record<string, any>): boolean {
  // 简单的条件冲突检测逻辑
  // 实际实现可能需要更复杂的逻辑
  
  for (const key in conditions1) {
    if (key in conditions2) {
      const value1 = conditions1[key];
      const value2 = conditions2[key];
      
      // 如果是数组，检查是否有交集
      if (Array.isArray(value1) && Array.isArray(value2)) {
        const intersection = value1.filter(v => value2.includes(v));
        if (intersection.length === 0) {
          return true; // 没有交集，可能冲突
        }
      } else if (value1 !== value2) {
        return true; // 值不同，可能冲突
      }
    }
  }
  
  return false;
}

/**
 * 创建审计日志
 */
async function createAuditLog(
  supabase: any,
  logData: {
    user_id: string;
    action: string;
    resource: string;
    details: Record<string, any>;
  }
) {
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