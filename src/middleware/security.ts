/**
 * 安全中间件模块
 * 提供API安全验证、限流、CORS处理等功能
 */

import { NextRequest, NextResponse } from 'next/server';
import { createError, AppError, ErrorType, ErrorSeverity } from '@/utils/errorHandler';
import { getEnvConfig } from '@/utils/envConfig';
import { validateSession } from '@/utils/supabase';

/**
 * 限流存储接口
 */
interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

/**
 * 内存限流存储
 */
const rateLimitStore: RateLimitStore = {};

/**
 * 安全配置接口
 */
export interface SecurityConfig {
  enableCORS: boolean;
  enableRateLimit: boolean;
  enableAuth: boolean;
  allowedOrigins: string[];
  rateLimitWindow: number;
  rateLimitMax: number;
}

/**
 * 默认安全配置
 */
const defaultSecurityConfig: SecurityConfig = {
  enableCORS: true,
  enableRateLimit: true,
  enableAuth: true,
  allowedOrigins: ['http://localhost:3000'],
  rateLimitWindow: 15 * 60 * 1000, // 15分钟
  rateLimitMax: 100 // 每15分钟最多100次请求
};

/**
 * 获取客户端IP地址
 * @param request - Next.js请求对象
 * @returns 客户端IP地址
 */
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const remoteAddr = request.headers.get('remote-addr');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP;
  }
  
  if (remoteAddr) {
    return remoteAddr;
  }
  
  return 'unknown';
}

/**
 * 限流检查
 * @param ip - 客户端IP
 * @param config - 安全配置
 * @returns 是否通过限流检查
 */
function checkRateLimit(ip: string, config: SecurityConfig): boolean {
  const now = Date.now();
  const key = `rate_limit_${ip}`;
  
  // 清理过期的记录
  if (rateLimitStore[key] && now > rateLimitStore[key].resetTime) {
    delete rateLimitStore[key];
  }
  
  // 检查当前限流状态
  if (!rateLimitStore[key]) {
    rateLimitStore[key] = {
      count: 1,
      resetTime: now + config.rateLimitWindow
    };
    return true;
  }
  
  if (rateLimitStore[key].count >= config.rateLimitMax) {
    return false;
  }
  
  rateLimitStore[key].count++;
  return true;
}

/**
 * CORS检查
 * @param request - Next.js请求对象
 * @param config - 安全配置
 * @returns 是否通过CORS检查
 */
function checkCORS(request: NextRequest, config: SecurityConfig): boolean {
  const origin = request.headers.get('origin');
  
  if (!origin) {
    return true; // 同源请求
  }
  
  return config.allowedOrigins.includes(origin) || config.allowedOrigins.includes('*');
}

/**
 * 身份验证检查
 * @param request - Next.js请求对象
 * @returns 验证结果
 */
async function checkAuth(request: NextRequest): Promise<{ valid: boolean; user?: any; error?: string }> {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.warn('Security middleware: Missing or invalid authorization header', {
      path: request.nextUrl.pathname,
      method: request.method,
      ip: getClientIP(request)
    });
    return { valid: false, error: 'Missing or invalid authorization header' };
  }
  
  const token = authHeader.substring(7);
  
  if (!token || token.length < 10) {
    console.warn('Security middleware: Invalid token format', {
      path: request.nextUrl.pathname,
      method: request.method,
      ip: getClientIP(request)
    });
    return { valid: false, error: 'Invalid token format' };
  }
  
  try {
    const result = await validateSession(token);
    
    if (!result.valid) {
      console.warn('Security middleware: Session validation failed', {
        path: request.nextUrl.pathname,
        method: request.method,
        ip: getClientIP(request),
        error: result.error
      });
    } else {
      console.info('Security middleware: Session validated successfully', {
        path: request.nextUrl.pathname,
        method: request.method,
        userId: result.user?.id,
        ip: getClientIP(request)
      });
    }
    
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
    console.error('Security middleware: Authentication error', {
      path: request.nextUrl.pathname,
      method: request.method,
      ip: getClientIP(request),
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return { valid: false, error: errorMessage };
  }
}

/**
 * 创建CORS响应头
 * @param request - Next.js请求对象
 * @param response - Next.js响应对象
 * @param config - 安全配置
 * @returns 带CORS头的响应对象
 */
function addCORSHeaders(request: NextRequest, response: NextResponse, config: SecurityConfig): NextResponse {
  const origin = request.headers.get('origin');
  
  if (origin && config.allowedOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
  } else if (config.allowedOrigins.includes('*')) {
    response.headers.set('Access-Control-Allow-Origin', '*');
  }
  
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set('Access-Control-Max-Age', '86400');
  
  return response;
}

/**
 * 安全中间件主函数
 * @param request - Next.js请求对象
 * @param config - 安全配置（可选）
 * @returns 中间件处理结果
 */
export async function security(
  request: NextRequest,
  config: Partial<SecurityConfig> = {}
): Promise<NextResponse | null> {
  const finalConfig = { ...defaultSecurityConfig, ...config };
  
  try {
    // 处理预检请求
    if (request.method === 'OPTIONS') {
      const response = new NextResponse(null, { status: 200 });
      return finalConfig.enableCORS ? addCORSHeaders(request, response, finalConfig) : response;
    }
    
    // CORS检查
    if (finalConfig.enableCORS && !checkCORS(request, finalConfig)) {
      console.warn('Security middleware: CORS policy violation', {
        path: request.nextUrl.pathname,
        method: request.method,
        origin: request.headers.get('origin'),
        ip: getClientIP(request)
      });
      
      const response = NextResponse.json(
        { error: 'CORS policy violation' },
        { status: 403 }
      );
      return addCORSHeaders(request, response, finalConfig);
    }
    
    // 限流检查
    if (finalConfig.enableRateLimit) {
      const clientIP = getClientIP(request);
      if (!checkRateLimit(clientIP, finalConfig)) {
        console.warn('Security middleware: Rate limit exceeded', {
          path: request.nextUrl.pathname,
          method: request.method,
          ip: clientIP,
          userAgent: request.headers.get('user-agent')
        });
        
        const response = NextResponse.json(
          { error: 'Rate limit exceeded' },
          { status: 429 }
        );
        return finalConfig.enableCORS ? addCORSHeaders(request, response, finalConfig) : response;
      }
    }
    
    // 身份验证检查（仅对需要认证的路由）
    if (finalConfig.enableAuth) {
      const authResult = await checkAuth(request);
      if (!authResult.valid) {
        const response = NextResponse.json(
          { error: authResult.error || 'Authentication required' },
          { status: 401 }
        );
        return finalConfig.enableCORS ? addCORSHeaders(request, response, finalConfig) : response;
      }
      
      // 将用户信息添加到请求头中，供后续处理使用
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set('x-user-id', authResult.user?.id || '');
      requestHeaders.set('x-user-email', authResult.user?.email || '');
      
      const response = NextResponse.next({
        request: {
          headers: requestHeaders
        }
      });
      
      return finalConfig.enableCORS ? addCORSHeaders(request, response, finalConfig) : response;
    }
    
    // 通过所有检查，继续处理请求
    const response = NextResponse.next();
    return finalConfig.enableCORS ? addCORSHeaders(request, response, finalConfig) : response;
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Security middleware: Critical error', {
      path: request.nextUrl.pathname,
      method: request.method,
      ip: getClientIP(request),
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    
    // 创建结构化错误响应
    const appError = createError(
      ErrorType.SECURITY_ERROR,
      'Security middleware encountered an error',
      ErrorSeverity.HIGH,
      { originalError: errorMessage }
    );
    
    const response = NextResponse.json(
      { 
        error: 'Internal security error',
        code: appError.code,
        timestamp: appError.timestamp
      },
      { status: 500 }
    );
    
    return finalConfig.enableCORS ? addCORSHeaders(request, response, finalConfig) : response;
  }
}

/**
 * 创建安全中间件配置
 * @param overrides - 配置覆盖
 * @returns 安全配置
 */
export function createSecurityConfig(overrides: Partial<SecurityConfig> = {}): SecurityConfig {
  const envConfig = getEnvConfig();
  const appConfig = envConfig.getApp();
  
  return {
    ...defaultSecurityConfig,
    allowedOrigins: appConfig.allowedOrigins || defaultSecurityConfig.allowedOrigins,
    ...overrides
  };
}

/**
 * 无认证安全中间件（仅CORS和限流）
 * @param request - Next.js请求对象
 * @returns 中间件处理结果
 */
export async function securityWithoutAuth(request: NextRequest): Promise<NextResponse | null> {
  return security(request, { enableAuth: false });
}

/**
 * 仅限流中间件
 * @param request - Next.js请求对象
 * @returns 中间件处理结果
 */
export async function rateLimitOnly(request: NextRequest): Promise<NextResponse | null> {
  return security(request, { enableAuth: false, enableCORS: false });
}

/**
 * 清理限流存储（用于测试和维护）
 */
export function clearRateLimitStore(): void {
  Object.keys(rateLimitStore).forEach(key => {
    delete rateLimitStore[key];
  });
}

/**
 * 获取限流状态（用于监控）
 * @param ip - 客户端IP
 * @returns 限流状态
 */
export function getRateLimitStatus(ip: string): { count: number; resetTime: number } | null {
  const key = `rate_limit_${ip}`;
  return rateLimitStore[key] || null;
}

/**
 * 默认导出
 */
export default {
  security,
  securityWithoutAuth,
  rateLimitOnly,
  createSecurityConfig,
  clearRateLimitStore,
  getRateLimitStatus
};