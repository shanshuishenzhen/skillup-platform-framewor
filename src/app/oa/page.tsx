/**
 * OA 系统主页面
 * 提供 OA 系统的概览和快速访问入口
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Users,
  FolderOpen,
  CheckSquare,
  MessageSquare,
  FileText,
  Calendar,
  TrendingUp,
  Clock,
  AlertCircle,
  Plus
} from 'lucide-react';
import Link from 'next/link';
import { OAProject, OATask, OAFile, OAChatRoom } from '@/types/oa';
import oaApi from '@/services/oa-api';

/**
 * OA 系统主页面组件
 * @returns JSX.Element
 */
export default function OAHomePage() {
  const [stats, setStats] = useState({
    projects: 0,
    tasks: 0,
    files: 0,
    messages: 0
  });
  const [recentProjects, setRecentProjects] = useState<OAProject[]>([]);
  const [recentTasks, setRecentTasks] = useState<OATask[]>([]);
  const [recentFiles, setRecentFiles] = useState<OAFile[]>([]);
  const [loading, setLoading] = useState(true);

  /**
   * 加载仪表板数据
   */
  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // 并行加载各种数据
      const [projectsRes, tasksRes, filesRes] = await Promise.all([
        oaApi.getProjects({ limit: 5 }),
        oaApi.getTasks({ limit: 5 }),
        oaApi.getFiles({ limit: 5 })
      ]);

      if (projectsRes.success && projectsRes.data) {
        setRecentProjects(projectsRes.data);
        setStats(prev => ({ ...prev, projects: projectsRes.pagination?.total || 0 }));
      }

      if (tasksRes.success && tasksRes.data) {
        setRecentTasks(tasksRes.data);
        setStats(prev => ({ ...prev, tasks: tasksRes.pagination?.total || 0 }));
      }

      if (filesRes.success && filesRes.data) {
        setRecentFiles(filesRes.data);
        setStats(prev => ({ ...prev, files: filesRes.pagination?.total || 0 }));
      }

    } catch (error) {
      console.error('加载仪表板数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  /**
   * 获取任务状态颜色
   * @param status - 任务状态
   * @returns 状态对应的颜色类名
   */
  const getTaskStatusColor = (status: string) => {
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20">
        <div className="container mx-auto p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
            <div className="h-96 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      <div className="container mx-auto p-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">OA 办公系统</h1>
          <p className="text-gray-600 mt-2">协作办公，高效管理</p>
        </div>
        <div className="flex gap-2">
          <Link href="/oa/projects/new">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              新建项目
            </Button>
          </Link>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">项目总数</CardTitle>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.projects}</div>
            <p className="text-xs text-muted-foreground">
              <Link href="/oa/projects" className="text-blue-600 hover:underline">
                查看所有项目
              </Link>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">任务总数</CardTitle>
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.tasks}</div>
            <p className="text-xs text-muted-foreground">
              <Link href="/oa/tasks" className="text-blue-600 hover:underline">
                查看所有任务
              </Link>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">文件总数</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.files}</div>
            <p className="text-xs text-muted-foreground">
              <Link href="/oa/files" className="text-blue-600 hover:underline">
                查看所有文件
              </Link>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">消息通讯</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.messages}</div>
            <p className="text-xs text-muted-foreground">
              <Link href="/oa/messages" className="text-blue-600 hover:underline">
                进入聊天室
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 快速访问和最近活动 */}
      <Tabs defaultValue="recent" className="space-y-4">
        <TabsList>
          <TabsTrigger value="recent">最近活动</TabsTrigger>
          <TabsTrigger value="quick">快速访问</TabsTrigger>
        </TabsList>

        <TabsContent value="recent" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 最近项目 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <FolderOpen className="w-5 h-5 mr-2" />
                  最近项目
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {recentProjects.length > 0 ? (
                  recentProjects.map((project) => (
                    <div key={project._id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                      <div className="flex-1">
                        <Link href={`/oa/projects/${project._id}`} className="font-medium text-blue-600 hover:underline">
                          {project.name}
                        </Link>
                        <p className="text-sm text-gray-600 truncate">{project.description}</p>
                      </div>
                      <Badge variant="outline">{project.status || 'active'}</Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-4">暂无项目</p>
                )}
                <Link href="/oa/projects">
                  <Button variant="outline" className="w-full">
                    查看所有项目
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* 最近任务 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <CheckSquare className="w-5 h-5 mr-2" />
                  最近任务
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {recentTasks.length > 0 ? (
                  recentTasks.map((task) => (
                    <div key={task._id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                      <div className="flex-1">
                        <Link href={`/oa/tasks/${task._id}`} className="font-medium text-blue-600 hover:underline">
                          {task.title}
                        </Link>
                        <p className="text-sm text-gray-600">
                          {typeof task.project === 'object' ? task.project.name : '未知项目'}
                        </p>
                      </div>
                      <Badge className={getTaskStatusColor(task.status)}>
                        {task.status}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-4">暂无任务</p>
                )}
                <Link href="/oa/tasks">
                  <Button variant="outline" className="w-full">
                    查看所有任务
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* 最近文件 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <FileText className="w-5 h-5 mr-2" />
                  最近文件
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {recentFiles.length > 0 ? (
                  recentFiles.map((file) => (
                    <div key={file._id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                      <div className="flex-1">
                        <p className="font-medium text-blue-600">{file.originalName}</p>
                        <p className="text-sm text-gray-600">
                          {formatFileSize(file.size)} • {file.category}
                        </p>
                      </div>
                      <Badge variant="outline">
                        {new Date(file.createdAt).toLocaleDateString()}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-4">暂无文件</p>
                )}
                <Link href="/oa/files">
                  <Button variant="outline" className="w-full">
                    查看所有文件
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="quick" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link href="/oa/projects/new">
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="flex flex-col items-center justify-center p-6">
                  <FolderOpen className="w-8 h-8 text-blue-600 mb-2" />
                  <h3 className="font-medium">创建项目</h3>
                  <p className="text-sm text-gray-600 text-center">开始新的协作项目</p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/oa/tasks/new">
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="flex flex-col items-center justify-center p-6">
                  <CheckSquare className="w-8 h-8 text-green-600 mb-2" />
                  <h3 className="font-medium">创建任务</h3>
                  <p className="text-sm text-gray-600 text-center">分配新的工作任务</p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/oa/files/upload">
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="flex flex-col items-center justify-center p-6">
                  <FileText className="w-8 h-8 text-purple-600 mb-2" />
                  <h3 className="font-medium">上传文件</h3>
                  <p className="text-sm text-gray-600 text-center">共享项目文档</p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/oa/messages">
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="flex flex-col items-center justify-center p-6">
                  <MessageSquare className="w-8 h-8 text-orange-600 mb-2" />
                  <h3 className="font-medium">团队沟通</h3>
                  <p className="text-sm text-gray-600 text-center">即时消息交流</p>
                </CardContent>
              </Card>
            </Link>
          </div>
        </TabsContent>
      </Tabs>
      </div>
    </div>
  );
}