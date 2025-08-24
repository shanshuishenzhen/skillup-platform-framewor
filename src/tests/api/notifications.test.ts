/**
 * 通知API集成测试
 * 
 * 测试通知相关的API端点，包括：
 * - 通知发送和接收
 * - 通知偏好设置
 * - 推送通知管理
 * - 邮件通知
 * - 短信通知
 * - 站内消息
 * - 通知模板管理
 * - 批量通知
 */

import request from 'supertest';
import { app } from '../../app';
import { supabaseClient } from '../../utils/supabase';
import { cacheService } from '../../services/cacheService';
import { auditService } from '../../services/auditService';
import { analyticsService } from '../../services/analyticsService';
import { emailService } from '../../services/emailService';
import { smsService } from '../../services/smsService';
import { envConfig } from '../../config/envConfig';
import jwt from 'jsonwebtoken';

// Mock 依赖
jest.mock('../../utils/supabase');
jest.mock('../../services/cacheService');
jest.mock('../../services/auditService');
jest.mock('../../services/analyticsService');
jest.mock('../../services/emailService');
jest.mock('../../services/smsService');
jest.mock('../../config/envConfig');
jest.mock('jsonwebtoken');

// 类型定义
interface Notification {
  id: string;
  userId: string;
  type: 'system' | 'course' | 'achievement' | 'reminder' | 'social' | 'marketing';
  channel: 'push' | 'email' | 'sms' | 'in_app';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  title: string;
  content: string;
  data?: Record<string, any>;
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  scheduledAt?: Date;
  sentAt?: Date;
  readAt?: Date;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface NotificationPreference {
  userId: string;
  type: string;
  channels: {
    push: boolean;
    email: boolean;
    sms: boolean;
    in_app: boolean;
  };
  frequency: 'immediate' | 'hourly' | 'daily' | 'weekly' | 'never';
  quietHours: {
    enabled: boolean;
    start: string; // HH:mm
    end: string; // HH:mm
    timezone: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

interface NotificationTemplate {
  id: string;
  name: string;
  type: string;
  channel: string;
  subject?: string;
  content: string;
  variables: string[];
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

interface BatchNotification {
  id: string;
  name: string;
  templateId: string;
  targetUsers: string[];
  targetCriteria?: {
    roles?: string[];
    courses?: string[];
    tags?: string[];
    lastActiveAfter?: Date;
  };
  scheduledAt?: Date;
  status: 'draft' | 'scheduled' | 'sending' | 'completed' | 'failed';
  progress: {
    total: number;
    sent: number;
    delivered: number;
    failed: number;
  };
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
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
  order: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  offset: jest.fn().mockReturnThis(),
  range: jest.fn().mockReturnThis(),
  single: jest.fn(),
  then: jest.fn(),
  count: jest.fn().mockReturnThis(),
  rpc: jest.fn()
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
  gauge: jest.fn(),
  histogram: jest.fn()
};

const mockEmailService = {
  sendEmail: jest.fn(),
  sendBulkEmail: jest.fn(),
  validateTemplate: jest.fn(),
  renderTemplate: jest.fn()
};

const mockSmsService = {
  sendSms: jest.fn(),
  sendBulkSms: jest.fn(),
  validatePhoneNumber: jest.fn()
};

const mockEnvConfig = {
  notifications: {
    enablePush: true,
    enableEmail: true,
    enableSms: true,
    maxBatchSize: 1000,
    retryAttempts: 3,
    retryDelay: 5000,
    defaultExpiration: 30 * 24 * 60 * 60 * 1000, // 30天
    quietHoursDefault: {
      start: '22:00',
      end: '08:00'
    }
  },
  push: {
    vapidPublicKey: 'test-vapid-public-key',
    vapidPrivateKey: 'test-vapid-private-key'
  }
};

const mockJwt = {
  verify: jest.fn(),
  sign: jest.fn()
};

// 模块类型定义
type MockedModule<T> = T & { [K in keyof T]: jest.MockedFunction<T[K]> };

// 设置 Mock
jest.mocked(supabaseClient).mockReturnValue(mockSupabaseClient);
jest.mocked(cacheService).mockReturnValue(mockCacheService);
jest.mocked(auditService).mockReturnValue(mockAuditService);
jest.mocked(analyticsService).mockReturnValue(mockAnalyticsService);
jest.mocked(emailService).mockReturnValue(mockEmailService);
jest.mocked(smsService).mockReturnValue(mockSmsService);
jest.mocked(envConfig).mockReturnValue(mockEnvConfig);
jest.mocked(jwt).mockReturnValue(mockJwt);

// 测试数据
const testNotification: Notification = {
  id: 'notification-123',
  userId: 'user-123456',
  type: 'course',
  channel: 'push',
  priority: 'normal',
  title: '新课程发布',
  content: '您关注的JavaScript高级课程已经发布，快来学习吧！',
  data: {
    courseId: 'course-123',
    courseTitle: 'JavaScript高级编程',
    actionUrl: '/courses/course-123'
  },
  status: 'sent',
  sentAt: new Date(),
  expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  createdAt: new Date(),
  updatedAt: new Date()
};

const testNotificationPreference: NotificationPreference = {
  userId: 'user-123456',
  type: 'course',
  channels: {
    push: true,
    email: true,
    sms: false,
    in_app: true
  },
  frequency: 'immediate',
  quietHours: {
    enabled: true,
    start: '22:00',
    end: '08:00',
    timezone: 'Asia/Shanghai'
  },
  createdAt: new Date(),
  updatedAt: new Date()
};

const testNotificationTemplate: NotificationTemplate = {
  id: 'template-123',
  name: '课程发布通知',
  type: 'course',
  channel: 'push',
  subject: '新课程发布：{{courseTitle}}',
  content: '您关注的{{courseTitle}}课程已经发布，快来学习吧！点击查看：{{actionUrl}}',
  variables: ['courseTitle', 'actionUrl'],
  isActive: true,
  createdBy: 'admin-123',
  createdAt: new Date(),
  updatedAt: new Date()
};

const testBatchNotification: BatchNotification = {
  id: 'batch-123',
  name: '新课程推广',
  templateId: 'template-123',
  targetUsers: ['user-123456', 'user-789012'],
  targetCriteria: {
    roles: ['student'],
    courses: ['course-123'],
    lastActiveAfter: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  },
  scheduledAt: new Date(Date.now() + 60 * 60 * 1000), // 1小时后
  status: 'scheduled',
  progress: {
    total: 1000,
    sent: 0,
    delivered: 0,
    failed: 0
  },
  createdBy: 'admin-123',
  createdAt: new Date(),
  updatedAt: new Date()
};

// 认证中间件模拟
const mockAuthUser = {
  id: 'user-123456',
  email: 'test@skillup.com',
  role: 'student'
};

const mockAdminUser = {
  id: 'admin-123',
  email: 'admin@skillup.com',
  role: 'admin'
};

describe('Notifications API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // 设置默认的mock返回值
    mockCacheService.get.mockResolvedValue(null);
    mockCacheService.set.mockResolvedValue(true);
    
    mockAuditService.log.mockResolvedValue(true);
    
    mockAnalyticsService.track.mockResolvedValue(true);
    
    mockEmailService.sendEmail.mockResolvedValue({
      messageId: 'email-123',
      status: 'sent'
    });
    
    mockSmsService.sendSms.mockResolvedValue({
      messageId: 'sms-123',
      status: 'sent'
    });
    
    // 设置JWT验证
    mockJwt.verify.mockReturnValue(mockAuthUser);
    
    // 设置Supabase默认返回值
    mockSupabaseClient.single.mockResolvedValue({
      data: testNotification,
      error: null
    });
    
    mockSupabaseClient.then.mockResolvedValue({
      data: [testNotification],
      error: null,
      count: 1
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  /**
   * 获取通知列表测试
   */
  describe('GET /api/notifications', () => {
    it('应该获取用户通知列表', async () => {
      const response = await request(app)
        .get('/api/notifications')
        .set('Authorization', 'Bearer jwt-token-123')
        .expect(200);
      
      expect(response.body).toEqual(
        expect.objectContaining({
          success: true,
          data: expect.arrayContaining([
            expect.objectContaining({
              id: 'notification-123',
              type: 'course',
              title: '新课程发布',
              status: 'sent'
            })
          ]),
          pagination: expect.objectContaining({
            page: 1,
            limit: 20,
            total: 1
          })
        })
      );
      
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('notifications');
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('userId', 'user-123456');
    });

    it('应该支持状态筛选', async () => {
      const response = await request(app)
        .get('/api/notifications?status=unread&type=course')
        .set('Authorization', 'Bearer jwt-token-123')
        .expect(200);
      
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('status', 'unread');
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('type', 'course');
    });

    it('应该支持分页', async () => {
      const response = await request(app)
        .get('/api/notifications?page=2&limit=10')
        .set('Authorization', 'Bearer jwt-token-123')
        .expect(200);
      
      expect(mockSupabaseClient.range).toHaveBeenCalledWith(10, 19);
    });
  });

  /**
   * 发送通知测试
   */
  describe('POST /api/notifications', () => {
    it('应该发送单个通知', async () => {
      const notificationData = {
        userId: 'user-789012',
        type: 'achievement',
        channel: 'push',
        title: '恭喜获得成就',
        content: '您已完成JavaScript基础课程，获得"初学者"徽章！',
        data: {
          achievementId: 'achievement-123',
          badgeUrl: '/badges/beginner.png'
        }
      };
      
      const response = await request(app)
        .post('/api/notifications')
        .set('Authorization', 'Bearer jwt-token-123')
        .send(notificationData)
        .expect(201);
      
      expect(response.body).toEqual(
        expect.objectContaining({
          success: true,
          message: '通知发送成功',
          data: expect.objectContaining({
            id: expect.any(String),
            status: 'sent'
          })
        })
      );
      
      expect(mockSupabaseClient.insert).toHaveBeenCalledWith(
        expect.objectContaining(notificationData)
      );
    });

    it('应该验证通知数据', async () => {
      const response = await request(app)
        .post('/api/notifications')
        .set('Authorization', 'Bearer jwt-token-123')
        .send({
          type: 'invalid_type',
          channel: 'invalid_channel',
          title: '', // 空标题
          content: 'a'.repeat(1001) // 超长内容
        })
        .expect(400);
      
      expect(response.body).toEqual(
        expect.objectContaining({
          success: false,
          message: '请求参数验证失败',
          errors: expect.arrayContaining([
            expect.objectContaining({
              field: 'type',
              message: '无效的通知类型'
            }),
            expect.objectContaining({
              field: 'title',
              message: '标题不能为空'
            })
          ])
        })
      );
    });

    it('应该检查用户通知偏好', async () => {
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: {
          ...testNotificationPreference,
          channels: { push: false, email: false, sms: false, in_app: false }
        },
        error: null
      });
      
      const response = await request(app)
        .post('/api/notifications')
        .set('Authorization', 'Bearer jwt-token-123')
        .send({
          userId: 'user-789012',
          type: 'course',
          channel: 'push',
          title: '测试通知',
          content: '测试内容'
        })
        .expect(200);
      
      expect(response.body).toEqual(
        expect.objectContaining({
          success: true,
          message: '用户已关闭此类型通知，跳过发送'
        })
      );
    });

    it('应该处理静默时间', async () => {
      // 模拟当前时间在静默时间内
      const now = new Date();
      now.setHours(23, 0, 0, 0); // 23:00
      jest.spyOn(Date, 'now').mockReturnValue(now.getTime());
      
      const response = await request(app)
        .post('/api/notifications')
        .set('Authorization', 'Bearer jwt-token-123')
        .send({
          userId: 'user-789012',
          type: 'course',
          channel: 'push',
          title: '测试通知',
          content: '测试内容'
        })
        .expect(201);
      
      expect(response.body.data.scheduledAt).toBeDefined();
      expect(mockSupabaseClient.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'pending',
          scheduledAt: expect.any(Date)
        })
      );
    });
  });

  /**
   * 标记通知为已读测试
   */
  describe('PUT /api/notifications/:id/read', () => {
    it('应该标记通知为已读', async () => {
      const response = await request(app)
        .put('/api/notifications/notification-123/read')
        .set('Authorization', 'Bearer jwt-token-123')
        .expect(200);
      
      expect(response.body).toEqual(
        expect.objectContaining({
          success: true,
          message: '通知已标记为已读'
        })
      );
      
      expect(mockSupabaseClient.update).toHaveBeenCalledWith({
        status: 'read',
        readAt: expect.any(Date)
      });
    });

    it('应该验证通知所有权', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: { ...testNotification, userId: 'other-user' },
        error: null
      });
      
      const response = await request(app)
        .put('/api/notifications/notification-123/read')
        .set('Authorization', 'Bearer jwt-token-123')
        .expect(403);
      
      expect(response.body).toEqual(
        expect.objectContaining({
          success: false,
          message: '无权限操作此通知'
        })
      );
    });
  });

  /**
   * 批量标记已读测试
   */
  describe('PUT /api/notifications/read-all', () => {
    it('应该批量标记所有通知为已读', async () => {
      const response = await request(app)
        .put('/api/notifications/read-all')
        .set('Authorization', 'Bearer jwt-token-123')
        .expect(200);
      
      expect(response.body).toEqual(
        expect.objectContaining({
          success: true,
          message: '所有通知已标记为已读'
        })
      );
      
      expect(mockSupabaseClient.update).toHaveBeenCalledWith({
        status: 'read',
        readAt: expect.any(Date)
      });
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('userId', 'user-123456');
      expect(mockSupabaseClient.neq).toHaveBeenCalledWith('status', 'read');
    });

    it('应该支持按类型批量标记', async () => {
      const response = await request(app)
        .put('/api/notifications/read-all?type=course')
        .set('Authorization', 'Bearer jwt-token-123')
        .expect(200);
      
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('type', 'course');
    });
  });

  /**
   * 删除通知测试
   */
  describe('DELETE /api/notifications/:id', () => {
    it('应该删除通知', async () => {
      const response = await request(app)
        .delete('/api/notifications/notification-123')
        .set('Authorization', 'Bearer jwt-token-123')
        .expect(200);
      
      expect(response.body).toEqual(
        expect.objectContaining({
          success: true,
          message: '通知删除成功'
        })
      );
      
      expect(mockSupabaseClient.delete).toHaveBeenCalled();
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('id', 'notification-123');
    });

    it('应该验证通知所有权', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: { ...testNotification, userId: 'other-user' },
        error: null
      });
      
      const response = await request(app)
        .delete('/api/notifications/notification-123')
        .set('Authorization', 'Bearer jwt-token-123')
        .expect(403);
      
      expect(response.body).toEqual(
        expect.objectContaining({
          success: false,
          message: '无权限删除此通知'
        })
      );
    });
  });

  /**
   * 通知偏好设置测试
   */
  describe('GET /api/notifications/preferences', () => {
    it('应该获取用户通知偏好', async () => {
      mockSupabaseClient.then.mockResolvedValue({
        data: [testNotificationPreference],
        error: null
      });
      
      const response = await request(app)
        .get('/api/notifications/preferences')
        .set('Authorization', 'Bearer jwt-token-123')
        .expect(200);
      
      expect(response.body).toEqual(
        expect.objectContaining({
          success: true,
          data: expect.arrayContaining([
            expect.objectContaining({
              type: 'course',
              channels: expect.objectContaining({
                push: true,
                email: true,
                sms: false
              }),
              frequency: 'immediate'
            })
          ])
        })
      );
    });
  });

  describe('PUT /api/notifications/preferences', () => {
    it('应该更新通知偏好', async () => {
      const preferences = {
        course: {
          channels: {
            push: true,
            email: false,
            sms: false,
            in_app: true
          },
          frequency: 'daily'
        },
        achievement: {
          channels: {
            push: true,
            email: true,
            sms: false,
            in_app: true
          },
          frequency: 'immediate'
        }
      };
      
      const response = await request(app)
        .put('/api/notifications/preferences')
        .set('Authorization', 'Bearer jwt-token-123')
        .send({ preferences })
        .expect(200);
      
      expect(response.body).toEqual(
        expect.objectContaining({
          success: true,
          message: '通知偏好更新成功'
        })
      );
      
      expect(mockSupabaseClient.insert).toHaveBeenCalled();
    });

    it('应该验证偏好设置格式', async () => {
      const response = await request(app)
        .put('/api/notifications/preferences')
        .set('Authorization', 'Bearer jwt-token-123')
        .send({
          preferences: {
            invalid_type: {
              channels: {
                invalid_channel: true
              },
              frequency: 'invalid_frequency'
            }
          }
        })
        .expect(400);
      
      expect(response.body).toEqual(
        expect.objectContaining({
          success: false,
          message: '请求参数验证失败'
        })
      );
    });
  });

  /**
   * 推送订阅管理测试
   */
  describe('POST /api/notifications/push/subscribe', () => {
    it('应该订阅推送通知', async () => {
      const subscription = {
        endpoint: 'https://fcm.googleapis.com/fcm/send/test',
        keys: {
          p256dh: 'test-p256dh-key',
          auth: 'test-auth-key'
        }
      };
      
      const response = await request(app)
        .post('/api/notifications/push/subscribe')
        .set('Authorization', 'Bearer jwt-token-123')
        .send({ subscription })
        .expect(200);
      
      expect(response.body).toEqual(
        expect.objectContaining({
          success: true,
          message: '推送订阅成功'
        })
      );
      
      expect(mockSupabaseClient.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123456',
          endpoint: subscription.endpoint,
          keys: subscription.keys
        })
      );
    });

    it('应该验证订阅数据', async () => {
      const response = await request(app)
        .post('/api/notifications/push/subscribe')
        .set('Authorization', 'Bearer jwt-token-123')
        .send({
          subscription: {
            endpoint: 'invalid-url',
            keys: {}
          }
        })
        .expect(400);
      
      expect(response.body).toEqual(
        expect.objectContaining({
          success: false,
          message: '无效的推送订阅数据'
        })
      );
    });
  });

  describe('DELETE /api/notifications/push/unsubscribe', () => {
    it('应该取消推送订阅', async () => {
      const response = await request(app)
        .delete('/api/notifications/push/unsubscribe')
        .set('Authorization', 'Bearer jwt-token-123')
        .send({ endpoint: 'https://fcm.googleapis.com/fcm/send/test' })
        .expect(200);
      
      expect(response.body).toEqual(
        expect.objectContaining({
          success: true,
          message: '推送订阅取消成功'
        })
      );
      
      expect(mockSupabaseClient.delete).toHaveBeenCalled();
    });
  });

  /**
   * 通知模板管理测试（管理员功能）
   */
  describe('GET /api/notifications/templates', () => {
    beforeEach(() => {
      mockJwt.verify.mockReturnValue(mockAdminUser);
    });

    it('应该获取通知模板列表', async () => {
      mockSupabaseClient.then.mockResolvedValue({
        data: [testNotificationTemplate],
        error: null
      });
      
      const response = await request(app)
        .get('/api/notifications/templates')
        .set('Authorization', 'Bearer admin-token-123')
        .expect(200);
      
      expect(response.body).toEqual(
        expect.objectContaining({
          success: true,
          data: expect.arrayContaining([
            expect.objectContaining({
              id: 'template-123',
              name: '课程发布通知',
              type: 'course',
              variables: ['courseTitle', 'actionUrl']
            })
          ])
        })
      );
    });

    it('应该要求管理员权限', async () => {
      mockJwt.verify.mockReturnValue(mockAuthUser);
      
      const response = await request(app)
        .get('/api/notifications/templates')
        .set('Authorization', 'Bearer jwt-token-123')
        .expect(403);
      
      expect(response.body).toEqual(
        expect.objectContaining({
          success: false,
          message: '权限不足，需要管理员权限'
        })
      );
    });
  });

  describe('POST /api/notifications/templates', () => {
    beforeEach(() => {
      mockJwt.verify.mockReturnValue(mockAdminUser);
    });

    it('应该创建通知模板', async () => {
      const templateData = {
        name: '成就解锁通知',
        type: 'achievement',
        channel: 'push',
        subject: '恭喜解锁新成就：{{achievementName}}',
        content: '您已成功解锁新成就：{{achievementName}}！继续努力，解锁更多成就吧！',
        variables: ['achievementName']
      };
      
      mockSupabaseClient.insert.mockResolvedValue({
        data: [{ id: 'template-456', ...templateData }],
        error: null
      });
      
      const response = await request(app)
        .post('/api/notifications/templates')
        .set('Authorization', 'Bearer admin-token-123')
        .send(templateData)
        .expect(201);
      
      expect(response.body).toEqual(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            id: 'template-456',
            name: '成就解锁通知'
          })
        })
      );
    });
  });
});