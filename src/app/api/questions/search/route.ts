/**
 * 题目搜索API路由
 * 提供高级搜索和全文搜索功能
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
 * POST /api/questions/search
 * 高级搜索题目
 * 
 * @param request - Next.js请求对象
 * @returns 搜索结果响应
 * 
 * @example
 * POST /api/questions/search
 * {
 *   "query": "JavaScript",
 *   "filters": {
 *     "types": ["single_choice", "multiple_choice"],
 *     "difficulties": ["beginner", "intermediate"],
 *     "categories": ["编程语言"],
 *     "tags": ["JavaScript", "基础"],
 *     "dateRange": {
 *       "start": "2024-01-01",
 *       "end": "2024-12-31"
 *     }
 *   },
 *   "sort": {
 *     "field": "created_at",
 *     "order": "desc"
 *   },
 *   "pagination": {
 *     "page": 1,
 *     "limit": 20
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, filters = {}, sort = {}, pagination = {} } = body;
    
    // 构建搜索参数
    const searchParams = {
      search: query,
      type: filters.types?.[0], // 暂时只支持单个类型过滤
      difficulty: filters.difficulties?.[0], // 暂时只支持单个难度过滤
      category: filters.categories?.[0], // 暂时只支持单个分类过滤
      tags: filters.tags,
      sortBy: sort.field || 'created_at',
      sortOrder: sort.order || 'desc',
      page: pagination.page || 1,
      limit: pagination.limit || 20
    };
    
    // 执行搜索
    const result = await questionService.searchQuestions(searchParams);
    
    return NextResponse.json({
      success: true,
      data: result,
      message: '搜索题目成功'
    });
  } catch (error) {
    console.error('搜索题目失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: '搜索题目失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/questions/search
 * 简单搜索题目（通过查询参数）
 * 
 * @param request - Next.js请求对象
 * @returns 搜索结果响应
 * 
 * @example
 * GET /api/questions/search?q=JavaScript&type=single_choice&difficulty=beginner
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // 构建搜索参数
    const params = {
      search: searchParams.get('q') || undefined,
      type: searchParams.get('type') as any || undefined,
      difficulty: searchParams.get('difficulty') as any || undefined,
      category: searchParams.get('category') || undefined,
      tags: searchParams.get('tags')?.split(',') || undefined,
      sortBy: searchParams.get('sortBy') || 'created_at',
      sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc',
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20')
    };
    
    // 执行搜索
    const result = await questionService.searchQuestions(params);
    
    return NextResponse.json({
      success: true,
      data: result,
      message: '搜索题目成功'
    });
  } catch (error) {
    console.error('搜索题目失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: '搜索题目失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}