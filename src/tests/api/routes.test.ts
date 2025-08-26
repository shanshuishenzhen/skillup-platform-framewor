/**
 * API路由单元测试
 * 测试用户认证、课程管理、订单处理、支付等API端点
 * 
 * @author SOLO Coding
 * @version 1.0.0
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import bcrypt from 'bcrypt';
import jsonwebtoken from 'jsonwebtoken';

// 模拟依赖
jest.mock('../../config/envConfig', () => ({
  envConfig: {
    server: {
      port: 3000,
      host: 'localhost'
    },
    jwt: {
      secret: 'test-jwt-secret',
      expiresIn: '24h'
    },
    database: {
      host: 'localhost',
      port: 3306,
      user: 'test',
      password: 'test',
      database: 'test_db'
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
    validateNumber: jest.fn(() => true),
    validateEmail: jest.fn(() => true),
    validateObject: jest.fn(() => true),
    validateArray: jest.fn(() => true)
  }
}));

// 模拟JWT
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(() => 'mock-jwt-token'),
  verify: jest.fn(() => ({
    userId: 'user-123',
    email: 'test@example.com',
    role: 'user'
  })),
  decode: jest.fn(() => ({
    userId: 'user-123',
    email: 'test@example.com'
  }))
}));

// 模拟bcrypt
jest.mock('bcrypt', () => ({
  hash: jest.fn(() => Promise.resolve('hashed-password')),
  compare: jest.fn(() => Promise.resolve(true))
}));

// 模拟数据库服务
const mockDatabase = {
  query: jest.fn(),
  execute: jest.fn(),
  beginTransaction: jest.fn(),
  commit: jest.fn(),
  rollback: jest.fn()
};

jest.mock('../../services/databaseService', () => ({
  databaseService: mockDatabase
}));

// 模拟缓存服务
const mockCache = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  exists: jest.fn(() => Promise.resolve(false))
};

jest.mock('../../services/cacheService', () => ({
  cacheService: mockCache
}));

// 模拟邮件服务
const mockEmail = {
  sendEmail: jest.fn(() => Promise.resolve(true)),
  sendTemplateEmail: jest.fn(() => Promise.resolve(true))
};

jest.mock('../../services/emailService', () => ({
  emailService: mockEmail
}));

// 模拟短信服务
const mockSmsService = {
  sendVerificationCode: jest.fn(() => Promise.resolve(true)),
  verifyCode: jest.fn(() => Promise.resolve(true))
};

jest.mock('../../services/smsService', () => ({
  smsService: mockSmsService
}));

// 模拟支付服务
const mockPayment = {
  createPayment: jest.fn(() => Promise.resolve({
    id: 'payment-123',
    status: 'pending',
    amount: 100.00
  })),
  processPayment: jest.fn(() => Promise.resolve({
    paymentUrl: 'https://payment.example.com/pay/123'
  }))
};

jest.mock('../../services/paymentService', () => ({
  paymentService: mockPayment
}));

// 模拟文件上传服务
const mockFileUpload = {
  uploadFile: jest.fn(() => Promise.resolve({
    fileId: 'file-123',
    url: 'https://cdn.example.com/file-123.jpg'
  }))
};

jest.mock('../../services/fileUploadService', () => ({
  fileUploadService: mockFileUpload
}));

// 导入路由
import authRoutes from '../../api/routes/auth';
import userRoutes from '../../api/routes/users';
import courseRoutes from '../../api/routes/courses';
import orderRoutes from '../../api/routes/orders';
import paymentRoutes from '../../api/routes/payments';
import uploadRoutes from '../../api/routes/upload';
import adminRoutes from '../../api/routes/admin';

// 创建测试应用
function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  
  // 注册路由
  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/courses', courseRoutes);
  app.use('/api/orders', orderRoutes);
  app.use('/api/payments', paymentRoutes);
  app.use('/api/upload', uploadRoutes);
  app.use('/api/admin', adminRoutes);
  
  return app;
}

describe('API路由测试', () => {
  let app: express.Application;
  
  beforeEach(() => {
    app = createTestApp();
    jest.clearAllMocks();
    
    // 默认数据库响应
    mockDatabase.query.mockResolvedValue([]);
    mockDatabase.execute.mockResolvedValue({ affectedRows: 1, insertId: 1 });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  /**
   * 认证路由测试
   */
  describe('认证路由 (/api/auth)', () => {
    describe('POST /api/auth/register', () => {
      it('应该成功注册新用户', async () => {
        const userData = {
          email: 'test@example.com',
          password: 'password123',
          name: '测试用户',
          phone: '13800138000'
        };
        
        // 模拟用户不存在
        mockDatabase.query.mockResolvedValueOnce([]);
        // 模拟插入用户成功
        mockDatabase.execute.mockResolvedValueOnce({ insertId: 1, affectedRows: 1 });
        // 模拟获取新用户
        mockDatabase.query.mockResolvedValueOnce([{
          id: 1,
          email: 'test@example.com',
          name: '测试用户',
          phone: '13800138000',
          role: 'user',
          status: 'active'
        }]);
        
        const response = await request(app)
          .post('/api/auth/register')
          .send(userData)
          .expect(201);
        
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('user');
        expect(response.body.data).toHaveProperty('token');
        expect(response.body.data.user.email).toBe(userData.email);
      });
      
      it('应该拒绝重复邮箱注册', async () => {
        const userData = {
          email: 'existing@example.com',
          password: 'password123',
          name: '测试用户'
        };
        
        // 模拟用户已存在
        mockDatabase.query.mockResolvedValueOnce([{
          id: 1,
          email: 'existing@example.com'
        }]);
        
        const response = await request(app)
          .post('/api/auth/register')
          .send(userData)
          .expect(400);
        
        expect(response.body).toHaveProperty('success', false);
        expect(response.body).toHaveProperty('message');
        expect(response.body.message).toContain('邮箱已存在');
      });
      
      it('应该验证必填字段', async () => {
        const response = await request(app)
          .post('/api/auth/register')
          .send({})
          .expect(400);
        
        expect(response.body).toHaveProperty('success', false);
        expect(response.body).toHaveProperty('message');
      });
    });
    
    describe('POST /api/auth/login', () => {
      it('应该成功登录', async () => {
        const loginData = {
          email: 'test@example.com',
          password: 'password123'
        };
        
        // 模拟找到用户
        mockDatabase.query.mockResolvedValueOnce([{
          id: 1,
          email: 'test@example.com',
          password: 'hashed-password',
          name: '测试用户',
          role: 'user',
          status: 'active'
        }]);
        
        const response = await request(app)
          .post('/api/auth/login')
          .send(loginData)
          .expect(200);
        
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('user');
        expect(response.body.data).toHaveProperty('token');
      });
      
      it('应该拒绝错误的邮箱', async () => {
        const loginData = {
          email: 'nonexistent@example.com',
          password: 'password123'
        };
        
        // 模拟用户不存在
        mockDatabase.query.mockResolvedValueOnce([]);
        
        const response = await request(app)
          .post('/api/auth/login')
          .send(loginData)
          .expect(401);
        
        expect(response.body).toHaveProperty('success', false);
        expect(response.body).toHaveProperty('message');
      });
      
      it('应该拒绝错误的密码', async () => {
        const loginData = {
          email: 'test@example.com',
          password: 'wrongpassword'
        };
        
        // 模拟找到用户
        mockDatabase.query.mockResolvedValueOnce([{
          id: 1,
          email: 'test@example.com',
          password: 'hashed-password'
        }]);
        
        // 模拟密码不匹配
        const bcrypt = jest.mocked(require('bcrypt'));
        bcrypt.compare.mockResolvedValueOnce(false);
        
        const response = await request(app)
          .post('/api/auth/login')
          .send(loginData)
          .expect(401);
        
        expect(response.body).toHaveProperty('success', false);
      });
    });
    
    describe('POST /api/auth/logout', () => {
      it('应该成功登出', async () => {
        const response = await request(app)
          .post('/api/auth/logout')
          .set('Authorization', 'Bearer mock-jwt-token')
          .expect(200);
        
        expect(response.body).toHaveProperty('success', true);
      });
    });
    
    describe('POST /api/auth/forgot-password', () => {
      it('应该发送重置密码短信', async () => {
        const requestData = {
          phone: '13800138000'
        };
        
        // 模拟找到用户
        mockDatabase.query.mockResolvedValueOnce([{
          id: 1,
          phone: '13800138000',
          name: '测试用户'
        }]);
        
        const response = await request(app)
          .post('/api/auth/forgot-password')
          .send(requestData)
          .expect(200);
        
        expect(response.body).toHaveProperty('success', true);
        expect(mockSmsService.sendVerificationCode).toHaveBeenCalled();
      });
    });
    
    describe('POST /api/auth/reset-password', () => {
      it('应该成功重置密码', async () => {
        const resetData = {
          token: 'reset-token-123',
          password: 'newpassword123'
        };
        
        // 模拟找到重置记录
        mockDatabase.query.mockResolvedValueOnce([{
          id: 1,
          user_id: 1,
          token: 'reset-token-123',
          expires_at: new Date(Date.now() + 3600000) // 1小时后过期
        }]);
        
        const response = await request(app)
          .post('/api/auth/reset-password')
          .send(resetData)
          .expect(200);
        
        expect(response.body).toHaveProperty('success', true);
      });
    });
  });

  /**
   * 用户路由测试
   */
  describe('用户路由 (/api/users)', () => {
    const mockAuthToken = 'Bearer mock-jwt-token';
    
    describe('GET /api/users/profile', () => {
      it('应该获取用户资料', async () => {
        // 模拟获取用户信息
        mockDatabase.query.mockResolvedValueOnce([{
          id: 1,
          email: 'test@example.com',
          name: '测试用户',
          phone: '13800138000',
          avatar: 'https://example.com/avatar.jpg',
          role: 'user',
          status: 'active',
          created_at: new Date()
        }]);
        
        const response = await request(app)
          .get('/api/users/profile')
          .set('Authorization', mockAuthToken)
          .expect(200);
        
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('user');
      });
      
      it('应该拒绝未认证的请求', async () => {
        const response = await request(app)
          .get('/api/users/profile')
          .expect(401);
        
        expect(response.body).toHaveProperty('success', false);
      });
    });
    
    describe('PUT /api/users/profile', () => {
      it('应该更新用户资料', async () => {
        const updateData = {
          name: '更新的用户名',
          phone: '13900139000'
        };
        
        const response = await request(app)
          .put('/api/users/profile')
          .set('Authorization', mockAuthToken)
          .send(updateData)
          .expect(200);
        
        expect(response.body).toHaveProperty('success', true);
        expect(mockDatabase.execute).toHaveBeenCalledWith(
          expect.stringContaining('UPDATE users'),
          expect.arrayContaining(['更新的用户名', '13900139000'])
        );
      });
    });
    
    describe('POST /api/users/change-password', () => {
      it('应该成功修改密码', async () => {
        const passwordData = {
          currentPassword: 'oldpassword',
          newPassword: 'newpassword123'
        };
        
        // 模拟获取用户当前密码
        mockDatabase.query.mockResolvedValueOnce([{
          id: 1,
          password: 'hashed-old-password'
        }]);
        
        const response = await request(app)
          .post('/api/users/change-password')
          .set('Authorization', mockAuthToken)
          .send(passwordData)
          .expect(200);
        
        expect(response.body).toHaveProperty('success', true);
      });
    });
    
    describe('GET /api/users/courses', () => {
      it('应该获取用户课程列表', async () => {
        // 模拟获取用户课程
        mockDatabase.query.mockResolvedValueOnce([
          {
            id: 1,
            title: '课程1',
            progress: 50,
            status: 'in_progress'
          },
          {
            id: 2,
            title: '课程2',
            progress: 100,
            status: 'completed'
          }
        ]);
        
        const response = await request(app)
          .get('/api/users/courses')
          .set('Authorization', mockAuthToken)
          .expect(200);
        
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(Array.isArray(response.body.data.courses)).toBe(true);
      });
    });
  });

  /**
   * 课程路由测试
   */
  describe('课程路由 (/api/courses)', () => {
    describe('GET /api/courses', () => {
      it('应该获取课程列表', async () => {
        // 模拟获取课程列表
        mockDatabase.query.mockResolvedValueOnce([
          {
            id: 1,
            title: '前端开发基础',
            description: '学习HTML、CSS、JavaScript',
            price: 299.00,
            instructor: '张老师',
            rating: 4.8,
            students_count: 1500
          },
          {
            id: 2,
            title: 'React进阶',
            description: '深入学习React框架',
            price: 399.00,
            instructor: '李老师',
            rating: 4.9,
            students_count: 800
          }
        ]);
        
        const response = await request(app)
          .get('/api/courses')
          .expect(200);
        
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(Array.isArray(response.body.data.courses)).toBe(true);
        expect(response.body.data.courses).toHaveLength(2);
      });
      
      it('应该支持分页查询', async () => {
        mockDatabase.query.mockResolvedValueOnce([
          { id: 1, title: '课程1' },
          { id: 2, title: '课程2' }
        ]);
        
        const response = await request(app)
          .get('/api/courses?page=1&limit=10')
          .expect(200);
        
        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data).toHaveProperty('pagination');
      });
      
      it('应该支持分类筛选', async () => {
        mockDatabase.query.mockResolvedValueOnce([
          { id: 1, title: '前端课程', category: 'frontend' }
        ]);
        
        const response = await request(app)
          .get('/api/courses?category=frontend')
          .expect(200);
        
        expect(response.body).toHaveProperty('success', true);
      });
    });
    
    describe('GET /api/courses/:id', () => {
      it('应该获取课程详情', async () => {
        const courseId = 1;
        
        // 模拟获取课程详情
        mockDatabase.query.mockResolvedValueOnce([{
          id: 1,
          title: '前端开发基础',
          description: '学习HTML、CSS、JavaScript',
          content: '详细的课程内容...',
          price: 299.00,
          instructor: '张老师',
          rating: 4.8,
          students_count: 1500,
          duration: 120,
          level: 'beginner'
        }]);
        
        const response = await request(app)
          .get(`/api/courses/${courseId}`)
          .expect(200);
        
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(response.body.data.course.id).toBe(courseId);
      });
      
      it('应该处理课程不存在的情况', async () => {
        const courseId = 999;
        
        // 模拟课程不存在
        mockDatabase.query.mockResolvedValueOnce([]);
        
        const response = await request(app)
          .get(`/api/courses/${courseId}`)
          .expect(404);
        
        expect(response.body).toHaveProperty('success', false);
        expect(response.body).toHaveProperty('message');
      });
    });
    
    describe('POST /api/courses/:id/enroll', () => {
      const mockAuthToken = 'Bearer mock-jwt-token';
      
      it('应该成功报名课程', async () => {
        const courseId = 1;
        
        // 模拟获取课程信息
        mockDatabase.query.mockResolvedValueOnce([{
          id: 1,
          title: '前端开发基础',
          price: 299.00,
          status: 'active'
        }]);
        
        // 模拟检查是否已报名
        mockDatabase.query.mockResolvedValueOnce([]);
        
        const response = await request(app)
          .post(`/api/courses/${courseId}/enroll`)
          .set('Authorization', mockAuthToken)
          .expect(200);
        
        expect(response.body).toHaveProperty('success', true);
        expect(mockDatabase.execute).toHaveBeenCalled();
      });
      
      it('应该拒绝重复报名', async () => {
        const courseId = 1;
        
        // 模拟获取课程信息
        mockDatabase.query.mockResolvedValueOnce([{
          id: 1,
          title: '前端开发基础',
          price: 299.00
        }]);
        
        // 模拟已经报名
        mockDatabase.query.mockResolvedValueOnce([{
          id: 1,
          user_id: 1,
          course_id: 1
        }]);
        
        const response = await request(app)
          .post(`/api/courses/${courseId}/enroll`)
          .set('Authorization', mockAuthToken)
          .expect(400);
        
        expect(response.body).toHaveProperty('success', false);
        expect(response.body.message).toContain('已经报名');
      });
    });
  });

  /**
   * 订单路由测试
   */
  describe('订单路由 (/api/orders)', () => {
    const mockAuthToken = 'Bearer mock-jwt-token';
    
    describe('POST /api/orders', () => {
      it('应该成功创建订单', async () => {
        const orderData = {
          courseId: 1,
          paymentMethod: 'alipay'
        };
        
        // 模拟获取课程信息
        mockDatabase.query.mockResolvedValueOnce([{
          id: 1,
          title: '前端开发基础',
          price: 299.00,
          status: 'active'
        }]);
        
        // 模拟创建订单
        mockDatabase.execute.mockResolvedValueOnce({
          insertId: 1,
          affectedRows: 1
        });
        
        const response = await request(app)
          .post('/api/orders')
          .set('Authorization', mockAuthToken)
          .send(orderData)
          .expect(201);
        
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('order');
      });
    });
    
    describe('GET /api/orders', () => {
      it('应该获取用户订单列表', async () => {
        // 模拟获取订单列表
        mockDatabase.query.mockResolvedValueOnce([
          {
            id: 1,
            order_number: 'ORD-20240101-001',
            course_title: '前端开发基础',
            amount: 299.00,
            status: 'completed',
            created_at: new Date()
          },
          {
            id: 2,
            order_number: 'ORD-20240101-002',
            course_title: 'React进阶',
            amount: 399.00,
            status: 'pending',
            created_at: new Date()
          }
        ]);
        
        const response = await request(app)
          .get('/api/orders')
          .set('Authorization', mockAuthToken)
          .expect(200);
        
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(Array.isArray(response.body.data.orders)).toBe(true);
      });
    });
    
    describe('GET /api/orders/:id', () => {
      it('应该获取订单详情', async () => {
        const orderId = 1;
        
        // 模拟获取订单详情
        mockDatabase.query.mockResolvedValueOnce([{
          id: 1,
          order_number: 'ORD-20240101-001',
          user_id: 1,
          course_id: 1,
          course_title: '前端开发基础',
          amount: 299.00,
          status: 'completed',
          payment_method: 'alipay',
          created_at: new Date()
        }]);
        
        const response = await request(app)
          .get(`/api/orders/${orderId}`)
          .set('Authorization', mockAuthToken)
          .expect(200);
        
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(response.body.data.order.id).toBe(orderId);
      });
    });
    
    describe('POST /api/orders/:id/cancel', () => {
      it('应该成功取消订单', async () => {
        const orderId = 1;
        
        // 模拟获取订单信息
        mockDatabase.query.mockResolvedValueOnce([{
          id: 1,
          user_id: 1,
          status: 'pending'
        }]);
        
        const response = await request(app)
          .post(`/api/orders/${orderId}/cancel`)
          .set('Authorization', mockAuthToken)
          .expect(200);
        
        expect(response.body).toHaveProperty('success', true);
        expect(mockDatabase.execute).toHaveBeenCalledWith(
          expect.stringContaining('UPDATE orders'),
          expect.arrayContaining(['cancelled'])
        );
      });
    });
  });

  /**
   * 支付路由测试
   */
  describe('支付路由 (/api/payments)', () => {
    const mockAuthToken = 'Bearer mock-jwt-token';
    
    describe('POST /api/payments', () => {
      it('应该创建支付', async () => {
        const paymentData = {
          orderId: 'order-123',
          paymentMethod: 'alipay',
          returnUrl: 'https://example.com/return'
        };
        
        // 模拟获取订单信息
        mockDatabase.query.mockResolvedValueOnce([{
          id: 'order-123',
          user_id: 1,
          amount: 299.00,
          status: 'pending'
        }]);
        
        const response = await request(app)
          .post('/api/payments')
          .set('Authorization', mockAuthToken)
          .send(paymentData)
          .expect(200);
        
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('paymentUrl');
      });
    });
    
    describe('POST /api/payments/callback', () => {
      it('应该处理支付回调', async () => {
        const callbackData = {
          out_trade_no: 'order-123',
          trade_no: 'alipay-trade-123',
          trade_status: 'TRADE_SUCCESS',
          total_amount: '299.00'
        };
        
        const response = await request(app)
          .post('/api/payments/callback')
          .send(callbackData)
          .expect(200);
        
        expect(response.body).toHaveProperty('success', true);
      });
    });
    
    describe('GET /api/payments/:id/status', () => {
      it('应该查询支付状态', async () => {
        const paymentId = 'payment-123';
        
        // 模拟获取支付状态
        mockDatabase.query.mockResolvedValueOnce([{
          id: 'payment-123',
          status: 'completed',
          amount: 299.00,
          transaction_id: 'tx-123'
        }]);
        
        const response = await request(app)
          .get(`/api/payments/${paymentId}/status`)
          .set('Authorization', mockAuthToken)
          .expect(200);
        
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(response.body.data.payment.status).toBe('completed');
      });
    });
  });

  /**
   * 文件上传路由测试
   */
  describe('文件上传路由 (/api/upload)', () => {
    const mockAuthToken = 'Bearer mock-jwt-token';
    
    describe('POST /api/upload/image', () => {
      it('应该成功上传图片', async () => {
        const response = await request(app)
          .post('/api/upload/image')
          .set('Authorization', mockAuthToken)
          .attach('file', Buffer.from('fake image data'), 'test.jpg')
          .expect(200);
        
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('url');
      });
    });
    
    describe('POST /api/upload/avatar', () => {
      it('应该成功上传头像', async () => {
        const response = await request(app)
          .post('/api/upload/avatar')
          .set('Authorization', mockAuthToken)
          .attach('avatar', Buffer.from('fake avatar data'), 'avatar.jpg')
          .expect(200);
        
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('avatarUrl');
      });
    });
  });

  /**
   * 管理员路由测试
   */
  describe('管理员路由 (/api/admin)', () => {
    const mockAdminToken = 'Bearer mock-admin-jwt-token';
    
    beforeEach(() => {
      // 模拟管理员JWT验证
      const jwt = jest.mocked(require('jsonwebtoken'));
      jwt.verify.mockReturnValue({
        userId: 'admin-123',
        email: 'admin@example.com',
        role: 'admin'
      });
    });
    
    describe('GET /api/admin/users', () => {
      it('应该获取用户列表', async () => {
        // 模拟获取用户列表
        mockDatabase.query.mockResolvedValueOnce([
          {
            id: 1,
            email: 'user1@example.com',
            name: '用户1',
            role: 'user',
            status: 'active'
          },
          {
            id: 2,
            email: 'user2@example.com',
            name: '用户2',
            role: 'user',
            status: 'active'
          }
        ]);
        
        const response = await request(app)
          .get('/api/admin/users')
          .set('Authorization', mockAdminToken)
          .expect(200);
        
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(Array.isArray(response.body.data.users)).toBe(true);
      });
    });
    
    describe('POST /api/admin/courses', () => {
      it('应该创建新课程', async () => {
        const courseData = {
          title: '新课程',
          description: '课程描述',
          price: 399.00,
          category: 'frontend',
          level: 'intermediate'
        };
        
        const response = await request(app)
          .post('/api/admin/courses')
          .set('Authorization', mockAdminToken)
          .send(courseData)
          .expect(201);
        
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('course');
      });
    });
    
    describe('GET /api/admin/statistics', () => {
      it('应该获取统计数据', async () => {
        // 模拟获取统计数据
        mockDatabase.query.mockResolvedValueOnce([{
          total_users: 1000,
          total_courses: 50,
          total_orders: 500,
          total_revenue: 150000.00
        }]);
        
        const response = await request(app)
          .get('/api/admin/statistics')
          .set('Authorization', mockAdminToken)
          .expect(200);
        
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('statistics');
      });
    });
  });

  /**
   * 错误处理测试
   */
  describe('错误处理', () => {
    it('应该处理404错误', async () => {
      const response = await request(app)
        .get('/api/nonexistent')
        .expect(404);
      
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message');
    });
    
    it('应该处理数据库错误', async () => {
      // 模拟数据库错误
      mockDatabase.query.mockRejectedValueOnce(new Error('数据库连接失败'));
      
      const response = await request(app)
        .get('/api/courses')
        .expect(500);
      
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message');
    });
    
    it('应该处理验证错误', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'invalid-email',
          password: '123' // 密码太短
        })
        .expect(400);
      
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message');
    });
  });

  /**
   * 中间件测试
   */
  describe('中间件测试', () => {
    it('应该验证JWT令牌', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
      
      expect(response.body).toHaveProperty('success', false);
    });
    
    it('应该验证管理员权限', async () => {
      // 模拟普通用户JWT
      const jwt = jest.mocked(require('jsonwebtoken'));
      jwt.verify.mockReturnValue({
        userId: 'user-123',
        email: 'user@example.com',
        role: 'user' // 非管理员
      });
      
      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', 'Bearer user-token')
        .expect(403);
      
      expect(response.body).toHaveProperty('success', false);
      expect(response.body.message).toContain('权限不足');
    });
    
    it('应该处理请求限流', async () => {
      // 模拟大量请求
      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(
          request(app)
            .get('/api/courses')
            .expect((res) => {
              expect([200, 429]).toContain(res.status);
            })
        );
      }
      
      await Promise.all(promises);
    });
  });

  /**
   * 性能测试
   */
  describe('性能测试', () => {
    it('应该快速响应课程列表请求', async () => {
      const startTime = Date.now();
      
      await request(app)
        .get('/api/courses')
        .expect(200);
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      expect(responseTime).toBeLessThan(1000); // 应该在1秒内响应
    });
    
    it('应该处理并发请求', async () => {
      const promises = [];
      
      for (let i = 0; i < 10; i++) {
        promises.push(
          request(app)
            .get('/api/courses')
            .expect(200)
        );
      }
      
      const results = await Promise.all(promises);
      expect(results).toHaveLength(10);
    });
  });
});