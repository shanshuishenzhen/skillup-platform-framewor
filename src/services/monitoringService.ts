/**
 * 监控数据服务
 * 负责API监控数据的持久化存储、查询和分析
 */

import {
  ApiCallRecord,
  EndpointStats,
  UserUsageStats,
  DashboardData,
  StatsQuery,
  AlertRule,
  AlertRecord,
  SystemMetrics,
  ExportData,
  ErrorType
} from '@/types/monitoring';

/**
 * 监控数据服务类
 * 提供数据存储、查询、统计分析等功能
 */
export class MonitoringService {
  private static instance: MonitoringService;
  private records: ApiCallRecord[] = [];
  private alertRules: AlertRule[] = [];
  private alertRecords: AlertRecord[] = [];
  private systemMetricsHistory: SystemMetrics[] = [];

  /**
   * 获取MonitoringService单例实例
   * @returns MonitoringService实例
   */
  public static getInstance(): MonitoringService {
    if (!MonitoringService.instance) {
      MonitoringService.instance = new MonitoringService();
    }
    return MonitoringService.instance;
  }

  /**
   * 私有构造函数
   */
  private constructor() {
    this.initializeDefaultAlertRules();
  }

  /**
   * 初始化默认报警规则
   */
  private initializeDefaultAlertRules(): void {
    this.alertRules = [
      {
        id: 'high-error-rate',
        name: '高错误率报警',
        description: '当错误率超过5%时触发报警',
        enabled: true,
        condition: {
          metric: 'error_rate',
          operator: 'gt',
          threshold: 5.0,
          duration: 300 // 5分钟
        },
        actions: [
          {
            type: 'email',
            target: 'admin@example.com',
            template: '错误率过高报警'
          }
        ],
        cooldown: 1800 // 30分钟
      },
      {
        id: 'slow-response',
        name: '响应时间过慢报警',
        description: '当平均响应时间超过2秒时触发报警',
        enabled: true,
        condition: {
          metric: 'response_time',
          operator: 'gt',
          threshold: 2000,
          duration: 300
        },
        actions: [
          {
            type: 'email',
            target: 'admin@example.com',
            template: '响应时间过慢报警'
          }
        ],
        cooldown: 1800
      }
    ];
  }

  /**
   * 批量插入API调用记录
   * @param records API调用记录数组
   * @returns Promise<void>
   */
  public async batchInsertRecords(records: ApiCallRecord[]): Promise<void> {
    try {
      // 在实际项目中，这里应该连接到数据库（如Supabase、MongoDB等）
      // 这里使用内存存储作为示例
      this.records.push(...records);
      
      // 检查报警条件
      await this.checkAlertConditions();
      
      console.log(`Inserted ${records.length} monitoring records`);
    } catch (error) {
      console.error('Failed to insert monitoring records:', error);
      throw error;
    }
  }

  /**
   * 插入单个API调用记录
   * @param record API调用记录
   * @returns Promise<void>
   */
  public async insertRecord(record: ApiCallRecord): Promise<void> {
    await this.batchInsertRecords([record]);
  }

  /**
   * 查询API调用记录
   * @param query 查询参数
   * @returns Promise<ApiCallRecord[]>
   */
  public async queryRecords(query: StatsQuery): Promise<ApiCallRecord[]> {
    try {
      let filteredRecords = [...this.records];

      // 时间范围过滤
      if (query.startDate) {
        filteredRecords = filteredRecords.filter(
          record => record.timestamp >= query.startDate!
        );
      }
      if (query.endDate) {
        filteredRecords = filteredRecords.filter(
          record => record.timestamp <= query.endDate!
        );
      }

      // 端点过滤
      if (query.endpoint) {
        filteredRecords = filteredRecords.filter(
          record => record.endpoint.includes(query.endpoint!)
        );
      }

      // 方法过滤
      if (query.method) {
        filteredRecords = filteredRecords.filter(
          record => record.method === query.method
        );
      }

      // 用户过滤
      if (query.userId) {
        filteredRecords = filteredRecords.filter(
          record => record.userId === query.userId
        );
      }

      // 分页
      const offset = query.offset || 0;
      const limit = query.limit || 100;
      
      return filteredRecords
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(offset, offset + limit);
    } catch (error) {
      console.error('Failed to query records:', error);
      throw error;
    }
  }

  /**
   * 获取端点统计信息
   * @param query 查询参数
   * @returns Promise<EndpointStats[]>
   */
  public async getEndpointStats(query: StatsQuery): Promise<EndpointStats[]> {
    try {
      const records = await this.queryRecords(query);
      const statsMap = new Map<string, EndpointStats>();

      records.forEach(record => {
        const key = `${record.method}:${record.endpoint}`;
        const existing = statsMap.get(key);

        if (existing) {
          existing.totalCalls++;
          if (record.statusCode < 400) {
            existing.successCalls++;
          } else {
            existing.errorCalls++;
          }
          existing.averageResponseTime = 
            (existing.averageResponseTime * (existing.totalCalls - 1) + record.responseTime) / existing.totalCalls;
          existing.minResponseTime = Math.min(existing.minResponseTime, record.responseTime);
          existing.maxResponseTime = Math.max(existing.maxResponseTime, record.responseTime);
          existing.totalRequestSize += record.requestSize;
          existing.totalResponseSize += record.responseSize;
          existing.lastCalled = record.timestamp > existing.lastCalled ? record.timestamp : existing.lastCalled;
        } else {
          statsMap.set(key, {
            endpoint: record.endpoint,
            method: record.method,
            totalCalls: 1,
            successCalls: record.statusCode < 400 ? 1 : 0,
            errorCalls: record.statusCode >= 400 ? 1 : 0,
            averageResponseTime: record.responseTime,
            minResponseTime: record.responseTime,
            maxResponseTime: record.responseTime,
            totalRequestSize: record.requestSize,
            totalResponseSize: record.responseSize,
            errorRate: record.statusCode >= 400 ? 100 : 0,
            lastCalled: record.timestamp
          });
        }
      });

      // 计算错误率
      statsMap.forEach(stats => {
        stats.errorRate = (stats.errorCalls / stats.totalCalls) * 100;
      });

      return Array.from(statsMap.values())
        .sort((a, b) => b.totalCalls - a.totalCalls);
    } catch (error) {
      console.error('Failed to get endpoint stats:', error);
      throw error;
    }
  }

  /**
   * 获取用户使用统计
   * @param query 查询参数
   * @returns Promise<UserUsageStats[]>
   */
  public async getUserUsageStats(query: StatsQuery): Promise<UserUsageStats[]> {
    try {
      const records = await this.queryRecords(query);
      const userStatsMap = new Map<string, UserUsageStats>();

      records.forEach(record => {
        if (!record.userId) return;

        const existing = userStatsMap.get(record.userId);
        if (existing) {
          existing.totalCalls++;
          if (record.statusCode < 400) {
            existing.successCalls++;
          } else {
            existing.errorCalls++;
          }
          existing.averageResponseTime = 
            (existing.averageResponseTime * (existing.totalCalls - 1) + record.responseTime) / existing.totalCalls;
          existing.totalDataTransfer += record.requestSize + record.responseSize;
          existing.lastActivity = record.timestamp > existing.lastActivity ? record.timestamp : existing.lastActivity;

          // 更新最常用端点
          const endpointKey = `${record.method}:${record.endpoint}`;
          const endpointStat = existing.mostUsedEndpoints.find(e => 
            e.endpoint === record.endpoint && e.method === record.method
          );
          if (endpointStat) {
            endpointStat.count++;
          } else {
            existing.mostUsedEndpoints.push({
              endpoint: record.endpoint,
              method: record.method,
              count: 1
            });
          }
        } else {
          userStatsMap.set(record.userId, {
            userId: record.userId,
            totalCalls: 1,
            successCalls: record.statusCode < 400 ? 1 : 0,
            errorCalls: record.statusCode >= 400 ? 1 : 0,
            averageResponseTime: record.responseTime,
            totalDataTransfer: record.requestSize + record.responseSize,
            mostUsedEndpoints: [{
              endpoint: record.endpoint,
              method: record.method,
              count: 1
            }],
            lastActivity: record.timestamp,
            dailyUsage: []
          });
        }
      });

      // 计算每日使用量
      userStatsMap.forEach(userStats => {
        const dailyUsageMap = new Map<string, number>();
        records
          .filter(r => r.userId === userStats.userId)
          .forEach(record => {
            const dateKey = record.timestamp.toISOString().split('T')[0];
            dailyUsageMap.set(dateKey, (dailyUsageMap.get(dateKey) || 0) + 1);
          });

        userStats.dailyUsage = Array.from(dailyUsageMap.entries())
          .map(([date, calls]) => ({ date, calls }))
          .sort((a, b) => a.date.localeCompare(b.date));

        // 排序最常用端点
        userStats.mostUsedEndpoints.sort((a, b) => b.count - a.count);
        userStats.mostUsedEndpoints = userStats.mostUsedEndpoints.slice(0, 10);
      });

      return Array.from(userStatsMap.values())
        .sort((a, b) => b.totalCalls - a.totalCalls);
    } catch (error) {
      console.error('Failed to get user usage stats:', error);
      throw error;
    }
  }

  /**
   * 获取仪表板数据
   * @param query 查询参数
   * @returns Promise<DashboardData>
   */
  public async getDashboardData(query: StatsQuery): Promise<DashboardData> {
    try {
      const records = await this.queryRecords(query);
      const endpointStats = await this.getEndpointStats(query);
      
      // 计算概览数据
      const totalRequests = records.length;
      const uniqueUsers = new Set(records.filter(r => r.userId).map(r => r.userId)).size;
      const totalResponseTime = records.reduce((sum, r) => sum + r.responseTime, 0);
      const averageResponseTime = totalRequests > 0 ? totalResponseTime / totalRequests : 0;
      const errorRequests = records.filter(r => r.statusCode >= 400).length;
      const errorRate = totalRequests > 0 ? (errorRequests / totalRequests) * 100 : 0;

      // 生成时间序列数据
      const timeSeriesData = this.generateTimeSeriesData(records, query.groupBy || 'hour');

      // 获取最近错误
      const recentErrors = records
        .filter(r => r.error)
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, 10)
        .map(r => ({
          timestamp: r.timestamp,
          endpoint: r.endpoint,
          method: r.method,
          error: r.error!,
          userId: r.userId
        }));

      // 系统健康状态
      const systemHealth = this.calculateSystemHealth(errorRate, averageResponseTime);

      return {
        overview: {
          totalRequests,
          totalUsers: uniqueUsers,
          averageResponseTime,
          errorRate,
          uptime: 99.9 // 这里应该从实际监控数据计算
        },
        timeSeriesData,
        topEndpoints: endpointStats.slice(0, 10),
        recentErrors,
        systemHealth
      };
    } catch (error) {
      console.error('Failed to get dashboard data:', error);
      throw error;
    }
  }

  /**
   * 生成时间序列数据
   * @param records API调用记录
   * @param groupBy 分组方式
   * @returns 时间序列数据
   */
  private generateTimeSeriesData(records: ApiCallRecord[], groupBy: string) {
    const groupedData = new Map<string, {
      requests: number;
      responseTime: number;
      errors: number;
      users: Set<string>;
    }>();

    records.forEach(record => {
      const timeKey = this.getTimeKey(record.timestamp, groupBy);
      const existing = groupedData.get(timeKey);

      if (existing) {
        existing.requests++;
        existing.responseTime += record.responseTime;
        if (record.statusCode >= 400) existing.errors++;
        if (record.userId) existing.users.add(record.userId);
      } else {
        groupedData.set(timeKey, {
          requests: 1,
          responseTime: record.responseTime,
          errors: record.statusCode >= 400 ? 1 : 0,
          users: new Set(record.userId ? [record.userId] : [])
        });
      }
    });

    const sortedEntries = Array.from(groupedData.entries())
      .sort(([a], [b]) => a.localeCompare(b));

    return {
      requests: sortedEntries.map(([timestamp, data]) => ({
        timestamp: new Date(timestamp),
        value: data.requests
      })),
      responseTime: sortedEntries.map(([timestamp, data]) => ({
        timestamp: new Date(timestamp),
        value: data.requests > 0 ? data.responseTime / data.requests : 0
      })),
      errors: sortedEntries.map(([timestamp, data]) => ({
        timestamp: new Date(timestamp),
        value: data.errors
      })),
      users: sortedEntries.map(([timestamp, data]) => ({
        timestamp: new Date(timestamp),
        value: data.users.size
      }))
    };
  }

  /**
   * 获取时间键
   * @param timestamp 时间戳
   * @param groupBy 分组方式
   * @returns 时间键
   */
  private getTimeKey(timestamp: Date, groupBy: string): string {
    const date = new Date(timestamp);
    
    switch (groupBy) {
      case 'hour':
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:00:00`;
      case 'day':
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      case 'week':
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        return `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, '0')}-${String(weekStart.getDate()).padStart(2, '0')}`;
      case 'month':
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      default:
        return date.toISOString();
    }
  }

  /**
   * 计算系统健康状态
   * @param errorRate 错误率
   * @param averageResponseTime 平均响应时间
   * @returns 系统健康状态
   */
  private calculateSystemHealth(errorRate: number, averageResponseTime: number) {
    const issues: string[] = [];
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';

    if (errorRate > 10) {
      status = 'critical';
      issues.push(`错误率过高: ${errorRate.toFixed(2)}%`);
    } else if (errorRate > 5) {
      status = 'warning';
      issues.push(`错误率偏高: ${errorRate.toFixed(2)}%`);
    }

    if (averageResponseTime > 3000) {
      status = 'critical';
      issues.push(`响应时间过慢: ${averageResponseTime.toFixed(0)}ms`);
    } else if (averageResponseTime > 1000) {
      if (status !== 'critical') status = 'warning';
      issues.push(`响应时间偏慢: ${averageResponseTime.toFixed(0)}ms`);
    }

    return {
      status,
      issues,
      lastCheck: new Date()
    };
  }

  /**
   * 检查报警条件
   * @returns Promise<void>
   */
  private async checkAlertConditions(): Promise<void> {
    try {
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
      
      const recentRecords = this.records.filter(
        r => r.timestamp >= fiveMinutesAgo
      );

      for (const rule of this.alertRules) {
        if (!rule.enabled) continue;
        
        // 检查冷却时间
        if (rule.lastTriggered && 
            (now.getTime() - rule.lastTriggered.getTime()) < rule.cooldown * 1000) {
          continue;
        }

        let shouldTrigger = false;
        let currentValue = 0;

        switch (rule.condition.metric) {
          case 'error_rate':
            const errorCount = recentRecords.filter(r => r.statusCode >= 400).length;
            currentValue = recentRecords.length > 0 ? (errorCount / recentRecords.length) * 100 : 0;
            shouldTrigger = this.evaluateCondition(currentValue, rule.condition.operator, rule.condition.threshold);
            break;
            
          case 'response_time':
            const totalResponseTime = recentRecords.reduce((sum, r) => sum + r.responseTime, 0);
            currentValue = recentRecords.length > 0 ? totalResponseTime / recentRecords.length : 0;
            shouldTrigger = this.evaluateCondition(currentValue, rule.condition.operator, rule.condition.threshold);
            break;
            
          case 'rps':
            currentValue = recentRecords.length / 300; // 5分钟内的RPS
            shouldTrigger = this.evaluateCondition(currentValue, rule.condition.operator, rule.condition.threshold);
            break;
        }

        if (shouldTrigger) {
          await this.triggerAlert(rule, currentValue);
        }
      }
    } catch (error) {
      console.error('Failed to check alert conditions:', error);
    }
  }

  /**
   * 评估条件
   * @param value 当前值
   * @param operator 操作符
   * @param threshold 阈值
   * @returns 是否满足条件
   */
  private evaluateCondition(value: number, operator: string, threshold: number): boolean {
    switch (operator) {
      case 'gt': return value > threshold;
      case 'lt': return value < threshold;
      case 'eq': return value === threshold;
      case 'gte': return value >= threshold;
      case 'lte': return value <= threshold;
      default: return false;
    }
  }

  /**
   * 触发报警
   * @param rule 报警规则
   * @param currentValue 当前值
   * @returns Promise<void>
   */
  private async triggerAlert(rule: AlertRule, currentValue: number): Promise<void> {
    try {
      const alertRecord: AlertRecord = {
        id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ruleId: rule.id,
        ruleName: rule.name,
        timestamp: new Date(),
        metric: rule.condition.metric,
        value: currentValue,
        threshold: rule.condition.threshold,
        message: `${rule.name}: ${rule.condition.metric} = ${currentValue.toFixed(2)}, 阈值 = ${rule.condition.threshold}`,
        resolved: false
      };

      this.alertRecords.push(alertRecord);
      rule.lastTriggered = new Date();

      // 执行报警动作
      for (const action of rule.actions) {
        await this.executeAlertAction(action, alertRecord);
      }

      console.log(`Alert triggered: ${alertRecord.message}`);
    } catch (error) {
      console.error('Failed to trigger alert:', error);
    }
  }

  /**
   * 执行报警动作
   * @param action 报警动作
   * @param alertRecord 报警记录
   * @returns Promise<void>
   */
  private async executeAlertAction(action: { type: string; target: string }, alertRecord: AlertRecord): Promise<void> {
    try {
      switch (action.type) {
        case 'email':
          // 这里应该集成邮件服务
          console.log(`Sending email alert to ${action.target}: ${alertRecord.message}`);
          break;
        case 'webhook':
          // 这里应该发送webhook
          console.log(`Sending webhook to ${action.target}: ${alertRecord.message}`);
          break;
        case 'sms':
          // 这里应该发送短信
          console.log(`Sending SMS to ${action.target}: ${alertRecord.message}`);
          break;
      }
    } catch (error) {
      console.error(`Failed to execute alert action ${action.type}:`, error);
    }
  }

  /**
   * 清理旧记录
   * @param days 保留天数
   * @returns Promise<void>
   */
  public async cleanupOldRecords(days: number): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const initialCount = this.records.length;
      this.records = this.records.filter(record => record.timestamp >= cutoffDate);
      const removedCount = initialCount - this.records.length;

      console.log(`Cleaned up ${removedCount} old monitoring records`);
    } catch (error) {
      console.error('Failed to cleanup old records:', error);
      throw error;
    }
  }

  /**
   * 导出数据
   * @param query 查询参数
   * @param format 导出格式
   * @returns Promise<ExportData>
   */
  public async exportData(query: StatsQuery, format: 'json' | 'csv' | 'xlsx'): Promise<ExportData> {
    try {
      const records = await this.queryRecords(query);
    
    return {
      format,
      data: records.map(record => ({ ...record })),
        metadata: {
          generatedAt: new Date(),
          totalRecords: records.length,
          query
        }
      };
    } catch (error) {
      console.error('Failed to export data:', error);
      throw error;
    }
  }

  /**
   * 获取报警规则
   * @returns 报警规则数组
   */
  public getAlertRules(): AlertRule[] {
    return [...this.alertRules];
  }

  /**
   * 获取报警记录
   * @param limit 限制数量
   * @returns 报警记录数组
   */
  public getAlertRecords(limit: number = 100): AlertRecord[] {
    return this.alertRecords
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * 添加系统指标记录
   * @param metrics 系统指标
   * @returns Promise<void>
   */
  public async addSystemMetrics(metrics: SystemMetrics): Promise<void> {
    this.systemMetricsHistory.push(metrics);
    
    // 保持最近24小时的数据
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    this.systemMetricsHistory = this.systemMetricsHistory.filter(
      m => m.timestamp >= oneDayAgo
    );
  }

  /**
   * 获取系统指标历史
   * @param hours 获取最近几小时的数据
   * @returns 系统指标数组
   */
  public getSystemMetricsHistory(hours: number = 24): SystemMetrics[] {
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.systemMetricsHistory
      .filter(m => m.timestamp >= cutoffTime)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }
}

// 导出单例实例
export const monitoringService = MonitoringService.getInstance();