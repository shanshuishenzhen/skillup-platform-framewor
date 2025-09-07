import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// 初始化 Supabase 客户端
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * 验证管理员权限
 * @async
 * @function verifyAdminPermission
 * @param {string} token - 认证令牌
 * @returns {Promise<{isValid: boolean, userId?: string, error?: string}>} 验证结果
 */
async function verifyAdminPermission(token: string) {
  try {
    // 验证 JWT token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return { isValid: false, error: '无效的认证令牌' };
    }

    // 检查用户是否有管理员权限
    const { data: permissions, error: permError } = await supabase
      .from('user_permissions')
      .select('granted')
      .eq('user_id', user.id)
      .eq('permission_id', 'admin_permission_management')
      .eq('granted', true)
      .single();

    if (permError || !permissions) {
      return { isValid: false, error: '权限不足' };
    }

    return { isValid: true, userId: user.id };
  } catch (error) {
    console.error('权限验证失败:', error);
    return { isValid: false, error: '权限验证失败' };
  }
}

/**
 * 获取权限审计统计数据
 * @async
 * @function GET
 * @param {NextRequest} request - 请求对象
 * @returns {Promise<NextResponse>} 响应对象
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: '缺少认证令牌' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const { isValid, error: authError } = await verifyAdminPermission(token);
    
    if (!isValid) {
      return NextResponse.json({ error: authError }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '7d'; // 7d, 30d, 90d, 1y
    const groupBy = searchParams.get('group_by') || 'day'; // day, week, month

    // 计算时间范围
    const now = new Date();
    let startDate: Date;
    
    switch (period) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    // 获取总体统计
    const [totalStats, actionStats, sourceStats, timelineStats] = await Promise.all([
      getTotalStats(startDate),
      getActionStats(startDate),
      getSourceStats(startDate),
      getTimelineStats(startDate, groupBy)
    ]);

    return NextResponse.json({
      period,
      start_date: startDate.toISOString(),
      end_date: now.toISOString(),
      total_stats: totalStats,
      action_stats: actionStats,
      source_stats: sourceStats,
      timeline_stats: timelineStats
    });
  } catch (error) {
    console.error('获取审计统计失败:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}

/**
 * 获取总体统计数据
 * @async
 * @function getTotalStats
 * @param {Date} startDate - 开始日期
 * @returns {Promise<Object>} 总体统计数据
 */
async function getTotalStats(startDate: Date) {
  try {
    // 总变更次数
    const { count: totalChanges } = await supabase
      .from('permission_change_history')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startDate.toISOString());

    // 受影响的用户数
    const { data: affectedUsers } = await supabase
      .from('permission_change_history')
      .select('user_id')
      .gte('created_at', startDate.toISOString());
    
    const uniqueUsers = new Set(affectedUsers?.map(u => u.user_id) || []).size;

    // 涉及的权限数
    const { data: affectedPermissions } = await supabase
      .from('permission_change_history')
      .select('permission_id')
      .gte('created_at', startDate.toISOString());
    
    const uniquePermissions = new Set(affectedPermissions?.map(p => p.permission_id) || []).size;

    // 涉及的部门数
    const { data: affectedDepartments } = await supabase
      .from('permission_change_history')
      .select('department_id')
      .gte('created_at', startDate.toISOString())
      .not('department_id', 'is', null);
    
    const uniqueDepartments = new Set(affectedDepartments?.map(d => d.department_id) || []).size;

    return {
      total_changes: totalChanges || 0,
      affected_users: uniqueUsers,
      affected_permissions: uniquePermissions,
      affected_departments: uniqueDepartments
    };
  } catch (error) {
    console.error('获取总体统计失败:', error);
    return {
      total_changes: 0,
      affected_users: 0,
      affected_permissions: 0,
      affected_departments: 0
    };
  }
}

/**
 * 获取操作类型统计
 * @async
 * @function getActionStats
 * @param {Date} startDate - 开始日期
 * @returns {Promise<Array>} 操作类型统计数据
 */
async function getActionStats(startDate: Date) {
  try {
    const { data: stats, error } = await supabase
      .from('permission_change_history')
      .select('action')
      .gte('created_at', startDate.toISOString());

    if (error) {
      console.error('获取操作统计失败:', error);
      return [];
    }

    // 统计各操作类型的数量
    const actionCounts = stats?.reduce((acc, item) => {
      acc[item.action] = (acc[item.action] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    return Object.entries(actionCounts).map(([action, count]) => ({
      action,
      count,
      percentage: stats ? Math.round((count / stats.length) * 100) : 0
    }));
  } catch (error) {
    console.error('获取操作统计失败:', error);
    return [];
  }
}

/**
 * 获取来源统计
 * @async
 * @function getSourceStats
 * @param {Date} startDate - 开始日期
 * @returns {Promise<Array>} 来源统计数据
 */
async function getSourceStats(startDate: Date) {
  try {
    const { data: stats, error } = await supabase
      .from('permission_change_history')
      .select('source')
      .gte('created_at', startDate.toISOString());

    if (error) {
      console.error('获取来源统计失败:', error);
      return [];
    }

    // 统计各来源的数量
    const sourceCounts = stats?.reduce((acc, item) => {
      acc[item.source] = (acc[item.source] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    return Object.entries(sourceCounts).map(([source, count]) => ({
      source,
      count,
      percentage: stats ? Math.round((count / stats.length) * 100) : 0
    }));
  } catch (error) {
    console.error('获取来源统计失败:', error);
    return [];
  }
}

/**
 * 获取时间线统计
 * @async
 * @function getTimelineStats
 * @param {Date} startDate - 开始日期
 * @param {string} groupBy - 分组方式
 * @returns {Promise<Array>} 时间线统计数据
 */
async function getTimelineStats(startDate: Date, groupBy: string) {
  try {
    let dateFormat: string;
    let interval: string;
    
    switch (groupBy) {
      case 'hour':
        dateFormat = 'YYYY-MM-DD HH24:00:00';
        interval = '1 hour';
        break;
      case 'day':
        dateFormat = 'YYYY-MM-DD';
        interval = '1 day';
        break;
      case 'week':
        dateFormat = 'YYYY-"W"WW';
        interval = '1 week';
        break;
      case 'month':
        dateFormat = 'YYYY-MM';
        interval = '1 month';
        break;
      default:
        dateFormat = 'YYYY-MM-DD';
        interval = '1 day';
    }

    const { data: stats, error } = await supabase.rpc('get_permission_timeline_stats', {
      start_date: startDate.toISOString(),
      date_format: dateFormat,
      time_interval: interval
    });

    if (error) {
      console.error('获取时间线统计失败:', error);
      // 如果RPC函数不存在，使用简单的查询
      return await getSimpleTimelineStats(startDate, groupBy);
    }

    return stats || [];
  } catch (error) {
    console.error('获取时间线统计失败:', error);
    return await getSimpleTimelineStats(startDate, groupBy);
  }
}

/**
 * 获取简单时间线统计（备用方法）
 * @async
 * @function getSimpleTimelineStats
 * @param {Date} startDate - 开始日期
 * @param {string} groupBy - 分组方式
 * @returns {Promise<Array>} 时间线统计数据
 */
async function getSimpleTimelineStats(startDate: Date, groupBy: string) {
  try {
    const { data: stats, error } = await supabase
      .from('permission_change_history')
      .select('created_at, action')
      .gte('created_at', startDate.toISOString())
      .order('created_at');

    if (error) {
      console.error('获取简单时间线统计失败:', error);
      return [];
    }

    // 按时间分组统计
    const timelineMap = new Map<string, { date: string; total: number; grant: number; revoke: number; inherit: number; override: number }>();
    
    stats?.forEach(item => {
      const date = new Date(item.created_at);
      let key: string;
      
      switch (groupBy) {
        case 'hour':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:00`;
          break;
        case 'day':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
          break;
        case 'week':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = `${weekStart.getFullYear()}-W${String(Math.ceil((weekStart.getTime() - new Date(weekStart.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000))).padStart(2, '0')}`;
          break;
        case 'month':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
        default:
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      }
      
      if (!timelineMap.has(key)) {
        timelineMap.set(key, {
          date: key,
          total: 0,
          grant: 0,
          revoke: 0,
          inherit: 0,
          override: 0
        });
      }
      
      const entry = timelineMap.get(key)!;
      entry.total++;
      entry[item.action as keyof typeof entry] = (entry[item.action as keyof typeof entry] as number) + 1;
    });

    return Array.from(timelineMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  } catch (error) {
    console.error('获取简单时间线统计失败:', error);
    return [];
  }
}