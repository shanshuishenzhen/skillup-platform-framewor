'use client';

import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Download, 
  Upload, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  ChevronLeft, 
  ChevronRight,
  X,
  Check,
  AlertCircle
} from 'lucide-react';
import UserEditDialog from './UserEditDialog';
import UserImport from './UserImport';

// 用户数据类型
interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  employee_id?: string;
  department?: string;
  position?: string;
  organization?: string;
  role: 'admin' | 'expert' | 'teacher' | 'student' | 'user' | 'examiner' | 'internal_supervisor';
  status: 'active' | 'inactive' | 'suspended';
  learning_level?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  learning_hours?: number;
  certification_status?: 'pending' | 'in_progress' | 'certified' | 'expired' | 'rejected';
  created_at: string;
  updated_at: string;
}

// 筛选条件类型
interface FilterConditions {
  role?: string;
  status?: string;
  department?: string;
  learning_level?: string;
  certification_status?: string;
}

// 批量操作数据类型
interface BatchData {
  status?: string;
  role?: string;
  department?: string;
  position?: string;
  organization?: string;
  learning_level?: string;
  certification_status?: string;
}

interface UserListProps {
  onUserSelect?: (userId: string, action: 'view' | 'edit') => void;
}

function UserList({ onUserSelect }: UserListProps) {
  // 状态管理
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<FilterConditions>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // 编辑对话框状态
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  
  // 导入对话框状态
  const [showImportDialog, setShowImportDialog] = useState(false);
  
  // 批量操作状态
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [showBatchDialog, setShowBatchDialog] = useState(false);
  const [batchOperation, setBatchOperation] = useState<string>('');
  const [batchData, setBatchData] = useState<BatchData>({});

  // 统一的认证错误处理
  const handleAuthError = () => {
    alert('登录已过期，请重新登录');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  // 统一的API请求错误处理
  const handleApiError = (response: Response, operation: string) => {
    if (response.status === 401 || response.status === 403) {
      handleAuthError();
    } else {
      console.error(`${operation}失败:`, response.statusText);
      alert(`${operation}失败，请稍后重试`);
    }
  };

  // 获取用户列表
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
        sort_by: sortBy,
        sort_order: sortOrder,
        ...(searchTerm && { search: searchTerm }),
        ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v))
      });
      
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/users?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setUsers(data.data?.users || []);
        setTotal(data.data?.pagination?.total || 0);
      } else {
        handleApiError(response, '获取用户列表');
      }
    } catch (error) {
      console.error('获取用户列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 搜索处理
  const handleSearch = (term: string) => {
    setSearchTerm(term);
    setCurrentPage(1);
  };

  // 筛选处理
  const handleFilter = (newFilters: FilterConditions) => {
    setFilters(newFilters);
    setCurrentPage(1);
  };

  // 格式化用户角色
  const formatUserRole = (role: string) => {
    const roleMap = {
      admin: '管理员',
      expert: '专家',
      teacher: '教师',
      student: '学生',
      user: '普通用户',
      examiner: '考评员',
      internal_supervisor: '内部督导员'
    };
    return roleMap[role as keyof typeof roleMap] || role;
  };

  // 格式化用户状态
  const formatUserStatus = (status: string) => {
    const statusMap = {
      active: { text: '激活', color: 'text-green-600 bg-green-100' },
      inactive: { text: '停用', color: 'text-red-600 bg-red-100' },
      suspended: { text: '暂停', color: 'text-yellow-600 bg-yellow-100' }
    };
    const statusInfo = statusMap[status as keyof typeof statusMap] || { text: status, color: 'text-gray-600 bg-gray-100' };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
        {statusInfo.text}
      </span>
    );
  };

  // 格式化学习等级
  const formatLearningLevel = (level?: string) => {
    const levelMap = {
      beginner: '初级',
      intermediate: '中级',
      advanced: '高级',
      expert: '专家'
    };
    return level ? levelMap[level as keyof typeof levelMap] || level : '-';
  };

  // 格式化认证状态
  const formatCertificationStatus = (status?: string) => {
    const statusMap = {
      pending: { text: '待认证', color: 'text-yellow-600 bg-yellow-100' },
      in_progress: { text: '认证中', color: 'text-blue-600 bg-blue-100' },
      certified: { text: '已认证', color: 'text-green-600 bg-green-100' },
      expired: { text: '已过期', color: 'text-red-600 bg-red-100' },
      rejected: { text: '已拒绝', color: 'text-red-600 bg-red-100' }
    };
    if (!status) return '-';
    const statusInfo = statusMap[status as keyof typeof statusMap] || { text: status, color: 'text-gray-600 bg-gray-100' };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
        {statusInfo.text}
      </span>
    );
  };

  // 打开编辑对话框
  const openEditDialog = (user: User) => {
    setEditingUser(user);
    setIsEditDialogOpen(true);
  };

  // 关闭编辑对话框
  const closeEditDialog = () => {
    setEditingUser(null);
    setIsEditDialogOpen(false);
  };

  // 保存用户信息
  const saveUserInfo = async (userData: Partial<User>) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/users/${editingUser?.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });
      
      if (response.ok) {
        await fetchUsers();
        closeEditDialog();
      } else {
        handleApiError(response, '保存用户信息');
      }
    } catch (error) {
      console.error('保存用户信息失败:', error);
    }
  };

  // 删除用户
  const deleteUser = async (userId: string) => {
    if (!confirm('确定要删除这个用户吗？')) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        await fetchUsers();
      } else {
        handleApiError(response, '删除用户');
      }
    } catch (error) {
      console.error('删除用户失败:', error);
    }
  };

  // 批量操作用户
  const batchUpdateUsers = async (userIds: string[], updateData: Partial<User>) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/users/batch', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_ids: userIds,
          update_data: updateData
        }),
      });
      
      if (response.ok) {
        await fetchUsers();
        setSelectedUsers([]);
      } else {
        handleApiError(response, '批量更新用户');
      }
    } catch (error) {
      console.error('批量更新用户失败:', error);
    }
  };

  // 批量删除用户
  const batchDeleteUsers = async (userIds: string[]) => {
    if (!confirm(`确定要删除选中的 ${userIds.length} 个用户吗？`)) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/users/batch', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_ids: userIds }),
      });
      
      if (response.ok) {
        await fetchUsers();
        setSelectedUsers([]);
      } else {
        handleApiError(response, '批量删除用户');
      }
    } catch (error) {
      console.error('批量删除用户失败:', error);
    }
  };

  // 打开批量操作对话框
  const openBatchDialog = (operation: string) => {
    setBatchOperation(operation);
    setBatchData({});
    setShowBatchDialog(true);
  };

  // 执行批量操作
  const executeBatchOperation = async () => {
    if (batchOperation === 'delete') {
      await batchDeleteUsers(selectedUsers);
    } else {
      await batchUpdateUsers(selectedUsers, batchData);
    }
    setShowBatchDialog(false);
  };

  // 导出用户数据
  const exportUsers = async () => {
    try {
      const params = new URLSearchParams({
        ...(searchTerm && { search: searchTerm }),
        ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v))
      });
      
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/users/export?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `users_${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        handleApiError(response, '导出用户数据');
      }
    } catch (error) {
      console.error('导出用户数据失败:', error);
    }
  };

  // 计算分页信息
  const totalPages = Math.ceil(total / pageSize);
  const startIndex = (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, total);

  // 页面加载时获取数据
  useEffect(() => {
    fetchUsers();
  }, [currentPage, pageSize, sortBy, sortOrder, searchTerm, filters]);

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">用户管理</h1>
        <div className="flex items-center space-x-3">
          <button
            onClick={exportUsers}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <Download className="w-4 h-4 mr-2" />
            导出
          </button>
          <button
            onClick={() => setShowImportDialog(true)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <Upload className="w-4 h-4 mr-2" />
            导入
          </button>
          <button
            onClick={() => onUserSelect?.('new', 'edit')}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            新增用户
          </button>
        </div>
      </div>

      {/* 搜索和筛选 */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          {/* 搜索框 */}
          <div className="lg:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="搜索用户姓名、邮箱或手机号"
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          
          {/* 角色筛选 */}
          <div>
            <select
              value={filters.role || ''}
              onChange={(e) => handleFilter({ ...filters, role: e.target.value || undefined })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">所有角色</option>
              <option value="admin">管理员</option>
              <option value="expert">专家</option>
              <option value="teacher">教师</option>
              <option value="student">学生</option>
              <option value="user">普通用户</option>
              <option value="examiner">考评员</option>
              <option value="internal_supervisor">内部督导员</option>
            </select>
          </div>
          
          {/* 状态筛选 */}
          <div>
            <select
              value={filters.status || ''}
              onChange={(e) => handleFilter({ ...filters, status: e.target.value || undefined })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">所有状态</option>
              <option value="active">激活</option>
              <option value="inactive">停用</option>
              <option value="suspended">暂停</option>
            </select>
          </div>
          
          {/* 部门筛选 */}
          <div>
            <input
              type="text"
              placeholder="部门"
              value={filters.department || ''}
              onChange={(e) => handleFilter({ ...filters, department: e.target.value || undefined })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          {/* 学习等级筛选 */}
          <div>
            <select
              value={filters.learning_level || ''}
              onChange={(e) => handleFilter({ ...filters, learning_level: e.target.value || undefined })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">所有等级</option>
              <option value="beginner">初级</option>
              <option value="intermediate">中级</option>
              <option value="advanced">高级</option>
              <option value="expert">专家</option>
            </select>
          </div>
        </div>
      </div>

      {/* 批量操作工具栏 */}
      {selectedUsers.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-blue-900">
                已选择 {selectedUsers.length} 个用户
              </span>
              <button
                onClick={() => setSelectedUsers([])}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                取消选择
              </button>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => openBatchDialog('update_status')}
                className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
              >
                激活
              </button>
              <button
                onClick={() => openBatchDialog('update_status')}
                className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
              >
                停用
              </button>
              <button
                onClick={() => openBatchDialog('update_status')}
                className="px-3 py-1 text-sm bg-yellow-600 text-white rounded hover:bg-yellow-700"
              >
                暂停
              </button>
              <button
                onClick={() => openBatchDialog('update_status')}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                修改状态
              </button>
              <button
                onClick={() => openBatchDialog('update_role')}
                className="px-3 py-1 text-sm bg-purple-600 text-white rounded hover:bg-purple-700"
              >
                修改角色
              </button>
              <button
                onClick={() => openBatchDialog('update_department')}
                className="px-3 py-1 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700"
              >
                修改部门
              </button>
              <button
                onClick={() => openBatchDialog('delete')}
                className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 用户列表 */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-500">加载中...</div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedUsers.length === users.length && users.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedUsers(users.map(user => user.id));
                          } else {
                            setSelectedUsers([]);
                          }
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      用户信息
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      身份信息
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      学习信息
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      认证状态
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      状态
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(user.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedUsers([...selectedUsers, user.id]);
                            } else {
                              setSelectedUsers(selectedUsers.filter(id => id !== user.id));
                            }
                          }}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{user.name}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                          <div className="text-sm text-gray-500">{user.phone}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm text-gray-900">{user.employee_id || '-'}</div>
                          <div className="text-sm text-gray-500">{user.department || '-'}</div>
                          <div className="text-sm text-gray-500">{user.position || '-'}</div>
                          <div className="text-sm text-gray-500">{user.organization || '-'}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm text-gray-900">
                            等级: {formatLearningLevel(user.learning_level)}
                          </div>
                          <div className="text-sm text-gray-500">
                            学时: {user.learning_hours || 0}h
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {formatCertificationStatus(user.certification_status)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          {formatUserStatus(user.status)}
                          <div className="text-sm text-gray-500 mt-1">
                            {formatUserRole(user.role)}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => onUserSelect?.(user.id, 'view')}
                            className="text-blue-600 hover:text-blue-800 transition-colors"
                            title="查看详情"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => openEditDialog(user)}
                            className="text-green-600 hover:text-green-800 transition-colors"
                            title="编辑用户"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => deleteUser(user.id)}
                            className="text-red-600 hover:text-red-800 transition-colors"
                            title="删除用户"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 分页 */}
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400"
                >
                  上一页
                </button>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400"
                >
                  下一页
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    显示第 <span className="font-medium">{startIndex}</span> 到{' '}
                    <span className="font-medium">{endIndex}</span> 条，共{' '}
                    <span className="font-medium">{total}</span> 条记录
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    
                    {/* 页码按钮 */}
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                            currentPage === pageNum
                              ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                              : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                    
                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* 用户编辑对话框 */}
      <UserEditDialog
        user={editingUser}
        isOpen={isEditDialogOpen}
        onClose={closeEditDialog}
        onSave={saveUserInfo}
      />

      {/* 批量操作对话框 */}
      {showBatchDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                批量操作 ({selectedUsers.length} 个用户)
              </h3>
              <button
                onClick={() => setShowBatchDialog(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {batchOperation === 'update_status' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    新状态
                  </label>
                  <select
                    value={batchData.status || ''}
                    onChange={(e) => setBatchData({ ...batchData, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">请选择状态</option>
                    <option value="active">激活</option>
                    <option value="inactive">停用</option>
                    <option value="suspended">暂停</option>
                  </select>
                </div>
              )}

              {batchOperation === 'update_role' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    新角色
                  </label>
                  <select
                    value={batchData.role || ''}
                    onChange={(e) => setBatchData({ ...batchData, role: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">请选择角色</option>
                    <option value="admin">管理员</option>
                    <option value="expert">专家</option>
                    <option value="teacher">教师</option>
                    <option value="student">学生</option>
                    <option value="user">普通用户</option>
                  </select>
                </div>
              )}

              {batchOperation === 'update_department' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      部门
                    </label>
                    <input
                      type="text"
                      value={batchData.department || ''}
                      onChange={(e) => setBatchData({ ...batchData, department: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="请输入部门名称"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      职位（可选）
                    </label>
                    <input
                      type="text"
                      value={batchData.position || ''}
                      onChange={(e) => setBatchData({ ...batchData, position: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="请输入职位"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      组织（可选）
                    </label>
                    <input
                      type="text"
                      value={batchData.organization || ''}
                      onChange={(e) => setBatchData({ ...batchData, organization: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="请输入组织名称"
                    />
                  </div>
                </div>
              )}

              {batchOperation === 'update_learning_level' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    学习等级
                  </label>
                  <select
                    value={batchData.learning_level || ''}
                    onChange={(e) => setBatchData({ ...batchData, learning_level: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">请选择学习等级</option>
                    <option value="beginner">初级</option>
                    <option value="intermediate">中级</option>
                    <option value="advanced">高级</option>
                    <option value="expert">专家</option>
                  </select>
                </div>
              )}

              {batchOperation === 'update_certification_status' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    认证状态
                  </label>
                  <select
                    value={batchData.certification_status || ''}
                    onChange={(e) => setBatchData({ ...batchData, certification_status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">请选择认证状态</option>
                    <option value="pending">待认证</option>
                    <option value="in_progress">认证中</option>
                    <option value="certified">已认证</option>
                    <option value="expired">已过期</option>
                    <option value="rejected">已拒绝</option>
                  </select>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowBatchDialog(false)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={executeBatchOperation}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                disabled={(() => {
                  if (batchOperation === 'update_department') {
                    return !batchData.department;
                  }
                  const field = batchOperation?.split('_')[1];
                  return field && !batchData[field as keyof BatchData];
                })()}
              >
                确认操作
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 用户导入对话框 */}
      {showImportDialog && (
        <UserImport
          isOpen={showImportDialog}
          onClose={() => setShowImportDialog(false)}
          onSuccess={() => {
            setShowImportDialog(false);
            fetchUsers();
          }}
        />
      )}
    </div>
  );
}

export default UserList;