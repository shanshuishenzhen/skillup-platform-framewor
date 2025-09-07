'use client';

import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, Settings, SkipBack, SkipForward } from 'lucide-react';
import '@/styles/video-player.css';
import { useLearningProgress } from '@/hooks/useLearningProgress';
import { useAuth } from '@/hooks/useAuth';
import { usePerformanceMonitor } from '@/hooks/usePerformanceMonitor';

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
  const containerRef = useRef<HTMLDivElement>(null);
  const intersectionObserverRef = useRef<IntersectionObserver | null>(null);
  
  // 性能监控
  const performanceMonitor = usePerformanceMonitor({
    componentName: 'VideoPlayer',
    trackRender: true,
    trackInteraction: true,
  });
  const [state, setState] = useState({
    isPlaying: false,
    currentTime: 0,
    duration: duration || 0,
    volume: 1,
    isMuted: false,
    isFullscreen: false,
    playbackRate: 1,
    showControls: true,
    isLoading: true,
    error: null as string | null,
    buffered: 0,
    isVisible: true,
  });
  
  const [lastSavedTime, setLastSavedTime] = useState(0);
  const [totalWatchTime, setTotalWatchTime] = useState(0); // 累计观看时长（仅正常速度）
  const [lastUpdateTime, setLastUpdateTime] = useState<number | null>(null); // 上次更新时间
  const [isCountingTime, setIsCountingTime] = useState(false); // 是否正在计时
  
  // 使用useMemo优化计算
  const progressPercentage = useMemo(() => {
    return state.duration > 0 ? (state.currentTime / state.duration) * 100 : 0;
  }, [state.currentTime, state.duration]);
  
  const bufferedPercentage = useMemo(() => {
    return state.duration > 0 ? (state.buffered / state.duration) * 100 : 0;
  }, [state.buffered, state.duration]);
  
  // 初始化视口检测
  useEffect(() => {
    performanceMonitor.startTimer('video-initialization');
    
    // 设置视口可见性检测
    if (containerRef.current) {
      intersectionObserverRef.current = new IntersectionObserver(
        (entries) => {
          const [entry] = entries;
          const isVisible = entry.isIntersecting;
          
          setState(prev => ({ ...prev, isVisible }));
          
          // 当视频不可见时暂停播放以节省资源
          if (!isVisible && state.isPlaying && videoRef.current) {
            videoRef.current.pause();
            performanceMonitor.recordEvent('video-auto-pause', 0, { reason: 'not-visible' });
          }
        },
        { threshold: 0.5 } // 50%可见时触发
      );
      
      intersectionObserverRef.current.observe(containerRef.current);
    }
    
    performanceMonitor.endTimer('video-initialization');
    
    return () => {
      if (intersectionObserverRef.current) {
        intersectionObserverRef.current.disconnect();
      }
    };
  }, [user?.id, lessonId, performanceMonitor]);
  
  // 用户认证状态
  const { user } = useAuth();
  
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
    
    performanceMonitor.startTimer('toggle-play');
    performanceMonitor.recordInteraction('click', 'play-button');

    if (state.isPlaying) {
      videoRef.current.pause();
      watchLoggerRef.current?.logAction('pause', state.currentTime);
    } else {
      videoRef.current.play();
      watchLoggerRef.current?.logAction('play', state.currentTime);
    }
    
    performanceMonitor.endTimer('toggle-play');
  }, [state.isPlaying, state.currentTime, performanceMonitor]);

  /**
   * 处理进度条点击
   * @param event 鼠标事件
   */
  const handleProgressClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current || !progressRef.current) return;
    
    performanceMonitor.startTimer('progress-seek');
    performanceMonitor.recordInteraction('click', 'progress-bar');

    const rect = progressRef.current.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const newTime = (clickX / rect.width) * state.duration;
    
    videoRef.current.currentTime = newTime;
    watchLoggerRef.current?.logAction('seek', newTime, { from: state.currentTime });
    
    performanceMonitor.endTimer('progress-seek');
  }, [state.duration, state.currentTime, performanceMonitor]);

  /**
   * 处理音量变化
   * @param newVolume 新音量值 (0-1)
   */
  const handleVolumeChange = useCallback((newVolume: number) => {
    if (!videoRef.current) return;
    
    performanceMonitor.recordInteraction('change', 'volume-slider');
    
    const clampedVolume = Math.max(0, Math.min(1, newVolume));
    videoRef.current.volume = clampedVolume;
    setState(prev => ({
      ...prev,
      volume: clampedVolume,
      isMuted: clampedVolume === 0 ? true : prev.isMuted && clampedVolume > 0 ? false : prev.isMuted
    }));
    
    watchLoggerRef.current?.logAction('volume_change', state.currentTime, {
      volume: clampedVolume,
      muted: clampedVolume === 0
    });
  }, [performanceMonitor, state.currentTime]);

  /**
   * 切换静音状态
   */
  const toggleMute = useCallback(() => {
    if (!videoRef.current) return;
    
    performanceMonitor.recordInteraction('click', 'mute-button');
    
    const newMuted = !state.isMuted;
    if (newMuted) {
      videoRef.current.volume = 0;
    } else {
      videoRef.current.volume = state.volume;
    }
    setState(prev => ({ ...prev, isMuted: newMuted }));
    
    watchLoggerRef.current?.logAction(newMuted ? 'mute' : 'unmute', state.currentTime, {
      muted: newMuted
    });
  }, [state.isMuted, state.volume, state.currentTime, performanceMonitor]);

  /**
   * 切换全屏状态
   */
  const toggleFullscreen = useCallback(() => {
    if (!videoRef.current) return;
    
    performanceMonitor.startTimer('fullscreen-toggle');
    performanceMonitor.recordInteraction('click', 'fullscreen-button');

    const willBeFullscreen = !state.isFullscreen;
    if (willBeFullscreen) {
      if (videoRef.current.requestFullscreen) {
        videoRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
    
    watchLoggerRef.current?.logAction('fullscreen', state.currentTime, {
      fullscreen: willBeFullscreen
    });
    
    performanceMonitor.endTimer('fullscreen-toggle');
  }, [state.isFullscreen, state.currentTime, performanceMonitor]);

  /**
   * 调整播放速度
   * @param rate 播放速率
   */
  const changePlaybackRate = useCallback((rate: number) => {
    if (!videoRef.current) return;

    performanceMonitor.recordInteraction('change', 'playback-rate');
    
    videoRef.current.playbackRate = rate;
    setState(prev => ({ ...prev, playbackRate: rate }));
    
    watchLoggerRef.current?.logAction('speed_change', state.currentTime, {
      playbackRate: rate,
      previousSpeed: state.playbackRate
    });
    
    // 非正常速度时停止计时
    setIsCountingTime(rate === 1);
  }, [performanceMonitor, state.currentTime, state.playbackRate]);

  /**
   * 快进/快退
   * @param seconds 秒数（正数快进，负数快退）
   */
  const seek = useCallback((seconds: number) => {
    if (!videoRef.current) return;

    performanceMonitor.recordInteraction('click', seconds > 0 ? 'skip-forward' : 'skip-backward');
    
    const newTime = Math.max(0, Math.min(state.duration, state.currentTime + seconds));
    videoRef.current.currentTime = newTime;
    
    watchLoggerRef.current?.logAction('seek', newTime, {
      seekAmount: seconds,
      from: state.currentTime
    });
    
    // 跳转时停止计时，重新开始计时
    setIsCountingTime(false);
    setTimeout(() => setIsCountingTime(true), 100);
  }, [state.currentTime, state.duration, performanceMonitor]);

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
      performanceMonitor.recordEvent('video-metadata-loaded', 0, {
        duration: video.duration,
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight
      });
      
      setState(prev => ({
        ...prev,
        duration: video.duration,
        isLoading: false,
        error: null
      }));
      
      watchLoggerRef.current?.logAction('metadata_loaded', 0, {
        duration: video.duration,
        dimensions: `${video.videoWidth}x${video.videoHeight}`
      });
      
      // 设置初始播放位置
      if (initialTime > 0) {
        video.currentTime = initialTime;
        setState(prev => ({ ...prev, currentTime: initialTime }));
      }
    };

    const handleTimeUpdate = () => {
      const current = video.currentTime;
      const now = Date.now();
      
      // 更新缓冲进度
      let buffered = 0;
      if (video.buffered.length > 0) {
        buffered = video.buffered.end(video.buffered.length - 1);
      }
      
      setState(prev => ({
        ...prev,
        currentTime: current,
        buffered
      }));
      
      // 只在正常速度（1x）播放且未暂停时累计观看时长
      if (state.isPlaying && state.playbackRate === 1 && lastUpdateTime && isCountingTime) {
        const timeDiff = (now - lastUpdateTime) / 1000; // 转换为秒
        // 只有时间差在合理范围内才累计（避免页面切换等异常情况）
        if (timeDiff > 0 && timeDiff < 2) {
          setTotalWatchTime(prev => prev + timeDiff);
        }
      }
      
      setLastUpdateTime(now);
      
      // 触发进度变化回调
      if (onProgressChange) {
        onProgressChange(current, video.duration);
      }
      
      // 自动保存学习进度
      saveProgressData(current);
    };

    const handlePlay = () => {
      performanceMonitor.recordEvent('video-play', 0, {
        currentTime: video.currentTime,
        playbackRate: video.playbackRate
      });
      
      setState(prev => ({ ...prev, isPlaying: true }));
      setIsCountingTime(true);
      
      if (onPlayStateChange) {
        onPlayStateChange(true);
      }
    };

    const handlePause = () => {
      performanceMonitor.recordEvent('video-pause', 0, {
        currentTime: video.currentTime,
        duration: video.duration
      });
      
      setState(prev => ({ ...prev, isPlaying: false }));
      setIsCountingTime(false);
      
      if (onPlayStateChange) {
        onPlayStateChange(false);
      }
    };

    const handleEnded = () => {
      performanceMonitor.recordEvent('video-ended', 0, {
        totalWatchTime,
        completionRate: video.duration > 0 ? (video.currentTime / video.duration) * 100 : 0
      });
      
      setState(prev => ({ ...prev, isPlaying: false }));
      setIsCountingTime(false);
      
      // 记录视频结束操作
      watchLoggerRef.current?.logAction('end', video.currentTime, {
        duration: video.duration || 0,
        playbackRate: state.playbackRate,
        volume: state.volume,
        muted: state.isMuted,
        fullscreen: state.isFullscreen,
        totalWatchTime,
        completionRate: 100
      });
      
      // 标记课程完成
      saveProgressData(video.duration, true);
      
      if (onVideoEnd) {
        onVideoEnd();
      }
    };

    const handleFullscreenChange = () => {
      setState(prev => ({ ...prev, isFullscreen: !!document.fullscreenElement }));
    };

    const handleError = (event: Event) => {
      const error = video.error;
      const errorMessage = error ? `视频加载失败 (错误代码: ${error.code})` : '视频加载失败，请检查网络连接或视频源';
      
      performanceMonitor.recordError(new Error(errorMessage), 'video-playback');
      
      setState(prev => ({
        ...prev,
        error: errorMessage,
        isLoading: false
      }));
      
      watchLoggerRef.current?.logAction('video_error', video.currentTime, {
        errorCode: error?.code,
        errorMessage
      });
    };

    const handleWaiting = () => {
      performanceMonitor.recordEvent('video-buffering-start', 0, {
        currentTime: video.currentTime
      });
    };

    const handleCanPlay = () => {
      performanceMonitor.recordEvent('video-buffering-end', 0, {
        currentTime: video.currentTime
      });
    };

    // 绑定事件
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('error', handleError);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('canplay', handleCanPlay);
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
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('canplay', handleCanPlay);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [initialTime, onProgressChange, onPlayStateChange, onVideoEnd, loadProgress, saveProgressData, performanceMonitor, totalWatchTime, state.isPlaying, state.playbackRate, state.volume, state.isMuted, state.isFullscreen]);

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 只在视频容器获得焦点时响应快捷键
      if (!containerRef.current?.contains(document.activeElement)) {
        return;
      }

      performanceMonitor.recordInteraction('keyboard-shortcut', {
        key: e.code,
        currentTime: videoRef.current?.currentTime || 0
      });

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          performanceMonitor.startTimer('keyboard-play-toggle');
          togglePlay();
          performanceMonitor.endTimer('keyboard-play-toggle');
          break;
        case 'ArrowLeft':
          e.preventDefault();
          performanceMonitor.startTimer('keyboard-skip-backward');
          seek(-10);
          performanceMonitor.endTimer('keyboard-skip-backward');
          break;
        case 'ArrowRight':
          e.preventDefault();
          performanceMonitor.startTimer('keyboard-skip-forward');
          seek(10);
          performanceMonitor.endTimer('keyboard-skip-forward');
          break;
        case 'ArrowUp':
          e.preventDefault();
          performanceMonitor.startTimer('keyboard-volume-up');
          handleVolumeChange(Math.min(state.volume + 0.1, 1));
          performanceMonitor.endTimer('keyboard-volume-up');
          break;
        case 'ArrowDown':
          e.preventDefault();
          performanceMonitor.startTimer('keyboard-volume-down');
          handleVolumeChange(Math.max(state.volume - 0.1, 0));
          performanceMonitor.endTimer('keyboard-volume-down');
          break;
        case 'KeyM':
          e.preventDefault();
          performanceMonitor.startTimer('keyboard-mute-toggle');
          toggleMute();
          performanceMonitor.endTimer('keyboard-mute-toggle');
          break;
        case 'KeyF':
          e.preventDefault();
          performanceMonitor.startTimer('keyboard-fullscreen-toggle');
          toggleFullscreen();
          performanceMonitor.endTimer('keyboard-fullscreen-toggle');
          break;
        default:
          // 记录未处理的按键
          watchLoggerRef.current?.logAction('keyboard_shortcut', videoRef.current?.currentTime || 0, {
            key: e.code,
            handled: false
          });
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, seek, handleVolumeChange, state.volume, toggleMute, toggleFullscreen, performanceMonitor]);

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
        className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-4 py-3 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* 进度条 */}
        <div className="mb-4">
          <div 
            ref={progressRef}
            className="progress-bar w-full h-2 bg-white/20 rounded-full cursor-pointer relative group hover:h-3 transition-all duration-200"
            onClick={handleProgressClick}
          >
            <div 
              className="h-full bg-blue-500 rounded-full relative transition-all duration-200"
              style={{ width: `${videoDuration > 0 ? (currentTime / videoDuration) * 100 : 0}%` }}
            >
              <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-4 h-4 bg-blue-500 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-200 border-2 border-white" />
            </div>
            {/* 缓冲进度 */}
            <div 
              className="absolute top-0 left-0 h-full bg-white/30 rounded-full"
              style={{ width: `${Math.min(100, (videoDuration > 0 ? (currentTime / videoDuration) * 100 : 0) + 10)}%` }}
            />
          </div>
        </div>

        {/* 控制按钮 */}
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center space-x-4">
            {/* 播放/暂停 */}
            <button
              onClick={togglePlay}
              className="control-button hover:text-blue-400 transition-all duration-200 p-2 rounded-full hover:bg-white/10 group"
              aria-label={isPlaying ? '暂停' : '播放'}
            >
              {isPlaying ? (
                <Pause size={28} className="group-hover:scale-110 transition-transform" />
              ) : (
                <Play size={28} className="group-hover:scale-110 transition-transform" />
              )}
            </button>

            {/* 快退 */}
            <button
              onClick={() => seek(-10)}
              className="control-button hover:text-blue-400 transition-all duration-200 p-2 rounded-full hover:bg-white/10 group relative"
              aria-label="快退10秒"
            >
              <SkipBack size={24} className="group-hover:scale-110 transition-transform" />
              <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black/80 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">后退10秒</span>
            </button>

            {/* 快进 */}
            <button
              onClick={() => seek(10)}
              className="control-button hover:text-blue-400 transition-all duration-200 p-2 rounded-full hover:bg-white/10 group relative"
              aria-label="快进10秒"
            >
              <SkipForward size={24} className="group-hover:scale-110 transition-transform" />
              <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black/80 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">前进10秒</span>
            </button>

            {/* 音量控制 */}
            <div className="flex items-center space-x-3 group">
              <button
              onClick={toggleMute}
              className="control-button hover:text-blue-400 transition-all duration-200 p-2 rounded-full hover:bg-white/10"
              aria-label={isMuted ? '取消静音' : '静音'}
            >
              {isMuted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>
              <div className="w-0 group-hover:w-24 overflow-hidden transition-all duration-300">
                <div className="flex items-center space-x-2">
                  <input
                   type="range"
                   min="0"
                   max="100"
                   value={isMuted ? 0 : volume * 100}
                   onChange={(e) => handleVolumeChange(parseFloat(e.target.value) / 100)}
                   className="volume-slider slider w-20 h-2 bg-white/20 rounded-lg cursor-pointer"
                   style={{
                     background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(isMuted ? 0 : volume) * 100}%, rgba(255,255,255,0.2) ${(isMuted ? 0 : volume) * 100}%, rgba(255,255,255,0.2) 100%)`
                   }}
                 />
                  <span className="text-white text-xs font-mono w-8 text-right">{Math.round((isMuted ? 0 : volume) * 100)}</span>
                </div>
              </div>
            </div>

            {/* 时间显示 */}
            <div className="text-white text-sm font-mono bg-black/30 px-3 py-1 rounded-full">
              <span className="text-blue-400">{formatTime(currentTime)}</span>
              <span className="text-white/60 mx-1">/</span>
              <span className="text-white/80">{formatTime(videoDuration)}</span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* 播放速度 */}
            <div className="relative group">
              <select
                value={playbackRate}
                onChange={(e) => changePlaybackRate(parseFloat(e.target.value))}
                className="speed-selector bg-black/40 text-white text-sm rounded-lg px-3 py-2 border border-white/20 focus:border-blue-400 focus:outline-none hover:bg-black/60 transition-all cursor-pointer appearance-none pr-8"
              >
                <option value={0.5}>0.5x</option>
                <option value={0.75}>0.75x</option>
                <option value={1}>正常</option>
                <option value={1.25}>1.25x</option>
                <option value={1.5}>1.5x</option>
                <option value={2}>2x</option>
              </select>
              <svg className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/60 pointer-events-none" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </div>

            {/* 全屏 */}
            <button
              onClick={toggleFullscreen}
              className="control-button hover:text-blue-400 transition-all duration-200 p-2 rounded-full hover:bg-white/10 group relative"
              aria-label={isFullscreen ? '退出全屏' : '全屏'}
            >
              <Maximize size={24} className="group-hover:scale-110 transition-transform" />
              <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black/80 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                {isFullscreen ? '退出全屏' : '进入全屏'}
              </span>
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