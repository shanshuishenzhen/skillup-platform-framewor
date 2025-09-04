import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase';
import { parseJWTToken } from '@/utils/jwt';
import { ErrorHandler, AppError, ErrorType } from '@/utils/errorHandler';

const supabase = getSupabaseAdminClient();

/**
 * 学习进度API接口
 * 处理学习进度的保存、查询和管理
 */

/**
 * GET /api/learning-progress
 * 获取用户学习进度
 * 查询参数:
 * - courseId: 课程ID（可选）
 * - lessonId: 课时ID（可选，需要同时提供courseId）
 * - type: 查询类型 (lesson|course|stats)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('courseId');
    const lessonId = searchParams.get('lessonId');
    const type = searchParams.get('type') || 'lesson';
    
    // 验证用户身份
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, message: '未提供认证令牌' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const userResult = verifyToken(token);
    
    if (!userResult.valid || !userResult.userId) {
      return NextResponse.json(
        { success: false, message: '认证失败' },
        { status: 401 }
      );
    }

    const userId = userResult.userId as string;

    // 根据查询类型返回不同的数据
    switch (type) {
      case 'lesson':
        // 获取特定课时的学习进度
        if (!courseId || !lessonId) {
          return NextResponse.json(
            { success: false, message: '缺少必要参数：courseId 和 lessonId' },
            { status: 400 }
          );
        }
        
        const lessonProgress = await learningProgressService.getLearningProgress(
          userId,
          courseId,
          lessonId
        );
        
        return NextResponse.json(lessonProgress);

      case 'course':
        // 获取课程整体进度
        if (!courseId) {
          return NextResponse.json(
            { success: false, message: '缺少必要参数：courseId' },
            { status: 400 }
          );
        }
        
        const courseProgress = await learningProgressService.getCourseProgress(
          userId,
          courseId
        );
        
        return NextResponse.json(courseProgress);

      case 'stats':
        // 获取用户学习统计
        const learningStats = await learningProgressService.getLearningStats(userId);
        return NextResponse.json(learningStats);

      default:
        return NextResponse.json(
          { success: false, message: '无效的查询类型' },
          { status: 400 }
        );
    }

  } catch (error) {
    // 处理错误
    console.error('获取学习进度失败:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        message: '获取学习进度失败',
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/learning-progress
 * 保存学习进度
 * 请求体:
 * {
 *   courseId: string,
 *   lessonId: string,
 *   currentTime: number,
 *   duration: number,
 *   isCompleted?: boolean
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // 验证用户身份
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, message: '未提供认证令牌' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const userResult = verifyToken(token);
    
    if (!userResult.valid || !userResult.userId) {
      return NextResponse.json(
        { success: false, message: '认证失败' },
        { status: 401 }
      );
    }

    const userId = userResult.userId as string;
    
    // 解析请求体
    const body = await request.json();
    const { courseId, lessonId, currentTime, duration, isCompleted } = body;
    
    // 参数验证
    if (!courseId || !lessonId || typeof currentTime !== 'number' || typeof duration !== 'number') {
      return NextResponse.json(
        { success: false, message: '缺少必要参数或参数类型错误' },
        { status: 400 }
      );
    }
    
    if (currentTime < 0 || duration <= 0 || currentTime > duration) {
      return NextResponse.json(
        { success: false, message: '时间参数无效' },
        { status: 400 }
      );
    }
    
    // 保存学习进度
    const result = await learningProgressService.saveLearningProgress(
      userId,
      courseId,
      lessonId,
      currentTime,
      duration
    );
    
    return NextResponse.json(result);
    
  } catch (error) {
    // 处理错误
    console.error('保存学习进度失败:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        message: '保存学习进度失败',
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/learning-progress
 * 标记课时完成状态
 * 请求体:
 * {
 *   courseId: string,
 *   lessonId: string,
 *   completed: boolean
 * }
 */
export async function PUT(request: NextRequest) {
  try {
    // 验证用户身份
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, message: '未提供认证令牌' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const userResult = verifyToken(token);
    
    if (!userResult.valid || !userResult.userId) {
      return NextResponse.json(
        { success: false, message: '认证失败' },
        { status: 401 }
      );
    }

    const userId = userResult.userId as string;
    
    // 解析请求体
    const body = await request.json();
    const { courseId, lessonId, completed } = body;
    
    // 参数验证
    if (!courseId || !lessonId || typeof completed !== 'boolean') {
      return NextResponse.json(
        { success: false, message: '缺少必要参数或参数类型错误' },
        { status: 400 }
      );
    }
    
    // 更新完成状态
    const result = completed
      ? await learningProgressService.markLessonCompleted(userId, courseId, lessonId)
      : await learningProgressService.resetLessonProgress(userId, courseId, lessonId);
    
    return NextResponse.json(result);
    
  } catch (error) {
    // 处理错误
    console.error('更新课时完成状态失败:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        message: '更新课时完成状态失败',
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

/**
 * OPTIONS /api/learning-progress
 * 处理CORS预检请求
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}