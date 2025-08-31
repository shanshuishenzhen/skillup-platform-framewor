/**
 * 考试结果统计组件
 * 显示考试的通过率、平均分等统计信息
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Award, 
  Target, 
  TrendingUp, 
  Download,
  RefreshCw,
  BarChart3,
  PieChart,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

interface ExamResultsStatsProps {
  examId: string;
  examTitle: string;
  onExport?: (format: 'excel' | 'csv' | 'json') => void;
}

interface ExamStats {
  totalCandidates: number;
  completedCount: number;
  absentCount: number;
  passedCount: number;
  failedCount: number;
  passRate: number;
  averageScore: number;
  averageDuration: number;
  scoreDistribution: {
    range: string;
    count: number;
    percentage: number;
  }[];
  topScores: {
    name: string;
    score: number;
    duration: number;
  }[];
}

export default function ExamResultsStats({ examId, examTitle, onExport }: ExamResultsStatsProps) {
  const [stats, setStats] = useState<ExamStats | null>(null);
  const [loading, setLoading] = useState(false);

  // 模拟数据
  const mockStats: ExamStats = {
    totalCandidates: 150,
    completedCount: 142,
    absentCount: 8,
    passedCount: 101,
    failedCount: 41,
    passRate: 71.1,
    averageScore: 68.5,
    averageDuration: 85,
    scoreDistribution: [
      { range: '90-100', count: 25, percentage: 17.6 },
      { range: '80-89', count: 35, percentage: 24.6 },
      { range: '70-79', count: 28, percentage: 19.7 },
      { range: '60-69', count: 13, percentage: 9.2 },
      { range: '50-59', count: 22, percentage: 15.5 },
      { range: '0-49', count: 19, percentage: 13.4 }
    ],
    topScores: [
      { name: '张三', score: 98, duration: 75 },
      { name: '李四', score: 95, duration: 82 },
      { name: '王五', score: 93, duration: 68 },
      { name: '赵六', score: 91, duration: 90 },
      { name: '钱七', score: 89, duration: 78 }
    ]
  };

  const fetchStats = async () => {
    try {
      setLoading(true);
      // TODO: 实际API调用
      // const response = await fetch(`/api/admin/exams/${examId}/stats`);
      // const result = await response.json();
      
      // 模拟延迟
      await new Promise(resolve => setTimeout(resolve, 1000));
      setStats(mockStats);
    } catch (error) {
      console.error('获取考试统计失败:', error);
      toast.error('获取考试统计失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [examId]);

  const handleExport = (format: 'excel' | 'csv' | 'json') => {
    if (onExport) {
      onExport(format);
    } else {
      toast.info(`导出${format.toUpperCase()}格式`);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-600">加载统计数据中...</span>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">暂无统计数据</p>
          <Button onClick={fetchStats} className="mt-4">
            <RefreshCw className="w-4 h-4 mr-2" />
            重新加载
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* 标题和操作 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{examTitle}</h2>
          <p className="text-gray-600">考试结果统计</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={() => handleExport('excel')}>
            <Download className="w-4 h-4 mr-2" />
            导出Excel
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport('csv')}>
            <Download className="w-4 h-4 mr-2" />
            导出CSV
          </Button>
          <Button variant="outline" size="sm" onClick={fetchStats}>
            <RefreshCw className="w-4 h-4 mr-2" />
            刷新
          </Button>
        </div>
      </div>

      {/* 核心统计指标 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">总报名人数</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalCandidates}</p>
                <p className="text-xs text-gray-500">实际参考: {stats.completedCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Target className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">通过率</p>
                <p className="text-2xl font-bold text-green-600">{stats.passRate}%</p>
                <p className="text-xs text-gray-500">{stats.passedCount}/{stats.completedCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <BarChart3 className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">平均分</p>
                <p className="text-2xl font-bold text-gray-900">{stats.averageScore}</p>
                <p className="text-xs text-gray-500">满分100分</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">平均用时</p>
                <p className="text-2xl font-bold text-gray-900">{stats.averageDuration}分</p>
                <p className="text-xs text-gray-500">考试时长120分</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 详细统计 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 分数分布 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <PieChart className="w-5 h-5 mr-2" />
              分数分布
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.scoreDistribution.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-blue-500 mr-3"></div>
                    <span className="text-sm font-medium">{item.range}分</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">{item.count}人</span>
                    <Badge variant="secondary">{item.percentage}%</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 成绩排行 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Award className="w-5 h-5 mr-2" />
              成绩排行榜
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.topScores.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white mr-3 ${
                      index === 0 ? 'bg-yellow-500' : 
                      index === 1 ? 'bg-gray-400' : 
                      index === 2 ? 'bg-orange-500' : 'bg-gray-300'
                    }`}>
                      {index + 1}
                    </div>
                    <span className="font-medium">{item.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-green-600">{item.score}分</div>
                    <div className="text-xs text-gray-500">{item.duration}分钟</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 状态统计 */}
      <Card>
        <CardHeader>
          <CardTitle>考试状态统计</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center p-4 bg-green-50 rounded-lg">
              <CheckCircle className="w-8 h-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">通过</p>
                <p className="text-xl font-bold text-green-600">{stats.passedCount}人</p>
              </div>
            </div>
            
            <div className="flex items-center p-4 bg-red-50 rounded-lg">
              <XCircle className="w-8 h-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">未通过</p>
                <p className="text-xl font-bold text-red-600">{stats.failedCount}人</p>
              </div>
            </div>
            
            <div className="flex items-center p-4 bg-gray-50 rounded-lg">
              <AlertCircle className="w-8 h-8 text-gray-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">缺考</p>
                <p className="text-xl font-bold text-gray-600">{stats.absentCount}人</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
