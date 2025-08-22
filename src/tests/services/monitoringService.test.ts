/**
 * 监控服务单元测试
 * 测试监控数据的持久化存储、查询和分析功能
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { MonitoringService } from '@/services/monitoringService';
import { ApiCallRecord, MonitoringQuery, AlertEvent } from '@/types/monitoring';
import { testUtils } from '../setup';

// 模拟 Supabase 客户端
const mockSupabase = {
  from: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    single: jest.fn(),
    then: jest.fn()
  })),
  rpc: jest.fn()
};

// 模拟 Supabase 模块
jest.mock('@/lib/supabase', () => ({
  supabase: mockSupabase
}));

describe('MonitoringService', () => {
  let monitoringService: MonitoringService;
  
  beforeEach(async () => {
    monitoringService = new MonitoringService();
    jest.clearAllMocks();
    
    // 模拟初始化成功
    mockSupabase.rpc.mockResolvedValue({ data: null, error: null });
    await monitoringService.initialize();
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('初始化', () => {
    it('应该成功初始化数据库表', async () => {
      const newService = new MonitoringService();
      mockSupabase.rpc.mockResolvedValue({ data: null, error: null });
      
      await expect(newService.initialize()).resolves.not.toThrow();
      
      expect(mockSupabase.rpc).toHaveBeenCalledWith('create_monitoring_tables');
    });

    it('应该处理初始化错误', async () => {
      const newService = new MonitoringService();
      mockSupabase.rpc.mockResolvedValue({ 
        data: null, 
        error: { message: 'Database error' } 
      });
      
      await expect(newService.initialize()).rejects.toThrow('Failed to initialize monitoring tables: Database error');
    });
  });

  describe('API调用记录', () => {
    const mockApiRecord: ApiCallRecord = {
      id: 'call-123',
      endpoint: '/api/test',
      method: 'GET',
      userId: 'user-123',
      ipAddress: '127.0.0.1',
      userAgent: 'test-agent',
      timestamp: new Date(),
      responseTime: 150,
      statusCode: 200,
      success: true,
      requestSize: 512,
      responseSize: 1024
    };

    it('应该保存API调用记录', async () => {
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockApiRecord, error: null })
      };
      mockSupabase.from.mockReturnValue(mockChain);
      
      const result = await monitoringService.saveApiCall(mockApiRecord);
      
      expect(result).toEqual(mockApiRecord);
      expect(mockSupabase.from).toHaveBeenCalledWith('api_calls');
      expect(mockChain.insert).toHaveBeenCalledWith(mockApiRecord);
    });

    it('应该处理保存错误', async () => {
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ 
          data: null, 
          error: { message: 'Insert failed' } 
        })
      };
      mockSupabase.from.mockReturnValue(mockChain);
      
      await expect(monitoringService.saveApiCall(mockApiRecord))
        .rejects.toThrow('Failed to save API call: Insert failed');
    });

    it('应该批量保存API调用记录', async () => {
      const records = [mockApiRecord, { ...mockApiRecord, id: 'call-124' }];
      
      const mockChain = {
        insert: jest.fn().mockResolvedValue({ data: records, error: null })
      };
      mockSupabase.from.mockReturnValue(mockChain);
      
      const result = await monitoringService.saveApiCallsBatch(records);
      
      expect(result).toEqual(records);
      expect(mockSupabase.from).toHaveBeenCalledWith('api_calls');
      expect(mockChain.insert).toHaveBeenCalledWith(records);
    });

    it('应该查询API调用记录', async () => {
      const query: MonitoringQuery = {
        startTime: new Date('2024-01-01'),
        endTime: new Date('2024-01-02'),
        endpoint: '/api/test',
        userId: 'user-123',
        limit: 100,
        offset: 0
      };
      
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({ data: [mockApiRecord], error: null })
      };
      mockSupabase.from.mockReturnValue(mockChain);
      
      const result = await monitoringService.getApiCalls(query);
      
      expect(result).toEqual([mockApiRecord]);
      expect(mockSupabase.from).toHaveBeenCalledWith('api_calls');
      expect(mockChain.gte).toHaveBeenCalledWith('timestamp', query.startTime.toISOString());
      expect(mockChain.lte).toHaveBeenCalledWith('timestamp', query.endTime.toISOString());
      expect(mockChain.eq).toHaveBeenCalledWith('endpoint', query.endpoint);
      expect(mockChain.eq).toHaveBeenCalledWith('user_id', query.userId);
    });
  });

  describe('统计数据', () => {
    it('应该获取API统计数据', async () => {
      const mockStats = [
        {
          endpoint: '/api/test',
          method: 'GET',
          total_calls: 100,
          success_calls: 95,
          error_calls: 5,
          avg_response_time: 150.5,
          min_response_time: 50,
          max_response_time: 500,
          total_request_size: 51200,
          total_response_size: 102400
        }
      ];
      
      const query: MonitoringQuery = {
        startTime: new Date('2024-01-01'),
        endTime: new Date('2024-01-02')
      };
      
      mockSupabase.rpc.mockResolvedValue({ data: mockStats, error: null });
      
      const result = await monitoringService.getApiStats(query);
      
      expect(result).toEqual(mockStats);
      expect(mockSupabase.rpc).toHaveBeenCalledWith('get_api_stats', {
        start_time: query.startTime.toISOString(),
        end_time: query.endTime.toISOString(),
        endpoint_filter: null,
        user_filter: null
      });
    });

    it('应该获取用户使用统计', async () => {
      const mockUserStats = [
        {
          user_id: 'user-123',
          total_calls: 50,
          success_calls: 48,
          error_calls: 2,
          avg_response_time: 120.3,
          total_request_size: 25600,
          total_response_size: 51200,
          unique_endpoints: 5,
          first_call: new Date('2024-01-01'),
          last_call: new Date('2024-01-02')
        }
      ];
      
      const query: MonitoringQuery = {
        startTime: new Date('2024-01-01'),
        endTime: new Date('2024-01-02')
      };
      
      mockSupabase.rpc.mockResolvedValue({ data: mockUserStats, error: null });
      
      const result = await monitoringService.getUserStats(query);
      
      expect(result).toEqual(mockUserStats);
      expect(mockSupabase.rpc).toHaveBeenCalledWith('get_user_stats', {
        start_time: query.startTime.toISOString(),
        end_time: query.endTime.toISOString(),
        user_filter: null
      });
    });

    it('应该获取错误统计', async () => {
      const mockErrorStats = [
        {
          error_type: 'VALIDATION_ERROR',
          error_message: 'Invalid input',
          count: 10,
          first_occurrence: new Date('2024-01-01'),
          last_occurrence: new Date('2024-01-02'),
          affected_endpoints: ['/api/test'],
          affected_users: ['user-123', 'user-124']
        }
      ];
      
      const query: MonitoringQuery = {
        startTime: new Date('2024-01-01'),
        endTime: new Date('2024-01-02')
      };
      
      mockSupabase.rpc.mockResolvedValue({ data: mockErrorStats, error: null });
      
      const result = await monitoringService.getErrorStats(query);
      
      expect(result).toEqual(mockErrorStats);
      expect(mockSupabase.rpc).toHaveBeenCalledWith('get_error_stats', {
        start_time: query.startTime.toISOString(),
        end_time: query.endTime.toISOString(),
        error_type_filter: null
      });
    });

    it('应该获取性能指标', async () => {
      const mockMetrics = [
        {
          time_bucket: new Date('2024-01-01T00:00:00Z'),
          requests_per_second: 10.5,
          avg_response_time: 150.3,
          p95_response_time: 300.0,
          p99_response_time: 500.0,
          error_rate: 0.05,
          throughput: 1024000,
          active_users: 25,
          unique_endpoints: 8
        }
      ];
      
      const query: MonitoringQuery = {
        startTime: new Date('2024-01-01'),
        endTime: new Date('2024-01-02')
      };
      
      mockSupabase.rpc.mockResolvedValue({ data: mockMetrics, error: null });
      
      const result = await monitoringService.getPerformanceMetrics(query);
      
      expect(result).toEqual(mockMetrics);
      expect(mockSupabase.rpc).toHaveBeenCalledWith('get_performance_metrics', {
        start_time: query.startTime.toISOString(),
        end_time: query.endTime.toISOString(),
        time_bucket: '1h'
      });
    });
  });

  describe('仪表板数据', () => {
    it('应该获取仪表板数据', async () => {
      const mockDashboardData = {
        totalRequests: 1000,
        successRate: 0.95,
        avgResponseTime: 150.5,
        errorRate: 0.05,
        activeUsers: 50,
        topEndpoints: [
          { endpoint: '/api/test', calls: 500 },
          { endpoint: '/api/users', calls: 300 }
        ],
        recentErrors: [
          {
            timestamp: new Date(),
            endpoint: '/api/test',
            errorType: 'VALIDATION_ERROR',
            errorMessage: 'Invalid input'
          }
        ],
        performanceTrend: [
          {
            timestamp: new Date(),
            responseTime: 150,
            requestCount: 100
          }
        ]
      };
      
      const query: MonitoringQuery = {
        startTime: new Date('2024-01-01'),
        endTime: new Date('2024-01-02')
      };
      
      mockSupabase.rpc.mockResolvedValue({ data: mockDashboardData, error: null });
      
      const result = await monitoringService.getDashboardData(query);
      
      expect(result).toEqual(mockDashboardData);
      expect(mockSupabase.rpc).toHaveBeenCalledWith('get_dashboard_data', {
        start_time: query.startTime.toISOString(),
        end_time: query.endTime.toISOString()
      });
    });
  });

  describe('聚合统计', () => {
    it('应该获取聚合统计数据', async () => {
      const mockAggregatedStats = {
        totalRequests: 10000,
        totalUsers: 500,
        totalEndpoints: 25,
        avgResponseTime: 145.2,
        successRate: 0.96,
        errorRate: 0.04,
        peakRequestsPerSecond: 50.5,
        totalDataTransferred: 1024000000,
        uptimePercentage: 99.9,
        topErrorTypes: [
          { errorType: 'VALIDATION_ERROR', count: 100 },
          { errorType: 'RATE_LIMIT_ERROR', count: 50 }
        ],
        hourlyDistribution: [
          { hour: 0, requests: 100 },
          { hour: 1, requests: 80 }
        ],
        dailyTrend: [
          { date: '2024-01-01', requests: 1000, errors: 50 },
          { date: '2024-01-02', requests: 1200, errors: 40 }
        ]
      };
      
      const query: MonitoringQuery = {
        startTime: new Date('2024-01-01'),
        endTime: new Date('2024-01-31')
      };
      
      mockSupabase.rpc.mockResolvedValue({ data: mockAggregatedStats, error: null });
      
      const result = await monitoringService.getAggregatedStats(query);
      
      expect(result).toEqual(mockAggregatedStats);
      expect(mockSupabase.rpc).toHaveBeenCalledWith('get_aggregated_stats', {
        start_time: query.startTime.toISOString(),
        end_time: query.endTime.toISOString(),
        group_by: 'day'
      });
    });
  });

  describe('报警事件', () => {
    const mockAlertEvent: AlertEvent = {
      id: 'alert-123',
      type: 'HIGH_ERROR_RATE',
      severity: 'high',
      title: 'High Error Rate Detected',
      message: 'Error rate exceeded 10% threshold',
      timestamp: new Date(),
      resolved: false,
      metadata: {
        endpoint: '/api/test',
        errorRate: 0.15,
        threshold: 0.10
      }
    };

    it('应该保存报警事件', async () => {
      const mockChain = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockAlertEvent, error: null })
      };
      mockSupabase.from.mockReturnValue(mockChain);
      
      const result = await monitoringService.saveAlert(mockAlertEvent);
      
      expect(result).toEqual(mockAlertEvent);
      expect(mockSupabase.from).toHaveBeenCalledWith('alert_events');
      expect(mockChain.insert).toHaveBeenCalledWith(mockAlertEvent);
    });

    it('应该获取活跃报警', async () => {
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [mockAlertEvent], error: null })
      };
      mockSupabase.from.mockReturnValue(mockChain);
      
      const result = await monitoringService.getActiveAlerts();
      
      expect(result).toEqual([mockAlertEvent]);
      expect(mockSupabase.from).toHaveBeenCalledWith('alert_events');
      expect(mockChain.eq).toHaveBeenCalledWith('resolved', false);
    });
  });

  describe('数据清理', () => {
    it('应该清理过期数据', async () => {
      const retentionDays = 30;
      const mockResult = { count: 1000 };
      
      mockSupabase.rpc.mockResolvedValue({ data: mockResult, error: null });
      
      const result = await monitoringService.cleanupOldData(retentionDays);
      
      expect(result).toEqual(mockResult);
      expect(mockSupabase.rpc).toHaveBeenCalledWith('cleanup_old_monitoring_data', {
        retention_days: retentionDays
      });
    });

    it('应该处理清理错误', async () => {
      const retentionDays = 30;
      
      mockSupabase.rpc.mockResolvedValue({ 
        data: null, 
        error: { message: 'Cleanup failed' } 
      });
      
      await expect(monitoringService.cleanupOldData(retentionDays))
        .rejects.toThrow('Failed to cleanup old data: Cleanup failed');
    });
  });

  describe('错误处理', () => {
    it('应该处理数据库连接错误', async () => {
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({ 
          data: null, 
          error: { message: 'Connection failed' } 
        })
      };
      mockSupabase.from.mockReturnValue(mockChain);
      
      const query: MonitoringQuery = {
        startTime: new Date('2024-01-01'),
        endTime: new Date('2024-01-02')
      };
      
      await expect(monitoringService.getApiCalls(query))
        .rejects.toThrow('Failed to get API calls: Connection failed');
    });

    it('应该处理无效的查询参数', async () => {
      const invalidQuery: MonitoringQuery = {
        startTime: new Date('2024-01-02'),
        endTime: new Date('2024-01-01') // 结束时间早于开始时间
      };
      
      await expect(monitoringService.getApiCalls(invalidQuery))
        .rejects.toThrow('Invalid query: end time must be after start time');
    });

    it('应该处理空的查询结果', async () => {
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({ data: [], error: null })
      };
      mockSupabase.from.mockReturnValue(mockChain);
      
      const query: MonitoringQuery = {
        startTime: new Date('2024-01-01'),
        endTime: new Date('2024-01-02')
      };
      
      const result = await monitoringService.getApiCalls(query);
      
      expect(result).toEqual([]);
    });
  });

  describe('性能测试', () => {
    it('应该处理大量数据查询', async () => {
      const largeDataSet = Array.from({ length: 10000 }, (_, i) => ({
        id: `call-${i}`,
        endpoint: `/api/test${i % 10}`,
        method: 'GET',
        userId: `user-${i % 100}`,
        timestamp: new Date(),
        responseTime: 100 + Math.random() * 200,
        statusCode: 200,
        success: true
      }));
      
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({ data: largeDataSet, error: null })
      };
      mockSupabase.from.mockReturnValue(mockChain);
      
      const query: MonitoringQuery = {
        startTime: new Date('2024-01-01'),
        endTime: new Date('2024-01-31'),
        limit: 10000
      };
      
      const startTime = Date.now();
      const result = await monitoringService.getApiCalls(query);
      const endTime = Date.now();
      
      expect(result).toHaveLength(10000);
      expect(endTime - startTime).toBeLessThan(1000); // 应该在1秒内完成
    });

    it('应该处理并发查询', async () => {
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({ data: [], error: null })
      };
      mockSupabase.from.mockReturnValue(mockChain);
      
      const query: MonitoringQuery = {
        startTime: new Date('2024-01-01'),
        endTime: new Date('2024-01-02')
      };
      
      // 创建100个并发查询
      const promises = Array.from({ length: 100 }, () => 
        monitoringService.getApiCalls(query)
      );
      
      const startTime = Date.now();
      const results = await Promise.all(promises);
      const endTime = Date.now();
      
      expect(results).toHaveLength(100);
      expect(endTime - startTime).toBeLessThan(5000); // 应该在5秒内完成
    });
  });
});