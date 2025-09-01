/**
 * 新建任务页面
 * 提供创建新任务的表单界面
 */

'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save, Loader2, Plus } from 'lucide-react';
import { OAProject, OAUser } from '@/types/oa';
import oaApi from '@/services/oa-api';
import { toast } from 'sonner';

/**
 * 新建任务表单组件
 * @returns JSX.Element
 */
function NewTaskForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get('project');
  
  const [projects, setProjects] = useState<OAProject[]>([]);
  const [users, setUsers] = useState<OAUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // 表单状态
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    project: projectId || '',
    assignedTo: '',
    status: 'To Do',
    priority: 'medium',
    dueDate: '',
    estimatedHours: '',
    tags: [] as string[]
  });
  
  const [newTag, setNewTag] = useState('');

  /**
   * 加载项目列表
   */
  const loadProjects = async () => {
    try {
      const result = await oaApi.getProjects();
      if (result.success && result.data) {
        setProjects(result.data);
      }
    } catch (error) {
      console.error('加载项目列表失败:', error);
    }
  };

  /**
   * 加载用户列表
   */
  const loadUsers = async () => {
    try {
      // 注意：这里需要根据实际API调整
      // const result = await oaApi.getUsers();
      // if (result.success && result.data) {
      //   setUsers(result.data);
      // }
      // 临时使用空数组，实际项目中需要实现用户列表API
      setUsers([]);
    } catch (error) {
      console.error('加载用户列表失败:', error);
    }
  };

  /**
   * 处理表单输入变化
   * @param field - 字段名
   * @param value - 字段值
   */
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  /**
   * 添加标签
   */
  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
    }
  };

  /**
   * 删除标签
   * @param tagToRemove - 要删除的标签
   */
  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  /**
   * 处理键盘事件
   * @param e - 键盘事件
   */
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  /**
   * 提交表单
   * @param e - 表单事件
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      toast.error('请输入任务标题');
      return;
    }

    if (!formData.project) {
      toast.error('请选择所属项目');
      return;
    }

    setSaving(true);
    
    try {
      const taskData: any = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        project: formData.project,
        status: formData.status,
        priority: formData.priority,
        tags: formData.tags
      };

      // 处理分配用户
      if (formData.assignedTo) {
        taskData.assignedTo = formData.assignedTo;
      }

      // 处理截止日期
      if (formData.dueDate) {
        taskData.dueDate = new Date(formData.dueDate).toISOString();
      }

      // 处理预估工时
      if (formData.estimatedHours) {
        const hours = parseFloat(formData.estimatedHours);
        if (!isNaN(hours) && hours > 0) {
          taskData.estimatedHours = hours;
        }
      }

      const result = await oaApi.createTask(taskData);
      
      if (result.success) {
        toast.success('任务创建成功');
        if (result.data) {
          router.push(`/oa/tasks/${result.data._id}`);
        } else {
          router.push('/oa/tasks');
        }
      } else {
        toast.error(result.message || '创建任务失败');
      }
    } catch (error) {
      console.error('创建任务失败:', error);
      toast.error('创建任务失败');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        loadProjects(),
        loadUsers()
      ]);
      setLoading(false);
    };
    
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="max-w-2xl mx-auto">
            <div className="h-96 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      {/* 页面标题 */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/oa/tasks">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">新建任务</h1>
          <p className="text-gray-600 mt-1">创建新的项目任务</p>
        </div>
      </div>

      {/* 创建表单 */}
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>任务信息</CardTitle>
            <CardDescription>
              填写任务的基本信息、分配和设置
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 任务标题 */}
              <div className="space-y-2">
                <Label htmlFor="title">任务标题 *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="输入任务标题"
                  required
                />
              </div>

              {/* 任务描述 */}
              <div className="space-y-2">
                <Label htmlFor="description">任务描述</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="描述任务的详细内容和要求"
                  rows={4}
                />
              </div>

              {/* 所属项目 */}
              <div className="space-y-2">
                <Label htmlFor="project">所属项目 *</Label>
                <Select
                  value={formData.project}
                  onValueChange={(value) => handleInputChange('project', value)}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择项目" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project._id} value={project._id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 状态和优先级 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="status">任务状态</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => handleInputChange('status', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择状态" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="To Do">待处理</SelectItem>
                      <SelectItem value="In Progress">进行中</SelectItem>
                      <SelectItem value="Done">已完成</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="priority">优先级</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value) => handleInputChange('priority', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择优先级" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">低</SelectItem>
                      <SelectItem value="medium">中</SelectItem>
                      <SelectItem value="high">高</SelectItem>
                      <SelectItem value="urgent">紧急</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* 分配用户 */}
              <div className="space-y-2">
                <Label htmlFor="assignedTo">分配给</Label>
                <Select
                  value={formData.assignedTo}
                  onValueChange={(value) => handleInputChange('assignedTo', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择负责人（可选）" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">未分配</SelectItem>
                    {users.map((user) => (
                      <SelectItem key={user._id} value={user._id}>
                        {user.username}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 截止日期和预估工时 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dueDate">截止日期</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => handleInputChange('dueDate', e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="estimatedHours">预估工时（小时）</Label>
                  <Input
                    id="estimatedHours"
                    type="number"
                    value={formData.estimatedHours}
                    onChange={(e) => handleInputChange('estimatedHours', e.target.value)}
                    placeholder="输入预估工时"
                    min="0"
                    step="0.5"
                  />
                </div>
              </div>

              {/* 标签管理 */}
              <div className="space-y-2">
                <Label htmlFor="tags">任务标签</Label>
                <div className="flex gap-2">
                  <Input
                    id="tags"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="输入标签名称"
                  />
                  <Button type="button" onClick={addTag} variant="outline">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {formData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="ml-1 hover:text-red-600"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* 提交按钮 */}
              <div className="flex justify-end gap-4 pt-6">
                <Link href="/oa/tasks">
                  <Button type="button" variant="outline">
                    取消
                  </Button>
                </Link>
                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      创建中...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      创建任务
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// 默认导出组件，用Suspense包装NewTaskForm
export default function NewTaskPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">加载中...</div>}>
      <NewTaskForm />
    </Suspense>
  );
}