/**
 * 日志服务模块
 * 提供统一的日志记录功能，支持多种日志级别和输出格式
 */

// import { getEnvConfig } from './envConfig';

/**
 * 日志级别枚举
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  CRITICAL = 4
}

/**
 * 日志条目接口
 */
export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  error?: Error;
  requestId?: string;
  userId?: string;
  ip?: string;
  userAgent?: string;
}

/**
 * 日志配置接口
 */
export interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableFile: boolean;
  enableRemote: boolean;
  logDir: string;
  maxFileSize: number;
  maxFiles: number;
  remoteEndpoint?: string;
  format: 'json' | 'text';
}

/**
 * 日志服务类
 * 提供统一的日志记录功能
 */
class Logger {
  private static instance: Logger;
  private config: LoggerConfig;
  private logBuffer: LogEntry[] = [];
  private flushTimer?: NodeJS.Timeout;

  private constructor() {
    const nodeEnv = process.env.NODE_ENV || 'development';
    this.config = {
      level: this.parseLogLevel(process.env.LOG_LEVEL || 'info'),
      enableConsole: nodeEnv !== 'test',
      enableFile: nodeEnv === 'production',
      enableRemote: nodeEnv === 'production',
      logDir: './logs',
      maxFileSize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      remoteEndpoint: process.env.LOG_REMOTE_ENDPOINT,
      format: 'json'
    };

    // 启动刷新定时器（测试环境中禁用）
    if (nodeEnv !== 'test') {
      this.startFlushTimer();
    }

    // 进程退出时刷新日志
    process.on('exit', () => this.flush());
    process.on('SIGINT', () => {
      this.flush();
      process.exit(0);
    });
  }

  /**
   * 获取Logger单例实例
   */
  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  /**
   * 解析日志级别
   */
  private parseLogLevel(level: string): LogLevel {
    switch (level.toLowerCase()) {
      case 'debug': return LogLevel.DEBUG;
      case 'info': return LogLevel.INFO;
      case 'warn': return LogLevel.WARN;
      case 'error': return LogLevel.ERROR;
      case 'critical': return LogLevel.CRITICAL;
      default: return LogLevel.INFO;
    }
  }

  /**
   * 启动定时刷新器
   */
  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flush();
    }, 5000); // 每5秒刷新一次
  }

  /**
   * 记录日志
   */
  private log(level: LogLevel, message: string, context?: Record<string, unknown>, error?: Error): void {
    if (level < this.config.level) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      error,
      requestId: this.getRequestId(),
      userId: this.getUserId(),
      ip: this.getClientIp(),
      userAgent: this.getUserAgent()
    };

    // 添加到缓冲区
    this.logBuffer.push(entry);

    // 控制台输出
    if (this.config.enableConsole) {
      this.outputToConsole(entry);
    }

    // 如果是错误级别，立即刷新
    if (level >= LogLevel.ERROR) {
      this.flush();
    }
  }

  /**
   * 输出到控制台
   */
  private outputToConsole(entry: LogEntry): void {
    const levelName = LogLevel[entry.level];
    const timestamp = entry.timestamp;
    const prefix = `[${timestamp}] [${levelName}]`;

    if (this.config.format === 'json') {
      console.log(JSON.stringify(entry));
    } else {
      let output = `${prefix} ${entry.message}`;
      
      if (entry.context) {
        output += ` ${JSON.stringify(entry.context)}`;
      }
      
      if (entry.error) {
        output += `\n${entry.error.stack}`;
      }

      // 根据级别选择输出方法
      switch (entry.level) {
        case LogLevel.DEBUG:
          console.debug(output);
          break;
        case LogLevel.INFO:
          console.info(output);
          break;
        case LogLevel.WARN:
          console.warn(output);
          break;
        case LogLevel.ERROR:
        case LogLevel.CRITICAL:
          console.error(output);
          break;
      }
    }
  }

  /**
   * 刷新日志缓冲区
   */
  private async flush(): Promise<void> {
    if (this.logBuffer.length === 0) {
      return;
    }

    const entries = [...this.logBuffer];
    this.logBuffer = [];

    try {
      // 写入文件
      if (this.config.enableFile) {
        await this.writeToFile(entries);
      }

      // 发送到远程
      if (this.config.enableRemote && this.config.remoteEndpoint) {
        await this.sendToRemote(entries);
      }
    } catch (error) {
      console.error('Failed to flush logs:', error);
      // 将失败的日志重新加入缓冲区
      this.logBuffer.unshift(...entries);
    }
  }

  /**
   * 写入文件
   */
  private async writeToFile(entries: LogEntry[]): Promise<void> {
    // 这里可以实现文件写入逻辑
    // 由于是Node.js环境，可以使用fs模块
    console.log(`Writing ${entries.length} log entries to file`);
  }

  /**
   * 发送到远程日志服务
   */
  private async sendToRemote(entries: LogEntry[]): Promise<void> {
    if (!this.config.remoteEndpoint) {
      return;
    }

    try {
      const response = await fetch(this.config.remoteEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ logs: entries })
      });

      if (!response.ok) {
        throw new Error(`Remote logging failed: ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to send logs to remote:', error);
      throw error;
    }
  }

  /**
   * 获取请求ID（从异步上下文）
   */
  private getRequestId(): string | undefined {
    // 这里可以从异步上下文或请求头中获取
    return undefined;
  }

  /**
   * 获取用户ID（从异步上下文）
   */
  private getUserId(): string | undefined {
    // 这里可以从异步上下文或JWT中获取
    return undefined;
  }

  /**
   * 获取客户端IP（从异步上下文）
   */
  private getClientIp(): string | undefined {
    // 这里可以从异步上下文或请求头中获取
    return undefined;
  }

  /**
   * 获取用户代理（从异步上下文）
   */
  private getUserAgent(): string | undefined {
    // 这里可以从异步上下文或请求头中获取
    return undefined;
  }

  /**
   * Debug级别日志
   */
  public debug(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  /**
   * Info级别日志
   */
  public info(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, message, context);
  }

  /**
   * Warn级别日志
   */
  public warn(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, message, context);
  }

  /**
   * Error级别日志
   */
  public error(message: string, context?: Record<string, unknown>, error?: Error): void {
    this.log(LogLevel.ERROR, message, context, error);
  }

  /**
   * Critical级别日志
   */
  public critical(message: string, context?: Record<string, unknown>, error?: Error): void {
    this.log(LogLevel.CRITICAL, message, context, error);
  }

  /**
   * 设置日志级别
   */
  public setLevel(level: LogLevel): void {
    this.config.level = level;
  }

  /**
   * 获取当前日志级别
   */
  public getLevel(): LogLevel {
    return this.config.level;
  }

  /**
   * 更新配置
   */
  public updateConfig(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 获取日志统计信息
   */
  public getStats(): {
    bufferSize: number;
    level: LogLevel;
    config: LoggerConfig;
  } {
    return {
      bufferSize: this.logBuffer.length,
      level: this.config.level,
      config: { ...this.config }
    };
  }

  /**
   * 销毁Logger实例
   */
  public destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.flush();
  }
}

// 导出单例实例
export const logger = Logger.getInstance();

// 导出便捷函数
export const log = {
  debug: (message: string, context?: Record<string, unknown>) => logger.debug(message, context),
  info: (message: string, context?: Record<string, unknown>) => logger.info(message, context),
  warn: (message: string, context?: Record<string, unknown>) => logger.warn(message, context),
  error: (message: string, context?: Record<string, unknown>, error?: Error) => logger.error(message, context, error),
  critical: (message: string, context?: Record<string, unknown>, error?: Error) => logger.critical(message, context, error)
};

export default logger;