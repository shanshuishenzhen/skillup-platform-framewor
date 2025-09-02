'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Edit, Trash2, Eye } from 'lucide-react';
import { Question, QuestionType, QuestionDifficulty, CreateQuestionRequest } from '@/types/question';
import { toast } from 'sonner';

/**
 * 题目管理页面组件
 * 提供题目的增删改查功能，包括题目列表展示、创建、编辑和删除
 */
export default function QuestionsPage() {
  // 状态管理
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<QuestionType | 'all'>('all');
  const [filterDifficulty, setFilterDifficulty] = useState<QuestionDifficulty | 'all'>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  
  // 表单状态
  const [formData, setFormData] = useState<Partial<CreateQuestionRequest>>({
    title: '',
    content: '',
    type: 'choice',
    difficulty: 'medium',
    points: 1,
    options: [{ text: '', is_correct: false }],
    correct_answer: '',
    explanation: ''
  });

  /**
   * 获取题目列表
   */
  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/questions');
      const result = await response.json();
      
      if (result.success) {
        setQuestions(result.data || []);
      } else {
        toast.error('获取题目列表失败');
      }
    } catch (error) {
      console.error('获取题目列表失败:', error);
      toast.error('获取题目列表失败');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 创建新题目
   */
  const handleCreateQuestion = async () => {
    try {
      const response = await fetch('/api/questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast.success('题目创建成功');
        setIsCreateDialogOpen(false);
        resetForm();
        fetchQuestions();
      } else {
        toast.error(result.error || '创建题目失败');
      }
    } catch (error) {
      console.error('创建题目失败:', error);
      toast.error('创建题目失败');
    }
  };

  /**
   * 更新题目
   */
  const handleUpdateQuestion = async () => {
    if (!selectedQuestion) return;
    
    try {
      const response = await fetch(`/api/questions/${selectedQuestion.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast.success('题目更新成功');
        setIsEditDialogOpen(false);
        setSelectedQuestion(null);
        resetForm();
        fetchQuestions();
      } else {
        toast.error(result.error || '更新题目失败');
      }
    } catch (error) {
      console.error('更新题目失败:', error);
      toast.error('更新题目失败');
    }
  };

  /**
   * 删除题目
   */
  const handleDeleteQuestion = async (questionId: string) => {
    if (!confirm('确定要删除这个题目吗？此操作不可撤销。')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/questions/${questionId}`, {
        method: 'DELETE',
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast.success('题目删除成功');
        fetchQuestions();
      } else {
        toast.error(result.error || '删除题目失败');
      }
    } catch (error) {
      console.error('删除题目失败:', error);
      toast.error('删除题目失败');
    }
  };

  /**
   * 重置表单
   */
  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      type: 'choice',
      difficulty: 'medium',
      points: 1,
      options: [{ text: '', is_correct: false }],
      correct_answer: '',
      explanation: ''
    });
  };

  /**
   * 打开编辑对话框
   */
  const openEditDialog = (question: Question) => {
    setSelectedQuestion(question);
    setFormData({
      title: question.title,
      content: question.content,
      type: question.type,
      difficulty: question.difficulty,
      points: question.points,
      options: question.options || [{ text: '', is_correct: false }],
      correct_answer: question.correct_answer || '',
      explanation: question.explanation || ''
    });
    setIsEditDialogOpen(true);
  };

  /**
   * 过滤题目列表
   */
  const filteredQuestions = questions.filter(question => {
    const matchesSearch = question.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         question.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || question.type === filterType;
    const matchesDifficulty = filterDifficulty === 'all' || question.difficulty === filterDifficulty;
    
    return matchesSearch && matchesType && matchesDifficulty;
  });

  /**
   * 获取题目类型显示文本
   */
  const getTypeText = (type: QuestionType) => {
    const typeMap = {
      choice: '单选题',
      multiple_choice: '多选题',
      true_false: '判断题',
      fill_blank: '填空题',
      short_answer: '简答题',
      coding: '编程题'
    };
    return typeMap[type] || type;
  };

  /**
   * 获取难度显示文本和颜色
   */
  const getDifficultyInfo = (difficulty: QuestionDifficulty) => {
    const difficultyMap = {
      easy: { text: '简单', color: 'bg-green-100 text-green-800' },
      medium: { text: '中等', color: 'bg-yellow-100 text-yellow-800' },
      hard: { text: '困难', color: 'bg-red-100 text-red-800' }
    };
    return difficultyMap[difficulty] || { text: difficulty, color: 'bg-gray-100 text-gray-800' };
  };

  // 组件挂载时获取数据
  useEffect(() => {
    fetchQuestions();
  }, []);

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">题目管理</h1>
          <p className="text-gray-600 mt-2">管理考试题目，包括创建、编辑和删除题目</p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="w-4 h-4 mr-2" />
              创建题目
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>创建新题目</DialogTitle>
              <DialogDescription>
                填写题目信息，创建新的考试题目
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">题目标题</label>
                <Input
                  value={formData.title || ''}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="请输入题目标题"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">题目内容</label>
                <Textarea
                  value={formData.content || ''}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="请输入题目内容"
                  rows={4}
                />
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">题目类型</label>
                  <Select
                    value={formData.type}
                    onValueChange={(value: QuestionType) => setFormData({ ...formData, type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="choice">单选题</SelectItem>
                      <SelectItem value="multiple_choice">多选题</SelectItem>
                      <SelectItem value="true_false">判断题</SelectItem>
                      <SelectItem value="fill_blank">填空题</SelectItem>
                      <SelectItem value="short_answer">简答题</SelectItem>
                      <SelectItem value="coding">编程题</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">难度</label>
                  <Select
                    value={formData.difficulty}
                    onValueChange={(value: QuestionDifficulty) => setFormData({ ...formData, difficulty: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy">简单</SelectItem>
                      <SelectItem value="medium">中等</SelectItem>
                      <SelectItem value="hard">困难</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">分值</label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.points || 1}
                    onChange={(e) => setFormData({ ...formData, points: parseInt(e.target.value) || 1 })}
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  取消
                </Button>
                <Button onClick={handleCreateQuestion}>
                  创建题目
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* 搜索和过滤 */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="搜索题目标题或内容..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={filterType} onValueChange={(value: QuestionType | 'all') => setFilterType(value)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="题目类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部类型</SelectItem>
                <SelectItem value="choice">单选题</SelectItem>
                <SelectItem value="multiple_choice">多选题</SelectItem>
                <SelectItem value="true_false">判断题</SelectItem>
                <SelectItem value="fill_blank">填空题</SelectItem>
                <SelectItem value="short_answer">简答题</SelectItem>
                <SelectItem value="coding">编程题</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={filterDifficulty} onValueChange={(value: QuestionDifficulty | 'all') => setFilterDifficulty(value)}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="难度" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部难度</SelectItem>
                <SelectItem value="easy">简单</SelectItem>
                <SelectItem value="medium">中等</SelectItem>
                <SelectItem value="hard">困难</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 题目列表 */}
      <Card>
        <CardHeader>
          <CardTitle>题目列表</CardTitle>
          <CardDescription>
            共 {filteredQuestions.length} 个题目
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">加载中...</p>
            </div>
          ) : filteredQuestions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600">暂无题目数据</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>题目标题</TableHead>
                  <TableHead>类型</TableHead>
                  <TableHead>难度</TableHead>
                  <TableHead>分值</TableHead>
                  <TableHead>创建时间</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredQuestions.map((question) => {
                  const difficultyInfo = getDifficultyInfo(question.difficulty);
                  return (
                    <TableRow key={question.id}>
                      <TableCell className="font-medium">
                        <div>
                          <div className="font-medium">{question.title}</div>
                          <div className="text-sm text-gray-600 truncate max-w-xs">
                            {question.content}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {getTypeText(question.type)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={difficultyInfo.color}>
                          {difficultyInfo.text}
                        </Badge>
                      </TableCell>
                      <TableCell>{question.points} 分</TableCell>
                      <TableCell>
                        {new Date(question.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(question)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteQuestion(question.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 编辑对话框 */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>编辑题目</DialogTitle>
            <DialogDescription>
              修改题目信息
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">题目标题</label>
              <Input
                value={formData.title || ''}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="请输入题目标题"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">题目内容</label>
              <Textarea
                value={formData.content || ''}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="请输入题目内容"
                rows={4}
              />
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">题目类型</label>
                <Select
                  value={formData.type}
                  onValueChange={(value: QuestionType) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="choice">单选题</SelectItem>
                    <SelectItem value="multiple_choice">多选题</SelectItem>
                    <SelectItem value="true_false">判断题</SelectItem>
                    <SelectItem value="fill_blank">填空题</SelectItem>
                    <SelectItem value="short_answer">简答题</SelectItem>
                    <SelectItem value="coding">编程题</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">难度</label>
                <Select
                  value={formData.difficulty}
                  onValueChange={(value: QuestionDifficulty) => setFormData({ ...formData, difficulty: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">简单</SelectItem>
                    <SelectItem value="medium">中等</SelectItem>
                    <SelectItem value="hard">困难</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">分值</label>
                <Input
                  type="number"
                  min="1"
                  value={formData.points || 1}
                  onChange={(e) => setFormData({ ...formData, points: parseInt(e.target.value) || 1 })}
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleUpdateQuestion}>
                更新题目
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}