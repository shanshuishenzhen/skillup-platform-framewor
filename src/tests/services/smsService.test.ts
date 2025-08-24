/**
 * 短信服务单元测试
 * 
 * 测试短信服务，包括：
 * - 短信发送和接收
 * - 短信模板管理
 * - 验证码生成和验证
 * - 批量短信发送
 * - 短信状态跟踪
 * - 短信统计和分析
 * - 短信内容过滤
 * - 错误处理和重试
 */

import { 
  SmsService,
  createSmsService,
  getSmsService,
  SmsMessage,
  SmsTemplate,
  SmsVerificationCode,
  SmsBatchRequest,
  SmsDeliveryReport,
  SmsStatistics,
  SmsProvider,
  SmsConfig,
  SmsStatus,
  SmsType,
  SendSmsOptions,
  VerificationCodeOptions,
  BatchSmsOptions,
  SmsFilterOptions
} from '../../services/smsService';
import { logger } from '../../utils/logger';
import { cacheService } from '../../services/cacheService';
import { analyticsService } from '../../services/analyticsService';
import { auditService } from '../../services/auditService';
import { supabaseClient } from '../../utils/supabase';
import { envConfig } from '../../config/envConfig';
import axios from 'axios';
import crypto from 'crypto';

// Mock 依赖
jest.mock('../../utils/logger');
jest.mock('../../services/cacheService');
jest.mock('../../services/analyticsService');
jest.mock('../../services/auditService');
jest.mock('../../utils/supabase');
jest.mock('../../config/envConfig');
jest.mock('axios');
jest.mock('crypto');

// 类型定义
interface SmsProviderConfig {
  name: string;
  apiKey: string;
  apiSecret: string;
  baseUrl: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  rateLimit: number;
  dailyLimit: number;
  enableDeliveryReport: boolean;
  enableContentFilter: boolean;
  signName: string;
  templatePrefix: string;
}

interface SmsRateLimit {
  perMinute: number;
  perHour: number;
  perDay: number;
  perMonth: number;
}

interface SmsContentFilter {
  enableKeywordFilter: boolean;
  enableLengthLimit: boolean;
  enablePhoneValidation: boolean;
  maxLength: number;
  bannedKeywords: string[];
  allowedCountries: string[];
}

// Mock 实例
const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  child: jest.fn().mockReturnThis()
};

const mockCacheService = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  keys: jest.fn(),
  mget: jest.fn(),
  mset: jest.fn(),
  incr: jest.fn(),
  expire: jest.fn(),
  zadd: jest.fn(),
  zrange: jest.fn(),
  zrem: jest.fn()
};

const mockAnalyticsService = {
  track: jest.fn(),
  increment: jest.fn(),
  histogram: jest.fn(),
  gauge: jest.fn(),
  timer: jest.fn()
};

const mockAuditService = {
  log: jest.fn(),
  logUserActivity: jest.fn()
};

const mockSupabaseClient = {
  from: jest.fn().mockReturnThis(),
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
};

const mockEnvConfig = {
  sms: {
    provider: 'aliyun',
    providers: {
      aliyun: {
        apiKey: 'test-api-key',
        apiSecret: 'test-api-secret',
        baseUrl: 'https://dysmsapi.aliyuncs.com',
        signName: 'SkillUp平台',
        timeout: 30000,
        retryAttempts: 3,
        retryDelay: 1000,
        rateLimit: 100,
        dailyLimit: 10000
      },
      tencent: {
        apiKey: 'test-tencent-key',
        apiSecret: 'test-tencent-secret',
        baseUrl: 'https://sms.tencentcloudapi.com',
        signName: 'SkillUp',
        timeout: 30000,
        retryAttempts: 3,
        retryDelay: 1000,
        rateLimit: 200,
        dailyLimit: 20000
      }
    },
    enableCache: true,
    cacheExpiry: 300,
    enableDeliveryReport: true,
    enableContentFilter: true,
    maxLength: 500,
    verificationCodeLength: 6,
    verificationCodeExpiry: 300,
    rateLimit: {
      perMinute: 10,
      perHour: 100,
      perDay: 1000,
      perMonth: 30000
    },
    contentFilter: {
      bannedKeywords: ['垃圾', '广告', '诈骗'],
      allowedCountries: ['CN', 'US', 'UK']
    }
  }
};

const mockAxios = {
  post: jest.fn(),
  get: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  create: jest.fn().mockReturnThis(),
  interceptors: {
    request: { use: jest.fn() },
    response: { use: jest.fn() }
  }
};

const mockCrypto = {
  randomBytes: jest.fn(),
  createHash: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  digest: jest.fn(),
  createHmac: jest.fn().mockReturnThis()
};

// 设置 Mock
(logger as unknown) = mockLogger;
(cacheService as unknown) = mockCacheService;
(analyticsService as unknown) = mockAnalyticsService;
(auditService as unknown) = mockAuditService;
(supabaseClient as unknown) = mockSupabaseClient;
(envConfig as unknown) = mockEnvConfig;
(axios as unknown) = mockAxios;
(crypto as unknown) = mockCrypto;

// 测试数据
const testSmsMessage: SmsMessage = {
  id: 'sms-123456',
  phoneNumber: '+8613800138000',
  content: '您的验证码是123456，5分钟内有效。',
  templateCode: 'SMS_001',
  templateParams: {
    code: '123456',
    expire: '5'
  },
  signName: 'SkillUp平台',
  status: SmsStatus.PENDING,
  type: SmsType.VERIFICATION,
  provider: SmsProvider.ALIYUN,
  createdAt: new Date(),
  sentAt: null,
  deliveredAt: null,
  failedAt: null,
  errorMessage: null,
  cost: 0.05,
  userId: 'user-123',
  sessionId: 'session-456'
};

const testSmsTemplate: SmsTemplate = {
  id: 'template-123',
  code: 'SMS_001',
  name: '验证码模板',
  content: '您的验证码是${code}，${expire}分钟内有效。',
  type: SmsType.VERIFICATION,
  provider: SmsProvider.ALIYUN,
  status: 'APPROVED',
  variables: ['code', 'expire'],
  description: '用户注册验证码模板',
  createdAt: new Date(),
  updatedAt: new Date(),
  approvedAt: new Date(),
  isActive: true
};

const testVerificationCode: SmsVerificationCode = {
  id: 'code-123',
  phoneNumber: '+8613800138000',
  code: '123456',
  type: 'REGISTER',
  expiresAt: new Date(Date.now() + 5 * 60 * 1000),
  attempts: 0,
  maxAttempts: 3,
  isUsed: false,
  createdAt: new Date(),
  usedAt: null,
  userId: 'user-123',
  sessionId: 'session-456'
};

const testBatchRequest: SmsBatchRequest = {
  id: 'batch-123',
  name: '营销短信批次',
  templateCode: 'SMS_002',
  templateParams: {
    productName: 'SkillUp课程',
    discount: '8折'
  },
  phoneNumbers: [
    '+8613800138001',
    '+8613800138002',
    '+8613800138003'
  ],
  signName: 'SkillUp平台',
  type: SmsType.MARKETING,
  provider: SmsProvider.ALIYUN,
  status: 'PENDING',
  totalCount: 3,
  sentCount: 0,
  deliveredCount: 0,
  failedCount: 0,
  createdAt: new Date(),
  startedAt: null,
  completedAt: null,
  userId: 'user-123'
};

const testDeliveryReport: SmsDeliveryReport = {
  messageId: 'sms-123456',
  phoneNumber: '+8613800138000',
  status: 'DELIVERED',
  deliveredAt: new Date(),
  errorCode: null,
  errorMessage: null,
  provider: SmsProvider.ALIYUN,
  cost: 0.05,
  reportedAt: new Date()
};

const testStatistics: SmsStatistics = {
  period: 'daily',
  date: '2024-01-01',
  totalSent: 1000,
  totalDelivered: 950,
  totalFailed: 50,
  deliveryRate: 0.95,
  failureRate: 0.05,
  totalCost: 50.0,
  averageCost: 0.05,
  byType: {
    [SmsType.VERIFICATION]: {
      sent: 600,
      delivered: 580,
      failed: 20,
      cost: 30.0
    },
    [SmsType.NOTIFICATION]: {
      sent: 300,
      delivered: 285,
      failed: 15,
      cost: 15.0
    },
    [SmsType.MARKETING]: {
      sent: 100,
      delivered: 85,
      failed: 15,
      cost: 5.0
    }
  },
  byProvider: {
    [SmsProvider.ALIYUN]: {
      sent: 700,
      delivered: 665,
      failed: 35,
      cost: 35.0
    },
    [SmsProvider.TENCENT]: {
      sent: 300,
      delivered: 285,
      failed: 15,
      cost: 15.0
    }
  }
};

describe('SMS Service', () => {
  let smsService: SmsService;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // 设置默认的mock返回值
    mockCacheService.get.mockResolvedValue(null);
    mockCacheService.set.mockResolvedValue(true);
    mockCacheService.incr.mockResolvedValue(1);
    mockAnalyticsService.track.mockResolvedValue(true);
    mockAuditService.log.mockResolvedValue(true);
    
    // 设置Supabase mock
    mockSupabaseClient.single.mockResolvedValue({
      data: testSmsMessage,
      error: null
    });
    
    mockSupabaseClient.then.mockResolvedValue({
      data: [testSmsMessage],
      error: null
    });
    
    // 设置axios mock
    mockAxios.post.mockResolvedValue({
      data: {
        Code: 'OK',
        Message: '发送成功',
        RequestId: 'request-123',
        BizId: 'biz-123'
      }
    });
    
    // 设置crypto mock
    mockCrypto.randomBytes.mockReturnValue(Buffer.from('123456'));
    mockCrypto.digest.mockReturnValue('hash-signature');
    
    smsService = createSmsService();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  /**
   * 服务初始化测试
   */
  describe('Service Initialization', () => {
    it('应该创建短信服务实例', () => {
      expect(smsService).toBeDefined();
      expect(mockLogger.info).toHaveBeenCalledWith(
        'SMS service initialized successfully'
      );
    });

    it('应该获取现有的服务实例', () => {
      const service1 = getSmsService();
      const service2 = getSmsService();
      
      expect(service1).toBe(service2);
    });

    it('应该初始化多个短信提供商', async () => {
      await smsService.initializeProviders();
      
      expect(mockLogger.info).toHaveBeenCalledWith(
        'SMS providers initialized',
        expect.objectContaining({
          providers: ['aliyun', 'tencent']
        })
      );
    });

    it('应该验证提供商配置', async () => {
      const isValid = await smsService.validateProviderConfig('aliyun');
      
      expect(isValid).toBe(true);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Provider config validated',
        expect.objectContaining({
          provider: 'aliyun'
        })
      );
    });
  });

  /**
   * 短信发送测试
   */
  describe('SMS Sending', () => {
    it('应该发送单条短信', async () => {
      const options: SendSmsOptions = {
        phoneNumber: '+8613800138000',
        templateCode: 'SMS_001',
        templateParams: {
          code: '123456',
          expire: '5'
        },
        signName: 'SkillUp平台',
        type: SmsType.VERIFICATION
      };
      
      const result = await smsService.sendSms(options);
      
      expect(result).toEqual(
        expect.objectContaining({
          success: true,
          messageId: expect.any(String),
          provider: SmsProvider.ALIYUN,
          cost: expect.any(Number)
        })
      );
      
      expect(mockAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('dysmsapi.aliyuncs.com'),
        expect.objectContaining({
          PhoneNumbers: '+8613800138000',
          TemplateCode: 'SMS_001',
          TemplateParam: JSON.stringify({
            code: '123456',
            expire: '5'
          }),
          SignName: 'SkillUp平台'
        }),
        expect.any(Object)
      );
      
      expect(mockSupabaseClient.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          phone_number: '+8613800138000',
          template_code: 'SMS_001',
          status: SmsStatus.SENT
        })
      );
    });

    it('应该选择最佳提供商', async () => {
      // 模拟阿里云达到限制
      mockCacheService.get.mockImplementation((key) => {
        if (key.includes('aliyun_rate_limit')) {
          return Promise.resolve(100); // 达到限制
        }
        return Promise.resolve(null);
      });
      
      const options: SendSmsOptions = {
        phoneNumber: '+8613800138000',
        templateCode: 'SMS_001',
        templateParams: { code: '123456' }
      };
      
      const result = await smsService.sendSms(options);
      
      expect(result.provider).toBe(SmsProvider.TENCENT);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Switched to alternative provider',
        expect.objectContaining({
          from: 'aliyun',
          to: 'tencent',
          reason: 'rate_limit_exceeded'
        })
      );
    });

    it('应该处理发送失败', async () => {
      mockAxios.post.mockResolvedValue({
        data: {
          Code: 'isv.BUSINESS_LIMIT_CONTROL',
          Message: '业务限流',
          RequestId: 'request-123'
        }
      });
      
      const options: SendSmsOptions = {
        phoneNumber: '+8613800138000',
        templateCode: 'SMS_001',
        templateParams: { code: '123456' }
      };
      
      const result = await smsService.sendSms(options);
      
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('isv.BUSINESS_LIMIT_CONTROL');
      expect(result.errorMessage).toBe('业务限流');
      
      expect(mockSupabaseClient.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          status: SmsStatus.FAILED,
          error_message: '业务限流'
        })
      );
    });

    it('应该重试失败的发送', async () => {
      mockAxios.post
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Timeout'))
        .mockResolvedValue({
          data: {
            Code: 'OK',
            Message: '发送成功',
            BizId: 'biz-123'
          }
        });
      
      const options: SendSmsOptions = {
        phoneNumber: '+8613800138000',
        templateCode: 'SMS_001',
        templateParams: { code: '123456' }
      };
      
      const result = await smsService.sendSms(options);
      
      expect(result.success).toBe(true);
      expect(mockAxios.post).toHaveBeenCalledTimes(3);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Retrying SMS send',
        expect.objectContaining({
          attempt: expect.any(Number),
          error: expect.any(String)
        })
      );
    });
  });

  /**
   * 验证码测试
   */
  describe('Verification Code', () => {
    it('应该生成验证码', async () => {
      mockCrypto.randomBytes.mockReturnValue(Buffer.from([1, 2, 3, 4, 5, 6]));
      
      const options: VerificationCodeOptions = {
        phoneNumber: '+8613800138000',
        type: 'REGISTER',
        length: 6,
        expiryMinutes: 5
      };
      
      const result = await smsService.generateVerificationCode(options);
      
      expect(result).toEqual(
        expect.objectContaining({
          code: expect.stringMatching(/^\d{6}$/),
          phoneNumber: '+8613800138000',
          type: 'REGISTER',
          expiresAt: expect.any(Date)
        })
      );
      
      expect(mockSupabaseClient.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          phone_number: '+8613800138000',
          code: expect.stringMatching(/^\d{6}$/),
          type: 'REGISTER'
        })
      );
    });

    it('应该发送验证码短信', async () => {
      const options: VerificationCodeOptions = {
        phoneNumber: '+8613800138000',
        type: 'REGISTER',
        templateCode: 'SMS_001'
      };
      
      const result = await smsService.sendVerificationCode(options);
      
      expect(result).toEqual(
        expect.objectContaining({
          success: true,
          codeId: expect.any(String),
          messageId: expect.any(String),
          expiresAt: expect.any(Date)
        })
      );
      
      expect(mockAxios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          TemplateCode: 'SMS_001',
          TemplateParam: expect.stringContaining('code')
        }),
        expect.any(Object)
      );
    });

    it('应该验证验证码', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: {
          ...testVerificationCode,
          code: '123456',
          expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
          is_used: false,
          attempts: 0
        },
        error: null
      });
      
      const result = await smsService.verifyCode('+8613800138000', '123456', 'REGISTER');
      
      expect(result).toEqual(
        expect.objectContaining({
          valid: true,
          codeId: expect.any(String)
        })
      );
      
      expect(mockSupabaseClient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          is_used: true,
          used_at: expect.any(String)
        })
      );
    });

    it('应该处理验证码过期', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: {
          ...testVerificationCode,
          code: '123456',
          expires_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 已过期
          is_used: false
        },
        error: null
      });
      
      const result = await smsService.verifyCode('+8613800138000', '123456', 'REGISTER');
      
      expect(result).toEqual(
        expect.objectContaining({
          valid: false,
          reason: 'EXPIRED'
        })
      );
    });

    it('应该处理验证码错误', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: {
          ...testVerificationCode,
          code: '654321', // 错误的验证码
          expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
          is_used: false,
          attempts: 1
        },
        error: null
      });
      
      const result = await smsService.verifyCode('+8613800138000', '123456', 'REGISTER');
      
      expect(result).toEqual(
        expect.objectContaining({
          valid: false,
          reason: 'INVALID_CODE',
          attemptsLeft: 2
        })
      );
      
      expect(mockSupabaseClient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          attempts: 2
        })
      );
    });

    it('应该限制验证码尝试次数', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: {
          ...testVerificationCode,
          code: '654321',
          expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
          is_used: false,
          attempts: 3, // 已达到最大尝试次数
          max_attempts: 3
        },
        error: null
      });
      
      const result = await smsService.verifyCode('+8613800138000', '123456', 'REGISTER');
      
      expect(result).toEqual(
        expect.objectContaining({
          valid: false,
          reason: 'MAX_ATTEMPTS_EXCEEDED'
        })
      );
    });
  });

  /**
   * 批量短信测试
   */
  describe('Batch SMS', () => {
    it('应该创建批量短信任务', async () => {
      const options: BatchSmsOptions = {
        name: '营销短信批次',
        templateCode: 'SMS_002',
        templateParams: {
          productName: 'SkillUp课程',
          discount: '8折'
        },
        phoneNumbers: [
          '+8613800138001',
          '+8613800138002',
          '+8613800138003'
        ],
        type: SmsType.MARKETING,
        scheduleAt: new Date(Date.now() + 60 * 60 * 1000) // 1小时后发送
      };
      
      const result = await smsService.createBatchSms(options);
      
      expect(result).toEqual(
        expect.objectContaining({
          batchId: expect.any(String),
          totalCount: 3,
          status: 'SCHEDULED'
        })
      );
      
      expect(mockSupabaseClient.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          name: '营销短信批次',
          template_code: 'SMS_002',
          phone_numbers: [
            '+8613800138001',
            '+8613800138002',
            '+8613800138003'
          ],
          total_count: 3,
          status: 'SCHEDULED'
        })
      );
    });

    it('应该执行批量短信发送', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: {
          ...testBatchRequest,
          status: 'PENDING'
        },
        error: null
      });
      
      const result = await smsService.executeBatchSms('batch-123');
      
      expect(result).toEqual(
        expect.objectContaining({
          success: true,
          batchId: 'batch-123',
          sentCount: 3,
          failedCount: 0
        })
      );
      
      expect(mockAxios.post).toHaveBeenCalledTimes(3); // 3条短信
      expect(mockSupabaseClient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'COMPLETED',
          sent_count: 3,
          completed_at: expect.any(String)
        })
      );
    });

    it('应该处理批量发送中的部分失败', async () => {
      mockAxios.post
        .mockResolvedValueOnce({ data: { Code: 'OK', BizId: 'biz-1' } })
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ data: { Code: 'OK', BizId: 'biz-3' } });
      
      const result = await smsService.executeBatchSms('batch-123');
      
      expect(result).toEqual(
        expect.objectContaining({
          success: true,
          sentCount: 2,
          failedCount: 1,
          errors: expect.arrayContaining([
            expect.objectContaining({
              phoneNumber: '+8613800138002',
              error: 'Network error'
            })
          ])
        })
      );
    });

    it('应该获取批量短信状态', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: {
          ...testBatchRequest,
          status: 'COMPLETED',
          sent_count: 3,
          delivered_count: 2,
          failed_count: 1
        },
        error: null
      });
      
      const status = await smsService.getBatchSmsStatus('batch-123');
      
      expect(status).toEqual(
        expect.objectContaining({
          batchId: 'batch-123',
          status: 'COMPLETED',
          totalCount: 3,
          sentCount: 3,
          deliveredCount: 2,
          failedCount: 1,
          progress: 1.0
        })
      );
    });

    it('应该取消批量短信任务', async () => {
      const result = await smsService.cancelBatchSms('batch-123');
      
      expect(result.success).toBe(true);
      expect(mockSupabaseClient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'CANCELLED',
          cancelled_at: expect.any(String)
        })
      );
    });
  });

  /**
   * 短信模板测试
   */
  describe('SMS Templates', () => {
    it('应该创建短信模板', async () => {
      const templateData = {
        code: 'SMS_003',
        name: '新用户欢迎',
        content: '欢迎加入${platform}！您的账号${username}已激活。',
        type: SmsType.NOTIFICATION,
        variables: ['platform', 'username']
      };
      
      const result = await smsService.createTemplate(templateData);
      
      expect(result).toEqual(
        expect.objectContaining({
          templateId: expect.any(String),
          code: 'SMS_003',
          status: 'PENDING_APPROVAL'
        })
      );
      
      expect(mockSupabaseClient.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'SMS_003',
          name: '新用户欢迎',
          content: '欢迎加入${platform}！您的账号${username}已激活。',
          type: SmsType.NOTIFICATION,
          variables: ['platform', 'username'],
          status: 'PENDING_APPROVAL'
        })
      );
    });

    it('应该验证模板变量', async () => {
      const templateContent = '您的验证码是${code}，${expire}分钟内有效。';
      const templateParams = {
        code: '123456',
        expire: '5'
      };
      
      const isValid = await smsService.validateTemplateParams(
        templateContent,
        templateParams
      );
      
      expect(isValid).toBe(true);
    });

    it('应该检测缺失的模板变量', async () => {
      const templateContent = '您的验证码是${code}，${expire}分钟内有效。';
      const templateParams = {
        code: '123456'
        // 缺少 expire 参数
      };
      
      await expect(
        smsService.validateTemplateParams(templateContent, templateParams)
      ).rejects.toThrow('Missing template variables: expire');
    });

    it('应该渲染短信内容', async () => {
      const templateContent = '欢迎加入${platform}！您的账号${username}已激活。';
      const templateParams = {
        platform: 'SkillUp平台',
        username: 'testuser'
      };
      
      const renderedContent = await smsService.renderTemplate(
        templateContent,
        templateParams
      );
      
      expect(renderedContent).toBe('欢迎加入SkillUp平台！您的账号testuser已激活。');
    });

    it('应该获取模板列表', async () => {
      mockSupabaseClient.then.mockResolvedValue({
        data: [testSmsTemplate],
        error: null
      });
      
      const templates = await smsService.getTemplates({
        type: SmsType.VERIFICATION,
        status: 'APPROVED'
      });
      
      expect(templates).toHaveLength(1);
      expect(templates[0]).toEqual(
        expect.objectContaining({
          code: 'SMS_001',
          type: SmsType.VERIFICATION,
          status: 'APPROVED'
        })
      );
    });
  });

  /**
   * 短信状态跟踪测试
   */
  describe('SMS Status Tracking', () => {
    it('应该处理送达报告', async () => {
      const deliveryReport = {
        messageId: 'sms-123456',
        status: 'DELIVERED',
        deliveredAt: new Date().toISOString(),
        provider: 'aliyun'
      };
      
      const result = await smsService.handleDeliveryReport(deliveryReport);
      
      expect(result.success).toBe(true);
      expect(mockSupabaseClient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: SmsStatus.DELIVERED,
          delivered_at: expect.any(String)
        })
      );
    });

    it('应该跟踪短信状态变化', async () => {
      const statusUpdate = {
        messageId: 'sms-123456',
        oldStatus: SmsStatus.SENT,
        newStatus: SmsStatus.DELIVERED,
        timestamp: new Date()
      };
      
      await smsService.trackStatusChange(statusUpdate);
      
      expect(mockAuditService.log).toHaveBeenCalledWith(
        'sms_status_change',
        expect.objectContaining({
          messageId: 'sms-123456',
          oldStatus: SmsStatus.SENT,
          newStatus: SmsStatus.DELIVERED
        })
      );
      
      expect(mockAnalyticsService.track).toHaveBeenCalledWith(
        'sms.status.changed',
        expect.objectContaining({
          messageId: 'sms-123456',
          status: SmsStatus.DELIVERED
        })
      );
    });

    it('应该获取短信详细状态', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: {
          ...testSmsMessage,
          status: SmsStatus.DELIVERED,
          delivered_at: new Date().toISOString()
        },
        error: null
      });
      
      const status = await smsService.getSmsStatus('sms-123456');
      
      expect(status).toEqual(
        expect.objectContaining({
          messageId: 'sms-123456',
          status: SmsStatus.DELIVERED,
          deliveredAt: expect.any(Date),
          timeline: expect.any(Array)
        })
      );
    });
  });

  /**
   * 短信统计测试
   */
  describe('SMS Statistics', () => {
    it('应该生成日统计', async () => {
      mockSupabaseClient.then.mockResolvedValue({
        data: [
          { status: SmsStatus.DELIVERED, count: 950, total_cost: 47.5 },
          { status: SmsStatus.FAILED, count: 50, total_cost: 2.5 }
        ],
        error: null
      });
      
      const stats = await smsService.getDailyStatistics('2024-01-01');
      
      expect(stats).toEqual(
        expect.objectContaining({
          date: '2024-01-01',
          totalSent: 1000,
          totalDelivered: 950,
          totalFailed: 50,
          deliveryRate: 0.95,
          totalCost: 50.0
        })
      );
    });

    it('应该生成月统计', async () => {
      const stats = await smsService.getMonthlyStatistics('2024-01');
      
      expect(stats).toEqual(
        expect.objectContaining({
          month: '2024-01',
          totalSent: expect.any(Number),
          totalDelivered: expect.any(Number),
          deliveryRate: expect.any(Number),
          totalCost: expect.any(Number),
          dailyBreakdown: expect.any(Array)
        })
      );
    });

    it('应该按类型统计', async () => {
      const stats = await smsService.getStatisticsByType('2024-01-01');
      
      expect(stats).toEqual(
        expect.objectContaining({
          [SmsType.VERIFICATION]: expect.objectContaining({
            sent: expect.any(Number),
            delivered: expect.any(Number),
            cost: expect.any(Number)
          }),
          [SmsType.NOTIFICATION]: expect.objectContaining({
            sent: expect.any(Number),
            delivered: expect.any(Number),
            cost: expect.any(Number)
          })
        })
      );
    });

    it('应该按提供商统计', async () => {
      const stats = await smsService.getStatisticsByProvider('2024-01-01');
      
      expect(stats).toEqual(
        expect.objectContaining({
          [SmsProvider.ALIYUN]: expect.objectContaining({
            sent: expect.any(Number),
            delivered: expect.any(Number),
            cost: expect.any(Number)
          }),
          [SmsProvider.TENCENT]: expect.objectContaining({
            sent: expect.any(Number),
            delivered: expect.any(Number),
            cost: expect.any(Number)
          })
        })
      );
    });
  });

  /**
   * 内容过滤测试
   */
  describe('Content Filtering', () => {
    it('应该过滤敏感词汇', async () => {
      const content = '这是一条包含垃圾信息的短信';
      
      const result = await smsService.filterContent(content);
      
      expect(result).toEqual(
        expect.objectContaining({
          isAllowed: false,
          reason: 'BANNED_KEYWORDS',
          detectedKeywords: ['垃圾']
        })
      );
    });

    it('应该检查短信长度', async () => {
      const longContent = 'x'.repeat(600); // 超过500字符限制
      
      const result = await smsService.filterContent(longContent);
      
      expect(result).toEqual(
        expect.objectContaining({
          isAllowed: false,
          reason: 'CONTENT_TOO_LONG',
          actualLength: 600,
          maxLength: 500
        })
      );
    });

    it('应该验证手机号格式', async () => {
      const invalidPhone = '1234567890';
      
      const isValid = await smsService.validatePhoneNumber(invalidPhone);
      
      expect(isValid).toEqual(
        expect.objectContaining({
          valid: false,
          reason: 'INVALID_FORMAT'
        })
      );
    });

    it('应该检查国家限制', async () => {
      const foreignPhone = '+1234567890'; // 美国号码，但不在允许列表中
      
      const isValid = await smsService.validatePhoneNumber(foreignPhone);
      
      expect(isValid).toEqual(
        expect.objectContaining({
          valid: false,
          reason: 'COUNTRY_NOT_ALLOWED',
          country: 'US'
        })
      );
    });
  });

  /**
   * 频率限制测试
   */
  describe('Rate Limiting', () => {
    it('应该检查发送频率限制', async () => {
      mockCacheService.incr.mockResolvedValue(11); // 超过每分钟10条限制
      
      const options: SendSmsOptions = {
        phoneNumber: '+8613800138000',
        templateCode: 'SMS_001',
        templateParams: { code: '123456' }
      };
      
      await expect(smsService.sendSms(options))
        .rejects.toThrow('Rate limit exceeded');
      
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'SMS rate limit exceeded',
        expect.objectContaining({
          phoneNumber: '+8613800138000',
          limit: 'per_minute'
        })
      );
    });

    it('应该检查日发送限制', async () => {
      mockCacheService.get.mockResolvedValue(1001); // 超过每日1000条限制
      
      const options: SendSmsOptions = {
        phoneNumber: '+8613800138000',
        templateCode: 'SMS_001',
        templateParams: { code: '123456' }
      };
      
      await expect(smsService.sendSms(options))
        .rejects.toThrow('Daily limit exceeded');
    });

    it('应该检查提供商限制', async () => {
      mockCacheService.get.mockImplementation((key) => {
        if (key.includes('aliyun_daily_count')) {
          return Promise.resolve(10001); // 超过阿里云日限制
        }
        return Promise.resolve(null);
      });
      
      const options: SendSmsOptions = {
        phoneNumber: '+8613800138000',
        templateCode: 'SMS_001',
        templateParams: { code: '123456' },
        provider: SmsProvider.ALIYUN
      };
      
      const result = await smsService.sendSms(options);
      
      expect(result.provider).toBe(SmsProvider.TENCENT); // 自动切换到腾讯云
    });
  });

  /**
   * 错误处理测试
   */
  describe('Error Handling', () => {
    it('应该处理网络错误', async () => {
      mockAxios.post.mockRejectedValue(new Error('Network timeout'));
      
      const options: SendSmsOptions = {
        phoneNumber: '+8613800138000',
        templateCode: 'SMS_001',
        templateParams: { code: '123456' }
      };
      
      const result = await smsService.sendSms(options);
      
      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain('Network timeout');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'SMS send failed',
        expect.objectContaining({
          error: 'Network timeout',
          phoneNumber: '+8613800138000'
        })
      );
    });

    it('应该处理API错误', async () => {
      mockAxios.post.mockResolvedValue({
        data: {
          Code: 'isv.MOBILE_NUMBER_ILLEGAL',
          Message: '手机号码格式错误',
          RequestId: 'request-123'
        }
      });
      
      const options: SendSmsOptions = {
        phoneNumber: 'invalid-phone',
        templateCode: 'SMS_001',
        templateParams: { code: '123456' }
      };
      
      const result = await smsService.sendSms(options);
      
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('isv.MOBILE_NUMBER_ILLEGAL');
      expect(result.errorMessage).toBe('手机号码格式错误');
    });

    it('应该处理数据库错误', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: null,
        error: { message: 'Database connection failed' }
      });
      
      await expect(smsService.getSmsStatus('sms-123456'))
        .rejects.toThrow('Database connection failed');
      
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Database error in SMS service',
        expect.objectContaining({
          error: 'Database connection failed'
        })
      );
    });
  });

  /**
   * 性能测试
   */
  describe('Performance Tests', () => {
    it('应该高效处理大批量短信', async () => {
      const phoneNumbers = Array.from({ length: 1000 }, (_, i) => 
        `+861380013${String(i).padStart(4, '0')}`
      );
      
      const options: BatchSmsOptions = {
        name: '大批量测试',
        templateCode: 'SMS_001',
        templateParams: { code: '123456' },
        phoneNumbers,
        type: SmsType.VERIFICATION
      };
      
      const startTime = Date.now();
      const result = await smsService.createBatchSms(options);
      const executionTime = Date.now() - startTime;
      
      expect(executionTime).toBeLessThan(5000); // 5秒内完成
      expect(result.totalCount).toBe(1000);
      expect(mockAnalyticsService.histogram).toHaveBeenCalledWith(
        'sms.batch.creation.duration',
        executionTime
      );
    });

    it('应该有效利用缓存', async () => {
      const cacheKey = 'sms_template_SMS_001';
      
      // 第一次调用
      await smsService.getTemplate('SMS_001');
      
      // 第二次调用应该使用缓存
      mockCacheService.get.mockResolvedValue(testSmsTemplate);
      
      await smsService.getTemplate('SMS_001');
      
      expect(mockCacheService.get).toHaveBeenCalledWith(cacheKey);
      expect(mockSupabaseClient.single).toHaveBeenCalledTimes(1); // 只查询一次数据库
    });

    it('应该优化内存使用', async () => {
      const largePhoneList = Array.from({ length: 10000 }, (_, i) => 
        `+861380013${String(i).padStart(4, '0')}`
      );
      
      const options: BatchSmsOptions = {
        name: '内存测试',
        templateCode: 'SMS_001',
        templateParams: { code: '123456' },
        phoneNumbers: largePhoneList,
        type: SmsType.VERIFICATION
      };
      
      const result = await smsService.createBatchSms(options);
      
      expect(result.totalCount).toBe(10000);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Processing large batch SMS',
        expect.objectContaining({
          count: 10000
        })
      );
    });
  });

  /**
   * 边界情况测试
   */
  describe('Edge Cases', () => {
    it('应该处理空手机号', async () => {
      const options: SendSmsOptions = {
        phoneNumber: '',
        templateCode: 'SMS_001',
        templateParams: { code: '123456' }
      };
      
      await expect(smsService.sendSms(options))
        .rejects.toThrow('Phone number is required');
    });

    it('应该处理空模板参数', async () => {
      const options: SendSmsOptions = {
        phoneNumber: '+8613800138000',
        templateCode: 'SMS_001',
        templateParams: {}
      };
      
      await expect(smsService.sendSms(options))
        .rejects.toThrow('Template parameters are required');
    });

    it('应该处理无效的模板代码', async () => {
      const options: SendSmsOptions = {
        phoneNumber: '+8613800138000',
        templateCode: 'INVALID_TEMPLATE',
        templateParams: { code: '123456' }
      };
      
      mockAxios.post.mockResolvedValue({
        data: {
          Code: 'isv.TEMPLATE_MISSING',
          Message: '短信模板不存在'
        }
      });
      
      const result = await smsService.sendSms(options);
      
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('isv.TEMPLATE_MISSING');
    });

    it('应该处理特殊字符', async () => {
      const options: SendSmsOptions = {
        phoneNumber: '+8613800138000',
        templateCode: 'SMS_001',
        templateParams: {
          code: '123456',
          message: '包含特殊字符：@#$%^&*()'
        }
      };
      
      const result = await smsService.sendSms(options);
      
      expect(result.success).toBe(true);
      expect(mockAxios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          TemplateParam: expect.stringContaining('包含特殊字符：@#$%^&*()')
        }),
        expect.any(Object)
      );
    });

    it('应该处理超长验证码', async () => {
      const options: VerificationCodeOptions = {
        phoneNumber: '+8613800138000',
        type: 'REGISTER',
        length: 20 // 超长验证码
      };
      
      await expect(smsService.generateVerificationCode(options))
        .rejects.toThrow('Verification code length must be between 4 and 8');
    });
  });
});