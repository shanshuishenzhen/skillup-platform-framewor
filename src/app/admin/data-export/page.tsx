'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Download, 
  Users, 
  BookOpen, 
  FileText, 
  BarChart3, 
  Calendar,
  Filter,
  Settings,
  CheckCircle,
  AlertCircle,
  Clock
} from 'lucide-react';
import { toast } from 'sonner';

interface ExportTask {
  id: string;
  type: 'users' | 'exams' | 'questions' | 'results' | 'courses' | 'analytics';
  name: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  createdAt: string;
  completedAt?: string;
  downloadUrl?: string;
  fileSize?: string;
  recordCount?: number;
}

export default function DataExportPage() {
  const [exportTasks, setExportTasks] = useState<ExportTask[]>([
    {
      id: '1',
      type: 'users',
      name: '用户数据导出',
      description: '导出所有用户基本信息和学习记录',
      status: 'completed',
      progress: 100,
      createdAt: '2024-01-20T10:30:00Z',
      completedAt: '2024-01-20T10:32:15Z',
      downloadUrl: '/api/admin/export/users?format=excel',
      fileSize: '2.5 MB',
      recordCount: 1250
    },
    {
      id: '2',
      type: 'exams',
      name: '考试数据导出',
      description: '导出考试配置和统计信息',
      status: 'running',
      progress: 65,
      createdAt: '2024-01-20T11:00:00Z',
      recordCount: 45
    }
  ]);

  const [selectedFilters, setSelectedFilters] = useState({
    dateRange: 'all',
    format: 'excel',
    includeDetails: true
  });

  // 导出类型配置
  const exportTypes = [
    {
      type: 'users' as const,
      name: '用户数据',
      description: '用户基本信息、学习记录、认证状态',
      icon: Users,
      color: 'bg-blue-500',
      estimatedTime: '2-5分钟',
      formats: ['excel', 'csv', 'json']
    },
    {
      type: 'exams' as const,
      name: '考试数据',
      description: '考试配置、题目、参与记录',
      icon: BookOpen,
      color: 'bg-green-500',
      estimatedTime: '1-3分钟',
      formats: ['excel', 'csv', 'json']
    },
    {
      type: 'questions' as const,
      name: '题库数据',
      description: '试题内容、答案、分类标签',
      icon: FileText,
      color: 'bg-purple-500',
      estimatedTime: '3-8分钟',
      formats: ['excel', 'csv', 'json']
    },
    {
      type: 'results' as const,
      name: '考试结果',
      description: '考试成绩、答题记录、统计分析',
      icon: BarChart3,
      color: 'bg-orange-500',
      estimatedTime: '5-15分钟',
      formats: ['excel', 'csv', 'json']
    },
    {
      type: 'courses' as const,
      name: '课程数据',
      description: '课程内容、学习进度、资源文件',
      icon: Calendar,
      color: 'bg-indigo-500',
      estimatedTime: '3-10分钟',
      formats: ['excel', 'csv', 'json']
    },
    {
      type: 'analytics' as const,
      name: '分析报告',
      description: '学习分析、考试统计、趋势报告',
      icon: BarChart3,
      color: 'bg-red-500',
      estimatedTime: '2-5分钟',
      formats: ['excel', 'pdf', 'json']
    }
  ];

  // 开始导出
  const handleStartExport = async (type: string) => {
    try {
      toast.info(`正在准备导出${getTypeName(type)}...`);

      // 创建新的导出任务
      const newTask: ExportTask = {
        id: `export_${Date.now()}`,
        type: type as any,
        name: `${getTypeName(type)}导出`,
        description: `导出${getTypeName(type)}数据`,
        status: 'running',
        progress: 0,
        createdAt: new Date().toISOString(),
        recordCount: 0
      };

      setExportTasks(prev => [newTask, ...prev]);

      // 模拟导出进度
      const taskId = newTask.id;
      let progress = 0;
      const progressInterval = setInterval(() => {
        progress += Math.random() * 20;
        if (progress >= 100) {
          progress = 100;
          clearInterval(progressInterval);
          
          // 完成导出
          setExportTasks(prev => prev.map(task => 
            task.id === taskId 
              ? {
                  ...task,
                  status: 'completed',
                  progress: 100,
                  completedAt: new Date().toISOString(),
                  downloadUrl: `/api/admin/export/${type}?format=${selectedFilters.format}`,
                  fileSize: `${(Math.random() * 5 + 1).toFixed(1)} MB`,
                  recordCount: Math.floor(Math.random() * 1000 + 100)
                }
              : task
          ));
          
          toast.success(`${getTypeName(type)}导出完成！`);
        } else {
          setExportTasks(prev => prev.map(task => 
            task.id === taskId ? { ...task, progress } : task
          ));
        }
      }, 500);

    } catch (error) {
      toast.error('导出失败，请重试');
      console.error('Export failed:', error);
    }
  };

  // 下载文件
  const handleDownload = async (task: ExportTask) => {
    if (!task.downloadUrl) return;

    try {
      toast.info('正在下载文件...');
      
      // 这里应该调用实际的下载API
      const response = await fetch(task.downloadUrl);
      
      if (!response.ok) {
        throw new Error('下载失败');
      }

      // 模拟下载
      toast.success('文件下载完成！');
      
    } catch (error) {
      toast.error('下载失败，请重试');
      console.error('Download failed:', error);
    }
  };

  // 获取类型名称
  const getTypeName = (type: string) => {
    const typeMap: Record<string, string> = {
      users: '用户数据',
      exams: '考试数据',
      questions: '题库数据',
      results: '考试结果',
      courses: '课程数据',
      analytics: '分析报告'
    };
    return typeMap[type] || type;
  };

  // 获取状态图标
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'running':
        return <Clock className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  // 获取状态颜色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'running':
        return 'bg-blue-100 text-blue-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      <div className="container mx-auto p-6">
        {/* 页面标题 */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">数据导出</h1>
            <p className="text-gray-600 mt-2">导出系统数据为Excel、CSV或JSON格式</p>
          </div>
          
          <div className="flex items-center space-x-3">
            <Button variant="outline">
              <Filter className="w-4 h-4 mr-2" />
              筛选条件
            </Button>
            <Button variant="outline">
              <Settings className="w-4 h-4 mr-2" />
              导出设置
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 导出类型选择 */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>选择导出类型</CardTitle>
                <CardDescription>
                  选择要导出的数据类型，系统将生成相应格式的文件
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {exportTypes.map((type) => {
                    const Icon = type.icon;
                    return (
                      <div
                        key={type.type}
                        className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
                      >
                        <div className="flex items-start space-x-3">
                          <div className={`p-2 rounded-lg ${type.color} text-white`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-medium text-gray-900">{type.name}</h3>
                            <p className="text-sm text-gray-600 mt-1">{type.description}</p>
                            <div className="flex items-center justify-between mt-3">
                              <span className="text-xs text-gray-500">
                                预计时间: {type.estimatedTime}
                              </span>
                              <Button
                                size="sm"
                                onClick={() => handleStartExport(type.type)}
                              >
                                <Download className="w-3 h-3 mr-1" />
                                导出
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 导出任务列表 */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>导出任务</CardTitle>
                <CardDescription>
                  查看导出进度和下载文件
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {exportTasks.map((task) => (
                  <div
                    key={task.id}
                    className="border border-gray-200 rounded-lg p-3"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(task.status)}
                        <span className="font-medium text-sm">{task.name}</span>
                      </div>
                      <Badge className={getStatusColor(task.status)}>
                        {task.status === 'completed' ? '已完成' :
                         task.status === 'running' ? '进行中' :
                         task.status === 'failed' ? '失败' : '等待中'}
                      </Badge>
                    </div>
                    
                    {task.status === 'running' && (
                      <Progress value={task.progress} className="mb-2" />
                    )}
                    
                    <div className="text-xs text-gray-500 space-y-1">
                      <div>创建时间: {new Date(task.createdAt).toLocaleString()}</div>
                      {task.recordCount && (
                        <div>记录数量: {task.recordCount.toLocaleString()}</div>
                      )}
                      {task.fileSize && (
                        <div>文件大小: {task.fileSize}</div>
                      )}
                    </div>
                    
                    {task.status === 'completed' && task.downloadUrl && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full mt-2"
                        onClick={() => handleDownload(task)}
                      >
                        <Download className="w-3 h-3 mr-1" />
                        下载文件
                      </Button>
                    )}
                  </div>
                ))}
                
                {exportTasks.length === 0 && (
                  <div className="text-center text-gray-500 py-8">
                    <Download className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>暂无导出任务</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
