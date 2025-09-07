/**
 * 部门权限管理组件
 * 提供部门权限配置、继承管理、冲突解决等功能的完整界面
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
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertTriangle,
  Shield,
  Users,
  Settings,
  Plus,
  Edit,
  Trash2,
  Copy,
  Download,
  Upload,
  RefreshCw,
  Search,
  Filter,
  MoreHorizontal,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronRight,
  TreePine,
  Zap
} from 'lucide-react';
import { useDepartmentPermissions } from '@/hooks/useDepartmentPermissions';
import { PermissionInheritanceTree } from './PermissionInheritanceTree';
import { PermissionConflictResolver } from './PermissionConflictResolver';
import { toast } from 'sonner';

/**
 * 部门信息接口
 */
interface Department {
  id: string;
  name: string;
  parent_id: string | null;
  level: number;
  path: string;
  description?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * 权限配置接口
 */
interface PermissionConfig {
  id?: string;
  department_id: string;
  resource: string;
  action: string;
  granted: boolean;
  priority: number;
  conditions?: Record<string, any>;
  inherit_from_parent: boolean;
  override_children: boolean;
  notes?: string;
  active: boolean;
}

/**
 * 权限模板接口
 */
interface PermissionTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  permissions: PermissionConfig[];
  is_predefined: boolean;
}

/**
 * 部门权限管理组件
 */
export function DepartmentPermissions() {
  // 状态管理
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [permissions, setPermissions] = useState<PermissionConfig[]>([]);
  const [templates, setTemplates] = useState<PermissionTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterResource, setFilterResource] = useState('');
  const [filterGranted, setFilterGranted] = useState<boolean | null>(null);
  const [showInherited, setShowInherited] = useState(true);
  const [activeTab, setActiveTab] = useState('permissions');
  
  // 对话框状态
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [editingPermission, setEditingPermission] = useState<PermissionConfig | null>(null);
  
  // 使用自定义Hook
  const {
    checkPermission,
    getUserPermissions,
    getDepartmentPermissions,
    getPermissionTemplates,
    createPermission,
    updatePermission,
    deletePermission,
    applyTemplate,
    detectConflicts,
    resolveConflict
  } = useDepartmentPermissions();
  
  /**
   * 初始化数据
   */
  useEffect(() => {
    loadDepartments();
    loadTemplates();
  }, []);
  
  /**
   * 当选中部门变化时加载权限
   */
  useEffect(() => {
    if (selectedDepartment) {
      loadDepartmentPermissions(selectedDepartment.id);
    }
  }, [selectedDepartment]);
  
  /**
   * 加载部门列表
   */
  const loadDepartments = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/departments');
      const result = await response.json();
      
      if (result.success) {
        setDepartments(result.data.departments || []);
        // 默认选择第一个部门
        if (result.data.departments?.length > 0) {
          setSelectedDepartment(result.data.departments[0]);
        }
      }
    } catch (error) {
      console.error('加载部门列表失败:', error);
      toast.error('加载部门列表失败');
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * 加载部门权限
   */
  const loadDepartmentPermissions = async (departmentId: string) => {
    try {
      setLoading(true);
      const result = await getDepartmentPermissions(departmentId, {
        include_inherited: showInherited
      });
      setPermissions(result || []);
    } catch (error) {
      console.error('加载部门权限失败:', error);
      toast.error('加载部门权限失败');
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * 加载权限模板
   */
  const loadTemplates = async () => {
    try {
      const result = await getPermissionTemplates();
      setTemplates(result || []);
    } catch (error) {
      console.error('加载权限模板失败:', error);
    }
  };
  
  /**
   * 处理权限保存
   */
  const handleSavePermission = async (permissionData: PermissionConfig) => {
    try {
      setLoading(true);
      
      if (editingPermission?.id) {
        await updatePermission(editingPermission.id, permissionData);
        toast.success('权限更新成功');
      } else {
        await createPermission(permissionData);
        toast.success('权限创建成功');
      }
      
      setShowPermissionDialog(false);
      setEditingPermission(null);
      
      // 重新加载权限
      if (selectedDepartment) {
        await loadDepartmentPermissions(selectedDepartment.id);
      }
    } catch (error) {
      console.error('保存权限失败:', error);
      toast.error('保存权限失败');
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * 处理权限删除
   */
  const handleDeletePermission = async (permissionId: string) => {
    if (!confirm('确定要删除这个权限配置吗？')) {
      return;
    }
    
    try {
      setLoading(true);
      await deletePermission(permissionId);
      toast.success('权限删除成功');
      
      // 重新加载权限
      if (selectedDepartment) {
        await loadDepartmentPermissions(selectedDepartment.id);
      }
    } catch (error) {
      console.error('删除权限失败:', error);
      toast.error('删除权限失败');
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * 应用权限模板
   */
  const handleApplyTemplate = async (templateId: string, departmentId: string) => {
    try {
      setLoading(true);
      await applyTemplate(templateId, departmentId);
      toast.success('权限模板应用成功');
      
      // 重新加载权限
      if (selectedDepartment) {
        await loadDepartmentPermissions(selectedDepartment.id);
      }
    } catch (error) {
      console.error('应用权限模板失败:', error);
      toast.error('应用权限模板失败');
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * 过滤权限列表
   */
  const filteredPermissions = permissions.filter(permission => {
    const matchesSearch = !searchTerm || 
      permission.resource.toLowerCase().includes(searchTerm.toLowerCase()) ||
      permission.action.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesResource = !filterResource || permission.resource === filterResource;
    const matchesGranted = filterGranted === null || permission.granted === filterGranted;
    
    return matchesSearch && matchesResource && matchesGranted;
  });
  
  /**
   * 获取资源列表
   */
  const getResourceList = () => {
    const resources = [...new Set(permissions.map(p => p.resource))];
    return resources.sort();
  };
  
  /**
   * 渲染部门选择器
   */
  const renderDepartmentSelector = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          选择部门
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Select
          value={selectedDepartment?.id || ''}
          onValueChange={(value) => {
            const dept = departments.find(d => d.id === value);
            setSelectedDepartment(dept || null);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="请选择部门" />
          </SelectTrigger>
          <SelectContent>
            {departments.map(dept => (
              <SelectItem key={dept.id} value={dept.id}>
                {'  '.repeat(dept.level)}{dept.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {selectedDepartment && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-600">
              <div><strong>部门路径:</strong> {selectedDepartment.path}</div>
              <div><strong>层级:</strong> {selectedDepartment.level}</div>
              {selectedDepartment.description && (
                <div><strong>描述:</strong> {selectedDepartment.description}</div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
  
  /**
   * 渲染权限列表
   */
  const renderPermissionsList = () => (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            权限配置
            {selectedDepartment && (
              <Badge variant="outline">
                {selectedDepartment.name}
              </Badge>
            )}
          </CardTitle>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setEditingPermission(null);
                setShowPermissionDialog(true);
              }}
              disabled={!selectedDepartment}
            >
              <Plus className="h-4 w-4 mr-1" />
              添加权限
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTemplateDialog(true)}
              disabled={!selectedDepartment}
            >
              <Download className="h-4 w-4 mr-1" />
              应用模板
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (selectedDepartment) {
                  loadDepartmentPermissions(selectedDepartment.id);
                }
              }}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
              刷新
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* 搜索和过滤 */}
        <div className="flex items-center gap-4 mb-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="搜索资源或操作..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <Select value={filterResource} onValueChange={setFilterResource}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="资源类型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">全部资源</SelectItem>
              {getResourceList().map(resource => (
                <SelectItem key={resource} value={resource}>
                  {resource}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select 
            value={filterGranted === null ? '' : filterGranted.toString()} 
            onValueChange={(value) => {
              setFilterGranted(value === '' ? null : value === 'true');
            }}
          >
            <SelectTrigger className="w-32">
              <SelectValue placeholder="授权状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">全部</SelectItem>
              <SelectItem value="true">已授权</SelectItem>
              <SelectItem value="false">未授权</SelectItem>
            </SelectContent>
          </Select>
          
          <div className="flex items-center gap-2">
            <Switch
              checked={showInherited}
              onCheckedChange={setShowInherited}
            />
            <Label className="text-sm">显示继承权限</Label>
          </div>
        </div>
        
        {/* 权限表格 */}
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>资源</TableHead>
                <TableHead>操作</TableHead>
                <TableHead>授权状态</TableHead>
                <TableHead>优先级</TableHead>
                <TableHead>来源</TableHead>
                <TableHead>继承</TableHead>
                <TableHead>覆盖子级</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPermissions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                    {selectedDepartment ? '暂无权限配置' : '请先选择部门'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredPermissions.map((permission) => (
                  <TableRow key={permission.id || `${permission.resource}-${permission.action}`}>
                    <TableCell className="font-medium">
                      {permission.resource}
                    </TableCell>
                    <TableCell>{permission.action}</TableCell>
                    <TableCell>
                      <Badge variant={permission.granted ? 'default' : 'secondary'}>
                        {permission.granted ? (
                          <><CheckCircle className="h-3 w-3 mr-1" />已授权</>
                        ) : (
                          <><XCircle className="h-3 w-3 mr-1" />未授权</>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{permission.priority}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={permission.inherit_from_parent ? 'secondary' : 'default'}>
                        {permission.inherit_from_parent ? '继承' : '直接'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {permission.inherit_from_parent ? (
                        <Eye className="h-4 w-4 text-green-500" />
                      ) : (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      )}
                    </TableCell>
                    <TableCell>
                      {permission.override_children ? (
                        <CheckCircle className="h-4 w-4 text-blue-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-gray-400" />
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setEditingPermission(permission);
                              setShowPermissionDialog(true);
                            }}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            编辑
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              // 复制权限配置
                              const newPermission = { ...permission };
                              delete newPermission.id;
                              setEditingPermission(newPermission);
                              setShowPermissionDialog(true);
                            }}
                          >
                            <Copy className="h-4 w-4 mr-2" />
                            复制
                          </DropdownMenuItem>
                          {permission.id && (
                            <DropdownMenuItem
                              onClick={() => handleDeletePermission(permission.id!)}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              删除
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
  
  /**
   * 渲染权限编辑对话框
   */
  const renderPermissionDialog = () => (
    <Dialog open={showPermissionDialog} onOpenChange={setShowPermissionDialog}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {editingPermission?.id ? '编辑权限' : '添加权限'}
          </DialogTitle>
        </DialogHeader>
        
        <PermissionEditForm
          permission={editingPermission}
          departmentId={selectedDepartment?.id || ''}
          onSave={handleSavePermission}
          onCancel={() => {
            setShowPermissionDialog(false);
            setEditingPermission(null);
          }}
        />
      </DialogContent>
    </Dialog>
  );
  
  /**
   * 渲染模板应用对话框
   */
  const renderTemplateDialog = () => (
    <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>应用权限模板</DialogTitle>
        </DialogHeader>
        
        <TemplateSelector
          templates={templates}
          onApply={(templateId) => {
            if (selectedDepartment) {
              handleApplyTemplate(templateId, selectedDepartment.id);
              setShowTemplateDialog(false);
            }
          }}
          onCancel={() => setShowTemplateDialog(false)}
        />
      </DialogContent>
    </Dialog>
  );
  
  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">部门权限管理</h1>
          <p className="text-gray-600 mt-1">
            管理部门权限配置、继承关系和访问控制
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setShowConflictDialog(true)}
          >
            <AlertTriangle className="h-4 w-4 mr-2" />
            冲突检测
          </Button>
        </div>
      </div>
      
      {/* 主要内容 */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* 左侧：部门选择 */}
        <div className="lg:col-span-1">
          {renderDepartmentSelector()}
        </div>
        
        {/* 右侧：权限管理 */}
        <div className="lg:col-span-3">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="permissions">权限配置</TabsTrigger>
              <TabsTrigger value="inheritance">继承关系</TabsTrigger>
              <TabsTrigger value="conflicts">冲突管理</TabsTrigger>
            </TabsList>
            
            <TabsContent value="permissions" className="mt-6">
              {renderPermissionsList()}
            </TabsContent>
            
            <TabsContent value="inheritance" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TreePine className="h-5 w-5" />
                    权限继承树
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedDepartment ? (
                    <PermissionInheritanceTree departmentId={selectedDepartment.id} />
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      请先选择部门
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="conflicts" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    权限冲突管理
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedDepartment ? (
                    <PermissionConflictResolver departmentId={selectedDepartment.id} />
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      请先选择部门
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      
      {/* 对话框 */}
      {renderPermissionDialog()}
      {renderTemplateDialog()}
    </div>
  );
}

/**
 * 权限编辑表单组件
 */
interface PermissionEditFormProps {
  permission: PermissionConfig | null;
  departmentId: string;
  onSave: (permission: PermissionConfig) => void;
  onCancel: () => void;
}

function PermissionEditForm({ permission, departmentId, onSave, onCancel }: PermissionEditFormProps) {
  const [formData, setFormData] = useState<PermissionConfig>({
    department_id: departmentId,
    resource: '',
    action: '',
    granted: true,
    priority: 100,
    conditions: {},
    inherit_from_parent: false,
    override_children: false,
    notes: '',
    active: true,
    ...permission
  });
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="resource">资源类型</Label>
          <Input
            id="resource"
            value={formData.resource}
            onChange={(e) => setFormData({ ...formData, resource: e.target.value })}
            placeholder="例如：users, departments, reports"
            required
          />
        </div>
        
        <div>
          <Label htmlFor="action">操作</Label>
          <Input
            id="action"
            value={formData.action}
            onChange={(e) => setFormData({ ...formData, action: e.target.value })}
            placeholder="例如：read, write, delete"
            required
          />
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="priority">优先级</Label>
          <Input
            id="priority"
            type="number"
            value={formData.priority}
            onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
            min="1"
            max="1000"
          />
        </div>
        
        <div className="space-y-2">
          <Label>授权状态</Label>
          <div className="flex items-center space-x-2">
            <Switch
              checked={formData.granted}
              onCheckedChange={(checked) => setFormData({ ...formData, granted: checked })}
            />
            <Label>{formData.granted ? '已授权' : '未授权'}</Label>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center space-x-2">
          <Switch
            checked={formData.inherit_from_parent}
            onCheckedChange={(checked) => setFormData({ ...formData, inherit_from_parent: checked })}
          />
          <Label>继承父级权限</Label>
        </div>
        
        <div className="flex items-center space-x-2">
          <Switch
            checked={formData.override_children}
            onCheckedChange={(checked) => setFormData({ ...formData, override_children: checked })}
          />
          <Label>覆盖子级权限</Label>
        </div>
      </div>
      
      <div>
        <Label htmlFor="notes">备注</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="权限配置说明..."
          rows={3}
        />
      </div>
      
      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          取消
        </Button>
        <Button type="submit">
          保存
        </Button>
      </div>
    </form>
  );
}

/**
 * 模板选择器组件
 */
interface TemplateSelectorProps {
  templates: PermissionTemplate[];
  onApply: (templateId: string) => void;
  onCancel: () => void;
}

function TemplateSelector({ templates, onApply, onCancel }: TemplateSelectorProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<PermissionTemplate | null>(null);
  
  const groupedTemplates = templates.reduce((acc, template) => {
    if (!acc[template.category]) {
      acc[template.category] = [];
    }
    acc[template.category].push(template);
    return acc;
  }, {} as Record<string, PermissionTemplate[]>);
  
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 模板列表 */}
        <div>
          <h3 className="font-medium mb-3">选择模板</h3>
          <ScrollArea className="h-96 border rounded-lg p-4">
            {Object.entries(groupedTemplates).map(([category, categoryTemplates]) => (
              <div key={category} className="mb-4">
                <h4 className="font-medium text-sm text-gray-600 mb-2">{category}</h4>
                <div className="space-y-2">
                  {categoryTemplates.map(template => (
                    <div
                      key={template.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedTemplate?.id === template.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedTemplate(template)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-medium">{template.name}</div>
                        {template.is_predefined && (
                          <Badge variant="secondary" className="text-xs">
                            预定义
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        {template.description}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {template.permissions.length} 个权限配置
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </ScrollArea>
        </div>
        
        {/* 模板详情 */}
        <div>
          <h3 className="font-medium mb-3">模板详情</h3>
          {selectedTemplate ? (
            <div className="border rounded-lg p-4">
              <div className="mb-4">
                <h4 className="font-medium">{selectedTemplate.name}</h4>
                <p className="text-sm text-gray-600 mt-1">
                  {selectedTemplate.description}
                </p>
              </div>
              
              <div>
                <h5 className="font-medium text-sm mb-2">权限配置:</h5>
                <ScrollArea className="h-64">
                  <div className="space-y-2">
                    {selectedTemplate.permissions.map((perm, index) => (
                      <div key={index} className="p-2 bg-gray-50 rounded text-sm">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">
                            {perm.resource}.{perm.action}
                          </span>
                          <Badge variant={perm.granted ? 'default' : 'secondary'}>
                            {perm.granted ? '授权' : '拒绝'}
                          </Badge>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          优先级: {perm.priority}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </div>
          ) : (
            <div className="border rounded-lg p-8 text-center text-gray-500">
              请选择一个模板查看详情
            </div>
          )}
        </div>
      </div>
      
      <div className="flex justify-end space-x-2">
        <Button variant="outline" onClick={onCancel}>
          取消
        </Button>
        <Button
          onClick={() => selectedTemplate && onApply(selectedTemplate.id)}
          disabled={!selectedTemplate}
        >
          应用模板
        </Button>
      </div>
    </div>
  );
}

export default DepartmentPermissions;