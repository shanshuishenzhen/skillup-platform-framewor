'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { 
  Clock, 
  Users, 
  Target, 
  BookOpen, 
  Trophy, 
  Calendar, 
  DollarSign, 
  FileText, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Info,
  Play,
  ArrowLeft,
  Star,
  Award,
  Shield,
  Zap,
  TrendingUp
} from 'lucide-react';
import { 
  ExamService, 
  ExamStatus, 
  ExamDifficulty,
  QuestionType,
  type Exam, 
  type Question,
  type ExamEligibility
} from '@/services/examService';

/**
 * 考试详情页面
 * 显示考试的详细信息，包括考试说明、题型分布、报名要求等
 */
export default function ExamDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const examId = params.id as string;
  
  const [exam, setExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [eligibility, setEligibility] = useState<ExamEligibility | null>(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);

  /**
   * 加载考试详情
   */
  const loadExamDetails = async () => {
    try {
      setLoading(true);
      
      // 加载考试信息
      const examData = await ExamService.getExamById(examId, true);
      setExam(examData);
      
      // 加载题目信息（不包含答案）
      const questionsData = await ExamService.getExamQuestions(examId, false);
      setQuestions(questionsData);
      
      // 检查考试资格
      const eligibilityData = await ExamService.checkExamEligibility(examId);
      setEligibility(eligibilityData);
      setIsRegistered(eligibilityData.is_registered);
      
    } catch (error) {
      console.error('加载考试详情失败:', error);
      toast.error('加载考试详情失败');
      router.push('/skill-exam');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 报名考试
   */
  const registerForExam = async () => {
    if (!exam || !eligibility) return;
    
    try {
      setRegistering(true);
      await ExamService.registerForExam(examId);
      setIsRegistered(true);
      toast.success('报名成功！');
      
      // 重新检查资格
      const updatedEligibility = await ExamService.checkExamEligibility(examId);
      setEligibility(updatedEligibility);
      
    } catch (error) {
      console.error('报名失败:', error);
      toast.error('报名失败，请稍后重试');
    } finally {
      setRegistering(false);
    }
  };

  /**
   * 开始考试
   */
  const startExam = () => {
    router.push(`/exam/${examId}`);
  };

  /**
   * 获取难度显示文本和样式
   */
  const getDifficultyInfo = (difficulty: ExamDifficulty) => {
    const difficultyMap = {
      [ExamDifficulty.BEGINNER]: { text: '初级', color: 'bg-green-100 text-green-800' },
      [ExamDifficulty.INTERMEDIATE]: { text: '中级', color: 'bg-yellow-100 text-yellow-800' },
      [ExamDifficulty.ADVANCED]: { text: '高级', color: 'bg-red-100 text-red-800' }
    };
    return difficultyMap[difficulty] || { text: difficulty, color: 'bg-gray-100 text-gray-800' };
  };

  /**
   * 获取状态显示文本和样式
   */
  const getStatusInfo = (exam: Exam) => {
    const now = new Date();
    const startTime = new Date(exam.start_time);
    const endTime = new Date(exam.end_time);
    
    if (exam.status === ExamStatus.DRAFT) {
      return { text: '即将开始', color: 'bg-blue-100 text-blue-800', icon: Calendar };
    }
    
    if (exam.status === ExamStatus.ONGOING) {
      if (now < startTime) {
        return { text: '未开始', color: 'bg-yellow-100 text-yellow-800', icon: Clock };
      }
      if (now > endTime) {
        return { text: '已结束', color: 'bg-gray-100 text-gray-800', icon: XCircle };
      }
      return { text: '进行中', color: 'bg-green-100 text-green-800', icon: Play };
    }
    
    if (exam.status === ExamStatus.FINISHED) {
      return { text: '已完成', color: 'bg-gray-100 text-gray-800', icon: CheckCircle };
    }
    
    return { text: '未知', color: 'bg-gray-100 text-gray-800', icon: AlertCircle };
  };

  /**
   * 获取题型分布
   */
  const getQuestionTypeDistribution = () => {
    const distribution = questions.reduce((acc, question) => {
      const type = question.type;
      if (!acc[type]) {
        acc[type] = { count: 0, score: 0 };
      }
      acc[type].count += 1;
      acc[type].score += question.score;
      return acc;
    }, {} as Record<string, { count: number; score: number }>);
    
    return Object.entries(distribution).map(([type, data]) => {
      const typeText = {
        [QuestionType.SINGLE_CHOICE]: '单选题',
        [QuestionType.MULTIPLE_CHOICE]: '多选题',
        [QuestionType.TRUE_FALSE]: '判断题',
        [QuestionType.FILL_BLANK]: '填空题',
        [QuestionType.ESSAY]: '问答题'
      }[type as QuestionType] || type;
      
      return {
        type: typeText,
        count: data.count,
        score: data.score,
        percentage: (data.count / questions.length) * 100
      };
    });
  };

  /**
   * 检查是否可以开始考试
   */
  const canStartExam = () => {
    if (!exam || !eligibility) return false;
    
    const now = new Date();
    const startTime = new Date(exam.start_time);
    const endTime = new Date(exam.end_time);
    
    return eligibility.can_take && 
           exam.status === ExamStatus.ONGOING &&
           now >= startTime && 
           now <= endTime &&
           isRegistered;
  };

  /**
   * 渲染考试基本信息
   */
  const renderExamInfo = () => {
    if (!exam) return null;
    
    const difficultyInfo = getDifficultyInfo(exam.difficulty);
    const statusInfo = getStatusInfo(exam);
    const StatusIcon = statusInfo.icon;
    
    return (
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl mb-2">{exam.title}</CardTitle>
              <CardDescription className="text-base">
                {exam.description}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Badge className={difficultyInfo.color}>
                {difficultyInfo.text}
              </Badge>
              <Badge className={statusInfo.color}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {statusInfo.text}
              </Badge>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* 基本信息网格 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <Clock className="h-6 w-6 text-blue-600 mx-auto mb-2" />
              <div className="text-sm text-gray-600">考试时长</div>
              <div className="font-semibold">{exam.duration} 分钟</div>
            </div>
            
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <BookOpen className="h-6 w-6 text-green-600 mx-auto mb-2" />
              <div className="text-sm text-gray-600">题目数量</div>
              <div className="font-semibold">{exam.total_questions} 道</div>
            </div>
            
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <Trophy className="h-6 w-6 text-yellow-600 mx-auto mb-2" />
              <div className="text-sm text-gray-600">及格分数</div>
              <div className="font-semibold">{exam.passing_score} 分</div>
            </div>
            
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <Target className="h-6 w-6 text-purple-600 mx-auto mb-2" />
              <div className="text-sm text-gray-600">最大尝试</div>
              <div className="font-semibold">{exam.max_attempts} 次</div>
            </div>
          </div>
          
          {/* 时间信息 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Calendar className="h-4 w-4" />
                考试时间
              </div>
              <div className="text-sm text-gray-600">
                <div>开始: {new Date(exam.start_time).toLocaleString()}</div>
                <div>结束: {new Date(exam.end_time).toLocaleString()}</div>
              </div>
            </div>
            
            {exam.registration_deadline && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Clock className="h-4 w-4" />
                  报名截止
                </div>
                <div className="text-sm text-gray-600">
                  {new Date(exam.registration_deadline).toLocaleString()}
                </div>
              </div>
            )}
          </div>
          
          {/* 费用信息 */}
          {exam.fee > 0 && (
            <div className="flex items-center gap-2 p-4 bg-green-50 rounded-lg">
              <DollarSign className="h-5 w-5 text-green-600" />
              <span className="font-medium">考试费用:</span>
              <span className="text-lg font-bold text-green-600">
                {exam.currency} {exam.fee}
              </span>
            </div>
          )}
          
          {/* 标签和技能 */}
          {(exam.tags?.length > 0 || exam.skills?.length > 0) && (
            <div className="space-y-3">
              {exam.tags?.length > 0 && (
                <div>
                  <div className="text-sm font-medium mb-2">相关标签</div>
                  <div className="flex flex-wrap gap-2">
                    {exam.tags.map(tag => (
                      <Badge key={tag} variant="secondary">{tag}</Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {exam.skills?.length > 0 && (
                <div>
                  <div className="text-sm font-medium mb-2">技能要求</div>
                  <div className="flex flex-wrap gap-2">
                    {exam.skills.map(skill => (
                      <Badge key={skill} variant="outline">
                        <Zap className="h-3 w-3 mr-1" />
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  /**
   * 渲染题型分布
   */
  const renderQuestionDistribution = () => {
    if (questions.length === 0) return null;
    
    const distribution = getQuestionTypeDistribution();
    const totalScore = questions.reduce((sum, q) => sum + q.score, 0);
    
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            题型分布
          </CardTitle>
          <CardDescription>
            了解考试的题型构成和分值分布
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              {distribution.map(item => (
                <div key={item.type} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{item.type}</span>
                    <span className="text-sm text-gray-600">
                      {item.count} 题 · {item.score} 分
                    </span>
                  </div>
                  <Progress value={item.percentage} className="h-2" />
                </div>
              ))}
            </div>
            
            <div className="space-y-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-800">{questions.length}</div>
                <div className="text-sm text-gray-600">总题目数</div>
              </div>
              
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{totalScore}</div>
                <div className="text-sm text-gray-600">总分值</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  /**
   * 渲染考试规则
   */
  const renderExamRules = () => {
    if (!exam) return null;
    
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            考试规则
          </CardTitle>
          <CardDescription>
            请仔细阅读考试规则和注意事项
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <div className="font-medium">考试时间</div>
                <div className="text-sm text-gray-600">
                  考试时长为 {exam.duration} 分钟，请合理安排答题时间
                </div>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <div className="font-medium">尝试次数</div>
                <div className="text-sm text-gray-600">
                  {exam.allow_retake 
                    ? `最多可尝试 ${exam.max_attempts} 次，取最高分数` 
                    : '只能尝试一次，请谨慎作答'
                  }
                </div>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <div className="font-medium">及格标准</div>
                <div className="text-sm text-gray-600">
                  需要达到 {exam.passing_score} 分才能通过考试
                </div>
              </div>
            </div>
            
            {exam.requires_approval && (
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5" />
                <div>
                  <div className="font-medium">审批要求</div>
                  <div className="text-sm text-gray-600">
                    该考试需要管理员审批后才能参加
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* 自定义规则 */}
          {exam.rules && exam.rules.length > 0 && (
            <>
              <Separator />
              <div>
                <div className="font-medium mb-3">特殊规则</div>
                <ul className="space-y-2">
                  {exam.rules.map((rule, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0" />
                      <span className="text-gray-600">{rule}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    );
  };

  /**
   * 渲染资格检查结果
   */
  const renderEligibilityStatus = () => {
    if (!eligibility) return null;
    
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            参考资格
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {eligibility.can_take ? (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                您符合参考条件，可以报名参加此考试。
              </AlertDescription>
            </Alert>
          ) : (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                {eligibility.reason || '您暂时不符合参考条件'}
              </AlertDescription>
            </Alert>
          )}
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                isRegistered ? 'bg-green-500' : 'bg-gray-300'
              }`} />
              <span>已报名: {isRegistered ? '是' : '否'}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                eligibility.attempts_remaining > 0 ? 'bg-green-500' : 'bg-red-500'
              }`} />
              <span>剩余尝试: {eligibility.attempts_remaining} 次</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  /**
   * 渲染操作按钮
   */
  const renderActionButtons = () => {
    if (!exam || !eligibility) return null;
    
    return (
      <div className="flex gap-4 justify-center">
        <Button 
          variant="outline" 
          onClick={() => router.push('/skill-exam')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          返回列表
        </Button>
        
        {!isRegistered && eligibility.can_take && (
          <Button 
            onClick={registerForExam}
            disabled={registering}
            className="min-w-[120px]"
          >
            {registering ? '报名中...' : '立即报名'}
          </Button>
        )}
        
        {canStartExam() && (
          <Button 
            onClick={startExam}
            className="min-w-[120px]"
          >
            <Play className="h-4 w-4 mr-2" />
            开始考试
          </Button>
        )}
      </div>
    );
  };

  useEffect(() => {
    if (examId) {
      loadExamDetails();
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

  if (!exam) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="text-center py-8">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">考试不存在</h3>
            <p className="text-gray-600 mb-4">无法找到指定的考试</p>
            <Button onClick={() => router.push('/skill-exam')}>返回考试列表</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* 考试基本信息 */}
      {renderExamInfo()}
      
      {/* 资格检查 */}
      {renderEligibilityStatus()}
      
      {/* 题型分布 */}
      {renderQuestionDistribution()}
      
      {/* 考试规则 */}
      {renderExamRules()}
      
      {/* 操作按钮 */}
      {renderActionButtons()}
    </div>
  );
}