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
import { Progress } from '@/components/ui/progress';
import {
  AreaChart,
  Area,
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
  RadialBarChart,
  RadialBar
} from 'recharts';
import {
  Users,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Building2,
  Target,
  Award,
  AlertTriangle,
  CheckCircle,
  Clock,
  Activity,
  Zap,
  BarChart3,
  RefreshCw,
  Calendar,
  Filter
} from 'lucide-react';
import { toast } from 'sonner';

/**
 * 管理驾驶舱组件
 * 提供综合的数据看板和实时监控功能
 */

interface DashboardProps {
  className?: string;
}

interface KPIData {
  title: string;
  value: string | number;
  change: number;
  trend: 'up' | 'down' | 'stable';
  icon: React.ReactNode;
  color: string;
}

interface AlertData {
  id: string;
  type: 'warning' | 'error' | 'info';
  title: string;
  message: string;
  timestamp: string;
  department?: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82ca9d'];

export default function ManagementDashboard({ className }: DashboardProps) {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [kpiData, setKpiData] = useState<KPIData[]>([]);
  const [alerts, setAlerts] = useState<AlertData[]>([]);
  const [loading, setLoading] = useState(false);
  const [timeRange, setTimeRange] = useState('30d');
  const [refreshInterval, setRefreshInterval] = useState(300000); // 5分钟
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  /**
   * 加载仪表板数据
   */
  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:4000/api/department-stats/dashboard');
      const result = await response.json();
      
      if (result.success) {
        const data = result.data;
        setDashboardData({
          overview: data.overview,
          performanceTrends: data.performance_trends || [],
          departmentComparison: data.department_ranking || [],
          alerts: data.alerts || []
        });
        generateKPIData(data);
        generateAlerts(data);
        setLastUpdated(new Date());
      } else {
        console.error('获取仪表板数据失败:', result.message);
        toast.error('加载仪表板数据失败');
      }
    } catch (error) {
      console.error('加载仪表板数据失败:', error);
      toast.error('加载仪表板数据失败');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 生成KPI数据
   */
  const generateKPIData = (data: any) => {
    const kpis: KPIData[] = [
      {
        title: '总部门数',
        value: data.overview?.total_departments || 0,
        change: 5.2,
        trend: 'up',
        icon: <Building2 className="h-4 w-4" />,
        color: 'text-blue-600'
      },
      {
        title: '总员工数',
        value: data.overview?.total_personnel || 0,
        change: 3.8,
        trend: 'up',
        icon: <Users className="h-4 w-4" />,
        color: 'text-green-600'
      },
      {
        title: '平均绩效分',
        value: data.overview?.avg_performance || 0,
        change: -1.2,
        trend: 'down',
        icon: <Award className="h-4 w-4" />,
        color: 'text-yellow-600'
      },
      {
        title: '预算执行率',
        value: `${data.overview?.cost_efficiency || 0}%`,
        change: 2.5,
        trend: 'up',
        icon: <DollarSign className="h-4 w-4" />,
        color: 'text-purple-600'
      },
      {
        title: '活跃员工率',
        value: `${data.overview?.personnel_utilization || 0}%`,
        change: 1.8,
        trend: 'up',
        icon: <Activity className="h-4 w-4" />,
        color: 'text-indigo-600'
      },
      {
        title: '管理层比例',
        value: `${data.overview?.monthly_growth || 0}%`,
        change: 0.5,
        trend: 'stable',
        icon: <Target className="h-4 w-4" />,
        color: 'text-red-600'
      }
    ];
    
    setKpiData(kpis);
  };

  /**
   * 生成告警数据
   */
  const generateAlerts = (data: any) => {
    const alertList: AlertData[] = [];
    
    // 检查预算使用率
    if (data.overview?.cost_efficiency > 90) {
      alertList.push({
        id: 'budget_high',
        type: 'warning',
        title: '预算使用率过高',
        message: `当前预算使用率已达到${data.overview.cost_efficiency}%，请注意控制支出`,
        timestamp: new Date().toISOString(),
        department: '财务部'
      });
    }
    
    // 检查员工活跃率
    if (parseFloat(data.overview?.personnel_utilization || '0') < 80) {
      alertList.push({
        id: 'active_low',
        type: 'error',
        title: '员工活跃率偏低',
        message: `员工活跃率仅为${data.overview.personnel_utilization}%，需要关注员工状态`,
        timestamp: new Date().toISOString(),
        department: '人事部'
      });
    }
    
    // 检查绩效分数
    if (data.overview?.avg_performance < 80) {
      alertList.push({
        id: 'performance_low',
        type: 'warning',
        title: '平均绩效偏低',
        message: `平均绩效分数为${data.overview.avg_performance}，建议加强培训和激励`,
        timestamp: new Date().toISOString(),
        department: '人事部'
      });
    }
    
    setAlerts(alertList);
  };

  /**
   * 自动刷新数据
   */
  useEffect(() => {
    loadDashboardData();
    
    const interval = setInterval(() => {
      loadDashboardData();
    }, refreshInterval);
    
    return () => clearInterval(interval);
  }, [timeRange, refreshInterval]);

  /**
   * 渲染KPI卡片
   */
  const renderKPICards = () => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        {kpiData.map((kpi, index) => (
          <Card key={index} className="relative overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className={`p-2 rounded-lg bg-gray-100 ${kpi.color}`}>
                  {kpi.icon}
                </div>
                <div className="flex items-center text-sm">
                  {kpi.trend === 'up' && <TrendingUp className="h-3 w-3 text-green-500 mr-1" />}
                  {kpi.trend === 'down' && <TrendingDown className="h-3 w-3 text-red-500 mr-1" />}
                  <span className={`${
                    kpi.trend === 'up' ? 'text-green-500' : 
                    kpi.trend === 'down' ? 'text-red-500' : 'text-gray-500'
                  }`}>
                    {kpi.change > 0 ? '+' : ''}{kpi.change}%
                  </span>
                </div>
              </div>
              <div className="mt-2">
                <div className="text-2xl font-bold">{kpi.value}</div>
                <div className="text-sm text-muted-foreground">{kpi.title}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  /**
   * 渲染趋势图表
   */
  const renderTrendCharts = () => {
    if (!dashboardData) return null;

    // 模拟趋势数据
    const trendData = [
      { month: '1月', personnel: 120, performance: 85, budget: 75 },
      { month: '2月', personnel: 125, performance: 87, budget: 78 },
      { month: '3月', personnel: 130, performance: 86, budget: 82 },
      { month: '4月', personnel: 128, performance: 88, budget: 85 },
      { month: '5月', personnel: 135, performance: 89, budget: 88 },
      { month: '6月', personnel: 140, performance: 90, budget: 90 }
    ];

    const departmentData = dashboardData.departmentComparison?.map(dept => ({
      name: dept.department_name,
      personnel: dept.personnel_count,
      performance: dept.avg_performance,
      efficiency: dept.total_cost / 10000
    })) || [
      { name: '技术部', personnel: 45, performance: 92, efficiency: 88 },
      { name: '产品部', personnel: 32, performance: 89, efficiency: 85 },
      { name: '运营部', personnel: 28, performance: 86, efficiency: 82 },
      { name: '市场部', personnel: 25, performance: 87, efficiency: 84 },
      { name: '人事部', personnel: 15, performance: 91, efficiency: 89 }
    ];

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* 关键指标趋势 */}
        <Card>
          <CardHeader>
            <CardTitle>关键指标趋势</CardTitle>
            <CardDescription>人员、绩效、预算执行趋势</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="personnel" stackId="1" stroke="#8884d8" fill="#8884d8" name="人员数" />
                <Area type="monotone" dataKey="performance" stackId="2" stroke="#82ca9d" fill="#82ca9d" name="绩效分" />
                <Area type="monotone" dataKey="budget" stackId="3" stroke="#ffc658" fill="#ffc658" name="预算执行率" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 部门效率对比 */}
        <Card>
          <CardHeader>
            <CardTitle>部门效率对比</CardTitle>
            <CardDescription>各部门人员规模与效率对比</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={departmentData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="personnel" fill="#8884d8" name="人员数" />
                <Bar dataKey="efficiency" fill="#82ca9d" name="效率分" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    );
  };

  /**
   * 渲染实时监控面板
   */
  const renderMonitoringPanel = () => {
    const systemHealth = {
      cpu: 65,
      memory: 78,
      storage: 45,
      network: 92
    };

    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* 系统健康状态 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              系统健康状态
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>CPU使用率</span>
                <span>{systemHealth.cpu}%</span>
              </div>
              <Progress value={systemHealth.cpu} className="h-2" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>内存使用率</span>
                <span>{systemHealth.memory}%</span>
              </div>
              <Progress value={systemHealth.memory} className="h-2" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>存储使用率</span>
                <span>{systemHealth.storage}%</span>
              </div>
              <Progress value={systemHealth.storage} className="h-2" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>网络状态</span>
                <span>{systemHealth.network}%</span>
              </div>
              <Progress value={systemHealth.network} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* 实时告警 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              实时告警
              {alerts.length > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {alerts.length}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {alerts.length === 0 ? (
                <div className="flex items-center justify-center text-muted-foreground py-8">
                  <CheckCircle className="h-8 w-8 mr-2" />
                  <span>暂无告警</span>
                </div>
              ) : (
                alerts.map(alert => (
                  <div key={alert.id} className="flex items-start gap-3 p-3 rounded-lg border">
                    <div className={`p-1 rounded ${
                      alert.type === 'error' ? 'bg-red-100 text-red-600' :
                      alert.type === 'warning' ? 'bg-yellow-100 text-yellow-600' :
                      'bg-blue-100 text-blue-600'
                    }`}>
                      <AlertTriangle className="h-3 w-3" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{alert.title}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {alert.message}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {alert.department} • {new Date(alert.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* 快速操作 */}
        <Card>
          <CardHeader>
            <CardTitle>快速操作</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full justify-start" variant="outline">
              <Users className="h-4 w-4 mr-2" />
              人员管理
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <Building2 className="h-4 w-4 mr-2" />
              部门管理
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <BarChart3 className="h-4 w-4 mr-2" />
              生成报表
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <Award className="h-4 w-4 mr-2" />
              绩效评估
            </Button>
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
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              管理驾驶舱
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              最后更新: {lastUpdated.toLocaleTimeString()}
            </div>
          </CardTitle>
          <CardDescription>
            实时监控组织运营状况和关键指标
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
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

            {/* 刷新间隔选择 */}
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              <Select value={refreshInterval.toString()} onValueChange={(value) => setRefreshInterval(parseInt(value))}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="刷新间隔" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="60000">1分钟</SelectItem>
                  <SelectItem value="300000">5分钟</SelectItem>
                  <SelectItem value="600000">10分钟</SelectItem>
                  <SelectItem value="1800000">30分钟</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 手动刷新按钮 */}
            <Button
              variant="outline"
              size="sm"
              onClick={loadDashboardData}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              刷新
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 数据展示 */}
      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center h-64">
            <RefreshCw className="h-8 w-8 animate-spin" />
            <span className="ml-2">加载中...</span>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* KPI指标卡片 */}
          {renderKPICards()}
          
          {/* 趋势图表 */}
          {renderTrendCharts()}
          
          {/* 实时监控面板 */}
          {renderMonitoringPanel()}
        </>
      )}
    </div>
  );
}