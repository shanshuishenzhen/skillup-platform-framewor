/**
 * API安全中间件
 * 提供访问控制、限流、CORS、安全头等功能
 */

import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import cors from 'cors';
import encryptionService from '../utils/encryption';

// 限流配置接口
interface RateLimitConfig {
  windowMs: number;
  max: number;
  message: string;
  standardHeaders: boolean;
  legacyHeaders: boolean;
}

// API密钥验证中间件
export const apiKeyAuth = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-api-key'] as string;
  const validApiKey = process.env.API_SECRET_KEY;

  if (!validApiKey) {
    return res.status(500).json({
      success: false,
      message: 'API密钥未配置'
    });
  }

  if (!apiKey || apiKey !== validApiKey) {
    return res.status(401).json({
      success: false,
      message: 'API密钥无效或缺失'
    });
  }

  next();
};

// JWT令牌验证中间件
export const tokenAuth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      success: false,
      message: '访问令牌缺失'
    });
  }

  try {
    const verification = encryptionService.verifyApiToken(token);
    
    if (!verification.valid) {
      return res.status(401).json({
        success: false,
        message: verification.expired ? '令牌已过期' : '令牌无效'
      });
    }

    // 将用户ID添加到请求对象
    (req as Request & { userId: string }).userId = verification.userId;
    next();
  } catch {
    return res.status(401).json({
      success: false,
      message: '令牌验证失败'
    });
  }
};

// 通用限流中间件
export const createRateLimit = (config: Partial<RateLimitConfig>) => {
  const defaultConfig: RateLimitConfig = {
    windowMs: 15 * 60 * 1000, // 15分钟
    max: 100, // 限制每个IP在窗口期内最多100个请求
    message: '请求过于频繁，请稍后再试',
    standardHeaders: true,
    legacyHeaders: false
  };

  return rateLimit({
    ...defaultConfig,
    ...config,
    handler: (req: Request, res: Response) => {
      res.status(429).json({
        success: false,
        message: config.message || defaultConfig.message,
        retryAfter: Math.round(config.windowMs || defaultConfig.windowMs / 1000)
      });
    }
  });
};

// 人脸认证API专用限流（更严格）
export const faceAuthRateLimit = createRateLimit({
  windowMs: 5 * 60 * 1000, // 5分钟
  max: 10, // 每5分钟最多10次人脸认证请求
  message: '人脸认证请求过于频繁，请5分钟后再试'
});

// 一般API限流
export const generalRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100, // 每15分钟最多100个请求
  message: 'API请求过于频繁，请稍后再试'
});

// 严格限流（用于敏感操作）
export const strictRateLimit = createRateLimit({
  windowMs: 60 * 60 * 1000, // 1小时
  max: 5, // 每小时最多5次请求
  message: '敏感操作请求过于频繁，请1小时后再试'
});

// CORS配置
export const corsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    // 允许的域名列表
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5173',
      'https://your-domain.com' // 生产环境域名
    ];

    // 开发环境允许所有来源
    if (process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }

    // 生产环境检查域名白名单
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS策略不允许此来源'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
};

// 安全头配置
export const helmetConfig = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: false // 为了兼容某些第三方服务
};

// 请求日志中间件
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const { method, url, ip } = req;
  const userAgent = req.get('User-Agent') || 'Unknown';

  // 记录请求开始
  console.log(`[${new Date().toISOString()}] ${method} ${url} - IP: ${ip} - UA: ${userAgent}`);

  // 监听响应结束
  res.on('finish', () => {
    const duration = Date.now() - start;
    const { statusCode } = res;
    console.log(`[${new Date().toISOString()}] ${method} ${url} - ${statusCode} - ${duration}ms`);
  });

  next();
};

// 错误处理中间件
export const errorHandler = (err: Error, req: Request, res: Response) => {
  console.error('API错误:', err);

  // CORS错误
  if (err.message.includes('CORS')) {
    return res.status(403).json({
      success: false,
      message: '跨域请求被拒绝'
    });
  }

  // 验证错误
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: '请求参数验证失败',
      details: err.message
    });
  }

  // 默认服务器错误
  res.status(500).json({
    success: false,
    message: '服务器内部错误',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

// 请求体大小限制中间件
export const bodySizeLimit = (limit: string = '10mb') => {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = req.get('Content-Length');
    if (contentLength) {
      const sizeInMB = parseInt(contentLength) / (1024 * 1024);
      const limitInMB = parseInt(limit.replace('mb', ''));
      
      if (sizeInMB > limitInMB) {
        return res.status(413).json({
          success: false,
          message: `请求体大小超过限制 (${limit})`
        });
      }
    }
    next();
  };
};

// IP白名单中间件（用于管理员API）
export const ipWhitelist = (allowedIPs: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const clientIP = req.ip || req.connection.remoteAddress || '';
    
    if (!allowedIPs.includes(clientIP)) {
      return res.status(403).json({
        success: false,
        message: 'IP地址不在白名单中'
      });
    }
    
    next();
  };
};

// 组合安全中间件
export const applySecurity = (app: Record<string, unknown>) => {
  // 基础安全头
  app.use(helmet(helmetConfig));
  
  // CORS
  app.use(cors(corsOptions));
  
  // 请求日志
  app.use(requestLogger);
  
  // 通用限流
  app.use('/api/', generalRateLimit);
  
  // 请求体大小限制
  app.use(bodySizeLimit('10mb'));
};