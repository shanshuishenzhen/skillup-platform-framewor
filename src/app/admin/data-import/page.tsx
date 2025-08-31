'use client';

import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Upload, 
  Users, 
  BookOpen, 
  FileText, 
  BarChart3, 
  Calendar,
  Download,
  CheckCircle,
  AlertCircle,
  Clock,
  FileUp,
  X
} from 'lucide-react';
import { toast } from 'sonner';

interface ImportTask {
  id: string;
  type: 'users' | 'exams' | 'questions' | 'results' | 'courses';
  name: string;
  fileName: string;
  status: 'pending' | 'validating' | 'importing' | 'completed' | 'failed';
  progress: number;
  createdAt: string;
  completedAt?: string;
  totalRecords?: number;
  successCount?: number;
  failedCount?: number;
  errors?: string[];
}

export default function DataImportPage() {
  const [importTasks, setImportTasks] = useState<ImportTask[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 导入类型配置
  const importTypes = [
    {
      type: 'test' as const,
      name: '测试模板',
      description: '简单的测试模板，用于验证下载功能',
      icon: Users,
      color: 'bg-green-500',
      acceptedFormats: ['.csv'],
      templateUrl: '/api/admin/test-template',
      maxSize: '1MB',
      sampleFields: ['姓名', '邮箱', '部门']
    },
    {
      type: 'users' as const,
      name: '用户数据',
      description: '批量导入用户基本信息和账号',
      icon: Users,
      color: 'bg-blue-500',
      acceptedFormats: ['.xlsx', '.xls', '.csv'],
      templateUrl: '/api/admin/users/import/template',
      maxSize: '10MB',
      sampleFields: ['姓名', '邮箱', '手机号', '部门', '职位']
    },
    {
      type: 'exams' as const,
      name: '考试数据',
      description: '导入考试配置和基本信息',
      icon: BookOpen,
      color: 'bg-green-500',
      acceptedFormats: ['.xlsx', '.xls', '.csv'],
      templateUrl: '/api/admin/exams/import/template',
      maxSize: '5MB',
      sampleFields: ['考试名称', '考试类型', '时长', '总分', '及格分']
    },
    {
      type: 'questions' as const,
      name: '题库数据',
      description: '批量导入试题和答案',
      icon: FileText,
      color: 'bg-purple-500',
      acceptedFormats: ['.xlsx', '.xls', '.csv'],
      templateUrl: '/api/admin/questions/import/template',
      maxSize: '20MB',
      sampleFields: ['题目内容', '题目类型', '选项', '正确答案', '分值']
    },
    {
      type: 'results' as const,
      name: '考试结果',
      description: '导入历史考试成绩数据',
      icon: BarChart3,
      color: 'bg-orange-500',
      acceptedFormats: ['.xlsx', '.xls', '.csv'],
      templateUrl: '/api/admin/results/import/template',
      maxSize: '15MB',
      sampleFields: ['考生姓名', '考试名称', '得分', '考试时间', '状态']
    },
    {
      type: 'courses' as const,
      name: '课程数据',
      description: '导入课程信息和学习资源',
      icon: Calendar,
      color: 'bg-indigo-500',
      acceptedFormats: ['.xlsx', '.xls', '.csv'],
      templateUrl: '/api/admin/courses/import/template',
      maxSize: '25MB',
      sampleFields: ['课程名称', '课程分类', '时长', '讲师', '描述']
    }
  ];

  // 处理文件选择
  const handleFileSelect = (files: FileList | null, type?: string) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    
    // 验证文件类型
    const validExtensions = ['.xlsx', '.xls', '.csv'];
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    
    if (!validExtensions.includes(fileExtension)) {
      toast.error('不支持的文件格式，请上传Excel或CSV文件');
      return;
    }

    // 验证文件大小 (最大50MB)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('文件大小超过限制，请上传小于50MB的文件');
      return;
    }

    // 创建导入任务
    const newTask: ImportTask = {
      id: `import_${Date.now()}`,
      type: (type as any) || 'users',
      name: `${file.name} 导入`,
      fileName: file.name,
      status: 'validating',
      progress: 0,
      createdAt: new Date().toISOString()
    };

    setImportTasks(prev => [newTask, ...prev]);
    
    // 开始导入流程
    startImportProcess(newTask, file);
  };

  // 开始导入流程
  const startImportProcess = async (task: ImportTask, file: File) => {
    try {
      // 阶段1: 文件验证
      setImportTasks(prev => prev.map(t => 
        t.id === task.id ? { ...t, status: 'validating', progress: 10 } : t
      ));
      
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 阶段2: 数据导入
      setImportTasks(prev => prev.map(t => 
        t.id === task.id ? { ...t, status: 'importing', progress: 30 } : t
      ));

      // 模拟导入进度
      let progress = 30;
      const progressInterval = setInterval(() => {
        progress += Math.random() * 15;
        if (progress >= 95) {
          clearInterval(progressInterval);
          
          // 完成导入
          const successCount = Math.floor(Math.random() * 800 + 200);
          const failedCount = Math.floor(Math.random() * 50);
          
          setImportTasks(prev => prev.map(t => 
            t.id === task.id ? {
              ...t,
              status: 'completed',
              progress: 100,
              completedAt: new Date().toISOString(),
              totalRecords: successCount + failedCount,
              successCount,
              failedCount,
              errors: failedCount > 0 ? [
                '第15行：邮箱格式不正确',
                '第23行：手机号格式错误',
                '第45行：必填字段为空'
              ] : []
            } : t
          ));
          
          toast.success(`导入完成！成功 ${successCount} 条，失败 ${failedCount} 条`);
        } else {
          setImportTasks(prev => prev.map(t => 
            t.id === task.id ? { ...t, progress } : t
          ));
        }
      }, 300);

    } catch (error) {
      setImportTasks(prev => prev.map(t => 
        t.id === task.id ? { 
          ...t, 
          status: 'failed', 
          progress: 0,
          errors: ['导入失败：' + (error instanceof Error ? error.message : '未知错误')]
        } : t
      ));
      toast.error('导入失败，请重试');
    }
  };

  // 下载模板
  const handleDownloadTemplate = async (type: string) => {
    try {
      const templateUrl = importTypes.find(t => t.type === type)?.templateUrl;
      if (!templateUrl) {
        toast.error('模板不存在');
        return;
      }

      toast.info('正在下载模板...');

      // 调用实际的模板下载API
      const response = await fetch(templateUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error(`下载失败: ${response.status}`);
      }

      // 获取文件名
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `${type}_template.csv`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      // 下载文件
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('模板下载完成！');

    } catch (error) {
      toast.error('模板下载失败，请重试');
      console.error('Template download failed:', error);
    }
  };

  // 删除任务
  const handleDeleteTask = (taskId: string) => {
    setImportTasks(prev => prev.filter(t => t.id !== taskId));
    toast.success('任务已删除');
  };

  // 拖拽处理
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  // 获取状态图标
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'validating':
      case 'importing':
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
      case 'validating':
        return 'bg-yellow-100 text-yellow-800';
      case 'importing':
        return 'bg-blue-100 text-blue-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // 获取状态文本
  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return '已完成';
      case 'validating': return '验证中';
      case 'importing': return '导入中';
      case 'failed': return '失败';
      default: return '等待中';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      <div className="container mx-auto p-6">
        {/* 页面标题 */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">数据导入</h1>
            <p className="text-gray-600 mt-2">批量导入Excel或CSV格式的数据文件</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 导入类型和文件上传 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 文件上传区域 */}
            <Card>
              <CardHeader>
                <CardTitle>上传文件</CardTitle>
                <CardDescription>
                  拖拽文件到此区域或点击选择文件
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    dragOver 
                      ? 'border-blue-400 bg-blue-50' 
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <FileUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-lg font-medium text-gray-900 mb-2">
                    拖拽文件到此处
                  </p>
                  <p className="text-gray-600 mb-4">
                    支持 .xlsx, .xls, .csv 格式，最大 50MB
                  </p>
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    variant="outline"
                  >
                    选择文件
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={(e) => handleFileSelect(e.target.files)}
                    className="hidden"
                  />
                </div>
              </CardContent>
            </Card>

            {/* 导入类型说明 */}
            <Card>
              <CardHeader>
                <CardTitle>支持的数据类型</CardTitle>
                <CardDescription>
                  选择对应的数据类型并下载模板文件
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {importTypes.map((type) => {
                    const Icon = type.icon;
                    return (
                      <div
                        key={type.type}
                        className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                      >
                        <div className="flex items-center space-x-3">
                          <div className={`p-2 rounded-lg ${type.color} text-white`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="font-medium text-gray-900">{type.name}</h3>
                            <p className="text-sm text-gray-600">{type.description}</p>
                            <div className="flex items-center space-x-4 mt-1">
                              <span className="text-xs text-gray-500">
                                格式: {type.acceptedFormats.join(', ')}
                              </span>
                              <span className="text-xs text-gray-500">
                                最大: {type.maxSize}
                              </span>
                            </div>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDownloadTemplate(type.type)}
                        >
                          <Download className="w-3 h-3 mr-1" />
                          下载模板
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 导入任务列表 */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>导入任务</CardTitle>
                <CardDescription>
                  查看导入进度和结果
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {importTasks.map((task) => (
                  <div
                    key={task.id}
                    className="border border-gray-200 rounded-lg p-3"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(task.status)}
                        <span className="font-medium text-sm truncate">
                          {task.fileName}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Badge className={getStatusColor(task.status)}>
                          {getStatusText(task.status)}
                        </Badge>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteTask(task.id)}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    
                    {(task.status === 'validating' || task.status === 'importing') && (
                      <Progress value={task.progress} className="mb-2" />
                    )}
                    
                    <div className="text-xs text-gray-500 space-y-1">
                      <div>创建时间: {new Date(task.createdAt).toLocaleString()}</div>
                      {task.totalRecords && (
                        <div>
                          总记录: {task.totalRecords} | 
                          成功: {task.successCount} | 
                          失败: {task.failedCount}
                        </div>
                      )}
                    </div>
                    
                    {task.errors && task.errors.length > 0 && (
                      <div className="mt-2 p-2 bg-red-50 rounded text-xs">
                        <div className="font-medium text-red-800 mb-1">错误信息:</div>
                        {task.errors.slice(0, 3).map((error, index) => (
                          <div key={index} className="text-red-600">{error}</div>
                        ))}
                        {task.errors.length > 3 && (
                          <div className="text-red-600">
                            还有 {task.errors.length - 3} 个错误...
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                
                {importTasks.length === 0 && (
                  <div className="text-center text-gray-500 py-8">
                    <Upload className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>暂无导入任务</p>
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
