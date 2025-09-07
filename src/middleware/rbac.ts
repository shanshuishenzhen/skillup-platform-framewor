import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { supabase } from '@/lib/supabase';
import { getEnvConfig } from '@/utils/envConfig';

/**
 * 用户角色枚举
 */
export enum UserRole {
  USER = 'USER',
  TEACHER = 'TEACHER',
  ADMIN = 'ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN'
}

/**
 * JWT载荷接口
 */
export interface JWTPayload {
  userId: string;
  phone: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

/**
 * RBAC验证结果接口
 */
export interface RBACResult {
  success: boolean;
  user?: JWTPayload;
  message?: string;
}

/**
 * RBAC权限验证错误类
 */
export class RBACError extends Error {
  public readonly statusCode: number;
  public readonly code: string;

  constructor(message: string, statusCode: number = 403, code: string = 'RBAC_ERROR') {
    super(message);
    this.name = 'RBACError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

/**
 * 从请求头中提取JWT令牌
 * @param req Next.js请求对象
 * @returns JWT令牌字符串或null
 */
export function extractTokenFromRequest(req: NextRequest): string | null {
  // 从Authorization头中提取Bearer token
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // 从Cookie中提取token
  const cookieToken = req.cookies.get('auth-token')?.value;
  if (cookieToken) {
    return cookieToken;
  }

  return null;
}

/**
 * 验证JWT令牌并解析用户信息
 * @param token JWT令牌
 * @returns 解析后的用户信息或null
 */
export async function verifyJWTToken(token: string): Promise<JWTPayload | null> {
  try {
    const config = getEnvConfig();
    const decoded = jwt.verify(token, config.security.jwtSecret) as any;
    
    // 验证令牌是否过期
    if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) {
      throw new RBACError('令牌已过期', 401, 'TOKEN_EXPIRED');
    }

    // 将字符串角色转换为UserRole枚举
    let userRole: UserRole;
    const roleString = decoded.role;
    
    if (typeof roleString === 'string') {
      switch (roleString.toUpperCase()) {
        case 'SUPER_ADMIN':
          userRole = UserRole.SUPER_ADMIN;
          break;
        case 'ADMIN':
          userRole = UserRole.ADMIN;
          break;
        case 'USER':
          userRole = UserRole.USER;
          break;
        default:
          console.warn('⚠️ 未知角色类型，默认设置为USER:', roleString);
          userRole = UserRole.USER;
      }
    } else {
      // 如果已经是枚举类型，直接使用
      userRole = roleString as UserRole;
    }

    const result: JWTPayload = {
      userId: decoded.userId,
      phone: decoded.phone,
      role: userRole,
      iat: decoded.iat,
      exp: decoded.exp
    };
    
    return result;
  } catch (error) {
    console.error('❌ JWT令牌验证失败:', error);
    if (error instanceof jwt.JsonWebTokenError) {
      throw new RBACError('无效的令牌', 401, 'INVALID_TOKEN');
    }
    if (error instanceof jwt.TokenExpiredError) {
      throw new RBACError('令牌已过期', 401, 'TOKEN_EXPIRED');
    }
    throw error;
  }
}

/**
 * 从数据库获取用户的最新角色信息
 * @param userId 用户ID
 * @returns 用户角色或null
 */
export async function getUserRoleFromDB(userId: string): Promise<UserRole | null> {
  try {
    // 首先尝试从admin_users表查询
    const { data: adminUser, error: adminError } = await supabase
      .from('admin_users')
      .select('role')
      .eq('id', userId)
      .single();

    if (!adminError && adminUser) {
      // 将数据库中的角色映射到枚举
      switch (adminUser.role) {
        case 'super_admin':
          return UserRole.SUPER_ADMIN;
        case 'admin':
          return UserRole.ADMIN;
        default:
          return UserRole.ADMIN; // 默认为管理员
      }
    }

    // 如果不是管理员，再从users表查询
    const { data: user, error } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    if (error || !user) {
      return null;
    }

    // 将数据库中的角色映射到枚举
    switch (user.role) {
      case 'admin':
        return UserRole.ADMIN;
      case 'super_admin':
        return UserRole.SUPER_ADMIN;
      case 'teacher':
        return UserRole.TEACHER;
      case 'user':
        return UserRole.USER;
      default:
        return user.role as UserRole;
    }
  } catch (error) {
    console.error('获取用户角色失败:', error);
    return null;
  }
}

/**
 * 验证用户是否具有指定角色
 * @param userRole 用户当前角色
 * @param requiredRoles 需要的角色列表
 * @returns 是否具有权限
 */
export function hasRequiredRole(userRole: UserRole, requiredRoles: UserRole[]): boolean {
  return requiredRoles.includes(userRole);
}

/**
 * 检查用户是否为管理员
 * @param userRole 用户角色
 * @returns 是否为管理员
 */
export function isAdmin(userRole: UserRole): boolean {
  return userRole === UserRole.ADMIN || userRole === UserRole.SUPER_ADMIN;
}

/**
 * 检查用户是否为超级管理员
 * @param userRole 用户角色
 * @returns 是否为超级管理员
 */
export function isSuperAdmin(userRole: UserRole): boolean {
  return userRole === UserRole.SUPER_ADMIN;
}

/**
 * RBAC权限验证中间件
 * @param req Next.js请求对象
 * @param requiredRoles 需要的角色列表
 * @param options 验证选项
 * @returns RBAC验证结果
 */
export async function verifyRBAC(
  req: NextRequest,
  requiredRoles: UserRole[],
  options: {
    checkDBRole?: boolean; // 是否从数据库检查最新角色
    allowExpiredToken?: boolean; // 是否允许过期令牌
  } = {}
): Promise<RBACResult> {
  try {
    // 提取JWT令牌
    const token = extractTokenFromRequest(req);
    if (!token) {
      return {
        success: false,
        message: '未提供认证令牌'
      };
    }

    // 验证JWT令牌
    let user: JWTPayload;
    try {
      const decoded = await verifyJWTToken(token);
      if (!decoded) {
        return {
          success: false,
          message: '无效的令牌'
        };
      }
      user = decoded;
    } catch (error) {
      if (error instanceof RBACError) {
        return {
          success: false,
          message: error.message
        };
      }
      return {
        success: false,
        message: '令牌验证失败'
      };
    }

    // 如果需要，从数据库获取最新角色信息
    let currentRole = user.role;
    
    if (options.checkDBRole) {
      const dbRole = await getUserRoleFromDB(user.userId);
      if (dbRole) {
        currentRole = dbRole;
      }
    }

    // 检查角色权限
    
    if (!hasRequiredRole(currentRole, requiredRoles)) {
      return {
        success: false,
        message: '权限不足，需要以下角色之一: ' + requiredRoles.join(', ')
      };
    }

    return {
      success: true,
      user: {
        ...user,
        role: currentRole
      }
    };
  } catch (error) {
    console.error('RBAC验证过程中发生错误:', error);
    return {
      success: false,
      message: '权限验证失败'
    };
  }
}

/**
 * 管理员权限验证中间件
 * @param req Next.js请求对象
 * @param roles 允许的角色列表（可选，默认为管理员和超级管理员）
 * @param options 验证选项
 * @returns RBAC验证结果
 */
export async function verifyAdminAccess(
  req: NextRequest,
  roles?: string[] | {
    checkDBRole?: boolean;
    allowExpiredToken?: boolean;
  },
  options?: {
    checkDBRole?: boolean;
    allowExpiredToken?: boolean;
  }
): Promise<RBACResult> {
  // 处理参数重载
  let allowedRoles: UserRole[];
  let verifyOptions: { checkDBRole?: boolean; allowExpiredToken?: boolean } = {};

  if (Array.isArray(roles)) {
    // 如果第二个参数是角色数组
    allowedRoles = roles.map(role => {
      switch (role) {
        case 'admin': return UserRole.ADMIN;
        case 'teacher': return UserRole.TEACHER;
        case 'student': return UserRole.USER;
        case 'super_admin': return UserRole.SUPER_ADMIN;
        default: return UserRole.USER;
      }
    });
    verifyOptions = options || {};
  } else {
    // 如果第二个参数是选项对象或未提供
    allowedRoles = [UserRole.ADMIN, UserRole.SUPER_ADMIN];
    verifyOptions = (roles as any) || {};
  }

  return verifyRBAC(req, allowedRoles, verifyOptions);
}

/**
 * 超级管理员权限验证中间件
 * @param req Next.js请求对象
 * @param options 验证选项
 * @returns RBAC验证结果
 */
export async function verifySuperAdminAccess(
  req: NextRequest,
  options?: {
    checkDBRole?: boolean;
    allowExpiredToken?: boolean;
  }
): Promise<RBACResult> {
  return verifyRBAC(req, [UserRole.SUPER_ADMIN], options);
}

/**
 * 用户权限验证中间件（任何已认证用户）
 * @param req Next.js请求对象
 * @param options 验证选项
 * @returns RBAC验证结果
 */
export async function verifyUserAccess(
  req: NextRequest,
  options?: {
    checkDBRole?: boolean;
    allowExpiredToken?: boolean;
  }
): Promise<RBACResult> {
  return verifyRBAC(req, [UserRole.USER, UserRole.TEACHER, UserRole.ADMIN, UserRole.SUPER_ADMIN], options);
}

/**
 * 创建RBAC响应错误
 * @param message 错误消息
 * @param statusCode HTTP状态码
 * @returns NextResponse 错误响应
 */
export function createRBACErrorResponse(message: string, statusCode: number = 403): NextResponse {
  return NextResponse.json(
    { error: message },
    { status: statusCode }
  );
}