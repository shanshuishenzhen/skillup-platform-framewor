'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { 
  Search, 
  Filter, 
  Clock, 
  Users, 
  Star, 
  Trophy, 
  BookOpen, 
  Target, 
  Calendar, 
  DollarSign, 
  Lock, 
  Unlock,
  ChevronRight,
  TrendingUp,
  Award,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { 
  ExamService, 
  ExamStatus, 
  ExamDifficulty,
  type Exam, 
  type ExamQueryParams
} from '@/services/examService';

/**
 * 技能考试页面
 * 显示所有可用的考试，支持搜索、筛选和分类浏览
 */
export default function SkillExamPage() {
  const router = useRouter();
  
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('created_at');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [categories, setCategories] = useState<string[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    ongoing: 0,
    completed: 0,
    upcoming: 0
  });

  /**
   * 加载考试列表
   */
  const loadExams = async () => {
    try {
      setLoading(true);
      
      const queryParams: ExamQueryParams = {
        page: currentPage,
        limit: 12,
        search: searchQuery || undefined,
        category: selectedCategory !== 'all' ? selectedCategory : undefined,
        difficulty: selectedDifficulty !== 'all' ? selectedDifficulty as ExamDifficulty : undefined,
        status: selectedStatus !== 'all' ? selectedStatus as ExamStatus : undefined,
        sort_by: sortBy,
        include_expired: true
      };
      
      const response = await ExamService.getExams(queryParams);
      const examsList = response?.exams || [];
      const totalCount = response?.total || 0;
      
      setExams(examsList);
      setTotalPages(Math.ceil(totalCount / 12));
      
      // 更新统计信息
      setStats({
        total: totalCount,
        ongoing: examsList.filter(e => e.status === ExamStatus.ONGOING).length,
        completed: examsList.filter(e => e.status === ExamStatus.FINISHED).length,
        upcoming: examsList.filter(e => e.status === ExamStatus.DRAFT).length
      });
      
    } catch (error) {
      console.error('加载考试列表失败:', error);
      toast.error('加载考试列表失败');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 加载考试分类
   */
  const loadCategories = async () => {
    try {
      // TODO: 实现获取考试分类的API调用
      // const categoriesData = await ExamService.getExamCategories();
      // setCategories(categoriesData);
      
      // 模拟数据
      setCategories([
        '前端开发',
        '后端开发',
        '数据库',
        '算法与数据结构',
        '系统设计',
        '项目管理',
        '软技能'
      ]);
    } catch (error) {
      console.error('加载分类失败:', error);
    }
  };

  /**
   * 获取难度显示文本
   */
  const getDifficultyText = (difficulty: ExamDifficulty) => {
    const difficultyMap = {
      [ExamDifficulty.BEGINNER]: '初级',
      [ExamDifficulty.INTERMEDIATE]: '中级',
      [ExamDifficulty.ADVANCED]: '高级'
    };
    return difficultyMap[difficulty] || difficulty;
  };

  /**
   * 获取状态显示文本和样式
   */
  const getStatusInfo = (exam: Exam) => {
    const now = new Date();
    const startTime = new Date(exam.start_time);
    const endTime = new Date(exam.end_time);
    
    if (exam.status === ExamStatus.DRAFT) {
      return { text: '即将开始', color: 'bg-blue-100 text-blue-800' };
    }
    
    if (exam.status === ExamStatus.ONGOING) {
      if (now < startTime) {
        return { text: '未开始', color: 'bg-yellow-100 text-yellow-800' };
      }
      if (now > endTime) {
        return { text: '已结束', color: 'bg-gray-100 text-gray-800' };
      }
      return { text: '进行中', color: 'bg-green-100 text-green-800' };
    }
    
    if (exam.status === ExamStatus.FINISHED) {
      return { text: '已完成', color: 'bg-gray-100 text-gray-800' };
    }
    
    return { text: '未知', color: 'bg-gray-100 text-gray-800' };
  };

  /**
   * 检查考试是否可以参加
   */
  const canTakeExam = (exam: Exam) => {
    const now = new Date();
    const startTime = new Date(exam.start_time);
    const endTime = new Date(exam.end_time);
    
    return exam.status === ExamStatus.ONGOING && 
           now >= startTime && 
           now <= endTime;
  };

  /**
   * 参加考试
   */
  const takeExam = (examId: string) => {
    router.push(`/exam/${examId}`);
  };

  /**
   * 查看考试详情
   */
  const viewExamDetails = (examId: string) => {
    router.push(`/exam/${examId}/details`);
  };

  /**
   * 重置筛选条件
   */
  const resetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSelectedDifficulty('all');
    setSelectedStatus('all');
    setSortBy('created_at');
    setCurrentPage(1);
  };

  /**
   * 渲染统计卡片
   */
  const renderStatsCards = () => (
    <div className="grid grid-cols-4 gap-4 mb-6">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">总考试数</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
            <BookOpen className="h-8 w-8 text-blue-500" />
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">进行中</p>
              <p className="text-2xl font-bold text-green-600">{stats.ongoing}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-500" />
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">已完成</p>
              <p className="text-2xl font-bold text-gray-600">{stats.completed}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-gray-500" />
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">即将开始</p>
              <p className="text-2xl font-bold text-blue-600">{stats.upcoming}</p>
            </div>
            <Calendar className="h-8 w-8 text-blue-500" />
          </div>
        </CardContent>
      </Card>
    </div>
  );

  /**
   * 渲染搜索和筛选区域
   */
  const renderFilters = () => (
    <Card className="mb-6">
      <CardContent className="p-4">
        <div className="flex flex-wrap gap-4 items-end">
          {/* 搜索框 */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium mb-1">搜索考试</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="输入考试名称或关键词..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          {/* 分类筛选 */}
          <div className="min-w-[150px]">
            <label className="block text-sm font-medium mb-1">分类</label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue placeholder="选择分类" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部分类</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* 难度筛选 */}
          <div className="min-w-[120px]">
            <label className="block text-sm font-medium mb-1">难度</label>
            <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
              <SelectTrigger>
                <SelectValue placeholder="选择难度" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部难度</SelectItem>
                <SelectItem value={ExamDifficulty.BEGINNER}>初级</SelectItem>
                <SelectItem value={ExamDifficulty.INTERMEDIATE}>中级</SelectItem>
                <SelectItem value={ExamDifficulty.ADVANCED}>高级</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* 状态筛选 */}
          <div className="min-w-[120px]">
            <label className="block text-sm font-medium mb-1">状态</label>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger>
                <SelectValue placeholder="选择状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value={ExamStatus.ONGOING}>进行中</SelectItem>
                <SelectItem value={ExamStatus.FINISHED}>已完成</SelectItem>
                <SelectItem value={ExamStatus.DRAFT}>即将开始</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* 排序 */}
          <div className="min-w-[120px]">
            <label className="block text-sm font-medium mb-1">排序</label>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger>
                <SelectValue placeholder="排序方式" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created_at">创建时间</SelectItem>
                <SelectItem value="start_time">开始时间</SelectItem>
                <SelectItem value="title">考试名称</SelectItem>
                <SelectItem value="difficulty">难度等级</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* 操作按钮 */}
          <div className="flex gap-2">
            <Button onClick={loadExams}>
              <Search className="h-4 w-4 mr-2" />
              搜索
            </Button>
            <Button variant="outline" onClick={resetFilters}>
              <Filter className="h-4 w-4 mr-2" />
              重置
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  /**
   * 渲染考试卡片
   */
  const renderExamCard = (exam: Exam) => {
    const statusInfo = getStatusInfo(exam);
    const canTake = canTakeExam(exam);
    
    return (
      <Card key={exam.id} className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <CardTitle className="text-lg mb-2">{exam.title}</CardTitle>
              <CardDescription className="line-clamp-2">
                {exam.description}
              </CardDescription>
            </div>
            <Badge className={statusInfo.color}>
              {statusInfo.text}
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* 考试信息 */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-gray-500" />
              <span>难度: {getDifficultyText(exam.difficulty)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-500" />
              <span>时长: {exam.duration} 分钟</span>
            </div>
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-gray-500" />
              <span>题目: {exam.total_questions} 道</span>
            </div>
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-gray-500" />
              <span>及格: {exam.passing_score} 分</span>
            </div>
          </div>
          
          {/* 时间信息 */}
          <div className="text-sm text-gray-600">
            <div>开始时间: {new Date(exam.start_time).toLocaleString()}</div>
            <div>结束时间: {new Date(exam.end_time).toLocaleString()}</div>
          </div>
          
          {/* 费用信息 */}
          {exam.fee > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <DollarSign className="h-4 w-4 text-green-500" />
              <span className="font-medium text-green-600">
                {exam.currency} {exam.fee}
              </span>
            </div>
          )}
          
          {/* 标签 */}
          {exam.tags && exam.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {exam.tags.slice(0, 3).map(tag => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {exam.tags.length > 3 && (
                <Badge variant="secondary" className="text-xs">
                  +{exam.tags.length - 3}
                </Badge>
              )}
            </div>
          )}
          
          {/* 操作按钮 */}
          <div className="flex gap-2 pt-2">
            <Button 
              onClick={() => viewExamDetails(exam.id)}
              variant="outline"
              size="sm"
              className="flex-1"
            >
              查看详情
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
            
            {canTake ? (
              <Button 
                onClick={() => takeExam(exam.id)}
                size="sm"
                className="flex-1"
              >
                <Unlock className="h-4 w-4 mr-2" />
                开始考试
              </Button>
            ) : (
              <Button 
                disabled
                size="sm"
                className="flex-1"
                variant="secondary"
              >
                <Lock className="h-4 w-4 mr-2" />
                暂不可考
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  /**
   * 渲染分页
   */
  const renderPagination = () => {
    if (totalPages <= 1) return null;
    
    return (
      <div className="flex justify-center gap-2 mt-6">
        <Button 
          variant="outline" 
          disabled={currentPage === 1}
          onClick={() => setCurrentPage(currentPage - 1)}
        >
          上一页
        </Button>
        
        <div className="flex items-center gap-2">
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            const page = i + 1;
            return (
              <Button
                key={page}
                variant={currentPage === page ? "default" : "outline"}
                size="sm"
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </Button>
            );
          })}
        </div>
        
        <Button 
          variant="outline" 
          disabled={currentPage === totalPages}
          onClick={() => setCurrentPage(currentPage + 1)}
        >
          下一页
        </Button>
      </div>
    );
  };

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    loadExams();
  }, [currentPage, searchQuery, selectedCategory, selectedDifficulty, selectedStatus, sortBy]);

  return (
    <div className="container mx-auto p-6">
      {/* 页面标题 */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">技能考试</h1>
        <p className="text-gray-600">
          通过专业考试验证您的技能水平，获得权威认证
        </p>
      </div>
      
      {/* 统计卡片 */}
      {renderStatsCards()}
      
      {/* 搜索和筛选 */}
      {renderFilters()}
      
      {/* 考试列表 */}
      {loading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">加载中...</p>
        </div>
      ) : exams.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">暂无考试</h3>
            <p className="text-gray-600 mb-4">当前筛选条件下没有找到考试</p>
            <Button onClick={resetFilters} variant="outline">
              重置筛选条件
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {exams.map(renderExamCard)}
          </div>
          
          {renderPagination()}
        </>
      )}
    </div>
  );
}