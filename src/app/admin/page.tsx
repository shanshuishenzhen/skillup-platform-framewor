/**
 * 管理员页面
 * 提供批量导入用户和批量上传学习资料等管理功能
 * 仅限admin和super_admin角色访问
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Users, Upload, BookOpen, BarChart3, FileText, Shield, Bug } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import UserImport from '@/components/admin/UserImport';
import UserList from '@/components/admin/UserList';
import UserDetail from '@/components/admin/UserDetail';
import ResourceUpload from '@/components/admin/ResourceUpload';
import AdminGuide from '@/components/admin/AdminGuide';
// import TokenDebugPanel from '@/components/admin/TokenDebugPanel';
import AdminGuard from '@/components/auth/AdminGuard';

/**
 * 管理功能选项卡类型
 */
type AdminTab = 'overview' | 'users' | 'user-list' | 'resources' | 'guide' | 'debug';

/**
 * 管理员页面组件
 */
export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [userDetailMode, setUserDetailMode] = useState<'view' | 'edit'>('view');
  const { user } = useAuth();
  const router = useRouter();

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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* 统计卡片 */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <Users className="h-8 w-8 text-blue-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">总用户数</p>
                    <p className="text-2xl font-bold text-gray-900">-</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <FileText className="h-8 w-8 text-green-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">学习资源</p>
                    <p className="text-2xl font-bold text-gray-900">-</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <BarChart3 className="h-8 w-8 text-purple-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">活跃用户</p>
                    <p className="text-2xl font-bold text-gray-900">-</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <Shield className="h-8 w-8 text-red-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">系统状态</p>
                    <p className="text-2xl font-bold text-green-600">正常</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">快速操作</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <div className="flex items-center space-x-2">
                <Shield className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium text-green-600">管理员权限</span>
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