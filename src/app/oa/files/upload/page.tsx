/**
 * 文件上传页面
 * 提供文件上传功能，支持单文件和多文件上传
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { 
  Upload, 
  X, 
  FileText, 
  Image, 
  Video, 
  Music, 
  Archive,
  AlertCircle,
  CheckCircle,
  Loader2
} from 'lucide-react';
import { OAProject, OATask } from '@/types/oa';
import oaApi from '@/services/oa-api';
import { toast } from 'sonner';

/**
 * 文件信息接口
 */
interface FileInfo {
  file: File;
  id: string;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

/**
 * 文件上传页面组件
 * @returns JSX.Element
 */
export default function FileUploadPage() {
  const router = useRouter();
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [projects, setProjects] = useState<OAProject[]>([]);
  const [tasks, setTasks] = useState<OATask[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  
  // 表单数据
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedTask, setSelectedTask] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [allowDownload, setAllowDownload] = useState(true);
  const [allowPreview, setAllowPreview] = useState(true);

  /**
   * 获取文件图标
   * @param filename - 文件名
   * @returns 文件图标组件
   */
  const getFileIcon = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext || '')) {
      return <Image className="h-6 w-6 text-green-600" alt="Image file icon" />;
    }
    if (['mp4', 'avi', 'mov', 'wmv', 'flv'].includes(ext || '')) {
      return <Video className="h-6 w-6 text-red-600" />;
    }
    if (['mp3', 'wav', 'flac', 'aac'].includes(ext || '')) {
      return <Music className="h-6 w-6 text-purple-600" />;
    }
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext || '')) {
      return <Archive className="h-6 w-6 text-orange-600" />;
    }
    return <FileText className="h-6 w-6 text-blue-600" />;
  };

  /**
   * 格式化文件大小
   * @param bytes - 字节数
   * @returns 格式化后的文件大小
   */
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  /**
   * 处理文件选择
   * @param event - 文件选择事件
   */
  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    
    const newFiles: FileInfo[] = selectedFiles.map(file => ({
      file,
      id: Math.random().toString(36).substr(2, 9),
      progress: 0,
      status: 'pending'
    }));
    
    setFiles(prev => [...prev, ...newFiles]);
  }, []);

  /**
   * 处理拖拽上传
   */
  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    
    const droppedFiles = Array.from(event.dataTransfer.files);
    
    const newFiles: FileInfo[] = droppedFiles.map(file => ({
      file,
      id: Math.random().toString(36).substr(2, 9),
      progress: 0,
      status: 'pending'
    }));
    
    setFiles(prev => [...prev, ...newFiles]);
  }, []);

  /**
   * 阻止默认拖拽行为
   */
  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  }, []);

  /**
   * 移除文件
   * @param fileId - 文件ID
   */
  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

  /**
   * 上传单个文件
   * @param fileInfo - 文件信息
   */
  const uploadSingleFile = async (fileInfo: FileInfo) => {
    try {
      // 更新状态为上传中
      setFiles(prev => prev.map(f => 
        f.id === fileInfo.id 
          ? { ...f, status: 'uploading' as const }
          : f
      ));

      const formData = new FormData();
      formData.append('file', fileInfo.file);
      
      if (selectedProject) {
        formData.append('project', selectedProject);
      }
      if (selectedTask) {
        formData.append('task', selectedTask);
      }
      if (category) {
        formData.append('category', category);
      }
      if (description) {
        formData.append('description', description);
      }
      
      formData.append('isPublic', isPublic.toString());
      formData.append('permissions', JSON.stringify({
        download: allowDownload,
        preview: allowPreview
      }));

      // 模拟上传进度
      const progressInterval = setInterval(() => {
        setFiles(prev => prev.map(f => {
          if (f.id === fileInfo.id && f.progress < 90) {
            return { ...f, progress: f.progress + 10 };
          }
          return f;
        }));
      }, 200);

      const result = await oaApi.uploadFile(formData);
      
      clearInterval(progressInterval);
      
      if (result.success) {
        // 上传成功
        setFiles(prev => prev.map(f => 
          f.id === fileInfo.id 
            ? { ...f, status: 'success' as const, progress: 100 }
            : f
        ));
      } else {
        // 上传失败
        setFiles(prev => prev.map(f => 
          f.id === fileInfo.id 
            ? { 
                ...f, 
                status: 'error' as const, 
                error: result.message || '上传失败'
              }
            : f
        ));
      }
    } catch (error) {
      console.error('上传文件失败:', error);
      setFiles(prev => prev.map(f => 
        f.id === fileInfo.id 
          ? { 
              ...f, 
              status: 'error' as const, 
              error: '上传失败'
            }
          : f
      ));
    }
  };

  /**
   * 开始上传所有文件
   */
  const handleUpload = async () => {
    if (files.length === 0) {
      toast.error('请先选择要上传的文件');
      return;
    }

    setUploading(true);
    
    try {
      // 并发上传所有文件
      await Promise.all(
        files
          .filter(f => f.status === 'pending')
          .map(uploadSingleFile)
      );
      
      const successCount = files.filter(f => f.status === 'success').length;
      const errorCount = files.filter(f => f.status === 'error').length;
      
      if (successCount > 0) {
        toast.success(`成功上传 ${successCount} 个文件`);
      }
      if (errorCount > 0) {
        toast.error(`${errorCount} 个文件上传失败`);
      }
      
      // 如果所有文件都上传成功，跳转到文件列表
      if (errorCount === 0) {
        setTimeout(() => {
          router.push('/oa/files');
        }, 1000);
      }
    } catch (error) {
      console.error('批量上传失败:', error);
      toast.error('批量上传失败');
    } finally {
      setUploading(false);
    }
  };

  /**
   * 加载项目和任务列表
   */
  const loadData = async () => {
    try {
      const [projectsResult, tasksResult] = await Promise.all([
        oaApi.getProjects(),
        oaApi.getTasks()
      ]);
      
      if (projectsResult.success && projectsResult.data) {
        setProjects(projectsResult.data);
      }
      
      if (tasksResult.success && tasksResult.data) {
        setTasks(tasksResult.data);
      }
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * 根据选择的项目筛选任务
   */
  const filteredTasks = selectedProject 
    ? tasks.filter(task => task.project === selectedProject)
    : tasks;

  useEffect(() => {
    loadData();
  }, []);

  // 当选择项目时，清空任务选择
  useEffect(() => {
    setSelectedTask('');
  }, [selectedProject]);

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">上传文件</h1>
          <p className="text-gray-600 mt-1">上传项目或任务相关的文件</p>
        </div>
        
        <Button variant="outline" onClick={() => router.back()}>
          返回
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 文件上传区域 */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>选择文件</CardTitle>
              <CardDescription>
                支持拖拽上传或点击选择文件，支持多文件同时上传
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* 拖拽上传区域 */}
              <div
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors"
                onDrop={handleDrop}
                onDragOver={handleDragOver}
              >
                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  拖拽文件到此处或点击选择
                </h3>
                <p className="text-gray-600 mb-4">
                  支持所有常见文件格式，单个文件最大 100MB
                </p>
                <input
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload">
                  <Button variant="outline" className="cursor-pointer">
                    选择文件
                  </Button>
                </label>
              </div>

              {/* 文件列表 */}
              {files.length > 0 && (
                <div className="mt-6">
                  <h4 className="font-medium text-gray-900 mb-4">
                    已选择的文件 ({files.length})
                  </h4>
                  <div className="space-y-3">
                    {files.map((fileInfo) => (
                      <div
                        key={fileInfo.id}
                        className="flex items-center gap-3 p-3 border rounded-lg"
                      >
                        {getFileIcon(fileInfo.file.name)}
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-gray-900 truncate">
                              {fileInfo.file.name}
                            </p>
                            <div className="flex items-center gap-2">
                              {fileInfo.status === 'success' && (
                                <CheckCircle className="h-5 w-5 text-green-600" />
                              )}
                              {fileInfo.status === 'error' && (
                                <AlertCircle className="h-5 w-5 text-red-600" />
                              )}
                              {fileInfo.status === 'uploading' && (
                                <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                              )}
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => removeFile(fileInfo.id)}
                                disabled={fileInfo.status === 'uploading'}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          
                          <p className="text-sm text-gray-500">
                            {formatFileSize(fileInfo.file.size)}
                          </p>
                          
                          {fileInfo.status === 'uploading' && (
                            <Progress value={fileInfo.progress} className="mt-2" />
                          )}
                          
                          {fileInfo.status === 'error' && fileInfo.error && (
                            <p className="text-sm text-red-600 mt-1">
                              {fileInfo.error}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 文件信息设置 */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>文件信息</CardTitle>
              <CardDescription>
                设置文件的相关信息和权限
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 关联项目 */}
              <div>
                <Label htmlFor="project">关联项目</Label>
                <Select value={selectedProject} onValueChange={setSelectedProject}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择项目（可选）" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">不关联项目</SelectItem>
                    {projects.map((project) => (
                      <SelectItem key={project._id} value={project._id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 关联任务 */}
              <div>
                <Label htmlFor="task">关联任务</Label>
                <Select 
                  value={selectedTask} 
                  onValueChange={setSelectedTask}
                  disabled={!selectedProject}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择任务（可选）" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">不关联任务</SelectItem>
                    {filteredTasks.map((task) => (
                      <SelectItem key={task._id} value={task._id}>
                        {task.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!selectedProject && (
                  <p className="text-xs text-gray-500 mt-1">
                    请先选择项目
                  </p>
                )}
              </div>

              {/* 文件分类 */}
              <div>
                <Label htmlFor="category">文件分类</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择分类（可选）" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">不设置分类</SelectItem>
                    <SelectItem value="document">文档</SelectItem>
                    <SelectItem value="image">图片</SelectItem>
                    <SelectItem value="video">视频</SelectItem>
                    <SelectItem value="audio">音频</SelectItem>
                    <SelectItem value="archive">压缩包</SelectItem>
                    <SelectItem value="other">其他</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 文件描述 */}
              <div>
                <Label htmlFor="description">文件描述</Label>
                <Textarea
                  id="description"
                  placeholder="描述文件内容和用途（可选）"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>

              {/* 权限设置 */}
              <div className="space-y-3">
                <Label>权限设置</Label>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isPublic"
                    checked={isPublic}
                    onCheckedChange={(checked) => setIsPublic(checked as boolean)}
                  />
                  <Label htmlFor="isPublic" className="text-sm">
                    公开文件
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="allowDownload"
                    checked={allowDownload}
                    onCheckedChange={(checked) => setAllowDownload(checked as boolean)}
                  />
                  <Label htmlFor="allowDownload" className="text-sm">
                    允许下载
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="allowPreview"
                    checked={allowPreview}
                    onCheckedChange={(checked) => setAllowPreview(checked as boolean)}
                  />
                  <Label htmlFor="allowPreview" className="text-sm">
                    允许预览
                  </Label>
                </div>
              </div>

              {/* 上传按钮 */}
              <Button
                onClick={handleUpload}
                disabled={files.length === 0 || uploading}
                className="w-full"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    上传中...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    开始上传 ({files.length} 个文件)
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}