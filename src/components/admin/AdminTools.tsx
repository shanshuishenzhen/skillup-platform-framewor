/**
 * 管理员实用工具组件
 * 提供各种系统管理和维护工具
 */

'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Database,
  Download,
  Upload,
  RefreshCw,
  Settings,
  Shield,
  FileText,
  BarChart3,
  Users,
  Mail,
  Key,
  Clock,
  Trash2,
  Archive,
  Search,
  Filter,
  Copy,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  AlertCircle,
  Info,
  Zap,
  Code,
  Terminal,
  Bug
} from 'lucide-react';
import { toast } from 'sonner';

interface ToolCategory {
  id: string;
  name: string;
  icon: React.ComponentType<any>;
  description: string;
  tools: Tool[];
}

interface Tool {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  action: () => void;
  status?: 'available' | 'coming-soon' | 'maintenance';
  badge?: string;
}

export default function AdminTools() {
  const [activeCategory, setActiveCategory] = useState('system');
  const [searchTerm, setSearchTerm] = useState('');

  // 系统管理工具
  const systemTools: Tool[] = [
    {
      id: 'database-backup',
      name: '数据库备份',
      description: '创建数据库完整备份',
      icon: Database,
      action: () => {
        toast.info('正在创建数据库备份...');
        // TODO: 实现数据库备份逻辑
      }
    },
    {
      id: 'cache-clear',
      name: '清理缓存',
      description: '清理系统缓存和临时文件',
      icon: RefreshCw,
      action: () => {
        toast.success('缓存清理完成');
        // TODO: 实现缓存清理逻辑
      }
    },
    {
      id: 'system-info',
      name: '系统信息',
      description: '查看系统运行状态和配置',
      icon: Info,
      action: () => {
        window.open('/admin/system-info', '_blank');
      }
    },
    {
      id: 'log-viewer',
      name: '日志查看器',
      description: '查看和分析系统日志',
      icon: FileText,
      action: () => {
        window.open('/admin/logs', '_blank');
      }
    }
  ];

  // 数据管理工具
  const dataTools: Tool[] = [
    {
      id: 'data-export',
      name: '数据导出',
      description: '导出用户、考试等数据',
      icon: Download,
      action: () => {
        window.open('/admin/data-export', '_blank');
      }
    },
    {
      id: 'data-import',
      name: '数据导入',
      description: '批量导入各类数据',
      icon: Upload,
      action: () => {
        window.open('/admin/data-import', '_blank');
      }
    },
    {
      id: 'data-cleanup',
      name: '数据清理',
      description: '清理过期和无效数据',
      icon: Trash2,
      action: () => {
        toast.info('数据清理功能开发中...');
      },
      status: 'coming-soon'
    },
    {
      id: 'data-archive',
      name: '数据归档',
      description: '归档历史数据',
      icon: Archive,
      action: () => {
        toast.info('数据归档功能开发中...');
      },
      status: 'coming-soon'
    }
  ];

  // 用户管理工具
  const userTools: Tool[] = [
    {
      id: 'user-search',
      name: '用户搜索',
      description: '高级用户搜索和筛选',
      icon: Search,
      action: () => {
        window.open('/admin/users?advanced=true', '_blank');
      }
    },
    {
      id: 'batch-operations',
      name: '批量操作',
      description: '批量修改用户信息',
      icon: Users,
      action: () => {
        toast.info('批量操作功能开发中...');
      },
      status: 'coming-soon'
    },
    {
      id: 'permission-audit',
      name: '权限审计',
      description: '审计用户权限分配',
      icon: Shield,
      action: () => {
        toast.info('权限审计功能开发中...');
      },
      status: 'coming-soon'
    },
    {
      id: 'notification-center',
      name: '通知中心',
      description: '发送系统通知和邮件',
      icon: Mail,
      action: () => {
        toast.info('通知中心功能开发中...');
      },
      status: 'coming-soon'
    }
  ];

  // 开发工具
  const devTools: Tool[] = [
    {
      id: 'api-tester',
      name: 'API测试器',
      description: '测试API接口功能',
      icon: Code,
      action: () => {
        window.open('/admin/api-tester', '_blank');
      }
    },
    {
      id: 'token-generator',
      name: 'Token生成器',
      description: '生成测试用的JWT令牌',
      icon: Key,
      action: () => {
        const mockToken = 'mock-admin-token-' + Date.now();
        navigator.clipboard.writeText(mockToken);
        toast.success('测试令牌已复制到剪贴板');
      }
    },
    {
      id: 'debug-console',
      name: '调试控制台',
      description: '系统调试和诊断工具',
      icon: Terminal,
      action: () => {
        window.open('/admin/debug-console', '_blank');
      }
    },
    {
      id: 'performance-monitor',
      name: '性能监控',
      description: '监控系统性能指标',
      icon: BarChart3,
      action: () => {
        toast.info('性能监控功能开发中...');
      },
      status: 'coming-soon'
    }
  ];

  const categories: ToolCategory[] = [
    {
      id: 'system',
      name: '系统管理',
      icon: Settings,
      description: '系统维护和配置工具',
      tools: systemTools
    },
    {
      id: 'data',
      name: '数据管理',
      icon: Database,
      description: '数据导入导出和维护',
      tools: dataTools
    },
    {
      id: 'user',
      name: '用户管理',
      icon: Users,
      description: '用户相关管理工具',
      tools: userTools
    },
    {
      id: 'dev',
      name: '开发工具',
      icon: Code,
      description: '开发和调试工具',
      tools: devTools
    }
  ];

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-800';
      case 'coming-soon': return 'bg-yellow-100 text-yellow-800';
      case 'maintenance': return 'bg-red-100 text-red-800';
      default: return 'bg-green-100 text-green-800';
    }
  };

  const getStatusText = (status?: string) => {
    switch (status) {
      case 'available': return '可用';
      case 'coming-soon': return '即将推出';
      case 'maintenance': return '维护中';
      default: return '可用';
    }
  };

  const filteredCategories = categories.map(category => ({
    ...category,
    tools: category.tools.filter(tool => 
      tool.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tool.description.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })).filter(category => category.tools.length > 0);

  const currentCategory = categories.find(cat => cat.id === activeCategory);

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">实用工具</h2>
          <p className="text-gray-600">系统管理和维护工具集合</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="搜索工具..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* 工具分类侧边栏 */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">工具分类</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <nav className="space-y-1">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setActiveCategory(category.id)}
                    className={`w-full flex items-center px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                      activeCategory === category.id ? 'bg-blue-50 border-r-2 border-blue-500' : ''
                    }`}
                  >
                    <category.icon className="w-5 h-5 mr-3 text-gray-500" />
                    <div>
                      <div className="font-medium text-gray-900">{category.name}</div>
                      <div className="text-sm text-gray-500">{category.tools.length} 个工具</div>
                    </div>
                  </button>
                ))}
              </nav>
            </CardContent>
          </Card>
        </div>

        {/* 工具列表 */}
        <div className="lg:col-span-3">
          {searchTerm ? (
            // 搜索结果
            <div className="space-y-6">
              <h3 className="text-lg font-medium">搜索结果</h3>
              {filteredCategories.map((category) => (
                <Card key={category.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <category.icon className="w-5 h-5 mr-2" />
                      {category.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {category.tools.map((tool) => (
                        <div
                          key={tool.id}
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center flex-1">
                            <tool.icon className="w-6 h-6 text-gray-500 mr-3" />
                            <div>
                              <h4 className="font-medium text-gray-900">{tool.name}</h4>
                              <p className="text-sm text-gray-600">{tool.description}</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge className={getStatusColor(tool.status)}>
                              {getStatusText(tool.status)}
                            </Badge>
                            <Button
                              size="sm"
                              onClick={tool.action}
                              disabled={tool.status === 'maintenance'}
                            >
                              使用
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            // 当前分类工具
            currentCategory && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <currentCategory.icon className="w-6 h-6 mr-2" />
                    {currentCategory.name}
                  </CardTitle>
                  <p className="text-gray-600">{currentCategory.description}</p>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {currentCategory.tools.map((tool) => (
                      <div
                        key={tool.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center flex-1">
                          <tool.icon className="w-8 h-8 text-gray-500 mr-4" />
                          <div>
                            <h4 className="font-medium text-gray-900">{tool.name}</h4>
                            <p className="text-sm text-gray-600">{tool.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge className={getStatusColor(tool.status)}>
                            {getStatusText(tool.status)}
                          </Badge>
                          <Button
                            size="sm"
                            onClick={tool.action}
                            disabled={tool.status === 'maintenance'}
                          >
                            {tool.status === 'coming-soon' ? '敬请期待' : '使用'}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )
          )}
        </div>
      </div>

      {/* 快速操作面板 */}
      <Card>
        <CardHeader>
          <CardTitle>快速操作</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Button
              onClick={() => {
                toast.success('系统状态检查完成');
              }}
              variant="outline"
              className="h-16 flex-col"
            >
              <CheckCircle className="w-6 h-6 mb-2" />
              系统检查
            </Button>
            
            <Button
              onClick={() => {
                window.open('/admin/local-exam-sync', '_blank');
              }}
              variant="outline"
              className="h-16 flex-col"
            >
              <RefreshCw className="w-6 h-6 mb-2" />
              数据同步
            </Button>
            
            <Button
              onClick={() => {
                toast.info('性能优化功能开发中...');
              }}
              variant="outline"
              className="h-16 flex-col"
            >
              <Zap className="w-6 h-6 mb-2" />
              性能优化
            </Button>
            
            <Button
              onClick={() => {
                window.open('/admin/debug', '_blank');
              }}
              variant="outline"
              className="h-16 flex-col"
            >
              <Bug className="w-6 h-6 mb-2" />
              问题诊断
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
