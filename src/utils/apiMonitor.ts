/**
 * API监控核心模块
 * 提供API调用追踪、性能监控、错误统计等功能
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  ApiCallRecord,
  ErrorType,
  MonitoringConfig,
  MonitoringMiddlewareOptions,
  RealTimeMetrics,
  SystemMetrics
} from '@/types/monitoring';

/**
 * API监控器类
 * 负责收集和处理API调用数据
 */
export class ApiMonitor {
  private static instance: ApiMonitor;
  private config: MonitoringConfig;
  private records: Map<string, ApiCallRecord> = new Map();
  private realtimeMetrics: RealTimeMetrics;
  private metricsBuffer: ApiCallRecord[] = [];
  private flushInterval: NodeJS.Timeout | null = null;

  /**
   * 获取ApiMonitor单例实例
   * @returns ApiMonitor实例
   */
  public static getInstance(): ApiMonitor {
    if (!ApiMonitor.instance) {
      ApiMonitor.instance = new ApiMonitor();
    }
    return ApiMonitor.instance;
  }

  /**
   * 构造函数，初始化监控配置
   */
  private constructor() {
    this.config = this.getDefaultConfig();
    this.realtimeMetrics = this.initRealtimeMetrics();
    // 测试环境中禁用定时器
    if (process.env.NODE_ENV !== 'test') {
      this.startMetricsFlush();
    }
  }

  /**
   * 获取默认监控配置
   * @returns 默认配置对象
   */
  private getDefaultConfig(): MonitoringConfig {
    return {
      enabled: true,
      sampleRate: 1.0,
      retentionDays: 30,
      alertThresholds: {
        errorRate: 5.0, // 5%
        responseTime: 2000, // 2秒
        requestsPerSecond: 1000
      },
      excludeEndpoints: ['/health', '/metrics', '/favicon.ico'],
      enableRealTime: true
    };
  }

  /**
   * 初始化实时监控指标
   * @returns 初始化的实时指标对象
   */
  private initRealtimeMetrics(): RealTimeMetrics {
    return {
      currentRps: 0,
      currentActiveUsers: 0,
      currentResponseTime: 0,
      currentErrorRate: 0,
      recentErrors: [],
      topEndpoints: []
    };
  }

  /**
   * 更新监控配置
   * @param newConfig 新的配置对象
   */
  public updateConfig(newConfig: Partial<MonitoringConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * 获取当前配置
   * @returns 当前配置对象
   */
  public getConfig(): MonitoringConfig {
    return { ...this.config };
  }

  /**
   * 记录API调用
   * @param record API调用记录
   */
  public recordApiCall(record: ApiCallRecord): void {
    if (!this.config.enabled) return;
    
    // 检查是否需要采样
    if (Math.random() > this.config.sampleRate) return;
    
    // 检查是否在排除列表中
    if (this.config.excludeEndpoints.some(endpoint => 
      record.endpoint.includes(endpoint))) return;

    // 添加到缓冲区
    this.metricsBuffer.push(record);
    
    // 更新实时指标
    if (this.config.enableRealTime) {
      this.updateRealtimeMetrics(record);
    }

    // 如果缓冲区满了，立即刷新
    if (this.metricsBuffer.length >= 100) {
      this.flushMetrics();
    }
  }

  /**
   * 创建API监控中间件
   * @param options 中间件选项
   * @returns 中间件函数
   */
  public createMiddleware(options?: MonitoringMiddlewareOptions) {
    return async (request: NextRequest, response: NextResponse) => {
      const startTime = Date.now();
      const requestId = this.generateRequestId();
      
      try {
        // 获取请求信息
        const requestInfo = this.extractRequestInfo(request);
        
        // 等待响应完成
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        // 创建调用记录
        const record: ApiCallRecord = {
          id: requestId,
          endpoint: requestInfo.endpoint,
          method: requestInfo.method,
          userId: requestInfo.userId,
          userAgent: requestInfo.userAgent,
          ip: requestInfo.ip,
          timestamp: new Date(startTime),
          responseTime,
          statusCode: response.status,
          requestSize: requestInfo.size,
          responseSize: this.getResponseSize(response),
          error: response.status >= 400 ? this.getErrorMessage(response) : undefined,
          errorType: response.status >= 400 ? this.classifyError(response.status) : undefined
        };

        // 记录调用
        this.recordApiCall(record);
        
        // 调用回调函数
        if (options?.onRecord) {
          options.onRecord(record);
        }
        
        return response;
      } catch (error) {
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        // 记录错误
        const errorRecord: Partial<ApiCallRecord> = {
          id: requestId,
          timestamp: new Date(startTime),
          responseTime,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
        
        if (options?.onError) {
          options.onError(error as Error, errorRecord);
        }
        
        throw error;
      }
    };
  }

  /**
   * 提取请求信息
   * @param request NextRequest对象
   * @returns 请求信息对象
   */
  private extractRequestInfo(request: NextRequest) {
    const url = new URL(request.url);
    const userAgent = request.headers.get('user-agent') || '';
    const authorization = request.headers.get('authorization');
    
    return {
      endpoint: url.pathname,
      method: request.method,
      userId: this.extractUserIdFromAuth(authorization),
      userAgent,
      ip: this.getClientIp(request),
      size: this.getRequestSize(request)
    };
  }

  /**
   * 从授权头中提取用户ID
   * @param authorization 授权头
   * @returns 用户ID或undefined
   */
  private extractUserIdFromAuth(authorization: string | null): string | undefined {
    if (!authorization) return undefined;
    
    try {
      // 这里应该根据实际的JWT解析逻辑来实现
      // 简化实现，实际项目中需要使用JWT库
      const token = authorization.replace('Bearer ', '');
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.userId || payload.sub;
    } catch {
      return undefined;
    }
  }

  /**
   * 获取客户端IP地址
   * @param request NextRequest对象
   * @returns IP地址
   */
  private getClientIp(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const remoteAddr = request.headers.get('remote-addr');
    
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    
    return realIp || remoteAddr || 'unknown';
  }

  /**
   * 获取请求大小
   * @param request NextRequest对象
   * @returns 请求大小（字节）
   */
  private getRequestSize(request: NextRequest): number {
    const contentLength = request.headers.get('content-length');
    return contentLength ? parseInt(contentLength, 10) : 0;
  }

  /**
   * 获取响应大小
   * @param response NextResponse对象
   * @returns 响应大小（字节）
   */
  private getResponseSize(response: NextResponse): number {
    const contentLength = response.headers.get('content-length');
    return contentLength ? parseInt(contentLength, 10) : 0;
  }

  /**
   * 获取错误消息
   * @param response NextResponse对象
   * @returns 错误消息
   */
  private getErrorMessage(response: NextResponse): string {
    return `HTTP ${response.status} ${response.statusText}`;
  }

  /**
   * 分类错误类型
   * @param statusCode HTTP状态码
   * @returns 错误类型
   */
  private classifyError(statusCode: number): ErrorType {
    if (statusCode === 400) return ErrorType.VALIDATION;
    if (statusCode === 401) return ErrorType.AUTHENTICATION;
    if (statusCode === 403) return ErrorType.AUTHORIZATION;
    if (statusCode === 404) return ErrorType.NOT_FOUND;
    if (statusCode === 429) return ErrorType.RATE_LIMIT;
    if (statusCode === 408) return ErrorType.TIMEOUT;
    if (statusCode >= 500) return ErrorType.SERVER_ERROR;
    return ErrorType.SERVER_ERROR;
  }

  /**
   * 生成请求ID
   * @returns 唯一请求ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 更新实时监控指标
   * @param record API调用记录
   */
  private updateRealtimeMetrics(record: ApiCallRecord): void {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    // 过滤最近一分钟的记录
    const recentRecords = this.metricsBuffer.filter(
      r => r.timestamp.getTime() > oneMinuteAgo
    );
    
    // 计算RPS
    this.realtimeMetrics.currentRps = recentRecords.length / 60;
    
    // 计算平均响应时间
    if (recentRecords.length > 0) {
      const totalResponseTime = recentRecords.reduce(
        (sum, r) => sum + r.responseTime, 0
      );
      this.realtimeMetrics.currentResponseTime = totalResponseTime / recentRecords.length;
    }
    
    // 计算错误率
    const errorRecords = recentRecords.filter(r => r.statusCode >= 400);
    this.realtimeMetrics.currentErrorRate = recentRecords.length > 0 
      ? (errorRecords.length / recentRecords.length) * 100 
      : 0;
    
    // 计算活跃用户数
    const uniqueUsers = new Set(
      recentRecords.filter(r => r.userId).map(r => r.userId)
    );
    this.realtimeMetrics.currentActiveUsers = uniqueUsers.size;
    
    // 更新最近错误
    if (record.error) {
      this.realtimeMetrics.recentErrors.unshift({
        timestamp: record.timestamp,
        endpoint: record.endpoint,
        error: record.error,
        count: 1
      });
      
      // 保持最近10个错误
      this.realtimeMetrics.recentErrors = this.realtimeMetrics.recentErrors.slice(0, 10);
    }
  }

  /**
   * 获取实时监控指标
   * @returns 实时指标对象
   */
  public getRealtimeMetrics(): RealTimeMetrics {
    return { ...this.realtimeMetrics };
  }

  /**
   * 获取系统指标
   * @returns 系统指标对象
   */
  public getSystemMetrics(): SystemMetrics {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 3600000);
    
    const recentRecords = this.metricsBuffer.filter(
      r => r.timestamp >= oneHourAgo
    );
    
    const totalRequests = recentRecords.length;
    const errorRequests = recentRecords.filter(r => r.statusCode >= 400).length;
    const totalResponseTime = recentRecords.reduce((sum, r) => sum + r.responseTime, 0);
    
    return {
      timestamp: now,
      totalRequests,
      requestsPerSecond: totalRequests / 3600,
      averageResponseTime: totalRequests > 0 ? totalResponseTime / totalRequests : 0,
      errorRate: totalRequests > 0 ? (errorRequests / totalRequests) * 100 : 0,
      activeUsers: new Set(recentRecords.filter(r => r.userId).map(r => r.userId)).size,
      memoryUsage: this.getMemoryUsage(),
      cpuUsage: 0, // 需要系统级监控
      diskUsage: 0, // 需要系统级监控
      networkIn: 0, // 需要系统级监控
      networkOut: 0 // 需要系统级监控
    };
  }

  /**
   * 获取内存使用情况
   * @returns 内存使用量（MB）
   */
  private getMemoryUsage(): number {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const usage = process.memoryUsage();
      return Math.round(usage.heapUsed / 1024 / 1024);
    }
    return 0;
  }

  /**
   * 开始定期刷新指标
   */
  private startMetricsFlush(): void {
    this.flushInterval = setInterval(() => {
      this.flushMetrics();
    }, 10000); // 每10秒刷新一次
  }

  /**
   * 刷新指标到持久化存储
   */
  private async flushMetrics(): Promise<void> {
    if (this.metricsBuffer.length === 0) return;
    
    try {
      // 这里应该调用监控服务来持久化数据
      // 为了避免循环依赖，这里使用事件或回调机制
      const records = [...this.metricsBuffer];
      this.metricsBuffer = [];
      
      // 发送到监控服务
      if (typeof window === 'undefined') {
        // 服务端环境
        const { MonitoringService } = await import('@/services/monitoringService');
        const service = MonitoringService.getInstance();
        await service.batchInsertRecords(records);
      }
    } catch (error) {
      console.error('Failed to flush metrics:', error);
      // 如果失败，将记录放回缓冲区
      this.metricsBuffer.unshift(...this.metricsBuffer);
    }
  }

  /**
   * 停止监控
   */
  public stop(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    
    // 最后一次刷新
    this.flushMetrics();
  }

  /**
   * 清理旧数据
   * @param days 保留天数
   */
  public async cleanup(days: number = this.config.retentionDays): Promise<void> {
    try {
      if (typeof window === 'undefined') {
        const { MonitoringService } = await import('@/services/monitoringService');
        const service = MonitoringService.getInstance();
        await service.cleanupOldRecords(days);
      }
    } catch (error) {
      console.error('Failed to cleanup old records:', error);
    }
  }
}

// 导出单例实例
export const apiMonitor = ApiMonitor.getInstance();

/**
 * 创建API监控中间件的便捷函数
 * @param options 中间件选项
 * @returns 中间件函数
 */
export function createApiMonitoringMiddleware(options?: MonitoringMiddlewareOptions) {
  return apiMonitor.createMiddleware(options);
}

/**
 * 手动记录API调用的便捷函数
 * @param record API调用记录
 */
export function recordApiCall(record: ApiCallRecord): void {
  apiMonitor.recordApiCall(record);
}

/**
 * 获取实时监控指标的便捷函数
 * @returns 实时指标对象
 */
export function getRealtimeMetrics(): RealTimeMetrics {
  return apiMonitor.getRealtimeMetrics();
}

/**
 * 获取系统指标的便捷函数
 * @returns 系统指标对象
 */
export function getSystemMetrics(): SystemMetrics {
  return apiMonitor.getSystemMetrics();
}