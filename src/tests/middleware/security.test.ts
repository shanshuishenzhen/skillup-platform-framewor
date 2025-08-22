/**
 * 安全中间件单元测试
 * 测试API安全验证、限流、IP白名单等功能
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { NextRequest } from 'next/server';
import {
  security,
  validateApiKey,
  checkRateLimit,
  validateIPWhitelist,
  logRequest,
  SecurityConfig
} from '@/middleware/security';
import { testUtils } from '../setup';

// 模拟Supabase客户端
const mockSupabaseClient = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn()
      }))
    })),
    insert: jest.fn(() => ({
      select: jest.fn()
    }))
  }))
};

// 模拟环境配置
const mockEnvConfig = {
  getSupabase: jest.fn(() => ({
    client: mockSupabaseClient
  }))
};

jest.mock('@/utils/envConfig', () => ({
  getEnvConfig: () => mockEnvConfig
}));

// 模拟Redis客户端
const mockRedisClient = {
  get: jest.fn(),
  set: jest.fn(),
  incr: jest.fn(),
  expire: jest.fn(),
  del: jest.fn(),
  exists: jest.fn()
};

jest.mock('redis', () => ({
  createClient: jest.fn(() => mockRedisClient)
}));

describe('Security Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // 重置Redis模拟
    mockRedisClient.get.mockResolvedValue(null);
    mockRedisClient.set.mockResolvedValue('OK');
    mockRedisClient.incr.mockResolvedValue(1);
    mockRedisClient.expire.mockResolvedValue(1);
    mockRedisClient.del.mockResolvedValue(1);
    mockRedisClient.exists.mockResolvedValue(0);
  });

  describe('validateApiKey', () => {
    it('应该验证有效的API密钥', async () => {
      const mockApiKey = {
        id: 'key-123',
        name: 'Test API Key',
        permissions: ['read', 'write'],
        rateLimit: 1000,
        isActive: true,
        expiresAt: null
      };
      
      mockSupabaseClient.from().select().eq().single.mockResolvedValue({
        data: mockApiKey,
        error: null
      });
      
      const result = await validateApiKey('test-api-key-123');
      
      expect(result.valid).toBe(true);
      expect(result.keyInfo).toEqual(mockApiKey);
      expect(result.error).toBeUndefined();
    });

    it('应该拒绝无效的API密钥', async () => {
      mockSupabaseClient.from().select().eq().single.mockResolvedValue({
        data: null,
        error: { message: 'API key not found' }
      });
      
      const result = await validateApiKey('invalid-api-key');
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid API key');
      expect(result.keyInfo).toBeUndefined();
    });

    it('应该拒绝已过期的API密钥', async () => {
      const expiredApiKey = {
        id: 'key-expired',
        name: 'Expired API Key',
        permissions: ['read'],
        rateLimit: 1000,
        isActive: true,
        expiresAt: new Date(Date.now() - 86400000).toISOString() // 昨天过期
      };
      
      mockSupabaseClient.from().select().eq().single.mockResolvedValue({
        data: expiredApiKey,
        error: null
      });
      
      const result = await validateApiKey('expired-api-key');
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('API key has expired');
    });

    it('应该拒绝已禁用的API密钥', async () => {
      const disabledApiKey = {
        id: 'key-disabled',
        name: 'Disabled API Key',
        permissions: ['read'],
        rateLimit: 1000,
        isActive: false,
        expiresAt: null
      };
      
      mockSupabaseClient.from().select().eq().single.mockResolvedValue({
        data: disabledApiKey,
        error: null
      });
      
      const result = await validateApiKey('disabled-api-key');
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('API key is disabled');
    });

    it('应该处理数据库错误', async () => {
      mockSupabaseClient.from().select().eq().single.mockResolvedValue({
        data: null,
        error: { message: 'Database connection failed' }
      });
      
      const result = await validateApiKey('test-api-key');
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Database connection failed');
    });

    it('应该处理缺少API密钥的情况', async () => {
      const result = await validateApiKey('');
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Missing API key');
    });

    it('应该处理null API密钥', async () => {
      const result = await validateApiKey(null as any);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Missing API key');
    });
  });

  describe('checkRateLimit', () => {
    it('应该允许在限制范围内的请求', async () => {
      mockRedisClient.get.mockResolvedValue('50'); // 当前请求数
      
      const result = await checkRateLimit('key-123', 100, 3600); // 限制100次/小时
      
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(50);
      expect(result.resetTime).toBeDefined();
    });

    it('应该拒绝超出限制的请求', async () => {
      mockRedisClient.get.mockResolvedValue('100'); // 已达到限制
      
      const result = await checkRateLimit('key-123', 100, 3600);
      
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.resetTime).toBeDefined();
    });

    it('应该为新密钥初始化计数器', async () => {
      mockRedisClient.get.mockResolvedValue(null); // 新密钥
      mockRedisClient.incr.mockResolvedValue(1);
      
      const result = await checkRateLimit('new-key', 1000, 3600);
      
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(999);
      expect(mockRedisClient.incr).toHaveBeenCalledWith('rate_limit:new-key');
      expect(mockRedisClient.expire).toHaveBeenCalledWith('rate_limit:new-key', 3600);
    });

    it('应该递增现有密钥的计数器', async () => {
      mockRedisClient.get.mockResolvedValue('25');
      mockRedisClient.incr.mockResolvedValue(26);
      
      const result = await checkRateLimit('existing-key', 100, 3600);
      
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(74);
      expect(mockRedisClient.incr).toHaveBeenCalledWith('rate_limit:existing-key');
    });

    it('应该处理Redis错误', async () => {
      mockRedisClient.get.mockRejectedValue(new Error('Redis connection failed'));
      
      const result = await checkRateLimit('key-123', 100, 3600);
      
      // 在Redis失败时应该允许请求（fail-open策略）
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(100);
    });

    it('应该处理不同的时间窗口', async () => {
      mockRedisClient.get.mockResolvedValue(null);
      mockRedisClient.incr.mockResolvedValue(1);
      
      // 测试1分钟窗口
      await checkRateLimit('key-minute', 60, 60);
      expect(mockRedisClient.expire).toHaveBeenCalledWith('rate_limit:key-minute', 60);
      
      // 测试1天窗口
      await checkRateLimit('key-day', 10000, 86400);
      expect(mockRedisClient.expire).toHaveBeenCalledWith('rate_limit:key-day', 86400);
    });
  });

  describe('validateIPWhitelist', () => {
    it('应该允许白名单中的IP地址', () => {
      const whitelist = ['192.168.1.100', '10.0.0.0/8', '172.16.0.0/12'];
      
      expect(validateIPWhitelist('192.168.1.100', whitelist)).toBe(true);
      expect(validateIPWhitelist('10.1.2.3', whitelist)).toBe(true);
      expect(validateIPWhitelist('172.16.255.254', whitelist)).toBe(true);
    });

    it('应该拒绝不在白名单中的IP地址', () => {
      const whitelist = ['192.168.1.100', '10.0.0.0/8'];
      
      expect(validateIPWhitelist('192.168.1.101', whitelist)).toBe(false);
      expect(validateIPWhitelist('172.16.1.1', whitelist)).toBe(false);
      expect(validateIPWhitelist('8.8.8.8', whitelist)).toBe(false);
    });

    it('应该处理IPv6地址', () => {
      const whitelist = ['::1', '2001:db8::/32'];
      
      expect(validateIPWhitelist('::1', whitelist)).toBe(true);
      expect(validateIPWhitelist('2001:db8:85a3::8a2e:370:7334', whitelist)).toBe(true);
      expect(validateIPWhitelist('2001:db9::1', whitelist)).toBe(false);
    });

    it('应该处理空白名单', () => {
      expect(validateIPWhitelist('192.168.1.1', [])).toBe(false);
      expect(validateIPWhitelist('127.0.0.1', null as any)).toBe(false);
      expect(validateIPWhitelist('10.0.0.1', undefined as any)).toBe(false);
    });

    it('应该处理无效的IP地址', () => {
      const whitelist = ['192.168.1.0/24'];
      
      expect(validateIPWhitelist('invalid-ip', whitelist)).toBe(false);
      expect(validateIPWhitelist('999.999.999.999', whitelist)).toBe(false);
      expect(validateIPWhitelist('', whitelist)).toBe(false);
    });

    it('应该处理无效的CIDR表示法', () => {
      const whitelist = ['192.168.1.0/invalid', '10.0.0.0/33'];
      
      // 应该忽略无效的CIDR并继续检查其他规则
      expect(validateIPWhitelist('192.168.1.1', whitelist)).toBe(false);
    });
  });

  describe('logRequest', () => {
    it('应该记录API请求', async () => {
      const mockRequestData = {
        apiKeyId: 'key-123',
        endpoint: '/api/test',
        method: 'GET',
        ipAddress: '192.168.1.100',
        userAgent: 'Test Agent',
        timestamp: new Date(),
        responseTime: 150,
        statusCode: 200,
        requestSize: 1024,
        responseSize: 2048
      };
      
      mockSupabaseClient.from().insert().select.mockResolvedValue({
        data: [mockRequestData],
        error: null
      });
      
      await logRequest(mockRequestData);
      
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('api_request_logs');
      expect(mockSupabaseClient.from().insert).toHaveBeenCalledWith(mockRequestData);
    });

    it('应该处理日志记录错误', async () => {
      const mockRequestData = {
        apiKeyId: 'key-123',
        endpoint: '/api/test',
        method: 'GET',
        ipAddress: '192.168.1.100',
        userAgent: 'Test Agent',
        timestamp: new Date(),
        responseTime: 150,
        statusCode: 200
      };
      
      mockSupabaseClient.from().insert().select.mockResolvedValue({
        data: null,
        error: { message: 'Insert failed' }
      });
      
      // 应该不抛出错误，只是静默失败
      await expect(logRequest(mockRequestData)).resolves.not.toThrow();
    });

    it('应该处理缺少必需字段的请求数据', async () => {
      const incompleteData = {
        endpoint: '/api/test',
        method: 'GET'
        // 缺少其他必需字段
      };
      
      await expect(logRequest(incompleteData as any)).resolves.not.toThrow();
    });
  });

  describe('security主函数', () => {
    it('应该验证完整的安全检查流程', async () => {
      const mockApiKey = {
        id: 'key-123',
        name: 'Test API Key',
        permissions: ['read', 'write'],
        rateLimit: 1000,
        isActive: true,
        expiresAt: null,
        ipWhitelist: ['192.168.1.0/24']
      };
      
      mockSupabaseClient.from().select().eq().single.mockResolvedValue({
        data: mockApiKey,
        error: null
      });
      
      mockRedisClient.get.mockResolvedValue('50');
      
      const request = testUtils.createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/test',
        headers: {
          'x-api-key': 'test-api-key-123',
          'x-forwarded-for': '192.168.1.100'
        }
      });
      
      const result = await security.validateRequest(request);
      
      expect(result.valid).toBe(true);
      expect(result.keyInfo).toEqual(mockApiKey);
      expect(result.rateLimit.allowed).toBe(true);
    });

    it('应该拒绝没有API密钥的请求', async () => {
      const request = testUtils.createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/test'
      });
      
      const result = await security.validateRequest(request);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Missing API key');
    });

    it('应该拒绝超出速率限制的请求', async () => {
      const mockApiKey = {
        id: 'key-123',
        name: 'Test API Key',
        permissions: ['read'],
        rateLimit: 100,
        isActive: true,
        expiresAt: null
      };
      
      mockSupabaseClient.from().select().eq().single.mockResolvedValue({
        data: mockApiKey,
        error: null
      });
      
      mockRedisClient.get.mockResolvedValue('100'); // 已达到限制
      
      const request = testUtils.createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/test',
        headers: {
          'x-api-key': 'test-api-key-123'
        }
      });
      
      const result = await security.validateRequest(request);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Rate limit exceeded');
    });

    it('应该拒绝不在IP白名单中的请求', async () => {
      const mockApiKey = {
        id: 'key-123',
        name: 'Test API Key',
        permissions: ['read'],
        rateLimit: 1000,
        isActive: true,
        expiresAt: null,
        ipWhitelist: ['10.0.0.0/8']
      };
      
      mockSupabaseClient.from().select().eq().single.mockResolvedValue({
        data: mockApiKey,
        error: null
      });
      
      const request = testUtils.createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/test',
        headers: {
          'x-api-key': 'test-api-key-123',
          'x-forwarded-for': '192.168.1.100' // 不在白名单中
        }
      });
      
      const result = await security.validateRequest(request);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('IP address not allowed');
    });

    it('应该处理多个IP地址（X-Forwarded-For）', async () => {
      const mockApiKey = {
        id: 'key-123',
        name: 'Test API Key',
        permissions: ['read'],
        rateLimit: 1000,
        isActive: true,
        expiresAt: null,
        ipWhitelist: ['192.168.1.0/24']
      };
      
      mockSupabaseClient.from().select().eq().single.mockResolvedValue({
        data: mockApiKey,
        error: null
      });
      
      mockRedisClient.get.mockResolvedValue('10');
      
      const request = testUtils.createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/test',
        headers: {
          'x-api-key': 'test-api-key-123',
          'x-forwarded-for': '192.168.1.100, 10.0.0.1, 172.16.0.1' // 多个IP，第一个在白名单中
        }
      });
      
      const result = await security.validateRequest(request);
      
      expect(result.valid).toBe(true);
    });

    it('应该处理不同的API密钥头部格式', async () => {
      const mockApiKey = {
        id: 'key-123',
        name: 'Test API Key',
        permissions: ['read'],
        rateLimit: 1000,
        isActive: true,
        expiresAt: null
      };
      
      mockSupabaseClient.from().select().eq().single.mockResolvedValue({
        data: mockApiKey,
        error: null
      });
      
      mockRedisClient.get.mockResolvedValue('10');
      
      // 测试Authorization Bearer格式
      const request1 = testUtils.createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/test',
        headers: {
          'authorization': 'Bearer test-api-key-123'
        }
      });
      
      const result1 = await security.validateRequest(request1);
      expect(result1.valid).toBe(true);
      
      // 测试X-API-Key格式
      const request2 = testUtils.createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/test',
        headers: {
          'x-api-key': 'test-api-key-123'
        }
      });
      
      const result2 = await security.validateRequest(request2);
      expect(result2.valid).toBe(true);
    });
  });

  describe('SecurityConfig', () => {
    it('应该使用默认配置', () => {
      const config = new SecurityConfig();
      
      expect(config.enableRateLimit).toBe(true);
      expect(config.enableIPWhitelist).toBe(false);
      expect(config.enableRequestLogging).toBe(true);
      expect(config.defaultRateLimit).toBe(1000);
      expect(config.defaultTimeWindow).toBe(3600);
    });

    it('应该允许自定义配置', () => {
      const customConfig = new SecurityConfig({
        enableRateLimit: false,
        enableIPWhitelist: true,
        defaultRateLimit: 500,
        defaultTimeWindow: 1800,
        strictMode: true
      });
      
      expect(customConfig.enableRateLimit).toBe(false);
      expect(customConfig.enableIPWhitelist).toBe(true);
      expect(customConfig.defaultRateLimit).toBe(500);
      expect(customConfig.defaultTimeWindow).toBe(1800);
      expect(customConfig.strictMode).toBe(true);
    });

    it('应该验证配置参数', () => {
      expect(() => {
        new SecurityConfig({
          defaultRateLimit: -1 // 无效值
        });
      }).toThrow('Rate limit must be positive');
      
      expect(() => {
        new SecurityConfig({
          defaultTimeWindow: 0 // 无效值
        });
      }).toThrow('Time window must be positive');
    });
  });

  describe('边界情况和错误处理', () => {
    it('应该处理极大的速率限制值', async () => {
      mockRedisClient.get.mockResolvedValue('999999');
      
      const result = await checkRateLimit('key-123', Number.MAX_SAFE_INTEGER, 3600);
      
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBeGreaterThan(0);
    });

    it('应该处理极小的时间窗口', async () => {
      mockRedisClient.get.mockResolvedValue(null);
      mockRedisClient.incr.mockResolvedValue(1);
      
      const result = await checkRateLimit('key-123', 10, 1); // 1秒窗口
      
      expect(result.allowed).toBe(true);
      expect(mockRedisClient.expire).toHaveBeenCalledWith('rate_limit:key-123', 1);
    });

    it('应该处理并发速率限制检查', async () => {
      mockRedisClient.get.mockResolvedValue('50');
      mockRedisClient.incr.mockResolvedValue(51);
      
      const promises = Array.from({ length: 10 }, () => 
        checkRateLimit('concurrent-key', 100, 3600)
      );
      
      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(10);
      expect(results.every(r => r.allowed)).toBe(true);
    });

    it('应该处理Redis连接超时', async () => {
      mockRedisClient.get.mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Connection timeout')), 100)
        )
      );
      
      const result = await checkRateLimit('timeout-key', 100, 3600);
      
      // 应该fail-open，允许请求
      expect(result.allowed).toBe(true);
    });

    it('应该处理格式错误的API密钥', async () => {
      const malformedKeys = [
        'too-short',
        'a'.repeat(1000), // 太长
        'contains spaces',
        'contains\nnewlines',
        'contains\ttabs'
      ];
      
      for (const key of malformedKeys) {
        const result = await validateApiKey(key);
        expect(result.valid).toBe(false);
      }
    });

    it('应该处理数据库连接池耗尽', async () => {
      mockSupabaseClient.from().select().eq().single.mockRejectedValue(
        new Error('Connection pool exhausted')
      );
      
      const result = await validateApiKey('test-key');
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Connection pool exhausted');
    });
  });

  describe('性能测试', () => {
    it('应该高效处理大量API密钥验证', async () => {
      const mockApiKey = {
        id: 'key-123',
        name: 'Test API Key',
        permissions: ['read'],
        rateLimit: 1000,
        isActive: true,
        expiresAt: null
      };
      
      mockSupabaseClient.from().select().eq().single.mockResolvedValue({
        data: mockApiKey,
        error: null
      });
      
      const startTime = Date.now();
      const promises = Array.from({ length: 100 }, () => 
        validateApiKey('test-api-key')
      );
      
      const results = await Promise.all(promises);
      const endTime = Date.now();
      
      expect(results).toHaveLength(100);
      expect(results.every(r => r.valid)).toBe(true);
      expect(endTime - startTime).toBeLessThan(1000); // 应该在1秒内完成
    });

    it('应该高效处理大量速率限制检查', async () => {
      mockRedisClient.get.mockResolvedValue('10');
      mockRedisClient.incr.mockResolvedValue(11);
      
      const startTime = Date.now();
      const promises = Array.from({ length: 200 }, (_, i) => 
        checkRateLimit(`key-${i}`, 1000, 3600)
      );
      
      const results = await Promise.all(promises);
      const endTime = Date.now();
      
      expect(results).toHaveLength(200);
      expect(results.every(r => r.allowed)).toBe(true);
      expect(endTime - startTime).toBeLessThan(2000); // 应该在2秒内完成
    });
  });
});