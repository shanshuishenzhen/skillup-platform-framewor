/**
 * 用户API集成测试
 * 
 * 测试用户相关的API端点，包括：
 * - 用户信息管理
 * - 用户资料更新
 * - 用户偏好设置
 * - 用户学习记录
 * - 用户成就系统
 * - 用户社交功能
 * - 用户权限管理
 * - 用户数据导出
 */

import request from 'supertest';
import { app } from '../../app';
import { supabaseClient } from '../../utils/supabase';
import { cacheService } from '../../services/cacheService';
import { auditService } from '../../services/auditService';
import { analyticsService } from '../../services/analyticsService';
import { learningProgressService } from '../../services/learningProgressService';
import { emailService } from '../../services/emailService';
import { smsService } from '../../services/smsService';
import { baiduFaceService } from '../../services/baiduFaceService';
import { envConfig } from '../../config/envConfig';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

// Mock 依赖
jest.mock('../../utils/supabase');
jest.mock('../../services/cacheService');
jest.mock('../../services/auditService');
jest.mock('../../services/analyticsService');
jest.mock('../../services/learningProgressService');
jest.mock('../../services/emailService');
jest.mock('../../services/smsService');
jest.mock('../../services/baiduFaceService');
jest.mock('../../config/envConfig');
jest.mock('jsonwebtoken');
jest.mock('bcryptjs');
jest.mock('crypto');



// 类型定义
interface User {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  displayName: string;
  avatar: string;
  bio: string;
  phone: string;
  dateOfBirth: Date;
  gender: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  location: {
    country: string;
    city: string;
    timezone: string;
  };
  preferences: {
    language: string;
    theme: 'light' | 'dark' | 'auto';
    notifications: {
      email: boolean;
      sms: boolean;
      push: boolean;
      marketing: boolean;
    };
    privacy: {
      profileVisibility: 'public' | 'friends' | 'private';
      showProgress: boolean;
      showAchievements: boolean;
    };
  };
  role: 'student' | 'instructor' | 'admin' | 'moderator';
  status: 'active' | 'inactive' | 'suspended' | 'pending_verification';
  emailVerified: boolean;
  phoneVerified: boolean;
  twoFactorEnabled: boolean;
  lastLoginAt: Date;
  lastActiveAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface UserProfile {
  id: string;
  userId: string;
  education: {
    level: string;
    institution: string;
    major: string;
    graduationYear: number;
  }[];
  experience: {
    company: string;
    position: string;
    startDate: Date;
    endDate?: Date;
    description: string;
  }[];
  skills: {
    name: string;
    level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
    verified: boolean;
  }[];
  interests: string[];
  goals: string[];
  socialLinks: {
    platform: string;
    url: string;
  }[];
  certifications: {
    name: string;
    issuer: string;
    issueDate: Date;
    expiryDate?: Date;
    credentialId: string;
    url?: string;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

interface UserAchievement {
  id: string;
  userId: string;
  achievementId: string;
  unlockedAt: Date;
  progress: number;
  metadata: Record<string, unknown>;
}

interface UserLearningStats {
  totalCourses: number;
  completedCourses: number;
  inProgressCourses: number;
  totalLearningTime: number; // 分钟
  streakDays: number;
  longestStreak: number;
  averageSessionTime: number;
  skillsLearned: number;
  certificatesEarned: number;
  pointsEarned: number;
  rank: number;
  level: number;
}

interface UserActivity {
  id: string;
  userId: string;
  type: 'course_start' | 'lesson_complete' | 'quiz_pass' | 'achievement_unlock' | 'certificate_earn';
  entityType: 'course' | 'lesson' | 'quiz' | 'achievement' | 'certificate';
  entityId: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

interface UserFollowing {
  id: string;
  followerId: string;
  followingId: string;
  createdAt: Date;
}

// Mock 实例
const mockSupabaseClient = {
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
  ilike: jest.fn().mockReturnThis(),
  contains: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  offset: jest.fn().mockReturnThis(),
  range: jest.fn().mockReturnThis(),
  single: jest.fn(),
  then: jest.fn(),
  count: jest.fn().mockReturnThis(),
  rpc: jest.fn(),
  storage: {
    from: jest.fn().mockReturnThis(),
    upload: jest.fn(),
    download: jest.fn(),
    remove: jest.fn(),
    getPublicUrl: jest.fn()
  }
};

const mockCacheService = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  mget: jest.fn(),
  mset: jest.fn(),
  expire: jest.fn(),
  zadd: jest.fn(),
  zrange: jest.fn(),
  zrem: jest.fn(),
  incr: jest.fn(),
  decr: jest.fn()
};

const mockAuditService = {
  log: jest.fn(),
  logUserActivity: jest.fn()
};

const mockAnalyticsService = {
  track: jest.fn(),
  increment: jest.fn(),
  gauge: jest.fn()
};

const mockLearningProgressService = {
  getUserStats: jest.fn(),
  getUserAchievements: jest.fn(),
  getUserActivities: jest.fn(),
  calculateUserLevel: jest.fn()
};

const mockEmailService = {
  sendEmail: jest.fn(),
  sendVerificationEmail: jest.fn(),
  sendPasswordResetEmail: jest.fn()
};

const mockSmsService = {
  sendSms: jest.fn(),
  sendVerificationCode: jest.fn()
};

const mockBaiduFaceService = {
  detectFace: jest.fn(),
  compareFaces: jest.fn(),
  addUser: jest.fn(),
  updateUser: jest.fn(),
  deleteUser: jest.fn()
};

const mockEnvConfig = {
  users: {
    maxAvatarSize: 5 * 1024 * 1024, // 5MB
    allowedAvatarFormats: ['jpg', 'jpeg', 'png', 'webp'],
    enableFaceVerification: true,
    enableSocialLogin: true,
    defaultCacheExpiry: 1800, // 30分钟
    maxBioLength: 500,
    maxUsernameLength: 50,
    minPasswordLength: 8
  },
  pagination: {
    defaultLimit: 20,
    maxLimit: 100
  }
};

const mockJwt = {
  verify: jest.fn(),
  sign: jest.fn()
};

const mockBcrypt = {
  hash: jest.fn(),
  compare: jest.fn()
};

const mockCrypto = {
  randomBytes: jest.fn(),
  createHash: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  digest: jest.fn()
};

// 设置 Mock
jest.mocked(supabaseClient).mockReturnValue(mockSupabaseClient);
jest.mocked(cacheService).mockReturnValue(mockCacheService);
jest.mocked(auditService).mockReturnValue(mockAuditService);
jest.mocked(analyticsService).mockReturnValue(mockAnalyticsService);
jest.mocked(learningProgressService).mockReturnValue(mockLearningProgressService);
jest.mocked(emailService).mockReturnValue(mockEmailService);
jest.mocked(smsService).mockReturnValue(mockSmsService);
jest.mocked(baiduFaceService).mockReturnValue(mockBaiduFaceService);
jest.mocked(envConfig).mockReturnValue(mockEnvConfig);
jest.mocked(jwt).mockReturnValue(mockJwt);
jest.mocked(bcrypt).mockReturnValue(mockBcrypt);
jest.mocked(crypto).mockReturnValue(mockCrypto);

// 测试数据
const testUser: User = {
  id: 'user-123456',
  email: 'test@skillup.com',
  username: 'testuser',
  firstName: '张',
  lastName: '三',
  displayName: '张三',
  avatar: 'https://example.com/avatar.jpg',
  bio: '热爱学习的程序员，专注于前端开发技术。',
  phone: '+86-13800138000',
  dateOfBirth: new Date('1990-01-01'),
  gender: 'male',
  location: {
    country: 'China',
    city: 'Beijing',
    timezone: 'Asia/Shanghai'
  },
  preferences: {
    language: 'zh-CN',
    theme: 'light',
    notifications: {
      email: true,
      sms: false,
      push: true,
      marketing: false
    },
    privacy: {
      profileVisibility: 'public',
      showProgress: true,
      showAchievements: true
    }
  },
  role: 'student',
  status: 'active',
  emailVerified: true,
  phoneVerified: false,
  twoFactorEnabled: false,
  lastLoginAt: new Date(),
  lastActiveAt: new Date(),
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date()
};

const testProfile: UserProfile = {
  id: 'profile-123',
  userId: 'user-123456',
  education: [
    {
      level: '本科',
      institution: '北京大学',
      major: '计算机科学与技术',
      graduationYear: 2012
    }
  ],
  experience: [
    {
      company: '腾讯科技',
      position: '前端开发工程师',
      startDate: new Date('2020-01-01'),
      endDate: new Date('2023-12-31'),
      description: '负责微信小程序前端开发'
    }
  ],
  skills: [
    {
      name: 'JavaScript',
      level: 'advanced',
      verified: true
    },
    {
      name: 'React',
      level: 'intermediate',
      verified: false
    }
  ],
  interests: ['前端开发', '人工智能', '区块链'],
  goals: ['成为全栈开发者', '学习机器学习'],
  socialLinks: [
    {
      platform: 'github',
      url: 'https://github.com/testuser'
    }
  ],
  certifications: [
    {
      name: 'AWS Certified Developer',
      issuer: 'Amazon Web Services',
      issueDate: new Date('2023-06-01'),
      credentialId: 'AWS-123456',
      url: 'https://aws.amazon.com/verification'
    }
  ],
  createdAt: new Date(),
  updatedAt: new Date()
};

const testLearningStats: UserLearningStats = {
  totalCourses: 15,
  completedCourses: 8,
  inProgressCourses: 7,
  totalLearningTime: 2400, // 40小时
  streakDays: 15,
  longestStreak: 30,
  averageSessionTime: 45,
  skillsLearned: 12,
  certificatesEarned: 3,
  pointsEarned: 8500,
  rank: 156,
  level: 8
};

// 认证中间件模拟
const mockAuthUser = {
  id: 'user-123456',
  email: 'test@skillup.com',
  role: 'student'
};

const mockInstructorUser = {
  id: 'user-instructor',
  email: 'instructor@skillup.com',
  role: 'instructor'
};

const mockAdminUser = {
  id: 'user-admin',
  email: 'admin@skillup.com',
  role: 'admin'
};

describe('Users API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // 设置默认的mock返回值
    mockCacheService.get.mockResolvedValue(null);
    mockCacheService.set.mockResolvedValue(true);
    mockCacheService.mget.mockResolvedValue([]);
    mockCacheService.mset.mockResolvedValue(true);
    
    mockAuditService.log.mockResolvedValue(true);
    mockAnalyticsService.track.mockResolvedValue(true);
    
    mockLearningProgressService.getUserStats.mockResolvedValue(testLearningStats);
    mockLearningProgressService.getUserAchievements.mockResolvedValue([]);
    mockLearningProgressService.getUserActivities.mockResolvedValue([]);
    mockLearningProgressService.calculateUserLevel.mockResolvedValue(8);
    
    mockEmailService.sendEmail.mockResolvedValue(true);
    mockSmsService.sendSms.mockResolvedValue(true);
    
    mockBaiduFaceService.detectFace.mockResolvedValue({
      faces: [{ confidence: 0.95 }]
    });
    
    // 设置JWT验证
    mockJwt.verify.mockReturnValue(mockAuthUser);
    mockJwt.sign.mockReturnValue('jwt-token-123');
    
    // 设置密码加密
    mockBcrypt.hash.mockResolvedValue('hashed-password');
    mockBcrypt.compare.mockResolvedValue(true);
    
    // 设置随机数生成
    mockCrypto.randomBytes.mockReturnValue(Buffer.from('random-bytes'));
    mockCrypto.digest.mockReturnValue('random-hash');
    
    // 设置Supabase默认返回值
    mockSupabaseClient.single.mockResolvedValue({
      data: testUser,
      error: null
    });
    
    mockSupabaseClient.then.mockResolvedValue({
      data: [testUser],
      error: null,
      count: 1
    });
    
    mockSupabaseClient.count.mockResolvedValue({
      data: null,
      error: null,
      count: 1
    });
    
    mockSupabaseClient.storage.getPublicUrl.mockReturnValue({
      data: { publicUrl: 'https://example.com/avatar.jpg' }
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  /**
   * 用户信息获取测试
   */
  describe('GET /api/users/me', () => {
    it('应该获取当前用户信息', async () => {
      const response = await request(app)
        .get('/api/users/me')
        .set('Authorization', 'Bearer jwt-token-123')
        .expect(200);
      
      expect(response.body).toEqual(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            id: 'user-123456',
            email: 'test@skillup.com',
            username: 'testuser',
            displayName: '张三',
            avatar: 'https://example.com/avatar.jpg',
            role: 'student',
            status: 'active'
          })
        })
      );
      
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('id', 'user-123456');
      expect(mockAnalyticsService.track).toHaveBeenCalledWith(
        'user.profile.view',
        expect.objectContaining({
          userId: 'user-123456'
        })
      );
    });

    it('应该处理未认证请求', async () => {
      const response = await request(app)
        .get('/api/users/me')
        .expect(401);
      
      expect(response.body).toEqual(
        expect.objectContaining({
          success: false,
          message: '未授权访问'
        })
      );
    });

    it('应该使用缓存', async () => {
      const cacheKey = 'user_profile_user-123456';
      mockCacheService.get.mockResolvedValue(JSON.stringify(testUser));
      
      const response = await request(app)
        .get('/api/users/me')
        .set('Authorization', 'Bearer jwt-token-123')
        .expect(200);
      
      expect(mockCacheService.get).toHaveBeenCalledWith(cacheKey);
      expect(response.body.data.id).toBe('user-123456');
    });
  });

  /**
   * 用户信息更新测试
   */
  describe('PUT /api/users/me', () => {
    it('应该更新用户基本信息', async () => {
      const updateData = {
        firstName: '李',
        lastName: '四',
        bio: '更新的个人简介',
        location: {
          country: 'China',
          city: 'Shanghai',
          timezone: 'Asia/Shanghai'
        }
      };
      
      const response = await request(app)
        .put('/api/users/me')
        .set('Authorization', 'Bearer jwt-token-123')
        .send(updateData)
        .expect(200);
      
      expect(response.body).toEqual(
        expect.objectContaining({
          success: true,
          message: '用户信息更新成功'
        })
      );
      
      expect(mockSupabaseClient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          first_name: '李',
          last_name: '四',
          bio: '更新的个人简介',
          location: updateData.location,
          updated_at: expect.any(String)
        })
      );
      
      expect(mockCacheService.del).toHaveBeenCalledWith(
        'user_profile_user-123456'
      );
    });

    it('应该验证输入数据', async () => {
      const response = await request(app)
        .put('/api/users/me')
        .set('Authorization', 'Bearer jwt-token-123')
        .send({
          email: 'invalid-email', // 无效邮箱
          bio: 'a'.repeat(600), // 超长简介
          username: 'ab' // 用户名太短
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
              field: 'bio',
              message: '个人简介不能超过500个字符'
            }),
            expect.objectContaining({
              field: 'username',
              message: '用户名长度必须在3-50个字符之间'
            })
          ])
        })
      );
    });

    it('应该检查用户名唯一性', async () => {
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { id: 'other-user' },
        error: null
      });
      
      const response = await request(app)
        .put('/api/users/me')
        .set('Authorization', 'Bearer jwt-token-123')
        .send({
          username: 'existinguser'
        })
        .expect(409);
      
      expect(response.body).toEqual(
        expect.objectContaining({
          success: false,
          message: '用户名已被使用'
        })
      );
    });
  });

  /**
   * 用户偏好设置测试
   */
  describe('PUT /api/users/me/preferences', () => {
    it('应该更新用户偏好设置', async () => {
      const preferences = {
        language: 'en-US',
        theme: 'dark',
        notifications: {
          email: false,
          sms: true,
          push: true,
          marketing: false
        },
        privacy: {
          profileVisibility: 'friends',
          showProgress: false,
          showAchievements: true
        }
      };
      
      const response = await request(app)
        .put('/api/users/me/preferences')
        .set('Authorization', 'Bearer jwt-token-123')
        .send(preferences)
        .expect(200);
      
      expect(response.body).toEqual(
        expect.objectContaining({
          success: true,
          message: '偏好设置更新成功'
        })
      );
      
      expect(mockSupabaseClient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          preferences,
          updated_at: expect.any(String)
        })
      );
    });

    it('应该验证偏好设置格式', async () => {
      const response = await request(app)
        .put('/api/users/me/preferences')
        .set('Authorization', 'Bearer jwt-token-123')
        .send({
          theme: 'invalid-theme',
          language: 'invalid-lang'
        })
        .expect(400);
      
      expect(response.body.errors).toContainEqual(
        expect.objectContaining({
          field: 'theme',
          message: '主题必须是 light、dark 或 auto'
        })
      );
    });
  });

  /**
   * 头像上传测试
   */
  describe('POST /api/users/me/avatar', () => {
    it('应该上传用户头像', async () => {
      mockSupabaseClient.storage.upload.mockResolvedValue({
        data: { path: 'avatars/user-123456.jpg' },
        error: null
      });
      
      const response = await request(app)
        .post('/api/users/me/avatar')
        .set('Authorization', 'Bearer jwt-token-123')
        .attach('avatar', Buffer.from('fake-image-data'), 'avatar.jpg')
        .expect(200);
      
      expect(response.body).toEqual(
        expect.objectContaining({
          success: true,
          message: '头像上传成功',
          data: expect.objectContaining({
            avatarUrl: 'https://example.com/avatar.jpg'
          })
        })
      );
      
      expect(mockSupabaseClient.storage.upload).toHaveBeenCalled();
      expect(mockSupabaseClient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          avatar: 'https://example.com/avatar.jpg'
        })
      );
    });

    it('应该验证文件格式', async () => {
      const response = await request(app)
        .post('/api/users/me/avatar')
        .set('Authorization', 'Bearer jwt-token-123')
        .attach('avatar', Buffer.from('fake-data'), 'avatar.txt')
        .expect(400);
      
      expect(response.body).toEqual(
        expect.objectContaining({
          success: false,
          message: '不支持的文件格式，请上传 jpg、jpeg、png 或 webp 格式的图片'
        })
      );
    });

    it('应该验证文件大小', async () => {
      const largeBuffer = Buffer.alloc(6 * 1024 * 1024); // 6MB
      
      const response = await request(app)
        .post('/api/users/me/avatar')
        .set('Authorization', 'Bearer jwt-token-123')
        .attach('avatar', largeBuffer, 'avatar.jpg')
        .expect(400);
      
      expect(response.body).toEqual(
        expect.objectContaining({
          success: false,
          message: '文件大小不能超过 5MB'
        })
      );
    });

    it('应该支持人脸验证', async () => {
      mockBaiduFaceService.detectFace.mockResolvedValue({
        faces: [{ confidence: 0.95 }]
      });
      
      const response = await request(app)
        .post('/api/users/me/avatar')
        .set('Authorization', 'Bearer jwt-token-123')
        .attach('avatar', Buffer.from('fake-image-data'), 'avatar.jpg')
        .field('enableFaceVerification', 'true')
        .expect(200);
      
      expect(mockBaiduFaceService.detectFace).toHaveBeenCalled();
      expect(response.body.data).toEqual(
        expect.objectContaining({
          faceVerified: true,
          confidence: 0.95
        })
      );
    });
  });

  /**
   * 密码修改测试
   */
  describe('PUT /api/users/me/password', () => {
    it('应该修改用户密码', async () => {
      const response = await request(app)
        .put('/api/users/me/password')
        .set('Authorization', 'Bearer jwt-token-123')
        .send({
          currentPassword: 'oldpassword123',
          newPassword: 'newpassword456',
          confirmPassword: 'newpassword456'
        })
        .expect(200);
      
      expect(response.body).toEqual(
        expect.objectContaining({
          success: true,
          message: '密码修改成功'
        })
      );
      
      expect(mockBcrypt.compare).toHaveBeenCalledWith(
        'oldpassword123',
        expect.any(String)
      );
      
      expect(mockBcrypt.hash).toHaveBeenCalledWith(
        'newpassword456',
        expect.any(Number)
      );
      
      expect(mockSupabaseClient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          password_hash: 'hashed-password'
        })
      );
    });

    it('应该验证当前密码', async () => {
      mockBcrypt.compare.mockResolvedValue(false);
      
      const response = await request(app)
        .put('/api/users/me/password')
        .set('Authorization', 'Bearer jwt-token-123')
        .send({
          currentPassword: 'wrongpassword',
          newPassword: 'newpassword456',
          confirmPassword: 'newpassword456'
        })
        .expect(400);
      
      expect(response.body).toEqual(
        expect.objectContaining({
          success: false,
          message: '当前密码不正确'
        })
      );
    });

    it('应该验证密码确认', async () => {
      const response = await request(app)
        .put('/api/users/me/password')
        .set('Authorization', 'Bearer jwt-token-123')
        .send({
          currentPassword: 'oldpassword123',
          newPassword: 'newpassword456',
          confirmPassword: 'differentpassword'
        })
        .expect(400);
      
      expect(response.body).toEqual(
        expect.objectContaining({
          success: false,
          message: '新密码和确认密码不匹配'
        })
      );
    });

    it('应该验证密码强度', async () => {
      const response = await request(app)
        .put('/api/users/me/password')
        .set('Authorization', 'Bearer jwt-token-123')
        .send({
          currentPassword: 'oldpassword123',
          newPassword: '123', // 太短
          confirmPassword: '123'
        })
        .expect(400);
      
      expect(response.body.errors).toContainEqual(
        expect.objectContaining({
          field: 'newPassword',
          message: '密码长度至少8个字符'
        })
      );
    });
  });

  /**
   * 用户资料获取测试
   */
  describe('GET /api/users/me/profile', () => {
    it('应该获取用户详细资料', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: testProfile,
        error: null
      });
      
      const response = await request(app)
        .get('/api/users/me/profile')
        .set('Authorization', 'Bearer jwt-token-123')
        .expect(200);
      
      expect(response.body).toEqual(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            education: expect.any(Array),
            experience: expect.any(Array),
            skills: expect.any(Array),
            interests: expect.any(Array),
            certifications: expect.any(Array)
          })
        })
      );
    });

    it('应该处理资料不存在的情况', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: null,
        error: { message: 'No rows returned' }
      });
      
      const response = await request(app)
        .get('/api/users/me/profile')
        .set('Authorization', 'Bearer jwt-token-123')
        .expect(200);
      
      expect(response.body).toEqual(
        expect.objectContaining({
          success: true,
          data: null
        })
      );
    });
  });

  /**
   * 用户资料更新测试
   */
  describe('PUT /api/users/me/profile', () => {
    it('应该更新用户资料', async () => {
      const profileData = {
        education: [
          {
            level: '硕士',
            institution: '清华大学',
            major: '软件工程',
            graduationYear: 2024
          }
        ],
        skills: [
          {
            name: 'Python',
            level: 'advanced',
            verified: false
          }
        ],
        interests: ['机器学习', '数据科学']
      };
      
      const response = await request(app)
        .put('/api/users/me/profile')
        .set('Authorization', 'Bearer jwt-token-123')
        .send(profileData)
        .expect(200);
      
      expect(response.body).toEqual(
        expect.objectContaining({
          success: true,
          message: '用户资料更新成功'
        })
      );
      
      expect(mockSupabaseClient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          education: profileData.education,
          skills: profileData.skills,
          interests: profileData.interests
        })
      );
    });
  });

  /**
   * 学习统计测试
   */
  describe('GET /api/users/me/stats', () => {
    it('应该获取用户学习统计', async () => {
      const response = await request(app)
        .get('/api/users/me/stats')
        .set('Authorization', 'Bearer jwt-token-123')
        .expect(200);
      
      expect(response.body).toEqual(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            totalCourses: 15,
            completedCourses: 8,
            inProgressCourses: 7,
            totalLearningTime: 2400,
            streakDays: 15,
            level: 8,
            pointsEarned: 8500
          })
        })
      );
      
      expect(mockLearningProgressService.getUserStats).toHaveBeenCalledWith(
        'user-123456'
      );
    });

    it('应该支持时间范围筛选', async () => {
      const response = await request(app)
        .get('/api/users/me/stats?period=month')
        .set('Authorization', 'Bearer jwt-token-123')
        .expect(200);
      
      expect(mockLearningProgressService.getUserStats).toHaveBeenCalledWith(
        'user-123456',
        expect.objectContaining({
          period: 'month'
        })
      );
    });
  });

  /**
   * 用户成就测试
   */
  describe('GET /api/users/me/achievements', () => {
    it('应该获取用户成就列表', async () => {
      const achievements = [
        {
          id: 'achievement-1',
          name: '初学者',
          description: '完成第一门课程',
          icon: 'trophy',
          unlockedAt: new Date()
        }
      ];
      
      mockLearningProgressService.getUserAchievements.mockResolvedValue(achievements);
      
      const response = await request(app)
        .get('/api/users/me/achievements')
        .set('Authorization', 'Bearer jwt-token-123')
        .expect(200);
      
      expect(response.body).toEqual(
        expect.objectContaining({
          success: true,
          data: expect.arrayContaining([
            expect.objectContaining({
              id: 'achievement-1',
              name: '初学者',
              unlockedAt: expect.any(String)
            })
          ])
        })
      );
    });
  });

  /**
   * 用户活动记录测试
   */
  describe('GET /api/users/me/activities', () => {
    it('应该获取用户活动记录', async () => {
      const activities = [
        {
          id: 'activity-1',
          type: 'course_start',
          entityType: 'course',
          entityId: 'course-123',
          metadata: { courseName: 'JavaScript基础' },
          createdAt: new Date()
        }
      ];
      
      mockLearningProgressService.getUserActivities.mockResolvedValue(activities);
      
      const response = await request(app)
        .get('/api/users/me/activities')
        .set('Authorization', 'Bearer jwt-token-123')
        .expect(200);
      
      expect(response.body).toEqual(
        expect.objectContaining({
          success: true,
          data: expect.arrayContaining([
            expect.objectContaining({
              id: 'activity-1',
              type: 'course_start',
              entityType: 'course'
            })
          ])
        })
      );
    });

    it('应该支持分页', async () => {
      const response = await request(app)
        .get('/api/users/me/activities?page=2&limit=10')
        .set('Authorization', 'Bearer jwt-token-123')
        .expect(200);
      
      expect(mockLearningProgressService.getUserActivities).toHaveBeenCalledWith(
        'user-123456',
        expect.objectContaining({
          page: 2,
          limit: 10
        })
      );
    });
  });

  /**
   * 用户关注测试
   */
  describe('POST /api/users/:id/follow', () => {
    it('应该关注其他用户', async () => {
      const response = await request(app)
        .post('/api/users/user-456/follow')
        .set('Authorization', 'Bearer jwt-token-123')
        .expect(201);
      
      expect(response.body).toEqual(
        expect.objectContaining({
          success: true,
          message: '关注成功'
        })
      );
      
      expect(mockSupabaseClient.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          follower_id: 'user-123456',
          following_id: 'user-456'
        })
      );
    });

    it('应该检查重复关注', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: { id: 'follow-123' },
        error: null
      });
      
      const response = await request(app)
        .post('/api/users/user-456/follow')
        .set('Authorization', 'Bearer jwt-token-123')
        .expect(409);
      
      expect(response.body).toEqual(
        expect.objectContaining({
          success: false,
          message: '您已经关注了该用户'
        })
      );
    });

    it('应该防止自己关注自己', async () => {
      const response = await request(app)
        .post('/api/users/user-123456/follow')
        .set('Authorization', 'Bearer jwt-token-123')
        .expect(400);
      
      expect(response.body).toEqual(
        expect.objectContaining({
          success: false,
          message: '不能关注自己'
        })
      );
    });
  });

  /**
   * 用户取消关注测试
   */
  describe('DELETE /api/users/:id/follow', () => {
    it('应该取消关注用户', async () => {
      const response = await request(app)
        .delete('/api/users/user-456/follow')
        .set('Authorization', 'Bearer jwt-token-123')
        .expect(200);
      
      expect(response.body).toEqual(
        expect.objectContaining({
          success: true,
          message: '取消关注成功'
        })
      );
      
      expect(mockSupabaseClient.delete).toHaveBeenCalled();
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('follower_id', 'user-123456');
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('following_id', 'user-456');
    });
  });

  /**
   * 用户数据导出测试
   */
  describe('GET /api/users/me/export', () => {
    it('应该导出用户数据', async () => {
      const response = await request(app)
        .get('/api/users/me/export')
        .set('Authorization', 'Bearer jwt-token-123')
        .expect(200);
      
      expect(response.body).toEqual(
        expect.objectContaining({
          success: true,
          message: '数据导出请求已提交',
          data: expect.objectContaining({
            exportId: expect.any(String),
            estimatedTime: expect.any(Number)
          })
        })
      );
      
      expect(mockAuditService.log).toHaveBeenCalledWith(
        'user.data.export',
        expect.objectContaining({
          userId: 'user-123456'
        })
      );
    });

    it('应该支持指定导出格式', async () => {
      const response = await request(app)
        .get('/api/users/me/export?format=json')
        .set('Authorization', 'Bearer jwt-token-123')
        .expect(200);
      
      expect(response.body.data).toEqual(
        expect.objectContaining({
          format: 'json'
        })
      );
    });
  });

  /**
   * 账户删除测试
   */
  describe('DELETE /api/users/me', () => {
    it('应该删除用户账户', async () => {
      const response = await request(app)
        .delete('/api/users/me')
        .set('Authorization', 'Bearer jwt-token-123')
        .send({
          password: 'userpassword123',
          confirmation: 'DELETE'
        })
        .expect(200);
      
      expect(response.body).toEqual(
        expect.objectContaining({
          success: true,
          message: '账户删除成功'
        })
      );
      
      expect(mockBcrypt.compare).toHaveBeenCalledWith(
        'userpassword123',
        expect.any(String)
      );
      
      expect(mockSupabaseClient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'deleted',
          deleted_at: expect.any(String)
        })
      );
    });

    it('应该验证密码', async () => {
      mockBcrypt.compare.mockResolvedValue(false);
      
      const response = await request(app)
        .delete('/api/users/me')
        .set('Authorization', 'Bearer jwt-token-123')
        .send({
          password: 'wrongpassword',
          confirmation: 'DELETE'
        })
        .expect(400);
      
      expect(response.body).toEqual(
        expect.objectContaining({
          success: false,
          message: '密码不正确'
        })
      );
    });

    it('应该验证确认文本', async () => {
      const response = await request(app)
        .delete('/api/users/me')
        .set('Authorization', 'Bearer jwt-token-123')
        .send({
          password: 'userpassword123',
          confirmation: 'WRONG'
        })
        .expect(400);
      
      expect(response.body).toEqual(
        expect.objectContaining({
          success: false,
          message: '请输入 DELETE 确认删除账户'
        })
      );
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
        .get('/api/users/me')
        .set('Authorization', 'Bearer jwt-token-123')
        .expect(500);
      
      expect(response.body).toEqual(
        expect.objectContaining({
          success: false,
          message: '服务器内部错误'
        })
      );
    });

    it('应该处理无效的用户ID', async () => {
      const response = await request(app)
        .get('/api/users/invalid-id')
        .expect(400);
      
      expect(response.body).toEqual(
        expect.objectContaining({
          success: false,
          message: '无效的用户ID格式'
        })
      );
    });
  });

  /**
   * 性能测试
   */
  describe('Performance Tests', () => {
    it('应该在合理时间内返回用户信息', async () => {
      const startTime = Date.now();
      
      await request(app)
        .get('/api/users/me')
        .set('Authorization', 'Bearer jwt-token-123')
        .expect(200);
      
      const executionTime = Date.now() - startTime;
      expect(executionTime).toBeLessThan(300); // 300ms内完成
    });

    it('应该有效利用缓存减少数据库查询', async () => {
      const cacheKey = 'user_profile_user-123456';
      mockCacheService.get.mockResolvedValue(JSON.stringify(testUser));
      
      await request(app)
        .get('/api/users/me')
        .set('Authorization', 'Bearer jwt-token-123')
        .expect(200);
      
      expect(mockCacheService.get).toHaveBeenCalledWith(cacheKey);
      expect(mockSupabaseClient.from).not.toHaveBeenCalled();
    });
  });
});