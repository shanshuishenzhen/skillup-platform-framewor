/**
 * 简化的任务管理组件 - 演示版本
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { 
  Plus, 
  Search, 
  Filter,
  Calendar,
  User,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  Play,
  Pause,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  Flag,
  Target,
  Users,
  FileText,
  MessageSquare
} from 'lucide-react';
import { toast } from 'sonner';

// 类型定义
interface TaskAssignee {
  id: string;
  name: string;
  avatar?: string;
  role?: string;
}

interface TaskItem {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in-progress' | 'review' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignee: TaskAssignee;
  reporter: TaskAssignee;
  dueDate: string;
  createdAt: string;
  updatedAt: string;
  projectId?: string;
  projectName?: string;
  category: string;
  tags: string[];
  estimatedHours?: number;
  actualHours?: number;
  progress: number;
  comments: number;
  attachments: number;
}

interface SimpleTaskManagerProps {
  currentUser: {
    id: string;
    name: string;
    email: string;
  };
}

export default function SimpleTaskManager({ currentUser }: SimpleTaskManagerProps) {
  // 状态管理
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedPriority, setSelectedPriority] = useState<string>('');
  const [selectedAssignee, setSelectedAssignee] = useState<string>('');
  const [sortBy, setSortBy] = useState<'dueDate' | 'priority' | 'createdAt' | 'title'>('dueDate');
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('list');

  // 模拟数据
  const mockTasks: TaskItem[] = [
    {
      id: 'task-1',
      title: '用户登录功能开发',
      description: '实现用户登录、注册、密码重置等基础认证功能，包括前端界面和后端API',
      status: 'in-progress',
      priority: 'high',
      assignee: { id: 'user-2', name: '李四', role: '前端开发' },
      reporter: { id: 'user-1', name: '张三', role: '项目经理' },
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
      projectId: 'project-1',
      projectName: '技能提升平台',
      category: '功能开发',
      tags: ['前端', '认证', 'React'],
      estimatedHours: 16,
      actualHours: 12,
      progress: 75,
      comments: 5,
      attachments: 2
    },
    {
      id: 'task-2',
      title: '数据库设计优化',
      description: '优化用户表和权限表的索引，提升查询性能，预计可提升30%的查询速度',
      status: 'review',
      priority: 'medium',
      assignee: { id: 'user-3', name: '王五', role: '后端开发' },
      reporter: { id: 'user-1', name: '张三', role: '项目经理' },
      dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      projectId: 'project-1',
      projectName: '技能提升平台',
      category: '性能优化',
      tags: ['数据库', 'MySQL', '性能'],
      estimatedHours: 8,
      actualHours: 8,
      progress: 100,
      comments: 3,
      attachments: 1
    },
    {
      id: 'task-3',
      title: 'UI界面设计',
      description: '设计用户管理系统的主要界面，包括用户列表、权限配置、角色管理等页面',
      status: 'completed',
      priority: 'medium',
      assignee: { id: 'user-4', name: '赵六', role: 'UI设计师' },
      reporter: { id: 'user-2', name: '李四', role: '技术负责人' },
      dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      projectId: 'project-2',
      projectName: '用户管理系统',
      category: 'UI设计',
      tags: ['设计', 'Figma', 'UI'],
      estimatedHours: 24,
      actualHours: 20,
      progress: 100,
      comments: 8,
      attachments: 5
    },
    {
      id: 'task-4',
      title: '单元测试编写',
      description: '为核心业务逻辑编写单元测试，确保代码质量和系统稳定性',
      status: 'todo',
      priority: 'low',
      assignee: { id: 'user-5', name: '钱七', role: '测试工程师' },
      reporter: { id: 'user-3', name: '王五', role: '后端开发' },
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      projectId: 'project-1',
      projectName: '技能提升平台',
      category: '测试',
      tags: ['测试', 'Jest', '质量保证'],
      estimatedHours: 12,
      actualHours: 0,
      progress: 0,
      comments: 1,
      attachments: 0
    },
    {
      id: 'task-5',
      title: '数据可视化组件开发',
      description: '开发图表展示组件，支持柱状图、折线图、饼图等多种图表类型',
      status: 'in-progress',
      priority: 'urgent',
      assignee: { id: 'user-6', name: '孙八', role: '前端开发' },
      reporter: { id: 'user-3', name: '王五', role: '数据架构师' },
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      projectId: 'project-3',
      projectName: '数据分析工具',
      category: '功能开发',
      tags: ['前端', '图表', 'D3.js'],
      estimatedHours: 20,
      actualHours: 15,
      progress: 60,
      comments: 4,
      attachments: 3
    },
    {
      id: 'task-6',
      title: '安全漏洞修复',
      description: '修复系统中发现的XSS和SQL注入漏洞，提升系统安全性',
      status: 'review',
      priority: 'urgent',
      assignee: { id: 'user-7', name: '周九', role: '安全工程师' },
      reporter: { id: 'user-5', name: '钱七', role: '安全专家' },
      dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
      projectId: 'project-5',
      projectName: '安全审计系统',
      category: '安全修复',
      tags: ['安全', '漏洞修复', 'XSS'],
      estimatedHours: 6,
      actualHours: 5,
      progress: 90,
      comments: 2,
      attachments: 1
    }
  ];

  // 初始化数据
  useEffect(() => {
    setTasks(mockTasks);
  }, []);

  // 获取状态信息
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'todo':
        return { color: 'bg-gray-100 text-gray-800', icon: <Clock className="w-4 h-4" />, label: '待办' };
      case 'in-progress':
        return { color: 'bg-blue-100 text-blue-800', icon: <Play className="w-4 h-4" />, label: '进行中' };
      case 'review':
        return { color: 'bg-yellow-100 text-yellow-800', icon: <Eye className="w-4 h-4" />, label: '待审核' };
      case 'completed':
        return { color: 'bg-green-100 text-green-800', icon: <CheckCircle className="w-4 h-4" />, label: '已完成' };
      case 'cancelled':
        return { color: 'bg-red-100 text-red-800', icon: <XCircle className="w-4 h-4" />, label: '已取消' };
      default:
        return { color: 'bg-gray-100 text-gray-800', icon: <Clock className="w-4 h-4" />, label: '未知' };
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

  // 获取优先级标签
  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'urgent': return '紧急';
      case 'high': return '高';
      case 'medium': return '中';
      case 'low': return '低';
      default: return '未知';
    }
  };

  // 格式化日期
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN');
  };

  // 计算剩余天数
  const getDaysRemaining = (dueDate: string) => {
    const due = new Date(dueDate);
    const now = new Date();
    const diffTime = due.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // 过滤和排序任务
  const filteredTasks = tasks
    .filter(task => {
      const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           task.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = !selectedStatus || task.status === selectedStatus;
      const matchesPriority = !selectedPriority || task.priority === selectedPriority;
      const matchesAssignee = !selectedAssignee || task.assignee.id === selectedAssignee;
      return matchesSearch && matchesStatus && matchesPriority && matchesAssignee;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'title':
          return a.title.localeCompare(b.title);
        case 'priority':
          const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        case 'createdAt':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'dueDate':
        default:
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
    });

  // 获取所有分配者
  const allAssignees = Array.from(new Set(tasks.map(task => task.assignee.id)))
    .map(id => tasks.find(task => task.assignee.id === id)?.assignee)
    .filter(Boolean) as TaskAssignee[];

  // 任务操作
  const handleView = (task: TaskItem) => {
    toast.info(`查看任务: ${task.title}`);
  };

  const handleEdit = (task: TaskItem) => {
    toast.info(`编辑任务: ${task.title}`);
  };

  const handleDelete = (task: TaskItem) => {
    setTasks(prev => prev.filter(t => t.id !== task.id));
    toast.success(`已删除任务: ${task.title}`);
  };

  const handleStatusChange = (task: TaskItem, newStatus: string) => {
    setTasks(prev => prev.map(t => 
      t.id === task.id 
        ? { ...t, status: newStatus as any, updatedAt: new Date().toISOString() }
        : t
    ));
    toast.success(`任务状态已更新为: ${getStatusInfo(newStatus).label}`);
  };

  const handleCreateTask = () => {
    toast.info('创建新任务功能演示');
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      <div className="container mx-auto p-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">任务管理</h1>
          <p className="text-gray-600 mt-1">跟踪和管理所有任务进度</p>
        </div>
        
        <Button onClick={handleCreateTask}>
          <Plus className="w-4 h-4 mr-2" />
          新建任务
        </Button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Target className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">总任务数</p>
                <p className="text-2xl font-bold text-gray-900">{tasks.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Play className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">进行中</p>
                <p className="text-2xl font-bold text-gray-900">
                  {tasks.filter(t => t.status === 'in-progress').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">已完成</p>
                <p className="text-2xl font-bold text-gray-900">
                  {tasks.filter(t => t.status === 'completed').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">逾期任务</p>
                <p className="text-2xl font-bold text-gray-900">
                  {tasks.filter(t => getDaysRemaining(t.dueDate) < 0 && t.status !== 'completed').length}
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
                placeholder="搜索任务标题..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* 状态筛选 */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">所有状态</option>
              <option value="todo">待办</option>
              <option value="in-progress">进行中</option>
              <option value="review">待审核</option>
              <option value="completed">已完成</option>
              <option value="cancelled">已取消</option>
            </select>

            {/* 优先级筛选 */}
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">所有优先级</option>
              <option value="urgent">紧急</option>
              <option value="high">高</option>
              <option value="medium">中</option>
              <option value="low">低</option>
            </select>

            {/* 分配者筛选 */}
            <select
              value={selectedAssignee}
              onChange={(e) => setSelectedAssignee(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">所有分配者</option>
              {allAssignees.map(assignee => (
                <option key={assignee.id} value={assignee.id}>
                  {assignee.name}
                </option>
              ))}
            </select>

            {/* 排序方式 */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="dueDate">截止日期</option>
              <option value="priority">优先级</option>
              <option value="createdAt">创建时间</option>
              <option value="title">任务标题</option>
            </select>
          </div>
          
          <div className="mt-4 text-sm text-gray-600">
            共找到 {filteredTasks.length} 个任务
          </div>
        </CardContent>
      </Card>

      {/* 任务列表 */}
      {filteredTasks.length > 0 ? (
        <div className="space-y-4">
          {filteredTasks.map((task) => {
            const statusInfo = getStatusInfo(task.status);
            const daysRemaining = getDaysRemaining(task.dueDate);
            const isOverdue = daysRemaining < 0 && task.status !== 'completed';
            
            return (
              <Card key={task.id} className={`hover:shadow-md transition-shadow ${isOverdue ? 'border-red-200' : ''}`}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="font-semibold text-lg text-gray-900">
                          {task.title}
                        </h3>
                        <div className={`w-3 h-3 rounded-full ${getPriorityColor(task.priority)}`} />
                        <Badge className={statusInfo.color}>
                          {statusInfo.icon}
                          <span className="ml-1">{statusInfo.label}</span>
                        </Badge>
                        {isOverdue && (
                          <Badge className="bg-red-100 text-red-800">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            逾期
                          </Badge>
                        )}
                      </div>
                      
                      <p className="text-gray-600 mb-4 line-clamp-2">
                        {task.description}
                      </p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        {/* 分配信息 */}
                        <div className="flex items-center space-x-2">
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={task.assignee.avatar} />
                            <AvatarFallback className="text-sm">
                              {task.assignee.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">{task.assignee.name}</p>
                            <p className="text-xs text-gray-500">{task.assignee.role}</p>
                          </div>
                        </div>
                        
                        {/* 时间信息 */}
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <div className="flex items-center space-x-1">
                            <Calendar className="w-4 h-4" />
                            <span>截止: {formatDate(task.dueDate)}</span>
                          </div>
                          <span className={isOverdue ? 'text-red-600 font-medium' : ''}>
                            {daysRemaining > 0 ? `剩余 ${daysRemaining} 天` : 
                             daysRemaining === 0 ? '今天截止' : `逾期 ${Math.abs(daysRemaining)} 天`}
                          </span>
                        </div>
                        
                        {/* 项目信息 */}
                        {task.projectName && (
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline">{task.projectName}</Badge>
                            <Badge variant="secondary">{task.category}</Badge>
                          </div>
                        )}
                      </div>
                      
                      {/* 进度条 */}
                      <div className="mb-4">
                        <div className="flex justify-between text-sm mb-1">
                          <span>进度</span>
                          <span>{task.progress}%</span>
                        </div>
                        <Progress value={task.progress} className="h-2" />
                      </div>
                      
                      {/* 工时和附件信息 */}
                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <div className="flex items-center space-x-4">
                          <span>预估: {task.estimatedHours}h</span>
                          <span>实际: {task.actualHours}h</span>
                          <div className="flex items-center space-x-1">
                            <MessageSquare className="w-4 h-4" />
                            <span>{task.comments}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <FileText className="w-4 h-4" />
                            <span>{task.attachments}</span>
                          </div>
                        </div>
                        
                        <div className="flex flex-wrap gap-1">
                          {task.tags.slice(0, 3).map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {task.tags.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{task.tags.length - 3}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-4">
                      <Button size="sm" variant="ghost" onClick={() => handleView(task)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleEdit(task)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      
                      {/* 状态快速切换 */}
                      {task.status === 'todo' && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleStatusChange(task, 'in-progress')}
                        >
                          开始
                        </Button>
                      )}
                      {task.status === 'in-progress' && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleStatusChange(task, 'review')}
                        >
                          提交审核
                        </Button>
                      )}
                      {task.status === 'review' && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleStatusChange(task, 'completed')}
                        >
                          完成
                        </Button>
                      )}
                      
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(task)}>
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
            <Target className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">暂无任务</h3>
            <p className="text-gray-600 mb-6">还没有创建任何任务</p>
            <Button onClick={handleCreateTask}>
              <Plus className="w-4 h-4 mr-2" />
              创建第一个任务
            </Button>
          </CardContent>
        </Card>
      )}
      </div>
    </div>
  );
}
