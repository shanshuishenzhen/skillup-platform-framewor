/**
 * 题目复制API路由
 * 提供题目复制功能
 * 
 * @author SOLO Coding
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { QuestionService } from '@/services/questionService';
import { supabaseAdmin } from '@/lib/supabase';

// 初始化题目服务
const questionService = new QuestionService(supabaseAdmin);

/**
 * POST /api/questions/[id]/duplicate
 * 复制题目
 * 
 * @param request - Next.js请求对象
 * @param params - 路由参数
 * @returns 复制结果响应
 * 
 * @example
 * POST /api/questions/123/duplicate
 * {
 *   "title": "复制的题目标题",
 *   "examId": "456"
 * }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { title, examId, ...overrides } = body;
    
    // 验证原题目是否存在
    const originalQuestion = await questionService.getQuestionById(params.id, true);
    if (!originalQuestion) {
      return NextResponse.json(
        {
          success: false,
          error: '原题目不存在'
        },
        { status: 404 }
      );
    }
    
    // 复制题目
    const duplicatedQuestion = await questionService.duplicateQuestion(
      params.id,
      {
        title: title || `${originalQuestion.title} (副本)`,
        examId,
        ...overrides
      }
    );
    
    return NextResponse.json({
      success: true,
      data: duplicatedQuestion,
      message: '题目复制成功'
    }, { status: 201 });
  } catch (error) {
    console.error('复制题目失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: '复制题目失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}