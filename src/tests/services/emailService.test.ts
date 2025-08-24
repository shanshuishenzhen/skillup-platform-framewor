/**
 * 邮件服务单元测试
 * 
 * 测试邮件服务，包括：
 * - 邮件发送和接收
 * - 邮件模板渲染
 * - 附件处理
 * - 邮件队列管理
 * - 邮件状态跟踪
 * - 邮件统计和分析
 * - 邮件内容过滤
 * - 错误处理和重试
 */

import { 
  EmailService,
  createEmailService,
  getEmailService,
  EmailMessage,
  EmailTemplate,
  EmailAttachment,
  EmailQueue,
  EmailDeliveryReport,
  EmailStatistics,
  EmailProvider,
  EmailConfig,
  EmailStatus,
  EmailType,
  SendEmailOptions,
  EmailTemplateOptions,
  BulkEmailOptions,
  EmailFilterOptions
} from '../../services/emailService';
import { logger } from '../../utils/logger';
import { cacheService } from '../../services/cacheService';
import { analyticsService } from '../../services/analyticsService';
import { auditService } from '../../services/auditService';
import { supabaseClient } from '../../utils/supabase';
import { envConfig } from '../../config/envConfig';
import nodemailer from 'nodemailer';
import handlebars from 'handlebars';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Mock 依赖
jest.mock('../../utils/logger');
jest.mock('../../services/cacheService');
jest.mock('../../services/analyticsService');
jest.mock('../../services/auditService');
jest.mock('../../utils/supabase');
jest.mock('../../config/envConfig');
jest.mock('nodemailer');
jest.mock('handlebars');
jest.mock('fs');
jest.mock('path');
jest.mock('crypto');

// 类型定义
interface EmailProviderConfig {
  name: string;
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  pool: boolean;
  maxConnections: number;
  maxMessages: number;
  rateDelta: number;
  rateLimit: number;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
}

interface EmailRateLimit {
  perMinute: number;
  perHour: number;
  perDay: number;
  perMonth: number;
}

interface EmailContentFilter {
  enableSpamFilter: boolean;
  enableVirusScanner: boolean;
  enableLinkScanner: boolean;
  maxAttachmentSize: number;
  allowedAttachmentTypes: string[];
  bannedKeywords: string[];
  maxRecipients: number;
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
  email: {
    provider: 'smtp',
    providers: {
      smtp: {
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
          user: 'test@skillup.com',
          pass: 'test-password'
        },
        pool: true,
        maxConnections: 5,
        maxMessages: 100,
        rateDelta: 1000,
        rateLimit: 5
      },
      sendgrid: {
        apiKey: 'test-sendgrid-key',
        from: 'noreply@skillup.com',
        replyTo: 'support@skillup.com'
      },
      ses: {
        accessKeyId: 'test-access-key',
        secretAccessKey: 'test-secret-key',
        region: 'us-east-1'
      }
    },
    enableQueue: true,
    queueConcurrency: 10,
    enableTracking: true,
    enableDeliveryReport: true,
    enableContentFilter: true,
    maxAttachmentSize: 10485760, // 10MB
    allowedAttachmentTypes: ['.pdf', '.doc', '.docx', '.jpg', '.png'],
    rateLimit: {
      perMinute: 60,
      perHour: 1000,
      perDay: 10000,
      perMonth: 300000
    },
    contentFilter: {
      bannedKeywords: ['spam', 'phishing', 'scam'],
      maxRecipients: 100
    },
    templates: {
      directory: './templates/email',
      cache: true,
      cacheExpiry: 3600
    }
  }
};

const mockTransporter = {
  sendMail: jest.fn(),
  verify: jest.fn(),
  close: jest.fn()
};

const mockNodemailer = {
  createTransporter: jest.fn().mockReturnValue(mockTransporter),
  createTestAccount: jest.fn(),
  getTestMessageUrl: jest.fn()
};

const mockHandlebars = {
  compile: jest.fn(),
  registerHelper: jest.fn(),
  registerPartial: jest.fn()
};

const mockFs = {
  readFileSync: jest.fn(),
  existsSync: jest.fn(),
  statSync: jest.fn(),
  createReadStream: jest.fn()
};

const mockPath = {
  join: jest.fn(),
  extname: jest.fn(),
  basename: jest.fn(),
  dirname: jest.fn()
};

const mockCrypto = {
  randomBytes: jest.fn(),
  createHash: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  digest: jest.fn()
};

// 设置 Mock
(logger as unknown) = mockLogger;
(cacheService as unknown) = mockCacheService;
(analyticsService as unknown) = mockAnalyticsService;
(auditService as unknown) = mockAuditService;
(supabaseClient as unknown) = mockSupabaseClient;
(envConfig as unknown) = mockEnvConfig;
(nodemailer as unknown) = mockNodemailer;
(handlebars as unknown) = mockHandlebars;
(fs as unknown) = mockFs;
(path as unknown) = mockPath;
(crypto as unknown) = mockCrypto;

// 测试数据
const testEmailMessage: EmailMessage = {
  id: 'email-123456',
  from: 'noreply@skillup.com',
  to: ['user@example.com'],
  cc: [],
  bcc: [],
  subject: '欢迎加入SkillUp平台',
  html: '<h1>欢迎加入SkillUp平台</h1><p>感谢您的注册！</p>',
  text: '欢迎加入SkillUp平台\n\n感谢您的注册！',
  attachments: [],
  templateId: 'welcome-template',
  templateData: {
    userName: '张三',
    platform: 'SkillUp'
  },
  status: EmailStatus.PENDING,
  type: EmailType.WELCOME,
  provider: EmailProvider.SMTP,
  priority: 'normal',
  scheduledAt: null,
  createdAt: new Date(),
  sentAt: null,
  deliveredAt: null,
  openedAt: null,
  clickedAt: null,
  failedAt: null,
  errorMessage: null,
  userId: 'user-123',
  sessionId: 'session-456',
  trackingId: 'track-789'
};

const testEmailTemplate: EmailTemplate = {
  id: 'template-123',
  name: '欢迎邮件模板',
  subject: '欢迎加入{{platform}}',
  html: '<h1>欢迎加入{{platform}}</h1><p>亲爱的{{userName}}，感谢您的注册！</p>',
  text: '欢迎加入{{platform}}\n\n亲爱的{{userName}}，感谢您的注册！',
  type: EmailType.WELCOME,
  variables: ['userName', 'platform'],
  isActive: true,
  version: 1,
  description: '用户注册欢迎邮件',
  createdAt: new Date(),
  updatedAt: new Date(),
  createdBy: 'admin-123'
};

const testEmailAttachment: EmailAttachment = {
  id: 'attachment-123',
  filename: 'course-guide.pdf',
  contentType: 'application/pdf',
  size: 1024000,
  path: '/uploads/attachments/course-guide.pdf',
  cid: 'course-guide',
  disposition: 'attachment',
  encoding: 'base64'
};

const testEmailQueue: EmailQueue = {
  id: 'queue-123',
  emailId: 'email-123456',
  priority: 'normal',
  attempts: 0,
  maxAttempts: 3,
  scheduledAt: new Date(),
  processedAt: null,
  completedAt: null,
  failedAt: null,
  errorMessage: null,
  status: 'pending',
  createdAt: new Date()
};

const testDeliveryReport: EmailDeliveryReport = {
  messageId: 'email-123456',
  trackingId: 'track-789',
  event: 'delivered',
  timestamp: new Date(),
  recipient: 'user@example.com',
  provider: EmailProvider.SMTP,
  metadata: {
    smtpId: 'smtp-123',
    ip: '192.168.1.1',
    userAgent: 'Mozilla/5.0...'
  }
};

const testStatistics: EmailStatistics = {
  period: 'daily',
  date: '2024-01-01',
  totalSent: 1000,
  totalDelivered: 950,
  totalOpened: 600,
  totalClicked: 200,
  totalBounced: 30,
  totalComplained: 5,
  totalUnsubscribed: 10,
  deliveryRate: 0.95,
  openRate: 0.63,
  clickRate: 0.33,
  bounceRate: 0.03,
  complaintRate: 0.005,
  unsubscribeRate: 0.01,
  byType: {
    [EmailType.WELCOME]: {
      sent: 300,
      delivered: 285,
      opened: 200,
      clicked: 80
    },
    [EmailType.NOTIFICATION]: {
      sent: 500,
      delivered: 475,
      opened: 300,
      clicked: 100
    },
    [EmailType.MARKETING]: {
      sent: 200,
      delivered: 190,
      opened: 100,
      clicked: 20
    }
  },
  byProvider: {
    [EmailProvider.SMTP]: {
      sent: 600,
      delivered: 570,
      opened: 360,
      clicked: 120
    },
    [EmailProvider.SENDGRID]: {
      sent: 400,
      delivered: 380,
      opened: 240,
      clicked: 80
    }
  }
};

describe('Email Service', () => {
  let emailService: EmailService;

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
      data: testEmailMessage,
      error: null
    });
    
    mockSupabaseClient.then.mockResolvedValue({
      data: [testEmailMessage],
      error: null
    });
    
    // 设置nodemailer mock
    mockTransporter.sendMail.mockResolvedValue({
      messageId: 'smtp-123456',
      response: '250 OK',
      accepted: ['user@example.com'],
      rejected: [],
      pending: []
    });
    
    mockTransporter.verify.mockResolvedValue(true);
    
    // 设置handlebars mock
    const mockCompiledTemplate = jest.fn().mockReturnValue(
      '<h1>欢迎加入SkillUp</h1><p>亲爱的张三，感谢您的注册！</p>'
    );
    mockHandlebars.compile.mockReturnValue(mockCompiledTemplate);
    
    // 设置fs mock
    mockFs.readFileSync.mockReturnValue(
      '<h1>欢迎加入{{platform}}</h1><p>亲爱的{{userName}}，感谢您的注册！</p>'
    );
    mockFs.existsSync.mockReturnValue(true);
    mockFs.statSync.mockReturnValue({ size: 1024 });
    
    // 设置path mock
    mockPath.join.mockImplementation((...args) => args.join('/'));
    mockPath.extname.mockReturnValue('.html');
    mockPath.basename.mockReturnValue('template.html');
    
    // 设置crypto mock
    mockCrypto.randomBytes.mockReturnValue(Buffer.from('random-bytes'));
    mockCrypto.digest.mockReturnValue('tracking-id-123');
    
    emailService = createEmailService();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  /**
   * 服务初始化测试
   */
  describe('Service Initialization', () => {
    it('应该创建邮件服务实例', () => {
      expect(emailService).toBeDefined();
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Email service initialized successfully'
      );
    });

    it('应该获取现有的服务实例', () => {
      const service1 = getEmailService();
      const service2 = getEmailService();
      
      expect(service1).toBe(service2);
    });

    it('应该初始化邮件传输器', async () => {
      await emailService.initializeTransporter();
      
      expect(mockNodemailer.createTransporter).toHaveBeenCalledWith(
        expect.objectContaining({
          host: 'smtp.gmail.com',
          port: 587,
          secure: false,
          auth: {
            user: 'test@skillup.com',
            pass: 'test-password'
          }
        })
      );
      
      expect(mockTransporter.verify).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Email transporter verified successfully'
      );
    });

    it('应该处理传输器验证失败', async () => {
      mockTransporter.verify.mockRejectedValue(new Error('Authentication failed'));
      
      await expect(emailService.initializeTransporter())
        .rejects.toThrow('Authentication failed');
      
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Email transporter verification failed',
        expect.objectContaining({
          error: 'Authentication failed'
        })
      );
    });
  });

  /**
   * 邮件发送测试
   */
  describe('Email Sending', () => {
    it('应该发送简单邮件', async () => {
      const options: SendEmailOptions = {
        to: 'user@example.com',
        subject: '测试邮件',
        html: '<p>这是一封测试邮件</p>',
        text: '这是一封测试邮件'
      };
      
      const result = await emailService.sendEmail(options);
      
      expect(result).toEqual(
        expect.objectContaining({
          success: true,
          messageId: expect.any(String),
          trackingId: expect.any(String)
        })
      );
      
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'noreply@skillup.com',
          to: 'user@example.com',
          subject: '测试邮件',
          html: '<p>这是一封测试邮件</p>',
          text: '这是一封测试邮件'
        })
      );
      
      expect(mockSupabaseClient.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          to_addresses: ['user@example.com'],
          subject: '测试邮件',
          status: EmailStatus.SENT
        })
      );
    });

    it('应该发送带附件的邮件', async () => {
      const options: SendEmailOptions = {
        to: 'user@example.com',
        subject: '带附件的邮件',
        html: '<p>请查看附件</p>',
        attachments: [testEmailAttachment]
      };
      
      const result = await emailService.sendEmail(options);
      
      expect(result.success).toBe(true);
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          attachments: expect.arrayContaining([
            expect.objectContaining({
              filename: 'course-guide.pdf',
              contentType: 'application/pdf'
            })
          ])
        })
      );
    });

    it('应该发送给多个收件人', async () => {
      const options: SendEmailOptions = {
        to: ['user1@example.com', 'user2@example.com'],
        cc: ['cc@example.com'],
        bcc: ['bcc@example.com'],
        subject: '群发邮件',
        html: '<p>群发测试</p>'
      };
      
      const result = await emailService.sendEmail(options);
      
      expect(result.success).toBe(true);
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: ['user1@example.com', 'user2@example.com'],
          cc: ['cc@example.com'],
          bcc: ['bcc@example.com']
        })
      );
    });

    it('应该处理发送失败', async () => {
      mockTransporter.sendMail.mockRejectedValue(new Error('SMTP Error'));
      
      const options: SendEmailOptions = {
        to: 'user@example.com',
        subject: '测试邮件',
        html: '<p>测试</p>'
      };
      
      const result = await emailService.sendEmail(options);
      
      expect(result.success).toBe(false);
      expect(result.errorMessage).toBe('SMTP Error');
      
      expect(mockSupabaseClient.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          status: EmailStatus.FAILED,
          error_message: 'SMTP Error'
        })
      );
    });

    it('应该重试失败的发送', async () => {
      mockTransporter.sendMail
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockResolvedValue({
          messageId: 'smtp-123456',
          response: '250 OK',
          accepted: ['user@example.com'],
          rejected: [],
          pending: []
        });
      
      const options: SendEmailOptions = {
        to: 'user@example.com',
        subject: '重试测试',
        html: '<p>重试测试</p>'
      };
      
      const result = await emailService.sendEmail(options);
      
      expect(result.success).toBe(true);
      expect(mockTransporter.sendMail).toHaveBeenCalledTimes(3);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Retrying email send',
        expect.objectContaining({
          attempt: expect.any(Number),
          error: expect.any(String)
        })
      );
    });
  });

  /**
   * 邮件模板测试
   */
  describe('Email Templates', () => {
    it('应该渲染邮件模板', async () => {
      const templateData = {
        userName: '张三',
        platform: 'SkillUp',
        activationLink: 'https://skillup.com/activate/123'
      };
      
      const result = await emailService.renderTemplate('welcome-template', templateData);
      
      expect(result).toEqual(
        expect.objectContaining({
          subject: '欢迎加入SkillUp',
          html: expect.stringContaining('张三'),
          text: expect.stringContaining('张三')
        })
      );
      
      expect(mockHandlebars.compile).toHaveBeenCalled();
    });

    it('应该缓存编译的模板', async () => {
      const templateData = { userName: '张三', platform: 'SkillUp' };
      
      // 第一次渲染
      await emailService.renderTemplate('welcome-template', templateData);
      
      // 第二次渲染应该使用缓存
      mockCacheService.get.mockResolvedValue({
        compiledSubject: mockHandlebars.compile(),
        compiledHtml: mockHandlebars.compile(),
        compiledText: mockHandlebars.compile()
      });
      
      await emailService.renderTemplate('welcome-template', templateData);
      
      expect(mockCacheService.get).toHaveBeenCalledWith(
        'email_template_welcome-template'
      );
    });

    it('应该使用模板发送邮件', async () => {
      const options: EmailTemplateOptions = {
        to: 'user@example.com',
        templateId: 'welcome-template',
        templateData: {
          userName: '张三',
          platform: 'SkillUp'
        }
      };
      
      const result = await emailService.sendTemplateEmail(options);
      
      expect(result.success).toBe(true);
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: expect.stringContaining('SkillUp'),
          html: expect.stringContaining('张三')
        })
      );
    });

    it('应该验证模板变量', async () => {
      const templateContent = '欢迎{{userName}}加入{{platform}}';
      const templateData = {
        userName: '张三'
        // 缺少 platform 变量
      };
      
      await expect(
        emailService.validateTemplateData(templateContent, templateData)
      ).rejects.toThrow('Missing template variables: platform');
    });

    it('应该创建新模板', async () => {
      const templateData = {
        name: '密码重置模板',
        subject: '重置您的密码',
        html: '<p>点击链接重置密码：{{resetLink}}</p>',
        text: '点击链接重置密码：{{resetLink}}',
        type: EmailType.PASSWORD_RESET,
        variables: ['resetLink']
      };
      
      const result = await emailService.createTemplate(templateData);
      
      expect(result).toEqual(
        expect.objectContaining({
          templateId: expect.any(String),
          name: '密码重置模板'
        })
      );
      
      expect(mockSupabaseClient.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          name: '密码重置模板',
          subject: '重置您的密码',
          type: EmailType.PASSWORD_RESET
        })
      );
    });

    it('应该更新模板', async () => {
      const updateData = {
        subject: '更新的主题',
        html: '<p>更新的内容</p>'
      };
      
      const result = await emailService.updateTemplate('template-123', updateData);
      
      expect(result.success).toBe(true);
      expect(mockSupabaseClient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: '更新的主题',
          html: '<p>更新的内容</p>',
          version: 2,
          updated_at: expect.any(String)
        })
      );
    });
  });

  /**
   * 邮件队列测试
   */
  describe('Email Queue', () => {
    it('应该将邮件添加到队列', async () => {
      const options: SendEmailOptions = {
        to: 'user@example.com',
        subject: '队列邮件',
        html: '<p>队列测试</p>',
        scheduledAt: new Date(Date.now() + 60 * 60 * 1000) // 1小时后发送
      };
      
      const result = await emailService.queueEmail(options);
      
      expect(result).toEqual(
        expect.objectContaining({
          queueId: expect.any(String),
          emailId: expect.any(String),
          scheduledAt: expect.any(Date)
        })
      );
      
      expect(mockSupabaseClient.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          email_id: expect.any(String),
          scheduled_at: expect.any(String),
          status: 'pending'
        })
      );
    });

    it('应该处理队列中的邮件', async () => {
      mockSupabaseClient.then.mockResolvedValue({
        data: [{
          ...testEmailQueue,
          email: testEmailMessage
        }],
        error: null
      });
      
      const result = await emailService.processQueue();
      
      expect(result).toEqual(
        expect.objectContaining({
          processed: 1,
          successful: 1,
          failed: 0
        })
      );
      
      expect(mockTransporter.sendMail).toHaveBeenCalled();
      expect(mockSupabaseClient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'completed',
          processed_at: expect.any(String),
          completed_at: expect.any(String)
        })
      );
    });

    it('应该处理队列中的失败邮件', async () => {
      mockTransporter.sendMail.mockRejectedValue(new Error('Send failed'));
      
      mockSupabaseClient.then.mockResolvedValue({
        data: [{
          ...testEmailQueue,
          email: testEmailMessage
        }],
        error: null
      });
      
      const result = await emailService.processQueue();
      
      expect(result).toEqual(
        expect.objectContaining({
          processed: 1,
          successful: 0,
          failed: 1
        })
      );
      
      expect(mockSupabaseClient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'failed',
          attempts: 1,
          error_message: 'Send failed'
        })
      );
    });

    it('应该重试失败的队列邮件', async () => {
      const failedQueueItem = {
        ...testEmailQueue,
        attempts: 1,
        status: 'failed',
        email: testEmailMessage
      };
      
      mockSupabaseClient.then.mockResolvedValue({
        data: [failedQueueItem],
        error: null
      });
      
      const result = await emailService.retryFailedEmails();
      
      expect(result.retried).toBe(1);
      expect(mockSupabaseClient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'pending',
          scheduled_at: expect.any(String)
        })
      );
    });

    it('应该清理过期的队列项', async () => {
      const result = await emailService.cleanupQueue();
      
      expect(result.cleaned).toBeGreaterThanOrEqual(0);
      expect(mockSupabaseClient.delete).toHaveBeenCalled();
    });
  });

  /**
   * 邮件跟踪测试
   */
  describe('Email Tracking', () => {
    it('应该跟踪邮件打开', async () => {
      const trackingData = {
        trackingId: 'track-789',
        recipient: 'user@example.com',
        userAgent: 'Mozilla/5.0...',
        ip: '192.168.1.1'
      };
      
      const result = await emailService.trackOpen(trackingData);
      
      expect(result.success).toBe(true);
      expect(mockSupabaseClient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: EmailStatus.OPENED,
          opened_at: expect.any(String)
        })
      );
      
      expect(mockAnalyticsService.track).toHaveBeenCalledWith(
        'email.opened',
        expect.objectContaining({
          trackingId: 'track-789',
          recipient: 'user@example.com'
        })
      );
    });

    it('应该跟踪邮件点击', async () => {
      const clickData = {
        trackingId: 'track-789',
        recipient: 'user@example.com',
        url: 'https://skillup.com/course/123',
        userAgent: 'Mozilla/5.0...',
        ip: '192.168.1.1'
      };
      
      const result = await emailService.trackClick(clickData);
      
      expect(result.success).toBe(true);
      expect(mockSupabaseClient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: EmailStatus.CLICKED,
          clicked_at: expect.any(String)
        })
      );
      
      expect(mockSupabaseClient.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          tracking_id: 'track-789',
          url: 'https://skillup.com/course/123',
          clicked_at: expect.any(String)
        })
      );
    });

    it('应该处理退信', async () => {
      const bounceData = {
        messageId: 'email-123456',
        recipient: 'invalid@example.com',
        bounceType: 'permanent',
        reason: 'User unknown'
      };
      
      const result = await emailService.handleBounce(bounceData);
      
      expect(result.success).toBe(true);
      expect(mockSupabaseClient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: EmailStatus.BOUNCED,
          error_message: 'User unknown'
        })
      );
      
      expect(mockSupabaseClient.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          email_id: 'email-123456',
          recipient: 'invalid@example.com',
          bounce_type: 'permanent',
          reason: 'User unknown'
        })
      );
    });

    it('应该处理投诉', async () => {
      const complaintData = {
        messageId: 'email-123456',
        recipient: 'user@example.com',
        complaintType: 'spam',
        timestamp: new Date()
      };
      
      const result = await emailService.handleComplaint(complaintData);
      
      expect(result.success).toBe(true);
      expect(mockSupabaseClient.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          email_id: 'email-123456',
          recipient: 'user@example.com',
          complaint_type: 'spam'
        })
      );
    });

    it('应该生成跟踪像素', async () => {
      const trackingPixel = await emailService.generateTrackingPixel('track-789');
      
      expect(trackingPixel).toMatch(/^data:image\/gif;base64,/);
    });

    it('应该生成跟踪链接', async () => {
      const originalUrl = 'https://skillup.com/course/123';
      const trackingUrl = await emailService.generateTrackingUrl(
        'track-789',
        originalUrl
      );
      
      expect(trackingUrl).toContain('track-789');
      expect(trackingUrl).toContain(encodeURIComponent(originalUrl));
    });
  });

  /**
   * 邮件统计测试
   */
  describe('Email Statistics', () => {
    it('应该生成日统计', async () => {
      mockSupabaseClient.then.mockResolvedValue({
        data: [
          { status: EmailStatus.DELIVERED, count: 950 },
          { status: EmailStatus.OPENED, count: 600 },
          { status: EmailStatus.CLICKED, count: 200 },
          { status: EmailStatus.BOUNCED, count: 30 }
        ],
        error: null
      });
      
      const stats = await emailService.getDailyStatistics('2024-01-01');
      
      expect(stats).toEqual(
        expect.objectContaining({
          date: '2024-01-01',
          totalSent: 1000,
          totalDelivered: 950,
          totalOpened: 600,
          totalClicked: 200,
          totalBounced: 30,
          deliveryRate: 0.95,
          openRate: 0.63,
          clickRate: 0.33
        })
      );
    });

    it('应该生成月统计', async () => {
      const stats = await emailService.getMonthlyStatistics('2024-01');
      
      expect(stats).toEqual(
        expect.objectContaining({
          month: '2024-01',
          totalSent: expect.any(Number),
          totalDelivered: expect.any(Number),
          deliveryRate: expect.any(Number),
          openRate: expect.any(Number),
          clickRate: expect.any(Number),
          dailyBreakdown: expect.any(Array)
        })
      );
    });

    it('应该按类型统计', async () => {
      const stats = await emailService.getStatisticsByType('2024-01-01');
      
      expect(stats).toEqual(
        expect.objectContaining({
          [EmailType.WELCOME]: expect.objectContaining({
            sent: expect.any(Number),
            delivered: expect.any(Number),
            opened: expect.any(Number),
            clicked: expect.any(Number)
          }),
          [EmailType.NOTIFICATION]: expect.objectContaining({
            sent: expect.any(Number),
            delivered: expect.any(Number),
            opened: expect.any(Number),
            clicked: expect.any(Number)
          })
        })
      );
    });

    it('应该按提供商统计', async () => {
      const stats = await emailService.getStatisticsByProvider('2024-01-01');
      
      expect(stats).toEqual(
        expect.objectContaining({
          [EmailProvider.SMTP]: expect.objectContaining({
            sent: expect.any(Number),
            delivered: expect.any(Number),
            opened: expect.any(Number),
            clicked: expect.any(Number)
          }),
          [EmailProvider.SENDGRID]: expect.objectContaining({
            sent: expect.any(Number),
            delivered: expect.any(Number),
            opened: expect.any(Number),
            clicked: expect.any(Number)
          })
        })
      );
    });
  });

  /**
   * 内容过滤测试
   */
  describe('Content Filtering', () => {
    it('应该过滤垃圾邮件内容', async () => {
      const content = '这是一封包含spam关键词的邮件';
      
      const result = await emailService.filterContent(content);
      
      expect(result).toEqual(
        expect.objectContaining({
          isAllowed: false,
          reason: 'SPAM_DETECTED',
          detectedKeywords: ['spam']
        })
      );
    });

    it('应该检查附件安全性', async () => {
      const attachment = {
        filename: 'virus.exe',
        contentType: 'application/x-executable',
        size: 1024
      };
      
      const result = await emailService.validateAttachment(attachment);
      
      expect(result).toEqual(
        expect.objectContaining({
          isValid: false,
          reason: 'INVALID_FILE_TYPE',
          allowedTypes: expect.any(Array)
        })
      );
    });

    it('应该检查附件大小', async () => {
      const largeAttachment = {
        filename: 'large-file.pdf',
        contentType: 'application/pdf',
        size: 20 * 1024 * 1024 // 20MB，超过10MB限制
      };
      
      const result = await emailService.validateAttachment(largeAttachment);
      
      expect(result).toEqual(
        expect.objectContaining({
          isValid: false,
          reason: 'FILE_TOO_LARGE',
          maxSize: 10485760
        })
      );
    });

    it('应该验证邮件地址', async () => {
      const invalidEmail = 'invalid-email';
      
      const isValid = await emailService.validateEmailAddress(invalidEmail);
      
      expect(isValid).toBe(false);
    });

    it('应该检查收件人数量限制', async () => {
      const tooManyRecipients = Array.from({ length: 150 }, (_, i) => 
        `user${i}@example.com`
      );
      
      const options: SendEmailOptions = {
        to: tooManyRecipients,
        subject: '群发测试',
        html: '<p>测试</p>'
      };
      
      await expect(emailService.sendEmail(options))
        .rejects.toThrow('Too many recipients');
    });
  });

  /**
   * 批量邮件测试
   */
  describe('Bulk Email', () => {
    it('应该发送批量邮件', async () => {
      const options: BulkEmailOptions = {
        templateId: 'newsletter-template',
        recipients: [
          {
            email: 'user1@example.com',
            data: { name: '张三', course: 'JavaScript' }
          },
          {
            email: 'user2@example.com',
            data: { name: '李四', course: 'Python' }
          }
        ],
        subject: '课程更新通知',
        scheduledAt: new Date(Date.now() + 60 * 60 * 1000)
      };
      
      const result = await emailService.sendBulkEmail(options);
      
      expect(result).toEqual(
        expect.objectContaining({
          batchId: expect.any(String),
          totalRecipients: 2,
          status: 'scheduled'
        })
      );
      
      expect(mockSupabaseClient.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          template_id: 'newsletter-template',
          total_recipients: 2,
          status: 'scheduled'
        })
      );
    });

    it('应该处理批量邮件发送', async () => {
      const batchId = 'batch-123';
      
      mockSupabaseClient.single.mockResolvedValue({
        data: {
          id: batchId,
          template_id: 'newsletter-template',
          recipients: [
            { email: 'user1@example.com', data: { name: '张三' } },
            { email: 'user2@example.com', data: { name: '李四' } }
          ],
          subject: '课程更新通知',
          status: 'pending'
        },
        error: null
      });
      
      const result = await emailService.processBulkEmail(batchId);
      
      expect(result).toEqual(
        expect.objectContaining({
          batchId,
          sent: 2,
          failed: 0,
          status: 'completed'
        })
      );
      
      expect(mockTransporter.sendMail).toHaveBeenCalledTimes(2);
    });

    it('应该获取批量邮件状态', async () => {
      const batchId = 'batch-123';
      
      mockSupabaseClient.single.mockResolvedValue({
        data: {
          id: batchId,
          total_recipients: 100,
          sent_count: 80,
          failed_count: 5,
          status: 'processing',
          progress: 0.85
        },
        error: null
      });
      
      const status = await emailService.getBulkEmailStatus(batchId);
      
      expect(status).toEqual(
        expect.objectContaining({
          batchId,
          totalRecipients: 100,
          sentCount: 80,
          failedCount: 5,
          status: 'processing',
          progress: 0.85
        })
      );
    });
  });

  /**
   * 错误处理测试
   */
  describe('Error Handling', () => {
    it('应该处理SMTP连接错误', async () => {
      mockTransporter.sendMail.mockRejectedValue(
        new Error('Connection timeout')
      );
      
      const options: SendEmailOptions = {
        to: 'user@example.com',
        subject: '测试邮件',
        html: '<p>测试</p>'
      };
      
      const result = await emailService.sendEmail(options);
      
      expect(result.success).toBe(false);
      expect(result.errorMessage).toBe('Connection timeout');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Email send failed',
        expect.objectContaining({
          error: 'Connection timeout'
        })
      );
    });

    it('应该处理认证错误', async () => {
      mockTransporter.verify.mockRejectedValue(
        new Error('Invalid credentials')
      );
      
      await expect(emailService.initializeTransporter())
        .rejects.toThrow('Invalid credentials');
    });

    it('应该处理模板不存在错误', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: null,
        error: { message: 'Template not found' }
      });
      
      await expect(
        emailService.renderTemplate('non-existent-template', {})
      ).rejects.toThrow('Template not found');
    });

    it('应该处理数据库连接错误', async () => {
      mockSupabaseClient.insert.mockResolvedValue({
        data: null,
        error: { message: 'Database connection failed' }
      });
      
      const options: SendEmailOptions = {
        to: 'user@example.com',
        subject: '测试邮件',
        html: '<p>测试</p>'
      };
      
      await expect(emailService.sendEmail(options))
        .rejects.toThrow('Database connection failed');
    });
  });

  /**
   * 性能测试
   */
  describe('Performance Tests', () => {
    it('应该高效处理大批量邮件', async () => {
      const recipients = Array.from({ length: 1000 }, (_, i) => ({
        email: `user${i}@example.com`,
        data: { name: `用户${i}` }
      }));
      
      const options: BulkEmailOptions = {
        templateId: 'newsletter-template',
        recipients,
        subject: '大批量测试'
      };
      
      const startTime = Date.now();
      const result = await emailService.sendBulkEmail(options);
      const executionTime = Date.now() - startTime;
      
      expect(executionTime).toBeLessThan(5000); // 5秒内完成
      expect(result.totalRecipients).toBe(1000);
    });

    it('应该有效利用模板缓存', async () => {
      const templateData = { userName: '张三' };
      
      // 第一次渲染
      await emailService.renderTemplate('welcome-template', templateData);
      
      // 第二次渲染应该使用缓存
      mockCacheService.get.mockResolvedValue({
        compiledSubject: jest.fn().mockReturnValue('欢迎加入SkillUp'),
        compiledHtml: jest.fn().mockReturnValue('<h1>欢迎张三</h1>'),
        compiledText: jest.fn().mockReturnValue('欢迎张三')
      });
      
      await emailService.renderTemplate('welcome-template', templateData);
      
      expect(mockCacheService.get).toHaveBeenCalledWith(
        'email_template_welcome-template'
      );
    });

    it('应该优化内存使用', async () => {
      const largeRecipientList = Array.from({ length: 10000 }, (_, i) => ({
        email: `user${i}@example.com`,
        data: { name: `用户${i}` }
      }));
      
      const options: BulkEmailOptions = {
        templateId: 'newsletter-template',
        recipients: largeRecipientList,
        subject: '内存测试'
      };
      
      const result = await emailService.sendBulkEmail(options);
      
      expect(result.totalRecipients).toBe(10000);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Processing large bulk email',
        expect.objectContaining({
          recipientCount: 10000
        })
      );
    });
  });

  /**
   * 边界情况测试
   */
  describe('Edge Cases', () => {
    it('应该处理空收件人列表', async () => {
      const options: SendEmailOptions = {
        to: [],
        subject: '测试邮件',
        html: '<p>测试</p>'
      };
      
      await expect(emailService.sendEmail(options))
        .rejects.toThrow('Recipients are required');
    });

    it('应该处理空邮件内容', async () => {
      const options: SendEmailOptions = {
        to: 'user@example.com',
        subject: '测试邮件',
        html: '',
        text: ''
      };
      
      await expect(emailService.sendEmail(options))
        .rejects.toThrow('Email content is required');
    });

    it('应该处理超长主题', async () => {
      const longSubject = 'x'.repeat(1000);
      
      const options: SendEmailOptions = {
        to: 'user@example.com',
        subject: longSubject,
        html: '<p>测试</p>'
      };
      
      await expect(emailService.sendEmail(options))
        .rejects.toThrow('Subject too long');
    });

    it('应该处理特殊字符', async () => {
      const options: SendEmailOptions = {
        to: 'user@example.com',
        subject: '包含特殊字符：@#$%^&*()',
        html: '<p>包含特殊字符：@#$%^&*()</p>'
      };
      
      const result = await emailService.sendEmail(options);
      
      expect(result.success).toBe(true);
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: '包含特殊字符：@#$%^&*()',
          html: '<p>包含特殊字符：@#$%^&*()</p>'
        })
      );
    });

    it('应该处理循环引用的模板数据', async () => {
      const circularData: Record<string, unknown> = { name: '张三' };
      circularData.self = circularData;
      
      await expect(
        emailService.renderTemplate('welcome-template', circularData)
      ).rejects.toThrow('Circular reference detected');
    });
  });
});