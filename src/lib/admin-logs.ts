/**
 * 管理员操作日志工具库
 * 用于记录和查询管理员的各种操作行为
 */

import { supabase } from '@/lib/supabase';

/**
 * 日志级别枚举
 */
export enum LogLevel {
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  DEBUG = 'debug'
}

/**
 * 操作类型枚举
 */
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  VIEW = 'view',
  LOGIN = 'login',
  LOGOUT = 'logout',
  PERMISSION_CHANGE = 'permission_change',
  ROLE_CHANGE = 'role_change'
}

/**
 * 日志条目接口
 */
export interface LogEntry {
  id?: string;
  admin_id: string;
  operation_type: OperationType;
  resource_type: string;
  resource_id?: string;
  details: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  level: LogLevel;
  created_at?: string;
}

/**
 * 记录管理员操作日志
 * @param entry 日志条目
 * @returns Promise<boolean> 是否记录成功
 */
export async function logAdminOperation(entry: Omit<LogEntry, 'id' | 'created_at'>): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('admin_logs')
      .insert({
        ...entry,
        created_at: new Date().toISOString()
      });

    if (error) {
      console.error('记录管理员日志失败:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('记录管理员日志异常:', error);
    return false;
  }
}

/**
 * 查询管理员操作日志
 * @param filters 查询过滤条件
 * @param pagination 分页参数
 * @returns Promise<{data: LogEntry[], total: number}>
 */
export async function getAdminLogs(
  filters: {
    admin_id?: string;
    operation_type?: OperationType;
    resource_type?: string;
    level?: LogLevel;
    start_date?: string;
    end_date?: string;
  } = {},
  pagination: {
    page?: number;
    limit?: number;
  } = {}
): Promise<{ data: LogEntry[], total: number }> {
  try {
    const { page = 1, limit = 20 } = pagination;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('admin_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    // 应用过滤条件
    if (filters.admin_id) {
      query = query.eq('admin_id', filters.admin_id);
    }
    if (filters.operation_type) {
      query = query.eq('operation_type', filters.operation_type);
    }
    if (filters.resource_type) {
      query = query.eq('resource_type', filters.resource_type);
    }
    if (filters.level) {
      query = query.eq('level', filters.level);
    }
    if (filters.start_date) {
      query = query.gte('created_at', filters.start_date);
    }
    if (filters.end_date) {
      query = query.lte('created_at', filters.end_date);
    }

    // 应用分页
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('查询管理员日志失败:', error);
      return { data: [], total: 0 };
    }

    return {
      data: data || [],
      total: count || 0
    };
  } catch (error) {
    console.error('查询管理员日志异常:', error);
    return { data: [], total: 0 };
  }
}

/**
 * 清理过期日志
 * @param daysToKeep 保留天数
 * @returns Promise<number> 清理的记录数
 */
export async function cleanupOldLogs(daysToKeep: number = 90): Promise<number> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const { data, error } = await supabase
      .from('admin_logs')
      .delete()
      .lt('created_at', cutoffDate.toISOString())
      .select('id');

    if (error) {
      console.error('清理过期日志失败:', error);
      return 0;
    }

    return data?.length || 0;
  } catch (error) {
    console.error('清理过期日志异常:', error);
    return 0;
  }
}

/**
 * 获取日志统计信息
 * @param timeRange 时间范围（天数）
 * @returns Promise<Record<string, number>>
 */
export async function getLogStatistics(timeRange: number = 7): Promise<Record<string, number>> {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - timeRange);

    const { data, error } = await supabase
      .from('admin_logs')
      .select('operation_type, level')
      .gte('created_at', startDate.toISOString());

    if (error) {
      console.error('获取日志统计失败:', error);
      return {};
    }

    const stats: Record<string, number> = {};
    
    data?.forEach(log => {
      const operationKey = `operation_${log.operation_type}`;
      const levelKey = `level_${log.level}`;
      
      stats[operationKey] = (stats[operationKey] || 0) + 1;
      stats[levelKey] = (stats[levelKey] || 0) + 1;
      stats.total = (stats.total || 0) + 1;
    });

    return stats;
  } catch (error) {
    console.error('获取日志统计异常:', error);
    return {};
  }
}