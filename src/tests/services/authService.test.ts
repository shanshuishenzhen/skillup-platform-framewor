/**
 * 认证服务单元测试
 * 
 * 测试覆盖范围：
 * - 用户注册和登录
 * - JWT令牌管理
 * - 密码加密和验证
 * - 会话管理
 * - 双因素认证
 * - 密码重置
 * - 账户锁定和解锁
 * - 权限验证
 * - 令牌刷新
 * - 错误处理和安全防护
 */

import { jest } from '@jest/globals';
import {
  authService,
  register,
  login,
  logout,
  refreshToken,
  verifyToken,
  resetPassword,
  changePassword,
  enableTwoFactor,
  verifyTwoFactor,
  lockAccount,
  unlockAccount,
  validateSession,
  revokeAllTokens,
  getLoginHistory,
  checkPermission,
  hashPassword,
  verifyPassword,
  generateTokens,
  validateTokens
} from '../../services/authService';

// 模拟依赖
const mockEnvConfig = {
  auth: {
    jwtSecret: 'test-jwt-secret-key',
    jwtExpiresIn: '15m',
    refreshTokenSecret: 'test-refresh-secret-key',
    refreshTokenExpiresIn: '7d',
    passwordMinLength: 8,
    passwordMaxLength: 128,
    maxLoginAttempts: 5,
    lockoutDuration: 900000, // 15分钟
    sessionTimeout: 3600000, // 1小时
    tokenCleanupInterval: 86400000 // 24小时
  },
  security: {
    enableTwoFactor: true,
    enableAccountLockout: true,
    enableSessionTracking: true,
    passwordHashRounds: 12,
    maxConcurrentSessions: 5,
    requireStrongPassword: true
  },
  rateLimit: {
    loginAttempts: {
      windowMs: 900000, // 15分钟
      maxAttempts: 5
    },
    passwordReset: {
      windowMs: 3600000, // 1小时
      maxAttempts: 3
    }
  }
};

const mockErrorHandler = {
  handleError: jest.fn(),
  createError: jest.fn((type, message, details) => ({
    type,
    message,
    details,
    timestamp: new Date().toISOString()
  }))
};

const mockMonitoringService = {
  recordMetric: jest.fn(),
  recordEvent: jest.fn(),
  startTimer: jest.fn(() => ({
    end: jest.fn()
  })),
  recordSecurityEvent: jest.fn()
};

const mockUserService = {
  getUserByEmail: jest.fn(),
  getUserById: jest.fn(),
  createUser: jest.fn(),
  updateUser: jest.fn(),
  recordUserActivity: jest.fn()
};

const mockNotificationService = {
  sendEmail: jest.fn(),
  sendSMS: jest.fn(),
  sendNotification: jest.fn()
};

const mockSupabase = {
  from: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    gt: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lt: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    like: jest.fn().mockReturnThis(),
    ilike: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    single: jest.fn(),
    maybeSingle: jest.fn()
  })),
  auth: {
    signUp: jest.fn(),
    signInWithPassword: jest.fn(),
    signOut: jest.fn(),
    getUser: jest.fn(),
    updateUser: jest.fn(),
    resetPasswordForEmail: jest.fn()
  }
};

const mockRedis = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  exists: jest.fn(),
  expire: jest.fn(),
  incr: jest.fn(),
  decr: jest.fn(),
  ttl: jest.fn(),
  hget: jest.fn(),
  hset: jest.fn(),
  hdel: jest.fn(),
  hgetall: jest.fn(),
  sadd: jest.fn(),
  srem: jest.fn(),
  smembers: jest.fn(),
  sismember: jest.fn()
};

const mockBcrypt = {
  hash: jest.fn().mockResolvedValue('$2b$12$hashedpassword'),
  compare: jest.fn().mockResolvedValue(true),
  genSalt: jest.fn().mockResolvedValue('$2b$12$salt')
};

const mockJwt = {
  sign: jest.fn(() => 'jwt.access.token'),
  verify: jest.fn(() => ({
    userId: 'user-123',
    email: 'test@example.com',
    role: 'student',
    sessionId: 'session-123',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 900
  })),
  decode: jest.fn(() => ({
    userId: 'user-123',
    email: 'test@example.com'
  }))
};

const mockSpeakeasy = {
  generateSecret: jest.fn(() => ({
    base32: 'JBSWY3DPEHPK3PXP',
    otpauth_url: 'otpauth://totp/SkillUp:test@example.com?secret=JBSWY3DPEHPK3PXP&issuer=SkillUp'
  })),
  totp: {
    verify: jest.fn(() => ({ delta: 0 })),
    generate: jest.fn(() => '123456')
  }
};

const mockQrcode = {
  toDataURL: jest.fn().mockResolvedValue('data:image/png;base64,qrcode')
};

const mockUuid = {
  v4: jest.fn(() => 'test-uuid-123')
};

const mockMoment = jest.fn(() => ({
  format: jest.fn(() => '2024-01-01T00:00:00Z'),
  add: jest.fn().mockReturnThis(),
  subtract: jest.fn().mockReturnThis(),
  isAfter: jest.fn(() => false),
  isBefore: jest.fn(() => true),
  diff: jest.fn(() => 3600),
  toISOString: jest.fn(() => '2024-01-01T00:00:00Z'),
  unix: jest.fn(() => 1704067200),
  valueOf: jest.fn(() => 1704067200000)
}));

const mockCrypto = {
  randomBytes: jest.fn(() => Buffer.from('randomsecret')),
  createHash: jest.fn(() => ({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn(() => 'hashedvalue')
  })),
  timingSafeEqual: jest.fn(() => true)
};

const mockValidator = {
  isEmail: jest.fn(() => true),
  isLength: jest.fn(() => true),
  isStrongPassword: jest.fn(() => true),
  escape: jest.fn((str) => str),
  normalizeEmail: jest.fn((email) => email.toLowerCase())
};

// 模拟模块
jest.mock('../../config/envConfig', () => mockEnvConfig);
jest.mock('../../utils/errorHandler', () => mockErrorHandler);
jest.mock('../../services/monitoringService', () => mockMonitoringService);
jest.mock('../../services/userService', () => mockUserService);
jest.mock('../../services/notificationService', () => mockNotificationService);
jest.mock('../../config/supabase', () => ({ supabase: mockSupabase }));
jest.mock('../../config/redis', () => ({ redis: mockRedis }));
jest.mock('bcrypt', () => mockBcrypt);
jest.mock('jsonwebtoken', () => mockJwt);
jest.mock('speakeasy', () => mockSpeakeasy);
jest.mock('qrcode', () => mockQrcode);
jest.mock('uuid', () => mockUuid);
jest.mock('moment', () => mockMoment);
jest.mock('crypto', () => mockCrypto);
jest.mock('validator', () => mockValidator);

describe('认证服务测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // 设置默认的成功响应
    mockSupabase.from().single.mockResolvedValue({
      data: {
        id: 'user-123',
        email: 'test@example.com',
        passwordHash: '$2b$12$hashedpassword',
        role: 'student',
        isActive: true,
        isLocked: false,
        loginAttempts: 0,
        lastLoginAt: null,
        twoFactorEnabled: false,
        twoFactorSecret: null,
        createdAt: '2024-01-01T00:00:00Z'
      },
      error: null
    });
    
    mockSupabase.from().mockResolvedValue({
      data: [{
        id: 'session-123',
        userId: 'user-123',
        token: 'jwt.access.token',
        refreshToken: 'refresh.token.123',
        expiresAt: '2024-01-01T01:00:00Z',
        isActive: true
      }],
      error: null
    });
    
    mockRedis.get.mockResolvedValue(null);
    mockRedis.set.mockResolvedValue('OK');
    mockRedis.incr.mockResolvedValue(1);
    
    mockUserService.getUserByEmail.mockResolvedValue({
      success: true,
      user: {
        id: 'user-123',
        email: 'test@example.com',
        passwordHash: '$2b$12$hashedpassword',
        role: 'student',
        isActive: true
      }
    });
  });

  describe('服务初始化', () => {
    it('应该成功初始化认证服务', async () => {
      const result = await authService.initialize();
      
      expect(result.success).toBe(true);
      expect(mockMonitoringService.recordEvent).toHaveBeenCalledWith(
        'auth_service_initialized',
        expect.any(Object)
      );
    });

    it('应该启动令牌清理任务', async () => {
      await authService.initialize();
      
      expect(mockSupabase.from).toHaveBeenCalledWith('user_sessions');
      expect(mockSupabase.from().delete).toHaveBeenCalled();
    });

    it('应该加载安全配置', async () => {
      await authService.initialize();
      
      expect(mockRedis.hset).toHaveBeenCalledWith(
        'auth_config',
        expect.any(String),
        expect.any(String)
      );
    });
  });

  describe('用户注册', () => {
    const registerData = {
      email: 'newuser@example.com',
      password: 'StrongPassword123!',
      firstName: 'New',
      lastName: 'User',
      username: 'newuser'
    };

    it('应该成功注册用户', async () => {
      mockUserService.createUser.mockResolvedValue({
        success: true,
        user: {
          id: 'user-456',
          email: 'newuser@example.com',
          username: 'newuser'
        }
      });
      
      const result = await register(registerData);
      
      expect(result.success).toBe(true);
      expect(result.user.id).toBe('user-456');
      expect(result.tokens).toEqual(
        expect.objectContaining({
          accessToken: expect.any(String),
          refreshToken: expect.any(String)
        }) as Record<string, unknown>
      );
    });

    it('应该验证邮箱格式', async () => {
      mockValidator.isEmail.mockReturnValue(false);
      
      const result = await register({
        ...registerData,
        email: 'invalid-email'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toEqual(
        expect.objectContaining({
          type: 'INVALID_EMAIL',
          message: 'Invalid email format'
        }) as Record<string, unknown>
      );
    });

    it('应该验证密码强度', async () => {
      mockValidator.isStrongPassword.mockReturnValue(false);
      
      const result = await register({
        ...registerData,
        password: 'weak'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toEqual(
        expect.objectContaining({
          type: 'WEAK_PASSWORD',
          message: 'Password does not meet requirements'
        }) as Record<string, unknown>
      );
    });

    it('应该检查邮箱唯一性', async () => {
      mockUserService.getUserByEmail.mockResolvedValue({
        success: true,
        user: { id: 'existing-user' }
      });
      
      const result = await register(registerData);
      
      expect(result.success).toBe(false);
      expect(result.error).toEqual(
        expect.objectContaining({
          type: 'EMAIL_EXISTS',
          message: 'Email already exists'
        }) as Record<string, unknown>
      );
    });

    it('应该哈希密码', async () => {
      mockUserService.createUser.mockResolvedValue({
        success: true,
        user: { id: 'user-456' }
      });
      
      await register(registerData);
      
      expect(mockBcrypt.hash).toHaveBeenCalledWith(
        'StrongPassword123!',
        12
      );
    });

    it('应该生成访问令牌', async () => {
      mockUserService.createUser.mockResolvedValue({
        success: true,
        user: { id: 'user-456', email: 'newuser@example.com' }
      });
      
      await register(registerData);
      
      expect(mockJwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-456',
          email: 'newuser@example.com'
        }) as Record<string, unknown>,
        mockEnvConfig.auth.jwtSecret,
        { expiresIn: mockEnvConfig.auth.jwtExpiresIn }
      );
    });

    it('应该创建用户会话', async () => {
      mockUserService.createUser.mockResolvedValue({
        success: true,
        user: { id: 'user-456' }
      });
      
      await register(registerData);
      
      expect(mockSupabase.from().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-456',
          token: expect.any(String),
          refreshToken: expect.any(String),
          expiresAt: expect.any(String)
        }) as Record<string, unknown>
      );
    });

    it('应该发送欢迎邮件', async () => {
      mockUserService.createUser.mockResolvedValue({
        success: true,
        user: { id: 'user-456', email: 'newuser@example.com' }
      });
      
      await register(registerData);
      
      expect(mockNotificationService.sendEmail).toHaveBeenCalledWith(
        'newuser@example.com',
        'welcome',
        expect.any(Object)
      );
    });

    it('应该记录注册事件', async () => {
      mockUserService.createUser.mockResolvedValue({
        success: true,
        user: { id: 'user-456' }
      });
      
      await register(registerData);
      
      expect(mockMonitoringService.recordSecurityEvent).toHaveBeenCalledWith(
        'user_registered',
        expect.objectContaining({
          userId: 'user-456',
          email: 'newuser@example.com'
        }) as Record<string, unknown>
      );
    });
  });

  describe('用户登录', () => {
    const loginData = {
      email: 'test@example.com',
      password: 'password123',
      rememberMe: false
    };

    it('应该成功登录用户', async () => {
      const result = await login(loginData);
      
      expect(result.success).toBe(true);
      expect(result.user.id).toBe('user-123');
      expect(result.tokens).toEqual(
        expect.objectContaining({
          accessToken: expect.any(String),
          refreshToken: expect.any(String)
        }) as Record<string, unknown>
      );
    });

    it('应该验证用户凭据', async () => {
      mockUserService.getUserByEmail.mockResolvedValue({
        success: false,
        error: { type: 'USER_NOT_FOUND' }
      });
      
      const result = await login(loginData);
      
      expect(result.success).toBe(false);
      expect(result.error).toEqual(
        expect.objectContaining({
          type: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password'
        }) as Record<string, unknown>
      );
    });

    it('应该验证密码', async () => {
      mockBcrypt.compare.mockResolvedValue(false);
      
      const result = await login(loginData);
      
      expect(result.success).toBe(false);
      expect(result.error).toEqual(
        expect.objectContaining({
          type: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password'
        })
      );
    });

    it('应该检查账户状态', async () => {
      mockUserService.getUserByEmail.mockResolvedValue({
        success: true,
        user: {
          id: 'user-123',
          isActive: false
        }
      });
      
      const result = await login(loginData);
      
      expect(result.success).toBe(false);
      expect(result.error).toEqual(
        expect.objectContaining({
          type: 'ACCOUNT_DISABLED',
          message: 'Account is disabled'
        }) as Record<string, unknown>
      );
    });

    it('应该检查账户锁定状态', async () => {
      mockUserService.getUserByEmail.mockResolvedValue({
        success: true,
        user: {
          id: 'user-123',
          isLocked: true,
          lockedUntil: new Date(Date.now() + 900000).toISOString()
        }
      });
      
      const result = await login(loginData);
      
      expect(result.success).toBe(false);
      expect(result.error).toEqual(
        expect.objectContaining({
          type: 'ACCOUNT_LOCKED',
          message: 'Account is temporarily locked'
        }) as Record<string, unknown>
      );
    });

    it('应该处理登录失败次数', async () => {
      mockBcrypt.compare.mockResolvedValue(false);
      mockRedis.incr.mockResolvedValue(3);
      
      await login(loginData);
      
      expect(mockRedis.incr).toHaveBeenCalledWith(
        'login_attempts:test@example.com'
      );
      expect(mockRedis.expire).toHaveBeenCalledWith(
        'login_attempts:test@example.com',
        900
      );
    });

    it('应该锁定账户超过最大尝试次数', async () => {
      mockBcrypt.compare.mockResolvedValue(false);
      mockRedis.incr.mockResolvedValue(6);
      
      const result = await login(loginData);
      
      expect(result.success).toBe(false);
      expect(result.error).toEqual(
        expect.objectContaining({
          type: 'TOO_MANY_ATTEMPTS',
          message: 'Too many login attempts'
        }) as Record<string, unknown>
      );
    });

    it('应该处理双因素认证', async () => {
      mockUserService.getUserByEmail.mockResolvedValue({
        success: true,
        user: {
          id: 'user-123',
          twoFactorEnabled: true,
          twoFactorSecret: 'secret'
        }
      });
      
      const result = await login(loginData);
      
      expect(result.success).toBe(false);
      expect(result.error).toEqual(
        expect.objectContaining({
          type: 'TWO_FACTOR_REQUIRED',
          message: 'Two-factor authentication required'
        }) as Record<string, unknown>
      );
    });

    it('应该记录登录成功', async () => {
      await login(loginData);
      
      expect(mockSupabase.from().update).toHaveBeenCalledWith({
        lastLoginAt: expect.any(String),
        loginAttempts: 0
      });
      
      expect(mockMonitoringService.recordSecurityEvent).toHaveBeenCalledWith(
        'user_login_success',
        expect.objectContaining({
          userId: 'user-123',
          email: 'test@example.com'
        }) as Record<string, unknown>
      );
    });

    it('应该清除登录失败计数', async () => {
      await login(loginData);
      
      expect(mockRedis.del).toHaveBeenCalledWith(
        'login_attempts:test@example.com'
      );
    });

    it('应该支持记住我功能', async () => {
      const result = await login({ ...loginData, rememberMe: true });
      
      expect(result.success).toBe(true);
      expect(mockJwt.sign).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(String),
        { expiresIn: '30d' }
      );
    });
  });

  describe('用户登出', () => {
    it('应该成功登出用户', async () => {
      const result = await logout('jwt.access.token');
      
      expect(result.success).toBe(true);
      expect(mockSupabase.from().update).toHaveBeenCalledWith({
        isActive: false,
        loggedOutAt: expect.any(String)
      });
    });

    it('应该验证令牌', async () => {
      mockJwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });
      
      const result = await logout('invalid.token');
      
      expect(result.success).toBe(false);
      expect(result.error).toEqual(
        expect.objectContaining({
          type: 'INVALID_TOKEN',
          message: 'Invalid or expired token'
        }) as Record<string, unknown>
      );
    });

    it('应该将令牌加入黑名单', async () => {
      await logout('jwt.access.token');
      
      expect(mockRedis.sadd).toHaveBeenCalledWith(
        'token_blacklist',
        'jwt.access.token'
      );
      expect(mockRedis.expire).toHaveBeenCalledWith(
        'token_blacklist',
        expect.any(Number)
      );
    });

    it('应该记录登出事件', async () => {
      await logout('jwt.access.token');
      
      expect(mockMonitoringService.recordSecurityEvent).toHaveBeenCalledWith(
        'user_logout',
        expect.objectContaining({
          userId: 'user-123',
          sessionId: 'session-123'
        }) as Record<string, unknown>
      );
    });
  });

  describe('令牌刷新', () => {
    it('应该成功刷新令牌', async () => {
      mockSupabase.from().single.mockResolvedValue({
        data: {
          id: 'session-123',
          userId: 'user-123',
          refreshToken: 'refresh.token.123',
          isActive: true,
          expiresAt: new Date(Date.now() + 86400000).toISOString()
        },
        error: null
      });
      
      const result = await refreshToken('refresh.token.123');
      
      expect(result.success).toBe(true);
      expect(result.tokens).toEqual(
        expect.objectContaining({
          accessToken: expect.any(String),
          refreshToken: expect.any(String)
        }) as Record<string, unknown>
      );
    });

    it('应该验证刷新令牌', async () => {
      mockSupabase.from().single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' }
      });
      
      const result = await refreshToken('invalid.refresh.token');
      
      expect(result.success).toBe(false);
      expect(result.error).toEqual(
        expect.objectContaining({
          type: 'INVALID_REFRESH_TOKEN',
          message: 'Invalid or expired refresh token'
        }) as Record<string, unknown>
      );
    });

    it('应该检查令牌过期', async () => {
      mockSupabase.from().single.mockResolvedValue({
        data: {
          id: 'session-123',
          refreshToken: 'refresh.token.123',
          expiresAt: new Date(Date.now() - 86400000).toISOString()
        },
        error: null
      });
      
      const result = await refreshToken('refresh.token.123');
      
      expect(result.success).toBe(false);
      expect(result.error).toEqual(
        expect.objectContaining({
          type: 'TOKEN_EXPIRED',
          message: 'Refresh token has expired'
        }) as Record<string, unknown>
      );
    });

    it('应该更新会话信息', async () => {
      mockSupabase.from().single.mockResolvedValue({
        data: {
          id: 'session-123',
          userId: 'user-123',
          refreshToken: 'refresh.token.123',
          isActive: true,
          expiresAt: new Date(Date.now() + 86400000).toISOString()
        },
        error: null
      });
      
      await refreshToken('refresh.token.123');
      
      expect(mockSupabase.from().update).toHaveBeenCalledWith(
        expect.objectContaining({
          token: expect.any(String),
          refreshToken: expect.any(String),
          expiresAt: expect.any(String),
          lastUsedAt: expect.any(String)
        }) as Record<string, unknown>
      );
    });
  });

  describe('令牌验证', () => {
    it('应该成功验证有效令牌', async () => {
      const result = await verifyToken('jwt.access.token');
      
      expect(result.success).toBe(true);
      expect(result.payload).toEqual(
        expect.objectContaining({
          userId: 'user-123',
          email: 'test@example.com'
        }) as Record<string, unknown>
      );
    });

    it('应该拒绝无效令牌', async () => {
      mockJwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });
      
      const result = await verifyToken('invalid.token');
      
      expect(result.success).toBe(false);
      expect(result.error).toEqual(
        expect.objectContaining({
          type: 'INVALID_TOKEN',
          message: 'Invalid or expired token'
        }) as Record<string, unknown>
      );
    });

    it('应该检查令牌黑名单', async () => {
      mockRedis.sismember.mockResolvedValue(1);
      
      const result = await verifyToken('jwt.access.token');
      
      expect(result.success).toBe(false);
      expect(result.error).toEqual(
        expect.objectContaining({
          type: 'TOKEN_BLACKLISTED',
          message: 'Token has been revoked'
        }) as Record<string, unknown>
      );
    });

    it('应该验证会话状态', async () => {
      mockSupabase.from().single.mockResolvedValue({
        data: {
          id: 'session-123',
          isActive: false
        },
        error: null
      });
      
      const result = await verifyToken('jwt.access.token');
      
      expect(result.success).toBe(false);
      expect(result.error).toEqual(
        expect.objectContaining({
          type: 'SESSION_INACTIVE',
          message: 'Session is no longer active'
        }) as Record<string, unknown>
      );
    });
  });

  describe('密码重置', () => {
    it('应该发送密码重置邮件', async () => {
      const result = await resetPassword('test@example.com');
      
      expect(result.success).toBe(true);
      expect(mockNotificationService.sendEmail).toHaveBeenCalledWith(
        'test@example.com',
        'password_reset',
        expect.objectContaining({
          resetToken: expect.any(String),
          resetUrl: expect.any(String)
        }) as Record<string, unknown>
      );
    });

    it('应该生成重置令牌', async () => {
      await resetPassword('test@example.com');
      
      expect(mockCrypto.randomBytes).toHaveBeenCalledWith(32);
      expect(mockRedis.set).toHaveBeenCalledWith(
        expect.stringMatching(/^password_reset:/),
        'user-123',
        'EX',
        3600
      );
    });

    it('应该处理不存在的邮箱', async () => {
      mockUserService.getUserByEmail.mockResolvedValue({
        success: false,
        error: { type: 'USER_NOT_FOUND' }
      });
      
      const result = await resetPassword('nonexistent@example.com');
      
      expect(result.success).toBe(true); // 安全考虑，不暴露用户是否存在
      expect(mockNotificationService.sendEmail).not.toHaveBeenCalled();
    });

    it('应该限制重置频率', async () => {
      mockRedis.get.mockResolvedValue('user-123');
      
      const result = await resetPassword('test@example.com');
      
      expect(result.success).toBe(false);
      expect(result.error).toEqual(
        expect.objectContaining({
          type: 'RESET_TOO_FREQUENT',
          message: 'Password reset requested too frequently'
        }) as Record<string, unknown>
      );
    });

    it('应该记录重置请求', async () => {
      await resetPassword('test@example.com');
      
      expect(mockMonitoringService.recordSecurityEvent).toHaveBeenCalledWith(
        'password_reset_requested',
        expect.objectContaining({
          email: 'test@example.com',
          userId: 'user-123'
        }) as Record<string, unknown>
      );
    });
  });

  describe('密码修改', () => {
    const changeData = {
      userId: 'user-123',
      currentPassword: 'oldpassword',
      newPassword: 'NewPassword123!',
      resetToken: null
    };

    it('应该成功修改密码', async () => {
      const result = await changePassword(changeData);
      
      expect(result.success).toBe(true);
      expect(mockBcrypt.hash).toHaveBeenCalledWith('NewPassword123!', 12);
      expect(mockSupabase.from().update).toHaveBeenCalledWith({
        passwordHash: '$2b$12$hashedpassword',
        passwordChangedAt: expect.any(String)
      });
    });

    it('应该验证当前密码', async () => {
      mockBcrypt.compare.mockResolvedValue(false);
      
      const result = await changePassword(changeData);
      
      expect(result.success).toBe(false);
      expect(result.error).toEqual(
        expect.objectContaining({
          type: 'INVALID_CURRENT_PASSWORD',
          message: 'Current password is incorrect'
        }) as Record<string, unknown>
      );
    });

    it('应该验证新密码强度', async () => {
      mockValidator.isStrongPassword.mockReturnValue(false);
      
      const result = await changePassword({
        ...changeData,
        newPassword: 'weak'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toEqual(
        expect.objectContaining({
          type: 'WEAK_PASSWORD',
          message: 'New password does not meet requirements'
        }) as Record<string, unknown>
      );
    });

    it('应该支持重置令牌修改', async () => {
      mockRedis.get.mockResolvedValue('user-123');
      
      const result = await changePassword({
        ...changeData,
        currentPassword: null,
        resetToken: 'reset-token-123'
      });
      
      expect(result.success).toBe(true);
      expect(mockRedis.del).toHaveBeenCalledWith('password_reset:reset-token-123');
    });

    it('应该撤销所有会话', async () => {
      await changePassword(changeData);
      
      expect(mockSupabase.from().update).toHaveBeenCalledWith({
        isActive: false,
        loggedOutAt: expect.any(String)
      });
    });

    it('应该记录密码修改事件', async () => {
      await changePassword(changeData);
      
      expect(mockMonitoringService.recordSecurityEvent).toHaveBeenCalledWith(
        'password_changed',
        expect.objectContaining({
          userId: 'user-123'
        }) as Record<string, unknown>
      );
    });
  });

  describe('双因素认证', () => {
    it('应该启用双因素认证', async () => {
      const result = await enableTwoFactor('user-123');
      
      expect(result.success).toBe(true);
      expect(result.secret).toBe('JBSWY3DPEHPK3PXP');
      expect(result.qrCode).toBe('data:image/png;base64,qrcode');
      expect(mockSpeakeasy.generateSecret).toHaveBeenCalled();
      expect(mockQrcode.toDataURL).toHaveBeenCalled();
    });

    it('应该验证双因素认证码', async () => {
      mockSupabase.from().single.mockResolvedValue({
        data: {
          id: 'user-123',
          twoFactorSecret: 'JBSWY3DPEHPK3PXP',
          twoFactorEnabled: true
        },
        error: null
      });
      
      const result = await verifyTwoFactor('user-123', '123456');
      
      expect(result.success).toBe(true);
      expect(mockSpeakeasy.totp.verify).toHaveBeenCalledWith({
        secret: 'JBSWY3DPEHPK3PXP',
        encoding: 'base32',
        token: '123456',
        window: 2
      });
    });

    it('应该拒绝无效的认证码', async () => {
      mockSpeakeasy.totp.verify.mockReturnValue(false);
      
      const result = await verifyTwoFactor('user-123', '000000');
      
      expect(result.success).toBe(false);
      expect(result.error).toEqual(
        expect.objectContaining({
          type: 'INVALID_TWO_FACTOR_CODE',
          message: 'Invalid two-factor authentication code'
        }) as Record<string, unknown>
      );
    });

    it('应该保存双因素认证密钥', async () => {
      await enableTwoFactor('user-123');
      
      expect(mockSupabase.from().update).toHaveBeenCalledWith({
        twoFactorSecret: 'JBSWY3DPEHPK3PXP',
        twoFactorEnabled: false // 需要验证后才启用
      });
    });

    it('应该生成备用码', async () => {
      const result = await enableTwoFactor('user-123');
      
      expect(result.backupCodes).toHaveLength(10);
      expect(mockSupabase.from().insert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            userId: 'user-123',
            code: expect.any(String),
            isUsed: false
          }) as Record<string, unknown>
        ]) as unknown[]
      );
    });
  });

  describe('账户锁定管理', () => {
    it('应该锁定账户', async () => {
      const result = await lockAccount('user-123', 'security_violation');
      
      expect(result.success).toBe(true);
      expect(mockSupabase.from().update).toHaveBeenCalledWith({
        isLocked: true,
        lockedAt: expect.any(String),
        lockedReason: 'security_violation',
        lockedUntil: expect.any(String)
      });
    });

    it('应该解锁账户', async () => {
      const result = await unlockAccount('user-123');
      
      expect(result.success).toBe(true);
      expect(mockSupabase.from().update).toHaveBeenCalledWith({
        isLocked: false,
        lockedAt: null,
        lockedReason: null,
        lockedUntil: null,
        loginAttempts: 0
      });
    });

    it('应该撤销锁定用户的所有会话', async () => {
      await lockAccount('user-123', 'security_violation');
      
      expect(mockSupabase.from().update).toHaveBeenCalledWith({
        isActive: false,
        loggedOutAt: expect.any(String)
      });
    });

    it('应该发送锁定通知', async () => {
      await lockAccount('user-123', 'security_violation');
      
      expect(mockNotificationService.sendEmail).toHaveBeenCalledWith(
        'test@example.com',
        'account_locked',
        expect.objectContaining({
          reason: 'security_violation'
        }) as Record<string, unknown>
      );
    });

    it('应该记录锁定事件', async () => {
      await lockAccount('user-123', 'security_violation');
      
      expect(mockMonitoringService.recordSecurityEvent).toHaveBeenCalledWith(
        'account_locked',
        expect.objectContaining({
          userId: 'user-123',
          reason: 'security_violation'
        }) as Record<string, unknown>
      );
    });
  });

  describe('会话管理', () => {
    it('应该验证会话', async () => {
      const result = await validateSession('session-123');
      
      expect(result.success).toBe(true);
      expect(result.session).toEqual(
        expect.objectContaining({
          id: 'session-123',
          userId: 'user-123',
          isActive: true
        }) as Record<string, unknown>
      );
    });

    it('应该拒绝无效会话', async () => {
      mockSupabase.from().single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' }
      });
      
      const result = await validateSession('invalid-session');
      
      expect(result.success).toBe(false);
      expect(result.error).toEqual(
        expect.objectContaining({
          type: 'INVALID_SESSION',
          message: 'Session not found or expired'
        }) as Record<string, unknown>
      );
    });

    it('应该撤销所有令牌', async () => {
      const result = await revokeAllTokens('user-123');
      
      expect(result.success).toBe(true);
      expect(mockSupabase.from().update).toHaveBeenCalledWith({
        isActive: false,
        revokedAt: expect.any(String)
      });
    });

    it('应该获取登录历史', async () => {
      const result = await getLoginHistory('user-123');
      
      expect(result.success).toBe(true);
      expect(result.history).toBeDefined();
      expect(mockSupabase.from().eq).toHaveBeenCalledWith('userId', 'user-123');
    });

    it('应该限制并发会话数', async () => {
      mockSupabase.from().mockResolvedValue({
        data: Array(6).fill({ id: 'session' }),
        error: null
      });
      
      const result = await login({
        email: 'test@example.com',
        password: 'password123'
      });
      
      expect(mockSupabase.from().delete).toHaveBeenCalled(); // 删除最旧的会话
    });
  });

  describe('权限验证', () => {
    it('应该检查用户权限', async () => {
      mockSupabase.from().single.mockResolvedValue({
        data: {
          userId: 'user-123',
          role: 'instructor',
          permissions: ['create_course', 'edit_course']
        },
        error: null
      });
      
      const result = await checkPermission('user-123', 'create_course');
      
      expect(result).toBe(true);
    });

    it('应该拒绝无权限操作', async () => {
      mockSupabase.from().single.mockResolvedValue({
        data: {
          userId: 'user-123',
          role: 'student',
          permissions: ['view_course']
        },
        error: null
      });
      
      const result = await checkPermission('user-123', 'delete_course');
      
      expect(result).toBe(false);
    });

    it('应该缓存权限数据', async () => {
      await checkPermission('user-123', 'create_course');
      
      expect(mockRedis.set).toHaveBeenCalledWith(
        'user_permissions:user-123',
        expect.any(String),
        'EX',
        1800
      );
    });
  });

  describe('密码工具函数', () => {
    it('应该哈希密码', async () => {
      const result = await hashPassword('password123');
      
      expect(result).toBe('$2b$12$hashedpassword');
      expect(mockBcrypt.hash).toHaveBeenCalledWith('password123', 12);
    });

    it('应该验证密码', async () => {
      const result = await verifyPassword('password123', '$2b$12$hashedpassword');
      
      expect(result).toBe(true);
      expect(mockBcrypt.compare).toHaveBeenCalledWith(
        'password123',
        '$2b$12$hashedpassword'
      );
    });

    it('应该生成令牌对', async () => {
      const result = await generateTokens({
        userId: 'user-123',
        email: 'test@example.com',
        role: 'student'
      });
      
      expect(result).toEqual(
        expect.objectContaining({
          accessToken: expect.any(String),
          refreshToken: expect.any(String),
          expiresIn: expect.any(Number)
        }) as Record<string, unknown>
      );
    });

    it('应该验证令牌对', async () => {
      const result = await validateTokens('jwt.access.token', 'refresh.token.123');
      
      expect(result.success).toBe(true);
      expect(result.payload).toEqual(
        expect.objectContaining({
          userId: 'user-123',
          email: 'test@example.com'
        }) as Record<string, unknown>
      );
    });
  });

  describe('性能测试', () => {
    it('应该高效处理大量登录请求', async () => {
      const timer = mockMonitoringService.startTimer();
      
      const promises = Array.from({ length: 100 }, () => 
        login({
          email: 'test@example.com',
          password: 'password123'
        })
      );
      
      await Promise.all(promises);
      
      expect(timer.end).toHaveBeenCalled();
    });

    it('应该优化令牌验证性能', async () => {
      // 第一次验证，从数据库加载
      await verifyToken('jwt.access.token');
      
      // 第二次验证，使用缓存
      mockRedis.get.mockResolvedValue(JSON.stringify({
        userId: 'user-123',
        sessionId: 'session-123'
      }));
      
      await verifyToken('jwt.access.token');
      
      expect(mockSupabase.from().single).toHaveBeenCalledTimes(1);
    });

    it('应该有效管理会话缓存', async () => {
      await validateSession('session-123');
      
      expect(mockRedis.set).toHaveBeenCalledWith(
        'session:session-123',
        expect.any(String),
        'EX',
        3600
      );
    });

    it('应该批量处理令牌撤销', async () => {
      const sessionIds = Array.from({ length: 50 }, (_, i) => `session-${i}`);
      
      await authService.batchRevokeTokens(sessionIds);
      
      expect(mockSupabase.from().in).toHaveBeenCalledWith('id', sessionIds);
      expect(mockSupabase.from().update).toHaveBeenCalledWith({ isActive: false });
    });
  });

  describe('错误处理', () => {
    it('应该处理数据库连接错误', async () => {
      mockSupabase.from().single.mockRejectedValue(
        new Error('Database connection failed')
      );
      
      const result = await login({
        email: 'test@example.com',
        password: 'password123'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toEqual(
        expect.objectContaining({
          type: 'DATABASE_ERROR'
        }) as Record<string, unknown>
      );
      expect(mockErrorHandler.handleError).toHaveBeenCalled();
    });

    it('应该处理Redis连接错误', async () => {
      mockRedis.get.mockRejectedValue(new Error('Redis connection failed'));
      
      const result = await verifyToken('jwt.access.token');
      
      expect(result.success).toBe(true); // 应该降级到数据库查询
      expect(mockSupabase.from().single).toHaveBeenCalled();
    });

    it('应该处理JWT签名错误', async () => {
      mockJwt.sign.mockImplementation(() => {
        throw new Error('JWT signing failed');
      });
      
      const result = await login({
        email: 'test@example.com',
        password: 'password123'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toEqual(
        expect.objectContaining({
          type: 'TOKEN_GENERATION_ERROR',
          message: 'Failed to generate authentication tokens'
        }) as Record<string, unknown>
      );
    });

    it('应该实现重试机制', async () => {
      mockSupabase.from().single
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValue({
          data: { id: 'user-123', email: 'test@example.com' },
          error: null
        });
      
      const result = await login({
        email: 'test@example.com',
        password: 'password123'
      });
      
      expect(result.success).toBe(true);
      expect(mockSupabase.from().single).toHaveBeenCalledTimes(3);
    });

    it('应该处理密码哈希错误', async () => {
      mockBcrypt.hash.mockRejectedValue(
        new Error('Password hashing failed')
      );
      
      const result = await register({
        email: 'test@example.com',
        password: 'password123',
        username: 'testuser'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toEqual(
        expect.objectContaining({
          type: 'PASSWORD_HASH_ERROR',
          message: 'Failed to process password'
        }) as Record<string, unknown>
      );
    });

    it('应该处理通知服务错误', async () => {
      mockNotificationService.sendEmail.mockRejectedValue(
        new Error('Email service unavailable')
      );
      
      const result = await resetPassword('test@example.com');
      
      expect(result.success).toBe(true); // 重置请求成功，邮件发送失败不影响主流程
      expect(mockErrorHandler.handleError).toHaveBeenCalled();
    });

    it('应该处理双因素认证服务错误', async () => {
      mockSpeakeasy.generateSecret.mockImplementation(() => {
        throw new Error('2FA service unavailable');
      });
      
      const result = await enableTwoFactor('user-123');
      
      expect(result.success).toBe(false);
      expect(result.error).toEqual(
        expect.objectContaining({
          type: 'TWO_FACTOR_ERROR',
          message: 'Failed to enable two-factor authentication'
        }) as Record<string, unknown>
      );
    });
  });
});

/**
 * 认证服务便捷函数导出测试
 */
describe('认证服务便捷函数', () => {
  it('应该导出所有必要的函数', () => {
    expect(typeof register).toBe('function');
    expect(typeof login).toBe('function');
    expect(typeof logout).toBe('function');
    expect(typeof refreshToken).toBe('function');
    expect(typeof verifyToken).toBe('function');
    expect(typeof resetPassword).toBe('function');
    expect(typeof changePassword).toBe('function');
    expect(typeof enableTwoFactor).toBe('function');
    expect(typeof verifyTwoFactor).toBe('function');
    expect(typeof lockAccount).toBe('function');
    expect(typeof unlockAccount).toBe('function');
    expect(typeof validateSession).toBe('function');
    expect(typeof revokeAllTokens).toBe('function');
    expect(typeof getLoginHistory).toBe('function');
    expect(typeof checkPermission).toBe('function');
    expect(typeof hashPassword).toBe('function');
    expect(typeof verifyPassword).toBe('function');
    expect(typeof generateTokens).toBe('function');
    expect(typeof validateTokens).toBe('function');
  });

  it('应该导出认证服务实例', () => {
    expect(authService).toBeDefined();
    expect(typeof authService.initialize).toBe('function');
    expect(typeof authService.register).toBe('function');
    expect(typeof authService.login).toBe('function');
    expect(typeof authService.logout).toBe('function');
    expect(typeof authService.verifyToken).toBe('function');
    expect(typeof authService.refreshToken).toBe('function');
  });
});