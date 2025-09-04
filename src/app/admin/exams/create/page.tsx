/**
 * 创建考试页面
 * 提供考试创建的完整流程
 */

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowLeft,
  Save,
  Eye,
  Calendar,
  Clock,
  Target,
  BookOpen,
  Users,
  Settings,
  Plus,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import AdminPageLayout from '@/components/layout/AdminPageLayout';
import { PAGE_CONFIGS } from '@/components/ui/page-header';

interface ExamForm {
  title: string;
  description: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  duration: number;
  totalScore: number;
  passingScore: number;
  startTime: string;
  endTime: string;
  instructions: string;
  allowReview: boolean;
  randomOrder: boolean;
  maxAttempts: number;
  totalQuestions?: number;
  questionDistribution?: {
    singleChoice: number;
    multipleChoice: number;
    trueFalse: number;
  };
  questionSource?: 'manual' | 'random';
  questionCategory?: string;
}

export default function CreateExamPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<ExamForm>({
    title: '',
    description: '',
    category: '',
    difficulty: 'intermediate',
    duration: 120,
    totalScore: 100,
    passingScore: 60,
    startTime: '',
    endTime: '',
    instructions: '',
    allowReview: true,
    randomOrder: false,
    maxAttempts: 1,
    totalQuestions: 0,
    questionDistribution: {
      singleChoice: 0,
      multipleChoice: 0,
      trueFalse: 0
    },
    questionSource: 'manual',
    questionCategory: ''
  });

  const handleInputChange = (field: keyof ExamForm, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async (isDraft = false) => {
    try {
      setLoading(true);
      
      // 验证必填字段
      if (!formData.title || !formData.category) {
        toast.error('请填写考试标题和类别');
        return;
      }

      if (formData.passingScore > formData.totalScore) {
        toast.error('及格分不能大于总分');
        return;
      }

      // 构建API请求数据
      const examData = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        difficulty: formData.difficulty,
        duration: formData.duration,
        totalQuestions: 0, // 初始为0，后续添加题目时更新
        passingScore: formData.passingScore,
        maxAttempts: formData.maxAttempts,
        instructions: formData.instructions,
        settings: {
          allowReview: formData.allowReview,
          randomOrder: formData.randomOrder,
          startTime: formData.startTime,
          endTime: formData.endTime,
          totalScore: formData.totalScore
        }
      };

      // 调用API创建考试
      const response = await fetch('/api/exams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(examData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.details || result.error || '创建考试失败');
      }

      toast.success(isDraft ? '考试已保存为草稿' : '考试创建成功');
      
      // 如果是创建考试（非草稿），跳转到考试详情页面继续配置题目
      if (!isDraft && result.data?.id) {
        router.push(`/admin/exams/${result.data.id}`);
      } else if (isDraft) {
        // 草稿保存成功后可以继续编辑
        toast.info('您可以继续编辑或添加题目');
      }
    } catch (error) {
      console.error('保存考试失败:', error);
      toast.error(error instanceof Error ? error.message : '保存失败');
    } finally {
      setLoading(false);
    }
  };

  const handleNext = async () => {
    if (currentStep === 1) {
      // 验证第一步的必填字段
      if (!formData.title || !formData.category) {
        toast.error('请填写考试标题和类别');
        return;
      }

      if (formData.passingScore > formData.totalScore) {
        toast.error('及格分不能大于总分');
        return;
      }

      // 先保存草稿再进入下一步
      try {
        setLoading(true);
        await handleSave(true); // 保存为草稿
        setCurrentStep(2); // 进入试卷关联步骤
      } catch (error) {
        console.error('保存草稿失败:', error);
        toast.error('请先保存基本信息');
      } finally {
        setLoading(false);
      }
    } else if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const steps = [
    { id: 1, name: '基本信息', description: '设置考试基本信息' },
    { id: 2, name: '试卷配置', description: '配置题目和试卷' },
    { id: 3, name: '时间安排', description: '设置考试时间' },
    { id: 4, name: '高级选项', description: '其他配置选项' }
  ];

  const renderStep1 = () => (
    <Card>
      <CardHeader>
        <CardTitle>基本信息</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="title">考试标题 *</Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) => handleInputChange('title', e.target.value)}
            placeholder="请输入考试标题"
          />
        </div>
        
        <div>
          <Label htmlFor="description">考试描述</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            placeholder="请输入考试描述"
            rows={3}
          />
        </div>
        
        <div>
          <Label htmlFor="category">考试类别 *</Label>
          <select
            id="category"
            value={formData.category}
            onChange={(e) => handleInputChange('category', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">请选择类别</option>
            <option value="前端开发">前端开发</option>
            <option value="后端开发">后端开发</option>
            <option value="数据科学">数据科学</option>
            <option value="UI/UX设计">UI/UX设计</option>
            <option value="项目管理">项目管理</option>
          </select>
        </div>
        
        <div>
          <Label htmlFor="difficulty">难度等级</Label>
          <select
            id="difficulty"
            value={formData.difficulty}
            onChange={(e) => handleInputChange('difficulty', e.target.value as any)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="beginner">初级</option>
            <option value="intermediate">中级</option>
            <option value="advanced">高级</option>
          </select>
        </div>
      </CardContent>
    </Card>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg border">
        <h3 className="text-lg font-medium text-gray-900 mb-4">试卷配置</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              题目总数
            </label>
            <input
              type="number"
              min="1"
              value={formData.totalQuestions || ''}
              onChange={(e) => handleInputChange('totalQuestions', parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="请输入题目总数"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              题目分布
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">单选题</label>
                <input
                  type="number"
                  min="0"
                  value={formData.questionDistribution?.singleChoice || 0}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 0;
                    handleInputChange('questionDistribution', {
                      ...formData.questionDistribution,
                      singleChoice: value
                    });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">多选题</label>
                <input
                  type="number"
                  min="0"
                  value={formData.questionDistribution?.multipleChoice || 0}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 0;
                    handleInputChange('questionDistribution', {
                      ...formData.questionDistribution,
                      multipleChoice: value
                    });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">判断题</label>
                <input
                  type="number"
                  min="0"
                  value={formData.questionDistribution?.trueFalse || 0}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 0;
                    handleInputChange('questionDistribution', {
                      ...formData.questionDistribution,
                      trueFalse: value
                    });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              题目来源
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="questionSource"
                  value="manual"
                  checked={formData.questionSource === 'manual'}
                  onChange={(e) => handleInputChange('questionSource', e.target.value)}
                  className="mr-2"
                />
                手动选择题目
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="questionSource"
                  value="random"
                  checked={formData.questionSource === 'random'}
                  onChange={(e) => handleInputChange('questionSource', e.target.value)}
                  className="mr-2"
                />
                从题库随机抽取
              </label>
            </div>
          </div>

          {formData.questionSource === 'random' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                题库类别
              </label>
              <select
                value={formData.questionCategory || ''}
                onChange={(e) => handleInputChange('questionCategory', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">请选择题库类别</option>
                <option value="programming">编程基础</option>
                <option value="database">数据库</option>
                <option value="network">网络技术</option>
                <option value="security">信息安全</option>
                <option value="algorithm">算法与数据结构</option>
              </select>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <Card>
      <CardHeader>
        <CardTitle>时间安排</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="duration">考试时长 (分钟)</Label>
            <Input
              id="duration"
              type="number"
              value={formData.duration}
              onChange={(e) => handleInputChange('duration', parseInt(e.target.value))}
              min="1"
            />
          </div>
          
          <div>
            <Label htmlFor="maxAttempts">最大尝试次数</Label>
            <Input
              id="maxAttempts"
              type="number"
              value={formData.maxAttempts}
              onChange={(e) => handleInputChange('maxAttempts', parseInt(e.target.value))}
              min="1"
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="totalScore">总分</Label>
            <Input
              id="totalScore"
              type="number"
              value={formData.totalScore}
              onChange={(e) => handleInputChange('totalScore', parseInt(e.target.value))}
              min="1"
            />
          </div>
          
          <div>
            <Label htmlFor="passingScore">及格分</Label>
            <Input
              id="passingScore"
              type="number"
              value={formData.passingScore}
              onChange={(e) => handleInputChange('passingScore', parseInt(e.target.value))}
              min="1"
              max={formData.totalScore}
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="startTime">开始时间</Label>
            <Input
              id="startTime"
              type="datetime-local"
              value={formData.startTime}
              onChange={(e) => handleInputChange('startTime', e.target.value)}
            />
          </div>
          
          <div>
            <Label htmlFor="endTime">结束时间</Label>
            <Input
              id="endTime"
              type="datetime-local"
              value={formData.endTime}
              onChange={(e) => handleInputChange('endTime', e.target.value)}
            />
          </div>
        </div>
        
        <div>
          <Label htmlFor="instructions">考试说明</Label>
          <Textarea
            id="instructions"
            value={formData.instructions}
            onChange={(e) => handleInputChange('instructions', e.target.value)}
            placeholder="请输入考试说明和注意事项"
            rows={4}
          />
        </div>
        
        <div className="p-4 bg-blue-50 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">时间设置说明</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• 开始时间：考生可以开始参加考试的时间</li>
            <li>• 结束时间：考试的截止时间，超过此时间无法参加</li>
            <li>• 考试时长：单次考试的最大用时</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );

  const renderStep4 = () => (
    <Card>
      <CardHeader>
        <CardTitle>高级选项</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>允许查看答案</Label>
              <p className="text-sm text-gray-600">考试结束后是否允许考生查看正确答案</p>
            </div>
            <input
              type="checkbox"
              checked={formData.allowReview}
              onChange={(e) => handleInputChange('allowReview', e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <Label>随机题目顺序</Label>
              <p className="text-sm text-gray-600">是否随机打乱题目顺序</p>
            </div>
            <input
              type="checkbox"
              checked={formData.randomOrder}
              onChange={(e) => handleInputChange('randomOrder', e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
          </div>
        </div>
        
        <div className="p-4 bg-yellow-50 rounded-lg">
          <h4 className="font-medium text-yellow-900 mb-2">注意事项</h4>
          <ul className="text-sm text-yellow-800 space-y-1">
            <li>• 考试创建后，基本信息可以修改，但已开始的考试不建议修改</li>
            <li>• 题目需要在考试创建后单独添加</li>
            <li>• 考生权限需要在用户管理中单独分配</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <AdminPageLayout
      pageHeaderProps={{
        ...PAGE_CONFIGS.examCreate(),
        actions: (
          <div className="flex items-center space-x-2">
            <Button variant="outline" onClick={() => handleSave(true)} disabled={loading}>
              <Save className="w-4 h-4 mr-2" />
              保存草稿
            </Button>
            <Button onClick={() => handleSave(false)} disabled={loading}>
              <Plus className="w-4 h-4 mr-2" />
              创建考试
            </Button>
          </div>
        )
      }}
    >

      {/* 步骤指示器 */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                  currentStep >= step.id
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'border-gray-300 text-gray-500'
                }`}
              >
                {step.id}
              </div>
              <div className="ml-3">
                <p className={`text-sm font-medium ${
                  currentStep >= step.id ? 'text-blue-600' : 'text-gray-500'
                }`}>
                  {step.name}
                </p>
                <p className="text-xs text-gray-500">{step.description}</p>
              </div>
              {index < steps.length - 1 && (
                <div className={`w-16 h-0.5 mx-4 ${
                  currentStep > step.id ? 'bg-blue-600' : 'bg-gray-300'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 表单内容 */}
      <div className="mt-8">
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
        {currentStep === 4 && renderStep4()}
      </div>

      {/* 导航按钮 */}
      <div className="flex items-center justify-between mt-8">
        <Button
          variant="outline"
          onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
          disabled={currentStep === 1}
        >
          上一步
        </Button>
        
        <div className="text-sm text-gray-500">
          第 {currentStep} 步，共 {steps.length} 步
        </div>
        
        <Button
          onClick={handleNext}
          disabled={currentStep === steps.length || loading}
        >
          下一步
        </Button>
      </div>
    </AdminPageLayout>
  );
}
