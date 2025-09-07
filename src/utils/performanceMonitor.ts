/**
 * 性能监控工具
 * 提供应用级别的性能监控和分析功能
 */

/**
 * 性能指标接口
 */
export interface PerformanceMetrics {
  /** 事件名称 */
  name: string;
  /** 开始时间 */
  startTime: number;
  /** 持续时间 */
  duration: number;
  /** 额外数据 */
  metadata?: Record<string, any>;
  /** 时间戳 */
  timestamp: number;
}

/**
 * 性能事件接口
 */
export interface PerformanceEvent {
  /** 事件ID */
  id: string;
  /** 事件名称 */
  name: string;
  /** 开始时间 */
  startTime: number;
  /** 结束时间 */
  endTime?: number;
  /** 持续时间 */
  duration?: number;
  /** 事件类型 */
  type: 'timer' | 'event' | 'error' | 'interaction';
  /** 额外数据 */
  metadata?: Record<string, any>;
}

/**
 * 性能监控类
 */
class PerformanceMonitor {
  private events: PerformanceEvent[] = [];
  private timers: Map<string, number> = new Map();
  private isEnabled: boolean = true;

  /**
   * 启用或禁用监控
   * @param enabled 是否启用
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  /**
   * 开始计时
   * @param name 计时器名称
   */
  startTimer(name: string): void {
    if (!this.isEnabled) return;
    
    const startTime = performance.now();
    this.timers.set(name, startTime);
    
    const event: PerformanceEvent = {
      id: `${name}-${Date.now()}`,
      name,
      startTime,
      type: 'timer',
    };
    
    this.events.push(event);
  }

  /**
   * 结束计时
   * @param name 计时器名称
   * @param metadata 额外数据
   */
  endTimer(name: string, metadata?: Record<string, any>): void {
    if (!this.isEnabled) return;
    
    const startTime = this.timers.get(name);
    if (!startTime) return;
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    // 更新对应的事件
    const eventIndex = this.events.findIndex(
      event => event.name === name && event.type === 'timer' && !event.endTime
    );
    
    if (eventIndex !== -1) {
      this.events[eventIndex].endTime = endTime;
      this.events[eventIndex].duration = duration;
      this.events[eventIndex].metadata = metadata;
    }
    
    this.timers.delete(name);
  }

  /**
   * 记录事件
   * @param name 事件名称
   * @param startTime 开始时间
   * @param duration 持续时间
   * @param metadata 额外数据
   */
  recordEvent(
    name: string,
    startTime: number,
    duration: number,
    metadata?: Record<string, any>
  ): void {
    if (!this.isEnabled) return;
    
    const event: PerformanceEvent = {
      id: `${name}-${Date.now()}`,
      name,
      startTime,
      endTime: startTime + duration,
      duration,
      type: 'event',
      metadata,
    };
    
    this.events.push(event);
  }

  /**
   * 获取所有事件
   * @returns 事件列表
   */
  getEvents(): PerformanceEvent[] {
    return [...this.events];
  }

  /**
   * 获取最新指标
   * @returns 最新的性能指标
   */
  getLatestMetrics(): PerformanceMetrics | null {
    if (this.events.length === 0) return null;
    
    const latestEvent = this.events[this.events.length - 1];
    
    return {
      name: latestEvent.name,
      startTime: latestEvent.startTime,
      duration: latestEvent.duration || 0,
      metadata: latestEvent.metadata,
      timestamp: Date.now(),
    };
  }

  /**
   * 清除所有事件
   */
  clear(): void {
    this.events = [];
    this.timers.clear();
  }

  /**
   * 生成性能报告
   * @returns 性能报告
   */
  generateReport() {
    const events = this.getEvents();
    const completedEvents = events.filter(event => event.duration !== undefined);
    
    if (completedEvents.length === 0) {
      return {
        totalEvents: 0,
        averageDuration: 0,
        slowestEvent: null,
        fastestEvent: null,
        eventsByType: {},
      };
    }
    
    const durations = completedEvents.map(event => event.duration!);
    const averageDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
    
    const slowestEvent = completedEvents.reduce((prev, current) => 
      (current.duration! > prev.duration!) ? current : prev
    );
    
    const fastestEvent = completedEvents.reduce((prev, current) => 
      (current.duration! < prev.duration!) ? current : prev
    );
    
    const eventsByType = completedEvents.reduce((acc, event) => {
      acc[event.type] = (acc[event.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return {
      totalEvents: completedEvents.length,
      averageDuration,
      slowestEvent,
      fastestEvent,
      eventsByType,
    };
  }
}

// 导出单例实例
export const performanceMonitor = new PerformanceMonitor();

// 导出类型
export type { PerformanceEvent };
export default performanceMonitor;