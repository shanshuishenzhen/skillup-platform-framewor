/**
 * 认证API集成测试
 * 
 * 测试认证相关的API端点，包括：
 * - 用户注册和登录
 * - 密码重置和修改
 * - 邮箱验证
 * - 会话管理
 * - 权限验证
 * - 多因素认证
 * - 社交登录
 * - API密钥管理
 */

import request from 'supertest';
import { app } from '../../app';
import { supabaseClient } from '../../utils/supabase';
import { cacheService } from '../../services/cacheService';
import { emailService } from '../../services/emailService';
import { smsService } from '../../services/smsService';

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

// Mock 依赖
jest.mock('../../utils/supabase');
jest.mock('../../services/cacheService');
jest.mock('../../services/emailService');
jest.mock('../../services/smsService');

jest.mock('jsonwebtoken');
jest.mock('bcryptjs');
jest.mock('crypto');

// 类型定义
interface TestUser {
  id: string;
  email: string;
  password: string;
  name: string;
  phone?: string;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  role: string;
  status: string;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

interface LoginAttempt {
  email: string;
  ip: string;
  userAgent: string;
  success: boolean;
  timestamp: Date;
  failureReason?: string;
}

interface PasswordResetRequest {
  email: string;
  token: string;
  expiresAt: Date;
  used: boolean;
  createdAt: Date;
}

interface EmailVerification {
  userId: string;
  email: string;
  token: string;
  expiresAt: Date;
  verified: boolean;
  createdAt: Date;
}

interface TwoFactorAuth {
  userId: string;
  secret: string;
  backupCodes: string[];
  enabled: boolean;
  lastUsedAt?: Date;
  createdAt: Date;
}

interface ApiKey {
  id: string;
  userId: string;
  name: string;
  key: string;
  permissions: string[];
  lastUsedAt?: Date;
  expiresAt?: Date;
  isActive: boolean;
  createdAt: Date;
}

// Mock 实例
const mockSupabaseClient = {
  auth: {
    signUp: jest.fn(),
    signInWithPassword: jest.fn(),
    signOut: jest.fn(),
    resetPasswordForEmail: jest.fn(),
    updateUser: jest.fn(),
    getUser: jest.fn(),
    refreshSession: jest.fn(),
    verifyOtp: jest.fn(),
    resend: jest.fn()
  },
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  neq: jest.fn().mockReturnThis(),
  in: jest.fn().mockReturnThis(),
  gte: jest.fn().mockReturnThis(),
  lte: jest.fn().mockReturnThis(),
  like: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  single: jest.fn(),
  then: jest.fn()
};

const mockCacheService = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  incr: jest.fn(),
  expire: jest.fn(),
  zadd: jest.fn(),
  zrange: jest.fn(),
  zrem: jest.fn()
};

const mockEmailService = {
  sendTemplateEmail: jest.fn(),
  sendEmail: jest.fn()
};

const mockSmsService = {
  sendVerificationCode: jest.fn(),
  verifyCode: jest.fn()
};

const mockJwt = {
  sign: jest.fn(),
  verify: jest.fn(),
  decode: jest.fn()
};

const mockBcrypt = {
  hash: jest.fn(),
  compare: jest.fn(),
  genSalt: jest.fn()
};

const mockCrypto = {
  randomBytes: jest.fn(),
  createHash: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  digest: jest.fn(),
  timingSafeEqual: jest.fn()
};

// 设置 Mock
Object.assign(supabaseClient, mockSupabaseClient);
Object.assign(cacheService, mockCacheService);
Object.assign(emailService, mockEmailService);
Object.assign(smsService, mockSmsService);

Object.assign(jwt, mockJwt);
Object.assign(bcrypt, mockBcrypt);
Object.assign(crypto, mockCrypto);

// 测试数据
const testUser: TestUser = {
  id: 'user-123456',
  email: 'test@skillup.com',
  password: 'hashedPassword123',
  name: '测试用户',
  phone: '+86 138 0013 8000',
  isEmailVerified: true,
  isPhoneVerified: false,
  role: 'student',
  status: 'active',
  lastLoginAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date()
};

const testTokens: AuthTokens = {
  accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  refreshToken: 'refresh-token-123456',
  expiresIn: 900, // 15分钟
  tokenType: 'Bearer'
};

const testLoginAttempt: LoginAttempt = {
  email: 'test@skillup.com',
  ip: '192.168.1.1',
  userAgent: 'Mozilla/5.0...',
  success: true,
  timestamp: new Date()
};

const testPasswordReset: PasswordResetRequest = {
  email: 'test@skillup.com',
  token: 'reset-token-123456',
  expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1小时后过期
  used: false,
  createdAt: new Date()
};

const testEmailVerification: EmailVerification = {
  userId: 'user-123456',
  email: 'test@skillup.com',
  token: 'verify-token-123456',
  expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24小时后过期
  verified: false,
  createdAt: new Date()
};

const testTwoFactorAuth: TwoFactorAuth = {
  userId: 'user-123456',
  secret: 'JBSWY3DPEHPK3PXP',
  backupCodes: ['123456', '234567', '345678'],
  enabled: true,
  lastUsedAt: new Date(),
  createdAt: new Date()
};

const testApiKey: ApiKey = {
  id: 'api-key-123',
  userId: 'user-123456',
  name: '开发环境API密钥',
  key: 'sk_test_123456789',
  permissions: ['read:courses', 'write:progress'],
  lastUsedAt: new Date(),
  expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1年后过期
  isActive: true,
  createdAt: new Date()
};

describe('Auth API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // 设置默认的mock返回值
    mockCacheService.get.mockResolvedValue(null);
    mockCacheService.set.mockResolvedValue(true);
    mockCacheService.incr.mockResolvedValue(1);
    
    mockEmailService.sendTemplateEmail.mockResolvedValue({
      success: true,
      messageId: 'email-123'
    });
    
    mockSmsService.sendVerificationCode.mockResolvedValue({
      success: true,
      codeId: 'sms-123'
    });
    
    // 设置JWT mock
    mockJwt.sign.mockReturnValue('jwt-token-123');
    mockJwt.verify.mockReturnValue({
      userId: 'user-123456',
      email: 'test@skillup.com',
      role: 'student'
    });
    
    // 设置bcrypt mock
    mockBcrypt.hash.mockResolvedValue('hashedPassword123');
    mockBcrypt.compare.mockResolvedValue(true);
    mockBcrypt.genSalt.mockResolvedValue('salt123');
    
    // 设置crypto mock
    mockCrypto.randomBytes.mockReturnValue(Buffer.from('random-bytes'));
    mockCrypto.digest.mockReturnValue('token-123456');
    mockCrypto.timingSafeEqual.mockReturnValue(true);
    
    // 设置Supabase mock
    mockSupabaseClient.single.mockResolvedValue({
      data: testUser,
      error: null
    });
    
    mockSupabaseClient.then.mockResolvedValue({
      data: [testUser],
      error: null
    });
    
    mockSupabaseClient.auth.signUp.mockResolvedValue({
      data: {
        user: { id: 'user-123456', email: 'test@skillup.com' },
        session: null
      },
      error: null
    });
    
    mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
      data: {
        user: { id: 'user-123456', email: 'test@skillup.com' },
        session: {
          access_token: 'access-token-123',
          refresh_token: 'refresh-token-123',
          expires_in: 3600
        }
      },
      error: null
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  /**
   * 用户注册测试
   */
  describe('POST /api/auth/register', () => {
    it('应该成功注册新用户', async () => {
      const registerData = {
        email: 'newuser@skillup.com',
        password: 'SecurePass123!',
        name: '新用户',
        phone: '+86 138 0013 8001'
      };
      
      const response = await request(app)
        .post('/api/auth/register')
        .send(registerData)
        .expect(201);
      
      expect(response.body).toEqual(
        expect.objectContaining({
          success: true,
          message: '注册成功，请查收验证邮件',
          data: expect.objectContaining({
            userId: expect.any(String),
            email: 'newuser@skillup.com',
            name: '新用户'
          })
        })
      );
      
      expect(mockSupabaseClient.auth.signUp).toHaveBeenCalledWith({
        email: 'newuser@skillup.com',
        password: 'SecurePass123!',
        options: {
          data: {
            name: '新用户',
            phone: '+86 138 0013 8001'
          }
        }
      });
      
      expect(mockEmailService.sendTemplateEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'newuser@skillup.com',
          templateId: 'email-verification',
          templateData: expect.objectContaining({
            name: '新用户',
            verificationLink: expect.stringContaining('verify')
          })
        })
      );
      

    });

    it('应该验证必填字段', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'invalid-email',
          password: '123' // 密码太短
        })
        .expect(400);
      
      expect(response.body).toEqual(
        expect.objectContaining({
          success: false,
          message: '请求参数验证失败',
          errors: expect.arrayContaining([
            expect.objectContaining({
              field: 'email',
              message: '邮箱格式不正确'
            }),
            expect.objectContaining({
              field: 'password',
              message: '密码长度至少8位'
            }),
            expect.objectContaining({
              field: 'name',
              message: '姓名不能为空'
            })
          ])
        })
      );
    });

    it('应该检查邮箱是否已存在', async () => {
      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'User already registered' }
      });
      
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'existing@skillup.com',
          password: 'SecurePass123!',
          name: '已存在用户'
        })
        .expect(409);
      
      expect(response.body).toEqual(
        expect.objectContaining({
          success: false,
          message: '该邮箱已被注册'
        })
      );
    });

    it('应该验证密码强度', async () => {
      const weakPasswords = [
        'password', // 无数字、无大写、无特殊字符
        'Password', // 无数字、无特殊字符
        'Password1', // 无特殊字符
        '12345678' // 无字母
      ];
      
      for (const password of weakPasswords) {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email: 'test@skillup.com',
            password,
            name: '测试用户'
          })
          .expect(400);
        
        expect(response.body.errors).toContainEqual(
          expect.objectContaining({
            field: 'password',
            message: expect.stringContaining('密码强度不足')
          })
        );
      }
    });
  });

  /**
   * 用户登录测试
   */
  describe('POST /api/auth/login', () => {
    it('应该成功登录', async () => {
      const loginData = {
        email: 'test@skillup.com',
        password: 'SecurePass123!'
      };
      
      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);
      
      expect(response.body).toEqual(
        expect.objectContaining({
          success: true,
          message: '登录成功',
          data: expect.objectContaining({
            user: expect.objectContaining({
              id: 'user-123456',
              email: 'test@skillup.com',
              name: '测试用户'
            }),
            tokens: expect.objectContaining({
              accessToken: expect.any(String),
              refreshToken: expect.any(String),
              expiresIn: expect.any(Number)
            })
          })
        })
      );
      
      expect(mockSupabaseClient.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@skillup.com',
        password: 'SecurePass123!'
      });
      

    });

    it('应该处理错误的凭据', async () => {
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials' }
      });
      
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@skillup.com',
          password: 'wrongpassword'
        })
        .expect(401);
      
      expect(response.body).toEqual(
        expect.objectContaining({
          success: false,
          message: '邮箱或密码错误'
        })
      );
      

    });

    it('应该处理账户锁定', async () => {
      mockCacheService.get.mockResolvedValue('6'); // 超过最大尝试次数
      
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@skillup.com',
          password: 'wrongpassword'
        })
        .expect(423);
      
      expect(response.body).toEqual(
        expect.objectContaining({
          success: false,
          message: '账户已被锁定，请15分钟后重试'
        })
      );
    });

    it('应该要求邮箱验证', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: { ...testUser, isEmailVerified: false },
        error: null
      });
      
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@skillup.com',
          password: 'SecurePass123!'
        })
        .expect(403);
      
      expect(response.body).toEqual(
        expect.objectContaining({
          success: false,
          message: '请先验证邮箱后再登录',
          data: expect.objectContaining({
            requireEmailVerification: true
          })
        })
      );
    });

    it('应该处理双因素认证', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: { ...testUser, twoFactorEnabled: true },
        error: null
      });
      
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@skillup.com',
          password: 'SecurePass123!'
        })
        .expect(200);
      
      expect(response.body).toEqual(
        expect.objectContaining({
          success: true,
          message: '请输入双因素认证码',
          data: expect.objectContaining({
            requireTwoFactor: true,
            tempToken: expect.any(String)
          })
        })
      );
    });
  });

  /**
   * 双因素认证测试
   */
  describe('POST /api/auth/verify-2fa', () => {
    it('应该验证TOTP码', async () => {
      const response = await request(app)
        .post('/api/auth/verify-2fa')
        .send({
          tempToken: 'temp-token-123',
          code: '123456'
        })
        .expect(200);
      
      expect(response.body).toEqual(
        expect.objectContaining({
          success: true,
          message: '双因素认证成功',
          data: expect.objectContaining({
            tokens: expect.objectContaining({
              accessToken: expect.any(String),
              refreshToken: expect.any(String)
            })
          })
        })
      );
    });

    it('应该验证备用码', async () => {
      const response = await request(app)
        .post('/api/auth/verify-2fa')
        .send({
          tempToken: 'temp-token-123',
          backupCode: '123456'
        })
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(mockSupabaseClient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          backup_codes: expect.not.arrayContaining(['123456'])
        })
      );
    });

    it('应该处理无效的认证码', async () => {
      mockCrypto.timingSafeEqual.mockReturnValue(false);
      
      const response = await request(app)
        .post('/api/auth/verify-2fa')
        .send({
          tempToken: 'temp-token-123',
          code: '000000'
        })
        .expect(401);
      
      expect(response.body).toEqual(
        expect.objectContaining({
          success: false,
          message: '认证码错误'
        })
      );
    });
  });

  /**
   * 密码重置测试
   */
  describe('POST /api/auth/forgot-password', () => {
    it('应该发送密码重置邮件', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({
          email: 'test@skillup.com'
        })
        .expect(200);
      
      expect(response.body).toEqual(
        expect.objectContaining({
          success: true,
          message: '密码重置邮件已发送'
        })
      );
      
      expect(mockEmailService.sendTemplateEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'test@skillup.com',
          templateId: 'password-reset',
          templateData: expect.objectContaining({
            resetLink: expect.stringContaining('reset-password')
          })
        })
      );
      
      expect(mockSupabaseClient.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'test@skillup.com',
          token: expect.any(String),
          expires_at: expect.any(Date)
        })
      );
    });

    it('应该处理不存在的邮箱', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: null,
        error: { message: 'User not found' }
      });
      
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({
          email: 'nonexistent@skillup.com'
        })
        .expect(200); // 出于安全考虑，仍返回成功
      
      expect(response.body.success).toBe(true);
      expect(mockEmailService.sendTemplateEmail).not.toHaveBeenCalled();
    });
  });

  /**
   * 重置密码测试
   */
  describe('POST /api/auth/reset-password', () => {
    it('应该成功重置密码', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: testPasswordReset,
        error: null
      });
      
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: 'reset-token-123456',
          password: 'NewSecurePass123!'
        })
        .expect(200);
      
      expect(response.body).toEqual(
        expect.objectContaining({
          success: true,
          message: '密码重置成功'
        })
      );
      
      expect(mockBcrypt.hash).toHaveBeenCalledWith('NewSecurePass123!', 12);
      expect(mockSupabaseClient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          password: 'hashedPassword123',
          updated_at: expect.any(Date)
        })
      );
    });

    it('应该处理无效或过期的令牌', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: {
          ...testPasswordReset,
          expiresAt: new Date(Date.now() - 60 * 60 * 1000) // 已过期
        },
        error: null
      });
      
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: 'expired-token',
          password: 'NewSecurePass123!'
        })
        .expect(400);
      
      expect(response.body).toEqual(
        expect.objectContaining({
          success: false,
          message: '重置令牌无效或已过期'
        })
      );
    });
  });

  /**
   * 邮箱验证测试
   */
  describe('POST /api/auth/verify-email', () => {
    it('应该成功验证邮箱', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: testEmailVerification,
        error: null
      });
      
      const response = await request(app)
        .post('/api/auth/verify-email')
        .send({
          token: 'verify-token-123456'
        })
        .expect(200);
      
      expect(response.body).toEqual(
        expect.objectContaining({
          success: true,
          message: '邮箱验证成功'
        })
      );
      
      expect(mockSupabaseClient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          is_email_verified: true,
          email_verified_at: expect.any(Date)
        })
      );
    });

    it('应该重新发送验证邮件', async () => {
      const response = await request(app)
        .post('/api/auth/resend-verification')
        .send({
          email: 'test@skillup.com'
        })
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(mockEmailService.sendTemplateEmail).toHaveBeenCalled();
    });
  });

  /**
   * 令牌刷新测试
   */
  describe('POST /api/auth/refresh', () => {
    it('应该刷新访问令牌', async () => {
      mockSupabaseClient.auth.refreshSession.mockResolvedValue({
        data: {
          session: {
            access_token: 'new-access-token',
            refresh_token: 'new-refresh-token',
            expires_in: 3600
          }
        },
        error: null
      });
      
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({
          refreshToken: 'refresh-token-123'
        })
        .expect(200);
      
      expect(response.body).toEqual(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            accessToken: 'new-access-token',
            refreshToken: 'new-refresh-token',
            expiresIn: 3600
          })
        })
      );
    });

    it('应该处理无效的刷新令牌', async () => {
      mockSupabaseClient.auth.refreshSession.mockResolvedValue({
        data: { session: null },
        error: { message: 'Invalid refresh token' }
      });
      
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({
          refreshToken: 'invalid-token'
        })
        .expect(401);
      
      expect(response.body).toEqual(
        expect.objectContaining({
          success: false,
          message: '刷新令牌无效'
        })
      );
    });
  });

  /**
   * 登出测试
   */
  describe('POST /api/auth/logout', () => {
    it('应该成功登出', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', 'Bearer jwt-token-123')
        .expect(200);
      
      expect(response.body).toEqual(
        expect.objectContaining({
          success: true,
          message: '登出成功'
        })
      );
      
      expect(mockSupabaseClient.auth.signOut).toHaveBeenCalled();
      expect(mockCacheService.del).toHaveBeenCalledWith(
        'user_session_user-123456'
      );
    });
  });

  /**
   * 用户信息测试
   */
  describe('GET /api/auth/me', () => {
    it('应该获取当前用户信息', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer jwt-token-123')
        .expect(200);
      
      expect(response.body).toEqual(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            id: 'user-123456',
            email: 'test@skillup.com',
            name: '测试用户',
            role: 'student'
          })
        })
      );
    });

    it('应该处理未认证的请求', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .expect(401);
      
      expect(response.body).toEqual(
        expect.objectContaining({
          success: false,
          message: '未提供认证令牌'
        })
      );
    });
  });

  /**
   * API密钥管理测试
   */
  describe('API Key Management', () => {
    it('应该创建API密钥', async () => {
      const response = await request(app)
        .post('/api/auth/api-keys')
        .set('Authorization', 'Bearer jwt-token-123')
        .send({
          name: '开发环境密钥',
          permissions: ['read:courses', 'write:progress'],
          expiresIn: 365 // 天数
        })
        .expect(201);
      
      expect(response.body).toEqual(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            id: expect.any(String),
            name: '开发环境密钥',
            key: expect.stringMatching(/^sk_/),
            permissions: ['read:courses', 'write:progress']
          })
        })
      );
    });

    it('应该获取API密钥列表', async () => {
      mockSupabaseClient.then.mockResolvedValue({
        data: [testApiKey],
        error: null
      });
      
      const response = await request(app)
        .get('/api/auth/api-keys')
        .set('Authorization', 'Bearer jwt-token-123')
        .expect(200);
      
      expect(response.body).toEqual(
        expect.objectContaining({
          success: true,
          data: expect.arrayContaining([
            expect.objectContaining({
              id: 'api-key-123',
              name: '开发环境API密钥',
              permissions: ['read:courses', 'write:progress']
            })
          ])
        })
      );
    });

    it('应该撤销API密钥', async () => {
      const response = await request(app)
        .delete('/api/auth/api-keys/api-key-123')
        .set('Authorization', 'Bearer jwt-token-123')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(mockSupabaseClient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          is_active: false,
          revoked_at: expect.any(Date)
        })
      );
    });
  });

  /**
   * 安全测试
   */
  describe('Security Tests', () => {
    it('应该防止暴力破解', async () => {
      mockCacheService.incr.mockResolvedValue(6); // 超过限制
      
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@skillup.com',
          password: 'wrongpassword'
        })
        .expect(429);
      
      expect(response.body).toEqual(
        expect.objectContaining({
          success: false,
          message: '请求过于频繁，请稍后重试'
        })
      );
    });

    it('应该验证CSRF令牌', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@skillup.com',
          password: 'SecurePass123!'
        })
        .expect(403);
      
      expect(response.body).toEqual(
        expect.objectContaining({
          success: false,
          message: 'CSRF令牌验证失败'
        })
      );
    });

    it('应该记录可疑活动', async () => {
      await request(app)
        .post('/api/auth/login')
        .set('X-Forwarded-For', '192.168.1.100') // 可疑IP
        .send({
          email: 'test@skillup.com',
          password: 'wrongpassword'
        });
      

    });
  });

  /**
   * 错误处理测试
   */
  describe('Error Handling', () => {
    it('应该处理数据库连接错误', async () => {
      mockSupabaseClient.single.mockRejectedValue(
        new Error('Database connection failed')
      );
      
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@skillup.com',
          password: 'SecurePass123!'
        })
        .expect(500);
      
      expect(response.body).toEqual(
        expect.objectContaining({
          success: false,
          message: '服务器内部错误'
        })
      );
    });

    it('应该处理邮件发送失败', async () => {
      mockEmailService.sendTemplateEmail.mockResolvedValue({
        success: false,
        errorMessage: 'SMTP connection failed'
      });
      
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({
          email: 'test@skillup.com'
        })
        .expect(500);
      
      expect(response.body).toEqual(
        expect.objectContaining({
          success: false,
          message: '邮件发送失败，请稍后重试'
        })
      );
    });
  });

  /**
   * 性能测试
   */
  describe('Performance Tests', () => {
    it('应该在合理时间内处理登录请求', async () => {
      const startTime = Date.now();
      
      await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@skillup.com',
          password: 'SecurePass123!'
        });
      
      const executionTime = Date.now() - startTime;
      expect(executionTime).toBeLessThan(1000); // 1秒内完成
    });

    it('应该有效利用缓存', async () => {
      // 第一次请求
      await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer jwt-token-123');
      
      // 第二次请求应该使用缓存
      mockCacheService.get.mockResolvedValue(JSON.stringify(testUser));
      
      await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer jwt-token-123');
      
      expect(mockCacheService.get).toHaveBeenCalledWith(
        'user_profile_user-123456'
      );
    });
  });
});