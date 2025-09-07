'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart
} from 'recharts';
import {
  Users,
  TrendingUp,
  DollarSign,
  Building2,
  Download,
  Calendar,
  Filter,
  RefreshCw,
  FileText,
  BarChart3,
  PieChart as PieChartIcon
} from 'lucide-react';
import { toast } from 'sonner';

/**
 * 部门统计和报表组件
 * 提供部门数据的可视化展示和报表管理功能
 */

interface DepartmentStatsProps {
  departmentId?: string;
  className?: string;
}

interface StatsData {
  departments: {
    total: number;
    active: number;
    inactive: number;
  };
  personnel: {
    total: number;
    active: number;
    inactive: number;
    managers: number;
  };
  ratios: {
    manager_ratio: string;
    active_ratio: string;
  };
}

interface TrendData {
  date: string;
  joined: number;
  left: number;
  net_change: number;
}

interface ReportTemplate {
  id: string;
  name: string;
  type: string;
  description: string;
  fields: string[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function DepartmentStats({ departmentId, className }: DepartmentStatsProps) {
  const [statsData, setStatsData] = useState<StatsData | null>(null);
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [personnelData, setPersonnelData] = useState<any[]>([]);
  const [budgetData, setBudgetData] = useState<any>(null);
  const [reportTemplates, setReportTemplates] = useState<ReportTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  
  // 筛选条件
  const [statsType, setStatsType] = useState('overview');
  const [timeRange, setTimeRange] = useState('30d');
  const [includeSubDepts, setIncludeSubDepts] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [exportFormat, setExportFormat] = useState('excel');

  /**
   * 加载统计数据
   */
  const loadStatsData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        type: statsType,
        time_range: timeRange,
        include_sub_depts: includeSubDepts.toString()
      });
      
      if (departmentId) {
        params.append('department_id', departmentId);
      }

      const response = await fetch(`http://localhost:4000/api/department-stats/dashboard?${params}`);
      const result = await response.json();

      if (result.success) {
        if (statsType === 'overview') {
          setStatsData(result.data);
        } else if (statsType === 'personnel') {
          setPersonnelData(result.data.by_department || []);
          setTrendData(result.data.trend || []);
        } else if (statsType === 'budget') {
          setBudgetData(result.data);
        }
      } else {
        toast.error(result.error || '加载统计数据失败');
      }
    } catch (error) {
      console.error('加载统计数据失败:', error);
      toast.error('加载统计数据失败');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 加载报表模板
   */
  const loadReportTemplates = async () => {
    try {
      // 设置默认报表模板
      setReportTemplates([
        { id: '1', name: '部门人员统计报表', type: 'personnel', description: '部门人员统计', fields: ['department', 'personnel_count', 'active_count'] },
        { id: '2', name: '部门绩效分析报表', type: 'performance', description: '部门绩效分析', fields: ['department', 'performance_score', 'efficiency'] },
        { id: '3', name: '部门成本统计报表', type: 'costs', description: '部门成本统计', fields: ['department', 'total_cost', 'budget_usage'] },
        { id: '4', name: '跨部门对比分析报表', type: 'comparison', description: '跨部门对比分析', fields: ['department', 'comparison_metrics'] },
        { id: '5', name: '时间趋势分析报表', type: 'trends', description: '时间趋势分析', fields: ['date', 'trend_data'] }
      ]);
    } catch (error) {
      console.error('加载报表模板失败:', error);
    }
  };

  /**
   * 导出报表
   */
  const exportReport = async () => {
    if (!selectedTemplate) {
      toast.error('请选择报表模板');
      return;
    }

    setExporting(true);
    try {
      const template = reportTemplates.find(t => t.id === selectedTemplate);
      if (!template) {
        toast.error('报表模板不存在');
        return;
      }

      const requestBody = {
        report_type: template.type,
        format: exportFormat,
        department_ids: departmentId ? [departmentId] : [],
        time_range: timeRange,
        include_sub_depts: includeSubDepts,
        template_id: selectedTemplate
      };

      const response = await fetch('http://localhost:4000/api/department-stats/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      const result = await response.json();
      
      if (result.success) {
        toast.success(`报表导出成功: ${result.data.file_name}`);
      } else {
        toast.error('导出报表失败: ' + result.message);
      }
    } catch (error) {
      console.error('导出报表失败:', error);
      toast.error('导出报表失败');
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    loadStatsData();
  }, [statsType, timeRange, includeSubDepts, departmentId]);

  useEffect(() => {
    loadReportTemplates();
  }, []);

  /**
   * 渲染概览统计卡片
   */
  const renderOverviewCards = () => {
    if (!statsData) return null;

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总部门数</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statsData.departments.total}</div>
            <p className="text-xs text-muted-foreground">
              活跃: {statsData.departments.active} | 非活跃: {statsData.departments.inactive}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总人员数</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statsData.personnel.total}</div>
            <p className="text-xs text-muted-foreground">
              活跃率: {statsData.ratios.active_ratio}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">管理人员</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statsData.personnel.managers}</div>
            <p className="text-xs text-muted-foreground">
              管理比例: {statsData.ratios.manager_ratio}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">活跃人员</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statsData.personnel.active}</div>
            <p className="text-xs text-muted-foreground">
              非活跃: {statsData.personnel.inactive}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  };

  /**
   * 渲染人员统计图表
   */
  const renderPersonnelCharts = () => {
    if (personnelData.length === 0 && trendData.length === 0) return null;

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* 部门人员分布 */}
        {personnelData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>部门人员分布</CardTitle>
              <CardDescription>各部门人员数量统计</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={personnelData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="department_name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="total" fill="#8884d8" name="总人数" />
                  <Bar dataKey="active" fill="#82ca9d" name="活跃人数" />
                  <Bar dataKey="managers" fill="#ffc658" name="管理人员" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* 人员变化趋势 */}
        {trendData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>人员变化趋势</CardTitle>
              <CardDescription>人员加入和离职趋势</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="joined" stroke="#8884d8" name="加入" />
                  <Line type="monotone" dataKey="left" stroke="#82ca9d" name="离职" />
                  <Line type="monotone" dataKey="net_change" stroke="#ffc658" name="净变化" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  /**
   * 渲染预算统计图表
   */
  const renderBudgetCharts = () => {
    if (!budgetData) return null;

    const categoryData = Object.entries(budgetData.by_category || {}).map(([key, value]: [string, any]) => ({
      name: key,
      budget: value.budget,
      used: value.used,
      rate: value.rate
    }));

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* 预算使用情况 */}
        <Card>
          <CardHeader>
            <CardTitle>预算使用情况</CardTitle>
            <CardDescription>各类别预算执行情况</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="budget" fill="#8884d8" name="预算" />
                <Bar dataKey="used" fill="#82ca9d" name="已用" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 预算执行率 */}
        <Card>
          <CardHeader>
            <CardTitle>预算执行率</CardTitle>
            <CardDescription>各类别预算执行率分布</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, rate }) => `${name}: ${rate}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="rate"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 控制面板 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            部门统计与报表
          </CardTitle>
          <CardDescription>
            查看部门统计数据和生成各类报表
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 mb-4">
            {/* 统计类型选择 */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <Select value={statsType} onValueChange={setStatsType}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="统计类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="overview">概览统计</SelectItem>
                  <SelectItem value="personnel">人员统计</SelectItem>
                  <SelectItem value="performance">绩效统计</SelectItem>
                  <SelectItem value="budget">预算统计</SelectItem>
                  <SelectItem value="trend">趋势分析</SelectItem>
                  <SelectItem value="comparison">对比分析</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 时间范围选择 */}
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="时间范围" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">最近7天</SelectItem>
                  <SelectItem value="30d">最近30天</SelectItem>
                  <SelectItem value="90d">最近90天</SelectItem>
                  <SelectItem value="1y">最近1年</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 刷新按钮 */}
            <Button
              variant="outline"
              size="sm"
              onClick={loadStatsData}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              刷新
            </Button>
          </div>

          {/* 报表导出控制 */}
          <div className="flex flex-wrap gap-4 pt-4 border-t">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="选择报表模板" />
                </SelectTrigger>
                <SelectContent>
                  {reportTemplates.map(template => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Select value={exportFormat} onValueChange={setExportFormat}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="格式" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="excel">Excel</SelectItem>
                <SelectItem value="pdf">PDF</SelectItem>
                <SelectItem value="csv">CSV</SelectItem>
              </SelectContent>
            </Select>

            <Button
              onClick={exportReport}
              disabled={exporting || !selectedTemplate}
            >
              <Download className={`h-4 w-4 mr-2 ${exporting ? 'animate-spin' : ''}`} />
              {exporting ? '导出中...' : '导出报表'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 统计数据展示 */}
      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center h-64">
            <RefreshCw className="h-8 w-8 animate-spin" />
            <span className="ml-2">加载中...</span>
          </CardContent>
        </Card>
      ) : (
        <>
          {statsType === 'overview' && renderOverviewCards()}
          {statsType === 'personnel' && renderPersonnelCharts()}
          {statsType === 'budget' && renderBudgetCharts()}
        </>
      )}
    </div>
  );
}