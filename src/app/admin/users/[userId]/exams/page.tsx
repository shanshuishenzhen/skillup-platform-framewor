/**
 * 用户考试管理页面
 * 统一管理单个用户的考试权限、报名状态、考试历史等
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft,
  BookOpen,
  Award,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Plus,
  Trash2,
  Eye,
  Calendar,
  Target,
  User,
  Mail,
  Phone,
  Building
} from 'lucide-react';
import { toast } from 'sonner';
import AdminPageLayout from '@/components/layout/AdminPageLayout';
import { PAGE_CONFIGS } from '@/components/ui/page-header';

interface UserExamData {
  user: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    department?: string;
    position?: string;
    certification_status?: string;
  };
  examPermissions: string[];
  examRegistrations: {
    id: string;
    examId: string;
    examTitle: string;
    examCategory: string;
    status: 'pending' | 'approved' | 'rejected' | 'completed' | 'absent';
    registeredAt: string;
    approvedAt?: string;
    score?: number;
    passed?: boolean;
  }[];
  examHistory: {
    id: string;
    examId: string;
    examTitle: string;
    attemptDate: string;
    score: number;
    totalScore: number;
    passed: boolean;
    duration: number;
  }[];
  availableExams: {
    id: string;
    title: string;
    category: string;
    difficulty: string;
    status: string;
  }[];
}

export default function UserExamManagementPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.userId as string;
  
  const [data, setData] = useState<UserExamData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // 模拟数据
  const mockData: UserExamData = {
    user: {
      id: userId,
      name: '张三',
      email: 'zhangsan@example.com',
      phone: '13800138000',
      department: '技术部',
      position: '前端工程师',
      certification_status: 'certified'
    },
    examPermissions: ['exam_001', 'exam_002', 'exam_003'],
    examRegistrations: [
      {
        id: 'reg_001',
        examId: 'exam_001',
        examTitle: 'JavaScript基础技能认证',
        examCategory: '前端开发',
        status: 'completed',
        registeredAt: '2024-01-10T10:00:00Z',
        approvedAt: '2024-01-10T10:30:00Z',
        score: 85,
        passed: true
      },
      {
        id: 'reg_002',
        examId: 'exam_002',
        examTitle: 'React高级开发认证',
        examCategory: '前端开发',
        status: 'approved',
        registeredAt: '2024-01-15T09:00:00Z',
        approvedAt: '2024-01-15T09:15:00Z'
      },
      {
        id: 'reg_003',
        examId: 'exam_003',
        examTitle: 'Node.js后端开发',
        examCategory: '后端开发',
        status: 'pending',
        registeredAt: '2024-01-20T14:00:00Z'
      }
    ],
    examHistory: [
      {
        id: 'attempt_001',
        examId: 'exam_001',
        examTitle: 'JavaScript基础技能认证',
        attemptDate: '2024-01-15T10:00:00Z',
        score: 85,
        totalScore: 100,
        passed: true,
        duration: 90
      }
    ],
    availableExams: [
      {
        id: 'exam_004',
        title: 'Vue.js框架认证',
        category: '前端开发',
        difficulty: 'intermediate',
        status: 'published'
      },
      {
        id: 'exam_005',
        title: 'TypeScript高级应用',
        category: '前端开发',
        difficulty: 'advanced',
        status: 'published'
      }
    ]
  };

  useEffect(() => {
    const fetchUserExamData = async () => {
      try {
        setLoading(true);
        // TODO: 实际API调用
        // const response = await fetch(`/api/admin/users/${userId}/exam-management`);
        // const result = await response.json();
        
        // 模拟延迟
        await new Promise(resolve => setTimeout(resolve, 1000));
        setData(mockData);
      } catch (error) {
        console.error('获取用户考试数据失败:', error);
        toast.error('获取用户考试数据失败');
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchUserExamData();
    }
  }, [userId]);

  const handleGrantExamPermission = async (examId: string) => {
    try {
      // TODO: 实际API调用
      toast.success('考试权限已授予');
      // 刷新数据
    } catch (error) {
      toast.error('授予考试权限失败');
    }
  };

  const handleRevokeExamPermission = async (examId: string) => {
    try {
      // TODO: 实际API调用
      toast.success('考试权限已撤销');
      // 刷新数据
    } catch (error) {
      toast.error('撤销考试权限失败');
    }
  };

  const handleApproveRegistration = async (registrationId: string) => {
    try {
      // TODO: 实际API调用
      toast.success('报名已审核通过');
      // 刷新数据
    } catch (error) {
      toast.error('审核报名失败');
    }
  };

  const handleRejectRegistration = async (registrationId: string) => {
    try {
      // TODO: 实际API调用
      toast.success('报名已拒绝');
      // 刷新数据
    } catch (error) {
      toast.error('拒绝报名失败');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'absent': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return '待审核';
      case 'approved': return '已通过';
      case 'completed': return '已完成';
      case 'rejected': return '已拒绝';
      case 'absent': return '缺考';
      default: return status;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">加载用户考试数据中...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <p className="text-gray-600">用户数据不存在</p>
          <Button onClick={() => router.back()} className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回
          </Button>
        </div>
      </div>
    );
  }

  return (
    <AdminPageLayout
      pageHeaderProps={{
        ...PAGE_CONFIGS.userExams(userId, data.user.name)
      }}
    >

      {/* 用户信息卡片 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <User className="w-5 h-5 mr-2" />
            用户信息
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-2">
              <User className="w-4 h-4 text-gray-500" />
              <span className="font-medium">{data.user.name}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Mail className="w-4 h-4 text-gray-500" />
              <span>{data.user.email}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Phone className="w-4 h-4 text-gray-500" />
              <span>{data.user.phone || '未设置'}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Building className="w-4 h-4 text-gray-500" />
              <span>{data.user.department || '未设置'}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Award className="w-4 h-4 text-gray-500" />
              <span>{data.user.position || '未设置'}</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-gray-500" />
              <Badge className={data.user.certification_status === 'certified' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                {data.user.certification_status === 'certified' ? '已认证' : '未认证'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 选项卡内容 */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">概览</TabsTrigger>
          <TabsTrigger value="registrations">报名管理</TabsTrigger>
          <TabsTrigger value="history">考试历史</TabsTrigger>
          <TabsTrigger value="permissions">权限管理</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <BookOpen className="h-8 w-8 text-blue-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">考试权限</p>
                    <p className="text-2xl font-bold text-gray-900">{data.examPermissions.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Calendar className="h-8 w-8 text-green-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">报名考试</p>
                    <p className="text-2xl font-bold text-gray-900">{data.examRegistrations.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Award className="h-8 w-8 text-purple-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">已完成</p>
                    <p className="text-2xl font-bold text-gray-900">{data.examHistory.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="registrations" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>考试报名记录</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.examRegistrations.map((registration) => (
                  <div key={registration.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <h3 className="font-medium">{registration.examTitle}</h3>
                      <p className="text-sm text-gray-600">{registration.examCategory}</p>
                      <p className="text-xs text-gray-500">
                        报名时间: {new Date(registration.registeredAt).toLocaleString('zh-CN')}
                      </p>
                    </div>
                    <div className="flex items-center space-x-4">
                      <Badge className={getStatusColor(registration.status)}>
                        {getStatusText(registration.status)}
                      </Badge>
                      {registration.status === 'pending' && (
                        <div className="flex space-x-2">
                          <Button 
                            size="sm" 
                            onClick={() => handleApproveRegistration(registration.id)}
                          >
                            通过
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleRejectRegistration(registration.id)}
                          >
                            拒绝
                          </Button>
                        </div>
                      )}
                      {registration.score !== undefined && (
                        <div className="text-right">
                          <p className="font-medium">{registration.score}分</p>
                          <p className="text-xs text-gray-500">
                            {registration.passed ? '通过' : '未通过'}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>考试历史</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.examHistory.map((history) => (
                  <div key={history.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <h3 className="font-medium">{history.examTitle}</h3>
                      <p className="text-sm text-gray-600">
                        考试时间: {new Date(history.attemptDate).toLocaleString('zh-CN')}
                      </p>
                      <p className="text-xs text-gray-500">
                        用时: {history.duration}分钟
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold">
                        {history.score}/{history.totalScore}
                      </p>
                      <Badge className={history.passed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                        {history.passed ? '通过' : '未通过'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="permissions" className="mt-6">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>可授予的考试权限</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.availableExams.map((exam) => (
                    <div key={exam.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <h3 className="font-medium">{exam.title}</h3>
                        <p className="text-sm text-gray-600">{exam.category}</p>
                        <Badge variant="secondary">{exam.difficulty}</Badge>
                      </div>
                      <div className="flex space-x-2">
                        {data.examPermissions.includes(exam.id) ? (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleRevokeExamPermission(exam.id)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            撤销权限
                          </Button>
                        ) : (
                          <Button 
                            size="sm"
                            onClick={() => handleGrantExamPermission(exam.id)}
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            授予权限
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </AdminPageLayout>
  );
}
