'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Database, 
  Search, 
  Filter, 
  RefreshCw, 
  Download, 
  Upload, 
  Plus, 
  Edit, 
  Trash2, 
  Copy, 
  Play, 
  Pause, 
  Settings, 
  Shield, 
  Key, 
  Lock, 
  Unlock, 
  Eye, 
  EyeOff, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Info, 
  Building2, 
  Users, 
  FileText, 
  Code, 
  Save, 
  X, 
  ChevronDown, 
  ChevronRight, 
  Target, 
  Layers, 
  GitBranch, 
  Activity, 
  Clock, 
  User, 
  Calendar, 
  Hash, 
  Tag, 
  Zap, 
  TestTube
} from 'lucide-react';
import { toast } from 'sonner';

// 类型定义
interface Department {
  id: string;
  name: string;
  code: string;
  parent_id?: string;
  level: number;
  path: string;
  children?: Department[];
}

interface User {
  id: string;
  username: string;
  email: string;
  full_name: string;
}

interface AccessRule {
  id: string;
  name: string;
  description?: string;
  resource_type: 'table' | 'view' | 'function' | 'schema' | 'column' | 'row';
  resource_name: string;
  access_level: 'none' | 'read' | 'write' | 'admin' | 'owner';
  department_id?: string;
  department?: Department;
  user_id?: string;
  user?: User;
  conditions: AccessCondition[];
  priority: number;
  is_active: boolean;
  is_inherited: boolean;
  source_rule_id?: string;
  created_by: string;
  created_at: string;
  updated_by?: string;
  updated_at?: string;
  metadata: Record<string, any>;
}

interface AccessCondition {
  id: string;
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not_in' | 'like' | 'not_like' | 'is_null' | 'is_not_null' | 'between';
  value: any;
  logical_operator?: 'and' | 'or';
}

interface AccessTestQuery {
  id: string;
  name: string;
  description?: string;
  sql_query: string;
  expected_result: 'allow' | 'deny' | 'partial';
  test_user_id?: string;
  test_department_id?: string;
  test_context: Record<string, any>;
}

interface AccessTestResult {
  query_id: string;
  actual_result: 'allow' | 'deny' | 'partial';
  matched_rules: AccessRule[];
  execution_time: number;
  error_message?: string;
  result_data?: any;
  passed: boolean;
}

/**
 * 数据访问控制组件
 * 提供基于部门的数据访问控制规则管理和测试功能
 * 
 * @returns 数据访问控制界面
 */
const DataAccessControl: React.FC = () => {
  // 状态管理
  const [rules, setRules] = useState<AccessRule[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [testQueries, setTestQueries] = useState<AccessTestQuery[]>([]);
  const [testResults, setTestResults] = useState<AccessTestResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [resourceTypeFilter, setResourceTypeFilter] = useState<string[]>([]);
  const [accessLevelFilter, setAccessLevelFilter] = useState<string[]>([]);
  const [departmentFilter, setDepartmentFilter] = useState<string[]>([]);
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [inheritedFilter, setInheritedFilter] = useState<'all' | 'inherited' | 'direct'>('all');
  const [selectedRules, setSelectedRules] = useState<string[]>([]);
  const [showRuleEditor, setShowRuleEditor] = useState(false);
  const [editingRule, setEditingRule] = useState<AccessRule | null>(null);
  const [showTestPanel, setShowTestPanel] = useState(false);
  const [selectedTestQuery, setSelectedTestQuery] = useState<AccessTestQuery | null>(null);
  const [expandedRules, setExpandedRules] = useState<Set<string>>(new Set());

  // 表单状态
  const [ruleForm, setRuleForm] = useState({
    name: '',
    description: '',
    resource_type: 'table' as AccessRule['resource_type'],
    resource_name: '',
    access_level: 'read' as AccessRule['access_level'],
    department_id: '',
    user_id: '',
    conditions: [] as AccessCondition[],
    priority: 100,
    is_active: true
  });

  const [testQueryForm, setTestQueryForm] = useState({
    name: '',
    description: '',
    sql_query: '',
    expected_result: 'allow' as AccessTestQuery['expected_result'],
    test_user_id: '',
    test_department_id: '',
    test_context: {}
  });

  // 获取访问规则
  const fetchAccessRules = useCallback(async () => {
    try {
      const token = localStorage.getItem('admin_token');
      if (!token) {
        toast.error('请先登录');
        return;
      }

      const params = new URLSearchParams({
        search: searchTerm,
        active_filter: activeFilter,
        inherited_filter: inheritedFilter
      });

      if (resourceTypeFilter.length > 0) {
        params.append('resource_types', resourceTypeFilter.join(','));
      }
      if (accessLevelFilter.length > 0) {
        params.append('access_levels', accessLevelFilter.join(','));
      }
      if (departmentFilter.length > 0) {
        params.append('department_ids', departmentFilter.join(','));
      }

      const response = await fetch(`/api/admin/access-rules?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('获取访问规则失败');
      }

      const data = await response.json();
      setRules(data.rules || []);
    } catch (error) {
      console.error('获取访问规则失败:', error);
      toast.error('获取访问规则失败');
    }
  }, [searchTerm, resourceTypeFilter, accessLevelFilter, departmentFilter, activeFilter, inheritedFilter]);

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

  // 获取用户列表
  const fetchUsers = useCallback(async () => {
    try {
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
    }
  }, []);

  // 获取测试查询
  const fetchTestQueries = useCallback(async () => {
    try {
      const token = localStorage.getItem('admin_token');
      if (!token) return;

      const response = await fetch('/api/admin/access-test-queries', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('获取测试查询失败');
      }

      const data = await response.json();
      setTestQueries(data.queries || []);
    } catch (error) {
      console.error('获取测试查询失败:', error);
      toast.error('获取测试查询失败');
    }
  }, []);

  // 保存访问规则
  const saveAccessRule = async () => {
    try {
      setSaving(true);
      const token = localStorage.getItem('admin_token');
      if (!token) {
        toast.error('请先登录');
        return;
      }

      const url = editingRule 
        ? `/api/admin/access-rules/${editingRule.id}`
        : '/api/admin/access-rules';
      
      const method = editingRule ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(ruleForm)
      });

      if (!response.ok) {
        throw new Error('保存访问规则失败');
      }

      toast.success(editingRule ? '访问规则更新成功' : '访问规则创建成功');
      setShowRuleEditor(false);
      setEditingRule(null);
      resetRuleForm();
      fetchAccessRules();
    } catch (error) {
      console.error('保存访问规则失败:', error);
      toast.error('保存访问规则失败');
    } finally {
      setSaving(false);
    }
  };

  // 删除访问规则
  const deleteAccessRule = async (ruleId: string) => {
    if (!confirm('确定要删除这个访问规则吗？')) return;

    try {
      const token = localStorage.getItem('admin_token');
      if (!token) {
        toast.error('请先登录');
        return;
      }

      const response = await fetch(`/api/admin/access-rules/${ruleId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('删除访问规则失败');
      }

      toast.success('访问规则删除成功');
      fetchAccessRules();
    } catch (error) {
      console.error('删除访问规则失败:', error);
      toast.error('删除访问规则失败');
    }
  };

  // 切换规则状态
  const toggleRuleStatus = async (ruleId: string, isActive: boolean) => {
    try {
      const token = localStorage.getItem('admin_token');
      if (!token) {
        toast.error('请先登录');
        return;
      }

      const response = await fetch(`/api/admin/access-rules/${ruleId}/toggle`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ is_active: isActive })
      });

      if (!response.ok) {
        throw new Error('切换规则状态失败');
      }

      toast.success(`规则已${isActive ? '启用' : '禁用'}`);
      fetchAccessRules();
    } catch (error) {
      console.error('切换规则状态失败:', error);
      toast.error('切换规则状态失败');
    }
  };

  // 复制访问规则
  const copyAccessRule = (rule: AccessRule) => {
    setRuleForm({
      name: `${rule.name} (副本)`,
      description: rule.description || '',
      resource_type: rule.resource_type,
      resource_name: rule.resource_name,
      access_level: rule.access_level,
      department_id: rule.department_id || '',
      user_id: rule.user_id || '',
      conditions: [...rule.conditions],
      priority: rule.priority,
      is_active: true
    });
    setEditingRule(null);
    setShowRuleEditor(true);
  };

  // 导出访问规则
  const exportAccessRules = async (format: 'json' | 'csv') => {
    try {
      const token = localStorage.getItem('admin_token');
      if (!token) {
        toast.error('请先登录');
        return;
      }

      const params = new URLSearchParams({ format });
      if (selectedRules.length > 0) {
        params.append('rule_ids', selectedRules.join(','));
      }

      const response = await fetch(`/api/admin/access-rules/export?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('导出访问规则失败');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `access-rules.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('访问规则导出成功');
    } catch (error) {
      console.error('导出访问规则失败:', error);
      toast.error('导出访问规则失败');
    }
  };

  // 运行访问测试
  const runAccessTest = async (queryId?: string) => {
    try {
      setTesting(true);
      const token = localStorage.getItem('admin_token');
      if (!token) {
        toast.error('请先登录');
        return;
      }

      const url = queryId 
        ? `/api/admin/access-test/${queryId}`
        : '/api/admin/access-test/all';

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('运行访问测试失败');
      }

      const data = await response.json();
      setTestResults(data.results || []);
      
      const passedCount = data.results.filter((r: AccessTestResult) => r.passed).length;
      const totalCount = data.results.length;
      
      toast.success(`测试完成：${passedCount}/${totalCount} 通过`);
    } catch (error) {
      console.error('运行访问测试失败:', error);
      toast.error('运行访问测试失败');
    } finally {
      setTesting(false);
    }
  };

  // 重置规则表单
  const resetRuleForm = () => {
    setRuleForm({
      name: '',
      description: '',
      resource_type: 'table',
      resource_name: '',
      access_level: 'read',
      department_id: '',
      user_id: '',
      conditions: [],
      priority: 100,
      is_active: true
    });
  };

  // 添加条件
  const addCondition = () => {
    const newCondition: AccessCondition = {
      id: Date.now().toString(),
      field: '',
      operator: 'eq',
      value: '',
      logical_operator: 'and'
    };
    setRuleForm(prev => ({
      ...prev,
      conditions: [...prev.conditions, newCondition]
    }));
  };

  // 删除条件
  const removeCondition = (conditionId: string) => {
    setRuleForm(prev => ({
      ...prev,
      conditions: prev.conditions.filter(c => c.id !== conditionId)
    }));
  };

  // 更新条件
  const updateCondition = (conditionId: string, updates: Partial<AccessCondition>) => {
    setRuleForm(prev => ({
      ...prev,
      conditions: prev.conditions.map(c => 
        c.id === conditionId ? { ...c, ...updates } : c
      )
    }));
  };

  // 获取访问级别颜色
  const getAccessLevelColor = (level: string) => {
    switch (level) {
      case 'none': return 'text-gray-600 bg-gray-100';
      case 'read': return 'text-blue-600 bg-blue-100';
      case 'write': return 'text-green-600 bg-green-100';
      case 'admin': return 'text-orange-600 bg-orange-100';
      case 'owner': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  // 获取资源类型图标
  const getResourceTypeIcon = (type: string) => {
    switch (type) {
      case 'table': return <Database className="w-4 h-4" />;
      case 'view': return <Eye className="w-4 h-4" />;
      case 'function': return <Code className="w-4 h-4" />;
      case 'schema': return <Layers className="w-4 h-4" />;
      case 'column': return <Hash className="w-4 h-4" />;
      case 'row': return <FileText className="w-4 h-4" />;
      default: return <Database className="w-4 h-4" />;
    }
  };

  // 渲染规则编辑器
  const renderRuleEditor = () => {
    if (!showRuleEditor) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              {editingRule ? '编辑访问规则' : '创建访问规则'}
            </h2>
            <button
              onClick={() => {
                setShowRuleEditor(false);
                setEditingRule(null);
                resetRuleForm();
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
            <div className="grid grid-cols-2 gap-6">
              {/* 基本信息 */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">基本信息</h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    规则名称 *
                  </label>
                  <input
                    type="text"
                    value={ruleForm.name}
                    onChange={(e) => setRuleForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="输入规则名称"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    描述
                  </label>
                  <textarea
                    value={ruleForm.description}
                    onChange={(e) => setRuleForm(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="输入规则描述"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      资源类型 *
                    </label>
                    <select
                      value={ruleForm.resource_type}
                      onChange={(e) => setRuleForm(prev => ({ ...prev, resource_type: e.target.value as any }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="table">数据表</option>
                      <option value="view">视图</option>
                      <option value="function">函数</option>
                      <option value="schema">模式</option>
                      <option value="column">列</option>
                      <option value="row">行</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      访问级别 *
                    </label>
                    <select
                      value={ruleForm.access_level}
                      onChange={(e) => setRuleForm(prev => ({ ...prev, access_level: e.target.value as any }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="none">无权限</option>
                      <option value="read">只读</option>
                      <option value="write">读写</option>
                      <option value="admin">管理</option>
                      <option value="owner">所有者</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    资源名称 *
                  </label>
                  <input
                    type="text"
                    value={ruleForm.resource_name}
                    onChange={(e) => setRuleForm(prev => ({ ...prev, resource_name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="输入资源名称"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      优先级
                    </label>
                    <input
                      type="number"
                      value={ruleForm.priority}
                      onChange={(e) => setRuleForm(prev => ({ ...prev, priority: Number(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      min="1"
                      max="1000"
                    />
                  </div>
                  
                  <div className="flex items-center space-x-2 pt-6">
                    <input
                      type="checkbox"
                      id="is_active"
                      checked={ruleForm.is_active}
                      onChange={(e) => setRuleForm(prev => ({ ...prev, is_active: e.target.checked }))}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="is_active" className="text-sm text-gray-700">
                      启用规则
                    </label>
                  </div>
                </div>
              </div>
              
              {/* 目标设置 */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">目标设置</h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    目标部门
                  </label>
                  <select
                    value={ruleForm.department_id}
                    onChange={(e) => setRuleForm(prev => ({ ...prev, department_id: e.target.value, user_id: '' }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">选择部门</option>
                    {departments.map(dept => (
                      <option key={dept.id} value={dept.id}>
                        {'  '.repeat(dept.level)}{dept.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    目标用户
                  </label>
                  <select
                    value={ruleForm.user_id}
                    onChange={(e) => setRuleForm(prev => ({ ...prev, user_id: e.target.value, department_id: '' }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={!!ruleForm.department_id}
                  >
                    <option value="">选择用户</option>
                    {users.map(user => (
                      <option key={user.id} value={user.id}>
                        {user.full_name} ({user.username})
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="text-sm text-gray-500">
                  注意：部门规则和用户规则互斥，只能选择其中一种
                </div>
              </div>
            </div>
            
            {/* 访问条件 */}
            <div className="mt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">访问条件</h3>
                <button
                  onClick={addCondition}
                  className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1 text-sm"
                >
                  <Plus className="w-4 h-4" />
                  添加条件
                </button>
              </div>
              
              {ruleForm.conditions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Filter className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                  <p>暂无访问条件</p>
                  <p className="text-sm">点击上方按钮添加条件</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {ruleForm.conditions.map((condition, index) => (
                    <div key={condition.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                      {index > 0 && (
                        <select
                          value={condition.logical_operator || 'and'}
                          onChange={(e) => updateCondition(condition.id, { logical_operator: e.target.value as any })}
                          className="px-2 py-1 border border-gray-300 rounded text-sm"
                        >
                          <option value="and">AND</option>
                          <option value="or">OR</option>
                        </select>
                      )}
                      
                      <input
                        type="text"
                        value={condition.field}
                        onChange={(e) => updateCondition(condition.id, { field: e.target.value })}
                        placeholder="字段名"
                        className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                      
                      <select
                        value={condition.operator}
                        onChange={(e) => updateCondition(condition.id, { operator: e.target.value as any })}
                        className="px-2 py-1 border border-gray-300 rounded text-sm"
                      >
                        <option value="eq">等于</option>
                        <option value="ne">不等于</option>
                        <option value="gt">大于</option>
                        <option value="gte">大于等于</option>
                        <option value="lt">小于</option>
                        <option value="lte">小于等于</option>
                        <option value="in">包含</option>
                        <option value="not_in">不包含</option>
                        <option value="like">模糊匹配</option>
                        <option value="not_like">不匹配</option>
                        <option value="is_null">为空</option>
                        <option value="is_not_null">不为空</option>
                        <option value="between">范围内</option>
                      </select>
                      
                      <input
                        type="text"
                        value={condition.value}
                        onChange={(e) => updateCondition(condition.id, { value: e.target.value })}
                        placeholder="值"
                        className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                        disabled={['is_null', 'is_not_null'].includes(condition.operator)}
                      />
                      
                      <button
                        onClick={() => removeCondition(condition.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
            <button
              onClick={() => {
                setShowRuleEditor(false);
                setEditingRule(null);
                resetRuleForm();
              }}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
            >
              取消
            </button>
            <button
              onClick={saveAccessRule}
              disabled={saving || !ruleForm.name || !ruleForm.resource_name}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {saving ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {editingRule ? '更新规则' : '创建规则'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // 渲染测试面板
  const renderTestPanel = () => {
    if (!showTestPanel) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              访问控制测试
            </h2>
            <button
              onClick={() => setShowTestPanel(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
            <div className="grid grid-cols-2 gap-6">
              {/* 测试查询列表 */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">测试查询</h3>
                  <button
                    onClick={() => runAccessTest()}
                    disabled={testing}
                    className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center gap-1 text-sm"
                  >
                    {testing ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <TestTube className="w-4 h-4" />
                    )}
                    运行全部测试
                  </button>
                </div>
                
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {testQueries.map(query => {
                    const result = testResults.find(r => r.query_id === query.id);
                    return (
                      <div key={query.id} className="p-3 border border-gray-200 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-gray-900">{query.name}</h4>
                          <div className="flex items-center space-x-2">
                            {result && (
                              <span className={`px-2 py-1 rounded text-xs ${
                                result.passed ? 'text-green-600 bg-green-100' : 'text-red-600 bg-red-100'
                              }`}>
                                {result.passed ? '通过' : '失败'}
                              </span>
                            )}
                            <button
                              onClick={() => runAccessTest(query.id)}
                              disabled={testing}
                              className="text-blue-600 hover:text-blue-800 text-sm"
                            >
                              <Play className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{query.description}</p>
                        <div className="text-xs text-gray-500">
                          期望结果: {query.expected_result === 'allow' ? '允许' : query.expected_result === 'deny' ? '拒绝' : '部分允许'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              {/* 测试结果 */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">测试结果</h3>
                
                {testResults.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <TestTube className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                    <p>暂无测试结果</p>
                    <p className="text-sm">运行测试查看结果</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {testResults.map(result => (
                      <div key={result.query_id} className="p-3 border border-gray-200 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className={`px-2 py-1 rounded text-xs ${
                            result.passed ? 'text-green-600 bg-green-100' : 'text-red-600 bg-red-100'
                          }`}>
                            {result.passed ? '通过' : '失败'}
                          </span>
                          <span className="text-xs text-gray-500">
                            {result.execution_time}ms
                          </span>
                        </div>
                        <div className="text-sm text-gray-600 mb-2">
                          实际结果: {result.actual_result === 'allow' ? '允许' : result.actual_result === 'deny' ? '拒绝' : '部分允许'}
                        </div>
                        <div className="text-xs text-gray-500">
                          匹配规则: {result.matched_rules.length} 个
                        </div>
                        {result.error_message && (
                          <div className="text-xs text-red-600 mt-1">
                            错误: {result.error_message}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
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
        fetchDepartments(),
        fetchUsers(),
        fetchTestQueries()
      ]);
      setLoading(false);
    };
    
    initializeData();
  }, [fetchDepartments, fetchUsers, fetchTestQueries]);

  // 监听筛选条件变化
  useEffect(() => {
    fetchAccessRules();
  }, [fetchAccessRules]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-500">加载数据访问控制中...</p>
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
            <h2 className="text-xl font-semibold text-gray-900">数据访问控制</h2>
            <p className="text-sm text-gray-500 mt-1">
              管理基于部门的数据访问规则和权限控制
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowTestPanel(true)}
              className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <TestTube className="w-4 h-4" />
              测试面板
            </button>
            <div className="relative">
              <button
                onClick={() => {
                  const menu = document.getElementById('export-menu');
                  menu?.classList.toggle('hidden');
                }}
                className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                导出
              </button>
              <div id="export-menu" className="hidden absolute right-0 mt-2 w-32 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                <button
                  onClick={() => {
                    exportAccessRules('json');
                    document.getElementById('export-menu')?.classList.add('hidden');
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  JSON
                </button>
                <button
                  onClick={() => {
                    exportAccessRules('csv');
                    document.getElementById('export-menu')?.classList.add('hidden');
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  CSV
                </button>
              </div>
            </div>
            <button
              onClick={() => {
                resetRuleForm();
                setEditingRule(null);
                setShowRuleEditor(true);
              }}
              className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              新建规则
            </button>
            <button
              onClick={fetchAccessRules}
              className="px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              刷新
            </button>
          </div>
        </div>
        
        {/* 搜索和筛选 */}
        <div className="space-y-4">
          <div className="flex items-center space-x-4">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="搜索规则名称、资源名称..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full"
              />
            </div>
            <select
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">全部状态</option>
              <option value="active">仅启用</option>
              <option value="inactive">仅禁用</option>
            </select>
            <select
              value={inheritedFilter}
              onChange={(e) => setInheritedFilter(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">全部规则</option>
              <option value="inherited">仅继承</option>
              <option value="direct">仅直接</option>
            </select>
          </div>
        </div>
      </div>
      
      {/* 规则列表 */}
      <div className="flex-1 overflow-auto p-4">
        {rules.length === 0 ? (
          <div className="text-center py-12">
            <Shield className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">暂无访问规则</h3>
            <p className="text-gray-500 mb-4">创建第一个数据访问控制规则</p>
            <button
              onClick={() => {
                resetRuleForm();
                setEditingRule(null);
                setShowRuleEditor(true);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 mx-auto"
            >
              <Plus className="w-4 h-4" />
              创建规则
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {rules.map(rule => (
              <div key={rule.id} className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="flex items-center space-x-2">
                        {getResourceTypeIcon(rule.resource_type)}
                        <h3 className="text-lg font-medium text-gray-900">{rule.name}</h3>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs ${getAccessLevelColor(rule.access_level)}`}>
                        {rule.access_level.toUpperCase()}
                      </span>
                      {rule.is_inherited && (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-600 rounded text-xs">
                          继承
                        </span>
                      )}
                      <span className={`px-2 py-1 rounded text-xs ${
                        rule.is_active ? 'text-green-600 bg-green-100' : 'text-gray-600 bg-gray-100'
                      }`}>
                        {rule.is_active ? '启用' : '禁用'}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 text-sm text-gray-600 mb-3">
                      <div>
                        <span className="font-medium">资源:</span> {rule.resource_name}
                      </div>
                      <div>
                        <span className="font-medium">类型:</span> {rule.resource_type}
                      </div>
                      <div>
                        <span className="font-medium">优先级:</span> {rule.priority}
                      </div>
                    </div>
                    
                    {rule.department && (
                      <div className="flex items-center space-x-2 text-sm text-gray-600 mb-2">
                        <Building2 className="w-4 h-4" />
                        <span>部门: {rule.department.name}</span>
                      </div>
                    )}
                    
                    {rule.user && (
                      <div className="flex items-center space-x-2 text-sm text-gray-600 mb-2">
                        <User className="w-4 h-4" />
                        <span>用户: {rule.user.full_name}</span>
                      </div>
                    )}
                    
                    {rule.description && (
                      <p className="text-sm text-gray-600 mb-3">{rule.description}</p>
                    )}
                    
                    {rule.conditions.length > 0 && (
                      <div className="mb-3">
                        <button
                          onClick={() => {
                            const newExpanded = new Set(expandedRules);
                            if (expandedRules.has(rule.id)) {
                              newExpanded.delete(rule.id);
                            } else {
                              newExpanded.add(rule.id);
                            }
                            setExpandedRules(newExpanded);
                          }}
                          className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-800"
                        >
                          {expandedRules.has(rule.id) ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                          <span>访问条件 ({rule.conditions.length})</span>
                        </button>
                        
                        {expandedRules.has(rule.id) && (
                          <div className="mt-2 space-y-1">
                            {rule.conditions.map((condition, index) => (
                              <div key={condition.id} className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                                {index > 0 && (
                                  <span className="font-medium text-blue-600">
                                    {condition.logical_operator?.toUpperCase()} 
                                  </span>
                                )}
                                <span className="font-medium">{condition.field}</span>
                                <span className="mx-1">{condition.operator}</span>
                                <span className="font-mono">{condition.value}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <span>创建时间: {new Date(rule.created_at).toLocaleString()}</span>
                      {rule.updated_at && (
                        <span>更新时间: {new Date(rule.updated_at).toLocaleString()}</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => toggleRuleStatus(rule.id, !rule.is_active)}
                      className={`p-2 rounded-lg transition-colors ${
                        rule.is_active 
                          ? 'text-orange-600 hover:bg-orange-100' 
                          : 'text-green-600 hover:bg-green-100'
                      }`}
                      title={rule.is_active ? '禁用规则' : '启用规则'}
                    >
                      {rule.is_active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => copyAccessRule(rule)}
                      className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                      title="复制规则"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setRuleForm({
                          name: rule.name,
                          description: rule.description || '',
                          resource_type: rule.resource_type,
                          resource_name: rule.resource_name,
                          access_level: rule.access_level,
                          department_id: rule.department_id || '',
                          user_id: rule.user_id || '',
                          conditions: [...rule.conditions],
                          priority: rule.priority,
                          is_active: rule.is_active
                        });
                        setEditingRule(rule);
                        setShowRuleEditor(true);
                      }}
                      className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
                      title="编辑规则"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteAccessRule(rule.id)}
                      className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
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
      
      {/* 规则编辑器 */}
      {renderRuleEditor()}
      
      {/* 测试面板 */}
      {renderTestPanel()}
    </div>
  );
};

export default DataAccessControl;