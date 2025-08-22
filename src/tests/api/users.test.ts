/**
 * 用户API路由集成测试
 * 测试用户的CRUD操作、认证、权限控制等功能
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { NextRequest, NextResponse } from 'next/server';
import { GET, POST, PUT, DELETE } from '@/app/api/users/route';
import { GET as GetUserById, PUT as UpdateUser, DELETE as DeleteUser } from '@/app/api/users/[id]/route';
import { POST as LoginUser } from '@/app/api/auth/login/route';
import { POST as RegisterUser } from '@/app/api/auth/register/route';
import { testUtils } from '../setup';

// 模拟依赖
const mockSupabase = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn(),
        order: jest.fn(() => ({
          limit: jest.fn(() => ({
            range: jest.fn()
          }))
        }))
      })),
      order: jest.fn(() => ({
        limit: jest.fn(() => ({
          range: jest.fn()
        }))
      })),
      limit: jest.fn(() => ({
        range: jest.fn()
      })),
      range: jest.fn()
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
  })),
  auth: {
    signUp: jest.fn(),
    signInWithPassword: jest.fn(),
    signOut: jest.fn(),
    getUser: jest.fn()
  }
};

const mockSecurity = {
  validateApiKey: jest.fn(),
  checkRateLimit: jest.fn(),
  validatePermissions: jest.fn(),
  hashPassword: jest.fn(),
  verifyPassword: jest.fn(),
  generateToken: jest.fn(),
  verifyToken: jest.fn()
};

const mockApiMonitor = {
  startCall: jest.fn(() => 'call-id-123'),
  endCall: jest.fn(),
  recordError: jest.fn()
};

const mockFaceRecognition = {
  detectFace: jest.fn(),
  compareFaces: jest.fn(),
  verifyIdentity: jest.fn()
};

const mockCloudStorage = {
  uploadFile: jest.fn(),
  deleteFile: jest.fn(),
  getFileUrl: jest.fn()
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
  faceRecognitionService: mockFaceRecognition
}));

jest.mock('@/services/cloudStorageService', () => ({
  cloudStorageService: mockCloudStorage
}));

describe('用户API路由', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // 设置默认的成功响应
    mockSecurity.validateApiKey.mockResolvedValue({ valid: true, keyId: 'test-key' });
    mockSecurity.checkRateLimit.mockResolvedValue({ allowed: true });
    mockSecurity.validatePermissions.mockResolvedValue({ allowed: true });
    mockSecurity.hashPassword.mockResolvedValue('hashed-password-123');
    mockSecurity.verifyPassword.mockResolvedValue(true);
    mockSecurity.generateToken.mockResolvedValue('jwt-token-123');
    mockSecurity.verifyToken.mockResolvedValue({ valid: true, userId: 'user-123' });
  });

  describe('GET /api/users', () => {
    it('应该成功获取用户列表', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          email: 'user1@example.com',
          username: 'user1',
          full_name: '用户一',
          role: 'student',
          status: 'active',
          created_at: '2024-01-01T00:00:00Z',
          last_login: '2024-01-15T10:30:00Z'
        },
        {
          id: 'user-2',
          email: 'user2@example.com',
          username: 'user2',
          full_name: '用户二',
          role: 'instructor',
          status: 'active',
          created_at: '2024-01-02T00:00:00Z',
          last_login: '2024-01-16T09:15:00Z'
        }
      ];
      
      const mockSupabaseResponse = {
        data: mockUsers,
        error: null,
        count: 2
      };
      
      mockSupabase.from().select().order().limit().range.mockResolvedValue(mockSupabaseResponse);
      
      const request = testUtils.createMockRequest('GET', '/api/users');
      const response = await GET(request);
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.users).toHaveLength(2);
      expect(data.data.users[0].email).toBe('user1@example.com');
      expect(data.data.pagination.total).toBe(2);
      expect(mockApiMonitor.startCall).toHaveBeenCalledWith('GET', '/api/users');
      expect(mockApiMonitor.endCall).toHaveBeenCalledWith('call-id-123', 200);
    });

    it('应该支持用户筛选', async () => {
      const mockFilteredUsers = [
        {
          id: 'instructor-1',
          email: 'instructor@example.com',
          role: 'instructor',
          status: 'active'
        }
      ];
      
      const mockSupabaseResponse = {
        data: mockFilteredUsers,
        error: null,
        count: 1
      };
      
      mockSupabase.from().select().eq().order().limit().range.mockResolvedValue(mockSupabaseResponse);
      
      const request = testUtils.createMockRequest('GET', '/api/users?role=instructor&status=active');
      const response = await GET(request);
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(200);
      expect(data.data.users).toHaveLength(1);
      expect(data.data.users[0].role).toBe('instructor');
      expect(data.data.users[0].status).toBe('active');
    });

    it('应该支持用户搜索', async () => {
      const mockSearchResults = [
        {
          id: 'user-1',
          email: 'john.doe@example.com',
          username: 'johndoe',
          full_name: 'John Doe'
        }
      ];
      
      const mockSupabaseResponse = {
        data: mockSearchResults,
        error: null,
        count: 1
      };
      
      mockSupabase.from().select().order().limit().range.mockResolvedValue(mockSupabaseResponse);
      
      const request = testUtils.createMockRequest('GET', '/api/users?search=john');
      const response = await GET(request);
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(200);
      expect(data.data.users).toHaveLength(1);
      expect(data.data.users[0].username).toContain('john');
    });

    it('应该验证管理员权限', async () => {
      mockSecurity.validatePermissions.mockResolvedValue({ 
        allowed: false, 
        error: 'Admin access required' 
      });
      
      const request = testUtils.createMockRequest('GET', '/api/users');
      const response = await GET(request);
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Admin access required');
    });
  });

  describe('POST /api/users', () => {
    it('应该成功创建用户', async () => {
      const newUser = {
        email: 'newuser@example.com',
        username: 'newuser',
        password: 'SecurePassword123!',
        full_name: '新用户',
        role: 'student'
      };
      
      const mockCreatedUser = {
        id: 'new-user-123',
        email: 'newuser@example.com',
        username: 'newuser',
        full_name: '新用户',
        role: 'student',
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      mockSupabase.auth.signUp.mockResolvedValue({
        data: {
          user: { id: 'new-user-123', email: 'newuser@example.com' },
          session: null
        },
        error: null
      });
      
      mockSupabase.from().insert().select().single.mockResolvedValue({
        data: mockCreatedUser,
        error: null
      });
      
      const request = testUtils.createMockRequest('POST', '/api/users', newUser);
      const response = await POST(request);
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.user.id).toBe('new-user-123');
      expect(data.data.user.email).toBe('newuser@example.com');
      expect(data.data.user).not.toHaveProperty('password');
    });

    it('应该验证必需字段', async () => {
      const invalidUser = {
        username: 'incomplete',
        // 缺少 email, password 等必需字段
      };
      
      const request = testUtils.createMockRequest('POST', '/api/users', invalidUser);
      const response = await POST(request);
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Missing required field');
    });

    it('应该验证邮箱格式', async () => {
      const invalidUser = {
        email: 'invalid-email-format',
        username: 'testuser',
        password: 'Password123!',
        full_name: '测试用户'
      };
      
      const request = testUtils.createMockRequest('POST', '/api/users', invalidUser);
      const response = await POST(request);
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid email format');
    });

    it('应该验证密码强度', async () => {
      const weakPasswordUser = {
        email: 'test@example.com',
        username: 'testuser',
        password: '123', // 弱密码
        full_name: '测试用户'
      };
      
      const request = testUtils.createMockRequest('POST', '/api/users', weakPasswordUser);
      const response = await POST(request);
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Password does not meet requirements');
    });

    it('应该处理重复邮箱', async () => {
      const duplicateError = {
        message: 'User already registered'
      };
      
      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error: duplicateError
      });
      
      const duplicateUser = {
        email: 'existing@example.com',
        username: 'existinguser',
        password: 'Password123!',
        full_name: '重复用户'
      };
      
      const request = testUtils.createMockRequest('POST', '/api/users', duplicateUser);
      const response = await POST(request);
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(409);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Email already exists');
    });

    it('应该支持头像上传', async () => {
      const userWithAvatar = {
        email: 'avatar@example.com',
        username: 'avataruser',
        password: 'Password123!',
        full_name: '头像用户',
        avatar: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD...'
      };
      
      mockCloudStorage.uploadFile.mockResolvedValue({
        success: true,
        url: 'https://storage.example.com/avatars/avatar-123.jpg',
        key: 'avatars/avatar-123.jpg'
      });
      
      const mockCreatedUser = {
        id: 'avatar-user-123',
        email: 'avatar@example.com',
        username: 'avataruser',
        full_name: '头像用户',
        avatar_url: 'https://storage.example.com/avatars/avatar-123.jpg',
        role: 'student',
        status: 'active'
      };
      
      mockSupabase.auth.signUp.mockResolvedValue({
        data: {
          user: { id: 'avatar-user-123', email: 'avatar@example.com' },
          session: null
        },
        error: null
      });
      
      mockSupabase.from().insert().select().single.mockResolvedValue({
        data: mockCreatedUser,
        error: null
      });
      
      const request = testUtils.createMockRequest('POST', '/api/users', userWithAvatar);
      const response = await POST(request);
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.user.avatar_url).toBe('https://storage.example.com/avatars/avatar-123.jpg');
      expect(mockCloudStorage.uploadFile).toHaveBeenCalled();
    });
  });

  describe('POST /api/auth/register', () => {
    it('应该成功注册用户', async () => {
      const registerData = {
        email: 'register@example.com',
        password: 'SecurePassword123!',
        username: 'registeruser',
        full_name: '注册用户'
      };
      
      const mockRegisteredUser = {
        id: 'register-user-123',
        email: 'register@example.com',
        username: 'registeruser',
        full_name: '注册用户',
        role: 'student',
        status: 'active'
      };
      
      mockSupabase.auth.signUp.mockResolvedValue({
        data: {
          user: { id: 'register-user-123', email: 'register@example.com' },
          session: { access_token: 'access-token-123' }
        },
        error: null
      });
      
      mockSupabase.from().insert().select().single.mockResolvedValue({
        data: mockRegisteredUser,
        error: null
      });
      
      const request = testUtils.createMockRequest('POST', '/api/auth/register', registerData);
      const response = await RegisterUser(request);
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.user.email).toBe('register@example.com');
      expect(data.data.token).toBe('access-token-123');
    });

    it('应该支持人脸识别注册', async () => {
      const faceRegisterData = {
        email: 'face@example.com',
        password: 'SecurePassword123!',
        username: 'faceuser',
        full_name: '人脸用户',
        faceImage: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD...'
      };
      
      mockFaceRecognition.detectFace.mockResolvedValue({
        success: true,
        faces: [{
          confidence: 0.95,
          boundingBox: { x: 100, y: 100, width: 200, height: 200 }
        }],
        faceEncoding: 'face-encoding-data-123'
      });
      
      const mockRegisteredUser = {
        id: 'face-user-123',
        email: 'face@example.com',
        username: 'faceuser',
        full_name: '人脸用户',
        face_encoding: 'face-encoding-data-123',
        role: 'student',
        status: 'active'
      };
      
      mockSupabase.auth.signUp.mockResolvedValue({
        data: {
          user: { id: 'face-user-123', email: 'face@example.com' },
          session: { access_token: 'access-token-123' }
        },
        error: null
      });
      
      mockSupabase.from().insert().select().single.mockResolvedValue({
        data: mockRegisteredUser,
        error: null
      });
      
      const request = testUtils.createMockRequest('POST', '/api/auth/register', faceRegisterData);
      const response = await RegisterUser(request);
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.user.face_encoding).toBe('face-encoding-data-123');
      expect(mockFaceRecognition.detectFace).toHaveBeenCalled();
    });

    it('应该处理人脸检测失败', async () => {
      const faceRegisterData = {
        email: 'noface@example.com',
        password: 'SecurePassword123!',
        username: 'nofaceuser',
        full_name: '无人脸用户',
        faceImage: 'data:image/jpeg;base64,invalid-image-data'
      };
      
      mockFaceRecognition.detectFace.mockResolvedValue({
        success: false,
        error: 'No face detected in image'
      });
      
      const request = testUtils.createMockRequest('POST', '/api/auth/register', faceRegisterData);
      const response = await RegisterUser(request);
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('No face detected in image');
    });
  });

  describe('POST /api/auth/login', () => {
    it('应该成功登录用户', async () => {
      const loginData = {
        email: 'login@example.com',
        password: 'Password123!'
      };
      
      const mockUser = {
        id: 'login-user-123',
        email: 'login@example.com',
        username: 'loginuser',
        full_name: '登录用户',
        role: 'student',
        status: 'active'
      };
      
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: {
          user: { id: 'login-user-123', email: 'login@example.com' },
          session: { access_token: 'login-token-123' }
        },
        error: null
      });
      
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: mockUser,
        error: null
      });
      
      const request = testUtils.createMockRequest('POST', '/api/auth/login', loginData);
      const response = await LoginUser(request);
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.user.email).toBe('login@example.com');
      expect(data.data.token).toBe('login-token-123');
    });

    it('应该支持人脸识别登录', async () => {
      const faceLoginData = {
        faceImage: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD...'
      };
      
      mockFaceRecognition.detectFace.mockResolvedValue({
        success: true,
        faces: [{
          confidence: 0.95,
          boundingBox: { x: 100, y: 100, width: 200, height: 200 }
        }],
        faceEncoding: 'login-face-encoding'
      });
      
      const mockMatchedUser = {
        id: 'face-login-user-123',
        email: 'facelogin@example.com',
        username: 'faceloginuser',
        full_name: '人脸登录用户',
        face_encoding: 'stored-face-encoding',
        role: 'student',
        status: 'active'
      };
      
      mockFaceRecognition.compareFaces.mockResolvedValue({
        success: true,
        similarity: 0.92,
        isMatch: true
      });
      
      mockSupabase.from().select().mockResolvedValue({
        data: [mockMatchedUser],
        error: null
      });
      
      mockSecurity.generateToken.mockResolvedValue('face-login-token-123');
      
      const request = testUtils.createMockRequest('POST', '/api/auth/login', faceLoginData);
      const response = await LoginUser(request);
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.user.email).toBe('facelogin@example.com');
      expect(data.data.token).toBe('face-login-token-123');
      expect(mockFaceRecognition.compareFaces).toHaveBeenCalled();
    });

    it('应该处理无效凭据', async () => {
      const invalidLoginData = {
        email: 'invalid@example.com',
        password: 'wrongpassword'
      };
      
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials' }
      });
      
      const request = testUtils.createMockRequest('POST', '/api/auth/login', invalidLoginData);
      const response = await LoginUser(request);
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid credentials');
    });

    it('应该处理人脸识别不匹配', async () => {
      const faceLoginData = {
        faceImage: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD...'
      };
      
      mockFaceRecognition.detectFace.mockResolvedValue({
        success: true,
        faces: [{ confidence: 0.95 }],
        faceEncoding: 'unknown-face-encoding'
      });
      
      mockFaceRecognition.compareFaces.mockResolvedValue({
        success: true,
        similarity: 0.45,
        isMatch: false
      });
      
      mockSupabase.from().select().mockResolvedValue({
        data: [{
          id: 'user-123',
          face_encoding: 'different-face-encoding'
        }],
        error: null
      });
      
      const request = testUtils.createMockRequest('POST', '/api/auth/login', faceLoginData);
      const response = await LoginUser(request);
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Face not recognized');
    });

    it('应该处理账户被禁用', async () => {
      const loginData = {
        email: 'disabled@example.com',
        password: 'Password123!'
      };
      
      const mockDisabledUser = {
        id: 'disabled-user-123',
        email: 'disabled@example.com',
        status: 'disabled'
      };
      
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: {
          user: { id: 'disabled-user-123', email: 'disabled@example.com' },
          session: { access_token: 'token-123' }
        },
        error: null
      });
      
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: mockDisabledUser,
        error: null
      });
      
      const request = testUtils.createMockRequest('POST', '/api/auth/login', loginData);
      const response = await LoginUser(request);
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Account is disabled');
    });
  });

  describe('GET /api/users/[id]', () => {
    it('应该成功获取用户详情', async () => {
      const mockUser = {
        id: 'user-detail-123',
        email: 'detail@example.com',
        username: 'detailuser',
        full_name: '详情用户',
        role: 'student',
        status: 'active',
        avatar_url: 'https://example.com/avatar.jpg',
        bio: '用户简介',
        created_at: '2024-01-01T00:00:00Z',
        last_login: '2024-01-15T10:30:00Z',
        preferences: {
          language: 'zh-CN',
          theme: 'light',
          notifications: true
        }
      };
      
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: mockUser,
        error: null
      });
      
      const request = testUtils.createMockRequest('GET', '/api/users/user-detail-123');
      const response = await GetUserById(request, { params: { id: 'user-detail-123' } });
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.user.id).toBe('user-detail-123');
      expect(data.data.user.email).toBe('detail@example.com');
      expect(data.data.user.preferences.language).toBe('zh-CN');
    });

    it('应该处理用户不存在', async () => {
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'The result contains 0 rows' }
      });
      
      const request = testUtils.createMockRequest('GET', '/api/users/non-existent');
      const response = await GetUserById(request, { params: { id: 'non-existent' } });
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('User not found');
    });

    it('应该验证访问权限', async () => {
      mockSecurity.validatePermissions.mockResolvedValue({ 
        allowed: false, 
        error: 'Cannot access this user profile' 
      });
      
      const request = testUtils.createMockRequest('GET', '/api/users/other-user-123');
      const response = await GetUserById(request, { params: { id: 'other-user-123' } });
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Cannot access this user profile');
    });
  });

  describe('PUT /api/users/[id]', () => {
    it('应该成功更新用户信息', async () => {
      const updateData = {
        full_name: '更新的用户名',
        bio: '更新的用户简介',
        preferences: {
          language: 'en-US',
          theme: 'dark',
          notifications: false
        }
      };
      
      const mockUpdatedUser = {
        id: 'update-user-123',
        email: 'update@example.com',
        username: 'updateuser',
        full_name: '更新的用户名',
        bio: '更新的用户简介',
        preferences: updateData.preferences,
        role: 'student',
        status: 'active',
        updated_at: new Date().toISOString()
      };
      
      mockSupabase.from().update().eq().select().single.mockResolvedValue({
        data: mockUpdatedUser,
        error: null
      });
      
      const request = testUtils.createMockRequest('PUT', '/api/users/update-user-123', updateData);
      const response = await UpdateUser(request, { params: { id: 'update-user-123' } });
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.user.full_name).toBe('更新的用户名');
      expect(data.data.user.preferences.theme).toBe('dark');
    });

    it('应该支持头像更新', async () => {
      const updateData = {
        avatar: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD...'
      };
      
      mockCloudStorage.uploadFile.mockResolvedValue({
        success: true,
        url: 'https://storage.example.com/avatars/new-avatar-123.jpg',
        key: 'avatars/new-avatar-123.jpg'
      });
      
      const mockUpdatedUser = {
        id: 'avatar-update-123',
        email: 'avatar@example.com',
        avatar_url: 'https://storage.example.com/avatars/new-avatar-123.jpg',
        updated_at: new Date().toISOString()
      };
      
      mockSupabase.from().update().eq().select().single.mockResolvedValue({
        data: mockUpdatedUser,
        error: null
      });
      
      const request = testUtils.createMockRequest('PUT', '/api/users/avatar-update-123', updateData);
      const response = await UpdateUser(request, { params: { id: 'avatar-update-123' } });
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.user.avatar_url).toBe('https://storage.example.com/avatars/new-avatar-123.jpg');
      expect(mockCloudStorage.uploadFile).toHaveBeenCalled();
    });

    it('应该支持密码更新', async () => {
      const updateData = {
        currentPassword: 'OldPassword123!',
        newPassword: 'NewPassword456!'
      };
      
      mockSecurity.verifyPassword.mockResolvedValue(true);
      mockSecurity.hashPassword.mockResolvedValue('new-hashed-password');
      
      const mockUpdatedUser = {
        id: 'password-update-123',
        email: 'password@example.com',
        updated_at: new Date().toISOString()
      };
      
      mockSupabase.from().update().eq().select().single.mockResolvedValue({
        data: mockUpdatedUser,
        error: null
      });
      
      const request = testUtils.createMockRequest('PUT', '/api/users/password-update-123', updateData);
      const response = await UpdateUser(request, { params: { id: 'password-update-123' } });
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Password updated successfully');
      expect(mockSecurity.verifyPassword).toHaveBeenCalledWith('OldPassword123!', expect.any(String));
      expect(mockSecurity.hashPassword).toHaveBeenCalledWith('NewPassword456!');
    });

    it('应该验证当前密码', async () => {
      const updateData = {
        currentPassword: 'WrongPassword',
        newPassword: 'NewPassword456!'
      };
      
      mockSecurity.verifyPassword.mockResolvedValue(false);
      
      const request = testUtils.createMockRequest('PUT', '/api/users/password-update-123', updateData);
      const response = await UpdateUser(request, { params: { id: 'password-update-123' } });
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Current password is incorrect');
    });

    it('应该验证更新权限', async () => {
      mockSecurity.validatePermissions.mockResolvedValue({ 
        allowed: false, 
        error: 'Cannot update this user' 
      });
      
      const updateData = {
        full_name: '尝试更新的名字'
      };
      
      const request = testUtils.createMockRequest('PUT', '/api/users/other-user-123', updateData);
      const response = await UpdateUser(request, { params: { id: 'other-user-123' } });
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Cannot update this user');
    });
  });

  describe('DELETE /api/users/[id]', () => {
    it('应该成功删除用户', async () => {
      mockSupabase.from().delete().eq.mockResolvedValue({
        data: null,
        error: null
      });
      
      const request = testUtils.createMockRequest('DELETE', '/api/users/delete-user-123');
      const response = await DeleteUser(request, { params: { id: 'delete-user-123' } });
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('User deleted successfully');
    });

    it('应该验证删除权限', async () => {
      mockSecurity.validatePermissions.mockResolvedValue({ 
        allowed: false, 
        error: 'Cannot delete this user' 
      });
      
      const request = testUtils.createMockRequest('DELETE', '/api/users/protected-user-123');
      const response = await DeleteUser(request, { params: { id: 'protected-user-123' } });
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Cannot delete this user');
    });

    it('应该处理删除不存在的用户', async () => {
      mockSupabase.from().delete().eq.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'The result contains 0 rows' }
      });
      
      const request = testUtils.createMockRequest('DELETE', '/api/users/non-existent');
      const response = await DeleteUser(request, { params: { id: 'non-existent' } });
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('User not found');
    });

    it('应该清理用户相关数据', async () => {
      // 模拟清理头像文件
      mockCloudStorage.deleteFile.mockResolvedValue({
        success: true
      });
      
      // 模拟删除用户记录
      mockSupabase.from().delete().eq.mockResolvedValue({
        data: null,
        error: null
      });
      
      const request = testUtils.createMockRequest('DELETE', '/api/users/cleanup-user-123');
      const response = await DeleteUser(request, { params: { id: 'cleanup-user-123' } });
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('User and associated data deleted successfully');
    });
  });

  describe('错误处理和边界情况', () => {
    it('应该处理数据库连接错误', async () => {
      const connectionError = new Error('Database connection failed');
      mockSupabase.from().select().order().limit().range.mockRejectedValue(connectionError);
      
      const request = testUtils.createMockRequest('GET', '/api/users');
      const response = await GET(request);
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Database connection failed');
      expect(mockApiMonitor.recordError).toHaveBeenCalledWith('call-id-123', connectionError);
    });

    it('应该处理认证服务错误', async () => {
      const authError = new Error('Authentication service unavailable');
      mockSupabase.auth.signInWithPassword.mockRejectedValue(authError);
      
      const loginData = {
        email: 'test@example.com',
        password: 'Password123!'
      };
      
      const request = testUtils.createMockRequest('POST', '/api/auth/login', loginData);
      const response = await LoginUser(request);
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(503);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Authentication service unavailable');
    });

    it('应该处理文件上传错误', async () => {
      const uploadError = new Error('File upload failed');
      mockCloudStorage.uploadFile.mockRejectedValue(uploadError);
      
      const userWithAvatar = {
        email: 'upload@example.com',
        username: 'uploaduser',
        password: 'Password123!',
        avatar: 'data:image/jpeg;base64,invalid-data'
      };
      
      const request = testUtils.createMockRequest('POST', '/api/users', userWithAvatar);
      const response = await POST(request);
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toContain('File upload failed');
    });

    it('应该处理人脸识别服务错误', async () => {
      const faceError = new Error('Face recognition service unavailable');
      mockFaceRecognition.detectFace.mockRejectedValue(faceError);
      
      const faceLoginData = {
        faceImage: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD...'
      };
      
      const request = testUtils.createMockRequest('POST', '/api/auth/login', faceLoginData);
      const response = await LoginUser(request);
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(503);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Face recognition service unavailable');
    });
  });

  describe('性能测试', () => {
    it('应该高效处理用户列表查询', async () => {
      const largeUserList = Array.from({ length: 100 }, (_, i) => ({
        id: `user-${i}`,
        email: `user${i}@example.com`,
        username: `user${i}`,
        full_name: `用户 ${i}`,
        role: 'student',
        status: 'active'
      }));
      
      mockSupabase.from().select().order().limit().range.mockResolvedValue({
        data: largeUserList,
        error: null,
        count: 100
      });
      
      const startTime = Date.now();
      const request = testUtils.createMockRequest('GET', '/api/users?limit=100');
      const response = await GET(request);
      const endTime = Date.now();
      
      expect(response.status).toBe(200);
      expect(endTime - startTime).toBeLessThan(2000); // 应该在2秒内完成
    });

    it('应该高效处理并发登录请求', async () => {
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: {
          user: { id: 'concurrent-user', email: 'concurrent@example.com' },
          session: { access_token: 'concurrent-token' }
        },
        error: null
      });
      
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: {
          id: 'concurrent-user',
          email: 'concurrent@example.com',
          role: 'student',
          status: 'active'
        },
        error: null
      });
      
      const loginData = {
        email: 'concurrent@example.com',
        password: 'Password123!'
      };
      
      const promises = Array.from({ length: 10 }, () => {
        const request = testUtils.createMockRequest('POST', '/api/auth/login', loginData);
        return LoginUser(request);
      });
      
      const startTime = Date.now();
      const responses = await Promise.all(promises);
      const endTime = Date.now();
      
      expect(responses).toHaveLength(10);
      expect(responses.every(r => r.status === 200)).toBe(true);
      expect(endTime - startTime).toBeLessThan(5000); // 应该在5秒内完成
    });
  });
});