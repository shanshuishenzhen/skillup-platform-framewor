/**
 * 角色管理组件
 * 提供角色列表、编辑、权限配置等功能
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Shield, Users, Settings, Plus, Edit, Trash2, Save, X, AlertCircle, CheckCircle } from 'lucide-react';
import { UserRole, ROLE_DISPLAY_NAMES, ROLE_PERMISSIONS, getAllRoleOptions } from '@/types/roles';

/**
 * 权限接口定义
 */
interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
}

/**
 * 角色接口定义
 */
interface Role {
  id: string;
  name: string;
  displayName: string;
  description: string;
  permissions: string[];
  userCount: number;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * 角色表单数据接口
 */
interface RoleFormData {
  name: string;
  displayName: string;
  description: string;
  permissions: string[];
}

/**
 * 角色管理组件
 */
export default function RoleManagement() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [formData, setFormData] = useState<RoleFormData>({
    name: '',
    displayName: '',
    description: '',
    permissions: []
  });
  const [saving, setSaving] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  /**
   * 获取所有角色列表
   */
  const fetchRoles = async () => {
    try {
      const response = await fetch('/api/admin/roles', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('获取角色列表失败');
      }

      const data = await response.json();
      setRoles(data.roles || []);
    } catch (error) {
      console.error('获取角色列表失败:', error);
      setError('获取角色列表失败');
    }
  };

  /**
   * 获取所有权限列表
   */
  const fetchPermissions = async () => {
    try {
      const response = await fetch('/api/admin/permissions', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('获取权限列表失败');
      }

      const data = await response.json();
      setPermissions(data.permissions || []);
    } catch (error) {
      console.error('获取权限列表失败:', error);
      setError('获取权限列表失败');
    }
  };

  /**
   * 初始化数据
   */
  useEffect(() => {
    const initData = async () => {
      setLoading(true);
      await Promise.all([fetchRoles(), fetchPermissions()]);
      setLoading(false);
    };

    initData();
  }, []);

  /**
   * 打开编辑对话框
   */
  const openEditDialog = (role?: Role) => {
    if (role) {
      setEditingRole(role);
      setFormData({
        name: role.name,
        displayName: role.displayName,
        description: role.description,
        permissions: role.permissions
      });
    } else {
      setEditingRole(null);
      setFormData({
        name: '',
        displayName: '',
        description: '',
        permissions: []
      });
    }
    setShowEditDialog(true);
  };

  /**
   * 关闭编辑对话框
   */
  const closeEditDialog = () => {
    setShowEditDialog(false);
    setEditingRole(null);
    setFormData({
      name: '',
      displayName: '',
      description: '',
      permissions: []
    });
  };

  /**
   * 处理表单字段变化
   */
  const handleInputChange = (field: keyof RoleFormData, value: string | string[]) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  /**
   * 处理权限选择变化
   */
  const handlePermissionChange = (permissionId: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      permissions: checked
        ? [...prev.permissions, permissionId]
        : prev.permissions.filter(id => id !== permissionId)
    }));
  };

  /**
   * 保存角色
   */
  const saveRole = async () => {
    if (!formData.name.trim() || !formData.displayName.trim()) {
      alert('请填写角色名称和显示名称');
      return;
    }

    setSaving(true);
    try {
      const url = editingRole
        ? `/api/admin/roles/${editingRole.id}`
        : '/api/admin/roles';
      
      const method = editingRole ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '保存角色失败');
      }

      await fetchRoles();
      closeEditDialog();
      alert(editingRole ? '角色更新成功' : '角色创建成功');
    } catch (error) {
      console.error('保存角色失败:', error);
      alert(error instanceof Error ? error.message : '保存角色失败');
    } finally {
      setSaving(false);
    }
  };

  /**
   * 删除角色
   */
  const deleteRole = async (role: Role) => {
    if (role.isSystem) {
      alert('系统角色不能删除');
      return;
    }

    if (role.userCount > 0) {
      alert('该角色下还有用户，不能删除');
      return;
    }

    if (!confirm(`确定要删除角色"${role.displayName}"吗？`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/roles/${role.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '删除角色失败');
      }

      await fetchRoles();
      alert('角色删除成功');
    } catch (error) {
      console.error('删除角色失败:', error);
      alert(error instanceof Error ? error.message : '删除角色失败');
    }
  };

  /**
   * 获取权限分类列表
   */
  const getPermissionCategories = () => {
    const categories = Array.from(new Set(permissions.map(p => p.category)));
    return ['all', ...categories];
  };

  /**
   * 过滤权限列表
   */
  const getFilteredPermissions = () => {
    if (selectedCategory === 'all') {
      return permissions;
    }
    return permissions.filter(p => p.category === selectedCategory);
  };

  /**
   * 获取角色权限级别颜色
   */
  const getRoleLevelColor = (roleName: string) => {
    const role = roleName as UserRole;
    const level = ROLE_PERMISSIONS[role] || 0;
    
    if (level >= 80) return 'text-red-600 bg-red-50';
    if (level >= 60) return 'text-orange-600 bg-orange-50';
    if (level >= 40) return 'text-blue-600 bg-blue-50';
    return 'text-gray-600 bg-gray-50';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">加载中...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
          <span className="text-red-800">{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Shield className="h-6 w-6 text-blue-600 mr-3" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">角色管理</h2>
              <p className="text-gray-600 mt-1">管理系统角色和权限配置</p>
            </div>
          </div>
          <button
            onClick={() => openEditDialog()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            新建角色
          </button>
        </div>
      </div>

      {/* 角色列表 */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">角色列表</h3>
          <p className="text-gray-600 mt-1">共 {roles.length} 个角色</p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  角色信息
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  权限级别
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  用户数量
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  权限数量
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  创建时间
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {roles.map((role) => (
                <tr key={role.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="flex items-center">
                        <div className="text-sm font-medium text-gray-900">
                          {role.displayName}
                        </div>
                        {role.isSystem && (
                          <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            系统角色
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">{role.name}</div>
                      <div className="text-sm text-gray-500 mt-1">{role.description}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleLevelColor(role.name)}`}>
                      级别 {ROLE_PERMISSIONS[role.name as UserRole] || 0}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Users className="h-4 w-4 text-gray-400 mr-1" />
                      <span className="text-sm text-gray-900">{role.userCount}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">{role.permissions.length}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(role.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => openEditDialog(role)}
                        className="text-blue-600 hover:text-blue-900 transition-colors"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      {!role.isSystem && (
                        <button
                          onClick={() => deleteRole(role)}
                          className="text-red-600 hover:text-red-900 transition-colors"
                          disabled={role.userCount > 0}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 编辑对话框 */}
      {showEditDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            {/* 对话框头部 */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                {editingRole ? '编辑角色' : '新建角色'}
              </h3>
              <button
                onClick={closeEditDialog}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* 对话框内容 */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              <div className="space-y-6">
                {/* 基本信息 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      角色名称 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="请输入角色名称（英文）"
                      disabled={editingRole?.isSystem}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      显示名称 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.displayName}
                      onChange={(e) => handleInputChange('displayName', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="请输入显示名称（中文）"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    角色描述
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="请输入角色描述"
                  />
                </div>

                {/* 权限配置 */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-medium text-gray-900">权限配置</h4>
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="px-3 py-1 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="all">所有权限</option>
                      {getPermissionCategories().filter(cat => cat !== 'all').map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </div>

                  <div className="border border-gray-200 rounded-lg p-4 max-h-64 overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {getFilteredPermissions().map((permission) => (
                        <label key={permission.id} className="flex items-start space-x-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.permissions.includes(permission.id)}
                            onChange={(e) => handlePermissionChange(permission.id, e.target.checked)}
                            className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            disabled={editingRole?.isSystem}
                          />
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900">{permission.name}</div>
                            <div className="text-xs text-gray-500">{permission.description}</div>
                            <div className="text-xs text-blue-600 mt-1">{permission.category}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                  
                  <div className="mt-2 text-sm text-gray-600">
                    已选择 {formData.permissions.length} 个权限
                  </div>
                </div>
              </div>
            </div>

            {/* 对话框底部 */}
            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={closeEditDialog}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              >
                取消
              </button>
              <button
                onClick={saveRole}
                disabled={saving || editingRole?.isSystem}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>保存中...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>保存</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}