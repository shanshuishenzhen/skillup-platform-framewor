'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, BookOpen, Clock, CheckCircle, PlayCircle, Database, Settings } from 'lucide-react';
import LazyVideoPlayer from '@/components/LazyVideoPlayer';
import LazyWatchLogManager from '@/components/LazyWatchLogManager';
import { getCourseById, getCourseChapters, type Course, type Chapter, type Video } from '@/services/courseService';
import { useLearningProgress, type CourseProgress, type LearningProgress } from '@/hooks/useLearningProgress';
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
  const [course, setCourse] = useState<Course | null>(null);
  const [currentLesson, setCurrentLesson] = useState<Video | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [allVideos, setAllVideos] = useState<Video[]>([]);
  const {
    getLessonProgress: fetchLessonProgress,
    getCourseProgress,
    saveProgress,
    markLessonCompleted,
  } = useLearningProgress();
  
  const [courseProgress, setCourseProgress] = useState<CourseProgress | null>(null);
  const [lessonProgress, setLessonProgress] = useState<LearningProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  // 调试信息状态
  const [debugInfo, setDebugInfo] = useState({
    currentTime: 0,
    totalWatchTime: 0,
    lastSaveTime: null as Date | null,
    resumeFromTime: 0,
    progressSaveStatus: 'idle' as 'idle' | 'saving' | 'saved' | 'error'
  });
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [showLogManager, setShowLogManager] = useState(false);

  /**
   * 初始化课程数据
   * 加载课程信息、课时列表和学习进度
   */
  useEffect(() => {
    if (!courseId) return;

    const initializeCourse = async () => {
      try {
        setLoading(true);

        // 并行加载课程信息和课时列表
        const [courseData, lessonsData] = await Promise.all([
          getCourseById(courseId),
          getCourseChapters(courseId)
        ]);

        if (!courseData || !lessonsData) {
          toast.error('加载课程信息失败');
          router.push('/courses');
          return;
        }

        setCourse(courseData);
        setChapters(lessonsData);

        // 提取所有视频
        const videos: Video[] = [];
        lessonsData.forEach(chapter => {
          if (chapter.videos) {
            videos.push(...chapter.videos);
          }
        });
        setAllVideos(videos);

        // 只有登录用户才加载学习进度
        let progressResult = null;
        if (user) {
          try {
            progressResult = await getCourseProgress(courseId);
            if (progressResult) {
              setCourseProgress(progressResult);
            }
          } catch (error) {
            console.warn('获取学习进度失败，但不影响课程访问:', error);
            // 对于免费课程，进度获取失败不应该阻止访问
          }
        }

        // 设置当前课时（选择第一个视频或最后观看的视频）
        const lastWatchedVideo = progressResult?.lastWatchedLessonId 
          ? videos.find((video: Video) => video.id === progressResult.lastWatchedLessonId)
          : null;
        const initialVideo = lastWatchedVideo || videos[0];
        
        if (initialVideo) {
          await selectLesson(initialVideo);
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
  }, [courseId, user, getCourseProgress, router]);

  /**
   * 选择课时
   * @param lesson 选中的视频对象
   */
  const selectLesson = useCallback(async (lesson: Video) => {
    try {
      setCurrentLesson(lesson);

      // 只有登录用户才加载学习进度
      if (user) {
        try {
          const progressResult = await fetchLessonProgress(
            courseId,
            lesson.id
          );

          if (progressResult) {
            setLessonProgress(progressResult);
            // 更新调试信息 - 断点续播
            setDebugInfo(prev => ({
              ...prev,
              resumeFromTime: progressResult.currentTime || 0,
              currentTime: progressResult.currentTime || 0
            }));
          } else {
            setLessonProgress(null);
            // 重置调试信息
            setDebugInfo(prev => ({
              ...prev,
              resumeFromTime: 0,
              currentTime: 0
            }));
          }
        } catch (error) {
          console.warn('获取课时进度失败，但不影响视频播放:', error);
          setLessonProgress(null);
          // 重置调试信息
          setDebugInfo(prev => ({
            ...prev,
            resumeFromTime: 0,
            currentTime: 0
          }));
        }
      } else {
        // 未登录用户直接重置进度信息
        setLessonProgress(null);
        setDebugInfo(prev => ({
          ...prev,
          resumeFromTime: 0,
          currentTime: 0
        }));
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
    if (!currentLesson) return;

    // 更新调试信息（无论是否登录都更新本地调试信息）
    setDebugInfo(prev => ({
      ...prev,
      currentTime: progress.currentTime,
      totalWatchTime: prev.totalWatchTime + 1, // 简单累加观看时间
      progressSaveStatus: user ? 'saving' : 'guest'
    }));

    // 只有登录用户才保存进度到服务器
    if (!user) {
      // 未登录用户只更新本地调试信息
      setDebugInfo(prev => ({
        ...prev,
        progressSaveStatus: 'guest'
      }));
      
      // 如果视频完成，仍然可以自动跳转到下一课时
      if (progress.isCompleted) {
        toast.success('课时观看完成！登录后可保存学习进度');
        
        // 自动跳转到下一课时
        const currentIndex = allVideos.findIndex(v => v.id === currentLesson.id);
        if (currentIndex < allVideos.length - 1) {
          const nextVideo = allVideos[currentIndex + 1];
          setTimeout(() => {
            selectLesson(nextVideo);
          }, 2000);
        }
      }
      return;
    }

    try {
      const result = await saveProgress(
        courseId,
        currentLesson.id,
        progress.currentTime,
        progress.duration,
        progress.isCompleted
      );

      if (result) {
        // 更新调试信息 - 保存成功
        setDebugInfo(prev => ({
          ...prev,
          lastSaveTime: new Date(),
          progressSaveStatus: 'saved'
        }));

        // 重新获取课时进度
        const progressResult = await fetchLessonProgress(
          courseId,
          currentLesson.id
        );
        if (progressResult) {
          setLessonProgress(progressResult);
        }
        
        // 如果课时完成，标记为已完成并更新课程进度
        if (progress.isCompleted) {
          await markLessonCompleted(courseId, currentLesson.id);
          
          const courseProgressResult = await getCourseProgress(courseId);
          if (courseProgressResult) {
            setCourseProgress(courseProgressResult);
          }
          
          toast.success('课时学习完成！');
          
          // 自动跳转到下一课时
          const currentIndex = allVideos.findIndex(v => v.id === currentLesson.id);
          if (currentIndex < allVideos.length - 1) {
            const nextVideo = allVideos[currentIndex + 1];
            setTimeout(() => {
              selectLesson(nextVideo);
            }, 2000);
          }
        }
      } else {
        // 更新调试信息 - 保存失败
        setDebugInfo(prev => ({
          ...prev,
          progressSaveStatus: 'error'
        }));
      }
    } catch (error) {
      console.error('保存学习进度失败:', error);
      // 更新调试信息 - 保存错误
      setDebugInfo(prev => ({
        ...prev,
        progressSaveStatus: 'error'
      }));
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
    // 基于课程整体进度计算单个课时进度
    return courseProgress ? courseProgress.overallProgress : 0;
  };

  /**
   * 检查课时是否已完成
   * @param lessonId 课时ID
   * @returns 是否已完成
   */
  const isLessonCompleted = (lessonId: string): boolean => {
    // 检查当前课时进度是否为已完成状态
    return lessonProgress?.isCompleted || false;
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
                进度: {Math.round(courseProgress.overallProgress)}%
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
              <LazyVideoPlayer
                src={currentLesson.videoUrl || ''}
                title={currentLesson.title}
                courseId={courseId}
                lessonId={currentLesson.id}
                initialTime={lessonProgress?.currentTimeSeconds || 0}
                onProgressChange={(currentTime: number, duration: number) => {
                  // 实时更新调试信息中的当前播放时间
                  setDebugInfo(prev => ({
                    ...prev,
                    currentTime: currentTime
                  }));
                  
                  handleProgressUpdate({
                    currentTime,
                    duration,
                    isCompleted: currentTime >= duration * 0.95 // 播放95%以上视为完成
                  });
                }}
                onLessonComplete={() => {
                  // 课时完成回调
                  console.log('课时完成:', currentLesson.id);
                }}
              />
            </div>

            {/* 调试信息面板 - 开发模式下可见 */}
            {process.env.NODE_ENV === 'development' && (
              <div className="bg-white rounded-lg shadow-sm p-4 mb-6 border-l-4 border-l-gray-300">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-medium text-gray-600 flex items-center">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-2"></span>
                    调试信息
                  </h3>
                  <button
                    onClick={() => setShowDebugPanel(!showDebugPanel)}
                    className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showDebugPanel ? '隐藏' : '显示'}
                  </button>
                </div>
              
                {showDebugPanel && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div className="bg-gray-50 p-2 rounded">
                      <div className="text-gray-500 mb-1">播放时间</div>
                      <div className="font-mono text-blue-600 text-xs">
                        {Math.floor(debugInfo.currentTime / 60)}:{String(Math.floor(debugInfo.currentTime % 60)).padStart(2, '0')}
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 p-2 rounded">
                      <div className="text-gray-500 mb-1">累计时长</div>
                      <div className="font-mono text-green-600 text-xs">
                        {Math.floor(debugInfo.totalWatchTime / 60)}:{String(Math.floor(debugInfo.totalWatchTime % 60)).padStart(2, '0')}
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 p-2 rounded">
                      <div className="text-gray-500 mb-1">续播时间</div>
                      <div className="font-mono text-purple-600 text-xs">
                        {Math.floor(debugInfo.resumeFromTime / 60)}:{String(Math.floor(debugInfo.resumeFromTime % 60)).padStart(2, '0')}
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 p-2 rounded">
                      <div className="text-gray-500 mb-1">状态</div>
                      <div className={`font-medium text-xs ${
                        debugInfo.progressSaveStatus === 'saved' ? 'text-green-600' :
                        debugInfo.progressSaveStatus === 'saving' ? 'text-yellow-600' :
                        debugInfo.progressSaveStatus === 'error' ? 'text-red-600' :
                        'text-gray-600'
                      }`}>
                        {debugInfo.progressSaveStatus === 'saved' ? '已保存' :
                         debugInfo.progressSaveStatus === 'saving' ? '保存中' :
                         debugInfo.progressSaveStatus === 'error' ? '失败' :
                         '未保存'}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 观看日志管理 */}
            <LazyWatchLogManager 
              isOpen={showLogManager}
              onClose={() => setShowLogManager(false)}
            />

            {/* 课时信息 */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
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
                      {currentLesson.orderIndex} / {allVideos.length}
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
                  <span>{Math.round(courseProgress.overallProgress)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${courseProgress.overallProgress}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>
          
          <div className="overflow-y-auto h-[calc(100%-5rem)]">
            {chapters.map((chapter: Chapter, chapterIndex: number) => (
              <div key={chapter.id}>
                {/* 章节标题 */}
                <div className="px-4 py-2 bg-gray-100 border-b border-gray-200">
                  <h4 className="font-medium text-gray-900 text-sm">{chapter.title}</h4>
                </div>
                
                {/* 章节下的视频列表 */}
                {chapter.videos?.map((video: Video, videoIndex: number) => {
                  const progress = getLessonProgress(video.id);
                  const completed = isLessonCompleted(video.id);
                  const isCurrent = currentLesson?.id === video.id;
                  
                  return (
                    <div
                      key={video.id}
                      className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                        isCurrent ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''
                      }`}
                      onClick={() => selectLesson(video)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center mb-1">
                            <span className="text-xs text-gray-500 mr-2">
                              {String(video.orderIndex).padStart(2, '0')}
                            </span>
                            {completed && (
                              <CheckCircle className="h-4 w-4 text-green-600 mr-1" />
                            )}
                            <h4 className={`text-sm font-medium truncate ${
                              isCurrent ? 'text-blue-600' : 'text-gray-900'
                            }`}>
                              {video.title}
                            </h4>
                          </div>
                          
                          <div className="flex items-center text-xs text-gray-500 mb-2">
                            <Clock className="h-3 w-3 mr-1" />
                            {formatDuration(video.duration)}
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
            ))}
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

      {/* 调试和管理控制按钮 */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 right-4 flex flex-col space-y-2 z-40">
          <button
            onClick={() => setShowDebugPanel(!showDebugPanel)}
            className="w-8 h-8 bg-gray-800 text-white rounded-full flex items-center justify-center text-xs hover:bg-gray-700 transition-colors"
            title="切换调试信息"
          >
            <Settings className="w-3 h-3" />
          </button>
          <button
            onClick={() => setShowLogManager(true)}
            className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs hover:bg-blue-700 transition-colors"
            title="观看日志管理"
          >
            <Database className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}