/**
 * API监控服务
 * 提供API调用统计、性能监控、错误追踪等功能
 */

import { createError, AppError, ErrorType, ErrorSeverity } from '@/utils/errorHandler';
import { getEnvConfig } from '@/utils/envConfig';

/**
 * API调用统计接口
 */
export interface ApiCallStats {
  endpoint: string;
  method: string;
  statusCode: number;
  responseTime: number;
  timestamp: Date;
  userId?: string;
  userAgent?: string;
  ip?: string;
  requestSize?: number;
  responseSize?: number;
  error?: string;
}

/**
 * API性能指标接口
 */
export interface ApiPerformanceMetrics {
  endpoint: string;
  totalCalls: number;
  successCalls: number;
  errorCalls: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  errorRate: number;
  lastUpdated: Date;
}

/**
 * API监控配置接口
 */
export interface ApiMonitorConfig {
  enabled: boolean;
  sampleRate: number; // 采样率 (0-1)
  maxStatsHistory: number; // 最大统计历史记录数
  performanceThreshold: number; // 性能阈值（毫秒）
  errorThreshold: number; // 错误率阈值 (0-1)
  enableRealTimeAlerts: boolean;
  excludeEndpoints: string[]; // 排除监控的端点
}

/**
 * API告警接口
 */
export interface ApiAlert {
  id: string;
  type: 'performance' | 'error_rate' | 'availability';
  endpoint: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  threshold: number;
  currentValue: number;
  timestamp: Date;
  resolved: boolean;
}

/**
 * API监控服务类
 */
export class ApiMonitorService {
  private config: ApiMonitorConfig;
  private statsHistory: Map<string, ApiCallStats[]> = new Map();
  private performanceMetrics: Map<string, ApiPerformanceMetrics> = new Map();
  private alerts: ApiAlert[] = [];
  private isInitialized = false;

  constructor(config?: Partial<ApiMonitorConfig>) {
    this.config = {
      enabled: true,
      sampleRate: 1.0,
      maxStatsHistory: 10000,
      performanceThreshold: 5000,
      errorThreshold: 0.05,
      enableRealTimeAlerts: true,
      excludeEndpoints: ['/health', '/metrics'],
      ...config
    };
  }

  /**
   * 初始化监控服务
   */
  async initialize(): Promise<void> {
    try {
      if (this.isInitialized) {
        return;
      }

      // 启动定期清理任务
      this.startCleanupTask();
      
      // 启动性能指标计算任务
      this.startMetricsCalculationTask();
      
      this.isInitialized = true;
      console.log('API监控服务已初始化');
    } catch (error) {
      console.error('API监控服务初始化失败:', error);
      throw createError(
        ErrorType.INTERNAL_ERROR,
        'API监控服务初始化失败',
        { originalError: error instanceof Error ? error : new Error(String(error)) }
      );
    }
  }

  /**
   * 记录API调用统计
   * @param stats - API调用统计数据
   */
  recordApiCall(stats: ApiCallStats): void {
    try {
      if (!this.config.enabled) {
        return;
      }

      // 检查是否需要排除此端点
      if (this.shouldExcludeEndpoint(stats.endpoint)) {
        return;
      }

      // 采样检查
      if (Math.random() > this.config.sampleRate) {
        return;
      }

      const key = `${stats.method}:${stats.endpoint}`;
      
      // 获取或创建统计历史
      if (!this.statsHistory.has(key)) {
        this.statsHistory.set(key, []);
      }
      
      const history = this.statsHistory.get(key)!;
      history.push(stats);
      
      // 限制历史记录数量
      if (history.length > this.config.maxStatsHistory) {
        history.shift();
      }
      
      // 更新性能指标
      this.updatePerformanceMetrics(key, stats);
      
      // 检查告警条件
      if (this.config.enableRealTimeAlerts) {
        this.checkAlertConditions(key, stats);
      }
      
    } catch (error) {
      console.error('记录API调用统计失败:', error);
    }
  }

  /**
   * 获取API性能指标
   * @param endpoint - 端点路径
   * @param method - HTTP方法
   * @returns 性能指标
   */
  getPerformanceMetrics(endpoint?: string, method?: string): ApiPerformanceMetrics[] {
    try {
      if (endpoint && method) {
        const key = `${method}:${endpoint}`;
        const metrics = this.performanceMetrics.get(key);
        return metrics ? [metrics] : [];
      }
      
      return Array.from(this.performanceMetrics.values());
    } catch (error) {
      console.error('获取性能指标失败:', error);
      return [];
    }
  }

  /**
   * 获取API调用统计历史
   * @param endpoint - 端点路径
   * @param method - HTTP方法
   * @param limit - 限制返回数量
   * @returns 调用统计历史
   */
  getCallHistory(
    endpoint?: string, 
    method?: string, 
    limit?: number
  ): ApiCallStats[] {
    try {
      if (endpoint && method) {
        const key = `${method}:${endpoint}`;
        const history = this.statsHistory.get(key) || [];
        return limit ? history.slice(-limit) : history;
      }
      
      // 返回所有历史记录
      const allHistory: ApiCallStats[] = [];
      for (const history of this.statsHistory.values()) {
        allHistory.push(...history);
      }
      
      // 按时间排序
      allHistory.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      
      return limit ? allHistory.slice(0, limit) : allHistory;
    } catch (error) {
      console.error('获取调用历史失败:', error);
      return [];
    }
  }

  /**
   * 获取活跃告警
   * @returns 活跃告警列表
   */
  getActiveAlerts(): ApiAlert[] {
    return this.alerts.filter(alert => !alert.resolved);
  }

  /**
   * 获取所有告警
   * @param limit - 限制返回数量
   * @returns 告警列表
   */
  getAllAlerts(limit?: number): ApiAlert[] {
    const sortedAlerts = this.alerts.sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
    );
    return limit ? sortedAlerts.slice(0, limit) : sortedAlerts;
  }

  /**
   * 解决告警
   * @param alertId - 告警ID
   */
  resolveAlert(alertId: string): void {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
    }
  }

  /**
   * 获取监控统计摘要
   * @returns 监控摘要
   */
  getMonitoringSummary(): {
    totalEndpoints: number;
    totalCalls: number;
    averageResponseTime: number;
    errorRate: number;
    activeAlerts: number;
    topSlowEndpoints: Array<{ endpoint: string; averageResponseTime: number }>;
    topErrorEndpoints: Array<{ endpoint: string; errorRate: number }>;
  } {
    try {
      const metrics = Array.from(this.performanceMetrics.values());
      
      const totalCalls = metrics.reduce((sum, m) => sum + m.totalCalls, 0);
      const totalErrors = metrics.reduce((sum, m) => sum + m.errorCalls, 0);
      const totalResponseTime = metrics.reduce(
        (sum, m) => sum + (m.averageResponseTime * m.totalCalls), 
        0
      );
      
      const averageResponseTime = totalCalls > 0 ? totalResponseTime / totalCalls : 0;
      const errorRate = totalCalls > 0 ? totalErrors / totalCalls : 0;
      
      // 最慢的端点
      const topSlowEndpoints = metrics
        .sort((a, b) => b.averageResponseTime - a.averageResponseTime)
        .slice(0, 5)
        .map(m => ({
          endpoint: m.endpoint,
          averageResponseTime: m.averageResponseTime
        }));
      
      // 错误率最高的端点
      const topErrorEndpoints = metrics
        .filter(m => m.errorRate > 0)
        .sort((a, b) => b.errorRate - a.errorRate)
        .slice(0, 5)
        .map(m => ({
          endpoint: m.endpoint,
          errorRate: m.errorRate
        }));
      
      return {
        totalEndpoints: metrics.length,
        totalCalls,
        averageResponseTime,
        errorRate,
        activeAlerts: this.getActiveAlerts().length,
        topSlowEndpoints,
        topErrorEndpoints
      };
    } catch (error) {
      console.error('获取监控摘要失败:', error);
      return {
        totalEndpoints: 0,
        totalCalls: 0,
        averageResponseTime: 0,
        errorRate: 0,
        activeAlerts: 0,
        topSlowEndpoints: [],
        topErrorEndpoints: []
      };
    }
  }

  /**
   * 清理过期数据
   */
  cleanup(): void {
    try {
      const now = new Date();
      const maxAge = 24 * 60 * 60 * 1000; // 24小时
      
      // 清理过期的调用统计
      for (const [key, history] of this.statsHistory.entries()) {
        const filteredHistory = history.filter(
          stats => now.getTime() - stats.timestamp.getTime() < maxAge
        );
        
        if (filteredHistory.length === 0) {
          this.statsHistory.delete(key);
          this.performanceMetrics.delete(key);
        } else {
          this.statsHistory.set(key, filteredHistory);
        }
      }
      
      // 清理过期的告警
      const maxAlertAge = 7 * 24 * 60 * 60 * 1000; // 7天
      this.alerts = this.alerts.filter(
        alert => now.getTime() - alert.timestamp.getTime() < maxAlertAge
      );
      
    } catch (error) {
      console.error('清理监控数据失败:', error);
    }
  }

  /**
   * 获取配置
   * @returns 当前配置
   */
  getConfig(): ApiMonitorConfig {
    return { ...this.config };
  }

  /**
   * 更新配置
   * @param config - 新配置
   */
  updateConfig(config: Partial<ApiMonitorConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 检查是否应该排除端点
   * @private
   * @param endpoint - 端点路径
   * @returns 是否排除
   */
  private shouldExcludeEndpoint(endpoint: string): boolean {
    return this.config.excludeEndpoints.some(excluded => 
      endpoint.includes(excluded)
    );
  }

  /**
   * 更新性能指标
   * @private
   * @param key - 端点键
   * @param stats - 调用统计
   */
  private updatePerformanceMetrics(key: string, stats: ApiCallStats): void {
    try {
      const existing = this.performanceMetrics.get(key);
      
      if (!existing) {
        this.performanceMetrics.set(key, {
          endpoint: stats.endpoint,
          totalCalls: 1,
          successCalls: stats.statusCode < 400 ? 1 : 0,
          errorCalls: stats.statusCode >= 400 ? 1 : 0,
          averageResponseTime: stats.responseTime,
          minResponseTime: stats.responseTime,
          maxResponseTime: stats.responseTime,
          p95ResponseTime: stats.responseTime,
          p99ResponseTime: stats.responseTime,
          errorRate: stats.statusCode >= 400 ? 1 : 0,
          lastUpdated: new Date()
        });
        return;
      }
      
      // 更新现有指标
      const history = this.statsHistory.get(key) || [];
      const responseTimes = history.map(h => h.responseTime).sort((a, b) => a - b);
      
      existing.totalCalls++;
      if (stats.statusCode < 400) {
        existing.successCalls++;
      } else {
        existing.errorCalls++;
      }
      
      existing.averageResponseTime = responseTimes.reduce((sum, rt) => sum + rt, 0) / responseTimes.length;
      existing.minResponseTime = Math.min(existing.minResponseTime, stats.responseTime);
      existing.maxResponseTime = Math.max(existing.maxResponseTime, stats.responseTime);
      
      // 计算百分位数
      if (responseTimes.length > 0) {
        const p95Index = Math.floor(responseTimes.length * 0.95);
        const p99Index = Math.floor(responseTimes.length * 0.99);
        existing.p95ResponseTime = responseTimes[p95Index] || responseTimes[responseTimes.length - 1];
        existing.p99ResponseTime = responseTimes[p99Index] || responseTimes[responseTimes.length - 1];
      }
      
      existing.errorRate = existing.errorCalls / existing.totalCalls;
      existing.lastUpdated = new Date();
      
    } catch (error) {
      console.error('更新性能指标失败:', error);
    }
  }

  /**
   * 检查告警条件
   * @private
   * @param key - 端点键
   * @param stats - 调用统计
   */
  private checkAlertConditions(key: string, stats: ApiCallStats): void {
    try {
      const metrics = this.performanceMetrics.get(key);
      if (!metrics) return;
      
      // 检查性能告警
      if (stats.responseTime > this.config.performanceThreshold) {
        this.createAlert({
          type: 'performance',
          endpoint: stats.endpoint,
          message: `响应时间超过阈值: ${stats.responseTime}ms > ${this.config.performanceThreshold}ms`,
          severity: stats.responseTime > this.config.performanceThreshold * 2 ? 'critical' : 'high',
          threshold: this.config.performanceThreshold,
          currentValue: stats.responseTime
        });
      }
      
      // 检查错误率告警
      if (metrics.totalCalls >= 10 && metrics.errorRate > this.config.errorThreshold) {
        this.createAlert({
          type: 'error_rate',
          endpoint: stats.endpoint,
          message: `错误率超过阈值: ${(metrics.errorRate * 100).toFixed(2)}% > ${(this.config.errorThreshold * 100).toFixed(2)}%`,
          severity: metrics.errorRate > this.config.errorThreshold * 2 ? 'critical' : 'high',
          threshold: this.config.errorThreshold,
          currentValue: metrics.errorRate
        });
      }
      
    } catch (error) {
      console.error('检查告警条件失败:', error);
    }
  }

  /**
   * 创建告警
   * @private
   * @param alertData - 告警数据
   */
  private createAlert(alertData: Omit<ApiAlert, 'id' | 'timestamp' | 'resolved'>): void {
    try {
      // 检查是否已存在相同的活跃告警
      const existingAlert = this.alerts.find(alert => 
        !alert.resolved &&
        alert.type === alertData.type &&
        alert.endpoint === alertData.endpoint
      );
      
      if (existingAlert) {
        // 更新现有告警
        existingAlert.currentValue = alertData.currentValue;
        existingAlert.timestamp = new Date();
        return;
      }
      
      // 创建新告警
      const alert: ApiAlert = {
        id: `${alertData.type}_${alertData.endpoint}_${Date.now()}`,
        timestamp: new Date(),
        resolved: false,
        ...alertData
      };
      
      this.alerts.push(alert);
      
      // 限制告警数量
      if (this.alerts.length > 1000) {
        this.alerts = this.alerts.slice(-500);
      }
      
    } catch (error) {
      console.error('创建告警失败:', error);
    }
  }

  /**
   * 启动清理任务
   * @private
   */
  private startCleanupTask(): void {
    setInterval(() => {
      this.cleanup();
    }, 60 * 60 * 1000); // 每小时清理一次
  }

  /**
   * 启动性能指标计算任务
   * @private
   */
  private startMetricsCalculationTask(): void {
    setInterval(() => {
      // 重新计算所有性能指标
      for (const [key, history] of this.statsHistory.entries()) {
        if (history.length > 0) {
          const latestStats = history[history.length - 1];
          this.updatePerformanceMetrics(key, latestStats);
        }
      }
    }, 5 * 60 * 1000); // 每5分钟计算一次
  }
}

// 创建默认实例
const apiMonitor = new ApiMonitorService();

/**
 * 记录API调用（便捷函数）
 * @param stats - API调用统计数据
 */
export function recordApiCall(stats: ApiCallStats): void {
  apiMonitor.recordApiCall(stats);
}

/**
 * 获取性能指标（便捷函数）
 * @param endpoint - 端点路径
 * @param method - HTTP方法
 * @returns 性能指标
 */
export function getPerformanceMetrics(
  endpoint?: string, 
  method?: string
): ApiPerformanceMetrics[] {
  return apiMonitor.getPerformanceMetrics(endpoint, method);
}

/**
 * 获取监控摘要（便捷函数）
 * @returns 监控摘要
 */
export function getMonitoringSummary() {
  return apiMonitor.getMonitoringSummary();
}

/**
 * 初始化API监控（便捷函数）
 */
export async function initializeApiMonitor(): Promise<void> {
  return apiMonitor.initialize();
}

// 默认导出
export default apiMonitor;