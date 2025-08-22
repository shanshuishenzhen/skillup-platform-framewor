/**
 * 课程服务模块
 * 处理课程相关的数据获取和操作
 */

import { supabase } from '@/lib/supabase';
import { 
  withRetry, 
  createError, 
  AppError, 
  ErrorType, 
  ErrorSeverity,
  RetryConfig 
} from '../utils/errorHandler';

export interface Course {
  id: string;
  title: string;
  description: string;
  instructor: {
    id: string;
    name: string;
    avatar?: string;
    bio?: string;
  };
  duration: number; // 总时长（分钟）
  level: 'beginner' | 'intermediate' | 'advanced';
  price: number;
  originalPrice?: number;
  rating: number;
  studentsCount: number;
  imageUrl: string;
  tags: string[];
  isPopular?: boolean;
  isFree?: boolean;
  createdAt: string;
  updatedAt: string;
  chapters?: Chapter[];
}

export interface Chapter {
  id: string;
  courseId: string;
  title: string;
  description?: string;
  orderIndex: number;
  duration: number; // 章节时长（分钟）
  videos?: Video[];
}

export interface Video {
  id: string;
  chapterId: string;
  title: string;
  description?: string;
  videoUrl: string;
  duration: number; // 视频时长（分钟）
  orderIndex: number;
  isPreview: boolean;
}

export interface CourseFilters {
  level?: string;
  priceRange?: 'free' | 'paid' | 'all';
  tags?: string[];
  instructor?: string;
  sortBy?: 'popularity' | 'rating' | 'price' | 'newest';
  limit?: number;
  offset?: number;
}

/**
 * 获取重试配置
 * @returns 重试配置
 */
function getRetryConfig(): RetryConfig {
  return {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 5000,
    backoffMultiplier: 2,
    jitter: true,
    retryableErrors: [
      ErrorType.NETWORK_ERROR,
      ErrorType.TIMEOUT_ERROR,
      ErrorType.DATABASE_ERROR,
      ErrorType.SERVICE_UNAVAILABLE_ERROR
    ]
  };
}

/**
 * 获取所有课程
 * @param filters 筛选条件
 * @returns 课程列表
 */
export async function getAllCourses(filters: CourseFilters = {}): Promise<Course[]> {
  try {
    // 使用重试机制进行数据库查询
    const courses = await withRetry(async () => {
      let query = supabase
        .from('courses')
        .select(`
          *,
          instructor:instructors(*)
        `);

      // 应用筛选条件
      if (filters.level) {
        query = query.eq('level', filters.level);
      }

      if (filters.priceRange === 'free') {
        query = query.eq('price', 0);
      } else if (filters.priceRange === 'paid') {
        query = query.gt('price', 0);
      }

      if (filters.instructor) {
        query = query.eq('instructor_id', filters.instructor);
      }

      // 排序
      switch (filters.sortBy) {
        case 'popularity':
          query = query.order('created_at', { ascending: false });
          break;
        case 'rating':
          query = query.order('created_at', { ascending: false });
          break;
        case 'price':
          query = query.order('price', { ascending: true });
          break;
        case 'newest':
          query = query.order('created_at', { ascending: false });
          break;
        default:
          query = query.order('created_at', { ascending: false });
      }

      // 分页
      if (filters.limit) {
        query = query.limit(filters.limit);
      }
      if (filters.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
      }

      const { data: courses, error } = await query;

      if (error) {
        throw createError(
          ErrorType.DATABASE_ERROR,
          '获取课程列表失败',
          {
            code: 'COURSES_FETCH_FAILED',
            statusCode: 500,
            severity: ErrorSeverity.HIGH,
            originalError: error
          }
        );
      }

      return courses || [];
    }, getRetryConfig());

    return courses.map(transformCourseData);
  } catch (error) {
    if (error instanceof AppError) {
      console.error('获取课程列表失败:', error.message);
    } else {
      console.error('获取课程列表过程中发生错误:', error);
    }
    return [];
  }
}

/**
 * 根据ID获取单个课程详情
 * @param courseId 课程ID
 * @param includeChapters 是否包含章节信息
 * @returns 课程详情
 */
export async function getCourseById(
  courseId: string,
  includeChapters: boolean = false
): Promise<Course | null> {
  try {
    // 使用重试机制进行数据库查询
    const course = await withRetry(async () => {
      const query = supabase
        .from('courses')
        .select(`
          *,
          instructor:instructors(*)
          ${includeChapters ? ',chapters(*, videos(*))' : ''}
        `)
        .eq('id', courseId)
        .single();

      const { data: course, error } = await query;

      if (error) {
        if (error.code === 'PGRST116') {
          // 记录未找到
          throw createError(
            ErrorType.NOT_FOUND_ERROR,
            '课程不存在',
            {
              code: 'COURSE_NOT_FOUND',
              statusCode: 404,
              severity: ErrorSeverity.MEDIUM
            }
          );
        }
        
        throw createError(
          ErrorType.DATABASE_ERROR,
          '获取课程详情失败',
          {
            code: 'COURSE_FETCH_FAILED',
            statusCode: 500,
            severity: ErrorSeverity.HIGH,
            originalError: error
          }
        );
      }

      if (!course) {
        throw createError(
          ErrorType.NOT_FOUND_ERROR,
          '课程不存在',
          {
            code: 'COURSE_NOT_FOUND',
            statusCode: 404,
            severity: ErrorSeverity.MEDIUM
          }
        );
      }

      return course;
    }, getRetryConfig());

    return transformCourseData(course);
  } catch (error) {
    if (error instanceof AppError && error.context?.code === 'COURSE_NOT_FOUND') {
      return null;
    }
    
    if (error instanceof AppError) {
      console.error('获取课程详情失败:', error.message);
    } else {
      console.error('获取课程详情过程中发生错误:', error);
    }
    return null;
  }
}

/**
 * 搜索课程
 * @param query 搜索关键词
 * @param filters 额外筛选条件
 * @returns 匹配的课程列表
 */
export async function searchCourses(
  query: string,
  filters: CourseFilters = {}
): Promise<Course[]> {
  try {
    if (!query.trim()) {
      return getAllCourses(filters);
    }

    // 使用重试机制进行数据库查询
    const courses = await withRetry(async () => {
      let dbQuery = supabase
        .from('courses')
        .select(`
          *,
          instructor:instructors(*)
        `)
        .or(`title.ilike.%${query}%,description.ilike.%${query}%`);

      // 应用其他筛选条件
      if (filters.level) {
        dbQuery = dbQuery.eq('level', filters.level);
      }

      if (filters.priceRange === 'free') {
        dbQuery = dbQuery.eq('price', 0);
      } else if (filters.priceRange === 'paid') {
        dbQuery = dbQuery.gt('price', 0);
      }

      // 排序
      switch (filters.sortBy) {
        case 'popularity':
          dbQuery = dbQuery.order('created_at', { ascending: false });
          break;
        case 'rating':
          dbQuery = dbQuery.order('created_at', { ascending: false });
          break;
        case 'price':
          dbQuery = dbQuery.order('price', { ascending: true });
          break;
        default:
          dbQuery = dbQuery.order('created_at', { ascending: false });
      }

      const { data: courses, error } = await dbQuery;

      if (error) {
        throw createError(
          ErrorType.DATABASE_ERROR,
          '搜索课程失败',
          {
            code: 'COURSE_SEARCH_FAILED',
            statusCode: 500,
            severity: ErrorSeverity.HIGH,
            originalError: error
          }
        );
      }

      return courses || [];
    }, getRetryConfig());

    return courses.map(transformCourseData);
  } catch (error) {
    if (error instanceof AppError) {
      console.error('搜索课程失败:', error.message);
    } else {
      console.error('搜索课程过程中发生错误:', error);
    }
    return [];
  }
}

/**
 * 根据分类获取课程
 * @param category 课程分类标签
 * @param filters 额外筛选条件
 * @returns 该分类的课程列表
 */
export async function getCoursesByCategory(
  category: string,
  filters: CourseFilters = {}
): Promise<Course[]> {
  try {
    // 使用重试机制进行数据库查询
    const courses = await withRetry(async () => {
      let query = supabase
        .from('courses')
        .select(`
          *,
          instructor:instructors(*)
        `)
        .contains('tags', [category]);

      // 应用其他筛选条件
      if (filters.level) {
        query = query.eq('level', filters.level);
      }

      if (filters.priceRange === 'free') {
        query = query.eq('price', 0);
      } else if (filters.priceRange === 'paid') {
        query = query.gt('price', 0);
      }

      // 排序
      switch (filters.sortBy) {
        case 'popularity':
          query = query.order('created_at', { ascending: false });
          break;
        case 'rating':
          query = query.order('created_at', { ascending: false });
          break;
        default:
          query = query.order('created_at', { ascending: false });
      }

      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      const { data: courses, error } = await query;

      if (error) {
        throw createError(
          ErrorType.DATABASE_ERROR,
          '获取分类课程失败',
          {
            code: 'CATEGORY_COURSES_FETCH_FAILED',
            statusCode: 500,
            severity: ErrorSeverity.HIGH,
            originalError: error
          }
        );
      }

      return courses || [];
    }, getRetryConfig());

    return courses.map(transformCourseData);
  } catch (error) {
    if (error instanceof AppError) {
      console.error('获取分类课程失败:', error.message);
    } else {
      console.error('获取分类课程过程中发生错误:', error);
    }
    return [];
  }
}

/**
 * 获取热门课程
 * @param limit 返回数量限制
 * @returns 热门课程列表
 */
export async function getPopularCourses(limit: number = 10): Promise<Course[]> {
  try {
    // 使用重试机制进行数据库查询
    const courses = await withRetry(async () => {
      const { data: courses, error } = await supabase
        .from('courses')
        .select(`
          *,
          instructor:instructors(*)
        `)
        .order('rating', { ascending: false })
        .limit(limit);

      if (error) {
        throw createError(
          ErrorType.DATABASE_ERROR,
          '获取热门课程失败',
          {
            code: 'POPULAR_COURSES_FETCH_FAILED',
            statusCode: 500,
            severity: ErrorSeverity.HIGH,
            originalError: error
          }
        );
      }

      return courses || [];
    }, getRetryConfig());

    return courses.map(transformCourseData);
  } catch (error) {
    if (error instanceof AppError) {
      console.error('获取热门课程失败:', error.message);
    } else {
      console.error('获取热门课程过程中发生错误:', error);
    }
    return [];
  }
}

/**
 * 获取免费课程
 * @param limit 返回数量限制
 * @returns 免费课程列表
 */
export async function getFreeCourses(limit: number = 10): Promise<Course[]> {
  try {
    // 使用重试机制进行数据库查询
    const courses = await withRetry(async () => {
      const { data: courses, error } = await supabase
        .from('courses')
        .select(`
          *,
          instructor:instructors(*)
        `)
        .eq('price', 0)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw createError(
          ErrorType.DATABASE_ERROR,
          '获取免费课程失败',
          {
            code: 'FREE_COURSES_FETCH_FAILED',
            statusCode: 500,
            severity: ErrorSeverity.HIGH,
            originalError: error
          }
        );
      }

      return courses || [];
    }, getRetryConfig());

    return courses.map(transformCourseData);
  } catch (error) {
    if (error instanceof AppError) {
      console.error('获取免费课程失败:', error.message);
    } else {
      console.error('获取免费课程过程中发生错误:', error);
    }
    return [];
  }
}

/**
 * 获取课程章节
 * @param courseId 课程ID
 * @returns 章节列表
 */
export async function getCourseChapters(courseId: string): Promise<Chapter[]> {
  try {
    // 使用重试机制进行数据库查询
    const chapters = await withRetry(async () => {
      const { data: chapters, error } = await supabase
        .from('chapters')
        .select(`
          *,
          videos(*)
        `)
        .eq('course_id', courseId)
        .order('order_index', { ascending: true });

      if (error) {
        throw createError(
          ErrorType.DATABASE_ERROR,
          '获取课程章节失败',
          {
            code: 'COURSE_CHAPTERS_FETCH_FAILED',
            statusCode: 500,
            severity: ErrorSeverity.HIGH,
            originalError: error
          }
        );
      }

      return chapters || [];
    }, getRetryConfig());

    return chapters.map(chapter => ({
      id: chapter.id,
      courseId: chapter.course_id,
      title: chapter.title,
      description: chapter.description,
      orderIndex: chapter.order_index,
      duration: chapter.duration,
      videos: chapter.videos?.map((video: Record<string, unknown>) => ({
        id: video.id,
        chapterId: video.chapter_id,
        title: video.title,
        description: video.description,
        videoUrl: video.video_url,
        duration: video.duration,
        orderIndex: video.order_index,
        isPreview: video.is_preview
      })).sort((a: Video, b: Video) => a.orderIndex - b.orderIndex) || []
    }));
  } catch (error) {
    if (error instanceof AppError) {
      console.error('获取课程章节失败:', error.message);
    } else {
      console.error('获取课程章节过程中发生错误:', error);
    }
    return [];
  }
}

/**
 * 获取课程的预览视频
 * @param courseId 课程ID
 * @returns 预览视频列表
 */
export async function getCoursePreviewVideos(courseId: string): Promise<Video[]> {
  try {
    // 使用重试机制进行数据库查询
    const videos = await withRetry(async () => {
      const { data: videos, error } = await supabase
        .from('videos')
        .select(`
          *,
          chapter:chapters!inner(course_id)
        `)
        .eq('chapter.course_id', courseId)
        .eq('is_preview', true)
        .order('order_index', { ascending: true });

      if (error) {
        throw createError(
          ErrorType.DATABASE_ERROR,
          '获取课程预览视频失败',
          {
            code: 'COURSE_PREVIEW_VIDEOS_FETCH_FAILED',
            statusCode: 500,
            severity: ErrorSeverity.HIGH,
            originalError: error
          }
        );
      }

      return videos || [];
    }, getRetryConfig());

    return videos.map(video => ({
      id: video.id,
      chapterId: video.chapter_id,
      title: video.title,
      description: video.description,
      videoUrl: video.video_url,
      duration: video.duration,
      orderIndex: video.order_index,
      isPreview: video.is_preview
    }));
  } catch (error) {
    if (error instanceof AppError) {
      console.error('获取课程预览视频失败:', error.message);
    } else {
      console.error('获取课程预览视频过程中发生错误:', error);
    }
    return [];
  }
}

/**
 * 转换数据库课程数据为前端格式
 * @param dbCourse 数据库课程数据
 * @returns 前端课程数据格式
 */
function transformCourseData(dbCourse: Record<string, unknown>): Course {
  return {
    id: dbCourse.id,
    title: dbCourse.title,
    description: dbCourse.description || '',
    instructor: {
      id: dbCourse.instructor?.id || '',
      name: dbCourse.instructor?.name || '未知讲师',
      avatar: dbCourse.instructor?.avatar_url,
      bio: dbCourse.instructor?.bio
    },
    duration: 120, // 默认时长
    level: (dbCourse.difficulty as 'beginner' | 'intermediate' | 'advanced') || 'beginner',
    price: Number(dbCourse.price) || 0,
    originalPrice: Number(dbCourse.price) || 0,
    rating: 4.5, // 默认评分
    studentsCount: 100, // 默认学员数
    imageUrl: dbCourse.cover_image_url || 'https://trae-api-sg.mchost.guru/api/ide/v1/text_to_image?prompt=online%20course%20cover%20image%20modern%20design&image_size=landscape_4_3',
    tags: [dbCourse.category].filter(Boolean) || [],
    isPopular: true, // 默认为热门
    isFree: Number(dbCourse.price) === 0,
    createdAt: dbCourse.created_at,
    updatedAt: dbCourse.updated_at,
    chapters: dbCourse.chapters?.map((chapter: Record<string, unknown>) => ({
      id: chapter.id,
      courseId: chapter.course_id,
      title: chapter.title,
      description: chapter.description,
      orderIndex: chapter.order_index,
      duration: chapter.duration,
      videos: chapter.videos?.map((video: Record<string, unknown>) => ({
        id: video.id,
        chapterId: video.chapter_id,
        title: video.title,
        description: video.description,
        videoUrl: video.video_url,
        duration: video.duration,
        orderIndex: video.order_index,
        isPreview: video.is_preview
      })).sort((a: Video, b: Video) => a.orderIndex - b.orderIndex) || []
    })).sort((a: Chapter, b: Chapter) => a.orderIndex - b.orderIndex) || []
  };
}

/**
 * 获取课程的单个预览视频（第一个预览视频）
 * @param courseId 课程ID
 * @returns 预览视频
 */
export async function getCoursePreviewVideo(courseId: string): Promise<Video | null> {
  try {
    // 使用重试机制进行数据库查询
    const video = await withRetry(async () => {
      const { data: video, error } = await supabase
        .from('videos')
        .select(`
          *,
          chapter:chapters!inner(course_id)
        `)
        .eq('chapter.course_id', courseId)
        .eq('is_preview', true)
        .order('order_index', { ascending: true })
        .limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // 记录未找到
          throw createError(
            ErrorType.NOT_FOUND_ERROR,
            '课程预览视频不存在',
            {
              code: 'COURSE_PREVIEW_VIDEO_NOT_FOUND',
              statusCode: 404,
              severity: ErrorSeverity.MEDIUM
            }
          );
        }
        
        throw createError(
          ErrorType.DATABASE_ERROR,
          '获取课程预览视频失败',
          {
            code: 'COURSE_PREVIEW_VIDEO_FETCH_FAILED',
            statusCode: 500,
            severity: ErrorSeverity.HIGH,
            originalError: error
          }
        );
      }

      if (!video) {
        throw createError(
          ErrorType.NOT_FOUND_ERROR,
          '课程预览视频不存在',
          {
            code: 'COURSE_PREVIEW_VIDEO_NOT_FOUND',
            statusCode: 404,
            severity: ErrorSeverity.MEDIUM
          }
        );
      }

      return video;
    }, getRetryConfig());

    return {
      id: video.id,
      chapterId: video.chapter_id,
      title: video.title,
      description: video.description,
      videoUrl: video.video_url,
      duration: video.duration,
      orderIndex: video.order_index,
      isPreview: video.is_preview
    };
  } catch (error) {
    if (error instanceof AppError && error.context?.code === 'COURSE_PREVIEW_VIDEO_NOT_FOUND') {
      return null;
    }
    
    if (error instanceof AppError) {
      console.error('获取课程预览视频失败:', error.message);
    } else {
      console.error('获取课程预览视频过程中发生错误:', error);
    }
    return null;
  }
}

/**
 * 课程服务对象 - 包含所有课程相关的服务方法
 */
const courseService = {
  getAllCourses,
  getCourseById,
  searchCourses,
  getCoursesByCategory,
  getPopularCourses,
  getFreeCourses,
  getCourseChapters,
  getCoursePreviewVideos,
  getCoursePreviewVideo
};

export default courseService;
