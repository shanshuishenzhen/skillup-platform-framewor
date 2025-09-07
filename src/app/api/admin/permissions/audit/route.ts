import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAdminAuth } from '@/lib/auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * 获取权限变更审计日志
 * @param request - HTTP请求对象
 * @returns 审计日志列表
 */
export async function GET(request: NextRequest) {
  try {
    // 验证管理员权限
    const authResult = await verifyAdminAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const userId = searchParams.get('userId');
    const departmentId = searchParams.get('departmentId');
    const resource = searchParams.get('resource');
    const action = searchParams.get('action');
    const changeType = searchParams.get('changeType');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const changedBy = searchParams.get('changedBy');
    const sortBy = searchParams.get('sortBy') || 'changed_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    const offset = (page - 1) * limit;

    // 构建查询
    let query = supabase
      .from('permission_change_history')
      .select(`
        *,
        changed_by_user:users!permission_change_history_changed_by_fkey(id, name, email),
        target_user:users!permission_change_history_user_id_fkey(id, name, email),
        target_department:departments(id, name, level)
      `, { count: 'exact' })
      .range(offset, offset + limit - 1)
      .order(sortBy, { ascending: sortOrder === 'asc' });

    // 应用过滤条件
    if (userId) {
      query = query.eq('user_id', userId);
    }
    if (departmentId) {
      query = query.eq('department_id', departmentId);
    }
    if (resource) {
      query = query.eq('resource', resource);
    }
    if (action) {
      query = query.eq('action', action);
    }
    if (changeType) {
      query = query.eq('change_type', changeType);
    }
    if (changedBy) {
      query = query.eq('changed_by', changedBy);
    }
    if (startDate) {
      query = query.gte('changed_at', startDate);
    }
    if (endDate) {
      query = query.lte('changed_at', endDate);
    }

    const { data: auditLogs, error, count } = await query;

    if (error) {
      console.error('获取审计日志失败:', error);
      return NextResponse.json({ error: '获取审计日志失败' }, { status: 500 });
    }

    // 获取统计信息
    const stats = await getAuditStats({
      userId,
      departmentId,
      resource,
      action,
      changeType,
      startDate,
      endDate,
      changedBy
    });

    return NextResponse.json({
      auditLogs: auditLogs || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      },
      stats
    });
  } catch (error) {
    console.error('获取权限审计日志错误:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}

/**
 * 创建权限变更审计日志
 * @param request - HTTP请求对象
 * @returns 创建结果
 */
export async function POST(request: NextRequest) {
  try {
    // 验证管理员权限
    const authResult = await verifyAdminAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const body = await request.json();
    const {
      userId,
      departmentId,
      roleId,
      resource,
      action,
      changeType,
      oldValue,
      newValue,
      reason,
      metadata
    } = body;

    // 验证必填字段
    if (!changeType || !resource || !action) {
      return NextResponse.json({ error: '缺少必填字段' }, { status: 400 });
    }

    // 创建审计日志
    const auditLog = await createAuditLog({
      userId,
      departmentId,
      roleId,
      resource,
      action,
      changeType,
      oldValue,
      newValue,
      reason,
      metadata,
      changedBy: authResult.user.id
    });

    return NextResponse.json({
      success: true,
      auditLog,
      message: '审计日志创建成功'
    });
  } catch (error) {
    console.error('创建权限审计日志错误:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}

/**
 * 导出审计日志
 * @param request - HTTP请求对象
 * @returns 导出文件
 */
export async function PUT(request: NextRequest) {
  try {
    // 验证管理员权限
    const authResult = await verifyAdminAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const body = await request.json();
    const { format = 'csv', filters = {} } = body;

    // 获取审计日志数据
    const auditData = await getAuditLogsForExport(filters);

    let exportData;
    let contentType;
    let filename;

    switch (format) {
      case 'csv':
        exportData = generateCSV(auditData);
        contentType = 'text/csv';
        filename = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`;
        break;
      
      case 'json':
        exportData = JSON.stringify(auditData, null, 2);
        contentType = 'application/json';
        filename = `audit_logs_${new Date().toISOString().split('T')[0]}.json`;
        break;
      
      case 'excel':
        // 这里可以集成 xlsx 库生成 Excel 文件
        exportData = generateExcel(auditData);
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        filename = `audit_logs_${new Date().toISOString().split('T')[0]}.xlsx`;
        break;
      
      default:
        return NextResponse.json({ error: '不支持的导出格式' }, { status: 400 });
    }

    // 记录导出操作
    await createAuditLog({
      resource: 'audit_logs',
      action: 'export',
      changeType: 'export',
      newValue: { format, filters, recordCount: auditData.length },
      reason: '导出审计日志',
      changedBy: authResult.user.id
    });

    return new NextResponse(exportData, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache'
      }
    });
  } catch (error) {
    console.error('导出审计日志错误:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}

/**
 * 获取审计统计信息
 * @param filters - 过滤条件
 * @returns 统计信息
 */
async function getAuditStats(filters: any) {
  try {
    // 构建基础查询
    let baseQuery = supabase
      .from('permission_change_history')
      .select('change_type, changed_at, changed_by');

    // 应用过滤条件
    if (filters.userId) {
      baseQuery = baseQuery.eq('user_id', filters.userId);
    }
    if (filters.departmentId) {
      baseQuery = baseQuery.eq('department_id', filters.departmentId);
    }
    if (filters.resource) {
      baseQuery = baseQuery.eq('resource', filters.resource);
    }
    if (filters.action) {
      baseQuery = baseQuery.eq('action', filters.action);
    }
    if (filters.changeType) {
      baseQuery = baseQuery.eq('change_type', filters.changeType);
    }
    if (filters.changedBy) {
      baseQuery = baseQuery.eq('changed_by', filters.changedBy);
    }
    if (filters.startDate) {
      baseQuery = baseQuery.gte('changed_at', filters.startDate);
    }
    if (filters.endDate) {
      baseQuery = baseQuery.lte('changed_at', filters.endDate);
    }

    const { data: allLogs } = await baseQuery;

    if (!allLogs) {
      return {
        totalChanges: 0,
        changesByType: {},
        changesByDate: {},
        topChangers: [],
        recentActivity: []
      };
    }

    // 按变更类型统计
    const changesByType = allLogs.reduce((acc, log) => {
      acc[log.change_type] = (acc[log.change_type] || 0) + 1;
      return acc;
    }, {});

    // 按日期统计（最近30天）
    const changesByDate = {};
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date.toISOString().split('T')[0];
    }).reverse();

    last30Days.forEach(date => {
      changesByDate[date] = allLogs.filter(log => 
        log.changed_at.startsWith(date)
      ).length;
    });

    // 最活跃的变更者
    const changerCounts = allLogs.reduce((acc, log) => {
      acc[log.changed_by] = (acc[log.changed_by] || 0) + 1;
      return acc;
    }, {});

    const topChangers = Object.entries(changerCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([userId, count]) => ({ userId, count }));

    // 获取变更者信息
    if (topChangers.length > 0) {
      const { data: users } = await supabase
        .from('users')
        .select('id, name, email')
        .in('id', topChangers.map(c => c.userId));

      if (users) {
        topChangers.forEach(changer => {
          const user = users.find(u => u.id === changer.userId);
          if (user) {
            changer.name = user.name;
            changer.email = user.email;
          }
        });
      }
    }

    // 最近活动（最近10条）
    const recentActivity = allLogs
      .sort((a, b) => new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime())
      .slice(0, 10);

    return {
      totalChanges: allLogs.length,
      changesByType,
      changesByDate,
      topChangers,
      recentActivity
    };
  } catch (error) {
    console.error('获取审计统计失败:', error);
    return {
      totalChanges: 0,
      changesByType: {},
      changesByDate: {},
      topChangers: [],
      recentActivity: []
    };
  }
}

/**
 * 创建审计日志
 * @param logData - 日志数据
 * @returns 创建的审计日志
 */
export async function createAuditLog(logData: {
  userId?: string;
  departmentId?: string;
  roleId?: string;
  resource: string;
  action: string;
  changeType: string;
  oldValue?: any;
  newValue?: any;
  reason?: string;
  metadata?: any;
  changedBy: string;
}) {
  try {
    const auditLog = {
      user_id: logData.userId,
      department_id: logData.departmentId,
      role_id: logData.roleId,
      resource: logData.resource,
      action: logData.action,
      change_type: logData.changeType,
      old_value: logData.oldValue,
      new_value: logData.newValue,
      reason: logData.reason,
      metadata: logData.metadata,
      changed_by: logData.changedBy,
      changed_at: new Date().toISOString(),
      ip_address: null, // 可以从请求中获取
      user_agent: null  // 可以从请求中获取
    };

    const { data, error } = await supabase
      .from('permission_change_history')
      .insert(auditLog)
      .select()
      .single();

    if (error) {
      console.error('创建审计日志失败:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('创建审计日志失败:', error);
    throw error;
  }
}

/**
 * 获取用于导出的审计日志数据
 * @param filters - 过滤条件
 * @returns 审计日志数据
 */
async function getAuditLogsForExport(filters: any) {
  try {
    let query = supabase
      .from('permission_change_history')
      .select(`
        *,
        changed_by_user:users!permission_change_history_changed_by_fkey(id, name, email),
        target_user:users!permission_change_history_user_id_fkey(id, name, email),
        target_department:departments(id, name, level)
      `)
      .order('changed_at', { ascending: false })
      .limit(10000); // 限制导出数量

    // 应用过滤条件
    if (filters.userId) {
      query = query.eq('user_id', filters.userId);
    }
    if (filters.departmentId) {
      query = query.eq('department_id', filters.departmentId);
    }
    if (filters.resource) {
      query = query.eq('resource', filters.resource);
    }
    if (filters.action) {
      query = query.eq('action', filters.action);
    }
    if (filters.changeType) {
      query = query.eq('change_type', filters.changeType);
    }
    if (filters.changedBy) {
      query = query.eq('changed_by', filters.changedBy);
    }
    if (filters.startDate) {
      query = query.gte('changed_at', filters.startDate);
    }
    if (filters.endDate) {
      query = query.lte('changed_at', filters.endDate);
    }

    const { data, error } = await query;

    if (error) {
      console.error('获取导出数据失败:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('获取导出数据失败:', error);
    throw error;
  }
}

/**
 * 生成CSV格式数据
 * @param data - 审计日志数据
 * @returns CSV字符串
 */
function generateCSV(data: any[]) {
  if (data.length === 0) {
    return 'No data available';
  }

  const headers = [
    'ID',
    '变更时间',
    '变更类型',
    '资源',
    '操作',
    '目标用户',
    '目标部门',
    '变更者',
    '原值',
    '新值',
    '原因',
    'IP地址'
  ];

  const csvRows = [headers.join(',')];

  data.forEach(log => {
    const row = [
      log.id,
      log.changed_at,
      log.change_type,
      log.resource,
      log.action,
      log.target_user?.name || '',
      log.target_department?.name || '',
      log.changed_by_user?.name || '',
      JSON.stringify(log.old_value || ''),
      JSON.stringify(log.new_value || ''),
      log.reason || '',
      log.ip_address || ''
    ];
    
    csvRows.push(row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','));
  });

  return csvRows.join('\n');
}

/**
 * 生成Excel格式数据
 * @param data - 审计日志数据
 * @returns Excel数据
 */
function generateExcel(data: any[]) {
  // 这里应该使用 xlsx 库来生成真正的 Excel 文件
  // 为了简化，这里返回 CSV 格式
  return generateCSV(data);
}

/**
 * 批量创建审计日志
 * @param logs - 日志数据数组
 * @returns 创建结果
 */
export async function createBatchAuditLogs(logs: any[]) {
  try {
    const auditLogs = logs.map(log => ({
      user_id: log.userId,
      department_id: log.departmentId,
      role_id: log.roleId,
      resource: log.resource,
      action: log.action,
      change_type: log.changeType,
      old_value: log.oldValue,
      new_value: log.newValue,
      reason: log.reason,
      metadata: log.metadata,
      changed_by: log.changedBy,
      changed_at: new Date().toISOString(),
      ip_address: log.ipAddress,
      user_agent: log.userAgent
    }));

    const { data, error } = await supabase
      .from('permission_change_history')
      .insert(auditLogs)
      .select();

    if (error) {
      console.error('批量创建审计日志失败:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('批量创建审计日志失败:', error);
    throw error;
  }
}

/**
 * 清理过期审计日志
 * @param retentionDays - 保留天数
 * @returns 清理结果
 */
export async function cleanupExpiredAuditLogs(retentionDays: number = 365) {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const { data, error } = await supabase
      .from('permission_change_history')
      .delete()
      .lt('changed_at', cutoffDate.toISOString());

    if (error) {
      console.error('清理过期审计日志失败:', error);
      throw error;
    }

    return {
      success: true,
      deletedCount: data?.length || 0,
      cutoffDate: cutoffDate.toISOString()
    };
  } catch (error) {
    console.error('清理过期审计日志失败:', error);
    throw error;
  }
}

/**
 * 获取审计日志详情
 * @param logId - 日志ID
 * @returns 日志详情
 */
export async function getAuditLogDetail(logId: string) {
  try {
    const { data, error } = await supabase
      .from('permission_change_history')
      .select(`
        *,
        changed_by_user:users!permission_change_history_changed_by_fkey(id, name, email, avatar_url),
        target_user:users!permission_change_history_user_id_fkey(id, name, email, avatar_url),
        target_department:departments(id, name, level, parent_id),
        target_role:roles(id, name, description)
      `)
      .eq('id', logId)
      .single();

    if (error) {
      console.error('获取审计日志详情失败:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('获取审计日志详情失败:', error);
    throw error;
  }
}