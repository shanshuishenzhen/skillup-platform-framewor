/**
 * 错误处理器单元测试
 * 测试统一错误处理和重试机制的完整功能
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import {
  ErrorHandler,
  AppError,
  ErrorType,
  ErrorSeverity,
  createError,
  withRetry,
  standardizeError,
  logError,
  createErrorResponse,
  asyncErrorWrapper
} from '@/utils/errorHandler';

// 模拟控制台方法
const mockConsole = {
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  log: jest.fn()
};

// 保存原始控制台方法
const originalConsole = {
  error: console.error,
  warn: console.warn,
  info: console.info,
  log: console.log
};

describe('ErrorHandler', () => {
  let errorHandler: ErrorHandler;

  beforeEach(() => {
    // 替换控制台方法
    console.error = mockConsole.error;
    console.warn = mockConsole.warn;
    console.info = mockConsole.info;
    console.log = mockConsole.log;
    
    jest.clearAllMocks();
    errorHandler = new ErrorHandler();
  });

  afterEach(() => {
    // 恢复原始控制台方法
    console.error = originalConsole.error;
    console.warn = originalConsole.warn;
    console.info = originalConsole.info;
    console.log = originalConsole.log;
  });

  describe('AppError', () => {
    it('应该创建带有所有属性的AppError实例', () => {
      const error = new AppError(
        'Test error message',
        ErrorType.VALIDATION_ERROR,
        ErrorSeverity.MEDIUM,
        400,
        true,
        { field: 'email', value: 'invalid' }
      );

      expect(error.message).toBe('Test error message');
      expect(error.type).toBe(ErrorType.VALIDATION_ERROR);
      expect(error.severity).toBe(ErrorSeverity.MEDIUM);
      expect(error.statusCode).toBe(400);
      expect(error.isRetryable).toBe(true);
      expect(error.context).toEqual({ field: 'email', value: 'invalid' });
      expect(error.timestamp).toBeInstanceOf(Date);
      expect(error.id).toBeDefined();
    });

    it('应该正确转换为标准化错误', () => {
      const error = new AppError(
        'Validation failed',
        ErrorType.VALIDATION_ERROR,
        ErrorSeverity.MEDIUM,
        400,
        false,
        { field: 'password' }
      );

      const standardError = error.toStandardError();

      expect(standardError.id).toBe(error.id);
      expect(standardError.message).toBe('Validation failed');
      expect(standardError.type).toBe(ErrorType.VALIDATION_ERROR);
      expect(standardError.severity).toBe(ErrorSeverity.MEDIUM);
      expect(standardError.statusCode).toBe(400);
      expect(standardError.isRetryable).toBe(false);
      expect(standardError.timestamp).toBe(error.timestamp);
      expect(standardError.context).toEqual({ field: 'password' });
    });

    it('应该正确转换为API响应', () => {
      const error = new AppError(
        'Database connection failed',
        ErrorType.DATABASE_ERROR,
        ErrorSeverity.HIGH,
        500,
        true
      );

      const apiResponse = error.toApiResponse();

      expect(apiResponse.success).toBe(false);
      expect(apiResponse.error).toBe('Database connection failed');
      expect(apiResponse.errorType).toBe(ErrorType.DATABASE_ERROR);
      expect(apiResponse.errorId).toBe(error.id);
      expect(apiResponse.timestamp).toBe(error.timestamp.toISOString());
      expect(apiResponse.statusCode).toBe(500);
    });

    it('应该在生产环境中隐藏敏感错误信息', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const error = new AppError(
        'Internal server configuration error',
        ErrorType.SYSTEM_ERROR,
        ErrorSeverity.HIGH,
        500
      );

      const apiResponse = error.toApiResponse();

      expect(apiResponse.error).toBe('Internal server error');
      
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('standardizeError', () => {
    it('应该正确标准化AppError', () => {
      const appError = new AppError(
        'Custom app error',
        ErrorType.BUSINESS_LOGIC_ERROR,
        ErrorSeverity.MEDIUM,
        422
      );

      const standardized = errorHandler.standardizeError(appError);

      expect(standardized.message).toBe('Custom app error');
      expect(standardized.type).toBe(ErrorType.BUSINESS_LOGIC_ERROR);
      expect(standardized.severity).toBe(ErrorSeverity.MEDIUM);
      expect(standardized.statusCode).toBe(422);
    });

    it('应该正确标准化普通Error', () => {
      const error = new Error('Generic error message');

      const standardized = errorHandler.standardizeError(error);

      expect(standardized.message).toBe('Generic error message');
      expect(standardized.type).toBe(ErrorType.UNKNOWN_ERROR);
      expect(standardized.severity).toBe(ErrorSeverity.MEDIUM);
      expect(standardized.statusCode).toBe(500);
      expect(standardized.isRetryable).toBe(false);
    });

    it('应该正确标准化字符串错误', () => {
      const error = 'String error message';

      const standardized = errorHandler.standardizeError(error);

      expect(standardized.message).toBe('String error message');
      expect(standardized.type).toBe(ErrorType.UNKNOWN_ERROR);
      expect(standardized.severity).toBe(ErrorSeverity.LOW);
      expect(standardized.statusCode).toBe(500);
    });

    it('应该正确标准化网络错误', () => {
      const error = new Error('Network request failed');
      error.name = 'NetworkError';

      const standardized = errorHandler.standardizeError(error);

      expect(standardized.type).toBe(ErrorType.NETWORK_ERROR);
      expect(standardized.severity).toBe(ErrorSeverity.MEDIUM);
      expect(standardized.statusCode).toBe(503);
      expect(standardized.isRetryable).toBe(true);
    });

    it('应该正确标准化超时错误', () => {
      const error = new Error('Request timeout');
      error.name = 'TimeoutError';

      const standardized = errorHandler.standardizeError(error);

      expect(standardized.type).toBe(ErrorType.TIMEOUT_ERROR);
      expect(standardized.severity).toBe(ErrorSeverity.MEDIUM);
      expect(standardized.statusCode).toBe(408);
      expect(standardized.isRetryable).toBe(true);
    });

    it('应该正确标准化验证错误', () => {
      const error = new Error('Validation failed: email is required');

      const standardized = errorHandler.standardizeError(error);

      expect(standardized.type).toBe(ErrorType.VALIDATION_ERROR);
      expect(standardized.severity).toBe(ErrorSeverity.LOW);
      expect(standardized.statusCode).toBe(400);
      expect(standardized.isRetryable).toBe(false);
    });
  });

  describe('withRetry', () => {
    it('应该在第一次尝试成功时返回结果', async () => {
      const successFn = jest.fn().mockResolvedValue('success result');

      const result = await errorHandler.withRetry(successFn);

      expect(result).toBe('success result');
      expect(successFn).toHaveBeenCalledTimes(1);
    });

    it('应该在失败后重试并最终成功', async () => {
      const retryFn = jest.fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockRejectedValueOnce(new Error('Second failure'))
        .mockResolvedValue('success after retries');

      const result = await errorHandler.withRetry(retryFn, {
        maxRetries: 3,
        baseDelay: 10,
        maxDelay: 100
      });

      expect(result).toBe('success after retries');
      expect(retryFn).toHaveBeenCalledTimes(3);
    });

    it('应该在达到最大重试次数后抛出错误', async () => {
      const failFn = jest.fn().mockRejectedValue(new Error('Persistent failure'));

      await expect(errorHandler.withRetry(failFn, {
        maxRetries: 2,
        baseDelay: 10
      })).rejects.toThrow('Persistent failure');

      expect(failFn).toHaveBeenCalledTimes(3); // 初始调用 + 2次重试
    });

    it('应该对不可重试的错误立即失败', async () => {
      const nonRetryableError = new AppError(
        'Validation error',
        ErrorType.VALIDATION_ERROR,
        ErrorSeverity.LOW,
        400,
        false // 不可重试
      );
      
      const failFn = jest.fn().mockRejectedValue(nonRetryableError);

      await expect(errorHandler.withRetry(failFn, {
        maxRetries: 3
      })).rejects.toThrow('Validation error');

      expect(failFn).toHaveBeenCalledTimes(1); // 只调用一次，不重试
    });

    it('应该使用指数退避延迟', async () => {
      const failFn = jest.fn().mockRejectedValue(new Error('Network error'));
      const startTime = Date.now();

      try {
        await errorHandler.withRetry(failFn, {
          maxRetries: 2,
          baseDelay: 50,
          maxDelay: 1000
        });
      } catch (error) {
        // 预期会失败
      }

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // 应该至少等待 50ms + 100ms = 150ms（考虑到随机抖动，实际时间可能更长）
      expect(totalTime).toBeGreaterThan(100);
      expect(failFn).toHaveBeenCalledTimes(3);
    });

    it('应该应用最大延迟限制', async () => {
      const failFn = jest.fn().mockRejectedValue(new Error('Network error'));

      try {
        await errorHandler.withRetry(failFn, {
          maxRetries: 5,
          baseDelay: 1000,
          maxDelay: 2000 // 限制最大延迟
        });
      } catch (error) {
        // 预期会失败
      }

      expect(failFn).toHaveBeenCalledTimes(6); // 初始调用 + 5次重试
    });
  });

  describe('logError', () => {
    it('应该根据严重程度使用正确的日志级别', () => {
      const lowError = new AppError('Low severity', ErrorType.VALIDATION_ERROR, ErrorSeverity.LOW);
      const mediumError = new AppError('Medium severity', ErrorType.BUSINESS_LOGIC_ERROR, ErrorSeverity.MEDIUM);
      const highError = new AppError('High severity', ErrorType.SYSTEM_ERROR, ErrorSeverity.HIGH);
      const criticalError = new AppError('Critical severity', ErrorType.SECURITY_ERROR, ErrorSeverity.CRITICAL);

      errorHandler.logError(lowError);
      errorHandler.logError(mediumError);
      errorHandler.logError(highError);
      errorHandler.logError(criticalError);

      expect(mockConsole.info).toHaveBeenCalledWith(
        expect.stringContaining('Low severity'),
        expect.any(Object)
      );
      expect(mockConsole.warn).toHaveBeenCalledWith(
        expect.stringContaining('Medium severity'),
        expect.any(Object)
      );
      expect(mockConsole.error).toHaveBeenCalledWith(
        expect.stringContaining('High severity'),
        expect.any(Object)
      );
      expect(mockConsole.error).toHaveBeenCalledWith(
        expect.stringContaining('Critical severity'),
        expect.any(Object)
      );
    });

    it('应该包含错误上下文信息', () => {
      const errorWithContext = new AppError(
        'Error with context',
        ErrorType.DATABASE_ERROR,
        ErrorSeverity.HIGH,
        500,
        true,
        { query: 'SELECT * FROM users', params: { id: 123 } }
      );

      errorHandler.logError(errorWithContext);

      expect(mockConsole.error).toHaveBeenCalledWith(
        expect.stringContaining('Error with context'),
        expect.objectContaining({
          id: errorWithContext.id,
          type: ErrorType.DATABASE_ERROR,
          severity: ErrorSeverity.HIGH,
          context: { query: 'SELECT * FROM users', params: { id: 123 } }
        })
      );
    });
  });

  describe('createError', () => {
    it('应该创建指定类型的错误', () => {
      const validationError = errorHandler.createValidationError('Invalid email format', { field: 'email' });
      const authError = errorHandler.createAuthenticationError('Invalid credentials');
      const authzError = errorHandler.createAuthorizationError('Access denied');
      const notFoundError = errorHandler.createNotFoundError('User not found');
      const businessError = errorHandler.createBusinessLogicError('Insufficient balance');
      const networkError = errorHandler.createNetworkError('Connection failed');
      const databaseError = errorHandler.createDatabaseError('Query failed');
      const systemError = errorHandler.createSystemError('Internal error');
      const securityError = errorHandler.createSecurityError('Security violation');

      expect(validationError.type).toBe(ErrorType.VALIDATION_ERROR);
      expect(validationError.statusCode).toBe(400);
      expect(validationError.context).toEqual({ field: 'email' });

      expect(authError.type).toBe(ErrorType.AUTHENTICATION_ERROR);
      expect(authError.statusCode).toBe(401);

      expect(authzError.type).toBe(ErrorType.AUTHORIZATION_ERROR);
      expect(authzError.statusCode).toBe(403);

      expect(notFoundError.type).toBe(ErrorType.NOT_FOUND_ERROR);
      expect(notFoundError.statusCode).toBe(404);

      expect(businessError.type).toBe(ErrorType.BUSINESS_LOGIC_ERROR);
      expect(businessError.statusCode).toBe(422);

      expect(networkError.type).toBe(ErrorType.NETWORK_ERROR);
      expect(networkError.statusCode).toBe(503);
      expect(networkError.isRetryable).toBe(true);

      expect(databaseError.type).toBe(ErrorType.DATABASE_ERROR);
      expect(databaseError.statusCode).toBe(500);
      expect(databaseError.isRetryable).toBe(true);

      expect(systemError.type).toBe(ErrorType.SYSTEM_ERROR);
      expect(systemError.statusCode).toBe(500);

      expect(securityError.type).toBe(ErrorType.SECURITY_ERROR);
      expect(securityError.statusCode).toBe(403);
      expect(securityError.severity).toBe(ErrorSeverity.CRITICAL);
    });
  });

  describe('便捷函数', () => {
    it('createError应该创建AppError实例', () => {
      const error = createError('Test message', ErrorType.VALIDATION_ERROR);
      
      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe('Test message');
      expect(error.type).toBe(ErrorType.VALIDATION_ERROR);
    });

    it('withRetry应该使用默认错误处理器', async () => {
      const successFn = jest.fn().mockResolvedValue('success');
      
      const result = await withRetry(successFn);
      
      expect(result).toBe('success');
      expect(successFn).toHaveBeenCalledTimes(1);
    });

    it('standardizeError应该使用默认错误处理器', () => {
      const error = new Error('Test error');
      
      const standardized = standardizeError(error);
      
      expect(standardized.message).toBe('Test error');
      expect(standardized.type).toBe(ErrorType.UNKNOWN_ERROR);
    });

    it('logError应该使用默认错误处理器', () => {
      const error = new AppError('Test log', ErrorType.SYSTEM_ERROR, ErrorSeverity.HIGH);
      
      logError(error);
      
      expect(mockConsole.error).toHaveBeenCalledWith(
        expect.stringContaining('Test log'),
        expect.any(Object)
      );
    });

    it('createErrorResponse应该创建标准API错误响应', () => {
      const error = new AppError('API error', ErrorType.VALIDATION_ERROR, ErrorSeverity.LOW, 400);
      
      const response = createErrorResponse(error);
      
      expect(response.success).toBe(false);
      expect(response.error).toBe('API error');
      expect(response.errorType).toBe(ErrorType.VALIDATION_ERROR);
      expect(response.statusCode).toBe(400);
    });

    it('asyncErrorWrapper应该包装异步函数并处理错误', async () => {
      const asyncFn = async (input: string) => {
        if (input === 'error') {
          throw new Error('Test async error');
        }
        return `Result: ${input}`;
      };
      
      const wrappedFn = asyncErrorWrapper(asyncFn);
      
      // 测试成功情况
      const successResult = await wrappedFn('success');
      expect(successResult).toBe('Result: success');
      
      // 测试错误情况
      await expect(wrappedFn('error')).rejects.toThrow('Test async error');
      
      // 验证错误被记录
      expect(mockConsole.error).toHaveBeenCalled();
    });
  });

  describe('边界情况和错误处理', () => {
    it('应该处理null和undefined错误', () => {
      const nullError = errorHandler.standardizeError(null);
      const undefinedError = errorHandler.standardizeError(undefined);
      
      expect(nullError.message).toBe('Unknown error occurred');
      expect(nullError.type).toBe(ErrorType.UNKNOWN_ERROR);
      
      expect(undefinedError.message).toBe('Unknown error occurred');
      expect(undefinedError.type).toBe(ErrorType.UNKNOWN_ERROR);
    });

    it('应该处理循环引用的错误对象', () => {
      const circularError: Error & { self?: unknown } = new Error('Circular error');
      circularError.self = circularError;
      
      expect(() => {
        errorHandler.logError(circularError);
      }).not.toThrow();
      
      expect(mockConsole.warn).toHaveBeenCalled();
    });

    it('应该处理非常长的错误消息', () => {
      const longMessage = 'A'.repeat(10000);
      const error = new AppError(longMessage, ErrorType.VALIDATION_ERROR, ErrorSeverity.LOW);
      
      expect(() => {
        errorHandler.logError(error);
      }).not.toThrow();
      
      expect(mockConsole.info).toHaveBeenCalled();
    });

    it('应该处理重试函数中的同步错误', async () => {
      const syncErrorFn = () => {
        throw new Error('Synchronous error');
      };
      
      await expect(errorHandler.withRetry(syncErrorFn)).rejects.toThrow('Synchronous error');
    });

    it('应该处理重试配置的边界值', async () => {
      const failFn = jest.fn().mockRejectedValue(new Error('Test error'));
      
      // 测试零重试
      await expect(errorHandler.withRetry(failFn, { maxRetries: 0 })).rejects.toThrow();
      expect(failFn).toHaveBeenCalledTimes(1);
      
      jest.clearAllMocks();
      
      // 测试负数重试（应该被处理为0）
      await expect(errorHandler.withRetry(failFn, { maxRetries: -1 })).rejects.toThrow();
      expect(failFn).toHaveBeenCalledTimes(1);
    });

    it('应该处理极小的延迟值', async () => {
      const failFn = jest.fn().mockRejectedValue(new Error('Test error'));
      
      const startTime = Date.now();
      try {
        await errorHandler.withRetry(failFn, {
          maxRetries: 1,
          baseDelay: 0.1, // 极小延迟
          maxDelay: 1
        });
      } catch (error) {
        // 预期会失败
      }
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(100); // 应该很快完成
      expect(failFn).toHaveBeenCalledTimes(2);
    });
  });

  describe('性能测试', () => {
    it('应该高效处理大量错误', () => {
      const startTime = Date.now();
      
      for (let i = 0; i < 1000; i++) {
        const error = new Error(`Error ${i}`);
        errorHandler.standardizeError(error);
      }
      
      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(1000); // 应该在1秒内完成
    });

    it('应该高效处理并发错误处理', async () => {
      const errors = Array.from({ length: 100 }, (_, i) => new Error(`Concurrent error ${i}`));
      
      const startTime = Date.now();
      const promises = errors.map(error => 
        Promise.resolve().then(() => errorHandler.standardizeError(error))
      );
      
      const results = await Promise.all(promises);
      const endTime = Date.now();
      
      expect(results).toHaveLength(100);
      expect(endTime - startTime).toBeLessThan(500); // 应该在0.5秒内完成
    });
  });
});