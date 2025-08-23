/**
 * 用户服务测试文件
 * 
 * 测试用户管理相关的所有功能，包括：
 * - 用户创建和注册
 * - 用户信息查询和更新
 * - 用户角色和权限管理
 * - 用户状态管理
 * - 用户偏好设置
 * - 用户数据验证
 * - 错误处理和边界情况
 * 
 * @author AI Assistant
 * @version 1.0.0
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import {
  userService,
  createUser,
  getUserById,
  getUserByEmail,
  updateUser,
  deleteUser,
  getUserProfile,
  updateUserProfile,
  getUserPreferences,
  updateUserPreferences,
  getUserRoles,
  assignUserRole,
  removeUserRole,
  getUserPermissions,
  activateUser,
  deactivateUser,
  getUserStats,
  searchUsers,
  getUsersByRole,
  validateUserData,
  checkEmailAvailability,
  checkUsernameAvailability,
  getUserLoginHistory,
  updateUserLastLogin,
  getUserSessions,
  revokeUserSessions,
  exportUserData,
  importUserData,
  getUserAnalytics,
  batchUpdateUsers,
  getUserNotificationSettings,
  updateUserNotificationSettings
} from '../../services/userService';
import { supabase } from '../../config/supabase';
import { redis } from '../../config/redis';
import { errorHandler } from '../../utils/errorHandler';
import { validator } from '../../utils/validator';
import { monitoringService } from '../../services/monitoringService';
import { notificationService } from '../../services/notificationService';
import { auditService } from '../../services/auditService';
import { envConfig } from '../../config/envConfig';

// Mock 依赖项
jest.mock('../../config/supabase');
jest.mock('../../config/redis');
jest.mock('../../utils/errorHandler');
jest.mock('../../utils/validator');
jest.mock('../../services/monitoringService');
jest.mock('../../services/notificationService');
jest.mock('../../services/auditService');
jest.mock('../../config/envConfig');

// 类型化的 Mock 对象
const mockSupabase = supabase as jest.Mocked<typeof supabase>;
const mockRedis = redis as jest.Mocked<typeof redis>;
const mockErrorHandler = errorHandler as jest.Mocked<typeof errorHandler>;
const mockValidator = validator as jest.Mocked<typeof validator>;
const mockMonitoringService = monitoringService as jest.Mocked<typeof monitoringService>;
const mockNotificationService = notificationService as jest.Mocked<typeof notificationService>;
const mockAuditService = auditService as jest.Mocked<typeof auditService>;
const mockEnvConfig = envConfig as jest.Mocked<typeof envConfig>;

/**
 * 用户服务测试套件
 */
describe('用户服务测试', () => {
  // 测试数据
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    username: 'testuser',
    firstName: 'Test',
    lastName: 'User',
    role: 'student',
    isActive: true,
    isVerified: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    lastLoginAt: '2024-01-01T00:00:00Z',
    profilePicture: null,
    bio: null,
    preferences: {
      language: 'zh-CN',
      timezone: 'Asia/Shanghai',
      theme: 'light'
    },
    notificationSettings: {
      email: true,
      push: true,
      sms: false
    }
  };

  const mockUserProfile = {
    userId: 'user-123',
    firstName: 'Test',
    lastName: 'User',
    bio: 'Test user bio',
    profilePicture: 'https://example.com/avatar.jpg',
    dateOfBirth: '1990-01-01',
    gender: 'other',
    location: 'Shanghai, China',
    website: 'https://example.com',
    socialLinks: {
      twitter: '@testuser',
      linkedin: 'testuser',
      github: 'testuser'
    },
    skills: ['JavaScript', 'TypeScript', 'React'],
    interests: ['Web Development', 'AI', 'Machine Learning']
  };

  const mockCreateUserData = {
    email: 'newuser@example.com',
    username: 'newuser',
    password: 'StrongPassword123!',
    firstName: 'New',
    lastName: 'User',
    role: 'student'
  };

  /**
   * 测试前置设置
   */
  beforeEach(() => {
    // 重置所有 Mock
    jest.clearAllMocks();

    // 设置默认的 Mock 返回值
    mockSupabase.from = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      neq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      contains: jest.fn().mockReturnThis(),
      ilike: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: mockUser,
        error: null
      }),
      maybeSingle: jest.fn().mockResolvedValue({
        data: mockUser,
        error: null
      })
    });

    // 设置 Redis Mock
    mockRedis.get = jest.fn().mockResolvedValue(null);
    mockRedis.set = jest.fn().mockResolvedValue('OK');
    mockRedis.del = jest.fn().mockResolvedValue(1);
    mockRedis.exists = jest.fn().mockResolvedValue(0);
    mockRedis.expire = jest.fn().mockResolvedValue(1);
    mockRedis.hget = jest.fn().mockResolvedValue(null);
    mockRedis.hset = jest.fn().mockResolvedValue(1);
    mockRedis.hdel = jest.fn().mockResolvedValue(1);
    mockRedis.sadd = jest.fn().mockResolvedValue(1);
    mockRedis.srem = jest.fn().mockResolvedValue(1);
    mockRedis.smembers = jest.fn().mockResolvedValue([]);

    // 设置验证器 Mock
    mockValidator.isEmail = jest.fn().mockReturnValue(true);
    mockValidator.isStrongPassword = jest.fn().mockReturnValue(true);
    mockValidator.isAlphanumeric = jest.fn().mockReturnValue(true);
    mockValidator.isLength = jest.fn().mockReturnValue(true);
    mockValidator.escape = jest.fn().mockImplementation((str) => str);
    mockValidator.normalizeEmail = jest.fn().mockImplementation((email) => email.toLowerCase());

    // 设置监控服务 Mock
    mockMonitoringService.recordEvent = jest.fn().mockResolvedValue(undefined);
    mockMonitoringService.recordMetric = jest.fn().mockResolvedValue(undefined);
    mockMonitoringService.startTimer = jest.fn().mockReturnValue({
      end: jest.fn().mockResolvedValue(100)
    });

    // 设置通知服务 Mock
    mockNotificationService.sendEmail = jest.fn().mockResolvedValue({
      success: true,
      messageId: 'msg-123'
    });

    // 设置审计服务 Mock
    mockAuditService.logUserAction = jest.fn().mockResolvedValue(undefined);

    // 设置错误处理器 Mock
    mockErrorHandler.handleError = jest.fn().mockResolvedValue(undefined);

    // 设置环境配置 Mock
    mockEnvConfig.app = {
      name: 'SkillUp Platform',
      version: '1.0.0',
      environment: 'test'
    };
    mockEnvConfig.database = {
      maxConnections: 10,
      connectionTimeout: 5000
    };
    mockEnvConfig.cache = {
      ttl: 3600,
      maxSize: 1000
    };
  });

  /**
   * 测试后置清理
   */
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('用户创建', () => {
    it('应该成功创建新用户', async () => {
      mockSupabase.from().insert.mockResolvedValue({
        data: [{ ...mockUser, ...mockCreateUserData, id: 'user-456' }],
        error: null
      });

      const result = await createUser(mockCreateUserData);

      expect(result.success).toBe(true);
      expect(result.user).toEqual(
        expect.objectContaining({
          email: 'newuser@example.com',
          username: 'newuser'
        })
      );
      expect(mockSupabase.from).toHaveBeenCalledWith('users');
      expect(mockSupabase.from().insert).toHaveBeenCalled();
    });

    it('应该验证邮箱格式', async () => {
      mockValidator.isEmail.mockReturnValue(false);

      const result = await createUser({
        ...mockCreateUserData,
        email: 'invalid-email'
      });

      expect(result.success).toBe(false);
      expect(result.error).toEqual(
        expect.objectContaining({
          type: 'VALIDATION_ERROR',
          message: 'Invalid email format'
        })
      );
    });

    it('应该验证用户名格式', async () => {
      mockValidator.isAlphanumeric.mockReturnValue(false);

      const result = await createUser({
        ...mockCreateUserData,
        username: 'invalid@username'
      });

      expect(result.success).toBe(false);
      expect(result.error).toEqual(
        expect.objectContaining({
          type: 'VALIDATION_ERROR',
          message: 'Username must be alphanumeric'
        })
      );
    });

    it('应该验证密码强度', async () => {
      mockValidator.isStrongPassword.mockReturnValue(false);

      const result = await createUser({
        ...mockCreateUserData,
        password: 'weak'
      });

      expect(result.success).toBe(false);
      expect(result.error).toEqual(
        expect.objectContaining({
          type: 'VALIDATION_ERROR',
          message: 'Password does not meet requirements'
        })
      );
    });

    it('应该检查邮箱唯一性', async () => {
      mockSupabase.from().maybeSingle.mockResolvedValue({
        data: mockUser,
        error: null
      });

      const result = await createUser(mockCreateUserData);

      expect(result.success).toBe(false);
      expect(result.error).toEqual(
        expect.objectContaining({
          type: 'EMAIL_EXISTS',
          message: 'Email already exists'
        })
      );
    });

    it('应该检查用户名唯一性', async () => {
      mockSupabase.from().maybeSingle
        .mockResolvedValueOnce({ data: null, error: null }) // 邮箱检查
        .mockResolvedValueOnce({ data: mockUser, error: null }); // 用户名检查

      const result = await createUser(mockCreateUserData);

      expect(result.success).toBe(false);
      expect(result.error).toEqual(
        expect.objectContaining({
          type: 'USERNAME_EXISTS',
          message: 'Username already exists'
        })
      );
    });

    it('应该创建用户配置文件', async () => {
      mockSupabase.from().insert.mockResolvedValue({
        data: [{ ...mockUser, ...mockCreateUserData, id: 'user-456' }],
        error: null
      });

      await createUser(mockCreateUserData);

      expect(mockSupabase.from).toHaveBeenCalledWith('user_profiles');
      expect(mockSupabase.from().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: expect.any(String),
          firstName: 'New',
          lastName: 'User'
        })
      );
    });

    it('应该设置默认用户偏好', async () => {
      mockSupabase.from().insert.mockResolvedValue({
        data: [{ ...mockUser, ...mockCreateUserData, id: 'user-456' }],
        error: null
      });

      await createUser(mockCreateUserData);

      expect(mockSupabase.from).toHaveBeenCalledWith('user_preferences');
      expect(mockSupabase.from().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: expect.any(String),
          language: 'zh-CN',
          timezone: 'Asia/Shanghai',
          theme: 'light'
        })
      );
    });

    it('应该记录用户创建事件', async () => {
      mockSupabase.from().insert.mockResolvedValue({
        data: [{ ...mockUser, ...mockCreateUserData, id: 'user-456' }],
        error: null
      });

      await createUser(mockCreateUserData);

      expect(mockAuditService.logUserAction).toHaveBeenCalledWith(
        'user-456',
        'user_created',
        expect.objectContaining({
          email: 'newuser@example.com',
          username: 'newuser'
        })
      );
    });

    it('应该发送欢迎邮件', async () => {
      mockSupabase.from().insert.mockResolvedValue({
        data: [{ ...mockUser, ...mockCreateUserData, id: 'user-456' }],
        error: null
      });

      await createUser(mockCreateUserData);

      expect(mockNotificationService.sendEmail).toHaveBeenCalledWith(
        'newuser@example.com',
        'welcome',
        expect.objectContaining({
          firstName: 'New',
          lastName: 'User'
        })
      );
    });
  });

  describe('用户查询', () => {
    it('应该根据ID获取用户', async () => {
      const result = await getUserById('user-123');

      expect(result.success).toBe(true);
      expect(result.user).toEqual(mockUser);
      expect(mockSupabase.from).toHaveBeenCalledWith('users');
      expect(mockSupabase.from().eq).toHaveBeenCalledWith('id', 'user-123');
    });

    it('应该根据邮箱获取用户', async () => {
      const result = await getUserByEmail('test@example.com');

      expect(result.success).toBe(true);
      expect(result.user).toEqual(mockUser);
      expect(mockSupabase.from).toHaveBeenCalledWith('users');
      expect(mockSupabase.from().eq).toHaveBeenCalledWith('email', 'test@example.com');
    });

    it('应该处理用户不存在的情况', async () => {
      mockSupabase.from().single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' }
      });

      const result = await getUserById('nonexistent-user');

      expect(result.success).toBe(false);
      expect(result.error).toEqual(
        expect.objectContaining({
          type: 'USER_NOT_FOUND',
          message: 'User not found'
        })
      );
    });

    it('应该使用缓存获取用户', async () => {
      mockRedis.get.mockResolvedValue(JSON.stringify(mockUser));

      const result = await getUserById('user-123');

      expect(result.success).toBe(true);
      expect(result.user).toEqual(mockUser);
      expect(mockRedis.get).toHaveBeenCalledWith('user:user-123');
      expect(mockSupabase.from().single).not.toHaveBeenCalled();
    });

    it('应该缓存用户数据', async () => {
      await getUserById('user-123');

      expect(mockRedis.set).toHaveBeenCalledWith(
        'user:user-123',
        JSON.stringify(mockUser),
        'EX',
        3600
      );
    });

    it('应该获取用户配置文件', async () => {
      mockSupabase.from().single.mockResolvedValue({
        data: mockUserProfile,
        error: null
      });

      const result = await getUserProfile('user-123');

      expect(result.success).toBe(true);
      expect(result.profile).toEqual(mockUserProfile);
      expect(mockSupabase.from).toHaveBeenCalledWith('user_profiles');
    });

    it('应该获取用户偏好设置', async () => {
      const mockPreferences = {
        userId: 'user-123',
        language: 'zh-CN',
        timezone: 'Asia/Shanghai',
        theme: 'dark',
        notifications: {
          email: true,
          push: false
        }
      };

      mockSupabase.from().single.mockResolvedValue({
        data: mockPreferences,
        error: null
      });

      const result = await getUserPreferences('user-123');

      expect(result.success).toBe(true);
      expect(result.preferences).toEqual(mockPreferences);
    });
  });

  describe('用户更新', () => {
    const updateData = {
      firstName: 'Updated',
      lastName: 'User',
      bio: 'Updated bio'
    };

    it('应该成功更新用户信息', async () => {
      mockSupabase.from().update.mockResolvedValue({
        data: [{ ...mockUser, ...updateData }],
        error: null
      });

      const result = await updateUser('user-123', updateData);

      expect(result.success).toBe(true);
      expect(result.user).toEqual(
        expect.objectContaining(updateData)
      );
      expect(mockSupabase.from().update).toHaveBeenCalledWith(updateData);
    });

    it('应该验证更新数据', async () => {
      mockValidator.isEmail.mockReturnValue(false);

      const result = await updateUser('user-123', {
        email: 'invalid-email'
      });

      expect(result.success).toBe(false);
      expect(result.error).toEqual(
        expect.objectContaining({
          type: 'VALIDATION_ERROR',
          message: 'Invalid email format'
        })
      );
    });

    it('应该更新用户配置文件', async () => {
      const profileData = {
        bio: 'New bio',
        website: 'https://newwebsite.com'
      };

      mockSupabase.from().update.mockResolvedValue({
        data: [{ ...mockUserProfile, ...profileData }],
        error: null
      });

      const result = await updateUserProfile('user-123', profileData);

      expect(result.success).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith('user_profiles');
      expect(mockSupabase.from().update).toHaveBeenCalledWith(profileData);
    });

    it('应该更新用户偏好设置', async () => {
      const preferencesData = {
        theme: 'dark',
        language: 'en-US'
      };

      mockSupabase.from().update.mockResolvedValue({
        data: [{ userId: 'user-123', ...preferencesData }],
        error: null
      });

      const result = await updateUserPreferences('user-123', preferencesData);

      expect(result.success).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith('user_preferences');
    });

    it('应该清除用户缓存', async () => {
      mockSupabase.from().update.mockResolvedValue({
        data: [{ ...mockUser, ...updateData }],
        error: null
      });

      await updateUser('user-123', updateData);

      expect(mockRedis.del).toHaveBeenCalledWith('user:user-123');
    });

    it('应该记录用户更新事件', async () => {
      mockSupabase.from().update.mockResolvedValue({
        data: [{ ...mockUser, ...updateData }],
        error: null
      });

      await updateUser('user-123', updateData);

      expect(mockAuditService.logUserAction).toHaveBeenCalledWith(
        'user-123',
        'user_updated',
        expect.objectContaining(updateData)
      );
    });

    it('应该更新最后登录时间', async () => {
      const loginTime = new Date().toISOString();
      
      mockSupabase.from().update.mockResolvedValue({
        data: [{ ...mockUser, lastLoginAt: loginTime }],
        error: null
      });

      const result = await updateUserLastLogin('user-123', loginTime);

      expect(result.success).toBe(true);
      expect(mockSupabase.from().update).toHaveBeenCalledWith({
        lastLoginAt: loginTime
      });
    });
  });

  describe('用户删除', () => {
    it('应该成功删除用户', async () => {
      mockSupabase.from().delete.mockResolvedValue({
        data: [mockUser],
        error: null
      });

      const result = await deleteUser('user-123');

      expect(result.success).toBe(true);
      expect(mockSupabase.from().delete).toHaveBeenCalled();
      expect(mockSupabase.from().eq).toHaveBeenCalledWith('id', 'user-123');
    });

    it('应该删除相关数据', async () => {
      mockSupabase.from().delete.mockResolvedValue({
        data: [mockUser],
        error: null
      });

      await deleteUser('user-123');

      // 验证删除用户配置文件
      expect(mockSupabase.from).toHaveBeenCalledWith('user_profiles');
      // 验证删除用户偏好
      expect(mockSupabase.from).toHaveBeenCalledWith('user_preferences');
      // 验证删除用户会话
      expect(mockSupabase.from).toHaveBeenCalledWith('user_sessions');
    });

    it('应该清除用户缓存', async () => {
      mockSupabase.from().delete.mockResolvedValue({
        data: [mockUser],
        error: null
      });

      await deleteUser('user-123');

      expect(mockRedis.del).toHaveBeenCalledWith('user:user-123');
    });

    it('应该记录用户删除事件', async () => {
      mockSupabase.from().delete.mockResolvedValue({
        data: [mockUser],
        error: null
      });

      await deleteUser('user-123');

      expect(mockAuditService.logUserAction).toHaveBeenCalledWith(
        'user-123',
        'user_deleted',
        expect.any(Object)
      );
    });

    it('应该处理用户不存在的情况', async () => {
      mockSupabase.from().delete.mockResolvedValue({
        data: [],
        error: null
      });

      const result = await deleteUser('nonexistent-user');

      expect(result.success).toBe(false);
      expect(result.error).toEqual(
        expect.objectContaining({
          type: 'USER_NOT_FOUND',
          message: 'User not found'
        })
      );
    });
  });

  describe('用户角色管理', () => {
    it('应该获取用户角色', async () => {
      const mockRoles = [
        { id: 'role-1', name: 'student', permissions: ['read'] },
        { id: 'role-2', name: 'instructor', permissions: ['read', 'write'] }
      ];

      mockSupabase.from().mockResolvedValue({
        data: mockRoles,
        error: null
      });

      const result = await getUserRoles('user-123');

      expect(result.success).toBe(true);
      expect(result.roles).toEqual(mockRoles);
    });

    it('应该分配用户角色', async () => {
      mockSupabase.from().insert.mockResolvedValue({
        data: [{ userId: 'user-123', roleId: 'role-1' }],
        error: null
      });

      const result = await assignUserRole('user-123', 'role-1');

      expect(result.success).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith('user_roles');
      expect(mockSupabase.from().insert).toHaveBeenCalledWith({
        userId: 'user-123',
        roleId: 'role-1'
      });
    });

    it('应该移除用户角色', async () => {
      mockSupabase.from().delete.mockResolvedValue({
        data: [{ userId: 'user-123', roleId: 'role-1' }],
        error: null
      });

      const result = await removeUserRole('user-123', 'role-1');

      expect(result.success).toBe(true);
      expect(mockSupabase.from().delete).toHaveBeenCalled();
    });

    it('应该获取用户权限', async () => {
      const mockPermissions = ['read', 'write', 'delete'];

      mockSupabase.from().mockResolvedValue({
        data: mockPermissions.map(p => ({ permission: p })),
        error: null
      });

      const result = await getUserPermissions('user-123');

      expect(result.success).toBe(true);
      expect(result.permissions).toEqual(mockPermissions);
    });

    it('应该缓存用户权限', async () => {
      const mockPermissions = ['read', 'write'];

      mockSupabase.from().mockResolvedValue({
        data: mockPermissions.map(p => ({ permission: p })),
        error: null
      });

      await getUserPermissions('user-123');

      expect(mockRedis.set).toHaveBeenCalledWith(
        'user_permissions:user-123',
        JSON.stringify(mockPermissions),
        'EX',
        1800
      );
    });
  });

  describe('用户状态管理', () => {
    it('应该激活用户', async () => {
      mockSupabase.from().update.mockResolvedValue({
        data: [{ ...mockUser, isActive: true }],
        error: null
      });

      const result = await activateUser('user-123');

      expect(result.success).toBe(true);
      expect(mockSupabase.from().update).toHaveBeenCalledWith({
        isActive: true,
        activatedAt: expect.any(String)
      });
    });

    it('应该停用用户', async () => {
      mockSupabase.from().update.mockResolvedValue({
        data: [{ ...mockUser, isActive: false }],
        error: null
      });

      const result = await deactivateUser('user-123');

      expect(result.success).toBe(true);
      expect(mockSupabase.from().update).toHaveBeenCalledWith({
        isActive: false,
        deactivatedAt: expect.any(String)
      });
    });

    it('应该撤销停用用户的会话', async () => {
      mockSupabase.from().update.mockResolvedValue({
        data: [{ ...mockUser, isActive: false }],
        error: null
      });

      await deactivateUser('user-123');

      expect(mockSupabase.from).toHaveBeenCalledWith('user_sessions');
      expect(mockSupabase.from().update).toHaveBeenCalledWith({
        isActive: false,
        revokedAt: expect.any(String)
      });
    });

    it('应该发送状态变更通知', async () => {
      mockSupabase.from().update.mockResolvedValue({
        data: [{ ...mockUser, isActive: false }],
        error: null
      });

      await deactivateUser('user-123');

      expect(mockNotificationService.sendEmail).toHaveBeenCalledWith(
        mockUser.email,
        'account_deactivated',
        expect.any(Object)
      );
    });
  });

  describe('用户搜索和查询', () => {
    it('应该搜索用户', async () => {
      const mockUsers = [mockUser];
      const searchQuery = 'test';

      mockSupabase.from().mockResolvedValue({
        data: mockUsers,
        error: null
      });

      const result = await searchUsers(searchQuery, {
        limit: 10,
        offset: 0
      });

      expect(result.success).toBe(true);
      expect(result.users).toEqual(mockUsers);
      expect(mockSupabase.from().ilike).toHaveBeenCalled();
    });

    it('应该根据角色获取用户', async () => {
      const mockUsers = [mockUser];

      mockSupabase.from().mockResolvedValue({
        data: mockUsers,
        error: null
      });

      const result = await getUsersByRole('student');

      expect(result.success).toBe(true);
      expect(result.users).toEqual(mockUsers);
      expect(mockSupabase.from().eq).toHaveBeenCalledWith('role', 'student');
    });

    it('应该获取用户统计信息', async () => {
      const mockStats = {
        totalUsers: 100,
        activeUsers: 85,
        newUsersThisMonth: 15,
        usersByRole: {
          student: 70,
          instructor: 25,
          admin: 5
        }
      };

      mockSupabase.from().mockResolvedValue({
        data: [{ count: 100 }],
        error: null
      });

      const result = await getUserStats();

      expect(result.success).toBe(true);
      expect(result.stats).toBeDefined();
    });

    it('应该获取用户登录历史', async () => {
      const mockHistory = [
        {
          id: 'login-1',
          userId: 'user-123',
          loginAt: '2024-01-01T10:00:00Z',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0...'
        }
      ];

      mockSupabase.from().mockResolvedValue({
        data: mockHistory,
        error: null
      });

      const result = await getUserLoginHistory('user-123');

      expect(result.success).toBe(true);
      expect(result.history).toEqual(mockHistory);
    });

    it('应该获取用户会话', async () => {
      const mockSessions = [
        {
          id: 'session-1',
          userId: 'user-123',
          token: 'jwt.token.here',
          isActive: true,
          createdAt: '2024-01-01T10:00:00Z',
          expiresAt: '2024-01-02T10:00:00Z'
        }
      ];

      mockSupabase.from().mockResolvedValue({
        data: mockSessions,
        error: null
      });

      const result = await getUserSessions('user-123');

      expect(result.success).toBe(true);
      expect(result.sessions).toEqual(mockSessions);
    });
  });

  describe('数据验证', () => {
    it('应该验证用户数据', async () => {
      const userData = {
        email: 'test@example.com',
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User'
      };

      const result = await validateUserData(userData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('应该检测无效数据', async () => {
      mockValidator.isEmail.mockReturnValue(false);
      mockValidator.isAlphanumeric.mockReturnValue(false);

      const userData = {
        email: 'invalid-email',
        username: 'invalid@username',
        firstName: '',
        lastName: ''
      };

      const result = await validateUserData(userData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid email format');
      expect(result.errors).toContain('Username must be alphanumeric');
      expect(result.errors).toContain('First name is required');
      expect(result.errors).toContain('Last name is required');
    });

    it('应该检查邮箱可用性', async () => {
      mockSupabase.from().maybeSingle.mockResolvedValue({
        data: null,
        error: null
      });

      const result = await checkEmailAvailability('new@example.com');

      expect(result.available).toBe(true);
    });

    it('应该检查用户名可用性', async () => {
      mockSupabase.from().maybeSingle.mockResolvedValue({
        data: mockUser,
        error: null
      });

      const result = await checkUsernameAvailability('existinguser');

      expect(result.available).toBe(false);
    });
  });

  describe('批量操作', () => {
    it('应该批量更新用户', async () => {
      const updates = [
        { id: 'user-1', isActive: false },
        { id: 'user-2', isActive: false }
      ];

      mockSupabase.from().update.mockResolvedValue({
        data: updates,
        error: null
      });

      const result = await batchUpdateUsers(updates);

      expect(result.success).toBe(true);
      expect(result.updatedCount).toBe(2);
    });

    it('应该撤销用户会话', async () => {
      mockSupabase.from().update.mockResolvedValue({
        data: [{ id: 'session-1' }, { id: 'session-2' }],
        error: null
      });

      const result = await revokeUserSessions('user-123');

      expect(result.success).toBe(true);
      expect(mockSupabase.from().update).toHaveBeenCalledWith({
        isActive: false,
        revokedAt: expect.any(String)
      });
    });

    it('应该导出用户数据', async () => {
      const mockExportData = {
        user: mockUser,
        profile: mockUserProfile,
        preferences: mockUser.preferences,
        loginHistory: [],
        sessions: []
      };

      mockSupabase.from().single.mockResolvedValue({
        data: mockUser,
        error: null
      });

      const result = await exportUserData('user-123');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(
        expect.objectContaining({
          user: expect.any(Object),
          profile: expect.any(Object)
        })
      );
    });

    it('应该导入用户数据', async () => {
      const importData = {
        user: mockCreateUserData,
        profile: mockUserProfile,
        preferences: mockUser.preferences
      };

      mockSupabase.from().insert.mockResolvedValue({
        data: [{ ...mockUser, ...mockCreateUserData }],
        error: null
      });

      const result = await importUserData(importData);

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
    });
  });

  describe('通知设置', () => {
    it('应该获取用户通知设置', async () => {
      const mockSettings = {
        userId: 'user-123',
        email: true,
        push: true,
        sms: false,
        courseUpdates: true,
        assignments: true,
        announcements: false
      };

      mockSupabase.from().single.mockResolvedValue({
        data: mockSettings,
        error: null
      });

      const result = await getUserNotificationSettings('user-123');

      expect(result.success).toBe(true);
      expect(result.settings).toEqual(mockSettings);
    });

    it('应该更新用户通知设置', async () => {
      const settingsUpdate = {
        email: false,
        push: true,
        courseUpdates: false
      };

      mockSupabase.from().update.mockResolvedValue({
        data: [{ userId: 'user-123', ...settingsUpdate }],
        error: null
      });

      const result = await updateUserNotificationSettings('user-123', settingsUpdate);

      expect(result.success).toBe(true);
      expect(mockSupabase.from().update).toHaveBeenCalledWith(settingsUpdate);
    });
  });

  describe('用户分析', () => {
    it('应该获取用户分析数据', async () => {
      const mockAnalytics = {
        userId: 'user-123',
        totalLoginDays: 30,
        averageSessionDuration: 45,
        coursesCompleted: 5,
        coursesInProgress: 2,
        totalLearningTime: 120,
        skillsAcquired: 15,
        certificatesEarned: 3,
        activityTrend: {
          daily: [1, 2, 3, 2, 4, 3, 5],
          weekly: [15, 18, 22, 20],
          monthly: [80, 85, 90]
        }
      };

      mockSupabase.from().single.mockResolvedValue({
        data: mockAnalytics,
        error: null
      });

      const result = await getUserAnalytics('user-123');

      expect(result.success).toBe(true);
      expect(result.analytics).toEqual(mockAnalytics);
    });

    it('应该缓存分析数据', async () => {
      const mockAnalytics = {
        userId: 'user-123',
        totalLoginDays: 30
      };

      mockSupabase.from().single.mockResolvedValue({
        data: mockAnalytics,
        error: null
      });

      await getUserAnalytics('user-123');

      expect(mockRedis.set).toHaveBeenCalledWith(
        'user_analytics:user-123',
        JSON.stringify(mockAnalytics),
        'EX',
        7200
      );
    });
  });

  describe('错误处理', () => {
    it('应该处理数据库连接错误', async () => {
      mockSupabase.from().single.mockRejectedValue(
        new Error('Database connection failed')
      );

      const result = await getUserById('user-123');

      expect(result.success).toBe(false);
      expect(result.error).toEqual(
        expect.objectContaining({
          type: 'DATABASE_ERROR',
          message: 'Database connection failed'
        })
      );
      expect(mockErrorHandler.handleError).toHaveBeenCalled();
    });

    it('应该处理Redis连接错误', async () => {
      mockRedis.get.mockRejectedValue(new Error('Redis connection failed'));

      const result = await getUserById('user-123');

      expect(result.success).toBe(true); // 应该降级到数据库查询
      expect(mockSupabase.from().single).toHaveBeenCalled();
    });

    it('应该处理验证错误', async () => {
      mockValidator.isEmail.mockImplementation(() => {
        throw new Error('Validation service unavailable');
      });

      const result = await createUser(mockCreateUserData);

      expect(result.success).toBe(false);
      expect(result.error).toEqual(
        expect.objectContaining({
          type: 'VALIDATION_ERROR',
          message: 'Validation service unavailable'
        })
      );
    });

    it('应该实现重试机制', async () => {
      mockSupabase.from().single
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValue({
          data: mockUser,
          error: null
        });

      const result = await getUserById('user-123');

      expect(result.success).toBe(true);
      expect(mockSupabase.from().single).toHaveBeenCalledTimes(3);
    });

    it('应该处理通知服务错误', async () => {
      mockNotificationService.sendEmail.mockRejectedValue(
        new Error('Email service unavailable')
      );

      mockSupabase.from().insert.mockResolvedValue({
        data: [{ ...mockUser, ...mockCreateUserData }],
        error: null
      });

      const result = await createUser(mockCreateUserData);

      expect(result.success).toBe(true); // 用户创建成功，邮件发送失败不影响主流程
      expect(mockErrorHandler.handleError).toHaveBeenCalled();
    });
  });

  describe('性能测试', () => {
    it('应该高效处理大量用户查询', async () => {
      const timer = mockMonitoringService.startTimer();

      const promises = Array.from({ length: 100 }, (_, i) => 
        getUserById(`user-${i}`)
      );

      await Promise.all(promises);

      expect(timer.end).toHaveBeenCalled();
    });

    it('应该优化缓存性能', async () => {
      // 第一次查询，从数据库加载
      await getUserById('user-123');

      // 第二次查询，使用缓存
      mockRedis.get.mockResolvedValue(JSON.stringify(mockUser));
      await getUserById('user-123');

      expect(mockSupabase.from().single).toHaveBeenCalledTimes(1);
    });

    it('应该批量处理用户更新', async () => {
      const updates = Array.from({ length: 50 }, (_, i) => ({
        id: `user-${i}`,
        isActive: false
      }));

      await batchUpdateUsers(updates);

      expect(mockSupabase.from().update).toHaveBeenCalled();
    });
  });
});

/**
 * 用户服务便捷函数导出测试
 */
describe('用户服务便捷函数', () => {
  it('应该导出所有必要的函数', () => {
    expect(typeof createUser).toBe('function');
    expect(typeof getUserById).toBe('function');
    expect(typeof getUserByEmail).toBe('function');
    expect(typeof updateUser).toBe('function');
    expect(typeof deleteUser).toBe('function');
    expect(typeof getUserProfile).toBe('function');
    expect(typeof updateUserProfile).toBe('function');
    expect(typeof getUserPreferences).toBe('function');
    expect(typeof updateUserPreferences).toBe('function');
    expect(typeof getUserRoles).toBe('function');
    expect(typeof assignUserRole).toBe('function');
    expect(typeof removeUserRole).toBe('function');
    expect(typeof getUserPermissions).toBe('function');
    expect(typeof activateUser).toBe('function');
    expect(typeof deactivateUser).toBe('function');
    expect(typeof getUserStats).toBe('function');
    expect(typeof searchUsers).toBe('function');
    expect(typeof getUsersByRole).toBe('function');
    expect(typeof validateUserData).toBe('function');
    expect(typeof checkEmailAvailability).toBe('function');
    expect(typeof checkUsernameAvailability).toBe('function');
    expect(typeof getUserLoginHistory).toBe('function');
    expect(typeof updateUserLastLogin).toBe('function');
    expect(typeof getUserSessions).toBe('function');
    expect(typeof revokeUserSessions).toBe('function');
    expect(typeof exportUserData).toBe('function');
    expect(typeof importUserData).toBe('function');
    expect(typeof getUserAnalytics).toBe('function');
    expect(typeof batchUpdateUsers).toBe('function');
    expect(typeof getUserNotificationSettings).toBe('function');
    expect(typeof updateUserNotificationSettings).toBe('function');
  });

  it('应该导出用户服务实例', () => {
    expect(userService).toBeDefined();
    expect(typeof userService.initialize).toBe('function');
    expect(typeof userService.createUser).toBe('function');
    expect(typeof userService.getUserById).toBe('function');
    expect(typeof userService.updateUser).toBe('function');
    expect(typeof userService.deleteUser).toBe('function');
  });
});