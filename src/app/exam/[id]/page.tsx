'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  Flag, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  FileText,
  Timer,
  Send,
  Eye,
  BookOpen,
  Bookmark,
  Save,
  RotateCcw
} from 'lucide-react';
import { 
  ExamService, 
  QuestionType, 
  ExamDifficulty,
  AttemptStatus,
  type Exam, 
  type Question, 
  type ExamAttempt,
  type UserAnswer
} from '@/services/examService';

/**
 * 考试参与页面
 * 用户参加考试和答题的主要界面
 */
export default function ExamTakingPage() {
  const params = useParams();
  const router = useRouter();
  const examId = params.id as string;
  
  const [exam, setExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [attempt, setAttempt] = useState<ExamAttempt | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, UserAnswer>>({});
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [examStarted, setExamStarted] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true);
  const [markedQuestions, setMarkedQuestions] = useState<Set<string>>(new Set());
  const [savingAnswer, setSavingAnswer] = useState(false);

  /**
   * 加载考试信息
   */
  const loadExam = async () => {
    try {
      const examData = await ExamService.getExamById(examId);
      setExam(examData);
      
      // 检查考试资格
      const eligibility = await ExamService.checkExamEligibility(examId);
      if (!eligibility.eligible) {
        toast.error(eligibility.reason);
        router.push('/skill-exam');
        return;
      }
      
      // 加载题目
      const questionsData = await ExamService.getExamQuestions(examId, false);
      setQuestions(questionsData);
      
    } catch (error) {
      console.error('加载考试信息失败:', error);
      toast.error('加载考试信息失败');
      router.push('/skill-exam');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 开始考试
   */
  const startExam = async () => {
    try {
      setLoading(true);
      const attemptData = await ExamService.startExam(examId);
      setAttempt(attemptData);
      setTimeRemaining(attemptData.remaining_time || exam!.duration * 60);
      setExamStarted(true);
      setShowInstructions(false);
      toast.success('考试已开始，祝您考试顺利！');
    } catch (error) {
      console.error('开始考试失败:', error);
      toast.error('开始考试失败');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 提交答案
   */
  const submitAnswer = useCallback(async (questionId: string, answer: string | string[]) => {
    if (!attempt) return;

    try {
      setSavingAnswer(true);
      const answerData: UserAnswer = {
        id: `${attempt.id}_${questionId}`,
        attempt_id: attempt.id,
        question_id: questionId,
        answer: Array.isArray(answer) ? answer.join(',') : answer,
        answered_at: new Date().toISOString()
      };

      await ExamService.submitAnswer(attempt.id, questionId, answerData.answer);
      
      setAnswers(prev => ({
        ...prev,
        [questionId]: answerData
      }));
      
      toast.success('答案已保存', { duration: 1000 });
    } catch (error) {
      console.error('提交答案失败:', error);
      toast.error('提交答案失败');
    } finally {
      setSavingAnswer(false);
    }
  }, [attempt]);

  /**
   * 暂存答案（本地保存，不提交到服务器）
   */
  const saveAnswerLocally = useCallback((questionId: string, answer: string | string[]) => {
    if (!attempt) return;

    const answerData: UserAnswer = {
      id: `${attempt.id}_${questionId}`,
      attempt_id: attempt.id,
      question_id: questionId,
      answer: Array.isArray(answer) ? answer.join(',') : answer,
      answered_at: new Date().toISOString()
    };

    setAnswers(prev => ({
      ...prev,
      [questionId]: answerData
    }));
  }, [attempt]);

  /**
   * 标记/取消标记题目
   */
  const toggleQuestionMark = useCallback((questionId: string) => {
    setMarkedQuestions(prev => {
      const newMarked = new Set(prev);
      if (newMarked.has(questionId)) {
        newMarked.delete(questionId);
        toast.success('已取消标记');
      } else {
        newMarked.add(questionId);
        toast.success('已标记题目');
      }
      return newMarked;
    });
  }, []);

  /**
   * 跳转到下一个未答题目
   */
  const goToNextUnanswered = useCallback(() => {
    const unansweredIndex = questions.findIndex((q, index) => 
      index > currentQuestionIndex && !isQuestionAnswered(q.id)
    );
    
    if (unansweredIndex !== -1) {
      setCurrentQuestionIndex(unansweredIndex);
    } else {
      // 如果后面没有未答题目，从头开始找
      const firstUnansweredIndex = questions.findIndex(q => !isQuestionAnswered(q.id));
      if (firstUnansweredIndex !== -1) {
        setCurrentQuestionIndex(firstUnansweredIndex);
      } else {
        toast.info('所有题目都已回答');
      }
    }
  }, [questions, currentQuestionIndex, answers]);

  /**
   * 跳转到下一个标记题目
   */
  const goToNextMarked = useCallback(() => {
    const markedIndex = questions.findIndex((q, index) => 
      index > currentQuestionIndex && markedQuestions.has(q.id)
    );
    
    if (markedIndex !== -1) {
      setCurrentQuestionIndex(markedIndex);
    } else {
      // 如果后面没有标记题目，从头开始找
      const firstMarkedIndex = questions.findIndex(q => markedQuestions.has(q.id));
      if (firstMarkedIndex !== -1) {
        setCurrentQuestionIndex(firstMarkedIndex);
      } else {
        toast.info('没有标记的题目');
      }
    }
  }, [questions, currentQuestionIndex, markedQuestions]);

  /**
   * 提交考试
   */
  const submitExam = async () => {
    if (!attempt) return;

    try {
      setSubmitting(true);
      await ExamService.completeExam(attempt.id);
      toast.success('考试提交成功！');
      router.push(`/exam/${examId}/result`);
    } catch (error) {
      console.error('提交考试失败:', error);
      toast.error('提交考试失败');
    } finally {
      setSubmitting(false);
      setShowSubmitDialog(false);
    }
  };

  /**
   * 格式化时间显示
   */
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
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
      [QuestionType.ESSAY]: '问答题'
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
      [ExamDifficulty.ADVANCED]: '高级'
    };
    return difficultyMap[difficulty] || difficulty;
  };

  /**
   * 检查题目是否已答
   */
  const isQuestionAnswered = (questionId: string) => {
    return answers[questionId] && answers[questionId].answer;
  };

  /**
   * 获取已答题目数量
   */
  const getAnsweredCount = () => {
    return Object.keys(answers).filter(questionId => 
      answers[questionId] && answers[questionId].answer
    ).length;
  };

  /**
   * 渲染题目内容
   */
  const renderQuestion = (question: Question) => {
    const currentAnswer = answers[question.id]?.answer || '';

    switch (question.type) {
      case QuestionType.SINGLE_CHOICE:
        return (
          <RadioGroup
            value={currentAnswer}
            onValueChange={(value) => {
              saveAnswerLocally(question.id, value);
              // 延迟提交到服务器
              setTimeout(() => submitAnswer(question.id, value), 500);
            }}
            className="space-y-3"
          >
            {question.options?.map((option, index) => (
              <div key={option.id} className="flex items-center space-x-2">
                <RadioGroupItem value={option.id} id={option.id} />
                <Label htmlFor={option.id} className="flex-1 cursor-pointer">
                  <span className="font-medium mr-2">
                    {String.fromCharCode(65 + index)}.
                  </span>
                  {option.text}
                </Label>
              </div>
            ))}
          </RadioGroup>
        );

      case QuestionType.MULTIPLE_CHOICE:
        const selectedOptions = currentAnswer ? currentAnswer.split(',') : [];
        return (
          <div className="space-y-3">
            {question.options?.map((option, index) => (
              <div key={option.id} className="flex items-center space-x-2">
                <Checkbox
                  id={option.id}
                  checked={selectedOptions.includes(option.id)}
                  onCheckedChange={(checked) => {
                    let newSelected = [...selectedOptions];
                    if (checked) {
                      newSelected.push(option.id);
                    } else {
                      newSelected = newSelected.filter(id => id !== option.id);
                    }
                    saveAnswerLocally(question.id, newSelected);
                    // 延迟提交到服务器
                    setTimeout(() => submitAnswer(question.id, newSelected), 500);
                  }}
                />
                <Label htmlFor={option.id} className="flex-1 cursor-pointer">
                  <span className="font-medium mr-2">
                    {String.fromCharCode(65 + index)}.
                  </span>
                  {option.text}
                </Label>
              </div>
            ))}
          </div>
        );

      case QuestionType.TRUE_FALSE:
        return (
          <RadioGroup
            value={currentAnswer}
            onValueChange={(value) => {
              saveAnswerLocally(question.id, value);
              // 延迟提交到服务器
              setTimeout(() => submitAnswer(question.id, value), 500);
            }}
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

      case QuestionType.FILL_BLANK:
        return (
          <div className="space-y-2">
            <Input
              value={currentAnswer}
              onChange={(e) => {
                saveAnswerLocally(question.id, e.target.value);
              }}
              onBlur={(e) => {
                // 失去焦点时提交到服务器
                if (e.target.value.trim()) {
                  submitAnswer(question.id, e.target.value);
                }
              }}
              placeholder="请输入答案"
              className="w-full"
            />
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => submitAnswer(question.id, currentAnswer)}
                disabled={!currentAnswer.trim() || savingAnswer}
              >
                <Save className="h-3 w-3 mr-1" />
                {savingAnswer ? '保存中...' : '保存答案'}
              </Button>
            </div>
          </div>
        );

      case QuestionType.ESSAY:
        return (
          <div className="space-y-2">
            <Textarea
              value={currentAnswer}
              onChange={(e) => {
                saveAnswerLocally(question.id, e.target.value);
              }}
              onBlur={(e) => {
                // 失去焦点时提交到服务器
                if (e.target.value.trim()) {
                  submitAnswer(question.id, e.target.value);
                }
              }}
              placeholder="请输入您的答案"
              rows={6}
              className="w-full"
            />
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => submitAnswer(question.id, currentAnswer)}
                disabled={!currentAnswer.trim() || savingAnswer}
              >
                <Save className="h-3 w-3 mr-1" />
                {savingAnswer ? '保存中...' : '保存答案'}
              </Button>
            </div>
          </div>
        );

      default:
        return <div>不支持的题目类型</div>;
    }
  };

  /**
   * 渲染题目导航
   */
  const renderQuestionNavigation = () => (
    <div className="space-y-4">
      {/* 快捷导航按钮 */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant="outline"
          size="sm"
          onClick={goToNextUnanswered}
          className="text-orange-600 border-orange-300 hover:bg-orange-50"
        >
          <AlertTriangle className="h-3 w-3 mr-1" />
          下一个未答题
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={goToNextMarked}
          className="text-blue-600 border-blue-300 hover:bg-blue-50"
        >
          <Bookmark className="h-3 w-3 mr-1" />
          下一个标记题
        </Button>
        <div className="text-sm text-gray-600 flex items-center ml-auto">
          <span className="mr-4">已答: {getAnsweredCount()}/{questions.length}</span>
          <span>标记: {markedQuestions.size}</span>
        </div>
      </div>
      
      {/* 题目导航网格 */}
      <div className="grid grid-cols-10 gap-2">
        {questions.map((question, index) => {
          const isAnswered = isQuestionAnswered(question.id);
          const isMarked = markedQuestions.has(question.id);
          const isCurrent = currentQuestionIndex === index;
          
          return (
            <Button
              key={question.id}
              variant={isCurrent ? "default" : "outline"}
              size="sm"
              onClick={() => setCurrentQuestionIndex(index)}
              className={`relative ${
                isAnswered 
                  ? 'bg-green-100 border-green-300 text-green-800 hover:bg-green-200' 
                  : isMarked
                  ? 'bg-blue-100 border-blue-300 text-blue-800 hover:bg-blue-200'
                  : ''
              }`}
            >
              {index + 1}
              {/* 已答标记 */}
              {isAnswered && (
                <CheckCircle className="h-3 w-3 absolute -top-1 -right-1 text-green-600" />
              )}
              {/* 标记标记 */}
              {isMarked && (
                <Bookmark className="h-3 w-3 absolute -top-1 -left-1 text-blue-600 fill-current" />
              )}
            </Button>
          );
        })}
      </div>
    </div>
  );

  /**
   * 渲染考试说明页面
   */
  const renderInstructions = () => (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-6 w-6" />
            考试说明
          </CardTitle>
          <CardDescription>
            请仔细阅读以下考试说明，确保您了解考试规则
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 考试基本信息 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <h3 className="font-semibold">考试信息</h3>
              <div className="space-y-1 text-sm">
                <div>考试名称：{exam?.title}</div>
                <div>考试分类：{exam?.category}</div>
                <div>难度等级：{exam && getDifficultyText(exam.difficulty)}</div>
                <div>题目数量：{questions.length} 题</div>
                <div>考试时长：{exam?.duration} 分钟</div>
                <div>及格分数：{exam?.passing_score} 分</div>
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold">题型分布</h3>
              <div className="space-y-1 text-sm">
                {Object.entries(
                  questions.reduce((acc, q) => {
                    acc[q.type] = (acc[q.type] || 0) + 1;
                    return acc;
                  }, {} as Record<string, number>)
                ).map(([type, count]) => (
                  <div key={type}>
                    {getQuestionTypeText(type as QuestionType)}：{count} 题
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 考试规则 */}
          <div className="space-y-2">
            <h3 className="font-semibold">考试规则</h3>
            <div className="bg-yellow-50 p-4 rounded-lg space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                <div>
                  <strong>时间限制：</strong>考试开始后，您有 {exam?.duration} 分钟完成所有题目。时间到后系统将自动提交。
                </div>
              </div>
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                <div>
                  <strong>答题要求：</strong>请认真阅读每道题目，选择或填写您认为正确的答案。
                </div>
              </div>
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                <div>
                  <strong>提交规则：</strong>考试过程中答案会自动保存，完成后请点击"提交考试"按钮。
                </div>
              </div>
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                <div>
                  <strong>诚信考试：</strong>请独立完成考试，不得使用任何作弊手段。
                </div>
              </div>
            </div>
          </div>

          {/* 自定义规则 */}
          {exam?.rules && (
            <div className="space-y-2">
              <h3 className="font-semibold">特殊说明</h3>
              <div className="bg-blue-50 p-4 rounded-lg text-sm">
                {exam.rules.split('\n').map((rule, index) => (
                  <div key={index}>{rule}</div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-center pt-4">
            <Button onClick={startExam} size="lg" disabled={loading}>
              {loading ? '准备中...' : '开始考试'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // 倒计时效果
  useEffect(() => {
    if (!examStarted || timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          // 时间到，自动提交
          submitExam();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [examStarted, timeRemaining]);

  useEffect(() => {
    if (examId) {
      loadExam();
    }
  }, [examId]);

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  if (!exam || questions.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="text-center py-8">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">考试不可用</h3>
            <p className="text-gray-600 mb-4">该考试不存在或暂时不可用</p>
            <Button onClick={() => router.push('/skill-exam')}>返回考试列表</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 显示考试说明
  if (showInstructions) {
    return (
      <div className="container mx-auto p-6">
        {renderInstructions()}
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* 考试头部信息 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">{exam.title}</h1>
              <p className="text-gray-600">
                {exam.category} · {getDifficultyText(exam.difficulty)}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="text-sm text-gray-600">已答题目</div>
                <div className="text-lg font-bold">
                  {getAnsweredCount()} / {questions.length}
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-600">剩余时间</div>
                <div className={`text-lg font-bold ${
                  timeRemaining < 300 ? 'text-red-600' : 'text-blue-600'
                }`}>
                  <Timer className="h-4 w-4 inline mr-1" />
                  {formatTime(timeRemaining)}
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-4">
            <Progress 
              value={(getAnsweredCount() / questions.length) * 100} 
              className="h-2"
            />
          </div>
        </CardContent>
      </Card>

      {/* 题目导航 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">题目导航</CardTitle>
        </CardHeader>
        <CardContent>
          {renderQuestionNavigation()}
        </CardContent>
      </Card>

      {/* 当前题目 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="outline">第 {currentQuestionIndex + 1} 题</Badge>
              <Badge variant="secondary">
                {getQuestionTypeText(currentQuestion.type)}
              </Badge>
              <span className="text-sm text-gray-600">
                {currentQuestion.score} 分
              </span>
              {currentQuestion.time_limit && (
                <Badge variant="outline">
                  限时 {currentQuestion.time_limit} 秒
                </Badge>
              )}
              {markedQuestions.has(currentQuestion.id) && (
                <Badge variant="outline" className="text-blue-600 border-blue-300">
                  <Bookmark className="h-3 w-3 mr-1" />
                  已标记
                </Badge>
              )}
            </div>
            <div className="flex gap-2">
              {/* 标记按钮 */}
              <Button
                variant={markedQuestions.has(currentQuestion.id) ? "default" : "outline"}
                size="sm"
                onClick={() => toggleQuestionMark(currentQuestion.id)}
                className={markedQuestions.has(currentQuestion.id) ? "bg-blue-600 hover:bg-blue-700" : ""}
              >
                <Bookmark className="h-4 w-4" />
                {markedQuestions.has(currentQuestion.id) ? '取消标记' : '标记题目'}
              </Button>
              
              {/* 导航按钮 */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
                disabled={currentQuestionIndex === 0}
              >
                <ChevronLeft className="h-4 w-4" />
                上一题
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentQuestionIndex(Math.min(questions.length - 1, currentQuestionIndex + 1))}
                disabled={currentQuestionIndex === questions.length - 1}
              >
                下一题
                <ChevronRight className="h-4 w-4" />
              </Button>
              
              {/* 快捷导航 */}
              <Button
                variant="outline"
                size="sm"
                onClick={goToNextUnanswered}
                className="text-orange-600 border-orange-300 hover:bg-orange-50"
              >
                <AlertTriangle className="h-4 w-4" />
                下一未答
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-2">{currentQuestion.title}</h3>
            <div className="text-gray-700 mb-4">
              {currentQuestion.content}
            </div>
          </div>
          
          {renderQuestion(currentQuestion)}
          
          {isQuestionAnswered(currentQuestion.id) && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                您已回答此题，答案会自动保存。
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* 提交按钮 */}
      <div className="flex justify-center">
        <Button
          onClick={() => setShowSubmitDialog(true)}
          size="lg"
          className="bg-green-600 hover:bg-green-700"
        >
          <Send className="h-4 w-4 mr-2" />
          提交考试
        </Button>
      </div>

      {/* 提交确认对话框 */}
      <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              确认提交考试
            </DialogTitle>
            <DialogDescription className="space-y-2">
              <p>您确定要提交考试吗？提交后将无法修改答案。</p>
              <div className="bg-gray-50 p-3 rounded-lg space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>总题数：</span>
                  <span>{questions.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>已答题数：</span>
                  <span className={getAnsweredCount() === questions.length ? 'text-green-600' : 'text-orange-600'}>
                    {getAnsweredCount()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>未答题数：</span>
                  <span className={questions.length - getAnsweredCount() === 0 ? 'text-green-600' : 'text-red-600'}>
                    {questions.length - getAnsweredCount()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>标记题数：</span>
                  <span className="text-blue-600">{markedQuestions.size}</span>
                </div>
                <div className="flex justify-between">
                  <span>剩余时间：</span>
                  <span className={timeRemaining < 300 ? 'text-red-600' : 'text-gray-600'}>
                    {formatTime(timeRemaining)}
                  </span>
                </div>
              </div>
              {questions.length - getAnsweredCount() > 0 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    您还有 {questions.length - getAnsweredCount()} 道题未答，确定要提交吗？
                  </AlertDescription>
                </Alert>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-6">
            <Button 
              variant="outline" 
              onClick={() => setShowSubmitDialog(false)}
              disabled={submitting}
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              继续答题
            </Button>
            <Button 
              onClick={submitExam} 
              disabled={submitting}
              className="bg-red-600 hover:bg-red-700"
            >
              {submitting ? (
                <>
                  <RotateCcw className="h-4 w-4 mr-1 animate-spin" />
                  提交中...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-1" />
                  确认提交
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}