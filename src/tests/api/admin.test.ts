/**
 * 管理员API集成测试
 * 测试管理员权限验证、用户管理、系统监控、数据统计等功能
 */

import { jest } from '@jest/globals';
import request from 'supertest';
import { app } from '../../api/app';
import { supabase } from '../../utils/supabase';
import { cacheService } from '../../services/cacheService';
import { auditService } from '../../services/auditService';
import { analyticsService } from '../../services/analyticsService';
import { emailService } from '../../services/emailService';
import { smsService } from '../../services/smsService';
import { envConfig } from '../../utils/envConfig';
import { logger } from '../../utils/logger';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

// Mock 依赖
jest.mock('../../utils/supabase');
jest.mock('../../services/cacheService');
jest.mock('../../services/auditService');
jest.mock('../../services/analyticsService');
jest.mock('../../services/emailService');
jest.mock('../../services/smsService');
jest.mock('../../utils/envConfig');
jest.mock('../../utils/logger');
jest.mock('jsonwebtoken');
jest.mock('bcryptjs');

// Mock 对象
const mockSupabase = supabase as jest.Mocked<typeof supabase>;
const mockCacheService = cacheService as jest.Mocked<typeof cacheService>;
const mockAuditService = auditService as jest.Mocked<typeof auditService>;
const mockAnalyticsService = analyticsService as jest.Mocked<typeof analyticsService>;
const mockEmailService = emailService as jest.Mocked<typeof emailService>;
const mockSmsService = smsService as jest.Mocked<typeof smsService>;
const mockEnvConfig = envConfig as jest.Mocked<typeof envConfig>;
const mockLogger = logger as jest.Mocked<typeof logger>;
const mockJwt = jwt as jest.Mocked<typeof jwt>;
const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

// 测试数据
const testAdmin = {
  id: 'admin-123',
  email: 'admin@example.com',
  username: 'admin',
  role: 'admin',
  profile: {
    first_name: '管理员',
    last_name: '用户',
    avatar_url: null,
    permissions: [
      'user_management',
      'course_management',
      'system_monitoring',
      'data_analytics',
      'content_moderation'
    ]
  },
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-15T10:00:00Z'
};

const testUser = {
  id: 'user-123',
  email: 'user@example.com',
  username: 'testuser',
  role: 'student',
  status: 'active',
  profile: {
    first_name: '张',
    last_name: '三',
    avatar_url: null,
    phone: '+86 138 0013 8000',
    bio: '学习编程的学生',
    location: '北京',
    website: 'https://example.com',
    social_links: {
      github: 'https://github.com/testuser',
      linkedin: 'https://linkedin.com/in/testuser'
    }
  },
  email_verified: true,
  phone_verified: false,
  last_login_at: '2024-01-15T09:00:00Z',
  login_count: 25,
  created_at: '2024-01-01T10:00:00Z',
  updated_at: '2024-01-15T09:00:00Z'
};

const testInstructor = {
  id: 'instructor-123',
  email: 'instructor@example.com',
  username: 'instructor',
  role: 'instructor',
  status: 'active',
  profile: {
    first_name: '李',
    last_name: '老师',
    avatar_url: 'https://example.com/avatar.jpg',
    bio: '资深前端开发工程师',
    expertise: ['JavaScript', 'React', 'Node.js'],
    experience_years: 8,
    education: [
      {
        degree: '计算机科学硕士',
        school: '清华大学',
        year: '2015'
      }
    ],
    certifications: [
      {
        name: 'AWS Certified Developer',
        issuer: 'Amazon',
        date: '2023-06-15'
      }
    ]
  },
  instructor_stats: {
    total_courses: 12,
    total_students: 1250,
    average_rating: 4.8,
    total_revenue: 125000
  },
  created_at: '2023-06-01T00:00:00Z',
  updated_at: '2024-01-15T10:00:00Z'
};

const testCourse = {
  id: 'course-123',
  title: 'JavaScript高级编程',
  description: '深入学习JavaScript高级特性',
  instructor_id: 'instructor-123',
  category_id: 'category-123',
  level: 'advanced',
  price: 299.00,
  currency: 'CNY',
  status: 'published',
  enrollment_count: 156,
  rating: 4.7,
  review_count: 89,
  duration_hours: 24,
  lesson_count: 48,
  created_at: '2023-12-01T00:00:00Z',
  updated_at: '2024-01-15T10:00:00Z'
};

const testSystemStats = {
  users: {
    total: 10250,
    active_today: 1250,
    active_week: 4500,
    active_month: 8200,
    new_today: 25,
    new_week: 180,
    new_month: 750
  },
  courses: {
    total: 450,
    published: 380,
    draft: 45,
    pending_review: 25,
    new_today: 3,
    new_week: 18,
    new_month: 65
  },
  enrollments: {
    total: 45600,
    today: 125,
    week: 890,
    month: 3200
  },
  revenue: {
    total: 1250000,
    today: 8500,
    week: 45000,
    month: 185000,
    currency: 'CNY'
  },
  system: {
    server_status: 'healthy',
    database_status: 'healthy',
    cache_status: 'healthy',
    storage_status: 'healthy',
    uptime: '99.98%',
    response_time_avg: 120,
    error_rate: 0.02
  }
};

// Mock 接口定义
interface MockSupabaseQuery {
  select: jest.MockedFunction<any>;
  eq: jest.MockedFunction<any>;
  neq: jest.MockedFunction<any>;
  gt: jest.MockedFunction<any>;
  gte: jest.MockedFunction<any>;
  lt: jest.MockedFunction<any>;
  lte: jest.MockedFunction<any>;
  like: jest.MockedFunction<any>;
  ilike: jest.MockedFunction<any>;
  in: jest.MockedFunction<any>;
  is: jest.MockedFunction<any>;
  order: jest.MockedFunction<any>;
  limit: jest.MockedFunction<any>;
  range: jest.MockedFunction<any>;
  single: jest.MockedFunction<any>;
  mockResolvedValue: jest.MockedFunction<any>;
}

const adminJwtToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYWRtaW4tMTIzIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzA1MzE0MDAwLCJleHAiOjE3MDU0MDA0MDB9.signature';
const userJwtToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoidXNlci0xMjMiLCJyb2xlIjoic3R1ZGVudCIsImlhdCI6MTcwNTMxNDAwMCwiZXhwIjoxNzA1NDAwNDAwfQ.signature';
const instructorJwtToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiaW5zdHJ1Y3Rvci0xMjMiLCJyb2xlIjoiaW5zdHJ1Y3RvciIsImlhdCI6MTcwNTMxNDAwMCwiZXhwIjoxNzA1NDAwNDAwfQ.signature';

describe('Admin API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // 设置环境配置
    mockEnvConfig.get.mockImplementation((key, defaultValue) => {
      const config = {
        'JWT_SECRET': 'test-jwt-secret',
        'ADMIN_EMAIL_DOMAIN': 'example.com',
        'SYSTEM_MAINTENANCE_MODE': 'false',
        'MAX_LOGIN_ATTEMPTS': '5',
        'ACCOUNT_LOCKOUT_DURATION': '1800', // 30 minutes
        'PASSWORD_MIN_LENGTH': '8',
        'PASSWORD_REQUIRE_SPECIAL': 'true',
        'EMAIL_VERIFICATION_REQUIRED': 'true',
        'PHONE_VERIFICATION_REQUIRED': 'false'
      };
      return config[key] || defaultValue;
    });
    
    // 设置JWT验证
    mockJwt.verify.mockImplementation((token) => {
      if (token === adminJwtToken) {
        return { user_id: 'admin-123', role: 'admin' };
      } else if (token === userJwtToken) {
        return { user_id: 'user-123', role: 'student' };
      } else if (token === instructorJwtToken) {
        return { user_id: 'instructor-123', role: 'instructor' };
      }
      throw new Error('Invalid token');
    });
    
    // 设置数据库 Mock
    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      neq: jest.fn().mockReturnThis(),
      gt: jest.fn().mockReturnThis(),
      lt: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      like: jest.fn().mockReturnThis(),
      ilike: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      is: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: testAdmin, error: null }),
      mockResolvedValue: jest.fn().mockResolvedValue({ data: [testUser], error: null })
    } as MockSupabaseQuery);
    
    // 设置缓存服务
    mockCacheService.get.mockResolvedValue(null);
    mockCacheService.set.mockResolvedValue(undefined);
    mockCacheService.del.mockResolvedValue(undefined);
    
    // 设置邮件和短信服务
    mockEmailService.sendEmail.mockResolvedValue({
      success: true,
      messageId: 'email-123'
    });
    
    mockSmsService.sendSms.mockResolvedValue({
      success: true,
      messageId: 'sms-123'
    });
    
    // 设置密码加密
    mockBcrypt.hash.mockResolvedValue('hashed-password');
    mockBcrypt.compare.mockResolvedValue(true);
    
    // 设置审计和分析服务
    mockAuditService.log.mockResolvedValue(undefined);
    mockAnalyticsService.track.mockResolvedValue(undefined);
  });

  /**
   * 权限验证测试
   */
  describe('权限验证', () => {
    it('应该验证管理员权限', async () => {
      const response = await request(app)
        .get('/api/admin/dashboard')
        .set('Authorization', `Bearer ${adminJwtToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
    });

    it('应该拒绝非管理员访问', async () => {
      const response = await request(app)
        .get('/api/admin/dashboard')
        .set('Authorization', `Bearer ${userJwtToken}`)
        .expect(403);
      
      expect(response.body.error).toBe('Admin access required');
    });

    it('应该拒绝无效令牌', async () => {
      const response = await request(app)
        .get('/api/admin/dashboard')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
      
      expect(response.body.error).toBe('Invalid or expired token');
    });

    it('应该拒绝缺少令牌的请求', async () => {
      const response = await request(app)
        .get('/api/admin/dashboard')
        .expect(401);
      
      expect(response.body.error).toBe('Authorization token required');
    });
  });

  /**
   * 仪表板统计测试
   */
  describe('GET /api/admin/dashboard', () => {
    it('应该返回系统统计数据', async () => {
      mockCacheService.get.mockResolvedValue(JSON.stringify(testSystemStats));
      
      const response = await request(app)
        .get('/api/admin/dashboard')
        .set('Authorization', `Bearer ${adminJwtToken}`)
        .expect(200);
      
      expect(response.body).toEqual({
        success: true,
        data: {
          stats: expect.objectContaining({
            users: expect.objectContaining({
              total: expect.any(Number),
              active_today: expect.any(Number),
              new_today: expect.any(Number)
            }),
            courses: expect.objectContaining({
              total: expect.any(Number),
              published: expect.any(Number),
              pending_review: expect.any(Number)
            }),
            revenue: expect.objectContaining({
              total: expect.any(Number),
              today: expect.any(Number),
              currency: 'CNY'
            }),
            system: expect.objectContaining({
              server_status: 'healthy',
              uptime: expect.any(String)
            })
          })
        }
      });
    });

    it('应该支持时间范围查询', async () => {
      const response = await request(app)
        .get('/api/admin/dashboard?period=week')
        .set('Authorization', `Bearer ${adminJwtToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
    });

    it('应该使用缓存提高性能', async () => {
      mockCacheService.get.mockResolvedValue(JSON.stringify(testSystemStats));
      
      await request(app)
        .get('/api/admin/dashboard')
        .set('Authorization', `Bearer ${adminJwtToken}`)
        .expect(200);
      
      expect(mockCacheService.get).toHaveBeenCalledWith('admin:dashboard:stats:today');
    });
  });

  /**
   * 用户管理测试
   */
  describe('用户管理', () => {
    describe('GET /api/admin/users', () => {
      it('应该返回用户列表', async () => {
        const users = [testUser, testInstructor];
        
        mockSupabase.from().select().order().range.mockResolvedValue({
          data: users,
          error: null,
          count: 2
        });
        
        const response = await request(app)
          .get('/api/admin/users')
          .set('Authorization', `Bearer ${adminJwtToken}`)
          .expect(200);
        
        expect(response.body).toEqual({
          success: true,
          data: {
            users: expect.arrayContaining([
              expect.objectContaining({
                id: 'user-123',
                email: 'user@example.com',
                role: 'student'
              }),
              expect.objectContaining({
                id: 'instructor-123',
                email: 'instructor@example.com',
                role: 'instructor'
              })
            ]),
            pagination: {
              page: 1,
              limit: 20,
              total: 2,
              totalPages: 1
            }
          }
        });
      });

      it('应该支持按角色筛选', async () => {
        const response = await request(app)
          .get('/api/admin/users?role=instructor')
          .set('Authorization', `Bearer ${adminJwtToken}`)
          .expect(200);
        
        expect(mockSupabase.from().eq).toHaveBeenCalledWith('role', 'instructor');
      });

      it('应该支持按状态筛选', async () => {
        const response = await request(app)
          .get('/api/admin/users?status=active')
          .set('Authorization', `Bearer ${adminJwtToken}`)
          .expect(200);
        
        expect(mockSupabase.from().eq).toHaveBeenCalledWith('status', 'active');
      });

      it('应该支持搜索用户', async () => {
        const response = await request(app)
          .get('/api/admin/users?search=zhang')
          .set('Authorization', `Bearer ${adminJwtToken}`)
          .expect(200);
        
        expect(mockSupabase.from().ilike).toHaveBeenCalled();
      });
    });

    describe('GET /api/admin/users/:userId', () => {
      it('应该返回用户详细信息', async () => {
        mockSupabase.from().select().eq().single.mockResolvedValue({
          data: testUser,
          error: null
        });
        
        const response = await request(app)
          .get('/api/admin/users/user-123')
          .set('Authorization', `Bearer ${adminJwtToken}`)
          .expect(200);
        
        expect(response.body).toEqual({
          success: true,
          data: {
            user: expect.objectContaining({
              id: 'user-123',
              email: 'user@example.com',
              profile: expect.objectContaining({
                first_name: '张',
                last_name: '三'
              })
            })
          }
        });
      });

      it('应该处理用户不存在', async () => {
        mockSupabase.from().select().eq().single.mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' }
        });
        
        const response = await request(app)
          .get('/api/admin/users/nonexistent')
          .set('Authorization', `Bearer ${adminJwtToken}`)
          .expect(404);
        
        expect(response.body.error).toBe('User not found');
      });
    });

    describe('PUT /api/admin/users/:userId', () => {
      const updateData = {
        status: 'suspended',
        role: 'instructor',
        profile: {
          first_name: '李',
          last_name: '四'
        }
      };

      it('应该成功更新用户信息', async () => {
        mockSupabase.from().select().eq().single.mockResolvedValue({
          data: testUser,
          error: null
        });
        
        mockSupabase.from().update().eq().select().single.mockResolvedValue({
          data: { ...testUser, ...updateData },
          error: null
        });
        
        const response = await request(app)
          .put('/api/admin/users/user-123')
          .set('Authorization', `Bearer ${adminJwtToken}`)
          .send(updateData)
          .expect(200);
        
        expect(response.body).toEqual({
          success: true,
          message: 'User updated successfully',
          data: {
            user: expect.objectContaining({
              id: 'user-123',
              status: 'suspended',
              role: 'instructor'
            })
          }
        });
        
        expect(mockAuditService.log).toHaveBeenCalledWith({
          action: 'user_updated',
          actor_id: 'admin-123',
          target_id: 'user-123',
          details: updateData
        });
      });

      it('应该验证更新数据', async () => {
        const invalidData = {
          role: 'invalid_role',
          status: 'invalid_status'
        };
        
        const response = await request(app)
          .put('/api/admin/users/user-123')
          .set('Authorization', `Bearer ${adminJwtToken}`)
          .send(invalidData)
          .expect(400);
        
        expect(response.body.error).toContain('Invalid');
      });
    });

    describe('DELETE /api/admin/users/:userId', () => {
      it('应该成功删除用户', async () => {
        mockSupabase.from().select().eq().single.mockResolvedValue({
          data: testUser,
          error: null
        });
        
        const response = await request(app)
          .delete('/api/admin/users/user-123')
          .set('Authorization', `Bearer ${adminJwtToken}`)
          .expect(200);
        
        expect(response.body).toEqual({
          success: true,
          message: 'User deleted successfully'
        });
        
        expect(mockAuditService.log).toHaveBeenCalledWith({
          action: 'user_deleted',
          actor_id: 'admin-123',
          target_id: 'user-123',
          details: { reason: 'Admin deletion' }
        });
      });

      it('应该防止删除管理员用户', async () => {
        mockSupabase.from().select().eq().single.mockResolvedValue({
          data: { ...testUser, role: 'admin' },
          error: null
        });
        
        const response = await request(app)
          .delete('/api/admin/users/admin-123')
          .set('Authorization', `Bearer ${adminJwtToken}`)
          .expect(400);
        
        expect(response.body.error).toBe('Cannot delete admin users');
      });
    });

    describe('POST /api/admin/users/:userId/reset-password', () => {
      it('应该成功重置用户密码', async () => {
        mockSupabase.from().select().eq().single.mockResolvedValue({
          data: testUser,
          error: null
        });
        
        const response = await request(app)
          .post('/api/admin/users/user-123/reset-password')
          .set('Authorization', `Bearer ${adminJwtToken}`)
          .expect(200);
        
        expect(response.body).toEqual({
          success: true,
          message: 'Password reset email sent successfully'
        });
        
        expect(mockEmailService.sendEmail).toHaveBeenCalledWith(
          expect.objectContaining({
            to: 'user@example.com',
            template: 'password_reset',
            data: expect.objectContaining({
              reset_token: expect.any(String)
            })
          })
        );
      });
    });

    describe('POST /api/admin/users/:userId/send-notification', () => {
      const notificationData = {
        title: '系统通知',
        message: '您的账户已被更新',
        type: 'info',
        priority: 'normal'
      };

      it('应该成功发送通知', async () => {
        mockSupabase.from().select().eq().single.mockResolvedValue({
          data: testUser,
          error: null
        });
        
        const response = await request(app)
          .post('/api/admin/users/user-123/send-notification')
          .set('Authorization', `Bearer ${adminJwtToken}`)
          .send(notificationData)
          .expect(200);
        
        expect(response.body).toEqual({
          success: true,
          message: 'Notification sent successfully'
        });
      });

      it('应该验证通知数据', async () => {
        const invalidData = {
          title: '', // 空标题
          message: 'a'.repeat(1001), // 超长消息
          type: 'invalid_type'
        };
        
        const response = await request(app)
          .post('/api/admin/users/user-123/send-notification')
          .set('Authorization', `Bearer ${adminJwtToken}`)
          .send(invalidData)
          .expect(400);
        
        expect(response.body.error).toContain('Invalid');
      });
    });
  });

  /**
   * 课程管理测试
   */
  describe('课程管理', () => {
    describe('GET /api/admin/courses', () => {
      it('应该返回课程列表', async () => {
        const courses = [testCourse];
        
        mockSupabase.from().select().order().range.mockResolvedValue({
          data: courses,
          error: null,
          count: 1
        });
        
        const response = await request(app)
          .get('/api/admin/courses')
          .set('Authorization', `Bearer ${adminJwtToken}`)
          .expect(200);
        
        expect(response.body).toEqual({
          success: true,
          data: {
            courses: expect.arrayContaining([
              expect.objectContaining({
                id: 'course-123',
                title: 'JavaScript高级编程',
                status: 'published'
              })
            ]),
            pagination: expect.any(Object)
          }
        });
      });

      it('应该支持按状态筛选课程', async () => {
        const response = await request(app)
          .get('/api/admin/courses?status=pending_review')
          .set('Authorization', `Bearer ${adminJwtToken}`)
          .expect(200);
        
        expect(mockSupabase.from().eq).toHaveBeenCalledWith('status', 'pending_review');
      });
    });

    describe('PUT /api/admin/courses/:courseId/status', () => {
      it('应该成功更新课程状态', async () => {
        mockSupabase.from().select().eq().single.mockResolvedValue({
          data: testCourse,
          error: null
        });
        
        const response = await request(app)
          .put('/api/admin/courses/course-123/status')
          .set('Authorization', `Bearer ${adminJwtToken}`)
          .send({ status: 'approved', review_notes: '课程内容优质，批准发布' })
          .expect(200);
        
        expect(response.body).toEqual({
          success: true,
          message: 'Course status updated successfully'
        });
        
        expect(mockAuditService.log).toHaveBeenCalledWith({
          action: 'course_status_updated',
          actor_id: 'admin-123',
          target_id: 'course-123',
          details: {
            old_status: 'published',
            new_status: 'approved',
            review_notes: '课程内容优质，批准发布'
          }
        });
      });
    });

    describe('DELETE /api/admin/courses/:courseId', () => {
      it('应该成功删除课程', async () => {
        mockSupabase.from().select().eq().single.mockResolvedValue({
          data: testCourse,
          error: null
        });
        
        const response = await request(app)
          .delete('/api/admin/courses/course-123')
          .set('Authorization', `Bearer ${adminJwtToken}`)
          .send({ reason: '违反平台规定' })
          .expect(200);
        
        expect(response.body).toEqual({
          success: true,
          message: 'Course deleted successfully'
        });
      });
    });
  });

  /**
   * 系统监控测试
   */
  describe('系统监控', () => {
    describe('GET /api/admin/system/health', () => {
      it('应该返回系统健康状态', async () => {
        const response = await request(app)
          .get('/api/admin/system/health')
          .set('Authorization', `Bearer ${adminJwtToken}`)
          .expect(200);
        
        expect(response.body).toEqual({
          success: true,
          data: {
            status: 'healthy',
            timestamp: expect.any(String),
            services: {
              database: expect.objectContaining({
                status: expect.any(String),
                response_time: expect.any(Number)
              }),
              cache: expect.objectContaining({
                status: expect.any(String),
                response_time: expect.any(Number)
              }),
              storage: expect.objectContaining({
                status: expect.any(String),
                response_time: expect.any(Number)
              })
            },
            metrics: {
              cpu_usage: expect.any(Number),
              memory_usage: expect.any(Number),
              disk_usage: expect.any(Number),
              active_connections: expect.any(Number)
            }
          }
        });
      });
    });

    describe('GET /api/admin/system/logs', () => {
      it('应该返回系统日志', async () => {
        const response = await request(app)
          .get('/api/admin/system/logs')
          .set('Authorization', `Bearer ${adminJwtToken}`)
          .expect(200);
        
        expect(response.body).toEqual({
          success: true,
          data: {
            logs: expect.any(Array),
            pagination: expect.any(Object)
          }
        });
      });

      it('应该支持按级别筛选日志', async () => {
        const response = await request(app)
          .get('/api/admin/system/logs?level=error')
          .set('Authorization', `Bearer ${adminJwtToken}`)
          .expect(200);
        
        expect(response.body.success).toBe(true);
      });
    });

    describe('GET /api/admin/system/metrics', () => {
      it('应该返回系统指标', async () => {
        const response = await request(app)
          .get('/api/admin/system/metrics')
          .set('Authorization', `Bearer ${adminJwtToken}`)
          .expect(200);
        
        expect(response.body).toEqual({
          success: true,
          data: {
            metrics: expect.objectContaining({
              requests_per_minute: expect.any(Number),
              average_response_time: expect.any(Number),
              error_rate: expect.any(Number),
              active_users: expect.any(Number)
            }),
            timestamp: expect.any(String)
          }
        });
      });
    });
  });

  /**
   * 数据分析测试
   */
  describe('数据分析', () => {
    describe('GET /api/admin/analytics/overview', () => {
      it('应该返回分析概览', async () => {
        const response = await request(app)
          .get('/api/admin/analytics/overview')
          .set('Authorization', `Bearer ${adminJwtToken}`)
          .expect(200);
        
        expect(response.body).toEqual({
          success: true,
          data: {
            overview: expect.objectContaining({
              user_growth: expect.any(Object),
              course_performance: expect.any(Object),
              revenue_trends: expect.any(Object),
              engagement_metrics: expect.any(Object)
            })
          }
        });
      });
    });

    describe('GET /api/admin/analytics/users', () => {
      it('应该返回用户分析数据', async () => {
        const response = await request(app)
          .get('/api/admin/analytics/users')
          .set('Authorization', `Bearer ${adminJwtToken}`)
          .expect(200);
        
        expect(response.body).toEqual({
          success: true,
          data: {
            user_analytics: expect.objectContaining({
              registration_trends: expect.any(Array),
              activity_patterns: expect.any(Object),
              demographics: expect.any(Object),
              retention_rates: expect.any(Object)
            })
          }
        });
      });
    });

    describe('GET /api/admin/analytics/courses', () => {
      it('应该返回课程分析数据', async () => {
        const response = await request(app)
          .get('/api/admin/analytics/courses')
          .set('Authorization', `Bearer ${adminJwtToken}`)
          .expect(200);
        
        expect(response.body).toEqual({
          success: true,
          data: {
            course_analytics: expect.objectContaining({
              enrollment_trends: expect.any(Array),
              completion_rates: expect.any(Object),
              rating_distribution: expect.any(Object),
              popular_categories: expect.any(Array)
            })
          }
        });
      });
    });

    describe('GET /api/admin/analytics/revenue', () => {
      it('应该返回收入分析数据', async () => {
        const response = await request(app)
          .get('/api/admin/analytics/revenue')
          .set('Authorization', `Bearer ${adminJwtToken}`)
          .expect(200);
        
        expect(response.body).toEqual({
          success: true,
          data: {
            revenue_analytics: expect.objectContaining({
              daily_revenue: expect.any(Array),
              monthly_trends: expect.any(Array),
              top_courses: expect.any(Array),
              instructor_earnings: expect.any(Array)
            })
          }
        });
      });
    });
  });

  /**
   * 内容审核测试
   */
  describe('内容审核', () => {
    describe('GET /api/admin/moderation/reports', () => {
      it('应该返回举报列表', async () => {
        const response = await request(app)
          .get('/api/admin/moderation/reports')
          .set('Authorization', `Bearer ${adminJwtToken}`)
          .expect(200);
        
        expect(response.body).toEqual({
          success: true,
          data: {
            reports: expect.any(Array),
            pagination: expect.any(Object)
          }
        });
      });
    });

    describe('PUT /api/admin/moderation/reports/:reportId', () => {
      it('应该成功处理举报', async () => {
        const response = await request(app)
          .put('/api/admin/moderation/reports/report-123')
          .set('Authorization', `Bearer ${adminJwtToken}`)
          .send({
            status: 'resolved',
            action: 'content_removed',
            notes: '内容违反社区规定，已删除'
          })
          .expect(200);
        
        expect(response.body).toEqual({
          success: true,
          message: 'Report processed successfully'
        });
      });
    });
  });

  /**
   * 错误处理测试
   */
  describe('错误处理', () => {
    it('应该处理数据库连接错误', async () => {
      const dbError = new Error('Database connection failed');
      mockSupabase.from().select.mockRejectedValue(dbError);
      
      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminJwtToken}`)
        .expect(500);
      
      expect(response.body).toEqual({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      });
    });

    it('应该处理缓存服务错误', async () => {
      mockCacheService.get.mockRejectedValue(new Error('Cache service unavailable'));
      
      const response = await request(app)
        .get('/api/admin/dashboard')
        .set('Authorization', `Bearer ${adminJwtToken}`)
        .expect(200); // 应该降级到直接查询数据库
      
      expect(response.body.success).toBe(true);
    });

    it('应该处理邮件服务错误', async () => {
      mockEmailService.sendEmail.mockRejectedValue(
        new Error('Email service unavailable')
      );
      
      const response = await request(app)
        .post('/api/admin/users/user-123/reset-password')
        .set('Authorization', `Bearer ${adminJwtToken}`)
        .expect(500);
      
      expect(response.body.error).toContain('Failed to send');
    });
  });

  /**
   * 性能测试
   */
  describe('性能测试', () => {
    it('仪表板查询应该在合理时间内完成', async () => {
      const startTime = Date.now();
      
      await request(app)
        .get('/api/admin/dashboard')
        .set('Authorization', `Bearer ${adminJwtToken}`)
        .expect(200);
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(2000); // 应该在2秒内完成
    });

    it('用户列表查询应该支持大量数据', async () => {
      const largeUserList = Array.from({ length: 1000 }, (_, i) => ({
        ...testUser,
        id: `user-${i}`,
        email: `user${i}@example.com`
      }));
      
      mockSupabase.from().select().order().range.mockResolvedValue({
        data: largeUserList.slice(0, 20),
        error: null,
        count: 1000
      });
      
      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminJwtToken}`)
        .expect(200);
      
      expect(response.body.data.users).toHaveLength(20);
      expect(response.body.data.pagination.total).toBe(1000);
    });

    it('应该正确处理并发管理操作', async () => {
      const promises = [];
      
      for (let i = 0; i < 10; i++) {
        promises.push(
          request(app)
            .get('/api/admin/dashboard')
            .set('Authorization', `Bearer ${adminJwtToken}`)
        );
      }
      
      const responses = await Promise.all(promises);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });
  });
});