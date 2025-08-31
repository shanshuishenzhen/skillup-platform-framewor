/**
 * 项目编辑页面
 * 用于编辑现有项目的信息
 */

'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Save, X, Plus, Loader2 } from 'lucide-react';
import { OAProject } from '@/types/oa';
import oaApi from '@/services/oa-api';
import { toast } from 'sonner';

/**
 * 项目编辑页面组件
 * @returns JSX.Element
 */
export default function EditProjectPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  
  const [project, setProject] = useState<OAProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // 表单状态
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'active',
    priority: 'medium',
    startDate: '',
    endDate: '',
    budget: '',
    isPublic: true,
    tags: [] as string[]
  });
  
  const [newTag, setNewTag] = useState('');

  /**
   * 加载项目详情
   */
  const loadProject = async () => {
    try {
      const result = await oaApi.getProject(projectId);
      if (result.success && result.data) {
        const projectData = result.data;
        setProject(projectData);
        
        // 填充表单数据
        setFormData({
          name: projectData.name || '',
          description: projectData.description || '',
          status: projectData.status || 'active',
          priority: projectData.priority || 'medium',
          startDate: projectData.startDate ? new Date(projectData.startDate).toISOString().split('T')[0] : '',
          endDate: projectData.endDate ? new Date(projectData.endDate).toISOString().split('T')[0] : '',
          budget: projectData.budget ? projectData.budget.toString() : '',
          isPublic: projectData.isPublic !== false,
          tags: projectData.tags || []
        });
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
   * 处理表单输入变化
   * @param field - 字段名
   * @param value - 字段值
   */
  const handleInputChange = (field: string, value: string | boolean) => {
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
    
    if (!formData.name.trim()) {
      toast.error('请输入项目名称');
      return;
    }

    setSaving(true);
    
    try {
      const updateData: any = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        status: formData.status,
        priority: formData.priority,
        isPublic: formData.isPublic,
        tags: formData.tags
      };

      // 处理日期
      if (formData.startDate) {
        updateData.startDate = new Date(formData.startDate).toISOString();
      }
      if (formData.endDate) {
        updateData.endDate = new Date(formData.endDate).toISOString();
      }

      // 处理预算
      if (formData.budget) {
        const budget = parseFloat(formData.budget);
        if (!isNaN(budget) && budget > 0) {
          updateData.budget = budget;
        }
      }

      const result = await oaApi.updateProject(projectId, updateData);
      
      if (result.success) {
        toast.success('项目更新成功');
        router.push(`/oa/projects/${projectId}`);
      } else {
        toast.error(result.message || '更新项目失败');
      }
    } catch (error) {
      console.error('更新项目失败:', error);
      toast.error('更新项目失败');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      loadProject();
    }
  }, [projectId]);

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

  if (!project) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900">项目不存在</h3>
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
      {/* 页面标题 */}
      <div className="flex items-center gap-4 mb-6">
        <Link href={`/oa/projects/${projectId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">编辑项目</h1>
          <p className="text-gray-600 mt-1">修改项目信息和设置</p>
        </div>
      </div>

      {/* 编辑表单 */}
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>项目信息</CardTitle>
            <CardDescription>
              编辑项目的基本信息、状态和设置
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 项目名称 */}
              <div className="space-y-2">
                <Label htmlFor="name">项目名称 *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="输入项目名称"
                  required
                />
              </div>

              {/* 项目描述 */}
              <div className="space-y-2">
                <Label htmlFor="description">项目描述</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="描述项目的目标和内容"
                  rows={4}
                />
              </div>

              {/* 状态和优先级 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="status">项目状态</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => handleInputChange('status', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择状态" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">进行中</SelectItem>
                      <SelectItem value="completed">已完成</SelectItem>
                      <SelectItem value="on-hold">暂停</SelectItem>
                      <SelectItem value="cancelled">已取消</SelectItem>
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

              {/* 日期范围 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">开始日期</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => handleInputChange('startDate', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endDate">结束日期</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => handleInputChange('endDate', e.target.value)}
                    min={formData.startDate}
                  />
                </div>
              </div>

              {/* 预算 */}
              <div className="space-y-2">
                <Label htmlFor="budget">项目预算</Label>
                <Input
                  id="budget"
                  type="number"
                  value={formData.budget}
                  onChange={(e) => handleInputChange('budget', e.target.value)}
                  placeholder="输入预算金额"
                  min="0"
                  step="0.01"
                />
              </div>

              {/* 公开性设置 */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="isPublic">公开项目</Label>
                  <p className="text-sm text-gray-500">
                    公开项目可以被所有用户查看
                  </p>
                </div>
                <Switch
                  id="isPublic"
                  checked={formData.isPublic}
                  onCheckedChange={(checked) => handleInputChange('isPublic', checked)}
                />
              </div>

              {/* 标签管理 */}
              <div className="space-y-2">
                <Label htmlFor="tags">项目标签</Label>
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
                      <Badge key={index} variant="secondary" className="flex items-center gap-1">
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="ml-1 hover:text-red-600"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* 提交按钮 */}
              <div className="flex justify-end gap-4 pt-6">
                <Link href={`/oa/projects/${projectId}`}>
                  <Button type="button" variant="outline">
                    取消
                  </Button>
                </Link>
                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      保存中...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      保存更改
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