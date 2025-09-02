'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Clock, 
  Play, 
  Pause, 
  AlertTriangle,
  Timer,
  StopCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ExamTimerProps {
  /** 考试总时长（分钟） */
  duration: number;
  /** 已用时间（秒），用于恢复计时器状态 */
  initialTimeUsed?: number;
  /** 计时器状态变化回调 */
  onTimeChange?: (timeUsed: number, timeRemaining: number) => void;
  /** 时间到达回调 */
  onTimeUp?: () => void;
  /** 暂停状态变化回调 */
  onPauseChange?: (isPaused: boolean) => void;
  /** 是否自动开始 */
  autoStart?: boolean;
  /** 是否显示暂停按钮 */
  showPauseButton?: boolean;
  /** 是否显示进度条 */
  showProgress?: boolean;
  /** 警告时间阈值（分钟），剩余时间少于此值时显示警告 */
  warningThreshold?: number;
  /** 危险时间阈值（分钟），剩余时间少于此值时显示危险状态 */
  dangerThreshold?: number;
  /** 自定义样式类名 */
  className?: string;
  /** 是否禁用（只读模式） */
  disabled?: boolean;
}

/**
 * 考试计时器组件
 * 提供考试时间管理功能，包括倒计时、暂停/恢复、时间警告等
 * 
 * @param props - 组件属性
 * @returns 计时器组件
 */
export default function ExamTimer({
  duration,
  initialTimeUsed = 0,
  onTimeChange,
  onTimeUp,
  onPauseChange,
  autoStart = true,
  showPauseButton = true,
  showProgress = true,
  warningThreshold = 10,
  dangerThreshold = 5,
  className,
  disabled = false
}: ExamTimerProps) {
  // 状态管理
  const [timeUsed, setTimeUsed] = useState(initialTimeUsed); // 已用时间（秒）
  const [isRunning, setIsRunning] = useState(autoStart && !disabled);
  const [isPaused, setIsPaused] = useState(false);
  const [isTimeUp, setIsTimeUp] = useState(false);
  
  // 计算相关值
  const totalSeconds = duration * 60; // 总时间（秒）
  const timeRemaining = Math.max(0, totalSeconds - timeUsed); // 剩余时间（秒）
  const progressPercentage = (timeUsed / totalSeconds) * 100; // 进度百分比
  const remainingMinutes = Math.floor(timeRemaining / 60);
  const remainingSeconds = timeRemaining % 60;
  
  // 状态判断
  const isWarning = remainingMinutes <= warningThreshold && remainingMinutes > dangerThreshold;
  const isDanger = remainingMinutes <= dangerThreshold && timeRemaining > 0;
  const isExpired = timeRemaining <= 0;

  /**
   * 格式化时间显示
   * @param seconds - 秒数
   * @returns 格式化的时间字符串
   */
  const formatTime = useCallback((seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  /**
   * 获取时间状态样式
   */
  const getTimeStatusStyle = useCallback(() => {
    if (isExpired) {
      return 'text-red-600 font-bold';
    }
    if (isDanger) {
      return 'text-red-500 font-semibold animate-pulse';
    }
    if (isWarning) {
      return 'text-yellow-600 font-medium';
    }
    return 'text-gray-700';
  }, [isExpired, isDanger, isWarning]);

  /**
   * 获取进度条颜色
   */
  const getProgressColor = useCallback(() => {
    if (isDanger) return 'bg-red-500';
    if (isWarning) return 'bg-yellow-500';
    return 'bg-blue-500';
  }, [isDanger, isWarning]);

  /**
   * 开始计时
   */
  const startTimer = useCallback(() => {
    if (disabled || isTimeUp) return;
    
    setIsRunning(true);
    setIsPaused(false);
    onPauseChange?.(false);
    toast.success('计时器已开始');
  }, [disabled, isTimeUp, onPauseChange]);

  /**
   * 暂停计时
   */
  const pauseTimer = useCallback(() => {
    if (disabled) return;
    
    setIsRunning(false);
    setIsPaused(true);
    onPauseChange?.(true);
    toast.info('计时器已暂停');
  }, [disabled, onPauseChange]);

  /**
   * 恢复计时
   */
  const resumeTimer = useCallback(() => {
    if (disabled || isTimeUp) return;
    
    setIsRunning(true);
    setIsPaused(false);
    onPauseChange?.(false);
    toast.success('计时器已恢复');
  }, [disabled, isTimeUp, onPauseChange]);

  /**
   * 停止计时
   */
  const stopTimer = useCallback(() => {
    setIsRunning(false);
    setIsPaused(false);
    setIsTimeUp(true);
    onPauseChange?.(false);
  }, [onPauseChange]);

  /**
   * 处理时间到达
   */
  const handleTimeUp = useCallback(() => {
    if (isTimeUp) return;
    
    stopTimer();
    toast.error('考试时间已到！', {
      duration: 5000,
      important: true
    });
    onTimeUp?.();
  }, [isTimeUp, stopTimer, onTimeUp]);

  // 计时器效果
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isRunning && !disabled && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeUsed(prev => {
          const newTimeUsed = prev + 1;
          const newTimeRemaining = Math.max(0, totalSeconds - newTimeUsed);
          
          // 调用时间变化回调
          onTimeChange?.(newTimeUsed, newTimeRemaining);
          
          // 检查是否时间到
          if (newTimeRemaining <= 0) {
            handleTimeUp();
          }
          
          return newTimeUsed;
        });
      }, 1000);
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isRunning, disabled, timeRemaining, totalSeconds, onTimeChange, handleTimeUp]);

  // 时间警告效果
  useEffect(() => {
    if (isWarning && !isDanger && isRunning) {
      toast.warning(`剩余时间不足 ${warningThreshold} 分钟！`, {
        duration: 3000
      });
    }
  }, [isWarning, isDanger, isRunning, warningThreshold]);

  // 时间危险警告效果
  useEffect(() => {
    if (isDanger && isRunning) {
      toast.error(`剩余时间不足 ${dangerThreshold} 分钟！`, {
        duration: 4000,
        important: true
      });
    }
  }, [isDanger, isRunning, dangerThreshold]);

  // 初始化时间状态
  useEffect(() => {
    if (timeRemaining <= 0 && !isTimeUp) {
      handleTimeUp();
    }
  }, [timeRemaining, isTimeUp, handleTimeUp]);

  return (
    <Card className={cn("w-full", className)}>
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* 时间显示 */}
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <Clock className={cn(
                "w-6 h-6",
                getTimeStatusStyle()
              )} />
              <span className="text-lg font-medium text-gray-600">
                {isExpired ? '时间已到' : '剩余时间'}
              </span>
            </div>
            
            <div className={cn(
              "text-4xl font-mono",
              getTimeStatusStyle()
            )}>
              {formatTime(timeRemaining)}
            </div>
            
            <div className="text-sm text-gray-500 mt-1">
              已用时间：{formatTime(timeUsed)} / 总时长：{formatTime(totalSeconds)}
            </div>
          </div>

          {/* 进度条 */}
          {showProgress && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>进度</span>
                <span>{progressPercentage.toFixed(1)}%</span>
              </div>
              <div className="relative">
                <Progress 
                  value={progressPercentage} 
                  className="h-3"
                />
                <div 
                  className={cn(
                    "absolute top-0 left-0 h-3 rounded-full transition-all duration-300",
                    getProgressColor()
                  )}
                  style={{ width: `${Math.min(100, progressPercentage)}%` }}
                />
              </div>
            </div>
          )}

          {/* 状态警告 */}
          {(isWarning || isDanger) && !isExpired && (
            <Alert className={cn(
              isDanger ? 'border-red-200 bg-red-50' : 'border-yellow-200 bg-yellow-50'
            )}>
              <AlertTriangle className={cn(
                "h-4 w-4",
                isDanger ? 'text-red-600' : 'text-yellow-600'
              )} />
              <AlertDescription className={cn(
                isDanger ? 'text-red-800' : 'text-yellow-800'
              )}>
                {isDanger 
                  ? `时间紧急！剩余时间不足 ${dangerThreshold} 分钟` 
                  : `时间警告！剩余时间不足 ${warningThreshold} 分钟`
                }
              </AlertDescription>
            </Alert>
          )}

          {/* 时间到提示 */}
          {isExpired && (
            <Alert className="border-red-200 bg-red-50">
              <StopCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                考试时间已到！请立即提交答案。
              </AlertDescription>
            </Alert>
          )}

          {/* 控制按钮 */}
          {showPauseButton && !disabled && !isExpired && (
            <div className="flex justify-center space-x-2">
              {!isRunning ? (
                <Button 
                  onClick={isPaused ? resumeTimer : startTimer}
                  variant="outline"
                  size="sm"
                >
                  <Play className="w-4 h-4 mr-2" />
                  {isPaused ? '恢复' : '开始'}
                </Button>
              ) : (
                <Button 
                  onClick={pauseTimer}
                  variant="outline"
                  size="sm"
                >
                  <Pause className="w-4 h-4 mr-2" />
                  暂停
                </Button>
              )}
            </div>
          )}

          {/* 暂停状态提示 */}
          {isPaused && !isExpired && (
            <Alert className="border-blue-200 bg-blue-50">
              <Timer className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                计时器已暂停。点击恢复按钮继续计时。
              </AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
    </Card>
  );
}