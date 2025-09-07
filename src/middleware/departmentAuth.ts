/**
 * 部门权限验证中间件
 * 用于API路由中验证用户的部门权限
 */

import { NextRequest, NextResponse } from 'next/server';
import { DepartmentPermissionService } from '@/lib/departmentPermissions';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

// Supabase 客户端配置
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * 权限检查选项
 */
export interface PermissionCheckOptions {
  resource: string;
  action: string;
  departmentId?: string;
  requireDepartment?: boolean;
  allowSuperAdmin?: boolean;
}

/**
 * 用户信息接口
 */
export interface AuthenticatedUser {
  id: string;
  phone: string;
  role: string;
  department_id?: string;
  is_super_admin?: boolean;
}

/**
 * 扩展的请求接口
 */
export interface AuthenticatedRequest extends NextRequest {
  user?: AuthenticatedUser;
  departmentId?: string;
}

/**
 * 从请求中提取用户信息
 * @param request 请求对象
 * @returns 用户信息或null
 */
export async function extractUserFromRequest(request: NextRequest): Promise<AuthenticatedUser | null> {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    
    const token = authHeader.substring(7);
    
    if (!token) {
      return null;
    }
    
    // 验证JWT令牌
    let decoded: any;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    } catch (jwtError) {
      console.error('JWT验证失败:', jwtError);
      return null;
    }
    
    if (!decoded.userId) {
      return null;
    }
    
    // 从数据库获取用户信息
    const { data: user, error } = await supabase
      .from('users')
      .select(`
        id,
        phone,
        role,
        is_super_admin,
        user_departments!inner(
          department_id,
          is_primary
        )
      `)
      .eq('id', decoded.userId)
      .eq('user_departments.is_active', true)
      .single();
    
    if (error || !user) {
      console.error('获取用户信息失败:', error);
      return null;
    }
    
    // 获取主要部门ID
    const primaryDepartment = user.user_departments?.find(
      (ud: any) => ud.is_primary
    );
    
    return {
      id: user.id,
      phone: user.phone,
      role: user.role,
      department_id: primaryDepartment?.department_id,
      is_super_admin: user.is_super_admin
    };
  } catch (error) {
    console.error('提取用户信息失败:', error);
    return null;
  }
}

/**
 * 检查用户是否有特定权限
 * @param user 用户信息
 * @param options 权限检查选项
 * @returns 是否有权限
 */
export async function checkUserPermission(
  user: AuthenticatedUser,
  options: PermissionCheckOptions
): Promise<boolean> {
  try {
    // 超级管理员检查
    if (options.allowSuperAdmin && user.is_super_admin) {
      return true;
    }
    
    // 确定要检查的部门ID
    let departmentId = options.departmentId || user.department_id;
    
    if (options.requireDepartment && !departmentId) {
      return false;
    }
    
    // 如果没有部门ID，只检查用户直接权限和角色权限
    if (!departmentId) {
      const directPermissions = await DepartmentPermissionService.getUserDirectPermissions(
        user.id,
        options.resource,
        options.action
      );
      
      const rolePermissions = await DepartmentPermissionService.getUserRolePermissions(
        user.id,
        options.resource,
        options.action
      );
      
      const allPermissions = [...directPermissions, ...rolePermissions];
      const matchingPermission = allPermissions.find(
        p => p.resource === options.resource && p.action === options.action
      );
      
      return matchingPermission?.granted || false;
    }
    
    // 使用部门权限服务检查权限
    return await DepartmentPermissionService.checkUserPermission(
      user.id,
      departmentId,
      options.resource,
      options.action
    );
  } catch (error) {
    console.error('检查用户权限失败:', error);
    return false;
  }
}

/**
 * 权限验证中间件
 * @param options 权限检查选项
 * @returns 中间件函数
 */
export function requirePermission(options: PermissionCheckOptions) {
  return async function middleware(request: AuthenticatedRequest): Promise<NextResponse | null> {
    try {
      // 提取用户信息
      const user = await extractUserFromRequest(request);
      
      if (!user) {
        return NextResponse.json(
          { success: false, error: '未授权访问' },
          { status: 401 }
        );
      }
      
      // 将用户信息附加到请求对象
      request.user = user;
      
      // 从URL参数或查询参数中获取部门ID
      const url = new URL(request.url);
      const pathDepartmentId = url.pathname.match(/\/departments\/([^/]+)/)?.[1];
      const queryDepartmentId = url.searchParams.get('department_id');
      
      const departmentId = options.departmentId || pathDepartmentId || queryDepartmentId || user.department_id;
      
      if (departmentId) {
        request.departmentId = departmentId;
      }
      
      // 检查权限
      const hasPermission = await checkUserPermission(user, {
        ...options,
        departmentId
      });
      
      if (!hasPermission) {
        return NextResponse.json(
          { 
            success: false, 
            error: '权限不足',
            details: {
              resource: options.resource,
              action: options.action,
              department_id: departmentId
            }
          },
          { status: 403 }
        );
      }
      
      // 权限验证通过，继续处理请求
      return null;
    } catch (error) {
      console.error('权限验证中间件错误:', error);
      return NextResponse.json(
        { success: false, error: '权限验证失败' },
        { status: 500 }
      );
    }
  };
}

/**
 * 管理员权限验证中间件
 * @param allowSuperAdmin 是否允许超级管理员
 * @returns 中间件函数
 */
export function requireAdmin(allowSuperAdmin: boolean = true) {
  return requirePermission({
    resource: 'admin',
    action: 'access',
    allowSuperAdmin
  });
}

/**
 * 部门管理权限验证中间件
 * @param departmentId 部门ID（可选）
 * @returns 中间件函数
 */
export function requireDepartmentManagement(departmentId?: string) {
  return requirePermission({
    resource: 'departments',
    action: 'manage',
    departmentId,
    requireDepartment: true,
    allowSuperAdmin: true
  });
}

/**
 * 用户管理权限验证中间件
 * @param departmentId 部门ID（可选）
 * @returns 中间件函数
 */
export function requireUserManagement(departmentId?: string) {
  return requirePermission({
    resource: 'users',
    action: 'manage',
    departmentId,
    allowSuperAdmin: true
  });
}

/**
 * 资源访问权限验证中间件
 * @param action 操作类型
 * @param departmentId 部门ID（可选）
 * @returns 中间件函数
 */
export function requireResourceAccess(action: string, departmentId?: string) {
  return requirePermission({
    resource: 'resources',
    action,
    departmentId,
    allowSuperAdmin: true
  });
}

/**
 * 报表访问权限验证中间件
 * @param action 操作类型
 * @param departmentId 部门ID（可选）
 * @returns 中间件函数
 */
export function requireReportAccess(action: string, departmentId?: string) {
  return requirePermission({
    resource: 'reports',
    action,
    departmentId,
    allowSuperAdmin: true
  });
}

/**
 * 权限检查辅助函数
 * 用于在API处理函数中直接检查权限
 * @param request 请求对象
 * @param options 权限检查选项
 * @returns 权限检查结果
 */
export async function checkPermissionInHandler(
  request: NextRequest,
  options: PermissionCheckOptions
): Promise<{ hasPermission: boolean; user?: AuthenticatedUser; error?: string }> {
  try {
    const user = await extractUserFromRequest(request);
    
    if (!user) {
      return { hasPermission: false, error: '未授权访问' };
    }
    
    const hasPermission = await checkUserPermission(user, options);
    
    return { hasPermission, user };
  } catch (error) {
    console.error('权限检查失败:', error);
    return { hasPermission: false, error: '权限检查失败' };
  }
}

/**
 * 批量权限检查
 * @param user 用户信息
 * @param permissions 权限列表
 * @returns 权限检查结果映射
 */
export async function checkMultiplePermissions(
  user: AuthenticatedUser,
  permissions: PermissionCheckOptions[]
): Promise<Record<string, boolean>> {
  const results: Record<string, boolean> = {};
  
  for (const permission of permissions) {
    const key = `${permission.resource}:${permission.action}`;
    try {
      results[key] = await checkUserPermission(user, permission);
    } catch (error) {
      console.error(`检查权限 ${key} 失败:`, error);
      results[key] = false;
    }
  }
  
  return results;
}

/**
 * 获取用户在特定部门的所有权限
 * @param user 用户信息
 * @param departmentId 部门ID
 * @returns 用户权限列表
 */
export async function getUserDepartmentPermissions(
  user: AuthenticatedUser,
  departmentId?: string
) {
  try {
    const targetDepartmentId = departmentId || user.department_id;
    
    if (!targetDepartmentId) {
      return [];
    }
    
    return await DepartmentPermissionService.getUserEffectivePermissions(
      user.id,
      targetDepartmentId
    );
  } catch (error) {
    console.error('获取用户部门权限失败:', error);
    return [];
  }
}

/**
 * 权限缓存管理
 */
export class PermissionCache {
  private static cache = new Map<string, { permissions: any; expires: number }>();
  private static readonly CACHE_TTL = 5 * 60 * 1000; // 5分钟
  
  /**
   * 获取缓存的权限
   * @param key 缓存键
   * @returns 缓存的权限或null
   */
  static get(key: string) {
    const cached = this.cache.get(key);
    
    if (!cached || cached.expires < Date.now()) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.permissions;
  }
  
  /**
   * 设置权限缓存
   * @param key 缓存键
   * @param permissions 权限数据
   */
  static set(key: string, permissions: any) {
    this.cache.set(key, {
      permissions,
      expires: Date.now() + this.CACHE_TTL
    });
  }
  
  /**
   * 清除特定用户的权限缓存
   * @param userId 用户ID
   */
  static clearUserCache(userId: string) {
    for (const [key] of this.cache) {
      if (key.startsWith(`user:${userId}:`)) {
        this.cache.delete(key);
      }
    }
  }
  
  /**
   * 清除特定部门的权限缓存
   * @param departmentId 部门ID
   */
  static clearDepartmentCache(departmentId: string) {
    for (const [key] of this.cache) {
      if (key.includes(`:dept:${departmentId}:`)) {
        this.cache.delete(key);
      }
    }
  }
  
  /**
   * 清除所有权限缓存
   */
  static clearAll() {
    this.cache.clear();
  }
}