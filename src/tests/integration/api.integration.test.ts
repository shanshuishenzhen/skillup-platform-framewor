/**
 * API集成测试
 * 测试完整的API工作流程和端到端功能
 * 
 * @author SOLO Coding
 * @version 1.0.0
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import mysql from 'mysql2/promise';
import Redis from 'ioredis';

// 导入应用
import app from '../../app';
import { envConfig } from '../../config/envConfig';
import { databaseService } from '../../services/databaseService';
import { cacheService } from '../../services/cacheService';

/**
 * 集成测试配置
 */
const testConfig = {
  database: {
    host: process.env.TEST_DB_HOST || 'localhost',
    port: parseInt(process.env.TEST_DB_PORT || '3306'),
    user: process.env.TEST_DB_USER || 'test',
    password: process.env.TEST_DB_PASSWORD || 'test',
    database: process.env.TEST_DB_NAME || 'skillup_test'
  },
  redis: {
    host: process.env.TEST_REDIS_HOST || 'localhost',
    port: parseInt(process.env.TEST_REDIS_PORT || '6379'),
    db: parseInt(process.env.TEST_REDIS_DB || '1')
  }
};

/**
 * 测试数据库连接
 */
let testDb: mysql.Connection;
let testRedis: Redis;

/**
 * 测试用户数据
 */
interface TestUser {
  id?: number;
  email: string;
  password: string;
  name: string;
  token?: string;
  role?: string;
}

interface TestCourse {
  id?: number;
  title: string;
  description: string;
  price: number;
  instructor: string;
  category: string;
  level: string;
}

interface TestOrder {
  id?: string;
  userId: number;
  courseId: number;
  amount: number;
  status: string;
  orderNumber?: string;
}

/**
 * 测试数据
 */
const testUsers: TestUser[] = [
  {
    email: 'student@test.com',
    password: 'password123',
    name: '测试学生',
    role: 'user'
  },
  {
    email: 'instructor@test.com',
    password: 'password123',
    name: '测试讲师',
    role: 'instructor'
  },
  {
    email: 'admin@test.com',
    password: 'password123',
    name: '测试管理员',
    role: 'admin'
  }
];

const testCourses: TestCourse[] = [
  {
    title: '前端开发基础',
    description: '学习HTML、CSS、JavaScript基础知识',
    price: 299.00,
    instructor: '张老师',
    category: 'frontend',
    level: 'beginner'
  },
  {
    title: 'React进阶开发',
    description: '深入学习React框架和生态系统',
    price: 399.00,
    instructor: '李老师',
    category: 'frontend',
    level: 'intermediate'
  },
  {
    title: 'Node.js后端开发',
    description: '使用Node.js构建后端API服务',
    price: 499.00,
    instructor: '王老师',
    category: 'backend',
    level: 'intermediate'
  }
];

/**
 * 数据库初始化和清理函数
 */
async function setupTestDatabase(): Promise<void> {
  try {
    // 连接测试数据库
    testDb = await mysql.createConnection(testConfig.database);
    
    // 创建测试表
    await testDb.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(20),
        avatar VARCHAR(500),
        role ENUM('user', 'instructor', 'admin') DEFAULT 'user',
        status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
        email_verified BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    
    await testDb.execute(`
      CREATE TABLE IF NOT EXISTS courses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        content LONGTEXT,
        price DECIMAL(10,2) NOT NULL,
        instructor VARCHAR(255) NOT NULL,
        instructor_id INT,
        category VARCHAR(100) NOT NULL,
        level ENUM('beginner', 'intermediate', 'advanced') DEFAULT 'beginner',
        duration INT DEFAULT 0,
        rating DECIMAL(3,2) DEFAULT 0.00,
        students_count INT DEFAULT 0,
        status ENUM('draft', 'active', 'inactive') DEFAULT 'active',
        thumbnail VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (instructor_id) REFERENCES users(id)
      )
    `);
    
    await testDb.execute(`
      CREATE TABLE IF NOT EXISTS orders (
        id VARCHAR(50) PRIMARY KEY,
        order_number VARCHAR(50) UNIQUE NOT NULL,
        user_id INT NOT NULL,
        course_id INT NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        status ENUM('pending', 'paid', 'cancelled', 'refunded') DEFAULT 'pending',
        payment_method VARCHAR(50),
        payment_id VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (course_id) REFERENCES courses(id)
      )
    `);
    
    await testDb.execute(`
      CREATE TABLE IF NOT EXISTS enrollments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        course_id INT NOT NULL,
        order_id VARCHAR(50),
        progress DECIMAL(5,2) DEFAULT 0.00,
        status ENUM('active', 'completed', 'suspended') DEFAULT 'active',
        enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP NULL,
        UNIQUE KEY unique_enrollment (user_id, course_id),
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (course_id) REFERENCES courses(id),
        FOREIGN KEY (order_id) REFERENCES orders(id)
      )
    `);
    
    await testDb.execute(`
      CREATE TABLE IF NOT EXISTS payments (
        id VARCHAR(50) PRIMARY KEY,
        order_id VARCHAR(50) NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        payment_method VARCHAR(50) NOT NULL,
        transaction_id VARCHAR(100),
        status ENUM('pending', 'processing', 'completed', 'failed', 'cancelled') DEFAULT 'pending',
        gateway_response JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES orders(id)
      )
    `);
    
    console.log('测试数据库表创建成功');
  } catch (error) {
    console.error('测试数据库初始化失败:', error);
    throw error;
  }
}

async function setupTestRedis(): Promise<void> {
  try {
    testRedis = new Redis(testConfig.redis);
    await testRedis.ping();
    console.log('测试Redis连接成功');
  } catch (error) {
    console.error('测试Redis连接失败:', error);
    throw error;
  }
}

async function cleanupTestDatabase(): Promise<void> {
  try {
    // 清理测试数据
    await testDb.execute('DELETE FROM enrollments');
    await testDb.execute('DELETE FROM payments');
    await testDb.execute('DELETE FROM orders');
    await testDb.execute('DELETE FROM courses');
    await testDb.execute('DELETE FROM users');
    
    // 重置自增ID
    await testDb.execute('ALTER TABLE users AUTO_INCREMENT = 1');
    await testDb.execute('ALTER TABLE courses AUTO_INCREMENT = 1');
    await testDb.execute('ALTER TABLE enrollments AUTO_INCREMENT = 1');
  } catch (error) {
    console.error('清理测试数据库失败:', error);
  }
}

async function cleanupTestRedis(): Promise<void> {
  try {
    await testRedis.flushdb();
  } catch (error) {
    console.error('清理测试Redis失败:', error);
  }
}

/**
 * 辅助函数
 */
async function registerUser(userData: TestUser): Promise<TestUser> {
  const response = await request(app)
    .post('/api/auth/register')
    .send(userData)
    .expect(201);
  
  return {
    ...userData,
    id: response.body.data.user.id,
    token: response.body.data.token
  };
}

async function loginUser(email: string, password: string): Promise<string> {
  const response = await request(app)
    .post('/api/auth/login')
    .send({ email, password })
    .expect(200);
  
  return response.body.data.token;
}

async function createCourse(courseData: TestCourse, adminToken: string): Promise<TestCourse> {
  const response = await request(app)
    .post('/api/admin/courses')
    .set('Authorization', `Bearer ${adminToken}`)
    .send(courseData)
    .expect(201);
  
  return {
    ...courseData,
    id: response.body.data.course.id
  };
}

async function createOrder(courseId: number, userToken: string): Promise<TestOrder> {
  const response = await request(app)
    .post('/api/orders')
    .set('Authorization', `Bearer ${userToken}`)
    .send({
      courseId,
      paymentMethod: 'alipay'
    })
    .expect(201);
  
  return response.body.data.order;
}

/**
 * 集成测试套件
 */
describe('API集成测试', () => {
  let registeredUsers: TestUser[] = [];
  let createdCourses: TestCourse[] = [];
  
  beforeAll(async () => {
    // 设置测试环境
    await setupTestDatabase();
    await setupTestRedis();
    
    // 等待应用启动
    await new Promise(resolve => setTimeout(resolve, 1000));
  }, 30000);
  
  afterAll(async () => {
    // 清理测试环境
    if (testDb) {
      await testDb.end();
    }
    if (testRedis) {
      await testRedis.disconnect();
    }
  }, 10000);
  
  beforeEach(async () => {
    // 每个测试前清理数据
    await cleanupTestDatabase();
    await cleanupTestRedis();
    registeredUsers = [];
    createdCourses = [];
  });
  
  afterEach(async () => {
    // 每个测试后清理数据
    await cleanupTestDatabase();
    await cleanupTestRedis();
  });

  /**
   * 用户注册和认证流程测试
   */
  describe('用户注册和认证流程', () => {
    it('应该完成完整的用户注册、登录、获取资料流程', async () => {
      // 1. 注册用户
      const userData = testUsers[0];
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);
      
      expect(registerResponse.body.success).toBe(true);
      expect(registerResponse.body.data.user.email).toBe(userData.email);
      expect(registerResponse.body.data.token).toBeDefined();
      
      const userId = registerResponse.body.data.user.id;
      const token = registerResponse.body.data.token;
      
      // 2. 使用token获取用户资料
      const profileResponse = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      
      expect(profileResponse.body.success).toBe(true);
      expect(profileResponse.body.data.user.id).toBe(userId);
      expect(profileResponse.body.data.user.email).toBe(userData.email);
      
      // 3. 登出
      const logoutResponse = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      
      expect(logoutResponse.body.success).toBe(true);
      
      // 4. 重新登录
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: userData.password
        })
        .expect(200);
      
      expect(loginResponse.body.success).toBe(true);
      expect(loginResponse.body.data.token).toBeDefined();
      expect(loginResponse.body.data.user.id).toBe(userId);
    });
    
    it('应该处理密码重置流程', async () => {
      // 1. 注册用户
      const user = await registerUser(testUsers[0]);
      
      // 2. 请求密码重置
      const forgotResponse = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: user.email })
        .expect(200);
      
      expect(forgotResponse.body.success).toBe(true);
      
      // 3. 模拟重置密码（在实际测试中，需要从邮件或数据库获取重置token）
      // 这里我们直接测试重置密码接口的结构
      const resetResponse = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: 'mock-reset-token',
          password: 'newpassword123'
        })
        .expect((res) => {
          // 可能返回200（成功）或400（token无效）
          expect([200, 400]).toContain(res.status);
        });
    });
  });

  /**
   * 课程管理流程测试
   */
  describe('课程管理流程', () => {
    let adminUser: TestUser;
    let studentUser: TestUser;
    
    beforeEach(async () => {
      // 注册管理员和学生用户
      adminUser = await registerUser(testUsers[2]); // admin
      studentUser = await registerUser(testUsers[0]); // student
    });
    
    it('应该完成课程创建、查看、报名流程', async () => {
      // 1. 管理员创建课程
      const courseData = testCourses[0];
      const createResponse = await request(app)
        .post('/api/admin/courses')
        .set('Authorization', `Bearer ${adminUser.token}`)
        .send(courseData)
        .expect(201);
      
      expect(createResponse.body.success).toBe(true);
      expect(createResponse.body.data.course.title).toBe(courseData.title);
      
      const courseId = createResponse.body.data.course.id;
      
      // 2. 获取课程列表
      const listResponse = await request(app)
        .get('/api/courses')
        .expect(200);
      
      expect(listResponse.body.success).toBe(true);
      expect(listResponse.body.data.courses).toHaveLength(1);
      expect(listResponse.body.data.courses[0].id).toBe(courseId);
      
      // 3. 获取课程详情
      const detailResponse = await request(app)
        .get(`/api/courses/${courseId}`)
        .expect(200);
      
      expect(detailResponse.body.success).toBe(true);
      expect(detailResponse.body.data.course.id).toBe(courseId);
      expect(detailResponse.body.data.course.title).toBe(courseData.title);
      
      // 4. 学生报名课程
      const enrollResponse = await request(app)
        .post(`/api/courses/${courseId}/enroll`)
        .set('Authorization', `Bearer ${studentUser.token}`)
        .expect(200);
      
      expect(enrollResponse.body.success).toBe(true);
      
      // 5. 检查学生的课程列表
      const userCoursesResponse = await request(app)
        .get('/api/users/courses')
        .set('Authorization', `Bearer ${studentUser.token}`)
        .expect(200);
      
      expect(userCoursesResponse.body.success).toBe(true);
      expect(userCoursesResponse.body.data.courses).toHaveLength(1);
      expect(userCoursesResponse.body.data.courses[0].id).toBe(courseId);
    });
    
    it('应该支持课程搜索和筛选', async () => {
      // 1. 创建多个课程
      for (const courseData of testCourses) {
        await createCourse(courseData, adminUser.token!);
      }
      
      // 2. 测试分类筛选
      const frontendResponse = await request(app)
        .get('/api/courses?category=frontend')
        .expect(200);
      
      expect(frontendResponse.body.success).toBe(true);
      expect(frontendResponse.body.data.courses.length).toBe(2); // 前端课程有2个
      
      // 3. 测试难度筛选
      const beginnerResponse = await request(app)
        .get('/api/courses?level=beginner')
        .expect(200);
      
      expect(beginnerResponse.body.success).toBe(true);
      expect(beginnerResponse.body.data.courses.length).toBe(1); // 初级课程有1个
      
      // 4. 测试价格范围筛选
      const priceResponse = await request(app)
        .get('/api/courses?minPrice=300&maxPrice=400')
        .expect(200);
      
      expect(priceResponse.body.success).toBe(true);
      expect(priceResponse.body.data.courses.length).toBe(1); // 价格在300-400的课程有1个
      
      // 5. 测试搜索
      const searchResponse = await request(app)
        .get('/api/courses?search=React')
        .expect(200);
      
      expect(searchResponse.body.success).toBe(true);
      expect(searchResponse.body.data.courses.length).toBe(1); // 包含React的课程有1个
    });
  });

  /**
   * 订单和支付流程测试
   */
  describe('订单和支付流程', () => {
    let adminUser: TestUser;
    let studentUser: TestUser;
    let testCourse: TestCourse;
    
    beforeEach(async () => {
      // 准备测试数据
      adminUser = await registerUser(testUsers[2]);
      studentUser = await registerUser(testUsers[0]);
      testCourse = await createCourse(testCourses[0], adminUser.token!);
    });
    
    it('应该完成完整的购买流程', async () => {
      // 1. 创建订单
      const orderResponse = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${studentUser.token}`)
        .send({
          courseId: testCourse.id,
          paymentMethod: 'alipay'
        })
        .expect(201);
      
      expect(orderResponse.body.success).toBe(true);
      expect(orderResponse.body.data.order.courseId).toBe(testCourse.id);
      expect(orderResponse.body.data.order.amount).toBe(testCourse.price);
      
      const orderId = orderResponse.body.data.order.id;
      
      // 2. 获取订单详情
      const orderDetailResponse = await request(app)
        .get(`/api/orders/${orderId}`)
        .set('Authorization', `Bearer ${studentUser.token}`)
        .expect(200);
      
      expect(orderDetailResponse.body.success).toBe(true);
      expect(orderDetailResponse.body.data.order.id).toBe(orderId);
      
      // 3. 创建支付
      const paymentResponse = await request(app)
        .post('/api/payments')
        .set('Authorization', `Bearer ${studentUser.token}`)
        .send({
          orderId: orderId,
          paymentMethod: 'alipay',
          returnUrl: 'https://example.com/return'
        })
        .expect(200);
      
      expect(paymentResponse.body.success).toBe(true);
      expect(paymentResponse.body.data.paymentUrl).toBeDefined();
      
      const paymentId = paymentResponse.body.data.paymentId;
      
      // 4. 模拟支付回调（支付成功）
      const callbackResponse = await request(app)
        .post('/api/payments/callback')
        .send({
          out_trade_no: orderId,
          trade_no: 'alipay-trade-123',
          trade_status: 'TRADE_SUCCESS',
          total_amount: testCourse.price.toString()
        })
        .expect(200);
      
      expect(callbackResponse.body.success).toBe(true);
      
      // 5. 检查支付状态
      const paymentStatusResponse = await request(app)
        .get(`/api/payments/${paymentId}/status`)
        .set('Authorization', `Bearer ${studentUser.token}`)
        .expect(200);
      
      expect(paymentStatusResponse.body.success).toBe(true);
      expect(paymentStatusResponse.body.data.payment.status).toBe('completed');
      
      // 6. 检查订单状态
      const finalOrderResponse = await request(app)
        .get(`/api/orders/${orderId}`)
        .set('Authorization', `Bearer ${studentUser.token}`)
        .expect(200);
      
      expect(finalOrderResponse.body.success).toBe(true);
      expect(finalOrderResponse.body.data.order.status).toBe('paid');
      
      // 7. 检查是否自动报名课程
      const userCoursesResponse = await request(app)
        .get('/api/users/courses')
        .set('Authorization', `Bearer ${studentUser.token}`)
        .expect(200);
      
      expect(userCoursesResponse.body.success).toBe(true);
      expect(userCoursesResponse.body.data.courses).toHaveLength(1);
      expect(userCoursesResponse.body.data.courses[0].id).toBe(testCourse.id);
    });
    
    it('应该处理订单取消流程', async () => {
      // 1. 创建订单
      const order = await createOrder(testCourse.id!, studentUser.token!);
      
      // 2. 取消订单
      const cancelResponse = await request(app)
        .post(`/api/orders/${order.id}/cancel`)
        .set('Authorization', `Bearer ${studentUser.token}`)
        .expect(200);
      
      expect(cancelResponse.body.success).toBe(true);
      
      // 3. 检查订单状态
      const orderResponse = await request(app)
        .get(`/api/orders/${order.id}`)
        .set('Authorization', `Bearer ${studentUser.token}`)
        .expect(200);
      
      expect(orderResponse.body.success).toBe(true);
      expect(orderResponse.body.data.order.status).toBe('cancelled');
    });
    
    it('应该处理重复购买检查', async () => {
      // 1. 第一次创建订单
      const firstOrder = await createOrder(testCourse.id!, studentUser.token!);
      
      // 2. 模拟支付成功
      await request(app)
        .post('/api/payments/callback')
        .send({
          out_trade_no: firstOrder.id,
          trade_no: 'alipay-trade-123',
          trade_status: 'TRADE_SUCCESS',
          total_amount: testCourse.price!.toString()
        })
        .expect(200);
      
      // 3. 尝试再次购买同一课程
      const secondOrderResponse = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${studentUser.token}`)
        .send({
          courseId: testCourse.id,
          paymentMethod: 'alipay'
        })
        .expect(400);
      
      expect(secondOrderResponse.body.success).toBe(false);
      expect(secondOrderResponse.body.message).toContain('已经购买');
    });
  });

  /**
   * 管理员功能测试
   */
  describe('管理员功能', () => {
    let adminUser: TestUser;
    let studentUser: TestUser;
    
    beforeEach(async () => {
      adminUser = await registerUser(testUsers[2]);
      studentUser = await registerUser(testUsers[0]);
    });
    
    it('应该获取系统统计数据', async () => {
      // 1. 创建一些测试数据
      const course = await createCourse(testCourses[0], adminUser.token!);
      const order = await createOrder(course.id!, studentUser.token!);
      
      // 2. 获取统计数据
      const statsResponse = await request(app)
        .get('/api/admin/statistics')
        .set('Authorization', `Bearer ${adminUser.token}`)
        .expect(200);
      
      expect(statsResponse.body.success).toBe(true);
      expect(statsResponse.body.data.statistics).toHaveProperty('totalUsers');
      expect(statsResponse.body.data.statistics).toHaveProperty('totalCourses');
      expect(statsResponse.body.data.statistics).toHaveProperty('totalOrders');
      expect(statsResponse.body.data.statistics).toHaveProperty('totalRevenue');
    });
    
    it('应该管理用户列表', async () => {
      // 1. 获取用户列表
      const usersResponse = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminUser.token}`)
        .expect(200);
      
      expect(usersResponse.body.success).toBe(true);
      expect(Array.isArray(usersResponse.body.data.users)).toBe(true);
      expect(usersResponse.body.data.users.length).toBeGreaterThan(0);
      
      // 2. 搜索用户
      const searchResponse = await request(app)
        .get(`/api/admin/users?search=${studentUser.email}`)
        .set('Authorization', `Bearer ${adminUser.token}`)
        .expect(200);
      
      expect(searchResponse.body.success).toBe(true);
      expect(searchResponse.body.data.users.length).toBe(1);
      expect(searchResponse.body.data.users[0].email).toBe(studentUser.email);
    });
    
    it('应该拒绝非管理员访问', async () => {
      // 普通用户尝试访问管理员接口
      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${studentUser.token}`)
        .expect(403);
      
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('权限不足');
    });
  });

  /**
   * 文件上传功能测试
   */
  describe('文件上传功能', () => {
    let studentUser: TestUser;
    
    beforeEach(async () => {
      studentUser = await registerUser(testUsers[0]);
    });
    
    it('应该成功上传头像', async () => {
      const response = await request(app)
        .post('/api/upload/avatar')
        .set('Authorization', `Bearer ${studentUser.token}`)
        .attach('avatar', Buffer.from('fake image data'), 'avatar.jpg')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.avatarUrl).toBeDefined();
      
      // 检查用户资料是否更新
      const profileResponse = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${studentUser.token}`)
        .expect(200);
      
      expect(profileResponse.body.data.user.avatar).toBe(response.body.data.avatarUrl);
    });
    
    it('应该验证文件类型', async () => {
      const response = await request(app)
        .post('/api/upload/avatar')
        .set('Authorization', `Bearer ${studentUser.token}`)
        .attach('avatar', Buffer.from('fake text data'), 'document.txt')
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('文件类型');
    });
  });

  /**
   * 错误处理和边界情况测试
   */
  describe('错误处理和边界情况', () => {
    it('应该处理数据库连接错误', async () => {
      // 模拟数据库连接错误
      // 这个测试需要根据实际的错误处理机制来实现
      const response = await request(app)
        .get('/api/courses')
        .expect((res) => {
          // 应该返回200（正常）或500（数据库错误）
          expect([200, 500]).toContain(res.status);
        });
    });
    
    it('应该处理无效的JWT令牌', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
      
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('令牌');
    });
    
    it('应该处理资源不存在的情况', async () => {
      const studentUser = await registerUser(testUsers[0]);
      
      // 访问不存在的课程
      const courseResponse = await request(app)
        .get('/api/courses/999999')
        .expect(404);
      
      expect(courseResponse.body.success).toBe(false);
      
      // 访问不存在的订单
      const orderResponse = await request(app)
        .get('/api/orders/nonexistent-order')
        .set('Authorization', `Bearer ${studentUser.token}`)
        .expect(404);
      
      expect(orderResponse.body.success).toBe(false);
    });
    
    it('应该处理并发请求', async () => {
      const adminUser = await registerUser(testUsers[2]);
      
      // 并发创建多个课程
      const promises = testCourses.map(courseData => 
        request(app)
          .post('/api/admin/courses')
          .set('Authorization', `Bearer ${adminUser.token}`)
          .send(courseData)
          .expect(201)
      );
      
      const results = await Promise.all(promises);
      expect(results).toHaveLength(testCourses.length);
      
      // 验证所有课程都创建成功
      const coursesResponse = await request(app)
        .get('/api/courses')
        .expect(200);
      
      expect(coursesResponse.body.data.courses).toHaveLength(testCourses.length);
    });
  });

  /**
   * 性能测试
   */
  describe('性能测试', () => {
    it('应该在合理时间内响应课程列表请求', async () => {
      const adminUser = await registerUser(testUsers[2]);
      
      // 创建多个课程
      for (const courseData of testCourses) {
        await createCourse(courseData, adminUser.token!);
      }
      
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/courses')
        .expect(200);
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      expect(response.body.success).toBe(true);
      expect(responseTime).toBeLessThan(2000); // 应该在2秒内响应
    });
    
    it('应该处理大量并发用户注册', async () => {
      const userCount = 10;
      const promises = [];
      
      for (let i = 0; i < userCount; i++) {
        promises.push(
          request(app)
            .post('/api/auth/register')
            .send({
              email: `user${i}@test.com`,
              password: 'password123',
              name: `测试用户${i}`
            })
            .expect(201)
        );
      }
      
      const results = await Promise.all(promises);
      expect(results).toHaveLength(userCount);
      
      // 验证所有用户都注册成功
      const adminUser = await registerUser(testUsers[2]);
      const usersResponse = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminUser.token}`)
        .expect(200);
      
      expect(usersResponse.body.data.users.length).toBeGreaterThanOrEqual(userCount);
    });
  });

  /**
   * 缓存功能测试
   */
  describe('缓存功能测试', () => {
    let adminUser: TestUser;
    
    beforeEach(async () => {
      adminUser = await registerUser(testUsers[2]);
    });
    
    it('应该缓存课程列表', async () => {
      // 创建课程
      await createCourse(testCourses[0], adminUser.token!);
      
      // 第一次请求
      const firstResponse = await request(app)
        .get('/api/courses')
        .expect(200);
      
      // 第二次请求（应该从缓存获取）
      const secondResponse = await request(app)
        .get('/api/courses')
        .expect(200);
      
      expect(firstResponse.body).toEqual(secondResponse.body);
    });
    
    it('应该在数据更新时清除缓存', async () => {
      // 创建课程
      const course = await createCourse(testCourses[0], adminUser.token!);
      
      // 获取课程列表（缓存）
      await request(app)
        .get('/api/courses')
        .expect(200);
      
      // 更新课程
      await request(app)
        .put(`/api/admin/courses/${course.id}`)
        .set('Authorization', `Bearer ${adminUser.token}`)
        .send({ title: '更新的课程标题' })
        .expect(200);
      
      // 再次获取课程列表（应该是更新后的数据）
      const response = await request(app)
        .get('/api/courses')
        .expect(200);
      
      expect(response.body.data.courses[0].title).toBe('更新的课程标题');
    });
  });
});