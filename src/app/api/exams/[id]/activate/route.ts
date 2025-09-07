import { NextRequest, NextResponse } from 'next/server';
import { examService } from '@/services/examService';

/**
 * POST /api/exams/[id]/activate
 * 激活考试
 * 
 * @param request - Next.js请求对象
 * @param params - 路由参数
 * @returns 激活结果响应
 * 
 * @example
 * POST /api/exams/123e4567-e89b-12d3-a456-426614174000/activate
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

    // 激活考试
    const updatedExam = await examService.activateExam(id);
    
    return NextResponse.json({
      success: true,
      data: updatedExam,
      message: '考试激活成功'
    });
  } catch (error) {
    console.error('激活考试失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: '激活考试失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}