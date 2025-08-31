/**
 * 成绩查询页面
 * 提供考试成绩查询、详细分析、证书下载等功能
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Award, 
  Download, 
  Share2, 
  Clock, 
  Target, 
  TrendingUp, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  BarChart3,
  PieChart,
  Calendar,
  User,
  Medal,
  Star,
  FileText,
  Eye,
  Printer,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { useParams } from 'next/navigation';

// 类型定义
interface ExamResult {
  id: string;
  examId: string;
  examTitle: string;
  userId: string;
  attemptNumber: number;
  status: 'completed' | 'passed' | 'failed';
  startTime: string;
  endTime: string;
  submitTime: string;
  totalScore: number;
  maxScore: number;
  passingScore: number;
  accuracy: number;
  timeSpent: number;
  isPassed: boolean;
  rank?: number;
  percentile?: number;
  certificate?: Certificate;
  questionResults: QuestionResult[];
  statistics: ExamStatistics;
}

interface QuestionResult {
  questionId: string;
  questionTitle: string;
  questionType: string;
  userAnswer: string | string[];
  correctAnswer: string | string[];
  isCorrect: boolean;
  score: number;
  maxScore: number;
  timeSpent: number;
  difficulty: string;
}

interface Certificate {
  id: string;
  certificateNumber: string;
  issuedAt: string;
  downloadUrl: string;
  verificationUrl: string;
}

interface ExamStatistics {
  totalQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  skippedAnswers: number;
  averageTimePerQuestion: number;
  difficultyBreakdown: {
    beginner: { correct: number; total: number };
    intermediate: { correct: number; total: number };
    advanced: { correct: number; total: number };
  };
  categoryBreakdown: Record<string, { correct: number; total: number }>;
}

export default function ExamResultPage() {
  const params = useParams();
  const examId = params.id as string;

  // 状态管理
  const [result, setResult] = useState<ExamResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);
  const [downloadingCertificate, setDownloadingCertificate] = useState(false);

  // 模拟数据
  const mockResult: ExamResult = {
    id: 'result-1',
    examId,
    examTitle: 'JavaScript 基础认证考试',
    userId: 'user-1',
    attemptNumber: 2,
    status: 'passed',
    startTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    endTime: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    submitTime: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    totalScore: 85,
    maxScore: 100,
    passingScore: 70,
    accuracy: 85,
    timeSpent: 75 * 60, // 75分钟
    isPassed: true,
    rank: 23,
    percentile: 78,
    certificate: {
      id: 'cert-1',
      certificateNumber: 'CERT-JS-2024-001234',
      issuedAt: new Date().toISOString(),
      downloadUrl: '/certificates/cert-1.pdf',
      verificationUrl: '/certificates/verify/cert-1'
    },
    questionResults: [
      {
        questionId: 'q1',
        questionTitle: 'JavaScript 变量声明',
        questionType: 'single_choice',
        userAnswer: 'a',
        correctAnswer: 'a',
        isCorrect: true,
        score: 2,
        maxScore: 2,
        timeSpent: 45,
        difficulty: 'beginner'
      },
      {
        questionId: 'q2',
        questionTitle: 'JavaScript 数据类型',
        questionType: 'multiple_choice',
        userAnswer: ['a', 'b', 'c'],
        correctAnswer: ['a', 'b', 'c', 'e'],
        isCorrect: false,
        score: 1,
        maxScore: 3,
        timeSpent: 120,
        difficulty: 'intermediate'
      },
      {
        questionId: 'q3',
        questionTitle: 'JavaScript 函数',
        questionType: 'true_false',
        userAnswer: 'true',
        correctAnswer: 'true',
        isCorrect: true,
        score: 2,
        maxScore: 2,
        timeSpent: 30,
        difficulty: 'beginner'
      },
      {
        questionId: 'q4',
        questionTitle: 'DOM 操作',
        questionType: 'fill_blank',
        userAnswer: 'getElementById',
        correctAnswer: 'getElementById',
        isCorrect: true,
        score: 2,
        maxScore: 2,
        timeSpent: 60,
        difficulty: 'intermediate'
      },
      {
        questionId: 'q5',
        questionTitle: '异步编程',
        questionType: 'essay',
        userAnswer: 'Promise 是 JavaScript 中处理异步操作的对象...',
        correctAnswer: '',
        isCorrect: true,
        score: 4,
        maxScore: 5,
        timeSpent: 300,
        difficulty: 'advanced'
      }
    ],
    statistics: {
      totalQuestions: 5,
      correctAnswers: 4,
      wrongAnswers: 1,
      skippedAnswers: 0,
      averageTimePerQuestion: 111,
      difficultyBreakdown: {
        beginner: { correct: 2, total: 2 },
        intermediate: { correct: 1, total: 2 },
        advanced: { correct: 1, total: 1 }
      },
      categoryBreakdown: {
        '基础语法': { correct: 2, total: 2 },
        'DOM操作': { correct: 1, total: 1 },
        '异步编程': { correct: 1, total: 1 },
        '数据类型': { correct: 0, total: 1 }
      }
    }
  };

  // 初始化数据
  useEffect(() => {
    const loadResult = async () => {
      setLoading(true);
      try {
        // 模拟API调用
        await new Promise(resolve => setTimeout(resolve, 1000));
        setResult(mockResult);
      } catch (error) {
        toast.error('加载成绩失败');
      } finally {
        setLoading(false);
      }
    };

    loadResult();
  }, [examId]);

  // 格式化时间
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}小时${minutes}分钟`;
    }
    return `${minutes}分钟${secs}秒`;
  };

  // 格式化日期
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN');
  };

  // 获取成绩等级
  const getGradeInfo = (score: number, maxScore: number) => {
    const percentage = (score / maxScore) * 100;
    
    if (percentage >= 90) {
      return { grade: 'A+', color: 'text-green-600', bgColor: 'bg-green-100' };
    } else if (percentage >= 80) {
      return { grade: 'A', color: 'text-green-600', bgColor: 'bg-green-100' };
    } else if (percentage >= 70) {
      return { grade: 'B', color: 'text-blue-600', bgColor: 'bg-blue-100' };
    } else if (percentage >= 60) {
      return { grade: 'C', color: 'text-yellow-600', bgColor: 'bg-yellow-100' };
    } else {
      return { grade: 'D', color: 'text-red-600', bgColor: 'bg-red-100' };
    }
  };

  // 下载证书
  const handleDownloadCertificate = async () => {
    if (!result?.certificate) return;
    
    setDownloadingCertificate(true);
    try {
      // 模拟下载
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('证书下载成功');
      // 实际实现中应该触发文件下载
      window.open(result.certificate.downloadUrl, '_blank');
    } catch (error) {
      toast.error('证书下载失败');
    } finally {
      setDownloadingCertificate(false);
    }
  };

  // 分享成绩
  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `我通过了${result?.examTitle}考试`,
        text: `我在${result?.examTitle}中获得了${result?.totalScore}分的好成绩！`,
        url: window.location.href
      });
    } else {
      // 复制链接到剪贴板
      navigator.clipboard.writeText(window.location.href);
      toast.success('链接已复制到剪贴板');
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="h-64 bg-gray-200 rounded"></div>
              <div className="h-48 bg-gray-200 rounded"></div>
            </div>
            <div className="space-y-6">
              <div className="h-32 bg-gray-200 rounded"></div>
              <div className="h-48 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="text-center py-12">
            <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">成绩不存在</h3>
            <p className="text-gray-600">请检查考试ID是否正确</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const gradeInfo = getGradeInfo(result.totalScore, result.maxScore);
  const percentage = (result.totalScore / result.maxScore) * 100;

  return (
    <div className="container mx-auto p-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">考试成绩</h1>
          <p className="text-gray-600 mt-1">{result.examTitle}</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button variant="outline" onClick={handleShare}>
            <Share2 className="w-4 h-4 mr-2" />
            分享成绩
          </Button>
          
          {result.certificate && (
            <Button onClick={handleDownloadCertificate} disabled={downloadingCertificate}>
              {downloadingCertificate ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  下载中...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  下载证书
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 主要内容 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 成绩概览 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Award className="w-5 h-5 mr-2" />
                成绩概览
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center mb-6">
                <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full ${gradeInfo.bgColor} mb-4`}>
                  <span className={`text-3xl font-bold ${gradeInfo.color}`}>
                    {gradeInfo.grade}
                  </span>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-center space-x-2">
                    <span className="text-4xl font-bold text-gray-900">
                      {result.totalScore}
                    </span>
                    <span className="text-xl text-gray-600">/ {result.maxScore}</span>
                  </div>
                  
                  <div className="flex items-center justify-center space-x-4 text-sm text-gray-600">
                    <span>准确率: {result.accuracy}%</span>
                    <span>•</span>
                    <span>用时: {formatTime(result.timeSpent)}</span>
                    {result.rank && (
                      <>
                        <span>•</span>
                        <span>排名: 第{result.rank}名</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className={`flex items-center justify-center w-12 h-12 rounded-lg mx-auto mb-2 ${
                    result.isPassed ? 'bg-green-100' : 'bg-red-100'
                  }`}>
                    {result.isPassed ? (
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    ) : (
                      <XCircle className="w-6 h-6 text-red-600" />
                    )}
                  </div>
                  <p className="text-sm text-gray-600">考试结果</p>
                  <p className={`font-semibold ${result.isPassed ? 'text-green-600' : 'text-red-600'}`}>
                    {result.isPassed ? '通过' : '未通过'}
                  </p>
                </div>
                
                <div className="text-center">
                  <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg mx-auto mb-2">
                    <Target className="w-6 h-6 text-blue-600" />
                  </div>
                  <p className="text-sm text-gray-600">及格分数</p>
                  <p className="font-semibold">{result.passingScore}分</p>
                </div>
                
                <div className="text-center">
                  <div className="flex items-center justify-center w-12 h-12 bg-purple-100 rounded-lg mx-auto mb-2">
                    <Clock className="w-6 h-6 text-purple-600" />
                  </div>
                  <p className="text-sm text-gray-600">答题时间</p>
                  <p className="font-semibold">{formatTime(result.timeSpent)}</p>
                </div>
                
                <div className="text-center">
                  <div className="flex items-center justify-center w-12 h-12 bg-orange-100 rounded-lg mx-auto mb-2">
                    <TrendingUp className="w-6 h-6 text-orange-600" />
                  </div>
                  <p className="text-sm text-gray-600">尝试次数</p>
                  <p className="font-semibold">第{result.attemptNumber}次</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 答题统计 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="w-5 h-5 mr-2" />
                答题统计
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 正确率统计 */}
                <div>
                  <h4 className="font-medium mb-4">答题情况</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">正确</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-500 h-2 rounded-full" 
                            style={{ width: `${(result.statistics.correctAnswers / result.statistics.totalQuestions) * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium">{result.statistics.correctAnswers}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">错误</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-red-500 h-2 rounded-full" 
                            style={{ width: `${(result.statistics.wrongAnswers / result.statistics.totalQuestions) * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium">{result.statistics.wrongAnswers}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">未答</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-gray-500 h-2 rounded-full" 
                            style={{ width: `${(result.statistics.skippedAnswers / result.statistics.totalQuestions) * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium">{result.statistics.skippedAnswers}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 难度分析 */}
                <div>
                  <h4 className="font-medium mb-4">难度分析</h4>
                  <div className="space-y-3">
                    {Object.entries(result.statistics.difficultyBreakdown).map(([difficulty, stats]) => {
                      const accuracy = stats.total > 0 ? (stats.correct / stats.total) * 100 : 0;
                      const difficultyLabels = {
                        beginner: '初级',
                        intermediate: '中级',
                        advanced: '高级'
                      };
                      
                      return (
                        <div key={difficulty} className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">
                            {difficultyLabels[difficulty as keyof typeof difficultyLabels]}
                          </span>
                          <div className="flex items-center space-x-2">
                            <div className="w-24 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-500 h-2 rounded-full" 
                                style={{ width: `${accuracy}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium">
                              {stats.correct}/{stats.total}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 题目详情 */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  <FileText className="w-5 h-5 mr-2" />
                  题目详情
                </CardTitle>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowDetails(!showDetails)}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  {showDetails ? '隐藏详情' : '查看详情'}
                </Button>
              </div>
            </CardHeader>
            
            {showDetails && (
              <CardContent>
                <div className="space-y-4">
                  {result.questionResults.map((question, index) => (
                    <div key={question.questionId} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <span className="font-medium">第{index + 1}题</span>
                            <Badge variant={question.isCorrect ? 'default' : 'destructive'}>
                              {question.isCorrect ? '正确' : '错误'}
                            </Badge>
                            <Badge variant="outline">
                              {question.score}/{question.maxScore}分
                            </Badge>
                          </div>
                          <h4 className="font-medium text-gray-900 mb-2">
                            {question.questionTitle}
                          </h4>
                        </div>
                        
                        <div className="text-right text-sm text-gray-600">
                          <p>用时: {formatTime(question.timeSpent)}</p>
                          <p>难度: {question.difficulty}</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600 mb-1">您的答案:</p>
                          <p className={`font-medium ${question.isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                            {Array.isArray(question.userAnswer) 
                              ? question.userAnswer.join(', ') 
                              : question.userAnswer || '未作答'
                            }
                          </p>
                        </div>
                        
                        {!question.isCorrect && (
                          <div>
                            <p className="text-gray-600 mb-1">正确答案:</p>
                            <p className="font-medium text-green-600">
                              {Array.isArray(question.correctAnswer) 
                                ? question.correctAnswer.join(', ') 
                                : question.correctAnswer
                              }
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        </div>

        {/* 侧边栏 */}
        <div className="space-y-6">
          {/* 考试信息 */}
          <Card>
            <CardHeader>
              <CardTitle>考试信息</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">考试名称</span>
                  <span className="font-medium">{result.examTitle}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">开始时间</span>
                  <span className="font-medium">{formatDate(result.startTime)}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">结束时间</span>
                  <span className="font-medium">{formatDate(result.endTime)}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">提交时间</span>
                  <span className="font-medium">{formatDate(result.submitTime)}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">尝试次数</span>
                  <span className="font-medium">第{result.attemptNumber}次</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 证书信息 */}
          {result.certificate && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Medal className="w-5 h-5 mr-2" />
                  证书信息
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center mb-4">
                  <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Award className="w-8 h-8 text-yellow-600" />
                  </div>
                  <h4 className="font-medium text-gray-900 mb-1">恭喜获得证书！</h4>
                  <p className="text-sm text-gray-600">证书编号: {result.certificate.certificateNumber}</p>
                </div>
                
                <div className="space-y-3">
                  <Button 
                    className="w-full" 
                    onClick={handleDownloadCertificate}
                    disabled={downloadingCertificate}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    下载证书
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => window.open(result.certificate?.verificationUrl, '_blank')}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    验证证书
                  </Button>
                </div>
                
                <div className="mt-4 text-xs text-gray-500 text-center">
                  <p>颁发时间: {formatDate(result.certificate.issuedAt)}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 排名信息 */}
          {result.rank && result.percentile && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="w-5 h-5 mr-2" />
                  排名信息
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600 mb-2">
                    #{result.rank}
                  </div>
                  <p className="text-sm text-gray-600 mb-4">
                    超过了 {result.percentile}% 的考生
                  </p>
                  
                  <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                    <div 
                      className="bg-blue-500 h-3 rounded-full" 
                      style={{ width: `${result.percentile}%` }}
                    ></div>
                  </div>
                  
                  <p className="text-xs text-gray-500">
                    您的成绩位于前 {100 - result.percentile}%
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
