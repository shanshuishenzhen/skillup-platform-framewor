'use client';

import { lazy, Suspense } from 'react';
import { VideoPlayerProps } from './VideoPlayer';

/**
 * 懒加载的视频播放器组件
 * 使用React.lazy实现代码分割，减少初始包大小
 */
const VideoPlayerLazy = lazy(() => import('./VideoPlayer'));

/**
 * 视频播放器加载中组件
 * 在视频播放器加载时显示的占位符
 */
const VideoPlayerSkeleton = () => {
  return (
    <div className="relative w-full bg-gray-900 rounded-lg overflow-hidden">
      {/* 视频区域骨架屏 */}
      <div className="aspect-video bg-gray-800 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
      
      {/* 控制条骨架屏 */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
        {/* 进度条 */}
        <div className="w-full h-1 bg-gray-600 rounded-full mb-3">
          <div className="h-full bg-gray-500 rounded-full w-1/3"></div>
        </div>
        
        {/* 控制按钮 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gray-600 rounded-full"></div>
            <div className="w-8 h-8 bg-gray-600 rounded-full"></div>
            <div className="w-8 h-8 bg-gray-600 rounded-full"></div>
            <div className="w-16 h-4 bg-gray-600 rounded"></div>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="w-12 h-4 bg-gray-600 rounded"></div>
            <div className="w-8 h-8 bg-gray-600 rounded-full"></div>
          </div>
        </div>
      </div>
      
      {/* 加载提示 */}
      <div className="absolute inset-0 flex items-center justify-center bg-black/20">
        <div className="text-white text-sm font-medium">
          正在加载视频播放器...
        </div>
      </div>
    </div>
  );
};

/**
 * 懒加载视频播放器包装组件
 * @param props VideoPlayer组件的所有属性
 * @returns 包装了Suspense的懒加载VideoPlayer组件
 */
export default function LazyVideoPlayer(props: VideoPlayerProps) {
  return (
    <Suspense fallback={<VideoPlayerSkeleton />}>
      <VideoPlayerLazy {...props} />
    </Suspense>
  );
}

/**
 * 导出VideoPlayerProps类型以供其他组件使用
 */
export type { VideoPlayerProps };