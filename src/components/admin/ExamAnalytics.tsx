'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Cell
} from 'recharts';
import { 
  Users, 
  TrendingUp, 
  Clock, 
  Award, 
  Target, 
  BookOpen,
  Download,
  Calendar,
  BarChart3
} from 'lucide-react';
import { ExamService, type ExamStatistics } from '@/services/examService';
import { toast } from 'sonner';

interface ExamAnalyticsProps {
  examId: string;
}

interface AnalyticsData {
  statistics: ExamStatistics;
  scoreDistribution: Array<{ range: string; count: number }>;
  timeDistribution: Array<{ range: string; count: number }>;
  dailyAttempts: Array<{ date: string; attempts: number; passed: number }>;
  questionAnalysis: Array<{ 
    questionId: string; 
    title: string; 
    correctRate: number; 
    avgTime: number;
    difficulty: string;
  }>;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

/**
 * 考试统计分析组件
 * 提供考试的详细数据分析和可视化报表
 */
export default function ExamAnalytics({ examId }: ExamAnalyticsProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [timeRange, setTimeRange] = useState('30d');
  const [selectedTab, setSelectedTab] = useState('overview');

  /**
   * 加载分析数据
   */
  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      
      // 获取基础统计信息
      const statistics = await ExamService.getExamStatistics(examId);
      
      // 模拟其他分析数据（实际项目中应从API获取）
      const scoreDistribution = [
        { range: '0-20', count: 5 },
        { range: '21-40', count: 12 },
        { range: '41-60', count: 25 },
        { range: '61-80', count: 35 },
        { range: '81-100', count: 23 }
      ];
      
      const timeDistribution = [
        { range: '0-30min', count: 15 },
        { range: '31-60min', count: 45 },
        { range: '61-90min', count: 25 },
        { range: '91-120min', count: 10 },
        { range: '120min+', count: 5 }
      ];
      
      const dailyAttempts = Array.from({ length: 30 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        return {
          date: date.toISOString().split('T')[0],
          attempts: Math.floor(Math.random() * 20) + 5,
          passed: Math.floor(Math.random() * 15) + 2
        };
      }).reverse();
      
      const questionAnalysis = [
        { questionId: '1', title: '基础概念题', correctRate: 85, avgTime: 45, difficulty: '简单' },
        { questionId: '2', title: '实践应用题', correctRate: 72, avgTime: 120, difficulty: '中等' },
        { questionId: '3', title: '综合分析题', correctRate: 58, avgTime: 180, difficulty: '困难' },
        { questionId: '4', title: '计算题', correctRate: 65, avgTime: 90, difficulty: '中等' },
        { questionId: '5', title: '案例分析题', correctRate: 45, avgTime: 200, difficulty: '困难' }
      ];
      
      setData({
        statistics,
        scoreDistribution,
        timeDistribution,
        dailyAttempts,
        questionAnalysis
      });
    } catch (error) {
      console.error('加载分析数据失败:', error);
      toast.error('加载分析数据失败');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 导出报表
   */
  const exportReport = () => {
    if (!data) return;
    
    // 创建CSV内容
    const csvContent = [
      ['考试统计报表'],
      [''],
      ['基础统计'],
      ['总题目数', data.statistics.total_questions],
      ['注册人数', data.statistics.registrations_count],
      ['尝试次数', data.statistics.attempts_count],
      ['通过率', `${data.statistics.pass_rate}%`],
      ['平均分', data.statistics.average_score],
      ['平均耗时', `${data.statistics.average_duration}分钟`],
      [''],
      ['分数分布'],
      ['分数区间', '人数'],
      ...data.scoreDistribution.map(item => [item.range, item.count]),
      [''],
      ['题目分析'],
      ['题目', '正确率', '平均用时', '难度'],
      ...data.questionAnalysis.map(item => [
        item.title, 
        `${item.correctRate}%`, 
        `${item.avgTime}秒`, 
        item.difficulty
      ])
    ].map(row => row.join(',')).join('\n');
    
    // 下载文件
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `exam_analytics_${examId}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('报表导出成功');
  };

  useEffect(() => {
    loadAnalyticsData();
  }, [examId, timeRange]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">加载分析数据中...</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-8">
        <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">暂无分析数据</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 头部控制 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">最近7天</SelectItem>
              <SelectItem value="30d">最近30天</SelectItem>
              <SelectItem value="90d">最近90天</SelectItem>
              <SelectItem value="all">全部时间</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={exportReport} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          导出报表
        </Button>
      </div>

      {/* 概览卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总参与人数</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.statistics.registrations_count}</div>
            <p className="text-xs text-muted-foreground">
              尝试次数: {data.statistics.attempts_count}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">通过率</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.statistics.pass_rate}%</div>
            <Progress value={data.statistics.pass_rate} className="mt-2" />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">平均分</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.statistics.average_score}</div>
            <p className="text-xs text-muted-foreground">
              满分: 100
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">平均耗时</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.statistics.average_duration}min</div>
            <p className="text-xs text-muted-foreground">
              限时: 120分钟
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 详细分析 */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList>
          <TabsTrigger value="overview">总览</TabsTrigger>
          <TabsTrigger value="scores">分数分析</TabsTrigger>
          <TabsTrigger value="trends">趋势分析</TabsTrigger>
          <TabsTrigger value="questions">题目分析</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* 分数分布 */}
            <Card>
              <CardHeader>
                <CardTitle>分数分布</CardTitle>
                <CardDescription>考生分数区间分布情况</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.scoreDistribution}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="range" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            
            {/* 用时分布 */}
            <Card>
              <CardHeader>
                <CardTitle>用时分布</CardTitle>
                <CardDescription>考生答题时间分布情况</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={data.timeDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ range, percent }) => `${range} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {data.timeDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="scores" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>分数详细分析</CardTitle>
              <CardDescription>各分数段的详细统计信息</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.scoreDistribution.map((item, index) => {
                  const percentage = (item.count / data.statistics.attempts_count * 100).toFixed(1);
                  return (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-4 h-4 rounded" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                        <span className="font-medium">{item.range}分</span>
                      </div>
                      <div className="flex items-center space-x-4">
                        <span className="text-sm text-gray-600">{item.count}人</span>
                        <Badge variant="secondary">{percentage}%</Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>参与趋势</CardTitle>
              <CardDescription>每日考试参与和通过情况</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={data.dailyAttempts}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="attempts" stroke="#8884d8" name="尝试次数" />
                  <Line type="monotone" dataKey="passed" stroke="#82ca9d" name="通过次数" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="questions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>题目分析</CardTitle>
              <CardDescription>各题目的正确率和难度分析</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.questionAnalysis.map((question, index) => (
                  <div key={question.questionId} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{question.title}</h4>
                      <Badge variant={question.correctRate >= 80 ? 'default' : question.correctRate >= 60 ? 'secondary' : 'destructive'}>
                        {question.difficulty}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">正确率: </span>
                        <span className="font-medium">{question.correctRate}%</span>
                        <Progress value={question.correctRate} className="mt-1" />
                      </div>
                      <div>
                        <span className="text-gray-600">平均用时: </span>
                        <span className="font-medium">{question.avgTime}秒</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}