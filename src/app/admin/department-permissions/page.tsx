/**
 * 部门权限管理页面
 * 提供完整的部门权限配置、继承、冲突检测和审计功能
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  Settings, 
  Shield, 
  Users, 
  AlertTriangle, 
  History, 
  TreePine,
  FileText,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';
import { toast } from 'sonner';

// 导入权限管理组件
import { DepartmentPermissionConfig } from '@/components/admin/DepartmentPermissionConfig';
import { PermissionInheritanceTree } from '@/components/admin/PermissionInheritanceTree';
import { PermissionConflictResolver } from '@/components/admin/PermissionConflictResolver';
import { PermissionHistory } from '@/components/admin/PermissionHistory';
import { PermissionTemplateManager } from '@/components/admin/PermissionTemplateManager';

// 权限统计接口
interface PermissionStats {
  totalDepartments: number;
  configuredDepartments: number;
  totalPermissions: number;
  inheritedPermissions: number;
  directPermissions: number;
  conflictCount: number;
  recentChanges: number;
}

// 系统状态接口
interface SystemStatus {
  inheritanceEnabled: boolean;
  conflictDetectionEnabled: boolean;
  auditLoggingEnabled: boolean;
  lastSyncTime: string;
  systemHealth: 'healthy' | 'warning' | 'error';
}

/**
 * 部门权限管理主页面组件
 * @returns JSX元素
 */
export default function DepartmentPermissionsPage() {
  // 状态管理
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState<PermissionStats | null>(null);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  /**
   * 获取权限统计数据
   */
  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/permissions/stats');
      if (!response.ok) {
        throw new Error('获取统计数据失败');
      }
      const data = await response.json();
      setStats(data.stats);
    } catch (error) {
      console.error('获取权限统计失败:', error);
      toast.error('获取统计数据失败');
    }
  };

  /**
   * 获取系统状态
   */
  const fetchSystemStatus = async () => {
    try {
      const response = await fetch('/api/admin/permissions/system-status');
      if (!response.ok) {
        throw new Error('获取系统状态失败');
      }
      const data = await response.json();
      setSystemStatus(data.status);
    } catch (error) {
      console.error('获取系统状态失败:', error);
      toast.error('获取系统状态失败');
    }
  };

  /**
   * 刷新所有数据
   */
  const refreshData = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetchStats(),
        fetchSystemStatus()
      ]);
      toast.success('数据刷新成功');
    } catch (error) {
      toast.error('数据刷新失败');
    } finally {
      setRefreshing(false);
    }
  };

  /**
   * 同步权限继承
   */
  const syncInheritance = async () => {
    try {
      setRefreshing(true);
      const response = await fetch('/api/admin/permissions/sync-inheritance', {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error('同步权限继承失败');
      }
      
      const result = await response.json();
      toast.success(`权限继承同步完成，处理了 ${result.processedCount} 个部门`);
      await refreshData();
    } catch (error) {
      console.error('同步权限继承失败:', error);
      toast.error('同步权限继承失败');
    } finally {
      setRefreshing(false);
    }
  };

  // 初始化数据
  useEffect(() => {
    const initData = async () => {
      setLoading(true);
      try {
        await Promise.all([
          fetchStats(),
          fetchSystemStatus()
        ]);
      } finally {
        setLoading(false);
      }
    };

    initData();
  }, []);

  /**
   * 渲染系统状态指示器
   */
  const renderSystemStatus = () => {
    if (!systemStatus) return null;

    const getStatusColor = (status: string) => {
      switch (status) {
        case 'healthy': return 'text-green-600';
        case 'warning': return 'text-yellow-600';
        case 'error': return 'text-red-600';
        default: return 'text-gray-600';
      }
    };

    const getStatusIcon = (status: string) => {
      switch (status) {
        case 'healthy': return <CheckCircle className="h-4 w-4" />;
        case 'warning': return <AlertTriangle className="h-4 w-4" />;
        case 'error': return <XCircle className="h-4 w-4" />;
        default: return <Clock className="h-4 w-4" />;
      }
    };

    return (
      <div className="flex items-center space-x-4 text-sm">
        <div className={`flex items-center space-x-1 ${getStatusColor(systemStatus.systemHealth)}`}>
          {getStatusIcon(systemStatus.systemHealth)}
          <span>系统状态: {systemStatus.systemHealth === 'healthy' ? '正常' : systemStatus.systemHealth === 'warning' ? '警告' : '错误'}</span>
        </div>
        <Separator orientation="vertical" className="h-4" />
        <span className="text-gray-600">最后同步: {new Date(systemStatus.lastSyncTime).toLocaleString()}</span>
      </div>
    );
  };

  /**
   * 渲染统计卡片
   */
  const renderStatsCards = () => {
    if (!stats) return null;

    const cards = [
      {
        title: '部门总数',
        value: stats.totalDepartments,
        description: `已配置: ${stats.configuredDepartments}`,
        icon: <Users className="h-4 w-4" />,
        color: 'text-blue-600'
      },
      {
        title: '权限总数',
        value: stats.totalPermissions,
        description: `继承: ${stats.inheritedPermissions} | 直接: ${stats.directPermissions}`,
        icon: <Shield className="h-4 w-4" />,
        color: 'text-green-600'
      },
      {
        title: '权限冲突',
        value: stats.conflictCount,
        description: stats.conflictCount > 0 ? '需要处理' : '无冲突',
        icon: <AlertTriangle className="h-4 w-4" />,
        color: stats.conflictCount > 0 ? 'text-red-600' : 'text-green-600'
      },
      {
        title: '近期变更',
        value: stats.recentChanges,
        description: '最近7天',
        icon: <History className="h-4 w-4" />,
        color: 'text-purple-600'
      }
    ];

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {cards.map((card, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <div className={card.color}>
                {card.icon}
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground">{card.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin" />
          <span className="ml-2">加载中...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* 页面头部 */}
      <div className="flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">部门权限管理</h1>
            <p className="text-muted-foreground">
              管理部门权限配置、继承关系、冲突检测和变更审计
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={refreshData}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              刷新数据
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={syncInheritance}
              disabled={refreshing}
            >
              <TreePine className="h-4 w-4 mr-2" />
              同步继承
            </Button>
          </div>
        </div>
        
        {/* 系统状态 */}
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
          {renderSystemStatus()}
          <div className="flex items-center space-x-2">
            {systemStatus?.inheritanceEnabled && (
              <Badge variant="secondary">
                <TreePine className="h-3 w-3 mr-1" />
                权限继承已启用
              </Badge>
            )}
            {systemStatus?.conflictDetectionEnabled && (
              <Badge variant="secondary">
                <AlertTriangle className="h-3 w-3 mr-1" />
                冲突检测已启用
              </Badge>
            )}
            {systemStatus?.auditLoggingEnabled && (
              <Badge variant="secondary">
                <History className="h-3 w-3 mr-1" />
                审计日志已启用
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* 统计卡片 */}
      {renderStatsCards()}

      {/* 权限冲突警告 */}
      {stats && stats.conflictCount > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            检测到 {stats.conflictCount} 个权限冲突，建议立即处理以确保系统安全。
            <Button
              variant="link"
              className="p-0 h-auto text-red-600 underline ml-2"
              onClick={() => setActiveTab('conflicts')}
            >
              立即处理
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* 主要功能标签页 */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview" className="flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <span>概览</span>
          </TabsTrigger>
          <TabsTrigger value="config" className="flex items-center space-x-2">
            <Shield className="h-4 w-4" />
            <span>权限配置</span>
          </TabsTrigger>
          <TabsTrigger value="inheritance" className="flex items-center space-x-2">
            <TreePine className="h-4 w-4" />
            <span>继承树</span>
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center space-x-2">
            <FileText className="h-4 w-4" />
            <span>权限模板</span>
          </TabsTrigger>
          <TabsTrigger value="conflicts" className="flex items-center space-x-2">
            <AlertTriangle className="h-4 w-4" />
            <span>冲突检测</span>
            {stats && stats.conflictCount > 0 && (
              <Badge variant="destructive" className="ml-1">
                {stats.conflictCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center space-x-2">
            <History className="h-4 w-4" />
            <span>变更历史</span>
          </TabsTrigger>
        </TabsList>

        {/* 概览标签页 */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>系统概览</CardTitle>
              <CardDescription>
                部门权限管理系统的整体状态和关键指标
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  系统正在正常运行，所有核心功能均可用。定期检查权限冲突和审计日志以确保系统安全。
                </div>
                
                {/* 快速操作 */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button
                    variant="outline"
                    className="h-20 flex flex-col items-center justify-center space-y-2"
                    onClick={() => setActiveTab('config')}
                  >
                    <Shield className="h-6 w-6" />
                    <span>配置权限</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-20 flex flex-col items-center justify-center space-y-2"
                    onClick={() => setActiveTab('inheritance')}
                  >
                    <TreePine className="h-6 w-6" />
                    <span>查看继承</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-20 flex flex-col items-center justify-center space-y-2"
                    onClick={() => setActiveTab('conflicts')}
                  >
                    <AlertTriangle className="h-6 w-6" />
                    <span>检测冲突</span>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 权限配置标签页 */}
        <TabsContent value="config">
          <DepartmentPermissionConfig onPermissionChange={refreshData} />
        </TabsContent>

        {/* 权限继承树标签页 */}
        <TabsContent value="inheritance">
          <PermissionInheritanceTree />
        </TabsContent>

        {/* 权限模板标签页 */}
        <TabsContent value="templates">
          <PermissionTemplateManager onTemplateChange={refreshData} />
        </TabsContent>

        {/* 冲突检测标签页 */}
        <TabsContent value="conflicts">
          <PermissionConflictResolver autoDetect={true} onConflictResolved={refreshData} />
        </TabsContent>

        {/* 变更历史标签页 */}
        <TabsContent value="history">
          <PermissionHistory />
        </TabsContent>
      </Tabs>
    </div>
  );
}