/**
 * 权限冲突解决API接口
 * 提供权限冲突的解决、自动解决等功能
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/middleware/departmentAuth';

/**
 * 权限冲突解决策略
 */
type ResolutionStrategy = 'keep_parent' | 'keep_child' | 'merge' | 'manual' | 'priority_based';

/**
 * 冲突解决方案接口
 */
interface ConflictResolution {
  conflict_id: string;
  strategy: ResolutionStrategy;
  target_permission: Partial<{
    granted: boolean;
    priority: number;
    conditions: Record<string, any>;
    inherit_from_parent: boolean;
    override_children: boolean;
  }>;
  notes: string;
  apply_to_children: boolean;
}

/**
 * POST /api/admin/permissions/conflicts/resolve
 * 解决单个权限冲突
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
    const { conflict_id, resolution }: { conflict_id: string; resolution: ConflictResolution } = body;
    
    if (!conflict_id || !resolution) {
      return NextResponse.json(
        { success: false, error: '缺少必要参数' },
        { status: 400 }
      );
    }
    
    const supabase = createClient();
    
    // 获取冲突详情
    const conflict = await getConflictById(supabase, conflict_id);
    if (!conflict) {
      return NextResponse.json(
        { success: false, error: '冲突不存在' },
        { status: 404 }
      );
    }
    
    if (conflict.resolved) {
      return NextResponse.json(
        { success: false, error: '冲突已经解决' },
        { status: 400 }
      );
    }
    
    // 执行冲突解决
    const result = await resolveConflict(supabase, conflict, resolution, user.id);
    
    // 记录解决操作
    await createResolutionLog(supabase, {
      conflict_id,
      user_id: user.id,
      strategy: resolution.strategy,
      notes: resolution.notes,
      result
    });
    
    return NextResponse.json({
      success: true,
      data: {
        conflict_id,
        resolution_result: result,
        message: '权限冲突已成功解决'
      }
    });
    
  } catch (error) {
    console.error('解决权限冲突失败:', error);
    return NextResponse.json(
      { success: false, error: '解决权限冲突失败' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/permissions/conflicts/resolve
 * 自动解决多个权限冲突
 */
export async function PUT(request: NextRequest) {
  try {
    // 验证管理员权限
    const authResult = await requireAdmin(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    
    const { user } = authResult;
    const body = await request.json();
    const { conflict_ids, strategy = 'priority_based' }: { 
      conflict_ids: string[];
      strategy?: ResolutionStrategy;
    } = body;
    
    if (!conflict_ids || conflict_ids.length === 0) {
      return NextResponse.json(
        { success: false, error: '缺少冲突ID列表' },
        { status: 400 }
      );
    }
    
    const supabase = createClient();
    
    const results = {
      resolved: 0,
      failed: 0,
      skipped: 0,
      details: [] as any[]
    };
    
    // 逐个解决冲突
    for (const conflictId of conflict_ids) {
      try {
        const conflict = await getConflictById(supabase, conflictId);
        
        if (!conflict) {
          results.skipped++;
          results.details.push({
            conflict_id: conflictId,
            status: 'skipped',
            reason: '冲突不存在'
          });
          continue;
        }
        
        if (conflict.resolved) {
          results.skipped++;
          results.details.push({
            conflict_id: conflictId,
            status: 'skipped',
            reason: '冲突已解决'
          });
          continue;
        }
        
        if (!conflict.auto_resolvable && strategy !== 'manual') {
          results.skipped++;
          results.details.push({
            conflict_id: conflictId,
            status: 'skipped',
            reason: '不支持自动解决'
          });
          continue;
        }
        
        // 生成自动解决方案
        const resolution = generateAutoResolution(conflict, strategy);
        
        // 执行解决
        const result = await resolveConflict(supabase, conflict, resolution, user.id);
        
        results.resolved++;
        results.details.push({
          conflict_id: conflictId,
          status: 'resolved',
          strategy: resolution.strategy,
          result
        });
        
        // 记录解决操作
        await createResolutionLog(supabase, {
          conflict_id: conflictId,
          user_id: user.id,
          strategy: resolution.strategy,
          notes: `自动解决 - ${strategy}`,
          result
        });
        
      } catch (error) {
        console.error(`解决冲突 ${conflictId} 失败:`, error);
        results.failed++;
        results.details.push({
          conflict_id: conflictId,
          status: 'failed',
          error: error instanceof Error ? error.message : '未知错误'
        });
      }
    }
    
    return NextResponse.json({
      success: true,
      data: {
        summary: {
          total: conflict_ids.length,
          resolved: results.resolved,
          failed: results.failed,
          skipped: results.skipped
        },
        details: results.details,
        message: `成功解决 ${results.resolved} 个冲突，跳过 ${results.skipped} 个，失败 ${results.failed} 个`
      }
    });
    
  } catch (error) {
    console.error('批量解决权限冲突失败:', error);
    return NextResponse.json(
      { success: false, error: '批量解决权限冲突失败' },
      { status: 500 }
    );
  }
}

/**
 * 根据ID获取冲突详情
 */
async function getConflictById(supabase: any, conflictId: string) {
  // 这里需要从实际的冲突存储中获取
  // 由于冲突是动态检测的，我们需要重新检测来获取最新状态
  
  try {
    // 解析冲突ID以获取相关信息
    const [type, departmentId, resource, action] = conflictId.split('_');
    
    if (!type || !departmentId || !resource || !action) {
      return null;
    }
    
    // 获取部门信息
    const { data: department, error: deptError } = await supabase
      .from('departments')
      .select('*')
      .eq('id', departmentId)
      .single();
    
    if (deptError || !department) {
      return null;
    }
    
    // 获取相关权限
    const { data: permissions, error: permError } = await supabase
      .from('department_permissions')
      .select('*')
      .eq('department_id', departmentId)
      .eq('resource', resource)
      .eq('action', action)
      .eq('active', true);
    
    if (permError) {
      return null;
    }
    
    // 构造冲突对象
    return {
      id: conflictId,
      type,
      resource,
      action,
      department_id: departmentId,
      department_name: department.name,
      conflicting_permissions: permissions,
      auto_resolvable: type === 'inheritance' || type === 'override',
      resolved: false
    };
    
  } catch (error) {
    console.error('获取冲突详情失败:', error);
    return null;
  }
}

/**
 * 解决权限冲突
 */
async function resolveConflict(
  supabase: any,
  conflict: any,
  resolution: ConflictResolution,
  userId: string
) {
  const { strategy, target_permission, apply_to_children } = resolution;
  
  try {
    const results = [];
    
    switch (strategy) {
      case 'keep_parent':
        // 保留父级权限，删除或修改子级权限
        results.push(await resolveKeepParent(supabase, conflict));
        break;
        
      case 'keep_child':
        // 保留子级权限，修改父级权限
        results.push(await resolveKeepChild(supabase, conflict));
        break;
        
      case 'merge':
        // 合并权限
        results.push(await resolveMerge(supabase, conflict));
        break;
        
      case 'priority_based':
        // 基于优先级解决
        results.push(await resolvePriorityBased(supabase, conflict));
        break;
        
      case 'manual':
        // 手动配置
        results.push(await resolveManual(supabase, conflict, target_permission));
        break;
        
      default:
        throw new Error(`不支持的解决策略: ${strategy}`);
    }
    
    // 如果需要应用到子部门
    if (apply_to_children) {
      const childResults = await applyToChildDepartments(
        supabase,
        conflict.department_id,
        conflict.resource,
        conflict.action,
        target_permission
      );
      results.push(...childResults);
    }
    
    // 标记冲突为已解决
    await markConflictResolved(supabase, conflict.id, userId, resolution.notes);
    
    return {
      strategy,
      affected_permissions: results.length,
      details: results
    };
    
  } catch (error) {
    console.error('执行冲突解决失败:', error);
    throw error;
  }
}

/**
 * 保留父级权限策略
 */
async function resolveKeepParent(supabase: any, conflict: any) {
  const parentPermissions = conflict.conflicting_permissions.filter(
    (p: any) => p.source === 'inherited'
  );
  
  if (parentPermissions.length === 0) {
    return { action: 'no_change', reason: '没有父级权限' };
  }
  
  const parentPerm = parentPermissions[0];
  
  // 更新或删除直接权限
  const { error } = await supabase
    .from('department_permissions')
    .update({
      granted: parentPerm.granted,
      priority: parentPerm.priority,
      updated_at: new Date().toISOString()
    })
    .eq('department_id', conflict.department_id)
    .eq('resource', conflict.resource)
    .eq('action', conflict.action)
    .neq('source', 'inherited');
  
  if (error) throw error;
  
  return {
    action: 'updated_to_parent',
    parent_granted: parentPerm.granted,
    parent_priority: parentPerm.priority
  };
}

/**
 * 保留子级权限策略
 */
async function resolveKeepChild(supabase: any, conflict: any) {
  const directPermissions = conflict.conflicting_permissions.filter(
    (p: any) => p.source === 'direct'
  );
  
  if (directPermissions.length === 0) {
    return { action: 'no_change', reason: '没有直接权限' };
  }
  
  const directPerm = directPermissions[0];
  
  // 设置不继承父级权限
  const { error } = await supabase
    .from('department_permissions')
    .update({
      inherit_from_parent: false,
      updated_at: new Date().toISOString()
    })
    .eq('id', directPerm.id);
  
  if (error) throw error;
  
  return {
    action: 'disabled_inheritance',
    child_granted: directPerm.granted,
    child_priority: directPerm.priority
  };
}

/**
 * 合并权限策略
 */
async function resolveMerge(supabase: any, conflict: any) {
  const permissions = conflict.conflicting_permissions;
  
  // 选择最宽松的权限（granted = true 优先）
  const hasGranted = permissions.some((p: any) => p.granted);
  const maxPriority = Math.max(...permissions.map((p: any) => p.priority));
  
  // 更新权限
  const { error } = await supabase
    .from('department_permissions')
    .update({
      granted: hasGranted,
      priority: maxPriority,
      updated_at: new Date().toISOString()
    })
    .eq('department_id', conflict.department_id)
    .eq('resource', conflict.resource)
    .eq('action', conflict.action);
  
  if (error) throw error;
  
  return {
    action: 'merged',
    final_granted: hasGranted,
    final_priority: maxPriority
  };
}

/**
 * 基于优先级解决策略
 */
async function resolvePriorityBased(supabase: any, conflict: any) {
  const permissions = conflict.conflicting_permissions;
  
  // 选择优先级最高的权限
  const highestPriorityPerm = permissions.reduce((prev: any, current: any) => 
    current.priority > prev.priority ? current : prev
  );
  
  // 删除其他权限，保留最高优先级的
  const { error } = await supabase
    .from('department_permissions')
    .delete()
    .eq('department_id', conflict.department_id)
    .eq('resource', conflict.resource)
    .eq('action', conflict.action)
    .neq('id', highestPriorityPerm.id);
  
  if (error) throw error;
  
  return {
    action: 'kept_highest_priority',
    kept_permission_id: highestPriorityPerm.id,
    kept_granted: highestPriorityPerm.granted,
    kept_priority: highestPriorityPerm.priority
  };
}

/**
 * 手动配置策略
 */
async function resolveManual(supabase: any, conflict: any, targetPermission: any) {
  // 更新权限配置
  const updateData: any = {
    updated_at: new Date().toISOString()
  };
  
  if (targetPermission.granted !== undefined) {
    updateData.granted = targetPermission.granted;
  }
  
  if (targetPermission.priority !== undefined) {
    updateData.priority = targetPermission.priority;
  }
  
  if (targetPermission.conditions !== undefined) {
    updateData.conditions = targetPermission.conditions;
  }
  
  if (targetPermission.inherit_from_parent !== undefined) {
    updateData.inherit_from_parent = targetPermission.inherit_from_parent;
  }
  
  if (targetPermission.override_children !== undefined) {
    updateData.override_children = targetPermission.override_children;
  }
  
  const { error } = await supabase
    .from('department_permissions')
    .update(updateData)
    .eq('department_id', conflict.department_id)
    .eq('resource', conflict.resource)
    .eq('action', conflict.action);
  
  if (error) throw error;
  
  return {
    action: 'manual_update',
    updates: updateData
  };
}

/**
 * 应用到子部门
 */
async function applyToChildDepartments(
  supabase: any,
  departmentId: string,
  resource: string,
  action: string,
  targetPermission: any
) {
  try {
    // 获取子部门
    const { data: childDepartments, error: childError } = await supabase
      .from('departments')
      .select('id, name')
      .eq('parent_id', departmentId);
    
    if (childError) throw childError;
    
    const results = [];
    
    for (const childDept of childDepartments) {
      // 检查子部门是否已有该权限
      const { data: existingPerms, error: checkError } = await supabase
        .from('department_permissions')
        .select('id')
        .eq('department_id', childDept.id)
        .eq('resource', resource)
        .eq('action', action)
        .eq('active', true);
      
      if (checkError) continue;
      
      if (existingPerms.length > 0) {
        // 更新现有权限
        const { error: updateError } = await supabase
          .from('department_permissions')
          .update({
            ...targetPermission,
            updated_at: new Date().toISOString()
          })
          .eq('department_id', childDept.id)
          .eq('resource', resource)
          .eq('action', action);
        
        if (!updateError) {
          results.push({
            department_id: childDept.id,
            department_name: childDept.name,
            action: 'updated'
          });
        }
      } else {
        // 创建新权限
        const { error: insertError } = await supabase
          .from('department_permissions')
          .insert({
            department_id: childDept.id,
            resource,
            action,
            ...targetPermission,
            active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        
        if (!insertError) {
          results.push({
            department_id: childDept.id,
            department_name: childDept.name,
            action: 'created'
          });
        }
      }
    }
    
    return results;
    
  } catch (error) {
    console.error('应用到子部门失败:', error);
    return [];
  }
}

/**
 * 生成自动解决方案
 */
function generateAutoResolution(conflict: any, strategy: ResolutionStrategy): ConflictResolution {
  return {
    conflict_id: conflict.id,
    strategy,
    target_permission: {},
    notes: `自动解决策略: ${strategy}`,
    apply_to_children: false
  };
}

/**
 * 标记冲突为已解决
 */
async function markConflictResolved(
  supabase: any,
  conflictId: string,
  userId: string,
  notes: string
) {
  // 由于冲突是动态检测的，这里可以记录到解决历史表
  try {
    await supabase
      .from('permission_conflict_resolutions')
      .insert({
        conflict_id: conflictId,
        resolved_by: userId,
        resolved_at: new Date().toISOString(),
        notes
      });
  } catch (error) {
    console.error('标记冲突已解决失败:', error);
  }
}

/**
 * 创建解决日志
 */
async function createResolutionLog(
  supabase: any,
  logData: {
    conflict_id: string;
    user_id: string;
    strategy: ResolutionStrategy;
    notes: string;
    result: any;
  }
) {
  try {
    await supabase
      .from('permission_audit_logs')
      .insert({
        user_id: logData.user_id,
        action: 'conflict_resolution',
        resource: 'permissions',
        details: {
          conflict_id: logData.conflict_id,
          strategy: logData.strategy,
          notes: logData.notes,
          result: logData.result
        },
        created_at: new Date().toISOString()
      });
  } catch (error) {
    console.error('创建解决日志失败:', error);
  }
}