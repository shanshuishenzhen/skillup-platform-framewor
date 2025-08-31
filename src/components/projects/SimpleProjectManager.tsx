/**
 * 简化的项目管理组件 - 演示版本
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
  TrendingUp
} from 'lucide-react';
import { toast } from 'sonner';

// 类型定义
interface ProjectMember {
  id: string;
  name: string;
  role: string;
  avatar?: string;
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
  tasksTotal: number;
  tasksCompleted: number;
  budget?: number;
  spent?: number;
  category: string;
  tags: string[];
}

interface SimpleProjectManagerProps {
  currentUser: {
    id: string;
    name: string;
    email: string;
  };
}

export default function SimpleProjectManager({ currentUser }: SimpleProjectManagerProps) {
  // 状态管理
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedPriority, setSelectedPriority] = useState<string>('');
  const [sortBy, setSortBy] = useState<'name' | 'startDate' | 'progress' | 'priority'>('startDate');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // 模拟数据
  const mockProjects: ProjectItem[] = [
    {
      id: 'project-1',
      name: '技能提升平台',
      description: '构建一个综合性的在线学习平台，提供课程管理、学习跟踪、技能评估等功能',
      status: 'active',
      priority: 'high',
      progress: 75,
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
      manager: { id: 'user-1', name: '张三', role: '项目经理' },
      members: [
        { id: 'user-1', name: '张三', role: '项目经理' },
        { id: 'user-2', name: '李四', role: '前端开发' },
        { id: 'user-3', name: '王五', role: '后端开发' },
        { id: 'user-4', name: '赵六', role: 'UI设计师' }
      ],
      tasksTotal: 45,
      tasksCompleted: 34,
      budget: 500000,
      spent: 375000,
      category: '产品开发',
      tags: ['Web开发', 'React', 'Node.js', '教育']
    },
    {
      id: 'project-2',
      name: '用户管理系统',
      description: '企业级用户权限管理系统，支持多租户、角色管理、权限控制等功能',
      status: 'active',
      priority: 'medium',
      progress: 45,
      startDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
      manager: { id: 'user-2', name: '李四', role: '技术负责人' },
      members: [
        { id: 'user-2', name: '李四', role: '技术负责人' },
        { id: 'user-5', name: '钱七', role: '后端开发' },
        { id: 'user-6', name: '孙八', role: '测试工程师' }
      ],
      tasksTotal: 28,
      tasksCompleted: 13,
      budget: 300000,
      spent: 135000,
      category: '系统开发',
      tags: ['权限管理', 'Spring Boot', 'Vue.js']
    },
    {
      id: 'project-3',
      name: '数据分析工具',
      description: '业务数据可视化分析工具，支持多维度数据展示和智能报表生成',
      status: 'planning',
      priority: 'medium',
      progress: 15,
      startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      manager: { id: 'user-3', name: '王五', role: '数据架构师' },
      members: [
        { id: 'user-3', name: '王五', role: '数据架构师' },
        { id: 'user-7', name: '周九', role: '数据分析师' }
      ],
      tasksTotal: 35,
      tasksCompleted: 5,
      budget: 400000,
      spent: 60000,
      category: '数据分析',
      tags: ['数据可视化', 'Python', 'D3.js', 'BI']
    },
    {
      id: 'project-4',
      name: '移动端应用',
      description: '跨平台移动应用开发，提供便捷的移动办公和学习功能',
      status: 'completed',
      priority: 'low',
      progress: 100,
      startDate: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      manager: { id: 'user-4', name: '赵六', role: '移动端负责人' },
      members: [
        { id: 'user-4', name: '赵六', role: '移动端负责人' },
        { id: 'user-8', name: '吴十', role: 'Flutter开发' }
      ],
      tasksTotal: 22,
      tasksCompleted: 22,
      budget: 200000,
      spent: 180000,
      category: '移动开发',
      tags: ['Flutter', '跨平台', '移动应用']
    },
    {
      id: 'project-5',
      name: '安全审计系统',
      description: '企业安全管理和审计系统，提供安全监控、风险评估、合规检查等功能',
      status: 'paused',
      priority: 'urgent',
      progress: 30,
      startDate: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      manager: { id: 'user-5', name: '钱七', role: '安全专家' },
      members: [
        { id: 'user-5', name: '钱七', role: '安全专家' },
        { id: 'user-9', name: '郑十一', role: '安全工程师' }
      ],
      tasksTotal: 40,
      tasksCompleted: 12,
      budget: 600000,
      spent: 180000,
      category: '安全系统',
      tags: ['网络安全', '审计', '合规', 'Java']
    }
  ];

  // 初始化数据
  useEffect(() => {
    setProjects(mockProjects);
  }, []);

  // 获取状态颜色和图标
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

  // 格式化日期
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN');
  };

  // 计算剩余天数
  const getDaysRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // 过滤和排序项目
  const filteredProjects = projects
    .filter(project => {
      const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           project.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = !selectedStatus || project.status === selectedStatus;
      const matchesPriority = !selectedPriority || project.priority === selectedPriority;
      return matchesSearch && matchesStatus && matchesPriority;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'progress':
          return b.progress - a.progress;
        case 'priority':
          const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        case 'startDate':
        default:
          return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
      }
    });

  // 项目操作
  const handleView = (project: ProjectItem) => {
    toast.info(`查看项目: ${project.name}`);
  };

  const handleEdit = (project: ProjectItem) => {
    toast.info(`编辑项目: ${project.name}`);
  };

  const handleDelete = (project: ProjectItem) => {
    setProjects(prev => prev.filter(p => p.id !== project.id));
    toast.success(`已删除项目: ${project.name}`);
  };

  const handleCreateProject = () => {
    toast.info('创建新项目功能演示');
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      <div className="container mx-auto p-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">项目管理</h1>
          <p className="text-gray-600 mt-1">管理和跟踪所有项目进度</p>
        </div>
        
        <Button onClick={handleCreateProject}>
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
                <Target className="w-6 h-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">平均进度</p>
                <p className="text-2xl font-bold text-gray-900">
                  {Math.round(projects.reduce((sum, p) => sum + p.progress, 0) / projects.length)}%
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
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">所有状态</option>
              <option value="planning">规划中</option>
              <option value="active">进行中</option>
              <option value="completed">已完成</option>
              <option value="paused">暂停</option>
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

            {/* 排序方式 */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'name' | 'startDate' | 'progress' | 'priority')}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="startDate">开始时间</option>
              <option value="name">项目名称</option>
              <option value="progress">进度</option>
              <option value="priority">优先级</option>
            </select>
          </div>
          
          <div className="mt-4 text-sm text-gray-600">
            共找到 {filteredProjects.length} 个项目
          </div>
        </CardContent>
      </Card>

      {/* 项目列表 */}
      {filteredProjects.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredProjects.map((project) => {
            const statusInfo = getStatusInfo(project.status);
            const daysRemaining = getDaysRemaining(project.endDate);
            
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
                      <Button size="sm" variant="ghost" onClick={() => handleView(project)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleEdit(project)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(project)}>
                        <Trash2 className="w-4 h-4" />
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
                  <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
                    <span>任务: {project.tasksCompleted}/{project.tasksTotal}</span>
                    <span>
                      {daysRemaining > 0 ? `剩余 ${daysRemaining} 天` : 
                       daysRemaining === 0 ? '今天截止' : `逾期 ${Math.abs(daysRemaining)} 天`}
                    </span>
                  </div>
                  
                  {/* 预算信息 */}
                  {project.budget && (
                    <div className="mb-4">
                      <div className="flex justify-between text-sm mb-1">
                        <span>预算使用</span>
                        <span>¥{project.spent?.toLocaleString()} / ¥{project.budget.toLocaleString()}</span>
                      </div>
                      <Progress 
                        value={(project.spent || 0) / project.budget * 100} 
                        className="h-2" 
                      />
                    </div>
                  )}
                  
                  {/* 团队成员 */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Users className="w-4 h-4 text-gray-400" />
                      <div className="flex -space-x-2">
                        {project.members.slice(0, 3).map((member, index) => (
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
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <FolderOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">暂无项目</h3>
            <p className="text-gray-600 mb-6">还没有创建任何项目</p>
            <Button onClick={handleCreateProject}>
              <Plus className="w-4 h-4 mr-2" />
              创建第一个项目
            </Button>
          </CardContent>
        </Card>
      )}
      </div>
    </div>
  );
}
