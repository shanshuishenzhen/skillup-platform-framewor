/**
 * 考试系统管理组件
 * 统一管理考试创建、本地系统集成、考生管理等功能
 */

'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Plus,
  BookOpen,
  Users,
  Download,
  Upload,
  Settings,
  BarChart3,
  Calendar,
  FileText,
  Database,
  RotateCcw,
  Eye,
  Edit,
  Trash2,
  Play,
  Pause,
  Square,
  CheckCircle,
  XCircle,
  Clock,
  Target
} from 'lucide-react';
import { toast } from 'sonner';
import TemplateDownload from './TemplateDownload';

interface ExamItem {
  id: string;
  title: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  status: 'draft' | 'published' | 'ongoing' | 'finished' | 'cancelled';
  duration: number;
  totalQuestions: number;
  totalScore: number;
  passingScore: number;
  registeredCount: number;
  completedCount: number;
  passedCount: number;
  startTime?: string;
  endTime?: string;
  createdAt: string;
}

export default function ExamSystemManagement() {
  const [activeView, setActiveView] = useState<'overview' | 'exams' | 'candidates' | 'sync'>('overview');
  const [exams, setExams] = useState<ExamItem[]>([
    {
      id: 'exam_001',
      title: 'JavaScript基础技能认证',
      category: '前端开发',
      difficulty: 'intermediate',
      status: 'ongoing',
      duration: 120,
      totalQuestions: 50,
      totalScore: 100,
      passingScore: 60,
      registeredCount: 150,
      completedCount: 89,
      passedCount: 67,
      startTime: '2024-01-15T09:00:00Z',
      endTime: '2024-01-15T11:00:00Z',
      createdAt: '2024-01-10T10:00:00Z'
    },
    {
      id: 'exam_002',
      title: 'React高级开发认证',
      category: '前端开发',
      difficulty: 'advanced',
      status: 'published',
      duration: 150,
      totalQuestions: 60,
      totalScore: 120,
      passingScore: 72,
      registeredCount: 85,
      completedCount: 0,
      passedCount: 0,
      startTime: '2024-01-20T09:00:00Z',
      endTime: '2024-01-20T11:30:00Z',
      createdAt: '2024-01-12T14:00:00Z'
    }
  ]);

  const handleCreateExam = () => {
    window.open('/admin/exams/create', '_blank');
  };

  const handleViewExam = (examId: string) => {
    window.open(`/admin/exams/${examId}`, '_blank');
  };

  const handleEditExam = (examId: string) => {
    window.open(`/admin/exams/${examId}/edit`, '_blank');
  };

  const handleManageCandidates = (examId: string) => {
    window.open(`/admin/exams/${examId}/candidates`, '_blank');
  };

  const handleExportResults = (examId: string) => {
    toast.info('正在导出考试结果...');
    // TODO: 实现导出逻辑
  };

  const handleSyncWithLocal = () => {
    window.open('/admin/local-exam-sync', '_blank');
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

  const renderOverview = () => (
    <div className="space-y-6">
      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <BookOpen className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">总考试数</p>
                <p className="text-2xl font-bold text-gray-900">{exams.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">总报名人数</p>
                <p className="text-2xl font-bold text-gray-900">
                  {exams.reduce((sum, exam) => sum + exam.registeredCount, 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">完成人数</p>
                <p className="text-2xl font-bold text-gray-900">
                  {exams.reduce((sum, exam) => sum + exam.completedCount, 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Target className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">通过率</p>
                <p className="text-2xl font-bold text-gray-900">
                  {exams.reduce((sum, exam) => sum + exam.completedCount, 0) > 0 
                    ? Math.round((exams.reduce((sum, exam) => sum + exam.passedCount, 0) / 
                       exams.reduce((sum, exam) => sum + exam.completedCount, 0)) * 100)
                    : 0}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 快速操作 */}
      <Card>
        <CardHeader>
          <CardTitle>快速操作</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button onClick={handleCreateExam} className="h-20 flex-col">
              <Plus className="h-6 w-6 mb-2" />
              创建新考试
            </Button>
            
            <Button onClick={() => setActiveView('candidates')} variant="outline" className="h-20 flex-col">
              <Users className="h-6 w-6 mb-2" />
              管理考生
            </Button>
            
            <Button onClick={handleSyncWithLocal} variant="outline" className="h-20 flex-col">
              <RotateCcw className="h-6 w-6 mb-2" />
              本地系统同步
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Excel模板下载 */}
      <TemplateDownload
        onTemplateSelect={(type) => {
          if (type === 'exams') {
            console.log('考试模板已下载');
          }
        }}
        showPreview={true}
      />

      {/* 最近考试 */}
      <Card>
        <CardHeader>
          <CardTitle>最近考试</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {exams.slice(0, 3).map((exam) => (
              <div key={exam.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <h3 className="font-medium">{exam.title}</h3>
                  <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
                    <span>{exam.category}</span>
                    <span>{getDifficultyText(exam.difficulty)}</span>
                    <Badge className={getStatusColor(exam.status)}>
                      {getStatusText(exam.status)}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button size="sm" variant="ghost" onClick={() => handleViewExam(exam.id)}>
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleEditExam(exam.id)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderExams = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">考试管理</h2>
        <Button onClick={handleCreateExam}>
          <Plus className="w-4 h-4 mr-2" />
          创建考试
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {exams.map((exam) => (
          <Card key={exam.id}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-medium">{exam.title}</h3>
                    <Badge className={getStatusColor(exam.status)}>
                      {getStatusText(exam.status)}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                    <div>
                      <span className="font-medium">类别:</span> {exam.category}
                    </div>
                    <div>
                      <span className="font-medium">难度:</span> {getDifficultyText(exam.difficulty)}
                    </div>
                    <div>
                      <span className="font-medium">时长:</span> {exam.duration}分钟
                    </div>
                    <div>
                      <span className="font-medium">题数:</span> {exam.totalQuestions}题
                    </div>
                    <div>
                      <span className="font-medium">报名:</span> {exam.registeredCount}人
                    </div>
                    <div>
                      <span className="font-medium">完成:</span> {exam.completedCount}人
                    </div>
                    <div>
                      <span className="font-medium">通过:</span> {exam.passedCount}人
                    </div>
                    <div>
                      <span className="font-medium">通过率:</span> 
                      {exam.completedCount > 0 ? Math.round((exam.passedCount / exam.completedCount) * 100) : 0}%
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2 ml-4">
                  <Button size="sm" variant="ghost" onClick={() => handleViewExam(exam.id)}>
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleEditExam(exam.id)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleManageCandidates(exam.id)}>
                    <Users className="w-4 h-4" />
                  </Button>
                  {exam.status === 'finished' && (
                    <Button size="sm" variant="ghost" onClick={() => handleExportResults(exam.id)}>
                      <Download className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderCandidates = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">考生管理</h2>
      <Card>
        <CardContent className="p-6 text-center">
          <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">考生管理</h3>
          <p className="text-gray-600 mb-6">统一管理所有考试的考生信息和权限</p>
          <Button onClick={() => window.open('/admin/users', '_blank')}>
            <Users className="w-4 h-4 mr-2" />
            前往用户管理
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  const renderSync = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">本地系统同步</h2>
      <Card>
        <CardContent className="p-6 text-center">
          <Database className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">数据同步</h3>
          <p className="text-gray-600 mb-6">与本地考试系统进行数据导入导出</p>
          <Button onClick={handleSyncWithLocal}>
            <RotateCcw className="w-4 h-4 mr-2" />
            打开同步管理
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* 导航选项卡 */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', name: '概览', icon: BarChart3 },
            { id: 'exams', name: '考试管理', icon: BookOpen },
            { id: 'candidates', name: '考生管理', icon: Users },
            { id: 'sync', name: '系统同步', icon: RotateCcw }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveView(tab.id as any)}
              className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                activeView === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="w-4 h-4 mr-2" />
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* 内容区域 */}
      {activeView === 'overview' && renderOverview()}
      {activeView === 'exams' && renderExams()}
      {activeView === 'candidates' && renderCandidates()}
      {activeView === 'sync' && renderSync()}
    </div>
  );
}
