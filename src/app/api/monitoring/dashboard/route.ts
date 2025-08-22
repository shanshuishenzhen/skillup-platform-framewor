/**
 * API监控仪表板数据路由
 * 提供实时监控仪表板所需的聚合数据和可视化数据接口
 */

import { NextRequest, NextResponse } from 'next/server';
import { monitoringService } from '@/services/monitoringService';
import { DashboardData, StatsQuery } from '@/types/monitoring';

/**
 * GET /api/monitoring/dashboard
 * 获取仪表板数据
 * 
 * 查询参数:
 * - timeRange: 时间范围 (1h|6h|24h|7d|30d) 默认24h
 * - refresh: 是否刷新缓存 (true|false) 默认false
 * - widgets: 指定要获取的组件 (逗号分隔: overview,performance,errors,users,alerts)
 * 
 * @param request NextRequest对象
 * @returns Promise<NextResponse> 仪表板数据响应
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    
    // 解析查询参数
    const timeRange = searchParams.get('timeRange') || '24h';
    const refresh = searchParams.get('refresh') === 'true';
    const widgetsParam = searchParams.get('widgets');
    const requestedWidgets = widgetsParam ? widgetsParam.split(',') : ['overview', 'performance', 'errors', 'users', 'alerts'];

    // 验证时间范围
    const validTimeRanges = ['1h', '6h', '24h', '7d', '30d'];
    if (!validTimeRanges.includes(timeRange)) {
      return NextResponse.json(
        { error: `无效的时间范围: ${timeRange}。支持的范围: ${validTimeRanges.join(', ')}` },
        { status: 400 }
      );
    }

    // 计算时间范围
    const { startDate, endDate } = calculateTimeRange(timeRange);
    
    const query: StatsQuery = {
      startDate,
      endDate,
      groupBy: getGroupByFromTimeRange(timeRange)
    };

    // 获取仪表板数据
    const dashboardData = await monitoringService.getDashboardData(query);
    
    // 过滤请求的组件数据
    const filteredData = filterDashboardData(dashboardData, requestedWidgets);
    
    // 添加额外的实时数据
    const enhancedData = await enhanceDashboardData(filteredData, query);

    const response = {
      data: enhancedData,
      metadata: {
        timeRange,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        widgets: requestedWidgets,
        refreshed: refresh,
        generatedAt: new Date().toISOString(),
        cacheExpiry: new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5分钟缓存
      }
    };

    // 设置缓存头
    const headers = new Headers();
    if (!refresh) {
      headers.set('Cache-Control', 'public, max-age=300'); // 5分钟缓存
    }
    headers.set('X-Refresh-Interval', '30'); // 建议30秒刷新间隔

    return NextResponse.json(response, { headers });

  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json(
      { 
        error: '获取仪表板数据失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/monitoring/dashboard/realtime
 * 获取实时监控数据
 * 
 * 请求体:
 * {
 *   "metrics": string[], // 要获取的指标
 *   "interval": number, // 数据间隔（秒）
 *   "duration": number // 数据持续时间（秒）
 * }
 * 
 * @param request NextRequest对象
 * @returns Promise<NextResponse> 实时数据响应
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { metrics = ['requests', 'errors', 'responseTime'], interval = 30, duration = 300 } = body;

    // 验证参数
    if (!Array.isArray(metrics) || metrics.length === 0) {
      return NextResponse.json(
        { error: '请提供有效的指标数组' },
        { status: 400 }
      );
    }

    if (interval < 10 || interval > 300) {
      return NextResponse.json(
        { error: '数据间隔必须在10-300秒之间' },
        { status: 400 }
      );
    }

    if (duration < 60 || duration > 3600) {
      return NextResponse.json(
        { error: '数据持续时间必须在60-3600秒之间' },
        { status: 400 }
      );
    }

    // 计算时间范围
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - duration * 1000);

    // 获取实时数据
    const realtimeData = await getRealTimeMetrics(metrics, startDate, endDate, interval);

    const response = {
      data: realtimeData,
      metadata: {
        metrics,
        interval,
        duration,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        dataPoints: Math.ceil(duration / interval),
        generatedAt: new Date().toISOString()
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Realtime dashboard API error:', error);
    return NextResponse.json(
      { 
        error: '获取实时数据失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/monitoring/dashboard/config
 * 更新仪表板配置
 * 
 * 请求体:
 * {
 *   "layout": object, // 布局配置
 *   "widgets": object[], // 组件配置
 *   "preferences": object // 用户偏好
 * }
 * 
 * @param request NextRequest对象
 * @returns Promise<NextResponse> 配置更新结果
 */
export async function PUT(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { layout, widgets, preferences } = body;

    // 这里应该保存到用户配置或数据库
    // 目前返回模拟响应
    const config = {
      layout: layout || getDefaultLayout(),
      widgets: widgets || getDefaultWidgets(),
      preferences: preferences || getDefaultPreferences(),
      updatedAt: new Date().toISOString()
    };

    return NextResponse.json({
      message: '仪表板配置已更新',
      config
    });

  } catch (error) {
    console.error('Dashboard config API error:', error);
    return NextResponse.json(
      { 
        error: '更新配置失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}

/**
 * 根据时间范围计算开始和结束日期
 * @param timeRange 时间范围字符串
 * @returns 开始和结束日期对象
 */
function calculateTimeRange(timeRange: string): { startDate: Date; endDate: Date } {
  const endDate = new Date();
  let startDate: Date;

  switch (timeRange) {
    case '1h':
      startDate = new Date(endDate.getTime() - 60 * 60 * 1000);
      break;
    case '6h':
      startDate = new Date(endDate.getTime() - 6 * 60 * 60 * 1000);
      break;
    case '24h':
      startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);
      break;
    case '7d':
      startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30d':
      startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    default:
      startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);
  }

  return { startDate, endDate };
}

/**
 * 根据时间范围获取分组方式
 * @param timeRange 时间范围字符串
 * @returns 分组方式
 */
function getGroupByFromTimeRange(timeRange: string): 'hour' | 'day' | 'week' | 'month' {
  switch (timeRange) {
    case '1h':
    case '6h':
    case '24h':
      return 'hour';
    case '7d':
      return 'day';
    case '30d':
      return 'week';
    default:
      return 'hour';
  }
}

/**
 * 过滤仪表板数据，只返回请求的组件数据
 * @param dashboardData 完整的仪表板数据
 * @param requestedWidgets 请求的组件列表
 * @returns 过滤后的数据
 */
function filterDashboardData(dashboardData: DashboardData, requestedWidgets: string[]): Partial<DashboardData> {
  const filtered: Partial<DashboardData> = {};

  if (requestedWidgets.includes('overview') && dashboardData.overview) {
    filtered.overview = dashboardData.overview;
  }

  if (requestedWidgets.includes('performance') && dashboardData.performance) {
    filtered.performance = dashboardData.performance;
  }

  if (requestedWidgets.includes('errors') && dashboardData.errors) {
    filtered.errors = dashboardData.errors;
  }

  if (requestedWidgets.includes('users') && dashboardData.users) {
    filtered.users = dashboardData.users;
  }

  if (requestedWidgets.includes('alerts') && dashboardData.alerts) {
    filtered.alerts = dashboardData.alerts;
  }

  return filtered;
}

/**
 * 增强仪表板数据，添加额外的计算指标
 * @param dashboardData 基础仪表板数据
 * @param query 查询参数
 * @returns 增强后的数据
 */
async function enhanceDashboardData(dashboardData: Partial<DashboardData>, query: StatsQuery): Promise<Partial<DashboardData>> {
  const enhanced = { ...dashboardData };

  // 添加趋势分析
  if (enhanced.overview) {
    enhanced.overview.trends = await calculateTrends(query);
  }

  // 添加性能基准
  if (enhanced.performance) {
    enhanced.performance.benchmarks = await getPerformanceBenchmarks();
  }

  // 添加错误分析
  if (enhanced.errors) {
    enhanced.errors.analysis = await analyzeErrors(query);
  }

  return enhanced;
}

/**
 * 获取实时指标数据
 * @param metrics 指标列表
 * @param startDate 开始时间
 * @param endDate 结束时间
 * @param interval 数据间隔
 * @returns 实时指标数据
 */
async function getRealTimeMetrics(
  metrics: string[],
  startDate: Date,
  endDate: Date,
  interval: number
): Promise<{ timestamps: string[]; metrics: Record<string, number[]> }> {
  const dataPoints = Math.ceil((endDate.getTime() - startDate.getTime()) / (interval * 1000));
  const timestamps = [];
  const data: Record<string, number[]> = {};

  // 生成时间戳
  for (let i = 0; i < dataPoints; i++) {
    timestamps.push(new Date(startDate.getTime() + i * interval * 1000));
  }

  // 为每个指标生成数据
  for (const metric of metrics) {
    data[metric] = await getMetricData(metric, timestamps);
  }

  return {
    timestamps: timestamps.map(t => t.toISOString()),
    metrics: data
  };
}

/**
 * 获取特定指标的数据
 * @param metric 指标名称
 * @param timestamps 时间戳数组
 * @returns 指标数据数组
 */
async function getMetricData(metric: string, timestamps: Date[]): Promise<number[]> {
  // 这里应该从实际的监控服务获取数据
  // 目前返回模拟数据
  return timestamps.map(() => {
    switch (metric) {
      case 'requests':
        return Math.floor(Math.random() * 100) + 50;
      case 'errors':
        return Math.floor(Math.random() * 10);
      case 'responseTime':
        return Math.floor(Math.random() * 500) + 100;
      default:
        return Math.floor(Math.random() * 100);
    }
  });
}

/**
 * 计算趋势数据
 * @param query 查询参数
 * @returns 趋势分析结果
 */
async function calculateTrends(query: StatsQuery): Promise<Record<string, string>> {
  // 这里应该实现实际的趋势计算逻辑
  return {
    requestsTrend: 'up',
    errorsTrend: 'down',
    performanceTrend: 'stable',
    usersTrend: 'up'
  };
}

/**
 * 获取性能基准数据
 * @returns 性能基准
 */
async function getPerformanceBenchmarks(): Promise<Record<string, Record<string, number>>> {
  return {
    responseTime: {
      target: 200,
      warning: 500,
      critical: 1000
    },
    throughput: {
      target: 1000,
      warning: 500,
      critical: 100
    },
    errorRate: {
      target: 0.01,
      warning: 0.05,
      critical: 0.1
    }
  };
}

/**
 * 分析错误数据
 * @param query 查询参数
 * @returns 错误分析结果
 */
async function analyzeErrors(query: StatsQuery): Promise<{ topErrors: Array<{ type: string; count: number; percentage: number }>; errorPatterns: Array<{ pattern: string; frequency: string }> }> {
  return {
    topErrors: [
      { type: '500', count: 15, percentage: 45.5 },
      { type: '404', count: 10, percentage: 30.3 },
      { type: '401', count: 8, percentage: 24.2 }
    ],
    errorPatterns: [
      { pattern: 'Database timeout', frequency: 'high' },
      { pattern: 'Authentication failure', frequency: 'medium' }
    ]
  };
}

/**
 * 获取默认布局配置
 * @returns 默认布局
 */
function getDefaultLayout(): Record<string, unknown> {
  return {
    grid: {
      columns: 12,
      rows: 8,
      gap: 16
    },
    widgets: [
      { id: 'overview', x: 0, y: 0, w: 12, h: 2 },
      { id: 'performance', x: 0, y: 2, w: 6, h: 3 },
      { id: 'errors', x: 6, y: 2, w: 6, h: 3 },
      { id: 'users', x: 0, y: 5, w: 8, h: 3 },
      { id: 'alerts', x: 8, y: 5, w: 4, h: 3 }
    ]
  };
}

/**
 * 获取默认组件配置
 * @returns 默认组件
 */
function getDefaultWidgets(): Array<Record<string, unknown>> {
  return [
    {
      id: 'overview',
      type: 'metrics',
      title: '总览',
      config: {
        metrics: ['requests', 'errors', 'responseTime', 'users']
      }
    },
    {
      id: 'performance',
      type: 'chart',
      title: '性能监控',
      config: {
        chartType: 'line',
        metrics: ['responseTime', 'throughput']
      }
    },
    {
      id: 'errors',
      type: 'chart',
      title: '错误统计',
      config: {
        chartType: 'bar',
        metrics: ['errors']
      }
    },
    {
      id: 'users',
      type: 'table',
      title: '用户活动',
      config: {
        columns: ['user', 'requests', 'lastActivity']
      }
    },
    {
      id: 'alerts',
      type: 'list',
      title: '告警信息',
      config: {
        maxItems: 10
      }
    }
  ];
}

/**
 * 获取默认用户偏好
 * @returns 默认偏好
 */
function getDefaultPreferences(): Record<string, unknown> {
  return {
    theme: 'light',
    refreshInterval: 30,
    timezone: 'UTC',
    dateFormat: 'YYYY-MM-DD HH:mm:ss',
    notifications: {
      email: true,
      browser: true,
      slack: false
    }
  };
}