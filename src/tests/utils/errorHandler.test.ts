/**
 * 错误处理工具单元测试
 * 
 * 测试错误处理工具，包括：
 * - 错误分类和处理
 * - 错误响应格式化
 * - 错误日志记录
 * - 错误堆栈跟踪
 * - 错误通知和告警
 * - 错误统计和分析
 * - 错误恢复机制
 * - 自定义错误类型
 */

import { 
  ErrorHandler, 
  AppError, 
  ValidationError, 
  AuthenticationError, 
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  ServiceUnavailableError,
  formatErrorResponse,
  handleAsyncError,
  createErrorMiddleware,
  logError,
  notifyError
} from '../../utils/errorHandler';
import { logger } from '../../utils/logger';
import { analyticsService } from '../../services/analyticsService';
import { notificationService } from '../../services/notificationService';
import { auditService } from '../../services/auditService';
import { envConfig } from '../../config/envConfig';
import { Request, Response, NextFunction } from 'express';

// Mock 依赖
jest.mock('../../utils/logger');
jest.mock('../../services/analyticsService');
jest.mock('../../services/notificationService');
jest.mock('../../services/auditService');
jest.mock('../../config/envConfig');

// 类型定义
interface ErrorContext {
  userId?: string;
  sessionId?: string;
  requestId?: string;
  ip?: string;
  userAgent?: string;
  endpoint?: string;
  method?: string;
  timestamp?: string;
  correlationId?: string;
  traceId?: string;
}

interface ErrorMetrics {
  errorCount: number;
  errorRate: number;
  errorsByType: Record<string, number>;
  errorsByEndpoint: Record<string, number>;
  averageResponseTime: number;
  criticalErrors: number;
  recoveredErrors: number;
}

interface ErrorNotification {
  id: string;
  type: 'email' | 'slack' | 'webhook' | 'sms';
  severity: 'low' | 'medium' | 'high' | 'critical';
  recipients: string[];
  template: string;
  data: {
    error: {
      message: string;
      stack?: string;
      code?: string;
      type: string;
    };
    context: ErrorContext;
    metrics: Partial<ErrorMetrics>;
    timestamp: string;
  };
  retryCount: number;
  maxRetries: number;
  sent: boolean;
  sentAt?: string;
}

interface ErrorRecoveryStrategy {
  type: 'retry' | 'fallback' | 'circuit_breaker' | 'graceful_degradation';
  maxRetries?: number;
  retryDelay?: number;
  fallbackValue?: any;
  circuitBreakerThreshold?: number;
  recoveryTimeout?: number;
}

// Mock 实例
const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  child: jest.fn().mockReturnThis()
};

const mockAnalyticsService = {
  track: jest.fn(),
  increment: jest.fn(),
  histogram: jest.fn(),
  gauge: jest.fn(),
  timer: jest.fn()
};

const mockNotificationService = {
  sendEmail: jest.fn(),
  sendSlack: jest.fn(),
  sendWebhook: jest.fn(),
  sendSms: jest.fn(),
  sendErrorAlert: jest.fn()
};

const mockAuditService = {
  log: jest.fn(),
  logError: jest.fn(),
  logSecurityEvent: jest.fn()
};

const mockEnvConfig = {
  app: {
    env: 'test',
    debug: true
  },
  error: {
    logLevel: 'error',
    includeStack: true,
    notifyOnCritical: true,
    maxStackTraceLength: 1000,
    enableRecovery: true,
    retryAttempts: 3,
    retryDelay: 1000
  },
  monitoring: {
    errorThreshold: 0.05, // 5% 错误率阈值
    alertCooldown: 300000, // 5分钟冷却期
    criticalErrorNotification: true
  }
};

// 设置 Mock
(logger as any) = mockLogger;
(analyticsService as any) = mockAnalyticsService;
(notificationService as any) = mockNotificationService;
(auditService as any) = mockAuditService;
(envConfig as any) = mockEnvConfig;

// Mock Express 对象
const createMockRequest = (options: {
  method?: string;
  url?: string;
  headers?: Record<string, string>;
  body?: any;
  query?: any;
  params?: any;
  user?: any;
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
    'x-request-id': 'req-123',
    'x-correlation-id': 'corr-456',
    ...options.headers
  },
  body: options.body || {},
  query: options.query || {},
  params: options.params || {},
  user: options.user,
  ip: options.ip || '192.168.1.1',
  sessionID: options.sessionID || 'session-123'
});

const createMockResponse = (): Partial<Response> => {
  const res: Partial<Response> = {
    statusCode: 200,
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    end: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    locals: {},
    headersSent: false
  };
  return res;
};

const createMockNext = (): NextFunction => jest.fn();

describe('Error Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // 设置默认的mock返回值
    mockAnalyticsService.track.mockResolvedValue(true);
    mockAnalyticsService.increment.mockResolvedValue(true);
    mockNotificationService.sendErrorAlert.mockResolvedValue(true);
    mockAuditService.logError.mockResolvedValue(true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  /**
   * 自定义错误类测试
   */
  describe('Custom Error Classes', () => {
    it('应该创建AppError实例', () => {
      const error = new AppError('Test error', 400, 'TEST_ERROR');
      
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('TEST_ERROR');
      expect(error.isOperational).toBe(true);
      expect(error.timestamp).toBeInstanceOf(Date);
    });

    it('应该创建ValidationError实例', () => {
      const errors = [
        { field: 'email', message: 'Invalid email format' },
        { field: 'password', message: 'Password too short' }
      ];
      const error = new ValidationError('Validation failed', errors);
      
      expect(error).toBeInstanceOf(AppError);
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.details).toEqual(errors);
    });

    it('应该创建AuthenticationError实例', () => {
      const error = new AuthenticationError('Invalid credentials');
      
      expect(error).toBeInstanceOf(AppError);
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('AUTHENTICATION_ERROR');
    });

    it('应该创建AuthorizationError实例', () => {
      const error = new AuthorizationError('Insufficient permissions');
      
      expect(error).toBeInstanceOf(AppError);
      expect(error.statusCode).toBe(403);
      expect(error.code).toBe('AUTHORIZATION_ERROR');
    });

    it('应该创建NotFoundError实例', () => {
      const error = new NotFoundError('Resource not found');
      
      expect(error).toBeInstanceOf(AppError);
      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('NOT_FOUND');
    });

    it('应该创建ConflictError实例', () => {
      const error = new ConflictError('Resource already exists');
      
      expect(error).toBeInstanceOf(AppError);
      expect(error.statusCode).toBe(409);
      expect(error.code).toBe('CONFLICT');
    });

    it('应该创建RateLimitError实例', () => {
      const error = new RateLimitError('Too many requests', 3600);
      
      expect(error).toBeInstanceOf(AppError);
      expect(error.statusCode).toBe(429);
      expect(error.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(error.retryAfter).toBe(3600);
    });

    it('应该创建ServiceUnavailableError实例', () => {
      const error = new ServiceUnavailableError('Service temporarily unavailable');
      
      expect(error).toBeInstanceOf(AppError);
      expect(error.statusCode).toBe(503);
      expect(error.code).toBe('SERVICE_UNAVAILABLE');
    });
  });

  /**
   * 错误响应格式化测试
   */
  describe('Error Response Formatting', () => {
    it('应该格式化AppError响应', () => {
      const error = new ValidationError('Validation failed', [
        { field: 'email', message: 'Invalid email' }
      ]);
      
      const response = formatErrorResponse(error);
      
      expect(response).toEqual({
        success: false,
        error: {
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          statusCode: 400,
          details: [
            { field: 'email', message: 'Invalid email' }
          ],
          timestamp: expect.any(String)
        }
      });
    });

    it('应该格式化普通Error响应', () => {
      const error = new Error('Unexpected error');
      
      const response = formatErrorResponse(error);
      
      expect(response).toEqual({
        success: false,
        error: {
          message: 'Internal server error',
          code: 'INTERNAL_ERROR',
          statusCode: 500,
          timestamp: expect.any(String)
        }
      });
    });

    it('应该在开发环境包含堆栈跟踪', () => {
      const error = new Error('Test error');
      error.stack = 'Error: Test error\n    at test.js:1:1';
      
      const response = formatErrorResponse(error, true);
      
      expect(response.error.stack).toBeDefined();
      expect(response.error.stack).toContain('Error: Test error');
    });

    it('应该在生产环境隐藏敏感信息', () => {
      const error = new Error('Database connection failed: password=secret123');
      
      const response = formatErrorResponse(error, false);
      
      expect(response.error.message).toBe('Internal server error');
      expect(response.error.stack).toBeUndefined();
    });

    it('应该处理循环引用', () => {
      const error = new AppError('Test error', 400);
      const circularObj: any = { error };
      circularObj.self = circularObj;
      error.details = circularObj;
      
      const response = formatErrorResponse(error);
      
      expect(response).toBeDefined();
      expect(response.error.message).toBe('Test error');
    });
  });

  /**
   * 异步错误处理测试
   */
  describe('Async Error Handling', () => {
    it('应该捕获异步函数错误', async () => {
      const asyncFunction = async () => {
        throw new ValidationError('Async validation error');
      };
      
      const wrappedFunction = handleAsyncError(asyncFunction);
      const req = createMockRequest() as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();
      
      await wrappedFunction(req, res, next);
      
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Async validation error',
          statusCode: 400
        })
      );
    });

    it('应该处理Promise拒绝', async () => {
      const asyncFunction = async () => {
        return Promise.reject(new Error('Promise rejected'));
      };
      
      const wrappedFunction = handleAsyncError(asyncFunction);
      const req = createMockRequest() as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();
      
      await wrappedFunction(req, res, next);
      
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Promise rejected'
        })
      );
    });

    it('应该保持正常响应流程', async () => {
      const asyncFunction = async (req: Request, res: Response) => {
        res.json({ success: true, data: 'test' });
      };
      
      const wrappedFunction = handleAsyncError(asyncFunction);
      const req = createMockRequest() as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();
      
      await wrappedFunction(req, res, next);
      
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: 'test'
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  /**
   * 错误中间件测试
   */
  describe('Error Middleware', () => {
    it('应该处理AppError', () => {
      const error = new ValidationError('Validation failed');
      const req = createMockRequest() as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();
      
      const middleware = createErrorMiddleware();
      middleware(error, req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            message: 'Validation failed',
            code: 'VALIDATION_ERROR'
          })
        })
      );
    });

    it('应该处理未知错误', () => {
      const error = new Error('Unknown error');
      const req = createMockRequest() as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();
      
      const middleware = createErrorMiddleware();
      middleware(error, req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            message: 'Internal server error',
            code: 'INTERNAL_ERROR'
          })
        })
      );
    });

    it('应该记录错误日志', () => {
      const error = new AppError('Test error', 500);
      const req = createMockRequest({
        method: 'POST',
        url: '/api/test',
        user: { id: 'user-123' }
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();
      
      const middleware = createErrorMiddleware();
      middleware(error, req, res, next);
      
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error occurred',
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'Test error',
            statusCode: 500
          }),
          context: expect.objectContaining({
            method: 'POST',
            url: '/api/test',
            userId: 'user-123'
          })
        })
      );
    });

    it('应该避免重复发送响应', () => {
      const error = new AppError('Test error', 400);
      const req = createMockRequest() as Request;
      const res = createMockResponse() as Response;
      res.headersSent = true; // 模拟已发送响应
      const next = createMockNext();
      
      const middleware = createErrorMiddleware();
      middleware(error, req, res, next);
      
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith(error);
    });
  });

  /**
   * 错误日志记录测试
   */
  describe('Error Logging', () => {
    it('应该记录错误详细信息', async () => {
      const error = new AppError('Test error', 500, 'TEST_ERROR');
      const context: ErrorContext = {
        userId: 'user-123',
        sessionId: 'session-456',
        requestId: 'req-789',
        ip: '192.168.1.1',
        endpoint: '/api/test',
        method: 'POST'
      };
      
      await logError(error, context);
      
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Application error occurred',
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'Test error',
            statusCode: 500,
            code: 'TEST_ERROR'
          }),
          context,
          timestamp: expect.any(String)
        })
      );
      
      expect(mockAuditService.logError).toHaveBeenCalledWith(
        expect.objectContaining({
          error,
          context,
          severity: 'high'
        })
      );
    });

    it('应该记录错误统计', async () => {
      const error = new ValidationError('Validation failed');
      const context: ErrorContext = {
        endpoint: '/api/users',
        method: 'POST'
      };
      
      await logError(error, context);
      
      expect(mockAnalyticsService.increment).toHaveBeenCalledWith(
        'errors.total',
        1,
        expect.objectContaining({
          errorType: 'ValidationError',
          statusCode: '400',
          endpoint: '/api/users',
          method: 'POST'
        })
      );
    });

    it('应该处理敏感信息', async () => {
      const error = new Error('Database error: password=secret123, token=abc123');
      const context: ErrorContext = {
        userId: 'user-123'
      };
      
      await logError(error, context);
      
      const logCall = mockLogger.error.mock.calls[0];
      const loggedMessage = JSON.stringify(logCall[1]);
      
      expect(loggedMessage).not.toContain('secret123');
      expect(loggedMessage).not.toContain('abc123');
      expect(loggedMessage).toContain('[REDACTED]');
    });
  });

  /**
   * 错误通知测试
   */
  describe('Error Notification', () => {
    it('应该发送关键错误通知', async () => {
      const error = new ServiceUnavailableError('Database connection failed');
      const context: ErrorContext = {
        userId: 'user-123',
        endpoint: '/api/critical'
      };
      
      await notifyError(error, context);
      
      expect(mockNotificationService.sendErrorAlert).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'critical',
          error: expect.objectContaining({
            message: 'Database connection failed',
            code: 'SERVICE_UNAVAILABLE'
          }),
          context
        })
      );
    });

    it('应该根据错误严重程度选择通知方式', async () => {
      // 高严重程度错误
      const criticalError = new ServiceUnavailableError('Service down');
      await notifyError(criticalError, {});
      
      expect(mockNotificationService.sendErrorAlert).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'critical'
        })
      );
      
      // 低严重程度错误
      const minorError = new ValidationError('Invalid input');
      await notifyError(minorError, {});
      
      // 验证不会发送关键错误通知
      expect(mockNotificationService.sendErrorAlert).toHaveBeenCalledTimes(1);
    });

    it('应该实施通知冷却期', async () => {
      const error = new ServiceUnavailableError('Service down');
      const context = { endpoint: '/api/test' };
      
      // 第一次通知
      await notifyError(error, context);
      
      // 立即再次通知同样的错误
      await notifyError(error, context);
      
      // 验证只发送了一次通知
      expect(mockNotificationService.sendErrorAlert).toHaveBeenCalledTimes(1);
    });
  });

  /**
   * 错误恢复机制测试
   */
  describe('Error Recovery', () => {
    it('应该实施重试机制', async () => {
      let attemptCount = 0;
      const unstableFunction = async () => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error('Temporary failure');
        }
        return 'success';
      };
      
      const errorHandler = new ErrorHandler();
      const result = await errorHandler.withRetry(unstableFunction, {
        maxRetries: 3,
        retryDelay: 100
      });
      
      expect(result).toBe('success');
      expect(attemptCount).toBe(3);
    });

    it('应该实施断路器模式', async () => {
      const failingFunction = async () => {
        throw new Error('Service unavailable');
      };
      
      const errorHandler = new ErrorHandler();
      
      // 触发断路器
      for (let i = 0; i < 5; i++) {
        try {
          await errorHandler.withCircuitBreaker(failingFunction, {
            failureThreshold: 3,
            timeout: 1000
          });
        } catch (error) {
          // 预期的错误
        }
      }
      
      // 验证断路器已打开
      try {
        await errorHandler.withCircuitBreaker(failingFunction, {
          failureThreshold: 3,
          timeout: 1000
        });
        fail('Should have thrown circuit breaker error');
      } catch (error: any) {
        expect(error.message).toContain('Circuit breaker is open');
      }
    });

    it('应该提供降级处理', async () => {
      const failingFunction = async () => {
        throw new Error('Service unavailable');
      };
      
      const fallbackValue = { data: 'fallback' };
      
      const errorHandler = new ErrorHandler();
      const result = await errorHandler.withFallback(failingFunction, fallbackValue);
      
      expect(result).toEqual(fallbackValue);
    });
  });

  /**
   * 错误统计和分析测试
   */
  describe('Error Analytics', () => {
    it('应该收集错误指标', async () => {
      const errors = [
        new ValidationError('Invalid email'),
        new AuthenticationError('Invalid token'),
        new ValidationError('Missing field'),
        new ServiceUnavailableError('Database down')
      ];
      
      const errorHandler = new ErrorHandler();
      
      for (const error of errors) {
        await errorHandler.recordError(error, {
          endpoint: '/api/test',
          method: 'POST'
        });
      }
      
      const metrics = await errorHandler.getErrorMetrics();
      
      expect(metrics.errorCount).toBe(4);
      expect(metrics.errorsByType['ValidationError']).toBe(2);
      expect(metrics.errorsByType['AuthenticationError']).toBe(1);
      expect(metrics.errorsByType['ServiceUnavailableError']).toBe(1);
      expect(metrics.criticalErrors).toBe(1); // ServiceUnavailableError
    });

    it('应该计算错误率', async () => {
      const errorHandler = new ErrorHandler();
      
      // 模拟100个请求，其中5个错误
      for (let i = 0; i < 95; i++) {
        await errorHandler.recordSuccess();
      }
      
      for (let i = 0; i < 5; i++) {
        await errorHandler.recordError(new Error('Test error'), {});
      }
      
      const metrics = await errorHandler.getErrorMetrics();
      
      expect(metrics.errorRate).toBeCloseTo(0.05, 2); // 5%
    });

    it('应该识别错误趋势', async () => {
      const errorHandler = new ErrorHandler();
      
      // 模拟递增的错误率
      const timeWindows = [1, 2, 5, 10, 20]; // 错误数量递增
      
      for (const errorCount of timeWindows) {
        for (let i = 0; i < errorCount; i++) {
          await errorHandler.recordError(new Error('Test error'), {
            timestamp: new Date().toISOString()
          });
        }
        
        // 模拟时间推进
        jest.advanceTimersByTime(60000); // 1分钟
      }
      
      const trend = await errorHandler.getErrorTrend();
      
      expect(trend.direction).toBe('increasing');
      expect(trend.severity).toBe('high');
    });
  });

  /**
   * 性能测试
   */
  describe('Performance Tests', () => {
    it('应该高效处理大量错误', async () => {
      const errorHandler = new ErrorHandler();
      const errors = Array.from({ length: 1000 }, (_, i) => 
        new ValidationError(`Error ${i}`)
      );
      
      const startTime = Date.now();
      
      await Promise.all(
        errors.map(error => 
          errorHandler.recordError(error, { endpoint: '/api/test' })
        )
      );
      
      const processingTime = Date.now() - startTime;
      
      expect(processingTime).toBeLessThan(1000); // 1秒内处理1000个错误
    });

    it('应该有效管理内存使用', async () => {
      const errorHandler = new ErrorHandler();
      
      // 生成大量错误
      for (let i = 0; i < 10000; i++) {
        await errorHandler.recordError(new Error(`Error ${i}`), {
          endpoint: '/api/test',
          timestamp: new Date().toISOString()
        });
      }
      
      // 验证内存清理
      const memoryUsage = process.memoryUsage();
      expect(memoryUsage.heapUsed).toBeLessThan(100 * 1024 * 1024); // 100MB
    });
  });

  /**
   * 边界情况测试
   */
  describe('Edge Cases', () => {
    it('应该处理null和undefined错误', () => {
      const middleware = createErrorMiddleware();
      const req = createMockRequest() as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();
      
      middleware(null as any, req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'Unknown error occurred'
          })
        })
      );
    });

    it('应该处理循环引用错误', () => {
      const error: any = new Error('Circular error');
      error.circular = error;
      
      const response = formatErrorResponse(error);
      
      expect(response).toBeDefined();
      expect(response.error.message).toBe('Internal server error');
    });

    it('应该处理非常长的错误消息', () => {
      const longMessage = 'A'.repeat(10000);
      const error = new AppError(longMessage, 400);
      
      const response = formatErrorResponse(error);
      
      expect(response.error.message.length).toBeLessThanOrEqual(1000);
      expect(response.error.message).toContain('...');
    });

    it('应该处理特殊字符', () => {
      const specialMessage = 'Error with 特殊字符 and émojis 🚨';
      const error = new AppError(specialMessage, 400);
      
      const response = formatErrorResponse(error);
      
      expect(response.error.message).toBe(specialMessage);
    });
  });
});