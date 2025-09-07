/**
 * 用户认证和权限管理工具函数
 * 提供用户登录状态检查、权限验证、路由保护等功能
 */

import { UserType } from './supabase';

// 用户信息接口
export interface User {
  id: string;
  phone: string;
  userType: UserType;
  faceVerified?: boolean;
  createdAt: string;
  updatedAt: string;
  // 管理员用户特有字段
  username?: string;
  email?: string;
  real_name?: string;
  role?: string;
  permissions?: string[];
  status?: string;
  department?: string;
  position?: string;
}

// 权限级别定义
export const PERMISSION_LEVELS = {
  GUEST: 0,        // 游客用户
  REGISTERED: 1,   // 注册用户
  PREMIUM: 2,      // 付费用户
  ADMIN: 3,        // 管理员
  SUPER_ADMIN: 4   // 超级管理员
} as const;

// 用户类型到权限级别的映射
export const USER_TYPE_TO_PERMISSION: Record<UserType, number> = {
  guest: PERMISSION_LEVELS.GUEST,
  registered: PERMISSION_LEVELS.REGISTERED,
  premium: PERMISSION_LEVELS.PREMIUM
};

// 管理员角色到权限级别的映射
export const ADMIN_ROLE_TO_PERMISSION: Record<string, number> = {
  admin: PERMISSION_LEVELS.ADMIN,
  super_admin: PERMISSION_LEVELS.SUPER_ADMIN
};

/**
 * 从localStorage获取当前用户信息
 * @returns 用户信息或null
 */
export function getCurrentUser(): User | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  } catch (error) {
    console.error('获取用户信息失败:', error);
    return null;
  }
}

/**
 * 从localStorage获取认证token
 * @returns token字符串或null
 */
export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  
  return localStorage.getItem('token');
}

/**
 * 检查用户是否已登录
 * @returns 是否已登录
 */
export function isAuthenticated(): boolean {
  const user = getCurrentUser();
  const token = getAuthToken();
  return !!(user && token);
}

/**
 * 检查用户是否具有指定权限级别
 * @param requiredLevel 所需权限级别
 * @param user 用户信息（可选，不传则从localStorage获取）
 * @returns 是否具有权限
 */
export function hasPermission(requiredLevel: number, user?: User | null): boolean {
  const currentUser = user || getCurrentUser();
  
  if (!currentUser) {
    return requiredLevel <= PERMISSION_LEVELS.GUEST;
  }
  
  // 检查是否为管理员用户
  if (currentUser.role && ADMIN_ROLE_TO_PERMISSION[currentUser.role]) {
    const adminLevel = ADMIN_ROLE_TO_PERMISSION[currentUser.role];
    return adminLevel >= requiredLevel;
  }
  
  const userLevel = USER_TYPE_TO_PERMISSION[currentUser.userType];
  
  // 如果需要付费权限，还需要检查人脸验证状态
  if (requiredLevel === PERMISSION_LEVELS.PREMIUM && userLevel >= PERMISSION_LEVELS.PREMIUM) {
    return isFaceVerified(currentUser);
  }
  
  return userLevel >= requiredLevel;
}

/**
 * 检查用户是否为注册用户
 * @param user 用户信息（可选）
 * @returns 是否为注册用户
 */
export function isRegisteredUser(user?: User | null): boolean {
  return hasPermission(PERMISSION_LEVELS.REGISTERED, user);
}

/**
 * 检查用户是否为付费用户
 * @param user 用户信息（可选）
 * @returns 是否为付费用户
 */
export function isPremiumUser(user?: User | null): boolean {
  return hasPermission(PERMISSION_LEVELS.PREMIUM, user);
}

/**
 * 检查付费用户是否已完成人脸识别验证
 * @param user 用户信息（可选）
 * @returns 是否已完成人脸识别验证
 */
export function isFaceVerified(user?: User | null): boolean {
  const currentUser = user || getCurrentUser();
  
  if (!currentUser || currentUser.userType !== 'premium') {
    return true; // 非付费用户不需要人脸识别
  }
  
  return currentUser.faceVerified === true;
}

/**
 * 检查用户是否可以访问付费内容
 * @param user 用户信息（可选）
 * @returns 是否可以访问付费内容
 */
export function canAccessPremiumContent(user?: User | null): boolean {
  const currentUser = user || getCurrentUser();
  
  // 管理员可以访问所有内容
  if (isAdmin(currentUser)) {
    return true;
  }
  
  if (!isPremiumUser(currentUser)) {
    return false;
  }
  
  return isFaceVerified(currentUser);
}

/**
 * 检查用户是否为管理员
 * @param user 用户信息（可选）
 * @returns 是否为管理员
 */
export function isAdmin(user?: User | null): boolean {
  const currentUser = user || getCurrentUser();
  
  if (!currentUser || !currentUser.role) {
    return false;
  }
  
  return ADMIN_ROLE_TO_PERMISSION[currentUser.role] >= PERMISSION_LEVELS.ADMIN;
}

/**
 * 检查用户是否为超级管理员
 * @param user 用户信息（可选）
 * @returns 是否为超级管理员
 */
export function isSuperAdmin(user?: User | null): boolean {
  const currentUser = user || getCurrentUser();
  
  if (!currentUser || !currentUser.role) {
    return false;
  }
  
  return currentUser.role === 'super_admin';
}

/**
 * 验证管理员访问权限（用于API路由）
 * @param request Next.js请求对象
 * @returns 用户信息或抛出错误
 */
export async function verifyAdminAccess(request: any): Promise<User> {
  // 简化版本：从请求头获取用户信息
  // 在实际项目中，这里应该验证JWT token等
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader) {
    throw new Error('未提供认证信息');
  }
  
  // 模拟管理员用户
  const mockAdminUser: User = {
    id: 'admin-user-id',
    phone: '13800138000',
    userType: UserType.PREMIUM,
    role: 'admin',
    username: 'admin',
    email: 'admin@example.com',
    real_name: '管理员',
    permissions: ['exam:read', 'exam:write', 'question:read', 'question:write'],
    status: 'active',
    department: 'IT',
    position: '系统管理员',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  return mockAdminUser;
}

/**
 * 检查用户是否可以访问管理后台
 * @param user 用户信息（可选）
 * @returns 是否可以访问管理后台
 */
export function canAccessAdmin(user?: User | null): boolean {
  return isAdmin(user);
}

/**
 * 用户登出
 * 清除localStorage中的用户信息和token
 */
export function logout(): void {
  if (typeof window === 'undefined') return;
  
  localStorage.removeItem('user');
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  
  // 可以在这里添加其他登出逻辑，如清除其他缓存数据
}

/**
 * 更新localStorage中的用户信息
 * @param user 新的用户信息
 */
export function updateUserInfo(user: User): void {
  if (typeof window === 'undefined') return;
  
  localStorage.setItem('user', JSON.stringify(user));
}

/**
 * 获取用户类型的中文显示名称
 * @param userType 用户类型
 * @returns 中文显示名称
 */
export function getUserTypeDisplayName(userType: UserType): string {
  const displayNames: Record<UserType, string> = {
    guest: '游客用户',
    registered: '注册用户',
    premium: '付费用户'
  };
  
  return displayNames[userType] || '未知用户';
}

/**
 * 检查用户是否需要升级权限才能访问某个功能
 * @param requiredLevel 所需权限级别
 * @param user 用户信息（可选）
 * @returns 升级提示信息，如果不需要升级则返回null
 */
export function getUpgradeMessage(requiredLevel: number, user?: User | null): string | null {
  const currentUser = user || getCurrentUser();
  
  if (hasPermission(requiredLevel, currentUser)) {
    return null;
  }
  
  if (requiredLevel === PERMISSION_LEVELS.REGISTERED) {
    return '此功能需要注册用户权限，请先注册登录';
  }
  
  if (requiredLevel === PERMISSION_LEVELS.PREMIUM) {
    if (!currentUser) {
      return '此功能需要付费用户权限，请先注册并升级为付费用户';
    }
    
    if (currentUser.userType === 'registered') {
      return '此功能需要付费用户权限，请升级为付费用户';
    }
    
    if (currentUser.userType === 'premium' && !isFaceVerified(currentUser)) {
      return '请先完成人脸识别验证';
    }
  }
  
  return '权限不足，无法访问此功能';
}

/**
 * 验证管理员认证（verifyAdminAccess的别名）
 * @param request Next.js请求对象
 * @returns 用户信息或抛出错误
 */
export const verifyAdminAuth = verifyAdminAccess;