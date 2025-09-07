import { NextRequest, NextResponse } from 'next/server';
import { examService } from '@/services/examService';

/**
 * POST /api/exams/[id]/archive
 * 归档考试
 * 
 * @param request - Next.js请求对象
 * @param params - 路由参数
 * @returns 归档结果响应
 * 
 * @example
 * POST /api/exams/123e4567-e89b-12d3-a456-426614174000/archive
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: '缺少考试ID参数'
        },
        { status: 400 }
      );
    }

    // 验证考试是否存在
    const existingExam = await examService.getExamById(id);
    if (!existingExam) {
      return NextResponse.json(
        {
          success: false,
          error: '考试不存在'
        },
        { status: 404 }
      );
    }

    // 归档考试
    const updatedExam = await examService.archiveExam(id);
    
    return NextResponse.json({
      success: true,
      data: updatedExam,
      message: '考试归档成功'
    });
  } catch (error) {
    console.error('归档考试失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: '归档考试失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}