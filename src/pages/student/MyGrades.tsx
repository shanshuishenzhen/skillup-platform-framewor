/**
 * 学员个人成绩查看页面
 * 
 * 提供学员查看个人成绩的功能，包括：
 * - 成绩列表查看
 * - 成绩详情查看
 * - 成绩趋势分析
 * - 错题回顾
 * - 成绩统计
 * - 学习建议
 * 
 * @author SOLO Coding
 * @version 1.0.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import {
  TrendingUp,
  TrendingDown,
  Award,
  Clock,
  Target,
  BookOpen,
  Eye,
  Calendar,
  Filter,
  Search,
  BarChart3,
  PieChart,
  AlertCircle,
  CheckCircle,
  Star,
  Trophy,
  Lightbulb
} from 'lucide-react';

import {
  Grade,
  GradeLevel,
  GradeStatus,
  GradeQueryParams,
  TrendAnalysis
} from '@/types/grade';
import { gradeService } from '@/services/gradeService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell
} from 'recharts';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

/**
 * 等级颜色配置
 */
const GRADE_LEVEL_COLORS = {
  [GradeLevel.EXCELLENT]: 'text-green-600 bg-green-100',
  [GradeLevel.GOOD]: 'text-blue-600 bg-blue-100',
  [GradeLevel.AVERAGE]: 'text-yellow-600 bg-yellow-100',
  [GradeLevel.PASS]: 'text-orange-600 bg-orange-100',
  [GradeLevel.FAIL]: 'text-red-600 bg-red-100'
};

/**
 * 等级标签映射
 */
const GRADE_LEVEL_LABELS = {
  [GradeLevel.EXCELLENT]: '优秀',
  [GradeLevel.GOOD]: '良好',
  [GradeLevel.AVERAGE]: '中等',
  [GradeLevel.PASS]: '及格',
  [GradeLevel.FAIL]: '不及格'
};

/**
 * 饼图颜色
 */
const PIE_COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#F97316', '#EF4444'];

/**
 * 学员个人成绩页面
 */
export default function MyGrades() {
  const router = useRouter();
  const { query } = router;
  
  // 状态管理
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState((query.search as string) || '');
  const [statusFilter, setStatusFilter] = useState<GradeStatus | 'all'>(
    (query.status as GradeStatus) || 'all'
  );
  const [levelFilter, setLevelFilter] = useState<GradeLevel | 'all'>(
    (query.level as GradeLevel) || 'all'
  );
  const [sortBy, setSortBy] = useState<'submitted_at' | 'score' | 'exam_title'>('submitted_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedGrade, setSelectedGrade] = useState<Grade | null>(null);
  const [showTrends, setShowTrends] = useState(false);
  const [trendData, setTrendData] = useState<TrendAnalysis | null>(null);

  /**
   * 加载成绩数据
   */
  const loadGrades = async () => {
    try {
      setLoading(true);
      
      const params: GradeQueryParams = {
        page: 1,
        limit: 100,
        search: searchTerm || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        grade_level: levelFilter !== 'all' ? levelFilter : undefined,
        sort_by: sortBy,
        sort_order: sortOrder
      };
      
      const response = await gradeService.getGrades(params);
      setGrades(response.data);
    } catch (error) {
      console.error('加载成绩失败:', error);
      toast.error('加载成绩失败');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 加载趋势数据
   */
  const loadTrendData = async () => {
    try {
      const trends = await gradeService.getTrendAnalysis();
      setTrendData(trends);
    } catch (error) {
      console.error('加载趋势数据失败:', error);
    }
  };

  // 初始化加载
  useEffect(() => {
    loadGrades();
    loadTrendData();
  }, [searchTerm, statusFilter, levelFilter, sortBy, sortOrder]);

  /**
   * 处理搜索
   */
  const handleSearch = (value: string) => {
    setSearchTerm(value);
    updateSearchParams({ search: value });
  };

  /**
   * 更新URL参数
   */
  const updateSearchParams = (params: Record<string, string>) => {
    const newQuery = { ...query };
    Object.entries(params).forEach(([key, value]) => {
      if (value) {
        newQuery[key] = value;
      } else {
        delete newQuery[key];
      }
    });
    router.push({
      pathname: router.pathname,
      query: newQuery
    }, undefined, { shallow: true });
  };

  /**
   * 计算统计数据
   */
  const statistics = useMemo(() => {
    if (!grades.length) {
      return {
        totalExams: 0,
        averageScore: 0,
        passRate: 0,
        levelDistribution: {},
        recentTrend: 'stable' as 'up' | 'down' | 'stable'
      };
    }

    const totalExams = grades.length;
    const totalScore = grades.reduce((sum, grade) => sum + grade.score, 0);
    const averageScore = totalScore / totalExams;
    const passedCount = grades.filter(grade => grade.grade_level !== GradeLevel.FAIL).length;
    const passRate = (passedCount / totalExams) * 100;

    // 等级分布
    const levelDistribution = grades.reduce((acc, grade) => {
      acc[grade.grade_level] = (acc[grade.grade_level] || 0) + 1;
      return acc;
    }, {} as Record<GradeLevel, number>);

    // 最近趋势（比较最近5次和之前5次的平均分）
    const sortedGrades = [...grades].sort((a, b) => 
      new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime()
    );
    const recentGrades = sortedGrades.slice(0, 5);
    const previousGrades = sortedGrades.slice(5, 10);
    
    let recentTrend: 'up' | 'down' | 'stable' = 'stable';
    if (recentGrades.length >= 3 && previousGrades.length >= 3) {
      const recentAvg = recentGrades.reduce((sum, g) => sum + g.score, 0) / recentGrades.length;
      const previousAvg = previousGrades.reduce((sum, g) => sum + g.score, 0) / previousGrades.length;
      const diff = recentAvg - previousAvg;
      
      if (diff > 5) recentTrend = 'up';
      else if (diff < -5) recentTrend = 'down';
    }

    return {
      totalExams,
      averageScore,
      passRate,
      levelDistribution,
      recentTrend
    };
  }, [grades]);

  /**
   * 准备趋势图表数据
   */
  const chartData = useMemo(() => {
    if (!grades.length) return [];
    
    return grades
      .sort((a, b) => new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime())
      .map((grade, index) => ({
        exam: grade.exam_title.length > 10 
          ? `${grade.exam_title.substring(0, 10)}...` 
          : grade.exam_title,
        score: grade.score,
        percentage: grade.percentage,
        date: new Date(grade.submitted_at).toLocaleDateString(),
        index: index + 1
      }));
  }, [grades]);

  /**
   * 准备等级分布数据
   */
  const levelChartData = useMemo(() => {
    return Object.entries(statistics.levelDistribution).map(([level, count], index) => ({
      name: GRADE_LEVEL_LABELS[level as GradeLevel],
      value: count,
      fill: PIE_COLORS[index]
    }));
  }, [statistics.levelDistribution]);

  /**
   * 渲染统计卡片
   */
  const renderStatistics = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">参加考试</p>
              <p className="text-2xl font-bold mt-1">{statistics.totalExams}</p>
            </div>
            <div className="p-3 rounded-full bg-blue-100">
              <BookOpen className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">平均分</p>
              <p className="text-2xl font-bold mt-1">{statistics.averageScore.toFixed(1)}</p>
            </div>
            <div className="p-3 rounded-full bg-green-100">
              <Target className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">通过率</p>
              <p className="text-2xl font-bold mt-1">{statistics.passRate.toFixed(1)}%</p>
            </div>
            <div className="p-3 rounded-full bg-purple-100">
              <Award className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">最近趋势</p>
              <div className="flex items-center mt-1">
                {statistics.recentTrend === 'up' && (
                  <>
                    <TrendingUp className="h-5 w-5 text-green-600 mr-1" />
                    <span className="text-green-600 font-semibold">上升</span>
                  </>
                )}
                {statistics.recentTrend === 'down' && (
                  <>
                    <TrendingDown className="h-5 w-5 text-red-600 mr-1" />
                    <span className="text-red-600 font-semibold">下降</span>
                  </>
                )}
                {statistics.recentTrend === 'stable' && (
                  <>
                    <BarChart3 className="h-5 w-5 text-gray-600 mr-1" />
                    <span className="text-gray-600 font-semibold">稳定</span>
                  </>
                )}
              </div>
            </div>
            <div className="p-3 rounded-full bg-orange-100">
              <TrendingUp className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  /**
   * 渲染筛选控件
   */
  const renderFilters = () => (
    <div className="flex flex-col sm:flex-row gap-4 mb-6">
      <div className="flex-1">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="搜索考试名称..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>
      
      <Select 
        value={statusFilter} 
        onValueChange={(value) => {
          setStatusFilter(value as GradeStatus | 'all');
          updateSearchParams({ status: value === 'all' ? '' : value });
        }}
      >
        <SelectTrigger className="w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">全部状态</SelectItem>
          <SelectItem value={GradeStatus.PENDING}>待评分</SelectItem>
          <SelectItem value={GradeStatus.GRADED}>已评分</SelectItem>
          <SelectItem value={GradeStatus.PUBLISHED}>已发布</SelectItem>
        </SelectContent>
      </Select>
      
      <Select 
        value={levelFilter} 
        onValueChange={(value) => {
          setLevelFilter(value as GradeLevel | 'all');
          updateSearchParams({ level: value === 'all' ? '' : value });
        }}
      >
        <SelectTrigger className="w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">全部等级</SelectItem>
          <SelectItem value={GradeLevel.EXCELLENT}>优秀</SelectItem>
          <SelectItem value={GradeLevel.GOOD}>良好</SelectItem>
          <SelectItem value={GradeLevel.AVERAGE}>中等</SelectItem>
          <SelectItem value={GradeLevel.PASS}>及格</SelectItem>
          <SelectItem value={GradeLevel.FAIL}>不及格</SelectItem>
        </SelectContent>
      </Select>
      
      <Button
        variant="outline"
        onClick={() => setShowTrends(true)}
        className="flex items-center"
      >
        <BarChart3 className="h-4 w-4 mr-1" />
        趋势分析
      </Button>
    </div>
  );

  /**
   * 渲染成绩表格
   */
  const renderGradesTable = () => {
    if (loading) {
      return (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {[...Array(5)].map((_, index) => (
                <Skeleton key={index} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      );
    }

    if (!grades.length) {
      return (
        <Card>
          <CardContent className="p-12 text-center">
            <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">暂无成绩记录</p>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>考试名称</TableHead>
                <TableHead>得分</TableHead>
                <TableHead>等级</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>提交时间</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {grades.map((grade) => (
                <TableRow key={grade.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{grade.exam_title}</p>
                      <p className="text-sm text-gray-500">
                        {grade.correct_count}/{grade.total_questions}题正确
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-semibold">{grade.score}/{grade.total_score}</p>
                      <p className="text-sm text-gray-500">{grade.percentage.toFixed(1)}%</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={GRADE_LEVEL_COLORS[grade.grade_level]}>
                      {GRADE_LEVEL_LABELS[grade.grade_level]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={grade.status === GradeStatus.PUBLISHED ? 'default' : 'secondary'}
                    >
                      {{
                        [GradeStatus.PENDING]: '待评分',
                        [GradeStatus.GRADED]: '已评分',
                        [GradeStatus.PUBLISHED]: '已发布',
                        [GradeStatus.ARCHIVED]: '已归档'
                      }[grade.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p>{new Date(grade.submitted_at).toLocaleDateString()}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(grade.submitted_at).toLocaleTimeString()}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedGrade(grade)}
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      查看详情
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  };

  /**
   * 渲染成绩详情对话框
   */
  const renderGradeDetail = () => (
    <Dialog open={!!selectedGrade} onOpenChange={() => setSelectedGrade(null)}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>成绩详情</DialogTitle>
          <DialogDescription>
            {selectedGrade?.exam_title}
          </DialogDescription>
        </DialogHeader>
        
        {selectedGrade && (
          <div className="space-y-6">
            {/* 基本信息 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">得分</p>
                <p className="text-2xl font-bold">
                  {selectedGrade.score}/{selectedGrade.total_score}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">得分率</p>
                <p className="text-2xl font-bold">{selectedGrade.percentage.toFixed(1)}%</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">等级</p>
                <Badge className={GRADE_LEVEL_COLORS[selectedGrade.grade_level]}>
                  {GRADE_LEVEL_LABELS[selectedGrade.grade_level]}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-gray-600">用时</p>
                <p className="font-semibold">
                  {selectedGrade.time_spent ? `${selectedGrade.time_spent}分钟` : '未记录'}
                </p>
              </div>
            </div>
            
            {/* 答题统计 */}
            <div>
              <h4 className="font-semibold mb-3">答题统计</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>正确题数</span>
                  <span className="font-semibold text-green-600">
                    {selectedGrade.correct_count}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>错误题数</span>
                  <span className="font-semibold text-red-600">
                    {selectedGrade.total_questions - selectedGrade.correct_count}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>正确率</span>
                  <span className="font-semibold">
                    {((selectedGrade.correct_count / selectedGrade.total_questions) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
              
              <Progress 
                value={(selectedGrade.correct_count / selectedGrade.total_questions) * 100} 
                className="mt-3" 
              />
            </div>
            
            {/* 评语 */}
            {selectedGrade.comments && (
              <div>
                <h4 className="font-semibold mb-2">评语</h4>
                <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">
                  {selectedGrade.comments}
                </p>
              </div>
            )}
            
            {/* 学习建议 */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center mb-2">
                <Lightbulb className="h-5 w-5 text-blue-600 mr-2" />
                <h4 className="font-semibold text-blue-900">学习建议</h4>
              </div>
              <div className="text-sm text-blue-800 space-y-1">
                {selectedGrade.grade_level === GradeLevel.EXCELLENT && (
                  <p>• 表现优秀！继续保持这种学习状态</p>
                )}
                {selectedGrade.grade_level === GradeLevel.GOOD && (
                  <p>• 成绩良好，可以尝试挑战更难的题目</p>
                )}
                {selectedGrade.grade_level === GradeLevel.AVERAGE && (
                  <p>• 基础掌握不错，建议加强练习提高熟练度</p>
                )}
                {selectedGrade.grade_level === GradeLevel.PASS && (
                  <p>• 刚好及格，建议重点复习薄弱知识点</p>
                )}
                {selectedGrade.grade_level === GradeLevel.FAIL && (
                  <p>• 需要加强基础学习，建议重新学习相关内容</p>
                )}
                <p>• 可以查看错题解析，针对性地进行复习</p>
                <p>• 建议定期练习，保持学习连续性</p>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );

  /**
   * 渲染趋势分析对话框
   */
  const renderTrendsDialog = () => (
    <Dialog open={showTrends} onOpenChange={setShowTrends}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>成绩趋势分析</DialogTitle>
          <DialogDescription>
            查看您的学习进步轨迹和成绩变化趋势
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* 成绩趋势图 */}
          <div>
            <h4 className="font-semibold mb-4">成绩变化趋势</h4>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="index" />
                <YAxis />
                <Tooltip 
                  formatter={(value, name) => [
                    name === 'score' ? `${value}分` : `${value}%`,
                    name === 'score' ? '得分' : '得分率'
                  ]}
                  labelFormatter={(label) => `第${label}次考试`}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="score" 
                  stroke="#3B82F6" 
                  name="得分"
                  strokeWidth={2}
                />
                <Line 
                  type="monotone" 
                  dataKey="percentage" 
                  stroke="#10B981" 
                  name="得分率"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          
          {/* 等级分布 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-4">等级分布</h4>
              <ResponsiveContainer width="100%" height={250}>
                <RechartsPieChart>
                  <Pie
                    data={levelChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {levelChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">学习建议</h4>
              <div className="space-y-3">
                {statistics.recentTrend === 'up' && (
                  <div className="flex items-start space-x-2 text-green-700">
                    <TrendingUp className="h-5 w-5 mt-0.5" />
                    <div>
                      <p className="font-medium">进步明显</p>
                      <p className="text-sm">最近的成绩呈上升趋势，继续保持！</p>
                    </div>
                  </div>
                )}
                
                {statistics.recentTrend === 'down' && (
                  <div className="flex items-start space-x-2 text-red-700">
                    <TrendingDown className="h-5 w-5 mt-0.5" />
                    <div>
                      <p className="font-medium">需要加强</p>
                      <p className="text-sm">最近成绩有所下降，建议加强复习。</p>
                    </div>
                  </div>
                )}
                
                {statistics.passRate >= 80 && (
                  <div className="flex items-start space-x-2 text-blue-700">
                    <Trophy className="h-5 w-5 mt-0.5" />
                    <div>
                      <p className="font-medium">表现优秀</p>
                      <p className="text-sm">通过率很高，学习效果显著。</p>
                    </div>
                  </div>
                )}
                
                <div className="flex items-start space-x-2 text-gray-700">
                  <Star className="h-5 w-5 mt-0.5" />
                  <div>
                    <p className="font-medium">持续学习</p>
                    <p className="text-sm">保持定期练习，巩固已学知识。</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="container mx-auto px-4 py-6">
      {/* 页面标题 */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">我的成绩</h1>
        <p className="text-gray-600">查看您的考试成绩和学习进度</p>
      </div>
      
      {/* 统计卡片 */}
      {renderStatistics()}
      
      {/* 筛选控件 */}
      {renderFilters()}
      
      {/* 成绩表格 */}
      {renderGradesTable()}
      
      {/* 成绩详情对话框 */}
      {renderGradeDetail()}
      
      {/* 趋势分析对话框 */}
      {renderTrendsDialog()}
    </div>
  );
}