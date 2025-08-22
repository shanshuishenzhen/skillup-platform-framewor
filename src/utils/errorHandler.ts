/**
 * 统一错误处理和重试机制模块
 * 提供标准化的错误处理、重试逻辑和错误报告功能
 */

/**
 * 错误类型枚举
 */
export enum ErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  EXTERNAL_API_ERROR = 'EXTERNAL_API_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  FILE_UPLOAD_ERROR = 'FILE_UPLOAD_ERROR',
  AI_SERVICE_ERROR = 'AI_SERVICE_ERROR',
  FACE_RECOGNITION_ERROR = 'FACE_RECOGNITION_ERROR'
}

/**
 * 错误严重程度枚举
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * 重试策略配置接口
 */
export interface RetryConfig {
  maxAttempts: number; // 最大重试次数
  baseDelay: number; // 基础延迟时间（毫秒）
  maxDelay: number; // 最大延迟时间（毫秒）
  backoffMultiplier: number; // 退避倍数
  jitter: boolean; // 是否添加随机抖动
  retryableErrors: ErrorType[]; // 可重试的错误类型
}

/**
 * 错误上下文接口
 */
export interface ErrorContext {
  userId?: string;
  requestId?: string;
  endpoint?: string;
  method?: string;
  userAgent?: string;
  ip?: string;
  timestamp: Date;
  additionalData?: Record<string, unknown>;
}

/**
 * 标准化错误接口
 */
export interface StandardError {
  type: ErrorType;
  message: string;
  code?: string;
  statusCode?: number;
  severity: ErrorSeverity;
  context?: ErrorContext;
  originalError?: Error;
  stack?: string;
  retryable: boolean;
}

/**
 * 应用程序错误基类
 */
export class AppError extends Error {
  public readonly type: ErrorType;
  public readonly code?: string;
  public readonly statusCode: number;
  public readonly severity: ErrorSeverity;
  public readonly context?: ErrorContext;
  public readonly originalError?: Error;
  public readonly retryable: boolean;

  constructor(
    type: ErrorType,
    message: string,
    options: {
      code?: string;
      statusCode?: number;
      severity?: ErrorSeverity;
      context?: ErrorContext;
      originalError?: Error;
      retryable?: boolean;
    } = {}
  ) {
    super(message);
    this.name = 'AppError';
    this.type = type;
    this.code = options.code;
    this.statusCode = options.statusCode || 500;
    this.severity = options.severity || ErrorSeverity.MEDIUM;
    this.context = options.context;
    this.originalError = options.originalError;
    this.retryable = options.retryable || false;

    // 保持错误堆栈跟踪
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }

  /**
   * 转换为标准化错误格式
   * @returns 标准化错误对象
   */
  toStandardError(): StandardError {
    return {
      type: this.type,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      severity: this.severity,
      context: this.context,
      originalError: this.originalError,
      stack: this.stack,
      retryable: this.retryable
    };
  }

  /**
   * 转换为API响应格式
   * @param includeStack 是否包含堆栈信息
   * @returns API响应对象
   */
  toApiResponse(includeStack: boolean = false): {
    success: false;
    error: {
      type: ErrorType;
      message: string;
      code?: string;
      timestamp: string;
      stack?: string;
      requestId?: string;
    };
  } {
    const response = {
      success: false,
      error: {
        type: this.type,
        message: this.message,
        code: this.code,
        timestamp: new Date().toISOString()
      }
    };

    if (includeStack && this.stack) {
      response.error.stack = this.stack;
    }

    if (this.context?.requestId) {
      response.error.requestId = this.context.requestId;
    }

    return response;
  }
}

/**
 * 默认重试配置
 */
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
  jitter: true,
  retryableErrors: [
    ErrorType.NETWORK_ERROR,
    ErrorType.TIMEOUT_ERROR,
    ErrorType.RATE_LIMIT_ERROR,
    ErrorType.SERVICE_UNAVAILABLE,
    ErrorType.INTERNAL_ERROR
  ]
};

/**
 * 错误处理器类
 */
export class ErrorHandler {
  private static instance: ErrorHandler;
  private retryConfig: RetryConfig;

  constructor(retryConfig: Partial<RetryConfig> = {}) {
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
  }

  /**
   * 获取错误处理器单例
   * @param config 重试配置
   * @returns 错误处理器实例
   */
  static getInstance(config?: Partial<RetryConfig>): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler(config);
    }
    return ErrorHandler.instance;
  }

  /**
   * 标准化错误处理
   * @param error 原始错误
   * @param context 错误上下文
   * @returns 标准化错误
   */
  standardizeError(error: unknown, context?: Partial<ErrorContext>): AppError {
    // 如果已经是AppError，直接返回
    if (error instanceof AppError) {
      return error;
    }

    // 构建错误上下文
    const errorContext: ErrorContext = {
      timestamp: new Date(),
      ...context
    };

    // 根据错误类型进行分类
    let errorType = ErrorType.INTERNAL_ERROR;
    let statusCode = 500;
    let severity = ErrorSeverity.MEDIUM;
    let retryable = false;

    if (error?.name === 'TypeError' || error?.code === 'ENOTFOUND') {
      errorType = ErrorType.NETWORK_ERROR;
      statusCode = 503;
      retryable = true;
    } else if (error?.name === 'TimeoutError' || error?.code === 'ETIMEDOUT') {
      errorType = ErrorType.TIMEOUT_ERROR;
      statusCode = 408;
      retryable = true;
    } else if (error?.status === 401 || error?.statusCode === 401) {
      errorType = ErrorType.AUTHENTICATION_ERROR;
      statusCode = 401;
      severity = ErrorSeverity.HIGH;
    } else if (error?.status === 403 || error?.statusCode === 403) {
      errorType = ErrorType.AUTHORIZATION_ERROR;
      statusCode = 403;
      severity = ErrorSeverity.HIGH;
    } else if (error?.status === 429 || error?.statusCode === 429) {
      errorType = ErrorType.RATE_LIMIT_ERROR;
      statusCode = 429;
      retryable = true;
    } else if (error?.status === 503 || error?.statusCode === 503) {
      errorType = ErrorType.SERVICE_UNAVAILABLE;
      statusCode = 503;
      retryable = true;
    } else if (error?.status >= 400 && error?.status < 500) {
      errorType = ErrorType.VALIDATION_ERROR;
      statusCode = error.status;
    }

    return new AppError(
      errorType,
      error?.message || '未知错误',
      {
        code: error?.code,
        statusCode,
        severity,
        context: errorContext,
        originalError: error,
        retryable
      }
    );
  }

  /**
   * 带重试机制的函数执行
   * @param fn 要执行的函数
   * @param config 重试配置
   * @returns 执行结果
   */
  async withRetry<T>(
    fn: () => Promise<T>,
    config?: Partial<RetryConfig>
  ): Promise<T> {
    const retryConfig = { ...this.retryConfig, ...config };
    let lastError: AppError;
    
    for (let attempt = 1; attempt <= retryConfig.maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = this.standardizeError(error);
        
        // 检查是否可重试
        if (!lastError.retryable || !retryConfig.retryableErrors.includes(lastError.type)) {
          throw lastError;
        }
        
        // 如果是最后一次尝试，直接抛出错误
        if (attempt === retryConfig.maxAttempts) {
          throw lastError;
        }
        
        // 计算延迟时间
        const delay = this.calculateDelay(attempt, retryConfig);
        
        console.warn(
          `操作失败，第 ${attempt} 次重试，${delay}ms 后重试:`,
          lastError.message
        );
        
        // 等待后重试
        await this.sleep(delay);
      }
    }
    
    throw lastError!;
  }

  /**
   * 计算重试延迟时间
   * @param attempt 当前尝试次数
   * @param config 重试配置
   * @returns 延迟时间（毫秒）
   */
  private calculateDelay(attempt: number, config: RetryConfig): number {
    // 指数退避算法
    let delay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1);
    
    // 限制最大延迟
    delay = Math.min(delay, config.maxDelay);
    
    // 添加随机抖动
    if (config.jitter) {
      delay = delay * (0.5 + Math.random() * 0.5);
    }
    
    return Math.floor(delay);
  }

  /**
   * 睡眠函数
   * @param ms 毫秒数
   * @returns Promise
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 记录错误日志
   * @param error 错误对象
   * @param context 额外上下文
   */
  logError(error: AppError, context?: Record<string, unknown>): void {
    const logData = {
      timestamp: new Date().toISOString(),
      type: error.type,
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      severity: error.severity,
      context: { ...error.context, ...context },
      stack: error.stack
    };

    // 根据严重程度选择日志级别
    switch (error.severity) {
      case ErrorSeverity.CRITICAL:
        console.error('🚨 CRITICAL ERROR:', logData);
        break;
      case ErrorSeverity.HIGH:
        console.error('❌ HIGH ERROR:', logData);
        break;
      case ErrorSeverity.MEDIUM:
        console.warn('⚠️ MEDIUM ERROR:', logData);
        break;
      case ErrorSeverity.LOW:
        console.info('ℹ️ LOW ERROR:', logData);
        break;
    }

    // TODO: 在生产环境中，可以将错误发送到监控系统
    // 例如：Sentry、DataDog、CloudWatch等
    // this.sendToMonitoring(logData);
  }

  /**
   * 创建特定类型的错误
   * @param type 错误类型
   * @param message 错误消息
   * @param options 错误选项
   * @returns AppError实例
   */
  createError(
    type: ErrorType,
    message: string,
    options?: {
      code?: string;
      statusCode?: number;
      severity?: ErrorSeverity;
      context?: Partial<ErrorContext>;
      originalError?: Error;
      retryable?: boolean;
    }
  ): AppError {
    const context: ErrorContext = {
      timestamp: new Date(),
      ...options?.context
    };

    return new AppError(type, message, {
      ...options,
      context
    });
  }
}

/**
 * 导出默认错误处理器实例
 */
export const errorHandler = ErrorHandler.getInstance();

/**
 * 便捷的错误创建函数
 */
export const createError = (
  type: ErrorType,
  message: string,
  options?: Parameters<ErrorHandler['createError']>[2]
): AppError => {
  return errorHandler.createError(type, message, options);
};

/**
 * 便捷的重试执行函数
 */
export const withRetry = <T>(
  fn: () => Promise<T>,
  config?: Partial<RetryConfig>
): Promise<T> => {
  return errorHandler.withRetry(fn, config);
};

/**
 * 便捷的错误标准化函数
 */
export const standardizeError = (
  error: unknown,
  context?: Partial<ErrorContext>
): AppError => {
  return errorHandler.standardizeError(error, context);
};

/**
 * 便捷的错误日志记录函数
 */
export const logError = (
  error: AppError,
  context?: Record<string, unknown>
): void => {
  return errorHandler.logError(error, context);
};

/**
 * API错误响应生成器
 * @param error 错误对象
 * @param includeStack 是否包含堆栈信息
 * @returns Next.js响应对象
 */
export const createErrorResponse = (
  error: unknown,
  includeStack: boolean = process.env.NODE_ENV === 'development'
) => {
  const appError = error instanceof AppError ? error : standardizeError(error);
  
  // 记录错误日志
  logError(appError);
  
  return {
    status: appError.statusCode,
    body: appError.toApiResponse(includeStack)
  };
};

/**
 * 异步函数错误包装器
 * @param fn 异步函数
 * @returns 包装后的函数
 */
export const asyncErrorWrapper = <T extends unknown[], R>(
  fn: (...args: T) => Promise<R>
) => {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error) {
      const appError = standardizeError(error);
      logError(appError);
      throw appError;
    }
  };
};