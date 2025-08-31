/**
 * 导航辅助工具
 * 提供可靠的页面导航功能
 */

import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';

/**
 * 安全的返回操作
 * @param router Next.js路由实例
 * @param fallbackUrl 备用URL，当无法返回时使用
 */
export const safeGoBack = (router: AppRouterInstance, fallbackUrl: string = '/admin') => {
  try {
    // 检查是否在浏览器环境
    if (typeof window === 'undefined') {
      console.warn('不在浏览器环境，无法执行返回操作');
      return;
    }

    // 检查历史记录长度
    if (window.history.length > 1) {
      console.log('执行浏览器返回操作');
      router.back();
    } else {
      console.log('没有历史记录，导航到备用页面:', fallbackUrl);
      router.push(fallbackUrl);
    }
  } catch (error) {
    console.error('返回操作失败:', error);
    console.log('使用备用导航:', fallbackUrl);
    router.push(fallbackUrl);
  }
};

/**
 * 安全的页面导航
 * @param router Next.js路由实例
 * @param url 目标URL
 * @param fallbackUrl 备用URL
 */
export const safeNavigate = (router: AppRouterInstance, url: string, fallbackUrl?: string) => {
  try {
    console.log('导航到:', url);
    router.push(url);
  } catch (error) {
    console.error('导航失败:', error);
    if (fallbackUrl) {
      console.log('使用备用导航:', fallbackUrl);
      router.push(fallbackUrl);
    }
  }
};

/**
 * 管理员页面导航映射
 */
export const ADMIN_NAVIGATION_MAP = {
  // 主页面
  admin: '/admin',
  
  // 用户管理
  userList: '/admin?tab=user-list',
  userImport: '/admin?tab=users',
  
  // 考试系统
  examSystem: '/admin?tab=exam-system',
  examCreate: '/admin/exams/create',
  examDetail: (id: string) => `/admin/exams/${id}`,
  
  // 资源管理
  resources: '/admin?tab=resources',
  
  // 系统工具
  tools: '/admin?tab=tools',
  localExamSync: '/admin/local-exam-sync',
  
  // 调试工具
  debug: '/admin/debug',
  
  // 使用指南
  guide: '/admin?tab=guide'
};

/**
 * 获取页面的父级导航URL
 */
export const getParentNavigationUrl = (currentPath: string): string => {
  // 移除查询参数
  const basePath = currentPath.split('?')[0];
  
  // 根据路径确定父级页面
  if (basePath.startsWith('/admin/exams/create')) {
    return ADMIN_NAVIGATION_MAP.examSystem;
  }
  
  if (basePath.startsWith('/admin/exams/')) {
    return ADMIN_NAVIGATION_MAP.examSystem;
  }
  
  if (basePath.startsWith('/admin/users/') && basePath.includes('/exams')) {
    return ADMIN_NAVIGATION_MAP.userList;
  }
  
  if (basePath === '/admin/local-exam-sync') {
    return ADMIN_NAVIGATION_MAP.tools;
  }
  
  if (basePath === '/admin/debug') {
    return ADMIN_NAVIGATION_MAP.admin;
  }
  
  // 默认返回管理员首页
  return ADMIN_NAVIGATION_MAP.admin;
};

/**
 * 智能返回功能
 * 根据当前路径智能确定返回目标
 */
export const smartGoBack = (router: AppRouterInstance, currentPath?: string) => {
  try {
    // 获取当前路径
    const path = currentPath || (typeof window !== 'undefined' ? window.location.pathname + window.location.search : '');
    
    // 获取父级导航URL
    const parentUrl = getParentNavigationUrl(path);
    
    console.log('当前路径:', path);
    console.log('父级URL:', parentUrl);
    
    // 尝试使用浏览器返回
    if (typeof window !== 'undefined' && window.history.length > 1) {
      // 检查上一页是否是管理员页面
      const referrer = document.referrer;
      if (referrer && (referrer.includes('/admin') || referrer.includes(window.location.origin))) {
        console.log('使用浏览器返回');
        router.back();
        return;
      }
    }
    
    // 使用智能导航
    console.log('使用智能导航到父级页面');
    safeNavigate(router, parentUrl);
    
  } catch (error) {
    console.error('智能返回失败:', error);
    safeNavigate(router, ADMIN_NAVIGATION_MAP.admin);
  }
};

/**
 * 面包屑导航点击处理
 */
export const handleBreadcrumbClick = (router: AppRouterInstance, url: string) => {
  if (!url) return;
  
  try {
    console.log('面包屑导航到:', url);
    router.push(url);
  } catch (error) {
    console.error('面包屑导航失败:', error);
    safeNavigate(router, ADMIN_NAVIGATION_MAP.admin);
  }
};

/**
 * 检查URL是否有效
 */
export const isValidUrl = (url: string): boolean => {
  try {
    // 检查是否是相对路径
    if (url.startsWith('/')) {
      return true;
    }
    
    // 检查是否是完整URL
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * 格式化导航URL
 * 确保URL格式正确
 */
export const formatNavigationUrl = (url: string): string => {
  if (!url) return ADMIN_NAVIGATION_MAP.admin;
  
  // 移除多余的斜杠
  let formattedUrl = url.replace(/\/+/g, '/');
  
  // 确保以/开头
  if (!formattedUrl.startsWith('/')) {
    formattedUrl = '/' + formattedUrl;
  }
  
  return formattedUrl;
};

/**
 * 延迟导航
 * 在某些情况下需要延迟执行导航
 */
export const delayedNavigate = (
  router: AppRouterInstance, 
  url: string, 
  delay: number = 100
) => {
  setTimeout(() => {
    safeNavigate(router, url);
  }, delay);
};

/**
 * 导航历史管理
 */
export class NavigationHistory {
  private static history: string[] = [];
  private static maxSize = 10;
  
  static push(url: string) {
    this.history.unshift(url);
    if (this.history.length > this.maxSize) {
      this.history = this.history.slice(0, this.maxSize);
    }
  }
  
  static pop(): string | undefined {
    return this.history.shift();
  }
  
  static peek(): string | undefined {
    return this.history[0];
  }
  
  static clear() {
    this.history = [];
  }
  
  static getHistory(): string[] {
    return [...this.history];
  }
}
