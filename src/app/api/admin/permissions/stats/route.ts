/**
 * 权限统计API接口
 * 提供部门权限管理的统计数据
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
 * 获取权限统计数据
 * @param request - HTTP请求对象
 * @returns 权限统计信息
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

    // 获取统计数据
    const stats = await getPermissionStats();

    return NextResponse.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('获取权限统计失败:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

/**
 * 获取权限统计数据
 * @returns 统计数据对象
 */
async function getPermissionStats() {
  // 获取部门统计
  const { data: departments, error: deptError } = await supabase
    .from('departments')
    .select('id, name')
    .eq('is_active', true);

  if (deptError) {
    throw new Error(`获取部门数据失败: ${deptError.message}`);
  }

  const totalDepartments = departments?.length || 0;

  // 获取已配置权限的部门数量
  const { data: configuredDepts, error: configError } = await supabase
    .from('department_permissions')
    .select('department_id')
    .eq('granted', true);

  if (configError) {
    throw new Error(`获取配置部门数据失败: ${configError.message}`);
  }

  const configuredDepartments = new Set(configuredDepts?.map(dp => dp.department_id) || []).size;

  // 获取权限总数
  const { data: allPermissions, error: permError } = await supabase
    .from('department_permissions')
    .select('id, inherited_from')
    .eq('granted', true);

  if (permError) {
    throw new Error(`获取权限数据失败: ${permError.message}`);
  }

  const totalPermissions = allPermissions?.length || 0;
  const inheritedPermissions = allPermissions?.filter(p => p.inherited_from).length || 0;
  const directPermissions = totalPermissions - inheritedPermissions;

  // 获取权限冲突数量
  const conflictCount = await getConflictCount();

  // 获取近期变更数量（最近7天）
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data: recentChanges, error: changesError } = await supabase
    .from('permission_history')
    .select('id')
    .gte('created_at', sevenDaysAgo.toISOString());

  if (changesError) {
    console.warn('获取近期变更数据失败:', changesError);
  }

  const recentChangesCount = recentChanges?.length || 0;

  return {
    totalDepartments,
    configuredDepartments,
    totalPermissions,
    inheritedPermissions,
    directPermissions,
    conflictCount,
    recentChanges: recentChangesCount
  };
}

/**
 * 获取权限冲突数量
 * @returns 冲突数量
 */
async function getConflictCount(): Promise<number> {
  try {
    // 检测权限冲突的逻辑
    // 查找相同资源和操作但授权状态不同的权限
    const { data: permissions, error } = await supabase
      .from('department_permissions')
      .select(`
        department_id,
        permission_id,
        granted,
        permission:permissions(
          resource,
          action
        ),
        department:departments(
          path
        )
      `);

    if (error) {
      console.warn('获取权限冲突数据失败:', error);
      return 0;
    }

    if (!permissions) return 0;

    const conflicts = new Set<string>();

    // 按部门路径分组检测冲突
    const departmentGroups = new Map<string, any[]>();
    
    permissions.forEach(perm => {
      const path = perm.department.path;
      const pathParts = path.split('.');
      
      // 检查每个父级路径
      for (let i = 1; i < pathParts.length; i++) {
        const parentPath = pathParts.slice(0, i + 1).join('.');
        if (!departmentGroups.has(parentPath)) {
          departmentGroups.set(parentPath, []);
        }
        departmentGroups.get(parentPath)!.push(perm);
      }
    });

    // 检测每个路径下的权限冲突
    departmentGroups.forEach((perms, path) => {
      const resourceActionMap = new Map<string, { granted: boolean[], departments: string[] }>();
      
      perms.forEach(perm => {
        const key = `${perm.permission.resource}:${perm.permission.action}`;
        if (!resourceActionMap.has(key)) {
          resourceActionMap.set(key, { granted: [], departments: [] });
        }
        const entry = resourceActionMap.get(key)!;
        entry.granted.push(perm.granted);
        entry.departments.push(perm.department_id);
      });
      
      // 检查是否存在相同资源操作但不同授权状态的情况
      resourceActionMap.forEach((entry, key) => {
        const hasGranted = entry.granted.includes(true);
        const hasDenied = entry.granted.includes(false);
        
        if (hasGranted && hasDenied) {
          conflicts.add(`${path}:${key}`);
        }
      });
    });

    return conflicts.size;

  } catch (error) {
    console.warn('检测权限冲突失败:', error);
    return 0;
  }
}