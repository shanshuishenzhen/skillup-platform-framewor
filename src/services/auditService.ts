/**
 * 审计服务
 * 
 * 提供审计日志功能，包括：
 * - 操作日志记录
 * - 安全事件跟踪
 * - 用户行为审计
 * - 数据变更记录
 * - 合规性检查
 * - 审计报告生成
 * - 日志存储和检索
 * - 异常检测和告警
 */

import { logger } from '../utils/logger';
import { createServerClient } from '../utils/supabase';
import { getEnvConfig } from '../utils/envConfig';
import { cacheService } from './cacheService';
import { analyticsService } from './analyticsService';

// 类型定义
export type AuditLevel = 'debug' | 'info' | 'warn' | 'error' | 'critical';
export type AuditCategory = 'auth' | 'data' | 'system' | 'security' | 'compliance' | 'user' | 'api';
export type AuditAction = 'create' | 'read' | 'update' | 'delete' | 'login' | 'logout' | 'access' | 'modify' | 'export' | 'import';

export interface AuditConfig {
  enableAudit: boolean;
  logLevel: AuditLevel;
  retentionDays: number;
  batchSize: number;
  flushInterval: number;
  enableEncryption: boolean;
  enableCompression: boolean;
  enableRealTimeAlerts: boolean;
  alertThresholds: Record<AuditLevel, number>;
}

export interface AuditLog {
  id?: string;
  timestamp?: Date;
  level?: AuditLevel;
  category?: AuditCategory;
  action: AuditAction | string;
  resource: string;
  userId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  details?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  success?: boolean;
  errorMessage?: string;
  duration?: number;
  correlationId?: string;
}

export interface AuditEvent {
  type: string;
  source: string;
  data: Record<string, unknown>;
  timestamp: Date;
  severity: AuditLevel;
}

export interface AuditQuery {
  startDate?: Date;
  endDate?: Date;
  userId?: string;
  action?: string;
  resource?: string;
  level?: AuditLevel;
  category?: AuditCategory;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filters?: Record<string, unknown>;
}

export interface AuditMetrics {
  totalLogs: number;
  logsByLevel: Record<AuditLevel, number>;
  logsByCategory: Record<AuditCategory, number>;
  securityEvents: number;
  failedOperations: number;
  avgResponseTime: number;
  topUsers: Array<{ userId: string; count: number }>;
  topActions: Array<{ action: string; count: number }>;
  complianceScore: number;
}

export interface ComplianceReport {
  period: { start: Date; end: Date };
  standards: string[];
  summary: {
    totalEvents: number;
    violations: number;
    complianceRate: number;
  };
  violations: Array<{
    standard: string;
    rule: string;
    count: number;
    severity: AuditLevel;
  }>;
  recommendations: string[];
}

export interface ExportOptions {
  format: 'json' | 'csv' | 'xml';
  startDate: Date;
  endDate: Date;
  filters?: Record<string, unknown>;
  includeMetadata?: boolean;
}

/**
 * 审计服务类
 */
export class AuditService {
  private config: AuditConfig;
  private logBuffer: AuditLog[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private metrics: AuditMetrics;

  constructor(config?: Partial<AuditConfig>) {
    const envConfig = getEnvConfig();
    this.config = {
      enableAudit: envConfig?.audit?.enabled || true,
      logLevel: (envConfig?.audit?.logLevel as AuditLevel) || 'info',
      retentionDays: envConfig?.audit?.retentionDays || 90,
      batchSize: envConfig?.audit?.batchSize || 100,
      flushInterval: envConfig?.audit?.flushInterval || 5000,
      enableEncryption: envConfig?.audit?.enableEncryption || false,
      enableCompression: envConfig?.audit?.enableCompression || false,
      enableRealTimeAlerts: envConfig?.audit?.enableRealTimeAlerts || true,
      alertThresholds: {
        debug: 1000,
        info: 500,
        warn: 100,
        error: 50,
        critical: 10
      },
      ...config
    };

    this.metrics = {
      totalLogs: 0,
      logsByLevel: {
        debug: 0,
        info: 0,
        warn: 0,
        error: 0,
        critical: 0
      },
      logsByCategory: {
        auth: 0,
        data: 0,
        system: 0,
        security: 0,
        compliance: 0,
        user: 0,
        api: 0
      },
      securityEvents: 0,
      failedOperations: 0,
      avgResponseTime: 0,
      topUsers: [],
      topActions: [],
      complianceScore: 0
    };

    // 测试环境中禁用定时器
    if (process.env.NODE_ENV !== 'test') {
      this.startFlushTimer();
    }
  }

  /**
   * 记录审计日志
   */
  async log(logData: AuditLog): Promise<boolean> {
    try {
      if (!this.config.enableAudit) {
        return true;
      }

      // 验证必需字段
      if (!logData.action || !logData.resource) {
        logger.warn('Audit log missing required fields', { logData });
        return false;
      }

      // 补充默认值
      const auditLog: AuditLog = {
        id: this.generateId(),
        timestamp: new Date(),
        level: logData.level || 'info',
        category: logData.category || 'system',
        success: logData.success !== false,
        correlationId: logData.correlationId || this.generateCorrelationId(),
        ...logData
      };

      // 检查日志级别
      if (!this.shouldLog(auditLog.level!)) {
        return true;
      }

      // 添加到缓冲区
      this.logBuffer.push(auditLog);
      this.updateMetrics(auditLog);

      // 检查是否需要立即刷新
      if (this.logBuffer.length >= this.config.batchSize) {
        await this.flush();
      }

      // 检查实时告警
      if (this.config.enableRealTimeAlerts) {
        await this.checkAlerts(auditLog);
      }

      return true;
    } catch (error) {
      logger.error('Failed to log audit entry', { error: error instanceof Error ? error.message : String(error) });
      return false;
    }
  }

  /**
   * 记录缓存操作
   */
  async logCacheOperation(operation: {
    operation: string;
    key: string;
    ttl?: number;
    success: boolean;
    error?: string;
  }): Promise<void> {
    await this.log({
      action: `cache_${operation.operation}`,
      resource: 'cache',
      category: 'system',
      level: operation.success ? 'info' : 'error',
      details: {
        key: operation.key,
        ttl: operation.ttl,
        error: operation.error
      },
      success: operation.success
    });
  }

  /**
   * 记录API操作
   */
  async logApiOperation(operation: {
    method: string;
    path: string;
    statusCode: number;
    userId?: string;
    duration: number;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    await this.log({
      action: 'api_request',
      resource: operation.path,
      category: 'api',
      level: operation.statusCode >= 400 ? 'error' : 'info',
      userId: operation.userId,
      ipAddress: operation.ipAddress,
      userAgent: operation.userAgent,
      duration: operation.duration,
      details: {
        method: operation.method,
        statusCode: operation.statusCode
      },
      success: operation.statusCode < 400
    });
  }

  /**
   * 记录安全事件
   */
  async logSecurityEvent(event: {
    type: string;
    severity: AuditLevel;
    userId?: string;
    ipAddress?: string;
    details: Record<string, unknown>;
  }): Promise<void> {
    await this.log({
      action: 'security_event',
      resource: 'security',
      category: 'security',
      level: event.severity,
      userId: event.userId,
      ipAddress: event.ipAddress,
      details: {
        eventType: event.type,
        ...event.details
      },
      success: false
    });

    this.metrics.securityEvents++;
  }

  /**
   * 查询审计日志
   */
  async queryLogs(query: AuditQuery): Promise<AuditLog[]> {
    try {
      const supabase = createServerClient();
      let queryBuilder = supabase
        .from('audit_logs')
        .select('*');

      // 应用过滤条件
      if (query.startDate) {
        queryBuilder = queryBuilder.gte('timestamp', query.startDate.toISOString());
      }
      if (query.endDate) {
        queryBuilder = queryBuilder.lte('timestamp', query.endDate.toISOString());
      }
      if (query.userId) {
        queryBuilder = queryBuilder.eq('user_id', query.userId);
      }
      if (query.action) {
        queryBuilder = queryBuilder.eq('action', query.action);
      }
      if (query.resource) {
        queryBuilder = queryBuilder.eq('resource', query.resource);
      }
      if (query.level) {
        queryBuilder = queryBuilder.eq('level', query.level);
      }
      if (query.category) {
        queryBuilder = queryBuilder.eq('category', query.category);
      }

      // 排序
      const sortBy = query.sortBy || 'timestamp';
      const sortOrder = query.sortOrder || 'desc';
      queryBuilder = queryBuilder.order(sortBy, { ascending: sortOrder === 'asc' });

      // 分页
      if (query.limit) {
        queryBuilder = queryBuilder.limit(query.limit);
      }
      if (query.offset) {
        queryBuilder = queryBuilder.range(query.offset, query.offset + (query.limit || 100) - 1);
      }

      const { data, error } = await queryBuilder;

      if (error) {
        logger.error('Failed to query audit logs', { error: error instanceof Error ? error.message : String(error) });
        return [];
      }

      return data || [];
    } catch (error) {
      logger.error('Failed to query audit logs', { error: error instanceof Error ? error.message : String(error) });
      return [];
    }
  }

  /**
   * 导出审计日志
   */
  async exportLogs(options: ExportOptions): Promise<{
    format: string;
    filename: string;
    data: string;
    size: number;
  }> {
    try {
      const logs = await this.queryLogs({
        startDate: options.startDate,
        endDate: options.endDate,
        filters: options.filters
      });

      let data: string;
      let filename: string;

      switch (options.format) {
        case 'csv':
          data = this.convertToCSV(logs);
          filename = `audit_logs_${Date.now()}.csv`;
          break;
        case 'xml':
          data = this.convertToXML(logs);
          filename = `audit_logs_${Date.now()}.xml`;
          break;
        case 'json':
        default:
          data = JSON.stringify(logs, null, 2);
          filename = `audit_logs_${Date.now()}.json`;
          break;
      }

      return {
        format: options.format,
        filename,
        data,
        size: Buffer.byteLength(data, 'utf8')
      };
    } catch (error) {
      logger.error('Failed to export audit logs', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  /**
   * 生成合规性报告
   */
  async generateComplianceReport(params: {
    startDate: Date;
    endDate: Date;
    standards: string[];
  }): Promise<ComplianceReport> {
    try {
      const supabase = createServerClient();
      const { data, error } = await supabase
        .from('compliance_checks')
        .select('*')
        .gte('check_date', params.startDate.toISOString())
        .lte('check_date', params.endDate.toISOString())
        .in('standard', params.standards);

      if (error) {
        logger.error('Failed to generate compliance report', { error: error instanceof Error ? error.message : String(error) });
        throw error;
      }

      const checks = data || [];
      const totalChecks = checks.length;
      const violations = checks.filter((check: any) => check.violations > 0);
      const violationCount = violations.reduce((sum: number, check: any) => sum + check.violations, 0);

      return {
        period: {
          start: params.startDate,
          end: params.endDate
        },
        standards: params.standards,
        summary: {
          totalEvents: totalChecks,
          violations: violationCount,
          complianceRate: totalChecks > 0 ? (totalChecks - violations.length) / totalChecks : 1
        },
        violations: violations.map((v: any) => ({
          standard: v.standard,
          rule: v.rule,
          count: v.violations,
          severity: v.severity
        })),
        recommendations: this.generateRecommendations(violations)
      };
    } catch (error) {
      logger.error('Failed to generate compliance report', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  /**
   * 获取审计统计信息
   */
  async getMetrics(): Promise<AuditMetrics> {
    try {
      // 从缓存获取
      const cached = await cacheService.get<AuditMetrics>('audit:metrics');
      if (cached) {
        return cached;
      }

      // 计算统计信息
      const metrics = { ...this.metrics };

      // 缓存结果
      await cacheService.set('audit:metrics', metrics, { ttl: 300 });

      return metrics;
    } catch (error) {
      logger.error('Failed to get audit metrics', { error: error instanceof Error ? error.message : String(error) });
      return this.metrics;
    }
  }

  /**
   * 清理过期日志
   */
  async cleanup(): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays);

      const supabase = createServerClient();
      const { error } = await supabase
        .from('audit_logs')
        .delete()
        .lt('timestamp', cutoffDate.toISOString());

      if (error) {
        logger.error('Failed to cleanup audit logs', { error: error instanceof Error ? error.message : String(error) });
      } else {
        logger.info('Audit logs cleanup completed', { cutoffDate });
      }
    } catch (error) {
      logger.error('Failed to cleanup audit logs', { error: error instanceof Error ? error.message : String(error) });
    }
  }

  /**
   * 刷新日志缓冲区
   */
  private async flush(): Promise<void> {
    if (this.logBuffer.length === 0) {
      return;
    }

    try {
      const logs = [...this.logBuffer];
      this.logBuffer = [];

      const supabase = createServerClient();
      const { error } = await supabase
        .from('audit_logs')
        .insert(logs.map(log => ({
          id: log.id,
          timestamp: log.timestamp,
          level: log.level,
          category: log.category,
          action: log.action,
          resource: log.resource,
          user_id: log.userId,
          session_id: log.sessionId,
          ip_address: log.ipAddress,
          user_agent: log.userAgent,
          details: log.details,
          metadata: log.metadata,
          success: log.success,
          error_message: log.errorMessage,
          duration: log.duration,
          correlation_id: log.correlationId
        })));

      if (error) {
        logger.error('Failed to flush audit logs', { error: error instanceof Error ? error.message : String(error) });
        // 重新添加到缓冲区
        this.logBuffer.unshift(...logs);
      }
    } catch (error) {
      logger.error('Failed to flush audit logs', { error: error instanceof Error ? error.message : String(error) });
    }
  }

  /**
   * 启动刷新定时器
   */
  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.config.flushInterval);
  }

  /**
   * 停止刷新定时器
   */
  private stopFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  /**
   * 检查是否应该记录日志
   */
  private shouldLog(level: AuditLevel): boolean {
    const levels: AuditLevel[] = ['debug', 'info', 'warn', 'error', 'critical'];
    const currentLevelIndex = levels.indexOf(this.config.logLevel);
    const logLevelIndex = levels.indexOf(level);
    return logLevelIndex >= currentLevelIndex;
  }

  /**
   * 更新统计信息
   */
  private updateMetrics(log: AuditLog): void {
    this.metrics.totalLogs++;
    if (log.level) {
      this.metrics.logsByLevel[log.level]++;
    }
    if (log.category) {
      this.metrics.logsByCategory[log.category]++;
    }
    if (!log.success) {
      this.metrics.failedOperations++;
    }
    if (log.duration) {
      this.metrics.avgResponseTime = 
        (this.metrics.avgResponseTime * (this.metrics.totalLogs - 1) + log.duration) / 
        this.metrics.totalLogs;
    }
  }

  /**
   * 检查告警
   */
  private async checkAlerts(log: AuditLog): Promise<void> {
    if (!log.level) return;

    const threshold = this.config.alertThresholds[log.level];
    const count = this.metrics.logsByLevel[log.level];

    if (count >= threshold) {
      // 发送告警
      analyticsService.track('audit_alert', {
        level: log.level,
        count,
        threshold
      });
    }
  }

  /**
   * 生成ID
   */
  private generateId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 生成关联ID
   */
  private generateCorrelationId(): string {
    return `corr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 转换为CSV格式
   */
  private convertToCSV(logs: AuditLog[]): string {
    if (logs.length === 0) return '';

    const headers = Object.keys(logs[0]).join(',');
    const rows = logs.map(log => 
      Object.values(log).map(value => 
        typeof value === 'object' ? JSON.stringify(value) : String(value)
      ).join(',')
    );

    return [headers, ...rows].join('\n');
  }

  /**
   * 转换为XML格式
   */
  private convertToXML(logs: AuditLog[]): string {
    const xmlLogs = logs.map(log => {
      const entries = Object.entries(log).map(([key, value]) => 
        `<${key}>${typeof value === 'object' ? JSON.stringify(value) : String(value)}</${key}>`
      ).join('');
      return `<log>${entries}</log>`;
    }).join('');

    return `<?xml version="1.0" encoding="UTF-8"?><audit_logs>${xmlLogs}</audit_logs>`;
  }

  /**
   * 生成建议
   */
  private generateRecommendations(violations: Array<{
    standard: string;
    rule: string;
    violations: number;
    severity: string;
  }>): string[] {
    const recommendations: string[] = [];

    if (violations.length > 0) {
      recommendations.push('Review and address compliance violations');
      recommendations.push('Implement additional security controls');
      recommendations.push('Conduct regular compliance audits');
    }

    return recommendations;
  }

  /**
   * 关闭服务
   */
  async close(): Promise<void> {
    this.stopFlushTimer();
    await this.flush();
    logger.info('Audit service closed');
  }
}

// 单例实例
let auditServiceInstance: AuditService | null = null;

/**
 * 创建审计服务实例
 */
export function createAuditService(config?: Partial<AuditConfig>): AuditService {
  return new AuditService(config);
}

/**
 * 获取审计服务单例
 */
export function getAuditService(): AuditService {
  if (!auditServiceInstance) {
    auditServiceInstance = new AuditService();
  }
  return auditServiceInstance;
}

// 默认导出
export const auditService = getAuditService();
export default auditService;