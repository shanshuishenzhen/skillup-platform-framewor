/**
 * 通知服务单元测试
 * 测试推送通知、短信通知、邮件通知、通知模板、通知队列等功能
 * 
 * @author SOLO Coding
 * @version 1.0.0
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

// 模拟依赖
jest.mock('../../config/envConfig', () => ({
  envConfig: {
    notification: {
      providers: {
        push: {
          fcm: {
            serverKey: 'test-fcm-key',
            projectId: 'test-project'
          },
          apns: {
            keyId: 'test-key-id',
            teamId: 'test-team-id',
            bundleId: 'com.test.app'
          }
        },
        sms: {
          provider: 'aliyun',
          accessKeyId: 'test-access-key',
          accessKeySecret: 'test-secret',
          signName: '测试应用'
        },
        email: {
          provider: 'smtp',
          from: 'noreply@test.com'
        }
      },
      queue: {
        enabled: true,
        concurrency: 10,
        retryAttempts: 3
      },
      rateLimit: {
        maxPerMinute: 100,
        maxPerHour: 1000
      }
    }
  }
}));

jest.mock('../../utils/errorHandler', () => ({
  errorHandler: {
    handleError: jest.fn(),
    logError: jest.fn(),
    createError: jest.fn((message: string, code?: string) => new Error(message))
  }
}));

jest.mock('../../utils/validator', () => ({
  validator: {
    validateRequired: jest.fn(() => true),
    validateString: jest.fn(() => true),
    validateEmail: jest.fn(() => true),
    validatePhone: jest.fn(() => true),
    validateObject: jest.fn(() => true),
    validateArray: jest.fn(() => true)
  }
}));

// 模拟 Firebase Admin SDK
const mockFCM = {
  send: jest.fn(() => Promise.resolve({
    messageId: 'fcm-message-id',
    success: true
  })),
  sendMulticast: jest.fn(() => Promise.resolve({
    successCount: 2,
    failureCount: 0,
    responses: [
      { success: true, messageId: 'msg1' },
      { success: true, messageId: 'msg2' }
    ]
  })),
  sendToTopic: jest.fn(() => Promise.resolve({
    messageId: 'topic-message-id'
  }))
};

const mockFirebaseAdmin = {
  messaging: jest.fn(() => mockFCM),
  initializeApp: jest.fn(),
  credential: {
    cert: jest.fn()
  }
};

jest.mock('firebase-admin', () => mockFirebaseAdmin);

// 模拟阿里云短信SDK
const mockAliSMS = {
  sendSMS: jest.fn(() => Promise.resolve({
    Code: 'OK',
    Message: 'OK',
    RequestId: 'test-request-id',
    BizId: 'test-biz-id'
  }))
};

jest.mock('@alicloud/sms-sdk', () => jest.fn(() => mockAliSMS));

// 模拟 APNs
const mockAPNs = {
  send: jest.fn(() => Promise.resolve({
    sent: [{ device: 'device-token' }],
    failed: []
  })),
  shutdown: jest.fn()
};

jest.mock('apn', () => ({
  Provider: jest.fn(() => mockAPNs),
  Notification: jest.fn()
}));

// 模拟 Bull 队列
const mockQueue = {
  add: jest.fn(() => Promise.resolve({
    id: 'job-123',
    data: {},
    opts: {}
  })),
  process: jest.fn(),
  on: jest.fn(),
  getJobs: jest.fn(() => Promise.resolve([])),
  getJobCounts: jest.fn(() => Promise.resolve({
    waiting: 0,
    active: 0,
    completed: 10,
    failed: 1
  })),
  clean: jest.fn(() => Promise.resolve([])),
  pause: jest.fn(() => Promise.resolve()),
  resume: jest.fn(() => Promise.resolve()),
  close: jest.fn(() => Promise.resolve())
};

jest.mock('bull', () => jest.fn(() => mockQueue));

// 模拟 Redis
const mockRedis = {
  get: jest.fn(),
  set: jest.fn(),
  incr: jest.fn(() => Promise.resolve(1)),
  expire: jest.fn(),
  del: jest.fn(),
  keys: jest.fn(() => Promise.resolve([])),
  quit: jest.fn()
};

jest.mock('redis', () => ({
  createClient: jest.fn(() => mockRedis)
}));

// 模拟 WebSocket
const mockWebSocket = {
  send: jest.fn(),
  close: jest.fn(),
  on: jest.fn(),
  readyState: 1 // OPEN
};

const mockWebSocketServer = {
  clients: new Set([mockWebSocket]),
  on: jest.fn(),
  close: jest.fn()
};

jest.mock('ws', () => ({
  WebSocketServer: jest.fn(() => mockWebSocketServer),
  WebSocket: jest.fn(() => mockWebSocket)
}));

// 导入要测试的模块
import {
  // 通知服务管理
  initializeNotificationService,
  destroyNotificationService,
  isNotificationServiceInitialized,
  getNotificationServiceStatus,
  
  // 推送通知
  sendPushNotification,
  sendBulkPushNotification,
  sendTopicNotification,
  registerDeviceToken,
  unregisterDeviceToken,
  
  // 短信通知
  sendSMSNotification,
  sendBulkSMS,
  validatePhoneNumber,
  getSMSTemplate,
  
  // 邮件通知
  sendEmailNotification,
  sendBulkEmailNotification,
  
  // 实时通知
  sendRealtimeNotification,
  broadcastNotification,
  subscribeToNotifications,
  unsubscribeFromNotifications,
  
  // 通知模板
  createNotificationTemplate,
  updateNotificationTemplate,
  deleteNotificationTemplate,
  getNotificationTemplate,
  listNotificationTemplates,
  
  // 通知队列
  addNotificationToQueue,
  processNotificationQueue,
  getQueueStatus,
  pauseQueue,
  resumeQueue,
  clearQueue,
  
  // 通知历史
  getNotificationHistory,
  getNotificationById,
  searchNotifications,
  
  // 通知统计
  getNotificationStats,
  getDeliveryStats,
  getEngagementStats,
  
  // 通知偏好
  setUserNotificationPreferences,
  getUserNotificationPreferences,
  updateNotificationPreferences,
  
  // 通知订阅
  subscribeToTopic,
  unsubscribeFromTopic,
  getTopicSubscriptions,
  
  // 通知限流
  checkNotificationRateLimit,
  updateRateLimit,
  getRateLimitStatus,
  
  // 通知验证
  validateNotificationContent,
  verifyNotificationDelivery,
  
  // 通知配置
  getNotificationConfig,
  updateNotificationConfig,
  testNotificationConfig,
  
  // 通知事件
  onNotificationSent,
  onNotificationDelivered,
  onNotificationFailed,
  onNotificationClicked,
  
  // 类型定义
  NotificationConfig,
  NotificationMessage,
  NotificationTemplate,
  NotificationStats,
  DeliveryStatus,
  NotificationPreferences,
  
  // 通知服务实例
  notificationService
} from '../../services/notificationService';

describe('通知服务测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  /**
   * 通知服务管理测试
   */
  describe('通知服务管理', () => {
    it('应该成功初始化通知服务', async () => {
      const result = await initializeNotificationService();
      expect(result).toBe(true);
      expect(isNotificationServiceInitialized()).toBe(true);
      expect(mockFirebaseAdmin.initializeApp).toHaveBeenCalled();
    });

    it('应该处理通知服务初始化失败', async () => {
      mockFirebaseAdmin.initializeApp.mockRejectedValueOnce(new Error('Firebase初始化失败'));
      
      const result = await initializeNotificationService();
      expect(result).toBe(false);
    });

    it('应该成功销毁通知服务', async () => {
      await initializeNotificationService();
      const result = await destroyNotificationService();
      expect(result).toBe(true);
      expect(isNotificationServiceInitialized()).toBe(false);
    });

    it('应该获取通知服务状态', async () => {
      await initializeNotificationService();
      const status = await getNotificationServiceStatus();
      
      expect(status).toHaveProperty('initialized');
      expect(status).toHaveProperty('queueStatus');
      expect(status).toHaveProperty('notificationsSent');
      expect(status).toHaveProperty('notificationsFailed');
    });
  });

  /**
   * 推送通知测试
   */
  describe('推送通知', () => {
    beforeEach(async () => {
      await initializeNotificationService();
    });

    it('应该成功发送推送通知', async () => {
      const notification = {
        token: 'device-token-123',
        title: '测试通知',
        body: '这是一条测试通知',
        data: {
          type: 'test',
          id: '123'
        }
      };
      
      const result = await sendPushNotification(notification);
      
      expect(result).toHaveProperty('messageId');
      expect(result.success).toBe(true);
      expect(mockFCM.send).toHaveBeenCalledWith(
        expect.objectContaining({
          token: 'device-token-123',
          notification: {
            title: '测试通知',
            body: '这是一条测试通知'
          }
        })
      );
    });

    it('应该成功发送批量推送通知', async () => {
      const notifications = [
        {
          token: 'token-1',
          title: '通知1',
          body: '内容1'
        },
        {
          token: 'token-2',
          title: '通知2',
          body: '内容2'
        }
      ];
      
      const results = await sendBulkPushNotification(notifications);
      
      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
      expect(mockFCM.sendMulticast).toHaveBeenCalled();
    });

    it('应该成功发送主题通知', async () => {
      const topicNotification = {
        topic: 'news',
        title: '新闻更新',
        body: '有新的新闻内容',
        data: {
          category: 'news',
          priority: 'high'
        }
      };
      
      const result = await sendTopicNotification(topicNotification);
      
      expect(result).toHaveProperty('messageId');
      expect(result.success).toBe(true);
      expect(mockFCM.sendToTopic).toHaveBeenCalledWith(
        expect.objectContaining({
          topic: 'news'
        })
      );
    });

    it('应该成功注册设备令牌', async () => {
      const deviceData = {
        userId: 'user-123',
        token: 'device-token-123',
        platform: 'ios',
        appVersion: '1.0.0'
      };
      
      const result = await registerDeviceToken(deviceData);
      expect(result).toBe(true);
    });

    it('应该成功注销设备令牌', async () => {
      const token = 'device-token-123';
      const result = await unregisterDeviceToken(token);
      expect(result).toBe(true);
    });
  });

  /**
   * 短信通知测试
   */
  describe('短信通知', () => {
    beforeEach(async () => {
      await initializeNotificationService();
    });

    it('应该成功发送短信通知', async () => {
      const smsData = {
        phoneNumber: '+8613800138000',
        templateCode: 'SMS_123456789',
        templateParam: {
          code: '123456',
          product: '测试应用'
        }
      };
      
      const result = await sendSMSNotification(smsData);
      
      expect(result).toHaveProperty('requestId');
      expect(result).toHaveProperty('bizId');
      expect(result.success).toBe(true);
      expect(mockAliSMS.sendSMS).toHaveBeenCalledWith(
        expect.objectContaining({
          PhoneNumbers: '+8613800138000',
          TemplateCode: 'SMS_123456789'
        })
      );
    });

    it('应该成功发送批量短信', async () => {
      const smsData = {
        phoneNumbers: ['+8613800138000', '+8613800138001'],
        templateCode: 'SMS_123456789',
        templateParam: {
          product: '测试应用'
        }
      };
      
      const results = await sendBulkSMS(smsData);
      
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(2);
      expect(mockAliSMS.sendSMS).toHaveBeenCalledTimes(2);
    });

    it('应该验证手机号码格式', async () => {
      const validPhone = '+8613800138000';
      const result = await validatePhoneNumber(validPhone);
      
      expect(result).toHaveProperty('valid');
      expect(result).toHaveProperty('country');
      expect(result).toHaveProperty('carrier');
      expect(result.valid).toBe(true);
    });

    it('应该获取短信模板', async () => {
      const templateCode = 'SMS_123456789';
      const template = await getSMSTemplate(templateCode);
      
      expect(template).toHaveProperty('code');
      expect(template).toHaveProperty('content');
      expect(template).toHaveProperty('type');
    });
  });

  /**
   * 邮件通知测试
   */
  describe('邮件通知', () => {
    beforeEach(async () => {
      await initializeNotificationService();
    });

    it('应该成功发送邮件通知', async () => {
      const emailData = {
        to: 'test@example.com',
        subject: '测试邮件通知',
        template: 'notification',
        data: {
          title: '系统通知',
          content: '您有新的消息'
        }
      };
      
      const result = await sendEmailNotification(emailData);
      
      expect(result).toHaveProperty('messageId');
      expect(result.success).toBe(true);
    });

    it('应该成功发送批量邮件通知', async () => {
      const emailsData = [
        {
          to: 'user1@example.com',
          subject: '通知1',
          template: 'notification',
          data: { content: '内容1' }
        },
        {
          to: 'user2@example.com',
          subject: '通知2',
          template: 'notification',
          data: { content: '内容2' }
        }
      ];
      
      const results = await sendBulkEmailNotification(emailsData);
      
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(2);
    });
  });

  /**
   * 实时通知测试
   */
  describe('实时通知', () => {
    beforeEach(async () => {
      await initializeNotificationService();
    });

    it('应该成功发送实时通知', async () => {
      const realtimeData = {
        userId: 'user-123',
        type: 'message',
        title: '新消息',
        content: '您收到了一条新消息',
        data: {
          messageId: 'msg-123',
          senderId: 'user-456'
        }
      };
      
      const result = await sendRealtimeNotification(realtimeData);
      expect(result).toBe(true);
      expect(mockWebSocket.send).toHaveBeenCalled();
    });

    it('应该成功广播通知', async () => {
      const broadcastData = {
        type: 'system',
        title: '系统维护通知',
        content: '系统将于今晚进行维护',
        data: {
          maintenanceTime: '2024-01-01 02:00:00'
        }
      };
      
      const result = await broadcastNotification(broadcastData);
      expect(result).toBe(true);
    });

    it('应该成功订阅通知', async () => {
      const subscriptionData = {
        userId: 'user-123',
        types: ['message', 'system'],
        websocket: mockWebSocket
      };
      
      const result = await subscribeToNotifications(subscriptionData);
      expect(result).toBe(true);
    });

    it('应该成功取消订阅通知', async () => {
      const userId = 'user-123';
      const result = await unsubscribeFromNotifications(userId);
      expect(result).toBe(true);
    });
  });

  /**
   * 通知模板测试
   */
  describe('通知模板', () => {
    beforeEach(async () => {
      await initializeNotificationService();
    });

    it('应该成功创建通知模板', async () => {
      const template = {
        name: 'welcome',
        type: 'push',
        title: '欢迎使用{{appName}}',
        body: '感谢您注册{{appName}}，开始您的学习之旅吧！',
        data: {
          action: 'welcome',
          category: 'onboarding'
        }
      };
      
      const result = await createNotificationTemplate(template);
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('name');
      expect(result.success).toBe(true);
    });

    it('应该成功更新通知模板', async () => {
      const templateId = 'template-123';
      const updates = {
        title: '更新的标题',
        body: '更新的内容'
      };
      
      const result = await updateNotificationTemplate(templateId, updates);
      expect(result).toBe(true);
    });

    it('应该成功删除通知模板', async () => {
      const templateId = 'template-123';
      const result = await deleteNotificationTemplate(templateId);
      expect(result).toBe(true);
    });

    it('应该成功获取通知模板', async () => {
      const templateId = 'template-123';
      const template = await getNotificationTemplate(templateId);
      
      expect(template).toHaveProperty('id');
      expect(template).toHaveProperty('name');
      expect(template).toHaveProperty('type');
      expect(template).toHaveProperty('title');
      expect(template).toHaveProperty('body');
    });

    it('应该成功列出所有通知模板', async () => {
      const templates = await listNotificationTemplates();
      
      expect(Array.isArray(templates)).toBe(true);
    });
  });

  /**
   * 通知队列测试
   */
  describe('通知队列', () => {
    beforeEach(async () => {
      await initializeNotificationService();
    });

    it('应该成功添加通知到队列', async () => {
      const notification = {
        type: 'push',
        recipient: 'user-123',
        title: '队列通知',
        body: '这是队列中的通知'
      };
      
      const job = await addNotificationToQueue(notification);
      
      expect(job).toHaveProperty('id');
      expect(mockQueue.add).toHaveBeenCalledWith('send-notification', notification);
    });

    it('应该成功处理通知队列', async () => {
      await processNotificationQueue();
      expect(mockQueue.process).toHaveBeenCalled();
    });

    it('应该获取队列状态', async () => {
      const status = await getQueueStatus();
      
      expect(status).toHaveProperty('waiting');
      expect(status).toHaveProperty('active');
      expect(status).toHaveProperty('completed');
      expect(status).toHaveProperty('failed');
      expect(mockQueue.getJobCounts).toHaveBeenCalled();
    });

    it('应该成功暂停队列', async () => {
      const result = await pauseQueue();
      expect(result).toBe(true);
      expect(mockQueue.pause).toHaveBeenCalled();
    });

    it('应该成功恢复队列', async () => {
      const result = await resumeQueue();
      expect(result).toBe(true);
      expect(mockQueue.resume).toHaveBeenCalled();
    });

    it('应该成功清空队列', async () => {
      const result = await clearQueue();
      expect(result).toBe(true);
      expect(mockQueue.clean).toHaveBeenCalled();
    });
  });

  /**
   * 通知历史测试
   */
  describe('通知历史', () => {
    beforeEach(async () => {
      await initializeNotificationService();
    });

    it('应该获取通知历史', async () => {
      const options = {
        userId: 'user-123',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        limit: 50
      };
      
      const history = await getNotificationHistory(options);
      
      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBeLessThanOrEqual(50);
    });

    it('应该根据ID获取通知', async () => {
      const notificationId = 'notification-123';
      const notification = await getNotificationById(notificationId);
      
      expect(notification).toHaveProperty('id');
      expect(notification).toHaveProperty('type');
      expect(notification).toHaveProperty('recipient');
      expect(notification).toHaveProperty('status');
    });

    it('应该搜索通知', async () => {
      const query = {
        userId: 'user-123',
        type: 'push',
        status: 'delivered'
      };
      
      const results = await searchNotifications(query);
      
      expect(Array.isArray(results)).toBe(true);
    });
  });

  /**
   * 通知统计测试
   */
  describe('通知统计', () => {
    beforeEach(async () => {
      await initializeNotificationService();
    });

    it('应该获取通知统计信息', async () => {
      const stats = await getNotificationStats();
      
      expect(stats).toHaveProperty('totalSent');
      expect(stats).toHaveProperty('totalDelivered');
      expect(stats).toHaveProperty('totalFailed');
      expect(stats).toHaveProperty('deliveryRate');
      expect(stats).toHaveProperty('byType');
    });

    it('应该获取送达统计', async () => {
      const deliveryStats = await getDeliveryStats();
      
      expect(deliveryStats).toHaveProperty('delivered');
      expect(deliveryStats).toHaveProperty('failed');
      expect(deliveryStats).toHaveProperty('pending');
      expect(deliveryStats).toHaveProperty('bounced');
    });

    it('应该获取参与度统计', async () => {
      const engagementStats = await getEngagementStats();
      
      expect(engagementStats).toHaveProperty('opened');
      expect(engagementStats).toHaveProperty('clicked');
      expect(engagementStats).toHaveProperty('dismissed');
      expect(engagementStats).toHaveProperty('openRate');
      expect(engagementStats).toHaveProperty('clickRate');
    });
  });

  /**
   * 通知偏好测试
   */
  describe('通知偏好', () => {
    beforeEach(async () => {
      await initializeNotificationService();
    });

    it('应该成功设置用户通知偏好', async () => {
      const userId = 'user-123';
      const preferences = {
        push: {
          enabled: true,
          types: ['message', 'system']
        },
        email: {
          enabled: false,
          types: []
        },
        sms: {
          enabled: true,
          types: ['security']
        }
      };
      
      const result = await setUserNotificationPreferences(userId, preferences);
      expect(result).toBe(true);
    });

    it('应该成功获取用户通知偏好', async () => {
      const userId = 'user-123';
      const preferences = await getUserNotificationPreferences(userId);
      
      expect(preferences).toHaveProperty('push');
      expect(preferences).toHaveProperty('email');
      expect(preferences).toHaveProperty('sms');
    });

    it('应该成功更新通知偏好', async () => {
      const userId = 'user-123';
      const updates = {
        push: {
          enabled: false
        }
      };
      
      const result = await updateNotificationPreferences(userId, updates);
      expect(result).toBe(true);
    });
  });

  /**
   * 通知订阅测试
   */
  describe('通知订阅', () => {
    beforeEach(async () => {
      await initializeNotificationService();
    });

    it('应该成功订阅主题', async () => {
      const subscriptionData = {
        userId: 'user-123',
        topic: 'news',
        deviceTokens: ['token-1', 'token-2']
      };
      
      const result = await subscribeToTopic(subscriptionData);
      expect(result).toBe(true);
    });

    it('应该成功取消订阅主题', async () => {
      const unsubscribeData = {
        userId: 'user-123',
        topic: 'news',
        deviceTokens: ['token-1']
      };
      
      const result = await unsubscribeFromTopic(unsubscribeData);
      expect(result).toBe(true);
    });

    it('应该获取主题订阅列表', async () => {
      const userId = 'user-123';
      const subscriptions = await getTopicSubscriptions(userId);
      
      expect(Array.isArray(subscriptions)).toBe(true);
    });
  });

  /**
   * 通知限流测试
   */
  describe('通知限流', () => {
    beforeEach(async () => {
      await initializeNotificationService();
    });

    it('应该检查通知发送频率限制', async () => {
      const userId = 'user-123';
      const result = await checkNotificationRateLimit(userId);
      
      expect(result).toHaveProperty('allowed');
      expect(result).toHaveProperty('remaining');
      expect(result).toHaveProperty('resetTime');
    });

    it('应该更新频率限制', async () => {
      const userId = 'user-123';
      const result = await updateRateLimit(userId);
      
      expect(result).toHaveProperty('count');
      expect(result).toHaveProperty('remaining');
      expect(mockRedis.incr).toHaveBeenCalled();
    });

    it('应该获取频率限制状态', async () => {
      const status = await getRateLimitStatus();
      
      expect(status).toHaveProperty('perMinuteLimit');
      expect(status).toHaveProperty('perHourLimit');
      expect(status).toHaveProperty('currentMinuteCount');
      expect(status).toHaveProperty('currentHourCount');
    });
  });

  /**
   * 通知验证测试
   */
  describe('通知验证', () => {
    beforeEach(async () => {
      await initializeNotificationService();
    });

    it('应该成功验证通知内容', async () => {
      const notification = {
        type: 'push',
        recipient: 'user-123',
        title: '测试通知',
        body: '这是通知内容'
      };
      
      const result = await validateNotificationContent(notification);
      
      expect(result).toHaveProperty('valid');
      expect(result).toHaveProperty('errors');
      expect(result.valid).toBe(true);
    });

    it('应该验证通知送达状态', async () => {
      const notificationId = 'notification-123';
      const result = await verifyNotificationDelivery(notificationId);
      
      expect(result).toHaveProperty('delivered');
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('timestamp');
    });
  });

  /**
   * 通知配置测试
   */
  describe('通知配置', () => {
    it('应该获取通知配置', async () => {
      const config = await getNotificationConfig();
      
      expect(config).toHaveProperty('providers');
      expect(config).toHaveProperty('queue');
      expect(config).toHaveProperty('rateLimit');
    });

    it('应该成功更新通知配置', async () => {
      const newConfig = {
        queue: {
          concurrency: 20
        }
      };
      
      const result = await updateNotificationConfig(newConfig);
      expect(result).toBe(true);
    });

    it('应该测试通知配置', async () => {
      const testResult = await testNotificationConfig();
      
      expect(testResult).toHaveProperty('success');
      expect(testResult).toHaveProperty('providers');
      expect(testResult).toHaveProperty('errors');
    });
  });

  /**
   * 通知事件测试
   */
  describe('通知事件', () => {
    beforeEach(async () => {
      await initializeNotificationService();
    });

    it('应该处理通知发送事件', async () => {
      const eventData = {
        notificationId: 'notification-123',
        type: 'push',
        recipient: 'user-123',
        timestamp: new Date()
      };
      
      const result = await onNotificationSent(eventData);
      expect(result).toBe(true);
    });

    it('应该处理通知送达事件', async () => {
      const eventData = {
        notificationId: 'notification-123',
        recipient: 'user-123',
        deliveredAt: new Date()
      };
      
      const result = await onNotificationDelivered(eventData);
      expect(result).toBe(true);
    });

    it('应该处理通知失败事件', async () => {
      const eventData = {
        notificationId: 'notification-123',
        recipient: 'user-123',
        error: 'Device token invalid',
        failedAt: new Date()
      };
      
      const result = await onNotificationFailed(eventData);
      expect(result).toBe(true);
    });

    it('应该处理通知点击事件', async () => {
      const eventData = {
        notificationId: 'notification-123',
        recipient: 'user-123',
        clickedAt: new Date(),
        action: 'open_app'
      };
      
      const result = await onNotificationClicked(eventData);
      expect(result).toBe(true);
    });
  });

  /**
   * 错误处理测试
   */
  describe('错误处理', () => {
    beforeEach(async () => {
      await initializeNotificationService();
    });

    it('应该处理FCM发送错误', async () => {
      mockFCM.send.mockRejectedValueOnce(new Error('FCM发送失败'));
      
      const notification = {
        token: 'invalid-token',
        title: '测试通知',
        body: '测试内容'
      };
      
      await expect(sendPushNotification(notification)).rejects.toThrow('FCM发送失败');
    });

    it('应该处理短信发送错误', async () => {
      mockAliSMS.sendSMS.mockRejectedValueOnce(new Error('短信发送失败'));
      
      const smsData = {
        phoneNumber: '+8613800138000',
        templateCode: 'SMS_123456789',
        templateParam: {}
      };
      
      await expect(sendSMSNotification(smsData)).rejects.toThrow('短信发送失败');
    });

    it('应该处理无效设备令牌', async () => {
      const notification = {
        token: '',
        title: '测试通知',
        body: '测试内容'
      };
      
      await expect(sendPushNotification(notification)).rejects.toThrow();
    });

    it('应该处理队列连接错误', async () => {
      mockQueue.add.mockRejectedValueOnce(new Error('队列连接失败'));
      
      const notification = {
        type: 'push',
        recipient: 'user-123',
        title: '队列通知',
        body: '测试内容'
      };
      
      await expect(addNotificationToQueue(notification)).rejects.toThrow('队列连接失败');
    });
  });

  /**
   * 性能测试
   */
  describe('性能测试', () => {
    beforeEach(async () => {
      await initializeNotificationService();
    });

    it('应该快速发送大量推送通知', async () => {
      const startTime = Date.now();
      const notifications = [];
      
      for (let i = 0; i < 100; i++) {
        notifications.push({
          token: `token-${i}`,
          title: `通知 ${i}`,
          body: `这是第 ${i} 条通知`
        });
      }
      
      const results = await sendBulkPushNotification(notifications);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(results).toHaveLength(100);
      expect(duration).toBeLessThan(10000); // 应该在10秒内完成
    });

    it('应该高效处理通知队列', async () => {
      const startTime = Date.now();
      
      for (let i = 0; i < 50; i++) {
        await addNotificationToQueue({
          type: 'push',
          recipient: `user-${i}`,
          title: `通知 ${i}`,
          body: `内容 ${i}`
        });
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(5000); // 应该在5秒内完成
    });

    it('应该优化内存使用', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // 发送大量通知
      for (let i = 0; i < 100; i++) {
        await sendPushNotification({
          token: `token-${i}`,
          title: `测试通知 ${i}`,
          body: `这是测试通知内容 ${i}`
        });
      }
      
      // 强制垃圾回收
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // 内存增长应该在合理范围内
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // 小于50MB
    });
  });

  /**
   * 导出测试
   */
  describe('通知服务导出', () => {
    it('应该导出所有通知服务管理函数', () => {
      expect(typeof initializeNotificationService).toBe('function');
      expect(typeof destroyNotificationService).toBe('function');
      expect(typeof isNotificationServiceInitialized).toBe('function');
      expect(typeof getNotificationServiceStatus).toBe('function');
    });

    it('应该导出所有推送通知函数', () => {
      expect(typeof sendPushNotification).toBe('function');
      expect(typeof sendBulkPushNotification).toBe('function');
      expect(typeof sendTopicNotification).toBe('function');
      expect(typeof registerDeviceToken).toBe('function');
      expect(typeof unregisterDeviceToken).toBe('function');
    });

    it('应该导出所有短信通知函数', () => {
      expect(typeof sendSMSNotification).toBe('function');
      expect(typeof sendBulkSMS).toBe('function');
      expect(typeof validatePhoneNumber).toBe('function');
      expect(typeof getSMSTemplate).toBe('function');
    });

    it('应该导出所有邮件通知函数', () => {
      expect(typeof sendEmailNotification).toBe('function');
      expect(typeof sendBulkEmailNotification).toBe('function');
    });

    it('应该导出所有实时通知函数', () => {
      expect(typeof sendRealtimeNotification).toBe('function');
      expect(typeof broadcastNotification).toBe('function');
      expect(typeof subscribeToNotifications).toBe('function');
      expect(typeof unsubscribeFromNotifications).toBe('function');
    });

    it('应该导出所有通知模板函数', () => {
      expect(typeof createNotificationTemplate).toBe('function');
      expect(typeof updateNotificationTemplate).toBe('function');
      expect(typeof deleteNotificationTemplate).toBe('function');
      expect(typeof getNotificationTemplate).toBe('function');
      expect(typeof listNotificationTemplates).toBe('function');
    });

    it('应该导出所有通知队列函数', () => {
      expect(typeof addNotificationToQueue).toBe('function');
      expect(typeof processNotificationQueue).toBe('function');
      expect(typeof getQueueStatus).toBe('function');
      expect(typeof pauseQueue).toBe('function');
      expect(typeof resumeQueue).toBe('function');
      expect(typeof clearQueue).toBe('function');
    });

    it('应该导出所有通知历史函数', () => {
      expect(typeof getNotificationHistory).toBe('function');
      expect(typeof getNotificationById).toBe('function');
      expect(typeof searchNotifications).toBe('function');
    });

    it('应该导出所有通知统计函数', () => {
      expect(typeof getNotificationStats).toBe('function');
      expect(typeof getDeliveryStats).toBe('function');
      expect(typeof getEngagementStats).toBe('function');
    });

    it('应该导出所有通知偏好函数', () => {
      expect(typeof setUserNotificationPreferences).toBe('function');
      expect(typeof getUserNotificationPreferences).toBe('function');
      expect(typeof updateNotificationPreferences).toBe('function');
    });

    it('应该导出所有通知订阅函数', () => {
      expect(typeof subscribeToTopic).toBe('function');
      expect(typeof unsubscribeFromTopic).toBe('function');
      expect(typeof getTopicSubscriptions).toBe('function');
    });

    it('应该导出所有通知限流函数', () => {
      expect(typeof checkNotificationRateLimit).toBe('function');
      expect(typeof updateRateLimit).toBe('function');
      expect(typeof getRateLimitStatus).toBe('function');
    });

    it('应该导出所有通知验证函数', () => {
      expect(typeof validateNotificationContent).toBe('function');
      expect(typeof verifyNotificationDelivery).toBe('function');
    });

    it('应该导出所有通知配置函数', () => {
      expect(typeof getNotificationConfig).toBe('function');
      expect(typeof updateNotificationConfig).toBe('function');
      expect(typeof testNotificationConfig).toBe('function');
    });

    it('应该导出所有通知事件函数', () => {
      expect(typeof onNotificationSent).toBe('function');
      expect(typeof onNotificationDelivered).toBe('function');
      expect(typeof onNotificationFailed).toBe('function');
      expect(typeof onNotificationClicked).toBe('function');
    });

    it('应该导出所有类型定义', () => {
      expect(NotificationConfig).toBeDefined();
      expect(NotificationMessage).toBeDefined();
      expect(NotificationTemplate).toBeDefined();
      expect(NotificationStats).toBeDefined();
      expect(DeliveryStatus).toBeDefined();
      expect(NotificationPreferences).toBeDefined();
    });

    it('应该导出通知服务实例', () => {
      expect(notificationService).toBeDefined();
      expect(typeof notificationService).toBe('object');
    });
  });
});