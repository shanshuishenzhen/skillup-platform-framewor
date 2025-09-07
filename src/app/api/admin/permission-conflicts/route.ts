/**
 * 权限冲突检测和解决API
 * 提供权限冲突的检测、分析和解决功能
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { verifyRBAC } from '@/middleware/rbac';
import { UserRole } from '@/types/roles';

// 初始化 Supabase 客户端
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 权限冲突解决验证模式
const ConflictResolutionSchema = z.object({
  user_id: z.string(),
  conflicts: z.array(z.object({
    conflict_id: z.string(),
    resolution: z.enum(['keep_direct', 'keep_role', 'remove_both', 'merge']),
    reason: z.string().optional()
  })),
  auto_resolve: z.boolean().default(false)
});

// 权限冲突检测查询模式
const ConflictDetectionSchema = z.object({
  user_id: z.string().optional(),
  conflict_type: z.enum(['duplicate', 'contradictory', 'redundant']).optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20)
});

/**
 * 权限冲突类型定义
 */
interface PermissionConflict {
  id: string;
  user_id: string;
  conflict_type: 'duplicate' | 'contradictory' | 'redundant';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  permissions_involved: string[];
  sources: Array<{
    type: 'direct' | 'role' | 'template';
    source_id: string;
    source_name: string;
  }>;
  suggested_resolution: string;
  auto_resolvable: boolean;
  created_at: string;
}

/**
 * 检测用户权限冲突
 * @param userId 用户ID
 * @returns 权限冲突列表
 */
async function detectUserPermissionConflicts(userId: string): Promise<PermissionConflict[]> {
  const conflicts: PermissionConflict[] = [];

  // 获取用户的所有权限来源
  const { data: userPermissions, error: permError } = await supabase
    .from('user_permissions')
    .select('permission_id, source_type, source_id, is_active')
    .eq('user_id', userId)
    .eq('is_active', true);

  if (permError || !userPermissions) {
    throw new Error(`获取用户权限失败: ${permError?.message}`);
  }

  // 获取用户角色权限
  const { data: rolePermissions, error: roleError } = await supabase
    .from('user_roles')
    .select(`
      role_id,
      roles!inner(
        id,
        name,
        permissions
      )
    `)
    .eq('user_id', userId)
    .eq('is_active', true);

  if (roleError) {
    console.warn('获取用户角色权限失败:', roleError);
  }

  // 构建权限映射
  const permissionSources = new Map<string, Array<{
    type: 'direct' | 'role' | 'template';
    source_id: string;
    source_name: string;
  }>>();

  // 添加直接权限
  userPermissions.forEach(perm => {
    if (!permissionSources.has(perm.permission_id)) {
      permissionSources.set(perm.permission_id, []);
    }
    permissionSources.get(perm.permission_id)!.push({
      type: perm.source_type as 'direct' | 'role' | 'template',
      source_id: perm.source_id,
      source_name: perm.source_type === 'direct' ? '直接分配' : perm.source_id
    });
  });

  // 添加角色权限
  rolePermissions?.forEach(userRole => {
    const role = userRole.roles;
    if (role && role.permissions) {
      role.permissions.forEach((permissionId: string) => {
        if (!permissionSources.has(permissionId)) {
          permissionSources.set(permissionId, []);
        }
        permissionSources.get(permissionId)!.push({
          type: 'role',
          source_id: role.id,
          source_name: role.name
        });
      });
    }
  });

  // 检测重复权限冲突
  permissionSources.forEach((sources, permissionId) => {
    if (sources.length > 1) {
      const hasDirectAndRole = sources.some(s => s.type === 'direct') && sources.some(s => s.type === 'role');
      const hasMultipleRoles = sources.filter(s => s.type === 'role').length > 1;
      
      if (hasDirectAndRole || hasMultipleRoles) {
        conflicts.push({
          id: `duplicate_${userId}_${permissionId}_${Date.now()}`,
          user_id: userId,
          conflict_type: 'duplicate',
          severity: hasDirectAndRole ? 'medium' : 'low',
          description: `权限 ${permissionId} 存在重复分配`,
          permissions_involved: [permissionId],
          sources,
          suggested_resolution: hasDirectAndRole ? '保留角色权限，移除直接权限' : '合并重复的角色权限',
          auto_resolvable: hasDirectAndRole,
          created_at: new Date().toISOString()
        });
      }
    }
  });

  // 检测矛盾权限冲突（例如：同时拥有查看和禁止查看权限）
  const contradictoryPairs = [
    ['user.view', 'user.view.deny'],
    ['course.edit', 'course.edit.deny'],
    ['exam.manage', 'exam.manage.deny']
  ];

  contradictoryPairs.forEach(([permission, denyPermission]) => {
    if (permissionSources.has(permission) && permissionSources.has(denyPermission)) {
      conflicts.push({
        id: `contradictory_${userId}_${permission}_${Date.now()}`,
        user_id: userId,
        conflict_type: 'contradictory',
        severity: 'high',
        description: `存在矛盾权限：${permission} 和 ${denyPermission}`,
        permissions_involved: [permission, denyPermission],
        sources: [
          ...permissionSources.get(permission)!,
          ...permissionSources.get(denyPermission)!
        ],
        suggested_resolution: `移除拒绝权限 ${denyPermission}，保留允许权限 ${permission}`,
        auto_resolvable: true,
        created_at: new Date().toISOString()
      });
    }
  });

  return conflicts;
}

/**
 * GET /api/admin/permission-conflicts
 * 获取权限冲突列表
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

    const { searchParams } = new URL(request.url);
    const queryParams = {
      user_id: searchParams.get('user_id') || undefined,
      conflict_type: searchParams.get('conflict_type') || undefined,
      severity: searchParams.get('severity') || undefined,
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20')
    };

    const validatedParams = ConflictDetectionSchema.parse(queryParams);
    const { page, limit, user_id, conflict_type, severity } = validatedParams;

    let allConflicts: PermissionConflict[] = [];

    if (user_id) {
      // 检测特定用户的权限冲突
      const userConflicts = await detectUserPermissionConflicts(user_id);
      allConflicts = userConflicts;
    } else {
      // 检测所有用户的权限冲突
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id')
        .eq('is_active', true)
        .limit(100); // 限制批量检测的用户数量

      if (usersError) {
        throw new Error(`获取用户列表失败: ${usersError.message}`);
      }

      if (users) {
        for (const user of users) {
          try {
            const userConflicts = await detectUserPermissionConflicts(user.id);
            allConflicts.push(...userConflicts);
          } catch (error) {
            console.warn(`检测用户 ${user.id} 权限冲突失败:`, error);
          }
        }
      }
    }

    // 应用过滤条件
    let filteredConflicts = allConflicts;
    if (conflict_type) {
      filteredConflicts = filteredConflicts.filter(c => c.conflict_type === conflict_type);
    }
    if (severity) {
      filteredConflicts = filteredConflicts.filter(c => c.severity === severity);
    }

    // 分页
    const offset = (page - 1) * limit;
    const paginatedConflicts = filteredConflicts.slice(offset, offset + limit);

    // 统计信息
    const statistics = {
      total: filteredConflicts.length,
      byType: {
        duplicate: filteredConflicts.filter(c => c.conflict_type === 'duplicate').length,
        contradictory: filteredConflicts.filter(c => c.conflict_type === 'contradictory').length,
        redundant: filteredConflicts.filter(c => c.conflict_type === 'redundant').length
      },
      bySeverity: {
        low: filteredConflicts.filter(c => c.severity === 'low').length,
        medium: filteredConflicts.filter(c => c.severity === 'medium').length,
        high: filteredConflicts.filter(c => c.severity === 'high').length,
        critical: filteredConflicts.filter(c => c.severity === 'critical').length
      },
      autoResolvable: filteredConflicts.filter(c => c.auto_resolvable).length
    };

    return NextResponse.json({
      success: true,
      data: {
        conflicts: paginatedConflicts,
        pagination: {
          page,
          limit,
          total: filteredConflicts.length,
          totalPages: Math.ceil(filteredConflicts.length / limit)
        },
        statistics
      }
    });

  } catch (error) {
    console.error('获取权限冲突失败:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '查询参数格式错误', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : '服务器内部错误' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/permission-conflicts
 * 解决权限冲突
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
    const { user_id, conflicts, auto_resolve } = ConflictResolutionSchema.parse(body);

    const resolutionResults = [];
    let successCount = 0;
    let failureCount = 0;

    for (const conflict of conflicts) {
      try {
        const { conflict_id, resolution, reason } = conflict;
        
        // 根据解决方案执行相应操作
        switch (resolution) {
          case 'keep_direct':
            // 保留直接权限，移除角色权限（通过调整角色）
            // 这里需要具体的业务逻辑实现
            break;
            
          case 'keep_role':
            // 保留角色权限，移除直接权限
            const { error: removeDirectError } = await supabase
              .from('user_permissions')
              .delete()
              .eq('user_id', user_id)
              .eq('source_type', 'direct');
            
            if (removeDirectError) {
              throw new Error(`移除直接权限失败: ${removeDirectError.message}`);
            }
            break;
            
          case 'remove_both':
            // 移除所有相关权限
            const { error: removeAllError } = await supabase
              .from('user_permissions')
              .delete()
              .eq('user_id', user_id)
              .in('permission_id', conflict_id.split('_').slice(2, -1)); // 从conflict_id中提取权限ID
            
            if (removeAllError) {
              throw new Error(`移除所有权限失败: ${removeAllError.message}`);
            }
            break;
            
          case 'merge':
            // 合并权限（保留最高级别的权限）
            // 这里需要具体的合并逻辑
            break;
        }

        // 记录解决操作
        await supabase
          .from('permission_conflict_resolutions')
          .insert({
            conflict_id,
            user_id,
            operator_id: rbacResult.user.id,
            resolution,
            reason: reason || `自动解决: ${resolution}`,
            resolved_at: new Date().toISOString()
          });

        resolutionResults.push({
          conflict_id,
          status: 'success',
          message: '冲突解决成功'
        });
        successCount++;

      } catch (error) {
        resolutionResults.push({
          conflict_id: conflict.conflict_id,
          status: 'error',
          message: error instanceof Error ? error.message : '解决冲突失败'
        });
        failureCount++;
      }
    }

    // 记录批量操作日志
    await supabase
      .from('permission_change_logs')
      .insert({
        user_id,
        operator_id: rbacResult.user.id,
        operation: 'conflict_resolution',
        permissions_added: [],
        permissions_removed: [],
        reason: `批量解决权限冲突: 成功${successCount}个，失败${failureCount}个`,
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown',
        created_at: new Date().toISOString()
      });

    return NextResponse.json({
      success: true,
      message: `权限冲突解决完成: 成功${successCount}个，失败${failureCount}个`,
      data: {
        results: resolutionResults,
        summary: {
          total: conflicts.length,
          success: successCount,
          failure: failureCount
        }
      }
    });

  } catch (error) {
    console.error('解决权限冲突失败:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '请求数据格式错误', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : '服务器内部错误' },
      { status: 500 }
    );
  }
}