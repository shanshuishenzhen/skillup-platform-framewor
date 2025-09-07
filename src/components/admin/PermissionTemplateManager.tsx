/**
 * 权限模板管理组件
 * 提供权限模板的创建、编辑、删除、应用等功能
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Copy, 
  Search, 
  Filter,
  Shield,
  Users,
  Settings,
  Eye,
  Download,
  Upload,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { toast } from 'sonner';

// 类型定义
interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
}

interface PermissionTemplate {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  category: string;
  is_system: boolean;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  usage_count?: number;
  active_users?: number;
}

interface TemplateUsageStats {
  total_applications: number;
  successful_applications: number;
  failed_applications: number;
  active_users: number;
  recent_usage: Array<{
    user_id: string;
    user_name: string;
    applied_at: string;
    mode: 'add' | 'replace';
    status: 'success' | 'failed';
  }>;
}

interface User {
  id: string;
  name: string;
  email: string;
  department: string;
}

interface PermissionTemplateManagerProps {
  onTemplateChange?: () => void;
}

export default function PermissionTemplateManager({ onTemplateChange }: PermissionTemplateManagerProps) {
  // 状态管理
  const [templates, setTemplates] = useState<PermissionTemplate[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<PermissionTemplate | null>(null);
  const [templateStats, setTemplateStats] = useState<TemplateUsageStats | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all'); // all, system, custom
  const [filterStatus, setFilterStatus] = useState<string>('all'); // all, active, inactive
  const [loading, setLoading] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showApplyDialog, setShowApplyDialog] = useState(false);
  const [showStatsDialog, setShowStatsDialog] = useState(false);
  
  // 表单状态
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    permissions: [] as string[],
    is_active: true
  });
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [applyMode, setApplyMode] = useState<'add' | 'replace'>('add');
  const [applyReason, setApplyReason] = useState('');

  // 获取权限模板列表
  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterCategory !== 'all') params.append('category', filterCategory);
      if (filterType === 'system') params.append('is_system', 'true');
      if (filterType === 'custom') params.append('is_system', 'false');
      if (filterStatus === 'active') params.append('is_active', 'true');
      if (filterStatus === 'inactive') params.append('is_active', 'false');
      if (searchTerm) params.append('search', searchTerm);
      
      const response = await fetch(`/api/admin/permission-templates?${params}`);
      if (!response.ok) throw new Error('获取权限模板失败');
      const data = await response.json();
      setTemplates(data.data.templates || []);
    } catch (error) {
      console.error('获取权限模板失败:', error);
      toast.error('获取权限模板失败');
    } finally {
      setLoading(false);
    }
  }, [filterCategory, filterType, filterStatus, searchTerm]);

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

  // 获取模板使用统计
  const fetchTemplateStats = useCallback(async (templateId: string) => {
    try {
      const response = await fetch(`/api/admin/permission-templates/${templateId}`);
      if (!response.ok) throw new Error('获取模板统计失败');
      const data = await response.json();
      setTemplateStats(data.data.usage_stats || null);
    } catch (error) {
      console.error('获取模板统计失败:', error);
      toast.error('获取模板统计失败');
    }
  }, []);

  // 创建权限模板
  const createTemplate = async () => {
    if (!formData.name.trim()) {
      toast.error('请输入模板名称');
      return;
    }
    if (formData.permissions.length === 0) {
      toast.error('请选择至少一个权限');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/admin/permission-templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '创建模板失败');
      }

      const data = await response.json();
      toast.success(data.message || '模板创建成功');
      
      // 重置表单并关闭对话框
      setFormData({
        name: '',
        description: '',
        category: '',
        permissions: [],
        is_active: true
      });
      setShowCreateDialog(false);
      
      // 刷新模板列表
      await fetchTemplates();
      onTemplateChange?.();
    } catch (error) {
      console.error('创建模板失败:', error);
      toast.error(error instanceof Error ? error.message : '创建模板失败');
    } finally {
      setLoading(false);
    }
  };

  // 更新权限模板
  const updateTemplate = async () => {
    if (!selectedTemplate) return;
    
    if (!formData.name.trim()) {
      toast.error('请输入模板名称');
      return;
    }
    if (formData.permissions.length === 0) {
      toast.error('请选择至少一个权限');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/admin/permission-templates/${selectedTemplate.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '更新模板失败');
      }

      const data = await response.json();
      toast.success(data.message || '模板更新成功');
      
      // 重置表单并关闭对话框
      setFormData({
        name: '',
        description: '',
        category: '',
        permissions: [],
        is_active: true
      });
      setSelectedTemplate(null);
      setShowEditDialog(false);
      
      // 刷新模板列表
      await fetchTemplates();
      onTemplateChange?.();
    } catch (error) {
      console.error('更新模板失败:', error);
      toast.error(error instanceof Error ? error.message : '更新模板失败');
    } finally {
      setLoading(false);
    }
  };

  // 删除权限模板
  const deleteTemplate = async (templateId: string) => {
    if (!confirm('确定要删除这个权限模板吗？此操作不可撤销。')) {
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/admin/permission-templates/${templateId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '删除模板失败');
      }

      const data = await response.json();
      toast.success(data.message || '模板删除成功');
      
      // 刷新模板列表
      await fetchTemplates();
      onTemplateChange?.();
    } catch (error) {
      console.error('删除模板失败:', error);
      toast.error(error instanceof Error ? error.message : '删除模板失败');
    } finally {
      setLoading(false);
    }
  };

  // 应用权限模板
  const applyTemplate = async () => {
    if (!selectedTemplate) return;
    if (selectedUsers.length === 0) {
      toast.error('请选择要应用的用户');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/admin/permission-templates', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          template_id: selectedTemplate.id,
          user_ids: selectedUsers,
          mode: applyMode,
          reason: applyReason || `应用权限模板: ${selectedTemplate.name}`
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '应用模板失败');
      }

      const data = await response.json();
      toast.success(data.message || '模板应用成功');
      
      // 重置状态并关闭对话框
      setSelectedUsers([]);
      setApplyReason('');
      setShowApplyDialog(false);
      
      // 刷新模板列表
      await fetchTemplates();
      onTemplateChange?.();
    } catch (error) {
      console.error('应用模板失败:', error);
      toast.error(error instanceof Error ? error.message : '应用模板失败');
    } finally {
      setLoading(false);
    }
  };

  // 复制权限模板
  const duplicateTemplate = async (template: PermissionTemplate) => {
    setFormData({
      name: `${template.name} (副本)`,
      description: template.description,
      category: template.category,
      permissions: [...template.permissions],
      is_active: true
    });
    setShowCreateDialog(true);
  };

  // 编辑权限模板
  const editTemplate = (template: PermissionTemplate) => {
    if (template.is_system) {
      toast.error('系统模板不允许编辑');
      return;
    }
    
    setSelectedTemplate(template);
    setFormData({
      name: template.name,
      description: template.description,
      category: template.category,
      permissions: [...template.permissions],
      is_active: template.is_active
    });
    setShowEditDialog(true);
  };

  // 查看模板统计
  const viewTemplateStats = (template: PermissionTemplate) => {
    setSelectedTemplate(template);
    fetchTemplateStats(template.id);
    setShowStatsDialog(true);
  };

  // 初始化数据
  useEffect(() => {
    fetchTemplates();
    fetchPermissions();
    fetchUsers();
  }, [fetchTemplates, fetchPermissions, fetchUsers]);

  // 过滤模板
  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || template.category === filterCategory;
    const matchesType = filterType === 'all' || 
                       (filterType === 'system' && template.is_system) ||
                       (filterType === 'custom' && !template.is_system);
    const matchesStatus = filterStatus === 'all' ||
                         (filterStatus === 'active' && template.is_active) ||
                         (filterStatus === 'inactive' && !template.is_active);
    
    return matchesSearch && matchesCategory && matchesType && matchesStatus;
  });

  // 获取权限分类
  const categories = Array.from(new Set(permissions.map(p => p.category)));

  return (
    <div className="space-y-6">
      {/* 头部操作栏 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              权限模板管理
            </div>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              创建模板
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-64">
              <Input
                placeholder="搜索模板名称或描述..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="分类" />
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
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部类型</SelectItem>
                <SelectItem value="system">系统模板</SelectItem>
                <SelectItem value="custom">自定义模板</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="active">已激活</SelectItem>
                <SelectItem value="inactive">已禁用</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={fetchTemplates}
              disabled={loading}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 模板列表 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.map((template) => (
          <Card key={template.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{template.name}</CardTitle>
                <div className="flex items-center gap-2">
                  {template.is_system && (
                    <Badge variant="secondary" className="text-xs">
                      系统
                    </Badge>
                  )}
                  <Badge 
                    variant={template.is_active ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    {template.is_active ? '已激活' : '已禁用'}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {template.description || '暂无描述'}
              </p>
              
              <div className="flex items-center justify-between text-sm">
                <Badge variant="outline">{template.category}</Badge>
                <span className="text-muted-foreground">
                  {template.permissions.length} 个权限
                </span>
              </div>
              
              <div className="text-xs text-muted-foreground space-y-1">
                <div>创建时间: {new Date(template.created_at).toLocaleString()}</div>
                {template.usage_count !== undefined && (
                  <div>使用次数: {template.usage_count}</div>
                )}
                {template.active_users !== undefined && (
                  <div>活跃用户: {template.active_users}</div>
                )}
              </div>
              
              <Separator />
              
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => viewTemplateStats(template)}
                  className="flex-1"
                >
                  <Eye className="h-3 w-3 mr-1" />
                  查看
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSelectedTemplate(template);
                    setShowApplyDialog(true);
                  }}
                  disabled={!template.is_active}
                  className="flex-1"
                >
                  <Users className="h-3 w-3 mr-1" />
                  应用
                </Button>
              </div>
              
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => duplicateTemplate(template)}
                  className="flex-1"
                >
                  <Copy className="h-3 w-3 mr-1" />
                  复制
                </Button>
                {!template.is_system && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => editTemplate(template)}
                      className="flex-1"
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      编辑
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => deleteTemplate(template.id)}
                      disabled={loading}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTemplates.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">暂无权限模板</p>
          </CardContent>
        </Card>
      )}

      {/* 创建模板对话框 */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>创建权限模板</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="template-name">模板名称 *</Label>
                <Input
                  id="template-name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="请输入模板名称"
                />
              </div>
              <div>
                <Label htmlFor="template-category">分类</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择分类" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label htmlFor="template-description">描述</Label>
              <Textarea
                id="template-description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="请输入模板描述"
                rows={3}
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="template-active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
              />
              <Label htmlFor="template-active">激活模板</Label>
            </div>
            
            <div>
              <Label>选择权限 ({formData.permissions.length} 个已选择)</Label>
              <ScrollArea className="h-64 border rounded-lg p-4">
                <div className="space-y-2">
                  {permissions.map((permission) => {
                    const isSelected = formData.permissions.includes(permission.id);
                    return (
                      <div
                        key={permission.id}
                        className="flex items-center space-x-2 p-2 hover:bg-muted rounded-lg cursor-pointer"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            permissions: isSelected
                              ? prev.permissions.filter(id => id !== permission.id)
                              : [...prev.permissions, permission.id]
                          }));
                        }}
                      >
                        <Checkbox
                          checked={isSelected}
                          onChange={() => {}}
                        />
                        <div className="flex-1">
                          <div className="font-medium">{permission.name}</div>
                          <div className="text-sm text-muted-foreground">{permission.description}</div>
                        </div>
                        <Badge variant="outline">{permission.category}</Badge>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              取消
            </Button>
            <Button onClick={createTemplate} disabled={loading}>
              创建模板
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 编辑模板对话框 */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>编辑权限模板</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-template-name">模板名称 *</Label>
                <Input
                  id="edit-template-name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="请输入模板名称"
                />
              </div>
              <div>
                <Label htmlFor="edit-template-category">分类</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择分类" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label htmlFor="edit-template-description">描述</Label>
              <Textarea
                id="edit-template-description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="请输入模板描述"
                rows={3}
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="edit-template-active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
              />
              <Label htmlFor="edit-template-active">激活模板</Label>
            </div>
            
            <div>
              <Label>选择权限 ({formData.permissions.length} 个已选择)</Label>
              <ScrollArea className="h-64 border rounded-lg p-4">
                <div className="space-y-2">
                  {permissions.map((permission) => {
                    const isSelected = formData.permissions.includes(permission.id);
                    return (
                      <div
                        key={permission.id}
                        className="flex items-center space-x-2 p-2 hover:bg-muted rounded-lg cursor-pointer"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            permissions: isSelected
                              ? prev.permissions.filter(id => id !== permission.id)
                              : [...prev.permissions, permission.id]
                          }));
                        }}
                      >
                        <Checkbox
                          checked={isSelected}
                          onChange={() => {}}
                        />
                        <div className="flex-1">
                          <div className="font-medium">{permission.name}</div>
                          <div className="text-sm text-muted-foreground">{permission.description}</div>
                        </div>
                        <Badge variant="outline">{permission.category}</Badge>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              取消
            </Button>
            <Button onClick={updateTemplate} disabled={loading}>
              更新模板
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 应用模板对话框 */}
      <Dialog open={showApplyDialog} onOpenChange={setShowApplyDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>应用权限模板</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedTemplate && (
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium">{selectedTemplate.name}</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedTemplate.description}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline">{selectedTemplate.category}</Badge>
                  <span className="text-sm text-muted-foreground">
                    {selectedTemplate.permissions.length} 个权限
                  </span>
                </div>
              </div>
            )}
            
            <div>
              <Label>应用模式</Label>
              <Select value={applyMode} onValueChange={(value: 'add' | 'replace') => setApplyMode(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="add">添加权限（保留现有权限）</SelectItem>
                  <SelectItem value="replace">替换权限（清除现有权限）</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>选择用户 ({selectedUsers.length} 个已选择)</Label>
              <ScrollArea className="h-48 border rounded-lg p-4">
                <div className="space-y-2">
                  {users.map((user) => {
                    const isSelected = selectedUsers.includes(user.id);
                    return (
                      <div
                        key={user.id}
                        className="flex items-center space-x-2 p-2 hover:bg-muted rounded-lg cursor-pointer"
                        onClick={() => {
                          setSelectedUsers(prev => 
                            isSelected
                              ? prev.filter(id => id !== user.id)
                              : [...prev, user.id]
                          );
                        }}
                      >
                        <Checkbox
                          checked={isSelected}
                          onChange={() => {}}
                        />
                        <div className="flex-1">
                          <div className="font-medium">{user.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {user.email} - {user.department}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
            
            <div>
              <Label htmlFor="apply-reason">应用原因</Label>
              <Textarea
                id="apply-reason"
                value={applyReason}
                onChange={(e) => setApplyReason(e.target.value)}
                placeholder="请输入应用模板的原因..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApplyDialog(false)}>
              取消
            </Button>
            <Button onClick={applyTemplate} disabled={loading || selectedUsers.length === 0}>
              应用模板
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 模板统计对话框 */}
      <Dialog open={showStatsDialog} onOpenChange={setShowStatsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>模板使用统计</DialogTitle>
          </DialogHeader>
          {selectedTemplate && templateStats && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium">{selectedTemplate.name}</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedTemplate.description}
                </p>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {templateStats.total_applications}
                    </div>
                    <div className="text-sm text-muted-foreground">总应用次数</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {templateStats.successful_applications}
                    </div>
                    <div className="text-sm text-muted-foreground">成功次数</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {templateStats.failed_applications}
                    </div>
                    <div className="text-sm text-muted-foreground">失败次数</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {templateStats.active_users}
                    </div>
                    <div className="text-sm text-muted-foreground">活跃用户</div>
                  </CardContent>
                </Card>
              </div>
              
              {templateStats.recent_usage.length > 0 && (
                <div>
                  <h5 className="font-medium mb-3">最近使用记录</h5>
                  <ScrollArea className="h-48">
                    <div className="space-y-2">
                      {templateStats.recent_usage.map((usage, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <div className="font-medium">{usage.user_name}</div>
                            <div className="text-sm text-muted-foreground">
                              {new Date(usage.applied_at).toLocaleString()}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">
                              {usage.mode === 'add' ? '添加' : '替换'}
                            </Badge>
                            <Badge 
                              variant={usage.status === 'success' ? 'default' : 'destructive'}
                            >
                              {usage.status === 'success' ? '成功' : '失败'}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setShowStatsDialog(false)}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}