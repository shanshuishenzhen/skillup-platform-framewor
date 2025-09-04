/**
 * 考试详情页面
 * 显示考试详细信息，包括考试介绍、报名信息、考试规则等
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Clock, 
  Users, 
  Target, 
  BookOpen, 
  Calendar, 
  Award, 
  CheckCircle, 
  AlertCircle,
  Play,
  FileText,
  Star,
  TrendingUp,
  Shield,
  Globe,
  DollarSign,
  User,
  Mail,
  Phone
} from 'lucide-react';
import { toast } from 'sonner';
import { useParams } from 'next/navigation';
import { ExamService } from '@/services/examService';

// 类型定义
interface ExamDetail {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  status: 'draft' | 'published' | 'ongoing' | 'finished' | 'cancelled';
  duration: number;
  totalQuestions: number;
  totalScore: number;
  passingScore: number;
  maxAttempts: number;
  allowRetake: boolean;
  startTime: string;
  endTime: string;
  registrationDeadline: string;
  isPublic: boolean;
  requiresApproval: boolean;
  fee: number;
  currency: string;
  tags: string[];
  skills: string[];
  prerequisites: string[];
  instructions: string;
  rules: string[];
  registrations: number;
  attempts: number;
  passRate: number;
  averageScore: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface UserRegistration {
  id: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  registeredAt: string;
  approvedAt?: string;
  rejectionReason?: string;
}

interface UserAttempt {
  id: string;
  attemptNumber: number;
  status: 'not_started' | 'in_progress' | 'submitted' | 'completed';
  startTime?: string;
  endTime?: string;
  totalScore: number;
  isPassed: boolean;
  createdAt: string;
}

export default function ExamDetailPage() {
  const params = useParams();
  const examId = params.id as string;

  // 状态管理
  const [exam, setExam] = useState<ExamDetail | null>(null);
  const [userRegistration, setUserRegistration] = useState<UserRegistration | null>(null);
  const [userAttempts, setUserAttempts] = useState<UserAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);

  // 模拟数据
  const mockExam: ExamDetail = {
    id: examId,
    title: 'JavaScript 基础认证考试',
    description: '这是一个全面的 JavaScript 基础认证考试，旨在测试您对 JavaScript 核心概念的理解和应用能力。考试涵盖变量声明、数据类型、函数、对象、数组、DOM 操作、事件处理、异步编程等重要主题。通过此考试将证明您具备扎实的 JavaScript 基础知识，为进一步学习前端框架和高级概念打下坚实基础。',
    category: '前端开发',
    difficulty: 'beginner',
    status: 'published',
    duration: 90,
    totalQuestions: 50,
    totalScore: 100,
    passingScore: 70,
    maxAttempts: 3,
    allowRetake: true,
    startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    endTime: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    registrationDeadline: new Date(Date.now() + 20 * 60 * 60 * 1000).toISOString(),
    isPublic: true,
    requiresApproval: false,
    fee: 0,
    currency: 'CNY',
    tags: ['JavaScript', 'ES6', 'DOM', '异步编程'],
    skills: ['JavaScript基础', '前端开发', 'Web编程'],
    prerequisites: ['HTML基础', 'CSS基础'],
    instructions: '请仔细阅读每道题目，选择最佳答案。考试期间请保持网络连接稳定，避免切换浏览器标签页。考试时间为90分钟，请合理分配时间。',
    rules: [
      '考试期间不得查阅任何资料',
      '不得与他人讨论考试内容',
      '不得使用任何作弊工具',
      '考试时间到后系统将自动提交',
      '每题只能选择一次，提交后不可修改',
      '考试过程中如遇技术问题请及时联系监考老师'
    ],
    registrations: 156,
    attempts: 142,
    passRate: 78.5,
    averageScore: 82.3,
    createdBy: 'admin',
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
  };

  const mockUserRegistration: UserRegistration = {
    id: 'reg-1',
    status: 'approved',
    registeredAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    approvedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  };

  const mockUserAttempts: UserAttempt[] = [
    {
      id: 'attempt-1',
      attemptNumber: 1,
      status: 'completed',
      startTime: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      endTime: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 + 75 * 60 * 1000).toISOString(),
      totalScore: 65,
      isPassed: false,
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
    }
  ];

  // 初始化数据
  useEffect(() => {
    setLoading(true);
    // 模拟API调用
    setTimeout(() => {
      setExam(mockExam);
      setUserRegistration(mockUserRegistration);
      setUserAttempts(mockUserAttempts);
      setLoading(false);
    }, 1000);
  }, [examId]);

  // 获取状态信息
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'published':
        return { color: 'bg-blue-100 text-blue-800', icon: <CheckCircle className="w-4 h-4" />, label: '已发布' };
      case 'ongoing':
        return { color: 'bg-green-100 text-green-800', icon: <Play className="w-4 h-4" />, label: '进行中' };
      case 'finished':
        return { color: 'bg-purple-100 text-purple-800', icon: <Award className="w-4 h-4" />, label: '已结束' };
      default:
        return { color: 'bg-gray-100 text-gray-800', icon: <AlertCircle className="w-4 h-4" />, label: '未知' };
    }
  };

  // 获取难度信息
  const getDifficultyInfo = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return { color: 'bg-green-500', label: '初级' };
      case 'intermediate':
        return { color: 'bg-yellow-500', label: '中级' };
      case 'advanced':
        return { color: 'bg-red-500', label: '高级' };
      default:
        return { color: 'bg-gray-500', label: '未知' };
    }
  };

  // 格式化日期
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN');
  };

  // 计算时间状态
  const getTimeStatus = () => {
    if (!exam) return null;
    
    const now = new Date();
    const registrationDeadline = new Date(exam.registrationDeadline);
    const startTime = new Date(exam.startTime);
    const endTime = new Date(exam.endTime);

    if (now < registrationDeadline) {
      return { type: 'registration', message: '报名进行中', color: 'text-blue-600' };
    } else if (now < startTime) {
      return { type: 'waiting', message: '等待考试开始', color: 'text-yellow-600' };
    } else if (now < endTime) {
      return { type: 'ongoing', message: '考试进行中', color: 'text-green-600' };
    } else {
      return { type: 'finished', message: '考试已结束', color: 'text-gray-600' };
    }
  };

  // 检查是否可以报名
  const canRegister = () => {
    if (!exam) return false;
    
    const now = new Date();
    const registrationDeadline = new Date(exam.registrationDeadline);
    
    return now < registrationDeadline && 
           exam.status === 'published' && 
           (!userRegistration || userRegistration.status === 'rejected');
  };

  // 检查是否可以开始考试
  const canStartExam = () => {
    if (!exam || !userRegistration) return false;
    
    const now = new Date();
    const startTime = new Date(exam.startTime);
    const endTime = new Date(exam.endTime);
    
    return userRegistration.status === 'approved' &&
           now >= startTime &&
           now < endTime &&
           userAttempts.length < exam.maxAttempts;
  };

  // 报名考试
  const handleRegister = async () => {
    if (!exam) return;
    
    setRegistering(true);
    try {
      // 调用实际API
      await ExamService.enrollExam(exam.id, 'current-user-id'); // TODO: 从认证上下文获取用户ID
      
      const newRegistration: UserRegistration = {
        id: 'reg-new',
        status: exam.requiresApproval ? 'pending' : 'approved',
        registeredAt: new Date().toISOString(),
        approvedAt: exam.requiresApproval ? undefined : new Date().toISOString()
      };
      
      setUserRegistration(newRegistration);
      toast.success(exam.requiresApproval ? '报名申请已提交，等待审核' : '报名成功');
    } catch (error) {
      console.error('报名考试失败:', error);
      toast.error(error instanceof Error ? error.message : '报名失败，请重试');
    } finally {
      setRegistering(false);
    }
  };

  // 开始考试
  const handleStartExam = async () => {
    if (!exam) return;
    
    try {
      setLoading(true);
      // 调用开始考试API
      const submission = await ExamService.startExam(exam.id, 'current-user-id'); // TODO: 从认证上下文获取用户ID
      
      toast.success('考试开始，正在跳转...');
      
      // 跳转到考试页面
      window.location.href = `/skill-exam/${exam.id}/take?submission=${submission.id}`;
    } catch (error) {
      console.error('开始考试失败:', error);
      toast.error(error instanceof Error ? error.message : '开始考试失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 取消报名
  const handleCancelRegistration = async () => {
    if (!exam || !userRegistration) return;
    
    setRegistering(true);
    try {
      // 调用取消报名API
      await ExamService.cancelEnrollment(exam.id, 'current-user-id'); // TODO: 从认证上下文获取用户ID
      
      setUserRegistration(null);
      toast.success('已取消报名');
    } catch (error) {
      console.error('取消报名失败:', error);
      toast.error(error instanceof Error ? error.message : '取消报名失败，请重试');
    } finally {
      setRegistering(false);
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

  if (!exam) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="text-center py-12">
            <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">考试不存在</h3>
            <p className="text-gray-600">请检查考试ID是否正确</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusInfo = getStatusInfo(exam.status);
  const difficultyInfo = getDifficultyInfo(exam.difficulty);
  const timeStatus = getTimeStatus();

  return (
    <div className="container mx-auto p-6">
      {/* 页面标题 */}
      <div className="mb-6">
        <div className="flex items-center space-x-3 mb-2">
          <h1 className="text-3xl font-bold text-gray-900">{exam.title}</h1>
          <div className={`w-3 h-3 rounded-full ${difficultyInfo.color}`} />
          <Badge className={statusInfo.color}>
            {statusInfo.icon}
            <span className="ml-1">{statusInfo.label}</span>
          </Badge>
        </div>
        
        {timeStatus && (
          <p className={`text-sm font-medium ${timeStatus.color}`}>
            {timeStatus.message}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 主要内容 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 考试概述 */}
          <Card>
            <CardHeader>
              <CardTitle>考试概述</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 leading-relaxed mb-6">
                {exam.description}
              </p>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="text-center">
                  <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg mx-auto mb-2">
                    <Clock className="w-6 h-6 text-blue-600" />
                  </div>
                  <p className="text-sm text-gray-600">考试时长</p>
                  <p className="font-semibold">{exam.duration}分钟</p>
                </div>
                
                <div className="text-center">
                  <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-lg mx-auto mb-2">
                    <BookOpen className="w-6 h-6 text-green-600" />
                  </div>
                  <p className="text-sm text-gray-600">题目数量</p>
                  <p className="font-semibold">{exam.totalQuestions}题</p>
                </div>
                
                <div className="text-center">
                  <div className="flex items-center justify-center w-12 h-12 bg-purple-100 rounded-lg mx-auto mb-2">
                    <Target className="w-6 h-6 text-purple-600" />
                  </div>
                  <p className="text-sm text-gray-600">及格分数</p>
                  <p className="font-semibold">{exam.passingScore}分</p>
                </div>
                
                <div className="text-center">
                  <div className="flex items-center justify-center w-12 h-12 bg-orange-100 rounded-lg mx-auto mb-2">
                    <Users className="w-6 h-6 text-orange-600" />
                  </div>
                  <p className="text-sm text-gray-600">报名人数</p>
                  <p className="font-semibold">{exam.registrations}人</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {exam.tags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 考试说明 */}
          <Card>
            <CardHeader>
              <CardTitle>考试说明</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 mb-4">{exam.instructions}</p>
              
              <h4 className="font-semibold mb-2">考试规则：</h4>
              <ul className="space-y-1">
                {exam.rules.map((rule, index) => (
                  <li key={index} className="flex items-start space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-700">{rule}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* 技能要求 */}
          {exam.skills.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>技能要求</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {exam.skills.map((skill) => (
                    <div key={skill} className="flex items-center space-x-2">
                      <Star className="w-4 h-4 text-yellow-500" />
                      <span className="text-sm">{skill}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 前置要求 */}
          {exam.prerequisites.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>前置要求</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {exam.prerequisites.map((prerequisite) => (
                    <div key={prerequisite} className="flex items-center space-x-2">
                      <Shield className="w-4 h-4 text-blue-500" />
                      <span className="text-sm">{prerequisite}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* 侧边栏 */}
        <div className="space-y-6">
          {/* 考试状态 */}
          <Card>
            <CardHeader>
              <CardTitle>考试状态</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">报名截止</span>
                  <span className="text-sm font-medium">
                    {formatDate(exam.registrationDeadline)}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">考试开始</span>
                  <span className="text-sm font-medium">
                    {formatDate(exam.startTime)}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">考试结束</span>
                  <span className="text-sm font-medium">
                    {formatDate(exam.endTime)}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">最大尝试次数</span>
                  <span className="text-sm font-medium">{exam.maxAttempts}次</span>
                </div>
                
                {exam.fee > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">考试费用</span>
                    <span className="text-sm font-medium">
                      ¥{exam.fee}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 操作按钮 */}
          <Card>
            <CardContent className="p-6">
              {!userRegistration && canRegister() && (
                <Button 
                  className="w-full" 
                  onClick={handleRegister}
                  disabled={registering}
                >
                  {registering ? '报名中...' : '立即报名'}
                </Button>
              )}
              
              {userRegistration && userRegistration.status === 'pending' && (
                <div className="text-center space-y-3">
                  <AlertCircle className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">报名申请审核中</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleCancelRegistration}
                    disabled={registering}
                    className="w-full"
                  >
                    {registering ? '取消中...' : '取消报名'}
                  </Button>
                </div>
              )}
              
              {userRegistration && userRegistration.status === 'approved' && canStartExam() && (
                <Button 
                  className="w-full" 
                  onClick={handleStartExam}
                >
                  <Play className="w-4 h-4 mr-2" />
                  开始考试
                </Button>
              )}
              
              {userRegistration && userRegistration.status === 'approved' && !canStartExam() && (
                <div className="text-center">
                  <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">已报名成功</p>
                  {userAttempts.length >= exam.maxAttempts && (
                    <p className="text-xs text-red-600 mt-1">已达到最大尝试次数</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 考试统计 */}
          <Card>
            <CardHeader>
              <CardTitle>考试统计</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>通过率</span>
                    <span>{exam.passRate}%</span>
                  </div>
                  <Progress value={exam.passRate} className="h-2" />
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">平均分</span>
                  <span className="text-sm font-medium">{exam.averageScore}分</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">参考人数</span>
                  <span className="text-sm font-medium">{exam.attempts}人</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">难度等级</span>
                  <span className="text-sm font-medium">{difficultyInfo.label}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 我的考试记录 */}
          {userAttempts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>我的考试记录</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {userAttempts.map((attempt) => (
                    <div key={attempt.id} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">
                          第{attempt.attemptNumber}次尝试
                        </span>
                        <Badge variant={attempt.isPassed ? 'default' : 'destructive'}>
                          {attempt.isPassed ? '通过' : '未通过'}
                        </Badge>
                      </div>
                      <div className="text-xs text-gray-600">
                        <p>得分: {attempt.totalScore}分</p>
                        <p>时间: {formatDate(attempt.createdAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
