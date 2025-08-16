import { NextRequest, NextResponse } from 'next/server';
import { getAllCourses } from '@/services/courseService';

export async function GET(req: NextRequest) {
  try {
    const courses = await getAllCourses();
    return NextResponse.json(courses);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '获取课程列表失败';
    return NextResponse.json({ message: '服务器内部错误', error: errorMessage }, { status: 500 });
  }
}
