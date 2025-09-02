'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  Save, 
  Send, 
  AlertTriangle,
  Eye,
  EyeOff,
  Pause,
  Play
} from 'lucide-react';
import { Exam } from '@/types/exam';
import { Question, QuestionOption } from '@/types/question';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { formatTime } from '@/utils/format';

interface ExamParticipation {
  id: string;
  exam_id: string;
  user_id: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'paused';
  start_time: string;
  end_time?: string;
  current_question_index: number;
  answers: Record<string, any>;
  time_remaining: number;
}

interface ExamQuestion extends Question {
  question_number: number;
}

/**
 * 考试参与页面组件
 * 提供学生参与考试的完整界面，包括答题、计时、保存等功能
 */
export default function ExamTakePage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const examId = params.id as string;
  
  // 状态管理
  const [exam, setExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [participation, setParticipation] = useState<ExamParticipation | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showAllQuestions, setShowAllQuestions] = useState(false);
  
  // 计时器引用
  const timerRef = React.useRef<NodeJS.Timeout | null>(null);
  const autoSaveRef = React.useRef<NodeJS.Timeout | null>(null);

  /**
   * 获取考试信息和用户参与状态
   */
  const fetchExamData = async () => {
    try {
      setLoading(true);
      
      // 获取考试信息
      const examResponse = await fetch(`/api/exams/${examId}`);
      const examResult = await examResponse.json();
      
      if (!examResult.success) {
        toast.error('获取考试信息失败');
        router.push('/exams');
        return;
      }
      
      setExam(examResult.data);
      
      // 获取用户参与状态
      const participationResponse = await fetch(`/api/exams/${examId}/participate`);
      const participationResult = await participationResponse.json();
      
      if (participationResult.success && participationResult.data) {
        const participationData = participationResult.data;
        setParticipation(participationData);
        setCurrentQuestionIndex(participationData.current_question_index || 0);
        setAnswers(participationData.answers || {});
        setTimeRemaining(participationData.time_remaining || examResult.data.duration * 60);
        setIsPaused(participationData.status === 'paused');
        
        // 如果考试已完成，跳转到结果页面
        if (participationData.status === 'completed') {
          router.push(`/exam/${examId}/result`);
          return;
        }
      } else {
        // 首次参与，初始化参与记录
        await initializeParticipation(examResult.data);
      }
      
      // 获取考试题目
      const questionsResponse = await fetch(`/api/exams/${examId}/questions`);
      const questionsResult = await questionsResponse.json();
      
      if (questionsResult.success) {
        const questionsWithNumbers = questionsResult.data.map((q: Question, index: number) => ({
          ...q,
          question_number: index + 1
        }));
        setQuestions(questionsWithNumbers);
      }
      
    } catch (error) {
      console.error('获取考试数据失败:', error);
      toast.error('获取考试数据失败');
      router.push('/exams');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 初始化用户参与记录
   */
  const initializeParticipation = async (examData: Exam) => {
    try {
      const response = await fetch(`/api/exams/${examId}/participate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const result = await response.json();
      
      if (result.success) {
        setParticipation(result.data);
        setTimeRemaining(examData.duration * 60);
      } else {
        toast.error(result.error || '初始化考试失败');
        router.push('/exams');
      }
    } catch (error) {
      console.error('初始化考试失败:', error);
      toast.error('初始化考试失败');
      router.push('/exams');
    }
  };

  /**
   * 开始计时器
   */
  const startTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          // 时间到，自动提交
          handleSubmitExam();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  /**
   * 停止计时器
   */
  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  /**
   * 开始自动保存
   */
  const startAutoSave = useCallback(() => {
    if (autoSaveRef.current) {
      clearInterval(autoSaveRef.current);
    }
    
    autoSaveRef.current = setInterval(() => {
      handleSaveProgress();
    }, 30000); // 每30秒自动保存
  }, []);

  /**
   * 停止自动保存
   */
  const stopAutoSave = useCallback(() => {
    if (autoSaveRef.current) {
      clearInterval(autoSaveRef.current);
      autoSaveRef.current = null;
    }
  }, []);

  /**
   * 保存答题进度
   */
  const handleSaveProgress = async () => {
    if (!participation || saving) return;
    
    try {
      setSaving(true);
      
      const response = await fetch(`/api/exams/${examId}/participate`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          current_question_index: currentQuestionIndex,
          answers,
          time_remaining: timeRemaining,
          action: 'save_progress'
        }),
      });
      
      const result = await response.json();
      
      if (!result.success) {
        console.error('保存进度失败:', result.error);
      }
    } catch (error) {
      console.error('保存进度失败:', error);
    } finally {
      setSaving(false);
    }
  };

  /**
   * 暂停考试
   */
  const handlePauseExam = async () => {
    try {
      await handleSaveProgress();
      
      const response = await fetch(`/api/exams/${examId}/participate`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'pause'
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setIsPaused(true);
        stopTimer();
        stopAutoSave();
        toast.success('考试已暂停');
      } else {
        toast.error(result.error || '暂停考试失败');
      }
    } catch (error) {
      console.error('暂停考试失败:', error);
      toast.error('暂停考试失败');
    }
  };

  /**
   * 恢复考试
   */
  const handleResumeExam = async () => {
    try {
      const response = await fetch(`/api/exams/${examId}/participate`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'resume'
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setIsPaused(false);
        startTimer();
        startAutoSave();
        toast.success('考试已恢复');
      } else {
        toast.error(result.error || '恢复考试失败');
      }
    } catch (error) {
      console.error('恢复考试失败:', error);
      toast.error('恢复考试失败');
    }
  };

  /**
   * 提交考试
   */
  const handleSubmitExam = async () => {
    if (!confirm('确定要提交考试吗？提交后将无法修改答案。')) {
      return;
    }
    
    try {
      setSubmitting(true);
      stopTimer();
      stopAutoSave();
      
      const response = await fetch(`/api/exams/${examId}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          answers,
          time_used: (exam?.duration || 0) * 60 - timeRemaining
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast.success('考试提交成功');
        router.push(`/exam/${examId}/result`);
      } else {
        toast.error(result.error || '提交考试失败');
        setSubmitting(false);
      }
    } catch (error) {
      console.error('提交考试失败:', error);
      toast.error('提交考试失败');
      setSubmitting(false);
    }
  };

  /**
   * 更新答案
   */
  const updateAnswer = (questionId: string, answer: any) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  /**
   * 渲染题目内容
   */
  const renderQuestion = (question: ExamQuestion) => {
    const currentAnswer = answers[question.id];
    
    switch (question.type) {
      case 'choice':
        return (
          <RadioGroup
            value={currentAnswer || ''}
            onValueChange={(value) => updateAnswer(question.id, value)}
            className="space-y-3"
          >
            {question.options?.map((option: QuestionOption, index: number) => (
              <div key={option.id || index} className="flex items-center space-x-2">
                <RadioGroupItem value={option.id || index.toString()} id={`option-${index}`} />
                <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer">
                  {option.text}
                </Label>
              </div>
            ))}
          </RadioGroup>
        );
        
      case 'multiple_choice':
        return (
          <div className="space-y-3">
            {question.options?.map((option: QuestionOption, index: number) => {
              const isChecked = Array.isArray(currentAnswer) && 
                               currentAnswer.includes(option.id || index.toString());
              
              return (
                <div key={option.id || index} className="flex items-center space-x-2">
                  <Checkbox
                    id={`option-${index}`}
                    checked={isChecked}
                    onCheckedChange={(checked) => {
                      const currentAnswers = Array.isArray(currentAnswer) ? currentAnswer : [];
                      const optionId = option.id || index.toString();
                      
                      if (checked) {
                        updateAnswer(question.id, [...currentAnswers, optionId]);
                      } else {
                        updateAnswer(question.id, currentAnswers.filter(id => id !== optionId));
                      }
                    }}
                  />
                  <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer">
                    {option.text}
                  </Label>
                </div>
              );
            })}
          </div>
        );
        
      case 'true_false':
        return (
          <RadioGroup
            value={currentAnswer || ''}
            onValueChange={(value) => updateAnswer(question.id, value)}
            className="space-y-3"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="true" id="true" />
              <Label htmlFor="true" className="cursor-pointer">正确</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="false" id="false" />
              <Label htmlFor="false" className="cursor-pointer">错误</Label>
            </div>
          </RadioGroup>
        );
        
      case 'fill_blank':
        return (
          <Input
            value={currentAnswer || ''}
            onChange={(e) => updateAnswer(question.id, e.target.value)}
            placeholder="请输入答案"
            className="w-full"
          />
        );
        
      case 'short_answer':
      case 'coding':
        return (
          <Textarea
            value={currentAnswer || ''}
            onChange={(e) => updateAnswer(question.id, e.target.value)}
            placeholder={question.type === 'coding' ? '请输入代码' : '请输入答案'}
            rows={question.type === 'coding' ? 10 : 5}
            className="w-full font-mono"
          />
        );
        
      default:
        return <div>不支持的题目类型</div>;
    }
  };

  /**
   * 获取已答题数量
   */
  const getAnsweredCount = () => {
    return Object.keys(answers).filter(questionId => {
      const answer = answers[questionId];
      if (Array.isArray(answer)) {
        return answer.length > 0;
      }
      return answer !== undefined && answer !== null && answer !== '';
    }).length;
  };

  // 组件挂载时获取数据
  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    
    fetchExamData();
  }, [user, examId]);

  // 开始计时和自动保存
  useEffect(() => {
    if (participation && !isPaused && timeRemaining > 0) {
      startTimer();
      startAutoSave();
    }
    
    return () => {
      stopTimer();
      stopAutoSave();
    };
  }, [participation, isPaused, timeRemaining]);

  // 页面卸载时保存进度
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (participation && !isPaused) {
        handleSaveProgress();
        e.preventDefault();
        e.returnValue = '确定要离开吗？未保存的答题进度可能会丢失。';
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [participation, isPaused]);

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">加载考试中...</p>
        </div>
      </div>
    );
  }

  if (!exam || !participation || questions.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            考试信息加载失败，请刷新页面重试。
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
  const answeredCount = getAnsweredCount();

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {/* 考试头部信息 */}
      <div className="bg-white border-b sticky top-0 z-10 pb-4 mb-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-2xl font-bold">{exam.title}</h1>
            <p className="text-gray-600">第 {currentQuestionIndex + 1} 题 / 共 {questions.length} 题</p>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* 剩余时间 */}
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-red-500" />
              <span className={`font-mono text-lg ${
                timeRemaining < 300 ? 'text-red-600 font-bold' : 'text-gray-700'
              }`}>
                {formatTime(timeRemaining)}
              </span>
            </div>
            
            {/* 暂停/恢复按钮 */}
            {!isPaused ? (
              <Button variant="outline" size="sm" onClick={handlePauseExam}>
                <Pause className="w-4 h-4 mr-2" />
                暂停
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={handleResumeExam}>
                <Play className="w-4 h-4 mr-2" />
                恢复
              </Button>
            )}
            
            {/* 保存按钮 */}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleSaveProgress}
              disabled={saving}
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? '保存中...' : '保存'}
            </Button>
          </div>
        </div>
        
        {/* 进度条 */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-gray-600">
            <span>答题进度</span>
            <span>{answeredCount} / {questions.length} 已答</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
        
        {/* 暂停提示 */}
        {isPaused && (
          <Alert className="mt-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              考试已暂停，点击"恢复"按钮继续答题。
            </AlertDescription>
          </Alert>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* 主要内容区域 */}
        <div className="lg:col-span-3">
          {/* 当前题目 */}
          <Card className="mb-6">
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg">
                  第 {currentQuestion.question_number} 题
                  <Badge className="ml-2">{currentQuestion.points} 分</Badge>
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAllQuestions(!showAllQuestions)}
                >
                  {showAllQuestions ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  {showAllQuestions ? '隐藏' : '显示'}题目列表
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="prose max-w-none">
                  <p className="text-gray-800 leading-relaxed">{currentQuestion.content}</p>
                </div>
                
                {!isPaused && (
                  <div className="mt-6">
                    {renderQuestion(currentQuestion)}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          
          {/* 导航按钮 */}
          <div className="flex justify-between items-center">
            <Button
              variant="outline"
              onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
              disabled={currentQuestionIndex === 0 || isPaused}
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              上一题
            </Button>
            
            <div className="flex space-x-2">
              {currentQuestionIndex === questions.length - 1 ? (
                <Button
                  onClick={handleSubmitExam}
                  disabled={submitting || isPaused}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Send className="w-4 h-4 mr-2" />
                  {submitting ? '提交中...' : '提交考试'}
                </Button>
              ) : (
                <Button
                  onClick={() => setCurrentQuestionIndex(Math.min(questions.length - 1, currentQuestionIndex + 1))}
                  disabled={isPaused}
                >
                  下一题
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
          </div>
        </div>
        
        {/* 侧边栏 - 题目导航 */}
        {showAllQuestions && (
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">题目导航</CardTitle>
                <CardDescription>
                  点击题号快速跳转
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-5 gap-2">
                  {questions.map((question, index) => {
                    const isAnswered = answers[question.id] !== undefined && 
                                     answers[question.id] !== null && 
                                     answers[question.id] !== '';
                    const isCurrent = index === currentQuestionIndex;
                    
                    return (
                      <Button
                        key={question.id}
                        variant={isCurrent ? 'default' : isAnswered ? 'secondary' : 'outline'}
                        size="sm"
                        className={`h-10 w-10 p-0 ${
                          isCurrent ? 'ring-2 ring-blue-500' : ''
                        }`}
                        onClick={() => setCurrentQuestionIndex(index)}
                        disabled={isPaused}
                      >
                        {index + 1}
                      </Button>
                    );
                  })}
                </div>
                
                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-blue-600 rounded"></div>
                    <span>当前题目</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-gray-200 rounded border"></div>
                    <span>已答题目</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border rounded"></div>
                    <span>未答题目</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}