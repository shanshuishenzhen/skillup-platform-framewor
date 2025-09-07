/**
 * 用户权限分配组件
 * 提供用户权限的查看、分配、批量操作等功能
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Users, 
  Shield, 
  Plus, 
  Minus, 
  Search, 
  Filter, 
  Download, 
  Upload,
  AlertTriangle,
  CheckCircle,
  Clock,
  Eye,
  Edit,
  Trash2,
  Copy,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

// 类型定义
interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
}

interface UserPermission {
  permission_id: string;
  source_type: 'direct' | 'role' | 'template';
  source_id: string;
  source_name: string;
  granted_at: string;
  granted_by: string;
}

interface PermissionTemplate {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  category: string;
  is_system: boolean;
  is_active: boolean;
}

interface PermissionConflict {
  id: string;
  conflict_type: 'duplicate' | 'contradictory' | 'redundant';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  permissions_involved: string[];
  suggested_resolution: string;
  auto_resolvable: boolean;
}

interface User {
  id: string;
  name: string;
  email: string;
  employee_id: string;
  department: string;
  role: string;
}

interface PermissionAssignmentProps {
  userId?: string;
  onPermissionChange?: () => void;
}

export default function PermissionAssignment({ userId, onPermissionChange }: PermissionAssignmentProps) {
  // 状态管理
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [userPermissions, setUserPermissions] = useState<UserPermission[]>([]);
  const [templates, setTemplates] = useState<PermissionTemplate[]>([]);
  const [conflicts, setConflicts] = useState<PermissionConflict[]>([]);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterSource, setFilterSource] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('assign');
  const [showConflicts, setShowConflicts] = useState(false);
  const [batchOperation, setBatchOperation] = useState<'add' | 'remove' | 'replace'>('add');
  const [operationReason, setOperationReason] = useState('');

  // 获取用户列表
  const fetchUsers = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/users');
      if (!response.ok) throw new Error('获取用户列表失败');
      const data = await response.json();
      setUsers(data.data.users || []);
    } catch (error) {
      console.error('获取用户列表失败:', error);
      toast.error('获取用户列表失败');
    }
  }, []);

  // 获取权限列表
  const fetchPermissions = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/permissions');
      if (!response.ok) throw new Error('获取权限列表失败');
      const data = await response.json();
      setPermissions(data.data.permissions || []);
    } catch (error) {
      console.error('获取权限列表失败:', error);
      toast.error('获取权限列表失败');
    }
  }, []);

  // 获取用户权限
  const fetchUserPermissions = useCallback(async (targetUserId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/users/${targetUserId}/permissions`);
      if (!response.ok) throw new Error('获取用户权限失败');
      const data = await response.json();
      setUserPermissions(data.data.permissions || []);
    } catch (error) {
      console.error('获取用户权限失败:', error);
      toast.error('获取用户权限失败');
    } finally {
      setLoading(false);
    }
  }, []);

  // 获取权限模板
  const fetchTemplates = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/permission-templates');
      if (!response.ok) throw new Error('获取权限模板失败');
      const data = await response.json();
      setTemplates(data.data.templates || []);
    } catch (error) {
      console.error('获取权限模板失败:', error);
      toast.error('获取权限模板失败');
    }
  }, []);

  // 检测权限冲突
  const checkPermissionConflicts = useCallback(async (targetUserId: string) => {
    try {
      const response = await fetch(`/api/admin/permission-conflicts?user_id=${targetUserId}`);
      if (!response.ok) throw new Error('检测权限冲突失败');
      const data = await response.json();
      setConflicts(data.data.conflicts || []);
      setShowConflicts(data.data.conflicts.length > 0);
    } catch (error) {
      console.error('检测权限冲突失败:', error);
      toast.error('检测权限冲突失败');
    }
  }, []);

  // 更新用户权限
  const updateUserPermissions = async (targetUserId: string, operation: 'add' | 'remove' | 'replace', permissionIds: string[]) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/users/${targetUserId}/permissions`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operation,
          permissions: permissionIds,
          reason: operationReason || `${operation === 'add' ? '添加' : operation === 'remove' ? '移除' : '替换'}权限`
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '更新权限失败');
      }

      const data = await response.json();
      toast.success(data.message || '权限更新成功');
      
      // 刷新用户权限
      await fetchUserPermissions(targetUserId);
      await checkPermissionConflicts(targetUserId);
      
      // 清空选择
      setSelectedPermissions([]);
      setOperationReason('');
      
      onPermissionChange?.();
    } catch (error) {
      console.error('更新权限失败:', error);
      toast.error(error instanceof Error ? error.message : '更新权限失败');
    } finally {
      setLoading(false);
    }
  };

  // 批量权限操作
  const batchUpdatePermissions = async () => {
    if (selectedUsers.length === 0 || selectedPermissions.length === 0) {
      toast.error('请选择用户和权限');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/admin/users/${selectedUsers[0]}/permissions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_ids: selectedUsers,
          operation: batchOperation,
          permissions: selectedPermissions,
          reason: operationReason || `批量${batchOperation === 'add' ? '添加' : '移除'}权限`
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '批量操作失败');
      }

      const data = await response.json();
      toast.success(data.message || '批量操作成功');
      
      // 清空选择
      setSelectedUsers([]);
      setSelectedPermissions([]);
      setOperationReason('');
      
      onPermissionChange?.();
    } catch (error) {
      console.error('批量操作失败:', error);
      toast.error(error instanceof Error ? error.message : '批量操作失败');
    } finally {
      setLoading(false);
    }
  };

  // 应用权限模板
  const applyTemplate = async (templateId: string, targetUserId: string, mode: 'add' | 'replace') => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/permission-templates', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          template_id: templateId,
          user_ids: [targetUserId],
          mode,
          reason: operationReason || `应用权限模板: ${mode === 'add' ? '添加' : '替换'}模式`
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '应用模板失败');
      }

      const data = await response.json();
      toast.success(data.message || '模板应用成功');
      
      // 刷新用户权限
      await fetchUserPermissions(targetUserId);
      await checkPermissionConflicts(targetUserId);
      
      onPermissionChange?.();
    } catch (error) {
      console.error('应用模板失败:', error);
      toast.error(error instanceof Error ? error.message : '应用模板失败');
    } finally {
      setLoading(false);
    }
  };

  // 解决权限冲突
  const resolveConflicts = async (conflictResolutions: Array<{ conflict_id: string; resolution: string; reason?: string }>) => {
    if (!selectedUser) return;

    try {
      setLoading(true);
      const response = await fetch('/api/admin/permission-conflicts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: selectedUser.id,
          conflicts: conflictResolutions
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '解决冲突失败');
      }

      const data = await response.json();
      toast.success(data.message || '冲突解决成功');
      
      // 刷新权限和冲突
      await fetchUserPermissions(selectedUser.id);
      await checkPermissionConflicts(selectedUser.id);
      
      onPermissionChange?.();
    } catch (error) {
      console.error('解决冲突失败:', error);
      toast.error(error instanceof Error ? error.message : '解决冲突失败');
    } finally {
      setLoading(false);
    }
  };

  // 初始化数据
  useEffect(() => {
    fetchUsers();
    fetchPermissions();
    fetchTemplates();
  }, [fetchUsers, fetchPermissions, fetchTemplates]);

  // 当选择用户时获取权限
  useEffect(() => {
    if (selectedUser) {
      fetchUserPermissions(selectedUser.id);
      checkPermissionConflicts(selectedUser.id);
    }
  }, [selectedUser, fetchUserPermissions, checkPermissionConflicts]);

  // 如果传入了userId，自动选择该用户
  useEffect(() => {
    if (userId && users.length > 0) {
      const user = users.find(u => u.id === userId);
      if (user) {
        setSelectedUser(user);
      }
    }
  }, [userId, users]);

  // 过滤权限
  const filteredPermissions = permissions.filter(permission => {
    const matchesSearch = permission.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         permission.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || permission.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  // 过滤用户权限
  const filteredUserPermissions = userPermissions.filter(userPerm => {
    const permission = permissions.find(p => p.id === userPerm.permission_id);
    if (!permission) return false;
    
    const matchesSearch = permission.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSource = filterSource === 'all' || userPerm.source_type === filterSource;
    return matchesSearch && matchesSource;
  });

  // 获取权限分类
  const categories = Array.from(new Set(permissions.map(p => p.category)));

  // 获取严重程度颜色
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'default';
    }
  };

  return (
    <div className="space-y-6">
      {/* 用户选择 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            用户权限管理
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-center">
            <div className="flex-1">
              <Label htmlFor="user-select">选择用户</Label>
              <Select
                value={selectedUser?.id || ''}
                onValueChange={(value) => {
                  const user = users.find(u => u.id === value);
                  setSelectedUser(user || null);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="请选择用户" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name} ({user.email}) - {user.department}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedUser && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => checkPermissionConflicts(selectedUser.id)}
                  disabled={loading}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  检测冲突
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 权限冲突警告 */}
      {showConflicts && conflicts.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            检测到 {conflicts.length} 个权限冲突，建议及时处理。
            <Button
              variant="link"
              className="p-0 h-auto"
              onClick={() => setActiveTab('conflicts')}
            >
              查看详情
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {selectedUser && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="assign">权限分配</TabsTrigger>
            <TabsTrigger value="batch">批量操作</TabsTrigger>
            <TabsTrigger value="templates">权限模板</TabsTrigger>
            <TabsTrigger value="conflicts" className={conflicts.length > 0 ? 'text-red-600' : ''}>
              冲突处理 {conflicts.length > 0 && `(${conflicts.length})`}
            </TabsTrigger>
          </TabsList>

          {/* 权限分配标签页 */}
          <TabsContent value="assign" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 可用权限 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>可用权限</span>
                    <Badge variant="outline">{filteredPermissions.length}</Badge>
                  </CardTitle>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Input
                        placeholder="搜索权限..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full"
                      />
                    </div>
                    <Select value={filterCategory} onValueChange={setFilterCategory}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">全部分类</SelectItem>
                        {categories.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-96">
                    <div className="space-y-2">
                      {filteredPermissions.map((permission) => {
                        const isSelected = selectedPermissions.includes(permission.id);
                        const hasPermission = userPermissions.some(up => up.permission_id === permission.id);
                        
                        return (
                          <div
                            key={permission.id}
                            className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                              isSelected ? 'bg-primary/10 border-primary' : 'hover:bg-muted'
                            } ${hasPermission ? 'opacity-50' : ''}`}
                            onClick={() => {
                              if (hasPermission) return;
                              setSelectedPermissions(prev => 
                                isSelected 
                                  ? prev.filter(id => id !== permission.id)
                                  : [...prev, permission.id]
                              );
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <Checkbox
                                    checked={isSelected}
                                    disabled={hasPermission}
                                    onChange={() => {}}
                                  />
                                  <span className="font-medium">{permission.name}</span>
                                  {hasPermission && (
                                    <Badge variant="secondary" className="text-xs">
                                      已拥有
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {permission.description}
                                </p>
                              </div>
                              <Badge variant="outline">{permission.category}</Badge>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                  
                  {selectedPermissions.length > 0 && (
                    <div className="mt-4 space-y-3">
                      <Separator />
                      <div>
                        <Label htmlFor="reason">操作原因</Label>
                        <Textarea
                          id="reason"
                          placeholder="请输入权限变更原因..."
                          value={operationReason}
                          onChange={(e) => setOperationReason(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => updateUserPermissions(selectedUser.id, 'add', selectedPermissions)}
                          disabled={loading}
                          className="flex-1"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          添加权限 ({selectedPermissions.length})
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 用户当前权限 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>当前权限</span>
                    <Badge variant="outline">{filteredUserPermissions.length}</Badge>
                  </CardTitle>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Input
                        placeholder="搜索当前权限..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full"
                      />
                    </div>
                    <Select value={filterSource} onValueChange={setFilterSource}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">全部来源</SelectItem>
                        <SelectItem value="direct">直接分配</SelectItem>
                        <SelectItem value="role">角色继承</SelectItem>
                        <SelectItem value="template">模板应用</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-96">
                    <div className="space-y-2">
                      {filteredUserPermissions.map((userPerm) => {
                        const permission = permissions.find(p => p.id === userPerm.permission_id);
                        if (!permission) return null;
                        
                        const isSelected = selectedPermissions.includes(permission.id);
                        const canRemove = userPerm.source_type === 'direct';
                        
                        return (
                          <div
                            key={`${userPerm.permission_id}-${userPerm.source_id}`}
                            className={`p-3 border rounded-lg transition-colors ${
                              isSelected && canRemove ? 'bg-destructive/10 border-destructive' : 'hover:bg-muted'
                            } ${!canRemove ? 'opacity-75' : ''}`}
                            onClick={() => {
                              if (!canRemove) return;
                              setSelectedPermissions(prev => 
                                isSelected 
                                  ? prev.filter(id => id !== permission.id)
                                  : [...prev, permission.id]
                              );
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  {canRemove && (
                                    <Checkbox
                                      checked={isSelected}
                                      onChange={() => {}}
                                    />
                                  )}
                                  <span className="font-medium">{permission.name}</span>
                                  <Badge 
                                    variant={userPerm.source_type === 'direct' ? 'default' : 'secondary'}
                                    className="text-xs"
                                  >
                                    {userPerm.source_type === 'direct' ? '直接' : 
                                     userPerm.source_type === 'role' ? '角色' : '模板'}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {permission.description}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  来源: {userPerm.source_name} | 授予时间: {new Date(userPerm.granted_at).toLocaleString()}
                                </p>
                              </div>
                              <Badge variant="outline">{permission.category}</Badge>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                  
                  {selectedPermissions.length > 0 && (
                    <div className="mt-4 space-y-3">
                      <Separator />
                      <div>
                        <Label htmlFor="remove-reason">移除原因</Label>
                        <Textarea
                          id="remove-reason"
                          placeholder="请输入权限移除原因..."
                          value={operationReason}
                          onChange={(e) => setOperationReason(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="destructive"
                          onClick={() => updateUserPermissions(selectedUser.id, 'remove', selectedPermissions)}
                          disabled={loading}
                          className="flex-1"
                        >
                          <Minus className="h-4 w-4 mr-2" />
                          移除权限 ({selectedPermissions.length})
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* 批量操作标签页 */}
          <TabsContent value="batch" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>批量权限操作</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>操作类型</Label>
                    <Select value={batchOperation} onValueChange={(value: 'add' | 'remove' | 'replace') => setBatchOperation(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="add">添加权限</SelectItem>
                        <SelectItem value="remove">移除权限</SelectItem>
                        <SelectItem value="replace">替换权限</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>选择用户 ({selectedUsers.length})</Label>
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => {
                        // 这里可以打开用户选择对话框
                      }}
                    >
                      <Users className="h-4 w-4 mr-2" />
                      选择用户
                    </Button>
                  </div>
                  <div>
                    <Label>选择权限 ({selectedPermissions.length})</Label>
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => {
                        // 这里可以打开权限选择对话框
                      }}
                    >
                      <Shield className="h-4 w-4 mr-2" />
                      选择权限
                    </Button>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="batch-reason">操作原因</Label>
                  <Textarea
                    id="batch-reason"
                    placeholder="请输入批量操作原因..."
                    value={operationReason}
                    onChange={(e) => setOperationReason(e.target.value)}
                    className="mt-1"
                  />
                </div>
                
                <Button
                  onClick={batchUpdatePermissions}
                  disabled={loading || selectedUsers.length === 0 || selectedPermissions.length === 0}
                  className="w-full"
                >
                  执行批量操作
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 权限模板标签页 */}
          <TabsContent value="templates" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>权限模板</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {templates.filter(t => t.is_active).map((template) => (
                    <Card key={template.id} className="cursor-pointer hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium">{template.name}</h4>
                            {template.is_system && (
                              <Badge variant="secondary" className="text-xs">
                                系统
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {template.description}
                          </p>
                          <div className="flex items-center justify-between">
                            <Badge variant="outline">{template.category}</Badge>
                            <span className="text-xs text-muted-foreground">
                              {template.permissions.length} 个权限
                            </span>
                          </div>
                          <div className="flex gap-2 mt-3">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => applyTemplate(template.id, selectedUser.id, 'add')}
                              disabled={loading}
                              className="flex-1"
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              添加
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => applyTemplate(template.id, selectedUser.id, 'replace')}
                              disabled={loading}
                              className="flex-1"
                            >
                              <Copy className="h-3 w-3 mr-1" />
                              替换
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 冲突处理标签页 */}
          <TabsContent value="conflicts" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  权限冲突处理
                </CardTitle>
              </CardHeader>
              <CardContent>
                {conflicts.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                    <p className="text-muted-foreground">未检测到权限冲突</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {conflicts.map((conflict) => (
                      <Card key={conflict.id} className="border-l-4 border-l-orange-500">
                        <CardContent className="p-4">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Badge variant={getSeverityColor(conflict.severity)}>
                                  {conflict.severity.toUpperCase()}
                                </Badge>
                                <Badge variant="outline">
                                  {conflict.conflict_type === 'duplicate' ? '重复权限' :
                                   conflict.conflict_type === 'contradictory' ? '矛盾权限' : '冗余权限'}
                                </Badge>
                              </div>
                              {conflict.auto_resolvable && (
                                <Badge variant="secondary" className="text-xs">
                                  可自动解决
                                </Badge>
                              )}
                            </div>
                            
                            <p className="text-sm">{conflict.description}</p>
                            
                            <div className="text-xs text-muted-foreground">
                              涉及权限: {conflict.permissions_involved.join(', ')}
                            </div>
                            
                            <div className="bg-muted p-3 rounded-lg">
                              <p className="text-sm font-medium mb-1">建议解决方案:</p>
                              <p className="text-sm text-muted-foreground">{conflict.suggested_resolution}</p>
                            </div>
                            
                            <div className="flex gap-2">
                              {conflict.auto_resolvable && (
                                <Button
                                  size="sm"
                                  onClick={() => resolveConflicts([{
                                    conflict_id: conflict.id,
                                    resolution: 'keep_role',
                                    reason: '自动解决：保留角色权限'
                                  }])}
                                  disabled={loading}
                                >
                                  自动解决
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  // 打开手动解决对话框
                                }}
                              >
                                手动解决
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}