'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { 
  BookOpen, 
  Clock, 
  TrendingUp, 
  Target,
  BarChart3,
  PlayCircle,
  CheckCircle
} from 'lucide-react';
import { useLearningProgress, LearningStats } from '@/hooks/useLearningProgress';
import { getAllCourses, Course } from '@/services/courseService';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

/**
 * 学习进度管理页面组件
 * 提供用户学习进度的全面展示和管理功能
 */
export default function ProgressPage() {
  const router = useRouter();
  const { user } = useAuth();

  // 状态管理
  const [learningStats, setLearningStats] = useState<LearningStats | null>(null);
  const [courseProgresses, setCourseProgresses] = useState<Array<Course & { progress?: any }>>([]);
  const [recentCourses, setRecentCourses] = useState<Array<Course & { progress?: any }>>([]);
  const {
    getCourseProgress,
    getLearningStats
  } = useLearningProgress();
  
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('overview');

  /**
   * 初始化学习进度数据
   */
  useEffect(() => {
    if (!user) return;

    const initializeProgress = async () => {
      try {
        setLoading(true);

        // 并行加载学习统计和课程进度
        const [statsResult, coursesResult] = await Promise.all([
          getLearningStats(),
          getAllCourses() // 暂时获取所有课程，后续可以添加用户课程过滤
        ]);

        if (statsResult) {
          setLearningStats(statsResult);
        }

        if (coursesResult && coursesResult.length > 0) {
          // 获取每个课程的详细进度
          const coursesWithProgress = await Promise.all(
            coursesResult.map(async (course: Course) => {
              const progressResult = await getCourseProgress(course.id as string);
              return {
                ...course,
                progress: progressResult || null
              };
            })
          );

          setCourseProgresses(coursesWithProgress);
          
          // 获取最近学习的课程（按最后学习时间排序）
          const recentlyStudied = coursesWithProgress
            .filter(course => course.progress && course.progress.lastWatchedAt)
            .sort((a, b) => {
              const aTime = a.progress?.lastWatchedAt;
              const bTime = b.progress?.lastWatchedAt;
              if (!aTime || !bTime) return 0;
              return new Date(bTime).getTime() - new Date(aTime).getTime();
            })
            .slice(0, 5);
          
          setRecentCourses(recentlyStudied);
        }

      } catch (error) {
        console.error('加载学习进度失败:', error);
        toast.error('加载学习进度失败');
      } finally {
        setLoading(false);
      }
    };

    initializeProgress();
  }, [user, getCourseProgress, getLearningStats]);

  /**
   * 格式化时长显示
   * @param seconds 秒数
   * @returns 格式化的时长字符串
   */
  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}小时${minutes}分钟`;
    }
    return `${minutes}分钟`;
  };

  /**
   * 格式化日期显示
   * @param dateString 日期字符串
   * @returns 格式化的日期字符串
   */
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return '今天';
    } else if (diffDays === 1) {
      return '昨天';
    } else if (diffDays < 7) {
      return `${diffDays}天前`;
    } else {
      return date.toLocaleDateString('zh-CN');
    }
  };

  /**
   * 继续学习课程
   * @param courseId 课程ID
   */
  const continueLearning = (courseId: string) => {
    router.push(`/courses/${courseId}/learn`);
  };

  /**
   * 查看课程详情
   * @param courseId 课程ID
   */
  const viewCourse = (courseId: string) => {
    router.push(`/courses/${courseId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载学习进度中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      {/* 页面头部 */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <h1 className="text-2xl font-bold text-gray-900">学习进度</h1>
            <p className="mt-1 text-sm text-gray-600">
              查看您的学习统计和课程进度
            </p>
          </div>
          
          {/* 标签页导航 */}
          <div className="flex space-x-8">
            {[
              { key: 'overview', label: '概览', icon: BarChart3 },
              { key: 'courses', label: '课程进度', icon: BookOpen },
              { key: 'stats', label: '学习统计', icon: TrendingUp }
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex items-center px-1 py-4 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4 mr-2" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 概览标签页 */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* 学习统计卡片 */}
            {learningStats && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <BookOpen className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">学习中课程</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {learningStats.totalCourses - learningStats.completedCourses}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <CheckCircle className="h-6 w-6 text-green-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">已完成课程</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {learningStats.completedCourses}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Clock className="h-6 w-6 text-purple-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">总学习时长</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {formatDuration(learningStats.totalWatchTime)}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <Target className="h-6 w-6 text-orange-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">连续学习</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {learningStats.streakDays}天
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 最近学习的课程 */}
            <div className="bg-white rounded-lg shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">最近学习</h2>
              </div>
              <div className="p-6">
                {recentCourses.length > 0 ? (
                  <div className="space-y-4">
                    {recentCourses.map((course) => (
                      <div key={course.id as string} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="flex items-center space-x-4">
                          <Image
                            src={course.imageUrl || `https://trae-api-sg.mchost.guru/api/ide/v1/text_to_image?prompt=course%20thumbnail%20${encodeURIComponent(course.title)}&image_size=square`}
                            alt={course.title}
                            className="w-12 h-12 rounded-lg object-cover"
                          />
                          <div>
                            <h3 className="font-medium text-gray-900">{course.title}</h3>
                            <div className="flex items-center space-x-4 text-sm text-gray-600">
                              <span>进度: {Math.round(course.progress?.progressPercentage || 0)}%</span>
                              <span>最后学习: {formatDate(course.progress?.lastWatchedAt)}</span>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => continueLearning(course.id as string)}
                          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          <PlayCircle className="h-4 w-4 mr-2" />
                          继续学习
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">还没有学习记录</p>
                    <button
                      onClick={() => router.push('/courses')}
                      className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      开始学习
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 课程进度标签页 */}
        {activeTab === 'courses' && (
          <div className="bg-white rounded-lg shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">课程进度详情</h2>
            </div>
            <div className="p-6">
              {courseProgresses.length > 0 ? (
                <div className="space-y-6">
                  {courseProgresses.map((course) => (
                    <div key={course.id as string} className="border border-gray-200 rounded-lg p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-start space-x-4">
                          <Image
                             src={course.imageUrl || `https://trae-api-sg.mchost.guru/api/ide/v1/text_to_image?prompt=course%20thumbnail%20${encodeURIComponent(course.title)}&image_size=square`}
                             alt={course.title}
                             className="w-16 h-16 rounded-lg object-cover"
                             width={64}
                             height={64}
                          />
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">{course.title}</h3>
                            <p className="text-sm text-gray-600 mt-1">{course.description}</p>
                            {course.progress && (
                              <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                                <span>已完成: {course.progress.completedLessons} / {course.progress.totalLessons} 课时</span>
                                <span>学习时长: {formatDuration(course.progress.totalWatchTime)}</span>
                                {course.progress.lastWatchedAt && (
                                  <span>最后学习: {formatDate(course.progress.lastWatchedAt)}</span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => viewCourse(course.id as string)}
                            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            查看详情
                          </button>
                          {course.progress && course.progress.progressPercentage < 100 && (
                            <button
                              onClick={() => continueLearning(course.id as string)}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                              继续学习
                            </button>
                          )}
                        </div>
                      </div>
                      
                      {course.progress && (
                        <div>
                          <div className="flex justify-between text-sm text-gray-600 mb-2">
                            <span>课程进度</span>
                            <span>{Math.round(course.progress.progressPercentage)}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${course.progress.progressPercentage}%` }}
                            ></div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">还没有报名任何课程</p>
                  <button
                    onClick={() => router.push('/courses')}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    浏览课程
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 学习统计标签页 */}
        {activeTab === 'stats' && learningStats && (
          <div className="space-y-6">
            {/* 详细统计 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">学习概况</h3>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600">总学习时长</span>
                    <span className="font-medium">{formatDuration(learningStats.totalWatchTime)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">本周学习时长</span>
                    <span className="font-medium">{formatDuration(Math.floor(learningStats.totalWatchTime / 4))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">平均每日学习</span>
                    <span className="font-medium">
                      {formatDuration(Math.floor(learningStats.totalWatchTime / 28))}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">连续学习天数</span>
                    <span className="font-medium">{learningStats.streakDays}天</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">课程统计</h3>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600">已报名课程</span>
                    <span className="font-medium">
                      {learningStats.totalCourses}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">学习中课程</span>
                    <span className="font-medium">{learningStats.totalCourses - learningStats.completedCourses}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">已完成课程</span>
                    <span className="font-medium">{learningStats.completedCourses}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">完成率</span>
                    <span className="font-medium">
                      {learningStats.totalCourses > 0
                      ? Math.round((learningStats.completedCourses / learningStats.totalCourses) * 100)
                      : 0}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* 学习目标 */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">学习目标</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm text-gray-600 mb-2">
                    <span>本周学习目标 (10小时)</span>
                    <span>{Math.round((Math.floor(learningStats.totalWatchTime / 4) / 36000) * 100)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min((Math.floor(learningStats.totalWatchTime / 4) / 36000) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between text-sm text-gray-600 mb-2">
                    <span>连续学习目标 (30天)</span>
                    <span>{Math.round((learningStats.streakDays / 30) * 100)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min((learningStats.streakDays / 30) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}