/**
 * 统一的认证错误处理工具
 * 提供一致的认证错误处理、token刷新和日志记录功能
 */

import { isJWTTokenValid, parseJWTToken, getJWTTokenRemainingTime } from './jwt';

// 认证错误类型
export interface AuthError {
  type: 'token_expired' | 'token_invalid' | 'permission_denied' | 'network_error' | 'server_error';
  message: string;
  shouldLogout: boolean;
  shouldRefresh: boolean;
}

// 认证日志记录器
class AuthLogger {
  private static instance: AuthLogger;
  private logs: Array<{ timestamp: number; level: string; message: string; data?: unknown }> = [];

  static getInstance(): AuthLogger {
    if (!AuthLogger.instance) {
      AuthLogger.instance = new AuthLogger();
    }
    return AuthLogger.instance;
  }

  log(level: 'info' | 'warn' | 'error', message: string, data?: unknown) {
    const logEntry = {
      timestamp: Date.now(),
      level,
      message,
      data
    };
    
    this.logs.push(logEntry);
    
    // 保持最近100条日志
    if (this.logs.length > 100) {
      this.logs = this.logs.slice(-100);
    }
    
    // 输出到控制台
    const emoji = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : 'ℹ️';
    console.log(`${emoji} [AuthHandler] ${message}`, data || '');
  }

  getLogs(): Array<{ timestamp: number; level: string; message: string; data?: unknown }> {
    return [...this.logs];
  }

  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }
}

// 认证错误处理器
export class AuthErrorHandler {
  private static instance: AuthErrorHandler;
  private logger: AuthLogger;
  private refreshPromise: Promise<boolean> | null = null;

  private constructor() {
    this.logger = AuthLogger.getInstance();
  }

  static getInstance(): AuthErrorHandler {
    if (!AuthErrorHandler.instance) {
      AuthErrorHandler.instance = new AuthErrorHandler();
    }
    return AuthErrorHandler.instance;
  }

  /**
   * 分析认证错误类型
   * @param response - HTTP响应对象
   * @param operation - 操作名称
   * @returns 认证错误信息
   */
  analyzeAuthError(response: Response, _operation: string): AuthError {
    const token = localStorage.getItem('token');
    
    if (response.status === 401) {
      if (!token) {
        return {
          type: 'token_invalid',
          message: '认证信息缺失，请重新登录',
          shouldLogout: true,
          shouldRefresh: false
        };
      }
      
      if (!isJWTTokenValid(token)) {
        return {
          type: 'token_expired',
          message: '认证信息已过期，正在尝试刷新',
          shouldLogout: false,
          shouldRefresh: true
        };
      }
      
      // 对于管理员用户，优先尝试刷新而不是直接登出
      const tokenData = parseJWTToken(token);
      if (tokenData?.role === 'admin') {
        return {
          type: 'token_expired',
          message: '管理员认证需要刷新，正在尝试刷新',
          shouldLogout: false,
          shouldRefresh: true
        };
      }
      
      return {
        type: 'token_invalid',
        message: '认证信息无效，请重新登录',
        shouldLogout: true,
        shouldRefresh: false
      };
    }
    
    if (response.status === 403) {
      return {
        type: 'permission_denied',
        message: '权限不足，无法执行此操作',
        shouldLogout: false,
        shouldRefresh: false
      };
    }
    
    if (response.status >= 500) {
      return {
        type: 'server_error',
        message: '服务器暂时不可用，请稍后重试',
        shouldLogout: false,
        shouldRefresh: false
      };
    }
    
    return {
      type: 'network_error',
      message: '网络连接异常，请检查网络后重试',
      shouldLogout: false,
      shouldRefresh: false
    };
  }

  /**
   * 处理认证错误
   * @param error - 认证错误信息
   * @param operation - 操作名称
   * @returns 是否成功处理
   */
  async handleAuthError(error: AuthError, operation: string): Promise<boolean> {
    this.logger.log('warn', `认证错误: ${operation}`, {
      type: error.type,
      message: error.message,
      shouldLogout: error.shouldLogout,
      shouldRefresh: error.shouldRefresh
    });

    // 尝试刷新token
    if (error.shouldRefresh) {
      const refreshed = await this.refreshToken();
      if (refreshed) {
        this.logger.log('info', 'Token刷新成功，可以重试操作');
        return true;
      } else {
        // 刷新失败时，对于管理员用户给予更多容错
        const token = localStorage.getItem('token');
        const tokenData = token ? parseJWTToken(token) : null;
        if (tokenData?.role === 'admin') {
          this.logger.log('warn', '管理员Token刷新失败，但允许继续操作');
          this.showErrorMessage('认证状态异常，部分功能可能受限，建议刷新页面');
          return false; // 不强制登出，让AdminGuard处理
        }
      }
    }

    // 需要登出
    if (error.shouldLogout) {
      this.logout();
      return false;
    }

    // 显示错误信息
    this.showErrorMessage(error.message);
    return false;
  }

  /**
   * 刷新token
   * @returns 是否刷新成功
   */
  private async refreshToken(): Promise<boolean> {
    // 防止并发刷新
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.performTokenRefresh();
    const result = await this.refreshPromise;
    this.refreshPromise = null;
    
    return result;
  }

  /**
   * 执行token刷新
   * @returns 是否刷新成功
   */
  private async performTokenRefresh(): Promise<boolean> {
    try {
      this.logger.log('info', '开始刷新token');
      
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        this.logger.log('error', '未找到refreshToken');
        return false;
      }

      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.token) {
          localStorage.setItem('token', data.token);
          if (data.refreshToken) {
            localStorage.setItem('refreshToken', data.refreshToken);
          }
          this.logger.log('info', 'Token刷新成功');
          return true;
        }
      }

      this.logger.log('error', 'Token刷新失败', { status: response.status });
      return false;
    } catch (error) {
      this.logger.log('error', 'Token刷新异常', error);
      return false;
    }
  }

  /**
   * 检查token是否即将过期并自动刷新
   * @param bufferMinutes - 提前刷新的分钟数
   */
  async checkAndRefreshToken(bufferMinutes: number = 5): Promise<void> {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const remainingTime = getJWTTokenRemainingTime(token);
      const bufferTime = bufferMinutes * 60 * 1000; // 转换为毫秒

      if (remainingTime > 0 && remainingTime < bufferTime) {
        this.logger.log('info', `Token将在${Math.round(remainingTime / 60000)}分钟后过期，开始预刷新`);
        await this.refreshToken();
      }
    } catch (error) {
      this.logger.log('error', 'Token过期检查失败', error);
    }
  }

  /**
   * 登出用户
   */
  private logout(): void {
    this.logger.log('info', '执行用户登出');
    
    // 清除认证信息
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    
    // 重定向到登录页
    const currentPath = window.location.pathname;
    const redirectUrl = currentPath !== '/login' ? `?redirect=${encodeURIComponent(currentPath)}` : '';
    
    setTimeout(() => {
      window.location.href = `/login${redirectUrl}`;
    }, 1000);
  }

  /**
   * 显示错误信息
   * @param message - 错误信息
   */
  private showErrorMessage(message: string): void {
    // 这里可以集成更好的通知系统，比如toast
    alert(message);
  }

  /**
   * 获取认证日志
   */
  getLogs() {
    return this.logger.getLogs();
  }

  /**
   * 导出认证日志
   */
  exportLogs(): string {
    return this.logger.exportLogs();
  }
}

// 导出单例实例
export const authErrorHandler = AuthErrorHandler.getInstance();

// 便捷函数
export const handleApiAuthError = async (response: Response, operation: string): Promise<boolean> => {
  const error = authErrorHandler.analyzeAuthError(response, operation);
  return authErrorHandler.handleAuthError(error, operation);
};

export const checkTokenExpiration = async (bufferMinutes?: number): Promise<void> => {
  return authErrorHandler.checkAndRefreshToken(bufferMinutes);
};