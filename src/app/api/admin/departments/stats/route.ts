import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAdminAuth } from '@/lib/auth';
import { logAdminOperation } from '@/lib/admin-logs';

/**
 * 部门统计API接口
 * 提供部门人员统计、绩效统计、成本预算等数据
 */

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/admin/departments/stats
 * 获取部门统计数据
 * 
 * @param request - HTTP请求对象
 * @returns 部门统计数据
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

    const { searchParams } = new URL(request.url);
    const departmentId = searchParams.get('department_id');
    const statsType = searchParams.get('type') || 'overview'; // overview, personnel, performance, budget, trend
    const timeRange = searchParams.get('time_range') || '30d'; // 7d, 30d, 90d, 1y
    const includeSubDepts = searchParams.get('include_sub_depts') === 'true';

    let stats: any = {};

    switch (statsType) {
      case 'overview':
        stats = await getOverviewStats(departmentId, includeSubDepts);
        break;
      case 'personnel':
        stats = await getPersonnelStats(departmentId, includeSubDepts, timeRange);
        break;
      case 'performance':
        stats = await getPerformanceStats(departmentId, includeSubDepts, timeRange);
        break;
      case 'budget':
        stats = await getBudgetStats(departmentId, includeSubDepts, timeRange);
        break;
      case 'trend':
        stats = await getTrendStats(departmentId, includeSubDepts, timeRange);
        break;
      case 'comparison':
        stats = await getComparisonStats(departmentId, timeRange);
        break;
      default:
        return NextResponse.json(
          { error: '不支持的统计类型' },
          { status: 400 }
        );
    }

    // 记录操作日志
    await logAdminOperation({
      admin_id: authResult.user.id,
      action: 'view_department_stats',
      resource_type: 'department_stats',
      resource_id: departmentId || 'all',
      details: {
        stats_type: statsType,
        time_range: timeRange,
        include_sub_depts: includeSubDepts
      }
    });

    return NextResponse.json({
      success: true,
      data: stats,
      meta: {
        type: statsType,
        time_range: timeRange,
        department_id: departmentId,
        include_sub_depts: includeSubDepts,
        generated_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('获取部门统计数据失败:', error);
    return NextResponse.json(
      { error: '获取统计数据失败' },
      { status: 500 }
    );
  }
}

/**
 * 获取概览统计数据
 * @param departmentId - 部门ID
 * @param includeSubDepts - 是否包含子部门
 * @returns 概览统计数据
 */
async function getOverviewStats(departmentId: string | null, includeSubDepts: boolean) {
  const whereClause = buildDepartmentWhereClause(departmentId, includeSubDepts);
  
  // 获取部门基本信息
  const { data: departments } = await supabase
    .from('departments')
    .select('*')
    .eq('deleted_at', null);

  // 获取人员统计
  const { data: personnelStats } = await supabase
    .from('user_departments')
    .select(`
      department_id,
      is_primary,
      is_manager,
      status,
      users!inner(id, status)
    `)
    .eq('deleted_at', null);

  // 计算统计数据
  const totalDepartments = departments?.length || 0;
  const activeDepartments = departments?.filter(d => d.status === 'active').length || 0;
  const totalPersonnel = personnelStats?.length || 0;
  const activePersonnel = personnelStats?.filter(p => p.users.status === 'active').length || 0;
  const managers = personnelStats?.filter(p => p.is_manager).length || 0;

  return {
    departments: {
      total: totalDepartments,
      active: activeDepartments,
      inactive: totalDepartments - activeDepartments
    },
    personnel: {
      total: totalPersonnel,
      active: activePersonnel,
      inactive: totalPersonnel - activePersonnel,
      managers: managers
    },
    ratios: {
      manager_ratio: totalPersonnel > 0 ? (managers / totalPersonnel * 100).toFixed(2) : '0',
      active_ratio: totalPersonnel > 0 ? (activePersonnel / totalPersonnel * 100).toFixed(2) : '0'
    }
  };
}

/**
 * 获取人员统计数据
 * @param departmentId - 部门ID
 * @param includeSubDepts - 是否包含子部门
 * @param timeRange - 时间范围
 * @returns 人员统计数据
 */
async function getPersonnelStats(departmentId: string | null, includeSubDepts: boolean, timeRange: string) {
  const whereClause = buildDepartmentWhereClause(departmentId, includeSubDepts);
  const dateFilter = buildDateFilter(timeRange);

  // 获取人员分布统计
  const { data: personnelData } = await supabase
    .from('user_departments')
    .select(`
      department_id,
      position,
      is_primary,
      is_manager,
      status,
      created_at,
      users!inner(id, status, created_at),
      departments!inner(name, code)
    `)
    .eq('deleted_at', null)
    .gte('created_at', dateFilter);

  // 按部门分组统计
  const departmentStats = personnelData?.reduce((acc: any, item) => {
    const deptId = item.department_id;
    if (!acc[deptId]) {
      acc[deptId] = {
        department_name: item.departments.name,
        department_code: item.departments.code,
        total: 0,
        active: 0,
        managers: 0,
        positions: {}
      };
    }
    
    acc[deptId].total++;
    if (item.users.status === 'active') acc[deptId].active++;
    if (item.is_manager) acc[deptId].managers++;
    
    // 职位统计
    const position = item.position || '未设置';
    acc[deptId].positions[position] = (acc[deptId].positions[position] || 0) + 1;
    
    return acc;
  }, {}) || {};

  // 时间趋势统计
  const trendData = await getPersonnelTrend(timeRange);

  return {
    by_department: Object.values(departmentStats),
    trend: trendData,
    summary: {
      total_personnel: personnelData?.length || 0,
      active_personnel: personnelData?.filter(p => p.users.status === 'active').length || 0,
      total_managers: personnelData?.filter(p => p.is_manager).length || 0
    }
  };
}

/**
 * 获取绩效统计数据
 * @param departmentId - 部门ID
 * @param includeSubDepts - 是否包含子部门
 * @param timeRange - 时间范围
 * @returns 绩效统计数据
 */
async function getPerformanceStats(departmentId: string | null, includeSubDepts: boolean, timeRange: string) {
  // 这里可以集成绩效评估系统的数据
  // 暂时返回模拟数据
  return {
    average_score: 85.6,
    score_distribution: {
      excellent: 25,
      good: 45,
      average: 25,
      poor: 5
    },
    improvement_trend: {
      current_period: 85.6,
      previous_period: 82.3,
      change: 3.3
    },
    top_performers: [
      { name: '张三', score: 95.2, department: '技术部' },
      { name: '李四', score: 92.8, department: '产品部' },
      { name: '王五', score: 90.5, department: '运营部' }
    ]
  };
}

/**
 * 获取预算统计数据
 * @param departmentId - 部门ID
 * @param includeSubDepts - 是否包含子部门
 * @param timeRange - 时间范围
 * @returns 预算统计数据
 */
async function getBudgetStats(departmentId: string | null, includeSubDepts: boolean, timeRange: string) {
  // 这里可以集成财务系统的数据
  // 暂时返回模拟数据
  return {
    total_budget: 1000000,
    used_budget: 750000,
    remaining_budget: 250000,
    utilization_rate: 75,
    by_category: {
      personnel: { budget: 600000, used: 580000, rate: 96.7 },
      equipment: { budget: 200000, used: 120000, rate: 60 },
      training: { budget: 100000, used: 30000, rate: 30 },
      other: { budget: 100000, used: 20000, rate: 20 }
    },
    monthly_trend: [
      { month: '2024-01', budget: 83333, used: 75000 },
      { month: '2024-02', budget: 83333, used: 78000 },
      { month: '2024-03', budget: 83333, used: 82000 }
    ]
  };
}

/**
 * 获取趋势统计数据
 * @param departmentId - 部门ID
 * @param includeSubDepts - 是否包含子部门
 * @param timeRange - 时间范围
 * @returns 趋势统计数据
 */
async function getTrendStats(departmentId: string | null, includeSubDepts: boolean, timeRange: string) {
  const dateFilter = buildDateFilter(timeRange);
  
  // 获取人员变化趋势
  const personnelTrend = await getPersonnelTrend(timeRange);
  
  return {
    personnel_trend: personnelTrend,
    department_growth: {
      new_departments: 2,
      closed_departments: 0,
      restructured: 1
    },
    key_metrics: {
      employee_turnover: 5.2,
      promotion_rate: 8.5,
      training_completion: 92.3
    }
  };
}

/**
 * 获取对比统计数据
 * @param departmentId - 部门ID
 * @param timeRange - 时间范围
 * @returns 对比统计数据
 */
async function getComparisonStats(departmentId: string | null, timeRange: string) {
  // 获取所有部门的对比数据
  const { data: departments } = await supabase
    .from('departments')
    .select(`
      id,
      name,
      code,
      user_departments!inner(id, users!inner(id, status))
    `)
    .eq('deleted_at', null)
    .eq('status', 'active');

  const comparison = departments?.map(dept => ({
    department_id: dept.id,
    department_name: dept.name,
    department_code: dept.code,
    personnel_count: dept.user_departments.length,
    active_personnel: dept.user_departments.filter(ud => ud.users.status === 'active').length,
    efficiency_score: Math.random() * 100, // 模拟效率分数
    satisfaction_score: Math.random() * 100 // 模拟满意度分数
  })) || [];

  return {
    departments: comparison,
    rankings: {
      by_size: comparison.sort((a, b) => b.personnel_count - a.personnel_count),
      by_efficiency: comparison.sort((a, b) => b.efficiency_score - a.efficiency_score),
      by_satisfaction: comparison.sort((a, b) => b.satisfaction_score - a.satisfaction_score)
    }
  };
}

/**
 * 获取人员趋势数据
 * @param timeRange - 时间范围
 * @returns 人员趋势数据
 */
async function getPersonnelTrend(timeRange: string) {
  const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 365;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data: trendData } = await supabase
    .from('user_departments')
    .select('created_at, deleted_at')
    .gte('created_at', startDate.toISOString());

  // 按日期分组统计
  const dailyStats: { [key: string]: { joined: number; left: number } } = {};
  
  trendData?.forEach(item => {
    const joinDate = new Date(item.created_at).toISOString().split('T')[0];
    if (!dailyStats[joinDate]) {
      dailyStats[joinDate] = { joined: 0, left: 0 };
    }
    dailyStats[joinDate].joined++;
    
    if (item.deleted_at) {
      const leaveDate = new Date(item.deleted_at).toISOString().split('T')[0];
      if (!dailyStats[leaveDate]) {
        dailyStats[leaveDate] = { joined: 0, left: 0 };
      }
      dailyStats[leaveDate].left++;
    }
  });

  return Object.entries(dailyStats).map(([date, stats]) => ({
    date,
    joined: stats.joined,
    left: stats.left,
    net_change: stats.joined - stats.left
  }));
}

/**
 * 构建部门查询条件
 * @param departmentId - 部门ID
 * @param includeSubDepts - 是否包含子部门
 * @returns 查询条件
 */
function buildDepartmentWhereClause(departmentId: string | null, includeSubDepts: boolean) {
  if (!departmentId) return '';
  
  if (includeSubDepts) {
    return `department_id.in.(${departmentId})`; // 这里需要获取所有子部门ID
  } else {
    return `department_id.eq.${departmentId}`;
  }
}

/**
 * 构建日期过滤条件
 * @param timeRange - 时间范围
 * @returns 日期过滤条件
 */
function buildDateFilter(timeRange: string) {
  const now = new Date();
  const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 365;
  const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  return startDate.toISOString();
}