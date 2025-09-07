/**
 * 题目预览组件
 * 提供题目实时预览和验证功能
 * 
 * @author SOLO Coding
 * @version 1.0.0
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Eye, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Code, 
  FileText,
  Clock,
  User
} from 'lucide-react';
import { 
  Question, 
  QuestionType, 
  QuestionDifficulty, 
  QuestionValidationResult 
} from '@/types/question';

/**
 * 题目预览组件属性接口
 */
interface QuestionPreviewProps {
  /** 题目数据 */
  question: Partial<Question>;
  /** 是否显示答案 */
  showAnswer?: boolean;
  /** 是否启用验证 */
  enableValidation?: boolean;
  /** 验证结果回调 */
  onValidationChange?: (result: QuestionValidationResult) => void;
  /** 预览模式 */
  mode?: 'preview' | 'validation' | 'both';
}

/**
 * 题目难度颜色映射
 */
const difficultyColors: Record<QuestionDifficulty, string> = {
  beginner: 'bg-green-100 text-green-800',
  intermediate: 'bg-yellow-100 text-yellow-800',
  advanced: 'bg-orange-100 text-orange-800',
  expert: 'bg-red-100 text-red-800'
};

/**
 * 题目类型标签映射
 */
const typeLabels: Record<QuestionType, string> = {
  single_choice: '单选题',
  multiple_choice: '多选题',
  true_false: '判断题',
  fill_blank: '填空题',
  short_answer: '简答题',
  coding: '编程题'
};

/**
 * 题目预览组件
 */
export const QuestionPreview: React.FC<QuestionPreviewProps> = ({
  question,
  showAnswer = false,
  enableValidation = true,
  onValidationChange,
  mode = 'both'
}) => {
  const [validationResult, setValidationResult] = useState<QuestionValidationResult | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<string[]>([]);
  const [fillBlankAnswer, setFillBlankAnswer] = useState('');
  const [shortAnswer, setShortAnswer] = useState('');
  const [codeAnswer, setCodeAnswer] = useState('');

  /**
   * 验证题目数据
   */
  const validateQuestion = (): QuestionValidationResult => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 验证基本字段
    if (!question.type) {
      errors.push('题目类型不能为空');
    }
    if (!question.title?.trim()) {
      errors.push('题目标题不能为空');
    }
    if (!question.content?.trim()) {
      errors.push('题目内容不能为空');
    }
    if (!question.difficulty) {
      errors.push('题目难度不能为空');
    }

    // 根据题目类型验证特定字段
    if (question.type === 'single_choice' || question.type === 'multiple_choice') {
      if (!question.options || question.options.length < 2) {
        errors.push('选择题必须提供至少2个选项');
      } else {
        const correctOptions = question.options.filter(opt => opt.isCorrect);
        if (correctOptions.length === 0) {
          errors.push('选择题必须至少有一个正确答案');
        }
        if (question.type === 'single_choice' && correctOptions.length > 1) {
          errors.push('单选题只能有一个正确答案');
        }
        if (question.options.length > 6) {
          warnings.push('选项过多可能影响用户体验，建议控制在6个以内');
        }
      }
    }

    if (question.type === 'coding') {
      if (!question.testCases || question.testCases.length === 0) {
        errors.push('编程题必须提供测试用例');
      }
      if (!question.codeTemplate) {
        warnings.push('建议提供代码模板以提升用户体验');
      }
    }

    if (question.type === 'fill_blank') {
      if (!question.correctAnswer?.trim()) {
        errors.push('填空题必须提供正确答案');
      }
    }

    if (question.type === 'short_answer') {
      if (!question.correctAnswer?.trim()) {
        errors.push('简答题必须提供参考答案');
      }
    }

    // 内容长度检查
    if (question.title && question.title.length > 200) {
      warnings.push('题目标题过长，建议控制在200字符以内');
    }
    if (question.content && question.content.length > 2000) {
      warnings.push('题目内容过长，建议控制在2000字符以内');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  };

  /**
   * 处理答案选择
   */
  const handleAnswerSelect = (optionId: string) => {
    if (question.type === 'single_choice') {
      setSelectedAnswers([optionId]);
    } else if (question.type === 'multiple_choice') {
      setSelectedAnswers(prev => 
        prev.includes(optionId) 
          ? prev.filter(id => id !== optionId)
          : [...prev, optionId]
      );
    }
  };

  /**
   * 渲染题目选项
   */
  const renderOptions = () => {
    if (!question.options) return null;

    return (
      <div className="space-y-2">
        {question.options.map((option, index) => {
          const isSelected = selectedAnswers.includes(option.id);
          const isCorrect = option.isCorrect;
          
          return (
            <div
              key={option.id}
              className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                isSelected 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 hover:border-gray-300'
              } ${
                showAnswer && isCorrect 
                  ? 'border-green-500 bg-green-50' 
                  : ''
              }`}
              onClick={() => handleAnswerSelect(option.id)}
            >
              <div className="flex items-center space-x-3">
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                  question.type === 'single_choice' ? 'rounded-full' : 'rounded'
                } ${
                  isSelected ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                }`}>
                  {isSelected && (
                    <div className="w-2 h-2 bg-white rounded-full" />
                  )}
                </div>
                <span className="flex-1">{option.content}</span>
                {showAnswer && isCorrect && (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  /**
   * 渲染编程题
   */
  const renderCodingQuestion = () => {
    return (
      <div className="space-y-4">
        {question.codeTemplate && (
          <div>
            <h4 className="font-medium mb-2">代码模板：</h4>
            <pre className="bg-gray-100 p-3 rounded-lg text-sm overflow-x-auto">
              <code>{question.codeTemplate}</code>
            </pre>
          </div>
        )}
        
        <div>
          <h4 className="font-medium mb-2">编写代码：</h4>
          <textarea
            value={codeAnswer}
            onChange={(e) => setCodeAnswer(e.target.value)}
            className="w-full h-32 p-3 border rounded-lg font-mono text-sm"
            placeholder="请在此处编写代码..."
          />
        </div>
        
        {question.testCases && question.testCases.length > 0 && (
          <div>
            <h4 className="font-medium mb-2">测试用例：</h4>
            <div className="space-y-2">
              {question.testCases.map((testCase, index) => (
                <div key={index} className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-sm">
                    <span className="font-medium">输入：</span>
                    <code className="ml-2">{testCase.input}</code>
                  </div>
                  {showAnswer && (
                    <div className="text-sm mt-1">
                      <span className="font-medium">期望输出：</span>
                      <code className="ml-2">{testCase.expectedOutput}</code>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  /**
   * 渲染题目内容
   */
  const renderQuestionContent = () => {
    switch (question.type) {
      case 'single_choice':
      case 'multiple_choice':
        return renderOptions();
        
      case 'true_false':
        return (
          <div className="space-y-2">
            <Button
              variant={selectedAnswers.includes('true') ? 'default' : 'outline'}
              onClick={() => handleAnswerSelect('true')}
              className="mr-4"
            >
              正确
            </Button>
            <Button
              variant={selectedAnswers.includes('false') ? 'default' : 'outline'}
              onClick={() => handleAnswerSelect('false')}
            >
              错误
            </Button>
            {showAnswer && question.correctAnswer && (
              <div className="mt-2 text-sm text-green-600">
                正确答案：{question.correctAnswer === 'true' ? '正确' : '错误'}
              </div>
            )}
          </div>
        );
        
      case 'fill_blank':
        return (
          <div className="space-y-2">
            <input
              type="text"
              value={fillBlankAnswer}
              onChange={(e) => setFillBlankAnswer(e.target.value)}
              className="w-full p-2 border rounded-lg"
              placeholder="请输入答案..."
            />
            {showAnswer && question.correctAnswer && (
              <div className="text-sm text-green-600">
                正确答案：{question.correctAnswer}
              </div>
            )}
          </div>
        );
        
      case 'short_answer':
        return (
          <div className="space-y-2">
            <textarea
              value={shortAnswer}
              onChange={(e) => setShortAnswer(e.target.value)}
              className="w-full h-24 p-2 border rounded-lg"
              placeholder="请输入答案..."
            />
            {showAnswer && question.correctAnswer && (
              <div className="text-sm text-green-600">
                参考答案：{question.correctAnswer}
              </div>
            )}
          </div>
        );
        
      case 'coding':
        return renderCodingQuestion();
        
      default:
        return <div className="text-gray-500">未知题目类型</div>;
    }
  };

  // 实时验证
  useEffect(() => {
    if (enableValidation) {
      const result = validateQuestion();
      setValidationResult(result);
      onValidationChange?.(result);
    }
  }, [question, enableValidation, onValidationChange]);

  return (
    <div className="space-y-4">
      {mode === 'both' ? (
        <Tabs defaultValue="preview" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="preview" className="flex items-center space-x-2">
              <Eye className="w-4 h-4" />
              <span>预览</span>
            </TabsTrigger>
            <TabsTrigger value="validation" className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4" />
              <span>验证</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="preview">
            <QuestionPreviewContent />
          </TabsContent>
          
          <TabsContent value="validation">
            <ValidationContent />
          </TabsContent>
        </Tabs>
      ) : mode === 'preview' ? (
        <QuestionPreviewContent />
      ) : (
        <ValidationContent />
      )}
    </div>
  );

  /**
   * 题目预览内容
   */
  function QuestionPreviewContent() {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <FileText className="w-5 h-5" />
              <span>{question.title || '未命名题目'}</span>
            </CardTitle>
            <div className="flex items-center space-x-2">
              {question.type && (
                <Badge variant="outline">
                  {typeLabels[question.type]}
                </Badge>
              )}
              {question.difficulty && (
                <Badge className={difficultyColors[question.difficulty]}>
                  {question.difficulty}
                </Badge>
              )}
            </div>
          </div>
          
          {(question.category || question.tags) && (
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              {question.category && (
                <span>分类：{question.category}</span>
              )}
              {question.tags && question.tags.length > 0 && (
                <div className="flex items-center space-x-1">
                  <span>标签：</span>
                  {question.tags.map((tag, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardHeader>
        
        <CardContent className="space-y-4">
          {question.content && (
            <div className="prose max-w-none">
              <p>{question.content}</p>
            </div>
          )}
          
          {renderQuestionContent()}
          
          {question.explanation && showAnswer && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>解析：</strong>{question.explanation}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    );
  }

  /**
   * 验证内容
   */
  function ValidationContent() {
    if (!validationResult) return null;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            {validationResult.isValid ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : (
              <XCircle className="w-5 h-5 text-red-500" />
            )}
            <span>
              验证结果 - {validationResult.isValid ? '通过' : '失败'}
            </span>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {validationResult.errors.length > 0 && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  <strong>错误：</strong>
                  <ul className="list-disc list-inside space-y-1">
                    {validationResult.errors.map((error, index) => (
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
                    {validationResult.warnings.map((warning, index) => (
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
  }
};

export default QuestionPreview;