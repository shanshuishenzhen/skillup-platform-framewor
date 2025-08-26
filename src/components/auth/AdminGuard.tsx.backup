'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, AlertCircle } from 'lucide-react';

interface AdminGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * 管理员权限保护组件
 * 用于保护需要管理员权限的页面和组件
 * @param children - 需要保护的子组件
 * @param fallback - 权限不足时显示的组件
 */
export default function AdminGuard({ children, fallback }: AdminGuardProps) {
  const { user, isLoggedIn, loading } = useAuth();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkAdminPermission = async () => {
      if (loading) return;
      
      if (!isLoggedIn || !user) {
        setIsAdmin(false);
        setChecking(false);
        return;
      }

      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setIsAdmin(false);
          setChecking(false);
          return;
        }

        const response = await fetch('/api/admin/check-permission', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const result = await response.json();
          setIsAdmin(result.success === true);
        } else {
          setIsAdmin(false);
        }
      } catch (error) {
        console.error('检查管理员权限失败:', error);
        setIsAdmin(false);
      } finally {
        setChecking(false);
      }
    };

    checkAdminPermission();
  }, [isLoggedIn, user, loading]);

  // 正在检查权限
  if (loading || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600 dark:text-gray-400">正在验证权限...</p>
        </div>
      </div>
    );
  }

  // 未登录
  if (!isLoggedIn || !user) {
    if (fallback) {
      return <>{fallback}</>;
    }
    
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            需要登录
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            请先登录您的账户以访问此页面。
          </p>
          <button
            onClick={() => router.push('/login')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            前往登录
          </button>
        </div>
      </div>
    );
  }

  // 权限不足
  if (isAdmin === false) {
    if (fallback) {
      return <>{fallback}</>;
    }
    
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            权限不足
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            您没有访问管理后台的权限。如需帮助，请联系系统管理员。
          </p>
          <div className="space-y-3">
            <button
              onClick={() => router.push('/')}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              返回首页
            </button>
            <button
              onClick={() => router.back()}
              className="w-full bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 font-medium py-2 px-4 rounded-lg transition-colors"
            >
              返回上一页
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 有权限，渲染子组件
  return <>{children}</>;
}

/**
 * 管理员权限检查Hook
 * 用于在组件中检查当前用户是否具有管理员权限
 * @returns {object} 包含权限状态和检查函数的对象
 */
export function useAdminPermission() {
  const { user, isLoggedIn } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);

  const checkPermission = async () => {
    if (!isLoggedIn || !user) {
      setIsAdmin(false);
      return false;
    }

    setChecking(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setIsAdmin(false);
        return false;
      }

      const response = await fetch('/api/admin/check-permission', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        const hasPermission = result.success === true;
        setIsAdmin(hasPermission);
        return hasPermission;
      } else {
        setIsAdmin(false);
        return false;
      }
    } catch (error) {
      console.error('检查管理员权限失败:', error);
      setIsAdmin(false);
      return false;
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    checkPermission();
  }, [isLoggedIn, user]);

  return {
    isAdmin,
    checking,
    checkPermission,
  };
}