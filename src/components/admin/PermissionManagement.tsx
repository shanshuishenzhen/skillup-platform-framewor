/**
 * 权限管理主页面
 * 整合用户权限分配、权限模板管理、权限历史记录和冲突解决等功能
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Shield, 
  Users, 
  Template, 
  History, 
  AlertTriangle,
  Settings,
  BarChart3,
  CheckCircle,
  Clock,
  Zap,
  TrendingUp,
  UserCheck,
  FileText,
  Activity
} from 'lucide-react';
import { toast } from 'sonner';

// 导入子组件
import PermissionAssignment from './PermissionAssignment';
import PermissionTemplateManager from './PermissionTemplateManager';
import PermissionHistory from './PermissionHistory';
import PermissionConflictResolver from './PermissionConflictResolver';

// 类型定义
interface PermissionStats {
  total_users: number;
  users_with_permissions: number;
  total_permissions: number;
  active_templates: number;
  recent_changes: number;
  pending_conflicts: number;
  auto_resolvable_conflicts: number;
  permission_coverage: number;
}

interface RecentActivity {
  id: string;
  type: 'permission_assign' | 'permission_revoke' | 'template_apply' | 'conflict_resolve';
  user_name: string;
  operator_name: string;
  description: string;
  created_at: string;
}

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  action: () => void;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary';
  disabled?: boolean;
}

export default function PermissionManagement() {
  // 状态管理
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState<PermissionStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | undefined>();

  // 获取权限统计数据
  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/permission-stats');
      if (!response.ok) throw new Error('获取权限统计失败');
      
      const data = await response.json();
      setStats(data.data || null);
    } catch (error) {
      console.error('获取权限统计失败:', error);
      // 使用模拟数据
      setStats({
        total_users: 156,
        users_with_permissions: 142,
        total_permissions: 48,
        active_templates: 12,
        recent_changes: 23,
        pending_conflicts: 5,
        auto_resolvable_conflicts: 3,
        permission_coverage: 91.0
      });
    } finally {
      setLoading(false);
    }
  };

  // 获取最近活动
  const fetchRecentActivity = async () => {
    try {
      const response = await fetch('/api/admin/permission-history?limit=10&sort_by=created_at&sort_order=desc');
      if (!response.ok) throw new Error('获取最近活动失败');
      
      const data = await response.json();
      const activities: RecentActivity[] = (data.data?.records || []).map((record: any) => ({
        id: record.id,
        type: record.operation_type,
        user_name: record.user_name,
        operator_name: record.operator_name,
        description: `${getOperationTypeText(record.operation_type)} ${record.permission_name || record.template_name || ''}`,
        created_at: record.created_at
      }));
      setRecentActivity(activities);
    } catch (error) {
      console.error('获取最近活动失败:', error);
      // 使用模拟数据
      setRecentActivity([
        {
          id: '1',
          type: 'permission_assign',
          user_name: '张三',
          operator_name: '管理员',
          description: '分配权限 课程管理',
          created_at: new Date().toISOString()
        },
        {
          id: '2',
          type: 'template_apply',
          user_name: '李四',
          operator_name: '管理员',
          description: '应用模板 教师权限模板',
          created_at: new Date(Date.now() - 3600000).toISOString()
        }
      ]);
    }
  };

  // 获取操作类型显示文本
  const getOperationTypeText = (type: string) => {
    const typeMap: Record<string, string> = {
      permission_assign: '分配权限',
      permission_revoke: '撤销权限',
      template_apply: '应用模板',
      conflict_resolve: '解决冲突'
    };
    return typeMap[type] || type;
  };

  // 获取活动类型图标
  const getActivityIcon = (type: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      permission_assign: <UserCheck className="h-4 w-4 text-green-600" />,
      permission_revoke: <UserCheck className="h-4 w-4 text-red-600" />,
      template_apply: <Template className="h-4 w-4 text-blue-600" />,
      conflict_resolve: <CheckCircle className="h-4 w-4 text-orange-600" />
    };
    return iconMap[type] || <Activity className="h-4 w-4" />;
  };

  // 快速操作
  const quickActions: QuickAction[] = [
    {
      id: 'batch_assign',
      title: '批量权限分配',
      description: '为多个用户批量分配权限',
      icon: <Users className="h-5 w-5" />,
      action: () => setActiveTab('assignment')
    },
    {
      id: 'create_template',
      title: '创建权限模板',
      description: '创建新的权限模板',
      icon: <Template className="h-5 w-5" />,
      action: () => setActiveTab('templates')
    },
    {
      id: 'resolve_conflicts',
      title: '解决权限冲突',
      description: '检测并解决权限冲突',
      icon: <AlertTriangle className="h-5 w-5" />,
      action: () => setActiveTab('conflicts'),
      variant: 'destructive' as const,
      disabled: !stats?.pending_conflicts
    },
    {
      id: 'auto_resolve',
      title: '自动解决冲突',
      description: '自动解决可处理的权限冲突',
      icon: <Zap className="h-5 w-5" />,
      action: async () => {
        try {
          const response = await fetch('/api/admin/permission-conflicts/auto-resolve', {
            method: 'POST'
          });
          if (!response.ok) throw new Error('自动解决冲突失败');
          const data = await response.json();
          toast.success(data.message || '自动解决冲突成功');
          await fetchStats();
        } catch (error) {
          toast.error('自动解决冲突失败');
        }
      },
      variant: 'secondary' as const,
      disabled: !stats?.auto_resolvable_conflicts
    }
  ];

  // 处理用户选择
  const handleUserSelect = (userId: string) => {
    setSelectedUserId(userId);
    setActiveTab('assignment');
  };

  // 初始化数据
  useEffect(() => {
    fetchStats();
    fetchRecentActivity();
  }, []);

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">权限管理</h1>
          <p className="text-muted-foreground">
            管理用户权限、角色分配、权限模板和冲突解决
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchStats} disabled={loading}>
            <BarChart3 className="h-4 w-4 mr-2" />
            刷新统计
          </Button>
        </div>
      </div>

      {/* 主要内容 */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            概览
          </TabsTrigger>
          <TabsTrigger value="assignment" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            权限分配
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <Template className="h-4 w-4" />
            权限模板
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            变更历史
          </TabsTrigger>
          <TabsTrigger value="conflicts" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            冲突解决
            {stats?.pending_conflicts ? (
              <Badge variant="destructive" className="ml-1">
                {stats.pending_conflicts}
              </Badge>
            ) : null}
          </TabsTrigger>
        </TabsList>

        {/* 概览页面 */}
        <TabsContent value="overview" className="space-y-6">
          {/* 统计卡片 */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">总用户数</p>
                      <p className="text-3xl font-bold">{stats.total_users}</p>
                    </div>
                    <Users className="h-8 w-8 text-blue-600" />
                  </div>
                  <div className="mt-4 flex items-center text-sm">
                    <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
                    <span className="text-green-600">
                      {Math.round((stats.users_with_permissions / stats.total_users) * 100)}% 已分配权限
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">权限覆盖率</p>
                      <p className="text-3xl font-bold">{stats.permission_coverage}%</p>
                    </div>
                    <Shield className="h-8 w-8 text-green-600" />
                  </div>
                  <div className="mt-4 flex items-center text-sm">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-1" />
                    <span className="text-green-600">
                      {stats.users_with_permissions} 个用户已配置
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">活跃模板</p>
                      <p className="text-3xl font-bold">{stats.active_templates}</p>
                    </div>
                    <Template className="h-8 w-8 text-purple-600" />
                  </div>
                  <div className="mt-4 flex items-center text-sm">
                    <FileText className="h-4 w-4 text-purple-600 mr-1" />
                    <span className="text-purple-600">
                      {stats.total_permissions} 个权限可用
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">待处理冲突</p>
                      <p className="text-3xl font-bold text-red-600">{stats.pending_conflicts}</p>
                    </div>
                    <AlertTriangle className="h-8 w-8 text-red-600" />
                  </div>
                  <div className="mt-4 flex items-center text-sm">
                    <Zap className="h-4 w-4 text-orange-600 mr-1" />
                    <span className="text-orange-600">
                      {stats.auto_resolvable_conflicts} 个可自动解决
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* 警告信息 */}
          {stats?.pending_conflicts && stats.pending_conflicts > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                检测到 {stats.pending_conflicts} 个权限冲突，其中 {stats.auto_resolvable_conflicts} 个可以自动解决。
                建议及时处理以确保权限系统的正常运行。
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 快速操作 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  快速操作
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-3">
                  {quickActions.map((action) => (
                    <Button
                      key={action.id}
                      variant={action.variant || 'outline'}
                      className="justify-start h-auto p-4"
                      onClick={action.action}
                      disabled={action.disabled}
                    >
                      <div className="flex items-start gap-3">
                        {action.icon}
                        <div className="text-left">
                          <div className="font-medium">{action.title}</div>
                          <div className="text-sm text-muted-foreground">
                            {action.description}
                          </div>
                        </div>
                      </div>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 最近活动 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  最近活动
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentActivity.length > 0 ? (
                    recentActivity.map((activity) => (
                      <div key={activity.id} className="flex items-start gap-3 p-3 border rounded-lg">
                        {getActivityIcon(activity.type)}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium">
                            {activity.user_name}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {activity.description}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {new Date(activity.created_at).toLocaleString()} | {activity.operator_name}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">
                      暂无最近活动
                    </div>
                  )}
                </div>
                {recentActivity.length > 0 && (
                  <div className="mt-4">
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => setActiveTab('history')}
                    >
                      查看全部历史记录
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 权限分配页面 */}
        <TabsContent value="assignment">
          <PermissionAssignment userId={selectedUserId} />
        </TabsContent>

        {/* 权限模板页面 */}
        <TabsContent value="templates">
          <PermissionTemplateManager />
        </TabsContent>

        {/* 变更历史页面 */}
        <TabsContent value="history">
          <PermissionHistory />
        </TabsContent>

        {/* 冲突解决页面 */}
        <TabsContent value="conflicts">
          <PermissionConflictResolver />
        </TabsContent>
      </Tabs>
    </div>
  );
}