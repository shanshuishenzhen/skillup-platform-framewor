/**
 * 考试统计分析页面
 * 
 * 提供考试数据的全面统计分析，包括：
 * - 考试概览统计
 * - 成绩分布分析
 * - 学员表现分析
 * - 题目难度分析
 * - 时间趋势分析
 * - 对比分析
 * 
 * @author SOLO Coding
 * @version 1.0.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import { useSearchParams } from 'next/navigation';
import {
  BarChart3,
  TrendingUp,
  Users,
  Clock,
  Target,
  Award,
  FileText,
  Download,
  Filter,
  RefreshCw,
  Calendar,
  ChevronLeft,
  Settings,
  Eye,
  Share2
} from 'lucide-react';

import {
  ExamAnalysis,
  GradeStats,
  StatsPeriod,
  GradeQueryParams
} from '@/types/grade';
import { Exam } from '@/types/exam';
import { gradeService } from '@/services/gradeService';
import { examService } from '@/services/examService';
import GradeAnalytics from '@/components/grade/GradeAnalytics';
import GradeExport from '@/components/grade/GradeExport';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

/**
 * 分析视图类型
 */
type AnalysisView = 'overview' | 'performance' | 'questions' | 'trends' | 'compare';

/**
 * 考试统计分析页面
 */
export default function ExamAnalytics() {
  const router = useRouter();
  const { examId } = router.query;
  const searchParams = useSearchParams();
  
  // 辅助函数：更新URL参数
  const updateSearchParams = (key: string, value: string) => {
    if (!searchParams) return;
    const current = new URLSearchParams(Array.from(searchParams.entries()));
    current.set(key, value);
    const search = current.toString();
    const query = search ? `?${search}` : '';
    router.push(`${router.pathname}${query}`, undefined, { shallow: true });
  };
  
  // 状态管理
  const [exam, setExam] = useState<Exam | null>(null);
  const [stats, setStats] = useState<GradeStats | null>(null);
  const [analysis, setAnalysis] = useState<ExamAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeView, setActiveView] = useState<AnalysisView>(
    (searchParams?.get('view') as AnalysisView) || 'overview'
  );
  const [period, setPeriod] = useState<StatsPeriod>(
    (searchParams?.get('period') as StatsPeriod) || StatsPeriod.THIS_MONTH
  );
  const [compareExamId, setCompareExamId] = useState<string>('');
  const [compareExams, setCompareExams] = useState<Exam[]>([]);

  /**
   * 加载考试信息
   */
  const loadExam = async () => {
    if (!examId || typeof examId !== 'string') return;
    
    try {
      const examData = await examService.getExamById(examId);
      setExam(examData);
    } catch (error) {
      console.error('加载考试信息失败:', error);
      toast.error('加载考试信息失败');
    }
  };

  /**
   * 加载统计数据
   */
  const loadAnalyticsData = async (showLoading = true) => {
    if (!examId || typeof examId !== 'string') return;
    
    try {
      if (showLoading) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      
      const [statsData, analysisData] = await Promise.all([
        gradeService.getGradeStats(examId, period),
        gradeService.getExamAnalysis(examId)
      ]);
      
      setStats(statsData);
      setAnalysis(analysisData);
    } catch (error) {
      console.error('加载统计数据失败:', error);
      toast.error('加载统计数据失败');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  /**
   * 加载可比较的考试列表
   */
  const loadCompareExams = async () => {
    try {
      const response = await examService.getExams({ 
        page: 1, 
        limit: 50,
        status: 'published'
      });
      if (response?.data && Array.isArray(response.data)) {
        setCompareExams(response.data.filter(e => e.id !== examId));
      }
    } catch (error) {
      console.error('加载考试列表失败:', error);
    }
  };

  // 初始化加载
  useEffect(() => {
    loadExam();
    loadAnalyticsData();
    loadCompareExams();
  }, [examId]);

  // 监听时间范围变化
  useEffect(() => {
    if (examId) {
      loadAnalyticsData(false);
    }
  }, [period]);

  /**
   * 处理视图切换
   */
  const handleViewChange = (view: AnalysisView) => {
    setActiveView(view);
    updateSearchParams('view', view);
  };

  /**
   * 处理时间范围变更
   */
  const handlePeriodChange = (newPeriod: StatsPeriod) => {
    setPeriod(newPeriod);
    updateSearchParams('period', newPeriod);
  };

  /**
   * 刷新数据
   */
  const handleRefresh = () => {
    loadAnalyticsData(false);
  };

  /**
   * 导出报告
   */
  const handleExportReport = async () => {
    try {
      const reportData = await gradeService.generateReport({
        exam_id: examId!,
        include_charts: true,
        include_analysis: true,
        format: 'pdf'
      });
      
      // 下载报告
      const link = document.createElement('a');
      link.href = reportData.download_url;
      link.download = reportData.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('报告导出成功');
    } catch (error) {
      console.error('导出报告失败:', error);
      toast.error('导出报告失败');
    }
  };

  /**
   * 渲染页面头部
   */
  const renderHeader = () => (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center space-x-4">
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => window.history.back()}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          返回
        </Button>
        
        <div>
          <h1 className="text-2xl font-bold">
            {exam?.title || '考试统计分析'}
          </h1>
          <p className="text-gray-600 mt-1">
            全面分析考试数据，了解学员表现和考试效果
          </p>
        </div>
      </div>
      
      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <RefreshCw className={cn('h-4 w-4 mr-1', refreshing && 'animate-spin')} />
          刷新
        </Button>
        
        {examId && typeof examId === 'string' && (
          <GradeExport 
            examId={examId}
            examTitle={exam?.title || ''}
            grades={[]}
          />
        )}
        
        <Button
          variant="outline"
          size="sm"
          onClick={handleExportReport}
        >
          <FileText className="h-4 w-4 mr-1" />
          导出报告
        </Button>
      </div>
    </div>
  );

  /**
   * 渲染导航标签
   */
  const renderNavTabs = () => {
    const tabs = [
      { key: 'overview', label: '概览', icon: BarChart3 },
      { key: 'performance', label: '表现分析', icon: TrendingUp },
      { key: 'questions', label: '题目分析', icon: Target },
      { key: 'trends', label: '趋势分析', icon: Calendar },
      { key: 'compare', label: '对比分析', icon: Share2 }
    ] as const;

    return (
      <div className="flex items-center space-x-1 mb-6 border-b">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <Button
              key={tab.key}
              variant={activeView === tab.key ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleViewChange(tab.key)}
              className="rounded-b-none"
            >
              <Icon className="h-4 w-4 mr-1" />
              {tab.label}
            </Button>
          );
        })}
        
        <div className="flex-1" />
        
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
    );
  };

  /**
   * 渲染考试基本信息
   */
  const renderExamInfo = () => {
    if (!exam) return null;

    return (
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-gray-600">考试状态</p>
              <Badge 
                variant={exam.status === 'published' ? 'default' : 'secondary'}
                className="mt-1"
              >
                {{
                  draft: '草稿',
                  published: '已发布',
                  archived: '已归档'
                }[exam.status]}
              </Badge>
            </div>
            
            <div>
              <p className="text-sm text-gray-600">考试时长</p>
              <p className="font-semibold mt-1">{exam.duration}分钟</p>
            </div>
            
            <div>
              <p className="text-sm text-gray-600">题目数量</p>
              <p className="font-semibold mt-1">{exam.total_questions}题</p>
            </div>
            
            <div>
              <p className="text-sm text-gray-600">总分</p>
              <p className="font-semibold mt-1">{exam.total_score}分</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  /**
   * 渲染加载状态
   */
  const renderLoading = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[...Array(4)].map((_, index) => (
          <Card key={index}>
            <CardContent className="p-6">
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-8 w-16 mb-4" />
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(4)].map((_, index) => (
          <Card key={index}>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  /**
   * 渲染对比分析
   */
  const renderCompareAnalysis = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>选择对比考试</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={compareExamId} onValueChange={setCompareExamId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="选择要对比的考试" />
            </SelectTrigger>
            <SelectContent>
              {compareExams.map(exam => (
                <SelectItem key={exam.id} value={exam.id}>
                  {exam.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>
      
      {compareExamId && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-semibold mb-4">当前考试</h3>
            <GradeAnalytics examId={examId} />
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-4">对比考试</h3>
            <GradeAnalytics examId={compareExamId} />
          </div>
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6">
        {renderHeader()}
        {renderLoading()}
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {renderHeader()}
      {renderExamInfo()}
      {renderNavTabs()}
      
      <div className="space-y-6">
        {activeView === 'overview' && (
          <GradeAnalytics examId={examId} />
        )}
        
        {activeView === 'performance' && (
          <GradeAnalytics examId={examId} />
        )}
        
        {activeView === 'questions' && analysis && (
          <div className="space-y-6">
            {/* 题目分析内容 */}
            <Card>
              <CardHeader>
                <CardTitle>题目难度分析</CardTitle>
              </CardHeader>
              <CardContent>
                {analysis.difficulty_analysis && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-green-600">
                          {analysis.difficulty_analysis.easy_questions}
                        </p>
                        <p className="text-sm text-gray-600">简单题目</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-yellow-600">
                          {analysis.difficulty_analysis.medium_questions}
                        </p>
                        <p className="text-sm text-gray-600">中等题目</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-red-600">
                          {analysis.difficulty_analysis.hard_questions}
                        </p>
                        <p className="text-sm text-gray-600">困难题目</p>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>平均正确率</span>
                        <span>{(analysis.difficulty_analysis.average_accuracy * 100).toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>难度系数</span>
                        <span>{analysis.difficulty_analysis.difficulty_coefficient.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
        
        {activeView === 'trends' && (
          <GradeAnalytics examId={examId} />
        )}
        
        {activeView === 'compare' && renderCompareAnalysis()}
      </div>
    </div>
  );
}