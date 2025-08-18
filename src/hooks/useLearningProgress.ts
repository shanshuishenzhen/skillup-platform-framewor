import { useState, useCallback } from 'react';
import { useAuth } from './useAuth';

/**
 * 学习进度数据接口
 */
export interface LearningProgress {
  id: string;
  userId: string;
  courseId: string;
  lessonId: string;
  currentTimeSeconds: number;
  totalDurationSeconds: number;
  completionPercentage: number;
  isCompleted: boolean;
  lastUpdatedAt: string;
}

/**
 * 课程进度统计接口
 */
export interface CourseProgress {
  courseId: string;
  totalLessons: number;
  completedLessons: number;
  totalDuration: number;
  watchedDuration: number;
  overallProgress: number;
  lastWatchedLessonId?: string;
  lastWatchedAt?: string;
}

/**
 * 学习统计接口
 */
export interface LearningStats {
  totalCourses: number;
  completedCourses: number;
  totalLessons: number;
  completedLessons: number;
  totalWatchTime: number;
  averageProgress: number;
  streakDays: number;
  lastStudyDate?: string;
}

/**
 * 学习进度管理Hook
 * 提供学习进度的查询、保存和管理功能
 */
export function useLearningProgress() {
  const { user, token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * 获取API请求头
   */
  const getHeaders = useCallback(() => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    
    return headers;
  }, [token]);

  /**
   * 获取课时学习进度
   * @param courseId 课程ID
   * @param lessonId 课时ID
   * @returns 学习进度数据
   */
  const getLessonProgress = useCallback(async (
    courseId: string,
    lessonId: string
  ): Promise<LearningProgress | null> => {
    if (!user || !token) {
      setError('用户未登录');
      return null;
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(
        `/api/learning-progress?type=lesson&courseId=${courseId}&lessonId=${lessonId}`,
        {
          method: 'GET',
          headers: getHeaders(),
        }
      );
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || '获取学习进度失败');
      }
      
      return result.data;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '获取学习进度失败';
      setError(errorMessage);
      console.error('获取学习进度失败:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, token, getHeaders]);

  /**
   * 获取课程整体进度
   * @param courseId 课程ID
   * @returns 课程进度统计
   */
  const getCourseProgress = useCallback(async (
    courseId: string
  ): Promise<CourseProgress | null> => {
    if (!user || !token) {
      setError('用户未登录');
      return null;
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(
        `/api/learning-progress?type=course&courseId=${courseId}`,
        {
          method: 'GET',
          headers: getHeaders(),
        }
      );
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || '获取课程进度失败');
      }
      
      return result.data;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '获取课程进度失败';
      setError(errorMessage);
      console.error('获取课程进度失败:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, token, getHeaders]);

  /**
   * 获取用户学习统计
   * @returns 学习统计数据
   */
  const getLearningStats = useCallback(async (): Promise<LearningStats | null> => {
    if (!user || !token) {
      setError('用户未登录');
      return null;
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(
        '/api/learning-progress?type=stats',
        {
          method: 'GET',
          headers: getHeaders(),
        }
      );
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || '获取学习统计失败');
      }
      
      return result.data;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '获取学习统计失败';
      setError(errorMessage);
      console.error('获取学习统计失败:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, token, getHeaders]);

  /**
   * 保存学习进度
   * @param courseId 课程ID
   * @param lessonId 课时ID
   * @param currentTime 当前播放时间（秒）
   * @param duration 视频总时长（秒）
   * @param isCompleted 是否完成
   * @returns 保存结果
   */
  const saveProgress = useCallback(async (
    courseId: string,
    lessonId: string,
    currentTime: number,
    duration: number,
    isCompleted: boolean = false
  ): Promise<boolean> => {
    if (!user || !token) {
      setError('用户未登录');
      return false;
    }

    try {
      setError(null);
      
      const response = await fetch('/api/learning-progress', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          courseId,
          lessonId,
          currentTime,
          duration,
          isCompleted,
        }),
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || '保存学习进度失败');
      }
      
      return true;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '保存学习进度失败';
      setError(errorMessage);
      console.error('保存学习进度失败:', err);
      return false;
    }
  }, [user, token, getHeaders]);

  /**
   * 标记课时完成
   * @param courseId 课程ID
   * @param lessonId 课时ID
   * @returns 操作结果
   */
  const markLessonCompleted = useCallback(async (
    courseId: string,
    lessonId: string
  ): Promise<boolean> => {
    if (!user || !token) {
      setError('用户未登录');
      return false;
    }

    try {
      setError(null);
      
      const response = await fetch('/api/learning-progress', {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({
          courseId,
          lessonId,
          completed: true,
        }),
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || '标记完成失败');
      }
      
      return true;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '标记完成失败';
      setError(errorMessage);
      console.error('标记完成失败:', err);
      return false;
    }
  }, [user, token, getHeaders]);

  /**
   * 重置课时进度
   * @param courseId 课程ID
   * @param lessonId 课时ID
   * @returns 操作结果
   */
  const resetLessonProgress = useCallback(async (
    courseId: string,
    lessonId: string
  ): Promise<boolean> => {
    if (!user || !token) {
      setError('用户未登录');
      return false;
    }

    try {
      setError(null);
      
      const response = await fetch('/api/learning-progress', {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({
          courseId,
          lessonId,
          completed: false,
        }),
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || '重置进度失败');
      }
      
      return true;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '重置进度失败';
      setError(errorMessage);
      console.error('重置进度失败:', err);
      return false;
    }
  }, [user, token, getHeaders]);

  /**
   * 清除错误状态
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // 状态
    loading,
    error,
    
    // 方法
    getLessonProgress,
    getCourseProgress,
    getLearningStats,
    saveProgress,
    markLessonCompleted,
    resetLessonProgress,
    clearError,
  };
}