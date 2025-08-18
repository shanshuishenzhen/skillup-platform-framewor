/**
 * 课程列表API接口
 * GET /api/courses
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  getAllCourses, 
  getCoursesByCategory, 
  getPopularCourses, 
  getFreeCourses,
  searchCourses 
} from '@/services/courseService';

/**
 * 获取课程列表接口
 * @param request HTTP请求对象
 * @returns 课程列表
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const type = searchParams.get('type'); // 'popular', 'free', 'all'
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '12');

    let courses;

    // 根据不同参数获取课程
    if (search) {
      // 搜索课程
      courses = await searchCourses(search);
    } else if (category) {
      // 按分类获取课程
      courses = await getCoursesByCategory(category);
    } else if (type === 'popular') {
      // 获取热门课程
      courses = await getPopularCourses();
    } else if (type === 'free') {
      // 获取免费课程
      courses = await getFreeCourses();
    } else {
      // 获取所有课程
      courses = await getAllCourses();
    }

    // 分页处理
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedCourses = courses.slice(startIndex, endIndex);

    return NextResponse.json({
      success: true,
      data: {
        courses: paginatedCourses,
        pagination: {
          page,
          limit,
          total: courses.length,
          totalPages: Math.ceil(courses.length / limit),
          hasNext: endIndex < courses.length,
          hasPrev: page > 1
        }
      },
      message: '获取课程列表成功'
    });
  } catch (error) {
    console.error('获取课程列表API错误:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}