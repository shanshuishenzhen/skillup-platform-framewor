/**
 * 监控仪表板API集成测试
 * 测试监控仪表板数据API的完整功能
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/monitoring/dashboard/route';
import { testUtils } from '../../setup';

// 模拟监控服务
const mockMonitoringService = {
  getDashboardData: jest.fn(),
  getActiveAlerts: jest.fn()
};

// 模拟API监控
const mockApiMonitor = {
  startApiCall: jest.fn().mockReturnValue('call-123'),
  endApiCall: jest.fn(),
  getRealTimeMetrics: jest.fn(),
  getUptime: jest.fn().mockReturnValue(86400000) // 24小时
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

describe('/api/monitoring/dashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/monitoring/dashboard', () => {
    it('应该返回完整的仪表板数据', async () => {
      const mockDashboardData = {
        totalRequests: 10000,
        successRate: 0.95,
        avgResponseTime: 150.5,
        errorRate: 0.05,
        activeUsers: 250,
        topEndpoints: [
          { endpoint: '/api/users', calls: 3000, avgResponseTime: 120 },
          { endpoint: '/api/courses', calls: 2500, avgResponseTime: 180 },
          { endpoint: '/api/auth', calls: 2000, avgResponseTime: 90 }
        ],
        recentErrors: [
          {
            timestamp: new Date('2024-01-01T12:00:00Z'),
            endpoint: '/api/test',
            errorType: 'VALIDATION_ERROR',
            errorMessage: 'Invalid input parameter',
            count: 5
          },
          {
            timestamp: new Date('2024-01-01T11:30:00Z'),
            endpoint: '/api/upload',
            errorType: 'FILE_SIZE_ERROR',
            errorMessage: 'File too large',
            count: 3
          }
        ],
        performanceTrend: [
          {
            timestamp: new Date('2024-01-01T10:00:00Z'),
            responseTime: 145,
            requestCount: 500,
            errorCount: 25
          },
          {
            timestamp: new Date('2024-01-01T11:00:00Z'),
            responseTime: 155,
            requestCount: 600,
            errorCount: 30
          }
        ]
      };
      
      const mockRealTimeMetrics = {
        requestsPerSecond: 15.5,
        activeConnections: 45,
        avgResponseTime: 142.3,
        errorRate: 0.04,
        cpuUsage: 0.65,
        memoryUsage: 0.72,
        throughput: 2048000
      };
      
      const mockActiveAlerts = [
        {
          id: 'alert-1',
          type: 'HIGH_ERROR_RATE',
          severity: 'high',
          title: 'High Error Rate Detected',
          message: 'Error rate exceeded 10% threshold on /api/test',
          timestamp: new Date('2024-01-01T12:00:00Z'),
          resolved: false
        }
      ];
      
      mockMonitoringService.getDashboardData.mockResolvedValue(mockDashboardData);
      mockApiMonitor.getRealTimeMetrics.mockReturnValue(mockRealTimeMetrics);
      mockMonitoringService.getActiveAlerts.mockResolvedValue(mockActiveAlerts);
      
      const request = testUtils.createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/monitoring/dashboard?startTime=2024-01-01T00:00:00Z&endTime=2024-01-02T00:00:00Z',
        headers: {
          'x-api-key': 'test-api-key'
        }
      });
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('overview');
      expect(data.data).toHaveProperty('realTimeMetrics');
      expect(data.data).toHaveProperty('historicalTrends');
      expect(data.data).toHaveProperty('kpis');
      expect(data.data).toHaveProperty('activeAlerts');
      expect(data.data).toHaveProperty('systemInfo');
      
      // 验证概览数据
      expect(data.data.overview).toEqual(mockDashboardData);
      
      // 验证实时指标
      expect(data.data.realTimeMetrics).toEqual(mockRealTimeMetrics);
      
      // 验证活跃警报
      expect(data.data.activeAlerts).toEqual(mockActiveAlerts);
      
      // 验证系统信息
      expect(data.data.systemInfo).toHaveProperty('uptime');
      expect(data.data.systemInfo).toHaveProperty('version');
      expect(data.data.systemInfo).toHaveProperty('environment');
    });

    it('应该返回历史趋势数据', async () => {
      const mockDashboardData = {
        totalRequests: 5000,
        successRate: 0.96,
        avgResponseTime: 140.2,
        errorRate: 0.04,
        activeUsers: 180,
        topEndpoints: [],
        recentErrors: [],
        performanceTrend: []
      };
      
      mockMonitoringService.getDashboardData.mockResolvedValue(mockDashboardData);
      mockApiMonitor.getRealTimeMetrics.mockReturnValue({});
      mockMonitoringService.getActiveAlerts.mockResolvedValue([]);
      
      const request = testUtils.createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/monitoring/dashboard?startTime=2024-01-01T00:00:00Z&endTime=2024-01-07T00:00:00Z',
        headers: {
          'x-api-key': 'test-api-key'
        }
      });
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.data.historicalTrends).toBeDefined();
      expect(Array.isArray(data.data.historicalTrends)).toBe(true);
    });

    it('应该计算正确的KPIs', async () => {
      const mockDashboardData = {
        totalRequests: 10000,
        successRate: 0.95,
        avgResponseTime: 150.5,
        errorRate: 0.05,
        activeUsers: 250,
        topEndpoints: [],
        recentErrors: [],
        performanceTrend: []
      };
      
      mockMonitoringService.getDashboardData.mockResolvedValue(mockDashboardData);
      mockApiMonitor.getRealTimeMetrics.mockReturnValue({});
      mockMonitoringService.getActiveAlerts.mockResolvedValue([]);
      
      const request = testUtils.createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/monitoring/dashboard?startTime=2024-01-01T00:00:00Z&endTime=2024-01-02T00:00:00Z',
        headers: {
          'x-api-key': 'test-api-key'
        }
      });
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(data.data.kpis).toHaveProperty('availability');
      expect(data.data.kpis).toHaveProperty('performance');
      expect(data.data.kpis).toHaveProperty('reliability');
      expect(data.data.kpis).toHaveProperty('efficiency');
      
      // 验证可用性计算
      expect(data.data.kpis.availability).toBeCloseTo(95, 1);
      
      // 验证性能评分
      expect(data.data.kpis.performance).toBeGreaterThan(0);
      expect(data.data.kpis.performance).toBeLessThanOrEqual(100);
    });

    it('应该处理缺少API密钥的请求', async () => {
      mockSecurity.validateApiKey.mockResolvedValue({ valid: false, error: 'Missing API key' });
      
      const request = testUtils.createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/monitoring/dashboard?startTime=2024-01-01T00:00:00Z&endTime=2024-01-02T00:00:00Z'
      });
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Missing API key');
    });

    it('应该处理缺少时间参数的请求', async () => {
      const request = testUtils.createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/monitoring/dashboard',
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
        url: 'http://localhost:3000/api/monitoring/dashboard?startTime=invalid-date&endTime=2024-01-02T00:00:00Z',
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
      mockMonitoringService.getDashboardData.mockRejectedValue(new Error('Database connection failed'));
      
      const request = testUtils.createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/monitoring/dashboard?startTime=2024-01-01T00:00:00Z&endTime=2024-01-02T00:00:00Z',
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

  describe('POST /api/monitoring/dashboard', () => {
    it('应该返回实时监控数据', async () => {
      const mockRealTimeData = {
        currentMetrics: {
          requestsPerSecond: 25.3,
          activeConnections: 120,
          avgResponseTime: 135.7,
          errorRate: 0.03,
          cpuUsage: 0.58,
          memoryUsage: 0.67,
          throughput: 3072000
        },
        recentActivity: [
          {
            timestamp: new Date(),
            endpoint: '/api/users',
            method: 'GET',
            responseTime: 120,
            statusCode: 200
          },
          {
            timestamp: new Date(),
            endpoint: '/api/courses',
            method: 'POST',
            responseTime: 250,
            statusCode: 201
          }
        ],
        alerts: [
          {
            id: 'alert-real-1',
            type: 'HIGH_RESPONSE_TIME',
            severity: 'medium',
            message: 'Response time above 200ms threshold',
            timestamp: new Date()
          }
        ],
        systemStatus: {
          status: 'healthy',
          uptime: 86400000,
          version: '1.0.0',
          environment: 'production',
          dataQuality: 0.98
        }
      };
      
      mockApiMonitor.getRealTimeMetrics.mockReturnValue(mockRealTimeData.currentMetrics);
      mockMonitoringService.getActiveAlerts.mockResolvedValue(mockRealTimeData.alerts);
      
      const requestBody = {
        includeActivity: true,
        includeAlerts: true,
        includeSystemStatus: true,
        timeWindow: 300 // 5分钟
      };
      
      const request = testUtils.createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/monitoring/dashboard',
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
      expect(data.data).toHaveProperty('currentMetrics');
      expect(data.data).toHaveProperty('systemStatus');
      expect(data.data.currentMetrics).toEqual(mockRealTimeData.currentMetrics);
    });

    it('应该处理选择性数据请求', async () => {
      const requestBody = {
        includeActivity: false,
        includeAlerts: true,
        includeSystemStatus: false,
        timeWindow: 60
      };
      
      mockApiMonitor.getRealTimeMetrics.mockReturnValue({
        requestsPerSecond: 10.5,
        avgResponseTime: 150
      });
      mockMonitoringService.getActiveAlerts.mockResolvedValue([]);
      
      const request = testUtils.createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/monitoring/dashboard',
        headers: {
          'x-api-key': 'test-api-key',
          'content-type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });
      
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.data).toHaveProperty('currentMetrics');
      expect(data.data).not.toHaveProperty('recentActivity');
      expect(data.data).toHaveProperty('alerts');
      expect(data.data).not.toHaveProperty('systemStatus');
    });

    it('应该处理无效的请求体', async () => {
      const request = testUtils.createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/monitoring/dashboard',
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

    it('应该处理无效的时间窗口', async () => {
      const requestBody = {
        timeWindow: -1 // 无效的时间窗口
      };
      
      const request = testUtils.createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/monitoring/dashboard',
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
      expect(data.error).toContain('Invalid time window');
    });
  });

  describe('辅助函数测试', () => {
    it('应该正确生成数据点', async () => {
      const mockDashboardData = {
        totalRequests: 1000,
        successRate: 0.95,
        avgResponseTime: 150,
        errorRate: 0.05,
        activeUsers: 50,
        topEndpoints: [],
        recentErrors: [],
        performanceTrend: []
      };
      
      mockMonitoringService.getDashboardData.mockResolvedValue(mockDashboardData);
      mockApiMonitor.getRealTimeMetrics.mockReturnValue({});
      mockMonitoringService.getActiveAlerts.mockResolvedValue([]);
      
      const request = testUtils.createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/monitoring/dashboard?startTime=2024-01-01T00:00:00Z&endTime=2024-01-02T00:00:00Z',
        headers: {
          'x-api-key': 'test-api-key'
        }
      });
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(data.data.historicalTrends).toBeDefined();
      expect(Array.isArray(data.data.historicalTrends)).toBe(true);
      expect(data.data.historicalTrends.length).toBeGreaterThan(0);
    });

    it('应该正确计算数据质量', async () => {
      const mockDashboardData = {
        totalRequests: 10000,
        successRate: 0.98,
        avgResponseTime: 120,
        errorRate: 0.02,
        activeUsers: 200,
        topEndpoints: [],
        recentErrors: [],
        performanceTrend: []
      };
      
      mockMonitoringService.getDashboardData.mockResolvedValue(mockDashboardData);
      mockApiMonitor.getRealTimeMetrics.mockReturnValue({});
      mockMonitoringService.getActiveAlerts.mockResolvedValue([]);
      
      const request = testUtils.createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/monitoring/dashboard?startTime=2024-01-01T00:00:00Z&endTime=2024-01-02T00:00:00Z',
        headers: {
          'x-api-key': 'test-api-key'
        }
      });
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(data.data.systemInfo.dataQuality).toBeGreaterThan(0.9);
      expect(data.data.systemInfo.dataQuality).toBeLessThanOrEqual(1.0);
    });

    it('应该正确计算系统状态', async () => {
      const mockDashboardData = {
        totalRequests: 5000,
        successRate: 0.99,
        avgResponseTime: 100,
        errorRate: 0.01,
        activeUsers: 150,
        topEndpoints: [],
        recentErrors: [],
        performanceTrend: []
      };
      
      mockMonitoringService.getDashboardData.mockResolvedValue(mockDashboardData);
      mockApiMonitor.getRealTimeMetrics.mockReturnValue({
        cpuUsage: 0.3,
        memoryUsage: 0.4
      });
      mockMonitoringService.getActiveAlerts.mockResolvedValue([]);
      
      const request = testUtils.createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/monitoring/dashboard?startTime=2024-01-01T00:00:00Z&endTime=2024-01-02T00:00:00Z',
        headers: {
          'x-api-key': 'test-api-key'
        }
      });
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(data.data.systemInfo.status).toBe('healthy');
    });
  });

  describe('API调用记录', () => {
    it('应该记录所有API调用', async () => {
      mockMonitoringService.getDashboardData.mockResolvedValue({});
      mockApiMonitor.getRealTimeMetrics.mockReturnValue({});
      mockMonitoringService.getActiveAlerts.mockResolvedValue([]);
      
      const request = testUtils.createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/monitoring/dashboard?startTime=2024-01-01T00:00:00Z&endTime=2024-01-02T00:00:00Z',
        headers: {
          'x-api-key': 'test-api-key'
        }
      });
      
      await GET(request);
      
      expect(mockApiMonitor.startApiCall).toHaveBeenCalledWith({
        endpoint: '/api/monitoring/dashboard',
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
  });

  describe('性能测试', () => {
    it('应该在合理时间内处理复杂仪表板请求', async () => {
      const complexDashboardData = {
        totalRequests: 100000,
        successRate: 0.95,
        avgResponseTime: 150,
        errorRate: 0.05,
        activeUsers: 1000,
        topEndpoints: Array.from({ length: 50 }, (_, i) => ({
          endpoint: `/api/endpoint${i}`,
          calls: Math.floor(Math.random() * 10000),
          avgResponseTime: Math.random() * 500
        })),
        recentErrors: Array.from({ length: 100 }, (_, i) => ({
          timestamp: new Date(),
          endpoint: `/api/error${i}`,
          errorType: 'TEST_ERROR',
          errorMessage: `Test error ${i}`,
          count: Math.floor(Math.random() * 10)
        })),
        performanceTrend: Array.from({ length: 168 }, (_, i) => ({ // 一周的小时数据
          timestamp: new Date(Date.now() - i * 3600000),
          responseTime: 100 + Math.random() * 200,
          requestCount: Math.floor(Math.random() * 1000),
          errorCount: Math.floor(Math.random() * 50)
        }))
      };
      
      mockMonitoringService.getDashboardData.mockResolvedValue(complexDashboardData);
      mockApiMonitor.getRealTimeMetrics.mockReturnValue({});
      mockMonitoringService.getActiveAlerts.mockResolvedValue([]);
      
      const request = testUtils.createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/monitoring/dashboard?startTime=2024-01-01T00:00:00Z&endTime=2024-01-07T00:00:00Z',
        headers: {
          'x-api-key': 'test-api-key'
        }
      });
      
      const startTime = Date.now();
      const response = await GET(request);
      const endTime = Date.now();
      
      expect(response.status).toBe(200);
      expect(endTime - startTime).toBeLessThan(3000); // 应该在3秒内完成
      
      const data = await response.json();
      expect(data.data.overview.topEndpoints).toHaveLength(50);
      expect(data.data.overview.recentErrors).toHaveLength(100);
    });

    it('应该处理并发仪表板请求', async () => {
      mockMonitoringService.getDashboardData.mockResolvedValue({});
      mockApiMonitor.getRealTimeMetrics.mockReturnValue({});
      mockMonitoringService.getActiveAlerts.mockResolvedValue([]);
      
      const requests = Array.from({ length: 20 }, () => 
        testUtils.createMockRequest({
          method: 'GET',
          url: 'http://localhost:3000/api/monitoring/dashboard?startTime=2024-01-01T00:00:00Z&endTime=2024-01-02T00:00:00Z',
          headers: {
            'x-api-key': 'test-api-key'
          }
        })
      );
      
      const startTime = Date.now();
      const responses = await Promise.all(requests.map(req => GET(req)));
      const endTime = Date.now();
      
      expect(responses).toHaveLength(20);
      expect(responses.every(res => res.status === 200)).toBe(true);
      expect(endTime - startTime).toBeLessThan(5000); // 应该在5秒内完成
    });
  });
});