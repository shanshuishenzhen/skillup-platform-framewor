'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { 
  Trophy, 
  Medal, 
  Target, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Download,
  Share2,
  RotateCcw,
  Home,
  FileText,
  TrendingUp,
  Award
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
 * 考试结果页面
 * 显示用户的考试成绩和详细分析
 */
export default function ExamResultPage() {
  const params = useParams();
  const router = useRouter();
  const examId = params.id as string;
  
  const [exam, setExam] = useState<Exam | null>(null);
  const [attempt, setAttempt] = useState<ExamAttempt | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<UserAnswer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDetailedResults, setShowDetailedResults] = useState(false);

  /**
   * 加载考试结果
   */
  const loadExamResult = async () => {
    try {
      setLoading(true);
      
      // 加载考试信息
      const examData = await ExamService.getExamById(examId);
      setExam(examData);
      
      // TODO: 实现获取考试结果的API调用
      // const resultData = await ExamService.getExamResult(examId);
      // setAttempt(resultData.attempt);
      // setQuestions(resultData.questions);
      // setAnswers(resultData.answers);
      
      // 模拟数据
      const mockAttempt: ExamAttempt = {
        id: 'attempt_1',
        exam_id: examId,
        user_id: 'user_1',
        status: AttemptStatus.COMPLETED,
        score: 85,
        max_score: 100,
        started_at: new Date(Date.now() - 3600000).toISOString(),
        completed_at: new Date().toISOString(),
        time_spent: 3600,
        attempt_number: 1,
        submitted_at: new Date().toISOString(),
        remaining_time: 0,
        violations: [],
        ip_address: '192.168.1.1',
        user_agent: 'Mozilla/5.0'
      };
      setAttempt(mockAttempt);
      
    } catch (error) {
      console.error('加载考试结果失败:', error);
      toast.error('加载考试结果失败');
      router.push('/skill-exam');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 格式化时间显示
   */
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}小时${minutes}分钟${secs}秒`;
    }
    if (minutes > 0) {
      return `${minutes}分钟${secs}秒`;
    }
    return `${secs}秒`;
  };

  /**
   * 获取成绩等级
   */
  const getScoreGrade = (score: number, maxScore: number) => {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 90) return { grade: 'A', color: 'text-green-600', bg: 'bg-green-100' };
    if (percentage >= 80) return { grade: 'B', color: 'text-blue-600', bg: 'bg-blue-100' };
    if (percentage >= 70) return { grade: 'C', color: 'text-yellow-600', bg: 'bg-yellow-100' };
    if (percentage >= 60) return { grade: 'D', color: 'text-orange-600', bg: 'bg-orange-100' };
    return { grade: 'F', color: 'text-red-600', bg: 'bg-red-100' };
  };

  /**
   * 检查是否通过考试
   */
  const isPassed = () => {
    if (!exam || !attempt) return false;
    return attempt.score >= exam.passing_score;
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
   * 重新考试
   */
  const retakeExam = () => {
    if (!exam?.allow_retake) {
      toast.error('该考试不允许重考');
      return;
    }
    router.push(`/exam/${examId}`);
  };

  /**
   * 下载证书
   */
  const downloadCertificate = () => {
    if (!isPassed()) {
      toast.error('只有通过考试才能下载证书');
      return;
    }
    // TODO: 实现证书下载功能
    toast.success('证书下载功能开发中');
  };

  /**
   * 分享成绩
   */
  const shareResult = () => {
    if (!attempt) return;
    
    const shareText = `我在技能提升平台完成了「${exam?.title}」考试，获得了${attempt.score}分的成绩！`;
    
    if (navigator.share) {
      navigator.share({
        title: '考试成绩分享',
        text: shareText,
        url: window.location.href
      });
    } else {
      navigator.clipboard.writeText(shareText);
      toast.success('成绩信息已复制到剪贴板');
    }
  };

  /**
   * 渲染成绩概览
   */
  const renderScoreOverview = () => {
    if (!attempt || !exam) return null;
    
    const scoreGrade = getScoreGrade(attempt.score, attempt.max_score);
    const percentage = (attempt.score / attempt.max_score) * 100;
    const passed = isPassed();

    return (
      <Card className="text-center">
        <CardHeader>
          <div className="flex justify-center mb-4">
            {passed ? (
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                <Trophy className="h-10 w-10 text-green-600" />
              </div>
            ) : (
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
                <AlertCircle className="h-10 w-10 text-red-600" />
              </div>
            )}
          </div>
          <CardTitle className="text-2xl">
            {passed ? '恭喜通过考试！' : '很遗憾，未通过考试'}
          </CardTitle>
          <CardDescription>
            {exam.title} · {getDifficultyText(exam.difficulty)}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-center gap-4">
              <div className={`text-6xl font-bold ${scoreGrade.color}`}>
                {attempt.score}
              </div>
              <div className="text-left">
                <div className="text-2xl text-gray-600">/ {attempt.max_score}</div>
                <div className={`text-lg font-semibold ${scoreGrade.color}`}>
                  {percentage.toFixed(1)}%
                </div>
              </div>
            </div>
            <Badge className={`${scoreGrade.bg} ${scoreGrade.color} text-lg px-3 py-1`}>
              等级 {scoreGrade.grade}
            </Badge>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>及格线</span>
              <span>{exam.passing_score} 分</span>
            </div>
            <Progress 
              value={percentage} 
              className="h-3"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>0</span>
              <span className="text-red-500">及格线 ({exam.passing_score})</span>
              <span>{attempt.max_score}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="text-gray-600">用时</div>
              <div className="font-semibold">
                {formatDuration(attempt.time_spent)}
              </div>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="text-gray-600">完成时间</div>
              <div className="font-semibold">
                {new Date(attempt.completed_at).toLocaleString()}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  /**
   * 渲染操作按钮
   */
  const renderActionButtons = () => (
    <div className="flex flex-wrap justify-center gap-3">
      <Button onClick={() => router.push('/skill-exam')} variant="outline">
        <Home className="h-4 w-4 mr-2" />
        返回首页
      </Button>
      
      <Button 
        onClick={() => setShowDetailedResults(!showDetailedResults)}
        variant="outline"
      >
        <FileText className="h-4 w-4 mr-2" />
        {showDetailedResults ? '隐藏' : '查看'}详细结果
      </Button>
      
      {isPassed() && (
        <Button onClick={downloadCertificate} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          下载证书
        </Button>
      )}
      
      <Button onClick={shareResult} variant="outline">
        <Share2 className="h-4 w-4 mr-2" />
        分享成绩
      </Button>
      
      {exam?.allow_retake && (
        <Button onClick={retakeExam}>
          <RotateCcw className="h-4 w-4 mr-2" />
          重新考试
        </Button>
      )}
    </div>
  );

  /**
   * 渲染详细结果
   */
  const renderDetailedResults = () => {
    if (!showDetailedResults || !attempt) return null;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            详细分析
          </CardTitle>
          <CardDescription>
            查看您在各个方面的表现
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 基本统计 */}
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{questions.length}</div>
              <div className="text-sm text-gray-600">总题目数</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {answers.filter(a => a.answer).length}
              </div>
              <div className="text-sm text-gray-600">已答题目</div>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">
                {Math.round(attempt.time_spent / 60)}
              </div>
              <div className="text-sm text-gray-600">用时（分钟）</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {attempt.attempt_number}
              </div>
              <div className="text-sm text-gray-600">尝试次数</div>
            </div>
          </div>

          <Separator />

          {/* 题型分析 */}
          <div>
            <h3 className="text-lg font-semibold mb-4">题型分析</h3>
            <div className="space-y-3">
              {Object.entries(
                questions.reduce((acc, q) => {
                  const type = q.type;
                  if (!acc[type]) {
                    acc[type] = { total: 0, score: 0, maxScore: 0 };
                  }
                  acc[type].total += 1;
                  acc[type].maxScore += q.score;
                  // TODO: 计算实际得分
                  acc[type].score += Math.floor(q.score * 0.8); // 模拟80%正确率
                  return acc;
                }, {} as Record<string, { total: number; score: number; maxScore: number }>)
              ).map(([type, stats]) => {
                const percentage = (stats.score / stats.maxScore) * 100;
                const typeText = {
                  [QuestionType.SINGLE_CHOICE]: '单选题',
                  [QuestionType.MULTIPLE_CHOICE]: '多选题',
                  [QuestionType.TRUE_FALSE]: '判断题',
                  [QuestionType.FILL_BLANK]: '填空题',
                  [QuestionType.ESSAY]: '问答题'
                }[type as QuestionType] || type;
                
                return (
                  <div key={type} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{typeText}</span>
                      <span className="text-sm text-gray-600">
                        {stats.score}/{stats.maxScore} 分 ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <Progress value={percentage} className="h-2" />
                  </div>
                );
              })}
            </div>
          </div>

          <Separator />

          {/* 改进建议 */}
          <div>
            <h3 className="text-lg font-semibold mb-4">改进建议</h3>
            <div className="space-y-3">
              {isPassed() ? (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    恭喜您通过了考试！您的表现很出色，继续保持这种学习状态。
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    建议您复习相关知识点，特别关注得分较低的题型，然后重新参加考试。
                  </AlertDescription>
                </Alert>
              )}
              
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">学习建议：</h4>
                <ul className="text-sm space-y-1 text-gray-700">
                  <li>• 重点复习得分较低的知识点</li>
                  <li>• 多做相关练习题加强理解</li>
                  <li>• 注意答题时间的合理分配</li>
                  <li>• 仔细阅读题目，避免粗心错误</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  useEffect(() => {
    if (examId) {
      loadExamResult();
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

  if (!exam || !attempt) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="text-center py-8">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">结果不可用</h3>
            <p className="text-gray-600 mb-4">无法找到考试结果</p>
            <Button onClick={() => router.push('/skill-exam')}>返回考试列表</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* 成绩概览 */}
      {renderScoreOverview()}
      
      {/* 操作按钮 */}
      {renderActionButtons()}
      
      {/* 详细结果 */}
      {renderDetailedResults()}
      
      {/* 通过提示 */}
      {isPassed() && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Award className="h-8 w-8 text-green-600" />
              <div>
                <h3 className="text-lg font-semibold text-green-800">
                  恭喜获得认证！
                </h3>
                <p className="text-green-700">
                  您已成功通过「{exam.title}」考试，可以下载电子证书作为能力证明。
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}