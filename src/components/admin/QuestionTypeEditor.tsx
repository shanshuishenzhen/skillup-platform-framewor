/**
 * 题目类型编辑器组件
 * 支持多种题目类型的编辑功能
 * 
 * @author SOLO Coding
 * @version 1.0.0
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Plus, 
  Trash2, 
  Move, 
  Code, 
  FileText,
  CheckCircle,
  XCircle,
  AlertTriangle
} from 'lucide-react';
import { 
  Question, 
  QuestionType, 
  QuestionDifficulty, 
  QuestionOption,
  CodingTestCase,
  CreateQuestionRequest
} from '@/types/question';
import { validateQuestion } from '@/utils/questionValidation';

/**
 * 题目类型编辑器属性接口
 */
interface QuestionTypeEditorProps {
  /** 题目数据 */
  question: Partial<CreateQuestionRequest>;
  /** 题目数据变化回调 */
  onChange: (question: Partial<CreateQuestionRequest>) => void;
  /** 是否显示验证结果 */
  showValidation?: boolean;
}

/**
 * 题目类型选项
 */
const questionTypes: { value: QuestionType; label: string; description: string }[] = [
  { value: 'single_choice', label: '单选题', description: '从多个选项中选择一个正确答案' },
  { value: 'multiple_choice', label: '多选题', description: '从多个选项中选择多个正确答案' },
  { value: 'true_false', label: '判断题', description: '判断陈述是否正确' },
  { value: 'fill_blank', label: '填空题', description: '在空白处填入正确答案' },
  { value: 'short_answer', label: '简答题', description: '用简短文字回答问题' },
  { value: 'coding', label: '编程题', description: '编写代码解决问题' }
];

/**
 * 题目难度选项
 */
const difficultyOptions: { value: QuestionDifficulty; label: string; color: string }[] = [
  { value: 'beginner', label: '初级', color: 'bg-green-100 text-green-800' },
  { value: 'intermediate', label: '中级', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'advanced', label: '高级', color: 'bg-orange-100 text-orange-800' },
  { value: 'expert', label: '专家', color: 'bg-red-100 text-red-800' }
];

/**
 * 编程语言选项
 */
const programmingLanguages = [
  'javascript', 'typescript', 'python', 'java', 'cpp', 'c', 'csharp', 'go', 'rust', 'php'
];

/**
 * 题目类型编辑器组件
 */
export const QuestionTypeEditor: React.FC<QuestionTypeEditorProps> = ({
  question,
  onChange,
  showValidation = true
}) => {
  const [validationResult, setValidationResult] = useState<any>(null);

  /**
   * 更新题目字段
   */
  const updateField = (field: string, value: any) => {
    onChange({
      ...question,
      [field]: value
    });
  };

  /**
   * 添加选项
   */
  const addOption = () => {
    const options = question.options || [];
    const newOption: QuestionOption = {
      id: `option_${Date.now()}`,
      content: '',
      isCorrect: false
    };
    updateField('options', [...options, newOption]);
  };

  /**
   * 更新选项
   */
  const updateOption = (index: number, field: string, value: any) => {
    const options = [...(question.options || [])];
    options[index] = { ...options[index], [field]: value };
    updateField('options', options);
  };

  /**
   * 删除选项
   */
  const removeOption = (index: number) => {
    const options = [...(question.options || [])];
    options.splice(index, 1);
    updateField('options', options);
  };

  /**
   * 添加测试用例
   */
  const addTestCase = () => {
    const testCases = question.testCases || [];
    const newTestCase: CodingTestCase = {
      input: '',
      expectedOutput: '',
      description: ''
    };
    updateField('testCases', [...testCases, newTestCase]);
  };

  /**
   * 更新测试用例
   */
  const updateTestCase = (index: number, field: string, value: any) => {
    const testCases = [...(question.testCases || [])];
    testCases[index] = { ...testCases[index], [field]: value };
    updateField('testCases', testCases);
  };

  /**
   * 删除测试用例
   */
  const removeTestCase = (index: number) => {
    const testCases = [...(question.testCases || [])];
    testCases.splice(index, 1);
    updateField('testCases', testCases);
  };

  /**
   * 渲染基本信息编辑器
   */
  const renderBasicEditor = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <FileText className="w-5 h-5" />
          <span>基本信息</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="type">题目类型 *</Label>
            <Select value={question.type} onValueChange={(value) => updateField('type', value)}>
              <SelectTrigger>
                <SelectValue placeholder="选择题目类型" />
              </SelectTrigger>
              <SelectContent>
                {questionTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <div>
                      <div className="font-medium">{type.label}</div>
                      <div className="text-sm text-gray-500">{type.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="difficulty">难度等级 *</Label>
            <Select value={question.difficulty} onValueChange={(value) => updateField('difficulty', value)}>
              <SelectTrigger>
                <SelectValue placeholder="选择难度等级" />
              </SelectTrigger>
              <SelectContent>
                {difficultyOptions.map((difficulty) => (
                  <SelectItem key={difficulty.value} value={difficulty.value}>
                    <Badge className={difficulty.color}>
                      {difficulty.label}
                    </Badge>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="title">题目标题 *</Label>
          <Input
            id="title"
            value={question.title || ''}
            onChange={(e) => updateField('title', e.target.value)}
            placeholder="请输入题目标题"
            maxLength={200}
          />
          <div className="text-sm text-gray-500">
            {question.title?.length || 0}/200
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="content">题目内容 *</Label>
          <Textarea
            id="content"
            value={question.content || ''}
            onChange={(e) => updateField('content', e.target.value)}
            placeholder="请输入题目内容"
            rows={4}
            maxLength={2000}
          />
          <div className="text-sm text-gray-500">
            {question.content?.length || 0}/2000
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="category">题目分类</Label>
            <Input
              id="category"
              value={question.category || ''}
              onChange={(e) => updateField('category', e.target.value)}
              placeholder="如：编程语言、数据结构"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="tags">标签（用逗号分隔）</Label>
            <Input
              id="tags"
              value={question.tags?.join(', ') || ''}
              onChange={(e) => updateField('tags', e.target.value.split(',').map(tag => tag.trim()).filter(Boolean))}
              placeholder="如：JavaScript, 基础, 变量"
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="explanation">题目解析</Label>
          <Textarea
            id="explanation"
            value={question.explanation || ''}
            onChange={(e) => updateField('explanation', e.target.value)}
            placeholder="请输入题目解析（可选）"
            rows={3}
          />
        </div>
      </CardContent>
    </Card>
  );

  /**
   * 渲染选择题编辑器
   */
  const renderChoiceEditor = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-5 h-5" />
            <span>选项设置</span>
          </div>
          <Button onClick={addOption} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            添加选项
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {question.options?.map((option, index) => (
          <div key={option.id} className="flex items-center space-x-3 p-3 border rounded-lg">
            <div className="flex items-center space-x-2">
              <Checkbox
                checked={option.isCorrect}
                onCheckedChange={(checked) => updateOption(index, 'isCorrect', checked)}
              />
              <Label className="text-sm font-medium">
                {question.type === 'single_choice' ? '正确' : '选中'}
              </Label>
            </div>
            
            <Input
              value={option.content}
              onChange={(e) => updateOption(index, 'content', e.target.value)}
              placeholder={`选项 ${String.fromCharCode(65 + index)}`}
              className="flex-1"
            />
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => removeOption(index)}
              disabled={question.options!.length <= 2}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        )) || []}
        
        {(!question.options || question.options.length === 0) && (
          <div className="text-center py-8 text-gray-500">
            <CheckCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>暂无选项，点击"添加选项"开始创建</p>
          </div>
        )}
      </CardContent>
    </Card>
  );

  /**
   * 渲染判断题编辑器
   */
  const renderTrueFalseEditor = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <CheckCircle className="w-5 h-5" />
          <span>正确答案</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <Label>请选择正确答案：</Label>
          <div className="flex space-x-4">
            <Button
              variant={question.correctAnswer === 'true' ? 'default' : 'outline'}
              onClick={() => updateField('correctAnswer', 'true')}
            >
              正确
            </Button>
            <Button
              variant={question.correctAnswer === 'false' ? 'default' : 'outline'}
              onClick={() => updateField('correctAnswer', 'false')}
            >
              错误
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  /**
   * 渲染填空题编辑器
   */
  const renderFillBlankEditor = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <FileText className="w-5 h-5" />
          <span>正确答案</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="correctAnswer">正确答案 *</Label>
          <Input
            id="correctAnswer"
            value={question.correctAnswer || ''}
            onChange={(e) => updateField('correctAnswer', e.target.value)}
            placeholder="请输入正确答案"
          />
        </div>
        
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            提示：在题目内容中使用下划线（___或____）标记填空位置
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );

  /**
   * 渲染简答题编辑器
   */
  const renderShortAnswerEditor = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <FileText className="w-5 h-5" />
          <span>参考答案</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="correctAnswer">参考答案 *</Label>
          <Textarea
            id="correctAnswer"
            value={question.correctAnswer || ''}
            onChange={(e) => updateField('correctAnswer', e.target.value)}
            placeholder="请输入参考答案"
            rows={4}
          />
        </div>
      </CardContent>
    </Card>
  );

  /**
   * 渲染编程题编辑器
   */
  const renderCodingEditor = () => (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Code className="w-5 h-5" />
            <span>编程设置</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="language">编程语言</Label>
              <Select value={question.language} onValueChange={(value) => updateField('language', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="选择语言" />
                </SelectTrigger>
                <SelectContent>
                  {programmingLanguages.map((lang) => (
                    <SelectItem key={lang} value={lang}>
                      {lang.toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="timeLimit">时间限制（毫秒）</Label>
              <Input
                id="timeLimit"
                type="number"
                value={question.timeLimit || ''}
                onChange={(e) => updateField('timeLimit', parseInt(e.target.value) || undefined)}
                placeholder="5000"
                min="1000"
                max="30000"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="memoryLimit">内存限制（MB）</Label>
              <Input
                id="memoryLimit"
                type="number"
                value={question.memoryLimit || ''}
                onChange={(e) => updateField('memoryLimit', parseInt(e.target.value) || undefined)}
                placeholder="128"
                min="64"
                max="512"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="codeTemplate">代码模板</Label>
            <Textarea
              id="codeTemplate"
              value={question.codeTemplate || ''}
              onChange={(e) => updateField('codeTemplate', e.target.value)}
              placeholder="请输入代码模板（可选）"
              rows={6}
              className="font-mono text-sm"
            />
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5" />
              <span>测试用例</span>
            </div>
            <Button onClick={addTestCase} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              添加测试用例
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {question.testCases?.map((testCase, index) => (
            <div key={index} className="p-4 border rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">测试用例 {index + 1}</h4>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => removeTestCase(index)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>输入</Label>
                  <Textarea
                    value={testCase.input}
                    onChange={(e) => updateTestCase(index, 'input', e.target.value)}
                    placeholder="请输入测试输入"
                    rows={3}
                    className="font-mono text-sm"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>期望输出</Label>
                  <Textarea
                    value={testCase.expectedOutput}
                    onChange={(e) => updateTestCase(index, 'expectedOutput', e.target.value)}
                    placeholder="请输入期望输出"
                    rows={3}
                    className="font-mono text-sm"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>描述（可选）</Label>
                <Input
                  value={testCase.description || ''}
                  onChange={(e) => updateTestCase(index, 'description', e.target.value)}
                  placeholder="测试用例描述"
                />
              </div>
            </div>
          )) || []}
          
          {(!question.testCases || question.testCases.length === 0) && (
            <div className="text-center py-8 text-gray-500">
              <Code className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>暂无测试用例，点击"添加测试用例"开始创建</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  /**
   * 渲染类型特定编辑器
   */
  const renderTypeSpecificEditor = () => {
    switch (question.type) {
      case 'single_choice':
      case 'multiple_choice':
        return renderChoiceEditor();
      case 'true_false':
        return renderTrueFalseEditor();
      case 'fill_blank':
        return renderFillBlankEditor();
      case 'short_answer':
        return renderShortAnswerEditor();
      case 'coding':
        return renderCodingEditor();
      default:
        return null;
    }
  };

  /**
   * 渲染验证结果
   */
  const renderValidation = () => {
    if (!showValidation || !validationResult) return null;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            {validationResult.isValid ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : (
              <XCircle className="w-5 h-5 text-red-500" />
            )}
            <span>验证结果</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {validationResult.errors.length > 0 && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  <strong>错误：</strong>
                  <ul className="list-disc list-inside space-y-1">
                    {validationResult.errors.map((error: string, index: number) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              </AlertDescription>
            </Alert>
          )}
          
          {validationResult.warnings.length > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  <strong>警告：</strong>
                  <ul className="list-disc list-inside space-y-1">
                    {validationResult.warnings.map((warning: string, index: number) => (
                      <li key={index}>{warning}</li>
                    ))}
                  </ul>
                </div>
              </AlertDescription>
            </Alert>
          )}
          
          {validationResult.isValid && validationResult.warnings.length === 0 && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                题目验证通过，没有发现问题。
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    );
  };

  // 实时验证
  useEffect(() => {
    if (showValidation) {
      const result = validateQuestion(question);
      setValidationResult(result);
    }
  }, [question, showValidation]);

  return (
    <div className="space-y-6">
      {renderBasicEditor()}
      {question.type && renderTypeSpecificEditor()}
      {renderValidation()}
    </div>
  );
};

export default QuestionTypeEditor;