/**
 * 考试详情页面
 * 显示考试的详细信息、统计数据和结果管理
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
  Edit,
  Settings,
  Users,
  FileText,
  BarChart3,
  Download,
  Play,
  Pause,
  Square,
  Calendar,
  Clock,
  Target,
  BookOpen
} from 'lucide-react';
import { toast } from 'sonner';
import ExamResultsStats from '@/components/admin/ExamResultsStats';
import AdminPageLayout from '@/components/layout/AdminPageLayout';
import { PAGE_CONFIGS } from '@/components/ui/page-header';

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
  startTime: string;
  endTime: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  registeredCount: number;
  completedCount: number;
  passedCount: number;
}

export default function ExamDetailPage() {
  const params = useParams();
  const router = useRouter();
  const examId = params.id as string;
  
  const [exam, setExam] = useState<ExamDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // 模拟考试数据
  const mockExam: ExamDetail = {
    id: examId,
    title: 'JavaScript基础技能认证考试',
    description: '测试JavaScript基础知识、语法、DOM操作和异步编程等核心技能',
    category: '前端开发',
    difficulty: 'intermediate',
    status: 'finished',
    duration: 120,
    totalQuestions: 50,
    totalScore: 100,
    passingScore: 60,
    startTime: '2024-01-15T09:00:00Z',
    endTime: '2024-01-15T11:00:00Z',
    createdAt: '2024-01-10T10:00:00Z',
    updatedAt: '2024-01-14T16:30:00Z',
    createdBy: 'admin',
    registeredCount: 150,
    completedCount: 142,
    passedCount: 101
  };

  useEffect(() => {
    const fetchExamDetail = async () => {
      try {
        setLoading(true);
        // TODO: 实际API调用
        // const response = await fetch(`/api/admin/exams/${examId}`);
        // const result = await response.json();
        
        // 模拟延迟
        await new Promise(resolve => setTimeout(resolve, 1000));
        setExam(mockExam);
      } catch (error) {
        console.error('获取考试详情失败:', error);
        toast.error('获取考试详情失败');
      } finally {
        setLoading(false);
      }
    };

    if (examId) {
      fetchExamDetail();
    }
  }, [examId]);

  const handleStatusChange = async (newStatus: string) => {
    try {
      // TODO: 实际API调用
      toast.success(`考试状态已更新为: ${newStatus}`);
      if (exam) {
        setExam({ ...exam, status: newStatus as any });
      }
    } catch (error) {
      toast.error('更新考试状态失败');
    }
  };

  const handleExport = async (format: 'excel' | 'csv' | 'json') => {
    try {
      const response = await fetch(`/api/admin/export/results?examId=${examId}&format=${format}&includeDetails=true`);
      
      if (!response.ok) {
        throw new Error('导出失败');
      }
      
      if (format === 'csv') {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `exam_results_${examId}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        const result = await response.json();
        if (result.success) {
          const dataStr = JSON.stringify(result.data, null, 2);
          const dataBlob = new Blob([dataStr], { type: 'application/json' });
          const url = URL.createObjectURL(dataBlob);
          
          const link = document.createElement('a');
          link.href = url;
          link.download = result.filename || `exam_results_${examId}.${format}`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }
      }
      
      toast.success(`${format.toUpperCase()}格式导出成功`);
    } catch (error) {
      console.error('导出失败:', error);
      toast.error('导出失败');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'published': return 'bg-blue-100 text-blue-800';
      case 'ongoing': return 'bg-green-100 text-green-800';
      case 'finished': return 'bg-purple-100 text-purple-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'draft': return '草稿';
      case 'published': return '已发布';
      case 'ongoing': return '进行中';
      case 'finished': return '已结束';
      case 'cancelled': return '已取消';
      default: return status;
    }
  };

  const getDifficultyText = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return '初级';
      case 'intermediate': return '中级';
      case 'advanced': return '高级';
      default: return difficulty;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">加载考试详情中...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <p className="text-gray-600">考试不存在或已被删除</p>
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
        ...PAGE_CONFIGS.examDetail(examId, exam.title),
        badge: {
          text: getStatusText(exam.status),
          className: getStatusColor(exam.status)
        },
        actions: (
          <div className="flex items-center space-x-2">
            {exam.status === 'draft' && (
              <Button onClick={() => handleStatusChange('published')}>
                <Play className="w-4 h-4 mr-2" />
                发布考试
              </Button>
            )}
            {exam.status === 'ongoing' && (
              <Button variant="outline" onClick={() => handleStatusChange('finished')}>
                <Square className="w-4 h-4 mr-2" />
                结束考试
              </Button>
            )}
            <Button variant="outline">
              <Edit className="w-4 h-4 mr-2" />
              编辑
            </Button>
            <Button variant="outline">
              <Settings className="w-4 h-4 mr-2" />
              设置
            </Button>
          </div>
        )
      }}
    >
        {/* 考试基本信息卡片 */}
        <div className="mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-600">类别:</span>
                <span className="ml-2 text-gray-900">{exam.category}</span>
              </div>
              <div>
                <span className="font-medium text-gray-600">难度:</span>
                <span className="ml-2 text-gray-900">{getDifficultyText(exam.difficulty)}</span>
              </div>
              <div>
                <span className="font-medium text-gray-600">时长:</span>
                <span className="ml-2 text-gray-900">{exam.duration}分钟</span>
              </div>
              <div>
                <span className="font-medium text-gray-600">通过率:</span>
                <span className="ml-2 text-gray-900">
                  {exam.completedCount > 0 ? ((exam.passedCount / exam.completedCount) * 100).toFixed(1) : 0}%
                </span>
              </div>
            </div>
          </div>
        </div>

      {/* 选项卡内容 */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">概览</TabsTrigger>
          <TabsTrigger value="questions">题目管理</TabsTrigger>
          <TabsTrigger value="candidates">考生管理</TabsTrigger>
          <TabsTrigger value="results">结果统计</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 基本信息 */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>考试信息</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">考试描述</label>
                    <p className="mt-1 text-gray-900">{exam.description}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600">考试时长</label>
                      <p className="mt-1 text-gray-900">{exam.duration}分钟</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">题目数量</label>
                      <p className="mt-1 text-gray-900">{exam.totalQuestions}题</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">总分</label>
                      <p className="mt-1 text-gray-900">{exam.totalScore}分</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">及格分</label>
                      <p className="mt-1 text-gray-900">{exam.passingScore}分</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600">开始时间</label>
                      <p className="mt-1 text-gray-900">
                        {new Date(exam.startTime).toLocaleString('zh-CN')}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">结束时间</label>
                      <p className="mt-1 text-gray-900">
                        {new Date(exam.endTime).toLocaleString('zh-CN')}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 统计数据 */}
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>考试统计</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">报名人数</span>
                    <span className="font-semibold">{exam.registeredCount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">完成人数</span>
                    <span className="font-semibold">{exam.completedCount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">通过人数</span>
                    <span className="font-semibold text-green-600">{exam.passedCount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">通过率</span>
                    <span className="font-semibold text-green-600">
                      {exam.completedCount > 0 ? ((exam.passedCount / exam.completedCount) * 100).toFixed(1) : 0}%
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="questions" className="mt-6">
          <Card>
            <CardContent className="text-center py-12">
              <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">题目管理</h3>
              <p className="text-gray-600 mb-6">管理考试题目和试卷结构</p>
              <Button>
                <FileText className="w-4 h-4 mr-2" />
                管理题目
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="candidates" className="mt-6">
          <Card>
            <CardContent className="text-center py-12">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">考生管理</h3>
              <p className="text-gray-600 mb-6">管理考生报名和参考状态</p>
              <Button>
                <Users className="w-4 h-4 mr-2" />
                管理考生
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results" className="mt-6">
          <ExamResultsStats 
            examId={examId} 
            examTitle={exam.title}
            onExport={handleExport}
          />
        </TabsContent>
      </Tabs>
    </AdminPageLayout>
  );
}
