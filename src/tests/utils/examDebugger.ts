/**
 * 考试系统调试工具
 * 提供实时监控考试状态、性能分析和问题诊断功能
 * 
 * @author SOLO Coding
 * @description 用于开发和测试阶段的考试系统调试和监控
 */

import { EventEmitter } from 'events';

// 调试事件类型
export type DebugEventType = 
  | 'exam_created'
  | 'exam_started'
  | 'question_answered'
  | 'exam_submitted'
  | 'exam_completed'
  | 'error_occurred'
  | 'performance_warning'
  | 'security_alert';

// 调试日志级别
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// 考试状态接口
export interface ExamState {
  examId: string;
  userId: string;
  sessionId: string;
  status: 'not_started' | 'in_progress' | 'paused' | 'submitted' | 'completed';
  currentQuestion: number;
  totalQuestions: number;
  answeredQuestions: number;
  timeRemaining: number; // 秒
  startTime: Date;
  lastActivity: Date;
  answers: Record<string, unknown>;
  flags: string[]; // 异常标记
}

// 性能指标接口
export interface PerformanceMetrics {
  pageLoadTime: number;
  questionSwitchTime: number;
  answerSaveTime: number;
  memoryUsage: number;
  networkLatency: number;
  errorCount: number;
  warningCount: number;
}

// 调试日志接口
export interface DebugLog {
  timestamp: Date;
  level: LogLevel;
  event: DebugEventType;
  message: string;
  data?: unknown;
  stackTrace?: string;
}

// 安全事件接口
export interface SecurityEvent {
  type: 'page_blur' | 'right_click' | 'copy_attempt' | 'paste_attempt' | 'dev_tools' | 'tab_switch';
  timestamp: Date;
  details: unknown;
  severity: 'low' | 'medium' | 'high';
}

/**
 * 考试调试器主类
 * 提供考试系统的实时监控和调试功能
 */
export class ExamDebugger extends EventEmitter {
  private examStates: Map<string, ExamState> = new Map();
  private performanceMetrics: Map<string, PerformanceMetrics> = new Map();
  private debugLogs: DebugLog[] = [];
  private securityEvents: SecurityEvent[] = [];
  private isEnabled: boolean = false;
  private maxLogSize: number = 1000;
  private performanceThresholds = {
    pageLoadTime: 3000, // 3秒
    questionSwitchTime: 500, // 500ms
    answerSaveTime: 200, // 200ms
    memoryUsage: 100 * 1024 * 1024, // 100MB
    networkLatency: 1000 // 1秒
  };

  constructor(options?: {
    enabled?: boolean;
    maxLogSize?: number;
    performanceThresholds?: Partial<typeof ExamDebugger.prototype.performanceThresholds>;
  }) {
    super();
    
    if (options?.enabled !== undefined) {
      this.isEnabled = options.enabled;
    }
    
    if (options?.maxLogSize) {
      this.maxLogSize = options.maxLogSize;
    }
    
    if (options?.performanceThresholds) {
      this.performanceThresholds = { ...this.performanceThresholds, ...options.performanceThresholds };
    }
    
    this.initializeDebugger();
  }

  /**
   * 初始化调试器
   */
  private initializeDebugger(): void {
    if (!this.isEnabled) return;
    
    // 监听全局错误
    if (typeof window !== 'undefined') {
      window.addEventListener('error', this.handleGlobalError.bind(this));
      window.addEventListener('unhandledrejection', this.handleUnhandledRejection.bind(this));
      
      // 监听性能相关事件
      this.setupPerformanceMonitoring();
      
      // 监听安全相关事件
      this.setupSecurityMonitoring();
    }
    
    this.log('info', 'exam_created', '考试调试器已初始化');
  }

  /**
   * 启用调试器
   */
  enable(): void {
    this.isEnabled = true;
    this.initializeDebugger();
    this.log('info', 'exam_created', '调试器已启用');
  }

  /**
   * 禁用调试器
   */
  disable(): void {
    this.isEnabled = false;
    this.log('info', 'exam_created', '调试器已禁用');
  }

  /**
   * 记录考试状态
   * @param examState - 考试状态
   */
  recordExamState(examState: ExamState): void {
    if (!this.isEnabled) return;
    
    const previousState = this.examStates.get(examState.sessionId);
    this.examStates.set(examState.sessionId, examState);
    
    // 检测状态变化
    if (previousState && previousState.status !== examState.status) {
      this.log('info', 'exam_started', `考试状态变更: ${previousState.status} -> ${examState.status}`, {
        sessionId: examState.sessionId,
        examId: examState.examId,
        userId: examState.userId
      });
    }
    
    // 检测异常情况
    this.detectAnomalies(examState, previousState);
    
    this.emit('stateChanged', examState, previousState);
  }

  /**
   * 记录性能指标
   * @param sessionId - 会话ID
   * @param metrics - 性能指标
   */
  recordPerformanceMetrics(sessionId: string, metrics: Partial<PerformanceMetrics>): void {
    if (!this.isEnabled) return;
    
    const currentMetrics = this.performanceMetrics.get(sessionId) || {
      pageLoadTime: 0,
      questionSwitchTime: 0,
      answerSaveTime: 0,
      memoryUsage: 0,
      networkLatency: 0,
      errorCount: 0,
      warningCount: 0
    };
    
    const updatedMetrics = { ...currentMetrics, ...metrics };
    this.performanceMetrics.set(sessionId, updatedMetrics);
    
    // 检查性能阈值
    this.checkPerformanceThresholds(sessionId, updatedMetrics);
    
    this.emit('performanceUpdated', sessionId, updatedMetrics);
  }

  /**
   * 记录安全事件
   * @param event - 安全事件
   */
  recordSecurityEvent(event: SecurityEvent): void {
    if (!this.isEnabled) return;
    
    this.securityEvents.push(event);
    
    // 限制安全事件数组大小
    if (this.securityEvents.length > this.maxLogSize) {
      this.securityEvents = this.securityEvents.slice(-this.maxLogSize);
    }
    
    this.log('warn', 'security_alert', `安全事件: ${event.type}`, event);
    
    this.emit('securityEvent', event);
  }

  /**
   * 记录调试日志
   * @param level - 日志级别
   * @param event - 事件类型
   * @param message - 日志消息
   * @param data - 附加数据
   */
  log(level: LogLevel, event: DebugEventType, message: string, data?: unknown): void {
    if (!this.isEnabled) return;
    
    const logEntry: DebugLog = {
      timestamp: new Date(),
      level,
      event,
      message,
      data,
      stackTrace: level === 'error' ? new Error().stack : undefined
    };
    
    this.debugLogs.push(logEntry);
    
    // 限制日志数组大小
    if (this.debugLogs.length > this.maxLogSize) {
      this.debugLogs = this.debugLogs.slice(-this.maxLogSize);
    }
    
    // 输出到控制台（开发环境）
    if (process.env.NODE_ENV === 'development') {
      const consoleMethod = level === 'error' ? 'error' : 
                           level === 'warn' ? 'warn' : 
                           level === 'info' ? 'info' : 'log';
      
      console[consoleMethod](`[ExamDebugger] ${message}`, data || '');
    }
    
    this.emit('logAdded', logEntry);
  }

  /**
   * 获取考试状态
   * @param sessionId - 会话ID
   * @returns 考试状态
   */
  getExamState(sessionId: string): ExamState | undefined {
    return this.examStates.get(sessionId);
  }

  /**
   * 获取所有考试状态
   * @returns 所有考试状态
   */
  getAllExamStates(): ExamState[] {
    return Array.from(this.examStates.values());
  }

  /**
   * 获取性能指标
   * @param sessionId - 会话ID
   * @returns 性能指标
   */
  getPerformanceMetrics(sessionId: string): PerformanceMetrics | undefined {
    return this.performanceMetrics.get(sessionId);
  }

  /**
   * 获取调试日志
   * @param filter - 过滤条件
   * @returns 过滤后的日志
   */
  getDebugLogs(filter?: {
    level?: LogLevel;
    event?: DebugEventType;
    startTime?: Date;
    endTime?: Date;
  }): DebugLog[] {
    let logs = this.debugLogs;
    
    if (filter) {
      logs = logs.filter(log => {
        if (filter.level && log.level !== filter.level) return false;
        if (filter.event && log.event !== filter.event) return false;
        if (filter.startTime && log.timestamp < filter.startTime) return false;
        if (filter.endTime && log.timestamp > filter.endTime) return false;
        return true;
      });
    }
    
    return logs;
  }

  /**
   * 获取安全事件
   * @param filter - 过滤条件
   * @returns 过滤后的安全事件
   */
  getSecurityEvents(filter?: {
    type?: SecurityEvent['type'];
    severity?: SecurityEvent['severity'];
    startTime?: Date;
    endTime?: Date;
  }): SecurityEvent[] {
    let events = this.securityEvents;
    
    if (filter) {
      events = events.filter(event => {
        if (filter.type && event.type !== filter.type) return false;
        if (filter.severity && event.severity !== filter.severity) return false;
        if (filter.startTime && event.timestamp < filter.startTime) return false;
        if (filter.endTime && event.timestamp > filter.endTime) return false;
        return true;
      });
    }
    
    return events;
  }

  /**
   * 生成调试报告
   * @param sessionId - 会话ID（可选）
   * @returns 调试报告
   */
  generateReport(sessionId?: string): {
    summary: unknown;
    examStates: ExamState[];
    performanceMetrics: PerformanceMetrics[];
    logs: DebugLog[];
    securityEvents: SecurityEvent[];
  } {
    const examStates = sessionId ? 
      [this.getExamState(sessionId)].filter(Boolean) as ExamState[] :
      this.getAllExamStates();
    
    const performanceMetrics = sessionId ?
      [this.getPerformanceMetrics(sessionId)].filter(Boolean) as PerformanceMetrics[] :
      Array.from(this.performanceMetrics.values());
    
    const logs = this.getDebugLogs();
    const securityEvents = this.getSecurityEvents();
    
    const summary = {
      totalExams: examStates.length,
      activeExams: examStates.filter(state => state.status === 'in_progress').length,
      completedExams: examStates.filter(state => state.status === 'completed').length,
      totalLogs: logs.length,
      errorLogs: logs.filter(log => log.level === 'error').length,
      warningLogs: logs.filter(log => log.level === 'warn').length,
      totalSecurityEvents: securityEvents.length,
      highSeverityEvents: securityEvents.filter(event => event.severity === 'high').length,
      averagePerformance: this.calculateAveragePerformance(performanceMetrics)
    };
    
    return {
      summary,
      examStates,
      performanceMetrics,
      logs,
      securityEvents
    };
  }

  /**
   * 清除调试数据
   * @param sessionId - 会话ID（可选，如果提供则只清除该会话的数据）
   */
  clearDebugData(sessionId?: string): void {
    if (sessionId) {
      this.examStates.delete(sessionId);
      this.performanceMetrics.delete(sessionId);
      
      // 清除相关日志
      this.debugLogs = this.debugLogs.filter(log =>
        !log.data || (log.data as any).sessionId !== sessionId
      );
      
      this.log('info', 'exam_created', `已清除会话 ${sessionId} 的调试数据`);
    } else {
      this.examStates.clear();
      this.performanceMetrics.clear();
      this.debugLogs = [];
      this.securityEvents = [];
      
      this.log('info', 'exam_created', '已清除所有调试数据');
    }
  }

  /**
   * 导出调试数据
   * @param format - 导出格式
   * @returns 导出的数据
   */
  exportDebugData(format: 'json' | 'csv' = 'json'): string {
    const report = this.generateReport();
    
    if (format === 'json') {
      return JSON.stringify(report, null, 2);
    } else {
      // 简单的CSV格式导出
      const csvLines = [
        'Timestamp,Level,Event,Message,Data',
        ...report.logs.map(log => 
          `${log.timestamp.toISOString()},${log.level},${log.event},"${log.message}","${JSON.stringify(log.data || {})}"`
        )
      ];
      
      return csvLines.join('\n');
    }
  }

  /**
   * 设置性能监控
   */
  private setupPerformanceMonitoring(): void {
    if (typeof window === 'undefined') return;
    
    // 监控页面加载性能
    window.addEventListener('load', () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navigation) {
        const loadTime = navigation.loadEventEnd - navigation.fetchStart;
        this.log('info', 'performance_warning', `页面加载时间: ${loadTime}ms`);
      }
    });
    
    // 监控内存使用
    if ('memory' in performance) {
      setInterval(() => {
        const memory = (performance as unknown as { memory?: { usedJSHeapSize: number; totalJSHeapSize: number } }).memory;
        if (memory && memory.usedJSHeapSize > this.performanceThresholds.memoryUsage) {
          this.log('warn', 'performance_warning', '内存使用过高', {
            usedJSHeapSize: memory.usedJSHeapSize,
            totalJSHeapSize: memory.totalJSHeapSize
          });
        }
      }, 30000); // 每30秒检查一次
    }
  }

  /**
   * 设置安全监控
   */
  private setupSecurityMonitoring(): void {
    if (typeof window === 'undefined') return;
    
    // 监控页面失焦
    window.addEventListener('blur', () => {
      this.recordSecurityEvent({
        type: 'page_blur',
        timestamp: new Date(),
        details: { reason: 'window_blur' },
        severity: 'medium'
      });
    });
    
    // 监控右键点击
    document.addEventListener('contextmenu', (e) => {
      this.recordSecurityEvent({
        type: 'right_click',
        timestamp: new Date(),
        details: { target: e.target, x: e.clientX, y: e.clientY },
        severity: 'low'
      });
    });
    
    // 监控复制粘贴
    document.addEventListener('copy', () => {
      this.recordSecurityEvent({
        type: 'copy_attempt',
        timestamp: new Date(),
        details: {},
        severity: 'medium'
      });
    });
    
    document.addEventListener('paste', () => {
      this.recordSecurityEvent({
        type: 'paste_attempt',
        timestamp: new Date(),
        details: {},
        severity: 'medium'
      });
    });
    
    // 监控开发者工具
    const devtools = { open: false, orientation: null };
    const threshold = 160;
    
    setInterval(() => {
      if (window.outerHeight - window.innerHeight > threshold || 
          window.outerWidth - window.innerWidth > threshold) {
        if (!devtools.open) {
          devtools.open = true;
          this.recordSecurityEvent({
            type: 'dev_tools',
            timestamp: new Date(),
            details: { action: 'opened' },
            severity: 'high'
          });
        }
      } else {
        if (devtools.open) {
          devtools.open = false;
          this.recordSecurityEvent({
            type: 'dev_tools',
            timestamp: new Date(),
            details: { action: 'closed' },
            severity: 'medium'
          });
        }
      }
    }, 500);
  }

  /**
   * 处理全局错误
   */
  private handleGlobalError(event: ErrorEvent): void {
    this.log('error', 'error_occurred', `全局错误: ${event.message}`, {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error
    });
  }

  /**
   * 处理未捕获的Promise拒绝
   */
  private handleUnhandledRejection(event: PromiseRejectionEvent): void {
    this.log('error', 'error_occurred', `未捕获的Promise拒绝: ${event.reason}`, {
      reason: event.reason
    });
  }

  /**
   * 检测异常情况
   */
  private detectAnomalies(currentState: ExamState, previousState?: ExamState): void {
    // 检测答题时间异常
    if (previousState && currentState.answeredQuestions > previousState.answeredQuestions) {
      const timeDiff = currentState.lastActivity.getTime() - previousState.lastActivity.getTime();
      if (timeDiff < 1000) { // 少于1秒答题
        this.log('warn', 'performance_warning', '答题速度异常快', {
          sessionId: currentState.sessionId,
          timeDiff,
          questionNumber: currentState.currentQuestion
        });
      }
    }
    
    // 检测长时间无活动
    const inactiveTime = Date.now() - currentState.lastActivity.getTime();
    if (inactiveTime > 300000) { // 5分钟无活动
      this.log('warn', 'performance_warning', '长时间无活动', {
        sessionId: currentState.sessionId,
        inactiveTime
      });
    }
  }

  /**
   * 检查性能阈值
   */
  private checkPerformanceThresholds(sessionId: string, metrics: PerformanceMetrics): void {
    Object.entries(this.performanceThresholds).forEach(([key, threshold]) => {
      const value = metrics[key as keyof PerformanceMetrics];
      if (typeof value === 'number' && value > threshold) {
        this.log('warn', 'performance_warning', `性能指标 ${key} 超过阈值`, {
          sessionId,
          metric: key,
          value,
          threshold
        });
      }
    });
  }

  /**
   * 计算平均性能
   */
  private calculateAveragePerformance(metrics: PerformanceMetrics[]): Record<string, number> {
    if (metrics.length === 0) return {};
    
    const sums = metrics.reduce((acc, metric) => {
      Object.entries(metric).forEach(([key, value]) => {
        if (typeof value === 'number') {
          acc[key] = (acc[key] || 0) + value;
        }
      });
      return acc;
    }, {} as Record<string, number>);
    
    const averages: Record<string, number> = {};
    Object.entries(sums).forEach(([key, sum]) => {
      averages[key] = sum / metrics.length;
    });
    
    return averages;
  }
}

// 创建全局调试器实例
export const examDebugger = new ExamDebugger({
  enabled: process.env.NODE_ENV === 'development'
});

// 导出调试器工具函数
export const debugUtils = {
  /**
   * 开始监控考试会话
   * @param sessionId - 会话ID
   * @param examId - 考试ID
   * @param userId - 用户ID
   */
  startExamSession(sessionId: string, examId: string, userId: string): void {
    examDebugger.recordExamState({
      examId,
      userId,
      sessionId,
      status: 'in_progress',
      currentQuestion: 1,
      totalQuestions: 0,
      answeredQuestions: 0,
      timeRemaining: 0,
      startTime: new Date(),
      lastActivity: new Date(),
      answers: {},
      flags: []
    });
  },

  /**
   * 记录答题事件
   * @param sessionId - 会话ID
   * @param questionId - 题目ID
   * @param answer - 答案
   * @param timeSpent - 答题时间
   */
  recordAnswer(sessionId: string, questionId: string, answer: unknown, timeSpent: number): void {
    examDebugger.log('info', 'question_answered', '用户答题', {
      sessionId,
      questionId,
      answer,
      timeSpent
    });
    
    examDebugger.recordPerformanceMetrics(sessionId, {
      answerSaveTime: timeSpent
    });
  },

  /**
   * 记录页面切换性能
   * @param sessionId - 会话ID
   * @param switchTime - 切换时间
   */
  recordQuestionSwitch(sessionId: string, switchTime: number): void {
    examDebugger.recordPerformanceMetrics(sessionId, {
      questionSwitchTime: switchTime
    });
  },

  /**
   * 记录网络延迟
   * @param sessionId - 会话ID
   * @param latency - 延迟时间
   */
  recordNetworkLatency(sessionId: string, latency: number): void {
    examDebugger.recordPerformanceMetrics(sessionId, {
      networkLatency: latency
    });
  },

  /**
   * 获取实时调试面板数据
   * @param sessionId - 会话ID
   */
  getDebugPanelData(sessionId: string) {
    return {
      examState: examDebugger.getExamState(sessionId),
      performanceMetrics: examDebugger.getPerformanceMetrics(sessionId),
      recentLogs: examDebugger.getDebugLogs().slice(-10),
      recentSecurityEvents: examDebugger.getSecurityEvents().slice(-5)
    };
  }
};