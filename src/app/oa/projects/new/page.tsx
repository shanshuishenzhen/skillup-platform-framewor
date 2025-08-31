/**
 * 新建项目页面
 * 提供创建新项目的表单界面
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft,
  Save,
  FolderOpen,
  Users,
  Calendar,
  Settings,
  AlertCircle
} from 'lucide-react';
import Link from 'next/link';
import { CreateProjectRequest } from '@/types/oa';
import oaApi from '@/services/oa-api';
import { toast } from 'sonner';

/**
 * 项目表单数据接口
 */
interface ProjectFormData {
  name: string;
  description: string;
  status: 'active' | 'on-hold' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  startDate: string;
  endDate: string;
  budget: string;
  isPublic: boolean;
  tags: string[];
}

/**
 * 新建项目页面组件
 * @returns JSX.Element
 */
export default function NewProjectPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<ProjectFormData>({
    name: '',
    description: '',
    status: 'active',
    priority: 'medium',
    startDate: '',
    endDate: '',
    budget: '',
    isPublic: false,
    tags: []
  });
  const [tagInput, setTagInput] = useState('');
  const [errors, setErrors] = useState<Partial<ProjectFormData>>({});

  /**
   * 验证表单数据
   * @returns 是否验证通过
   */
  const validateForm = (): boolean => {
    const newErrors: Partial<ProjectFormData> = {};

    if (!formData.name.trim()) {
      newErrors.name = '项目名称不能为空';
    } else if (formData.name.length < 2) {
      newErrors.name = '项目名称至少需要2个字符';
    }

    if (!formData.description.trim()) {
      newErrors.description = '项目描述不能为空';
    } else if (formData.description.length < 10) {
      newErrors.description = '项目描述至少需要10个字符';
    }

    if (formData.startDate && formData.endDate) {
      const startDate = new Date(formData.startDate);
      const endDate = new Date(formData.endDate);
      if (endDate <= startDate) {
        newErrors.endDate = '结束日期必须晚于开始日期';
      }
    }

    if (formData.budget && isNaN(Number(formData.budget))) {
      newErrors.budget = '预算必须是有效数字';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * 处理表单字段变化
   * @param field - 字段名
   * @param value - 字段值
   */
  const handleFieldChange = (field: keyof ProjectFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // 清除对应字段的错误
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  /**
   * 添加标签
   */
  const addTag = () => {
    const tag = tagInput.trim();
    if (tag && !formData.tags.includes(tag)) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tag]
      }));
      setTagInput('');
    }
  };

  /**
   * 移除标签
   * @param tagToRemove - 要移除的标签
   */
  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  /**
   * 处理表单提交
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('请检查表单中的错误');
      return;
    }

    try {
      setLoading(true);

      const projectData: CreateProjectRequest = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        status: formData.status,
        priority: formData.priority,
        startDate: formData.startDate || undefined,
        endDate: formData.endDate || undefined,
        budget: formData.budget ? Number(formData.budget) : undefined,
        isPublic: formData.isPublic,
        tags: formData.tags
      };

      const result = await oaApi.createProject(projectData);

      if (result.success && result.data) {
        toast.success('项目创建成功');
        router.push(`/oa/projects/${result.data._id}`);
      } else {
        toast.error(result.message || '创建项目失败');
      }
    } catch (error) {
      console.error('创建项目失败:', error);
      toast.error('创建项目失败');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 处理标签输入键盘事件
   */
  const handleTagKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {/* 页面标题 */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/oa/projects">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">新建项目</h1>
          <p className="text-gray-600 mt-1">创建一个新的协作项目</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 基本信息 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5" />
              基本信息
            </CardTitle>
            <CardDescription>
              设置项目的基本信息和描述
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">项目名称 *</Label>
                <Input
                  id="name"
                  placeholder="输入项目名称"
                  value={formData.name}
                  onChange={(e) => handleFieldChange('name', e.target.value)}
                  className={errors.name ? 'border-red-500' : ''}
                />
                {errors.name && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.name}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">项目状态</Label>
                <Select value={formData.status} onValueChange={(value: any) => handleFieldChange('status', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">进行中</SelectItem>
                    <SelectItem value="on-hold">暂停</SelectItem>
                    <SelectItem value="completed">已完成</SelectItem>
                    <SelectItem value="cancelled">已取消</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">项目描述 *</Label>
              <Textarea
                id="description"
                placeholder="详细描述项目的目标、范围和要求"
                value={formData.description}
                onChange={(e) => handleFieldChange('description', e.target.value)}
                className={`min-h-[100px] ${errors.description ? 'border-red-500' : ''}`}
              />
              {errors.description && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.description}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="priority">优先级</Label>
                <Select value={formData.priority} onValueChange={(value: any) => handleFieldChange('priority', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">低</SelectItem>
                    <SelectItem value="medium">中</SelectItem>
                    <SelectItem value="high">高</SelectItem>
                    <SelectItem value="urgent">紧急</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="budget">预算（可选）</Label>
                <Input
                  id="budget"
                  type="number"
                  placeholder="项目预算金额"
                  value={formData.budget}
                  onChange={(e) => handleFieldChange('budget', e.target.value)}
                  className={errors.budget ? 'border-red-500' : ''}
                />
                {errors.budget && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.budget}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 时间安排 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              时间安排
            </CardTitle>
            <CardDescription>
              设置项目的开始和结束时间
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">开始日期</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => handleFieldChange('startDate', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endDate">结束日期</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => handleFieldChange('endDate', e.target.value)}
                  className={errors.endDate ? 'border-red-500' : ''}
                />
                {errors.endDate && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.endDate}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 项目设置 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              项目设置
            </CardTitle>
            <CardDescription>
              配置项目的可见性和标签
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="isPublic">公开项目</Label>
                <p className="text-sm text-gray-600">
                  公开项目对所有团队成员可见
                </p>
              </div>
              <Switch
                id="isPublic"
                checked={formData.isPublic}
                onCheckedChange={(checked) => handleFieldChange('isPublic', checked)}
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="tags">项目标签</Label>
              <div className="flex gap-2">
                <Input
                  id="tags"
                  placeholder="输入标签名称"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={handleTagKeyPress}
                  className="flex-1"
                />
                <Button type="button" variant="outline" onClick={addTag}>
                  添加
                </Button>
              </div>
              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-md"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 操作按钮 */}
        <div className="flex items-center justify-end gap-4">
          <Link href="/oa/projects">
            <Button type="button" variant="outline">
              取消
            </Button>
          </Link>
          <Button type="submit" disabled={loading}>
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                创建中...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                创建项目
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}