/**
 * 面包屑导航组件
 * 提供统一的导航路径显示
 */

'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  current?: boolean;
  icon?: React.ComponentType<any>;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  showHome?: boolean;
  homeHref?: string;
  className?: string;
}

export default function Breadcrumb({ 
  items, 
  showHome = true, 
  homeHref = '/admin',
  className = '' 
}: BreadcrumbProps) {
  const router = useRouter();

  const handleClick = (href: string) => {
    router.push(href);
  };

  const allItems = showHome 
    ? [{ label: '首页', href: homeHref, icon: Home }, ...items]
    : items;

  return (
    <nav className={`flex ${className}`} aria-label="Breadcrumb">
      <ol className="flex items-center space-x-2">
        {allItems.map((item, index) => (
          <li key={index} className="flex items-center">
            {index > 0 && (
              <ChevronRight className="w-4 h-4 text-gray-400 mx-2" />
            )}
            
            <div className="flex items-center">
              {item.icon && (
                <item.icon className="w-4 h-4 mr-1 text-gray-500" />
              )}
              
              {item.current || !item.href ? (
                <span className="text-sm font-medium text-gray-900">
                  {item.label}
                </span>
              ) : (
                <button
                  onClick={() => item.href && handleClick(item.href)}
                  className="text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
                >
                  {item.label}
                </button>
              )}
            </div>
          </li>
        ))}
      </ol>
    </nav>
  );
}

/**
 * 创建面包屑项目的辅助函数
 */
export const createBreadcrumbItems = (
  items: Array<{ label: string; href?: string; icon?: React.ComponentType<any> }>
): BreadcrumbItem[] => {
  return items.map((item, index, array) => ({
    ...item,
    current: index === array.length - 1
  }));
};

/**
 * 常用的面包屑配置
 */
export const BREADCRUMB_CONFIGS = {
  // 管理员相关
  admin: {
    home: { label: '管理控制台', href: '/admin', icon: Home },
    users: { label: '用户管理', href: '/admin?tab=user-list' },
    exams: { label: '考试系统', href: '/admin?tab=exam-system' },
    tools: { label: '实用工具', href: '/admin?tab=tools' },
    resources: { label: '资源管理', href: '/admin?tab=resources' },
    debug: { label: '系统调试', href: '/admin/debug' }
  },
  
  // 考试相关
  exam: {
    list: { label: '考试列表', href: '/admin/exams' },
    create: { label: '创建考试', href: '/admin/exams/create' },
    detail: (title: string) => ({ label: title }),
    edit: (title: string) => ({ label: `编辑 - ${title}` }),
    candidates: (title: string) => ({ label: `考生管理 - ${title}` }),
    results: (title: string) => ({ label: `考试结果 - ${title}` })
  },
  
  // 用户相关
  user: {
    list: { label: '用户列表', href: '/admin/users' },
    detail: (name: string) => ({ label: name }),
    exams: (name: string) => ({ label: `考试管理 - ${name}` }),
    profile: (name: string) => ({ label: `用户资料 - ${name}` })
  },
  
  // 系统工具
  tools: {
    sync: { label: '本地考试同步', href: '/admin/local-exam-sync' },
    backup: { label: '数据备份', href: '/admin/tools/backup' },
    logs: { label: '系统日志', href: '/admin/tools/logs' },
    api: { label: 'API测试', href: '/admin/tools/api-tester' }
  }
};

/**
 * 预设的面包屑路径生成器
 */
export const generateBreadcrumbs = {
  // 考试详情页面
  examDetail: (examId: string, examTitle: string) => 
    createBreadcrumbItems([
      BREADCRUMB_CONFIGS.admin.home,
      BREADCRUMB_CONFIGS.admin.exams,
      BREADCRUMB_CONFIGS.exam.detail(examTitle)
    ]),
    
  // 考试创建页面
  examCreate: () =>
    createBreadcrumbItems([
      BREADCRUMB_CONFIGS.admin.home,
      BREADCRUMB_CONFIGS.admin.exams,
      BREADCRUMB_CONFIGS.exam.create
    ]),
    
  // 用户考试管理页面
  userExams: (userId: string, userName: string) =>
    createBreadcrumbItems([
      BREADCRUMB_CONFIGS.admin.home,
      BREADCRUMB_CONFIGS.admin.users,
      BREADCRUMB_CONFIGS.user.exams(userName)
    ]),
    
  // 本地考试同步页面
  localExamSync: () =>
    createBreadcrumbItems([
      BREADCRUMB_CONFIGS.admin.home,
      BREADCRUMB_CONFIGS.admin.tools,
      BREADCRUMB_CONFIGS.tools.sync
    ]),
    
  // 管理员调试页面
  adminDebug: () =>
    createBreadcrumbItems([
      BREADCRUMB_CONFIGS.admin.home,
      BREADCRUMB_CONFIGS.admin.debug
    ])
};
