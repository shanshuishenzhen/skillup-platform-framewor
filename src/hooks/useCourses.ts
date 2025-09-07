import { useState, useEffect, useCallback } from 'react';
import {
  getAllCourses,
  getCourseById,
  searchCourses,
  getCoursesByCategory,
  getPopularCourses,
  getFreeCourses,
  getCourseChapters,
  getCoursePreviewVideos
} from '../services/courseService';
import { Course, Chapter, Video, CourseFilters } from '../types/course';
import { apiCache } from '../utils/apiCache';

/**
 * 课程数据获取状态接口
 */
interface CourseState {
  courses: Course[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  total: number;
}

/**
 * 单个课程状态接口
 */
interface SingleCourseState {
  course: Course | null;
  chapters: Chapter[];
  previewVideos: Video[];
  loading: boolean;
  error: string | null;
}

/**
 * 课程搜索状态接口
 */
interface SearchState {
  results: Course[];
  loading: boolean;
  error: string | null;
  query: string;
}

/**
 * 课程列表Hook返回值接口
 */
interface UseCoursesReturn {
  state: CourseState;
  loadCourses: (filters?: CourseFilters) => Promise<void>;
  loadMoreCourses: (filters?: CourseFilters) => Promise<void>;
  refreshCourses: (filters?: CourseFilters) => Promise<void>;
  clearCache: () => Promise<void>;
}

/**
 * 单个课程Hook返回值接口
 */
interface UseCourseReturn {
  state: SingleCourseState;
  loadCourse: (courseId: string, includeChapters?: boolean) => Promise<void>;
  loadChapters: (courseId: string) => Promise<void>;
  loadPreviewVideos: (courseId: string) => Promise<void>;
  refreshCourse: (courseId: string, includeChapters?: boolean) => Promise<void>;
  clearCache: (courseId: string) => Promise<void>;
}

/**
 * 课程搜索Hook返回值接口
 */
interface UseCourseSearchReturn {
  state: SearchState;
  search: (query: string, filters?: CourseFilters) => Promise<void>;
  clearSearch: () => void;
  clearCache: () => Promise<void>;
}

/**
 * 课程列表管理Hook
 * 提供课程列表的获取、分页、刷新和缓存管理功能
 * @param initialFilters 初始筛选条件
 * @returns 课程列表状态和操作方法
 */
export function useCourses(initialFilters?: CourseFilters): UseCoursesReturn {
  const [state, setState] = useState<CourseState>({
    courses: [],
    loading: false,
    error: null,
    hasMore: true,
    total: 0
  });

  /**
   * 加载课程列表
   * @param filters 筛选条件
   */
  const loadCourses = useCallback(async (filters: CourseFilters = {}) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const courses = await getAllCourses(filters);
      setState({
        courses,
        loading: false,
        error: null,
        hasMore: courses.length === (filters.limit || 20),
        total: courses.length
      });
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : '加载课程失败'
      }));
    }
  }, []);

  /**
   * 加载更多课程（分页）
   * @param filters 筛选条件
   */
  const loadMoreCourses = useCallback(async (filters: CourseFilters = {}) => {
    if (state.loading || !state.hasMore) return;
    
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const offset = state.courses.length;
      const moreCourses = await getAllCourses({ ...filters, offset });
      
      setState(prev => ({
        ...prev,
        courses: [...prev.courses, ...moreCourses],
        loading: false,
        hasMore: moreCourses.length === (filters.limit || 20),
        total: prev.total + moreCourses.length
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : '加载更多课程失败'
      }));
    }
  }, [state.courses.length, state.loading, state.hasMore]);

  /**
   * 刷新课程列表（清除缓存后重新加载）
   * @param filters 筛选条件
   */
  const refreshCourses = useCallback(async (filters: CourseFilters = {}) => {
    // 清除相关缓存
    await clearCache();
    await loadCourses(filters);
  }, [loadCourses]);

  /**
   * 清除课程相关缓存
   */
  const clearCache = useCallback(async () => {
    const cacheKeys = [
      'courses:all',
      'courses:popular',
      'courses:free'
    ];
    
    for (const key of cacheKeys) {
      await apiCache.delete(key);
    }
  }, []);

  // 初始加载
  useEffect(() => {
    loadCourses(initialFilters);
  }, [loadCourses, initialFilters]);

  return {
    state,
    loadCourses,
    loadMoreCourses,
    refreshCourses,
    clearCache
  };
}

/**
 * 单个课程管理Hook
 * 提供单个课程详情、章节、预览视频的获取和缓存管理功能
 * @returns 课程状态和操作方法
 */
export function useCourse(): UseCourseReturn {
  const [state, setState] = useState<SingleCourseState>({
    course: null,
    chapters: [],
    previewVideos: [],
    loading: false,
    error: null
  });

  /**
   * 加载课程详情
   * @param courseId 课程ID
   * @param includeChapters 是否包含章节信息
   */
  const loadCourse = useCallback(async (courseId: string, includeChapters: boolean = false) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const course = await getCourseById(courseId, includeChapters);
      setState(prev => ({
        ...prev,
        course,
        loading: false,
        chapters: includeChapters && course?.chapters ? course.chapters : prev.chapters
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : '加载课程详情失败'
      }));
    }
  }, []);

  /**
   * 加载课程章节
   * @param courseId 课程ID
   */
  const loadChapters = useCallback(async (courseId: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const chapters = await getCourseChapters(courseId);
      setState(prev => ({
        ...prev,
        chapters,
        loading: false
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : '加载课程章节失败'
      }));
    }
  }, []);

  /**
   * 加载预览视频
   * @param courseId 课程ID
   */
  const loadPreviewVideos = useCallback(async (courseId: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const previewVideos = await getCoursePreviewVideos(courseId);
      setState(prev => ({
        ...prev,
        previewVideos,
        loading: false
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : '加载预览视频失败'
      }));
    }
  }, []);

  /**
   * 刷新课程数据（清除缓存后重新加载）
   * @param courseId 课程ID
   * @param includeChapters 是否包含章节信息
   */
  const refreshCourse = useCallback(async (courseId: string, includeChapters: boolean = false) => {
    await clearCache(courseId);
    await loadCourse(courseId, includeChapters);
  }, [loadCourse]);

  /**
   * 清除特定课程的缓存
   * @param courseId 课程ID
   */
  const clearCache = useCallback(async (courseId: string) => {
    const cacheKeys = [
      `course:${courseId}:chapters:true`,
      `course:${courseId}:chapters:false`,
      `chapters:${courseId}`,
      `preview-videos:${courseId}`
    ];
    
    for (const key of cacheKeys) {
      await apiCache.delete(key);
    }
  }, []);

  return {
    state,
    loadCourse,
    loadChapters,
    loadPreviewVideos,
    refreshCourse,
    clearCache
  };
}

/**
 * 课程搜索Hook
 * 提供课程搜索功能和缓存管理
 * @returns 搜索状态和操作方法
 */
export function useCourseSearch(): UseCourseSearchReturn {
  const [state, setState] = useState<SearchState>({
    results: [],
    loading: false,
    error: null,
    query: ''
  });

  /**
   * 搜索课程
   * @param query 搜索关键词
   * @param filters 筛选条件
   */
  const search = useCallback(async (query: string, filters: CourseFilters = {}) => {
    if (!query.trim()) {
      setState({
        results: [],
        loading: false,
        error: null,
        query: ''
      });
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null, query }));
    
    try {
      const results = await searchCourses(query, filters);
      setState({
        results,
        loading: false,
        error: null,
        query
      });
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : '搜索课程失败'
      }));
    }
  }, []);

  /**
   * 清除搜索结果
   */
  const clearSearch = useCallback(() => {
    setState({
      results: [],
      loading: false,
      error: null,
      query: ''
    });
  }, []);

  /**
   * 清除搜索缓存
   */
  const clearCache = useCallback(async () => {
    // 由于搜索缓存键包含动态内容，这里只能清除已知的缓存
    // 实际应用中可能需要更复杂的缓存管理策略
    console.log('清除搜索缓存');
  }, []);

  return {
    state,
    search,
    clearSearch,
    clearCache
  };
}

/**
 * 热门课程Hook
 * 提供热门课程数据获取功能
 * @param limit 返回数量限制
 * @returns 热门课程状态和操作方法
 */
export function usePopularCourses(limit: number = 10) {
  const [state, setState] = useState<CourseState>({
    courses: [],
    loading: false,
    error: null,
    hasMore: false,
    total: 0
  });

  /**
   * 加载热门课程
   */
  const loadPopularCourses = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const courses = await getPopularCourses(limit);
      setState({
        courses,
        loading: false,
        error: null,
        hasMore: false,
        total: courses.length
      });
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : '加载热门课程失败'
      }));
    }
  }, [limit]);

  /**
   * 刷新热门课程
   */
  const refreshPopularCourses = useCallback(async () => {
    await apiCache.delete(`courses:popular:${limit}`);
    await loadPopularCourses();
  }, [limit, loadPopularCourses]);

  // 初始加载
  useEffect(() => {
    loadPopularCourses();
  }, [loadPopularCourses]);

  return {
    state,
    loadPopularCourses,
    refreshPopularCourses
  };
}

/**
 * 免费课程Hook
 * 提供免费课程数据获取功能
 * @param limit 返回数量限制
 * @returns 免费课程状态和操作方法
 */
export function useFreeCourses(limit: number = 10) {
  const [state, setState] = useState<CourseState>({
    courses: [],
    loading: false,
    error: null,
    hasMore: false,
    total: 0
  });

  /**
   * 加载免费课程
   */
  const loadFreeCourses = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const courses = await getFreeCourses(limit);
      setState({
        courses,
        loading: false,
        error: null,
        hasMore: false,
        total: courses.length
      });
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : '加载免费课程失败'
      }));
    }
  }, [limit]);

  /**
   * 刷新免费课程
   */
  const refreshFreeCourses = useCallback(async () => {
    await apiCache.delete(`courses:free:${limit}`);
    await loadFreeCourses();
  }, [limit, loadFreeCourses]);

  // 初始加载
  useEffect(() => {
    loadFreeCourses();
  }, [loadFreeCourses]);

  return {
    state,
    loadFreeCourses,
    refreshFreeCourses
  };
}

/**
 * 分类课程Hook
 * 提供按分类获取课程的功能
 * @param category 课程分类
 * @param filters 筛选条件
 * @returns 分类课程状态和操作方法
 */
export function useCoursesByCategory(category: string, filters?: CourseFilters) {
  const [state, setState] = useState<CourseState>({
    courses: [],
    loading: false,
    error: null,
    hasMore: false,
    total: 0
  });

  /**
   * 加载分类课程
   */
  const loadCoursesByCategory = useCallback(async () => {
    if (!category) return;
    
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const courses = await getCoursesByCategory(category, filters);
      setState({
        courses,
        loading: false,
        error: null,
        hasMore: false,
        total: courses.length
      });
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : '加载分类课程失败'
      }));
    }
  }, [category, filters]);

  /**
   * 刷新分类课程
   */
  const refreshCoursesByCategory = useCallback(async () => {
    const cacheKey = `courses:category:${category}:${JSON.stringify(filters)}`;
    await apiCache.delete(cacheKey);
    await loadCoursesByCategory();
  }, [category, filters, loadCoursesByCategory]);

  // 初始加载
  useEffect(() => {
    loadCoursesByCategory();
  }, [loadCoursesByCategory]);

  return {
    state,
    loadCoursesByCategory,
    refreshCoursesByCategory
  };
}