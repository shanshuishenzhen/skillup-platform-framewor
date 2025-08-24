/**
 * API监控中间件单元测试
 * 
 * 测试API监控中间件，包括：
 * - 请求响应时间监控
 * - API调用频率统计
 * - 错误率监控
 * - 性能指标收集
 * - 用户行为分析
 * - 资源使用监控
 * - 异常检测和告警
 * - 监控数据存储
 */

import { apiMonitoringMiddleware } from '../../middleware/apiMonitoring';
import { analyticsService } from '../../services/analyticsService';
import { cacheService } from '../../services/cacheService';
import { auditService } from '../../services/auditService';
import { notificationService } from '../../services/notificationService';
import { supabaseClient } from '../../config/supabase';
import { logger } from '../../utils/logger';
import { envConfig } from '../../config/envConfig';
import { Request, Response, NextFunction } from 'express';
import { performance } from 'perf_hooks';

// Mock 依赖
jest.mock('../../services/analyticsService');
jest.mock('../../services/cacheService');
jest.mock('../../services/auditService');
jest.mock('../../services/notificationService');
jest.mock('../../config/supabase');
jest.mock('../../utils/logger');
jest.mock('../../config/envConfig');
jest.mock('perf_hooks');

// 类型定义
interface ApiMetrics {
  endpoint: string;
  method: string;
  statusCode: number;
  responseTime: number;
  requestSize: number;
  responseSize: number;
  userId?: string;
  userAgent?: string;
  ipAddress: string;
  timestamp: string;
  errorMessage?: string;
  stackTrace?: string;
  memoryUsage: {
    rss: number;
    heapUsed: number;
    heapTotal: number;
    external: number;
  };
  cpuUsage: {
    user: number;
    system: number;
  };
}

interface PerformanceMetrics {
  endpoint: string;
  method: string;
  avgResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  requestCount: number;
  errorCount: number;
  errorRate: number;
  throughput: number; // requests per second
  p50: number;
  p95: number;
  p99: number;
  lastUpdated: string;
}

interface UserBehaviorMetrics {
  userId: string;
  sessionId: string;
  endpoint: string;
  method: string;
  timestamp: string;
  duration: number;
  userAgent: string;
  ipAddress: string;
  referrer?: string;
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown';
  browserType: string;
  osType: string;
  geolocation?: {
    country: string;
    region: string;
    city: string;
  };
}

interface AlertRule {
  id: string;
  name: string;
  description: string;
  metric: 'response_time' | 'error_rate' | 'throughput' | 'memory_usage' | 'cpu_usage';
  threshold: number;
  operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'ne';
  timeWindow: number; // minutes
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  endpoints?: string[];
  notificationChannels: string[];
  cooldownPeriod: number; // minutes
  createdAt: string;
  updatedAt: string;
}

interface MonitoringConfig {
  enabled: boolean;
  sampleRate: number; // 0-1
  excludeEndpoints: string[];
  includeHeaders: string[];
  maxRequestBodySize: number;
  maxResponseBodySize: number;
  retentionDays: number;
  aggregationInterval: number; // minutes
  alerting: {
    enabled: boolean;
    rules: AlertRule[];
  };
  performance: {
    trackMemory: boolean;
    trackCpu: boolean;
    trackDatabase: boolean;
    trackCache: boolean;
  };
  userBehavior: {
    enabled: boolean;
    trackSessions: boolean;
    trackDeviceInfo: boolean;
    trackGeolocation: boolean;
  };
}

// Mock 实例
const mockAnalyticsService = {
  track: jest.fn(),
  increment: jest.fn(),
  histogram: jest.fn(),
  gauge: jest.fn(),
  timer: jest.fn(),
  getMetrics: jest.fn(),
  aggregateMetrics: jest.fn()
};

const mockCacheService = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  exists: jest.fn(),
  hget: jest.fn(),
  hset: jest.fn(),
  hdel: jest.fn(),
  expire: jest.fn(),
  incr: jest.fn(),
  zadd: jest.fn(),
  zrange: jest.fn(),
  zrem: jest.fn()
};

const mockAuditService = {
  log: jest.fn(),
  logApiCall: jest.fn(),
  logPerformanceMetric: jest.fn(),
  logAlert: jest.fn()
};

const mockNotificationService = {
  sendAlert: jest.fn(),
  sendEmail: jest.fn(),
  sendSlack: jest.fn(),
  sendWebhook: jest.fn()
};

const mockSupabaseClient = {
  from: jest.fn().mockReturnValue({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    single: jest.fn(),
    then: jest.fn()
  }),
  rpc: jest.fn()
};

const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
};

const mockEnvConfig: MonitoringConfig = {
  enabled: true,
  sampleRate: 1.0,
  excludeEndpoints: ['/health', '/metrics'],
  includeHeaders: ['user-agent', 'x-forwarded-for'],
  maxRequestBodySize: 1024 * 1024, // 1MB
  maxResponseBodySize: 1024 * 1024, // 1MB
  retentionDays: 30,
  aggregationInterval: 5, // 5分钟
  alerting: {
    enabled: true,
    rules: []
  },
  performance: {
    trackMemory: true,
    trackCpu: true,
    trackDatabase: true,
    trackCache: true
  },
  userBehavior: {
    enabled: true,
    trackSessions: true,
    trackDeviceInfo: true,
    trackGeolocation: false
  }
};

const mockPerformance = {
  now: jest.fn().mockReturnValue(1000),
  mark: jest.fn(),
  measure: jest.fn()
};

// 设置 Mock
(analyticsService as unknown) = mockAnalyticsService;
(cacheService as unknown) = mockCacheService;
(auditService as unknown) = mockAuditService;
(notificationService as unknown) = mockNotificationService;
(supabaseClient as unknown) = mockSupabaseClient;
(logger as unknown) = mockLogger;
(envConfig as unknown) = { monitoring: mockEnvConfig };
(performance as unknown) = mockPerformance;

// Mock Express 对象
const createMockRequest = (options: {
  method?: string;
  url?: string;
  headers?: Record<string, string>;
  body?: Record<string, unknown>;
  user?: { id: string; [key: string]: unknown };
  ip?: string;
  sessionID?: string;
} = {}): Partial<Request> => ({
  method: options.method || 'GET',
  url: options.url || '/api/courses',
  originalUrl: options.url || '/api/courses',
  path: options.url || '/api/courses',
  headers: {
    'user-agent': 'Test Agent',
    'content-type': 'application/json',
    'x-forwarded-for': '192.168.1.1',
    ...options.headers
  },
  body: options.body || {},
  user: options.user,
  ip: options.ip || '192.168.1.1',
  sessionID: options.sessionID || 'session-123',
  get: jest.fn((header: string) => {
    const headers = {
      'user-agent': 'Test Agent',
      'content-type': 'application/json',
      'x-forwarded-for': '192.168.1.1',
      ...options.headers
    };
    return headers[header.toLowerCase()];
  })
});

const createMockResponse = (): Partial<Response> => {
  const res: Partial<Response> = {
    statusCode: 200,
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    end: jest.fn().mockReturnThis(),
    locals: {},
    get: jest.fn(),
    set: jest.fn(),
    getHeaders: jest.fn().mockReturnValue({
      'content-type': 'application/json',
      'content-length': '100'
    })
  };
  return res;
};

const createMockNext = (): NextFunction => jest.fn();

describe('API Monitoring Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // 重置时间mock
    let currentTime = 1000;
    mockPerformance.now.mockImplementation(() => {
      currentTime += 100; // 每次调用增加100ms
      return currentTime;
    });
    
    // 设置默认的mock返回值
    mockCacheService.get.mockResolvedValue(null);
    mockCacheService.set.mockResolvedValue(true);
    mockCacheService.incr.mockResolvedValue(1);
    
    mockSupabaseClient.from().then.mockResolvedValue({
      data: [],
      error: null
    });
    
    // Mock process.memoryUsage
    jest.spyOn(process, 'memoryUsage').mockReturnValue({
      rss: 50 * 1024 * 1024, // 50MB
      heapUsed: 30 * 1024 * 1024, // 30MB
      heapTotal: 40 * 1024 * 1024, // 40MB
      external: 5 * 1024 * 1024, // 5MB
      arrayBuffers: 1 * 1024 * 1024 // 1MB
    });
    
    // Mock process.cpuUsage
    jest.spyOn(process, 'cpuUsage').mockReturnValue({
      user: 1000000, // 1秒
      system: 500000 // 0.5秒
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  /**
   * 基础监控功能测试
   */
  describe('Basic Monitoring', () => {
    it('应该记录API请求基础指标', async () => {
      const req = createMockRequest({
        method: 'GET',
        url: '/api/courses',
        user: { id: 'user-123' }
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();
      
      const middleware = apiMonitoringMiddleware();
      await middleware(req, res, next);
      
      // 模拟响应结束
      res.statusCode = 200;
      (res as unknown as { emit: (event: string) => void }).emit('finish');
      
      expect(next).toHaveBeenCalledWith();
      
      // 验证指标记录
      expect(mockAnalyticsService.track).toHaveBeenCalledWith(
        'api_request',
        expect.objectContaining({
          endpoint: '/api/courses',
          method: 'GET',
          statusCode: 200,
          userId: 'user-123'
        })
      );
      
      // 验证响应时间记录
      expect(mockAnalyticsService.histogram).toHaveBeenCalledWith(
        'api_response_time',
        expect.any(Number),
        expect.objectContaining({
          endpoint: '/api/courses',
          method: 'GET'
        })
      );
    });

    it('应该记录请求和响应大小', async () => {
      const requestBody = { name: 'Test Course', description: 'Test Description' };
      const req = createMockRequest({
        method: 'POST',
        url: '/api/courses',
        body: requestBody,
        headers: {
          'content-length': JSON.stringify(requestBody).length.toString()
        }
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();
      
      // Mock 响应大小
      (res.getHeaders as jest.Mock).mockReturnValue({
        'content-type': 'application/json',
        'content-length': '500'
      });
      
      const middleware = apiMonitoringMiddleware();
      await middleware(req, res, next);
      
      res.statusCode = 201;
      interface MockResponse extends Partial<Response> {
        emit: (event: string) => void;
        statusCode: number;
      }
      
      (res as MockResponse).emit('finish');
      
      expect(mockAnalyticsService.track).toHaveBeenCalledWith(
        'api_request',
        expect.objectContaining({
          requestSize: expect.any(Number),
          responseSize: 500
        })
      );
    });

    it('应该跳过排除的端点', async () => {
      const req = createMockRequest({
        method: 'GET',
        url: '/health'
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();
      
      const middleware = apiMonitoringMiddleware();
      await middleware(req, res, next);
      
      expect(next).toHaveBeenCalledWith();
      
      res.statusCode = 200;
      interface MockResponse {
        emit: (event: string) => void;
      }
      (res as MockResponse).emit('finish');
      
      // 验证没有记录指标
      expect(mockAnalyticsService.track).not.toHaveBeenCalled();
    });

    it('应该支持采样率控制', async () => {
      // 设置50%采样率
      const configWithSampling = {
        ...mockEnvConfig,
        sampleRate: 0.5
      };
      interface MockEnvConfig {
        monitoring: MonitoringConfig;
      }
      (envConfig as MockEnvConfig) = { monitoring: configWithSampling };
      
      // Mock Math.random 返回0.6（大于0.5，应该跳过）
      jest.spyOn(Math, 'random').mockReturnValue(0.6);
      
      const req = createMockRequest({
        method: 'GET',
        url: '/api/courses'
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();
      
      const middleware = apiMonitoringMiddleware();
      await middleware(req, res, next);
      
      expect(next).toHaveBeenCalledWith();
      
      res.statusCode = 200;
      (res as MockResponse).emit('finish');
      
      // 验证没有记录指标（被采样跳过）
      expect(mockAnalyticsService.track).not.toHaveBeenCalled();
      
      // 恢复Math.random
      (Math.random as jest.Mock).mockRestore();
    });
  });

  /**
   * 性能监控测试
   */
  describe('Performance Monitoring', () => {
    it('应该监控内存使用情况', async () => {
      const req = createMockRequest({
        method: 'GET',
        url: '/api/courses'
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();
      
      const middleware = apiMonitoringMiddleware();
      await middleware(req, res, next);
      
      res.statusCode = 200;
      (res as MockResponse).emit('finish');
      
      // 验证内存使用记录
      expect(mockAnalyticsService.gauge).toHaveBeenCalledWith(
        'memory_usage',
        expect.objectContaining({
          rss: 50 * 1024 * 1024,
          heapUsed: 30 * 1024 * 1024,
          heapTotal: 40 * 1024 * 1024
        })
      );
    });

    it('应该监控CPU使用情况', async () => {
      const req = createMockRequest({
        method: 'GET',
        url: '/api/courses'
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();
      
      const middleware = apiMonitoringMiddleware();
      await middleware(req, res, next);
      
      res.statusCode = 200;
      (res as MockResponse).emit('finish');
      
      // 验证CPU使用记录
      expect(mockAnalyticsService.gauge).toHaveBeenCalledWith(
        'cpu_usage',
        expect.objectContaining({
          user: 1000000,
          system: 500000
        })
      );
    });

    it('应该计算准确的响应时间', async () => {
      let callCount = 0;
      mockPerformance.now.mockImplementation(() => {
        callCount++;
        return callCount === 1 ? 1000 : 1150; // 150ms响应时间
      });
      
      const req = createMockRequest({
        method: 'GET',
        url: '/api/courses'
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();
      
      const middleware = apiMonitoringMiddleware();
      await middleware(req, res, next);
      
      res.statusCode = 200;
      (res as MockResponse).emit('finish');
      
      // 验证响应时间记录
      expect(mockAnalyticsService.histogram).toHaveBeenCalledWith(
        'api_response_time',
        150,
        expect.any(Object)
      );
    });

    it('应该聚合性能指标', async () => {
      const endpoint = '/api/courses';
      const method = 'GET';
      
      // Mock 现有指标
      mockCacheService.hget.mockResolvedValue(JSON.stringify({
        avgResponseTime: 100,
        minResponseTime: 50,
        maxResponseTime: 200,
        requestCount: 10,
        errorCount: 1,
        totalResponseTime: 1000
      }));
      
      const req = createMockRequest({ method, url: endpoint }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();
      
      const middleware = apiMonitoringMiddleware();
      await middleware(req, res, next);
      
      res.statusCode = 200;
      (res as MockResponse).emit('finish');
      
      // 验证指标聚合
      expect(mockCacheService.hset).toHaveBeenCalledWith(
        `metrics:${endpoint}:${method}`,
        'performance',
        expect.stringContaining('requestCount')
      );
    });
  });

  /**
   * 错误监控测试
   */
  describe('Error Monitoring', () => {
    it('应该记录4xx错误', async () => {
      const req = createMockRequest({
        method: 'GET',
        url: '/api/courses/invalid'
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();
      
      const middleware = apiMonitoringMiddleware();
      await middleware(req, res, next);
      
      res.statusCode = 404;
      (res as MockResponse).emit('finish');
      
      // 验证错误记录
      expect(mockAnalyticsService.increment).toHaveBeenCalledWith(
        'api_errors',
        1,
        expect.objectContaining({
          endpoint: '/api/courses/invalid',
          method: 'GET',
          statusCode: 404,
          errorType: 'client_error'
        })
      );
    });

    it('应该记录5xx错误', async () => {
      const req = createMockRequest({
        method: 'POST',
        url: '/api/courses'
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();
      
      const middleware = apiMonitoringMiddleware();
      await middleware(req, res, next);
      
      res.statusCode = 500;
      (res as MockResponse).emit('finish');
      
      // 验证服务器错误记录
      expect(mockAnalyticsService.increment).toHaveBeenCalledWith(
        'api_errors',
        1,
        expect.objectContaining({
          endpoint: '/api/courses',
          method: 'POST',
          statusCode: 500,
          errorType: 'server_error'
        })
      );
      
      // 验证错误审计日志
      expect(mockAuditService.logApiCall).toHaveBeenCalledWith(
        expect.objectContaining({
          endpoint: '/api/courses',
          method: 'POST',
          statusCode: 500,
          level: 'error'
        })
      );
    });

    it('应该计算错误率', async () => {
      const endpoint = '/api/courses';
      const method = 'GET';
      
      // Mock 现有指标
      mockCacheService.hget.mockResolvedValue(JSON.stringify({
        requestCount: 100,
        errorCount: 5
      }));
      
      const req = createMockRequest({ method, url: endpoint }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();
      
      const middleware = apiMonitoringMiddleware();
      await middleware(req, res, next);
      
      res.statusCode = 500;
      (res as MockResponse).emit('finish');
      
      // 验证错误率计算
      expect(mockAnalyticsService.gauge).toHaveBeenCalledWith(
        'api_error_rate',
        expect.closeTo(0.059, 0.001), // (5+1)/(100+1) ≈ 0.059
        expect.objectContaining({
          endpoint,
          method
        })
      );
    });
  });

  /**
   * 用户行为监控测试
   */
  describe('User Behavior Monitoring', () => {
    it('应该记录用户会话信息', async () => {
      const user = { id: 'user-123', email: 'test@example.com' };
      const req = createMockRequest({
        method: 'GET',
        url: '/api/courses',
        user,
        sessionID: 'session-456',
        headers: {
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'referer': 'https://example.com/dashboard'
        }
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();
      
      const middleware = apiMonitoringMiddleware();
      await middleware(req, res, next);
      
      res.statusCode = 200;
      (res as MockResponse).emit('finish');
      
      // 验证用户行为记录
      expect(mockAnalyticsService.track).toHaveBeenCalledWith(
        'user_behavior',
        expect.objectContaining({
          userId: 'user-123',
          sessionId: 'session-456',
          endpoint: '/api/courses',
          method: 'GET',
          deviceType: 'desktop',
          browserType: expect.stringContaining('Chrome'),
          referrer: 'https://example.com/dashboard'
        })
      );
    });

    it('应该检测设备类型', async () => {
      const mobileUserAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15';
      
      const req = createMockRequest({
        method: 'GET',
        url: '/api/courses',
        headers: {
          'user-agent': mobileUserAgent
        }
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();
      
      const middleware = apiMonitoringMiddleware();
      await middleware(req, res, next);
      
      res.statusCode = 200;
      (res as MockResponse).emit('finish');
      
      // 验证移动设备检测
      expect(mockAnalyticsService.track).toHaveBeenCalledWith(
        'user_behavior',
        expect.objectContaining({
          deviceType: 'mobile',
          browserType: expect.stringContaining('Safari')
        })
      );
    });

    it('应该跟踪用户会话持续时间', async () => {
      const sessionId = 'session-789';
      
      // Mock 会话开始时间
      mockCacheService.get.mockResolvedValue('1000');
      
      const req = createMockRequest({
        method: 'GET',
        url: '/api/courses',
        sessionID: sessionId
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();
      
      const middleware = apiMonitoringMiddleware();
      await middleware(req, res, next);
      
      res.statusCode = 200;
      (res as MockResponse).emit('finish');
      
      // 验证会话持续时间记录
      expect(mockAnalyticsService.histogram).toHaveBeenCalledWith(
        'session_duration',
        expect.any(Number),
        expect.objectContaining({
          sessionId
        })
      );
    });
  });

  /**
   * 告警系统测试
   */
  describe('Alerting System', () => {
    it('应该触发响应时间告警', async () => {
      // 设置告警规则
      const alertRule: AlertRule = {
        id: 'alert-1',
        name: '响应时间告警',
        description: 'API响应时间过长',
        metric: 'response_time',
        threshold: 1000, // 1秒
        operator: 'gt',
        timeWindow: 5,
        severity: 'high',
        enabled: true,
        endpoints: ['/api/courses'],
        notificationChannels: ['email', 'slack'],
        cooldownPeriod: 10,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };
      
      const configWithAlert = {
        ...mockEnvConfig,
        alerting: {
          enabled: true,
          rules: [alertRule]
        }
      };
      (envConfig as MockEnvConfig) = { monitoring: configWithAlert };
      
      // Mock 长响应时间
      let callCount = 0;
      mockPerformance.now.mockImplementation(() => {
        callCount++;
        return callCount === 1 ? 1000 : 2500; // 1500ms响应时间
      });
      
      const req = createMockRequest({
        method: 'GET',
        url: '/api/courses'
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();
      
      const middleware = apiMonitoringMiddleware();
      await middleware(req, res, next);
      
      res.statusCode = 200;
      (res as MockResponse).emit('finish');
      
      // 验证告警触发
      expect(mockNotificationService.sendAlert).toHaveBeenCalledWith(
        expect.objectContaining({
          rule: alertRule,
          metric: 'response_time',
          value: 1500,
          threshold: 1000,
          endpoint: '/api/courses'
        })
      );
    });

    it('应该触发错误率告警', async () => {
      const alertRule: AlertRule = {
        id: 'alert-2',
        name: '错误率告警',
        description: 'API错误率过高',
        metric: 'error_rate',
        threshold: 0.1, // 10%
        operator: 'gt',
        timeWindow: 5,
        severity: 'critical',
        enabled: true,
        notificationChannels: ['email', 'slack', 'webhook'],
        cooldownPeriod: 5,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };
      
      const configWithAlert = {
        ...mockEnvConfig,
        alerting: {
          enabled: true,
          rules: [alertRule]
        }
      };
      (envConfig as MockEnvConfig) = { monitoring: configWithAlert };
      
      // Mock 高错误率
      mockCacheService.hget.mockResolvedValue(JSON.stringify({
        requestCount: 100,
        errorCount: 15 // 15%错误率
      }));
      
      const req = createMockRequest({
        method: 'GET',
        url: '/api/courses'
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();
      
      const middleware = apiMonitoringMiddleware();
      await middleware(req, res, next);
      
      res.statusCode = 500;
      (res as MockResponse).emit('finish');
      
      // 验证错误率告警
      expect(mockNotificationService.sendAlert).toHaveBeenCalledWith(
        expect.objectContaining({
          rule: alertRule,
          metric: 'error_rate',
          value: expect.closeTo(0.16, 0.01), // (15+1)/(100+1)
          threshold: 0.1
        })
      );
    });

    it('应该遵守告警冷却期', async () => {
      const alertRule: AlertRule = {
        id: 'alert-3',
        name: '内存使用告警',
        description: '内存使用过高',
        metric: 'memory_usage',
        threshold: 100 * 1024 * 1024, // 100MB
        operator: 'gt',
        timeWindow: 5,
        severity: 'medium',
        enabled: true,
        notificationChannels: ['email'],
        cooldownPeriod: 10, // 10分钟冷却期
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };
      
      // Mock 最近已发送告警
      mockCacheService.get.mockResolvedValue(
        (Date.now() - 5 * 60 * 1000).toString() // 5分钟前发送过告警
      );
      
      // Mock 高内存使用
      jest.spyOn(process, 'memoryUsage').mockReturnValue({
        rss: 150 * 1024 * 1024, // 150MB
        heapUsed: 120 * 1024 * 1024,
        heapTotal: 130 * 1024 * 1024,
        external: 10 * 1024 * 1024,
        arrayBuffers: 5 * 1024 * 1024
      });
      
      const configWithAlert = {
        ...mockEnvConfig,
        alerting: {
          enabled: true,
          rules: [alertRule]
        }
      };
      (envConfig as MockEnvConfig) = { monitoring: configWithAlert };
      
      const req = createMockRequest({
        method: 'GET',
        url: '/api/courses'
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();
      
      const middleware = apiMonitoringMiddleware();
      await middleware(req, res, next);
      
      res.statusCode = 200;
      (res as MockResponse).emit('finish');
      
      // 验证告警被冷却期阻止
      expect(mockNotificationService.sendAlert).not.toHaveBeenCalled();
    });
  });

  /**
   * 数据聚合测试
   */
  describe('Data Aggregation', () => {
    it('应该聚合时间窗口内的指标', async () => {
      const endpoint = '/api/courses';
      const method = 'GET';
      const timeWindow = '2024-01-01T10:00:00Z';
      
      // 模拟多个请求
      const requests = Array.from({ length: 5 }, (_, i) => ({
        responseTime: 100 + i * 10,
        statusCode: i === 4 ? 500 : 200
      }));
      
      for (const request of requests) {
        const req = createMockRequest({ method, url: endpoint }) as Request;
        const res = createMockResponse() as Response;
        const next = createMockNext();
        
        // Mock 响应时间
        let callCount = 0;
        mockPerformance.now.mockImplementation(() => {
          callCount++;
          return callCount === 1 ? 1000 : 1000 + request.responseTime;
        });
        
        const middleware = apiMonitoringMiddleware();
        await middleware(req, res, next);
        
        res.statusCode = request.statusCode;
        (res as MockResponse).emit('finish');
      }
      
      // 验证聚合指标存储
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('api_metrics_aggregated');
      expect(mockSupabaseClient.from().insert).toHaveBeenCalled();
    });

    it('应该计算百分位数', async () => {
      const responseTimes = [50, 100, 150, 200, 250, 300, 350, 400, 450, 500];
      
      // Mock 缓存中的响应时间数据
      mockCacheService.zrange.mockResolvedValue(
        responseTimes.map(time => time.toString())
      );
      
      const req = createMockRequest({
        method: 'GET',
        url: '/api/courses'
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();
      
      const middleware = apiMonitoringMiddleware();
      await middleware(req, res, next);
      
      res.statusCode = 200;
      (res as MockResponse).emit('finish');
      
      // 验证百分位数计算
      expect(mockAnalyticsService.gauge).toHaveBeenCalledWith(
        'api_response_time_p50',
        275, // 50th percentile
        expect.any(Object)
      );
      
      expect(mockAnalyticsService.gauge).toHaveBeenCalledWith(
        'api_response_time_p95',
        475, // 95th percentile
        expect.any(Object)
      );
      
      expect(mockAnalyticsService.gauge).toHaveBeenCalledWith(
        'api_response_time_p99',
        495, // 99th percentile
        expect.any(Object)
      );
    });

    it('应该计算吞吐量', async () => {
      const endpoint = '/api/courses';
      const method = 'GET';
      
      // Mock 时间窗口内的请求计数
      mockCacheService.get.mockResolvedValue('50'); // 5分钟内50个请求
      
      const req = createMockRequest({ method, url: endpoint }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();
      
      const middleware = apiMonitoringMiddleware();
      await middleware(req, res, next);
      
      res.statusCode = 200;
      (res as MockResponse).emit('finish');
      
      // 验证吞吐量计算 (51 requests / 5 minutes = 10.2 requests per minute)
      expect(mockAnalyticsService.gauge).toHaveBeenCalledWith(
        'api_throughput',
        expect.closeTo(10.2, 0.1),
        expect.objectContaining({
          endpoint,
          method,
          unit: 'requests_per_minute'
        })
      );
    });
  });

  /**
   * 性能测试
   */
  describe('Performance Tests', () => {
    it('应该高效处理监控数据', async () => {
      const req = createMockRequest({
        method: 'GET',
        url: '/api/courses'
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();
      
      const startTime = Date.now();
      const middleware = apiMonitoringMiddleware();
      await middleware(req, res, next);
      
      res.statusCode = 200;
      (res as MockResponse).emit('finish');
      
      const processingTime = Date.now() - startTime;
      
      expect(processingTime).toBeLessThan(50); // 50ms内完成
      expect(next).toHaveBeenCalledWith();
    });

    it('应该有效利用缓存', async () => {
      const endpoint = '/api/courses';
      const method = 'GET';
      
      // 第一次请求
      const req1 = createMockRequest({ method, url: endpoint }) as Request;
      const res1 = createMockResponse() as Response;
      const next1 = createMockNext();
      
      const middleware = apiMonitoringMiddleware();
      await middleware(req1, res1, next1);
      
      res1.statusCode = 200;
      (res1 as MockResponse).emit('finish');
      
      // 第二次请求
      const req2 = createMockRequest({ method, url: endpoint }) as Request;
      const res2 = createMockResponse() as Response;
      const next2 = createMockNext();
      
      await middleware(req2, res2, next2);
      
      res2.statusCode = 200;
      (res2 as MockResponse).emit('finish');
      
      // 验证缓存使用
      expect(mockCacheService.hget).toHaveBeenCalledWith(
        `metrics:${endpoint}:${method}`,
        'performance'
      );
      
      expect(mockCacheService.hset).toHaveBeenCalledTimes(2);
    });

    it('应该优化内存使用', async () => {
      const requests = Array.from({ length: 100 }, (_, i) => ({
        method: 'GET',
        url: `/api/courses/${i}`
      }));
      
      const initialMemory = process.memoryUsage().heapUsed;
      
      for (const requestData of requests) {
        const req = createMockRequest(requestData) as Request;
        const res = createMockResponse() as Response;
        const next = createMockNext();
        
        const middleware = apiMonitoringMiddleware();
        await middleware(req, res, next);
        
        res.statusCode = 200;
        (res as MockResponse).emit('finish');
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // 内存增长应该控制在合理范围内
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024); // 10MB
    });
  });

  /**
   * 错误处理测试
   */
  describe('Error Handling', () => {
    it('应该处理缓存服务错误', async () => {
      mockCacheService.get.mockRejectedValue(new Error('Cache service unavailable'));
      
      const req = createMockRequest({
        method: 'GET',
        url: '/api/courses'
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();
      
      const middleware = apiMonitoringMiddleware();
      await middleware(req, res, next);
      
      expect(next).toHaveBeenCalledWith();
      
      res.statusCode = 200;
      (res as MockResponse).emit('finish');
      
      // 验证降级处理
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Cache service error'),
        expect.any(Object)
      );
      
      // 验证仍然记录基础指标
      expect(mockAnalyticsService.track).toHaveBeenCalled();
    });

    it('应该处理数据库连接错误', async () => {
      mockSupabaseClient.from().then.mockRejectedValue(new Error('Database connection failed'));
      
      const req = createMockRequest({
        method: 'GET',
        url: '/api/courses'
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();
      
      const middleware = apiMonitoringMiddleware();
      await middleware(req, res, next);
      
      expect(next).toHaveBeenCalledWith();
      
      res.statusCode = 200;
      (res as MockResponse).emit('finish');
      
      // 验证错误处理
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Database error in monitoring'),
        expect.any(Object)
      );
    });

    it('应该处理告警服务错误', async () => {
      mockNotificationService.sendAlert.mockRejectedValue(new Error('Notification service failed'));
      
      const alertRule: AlertRule = {
        id: 'alert-1',
        name: '测试告警',
        description: '测试告警规则',
        metric: 'response_time',
        threshold: 100,
        operator: 'gt',
        timeWindow: 5,
        severity: 'high',
        enabled: true,
        notificationChannels: ['email'],
        cooldownPeriod: 10,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };
      
      const configWithAlert = {
        ...mockEnvConfig,
        alerting: {
          enabled: true,
          rules: [alertRule]
        }
      };
      (envConfig as MockEnvConfig) = { monitoring: configWithAlert };
      
      // Mock 长响应时间
      let callCount = 0;
      mockPerformance.now.mockImplementation(() => {
        callCount++;
        return callCount === 1 ? 1000 : 1200; // 200ms响应时间
      });
      
      const req = createMockRequest({
        method: 'GET',
        url: '/api/courses'
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();
      
      const middleware = apiMonitoringMiddleware();
      await middleware(req, res, next);
      
      res.statusCode = 200;
      (res as MockResponse).emit('finish');
      
      // 验证告警错误处理
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Alert notification failed'),
        expect.any(Object)
      );
    });

    it('应该处理监控配置错误', async () => {
      // 设置无效配置
      (envConfig as MockEnvConfig) = { monitoring: null };
      
      const req = createMockRequest({
        method: 'GET',
        url: '/api/courses'
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();
      
      const middleware = apiMonitoringMiddleware();
      await middleware(req, res, next);
      
      expect(next).toHaveBeenCalledWith();
      
      res.statusCode = 200;
      (res as MockResponse).emit('finish');
      
      // 验证配置错误处理
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Monitoring configuration invalid'),
        expect.any(Object)
      );
    });
  });
});