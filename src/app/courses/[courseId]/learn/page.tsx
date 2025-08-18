'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, BookOpen, Clock, CheckCircle, PlayCircle } from 'lucide-react';
import VideoPlayer from '@/components/VideoPlayer';
import { getCourseById, getCourseChapters } from '@/services/courseService';
import { useLearningProgress } from '@/hooks/useLearningProgress';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

/**
 * 课程学习页面组件
 * 提供完整的课程学习体验，包括视频播放、进度跟踪、课时列表等功能
 */
export default function CourseLearnPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const courseId = params.courseId as string;

  // 状态管理
  const [course, setCourse] = useState<Record<string, unknown> | null>(null);
  const [currentLesson, setCurrentLesson] = useState<Record<string, unknown> | null>(null);
  const [lessons, setLessons] = useState<Array<Record<string, unknown>>>([]);
  const {
    getLessonProgress: fetchLessonProgress,
    getCourseProgress: fetchCourseProgress,
    saveLearningProgress,
    markLessonCompleted
  } = useLearningProgress();
  
  const [courseProgress, setCourseProgress] = useState<Record<string, unknown> | null>(null);
  const [lessonProgress, setLessonProgress] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  /**
   * 初始化课程数据
   * 加载课程信息、课时列表和学习进度
   */
  useEffect(() => {
    if (!courseId || !user) return;

    const initializeCourse = async () => {
      try {
        setLoading(true);

        // 并行加载课程信息和课时列表
        const [courseData, lessonsData] = await Promise.all([
          getCourseById(courseId),
          getCourseChapters(courseId)
        ]);

        if (!courseData.success || !lessonsData.success) {
          toast.error('加载课程信息失败');
          router.push('/courses');
          return;
        }

        setCourse(courseData.data);
        setLessons(lessonsData.data);

        // 加载课程进度
        const progressResult = await fetchCourseProgress(user.id, courseId);
        if (progressResult.success) {
          setCourseProgress(progressResult.data);
        }

        // 设置当前课时（优先选择未完成的课时）
        const uncompletedLesson = lessonsData.data.find((lesson: Record<string, unknown>) => {
          const progress = progressResult.data?.lessons?.find((p: Record<string, unknown>) => p.lessonId === lesson.id);
          return !progress?.isCompleted;
        });
        
        const initialLesson = uncompletedLesson || lessonsData.data[0];
        if (initialLesson) {
          await selectLesson(initialLesson);
        }

      } catch (error) {
        console.error('初始化课程失败:', error);
        toast.error('加载课程失败');
        router.push('/courses');
      } finally {
        setLoading(false);
      }
    };

    initializeCourse();
  }, [courseId, user, fetchCourseProgress, router, selectLesson]);

  /**
   * 选择课时
   * @param lesson 选中的课时对象
   */
  const selectLesson = useCallback(async (lesson: Record<string, unknown>) => {
    if (!user) return;

    try {
      setCurrentLesson(lesson);

      // 加载该课时的学习进度
      const progressResult = await fetchLessonProgress(
        user.id,
        courseId,
        lesson.id
      );

      if (progressResult.success) {
        setLessonProgress(progressResult.data);
      } else {
        setLessonProgress(null);
      }
    } catch (error) {
      console.error('选择课时失败:', error);
      toast.error('加载课时失败');
    }
  }, [user, courseId, fetchLessonProgress]);

  /**
   * 处理学习进度更新
   * @param progress 进度数据
   */
  const handleProgressUpdate = async (progress: {
    currentTime: number;
    duration: number;
    isCompleted: boolean;
  }) => {
    if (!user || !currentLesson) return;

    try {
      const result = await saveLearningProgress({
        userId: user.id,
        courseId,
        lessonId: currentLesson.id,
        currentTime: progress.currentTime,
        duration: progress.duration,
        progressPercentage: (progress.currentTime / progress.duration) * 100,
        completed: progress.isCompleted
      });

      if (result.success) {
        setLessonProgress(result.data);
        
        // 如果课时完成，标记为已完成并更新课程进度
        if (progress.isCompleted) {
          await markLessonCompleted(user.id, courseId, currentLesson.id);
          
          const courseProgressResult = await fetchCourseProgress(user.id, courseId);
          if (courseProgressResult.success) {
            setCourseProgress(courseProgressResult.data);
          }
          
          toast.success('课时学习完成！');
          
          // 自动跳转到下一课时
          const currentIndex = lessons.findIndex(l => l.id === currentLesson.id);
          if (currentIndex < lessons.length - 1) {
            const nextLesson = lessons[currentIndex + 1];
            setTimeout(() => {
              selectLesson(nextLesson);
            }, 2000);
          }
        }
      }
    } catch (error) {
      console.error('保存学习进度失败:', error);
    }
  };

  /**
   * 格式化时长显示
   * @param seconds 秒数
   * @returns 格式化的时长字符串
   */
  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  /**
   * 获取课时进度百分比
   * @param lessonId 课时ID
   * @returns 进度百分比
   */
  const getLessonProgress = (lessonId: string): number => {
    const progress = courseProgress?.lessons?.find((p: Record<string, unknown>) => p.lessonId === lessonId);
    return (progress?.progressPercentage as number) || 0;
  };

  /**
   * 检查课时是否已完成
   * @param lessonId 课时ID
   * @returns 是否已完成
   */
  const isLessonCompleted = (lessonId: string): boolean => {
    const progress = courseProgress?.lessons?.find((p: Record<string, unknown>) => p.lessonId === lessonId);
    return (progress?.isCompleted as boolean) || false;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载课程中...</p>
        </div>
      </div>
    );
  }

  if (!course || !currentLesson) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">课程不存在或加载失败</p>
          <button
            onClick={() => router.push('/courses')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            返回课程列表
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航栏 */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push(`/courses/${courseId}`)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">{course.title}</h1>
              <p className="text-sm text-gray-600">{currentLesson.title}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {courseProgress && (
              <div className="text-sm text-gray-600">
                进度: {Math.round(courseProgress.progressPercentage)}%
              </div>
            )}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors lg:hidden"
            >
              <BookOpen className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* 主内容区域 */}
        <div className={`flex-1 ${sidebarOpen ? 'lg:mr-80' : ''} transition-all duration-300`}>
          <div className="p-4">
            {/* 视频播放器 */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-6">
              <VideoPlayer
                src={currentLesson.video_url}
                title={currentLesson.title}
                userId={user.id}
                courseId={courseId}
                lessonId={currentLesson.id}
                initialProgress={lessonProgress}
                onProgressUpdate={handleProgressUpdate}
              />
            </div>

            {/* 课时信息 */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">
                    {currentLesson.title}
                  </h2>
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      {formatDuration(currentLesson.duration)}
                    </div>
                    <div className="flex items-center">
                      <PlayCircle className="h-4 w-4 mr-1" />
                      {currentLesson.order} / {lessons.length}
                    </div>
                  </div>
                </div>
                
                {isLessonCompleted(currentLesson.id) && (
                  <div className="flex items-center text-green-600">
                    <CheckCircle className="h-5 w-5 mr-1" />
                    <span className="text-sm font-medium">已完成</span>
                  </div>
                )}
              </div>
              
              {currentLesson.description && (
                <div className="prose max-w-none">
                  <p className="text-gray-700">{currentLesson.description}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 课时列表侧边栏 */}
        <div className={`fixed right-0 top-16 h-[calc(100vh-4rem)] w-80 bg-white border-l border-gray-200 transform transition-transform duration-300 z-30 ${
          sidebarOpen ? 'translate-x-0' : 'translate-x-full'
        } lg:relative lg:top-0 lg:h-[calc(100vh-4rem)] lg:translate-x-0`}>
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">课程目录</h3>
            {courseProgress && (
              <div className="mt-2">
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>整体进度</span>
                  <span>{Math.round(courseProgress.progressPercentage)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${courseProgress.progressPercentage}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>
          
          <div className="overflow-y-auto h-[calc(100%-5rem)]">
            {lessons.map((lesson: Record<string, unknown>, index: number) => {
              const progress = getLessonProgress(lesson.id);
              const completed = isLessonCompleted(lesson.id);
              const isCurrent = currentLesson.id === lesson.id;
              
              return (
                <div
                  key={lesson.id}
                  className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                    isCurrent ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''
                  }`}
                  onClick={() => selectLesson(lesson)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center mb-1">
                        <span className="text-xs text-gray-500 mr-2">
                          {String(index + 1).padStart(2, '0')}
                        </span>
                        {completed && (
                          <CheckCircle className="h-4 w-4 text-green-600 mr-1" />
                        )}
                        <h4 className={`text-sm font-medium truncate ${
                          isCurrent ? 'text-blue-600' : 'text-gray-900'
                        }`}>
                          {lesson.title}
                        </h4>
                      </div>
                      
                      <div className="flex items-center text-xs text-gray-500 mb-2">
                        <Clock className="h-3 w-3 mr-1" />
                        {formatDuration(lesson.duration)}
                      </div>
                      
                      {progress > 0 && (
                        <div className="w-full bg-gray-200 rounded-full h-1">
                          <div 
                            className={`h-1 rounded-full transition-all duration-300 ${
                              completed ? 'bg-green-600' : 'bg-blue-600'
                            }`}
                            style={{ width: `${progress}%` }}
                          ></div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      
      {/* 移动端遮罩层 */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}
    </div>
  );
}