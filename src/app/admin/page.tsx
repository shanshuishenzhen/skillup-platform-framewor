/**
 * 管理员页面
 * 提供批量导入用户和批量上传学习资料等管理功能
 * 仅限admin和super_admin角色访问
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Users, Upload, BookOpen, BarChart3, FileText, Shield, Bug, RefreshCw, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import UserImport from '@/components/admin/UserImport';
import UserList from '@/components/admin/UserList';
import UserDetail from '@/components/admin/UserDetail';
import ResourceUpload from '@/components/admin/ResourceUpload';
import AdminGuide from '@/components/admin/AdminGuide';
import ExamSystemManagement from '@/components/admin/ExamSystemManagement';
import AdminTools from '@/components/admin/AdminTools';
// import TokenDebugPanel from '@/components/admin/TokenDebugPanel';
import AdminGuard from '@/components/auth/AdminGuard';

/**
 * 管理员统计数据接口
 */
interface AdminStats {
  overview: {
    totalUsers: number;
    activeUsers: number;
    totalResources: number;
    recentUsers: number;
    systemStatus: {
      status: string;
      message: string;
      lastCheck: string;
    };
  };
  userStats: {
    byStatus: Record<string, number>;
    byRole: Record<string, number>;
    total: number;
  };
  resourceStats: {
    byType: Record<string, number>;
    total: number;
  };
  trends: {
    newUsersLast7Days: number;
    activeUsersLast30Days: number;
  };
  metadata: {
    generatedAt: string;
    dataSource: string;
    cacheExpiry: string;
  };
}

/**
 * 管理功能选项卡类型
 */
type AdminTab = 'overview' | 'users' | 'user-list' | 'resources' | 'exam-system' | 'tools' | 'guide' | 'debug';

/**
 * 模拟统计数据
 */
const mockStats: AdminStats = {
  overview: {
    totalUsers: 1248,
    activeUsers: 892,
    totalResources: 3456,
    recentUsers: 156,
    systemStatus: {
      status: 'normal',
      message: '系统运行正常',
      lastCheck: new Date().toISOString()
    }
  },
  userStats: {
    byStatus: {
      'active': 892,
      'inactive': 356
    },
    byRole: {
      'student': 1050,
      'teacher': 180,
      'admin': 18
    },
    total: 1248
  },
  resourceStats: {
    byType: {
      'video': 1234,
      'document': 987,
      'quiz': 654,
      'project': 581
    },
    total: 3456
  },
  trends: {
    newUsersLast7Days: 45,
    activeUsersLast30Days: 892
  },
  metadata: {
    generatedAt: new Date().toISOString(),
    dataSource: 'mock',
    cacheExpiry: new Date(Date.now() + 60 * 60 * 1000).toISOString()
  }
};

/**
 * 管理员页面组件
 */
export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [userDetailMode, setUserDetailMode] = useState<'view' | 'edit'>('view');
  const [stats, setStats] = useState<AdminStats | null>(mockStats);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [isDevelopment, setIsDevelopment] = useState(false);
  const { user, token } = useAuth();
  const router = useRouter();

  /**
   * 获取管理员统计数据
   */
  // 临时模拟管理员登录
  const simulateAdminLogin = () => {
    // 创建一个模拟的JWT令牌
    const mockToken = 'mock-admin-token-for-development';
    localStorage.setItem('token', mockToken);
    console.log('🔧 模拟管理员登录，设置令牌:', mockToken);
    toast.success('已模拟管理员登录');

    // 强制设置模拟数据
    setStats(mockStats);
    setLastUpdated(new Date().toLocaleString('zh-CN'));
    console.log('🔧 强制设置模拟数据:', mockStats);

    fetchStats();
  };

  const fetchStats = async () => {
    try {
      setLoading(true);

      // 检查是否有认证令牌
      const authToken = localStorage.getItem('token');

      if (!authToken) {
        console.warn('未找到认证令牌，使用模拟数据');
        // 使用模拟数据而不是失败
        setStats(mockStats);
        setLastUpdated(new Date().toLocaleString('zh-CN'));
        setLoading(false);
        return;
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      };

      console.log('正在获取管理员统计数据...');
      const response = await fetch('/api/admin/stats', {
        method: 'GET',
        headers,
      });

      console.log('API响应状态:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API错误响应:', errorText);

        if (response.status === 403) {
          toast.error('权限不足，请确认您具有管理员权限');
        } else if (response.status === 401) {
          toast.error('认证失败，请重新登录');
        } else {
          toast.error(`请求失败 (${response.status}): ${errorText}`);
        }
        return;
      }

      const result = await response.json();
      console.log('API响应数据:', result);

      if (result.success) {
        setStats(result.data);
        setLastUpdated(new Date().toLocaleString('zh-CN'));
        toast.success('统计数据加载成功');
      } else {
        console.error('API返回错误:', result);
        toast.error(result.error || '获取统计数据失败');
      }
    } catch (error) {
      console.error('获取统计数据失败:', error);
      toast.error('获取统计数据失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 刷新统计数据
   */
  const refreshStats = async () => {
    await fetchStats();
    toast.success('统计数据已刷新');
  };

  // 组件挂载时获取统计数据
  useEffect(() => {
    // 检测是否为开发环境
    setIsDevelopment(window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

    // 确保有初始数据
    if (!stats) {
      console.log('🔧 设置初始模拟数据:', mockStats);
      setStats(mockStats);
      setLastUpdated(new Date().toLocaleString('zh-CN'));
    }

    if (activeTab === 'overview') {
      fetchStats();
    }
  }, [activeTab]);

  // 调试：监听stats变化
  useEffect(() => {
    console.log('📊 Stats 数据更新:', stats);
  }, [stats]);

  // 移除重复的权限检查逻辑，完全依赖AdminGuard组件进行权限验证

  /**
   * 管理功能选项卡配置
   */
  const tabs = [
    {
      id: 'overview' as AdminTab,
      name: '概览',
      icon: BarChart3,
      description: '系统概览和统计信息'
    },
    {
      id: 'users' as AdminTab,
      name: '用户管理',
      icon: Users,
      description: '批量导入用户和用户管理'
    },
    {
      id: 'user-list' as AdminTab,
      name: '用户列表',
      icon: Users,
      description: '查看和管理所有用户'
    },
    {
      id: 'resources' as AdminTab,
      name: '资源管理',
      icon: Upload,
      description: '批量上传学习资料'
    },
    {
      id: 'exam-system' as AdminTab,
      name: '考试系统',
      icon: FileText,
      description: '考试管理和本地系统集成'
    },
    {
      id: 'tools' as AdminTab,
      name: '实用工具',
      icon: Settings,
      description: '系统工具和辅助功能'
    },
    {
      id: 'guide' as AdminTab,
      name: '操作指南',
      icon: FileText,
      description: '管理员操作说明'
    },
    {
      id: 'debug' as AdminTab,
      name: 'Token调试',
      icon: Bug,
      description: 'Token调试面板'
    }
  ];

  /**
   * 渲染选项卡内容
   */
  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-6">
            {/* 数据刷新控制 */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">系统概览</h2>
                {lastUpdated && (
                  <p className="text-sm text-gray-500 mt-1">
                    最后更新: {lastUpdated}
                  </p>
                )}
              </div>
              <button
                onClick={refreshStats}
                disabled={loading}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                {loading ? '刷新中...' : '刷新数据'}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* 统计卡片 */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <Users className="h-8 w-8 text-blue-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">总用户数</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {loading ? '...' : (stats?.overview.totalUsers || 0)}
                    </p>
                    {stats?.trends.newUsersLast7Days && stats.trends.newUsersLast7Days > 0 && (
                      <p className="text-xs text-green-600 mt-1">
                        +{stats.trends.newUsersLast7Days} 本周新增
                      </p>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <FileText className="h-8 w-8 text-green-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">学习资源</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {loading ? '...' : (stats?.overview.totalResources || 0)}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <BarChart3 className="h-8 w-8 text-purple-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">活跃用户</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {loading ? '...' : (stats?.overview.activeUsers || 0)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">最近30天</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <Shield className={`h-8 w-8 ${
                    stats?.overview.systemStatus.status === 'normal' ? 'text-green-600' : 'text-red-600'
                  }`} />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">系统状态</p>
                    <p className={`text-2xl font-bold ${
                      stats?.overview.systemStatus.status === 'normal' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {loading ? '...' : (stats?.overview.systemStatus.status === 'normal' ? '正常' : '异常')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">快速操作</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={() => setActiveTab('users')}
                  className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Users className="h-6 w-6 text-blue-600 mr-3" />
                  <div className="text-left">
                    <p className="font-medium text-gray-900">批量导入用户</p>
                    <p className="text-sm text-gray-600">通过Excel/CSV文件批量添加用户</p>
                  </div>
                </button>

                <button
                  onClick={() => setActiveTab('resources')}
                  className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Upload className="h-6 w-6 text-green-600 mr-3" />
                  <div className="text-left">
                    <p className="font-medium text-gray-900">上传学习资料</p>
                    <p className="text-sm text-gray-600">批量上传视频、文档等学习资源</p>
                  </div>
                </button>

                <button
                  onClick={() => window.open('/admin/local-exam-sync', '_blank')}
                  className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <RefreshCw className="h-6 w-6 text-purple-600 mr-3" />
                  <div className="text-left">
                    <p className="font-medium text-gray-900">本地考试同步</p>
                    <p className="text-sm text-gray-600">与本地考试系统数据同步</p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        );
      
      case 'users':
        return <UserImport />;
      
      case 'user-list':
         return (
           <UserList
             onUserSelect={(userId, mode) => {
               setSelectedUserId(userId);
               setUserDetailMode(mode);
             }}
           />
         );
      
      case 'resources':
        return <ResourceUpload />;

      case 'exam-system':
        return <ExamSystemManagement />;

      case 'tools':
        return <AdminTools />;

      case 'guide':
        return <AdminGuide />;

      case 'debug':
        return <div className="p-6 bg-white rounded-lg shadow">Token调试面板暂时不可用</div>;
        // return <TokenDebugPanel />;

      default:
        return null;
    }
  };

  return (
    <AdminGuard>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* 页面头部 */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">管理员控制台</h1>
                <p className="mt-1 text-sm text-gray-600">
                  欢迎，{user?.phone}。您可以在这里管理系统用户和学习资源。
                </p>
              </div>
              <div className="flex items-center space-x-4">
                {isDevelopment && (
                  <div className="flex items-center space-x-2">
                    <Button
                      onClick={simulateAdminLogin}
                      variant="outline"
                      size="sm"
                      className="bg-yellow-50 border-yellow-200 text-yellow-800 hover:bg-yellow-100"
                    >
                      模拟登录
                    </Button>
                    <div className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded">
                      数据: {stats ? '✅' : '❌'} |
                      用户: {stats?.overview.totalUsers || 'N/A'} |
                      活跃: {stats?.overview.activeUsers || 'N/A'}
                    </div>
                  </div>
                )}
                <div className="flex items-center space-x-2">
                  <Shield className="h-5 w-5 text-green-600" />
                  <span className="text-sm font-medium text-green-600">管理员权限</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 选项卡导航 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className={`mr-2 h-5 w-5 ${
                    activeTab === tab.id ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'
                  }`} />
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* 选项卡内容 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderTabContent()}
      </div>
      </div>
      
      {/* 用户详情弹窗 */}
      {selectedUserId && (
        <UserDetail
          userId={selectedUserId}
          mode={userDetailMode}
          onClose={() => {
            setSelectedUserId(null);
            setUserDetailMode('view');
          }}
          onUpdate={() => {
            // 刷新用户列表
            if (activeTab === 'user-list') {
              window.location.reload();
            }
          }}
        />
      )}
    </AdminGuard>
  );
}