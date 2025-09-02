import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Save, X, Plus, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Exam, ExamDifficulty, ExamCreateRequest, ExamSettings } from '@/types/exam';
import { toast } from 'sonner';

/**
 * 考试表单验证模式
 */
const examSchema = z.object({
  title: z.string().min(1, '考试标题不能为空').max(200, '考试标题不能超过200字符'),
  description: z.string().optional(),
  category: z.string().optional(),
  difficulty: z.nativeEnum(ExamDifficulty, { required_error: '请选择难度等级' }),
  duration: z.number().min(1, '考试时长必须大于0分钟').max(480, '考试时长不能超过8小时'),
  total_questions: z.number().min(1, '题目数量必须大于0').max(200, '题目数量不能超过200'),
  passing_score: z.number().min(0, '及格分数不能小于0').max(100, '及格分数不能超过100'),
  max_participants: z.number().min(1).optional(),
  max_attempts: z.number().min(1).max(10).optional(),
  start_time: z.date().optional(),
  end_time: z.date().optional(),
  settings: z.object({
    shuffle_questions: z.boolean(),
    shuffle_options: z.boolean(),
    show_results_immediately: z.boolean(),
    allow_review: z.boolean(),
    show_correct_answers: z.boolean(),
    enable_proctoring: z.boolean(),
    require_webcam: z.boolean(),
    prevent_copy_paste: z.boolean(),
    fullscreen_mode: z.boolean(),
    time_warning_minutes: z.number().min(0).optional()
  })
});

type ExamFormData = z.infer<typeof examSchema>;

/**
 * 考试表单组件属性接口
 */
interface ExamFormProps {
  /** 编辑的考试数据（可选，用于编辑模式） */
  exam?: Exam;
  /** 提交表单的回调函数 */
  onSubmit: (data: ExamCreateRequest) => Promise<void>;
  /** 取消操作的回调函数 */
  onCancel: () => void;
  /** 是否正在提交 */
  isSubmitting?: boolean;
  /** 可用的分类列表 */
  categories?: string[];
}

/**
 * 难度等级配置
 */
const difficultyConfig = {
  [ExamDifficulty.EASY]: { label: '简单', color: 'text-green-600' },
  [ExamDifficulty.MEDIUM]: { label: '中等', color: 'text-yellow-600' },
  [ExamDifficulty.HARD]: { label: '困难', color: 'text-red-600' }
};

/**
 * 默认考试设置
 */
const defaultSettings: ExamSettings = {
  shuffle_questions: false,
  shuffle_options: false,
  show_results_immediately: true,
  allow_review: true,
  show_correct_answers: true,
  enable_proctoring: false,
  require_webcam: false,
  prevent_copy_paste: false,
  fullscreen_mode: false,
  time_warning_minutes: 5
};

/**
 * 考试表单组件
 * @description 用于创建和编辑考试的表单组件
 * @param props 组件属性
 * @returns JSX.Element
 */
export const ExamForm: React.FC<ExamFormProps> = ({
  exam,
  onSubmit,
  onCancel,
  isSubmitting = false,
  categories = []
}) => {
  const [newCategory, setNewCategory] = useState('');
  const [availableCategories, setAvailableCategories] = useState<string[]>(categories);

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    reset
  } = useForm<ExamFormData>({
    resolver: zodResolver(examSchema),
    defaultValues: {
      title: exam?.title || '',
      description: exam?.description || '',
      category: exam?.category || '',
      difficulty: exam?.difficulty || ExamDifficulty.MEDIUM,
      duration: exam?.duration || 60,
      total_questions: exam?.total_questions || 10,
      passing_score: exam?.passing_score || 60,
      max_participants: exam?.max_participants || undefined,
      max_attempts: exam?.max_attempts || 1,
      start_time: exam?.start_time ? new Date(exam.start_time) : undefined,
      end_time: exam?.end_time ? new Date(exam.end_time) : undefined,
      settings: exam?.settings || defaultSettings
    }
  });

  const watchedStartTime = watch('start_time');
  const watchedEndTime = watch('end_time');
  const watchedSettings = watch('settings');

  /**
   * 初始化表单数据
   */
  useEffect(() => {
    if (exam) {
      reset({
        title: exam.title,
        description: exam.description || '',
        category: exam.category || '',
        difficulty: exam.difficulty,
        duration: exam.duration || 60,
        total_questions: exam.total_questions || 10,
        passing_score: exam.passing_score || 60,
        max_participants: exam.max_participants || undefined,
        max_attempts: exam.max_attempts || 1,
        start_time: exam.start_time ? new Date(exam.start_time) : undefined,
        end_time: exam.end_time ? new Date(exam.end_time) : undefined,
        settings: exam.settings || defaultSettings
      });
    }
  }, [exam, reset]);

  /**
   * 处理表单提交
   * @param data 表单数据
   */
  const handleFormSubmit = async (data: ExamFormData) => {
    try {
      // 验证时间设置
      if (data.start_time && data.end_time && data.start_time >= data.end_time) {
        toast.error('结束时间必须晚于开始时间');
        return;
      }

      // 构建提交数据
      const submitData: ExamCreateRequest = {
        ...data,
        start_time: data.start_time?.toISOString(),
        end_time: data.end_time?.toISOString()
      };

      await onSubmit(submitData);
    } catch (error) {
      console.error('提交考试失败:', error);
      toast.error('提交失败，请重试');
    }
  };

  /**
   * 添加新分类
   */
  const addCategory = () => {
    if (newCategory.trim() && !availableCategories.includes(newCategory.trim())) {
      const updatedCategories = [...availableCategories, newCategory.trim()];
      setAvailableCategories(updatedCategories);
      setValue('category', newCategory.trim());
      setNewCategory('');
    }
  };

  /**
   * 更新设置项
   * @param key 设置项键名
   * @param value 设置项值
   */
  const updateSetting = (key: keyof ExamSettings, value: boolean | number) => {
    setValue(`settings.${key}`, value);
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>
          {exam ? '编辑考试' : '创建考试'}
        </CardTitle>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-8">
          {/* 基本信息 */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">基本信息</h3>
            
            <div className="space-y-2">
              <Label htmlFor="title">考试标题 *</Label>
              <Input
                id="title"
                {...register('title')}
                placeholder="请输入考试标题"
                className={errors.title ? 'border-red-500' : ''}
              />
              {errors.title && (
                <p className="text-sm text-red-500">{errors.title.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">考试描述</Label>
              <Textarea
                id="description"
                {...register('description')}
                placeholder="请输入考试描述（可选）"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">考试分类</Label>
                <div className="flex gap-2">
                  <Select onValueChange={(value) => setValue('category', value)}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="选择分类" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableCategories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Input
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    placeholder="新建分类"
                    className="flex-1"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCategory())}
                  />
                  <Button type="button" variant="outline" onClick={addCategory}>
                    添加
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="difficulty">难度等级 *</Label>
                <Select onValueChange={(value) => setValue('difficulty', value as ExamDifficulty)}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择难度" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(difficultyConfig).map(([difficulty, config]) => (
                      <SelectItem key={difficulty} value={difficulty}>
                        <span className={config.color}>{config.label}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.difficulty && (
                  <p className="text-sm text-red-500">{errors.difficulty.message}</p>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* 考试设置 */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">考试设置</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="duration">考试时长（分钟） *</Label>
                <Input
                  id="duration"
                  type="number"
                  min="1"
                  max="480"
                  {...register('duration', { valueAsNumber: true })}
                  placeholder="考试时长"
                  className={errors.duration ? 'border-red-500' : ''}
                />
                {errors.duration && (
                  <p className="text-sm text-red-500">{errors.duration.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="total_questions">题目数量 *</Label>
                <Input
                  id="total_questions"
                  type="number"
                  min="1"
                  max="200"
                  {...register('total_questions', { valueAsNumber: true })}
                  placeholder="题目数量"
                  className={errors.total_questions ? 'border-red-500' : ''}
                />
                {errors.total_questions && (
                  <p className="text-sm text-red-500">{errors.total_questions.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="passing_score">及格分数 *</Label>
                <Input
                  id="passing_score"
                  type="number"
                  min="0"
                  max="100"
                  {...register('passing_score', { valueAsNumber: true })}
                  placeholder="及格分数"
                  className={errors.passing_score ? 'border-red-500' : ''}
                />
                {errors.passing_score && (
                  <p className="text-sm text-red-500">{errors.passing_score.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="max_participants">最大参与人数</Label>
                <Input
                  id="max_participants"
                  type="number"
                  min="1"
                  {...register('max_participants', { valueAsNumber: true })}
                  placeholder="不限制请留空"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="max_attempts">最大尝试次数</Label>
                <Input
                  id="max_attempts"
                  type="number"
                  min="1"
                  max="10"
                  {...register('max_attempts', { valueAsNumber: true })}
                  placeholder="最大尝试次数"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* 时间设置 */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">时间设置</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>开始时间</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !watchedStartTime && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {watchedStartTime ? (
                        format(watchedStartTime, "PPP HH:mm", { locale: zhCN })
                      ) : (
                        <span>选择开始时间</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={watchedStartTime}
                      onSelect={(date) => setValue('start_time', date)}
                      disabled={(date) => date < new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>结束时间</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !watchedEndTime && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {watchedEndTime ? (
                        format(watchedEndTime, "PPP HH:mm", { locale: zhCN })
                      ) : (
                        <span>选择结束时间</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={watchedEndTime}
                      onSelect={(date) => setValue('end_time', date)}
                      disabled={(date) => {
                        const today = new Date();
                        const startTime = watchedStartTime || today;
                        return date < today || date <= startTime;
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          <Separator />

          {/* 高级设置 */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">高级设置</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="font-medium">题目设置</h4>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="shuffle_questions"
                      checked={watchedSettings.shuffle_questions}
                      onCheckedChange={(checked) => updateSetting('shuffle_questions', checked as boolean)}
                    />
                    <Label htmlFor="shuffle_questions">随机排列题目</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="shuffle_options"
                      checked={watchedSettings.shuffle_options}
                      onCheckedChange={(checked) => updateSetting('shuffle_options', checked as boolean)}
                    />
                    <Label htmlFor="shuffle_options">随机排列选项</Label>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">结果设置</h4>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="show_results_immediately"
                      checked={watchedSettings.show_results_immediately}
                      onCheckedChange={(checked) => updateSetting('show_results_immediately', checked as boolean)}
                    />
                    <Label htmlFor="show_results_immediately">立即显示结果</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="allow_review"
                      checked={watchedSettings.allow_review}
                      onCheckedChange={(checked) => updateSetting('allow_review', checked as boolean)}
                    />
                    <Label htmlFor="allow_review">允许查看答题记录</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="show_correct_answers"
                      checked={watchedSettings.show_correct_answers}
                      onCheckedChange={(checked) => updateSetting('show_correct_answers', checked as boolean)}
                    />
                    <Label htmlFor="show_correct_answers">显示正确答案</Label>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">防作弊设置</h4>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="enable_proctoring"
                      checked={watchedSettings.enable_proctoring}
                      onCheckedChange={(checked) => updateSetting('enable_proctoring', checked as boolean)}
                    />
                    <Label htmlFor="enable_proctoring">启用监考模式</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="require_webcam"
                      checked={watchedSettings.require_webcam}
                      onCheckedChange={(checked) => updateSetting('require_webcam', checked as boolean)}
                    />
                    <Label htmlFor="require_webcam">要求开启摄像头</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="prevent_copy_paste"
                      checked={watchedSettings.prevent_copy_paste}
                      onCheckedChange={(checked) => updateSetting('prevent_copy_paste', checked as boolean)}
                    />
                    <Label htmlFor="prevent_copy_paste">禁止复制粘贴</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="fullscreen_mode"
                      checked={watchedSettings.fullscreen_mode}
                      onCheckedChange={(checked) => updateSetting('fullscreen_mode', checked as boolean)}
                    />
                    <Label htmlFor="fullscreen_mode">强制全屏模式</Label>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">其他设置</h4>
                <div className="space-y-2">
                  <Label htmlFor="time_warning_minutes">时间警告（分钟）</Label>
                  <Input
                    id="time_warning_minutes"
                    type="number"
                    min="0"
                    max="60"
                    value={watchedSettings.time_warning_minutes || 5}
                    onChange={(e) => updateSetting('time_warning_minutes', parseInt(e.target.value) || 0)}
                    placeholder="剩余时间警告"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex items-center justify-end gap-3 pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              取消
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {isSubmitting ? '保存中...' : (exam ? '更新考试' : '创建考试')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default ExamForm;