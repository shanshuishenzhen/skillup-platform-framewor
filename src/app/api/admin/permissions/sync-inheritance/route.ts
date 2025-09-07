/**
 * 权限继承同步API接口
 * 提供手动触发权限继承同步的功能
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyToken } from '@/middleware/auth';

// 初始化 Supabase 客户端
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * 同步权限继承
 * @param request - HTTP请求对象
 * @returns 同步结果
 */
export async function POST(request: NextRequest) {
  try {
    // 验证用户身份和权限
    const authResult = await verifyToken(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    // 检查管理员权限
    const { data: userPermissions } = await supabase
      .from('user_permissions')
      .select('permission:permissions(name)')
      .eq('user_id', authResult.user.id)
      .eq('granted', true);

    const hasAdminPermission = userPermissions?.some(
      up => up.permission.name === 'admin.permissions.manage'
    );

    if (!hasAdminPermission) {
      return NextResponse.json(
        { error: '权限不足' },
        { status: 403 }
      );
    }

    // 执行权限继承同步
    const result = await syncPermissionInheritance(authResult.user.id, request);

    return NextResponse.json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error('权限继承同步失败:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

/**
 * 执行权限继承同步
 * @param operatorId - 操作者ID
 * @param request - HTTP请求对象
 * @returns 同步结果
 */
async function syncPermissionInheritance(operatorId: string, request: NextRequest) {
  const startTime = new Date();
  let processedCount = 0;
  let errorCount = 0;
  const errors: string[] = [];

  try {
    // 获取所有活跃部门，按层级排序
    const { data: departments, error: deptError } = await supabase
      .from('departments')
      .select('id, name, parent_id, level, path')
      .eq('is_active', true)
      .order('level', { ascending: true });

    if (deptError) {
      throw new Error(`获取部门数据失败: ${deptError.message}`);
    }

    if (!departments || departments.length === 0) {
      return {
        message: '没有找到活跃的部门',
        processedCount: 0,
        errorCount: 0,
        duration: 0
      };
    }

    // 按层级处理部门权限继承
    for (const department of departments) {
      try {
        await processDepartmentInheritance(department);
        processedCount++;
      } catch (error) {
        errorCount++;
        const errorMsg = `部门 ${department.name} (${department.id}) 处理失败: ${error instanceof Error ? error.message : '未知错误'}`;
        errors.push(errorMsg);
        console.error(errorMsg);
      }
    }

    const endTime = new Date();
    const duration = endTime.getTime() - startTime.getTime();

    // 记录同步操作日志
    await supabase
      .from('system_operation_logs')
      .insert({
        operation_type: 'permission_sync',
        operator_id: operatorId,
        details: {
          processedCount,
          errorCount,
          duration,
          errors: errors.slice(0, 10) // 只记录前10个错误
        },
        ip_address: request.headers.get('x-forwarded-for') || 'unknown'
      });

    return {
      message: '权限继承同步完成',
      processedCount,
      errorCount,
      duration,
      errors: errors.slice(0, 5) // 返回前5个错误给前端
    };

  } catch (error) {
    console.error('权限继承同步过程失败:', error);
    throw error;
  }
}

/**
 * 处理单个部门的权限继承
 * @param department - 部门信息
 */
async function processDepartmentInheritance(department: any) {
  // 如果是根部门，跳过继承处理
  if (!department.parent_id) {
    return;
  }

  // 获取父部门的权限
  const parentPermissions = await getParentPermissions(department.parent_id);
  
  if (parentPermissions.length === 0) {
    return;
  }

  // 获取当前部门的直接权限（非继承权限）
  const { data: directPermissions, error: directError } = await supabase
    .from('department_permissions')
    .select('permission_id, granted, priority')
    .eq('department_id', department.id)
    .is('inherited_from', null);

  if (directError) {
    throw new Error(`获取部门直接权限失败: ${directError.message}`);
  }

  // 创建直接权限映射
  const directPermissionMap = new Map();
  directPermissions?.forEach(dp => {
    directPermissionMap.set(dp.permission_id, dp);
  });

  // 处理每个父级权限
  for (const parentPerm of parentPermissions) {
    // 检查是否已有直接权限覆盖
    const directPerm = directPermissionMap.get(parentPerm.permission_id);
    
    if (directPerm) {
      // 如果有直接权限，删除可能存在的继承权限
      await supabase
        .from('department_permissions')
        .delete()
        .eq('department_id', department.id)
        .eq('permission_id', parentPerm.permission_id)
        .not('inherited_from', 'is', null);
      continue;
    }

    // 检查是否已存在继承权限
    const { data: existingInherited, error: inheritedError } = await supabase
      .from('department_permissions')
      .select('id, granted, priority, inherited_from')
      .eq('department_id', department.id)
      .eq('permission_id', parentPerm.permission_id)
      .not('inherited_from', 'is', null)
      .single();

    if (inheritedError && inheritedError.code !== 'PGRST116') {
      throw new Error(`检查继承权限失败: ${inheritedError.message}`);
    }

    const inheritedPermission = {
      department_id: department.id,
      permission_id: parentPerm.permission_id,
      granted: parentPerm.granted,
      priority: parentPerm.priority - 1, // 继承权限优先级降低
      inherited_from: parentPerm.inherited_from || parentPerm.department_id,
      conditions: parentPerm.conditions,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (existingInherited) {
      // 更新现有继承权限
      const { error: updateError } = await supabase
        .from('department_permissions')
        .update({
          granted: inheritedPermission.granted,
          priority: inheritedPermission.priority,
          inherited_from: inheritedPermission.inherited_from,
          conditions: inheritedPermission.conditions,
          updated_at: inheritedPermission.updated_at
        })
        .eq('id', existingInherited.id);

      if (updateError) {
        throw new Error(`更新继承权限失败: ${updateError.message}`);
      }
    } else {
      // 创建新的继承权限
      const { error: insertError } = await supabase
        .from('department_permissions')
        .insert(inheritedPermission);

      if (insertError) {
        throw new Error(`创建继承权限失败: ${insertError.message}`);
      }
    }
  }

  // 清理无效的继承权限（父级已不存在的权限）
  await cleanupInvalidInheritedPermissions(department.id, parentPermissions);
}

/**
 * 获取父部门的所有权限（包括继承的权限）
 * @param parentId - 父部门ID
 * @returns 父部门权限列表
 */
async function getParentPermissions(parentId: string): Promise<any[]> {
  const { data: permissions, error } = await supabase
    .from('department_permissions')
    .select(`
      department_id,
      permission_id,
      granted,
      priority,
      inherited_from,
      conditions
    `)
    .eq('department_id', parentId)
    .eq('granted', true)
    .order('priority', { ascending: false });

  if (error) {
    throw new Error(`获取父部门权限失败: ${error.message}`);
  }

  return permissions || [];
}

/**
 * 清理无效的继承权限
 * @param departmentId - 部门ID
 * @param validParentPermissions - 有效的父级权限列表
 */
async function cleanupInvalidInheritedPermissions(
  departmentId: string,
  validParentPermissions: any[]
) {
  const validPermissionIds = validParentPermissions.map(p => p.permission_id);

  if (validPermissionIds.length === 0) {
    // 如果没有有效的父级权限，删除所有继承权限
    await supabase
      .from('department_permissions')
      .delete()
      .eq('department_id', departmentId)
      .not('inherited_from', 'is', null);
  } else {
    // 删除不在有效权限列表中的继承权限
    await supabase
      .from('department_permissions')
      .delete()
      .eq('department_id', departmentId)
      .not('inherited_from', 'is', null)
      .not('permission_id', 'in', `(${validPermissionIds.join(',')})`);
  }
}

/**
 * 获取权限继承同步状态
 * @param request - HTTP请求对象
 * @returns 同步状态信息
 */
export async function GET(request: NextRequest) {
  try {
    // 验证用户身份和权限
    const authResult = await verifyToken(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    // 检查管理员权限
    const { data: userPermissions } = await supabase
      .from('user_permissions')
      .select('permission:permissions(name)')
      .eq('user_id', authResult.user.id)
      .eq('granted', true);

    const hasAdminPermission = userPermissions?.some(
      up => up.permission.name === 'admin.permissions.manage'
    );

    if (!hasAdminPermission) {
      return NextResponse.json(
        { error: '权限不足' },
        { status: 403 }
      );
    }

    // 获取最近的同步记录
    const { data: lastSync, error: syncError } = await supabase
      .from('system_operation_logs')
      .select('created_at, details, operator_id')
      .eq('operation_type', 'permission_sync')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (syncError && syncError.code !== 'PGRST116') {
      throw new Error(`获取同步记录失败: ${syncError.message}`);
    }

    // 获取继承权限统计
    const { data: inheritedCount, error: countError } = await supabase
      .from('department_permissions')
      .select('id', { count: 'exact' })
      .not('inherited_from', 'is', null);

    if (countError) {
      throw new Error(`获取继承权限统计失败: ${countError.message}`);
    }

    return NextResponse.json({
      success: true,
      status: {
        lastSyncTime: lastSync?.created_at || null,
        lastSyncDetails: lastSync?.details || null,
        inheritedPermissionCount: inheritedCount?.length || 0,
        syncAvailable: true
      }
    });

  } catch (error) {
    console.error('获取同步状态失败:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}