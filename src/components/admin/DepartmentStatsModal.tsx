'use client';

import React, { useState, useEffect } from 'react';
import { X, BarChart3, Users, TrendingUp, Calendar, Download, RefreshCw } from 'lucide-react';
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

interface DepartmentStats {
  department_id: string;
  department_name: string;
  total_members: number;
  active_members: number;
  inactive_members: number;
  managers_count: number;
  primary_members: number;
  sub_departments: number;
  recent_joins: number;
  recent_leaves: number;
  member_growth_rate: number;
  avg_tenure_days: number;
  member_distribution: {
    position: string;
    count: number;
  }[];
  monthly_stats: {
    month: string;
    joins: number;
    leaves: number;
    net_change: number;
  }[];
}

interface DepartmentStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  department: Department | null;
}

/**
 * 部门统计模态框组件
 * 显示部门的详细统计信息和趋势分析
 * 
 * @param props - 组件属性
 * @param props.isOpen - 是否显示模态框
 * @param props.onClose - 关闭回调函数
 * @param props.department - 要查看统计的部门
 * @returns 部门统计模态框
 */
const DepartmentStatsModal: React.FC<DepartmentStatsModalProps> = ({
  isOpen,
  onClose,
  department
}) => {
  const [stats, setStats] = useState<DepartmentStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [timeRange, setTimeRange] = useState<'3m' | '6m' | '1y'>('6m');
  const [activeTab, setActiveTab] = useState<'overview' | 'trends' | 'distribution'>('overview');

  // 获取部门统计数据
  const fetchStats = async () => {
    if (!department) return;
    
    try {
      setLoading(true);
      const token = localStorage.getItem('admin_token');
      if (!token) return;

      const params = new URLSearchParams({
        time_range: timeRange,
        include_sub_departments: 'true'
      });

      const response = await fetch(`/api/admin/departments/${department.id}/stats?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('获取部门统计失败');
      }

      const data = await response.json();
      setStats(data.stats);

    } catch (error) {
      console.error('获取部门统计失败:', error);
      toast.error('获取部门统计失败');
    } finally {
      setLoading(false);
    }
  };

  // 导出统计报告
  const handleExportReport = async () => {
    if (!department || !stats) return;

    try {
      const token = localStorage.getItem('admin_token');
      if (!token) return;

      const params = new URLSearchParams({
        time_range: timeRange,
        format: 'excel'
      });

      const response = await fetch(`/api/admin/departments/${department.id}/stats/export?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('导出报告失败');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${department.name}_统计报告_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('报告导出成功');

    } catch (error) {
      console.error('导出报告失败:', error);
      toast.error('导出报告失败');
    }
  };

  // 格式化数字
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('zh-CN').format(num);
  };

  // 格式化百分比
  const formatPercentage = (num: number) => {
    return `${num >= 0 ? '+' : ''}${num.toFixed(1)}%`;
  };

  // 初始化数据
  useEffect(() => {
    if (isOpen && department) {
      fetchStats();
    }
  }, [isOpen, department, timeRange]);

  if (!isOpen || !department) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">部门统计</h2>
              <p className="text-sm text-gray-500">{department.name} ({department.code})</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* 时间范围选择 */}
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as '3m' | '6m' | '1y')}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="3m">近3个月</option>
              <option value="6m">近6个月</option>
              <option value="1y">近1年</option>
            </select>
            
            {/* 刷新按钮 */}
            <button
              onClick={fetchStats}
              disabled={loading}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              title="刷新数据"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            
            {/* 导出按钮 */}
            <button
              onClick={handleExportReport}
              disabled={loading || !stats}
              className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 text-sm"
            >
              <Download className="w-4 h-4" />
              导出报告
            </button>
            
            {/* 关闭按钮 */}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 标签页 */}
        <div className="border-b border-gray-200">
          <div className="flex">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              概览
            </button>
            <button
              onClick={() => setActiveTab('trends')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'trends'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              趋势分析
            </button>
            <button
              onClick={() => setActiveTab('distribution')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'distribution'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              人员分布
            </button>
          </div>
        </div>

        {/* 内容区域 */}
        <div className="p-6 h-96 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : !stats ? (
            <div className="text-center py-12 text-gray-500">
              <BarChart3 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>暂无统计数据</p>
            </div>
          ) : (
            <div>
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* 关键指标卡片 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-blue-600 font-medium">总人数</p>
                          <p className="text-2xl font-bold text-blue-900">
                            {formatNumber(stats.total_members)}
                          </p>
                        </div>
                        <Users className="w-8 h-8 text-blue-500" />
                      </div>
                      <div className="mt-2 text-xs text-blue-600">
                        活跃: {stats.active_members} | 停用: {stats.inactive_members}
                      </div>
                    </div>

                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-green-600 font-medium">增长率</p>
                          <p className="text-2xl font-bold text-green-900">
                            {formatPercentage(stats.member_growth_rate)}
                          </p>
                        </div>
                        <TrendingUp className="w-8 h-8 text-green-500" />
                      </div>
                      <div className="mt-2 text-xs text-green-600">
                        近期入职: {stats.recent_joins} | 离职: {stats.recent_leaves}
                      </div>
                    </div>

                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-purple-600 font-medium">管理者</p>
                          <p className="text-2xl font-bold text-purple-900">
                            {formatNumber(stats.managers_count)}
                          </p>
                        </div>
                        <Users className="w-8 h-8 text-purple-500" />
                      </div>
                      <div className="mt-2 text-xs text-purple-600">
                        主要部门成员: {stats.primary_members}
                      </div>
                    </div>

                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-orange-600 font-medium">子部门</p>
                          <p className="text-2xl font-bold text-orange-900">
                            {formatNumber(stats.sub_departments)}
                          </p>
                        </div>
                        <BarChart3 className="w-8 h-8 text-orange-500" />
                      </div>
                      <div className="mt-2 text-xs text-orange-600">
                        平均任职: {Math.round(stats.avg_tenure_days / 30)} 个月
                      </div>
                    </div>
                  </div>

                  {/* 最近活动 */}
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">最近活动</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600 mb-2">近期入职</p>
                        <div className="space-y-2">
                          {/* 这里可以显示最近入职的员工列表 */}
                          <div className="text-sm text-gray-500">
                            {stats.recent_joins > 0 ? `${stats.recent_joins} 人最近加入部门` : '暂无新入职员工'}
                          </div>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-2">近期离职</p>
                        <div className="space-y-2">
                          {/* 这里可以显示最近离职的员工列表 */}
                          <div className="text-sm text-gray-500">
                            {stats.recent_leaves > 0 ? `${stats.recent_leaves} 人最近离开部门` : '暂无离职员工'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'trends' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-900">人员变化趋势</h3>
                  
                  {/* 月度统计表格 */}
                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            月份
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            入职
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            离职
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            净变化
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {stats.monthly_stats.map((monthStat, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {monthStat.month}
                            </td>
                            <td className="px-4 py-3 text-sm text-green-600">
                              +{monthStat.joins}
                            </td>
                            <td className="px-4 py-3 text-sm text-red-600">
                              -{monthStat.leaves}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <span className={`font-medium ${
                                monthStat.net_change >= 0 ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {monthStat.net_change >= 0 ? '+' : ''}{monthStat.net_change}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'distribution' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-900">职位分布</h3>
                  
                  {/* 职位分布图表 */}
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="space-y-3">
                      {stats.member_distribution.map((item, index) => {
                        const percentage = (item.count / stats.total_members) * 100;
                        return (
                          <div key={index} className="flex items-center justify-between">
                            <div className="flex items-center gap-3 flex-1">
                              <span className="text-sm font-medium text-gray-900 min-w-0 flex-1">
                                {item.position || '未设置职位'}
                              </span>
                              <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-xs">
                                <div
                                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                  style={{ width: `${percentage}%` }}
                                ></div>
                              </div>
                            </div>
                            <div className="text-sm text-gray-600 ml-3">
                              {item.count} ({percentage.toFixed(1)}%)
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 底部操作栏 */}
        <div className="border-t border-gray-200 p-6">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-500">
              数据更新时间: {new Date().toLocaleString('zh-CN')}
            </div>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              关闭
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DepartmentStatsModal;