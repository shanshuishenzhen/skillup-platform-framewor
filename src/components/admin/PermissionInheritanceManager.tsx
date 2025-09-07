import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { 
  Settings, 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
  Shield,
  ArrowDown,
  ArrowUp,
  Shuffle
} from 'lucide-react';

/**
 * 权限继承规则接口
 * @interface InheritanceRule
 */
interface InheritanceRule {
  id: string;
  parent_department_id: string;
  child_department_id: string;
  permission_id: string;
  inherit_type: 'full' | 'partial' | 'deny';
  conditions?: {
    user_level?: number;
    time_restrictions?: {
      start_time?: string;
      end_time?: string;
      days_of_week?: number[];
    };
    ip_restrictions?: string[];
  };
  priority: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  parent_department_name?: string;
  child_department_name?: string;
  permission_name?: string;
}

/**
 * 部门接口
 * @interface Department
 */
interface Department {
  id: string;
  name: string;
  parent_id?: string;
  level: number;
  children?: Department[];
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
}

/**
 * 权限继承管理器组件
 * 提供权限继承规则的创建、编辑、删除和管理功能
 * 
 * @component PermissionInheritanceManager
 * @returns {JSX.Element} 权限继承管理器组件
 */
const PermissionInheritanceManager: React.FC = () => {
  // 状态管理
  const [rules, setRules] = useState<InheritanceRule[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingRule, setEditingRule] = useState<InheritanceRule | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [filterType, setFilterType] = useState<'all' | 'active' | 'inactive'>('all');

  // 新规则表单状态
  const [newRule, setNewRule] = useState<Partial<InheritanceRule>>({
    inherit_type: 'full',
    priority: 1,
    is_active: true,
    conditions: {}
  });

  /**
   * 获取继承规则列表
   * @async
   * @function fetchRules
   */
  const fetchRules = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('admin_token');
      if (!token) return;

      const params = new URLSearchParams();
      if (selectedDepartment) {
        params.append('department_id', selectedDepartment);
      }
      if (filterType !== 'all') {
        params.append('is_active', (filterType === 'active').toString());
      }

      const response = await fetch(`/api/admin/permissions/inheritance?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('获取继承规则失败');
      }

      const data = await response.json();
      setRules(data.rules || []);
    } catch (error) {
      console.error('获取继承规则失败:', error);
      toast.error('获取继承规则失败');
    } finally {
      setLoading(false);
    }
  }, [selectedDepartment, filterType]);

  /**
   * 获取部门列表
   * @async
   * @function fetchDepartments
   */
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

  /**
   * 获取权限列表
   * @async
   * @function fetchPermissions
   */
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

  /**
   * 创建继承规则
   * @async
   * @function createRule
   */
  const createRule = async () => {
    if (!newRule.parent_department_id || !newRule.child_department_id || !newRule.permission_id) {
      toast.error('请填写完整的规则信息');
      return;
    }

    try {
      setSaving(true);
      const token = localStorage.getItem('admin_token');
      if (!token) {
        toast.error('请先登录');
        return;
      }

      const response = await fetch('/api/admin/permissions/inheritance', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newRule)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '创建继承规则失败');
      }

      toast.success('继承规则创建成功');
      setShowCreateModal(false);
      setNewRule({
        inherit_type: 'full',
        priority: 1,
        is_active: true,
        conditions: {}
      });
      await fetchRules();
    } catch (error) {
      console.error('创建继承规则失败:', error);
      toast.error(error instanceof Error ? error.message : '创建继承规则失败');
    } finally {
      setSaving(false);
    }
  };

  /**
   * 更新继承规则
   * @async
   * @function updateRule
   * @param {InheritanceRule} rule - 要更新的规则
   */
  const updateRule = async (rule: InheritanceRule) => {
    try {
      setSaving(true);
      const token = localStorage.getItem('admin_token');
      if (!token) {
        toast.error('请先登录');
        return;
      }

      const response = await fetch(`/api/admin/permissions/inheritance/${rule.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(rule)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '更新继承规则失败');
      }

      toast.success('继承规则更新成功');
      setEditingRule(null);
      await fetchRules();
    } catch (error) {
      console.error('更新继承规则失败:', error);
      toast.error(error instanceof Error ? error.message : '更新继承规则失败');
    } finally {
      setSaving(false);
    }
  };

  /**
   * 删除继承规则
   * @async
   * @function deleteRule
   * @param {string} ruleId - 规则ID
   */
  const deleteRule = async (ruleId: string) => {
    if (!confirm('确定要删除这个继承规则吗？')) {
      return;
    }

    try {
      setSaving(true);
      const token = localStorage.getItem('admin_token');
      if (!token) {
        toast.error('请先登录');
        return;
      }

      const response = await fetch(`/api/admin/permissions/inheritance/${ruleId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('删除继承规则失败');
      }

      toast.success('继承规则删除成功');
      await fetchRules();
    } catch (error) {
      console.error('删除继承规则失败:', error);
      toast.error('删除继承规则失败');
    } finally {
      setSaving(false);
    }
  };

  /**
   * 切换规则状态
   * @async
   * @function toggleRuleStatus
   * @param {InheritanceRule} rule - 要切换状态的规则
   */
  const toggleRuleStatus = async (rule: InheritanceRule) => {
    const updatedRule = { ...rule, is_active: !rule.is_active };
    await updateRule(updatedRule);
  };

  /**
   * 获取继承类型显示文本
   * @function getInheritTypeText
   * @param {string} type - 继承类型
   * @returns {string} 显示文本
   */
  const getInheritTypeText = (type: string): string => {
    switch (type) {
      case 'full': return '完全继承';
      case 'partial': return '部分继承';
      case 'deny': return '拒绝继承';
      default: return type;
    }
  };

  /**
   * 获取继承类型颜色
   * @function getInheritTypeColor
   * @param {string} type - 继承类型
   * @returns {string} 颜色类名
   */
  const getInheritTypeColor = (type: string): string => {
    switch (type) {
      case 'full': return 'text-green-600 bg-green-50';
      case 'partial': return 'text-yellow-600 bg-yellow-50';
      case 'deny': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  // 组件挂载时获取数据
  useEffect(() => {
    fetchRules();
    fetchDepartments();
    fetchPermissions();
  }, [fetchRules, fetchDepartments, fetchPermissions]);

  return (
    <div className="space-y-6">
      {/* 头部操作区 */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">权限继承管理</h2>
          <p className="text-gray-600 mt-1">配置和管理部门间的权限继承规则</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          创建规则
        </button>
      </div>

      {/* 筛选器 */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              部门筛选
            </label>
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">所有部门</option>
              {departments.map(dept => (
                <option key={dept.id} value={dept.id}>{dept.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              状态筛选
            </label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as 'all' | 'active' | 'inactive')}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">全部</option>
              <option value="active">启用</option>
              <option value="inactive">禁用</option>
            </select>
          </div>
        </div>
      </div>

      {/* 规则列表 */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">继承规则列表</h3>
        </div>
        
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-500 mt-2">加载中...</p>
          </div>
        ) : rules.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Settings className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>暂无继承规则</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {rules.map(rule => (
              <div key={rule.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        getInheritTypeColor(rule.inherit_type)
                      }`}>
                        {getInheritTypeText(rule.inherit_type)}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        rule.is_active 
                          ? 'text-green-600 bg-green-50' 
                          : 'text-gray-600 bg-gray-50'
                      }`}>
                        {rule.is_active ? '启用' : '禁用'}
                      </span>
                      <span className="text-xs text-gray-500">
                        优先级: {rule.priority}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <span className="font-medium">{rule.parent_department_name}</span>
                      <ArrowDown className="w-4 h-4 text-gray-400" />
                      <span className="font-medium">{rule.child_department_name}</span>
                      <span className="text-gray-400">|</span>
                      <Shield className="w-4 h-4 text-gray-400" />
                      <span>{rule.permission_name}</span>
                    </div>
                    
                    {rule.conditions && Object.keys(rule.conditions).length > 0 && (
                      <div className="mt-2 text-xs text-gray-500">
                        <span className="inline-flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          包含条件限制
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleRuleStatus(rule)}
                      className={`p-2 rounded-lg transition-colors ${
                        rule.is_active
                          ? 'text-green-600 hover:bg-green-50'
                          : 'text-gray-400 hover:bg-gray-50'
                      }`}
                      title={rule.is_active ? '禁用规则' : '启用规则'}
                    >
                      {rule.is_active ? <CheckCircle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => setEditingRule(rule)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="编辑规则"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteRule(rule.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="删除规则"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 创建规则模态框 */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">创建继承规则</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    父部门
                  </label>
                  <select
                    value={newRule.parent_department_id || ''}
                    onChange={(e) => setNewRule({ ...newRule, parent_department_id: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">选择父部门</option>
                    {departments.map(dept => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    子部门
                  </label>
                  <select
                    value={newRule.child_department_id || ''}
                    onChange={(e) => setNewRule({ ...newRule, child_department_id: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">选择子部门</option>
                    {departments.map(dept => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  权限
                </label>
                <select
                  value={newRule.permission_id || ''}
                  onChange={(e) => setNewRule({ ...newRule, permission_id: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">选择权限</option>
                  {permissions.map(perm => (
                    <option key={perm.id} value={perm.id}>
                      {perm.name} ({perm.resource}:{perm.action})
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    继承类型
                  </label>
                  <select
                    value={newRule.inherit_type || 'full'}
                    onChange={(e) => setNewRule({ ...newRule, inherit_type: e.target.value as 'full' | 'partial' | 'deny' })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="full">完全继承</option>
                    <option value="partial">部分继承</option>
                    <option value="deny">拒绝继承</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    优先级
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={newRule.priority || 1}
                    onChange={(e) => setNewRule({ ...newRule, priority: parseInt(e.target.value) })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    状态
                  </label>
                  <select
                    value={newRule.is_active ? 'true' : 'false'}
                    onChange={(e) => setNewRule({ ...newRule, is_active: e.target.value === 'true' })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="true">启用</option>
                    <option value="false">禁用</option>
                  </select>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={createRule}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Save className="w-4 h-4" />
                )}
                创建
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 编辑规则模态框 */}
      {editingRule && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">编辑继承规则</h3>
              <button
                onClick={() => setEditingRule(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    父部门
                  </label>
                  <select
                    value={editingRule.parent_department_id}
                    onChange={(e) => setEditingRule({ ...editingRule, parent_department_id: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {departments.map(dept => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    子部门
                  </label>
                  <select
                    value={editingRule.child_department_id}
                    onChange={(e) => setEditingRule({ ...editingRule, child_department_id: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {departments.map(dept => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  权限
                </label>
                <select
                  value={editingRule.permission_id}
                  onChange={(e) => setEditingRule({ ...editingRule, permission_id: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {permissions.map(perm => (
                    <option key={perm.id} value={perm.id}>
                      {perm.name} ({perm.resource}:{perm.action})
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    继承类型
                  </label>
                  <select
                    value={editingRule.inherit_type}
                    onChange={(e) => setEditingRule({ ...editingRule, inherit_type: e.target.value as 'full' | 'partial' | 'deny' })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="full">完全继承</option>
                    <option value="partial">部分继承</option>
                    <option value="deny">拒绝继承</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    优先级
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={editingRule.priority}
                    onChange={(e) => setEditingRule({ ...editingRule, priority: parseInt(e.target.value) })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    状态
                  </label>
                  <select
                    value={editingRule.is_active ? 'true' : 'false'}
                    onChange={(e) => setEditingRule({ ...editingRule, is_active: e.target.value === 'true' })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="true">启用</option>
                    <option value="false">禁用</option>
                  </select>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setEditingRule(null)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => updateRule(editingRule)}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Save className="w-4 h-4" />
                )}
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PermissionInheritanceManager;