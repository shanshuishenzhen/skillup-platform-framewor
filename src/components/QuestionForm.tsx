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
import { Plus, Trash2, Save, X } from 'lucide-react';
import { Question, QuestionType, QuestionDifficulty, QuestionCreateRequest } from '@/types/question';
import { toast } from 'sonner';

/**
 * 题目表单验证模式
 */
const questionSchema = z.object({
  title: z.string().min(1, '题目标题不能为空').max(500, '题目标题不能超过500字符'),
  content: z.string().min(1, '题目内容不能为空'),
  type: z.nativeEnum(QuestionType, { required_error: '请选择题目类型' }),
  difficulty: z.nativeEnum(QuestionDifficulty, { required_error: '请选择难度等级' }),
  points: z.number().min(1, '分值必须大于0').max(100, '分值不能超过100'),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  options: z.array(z.object({
    text: z.string().min(1, '选项内容不能为空'),
    is_correct: z.boolean()
  })).optional(),
  correct_answer: z.string().optional(),
  explanation: z.string().optional(),
  time_limit: z.number().min(0).optional()
});

type QuestionFormData = z.infer<typeof questionSchema>;

/**
 * 题目表单组件属性接口
 */
interface QuestionFormProps {
  /** 编辑的题目数据（可选，用于编辑模式） */
  question?: Question;
  /** 提交表单的回调函数 */
  onSubmit: (data: QuestionCreateRequest) => Promise<void>;
  /** 取消操作的回调函数 */
  onCancel: () => void;
  /** 是否正在提交 */
  isSubmitting?: boolean;
  /** 可用的分类列表 */
  categories?: string[];
  /** 可用的标签列表 */
  availableTags?: string[];
}

/**
 * 题目类型配置
 */
const questionTypeConfig = {
  [QuestionType.SINGLE_CHOICE]: { label: '单选题', needsOptions: true },
  [QuestionType.MULTIPLE_CHOICE]: { label: '多选题', needsOptions: true },
  [QuestionType.TRUE_FALSE]: { label: '判断题', needsOptions: false },
  [QuestionType.FILL_BLANK]: { label: '填空题', needsOptions: false },
  [QuestionType.SHORT_ANSWER]: { label: '简答题', needsOptions: false },
  [QuestionType.ESSAY]: { label: '论述题', needsOptions: false }
};

/**
 * 难度等级配置
 */
const difficultyConfig = {
  [QuestionDifficulty.EASY]: { label: '简单', color: 'text-green-600' },
  [QuestionDifficulty.MEDIUM]: { label: '中等', color: 'text-yellow-600' },
  [QuestionDifficulty.HARD]: { label: '困难', color: 'text-red-600' }
};

/**
 * 题目表单组件
 * @description 用于创建和编辑题目的表单组件
 * @param props 组件属性
 * @returns JSX.Element
 */
export const QuestionForm: React.FC<QuestionFormProps> = ({
  question,
  onSubmit,
  onCancel,
  isSubmitting = false,
  categories = [],
  availableTags = []
}) => {
  const [newTag, setNewTag] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>(question?.tags || []);

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    reset
  } = useForm<QuestionFormData>({
    resolver: zodResolver(questionSchema),
    defaultValues: {
      title: question?.title || '',
      content: question?.content || '',
      type: question?.type || QuestionType.SINGLE_CHOICE,
      difficulty: question?.difficulty || QuestionDifficulty.MEDIUM,
      points: question?.points || 1,
      category: question?.category || '',
      tags: question?.tags || [],
      options: question?.options || [{ text: '', is_correct: false }],
      correct_answer: question?.correct_answer || '',
      explanation: question?.explanation || '',
      time_limit: question?.time_limit || undefined
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'options'
  });

  const watchedType = watch('type');
  const needsOptions = questionTypeConfig[watchedType]?.needsOptions;

  /**
   * 初始化表单数据
   */
  useEffect(() => {
    if (question) {
      reset({
        title: question.title,
        content: question.content,
        type: question.type,
        difficulty: question.difficulty,
        points: question.points,
        category: question.category || '',
        tags: question.tags || [],
        options: question.options || [{ text: '', is_correct: false }],
        correct_answer: question.correct_answer || '',
        explanation: question.explanation || '',
        time_limit: question.time_limit || undefined
      });
      setSelectedTags(question.tags || []);
    }
  }, [question, reset]);

  /**
   * 处理表单提交
   * @param data 表单数据
   */
  const handleFormSubmit = async (data: QuestionFormData) => {
    try {
      // 验证选择题的选项
      if (needsOptions && data.options) {
        const hasCorrectOption = data.options.some(option => option.is_correct);
        if (!hasCorrectOption) {
          toast.error('请至少选择一个正确答案');
          return;
        }

        if (data.type === QuestionType.SINGLE_CHOICE) {
          const correctCount = data.options.filter(option => option.is_correct).length;
          if (correctCount > 1) {
            toast.error('单选题只能有一个正确答案');
            return;
          }
        }
      }

      // 构建提交数据
      const submitData: QuestionCreateRequest = {
        ...data,
        tags: selectedTags,
        options: needsOptions ? data.options : undefined
      };

      await onSubmit(submitData);
    } catch (error) {
      console.error('提交题目失败:', error);
      toast.error('提交失败，请重试');
    }
  };

  /**
   * 添加选项
   */
  const addOption = () => {
    append({ text: '', is_correct: false });
  };

  /**
   * 删除选项
   * @param index 选项索引
   */
  const removeOption = (index: number) => {
    if (fields.length > 1) {
      remove(index);
    }
  };

  /**
   * 添加标签
   */
  const addTag = () => {
    if (newTag.trim() && !selectedTags.includes(newTag.trim())) {
      const updatedTags = [...selectedTags, newTag.trim()];
      setSelectedTags(updatedTags);
      setValue('tags', updatedTags);
      setNewTag('');
    }
  };

  /**
   * 删除标签
   * @param tagToRemove 要删除的标签
   */
  const removeTag = (tagToRemove: string) => {
    const updatedTags = selectedTags.filter(tag => tag !== tagToRemove);
    setSelectedTags(updatedTags);
    setValue('tags', updatedTags);
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>
          {question ? '编辑题目' : '创建题目'}
        </CardTitle>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
          {/* 基本信息 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">题目标题 *</Label>
              <Input
                id="title"
                {...register('title')}
                placeholder="请输入题目标题"
                className={errors.title ? 'border-red-500' : ''}
              />
              {errors.title && (
                <p className="text-sm text-red-500">{errors.title.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">分类</Label>
              <Select onValueChange={(value) => setValue('category', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="选择分类" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 题目内容 */}
          <div className="space-y-2">
            <Label htmlFor="content">题目内容 *</Label>
            <Textarea
              id="content"
              {...register('content')}
              placeholder="请输入题目内容"
              rows={4}
              className={errors.content ? 'border-red-500' : ''}
            />
            {errors.content && (
              <p className="text-sm text-red-500">{errors.content.message}</p>
            )}
          </div>

          {/* 题目设置 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">题目类型 *</Label>
              <Select onValueChange={(value) => setValue('type', value as QuestionType)}>
                <SelectTrigger>
                  <SelectValue placeholder="选择题目类型" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(questionTypeConfig).map(([type, config]) => (
                    <SelectItem key={type} value={type}>
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.type && (
                <p className="text-sm text-red-500">{errors.type.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="difficulty">难度等级 *</Label>
              <Select onValueChange={(value) => setValue('difficulty', value as QuestionDifficulty)}>
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

            <div className="space-y-2">
              <Label htmlFor="points">分值 *</Label>
              <Input
                id="points"
                type="number"
                min="1"
                max="100"
                {...register('points', { valueAsNumber: true })}
                placeholder="题目分值"
                className={errors.points ? 'border-red-500' : ''}
              />
              {errors.points && (
                <p className="text-sm text-red-500">{errors.points.message}</p>
              )}
            </div>
          </div>

          {/* 选项设置（仅选择题） */}
          {needsOptions && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>答案选项</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addOption}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  添加选项
                </Button>
              </div>

              <div className="space-y-3">
                {fields.map((field, index) => (
                  <div key={field.id} className="flex items-center gap-3">
                    <Checkbox
                      checked={watch(`options.${index}.is_correct`)}
                      onCheckedChange={(checked) => {
                        if (watchedType === QuestionType.SINGLE_CHOICE) {
                          // 单选题：取消其他选项的选中状态
                          fields.forEach((_, i) => {
                            setValue(`options.${i}.is_correct`, i === index && checked);
                          });
                        } else {
                          setValue(`options.${index}.is_correct`, checked as boolean);
                        }
                      }}
                    />
                    <Input
                      {...register(`options.${index}.text`)}
                      placeholder={`选项 ${String.fromCharCode(65 + index)}`}
                      className="flex-1"
                    />
                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeOption(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 非选择题的正确答案 */}
          {!needsOptions && (
            <div className="space-y-2">
              <Label htmlFor="correct_answer">参考答案</Label>
              <Textarea
                id="correct_answer"
                {...register('correct_answer')}
                placeholder="请输入参考答案"
                rows={3}
              />
            </div>
          )}

          {/* 解析 */}
          <div className="space-y-2">
            <Label htmlFor="explanation">题目解析</Label>
            <Textarea
              id="explanation"
              {...register('explanation')}
              placeholder="请输入题目解析（可选）"
              rows={3}
            />
          </div>

          {/* 标签管理 */}
          <div className="space-y-3">
            <Label>标签</Label>
            <div className="flex items-center gap-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="添加标签"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                className="flex-1"
              />
              <Button type="button" variant="outline" onClick={addTag}>
                添加
              </Button>
            </div>
            {selectedTags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedTags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                    {tag}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => removeTag(tag)}
                    />
                  </Badge>
                ))}
              </div>
            )}
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
              {isSubmitting ? '保存中...' : (question ? '更新题目' : '创建题目')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default QuestionForm;