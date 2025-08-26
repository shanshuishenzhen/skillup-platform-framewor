/**
 * 用户编辑对话框组件
 * 支持编辑用户的基本信息、角色、学习等级等
 */

import React, { useState, useEffect } from 'react';
import { X, Save, User, Mail, Phone, Building, MapPin, GraduationCap, Shield } from 'lucide-react';
import { toast } from 'sonner';

// 用户数据接口
interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  employee_id?: string;
  department?: string;
  position?: string;
  organization?: string;
  learning_level: 'beginner' | 'intermediate' | 'advanced';
  learning_progress: number;
  learning_hours: number;
  certification_status: 'none' | 'in_progress' | 'certified' | 'expired';
  role: 'student' | 'teacher' | 'admin';
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

// 用户编辑表单数据接口
interface UserEditForm {
  name: string;
  email: string;
  phone: string;
  employee_id: string;
  department: string;
  position: string;
  organization: string;
  learning_level: 'beginner' | 'intermediate' | 'advanced';
  certification_status: 'none' | 'in_progress' | 'certified' | 'expired';
  role: 'student' | 'teacher' | 'admin';
  is_verified: boolean;
}

// 组件属性接口
interface UserEditDialogProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (userId: string, userData: Partial<UserEditForm>) => Promise<void>;
}

/**
 * 用户编辑对话框组件
 * @param user - 要编辑的用户数据
 * @param isOpen - 对话框是否打开
 * @param onClose - 关闭对话框的回调函数
 * @param onSave - 保存用户数据的回调函数
 */
export default function UserEditDialog({ user, isOpen, onClose, onSave }: UserEditDialogProps) {
  // 表单数据状态
  const [formData, setFormData] = useState<UserEditForm>({
    name: '',
    email: '',
    phone: '',
    employee_id: '',
    department: '',
    position: '',
    organization: '',
    learning_level: 'beginner',
    certification_status: 'none',
    role: 'student',
    is_verified: false
  });

  // 保存状态
  const [isSaving, setIsSaving] = useState(false);

  // 表单验证错误
  const [errors, setErrors] = useState<Partial<Record<keyof UserEditForm, string>>>({});

  /**
   * 当用户数据变化时，更新表单数据
   */
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        employee_id: user.employee_id || '',
        department: user.department || '',
        position: user.position || '',
        organization: user.organization || '',
        learning_level: user.learning_level || 'beginner',
        certification_status: user.certification_status || 'none',
        role: user.role || 'student',
        is_verified: user.is_verified || false
      });
      setErrors({});
    }
  }, [user]);

  /**
   * 处理表单字段变化
   */
  const handleInputChange = (field: keyof UserEditForm, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // 清除该字段的错误
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  };

  /**
   * 验证表单数据
   */
  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof UserEditForm, string>> = {};

    // 验证必填字段
    if (!formData.name.trim()) {
      newErrors.name = '姓名不能为空';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = '手机号不能为空';
    } else if (!/^1[3-9]\d{9}$/.test(formData.phone)) {
      newErrors.phone = '手机号格式不正确';
    }

    // 邮箱为可选字段，但如果填写了需要验证格式
    if (formData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = '邮箱格式不正确';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * 处理表单提交
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !validateForm()) {
      return;
    }

    setIsSaving(true);

    try {
      // 只发送有变化的字段
      const changedData: Partial<UserEditForm> = {};
      
      Object.keys(formData).forEach(key => {
        const field = key as keyof UserEditForm;
        if (formData[field] !== (user as any)[field]) {
          (changedData as any)[field] = formData[field];
        }
      });

      if (Object.keys(changedData).length === 0) {
        toast.info('没有检测到任何更改');
        onClose();
        return;
      }

      await onSave(user.id, changedData);
      onClose();
    } catch (error) {
      console.error('保存用户信息失败:', error);
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * 处理对话框关闭
   */
  const handleClose = () => {
    if (!isSaving) {
      onClose();
    }
  };

  if (!isOpen || !user) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* 对话框头部 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <User className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">编辑用户信息</h2>
          </div>
          <button
            onClick={handleClose}
            disabled={isSaving}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* 对话框内容 */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="space-y-6">
            {/* 基本信息 */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <User className="h-5 w-5 mr-2 text-gray-600" />
                基本信息
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    姓名 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.name ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="请输入姓名"
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    手机号 <span className="text-red-500">*</span> <span className="text-blue-600 text-xs">(主身份标识)</span>
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.phone ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="请输入手机号"
                  />
                  {errors.phone && (
                    <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    邮箱 <span className="text-gray-500 text-xs">(可选)</span>
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.email ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="请输入邮箱（可选）"
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    工号
                  </label>
                  <input
                    type="text"
                    value={formData.employee_id}
                    onChange={(e) => handleInputChange('employee_id', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="请输入工号"
                  />
                </div>
              </div>
            </div>

            {/* 组织信息 */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Building className="h-5 w-5 mr-2 text-gray-600" />
                组织信息
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    部门
                  </label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => handleInputChange('department', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="请输入部门"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    职位
                  </label>
                  <input
                    type="text"
                    value={formData.position}
                    onChange={(e) => handleInputChange('position', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="请输入职位"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    组织
                  </label>
                  <input
                    type="text"
                    value={formData.organization}
                    onChange={(e) => handleInputChange('organization', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="请输入组织"
                  />
                </div>
              </div>
            </div>

            {/* 学习和权限信息 */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <GraduationCap className="h-5 w-5 mr-2 text-gray-600" />
                学习和权限
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    学习等级
                  </label>
                  <select
                    value={formData.learning_level}
                    onChange={(e) => handleInputChange('learning_level', e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="beginner">初级</option>
                    <option value="intermediate">中级</option>
                    <option value="advanced">高级</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    认证状态
                  </label>
                  <select
                    value={formData.certification_status}
                    onChange={(e) => handleInputChange('certification_status', e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="none">无认证</option>
                    <option value="in_progress">认证中</option>
                    <option value="certified">已认证</option>
                    <option value="expired">已过期</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    用户角色
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => handleInputChange('role', e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="student">学员</option>
                    <option value="teacher">教师</option>
                    <option value="admin">管理员</option>
                  </select>
                </div>

                <div className="flex items-center">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_verified}
                      onChange={(e) => handleInputChange('is_verified', e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">已验证用户</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </form>

        {/* 对话框底部 */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSaving}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSaving}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {isSaving ? (
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
  );
}