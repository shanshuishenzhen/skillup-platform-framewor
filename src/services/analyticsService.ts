/**
 * 分析服务
 * 
 * 提供数据分析功能，包括：
 * - 学习行为分析
 * - 用户活动统计
 * - 性能指标监控
 * - 业务数据分析
 * - 趋势预测分析
 * - 实时数据处理
 * - 报表生成
 * - 数据可视化
 */

import { logger } from '../utils/logger';
import { createServerClient } from '../utils/supabase';
import { getEnvConfig } from '../utils/envConfig';
import { cacheService } from './cacheService';

// 类型定义
export type MetricType = 'counter' | 'gauge' | 'histogram' | 'summary';
export type AggregationType = 'sum' | 'avg' | 'min' | 'max' | 'count';
export type TimeRange = '1h' | '24h' | '7d' | '30d' | '90d' | '1y';

export interface AnalyticsConfig {
  enableAnalytics: boolean;
  batchSize: number;
  flushInterval: number;
  retentionDays: number;
  enableRealTime: boolean;
  enablePrediction: boolean;
  sampleRate: number;
}

export interface MetricData {
  name: string;
  type: MetricType;
  value: number;
  timestamp?: Date;
  tags?: Record<string, string>;
  metadata?: Record<string, unknown>;
}

export interface EventData {
  event: string;
  userId?: string;
  sessionId?: string;
  properties?: Record<string, unknown>;
  timestamp?: Date;
}

export interface AnalyticsQuery {
  metrics?: string[];
  events?: string[];
  startDate?: Date;
  endDate?: Date;
  userId?: string;
  sessionId?: string;
  aggregation?: AggregationType;
  groupBy?: string[];
  filters?: Record<string, unknown>;
  limit?: number;
  offset?: number;
}

export interface AnalyticsResult {
  metrics: Record<string, number>;
  events: EventData[];
  aggregations: Record<string, unknown>;
  trends: Record<string, unknown>;
  insights: string[];
}

export interface DashboardData {
  overview: {
    totalUsers: number;
    activeUsers: number;
    totalSessions: number;
    avgSessionDuration: number;
    bounceRate: number;
  };
  userMetrics: {
    newUsers: number;
    returningUsers: number;
    userGrowth: number;
    retention: Record<string, number>;
  };
  contentMetrics: {
    totalViews: number;
    uniqueViews: number;
    avgViewDuration: number;
    popularContent: Array<{ id: string; title: string; views: number }>;
  };
  performanceMetrics: {
    avgLoadTime: number;
    errorRate: number;
    apiResponseTime: number;
    uptime: number;
  };
}

export interface LearningAnalytics {
  courseProgress: Record<string, number>;
  completionRates: Record<string, number>;
  learningPaths: Array<{
    pathId: string;
    completionRate: number;
    avgDuration: number;
    dropoffPoints: string[];
  }>;
  skillDevelopment: Record<string, {
    level: number;
    progress: number;
    timeSpent: number;
  }>;
  assessmentResults: {
    avgScore: number;
    passRate: number;
    difficultyDistribution: Record<string, number>;
  };
}

export interface UserBehaviorAnalytics {
  sessionData: {
    avgDuration: number;
    pagesPerSession: number;
    bounceRate: number;
  };
  navigationPatterns: Array<{
    path: string;
    frequency: number;
    exitRate: number;
  }>;
  featureUsage: Record<string, {
    usage: number;
    adoption: number;
    satisfaction: number;
  }>;
  timePatterns: {
    hourly: Record<string, number>;
    daily: Record<string, number>;
    weekly: Record<string, number>;
  };
}

export interface PredictionResult {
  metric: string;
  predictions: Array<{
    date: Date;
    value: number;
    confidence: number;
  }>;
  accuracy: number;
  model: string;
}

/**
 * 分析服务类
 */
export class AnalyticsService {
  private config: AnalyticsConfig;
  private metricBuffer: MetricData[] = [];
  private eventBuffer: EventData[] = [];
  private flushTimer: NodeJS.Timeout | null = null;

  constructor(config?: Partial<AnalyticsConfig>) {
    const envConfig = getEnvConfig();
    this.config = {
      enableAnalytics: envConfig?.analytics?.enabled || true,
      batchSize: envConfig?.analytics?.batchSize || 100,
      flushInterval: envConfig?.analytics?.flushInterval || 5000,
      retentionDays: envConfig?.analytics?.retentionDays || 365,
      enableRealTime: true,
      enablePrediction: false,
      sampleRate: 1.0,
      ...config
    };

    // 测试环境中禁用定时器
    if (process.env.NODE_ENV !== 'test') {
      this.startFlushTimer();
    }
  }

  /**
   * 记录指标数据
   */
  async track(event: string, properties?: Record<string, unknown>, userId?: string): Promise<void> {
    try {
      if (!this.config.enableAnalytics) {
        return;
      }

      // 采样检查
      if (Math.random() > this.config.sampleRate) {
        return;
      }

      const eventData: EventData = {
        event,
        userId,
        properties,
        timestamp: new Date()
      };

      this.eventBuffer.push(eventData);

      // 检查是否需要立即刷新
      if (this.eventBuffer.length >= this.config.batchSize) {
        await this.flush();
      }
    } catch (error) {
      logger.error('Failed to track event', { error: error instanceof Error ? error.message : String(error) });
    }
  }

  /**
   * 记录指标
   */
  async recordMetric(metric: MetricData): Promise<void> {
    try {
      if (!this.config.enableAnalytics) {
        return;
      }

      const metricData: MetricData = {
        ...metric,
        timestamp: metric.timestamp || new Date()
      };

      this.metricBuffer.push(metricData);

      // 检查是否需要立即刷新
      if (this.metricBuffer.length >= this.config.batchSize) {
        await this.flush();
      }
    } catch (error) {
      logger.error('Failed to record metric', { error: error instanceof Error ? error.message : String(error) });
    }
  }

  /**
   * 查询分析数据
   */
  async query(query: AnalyticsQuery): Promise<AnalyticsResult> {
    try {
      const cacheKey = `analytics:query:${JSON.stringify(query)}`;
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        return cached as AnalyticsResult;
      }

      const supabase = createServerClient();
      let metricsQuery = supabase
        .from('analytics_metrics')
        .select('*');

      let eventsQuery = supabase
        .from('analytics_events')
        .select('*');

      // 应用时间范围过滤
      if (query.startDate) {
        metricsQuery = metricsQuery.gte('timestamp', query.startDate.toISOString());
        eventsQuery = eventsQuery.gte('timestamp', query.startDate.toISOString());
      }
      if (query.endDate) {
        metricsQuery = metricsQuery.lte('timestamp', query.endDate.toISOString());
        eventsQuery = eventsQuery.lte('timestamp', query.endDate.toISOString());
      }

      // 应用用户过滤
      if (query.userId) {
        eventsQuery = eventsQuery.eq('user_id', query.userId);
      }

      // 应用指标过滤
      if (query.metrics && query.metrics.length > 0) {
        metricsQuery = metricsQuery.in('name', query.metrics);
      }

      // 应用事件过滤
      if (query.events && query.events.length > 0) {
        eventsQuery = eventsQuery.in('event', query.events);
      }

      // 执行查询
      const [metricsResult, eventsResult] = await Promise.all([
        metricsQuery,
        eventsQuery
      ]);

      if (metricsResult.error) {
        logger.error('Failed to query metrics', { error: metricsResult.error });
      }
      if (eventsResult.error) {
        logger.error('Failed to query events', { error: eventsResult.error });
      }

      const metrics = metricsResult.data || [];
      const events = eventsResult.data || [];

      // 处理聚合
      const aggregations = this.processAggregations(metrics, query.aggregation, query.groupBy);
      
      // 计算趋势
      const trends = this.calculateTrends(metrics, events);
      
      // 生成洞察
      const insights = this.generateInsights(metrics, events, trends);

      const result: AnalyticsResult = {
        metrics: this.processMetrics(metrics),
        events,
        aggregations,
        trends,
        insights
      };

      // 缓存结果
      await cacheService.set(cacheKey, result, { ttl: 300 });

      return result;
    } catch (error) {
      logger.error('Failed to query analytics data', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  /**
   * 获取仪表板数据
   */
  async getDashboardData(timeRange: TimeRange = '24h'): Promise<DashboardData> {
    try {
      const cacheKey = `analytics:dashboard:${timeRange}`;
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        return cached as DashboardData;
      }

      const endDate = new Date();
      const startDate = this.getStartDate(endDate, timeRange);

      // 查询各种指标
      const [userStats, sessionStats, contentStats, performanceStats] = await Promise.all([
        this.getUserStats(startDate, endDate),
        this.getSessionStats(startDate, endDate),
        this.getContentStats(startDate, endDate),
        this.getPerformanceStats(startDate, endDate)
      ]);

      const dashboardData: DashboardData = {
        overview: {
          totalUsers: userStats.total,
          activeUsers: userStats.active,
          totalSessions: sessionStats.total,
          avgSessionDuration: sessionStats.avgDuration,
          bounceRate: sessionStats.bounceRate
        },
        userMetrics: {
          newUsers: userStats.new,
          returningUsers: userStats.returning,
          userGrowth: userStats.growth,
          retention: userStats.retention
        },
        contentMetrics: {
          totalViews: contentStats.totalViews,
          uniqueViews: contentStats.uniqueViews,
          avgViewDuration: contentStats.avgDuration,
          popularContent: contentStats.popular
        },
        performanceMetrics: {
          avgLoadTime: performanceStats.loadTime,
          errorRate: performanceStats.errorRate,
          apiResponseTime: performanceStats.apiTime,
          uptime: performanceStats.uptime
        }
      };

      // 缓存结果
      await cacheService.set(cacheKey, dashboardData, { ttl: 300 });

      return dashboardData;
    } catch (error) {
      logger.error('Failed to get dashboard data', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  /**
   * 获取学习分析数据
   */
  async getLearningAnalytics(userId?: string, timeRange: TimeRange = '30d'): Promise<LearningAnalytics> {
    try {
      const cacheKey = `analytics:learning:${userId || 'all'}:${timeRange}`;
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        return cached as LearningAnalytics;
      }

      const endDate = new Date();
      const startDate = this.getStartDate(endDate, timeRange);

      const supabase = createServerClient();
      let query = supabase
        .from('learning_analytics')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query;

      if (error) {
        logger.error('Failed to get learning analytics', { error });
        throw error;
      }

      const analytics = this.processLearningData(data || []);

      // 缓存结果
      await cacheService.set(cacheKey, analytics, { ttl: 600 });

      return analytics;
    } catch (error) {
      logger.error('Failed to get learning analytics', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  /**
   * 获取用户行为分析
   */
  async getUserBehaviorAnalytics(userId?: string, timeRange: TimeRange = '7d'): Promise<UserBehaviorAnalytics> {
    try {
      const cacheKey = `analytics:behavior:${userId || 'all'}:${timeRange}`;
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        return cached as UserBehaviorAnalytics;
      }

      const endDate = new Date();
      const startDate = this.getStartDate(endDate, timeRange);

      const supabase = createServerClient();
      let query = supabase
        .from('user_behavior')
        .select('*')
        .gte('timestamp', startDate.toISOString())
        .lte('timestamp', endDate.toISOString());

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query;

      if (error) {
        logger.error('Failed to get user behavior analytics', { error });
        throw error;
      }

      const analytics = this.processBehaviorData(data || []);

      // 缓存结果
      await cacheService.set(cacheKey, analytics, { ttl: 600 });

      return analytics;
    } catch (error) {
      logger.error('Failed to get user behavior analytics', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  /**
   * 生成预测分析
   */
  async generatePrediction(metric: string, timeRange: TimeRange = '30d'): Promise<PredictionResult> {
    try {
      if (!this.config.enablePrediction) {
        throw new Error('Prediction is disabled');
      }

      const cacheKey = `analytics:prediction:${metric}:${timeRange}`;
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        return cached as PredictionResult;
      }

      // 获取历史数据
      const endDate = new Date();
      const startDate = this.getStartDate(endDate, timeRange);

      const supabase = createServerClient();
      const { data, error } = await supabase
        .from('analytics_metrics')
        .select('*')
        .eq('name', metric)
        .gte('timestamp', startDate.toISOString())
        .lte('timestamp', endDate.toISOString())
        .order('timestamp', { ascending: true });

      if (error) {
        logger.error('Failed to get historical data for prediction', { error });
        throw error;
      }

      // 简单的线性回归预测
      const predictions = this.performLinearRegression(data || []);

      const result: PredictionResult = {
        metric,
        predictions,
        accuracy: 0.85, // 模拟准确度
        model: 'linear_regression'
      };

      // 缓存结果
      await cacheService.set(cacheKey, result, { ttl: 3600 });

      return result;
    } catch (error) {
      logger.error('Failed to generate prediction', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  /**
   * 导出分析数据
   */
  async exportData(query: AnalyticsQuery, format: 'json' | 'csv' = 'json'): Promise<{
    format: string;
    filename: string;
    data: string;
    size: number;
  }> {
    try {
      const result = await this.query(query);
      
      let data: string;
      let filename: string;

      switch (format) {
        case 'csv':
          data = this.convertToCSV(result);
          filename = `analytics_${Date.now()}.csv`;
          break;
        case 'json':
        default:
          data = JSON.stringify(result, null, 2);
          filename = `analytics_${Date.now()}.json`;
          break;
      }

      return {
        format,
        filename,
        data,
        size: Buffer.byteLength(data, 'utf8')
      };
    } catch (error) {
      logger.error('Failed to export analytics data', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  /**
   * 聚合数据
   */
  async aggregateData(query: AnalyticsQuery): Promise<Record<string, unknown>> {
    try {
      const result = await this.query(query);
      return result.aggregations;
    } catch (error) {
      logger.error('Failed to aggregate data', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  /**
   * 刷新缓冲区数据
   */
  private async flush(): Promise<void> {
    if (this.metricBuffer.length === 0 && this.eventBuffer.length === 0) {
      return;
    }

    try {
      const metrics = [...this.metricBuffer];
      const events = [...this.eventBuffer];
      
      this.metricBuffer = [];
      this.eventBuffer = [];

      const supabase = createServerClient();

      // 保存指标数据
      if (metrics.length > 0) {
        const { error: metricsError } = await supabase
          .from('analytics_metrics')
          .insert(metrics.map(metric => ({
            name: metric.name,
            type: metric.type,
            value: metric.value,
            timestamp: metric.timestamp,
            tags: metric.tags,
            metadata: metric.metadata
          })));

        if (metricsError) {
          logger.error('Failed to save metrics', { error: metricsError });
          // 重新添加到缓冲区
          this.metricBuffer.unshift(...metrics);
        }
      }

      // 保存事件数据
      if (events.length > 0) {
        const { error: eventsError } = await supabase
          .from('analytics_events')
          .insert(events.map(event => ({
            event: event.event,
            user_id: event.userId,
            session_id: event.sessionId,
            properties: event.properties,
            timestamp: event.timestamp
          })));

        if (eventsError) {
          logger.error('Failed to save events', { error: eventsError });
          // 重新添加到缓冲区
          this.eventBuffer.unshift(...events);
        }
      }
    } catch (error) {
      logger.error('Failed to flush analytics data', { error: error instanceof Error ? error.message : String(error) });
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
   * 处理聚合
   */
  private processAggregations(
    metrics: MetricData[], 
    aggregation?: AggregationType, 
    groupBy?: string[]
  ): Record<string, number> {
    const result: Record<string, number> = {};
    
    if (!aggregation) {
      return result;
    }

    // 简单聚合实现
    const grouped = groupBy ? this.groupBy(metrics, groupBy) : { all: metrics };
    
    for (const [key, values] of Object.entries(grouped)) {
      switch (aggregation) {
        case 'sum':
          result[key] = values.reduce((sum: number, item: MetricData) => sum + (item.value || 0), 0);
          break;
        case 'avg':
          result[key] = values.length > 0 ? 
            values.reduce((sum: number, item: MetricData) => sum + (item.value || 0), 0) / values.length : 0;
          break;
        case 'min':
          result[key] = Math.min(...values.map((item: MetricData) => item.value || 0));
          break;
        case 'max':
          result[key] = Math.max(...values.map((item: MetricData) => item.value || 0));
          break;
        case 'count':
          result[key] = values.length;
          break;
      }
    }

    return result;
  }

  /**
   * 分组数据
   */
  private groupBy(data: MetricData[], keys: string[]): Record<string, MetricData[]> {
    return data.reduce((groups, item) => {
      const key = keys.map(k => (item as any)[k]).join('_');
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(item);
      return groups;
    }, {} as Record<string, MetricData[]>);
  }

  /**
   * 处理指标数据
   */
  private processMetrics(metrics: MetricData[]): Record<string, number> {
    const result: Record<string, number> = {};
    
    for (const metric of metrics) {
      if (!result[metric.name]) {
        result[metric.name] = 0;
      }
      result[metric.name] += metric.value || 0;
    }

    return result;
  }

  /**
   * 计算趋势
   */
  private calculateTrends(metrics: MetricData[], events: EventData[]): {
    metricsGrowth: number;
    eventsGrowth: number;
    seasonality: Record<string, number>;
  } {
    // 简单趋势计算实现
    return {
      metricsGrowth: this.calculateGrowthRate(metrics),
      eventsGrowth: this.calculateEventGrowthRate(events),
      seasonality: this.detectSeasonality(metrics)
    };
  }

  /**
   * 计算增长率
   */
  private calculateGrowthRate(data: MetricData[]): number {
    if (data.length < 2) return 0;
    
    const sorted = data.sort((a, b) => new Date(a.timestamp || new Date()).getTime() - new Date(b.timestamp || new Date()).getTime());
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    
    if (!first.value || !last.value) return 0;
    
    return ((last.value - first.value) / first.value) * 100;
  }

  /**
   * 计算事件增长率
   */
  private calculateEventGrowthRate(data: EventData[]): number {
    if (data.length < 2) return 0;
    
    // 按时间排序
    const sorted = data.sort((a, b) => new Date(a.timestamp || new Date()).getTime() - new Date(b.timestamp || new Date()).getTime());
    
    // 计算时间段内的事件数量变化
    const midPoint = Math.floor(sorted.length / 2);
    const firstHalf = sorted.slice(0, midPoint).length;
    const secondHalf = sorted.slice(midPoint).length;
    
    if (firstHalf === 0) return 0;
    
    return ((secondHalf - firstHalf) / firstHalf) * 100;
  }

  /**
   * 检测季节性
   */
  private detectSeasonality(data: MetricData[]): Record<string, number> {
    // 简单的季节性检测
    const hourly: Record<string, number> = {};
    
    for (const item of data) {
      const hour = new Date(item.timestamp || new Date()).getHours();
      hourly[hour] = (hourly[hour] || 0) + (item.value || 0);
    }
    
    return hourly;
  }

  /**
   * 生成洞察
   */
  private generateInsights(metrics: MetricData[], events: EventData[], trends: {
    metricsGrowth: number;
    eventsGrowth: number;
    seasonality: Record<string, number>;
  }): string[] {
    const insights: string[] = [];
    
    // 基于数据生成简单洞察
    if (trends.metricsGrowth > 10) {
      insights.push('指标显示正向增长趋势');
    }
    
    if (events.length > 1000) {
      insights.push('用户活跃度较高');
    }
    
    if (metrics.length === 0) {
      insights.push('缺少指标数据，建议增加数据收集');
    }
    
    return insights;
  }

  /**
   * 获取开始日期
   */
  private getStartDate(endDate: Date, timeRange: TimeRange): Date {
    const start = new Date(endDate);
    
    switch (timeRange) {
      case '1h':
        start.setHours(start.getHours() - 1);
        break;
      case '24h':
        start.setDate(start.getDate() - 1);
        break;
      case '7d':
        start.setDate(start.getDate() - 7);
        break;
      case '30d':
        start.setDate(start.getDate() - 30);
        break;
      case '90d':
        start.setDate(start.getDate() - 90);
        break;
      case '1y':
        start.setFullYear(start.getFullYear() - 1);
        break;
    }
    
    return start;
  }

  /**
   * 获取用户统计
   */
  private async getUserStats(startDate: Date, endDate: Date): Promise<{
    total: number;
    active: number;
    new: number;
    returning: number;
    growth: number;
    retention: Record<string, number>;
  }> {
    // 模拟用户统计数据
    return {
      total: 1000,
      active: 750,
      new: 50,
      returning: 700,
      growth: 5.2,
      retention: {
        '1d': 0.8,
        '7d': 0.6,
        '30d': 0.4
      }
    };
  }

  /**
   * 获取会话统计
   */
  private async getSessionStats(startDate: Date, endDate: Date): Promise<{
    total: number;
    avgDuration: number;
    bounceRate: number;
  }> {
    // 模拟会话统计数据
    return {
      total: 2500,
      avgDuration: 1800, // 30分钟
      bounceRate: 0.25
    };
  }

  /**
   * 获取内容统计
   */
  private async getContentStats(startDate: Date, endDate: Date): Promise<{
    totalViews: number;
    uniqueViews: number;
    avgDuration: number;
    popular: Array<{ id: string; title: string; views: number }>;
  }> {
    // 模拟内容统计数据
    return {
      totalViews: 15000,
      uniqueViews: 8000,
      avgDuration: 300, // 5分钟
      popular: [
        { id: '1', title: 'JavaScript基础', views: 1200 },
        { id: '2', title: 'React入门', views: 980 },
        { id: '3', title: 'Node.js实战', views: 850 }
      ]
    };
  }

  /**
   * 获取性能统计
   */
  private async getPerformanceStats(startDate: Date, endDate: Date): Promise<{
    loadTime: number;
    errorRate: number;
    apiTime: number;
    uptime: number;
  }> {
    // 模拟性能统计数据
    return {
      loadTime: 1.2, // 1.2秒
      errorRate: 0.02, // 2%
      apiTime: 200, // 200ms
      uptime: 0.999 // 99.9%
    };
  }

  /**
   * 处理学习数据
   */
  private processLearningData(data: EventData[]): LearningAnalytics {
    // 模拟学习分析数据处理
    return {
      courseProgress: {
        'course1': 0.75,
        'course2': 0.45,
        'course3': 0.90
      },
      completionRates: {
        'course1': 0.85,
        'course2': 0.65,
        'course3': 0.92
      },
      learningPaths: [
        {
          pathId: 'path1',
          completionRate: 0.78,
          avgDuration: 7200, // 2小时
          dropoffPoints: ['module3', 'module7']
        }
      ],
      skillDevelopment: {
        'javascript': {
          level: 3,
          progress: 0.65,
          timeSpent: 14400 // 4小时
        }
      },
      assessmentResults: {
        avgScore: 82.5,
        passRate: 0.88,
        difficultyDistribution: {
          'easy': 0.3,
          'medium': 0.5,
          'hard': 0.2
        }
      }
    };
  }

  /**
   * 处理行为数据
   */
  private processBehaviorData(data: EventData[]): UserBehaviorAnalytics {
    // 模拟用户行为分析数据处理
    return {
      sessionData: {
        avgDuration: 1800,
        pagesPerSession: 5.2,
        bounceRate: 0.25
      },
      navigationPatterns: [
        {
          path: '/dashboard -> /courses',
          frequency: 450,
          exitRate: 0.15
        },
        {
          path: '/courses -> /lessons',
          frequency: 380,
          exitRate: 0.08
        }
      ],
      featureUsage: {
        'video_player': {
          usage: 0.85,
          adoption: 0.92,
          satisfaction: 4.2
        },
        'quiz_system': {
          usage: 0.68,
          adoption: 0.75,
          satisfaction: 3.9
        }
      },
      timePatterns: {
        hourly: {
          '9': 120,
          '10': 180,
          '14': 200,
          '20': 150
        },
        daily: {
          'monday': 800,
          'tuesday': 750,
          'wednesday': 820
        },
        weekly: {
          'week1': 3500,
          'week2': 3800,
          'week3': 3200
        }
      }
    };
  }

  /**
   * 执行线性回归预测
   */
  private performLinearRegression(data: MetricData[]): Array<{
    date: Date;
    value: number;
    confidence: number;
  }> {
    // 简单的线性回归实现
    const predictions: Array<{ date: Date; value: number; confidence: number }> = [];
    
    if (data.length < 2) {
      return predictions;
    }

    // 计算趋势
    const sorted = data.sort((a, b) => new Date(a.timestamp || new Date()).getTime() - new Date(b.timestamp || new Date()).getTime());
    const firstValue = sorted[0].value || 0;
    const lastValue = sorted[sorted.length - 1].value || 0;
    const timeSpan = new Date(sorted[sorted.length - 1].timestamp || new Date()).getTime() - new Date(sorted[0].timestamp || new Date()).getTime();
    const slope = (lastValue - firstValue) / timeSpan;

    // 生成未来7天的预测
    const lastDate = new Date(sorted[sorted.length - 1].timestamp || new Date());
    for (let i = 1; i <= 7; i++) {
      const futureDate = new Date(lastDate.getTime() + i * 24 * 60 * 60 * 1000);
      const predictedValue = lastValue + slope * (i * 24 * 60 * 60 * 1000);
      
      predictions.push({
        date: futureDate,
        value: Math.max(0, predictedValue), // 确保预测值不为负
        confidence: Math.max(0.5, 1 - i * 0.1) // 随时间降低置信度
      });
    }

    return predictions;
  }

  /**
   * 转换为CSV格式
   */
  private convertToCSV(result: AnalyticsResult): string {
    const lines: string[] = [];
    
    // 添加指标数据
    lines.push('Type,Name,Value');
    for (const [name, value] of Object.entries(result.metrics)) {
      lines.push(`Metric,${name},${value}`);
    }
    
    // 添加事件数据
    for (const event of result.events) {
      lines.push(`Event,${event.event},${JSON.stringify(event.properties || {})}`);
    }
    
    return lines.join('\n');
  }

  /**
   * 关闭服务
   */
  async close(): Promise<void> {
    this.stopFlushTimer();
    await this.flush();
    logger.info('Analytics service closed');
  }
}

// 单例实例
let analyticsServiceInstance: AnalyticsService | null = null;

/**
 * 创建分析服务实例
 */
export function createAnalyticsService(config?: Partial<AnalyticsConfig>): AnalyticsService {
  return new AnalyticsService(config);
}

/**
 * 获取分析服务单例
 */
export function getAnalyticsService(): AnalyticsService {
  if (!analyticsServiceInstance) {
    analyticsServiceInstance = new AnalyticsService();
  }
  return analyticsServiceInstance;
}

// 默认导出
export const analyticsService = getAnalyticsService();
export default analyticsService;