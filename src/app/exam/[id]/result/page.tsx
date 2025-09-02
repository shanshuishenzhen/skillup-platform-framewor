'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Trophy, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  BarChart3,
  Download,
  Share2,
  ArrowLeft,
  Target
} from 'lucide-react';
import { Exam } from '@/types/exam';
import { Question, QuestionOption } from '@/types/question';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { formatTime, formatDateTime } from '@/utils/format';
import Link from 'next/link';

interface ExamSubmission {
  id: string;
  exam_id: string;
  user_id: string;
  answers: Record<string, any>;
  score: number;
  total_score: number;
  percentage: number;
  time_used: number;
  submitted_at: string;
  graded_at?: string;
  feedback?: string;
  question_results: QuestionResult[];
}

interface QuestionResult {
  question_id: string;
  question: Question;
  user_answer: any;
  correct_answer: any;
  is_correct: boolean;
  points_earned: number;
  points_possible: number;
  feedback?: string;
}

interface ExamStats {
  total_participants: number;
  average_score: number;
  highest_score: number;
  lowest_score: number;
  pass_rate: number;
  user_rank: number;
}

/**
 * 考试结果页面组件
 * 显示用户的考试成绩、答题详情和统计信息
 */
export default function ExamResultPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const examId = params.id as string;
  
  // 状态管理
  const [exam, setExam] = useState<Exam | null>(null);
  const [submission, setSubmission] = useState<ExamSubmission | null>(null);
  const [stats, setStats] = useState<ExamStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  /**
   * 获取考试结果数据
   */
  const fetchResultData = async () => {
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
      
      // 获取用户提交记录
      const submissionResponse = await fetch(`/api/exams/${examId}/submit`);
      const submissionResult = await submissionResponse.json();
      
      if (!submissionResult.success || !submissionResult.data) {
        toast.error('未找到考试提交记录');
        router.push('/exams');
        return;
      }
      
      setSubmission(submissionResult.data);
      
      // 获取考试统计信息
      const statsResponse = await fetch(`/api/exams/${examId}/stats`);
      const statsResult = await statsResponse.json();
      
      if (statsResult.success) {
        setStats(statsResult.data);
      }
      
    } catch (error) {
      console.error('获取考试结果失败:', error);
      toast.error('获取考试结果失败');
      router.push('/exams');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 获取成绩等级
   */
  const getGradeInfo = (percentage: number) => {
    if (percentage >= 90) {
      return { grade: 'A', color: 'text-green-600', bgColor: 'bg-green-100' };
    } else if (percentage >= 80) {
      return { grade: 'B', color: 'text-blue-600', bgColor: 'bg-blue-100' };
    } else if (percentage >= 70) {
      return { grade: 'C', color: 'text-yellow-600', bgColor: 'bg-yellow-100' };
    } else if (percentage >= 60) {
      return { grade: 'D', color: 'text-orange-600', bgColor: 'bg-orange-100' };
    } else {
      return { grade: 'F', color: 'text-red-600', bgColor: 'bg-red-100' };
    }
  };

  /**
   * 获取答案显示文本
   */
  const getAnswerText = (question: Question, answer: any) => {
    if (!answer) return '未作答';
    
    switch (question.type) {
      case 'choice':
        const option = question.options?.find(opt => opt.id === answer || opt.text === answer);
        return option?.text || answer;
        
      case 'multiple_choice':
        if (Array.isArray(answer)) {
          const selectedOptions = question.options?.filter(opt => 
            answer.includes(opt.id) || answer.includes(opt.text)
          );
          return selectedOptions?.map(opt => opt.text).join(', ') || answer.join(', ');
        }
        return answer;
        
      case 'true_false':
        return answer === 'true' || answer === true ? '正确' : '错误';
        
      default:
        return answer.toString();
    }
  };

  /**
   * 下载成绩报告
   */
  const handleDownloadReport = () => {
    // 这里可以实现PDF报告生成和下载功能
    toast.info('成绩报告下载功能开发中');
  };

  /**
   * 分享成绩
   */
  const handleShareResult = () => {
    if (navigator.share) {
      navigator.share({
        title: `${exam?.title} - 考试成绩`,
        text: `我在"${exam?.title}"考试中获得了 ${submission?.percentage.toFixed(1)}% 的成绩！`,
        url: window.location.href
      });
    } else {
      // 复制到剪贴板
      navigator.clipboard.writeText(
        `我在"${exam?.title}"考试中获得了 ${submission?.percentage.toFixed(1)}% 的成绩！`
      );
      toast.success('成绩信息已复制到剪贴板');
    }
  };

  // 组件挂载时获取数据
  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    
    fetchResultData();
  }, [user, examId]);

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">加载考试结果中...</p>
        </div>
      </div>
    );
  }

  if (!exam || !submission) {
    return (
      <div className="container mx-auto p-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            考试结果加载失败，请刷新页面重试。
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const gradeInfo = getGradeInfo(submission.percentage);
  const correctCount = submission.question_results?.filter(r => r.is_correct).length || 0;
  const totalQuestions = submission.question_results?.length || 0;

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* 页面头部 */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <Link href="/exams">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回考试列表
            </Button>
          </Link>
          <h1 className="text-3xl font-bold mt-2">{exam.title} - 考试结果</h1>
          <p className="text-gray-600 mt-1">提交时间：{formatDateTime(submission.submitted_at)}</p>
        </div>
        
        <div className="flex space-x-2">
          <Button variant="outline" onClick={handleDownloadReport}>
            <Download className="w-4 h-4 mr-2" />
            下载报告
          </Button>
          <Button variant="outline" onClick={handleShareResult}>
            <Share2 className="w-4 h-4 mr-2" />
            分享成绩
          </Button>
        </div>
      </div>

      {/* 成绩概览卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {/* 总分 */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">总分</p>
                <p className="text-3xl font-bold">
                  {submission.score}
                  <span className="text-lg text-gray-500">/{submission.total_score}</span>
                </p>
              </div>
              <Trophy className={`w-8 h-8 ${gradeInfo.color}`} />
            </div>
          </CardContent>
        </Card>
        
        {/* 百分比和等级 */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">得分率</p>
                <p className="text-3xl font-bold">{submission.percentage.toFixed(1)}%</p>
                <Badge className={`${gradeInfo.bgColor} ${gradeInfo.color} mt-1`}>
                  等级 {gradeInfo.grade}
                </Badge>
              </div>
              <Target className={`w-8 h-8 ${gradeInfo.color}`} />
            </div>
          </CardContent>
        </Card>
        
        {/* 正确率 */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">正确题数</p>
                <p className="text-3xl font-bold">
                  {correctCount}
                  <span className="text-lg text-gray-500">/{totalQuestions}</span>
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  正确率 {totalQuestions > 0 ? ((correctCount / totalQuestions) * 100).toFixed(1) : 0}%
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        {/* 用时 */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">用时</p>
                <p className="text-3xl font-bold">{formatTime(submission.time_used)}</p>
                <p className="text-sm text-gray-600 mt-1">
                  总时长 {formatTime((exam.duration || 0) * 60)}
                </p>
              </div>
              <Clock className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 详细信息标签页 */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">成绩概览</TabsTrigger>
          <TabsTrigger value="details">答题详情</TabsTrigger>
          <TabsTrigger value="statistics">统计信息</TabsTrigger>
        </TabsList>
        
        {/* 成绩概览 */}
        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>成绩分析</CardTitle>
              <CardDescription>您的考试表现分析</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>总体得分</span>
                    <span>{submission.percentage.toFixed(1)}%</span>
                  </div>
                  <Progress value={submission.percentage} className="h-3" />
                </div>
                
                {submission.feedback && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>教师评语：</strong>{submission.feedback}
                    </AlertDescription>
                  </Alert>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h4 className="font-medium text-green-800 mb-2">答对题目</h4>
                    <p className="text-2xl font-bold text-green-600">{correctCount}</p>
                    <p className="text-sm text-green-600">共 {totalQuestions} 题</p>
                  </div>
                  
                  <div className="bg-red-50 p-4 rounded-lg">
                    <h4 className="font-medium text-red-800 mb-2">答错题目</h4>
                    <p className="text-2xl font-bold text-red-600">{totalQuestions - correctCount}</p>
                    <p className="text-sm text-red-600">需要复习</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* 答题详情 */}
        <TabsContent value="details" className="space-y-4">
          {submission.question_results?.map((result, index) => (
            <Card key={result.question_id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">
                    第 {index + 1} 题
                    <Badge className="ml-2">
                      {result.points_earned}/{result.points_possible} 分
                    </Badge>
                  </CardTitle>
                  {result.is_correct ? (
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  ) : (
                    <XCircle className="w-6 h-6 text-red-600" />
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">题目内容</h4>
                    <p className="text-gray-700">{result.question.content}</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium mb-2">您的答案</h4>
                      <div className={`p-3 rounded-lg ${
                        result.is_correct ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                      }`}>
                        {getAnswerText(result.question, result.user_answer)}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium mb-2">正确答案</h4>
                      <div className="p-3 rounded-lg bg-green-50 text-green-800">
                        {getAnswerText(result.question, result.correct_answer)}
                      </div>
                    </div>
                  </div>
                  
                  {result.question.explanation && (
                    <div>
                      <h4 className="font-medium mb-2">解析</h4>
                      <div className="p-3 rounded-lg bg-blue-50 text-blue-800">
                        {result.question.explanation}
                      </div>
                    </div>
                  )}
                  
                  {result.feedback && (
                    <div>
                      <h4 className="font-medium mb-2">评语</h4>
                      <div className="p-3 rounded-lg bg-gray-50 text-gray-800">
                        {result.feedback}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
        
        {/* 统计信息 */}
        <TabsContent value="statistics">
          {stats ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <BarChart3 className="w-5 h-5 mr-2" />
                    考试统计
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-gray-600">参与人数</span>
                      <span className="font-medium">{stats.total_participants} 人</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">平均分</span>
                      <span className="font-medium">{stats.average_score.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">最高分</span>
                      <span className="font-medium">{stats.highest_score.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">最低分</span>
                      <span className="font-medium">{stats.lowest_score.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">及格率</span>
                      <span className="font-medium">{stats.pass_rate.toFixed(1)}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>您的排名</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className="text-4xl font-bold text-blue-600 mb-2">
                      #{stats.user_rank}
                    </div>
                    <p className="text-gray-600">
                      在 {stats.total_participants} 名参与者中排名第 {stats.user_rank} 位
                    </p>
                    <div className="mt-4">
                      <Progress 
                        value={((stats.total_participants - stats.user_rank + 1) / stats.total_participants) * 100} 
                        className="h-3" 
                      />
                      <p className="text-sm text-gray-600 mt-2">
                        超过了 {(((stats.total_participants - stats.user_rank) / stats.total_participants) * 100).toFixed(1)}% 的参与者
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center text-gray-600">
                  <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>统计信息暂不可用</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}