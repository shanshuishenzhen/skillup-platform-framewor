'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Code,
  FileText,
  HelpCircle
} from 'lucide-react';
import { Question, QuestionOption } from '@/types/question';
import { cn } from '@/lib/utils';

interface QuestionRendererProps {
  /** 题目数据 */
  question: Question;
  /** 当前答案 */
  answer?: any;
  /** 答案变化回调 */
  onAnswerChange: (answer: any) => void;
  /** 是否显示正确答案（复习模式） */
  showCorrectAnswer?: boolean;
  /** 是否显示解析 */
  showExplanation?: boolean;
  /** 是否只读模式 */
  readonly?: boolean;
  /** 题目序号 */
  questionNumber?: number;
  /** 是否显示分值 */
  showPoints?: boolean;
  /** 自定义样式类名 */
  className?: string;
}

/**
 * 题目渲染器组件
 * 根据题目类型渲染不同的答题界面
 * 
 * @param props - 组件属性
 * @returns 题目渲染组件
 */
export default function QuestionRenderer({
  question,
  answer,
  onAnswerChange,
  showCorrectAnswer = false,
  showExplanation = false,
  readonly = false,
  questionNumber,
  showPoints = true,
  className
}: QuestionRendererProps) {
  // 本地状态管理
  const [localAnswer, setLocalAnswer] = useState(answer);
  const [isAnswered, setIsAnswered] = useState(false);

  /**
   * 处理答案变化
   * @param newAnswer - 新答案
   */
  const handleAnswerChange = (newAnswer: any) => {
    setLocalAnswer(newAnswer);
    setIsAnswered(newAnswer !== undefined && newAnswer !== null && newAnswer !== '');
    onAnswerChange(newAnswer);
  };

  /**
   * 检查答案是否正确
   * @param userAnswer - 用户答案
   * @param correctAnswer - 正确答案
   * @returns 是否正确
   */
  const isAnswerCorrect = (userAnswer: any, correctAnswer: any) => {
    if (question.type === 'multiple_choice') {
      if (!Array.isArray(userAnswer) || !Array.isArray(correctAnswer)) {
        return false;
      }
      return userAnswer.length === correctAnswer.length &&
             userAnswer.every(ans => correctAnswer.includes(ans));
    }
    
    if (question.type === 'true_false') {
      return String(userAnswer).toLowerCase() === String(correctAnswer).toLowerCase();
    }
    
    return String(userAnswer).toLowerCase().trim() === String(correctAnswer).toLowerCase().trim();
  };

  /**
   * 获取题目类型图标
   */
  const getQuestionTypeIcon = () => {
    switch (question.type) {
      case 'choice':
        return <CheckCircle className="w-5 h-5 text-blue-600" />;
      case 'multiple_choice':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'true_false':
        return <HelpCircle className="w-5 h-5 text-purple-600" />;
      case 'fill_blank':
        return <FileText className="w-5 h-5 text-orange-600" />;
      case 'short_answer':
        return <FileText className="w-5 h-5 text-yellow-600" />;
      case 'coding':
        return <Code className="w-5 h-5 text-red-600" />;
      default:
        return <HelpCircle className="w-5 h-5 text-gray-600" />;
    }
  };

  /**
   * 获取题目类型名称
   */
  const getQuestionTypeName = () => {
    switch (question.type) {
      case 'choice':
        return '单选题';
      case 'multiple_choice':
        return '多选题';
      case 'true_false':
        return '判断题';
      case 'fill_blank':
        return '填空题';
      case 'short_answer':
        return '简答题';
      case 'coding':
        return '编程题';
      default:
        return '未知题型';
    }
  };

  /**
   * 渲染单选题
   */
  const renderChoiceQuestion = () => (
    <RadioGroup
      value={localAnswer || ''}
      onValueChange={handleAnswerChange}
      disabled={readonly}
      className="space-y-3"
    >
      {question.options?.map((option, index) => {
        const isSelected = localAnswer === option.id || localAnswer === option.text;
        const isCorrect = showCorrectAnswer && 
          (question.correct_answer === option.id || question.correct_answer === option.text);
        const isWrong = showCorrectAnswer && isSelected && !isCorrect;
        
        return (
          <div key={option.id || index} className={cn(
            "flex items-center space-x-3 p-3 rounded-lg border transition-colors",
            isSelected && !showCorrectAnswer && "bg-blue-50 border-blue-200",
            isCorrect && showCorrectAnswer && "bg-green-50 border-green-200",
            isWrong && "bg-red-50 border-red-200",
            !isSelected && !isCorrect && "hover:bg-gray-50"
          )}>
            <RadioGroupItem value={option.id || option.text} id={`option-${index}`} />
            <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer">
              {option.text}
            </Label>
            {showCorrectAnswer && isCorrect && (
              <CheckCircle className="w-5 h-5 text-green-600" />
            )}
            {showCorrectAnswer && isWrong && (
              <XCircle className="w-5 h-5 text-red-600" />
            )}
          </div>
        );
      })}
    </RadioGroup>
  );

  /**
   * 渲染多选题
   */
  const renderMultipleChoiceQuestion = () => {
    const selectedAnswers = Array.isArray(localAnswer) ? localAnswer : [];
    
    return (
      <div className="space-y-3">
        {question.options?.map((option, index) => {
          const isSelected = selectedAnswers.includes(option.id) || selectedAnswers.includes(option.text);
          const correctAnswers = Array.isArray(question.correct_answer) ? question.correct_answer : [];
          const isCorrect = showCorrectAnswer && 
            (correctAnswers.includes(option.id) || correctAnswers.includes(option.text));
          const isWrong = showCorrectAnswer && isSelected && !isCorrect;
          
          return (
            <div key={option.id || index} className={cn(
              "flex items-center space-x-3 p-3 rounded-lg border transition-colors",
              isSelected && !showCorrectAnswer && "bg-blue-50 border-blue-200",
              isCorrect && showCorrectAnswer && "bg-green-50 border-green-200",
              isWrong && "bg-red-50 border-red-200",
              !isSelected && !isCorrect && "hover:bg-gray-50"
            )}>
              <Checkbox
                id={`option-${index}`}
                checked={isSelected}
                onCheckedChange={(checked) => {
                  if (readonly) return;
                  
                  const optionValue = option.id || option.text;
                  let newAnswers;
                  
                  if (checked) {
                    newAnswers = [...selectedAnswers, optionValue];
                  } else {
                    newAnswers = selectedAnswers.filter(ans => ans !== optionValue);
                  }
                  
                  handleAnswerChange(newAnswers);
                }}
                disabled={readonly}
              />
              <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer">
                {option.text}
              </Label>
              {showCorrectAnswer && isCorrect && (
                <CheckCircle className="w-5 h-5 text-green-600" />
              )}
              {showCorrectAnswer && isWrong && (
                <XCircle className="w-5 h-5 text-red-600" />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  /**
   * 渲染判断题
   */
  const renderTrueFalseQuestion = () => (
    <RadioGroup
      value={localAnswer || ''}
      onValueChange={handleAnswerChange}
      disabled={readonly}
      className="space-y-3"
    >
      {['true', 'false'].map((value) => {
        const isSelected = localAnswer === value || String(localAnswer) === value;
        const isCorrect = showCorrectAnswer && String(question.correct_answer) === value;
        const isWrong = showCorrectAnswer && isSelected && !isCorrect;
        
        return (
          <div key={value} className={cn(
            "flex items-center space-x-3 p-3 rounded-lg border transition-colors",
            isSelected && !showCorrectAnswer && "bg-blue-50 border-blue-200",
            isCorrect && showCorrectAnswer && "bg-green-50 border-green-200",
            isWrong && "bg-red-50 border-red-200",
            !isSelected && !isCorrect && "hover:bg-gray-50"
          )}>
            <RadioGroupItem value={value} id={`tf-${value}`} />
            <Label htmlFor={`tf-${value}`} className="flex-1 cursor-pointer">
              {value === 'true' ? '正确' : '错误'}
            </Label>
            {showCorrectAnswer && isCorrect && (
              <CheckCircle className="w-5 h-5 text-green-600" />
            )}
            {showCorrectAnswer && isWrong && (
              <XCircle className="w-5 h-5 text-red-600" />
            )}
          </div>
        );
      })}
    </RadioGroup>
  );

  /**
   * 渲染填空题
   */
  const renderFillBlankQuestion = () => {
    const isCorrect = showCorrectAnswer && 
      isAnswerCorrect(localAnswer, question.correct_answer);
    const isWrong = showCorrectAnswer && localAnswer && !isCorrect;
    
    return (
      <div className="space-y-3">
        <Input
          value={localAnswer || ''}
          onChange={(e) => handleAnswerChange(e.target.value)}
          placeholder="请输入答案..."
          disabled={readonly}
          className={cn(
            isCorrect && "border-green-500 bg-green-50",
            isWrong && "border-red-500 bg-red-50"
          )}
        />
        {showCorrectAnswer && (
          <div className="p-3 rounded-lg bg-green-50 border border-green-200">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-800">正确答案：</span>
              <span className="text-sm text-green-700">{question.correct_answer}</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  /**
   * 渲染简答题
   */
  const renderShortAnswerQuestion = () => (
    <div className="space-y-3">
      <Textarea
        value={localAnswer || ''}
        onChange={(e) => handleAnswerChange(e.target.value)}
        placeholder="请输入您的答案..."
        disabled={readonly}
        rows={4}
        className="min-h-[100px]"
      />
      {showCorrectAnswer && question.correct_answer && (
        <div className="p-3 rounded-lg bg-green-50 border border-green-200">
          <div className="flex items-start space-x-2">
            <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
            <div>
              <span className="text-sm font-medium text-green-800">参考答案：</span>
              <p className="text-sm text-green-700 mt-1">{question.correct_answer}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  /**
   * 渲染编程题
   */
  const renderCodingQuestion = () => (
    <div className="space-y-3">
      <Textarea
        value={localAnswer || ''}
        onChange={(e) => handleAnswerChange(e.target.value)}
        placeholder="请输入您的代码..."
        disabled={readonly}
        rows={8}
        className="min-h-[200px] font-mono text-sm"
      />
      {question.test_cases && (
        <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
          <div className="flex items-start space-x-2">
            <Code className="w-4 h-4 text-blue-600 mt-0.5" />
            <div>
              <span className="text-sm font-medium text-blue-800">测试用例：</span>
              <pre className="text-sm text-blue-700 mt-1 whitespace-pre-wrap">
                {question.test_cases}
              </pre>
            </div>
          </div>
        </div>
      )}
      {showCorrectAnswer && question.correct_answer && (
        <div className="p-3 rounded-lg bg-green-50 border border-green-200">
          <div className="flex items-start space-x-2">
            <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
            <div>
              <span className="text-sm font-medium text-green-800">参考代码：</span>
              <pre className="text-sm text-green-700 mt-1 whitespace-pre-wrap font-mono">
                {question.correct_answer}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  /**
   * 渲染题目内容
   */
  const renderQuestionContent = () => {
    switch (question.type) {
      case 'choice':
        return renderChoiceQuestion();
      case 'multiple_choice':
        return renderMultipleChoiceQuestion();
      case 'true_false':
        return renderTrueFalseQuestion();
      case 'fill_blank':
        return renderFillBlankQuestion();
      case 'short_answer':
        return renderShortAnswerQuestion();
      case 'coding':
        return renderCodingQuestion();
      default:
        return (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              不支持的题目类型：{question.type}
            </AlertDescription>
          </Alert>
        );
    }
  };

  // 同步外部答案变化
  useEffect(() => {
    setLocalAnswer(answer);
    setIsAnswered(answer !== undefined && answer !== null && answer !== '');
  }, [answer]);

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="flex items-center space-x-3">
              {questionNumber && (
                <span className="text-lg font-bold text-gray-600">
                  {questionNumber}.
                </span>
              )}
              <div className="flex items-center space-x-2">
                {getQuestionTypeIcon()}
                <span>{getQuestionTypeName()}</span>
              </div>
            </CardTitle>
            
            <div className="flex items-center space-x-2 mt-2">
              {showPoints && (
                <Badge variant="outline">
                  {question.points || 1} 分
                </Badge>
              )}
              {question.difficulty && (
                <Badge variant={question.difficulty === 'easy' ? 'default' : 
                              question.difficulty === 'medium' ? 'secondary' : 'destructive'}>
                  {question.difficulty === 'easy' ? '简单' :
                   question.difficulty === 'medium' ? '中等' : '困难'}
                </Badge>
              )}
              {isAnswered && !readonly && (
                <Badge variant="outline" className="bg-green-50 text-green-700">
                  已作答
                </Badge>
              )}
            </div>
          </div>
        </div>
        
        <div className="mt-4">
          <p className="text-gray-700 leading-relaxed">{question.content}</p>
          {question.image_url && (
            <div className="mt-3">
              <img 
                src={question.image_url} 
                alt="题目图片" 
                className="max-w-full h-auto rounded-lg border"
              />
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        {renderQuestionContent()}
        
        {showExplanation && question.explanation && (
          <div className="mt-6 p-4 rounded-lg bg-blue-50 border border-blue-200">
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5" />
              <div>
                <span className="text-sm font-medium text-blue-800">解析：</span>
                <p className="text-sm text-blue-700 mt-1">{question.explanation}</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}