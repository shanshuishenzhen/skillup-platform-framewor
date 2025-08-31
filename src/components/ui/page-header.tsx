/**
 * 通用页面头部组件
 * 提供统一的页面标题、面包屑导航和返回按钮
 */

'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Home, ChevronRight } from 'lucide-react';
import { smartGoBack, handleBreadcrumbClick } from '@/utils/navigationHelper';

interface BreadcrumbItem {
  label: string;
  href?: string;
  current?: boolean;
}

interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  showBackButton?: boolean;
  backUrl?: string;
  backLabel?: string;
  actions?: React.ReactNode;
  badge?: {
    text: string;
    variant?: 'default' | 'secondary' | 'destructive' | 'outline';
    className?: string;
  };
  className?: string;
}

export default function PageHeader({
  title,
  description,
  breadcrumbs = [],
  showBackButton = true,
  backUrl,
  backLabel = '返回',
  actions,
  badge,
  className = ''
}: PageHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();

  const handleBack = () => {
    if (backUrl) {
      console.log('导航到指定URL:', backUrl);
      router.push(backUrl);
    } else {
      console.log('使用智能返回功能');
      smartGoBack(router, pathname);
    }
  };

  const handleBreadcrumbNavigation = (href: string) => {
    handleBreadcrumbClick(router, href);
  };

  return (
    <div className={`bg-white border-b border-gray-200 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-6">
          {/* 面包屑导航 */}
          {breadcrumbs.length > 0 && (
            <nav className="flex mb-4" aria-label="Breadcrumb">
              <ol className="flex items-center space-x-2">
                {breadcrumbs.map((item, index) => (
                  <li key={index} className="flex items-center">
                    {index > 0 && (
                      <ChevronRight className="w-4 h-4 text-gray-400 mx-2" />
                    )}
                    {item.current ? (
                      <span className="text-sm font-medium text-gray-900">
                        {item.label}
                      </span>
                    ) : (
                      <button
                        onClick={() => item.href && handleBreadcrumbNavigation(item.href)}
                        className="text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
                        disabled={!item.href}
                      >
                        {item.label}
                      </button>
                    )}
                  </li>
                ))}
              </ol>
            </nav>
          )}

          {/* 主要内容 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* 返回按钮 */}
              {showBackButton && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBack}
                  className="flex items-center text-gray-600 hover:text-gray-900"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  {backLabel}
                </Button>
              )}

              {/* 标题和描述 */}
              <div>
                <div className="flex items-center space-x-3">
                  <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
                  {badge && (
                    <Badge 
                      variant={badge.variant || 'default'}
                      className={badge.className}
                    >
                      {badge.text}
                    </Badge>
                  )}
                </div>
                {description && (
                  <p className="mt-1 text-sm text-gray-600">{description}</p>
                )}
              </div>
            </div>

            {/* 操作按钮 */}
            {actions && (
              <div className="flex items-center space-x-2">
                {actions}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * 快速创建面包屑的辅助函数
 */
export const createBreadcrumbs = (items: Array<{ label: string; href?: string }>): BreadcrumbItem[] => {
  return items.map((item, index, array) => ({
    ...item,
    current: index === array.length - 1
  }));
};

/**
 * 常用的面包屑路径
 */
export const COMMON_BREADCRUMBS = {
  admin: { label: '管理员控制台', href: '/admin' },
  users: { label: '用户管理', href: '/admin?tab=user-list' },
  exams: { label: '考试系统', href: '/admin?tab=exam-system' },
  tools: { label: '实用工具', href: '/admin?tab=tools' },
  resources: { label: '资源管理', href: '/admin?tab=resources' }
};

/**
 * 预设的页面头部配置
 */
export const PAGE_CONFIGS = {
  // 考试相关页面
  examDetail: (examId: string, examTitle: string) => ({
    title: examTitle,
    description: '考试详情和管理',
    backUrl: '/admin?tab=exam-system',
    breadcrumbs: createBreadcrumbs([
      COMMON_BREADCRUMBS.admin,
      COMMON_BREADCRUMBS.exams,
      { label: '考试详情' }
    ])
  }),

  examCreate: () => ({
    title: '创建考试',
    description: '设置考试基本信息和参数',
    backUrl: '/admin?tab=exam-system',
    breadcrumbs: createBreadcrumbs([
      COMMON_BREADCRUMBS.admin,
      COMMON_BREADCRUMBS.exams,
      { label: '创建考试' }
    ])
  }),

  // 用户相关页面
  userExams: (userId: string, userName: string) => ({
    title: `${userName} - 考试管理`,
    description: '管理用户的考试权限和报名状态',
    backUrl: '/admin?tab=user-list',
    breadcrumbs: createBreadcrumbs([
      COMMON_BREADCRUMBS.admin,
      COMMON_BREADCRUMBS.users,
      { label: '考试管理' }
    ])
  }),

  // 系统工具页面
  localExamSync: () => ({
    title: '本地考试系统同步',
    description: '与本地考试系统进行数据导入导出',
    backUrl: '/admin?tab=tools',
    breadcrumbs: createBreadcrumbs([
      COMMON_BREADCRUMBS.admin,
      COMMON_BREADCRUMBS.tools,
      { label: '本地考试同步' }
    ])
  }),

  // 调试页面
  adminDebug: () => ({
    title: '管理员权限调试',
    description: '诊断和解决管理员权限问题',
    backUrl: '/admin',
    breadcrumbs: createBreadcrumbs([
      COMMON_BREADCRUMBS.admin,
      { label: '权限调试' }
    ])
  })
};
