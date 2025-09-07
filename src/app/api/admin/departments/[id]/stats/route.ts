import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * 验证管理员权限
 * @param token - JWT令牌
 * @returns 管理员信息或null
 */
async function verifyAdminToken(token: string) {
  try {
    const decoded = jwt.verify(token, jwtSecret) as any;
    
    const { data: admin, error } = await supabase
      .from('admins')
      .select('*')
      .eq('id', decoded.adminId)
      .eq('status', 'active')
      .single();

    if (error || !admin) {
      return null;
    }

    return admin;
  } catch (error) {
    return null;
  }
}

/**
 * 记录操作日志
 * @param adminId - 管理员ID
 * @param action - 操作类型
 * @param resourceType - 资源类型
 * @param resourceId - 资源ID
 * @param details - 操作详情
 */
async function logAdminAction(
  adminId: string,
  action: string,
  resourceType: string,
  resourceId: string,
  details?: any
) {
  try {
    await supabase.from('admin_logs').insert({
      admin_id: adminId,
      action,
      resource_type: resourceType,
      resource_id: resourceId,
      details,
      created_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('记录操作日志失败:', error);
  }
}

/**
 * 获取部门统计信息
 * GET /api/admin/departments/[id]/stats
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 验证管理员权限
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: '未提供认证令牌' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const admin = await verifyAdminToken(token);
    if (!admin) {
      return NextResponse.json({ error: '无效的认证令牌' }, { status: 401 });
    }

    const departmentId = params.id;
    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('time_range') || '6m';
    const includeSubDepartments = searchParams.get('include_sub_departments') === 'true';

    // 计算时间范围
    const now = new Date();
    let startDate: Date;
    switch (timeRange) {
      case '3m':
        startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        break;
      case '1y':
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), 1);
        break;
      default: // 6m
        startDate = new Date(now.getFullYear(), now.getMonth() - 6, 1);
    }

    // 验证部门是否存在
    const { data: department, error: deptError } = await supabase
      .from('departments')
      .select('*')
      .eq('id', departmentId)
      .single();

    if (deptError || !department) {
      return NextResponse.json({ error: '部门不存在' }, { status: 404 });
    }

    // 获取部门ID列表（包含子部门）
    let departmentIds = [departmentId];
    if (includeSubDepartments) {
      const { data: subDepartments } = await supabase
        .from('departments')
        .select('id')
        .like('path', `${department.path}%`)
        .neq('id', departmentId);
      
      if (subDepartments) {
        departmentIds = [...departmentIds, ...subDepartments.map(d => d.id)];
      }
    }

    // 获取当前成员统计
    const { data: currentMembers, error: membersError } = await supabase
      .from('user_departments')
      .select(`
        id,
        user_id,
        position,
        is_primary,
        is_manager,
        status,
        start_date,
        end_date,
        users!inner(id, username, email, full_name, status)
      `)
      .in('department_id', departmentIds)
      .is('end_date', null);

    if (membersError) {
      console.error('获取部门成员失败:', membersError);
      return NextResponse.json({ error: '获取部门成员失败' }, { status: 500 });
    }

    const members = currentMembers || [];
    const totalMembers = members.length;
    const activeMembers = members.filter(m => m.status === 'active').length;
    const inactiveMembers = totalMembers - activeMembers;
    const managersCount = members.filter(m => m.is_manager).length;
    const primaryMembers = members.filter(m => m.is_primary).length;

    // 获取子部门数量
    const { count: subDepartmentsCount } = await supabase
      .from('departments')
      .select('*', { count: 'exact', head: true })
      .eq('parent_id', departmentId)
      .eq('status', 'active');

    // 获取历史数据（入职和离职）
    const { data: memberHistory } = await supabase
      .from('user_departments')
      .select('start_date, end_date, status')
      .in('department_id', departmentIds)
      .gte('start_date', startDate.toISOString());

    // 计算近期入职和离职
    const recentDate = new Date();
    recentDate.setDate(recentDate.getDate() - 30); // 近30天

    const recentJoins = (memberHistory || []).filter(
      h => new Date(h.start_date) >= recentDate
    ).length;

    const recentLeaves = (memberHistory || []).filter(
      h => h.end_date && new Date(h.end_date) >= recentDate
    ).length;

    // 计算增长率
    const previousPeriodStart = new Date(startDate);
    previousPeriodStart.setMonth(previousPeriodStart.getMonth() - (timeRange === '3m' ? 3 : timeRange === '6m' ? 6 : 12));
    
    const { data: previousMembers } = await supabase
      .from('user_departments')
      .select('id')
      .in('department_id', departmentIds)
      .lte('start_date', startDate.toISOString())
      .or(`end_date.is.null,end_date.gte.${startDate.toISOString()}`);

    const previousCount = (previousMembers || []).length;
    const memberGrowthRate = previousCount > 0 ? ((totalMembers - previousCount) / previousCount) * 100 : 0;

    // 计算平均任职天数
    const avgTenureDays = members.reduce((sum, member) => {
      const startDate = new Date(member.start_date);
      const days = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      return sum + days;
    }, 0) / (totalMembers || 1);

    // 职位分布统计
    const positionCounts = members.reduce((acc, member) => {
      const position = member.position || '未设置职位';
      acc[position] = (acc[position] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const memberDistribution = Object.entries(positionCounts).map(([position, count]) => ({
      position,
      count
    })).sort((a, b) => b.count - a.count);

    // 月度统计
    const monthlyStats = [];
    for (let i = 0; i < (timeRange === '3m' ? 3 : timeRange === '6m' ? 6 : 12); i++) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      
      const monthJoins = (memberHistory || []).filter(
        h => {
          const startDate = new Date(h.start_date);
          return startDate >= monthStart && startDate <= monthEnd;
        }
      ).length;

      const monthLeaves = (memberHistory || []).filter(
        h => {
          if (!h.end_date) return false;
          const endDate = new Date(h.end_date);
          return endDate >= monthStart && endDate <= monthEnd;
        }
      ).length;

      monthlyStats.unshift({
        month: monthStart.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' }),
        joins: monthJoins,
        leaves: monthLeaves,
        net_change: monthJoins - monthLeaves
      });
    }

    // 构建统计结果
    const stats = {
      department_id: departmentId,
      department_name: department.name,
      total_members: totalMembers,
      active_members: activeMembers,
      inactive_members: inactiveMembers,
      managers_count: managersCount,
      primary_members: primaryMembers,
      sub_departments: subDepartmentsCount || 0,
      recent_joins: recentJoins,
      recent_leaves: recentLeaves,
      member_growth_rate: memberGrowthRate,
      avg_tenure_days: Math.round(avgTenureDays),
      member_distribution: memberDistribution,
      monthly_stats: monthlyStats
    };

    // 记录操作日志
    await logAdminAction(
      admin.id,
      'view_department_stats',
      'department',
      departmentId,
      { time_range: timeRange, include_sub_departments: includeSubDepartments }
    );

    return NextResponse.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('获取部门统计失败:', error);
    return NextResponse.json(
      { error: '获取部门统计失败' },
      { status: 500 }
    );
  }
}

/**
 * 导出部门统计报告
 * 这里返回JSON格式，实际项目中可以集成Excel导出库
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 验证管理员权限
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: '未提供认证令牌' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const admin = await verifyAdminToken(token);
    if (!admin) {
      return NextResponse.json({ error: '无效的认证令牌' }, { status: 401 });
    }

    const departmentId = params.id;
    const body = await request.json();
    const { time_range = '6m', format = 'json' } = body;

    // 这里可以调用GET方法获取统计数据
    // 然后根据format参数生成不同格式的报告
    // 为简化示例，这里直接返回JSON格式

    // 记录操作日志
    await logAdminAction(
      admin.id,
      'export_department_stats',
      'department',
      departmentId,
      { time_range, format }
    );

    return NextResponse.json({
      success: true,
      message: '报告导出功能开发中，当前返回JSON格式数据'
    });

  } catch (error) {
    console.error('导出部门统计报告失败:', error);
    return NextResponse.json(
      { error: '导出部门统计报告失败' },
      { status: 500 }
    );
  }
}