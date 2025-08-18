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
}

// 权限级别定义
export const PERMISSION_LEVELS = {
  GUEST: 0,        // 游客用户
  REGISTERED: 1,   // 注册用户
  PREMIUM: 2       // 付费用户
} as const;

// 用户类型到权限级别的映射
export const USER_TYPE_TO_PERMISSION: Record<UserType, number> = {
  guest: PERMISSION_LEVELS.GUEST,
  registered: PERMISSION_LEVELS.REGISTERED,
  premium: PERMISSION_LEVELS.PREMIUM
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
  
  const userLevel = USER_TYPE_TO_PERMISSION[currentUser.userType];
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
  
  if (!isPremiumUser(currentUser)) {
    return false;
  }
  
  return isFaceVerified(currentUser);
}

/**
 * 用户登出
 * 清除localStorage中的用户信息和token
 */
export function logout(): void {
  if (typeof window === 'undefined') return;
  
  localStorage.removeItem('user');
  localStorage.removeItem('token');
  
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