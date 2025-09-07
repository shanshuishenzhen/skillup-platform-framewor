'use client';

import React, { useState, useEffect, useCallback } from 'react';
import EnhancedOrgChart from './EnhancedOrgChart';
import {
  Building2,
  Users,
  Search,
  Filter,
  Download,
  Settings,
  RefreshCw,
  Eye,
  EyeOff,
  Maximize,
  Minimize,
  Grid,
  List,
  BarChart3,
  PieChart,
  TrendingUp,
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { toast } from 'sonner';

// 部门节点数据接口
interface DepartmentNode {
  id: string;
  name: string;
  level: number;
  parent_id: string | null;
  user_count: number;
  manager_name?: string;
  description?: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
  children?: DepartmentNode[];
}

// 视图模式类型
type ViewMode = 'tree' | 'hierarchy' | 'network' | 'radial';

// 筛选选项接口
interface FilterOptions {
  status: 'all' | 'active' | 'inactive';
  level: number | null;
  minUserCount: number;
  maxUserCount: number;
  searchTerm: string;
  showEmptyDepartments: boolean;
}

// 统计数据接口
interface ChartStats {
  totalDepartments: number;
  activeDepartments: number;
  inactiveDepartments: number;
  totalUsers: number;
  averageUsersPerDepartment: number;
  maxLevel: number;
  departmentsByLevel: { level: number; count: number }[];
  departmentsByStatus: { status: string; count: number }[];
}

/**
 * 组织架构可视化页面组件
 * @component OrgChartVisualization
 * @description 提供完整的组织架构可视化功能，包括多种视图模式、筛选、搜索和统计
 * @returns {JSX.Element} 组织架构可视化页面组件
 */
export const OrgChartVisualization: React.FC = () => {
  // 状态管理
  const [departments, setDepartments] = useState<DepartmentNode[]>([]);
  const [filteredDepartments, setFilteredDepartments] = useState<DepartmentNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('tree');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [selectedNode, setSelectedNode] = useState<DepartmentNode | null>(null);
  const [chartStats, setChartStats] = useState<ChartStats | null>(null);
  
  // 筛选选项状态
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    status: 'all',
    level: null,
    minUserCount: 0,
    maxUserCount: 1000,
    searchTerm: '',
    showEmptyDepartments: true
  });

  /**
   * 获取部门数据
   * @function fetchDepartments
   * @description 从API获取部门数据并更新状态
   */
  const fetchDepartments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/admin/departments');
      if (!response.ok) {
        throw new Error('获取部门数据失败');
      }
      
      const data = await response.json();
      setDepartments(data.departments || []);
      
      toast.success('部门数据加载成功');
    } catch (error) {
      console.error('获取部门数据失败:', error);
      setError(error instanceof Error ? error.message : '获取部门数据失败');
      toast.error('获取部门数据失败');
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * 计算统计数据
   * @function calculateStats
   * @param {DepartmentNode[]} depts - 部门数据数组
   * @returns {ChartStats} 统计数据
   */
  const calculateStats = useCallback((depts: DepartmentNode[]): ChartStats => {
    const totalDepartments = depts.length;
    const activeDepartments = depts.filter(d => d.status === 'active').length;
    const inactiveDepartments = depts.filter(d => d.status === 'inactive').length;
    const totalUsers = depts.reduce((sum, d) => sum + d.user_count, 0);
    const averageUsersPerDepartment = totalDepartments > 0 ? totalUsers / totalDepartments : 0;
    const maxLevel = Math.max(...depts.map(d => d.level), 0);
    
    // 按层级统计
    const levelCounts = new Map<number, number>();
    depts.forEach(d => {
      levelCounts.set(d.level, (levelCounts.get(d.level) || 0) + 1);
    });
    const departmentsByLevel = Array.from(levelCounts.entries())
      .map(([level, count]) => ({ level, count }))
      .sort((a, b) => a.level - b.level);
    
    // 按状态统计
    const statusCounts = new Map<string, number>();
    depts.forEach(d => {
      statusCounts.set(d.status, (statusCounts.get(d.status) || 0) + 1);
    });
    const departmentsByStatus = Array.from(statusCounts.entries())
      .map(([status, count]) => ({ status, count }));
    
    return {
      totalDepartments,
      activeDepartments,
      inactiveDepartments,
      totalUsers,
      averageUsersPerDepartment,
      maxLevel,
      departmentsByLevel,
      departmentsByStatus
    };
  }, []);

  /**
   * 应用筛选条件
   * @function applyFilters
   * @param {DepartmentNode[]} depts - 原始部门数据
   * @param {FilterOptions} filters - 筛选条件
   * @returns {DepartmentNode[]} 筛选后的部门数据
   */
  const applyFilters = useCallback((depts: DepartmentNode[], filters: FilterOptions): DepartmentNode[] => {
    return depts.filter(dept => {
      // 状态筛选
      if (filters.status !== 'all' && dept.status !== filters.status) {
        return false;
      }
      
      // 层级筛选
      if (filters.level !== null && dept.level !== filters.level) {
        return false;
      }
      
      // 用户数量筛选
      if (dept.user_count < filters.minUserCount || dept.user_count > filters.maxUserCount) {
        return false;
      }
      
      // 空部门筛选
      if (!filters.showEmptyDepartments && dept.user_count === 0) {
        return false;
      }
      
      // 搜索词筛选
      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase();
        const matchesName = dept.name.toLowerCase().includes(searchLower);
        const matchesManager = dept.manager_name?.toLowerCase().includes(searchLower) || false;
        const matchesDescription = dept.description?.toLowerCase().includes(searchLower) || false;
        
        if (!matchesName && !matchesManager && !matchesDescription) {
          return false;
        }
      }
      
      return true;
    });
  }, []);

  /**
   * 处理节点点击事件
   * @function handleNodeClick
   * @param {DepartmentNode} node - 被点击的节点
   */
  const handleNodeClick = useCallback((node: DepartmentNode) => {
    setSelectedNode(node);
    console.log('节点被点击:', node);
  }, []);

  /**
   * 处理节点编辑事件
   * @function handleNodeEdit
   * @param {DepartmentNode} node - 要编辑的节点
   */
  const handleNodeEdit = useCallback((node: DepartmentNode) => {
    console.log('编辑节点:', node);
    toast.info(`编辑部门: ${node.name}`);
    // 这里可以打开编辑模态框
  }, []);

  /**
   * 处理节点删除事件
   * @function handleNodeDelete
   * @param {DepartmentNode} node - 要删除的节点
   */
  const handleNodeDelete = useCallback((node: DepartmentNode) => {
    console.log('删除节点:', node);
    toast.warning(`删除部门: ${node.name}`);
    // 这里可以显示确认删除对话框
  }, []);

  /**
   * 处理添加子节点事件
   * @function handleNodeAdd
   * @param {DepartmentNode} parentNode - 父节点
   */
  const handleNodeAdd = useCallback((parentNode: DepartmentNode) => {
    console.log('添加子部门到:', parentNode);
    toast.info(`为 ${parentNode.name} 添加子部门`);
    // 这里可以打开添加部门模态框
  }, []);

  /**
   * 导出图表数据
   * @function exportData
   * @param {string} format - 导出格式
   */
  const exportData = useCallback((format: 'json' | 'csv' | 'excel') => {
    try {
      const dataToExport = filteredDepartments.map(dept => ({
        id: dept.id,
        name: dept.name,
        level: dept.level,
        parent_id: dept.parent_id,
        user_count: dept.user_count,
        manager_name: dept.manager_name || '',
        description: dept.description || '',
        status: dept.status,
        created_at: dept.created_at,
        updated_at: dept.updated_at
      }));
      
      if (format === 'json') {
        const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `org-chart-data-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
      } else if (format === 'csv') {
        const headers = Object.keys(dataToExport[0] || {});
        const csvContent = [
          headers.join(','),
          ...dataToExport.map(row => headers.map(header => `"${row[header as keyof typeof row]}"`).join(','))
        ].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `org-chart-data-${Date.now()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      }
      
      toast.success(`数据已导出为 ${format.toUpperCase()} 格式`);
    } catch (error) {
      console.error('导出失败:', error);
      toast.error('导出失败');
    }
  }, [filteredDepartments]);

  /**
   * 重置筛选条件
   * @function resetFilters
   */
  const resetFilters = useCallback(() => {
    setFilterOptions({
      status: 'all',
      level: null,
      minUserCount: 0,
      maxUserCount: 1000,
      searchTerm: '',
      showEmptyDepartments: true
    });
    toast.info('筛选条件已重置');
  }, []);

  // 初始化数据
  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  // 应用筛选和计算统计
  useEffect(() => {
    const filtered = applyFilters(departments, filterOptions);
    setFilteredDepartments(filtered);
    setChartStats(calculateStats(filtered));
  }, [departments, filterOptions, applyFilters, calculateStats]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
          <span className="text-gray-600">加载组织架构数据...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">加载失败</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchDepartments}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${isFullscreen ? 'fixed inset-0 z-50 bg-white p-6' : ''}`}>
      {/* 页面标题和操作栏 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">组织架构可视化</h1>
          <p className="text-gray-600 mt-1">交互式组织架构图表，支持多种视图模式和数据分析</p>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* 统计信息 */}
          {chartStats && (
            <div className="flex items-center space-x-4 px-4 py-2 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-1">
                <Building2 className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium">{chartStats.totalDepartments}</span>
                <span className="text-xs text-gray-500">部门</span>
              </div>
              <div className="flex items-center space-x-1">
                <Users className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">{chartStats.totalUsers}</span>
                <span className="text-xs text-gray-500">用户</span>
              </div>
              <div className="flex items-center space-x-1">
                <TrendingUp className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-medium">{chartStats.maxLevel}</span>
                <span className="text-xs text-gray-500">层级</span>
              </div>
            </div>
          )}
          
          {/* 操作按钮 */}
          <button
            onClick={() => setShowStats(!showStats)}
            className={`p-2 rounded-lg transition-colors ${
              showStats ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            title="统计面板"
          >
            <BarChart3 className="h-5 w-5" />
          </button>
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded-lg transition-colors ${
              showFilters ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            title="筛选面板"
          >
            <Filter className="h-5 w-5" />
          </button>
          
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
            title={isFullscreen ? '退出全屏' : '全屏显示'}
          >
            {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
          </button>
          
          <button
            onClick={fetchDepartments}
            className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
            title="刷新数据"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* 筛选面板 */}
      {showFilters && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">筛选条件</h3>
            <button
              onClick={resetFilters}
              className="text-sm text-blue-600 hover:text-blue-700 transition-colors"
            >
              重置筛选
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 搜索框 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">搜索</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="搜索部门名称、负责人..."
                  value={filterOptions.searchTerm}
                  onChange={(e) => setFilterOptions(prev => ({ ...prev, searchTerm: e.target.value }))}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            
            {/* 状态筛选 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">状态</label>
              <select
                value={filterOptions.status}
                onChange={(e) => setFilterOptions(prev => ({ ...prev, status: e.target.value as FilterOptions['status'] }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">全部状态</option>
                <option value="active">活跃</option>
                <option value="inactive">非活跃</option>
              </select>
            </div>
            
            {/* 层级筛选 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">层级</label>
              <select
                value={filterOptions.level || ''}
                onChange={(e) => setFilterOptions(prev => ({ ...prev, level: e.target.value ? parseInt(e.target.value) : null }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">全部层级</option>
                {chartStats && Array.from({ length: chartStats.maxLevel }, (_, i) => i + 1).map(level => (
                  <option key={level} value={level}>第 {level} 级</option>
                ))}
              </select>
            </div>
            
            {/* 用户数量范围 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">用户数量</label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  placeholder="最小"
                  value={filterOptions.minUserCount}
                  onChange={(e) => setFilterOptions(prev => ({ ...prev, minUserCount: parseInt(e.target.value) || 0 }))}
                  className="w-1/2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <input
                  type="number"
                  placeholder="最大"
                  value={filterOptions.maxUserCount}
                  onChange={(e) => setFilterOptions(prev => ({ ...prev, maxUserCount: parseInt(e.target.value) || 1000 }))}
                  className="w-1/2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>
          
          {/* 其他选项 */}
          <div className="mt-4 flex items-center space-x-6">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={filterOptions.showEmptyDepartments}
                onChange={(e) => setFilterOptions(prev => ({ ...prev, showEmptyDepartments: e.target.checked }))}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">显示空部门</span>
            </label>
          </div>
        </div>
      )}

      {/* 统计面板 */}
      {showStats && chartStats && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">统计概览</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* 总体统计 */}
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600 font-medium">总部门数</p>
                  <p className="text-2xl font-bold text-blue-900">{chartStats.totalDepartments}</p>
                </div>
                <Building2 className="h-8 w-8 text-blue-600" />
              </div>
            </div>
            
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600 font-medium">活跃部门</p>
                  <p className="text-2xl font-bold text-green-900">{chartStats.activeDepartments}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </div>
            
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-600 font-medium">总用户数</p>
                  <p className="text-2xl font-bold text-purple-900">{chartStats.totalUsers}</p>
                </div>
                <Users className="h-8 w-8 text-purple-600" />
              </div>
            </div>
            
            <div className="bg-orange-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-orange-600 font-medium">平均用户数</p>
                  <p className="text-2xl font-bold text-orange-900">{Math.round(chartStats.averageUsersPerDepartment)}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-orange-600" />
              </div>
            </div>
          </div>
          
          {/* 层级分布 */}
          <div className="mt-6">
            <h4 className="text-md font-semibold text-gray-900 mb-3">层级分布</h4>
            <div className="space-y-2">
              {chartStats.departmentsByLevel.map(({ level, count }) => (
                <div key={level} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-700">第 {level} 级</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${(count / chartStats.totalDepartments) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-900">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 交互式图表 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <EnhancedOrgChart
          departments={filteredDepartments}
          onNodeClick={handleNodeClick}
          onNodeEdit={handleNodeEdit}
          onNodeDelete={handleNodeDelete}
          onNodeAdd={handleNodeAdd}
          className="w-full"
          height={600}
          width={1000}
        />
      </div>

      {/* 导出选项 */}
      <div className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
        <div className="flex items-center space-x-4">
          <span className="text-sm font-medium text-gray-700">导出数据:</span>
          <button
            onClick={() => exportData('json')}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            JSON
          </button>
          <button
            onClick={() => exportData('csv')}
            className="px-3 py-1 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          >
            CSV
          </button>
        </div>
        
        <div className="text-sm text-gray-500">
          显示 {filteredDepartments.length} / {departments.length} 个部门
        </div>
      </div>
    </div>
  );
};

export default OrgChartVisualization;