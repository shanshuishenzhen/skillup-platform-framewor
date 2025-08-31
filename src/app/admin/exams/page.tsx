/**
 * 考试管理页面
 * 为管理员提供考试创建、编辑、题目管理、成绩统计等管理功能界面
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Eye,
  Users,
  Clock,
  Target,
  BookOpen,
  BarChart3,
  Settings,
  Calendar,
  Award,
  AlertCircle,
  CheckCircle,
  XCircle,
  Play,
  Pause,
  MoreVertical,
  Upload,
  Download,
  FileText,
  UserPlus,
  FileUp
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

// 类型定义
interface ExamItem {
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
  registrations: number;
  attempts: number;
  passRate: number;
  startTime: string;
  endTime: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export default function ExamManagementPage() {
  // 状态管理
  const [exams, setExams] = useState<ExamItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('');
  const [sortBy, setSortBy] = useState<'title' | 'createdAt' | 'startTime' | 'registrations'>('createdAt');
  const [selectedExams, setSelectedExams] = useState<string[]>([]);

  // 模拟数据
  const mockExams: ExamItem[] = [
    {
      id: 'exam-1',
      title: 'JavaScript 基础认证考试',
      description: '测试 JavaScript 基础语法、DOM 操作、异步编程等核心概念',
      category: '前端开发',
      difficulty: 'beginner',
      status: 'published',
      duration: 90,
      totalQuestions: 50,
      totalScore: 100,
      passingScore: 70,
      registrations: 156,
      attempts: 142,
      passRate: 78.5,
      startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      endTime: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      createdBy: 'admin',
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'exam-2',
      title: 'React 高级开发认证',
      description: '深入测试 React Hooks、状态管理、性能优化等高级主题',
      category: '前端开发',
      difficulty: 'advanced',
      status: 'ongoing',
      duration: 120,
      totalQuestions: 40,
      totalScore: 100,
      passingScore: 75,
      registrations: 89,
      attempts: 67,
      passRate: 65.2,
      startTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      endTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      createdBy: 'teacher1',
      createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'exam-3',
      title: 'Python 数据分析师认证',
      description: '测试 Python 数据处理、可视化、机器学习基础等技能',
      category: '数据科学',
      difficulty: 'intermediate',
      status: 'draft',
      duration: 150,
      totalQuestions: 60,
      totalScore: 120,
      passingScore: 80,
      registrations: 0,
      attempts: 0,
      passRate: 0,
      startTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      endTime: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
      createdBy: 'teacher2',
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'exam-4',
      title: 'DevOps 工程师认证',
      description: '测试 Docker、Kubernetes、CI/CD 等 DevOps 核心技术',
      category: '运维开发',
      difficulty: 'advanced',
      status: 'finished',
      duration: 180,
      totalQuestions: 45,
      totalScore: 100,
      passingScore: 70,
      registrations: 234,
      attempts: 198,
      passRate: 82.3,
      startTime: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      endTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      createdBy: 'admin',
      createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'exam-5',
      title: 'UI/UX 设计师认证',
      description: '测试设计原理、用户体验、原型设计等设计技能',
      category: 'UI/UX设计',
      difficulty: 'intermediate',
      status: 'published',
      duration: 100,
      totalQuestions: 35,
      totalScore: 100,
      passingScore: 75,
      registrations: 78,
      attempts: 45,
      passRate: 71.1,
      startTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      endTime: new Date(Date.now() + 17 * 24 * 60 * 60 * 1000).toISOString(),
      createdBy: 'teacher3',
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    }
  ];

  // 初始化数据
  useEffect(() => {
    setExams(mockExams);
  }, []);

  // 获取状态信息
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'draft':
        return { color: 'bg-gray-100 text-gray-800', icon: <Edit className="w-4 h-4" />, label: '草稿' };
      case 'published':
        return { color: 'bg-blue-100 text-blue-800', icon: <CheckCircle className="w-4 h-4" />, label: '已发布' };
      case 'ongoing':
        return { color: 'bg-green-100 text-green-800', icon: <Play className="w-4 h-4" />, label: '进行中' };
      case 'finished':
        return { color: 'bg-purple-100 text-purple-800', icon: <Award className="w-4 h-4" />, label: '已结束' };
      case 'cancelled':
        return { color: 'bg-red-100 text-red-800', icon: <XCircle className="w-4 h-4" />, label: '已取消' };
      default:
        return { color: 'bg-gray-100 text-gray-800', icon: <AlertCircle className="w-4 h-4" />, label: '未知' };
    }
  };

  // 获取难度颜色
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-500';
      case 'intermediate': return 'bg-yellow-500';
      case 'advanced': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  // 获取难度标签
  const getDifficultyLabel = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return '初级';
      case 'intermediate': return '中级';
      case 'advanced': return '高级';
      default: return '未知';
    }
  };

  // 格式化日期
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN');
  };

  // 过滤和排序考试
  const filteredExams = exams
    .filter(exam => {
      const matchesSearch = exam.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           exam.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = !selectedCategory || exam.category === selectedCategory;
      const matchesStatus = !selectedStatus || exam.status === selectedStatus;
      const matchesDifficulty = !selectedDifficulty || exam.difficulty === selectedDifficulty;
      return matchesSearch && matchesCategory && matchesStatus && matchesDifficulty;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'title':
          return a.title.localeCompare(b.title);
        case 'startTime':
          return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
        case 'registrations':
          return b.registrations - a.registrations;
        case 'createdAt':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

  // 获取所有分类
  const allCategories = Array.from(new Set(exams.map(exam => exam.category)));

  // 考试操作
  const handleView = (exam: ExamItem) => {
    window.open(`/admin/exams/${exam.id}`, '_blank');
  };

  const handleEdit = (exam: ExamItem) => {
    toast.info(`编辑考试: ${exam.title}`);
  };

  const handleDelete = (exam: ExamItem) => {
    setExams(prev => prev.filter(e => e.id !== exam.id));
    toast.success(`已删除考试: ${exam.title}`);
  };

  const handleStatusChange = (exam: ExamItem, newStatus: string) => {
    setExams(prev => prev.map(e => 
      e.id === exam.id 
        ? { ...e, status: newStatus as any, updatedAt: new Date().toISOString() }
        : e
    ));
    toast.success(`考试状态已更新`);
  };

  const handleCreateExam = () => {
    toast.info('创建新考试功能演示');
  };

  // 导入考生
  const handleImportCandidates = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx,.xls,.csv';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        try {
          // 这里应该调用导入考生的API
          toast.success(`正在导入考生文件: ${file.name}`);
          // TODO: 实现实际的导入逻辑
          console.log('导入考生文件:', file);
        } catch (error) {
          toast.error('导入考生失败');
        }
      }
    };
    input.click();
  };

  // 导入试卷
  const handleImportQuestions = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx,.xls,.csv,.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        try {
          // 这里应该调用导入试卷的API
          toast.success(`正在导入试卷文件: ${file.name}`);
          // TODO: 实现实际的导入逻辑
          console.log('导入试卷文件:', file);
        } catch (error) {
          toast.error('导入试卷失败');
        }
      }
    };
    input.click();
  };

  // 导出考试结果
  const handleExportResults = async (exam: ExamItem) => {
    try {
      toast.info(`正在导出"${exam.title}"的考试结果...`);

      const response = await fetch(`/api/admin/export/results?examId=${exam.id}&format=excel&includeDetails=true`);

      if (!response.ok) {
        throw new Error('导出失败');
      }

      const result = await response.json();

      if (result.success) {
        // 创建下载链接
        const dataStr = JSON.stringify(result.data);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);

        const link = document.createElement('a');
        link.href = url;
        link.download = result.filename || `exam_results_${exam.id}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast.success('考试结果导出成功');
      } else {
        throw new Error(result.message || '导出失败');
      }
    } catch (error) {
      console.error('导出考试结果失败:', error);
      toast.error(error instanceof Error ? error.message : '导出考试结果失败');
    }
  };

  const handleBatchAction = (action: string) => {
    if (selectedExams.length === 0) {
      toast.warning('请先选择要操作的考试');
      return;
    }
    toast.info(`批量${action}操作: ${selectedExams.length}个考试`);
    setSelectedExams([]);
  };

  return (
    <div className="container mx-auto p-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">考试管理</h1>
          <p className="text-gray-600 mt-1">创建和管理技能认证考试</p>
        </div>

        <div className="flex items-center space-x-3">
          <Button variant="outline" onClick={handleImportCandidates}>
            <UserPlus className="w-4 h-4 mr-2" />
            导入考生
          </Button>
          <Button variant="outline" onClick={handleImportQuestions}>
            <FileUp className="w-4 h-4 mr-2" />
            导入试卷
          </Button>
          <Button onClick={handleCreateExam}>
            <Plus className="w-4 h-4 mr-2" />
            创建考试
          </Button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <BookOpen className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">总考试数</p>
                <p className="text-2xl font-bold text-gray-900">{exams.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Play className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">进行中</p>
                <p className="text-2xl font-bold text-gray-900">
                  {exams.filter(e => e.status === 'ongoing').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">总报名数</p>
                <p className="text-2xl font-bold text-gray-900">
                  {exams.reduce((sum, e) => sum + e.registrations, 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Target className="w-6 h-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">平均通过率</p>
                <p className="text-2xl font-bold text-gray-900">
                  {Math.round(exams.reduce((sum, e) => sum + e.passRate, 0) / exams.length)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 搜索和筛选 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="w-5 h-5 mr-2" />
            搜索和筛选
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* 搜索框 */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="搜索考试标题..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* 分类筛选 */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">所有分类</option>
              {allCategories.map(category => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>

            {/* 状态筛选 */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">所有状态</option>
              <option value="draft">草稿</option>
              <option value="published">已发布</option>
              <option value="ongoing">进行中</option>
              <option value="finished">已结束</option>
              <option value="cancelled">已取消</option>
            </select>

            {/* 难度筛选 */}
            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">所有难度</option>
              <option value="beginner">初级</option>
              <option value="intermediate">中级</option>
              <option value="advanced">高级</option>
            </select>

            {/* 排序方式 */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="createdAt">创建时间</option>
              <option value="title">考试标题</option>
              <option value="startTime">开始时间</option>
              <option value="registrations">报名人数</option>
            </select>
          </div>
          
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-gray-600">
              共找到 {filteredExams.length} 个考试
            </p>
            
            {selectedExams.length > 0 && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">
                  已选择 {selectedExams.length} 个考试
                </span>
                <Button size="sm" variant="outline" onClick={() => handleBatchAction('发布')}>
                  批量发布
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleBatchAction('删除')}>
                  批量删除
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 考试列表 */}
      {filteredExams.length > 0 ? (
        <div className="space-y-4">
          {filteredExams.map((exam) => {
            const statusInfo = getStatusInfo(exam.status);
            
            return (
              <Card key={exam.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      <input
                        type="checkbox"
                        checked={selectedExams.includes(exam.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedExams(prev => [...prev, exam.id]);
                          } else {
                            setSelectedExams(prev => prev.filter(id => id !== exam.id));
                          }
                        }}
                        className="mt-1"
                      />
                      
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="font-semibold text-lg text-gray-900">
                            {exam.title}
                          </h3>
                          <div className={`w-3 h-3 rounded-full ${getDifficultyColor(exam.difficulty)}`} />
                          <Badge className={statusInfo.color}>
                            {statusInfo.icon}
                            <span className="ml-1">{statusInfo.label}</span>
                          </Badge>
                          <Badge variant="outline">{exam.category}</Badge>
                        </div>
                        
                        <p className="text-gray-600 mb-4 line-clamp-2">
                          {exam.description}
                        </p>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <Clock className="w-4 h-4" />
                            <span>{exam.duration}分钟</span>
                          </div>
                          <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <BookOpen className="w-4 h-4" />
                            <span>{exam.totalQuestions}题</span>
                          </div>
                          <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <Users className="w-4 h-4" />
                            <span>{exam.registrations}人报名</span>
                          </div>
                          <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <Target className="w-4 h-4" />
                            <span>通过率 {exam.passRate}%</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between text-sm text-gray-500">
                          <div className="flex items-center space-x-4">
                            <span>开始: {formatDate(exam.startTime)}</span>
                            <span>结束: {formatDate(exam.endTime)}</span>
                            <span>难度: {getDifficultyLabel(exam.difficulty)}</span>
                          </div>
                          
                          <span>创建于 {formatDate(exam.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-4">
                      <Button size="sm" variant="ghost" onClick={() => handleView(exam)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleEdit(exam)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost">
                        <BarChart3 className="w-4 h-4" />
                      </Button>

                      {/* 导出结果 */}
                      {(exam.status === 'finished' || exam.status === 'ongoing') && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleExportResults(exam)}
                          title="导出考试结果"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      )}

                      {/* 状态快速切换 */}
                      {exam.status === 'draft' && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleStatusChange(exam, 'published')}
                        >
                          发布
                        </Button>
                      )}
                      {exam.status === 'published' && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleStatusChange(exam, 'draft')}
                        >
                          撤回
                        </Button>
                      )}
                      
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(exam)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">暂无考试</h3>
            <p className="text-gray-600 mb-6">还没有创建任何考试</p>
            <Button onClick={handleCreateExam}>
              <Plus className="w-4 h-4 mr-2" />
              创建第一个考试
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
