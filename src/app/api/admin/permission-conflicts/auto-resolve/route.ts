/**
 * 自动解决权限冲突API
 * 自动检测并解决可处理的权限冲突
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { verifyAdminAuth } from '@/lib/auth';

/**
 * 自动解决配置验证模式
 */
const AutoResolveConfigSchema = z.object({
  max_conflicts: z.number().min(1).max(100).optional().default(50),
  severity_limit: z.enum(['low', 'medium', 'high']).optional().default('medium'),
  dry_run: z.boolean().optional().default(false),
  conflict_types: z.array(z.string()).optional(),
  user_ids: z.array(z.string()).optional()
});

/**
 * 冲突解决策略
 */
interface ResolutionStrategy {
  type: string;
  priority: number;
  canResolve: (conflict: any) => boolean;
  resolve: (conflict: any) => Promise<any>;
}

/**
 * 自动解决权限冲突
 * @param request - HTTP请求对象
 * @returns 自动解决结果响应
 */
export async function POST(request: NextRequest) {
  try {
    // 验证管理员权限
    const authResult = await verifyAdminAuth(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    // 解析请求体
    const body = await request.json().catch(() => ({}));
    const configResult = AutoResolveConfigSchema.safeParse(body);

    if (!configResult.success) {
      return NextResponse.json(
        { error: '配置参数无效', details: configResult.error.errors },
        { status: 400 }
      );
    }

    const config = configResult.data;
    const operatorId = authResult.user.id;

    // 获取待解决的冲突
    let conflictsQuery = supabase
      .from('permission_conflicts')
      .select(`
        *,
        user:users(id, name, email),
        permission:permissions(id, name, code)
      `)
      .eq('status', 'pending')
      .lte('severity', getSeverityLevel(config.severity_limit))
      .limit(config.max_conflicts);

    // 应用过滤条件
    if (config.conflict_types && config.conflict_types.length > 0) {
      conflictsQuery = conflictsQuery.in('conflict_type', config.conflict_types);
    }

    if (config.user_ids && config.user_ids.length > 0) {
      conflictsQuery = conflictsQuery.in('user_id', config.user_ids);
    }

    const { data: conflicts, error: conflictsError } = await conflictsQuery;

    if (conflictsError) {
      throw new Error(`获取冲突列表失败: ${conflictsError.message}`);
    }

    if (!conflicts || conflicts.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          resolved_count: 0,
          failed_count: 0,
          skipped_count: 0,
          total_processed: 0,
          resolutions: [],
          dry_run: config.dry_run
        },
        message: '没有找到可自动解决的冲突'
      });
    }

    // 定义解决策略
    const strategies: ResolutionStrategy[] = [
      {
        type: 'duplicate_permission',
        priority: 1,
        canResolve: (conflict) => conflict.conflict_type === 'duplicate_permission' && conflict.severity === 'low',
        resolve: async (conflict) => {
          // 保留直接分配的权限，移除通过角色继承的重复权限
          const { data: userPermissions } = await supabase
            .from('user_permissions')
            .select('*')
            .eq('user_id', conflict.user_id)
            .eq('permission_id', conflict.permission_id);

          if (userPermissions && userPermissions.length > 1) {
            // 保留最早的直接分配，删除其他重复项
            const toKeep = userPermissions.find(p => p.assigned_via === 'direct') || userPermissions[0];
            const toRemove = userPermissions.filter(p => p.id !== toKeep.id);

            if (!config.dry_run) {
              for (const permission of toRemove) {
                await supabase
                  .from('user_permissions')
                  .delete()
                  .eq('id', permission.id);
              }
            }

            return {
              action: 'remove_duplicates',
              kept: toKeep,
              removed: toRemove.length,
              details: `保留${toKeep.assigned_via}分配的权限，移除${toRemove.length}个重复项`
            };
          }

          return { action: 'no_action', details: '未找到重复权限' };
        }
      },
      {
        type: 'role_permission_conflict',
        priority: 2,
        canResolve: (conflict) => conflict.conflict_type === 'role_permission_conflict' && conflict.severity === 'low',
        resolve: async (conflict) => {
          // 角色权限冲突：保留更高级别的权限
          const conflictData = conflict.conflict_data || {};
          const { role_permission, direct_permission } = conflictData;

          if (role_permission && direct_permission) {
            // 比较权限级别，保留更高级别的
            const roleLevel = getPermissionLevel(role_permission.permission_code);
            const directLevel = getPermissionLevel(direct_permission.permission_code);

            if (roleLevel >= directLevel) {
              // 保留角色权限，移除直接权限
              if (!config.dry_run) {
                await supabase
                  .from('user_permissions')
                  .delete()
                  .eq('user_id', conflict.user_id)
                  .eq('permission_id', conflict.permission_id)
                  .eq('assigned_via', 'direct');
              }
              return {
                action: 'keep_role_permission',
                details: '保留角色权限，移除直接分配的权限'
              };
            } else {
              // 保留直接权限，从角色中移除权限
              if (!config.dry_run) {
                await supabase
                  .from('role_permissions')
                  .delete()
                  .eq('role_id', role_permission.role_id)
                  .eq('permission_id', conflict.permission_id);
              }
              return {
                action: 'keep_direct_permission',
                details: '保留直接权限，从角色中移除权限'
              };
            }
          }

          return { action: 'no_action', details: '无法确定冲突详情' };
        }
      },
      {
        type: 'expired_permission',
        priority: 3,
        canResolve: (conflict) => conflict.conflict_type === 'expired_permission',
        resolve: async (conflict) => {
          // 过期权限：直接移除
          if (!config.dry_run) {
            await supabase
              .from('user_permissions')
              .delete()
              .eq('user_id', conflict.user_id)
              .eq('permission_id', conflict.permission_id)
              .lt('expires_at', new Date().toISOString());
          }
          return {
            action: 'remove_expired',
            details: '移除过期权限'
          };
        }
      },
      {
        type: 'inactive_permission',
        priority: 4,
        canResolve: (conflict) => conflict.conflict_type === 'inactive_permission' && conflict.severity === 'low',
        resolve: async (conflict) => {
          // 非活跃权限：移除用户权限分配
          if (!config.dry_run) {
            await supabase
              .from('user_permissions')
              .delete()
              .eq('user_id', conflict.user_id)
              .eq('permission_id', conflict.permission_id);
          }
          return {
            action: 'remove_inactive',
            details: '移除非活跃权限分配'
          };
        }
      }
    ];

    // 处理冲突
    const results = {
      resolved_count: 0,
      failed_count: 0,
      skipped_count: 0,
      total_processed: conflicts.length,
      resolutions: [] as any[],
      dry_run: config.dry_run
    };

    for (const conflict of conflicts) {
      try {
        // 查找适用的策略
        const strategy = strategies
          .sort((a, b) => a.priority - b.priority)
          .find(s => s.canResolve(conflict));

        if (!strategy) {
          results.skipped_count++;
          results.resolutions.push({
            conflict_id: conflict.id,
            user_id: conflict.user_id,
            user_name: conflict.user?.name,
            conflict_type: conflict.conflict_type,
            status: 'skipped',
            reason: '没有找到适用的自动解决策略'
          });
          continue;
        }

        // 执行解决策略
        const resolution = await strategy.resolve(conflict);

        // 更新冲突状态
        if (!config.dry_run) {
          await supabase
            .from('permission_conflicts')
            .update({
              status: 'resolved',
              resolution_method: 'auto',
              resolution_details: resolution,
              resolved_by: operatorId,
              resolved_at: new Date().toISOString()
            })
            .eq('id', conflict.id);

          // 记录解决历史
          await supabase
            .from('permission_history')
            .insert({
              user_id: conflict.user_id,
              permission_id: conflict.permission_id,
              operation_type: 'conflict_resolve',
              operation_details: {
                conflict_id: conflict.id,
                conflict_type: conflict.conflict_type,
                resolution_method: 'auto',
                strategy_type: strategy.type,
                resolution
              },
              operator_id: operatorId,
              created_at: new Date().toISOString()
            });
        }

        results.resolved_count++;
        results.resolutions.push({
          conflict_id: conflict.id,
          user_id: conflict.user_id,
          user_name: conflict.user?.name,
          conflict_type: conflict.conflict_type,
          strategy_type: strategy.type,
          status: 'resolved',
          resolution,
          dry_run: config.dry_run
        });

      } catch (error) {
        console.error(`解决冲突 ${conflict.id} 失败:`, error);
        results.failed_count++;
        results.resolutions.push({
          conflict_id: conflict.id,
          user_id: conflict.user_id,
          user_name: conflict.user?.name,
          conflict_type: conflict.conflict_type,
          status: 'failed',
          error: error instanceof Error ? error.message : '未知错误'
        });
      }
    }

    // 记录批量操作日志
    if (!config.dry_run && results.resolved_count > 0) {
      await supabase
        .from('admin_operation_logs')
        .insert({
          operator_id: operatorId,
          operation_type: 'auto_resolve_conflicts',
          operation_details: {
            config,
            results: {
              resolved_count: results.resolved_count,
              failed_count: results.failed_count,
              skipped_count: results.skipped_count,
              total_processed: results.total_processed
            }
          },
          created_at: new Date().toISOString()
        });
    }

    const message = config.dry_run 
      ? `模拟运行完成：可解决 ${results.resolved_count} 个冲突，跳过 ${results.skipped_count} 个，失败 ${results.failed_count} 个`
      : `自动解决完成：成功解决 ${results.resolved_count} 个冲突，跳过 ${results.skipped_count} 个，失败 ${results.failed_count} 个`;

    return NextResponse.json({
      success: true,
      data: results,
      message
    });

  } catch (error) {
    console.error('自动解决权限冲突失败:', error);
    return NextResponse.json(
      { error: '自动解决权限冲突失败', details: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  }
}

/**
 * 获取严重程度级别数值
 * @param severity - 严重程度字符串
 * @returns 数值级别
 */
function getSeverityLevel(severity: string): number {
  const levels: Record<string, number> = {
    'low': 1,
    'medium': 2,
    'high': 3
  };
  return levels[severity] || 1;
}

/**
 * 获取权限级别
 * @param permissionCode - 权限代码
 * @returns 权限级别
 */
function getPermissionLevel(permissionCode: string): number {
  // 根据权限代码确定权限级别
  // 这里可以根据实际业务逻辑调整
  if (permissionCode.includes('admin')) return 10;
  if (permissionCode.includes('manage')) return 8;
  if (permissionCode.includes('edit')) return 6;
  if (permissionCode.includes('create')) return 4;
  if (permissionCode.includes('view')) return 2;
  return 1;
}

/**
 * 获取自动解决配置
 * @param request - HTTP请求对象
 * @returns 配置信息响应
 */
export async function GET(request: NextRequest) {
  try {
    // 验证管理员权限
    const authResult = await verifyAdminAuth(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    // 获取可自动解决的冲突统计
    const { data: autoResolvableConflicts } = await supabase
      .from('permission_conflicts')
      .select('conflict_type, severity', { count: 'exact' })
      .eq('status', 'pending')
      .lte('severity', getSeverityLevel('medium'));

    // 按类型和严重程度分组统计
    const conflictStats = (autoResolvableConflicts || []).reduce((acc, conflict) => {
      const key = `${conflict.conflict_type}_${conflict.severity}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // 支持的解决策略
    const supportedStrategies = [
      {
        type: 'duplicate_permission',
        name: '重复权限处理',
        description: '自动移除重复的权限分配，保留优先级更高的权限',
        supported_severities: ['low'],
        auto_resolvable: true
      },
      {
        type: 'role_permission_conflict',
        name: '角色权限冲突',
        description: '解决角色权限与直接权限的冲突，保留更高级别的权限',
        supported_severities: ['low', 'medium'],
        auto_resolvable: true
      },
      {
        type: 'expired_permission',
        name: '过期权限清理',
        description: '自动移除已过期的权限分配',
        supported_severities: ['low', 'medium', 'high'],
        auto_resolvable: true
      },
      {
        type: 'inactive_permission',
        name: '非活跃权限清理',
        description: '移除指向非活跃权限的用户分配',
        supported_severities: ['low'],
        auto_resolvable: true
      }
    ];

    return NextResponse.json({
      success: true,
      data: {
        total_auto_resolvable: autoResolvableConflicts?.length || 0,
        conflict_stats: conflictStats,
        supported_strategies: supportedStrategies,
        default_config: {
          max_conflicts: 50,
          severity_limit: 'medium',
          dry_run: false
        }
      },
      message: '自动解决配置获取成功'
    });

  } catch (error) {
    console.error('获取自动解决配置失败:', error);
    return NextResponse.json(
      { error: '获取自动解决配置失败', details: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  }
}