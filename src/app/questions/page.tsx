'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Search, Filter, Edit, Trash2, Eye, BookOpen, Target, Clock } from 'lucide-react';
import { QuestionForm } from '@/components/QuestionForm';
import { Question, QuestionType, QuestionDifficulty } from '@/types/question';
import { toast } from 'sonner';
import { supabase, getCurrentUser } from '@/services/supabaseClient';

/**
 * 题目管理页面组件
 * @description 显示题目列表，支持搜索、筛选、创建、编辑和删除功能
 * @returns JSX.Element
 */
const QuestionsPage: React.FC = () => {
  const router = useRouter();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [categories, setCategories] = useState<string[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [deletingQuestion, setDeletingQuestion] = useState<Question | null>(null);

  /**
   * 获取当前用户信息
   */
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const user = await getCurrentUser();
        setCurrentUser(user);
        // 这里可以根据用户角色判断是否为管理员
        // 暂时假设所有登录用户都是管理员
        setIsAdmin(!!user);
      } catch (error) {
        console.error('获取用户信息失败:', error);
      }
    };

    fetchCurrentUser();
  }, []);

  /**
   * 获取题目列表
   */
  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/questions');
      
      if (!response.ok) {
        throw new Error('获取题目列表失败');
      }

      const data = await response.json();
      setQuestions(data.questions || []);
      
      // 提取分类列表
      const uniqueCategories = Array.from(
        new Set(data.questions?.map((question: Question) => question.category).filter(Boolean))
      ) as string[];
      setCategories(uniqueCategories);
    } catch (error) {
      console.error('获取题目列表失败:', error);
      toast.error('获取题目列表失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 初始化数据
   */
  useEffect(() => {
    fetchQuestions();
  }, []);

  /**
   * 筛选题目列表
   */
  const filteredQuestions = questions.filter((question) => {
    const matchesSearch = question.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (question.explanation && question.explanation.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = selectedType === 'all' || question.type === selectedType;
    const matchesDifficulty = selectedDifficulty === 'all' || question.difficulty === selectedDifficulty;
    const matchesCategory = selectedCategory === 'all' || question.category === selectedCategory;

    return matchesSearch && matchesType && matchesDifficulty && matchesCategory;
  });

  /**
   * 处理创建题目
   * @param questionData 题目数据
   */
  const handleCreateQuestion = async (questionData: Partial<Question>) => {
    try {
      const response = await fetch('/api/questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(questionData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '创建题目失败');
      }

      toast.success('题目创建成功');
      setIsCreateDialogOpen(false);
      fetchQuestions();
    } catch (error) {
      console.error('创建题目失败:', error);
      toast.error(error instanceof Error ? error.message : '创建题目失败');
    }
  };

  /**
   * 处理编辑题目
   * @param questionData 题目数据
   */
  const handleEditQuestion = async (questionData: Partial<Question>) => {
    if (!editingQuestion) return;

    try {
      const response = await fetch(`/api/questions/${editingQuestion.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(questionData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '更新题目失败');
      }

      toast.success('题目更新成功');
      setEditingQuestion(null);
      fetchQuestions();
    } catch (error) {
      console.error('更新题目失败:', error);
      toast.error(error instanceof Error ? error.message : '更新题目失败');
    }
  };

  /**
   * 处理删除题目
   */
  const handleDeleteQuestion = async () => {
    if (!deletingQuestion) return;

    try {
      const response = await fetch(`/api/questions/${deletingQuestion.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '删除题目失败');
      }

      toast.success('题目删除成功');
      setDeletingQuestion(null);
      fetchQuestions();
    } catch (error) {
      console.error('删除题目失败:', error);
      toast.error(error instanceof Error ? error.message : '删除题目失败');
    }
  };

  /**
   * 重置筛选条件
   */
  const resetFilters = () => {
    setSearchTerm('');
    setSelectedType('all');
    setSelectedDifficulty('all');
    setSelectedCategory('all');
  };

  /**
   * 获取题目类型显示名称
   * @param type 题目类型
   * @returns 显示名称
   */
  const getTypeDisplayName = (type: QuestionType): string => {
    const typeMap = {
      [QuestionType.SINGLE_CHOICE]: '单选题',
      [QuestionType.MULTIPLE_CHOICE]: '多选题',
      [QuestionType.TRUE_FALSE]: '判断题',
      [QuestionType.FILL_BLANK]: '填空题',
      [QuestionType.SHORT_ANSWER]: '简答题',
      [QuestionType.ESSAY]: '论述题'
    };
    return typeMap[type] || type;
  };

  /**
   * 获取难度显示名称
   * @param difficulty 难度
   * @returns 显示名称
   */
  const getDifficultyDisplayName = (difficulty: QuestionDifficulty): string => {
    const difficultyMap = {
      [QuestionDifficulty.EASY]: '简单',
      [QuestionDifficulty.MEDIUM]: '中等',
      [QuestionDifficulty.HARD]: '困难'
    };
    return difficultyMap[difficulty] || difficulty;
  };

  /**
   * 获取难度颜色
   * @param difficulty 难度
   * @returns 颜色类名
   */
  const getDifficultyColor = (difficulty: QuestionDifficulty): string => {
    const colorMap = {
      [QuestionDifficulty.EASY]: 'bg-green-100 text-green-800',
      [QuestionDifficulty.MEDIUM]: 'bg-yellow-100 text-yellow-800',
      [QuestionDifficulty.HARD]: 'bg-red-100 text-red-800'
    };
    return colorMap[difficulty] || 'bg-gray-100 text-gray-800';
  };

  /**
   * 获取类型统计
   */
  const getTypeStats = () => {
    const stats = {
      total: questions.length,
      singleChoice: questions.filter(q => q.type === QuestionType.SINGLE_CHOICE).length,
      multipleChoice: questions.filter(q => q.type === QuestionType.MULTIPLE_CHOICE).length,
      trueFalse: questions.filter(q => q.type === QuestionType.TRUE_FALSE).length,
      fillBlank: questions.filter(q => q.type === QuestionType.FILL_BLANK).length,
      shortAnswer: questions.filter(q => q.type === QuestionType.SHORT_ANSWER).length,
      essay: questions.filter(q => q.type === QuestionType.ESSAY).length
    };
    return stats;
  };

  const stats = getTypeStats();

  return (
    <div className="container mx-auto px-4 py-8">
      {/* 页面标题和操作 */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">题目管理</h1>
          <p className="text-muted-foreground">
            管理考试题目，支持多种题型和难度设置
          </p>
        </div>
        {isAdmin && (
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                创建题目
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>创建新题目</DialogTitle>
              </DialogHeader>
              <QuestionForm
                onSubmit={handleCreateQuestion}
                onCancel={() => setIsCreateDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <BookOpen className="h-6 w-6 text-blue-500" />
              <div>
                <p className="text-xs text-muted-foreground">总题目</p>
                <p className="text-xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Target className="h-6 w-6 text-green-500" />
              <div>
                <p className="text-xs text-muted-foreground">单选题</p>
                <p className="text-xl font-bold">{stats.singleChoice}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Target className="h-6 w-6 text-purple-500" />
              <div>
                <p className="text-xs text-muted-foreground">多选题</p>
                <p className="text-xl font-bold">{stats.multipleChoice}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Target className="h-6 w-6 text-orange-500" />
              <div>
                <p className="text-xs text-muted-foreground">判断题</p>
                <p className="text-xl font-bold">{stats.trueFalse}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Target className="h-6 w-6 text-yellow-500" />
              <div>
                <p className="text-xs text-muted-foreground">填空题</p>
                <p className="text-xl font-bold">{stats.fillBlank}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Target className="h-6 w-6 text-cyan-500" />
              <div>
                <p className="text-xs text-muted-foreground">简答题</p>
                <p className="text-xl font-bold">{stats.shortAnswer}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Target className="h-6 w-6 text-red-500" />
              <div>
                <p className="text-xs text-muted-foreground">论述题</p>
                <p className="text-xl font-bold">{stats.essay}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 搜索和筛选 */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            筛选条件
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索题目内容..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger>
                <SelectValue placeholder="选择题型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部题型</SelectItem>
                <SelectItem value={QuestionType.SINGLE_CHOICE}>单选题</SelectItem>
                <SelectItem value={QuestionType.MULTIPLE_CHOICE}>多选题</SelectItem>
                <SelectItem value={QuestionType.TRUE_FALSE}>判断题</SelectItem>
                <SelectItem value={QuestionType.FILL_BLANK}>填空题</SelectItem>
                <SelectItem value={QuestionType.SHORT_ANSWER}>简答题</SelectItem>
                <SelectItem value={QuestionType.ESSAY}>论述题</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
              <SelectTrigger>
                <SelectValue placeholder="选择难度" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部难度</SelectItem>
                <SelectItem value={QuestionDifficulty.EASY}>简单</SelectItem>
                <SelectItem value={QuestionDifficulty.MEDIUM}>中等</SelectItem>
                <SelectItem value={QuestionDifficulty.HARD}>困难</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue placeholder="选择分类" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部分类</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">
              找到 {filteredQuestions.length} 个题目
            </p>
            <Button variant="outline" onClick={resetFilters}>
              重置筛选
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 题目列表 */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, index) => (
            <Card key={index}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Skeleton className="h-6 w-1/2" />
                  <div className="flex gap-2">
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="h-6 w-16" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-3/4" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredQuestions.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">暂无题目</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm || selectedType !== 'all' || selectedDifficulty !== 'all' || selectedCategory !== 'all'
                ? '没有找到符合条件的题目，请尝试调整筛选条件'
                : '还没有创建任何题目'}
            </p>
            {isAdmin && (
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                创建第一个题目
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredQuestions.map((question) => (
            <Card key={question.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline">
                        {getTypeDisplayName(question.type)}
                      </Badge>
                      <Badge className={getDifficultyColor(question.difficulty)}>
                        {getDifficultyDisplayName(question.difficulty)}
                      </Badge>
                      {question.category && (
                        <Badge variant="secondary">
                          {question.category}
                        </Badge>
                      )}
                      <span className="text-sm text-muted-foreground">
                        {question.points} 分
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold line-clamp-2">
                      {question.content}
                    </h3>
                  </div>
                  {isAdmin && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingQuestion(question)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDeletingQuestion(question)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>确认删除</AlertDialogTitle>
                            <AlertDialogDescription>
                              确定要删除这个题目吗？此操作无法撤销。
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => setDeletingQuestion(null)}>
                              取消
                            </AlertDialogCancel>
                            <AlertDialogAction onClick={handleDeleteQuestion}>
                              删除
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {/* 选项预览 */}
                {(question.type === QuestionType.SINGLE_CHOICE || question.type === QuestionType.MULTIPLE_CHOICE) && question.options && (
                  <div className="space-y-2">
                    {question.options.slice(0, 3).map((option, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs">
                          {String.fromCharCode(65 + index)}
                        </span>
                        <span className="line-clamp-1">{option}</span>
                      </div>
                    ))}
                    {question.options.length > 3 && (
                      <p className="text-sm text-muted-foreground">
                        还有 {question.options.length - 3} 个选项...
                      </p>
                    )}
                  </div>
                )}
                
                {/* 标签 */}
                {question.tags && question.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {question.tags.map((tag, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 编辑题目对话框 */}
      {editingQuestion && (
        <Dialog open={!!editingQuestion} onOpenChange={() => setEditingQuestion(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>编辑题目</DialogTitle>
            </DialogHeader>
            <QuestionForm
              question={editingQuestion}
              onSubmit={handleEditQuestion}
              onCancel={() => setEditingQuestion(null)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default QuestionsPage;