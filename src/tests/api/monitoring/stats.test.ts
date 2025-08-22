/**
 * 监控统计API集成测试
 * 测试监控统计数据API的完整功能
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { NextRequest } from 'next/server';
import { GET, POST, DELETE } from '@/app/api/monitoring/stats/route';
import { testUtils } from '../../setup';

// 模拟监控服务
const mockMonitoringService = {
  getApiStats: jest.fn(),
  getUserStats: jest.fn(),
  getErrorStats: jest.fn(),
  getPerformanceMetrics: jest.fn(),
  getAggregatedStats: jest.fn(),
  cleanupOldData: jest.fn()
};

// 模拟API监控
const mockApiMonitor = {
  startApiCall: jest.fn().mockReturnValue('call-123'),
  endApiCall: jest.fn()
};

// 模拟安全中间件
const mockSecurity = {
  validateApiKey: jest.fn().mockResolvedValue({ valid: true, keyInfo: { id: 'key-123' } })
};

jest.mock('@/services/monitoringService', () => ({
  MonitoringService: jest.fn(() => mockMonitoringService)
}));

jest.mock('@/utils/apiMonitor', () => ({
  apiMonitor: mockApiMonitor
}));

jest.mock('@/middleware/security', () => ({
  security: mockSecurity
}));

describe('/api/monitoring/stats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/monitoring/stats', () => {
    it('应该返回API统计数据', async () => {
      const mockApiStats = [
        {
          endpoint: '/api/test',
          method: 'GET',
          total_calls: 100,
          success_calls: 95,
          error_calls: 5,
          avg_response_time: 150.5,
          min_response_time: 50,
          max_response_time: 500
        }
      ];
      
      mockMonitoringService.getApiStats.mockResolvedValue(mockApiStats);
      
      const request = testUtils.createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/monitoring/stats?type=api&startTime=2024-01-01T00:00:00Z&endTime=2024-01-02T00:00:00Z',
        headers: {
          'x-api-key': 'test-api-key'
        }
      });
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockApiStats);
      expect(mockSecurity.validateApiKey).toHaveBeenCalledWith('test-api-key');
      expect(mockMonitoringService.getApiStats).toHaveBeenCalled();
    });

    it('应该返回用户统计数据', async () => {
      const mockUserStats = [
        {
          user_id: 'user-123',
          total_calls: 50,
          success_calls: 48,
          error_calls: 2,
          avg_response_time: 120.3,
          unique_endpoints: 5
        }
      ];
      
      mockMonitoringService.getUserStats.mockResolvedValue(mockUserStats);
      
      const request = testUtils.createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/monitoring/stats?type=user&startTime=2024-01-01T00:00:00Z&endTime=2024-01-02T00:00:00Z',
        headers: {
          'x-api-key': 'test-api-key'
        }
      });
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockUserStats);
      expect(mockMonitoringService.getUserStats).toHaveBeenCalled();
    });

    it('应该返回错误统计数据', async () => {
      const mockErrorStats = [
        {
          error_type: 'VALIDATION_ERROR',
          error_message: 'Invalid input',
          count: 10,
          first_occurrence: new Date('2024-01-01'),
          last_occurrence: new Date('2024-01-02')
        }
      ];
      
      mockMonitoringService.getErrorStats.mockResolvedValue(mockErrorStats);
      
      const request = testUtils.createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/monitoring/stats?type=error&startTime=2024-01-01T00:00:00Z&endTime=2024-01-02T00:00:00Z',
        headers: {
          'x-api-key': 'test-api-key'
        }
      });
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockErrorStats);
      expect(mockMonitoringService.getErrorStats).toHaveBeenCalled();
    });

    it('应该返回性能指标数据', async () => {
      const mockPerformanceMetrics = [
        {
          time_bucket: new Date('2024-01-01T00:00:00Z'),
          requests_per_second: 10.5,
          avg_response_time: 150.3,
          p95_response_time: 300.0,
          error_rate: 0.05
        }
      ];
      
      mockMonitoringService.getPerformanceMetrics.mockResolvedValue(mockPerformanceMetrics);
      
      const request = testUtils.createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/monitoring/stats?type=performance&startTime=2024-01-01T00:00:00Z&endTime=2024-01-02T00:00:00Z',
        headers: {
          'x-api-key': 'test-api-key'
        }
      });
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockPerformanceMetrics);
      expect(mockMonitoringService.getPerformanceMetrics).toHaveBeenCalled();
    });

    it('应该处理缺少API密钥的请求', async () => {
      mockSecurity.validateApiKey.mockResolvedValue({ valid: false, error: 'Missing API key' });
      
      const request = testUtils.createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/monitoring/stats?type=api&startTime=2024-01-01T00:00:00Z&endTime=2024-01-02T00:00:00Z'
      });
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Missing API key');
    });

    it('应该处理无效的统计类型', async () => {
      const request = testUtils.createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/monitoring/stats?type=invalid&startTime=2024-01-01T00:00:00Z&endTime=2024-01-02T00:00:00Z',
        headers: {
          'x-api-key': 'test-api-key'
        }
      });
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid stats type');
    });

    it('应该处理缺少必需参数的请求', async () => {
      const request = testUtils.createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/monitoring/stats?type=api',
        headers: {
          'x-api-key': 'test-api-key'
        }
      });
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('startTime and endTime are required');
    });

    it('应该处理无效的时间格式', async () => {
      const request = testUtils.createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/monitoring/stats?type=api&startTime=invalid-date&endTime=2024-01-02T00:00:00Z',
        headers: {
          'x-api-key': 'test-api-key'
        }
      });
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid date format');
    });

    it('应该处理服务错误', async () => {
      mockMonitoringService.getApiStats.mockRejectedValue(new Error('Database connection failed'));
      
      const request = testUtils.createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/monitoring/stats?type=api&startTime=2024-01-01T00:00:00Z&endTime=2024-01-02T00:00:00Z',
        headers: {
          'x-api-key': 'test-api-key'
        }
      });
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Database connection failed');
    });
  });

  describe('POST /api/monitoring/stats', () => {
    it('应该返回聚合统计数据', async () => {
      const mockAggregatedStats = {
        totalRequests: 10000,
        totalUsers: 500,
        avgResponseTime: 145.2,
        successRate: 0.96,
        errorRate: 0.04,
        topErrorTypes: [
          { errorType: 'VALIDATION_ERROR', count: 100 }
        ],
        dailyTrend: [
          { date: '2024-01-01', requests: 1000, errors: 50 }
        ]
      };
      
      mockMonitoringService.getAggregatedStats.mockResolvedValue(mockAggregatedStats);
      
      const requestBody = {
        startTime: '2024-01-01T00:00:00Z',
        endTime: '2024-01-31T23:59:59Z',
        groupBy: 'day',
        includeDetails: true
      };
      
      const request = testUtils.createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/monitoring/stats',
        headers: {
          'x-api-key': 'test-api-key',
          'content-type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });
      
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockAggregatedStats);
      expect(mockMonitoringService.getAggregatedStats).toHaveBeenCalled();
    });

    it('应该处理无效的请求体', async () => {
      const request = testUtils.createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/monitoring/stats',
        headers: {
          'x-api-key': 'test-api-key',
          'content-type': 'application/json'
        },
        body: 'invalid-json'
      });
      
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid JSON');
    });

    it('应该处理缺少必需字段的请求', async () => {
      const requestBody = {
        startTime: '2024-01-01T00:00:00Z'
        // 缺少 endTime
      };
      
      const request = testUtils.createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/monitoring/stats',
        headers: {
          'x-api-key': 'test-api-key',
          'content-type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });
      
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('endTime is required');
    });
  });

  describe('DELETE /api/monitoring/stats', () => {
    it('应该清理过期数据', async () => {
      const mockCleanupResult = { count: 1000 };
      mockMonitoringService.cleanupOldData.mockResolvedValue(mockCleanupResult);
      
      const request = testUtils.createMockRequest({
        method: 'DELETE',
        url: 'http://localhost:3000/api/monitoring/stats?retentionDays=30',
        headers: {
          'x-api-key': 'test-api-key'
        }
      });
      
      const response = await DELETE(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockCleanupResult);
      expect(mockMonitoringService.cleanupOldData).toHaveBeenCalledWith(30);
    });

    it('应该使用默认保留天数', async () => {
      const mockCleanupResult = { count: 500 };
      mockMonitoringService.cleanupOldData.mockResolvedValue(mockCleanupResult);
      
      const request = testUtils.createMockRequest({
        method: 'DELETE',
        url: 'http://localhost:3000/api/monitoring/stats',
        headers: {
          'x-api-key': 'test-api-key'
        }
      });
      
      const response = await DELETE(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockMonitoringService.cleanupOldData).toHaveBeenCalledWith(90); // 默认90天
    });

    it('应该处理无效的保留天数', async () => {
      const request = testUtils.createMockRequest({
        method: 'DELETE',
        url: 'http://localhost:3000/api/monitoring/stats?retentionDays=invalid',
        headers: {
          'x-api-key': 'test-api-key'
        }
      });
      
      const response = await DELETE(request);
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid retention days');
    });

    it('应该处理清理错误', async () => {
      mockMonitoringService.cleanupOldData.mockRejectedValue(new Error('Cleanup failed'));
      
      const request = testUtils.createMockRequest({
        method: 'DELETE',
        url: 'http://localhost:3000/api/monitoring/stats?retentionDays=30',
        headers: {
          'x-api-key': 'test-api-key'
        }
      });
      
      const response = await DELETE(request);
      const data = await response.json();
      
      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Cleanup failed');
    });
  });

  describe('API调用记录', () => {
    it('应该记录所有API调用', async () => {
      const request = testUtils.createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/monitoring/stats?type=api&startTime=2024-01-01T00:00:00Z&endTime=2024-01-02T00:00:00Z',
        headers: {
          'x-api-key': 'test-api-key'
        }
      });
      
      mockMonitoringService.getApiStats.mockResolvedValue([]);
      
      await GET(request);
      
      expect(mockApiMonitor.startApiCall).toHaveBeenCalledWith({
        endpoint: '/api/monitoring/stats',
        method: 'GET',
        userId: null,
        ipAddress: expect.any(String),
        userAgent: expect.any(String)
      });
      
      expect(mockApiMonitor.endApiCall).toHaveBeenCalledWith(
        'call-123',
        expect.objectContaining({
          statusCode: 200,
          success: true
        })
      );
    });

    it('应该记录错误的API调用', async () => {
      mockMonitoringService.getApiStats.mockRejectedValue(new Error('Service error'));
      
      const request = testUtils.createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/monitoring/stats?type=api&startTime=2024-01-01T00:00:00Z&endTime=2024-01-02T00:00:00Z',
        headers: {
          'x-api-key': 'test-api-key'
        }
      });
      
      await GET(request);
      
      expect(mockApiMonitor.endApiCall).toHaveBeenCalledWith(
        'call-123',
        expect.objectContaining({
          statusCode: 500,
          success: false,
          errorMessage: 'Service error',
          errorType: 'SERVICE_ERROR'
        })
      );
    });
  });

  describe('性能测试', () => {
    it('应该在合理时间内处理大量数据请求', async () => {
      const largeDataSet = Array.from({ length: 10000 }, (_, i) => ({
        endpoint: `/api/test${i % 100}`,
        method: 'GET',
        total_calls: Math.floor(Math.random() * 1000),
        success_calls: Math.floor(Math.random() * 900),
        error_calls: Math.floor(Math.random() * 100),
        avg_response_time: Math.random() * 500
      }));
      
      mockMonitoringService.getApiStats.mockResolvedValue(largeDataSet);
      
      const request = testUtils.createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/monitoring/stats?type=api&startTime=2024-01-01T00:00:00Z&endTime=2024-01-31T23:59:59Z',
        headers: {
          'x-api-key': 'test-api-key'
        }
      });
      
      const startTime = Date.now();
      const response = await GET(request);
      const endTime = Date.now();
      
      expect(response.status).toBe(200);
      expect(endTime - startTime).toBeLessThan(2000); // 应该在2秒内完成
      
      const data = await response.json();
      expect(data.data).toHaveLength(10000);
    });

    it('应该处理并发请求', async () => {
      mockMonitoringService.getApiStats.mockResolvedValue([]);
      
      const requests = Array.from({ length: 50 }, () => 
        testUtils.createMockRequest({
          method: 'GET',
          url: 'http://localhost:3000/api/monitoring/stats?type=api&startTime=2024-01-01T00:00:00Z&endTime=2024-01-02T00:00:00Z',
          headers: {
            'x-api-key': 'test-api-key'
          }
        })
      );
      
      const startTime = Date.now();
      const responses = await Promise.all(requests.map(req => GET(req)));
      const endTime = Date.now();
      
      expect(responses).toHaveLength(50);
      expect(responses.every(res => res.status === 200)).toBe(true);
      expect(endTime - startTime).toBeLessThan(5000); // 应该在5秒内完成
    });
  });
});