/**
 * 用户认证状态管理Hook
 * 提供用户登录状态、权限信息的统一管理和响应式更新
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  User, 
  getCurrentUser, 
  getAuthToken, 
  isAuthenticated, 
  hasPermission, 
  isPremiumUser, 
  isRegisteredUser, 
  isFaceVerified, 
  canAccessPremiumContent,
  isAdmin,
  isSuperAdmin,
  canAccessAdmin,
  logout as authLogout,
  updateUserInfo,
  PERMISSION_LEVELS
} from '@/lib/auth';

/**
 * 认证状态接口
 */
interface AuthState {
  /** 当前用户信息 */
  user: User | null;
  /** 认证token */
  token: string | null;
  /** 是否已登录 */
  isLoggedIn: boolean;
  /** 是否为注册用户 */
  isRegistered: boolean;
  /** 是否为付费用户 */
  isPremium: boolean;
  /** 是否已完成人脸识别 */
  faceVerified: boolean;
  /** 是否可以访问付费内容 */
  canAccessPremium: boolean;
  /** 加载状态 */
  loading: boolean;
}

/**
 * 用户认证Hook
 * @returns 认证状态和相关操作函数
 */
export function useAuth() {
  const router = useRouter();
  
  // 认证状态
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    token: null,
    isLoggedIn: false,
    isRegistered: false,
    isPremium: false,
    faceVerified: false,
    canAccessPremium: false,
    loading: true
  });

  /**
   * 更新认证状态
   */
  const updateAuthState = useCallback(() => {
    const user = getCurrentUser();
    const token = getAuthToken();
    const isLoggedIn = isAuthenticated();
    
    setAuthState({
      user,
      token,
      isLoggedIn,
      isRegistered: isRegisteredUser(user),
      isPremium: isPremiumUser(user),
      faceVerified: isFaceVerified(user),
      canAccessPremium: canAccessPremiumContent(user),
      loading: false
    });
  }, []);

  /**
   * 用户登录
   * @param userData 用户信息
   * @param token 认证token
   */
  const login = useCallback((userData: Partial<User>, token: string) => {
    if (typeof window === 'undefined') return;
    
    const user: User = {
      ...userData,
      id: userData.id || '',
      phone: userData.phone || '',
      userType: userData.userType || 'guest',
      createdAt: userData.createdAt || new Date().toISOString(),
      updatedAt: userData.updatedAt || new Date().toISOString()
    };
    
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('token', token);
    updateAuthState();
  }, [updateAuthState]);

  /**
   * 管理员登录
   * @param adminData 管理员信息
   * @param token 认证token
   */
  const adminLogin = useCallback((adminData: Partial<User>, token: string) => {
    if (typeof window === 'undefined') return;
    
    // 为管理员用户添加特殊标识，保留role字段
    const adminUser: User = {
      ...adminData,
      id: adminData.id || '',
      phone: adminData.phone || '',
      userType: 'admin' as const,
      // 保留管理员的role字段，这对权限验证很重要
      role: adminData.role || 'admin',
      createdAt: adminData.createdAt || new Date().toISOString(),
      updatedAt: adminData.updatedAt || new Date().toISOString()
    };
    
    localStorage.setItem('user', JSON.stringify(adminUser));
    localStorage.setItem('token', token);
    updateAuthState();
  }, [updateAuthState]);

  /**
   * 用户登出
   * @param redirectTo 登出后跳转的页面，默认为首页
   */
  const logout = useCallback((redirectTo: string = '/') => {
    authLogout();
    updateAuthState();
    router.push(redirectTo);
  }, [updateAuthState, router]);

  /**
   * 更新用户信息
   * @param updatedUser 更新后的用户信息
   */
  const updateUser = useCallback((updatedUser: Partial<User>) => {
    const currentUser = getCurrentUser();
    if (!currentUser) return;
    
    const newUser = { ...currentUser, ...updatedUser };
    updateUserInfo(newUser);
    updateAuthState();
  }, [updateAuthState]);

  /**
   * 检查用户权限
   * @param requiredLevel 所需权限级别
   * @returns 是否具有权限
   */
  const checkPermission = useCallback((requiredLevel: number): boolean => {
    return hasPermission(requiredLevel, authState.user);
  }, [authState.user]);

  /**
   * 要求用户登录
   * 如果用户未登录，跳转到登录页
   * @param returnUrl 登录成功后返回的URL
   */
  const requireAuth = useCallback((returnUrl?: string) => {
    if (!authState.isLoggedIn) {
      const url = returnUrl ? `/login?returnUrl=${encodeURIComponent(returnUrl)}` : '/login';
      router.push(url);
      return false;
    }
    return true;
  }, [authState.isLoggedIn, router]);

  /**
   * 要求注册用户权限
   * @param returnUrl 升级成功后返回的URL
   */
  const requireRegistered = useCallback((returnUrl?: string) => {
    if (!authState.isRegistered) {
      if (!authState.isLoggedIn) {
        const url = returnUrl ? `/register?returnUrl=${encodeURIComponent(returnUrl)}` : '/register';
        router.push(url);
      }
      return false;
    }
    return true;
  }, [authState.isLoggedIn, authState.isRegistered, router]);

  /**
   * 要求付费用户权限
   * @param returnUrl 升级成功后返回的URL
   */
  const requirePremium = useCallback((returnUrl?: string) => {
    if (!authState.canAccessPremium) {
      if (!authState.isLoggedIn) {
        const url = returnUrl ? `/register?returnUrl=${encodeURIComponent(returnUrl)}` : '/register';
        router.push(url);
      } else if (!authState.isPremium) {
        const url = returnUrl ? `/upgrade?returnUrl=${encodeURIComponent(returnUrl)}` : '/upgrade';
        router.push(url);
      } else if (!authState.faceVerified) {
        const url = returnUrl ? `/face-verification?returnUrl=${encodeURIComponent(returnUrl)}` : '/face-verification';
        router.push(url);
      }
      return false;
    }
    return true;
  }, [authState, router]);

  /**
   * 获取用户显示名称
   */
  const getDisplayName = useCallback((): string => {
    if (!authState.user) return '游客';
    
    // 可以根据需要自定义显示逻辑
    return authState.user.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
  }, [authState.user]);

  // 组件挂载时初始化认证状态
  useEffect(() => {
    updateAuthState();
  }, [updateAuthState]);

  // 监听localStorage变化（用于多标签页同步）
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'user' || e.key === 'token') {
        updateAuthState();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [updateAuthState]);

  return {
    // 状态
    ...authState,
    
    // 操作函数
    login,
    adminLogin,
    logout,
    updateUser,
    
    // 权限检查
    checkPermission,
    requireAuth,
    requireRegistered,
    requirePremium,
    canAccessAdmin: () => canAccessAdmin(authState.user),
    
    // 管理员权限检查
    isAdmin: () => isAdmin(authState.user),
    isSuperAdmin: () => isSuperAdmin(authState.user),
    
    // 工具函数
    getDisplayName,
    
    // 权限常量
    PERMISSION_LEVELS
  };
}

/**
 * 简化的登录状态Hook
 * 仅返回基本的登录状态信息
 */
export function useAuthStatus() {
  const { isLoggedIn, user, loading } = useAuth();
  
  return {
    isLoggedIn,
    user,
    loading
  };
}

/**
 * 权限检查Hook
 * @param requiredLevel 所需权限级别
 */
export function usePermissionCheck(requiredLevel: number) {
  const { checkPermission, user } = useAuth();
  
  return {
    hasPermission: checkPermission(requiredLevel),
    user
  };
}