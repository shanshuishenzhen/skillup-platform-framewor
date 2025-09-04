'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Edit, Trash2, Search, Filter, Upload, Download } from 'lucide-react';
import { toast } from 'sonner';
import { Question, QuestionType } from '@/types/question';
import { ExamDifficulty } from '@/types/exam';
import QuestionImport from './QuestionImport';

interface QuestionManagementProps {
  examId: string;
}

interface QuestionFormData {
  type: QuestionType;
  content: string;
  options: string[];
  correct_answer: string | string[];
  explanation: string;
  difficulty: ExamDifficulty;
  score: number;
  tags: string[];
}

interface QuestionFilters {
  type?: QuestionType;
  difficulty?: ExamDifficulty;
  search?: string;
  tags?: string[];
}

/**
 * 题目管理组件
 * 提供题目的增删改查、批量操作等功能
 * @param examId 考试ID
 */
export default function QuestionManagement({ examId }: QuestionManagementProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
  const [filters, setFilters] = useState<QuestionFilters>({});
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [formData, setFormData] = useState<QuestionFormData>({
    type: QuestionType.SINGLE_CHOICE,
    content: '',
    options: ['', '', '', ''],
    correct_answer: '',
    explanation: '',
    difficulty: ExamDifficulty.INTERMEDIATE,
    score: 1,
    tags: []
  });

  /**
   * 加载题目列表
   */
  const loadQuestions = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/exams/${examId}/questions`);
      if (response.ok) {
        const data = await response.json();
        setQuestions(data.questions || []);
      } else {
        toast.error('加载题目失败');
      }
    } catch (error) {
      toast.error('加载题目时发生错误');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 重置表单数据
   */
  const resetForm = () => {
    setFormData({
      type: QuestionType.SINGLE_CHOICE,
      content: '',
      options: ['', '', '', ''],
      correct_answer: '',
      explanation: '',
      difficulty: ExamDifficulty.INTERMEDIATE,
      score: 1,
      tags: []
    });
  };

  /**
   * 处理创建题目
   */
  const handleCreateQuestion = async () => {
    try {
      const response = await fetch(`/api/exams/${examId}/questions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          options: formData.options.filter(opt => opt.trim())
        })
      });

      if (response.ok) {
        toast.success('题目创建成功');
        setShowCreateDialog(false);
        resetForm();
        loadQuestions();
      } else {
        const error = await response.json();
        toast.error(error.message || '创建题目失败');
      }
    } catch (error) {
      toast.error('创建题目时发生错误');
    }
  };

  /**
   * 处理编辑题目
   */
  const handleEditQuestion = async () => {
    if (!editingQuestion) return;

    try {
      const response = await fetch(`/api/exams/${examId}/questions/${editingQuestion.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          options: formData.options.filter(opt => opt.trim())
        })
      });

      if (response.ok) {
        toast.success('题目更新成功');
        setShowEditDialog(false);
        setEditingQuestion(null);
        resetForm();
        loadQuestions();
      } else {
        const error = await response.json();
        toast.error(error.message || '更新题目失败');
      }
    } catch (error) {
      toast.error('更新题目时发生错误');
    }
  };

  /**
   * 处理删除题目
   * @param questionId 题目ID
   */
  const handleDeleteQuestion = async (questionId: string) => {
    try {
      const response = await fetch(`/api/exams/${examId}/questions/${questionId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast.success('题目删除成功');
        loadQuestions();
      } else {
        toast.error('删除题目失败');
      }
    } catch (error) {
      toast.error('删除题目时发生错误');
    }
  };

  /**
   * 处理批量删除
   */
  const handleBatchDelete = async () => {
    if (selectedQuestions.length === 0) {
      toast.error('请选择要删除的题目');
      return;
    }

    try {
      const promises = selectedQuestions.map(id => 
        fetch(`/api/exams/${examId}/questions/${id}`, { method: 'DELETE' })
      );
      
      await Promise.all(promises);
      toast.success(`成功删除 ${selectedQuestions.length} 道题目`);
      setSelectedQuestions([]);
      loadQuestions();
    } catch (error) {
      toast.error('批量删除失败');
    }
  };

  /**
   * 开始编辑题目
   * @param question 题目数据
   */
  const startEdit = (question: Question) => {
    setEditingQuestion(question);
    setFormData({
      type: question.type,
      content: question.content,
      options: question.options || ['', '', '', ''],
      correct_answer: question.correct_answer,
      explanation: question.explanation || '',
      difficulty: question.difficulty,
      score: question.score,
      tags: question.tags || []
    });
    setShowEditDialog(true);
  };

  /**
   * 处理选项变更
   * @param index 选项索引
   * @param value 选项值
   */
  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...formData.options];
    newOptions[index] = value;
    setFormData({ ...formData, options: newOptions });
  };

  /**
   * 添加选项
   */
  const addOption = () => {
    setFormData({
      ...formData,
      options: [...formData.options, '']
    });
  };

  /**
   * 删除选项
   * @param index 选项索引
   */
  const removeOption = (index: number) => {
    if (formData.options.length <= 2) {
      toast.error('至少需要保留2个选项');
      return;
    }
    const newOptions = formData.options.filter((_, i) => i !== index);
    setFormData({ ...formData, options: newOptions });
  };

  /**
   * 处理标签输入
   * @param value 标签字符串
   */
  const handleTagsChange = (value: string) => {
    const tags = value.split(',').map(tag => tag.trim()).filter(tag => tag);
    setFormData({ ...formData, tags });
  };

  /**
   * 导出题目
   */
  const exportQuestions = () => {
    const exportData = questions.map(q => ({
      type: q.type,
      content: q.content,
      options: q.options,
      correct_answer: q.correct_answer,
      explanation: q.explanation,
      difficulty: q.difficulty,
      score: q.score,
      tags: q.tags
    }));

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `exam_${examId}_questions.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  /**
   * 过滤题目
   */
  const filteredQuestions = questions.filter(question => {
    if (filters.type && question.type !== filters.type) return false;
    if (filters.difficulty && question.difficulty !== filters.difficulty) return false;
    if (filters.search && !question.content.toLowerCase().includes(filters.search.toLowerCase())) return false;
    if (filters.tags && filters.tags.length > 0) {
      const questionTags = question.tags || [];
      if (!filters.tags.some(tag => questionTags.includes(tag))) return false;
    }
    return true;
  });

  /**
   * 获取题目类型显示文本
   * @param type 题目类型
   */
  const getTypeText = (type: QuestionType) => {
    const typeMap = {
      [QuestionType.SINGLE_CHOICE]: '单选题',
      [QuestionType.MULTIPLE_CHOICE]: '多选题',
      [QuestionType.TRUE_FALSE]: '判断题',
      [QuestionType.FILL_BLANK]: '填空题',
      [QuestionType.ESSAY]: '问答题'
    };
    return typeMap[type] || type;
  };

  /**
   * 获取难度显示文本
   * @param difficulty 难度等级
   */
  const getDifficultyText = (difficulty: ExamDifficulty) => {
    const difficultyMap = {
      [ExamDifficulty.BEGINNER]: '初级',
      [ExamDifficulty.INTERMEDIATE]: '中级',
      [ExamDifficulty.ADVANCED]: '高级'
    };
    return difficultyMap[difficulty] || difficulty;
  };

  useEffect(() => {
    loadQuestions();
  }, [examId]);

  return (
    <div className="space-y-6">
      {/* 操作栏 */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex flex-wrap gap-2">
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                创建题目
              </Button>
            </DialogTrigger>
          </Dialog>
          
          <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                批量导入
              </Button>
            </DialogTrigger>
          </Dialog>
          
          <Button
            variant="outline"
            onClick={exportQuestions}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            导出题目
          </Button>
          
          {selectedQuestions.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="flex items-center gap-2">
                  <Trash2 className="h-4 w-4" />
                  删除选中 ({selectedQuestions.length})
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>确认删除</AlertDialogTitle>
                  <AlertDialogDescription>
                    确定要删除选中的 {selectedQuestions.length} 道题目吗？此操作不可撤销。
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>取消</AlertDialogCancel>
                  <AlertDialogAction onClick={handleBatchDelete}>
                    确认删除
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
        
        {/* 搜索和过滤 */}
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索题目内容..."
              value={filters.search || ''}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="pl-10 w-64"
            />
          </div>
          
          <Select
            value={filters.type || ''}
            onValueChange={(value) => setFilters({ ...filters, type: value as QuestionType || undefined })}
          >
            <SelectTrigger className="w-32">
              <SelectValue placeholder="题目类型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">全部类型</SelectItem>
              <SelectItem value={QuestionType.SINGLE_CHOICE}>单选题</SelectItem>
              <SelectItem value={QuestionType.MULTIPLE_CHOICE}>多选题</SelectItem>
              <SelectItem value={QuestionType.TRUE_FALSE}>判断题</SelectItem>
              <SelectItem value={QuestionType.FILL_BLANK}>填空题</SelectItem>
              <SelectItem value={QuestionType.ESSAY}>问答题</SelectItem>
            </SelectContent>
          </Select>
          
          <Select
            value={filters.difficulty || ''}
            onValueChange={(value) => setFilters({ ...filters, difficulty: value as ExamDifficulty || undefined })}
          >
            <SelectTrigger className="w-32">
              <SelectValue placeholder="难度等级" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">全部难度</SelectItem>
              <SelectItem value={ExamDifficulty.BEGINNER}>初级</SelectItem>
              <SelectItem value={ExamDifficulty.INTERMEDIATE}>中级</SelectItem>
              <SelectItem value={ExamDifficulty.ADVANCED}>高级</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 题目列表 */}
      <Card>
        <CardHeader>
          <CardTitle>题目列表 ({filteredQuestions.length})</CardTitle>
          <CardDescription>
            管理考试题目，支持创建、编辑、删除和批量操作
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">加载中...</div>
          ) : filteredQuestions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              暂无题目数据
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedQuestions.length === filteredQuestions.length}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedQuestions(filteredQuestions.map(q => q.id));
                        } else {
                          setSelectedQuestions([]);
                        }
                      }}
                    />
                  </TableHead>
                  <TableHead>题目内容</TableHead>
                  <TableHead>类型</TableHead>
                  <TableHead>难度</TableHead>
                  <TableHead>分数</TableHead>
                  <TableHead>标签</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredQuestions.map((question) => (
                  <TableRow key={question.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedQuestions.includes(question.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedQuestions([...selectedQuestions, question.id]);
                          } else {
                            setSelectedQuestions(selectedQuestions.filter(id => id !== question.id));
                          }
                        }}
                      />
                    </TableCell>
                    <TableCell className="max-w-md">
                      <div className="truncate" title={question.content}>
                        {question.content}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {getTypeText(question.type)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={question.difficulty === ExamDifficulty.BEGINNER ? 'secondary' :
                                question.difficulty === ExamDifficulty.INTERMEDIATE ? 'default' : 'destructive'}
                      >
                        {getDifficultyText(question.difficulty)}
                      </Badge>
                    </TableCell>
                    <TableCell>{question.score}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(question.tags || []).slice(0, 2).map((tag, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {(question.tags || []).length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{(question.tags || []).length - 2}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => startEdit(question)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>确认删除</AlertDialogTitle>
                              <AlertDialogDescription>
                                确定要删除这道题目吗？此操作不可撤销。
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>取消</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteQuestion(question.id)}>
                                确认删除
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 创建题目对话框 */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>创建题目</DialogTitle>
            <DialogDescription>
              创建新的考试题目
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* 基本信息 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>题目类型</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: QuestionType) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={QuestionType.SINGLE_CHOICE}>单选题</SelectItem>
                    <SelectItem value={QuestionType.MULTIPLE_CHOICE}>多选题</SelectItem>
                    <SelectItem value={QuestionType.TRUE_FALSE}>判断题</SelectItem>
                    <SelectItem value={QuestionType.FILL_BLANK}>填空题</SelectItem>
                    <SelectItem value={QuestionType.ESSAY}>问答题</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>难度等级</Label>
                <Select
                  value={formData.difficulty}
                  onValueChange={(value: ExamDifficulty) => setFormData({ ...formData, difficulty: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ExamDifficulty.BEGINNER}>初级</SelectItem>
                    <SelectItem value={ExamDifficulty.INTERMEDIATE}>中级</SelectItem>
                    <SelectItem value={ExamDifficulty.ADVANCED}>高级</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>题目内容</Label>
              <Textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="请输入题目内容..."
                rows={3}
              />
            </div>
            
            {/* 选择题选项 */}
            {[QuestionType.SINGLE_CHOICE, QuestionType.MULTIPLE_CHOICE].includes(formData.type) && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>选项</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addOption}>
                    添加选项
                  </Button>
                </div>
                <div className="space-y-2">
                  {formData.options.map((option, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={option}
                        onChange={(e) => handleOptionChange(index, e.target.value)}
                        placeholder={`选项 ${String.fromCharCode(65 + index)}`}
                      />
                      {formData.options.length > 2 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeOption(index)}
                        >
                          删除
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>正确答案</Label>
                {formData.type === QuestionType.TRUE_FALSE ? (
                  <Select
                    value={String(formData.correct_answer)}
                    onValueChange={(value) => setFormData({ ...formData, correct_answer: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">正确</SelectItem>
                      <SelectItem value="false">错误</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={Array.isArray(formData.correct_answer) ? formData.correct_answer.join(';') : formData.correct_answer}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (formData.type === QuestionType.MULTIPLE_CHOICE) {
                        setFormData({ ...formData, correct_answer: value.split(';') });
                      } else {
                        setFormData({ ...formData, correct_answer: value });
                      }
                    }}
                    placeholder={formData.type === QuestionType.MULTIPLE_CHOICE ? '多个答案用分号分隔' : '请输入正确答案'}
                  />
                )}
              </div>
              
              <div className="space-y-2">
                <Label>分数</Label>
                <Input
                  type="number"
                  min="1"
                  value={formData.score}
                  onChange={(e) => setFormData({ ...formData, score: parseInt(e.target.value) || 1 })}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>解析</Label>
              <Textarea
                value={formData.explanation}
                onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
                placeholder="请输入题目解析（可选）..."
                rows={2}
              />
            </div>
            
            <div className="space-y-2">
              <Label>标签</Label>
              <Input
                value={formData.tags.join(', ')}
                onChange={(e) => handleTagsChange(e.target.value)}
                placeholder="请输入标签，用逗号分隔..."
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              取消
            </Button>
            <Button onClick={handleCreateQuestion}>
              创建题目
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 编辑题目对话框 */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>编辑题目</DialogTitle>
            <DialogDescription>
              修改题目信息
            </DialogDescription>
          </DialogHeader>
          
          {/* 表单内容与创建对话框相同 */}
          <div className="space-y-4">
            {/* 基本信息 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>题目类型</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: QuestionType) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={QuestionType.SINGLE_CHOICE}>单选题</SelectItem>
                    <SelectItem value={QuestionType.MULTIPLE_CHOICE}>多选题</SelectItem>
                    <SelectItem value={QuestionType.TRUE_FALSE}>判断题</SelectItem>
                    <SelectItem value={QuestionType.FILL_BLANK}>填空题</SelectItem>
                    <SelectItem value={QuestionType.ESSAY}>问答题</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>难度等级</Label>
                <Select
                  value={formData.difficulty}
                  onValueChange={(value: ExamDifficulty) => setFormData({ ...formData, difficulty: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ExamDifficulty.BEGINNER}>初级</SelectItem>
                    <SelectItem value={ExamDifficulty.INTERMEDIATE}>中级</SelectItem>
                    <SelectItem value={ExamDifficulty.ADVANCED}>高级</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>题目内容</Label>
              <Textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="请输入题目内容..."
                rows={3}
              />
            </div>
            
            {/* 选择题选项 */}
            {[QuestionType.SINGLE_CHOICE, QuestionType.MULTIPLE_CHOICE].includes(formData.type) && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>选项</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addOption}>
                    添加选项
                  </Button>
                </div>
                <div className="space-y-2">
                  {formData.options.map((option, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={option}
                        onChange={(e) => handleOptionChange(index, e.target.value)}
                        placeholder={`选项 ${String.fromCharCode(65 + index)}`}
                      />
                      {formData.options.length > 2 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeOption(index)}
                        >
                          删除
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>正确答案</Label>
                {formData.type === QuestionType.TRUE_FALSE ? (
                  <Select
                    value={String(formData.correct_answer)}
                    onValueChange={(value) => setFormData({ ...formData, correct_answer: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">正确</SelectItem>
                      <SelectItem value="false">错误</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={Array.isArray(formData.correct_answer) ? formData.correct_answer.join(';') : formData.correct_answer}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (formData.type === QuestionType.MULTIPLE_CHOICE) {
                        setFormData({ ...formData, correct_answer: value.split(';') });
                      } else {
                        setFormData({ ...formData, correct_answer: value });
                      }
                    }}
                    placeholder={formData.type === QuestionType.MULTIPLE_CHOICE ? '多个答案用分号分隔' : '请输入正确答案'}
                  />
                )}
              </div>
              
              <div className="space-y-2">
                <Label>分数</Label>
                <Input
                  type="number"
                  min="1"
                  value={formData.score}
                  onChange={(e) => setFormData({ ...formData, score: parseInt(e.target.value) || 1 })}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>解析</Label>
              <Textarea
                value={formData.explanation}
                onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
                placeholder="请输入题目解析（可选）..."
                rows={2}
              />
            </div>
            
            <div className="space-y-2">
              <Label>标签</Label>
              <Input
                value={formData.tags.join(', ')}
                onChange={(e) => handleTagsChange(e.target.value)}
                placeholder="请输入标签，用逗号分隔..."
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              取消
            </Button>
            <Button onClick={handleEditQuestion}>
              保存修改
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 批量导入对话框 */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>批量导入题目</DialogTitle>
            <DialogDescription>
              支持CSV、JSON格式的题目批量导入
            </DialogDescription>
          </DialogHeader>
          
          <QuestionImport
            examId={examId}
            onImportComplete={(count) => {
              setShowImportDialog(false);
              loadQuestions();
            }}
          />
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImportDialog(false)}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}