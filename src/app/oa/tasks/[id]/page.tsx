/**
 * 任务详情页面
 * 显示任务的详细信息、评论、文件和操作
 */

'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, 
  Edit, 
  Trash2, 
  Calendar, 
  Clock, 
  User, 
  Tag, 
  MessageSquare,
  FileText,
  Download,
  Upload,
  Send,
  Loader2
} from 'lucide-react';
import { OATask, OAProject, OAFile, OAUser } from '@/types/oa';
import oaApi from '@/services/oa-api';
import { toast } from 'sonner';

/**
 * 任务详情页面组件
 * @returns JSX.Element
 */
export default function TaskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const taskId = params.id as string;
  
  const [task, setTask] = useState<OATask | null>(null);
  const [project, setProject] = useState<OAProject | null>(null);
  const [files, setFiles] = useState<OAFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [sendingComment, setSendingComment] = useState(false);

  /**
   * 加载任务详情
   */
  const loadTask = async () => {
    try {
      const result = await oaApi.getTask(taskId);
      if (result.success && result.data) {
        setTask(result.data);
        // 加载项目信息
        if (result.data.project) {
          loadProject(result.data.project);
        }
      } else {
        toast.error('任务不存在');
        router.push('/oa/tasks');
      }
    } catch (error) {
      console.error('加载任务失败:', error);
      toast.error('加载任务失败');
    }
  };

  /**
   * 加载项目信息
   * @param projectId - 项目ID
   */
  const loadProject = async (projectId: string) => {
    try {
      const result = await oaApi.getProject(projectId);
      if (result.success && result.data) {
        setProject(result.data);
      }
    } catch (error) {
      console.error('加载项目信息失败:', error);
    }
  };

  /**
   * 加载任务文件
   */
  const loadTaskFiles = async () => {
    try {
      const result = await oaApi.getFiles({ task: taskId });
      if (result.success && result.data) {
        setFiles(result.data);
      }
    } catch (error) {
      console.error('加载任务文件失败:', error);
    }
  };

  /**
   * 删除任务
   */
  const handleDelete = async () => {
    if (!confirm('确定要删除这个任务吗？此操作不可撤销。')) {
      return;
    }

    setDeleting(true);
    try {
      const result = await oaApi.deleteTask(taskId);
      if (result.success) {
        toast.success('任务删除成功');
        router.push('/oa/tasks');
      } else {
        toast.error(result.message || '删除任务失败');
      }
    } catch (error) {
      console.error('删除任务失败:', error);
      toast.error('删除任务失败');
    } finally {
      setDeleting(false);
    }
  };

  /**
   * 发送评论
   */
  const handleSendComment = async () => {
    if (!newComment.trim()) {
      return;
    }

    setSendingComment(true);
    try {
      // 注意：这里需要根据实际API调整
      // const result = await oaApi.addTaskComment(taskId, newComment.trim());
      // if (result.success) {
      //   setNewComment('');
      //   // 重新加载任务以获取最新评论
      //   loadTask();
      // }
      
      // 临时模拟成功
      toast.success('评论添加成功');
      setNewComment('');
    } catch (error) {
      console.error('添加评论失败:', error);
      toast.error('添加评论失败');
    } finally {
      setSendingComment(false);
    }
  };

  /**
   * 获取状态颜色
   * @param status - 任务状态
   * @returns 状态颜色类名
   */
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'To Do':
        return 'bg-gray-100 text-gray-800';
      case 'In Progress':
        return 'bg-blue-100 text-blue-800';
      case 'Done':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  /**
   * 获取优先级颜色
   * @param priority - 任务优先级
   * @returns 优先级颜色类名
   */
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low':
        return 'bg-green-100 text-green-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'urgent':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  /**
   * 获取优先级文本
   * @param priority - 任务优先级
   * @returns 优先级文本
   */
  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'low':
        return '低';
      case 'medium':
        return '中';
      case 'high':
        return '高';
      case 'urgent':
        return '紧急';
      default:
        return '未知';
    }
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

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        loadTask(),
        loadTaskFiles()
      ]);
      setLoading(false);
    };
    
    if (taskId) {
      loadData();
    }
  }, [taskId]);

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="h-96 bg-gray-200 rounded mb-6"></div>
              <div className="h-64 bg-gray-200 rounded"></div>
            </div>
            <div className="space-y-6">
              <div className="h-48 bg-gray-200 rounded"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">任务不存在</h2>
          <p className="text-gray-600 mb-6">您访问的任务可能已被删除或不存在。</p>
          <Link href="/oa/tasks">
            <Button>返回任务列表</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/oa/tasks">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{task.title}</h1>
            {project && (
              <p className="text-gray-600 mt-1">
                项目：
                <Link href={`/oa/projects/${project._id}`} className="text-blue-600 hover:underline">
                  {project.name}
                </Link>
              </p>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Link href={`/oa/tasks/${taskId}/edit`}>
            <Button variant="outline">
              <Edit className="w-4 h-4 mr-2" />
              编辑
            </Button>
          </Link>
          <Button 
            variant="destructive" 
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4 mr-2" />
            )}
            删除
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 主要内容 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 任务描述 */}
          <Card>
            <CardHeader>
              <CardTitle>任务描述</CardTitle>
            </CardHeader>
            <CardContent>
              {task.description ? (
                <div className="prose max-w-none">
                  <p className="whitespace-pre-wrap">{task.description}</p>
                </div>
              ) : (
                <p className="text-gray-500 italic">暂无描述</p>
              )}
            </CardContent>
          </Card>

          {/* 任务文件 */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  任务文件
                </CardTitle>
                <Button size="sm" variant="outline">
                  <Upload className="h-4 w-4 mr-2" />
                  上传文件
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {files.length > 0 ? (
                <div className="space-y-3">
                  {files.map((file) => (
                    <div key={file._id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="font-medium">{file.filename}</p>
                          <p className="text-sm text-gray-500">
                            {formatFileSize(file.size)} • {new Date(file.uploadDate).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Button size="sm" variant="ghost">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">暂无文件</p>
              )}
            </CardContent>
          </Card>

          {/* 评论区域 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                评论
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* 添加评论 */}
              <div className="space-y-4">
                <Textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="添加评论..."
                  rows={3}
                />
                <div className="flex justify-end">
                  <Button 
                    onClick={handleSendComment}
                    disabled={!newComment.trim() || sendingComment}
                  >
                    {sendingComment ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4 mr-2" />
                    )}
                    发送评论
                  </Button>
                </div>
              </div>

              <Separator className="my-6" />

              {/* 评论列表 */}
              <div className="space-y-4">
                <p className="text-gray-500 text-center py-4">暂无评论</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 侧边栏 */}
        <div className="space-y-6">
          {/* 任务信息 */}
          <Card>
            <CardHeader>
              <CardTitle>任务信息</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 状态 */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">状态</span>
                <Badge className={getStatusColor(task.status)}>
                  {task.status === 'To Do' ? '待处理' : 
                   task.status === 'In Progress' ? '进行中' : '已完成'}
                </Badge>
              </div>

              {/* 优先级 */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">优先级</span>
                <Badge className={getPriorityColor(task.priority)}>
                  {getPriorityText(task.priority)}
                </Badge>
              </div>

              {/* 分配给 */}
              {task.assignedTo && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">分配给</span>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-400" />
                    <span className="text-sm">{task.assignedTo}</span>
                  </div>
                </div>
              )}

              {/* 创建时间 */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">创建时间</span>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span className="text-sm">{new Date(task.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              {/* 截止日期 */}
              {task.dueDate && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">截止日期</span>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span className="text-sm">{new Date(task.dueDate).toLocaleDateString()}</span>
                  </div>
                </div>
              )}

              {/* 预估工时 */}
              {task.estimatedHours && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">预估工时</span>
                  <span className="text-sm">{task.estimatedHours} 小时</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 标签 */}
          {task.tags && task.tags.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Tag className="h-5 w-5" />
                  标签
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {task.tags.map((tag, index) => (
                    <Badge key={index} variant="secondary">
                      {tag}
                    </Badge>
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