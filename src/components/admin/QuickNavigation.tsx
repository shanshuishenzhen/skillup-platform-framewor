/**
 * 管理员快速导航组件
 * 提供常用功能的快速访问入口
 */

'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Users,
  BookOpen,
  Upload,
  Download,
  Settings,
  BarChart3,
  FileText,
  Database,
  RotateCcw,
  Plus,
  Search,
  Shield,
  Bug
} from 'lucide-react';

interface QuickNavItem {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  href?: string;
  onClick?: () => void;
  badge?: string;
  color: string;
}

interface QuickNavigationProps {
  onTabChange?: (tab: string) => void;
  className?: string;
}

export default function QuickNavigation({ onTabChange, className = '' }: QuickNavigationProps) {
  
  const quickNavItems: QuickNavItem[] = [
    {
      id: 'user-import',
      title: '批量导入用户',
      description: '通过Excel文件快速添加用户',
      icon: Users,
      onClick: () => onTabChange?.('users'),
      color: 'blue'
    },
    {
      id: 'user-list',
      title: '用户列表',
      description: '查看和管理所有用户',
      icon: Search,
      onClick: () => onTabChange?.('user-list'),
      color: 'green'
    },
    {
      id: 'exam-system',
      title: '考试系统',
      description: '管理考试和本地系统集成',
      icon: BookOpen,
      onClick: () => onTabChange?.('exam-system'),
      color: 'purple'
    },
    {
      id: 'create-exam',
      title: '创建考试',
      description: '快速创建新的考试',
      icon: Plus,
      href: '/admin/exams/create',
      color: 'indigo'
    },
    {
      id: 'resource-upload',
      title: '上传资源',
      description: '批量上传学习资料',
      icon: Upload,
      onClick: () => onTabChange?.('resources'),
      color: 'orange'
    },
    {
      id: 'local-sync',
      title: '本地系统同步',
      description: '与本地考试系统数据同步',
      icon: RotateCcw,
      href: '/admin/local-exam-sync',
      color: 'teal'
    },
    {
      id: 'system-tools',
      title: '系统工具',
      description: '实用工具和系统管理',
      icon: Settings,
      onClick: () => onTabChange?.('tools'),
      color: 'gray'
    },
    {
      id: 'debug-tools',
      title: '调试工具',
      description: '系统诊断和问题排查',
      icon: Bug,
      href: '/admin/debug',
      color: 'red'
    }
  ];

  const handleItemClick = (item: QuickNavItem) => {
    if (item.onClick) {
      item.onClick();
    } else if (item.href) {
      window.open(item.href, '_blank');
    }
  };

  const getColorClasses = (color: string) => {
    const colorMap = {
      blue: 'bg-blue-50 border-blue-200 hover:bg-blue-100 text-blue-700',
      green: 'bg-green-50 border-green-200 hover:bg-green-100 text-green-700',
      purple: 'bg-purple-50 border-purple-200 hover:bg-purple-100 text-purple-700',
      indigo: 'bg-indigo-50 border-indigo-200 hover:bg-indigo-100 text-indigo-700',
      orange: 'bg-orange-50 border-orange-200 hover:bg-orange-100 text-orange-700',
      teal: 'bg-teal-50 border-teal-200 hover:bg-teal-100 text-teal-700',
      gray: 'bg-gray-50 border-gray-200 hover:bg-gray-100 text-gray-700',
      red: 'bg-red-50 border-red-200 hover:bg-red-100 text-red-700'
    };
    return colorMap[color as keyof typeof colorMap] || colorMap.gray;
  };

  const getIconColorClasses = (color: string) => {
    const colorMap = {
      blue: 'text-blue-600',
      green: 'text-green-600',
      purple: 'text-purple-600',
      indigo: 'text-indigo-600',
      orange: 'text-orange-600',
      teal: 'text-teal-600',
      gray: 'text-gray-600',
      red: 'text-red-600'
    };
    return colorMap[color as keyof typeof colorMap] || colorMap.gray;
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center">
          <BarChart3 className="w-5 h-5 mr-2" />
          快速导航
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickNavItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleItemClick(item)}
              className={`p-4 border rounded-lg transition-all duration-200 text-left relative ${getColorClasses(item.color)}`}
            >
              <div className="flex items-start space-x-3">
                <item.icon className={`w-6 h-6 mt-1 ${getIconColorClasses(item.color)}`} />
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm mb-1 truncate">
                    {item.title}
                  </h3>
                  <p className="text-xs opacity-80 line-clamp-2">
                    {item.description}
                  </p>
                </div>
              </div>
              
              {item.badge && (
                <span className="absolute top-2 right-2 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </div>
        
        {/* 快速统计 */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-gray-900">1,248</div>
              <div className="text-xs text-gray-600">总用户数</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">25</div>
              <div className="text-xs text-gray-600">活跃考试</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">156</div>
              <div className="text-xs text-gray-600">学习资源</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">98%</div>
              <div className="text-xs text-gray-600">系统可用性</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * 快速操作按钮组件
 */
export function QuickActions({ onTabChange }: { onTabChange?: (tab: string) => void }) {
  const actions = [
    {
      label: '导入用户',
      icon: Users,
      onClick: () => onTabChange?.('users'),
      variant: 'default' as const
    },
    {
      label: '创建考试',
      icon: Plus,
      onClick: () => window.open('/admin/exams/create', '_blank'),
      variant: 'outline' as const
    },
    {
      label: '上传资源',
      icon: Upload,
      onClick: () => onTabChange?.('resources'),
      variant: 'outline' as const
    },
    {
      label: '数据同步',
      icon: RotateCcw,
      onClick: () => window.open('/admin/local-exam-sync', '_blank'),
      variant: 'outline' as const
    }
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((action, index) => (
        <Button
          key={index}
          variant={action.variant}
          size="sm"
          onClick={action.onClick}
          className="flex items-center"
        >
          <action.icon className="w-4 h-4 mr-2" />
          {action.label}
        </Button>
      ))}
    </div>
  );
}
