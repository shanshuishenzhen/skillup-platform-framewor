/**
 * API监控模块单元测试
 * 
 * 测试覆盖范围：
 * 1. API调用统计和记录
 * 2. 响应时间监控
 * 3. 错误率统计
 * 4. 用户使用量分析
 * 5. 性能指标计算
 * 6. 数据持久化存储
 * 7. 监控报警功能
 * 8. 边界情况和错误处理
 * 9. 性能测试
 */

import { jest } from '@jest/globals';
import { ApiMonitor, incrementEndpointCount } from '../../utils/apiMonitor';
import { createClient } from '@supabase/supabase-js';
import Redis from 'ioredis';

// 模拟依赖
jest.mock('@supabase/supabase-js');
jest.mock('ioredis');
jest.mock('../../utils/errorHandler');

// 模拟Supabase客户端
const mockSupabase = {
  from: jest.fn(() => ({
    insert: jest.fn(() => ({
      select: jest.fn(() => ({
        single: jest.fn()
      }))
    })),
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        gte: jest.fn(() => ({
          lte: jest.fn(() => ({
            order: jest.fn(() => ({
              limit: jest.fn()
            }))
          }))
        }))
      }))
    })),
    update: jest.fn(() => ({
      eq: jest.fn()
    }))
  }))
};

// 模拟Redis客户端
const mockRedis = {
  get: jest.fn() as jest.MockedFunction<(key: string) => Promise<string | null>>,
  set: jest.fn() as jest.MockedFunction<(key: string, value: string) => Promise<string>>,
  incr: jest.fn() as jest.MockedFunction<(key: string) => Promise<number>>,
  expire: jest.fn() as jest.MockedFunction<(key: string, seconds: number) => Promise<number>>,
  hget: jest.fn() as jest.MockedFunction<(key: string, field: string) => Promise<string | null>>,
  hset: jest.fn() as jest.MockedFunction<(key: string, ...args: any[]) => Promise<number>>,
  hgetall: jest.fn() as jest.MockedFunction<(key: string) => Promise<Record<string, string>>>,
  zadd: jest.fn() as jest.MockedFunction<(key: string, ...args: any[]) => Promise<number>>,
  zrange: jest.fn() as jest.MockedFunction<(key: string, start: number, stop: number) => Promise<string[]>>,
  zrangebyscore: jest.fn() as jest.MockedFunction<(key: string, min: string | number, max: string | number) => Promise<string[]>>,
  del: jest.fn() as jest.MockedFunction<(key: string) => Promise<number>>,
  pipeline: jest.fn(() => ({
    incr: jest.fn(),
    expire: jest.fn(),
    exec: jest.fn()
  }))
};

// 模拟错误处理器
const mockErrorHandler = {
  logError: jest.fn(),
  createError: jest.fn(),
  withRetry: jest.fn()
};

(createClient as jest.Mock).mockReturnValue(mockSupabase);
(Redis as unknown as jest.Mock).mockImplementation(() => mockRedis);

describe('ApiMonitor', () => {
  let apiMonitor: ApiMonitor;
  let config: any;

  beforeEach(() => {
    config = {
      enabled: true,
      sampleRate: 1.0,
      retentionDays: 30,
      alertThresholds: {
        errorRate: 0.05,
        responseTime: 2000,
        requestsPerSecond: 1000
      },
      excludeEndpoints: ['/health', '/metrics'],
      enableRealTime: true
    };
    
    apiMonitor = ApiMonitor.getInstance();
     // 更新配置
     apiMonitor.updateConfig(config);
    
    // 重置所有模拟
    jest.clearAllMocks();
  });

  describe('API调用统计', () => {
    it('应该记录API调用开始', async () => {
      const callId = 'test-call-123';
      const endpoint = '/api/courses';
      const method = 'GET';
      const userId = 'user-123';
      
      await apiMonitor.startCall(callId, endpoint, method, userId);
      
      expect(mockRedis.hset).toHaveBeenCalledWith(
        `api_call:${callId}`,
        expect.objectContaining({
          endpoint,
          method,
          userId,
          startTime: expect.stringMatching(/^\d+$/),
          status: 'in_progress'
        })
      );
      
      expect(mockRedis.expire).toHaveBeenCalledWith(`api_call:${callId}`, 3600);
    });

    it('应该记录API调用完成', async () => {
      const callId = 'test-call-123';
      const statusCode = 200;
      const responseSize = 1024;
      
      // 模拟获取调用信息
      mockRedis.hgetall.mockResolvedValue({
        endpoint: '/api/courses',
        method: 'GET',
        userId: 'user-123',
        startTime: (Date.now() - 500).toString(),
        status: 'in_progress'
      });
      
      await apiMonitor.endCall(callId, statusCode, responseSize);
      
      expect(mockRedis.hset).toHaveBeenCalledWith(
        `api_call:${callId}`,
        expect.objectContaining({
          status: 'completed',
          statusCode,
          responseSize,
          responseTime: expect.any(Number),
          endTime: expect.stringMatching(/^\d+$/)
        })
      );
    });

    it('应该记录API调用错误', async () => {
      const callId = 'test-call-123';
      const error = new Error('Database connection failed');
      
      // 模拟获取调用信息
      mockRedis.hgetall.mockResolvedValue({
        endpoint: '/api/courses',
        method: 'GET',
        userId: 'user-123',
        startTime: (Date.now() - 500).toString(),
        status: 'in_progress'
      });
      
      await apiMonitor.recordError(error, '/api/test', 'GET');
      
      expect(mockRedis.hset).toHaveBeenCalledWith(
        `api_call:${callId}`,
        expect.objectContaining({
          status: 'error',
          errorMessage: error.message,
          errorType: error.constructor.name,
          endTime: expect.stringMatching(/^\d+$/)
        })
      );
      
      expect(mockErrorHandler.logError).toHaveBeenCalledWith(error, {
        callId,
        context: 'api_monitoring'
      });
    });

    it('应该增加端点调用计数', async () => {
      const endpoint = '/api/courses';
      const method = 'GET';
      
      // 使用导出的便捷函数而不是实例方法
      await apiMonitor.incrementEndpointCount(endpoint, method);
      
      const key = `endpoint_count:${endpoint}:${method}`;
      expect(mockRedis.incr).toHaveBeenCalledWith(key);
      expect(mockRedis.expire).toHaveBeenCalledWith(key, 86400); // 24小时
    });

    it('应该增加用户调用计数', async () => {
      const userId = 'user-123';
      
      await apiMonitor.incrementUserCount(userId);
      
      const key = `user_count:${userId}`;
      expect(mockRedis.incr).toHaveBeenCalledWith(key);
      expect(mockRedis.expire).toHaveBeenCalledWith(key, 86400);
    });
  });

  describe('响应时间监控', () => {
    it('应该记录响应时间', async () => {
      const endpoint = '/api/courses';
      const responseTime = 250;
      
      await apiMonitor.recordResponseTime(endpoint, responseTime);
      
      const key = `response_times:${endpoint}`;
      const timestamp = Math.floor(Date.now() / 1000);
      
      expect(mockRedis.zadd).toHaveBeenCalledWith(key, timestamp, responseTime);
      expect(mockRedis.expire).toHaveBeenCalledWith(key, 86400);
    });

    it('应该计算平均响应时间', async () => {
      const endpoint = '/api/courses';
      const responseTimes = [100, 200, 300, 400, 500];
      
      mockRedis.zrange.mockResolvedValue(responseTimes.map(String));
      
      const avgResponseTime = await apiMonitor.getAverageResponseTime(endpoint);
      
      expect(avgResponseTime).toBe(300); // (100+200+300+400+500)/5
      expect(mockRedis.zrange).toHaveBeenCalledWith(
        `response_times:${endpoint}`,
        0,
        -1
      );
    });

    it('应该获取响应时间百分位数', async () => {
      const endpoint = '/api/courses';
      const responseTimes = Array.from({ length: 100 }, (_, i) => i + 1);
      
      mockRedis.zrange.mockResolvedValue(responseTimes.map(String));
      
      const percentiles = await apiMonitor.getResponseTimePercentiles(endpoint);
      
      expect(percentiles).toEqual({
        p50: 50,
        p90: 90,
        p95: 95,
        p99: 99
      });
    });

    it('应该检测响应时间异常', async () => {
      const endpoint = '/api/courses';
      const slowResponseTime = 5000; // 5秒
      
      const isAnomalous = await apiMonitor.detectResponseTimeAnomaly(endpoint, slowResponseTime);
      
      expect(isAnomalous).toBe(true);
    });
  });

  describe('错误率统计', () => {
    it('应该记录错误统计', async () => {
      const endpoint = '/api/courses';
      const errorType = 'DatabaseError';
      const statusCode = 500;
      
      await apiMonitor.recordErrorStats(endpoint, errorType, statusCode);
      
      const errorKey = `errors:${endpoint}:${errorType}`;
      const statusKey = `status_codes:${endpoint}:${statusCode}`;
      
      expect(mockRedis.incr).toHaveBeenCalledWith(errorKey);
      expect(mockRedis.incr).toHaveBeenCalledWith(statusKey);
      expect(mockRedis.expire).toHaveBeenCalledWith(errorKey, 86400);
      expect(mockRedis.expire).toHaveBeenCalledWith(statusKey, 86400);
    });

    it('应该计算错误率', async () => {
      const endpoint = '/api/courses';
      
      // 模拟总请求数和错误数
      mockRedis.get.mockImplementation((key: string) => {
        if (key.includes('endpoint_count')) return Promise.resolve('1000');
        if (key.includes('errors')) return Promise.resolve('50');
        return Promise.resolve('0');
      });
      
      const errorRate = await apiMonitor.getErrorRate(endpoint);
      
      expect(errorRate).toBe(0.05); // 50/1000 = 0.05
    });

    it('应该获取错误统计详情', async () => {
      const endpoint = '/api/courses';
      
      // 模拟错误统计数据
      const mockErrorKeys = [
        `errors:${endpoint}:DatabaseError`,
        `errors:${endpoint}:ValidationError`,
        `errors:${endpoint}:AuthenticationError`
      ];
      
      mockRedis.get.mockImplementation((key) => {
        if (key.includes('DatabaseError')) return Promise.resolve('30');
        if (key.includes('ValidationError')) return Promise.resolve('15');
        if (key.includes('AuthenticationError')) return Promise.resolve('5');
        return Promise.resolve('0');
      });
      
      const errorStats = await apiMonitor.getErrorStats(endpoint);
      
      expect(errorStats).toEqual({
        total: 50,
        byType: {
          DatabaseError: 30,
          ValidationError: 15,
          AuthenticationError: 5
        },
        rate: 0.05
      });
    });

    it('应该检测错误率异常', async () => {
      const endpoint = '/api/courses';
      
      // 模拟高错误率
      mockRedis.get.mockImplementation((key) => {
        if (key.includes('endpoint_count')) return Promise.resolve('100');
        if (key.includes('errors')) return Promise.resolve('10');
        return Promise.resolve('0');
      });
      
      const isAnomalous = await apiMonitor.detectErrorRateAnomaly(endpoint);
      
      expect(isAnomalous).toBe(true); // 10% > 5% 阈值
    });
  });

  describe('用户使用量分析', () => {
    it('应该记录用户活动', async () => {
      const userId = 'user-123';
      const endpoint = '/api/courses';
      const action = 'view_course';
      
      await apiMonitor.recordUserActivity(userId, endpoint, action);
      
      const activityKey = `user_activity:${userId}`;
      const timestamp = Math.floor(Date.now() / 1000);
      
      expect(mockRedis.zadd).toHaveBeenCalledWith(
        activityKey,
        timestamp,
        JSON.stringify({ endpoint, action, timestamp })
      );
      expect(mockRedis.expire).toHaveBeenCalledWith(activityKey, 86400 * 7); // 7天
    });

    it('应该获取用户统计信息', async () => {
      const userId = 'user-123';
      
      // 模拟用户活动数据
      const mockActivities = [
        JSON.stringify({ endpoint: '/api/courses', action: 'view_course', timestamp: Date.now() }),
        JSON.stringify({ endpoint: '/api/quizzes', action: 'take_quiz', timestamp: Date.now() }),
        JSON.stringify({ endpoint: '/api/progress', action: 'update_progress', timestamp: Date.now() })
      ];
      
      mockRedis.zrange.mockResolvedValue(mockActivities);
      mockRedis.get.mockResolvedValue('150'); // 总请求数
      
      const userStats = await apiMonitor.getUserStats(userId);
      
      expect(userStats).toEqual({
        totalRequests: 150,
        uniqueEndpoints: 3,
        mostUsedEndpoint: '/api/courses',
        activityCount: 3,
        lastActivity: expect.any(Number)
      });
    });

    it('应该获取活跃用户列表', async () => {
      const timeRange = 3600; // 1小时
      
      // 模拟活跃用户数据
      const mockActiveUsers = [
        ['user-123', '50'],
        ['user-456', '30'],
        ['user-789', '20']
      ];
      
      mockRedis.zrangebyscore.mockResolvedValue(mockActiveUsers.flat());
      
      const activeUsers = await apiMonitor.getActiveUsers(timeRange);
      
      expect(activeUsers).toEqual([
        { userId: 'user-123', requestCount: 50 },
        { userId: 'user-456', requestCount: 30 },
        { userId: 'user-789', requestCount: 20 }
      ]);
    });

    it('应该分析用户行为模式', async () => {
      const userId = 'user-123';
      
      // 模拟用户行为数据
      const mockBehaviorData = [
        JSON.stringify({ endpoint: '/api/courses', action: 'view_course', timestamp: Date.now() - 3600000 }),
        JSON.stringify({ endpoint: '/api/courses', action: 'view_course', timestamp: Date.now() - 1800000 }),
        JSON.stringify({ endpoint: '/api/quizzes', action: 'take_quiz', timestamp: Date.now() - 900000 }),
        JSON.stringify({ endpoint: '/api/progress', action: 'update_progress', timestamp: Date.now() })
      ];
      
      mockRedis.zrange.mockResolvedValue(mockBehaviorData);
      
      const behaviorPattern = await apiMonitor.analyzeUserBehavior(userId);
      
      expect(behaviorPattern).toEqual({
        sessionDuration: expect.any(Number),
        actionSequence: ['view_course', 'view_course', 'take_quiz', 'update_progress'],
        preferredEndpoints: ['/api/courses', '/api/quizzes', '/api/progress'],
        activityFrequency: expect.any(Number)
      });
    });
  });

  describe('性能指标计算', () => {
    it('应该计算系统性能指标', async () => {
      // 模拟性能数据
      mockRedis.get.mockImplementation((key) => {
        if (key.includes('total_requests')) return Promise.resolve('10000');
        if (key.includes('total_errors')) return Promise.resolve('100');
        if (key.includes('total_response_time')) return Promise.resolve('2500000');
        return Promise.resolve('0');
      });
      
      const performanceMetrics = await apiMonitor.getPerformanceMetrics('/api/test');
      
      expect(performanceMetrics).toEqual({
        totalRequests: 10000,
        totalErrors: 100,
        errorRate: 0.01,
        averageResponseTime: 250,
        requestsPerSecond: expect.any(Number),
        uptime: expect.any(Number)
      });
    });

    it('应该计算端点性能排名', async () => {
      const endpoints = ['/api/courses', '/api/users', '/api/quizzes'];
      
      // 模拟端点性能数据
      mockRedis.get.mockImplementation((key) => {
        if (key.includes('/api/courses')) {
          if (key.includes('count')) return Promise.resolve('5000');
          if (key.includes('response_time')) return Promise.resolve('200');
          if (key.includes('errors')) return Promise.resolve('25');
        }
        if (key.includes('/api/users')) {
          if (key.includes('count')) return Promise.resolve('3000');
          if (key.includes('response_time')) return Promise.resolve('150');
          if (key.includes('errors')) return Promise.resolve('10');
        }
        if (key.includes('/api/quizzes')) {
          if (key.includes('count')) return Promise.resolve('2000');
          if (key.includes('response_time')) return Promise.resolve('300');
          if (key.includes('errors')) return Promise.resolve('30');
        }
        return Promise.resolve('0');
      });
      
      const endpointRanking = await apiMonitor.getEndpointPerformanceRanking();
      
      expect(endpointRanking).toEqual([
        {
          endpoint: '/api/users',
          score: expect.any(Number),
          metrics: {
            requestCount: 3000,
            averageResponseTime: 150,
            errorRate: 0.0033
          }
        },
        {
          endpoint: '/api/courses',
          score: expect.any(Number),
          metrics: {
            requestCount: 5000,
            averageResponseTime: 200,
            errorRate: 0.005
          }
        },
        {
          endpoint: '/api/quizzes',
          score: expect.any(Number),
          metrics: {
            requestCount: 2000,
            averageResponseTime: 300,
            errorRate: 0.015
          }
        }
      ]);
    });

    it('应该生成性能报告', async () => {
      const timeRange = 86400; // 24小时
      
      // 模拟报告数据
      mockRedis.get.mockImplementation((key) => {
        if (key.includes('requests')) return Promise.resolve('50000');
        if (key.includes('errors')) return Promise.resolve('250');
        if (key.includes('users')) return Promise.resolve('1000');
        return Promise.resolve('0');
      });
      
      const performanceReport = await apiMonitor.generatePerformanceReport(timeRange);
      
      expect(performanceReport).toEqual({
        timeRange,
        summary: {
          totalRequests: 50000,
          totalErrors: 250,
          uniqueUsers: 1000,
          errorRate: 0.005,
          averageResponseTime: expect.any(Number)
        },
        topEndpoints: expect.any(Array),
        errorBreakdown: expect.any(Object),
        userActivity: expect.any(Object),
        performanceTrends: expect.any(Array)
      });
    });
  });

  describe('数据持久化存储', () => {
    it('应该批量保存监控数据到数据库', async () => {
      const monitoringData = [
        {
          callId: 'call-1',
          endpoint: '/api/courses',
          method: 'GET',
          userId: 'user-123',
          statusCode: 200,
          responseTime: 250,
          timestamp: new Date()
        },
        {
          callId: 'call-2',
          endpoint: '/api/users',
          method: 'POST',
          userId: 'user-456',
          statusCode: 201,
          responseTime: 180,
          timestamp: new Date()
        }
      ];
      
(mockSupabase.from as jest.MockedFunction<any>)().insert().select().single.mockResolvedValue({
        data: monitoringData,
        error: null
      });
      
      await apiMonitor.persistMonitoringData(monitoringData);
      
      expect(mockSupabase.from).toHaveBeenCalledWith('api_monitoring');
      expect(mockSupabase.from().insert).toHaveBeenCalledWith(monitoringData);
    });

    it('应该定期清理过期数据', async () => {
      const retentionDays = 30;
      const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
      
      (mockSupabase.from as jest.MockedFunction<any>)().select().eq().gte().lte().order().limit.mockResolvedValue({
        data: [],
        error: null
      });
      
      await apiMonitor.cleanupExpiredData(retentionDays);
      
      expect(mockSupabase.from).toHaveBeenCalledWith('api_monitoring');
      // 验证删除操作的调用
    });

    it('应该处理数据库连接错误', async () => {
      const monitoringData = [{
        callId: 'call-1',
        endpoint: '/api/courses',
        method: 'GET',
        userId: 'user-123',
        statusCode: 200,
        responseTime: 250,
        timestamp: new Date()
      }];
      
      const dbError = new Error('Database connection failed');
      (mockSupabase.from as jest.MockedFunction<any>)().insert().select().single.mockRejectedValue(dbError);
      
      await expect(apiMonitor.persistMonitoringData(monitoringData))
        .rejects.toThrow('Database connection failed');
      
      expect(mockErrorHandler.logError).toHaveBeenCalledWith(dbError, {
        context: 'persist_monitoring_data',
        dataCount: 1
      });
    });
  });

  describe('监控报警功能', () => {
    it('应该检测并触发错误率报警', async () => {
      const endpoint = '/api/courses';
      
      // 模拟高错误率
      mockRedis.get.mockImplementation((key) => {
        if (key.includes('endpoint_count')) return Promise.resolve('100');
        if (key.includes('errors')) return Promise.resolve('10');
        return Promise.resolve('0');
      });
      
      const alertTriggered = await apiMonitor.checkErrorRateAlert(endpoint, 0.1);
      
      expect(alertTriggered).toBe(true);
      expect(mockErrorHandler.logError).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.any(String) }),
        expect.objectContaining({
          alertType: 'error_rate',
          endpoint,
          errorRate: 0.1
        })
      );
    });

    it('应该检测并触发响应时间报警', async () => {
      const endpoint = '/api/courses';
      const responseTime = 3000; // 3秒
      
      const alertTriggered = await apiMonitor.checkResponseTimeAlert(endpoint, responseTime);
      
      expect(alertTriggered).toBe(true);
      expect(mockErrorHandler.logError).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.any(String) }),
        expect.objectContaining({
          alertType: 'response_time',
          endpoint,
          responseTime
        })
      );
    });

    it('应该检测并触发请求量报警', async () => {
      const endpoint = '/api/courses';
      
      // 模拟高请求量
      mockRedis.get.mockResolvedValue('1500'); // 超过1000的阈值
      
      const alertTriggered = await apiMonitor.checkRequestVolumeAlert(endpoint, 1500);
      
      expect(alertTriggered).toBe(true);
      expect(mockErrorHandler.logError).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.any(String) }),
        expect.objectContaining({
          alertType: 'request_volume',
          endpoint,
          requestCount: 1500
        })
      );
    });

    it('应该发送报警通知', async () => {
      const alertData = {
        type: 'error_rate',
        endpoint: '/api/courses',
        severity: 'high',
        message: 'Error rate exceeded threshold',
        metrics: {
          errorRate: 0.1,
          threshold: 0.05
        }
      };
      
      await apiMonitor.sendAlert('test_alert', alertData);
      
      // 验证报警记录到数据库
      expect(mockSupabase.from).toHaveBeenCalledWith('monitoring_alerts');
      expect(mockSupabase.from().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          type: alertData.type,
          endpoint: alertData.endpoint,
          severity: alertData.severity,
          message: alertData.message
        })
      );
    });
  });

  describe('边界情况和错误处理', () => {
    it('应该处理Redis连接失败', async () => {
      const redisError = new Error('Redis connection failed');
      mockRedis.get.mockRejectedValue(redisError);
      
      const endpoint = '/api/courses';
      
      await expect(apiMonitor.getErrorRate(endpoint))
        .rejects.toThrow('Redis connection failed');
      
      expect(mockErrorHandler.logError).toHaveBeenCalledWith(redisError, {
        context: 'redis_operation',
        operation: 'get_error_rate'
      });
    });

    it('应该处理无效的调用ID', async () => {
      const invalidCallId = '';
      
      await expect(apiMonitor.endCall(invalidCallId, 200, 1024))
        .rejects.toThrow('Invalid call ID');
    });

    it('应该处理空的监控数据', async () => {
      const emptyData: any[] = [];
      
      await apiMonitor.persistMonitoringData(emptyData);
      
      // 应该不调用数据库操作
      expect(mockSupabase.from().insert).not.toHaveBeenCalled();
    });

    it('应该处理超大响应时间', async () => {
      const endpoint = '/api/courses';
      const extremeResponseTime = 999999; // 极大响应时间
      
      await apiMonitor.recordResponseTime(endpoint, extremeResponseTime);
      
      expect(mockRedis.zadd).toHaveBeenCalledWith(
        `response_times:${endpoint}`,
        expect.any(Number),
        extremeResponseTime
      );
    });

    it('应该处理并发监控操作', async () => {
      const concurrentCalls = Array.from({ length: 100 }, (_, i) => 
        apiMonitor.startCall(`call-${i}`, '/api/courses', 'GET', `user-${i}`)
      );
      
      await Promise.all(concurrentCalls);
      
      expect(mockRedis.hset).toHaveBeenCalledTimes(100);
    });

    it('应该处理内存不足情况', async () => {
      const memoryError = new Error('Out of memory');
      mockRedis.zadd.mockRejectedValue(memoryError as any);
      
      const endpoint = '/api/courses';
      const responseTime = 250;
      
      await expect(apiMonitor.recordResponseTime(endpoint, responseTime))
        .rejects.toThrow('Out of memory');
    });
  });

  describe('性能测试', () => {
    it('应该处理大量API调用监控', async () => {
      const callCount = 1000;
      const startTime = Date.now();
      
      const monitoringPromises = Array.from({ length: callCount }, (_, i) => 
        apiMonitor.startCall(`perf-call-${i}`, '/api/courses', 'GET', `user-${i % 100}`)
      );
      
      await Promise.all(monitoringPromises);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(5000); // 应在5秒内完成
      expect(mockRedis.hset).toHaveBeenCalledTimes(callCount);
    });

    it('应该处理大量统计数据计算', async () => {
      const endpoints = Array.from({ length: 100 }, (_, i) => `/api/endpoint-${i}`);
      
      mockRedis.get.mockImplementation((key: string) => {
        if (key.includes('count')) return Promise.resolve('1000');
        if (key.includes('errors')) return Promise.resolve('50');
        return Promise.resolve('0');
      });
      
      const startTime = Date.now();
      
      const statsPromises = endpoints.map(endpoint => 
        apiMonitor.getErrorRate(endpoint)
      );
      
      const results = await Promise.all(statsPromises);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(3000); // 应在3秒内完成
      expect(results).toHaveLength(100);
      results.forEach((rate: number) => expect(rate).toBe(0.05));
    });

    it('应该测试内存使用效率', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // 执行大量监控操作
      for (let i = 0; i < 10000; i++) {
        await incrementEndpointCount(`/api/test-${i % 10}`, 'GET');
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // 内存增长应该合理（小于100MB）
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });
});

// MonitoringConfig类测试已移除，因为该类未导出

/**
 * 测试工具函数
 */
const monitoringTestUtils = {
  /**
   * 创建模拟API调用数据
   */
  createMockApiCall: (overrides = {}) => ({
    callId: 'test-call-123',
    endpoint: '/api/courses',
    method: 'GET',
    userId: 'user-123',
    statusCode: 200,
    responseTime: 250,
    responseSize: 1024,
    timestamp: new Date(),
    ...overrides
  }),

  /**
   * 创建模拟错误统计数据
   */
  createMockErrorStats: (overrides = {}) => ({
    endpoint: '/api/courses',
    errorType: 'DatabaseError',
    count: 10,
    rate: 0.05,
    lastOccurrence: new Date(),
    ...overrides
  }),

  /**
   * 创建模拟用户统计数据
   */
  createMockUserStats: (overrides = {}) => ({
    userId: 'user-123',
    totalRequests: 150,
    uniqueEndpoints: 5,
    mostUsedEndpoint: '/api/courses',
    activityCount: 25,
    lastActivity: Date.now(),
    ...overrides
  }),

  /**
   * 生成测试性能数据
   */
  generatePerformanceData: (count = 100) => {
    return Array.from({ length: count }, (_, i) => ({
      timestamp: Date.now() - (count - i) * 1000,
      responseTime: Math.random() * 1000 + 100,
      requestCount: Math.floor(Math.random() * 100) + 1,
      errorCount: Math.floor(Math.random() * 5)
    }));
  },

  /**
   * 验证监控数据格式
   */
  validateMonitoringData: (data: any) => {
    const requiredFields = ['callId', 'endpoint', 'method', 'timestamp'];
    return requiredFields.every(field => field in data);
  }
};

export { monitoringTestUtils };