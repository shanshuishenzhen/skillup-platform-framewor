import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { 
  History, 
  Search, 
  Filter, 
  Download, 
  Eye, 
  User, 
  Building, 
  Shield, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  X, 
  RotateCcw,
  Calendar,
  FileText,
  Activity
} from 'lucide-react';

/**
 * 权限变更记录接口
 * @interface PermissionChangeLog
 */
interface PermissionChangeLog {
  id: string;
  user_id: string;
  permission_id: string;
  department_id?: string;
  action: 'grant' | 'revoke' | 'inherit' | 'override';
  old_value?: boolean;
  new_value?: boolean;
  source: 'direct' | 'department' | 'inherited' | 'system';
  reason?: string;
  expires_at?: string;
  created_by: string;
  created_at: string;
  
  // 关联数据
  user_name?: string;
  user_email?: string;
  permission_name?: string;
  permission_resource?: string;
  permission_action?: string;
  department_name?: string;
  created_by_name?: string;
}

/**
 * 审计统计接口
 * @interface AuditStats
 */
interface AuditStats {
  total_changes: number;
  grants: number;
  revokes: number;
  inherits: number;
  overrides: number;
  today_changes: number;
  week_changes: number;
  month_changes: number;
  top_users: {
    user_id: string;
    user_name: string;
    change_count: number;
  }[];
  top_permissions: {
    permission_id: string;
    permission_name: string;
    change_count: number;
  }[];
}

/**
 * 权限审计日志组件
 * 提供权限变更历史的查看、搜索和分析功能
 * 
 * @component PermissionAuditLogger
 * @returns {JSX.Element} 权限审计日志组件
 */
const PermissionAuditLogger: React.FC = () => {
  // 状态管理
  const [logs, setLogs] = useState<PermissionChangeLog[]>([]);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState<'all' | 'grant' | 'revoke' | 'inherit' | 'override'>('all');
  const [filterSource, setFilterSource] = useState<'all' | 'direct' | 'department' | 'inherited' | 'system'>('all');
  const [filterUser, setFilterUser] = useState('');
  const [filterPermission, setFilterPermission] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [dateRange, setDateRange] = useState({
    start: '',
    end: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedLogs, setSelectedLogs] = useState<Set<string>>(new Set());
  const [showStats, setShowStats] = useState(true);
  const [exportFormat, setExportFormat] = useState<'csv' | 'json' | 'pdf'>('csv');

  /**
   * 获取审计日志
   * @async
   * @function fetchAuditLogs
   */
  const fetchAuditLogs = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('admin_token');
      if (!token) return;

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
        ...(searchTerm && { search: searchTerm }),
        ...(filterAction !== 'all' && { action: filterAction }),
        ...(filterSource !== 'all' && { source: filterSource }),
        ...(filterUser && { user_id: filterUser }),
        ...(filterPermission && { permission_id: filterPermission }),
        ...(filterDepartment && { department_id: filterDepartment }),
        ...(dateRange.start && { start_date: dateRange.start }),
        ...(dateRange.end && { end_date: dateRange.end })
      });

      const response = await fetch(`/api/admin/permissions/audit?${params}`, {
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
      setTotalCount(data.total || 0);
    } catch (error) {
      console.error('获取审计日志失败:', error);
      toast.error('获取审计日志失败');
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, searchTerm, filterAction, filterSource, filterUser, filterPermission, filterDepartment, dateRange]);

  /**
   * 获取审计统计
   * @async
   * @function fetchAuditStats
   */
  const fetchAuditStats = useCallback(async () => {
    try {
      const token = localStorage.getItem('admin_token');
      if (!token) return;

      const params = new URLSearchParams({
        ...(dateRange.start && { start_date: dateRange.start }),
        ...(dateRange.end && { end_date: dateRange.end })
      });

      const response = await fetch(`/api/admin/permissions/audit/stats?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('获取审计统计失败');
      }

      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('获取审计统计失败:', error);
      toast.error('获取审计统计失败');
    }
  }, [dateRange]);

  /**
   * 导出审计日志
   * @async
   * @function exportAuditLogs
   */
  const exportAuditLogs = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      if (!token) {
        toast.error('请先登录');
        return;
      }

      const params = new URLSearchParams({
        format: exportFormat,
        ...(searchTerm && { search: searchTerm }),
        ...(filterAction !== 'all' && { action: filterAction }),
        ...(filterSource !== 'all' && { source: filterSource }),
        ...(filterUser && { user_id: filterUser }),
        ...(filterPermission && { permission_id: filterPermission }),
        ...(filterDepartment && { department_id: filterDepartment }),
        ...(dateRange.start && { start_date: dateRange.start }),
        ...(dateRange.end && { end_date: dateRange.end }),
        ...(selectedLogs.size > 0 && { ids: Array.from(selectedLogs).join(',') })
      });

      const response = await fetch(`/api/admin/permissions/audit/export?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('导出审计日志失败');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `audit_logs_${new Date().toISOString().split('T')[0]}.${exportFormat}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('审计日志导出成功');
    } catch (error) {
      console.error('导出审计日志失败:', error);
      toast.error('导出审计日志失败');
    }
  };

  /**
   * 重置筛选条件
   * @function resetFilters
   */
  const resetFilters = () => {
    setSearchTerm('');
    setFilterAction('all');
    setFilterSource('all');
    setFilterUser('');
    setFilterPermission('');
    setFilterDepartment('');
    setDateRange({ start: '', end: '' });
    setCurrentPage(1);
    setSelectedLogs(new Set());
  };

  /**
   * 获取操作类型显示文本
   * @function getActionText
   * @param {string} action - 操作类型
   * @returns {string} 显示文本
   */
  const getActionText = (action: string): string => {
    switch (action) {
      case 'grant': return '授予';
      case 'revoke': return '撤销';
      case 'inherit': return '继承';
      case 'override': return '覆盖';
      default: return action;
    }
  };

  /**
   * 获取操作类型颜色
   * @function getActionColor
   * @param {string} action - 操作类型
   * @returns {string} 颜色类名
   */
  const getActionColor = (action: string): string => {
    switch (action) {
      case 'grant': return 'text-green-600 bg-green-50';
      case 'revoke': return 'text-red-600 bg-red-50';
      case 'inherit': return 'text-blue-600 bg-blue-50';
      case 'override': return 'text-orange-600 bg-orange-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  /**
   * 获取权限源显示文本
   * @function getSourceText
   * @param {string} source - 权限源
   * @returns {string} 显示文本
   */
  const getSourceText = (source: string): string => {
    switch (source) {
      case 'direct': return '直接';
      case 'department': return '部门';
      case 'inherited': return '继承';
      case 'system': return '系统';
      default: return source;
    }
  };

  /**
   * 格式化日期时间
   * @function formatDateTime
   * @param {string} dateTime - 日期时间字符串
   * @returns {string} 格式化后的日期时间
   */
  const formatDateTime = (dateTime: string): string => {
    return new Date(dateTime).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  /**
   * 计算总页数
   * @function totalPages
   * @returns {number} 总页数
   */
  const totalPages = Math.ceil(totalCount / pageSize);

  // 组件挂载时获取数据
  useEffect(() => {
    fetchAuditLogs();
  }, [fetchAuditLogs]);

  useEffect(() => {
    if (showStats) {
      fetchAuditStats();
    }
  }, [fetchAuditStats, showStats]);

  return (
    <div className="space-y-6">
      {/* 头部操作区 */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">权限审计日志</h2>
          <p className="text-gray-600 mt-1">查看和分析权限变更历史记录</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowStats(!showStats)}
            className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
              showStats
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            <Activity className="w-4 h-4" />
            统计信息
          </button>
          <select
            value={exportFormat}
            onChange={(e) => setExportFormat(e.target.value as any)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="csv">CSV</option>
            <option value="json">JSON</option>
            <option value="pdf">PDF</option>
          </select>
          <button
            onClick={exportAuditLogs}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            导出日志
          </button>
        </div>
      </div>

      {/* 统计信息 */}
      {showStats && stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">总变更数</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total_changes}</p>
              </div>
              <History className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">权限授予</p>
                <p className="text-2xl font-bold text-green-600">{stats.grants}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">权限撤销</p>
                <p className="text-2xl font-bold text-red-600">{stats.revokes}</p>
              </div>
              <X className="w-8 h-8 text-red-500" />
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">今日变更</p>
                <p className="text-2xl font-bold text-orange-600">{stats.today_changes}</p>
              </div>
              <Clock className="w-8 h-8 text-orange-500" />
            </div>
          </div>
        </div>
      )}

      {/* 筛选器 */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">筛选条件</h3>
          <button
            onClick={resetFilters}
            className="px-3 py-1 text-gray-600 hover:text-gray-800 transition-colors flex items-center gap-1"
          >
            <RotateCcw className="w-4 h-4" />
            重置
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 搜索框 */}
          <div className="lg:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="搜索用户、权限或原因..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          
          {/* 操作类型筛选 */}
          <div>
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value as any)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">所有操作</option>
              <option value="grant">授予</option>
              <option value="revoke">撤销</option>
              <option value="inherit">继承</option>
              <option value="override">覆盖</option>
            </select>
          </div>
          
          {/* 权限源筛选 */}
          <div>
            <select
              value={filterSource}
              onChange={(e) => setFilterSource(e.target.value as any)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">所有来源</option>
              <option value="direct">直接</option>
              <option value="department">部门</option>
              <option value="inherited">继承</option>
              <option value="system">系统</option>
            </select>
          </div>
          
          {/* 日期范围 */}
          <div>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="开始日期"
            />
          </div>
          
          <div>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="结束日期"
            />
          </div>
        </div>
      </div>

      {/* 日志列表 */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">
              审计日志 ({totalCount} 条记录)
            </h3>
            {selectedLogs.size > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">
                  已选择 {selectedLogs.size} 条记录
                </span>
                <button
                  onClick={() => setSelectedLogs(new Set())}
                  className="px-3 py-1 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  取消选择
                </button>
              </div>
            )}
          </div>
        </div>
        
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-500 mt-2">加载中...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>暂无审计日志</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <input
                        type="checkbox"
                        checked={selectedLogs.size === logs.length && logs.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedLogs(new Set(logs.map(log => log.id)));
                          } else {
                            setSelectedLogs(new Set());
                          }
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      时间
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      用户
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      权限
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      操作
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      来源
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      变更
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      操作人
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {logs.map(log => {
                    const isSelected = selectedLogs.has(log.id);
                    
                    return (
                      <tr key={log.id} className={isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              const newSelected = new Set(selectedLogs);
                              if (e.target.checked) {
                                newSelected.add(log.id);
                              } else {
                                newSelected.delete(log.id);
                              }
                              setSelectedLogs(newSelected);
                            }}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </td>
                        
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-gray-400" />
                            {formatDateTime(log.created_at)}
                          </div>
                        </td>
                        
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-gray-400" />
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {log.user_name || 'Unknown'}
                              </div>
                              <div className="text-sm text-gray-500">
                                {log.user_email}
                              </div>
                            </div>
                          </div>
                        </td>
                        
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Shield className="w-4 h-4 text-gray-400" />
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {log.permission_name}
                              </div>
                              <div className="text-sm text-gray-500">
                                {log.permission_resource}:{log.permission_action}
                              </div>
                            </div>
                          </div>
                        </td>
                        
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            getActionColor(log.action)
                          }`}>
                            {getActionText(log.action)}
                          </span>
                        </td>
                        
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-900">
                              {getSourceText(log.source)}
                            </span>
                            {log.department_name && (
                              <div className="flex items-center gap-1">
                                <Building className="w-3 h-3 text-gray-400" />
                                <span className="text-xs text-gray-500">
                                  {log.department_name}
                                </span>
                              </div>
                            )}
                          </div>
                        </td>
                        
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {log.old_value !== undefined && log.new_value !== undefined ? (
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-1 rounded text-xs ${
                                log.old_value ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                              }`}>
                                {log.old_value ? '已授予' : '已拒绝'}
                              </span>
                              <span className="text-gray-400">→</span>
                              <span className={`px-2 py-1 rounded text-xs ${
                                log.new_value ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                              }`}>
                                {log.new_value ? '已授予' : '已拒绝'}
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-500">-</span>
                          )}
                        </td>
                        
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {log.created_by_name || 'System'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            {/* 分页 */}
            {totalPages > 1 && (
              <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-700">
                    显示 {(currentPage - 1) * pageSize + 1} 到 {Math.min(currentPage * pageSize, totalCount)} 条，
                    共 {totalCount} 条记录
                  </span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={10}>10条/页</option>
                    <option value={20}>20条/页</option>
                    <option value={50}>50条/页</option>
                    <option value={100}>100条/页</option>
                  </select>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    上一页
                  </button>
                  
                  <span className="text-sm text-gray-700">
                    第 {currentPage} 页，共 {totalPages} 页
                  </span>
                  
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    下一页
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default PermissionAuditLogger;