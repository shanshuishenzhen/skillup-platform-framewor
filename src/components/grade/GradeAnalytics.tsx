/**
 * 成绩统计分析组件
 * 
 * 提供成绩数据的可视化分析，包括：
 * - 分数分布图表
 * - 通过率统计
 * - 等级分布饼图
 * - 时间趋势分析
 * - 考试难度分析
 * 
 * @author SOLO Coding
 * @version 1.0.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Users,
  Award,
  Target,
  Clock,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  Calendar
} from 'lucide-react';

import {
  GradeStats,
  ExamAnalysis,
  GradeLevel,
  StatsPeriod,
  ScoreDistribution
} from '@/types/grade';
import { gradeService } from '@/services/gradeService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

/**
 * 等级颜色配置
 */
const GRADE_LEVEL_COLORS = {
  [GradeLevel.EXCELLENT]: '#10B981', // green-500
  [GradeLevel.GOOD]: '#3B82F6',      // blue-500
  [GradeLevel.AVERAGE]: '#F59E0B',   // amber-500
  [GradeLevel.PASS]: '#F97316',      // orange-500
  [GradeLevel.FAIL]: '#EF4444'       // red-500
};

/**
 * 分数范围颜色
 */
const SCORE_RANGE_COLORS = [
  '#10B981', // 90-100
  '#3B82F6', // 80-89
  '#F59E0B', // 70-79
  '#F97316', // 60-69
  '#EF4444'  // 0-59
];

/**
 * 组件属性接口
 */
interface GradeAnalyticsProps {
  examId?: string;
  className?: string;
}

/**
 * 成绩统计分析组件
 */
export default function GradeAnalytics({ examId, className = '' }: GradeAnalyticsProps) {
  // 状态管理
  const [stats, setStats] = useState<GradeStats | null>(null);
  const [analysis, setAnalysis] = useState<ExamAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<StatsPeriod>(StatsPeriod.THIS_MONTH);
  const [activeTab, setActiveTab] = useState<'overview' | 'distribution' | 'trends' | 'analysis'>('overview');

  /**
   * 加载统计数据
   */
  const loadStats = async () => {
    try {
      setLoading(true);
      const statsData = await gradeService.getGradeStats(examId, period);
      setStats(statsData);
      
      if (examId) {
        const analysisData = await gradeService.getExamAnalysis(examId);
        setAnalysis(analysisData);
      }
    } catch (error) {
      console.error('加载统计数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 初始化加载
  useEffect(() => {
    loadStats();
  }, [examId, period]);

  /**
   * 处理时间范围变更
   */
  const handlePeriodChange = (newPeriod: StatsPeriod) => {
    setPeriod(newPeriod);
  };

  /**
   * 格式化百分比
   */
  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  /**
   * 准备分数分布数据
   */
  const scoreDistributionData = useMemo(() => {
    if (!stats?.score_distribution) return [];
    
    return stats.score_distribution.map((item, index) => ({
      range: item.range,
      count: item.count,
      percentage: item.percentage,
      fill: SCORE_RANGE_COLORS[index]
    }));
  }, [stats]);

  /**
   * 准备等级分布数据
   */
  const gradeLevelData = useMemo(() => {
    if (!stats?.grade_distribution) return [];
    
    return Object.entries(stats.grade_distribution).map(([level, count]) => ({
      name: level,
      value: count,
      fill: GRADE_LEVEL_COLORS[level as GradeLevel],
      label: {
        [GradeLevel.EXCELLENT]: '优秀',
        [GradeLevel.GOOD]: '良好',
        [GradeLevel.AVERAGE]: '中等',
        [GradeLevel.PASS]: '及格',
        [GradeLevel.FAIL]: '不及格'
      }[level as GradeLevel]
    })).filter(item => item.value > 0);
  }, [stats]);

  /**
   * 渲染加载状态
   */
  const renderLoading = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {[...Array(8)].map((_, index) => (
        <Card key={index}>
          <CardContent className="p-6">
            <Skeleton className="h-4 w-20 mb-2" />
            <Skeleton className="h-8 w-16 mb-4" />
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );

  /**
   * 渲染概览统计
   */
  const renderOverview = () => {
    if (!stats) return null;

    const metrics = [
      {
        title: '总参与人数',
        value: stats.total_participants,
        icon: Users,
        color: 'text-blue-600',
        bgColor: 'bg-blue-100'
      },
      {
        title: '通过人数',
        value: stats.passed_count,
        icon: Award,
        color: 'text-green-600',
        bgColor: 'bg-green-100'
      },
      {
        title: '通过率',
        value: formatPercentage(stats.pass_rate),
        icon: Target,
        color: 'text-purple-600',
        bgColor: 'bg-purple-100'
      },
      {
        title: '平均分',
        value: stats.average_score.toFixed(1),
        icon: BarChart3,
        color: 'text-orange-600',
        bgColor: 'bg-orange-100'
      }
    ];

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {metrics.map((metric, index) => {
          const Icon = metric.icon;
          return (
            <Card key={index}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{metric.title}</p>
                    <p className="text-2xl font-bold mt-1">{metric.value}</p>
                  </div>
                  <div className={`p-3 rounded-full ${metric.bgColor}`}>
                    <Icon className={`h-6 w-6 ${metric.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  /**
   * 渲染分数分布图表
   */
  const renderScoreDistribution = () => {
    if (!scoreDistributionData.length) return null;

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 分数分布柱状图 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="mr-2 h-5 w-5" />
              分数分布
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={scoreDistributionData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="range" />
                <YAxis />
                <Tooltip 
                  formatter={(value, name) => [
                    name === 'count' ? `${value}人` : formatPercentage(value as number),
                    name === 'count' ? '人数' : '占比'
                  ]}
                />
                <Legend />
                <Bar dataKey="count" name="人数" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 等级分布饼图 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <PieChartIcon className="mr-2 h-5 w-5" />
              等级分布
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={gradeLevelData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value, percentage }) => 
                    `${gradeLevelData.find(item => item.name === name)?.label}: ${value}人 (${(percentage || 0).toFixed(1)}%)`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {gradeLevelData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value, name) => [`${value}人`, gradeLevelData.find(item => item.name === name)?.label]}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    );
  };

  /**
   * 渲染详细统计信息
   */
  const renderDetailedStats = () => {
    if (!stats) return null;

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* 分数统计 */}
        <Card>
          <CardHeader>
            <CardTitle>分数统计</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">最高分</span>
              <span className="font-semibold text-green-600">{stats.highest_score}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">最低分</span>
              <span className="font-semibold text-red-600">{stats.lowest_score}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">平均分</span>
              <span className="font-semibold">{stats.average_score.toFixed(1)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">中位数</span>
              <span className="font-semibold">{stats.median_score.toFixed(1)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">标准差</span>
              <span className="font-semibold">{stats.standard_deviation.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>

        {/* 通过率分析 */}
        <Card>
          <CardHeader>
            <CardTitle>通过率分析</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">总体通过率</span>
                <span className="font-semibold">{formatPercentage(stats.pass_rate)}</span>
              </div>
              <Progress value={stats.pass_rate} className="h-2" />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">通过人数</span>
                <span className="font-semibold text-green-600">{stats.passed_count}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">未通过人数</span>
                <span className="font-semibold text-red-600">{stats.total_participants - stats.passed_count}</span>
              </div>
            </div>

            <div className="pt-2">
              {stats.pass_rate >= 80 ? (
                <Badge className="bg-green-100 text-green-800">
                  <TrendingUp className="mr-1 h-3 w-3" />
                  通过率良好
                </Badge>
              ) : stats.pass_rate >= 60 ? (
                <Badge className="bg-yellow-100 text-yellow-800">
                  <Activity className="mr-1 h-3 w-3" />
                  通过率一般
                </Badge>
              ) : (
                <Badge className="bg-red-100 text-red-800">
                  <TrendingDown className="mr-1 h-3 w-3" />
                  通过率偏低
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 等级分布详情 */}
        <Card>
          <CardHeader>
            <CardTitle>等级分布详情</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(stats.grade_distribution).map(([level, count]) => {
              const levelConfig = {
                [GradeLevel.EXCELLENT]: { label: '优秀', color: 'text-green-600' },
                [GradeLevel.GOOD]: { label: '良好', color: 'text-blue-600' },
                [GradeLevel.AVERAGE]: { label: '中等', color: 'text-yellow-600' },
                [GradeLevel.PASS]: { label: '及格', color: 'text-orange-600' },
                [GradeLevel.FAIL]: { label: '不及格', color: 'text-red-600' }
              }[level as GradeLevel];
              
              const percentage = stats.total_participants > 0 
                ? (count / stats.total_participants) * 100 
                : 0;

              return (
                <div key={level} className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">{levelConfig.label}</span>
                    <span className={`font-semibold ${levelConfig.color}`}>
                      {count}人 ({formatPercentage(percentage)})
                    </span>
                  </div>
                  <Progress value={percentage} className="h-1" />
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    );
  };

  /**
   * 渲染时间分析
   */
  const renderTimeAnalysis = () => {
    if (!analysis?.time_analysis) return null;

    const timeAnalysis = analysis.time_analysis;

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="mr-2 h-5 w-5" />
              答题时间统计
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">平均用时</span>
              <span className="font-semibold">
                {Math.floor(timeAnalysis.average_time / 60)}分{timeAnalysis.average_time % 60}秒
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">最短用时</span>
              <span className="font-semibold text-green-600">
                {Math.floor(timeAnalysis.min_time / 60)}分{timeAnalysis.min_time % 60}秒
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">最长用时</span>
              <span className="font-semibold text-red-600">
                {Math.floor(timeAnalysis.max_time / 60)}分{timeAnalysis.max_time % 60}秒
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">时间-成绩相关性</span>
              <span className="font-semibold">
                {timeAnalysis.time_score_correlation.toFixed(3)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>时间分析说明</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm text-gray-600">
              <p>• 平均用时反映考试难度和学员整体水平</p>
              <p>• 时间分布可以识别异常答题行为</p>
              <p>• 时间-成绩相关性帮助分析考试设计合理性</p>
            </div>
            
            {timeAnalysis.time_score_correlation > 0.3 && (
              <Badge className="bg-blue-100 text-blue-800">
                时间与成绩呈正相关
              </Badge>
            )}
            {timeAnalysis.time_score_correlation < -0.3 && (
              <Badge className="bg-orange-100 text-orange-800">
                时间与成绩呈负相关
              </Badge>
            )}
            {Math.abs(timeAnalysis.time_score_correlation) <= 0.3 && (
              <Badge className="bg-gray-100 text-gray-800">
                时间与成绩无明显相关性
              </Badge>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  if (loading) {
    return <div className={className}>{renderLoading()}</div>;
  }

  if (!stats) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <p className="text-gray-500">暂无统计数据</p>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* 控制栏 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Button
            variant={activeTab === 'overview' ? 'default' : 'outline'}
            onClick={() => setActiveTab('overview')}
          >
            概览
          </Button>
          <Button
            variant={activeTab === 'distribution' ? 'default' : 'outline'}
            onClick={() => setActiveTab('distribution')}
          >
            分布分析
          </Button>
          {analysis && (
            <Button
              variant={activeTab === 'analysis' ? 'default' : 'outline'}
              onClick={() => setActiveTab('analysis')}
            >
              深度分析
            </Button>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <Calendar className="h-4 w-4 text-gray-500" />
          <Select value={period} onValueChange={handlePeriodChange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={StatsPeriod.TODAY}>今天</SelectItem>
              <SelectItem value={StatsPeriod.THIS_WEEK}>本周</SelectItem>
              <SelectItem value={StatsPeriod.THIS_MONTH}>本月</SelectItem>
              <SelectItem value={StatsPeriod.THIS_QUARTER}>本季度</SelectItem>
              <SelectItem value={StatsPeriod.THIS_YEAR}>今年</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="space-y-6">
        {activeTab === 'overview' && (
          <>
            {renderOverview()}
            {renderDetailedStats()}
          </>
        )}
        
        {activeTab === 'distribution' && (
          <>
            {renderOverview()}
            {renderScoreDistribution()}
          </>
        )}
        
        {activeTab === 'analysis' && analysis && (
          <>
            {renderOverview()}
            {renderTimeAnalysis()}
          </>
        )}
      </div>
    </div>
  );
}