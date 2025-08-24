/**
 * API监控中间件单元测试
 * 
 * 测试覆盖范围：
 * 1. API请求监控和统计
 * 2. 响应时间跟踪
 * 3. 错误率统计
 * 4. 请求频率限制
 * 5. 用户行为分析
 * 6. API性能指标收集
 * 7. 实时监控数据
 * 8. 异常检测和报警
 * 9. 监控数据存储
 * 10. 监控仪表板数据
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { Request, Response, NextFunction } from 'express';
import { testUtils } from '../setup';
import { envConfig } from '@/utils/envConfig';
import { errorHandler } from '@/utils/errorHandler';
import { monitoringService } from '@/services/monitoringService';
import { userService } from '@/services/userService';
import { createClient } from '@supabase/supabase-js';
import * as crypto from 'node:crypto';
import * as uuid from 'uuid';
import * as moment from 'moment';
import * as redis from 'redis';
import * as lodash from 'lodash';
import * as rateLimiterFlexible from 'rate-limiter-flexible';
import * as geoipLite from 'geoip-lite';
import * as useragent from 'useragent';

// 模拟依赖
jest.mock('@/utils/envConfig');
jest.mock('@/utils/errorHandler');
jest.mock('@/services/monitoringService');
jest.mock('@/services/userService');
jest.mock('@supabase/supabase-js');
jest.mock('node:crypto');
jest.mock('uuid');
jest.mock('moment');
jest.mock('redis');
jest.mock('lodash');
jest.mock('rate-limiter-flexible');
jest.mock('geoip-lite');
jest.mock('useragent');

const mockEnvConfig = {
  API_MONITORING: {
    enabled: true,
    collectMetrics: true,
    trackUserBehavior: true,
    enableRateLimiting: true,
    enableGeoTracking: true,
    enableUserAgentParsing: true,
    alertThresholds: {
      errorRate: 5, // 5%
      responseTime: 2000, // 2秒
      requestRate: 1000 // 每分钟1000请求
    },
    excludePaths: ['/health', '/metrics'],
    sensitiveHeaders: ['authorization', 'cookie', 'x-api-key']
  },
  REDIS: {
    host: 'localhost',
    port: 6379,
    password: 'redis-password',
    db: 2
  },
  SUPABASE: {
    url: 'https://project.supabase.co',
    anonKey: 'supabase-anon-key',
    serviceRoleKey: 'supabase-service-role-key'
  }
};

const mockMonitoringService = {
  recordHttpRequest: jest.fn(),
  recordError: jest.fn(),
  recordLatency: jest.fn(),
  recordBusinessMetric: jest.fn(),
  triggerAlert: jest.fn()
};

const mockUserService = {
  getUserById: jest.fn(),
  updateUserActivity: jest.fn()
};

const mockErrorHandler = {
  createError: jest.fn(),
  logError: jest.fn(),
  handleError: jest.fn()
};

// Supabase模拟
const mockSupabase = {
  from: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    single: jest.fn(),
    then: jest.fn()
  })),
  rpc: jest.fn()
};

// 其他依赖模拟
const mockCrypto = {
  randomUUID: jest.fn()
};

const mockUuid = {
  v4: jest.fn()
};

const mockMoment = jest.fn(() => ({
  format: jest.fn(),
  toISOString: jest.fn(),
  valueOf: jest.fn(),
  diff: jest.fn(),
  add: jest.fn().mockReturnThis(),
  subtract: jest.fn().mockReturnThis()
}));

const mockRedis = {
  get: jest.fn(),
  set: jest.fn(),
  incr: jest.fn(),
  decr: jest.fn(),
  hget: jest.fn(),
  hset: jest.fn(),
  hincrby: jest.fn(),
  hgetall: jest.fn(),
  zadd: jest.fn(),
  zrem: jest.fn(),
  zrange: jest.fn(),
  zcount: jest.fn(),
  expire: jest.fn(),
  del: jest.fn(),
  exists: jest.fn(),
  lpush: jest.fn(),
  ltrim: jest.fn(),
  lrange: jest.fn()
};

const mockLodash = {
  pick: jest.fn(),
  omit: jest.fn(),
  merge: jest.fn(),
  groupBy: jest.fn(),
  sortBy: jest.fn(),
  throttle: jest.fn((fn) => fn),
  debounce: jest.fn((fn) => fn)
};

const mockRateLimiter = {
  RateLimiterRedis: jest.fn(() => ({
    consume: jest.fn(),
    get: jest.fn(),
    reset: jest.fn()
  }))
};

const mockGeoip = {
  lookup: jest.fn()
};

const mockUseragent = {
  parse: jest.fn()
};

// 导入被测试的模块
import {
  ApiMonitor,
  createApiMonitorMiddleware,
  getApiStats,
  getRealtimeMetrics,
  generateApiReport
} from '@/middleware/apiMonitor';

describe('API监控中间件', () => {
  let apiMonitor: ApiMonitor;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    // 重置所有模拟
    jest.clearAllMocks();
    
    // 设置模拟返回值
    jest.mocked(envConfig).mockReturnValue(mockEnvConfig);
    jest.mocked(errorHandler).mockReturnValue(mockErrorHandler);
    jest.mocked(monitoringService).mockReturnValue(mockMonitoringService);
    jest.mocked(userService).mockReturnValue(mockUserService);
    
    // 设置Supabase模拟
    jest.mocked(createClient).mockReturnValue(mockSupabase);
    
    // 设置其他依赖模拟
    jest.mocked(crypto).mockReturnValue(mockCrypto);
    jest.mocked(uuid).mockReturnValue(mockUuid);
    jest.mocked(moment).mockReturnValue(mockMoment);
    jest.mocked(redis.createClient).mockReturnValue(mockRedis);
    jest.mocked(lodash).mockReturnValue(mockLodash);
    jest.mocked(rateLimiterFlexible).mockReturnValue(mockRateLimiter);
    jest.mocked(geoipLite).mockReturnValue(mockGeoip);
    jest.mocked(useragent).mockReturnValue(mockUseragent);
    
    // 创建API监控实例
    apiMonitor = new ApiMonitor();
    
    // 设置默认模拟返回值
    mockCrypto.randomUUID.mockReturnValue('request-123');
    mockUuid.v4.mockReturnValue('request-123');
    
    mockMoment().format.mockReturnValue('2023-01-01T12:00:00Z');
    mockMoment().toISOString.mockReturnValue('2023-01-01T12:00:00.000Z');
    mockMoment().valueOf.mockReturnValue(1672574400000);
    mockMoment().diff.mockReturnValue(150); // 150ms响应时间
    
    // Redis默认响应
    mockRedis.get.mockResolvedValue(null);
    mockRedis.set.mockResolvedValue('OK');
    mockRedis.incr.mockResolvedValue(1);
    mockRedis.hset.mockResolvedValue(1);
    mockRedis.hincrby.mockResolvedValue(1);
    mockRedis.zadd.mockResolvedValue(1);
    mockRedis.lpush.mockResolvedValue(1);
    
    // 地理位置模拟
    mockGeoip.lookup.mockReturnValue({
      country: 'CN',
      region: 'BJ',
      city: 'Beijing',
      ll: [39.9042, 116.4074],
      timezone: 'Asia/Shanghai'
    });
    
    // User Agent解析模拟
    mockUseragent.parse.mockReturnValue({
      family: 'Chrome',
      major: '91',
      minor: '0',
      patch: '4472',
      os: {
        family: 'Windows',
        major: '10'
      },
      device: {
        family: 'Other'
      }
    });
    
    // 速率限制器模拟
    mockRateLimiter.RateLimiterRedis().consume.mockResolvedValue({
      msBeforeNext: 0,
      remainingHits: 99,
      totalHits: 1
    });
    
    // Supabase默认响应
    mockSupabase.from().insert().mockResolvedValue({
      data: [{ id: 'log-123' }],
      error: null
    });
    
    mockSupabase.rpc.mockResolvedValue({
      data: {
        totalRequests: 1000,
        avgResponseTime: 250,
        errorRate: 2.5,
        topEndpoints: ['/api/users', '/api/posts']
      },
      error: null
    });
    
    // 创建模拟的Express请求和响应对象
    mockReq = {
      method: 'GET',
      url: '/api/users',
      path: '/api/users',
      originalUrl: '/api/users?page=1',
      headers: {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'authorization': 'Bearer token123',
        'content-type': 'application/json',
        'x-forwarded-for': '192.168.1.100'
      },
      ip: '192.168.1.100',
      query: { page: '1' },
      body: {},
      user: {
        id: 'user-123',
        email: 'test@example.com'
      }
    };
    
    mockRes = {
      statusCode: 200,
      getHeaders: jest.fn().mockReturnValue({
        'content-type': 'application/json',
        'content-length': '1024'
      }),
      on: jest.fn(),
      once: jest.fn(),
      end: jest.fn()
    };
    
    mockNext = jest.fn();
  });

  afterEach(() => {
    if (apiMonitor) {
      apiMonitor.destroy();
    }
  });

  describe('中间件初始化', () => {
    it('应该正确初始化API监控', async () => {
      await apiMonitor.initialize();
      
      expect(apiMonitor).toBeDefined();
      expect(apiMonitor.supabase).toBeDefined();
      expect(apiMonitor.redis).toBeDefined();
      expect(apiMonitor.rateLimiter).toBeDefined();
    });

    it('应该验证配置参数', () => {
      expect(apiMonitor.config).toBeDefined();
      expect(apiMonitor.config.enabled).toBe(true);
      expect(apiMonitor.config.collectMetrics).toBe(true);
      expect(apiMonitor.config.alertThresholds.errorRate).toBe(5);
    });

    it('应该初始化Redis连接', async () => {
      await apiMonitor.initialize();
      
      expect(apiMonitor.redis).toBeDefined();
    });

    it('应该初始化速率限制器', async () => {
      await apiMonitor.initialize();
      
      expect(apiMonitor.rateLimiter).toBeDefined();
      expect(mockRateLimiter.RateLimiterRedis).toHaveBeenCalled();
    });
  });

  describe('请求监控', () => {
    beforeEach(async () => {
      await apiMonitor.initialize();
    });

    it('应该记录API请求', async () => {
      const middleware = apiMonitor.createMiddleware();
      
      // 模拟响应结束
      const endCallback = jest.fn();
      mockRes.on = jest.fn((event, callback) => {
        if (event === 'finish') {
          endCallback.mockImplementation(callback);
        }
      });
      
      interface MockRequest extends Partial<Request> {
        path: string;
        method: string;
        headers: Record<string, string>;
        ip: string;
        user?: { id: string };
      }
      
      interface MockResponse extends Partial<Response> {
        statusCode: number;
        on: jest.Mock;
      }
      
      await middleware(mockReq as MockRequest, mockRes as MockResponse, mockNext);
      
      // 触发响应结束
      endCallback();
      
      expect(mockNext).toHaveBeenCalled();
      expect(mockMonitoringService.recordHttpRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          path: '/api/users',
          statusCode: 200,
          duration: expect.any(Number),
          userAgent: expect.any(String),
          ip: '192.168.1.100',
          timestamp: expect.any(Date)
        })
      );
    });

    it('应该跳过排除的路径', async () => {
      mockReq.path = '/health';
      
      const middleware = apiMonitor.createMiddleware();
      await middleware(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(mockMonitoringService.recordHttpRequest).not.toHaveBeenCalled();
    });

    it('应该记录请求详细信息', async () => {
      const middleware = apiMonitor.createMiddleware();
      
      const endCallback = jest.fn();
      mockRes.on = jest.fn((event, callback) => {
        if (event === 'finish') {
          endCallback.mockImplementation(callback);
        }
      });
      
      await middleware(mockReq as Request, mockRes as Response, mockNext);
      endCallback();
      
      expect(mockSupabase.from).toHaveBeenCalledWith('api_logs');
      expect(mockSupabase.from().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: expect.any(String),
          method: 'GET',
          path: '/api/users',
          statusCode: 200,
          responseTime: expect.any(Number),
          userAgent: expect.any(String),
          ipAddress: '192.168.1.100',
          userId: 'user-123'
        })
      );
    });

    it('应该解析地理位置信息', async () => {
      const middleware = apiMonitor.createMiddleware();
      
      const endCallback = jest.fn();
      mockRes.on = jest.fn((event, callback) => {
        if (event === 'finish') {
          endCallback.mockImplementation(callback);
        }
      });
      
      await middleware(mockReq as Request, mockRes as Response, mockNext);
      endCallback();
      
      expect(mockGeoip.lookup).toHaveBeenCalledWith('192.168.1.100');
      expect(mockSupabase.from().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          geoLocation: {
            country: 'CN',
            region: 'BJ',
            city: 'Beijing'
          }
        })
      );
    });

    it('应该解析User Agent信息', async () => {
      const middleware = apiMonitor.createMiddleware();
      
      const endCallback = jest.fn();
      mockRes.on = jest.fn((event, callback) => {
        if (event === 'finish') {
          endCallback.mockImplementation(callback);
        }
      });
      
      await middleware(mockReq as Request, mockRes as Response, mockNext);
      endCallback();
      
      expect(mockUseragent.parse).toHaveBeenCalled();
      expect(mockSupabase.from().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          userAgent: {
            browser: 'Chrome',
            version: '91.0.4472',
            os: 'Windows 10',
            device: 'Other'
          }
        })
      );
    });

    it('应该过滤敏感头信息', async () => {
      const middleware = apiMonitor.createMiddleware();
      
      const endCallback = jest.fn();
      mockRes.on = jest.fn((event, callback) => {
        if (event === 'finish') {
          endCallback.mockImplementation(callback);
        }
      });
      
      await middleware(mockReq as Request, mockRes as Response, mockNext);
      endCallback();
      
      const insertCall = mockSupabase.from().insert.mock.calls[0][0];
      expect(insertCall.headers).not.toHaveProperty('authorization');
      expect(insertCall.headers).toHaveProperty('content-type');
    });
  });

  describe('实时指标收集', () => {
    beforeEach(async () => {
      await apiMonitor.initialize();
    });

    it('应该更新实时请求计数', async () => {
      await apiMonitor.updateRealtimeMetrics({
        method: 'GET',
        path: '/api/users',
        statusCode: 200,
        responseTime: 150
      });
      
      expect(mockRedis.hincrby).toHaveBeenCalledWith(
        'api_metrics:realtime',
        'total_requests',
        1
      );
      
      expect(mockRedis.hincrby).toHaveBeenCalledWith(
        'api_metrics:realtime',
        'requests_GET',
        1
      );
      
      expect(mockRedis.hincrby).toHaveBeenCalledWith(
        'api_metrics:realtime',
        'status_2xx',
        1
      );
    });

    it('应该记录响应时间统计', async () => {
      await apiMonitor.updateRealtimeMetrics({
        method: 'POST',
        path: '/api/posts',
        statusCode: 201,
        responseTime: 250
      });
      
      expect(mockRedis.zadd).toHaveBeenCalledWith(
        'api_metrics:response_times',
        expect.any(Number), // timestamp
        250
      );
      
      expect(mockRedis.lpush).toHaveBeenCalledWith(
        'api_metrics:recent_response_times',
        250
      );
    });

    it('应该记录端点访问统计', async () => {
      await apiMonitor.updateRealtimeMetrics({
        method: 'GET',
        path: '/api/users',
        statusCode: 200,
        responseTime: 150
      });
      
      expect(mockRedis.hincrby).toHaveBeenCalledWith(
        'api_metrics:endpoints',
        'GET:/api/users',
        1
      );
    });

    it('应该记录错误统计', async () => {
      await apiMonitor.updateRealtimeMetrics({
        method: 'POST',
        path: '/api/posts',
        statusCode: 500,
        responseTime: 100,
        error: new Error('Internal server error')
      });
      
      expect(mockRedis.hincrby).toHaveBeenCalledWith(
        'api_metrics:realtime',
        'total_errors',
        1
      );
      
      expect(mockRedis.hincrby).toHaveBeenCalledWith(
        'api_metrics:realtime',
        'status_5xx',
        1
      );
    });

    it('应该维护时间窗口数据', async () => {
      await apiMonitor.updateRealtimeMetrics({
        method: 'GET',
        path: '/api/users',
        statusCode: 200,
        responseTime: 150
      });
      
      // 应该清理旧数据
      expect(mockRedis.ltrim).toHaveBeenCalledWith(
        'api_metrics:recent_response_times',
        0,
        999 // 保留最近1000条记录
      );
    });
  });

  describe('速率限制', () => {
    beforeEach(async () => {
      await apiMonitor.initialize();
    });

    it('应该检查速率限制', async () => {
      const result = await apiMonitor.checkRateLimit({
        ip: '192.168.1.100',
        userId: 'user-123',
        endpoint: '/api/users'
      });
      
      expect(result.allowed).toBe(true);
      expect(result.remainingRequests).toBe(99);
      
      expect(mockRateLimiter.RateLimiterRedis().consume).toHaveBeenCalledWith(
        'user-123' // 优先使用用户ID
      );
    });

    it('应该处理速率限制超出', async () => {
      mockRateLimiter.RateLimiterRedis().consume.mockRejectedValue({
        msBeforeNext: 60000,
        remainingHits: 0,
        totalHits: 100
      });
      
      const result = await apiMonitor.checkRateLimit({
        ip: '192.168.1.100',
        userId: 'user-123',
        endpoint: '/api/users'
      });
      
      expect(result.allowed).toBe(false);
      expect(result.retryAfter).toBe(60000);
    });

    it('应该为匿名用户使用IP限制', async () => {
      const result = await apiMonitor.checkRateLimit({
        ip: '192.168.1.100',
        endpoint: '/api/public'
      });
      
      expect(mockRateLimiter.RateLimiterRedis().consume).toHaveBeenCalledWith(
        '192.168.1.100'
      );
    });

    it('应该记录速率限制违规', async () => {
      mockRateLimiter.RateLimiterRedis().consume.mockRejectedValue({
        msBeforeNext: 60000,
        remainingHits: 0,
        totalHits: 100
      });
      
      await apiMonitor.checkRateLimit({
        ip: '192.168.1.100',
        userId: 'user-123',
        endpoint: '/api/users'
      });
      
      expect(mockSupabase.from).toHaveBeenCalledWith('rate_limit_violations');
      expect(mockSupabase.from().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          ipAddress: '192.168.1.100',
          endpoint: '/api/users',
          violationType: 'rate_limit_exceeded'
        })
      );
    });
  });

  describe('用户行为分析', () => {
    beforeEach(async () => {
      await apiMonitor.initialize();
    });

    it('应该跟踪用户会话', async () => {
      await apiMonitor.trackUserSession({
        userId: 'user-123',
        sessionId: 'session-456',
        action: 'api_request',
        endpoint: '/api/users',
        metadata: {
          method: 'GET',
          responseTime: 150
        }
      });
      
      expect(mockRedis.lpush).toHaveBeenCalledWith(
        'user_session:user-123',
        expect.stringContaining('api_request')
      );
      
      expect(mockRedis.expire).toHaveBeenCalledWith(
        'user_session:user-123',
        3600 // 1小时过期
      );
    });

    it('应该分析用户访问模式', async () => {
      const pattern = await apiMonitor.analyzeUserPattern('user-123');
      
      expect(pattern).toBeDefined();
      expect(mockRedis.lrange).toHaveBeenCalledWith(
        'user_session:user-123',
        0,
        -1
      );
    });

    it('应该检测异常行为', async () => {
      // 模拟异常高频请求
      mockRedis.lrange.mockResolvedValue([
        JSON.stringify({ timestamp: Date.now(), action: 'api_request' }),
        JSON.stringify({ timestamp: Date.now() - 1000, action: 'api_request' }),
        JSON.stringify({ timestamp: Date.now() - 2000, action: 'api_request' })
      ]);
      
      const anomaly = await apiMonitor.detectAnomalousActivity('user-123');
      
      expect(anomaly.detected).toBe(true);
      expect(anomaly.type).toBe('high_frequency_requests');
    });

    it('应该更新用户活动统计', async () => {
      await apiMonitor.updateUserActivity({
        userId: 'user-123',
        action: 'api_request',
        endpoint: '/api/users',
        timestamp: new Date()
      });
      
      expect(mockUserService.updateUserActivity).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({
          lastApiCall: expect.any(Date),
          totalApiCalls: expect.any(Number)
        })
      );
    });
  });

  describe('异常检测和报警', () => {
    beforeEach(async () => {
      await apiMonitor.initialize();
    });

    it('应该检测高错误率', async () => {
      // 模拟高错误率数据
      mockRedis.hgetall.mockResolvedValue({
        total_requests: '100',
        total_errors: '10' // 10%错误率
      });
      
      const alert = await apiMonitor.checkErrorRateAlert();
      
      expect(alert.triggered).toBe(true);
      expect(alert.errorRate).toBe(10);
      expect(alert.threshold).toBe(5);
      
      expect(mockMonitoringService.triggerAlert).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'high_error_rate',
          severity: 'high',
          value: 10,
          threshold: 5
        })
      );
    });

    it('应该检测响应时间异常', async () => {
      // 模拟高响应时间数据
      mockRedis.lrange.mockResolvedValue([
        '3000', '2800', '3200', '2900', '3100' // 平均3000ms
      ]);
      
      const alert = await apiMonitor.checkResponseTimeAlert();
      
      expect(alert.triggered).toBe(true);
      expect(alert.avgResponseTime).toBe(3000);
      expect(alert.threshold).toBe(2000);
    });

    it('应该检测请求量异常', async () => {
      // 模拟异常高请求量
      mockRedis.get.mockResolvedValue('1500'); // 每分钟1500请求
      
      const alert = await apiMonitor.checkRequestRateAlert();
      
      expect(alert.triggered).toBe(true);
      expect(alert.requestRate).toBe(1500);
      expect(alert.threshold).toBe(1000);
    });

    it('应该检测端点异常', async () => {
      // 模拟某个端点异常
      mockSupabase.rpc.mockResolvedValue({
        data: [
          {
            endpoint: '/api/users',
            error_rate: 15.5,
            avg_response_time: 2500
          }
        ],
        error: null
      });
      
      const alerts = await apiMonitor.checkEndpointAnomalies();
      
      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts[0].endpoint).toBe('/api/users');
      expect(alerts[0].issues).toContain('high_error_rate');
      expect(alerts[0].issues).toContain('slow_response');
    });
  });

  describe('统计数据查询', () => {
    beforeEach(async () => {
      await apiMonitor.initialize();
    });

    it('应该获取API统计信息', async () => {
      const stats = await apiMonitor.getApiStats({
        startTime: new Date('2023-01-01'),
        endTime: new Date('2023-01-02'),
        groupBy: 'hour'
      });
      
      expect(stats).toBeDefined();
      expect(stats.totalRequests).toBe(1000);
      expect(stats.avgResponseTime).toBe(250);
      expect(stats.errorRate).toBe(2.5);
      
      expect(mockSupabase.rpc).toHaveBeenCalledWith('get_api_stats', {
        start_time: '2023-01-01T00:00:00.000Z',
        end_time: '2023-01-02T00:00:00.000Z',
        group_by: 'hour'
      });
    });

    it('应该获取端点排行', async () => {
      const topEndpoints = await apiMonitor.getTopEndpoints({
        limit: 10,
        sortBy: 'request_count',
        timeRange: '24h'
      });
      
      expect(topEndpoints).toBeDefined();
      expect(Array.isArray(topEndpoints)).toBe(true);
      
      expect(mockSupabase.rpc).toHaveBeenCalledWith('get_top_endpoints', {
        limit_count: 10,
        sort_by: 'request_count',
        time_range: '24h'
      });
    });

    it('应该获取用户活动统计', async () => {
      const userStats = await apiMonitor.getUserActivityStats({
        userId: 'user-123',
        timeRange: '7d'
      });
      
      expect(userStats).toBeDefined();
      
      expect(mockSupabase.rpc).toHaveBeenCalledWith('get_user_activity_stats', {
        user_id: 'user-123',
        time_range: '7d'
      });
    });

    it('应该获取实时指标', async () => {
      mockRedis.hgetall.mockResolvedValue({
        total_requests: '1000',
        total_errors: '25',
        requests_GET: '600',
        requests_POST: '300',
        status_2xx: '900',
        status_4xx: '75',
        status_5xx: '25'
      });
      
      const realtimeMetrics = await apiMonitor.getRealtimeMetrics();
      
      expect(realtimeMetrics).toBeDefined();
      expect(realtimeMetrics.totalRequests).toBe(1000);
      expect(realtimeMetrics.totalErrors).toBe(25);
      expect(realtimeMetrics.errorRate).toBe(2.5);
      
      expect(mockRedis.hgetall).toHaveBeenCalledWith('api_metrics:realtime');
    });
  });

  describe('报告生成', () => {
    beforeEach(async () => {
      await apiMonitor.initialize();
    });

    it('应该生成API性能报告', async () => {
      const report = await apiMonitor.generatePerformanceReport({
        period: 'weekly',
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-01-07')
      });
      
      expect(report).toBeDefined();
      expect(report.summary).toBeDefined();
      expect(report.trends).toBeDefined();
      expect(report.topEndpoints).toBeDefined();
      expect(report.errorAnalysis).toBeDefined();
      expect(report.recommendations).toBeDefined();
    });

    it('应该生成用户行为报告', async () => {
      const report = await apiMonitor.generateUserBehaviorReport({
        timeRange: '30d',
        includeAnomalies: true
      });
      
      expect(report).toBeDefined();
      expect(report.userActivity).toBeDefined();
      expect(report.accessPatterns).toBeDefined();
      expect(report.anomalies).toBeDefined();
    });

    it('应该生成安全报告', async () => {
      const report = await apiMonitor.generateSecurityReport({
        timeRange: '7d',
        includeRateLimitViolations: true,
        includeAnomalousActivity: true
      });
      
      expect(report).toBeDefined();
      expect(report.rateLimitViolations).toBeDefined();
      expect(report.suspiciousActivity).toBeDefined();
      expect(report.securityRecommendations).toBeDefined();
    });
  });

  describe('便捷函数', () => {
    beforeEach(() => {
      // 设置全局API监控实例
      global.apiMonitor = apiMonitor;
    });

    it('createApiMonitorMiddleware 函数应该正常工作', () => {
      const middleware = createApiMonitorMiddleware({
        enabled: true,
        excludePaths: ['/health']
      });
      
      expect(middleware).toBeDefined();
      expect(typeof middleware).toBe('function');
    });

    it('getApiStats 函数应该正常工作', async () => {
      const stats = await getApiStats({
        timeRange: '24h'
      });
      
      expect(stats).toBeDefined();
      expect(apiMonitor.getApiStats).toHaveBeenCalledWith(
        expect.objectContaining({
          timeRange: '24h'
        })
      );
    });

    it('getRealtimeMetrics 函数应该正常工作', async () => {
      const metrics = await getRealtimeMetrics();
      
      expect(metrics).toBeDefined();
      expect(apiMonitor.getRealtimeMetrics).toHaveBeenCalled();
    });

    it('generateApiReport 函数应该正常工作', async () => {
      const report = await generateApiReport({
        type: 'performance',
        period: 'weekly'
      });
      
      expect(report).toBeDefined();
      expect(apiMonitor.generatePerformanceReport).toHaveBeenCalledWith(
        expect.objectContaining({
          period: 'weekly'
        })
      );
    });
  });

  describe('错误处理', () => {
    beforeEach(async () => {
      await apiMonitor.initialize();
    });

    it('应该处理Redis连接错误', async () => {
      mockRedis.hincrby.mockRejectedValue(new Error('Redis connection failed'));
      
      await expect(
        apiMonitor.updateRealtimeMetrics({
          method: 'GET',
          path: '/api/users',
          statusCode: 200,
          responseTime: 150
        })
      ).rejects.toThrow('Redis connection failed');
      
      expect(mockErrorHandler.logError).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'redis_error',
          operation: 'updateRealtimeMetrics'
        })
      );
    });

    it('应该处理数据库存储错误', async () => {
      mockSupabase.from().insert.mockResolvedValue({
        data: null,
        error: new Error('Database insert failed')
      });
      
      const middleware = apiMonitor.createMiddleware();
      
      const endCallback = jest.fn();
      mockRes.on = jest.fn((event, callback) => {
        if (event === 'finish') {
          endCallback.mockImplementation(callback);
        }
      });
      
      await middleware(mockReq as Request, mockRes as Response, mockNext);
      
      await expect(endCallback()).rejects.toThrow('Database insert failed');
    });

    it('应该处理速率限制器错误', async () => {
      mockRateLimiter.RateLimiterRedis().consume.mockRejectedValue(
        new Error('Rate limiter error')
      );
      
      await expect(
        apiMonitor.checkRateLimit({
          ip: '192.168.1.100',
          userId: 'user-123',
          endpoint: '/api/users'
        })
      ).rejects.toThrow('Rate limiter error');
    });

    it('应该处理地理位置解析错误', async () => {
      mockGeoip.lookup.mockImplementation(() => {
        throw new Error('GeoIP lookup failed');
      });
      
      const middleware = apiMonitor.createMiddleware();
      
      const endCallback = jest.fn();
      mockRes.on = jest.fn((event, callback) => {
        if (event === 'finish') {
          endCallback.mockImplementation(callback);
        }
      });
      
      await middleware(mockReq as Request, mockRes as Response, mockNext);
      
      // 应该继续执行，不抛出错误
      expect(() => endCallback()).not.toThrow();
      
      expect(mockErrorHandler.logError).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'geoip_error'
        })
      );
    });
  });

  describe('性能测试', () => {
    beforeEach(async () => {
      await apiMonitor.initialize();
    });

    it('应该高效处理大量请求', async () => {
      const requests = Array.from({ length: 1000 }, (_, i) => ({
        method: 'GET',
        path: `/api/test/${i}`,
        statusCode: 200,
        responseTime: Math.random() * 500
      }));
      
      const { duration } = await testUtils.performanceUtils.measureTime(async () => {
        return Promise.all(requests.map(req => 
          apiMonitor.updateRealtimeMetrics(req)
        ));
      });
      
      expect(duration).toBeLessThan(2000); // 应该在2秒内完成
    });

    it('应该优化统计查询性能', async () => {
      const { duration } = await testUtils.performanceUtils.measureTime(async () => {
        return apiMonitor.getApiStats({
          startTime: new Date(Date.now() - 24 * 60 * 60 * 1000),
          endTime: new Date()
        });
      });
      
      expect(duration).toBeLessThan(1000); // 应该在1秒内完成
    });

    it('应该优化实时指标获取性能', async () => {
      const { duration } = await testUtils.performanceUtils.measureTime(async () => {
        return apiMonitor.getRealtimeMetrics();
      });
      
      expect(duration).toBeLessThan(100); // 应该在100ms内完成
    });
  });
});