import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Trophy, 
  XCircle, 
  AlertCircle,
  RotateCcw,
  Home,
  Info,
  CheckCircle,
  Target,
  Download,
  Share2
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
 * 答案状态枚举
 */
enum AnswerStatus {
  CORRECT = 'correct',
  INCORRECT = 'incorrect',
  PARTIAL = 'partial',
  PENDING = 'pending'
}

/**
 * 题目选项接口
 */
interface QuestionOption {
  id: string;
  text: string;
  is_correct: boolean;
}

/**
 * 题目详情接口
 */
interface QuestionDetail {
  id: string;
  type: QuestionType;
  title: string;
  content: string;
  options?: QuestionOption[];
  score: number;
  order_index: number;
  explanation?: string;
  user_answer?: {
    selected_options?: string[];
    text_answer?: string;
  };
  correct_answer?: {
    selected_options?: string[];
    text_answer?: string;
  };
  earned_score: number;
  status: AnswerStatus;
}

/**
 * 考试结果接口
 */
interface ExamResult {
  id: string;
  exam_id: string;
  exam_title: string;
  user_id: string;
  total_score: number;
  earned_score: number;
  passing_score: number;
  percentage: number;
  is_passed: boolean;
  time_spent: number; // 分钟
  started_at: string;
  completed_at: string;
  questions: QuestionDetail[];
  certificate_id?: string;
}

/**
 * 统计信息接口
 */
interface ExamStatistics {
  total_questions: number;
  correct_answers: number;
  incorrect_answers: number;
  partial_answers: number;
  unanswered: number;
  accuracy_rate: number;
  time_per_question: number; // 分钟
  difficulty_breakdown: {
    easy: { correct: number; total: number };
    medium: { correct: number; total: number };
    hard: { correct: number; total: number };
  };
  category_breakdown: {
    [category: string]: { correct: number; total: number; percentage: number };
  };
}

/**
 * 考试结果页面组件
 * 显示考试完成后的详细成绩和分析
 */
const ExamResult: React.FC = () => {
  const router = useRouter();
  const { examId, attemptId } = router.query as { examId: string; attemptId: string };
  
  const [result, setResult] = useState<ExamResult | null>(null);
  const [statistics, setStatistics] = useState<ExamStatistics | null>(null);
  const [loading, setLoading] = useState(true);

  /**
   * 获取考试结果数据
   */
  const fetchExamResult = async () => {
    try {
      setLoading(true);
      // TODO: 实现API调用
      // const [resultResponse, statisticsResponse] = await Promise.all([
      //   examService.getExamResult(examId!, attemptId!),
      //   examService.getExamStatistics(examId!, attemptId!)
      // ]);
      // setResult(resultResponse.data);
      // setStatistics(statisticsResponse.data);
      
      // 模拟数据
      const mockResult: ExamResult = {
        id: attemptId!,
        exam_id: examId!,
        exam_title: 'JavaScript基础考试',
        user_id: 'user1',
        total_score: 100,
        earned_score: 78,
        passing_score: 60,
        percentage: 78,
        is_passed: true,
        time_spent: 45,
        started_at: '2024-01-15T09:00:00Z',
        completed_at: '2024-01-15T09:45:00Z',
        certificate_id: 'cert_123',
        questions: [
          {
            id: '1',
            type: QuestionType.SINGLE_CHOICE,
            title: 'JavaScript变量声明',
            content: '以下哪种方式是声明JavaScript变量的正确方法？',
            options: [
              { id: '1a', text: 'var myVariable;', is_correct: true },
              { id: '1b', text: 'variable myVariable;', is_correct: false },
              { id: '1c', text: 'v myVariable;', is_correct: false },
              { id: '1d', text: 'declare myVariable;', is_correct: false }
            ],
            score: 10,
            order_index: 1,
            explanation: 'var是JavaScript中声明变量的关键字之一。',
            user_answer: { selected_options: ['1a'] },
            correct_answer: { selected_options: ['1a'] },
            earned_score: 10,
            status: AnswerStatus.CORRECT
          },
          {
            id: '2',
            type: QuestionType.MULTIPLE_CHOICE,
            title: 'JavaScript数据类型',
            content: '以下哪些是JavaScript的基本数据类型？（多选）',
            options: [
              { id: '2a', text: 'string', is_correct: true },
              { id: '2b', text: 'number', is_correct: true },
              { id: '2c', text: 'boolean', is_correct: true },
              { id: '2d', text: 'array', is_correct: false }
            ],
            score: 15,
            order_index: 2,
            explanation: 'JavaScript的基本数据类型包括string、number、boolean、undefined、null、symbol和bigint。array是引用类型。',
            user_answer: { selected_options: ['2a', '2b', '2d'] },
            correct_answer: { selected_options: ['2a', '2b', '2c'] },
            earned_score: 10,
            status: AnswerStatus.PARTIAL
          },
          {
            id: '3',
            type: QuestionType.TRUE_FALSE,
            title: 'JavaScript函数',
            content: 'JavaScript中的函数是一等公民，可以作为参数传递给其他函数。',
            options: [
              { id: '3a', text: '正确', is_correct: true },
              { id: '3b', text: '错误', is_correct: false }
            ],
            score: 10,
            order_index: 3,
            explanation: 'JavaScript中函数确实是一等公民，可以作为值传递、赋值给变量、作为参数传递等。',
            user_answer: { selected_options: ['3a'] },
            correct_answer: { selected_options: ['3a'] },
            earned_score: 10,
            status: AnswerStatus.CORRECT
          },
          {
            id: '4',
            type: QuestionType.SHORT_ANSWER,
            title: 'JavaScript闭包',
            content: '请简要解释什么是JavaScript闭包？',
            score: 20,
            order_index: 4,
            explanation: '闭包是指函数能够访问其外部作用域中的变量，即使在外部函数已经返回之后。',
            user_answer: { text_answer: '闭包是函数可以访问外部变量的特性。' },
            correct_answer: { text_answer: '闭包是指函数能够访问其外部作用域中的变量，即使在外部函数已经返回之后。' },
            earned_score: 15,
            status: AnswerStatus.PARTIAL
          },
          {
            id: '5',
            type: QuestionType.ESSAY,
            title: 'JavaScript异步编程',
            content: '请详细说明JavaScript中的异步编程方式，包括回调函数、Promise和async/await的区别和使用场景。',
            score: 45,
            order_index: 5,
            explanation: '异步编程是JavaScript的重要特性，主要有回调函数、Promise和async/await三种方式。',
            user_answer: { 
              text_answer: '回调函数是最早的异步编程方式，但容易造成回调地狱。Promise提供了更好的链式调用。async/await是基于Promise的语法糖，让异步代码看起来像同步代码。' 
            },
            earned_score: 33,
            status: AnswerStatus.PARTIAL
          }
        ]
      };
      
      const mockStatistics: ExamStatistics = {
        total_questions: 5,
        correct_answers: 2,
        incorrect_answers: 0,
        partial_answers: 3,
        unanswered: 0,
        accuracy_rate: 78,
        time_per_question: 9,
        difficulty_breakdown: {
          easy: { correct: 2, total: 2 },
          medium: { correct: 1, total: 2 },
          hard: { correct: 0, total: 1 }
        },
        category_breakdown: {
          '基础语法': { correct: 2, total: 3, percentage: 67 },
          '高级特性': { correct: 1, total: 2, percentage: 50 }
        }
      };
      
      setResult(mockResult);
      setStatistics(mockStatistics);
    } catch (error) {
      console.error('获取考试结果失败:', error);
      toast.error('获取考试结果失败');
      router.push('/exams');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 获取状态图标
   */
  const getStatusIcon = (status: AnswerStatus) => {
    switch (status) {
      case AnswerStatus.CORRECT:
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case AnswerStatus.INCORRECT:
        return <XCircle className="h-5 w-5 text-red-600" />;
      case AnswerStatus.PARTIAL:
        return <AlertCircle className="h-5 w-5 text-orange-600" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-400" />;
    }
  };

  /**
   * 获取状态文本
   */
  const getStatusText = (status: AnswerStatus): string => {
    const statusMap = {
      [AnswerStatus.CORRECT]: '正确',
      [AnswerStatus.INCORRECT]: '错误',
      [AnswerStatus.PARTIAL]: '部分正确',
      [AnswerStatus.PENDING]: '待评分'
    };
    return statusMap[status];
  };

  /**
   * 获取状态颜色
   */
  const getStatusColor = (status: AnswerStatus): string => {
    const colorMap = {
      [AnswerStatus.CORRECT]: 'bg-green-100 text-green-800',
      [AnswerStatus.INCORRECT]: 'bg-red-100 text-red-800',
      [AnswerStatus.PARTIAL]: 'bg-orange-100 text-orange-800',
      [AnswerStatus.PENDING]: 'bg-gray-100 text-gray-800'
    };
    return colorMap[status];
  };

  /**
   * 获取题目类型文本
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
   * 格式化时间
   */
  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}小时${mins}分钟`;
    }
    return `${mins}分钟`;
  };

  /**
   * 下载证书
   */
  const downloadCertificate = async () => {
    try {
      // TODO: 实现证书下载
      toast.success('证书下载功能即将推出');
    } catch (error) {
      console.error('下载证书失败:', error);
      toast.error('下载证书失败');
    }
  };

  /**
   * 分享成绩
   */
  const shareResult = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: `我在${result?.exam_title}中获得了${result?.percentage}%的成绩！`,
          text: `刚刚完成了${result?.exam_title}考试，获得${result?.earned_score}/${result?.total_score}分的好成绩！`,
          url: window.location.href
        });
      } else {
        // 复制到剪贴板
        await navigator.clipboard.writeText(
          `我在${result?.exam_title}中获得了${result?.percentage}%的成绩！查看详情：${window.location.href}`
        );
        toast.success('成绩链接已复制到剪贴板');
      }
    } catch (error) {
      console.error('分享失败:', error);
      toast.error('分享失败');
    }
  };

  useEffect(() => {
    fetchExamResult();
  }, [examId, attemptId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">加载考试结果中...</div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-red-600">考试结果不存在</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl space-y-6">
      {/* 成绩概览 */}
      <Card className={`border-2 ${
        result.is_passed ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
      }`}>
        <CardContent className="p-8">
          <div className="text-center space-y-4">
            <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full ${
              result.is_passed ? 'bg-green-100' : 'bg-red-100'
            }`}>
              {result.is_passed ? (
                <Trophy className="h-10 w-10 text-green-600" />
              ) : (
                <Target className="h-10 w-10 text-red-600" />
              )}
            </div>
            
            <div>
              <h1 className="text-3xl font-bold mb-2">{result.exam_title}</h1>
              <Badge 
                className={`text-lg px-4 py-2 ${
                  result.is_passed ? 'bg-green-600' : 'bg-red-600'
                }`}
              >
                {result.is_passed ? '考试通过' : '考试未通过'}
              </Badge>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-8">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">{result.earned_score}</div>
                <div className="text-sm text-gray-600">获得分数</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600">{result.percentage}%</div>
                <div className="text-sm text-gray-600">正确率</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-600">{formatDuration(result.time_spent)}</div>
                <div className="text-sm text-gray-600">用时</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">{result.passing_score}</div>
                <div className="text-sm text-gray-600">及格分</div>
              </div>
            </div>
            
            <Progress value={result.percentage} className="w-full max-w-md mx-auto" />
            
            <div className="flex justify-center gap-4 mt-6">
              <Button onClick={() => router.push('/exams')} variant="outline">
                <Home className="h-4 w-4 mr-2" />
                返回考试列表
              </Button>
              {result.is_passed && result.certificate_id && (
                <Button onClick={downloadCertificate}>
                  <Download className="h-4 w-4 mr-2" />
                  下载证书
                </Button>
              )}
              <Button onClick={shareResult} variant="outline">
                <Share2 className="h-4 w-4 mr-2" />
                分享成绩
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 考试说明 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-center">
          <div className="mb-4">
            <AlertCircle className="h-12 w-12 text-blue-500 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-gray-900">技能等级考试说明</h3>
          </div>
          
          <div className="max-w-2xl mx-auto text-gray-600 space-y-3">
            <p>本次考试为技能等级认定考试，重点关注技能掌握程度的评估。</p>
            <p>考试结果将由相关部门进行统一评估和通知，请耐心等待。</p>
            <p>如有疑问，请联系相关管理部门或培训机构。</p>
          </div>
          
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-blue-800 font-medium">成绩通知方式</p>
            <p className="text-blue-700 text-sm mt-1">
              详细成绩和认证结果将通过官方渠道统一发布，请关注相关通知。
            </p>
          </div>
        </div>
      </div>


    </div>
  );
};

export default ExamResult;