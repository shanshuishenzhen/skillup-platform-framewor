'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  BarChart3, 
  PieChart, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Building2, 
  Calendar, 
  Download, 
  RefreshCw, 
  Filter, 
  Search, 
  Eye, 
  EyeOff, 
  Grid, 
  List, 
  ChevronDown, 
  ChevronRight, 
  Info, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Target, 
  Activity, 
  Zap, 
  Award, 
  Star, 
  Heart, 
  DollarSign, 
  Percent, 
  Hash, 
  ArrowUp, 
  ArrowDown, 
  Minus, 
  X, 
  Settings, 
  FileText, 
  Image, 
  Save
} from 'lucide-react';
import { toast } from 'sonner';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart as RechartsPieChart,
  Cell,
  AreaChart,
  Area,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Treemap
} from 'recharts';

// 类型定义
interface Department {
  id: string;
  name: string;
  code: string;
  parent_id?: string;
  level: number;
  employee_count: number;
  manager_id?: string;
  budget?: number;
  status: 'active' | 'inactive' | 'pending';
  created_at: string;
}

interface StatisticsData {
  employee_count: number;
  turnover_rate: number;
  satisfaction_score: number;
  productivity_index: number;
  budget_utilization: number;
  training_completion: number;
  performance_score: number;
  attendance_rate: number;
  overtime_hours: number;
  recruitment_count: number;
}

interface TrendData {
  date: string;
  employee_count: number;
  turnover_rate: number;
  satisfaction_score: number;
  productivity_index: number;
  budget_utilization: number;
}

interface ComparisonData {
  department_id: string;
  department_name: string;
  employee_count: number;
  turnover_rate: number;
  satisfaction_score: number;
  productivity_index: number;
  budget_utilization: number;
  performance_score: number;
}

interface ReportConfig {
  title: string;
  description: string;
  date_range: {
    start: string;
    end: string;
  };
  departments: string[];
  metrics: string[];
  chart_types: string[];
  export_format: 'pdf' | 'excel' | 'csv';
  include_charts: boolean;
  include_raw_data: boolean;
}

interface ChartConfig {
  type: 'bar' | 'line' | 'pie' | 'area' | 'radar' | 'treemap';
  title: string;
  data_key: string;
  color: string;
  show_legend: boolean;
  show_grid: boolean;
}

/**
 * 部门统计组件
 * 提供部门统计数据展示和报表功能
 * 
 * @returns 部门统计界面
 */
const DepartmentStatistics: React.FC = () => {
  // 状态管理
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [statisticsData, setStatisticsData] = useState<StatisticsData | null>(null);
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [comparisonData, setComparisonData] = useState<ComparisonData[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [viewMode, setViewMode] = useState<'overview' | 'trends' | 'comparison' | 'reports'>('overview');
  const [chartConfigs, setChartConfigs] = useState<ChartConfig[]>([
    { type: 'bar', title: '员工数量', data_key: 'employee_count', color: '#3B82F6', show_legend: true, show_grid: true },
    { type: 'line', title: '离职率趋势', data_key: 'turnover_rate', color: '#EF4444', show_legend: true, show_grid: true },
    { type: 'pie', title: '满意度分布', data_key: 'satisfaction_score', color: '#10B981', show_legend: true, show_grid: false },
    { type: 'area', title: '生产力指数', data_key: 'productivity_index', color: '#F59E0B', show_legend: true, show_grid: true }
  ]);
  const [reportConfig, setReportConfig] = useState<ReportConfig>({
    title: '部门统计报表',
    description: '部门关键指标统计分析报告',
    date_range: dateRange,
    departments: [],
    metrics: ['employee_count', 'turnover_rate', 'satisfaction_score', 'productivity_index'],
    chart_types: ['bar', 'line', 'pie'],
    export_format: 'pdf',
    include_charts: true,
    include_raw_data: true
  });
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['overview']));

  // 颜色配置
  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16', '#F97316'];

  // 获取部门列表
  const fetchDepartments = useCallback(async () => {
    try {
      const token = localStorage.getItem('admin_token');
      if (!token) {
        toast.error('请先登录');
        return;
      }

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

  // 获取统计数据
  const fetchStatistics = useCallback(async () => {
    try {
      const token = localStorage.getItem('admin_token');
      if (!token) return;

      const params = new URLSearchParams({
        department_id: selectedDepartment,
        start_date: dateRange.start,
        end_date: dateRange.end
      });

      const response = await fetch(`/api/admin/statistics?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('获取统计数据失败');
      }

      const data = await response.json();
      setStatisticsData(data.statistics);
    } catch (error) {
      console.error('获取统计数据失败:', error);
      // 使用模拟数据
      setStatisticsData({
        employee_count: 156,
        turnover_rate: 8.5,
        satisfaction_score: 4.2,
        productivity_index: 87.3,
        budget_utilization: 92.1,
        training_completion: 78.9,
        performance_score: 85.6,
        attendance_rate: 96.2,
        overtime_hours: 12.4,
        recruitment_count: 23
      });
    }
  }, [selectedDepartment, dateRange]);

  // 获取趋势数据
  const fetchTrendData = useCallback(async () => {
    try {
      const token = localStorage.getItem('admin_token');
      if (!token) return;

      const params = new URLSearchParams({
        department_id: selectedDepartment,
        start_date: dateRange.start,
        end_date: dateRange.end
      });

      const response = await fetch(`/api/admin/statistics/trends?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('获取趋势数据失败');
      }

      const data = await response.json();
      setTrendData(data.trends);
    } catch (error) {
      console.error('获取趋势数据失败:', error);
      // 使用模拟数据
      const mockTrends: TrendData[] = [];
      const startDate = new Date(dateRange.start);
      const endDate = new Date(dateRange.end);
      const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      
      for (let i = 0; i <= daysDiff; i += Math.ceil(daysDiff / 10)) {
        const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
        mockTrends.push({
          date: date.toISOString().split('T')[0],
          employee_count: 150 + Math.floor(Math.random() * 20),
          turnover_rate: 8 + Math.random() * 4,
          satisfaction_score: 4 + Math.random() * 1,
          productivity_index: 80 + Math.random() * 20,
          budget_utilization: 85 + Math.random() * 15
        });
      }
      setTrendData(mockTrends);
    }
  }, [selectedDepartment, dateRange]);

  // 获取对比数据
  const fetchComparisonData = useCallback(async () => {
    try {
      const token = localStorage.getItem('admin_token');
      if (!token) return;

      const params = new URLSearchParams({
        start_date: dateRange.start,
        end_date: dateRange.end
      });

      const response = await fetch(`/api/admin/statistics/comparison?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('获取对比数据失败');
      }

      const data = await response.json();
      setComparisonData(data.comparison);
    } catch (error) {
      console.error('获取对比数据失败:', error);
      // 使用模拟数据
      const mockComparison: ComparisonData[] = departments.slice(0, 5).map((dept, index) => ({
        department_id: dept.id,
        department_name: dept.name,
        employee_count: 20 + Math.floor(Math.random() * 50),
        turnover_rate: 5 + Math.random() * 10,
        satisfaction_score: 3.5 + Math.random() * 1.5,
        productivity_index: 70 + Math.random() * 30,
        budget_utilization: 80 + Math.random() * 20,
        performance_score: 75 + Math.random() * 25
      }));
      setComparisonData(mockComparison);
    }
  }, [departments, dateRange]);

  // 导出报表
  const exportReport = async () => {
    try {
      setExporting(true);
      
      const token = localStorage.getItem('admin_token');
      if (!token) {
        toast.error('请先登录');
        return;
      }

      const response = await fetch('/api/admin/statistics/export', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(reportConfig)
      });

      if (!response.ok) {
        throw new Error('导出报表失败');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `department-statistics-${new Date().toISOString().split('T')[0]}.${reportConfig.export_format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('报表导出成功');
    } catch (error) {
      console.error('导出报表失败:', error);
      toast.error('导出报表失败');
    } finally {
      setExporting(false);
      setShowReportDialog(false);
    }
  };

  // 计算总体统计
  const calculateOverallStats = () => {
    if (!statisticsData) return null;
    
    return {
      total_employees: statisticsData.employee_count,
      avg_satisfaction: statisticsData.satisfaction_score,
      total_budget_utilization: statisticsData.budget_utilization,
      avg_performance: statisticsData.performance_score
    };
  };

  // 渲染统计卡片
  const renderStatCard = (title: string, value: string | number, icon: React.ReactNode, trend?: number, color: string = 'blue') => {
    const colorClasses = {
      blue: 'bg-blue-50 text-blue-600 border-blue-200',
      green: 'bg-green-50 text-green-600 border-green-200',
      yellow: 'bg-yellow-50 text-yellow-600 border-yellow-200',
      red: 'bg-red-50 text-red-600 border-red-200',
      purple: 'bg-purple-50 text-purple-600 border-purple-200'
    };
    
    return (
      <div className={`p-6 rounded-lg border ${colorClasses[color as keyof typeof colorClasses] || colorClasses.blue}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
            {trend !== undefined && (
              <div className="flex items-center mt-2">
                {trend > 0 ? (
                  <ArrowUp className="w-4 h-4 text-green-500 mr-1" />
                ) : trend < 0 ? (
                  <ArrowDown className="w-4 h-4 text-red-500 mr-1" />
                ) : (
                  <Minus className="w-4 h-4 text-gray-500 mr-1" />
                )}
                <span className={`text-sm ${
                  trend > 0 ? 'text-green-600' : trend < 0 ? 'text-red-600' : 'text-gray-600'
                }`}>
                  {Math.abs(trend)}%
                </span>
              </div>
            )}
          </div>
          <div className="text-3xl opacity-80">
            {icon}
          </div>
        </div>
      </div>
    );
  };

  // 渲染图表
  const renderChart = (config: ChartConfig, data: any[]) => {
    const commonProps = {
      width: '100%',
      height: 300,
      data,
      margin: { top: 20, right: 30, left: 20, bottom: 5 }
    };
    
    switch (config.type) {
      case 'bar':
        return (
          <ResponsiveContainer {...commonProps}>
            <BarChart data={data}>
              {config.show_grid && <CartesianGrid strokeDasharray="3 3" />}
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              {config.show_legend && <Legend />}
              <Bar dataKey={config.data_key} fill={config.color} />
            </BarChart>
          </ResponsiveContainer>
        );
      
      case 'line':
        return (
          <ResponsiveContainer {...commonProps}>
            <LineChart data={data}>
              {config.show_grid && <CartesianGrid strokeDasharray="3 3" />}
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              {config.show_legend && <Legend />}
              <Line type="monotone" dataKey={config.data_key} stroke={config.color} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        );
      
      case 'pie':
        return (
          <ResponsiveContainer {...commonProps}>
            <RechartsPieChart>
              <Tooltip />
              {config.show_legend && <Legend />}
              <RechartsPieChart data={data} cx="50%" cy="50%" outerRadius={80}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </RechartsPieChart>
            </RechartsPieChart>
          </ResponsiveContainer>
        );
      
      case 'area':
        return (
          <ResponsiveContainer {...commonProps}>
            <AreaChart data={data}>
              {config.show_grid && <CartesianGrid strokeDasharray="3 3" />}
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              {config.show_legend && <Legend />}
              <Area type="monotone" dataKey={config.data_key} stroke={config.color} fill={config.color} fillOpacity={0.3} />
            </AreaChart>
          </ResponsiveContainer>
        );
      
      case 'radar':
        return (
          <ResponsiveContainer {...commonProps}>
            <RadarChart data={data}>
              <PolarGrid />
              <PolarAngleAxis dataKey="subject" />
              <PolarRadiusAxis />
              <Radar name={config.title} dataKey={config.data_key} stroke={config.color} fill={config.color} fillOpacity={0.3} />
              {config.show_legend && <Legend />}
            </RadarChart>
          </ResponsiveContainer>
        );
      
      case 'treemap':
        return (
          <ResponsiveContainer {...commonProps}>
            <Treemap
              data={data}
              dataKey={config.data_key}
              ratio={4/3}
              stroke="#fff"
              fill={config.color}
            />
          </ResponsiveContainer>
        );
      
      default:
        return null;
    }
  };

  // 渲染概览视图
  const renderOverview = () => {
    if (!statisticsData) return null;
    
    return (
      <div className="space-y-6">
        {/* 关键指标卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {renderStatCard('员工总数', statisticsData.employee_count, <Users />, 5.2, 'blue')}
          {renderStatCard('离职率', `${statisticsData.turnover_rate}%`, <TrendingDown />, -2.1, 'green')}
          {renderStatCard('满意度', statisticsData.satisfaction_score.toFixed(1), <Heart />, 3.5, 'yellow')}
          {renderStatCard('生产力指数', `${statisticsData.productivity_index}%`, <Target />, 8.7, 'purple')}
        </div>
        
        {/* 次要指标 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {renderStatCard('预算使用率', `${statisticsData.budget_utilization}%`, <DollarSign />, 1.3, 'blue')}
          {renderStatCard('培训完成率', `${statisticsData.training_completion}%`, <Award />, -0.8, 'green')}
          {renderStatCard('绩效评分', `${statisticsData.performance_score}%`, <Star />, 4.2, 'yellow')}
          {renderStatCard('出勤率', `${statisticsData.attendance_rate}%`, <CheckCircle />, 0.5, 'green')}
          {renderStatCard('加班时长', `${statisticsData.overtime_hours}h`, <Clock />, -12.3, 'red')}
          {renderStatCard('招聘人数', statisticsData.recruitment_count, <Users />, 15.6, 'purple')}
        </div>
        
        {/* 图表展示 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">部门员工分布</h3>
            {renderChart(
              { type: 'bar', title: '员工数量', data_key: 'employee_count', color: '#3B82F6', show_legend: true, show_grid: true },
              comparisonData.map(item => ({ name: item.department_name, employee_count: item.employee_count }))
            )}
          </div>
          
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">满意度分布</h3>
            {renderChart(
              { type: 'pie', title: '满意度', data_key: 'satisfaction_score', color: '#10B981', show_legend: true, show_grid: false },
              comparisonData.map(item => ({ name: item.department_name, satisfaction_score: item.satisfaction_score }))
            )}
          </div>
        </div>
      </div>
    );
  };

  // 渲染趋势视图
  const renderTrends = () => {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">员工数量趋势</h3>
            {renderChart(
              { type: 'line', title: '员工数量', data_key: 'employee_count', color: '#3B82F6', show_legend: true, show_grid: true },
              trendData
            )}
          </div>
          
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">离职率趋势</h3>
            {renderChart(
              { type: 'area', title: '离职率', data_key: 'turnover_rate', color: '#EF4444', show_legend: true, show_grid: true },
              trendData
            )}
          </div>
          
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">满意度趋势</h3>
            {renderChart(
              { type: 'line', title: '满意度', data_key: 'satisfaction_score', color: '#10B981', show_legend: true, show_grid: true },
              trendData
            )}
          </div>
          
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">生产力指数趋势</h3>
            {renderChart(
              { type: 'area', title: '生产力指数', data_key: 'productivity_index', color: '#F59E0B', show_legend: true, show_grid: true },
              trendData
            )}
          </div>
        </div>
      </div>
    );
  };

  // 渲染对比视图
  const renderComparison = () => {
    return (
      <div className="space-y-6">
        {/* 对比表格 */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">部门对比数据</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    部门名称
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    员工数量
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    离职率
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    满意度
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    生产力指数
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    绩效评分
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {comparisonData.map((item) => (
                  <tr key={item.department_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.department_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.employee_count}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        item.turnover_rate < 5 ? 'bg-green-100 text-green-800' :
                        item.turnover_rate < 10 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {item.turnover_rate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${(item.satisfaction_score / 5) * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-sm">{item.satisfaction_score.toFixed(1)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.productivity_index.toFixed(1)}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.performance_score.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* 对比图表 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">部门绩效雷达图</h3>
            {renderChart(
              { type: 'radar', title: '绩效指标', data_key: 'value', color: '#8B5CF6', show_legend: true, show_grid: true },
              comparisonData.slice(0, 1).map(item => [
                { subject: '员工数量', value: (item.employee_count / 100) * 100 },
                { subject: '满意度', value: (item.satisfaction_score / 5) * 100 },
                { subject: '生产力', value: item.productivity_index },
                { subject: '绩效', value: item.performance_score },
                { subject: '预算使用', value: item.budget_utilization }
              ]).flat()
            )}
          </div>
          
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">部门规模分布</h3>
            {renderChart(
              { type: 'treemap', title: '员工数量', data_key: 'employee_count', color: '#06B6D4', show_legend: false, show_grid: false },
              comparisonData.map(item => ({ name: item.department_name, employee_count: item.employee_count }))
            )}
          </div>
        </div>
      </div>
    );
  };

  // 渲染报表配置对话框
  const renderReportDialog = () => {
    if (!showReportDialog) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">生成统计报表</h2>
            <button
              onClick={() => setShowReportDialog(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  报表标题
                </label>
                <input
                  type="text"
                  value={reportConfig.title}
                  onChange={(e) => setReportConfig(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  导出格式
                </label>
                <select
                  value={reportConfig.export_format}
                  onChange={(e) => setReportConfig(prev => ({ ...prev, export_format: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="pdf">PDF</option>
                  <option value="excel">Excel</option>
                  <option value="csv">CSV</option>
                </select>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                报表描述
              </label>
              <textarea
                value={reportConfig.description}
                onChange={(e) => setReportConfig(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  开始日期
                </label>
                <input
                  type="date"
                  value={reportConfig.date_range.start}
                  onChange={(e) => setReportConfig(prev => ({ 
                    ...prev, 
                    date_range: { ...prev.date_range, start: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  结束日期
                </label>
                <input
                  type="date"
                  value={reportConfig.date_range.end}
                  onChange={(e) => setReportConfig(prev => ({ 
                    ...prev, 
                    date_range: { ...prev.date_range, end: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                包含部门
              </label>
              <div className="space-y-2 max-h-32 overflow-y-auto border border-gray-300 rounded-lg p-3">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={reportConfig.departments.length === 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setReportConfig(prev => ({ ...prev, departments: [] }));
                      }
                    }}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">所有部门</span>
                </label>
                {departments.map(dept => (
                  <label key={dept.id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={reportConfig.departments.includes(dept.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setReportConfig(prev => ({ 
                            ...prev, 
                            departments: [...prev.departments, dept.id]
                          }));
                        } else {
                          setReportConfig(prev => ({ 
                            ...prev, 
                            departments: prev.departments.filter(id => id !== dept.id)
                          }));
                        }
                      }}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{dept.name}</span>
                  </label>
                ))}
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={reportConfig.include_charts}
                  onChange={(e) => setReportConfig(prev => ({ ...prev, include_charts: e.target.checked }))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">包含图表</span>
              </label>
              
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={reportConfig.include_raw_data}
                  onChange={(e) => setReportConfig(prev => ({ ...prev, include_raw_data: e.target.checked }))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">包含原始数据</span>
              </label>
            </div>
          </div>
          
          <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
            <button
              onClick={() => setShowReportDialog(false)}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
            >
              取消
            </button>
            <button
              onClick={exportReport}
              disabled={exporting}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {exporting ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              生成报表
            </button>
          </div>
        </div>
      </div>
    );
  };

  // 初始化数据
  useEffect(() => {
    const initializeData = async () => {
      setLoading(true);
      await fetchDepartments();
      await Promise.all([
        fetchStatistics(),
        fetchTrendData(),
        fetchComparisonData()
      ]);
      setLoading(false);
    };
    
    initializeData();
  }, [fetchDepartments, fetchStatistics, fetchTrendData, fetchComparisonData]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-500">加载统计数据中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* 头部工具栏 */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">部门统计</h2>
            <p className="text-sm text-gray-500 mt-1">
              查看部门关键指标和统计数据
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* 部门选择 */}
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">所有部门</option>
              {departments.map(dept => (
                <option key={dept.id} value={dept.id}>{dept.name}</option>
              ))}
            </select>
            
            {/* 日期范围 */}
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <span className="text-gray-500">至</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            
            {/* 生成报表 */}
            <button
              onClick={() => setShowReportDialog(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              生成报表
            </button>
            
            {/* 刷新 */}
            <button
              onClick={() => {
                fetchStatistics();
                fetchTrendData();
                fetchComparisonData();
              }}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="刷新数据"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        {/* 视图切换 */}
        <div className="flex items-center space-x-1 mt-4">
          <button
            onClick={() => setViewMode('overview')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              viewMode === 'overview'
                ? 'bg-blue-100 text-blue-700 border border-blue-200'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <BarChart3 className="w-4 h-4 inline mr-2" />
            概览
          </button>
          <button
            onClick={() => setViewMode('trends')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              viewMode === 'trends'
                ? 'bg-blue-100 text-blue-700 border border-blue-200'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <TrendingUp className="w-4 h-4 inline mr-2" />
            趋势
          </button>
          <button
            onClick={() => setViewMode('comparison')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              viewMode === 'comparison'
                ? 'bg-blue-100 text-blue-700 border border-blue-200'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <PieChart className="w-4 h-4 inline mr-2" />
            对比
          </button>
        </div>
      </div>
      
      {/* 内容区域 */}
      <div className="flex-1 overflow-auto p-6">
        {viewMode === 'overview' && renderOverview()}
        {viewMode === 'trends' && renderTrends()}
        {viewMode === 'comparison' && renderComparison()}
      </div>
      
      {/* 报表配置对话框 */}
      {renderReportDialog()}
    </div>
  );
};

export default DepartmentStatistics;