'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  FileText, 
  Search, 
  Filter, 
  RefreshCw, 
  Download, 
  Calendar, 
  User, 
  Building2, 
  Key, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Eye, 
  ChevronLeft, 
  ChevronRight, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  Shield, 
  Activity, 
  Database, 
  Settings, 
  Trash2, 
  Edit, 
  Plus, 
  Minus, 
  RotateCcw, 
  GitBranch, 
  Target, 
  Layers, 
  Info, 
  ExternalLink
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
}

interface Department {
  id: string;
  name: string;
  code: string;
  parent_id?: string;
  level: number;
  path: string;
}

interface User {
  id: string;
  username: string;
  email: string;
  full_name: string;
}

interface AuditLogEntry {
  id: string;
  action_type: 'create' | 'update' | 'delete' | 'assign' | 'revoke' | 'inherit' | 'override' | 'reset' | 'template_apply' | 'bulk_operation';
  resource_type: 'permission' | 'department_permission' | 'user_permission' | 'permission_template' | 'access_rule';
  resource_id: string;
  resource_name: string;
  target_type?: 'user' | 'department' | 'role';
  target_id?: string;
  target_name?: string;
  department_id?: string;
  department?: Department;
  user_id?: string;
  user?: User;
  permission_id?: string;
  permission?: Permission;
  operator_id: string;
  operator: User;
  operation_time: string;
  ip_address: string;
  user_agent: string;
  session_id: string;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  details: Record<string, any>;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  affected_users_count?: number;
  affected_departments_count?: number;
  batch_id?: string;
  parent_log_id?: string;
  rollback_log_id?: string;
  is_rollback: boolean;
  success: boolean;
  error_message?: string;
  metadata: Record<string, any>;
}

interface AuditLogFilter {
  action_types: string[];
  resource_types: string[];
  risk_levels: string[];
  operator_ids: string[];
  department_ids: string[];
  date_range: {
    start: string;
    end: string;
  };
  success_only: boolean;
  include_system_operations: boolean;
}

interface AuditLogStats {
  total_logs: number;
  logs_by_action: Record<string, number>;
  logs_by_risk: Record<string, number>;
  logs_by_operator: Record<string, { count: number; name: string }>;
  logs_by_department: Record<string, { count: number; name: string }>;
  success_rate: number;
  high_risk_operations: number;
  recent_activity: number;
}

/**
 * 权限变更审计日志组件
 * 提供权限变更的详细记录、查询、分析和导出功能
 * 
 * @returns 权限审计日志界面
 */
const PermissionAuditLog: React.FC = () => {
  // 状态管理
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [stats, setStats] = useState<AuditLogStats | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [operators, setOperators] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionTypeFilter, setActionTypeFilter] = useState<string[]>([]);
  const [resourceTypeFilter, setResourceTypeFilter] = useState<string[]>([]);
  const [riskLevelFilter, setRiskLevelFilter] = useState<string[]>([]);
  const [operatorFilter, setOperatorFilter] = useState<string[]>([]);
  const [departmentFilter, setDepartmentFilter] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [successFilter, setSuccessFilter] = useState<'all' | 'success' | 'failed'>('all');
  const [includeSystemOps, setIncludeSystemOps] = useState(true);
  const [sortField, setSortField] = useState<'operation_time' | 'risk_level' | 'operator'>('operation_time');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showStats, setShowStats] = useState(true);

  // 获取审计日志
  const fetchAuditLogs = useCallback(async () => {
    try {
      const token = localStorage.getItem('admin_token');
      if (!token) {
        toast.error('请先登录');
        return;
      }

      const params = new URLSearchParams({
        page: currentPage.toString(),
        page_size: pageSize.toString(),
        sort_field: sortField,
        sort_direction: sortDirection,
        search: searchTerm,
        date_start: dateRange.start,
        date_end: dateRange.end,
        success_filter: successFilter,
        include_system: includeSystemOps.toString()
      });

      if (actionTypeFilter.length > 0) {
        params.append('action_types', actionTypeFilter.join(','));
      }
      if (resourceTypeFilter.length > 0) {
        params.append('resource_types', resourceTypeFilter.join(','));
      }
      if (riskLevelFilter.length > 0) {
        params.append('risk_levels', riskLevelFilter.join(','));
      }
      if (operatorFilter.length > 0) {
        params.append('operator_ids', operatorFilter.join(','));
      }
      if (departmentFilter.length > 0) {
        params.append('department_ids', departmentFilter.join(','));
      }

      const response = await fetch(`/api/admin/audit-logs?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('获取审计日志失败');
      }

      const data = await response.json();
      setLogs(data.logs || []);
    } catch (error) {
      console.error('获取审计日志失败:', error);
      toast.error('获取审计日志失败');
    }
  }, [currentPage, pageSize, sortField, sortDirection, searchTerm, dateRange, successFilter, includeSystemOps, actionTypeFilter, resourceTypeFilter, riskLevelFilter, operatorFilter, departmentFilter]);

  // 获取统计信息
  const fetchStats = useCallback(async () => {
    try {
      const token = localStorage.getItem('admin_token');
      if (!token) return;

      const params = new URLSearchParams({
        date_start: dateRange.start,
        date_end: dateRange.end,
        include_system: includeSystemOps.toString()
      });

      const response = await fetch(`/api/admin/audit-logs/stats?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('获取统计信息失败');
      }

      const data = await response.json();
      setStats(data.stats);
    } catch (error) {
      console.error('获取统计信息失败:', error);
      toast.error('获取统计信息失败');
    }
  }, [dateRange, includeSystemOps]);

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

  // 获取操作员列表
  const fetchOperators = useCallback(async () => {
    try {
      const token = localStorage.getItem('admin_token');
      if (!token) return;

      const response = await fetch('/api/admin/users?role=admin', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('获取操作员列表失败');
      }

      const data = await response.json();
      setOperators(data.users || []);
    } catch (error) {
      console.error('获取操作员列表失败:', error);
      toast.error('获取操作员列表失败');
    }
  }, []);

  // 导出审计日志
  const exportAuditLogs = async (format: 'json' | 'csv' | 'excel') => {
    try {
      setExporting(true);
      const token = localStorage.getItem('admin_token');
      if (!token) {
        toast.error('请先登录');
        return;
      }

      const params = new URLSearchParams({
        format,
        search: searchTerm,
        date_start: dateRange.start,
        date_end: dateRange.end,
        success_filter: successFilter,
        include_system: includeSystemOps.toString()
      });

      if (actionTypeFilter.length > 0) {
        params.append('action_types', actionTypeFilter.join(','));
      }
      if (resourceTypeFilter.length > 0) {
        params.append('resource_types', resourceTypeFilter.join(','));
      }
      if (riskLevelFilter.length > 0) {
        params.append('risk_levels', riskLevelFilter.join(','));
      }
      if (operatorFilter.length > 0) {
        params.append('operator_ids', operatorFilter.join(','));
      }
      if (departmentFilter.length > 0) {
        params.append('department_ids', departmentFilter.join(','));
      }

      const response = await fetch(`/api/admin/audit-logs/export?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('导出审计日志失败');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${dateRange.start}-${dateRange.end}.${format === 'excel' ? 'xlsx' : format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('审计日志导出成功');
    } catch (error) {
      console.error('导出审计日志失败:', error);
      toast.error('导出审计日志失败');
    } finally {
      setExporting(false);
    }
  };

  // 获取操作类型显示名称
  const getActionTypeName = (actionType: string) => {
    const names: Record<string, string> = {
      create: '创建',
      update: '更新',
      delete: '删除',
      assign: '分配',
      revoke: '撤销',
      inherit: '继承',
      override: '覆盖',
      reset: '重置',
      template_apply: '应用模板',
      bulk_operation: '批量操作'
    };
    return names[actionType] || actionType;
  };

  // 获取资源类型显示名称
  const getResourceTypeName = (resourceType: string) => {
    const names: Record<string, string> = {
      permission: '权限',
      department_permission: '部门权限',
      user_permission: '用户权限',
      permission_template: '权限模板',
      access_rule: '访问规则'
    };
    return names[resourceType] || resourceType;
  };

  // 获取风险等级颜色
  const getRiskLevelColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'critical': return 'text-red-600 bg-red-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  // 获取风险等级图标
  const getRiskLevelIcon = (riskLevel: string) => {
    switch (riskLevel) {
      case 'critical': return <AlertTriangle className="w-4 h-4" />;
      case 'high': return <AlertTriangle className="w-4 h-4" />;
      case 'medium': return <Info className="w-4 h-4" />;
      case 'low': return <CheckCircle className="w-4 h-4" />;
      default: return <Info className="w-4 h-4" />;
    }
  };

  // 处理排序
  const handleSort = (field: 'operation_time' | 'risk_level' | 'operator') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
    setCurrentPage(1);
  };

  // 渲染排序图标
  const renderSortIcon = (field: string) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-4 h-4 text-gray-400" />;
    }
    return sortDirection === 'asc' ? 
      <ArrowUp className="w-4 h-4 text-blue-600" /> : 
      <ArrowDown className="w-4 h-4 text-blue-600" />;
  };

  // 渲染统计卡片
  const renderStatsCard = (title: string, value: string | number, icon: React.ReactNode, color: string) => (
    <div className="bg-white p-4 rounded-lg border border-gray-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">{title}</p>
          <p className="text-2xl font-semibold text-gray-900">{value}</p>
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
          {icon}
        </div>
      </div>
    </div>
  );

  // 渲染日志详情模态框
  const renderLogDetailsModal = () => {
    if (!showDetails || !selectedLog) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] overflow-hidden">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              审计日志详情
            </h2>
            <button
              onClick={() => {
                setShowDetails(false);
                setSelectedLog(null);
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <XCircle className="w-6 h-6" />
            </button>
          </div>
          
          <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)]">
            <div className="grid grid-cols-2 gap-6">
              {/* 基本信息 */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">基本信息</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">操作类型:</span>
                    <span className="text-gray-900">{getActionTypeName(selectedLog.action_type)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">资源类型:</span>
                    <span className="text-gray-900">{getResourceTypeName(selectedLog.resource_type)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">资源名称:</span>
                    <span className="text-gray-900">{selectedLog.resource_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">操作时间:</span>
                    <span className="text-gray-900">{new Date(selectedLog.operation_time).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">操作员:</span>
                    <span className="text-gray-900">{selectedLog.operator.full_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">风险等级:</span>
                    <span className={`px-2 py-1 rounded text-xs ${getRiskLevelColor(selectedLog.risk_level)}`}>
                      {selectedLog.risk_level.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">执行状态:</span>
                    <span className={`flex items-center gap-1 ${selectedLog.success ? 'text-green-600' : 'text-red-600'}`}>
                      {selectedLog.success ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                      {selectedLog.success ? '成功' : '失败'}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* 目标信息 */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">目标信息</h3>
                <div className="space-y-3">
                  {selectedLog.target_type && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">目标类型:</span>
                      <span className="text-gray-900">
                        {selectedLog.target_type === 'user' ? '用户' : 
                         selectedLog.target_type === 'department' ? '部门' : '角色'}
                      </span>
                    </div>
                  )}
                  {selectedLog.target_name && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">目标名称:</span>
                      <span className="text-gray-900">{selectedLog.target_name}</span>
                    </div>
                  )}
                  {selectedLog.department && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">所属部门:</span>
                      <span className="text-gray-900">{selectedLog.department.name}</span>
                    </div>
                  )}
                  {selectedLog.permission && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">相关权限:</span>
                      <span className="text-gray-900">{selectedLog.permission.name}</span>
                    </div>
                  )}
                  {selectedLog.affected_users_count !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">影响用户数:</span>
                      <span className="text-gray-900">{selectedLog.affected_users_count}</span>
                    </div>
                  )}
                  {selectedLog.affected_departments_count !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">影响部门数:</span>
                      <span className="text-gray-900">{selectedLog.affected_departments_count}</span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* 技术信息 */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">技术信息</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">IP地址:</span>
                    <span className="text-gray-900 font-mono text-sm">{selectedLog.ip_address}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">会话ID:</span>
                    <span className="text-gray-900 font-mono text-sm">{selectedLog.session_id.substring(0, 16)}...</span>
                  </div>
                  {selectedLog.batch_id && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">批次ID:</span>
                      <span className="text-gray-900 font-mono text-sm">{selectedLog.batch_id.substring(0, 16)}...</span>
                    </div>
                  )}
                  {selectedLog.is_rollback && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">回滚操作:</span>
                      <span className="text-orange-600">是</span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* 错误信息 */}
              {selectedLog.error_message && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900">错误信息</h3>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-sm text-red-800">{selectedLog.error_message}</p>
                  </div>
                </div>
              )}
            </div>
            
            {/* 操作描述 */}
            <div className="mt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-3">操作描述</h3>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <p className="text-sm text-gray-700">{selectedLog.description}</p>
              </div>
            </div>
            
            {/* 变更详情 */}
            {(selectedLog.old_values || selectedLog.new_values) && (
              <div className="mt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-3">变更详情</h3>
                <div className="grid grid-cols-2 gap-4">
                  {selectedLog.old_values && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">变更前</h4>
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <pre className="text-xs text-red-800 whitespace-pre-wrap">
                          {JSON.stringify(selectedLog.old_values, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                  {selectedLog.new_values && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">变更后</h4>
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <pre className="text-xs text-green-800 whitespace-pre-wrap">
                          {JSON.stringify(selectedLog.new_values, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* 元数据 */}
            {Object.keys(selectedLog.metadata).length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-3">元数据</h3>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              </div>
            )}
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
        fetchOperators()
      ]);
      setLoading(false);
    };
    
    initializeData();
  }, [fetchDepartments, fetchOperators]);

  // 监听筛选条件变化
  useEffect(() => {
    fetchAuditLogs();
    if (showStats) {
      fetchStats();
    }
  }, [fetchAuditLogs, fetchStats, showStats]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-500">加载审计日志中...</p>
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
            <h2 className="text-xl font-semibold text-gray-900">权限审计日志</h2>
            <p className="text-sm text-gray-500 mt-1">
              记录所有权限相关操作，提供详细的审计追踪
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowStats(!showStats)}
              className={`px-3 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                showStats ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <Activity className="w-4 h-4" />
              统计信息
            </button>
            <div className="relative">
              <button
                onClick={() => {
                  const menu = document.getElementById('export-menu');
                  menu?.classList.toggle('hidden');
                }}
                disabled={exporting}
                className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center gap-2"
              >
                {exporting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                导出日志
              </button>
              <div id="export-menu" className="hidden absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                <button
                  onClick={() => {
                    exportAuditLogs('json');
                    document.getElementById('export-menu')?.classList.add('hidden');
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  导出为 JSON
                </button>
                <button
                  onClick={() => {
                    exportAuditLogs('csv');
                    document.getElementById('export-menu')?.classList.add('hidden');
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  导出为 CSV
                </button>
                <button
                  onClick={() => {
                    exportAuditLogs('excel');
                    document.getElementById('export-menu')?.classList.add('hidden');
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  导出为 Excel
                </button>
              </div>
            </div>
            <button
              onClick={() => {
                setCurrentPage(1);
                fetchAuditLogs();
                if (showStats) fetchStats();
              }}
              className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              刷新
            </button>
          </div>
        </div>
        
        {/* 统计信息 */}
        {showStats && stats && (
          <div className="mb-4 grid grid-cols-6 gap-4">
            {renderStatsCard('总日志数', stats.total_logs.toLocaleString(), <FileText className="w-5 h-5" />, 'bg-blue-100 text-blue-600')}
            {renderStatsCard('成功率', `${(stats.success_rate * 100).toFixed(1)}%`, <CheckCircle className="w-5 h-5" />, 'bg-green-100 text-green-600')}
            {renderStatsCard('高风险操作', stats.high_risk_operations.toLocaleString(), <AlertTriangle className="w-5 h-5" />, 'bg-red-100 text-red-600')}
            {renderStatsCard('近期活动', stats.recent_activity.toLocaleString(), <Clock className="w-5 h-5" />, 'bg-yellow-100 text-yellow-600')}
            {renderStatsCard('操作员数', Object.keys(stats.logs_by_operator).length.toString(), <User className="w-5 h-5" />, 'bg-purple-100 text-purple-600')}
            {renderStatsCard('涉及部门', Object.keys(stats.logs_by_department).length.toString(), <Building2 className="w-5 h-5" />, 'bg-indigo-100 text-indigo-600')}
          </div>
        )}
        
        {/* 搜索和筛选 */}
        <div className="space-y-4">
          <div className="flex items-center space-x-4">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="搜索操作描述、资源名称、操作员..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full"
              />
            </div>
            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-600">日期范围:</label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <span className="text-gray-400">至</span>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <select
              value={successFilter}
              onChange={(e) => setSuccessFilter(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">全部状态</option>
              <option value="success">仅成功</option>
              <option value="failed">仅失败</option>
            </select>
            
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value={10}>10条/页</option>
              <option value={20}>20条/页</option>
              <option value={50}>50条/页</option>
              <option value={100}>100条/页</option>
            </select>
            
            <label className="flex items-center space-x-2 text-sm">
              <input
                type="checkbox"
                checked={includeSystemOps}
                onChange={(e) => setIncludeSystemOps(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span>包含系统操作</span>
            </label>
          </div>
        </div>
      </div>
      
      {/* 日志列表 */}
      <div className="flex-1 overflow-auto">
        {logs.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">暂无审计日志</h3>
            <p className="text-gray-500">当前筛选条件下没有找到相关日志记录</p>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg m-4">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <button
                        onClick={() => handleSort('operation_time')}
                        className="flex items-center space-x-1 hover:text-gray-700"
                      >
                        <span>操作时间</span>
                        {renderSortIcon('operation_time')}
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      操作类型
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      资源
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <button
                        onClick={() => handleSort('operator')}
                        className="flex items-center space-x-1 hover:text-gray-700"
                      >
                        <span>操作员</span>
                        {renderSortIcon('operator')}
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <button
                        onClick={() => handleSort('risk_level')}
                        className="flex items-center space-x-1 hover:text-gray-700"
                      >
                        <span>风险等级</span>
                        {renderSortIcon('risk_level')}
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      状态
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center space-x-2">
                          <Clock className="w-4 h-4 text-gray-400" />
                          <span>{new Date(log.operation_time).toLocaleString()}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-gray-900">
                            {getActionTypeName(log.action_type)}
                          </span>
                          <span className="text-xs text-gray-500">
                            {getResourceTypeName(log.resource_type)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{log.resource_name}</div>
                        {log.target_name && (
                          <div className="text-xs text-gray-500">目标: {log.target_name}</div>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <User className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-900">{log.operator.full_name}</span>
                        </div>
                        <div className="text-xs text-gray-500">{log.ip_address}</div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${getRiskLevelColor(log.risk_level)}`}>
                          {getRiskLevelIcon(log.risk_level)}
                          {log.risk_level.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${
                          log.success ? 'text-green-600 bg-green-100' : 'text-red-600 bg-red-100'
                        }`}>
                          {log.success ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                          {log.success ? '成功' : '失败'}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        <button
                          onClick={() => {
                            setSelectedLog(log);
                            setShowDetails(true);
                          }}
                          className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                        >
                          <Eye className="w-4 h-4" />
                          查看详情
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* 分页 */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
              <div className="text-sm text-gray-500">
                显示第 {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, logs.length)} 条，共 {logs.length} 条
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm text-gray-700">
                  第 {currentPage} 页
                </span>
                <button
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={logs.length < pageSize}
                  className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* 日志详情模态框 */}
      {renderLogDetailsModal()}
    </div>
  );
};

export default PermissionAuditLog;