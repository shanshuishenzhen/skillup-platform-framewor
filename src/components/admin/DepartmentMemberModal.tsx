'use client';

import React, { useState, useEffect } from 'react';
import { X, Users, UserPlus, Search, Crown, Eye, Edit, UserMinus, AlertCircle, Check } from 'lucide-react';
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

interface DepartmentMember {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  position?: string;
  is_primary: boolean;
  is_manager: boolean;
  start_date: string;
  end_date?: string;
  status: 'active' | 'inactive' | 'transferred';
}

interface User {
  id: string;
  username: string;
  email: string;
  full_name?: string;
  status: 'active' | 'inactive';
}

interface DepartmentMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  department: Department | null;
}

/**
 * 部门成员管理模态框组件
 * 提供部门成员的查看、添加、编辑、移除等功能
 * 
 * @param props - 组件属性
 * @param props.isOpen - 是否显示模态框
 * @param props.onClose - 关闭回调函数
 * @param props.onSuccess - 成功回调函数
 * @param props.department - 要管理的部门
 * @returns 部门成员管理模态框
 */
const DepartmentMemberModal: React.FC<DepartmentMemberModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  department
}) => {
  const [activeTab, setActiveTab] = useState<'members' | 'add'>('members');
  const [members, setMembers] = useState<DepartmentMember[]>([]);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [editingMember, setEditingMember] = useState<DepartmentMember | null>(null);
  const [editForm, setEditForm] = useState({
    position: '',
    is_primary: false,
    is_manager: false,
    status: 'active' as 'active' | 'inactive'
  });

  // 获取部门成员
  const fetchMembers = async () => {
    if (!department) return;
    
    try {
      setLoading(true);
      const token = localStorage.getItem('admin_token');
      if (!token) return;

      const response = await fetch(`/api/admin/departments/${department.id}/members`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('获取部门成员失败');
      }

      const data = await response.json();
      setMembers(data.members || []);

    } catch (error) {
      console.error('获取部门成员失败:', error);
      toast.error('获取部门成员失败');
    } finally {
      setLoading(false);
    }
  };

  // 获取可添加的用户
  const fetchAvailableUsers = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      if (!token) return;

      const params = new URLSearchParams({
        status: 'active',
        exclude_department: department?.id || ''
      });

      if (userSearchTerm) {
        params.append('search', userSearchTerm);
      }

      const response = await fetch(`/api/admin/users?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('获取用户列表失败');
      }

      const data = await response.json();
      setAvailableUsers(data.users || []);

    } catch (error) {
      console.error('获取用户列表失败:', error);
      toast.error('获取用户列表失败');
    }
  };

  // 添加成员
  const handleAddMembers = async () => {
    if (!department || selectedUsers.length === 0) return;

    try {
      setLoading(true);
      const token = localStorage.getItem('admin_token');
      if (!token) {
        toast.error('请先登录');
        return;
      }

      const response = await fetch(`/api/admin/departments/${department.id}/members`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user_ids: selectedUsers,
          position: '',
          is_primary: false
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '添加成员失败');
      }

      toast.success(`成功添加 ${selectedUsers.length} 名成员`);
      setSelectedUsers([]);
      setActiveTab('members');
      await fetchMembers();
      onSuccess();

    } catch (error: any) {
      console.error('添加成员失败:', error);
      toast.error(error.message || '添加成员失败');
    } finally {
      setLoading(false);
    }
  };

  // 更新成员信息
  const handleUpdateMember = async () => {
    if (!department || !editingMember) return;

    try {
      setLoading(true);
      const token = localStorage.getItem('admin_token');
      if (!token) {
        toast.error('请先登录');
        return;
      }

      const response = await fetch(`/api/admin/departments/${department.id}/members/${editingMember.user_id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editForm)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '更新成员信息失败');
      }

      toast.success('成员信息更新成功');
      setEditingMember(null);
      await fetchMembers();
      onSuccess();

    } catch (error: any) {
      console.error('更新成员信息失败:', error);
      toast.error(error.message || '更新成员信息失败');
    } finally {
      setLoading(false);
    }
  };

  // 移除成员
  const handleRemoveMember = async (member: DepartmentMember) => {
    if (!department) return;
    
    if (!confirm(`确定要将 "${member.user_name}" 从部门 "${department.name}" 中移除吗？`)) {
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('admin_token');
      if (!token) {
        toast.error('请先登录');
        return;
      }

      const response = await fetch(`/api/admin/departments/${department.id}/members/${member.user_id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '移除成员失败');
      }

      toast.success('成员移除成功');
      await fetchMembers();
      onSuccess();

    } catch (error: any) {
      console.error('移除成员失败:', error);
      toast.error(error.message || '移除成员失败');
    } finally {
      setLoading(false);
    }
  };

  // 开始编辑成员
  const startEditMember = (member: DepartmentMember) => {
    setEditingMember(member);
    setEditForm({
      position: member.position || '',
      is_primary: member.is_primary,
      is_manager: member.is_manager,
      status: member.status
    });
  };

  // 过滤成员
  const filteredMembers = members.filter(member =>
    member.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.user_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (member.position && member.position.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // 过滤可添加用户
  const filteredUsers = availableUsers.filter(user =>
    (user.full_name || user.username).toLowerCase().includes(userSearchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(userSearchTerm.toLowerCase())
  );

  // 初始化数据
  useEffect(() => {
    if (isOpen && department) {
      fetchMembers();
      if (activeTab === 'add') {
        fetchAvailableUsers();
      }
    }
  }, [isOpen, department, activeTab]);

  // 搜索用户
  useEffect(() => {
    if (activeTab === 'add') {
      const timer = setTimeout(() => {
        fetchAvailableUsers();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [userSearchTerm, activeTab]);

  if (!isOpen || !department) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Users className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">成员管理</h2>
              <p className="text-sm text-gray-500">{department.name} ({department.code})</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 标签页 */}
        <div className="border-b border-gray-200">
          <div className="flex">
            <button
              onClick={() => setActiveTab('members')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'members'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              部门成员 ({members.length})
            </button>
            <button
              onClick={() => setActiveTab('add')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'add'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              添加成员
            </button>
          </div>
        </div>

        {/* 内容区域 */}
        <div className="p-6 h-96 overflow-auto">
          {activeTab === 'members' ? (
            <div className="space-y-4">
              {/* 搜索框 */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="搜索成员..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* 成员列表 */}
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : filteredMembers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>暂无成员</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredMembers.map(member => (
                    <div
                      key={member.id}
                      className="bg-gray-50 border border-gray-200 rounded-lg p-4"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-blue-600">
                              {member.user_name.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900">
                                {member.user_name}
                              </span>
                              {member.is_manager && (
                                <Crown className="w-4 h-4 text-yellow-500" title="部门管理者" />
                              )}
                              {member.is_primary && (
                                <span className="px-1.5 py-0.5 text-xs bg-blue-100 text-blue-600 rounded">
                                  主要部门
                                </span>
                              )}
                              {member.status !== 'active' && (
                                <span className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                                  {member.status === 'inactive' ? '已停用' : '已转移'}
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-gray-500 mt-1">
                              <span>{member.user_email}</span>
                              {member.position && (
                                <span className="ml-2">• {member.position}</span>
                              )}
                              <span className="ml-2">• 入职: {member.start_date}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => startEditMember(member)}
                            className="p-1 rounded hover:bg-gray-200 transition-colors"
                            title="编辑"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleRemoveMember(member)}
                            className="p-1 rounded hover:bg-red-100 text-red-600 transition-colors"
                            title="移除"
                          >
                            <UserMinus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* 搜索框 */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="搜索用户..."
                  value={userSearchTerm}
                  onChange={(e) => setUserSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* 已选择用户 */}
              {selectedUsers.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-700 mb-2">已选择 {selectedUsers.length} 名用户</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedUsers.map(userId => {
                      const user = availableUsers.find(u => u.id === userId);
                      return user ? (
                        <span
                          key={userId}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs"
                        >
                          {user.full_name || user.username}
                          <button
                            onClick={() => setSelectedUsers(prev => prev.filter(id => id !== userId))}
                            className="hover:bg-blue-200 rounded"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ) : null;
                    })}
                  </div>
                </div>
              )}

              {/* 用户列表 */}
              <div className="space-y-2">
                {filteredUsers.map(user => (
                  <div
                    key={user.id}
                    className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                      selectedUsers.includes(user.id)
                        ? 'border-blue-300 bg-blue-50'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                    onClick={() => {
                      if (selectedUsers.includes(user.id)) {
                        setSelectedUsers(prev => prev.filter(id => id !== user.id));
                      } else {
                        setSelectedUsers(prev => [...prev, user.id]);
                      }
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-600">
                            {(user.full_name || user.username).charAt(0)}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">
                            {user.full_name || user.username}
                          </div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </div>
                      {selectedUsers.includes(user.id) && (
                        <Check className="w-5 h-5 text-blue-600" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 底部操作栏 */}
        <div className="border-t border-gray-200 p-6">
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              关闭
            </button>
            {activeTab === 'add' && (
              <button
                onClick={handleAddMembers}
                disabled={loading || selectedUsers.length === 0}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {loading && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                )}
                <UserPlus className="w-4 h-4" />
                添加成员 ({selectedUsers.length})
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 编辑成员模态框 */}
      {editingMember && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">编辑成员信息</h3>
              <button
                onClick={() => setEditingMember(null)}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  职位
                </label>
                <input
                  type="text"
                  value={editForm.position}
                  onChange={(e) => setEditForm({ ...editForm, position: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="请输入职位"
                />
              </div>
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editForm.is_primary}
                    onChange={(e) => setEditForm({ ...editForm, is_primary: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">设为主要部门</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editForm.is_manager}
                    onChange={(e) => setEditForm({ ...editForm, is_manager: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">设为部门管理者</span>
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  状态
                </label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value as 'active' | 'inactive' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="active">正常</option>
                  <option value="inactive">停用</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t border-gray-200">
              <button
                onClick={() => setEditingMember(null)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleUpdateMember}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DepartmentMemberModal;