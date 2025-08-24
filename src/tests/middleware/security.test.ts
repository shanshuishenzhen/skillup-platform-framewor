/**
 * 安全中间件单元测试
 * 
 * 测试安全中间件，包括：
 * - XSS攻击防护
 * - CSRF攻击防护
 * - SQL注入防护
 * - 输入验证和清理
 * - 请求频率限制
 * - IP白名单/黑名单
 * - 安全头设置
 * - 文件上传安全检查
 */

import { securityMiddleware, rateLimitMiddleware, csrfProtection, xssProtection } from '../../middleware/security';
import { cacheService } from '../../services/cacheService';
import { auditService } from '../../services/auditService';
import { analyticsService } from '../../services/analyticsService';
import { notificationService } from '../../services/notificationService';
import { supabaseClient } from '../../config/supabase';
import { logger } from '../../utils/logger';
import { envConfig } from '../../config/envConfig';
import { Request, Response, NextFunction } from 'express';
import { createHash } from 'crypto';
import validator from 'validator';
import DOMPurify from 'isomorphic-dompurify';

// Mock 依赖
jest.mock('../../services/cacheService');
jest.mock('../../services/auditService');
jest.mock('../../services/analyticsService');
jest.mock('../../services/notificationService');
jest.mock('../../config/supabase');
jest.mock('../../utils/logger');
jest.mock('../../config/envConfig');
jest.mock('crypto');
jest.mock('validator');
jest.mock('isomorphic-dompurify');

// Mock 类型定义
interface MockedModule<T> {
  [K in keyof T]: T[K] extends (...args: unknown[]) => unknown ? jest.MockedFunction<T[K]> : T[K];
}

// 类型定义
interface SecurityConfig {
  rateLimit: {
    enabled: boolean;
    windowMs: number;
    maxRequests: number;
    skipSuccessfulRequests: boolean;
    skipFailedRequests: boolean;
    keyGenerator: (req: Request) => string;
    onLimitReached: (req: Request, res: Response) => void;
  };
  csrf: {
    enabled: boolean;
    secret: string;
    cookieName: string;
    headerName: string;
    methods: string[];
    origins: string[];
  };
  xss: {
    enabled: boolean;
    mode: 'block' | 'sanitize';
    allowedTags: string[];
    allowedAttributes: Record<string, string[]>;
  };
  sqlInjection: {
    enabled: boolean;
    patterns: string[];
    blockSuspiciousQueries: boolean;
  };
  ipFiltering: {
    enabled: boolean;
    whitelist: string[];
    blacklist: string[];
    allowPrivateNetworks: boolean;
  };
  headers: {
    contentSecurityPolicy: string;
    xFrameOptions: string;
    xContentTypeOptions: string;
    referrerPolicy: string;
    strictTransportSecurity: string;
  };
  fileUpload: {
    enabled: boolean;
    maxFileSize: number;
    allowedMimeTypes: string[];
    allowedExtensions: string[];
    scanForMalware: boolean;
  };
  inputValidation: {
    enabled: boolean;
    maxInputLength: number;
    allowedCharsets: string[];
    sanitizeHtml: boolean;
  };
}

interface SecurityThreat {
  id: string;
  type: 'xss' | 'csrf' | 'sql_injection' | 'rate_limit' | 'malicious_file' | 'suspicious_ip';
  severity: 'low' | 'medium' | 'high' | 'critical';
  source: {
    ip: string;
    userAgent: string;
    userId?: string;
    sessionId?: string;
  };
  details: {
    endpoint: string;
    method: string;
    payload?: unknown;
    headers?: Record<string, string>;
    timestamp: string;
    blocked: boolean;
    reason: string;
  };
  metadata: {
    geolocation?: {
      country: string;
      region: string;
      city: string;
    };
    deviceFingerprint?: string;
    riskScore: number;
  };
}

interface RateLimitInfo {
  ip: string;
  userId?: string;
  endpoint: string;
  method: string;
  requestCount: number;
  windowStart: number;
  windowEnd: number;
  blocked: boolean;
  resetTime: number;
}

// Mock 实例
const mockCacheService = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  exists: jest.fn(),
  incr: jest.fn(),
  expire: jest.fn(),
  ttl: jest.fn(),
  hget: jest.fn(),
  hset: jest.fn(),
  hdel: jest.fn(),
  zadd: jest.fn(),
  zrange: jest.fn(),
  zrem: jest.fn(),
  zcard: jest.fn()
};

const mockAuditService = {
  log: jest.fn(),
  logSecurityEvent: jest.fn(),
  logThreat: jest.fn(),
  logRateLimit: jest.fn()
};

const mockAnalyticsService = {
  track: jest.fn(),
  increment: jest.fn(),
  histogram: jest.fn(),
  gauge: jest.fn()
};

const mockNotificationService = {
  sendSecurityAlert: jest.fn(),
  sendEmail: jest.fn(),
  sendSlack: jest.fn(),
  sendWebhook: jest.fn()
};

const mockSupabaseClient = {
  from: jest.fn().mockReturnValue({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    single: jest.fn(),
    then: jest.fn()
  })
};

const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
};

const mockSecurityConfig: SecurityConfig = {
  rateLimit: {
    enabled: true,
    windowMs: 15 * 60 * 1000, // 15分钟
    maxRequests: 100,
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
    keyGenerator: (req: Request) => req.ip,
    onLimitReached: (req: Request, res: Response) => {
      res.status(429).json({ error: 'Too many requests' });
    }
  },
  csrf: {
    enabled: true,
    secret: 'csrf-secret-key',
    cookieName: '_csrf',
    headerName: 'x-csrf-token',
    methods: ['POST', 'PUT', 'DELETE', 'PATCH'],
    origins: ['https://example.com', 'https://app.example.com']
  },
  xss: {
    enabled: true,
    mode: 'sanitize',
    allowedTags: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li'],
    allowedAttributes: {
      'a': ['href', 'title'],
      'img': ['src', 'alt', 'width', 'height']
    }
  },
  sqlInjection: {
    enabled: true,
    patterns: [
      "(?i)(union|select|insert|update|delete|drop|create|alter|exec|execute)",
      "(?i)(script|javascript|vbscript|onload|onerror|onclick)",
      "(?i)(<|>|'|\"|;|--|/\\*|\\*/)"
    ],
    blockSuspiciousQueries: true
  },
  ipFiltering: {
    enabled: true,
    whitelist: [],
    blacklist: ['192.168.100.100', '10.0.0.50'],
    allowPrivateNetworks: true
  },
  headers: {
    contentSecurityPolicy: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'",
    xFrameOptions: 'DENY',
    xContentTypeOptions: 'nosniff',
    referrerPolicy: 'strict-origin-when-cross-origin',
    strictTransportSecurity: 'max-age=31536000; includeSubDomains'
  },
  fileUpload: {
    enabled: true,
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.pdf'],
    scanForMalware: true
  },
  inputValidation: {
    enabled: true,
    maxInputLength: 10000,
    allowedCharsets: ['utf-8', 'ascii'],
    sanitizeHtml: true
  }
};

const mockValidator = {
  isEmail: jest.fn(),
  isURL: jest.fn(),
  isAlphanumeric: jest.fn(),
  isLength: jest.fn(),
  escape: jest.fn(),
  unescape: jest.fn(),
  blacklist: jest.fn(),
  whitelist: jest.fn()
};

const mockDOMPurify = {
  sanitize: jest.fn(),
  addHook: jest.fn(),
  removeHook: jest.fn(),
  isValidAttribute: jest.fn()
};

const mockCreateHash = jest.fn().mockReturnValue({
  update: jest.fn().mockReturnThis(),
  digest: jest.fn().mockReturnValue('mocked-hash')
});

// 设置 Mock
const mockCacheServiceTyped = cacheService as jest.Mocked<typeof cacheService>;
const mockAuditServiceTyped = auditService as jest.Mocked<typeof auditService>;
const mockAnalyticsServiceTyped = analyticsService as jest.Mocked<typeof analyticsService>;
const mockNotificationServiceTyped = notificationService as jest.Mocked<typeof notificationService>;
const mockSupabaseClientTyped = supabaseClient as jest.Mocked<typeof supabaseClient>;
const mockLoggerTyped = logger as jest.Mocked<typeof logger>;
const mockEnvConfigTyped = envConfig as jest.Mocked<typeof envConfig>;
const mockValidatorTyped = validator as jest.Mocked<typeof validator>;
const mockDOMPurifyTyped = DOMPurify as jest.Mocked<typeof DOMPurify>;
const mockCreateHashTyped = createHash as jest.MockedFunction<typeof createHash>;

// Mock Express 对象
const createMockRequest = (options: {
  method?: string;
  url?: string;
  headers?: Record<string, string>;
  body?: unknown;
  query?: unknown;
  params?: unknown;
  cookies?: Record<string, string>;
  user?: unknown;
  ip?: string;
  sessionID?: string;
  files?: unknown[];
} = {}): Partial<Request> => ({
  method: options.method || 'GET',
  url: options.url || '/api/courses',
  originalUrl: options.url || '/api/courses',
  path: options.url || '/api/courses',
  headers: {
    'user-agent': 'Test Agent',
    'content-type': 'application/json',
    'x-forwarded-for': '192.168.1.1',
    'origin': 'https://example.com',
    ...options.headers
  },
  body: options.body || {},
  query: options.query || {},
  params: options.params || {},
  cookies: options.cookies || {},
  user: options.user,
  ip: options.ip || '192.168.1.1',
  sessionID: options.sessionID || 'session-123',
  files: options.files || [],
  get: jest.fn((header: string) => {
    const headers = {
      'user-agent': 'Test Agent',
      'content-type': 'application/json',
      'x-forwarded-for': '192.168.1.1',
      'origin': 'https://example.com',
      ...options.headers
    };
    return headers[header.toLowerCase()];
  })
});

const createMockResponse = (): Partial<Response> => {
  const res: Partial<Response> = {
    statusCode: 200,
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    end: jest.fn().mockReturnThis(),
    cookie: jest.fn().mockReturnThis(),
    clearCookie: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    header: jest.fn().mockReturnThis(),
    locals: {},
    headersSent: false
  };
  return res;
};

const createMockNext = (): NextFunction => jest.fn();

describe('Security Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // 设置默认的mock返回值
    mockCacheService.get.mockResolvedValue(null);
    mockCacheService.set.mockResolvedValue(true);
    mockCacheService.incr.mockResolvedValue(1);
    mockCacheService.expire.mockResolvedValue(true);
    
    mockSupabaseClient.from().then.mockResolvedValue({
      data: [],
      error: null
    });
    
    mockValidator.isEmail.mockReturnValue(true);
    mockValidator.isURL.mockReturnValue(true);
    mockValidator.isAlphanumeric.mockReturnValue(true);
    mockValidator.isLength.mockReturnValue(true);
    mockValidator.escape.mockImplementation((str) => str);
    
    mockDOMPurify.sanitize.mockImplementation((html) => html);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  /**
   * 基础安全中间件测试
   */
  describe('Basic Security Middleware', () => {
    it('应该设置安全头', async () => {
      const req = createMockRequest() as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();
      
      const middleware = securityMiddleware();
      await middleware(req, res, next);
      
      expect(res.set).toHaveBeenCalledWith('Content-Security-Policy', mockSecurityConfig.headers.contentSecurityPolicy);
      expect(res.set).toHaveBeenCalledWith('X-Frame-Options', mockSecurityConfig.headers.xFrameOptions);
      expect(res.set).toHaveBeenCalledWith('X-Content-Type-Options', mockSecurityConfig.headers.xContentTypeOptions);
      expect(res.set).toHaveBeenCalledWith('Referrer-Policy', mockSecurityConfig.headers.referrerPolicy);
      expect(res.set).toHaveBeenCalledWith('Strict-Transport-Security', mockSecurityConfig.headers.strictTransportSecurity);
      
      expect(next).toHaveBeenCalledWith();
    });

    it('应该验证输入长度', async () => {
      const longInput = 'a'.repeat(15000); // 超过maxInputLength
      const req = createMockRequest({
        method: 'POST',
        body: {
          description: longInput
        }
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();
      
      const middleware = securityMiddleware();
      await middleware(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Input too long',
        field: 'description',
        maxLength: mockSecurityConfig.inputValidation.maxInputLength
      });
      
      expect(next).not.toHaveBeenCalled();
      
      // 验证安全事件记录
      expect(mockAuditService.logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'input_validation_failed',
          severity: 'medium',
          reason: 'Input length exceeded maximum allowed'
        })
      );
    });

    it('应该清理HTML输入', async () => {
      const maliciousHtml = '<script>alert("XSS")</script><p>Safe content</p>';
      const sanitizedHtml = '<p>Safe content</p>';
      
      mockDOMPurify.sanitize.mockReturnValue(sanitizedHtml);
      
      const req = createMockRequest({
        method: 'POST',
        body: {
          content: maliciousHtml
        }
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();
      
      const middleware = securityMiddleware();
      await middleware(req, res, next);
      
      expect(mockDOMPurify.sanitize).toHaveBeenCalledWith(
        maliciousHtml,
        expect.objectContaining({
          ALLOWED_TAGS: mockSecurityConfig.xss.allowedTags,
          ALLOWED_ATTR: expect.any(Array)
        })
      );
      
      expect(req.body.content).toBe(sanitizedHtml);
      expect(next).toHaveBeenCalledWith();
    });

    it('应该检测SQL注入尝试', async () => {
      const maliciousInput = "'; DROP TABLE users; --";
      const req = createMockRequest({
        method: 'POST',
        body: {
          search: maliciousInput
        }
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();
      
      const middleware = securityMiddleware();
      await middleware(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Potentially malicious input detected',
        field: 'search'
      });
      
      expect(next).not.toHaveBeenCalled();
      
      // 验证威胁记录
      expect(mockAuditService.logThreat).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'sql_injection',
          severity: 'high',
          details: expect.objectContaining({
            blocked: true,
            reason: 'SQL injection pattern detected'
          })
        })
      );
    });
  });

  /**
   * 频率限制测试
   */
  describe('Rate Limiting', () => {
    it('应该允许正常请求', async () => {
      mockCacheService.get.mockResolvedValue('50'); // 当前请求数
      
      const req = createMockRequest({
        ip: '192.168.1.1'
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();
      
      const middleware = rateLimitMiddleware();
      await middleware(req, res, next);
      
      expect(mockCacheService.incr).toHaveBeenCalledWith('rate_limit:192.168.1.1');
      expect(next).toHaveBeenCalledWith();
      
      // 验证速率限制头
      expect(res.set).toHaveBeenCalledWith('X-RateLimit-Limit', mockSecurityConfig.rateLimit.maxRequests.toString());
      expect(res.set).toHaveBeenCalledWith('X-RateLimit-Remaining', '49');
    });

    it('应该阻止超过限制的请求', async () => {
      mockCacheService.get.mockResolvedValue('101'); // 超过限制
      mockCacheService.ttl.mockResolvedValue(600); // 10分钟剩余
      
      const req = createMockRequest({
        ip: '192.168.1.1'
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();
      
      const middleware = rateLimitMiddleware();
      await middleware(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Too many requests',
        retryAfter: 600
      });
      
      expect(next).not.toHaveBeenCalled();
      
      // 验证速率限制记录
      expect(mockAuditService.logRateLimit).toHaveBeenCalledWith(
        expect.objectContaining({
          ip: '192.168.1.1',
          blocked: true,
          requestCount: 101
        })
      );
    });

    it('应该为不同用户分别计算限制', async () => {
      const user1Req = createMockRequest({
        ip: '192.168.1.1',
        user: { id: 'user-1' }
      }) as Request;
      const user2Req = createMockRequest({
        ip: '192.168.1.2',
        user: { id: 'user-2' }
      }) as Request;
      const res1 = createMockResponse() as Response;
      const res2 = createMockResponse() as Response;
      const next1 = createMockNext();
      const next2 = createMockNext();
      
      mockCacheService.get.mockImplementation((key: string) => {
        if (key.includes('192.168.1.1')) return Promise.resolve('50');
        if (key.includes('192.168.1.2')) return Promise.resolve('30');
        return Promise.resolve('0');
      });
      
      const middleware = rateLimitMiddleware();
      
      await middleware(user1Req, res1, next1);
      await middleware(user2Req, res2, next2);
      
      expect(next1).toHaveBeenCalledWith();
      expect(next2).toHaveBeenCalledWith();
      
      expect(mockCacheService.incr).toHaveBeenCalledWith('rate_limit:192.168.1.1');
      expect(mockCacheService.incr).toHaveBeenCalledWith('rate_limit:192.168.1.2');
    });

    it('应该支持基于用户的速率限制', async () => {
      const req = createMockRequest({
        ip: '192.168.1.1',
        user: { id: 'user-123' }
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();
      
      // 配置基于用户的速率限制
      const userBasedConfig = {
        ...mockSecurityConfig,
        rateLimit: {
          ...mockSecurityConfig.rateLimit,
          keyGenerator: (req: Request) => req.user?.id || req.ip
        }
      };
      jest.mocked(envConfig).security = userBasedConfig;
      
      mockCacheService.get.mockResolvedValue('75');
      
      const middleware = rateLimitMiddleware();
      await middleware(req, res, next);
      
      expect(mockCacheService.incr).toHaveBeenCalledWith('rate_limit:user-123');
      expect(next).toHaveBeenCalledWith();
    });
  });

  /**
   * CSRF保护测试
   */
  describe('CSRF Protection', () => {
    it('应该为GET请求生成CSRF令牌', async () => {
      const req = createMockRequest({
        method: 'GET',
        sessionID: 'session-123'
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();
      
      const middleware = csrfProtection();
      await middleware(req, res, next);
      
      expect(res.cookie).toHaveBeenCalledWith(
        mockSecurityConfig.csrf.cookieName,
        expect.any(String),
        expect.objectContaining({
          httpOnly: true,
          secure: true,
          sameSite: 'strict'
        })
      );
      
      expect(next).toHaveBeenCalledWith();
    });

    it('应该验证POST请求的CSRF令牌', async () => {
      const csrfToken = 'valid-csrf-token';
      
      mockCacheService.get.mockResolvedValue(csrfToken);
      
      const req = createMockRequest({
        method: 'POST',
        sessionID: 'session-123',
        headers: {
          'x-csrf-token': csrfToken
        }
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();
      
      const middleware = csrfProtection();
      await middleware(req, res, next);
      
      expect(mockCacheService.get).toHaveBeenCalledWith('csrf:session-123');
      expect(next).toHaveBeenCalledWith();
    });

    it('应该拒绝无效的CSRF令牌', async () => {
      const validToken = 'valid-csrf-token';
      const invalidToken = 'invalid-csrf-token';
      
      mockCacheService.get.mockResolvedValue(validToken);
      
      const req = createMockRequest({
        method: 'POST',
        sessionID: 'session-123',
        headers: {
          'x-csrf-token': invalidToken
        }
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();
      
      const middleware = csrfProtection();
      await middleware(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Invalid CSRF token'
      });
      
      expect(next).not.toHaveBeenCalled();
      
      // 验证CSRF攻击记录
      expect(mockAuditService.logThreat).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'csrf',
          severity: 'high',
          details: expect.objectContaining({
            blocked: true,
            reason: 'Invalid CSRF token'
          })
        })
      );
    });

    it('应该拒绝缺少CSRF令牌的请求', async () => {
      const req = createMockRequest({
        method: 'POST',
        sessionID: 'session-123'
        // 没有CSRF令牌
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();
      
      const middleware = csrfProtection();
      await middleware(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'CSRF token required'
      });
      
      expect(next).not.toHaveBeenCalled();
    });

    it('应该验证请求来源', async () => {
      const req = createMockRequest({
        method: 'POST',
        headers: {
          'origin': 'https://malicious-site.com',
          'x-csrf-token': 'valid-token'
        }
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();
      
      const middleware = csrfProtection();
      await middleware(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Invalid origin'
      });
      
      expect(next).not.toHaveBeenCalled();
    });
  });

  /**
   * XSS保护测试
   */
  describe('XSS Protection', () => {
    it('应该清理恶意脚本', async () => {
      const maliciousInput = '<script>alert("XSS")</script><p>Safe content</p>';
      const sanitizedInput = '<p>Safe content</p>';
      
      mockDOMPurify.sanitize.mockReturnValue(sanitizedInput);
      
      const req = createMockRequest({
        method: 'POST',
        body: {
          content: maliciousInput,
          title: 'Normal title'
        }
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();
      
      const middleware = xssProtection();
      await middleware(req, res, next);
      
      expect(req.body.content).toBe(sanitizedInput);
      expect(req.body.title).toBe('Normal title');
      expect(next).toHaveBeenCalledWith();
      
      // 验证XSS尝试记录
      expect(mockAuditService.logThreat).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'xss',
          severity: 'medium',
          details: expect.objectContaining({
            blocked: false, // 清理而不是阻止
            reason: 'Malicious script detected and sanitized'
          })
        })
      );
    });

    it('应该阻止严重的XSS尝试', async () => {
      const severeXssInput = '<iframe src="javascript:alert(\'XSS\')"></iframe>';
      
      // 配置为阻止模式
      const blockConfig = {
        ...mockSecurityConfig,
        xss: {
          ...mockSecurityConfig.xss,
          mode: 'block' as const
        }
      };
      jest.mocked(envConfig).security = ipBasedConfig;
      
      const req = createMockRequest({
        method: 'POST',
        body: {
          content: severeXssInput
        }
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();
      
      const middleware = xssProtection();
      await middleware(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Malicious content detected',
        field: 'content'
      });
      
      expect(next).not.toHaveBeenCalled();
    });

    it('应该处理嵌套对象中的XSS', async () => {
      const maliciousInput = {
        user: {
          profile: {
            bio: '<script>alert("XSS")</script>Safe bio'
          }
        },
        comments: [
          { text: 'Normal comment' },
          { text: '<img src=x onerror=alert("XSS")>Malicious comment' }
        ]
      };
      
      mockDOMPurify.sanitize.mockImplementation((input) => {
        if (input.includes('<script>')) return 'Safe bio';
        if (input.includes('onerror=')) return 'Malicious comment';
        return input;
      });
      
      const req = createMockRequest({
        method: 'POST',
        body: maliciousInput
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();
      
      const middleware = xssProtection();
      await middleware(req, res, next);
      
      expect(req.body.user.profile.bio).toBe('Safe bio');
      expect(req.body.comments[1].text).toBe('Malicious comment');
      expect(next).toHaveBeenCalledWith();
    });
  });

  /**
   * IP过滤测试
   */
  describe('IP Filtering', () => {
    it('应该允许白名单IP', async () => {
      const whitelistConfig = {
        ...mockSecurityConfig,
        ipFiltering: {
          ...mockSecurityConfig.ipFiltering,
          whitelist: ['192.168.1.1', '10.0.0.1']
        }
      };
      jest.mocked(envConfig).security = endpointBasedConfig;
      
      const req = createMockRequest({
        ip: '192.168.1.1'
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();
      
      const middleware = securityMiddleware();
      await middleware(req, res, next);
      
      expect(next).toHaveBeenCalledWith();
    });

    it('应该阻止黑名单IP', async () => {
      const req = createMockRequest({
        ip: '192.168.100.100' // 在黑名单中
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();
      
      const middleware = securityMiddleware();
      await middleware(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Access denied'
      });
      
      expect(next).not.toHaveBeenCalled();
      
      // 验证IP阻止记录
      expect(mockAuditService.logThreat).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'suspicious_ip',
          severity: 'high',
          details: expect.objectContaining({
            blocked: true,
            reason: 'IP address in blacklist'
          })
        })
      );
    });

    it('应该检测可疑IP模式', async () => {
      // 模拟来自同一IP的大量失败请求
      const suspiciousIp = '192.168.1.100';
      
      mockCacheService.get.mockResolvedValue('15'); // 15次失败尝试
      
      const req = createMockRequest({
        ip: suspiciousIp
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();
      
      const middleware = securityMiddleware();
      await middleware(req, res, next);
      
      // 验证可疑活动记录
      expect(mockAnalyticsService.increment).toHaveBeenCalledWith(
        'suspicious_activity',
        1,
        expect.objectContaining({
          ip: suspiciousIp,
          type: 'repeated_failures'
        })
      );
    });
  });

  /**
   * 文件上传安全测试
   */
  describe('File Upload Security', () => {
    it('应该验证文件类型', async () => {
      const maliciousFile = {
        originalname: 'malicious.exe',
        mimetype: 'application/x-msdownload',
        size: 1024,
        buffer: Buffer.from('fake exe content')
      };
      
      const req = createMockRequest({
        method: 'POST',
        files: [maliciousFile]
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();
      
      const middleware = securityMiddleware();
      await middleware(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'File type not allowed',
        allowedTypes: mockSecurityConfig.fileUpload.allowedMimeTypes
      });
      
      expect(next).not.toHaveBeenCalled();
    });

    it('应该验证文件大小', async () => {
      const largeFile = {
        originalname: 'large.jpg',
        mimetype: 'image/jpeg',
        size: 15 * 1024 * 1024, // 15MB，超过10MB限制
        buffer: Buffer.alloc(15 * 1024 * 1024)
      };
      
      const req = createMockRequest({
        method: 'POST',
        files: [largeFile]
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();
      
      const middleware = securityMiddleware();
      await middleware(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'File too large',
        maxSize: mockSecurityConfig.fileUpload.maxFileSize,
        actualSize: largeFile.size
      });
      
      expect(next).not.toHaveBeenCalled();
    });

    it('应该扫描恶意软件', async () => {
      const suspiciousFile = {
        originalname: 'image.jpg',
        mimetype: 'image/jpeg',
        size: 1024,
        buffer: Buffer.from('suspicious content with virus signature')
      };
      
      // Mock 恶意软件检测
      const mockVirusScanner = jest.fn().mockResolvedValue({
        isClean: false,
        threats: ['Trojan.Generic']
      });
      
      const req = createMockRequest({
        method: 'POST',
        files: [suspiciousFile]
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();
      
      const middleware = securityMiddleware();
      await middleware(req, res, next);
      
      // 验证恶意文件记录
      expect(mockAuditService.logThreat).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'malicious_file',
          severity: 'critical',
          details: expect.objectContaining({
            blocked: true,
            reason: 'Malware detected in uploaded file'
          })
        })
      );
    });
  });

  /**
   * 性能测试
   */
  describe('Performance Tests', () => {
    it('应该高效处理安全检查', async () => {
      const req = createMockRequest({
        method: 'POST',
        body: {
          title: 'Normal title',
          content: 'Normal content without any malicious code'
        }
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();
      
      const startTime = Date.now();
      const middleware = securityMiddleware();
      await middleware(req, res, next);
      const processingTime = Date.now() - startTime;
      
      expect(processingTime).toBeLessThan(100); // 100ms内完成
      expect(next).toHaveBeenCalledWith();
    });

    it('应该有效利用缓存', async () => {
      const ip = '192.168.1.1';
      
      // 第一次请求
      const req1 = createMockRequest({ ip }) as Request;
      const res1 = createMockResponse() as Response;
      const next1 = createMockNext();
      
      const middleware = rateLimitMiddleware();
      await middleware(req1, res1, next1);
      
      // 第二次请求
      const req2 = createMockRequest({ ip }) as Request;
      const res2 = createMockResponse() as Response;
      const next2 = createMockNext();
      
      await middleware(req2, res2, next2);
      
      // 验证缓存使用
      expect(mockCacheService.get).toHaveBeenCalledWith(`rate_limit:${ip}`);
      expect(mockCacheService.incr).toHaveBeenCalledTimes(2);
    });
  });

  /**
   * 错误处理测试
   */
  describe('Error Handling', () => {
    it('应该处理缓存服务错误', async () => {
      mockCacheService.get.mockRejectedValue(new Error('Cache service unavailable'));
      
      const req = createMockRequest() as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();
      
      const middleware = rateLimitMiddleware();
      await middleware(req, res, next);
      
      // 验证降级处理
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Cache service error'),
        expect.any(Object)
      );
      
      // 应该继续处理请求
      expect(next).toHaveBeenCalledWith();
    });

    it('应该处理安全配置错误', async () => {
      // 设置无效配置
      jest.mocked(envConfig).security = null;
      
      const req = createMockRequest() as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();
      
      const middleware = securityMiddleware();
      await middleware(req, res, next);
      
      // 验证配置错误处理
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Security configuration invalid'),
        expect.any(Object)
      );
      
      // 应该使用默认安全设置
      expect(next).toHaveBeenCalledWith();
    });

    it('应该处理威胁检测错误', async () => {
      mockDOMPurify.sanitize.mockImplementation(() => {
        throw new Error('Sanitization failed');
      });
      
      const req = createMockRequest({
        method: 'POST',
        body: {
          content: '<script>alert("test")</script>'
        }
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();
      
      const middleware = xssProtection();
      await middleware(req, res, next);
      
      // 验证错误处理
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('XSS protection error'),
        expect.any(Object)
      );
      
      // 应该阻止请求以确保安全
      expect(res.status).toHaveBeenCalledWith(500);
      expect(next).not.toHaveBeenCalled();
    });
  });
});