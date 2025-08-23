/**
 * API监控服务测试文件
 * 
 * 测试API监控相关的所有功能，包括：
 * - API请求监控
 * - 响应时间统计
 * - 错误率监控
 * - 流量分析
 * - 性能指标收集
 * - 实时监控
 * - 告警机制
 * - 统计报告
 * - 监控配置
 * - 数据存储和查询
 * 
 * @author AI Assistant
 * @version 1.0.0
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import {
  apiMonitor,
  startApiMonitoring,
  stopApiMonitoring,
  isApiMonitoringActive,
  getApiMonitoringStatus,
  recordApiRequest,
  recordApiResponse,
  recordApiError,
  getApiMetrics,
  getEndpointMetrics,
  getMethodMetrics,
  getStatusCodeMetrics,
  getResponseTimeMetrics,
  getErrorRateMetrics,
  getThroughputMetrics,
  getTopEndpoints,
  getSlowEndpoints,
  getErrorEndpoints,
  getApiTrends,
  getApiInsights,
  createApiAlert,
  updateApiAlert,
  deleteApiAlert,
  getApiAlerts,
  checkApiAlerts,
  triggerApiAlert,
  resolveApiAlert,
  getApiAlertHistory,
  setApiThreshold,
  getApiThreshold,
  updateApiThreshold,
  deleteApiThreshold,
  getApiThresholds,
  checkApiThresholds,
  createApiReport,
  generateApiReport,
  scheduleApiReport,
  getApiReports,
  exportApiReport,
  deleteApiReport,
  enableRealTimeApiMonitoring,
  disableRealTimeApiMonitoring,
  isRealTimeApiMonitoringEnabled,
  subscribeToApiMetrics,
  unsubscribeFromApiMetrics,
  getApiSubscriptions,
  broadcastApiMetrics,
  getApiConfig,
  updateApiConfig,
  resetApiConfig,
  validateApiConfig,
  exportApiData,
  importApiData,
  archiveApiData,
  purgeApiData,
  getApiStats,
  analyzeApiPerformance,
  optimizeApiPerformance,
  getApiRecommendations,
  createCustomApiMetric,
  updateCustomApiMetric,
  deleteCustomApiMetric,
  getCustomApiMetrics,
  recordCustomApiMetric,
  getCustomApiMetricData,
  ApiMetric,
  ApiRequest,
  ApiResponse,
  ApiError,
  ApiAlert,
  ApiThreshold,
  ApiReport,
  ApiConfig,
  ApiStats,
  ApiTrends,
  ApiInsights,
  CustomApiMetric
} from '../../services/apiMonitor';
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

// 类型化的 Mock 对象
const mockEnvConfig = envConfig as jest.Mocked<typeof envConfig>;
const mockErrorHandler = errorHandler as jest.Mocked<typeof errorHandler>;
const mockValidator = validator as jest.Mocked<typeof validator>;

// Mock Redis 客户端
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
    incrby: jest.fn().mockResolvedValue(1),
    lpush: jest.fn().mockResolvedValue(1),
    lrange: jest.fn().mockResolvedValue([]),
    ltrim: jest.fn().mockResolvedValue('OK')
  })
};

// Mock WebSocket
const mockWebSocket = {
  Server: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    emit: jest.fn(),
    close: jest.fn(),
    clients: new Set()
  }))
};

// Mock Cron
const mockCron = {
  schedule: jest.fn().mockReturnValue({
    start: jest.fn(),
    stop: jest.fn(),
    destroy: jest.fn()
  })
};

/**
 * API监控服务测试套件
 */
describe('API监控服务测试', () => {
  // 测试数据
  const mockApiRequest: ApiRequest = {
    id: 'req-123',
    method: 'GET',
    url: '/api/users',
    path: '/api/users',
    query: { page: '1', limit: '10' },
    headers: {
      'user-agent': 'Mozilla/5.0',
      'content-type': 'application/json'
    },
    body: null,
    ip: '192.168.1.1',
    userAgent: 'Mozilla/5.0',
    timestamp: new Date(),
    userId: 'user-123',
    sessionId: 'session-123'
  };

  const mockApiResponse: ApiResponse = {
    id: 'res-123',
    requestId: 'req-123',
    statusCode: 200,
    statusMessage: 'OK',
    headers: {
      'content-type': 'application/json',
      'content-length': '1024'
    },
    body: { users: [] },
    size: 1024,
    responseTime: 150,
    timestamp: new Date()
  };

  const mockApiError: ApiError = {
    id: 'err-123',
    requestId: 'req-123',
    type: 'ValidationError',
    message: 'Invalid request parameters',
    stack: 'Error stack trace',
    statusCode: 400,
    timestamp: new Date()
  };

  const mockApiAlert: ApiAlert = {
    id: 'alert-123',
    name: 'High Response Time',
    description: 'API response time is too high',
    endpoint: '/api/users',
    metric: 'response_time',
    threshold: 200,
    level: 'warning',
    status: 'active',
    enabled: true,
    conditions: {
      operator: 'gt',
      value: 200,
      duration: '5m'
    }
  };

  const mockApiThreshold: ApiThreshold = {
    endpoint: '/api/users',
    metric: 'response_time',
    warning: 200,
    critical: 500,
    operator: 'gt',
    enabled: true
  };

  /**
   * 测试前置设置
   */
  beforeEach(() => {
    // 重置所有 Mock
    jest.clearAllMocks();

    // 设置环境配置 Mock
    mockEnvConfig.getApiMonitoringConfig = jest.fn().mockReturnValue({
      enabled: true,
      interval: 5000,
      retention: '7d',
      realTime: true,
      alerts: true,
      reports: true,
      sampling: 1.0
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
    mockValidator.isUrl = jest.fn().mockReturnValue(true);
    mockValidator.isEmail = jest.fn().mockReturnValue(true);

    // Mock 外部库
    jest.doMock('redis', () => mockRedis);
    jest.doMock('ws', () => mockWebSocket);
    jest.doMock('node-cron', () => mockCron);
  });

  /**
   * 测试后置清理
   */
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('API监控初始化', () => {
    it('应该启动API监控', async () => {
      const result = await startApiMonitoring();
      
      expect(result.success).toBe(true);
      expect(isApiMonitoringActive()).toBe(true);
    });

    it('应该停止API监控', async () => {
      await startApiMonitoring();
      const result = await stopApiMonitoring();
      
      expect(result.success).toBe(true);
      expect(isApiMonitoringActive()).toBe(false);
    });

    it('应该获取API监控状态', () => {
      const status = getApiMonitoringStatus();
      
      expect(status).toEqual(
        expect.objectContaining({
          active: expect.any(Boolean),
          uptime: expect.any(Number),
          requestsCount: expect.any(Number),
          errorsCount: expect.any(Number),
          averageResponseTime: expect.any(Number)
        })
      );
    });

    it('应该处理启动失败', async () => {
      mockRedis.createClient.mockImplementation(() => {
        throw new Error('Redis connection failed');
      });
      
      const result = await startApiMonitoring();
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('API请求记录', () => {
    beforeEach(async () => {
      await startApiMonitoring();
    });

    it('应该记录API请求', async () => {
      const result = await recordApiRequest(mockApiRequest);
      
      expect(result.success).toBe(true);
      expect(result.requestId).toBeDefined();
    });

    it('应该记录API响应', async () => {
      await recordApiRequest(mockApiRequest);
      const result = await recordApiResponse(mockApiResponse);
      
      expect(result.success).toBe(true);
      expect(result.responseId).toBeDefined();
    });

    it('应该记录API错误', async () => {
      await recordApiRequest(mockApiRequest);
      const result = await recordApiError(mockApiError);
      
      expect(result.success).toBe(true);
      expect(result.errorId).toBeDefined();
    });

    it('应该处理无效的请求数据', async () => {
      const invalidRequest = {
        method: '', // 空方法
        url: 'invalid-url' // 无效URL
      };
      
      const result = await recordApiRequest(invalidRequest as any);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('应该处理重复的请求ID', async () => {
      await recordApiRequest(mockApiRequest);
      
      // 尝试记录相同ID的请求
      const result = await recordApiRequest(mockApiRequest);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('duplicate');
    });
  });

  describe('API指标查询', () => {
    beforeEach(async () => {
      await startApiMonitoring();
      await recordApiRequest(mockApiRequest);
      await recordApiResponse(mockApiResponse);
    });

    it('应该获取API指标', async () => {
      const metrics = await getApiMetrics();
      
      expect(metrics).toEqual(
        expect.objectContaining({
          totalRequests: expect.any(Number),
          totalResponses: expect.any(Number),
          totalErrors: expect.any(Number),
          averageResponseTime: expect.any(Number),
          errorRate: expect.any(Number),
          throughput: expect.any(Number)
        })
      );
    });

    it('应该获取端点指标', async () => {
      const metrics = await getEndpointMetrics('/api/users');
      
      expect(metrics).toEqual(
        expect.objectContaining({
          endpoint: '/api/users',
          requests: expect.any(Number),
          responses: expect.any(Number),
          errors: expect.any(Number),
          averageResponseTime: expect.any(Number),
          errorRate: expect.any(Number)
        })
      );
    });

    it('应该获取HTTP方法指标', async () => {
      const metrics = await getMethodMetrics('GET');
      
      expect(metrics).toEqual(
        expect.objectContaining({
          method: 'GET',
          requests: expect.any(Number),
          averageResponseTime: expect.any(Number),
          errorRate: expect.any(Number)
        })
      );
    });

    it('应该获取状态码指标', async () => {
      const metrics = await getStatusCodeMetrics();
      
      expect(metrics).toEqual(
        expect.objectContaining({
          '200': expect.any(Number),
          '400': expect.any(Number),
          '500': expect.any(Number)
        })
      );
    });

    it('应该获取响应时间指标', async () => {
      const metrics = await getResponseTimeMetrics();
      
      expect(metrics).toEqual(
        expect.objectContaining({
          average: expect.any(Number),
          median: expect.any(Number),
          p95: expect.any(Number),
          p99: expect.any(Number),
          min: expect.any(Number),
          max: expect.any(Number)
        })
      );
    });

    it('应该获取错误率指标', async () => {
      const metrics = await getErrorRateMetrics();
      
      expect(metrics).toEqual(
        expect.objectContaining({
          overall: expect.any(Number),
          byEndpoint: expect.any(Object),
          byStatusCode: expect.any(Object),
          trend: expect.any(Array)
        })
      );
    });

    it('应该获取吞吐量指标', async () => {
      const metrics = await getThroughputMetrics();
      
      expect(metrics).toEqual(
        expect.objectContaining({
          requestsPerSecond: expect.any(Number),
          requestsPerMinute: expect.any(Number),
          requestsPerHour: expect.any(Number),
          trend: expect.any(Array)
        })
      );
    });
  });

  describe('API分析功能', () => {
    beforeEach(async () => {
      await startApiMonitoring();
      // 生成一些测试数据
      for (let i = 0; i < 10; i++) {
        const request = { ...mockApiRequest, id: `req-${i}`, url: `/api/endpoint${i % 3}` };
        const response = { ...mockApiResponse, id: `res-${i}`, requestId: `req-${i}`, responseTime: 100 + i * 10 };
        await recordApiRequest(request);
        await recordApiResponse(response);
      }
    });

    it('应该获取热门端点', async () => {
      const topEndpoints = await getTopEndpoints(5);
      
      expect(Array.isArray(topEndpoints)).toBe(true);
      expect(topEndpoints.length).toBeLessThanOrEqual(5);
      expect(topEndpoints.every(e => 
        e.endpoint && typeof e.requests === 'number'
      )).toBe(true);
    });

    it('应该获取慢端点', async () => {
      const slowEndpoints = await getSlowEndpoints(5);
      
      expect(Array.isArray(slowEndpoints)).toBe(true);
      expect(slowEndpoints.length).toBeLessThanOrEqual(5);
      expect(slowEndpoints.every(e => 
        e.endpoint && typeof e.averageResponseTime === 'number'
      )).toBe(true);
    });

    it('应该获取错误端点', async () => {
      // 先记录一些错误
      await recordApiError({ ...mockApiError, id: 'err-1', requestId: 'req-1' });
      
      const errorEndpoints = await getErrorEndpoints(5);
      
      expect(Array.isArray(errorEndpoints)).toBe(true);
      expect(errorEndpoints.every(e => 
        e.endpoint && typeof e.errorRate === 'number'
      )).toBe(true);
    });

    it('应该获取API趋势', async () => {
      const trends = await getApiTrends({
        timeRange: '1h',
        interval: '5m'
      });
      
      expect(trends).toEqual(
        expect.objectContaining({
          requests: expect.any(Array),
          responseTime: expect.any(Array),
          errorRate: expect.any(Array),
          throughput: expect.any(Array)
        })
      );
    });

    it('应该获取API洞察', async () => {
      const insights = await getApiInsights();
      
      expect(insights).toEqual(
        expect.objectContaining({
          summary: expect.any(Object),
          anomalies: expect.any(Array),
          recommendations: expect.any(Array),
          patterns: expect.any(Array)
        })
      );
    });
  });

  describe('API告警管理', () => {
    beforeEach(async () => {
      await startApiMonitoring();
    });

    it('应该创建API告警', async () => {
      const result = await createApiAlert(mockApiAlert);
      
      expect(result.success).toBe(true);
      expect(result.alertId).toBeDefined();
    });

    it('应该更新API告警', async () => {
      const { alertId } = await createApiAlert(mockApiAlert);
      const updates = { threshold: 300, level: 'critical' };
      
      const result = await updateApiAlert(alertId, updates);
      
      expect(result.success).toBe(true);
    });

    it('应该删除API告警', async () => {
      const { alertId } = await createApiAlert(mockApiAlert);
      
      const result = await deleteApiAlert(alertId);
      
      expect(result.success).toBe(true);
    });

    it('应该获取所有API告警', async () => {
      await createApiAlert(mockApiAlert);
      
      const alerts = await getApiAlerts();
      
      expect(Array.isArray(alerts)).toBe(true);
      expect(alerts.length).toBeGreaterThan(0);
    });

    it('应该检查API告警条件', async () => {
      await createApiAlert(mockApiAlert);
      // 记录一个超过阈值的响应
      await recordApiRequest(mockApiRequest);
      await recordApiResponse({ ...mockApiResponse, responseTime: 250 });
      
      const result = await checkApiAlerts();
      
      expect(result.triggered).toBeGreaterThanOrEqual(0);
    });

    it('应该触发API告警', async () => {
      const { alertId } = await createApiAlert(mockApiAlert);
      
      const result = await triggerApiAlert(alertId, {
        value: 250,
        endpoint: '/api/users',
        message: 'Response time exceeded threshold'
      });
      
      expect(result.success).toBe(true);
    });

    it('应该解决API告警', async () => {
      const { alertId } = await createApiAlert(mockApiAlert);
      await triggerApiAlert(alertId, { value: 250, endpoint: '/api/users' });
      
      const result = await resolveApiAlert(alertId, 'Issue resolved');
      
      expect(result.success).toBe(true);
    });

    it('应该获取API告警历史', async () => {
      const { alertId } = await createApiAlert(mockApiAlert);
      
      const history = await getApiAlertHistory(alertId);
      
      expect(Array.isArray(history)).toBe(true);
    });
  });

  describe('API阈值管理', () => {
    beforeEach(async () => {
      await startApiMonitoring();
    });

    it('应该设置API阈值', async () => {
      const result = await setApiThreshold('/api/users', mockApiThreshold);
      
      expect(result.success).toBe(true);
    });

    it('应该获取API阈值', async () => {
      await setApiThreshold('/api/users', mockApiThreshold);
      
      const threshold = await getApiThreshold('/api/users', 'response_time');
      
      expect(threshold).toEqual(expect.objectContaining(mockApiThreshold));
    });

    it('应该更新API阈值', async () => {
      await setApiThreshold('/api/users', mockApiThreshold);
      
      const result = await updateApiThreshold('/api/users', 'response_time', {
        warning: 150,
        critical: 400
      });
      
      expect(result.success).toBe(true);
    });

    it('应该删除API阈值', async () => {
      await setApiThreshold('/api/users', mockApiThreshold);
      
      const result = await deleteApiThreshold('/api/users', 'response_time');
      
      expect(result.success).toBe(true);
    });

    it('应该获取所有API阈值', async () => {
      await setApiThreshold('/api/users', mockApiThreshold);
      
      const thresholds = await getApiThresholds();
      
      expect(Array.isArray(thresholds)).toBe(true);
      expect(thresholds.length).toBeGreaterThan(0);
    });

    it('应该检查API阈值', async () => {
      await setApiThreshold('/api/users', mockApiThreshold);
      
      const result = await checkApiThresholds({
        endpoint: '/api/users',
        metric: 'response_time',
        value: 250
      });
      
      expect(result.exceeded).toBe(true);
      expect(result.level).toBe('warning');
    });
  });

  describe('API报告管理', () => {
    beforeEach(async () => {
      await startApiMonitoring();
    });

    it('应该创建API报告', async () => {
      const report = {
        name: 'Daily API Report',
        description: 'Daily API performance summary',
        endpoints: ['/api/users', '/api/orders'],
        metrics: ['response_time', 'error_rate', 'throughput'],
        schedule: '0 9 * * *', // 每天9点
        format: 'pdf',
        recipients: ['admin@example.com']
      };
      
      const result = await createApiReport(report);
      
      expect(result.success).toBe(true);
      expect(result.reportId).toBeDefined();
    });

    it('应该生成API报告', async () => {
      const reportConfig = {
        endpoints: ['/api/users'],
        metrics: ['response_time', 'error_rate'],
        timeRange: '24h',
        format: 'json'
      };
      
      const report = await generateApiReport(reportConfig);
      
      expect(report).toEqual(
        expect.objectContaining({
          title: expect.any(String),
          period: expect.any(Object),
          summary: expect.any(Object),
          endpoints: expect.any(Array),
          metrics: expect.any(Object),
          generatedAt: expect.any(Date)
        })
      );
    });

    it('应该调度API报告', async () => {
      const reportConfig = {
        name: 'Weekly API Report',
        schedule: '0 9 * * 1', // 每周一9点
        endpoints: ['/api/users'],
        metrics: ['response_time']
      };
      
      const result = await scheduleApiReport(reportConfig);
      
      expect(result.success).toBe(true);
      expect(result.scheduleId).toBeDefined();
    });

    it('应该获取所有API报告', async () => {
      const reports = await getApiReports();
      
      expect(Array.isArray(reports)).toBe(true);
    });

    it('应该导出API报告', async () => {
      const reportData = {
        endpoints: ['/api/users'],
        metrics: ['response_time'],
        timeRange: '1h'
      };
      
      const exported = await exportApiReport(reportData, 'csv');
      
      expect(typeof exported).toBe('string');
      expect(exported.length).toBeGreaterThan(0);
    });

    it('应该删除API报告', async () => {
      const report = {
        name: 'Test Report',
        endpoints: ['/api/users'],
        metrics: ['response_time']
      };
      
      const { reportId } = await createApiReport(report);
      const result = await deleteApiReport(reportId);
      
      expect(result.success).toBe(true);
    });
  });

  describe('实时API监控', () => {
    beforeEach(async () => {
      await startApiMonitoring();
    });

    it('应该启用实时API监控', async () => {
      const result = await enableRealTimeApiMonitoring();
      
      expect(result.success).toBe(true);
      expect(isRealTimeApiMonitoringEnabled()).toBe(true);
    });

    it('应该禁用实时API监控', async () => {
      await enableRealTimeApiMonitoring();
      
      const result = await disableRealTimeApiMonitoring();
      
      expect(result.success).toBe(true);
      expect(isRealTimeApiMonitoringEnabled()).toBe(false);
    });

    it('应该订阅API指标', async () => {
      await enableRealTimeApiMonitoring();
      
      const subscription = await subscribeToApiMetrics({
        endpoints: ['/api/users'],
        metrics: ['response_time', 'error_rate'],
        callback: jest.fn()
      });
      
      expect(subscription.success).toBe(true);
      expect(subscription.subscriptionId).toBeDefined();
    });

    it('应该取消订阅API指标', async () => {
      await enableRealTimeApiMonitoring();
      const { subscriptionId } = await subscribeToApiMetrics({
        endpoints: ['/api/users'],
        metrics: ['response_time'],
        callback: jest.fn()
      });
      
      const result = await unsubscribeFromApiMetrics(subscriptionId);
      
      expect(result.success).toBe(true);
    });

    it('应该获取API订阅列表', async () => {
      await enableRealTimeApiMonitoring();
      await subscribeToApiMetrics({
        endpoints: ['/api/users'],
        metrics: ['response_time'],
        callback: jest.fn()
      });
      
      const subscriptions = await getApiSubscriptions();
      
      expect(Array.isArray(subscriptions)).toBe(true);
      expect(subscriptions.length).toBeGreaterThan(0);
    });

    it('应该广播API指标', async () => {
      await enableRealTimeApiMonitoring();
      
      const result = await broadcastApiMetrics({
        endpoint: '/api/users',
        metric: 'response_time',
        value: 150,
        timestamp: new Date()
      });
      
      expect(result.success).toBe(true);
      expect(result.subscribers).toBeGreaterThanOrEqual(0);
    });
  });

  describe('API配置管理', () => {
    it('应该获取API配置', () => {
      const config = getApiConfig();
      
      expect(config).toEqual(
        expect.objectContaining({
          enabled: expect.any(Boolean),
          interval: expect.any(Number),
          retention: expect.any(String),
          realTime: expect.any(Boolean),
          sampling: expect.any(Number)
        })
      );
    });

    it('应该更新API配置', async () => {
      const updates = {
        interval: 10000,
        retention: '14d',
        sampling: 0.5
      };
      
      const result = await updateApiConfig(updates);
      
      expect(result.success).toBe(true);
    });

    it('应该重置API配置', async () => {
      await updateApiConfig({ interval: 10000 });
      
      const result = await resetApiConfig();
      
      expect(result.success).toBe(true);
      
      const config = getApiConfig();
      expect(config.interval).toBe(5000); // 默认值
    });

    it('应该验证API配置', () => {
      const validConfig = {
        enabled: true,
        interval: 5000,
        retention: '7d',
        sampling: 1.0
      };
      
      const invalidConfig = {
        enabled: 'yes', // 应该是布尔值
        interval: -1000, // 应该是正数
        retention: 'invalid', // 应该是有效的时间格式
        sampling: 2.0 // 应该在0-1之间
      };
      
      expect(validateApiConfig(validConfig).isValid).toBe(true);
      expect(validateApiConfig(invalidConfig).isValid).toBe(false);
    });
  });

  describe('API数据管理', () => {
    beforeEach(async () => {
      await startApiMonitoring();
      await recordApiRequest(mockApiRequest);
      await recordApiResponse(mockApiResponse);
    });

    it('应该导出API数据', async () => {
      const exported = await exportApiData({
        format: 'json',
        timeRange: '1h',
        endpoints: ['/api/users']
      });
      
      expect(exported).toBeDefined();
      expect(typeof exported).toBe('string');
    });

    it('应该导入API数据', async () => {
      const data = JSON.stringify({
        requests: [mockApiRequest],
        responses: [mockApiResponse],
        version: '1.0.0'
      });
      
      const result = await importApiData(data);
      
      expect(result.success).toBe(true);
      expect(result.imported).toBeGreaterThan(0);
    });

    it('应该归档API数据', async () => {
      const result = await archiveApiData({
        olderThan: '30d',
        compress: true
      });
      
      expect(result.success).toBe(true);
      expect(result.archived).toBeGreaterThanOrEqual(0);
    });

    it('应该清除API数据', async () => {
      const result = await purgeApiData({
        olderThan: '90d'
      });
      
      expect(result.success).toBe(true);
      expect(result.purged).toBeGreaterThanOrEqual(0);
    });
  });

  describe('API统计和分析', () => {
    beforeEach(async () => {
      await startApiMonitoring();
      // 生成一些测试数据
      for (let i = 0; i < 20; i++) {
        const request = { ...mockApiRequest, id: `req-${i}`, url: `/api/endpoint${i % 5}` };
        const response = { ...mockApiResponse, id: `res-${i}`, requestId: `req-${i}`, responseTime: 50 + i * 5 };
        await recordApiRequest(request);
        await recordApiResponse(response);
      }
    });

    it('应该获取API统计', async () => {
      const stats = await getApiStats();
      
      expect(stats).toEqual(
        expect.objectContaining({
          totalRequests: expect.any(Number),
          totalResponses: expect.any(Number),
          totalErrors: expect.any(Number),
          uniqueEndpoints: expect.any(Number),
          averageResponseTime: expect.any(Number),
          errorRate: expect.any(Number),
          throughput: expect.any(Number)
        })
      );
    });

    it('应该分析API性能', async () => {
      const analysis = await analyzeApiPerformance({
        timeRange: '1h',
        endpoints: ['/api/endpoint0', '/api/endpoint1']
      });
      
      expect(analysis).toEqual(
        expect.objectContaining({
          summary: expect.any(Object),
          trends: expect.any(Array),
          bottlenecks: expect.any(Array),
          recommendations: expect.any(Array)
        })
      );
    });

    it('应该优化API性能', async () => {
      const optimization = await optimizeApiPerformance({
        endpoint: '/api/endpoint0',
        targetResponseTime: 100
      });
      
      expect(optimization).toEqual(
        expect.objectContaining({
          endpoint: '/api/endpoint0',
          currentPerformance: expect.any(Object),
          optimizations: expect.any(Array),
          estimatedImprovement: expect.any(Object)
        })
      );
    });

    it('应该获取API优化建议', async () => {
      const recommendations = await getApiRecommendations();
      
      expect(Array.isArray(recommendations)).toBe(true);
      expect(recommendations.every(r => 
        r.type && r.description && r.priority && r.endpoint
      )).toBe(true);
    });
  });

  describe('自定义API指标', () => {
    beforeEach(async () => {
      await startApiMonitoring();
    });

    it('应该创建自定义API指标', async () => {
      const customMetric = {
        name: 'business_api_metric',
        description: 'Custom business API metric',
        endpoint: '/api/business',
        type: 'counter',
        unit: 'count',
        tags: ['business', 'api']
      };
      
      const result = await createCustomApiMetric(customMetric);
      
      expect(result.success).toBe(true);
      expect(result.metricId).toBeDefined();
    });

    it('应该更新自定义API指标', async () => {
      const customMetric = {
        name: 'business_api_metric',
        description: 'Custom business API metric',
        endpoint: '/api/business',
        type: 'counter'
      };
      
      const { metricId } = await createCustomApiMetric(customMetric);
      const updates = { description: 'Updated description' };
      
      const result = await updateCustomApiMetric(metricId, updates);
      
      expect(result.success).toBe(true);
    });

    it('应该删除自定义API指标', async () => {
      const customMetric = {
        name: 'business_api_metric',
        endpoint: '/api/business',
        type: 'counter'
      };
      
      const { metricId } = await createCustomApiMetric(customMetric);
      
      const result = await deleteCustomApiMetric(metricId);
      
      expect(result.success).toBe(true);
    });

    it('应该获取自定义API指标', async () => {
      const customMetric = {
        name: 'business_api_metric',
        endpoint: '/api/business',
        type: 'counter'
      };
      
      await createCustomApiMetric(customMetric);
      
      const metrics = await getCustomApiMetrics();
      
      expect(Array.isArray(metrics)).toBe(true);
      expect(metrics.length).toBeGreaterThan(0);
    });

    it('应该记录自定义API指标数据', async () => {
      const customMetric = {
        name: 'business_api_metric',
        endpoint: '/api/business',
        type: 'counter'
      };
      
      const { metricId } = await createCustomApiMetric(customMetric);
      
      const result = await recordCustomApiMetric(metricId, {
        value: 42,
        tags: { category: 'sales' },
        requestId: 'req-123'
      });
      
      expect(result.success).toBe(true);
    });

    it('应该获取自定义API指标数据', async () => {
      const customMetric = {
        name: 'business_api_metric',
        endpoint: '/api/business',
        type: 'counter'
      };
      
      const { metricId } = await createCustomApiMetric(customMetric);
      await recordCustomApiMetric(metricId, { value: 42 });
      
      const data = await getCustomApiMetricData(metricId, {
        timeRange: '1h'
      });
      
      expect(Array.isArray(data)).toBe(true);
    });
  });

  describe('错误处理', () => {
    beforeEach(async () => {
      await startApiMonitoring();
    });

    it('应该处理Redis连接错误', async () => {
      mockRedis.createClient.mockImplementation(() => {
        throw new Error('Redis connection failed');
      });
      
      const result = await recordApiRequest(mockApiRequest);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('应该处理无效的API请求数据', async () => {
      const invalidRequest = {
        method: '', // 空方法
        url: '', // 空URL
        timestamp: 'invalid' // 无效时间戳
      };
      
      const result = await recordApiRequest(invalidRequest as any);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('应该处理告警创建错误', async () => {
      const invalidAlert = {
        name: '', // 空名称
        endpoint: '', // 空端点
        threshold: 'invalid' // 无效阈值
      };
      
      const result = await createApiAlert(invalidAlert as any);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('应该处理报告生成错误', async () => {
      const invalidConfig = {
        endpoints: [], // 空端点列表
        metrics: [], // 空指标列表
        timeRange: 'invalid' // 无效时间范围
      };
      
      const result = await generateApiReport(invalidConfig as any);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('性能测试', () => {
    beforeEach(async () => {
      await startApiMonitoring();
    });

    it('应该快速记录大量API请求', async () => {
      const requests = Array.from({ length: 1000 }, (_, i) => ({
        ...mockApiRequest,
        id: `req-${i}`,
        url: `/api/endpoint${i % 10}`
      }));
      
      const startTime = Date.now();
      
      const promises = requests.map(request => recordApiRequest(request));
      await Promise.all(promises);
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(10000); // 应该在10秒内完成
    });

    it('应该高效查询API指标', async () => {
      // 先记录一些数据
      for (let i = 0; i < 100; i++) {
        const request = { ...mockApiRequest, id: `req-${i}`, url: `/api/endpoint${i % 5}` };
        const response = { ...mockApiResponse, id: `res-${i}`, requestId: `req-${i}` };
        await recordApiRequest(request);
        await recordApiResponse(response);
      }
      
      const startTime = Date.now();
      
      await getApiMetrics();
      await getEndpointMetrics('/api/endpoint0');
      await getTopEndpoints(10);
      await getApiTrends({ timeRange: '1h' });
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(2000); // 应该在2秒内完成
    });

    it('应该优化内存使用', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // 记录大量数据
      for (let i = 0; i < 1000; i++) {
        const request = { ...mockApiRequest, id: `req-${i}` };
        const response = { ...mockApiResponse, id: `res-${i}`, requestId: `req-${i}` };
        await recordApiRequest(request);
        await recordApiResponse(response);
      }
      
      // 强制垃圾回收（如果可用）
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // 内存增长应该在合理范围内（小于100MB）
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);
    });
  });
});

/**
 * API监控服务便捷函数导出测试
 */
describe('API监控服务便捷函数', () => {
  it('应该导出所有API监控管理函数', () => {
    expect(typeof startApiMonitoring).toBe('function');
    expect(typeof stopApiMonitoring).toBe('function');
    expect(typeof isApiMonitoringActive).toBe('function');
    expect(typeof getApiMonitoringStatus).toBe('function');
  });

  it('应该导出所有API记录函数', () => {
    expect(typeof recordApiRequest).toBe('function');
    expect(typeof recordApiResponse).toBe('function');
    expect(typeof recordApiError).toBe('function');
  });

  it('应该导出所有API指标查询函数', () => {
    expect(typeof getApiMetrics).toBe('function');
    expect(typeof getEndpointMetrics).toBe('function');
    expect(typeof getMethodMetrics).toBe('function');
    expect(typeof getStatusCodeMetrics).toBe('function');
    expect(typeof getResponseTimeMetrics).toBe('function');
    expect(typeof getErrorRateMetrics).toBe('function');
    expect(typeof getThroughputMetrics).toBe('function');
  });

  it('应该导出所有API分析函数', () => {
    expect(typeof getTopEndpoints).toBe('function');
    expect(typeof getSlowEndpoints).toBe('function');
    expect(typeof getErrorEndpoints).toBe('function');
    expect(typeof getApiTrends).toBe('function');
    expect(typeof getApiInsights).toBe('function');
  });

  it('应该导出所有API告警管理函数', () => {
    expect(typeof createApiAlert).toBe('function');
    expect(typeof updateApiAlert).toBe('function');
    expect(typeof deleteApiAlert).toBe('function');
    expect(typeof getApiAlerts).toBe('function');
    expect(typeof checkApiAlerts).toBe('function');
    expect(typeof triggerApiAlert).toBe('function');
    expect(typeof resolveApiAlert).toBe('function');
    expect(typeof getApiAlertHistory).toBe('function');
  });

  it('应该导出所有API阈值管理函数', () => {
    expect(typeof setApiThreshold).toBe('function');
    expect(typeof getApiThreshold).toBe('function');
    expect(typeof updateApiThreshold).toBe('function');
    expect(typeof deleteApiThreshold).toBe('function');
    expect(typeof getApiThresholds).toBe('function');
    expect(typeof checkApiThresholds).toBe('function');
  });

  it('应该导出所有API报告管理函数', () => {
    expect(typeof createApiReport).toBe('function');
    expect(typeof generateApiReport).toBe('function');
    expect(typeof scheduleApiReport).toBe('function');
    expect(typeof getApiReports).toBe('function');
    expect(typeof exportApiReport).toBe('function');
    expect(typeof deleteApiReport).toBe('function');
  });

  it('应该导出所有实时API监控函数', () => {
    expect(typeof enableRealTimeApiMonitoring).toBe('function');
    expect(typeof disableRealTimeApiMonitoring).toBe('function');
    expect(typeof isRealTimeApiMonitoringEnabled).toBe('function');
    expect(typeof subscribeToApiMetrics).toBe('function');
    expect(typeof unsubscribeFromApiMetrics).toBe('function');
    expect(typeof getApiSubscriptions).toBe('function');
    expect(typeof broadcastApiMetrics).toBe('function');
  });

  it('应该导出所有API配置管理函数', () => {
    expect(typeof getApiConfig).toBe('function');
    expect(typeof updateApiConfig).toBe('function');
    expect(typeof resetApiConfig).toBe('function');
    expect(typeof validateApiConfig).toBe('function');
  });

  it('应该导出所有API数据管理函数', () => {
    expect(typeof exportApiData).toBe('function');
    expect(typeof importApiData).toBe('function');
    expect(typeof archiveApiData).toBe('function');
    expect(typeof purgeApiData).toBe('function');
  });

  it('应该导出所有API统计分析函数', () => {
    expect(typeof getApiStats).toBe('function');
    expect(typeof analyzeApiPerformance).toBe('function');
    expect(typeof optimizeApiPerformance).toBe('function');
    expect(typeof getApiRecommendations).toBe('function');
  });

  it('应该导出所有自定义API指标函数', () => {
    expect(typeof createCustomApiMetric).toBe('function');
    expect(typeof updateCustomApiMetric).toBe('function');
    expect(typeof deleteCustomApiMetric).toBe('function');
    expect(typeof getCustomApiMetrics).toBe('function');
    expect(typeof recordCustomApiMetric).toBe('function');
    expect(typeof getCustomApiMetricData).toBe('function');
  });

  it('应该导出所有类型定义', () => {
    expect(typeof ApiMetric).toBe('function');
    expect(typeof ApiRequest).toBe('function');
    expect(typeof ApiResponse).toBe('function');
    expect(typeof ApiError).toBe('function');
    expect(typeof ApiAlert).toBe('function');
    expect(typeof ApiThreshold).toBe('function');
    expect(typeof ApiReport).toBe('function');
    expect(typeof ApiConfig).toBe('function');
    expect(typeof ApiStats).toBe('function');
    expect(typeof ApiTrends).toBe('function');
    expect(typeof ApiInsights).toBe('function');
    expect(typeof CustomApiMetric).toBe('function');
  });

  it('应该导出API监控服务实例', () => {
    expect(apiMonitor).toBeDefined();
    expect(typeof apiMonitor).toBe('object');
  });
});