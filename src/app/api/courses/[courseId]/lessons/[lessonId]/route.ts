import { NextRequest, NextResponse } from 'next/server';
import { courseService } from '@/services/courseService';
import { verifyToken } from '@/services/userService';

/**
 * 课时详情API接口
 * 处理单个课时的查询和管理
 */

/**
 * GET /api/courses/[courseId]/lessons/[lessonId]
 * 获取课时详情
 * 路径参数:
 * - courseId: 课程ID
 * - lessonId: 课时ID
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ courseId: string; lessonId: string }> }
) {
  try {
    const { courseId, lessonId } = await context.params;
    
    // 验证用户身份（可选，根据课程是否需要登录访问）
    const authHeader = request.headers.get('authorization');
    let userId: string | null = null;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const userResult = await verifyToken(token);
      
      if (userResult.success && userResult.data) {
        userId = userResult.data.id;
      }
    }
    
    // 使用 userId 进行后续处理
    console.log('User ID:', userId);
    
    // 从认证中获取用户ID
    // const userId = 'user123';
    
    // 获取课时详情
    const lessonResult = await courseService.getLessonById(courseId, lessonId);
    
    if (!lessonResult.success) {
      return NextResponse.json(
        { success: false, message: lessonResult.message },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: lessonResult.data
    });
    
  } catch (error) {
    console.error('获取课时详情失败:', error);
    return NextResponse.json(
      { success: false, message: '服务器内部错误' },
      { status: 500 }
    );
  }
}

/**
 * OPTIONS /api/courses/[courseId]/lessons/[lessonId]
 * 处理CORS预检请求
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}