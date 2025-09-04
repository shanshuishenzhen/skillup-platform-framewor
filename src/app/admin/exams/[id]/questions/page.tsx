'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { 
  Plus, 
  Edit, 
  Trash2, 
  ArrowLeft, 
  Save, 
  Eye, 
  Copy,
  Move,
  FileText,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { ExamService, type Exam } from '@/services/examService';
import { QuestionType, type Question, type QuestionOption } from '@/types/question';
import { ExamDifficulty } from '@/types/exam';

/**
 * 题目管理页面
 * 管理指定考试的题目
 */
export default function QuestionManagementPage() {
  const params = useParams();
  const router = useRouter();
  const examId = params.id as string;
  
  const [exam, setExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);

  // 新建题目表单状态
  const [newQuestion, setNewQuestion] = useState({
    type: QuestionType.SINGLE_CHOICE,
    title: '',
    content: '',
    options: [] as QuestionOption[],
    correct_answer: '',
    score: 10,
    difficulty: ExamDifficulty.BEGINNER,
    explanation: '',
    tags: [] as string[],
    skills: [] as string[],
    time_limit: undefined as number | undefined
  });

  /**
   * 加载考试信息
   */
  const loadExam = async () => {
    try {
      const examData = await ExamService.getExamById(examId);
      setExam(examData);
    } catch (error) {
      console.error('加载考试信息失败:', error);
      toast.error('加载考试信息失败');
    }
  };

  /**
   * 加载题目列表
   */
  const loadQuestions = async () => {
    try {
      setLoading(true);
      const questionsData = await ExamService.getExamQuestions(examId, true);
      setQuestions(questionsData);
    } catch (error) {
      console.error('加载题目列表失败:', error);
      toast.error('加载题目列表失败');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 创建题目
   */
  const handleCreateQuestion = async () => {
    try {
      // TODO: 实现创建题目API调用
      console.log('创建题目:', newQuestion);
      toast.success('题目创建成功');
      setShowCreateDialog(false);
      resetNewQuestionForm();
      loadQuestions();
    } catch (error) {
      console.error('创建题目失败:', error);
      toast.error('创建题目失败');
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
      // TODO: 实现删除题目API调用
      console.log('删除题目:', questionId);
      toast.success('题目删除成功');
      loadQuestions();
    } catch (error) {
      console.error('删除题目失败:', error);
      toast.error('删除题目失败');
    }
  };

  /**
   * 重置新建题目表单
   */
  const resetNewQuestionForm = () => {
    setNewQuestion({
      type: QuestionType.SINGLE_CHOICE,
      title: '',
      content: '',
      options: [],
      correct_answer: '',
      score: 10,
      difficulty: ExamDifficulty.BEGINNER,
      explanation: '',
      tags: [],
      skills: [],
      time_limit: undefined
    });
  };

  /**
   * 添加选项
   */
  const addOption = () => {
    const newOption: QuestionOption = {
      id: `option_${Date.now()}`,
      text: '',
      isCorrect: false
    };
    setNewQuestion({
      ...newQuestion,
      options: [...newQuestion.options, newOption]
    });
  };

  /**
   * 更新选项
   */
  const updateOption = (index: number, field: keyof QuestionOption, value: any) => {
    const updatedOptions = [...newQuestion.options];
    updatedOptions[index] = {
      ...updatedOptions[index],
      [field]: value
    };
    
    // 如果是单选题，确保只有一个正确答案
    if (field === 'isCorrect' && value && newQuestion.type === QuestionType.SINGLE_CHOICE) {
      updatedOptions.forEach((option, i) => {
        if (i !== index) {
          option.isCorrect = false;
        }
      });
    }
    
    setNewQuestion({
      ...newQuestion,
      options: updatedOptions
    });
  };

  /**
   * 删除选项
   */
  const removeOption = (index: number) => {
    const updatedOptions = newQuestion.options.filter((_, i) => i !== index);
    setNewQuestion({
      ...newQuestion,
      options: updatedOptions
    });
  };

  /**
   * 获取题目类型显示文本
   */
  const getQuestionTypeText = (type: QuestionType) => {
    const typeMap = {
      [QuestionType.SINGLE_CHOICE]: '单选题',
      [QuestionType.MULTIPLE_CHOICE]: '多选题',
      [QuestionType.TRUE_FALSE]: '判断题',
      [QuestionType.FILL_BLANK]: '填空题',
      [QuestionType.SHORT_ANSWER]: '简答题',
      [QuestionType.CODING]: '编程题'
    };
    return typeMap[type] || type;
  };

  /**
   * 获取难度显示文本
   */
  const getDifficultyText = (difficulty: ExamDifficulty) => {
    const difficultyMap = {
      [ExamDifficulty.BEGINNER]: '初级',
      [ExamDifficulty.INTERMEDIATE]: '中级',
      [ExamDifficulty.ADVANCED]: '高级',
      [ExamDifficulty.EXPERT]: '专家级'
    };
    return difficultyMap[difficulty] || difficulty;
  };

  /**
   * 获取难度颜色
   */
  const getDifficultyColor = (difficulty: ExamDifficulty) => {
    const colorMap = {
      [ExamDifficulty.BEGINNER]: 'bg-green-100 text-green-800',
      [ExamDifficulty.INTERMEDIATE]: 'bg-yellow-100 text-yellow-800',
      [ExamDifficulty.ADVANCED]: 'bg-red-100 text-red-800'
    };
    return colorMap[difficulty] || 'bg-gray-100 text-gray-800';
  };

  /**
   * 渲染题目选项
   */
  const renderQuestionOptions = (question: Question) => {
    if (!question.options || question.options.length === 0) {
      return null;
    }

    return (
      <div className="space-y-2">
        {question.options.map((option, index) => (
          <div key={option.id} className="flex items-center space-x-2">
            {option.is_correct ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <XCircle className="h-4 w-4 text-gray-400" />
            )}
            <span className="text-sm">
              {String.fromCharCode(65 + index)}. {option.text}
            </span>
          </div>
        ))}
      </div>
    );
  };

  /**
   * 渲染题目卡片
   */
  const renderQuestionCard = (question: Question, index: number) => (
    <Card key={question.id} className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline">
                第 {index + 1} 题
              </Badge>
              <Badge variant="secondary">
                {getQuestionTypeText(question.type)}
              </Badge>
              <Badge className={getDifficultyColor(question.difficulty)}>
                {getDifficultyText(question.difficulty)}
              </Badge>
              <span className="text-sm text-gray-600">
                {question.score} 分
              </span>
            </div>
            <CardTitle className="text-lg">{question.title}</CardTitle>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditingQuestion(question)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDeleteQuestion(question.id)}
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="text-sm text-gray-700">
            {question.content}
          </div>
          
          {renderQuestionOptions(question)}
          
          {question.explanation && (
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>解析：</strong>{question.explanation}
              </p>
            </div>
          )}
          
          {(question.tags.length > 0 || question.skills.length > 0) && (
            <div className="flex flex-wrap gap-1">
              {question.tags.map((tag, i) => (
                <Badge key={i} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {question.skills.map((skill, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {skill}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  /**
   * 渲染题目类型特定的表单字段
   */
  const renderQuestionTypeFields = () => {
    switch (newQuestion.type) {
      case QuestionType.SINGLE_CHOICE:
      case QuestionType.MULTIPLE_CHOICE:
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>选项设置</Label>
              <Button type="button" variant="outline" size="sm" onClick={addOption}>
                <Plus className="h-4 w-4 mr-1" />
                添加选项
              </Button>
            </div>
            <div className="space-y-2">
              {newQuestion.options.map((option, index) => (
                <div key={option.id} className="flex items-center space-x-2">
                  <span className="text-sm font-medium w-8">
                    {String.fromCharCode(65 + index)}.
                  </span>
                  <Input
                    value={option.text}
                    onChange={(e) => updateOption(index, 'text', e.target.value)}
                    placeholder={`选项 ${String.fromCharCode(65 + index)}`}
                    className="flex-1"
                  />
                  <div className="flex items-center space-x-1">
                    <input
                      type={newQuestion.type === QuestionType.SINGLE_CHOICE ? 'radio' : 'checkbox'}
                      name="correct_option"
                      checked={option.is_correct}
                      onChange={(e) => updateOption(index, 'is_correct', e.target.checked)}
                      className="h-4 w-4"
                    />
                    <Label className="text-xs">正确</Label>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeOption(index)}
                    className="text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        );
      
      case QuestionType.TRUE_FALSE:
        return (
          <div>
            <Label>正确答案</Label>
            <Select
              value={newQuestion.correct_answer}
              onValueChange={(value) => setNewQuestion({ ...newQuestion, correct_answer: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="选择正确答案" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">正确</SelectItem>
                <SelectItem value="false">错误</SelectItem>
              </SelectContent>
            </Select>
          </div>
        );
      
      case QuestionType.FILL_BLANK:
      case QuestionType.SHORT_ANSWER:
        return (
          <div>
            <Label htmlFor="correct_answer">参考答案</Label>
            <Textarea
              id="correct_answer"
              value={newQuestion.correct_answer}
              onChange={(e) => setNewQuestion({ ...newQuestion, correct_answer: e.target.value })}
              placeholder="请输入参考答案"
              rows={3}
            />
          </div>
        );
      
      default:
        return null;
    }
  };

  useEffect(() => {
    if (examId) {
      loadExam();
      loadQuestions();
    }
  }, [examId]);

  if (!exam) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* 页面头部 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{exam.title} - 题目管理</h1>
            <p className="text-gray-600 mt-1">
              {exam.category} · {getDifficultyText(exam.difficulty)} · 共 {questions.length} 题
            </p>
          </div>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              添加题目
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>添加新题目</DialogTitle>
              <DialogDescription>
                为考试 "{exam.title}" 添加新题目
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="type">题目类型</Label>
                  <Select
                    value={newQuestion.type}
                    onValueChange={(value) => setNewQuestion({ ...newQuestion, type: value as QuestionType, options: [] })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={QuestionType.SINGLE_CHOICE}>单选题</SelectItem>
                      <SelectItem value={QuestionType.MULTIPLE_CHOICE}>多选题</SelectItem>
                      <SelectItem value={QuestionType.TRUE_FALSE}>判断题</SelectItem>
                      <SelectItem value={QuestionType.FILL_BLANK}>填空题</SelectItem>
                      <SelectItem value={QuestionType.SHORT_ANSWER}>问答题</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="difficulty">难度等级</Label>
                  <Select
                    value={newQuestion.difficulty}
                    onValueChange={(value) => setNewQuestion({ ...newQuestion, difficulty: value as ExamDifficulty })}
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
              
              <div>
                <Label htmlFor="title">题目标题</Label>
                <Input
                  id="title"
                  value={newQuestion.title}
                  onChange={(e) => setNewQuestion({ ...newQuestion, title: e.target.value })}
                  placeholder="请输入题目标题"
                />
              </div>
              
              <div>
                <Label htmlFor="content">题目内容</Label>
                <Textarea
                  id="content"
                  value={newQuestion.content}
                  onChange={(e) => setNewQuestion({ ...newQuestion, content: e.target.value })}
                  placeholder="请输入题目内容"
                  rows={4}
                />
              </div>

              {renderQuestionTypeFields()}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="score">分值</Label>
                  <Input
                    id="score"
                    type="number"
                    value={newQuestion.score}
                    onChange={(e) => setNewQuestion({ ...newQuestion, score: parseInt(e.target.value) || 0 })}
                    min="1"
                  />
                </div>
                <div>
                  <Label htmlFor="time_limit">时间限制（秒）</Label>
                  <Input
                    id="time_limit"
                    type="number"
                    value={newQuestion.time_limit || ''}
                    onChange={(e) => setNewQuestion({ ...newQuestion, time_limit: parseInt(e.target.value) || undefined })}
                    placeholder="可选"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="explanation">题目解析</Label>
                <Textarea
                  id="explanation"
                  value={newQuestion.explanation}
                  onChange={(e) => setNewQuestion({ ...newQuestion, explanation: e.target.value })}
                  placeholder="请输入题目解析（可选）"
                  rows={3}
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setShowCreateDialog(false)}
                >
                  取消
                </Button>
                <Button onClick={handleCreateQuestion}>
                  <Save className="h-4 w-4 mr-2" />
                  保存题目
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* 考试信息概览 */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">{questions.length}</div>
              <div className="text-sm text-gray-600">题目总数</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                {questions.reduce((sum, q) => sum + q.score, 0)}
              </div>
              <div className="text-sm text-gray-600">总分</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">
                {Math.round(questions.reduce((sum, q) => sum + q.score, 0) / questions.length) || 0}
              </div>
              <div className="text-sm text-gray-600">平均分值</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-600">
                {exam.duration}
              </div>
              <div className="text-sm text-gray-600">考试时长（分钟）</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 题目列表 */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">加载中...</p>
          </div>
        ) : questions.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">暂无题目</h3>
              <p className="text-gray-600 mb-4">还没有为这个考试添加任何题目</p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                添加第一个题目
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {questions.map((question, index) => renderQuestionCard(question, index))}
          </div>
        )}
      </div>
    </div>
  );
}