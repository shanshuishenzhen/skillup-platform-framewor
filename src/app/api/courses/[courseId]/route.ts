/**
 * 课程详情API接口
 * GET /api/courses/[courseId]
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCourseById, getCourseChapters, getCoursePreviewVideo } from '@/services/courseService';

/**
 * 获取课程详情接口
 * @param request HTTP请求对象
 * @param context 路由上下文，包含courseId参数
 * @returns 课程详情数据
 */
export async function GET(request: NextRequest, context: { params: Promise<{ courseId: string }> }) {
  try {
    const { courseId } = await context.params;

    // 验证课程ID
    if (!courseId) {
      return NextResponse.json(
        { error: '课程ID不能为空' },
        { status: 400 }
      );
    }

    // 获取课程基本信息
    const course = await getCourseById(courseId);
    
    if (!course) {
      return NextResponse.json(
        { error: '课程不存在' },
        { status: 404 }
      );
    }

    // 获取课程章节
    const chapters = await getCourseChapters(courseId);
    
    // 获取预览视频
    const previewVideo = await getCoursePreviewVideo(courseId);

    // 组装完整的课程信息
    const courseDetail = {
      ...course,
      chapters,
      previewVideo,
      // 计算总时长（所有章节视频时长之和）
      totalDuration: chapters.reduce((total, chapter) => {
        return total + (chapter.videos || []).reduce((chapterTotal, video) => {
          return chapterTotal + (video.duration || 0);
        }, 0);
      }, 0),
      // 计算总视频数
      totalVideos: chapters.reduce((total, chapter) => {
        return total + (chapter.videos || []).length;
      }, 0)
    };

    return NextResponse.json({
      success: true,
      data: courseDetail,
      message: '获取课程详情成功'
    });
  } catch (error) {
    console.error('获取课程详情API错误:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}