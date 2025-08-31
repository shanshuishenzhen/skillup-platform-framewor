/**
 * 在线答题页面
 * 实现在线答题界面，包括题目展示、答案提交、计时器、防作弊等功能
 */

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  Flag, 
  AlertTriangle,
  Eye,
  EyeOff,
  Save,
  Send,
  Shield,
  Monitor,
  Wifi,
  Battery
} from 'lucide-react';
import { toast } from 'sonner';
import { useParams, useRouter } from 'next/navigation';

// 类型定义
interface Question {
  id: string;
  type: 'single_choice' | 'multiple_choice' | 'true_false' | 'fill_blank' | 'essay';
  title: string;
  content: string;
  options?: { id: string; text: string }[];
  score: number;
  timeLimit?: number;
  order: number;
}

interface UserAnswer {
  questionId: string;
  answer: string | string[];
  timeSpent: number;
  submittedAt: string;
}

interface ExamAttempt {
  id: string;
  examId: string;
  userId: string;
  status: 'in_progress' | 'submitted' | 'completed';
  startTime: string;
  currentQuestionIndex: number;
  answers: UserAnswer[];
  flaggedQuestions: string[];
  timeRemaining: number;
}

export default function TakeExamPage() {
  const params = useParams();
  const router = useRouter();
  const examId = params.id as string;

  // 状态管理
  const [attempt, setAttempt] = useState<ExamAttempt | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<string>>(new Set());
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [violations, setViolations] = useState<string[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());

  // Refs
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const autoSaveRef = useRef<NodeJS.Timeout | null>(null);
  const visibilityRef = useRef<boolean>(true);

  // 模拟数据
  const mockQuestions: Question[] = [
    {
      id: 'q1',
      type: 'single_choice',
      title: 'JavaScript 变量声明',
      content: '在 JavaScript 中，以下哪种方式是声明变量的正确方法？',
      options: [
        { id: 'a', text: 'var myVariable;' },
        { id: 'b', text: 'variable myVariable;' },
        { id: 'c', text: 'v myVariable;' },
        { id: 'd', text: 'declare myVariable;' }
      ],
      score: 2,
      order: 1
    },
    {
      id: 'q2',
      type: 'multiple_choice',
      title: 'JavaScript 数据类型',
      content: '以下哪些是 JavaScript 的基本数据类型？（多选）',
      options: [
        { id: 'a', text: 'string' },
        { id: 'b', text: 'number' },
        { id: 'c', text: 'boolean' },
        { id: 'd', text: 'array' },
        { id: 'e', text: 'undefined' }
      ],
      score: 3,
      order: 2
    },
    {
      id: 'q3',
      type: 'true_false',
      title: 'JavaScript 函数',
      content: 'JavaScript 中的函数可以作为参数传递给其他函数。',
      options: [
        { id: 'true', text: '正确' },
        { id: 'false', text: '错误' }
      ],
      score: 2,
      order: 3
    },
    {
      id: 'q4',
      type: 'fill_blank',
      title: 'DOM 操作',
      content: '使用 _______ 方法可以根据 ID 获取 DOM 元素。',
      score: 2,
      order: 4
    },
    {
      id: 'q5',
      type: 'essay',
      title: '异步编程',
      content: '请简述 JavaScript 中 Promise 的作用和基本用法。',
      score: 5,
      order: 5
    }
  ];

  const mockAttempt: ExamAttempt = {
    id: 'attempt-1',
    examId,
    userId: 'user-1',
    status: 'in_progress',
    startTime: new Date().toISOString(),
    currentQuestionIndex: 0,
    answers: [],
    flaggedQuestions: [],
    timeRemaining: 90 * 60 // 90分钟转换为秒
  };

  // 初始化考试
  useEffect(() => {
    const initializeExam = async () => {
      setLoading(true);
      try {
        // 模拟API调用
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        setQuestions(mockQuestions);
        setAttempt(mockAttempt);
        setTimeRemaining(mockAttempt.timeRemaining);
        setCurrentQuestionIndex(mockAttempt.currentQuestionIndex);
        
        // 进入全屏模式
        enterFullscreen();
        
        // 开始计时
        startTimer();
        
        // 设置防作弊监控
        setupAntiCheat();
        
        setLoading(false);
      } catch (error) {
        toast.error('加载考试失败');
        router.push(`/skill-exam/${examId}`);
      }
    };

    initializeExam();

    return () => {
      cleanup();
    };
  }, [examId, router]);

  // 清理函数
  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    if (autoSaveRef.current) {
      clearTimeout(autoSaveRef.current);
    }
    exitFullscreen();
    removeAntiCheatListeners();
  }, []);

  // 开始计时器
  const startTimer = useCallback(() => {
    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          // 时间到，自动提交
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  // 格式化时间显示
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  // 进入全屏
  const enterFullscreen = () => {
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(() => {
        addViolation('无法进入全屏模式');
      });
    }
  };

  // 退出全屏
  const exitFullscreen = () => {
    if (document.exitFullscreen && document.fullscreenElement) {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      });
    }
  };

  // 设置防作弊监控
  const setupAntiCheat = () => {
    // 监听页面可见性变化
    const handleVisibilityChange = () => {
      if (document.hidden) {
        visibilityRef.current = false;
        addViolation('切换到其他标签页或窗口');
      } else {
        visibilityRef.current = true;
      }
    };

    // 监听全屏状态变化
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setIsFullscreen(false);
        addViolation('退出全屏模式');
      }
    };

    // 监听右键点击
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      addViolation('尝试使用右键菜单');
    };

    // 监听键盘快捷键
    const handleKeyDown = (e: KeyboardEvent) => {
      // 禁用常见的作弊快捷键
      if (
        (e.ctrlKey && (e.key === 'c' || e.key === 'v' || e.key === 'a' || e.key === 'f')) ||
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && e.key === 'I')
      ) {
        e.preventDefault();
        addViolation(`尝试使用快捷键: ${e.key}`);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);

    // 保存监听器引用以便清理
    (window as any).examListeners = {
      handleVisibilityChange,
      handleFullscreenChange,
      handleContextMenu,
      handleKeyDown
    };
  };

  // 移除防作弊监听器
  const removeAntiCheatListeners = () => {
    const listeners = (window as any).examListeners;
    if (listeners) {
      document.removeEventListener('visibilitychange', listeners.handleVisibilityChange);
      document.removeEventListener('fullscreenchange', listeners.handleFullscreenChange);
      document.removeEventListener('contextmenu', listeners.handleContextMenu);
      document.removeEventListener('keydown', listeners.handleKeyDown);
    }
  };

  // 添加违规记录
  const addViolation = (description: string) => {
    setViolations(prev => [...prev, `${new Date().toLocaleTimeString()}: ${description}`]);
    toast.warning(`检测到违规行为: ${description}`);
  };

  // 获取当前题目
  const currentQuestion = questions[currentQuestionIndex];

  // 处理答案变化
  const handleAnswerChange = (questionId: string, answer: string | string[]) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));

    // 自动保存
    scheduleAutoSave();
  };

  // 计划自动保存
  const scheduleAutoSave = () => {
    if (autoSaveRef.current) {
      clearTimeout(autoSaveRef.current);
    }
    
    autoSaveRef.current = setTimeout(() => {
      autoSave();
    }, 2000); // 2秒后自动保存
  };

  // 自动保存
  const autoSave = async () => {
    setAutoSaving(true);
    try {
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 500));
      // 这里应该调用保存答案的API
      console.log('自动保存答案:', answers);
    } catch (error) {
      console.error('自动保存失败:', error);
    } finally {
      setAutoSaving(false);
    }
  };

  // 切换题目
  const goToQuestion = (index: number) => {
    if (index >= 0 && index < questions.length) {
      // 记录当前题目的答题时间
      const timeSpent = Date.now() - questionStartTime;
      
      setCurrentQuestionIndex(index);
      setQuestionStartTime(Date.now());
      
      // 保存答题时间
      if (currentQuestion) {
        // 这里可以记录每题的答题时间
        console.log(`题目 ${currentQuestion.id} 答题时间: ${timeSpent}ms`);
      }
    }
  };

  // 标记题目
  const toggleFlag = (questionId: string) => {
    setFlaggedQuestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(questionId)) {
        newSet.delete(questionId);
      } else {
        newSet.add(questionId);
      }
      return newSet;
    });
  };

  // 提交考试
  const handleSubmit = async () => {
    if (!confirm('确定要提交考试吗？提交后将无法修改答案。')) {
      return;
    }

    setSubmitting(true);
    try {
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast.success('考试提交成功');
      cleanup();
      router.push(`/skill-exam/${examId}/result`);
    } catch (error) {
      toast.error('提交失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  // 自动提交（时间到）
  const handleAutoSubmit = async () => {
    toast.warning('考试时间已到，正在自动提交...');
    await handleSubmit();
  };

  // 渲染题目内容
  const renderQuestion = () => {
    if (!currentQuestion) return null;

    const questionAnswer = answers[currentQuestion.id];

    switch (currentQuestion.type) {
      case 'single_choice':
        return (
          <RadioGroup
            value={questionAnswer as string || ''}
            onValueChange={(value) => handleAnswerChange(currentQuestion.id, value)}
          >
            {currentQuestion.options?.map((option) => (
              <div key={option.id} className="flex items-center space-x-2">
                <RadioGroupItem value={option.id} id={option.id} />
                <Label htmlFor={option.id} className="flex-1 cursor-pointer">
                  {option.text}
                </Label>
              </div>
            ))}
          </RadioGroup>
        );

      case 'multiple_choice':
        const selectedOptions = (questionAnswer as string[]) || [];
        return (
          <div className="space-y-2">
            {currentQuestion.options?.map((option) => (
              <div key={option.id} className="flex items-center space-x-2">
                <Checkbox
                  id={option.id}
                  checked={selectedOptions.includes(option.id)}
                  onCheckedChange={(checked) => {
                    const newSelection = checked
                      ? [...selectedOptions, option.id]
                      : selectedOptions.filter(id => id !== option.id);
                    handleAnswerChange(currentQuestion.id, newSelection);
                  }}
                />
                <Label htmlFor={option.id} className="flex-1 cursor-pointer">
                  {option.text}
                </Label>
              </div>
            ))}
          </div>
        );

      case 'true_false':
        return (
          <RadioGroup
            value={questionAnswer as string || ''}
            onValueChange={(value) => handleAnswerChange(currentQuestion.id, value)}
          >
            {currentQuestion.options?.map((option) => (
              <div key={option.id} className="flex items-center space-x-2">
                <RadioGroupItem value={option.id} id={option.id} />
                <Label htmlFor={option.id} className="flex-1 cursor-pointer">
                  {option.text}
                </Label>
              </div>
            ))}
          </RadioGroup>
        );

      case 'fill_blank':
        return (
          <Input
            value={questionAnswer as string || ''}
            onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
            placeholder="请输入答案..."
            className="w-full"
          />
        );

      case 'essay':
        return (
          <Textarea
            value={questionAnswer as string || ''}
            onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
            placeholder="请输入您的答案..."
            className="w-full min-h-32"
          />
        );

      default:
        return <div>不支持的题目类型</div>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">正在加载考试...</p>
        </div>
      </div>
    );
  }

  if (!attempt || !currentQuestion) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">考试加载失败</h3>
          <p className="text-gray-600">请刷新页面重试</p>
        </div>
      </div>
    );
  }

  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
  const answeredCount = Object.keys(answers).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部状态栏 */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-blue-600" />
              <span className={`font-mono text-lg ${timeRemaining < 300 ? 'text-red-600' : 'text-gray-900'}`}>
                {formatTime(timeRemaining)}
              </span>
            </div>
            
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">进度:</span>
              <span className="font-medium">{currentQuestionIndex + 1}/{questions.length}</span>
            </div>
            
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">已答:</span>
              <span className="font-medium">{answeredCount}/{questions.length}</span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {autoSaving && (
              <div className="flex items-center space-x-2 text-blue-600">
                <Save className="w-4 h-4 animate-pulse" />
                <span className="text-sm">自动保存中...</span>
              </div>
            )}
            
            <div className="flex items-center space-x-2">
              {isFullscreen ? (
                <Eye className="w-4 h-4 text-green-600" />
              ) : (
                <EyeOff className="w-4 h-4 text-red-600" />
              )}
              <span className="text-xs text-gray-600">
                {isFullscreen ? '全屏模式' : '非全屏'}
              </span>
            </div>

            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  提交中...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  提交考试
                </>
              )}
            </Button>
          </div>
        </div>

        {/* 进度条 */}
        <div className="mt-4">
          <Progress value={progress} className="h-2" />
        </div>
      </div>

      <div className="flex">
        {/* 题目导航 */}
        <div className="w-64 bg-white border-r border-gray-200 p-4">
          <h3 className="font-medium text-gray-900 mb-4">题目导航</h3>
          <div className="grid grid-cols-5 gap-2">
            {questions.map((question, index) => {
              const isAnswered = answers[question.id] !== undefined;
              const isFlagged = flaggedQuestions.has(question.id);
              const isCurrent = index === currentQuestionIndex;
              
              return (
                <button
                  key={question.id}
                  onClick={() => goToQuestion(index)}
                  className={`
                    relative w-10 h-10 rounded text-sm font-medium transition-colors
                    ${isCurrent 
                      ? 'bg-blue-600 text-white' 
                      : isAnswered 
                        ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }
                  `}
                >
                  {index + 1}
                  {isFlagged && (
                    <Flag className="absolute -top-1 -right-1 w-3 h-3 text-orange-500" />
                  )}
                </button>
              );
            })}
          </div>

          {/* 违规记录 */}
          {violations.length > 0 && (
            <div className="mt-6">
              <h4 className="font-medium text-red-600 mb-2 flex items-center">
                <Shield className="w-4 h-4 mr-1" />
                违规记录
              </h4>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {violations.map((violation, index) => (
                  <div key={index} className="text-xs text-red-600 bg-red-50 p-2 rounded">
                    {violation}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 主要内容区 */}
        <div className="flex-1 p-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <span>第 {currentQuestionIndex + 1} 题</span>
                  <Badge variant="outline">{currentQuestion.score}分</Badge>
                  {currentQuestion.type === 'multiple_choice' && (
                    <Badge variant="secondary">多选题</Badge>
                  )}
                </CardTitle>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleFlag(currentQuestion.id)}
                  className={flaggedQuestions.has(currentQuestion.id) ? 'text-orange-600' : ''}
                >
                  <Flag className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h3 className="font-medium text-lg mb-2">{currentQuestion.title}</h3>
                  <p className="text-gray-700 leading-relaxed">{currentQuestion.content}</p>
                </div>

                <div className="space-y-4">
                  {renderQuestion()}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 导航按钮 */}
          <div className="flex items-center justify-between mt-6">
            <Button
              variant="outline"
              onClick={() => goToQuestion(currentQuestionIndex - 1)}
              disabled={currentQuestionIndex === 0}
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              上一题
            </Button>

            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">
                第 {currentQuestionIndex + 1} 题，共 {questions.length} 题
              </span>
            </div>

            <Button
              variant="outline"
              onClick={() => goToQuestion(currentQuestionIndex + 1)}
              disabled={currentQuestionIndex === questions.length - 1}
            >
              下一题
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
