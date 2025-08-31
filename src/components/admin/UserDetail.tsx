/**
 * 用户详情编辑组件
 * 提供用户详细信息查看和编辑功能，支持扩展字段的编辑
 */

'use client';

import React, { useState, useEffect } from 'react';
import { 
  User, 
  Mail, 
  Phone, 
  Building, 
  Briefcase, 
  Save, 
  X, 
  Eye, 
  EyeOff,
  Calendar,
  Clock,
  Award,
  BookOpen,
  Shield
} from 'lucide-react';
import { toast } from 'sonner';

/**
 * 用户详情接口定义
 */
interface UserDetail {
  id: string;
  name: string;
  email: string;
  phone: string;
  employee_id?: string;
  department?: string;
  position?: string;
  organization?: string;
  learning_level?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  learning_hours?: number;
  exam_permissions?: string[];
  certification_status?: 'none' | 'in_progress' | 'certified' | 'expired';
  role: 'user' | 'admin' | 'super_admin';
  status: 'active' | 'inactive' | 'suspended';
  created_at: string;
  updated_at?: string;
  last_login?: string;
  // 扩展统计信息
  learning_stats?: {
    total_courses: number;
    completed_courses: number;
    in_progress_courses: number;
    total_learning_time: number;
  };
  exam_stats?: {
    total_exams: number;
    passed_exams: number;
    failed_exams: number;
    average_score: number;
  };
}

/**
 * 用户编辑表单接口
 */
interface UserEditForm {
  name: string;
  email: string;
  phone: string;
  employee_id: string;
  department: string;
  position: string;
  organization: string;
  learning_level: string;
  learning_hours: number;
  exam_permissions: string[];
  certification_status: string;
  role: string;
  status: string;
  password?: string;
}

/**
 * 组件属性接口
 */
interface UserDetailProps {
  userId: string;
  onClose: () => void;
  onUpdate?: () => void;
  mode?: 'view' | 'edit';
}

/**
 * 用户详情编辑组件
 */
export default function UserDetail({ userId, onClose, onUpdate, mode = 'view' }: UserDetailProps) {
  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(mode === 'edit');
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState<UserEditForm>({
    name: '',
    email: '',
    phone: '',
    employee_id: '',
    department: '',
    position: '',
    organization: '',
    learning_level: 'beginner',
    learning_hours: 0,
    exam_permissions: [],
    certification_status: 'none',
    role: 'user',
    status: 'active',
    password: ''
  });

  /**
   * 获取用户详情
   */
  const fetchUserDetail = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const userData: UserDetail = await response.json();
        setUser(userData);
        // 初始化表单数据
        setFormData({
          name: userData.name,
          email: userData.email,
          phone: userData.phone,
          employee_id: userData.employee_id || '',
          department: userData.department || '',
          position: userData.position || '',
          organization: userData.organization || '',
          learning_level: userData.learning_level || 'beginner',
          learning_hours: userData.learning_hours || 0,
          exam_permissions: userData.exam_permissions || [],
          certification_status: userData.certification_status || 'none',
          role: userData.role,
          status: userData.status,
          password: ''
        });
      } else {
        const error = await response.json();
        toast.error(error.error || '获取用户详情失败');
      }
    } catch (error) {
      console.error('获取用户详情失败:', error);
      toast.error('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 保存用户信息
   */
  const saveUser = async () => {
    setSaving(true);
    try {
      const updateData = { ...formData };
      // 如果密码为空，则不更新密码
      if (!updateData.password) {
        delete updateData.password;
      }

      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(updateData)
      });

      if (response.ok) {
        toast.success('用户信息更新成功');
        setEditMode(false);
        fetchUserDetail();
        onUpdate?.();
      } else {
        const error = await response.json();
        toast.error(error.error || '更新用户信息失败');
      }
    } catch (error) {
      console.error('更新用户信息失败:', error);
      toast.error('网络错误，请稍后重试');
    } finally {
      setSaving(false);
    }
  };

  /**
   * 取消编辑
   */
  const cancelEdit = () => {
    setEditMode(false);
    if (user) {
      setFormData({
        name: user.name,
        email: user.email,
        phone: user.phone,
        employee_id: user.employee_id || '',
        department: user.department || '',
        position: user.position || '',
        organization: user.organization || '',
        learning_level: user.learning_level || 'beginner',
        learning_hours: user.learning_hours || 0,
        exam_permissions: user.exam_permissions || [],
        certification_status: user.certification_status || 'none',
        role: user.role,
        status: user.status,
        password: ''
      });
    }
  };

  /**
   * 格式化日期
   */
  const formatDate = (dateString?: string): string => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('zh-CN');
  };

  /**
   * 格式化学习等级
   */
  const formatLearningLevel = (level: string): string => {
    const levels = {
      beginner: '初级',
      intermediate: '中级',
      advanced: '高级',
      expert: '专家'
    };
    return levels[level as keyof typeof levels] || level;
  };

  /**
   * 格式化认证状态
   */
  const formatCertificationStatus = (status: string): string => {
    const statuses = {
      none: '未认证',
      in_progress: '认证中',
      certified: '已认证',
      expired: '已过期'
    };
    return statuses[status as keyof typeof statuses] || status;
  };

  /**
   * 格式化用户状态
   */
  const formatUserStatus = (status: string): React.ReactElement => {
    const statuses = {
      active: { text: '活跃', color: 'text-green-600 bg-green-100' },
      inactive: { text: '非活跃', color: 'text-gray-600 bg-gray-100' },
      suspended: { text: '已暂停', color: 'text-red-600 bg-red-100' }
    };
    const statusInfo = statuses[status as keyof typeof statuses] || { text: status, color: 'text-gray-600 bg-gray-100' };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusInfo.color}`}>
        {statusInfo.text}
      </span>
    );
  };

  /**
   * 格式化用户角色
   */
  const formatUserRole = (role: string): string => {
    const roles = {
      user: '普通用户',
      admin: '管理员',
      super_admin: '超级管理员'
    };
    return roles[role as keyof typeof roles] || role;
  };

  // 组件挂载时获取用户详情
  useEffect(() => {
    fetchUserDetail();
  }, [userId]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">加载中...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <p className="text-gray-600">用户不存在</p>
          <button
            onClick={onClose}
            className="mt-4 bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
          >
            关闭
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <User className="h-6 w-6 text-blue-600 mr-3" />
            <h2 className="text-xl font-semibold text-gray-900">
              {editMode ? '编辑用户' : '用户详情'}
            </h2>
          </div>
          <div className="flex items-center space-x-3">
            {!editMode && (
              <button
                onClick={() => setEditMode(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                编辑
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* 内容 */}
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 基本信息 */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <User className="h-5 w-5 mr-2" />
                  基本信息
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">姓名</label>
                    {editMode ? (
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    ) : (
                      <p className="text-gray-900">{user.name}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">手机号 <span className="text-red-500">*</span></label>
                    {editMode ? (
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    ) : (
                      <p className="text-gray-900 flex items-center font-medium">
                        <Phone className="h-4 w-4 mr-2 text-blue-500" />
                        {user.phone}
                        <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">主身份标识</span>
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">邮箱 <span className="text-gray-400">(可选)</span></label>
                    {editMode ? (
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="用于接收通知邮件（可选）"
                      />
                    ) : (
                      <p className="text-gray-600 flex items-center">
                        <Mail className="h-4 w-4 mr-2 text-gray-400" />
                        {user.email || '未设置'}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">员工编号</label>
                    {editMode ? (
                      <input
                        type="text"
                        value={formData.employee_id}
                        onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    ) : (
                      <p className="text-gray-900">{user.employee_id || '-'}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* 组织信息 */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <Building className="h-5 w-5 mr-2" />
                  组织信息
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">组织</label>
                    {editMode ? (
                      <input
                        type="text"
                        value={formData.organization}
                        onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    ) : (
                      <p className="text-gray-900">{user.organization || '-'}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">部门</label>
                    {editMode ? (
                      <input
                        type="text"
                        value={formData.department}
                        onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    ) : (
                      <p className="text-gray-900">{user.department || '-'}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">职位</label>
                    {editMode ? (
                      <input
                        type="text"
                        value={formData.position}
                        onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    ) : (
                      <p className="text-gray-900 flex items-center">
                        <Briefcase className="h-4 w-4 mr-2 text-gray-400" />
                        {user.position || '-'}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* 学习信息 */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <BookOpen className="h-5 w-5 mr-2" />
                  学习信息
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">学习等级</label>
                    {editMode ? (
                      <select
                        value={formData.learning_level}
                        onChange={(e) => setFormData({ ...formData, learning_level: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="beginner">初级</option>
                        <option value="intermediate">中级</option>
                        <option value="advanced">高级</option>
                        <option value="expert">专家</option>
                      </select>
                    ) : (
                      <p className="text-gray-900">{formatLearningLevel(user.learning_level || 'beginner')}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">学习时长（小时）</label>
                    {editMode ? (
                      <input
                        type="number"
                        min="0"
                        value={formData.learning_hours}
                        onChange={(e) => setFormData({ ...formData, learning_hours: parseInt(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    ) : (
                      <p className="text-gray-900 flex items-center">
                        <Clock className="h-4 w-4 mr-2 text-gray-400" />
                        {user.learning_hours || 0}h
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">认证状态</label>
                    {editMode ? (
                      <select
                        value={formData.certification_status}
                        onChange={(e) => setFormData({ ...formData, certification_status: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="none">未认证</option>
                        <option value="in_progress">认证中</option>
                        <option value="certified">已认证</option>
                        <option value="expired">已过期</option>
                      </select>
                    ) : (
                      <p className="text-gray-900 flex items-center">
                        <Award className="h-4 w-4 mr-2 text-gray-400" />
                        {formatCertificationStatus(user.certification_status || 'none')}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* 权限设置 */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <Shield className="h-5 w-5 mr-2" />
                  权限设置
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">用户角色</label>
                    {editMode ? (
                      <select
                        value={formData.role}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="user">普通用户</option>
                        <option value="admin">管理员</option>
                        <option value="super_admin">超级管理员</option>
                      </select>
                    ) : (
                      <p className="text-gray-900">{formatUserRole(user.role)}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">账户状态</label>
                    {editMode ? (
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="active">活跃</option>
                        <option value="inactive">非活跃</option>
                        <option value="suspended">已暂停</option>
                      </select>
                    ) : (
                      <div>{formatUserStatus(user.status)}</div>
                    )}
                  </div>
                </div>
                
                {editMode && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">重置密码（可选）</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        placeholder="留空则不修改密码"
                        className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-gray-400" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 侧边栏统计信息 */}
            <div className="space-y-6">
              {/* 账户信息 */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <Calendar className="h-5 w-5 mr-2" />
                  账户信息
                </h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-600">创建时间</p>
                    <p className="text-gray-900">{formatDate(user.created_at)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">最后更新</p>
                    <p className="text-gray-900">{formatDate(user.updated_at)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">最后登录</p>
                    <p className="text-gray-900">{formatDate(user.last_login)}</p>
                  </div>
                </div>
              </div>

              {/* 学习统计 */}
              {user.learning_stats && (
                <div className="bg-blue-50 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">学习统计</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">总课程数</span>
                      <span className="font-medium">{user.learning_stats.total_courses}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">已完成</span>
                      <span className="font-medium text-green-600">{user.learning_stats.completed_courses}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">进行中</span>
                      <span className="font-medium text-blue-600">{user.learning_stats.in_progress_courses}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">总学习时长</span>
                      <span className="font-medium">{user.learning_stats.total_learning_time}h</span>
                    </div>
                  </div>
                </div>
              )}

              {/* 考试统计 */}
              {user.exam_stats && (
                <div className="bg-green-50 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">考试统计</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">总考试数</span>
                      <span className="font-medium">{user.exam_stats.total_exams}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">通过数</span>
                      <span className="font-medium text-green-600">{user.exam_stats.passed_exams}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">未通过</span>
                      <span className="font-medium text-red-600">{user.exam_stats.failed_exams}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">平均分</span>
                      <span className="font-medium">{user.exam_stats.average_score}分</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 底部操作按钮 */}
        {editMode && (
          <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
            <button
              onClick={cancelEdit}
              disabled={saving}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              取消
            </button>
            <button
              onClick={saveUser}
              disabled={saving}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  保存中...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  保存
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}