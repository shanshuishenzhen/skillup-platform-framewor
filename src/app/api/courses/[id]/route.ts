import { NextResponse } from 'next/server';
import { getCourseById } from '@/services/courseService';
import { Params } from 'next/dist/shared/lib/router/utils/params';

// 定义参数类型接口
interface CourseParams extends Params {
  id: string;
}

// 使用 `_` 标记第一个参数为未使用，看看是否能解决类型冲突
export async function GET(
  _request: Request,
  { params }: { params: CourseParams }
) {
  try {
    const id = params.id;
    const course = await getCourseById(id);

    if (!course) {
      return NextResponse.json({ message: '课程未找到' }, { status: 404 });
    }

    // TODO: Add logic here to check user's JWT token and purchase status
    // to decide whether to return the full_video_url or just the preview_video_url.
    // This is a critical part of the paywall logic.

    return NextResponse.json(course);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '获取课程详情失败';
    return NextResponse.json({ message: '服务器内部错误', error: errorMessage }, { status: 500 });
  }
}
