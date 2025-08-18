'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, Settings, SkipBack, SkipForward } from 'lucide-react';
import { useLearningProgress } from '@/hooks/useLearningProgress';

interface VideoPlayerProps {
  /** 视频源URL */
  src: string;
  /** 视频标题 */
  title?: string;
  /** 视频时长（秒） */
  duration?: number;
  /** 初始播放位置（秒） */
  initialTime?: number;
  /** 播放进度变化回调 */
  onProgressChange?: (currentTime: number, duration: number) => void;
  /** 播放状态变化回调 */
  onPlayStateChange?: (isPlaying: boolean) => void;
  /** 视频结束回调 */
  onVideoEnd?: () => void;
  /** 自定义样式类名 */
  className?: string;
  /** 课程ID */
  courseId?: string;
  /** 课程章节ID */
  lessonId?: string;
  /** 课程完成回调 */
  onLessonComplete?: () => void;
}

/**
 * 视频播放器组件
 * 提供完整的视频播放控制功能，包括播放/暂停、进度控制、音量控制、全屏等
 * 支持学习进度记录和恢复功能
 * 
 * @param props VideoPlayerProps
 * @returns React组件
 * 
 * @example
 * ```tsx
 * <VideoPlayer
 *   src="/videos/lesson1.mp4"
 *   title="第一课：基础知识"
 *   initialTime={120}
 *   onProgressChange={(currentTime, duration) => {
 *     console.log(`播放进度: ${currentTime}/${duration}`);
 *   }}
 * />
 * ```
 */
export default function VideoPlayer({
  src,
  title,
  duration,
  initialTime = 0,
  onProgressChange,
  onPlayStateChange,
  onVideoEnd,
  className = '',
  courseId,
  lessonId,
  onLessonComplete
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(duration || 0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSavedTime, setLastSavedTime] = useState(0);
  
  // 学习进度管理
  const {
    getLessonProgress,
    saveProgress,
    markLessonCompleted,
    loading: progressLoading,
    error: progressError
  } = useLearningProgress();

  // 控制条显示/隐藏定时器
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 加载学习进度
  const loadProgress = useCallback(async () => {
    if (!courseId || !lessonId) return;
    
    try {
      const progress = await getLessonProgress(courseId, lessonId);
      
      if (progress && videoRef.current) {
        const savedTime = progress.currentTimeSeconds;
        if (savedTime > 0) {
          videoRef.current.currentTime = savedTime;
          setCurrentTime(savedTime);
          setLastSavedTime(savedTime);
        }
      }
    } catch (error) {
      console.error('加载学习进度失败:', error);
    }
  }, [courseId, lessonId, getLessonProgress]);

  // 保存学习进度
  const saveProgressData = useCallback(async (time: number, completed: boolean = false) => {
    if (!courseId || !lessonId || !duration) return;
    
    // 避免频繁保存，至少间隔5秒
    if (!completed && Math.abs(time - lastSavedTime) < 5) return;
    
    try {
      const success = await saveProgress(
        courseId,
        lessonId,
        time,
        duration,
        completed
      );
      
      if (success) {
        setLastSavedTime(time);
        
        if (completed) {
          await markLessonCompleted(courseId, lessonId);
          if (onLessonComplete) {
            onLessonComplete();
          }
        }
      }
    } catch (error) {
      console.error('保存学习进度失败:', error);
    }
  }, [courseId, lessonId, duration, lastSavedTime, saveProgress, markLessonCompleted, onLessonComplete]);

  /**
   * 格式化时间显示
   * @param seconds 秒数
   * @returns 格式化的时间字符串 (mm:ss)
   */
  const formatTime = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  /**
   * 切换播放/暂停状态
   */
  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;

    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
  }, [isPlaying]);

  /**
   * 处理进度条点击
   * @param event 鼠标事件
   */
  const handleProgressClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current || !progressRef.current) return;

    const rect = progressRef.current.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const newTime = (clickX / rect.width) * videoDuration;
    
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  }, [videoDuration]);

  /**
   * 处理音量变化
   * @param newVolume 新音量值 (0-1)
   */
  const handleVolumeChange = useCallback((newVolume: number) => {
    if (!videoRef.current) return;

    const clampedVolume = Math.max(0, Math.min(1, newVolume));
    setVolume(clampedVolume);
    videoRef.current.volume = clampedVolume;
    
    if (clampedVolume === 0) {
      setIsMuted(true);
    } else if (isMuted) {
      setIsMuted(false);
    }
  }, [isMuted]);

  /**
   * 切换静音状态
   */
  const toggleMute = useCallback(() => {
    if (!videoRef.current) return;

    if (isMuted) {
      videoRef.current.volume = volume;
      setIsMuted(false);
    } else {
      videoRef.current.volume = 0;
      setIsMuted(true);
    }
  }, [isMuted, volume]);

  /**
   * 切换全屏状态
   */
  const toggleFullscreen = useCallback(() => {
    if (!videoRef.current) return;

    if (!isFullscreen) {
      if (videoRef.current.requestFullscreen) {
        videoRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }, [isFullscreen]);

  /**
   * 调整播放速度
   * @param rate 播放速率
   */
  const changePlaybackRate = useCallback((rate: number) => {
    if (!videoRef.current) return;

    videoRef.current.playbackRate = rate;
    setPlaybackRate(rate);
  }, []);

  /**
   * 快进/快退
   * @param seconds 秒数（正数快进，负数快退）
   */
  const seek = useCallback((seconds: number) => {
    if (!videoRef.current) return;

    const newTime = Math.max(0, Math.min(videoDuration, currentTime + seconds));
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  }, [currentTime, videoDuration]);

  /**
   * 显示控制条并设置自动隐藏
   */
  const showControlsTemporarily = useCallback(() => {
    setShowControls(true);
    
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3000);
  }, [isPlaying]);

  // 视频事件处理
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      setVideoDuration(video.duration);
      setIsLoading(false);
      
      // 设置初始播放位置
      if (initialTime > 0) {
        video.currentTime = initialTime;
        setCurrentTime(initialTime);
      }
    };

    const handleTimeUpdate = () => {
      const current = video.currentTime;
      setCurrentTime(current);
      
      // 触发进度变化回调
      if (onProgressChange) {
        onProgressChange(current, video.duration);
      }
      
      // 自动保存学习进度
      saveProgressData(current);
    };

    const handlePlay = () => {
      setIsPlaying(true);
      if (onPlayStateChange) {
        onPlayStateChange(true);
      }
    };

    const handlePause = () => {
      setIsPlaying(false);
      if (onPlayStateChange) {
        onPlayStateChange(false);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      
      // 标记课程完成
      saveProgressData(video.duration, true);
      
      if (onVideoEnd) {
        onVideoEnd();
      }
    };

    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    const handleError = () => {
      setError('视频加载失败，请检查网络连接或视频源');
      setIsLoading(false);
    };

    // 绑定事件
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('error', handleError);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    
    // 加载学习进度
    loadProgress();

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('error', handleError);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [initialTime, onProgressChange, onPlayStateChange, onVideoEnd, loadProgress, saveProgressData]);

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!videoRef.current) return;

      switch (event.code) {
        case 'Space':
          event.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
          event.preventDefault();
          seek(-10);
          break;
        case 'ArrowRight':
          event.preventDefault();
          seek(10);
          break;
        case 'ArrowUp':
          event.preventDefault();
          handleVolumeChange(volume + 0.1);
          break;
        case 'ArrowDown':
          event.preventDefault();
          handleVolumeChange(volume - 0.1);
          break;
        case 'KeyM':
          event.preventDefault();
          toggleMute();
          break;
        case 'KeyF':
          event.preventDefault();
          toggleFullscreen();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, seek, handleVolumeChange, volume, toggleMute, toggleFullscreen]);

  return (
    <div 
      className={`relative bg-black rounded-lg overflow-hidden ${className}`}
      onMouseMove={showControlsTemporarily}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      {/* 视频元素 */}
      <video
        ref={videoRef}
        src={src}
        className="w-full h-full object-contain"
        onClick={togglePlay}
        onDoubleClick={toggleFullscreen}
      />

      {/* 加载指示器 */}
      {(isLoading || progressLoading) && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75">
          <div className="text-white text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p>{isLoading ? '视频加载中...' : '学习进度加载中...'}</p>
          </div>
        </div>
      )}

      {/* 错误提示 */}
      {(error || progressError) && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75">
          <div className="text-white text-center">
            <p className="text-lg mb-2">{error ? '视频加载失败' : '学习进度加载失败'}</p>
            <p className="text-sm text-gray-300">{error || progressError}</p>
          </div>
        </div>
      )}

      {/* 控制条 */}
      <div 
        className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* 进度条 */}
        <div 
          ref={progressRef}
          className="w-full h-2 bg-gray-600 rounded-full cursor-pointer mb-4"
          onClick={handleProgressClick}
        >
          <div 
            className="h-full bg-blue-500 rounded-full transition-all duration-100"
            style={{ width: `${videoDuration > 0 ? (currentTime / videoDuration) * 100 : 0}%` }}
          />
        </div>

        {/* 控制按钮 */}
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center space-x-4">
            {/* 播放/暂停 */}
            <button
              onClick={togglePlay}
              className="hover:text-blue-400 transition-colors"
              aria-label={isPlaying ? '暂停' : '播放'}
            >
              {isPlaying ? <Pause size={24} /> : <Play size={24} />}
            </button>

            {/* 快退 */}
            <button
              onClick={() => seek(-10)}
              className="hover:text-blue-400 transition-colors"
              aria-label="快退10秒"
            >
              <SkipBack size={20} />
            </button>

            {/* 快进 */}
            <button
              onClick={() => seek(10)}
              className="hover:text-blue-400 transition-colors"
              aria-label="快进10秒"
            >
              <SkipForward size={20} />
            </button>

            {/* 音量控制 */}
            <div className="flex items-center space-x-2">
              <button
                onClick={toggleMute}
                className="hover:text-blue-400 transition-colors"
                aria-label={isMuted ? '取消静音' : '静音'}
              >
                {isMuted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={isMuted ? 0 : volume}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                className="w-20 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* 时间显示 */}
            <span className="text-sm">
              {formatTime(currentTime)} / {formatTime(videoDuration)}
            </span>
          </div>

          <div className="flex items-center space-x-4">
            {/* 播放速度 */}
            <div className="relative group">
              <button className="hover:text-blue-400 transition-colors flex items-center space-x-1">
                <Settings size={20} />
                <span className="text-sm">{playbackRate}x</span>
              </button>
              <div className="absolute bottom-full right-0 mb-2 bg-black bg-opacity-80 rounded p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                  <button
                    key={rate}
                    onClick={() => changePlaybackRate(rate)}
                    className={`block w-full text-left px-2 py-1 text-sm hover:text-blue-400 ${
                      playbackRate === rate ? 'text-blue-400' : ''
                    }`}
                  >
                    {rate}x
                  </button>
                ))}
              </div>
            </div>

            {/* 全屏 */}
            <button
              onClick={toggleFullscreen}
              className="hover:text-blue-400 transition-colors"
              aria-label={isFullscreen ? '退出全屏' : '全屏'}
            >
              <Maximize size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* 视频标题 */}
      {title && (
        <div className="absolute top-4 left-4 text-white bg-black bg-opacity-50 px-3 py-1 rounded">
          <h3 className="text-lg font-medium">{title}</h3>
        </div>
      )}
    </div>
  );
}