/**
 * 项目管理组件 - 完整版本
 * 包含项目创建、编辑、任务管理、进度跟踪等功能
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { 
  Plus, 
  Search, 
  Filter,
  Calendar,
  Users,
  Target,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  FolderOpen,
  Star,
  TrendingUp,
  Save,
  X,
  UserPlus,
  ListTodo,
  BarChart3,
  Settings
} from 'lucide-react';
import { toast } from 'sonner';

// 类型定义
interface ProjectMember {
  id: string;
  name: string;
  role: string;
  avatar?: string;
  email?: string;
}

interface ProjectTask {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in_progress' | 'completed' | 'blocked';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignee?: ProjectMember;
  dueDate?: string;
  estimatedHours?: number;
  actualHours?: number;
  dependencies?: string[];
  tags?: string[];
}

interface ProjectItem {
  id: string;
  name: string;
  description: string;
  status: 'planning' | 'active' | 'completed' | 'paused' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  progress: number;
  startDate: string;
  endDate: string;
  manager: ProjectMember;
  members: ProjectMember[];
  tasks: ProjectTask[];
  budget?: number;
  spent?: number;
  category: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

interface ProjectManagementProps {
  currentUser: {
    id: string;
    name: string;
    email: string;
  };
}

export default function ProjectManagement({ currentUser }: ProjectManagementProps) {
  // 状态管理
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [selectedProject, setSelectedProject] = useState<ProjectItem | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedPriority, setSelectedPriority] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'kanban' | ''>('');

  // 表单状态
  const [projectForm, setProjectForm] = useState({
    name: '',
    description: '',
    status: '' as any,
    priority: '' as any,
    startDate: '',
    endDate: '',
    category: '',
    budget: '',
    tags: ''
  });

  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    status: '' as any,
    priority: '' as any,
    dueDate: '',
    estimatedHours: '',
    assigneeId: ''
  });

  // 可用用户列表（模拟数据）
  const availableUsers: ProjectMember[] = [
    { id: 'user-1', name: '张三', role: '项目经理', email: 'zhangsan@example.com' },
    { id: 'user-2', name: '李四', role: '前端开发', email: 'lisi@example.com' },
    { id: 'user-3', name: '王五', role: '后端开发', email: 'wangwu@example.com' },
    { id: 'user-4', name: '赵六', role: 'UI设计师', email: 'zhaoliu@example.com' },
    { id: 'user-5', name: '钱七', role: '测试工程师', email: 'qianqi@example.com' }
  ];

  // 初始化数据
  useEffect(() => {
    loadProjects();
  }, []);

  // 加载项目数据
  const loadProjects = () => {
    // 模拟从API加载数据
    const mockProjects: ProjectItem[] = [
      {
        id: 'dev-roadmap-project',
        name: 'SkillUp Platform 开发路线图',
        description: '技能提升平台的完整开发计划，包含所有功能模块的开发任务和时间安排',
        status: 'active',
        priority: 'high',
        progress: 25,
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        manager: availableUsers[0],
        members: availableUsers.slice(0, 4),
        tasks: [
          {
            id: 'task-1',
            title: '创建开发路线图文档',
            description: '整理项目状态和开发计划，创建详细的开发路线图文档',
            status: 'completed',
            priority: 'high',
            assignee: availableUsers[0],
            dueDate: new Date().toISOString().split('T')[0],
            estimatedHours: 4,
            actualHours: 3,
            tags: ['文档', '规划']
          },
          {
            id: 'task-2',
            title: '开发OA项目管理功能',
            description: '实现完整的项目管理功能，包括项目创建、任务分配、进度跟踪',
            status: 'in_progress',
            priority: 'high',
            assignee: availableUsers[1],
            dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            estimatedHours: 16,
            actualHours: 8,
            tags: ['开发', 'OA', '项目管理']
          },
          {
            id: 'task-3',
            title: '实现任务分配和跟踪',
            description: '开发任务分配、状态更新、进度跟踪等核心功能',
            status: 'todo',
            priority: 'medium',
            assignee: availableUsers[2],
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            estimatedHours: 12,
            tags: ['开发', '任务管理']
          },
          {
            id: 'task-4',
            title: '用户权限系统完善',
            description: '完善用户权限管理，支持角色分配和权限控制',
            status: 'todo',
            priority: 'medium',
            assignee: availableUsers[3],
            dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            estimatedHours: 20,
            tags: ['开发', '权限', '用户管理']
          }
        ],
        budget: 100000,
        spent: 25000,
        category: '产品开发',
        tags: ['Web开发', 'React', 'TypeScript', '项目管理'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];
    
    setProjects(mockProjects);
  };

  // 计算项目进度
  const calculateProjectProgress = (tasks: ProjectTask[]) => {
    if (tasks.length === 0) return 0;
    const completedTasks = tasks.filter(task => task.status === 'completed').length;
    return Math.round((completedTasks / tasks.length) * 100);
  };

  // 获取状态信息
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'planning':
        return { color: 'bg-blue-100 text-blue-800', icon: <Clock className="w-4 h-4" />, label: '规划中' };
      case 'active':
        return { color: 'bg-green-100 text-green-800', icon: <TrendingUp className="w-4 h-4" />, label: '进行中' };
      case 'completed':
        return { color: 'bg-gray-100 text-gray-800', icon: <CheckCircle className="w-4 h-4" />, label: '已完成' };
      case 'paused':
        return { color: 'bg-yellow-100 text-yellow-800', icon: <AlertCircle className="w-4 h-4" />, label: '暂停' };
      case 'cancelled':
        return { color: 'bg-red-100 text-red-800', icon: <XCircle className="w-4 h-4" />, label: '已取消' };
      default:
        return { color: 'bg-gray-100 text-gray-800', icon: <Clock className="w-4 h-4" />, label: '未知' };
    }
  };

  // 获取任务状态信息
  const getTaskStatusInfo = (status: string) => {
    switch (status) {
      case 'todo':
        return { color: 'bg-gray-100 text-gray-800', label: '待办' };
      case 'in_progress':
        return { color: 'bg-blue-100 text-blue-800', label: '进行中' };
      case 'completed':
        return { color: 'bg-green-100 text-green-800', label: '已完成' };
      case 'blocked':
        return { color: 'bg-red-100 text-red-800', label: '阻塞' };
      default:
        return { color: 'bg-gray-100 text-gray-800', label: '未知' };
    }
  };

  // 获取优先级颜色
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  // 获取状态中文标签
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'planning': return '规划中';
      case 'active': return '进行中';
      case 'completed': return '已完成';
      case 'paused': return '暂停';
      case 'cancelled': return '已取消';
      default: return status;
    }
  };

  // 获取优先级中文标签
  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'urgent': return '紧急';
      case 'high': return '高';
      case 'medium': return '中';
      case 'low': return '低';
      default: return priority;
    }
  };

  // 获取任务状态中文标签
  const getTaskStatusLabel = (status: string) => {
    switch (status) {
      case 'todo': return '待办';
      case 'in_progress': return '进行中';
      case 'completed': return '已完成';
      case 'blocked': return '阻塞';
      default: return status;
    }
  };

  // 获取视图模式中文标签
  const getViewModeLabel = (mode: string) => {
    switch (mode) {
      case 'grid': return '网格视图';
      case 'list': return '列表视图';
      case 'kanban': return '看板视图';
      default: return mode;
    }
  };

  // 创建项目
  const handleCreateProject = () => {
    if (!projectForm.name.trim()) {
      toast.error('请输入项目名称');
      return;
    }

    const newProject: ProjectItem = {
      id: `project-${Date.now()}`,
      name: projectForm.name,
      description: projectForm.description,
      status: projectForm.status,
      priority: projectForm.priority,
      progress: 0,
      startDate: projectForm.startDate,
      endDate: projectForm.endDate,
      manager: availableUsers.find(u => u.id === currentUser.id) || availableUsers[0],
      members: [availableUsers.find(u => u.id === currentUser.id) || availableUsers[0]],
      tasks: [],
      budget: projectForm.budget ? parseFloat(projectForm.budget) : undefined,
      spent: 0,
      category: projectForm.category,
      tags: projectForm.tags.split(',').map(tag => tag.trim()).filter(Boolean),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setProjects(prev => [...prev, newProject]);
    setIsCreateDialogOpen(false);
    setProjectForm({
      name: '',
      description: '',
      status: 'planning',
      priority: 'medium',
      startDate: '',
      endDate: '',
      category: '',
      budget: '',
      tags: ''
    });
    toast.success('项目创建成功');
  };

  // 创建任务
  const handleCreateTask = () => {
    if (!selectedProject || !taskForm.title.trim()) {
      toast.error('请输入任务标题');
      return;
    }

    const newTask: ProjectTask = {
      id: `task-${Date.now()}`,
      title: taskForm.title,
      description: taskForm.description,
      status: taskForm.status,
      priority: taskForm.priority,
      assignee: availableUsers.find(u => u.id === taskForm.assigneeId),
      dueDate: taskForm.dueDate,
      estimatedHours: taskForm.estimatedHours ? parseFloat(taskForm.estimatedHours) : undefined,
      actualHours: 0,
      tags: []
    };

    setProjects(prev => prev.map(project => {
      if (project.id === selectedProject.id) {
        const updatedTasks = [...project.tasks, newTask];
        return {
          ...project,
          tasks: updatedTasks,
          progress: calculateProjectProgress(updatedTasks),
          updatedAt: new Date().toISOString()
        };
      }
      return project;
    }));

    setIsTaskDialogOpen(false);
    setTaskForm({
      title: '',
      description: '',
      status: 'todo',
      priority: 'medium',
      dueDate: '',
      estimatedHours: '',
      assigneeId: ''
    });
    toast.success('任务创建成功');
  };

  // 更新任务状态
  const handleUpdateTaskStatus = (projectId: string, taskId: string, newStatus: ProjectTask['status']) => {
    setProjects(prev => prev.map(project => {
      if (project.id === projectId) {
        const updatedTasks = project.tasks.map(task => 
          task.id === taskId ? { ...task, status: newStatus } : task
        );
        return {
          ...project,
          tasks: updatedTasks,
          progress: calculateProjectProgress(updatedTasks),
          updatedAt: new Date().toISOString()
        };
      }
      return project;
    }));
    toast.success('任务状态已更新');
  };

  // 更新项目
  const handleUpdateProject = () => {
    if (!selectedProject || !projectForm.name.trim()) {
      toast.error('请输入项目名称');
      return;
    }

    // 验证日期
    if (projectForm.startDate && projectForm.endDate && projectForm.startDate > projectForm.endDate) {
      toast.error('开始日期不能晚于结束日期');
      return;
    }

    // 更新项目数据
    const updatedProject: ProjectItem = {
      ...selectedProject,
      name: projectForm.name,
      description: projectForm.description,
      status: projectForm.status as ProjectItem['status'],
      priority: projectForm.priority as ProjectItem['priority'],
      startDate: projectForm.startDate,
      endDate: projectForm.endDate,
      category: projectForm.category,
      budget: projectForm.budget ? parseFloat(projectForm.budget) : undefined,
      tags: projectForm.tags ? projectForm.tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [],
      updatedAt: new Date().toISOString()
    };

    // 更新项目列表
    setProjects(prev => prev.map(project => 
      project.id === selectedProject.id ? updatedProject : project
    ));

    // 重置表单和关闭对话框
    setProjectForm({
      name: '',
      description: '',
      status: '',
      priority: '',
      startDate: '',
      endDate: '',
      category: '',
      budget: '',
      tags: ''
    });
    setSelectedProject(null);
    setIsEditDialogOpen(false);
    
    toast.success('项目更新成功');
  };

  // 查看项目详情
  const handleViewProject = (project: ProjectItem) => {
    setSelectedProject(project);
    setIsViewDialogOpen(true);
  };

  // 编辑项目
  const handleEditProject = (project: ProjectItem) => {
    setSelectedProject(project);
    // 填充表单数据
    setProjectForm({
      name: project.name,
      description: project.description,
      status: project.status,
      priority: project.priority,
      startDate: project.startDate,
      endDate: project.endDate,
      category: project.category,
      budget: project.budget?.toString() || '',
      tags: project.tags.join(', ')
    });
    setIsEditDialogOpen(true);
    toast.success(`正在编辑项目: ${project.name}`);
  };

  // 过滤项目
  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         project.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = !selectedStatus || project.status === selectedStatus;
    const matchesPriority = !selectedPriority || project.priority === selectedPriority;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      <div className="container mx-auto p-6">
        {/* 页面标题 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">项目管理</h1>
            <p className="text-gray-600 mt-1">管理和跟踪所有项目进度</p>
          </div>
          
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            新建项目
          </Button>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FolderOpen className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">总项目数</p>
                  <p className="text-2xl font-bold text-gray-900">{projects.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">进行中</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {projects.filter(p => p.status === 'active').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">已完成</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {projects.filter(p => p.status === 'completed').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <ListTodo className="w-6 h-6 text-orange-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">总任务数</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {projects.reduce((sum, p) => sum + p.tasks.length, 0)}
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* 搜索框 */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="搜索项目名称..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* 状态筛选 */}
              <Select value={selectedStatus || undefined} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="所有状态" getDisplayText={getStatusLabel} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">所有状态</SelectItem>
                  <SelectItem value="planning">规划中</SelectItem>
                  <SelectItem value="active">进行中</SelectItem>
                  <SelectItem value="completed">已完成</SelectItem>
                  <SelectItem value="paused">暂停</SelectItem>
                  <SelectItem value="cancelled">已取消</SelectItem>
                </SelectContent>
              </Select>

              {/* 优先级筛选 */}
              <Select value={selectedPriority || undefined} onValueChange={setSelectedPriority}>
                <SelectTrigger>
                  <SelectValue placeholder="所有优先级" getDisplayText={getPriorityLabel} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">所有优先级</SelectItem>
                  <SelectItem value="urgent">紧急</SelectItem>
                  <SelectItem value="high">高</SelectItem>
                  <SelectItem value="medium">中</SelectItem>
                  <SelectItem value="low">低</SelectItem>
                </SelectContent>
              </Select>

              {/* 视图模式 */}
              <Select value={viewMode || undefined} onValueChange={(value: 'grid' | 'list' | 'kanban') => setViewMode(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="选择视图" getDisplayText={getViewModeLabel} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="grid">网格视图</SelectItem>
                  <SelectItem value="list">列表视图</SelectItem>
                  <SelectItem value="kanban">看板视图</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="mt-4 text-sm text-gray-600">
              共找到 {filteredProjects.length} 个项目
            </div>
          </CardContent>
        </Card>

        {/* 项目列表 */}
        {filteredProjects.length > 0 ? (
          <div>
            {/* 网格视图 */}
            {(viewMode || 'grid') === 'grid' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredProjects.map((project) => {
                  const statusInfo = getStatusInfo(project.status);
                  
                  return (
                    <Card key={project.id} className="hover:shadow-lg transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <h3 className="font-semibold text-lg text-gray-900 truncate">
                                {project.name}
                              </h3>
                              <div className={`w-3 h-3 rounded-full ${getPriorityColor(project.priority)}`} />
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge className={statusInfo.color}>
                                {statusInfo.icon}
                                <span className="ml-1">{statusInfo.label}</span>
                              </Badge>
                              <Badge variant="outline">{project.category}</Badge>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-1">
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              onClick={() => {
                                setSelectedProject(project);
                                setIsTaskDialogOpen(true);
                              }}
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => handleViewProject(project)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => handleEditProject(project)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      
                      <CardContent>
                        <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                          {project.description}
                        </p>
                        
                        {/* 进度条 */}
                        <div className="mb-4">
                          <div className="flex justify-between text-sm mb-1">
                            <span>进度</span>
                            <span>{project.progress}%</span>
                          </div>
                          <Progress value={project.progress} className="h-2" />
                        </div>
                        
                        {/* 任务统计 */}
                        <div className="mb-4">
                          <div className="text-sm text-gray-600 mb-2">任务状态</div>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="flex justify-between">
                              <span>待办:</span>
                              <span>{project.tasks.filter(t => t.status === 'todo').length}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>进行中:</span>
                              <span>{project.tasks.filter(t => t.status === 'in_progress').length}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>已完成:</span>
                              <span>{project.tasks.filter(t => t.status === 'completed').length}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>阻塞:</span>
                              <span>{project.tasks.filter(t => t.status === 'blocked').length}</span>
                            </div>
                          </div>
                        </div>
                        
                        {/* 任务列表 */}
                        {project.tasks.length > 0 && (
                          <div className="mb-4">
                            <div className="text-sm text-gray-600 mb-2">最近任务</div>
                            <div className="space-y-2">
                              {project.tasks.slice(0, 3).map((task) => {
                                const taskStatusInfo = getTaskStatusInfo(task.status);
                                return (
                                  <div key={task.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                    <div className="flex-1">
                                      <div className="text-sm font-medium truncate">{task.title}</div>
                                      <div className="flex items-center space-x-2 mt-1">
                                        <Badge className={taskStatusInfo.color} variant="secondary">
                                          {taskStatusInfo.label}
                                        </Badge>
                                        {task.assignee && (
                                          <span className="text-xs text-gray-500">{task.assignee.name}</span>
                                        )}
                                      </div>
                                    </div>
                                    <Select 
                                      value={task.status} 
                                      onValueChange={(value: ProjectTask['status']) => 
                                        handleUpdateTaskStatus(project.id, task.id, value)
                                      }
                                    >
                                      <SelectTrigger className="w-24 h-8">
                                        <SelectValue placeholder="状态" getDisplayText={getTaskStatusLabel} />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="todo">待办</SelectItem>
                                        <SelectItem value="in_progress">进行中</SelectItem>
                                        <SelectItem value="completed">已完成</SelectItem>
                                        <SelectItem value="blocked">阻塞</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                );
                              })}
                              {project.tasks.length > 3 && (
                                <div className="text-xs text-gray-500 text-center">
                                  还有 {project.tasks.length - 3} 个任务...
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {/* 团队成员 */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Users className="w-4 h-4 text-gray-400" />
                            <div className="flex -space-x-2">
                              {project.members.slice(0, 3).map((member) => (
                                <Avatar key={member.id} className="w-6 h-6 border-2 border-white">
                                  <AvatarImage src={member.avatar} />
                                  <AvatarFallback className="text-xs">
                                    {member.name.charAt(0)}
                                  </AvatarFallback>
                                </Avatar>
                              ))}
                              {project.members.length > 3 && (
                                <div className="w-6 h-6 bg-gray-100 border-2 border-white rounded-full flex items-center justify-center">
                                  <span className="text-xs text-gray-600">+{project.members.length - 3}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex flex-wrap gap-1">
                            {project.tags.slice(0, 2).map((tag) => (
                              <Badge key={tag} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                            {project.tags.length > 2 && (
                              <Badge variant="secondary" className="text-xs">
                                +{project.tags.length - 2}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* 列表视图 */}
            {viewMode === 'list' && (
              <div className="space-y-4">
                {filteredProjects.map((project) => {
                  const statusInfo = getStatusInfo(project.status);
                  
                  return (
                    <Card key={project.id} className="hover:shadow-lg transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4 flex-1">
                            <div className={`w-4 h-4 rounded-full ${getPriorityColor(project.priority)}`} />
                            <div className="flex-1">
                              <h3 className="font-semibold text-lg text-gray-900">{project.name}</h3>
                              <p className="text-sm text-gray-600 mt-1">{project.description}</p>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge className={statusInfo.color}>
                                {statusInfo.icon}
                                <span className="ml-1">{statusInfo.label}</span>
                              </Badge>
                              <Badge variant="outline">{project.category}</Badge>
                            </div>
                            <div className="w-32">
                              <div className="flex justify-between text-sm mb-1">
                                <span>进度</span>
                                <span>{project.progress}%</span>
                              </div>
                              <Progress value={project.progress} className="h-2" />
                            </div>
                            <div className="flex items-center space-x-2">
                              <Users className="w-4 h-4 text-gray-400" />
                              <div className="flex -space-x-2">
                                {project.members.slice(0, 3).map((member) => (
                                  <Avatar key={member.id} className="w-6 h-6 border-2 border-white">
                                    <AvatarImage src={member.avatar} />
                                    <AvatarFallback className="text-xs">
                                      {member.name.charAt(0)}
                                    </AvatarFallback>
                                  </Avatar>
                                ))}
                                {project.members.length > 3 && (
                                  <div className="w-6 h-6 bg-gray-100 border-2 border-white rounded-full flex items-center justify-center">
                                    <span className="text-xs text-gray-600">+{project.members.length - 3}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-1">
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              onClick={() => {
                                setSelectedProject(project);
                                setIsTaskDialogOpen(true);
                              }}
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => handleViewProject(project)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => handleEditProject(project)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* 看板视图 */}
            {viewMode === 'kanban' && (
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
                {['planning', 'active', 'paused', 'completed', 'cancelled'].map((status) => {
                  const statusProjects = filteredProjects.filter(p => p.status === status);
                  const statusInfo = getStatusInfo(status as any);
                  
                  return (
                    <div key={status} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-4">
                        <Badge className={statusInfo.color}>
                          {statusInfo.icon}
                          <span className="ml-1">{statusInfo.label}</span>
                        </Badge>
                        <span className="text-sm text-gray-500">({statusProjects.length})</span>
                      </div>
                      
                      <div className="space-y-3">
                        {statusProjects.map((project) => (
                          <Card key={project.id} className="hover:shadow-md transition-shadow cursor-pointer">
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between mb-2">
                                <h4 className="font-medium text-sm text-gray-900 truncate flex-1">
                                  {project.name}
                                </h4>
                                <div className={`w-2 h-2 rounded-full ${getPriorityColor(project.priority)} ml-2`} />
                              </div>
                              
                              <p className="text-xs text-gray-600 mb-3 line-clamp-2">
                                {project.description}
                              </p>
                              
                              <div className="mb-3">
                                <div className="flex justify-between text-xs mb-1">
                                  <span>进度</span>
                                  <span>{project.progress}%</span>
                                </div>
                                <Progress value={project.progress} className="h-1" />
                              </div>
                              
                              <div className="flex items-center justify-between">
                                <div className="flex -space-x-1">
                                  {project.members.slice(0, 2).map((member) => (
                                    <Avatar key={member.id} className="w-5 h-5 border border-white">
                                      <AvatarImage src={member.avatar} />
                                      <AvatarFallback className="text-xs">
                                        {member.name.charAt(0)}
                                      </AvatarFallback>
                                    </Avatar>
                                  ))}
                                  {project.members.length > 2 && (
                                    <div className="w-5 h-5 bg-gray-100 border border-white rounded-full flex items-center justify-center">
                                      <span className="text-xs text-gray-600">+{project.members.length - 2}</span>
                                    </div>
                                  )}
                                </div>
                                
                                <div className="flex items-center space-x-1">
                                  <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    className="h-6 w-6 p-0"
                                    onClick={() => {
                                      setSelectedProject(project);
                                      setIsTaskDialogOpen(true);
                                    }}
                                  >
                                    <Plus className="w-3 h-3" />
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    className="h-6 w-6 p-0"
                                    onClick={() => handleViewProject(project)}
                                  >
                                    <Eye className="w-3 h-3" />
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    className="h-6 w-6 p-0"
                                    onClick={() => handleEditProject(project)}
                                  >
                                    <Edit className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <FolderOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">暂无项目</h3>
              <p className="text-gray-600 mb-6">还没有创建任何项目</p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                创建第一个项目
              </Button>
            </CardContent>
          </Card>
        )}

        {/* 创建项目对话框 */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>创建新项目</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">项目名称</Label>
                <Input
                  id="name"
                  value={projectForm.name}
                  onChange={(e) => setProjectForm(prev => ({ ...prev, name: e.target.value }))}
                  className="col-span-3"
                  placeholder="输入项目名称"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="description" className="text-right">项目描述</Label>
                <Textarea
                  id="description"
                  value={projectForm.description}
                  onChange={(e) => setProjectForm(prev => ({ ...prev, description: e.target.value }))}
                  className="col-span-3"
                  placeholder="输入项目描述"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="status" className="text-right">项目状态</Label>
                <Select value={projectForm.status || undefined} onValueChange={(value: any) => setProjectForm(prev => ({ ...prev, status: value }))}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="选择项目状态" getDisplayText={getStatusLabel} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planning">规划中</SelectItem>
                    <SelectItem value="active">进行中</SelectItem>
                    <SelectItem value="paused">暂停</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="priority" className="text-right">优先级</Label>
                <Select value={projectForm.priority || undefined} onValueChange={(value: any) => setProjectForm(prev => ({ ...prev, priority: value }))}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="选择优先级" getDisplayText={getPriorityLabel} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">低</SelectItem>
                    <SelectItem value="medium">中</SelectItem>
                    <SelectItem value="high">高</SelectItem>
                    <SelectItem value="urgent">紧急</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="startDate" className="text-right">开始日期</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={projectForm.startDate}
                  onChange={(e) => setProjectForm(prev => ({ ...prev, startDate: e.target.value }))}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="endDate" className="text-right">结束日期</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={projectForm.endDate}
                  onChange={(e) => setProjectForm(prev => ({ ...prev, endDate: e.target.value }))}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="category" className="text-right">项目分类</Label>
                <Input
                  id="category"
                  value={projectForm.category}
                  onChange={(e) => setProjectForm(prev => ({ ...prev, category: e.target.value }))}
                  className="col-span-3"
                  placeholder="如：产品开发、系统维护等"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="budget" className="text-right">预算</Label>
                <Input
                  id="budget"
                  type="number"
                  value={projectForm.budget}
                  onChange={(e) => setProjectForm(prev => ({ ...prev, budget: e.target.value }))}
                  className="col-span-3"
                  placeholder="项目预算（元）"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="tags" className="text-right">标签</Label>
                <Input
                  id="tags"
                  value={projectForm.tags}
                  onChange={(e) => setProjectForm(prev => ({ ...prev, tags: e.target.value }))}
                  className="col-span-3"
                  placeholder="用逗号分隔多个标签"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleCreateProject}>
                <Save className="w-4 h-4 mr-2" />
                创建项目
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* 创建任务对话框 */}
        <Dialog open={isTaskDialogOpen} onOpenChange={setIsTaskDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>创建新任务</DialogTitle>
              {selectedProject && (
                <p className="text-sm text-gray-600">项目: {selectedProject.name}</p>
              )}
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="taskTitle" className="text-right">任务标题</Label>
                <Input
                  id="taskTitle"
                  value={taskForm.title}
                  onChange={(e) => setTaskForm(prev => ({ ...prev, title: e.target.value }))}
                  className="col-span-3"
                  placeholder="输入任务标题"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="taskDescription" className="text-right">任务描述</Label>
                <Textarea
                  id="taskDescription"
                  value={taskForm.description}
                  onChange={(e) => setTaskForm(prev => ({ ...prev, description: e.target.value }))}
                  className="col-span-3"
                  placeholder="输入任务描述"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="taskStatus" className="text-right">任务状态</Label>
                <Select value={taskForm.status || undefined} onValueChange={(value: any) => setTaskForm(prev => ({ ...prev, status: value }))}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="选择任务状态" getDisplayText={getTaskStatusLabel} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todo">待办</SelectItem>
                    <SelectItem value="in_progress">进行中</SelectItem>
                    <SelectItem value="completed">已完成</SelectItem>
                    <SelectItem value="blocked">阻塞</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="taskPriority" className="text-right">优先级</Label>
                <Select value={taskForm.priority || undefined} onValueChange={(value: any) => setTaskForm(prev => ({ ...prev, priority: value }))}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="选择优先级" getDisplayText={getPriorityLabel} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">低</SelectItem>
                    <SelectItem value="medium">中</SelectItem>
                    <SelectItem value="high">高</SelectItem>
                    <SelectItem value="urgent">紧急</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="taskAssignee" className="text-right">分配给</Label>
                <Select value={taskForm.assigneeId || undefined} onValueChange={(value) => setTaskForm(prev => ({ ...prev, assigneeId: value }))}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="选择负责人" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableUsers.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name} - {user.role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="taskDueDate" className="text-right">截止日期</Label>
                <Input
                  id="taskDueDate"
                  type="date"
                  value={taskForm.dueDate}
                  onChange={(e) => setTaskForm(prev => ({ ...prev, dueDate: e.target.value }))}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="taskEstimatedHours" className="text-right">预估工时</Label>
                <Input
                  id="taskEstimatedHours"
                  type="number"
                  value={taskForm.estimatedHours}
                  onChange={(e) => setTaskForm(prev => ({ ...prev, estimatedHours: e.target.value }))}
                  className="col-span-3"
                  placeholder="预估工时（小时）"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsTaskDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleCreateTask}>
                <Save className="w-4 h-4 mr-2" />
                创建任务
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* 项目详情查看对话框 */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>项目详情</DialogTitle>
            </DialogHeader>
            {selectedProject && (
              <div className="space-y-6">
                {/* 基本信息 */}
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-700">项目名称</Label>
                      <p className="mt-1 text-sm text-gray-900">{selectedProject.name}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-700">项目描述</Label>
                      <p className="mt-1 text-sm text-gray-900">{selectedProject.description}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-700">项目分类</Label>
                      <p className="mt-1 text-sm text-gray-900">{selectedProject.category}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-700">项目标签</Label>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {selectedProject.tags.map((tag, index) => (
                          <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-700">项目状态</Label>
                      <div className="mt-1">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${getStatusInfo(selectedProject.status).color}`}>
                          {getStatusInfo(selectedProject.status).icon}
                          <span className="ml-1">{getStatusInfo(selectedProject.status).label}</span>
                        </span>
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-700">优先级</Label>
                      <div className="mt-1 flex items-center">
                        <div className={`w-3 h-3 rounded-full ${getPriorityColor(selectedProject.priority)} mr-2`} />
                        <span className="text-sm text-gray-900">{getPriorityLabel(selectedProject.priority)}</span>
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-700">项目进度</Label>
                      <div className="mt-1">
                        <div className="flex justify-between text-sm mb-1">
                          <span>完成度</span>
                          <span>{selectedProject.progress}%</span>
                        </div>
                        <Progress value={selectedProject.progress} className="h-2" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium text-gray-700">开始日期</Label>
                        <p className="mt-1 text-sm text-gray-900">{selectedProject.startDate}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-700">结束日期</Label>
                        <p className="mt-1 text-sm text-gray-900">{selectedProject.endDate}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 预算信息 */}
                {selectedProject.budget && (
                  <div className="border-t pt-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">预算信息</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label className="text-sm font-medium text-gray-700">总预算</Label>
                        <p className="mt-1 text-sm text-gray-900">¥{selectedProject.budget?.toLocaleString()}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-700">已花费</Label>
                        <p className="mt-1 text-sm text-gray-900">¥{selectedProject.spent?.toLocaleString() || 0}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-700">剩余预算</Label>
                        <p className="mt-1 text-sm text-gray-900">¥{((selectedProject.budget || 0) - (selectedProject.spent || 0)).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* 团队成员 */}
                <div className="border-t pt-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">团队成员</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-700">项目经理</Label>
                      <div className="mt-2 flex items-center">
                        <Avatar className="w-8 h-8 mr-3">
                          <AvatarFallback>{selectedProject.manager.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{selectedProject.manager.name}</p>
                          <p className="text-xs text-gray-600">{selectedProject.manager.role}</p>
                        </div>
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-700">团队成员 ({selectedProject.members.length}人)</Label>
                      <div className="mt-2 space-y-2">
                        {selectedProject.members.map((member) => (
                          <div key={member.id} className="flex items-center">
                            <Avatar className="w-6 h-6 mr-2">
                              <AvatarFallback className="text-xs">{member.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-xs font-medium text-gray-900">{member.name}</p>
                              <p className="text-xs text-gray-600">{member.role}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 任务列表 */}
                <div className="border-t pt-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">任务列表 ({selectedProject.tasks.length}个任务)</h3>
                  <div className="space-y-3">
                    {selectedProject.tasks.map((task) => (
                      <div key={task.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <h4 className="font-medium text-gray-900">{task.title}</h4>
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${getTaskStatusInfo(task.status).color}`}>
                                {getTaskStatusInfo(task.status).label}
                              </span>
                              <div className={`w-2 h-2 rounded-full ${getPriorityColor(task.priority)}`} />
                            </div>
                            <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                            <div className="flex items-center space-x-4 text-xs text-gray-500">
                              <span>负责人: {task.assignee.name}</span>
                              <span>截止: {task.dueDate}</span>
                              <span>预估: {task.estimatedHours}h</span>
                              {task.actualHours && <span>实际: {task.actualHours}h</span>}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div className="flex justify-end space-x-2 mt-6">
              <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                关闭
              </Button>
              <Button onClick={() => {
                setIsViewDialogOpen(false);
                if (selectedProject) {
                  handleEditProject(selectedProject);
                }
              }}>
                <Edit className="w-4 h-4 mr-2" />
                编辑项目
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* 编辑项目对话框 */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>编辑项目</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="editName" className="text-right">项目名称</Label>
                <Input
                  id="editName"
                  value={projectForm.name}
                  onChange={(e) => setProjectForm(prev => ({ ...prev, name: e.target.value }))}
                  className="col-span-3"
                  placeholder="输入项目名称"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="editDescription" className="text-right">项目描述</Label>
                <Textarea
                  id="editDescription"
                  value={projectForm.description}
                  onChange={(e) => setProjectForm(prev => ({ ...prev, description: e.target.value }))}
                  className="col-span-3"
                  placeholder="输入项目描述"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="editStatus" className="text-right">项目状态</Label>
                <Select value={projectForm.status || undefined} onValueChange={(value: any) => setProjectForm(prev => ({ ...prev, status: value }))}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="选择项目状态" getDisplayText={getStatusLabel} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planning">规划中</SelectItem>
                    <SelectItem value="active">进行中</SelectItem>
                    <SelectItem value="paused">暂停</SelectItem>
                    <SelectItem value="completed">已完成</SelectItem>
                    <SelectItem value="cancelled">已取消</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="editPriority" className="text-right">优先级</Label>
                <Select value={projectForm.priority || undefined} onValueChange={(value: any) => setProjectForm(prev => ({ ...prev, priority: value }))}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="选择优先级" getDisplayText={getPriorityLabel} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">低</SelectItem>
                    <SelectItem value="medium">中</SelectItem>
                    <SelectItem value="high">高</SelectItem>
                    <SelectItem value="urgent">紧急</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="editStartDate" className="text-right">开始日期</Label>
                <Input
                  id="editStartDate"
                  type="date"
                  value={projectForm.startDate}
                  onChange={(e) => setProjectForm(prev => ({ ...prev, startDate: e.target.value }))}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="editEndDate" className="text-right">结束日期</Label>
                <Input
                  id="editEndDate"
                  type="date"
                  value={projectForm.endDate}
                  onChange={(e) => setProjectForm(prev => ({ ...prev, endDate: e.target.value }))}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="editCategory" className="text-right">项目分类</Label>
                <Input
                  id="editCategory"
                  value={projectForm.category}
                  onChange={(e) => setProjectForm(prev => ({ ...prev, category: e.target.value }))}
                  className="col-span-3"
                  placeholder="如：产品开发、系统维护等"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="editBudget" className="text-right">预算</Label>
                <Input
                  id="editBudget"
                  type="number"
                  value={projectForm.budget}
                  onChange={(e) => setProjectForm(prev => ({ ...prev, budget: e.target.value }))}
                  className="col-span-3"
                  placeholder="项目预算（元）"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="editTags" className="text-right">标签</Label>
                <Input
                  id="editTags"
                  value={projectForm.tags}
                  onChange={(e) => setProjectForm(prev => ({ ...prev, tags: e.target.value }))}
                  className="col-span-3"
                  placeholder="用逗号分隔多个标签"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleUpdateProject}>
                <Save className="w-4 h-4 mr-2" />
                保存更改
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}