'use client';

import React, { useState, useEffect } from 'react';
import { X, Building2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface Department {
  id: string;
  name: string;
  code: string;
  description?: string;
  parent_id?: string;
  level: number;
  path: string;
  sort_order: number;
  manager_id?: string;
  contact_phone?: string;
  contact_email?: string;
  address?: string;
  status: 'active' | 'inactive';
}

interface DepartmentCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  departments: Department[];
  parentDepartment?: Department | null;
}

/**
 * 部门创建模态框组件
 * 提供部门创建功能，包含表单验证和数据提交
 * 
 * @param props - 组件属性
 * @param props.isOpen - 是否显示模态框
 * @param props.onClose - 关闭回调函数
 * @param props.onSuccess - 成功回调函数
 * @param props.departments - 部门列表（用于选择父部门）
 * @param props.parentDepartment - 预设的父部门
 * @returns 部门创建模态框
 */
const DepartmentCreateModal: React.FC<DepartmentCreateModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  departments,
  parentDepartment
}) => {
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    parent_id: parentDepartment?.id || '',
    contact_phone: '',
    contact_email: '',
    address: '',
    status: 'active' as 'active' | 'inactive'
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  // 重置表单
  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      description: '',
      parent_id: parentDepartment?.id || '',
      contact_phone: '',
      contact_email: '',
      address: '',
      status: 'active'
    });
    setErrors({});
  };

  // 表单验证
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = '部门名称不能为空';
    }

    if (!formData.code.trim()) {
      newErrors.code = '部门编码不能为空';
    } else if (!/^[A-Z0-9_]+$/.test(formData.code)) {
      newErrors.code = '部门编码只能包含大写字母、数字和下划线';
    }

    if (formData.contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contact_email)) {
      newErrors.contact_email = '请输入有效的邮箱地址';
    }

    if (formData.contact_phone && !/^[\d\s\-\+\(\)]+$/.test(formData.contact_phone)) {
      newErrors.contact_phone = '请输入有效的电话号码';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 提交表单
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('admin_token');
      if (!token) {
        toast.error('请先登录');
        return;
      }

      const response = await fetch('/api/admin/departments', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '创建部门失败');
      }

      toast.success('部门创建成功');
      resetForm();
      onSuccess();
      onClose();

    } catch (error: any) {
      console.error('创建部门失败:', error);
      toast.error(error.message || '创建部门失败');
    } finally {
      setLoading(false);
    }
  };

  // 渲染部门选择选项
  const renderDepartmentOptions = (depts: Department[], level: number = 0): JSX.Element[] => {
    const options: JSX.Element[] = [];
    
    depts.forEach(dept => {
      options.push(
        <option key={dept.id} value={dept.id}>
          {'　'.repeat(level)}{dept.name} ({dept.code})
        </option>
      );
      
      if (dept.children) {
        options.push(...renderDepartmentOptions(dept.children, level + 1));
      }
    });
    
    return options;
  };

  // 监听模态框状态变化
  useEffect(() => {
    if (isOpen) {
      resetForm();
    }
  }, [isOpen, parentDepartment]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-auto">
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Building2 className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">新建部门</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 表单内容 */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* 基本信息 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                部门名称 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.name ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="请输入部门名称"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.name}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                部门编码 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.code ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="请输入部门编码"
              />
              {errors.code && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.code}
                </p>
              )}
            </div>
          </div>

          {/* 上级部门 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              上级部门
            </label>
            <select
              value={formData.parent_id}
              onChange={(e) => setFormData({ ...formData, parent_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">无上级部门（根部门）</option>
              {renderDepartmentOptions(departments)}
            </select>
          </div>

          {/* 部门描述 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              部门描述
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="请输入部门描述"
            />
          </div>

          {/* 联系信息 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                联系电话
              </label>
              <input
                type="text"
                value={formData.contact_phone}
                onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.contact_phone ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="请输入联系电话"
              />
              {errors.contact_phone && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.contact_phone}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                联系邮箱
              </label>
              <input
                type="email"
                value={formData.contact_email}
                onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.contact_email ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="请输入联系邮箱"
              />
              {errors.contact_email && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.contact_email}
                </p>
              )}
            </div>
          </div>

          {/* 办公地址 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              办公地址
            </label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="请输入办公地址"
            />
          </div>

          {/* 状态 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              状态
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="active">正常</option>
              <option value="inactive">停用</option>
            </select>
          </div>

          {/* 操作按钮 */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {loading && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              )}
              {loading ? '创建中...' : '创建部门'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DepartmentCreateModal;