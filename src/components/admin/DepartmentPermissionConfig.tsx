/**
 * 部门权限配置组件
 * 提供部门权限的配置、继承、覆盖等功能
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Shield, 
  Users, 
  Settings, 
  TreePine,
  Plus,
  Edit,
  Trash2,
  Copy,
  Search,
  Filter,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronRight,
  Zap
} from 'lucide-react';
import { toast } from 'sonner';

// 类型定义
interface Department {
  id: string;
  name: string;
  code: string;
  parent_id?: string;
  level: number;
  children?: Department[];
}

interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
  resource: string;
  action: string;
}

interface DepartmentPermission {
  id: string;
  department_id: string;
  permission_id: string;
  granted: boolean;
  inherited: boolean;
  source_department_id?: string;
  override_reason?: string;
  created_at: string;
  updated_at: string;
}

interface PermissionTemplate {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  category: string;
}

interface DepartmentPermissionConfigProps {
  onPermissionChange?: () => void;
}

export function DepartmentPermissionConfig({ onPermissionChange }: DepartmentPermissionConfigProps) {
  // 状态管理
  const [departments, setDepartments] = useState<Department[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [departmentPermissions, setDepartmentPermissions] = useState<DepartmentPermission[]>([]);
  const [templates, setTemplates] = useState<PermissionTemplate[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [showInherited, setShowInherited] = useState(true);
  const [showOverrideDialog, setShowOverrideDialog] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [expandedDepartments, setExpandedDepartments] = useState<Set<string>>(new Set());
  
  // 表单状态
  const [overrideReason, setOverrideReason] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [applyMode, setApplyMode] = useState<'add' | 'replace'>('add');

  // 获取部门列表
  const fetchDepartments = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/departments');
      if (!response.ok) throw new Error('获取部门列表失败');
      const data = await response.json();
      setDepartments(data.data.departments || []);
    } catch (error) {
      console.error('获取部门列表失败:', error);
      toast.error('获取部门列表失败');
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

  // 获取部门权限
  const fetchDepartmentPermissions = useCallback(async (departmentId?: string) => {
    try {
      const url = departmentId 
        ? `/api/admin/departments/${departmentId}/permissions`
        : '/api/admin/departments/permissions';
      const response = await fetch(url);
      if (!response.ok) throw new Error('获取部门权限失败');
      const data = await response.json();
      setDepartmentPermissions(data.data.permissions || []);
    } catch (error) {
      console.error('获取部门权限失败:', error);
      toast.error('获取部门权限失败');
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

  // 构建部门树
  const buildDepartmentTree = useCallback((departments: Department[]): Department[] => {
    const departmentMap = new Map<string, Department>();
    departments.forEach(dept => {
      departmentMap.set(dept.id, { ...dept, children: [] });
    });

    const rootNodes: Department[] = [];
    departments.forEach(dept => {
      const deptNode = departmentMap.get(dept.id)!;
      if (dept.parent_id && departmentMap.has(dept.parent_id)) {
        const parent = departmentMap.get(dept.parent_id)!;
        parent.children!.push(deptNode);
      } else {
        rootNodes.push(deptNode);
      }
    });

    return rootNodes;
  }, []);

  // 获取部门的有效权限（包括继承）
  const getDepartmentEffectivePermissions = useCallback((departmentId: string): DepartmentPermission[] => {
    const directPermissions = departmentPermissions.filter(p => p.department_id === departmentId);
    const inheritedPermissions: DepartmentPermission[] = [];

    // 获取父部门权限
    const department = departments.find(d => d.id === departmentId);
    if (department?.parent_id) {
      const parentPermissions = getDepartmentEffectivePermissions(department.parent_id);
      parentPermissions.forEach(parentPerm => {
        // 检查是否已有直接权限覆盖
        const hasDirectPermission = directPermissions.some(p => 
          p.permission_id === parentPerm.permission_id
        );
        if (!hasDirectPermission) {
          inheritedPermissions.push({
            ...parentPerm,
            id: `inherited-${parentPerm.id}`,
            department_id: departmentId,
            inherited: true,
            source_department_id: parentPerm.department_id
          });
        }
      });
    }

    return [...directPermissions, ...inheritedPermissions];
  }, [departments, departmentPermissions]);

  // 更新部门权限
  const updateDepartmentPermission = async (departmentId: string, permissionId: string, granted: boolean, reason?: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/departments/${departmentId}/permissions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          permission_id: permissionId,
          granted,
          override_reason: reason
        }),
      });

      if (!response.ok) throw new Error('更新权限失败');
      
      await fetchDepartmentPermissions(selectedDepartment?.id);
      onPermissionChange?.();
      toast.success('权限更新成功');
    } catch (error) {
      console.error('更新权限失败:', error);
      toast.error('更新权限失败');
    } finally {
      setLoading(false);
    }
  };

  // 批量应用权限模板
  const applyTemplate = async () => {
    if (!selectedDepartment || !selectedTemplate) {
      toast.error('请选择部门和模板');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/admin/departments/${selectedDepartment.id}/permissions/template`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          template_id: selectedTemplate,
          mode: applyMode
        }),
      });

      if (!response.ok) throw new Error('应用模板失败');
      
      await fetchDepartmentPermissions(selectedDepartment.id);
      onPermissionChange?.();
      setShowTemplateDialog(false);
      toast.success('模板应用成功');
    } catch (error) {
      console.error('应用模板失败:', error);
      toast.error('应用模板失败');
    } finally {
      setLoading(false);
    }
  };

  // 切换部门展开状态
  const toggleDepartmentExpanded = (departmentId: string) => {
    const newExpanded = new Set(expandedDepartments);
    if (newExpanded.has(departmentId)) {
      newExpanded.delete(departmentId);
    } else {
      newExpanded.add(departmentId);
    }
    setExpandedDepartments(newExpanded);
  };

  // 渲染部门树节点
  const renderDepartmentNode = (department: Department, level: number = 0) => {
    const isExpanded = expandedDepartments.has(department.id);
    const isSelected = selectedDepartment?.id === department.id;
    const hasChildren = department.children && department.children.length > 0;

    return (
      <div key={department.id} className="space-y-1">
        <div 
          className={`flex items-center space-x-2 p-2 rounded cursor-pointer hover:bg-gray-50 ${
            isSelected ? 'bg-blue-50 border border-blue-200' : ''
          }`}
          style={{ paddingLeft: `${level * 20 + 8}px` }}
          onClick={() => setSelectedDepartment(department)}
        >
          {hasChildren && (
            <Button
              variant="ghost"
              size="sm"
              className="h-4 w-4 p-0"
              onClick={(e) => {
                e.stopPropagation();
                toggleDepartmentExpanded(department.id);
              }}
            >
              {isExpanded ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
            </Button>
          )}
          {!hasChildren && <div className="w-4" />}
          <Users className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium">{department.name}</span>
          <Badge variant="outline" className="text-xs">
            {department.code}
          </Badge>
        </div>
        
        {hasChildren && isExpanded && (
          <div>
            {department.children!.map(child => 
              renderDepartmentNode(child, level + 1)
            )}
          </div>
        )}
      </div>
    );
  };

  // 过滤权限
  const filteredPermissions = permissions.filter(permission => {
    const matchesSearch = !searchTerm || 
      permission.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      permission.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || permission.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  // 获取权限分类
  const permissionCategories = Array.from(new Set(permissions.map(p => p.category)));

  // 组件挂载时获取数据
  useEffect(() => {
    fetchDepartments();
    fetchPermissions();
    fetchTemplates();
  }, [fetchDepartments, fetchPermissions, fetchTemplates]);

  // 选择部门时获取权限
  useEffect(() => {
    if (selectedDepartment) {
      fetchDepartmentPermissions(selectedDepartment.id);
    }
  }, [selectedDepartment, fetchDepartmentPermissions]);

  const departmentTree = buildDepartmentTree(departments);
  const effectivePermissions = selectedDepartment ? getDepartmentEffectivePermissions(selectedDepartment.id) : [];

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">部门权限配置</h2>
          <p className="text-muted-foreground">
            配置部门权限、管理权限继承和覆盖规则
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              fetchDepartments();
              fetchPermissions();
              if (selectedDepartment) {
                fetchDepartmentPermissions(selectedDepartment.id);
              }
            }}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowTemplateDialog(true)}
            disabled={!selectedDepartment}
          >
            <Zap className="h-4 w-4 mr-2" />
            应用模板
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 部门树 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TreePine className="h-5 w-5" />
              <span>部门结构</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96">
              <div className="space-y-1">
                {departmentTree.map(department => 
                  renderDepartmentNode(department)
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* 权限配置 */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="h-5 w-5" />
              <span>
                {selectedDepartment ? `${selectedDepartment.name} - 权限配置` : '请选择部门'}
              </span>
            </CardTitle>
            {selectedDepartment && (
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Input
                    placeholder="搜索权限..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-48"
                  />
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部分类</SelectItem>
                    {permissionCategories.map(category => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={showInherited}
                    onCheckedChange={setShowInherited}
                  />
                  <Label className="text-sm">显示继承权限</Label>
                </div>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {selectedDepartment ? (
              <ScrollArea className="h-96">
                <div className="space-y-2">
                  {filteredPermissions.map(permission => {
                    const effectivePermission = effectivePermissions.find(p => p.permission_id === permission.id);
                    const isGranted = effectivePermission?.granted || false;
                    const isInherited = effectivePermission?.inherited || false;
                    const isOverridden = effectivePermission && !effectivePermission.inherited;

                    if (!showInherited && isInherited) return null;

                    return (
                      <div
                        key={permission.id}
                        className={`flex items-center justify-between p-3 border rounded-lg ${
                          isGranted ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">{permission.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {permission.category}
                            </Badge>
                            {isInherited && (
                              <Badge variant="secondary" className="text-xs">
                                继承
                              </Badge>
                            )}
                            {isOverridden && (
                              <Badge variant="default" className="text-xs">
                                覆盖
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            {permission.description}
                          </p>
                          {effectivePermission?.override_reason && (
                            <p className="text-xs text-blue-600 mt-1">
                              覆盖原因: {effectivePermission.override_reason}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={isGranted}
                            onCheckedChange={(checked) => {
                              if (isInherited && checked !== isGranted) {
                                setSelectedPermissions([permission.id]);
                                setShowOverrideDialog(true);
                              } else {
                                updateDepartmentPermission(
                                  selectedDepartment.id,
                                  permission.id,
                                  checked
                                );
                              }
                            }}
                            disabled={loading}
                          />
                          {isInherited && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedPermissions([permission.id]);
                                setShowOverrideDialog(true);
                              }}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            ) : (
              <div className="text-center py-8 text-gray-500">
                请从左侧选择一个部门来配置权限
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 权限覆盖对话框 */}
      <Dialog open={showOverrideDialog} onOpenChange={setShowOverrideDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>权限覆盖</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                此权限是从父部门继承的，覆盖后将不再继承父部门的权限设置。
              </AlertDescription>
            </Alert>
            <div>
              <Label htmlFor="override-reason">覆盖原因</Label>
              <Textarea
                id="override-reason"
                placeholder="请说明覆盖此权限的原因..."
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowOverrideDialog(false);
                setOverrideReason('');
                setSelectedPermissions([]);
              }}
            >
              取消
            </Button>
            <Button
              onClick={() => {
                if (selectedDepartment && selectedPermissions.length > 0) {
                  selectedPermissions.forEach(permissionId => {
                    const effectivePermission = effectivePermissions.find(p => p.permission_id === permissionId);
                    updateDepartmentPermission(
                      selectedDepartment.id,
                      permissionId,
                      !effectivePermission?.granted,
                      overrideReason
                    );
                  });
                }
                setShowOverrideDialog(false);
                setOverrideReason('');
                setSelectedPermissions([]);
              }}
              disabled={!overrideReason.trim()}
            >
              确认覆盖
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 应用模板对话框 */}
      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>应用权限模板</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="template-select">选择模板</Label>
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger>
                  <SelectValue placeholder="请选择权限模板" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map(template => (
                    <SelectItem key={template.id} value={template.id}>
                      <div>
                        <div className="font-medium">{template.name}</div>
                        <div className="text-sm text-gray-500">{template.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>应用模式</Label>
              <div className="space-y-2 mt-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="add-mode"
                    name="apply-mode"
                    value="add"
                    checked={applyMode === 'add'}
                    onChange={(e) => setApplyMode(e.target.value as 'add' | 'replace')}
                  />
                  <Label htmlFor="add-mode">追加模式 - 在现有权限基础上添加</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="replace-mode"
                    name="apply-mode"
                    value="replace"
                    checked={applyMode === 'replace'}
                    onChange={(e) => setApplyMode(e.target.value as 'add' | 'replace')}
                  />
                  <Label htmlFor="replace-mode">替换模式 - 替换所有现有权限</Label>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowTemplateDialog(false);
                setSelectedTemplate('');
                setApplyMode('add');
              }}
            >
              取消
            </Button>
            <Button
              onClick={applyTemplate}
              disabled={!selectedTemplate || loading}
            >
              应用模板
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}