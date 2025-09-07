'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, Download, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { ExamService } from '@/services/examService';
import { QuestionType } from '@/types/question';
import { ExamDifficulty } from '@/types/exam';

interface QuestionImportProps {
  examId: string;
  onImportComplete?: (count: number) => void;
}

interface ImportQuestion {
  type: QuestionType;
  content: string;
  options?: string[];
  correct_answer: string | string[];
  explanation?: string;
  difficulty: ExamDifficulty;
  score: number;
  tags?: string[];
}

interface ImportResult {
  success: number;
  failed: number;
  errors: string[];
}

/**
 * 题目批量导入组件
 * 支持Excel、JSON格式的题目批量导入
 * @param examId 考试ID
 * @param onImportComplete 导入完成回调
 */
export default function QuestionImport({ examId, onImportComplete }: QuestionImportProps) {
  const [importType, setImportType] = useState<'file' | 'json'>('file');
  const [jsonContent, setJsonContent] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * 解析CSV/Excel文件内容
   * @param content 文件内容
   * @returns 解析后的题目数组
   */
  const parseCSVContent = (content: string): ImportQuestion[] => {
    const lines = content.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    
    const questions: ImportQuestion[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
      
      if (values.length < headers.length) continue;
      
      const question: any = {};
      headers.forEach((header, index) => {
        question[header] = values[index];
      });
      
      // 转换为标准格式
      const importQuestion: ImportQuestion = {
        type: question.type as QuestionType || QuestionType.SINGLE_CHOICE,
        content: question.content || question.question || '',
        difficulty: question.difficulty as ExamDifficulty || ExamDifficulty.INTERMEDIATE,
        score: parseInt(question.score) || 1,
        correct_answer: question.correct_answer || question.answer || '',
        explanation: question.explanation || '',
        tags: question.tags ? question.tags.split(';') : []
      };
      
      // 处理选择题选项
      if (question.options) {
        importQuestion.options = question.options.split(';');
      } else {
        // 从option1, option2等字段构建选项
        const options = [];
        for (let j = 1; j <= 10; j++) {
          const optionKey = `option${j}`;
          if (question[optionKey]) {
            options.push(question[optionKey]);
          }
        }
        if (options.length > 0) {
          importQuestion.options = options;
        }
      }
      
      // 处理多选题答案
      if (importQuestion.type === QuestionType.MULTIPLE_CHOICE) {
        if (typeof importQuestion.correct_answer === 'string') {
          importQuestion.correct_answer = importQuestion.correct_answer.split(';');
        }
      }
      
      questions.push(importQuestion);
    }
    
    return questions;
  };

  /**
   * 解析JSON内容
   * @param content JSON字符串
   * @returns 解析后的题目数组
   */
  const parseJSONContent = (content: string): ImportQuestion[] => {
    try {
      const data = JSON.parse(content);
      
      if (!Array.isArray(data)) {
        throw new Error('JSON格式错误：根元素必须是数组');
      }
      
      return data.map((item, index) => {
        if (!item.content) {
          throw new Error(`第${index + 1}题缺少题目内容`);
        }
        
        return {
          type: item.type || QuestionType.SINGLE_CHOICE,
          content: item.content,
          options: item.options || [],
          correct_answer: item.correct_answer || item.answer || '',
          explanation: item.explanation || '',
          difficulty: item.difficulty || ExamDifficulty.INTERMEDIATE,
          score: item.score || 1,
          tags: item.tags || []
        };
      });
    } catch (error) {
      throw new Error(`JSON解析失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  /**
   * 验证题目数据
   * @param question 题目数据
   * @returns 验证结果
   */
  const validateQuestion = (question: ImportQuestion): string | null => {
    if (!question.content?.trim()) {
      return '题目内容不能为空';
    }
    
    if (question.score <= 0) {
      return '题目分数必须大于0';
    }
    
    // 选择题必须有选项
    if ([QuestionType.SINGLE_CHOICE, QuestionType.MULTIPLE_CHOICE].includes(question.type)) {
      if (!question.options || question.options.length < 2) {
        return '选择题至少需要2个选项';
      }
    }
    
    // 判断题答案必须是true/false
    if (question.type === QuestionType.TRUE_FALSE) {
      const answer = String(question.correct_answer).toLowerCase();
      if (!['true', 'false', '正确', '错误', '是', '否'].includes(answer)) {
        return '判断题答案必须是true/false或正确/错误';
      }
    }
    
    return null;
  };

  /**
   * 处理文件上传
   * @param event 文件选择事件
   */
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    
    if (!['csv', 'json', 'txt'].includes(fileExtension || '')) {
      toast.error('仅支持CSV、JSON、TXT格式文件');
      return;
    }
    
    try {
      const content = await file.text();
      let questions: ImportQuestion[];
      
      if (fileExtension === 'json') {
        questions = parseJSONContent(content);
      } else {
        questions = parseCSVContent(content);
      }
      
      await importQuestions(questions);
    } catch (error) {
      toast.error(`文件解析失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  /**
   * 处理JSON导入
   */
  const handleJSONImport = async () => {
    if (!jsonContent.trim()) {
      toast.error('请输入JSON内容');
      return;
    }
    
    try {
      const questions = parseJSONContent(jsonContent);
      await importQuestions(questions);
    } catch (error) {
      toast.error(`JSON解析失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  /**
   * 批量导入题目
   * @param questions 题目数组
   */
  const importQuestions = async (questions: ImportQuestion[]) => {
    if (questions.length === 0) {
      toast.error('没有找到有效的题目数据');
      return;
    }
    
    setIsImporting(true);
    setImportProgress(0);
    setImportResult(null);
    
    const result: ImportResult = {
      success: 0,
      failed: 0,
      errors: []
    };
    
    try {
      for (let i = 0; i < questions.length; i++) {
        const question = questions[i];
        
        // 验证题目数据
        const validationError = validateQuestion(question);
        if (validationError) {
          result.failed++;
          result.errors.push(`第${i + 1}题: ${validationError}`);
          continue;
        }
        
        try {
          // 转换为API格式
          const questionData = {
            type: question.type,
            content: question.content,
            options: question.options || [],
            correct_answer: question.correct_answer,
            explanation: question.explanation || '',
            difficulty: question.difficulty,
            score: question.score,
            tags: question.tags || []
          };
          
          // 调用API创建题目
          await fetch(`/api/exams/${examId}/questions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(questionData)
          });
          
          result.success++;
        } catch (error) {
          result.failed++;
          result.errors.push(`第${i + 1}题: 创建失败 - ${error instanceof Error ? error.message : '未知错误'}`);
        }
        
        // 更新进度
        setImportProgress(((i + 1) / questions.length) * 100);
      }
      
      setImportResult(result);
      
      if (result.success > 0) {
        toast.success(`成功导入 ${result.success} 道题目`);
        onImportComplete?.(result.success);
      }
      
      if (result.failed > 0) {
        toast.warning(`${result.failed} 道题目导入失败`);
      }
    } catch (error) {
      toast.error(`导入过程中发生错误: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setIsImporting(false);
    }
  };

  /**
   * 下载模板文件
   * @param format 文件格式
   */
  const downloadTemplate = (format: 'csv' | 'json') => {
    let content = '';
    let filename = '';
    let mimeType = '';
    
    if (format === 'csv') {
      content = [
        'type,content,option1,option2,option3,option4,correct_answer,explanation,difficulty,score,tags',
        'single_choice,"以下哪个是JavaScript的数据类型？","string","number","boolean","all of the above","all of the above","JavaScript有多种基本数据类型","beginner","2","JavaScript;基础"',
        'multiple_choice,"以下哪些是前端框架？","React","Vue","Angular","Express","React;Vue;Angular","Express是后端框架","intermediate","3","前端;框架"',
        'true_false,"JavaScript是强类型语言","","","","","false","JavaScript是弱类型语言","beginner","1","JavaScript;类型"',
        'fill_blank,"JavaScript中声明变量使用关键字____","","","","","var;let;const","可以使用var、let或const声明变量","beginner","2","JavaScript;变量"',
        'essay,"请简述JavaScript的事件循环机制","","","","","事件循环是JavaScript处理异步操作的机制...","详细解释事件循环的工作原理","advanced","5","JavaScript;异步"'
      ].join('\n');
      filename = 'question_template.csv';
      mimeType = 'text/csv';
    } else {
      content = JSON.stringify([
        {
          type: 'single_choice',
          content: '以下哪个是JavaScript的数据类型？',
          options: ['string', 'number', 'boolean', 'all of the above'],
          correct_answer: 'all of the above',
          explanation: 'JavaScript有多种基本数据类型',
          difficulty: 'beginner',
          score: 2,
          tags: ['JavaScript', '基础']
        },
        {
          type: 'multiple_choice',
          content: '以下哪些是前端框架？',
          options: ['React', 'Vue', 'Angular', 'Express'],
          correct_answer: ['React', 'Vue', 'Angular'],
          explanation: 'Express是后端框架',
          difficulty: 'intermediate',
          score: 3,
          tags: ['前端', '框架']
        },
        {
          type: 'true_false',
          content: 'JavaScript是强类型语言',
          correct_answer: 'false',
          explanation: 'JavaScript是弱类型语言',
          difficulty: 'beginner',
          score: 1,
          tags: ['JavaScript', '类型']
        }
      ], null, 2);
      filename = 'question_template.json';
      mimeType = 'application/json';
    }
    
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          题目批量导入
        </CardTitle>
        <CardDescription>
          支持CSV、JSON格式的题目批量导入，可以快速创建大量考试题目
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 导入方式选择 */}
        <div className="space-y-2">
          <Label>导入方式</Label>
          <Select value={importType} onValueChange={(value: 'file' | 'json') => setImportType(value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="file">文件上传</SelectItem>
              <SelectItem value="json">JSON输入</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 模板下载 */}
        <div className="space-y-2">
          <Label>下载模板</Label>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => downloadTemplate('csv')}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              CSV模板
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => downloadTemplate('json')}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              JSON模板
            </Button>
          </div>
        </div>

        {/* 文件上传 */}
        {importType === 'file' && (
          <div className="space-y-2">
            <Label>选择文件</Label>
            <Input
              ref={fileInputRef}
              type="file"
              accept=".csv,.json,.txt"
              onChange={handleFileUpload}
              disabled={isImporting}
            />
            <p className="text-sm text-muted-foreground">
              支持CSV、JSON、TXT格式文件
            </p>
          </div>
        )}

        {/* JSON输入 */}
        {importType === 'json' && (
          <div className="space-y-2">
            <Label>JSON内容</Label>
            <Textarea
              value={jsonContent}
              onChange={(e) => setJsonContent(e.target.value)}
              placeholder="请输入JSON格式的题目数据..."
              rows={10}
              disabled={isImporting}
            />
            <Button
              onClick={handleJSONImport}
              disabled={isImporting || !jsonContent.trim()}
              className="w-full"
            >
              {isImporting ? '导入中...' : '开始导入'}
            </Button>
          </div>
        )}

        {/* 导入进度 */}
        {isImporting && (
          <div className="space-y-2">
            <Label>导入进度</Label>
            <Progress value={importProgress} className="w-full" />
            <p className="text-sm text-muted-foreground text-center">
              {Math.round(importProgress)}%
            </p>
          </div>
        )}

        {/* 导入结果 */}
        {importResult && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  成功导入: {importResult.success} 道题目
                </AlertDescription>
              </Alert>
              {importResult.failed > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    导入失败: {importResult.failed} 道题目
                  </AlertDescription>
                </Alert>
              )}
            </div>
            
            {importResult.errors.length > 0 && (
              <div className="space-y-2">
                <Label>错误详情</Label>
                <div className="max-h-40 overflow-y-auto bg-muted p-3 rounded text-sm">
                  {importResult.errors.map((error, index) => (
                    <div key={index} className="text-destructive">
                      {error}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 使用说明 */}
        <Alert>
          <FileText className="h-4 w-4" />
          <AlertDescription>
            <strong>使用说明：</strong>
            <ul className="mt-2 space-y-1 text-sm">
              <li>• 题目类型：single_choice(单选)、multiple_choice(多选)、true_false(判断)、fill_blank(填空)、essay(问答)</li>
              <li>• 难度等级：beginner(初级)、intermediate(中级)、advanced(高级)</li>
              <li>• 多选题答案用分号分隔，如："A;B;C"</li>
              <li>• 选项用分号分隔，如："选项1;选项2;选项3"</li>
              <li>• 标签用分号分隔，如："JavaScript;基础;语法"</li>
            </ul>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}