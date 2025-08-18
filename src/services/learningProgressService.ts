import { supabase } from '@/lib/supabase';

/**
 * 学习进度记录接口
 */
export interface LearningProgress {
  /** 记录ID */
  id: string;
  /** 用户ID */
  userId: string;
  /** 课程ID */
  courseId: string;
  /** 课时ID */
  lessonId: string;
  /** 当前播放时间（秒） */
  currentTime: number;
  /** 视频总时长（秒） */
  duration: number;
  /** 完成百分比 */
  progressPercentage: number;
  /** 是否已完成 */
  isCompleted: boolean;
  /** 最后更新时间 */
  lastUpdatedAt: string;
  /** 创建时间 */
  createdAt: string;
}

/**
 * 课程整体进度接口
 */
export interface CourseProgress {
  /** 课程ID */
  courseId: string;
  /** 总课时数 */
  totalLessons: number;
  /** 已完成课时数 */
  completedLessons: number;
  /** 课程完成百分比 */
  courseProgressPercentage: number;
  /** 总学习时长（秒） */
  totalWatchTime: number;
  /** 最后学习时间 */
  lastStudyTime: string;
}

/**
 * 学习统计接口
 */
export interface LearningStats {
  /** 总学习时长（秒） */
  totalStudyTime: number;
  /** 已完成课程数 */
  completedCourses: number;
  /** 正在学习课程数 */
  inProgressCourses: number;
  /** 本周学习时长（秒） */
  weeklyStudyTime: number;
  /** 连续学习天数 */
  streakDays: number;
}

/**
 * 保存或更新学习进度
 * @param userId 用户ID
 * @param courseId 课程ID
 * @param lessonId 课时ID
 * @param currentTime 当前播放时间（秒）
 * @param duration 视频总时长（秒）
 * @returns 操作结果
 * 
 * @example
 * ```typescript
 * const result = await saveLearningProgress(
 *   'user123',
 *   'course456',
 *   'lesson789',
 *   120,
 *   600
 * );
 * if (result.success) {
 *   console.log('进度保存成功');
 * }
 * ```
 */
export async function saveLearningProgress(
  userId: string,
  courseId: string,
  lessonId: string,
  currentTime: number,
  duration: number
): Promise<{ success: boolean; message: string; data?: LearningProgress }> {
  try {
    // 计算完成百分比
    const progressPercentage = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;
    const isCompleted = progressPercentage >= 90; // 观看90%以上视为完成

    // 检查是否已存在记录
    const { data: existingProgress } = await supabase
      .from('learning_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .eq('lesson_id', lessonId)
      .single();

    const progressData = {
      user_id: userId,
      course_id: courseId,
      lesson_id: lessonId,
      current_time_seconds: currentTime,
      duration: duration,
      progress_percentage: progressPercentage,
      is_completed: isCompleted,
      last_updated_at: new Date().toISOString()
    };

    let result;
    if (existingProgress) {
      // 更新现有记录
      result = await supabase
        .from('learning_progress')
        .update(progressData)
        .eq('id', existingProgress.id)
        .select()
        .single();
    } else {
      // 创建新记录
      result = await supabase
        .from('learning_progress')
        .insert({
          ...progressData,
          created_at: new Date().toISOString()
        })
        .select()
        .single();
    }

    if (result.error) {
      console.error('保存学习进度失败:', result.error);
      return {
        success: false,
        message: '保存学习进度失败'
      };
    }

    const progress: LearningProgress = {
      id: result.data.id,
      userId: result.data.user_id,
      courseId: result.data.course_id,
      lessonId: result.data.lesson_id,
      currentTime: result.data.current_time_seconds,
      duration: result.data.duration,
      progressPercentage: result.data.progress_percentage,
      isCompleted: result.data.is_completed,
      lastUpdatedAt: result.data.last_updated_at,
      createdAt: result.data.created_at
    };

    return {
      success: true,
      message: '学习进度保存成功',
      data: progress
    };
  } catch (error) {
    console.error('保存学习进度时发生错误:', error);
    return {
      success: false,
      message: '保存学习进度失败，请稍后重试'
    };
  }
}

/**
 * 获取用户的学习进度
 * @param userId 用户ID
 * @param courseId 课程ID
 * @param lessonId 课时ID（可选）
 * @returns 学习进度数据
 * 
 * @example
 * ```typescript
 * // 获取特定课时的进度
 * const progress = await getLearningProgress('user123', 'course456', 'lesson789');
 * 
 * // 获取整个课程的进度
 * const courseProgress = await getLearningProgress('user123', 'course456');
 * ```
 */
export async function getLearningProgress(
  userId: string,
  courseId: string,
  lessonId?: string
): Promise<{ success: boolean; data?: LearningProgress | LearningProgress[]; message: string }> {
  try {
    let query = supabase
      .from('learning_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('course_id', courseId);

    if (lessonId) {
      query = query.eq('lesson_id', lessonId);
      const { data, error } = await query.single();

      if (error && error.code !== 'PGRST116') { // PGRST116 是没有找到记录的错误码
        console.error('获取学习进度失败:', error);
        return {
          success: false,
          message: '获取学习进度失败'
        };
      }

      if (!data) {
        return {
          success: true,
          data: undefined,
          message: '暂无学习进度'
        };
      }

      const progress: LearningProgress = {
        id: data.id,
        userId: data.user_id,
        courseId: data.course_id,
        lessonId: data.lesson_id,
        currentTime: data.current_time_seconds,
        duration: data.duration,
        progressPercentage: data.progress_percentage,
        isCompleted: data.is_completed,
        lastUpdatedAt: data.last_updated_at,
        createdAt: data.created_at
      };

      return {
        success: true,
        data: progress,
        message: '获取学习进度成功'
      };
    } else {
      const { data, error } = await query.order('last_updated_at', { ascending: false });

      if (error) {
        console.error('获取课程学习进度失败:', error);
        return {
          success: false,
          message: '获取课程学习进度失败'
        };
      }

      const progressList: LearningProgress[] = data.map(item => ({
        id: item.id,
        userId: item.user_id,
        courseId: item.course_id,
        lessonId: item.lesson_id,
        currentTime: item.current_time_seconds,
        duration: item.duration,
        progressPercentage: item.progress_percentage,
        isCompleted: item.is_completed,
        lastUpdatedAt: item.last_updated_at,
        createdAt: item.created_at
      }));

      return {
        success: true,
        data: progressList,
        message: '获取课程学习进度成功'
      };
    }
  } catch (error) {
    console.error('获取学习进度时发生错误:', error);
    return {
      success: false,
      message: '获取学习进度失败，请稍后重试'
    };
  }
}

/**
 * 获取课程整体进度
 * @param userId 用户ID
 * @param courseId 课程ID
 * @returns 课程进度统计
 * 
 * @example
 * ```typescript
 * const courseProgress = await getCourseProgress('user123', 'course456');
 * console.log(`课程完成度: ${courseProgress.data?.courseProgressPercentage}%`);
 * ```
 */
export async function getCourseProgress(
  userId: string,
  courseId: string
): Promise<{ success: boolean; data?: CourseProgress; message: string }> {
  try {
    // 获取课程的所有课时进度
    const { data: progressList, error: progressError } = await supabase
      .from('learning_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('course_id', courseId);

    if (progressError) {
      console.error('获取课程进度失败:', progressError);
      return {
        success: false,
        message: '获取课程进度失败'
      };
    }

    // 获取课程总课时数
    const { data: courseData, error: courseError } = await supabase
      .from('courses')
      .select('lesson_count')
      .eq('id', courseId)
      .single();

    if (courseError) {
      console.error('获取课程信息失败:', courseError);
      return {
        success: false,
        message: '获取课程信息失败'
      };
    }

    const totalLessons = courseData.lesson_count || 0;
    const completedLessons = progressList.filter(p => p.is_completed).length;
    const courseProgressPercentage = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;
    const totalWatchTime = progressList.reduce((sum, p) => sum + p.current_time_seconds, 0);
    const lastStudyTime = progressList.length > 0 
      ? Math.max(...progressList.map(p => new Date(p.last_updated_at).getTime()))
      : 0;

    const courseProgress: CourseProgress = {
      courseId,
      totalLessons,
      completedLessons,
      courseProgressPercentage,
      totalWatchTime,
      lastStudyTime: new Date(lastStudyTime).toISOString()
    };

    return {
      success: true,
      data: courseProgress,
      message: '获取课程进度成功'
    };
  } catch (error) {
    console.error('获取课程进度时发生错误:', error);
    return {
      success: false,
      message: '获取课程进度失败，请稍后重试'
    };
  }
}

/**
 * 获取用户学习统计
 * @param userId 用户ID
 * @returns 学习统计数据
 * 
 * @example
 * ```typescript
 * const stats = await getLearningStats('user123');
 * console.log(`总学习时长: ${stats.data?.totalStudyTime}秒`);
 * ```
 */
export async function getLearningStats(
  userId: string
): Promise<{ success: boolean; data?: LearningStats; message: string }> {
  try {
    // 获取所有学习进度
    const { data: allProgress, error: progressError } = await supabase
      .from('learning_progress')
      .select('*')
      .eq('user_id', userId);

    if (progressError) {
      console.error('获取学习统计失败:', progressError);
      return {
        success: false,
        message: '获取学习统计失败'
      };
    }

    // 计算总学习时长
    const totalStudyTime = allProgress.reduce((sum, p) => sum + p.current_time_seconds, 0);

    // 计算已完成和正在学习的课程数
    const courseProgressMap = new Map<string, { completed: number; total: number }>();
    
    for (const progress of allProgress) {
      const courseId = progress.course_id;
      if (!courseProgressMap.has(courseId)) {
        courseProgressMap.set(courseId, { completed: 0, total: 0 });
      }
      const courseProgress = courseProgressMap.get(courseId)!;
      courseProgress.total++;
      if (progress.is_completed) {
        courseProgress.completed++;
      }
    }

    let completedCourses = 0;
    let inProgressCourses = 0;
    
    for (const [, progress] of courseProgressMap) {
      if (progress.completed === progress.total && progress.total > 0) {
        completedCourses++;
      } else if (progress.completed > 0) {
        inProgressCourses++;
      }
    }

    // 计算本周学习时长
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const weeklyProgress = allProgress.filter(p => 
      new Date(p.last_updated_at) >= oneWeekAgo
    );
    const weeklyStudyTime = weeklyProgress.reduce((sum, p) => sum + p.current_time_seconds, 0);

    // 计算连续学习天数（简化实现）
    const uniqueStudyDates = new Set(
      allProgress.map(p => new Date(p.last_updated_at).toDateString())
    );
    const streakDays = uniqueStudyDates.size; // 简化计算，实际应该计算连续天数

    const stats: LearningStats = {
      totalStudyTime,
      completedCourses,
      inProgressCourses,
      weeklyStudyTime,
      streakDays
    };

    return {
      success: true,
      data: stats,
      message: '获取学习统计成功'
    };
  } catch (error) {
    console.error('获取学习统计时发生错误:', error);
    return {
      success: false,
      message: '获取学习统计失败，请稍后重试'
    };
  }
}

/**
 * 标记课时为已完成
 * @param userId 用户ID
 * @param courseId 课程ID
 * @param lessonId 课时ID
 * @returns 操作结果
 * 
 * @example
 * ```typescript
 * const result = await markLessonCompleted('user123', 'course456', 'lesson789');
 * if (result.success) {
 *   console.log('课时标记为已完成');
 * }
 * ```
 */
export async function markLessonCompleted(
  userId: string,
  courseId: string,
  lessonId: string
): Promise<{ success: boolean; message: string }> {
  try {
    const { error } = await supabase
      .from('learning_progress')
      .update({
        is_completed: true,
        progress_percentage: 100,
        last_updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .eq('lesson_id', lessonId);

    if (error) {
      console.error('标记课时完成失败:', error);
      return {
        success: false,
        message: '标记课时完成失败'
      };
    }

    return {
      success: true,
      message: '课时已标记为完成'
    };
  } catch (error) {
    console.error('标记课时完成时发生错误:', error);
    return {
      success: false,
      message: '标记课时完成失败，请稍后重试'
    };
  }
}

/**
 * 重置课时进度
 * @param userId 用户ID
 * @param courseId 课程ID
 * @param lessonId 课时ID
 * @returns 操作结果
 * 
 * @example
 * ```typescript
 * const result = await resetLessonProgress('user123', 'course456', 'lesson789');
 * if (result.success) {
 *   console.log('课时进度已重置');
 * }
 * ```
 */
export async function resetLessonProgress(
  userId: string,
  courseId: string,
  lessonId: string
): Promise<{ success: boolean; message: string }> {
  try {
    const { error } = await supabase
      .from('learning_progress')
      .update({
        current_time_seconds: 0,
        progress_percentage: 0,
        is_completed: false,
        last_updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .eq('lesson_id', lessonId);

    if (error) {
      console.error('重置课时进度失败:', error);
      return {
        success: false,
        message: '重置课时进度失败'
      };
    }

    return {
      success: true,
      message: '课时进度已重置'
    };
  } catch (error) {
    console.error('重置课时进度时发生错误:', error);
    return {
      success: false,
      message: '重置课时进度失败，请稍后重试'
    };
  }
}

/**
 * 学习进度服务对象 - 包含所有学习进度相关的服务方法
 */
const learningProgressService = {
  saveLearningProgress,
  getLearningProgress,
  getCourseProgress,
  getLearningStats,
  markLessonCompleted,
  resetLessonProgress
};

export default learningProgressService;