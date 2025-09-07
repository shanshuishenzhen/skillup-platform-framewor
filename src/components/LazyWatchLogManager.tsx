'use client';

import { lazy, Suspense } from 'react';

/**
 * 懒加载的观看日志管理组件
 * 使用React.lazy实现代码分割，减少初始包大小
 */
const WatchLogManagerLazy = lazy(() => import('./WatchLogManager'));

/**
 * 观看日志管理组件加载中骨架屏
 * 在组件加载时显示的占位符
 */
const WatchLogManagerSkeleton = () => {
  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      {/* 标题骨架屏 */}
      <div className="flex items-center justify-between mb-6">
        <div className="h-6 bg-gray-200 rounded w-32 animate-pulse"></div>
        <div className="flex space-x-2">
          <div className="h-8 bg-gray-200 rounded w-16 animate-pulse"></div>
          <div className="h-8 bg-gray-200 rounded w-16 animate-pulse"></div>
        </div>
      </div>
      
      {/* 统计信息骨架屏 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-gray-50 rounded-lg p-4">
            <div className="h-4 bg-gray-200 rounded w-16 mb-2 animate-pulse"></div>
            <div className="h-8 bg-gray-200 rounded w-12 animate-pulse"></div>
          </div>
        ))}
      </div>
      
      {/* 过滤器骨架屏 */}
      <div className="flex flex-wrap gap-4 mb-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-10 bg-gray-200 rounded w-32 animate-pulse"></div>
        ))}
      </div>
      
      {/* 表格骨架屏 */}
      <div className="overflow-x-auto">
        <div className="min-w-full">
          {/* 表头 */}
          <div className="flex border-b border-gray-200 pb-2 mb-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex-1 h-4 bg-gray-200 rounded mx-2 animate-pulse"></div>
            ))}
          </div>
          
          {/* 表格行 */}
          {[...Array(5)].map((_, rowIndex) => (
            <div key={rowIndex} className="flex py-3 border-b border-gray-100">
              {[...Array(6)].map((_, colIndex) => (
                <div key={colIndex} className="flex-1 mx-2">
                  <div className="h-4 bg-gray-100 rounded animate-pulse"></div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
      
      {/* 分页骨架屏 */}
      <div className="flex items-center justify-between mt-6">
        <div className="h-4 bg-gray-200 rounded w-32 animate-pulse"></div>
        <div className="flex space-x-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
      
      {/* 加载提示 */}
      <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-lg">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
          <span className="text-gray-600 text-sm">正在加载观看日志管理器...</span>
        </div>
      </div>
    </div>
  );
};

/**
 * 观看日志管理组件的Props接口
 */
export interface WatchLogManagerProps {
  /** 课程ID */
  courseId: string;
  /** 课时ID */
  lessonId: string;
  /** 用户ID */
  userId?: string;
  /** 是否显示详细信息 */
  showDetails?: boolean;
  /** 自定义样式类名 */
  className?: string;
}

/**
 * 懒加载观看日志管理器包装组件
 * @param props WatchLogManager组件的所有属性
 * @returns 包装了Suspense的懒加载WatchLogManager组件
 */
export default function LazyWatchLogManager(props: WatchLogManagerProps) {
  return (
    <div className="relative">
      <Suspense fallback={<WatchLogManagerSkeleton />}>
        <WatchLogManagerLazy {...props} />
      </Suspense>
    </div>
  );
}

/**
 * 导出WatchLogManagerProps类型以供其他组件使用
 */
export type { WatchLogManagerProps };