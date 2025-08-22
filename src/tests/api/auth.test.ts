/**
 * 认证API路由集成测试
 * 测试用户注册、登录、令牌验证、密码重置等认证功能
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { NextRequest, NextResponse } from 'next/server';
import { POST as Register } from '@/app/api/auth/register/route';
import { POST as Login } from '@/app/api/auth/login/route';
import { POST as Logout } from '@/app/api/auth/logout/route';
import { POST as RefreshToken } from '@/app/api/auth/refresh/route';
import { POST as ForgotPassword } from '@/app/api/auth/forgot-password/route';
import { POST as ResetPassword } from '@/app/api/auth/reset-password/route';
import { POST as VerifyEmail } from '@/app/api/auth/verify-email/route';
import { GET as GetProfile, PUT as UpdateProfile } from '@/app/api/auth/profile/route';
import { POST as ChangePassword } from '@/app/api/auth/change-password/route';
import { POST as FaceLogin } from '@/app/api/auth/face-login/route';
import { testUtils } from '../setup';

// 模拟依赖
const mockSupabase = {
  auth: {
    signUp: jest.fn(),
    signInWithPassword: jest.fn(),
    signOut: jest.fn(),
    refreshSession: jest.fn(),
    resetPasswordForEmail: jest.fn(),
    updateUser: jest.fn(),
    getUser: jest.fn(),
    verifyOtp: jest.fn()
  },
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn(),
        maybeSingle: jest.fn()
      }))
    })),
    insert: jest.fn(() => ({
      select: jest.fn(() => ({
        single: jest.fn()
      }))
    })),
    update: jest.fn(() => ({
      eq: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn()
        }))
      }))
    })),
    delete: jest.fn(() => ({
      eq: jest.fn()
    }))
  }))
};

const mockSecurity = {
  validateApiKey: jest.fn(),
  checkRateLimit: jest.fn(),
  validatePermissions: jest.fn(),
  verifyToken: jest.fn(),
  hashPassword: jest.fn(),
  comparePassword: jest.fn(),
  generateToken: jest.fn(),
  generateRefreshToken: jest.fn()
};

const mockApiMonitor = {
  startCall: jest.fn(() => 'call-id-123'),
  endCall: jest.fn(),
  recordError: jest.fn()
};

const mockFaceRecognitionService = {
  detectFace: jest.fn(),
  compareFaces: jest.fn(),
  verifyIdentity: jest.fn()
};

const mockCloudStorageService = {
  uploadFile: jest.fn(),
  deleteFile: jest.fn(),
  getFileUrl: jest.fn()
};

const mockEmailService = {
  sendVerificationEmail: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
  sendWelcomeEmail: jest.fn()
};

jest.mock('@/utils/supabase', () => ({
  createClient: () => mockSupabase
}));

jest.mock('@/middleware/security', () => ({
  security: mockSecurity
}));

jest.mock('@/utils/apiMonitor', () => ({
  apiMonitor: mockApiMonitor
}));

jest.mock('@/services/faceRecognitionService', () => ({
  faceRecognitionService: mockFaceRecognitionService
}));

jest.mock('@/services/cloudStorageService', () => ({
  cloudStorageService: mockCloudStorageService
}));

jest.mock('@/services/emailService', () => ({
  emailService: mockEmailService
}));

describe('认证API路由', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // 设置默认的成功响应
    mockSecurity.validateApiKey.mockResolvedValue({ valid: true, keyId: 'test-key' });
    mockSecurity.checkRateLimit.mockResolvedValue({ allowed: true });
    mockSecurity.validatePermissions.mockResolvedValue({ allowed: true });
    mockSecurity.verifyToken.mockResolvedValue({ valid: true, userId: 'user-123' });
  });

  describe('POST /api/auth/register', () => {
    it('应该成功注册新用户', async () => {
      const registrationData = {
        email: 'newuser@example.com',
        password: 'SecurePassword123!',
        confirmPassword: 'SecurePassword123!',
        firstName: '张',
        lastName: '三',
        dateOfBirth: '1990-01-01',
        phoneNumber: '+86-13800138000',
        agreeToTerms: true,
        agreeToPrivacy: true
      };
      
      const mockAuthUser = {
        id: 'auth-user-123',
        email: 'newuser@example.com',
        email_confirmed_at: null,
        created_at: new Date().toISOString()
      };
      
      const mockUserProfile = {
        id: 'user-profile-123',
        auth_user_id: 'auth-user-123',
        email: 'newuser@example.com',
        first_name: '张',
        last_name: '三',
        full_name: '张三',
        date_of_birth: '1990-01-01',
        phone_number: '+86-13800138000',
        avatar_url: null,
        bio: null,
        location: null,
        website: null,
        social_links: {},
        preferences: {
          language: 'zh-CN',
          timezone: 'Asia/Shanghai',
          email_notifications: true,
          push_notifications: true
        },
        role: 'student',
        status: 'active',
        email_verified: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      mockSupabase.auth.signUp.mockResolvedValue({
        data: {
          user: mockAuthUser,
          session: null
        },
        error: null
      });
      
      mockSupabase.from().insert().select().single.mockResolvedValue({
        data: mockUserProfile,
        error: null
      });
      
      mockEmailService.sendVerificationEmail.mockResolvedValue({ success: true });
      
      const request = testUtils.createMockRequest('POST', '/api/auth/register', registrationData);
      const response = await Register(request);
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.user.email).toBe('newuser@example.com');
      expect(data.data.user.full_name).toBe('张三');
      expect(data.data.user.email_verified).toBe(false);
      expect(data.message).toBe('Registration successful. Please check your email to verify your account.');
      expect(mockEmailService.sendVerificationEmail).toHaveBeenCalledWith('newuser@example.com', expect.any(String));
      expect(mockApiMonitor.startCall).toHaveBeenCalledWith('POST', '/api/auth/register');
      expect(mockApiMonitor.endCall).toHaveBeenCalledWith('call-id-123', 201);
    });

    it('应该验证密码强度', async () => {
      const weakPasswordData = {
        email: 'user@example.com',
        password: '123456', // 弱密码
        confirmPassword: '123456',
        firstName: '张',
        lastName: '三',
        agreeToTerms: true,
        agreeToPrivacy: true
      };
      
      const request = testUtils.createMockRequest('POST', '/api/auth/register', weakPasswordData);
      const response = await Register(request);
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Password does not meet security requirements');
    });

    it('应该验证密码确认匹配', async () => {
      const mismatchPasswordData = {
        email: 'user@example.com',
        password: 'SecurePassword123!',
        confirmPassword: 'DifferentPassword123!',
        firstName: '张',
        lastName: '三',
        agreeToTerms: true,
        agreeToPrivacy: true
      };
      
      const request = testUtils.createMockRequest('POST', '/api/auth/register', mismatchPasswordData);
      const response = await Register(request);
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Passwords do not match');
    });
  });

  describe('POST /api/auth/login', () => {
    it('应该成功登录用户', async () => {
      const loginData = {
        email: 'user@example.com',
        password: 'SecurePassword123!'
      };
      
      const mockSession = {
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
        expires_in: 3600,
        user: {
          id: 'auth-user-123',
          email: 'user@example.com'
        }
      };
      
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: {
          user: mockSession.user,
          session: mockSession
        },
        error: null
      });
      
      const request = testUtils.createMockRequest('POST', '/api/auth/login', loginData);
      const response = await Login(request);
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.session.access_token).toBe('mock-access-token');
      expect(data.data.user.email).toBe('user@example.com');
      expect(data.message).toBe('Login successful');
    });

    it('应该处理无效凭据', async () => {
      const loginData = {
        email: 'user@example.com',
        password: 'WrongPassword123!'
      };
      
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials' }
      });
      
      const request = testUtils.createMockRequest('POST', '/api/auth/login', loginData);
      const response = await Login(request);
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid login credentials');
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });
});

/**
 * 测试工具函数
 */
const authTestUtils = {
  /**
   * 创建模拟用户数据
   */
  createMockUser: (overrides = {}) => ({
    id: 'test-user-123',
    email: 'test@example.com',
    firstName: '测试',
    lastName: '用户',
    fullName: '测试用户',
    role: 'student',
    status: 'active',
    emailVerified: true,
    createdAt: new Date().toISOString(),
    ...overrides
  }),

  /**
   * 创建模拟会话数据
   */
  createMockSession: (overrides = {}) => ({
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
    expires_in: 3600,
    token_type: 'bearer',
    user: {
      id: 'auth-user-123',
      email: 'test@example.com'
    },
    ...overrides
  }),

  /**
   * 验证密码强度
   */
  validatePasswordStrength: (password: string) => {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    return {
      isValid: password.length >= minLength && hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar,
      errors: [
        ...(password.length < minLength ? ['Password must be at least 8 characters long'] : []),
        ...(!hasUpperCase ? ['Password must contain at least one uppercase letter'] : []),
        ...(!hasLowerCase ? ['Password must contain at least one lowercase letter'] : []),
        ...(!hasNumbers ? ['Password must contain at least one number'] : []),
        ...(!hasSpecialChar ? ['Password must contain at least one special character'] : [])
      ]
    };
  },

  /**
   * 验证邮箱格式
   */
  validateEmail: (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  /**
   * 生成测试令牌
   */
  generateTestToken: (payload = {}) => {
    const header = { alg: 'HS256', typ: 'JWT' };
    const defaultPayload = {
      sub: 'test-user-123',
      email: 'test@example.com',
      role: 'student',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600
    };
    
    return `${btoa(JSON.stringify(header))}.${btoa(JSON.stringify({ ...defaultPayload, ...payload }))}.mock-signature`;
  }
};

export { authTestUtils };