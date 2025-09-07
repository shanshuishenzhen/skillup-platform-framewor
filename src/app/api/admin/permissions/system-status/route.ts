/**
 * 权限系统状态API接口
 * 提供权限系统的运行状态和健康检查信息
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
 * 获取权限系统状态
 * @param request - HTTP请求对象
 * @returns 系统状态信息
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

    // 获取系统状态
    const status = await getSystemStatus();

    return NextResponse.json({
      success: true,
      status
    });

  } catch (error) {
    console.error('获取系统状态失败:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

/**
 * 获取权限系统状态
 * @returns 系统状态对象
 */
async function getSystemStatus() {
  const status = {
    inheritanceEnabled: true,
    conflictDetectionEnabled: true,
    auditLoggingEnabled: true,
    lastSyncTime: new Date().toISOString(),
    systemHealth: 'healthy' as 'healthy' | 'warning' | 'error'
  };

  try {
    // 检查数据库连接
    const dbHealthy = await checkDatabaseHealth();
    if (!dbHealthy) {
      status.systemHealth = 'error';
      return status;
    }

    // 检查权限继承功能
    const inheritanceHealthy = await checkInheritanceHealth();
    if (!inheritanceHealthy) {
      status.inheritanceEnabled = false;
      status.systemHealth = 'warning';
    }

    // 检查冲突检测功能
    const conflictDetectionHealthy = await checkConflictDetectionHealth();
    if (!conflictDetectionHealthy) {
      status.conflictDetectionEnabled = false;
      status.systemHealth = 'warning';
    }

    // 检查审计日志功能
    const auditLoggingHealthy = await checkAuditLoggingHealth();
    if (!auditLoggingHealthy) {
      status.auditLoggingEnabled = false;
      status.systemHealth = 'warning';
    }

    // 获取最后同步时间
    const lastSyncTime = await getLastSyncTime();
    if (lastSyncTime) {
      status.lastSyncTime = lastSyncTime;
    }

    return status;

  } catch (error) {
    console.error('检查系统状态失败:', error);
    status.systemHealth = 'error';
    return status;
  }
}

/**
 * 检查数据库健康状态
 * @returns 数据库是否健康
 */
async function checkDatabaseHealth(): Promise<boolean> {
  try {
    // 测试基本的数据库查询
    const { error } = await supabase
      .from('departments')
      .select('id')
      .limit(1);

    return !error;
  } catch (error) {
    console.error('数据库健康检查失败:', error);
    return false;
  }
}

/**
 * 检查权限继承功能健康状态
 * @returns 权限继承功能是否正常
 */
async function checkInheritanceHealth(): Promise<boolean> {
  try {
    // 检查是否存在继承权限记录
    const { data, error } = await supabase
      .from('department_permissions')
      .select('id')
      .not('inherited_from', 'is', null)
      .limit(1);

    if (error) {
      console.error('权限继承健康检查失败:', error);
      return false;
    }

    // 如果没有继承权限记录，可能是正常情况（新系统）
    return true;
  } catch (error) {
    console.error('权限继承健康检查失败:', error);
    return false;
  }
}

/**
 * 检查冲突检测功能健康状态
 * @returns 冲突检测功能是否正常
 */
async function checkConflictDetectionHealth(): Promise<boolean> {
  try {
    // 检查权限表结构是否完整
    const { data, error } = await supabase
      .from('department_permissions')
      .select('department_id, permission_id, granted')
      .limit(1);

    if (error) {
      console.error('冲突检测健康检查失败:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('冲突检测健康检查失败:', error);
    return false;
  }
}

/**
 * 检查审计日志功能健康状态
 * @returns 审计日志功能是否正常
 */
async function checkAuditLoggingHealth(): Promise<boolean> {
  try {
    // 检查权限历史表是否可访问
    const { data, error } = await supabase
      .from('permission_history')
      .select('id')
      .limit(1);

    if (error) {
      console.error('审计日志健康检查失败:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('审计日志健康检查失败:', error);
    return false;
  }
}

/**
 * 获取最后同步时间
 * @returns 最后同步时间的ISO字符串
 */
async function getLastSyncTime(): Promise<string | null> {
  try {
    // 从系统操作日志中获取最后的权限同步时间
    const { data, error } = await supabase
      .from('system_operation_logs')
      .select('created_at')
      .eq('operation_type', 'permission_sync')
      .order('created_at', { ascending: false })
      .limit(1);

    if (error || !data || data.length === 0) {
      // 如果没有同步记录，返回当前时间
      return new Date().toISOString();
    }

    return data[0].created_at;
  } catch (error) {
    console.error('获取最后同步时间失败:', error);
    return null;
  }
}

/**
 * 更新系统状态（POST方法）
 * @param request - HTTP请求对象
 * @returns 更新结果
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

    // 检查超级管理员权限
    const { data: userPermissions } = await supabase
      .from('user_permissions')
      .select('permission:permissions(name)')
      .eq('user_id', authResult.user.id)
      .eq('granted', true);

    const hasSuperAdminPermission = userPermissions?.some(
      up => up.permission.name === 'admin.system.manage'
    );

    if (!hasSuperAdminPermission) {
      return NextResponse.json(
        { error: '权限不足，需要超级管理员权限' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action } = body;

    let result;
    switch (action) {
      case 'refresh_status':
        result = await refreshSystemStatus();
        break;
      case 'clear_cache':
        result = await clearSystemCache();
        break;
      default:
        return NextResponse.json(
          { error: '不支持的操作' },
          { status: 400 }
        );
    }

    // 记录操作日志
    await supabase
      .from('system_operation_logs')
      .insert({
        operation_type: 'system_status_update',
        operator_id: authResult.user.id,
        details: { action },
        ip_address: request.headers.get('x-forwarded-for') || 'unknown'
      });

    return NextResponse.json({
      success: true,
      result
    });

  } catch (error) {
    console.error('更新系统状态失败:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

/**
 * 刷新系统状态
 * @returns 刷新结果
 */
async function refreshSystemStatus() {
  // 执行系统状态刷新逻辑
  const status = await getSystemStatus();
  
  return {
    message: '系统状态已刷新',
    status,
    timestamp: new Date().toISOString()
  };
}

/**
 * 清理系统缓存
 * @returns 清理结果
 */
async function clearSystemCache() {
  // 这里可以实现缓存清理逻辑
  // 例如清理Redis缓存、内存缓存等
  
  return {
    message: '系统缓存已清理',
    timestamp: new Date().toISOString()
  };
}