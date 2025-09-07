/**
 * 观看操作记录系统
 * 用于记录学员的所有观看操作，包括播放、暂停、快进、快退、速度调整等
 */

export interface WatchLogEntry {
  /** 日志唯一ID */
  id: string;
  /** 用户ID */
  userId: string | null;
  /** 课程ID */
  courseId: string;
  /** 课时ID */
  lessonId: string;
  /** 操作类型 */
  action: 'play' | 'pause' | 'seek' | 'speed_change' | 'volume_change' | 'fullscreen' | 'mute' | 'unmute' | 'end';
  /** 操作时间戳 */
  timestamp: number;
  /** 视频当前时间位置（秒） */
  currentTime: number;
  /** 视频总时长（秒） */
  duration: number;
  /** 播放速度 */
  playbackRate: number;
  /** 音量 */
  volume: number;
  /** 是否静音 */
  muted: boolean;
  /** 是否全屏 */
  fullscreen: boolean;
  /** 额外数据 */
  metadata?: {
    /** 快进/快退的目标时间 */
    seekTo?: number;
    /** 速度变化前的值 */
    previousSpeed?: number;
    /** 音量变化前的值 */
    previousVolume?: number;
    /** 用户代理信息 */
    userAgent?: string;
    /** 屏幕分辨率 */
    screenResolution?: string;
  };
}

/**
 * 观看操作记录器类
 */
class WatchLogger {
  private logs: WatchLogEntry[] = [];
  private maxLogsInMemory = 1000; // 内存中最多保存的日志条数
  private saveInterval = 30000; // 30秒自动保存一次
  private saveTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.startAutoSave();
    this.loadLogsFromStorage();
  }

  /**
   * 记录观看操作
   * @param entry 日志条目
   */
  log(entry: Omit<WatchLogEntry, 'id' | 'timestamp'>): void {
    const logEntry: WatchLogEntry = {
      ...entry,
      id: this.generateId(),
      timestamp: Date.now(),
      metadata: {
        ...entry.metadata,
        userAgent: navigator.userAgent,
        screenResolution: `${screen.width}x${screen.height}`,
      },
    };

    this.logs.push(logEntry);

    // 如果内存中的日志过多，移除最旧的日志
    if (this.logs.length > this.maxLogsInMemory) {
      this.logs = this.logs.slice(-this.maxLogsInMemory);
    }

    // 立即保存重要操作
    if (['play', 'pause', 'end'].includes(entry.action)) {
      this.saveToStorage();
    }
  }

  /**
   * 获取指定条件的日志
   * @param filters 过滤条件
   * @returns 匹配的日志条目
   */
  getLogs(filters?: {
    userId?: string;
    courseId?: string;
    lessonId?: string;
    action?: string;
    startTime?: number;
    endTime?: number;
  }): WatchLogEntry[] {
    let filteredLogs = [...this.logs];

    if (filters) {
      if (filters.userId) {
        filteredLogs = filteredLogs.filter(log => log.userId === filters.userId);
      }
      if (filters.courseId) {
        filteredLogs = filteredLogs.filter(log => log.courseId === filters.courseId);
      }
      if (filters.lessonId) {
        filteredLogs = filteredLogs.filter(log => log.lessonId === filters.lessonId);
      }
      if (filters.action) {
        filteredLogs = filteredLogs.filter(log => log.action === filters.action);
      }
      if (filters.startTime) {
        filteredLogs = filteredLogs.filter(log => log.timestamp >= filters.startTime!);
      }
      if (filters.endTime) {
        filteredLogs = filteredLogs.filter(log => log.timestamp <= filters.endTime!);
      }
    }

    return filteredLogs.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * 导出日志为JSON格式
   * @param filters 过滤条件
   * @returns JSON字符串
   */
  exportToJSON(filters?: Parameters<typeof this.getLogs>[0]): string {
    const logs = this.getLogs(filters);
    return JSON.stringify(logs, null, 2);
  }

  /**
   * 导出日志为CSV格式
   * @param filters 过滤条件
   * @returns CSV字符串
   */
  exportToCSV(filters?: Parameters<typeof this.getLogs>[0]): string {
    const logs = this.getLogs(filters);
    if (logs.length === 0) return '';

    const headers = [
      'ID', '用户ID', '课程ID', '课时ID', '操作类型', '时间戳', '日期时间',
      '视频位置(秒)', '视频总长(秒)', '播放速度', '音量', '静音', '全屏', '额外信息'
    ];

    const rows = logs.map(log => [
      log.id,
      log.userId || '',
      log.courseId,
      log.lessonId,
      log.action,
      log.timestamp,
      new Date(log.timestamp).toLocaleString('zh-CN'),
      log.currentTime.toFixed(2),
      log.duration.toFixed(2),
      log.playbackRate,
      log.volume,
      log.muted ? '是' : '否',
      log.fullscreen ? '是' : '否',
      JSON.stringify(log.metadata || {})
    ]);

    return [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
  }

  /**
   * 下载日志文件
   * @param format 文件格式
   * @param filters 过滤条件
   * @param filename 文件名（不含扩展名）
   */
  downloadLogs(
    format: 'json' | 'csv' = 'json',
    filters?: Parameters<typeof this.getLogs>[0],
    filename?: string
  ): void {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
    const defaultFilename = `watch_logs_${timestamp}`;
    const finalFilename = filename || defaultFilename;

    let content: string;
    let mimeType: string;
    let extension: string;

    if (format === 'csv') {
      content = this.exportToCSV(filters);
      mimeType = 'text/csv;charset=utf-8;';
      extension = 'csv';
    } else {
      content = this.exportToJSON(filters);
      mimeType = 'application/json;charset=utf-8;';
      extension = 'json';
    }

    const blob = new Blob([content], { type: mimeType });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${finalFilename}.${extension}`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  /**
   * 清空日志
   */
  clearLogs(): void {
    this.logs = [];
    this.saveToStorage();
  }

  /**
   * 获取统计信息
   * @param filters 过滤条件
   * @returns 统计信息
   */
  getStats(filters?: Parameters<typeof this.getLogs>[0]) {
    const logs = this.getLogs(filters);
    const actionCounts = logs.reduce((acc, log) => {
      acc[log.action] = (acc[log.action] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalLogs: logs.length,
      actionCounts,
      dateRange: logs.length > 0 ? {
        start: new Date(Math.min(...logs.map(l => l.timestamp))),
        end: new Date(Math.max(...logs.map(l => l.timestamp)))
      } : null
    };
  }

  /**
   * 生成唯一ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 保存日志到本地存储
   */
  private saveToStorage(): void {
    try {
      // 检查是否在浏览器环境中
      if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
        return; // 在服务器端不执行保存操作
      }
      
      const data = {
        logs: this.logs,
        lastSaved: Date.now()
      };
      localStorage.setItem('watchLogs', JSON.stringify(data));
    } catch (error) {
      console.warn('保存观看日志失败:', error);
    }
  }

  /**
   * 从本地存储加载日志
   */
  private loadLogsFromStorage(): void {
    try {
      // 检查是否在浏览器环境中
      if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
        return; // 在服务器端不执行加载操作
      }
      
      const stored = localStorage.getItem('watchLogs');
      if (stored) {
        const data = JSON.parse(stored);
        if (data.logs && Array.isArray(data.logs)) {
          this.logs = data.logs;
        }
      }
    } catch (error) {
      console.warn('加载观看日志失败:', error);
    }
  }

  /**
   * 开始自动保存
   */
  private startAutoSave(): void {
    // 只在浏览器环境中启动自动保存
    if (typeof window === 'undefined') {
      return;
    }
    
    if (this.saveTimer) {
      clearInterval(this.saveTimer);
    }
    this.saveTimer = setInterval(() => {
      this.saveToStorage();
    }, this.saveInterval);
  }

  /**
   * 停止自动保存
   */
  public stopAutoSave(): void {
    if (this.saveTimer) {
      clearInterval(this.saveTimer);
      this.saveTimer = null;
    }
  }
}

// 创建全局实例
export const watchLogger = new WatchLogger();

// 在页面卸载时保存日志
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    watchLogger.stopAutoSave();
  });
}