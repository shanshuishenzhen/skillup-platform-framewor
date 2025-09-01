import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  Flag, 
  AlertTriangle,
  CheckCircle,
  FileText,
  Timer,
  Eye,
  EyeOff
} from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/router';

/**
 * 题目类型枚举
 */
enum QuestionType {
  SINGLE_CHOICE = 'single_choice',
  MULTIPLE_CHOICE = 'multiple_choice',
  TRUE_FALSE = 'true_false',
  SHORT_ANSWER = 'short_answer',
  ESSAY = 'essay'
}

/**
 * 题目选项接口
 */
interface QuestionOption {
  id: string;
  text: string;
  is_correct?: boolean;
}

/**
 * 题目接口
 */
interface Question {
  id: string;
  exam_id: string;
  type: QuestionType;
  title: string;
  content: string;
  options?: QuestionOption[];
  score: number;
  order_index: number;
  explanation?: string;
}

/**
 * 用户答案接口
 */
interface UserAnswer {
  question_id: string;
  selected_options?: string[];
  text_answer?: string;
  is_flagged?: boolean;
}

/**
 * 考试信息接口
 */
interface ExamInfo {
  id: string;
  title: string;
  description: string;
  duration: number; // 分钟
  total_questions: number;
  total_score: number;
  passing_score: number;
  instructions?: string;
}

/**
 * 考试参与页面组件
 * 提供考生参加考试的完整界面和功能
 */
const ExamTaking: React.FC = () => {
  const router = useRouter();
  const { examId } = router.query as { examId: string };
  
  const [examInfo, setExamInfo] = useState<ExamInfo | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Map<string, UserAnswer>>(new Map());
  const [timeRemaining, setTimeRemaining] = useState(0); // 秒
  const [isExamStarted, setIsExamStarted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true);
  const [loading, setLoading] = useState(true);
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<string>>(new Set());

  /**
   * 获取考试信息和题目
   */
  const fetchExamData = async () => {
    try {
      setLoading(true);
      // TODO: 实现API调用
      // const [examResponse, questionsResponse] = await Promise.all([
      //   examService.getExamById(examId!),
      //   examService.getExamQuestions(examId!)
      // ]);
      // setExamInfo(examResponse.data);
      // setQuestions(questionsResponse.data);
      
      // 模拟数据
      const mockExamInfo: ExamInfo = {
        id: examId!,
        title: 'JavaScript基础考试',
        description: '测试JavaScript基础知识掌握情况',
        duration: 60,
        total_questions: 10,
        total_score: 100,
        passing_score: 60,
        instructions: '请仔细阅读每道题目，选择最佳答案。考试时间为60分钟，请合理安排时间。提交后不可修改答案。'
      };
      
      const mockQuestions: Question[] = [
        {
          id: '1',
          exam_id: examId!,
          type: QuestionType.SINGLE_CHOICE,
          title: 'JavaScript变量声明',
          content: '以下哪种方式是声明JavaScript变量的正确方法？',
          options: [
            { id: '1a', text: 'var myVariable;' },
            { id: '1b', text: 'variable myVariable;' },
            { id: '1c', text: 'v myVariable;' },
            { id: '1d', text: 'declare myVariable;' }
          ],
          score: 10,
          order_index: 1
        },
        {
          id: '2',
          exam_id: examId!,
          type: QuestionType.MULTIPLE_CHOICE,
          title: 'JavaScript数据类型',
          content: '以下哪些是JavaScript的基本数据类型？（多选）',
          options: [
            { id: '2a', text: 'string' },
            { id: '2b', text: 'number' },
            { id: '2c', text: 'boolean' },
            { id: '2d', text: 'array' }
          ],
          score: 15,
          order_index: 2
        },
        {
          id: '3',
          exam_id: examId!,
          type: QuestionType.TRUE_FALSE,
          title: 'JavaScript函数',
          content: 'JavaScript中的函数是一等公民，可以作为参数传递给其他函数。',
          options: [
            { id: '3a', text: '正确' },
            { id: '3b', text: '错误' }
          ],
          score: 10,
          order_index: 3
        },
        {
          id: '4',
          exam_id: examId!,
          type: QuestionType.SHORT_ANSWER,
          title: 'JavaScript闭包',
          content: '请简要解释什么是JavaScript闭包？',
          score: 20,
          order_index: 4
        },
        {
          id: '5',
          exam_id: examId!,
          type: QuestionType.ESSAY,
          title: 'JavaScript异步编程',
          content: '请详细说明JavaScript中的异步编程方式，包括回调函数、Promise和async/await的区别和使用场景。',
          score: 45,
          order_index: 5
        }
      ];
      
      setExamInfo(mockExamInfo);
      setQuestions(mockQuestions);
      setTimeRemaining(mockExamInfo.duration * 60); // 转换为秒
    } catch (error) {
      console.error('获取考试数据失败:', error);
      toast.error('获取考试数据失败');
      router.push('/exams');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 开始考试
   */
  const startExam = async () => {
    try {
      // TODO: 实现API调用
      // await examService.startExam(examId!);
      setIsExamStarted(true);
      setShowInstructions(false);
      toast.success('考试已开始，祝您考试顺利！');
    } catch (error) {
      console.error('开始考试失败:', error);
      toast.error('开始考试失败');
    }
  };

  /**
   * 提交考试
   */
  const submitExam = async () => {
    if (!confirm('确定要提交考试吗？提交后将无法修改答案。')) {
      return;
    }

    try {
      setIsSubmitting(true);
      
      // 准备答案数据
      const answersArray = Array.from(answers.values());
      
      // TODO: 实现API调用
      // await examService.submitExam(examId!, answersArray);
      
      toast.success('考试提交成功！');
      router.push(`/exams/${examId}/result`);
    } catch (error) {
      console.error('提交考试失败:', error);
      toast.error('提交考试失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * 更新答案
   */
  const updateAnswer = (questionId: string, answer: Partial<UserAnswer>) => {
    setAnswers(prev => {
      const newAnswers = new Map(prev);
      const existingAnswer = newAnswers.get(questionId) || { question_id: questionId };
      newAnswers.set(questionId, { ...existingAnswer, ...answer });
      return newAnswers;
    });
  };

  /**
   * 切换题目标记状态
   */
  const toggleQuestionFlag = (questionId: string) => {
    setFlaggedQuestions(prev => {
      const newFlagged = new Set(prev);
      if (newFlagged.has(questionId)) {
        newFlagged.delete(questionId);
      } else {
        newFlagged.add(questionId);
      }
      return newFlagged;
    });
    
    updateAnswer(questionId, { is_flagged: !flaggedQuestions.has(questionId) });
  };

  /**
   * 格式化时间显示
   */
  const formatTime = (seconds: number): string => {
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
  const getQuestionTypeText = (type: QuestionType): string => {
    const typeMap = {
      [QuestionType.SINGLE_CHOICE]: '单选题',
      [QuestionType.MULTIPLE_CHOICE]: '多选题',
      [QuestionType.TRUE_FALSE]: '判断题',
      [QuestionType.SHORT_ANSWER]: '简答题',
      [QuestionType.ESSAY]: '论述题'
    };
    return typeMap[type];
  };

  /**
   * 渲染题目内容
   */
  const renderQuestion = (question: Question) => {
    const answer = answers.get(question.id);
    
    switch (question.type) {
      case QuestionType.SINGLE_CHOICE:
      case QuestionType.TRUE_FALSE:
        return (
          <RadioGroup
            value={answer?.selected_options?.[0] || ''}
            onValueChange={(value) => updateAnswer(question.id, { selected_options: [value] })}
            className="space-y-3"
          >
            {question.options?.map((option) => (
              <div key={option.id} className="flex items-center space-x-2">
                <RadioGroupItem value={option.id} id={option.id} />
                <Label htmlFor={option.id} className="flex-1 cursor-pointer">
                  {option.text}
                </Label>
              </div>
            ))}
          </RadioGroup>
        );
        
      case QuestionType.MULTIPLE_CHOICE:
        return (
          <div className="space-y-3">
            {question.options?.map((option) => (
              <div key={option.id} className="flex items-center space-x-2">
                <Checkbox
                  id={option.id}
                  checked={answer?.selected_options?.includes(option.id) || false}
                  onCheckedChange={(checked) => {
                    const currentOptions = answer?.selected_options || [];
                    let newOptions;
                    if (checked) {
                      newOptions = [...currentOptions, option.id];
                    } else {
                      newOptions = currentOptions.filter(id => id !== option.id);
                    }
                    updateAnswer(question.id, { selected_options: newOptions });
                  }}
                />
                <Label htmlFor={option.id} className="flex-1 cursor-pointer">
                  {option.text}
                </Label>
              </div>
            ))}
          </div>
        );
        
      case QuestionType.SHORT_ANSWER:
        return (
          <Textarea
            placeholder="请输入您的答案..."
            value={answer?.text_answer || ''}
            onChange={(e) => updateAnswer(question.id, { text_answer: e.target.value })}
            className="min-h-24"
          />
        );
        
      case QuestionType.ESSAY:
        return (
          <Textarea
            placeholder="请详细阐述您的观点..."
            value={answer?.text_answer || ''}
            onChange={(e) => updateAnswer(question.id, { text_answer: e.target.value })}
            className="min-h-48"
          />
        );
        
      default:
        return <div>未知题目类型</div>;
    }
  };

  /**
   * 计算答题进度
   */
  const getProgress = (): number => {
    const answeredCount = questions.filter(q => {
      const answer = answers.get(q.id);
      return answer && (
        (answer.selected_options && answer.selected_options.length > 0) ||
        (answer.text_answer && answer.text_answer.trim().length > 0)
      );
    }).length;
    return questions.length > 0 ? (answeredCount / questions.length) * 100 : 0;
  };

  // 计时器效果
  useEffect(() => {
    if (!isExamStarted || timeRemaining <= 0) return;
    
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
  }, [isExamStarted, timeRemaining]);

  useEffect(() => {
    fetchExamData();
  }, [examId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">加载考试中...</div>
      </div>
    );
  }

  if (!examInfo) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-red-600">考试不存在</div>
      </div>
    );
  }

  // 显示考试说明
  if (showInstructions && !isExamStarted) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">{examInfo.title}</CardTitle>
            <p className="text-gray-600">{examInfo.description}</p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{examInfo.duration}</div>
                <div className="text-sm text-gray-600">分钟</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{examInfo.total_questions}</div>
                <div className="text-sm text-gray-600">题目</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{examInfo.total_score}</div>
                <div className="text-sm text-gray-600">总分</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{examInfo.passing_score}</div>
                <div className="text-sm text-gray-600">及格分</div>
              </div>
            </div>
            
            {examInfo.instructions && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-medium mb-2">考试说明：</div>
                  <div className="whitespace-pre-line">{examInfo.instructions}</div>
                </AlertDescription>
              </Alert>
            )}
            
            <div className="flex justify-center">
              <Button onClick={startExam} size="lg" className="px-8">
                <Timer className="h-5 w-5 mr-2" />
                开始考试
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  
  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* 考试头部信息 */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold">{examInfo.title}</h1>
              <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                <span>题目 {currentQuestionIndex + 1} / {questions.length}</span>
                <span>进度 {getProgress().toFixed(0)}%</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                timeRemaining < 300 ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
              }`}>
                <Clock className="h-4 w-4" />
                <span className="font-mono font-medium">{formatTime(timeRemaining)}</span>
              </div>
              <Button 
                onClick={submitExam} 
                disabled={isSubmitting}
                variant="outline"
                className="border-green-600 text-green-600 hover:bg-green-50"
              >
                {isSubmitting ? '提交中...' : '提交考试'}
              </Button>
            </div>
          </div>
          <Progress value={getProgress()} className="mt-3" />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* 题目导航 */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">题目导航</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 lg:grid-cols-3 gap-2">
              {questions.map((question, index) => {
                const isAnswered = answers.has(question.id) && (
                  (answers.get(question.id)?.selected_options?.length || 0) > 0 ||
                  (answers.get(question.id)?.text_answer?.trim().length || 0) > 0
                );
                const isFlagged = flaggedQuestions.has(question.id);
                const isCurrent = index === currentQuestionIndex;
                
                return (
                  <Button
                    key={question.id}
                    variant={isCurrent ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setCurrentQuestionIndex(index)}
                    className={`relative ${
                      isAnswered ? 'border-green-500 bg-green-50' : ''
                    } ${
                      isFlagged ? 'border-orange-500' : ''
                    }`}
                  >
                    {index + 1}
                    {isFlagged && (
                      <Flag className="absolute -top-1 -right-1 h-3 w-3 text-orange-500" />
                    )}
                    {isAnswered && (
                      <CheckCircle className="absolute -bottom-1 -right-1 h-3 w-3 text-green-500" />
                    )}
                  </Button>
                );
              })}
            </div>
            
            <div className="mt-4 space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 border border-gray-300 rounded"></div>
                <span>未答题</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-50 border border-green-500 rounded"></div>
                <span>已答题</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 border border-orange-500 rounded"></div>
                <span>已标记</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 题目内容 */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{getQuestionTypeText(currentQuestion.type)}</Badge>
                  <Badge variant="secondary">{currentQuestion.score}分</Badge>
                </div>
                <CardTitle className="text-xl mt-2">{currentQuestion.title}</CardTitle>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => toggleQuestionFlag(currentQuestion.id)}
                className={flaggedQuestions.has(currentQuestion.id) ? 'text-orange-600' : ''}
              >
                <Flag className="h-4 w-4" />
                {flaggedQuestions.has(currentQuestion.id) ? '取消标记' : '标记'}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="prose max-w-none">
              <p className="text-gray-700 leading-relaxed">{currentQuestion.content}</p>
            </div>
            
            <div className="space-y-4">
              {renderQuestion(currentQuestion)}
            </div>
            
            <div className="flex items-center justify-between pt-6 border-t">
              <Button
                variant="outline"
                onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
                disabled={currentQuestionIndex === 0}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                上一题
              </Button>
              
              <span className="text-sm text-gray-500">
                第 {currentQuestionIndex + 1} 题，共 {questions.length} 题
              </span>
              
              <Button
                variant="outline"
                onClick={() => setCurrentQuestionIndex(Math.min(questions.length - 1, currentQuestionIndex + 1))}
                disabled={currentQuestionIndex === questions.length - 1}
              >
                下一题
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ExamTaking;