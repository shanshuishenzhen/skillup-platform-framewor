import React, { memo } from 'react';
import { Play, Clock, CheckCircle } from 'lucide-react';

/**
 * 课程进度卡片组件的属性接口
 */
interface CourseProgressCardProps {
  /** 课程ID */
  courseId: string;
  /** 课程标题 */
  title: string;
  /** 学习进度百分比或进度对象 */
  progress: number | {
    progressPercentage: number;
    completedLessons: number;
    totalLessons: number;
    totalWatchTime: number;
    lastStudyTime?: string;
  };
  /** 最后访问时间 */
  lastAccessed?: string;
  /** 课程描述 */
  description?: string;
  /** 课程图片URL */
  imageUrl?: string;
  /** 总时长（秒） */
  totalDuration?: number;
  /** 已观看时长（秒） */
  watchedDuration?: number;
  /** 是否已完成 */
  isCompleted?: boolean;
  /** 继续学习回调函数 */
  onContinueLearning: (courseId: string) => void;
  /** 查看详情回调函数 */
  onViewDetails: (courseId: string) => void;
  /** 格式化日期函数 */
  formatDate: (dateString: string) => string;
  /** 格式化时长函数 */
  formatDuration: (seconds: number) => string;
}

/**
 * 课程进度卡片组件（优化版本）
 * 使用React.memo进行性能优化，避免不必要的重新渲染
 * 
 * @param props 组件属性
 * @returns 课程进度卡片JSX元素
 */
const CourseProgressCard: React.FC<CourseProgressCardProps> = memo(({
  courseId,
  title,
  progress,
  lastAccessed,
  totalDuration = 0,
  watchedDuration = 0,
  isCompleted = false,
  onContinueLearning,
  onViewDetails,
  formatDate,
  formatDuration
}) => {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
      {/* 课程标题和最后访问时间 */}
      <div className="flex items-start justify-between mb-3">
        <h4 className="font-medium text-gray-900 line-clamp-2 flex-1">{title}</h4>
        <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
          {formatDate(lastAccessed)}
        </span>
      </div>
      
      {/* 进度条 */}
      <div className="mb-3">
        <div className="flex justify-between text-sm text-gray-600 mb-1">
          <span>进度</span>
          <span className="flex items-center gap-1">
            {isCompleted && <CheckCircle className="h-3 w-3 text-green-500" />}
            {Math.round(progress)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-300 ${
              isCompleted ? 'bg-green-500' : 'bg-blue-600'
            }`}
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
      </div>
      
      {/* 时长信息 */}
      {totalDuration > 0 && (
        <div className="flex items-center text-xs text-gray-500 mb-3">
          <Clock className="h-3 w-3 mr-1" />
          <span>
            {watchedDuration > 0 
              ? `${formatDuration(watchedDuration)} / ${formatDuration(totalDuration)}`
              : formatDuration(totalDuration)
            }
          </span>
        </div>
      )}
      
      {/* 操作按钮 */}
      <div className="flex gap-2">
        <button
          onClick={() => onContinueLearning(courseId)}
          className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-1"
        >
          <Play className="h-3 w-3" />
          {isCompleted ? '重新学习' : '继续学习'}
        </button>
        <button
          onClick={() => onViewDetails(courseId)}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          详情
        </button>
      </div>
    </div>
  );
});

// 设置组件显示名称，便于调试
CourseProgressCard.displayName = 'CourseProgressCard';

export default CourseProgressCard;