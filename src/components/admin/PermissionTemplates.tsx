'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  FileText, 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Upload, 
  Edit, 
  Trash2, 
  Save,
  X,
  Copy,
  Eye,
  Settings,
  RefreshCw,
  Star,
  StarOff,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  Calendar,
  User,
  Building2,
  Key,
  Layers,
  GitBranch,
  Clock,
  Database,
  Shield
} from 'lucide-react';
import { toast } from 'sonner';

// 类型定义
interface Permission {
  id: string;
  name: string;
  code: string;
  description?: string;
  category: string;
  resource_type: string;
  actions: string[];
  is_system: boolean;
}

interface PermissionTemplate {
  id: string;
  name: string;
  description?: string;
  category: 'system' | 'department' | 'role' | 'custom';
  is_predefined: boolean;
  is_active: boolean;
  permissions: {
    permission_id: string;
    permission: Permission;
    is_required: boolean;
    notes?: string;
  }[];
  usage_count: number;
  created_by: string;
  created_by_name: string;
  created_at: string;
  updated_at: string;
  tags: string[];
}

interface Department {
  id: string;
  name: string;
  code: string;
  parent_id?: string;
  level: number;
}

interface TemplateApplication {
  id: string;
  template_id: string;
  template_name: string;
  department_id: string;
  department_name: string;
  applied_by: string;
  applied_by_name: string;
  applied_at: string;
  permissions_count: number;
  status: 'success' | 'partial' | 'failed';
  conflicts_count: number;
  notes?: string;
}

/**
 * 权限模板管理组件
 * 提供权限模板的创建、编辑、删除、导入、导出和应用功能
 * 
 * @returns 权限模板管理界面
 */
const PermissionTemplates: React.FC = () => {
  // 状态管理
  const [templates, setTemplates] = useState<PermissionTemplate[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [applications, setApplications] = useState<TemplateApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'system' | 'department' | 'role' | 'custom'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<PermissionTemplate | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showApplicationHistory, setShowApplicationHistory] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Partial<PermissionTemplate> | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());
  const [selectedDepartments, setSelectedDepartments] = useState<Set<string>>(new Set());
  const [importData, setImportData] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // 获取权限模板列表
  const fetchTemplates = useCallback(async () => {
    try {
      const token = localStorage.getItem('admin_token');
      if (!token) {
        toast.error('请先登录');
        return;
      }

      const response = await fetch('/api/admin/permission-templates', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('获取权限模板失败');
      }

      const data = await response.json();
      setTemplates(data.templates || []);
    } catch (error) {
      console.error('获取权限模板失败:', error);
      toast.error('获取权限模板失败');
    }
  }, []);

  // 获取权限列表
  const fetchPermissions = useCallback(async () => {
    try {
      const token = localStorage.getItem('admin_token');
      if (!token) return;

      const response = await fetch('/api/admin/permissions', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('获取权限列表失败');
      }

      const data = await response.json();
      setPermissions(data.permissions || []);
    } catch (error) {
      console.error('获取权限列表失败:', error);
      toast.error('获取权限列表失败');
    }
  }, []);

  // 获取部门列表
  const fetchDepartments = useCallback(async () => {
    try {
      const token = localStorage.getItem('admin_token');
      if (!token) return;

      const response = await fetch('/api/admin/departments', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('获取部门列表失败');
      }

      const data = await response.json();
      setDepartments(data.departments || []);
    } catch (error) {
      console.error('获取部门列表失败:', error);
      toast.error('获取部门列表失败');
    }
  }, []);

  // 获取模板应用历史
  const fetchApplicationHistory = useCallback(async (templateId?: string) => {
    try {
      const token = localStorage.getItem('admin_token');
      if (!token) return;

      const url = templateId 
        ? `/api/admin/permission-templates/${templateId}/applications`
        : '/api/admin/permission-templates/applications';

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('获取应用历史失败');
      }

      const data = await response.json();
      setApplications(data.applications || []);
    } catch (error) {
      console.error('获取应用历史失败:', error);
      toast.error('获取应用历史失败');
    }
  }, []);

  // 创建权限模板
  const createTemplate = async (templateData: Partial<PermissionTemplate>) => {
    try {
      setSaving(true);
      const token = localStorage.getItem('admin_token');
      if (!token) {
        toast.error('请先登录');
        return;
      }

      const response = await fetch('/api/admin/permission-templates', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...templateData,
          permissions: Array.from(selectedPermissions).map(permissionId => ({
            permission_id: permissionId,
            is_required: true
          }))
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '创建权限模板失败');
      }

      toast.success('权限模板创建成功');
      setShowCreateModal(false);
      setEditingTemplate(null);
      setSelectedPermissions(new Set());
      await fetchTemplates();
    } catch (error) {
      console.error('创建权限模板失败:', error);
      toast.error(error instanceof Error ? error.message : '创建权限模板失败');
    } finally {
      setSaving(false);
    }
  };

  // 更新权限模板
  const updateTemplate = async (templateId: string, templateData: Partial<PermissionTemplate>) => {
    try {
      setSaving(true);
      const token = localStorage.getItem('admin_token');
      if (!token) {
        toast.error('请先登录');
        return;
      }

      const response = await fetch(`/api/admin/permission-templates/${templateId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...templateData,
          permissions: Array.from(selectedPermissions).map(permissionId => ({
            permission_id: permissionId,
            is_required: true
          }))
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '更新权限模板失败');
      }

      toast.success('权限模板更新成功');
      setShowEditModal(false);
      setEditingTemplate(null);
      setSelectedPermissions(new Set());
      await fetchTemplates();
    } catch (error) {
      console.error('更新权限模板失败:', error);
      toast.error(error instanceof Error ? error.message : '更新权限模板失败');
    } finally {
      setSaving(false);
    }
  };

  // 删除权限模板
  const deleteTemplate = async (templateId: string) => {
    if (!confirm('确定要删除这个权限模板吗？此操作不可撤销。')) {
      return;
    }

    try {
      setSaving(true);
      const token = localStorage.getItem('admin_token');
      if (!token) {
        toast.error('请先登录');
        return;
      }

      const response = await fetch(`/api/admin/permission-templates/${templateId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '删除权限模板失败');
      }

      toast.success('权限模板删除成功');
      await fetchTemplates();
    } catch (error) {
      console.error('删除权限模板失败:', error);
      toast.error(error instanceof Error ? error.message : '删除权限模板失败');
    } finally {
      setSaving(false);
    }
  };

  // 应用权限模板
  const applyTemplate = async (templateId: string, departmentIds: string[]) => {
    try {
      setSaving(true);
      const token = localStorage.getItem('admin_token');
      if (!token) {
        toast.error('请先登录');
        return;
      }

      const response = await fetch(`/api/admin/permission-templates/${templateId}/apply`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          department_ids: departmentIds
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '应用权限模板失败');
      }

      const result = await response.json();
      toast.success(`权限模板应用成功，共处理 ${result.processed_count} 个部门`);
      setShowApplyModal(false);
      setSelectedDepartments(new Set());
      await fetchApplicationHistory();
    } catch (error) {
      console.error('应用权限模板失败:', error);
      toast.error(error instanceof Error ? error.message : '应用权限模板失败');
    } finally {
      setSaving(false);
    }
  };

  // 导出权限模板
  const exportTemplate = async (templateId: string) => {
    try {
      const token = localStorage.getItem('admin_token');
      if (!token) {
        toast.error('请先登录');
        return;
      }

      const response = await fetch(`/api/admin/permission-templates/${templateId}/export`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('导出权限模板失败');
      }

      const data = await response.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `permission-template-${templateId}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('权限模板导出成功');
    } catch (error) {
      console.error('导出权限模板失败:', error);
      toast.error('导出权限模板失败');
    }
  };

  // 导入权限模板
  const importTemplate = async () => {
    try {
      setSaving(true);
      const token = localStorage.getItem('admin_token');
      if (!token) {
        toast.error('请先登录');
        return;
      }

      const templateData = JSON.parse(importData);
      
      const response = await fetch('/api/admin/permission-templates/import', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(templateData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '导入权限模板失败');
      }

      toast.success('权限模板导入成功');
      setShowImportModal(false);
      setImportData('');
      await fetchTemplates();
    } catch (error) {
      console.error('导入权限模板失败:', error);
      toast.error(error instanceof Error ? error.message : '导入权限模板失败');
    } finally {
      setSaving(false);
    }
  };

  // 复制权限模板
  const duplicateTemplate = async (template: PermissionTemplate) => {
    const newTemplate = {
      ...template,
      name: `${template.name} (副本)`,
      is_predefined: false,
      category: 'custom' as const
    };
    
    setEditingTemplate(newTemplate);
    setSelectedPermissions(new Set(template.permissions.map(p => p.permission_id)));
    setShowCreateModal(true);
  };

  // 过滤模板
  const filteredTemplates = templates.filter(template => {
    // 搜索过滤
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      if (!template.name.toLowerCase().includes(searchLower) &&
          !(template.description || '').toLowerCase().includes(searchLower) &&
          !template.tags.some(tag => tag.toLowerCase().includes(searchLower))) {
        return false;
      }
    }
    
    // 分类过滤
    if (categoryFilter !== 'all' && template.category !== categoryFilter) {
      return false;
    }
    
    // 状态过滤
    if (statusFilter !== 'all') {
      if (statusFilter === 'active' && !template.is_active) return false;
      if (statusFilter === 'inactive' && template.is_active) return false;
    }
    
    return true;
  });

  // 渲染模板卡片
  const renderTemplateCard = (template: PermissionTemplate) => {
    return (
      <div
        key={template.id}
        className="bg-white border border-gray-200 rounded-lg p-6 hover:border-gray-300 transition-colors"
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <h3 className="text-lg font-semibold text-gray-900">{template.name}</h3>
              {template.is_predefined && (
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                  预定义
                </span>
              )}
              {!template.is_active && (
                <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">
                  已禁用
                </span>
              )}
            </div>
            {template.description && (
              <p className="text-sm text-gray-600 mb-3">{template.description}</p>
            )}
            <div className="flex items-center space-x-4 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Key className="w-3 h-3" />
                {template.permissions.length} 权限
              </span>
              <span className="flex items-center gap-1">
                <Building2 className="w-3 h-3" />
                {template.usage_count} 次使用
              </span>
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" />
                {template.created_by_name}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(template.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-1 ml-4">
            <button
              onClick={() => {
                setSelectedTemplate(template);
                setSelectedDepartments(new Set());
                setShowApplyModal(true);
              }}
              className="p-2 text-blue-600 hover:bg-blue-100 rounded transition-colors"
              title="应用模板"
            >
              <GitBranch className="w-4 h-4" />
            </button>
            <button
              onClick={() => duplicateTemplate(template)}
              className="p-2 text-green-600 hover:bg-green-100 rounded transition-colors"
              title="复制模板"
            >
              <Copy className="w-4 h-4" />
            </button>
            <button
              onClick={() => exportTemplate(template.id)}
              className="p-2 text-purple-600 hover:bg-purple-100 rounded transition-colors"
              title="导出模板"
            >
              <Download className="w-4 h-4" />
            </button>
            {!template.is_predefined && (
              <>
                <button
                  onClick={() => {
                    setEditingTemplate(template);
                    setSelectedPermissions(new Set(template.permissions.map(p => p.permission_id)));
                    setShowEditModal(true);
                  }}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                  title="编辑模板"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => deleteTemplate(template.id)}
                  className="p-2 text-red-600 hover:bg-red-100 rounded transition-colors"
                  title="删除模板"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>
        
        {/* 标签 */}
        {template.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {template.tags.map(tag => (
              <span
                key={tag}
                className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
        
        {/* 权限预览 */}
        <div className="border-t border-gray-100 pt-3">
          <h4 className="text-sm font-medium text-gray-700 mb-2">包含权限</h4>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {template.permissions.slice(0, 5).map(tp => (
              <div key={tp.permission_id} className="flex items-center justify-between text-xs">
                <span className="text-gray-600">{tp.permission.name}</span>
                <span className="text-gray-400">{tp.permission.category}</span>
              </div>
            ))}
            {template.permissions.length > 5 && (
              <div className="text-xs text-gray-500 text-center py-1">
                还有 {template.permissions.length - 5} 个权限...
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // 渲染模板列表项
  const renderTemplateListItem = (template: PermissionTemplate) => {
    return (
      <div
        key={template.id}
        className="bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 flex-1">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <h3 className="font-medium text-gray-900">{template.name}</h3>
                {template.is_predefined && (
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                    预定义
                  </span>
                )}
                {!template.is_active && (
                  <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">
                    已禁用
                  </span>
                )}
              </div>
              {template.description && (
                <p className="text-sm text-gray-600 mb-2">{template.description}</p>
              )}
              <div className="flex items-center space-x-4 text-xs text-gray-500">
                <span>{template.permissions.length} 权限</span>
                <span>{template.usage_count} 次使用</span>
                <span>{template.created_by_name}</span>
                <span>{new Date(template.created_at).toLocaleDateString()}</span>
              </div>
            </div>
            <div className="text-sm text-gray-500">
              {template.category}
            </div>
          </div>
          <div className="flex items-center space-x-1 ml-4">
            <button
              onClick={() => {
                setSelectedTemplate(template);
                setSelectedDepartments(new Set());
                setShowApplyModal(true);
              }}
              className="p-2 text-blue-600 hover:bg-blue-100 rounded transition-colors"
              title="应用模板"
            >
              <GitBranch className="w-4 h-4" />
            </button>
            <button
              onClick={() => duplicateTemplate(template)}
              className="p-2 text-green-600 hover:bg-green-100 rounded transition-colors"
              title="复制模板"
            >
              <Copy className="w-4 h-4" />
            </button>
            <button
              onClick={() => exportTemplate(template.id)}
              className="p-2 text-purple-600 hover:bg-purple-100 rounded transition-colors"
              title="导出模板"
            >
              <Download className="w-4 h-4" />
            </button>
            {!template.is_predefined && (
              <>
                <button
                  onClick={() => {
                    setEditingTemplate(template);
                    setSelectedPermissions(new Set(template.permissions.map(p => p.permission_id)));
                    setShowEditModal(true);
                  }}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                  title="编辑模板"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => deleteTemplate(template.id)}
                  className="p-2 text-red-600 hover:bg-red-100 rounded transition-colors"
                  title="删除模板"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  // 渲染创建/编辑模板模态框
  const renderTemplateModal = (isEdit: boolean) => {
    const isShow = isEdit ? showEditModal : showCreateModal;
    const setIsShow = isEdit ? setShowEditModal : setShowCreateModal;
    
    if (!isShow) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              {isEdit ? '编辑权限模板' : '创建权限模板'}
            </h2>
            <button
              onClick={() => {
                setIsShow(false);
                setEditingTemplate(null);
                setSelectedPermissions(new Set());
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
            <div className="space-y-6">
              {/* 基本信息 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    模板名称 *
                  </label>
                  <input
                    type="text"
                    value={editingTemplate?.name || ''}
                    onChange={(e) => setEditingTemplate(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="请输入模板名称"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    分类 *
                  </label>
                  <select
                    value={editingTemplate?.category || 'custom'}
                    onChange={(e) => setEditingTemplate(prev => ({ ...prev, category: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="system">系统模板</option>
                    <option value="department">部门模板</option>
                    <option value="role">角色模板</option>
                    <option value="custom">自定义模板</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  描述
                </label>
                <textarea
                  value={editingTemplate?.description || ''}
                  onChange={(e) => setEditingTemplate(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="请输入模板描述"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  标签（用逗号分隔）
                </label>
                <input
                  type="text"
                  value={editingTemplate?.tags?.join(', ') || ''}
                  onChange={(e) => setEditingTemplate(prev => ({ 
                    ...prev, 
                    tags: e.target.value.split(',').map(tag => tag.trim()).filter(Boolean)
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="例如：管理员, 财务, 基础权限"
                />
              </div>
              
              {/* 权限选择 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  选择权限 *
                </label>
                <div className="border border-gray-300 rounded-lg p-4 max-h-64 overflow-y-auto">
                  {permissions.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">暂无权限数据</p>
                  ) : (
                    <div className="space-y-2">
                      {permissions.reduce((groups, permission) => {
                        const category = permission.category;
                        if (!groups[category]) {
                          groups[category] = [];
                        }
                        groups[category].push(permission);
                        return groups;
                      }, {} as Record<string, Permission[]>)}
                      {Object.entries(
                        permissions.reduce((groups, permission) => {
                          const category = permission.category;
                          if (!groups[category]) {
                            groups[category] = [];
                          }
                          groups[category].push(permission);
                          return groups;
                        }, {} as Record<string, Permission[]>)
                      ).map(([category, categoryPermissions]) => (
                        <div key={category} className="">
                          <h4 className="text-sm font-medium text-gray-700 mb-2">{category}</h4>
                          <div className="space-y-1 ml-4">
                            {categoryPermissions.map(permission => (
                              <label key={permission.id} className="flex items-center space-x-2">
                                <input
                                  type="checkbox"
                                  checked={selectedPermissions.has(permission.id)}
                                  onChange={(e) => {
                                    const newSelected = new Set(selectedPermissions);
                                    if (e.target.checked) {
                                      newSelected.add(permission.id);
                                    } else {
                                      newSelected.delete(permission.id);
                                    }
                                    setSelectedPermissions(newSelected);
                                  }}
                                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-sm text-gray-700">{permission.name}</span>
                                <span className="text-xs text-gray-500">({permission.code})</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  已选择 {selectedPermissions.size} 个权限
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
            <button
              onClick={() => {
                setIsShow(false);
                setEditingTemplate(null);
                setSelectedPermissions(new Set());
              }}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              取消
            </button>
            <button
              onClick={() => {
                if (!editingTemplate?.name || selectedPermissions.size === 0) {
                  toast.error('请填写必填字段');
                  return;
                }
                
                if (isEdit && editingTemplate.id) {
                  updateTemplate(editingTemplate.id, editingTemplate);
                } else {
                  createTemplate(editingTemplate);
                }
              }}
              disabled={saving || !editingTemplate?.name || selectedPermissions.size === 0}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {isEdit ? '更新' : '创建'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // 渲染应用模板模态框
  const renderApplyModal = () => {
    if (!showApplyModal || !selectedTemplate) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              应用权限模板: {selectedTemplate.name}
            </h2>
            <button
              onClick={() => {
                setShowApplyModal(false);
                setSelectedTemplate(null);
                setSelectedDepartments(new Set());
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          
          <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)]">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">模板信息</h3>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">{selectedTemplate.description}</p>
                  <p className="text-xs text-gray-500">
                    包含 {selectedTemplate.permissions.length} 个权限
                  </p>
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">选择应用部门 *</h3>
                <div className="border border-gray-300 rounded-lg p-4 max-h-48 overflow-y-auto">
                  {departments.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">暂无部门数据</p>
                  ) : (
                    <div className="space-y-2">
                      {departments.map(department => (
                        <label key={department.id} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={selectedDepartments.has(department.id)}
                            onChange={(e) => {
                              const newSelected = new Set(selectedDepartments);
                              if (e.target.checked) {
                                newSelected.add(department.id);
                              } else {
                                newSelected.delete(department.id);
                              }
                              setSelectedDepartments(newSelected);
                            }}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">{department.name}</span>
                          <span className="text-xs text-gray-500">({department.code})</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  已选择 {selectedDepartments.size} 个部门
                </p>
              </div>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5" />
                  <div className="text-sm text-yellow-800">
                    <p className="font-medium mb-1">注意事项：</p>
                    <ul className="text-xs space-y-1">
                      <li>• 应用模板将为选中部门添加模板中的所有权限</li>
                      <li>• 如果部门已有相同权限，将保持现有配置</li>
                      <li>• 权限冲突将自动检测并提示解决方案</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
            <button
              onClick={() => {
                setShowApplyModal(false);
                setSelectedTemplate(null);
                setSelectedDepartments(new Set());
              }}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              取消
            </button>
            <button
              onClick={() => {
                if (selectedDepartments.size === 0) {
                  toast.error('请选择要应用的部门');
                  return;
                }
                
                applyTemplate(selectedTemplate.id, Array.from(selectedDepartments));
              }}
              disabled={saving || selectedDepartments.size === 0}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <GitBranch className="w-4 h-4" />
              )}
              应用模板
            </button>
          </div>
        </div>
      </div>
    );
  };

  // 渲染导入模态框
  const renderImportModal = () => {
    if (!showImportModal) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              导入权限模板
            </h2>
            <button
              onClick={() => {
                setShowImportModal(false);
                setImportData('');
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          
          <div className="p-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  模板数据 (JSON格式) *
                </label>
                <textarea
                  value={importData}
                  onChange={(e) => setImportData(e.target.value)}
                  rows={12}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                  placeholder="请粘贴导出的权限模板JSON数据..."
                />
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-start space-x-2">
                  <Info className="w-4 h-4 text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">导入说明：</p>
                    <ul className="text-xs space-y-1">
                      <li>• 请确保JSON格式正确</li>
                      <li>• 导入的模板将自动设置为自定义类型</li>
                      <li>• 如果权限不存在，将跳过该权限</li>
                      <li>• 模板名称重复时将自动添加后缀</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
            <button
              onClick={() => {
                setShowImportModal(false);
                setImportData('');
              }}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              取消
            </button>
            <button
              onClick={importTemplate}
              disabled={saving || !importData.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              导入
            </button>
          </div>
        </div>
      </div>
    );
  };

  // 初始化加载
  useEffect(() => {
    const initializeData = async () => {
      setLoading(true);
      await Promise.all([
        fetchTemplates(),
        fetchPermissions(),
        fetchDepartments()
      ]);
      setLoading(false);
    };
    
    initializeData();
  }, [fetchTemplates, fetchPermissions, fetchDepartments]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-500">加载权限模板中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* 头部工具栏 */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">权限模板管理</h2>
            <p className="text-sm text-gray-500 mt-1">
              创建和管理权限模板，快速应用到部门
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                setShowApplicationHistory(true);
                fetchApplicationHistory();
              }}
              className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
            >
              <Clock className="w-4 h-4" />
              应用历史
            </button>
            <button
              onClick={() => setShowImportModal(true)}
              className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              导入模板
            </button>
            <button
              onClick={() => {
                setEditingTemplate({ category: 'custom', is_active: true, tags: [] });
                setSelectedPermissions(new Set());
                setShowCreateModal(true);
              }}
              className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              创建模板
            </button>
          </div>
        </div>
        
        {/* 搜索和筛选 */}
        <div className="flex items-center space-x-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="搜索模板名称、描述、标签..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">全部分类</option>
            <option value="system">系统模板</option>
            <option value="department">部门模板</option>
            <option value="role">角色模板</option>
            <option value="custom">自定义模板</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">全部状态</option>
            <option value="active">启用</option>
            <option value="inactive">禁用</option>
          </select>
          <div className="flex items-center space-x-2 border border-gray-300 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1 rounded ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-400'}`}
            >
              <Layers className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1 rounded ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-400'}`}
            >
              <FileText className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
      
      {/* 模板列表 */}
      <div className="flex-1 overflow-auto p-4">
        {filteredTemplates.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">暂无权限模板</h3>
            <p className="text-gray-500 mb-4">创建第一个权限模板来快速配置部门权限</p>
            <button
              onClick={() => {
                setEditingTemplate({ category: 'custom', is_active: true, tags: [] });
                setSelectedPermissions(new Set());
                setShowCreateModal(true);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 mx-auto"
            >
              <Plus className="w-4 h-4" />
              创建模板
            </button>
          </div>
        ) : (
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
            {filteredTemplates.map(template => 
              viewMode === 'grid' ? renderTemplateCard(template) : renderTemplateListItem(template)
            )}
          </div>
        )}
      </div>
      
      {/* 模态框 */}
      {renderTemplateModal(false)}
      {renderTemplateModal(true)}
      {renderApplyModal()}
      {renderImportModal()}
    </div>
  );
};

export default PermissionTemplates;