/**
 * 考试管理API路由
 * 处理考试的CRUD操作和相关业务逻辑
 * 
 * @author SOLO Coding
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { ExamService } from '@/services/examService';
import { CreateExamRequest, ExamQueryParams } from '@/types/exam';
import { supabaseAdmin } from '@/lib/supabase';

// 初始化考试服务
const examService = new ExamService(supabaseAdmin);

/**
 * GET /api/exams
 * 获取考试列表
 * 
 * @param request - Next.js请求对象
 * @returns 考试列表响应
 * 
 * @example
 * GET /api/exams?search=javascript&difficulty=intermediate&page=1&limit=10
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // 构建查询参数
    const queryParams: ExamQueryParams = {
      search: searchParams.get('search') || undefined,
      status: searchParams.get('status') as any || undefined,
      difficulty: searchParams.get('difficulty') as any || undefined,
      category: searchParams.get('category') || undefined,
      tags: searchParams.get('tags')?.split(',') || undefined,
      createdBy: searchParams.get('createdBy') || undefined,
      sortBy: searchParams.get('sortBy') || 'created_at',
      sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc',
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20')
    };

    // 获取考试列表
    const result = await examService.getExams(queryParams);
    
    return NextResponse.json({
      success: true,
      data: result,
      message: '获取考试列表成功'
    });
  } catch (error) {
    console.error('获取考试列表失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: '获取考试列表失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/exams
 * 创建新考试
 * 
 * @param request - Next.js请求对象
 * @returns 创建结果响应
 * 
 * @example
 * POST /api/exams
 * {
 *   "title": "JavaScript基础考试",
 *   "description": "测试JavaScript基础知识",
 *   "difficulty": "intermediate",
 *   "duration": 60,
 *   "totalQuestions": 20,
 *   "passingScore": 70
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // 解析请求体
    const body: CreateExamRequest = await request.json();
    
    // 验证必填字段
    if (!body.title || !body.description || !body.difficulty) {
      return NextResponse.json(
        {
          success: false,
          error: '缺少必填字段',
          details: '标题、描述和难度为必填字段'
        },
        { status: 400 }
      );
    }

    // 验证数值字段
    if (body.duration <= 0 || body.totalQuestions <= 0 || body.passingScore < 0 || body.passingScore > 100) {
      return NextResponse.json(
        {
          success: false,
          error: '参数值无效',
          details: '时长和题目数必须大于0，及格分数必须在0-100之间'
        },
        { status: 400 }
      );
    }

    // 创建考试
    const exam = await examService.createExam(body);
    
    return NextResponse.json({
      success: true,
      data: exam,
      message: '考试创建成功'
    }, { status: 201 });
  } catch (error) {
    console.error('创建考试失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: '创建考试失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/exams
 * 批量更新考试
 * 
 * @param request - Next.js请求对象
 * @returns 更新结果响应
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { ids, updates } = body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: '无效的考试ID列表'
        },
        { status: 400 }
      );
    }

    // 批量更新考试
    const results = await Promise.all(
      ids.map(id => examService.updateExam({ id, ...updates }))
    );
    
    return NextResponse.json({
      success: true,
      data: results,
      message: `成功更新${results.length}个考试`
    });
  } catch (error) {
    console.error('批量更新考试失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: '批量更新考试失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/exams
 * 批量删除考试
 * 
 * @param request - Next.js请求对象
 * @returns 删除结果响应
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const idsParam = searchParams.get('ids');
    
    if (!idsParam) {
      return NextResponse.json(
        {
          success: false,
          error: '缺少考试ID参数'
        },
        { status: 400 }
      );
    }

    const ids = idsParam.split(',');
    
    // 批量删除考试
    const results = await Promise.all(
      ids.map(id => examService.deleteExam(id))
    );
    
    return NextResponse.json({
      success: true,
      data: { deletedCount: results.length },
      message: `成功删除${results.length}个考试`
    });
  } catch (error) {
    console.error('批量删除考试失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: '批量删除考试失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}