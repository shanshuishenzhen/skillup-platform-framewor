import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { 
  User, 
  Shield, 
  Search, 
  Filter, 
  Save, 
  X, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
  Building,
  Eye,
  EyeOff,
  Plus,
  Minus,
  RotateCcw,
  Download,
  Upload
} from 'lucide-react';

/**
 * 用户权限接口
 * @interface UserPermission
 */
interface UserPermission {
  id: string;
  user_id: string;
  permission_id: string;
  granted: boolean;
  source: 'direct' | 'department' | 'inherited';
  source_department_id?: string;
  expires_at?: string;
  created_at: string;
  updated_at: string;
  permission_name?: string;
  permission_resource?: string;
  permission_action?: string;
  source_department_name?: string;
}

/**
 * 用户接口
 * @interface User
 */
interface User {
  id: string;
  username: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  is_active: boolean;
  created_at: string;
  departments?: {
    id: string;
    name: string;
    role?: string;
  }[];
}

/**
 * 权限接口
 * @interface Permission
 */
interface Permission {
  id: string;
  name: string;
  resource: string;
  action: string;
  description?: string;
  category?: string;
}

/**
 * 权限变更接口
 * @interface PermissionChange
 */
interface PermissionChange {
  permission_id: string;
  granted: boolean;
  expires_at?: string;
}

/**
 * 用户权限管理器组件
 * 提供用户权限的查看、配置和管理功能
 * 
 * @component UserPermissionManager
 * @returns {JSX.Element} 用户权限管理器组件
 */
const UserPermissionManager: React.FC = () => {
  // 状态管理
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userPermissions, setUserPermissions] = useState<UserPermission[]>([]);
  const [availablePermissions, setAvailablePermissions] = useState<Permission[]>([]);
  const [permissionChanges, setPermissionChanges] = useState<Map<string, PermissionChange>>(new Map());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSource, setFilterSource] = useState<'all' | 'direct' | 'department' | 'inherited'>('all');
  const [filterGranted, setFilterGranted] = useState<'all' | 'granted' | 'denied'>('all');
  const [showInherited, setShowInherited] = useState(true);
  const [showExpired, setShowExpired] = useState(false);
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());
  const [batchOperation, setBatchOperation] = useState<'grant' | 'revoke' | null>(null);

  /**
   * 获取用户列表
   * @async
   * @function fetchUsers
   */
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('admin_token');
      if (!token) return;

      const response = await fetch('/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('获取用户列表失败');
      }

      const data = await response.json();
      setUsers(data.users || []);
    } catch (error) {
      console.error('获取用户列表失败:', error);
      toast.error('获取用户列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * 获取可用权限列表
   * @async
   * @function fetchAvailablePermissions
   */
  const fetchAvailablePermissions = useCallback(async () => {
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
      setAvailablePermissions(data.permissions || []);
    } catch (error) {
      console.error('获取权限列表失败:', error);
      toast.error('获取权限列表失败');
    }
  }, []);

  /**
   * 获取用户权限
   * @async
   * @function fetchUserPermissions
   * @param {string} userId - 用户ID
   */
  const fetchUserPermissions = useCallback(async (userId: string) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('admin_token');
      if (!token) return;

      const params = new URLSearchParams({
        include_inherited: showInherited.toString(),
        include_effective: 'true'
      });

      const response = await fetch(`/api/admin/users/${userId}/permissions?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('获取用户权限失败');
      }

      const data = await response.json();
      
      // 合并直接权限、部门权限和有效权限
      const allPermissions: UserPermission[] = [
        ...(data.direct_permissions || []).map((p: any) => ({ ...p, source: 'direct' })),
        ...(data.department_permissions || []).map((p: any) => ({ ...p, source: 'department' })),
        ...(data.inherited_permissions || []).map((p: any) => ({ ...p, source: 'inherited' }))
      ];
      
      setUserPermissions(allPermissions);
    } catch (error) {
      console.error('获取用户权限失败:', error);
      toast.error('获取用户权限失败');
    } finally {
      setLoading(false);
    }
  }, [showInherited]);

  /**
   * 选择用户
   * @async
   * @function selectUser
   * @param {User} user - 选择的用户
   */
  const selectUser = async (user: User) => {
    setSelectedUser(user);
    setPermissionChanges(new Map());
    setSelectedPermissions(new Set());
    await fetchUserPermissions(user.id);
  };

  /**
   * 处理权限变更
   * @function handlePermissionChange
   * @param {string} permissionId - 权限ID
   * @param {boolean} granted - 是否授予
   * @param {string} expiresAt - 过期时间
   */
  const handlePermissionChange = (
    permissionId: string, 
    granted: boolean,
    expiresAt?: string
  ) => {
    const newChanges = new Map(permissionChanges);
    
    // 检查是否有现有的直接权限
    const existingPermission = userPermissions.find(
      p => p.permission_id === permissionId && p.source === 'direct'
    );
    
    if (existingPermission && existingPermission.granted === granted) {
      // 如果权限状态没有变化，移除变更
      newChanges.delete(permissionId);
    } else {
      newChanges.set(permissionId, {
        permission_id: permissionId,
        granted,
        expires_at: expiresAt
      });
    }
    
    setPermissionChanges(newChanges);
  };

  /**
   * 批量权限操作
   * @function handleBatchOperation
   * @param {string} action - 操作类型
   */
  const handleBatchOperation = (action: 'grant' | 'revoke') => {
    const newChanges = new Map(permissionChanges);
    
    selectedPermissions.forEach(permissionId => {
      newChanges.set(permissionId, {
        permission_id: permissionId,
        granted: action === 'grant'
      });
    });
    
    setPermissionChanges(newChanges);
    setSelectedPermissions(new Set());
    setBatchOperation(null);
  };

  /**
   * 保存权限变更
   * @async
   * @function savePermissionChanges
   */
  const savePermissionChanges = async () => {
    if (!selectedUser || permissionChanges.size === 0) {
      toast.warning('没有需要保存的变更');
      return;
    }

    try {
      setSaving(true);
      const token = localStorage.getItem('admin_token');
      if (!token) {
        toast.error('请先登录');
        return;
      }

      const permissions = Array.from(permissionChanges.values());
      
      const response = await fetch(`/api/admin/users/${selectedUser.id}/permissions`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          permissions,
          override_existing: true,
          inherit_from_departments: false
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '保存权限变更失败');
      }

      toast.success('权限变更保存成功');
      setPermissionChanges(new Map());
      await fetchUserPermissions(selectedUser.id);
    } catch (error) {
      console.error('保存权限变更失败:', error);
      toast.error(error instanceof Error ? error.message : '保存权限变更失败');
    } finally {
      setSaving(false);
    }
  };

  /**
   * 重置用户权限
   * @async
   * @function resetUserPermissions
   */
  const resetUserPermissions = async () => {
    if (!selectedUser) return;

    if (!confirm('确定要重置该用户的权限吗？这将清除所有直接权限，只保留从部门继承的权限。')) {
      return;
    }

    try {
      setSaving(true);
      const token = localStorage.getItem('admin_token');
      if (!token) {
        toast.error('请先登录');
        return;
      }

      const response = await fetch(`/api/admin/users/${selectedUser.id}/permissions`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('重置用户权限失败');
      }

      toast.success('用户权限重置成功');
      setPermissionChanges(new Map());
      await fetchUserPermissions(selectedUser.id);
    } catch (error) {
      console.error('重置用户权限失败:', error);
      toast.error('重置用户权限失败');
    } finally {
      setSaving(false);
    }
  };

  /**
   * 获取权限状态
   * @function getPermissionStatus
   * @param {string} permissionId - 权限ID
   * @returns {object} 权限状态信息
   */
  const getPermissionStatus = (permissionId: string) => {
    const directPermission = userPermissions.find(
      p => p.permission_id === permissionId && p.source === 'direct'
    );
    const departmentPermission = userPermissions.find(
      p => p.permission_id === permissionId && p.source === 'department'
    );
    const inheritedPermission = userPermissions.find(
      p => p.permission_id === permissionId && p.source === 'inherited'
    );
    
    const change = permissionChanges.get(permissionId);
    
    return {
      direct: directPermission,
      department: departmentPermission,
      inherited: inheritedPermission,
      change,
      effective: change ? change.granted : (
        directPermission?.granted ?? 
        departmentPermission?.granted ?? 
        inheritedPermission?.granted ?? 
        false
      )
    };
  };

  /**
   * 获取权限源显示文本
   * @function getSourceText
   * @param {string} source - 权限源
   * @returns {string} 显示文本
   */
  const getSourceText = (source: string): string => {
    switch (source) {
      case 'direct': return '直接授予';
      case 'department': return '部门权限';
      case 'inherited': return '继承权限';
      default: return source;
    }
  };

  /**
   * 获取权限源颜色
   * @function getSourceColor
   * @param {string} source - 权限源
   * @returns {string} 颜色类名
   */
  const getSourceColor = (source: string): string => {
    switch (source) {
      case 'direct': return 'text-blue-600 bg-blue-50';
      case 'department': return 'text-green-600 bg-green-50';
      case 'inherited': return 'text-purple-600 bg-purple-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  /**
   * 过滤权限列表
   * @function filteredPermissions
   * @returns {Permission[]} 过滤后的权限列表
   */
  const filteredPermissions = availablePermissions.filter(permission => {
    const status = getPermissionStatus(permission.id);
    
    // 搜索过滤
    if (searchTerm && !permission.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !permission.resource.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !permission.action.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    
    // 权限源过滤
    if (filterSource !== 'all') {
      const hasSource = userPermissions.some(
        p => p.permission_id === permission.id && p.source === filterSource
      );
      if (!hasSource) return false;
    }
    
    // 授予状态过滤
    if (filterGranted !== 'all') {
      const isGranted = status.effective;
      if ((filterGranted === 'granted' && !isGranted) || 
          (filterGranted === 'denied' && isGranted)) {
        return false;
      }
    }
    
    return true;
  });

  // 组件挂载时获取数据
  useEffect(() => {
    fetchUsers();
    fetchAvailablePermissions();
  }, [fetchUsers, fetchAvailablePermissions]);

  return (
    <div className="space-y-6">
      {/* 头部操作区 */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">用户权限管理</h2>
          <p className="text-gray-600 mt-1">管理用户的权限配置和访问控制</p>
        </div>
        {selectedUser && (
          <div className="flex items-center gap-3">
            <button
              onClick={resetUserPermissions}
              className="px-4 py-2 text-orange-600 border border-orange-300 rounded-lg hover:bg-orange-50 transition-colors flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              重置权限
            </button>
            <button
              onClick={savePermissionChanges}
              disabled={saving || permissionChanges.size === 0}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Save className="w-4 h-4" />
              )}
              保存变更 {permissionChanges.size > 0 && `(${permissionChanges.size})`}
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 用户列表 */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">用户列表</h3>
              <div className="mt-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="搜索用户..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
            
            <div className="max-h-96 overflow-y-auto">
              {loading ? (
                <div className="p-4 text-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-gray-500 mt-2 text-sm">加载中...</p>
                </div>
              ) : users.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  <User className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">暂无用户</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {users
                    .filter(user => 
                      !searchTerm || 
                      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      (user.full_name && user.full_name.toLowerCase().includes(searchTerm.toLowerCase()))
                    )
                    .map(user => (
                    <div
                      key={user.id}
                      onClick={() => selectUser(user)}
                      className={`p-4 cursor-pointer transition-colors ${
                        selectedUser?.id === user.id
                          ? 'bg-blue-50 border-r-2 border-r-blue-500'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                          {user.avatar_url ? (
                            <img
                              src={user.avatar_url}
                              alt={user.username}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          ) : (
                            <User className="w-4 h-4 text-gray-500" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">
                            {user.full_name || user.username}
                          </p>
                          <p className="text-sm text-gray-500 truncate">{user.email}</p>
                          {user.departments && user.departments.length > 0 && (
                            <div className="flex items-center gap-1 mt-1">
                              <Building className="w-3 h-3 text-gray-400" />
                              <span className="text-xs text-gray-500">
                                {user.departments.map(d => d.name).join(', ')}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className={`w-2 h-2 rounded-full ${
                          user.is_active ? 'bg-green-400' : 'bg-gray-300'
                        }`} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 权限管理区域 */}
        <div className="lg:col-span-2">
          {selectedUser ? (
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="p-4 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {selectedUser.full_name || selectedUser.username} 的权限
                    </h3>
                    <p className="text-sm text-gray-500">{selectedUser.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowInherited(!showInherited)}
                      className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                        showInherited
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {showInherited ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      继承权限
                    </button>
                  </div>
                </div>
                
                {/* 筛选器 */}
                <div className="flex flex-wrap gap-4 mt-4">
                  <div>
                    <select
                      value={filterSource}
                      onChange={(e) => setFilterSource(e.target.value as any)}
                      className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="all">所有来源</option>
                      <option value="direct">直接授予</option>
                      <option value="department">部门权限</option>
                      <option value="inherited">继承权限</option>
                    </select>
                  </div>
                  <div>
                    <select
                      value={filterGranted}
                      onChange={(e) => setFilterGranted(e.target.value as any)}
                      className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="all">所有状态</option>
                      <option value="granted">已授予</option>
                      <option value="denied">已拒绝</option>
                    </select>
                  </div>
                </div>
                
                {/* 批量操作 */}
                {selectedPermissions.size > 0 && (
                  <div className="flex items-center gap-2 mt-4 p-3 bg-blue-50 rounded-lg">
                    <span className="text-sm text-blue-700">
                      已选择 {selectedPermissions.size} 个权限
                    </span>
                    <button
                      onClick={() => handleBatchOperation('grant')}
                      className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      批量授予
                    </button>
                    <button
                      onClick={() => handleBatchOperation('revoke')}
                      className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors flex items-center gap-1"
                    >
                      <Minus className="w-3 h-3" />
                      批量撤销
                    </button>
                    <button
                      onClick={() => setSelectedPermissions(new Set())}
                      className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700 transition-colors"
                    >
                      取消选择
                    </button>
                  </div>
                )}
              </div>
              
              {/* 权限列表 */}
              <div className="max-h-96 overflow-y-auto">
                {loading ? (
                  <div className="p-8 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="text-gray-500 mt-2">加载中...</p>
                  </div>
                ) : filteredPermissions.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <Shield className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>暂无权限数据</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {filteredPermissions.map(permission => {
                      const status = getPermissionStatus(permission.id);
                      const isSelected = selectedPermissions.has(permission.id);
                      
                      return (
                        <div key={permission.id} className="p-4 hover:bg-gray-50">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 flex-1">
                              <input
                                type="checkbox"
                                checked={isSelected}
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
                              
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-medium text-gray-900">
                                    {permission.name}
                                  </span>
                                  <span className="text-sm text-gray-500">
                                    ({permission.resource}:{permission.action})
                                  </span>
                                </div>
                                
                                {/* 权限来源标签 */}
                                <div className="flex items-center gap-2">
                                  {status.direct && (
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                      getSourceColor('direct')
                                    }`}>
                                      {getSourceText('direct')}
                                    </span>
                                  )}
                                  {status.department && (
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                      getSourceColor('department')
                                    }`}>
                                      {getSourceText('department')}
                                      {status.department.source_department_name && (
                                        <span className="ml-1">({status.department.source_department_name})</span>
                                      )}
                                    </span>
                                  )}
                                  {status.inherited && (
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                      getSourceColor('inherited')
                                    }`}>
                                      {getSourceText('inherited')}
                                    </span>
                                  )}
                                  {status.change && (
                                    <span className="px-2 py-1 rounded-full text-xs font-medium text-orange-600 bg-orange-50">
                                      待保存
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            {/* 权限控制 */}
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handlePermissionChange(permission.id, true)}
                                className={`px-3 py-1 rounded text-sm transition-colors ${
                                  status.effective
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-gray-100 text-gray-600 hover:bg-green-50 hover:text-green-600'
                                }`}
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handlePermissionChange(permission.id, false)}
                                className={`px-3 py-1 rounded text-sm transition-colors ${
                                  !status.effective
                                    ? 'bg-red-100 text-red-700'
                                    : 'bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-600'
                                }`}
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
              <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">选择用户</h3>
              <p className="text-gray-500">请从左侧列表中选择一个用户来管理其权限</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserPermissionManager;