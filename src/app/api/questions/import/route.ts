/**
 * 题目批量导入API路由
 * 提供题目批量导入功能
 * 
 * @author SOLO Coding
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { QuestionService } from '@/services/questionService';
import { supabaseAdmin } from '@/lib/supabase';
import { QuestionImportData } from '@/types/question';

// 初始化题目服务
const questionService = new QuestionService(supabaseAdmin);

/**
 * POST /api/questions/import
 * 批量导入题目
 * 
 * @param request - Next.js请求对象
 * @returns 导入结果响应
 * 
 * @example
 * POST /api/questions/import
 * {
 *   "questions": [
 *     {
 *       "type": "single_choice",
 *       "title": "JavaScript变量声明",
 *       "content": "以下哪种方式可以声明JavaScript变量？",
 *       "difficulty": "beginner",
 *       "category": "编程语言",
 *       "tags": ["JavaScript", "基础"],
 *       "options": [
 *         { "id": "A", "content": "var x = 1;", "isCorrect": true },
 *         { "id": "B", "content": "variable x = 1;", "isCorrect": false }
 *       ]
 *     }
 *   ],
 *   "examId": "123",
 *   "validateOnly": false
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { questions, examId, validateOnly = false } = body;
    
    // 验证请求数据
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: '无效的题目数据',
          details: '题目列表不能为空'
        },
        { status: 400 }
      );
    }
    
    // 验证题目数量限制
    if (questions.length > 1000) {
      return NextResponse.json(
        {
          success: false,
          error: '题目数量超出限制',
          details: '单次导入题目数量不能超过1000个'
        },
        { status: 400 }
      );
    }
    
    // 如果只是验证，不执行实际导入
    if (validateOnly) {
      const validationResults = [];
      
      for (let i = 0; i < questions.length; i++) {
        const question = questions[i];
        const validation = validateQuestionData(question, i + 1);
        validationResults.push(validation);
      }
      
      const hasErrors = validationResults.some(result => !result.isValid);
      
      return NextResponse.json({
        success: true,
        data: {
          isValid: !hasErrors,
          validationResults,
          totalQuestions: questions.length,
          validQuestions: validationResults.filter(r => r.isValid).length,
          invalidQuestions: validationResults.filter(r => !r.isValid).length
        },
        message: hasErrors ? '题目验证完成，发现错误' : '题目验证通过'
      });
    }
    
    // 执行批量导入
    const importData: QuestionImportData[] = questions.map((q: any) => ({
      ...q,
      examId: examId || undefined
    }));
    
    const result = await questionService.batchImportQuestions(importData);
    
    return NextResponse.json({
      success: true,
      data: result,
      message: `成功导入${result.successCount}个题目`
    }, { status: 201 });
  } catch (error) {
    console.error('批量导入题目失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: '批量导入题目失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}

/**
 * 验证题目数据
 * 
 * @param question - 题目数据
 * @param index - 题目索引（用于错误提示）
 * @returns 验证结果
 */
function validateQuestionData(question: any, index: number) {
  const errors: string[] = [];
  
  // 验证必填字段
  if (!question.type) {
    errors.push('题目类型不能为空');
  } else if (!['single_choice', 'multiple_choice', 'true_false', 'fill_blank', 'short_answer', 'coding'].includes(question.type)) {
    errors.push('无效的题目类型');
  }
  
  if (!question.title || typeof question.title !== 'string' || question.title.trim().length === 0) {
    errors.push('题目标题不能为空');
  }
  
  if (!question.content || typeof question.content !== 'string' || question.content.trim().length === 0) {
    errors.push('题目内容不能为空');
  }
  
  if (!question.difficulty) {
    errors.push('题目难度不能为空');
  } else if (!['beginner', 'intermediate', 'advanced', 'expert'].includes(question.difficulty)) {
    errors.push('无效的题目难度');
  }
  
  // 根据题目类型验证特定字段
  if (question.type === 'single_choice' || question.type === 'multiple_choice') {
    if (!question.options || !Array.isArray(question.options) || question.options.length < 2) {
      errors.push('选择题必须提供至少2个选项');
    } else {
      const correctOptions = question.options.filter((opt: any) => opt.isCorrect);
      if (correctOptions.length === 0) {
        errors.push('选择题必须至少有一个正确答案');
      }
      if (question.type === 'single_choice' && correctOptions.length > 1) {
        errors.push('单选题只能有一个正确答案');
      }
    }
  }
  
  if (question.type === 'coding') {
    if (!question.testCases || !Array.isArray(question.testCases) || question.testCases.length === 0) {
      errors.push('编程题必须提供测试用例');
    }
  }
  
  if (question.type === 'fill_blank') {
    if (!question.correctAnswer || typeof question.correctAnswer !== 'string') {
      errors.push('填空题必须提供正确答案');
    }
  }
  
  if (question.type === 'short_answer') {
    if (!question.correctAnswer || typeof question.correctAnswer !== 'string') {
      errors.push('简答题必须提供参考答案');
    }
  }
  
  return {
    isValid: errors.length === 0,
    questionIndex: index,
    errors
  };
}