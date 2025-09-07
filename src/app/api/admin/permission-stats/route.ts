/**
 * 权限统计API
 * 提供权限管理相关的统计数据
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { verifyAdminAuth } from '@/lib/auth';

/**
 * 权限统计查询参数验证模式
 */
const StatsQuerySchema = z.object({
  date_range: z.enum(['7d', '30d', '90d', 'all']).optional().default('30d'),
  include_inactive: z.boolean().optional().default(false)
});

/**
 * 获取权限统计数据
 * @param request - HTTP请求对象
 * @returns 权限统计数据响应
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

    // 解析查询参数
    const { searchParams } = new URL(request.url);
    const queryResult = StatsQuerySchema.safeParse({
      date_range: searchParams.get('date_range'),
      include_inactive: searchParams.get('include_inactive') === 'true'
    });

    if (!queryResult.success) {
      return NextResponse.json(
        { error: '查询参数无效', details: queryResult.error.errors },
        { status: 400 }
      );
    }

    const { date_range, include_inactive } = queryResult.data;

    // 计算日期范围
    let dateFilter = '';
    if (date_range !== 'all') {
      const days = parseInt(date_range.replace('d', ''));
      dateFilter = `AND created_at >= NOW() - INTERVAL '${days} days'`;
    }

    // 用户状态过滤
    const userStatusFilter = include_inactive ? '' : "AND status = 'active'";

    // 并行执行所有统计查询
    const [usersResult, permissionsResult, templatesResult, historyResult, conflictsResult] = await Promise.all([
      // 用户统计
      supabase.rpc('get_user_stats', {
        p_include_inactive: include_inactive
      }),
      
      // 权限统计
      supabase.rpc('get_permission_stats'),
      
      // 模板统计
      supabase.rpc('get_template_stats', {
        p_include_inactive: include_inactive
      }),
      
      // 历史记录统计
      supabase.rpc('get_permission_history_stats', {
        p_date_range: date_range
      }),
      
      // 冲突统计
      supabase.rpc('get_permission_conflict_stats')
    ]);

    // 检查查询结果
    if (usersResult.error) {
      console.error('获取用户统计失败:', usersResult.error);
    }
    if (permissionsResult.error) {
      console.error('获取权限统计失败:', permissionsResult.error);
    }
    if (templatesResult.error) {
      console.error('获取模板统计失败:', templatesResult.error);
    }
    if (historyResult.error) {
      console.error('获取历史统计失败:', historyResult.error);
    }
    if (conflictsResult.error) {
      console.error('获取冲突统计失败:', conflictsResult.error);
    }

    // 如果存储过程不存在，使用直接查询作为备选方案
    let userStats, permissionStats, templateStats, historyStats, conflictStats;

    if (usersResult.error || !usersResult.data) {
      // 备选用户统计查询
      const { data: totalUsers } = await supabase
        .from('users')
        .select('id', { count: 'exact' })
        .eq('status', include_inactive ? undefined : 'active');
      
      const { data: usersWithPermissions } = await supabase
        .from('user_permissions')
        .select('user_id', { count: 'exact' })
        .not('user_id', 'is', null);
      
      userStats = {
        total_users: totalUsers?.length || 0,
        users_with_permissions: new Set(usersWithPermissions?.map(p => p.user_id) || []).size,
        active_users: totalUsers?.length || 0
      };
    } else {
      userStats = usersResult.data[0] || {};
    }

    if (permissionsResult.error || !permissionsResult.data) {
      // 备选权限统计查询
      const { data: permissions } = await supabase
        .from('permissions')
        .select('id', { count: 'exact' })
        .eq('is_active', true);
      
      permissionStats = {
        total_permissions: permissions?.length || 0,
        system_permissions: permissions?.length || 0,
        custom_permissions: 0
      };
    } else {
      permissionStats = permissionsResult.data[0] || {};
    }

    if (templatesResult.error || !templatesResult.data) {
      // 备选模板统计查询
      const { data: templates } = await supabase
        .from('permission_templates')
        .select('id', { count: 'exact' })
        .eq('is_active', true);
      
      templateStats = {
        active_templates: templates?.length || 0,
        total_templates: templates?.length || 0,
        system_templates: 0
      };
    } else {
      templateStats = templatesResult.data[0] || {};
    }

    if (historyResult.error || !historyResult.data) {
      // 备选历史统计查询
      const { data: recentChanges } = await supabase
        .from('permission_history')
        .select('id', { count: 'exact' })
        .gte('created_at', new Date(Date.now() - (date_range === 'all' ? 365 : parseInt(date_range.replace('d', ''))) * 24 * 60 * 60 * 1000).toISOString());
      
      historyStats = {
        recent_changes: recentChanges?.length || 0,
        total_operations: recentChanges?.length || 0
      };
    } else {
      historyStats = historyResult.data[0] || {};
    }

    if (conflictsResult.error || !conflictsResult.data) {
      // 备选冲突统计查询
      const { data: conflicts } = await supabase
        .from('permission_conflicts')
        .select('id, severity', { count: 'exact' })
        .eq('status', 'pending');
      
      conflictStats = {
        pending_conflicts: conflicts?.length || 0,
        auto_resolvable_conflicts: conflicts?.filter(c => c.severity === 'low').length || 0,
        critical_conflicts: conflicts?.filter(c => c.severity === 'high').length || 0
      };
    } else {
      conflictStats = conflictsResult.data[0] || {};
    }

    // 计算权限覆盖率
    const permissionCoverage = userStats.total_users > 0 
      ? Math.round((userStats.users_with_permissions / userStats.total_users) * 100 * 100) / 100
      : 0;

    // 组装统计数据
    const stats = {
      // 用户相关统计
      total_users: userStats.total_users || 0,
      users_with_permissions: userStats.users_with_permissions || 0,
      active_users: userStats.active_users || userStats.total_users || 0,
      permission_coverage: permissionCoverage,
      
      // 权限相关统计
      total_permissions: permissionStats.total_permissions || 0,
      system_permissions: permissionStats.system_permissions || 0,
      custom_permissions: permissionStats.custom_permissions || 0,
      
      // 模板相关统计
      active_templates: templateStats.active_templates || 0,
      total_templates: templateStats.total_templates || 0,
      system_templates: templateStats.system_templates || 0,
      
      // 历史记录统计
      recent_changes: historyStats.recent_changes || 0,
      total_operations: historyStats.total_operations || 0,
      
      // 冲突相关统计
      pending_conflicts: conflictStats.pending_conflicts || 0,
      auto_resolvable_conflicts: conflictStats.auto_resolvable_conflicts || 0,
      critical_conflicts: conflictStats.critical_conflicts || 0,
      
      // 元数据
      last_updated: new Date().toISOString(),
      date_range,
      include_inactive
    };

    return NextResponse.json({
      success: true,
      data: stats,
      message: '权限统计获取成功'
    });

  } catch (error) {
    console.error('获取权限统计失败:', error);
    return NextResponse.json(
      { error: '获取权限统计失败', details: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  }
}

/**
 * 获取权限趋势数据
 * @param request - HTTP请求对象
 * @returns 权限趋势数据响应
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

    const body = await request.json();
    const { metric, period = '30d', granularity = 'day' } = body;

    if (!metric) {
      return NextResponse.json(
        { error: '缺少指标参数' },
        { status: 400 }
      );
    }

    // 根据指标类型获取趋势数据
    let trendData = [];
    const days = parseInt(period.replace('d', ''));
    
    switch (metric) {
      case 'permission_assignments':
        // 权限分配趋势
        const { data: assignmentTrend } = await supabase
          .from('permission_history')
          .select('created_at')
          .eq('operation_type', 'permission_assign')
          .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
          .order('created_at', { ascending: true });
        
        trendData = processTrendData(assignmentTrend || [], granularity, days);
        break;
        
      case 'template_usage':
        // 模板使用趋势
        const { data: templateTrend } = await supabase
          .from('permission_history')
          .select('created_at')
          .eq('operation_type', 'template_apply')
          .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
          .order('created_at', { ascending: true });
        
        trendData = processTrendData(templateTrend || [], granularity, days);
        break;
        
      case 'conflict_resolution':
        // 冲突解决趋势
        const { data: conflictTrend } = await supabase
          .from('permission_history')
          .select('created_at')
          .eq('operation_type', 'conflict_resolve')
          .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
          .order('created_at', { ascending: true });
        
        trendData = processTrendData(conflictTrend || [], granularity, days);
        break;
        
      default:
        return NextResponse.json(
          { error: '不支持的指标类型' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      data: {
        metric,
        period,
        granularity,
        trend: trendData
      },
      message: '权限趋势数据获取成功'
    });

  } catch (error) {
    console.error('获取权限趋势失败:', error);
    return NextResponse.json(
      { error: '获取权限趋势失败', details: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  }
}

/**
 * 处理趋势数据
 * @param data - 原始数据
 * @param granularity - 时间粒度
 * @param days - 天数
 * @returns 处理后的趋势数据
 */
function processTrendData(data: any[], granularity: string, days: number) {
  const trendMap = new Map<string, number>();
  
  // 初始化时间点
  const now = new Date();
  for (let i = 0; i < days; i++) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const key = granularity === 'day' 
      ? date.toISOString().split('T')[0]
      : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    trendMap.set(key, 0);
  }
  
  // 统计数据
  data.forEach(item => {
    const date = new Date(item.created_at);
    const key = granularity === 'day'
      ? date.toISOString().split('T')[0]
      : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    if (trendMap.has(key)) {
      trendMap.set(key, (trendMap.get(key) || 0) + 1);
    }
  });
  
  // 转换为数组并排序
  return Array.from(trendMap.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}