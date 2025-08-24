/**
 * 监控服务测试文件
 * 
 * 测试监控服务相关的所有功能，包括：
 * - 系统性能监控
 * - API请求监控
 * - 错误率监控
 * - 资源使用监控
 * - 实时数据收集
 * - 监控数据存储
 * - 告警机制
 * - 监控仪表板
 * - 性能指标分析
 * - 监控配置管理
 * 
 * @author AI Assistant
 * @version 1.0.0
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import {
  monitoringService,
  startMonitoring,
  stopMonitoring,
  isMonitoringActive,
  getMonitoringStatus,
  recordMetric,
  recordEvent,
  recordError,
  recordPerformance,
  recordApiCall,
  recordDatabaseQuery,
  recordCacheOperation,
  recordMemoryUsage,
  recordCpuUsage,
  recordDiskUsage,
  recordNetworkUsage,
  getMetrics,
  getMetricsByType,
  getMetricsByTimeRange,
  getAggregatedMetrics,
  getPerformanceMetrics,
  getSystemMetrics,
  getApiMetrics,
  getDatabaseMetrics,
  getCacheMetrics,
  getErrorMetrics,
  getUserMetrics,
  getBusinessMetrics,
  createAlert,
  updateAlert,
  deleteAlert,
  getAlerts,
  getActiveAlerts,
  checkAlerts,
  triggerAlert,
  resolveAlert,
  snoozeAlert,
  getAlertHistory,
  createDashboard,
  updateDashboard,
  deleteDashboard,
  getDashboards,
  getDashboardData,
  refreshDashboard,
  exportDashboard,
  importDashboard,
  createWidget,
  updateWidget,
  deleteWidget,
  getWidgets,
  getWidgetData,
  refreshWidget,
  createReport,
  generateReport,
  scheduleReport,
  getReports,
  getReportData,
  exportReport,
  deleteReport,
  setThreshold,
  getThreshold,
  updateThreshold,
  deleteThreshold,
  getThresholds,
  checkThresholds,
  createHealthCheck,
  updateHealthCheck,
  deleteHealthCheck,
  getHealthChecks,
  runHealthCheck,
  getHealthStatus,
  getSystemHealth,
  getServiceHealth,
  getDependencyHealth,
  startPerformanceProfile,
  stopPerformanceProfile,
  getPerformanceProfile,
  analyzePerformance,
  optimizePerformance,
  getPerformanceRecommendations,
  enableRealTimeMonitoring,
  disableRealTimeMonitoring,
  isRealTimeMonitoringEnabled,
  subscribeToMetrics,
  unsubscribeFromMetrics,
  getSubscriptions,
  broadcastMetrics,
  getMonitoringConfig,
  updateMonitoringConfig,
  resetMonitoringConfig,
  validateMonitoringConfig,
  exportMonitoringData,
  importMonitoringData,
  archiveMonitoringData,
  purgeMonitoringData,
  getMonitoringStats,
  getMonitoringTrends,
  getMonitoringInsights,
  createCustomMetric,
  updateCustomMetric,
  deleteCustomMetric,
  getCustomMetrics,
  recordCustomMetric,
  getCustomMetricData,
  MonitoringConfig,
  MetricType,
  AlertLevel,
  AlertStatus,
  HealthStatus,
  PerformanceProfile,
  DashboardConfig,
  WidgetConfig,
  ReportConfig,
  ThresholdConfig,
  HealthCheckConfig,
  CustomMetricConfig,
  MonitoringStats,
  MonitoringTrends,
  MonitoringInsights
} from '../../services/monitoringService';
import { envConfig } from '../../config/envConfig';
import { errorHandler } from '../../utils/errorHandler';
import { validator } from '../../utils/validator';

// Mock 外部依赖
jest.mock('../../config/envConfig');
jest.mock('../../utils/errorHandler');
jest.mock('../../utils/validator');
jest.mock('redis');
jest.mock('ws');
jest.mock('node-cron');
jest.mock('os');
jest.mock('fs');
jest.mock('path');

// 类型化的 Mock 对象
const mockEnvConfig = envConfig as jest.Mocked<typeof envConfig>;
const mockErrorHandler = errorHandler as jest.Mocked<typeof errorHandler>;
const mockValidator = validator as jest.Mocked<typeof validator>;

// Mock Node.js 模块
const mockRedis = {
  createClient: jest.fn().mockReturnValue({
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    set: jest.fn().mockResolvedValue('OK'),
    get: jest.fn().mockResolvedValue(null),
    del: jest.fn().mockResolvedValue(1),
    exists: jest.fn().mockResolvedValue(1),
    expire: jest.fn().mockResolvedValue(1),
    keys: jest.fn().mockResolvedValue([]),
    hset: jest.fn().mockResolvedValue(1),
    hget: jest.fn().mockResolvedValue(null),
    hgetall: jest.fn().mockResolvedValue({}),
    zadd: jest.fn().mockResolvedValue(1),
    zrange: jest.fn().mockResolvedValue([]),
    zrangebyscore: jest.fn().mockResolvedValue([]),
    incr: jest.fn().mockResolvedValue(1),
    incrby: jest.fn().mockResolvedValue(1)
  })
};

const mockWebSocket = {
  Server: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    emit: jest.fn(),
    close: jest.fn(),
    clients: new Set()
  }))
};

const mockCron = {
  schedule: jest.fn().mockReturnValue({
    start: jest.fn(),
    stop: jest.fn(),
    destroy: jest.fn()
  })
};

const mockOs = {
  cpus: jest.fn().mockReturnValue([{ model: 'Intel', speed: 2400 }]),
  totalmem: jest.fn().mockReturnValue(8589934592), // 8GB
  freemem: jest.fn().mockReturnValue(4294967296), // 4GB
  loadavg: jest.fn().mockReturnValue([0.5, 0.6, 0.7]),
  uptime: jest.fn().mockReturnValue(3600),
  platform: jest.fn().mockReturnValue('linux'),
  arch: jest.fn().mockReturnValue('x64'),
  hostname: jest.fn().mockReturnValue('test-server')
};

const mockFs = {
  writeFileSync: jest.fn(),
  readFileSync: jest.fn().mockReturnValue('{}'),
  existsSync: jest.fn().mockReturnValue(true),
  mkdirSync: jest.fn(),
  statSync: jest.fn().mockReturnValue({ size: 1024 })
};

const mockPath = {
  join: jest.fn().mockImplementation((...args) => args.join('/')),
  resolve: jest.fn().mockImplementation((...args) => args.join('/')),
  dirname: jest.fn().mockReturnValue('/monitoring')
};

/**
 * 监控服务测试套件
 */
describe('监控服务测试', () => {
  // 测试数据
  const mockMetric = {
    name: 'api_response_time',
    value: 150,
    type: 'gauge' as MetricType,
    tags: { endpoint: '/api/users', method: 'GET' },
    timestamp: new Date()
  };

  const mockAlert = {
    id: 'alert-123',
    name: 'High Response Time',
    description: 'API response time is too high',
    metric: 'api_response_time',
    threshold: 200,
    level: 'warning' as AlertLevel,
    status: 'active' as AlertStatus,
    enabled: true
  };

  const mockDashboard = {
    id: 'dashboard-123',
    name: 'System Overview',
    description: 'Main system monitoring dashboard',
    widgets: ['widget-1', 'widget-2'],
    layout: { rows: 2, cols: 2 },
    refreshInterval: 30000
  };

  const mockWidget = {
    id: 'widget-123',
    name: 'Response Time Chart',
    type: 'line-chart',
    metric: 'api_response_time',
    config: { timeRange: '1h', aggregation: 'avg' },
    position: { x: 0, y: 0, width: 6, height: 4 }
  };

  /**
   * 测试前置设置
   */
  beforeEach(() => {
    // 重置所有 Mock
    jest.clearAllMocks();

    // 设置环境配置 Mock
    mockEnvConfig.getMonitoringConfig = jest.fn().mockReturnValue({
      enabled: true,
      interval: 5000,
      retention: '7d',
      realTime: true,
      alerts: true,
      dashboards: true,
      reports: true
    });

    mockEnvConfig.getRedisConfig = jest.fn().mockReturnValue({
      host: 'localhost',
      port: 6379,
      password: '',
      db: 0
    });

    mockEnvConfig.isProduction = jest.fn().mockReturnValue(false);
    mockEnvConfig.isDevelopment = jest.fn().mockReturnValue(true);

    // 设置错误处理器 Mock
    mockErrorHandler.handleError = jest.fn().mockResolvedValue({ handled: true });
    mockErrorHandler.logError = jest.fn().mockResolvedValue(undefined);

    // 设置验证器 Mock
    mockValidator.validateObject = jest.fn().mockReturnValue({ isValid: true, errors: [] });
    mockValidator.isString = jest.fn().mockReturnValue(true);
    mockValidator.isNumber = jest.fn().mockReturnValue(true);
    mockValidator.isObject = jest.fn().mockReturnValue(true);

    // Mock 外部库
    jest.doMock('redis', () => mockRedis);
    jest.doMock('ws', () => mockWebSocket);
    jest.doMock('node-cron', () => mockCron);
    jest.doMock('os', () => mockOs);
    jest.doMock('fs', () => mockFs);
    jest.doMock('path', () => mockPath);
  });

  /**
   * 测试后置清理
   */
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('监控服务初始化', () => {
    it('应该启动监控服务', async () => {
      const result = await startMonitoring();
      
      expect(result.success).toBe(true);
      expect(isMonitoringActive()).toBe(true);
    });

    it('应该停止监控服务', async () => {
      await startMonitoring();
      const result = await stopMonitoring();
      
      expect(result.success).toBe(true);
      expect(isMonitoringActive()).toBe(false);
    });

    it('应该获取监控状态', () => {
      const status = getMonitoringStatus();
      
      expect(status).toEqual(
        expect.objectContaining({
          active: expect.any(Boolean),
          uptime: expect.any(Number),
          metricsCount: expect.any(Number),
          alertsCount: expect.any(Number)
        })
      );
    });

    it('应该处理启动失败', async () => {
      mockRedis.createClient.mockImplementation(() => {
        throw new Error('Redis connection failed');
      });
      
      const result = await startMonitoring();
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('指标记录', () => {
    beforeEach(async () => {
      await startMonitoring();
    });

    it('应该记录基础指标', async () => {
      const result = await recordMetric(mockMetric);
      
      expect(result.success).toBe(true);
      expect(result.metricId).toBeDefined();
    });

    it('应该记录事件', async () => {
      const event = {
        name: 'user_login',
        data: { userId: 'user-123', ip: '192.168.1.1' },
        timestamp: new Date()
      };
      
      const result = await recordEvent(event);
      
      expect(result.success).toBe(true);
      expect(result.eventId).toBeDefined();
    });

    it('应该记录错误', async () => {
      const error = {
        message: 'Database connection failed',
        stack: 'Error stack trace',
        type: 'DatabaseError',
        severity: 'high'
      };
      
      const result = await recordError(error);
      
      expect(result.success).toBe(true);
      expect(result.errorId).toBeDefined();
    });

    it('应该记录性能指标', async () => {
      const performance = {
        operation: 'database_query',
        duration: 150,
        memory: 1024,
        cpu: 25.5,
        timestamp: new Date()
      };
      
      const result = await recordPerformance(performance);
      
      expect(result.success).toBe(true);
      expect(result.performanceId).toBeDefined();
    });

    it('应该记录API调用', async () => {
      const apiCall = {
        method: 'GET',
        url: '/api/users',
        statusCode: 200,
        responseTime: 120,
        requestSize: 0,
        responseSize: 1024,
        userAgent: 'Mozilla/5.0',
        ip: '192.168.1.1'
      };
      
      const result = await recordApiCall(apiCall);
      
      expect(result.success).toBe(true);
      expect(result.callId).toBeDefined();
    });

    it('应该记录数据库查询', async () => {
      const dbQuery = {
        query: 'SELECT * FROM users WHERE id = ?',
        duration: 50,
        rows: 1,
        database: 'main',
        table: 'users',
        operation: 'SELECT'
      };
      
      const result = await recordDatabaseQuery(dbQuery);
      
      expect(result.success).toBe(true);
      expect(result.queryId).toBeDefined();
    });

    it('应该记录缓存操作', async () => {
      const cacheOp = {
        operation: 'get',
        key: 'user:123',
        hit: true,
        duration: 5,
        size: 256
      };
      
      const result = await recordCacheOperation(cacheOp);
      
      expect(result.success).toBe(true);
      expect(result.operationId).toBeDefined();
    });

    it('应该记录系统资源使用', async () => {
      await recordMemoryUsage();
      await recordCpuUsage();
      await recordDiskUsage();
      await recordNetworkUsage();
      
      const metrics = await getSystemMetrics();
      
      expect(metrics.memory).toBeDefined();
      expect(metrics.cpu).toBeDefined();
      expect(metrics.disk).toBeDefined();
      expect(metrics.network).toBeDefined();
    });
  });

  describe('指标查询', () => {
    beforeEach(async () => {
      await startMonitoring();
      await recordMetric(mockMetric);
    });

    it('应该获取所有指标', async () => {
      const metrics = await getMetrics();
      
      expect(Array.isArray(metrics)).toBe(true);
      expect(metrics.length).toBeGreaterThan(0);
    });

    it('应该按类型获取指标', async () => {
      const metrics = await getMetricsByType('gauge');
      
      expect(Array.isArray(metrics)).toBe(true);
      expect(metrics.every(m => m.type === 'gauge')).toBe(true);
    });

    it('应该按时间范围获取指标', async () => {
      const startTime = new Date(Date.now() - 3600000); // 1小时前
      const endTime = new Date();
      
      const metrics = await getMetricsByTimeRange(startTime, endTime);
      
      expect(Array.isArray(metrics)).toBe(true);
      expect(metrics.every(m => 
        m.timestamp >= startTime && m.timestamp <= endTime
      )).toBe(true);
    });

    it('应该获取聚合指标', async () => {
      const aggregated = await getAggregatedMetrics({
        metric: 'api_response_time',
        aggregation: 'avg',
        interval: '5m',
        timeRange: '1h'
      });
      
      expect(aggregated).toEqual(
        expect.objectContaining({
          metric: 'api_response_time',
          aggregation: 'avg',
          data: expect.any(Array)
        })
      );
    });

    it('应该获取性能指标', async () => {
      const performance = await getPerformanceMetrics();
      
      expect(performance).toEqual(
        expect.objectContaining({
          responseTime: expect.any(Object),
          throughput: expect.any(Object),
          errorRate: expect.any(Object)
        })
      );
    });

    it('应该获取API指标', async () => {
      const apiMetrics = await getApiMetrics();
      
      expect(apiMetrics).toEqual(
        expect.objectContaining({
          totalRequests: expect.any(Number),
          averageResponseTime: expect.any(Number),
          errorRate: expect.any(Number),
          topEndpoints: expect.any(Array)
        })
      );
    });

    it('应该获取数据库指标', async () => {
      const dbMetrics = await getDatabaseMetrics();
      
      expect(dbMetrics).toEqual(
        expect.objectContaining({
          totalQueries: expect.any(Number),
          averageQueryTime: expect.any(Number),
          slowQueries: expect.any(Array),
          connectionPool: expect.any(Object)
        })
      );
    });

    it('应该获取缓存指标', async () => {
      const cacheMetrics = await getCacheMetrics();
      
      expect(cacheMetrics).toEqual(
        expect.objectContaining({
          hitRate: expect.any(Number),
          missRate: expect.any(Number),
          totalOperations: expect.any(Number),
          averageResponseTime: expect.any(Number)
        })
      );
    });

    it('应该获取错误指标', async () => {
      const errorMetrics = await getErrorMetrics();
      
      expect(errorMetrics).toEqual(
        expect.objectContaining({
          totalErrors: expect.any(Number),
          errorRate: expect.any(Number),
          errorsByType: expect.any(Object),
          recentErrors: expect.any(Array)
        })
      );
    });
  });

  describe('告警管理', () => {
    beforeEach(async () => {
      await startMonitoring();
    });

    it('应该创建告警', async () => {
      const result = await createAlert(mockAlert);
      
      expect(result.success).toBe(true);
      expect(result.alertId).toBeDefined();
    });

    it('应该更新告警', async () => {
      const { alertId } = await createAlert(mockAlert);
      const updates = { threshold: 300, level: 'critical' as AlertLevel };
      
      const result = await updateAlert(alertId, updates);
      
      expect(result.success).toBe(true);
    });

    it('应该删除告警', async () => {
      const { alertId } = await createAlert(mockAlert);
      
      const result = await deleteAlert(alertId);
      
      expect(result.success).toBe(true);
    });

    it('应该获取所有告警', async () => {
      await createAlert(mockAlert);
      
      const alerts = await getAlerts();
      
      expect(Array.isArray(alerts)).toBe(true);
      expect(alerts.length).toBeGreaterThan(0);
    });

    it('应该获取活跃告警', async () => {
      await createAlert(mockAlert);
      
      const activeAlerts = await getActiveAlerts();
      
      expect(Array.isArray(activeAlerts)).toBe(true);
    });

    it('应该检查告警条件', async () => {
      await createAlert(mockAlert);
      await recordMetric({ ...mockMetric, value: 250 }); // 超过阈值
      
      const result = await checkAlerts();
      
      expect(result.triggered).toBeGreaterThan(0);
    });

    it('应该触发告警', async () => {
      const { alertId } = await createAlert(mockAlert);
      
      const result = await triggerAlert(alertId, {
        value: 250,
        message: 'Response time exceeded threshold'
      });
      
      expect(result.success).toBe(true);
    });

    it('应该解决告警', async () => {
      const { alertId } = await createAlert(mockAlert);
      await triggerAlert(alertId, { value: 250 });
      
      const result = await resolveAlert(alertId, 'Issue resolved');
      
      expect(result.success).toBe(true);
    });

    it('应该暂停告警', async () => {
      const { alertId } = await createAlert(mockAlert);
      
      const result = await snoozeAlert(alertId, 3600000); // 1小时
      
      expect(result.success).toBe(true);
    });

    it('应该获取告警历史', async () => {
      const { alertId } = await createAlert(mockAlert);
      
      const history = await getAlertHistory(alertId);
      
      expect(Array.isArray(history)).toBe(true);
    });
  });

  describe('仪表板管理', () => {
    beforeEach(async () => {
      await startMonitoring();
    });

    it('应该创建仪表板', async () => {
      const result = await createDashboard(mockDashboard);
      
      expect(result.success).toBe(true);
      expect(result.dashboardId).toBeDefined();
    });

    it('应该更新仪表板', async () => {
      const { dashboardId } = await createDashboard(mockDashboard);
      const updates = { name: 'Updated Dashboard', refreshInterval: 60000 };
      
      const result = await updateDashboard(dashboardId, updates);
      
      expect(result.success).toBe(true);
    });

    it('应该删除仪表板', async () => {
      const { dashboardId } = await createDashboard(mockDashboard);
      
      const result = await deleteDashboard(dashboardId);
      
      expect(result.success).toBe(true);
    });

    it('应该获取所有仪表板', async () => {
      await createDashboard(mockDashboard);
      
      const dashboards = await getDashboards();
      
      expect(Array.isArray(dashboards)).toBe(true);
      expect(dashboards.length).toBeGreaterThan(0);
    });

    it('应该获取仪表板数据', async () => {
      const { dashboardId } = await createDashboard(mockDashboard);
      
      const data = await getDashboardData(dashboardId);
      
      expect(data).toEqual(
        expect.objectContaining({
          dashboard: expect.any(Object),
          widgets: expect.any(Array),
          data: expect.any(Object)
        })
      );
    });

    it('应该刷新仪表板', async () => {
      const { dashboardId } = await createDashboard(mockDashboard);
      
      const result = await refreshDashboard(dashboardId);
      
      expect(result.success).toBe(true);
      expect(result.lastRefresh).toBeDefined();
    });

    it('应该导出仪表板', async () => {
      const { dashboardId } = await createDashboard(mockDashboard);
      
      const exported = await exportDashboard(dashboardId);
      
      expect(exported).toEqual(
        expect.objectContaining({
          dashboard: expect.any(Object),
          widgets: expect.any(Array),
          version: expect.any(String)
        })
      );
    });

    it('应该导入仪表板', async () => {
      const dashboardData = {
        dashboard: mockDashboard,
        widgets: [mockWidget],
        version: '1.0.0'
      };
      
      const result = await importDashboard(dashboardData);
      
      expect(result.success).toBe(true);
      expect(result.dashboardId).toBeDefined();
    });
  });

  describe('组件管理', () => {
    beforeEach(async () => {
      await startMonitoring();
    });

    it('应该创建组件', async () => {
      const result = await createWidget(mockWidget);
      
      expect(result.success).toBe(true);
      expect(result.widgetId).toBeDefined();
    });

    it('应该更新组件', async () => {
      const { widgetId } = await createWidget(mockWidget);
      const updates = { name: 'Updated Widget', type: 'bar-chart' };
      
      const result = await updateWidget(widgetId, updates);
      
      expect(result.success).toBe(true);
    });

    it('应该删除组件', async () => {
      const { widgetId } = await createWidget(mockWidget);
      
      const result = await deleteWidget(widgetId);
      
      expect(result.success).toBe(true);
    });

    it('应该获取所有组件', async () => {
      await createWidget(mockWidget);
      
      const widgets = await getWidgets();
      
      expect(Array.isArray(widgets)).toBe(true);
      expect(widgets.length).toBeGreaterThan(0);
    });

    it('应该获取组件数据', async () => {
      const { widgetId } = await createWidget(mockWidget);
      
      const data = await getWidgetData(widgetId);
      
      expect(data).toEqual(
        expect.objectContaining({
          widget: expect.any(Object),
          data: expect.any(Array),
          lastUpdate: expect.any(Date)
        })
      );
    });

    it('应该刷新组件', async () => {
      const { widgetId } = await createWidget(mockWidget);
      
      const result = await refreshWidget(widgetId);
      
      expect(result.success).toBe(true);
      expect(result.lastRefresh).toBeDefined();
    });
  });

  describe('报告管理', () => {
    beforeEach(async () => {
      await startMonitoring();
    });

    it('应该创建报告', async () => {
      const report = {
        name: 'Daily Performance Report',
        description: 'Daily system performance summary',
        metrics: ['api_response_time', 'error_rate'],
        schedule: '0 9 * * *', // 每天9点
        format: 'pdf',
        recipients: ['admin@example.com']
      };
      
      const result = await createReport(report);
      
      expect(result.success).toBe(true);
      expect(result.reportId).toBeDefined();
    });

    it('应该生成报告', async () => {
      const reportConfig = {
        metrics: ['api_response_time', 'error_rate'],
        timeRange: '24h',
        format: 'json'
      };
      
      const report = await generateReport(reportConfig);
      
      expect(report).toEqual(
        expect.objectContaining({
          title: expect.any(String),
          period: expect.any(Object),
          summary: expect.any(Object),
          metrics: expect.any(Array),
          generatedAt: expect.any(Date)
        })
      );
    });

    it('应该调度报告', async () => {
      const reportConfig = {
        name: 'Weekly Report',
        schedule: '0 9 * * 1', // 每周一9点
        metrics: ['api_response_time']
      };
      
      const result = await scheduleReport(reportConfig);
      
      expect(result.success).toBe(true);
      expect(result.scheduleId).toBeDefined();
    });

    it('应该获取所有报告', async () => {
      const reports = await getReports();
      
      expect(Array.isArray(reports)).toBe(true);
    });

    it('应该导出报告', async () => {
      const reportData = {
        metrics: ['api_response_time'],
        timeRange: '1h'
      };
      
      const exported = await exportReport(reportData, 'csv');
      
      expect(typeof exported).toBe('string');
      expect(exported.length).toBeGreaterThan(0);
    });
  });

  describe('阈值管理', () => {
    beforeEach(async () => {
      await startMonitoring();
    });

    it('应该设置阈值', async () => {
      const threshold = {
        metric: 'api_response_time',
        warning: 200,
        critical: 500,
        operator: 'gt'
      };
      
      const result = await setThreshold('api_response_time', threshold);
      
      expect(result.success).toBe(true);
    });

    it('应该获取阈值', async () => {
      const threshold = {
        metric: 'api_response_time',
        warning: 200,
        critical: 500,
        operator: 'gt'
      };
      
      await setThreshold('api_response_time', threshold);
      const retrieved = await getThreshold('api_response_time');
      
      expect(retrieved).toEqual(expect.objectContaining(threshold));
    });

    it('应该更新阈值', async () => {
      await setThreshold('api_response_time', { warning: 200, critical: 500 });
      
      const result = await updateThreshold('api_response_time', { warning: 150 });
      
      expect(result.success).toBe(true);
    });

    it('应该删除阈值', async () => {
      await setThreshold('api_response_time', { warning: 200, critical: 500 });
      
      const result = await deleteThreshold('api_response_time');
      
      expect(result.success).toBe(true);
    });

    it('应该获取所有阈值', async () => {
      await setThreshold('api_response_time', { warning: 200, critical: 500 });
      
      const thresholds = await getThresholds();
      
      expect(Array.isArray(thresholds)).toBe(true);
      expect(thresholds.length).toBeGreaterThan(0);
    });

    it('应该检查阈值', async () => {
      await setThreshold('api_response_time', { warning: 200, critical: 500 });
      
      const result = await checkThresholds({
        metric: 'api_response_time',
        value: 250
      });
      
      expect(result.exceeded).toBe(true);
      expect(result.level).toBe('warning');
    });
  });

  describe('健康检查', () => {
    beforeEach(async () => {
      await startMonitoring();
    });

    it('应该创建健康检查', async () => {
      const healthCheck = {
        name: 'Database Health',
        type: 'database',
        endpoint: 'postgresql://localhost:5432/app',
        interval: 30000,
        timeout: 5000,
        retries: 3
      };
      
      const result = await createHealthCheck(healthCheck);
      
      expect(result.success).toBe(true);
      expect(result.healthCheckId).toBeDefined();
    });

    it('应该运行健康检查', async () => {
      const healthCheck = {
        name: 'API Health',
        type: 'http',
        endpoint: 'http://localhost:3000/health'
      };
      
      const { healthCheckId } = await createHealthCheck(healthCheck);
      const result = await runHealthCheck(healthCheckId);
      
      expect(result).toEqual(
        expect.objectContaining({
          status: expect.any(String),
          responseTime: expect.any(Number),
          timestamp: expect.any(Date)
        })
      );
    });

    it('应该获取健康状态', async () => {
      const status = await getHealthStatus();
      
      expect(status).toEqual(
        expect.objectContaining({
          overall: expect.any(String),
          services: expect.any(Object),
          dependencies: expect.any(Object),
          lastCheck: expect.any(Date)
        })
      );
    });

    it('应该获取系统健康状态', async () => {
      const systemHealth = await getSystemHealth();
      
      expect(systemHealth).toEqual(
        expect.objectContaining({
          cpu: expect.any(Object),
          memory: expect.any(Object),
          disk: expect.any(Object),
          network: expect.any(Object)
        })
      );
    });

    it('应该获取服务健康状态', async () => {
      const serviceHealth = await getServiceHealth();
      
      expect(serviceHealth).toEqual(
        expect.objectContaining({
          api: expect.any(Object),
          database: expect.any(Object),
          cache: expect.any(Object),
          queue: expect.any(Object)
        })
      );
    });

    it('应该获取依赖健康状态', async () => {
      const dependencyHealth = await getDependencyHealth();
      
      expect(dependencyHealth).toEqual(
        expect.objectContaining({
          external: expect.any(Object),
          internal: expect.any(Object)
        })
      );
    });
  });

  describe('性能分析', () => {
    beforeEach(async () => {
      await startMonitoring();
    });

    it('应该启动性能分析', async () => {
      const result = await startPerformanceProfile({
        duration: 60000,
        metrics: ['cpu', 'memory', 'io']
      });
      
      expect(result.success).toBe(true);
      expect(result.profileId).toBeDefined();
    });

    it('应该停止性能分析', async () => {
      const { profileId } = await startPerformanceProfile({ duration: 60000 });
      
      const result = await stopPerformanceProfile(profileId);
      
      expect(result.success).toBe(true);
    });

    it('应该获取性能分析结果', async () => {
      const { profileId } = await startPerformanceProfile({ duration: 1000 });
      
      // 等待分析完成
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      const profile = await getPerformanceProfile(profileId);
      
      expect(profile).toEqual(
        expect.objectContaining({
          id: profileId,
          status: expect.any(String),
          metrics: expect.any(Object),
          duration: expect.any(Number)
        })
      );
    });

    it('应该分析性能数据', async () => {
      const analysis = await analyzePerformance({
        timeRange: '1h',
        metrics: ['api_response_time', 'cpu_usage']
      });
      
      expect(analysis).toEqual(
        expect.objectContaining({
          summary: expect.any(Object),
          trends: expect.any(Array),
          anomalies: expect.any(Array),
          recommendations: expect.any(Array)
        })
      );
    });

    it('应该获取性能优化建议', async () => {
      const recommendations = await getPerformanceRecommendations();
      
      expect(Array.isArray(recommendations)).toBe(true);
      expect(recommendations.every(r => 
        r.type && r.description && r.priority
      )).toBe(true);
    });
  });

  describe('实时监控', () => {
    beforeEach(async () => {
      await startMonitoring();
    });

    it('应该启用实时监控', async () => {
      const result = await enableRealTimeMonitoring();
      
      expect(result.success).toBe(true);
      expect(isRealTimeMonitoringEnabled()).toBe(true);
    });

    it('应该禁用实时监控', async () => {
      await enableRealTimeMonitoring();
      
      const result = await disableRealTimeMonitoring();
      
      expect(result.success).toBe(true);
      expect(isRealTimeMonitoringEnabled()).toBe(false);
    });

    it('应该订阅指标', async () => {
      await enableRealTimeMonitoring();
      
      const subscription = await subscribeToMetrics({
        metrics: ['api_response_time', 'error_rate'],
        callback: jest.fn()
      });
      
      expect(subscription.success).toBe(true);
      expect(subscription.subscriptionId).toBeDefined();
    });

    it('应该取消订阅指标', async () => {
      await enableRealTimeMonitoring();
      const { subscriptionId } = await subscribeToMetrics({
        metrics: ['api_response_time'],
        callback: jest.fn()
      });
      
      const result = await unsubscribeFromMetrics(subscriptionId);
      
      expect(result.success).toBe(true);
    });

    it('应该获取订阅列表', async () => {
      await enableRealTimeMonitoring();
      await subscribeToMetrics({
        metrics: ['api_response_time'],
        callback: jest.fn()
      });
      
      const subscriptions = await getSubscriptions();
      
      expect(Array.isArray(subscriptions)).toBe(true);
      expect(subscriptions.length).toBeGreaterThan(0);
    });

    it('应该广播指标', async () => {
      await enableRealTimeMonitoring();
      
      const result = await broadcastMetrics({
        metric: 'api_response_time',
        value: 150,
        timestamp: new Date()
      });
      
      expect(result.success).toBe(true);
      expect(result.subscribers).toBeGreaterThanOrEqual(0);
    });
  });

  describe('配置管理', () => {
    it('应该获取监控配置', () => {
      const config = getMonitoringConfig();
      
      expect(config).toEqual(
        expect.objectContaining({
          enabled: expect.any(Boolean),
          interval: expect.any(Number),
          retention: expect.any(String),
          realTime: expect.any(Boolean)
        })
      );
    });

    it('应该更新监控配置', async () => {
      const updates = {
        interval: 10000,
        retention: '14d',
        realTime: false
      };
      
      const result = await updateMonitoringConfig(updates);
      
      expect(result.success).toBe(true);
    });

    it('应该重置监控配置', async () => {
      await updateMonitoringConfig({ interval: 10000 });
      
      const result = await resetMonitoringConfig();
      
      expect(result.success).toBe(true);
      
      const config = getMonitoringConfig();
      expect(config.interval).toBe(5000); // 默认值
    });

    it('应该验证监控配置', () => {
      const validConfig = {
        enabled: true,
        interval: 5000,
        retention: '7d'
      };
      
      const invalidConfig = {
        enabled: 'yes', // 应该是布尔值
        interval: -1000, // 应该是正数
        retention: 'invalid' // 应该是有效的时间格式
      };
      
      expect(validateMonitoringConfig(validConfig).isValid).toBe(true);
      expect(validateMonitoringConfig(invalidConfig).isValid).toBe(false);
    });
  });

  describe('数据管理', () => {
    beforeEach(async () => {
      await startMonitoring();
      await recordMetric(mockMetric);
    });

    it('应该导出监控数据', async () => {
      const exported = await exportMonitoringData({
        format: 'json',
        timeRange: '1h',
        metrics: ['api_response_time']
      });
      
      expect(exported).toBeDefined();
      expect(typeof exported).toBe('string');
    });

    it('应该导入监控数据', async () => {
      const data = JSON.stringify({
        metrics: [mockMetric],
        version: '1.0.0'
      });
      
      const result = await importMonitoringData(data);
      
      expect(result.success).toBe(true);
      expect(result.imported).toBeGreaterThan(0);
    });

    it('应该归档监控数据', async () => {
      const result = await archiveMonitoringData({
        olderThan: '30d',
        compress: true
      });
      
      expect(result.success).toBe(true);
      expect(result.archived).toBeGreaterThanOrEqual(0);
    });

    it('应该清除监控数据', async () => {
      const result = await purgeMonitoringData({
        olderThan: '90d'
      });
      
      expect(result.success).toBe(true);
      expect(result.purged).toBeGreaterThanOrEqual(0);
    });
  });

  describe('统计和分析', () => {
    beforeEach(async () => {
      await startMonitoring();
      // 生成一些测试数据
      for (let i = 0; i < 10; i++) {
        await recordMetric({ ...mockMetric, value: 100 + i * 10 });
      }
    });

    it('应该获取监控统计', async () => {
      const stats = await getMonitoringStats();
      
      expect(stats).toEqual(
        expect.objectContaining({
          totalMetrics: expect.any(Number),
          activeAlerts: expect.any(Number),
          healthChecks: expect.any(Number),
          uptime: expect.any(Number)
        })
      );
    });

    it('应该获取监控趋势', async () => {
      const trends = await getMonitoringTrends({
        metric: 'api_response_time',
        period: '1h'
      });
      
      expect(trends).toEqual(
        expect.objectContaining({
          metric: 'api_response_time',
          period: '1h',
          trend: expect.any(String),
          data: expect.any(Array)
        })
      );
    });

    it('应该获取监控洞察', async () => {
      const insights = await getMonitoringInsights();
      
      expect(insights).toEqual(
        expect.objectContaining({
          summary: expect.any(Object),
          anomalies: expect.any(Array),
          recommendations: expect.any(Array),
          predictions: expect.any(Array)
        })
      );
    });
  });

  describe('自定义指标', () => {
    beforeEach(async () => {
      await startMonitoring();
    });

    it('应该创建自定义指标', async () => {
      const customMetric = {
        name: 'business_metric',
        description: 'Custom business metric',
        type: 'counter' as MetricType,
        unit: 'count',
        tags: ['business', 'custom']
      };
      
      const result = await createCustomMetric(customMetric);
      
      expect(result.success).toBe(true);
      expect(result.metricId).toBeDefined();
    });

    it('应该更新自定义指标', async () => {
      const customMetric = {
        name: 'business_metric',
        description: 'Custom business metric',
        type: 'counter' as MetricType
      };
      
      const { metricId } = await createCustomMetric(customMetric);
      const updates = { description: 'Updated description' };
      
      const result = await updateCustomMetric(metricId, updates);
      
      expect(result.success).toBe(true);
    });

    it('应该删除自定义指标', async () => {
      const customMetric = {
        name: 'business_metric',
        type: 'counter' as MetricType
      };
      
      const { metricId } = await createCustomMetric(customMetric);
      
      const result = await deleteCustomMetric(metricId);
      
      expect(result.success).toBe(true);
    });

    it('应该获取自定义指标', async () => {
      const customMetric = {
        name: 'business_metric',
        type: 'counter' as MetricType
      };
      
      await createCustomMetric(customMetric);
      
      const metrics = await getCustomMetrics();
      
      expect(Array.isArray(metrics)).toBe(true);
      expect(metrics.length).toBeGreaterThan(0);
    });

    it('应该记录自定义指标数据', async () => {
      const customMetric = {
        name: 'business_metric',
        type: 'counter' as MetricType
      };
      
      const { metricId } = await createCustomMetric(customMetric);
      
      const result = await recordCustomMetric(metricId, {
        value: 42,
        tags: { category: 'sales' }
      });
      
      expect(result.success).toBe(true);
    });

    it('应该获取自定义指标数据', async () => {
      const customMetric = {
        name: 'business_metric',
        type: 'counter' as MetricType
      };
      
      const { metricId } = await createCustomMetric(customMetric);
      await recordCustomMetric(metricId, { value: 42 });
      
      const data = await getCustomMetricData(metricId, {
        timeRange: '1h'
      });
      
      expect(Array.isArray(data)).toBe(true);
    });
  });

  describe('错误处理', () => {
    beforeEach(async () => {
      await startMonitoring();
    });

    it('应该处理Redis连接错误', async () => {
      mockRedis.createClient.mockImplementation(() => {
        throw new Error('Redis connection failed');
      });
      
      const result = await recordMetric(mockMetric);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('应该处理无效的指标数据', async () => {
      const invalidMetric = {
        name: '', // 空名称
        value: 'invalid', // 无效值
        type: 'invalid_type' // 无效类型
      };
      
      interface InvalidMetricData {
        name: string;
        value: string;
        type: string;
      }
      
      const result = await recordMetric(invalidMetric as InvalidMetricData);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('应该处理告警创建错误', async () => {
      const invalidAlert = {
        name: '', // 空名称
        threshold: 'invalid' // 无效阈值
      };
      
      interface InvalidAlertData {
        name: string;
        threshold: string;
      }
      
      const result = await createAlert(invalidAlert as InvalidAlertData);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('应该处理仪表板创建错误', async () => {
      const invalidDashboard = {
        name: '', // 空名称
        widgets: 'invalid' // 无效组件列表
      };
      
      interface InvalidDashboardData {
        name: string;
        widgets: string;
      }
      
      const result = await createDashboard(invalidDashboard as InvalidDashboardData);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('性能测试', () => {
    beforeEach(async () => {
      await startMonitoring();
    });

    it('应该快速记录大量指标', async () => {
      const metrics = Array.from({ length: 1000 }, (_, i) => ({
        ...mockMetric,
        name: `metric_${i}`,
        value: i
      }));
      
      const startTime = Date.now();
      
      const promises = metrics.map(metric => recordMetric(metric));
      await Promise.all(promises);
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(5000); // 应该在5秒内完成
    });

    it('应该高效查询指标数据', async () => {
      // 先记录一些数据
      for (let i = 0; i < 100; i++) {
        await recordMetric({ ...mockMetric, value: i });
      }
      
      const startTime = Date.now();
      
      await getMetrics();
      await getMetricsByType('gauge');
      await getAggregatedMetrics({ metric: 'api_response_time', aggregation: 'avg' });
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(1000); // 应该在1秒内完成
    });

    it('应该优化内存使用', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // 记录大量数据
      for (let i = 0; i < 1000; i++) {
        await recordMetric({ ...mockMetric, value: i });
      }
      
      // 强制垃圾回收（如果可用）
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // 内存增长应该在合理范围内（小于50MB）
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });
  });
});

/**
 * 监控服务便捷函数导出测试
 */
describe('监控服务便捷函数', () => {
  it('应该导出所有监控管理函数', () => {
    expect(typeof startMonitoring).toBe('function');
    expect(typeof stopMonitoring).toBe('function');
    expect(typeof isMonitoringActive).toBe('function');
    expect(typeof getMonitoringStatus).toBe('function');
  });

  it('应该导出所有指标记录函数', () => {
    expect(typeof recordMetric).toBe('function');
    expect(typeof recordEvent).toBe('function');
    expect(typeof recordError).toBe('function');
    expect(typeof recordPerformance).toBe('function');
    expect(typeof recordApiCall).toBe('function');
    expect(typeof recordDatabaseQuery).toBe('function');
    expect(typeof recordCacheOperation).toBe('function');
  });

  it('应该导出所有系统监控函数', () => {
    expect(typeof recordMemoryUsage).toBe('function');
    expect(typeof recordCpuUsage).toBe('function');
    expect(typeof recordDiskUsage).toBe('function');
    expect(typeof recordNetworkUsage).toBe('function');
  });

  it('应该导出所有指标查询函数', () => {
    expect(typeof getMetrics).toBe('function');
    expect(typeof getMetricsByType).toBe('function');
    expect(typeof getMetricsByTimeRange).toBe('function');
    expect(typeof getAggregatedMetrics).toBe('function');
    expect(typeof getPerformanceMetrics).toBe('function');
    expect(typeof getSystemMetrics).toBe('function');
    expect(typeof getApiMetrics).toBe('function');
    expect(typeof getDatabaseMetrics).toBe('function');
    expect(typeof getCacheMetrics).toBe('function');
    expect(typeof getErrorMetrics).toBe('function');
  });

  it('应该导出所有告警管理函数', () => {
    expect(typeof createAlert).toBe('function');
    expect(typeof updateAlert).toBe('function');
    expect(typeof deleteAlert).toBe('function');
    expect(typeof getAlerts).toBe('function');
    expect(typeof getActiveAlerts).toBe('function');
    expect(typeof checkAlerts).toBe('function');
    expect(typeof triggerAlert).toBe('function');
    expect(typeof resolveAlert).toBe('function');
    expect(typeof snoozeAlert).toBe('function');
    expect(typeof getAlertHistory).toBe('function');
  });

  it('应该导出所有仪表板管理函数', () => {
    expect(typeof createDashboard).toBe('function');
    expect(typeof updateDashboard).toBe('function');
    expect(typeof deleteDashboard).toBe('function');
    expect(typeof getDashboards).toBe('function');
    expect(typeof getDashboardData).toBe('function');
    expect(typeof refreshDashboard).toBe('function');
    expect(typeof exportDashboard).toBe('function');
    expect(typeof importDashboard).toBe('function');
  });

  it('应该导出所有组件管理函数', () => {
    expect(typeof createWidget).toBe('function');
    expect(typeof updateWidget).toBe('function');
    expect(typeof deleteWidget).toBe('function');
    expect(typeof getWidgets).toBe('function');
    expect(typeof getWidgetData).toBe('function');
    expect(typeof refreshWidget).toBe('function');
  });

  it('应该导出所有报告管理函数', () => {
    expect(typeof createReport).toBe('function');
    expect(typeof generateReport).toBe('function');
    expect(typeof scheduleReport).toBe('function');
    expect(typeof getReports).toBe('function');
    expect(typeof getReportData).toBe('function');
    expect(typeof exportReport).toBe('function');
    expect(typeof deleteReport).toBe('function');
  });

  it('应该导出所有阈值管理函数', () => {
    expect(typeof setThreshold).toBe('function');
    expect(typeof getThreshold).toBe('function');
    expect(typeof updateThreshold).toBe('function');
    expect(typeof deleteThreshold).toBe('function');
    expect(typeof getThresholds).toBe('function');
    expect(typeof checkThresholds).toBe('function');
  });

  it('应该导出所有健康检查函数', () => {
    expect(typeof createHealthCheck).toBe('function');
    expect(typeof updateHealthCheck).toBe('function');
    expect(typeof deleteHealthCheck).toBe('function');
    expect(typeof getHealthChecks).toBe('function');
    expect(typeof runHealthCheck).toBe('function');
    expect(typeof getHealthStatus).toBe('function');
    expect(typeof getSystemHealth).toBe('function');
    expect(typeof getServiceHealth).toBe('function');
    expect(typeof getDependencyHealth).toBe('function');
  });

  it('应该导出所有性能分析函数', () => {
    expect(typeof startPerformanceProfile).toBe('function');
    expect(typeof stopPerformanceProfile).toBe('function');
    expect(typeof getPerformanceProfile).toBe('function');
    expect(typeof analyzePerformance).toBe('function');
    expect(typeof optimizePerformance).toBe('function');
    expect(typeof getPerformanceRecommendations).toBe('function');
  });

  it('应该导出所有实时监控函数', () => {
    expect(typeof enableRealTimeMonitoring).toBe('function');
    expect(typeof disableRealTimeMonitoring).toBe('function');
    expect(typeof isRealTimeMonitoringEnabled).toBe('function');
    expect(typeof subscribeToMetrics).toBe('function');
    expect(typeof unsubscribeFromMetrics).toBe('function');
    expect(typeof getSubscriptions).toBe('function');
    expect(typeof broadcastMetrics).toBe('function');
  });

  it('应该导出所有配置管理函数', () => {
    expect(typeof getMonitoringConfig).toBe('function');
    expect(typeof updateMonitoringConfig).toBe('function');
    expect(typeof resetMonitoringConfig).toBe('function');
    expect(typeof validateMonitoringConfig).toBe('function');
  });

  it('应该导出所有数据管理函数', () => {
    expect(typeof exportMonitoringData).toBe('function');
    expect(typeof importMonitoringData).toBe('function');
    expect(typeof archiveMonitoringData).toBe('function');
    expect(typeof purgeMonitoringData).toBe('function');
  });

  it('应该导出所有统计分析函数', () => {
    expect(typeof getMonitoringStats).toBe('function');
    expect(typeof getMonitoringTrends).toBe('function');
    expect(typeof getMonitoringInsights).toBe('function');
  });

  it('应该导出所有自定义指标函数', () => {
    expect(typeof createCustomMetric).toBe('function');
    expect(typeof updateCustomMetric).toBe('function');
    expect(typeof deleteCustomMetric).toBe('function');
    expect(typeof getCustomMetrics).toBe('function');
    expect(typeof recordCustomMetric).toBe('function');
    expect(typeof getCustomMetricData).toBe('function');
  });

  it('应该导出所有类型定义', () => {
    expect(typeof MonitoringConfig).toBe('function');
    expect(typeof MetricType).toBe('object');
    expect(typeof AlertLevel).toBe('object');
    expect(typeof AlertStatus).toBe('object');
    expect(typeof HealthStatus).toBe('object');
    expect(typeof PerformanceProfile).toBe('function');
    expect(typeof DashboardConfig).toBe('function');
    expect(typeof WidgetConfig).toBe('function');
    expect(typeof ReportConfig).toBe('function');
    expect(typeof ThresholdConfig).toBe('function');
    expect(typeof HealthCheckConfig).toBe('function');
    expect(typeof CustomMetricConfig).toBe('function');
    expect(typeof MonitoringStats).toBe('function');
    expect(typeof MonitoringTrends).toBe('function');
    expect(typeof MonitoringInsights).toBe('function');
  });

  it('应该导出监控服务实例', () => {
    expect(monitoringService).toBeDefined();
    expect(typeof monitoringService).toBe('object');
  });
});