/**
 * 支付服务API集成测试
 * 
 * 测试支付相关的API端点，包括：
 * - 创建支付订单
 * - 支付状态查询
 * - 支付回调处理
 * - 退款申请和处理
 * - 支付方式管理
 * - 订单管理
 * - 支付统计
 * - 错误处理和安全验证
 */

import request from 'supertest';
import { app } from '../../app';
import { supabase } from '../../config/supabase';
import { jwtService } from '../../services/jwtService';
import { cacheService } from '../../services/cacheService';
import { auditService } from '../../services/auditService';
import { analyticsService } from '../../services/analyticsService';
import { paymentService } from '../../services/paymentService';
import { emailService } from '../../services/emailService';
import { smsService } from '../../services/smsService';
import { logger } from '../../utils/logger';
import crypto from 'crypto';

// Mock 依赖
jest.mock('../../config/supabase');
jest.mock('../../services/jwtService');
jest.mock('../../services/cacheService');
jest.mock('../../services/auditService');
jest.mock('../../services/analyticsService');
jest.mock('../../services/paymentService');
jest.mock('../../services/emailService');
jest.mock('../../services/smsService');
jest.mock('../../utils/logger');
jest.mock('crypto');

// 模块类型定义
type MockedModule<T> = T & { [K in keyof T]: jest.MockedFunction<T[K]> };

// 类型定义
interface TestUser {
  id: string;
  email: string;
  username: string;
  displayName: string;
  role: 'student' | 'instructor' | 'admin';
  phone?: string;
}

interface TestCourse {
  id: string;
  title: string;
  price: number;
  currency: string;
  instructorId: string;
  isPublished: boolean;
}

interface TestPaymentOrder {
  id: string;
  userId: string;
  courseId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'refunded';
  paymentMethod: 'alipay' | 'wechat' | 'credit_card' | 'bank_transfer';
  paymentProvider: 'alipay' | 'wechat' | 'stripe' | 'paypal';
  transactionId?: string;
  providerOrderId?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  paidAt?: Date;
  expiredAt?: Date;
}

interface TestRefund {
  id: string;
  orderId: string;
  userId: string;
  amount: number;
  currency: string;
  reason: string;
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  processedBy?: string;
  processedAt?: Date;
  refundId?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface TestPaymentMethod {
  id: string;
  userId: string;
  type: 'credit_card' | 'bank_account' | 'digital_wallet';
  provider: string;
  last4?: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault: boolean;
  isActive: boolean;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

// Mock 实例
const mockSupabase = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  neq: jest.fn().mockReturnThis(),
  gt: jest.fn().mockReturnThis(),
  gte: jest.fn().mockReturnThis(),
  lt: jest.fn().mockReturnThis(),
  lte: jest.fn().mockReturnThis(),
  like: jest.fn().mockReturnThis(),
  ilike: jest.fn().mockReturnThis(),
  in: jest.fn().mockReturnThis(),
  contains: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  offset: jest.fn().mockReturnThis(),
  range: jest.fn().mockReturnThis(),
  single: jest.fn(),
  maybeSingle: jest.fn(),
  count: jest.fn(),
  rpc: jest.fn()
};

const mockJwtService = {
  verifyAccessToken: jest.fn(),
  generateAccessToken: jest.fn(),
  generateRefreshToken: jest.fn()
};

const mockCacheService = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  mget: jest.fn(),
  mset: jest.fn(),
  expire: jest.fn(),
  incr: jest.fn(),
  decr: jest.fn()
};

const mockAuditService = {
  log: jest.fn(),
  logUserEvent: jest.fn()
};

const mockAnalyticsService = {
  track: jest.fn(),
  increment: jest.fn(),
  timing: jest.fn(),
  identify: jest.fn()
};

const mockPaymentService = {
  createOrder: jest.fn(),
  processPayment: jest.fn(),
  verifyPayment: jest.fn(),
  processRefund: jest.fn(),
  getPaymentMethods: jest.fn(),
  addPaymentMethod: jest.fn(),
  removePaymentMethod: jest.fn(),
  getOrderStatus: jest.fn(),
  handleWebhook: jest.fn()
};

const mockEmailService = {
  sendEmail: jest.fn(),
  sendBulkEmails: jest.fn()
};

const mockSmsService = {
  sendSms: jest.fn(),
  sendBulkSms: jest.fn()
};

const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
};

const mockCrypto = {
  createHmac: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  digest: jest.fn(),
  randomBytes: jest.fn(),
  timingSafeEqual: jest.fn()
};

// 设置 Mock
jest.mocked(supabase).mockReturnValue(mockSupabase);
jest.mocked(jwtService).mockReturnValue(mockJwtService);
jest.mocked(cacheService).mockReturnValue(mockCacheService);
jest.mocked(auditService).mockReturnValue(mockAuditService);
jest.mocked(analyticsService).mockReturnValue(mockAnalyticsService);
jest.mocked(paymentService).mockReturnValue(mockPaymentService);
jest.mocked(emailService).mockReturnValue(mockEmailService);
jest.mocked(smsService).mockReturnValue(mockSmsService);
jest.mocked(logger).mockReturnValue(mockLogger);
jest.mocked(crypto).mockReturnValue(mockCrypto);

// 测试数据
const testUser: TestUser = {
  id: 'user_123',
  email: 'test@example.com',
  username: 'testuser',
  displayName: '张三',
  role: 'student',
  phone: '+86 138 0013 8000'
};

const testInstructor: TestUser = {
  id: 'instructor_123',
  email: 'instructor@example.com',
  username: 'instructor',
  displayName: '李老师',
  role: 'instructor'
};

const testAdmin: TestUser = {
  id: 'admin_123',
  email: 'admin@example.com',
  username: 'admin',
  displayName: '管理员',
  role: 'admin'
};

const testCourse: TestCourse = {
  id: 'course_123',
  title: 'JavaScript 基础教程',
  price: 299.00,
  currency: 'CNY',
  instructorId: testInstructor.id,
  isPublished: true
};

const testPaymentOrder: TestPaymentOrder = {
  id: 'order_123',
  userId: testUser.id,
  courseId: testCourse.id,
  amount: testCourse.price,
  currency: testCourse.currency,
  status: 'pending',
  paymentMethod: 'alipay',
  paymentProvider: 'alipay',
  transactionId: 'txn_123456789',
  providerOrderId: 'alipay_order_123',
  metadata: {
    courseTitle: testCourse.title,
    userEmail: testUser.email
  },
  createdAt: new Date('2024-01-15T10:00:00Z'),
  updatedAt: new Date('2024-01-15T10:00:00Z'),
  expiredAt: new Date('2024-01-15T11:00:00Z') // 1小时后过期
};

const testCompletedOrder: TestPaymentOrder = {
  ...testPaymentOrder,
  id: 'order_124',
  status: 'completed',
  paidAt: new Date('2024-01-15T10:30:00Z')
};

const testRefund: TestRefund = {
  id: 'refund_123',
  orderId: testCompletedOrder.id,
  userId: testUser.id,
  amount: testCompletedOrder.amount,
  currency: testCompletedOrder.currency,
  reason: '课程内容不符合预期',
  status: 'pending',
  createdAt: new Date('2024-01-16T10:00:00Z'),
  updatedAt: new Date('2024-01-16T10:00:00Z')
};

const testPaymentMethod: TestPaymentMethod = {
  id: 'pm_123',
  userId: testUser.id,
  type: 'credit_card',
  provider: 'stripe',
  last4: '4242',
  brand: 'visa',
  expiryMonth: 12,
  expiryYear: 2025,
  isDefault: true,
  isActive: true,
  metadata: {
    fingerprint: 'card_fingerprint_123'
  },
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-15')
};

const validTokens = {
  student: 'student_token',
  instructor: 'instructor_token',
  admin: 'admin_token'
};

describe('Payments API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // 设置默认 Mock 返回值
    mockSupabase.single.mockResolvedValue({
      data: testPaymentOrder,
      error: null
    });
    
    mockSupabase.insert.mockResolvedValue({
      data: [testPaymentOrder],
      error: null
    });
    
    mockSupabase.update.mockResolvedValue({
      data: [testPaymentOrder],
      error: null
    });
    
    mockSupabase.range.mockResolvedValue({
      data: [testPaymentOrder],
      error: null,
      count: 1
    });
    
    mockSupabase.count.mockResolvedValue({
      data: [{ count: 1 }],
      error: null
    });
    
    // JWT 验证 Mock
    mockJwtService.verifyAccessToken.mockImplementation((token) => {
      if (token === validTokens.student) {
        return Promise.resolve({
          valid: true,
          payload: testUser
        });
      } else if (token === validTokens.instructor) {
        return Promise.resolve({
          valid: true,
          payload: testInstructor
        });
      } else if (token === validTokens.admin) {
        return Promise.resolve({
          valid: true,
          payload: testAdmin
        });
      }
      return Promise.resolve({
        valid: false,
        error: 'Invalid token'
      });
    });
    
    // 缓存 Mock
    mockCacheService.get.mockResolvedValue(null);
    mockCacheService.set.mockResolvedValue(true);
    
    // 支付服务 Mock
    mockPaymentService.createOrder.mockResolvedValue({
      success: true,
      order: testPaymentOrder,
      paymentUrl: 'https://payment.example.com/pay/order_123'
    });
    
    mockPaymentService.processPayment.mockResolvedValue({
      success: true,
      transactionId: 'txn_123456789',
      status: 'completed'
    });
    
    mockPaymentService.verifyPayment.mockResolvedValue({
      valid: true,
      status: 'completed',
      amount: testPaymentOrder.amount
    });
    
    // 加密 Mock
    mockCrypto.createHmac.mockReturnValue({
      update: jest.fn().mockReturnThis(),
      digest: jest.fn().mockReturnValue('valid_signature')
    });
    
    mockCrypto.timingSafeEqual.mockReturnValue(true);
  });

  /**
   * 创建支付订单测试
   */
  describe('POST /api/payments/orders', () => {
    const orderData = {
      courseId: testCourse.id,
      paymentMethod: 'alipay',
      returnUrl: 'https://example.com/payment/success',
      cancelUrl: 'https://example.com/payment/cancel'
    };

    it('应该成功创建支付订单', async () => {
      const authHeader = `Bearer ${validTokens.student}`;
      
      // Mock 课程查询
      mockSupabase.single.mockResolvedValueOnce({
        data: testCourse,
        error: null
      });
      
      const response = await request(app)
        .post('/api/payments/orders')
        .set('Authorization', authHeader)
        .send(orderData)
        .expect(201);
      
      expect(response.body).toEqual({
        success: true,
        message: 'Payment order created successfully',
        data: {
          order: expect.objectContaining({
            id: expect.any(String),
            userId: testUser.id,
            courseId: testCourse.id,
            amount: testCourse.price,
            currency: testCourse.currency,
            status: 'pending',
            paymentMethod: orderData.paymentMethod
          }),
          paymentUrl: expect.stringContaining('https://'),
          expiresAt: expect.any(String)
        }
      });
      
      expect(mockSupabase.from).toHaveBeenCalledWith('courses');
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', testCourse.id);
      expect(mockSupabase.eq).toHaveBeenCalledWith('is_published', true);
      
      expect(mockPaymentService.createOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: testUser.id,
          courseId: testCourse.id,
          amount: testCourse.price,
          currency: testCourse.currency,
          paymentMethod: orderData.paymentMethod,
          returnUrl: orderData.returnUrl,
          cancelUrl: orderData.cancelUrl
        })
      );
    });

    it('应该验证课程存在且已发布', async () => {
      const authHeader = `Bearer ${validTokens.student}`;
      
      // Mock 课程不存在
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116', message: 'No rows found' }
      });
      
      const response = await request(app)
        .post('/api/payments/orders')
        .set('Authorization', authHeader)
        .send(orderData)
        .expect(404);
      
      expect(response.body).toEqual({
        success: false,
        error: 'Course not found',
        message: 'The requested course does not exist or is not available for purchase',
        code: 'COURSE_NOT_FOUND'
      });
    });

    it('应该防止重复购买', async () => {
      const authHeader = `Bearer ${validTokens.student}`;
      
      // Mock 课程查询
      mockSupabase.single.mockResolvedValueOnce({
        data: testCourse,
        error: null
      });
      
      // Mock 已存在的订单
      mockSupabase.single.mockResolvedValueOnce({
        data: testCompletedOrder,
        error: null
      });
      
      const response = await request(app)
        .post('/api/payments/orders')
        .set('Authorization', authHeader)
        .send(orderData)
        .expect(409);
      
      expect(response.body).toEqual({
        success: false,
        error: 'Course already purchased',
        message: 'You have already purchased this course',
        code: 'DUPLICATE_PURCHASE'
      });
    });

    it('应该验证支付方式', async () => {
      const authHeader = `Bearer ${validTokens.student}`;
      const invalidOrderData = {
        ...orderData,
        paymentMethod: 'invalid_method'
      };
      
      const response = await request(app)
        .post('/api/payments/orders')
        .set('Authorization', authHeader)
        .send(invalidOrderData)
        .expect(400);
      
      expect(response.body).toEqual({
        success: false,
        error: 'Validation failed',
        details: expect.arrayContaining([
          expect.objectContaining({
            field: 'paymentMethod',
            message: expect.stringContaining('valid payment method')
          })
        ])
      });
    });

    it('应该验证必填字段', async () => {
      const authHeader = `Bearer ${validTokens.student}`;
      const incompleteData = {
        paymentMethod: 'alipay'
        // 缺少 courseId
      };
      
      const response = await request(app)
        .post('/api/payments/orders')
        .set('Authorization', authHeader)
        .send(incompleteData)
        .expect(400);
      
      expect(response.body).toEqual({
        success: false,
        error: 'Validation failed',
        details: expect.arrayContaining([
          expect.objectContaining({
            field: 'courseId',
            message: expect.stringContaining('required')
          })
        ])
      });
    });
  });

  /**
   * 查询支付订单测试
   */
  describe('GET /api/payments/orders/:id', () => {
    it('应该返回订单详情', async () => {
      const authHeader = `Bearer ${validTokens.student}`;
      
      const response = await request(app)
        .get(`/api/payments/orders/${testPaymentOrder.id}`)
        .set('Authorization', authHeader)
        .expect(200);
      
      expect(response.body).toEqual({
        success: true,
        data: {
          order: expect.objectContaining({
            id: testPaymentOrder.id,
            userId: testPaymentOrder.userId,
            courseId: testPaymentOrder.courseId,
            amount: testPaymentOrder.amount,
            currency: testPaymentOrder.currency,
            status: testPaymentOrder.status,
            paymentMethod: testPaymentOrder.paymentMethod,
            createdAt: expect.any(String)
          })
        }
      });
      
      expect(mockSupabase.from).toHaveBeenCalledWith('payment_orders');
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', testPaymentOrder.id);
      expect(mockSupabase.eq).toHaveBeenCalledWith('user_id', testUser.id);
    });

    it('应该处理订单不存在的情况', async () => {
      const authHeader = `Bearer ${validTokens.student}`;
      const nonExistentId = 'non_existent_order';
      
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'No rows found' }
      });
      
      const response = await request(app)
        .get(`/api/payments/orders/${nonExistentId}`)
        .set('Authorization', authHeader)
        .expect(404);
      
      expect(response.body).toEqual({
        success: false,
        error: 'Order not found',
        message: 'The requested payment order does not exist or you do not have permission to view it',
        code: 'ORDER_NOT_FOUND'
      });
    });

    it('应该防止访问其他用户的订单', async () => {
      const authHeader = `Bearer ${validTokens.student}`;
      
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'No rows found' }
      });
      
      const response = await request(app)
        .get(`/api/payments/orders/${testPaymentOrder.id}`)
        .set('Authorization', authHeader)
        .expect(404);
      
      expect(mockSupabase.eq).toHaveBeenCalledWith('user_id', testUser.id);
    });
  });

  /**
   * 获取用户订单列表测试
   */
  describe('GET /api/payments/orders', () => {
    it('应该返回用户订单列表', async () => {
      const authHeader = `Bearer ${validTokens.student}`;
      
      const response = await request(app)
        .get('/api/payments/orders')
        .set('Authorization', authHeader)
        .expect(200);
      
      expect(response.body).toEqual({
        success: true,
        data: {
          orders: expect.arrayContaining([
            expect.objectContaining({
              id: testPaymentOrder.id,
              courseId: testPaymentOrder.courseId,
              amount: testPaymentOrder.amount,
              status: testPaymentOrder.status,
              createdAt: expect.any(String)
            })
          ]),
          pagination: {
            total: 1,
            page: 1,
            limit: 20,
            totalPages: 1
          }
        }
      });
      
      expect(mockSupabase.from).toHaveBeenCalledWith('payment_orders');
      expect(mockSupabase.eq).toHaveBeenCalledWith('user_id', testUser.id);
      expect(mockSupabase.order).toHaveBeenCalledWith('created_at', { ascending: false });
    });

    it('应该支持状态筛选', async () => {
      const authHeader = `Bearer ${validTokens.student}`;
      const status = 'completed';
      
      const response = await request(app)
        .get('/api/payments/orders')
        .set('Authorization', authHeader)
        .query({ status })
        .expect(200);
      
      expect(mockSupabase.eq).toHaveBeenCalledWith('status', status);
    });

    it('应该支持分页', async () => {
      const authHeader = `Bearer ${validTokens.student}`;
      const page = 2;
      const limit = 10;
      
      const response = await request(app)
        .get('/api/payments/orders')
        .set('Authorization', authHeader)
        .query({ page, limit })
        .expect(200);
      
      expect(mockSupabase.range).toHaveBeenCalledWith(10, 19);
    });
  });

  /**
   * 支付回调处理测试
   */
  describe('POST /api/payments/webhook/:provider', () => {
    const webhookData = {
      orderId: testPaymentOrder.providerOrderId,
      status: 'success',
      amount: testPaymentOrder.amount,
      transactionId: 'txn_webhook_123',
      timestamp: Date.now()
    };

    it('应该处理支付宝回调', async () => {
      const signature = 'valid_alipay_signature';
      
      mockPaymentService.handleWebhook.mockResolvedValue({
        success: true,
        orderId: testPaymentOrder.id,
        status: 'completed'
      });
      
      const response = await request(app)
        .post('/api/payments/webhook/alipay')
        .set('X-Alipay-Signature', signature)
        .send(webhookData)
        .expect(200);
      
      expect(response.body).toEqual({
        success: true,
        message: 'Webhook processed successfully'
      });
      
      expect(mockPaymentService.handleWebhook).toHaveBeenCalledWith(
        'alipay',
        webhookData,
        signature
      );
    });

    it('应该处理微信支付回调', async () => {
      const signature = 'valid_wechat_signature';
      
      mockPaymentService.handleWebhook.mockResolvedValue({
        success: true,
        orderId: testPaymentOrder.id,
        status: 'completed'
      });
      
      const response = await request(app)
        .post('/api/payments/webhook/wechat')
        .set('Wechatpay-Signature', signature)
        .send(webhookData)
        .expect(200);
      
      expect(mockPaymentService.handleWebhook).toHaveBeenCalledWith(
        'wechat',
        webhookData,
        signature
      );
    });

    it('应该验证回调签名', async () => {
      const invalidSignature = 'invalid_signature';
      
      mockPaymentService.handleWebhook.mockRejectedValue(
        new Error('Invalid webhook signature')
      );
      
      const response = await request(app)
        .post('/api/payments/webhook/alipay')
        .set('X-Alipay-Signature', invalidSignature)
        .send(webhookData)
        .expect(400);
      
      expect(response.body).toEqual({
        success: false,
        error: 'Invalid webhook signature',
        message: 'Webhook signature verification failed'
      });
    });

    it('应该处理重复回调', async () => {
      const signature = 'valid_signature';
      
      // Mock 订单已经是完成状态
      mockSupabase.single.mockResolvedValue({
        data: { ...testPaymentOrder, status: 'completed' },
        error: null
      });
      
      const response = await request(app)
        .post('/api/payments/webhook/alipay')
        .set('X-Alipay-Signature', signature)
        .send(webhookData)
        .expect(200);
      
      expect(response.body).toEqual({
        success: true,
        message: 'Webhook already processed'
      });
    });
  });

  /**
   * 退款申请测试
   */
  describe('POST /api/payments/orders/:id/refund', () => {
    const refundData = {
      reason: '课程内容不符合预期',
      amount: testCompletedOrder.amount
    };

    it('应该成功申请退款', async () => {
      const authHeader = `Bearer ${validTokens.student}`;
      
      // Mock 已完成的订单
      mockSupabase.single.mockResolvedValue({
        data: testCompletedOrder,
        error: null
      });
      
      const response = await request(app)
        .post(`/api/payments/orders/${testCompletedOrder.id}/refund`)
        .set('Authorization', authHeader)
        .send(refundData)
        .expect(201);
      
      expect(response.body).toEqual({
        success: true,
        message: 'Refund request submitted successfully',
        data: {
          refund: expect.objectContaining({
            id: expect.any(String),
            orderId: testCompletedOrder.id,
            userId: testUser.id,
            amount: refundData.amount,
            reason: refundData.reason,
            status: 'pending'
          })
        }
      });
      
      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          order_id: testCompletedOrder.id,
          user_id: testUser.id,
          amount: refundData.amount,
          reason: refundData.reason,
          status: 'pending'
        })
      );
    });

    it('应该验证订单状态', async () => {
      const authHeader = `Bearer ${validTokens.student}`;
      
      // Mock 未完成的订单
      mockSupabase.single.mockResolvedValue({
        data: testPaymentOrder, // status: 'pending'
        error: null
      });
      
      const response = await request(app)
        .post(`/api/payments/orders/${testPaymentOrder.id}/refund`)
        .set('Authorization', authHeader)
        .send(refundData)
        .expect(400);
      
      expect(response.body).toEqual({
        success: false,
        error: 'Invalid order status',
        message: 'Only completed orders can be refunded',
        code: 'INVALID_ORDER_STATUS'
      });
    });

    it('应该验证退款金额', async () => {
      const authHeader = `Bearer ${validTokens.student}`;
      const invalidRefundData = {
        ...refundData,
        amount: testCompletedOrder.amount + 100 // 超过订单金额
      };
      
      mockSupabase.single.mockResolvedValue({
        data: testCompletedOrder,
        error: null
      });
      
      const response = await request(app)
        .post(`/api/payments/orders/${testCompletedOrder.id}/refund`)
        .set('Authorization', authHeader)
        .send(invalidRefundData)
        .expect(400);
      
      expect(response.body).toEqual({
        success: false,
        error: 'Invalid refund amount',
        message: 'Refund amount cannot exceed the order amount',
        code: 'INVALID_REFUND_AMOUNT'
      });
    });

    it('应该防止重复退款申请', async () => {
      const authHeader = `Bearer ${validTokens.student}`;
      
      mockSupabase.single.mockResolvedValueOnce({
        data: testCompletedOrder,
        error: null
      });
      
      // Mock 已存在的退款申请
      mockSupabase.single.mockResolvedValueOnce({
        data: testRefund,
        error: null
      });
      
      const response = await request(app)
        .post(`/api/payments/orders/${testCompletedOrder.id}/refund`)
        .set('Authorization', authHeader)
        .send(refundData)
        .expect(409);
      
      expect(response.body).toEqual({
        success: false,
        error: 'Refund already requested',
        message: 'A refund request already exists for this order',
        code: 'DUPLICATE_REFUND_REQUEST'
      });
    });
  });

  /**
   * 退款管理测试（管理员功能）
   */
  describe('Refund Management', () => {
    describe('GET /api/payments/refunds', () => {
      it('应该允许管理员查看所有退款申请', async () => {
        const authHeader = `Bearer ${validTokens.admin}`;
        
        mockSupabase.range.mockResolvedValue({
          data: [testRefund],
          error: null,
          count: 1
        });
        
        const response = await request(app)
          .get('/api/payments/refunds')
          .set('Authorization', authHeader)
          .expect(200);
        
        expect(response.body).toEqual({
          success: true,
          data: {
            refunds: expect.arrayContaining([
              expect.objectContaining({
                id: testRefund.id,
                orderId: testRefund.orderId,
                userId: testRefund.userId,
                amount: testRefund.amount,
                reason: testRefund.reason,
                status: testRefund.status
              })
            ]),
            pagination: {
              total: 1,
              page: 1,
              limit: 20,
              totalPages: 1
            }
          }
        });
        
        expect(mockSupabase.from).toHaveBeenCalledWith('refunds');
      });

      it('应该拒绝非管理员访问', async () => {
        const authHeader = `Bearer ${validTokens.student}`;
        
        const response = await request(app)
          .get('/api/payments/refunds')
          .set('Authorization', authHeader)
          .expect(403);
        
        expect(response.body).toEqual({
          success: false,
          error: 'Forbidden',
          message: 'Only administrators can view all refunds',
          code: 'INSUFFICIENT_PERMISSIONS'
        });
      });
    });

    describe('PUT /api/payments/refunds/:id/process', () => {
      const processData = {
        action: 'approve',
        note: '符合退款条件，批准退款'
      };

      it('应该允许管理员处理退款申请', async () => {
        const authHeader = `Bearer ${validTokens.admin}`;
        
        mockSupabase.single.mockResolvedValue({
          data: testRefund,
          error: null
        });
        
        mockPaymentService.processRefund.mockResolvedValue({
          success: true,
          refundId: 'refund_processed_123',
          status: 'completed'
        });
        
        const response = await request(app)
          .put(`/api/payments/refunds/${testRefund.id}/process`)
          .set('Authorization', authHeader)
          .send(processData)
          .expect(200);
        
        expect(response.body).toEqual({
          success: true,
          message: 'Refund processed successfully',
          data: {
            refund: expect.objectContaining({
              id: testRefund.id,
              status: 'completed',
              processedBy: testAdmin.id,
              processedAt: expect.any(String)
            })
          }
        });
        
        expect(mockPaymentService.processRefund).toHaveBeenCalledWith(
          expect.objectContaining({
            refundId: testRefund.id,
            action: processData.action,
            processedBy: testAdmin.id
          })
        );
      });

      it('应该支持拒绝退款申请', async () => {
        const authHeader = `Bearer ${validTokens.admin}`;
        const rejectData = {
          action: 'reject',
          note: '不符合退款政策'
        };
        
        mockSupabase.single.mockResolvedValue({
          data: testRefund,
          error: null
        });
        
        const response = await request(app)
          .put(`/api/payments/refunds/${testRefund.id}/process`)
          .set('Authorization', authHeader)
          .send(rejectData)
          .expect(200);
        
        expect(response.body).toEqual({
          success: true,
          message: 'Refund rejected successfully',
          data: {
            refund: expect.objectContaining({
              id: testRefund.id,
              status: 'rejected',
              processedBy: testAdmin.id
            })
          }
        });
      });
    });
  });

  /**
   * 支付方式管理测试
   */
  describe('Payment Methods', () => {
    describe('GET /api/payments/methods', () => {
      it('应该返回用户支付方式列表', async () => {
        const authHeader = `Bearer ${validTokens.student}`;
        
        mockSupabase.range.mockResolvedValue({
          data: [testPaymentMethod],
          error: null
        });
        
        const response = await request(app)
          .get('/api/payments/methods')
          .set('Authorization', authHeader)
          .expect(200);
        
        expect(response.body).toEqual({
          success: true,
          data: {
            paymentMethods: expect.arrayContaining([
              expect.objectContaining({
                id: testPaymentMethod.id,
                type: testPaymentMethod.type,
                provider: testPaymentMethod.provider,
                last4: testPaymentMethod.last4,
                brand: testPaymentMethod.brand,
                isDefault: testPaymentMethod.isDefault,
                isActive: testPaymentMethod.isActive
              })
            ])
          }
        });
        
        expect(mockSupabase.from).toHaveBeenCalledWith('payment_methods');
        expect(mockSupabase.eq).toHaveBeenCalledWith('user_id', testUser.id);
        expect(mockSupabase.eq).toHaveBeenCalledWith('is_active', true);
      });
    });

    describe('POST /api/payments/methods', () => {
      const methodData = {
        type: 'credit_card',
        provider: 'stripe',
        token: 'card_token_123',
        isDefault: false
      };

      it('应该成功添加支付方式', async () => {
        const authHeader = `Bearer ${validTokens.student}`;
        
        mockPaymentService.addPaymentMethod.mockResolvedValue({
          success: true,
          paymentMethod: testPaymentMethod
        });
        
        const response = await request(app)
          .post('/api/payments/methods')
          .set('Authorization', authHeader)
          .send(methodData)
          .expect(201);
        
        expect(response.body).toEqual({
          success: true,
          message: 'Payment method added successfully',
          data: {
            paymentMethod: expect.objectContaining({
              id: testPaymentMethod.id,
              type: testPaymentMethod.type,
              provider: testPaymentMethod.provider,
              last4: testPaymentMethod.last4,
              brand: testPaymentMethod.brand
            })
          }
        });
        
        expect(mockPaymentService.addPaymentMethod).toHaveBeenCalledWith(
          expect.objectContaining({
            userId: testUser.id,
            type: methodData.type,
            provider: methodData.provider,
            token: methodData.token,
            isDefault: methodData.isDefault
          })
        );
      });
    });

    describe('DELETE /api/payments/methods/:id', () => {
      it('应该成功删除支付方式', async () => {
        const authHeader = `Bearer ${validTokens.student}`;
        
        mockSupabase.single.mockResolvedValue({
          data: testPaymentMethod,
          error: null
        });
        
        const response = await request(app)
          .delete(`/api/payments/methods/${testPaymentMethod.id}`)
          .set('Authorization', authHeader)
          .expect(200);
        
        expect(response.body).toEqual({
          success: true,
          message: 'Payment method removed successfully'
        });
        
        expect(mockSupabase.update).toHaveBeenCalledWith(
          expect.objectContaining({
            is_active: false,
            updated_at: expect.any(String)
          })
        );
      });

      it('应该防止删除默认支付方式', async () => {
        const authHeader = `Bearer ${validTokens.student}`;
        const defaultMethod = { ...testPaymentMethod, isDefault: true };
        
        mockSupabase.single.mockResolvedValue({
          data: defaultMethod,
          error: null
        });
        
        const response = await request(app)
          .delete(`/api/payments/methods/${testPaymentMethod.id}`)
          .set('Authorization', authHeader)
          .expect(400);
        
        expect(response.body).toEqual({
          success: false,
          error: 'Cannot delete default payment method',
          message: 'Please set another payment method as default before deleting this one',
          code: 'DEFAULT_PAYMENT_METHOD'
        });
      });
    });
  });

  /**
   * 支付统计测试
   */
  describe('GET /api/payments/stats', () => {
    const statsData = {
      totalRevenue: 15000.00,
      totalOrders: 50,
      completedOrders: 45,
      refundedOrders: 3,
      averageOrderValue: 300.00,
      revenueByMonth: [
        { month: '2024-01', revenue: 5000.00, orders: 15 },
        { month: '2024-02', revenue: 7000.00, orders: 20 },
        { month: '2024-03', revenue: 3000.00, orders: 15 }
      ],
      topCourses: [
        { courseId: 'course_123', title: 'JavaScript 基础', revenue: 5000.00, orders: 20 },
        { courseId: 'course_124', title: 'React 进阶', revenue: 4000.00, orders: 15 }
      ]
    };

    it('应该允许管理员查看支付统计', async () => {
      const authHeader = `Bearer ${validTokens.admin}`;
      
      mockSupabase.rpc.mockImplementation((functionName) => {
        if (functionName === 'get_payment_stats') {
          return Promise.resolve({
            data: statsData,
            error: null
          });
        }
        return Promise.resolve({ data: null, error: null });
      });
      
      const response = await request(app)
        .get('/api/payments/stats')
        .set('Authorization', authHeader)
        .expect(200);
      
      expect(response.body).toEqual({
        success: true,
        data: {
          stats: expect.objectContaining({
            totalRevenue: statsData.totalRevenue,
            totalOrders: statsData.totalOrders,
            completedOrders: statsData.completedOrders,
            refundedOrders: statsData.refundedOrders,
            averageOrderValue: statsData.averageOrderValue,
            revenueByMonth: statsData.revenueByMonth,
            topCourses: statsData.topCourses
          })
        }
      });
      
      expect(mockSupabase.rpc).toHaveBeenCalledWith('get_payment_stats', {});
    });

    it('应该支持时间范围筛选', async () => {
      const authHeader = `Bearer ${validTokens.admin}`;
      const startDate = '2024-01-01';
      const endDate = '2024-03-31';
      
      const response = await request(app)
        .get('/api/payments/stats')
        .set('Authorization', authHeader)
        .query({ startDate, endDate })
        .expect(200);
      
      expect(mockSupabase.rpc).toHaveBeenCalledWith(
        'get_payment_stats',
        {
          start_date: startDate,
          end_date: endDate
        }
      );
    });

    it('应该拒绝非管理员访问', async () => {
      const authHeader = `Bearer ${validTokens.student}`;
      
      const response = await request(app)
        .get('/api/payments/stats')
        .set('Authorization', authHeader)
        .expect(403);
      
      expect(response.body).toEqual({
        success: false,
        error: 'Forbidden',
        message: 'Only administrators can view payment statistics',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    });
  });

  /**
   * 错误处理测试
   */
  describe('Error Handling', () => {
    it('应该处理数据库连接错误', async () => {
      const authHeader = `Bearer ${validTokens.student}`;
      
      mockSupabase.range.mockRejectedValue(
        new Error('Database connection failed')
      );
      
      const response = await request(app)
        .get('/api/payments/orders')
        .set('Authorization', authHeader)
        .expect(500);
      
      expect(response.body).toEqual({
        success: false,
        error: 'Internal server error',
        message: 'Please try again later'
      });
      
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Database error in payments API',
        expect.objectContaining({
          error: 'Database connection failed'
        })
      );
    });

    it('应该处理支付服务错误', async () => {
      const authHeader = `Bearer ${validTokens.student}`;
      
      mockSupabase.single.mockResolvedValue({
        data: testCourse,
        error: null
      });
      
      mockPaymentService.createOrder.mockRejectedValue(
        new Error('Payment service unavailable')
      );
      
      const response = await request(app)
        .post('/api/payments/orders')
        .set('Authorization', authHeader)
        .send({
          courseId: testCourse.id,
          paymentMethod: 'alipay'
        })
        .expect(500);
      
      expect(response.body).toEqual({
        success: false,
        error: 'Payment service error',
        message: 'Unable to create payment order at this time'
      });
    });

    it('应该处理无效的订单ID格式', async () => {
      const authHeader = `Bearer ${validTokens.student}`;
      const invalidOrderId = 'invalid-order-id';
      
      const response = await request(app)
        .get(`/api/payments/orders/${invalidOrderId}`)
        .set('Authorization', authHeader)
        .expect(400);
      
      expect(response.body).toEqual({
        success: false,
        error: 'Invalid order ID format',
        message: 'The provided order ID is not valid',
        code: 'INVALID_ORDER_ID'
      });
    });
  });

  /**
   * 安全性测试
   */
  describe('Security Tests', () => {
    it('应该要求认证访问', async () => {
      const response = await request(app)
        .get('/api/payments/orders')
        .expect(401);
      
      expect(response.body).toEqual({
        success: false,
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    });

    it('应该验证JWT令牌', async () => {
      const invalidToken = 'invalid_token';
      
      const response = await request(app)
        .get('/api/payments/orders')
        .set('Authorization', `Bearer ${invalidToken}`)
        .expect(401);
      
      expect(response.body).toEqual({
        success: false,
        error: 'Invalid token',
        message: 'Please login again'
      });
    });

    it('应该防止SQL注入攻击', async () => {
      const authHeader = `Bearer ${validTokens.student}`;
      const maliciousId = "'; DROP TABLE payment_orders; --";
      
      const response = await request(app)
        .get(`/api/payments/orders/${maliciousId}`)
        .set('Authorization', authHeader)
        .expect(400);
      
      expect(response.body).toEqual({
        success: false,
        error: 'Invalid order ID format',
        message: 'The provided order ID is not valid',
        code: 'INVALID_ORDER_ID'
      });
    });

    it('应该限制请求大小', async () => {
      const authHeader = `Bearer ${validTokens.student}`;
      const largePayload = {
        courseId: testCourse.id,
        paymentMethod: 'alipay',
        data: 'x'.repeat(10000) // 10KB 数据
      };
      
      const response = await request(app)
        .post('/api/payments/orders')
        .set('Authorization', authHeader)
        .send(largePayload)
        .expect(413);
      
      expect(response.body).toEqual({
        success: false,
        error: 'Payload too large',
        message: 'Request size exceeds limit'
      });
    });
  });

  /**
   * 性能测试
   */
  describe('Performance Tests', () => {
    it('应该在合理时间内创建订单', async () => {
      const authHeader = `Bearer ${validTokens.student}`;
      const startTime = Date.now();
      
      mockSupabase.single.mockResolvedValue({
        data: testCourse,
        error: null
      });
      
      await request(app)
        .post('/api/payments/orders')
        .set('Authorization', authHeader)
        .send({
          courseId: testCourse.id,
          paymentMethod: 'alipay'
        })
        .expect(201);
      
      const processingTime = Date.now() - startTime;
      expect(processingTime).toBeLessThan(1000); // 应该在1秒内完成
      
      expect(mockAnalyticsService.timing).toHaveBeenCalledWith(
        'payment_order_creation_duration',
        processingTime
      );
    });

    it('应该高效处理订单查询', async () => {
      const authHeader = `Bearer ${validTokens.student}`;
      const startTime = Date.now();
      
      await request(app)
        .get('/api/payments/orders')
        .set('Authorization', authHeader)
        .expect(200);
      
      const processingTime = Date.now() - startTime;
      expect(processingTime).toBeLessThan(200); // 应该在200ms内完成
    });

    it('应该有效利用缓存', async () => {
      const authHeader = `Bearer ${validTokens.student}`;
      
      // 第一次请求
      await request(app)
        .get('/api/payments/orders')
        .set('Authorization', authHeader)
        .expect(200);
      
      // 设置缓存返回数据
      mockCacheService.get.mockResolvedValue({
        orders: [testPaymentOrder],
        total: 1
      });
      
      // 第二次请求应该使用缓存
      await request(app)
        .get('/api/payments/orders')
        .set('Authorization', authHeader)
        .expect(200);
      
      expect(mockCacheService.set).toHaveBeenCalledWith(
        expect.stringContaining('payment_orders:'),
        expect.any(Object),
        300 // 5分钟缓存
      );
    });
  });
});