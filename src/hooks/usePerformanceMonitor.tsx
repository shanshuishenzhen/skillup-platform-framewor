/**
 * 性能监控React Hook
 * 提供组件级别的性能监控功能
 */

import React, { useEffect, useCallback, useRef, useState } from 'react';
import { performanceMonitor, PerformanceMetrics, PerformanceEvent } from '@/utils/performanceMonitor';

/**
 * 性能监控配置接口
 */
interface PerformanceMonitorConfig {
  /** 是否启用监控 */
  enabled?: boolean;
  /** 组件名称 */
  componentName?: string;
  /** 是否监控渲染性能 */
  trackRender?: boolean;
  /** 是否监控用户交互 */
  trackInteraction?: boolean;
  /** 自定义事件前缀 */
  eventPrefix?: string;
}

/**
 * 性能统计接口
 */
interface PerformanceStats {
  /** 组件挂载时间 */
  mountTime: number;
  /** 渲染次数 */
  renderCount: number;
  /** 平均渲染时间 */
  averageRenderTime: number;
  /** 最后一次渲染时间 */
  lastRenderTime: number;
  /** 交互事件数量 */
  interactionCount: number;
  /** 错误数量 */
  errorCount: number;
}

/**
 * 性能监控Hook返回值接口
 */
interface UsePerformanceMonitorReturn {
  /** 开始计时 */
  startTimer: (name: string) => void;
  /** 结束计时 */
  endTimer: (name: string, metadata?: Record<string, any>) => void;
  /** 记录事件 */
  recordEvent: (name: string, duration: number, metadata?: Record<string, any>) => void;
  /** 记录错误 */
  recordError: (error: Error, context?: string) => void;
  /** 记录用户交互 */
  recordInteraction: (type: string, target?: string) => void;
  /** 获取性能统计 */
  getStats: () => PerformanceStats;
  /** 获取最新指标 */
  getLatestMetrics: () => PerformanceMetrics | null;
  /** 生成报告 */
  generateReport: () => ReturnType<typeof performanceMonitor.generateReport>;
  /** 是否启用监控 */
  isEnabled: boolean;
}

/**
 * 性能监控Hook
 * @param config 配置选项
 * @returns 性能监控功能
 */
export function usePerformanceMonitor(config: PerformanceMonitorConfig = {}): UsePerformanceMonitorReturn {
  const {
    enabled = true,
    componentName = 'UnknownComponent',
    trackRender = true,
    trackInteraction = true,
    eventPrefix = '',
  } = config;

  const mountTimeRef = useRef<number>(0);
  const renderCountRef = useRef<number>(0);
  const renderTimesRef = useRef<number[]>([]);
  const interactionCountRef = useRef<number>(0);
  const errorCountRef = useRef<number>(0);
  const lastRenderTimeRef = useRef<number>(0);
  const timersRef = useRef<Map<string, number>>(new Map());

  // 组件挂载时记录时间
  useEffect(() => {
    if (!enabled) return;
    
    mountTimeRef.current = performance.now();
    performanceMonitor.recordEvent(
      `${eventPrefix}${componentName}-mount`,
      0,
      0,
      { timestamp: Date.now() }
    );

    return () => {
      // 组件卸载时记录
      const unmountTime = performance.now();
      const lifeTime = unmountTime - mountTimeRef.current;
      
      performanceMonitor.recordEvent(
        `${eventPrefix}${componentName}-unmount`,
        mountTimeRef.current,
        lifeTime,
        {
          renderCount: renderCountRef.current,
          interactionCount: interactionCountRef.current,
          errorCount: errorCountRef.current,
          averageRenderTime: renderTimesRef.current.length > 0 
            ? renderTimesRef.current.reduce((a, b) => a + b, 0) / renderTimesRef.current.length 
            : 0,
        }
      );
    };
  }, [enabled, componentName, eventPrefix]);

  // 监控渲染性能
  useEffect(() => {
    if (!enabled || !trackRender) return;
    
    const renderStart = performance.now();
    renderCountRef.current += 1;
    
    // 使用 requestAnimationFrame 来测量渲染完成时间
    const measureRender = () => {
      const renderEnd = performance.now();
      const renderTime = renderEnd - renderStart;
      
      renderTimesRef.current.push(renderTime);
      lastRenderTimeRef.current = renderTime;
      
      // 限制渲染时间记录数量
      if (renderTimesRef.current.length > 100) {
        renderTimesRef.current = renderTimesRef.current.slice(-50);
      }
      
      performanceMonitor.recordEvent(
        `${eventPrefix}${componentName}-render`,
        renderStart,
        renderTime,
        {
          renderCount: renderCountRef.current,
          isSlowRender: renderTime > 16, // 超过一帧的时间
        }
      );
    };
    
    requestAnimationFrame(measureRender);
  });

  /**
   * 开始计时
   * @param name 计时器名称
   */
  const startTimer = useCallback((name: string) => {
    if (!enabled) return;
    
    const timerName = `${eventPrefix}${componentName}-${name}`;
    const startTime = performance.now();
    timersRef.current.set(timerName, startTime);
    performanceMonitor.startTimer(timerName);
  }, [enabled, componentName, eventPrefix]);

  /**
   * 结束计时
   * @param name 计时器名称
   * @param metadata 额外数据
   */
  const endTimer = useCallback((name: string, metadata?: Record<string, any>) => {
    if (!enabled) return;
    
    const timerName = `${eventPrefix}${componentName}-${name}`;
    const startTime = timersRef.current.get(timerName);
    
    if (startTime) {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      performanceMonitor.endTimer(timerName, {
        ...metadata,
        component: componentName,
      });
      
      timersRef.current.delete(timerName);
    }
  }, [enabled, componentName, eventPrefix]);

  /**
   * 记录事件
   * @param name 事件名称
   * @param duration 持续时间
   * @param metadata 额外数据
   */
  const recordEvent = useCallback((name: string, duration: number, metadata?: Record<string, any>) => {
    if (!enabled) return;
    
    const eventName = `${eventPrefix}${componentName}-${name}`;
    const startTime = performance.now() - duration;
    
    performanceMonitor.recordEvent(eventName, startTime, duration, {
      ...metadata,
      component: componentName,
    });
  }, [enabled, componentName, eventPrefix]);

  /**
   * 记录错误
   * @param error 错误对象
   * @param context 错误上下文
   */
  const recordError = useCallback((error: Error, context?: string) => {
    if (!enabled) return;
    
    errorCountRef.current += 1;
    
    performanceMonitor.recordEvent(
      `${eventPrefix}${componentName}-error`,
      performance.now(),
      0,
      {
        errorMessage: error.message,
        errorStack: error.stack,
        context,
        component: componentName,
        errorCount: errorCountRef.current,
      }
    );
  }, [enabled, componentName, eventPrefix]);

  /**
   * 记录用户交互
   * @param type 交互类型
   * @param target 交互目标
   */
  const recordInteraction = useCallback((type: string, target?: string) => {
    if (!enabled || !trackInteraction) return;
    
    interactionCountRef.current += 1;
    
    performanceMonitor.recordEvent(
      `${eventPrefix}${componentName}-interaction`,
      performance.now(),
      0,
      {
        interactionType: type,
        target,
        component: componentName,
        interactionCount: interactionCountRef.current,
      }
    );
  }, [enabled, trackInteraction, componentName, eventPrefix]);

  /**
   * 获取性能统计
   * @returns 性能统计数据
   */
  const getStats = useCallback((): PerformanceStats => {
    const renderTimes = renderTimesRef.current;
    const averageRenderTime = renderTimes.length > 0 
      ? renderTimes.reduce((a, b) => a + b, 0) / renderTimes.length 
      : 0;

    return {
      mountTime: mountTimeRef.current,
      renderCount: renderCountRef.current,
      averageRenderTime,
      lastRenderTime: lastRenderTimeRef.current,
      interactionCount: interactionCountRef.current,
      errorCount: errorCountRef.current,
    };
  }, []);

  /**
   * 获取最新指标
   * @returns 最新的性能指标
   */
  const getLatestMetrics = useCallback(() => {
    return performanceMonitor.getLatestMetrics();
  }, []);

  /**
   * 生成报告
   * @returns 性能报告
   */
  const generateReport = useCallback(() => {
    return performanceMonitor.generateReport();
  }, []);

  return {
    startTimer,
    endTimer,
    recordEvent,
    recordError,
    recordInteraction,
    getStats,
    getLatestMetrics,
    generateReport,
    isEnabled: enabled,
  };
}

/**
 * 性能监控高阶组件
 * @param WrappedComponent 被包装的组件
 * @param config 配置选项
 * @returns 包装后的组件
 */
export function withPerformanceMonitor<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  config?: PerformanceMonitorConfig
) {
  const displayName = WrappedComponent.displayName || WrappedComponent.name || 'Component';
  
  const PerformanceMonitoredComponent = (props: P) => {
    const monitor = usePerformanceMonitor({
      componentName: displayName,
      ...config,
    });

    // 错误边界处理
    useEffect(() => {
      const handleError = (event: ErrorEvent) => {
        monitor.recordError(new Error(event.message), 'Global Error');
      };

      const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
        monitor.recordError(
          new Error(event.reason?.toString() || 'Unhandled Promise Rejection'),
          'Promise Rejection'
        );
      };

      window.addEventListener('error', handleError);
      window.addEventListener('unhandledrejection', handleUnhandledRejection);

      return () => {
        window.removeEventListener('error', handleError);
        window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      };
    }, [monitor]);

    return <WrappedComponent {...props} />;
  };

  PerformanceMonitoredComponent.displayName = `withPerformanceMonitor(${displayName})`;
  
  return PerformanceMonitoredComponent;
}

export default usePerformanceMonitor;
export type { PerformanceMonitorConfig, PerformanceStats, UsePerformanceMonitorReturn };