/**
 * 项目详情页面
 * 显示项目的详细信息、任务列表、文件和团队成员
 */

'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  ArrowLeft,
  Edit,
  Trash2,
  Plus,
  Users,
  Calendar,
  DollarSign,
  CheckSquare,
  FileText,
  MessageSquare,
  MoreHorizontal,
  Clock,
  AlertCircle,
  Target,
  TrendingUp
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { OAProject, OATask, OAFile } from '@/types/oa';
import oaApi from '@/services/oa-api';
import { toast } from 'sonner';

/**
 * 任务卡片组件
 * @param task - 任务数据
 * @param onUpdate - 更新回调函数
 * @returns JSX.Element
 */
function TaskCard({ task, onUpdate }: {
  task: OATask;
  onUpdate: () => void;
}) {
  /**
   * 获取任务状态颜色
   * @param status - 任务状态
   * @returns 状态对应的颜色类名
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
   * @param priority - 优先级
   * @returns 优先级对应的颜色类名
   */
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h4 className="font-medium text-sm">
            <Link href={`/oa/tasks/${task._id}`} className="hover:text-blue-600">
              {task.title}
            </Link>
          </h4>
          <div className="flex items-center gap-1">
            <Badge className={getStatusColor(task.status)} variant="secondary">
              {task.status}
            </Badge>
            {task.priority && (
              <Badge className={getPriorityColor(task.priority)} variant="secondary">
                {task.priority}
              </Badge>
            )}
          </div>
        </div>
        {task.description && (
          <p className="text-sm text-gray-600 mb-2 line-clamp-2">
            {task.description}
          </p>
        )}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{new Date(task.createdAt).toLocaleDateString()}</span>
          </div>
          {task.assignedTo && (
            <div className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              <span>{typeof task.assignedTo === 'object' ? task.assignedTo.username : '未知'}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * 文件卡片组件
 * @param file - 文件数据
 * @returns JSX.Element
 */
function FileCard({ file }: { file: OAFile }) {
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

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h4 className="font-medium text-sm truncate">{file.originalName}</h4>
          <Badge variant="outline">{file.category}</Badge>
        </div>
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>{formatFileSize(file.size)}</span>
          <span>{new Date(file.createdAt).toLocaleDateString()}</span>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * 项目详情页面组件
 * @returns JSX.Element
 */
export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  
  const [project, setProject] = useState<OAProject | null>(null);
  const [tasks, setTasks] = useState<OATask[]>([]);
  const [files, setFiles] = useState<OAFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [filesLoading, setFilesLoading] = useState(false);

  /**
   * 加载项目详情
   */
  const loadProject = async () => {
    try {
      const result = await oaApi.getProject(projectId);
      if (result.success && result.data) {
        setProject(result.data);
      } else {
        toast.error(result.message || '加载项目详情失败');
        router.push('/oa/projects');
      }
    } catch (error) {
      console.error('加载项目详情失败:', error);
      toast.error('加载项目详情失败');
      router.push('/oa/projects');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 加载项目任务
   */
  const loadTasks = async () => {
    try {
      setTasksLoading(true);
      const result = await oaApi.getProjectTasks(projectId);
      if (result.success && result.data) {
        setTasks(result.data);
      }
    } catch (error) {
      console.error('加载项目任务失败:', error);
    } finally {
      setTasksLoading(false);
    }
  };

  /**
   * 加载项目文件
   */
  const loadFiles = async () => {
    try {
      setFilesLoading(true);
      const result = await oaApi.getFiles({ project: projectId });
      if (result.success && result.data) {
        setFiles(result.data);
      }
    } catch (error) {
      console.error('加载项目文件失败:', error);
    } finally {
      setFilesLoading(false);
    }
  };

  /**
   * 删除项目
   */
  const handleDelete = async () => {
    if (!confirm('确定要删除这个项目吗？此操作不可恢复。')) {
      return;
    }

    try {
      const result = await oaApi.deleteProject(projectId);
      if (result.success) {
        toast.success('项目删除成功');
        router.push('/oa/projects');
      } else {
        toast.error(result.message || '删除项目失败');
      }
    } catch (error) {
      console.error('删除项目失败:', error);
      toast.error('删除项目失败');
    }
  };

  useEffect(() => {
    if (projectId) {
      loadProject();
      loadTasks();
      loadFiles();
    }
  }, [projectId]);

  /**
   * 获取项目状态颜色
   * @param status - 项目状态
   * @returns 状态对应的颜色类名
   */
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'on-hold':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  /**
   * 获取项目状态文本
   * @param status - 项目状态
   * @returns 状态对应的中文文本
   */
  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return '进行中';
      case 'completed':
        return '已完成';
      case 'on-hold':
        return '暂停';
      case 'cancelled':
        return '已取消';
      default:
        return '未知';
    }
  };

  /**
   * 计算任务完成进度
   */
  const getTaskProgress = () => {
    if (tasks.length === 0) return 0;
    const completedTasks = tasks.filter(task => task.status === 'Done').length;
    return Math.round((completedTasks / tasks.length) * 100);
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="h-64 bg-gray-200 rounded"></div>
              <div className="h-96 bg-gray-200 rounded"></div>
            </div>
            <div className="space-y-6">
              <div className="h-48 bg-gray-200 rounded"></div>
              <div className="h-48 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">项目不存在</h3>
          <p className="mt-1 text-sm text-gray-500">请检查项目ID是否正确</p>
          <div className="mt-6">
            <Link href="/oa/projects">
              <Button>
                返回项目列表
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      {/* 页面标题和操作 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/oa/projects">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
            <p className="text-gray-600 mt-1">{project.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={getStatusColor(project.status || 'active')}>
            {getStatusText(project.status || 'active')}
          </Badge>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>操作</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href={`/oa/projects/${project._id}/edit`}>
                  <Edit className="h-4 w-4 mr-2" />
                  编辑项目
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/oa/projects/${project._id}/tasks/new`}>
                  <Plus className="h-4 w-4 mr-2" />
                  新建任务
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-red-600"
                onClick={handleDelete}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                删除项目
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 主要内容区域 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 项目概览 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                项目概览
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{tasks.length}</div>
                  <div className="text-sm text-gray-600">总任务数</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {tasks.filter(t => t.status === 'Done').length}
                  </div>
                  <div className="text-sm text-gray-600">已完成</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{getTaskProgress()}%</div>
                  <div className="text-sm text-gray-600">完成进度</div>
                </div>
              </div>
              <div className="mt-4">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span>项目进度</span>
                  <span>{getTaskProgress()}%</span>
                </div>
                <Progress value={getTaskProgress()} className="h-2" />
              </div>
            </CardContent>
          </Card>

          {/* 任务列表 */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <CheckSquare className="h-5 w-5" />
                  项目任务
                </CardTitle>
                <Link href={`/oa/projects/${project._id}/tasks/new`}>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    新建任务
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {tasksLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-24 bg-gray-200 rounded animate-pulse"></div>
                  ))}
                </div>
              ) : tasks.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {tasks.slice(0, 6).map((task) => (
                    <TaskCard key={task._id} task={task} onUpdate={loadTasks} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CheckSquare className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">暂无任务</h3>
                  <p className="mt-1 text-sm text-gray-500">为这个项目创建第一个任务</p>
                  <div className="mt-6">
                    <Link href={`/oa/projects/${project._id}/tasks/new`}>
                      <Button>
                        <Plus className="w-4 h-4 mr-2" />
                        新建任务
                      </Button>
                    </Link>
                  </div>
                </div>
              )}
              {tasks.length > 6 && (
                <div className="mt-4 text-center">
                  <Link href={`/oa/projects/${project._id}/tasks`}>
                    <Button variant="outline">
                      查看所有任务 ({tasks.length})
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 侧边栏 */}
        <div className="space-y-6">
          {/* 项目信息 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">项目信息</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-gray-500" />
                <span className="text-sm">
                  创建者: {typeof project.owner === 'object' ? project.owner.username : '未知'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span className="text-sm">
                  创建时间: {new Date(project.createdAt).toLocaleDateString()}
                </span>
              </div>
              {project.budget && (
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">预算: ¥{project.budget.toLocaleString()}</span>
                </div>
              )}
              {project.tags && project.tags.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">标签:</p>
                  <div className="flex flex-wrap gap-1">
                    {project.tags.map((tag, index) => (
                      <Badge key={index} variant="outline">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 项目文件 */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  项目文件
                </CardTitle>
                <Link href={`/oa/files/upload?project=${project._id}`}>
                  <Button size="sm" variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    上传
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {filesLoading ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-16 bg-gray-200 rounded animate-pulse"></div>
                  ))}
                </div>
              ) : files.length > 0 ? (
                <div className="space-y-2">
                  {files.slice(0, 5).map((file) => (
                    <FileCard key={file._id} file={file} />
                  ))}
                  {files.length > 5 && (
                    <div className="text-center pt-2">
                      <Link href={`/oa/files?project=${project._id}`}>
                        <Button variant="outline" size="sm">
                          查看所有文件 ({files.length})
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-4">
                  <FileText className="mx-auto h-8 w-8 text-gray-400" />
                  <p className="text-sm text-gray-500 mt-2">暂无文件</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 快速操作 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">快速操作</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href={`/oa/projects/${project._id}/tasks/new`}>
                <Button variant="outline" className="w-full justify-start">
                  <Plus className="h-4 w-4 mr-2" />
                  新建任务
                </Button>
              </Link>
              <Link href={`/oa/files/upload?project=${project._id}`}>
                <Button variant="outline" className="w-full justify-start">
                  <FileText className="h-4 w-4 mr-2" />
                  上传文件
                </Button>
              </Link>
              <Link href={`/oa/messages?project=${project._id}`}>
                <Button variant="outline" className="w-full justify-start">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  项目讨论
                </Button>
              </Link>
              <Link href={`/oa/projects/${project._id}/edit`}>
                <Button variant="outline" className="w-full justify-start">
                  <Edit className="h-4 w-4 mr-2" />
                  编辑项目
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}