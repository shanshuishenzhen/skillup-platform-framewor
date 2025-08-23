/**
 * 推送通知服务模块单元测试
 * 
 * 测试覆盖范围：
 * 1. 推送通知发送和管理
 * 2. 多平台推送支持（iOS、Android、Web）
 * 3. 推送通知模板系统
 * 4. 设备令牌管理
 * 5. 推送通知统计和分析
 * 6. 推送通知订阅管理
 * 7. 推送通知个性化
 * 8. 批量推送通知
 * 9. 推送通知调度
 * 10. 错误处理和重试机制
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { testUtils } from '../setup';

// 模拟依赖
jest.mock('@/utils/envConfig');
jest.mock('@/utils/errorHandler');
jest.mock('@/services/monitoringService');
jest.mock('@/services/userService');
jest.mock('@/services/cloudStorageService');
jest.mock('@supabase/supabase-js');
jest.mock('firebase-admin');
jest.mock('web-push');
jest.mock('@azure/notification-hubs');
jest.mock('aws-sdk');
jest.mock('node:crypto');
jest.mock('node:fs/promises');
jest.mock('node:path');
jest.mock('handlebars');
jest.mock('uuid');
jest.mock('moment');
jest.mock('redis');
jest.mock('bull');
jest.mock('lodash');
jest.mock('cron');
jest.mock('node-schedule');

const mockEnvConfig = {
  PUSH_NOTIFICATION: {
    providers: {
      firebase: {
        projectId: 'firebase-project-id',
        privateKey: 'firebase-private-key',
        clientEmail: 'firebase@serviceaccount.com',
        databaseURL: 'https://firebase-project.firebaseio.com'
      },
      apns: {
        keyId: 'apns-key-id',
        teamId: 'apns-team-id',
        bundleId: 'com.example.app',
        privateKey: 'apns-private-key',
        production: false
      },
      webPush: {
        vapidPublicKey: 'web-push-public-key',
        vapidPrivateKey: 'web-push-private-key',
        subject: 'mailto:admin@example.com'
      },
      azure: {
        connectionString: 'azure-notification-hub-connection',
        hubName: 'notification-hub'
      },
      aws: {
        accessKeyId: 'aws-access-key',
        secretAccessKey: 'aws-secret-key',
        region: 'us-east-1',
        platformApplicationArn: 'aws-platform-arn'
      }
    },
    defaultProvider: 'firebase',
    retryAttempts: 3,
    retryDelay: 5000,
    batchSize: 100,
    maxPayloadSize: 4096
  },
  REDIS: {
    host: 'localhost',
    port: 6379,
    password: 'redis_password'
  }
};

const mockMonitoringService = {
  recordMetric: jest.fn(),
  recordError: jest.fn(),
  recordLatency: jest.fn(),
  recordPushEvent: jest.fn()
};

const mockErrorHandler = {
  createError: jest.fn(),
  logError: jest.fn(),
  handleError: jest.fn()
};

const mockUserService = {
  getUserById: jest.fn(),
  getUsersByIds: jest.fn(),
  getUserDevices: jest.fn(),
  updateUserDevice: jest.fn()
};

const mockCloudStorageService = {
  uploadFile: jest.fn(),
  downloadFile: jest.fn(),
  deleteFile: jest.fn()
};

// Supabase模拟
const mockSupabase = {
  from: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    single: jest.fn(),
    then: jest.fn()
  })),
  rpc: jest.fn()
};

// Firebase Admin模拟
const mockFirebaseAdmin = {
  initializeApp: jest.fn(),
  messaging: jest.fn(() => ({
    send: jest.fn(),
    sendMulticast: jest.fn(),
    sendAll: jest.fn(),
    subscribeToTopic: jest.fn(),
    unsubscribeFromTopic: jest.fn()
  })),
  credential: {
    cert: jest.fn()
  }
};

// Web Push模拟
const mockWebPush = {
  setVapidDetails: jest.fn(),
  sendNotification: jest.fn(),
  generateVAPIDKeys: jest.fn()
};

// Azure Notification Hubs模拟
const mockAzureNotificationHubs = {
  NotificationHubsClient: jest.fn(() => ({
    sendNotification: jest.fn(),
    createRegistration: jest.fn(),
    deleteRegistration: jest.fn(),
    getRegistration: jest.fn()
  }))
};

// AWS SNS模拟
const mockAWSSNS = {
  createPlatformEndpoint: jest.fn().mockReturnValue({
    promise: jest.fn()
  }),
  publish: jest.fn().mockReturnValue({
    promise: jest.fn()
  }),
  deleteEndpoint: jest.fn().mockReturnValue({
    promise: jest.fn()
  })
};

// Handlebars模拟
const mockHandlebars = {
  compile: jest.fn(),
  registerHelper: jest.fn()
};

// Redis模拟
const mockRedis = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  exists: jest.fn(),
  expire: jest.fn(),
  incr: jest.fn(),
  sadd: jest.fn(),
  srem: jest.fn(),
  smembers: jest.fn(),
  quit: jest.fn()
};

// Bull队列模拟
const mockBullQueue = {
  add: jest.fn(),
  process: jest.fn(),
  getJob: jest.fn(),
  getJobs: jest.fn(),
  clean: jest.fn(),
  pause: jest.fn(),
  resume: jest.fn(),
  close: jest.fn()
};

// Lodash模拟
const mockLodash = {
  chunk: jest.fn(),
  groupBy: jest.fn(),
  debounce: jest.fn(),
  throttle: jest.fn()
};

// Cron模拟
const mockCron = {
  schedule: jest.fn()
};

// Node Schedule模拟
const mockNodeSchedule = {
  scheduleJob: jest.fn(),
  cancelJob: jest.fn()
};

const mockCrypto = {
  randomUUID: jest.fn(),
  randomBytes: jest.fn(),
  createHash: jest.fn(() => ({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn()
  }))
};

const mockUuid = {
  v4: jest.fn()
};

const mockMoment = jest.fn(() => ({
  format: jest.fn(),
  add: jest.fn().mockReturnThis(),
  subtract: jest.fn().mockReturnThis(),
  isBefore: jest.fn(),
  isAfter: jest.fn(),
  toDate: jest.fn(),
  valueOf: jest.fn()
}));

const mockFs = {
  readFile: jest.fn(),
  writeFile: jest.fn(),
  unlink: jest.fn(),
  mkdir: jest.fn()
};

const mockPath = {
  join: jest.fn(),
  resolve: jest.fn(),
  dirname: jest.fn(),
  basename: jest.fn()
};

// 导入被测试的模块
import {
  PushNotificationService,
  PushNotification,
  DeviceToken,
  NotificationTemplate,
  PushProvider,
  NotificationPayload,
  PushStats,
  BulkPushRequest,
  sendPushNotification,
  sendBulkPushNotifications,
  subscribeToTopic,
  unsubscribeFromTopic
} from '@/services/pushNotificationService';

describe('推送通知服务模块', () => {
  let pushService: PushNotificationService;

  beforeEach(() => {
    // 重置所有模拟
    jest.clearAllMocks();
    
    // 设置模拟返回值
    require('@/utils/envConfig').envConfig = mockEnvConfig;
    require('@/utils/errorHandler').errorHandler = mockErrorHandler;
    require('@/services/monitoringService').monitoringService = mockMonitoringService;
    require('@/services/userService').userService = mockUserService;
    require('@/services/cloudStorageService').cloudStorageService = mockCloudStorageService;
    
    // 设置Supabase模拟
    require('@supabase/supabase-js').createClient = jest.fn(() => mockSupabase);
    
    // 设置其他依赖模拟
    require('firebase-admin').default = mockFirebaseAdmin;
    require('web-push').default = mockWebPush;
    require('@azure/notification-hubs').default = mockAzureNotificationHubs;
    require('aws-sdk').SNS = jest.fn(() => mockAWSSNS);
    require('handlebars').default = mockHandlebars;
    require('redis').createClient = jest.fn(() => mockRedis);
    require('bull').default = jest.fn(() => mockBullQueue);
    require('lodash').default = mockLodash;
    require('cron').default = mockCron;
    require('node-schedule').default = mockNodeSchedule;
    require('node:crypto').default = mockCrypto;
    require('node:fs/promises').default = mockFs;
    require('node:path').default = mockPath;
    require('uuid').default = mockUuid;
    require('moment').default = mockMoment;
    
    // 创建推送通知服务实例
    pushService = new PushNotificationService({
      pushNotification: mockEnvConfig.PUSH_NOTIFICATION,
      redis: mockEnvConfig.REDIS
    });
    
    // 设置默认模拟返回值
    mockCrypto.randomUUID.mockReturnValue('push-123');
    mockUuid.v4.mockReturnValue('uuid-v4-123');
    
    mockMoment().format.mockReturnValue('2023-01-01 12:00:00');
    mockMoment().toDate.mockReturnValue(new Date('2023-01-01'));
    mockMoment().valueOf.mockReturnValue(1672574400000);
    
    // Handlebars默认响应
    mockHandlebars.compile.mockReturnValue(jest.fn((data) => `Compiled template with ${JSON.stringify(data)}`));
    
    // Redis默认响应
    mockRedis.get.mockResolvedValue(null);
    mockRedis.set.mockResolvedValue('OK');
    mockRedis.exists.mockResolvedValue(0);
    mockRedis.sadd.mockResolvedValue(1);
    mockRedis.srem.mockResolvedValue(1);
    mockRedis.smembers.mockResolvedValue([]);
    
    // Firebase默认响应
    mockFirebaseAdmin.messaging().send.mockResolvedValue('firebase-message-123');
    mockFirebaseAdmin.messaging().sendMulticast.mockResolvedValue({
      successCount: 2,
      failureCount: 0,
      responses: [
        { success: true, messageId: 'msg-1' },
        { success: true, messageId: 'msg-2' }
      ]
    });
    
    // Web Push默认响应
    mockWebPush.sendNotification.mockResolvedValue({
      statusCode: 200,
      body: 'Success'
    });
    
    // Azure默认响应
    mockAzureNotificationHubs.NotificationHubsClient().sendNotification.mockResolvedValue({
      notificationId: 'azure-notification-123'
    });
    
    // AWS SNS默认响应
    mockAWSSNS.createPlatformEndpoint().promise.mockResolvedValue({
      EndpointArn: 'aws-endpoint-arn-123'
    });
    
    mockAWSSNS.publish().promise.mockResolvedValue({
      MessageId: 'aws-message-123'
    });
    
    // Bull队列默认响应
    mockBullQueue.add.mockResolvedValue({ id: 'job-123' });
    
    // Lodash默认响应
    mockLodash.chunk.mockImplementation((array, size) => {
      const chunks = [];
      for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
      }
      return chunks;
    });
    
    // User Service默认响应
    mockUserService.getUserById.mockResolvedValue({
      id: 'user-123',
      name: 'Test User',
      email: 'test@example.com'
    });
    
    mockUserService.getUserDevices.mockResolvedValue([
      {
        id: 'device-1',
        token: 'firebase-token-123',
        platform: 'android',
        isActive: true
      },
      {
        id: 'device-2',
        token: 'apns-token-456',
        platform: 'ios',
        isActive: true
      }
    ]);
  });

  afterEach(() => {
    if (pushService) {
      pushService.destroy();
    }
  });

  describe('服务初始化', () => {
    it('应该正确初始化推送通知服务', async () => {
      await pushService.initialize();
      
      expect(pushService).toBeDefined();
      expect(pushService.config).toBeDefined();
      expect(pushService.providers).toBeDefined();
    });

    it('应该验证配置参数', () => {
      expect(() => {
        new PushNotificationService({
          pushNotification: null
        });
      }).toThrow('Push notification configuration is required');
    });

    it('应该初始化多个推送提供商', async () => {
      await pushService.initialize();
      
      expect(pushService.providers.firebase).toBeDefined();
      expect(pushService.providers.webPush).toBeDefined();
      expect(pushService.providers.azure).toBeDefined();
      expect(pushService.providers.aws).toBeDefined();
    });

    it('应该初始化队列系统', async () => {
      await pushService.initialize();
      
      expect(pushService.queue).toBeDefined();
    });

    it('应该初始化Redis连接', async () => {
      await pushService.initialize();
      
      expect(pushService.redis).toBeDefined();
    });

    it('应该设置VAPID密钥', async () => {
      await pushService.initialize();
      
      expect(mockWebPush.setVapidDetails).toHaveBeenCalledWith(
        'mailto:admin@example.com',
        'web-push-public-key',
        'web-push-private-key'
      );
    });
  });

  describe('推送通知发送和管理', () => {
    beforeEach(async () => {
      await pushService.initialize();
    });

    it('应该发送Firebase推送通知', async () => {
      const notification: PushNotification = {
        to: 'firebase-token-123',
        title: 'Test Notification',
        body: 'This is a test notification',
        provider: 'firebase'
      };
      
      const result = await pushService.sendPushNotification(notification);
      
      expect(result.success).toBe(true);
      expect(result.messageId).toBe('firebase-message-123');
      
      expect(mockFirebaseAdmin.messaging().send).toHaveBeenCalledWith({
        token: 'firebase-token-123',
        notification: {
          title: 'Test Notification',
          body: 'This is a test notification'
        }
      });
      
      expect(mockSupabase.from).toHaveBeenCalledWith('push_notifications');
      
      expect(mockMonitoringService.recordPushEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'push_sent',
          provider: 'firebase',
          platform: 'android'
        })
      );
    });

    it('应该发送Web Push通知', async () => {
      const notification: PushNotification = {
        to: 'web-push-subscription',
        title: 'Web Notification',
        body: 'This is a web push notification',
        provider: 'webPush'
      };
      
      const result = await pushService.sendPushNotification(notification);
      
      expect(result.success).toBe(true);
      
      expect(mockWebPush.sendNotification).toHaveBeenCalled();
    });

    it('应该发送Azure推送通知', async () => {
      const notification: PushNotification = {
        to: 'azure-registration-id',
        title: 'Azure Notification',
        body: 'This is an Azure notification',
        provider: 'azure'
      };
      
      const result = await pushService.sendPushNotification(notification);
      
      expect(result.success).toBe(true);
      expect(result.notificationId).toBe('azure-notification-123');
      
      expect(mockAzureNotificationHubs.NotificationHubsClient().sendNotification)
        .toHaveBeenCalled();
    });

    it('应该发送AWS SNS推送通知', async () => {
      const notification: PushNotification = {
        to: 'aws-endpoint-arn',
        title: 'AWS Notification',
        body: 'This is an AWS notification',
        provider: 'aws'
      };
      
      const result = await pushService.sendPushNotification(notification);
      
      expect(result.success).toBe(true);
      expect(result.messageId).toBe('aws-message-123');
      
      expect(mockAWSSNS.publish).toHaveBeenCalled();
    });

    it('应该处理推送通知发送失败', async () => {
      mockFirebaseAdmin.messaging().send.mockRejectedValue(
        new Error('Firebase API error')
      );
      
      const notification: PushNotification = {
        to: 'firebase-token-123',
        title: 'Test Notification',
        body: 'This will fail'
      };
      
      await expect(pushService.sendPushNotification(notification))
        .rejects.toThrow('Firebase API error');
      
      expect(mockMonitoringService.recordError)
        .toHaveBeenCalledWith(expect.objectContaining({
          type: 'push_send_error'
        }));
    });

    it('应该支持自定义数据载荷', async () => {
      const notification: PushNotification = {
        to: 'firebase-token-123',
        title: 'Custom Data Notification',
        body: 'Notification with custom data',
        data: {
          action: 'open_page',
          pageId: 'page-123',
          userId: 'user-456'
        }
      };
      
      const result = await pushService.sendPushNotification(notification);
      
      expect(result.success).toBe(true);
      
      expect(mockFirebaseAdmin.messaging().send).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            action: 'open_page',
            pageId: 'page-123',
            userId: 'user-456'
          }
        })
      );
    });

    it('应该支持推送通知优先级', async () => {
      const notification: PushNotification = {
        to: 'firebase-token-123',
        title: 'High Priority Notification',
        body: 'This is urgent',
        priority: 'high'
      };
      
      const result = await pushService.sendPushNotification(notification);
      
      expect(result.success).toBe(true);
      
      expect(mockFirebaseAdmin.messaging().send).toHaveBeenCalledWith(
        expect.objectContaining({
          android: {
            priority: 'high'
          },
          apns: {
            headers: {
              'apns-priority': '10'
            }
          }
        })
      );
    });
  });

  describe('设备令牌管理', () => {
    beforeEach(async () => {
      await pushService.initialize();
    });

    it('应该注册设备令牌', async () => {
      const deviceToken: DeviceToken = {
        userId: 'user-123',
        token: 'firebase-token-123',
        platform: 'android',
        appVersion: '1.0.0',
        deviceInfo: {
          model: 'Pixel 6',
          osVersion: '12'
        }
      };
      
      const result = await pushService.registerDeviceToken(deviceToken);
      
      expect(result.success).toBe(true);
      expect(result.deviceId).toBeDefined();
      
      expect(mockSupabase.from).toHaveBeenCalledWith('device_tokens');
    });

    it('应该更新设备令牌', async () => {
      const deviceId = 'device-123';
      const newToken = 'new-firebase-token-456';
      
      const result = await pushService.updateDeviceToken(deviceId, newToken);
      
      expect(result.success).toBe(true);
      
      expect(mockSupabase.from).toHaveBeenCalledWith('device_tokens');
    });

    it('应该删除设备令牌', async () => {
      const deviceId = 'device-123';
      
      const result = await pushService.removeDeviceToken(deviceId);
      
      expect(result.success).toBe(true);
      
      expect(mockSupabase.from).toHaveBeenCalledWith('device_tokens');
    });

    it('应该获取用户的所有设备', async () => {
      const userId = 'user-123';
      
      mockSupabase.from().select().eq().then.mockResolvedValue({
        data: [
          {
            id: 'device-1',
            token: 'token-1',
            platform: 'android',
            isActive: true
          },
          {
            id: 'device-2',
            token: 'token-2',
            platform: 'ios',
            isActive: true
          }
        ],
        error: null
      });
      
      const devices = await pushService.getUserDevices(userId);
      
      expect(devices).toHaveLength(2);
      expect(devices[0].platform).toBe('android');
      expect(devices[1].platform).toBe('ios');
    });

    it('应该验证设备令牌有效性', async () => {
      const token = 'firebase-token-123';
      const platform = 'android';
      
      // 模拟Firebase验证成功
      mockFirebaseAdmin.messaging().send.mockResolvedValue('test-message-id');
      
      const isValid = await pushService.validateDeviceToken(token, platform);
      
      expect(isValid).toBe(true);
    });

    it('应该处理无效的设备令牌', async () => {
      const token = 'invalid-token';
      const platform = 'android';
      
      // 模拟Firebase验证失败
      mockFirebaseAdmin.messaging().send.mockRejectedValue(
        new Error('Invalid registration token')
      );
      
      const isValid = await pushService.validateDeviceToken(token, platform);
      
      expect(isValid).toBe(false);
    });

    it('应该清理无效的设备令牌', async () => {
      const result = await pushService.cleanupInvalidTokens();
      
      expect(result.success).toBe(true);
      expect(result.removedCount).toBeGreaterThanOrEqual(0);
      
      expect(mockSupabase.from).toHaveBeenCalledWith('device_tokens');
    });
  });

  describe('推送通知模板系统', () => {
    beforeEach(async () => {
      await pushService.initialize();
    });

    it('应该创建推送通知模板', async () => {
      const template: NotificationTemplate = {
        name: 'welcome_notification',
        title: 'Welcome {{userName}}!',
        body: 'Thank you for joining {{appName}}. Get started now!',
        variables: ['userName', 'appName'],
        platforms: ['android', 'ios', 'web'],
        isActive: true
      };
      
      const result = await pushService.createTemplate(template);
      
      expect(result.success).toBe(true);
      expect(result.template.id).toBeDefined();
      
      expect(mockSupabase.from).toHaveBeenCalledWith('notification_templates');
    });

    it('应该获取推送通知模板', async () => {
      const templateId = 'template-123';
      
      mockSupabase.from().select().eq().single().then.mockResolvedValue({
        data: {
          id: 'template-123',
          name: 'welcome_notification',
          title: 'Welcome {{userName}}!',
          body: 'Thank you for joining {{appName}}!',
          variables: ['userName', 'appName']
        },
        error: null
      });
      
      const template = await pushService.getTemplate(templateId);
      
      expect(template).toBeDefined();
      expect(template.id).toBe('template-123');
    });

    it('应该渲染模板内容', async () => {
      const template = {
        title: 'Welcome {{userName}}!',
        body: 'Thank you for joining {{appName}}!'
      };
      
      const variables = {
        userName: 'John Doe',
        appName: 'SkillUp Platform'
      };
      
      const rendered = await pushService.renderTemplate(template, variables);
      
      expect(rendered.title).toContain('John Doe');
      expect(rendered.body).toContain('SkillUp Platform');
      
      expect(mockHandlebars.compile).toHaveBeenCalledTimes(2);
    });

    it('应该使用模板发送推送通知', async () => {
      const templateId = 'template-123';
      const variables = {
        userName: 'John Doe',
        appName: 'SkillUp Platform'
      };
      
      mockSupabase.from().select().eq().single().then.mockResolvedValue({
        data: {
          id: 'template-123',
          title: 'Welcome {{userName}}!',
          body: 'Thank you for joining {{appName}}!',
          variables: ['userName', 'appName']
        },
        error: null
      });
      
      const result = await pushService.sendPushNotificationWithTemplate({
        to: 'firebase-token-123',
        templateId,
        variables
      });
      
      expect(result.success).toBe(true);
      expect(mockFirebaseAdmin.messaging().send).toHaveBeenCalled();
    });

    it('应该验证模板变量', () => {
      const template = {
        title: 'Hello {{name}}',
        body: 'Your score is {{score}}',
        variables: ['name', 'score']
      };
      
      const validVariables = {
        name: 'John',
        score: '95'
      };
      
      const invalidVariables = {
        name: 'John'
        // 缺少 score
      };
      
      expect(pushService.validateTemplateVariables(template, validVariables)).toBe(true);
      expect(pushService.validateTemplateVariables(template, invalidVariables)).toBe(false);
    });
  });

  describe('批量推送通知', () => {
    beforeEach(async () => {
      await pushService.initialize();
    });

    it('应该发送批量推送通知', async () => {
      const bulkRequest: BulkPushRequest = {
        tokens: ['token-1', 'token-2', 'token-3'],
        title: 'Bulk Notification',
        body: 'This is a bulk notification',
        provider: 'firebase'
      };
      
      const result = await pushService.sendBulkPushNotifications(bulkRequest);
      
      expect(result.success).toBe(true);
      expect(result.totalSent).toBe(2); // 基于mockFirebaseAdmin.messaging().sendMulticast的响应
      expect(result.failed).toBe(0);
      
      expect(mockFirebaseAdmin.messaging().sendMulticast).toHaveBeenCalled();
    });

    it('应该处理批量发送失败', async () => {
      mockFirebaseAdmin.messaging().sendMulticast.mockResolvedValue({
        successCount: 1,
        failureCount: 2,
        responses: [
          { success: true, messageId: 'msg-1' },
          { success: false, error: new Error('Invalid token') },
          { success: false, error: new Error('Token expired') }
        ]
      });
      
      const bulkRequest: BulkPushRequest = {
        tokens: ['valid-token', 'invalid-token', 'expired-token'],
        title: 'Bulk Notification with Failures',
        body: 'Some will fail'
      };
      
      const result = await pushService.sendBulkPushNotifications(bulkRequest);
      
      expect(result.success).toBe(true);
      expect(result.totalSent).toBe(1);
      expect(result.failed).toBe(2);
      expect(result.failures).toHaveLength(2);
    });

    it('应该分批处理大量推送', async () => {
      const tokens = Array.from({ length: 250 }, (_, i) => `token-${i}`);
      
      const bulkRequest: BulkPushRequest = {
        tokens,
        title: 'Large Bulk Notification',
        body: 'Processing in batches',
        batchSize: 100
      };
      
      const result = await pushService.sendBulkPushNotifications(bulkRequest);
      
      expect(result.success).toBe(true);
      
      // 应该分成3个批次（100, 100, 50）
      expect(mockFirebaseAdmin.messaging().sendMulticast).toHaveBeenCalledTimes(3);
    });

    it('应该向用户发送推送通知', async () => {
      const userId = 'user-123';
      const notification = {
        title: 'User Notification',
        body: 'This is for a specific user'
      };
      
      const result = await pushService.sendPushNotificationToUser(userId, notification);
      
      expect(result.success).toBe(true);
      
      expect(mockUserService.getUserDevices).toHaveBeenCalledWith(userId);
      expect(mockFirebaseAdmin.messaging().sendMulticast).toHaveBeenCalled();
    });

    it('应该向多个用户发送推送通知', async () => {
      const userIds = ['user-1', 'user-2', 'user-3'];
      const notification = {
        title: 'Multi-User Notification',
        body: 'This is for multiple users'
      };
      
      const result = await pushService.sendPushNotificationToUsers(userIds, notification);
      
      expect(result.success).toBe(true);
      
      expect(mockUserService.getUsersByIds).toHaveBeenCalledWith(userIds);
    });
  });

  describe('主题订阅管理', () => {
    beforeEach(async () => {
      await pushService.initialize();
    });

    it('应该订阅主题', async () => {
      const tokens = ['token-1', 'token-2'];
      const topic = 'news_updates';
      
      mockFirebaseAdmin.messaging().subscribeToTopic.mockResolvedValue({
        successCount: 2,
        failureCount: 0,
        errors: []
      });
      
      const result = await pushService.subscribeToTopic(tokens, topic);
      
      expect(result.success).toBe(true);
      expect(result.successCount).toBe(2);
      
      expect(mockFirebaseAdmin.messaging().subscribeToTopic)
        .toHaveBeenCalledWith(tokens, topic);
      
      expect(mockSupabase.from).toHaveBeenCalledWith('topic_subscriptions');
    });

    it('应该取消订阅主题', async () => {
      const tokens = ['token-1', 'token-2'];
      const topic = 'news_updates';
      
      mockFirebaseAdmin.messaging().unsubscribeFromTopic.mockResolvedValue({
        successCount: 2,
        failureCount: 0,
        errors: []
      });
      
      const result = await pushService.unsubscribeFromTopic(tokens, topic);
      
      expect(result.success).toBe(true);
      expect(result.successCount).toBe(2);
      
      expect(mockFirebaseAdmin.messaging().unsubscribeFromTopic)
        .toHaveBeenCalledWith(tokens, topic);
    });

    it('应该向主题发送推送通知', async () => {
      const topic = 'news_updates';
      const notification = {
        title: 'Breaking News',
        body: 'Important news update'
      };
      
      const result = await pushService.sendPushNotificationToTopic(topic, notification);
      
      expect(result.success).toBe(true);
      
      expect(mockFirebaseAdmin.messaging().send).toHaveBeenCalledWith(
        expect.objectContaining({
          topic: 'news_updates'
        })
      );
    });

    it('应该获取用户的主题订阅', async () => {
      const userId = 'user-123';
      
      mockSupabase.from().select().eq().then.mockResolvedValue({
        data: [
          { topic: 'news_updates', subscribedAt: '2023-01-01' },
          { topic: 'promotions', subscribedAt: '2023-01-02' }
        ],
        error: null
      });
      
      const subscriptions = await pushService.getUserTopicSubscriptions(userId);
      
      expect(subscriptions).toHaveLength(2);
      expect(subscriptions[0].topic).toBe('news_updates');
      expect(subscriptions[1].topic).toBe('promotions');
    });

    it('应该获取主题的订阅者数量', async () => {
      const topic = 'news_updates';
      
      mockSupabase.from().select().eq().then.mockResolvedValue({
        data: [{ count: 1500 }],
        error: null
      });
      
      const count = await pushService.getTopicSubscriberCount(topic);
      
      expect(count).toBe(1500);
    });
  });

  describe('推送通知调度', () => {
    beforeEach(async () => {
      await pushService.initialize();
    });

    it('应该调度延迟推送通知', async () => {
      const notification = {
        to: 'firebase-token-123',
        title: 'Scheduled Notification',
        body: 'This is scheduled for later'
      };
      
      const scheduleTime = new Date(Date.now() + 3600000); // 1小时后
      
      const result = await pushService.schedulePushNotification(notification, scheduleTime);
      
      expect(result.success).toBe(true);
      expect(result.jobId).toBeDefined();
      
      expect(mockBullQueue.add).toHaveBeenCalledWith(
        'scheduled_push',
        notification,
        expect.objectContaining({
          delay: expect.any(Number)
        })
      );
    });

    it('应该取消调度的推送通知', async () => {
      const jobId = 'job-123';
      
      mockBullQueue.getJob.mockResolvedValue({
        id: 'job-123',
        remove: jest.fn().mockResolvedValue(true)
      });
      
      const result = await pushService.cancelScheduledPushNotification(jobId);
      
      expect(result.success).toBe(true);
    });

    it('应该设置定期推送通知', async () => {
      const notification = {
        to: 'firebase-token-123',
        title: 'Daily Reminder',
        body: 'Don\'t forget to check your progress!'
      };
      
      const cronExpression = '0 9 * * *'; // 每天上午9点
      
      const result = await pushService.scheduleRecurringPushNotification(
        notification,
        cronExpression
      );
      
      expect(result.success).toBe(true);
      expect(result.scheduleId).toBeDefined();
      
      expect(mockNodeSchedule.scheduleJob).toHaveBeenCalledWith(
        cronExpression,
        expect.any(Function)
      );
    });

    it('应该取消定期推送通知', async () => {
      const scheduleId = 'schedule-123';
      
      const result = await pushService.cancelRecurringPushNotification(scheduleId);
      
      expect(result.success).toBe(true);
      
      expect(mockNodeSchedule.cancelJob).toHaveBeenCalledWith(scheduleId);
    });

    it('应该获取调度的推送通知列表', async () => {
      mockBullQueue.getJobs.mockResolvedValue([
        {
          id: 'job-1',
          data: { title: 'Scheduled 1' },
          opts: { delay: 3600000 }
        },
        {
          id: 'job-2',
          data: { title: 'Scheduled 2' },
          opts: { delay: 7200000 }
        }
      ]);
      
      const scheduledJobs = await pushService.getScheduledPushNotifications();
      
      expect(scheduledJobs).toHaveLength(2);
      expect(scheduledJobs[0].id).toBe('job-1');
      expect(scheduledJobs[1].id).toBe('job-2');
    });
  });

  describe('推送通知统计和分析', () => {
    beforeEach(async () => {
      await pushService.initialize();
    });

    it('应该获取推送通知统计信息', async () => {
      const timeRange = {
        start: new Date('2023-01-01'),
        end: new Date('2023-01-31')
      };
      
      mockSupabase.rpc.mockResolvedValue({
        data: {
          totalSent: 10000,
          delivered: 9500,
          failed: 500,
          byPlatform: {
            android: 6000,
            ios: 3500,
            web: 500
          },
          byProvider: {
            firebase: 9000,
            webPush: 500,
            azure: 300,
            aws: 200
          },
          clickThrough: {
            total: 2000,
            rate: 0.21
          }
        },
        error: null
      });
      
      const stats = await pushService.getPushStats(timeRange);
      
      expect(stats.totalSent).toBe(10000);
      expect(stats.deliveryRate).toBeCloseTo(0.95);
      expect(stats.clickThroughRate).toBeCloseTo(0.21);
    });

    it('应该获取平台性能统计', async () => {
      const platformStats = await pushService.getPlatformPerformanceStats();
      
      expect(platformStats).toBeDefined();
      expect(platformStats.android).toBeDefined();
      expect(platformStats.ios).toBeDefined();
      expect(platformStats.web).toBeDefined();
    });

    it('应该生成推送通知报告', async () => {
      const reportOptions = {
        type: 'weekly',
        year: 2023,
        week: 1,
        format: 'json'
      };
      
      const report = await pushService.generateReport(reportOptions);
      
      expect(report).toBeDefined();
      expect(report.summary).toBeDefined();
      expect(report.details).toBeDefined();
    });

    it('应该跟踪推送通知点击', async () => {
      const notificationId = 'notification-123';
      const userId = 'user-123';
      const deviceId = 'device-123';
      
      const result = await pushService.trackNotificationClick(
        notificationId,
        userId,
        deviceId
      );
      
      expect(result.success).toBe(true);
      
      expect(mockSupabase.from).toHaveBeenCalledWith('notification_clicks');
      
      expect(mockMonitoringService.recordPushEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'notification_clicked',
          notificationId,
          userId
        })
      );
    });

    it('应该获取用户参与度统计', async () => {
      const userId = 'user-123';
      const timeRange = {
        start: new Date('2023-01-01'),
        end: new Date('2023-01-31')
      };
      
      const engagement = await pushService.getUserEngagementStats(userId, timeRange);
      
      expect(engagement).toBeDefined();
      expect(engagement.notificationsReceived).toBeDefined();
      expect(engagement.notificationsClicked).toBeDefined();
      expect(engagement.engagementRate).toBeDefined();
    });
  });

  describe('便捷函数', () => {
    beforeEach(() => {
      // 设置全局推送通知服务实例
      global.pushNotificationService = pushService;
    });

    it('sendPushNotification 函数应该正常工作', async () => {
      const notification: PushNotification = {
        to: 'firebase-token-123',
        title: 'Test Notification',
        body: 'Test body'
      };
      
      const result = await sendPushNotification(notification);
      
      expect(result.success).toBe(true);
    });

    it('sendBulkPushNotifications 函数应该正常工作', async () => {
      const bulkRequest: BulkPushRequest = {
        tokens: ['token-1', 'token-2'],
        title: 'Bulk Test',
        body: 'Bulk test body'
      };
      
      const result = await sendBulkPushNotifications(bulkRequest);
      
      expect(result.success).toBe(true);
    });

    it('subscribeToTopic 函数应该正常工作', async () => {
      const tokens = ['token-1', 'token-2'];
      const topic = 'test_topic';
      
      mockFirebaseAdmin.messaging().subscribeToTopic.mockResolvedValue({
        successCount: 2,
        failureCount: 0,
        errors: []
      });
      
      const result = await subscribeToTopic(tokens, topic);
      
      expect(result.success).toBe(true);
    });

    it('unsubscribeFromTopic 函数应该正常工作', async () => {
      const tokens = ['token-1', 'token-2'];
      const topic = 'test_topic';
      
      mockFirebaseAdmin.messaging().unsubscribeFromTopic.mockResolvedValue({
        successCount: 2,
        failureCount: 0,
        errors: []
      });
      
      const result = await unsubscribeFromTopic(tokens, topic);
      
      expect(result.success).toBe(true);
    });
  });

  describe('错误处理', () => {
    beforeEach(async () => {
      await pushService.initialize();
    });

    it('应该处理Firebase初始化错误', async () => {
      mockFirebaseAdmin.initializeApp.mockImplementation(() => {
        throw new Error('Firebase initialization failed');
      });
      
      await expect(pushService.initializeFirebase())
        .rejects.toThrow('Firebase initialization failed');
    });

    it('应该处理无效的设备令牌', async () => {
      mockFirebaseAdmin.messaging().send.mockRejectedValue(
        new Error('Invalid registration token')
      );
      
      await expect(
        pushService.sendPushNotification({
          to: 'invalid-token',
          title: 'Test',
          body: 'Test'
        })
      ).rejects.toThrow('Invalid registration token');
    });

    it('应该处理网络连接错误', async () => {
      mockFirebaseAdmin.messaging().send.mockRejectedValue(
        new Error('Network connection failed')
      );
      
      await expect(
        pushService.sendPushNotification({
          to: 'firebase-token-123',
          title: 'Test',
          body: 'Test'
        })
      ).rejects.toThrow('Network connection failed');
    });

    it('应该处理数据库连接错误', async () => {
      mockSupabase.from().insert().then.mockRejectedValue(
        new Error('Database connection failed')
      );
      
      // 应该降级到不记录数据库
      const result = await pushService.sendPushNotification({
        to: 'firebase-token-123',
        title: 'Test',
        body: 'Test'
      });
      
      expect(result.success).toBe(true);
      expect(mockFirebaseAdmin.messaging().send).toHaveBeenCalled();
    });

    it('应该处理Redis连接错误', async () => {
      mockRedis.set.mockRejectedValue(new Error('Redis connection failed'));
      
      // 应该降级到不使用缓存
      const result = await pushService.registerDeviceToken({
        userId: 'user-123',
        token: 'token-123',
        platform: 'android'
      });
      
      expect(result.success).toBe(true);
    });

    it('应该处理模板渲染错误', async () => {
      mockHandlebars.compile.mockImplementation(() => {
        throw new Error('Template compilation failed');
      });
      
      await expect(
        pushService.renderTemplate(
          { title: 'Invalid {{template}}' },
          { template: 'value' }
        )
      ).rejects.toThrow('Template compilation failed');
    });
  });

  describe('性能测试', () => {
    beforeEach(async () => {
      await pushService.initialize();
    });

    it('应该高效处理批量推送通知', async () => {
      const tokens = Array.from({ length: 1000 }, (_, i) => `token-${i}`);
      
      const { duration } = await testUtils.performanceUtils.measureTime(async () => {
        return pushService.sendBulkPushNotifications({
          tokens,
          title: 'Performance Test',
          body: 'Testing bulk performance'
        });
      });
      
      expect(duration).toBeLessThan(15000); // 应该在15秒内完成
    });

    it('应该优化设备令牌验证性能', async () => {
      const tokens = Array.from({ length: 100 }, (_, i) => `token-${i}`);
      
      const { duration } = await testUtils.performanceUtils.measureTime(async () => {
        return Promise.all(tokens.map(token => 
          pushService.validateDeviceToken(token, 'android')
        ));
      });
      
      expect(duration).toBeLessThan(10000); // 应该在10秒内完成
    });

    it('应该优化模板渲染性能', async () => {
      const templates = Array.from({ length: 100 }, (_, i) => ({
        title: `Template ${i}: Hello {{name}}!`,
        body: `Message ${i}: Welcome {{name}} to {{app}}!`
      }));
      
      const { duration } = await testUtils.performanceUtils.measureTime(async () => {
        return Promise.all(templates.map(template => 
          pushService.renderTemplate(template, { name: 'User', app: 'App' })
        ));
      });
      
      expect(duration).toBeLessThan(2000); // 应该在2秒内完成
    });
  });
});