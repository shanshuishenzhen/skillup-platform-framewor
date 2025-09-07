/**
 * 题目统计API路由
 * 提供题目统计分析功能
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
 * GET /api/questions/stats
 * 获取题目统计信息
 * 
 * @param request - Next.js请求对象
 * @returns 统计信息响应
 * 
 * @example
 * GET /api/questions/stats?category=编程语言&examId=123
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // 获取查询参数
    const category = searchParams.get('category') || undefined;
    const examId = searchParams.get('examId') || undefined;
    const createdBy = searchParams.get('createdBy') || undefined;
    
    // 获取题目统计信息
    const stats = await questionService.getQuestionStats({
      category,
      examId,
      createdBy
    });
    
    return NextResponse.json({
      success: true,
      data: stats,
      message: '获取题目统计成功'
    });
  } catch (error) {
    console.error('获取题目统计失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: '获取题目统计失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}