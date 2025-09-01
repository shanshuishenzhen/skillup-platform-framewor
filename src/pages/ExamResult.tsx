import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Trophy, 
  Target, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  AlertTriangle,
  Download,
  Share2,
  RotateCcw,
  Home,
  BarChart3,
  FileText,
  Award,
  TrendingUp
} from 'lucide-react';
import { toast } from 'sonner';
import { useParams, useNavigate } from 'react-router-dom';

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
  const { examId, attemptId } = useParams<{ examId: string; attemptId: string }>();
  const navigate = useNavigate();
  
  const [result, setResult] = useState<ExamResult | null>(null);
  const [statistics, setStatistics] = useState<ExamStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

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
      navigate('/exams');
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
              <Button onClick={() => navigate('/exams')} variant="outline">
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

      {/* 详细分析 */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">总体分析</TabsTrigger>
          <TabsTrigger value="questions">题目详情</TabsTrigger>
          <TabsTrigger value="statistics">统计分析</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-6">
          {/* 答题统计 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                答题统计
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{statistics?.correct_answers}</div>
                  <div className="text-sm text-gray-600">完全正确</div>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">{statistics?.partial_answers}</div>
                  <div className="text-sm text-gray-600">部分正确</div>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{statistics?.incorrect_answers}</div>
                  <div className="text-sm text-gray-600">完全错误</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-600">{statistics?.unanswered}</div>
                  <div className="text-sm text-gray-600">未作答</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* 知识点分析 */}
          {statistics?.category_breakdown && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  知识点掌握情况
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(statistics.category_breakdown).map(([category, data]) => (
                    <div key={category} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{category}</span>
                        <span className="text-sm text-gray-600">
                          {data.correct}/{data.total} ({data.percentage}%)
                        </span>
                      </div>
                      <Progress value={data.percentage} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="questions" className="space-y-4">
          {result.questions.map((question, index) => (
            <Card key={question.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline">第{index + 1}题</Badge>
                      <Badge variant="secondary">{getQuestionTypeText(question.type)}</Badge>
                      <Badge className={getStatusColor(question.status)}>
                        {getStatusText(question.status)}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg">{question.title}</CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(question.status)}
                    <span className="font-medium">
                      {question.earned_score}/{question.score}分
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-700">{question.content}</p>
                
                {/* 选择题选项 */}
                {question.options && (
                  <div className="space-y-2">
                    <div className="font-medium text-sm text-gray-600">选项：</div>
                    {question.options.map((option) => {
                      const isUserSelected = question.user_answer?.selected_options?.includes(option.id);
                      const isCorrect = option.is_correct;
                      
                      return (
                        <div 
                          key={option.id} 
                          className={`p-3 rounded-lg border ${
                            isCorrect ? 'bg-green-50 border-green-200' : 
                            isUserSelected && !isCorrect ? 'bg-red-50 border-red-200' : 
                            'bg-gray-50 border-gray-200'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span>{option.text}</span>
                            <div className="flex items-center gap-2">
                              {isUserSelected && (
                                <Badge variant="outline" className="text-xs">
                                  您的选择
                                </Badge>
                              )}
                              {isCorrect && (
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                
                {/* 文本答案 */}
                {question.user_answer?.text_answer && (
                  <div className="space-y-2">
                    <div className="font-medium text-sm text-gray-600">您的答案：</div>
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      {question.user_answer.text_answer}
                    </div>
                  </div>
                )}
                
                {/* 标准答案和解析 */}
                {question.explanation && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="font-medium mb-1">解析：</div>
                      {question.explanation}
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>
        
        <TabsContent value="statistics" className="space-y-6">
          {/* 时间分析 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                时间分析
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{formatDuration(result.time_spent)}</div>
                  <div className="text-sm text-gray-600">总用时</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {statistics?.time_per_question.toFixed(1)}分钟
                  </div>
                  <div className="text-sm text-gray-600">平均每题用时</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {((result.time_spent / (examInfo?.duration || result.time_spent)) * 100).toFixed(0)}%
                  </div>
                  <div className="text-sm text-gray-600">时间利用率</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* 难度分析 */}
          {statistics?.difficulty_breakdown && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  难度分析
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(statistics.difficulty_breakdown).map(([difficulty, data]) => {
                    const percentage = data.total > 0 ? (data.correct / data.total) * 100 : 0;
                    return (
                      <div key={difficulty} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="font-medium capitalize">{difficulty}</span>
                          <span className="text-sm text-gray-600">
                            {data.correct}/{data.total} ({percentage.toFixed(0)}%)
                          </span>
                        </div>
                        <Progress value={percentage} className="h-2" />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* 建议和改进 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                学习建议
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {result.is_passed ? (
                  <Alert className="border-green-200 bg-green-50">
                    <Trophy className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                      恭喜您通过考试！您在JavaScript基础知识方面表现优秀。
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert className="border-orange-200 bg-orange-50">
                    <AlertTriangle className="h-4 w-4 text-orange-600" />
                    <AlertDescription className="text-orange-800">
                      本次考试未达到及格线，建议您重点复习以下知识点后再次尝试。
                    </AlertDescription>
                  </Alert>
                )}
                
                <div className="space-y-2">
                  <div className="font-medium">改进建议：</div>
                  <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                    {statistics && statistics.accuracy_rate < 80 && (
                      <li>建议加强基础知识的学习和练习</li>
                    )}
                    {statistics && statistics.time_per_question > 10 && (
                      <li>可以通过更多练习来提高答题速度</li>
                    )}
                    {statistics && statistics.partial_answers > statistics.correct_answers && (
                      <li>注意审题，确保理解题目要求</li>
                    )}
                    <li>建议复习相关课程材料和参考资料</li>
                    <li>可以参加相关的学习小组或讨论</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ExamResult;