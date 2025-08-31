/**
 * 管理员页面布局组件
 * 提供统一的管理员页面布局，处理主导航栏的间距问题
 */

'use client';

import React from 'react';
import PageHeader from '@/components/ui/page-header';

interface AdminPageLayoutProps {
  children: React.ReactNode;
  pageHeaderProps?: React.ComponentProps<typeof PageHeader>;
  className?: string;
  containerClassName?: string;
  showPageHeader?: boolean;
}

export default function AdminPageLayout({
  children,
  pageHeaderProps,
  className = '',
  containerClassName = '',
  showPageHeader = true
}: AdminPageLayoutProps) {
  return (
    <div className={`min-h-screen bg-gray-50 pt-20 ${className}`}>
      {/* 页面头部 */}
      {showPageHeader && pageHeaderProps && (
        <PageHeader {...pageHeaderProps} />
      )}

      {/* 主要内容区域 */}
      <div className={`container mx-auto p-6 ${containerClassName}`}>
        {children}
      </div>
    </div>
  );
}

/**
 * 简化的管理员页面布局组件
 * 用于不需要 PageHeader 的页面
 */
export function SimpleAdminLayout({
  children,
  className = '',
  containerClassName = ''
}: {
  children: React.ReactNode;
  className?: string;
  containerClassName?: string;
}) {
  return (
    <div className={`min-h-screen bg-gray-50 pt-20 ${className}`}>
      <div className={`container mx-auto p-6 ${containerClassName}`}>
        {children}
      </div>
    </div>
  );
}

/**
 * 全屏管理员页面布局组件
 * 用于需要全屏显示的页面（如仪表板）
 */
export function FullScreenAdminLayout({
  children,
  className = ''
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`min-h-screen bg-gray-50 pt-20 ${className}`}>
      {children}
    </div>
  );
}

/**
 * 带侧边栏的管理员页面布局组件
 * 用于需要侧边栏的复杂页面
 */
export function AdminLayoutWithSidebar({
  children,
  sidebar,
  pageHeaderProps,
  className = ''
}: {
  children: React.ReactNode;
  sidebar: React.ReactNode;
  pageHeaderProps?: React.ComponentProps<typeof PageHeader>;
  className?: string;
}) {
  return (
    <div className={`min-h-screen bg-gray-50 pt-20 ${className}`}>
      {/* 页面头部 */}
      {pageHeaderProps && (
        <PageHeader {...pageHeaderProps} />
      )}

      {/* 主要布局 */}
      <div className="flex">
        {/* 侧边栏 */}
        <aside className="w-64 bg-white border-r border-gray-200 min-h-screen">
          {sidebar}
        </aside>

        {/* 主要内容 */}
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
