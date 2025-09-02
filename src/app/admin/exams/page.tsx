'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import { 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  Eye, 
  Users, 
  Clock, 
  FileText, 
  BarChart3,
  Calendar as CalendarIcon,
  Settings,
  BookOpen,
  Keyboard,
  Zap
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { ExamService } from '@/services/examService';
import { ExamStatus, ExamDifficulty, type Exam } from '@/types/exam';
import QuestionManagement from '@/components/admin/QuestionManagement';
import ExamAnalytics from '@/components/admin/ExamAnalytics';
import ExamReports from '@/components/admin/ExamReports';
import { ExamPaperImport } from '@/components/admin/ExamPaperImport';
import { LoadingSpinner, ExamCardSkeleton, LoadingOverlay } from '@/components/common/LoadingStates';
import { ThemeToggle, KeyboardShortcutsHelp, AccessibilityPanel, PerformanceIndicator, useKeyboardShortcuts } from '@/components/common/UXEnhancements';
import useExamOptimization, { useDebounce } from '@/hooks/useExamOptimization';

/**
 * 考试管理页面
 * 提供考试的创建、编辑、删除和统计功能
 */
export default function ExamManagementPage() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ExamStatus | 'all'>('all');

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [showQuestionDialog, setShowQuestionDialog] = useState(false);
  const [selectedExamForQuestions, setSelectedExamForQuestions] = useState<string | null>(null);
  const [showAnalyticsDialog, setShowAnalyticsDialog] = useState(false);
  const [selectedExamForAnalytics, setSelectedExamForAnalytics] = useState<string | null>(null);
  const [showReportsDialog, setShowReportsDialog] = useState(false);
  const [selectedExamForReports, setSelectedExamForReports] = useState<string | null>(null);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // 性能优化和用户体验增强
  const { loadExamsBatch, searchExams, clearCache } = useExamOptimization();
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // 新建考试表单状态
  const [newExam, setNewExam] = useState({
    title: '',
    description: '',
    category: '',
    difficulty: ExamDifficulty.BEGINNER,
    duration: 60,
    total_questions: 10,
    total_score: 100,
    passing_score: 60,
    max_attempts: 3,
    allow_retake: true,
    start_time: new Date(),
    end_time: new Date(),
    registration_deadline: new Date(),
    status: ExamStatus.DRAFT,
    is_public: true,
    requires_approval: false,
    fee: 0,
    currency: 'CNY',
    tags: [] as string[],
    skills: [] as string[],
    prerequisites: [] as string[],
    instructions: '',
    rules: [] as string[]
  });

  /**
   * 加载考试列表（使用性能优化）
   */
  const loadExams = async () => {
    try {
      setLoading(true);
      const result = await loadExamsBatch(
        currentPage,
        10,
        {
          status: statusFilter !== 'all' ? statusFilter : undefined,
          search: searchTerm || undefined
        }
      );
      setExams(result.data);
      setTotalPages(result.total_pages);
    } catch (error) {
      console.error('加载考试列表失败:', error);
      toast.error('加载考试列表失败');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 搜索考试（使用防抖优化）
   */
  const handleSearch = async () => {
    if (!debouncedSearchQuery.trim()) {
      setSearchTerm('');
      return;
    }
    
    try {
      setLoading(true);
      const result = await searchExams(debouncedSearchQuery, {
        status: statusFilter !== 'all' ? statusFilter : undefined
      });
      setExams(result.data);
      setTotalPages(result.total_pages);
    } catch (error) {
      console.error('搜索考试失败:', error);
      toast.error('搜索考试失败');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 创建考试
   */
  const handleCreateExam = async () => {
    try {
      const examData = {
        ...newExam,
        start_time: newExam.start_time.toISOString(),
        end_time: newExam.end_time.toISOString(),
        registration_deadline: newExam.registration_deadline.toISOString(),
        created_by: 'current-user-id' // TODO: 从认证上下文获取
      };
      
      await ExamService.createExam(examData);
      setShowCreateDialog(false);
      resetNewExamForm();
      loadExams();
    } catch (error) {
      console.error('创建考试失败:', error);
    }
  };

  /**
   * 删除考试
   */
  const handleDeleteExam = async (examId: string) => {
    if (!confirm('确定要删除这个考试吗？此操作不可撤销。')) {
      return;
    }

    try {
      await ExamService.deleteExam(examId);
      loadExams();
    } catch (error) {
      console.error('删除考试失败:', error);
    }
  };

  /**
   * 重置新建考试表单
   */
  const resetNewExamForm = () => {
    setNewExam({
      title: '',
      description: '',
      category: '',
      difficulty: ExamDifficulty.BEGINNER,
      duration: 60,
      total_questions: 10,
      total_score: 100,
      passing_score: 60,
      max_attempts: 3,
      allow_retake: true,
      start_time: new Date(),
      end_time: new Date(),
      registration_deadline: new Date(),
      status: ExamStatus.DRAFT,
      is_public: true,
      requires_approval: false,
      fee: 0,
      currency: 'CNY',
      tags: [] as string[],
      skills: [] as string[],
      prerequisites: [] as string[],
      instructions: '',
      rules: [] as string[]
    });
  };

  /**
   * 获取状态文本
   */
  const getStatusText = (status: ExamStatus) => {
    const statusMap = {
      [ExamStatus.DRAFT]: '草稿',
      [ExamStatus.PUBLISHED]: '已发布',
      [ExamStatus.ONGOING]: '进行中',
      [ExamStatus.FINISHED]: '已结束',
      [ExamStatus.CANCELLED]: '已取消'
    };
    return statusMap[status] || status;
  };

  /**
   * 获取难度文本
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
   * 打开题目管理对话框
   */
  const openQuestionManagement = (examId: string) => {
    setSelectedExamForQuestions(examId);
    setShowQuestionDialog(true);
  };

  const openAnalytics = (examId: string) => {
    setSelectedExamForAnalytics(examId);
    setShowAnalyticsDialog(true);
  };

  const openReports = (examId: string) => {
    setSelectedExamForReports(examId);
    setShowReportsDialog(true);
  };

  /**
   * 获取状态颜色
   */
  const getStatusColor = (status: ExamStatus) => {
    const colorMap = {
      [ExamStatus.DRAFT]: 'bg-gray-100 text-gray-800',
      [ExamStatus.PUBLISHED]: 'bg-blue-100 text-blue-800',
      [ExamStatus.ONGOING]: 'bg-green-100 text-green-800',
      [ExamStatus.FINISHED]: 'bg-purple-100 text-purple-800',
      [ExamStatus.CANCELLED]: 'bg-red-100 text-red-800'
    };
    return colorMap[status] || 'bg-gray-100 text-gray-800';
  };

  /**
   * 渲染考试卡片
   */
  const renderExamCard = (exam: Exam) => (
    <Card key={exam.id} className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg mb-1">{exam.title}</CardTitle>
            <CardDescription>
              {exam.category} · {getDifficultyText(exam.difficulty)}
            </CardDescription>
          </div>
          <Badge className={getStatusColor(exam.status)}>
            {getStatusText(exam.status)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-gray-600 mb-4 line-clamp-2">
          {exam.description || '暂无描述'}
        </p>
        
        <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-4">
          <div className="flex items-center">
            <Clock className="h-4 w-4 mr-1" />
            <span>{exam.duration} 分钟</span>
          </div>
          <div className="flex items-center">
            <FileText className="h-4 w-4 mr-1" />
            <span>{exam.total_questions} 题</span>
          </div>
          <div className="flex items-center">
            <Users className="h-4 w-4 mr-1" />
            <span>{exam.registrations_count || 0} 人报名</span>
          </div>
          <div className="flex items-center">
            <BarChart3 className="h-4 w-4 mr-1" />
            <span>{exam.pass_rate || 0}% 通过率</span>
          </div>
        </div>
        
        <div className="text-xs text-gray-500 mb-4">
          创建时间: {format(new Date(exam.created_at), 'yyyy-MM-dd')}
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => openQuestionManagement(exam.id)}
          >
            <BookOpen className="h-4 w-4 mr-1" />
            题目管理
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => openAnalytics(exam.id)}
          >
            <BarChart3 className="h-4 w-4 mr-1" />
            统计分析
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => openReports(exam.id)}
          >
            <FileText className="h-4 w-4 mr-1" />
            报表
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {/* TODO: 查看详情 */}}
          >
            <Eye className="h-4 w-4 mr-1" />
            详情
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setEditingExam(exam)}
          >
            <Edit className="h-4 w-4 mr-1" />
            编辑
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleDeleteExam(exam.id)}
            className="text-red-600 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            删除
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  // 页面加载时获取考试列表
  useEffect(() => {
    loadExams();
  }, [currentPage, searchTerm, statusFilter]);

  // 搜索防抖处理
  useEffect(() => {
    if (debouncedSearchQuery !== searchQuery) {
      handleSearch();
    }
  }, [debouncedSearchQuery]);

  // 键盘快捷键
  useKeyboardShortcuts([
    {
      key: 'n',
      ctrlKey: true,
      description: '创建新考试',
      action: () => {
        setShowCreateDialog(true);
      },
      category: '考试管理'
    },
    {
      key: 'i',
      ctrlKey: true,
      description: '导入试卷',
      action: () => {
        setShowImportDialog(true);
      },
      category: '考试管理'
    },
    {
      key: 'f',
      ctrlKey: true,
      description: '搜索考试',
      action: () => {
        const searchInput = document.querySelector('input[placeholder*="搜索"]') as HTMLInputElement;
        searchInput?.focus();
      },
      category: '考试管理'
    },
    {
      key: 'r',
      ctrlKey: true,
      description: '刷新列表',
      action: () => {
        clearCache();
        loadExams();
      },
      category: '考试管理'
    }
  ]);

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">考试管理</h1>
        <div className="flex space-x-2">
          {/* 导入试卷按钮 */}
          <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <FileText className="h-4 w-4 mr-2" />
                导入试卷
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>导入试卷</DialogTitle>
                <DialogDescription>
                  从Excel文件导入试卷模板，支持题型分布和试卷题目
                </DialogDescription>
              </DialogHeader>
              <ExamPaperImport
                onImportComplete={async (questions, examTitle) => {
                  try {
                    // 创建新考试
                    const examData = {
                      title: examTitle,
                      description: `从Excel文件导入的试卷，包含${questions.length}道题目`,
                      category: '导入试卷',
                      difficulty: ExamDifficulty.INTERMEDIATE,
                      duration: Math.max(60, questions.length * 2), // 每题2分钟，最少60分钟
                      total_questions: questions.length,
                      total_score: questions.reduce((sum, q) => sum + (q.points || 1), 0),
                      passing_score: Math.ceil(questions.reduce((sum, q) => sum + (q.points || 1), 0) * 0.6),
                      max_attempts: 3,
                      is_public: false,
                      requires_approval: false,
                      allow_retake: true,
                      status: ExamStatus.DRAFT
                    };

                    const examResponse = await fetch('/api/admin/exams', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify(examData),
                    });

                    if (!examResponse.ok) {
                      throw new Error('创建考试失败');
                    }

                    const newExam = await examResponse.json();

                    // 批量添加题目
                    const questionsResponse = await fetch(`/api/admin/exams/${newExam.id}/questions/batch`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({ questions }),
                    });

                    if (!questionsResponse.ok) {
                      throw new Error('添加题目失败');
                    }

                    setShowImportDialog(false);
                    await loadExams(); // 重新加载考试列表
                    toast.success(`成功导入试卷：${examTitle}，包含${questions.length}道题目`);
                  } catch (error) {
                    console.error('导入试卷失败:', error);
                    toast.error('导入试卷失败：' + (error instanceof Error ? error.message : '未知错误'));
                  }
                }}
                onClose={() => setShowImportDialog(false)}
              />
            </DialogContent>
          </Dialog>
          
          {/* 创建考试按钮 */}
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                创建考试
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>创建新考试</DialogTitle>
                <DialogDescription>
                  填写考试基本信息，创建后可以添加题目
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">考试标题</Label>
                  <Input
                    id="title"
                    value={newExam.title}
                    onChange={(e) => setNewExam({ ...newExam, title: e.target.value })}
                    placeholder="请输入考试标题"
                  />
                </div>
                <div>
                  <Label htmlFor="category">考试分类</Label>
                  <Input
                    id="category"
                    value={newExam.category}
                    onChange={(e) => setNewExam({ ...newExam, category: e.target.value })}
                    placeholder="如：前端开发、后端开发等"
                  />
                </div>
                <div>
                  <Label htmlFor="description">考试描述</Label>
                  <Textarea
                    id="description"
                    value={newExam.description}
                    onChange={(e) => setNewExam({ ...newExam, description: e.target.value })}
                    placeholder="请输入考试描述"
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="difficulty">难度等级</Label>
                  <Select
                    value={newExam.difficulty}
                    onValueChange={(value) => setNewExam({ ...newExam, difficulty: value as ExamDifficulty })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择难度等级" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ExamDifficulty.BEGINNER}>初级</SelectItem>
                      <SelectItem value={ExamDifficulty.INTERMEDIATE}>中级</SelectItem>
                      <SelectItem value={ExamDifficulty.ADVANCED}>高级</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="duration">考试时长（分钟）</Label>
                    <Input
                      id="duration"
                      type="number"
                      value={newExam.duration}
                      onChange={(e) => setNewExam({ ...newExam, duration: parseInt(e.target.value) || 0 })}
                      min="1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="total_questions">题目数量</Label>
                    <Input
                      id="total_questions"
                      type="number"
                      value={newExam.total_questions}
                      onChange={(e) => setNewExam({ ...newExam, total_questions: parseInt(e.target.value) || 0 })}
                      min="1"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="total_score">总分</Label>
                    <Input
                      id="total_score"
                      type="number"
                      value={newExam.total_score}
                      onChange={(e) => setNewExam({ ...newExam, total_score: parseInt(e.target.value) || 0 })}
                      min="1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="passing_score">及格分数</Label>
                    <Input
                      id="passing_score"
                      type="number"
                      value={newExam.passing_score}
                      onChange={(e) => setNewExam({ ...newExam, passing_score: parseInt(e.target.value) || 0 })}
                      min="1"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="max_attempts">最大尝试次数</Label>
                  <Input
                    id="max_attempts"
                    type="number"
                    value={newExam.max_attempts}
                    onChange={(e) => setNewExam({ ...newExam, max_attempts: parseInt(e.target.value) || 1 })}
                    min="1"
                  />
                </div>
                <div className="flex items-center space-x-6">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_public"
                      checked={newExam.is_public}
                      onCheckedChange={(checked) => setNewExam({ ...newExam, is_public: checked })}
                    />
                    <Label htmlFor="is_public">公开考试</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="requires_approval"
                      checked={newExam.requires_approval}
                      onCheckedChange={(checked) => setNewExam({ ...newExam, requires_approval: checked })}
                    />
                    <Label htmlFor="requires_approval">需要审批</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="allow_retake"
                      checked={newExam.allow_retake}
                      onCheckedChange={(checked) => setNewExam({ ...newExam, allow_retake: checked })}
                    />
                    <Label htmlFor="allow_retake">允许重考</Label>
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowCreateDialog(false)}
                  >
                    取消
                  </Button>
                  <Button onClick={handleCreateExam}>
                    创建考试
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* 搜索和筛选 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="搜索考试标题或描述..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="max-w-sm"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as ExamStatus | 'all')}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="状态筛选" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value={ExamStatus.DRAFT}>草稿</SelectItem>
                <SelectItem value={ExamStatus.PUBLISHED}>已发布</SelectItem>
                <SelectItem value={ExamStatus.ONGOING}>进行中</SelectItem>
                <SelectItem value={ExamStatus.FINISHED}>已结束</SelectItem>
                <SelectItem value={ExamStatus.CANCELLED}>已取消</SelectItem>
              </SelectContent>
            </Select>

          </div>
        </CardContent>
      </Card>

      {/* 考试列表 */}
      <div className="space-y-4">
        <LoadingOverlay isLoading={loading} text="加载考试列表中...">
          {loading ? (
            <ExamCardSkeleton count={6} />
          ) : exams.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">暂无考试</h3>
                <p className="text-gray-600 mb-4">还没有创建任何考试，点击上方按钮创建第一个考试</p>
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  创建考试
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {exams.map(renderExamCard)}
            </div>
          )}
        </LoadingOverlay>
      </div>

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex justify-center space-x-2">
          <Button
            variant="outline"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            上一页
          </Button>
          <span className="flex items-center px-4 text-sm text-gray-600">
            第 {currentPage} 页，共 {totalPages} 页
          </span>
          <Button
            variant="outline"
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
          >
            下一页
          </Button>
        </div>
      )}

      {/* 题目管理对话框 */}
      <Dialog open={showQuestionDialog} onOpenChange={setShowQuestionDialog}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>题目管理</DialogTitle>
            <DialogDescription>
              管理考试题目，支持添加、编辑、删除和批量导入
            </DialogDescription>
          </DialogHeader>
          {selectedExamForQuestions && (
            <QuestionManagement examId={selectedExamForQuestions} />
          )}
        </DialogContent>
      </Dialog>

      {/* 统计分析对话框 */}
      <Dialog open={showAnalyticsDialog} onOpenChange={setShowAnalyticsDialog}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>考试统计分析</DialogTitle>
            <DialogDescription>
              查看考试的详细统计数据和可视化分析
            </DialogDescription>
          </DialogHeader>
          {selectedExamForAnalytics && (
            <ExamAnalytics examId={selectedExamForAnalytics} />
          )}
        </DialogContent>
      </Dialog>

      {/* 报表生成对话框 */}
      <Dialog open={showReportsDialog} onOpenChange={setShowReportsDialog}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>考试报表</DialogTitle>
            <DialogDescription>
              生成和导出各种格式的考试报表
            </DialogDescription>
          </DialogHeader>
          {selectedExamForReports && (
            <ExamReports examId={selectedExamForReports} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}