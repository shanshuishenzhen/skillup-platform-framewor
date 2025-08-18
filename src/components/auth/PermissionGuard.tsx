/**
 * 权限保护组件
 * 用于在React组件中进行权限控制，根据用户权限显示不同内容
 */

'use client';

import React, { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { hasPermission, getUpgradeMessage, getCurrentUser, PERMISSION_LEVELS } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock, UserPlus, CreditCard } from 'lucide-react';

interface PermissionGuardProps {
  /** 所需权限级别 */
  requiredLevel: number;
  /** 有权限时显示的内容 */
  children: ReactNode;
  /** 无权限时显示的内容（可选，不传则显示默认升级提示） */
  fallback?: ReactNode;
  /** 是否在无权限时自动跳转到登录页 */
  redirectToLogin?: boolean;
  /** 自定义无权限提示信息 */
  customMessage?: string;
  /** 是否显示升级按钮 */
  showUpgradeButton?: boolean;
}

/**
 * 权限保护组件
 * @param props 组件属性
 * @returns React组件
 */
export function PermissionGuard({
  requiredLevel,
  children,
  fallback,
  redirectToLogin = false,
  customMessage,
  showUpgradeButton = true
}: PermissionGuardProps) {
  const router = useRouter();
  const user = getCurrentUser();
  
  // 检查权限
  if (hasPermission(requiredLevel, user)) {
    return <>{children}</>;
  }
  
  // 如果设置了自动跳转到登录页
  if (redirectToLogin && !user) {
    router.push('/login');
    return null;
  }
  
  // 如果有自定义fallback内容
  if (fallback) {
    return <>{fallback}</>;
  }
  
  // 默认权限不足提示
  const message = customMessage || getUpgradeMessage(requiredLevel, user);
  
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
          <Lock className="w-6 h-6 text-orange-600" />
        </div>
        <CardTitle className="text-xl font-semibold">权限不足</CardTitle>
        <CardDescription className="text-gray-600">
          {message}
        </CardDescription>
      </CardHeader>
      
      {showUpgradeButton && (
        <CardContent className="text-center space-y-3">
          {!user ? (
            <>
              <Button 
                onClick={() => router.push('/register')}
                className="w-full bg-orange-500 hover:bg-orange-600"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                立即注册
              </Button>
              <Button 
                variant="outline" 
                onClick={() => router.push('/login')}
                className="w-full"
              >
                已有账号？登录
              </Button>
            </>
          ) : user.userType === 'registered' && requiredLevel === PERMISSION_LEVELS.PREMIUM ? (
            <Button 
              onClick={() => router.push('/upgrade')}
              className="w-full bg-orange-500 hover:bg-orange-600"
            >
              <CreditCard className="w-4 h-4 mr-2" />
              升级为付费用户
            </Button>
          ) : user.userType === 'premium' && !user.faceVerified ? (
            <Button 
              onClick={() => router.push('/face-verification')}
              className="w-full bg-orange-500 hover:bg-orange-600"
            >
              <Lock className="w-4 h-4 mr-2" />
              完成人脸识别验证
            </Button>
          ) : null}
        </CardContent>
      )}
    </Card>
  );
}

/**
 * 简化的权限检查Hook
 * @param requiredLevel 所需权限级别
 * @returns 权限检查结果和相关信息
 */
export function usePermission(requiredLevel: number) {
  const user = getCurrentUser();
  const hasAccess = hasPermission(requiredLevel, user);
  const upgradeMessage = getUpgradeMessage(requiredLevel, user);
  
  return {
    hasAccess,
    user,
    upgradeMessage,
    isGuest: !user,
    isRegistered: user?.userType === 'registered',
    isPremium: user?.userType === 'premium',
    isFaceVerified: user?.faceVerified === true
  };
}

/**
 * 仅注册用户可访问的组件包装器
 */
export function RegisteredOnly({ children, ...props }: Omit<PermissionGuardProps, 'requiredLevel'>) {
  return (
    <PermissionGuard requiredLevel={PERMISSION_LEVELS.REGISTERED} {...props}>
      {children}
    </PermissionGuard>
  );
}

/**
 * 仅付费用户可访问的组件包装器
 */
export function PremiumOnly({ children, ...props }: Omit<PermissionGuardProps, 'requiredLevel'>) {
  return (
    <PermissionGuard requiredLevel={PERMISSION_LEVELS.PREMIUM} {...props}>
      {children}
    </PermissionGuard>
  );
}