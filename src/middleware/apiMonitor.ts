/**
 * API监控中间件
 * 用于监控API请求的性能、错误率和使用情况
 * 
 * @author SOLO Coding
 * @version 1.0.0
 */

import { Request, Response, NextFunction } from 'express';
import { envConfig } from '../config/envConfig';
import { errorHandler, ErrorType, ErrorSeverity } from '@/utils/errorHandler';
import { monitoringService } from '../services/monitoringService';
import { cacheService } from '../services/cacheService';
import { EventEmitter } from 'events';
import { Socket } from 'net';

/**
 * 扩展 Express Request 接口
 */
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    [key: string]: unknown;
  };
}

/**
 * 扩展连接接口
 */
interface ExtendedConnection {
  remoteAddress?: string;
  socket?: Socket & {
    remoteAddress?: string;
  };
}

/**
 * API监控配置接口
 */
interface ApiMonitorConfig {
  enabled: boolean;
  sampleRate: number;
  slowRequestThreshold: number;
  excludePaths: string[];
  includeHeaders: boolean;
  includeBody: boolean;
  maxBodySize: number;
  alertThresholds: {
    errorRate: number;
    responseTime: number;
    requestsPerMinute: number;
  };
  retentionDays: number;
}

/**
 * 请求监控数据接口
 */
interface RequestMonitorData {
  id: string;
  method: string;
  url: string;
  path: string;
  query: Record<string, unknown>;
  headers: Record<string, string>;
  body?: unknown;
  userAgent: string;
  ip: string;
  userId?: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  statusCode?: number;
  responseSize?: number;
  error?: {
    message: string;
    stack?: string;
    code?: string | number;
  };
  metadata: Record<string, unknown>;
  memoryUsage?: NodeJS.MemoryUsage;
  cpuUsage?: NodeJS.CpuUsage;
}

/**
 * API统计数据接口
 */
interface ApiStats {
  totalRequests: number;
  successRequests: number;
  errorRequests: number;
  averageResponseTime: number;
  slowRequests: number;
  requestsPerMinute: number;
  errorRate: number;
  topEndpoints: Array<{
    path: string;
    count: number;
    averageTime: number;
  }>;
  topErrors: Array<{
    error: string;
    count: number;
  }>;
  userActivity: Array<{
    userId: string;
    requestCount: number;
  }>;
}

/**
 * 实时监控数据接口
 */
interface RealTimeMetrics {
  timestamp: number;
  activeRequests: number;
  requestsPerSecond: number;
  averageResponseTime: number;
  errorRate: number;
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage: number;
}

/**
 * API监控类
 */
class ApiMonitor extends EventEmitter {
  private config: ApiMonitorConfig;
  private activeRequests: Map<string, RequestMonitorData>;
  private requestCounter: number;
  private statsCache: Map<string, ApiStats>;
  private metricsBuffer: RequestMonitorData[];
  private lastCpuUsage?: NodeJS.CpuUsage;
  private alertCooldowns: Map<string, number>;
  private metricsInterval?: NodeJS.Timeout;

  constructor() {
    super();
    this.config = {
      enabled: envConfig.monitoring?.enabled || false,
      sampleRate: envConfig.monitoring?.sampleRate || 1.0,
      slowRequestThreshold: envConfig.monitoring?.slowRequestThreshold || 1000,
      excludePaths: envConfig.monitoring?.excludePaths || ['/health', '/metrics', '/favicon.ico'],
      includeHeaders: envConfig.monitoring?.includeHeaders || false,
      includeBody: envConfig.monitoring?.includeBody || false,
      maxBodySize: envConfig.monitoring?.maxBodySize || 1024,
      alertThresholds: {
        errorRate: envConfig.monitoring?.alertThresholds?.errorRate || 0.05,
        responseTime: envConfig.monitoring?.alertThresholds?.responseTime || 2000,
        requestsPerMinute: envConfig.monitoring?.alertThresholds?.requestsPerMinute || 1000
      },
      retentionDays: envConfig.monitoring?.retentionDays || 7
    };
    
    this.activeRequests = new Map();
    this.requestCounter = 0;
    this.statsCache = new Map();
    this.metricsBuffer = [];
    this.alertCooldowns = new Map();
    
    this.initializeMetricsCollection();
  }

  /**
   * 初始化指标收集
   */
  private initializeMetricsCollection(): void {
    if (!this.config.enabled) return;
    
    // 每分钟收集一次实时指标
    this.metricsInterval = setInterval(() => {
      this.collectRealTimeMetrics();
    }, 60000);
    
    // 每5分钟清理过期数据
    setInterval(() => {
      this.cleanupExpiredData();
    }, 300000);
    
    // 每10分钟检查告警条件
    setInterval(() => {
      this.checkAlertConditions();
    }, 600000);
  }

  /**
   * 获取监控中间件
   */
  getMiddleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!this.config.enabled || !this.shouldMonitor(req)) {
        return next();
      }

      const requestData = this.createRequestData(req);
      this.activeRequests.set(requestData.id, requestData);

      // 监听响应完成
      res.on('finish', () => {
        this.handleRequestComplete(requestData.id, res);
      });

      // 监听响应错误
      res.on('error', (error) => {
        this.handleRequestError(requestData.id, error);
      });

      // 监听连接关闭
      req.on('close', () => {
        if (this.activeRequests.has(requestData.id)) {
          this.handleRequestAborted(requestData.id);
        }
      });

      next();
    };
  }

  /**
   * 判断是否应该监控请求
   */
  private shouldMonitor(req: Request): boolean {
    // 检查排除路径
    if (this.config.excludePaths.some(path => req.path.startsWith(path))) {
      return false;
    }

    // 采样率检查
    return Math.random() < this.config.sampleRate;
  }

  /**
   * 创建请求监控数据
   */
  private createRequestData(req: Request): RequestMonitorData {
    const requestId = `req_${Date.now()}_${++this.requestCounter}`;
    
    const data: RequestMonitorData = {
      id: requestId,
      method: req.method,
      url: req.url,
      path: req.path,
      query: req.query,
      headers: this.config.includeHeaders ? this.sanitizeHeaders(req.headers) : {},
      userAgent: req.get('User-Agent') || '',
      ip: this.getClientIp(req),
      userId: (req as AuthenticatedRequest).user?.id,
      startTime: Date.now(),
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(this.lastCpuUsage),
      metadata: {
        route: req.route?.path,
        params: req.params,
        contentType: req.get('Content-Type'),
        contentLength: req.get('Content-Length')
      }
    };

    // 包含请求体（如果配置允许）
    if (this.config.includeBody && req.body) {
      data.body = this.sanitizeBody(req.body);
    }

    return data;
  }

  /**
   * 处理请求完成
   */
  private async handleRequestComplete(requestId: string, res: Response): Promise<void> {
    const requestData = this.activeRequests.get(requestId);
    if (!requestData) return;

    requestData.endTime = Date.now();
    requestData.duration = requestData.endTime - requestData.startTime;
    requestData.statusCode = res.statusCode;
    requestData.responseSize = parseInt(res.get('Content-Length') || '0');

    // 记录监控数据
    await this.recordMetrics(requestData);
    
    // 检查慢请求
    if (requestData.duration > this.config.slowRequestThreshold) {
      this.handleSlowRequest(requestData);
    }

    // 检查错误请求
    if (requestData.statusCode && requestData.statusCode >= 400) {
      this.handleErrorRequest(requestData);
    }

    // 添加到缓冲区
    this.metricsBuffer.push(requestData);
    
    // 如果缓冲区太大，清理旧数据
    if (this.metricsBuffer.length > 10000) {
      this.metricsBuffer = this.metricsBuffer.slice(-5000);
    }

    // 清理活跃请求
    this.activeRequests.delete(requestId);
    
    // 发出事件
    this.emit('requestComplete', requestData);
  }

  /**
   * 处理请求错误
   */
  private async handleRequestError(requestId: string, error: Error): Promise<void> {
    const requestData = this.activeRequests.get(requestId);
    if (!requestData) return;

    requestData.endTime = Date.now();
    requestData.duration = requestData.endTime - requestData.startTime;
    requestData.error = {
      message: error.message,
      stack: error.stack,
      code: (error as any).code
    };

    // 记录错误监控数据
    await this.recordMetrics(requestData);
    
    // 添加到缓冲区
    this.metricsBuffer.push(requestData);
    
    // 清理活跃请求
    this.activeRequests.delete(requestId);
    
    // 发出事件
    this.emit('requestError', requestData);
  }

  /**
   * 处理请求中止
   */
  private handleRequestAborted(requestId: string): void {
    const requestData = this.activeRequests.get(requestId);
    if (!requestData) return;

    requestData.endTime = Date.now();
    requestData.duration = requestData.endTime - requestData.startTime;
    requestData.statusCode = 499; // Client Closed Request
    requestData.metadata.aborted = true;

    // 记录中止的请求
    this.recordMetrics(requestData);
    
    // 清理活跃请求
    this.activeRequests.delete(requestId);
    
    // 发出事件
    this.emit('requestAborted', requestData);
  }

  /**
   * 记录监控指标
   */
  private async recordMetrics(requestData: RequestMonitorData): Promise<void> {
    try {
      // 发送到监控服务
      await monitoringService.insertRecord({
        id: requestData.id,
        endpoint: requestData.path,
        method: requestData.method,
        statusCode: requestData.statusCode || 0,
        responseTime: requestData.duration || 0,
        timestamp: new Date(requestData.startTime),
        userId: requestData.userId,
        userAgent: requestData.userAgent,
        ip: requestData.ip,
        requestSize: 0,
        responseSize: requestData.responseSize || 0,
        error: requestData.error?.message
      });
      
      // 更新实时统计
      await this.updateRealTimeStats(requestData);
      
    } catch (error) {
      const appError = errorHandler.standardizeError(error, {
        requestId: requestData.id,
        endpoint: requestData.path
      });
      errorHandler.logError(appError);
    }
  }

  /**
   * 更新实时统计
   */
  private async updateRealTimeStats(requestData: RequestMonitorData): Promise<void> {
    const minute = Math.floor(requestData.startTime / 60000);
    const cacheKey = `api_stats_${minute}`;
    
    try {
      const stats: ApiStats = await cacheService.get(cacheKey) || {
        totalRequests: 0,
        successRequests: 0,
        errorRequests: 0,
        averageResponseTime: 0,
        slowRequests: 0,
        requestsPerMinute: 0,
        errorRate: 0,
        topEndpoints: [],
        topErrors: [],
        userActivity: []
      };
      
      // 更新统计
      stats.totalRequests++;
      const duration = requestData.duration || 0;
      
      if (requestData.statusCode && requestData.statusCode < 400) {
        stats.successRequests++;
      } else {
        stats.errorRequests++;
      }
      
      if (duration > this.config.slowRequestThreshold) {
        stats.slowRequests++;
      }
      
      // 计算平均响应时间
      stats.averageResponseTime = ((stats.averageResponseTime * (stats.totalRequests - 1)) + duration) / stats.totalRequests;
      
      // 计算错误率
      stats.errorRate = stats.errorRequests / stats.totalRequests;
      
      // 更新端点统计
      const endpoint = `${requestData.method} ${requestData.path}`;
      const existingEndpoint = stats.topEndpoints.find(e => e.path === endpoint);
      if (existingEndpoint) {
        existingEndpoint.count++;
        existingEndpoint.averageTime = ((existingEndpoint.averageTime * (existingEndpoint.count - 1)) + duration) / existingEndpoint.count;
      } else {
        stats.topEndpoints.push({ path: endpoint, count: 1, averageTime: duration });
      }
      
      // 更新错误统计
      if (requestData.error) {
        const errorKey = requestData.error.message || 'Unknown Error';
        const existingError = stats.topErrors.find(e => e.error === errorKey);
        if (existingError) {
          existingError.count++;
        } else {
          stats.topErrors.push({ error: errorKey, count: 1 });
        }
      }
      
      // 更新用户统计
      if (requestData.userId) {
        const existingUser = stats.userActivity.find(u => u.userId === requestData.userId);
        if (existingUser) {
          existingUser.requestCount++;
        } else {
          stats.userActivity.push({ userId: requestData.userId, requestCount: 1 });
        }
      }
      
      // 缓存统计数据（5分钟过期）
      await cacheService.set(cacheKey, stats, { ttl: 300 });
      
    } catch (error) {
      const appError = errorHandler.standardizeError(error);
      errorHandler.logError(appError);
    }
  }

  /**
   * 处理慢请求
   */
  private handleSlowRequest(requestData: RequestMonitorData): void {
    const slowRequestError = errorHandler.createError(
      ErrorType.INTERNAL_ERROR,
      `Slow request detected: ${requestData.path} took ${requestData.duration}ms`,
      {
        severity: ErrorSeverity.LOW,
        context: {
          endpoint: requestData.path,
          method: requestData.method,
          userId: requestData.userId,
          timestamp: new Date(),
          additionalData: {
            responseTime: requestData.duration,
            statusCode: requestData.statusCode
          }
        }
      }
    );
    
    errorHandler.logError(slowRequestError);
    
    // 发出慢请求事件
    this.emit('slowRequest', requestData);
  }

  /**
   * 处理错误请求
   */
  private handleErrorRequest(requestData: RequestMonitorData): void {
    const appError = errorHandler.standardizeError(requestData.error || new Error(`HTTP ${requestData.statusCode}`), {
      requestId: requestData.id,
      endpoint: requestData.path,
      method: requestData.method,
      userId: requestData.userId,
      timestamp: new Date(),
      additionalData: {
        statusCode: requestData.statusCode
      }
    });
    errorHandler.logError(appError);
    
    // 发出错误请求事件
    this.emit('errorRequest', requestData);
  }

  /**
   * 收集实时指标
   */
  private async collectRealTimeMetrics(): Promise<void> {
    try {
      const now = Date.now();
      const currentCpuUsage = process.cpuUsage(this.lastCpuUsage);
      this.lastCpuUsage = process.cpuUsage();
      
      // 计算CPU使用率
      const cpuPercent = (currentCpuUsage.user + currentCpuUsage.system) / 1000000 / 60 * 100;
      
      // 计算最近一分钟的请求统计
      const recentRequests = this.metricsBuffer.filter(
        req => req.startTime > now - 60000
      );
      
      const metrics: RealTimeMetrics = {
        timestamp: now,
        activeRequests: this.activeRequests.size,
        requestsPerSecond: recentRequests.length / 60,
        averageResponseTime: recentRequests.length > 0 
          ? recentRequests.reduce((sum, req) => sum + (req.duration || 0), 0) / recentRequests.length
          : 0,
        errorRate: recentRequests.length > 0
          ? recentRequests.filter(req => req.statusCode && req.statusCode >= 400).length / recentRequests.length
          : 0,
        memoryUsage: process.memoryUsage(),
        cpuUsage: cpuPercent
      };
      
      // 缓存实时指标
      await cacheService.set('realtime_metrics', metrics, { ttl: 120 });
      
      // 发出实时指标事件
      this.emit('realTimeMetrics', metrics);
      
    } catch (error) {
      const appError = errorHandler.standardizeError(error);
      errorHandler.logError(appError);
    }
  }

  /**
   * 检查告警条件
   */
  private async checkAlertConditions(): Promise<void> {
    try {
      const now = Date.now();
      const recentRequests = this.metricsBuffer.filter(
        req => req.startTime > now - 600000 // 最近10分钟
      );
      
      if (recentRequests.length === 0) return;
      
      // 检查错误率
      const errorRate = recentRequests.filter(req => req.statusCode && req.statusCode >= 400).length / recentRequests.length;
      if (errorRate > this.config.alertThresholds.errorRate) {
        this.triggerAlert('high_error_rate', {
          errorRate: errorRate,
          threshold: this.config.alertThresholds.errorRate,
          period: '10分钟'
        });
      }
      
      // 检查平均响应时间
      const avgResponseTime = recentRequests.reduce((sum, req) => sum + (req.duration || 0), 0) / recentRequests.length;
      if (avgResponseTime > this.config.alertThresholds.responseTime) {
        this.triggerAlert('high_response_time', {
          averageTime: avgResponseTime,
          threshold: this.config.alertThresholds.responseTime,
          period: '10分钟'
        });
      }
      
      // 检查请求频率
      const requestsPerMinute = recentRequests.length / 10;
      if (requestsPerMinute > this.config.alertThresholds.requestsPerMinute) {
        this.triggerAlert('high_request_rate', {
          requestsPerMinute: requestsPerMinute,
          threshold: this.config.alertThresholds.requestsPerMinute,
          period: '10分钟'
        });
      }
      
    } catch (error) {
      const appError = errorHandler.standardizeError(error);
      errorHandler.logError(appError);
    }
  }

  /**
   * 触发告警
   */
  private triggerAlert(alertType: string, data: Record<string, unknown>): void {
    const cooldownKey = `alert_${alertType}`;
    const lastAlert = this.alertCooldowns.get(cooldownKey) || 0;
    const now = Date.now();
    
    // 告警冷却时间：30分钟
    if (now - lastAlert < 1800000) {
      return;
    }
    
    this.alertCooldowns.set(cooldownKey, now);
    
    const appError = errorHandler.standardizeError(new Error('监控告警'), data);
    errorHandler.logError(appError);
    
    // 发出告警事件
    this.emit('alert', { type: alertType, data, timestamp: now });
  }

  /**
   * 清理过期数据
   */
  private cleanupExpiredData(): void {
    const cutoff = Date.now() - (this.config.retentionDays * 24 * 60 * 60 * 1000);
    
    // 清理指标缓冲区
    this.metricsBuffer = this.metricsBuffer.filter(req => req.startTime > cutoff);
    
    // 清理告警冷却
    for (const [key, timestamp] of this.alertCooldowns.entries()) {
      if (timestamp < cutoff) {
        this.alertCooldowns.delete(key);
      }
    }
  }

  /**
   * 获取API统计数据
   */
  async getApiStats(timeRange: string = '1h'): Promise<ApiStats> {
    const cacheKey = `api_stats_${timeRange}`;
    
    try {
      let stats = this.statsCache.get(cacheKey);
      if (stats) {
        return stats;
      }
      
      const now = Date.now();
      let startTime: number;
      
      switch (timeRange) {
        case '1h':
          startTime = now - 3600000;
          break;
        case '24h':
          startTime = now - 86400000;
          break;
        case '7d':
          startTime = now - 604800000;
          break;
        default:
          startTime = now - 3600000;
      }
      
      const requests = this.metricsBuffer.filter(req => req.startTime > startTime);
      
      const successRequests = requests.filter(req => req.statusCode && req.statusCode < 400);
      const errorRequests = requests.filter(req => req.statusCode && req.statusCode >= 400);
      const slowRequests = requests.filter(req => req.duration && req.duration > this.config.slowRequestThreshold);
      
      // 计算端点统计
      const endpointStats: Record<string, { count: number; totalTime: number }> = {};
      requests.forEach(req => {
        const endpoint = `${req.method} ${req.path}`;
        if (!endpointStats[endpoint]) {
          endpointStats[endpoint] = { count: 0, totalTime: 0 };
        }
        endpointStats[endpoint].count++;
        endpointStats[endpoint].totalTime += req.duration || 0;
      });
      
      const topEndpoints = Object.entries(endpointStats)
        .map(([path, stats]) => ({
          path,
          count: stats.count,
          averageTime: stats.totalTime / stats.count
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
      
      // 计算错误统计
      const errorStats: Record<string, number> = {};
      errorRequests.forEach(req => {
        const error = req.error?.message || `HTTP ${req.statusCode}`;
        errorStats[error] = (errorStats[error] || 0) + 1;
      });
      
      const topErrors = Object.entries(errorStats)
        .map(([error, count]) => ({ error, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
      
      // 计算用户活动
      const userStats: Record<string, number> = {};
      requests.forEach(req => {
        if (req.userId) {
          userStats[req.userId] = (userStats[req.userId] || 0) + 1;
        }
      });
      
      const userActivity = Object.entries(userStats)
        .map(([userId, requestCount]) => ({ userId, requestCount }))
        .sort((a, b) => b.requestCount - a.requestCount)
        .slice(0, 10);
      
      stats = {
        totalRequests: requests.length,
        successRequests: successRequests.length,
        errorRequests: errorRequests.length,
        averageResponseTime: requests.length > 0 
          ? requests.reduce((sum, req) => sum + (req.duration || 0), 0) / requests.length
          : 0,
        slowRequests: slowRequests.length,
        requestsPerMinute: requests.length / (timeRange === '1h' ? 60 : timeRange === '24h' ? 1440 : 10080),
        errorRate: requests.length > 0 ? errorRequests.length / requests.length : 0,
        topEndpoints,
        topErrors,
        userActivity
      };
      
      // 缓存5分钟
      this.statsCache.set(cacheKey, stats);
      setTimeout(() => this.statsCache.delete(cacheKey), 300000);
      
      return stats;
      
    } catch (error) {
      const appError = errorHandler.standardizeError(error);
      errorHandler.logError(appError);
      throw error;
    }
  }

  /**
   * 获取实时指标
   */
  async getRealTimeMetrics(): Promise<RealTimeMetrics | null> {
    try {
      return await cacheService.get('realtime_metrics');
    } catch (error) {
      const appError = errorHandler.standardizeError(error);
      errorHandler.logError(appError);
      return null;
    }
  }

  /**
   * 清理请求头
   */
  private sanitizeHeaders(headers: Record<string, unknown>): Record<string, string> {
    const sanitized: Record<string, string> = {};
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'x-auth-token'];
    
    for (const [key, value] of Object.entries(headers)) {
      if (sensitiveHeaders.includes(key.toLowerCase())) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = String(value);
      }
    }
    
    return sanitized;
  }

  /**
   * 清理请求体
   */
  private sanitizeBody(body: unknown): unknown {
    if (!body) return null;
    
    const bodyStr = JSON.stringify(body);
    if (bodyStr.length > this.config.maxBodySize) {
      return '[BODY_TOO_LARGE]';
    }
    
    // 移除敏感字段
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'apiKey', 'accessToken'];
    const sanitized: Record<string, unknown> = { ...body as Record<string, unknown> };
    
    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }
    
    return sanitized;
  }

  /**
   * 获取客户端IP
   */
  private getClientIp(req: Request): string {
    return (
      req.ip ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      (req.connection as ExtendedConnection)?.socket?.remoteAddress ||
      req.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
      req.get('X-Real-IP') ||
      req.get('CF-Connecting-IP') ||
      'unknown'
    );
  }

  /**
   * 获取活跃请求统计
   */
  getActiveRequestsStats() {
    return {
      total: this.activeRequests.size,
      requests: Array.from(this.activeRequests.values()).map(req => ({
        id: req.id,
        method: req.method,
        path: req.path,
        duration: Date.now() - req.startTime,
        userId: req.userId,
        ip: req.ip
      }))
    };
  }

  /**
   * 获取监控仪表板数据
   */
  async getDashboardData(): Promise<{
    realTime: RealTimeMetrics | null;
    hourly: ApiStats;
    daily: ApiStats;
    activeRequests: {
      total: number;
      requests: Array<{
        id: string;
        method: string;
        path: string;
        duration: number;
        userId?: string;
        ip: string;
      }>;
    };
    systemHealth: {
      memoryUsage: NodeJS.MemoryUsage;
      uptime: number;
      version: string;
    };
  }> {
    try {
      const [stats1h, stats24h, realTimeMetrics] = await Promise.all([
        this.getApiStats('1h'),
        this.getApiStats('24h'),
        this.getRealTimeMetrics()
      ]);
      
      return {
        realTime: realTimeMetrics,
        hourly: stats1h,
        daily: stats24h,
        activeRequests: this.getActiveRequestsStats(),
        systemHealth: {
          memoryUsage: process.memoryUsage(),
          uptime: process.uptime(),
          version: process.version
        }
      };
    } catch (error) {
      const appError = errorHandler.standardizeError(error);
      errorHandler.logError(appError);
      throw error;
    }
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<ApiMonitorConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // 如果禁用监控，清理定时器
    if (!this.config.enabled && this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = undefined;
    }
    
    // 如果启用监控，重新初始化
    if (this.config.enabled && !this.metricsInterval) {
      this.initializeMetricsCollection();
    }
  }

  /**
   * 获取配置
   */
  getConfig(): ApiMonitorConfig {
    return { ...this.config };
  }

  /**
   * 销毁监控器
   */
  destroy(): void {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }
    
    this.activeRequests.clear();
    this.statsCache.clear();
    this.metricsBuffer.length = 0;
    this.alertCooldowns.clear();
    this.removeAllListeners();
  }
}

// 导出单例实例
export const apiMonitor = new ApiMonitor();
export { ApiMonitor };
export type { ApiMonitorConfig, RequestMonitorData, ApiStats, RealTimeMetrics };