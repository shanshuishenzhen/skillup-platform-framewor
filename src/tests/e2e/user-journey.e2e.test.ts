/**
 * 端到端测试 - 用户完整体验流程
 * 测试从用户注册到课程学习的完整用户旅程
 * 
 * @author SOLO Coding
 * @version 1.0.0
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, jest } from '@jest/globals';
import request from 'supertest';
import puppeteer, { Browser, Page } from 'puppeteer';
import mysql from 'mysql2/promise';
import Redis from 'ioredis';

// 导入应用
import app from '../../app';
import { envConfig } from '../../config/envConfig';

/**
 * E2E测试配置
 */
const e2eConfig = {
  baseUrl: process.env.E2E_BASE_URL || 'http://localhost:3000',
  headless: process.env.E2E_HEADLESS !== 'false',
  slowMo: parseInt(process.env.E2E_SLOW_MO || '0'),
  timeout: parseInt(process.env.E2E_TIMEOUT || '30000'),
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
 * 测试数据
 */
interface TestUser {
  email: string;
  password: string;
  name: string;
  phone?: string;
}

interface TestCourse {
  title: string;
  description: string;
  price: number;
  instructor: string;
  category: string;
  level: string;
}

const testUsers: TestUser[] = [
  {
    email: 'student@e2e.com',
    password: 'Password123!',
    name: '张三',
    phone: '13800138000'
  },
  {
    email: 'instructor@e2e.com',
    password: 'Password123!',
    name: '李老师',
    phone: '13800138001'
  },
  {
    email: 'admin@e2e.com',
    password: 'Password123!',
    name: '管理员',
    phone: '13800138002'
  }
];

const testCourses: TestCourse[] = [
  {
    title: 'JavaScript基础入门',
    description: '从零开始学习JavaScript编程语言，掌握前端开发基础技能。',
    price: 199.00,
    instructor: '李老师',
    category: 'frontend',
    level: 'beginner'
  },
  {
    title: 'React实战开发',
    description: '深入学习React框架，构建现代化的前端应用程序。',
    price: 399.00,
    instructor: '李老师',
    category: 'frontend',
    level: 'intermediate'
  }
];

/**
 * 浏览器和页面实例
 */
let browser: Browser;
let page: Page;
let testDb: mysql.Connection;
let testRedis: Redis;

/**
 * 页面选择器
 */
const selectors = {
  // 导航
  nav: {
    logo: '[data-testid="logo"]',
    loginBtn: '[data-testid="login-btn"]',
    registerBtn: '[data-testid="register-btn"]',
    userMenu: '[data-testid="user-menu"]',
    logoutBtn: '[data-testid="logout-btn"]',
    coursesLink: '[data-testid="courses-link"]',
    profileLink: '[data-testid="profile-link"]'
  },
  // 登录页面
  login: {
    emailInput: '[data-testid="login-email"]',
    passwordInput: '[data-testid="login-password"]',
    submitBtn: '[data-testid="login-submit"]',
    registerLink: '[data-testid="login-register-link"]',
    forgotPasswordLink: '[data-testid="forgot-password-link"]'
  },
  // 注册页面
  register: {
    nameInput: '[data-testid="register-name"]',
    emailInput: '[data-testid="register-email"]',
    passwordInput: '[data-testid="register-password"]',
    confirmPasswordInput: '[data-testid="register-confirm-password"]',
    phoneInput: '[data-testid="register-phone"]',
    submitBtn: '[data-testid="register-submit"]',
    loginLink: '[data-testid="register-login-link"]'
  },
  // 课程列表页面
  courses: {
    searchInput: '[data-testid="courses-search"]',
    categoryFilter: '[data-testid="category-filter"]',
    levelFilter: '[data-testid="level-filter"]',
    priceFilter: '[data-testid="price-filter"]',
    courseCard: '[data-testid="course-card"]',
    courseTitle: '[data-testid="course-title"]',
    coursePrice: '[data-testid="course-price"]',
    courseInstructor: '[data-testid="course-instructor"]',
    enrollBtn: '[data-testid="course-enroll-btn"]'
  },
  // 课程详情页面
  courseDetail: {
    title: '[data-testid="course-detail-title"]',
    description: '[data-testid="course-detail-description"]',
    price: '[data-testid="course-detail-price"]',
    instructor: '[data-testid="course-detail-instructor"]',
    enrollBtn: '[data-testid="course-detail-enroll"]',
    curriculum: '[data-testid="course-curriculum"]',
    reviews: '[data-testid="course-reviews"]'
  },
  // 订单页面
  order: {
    courseInfo: '[data-testid="order-course-info"]',
    totalAmount: '[data-testid="order-total-amount"]',
    paymentMethod: '[data-testid="payment-method"]',
    alipayOption: '[data-testid="payment-alipay"]',
    wechatOption: '[data-testid="payment-wechat"]',
    submitBtn: '[data-testid="order-submit"]'
  },
  // 支付页面
  payment: {
    qrCode: '[data-testid="payment-qr-code"]',
    paymentStatus: '[data-testid="payment-status"]',
    successMessage: '[data-testid="payment-success"]',
    failureMessage: '[data-testid="payment-failure"]',
    retryBtn: '[data-testid="payment-retry"]'
  },
  // 用户中心
  profile: {
    nameInput: '[data-testid="profile-name"]',
    emailDisplay: '[data-testid="profile-email"]',
    phoneInput: '[data-testid="profile-phone"]',
    avatarUpload: '[data-testid="avatar-upload"]',
    saveBtn: '[data-testid="profile-save"]',
    changePasswordBtn: '[data-testid="change-password-btn"]'
  },
  // 我的课程
  myCourses: {
    courseList: '[data-testid="my-courses-list"]',
    courseItem: '[data-testid="my-course-item"]',
    continueBtn: '[data-testid="continue-learning-btn"]',
    progressBar: '[data-testid="course-progress"]'
  },
  // 通用
  common: {
    loading: '[data-testid="loading"]',
    errorMessage: '[data-testid="error-message"]',
    successMessage: '[data-testid="success-message"]',
    confirmDialog: '[data-testid="confirm-dialog"]',
    confirmBtn: '[data-testid="confirm-btn"]',
    cancelBtn: '[data-testid="cancel-btn"]'
  }
};

/**
 * 辅助函数
 */
class E2EHelpers {
  /**
   * 等待元素出现
   */
  static async waitForElement(page: Page, selector: string, timeout = 5000): Promise<void> {
    await page.waitForSelector(selector, { timeout });
  }

  /**
   * 等待元素消失
   */
  static async waitForElementToDisappear(page: Page, selector: string, timeout = 5000): Promise<void> {
    await page.waitForSelector(selector, { hidden: true, timeout });
  }

  /**
   * 填写表单
   */
  static async fillForm(page: Page, formData: Record<string, string>): Promise<void> {
    for (const [selector, value] of Object.entries(formData)) {
      await page.waitForSelector(selector);
      await page.click(selector);
      await page.keyboard.selectAll();
      await page.type(selector, value);
    }
  }

  /**
   * 点击并等待导航
   */
  static async clickAndWaitForNavigation(page: Page, selector: string): Promise<void> {
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle0' }),
      page.click(selector)
    ]);
  }

  /**
   * 截图保存
   */
  static async takeScreenshot(page: Page, name: string): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    await page.screenshot({
      path: `screenshots/${name}-${timestamp}.png`,
      fullPage: true
    });
  }

  /**
   * 等待API响应
   */
  static async waitForApiResponse(page: Page, urlPattern: string | RegExp, timeout = 10000): Promise<any> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`API响应超时: ${urlPattern}`));
      }, timeout);

      page.on('response', async (response) => {
        const url = response.url();
        const matches = typeof urlPattern === 'string' 
          ? url.includes(urlPattern)
          : urlPattern.test(url);
        
        if (matches) {
          clearTimeout(timer);
          try {
            const data = await response.json();
            resolve(data);
          } catch (error) {
            resolve(null);
          }
        }
      });
    });
  }

  /**
   * 模拟支付成功
   */
  static async simulatePaymentSuccess(orderId: string): Promise<void> {
    // 模拟支付回调
    await request(app)
      .post('/api/payments/callback')
      .send({
        out_trade_no: orderId,
        trade_no: `alipay-${Date.now()}`,
        trade_status: 'TRADE_SUCCESS',
        total_amount: '199.00'
      });
  }
}

/**
 * 数据库和Redis初始化
 */
async function setupTestEnvironment(): Promise<void> {
  try {
    // 连接测试数据库
    testDb = await mysql.createConnection(e2eConfig.database);
    
    // 连接测试Redis
    testRedis = new Redis(e2eConfig.redis);
    await testRedis.ping();
    
    console.log('E2E测试环境初始化成功');
  } catch (error) {
    console.error('E2E测试环境初始化失败:', error);
    throw error;
  }
}

async function cleanupTestEnvironment(): Promise<void> {
  try {
    // 清理数据库
    if (testDb) {
      await testDb.execute('DELETE FROM enrollments');
      await testDb.execute('DELETE FROM payments');
      await testDb.execute('DELETE FROM orders');
      await testDb.execute('DELETE FROM courses');
      await testDb.execute('DELETE FROM users');
      await testDb.end();
    }
    
    // 清理Redis
    if (testRedis) {
      await testRedis.flushdb();
      await testRedis.disconnect();
    }
  } catch (error) {
    console.error('清理E2E测试环境失败:', error);
  }
}

/**
 * E2E测试套件
 */
describe('端到端测试 - 用户完整体验流程', () => {
  beforeAll(async () => {
    // 初始化测试环境
    await setupTestEnvironment();
    
    // 启动浏览器
    browser = await puppeteer.launch({
      headless: e2eConfig.headless,
      slowMo: e2eConfig.slowMo,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    page = await browser.newPage();
    
    // 设置视口
    await page.setViewport({ width: 1280, height: 720 });
    
    // 设置用户代理
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    
    // 创建截图目录
    const fs = require('fs');
    if (!fs.existsSync('screenshots')) {
      fs.mkdirSync('screenshots');
    }
  }, 60000);
  
  afterAll(async () => {
    // 关闭浏览器
    if (browser) {
      await browser.close();
    }
    
    // 清理测试环境
    await cleanupTestEnvironment();
  }, 30000);
  
  beforeEach(async () => {
    // 每个测试前清理数据
    await cleanupTestEnvironment();
    await setupTestEnvironment();
    
    // 导航到首页
    await page.goto(e2eConfig.baseUrl, { waitUntil: 'networkidle0' });
  });

  /**
   * 用户注册流程测试
   */
  describe('用户注册流程', () => {
    it('应该完成完整的用户注册流程', async () => {
      const user = testUsers[0];
      
      // 1. 点击注册按钮
      await page.click(selectors.nav.registerBtn);
      await page.waitForSelector(selectors.register.nameInput);
      
      // 2. 填写注册表单
      await E2EHelpers.fillForm(page, {
        [selectors.register.nameInput]: user.name,
        [selectors.register.emailInput]: user.email,
        [selectors.register.passwordInput]: user.password,
        [selectors.register.confirmPasswordInput]: user.password,
        [selectors.register.phoneInput]: user.phone || ''
      });
      
      // 3. 提交注册
      await Promise.all([
        E2EHelpers.waitForApiResponse(page, '/api/auth/register'),
        page.click(selectors.register.submitBtn)
      ]);
      
      // 4. 验证注册成功
      await page.waitForSelector(selectors.common.successMessage);
      const successText = await page.textContent(selectors.common.successMessage);
      expect(successText).toContain('注册成功');
      
      // 5. 验证自动登录
      await page.waitForSelector(selectors.nav.userMenu);
      const userMenuText = await page.textContent(selectors.nav.userMenu);
      expect(userMenuText).toContain(user.name);
      
      await E2EHelpers.takeScreenshot(page, 'user-registration-success');
    }, e2eConfig.timeout);
    
    it('应该验证注册表单字段', async () => {
      // 1. 导航到注册页面
      await page.click(selectors.nav.registerBtn);
      await page.waitForSelector(selectors.register.nameInput);
      
      // 2. 尝试提交空表单
      await page.click(selectors.register.submitBtn);
      
      // 3. 验证错误消息
      await page.waitForSelector(selectors.common.errorMessage);
      const errorText = await page.textContent(selectors.common.errorMessage);
      expect(errorText).toContain('必填');
      
      // 4. 测试邮箱格式验证
      await page.type(selectors.register.emailInput, 'invalid-email');
      await page.click(selectors.register.submitBtn);
      
      await page.waitForSelector(selectors.common.errorMessage);
      const emailErrorText = await page.textContent(selectors.common.errorMessage);
      expect(emailErrorText).toContain('邮箱格式');
      
      await E2EHelpers.takeScreenshot(page, 'registration-validation-errors');
    }, e2eConfig.timeout);
  });

  /**
   * 用户登录流程测试
   */
  describe('用户登录流程', () => {
    beforeEach(async () => {
      // 预先注册用户
      const user = testUsers[0];
      await request(app)
        .post('/api/auth/register')
        .send(user)
        .expect(201);
    });
    
    it('应该完成用户登录流程', async () => {
      const user = testUsers[0];
      
      // 1. 点击登录按钮
      await page.click(selectors.nav.loginBtn);
      await page.waitForSelector(selectors.login.emailInput);
      
      // 2. 填写登录表单
      await E2EHelpers.fillForm(page, {
        [selectors.login.emailInput]: user.email,
        [selectors.login.passwordInput]: user.password
      });
      
      // 3. 提交登录
      await Promise.all([
        E2EHelpers.waitForApiResponse(page, '/api/auth/login'),
        page.click(selectors.login.submitBtn)
      ]);
      
      // 4. 验证登录成功
      await page.waitForSelector(selectors.nav.userMenu);
      const userMenuText = await page.textContent(selectors.nav.userMenu);
      expect(userMenuText).toContain(user.name);
      
      await E2EHelpers.takeScreenshot(page, 'user-login-success');
    }, e2eConfig.timeout);
    
    it('应该处理登录错误', async () => {
      // 1. 导航到登录页面
      await page.click(selectors.nav.loginBtn);
      await page.waitForSelector(selectors.login.emailInput);
      
      // 2. 使用错误的凭据
      await E2EHelpers.fillForm(page, {
        [selectors.login.emailInput]: 'wrong@email.com',
        [selectors.login.passwordInput]: 'wrongpassword'
      });
      
      // 3. 提交登录
      await page.click(selectors.login.submitBtn);
      
      // 4. 验证错误消息
      await page.waitForSelector(selectors.common.errorMessage);
      const errorText = await page.textContent(selectors.common.errorMessage);
      expect(errorText).toContain('邮箱或密码错误');
      
      await E2EHelpers.takeScreenshot(page, 'login-error');
    }, e2eConfig.timeout);
  });

  /**
   * 课程浏览和搜索测试
   */
  describe('课程浏览和搜索', () => {
    beforeEach(async () => {
      // 预先创建管理员和课程
      const admin = testUsers[2];
      const adminResponse = await request(app)
        .post('/api/auth/register')
        .send(admin)
        .expect(201);
      
      const adminToken = adminResponse.body.data.token;
      
      // 创建测试课程
      for (const course of testCourses) {
        await request(app)
          .post('/api/admin/courses')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(course)
          .expect(201);
      }
    });
    
    it('应该浏览课程列表', async () => {
      // 1. 导航到课程页面
      await page.click(selectors.nav.coursesLink);
      await page.waitForSelector(selectors.courses.courseCard);
      
      // 2. 验证课程显示
      const courseCards = await page.$$(selectors.courses.courseCard);
      expect(courseCards.length).toBe(testCourses.length);
      
      // 3. 检查课程信息
      const firstCourseTitle = await page.textContent(`${selectors.courses.courseCard}:first-child ${selectors.courses.courseTitle}`);
      expect(firstCourseTitle).toBe(testCourses[0].title);
      
      await E2EHelpers.takeScreenshot(page, 'course-list');
    }, e2eConfig.timeout);
    
    it('应该搜索课程', async () => {
      // 1. 导航到课程页面
      await page.click(selectors.nav.coursesLink);
      await page.waitForSelector(selectors.courses.searchInput);
      
      // 2. 搜索课程
      await page.type(selectors.courses.searchInput, 'JavaScript');
      await page.keyboard.press('Enter');
      
      // 3. 等待搜索结果
      await E2EHelpers.waitForApiResponse(page, '/api/courses?search=JavaScript');
      
      // 4. 验证搜索结果
      const courseCards = await page.$$(selectors.courses.courseCard);
      expect(courseCards.length).toBe(1);
      
      const courseTitle = await page.textContent(`${selectors.courses.courseCard} ${selectors.courses.courseTitle}`);
      expect(courseTitle).toContain('JavaScript');
      
      await E2EHelpers.takeScreenshot(page, 'course-search');
    }, e2eConfig.timeout);
    
    it('应该筛选课程', async () => {
      // 1. 导航到课程页面
      await page.click(selectors.nav.coursesLink);
      await page.waitForSelector(selectors.courses.categoryFilter);
      
      // 2. 选择分类筛选
      await page.selectOption(selectors.courses.categoryFilter, 'frontend');
      
      // 3. 等待筛选结果
      await E2EHelpers.waitForApiResponse(page, '/api/courses?category=frontend');
      
      // 4. 验证筛选结果
      const courseCards = await page.$$(selectors.courses.courseCard);
      expect(courseCards.length).toBe(2); // 两个前端课程
      
      await E2EHelpers.takeScreenshot(page, 'course-filter');
    }, e2eConfig.timeout);
  });

  /**
   * 课程购买流程测试
   */
  describe('课程购买流程', () => {
    let userToken: string;
    let courseId: number;
    
    beforeEach(async () => {
      // 注册用户
      const user = testUsers[0];
      const userResponse = await request(app)
        .post('/api/auth/register')
        .send(user)
        .expect(201);
      userToken = userResponse.body.data.token;
      
      // 创建管理员和课程
      const admin = testUsers[2];
      const adminResponse = await request(app)
        .post('/api/auth/register')
        .send(admin)
        .expect(201);
      
      const courseResponse = await request(app)
        .post('/api/admin/courses')
        .set('Authorization', `Bearer ${adminResponse.body.data.token}`)
        .send(testCourses[0])
        .expect(201);
      
      courseId = courseResponse.body.data.course.id;
      
      // 登录用户
      await page.click(selectors.nav.loginBtn);
      await page.waitForSelector(selectors.login.emailInput);
      await E2EHelpers.fillForm(page, {
        [selectors.login.emailInput]: user.email,
        [selectors.login.passwordInput]: user.password
      });
      await page.click(selectors.login.submitBtn);
      await page.waitForSelector(selectors.nav.userMenu);
    });
    
    it('应该完成完整的课程购买流程', async () => {
      // 1. 浏览课程并点击详情
      await page.click(selectors.nav.coursesLink);
      await page.waitForSelector(selectors.courses.courseCard);
      await page.click(`${selectors.courses.courseCard}:first-child`);
      
      // 2. 在课程详情页点击报名
      await page.waitForSelector(selectors.courseDetail.enrollBtn);
      await page.click(selectors.courseDetail.enrollBtn);
      
      // 3. 在订单页面选择支付方式
      await page.waitForSelector(selectors.order.paymentMethod);
      await page.click(selectors.order.alipayOption);
      
      // 4. 提交订单
      const orderPromise = E2EHelpers.waitForApiResponse(page, '/api/orders');
      await page.click(selectors.order.submitBtn);
      const orderResponse = await orderPromise;
      
      expect(orderResponse.success).toBe(true);
      const orderId = orderResponse.data.order.id;
      
      // 5. 跳转到支付页面
      await page.waitForSelector(selectors.payment.qrCode);
      
      // 6. 模拟支付成功
      await E2EHelpers.simulatePaymentSuccess(orderId);
      
      // 7. 等待支付成功页面
      await page.waitForSelector(selectors.payment.successMessage, { timeout: 10000 });
      const successText = await page.textContent(selectors.payment.successMessage);
      expect(successText).toContain('支付成功');
      
      // 8. 验证课程已添加到我的课程
      await page.click(selectors.nav.profileLink);
      await page.waitForSelector(selectors.myCourses.courseList);
      
      const myCourses = await page.$$(selectors.myCourses.courseItem);
      expect(myCourses.length).toBe(1);
      
      await E2EHelpers.takeScreenshot(page, 'course-purchase-complete');
    }, e2eConfig.timeout);
    
    it('应该处理支付失败情况', async () => {
      // 1. 创建订单
      const orderResponse = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          courseId: courseId,
          paymentMethod: 'alipay'
        })
        .expect(201);
      
      const orderId = orderResponse.body.data.order.id;
      
      // 2. 导航到支付页面
      await page.goto(`${e2eConfig.baseUrl}/payment/${orderId}`);
      await page.waitForSelector(selectors.payment.qrCode);
      
      // 3. 模拟支付失败
      await request(app)
        .post('/api/payments/callback')
        .send({
          out_trade_no: orderId,
          trade_no: `alipay-${Date.now()}`,
          trade_status: 'TRADE_CLOSED',
          total_amount: '199.00'
        });
      
      // 4. 等待支付失败消息
      await page.waitForSelector(selectors.payment.failureMessage, { timeout: 10000 });
      const failureText = await page.textContent(selectors.payment.failureMessage);
      expect(failureText).toContain('支付失败');
      
      // 5. 点击重试按钮
      await page.click(selectors.payment.retryBtn);
      await page.waitForSelector(selectors.payment.qrCode);
      
      await E2EHelpers.takeScreenshot(page, 'payment-failure-retry');
    }, e2eConfig.timeout);
  });

  /**
   * 用户中心功能测试
   */
  describe('用户中心功能', () => {
    beforeEach(async () => {
      // 注册并登录用户
      const user = testUsers[0];
      await request(app)
        .post('/api/auth/register')
        .send(user)
        .expect(201);
      
      await page.click(selectors.nav.loginBtn);
      await page.waitForSelector(selectors.login.emailInput);
      await E2EHelpers.fillForm(page, {
        [selectors.login.emailInput]: user.email,
        [selectors.login.passwordInput]: user.password
      });
      await page.click(selectors.login.submitBtn);
      await page.waitForSelector(selectors.nav.userMenu);
    });
    
    it('应该更新用户资料', async () => {
      // 1. 导航到用户中心
      await page.click(selectors.nav.userMenu);
      await page.click(selectors.nav.profileLink);
      await page.waitForSelector(selectors.profile.nameInput);
      
      // 2. 更新用户信息
      await page.click(selectors.profile.nameInput);
      await page.keyboard.selectAll();
      await page.type(selectors.profile.nameInput, '更新的姓名');
      
      await page.click(selectors.profile.phoneInput);
      await page.keyboard.selectAll();
      await page.type(selectors.profile.phoneInput, '13900139000');
      
      // 3. 保存更改
      await Promise.all([
        E2EHelpers.waitForApiResponse(page, '/api/users/profile'),
        page.click(selectors.profile.saveBtn)
      ]);
      
      // 4. 验证更新成功
      await page.waitForSelector(selectors.common.successMessage);
      const successText = await page.textContent(selectors.common.successMessage);
      expect(successText).toContain('更新成功');
      
      // 5. 验证导航栏显示更新的姓名
      const userMenuText = await page.textContent(selectors.nav.userMenu);
      expect(userMenuText).toContain('更新的姓名');
      
      await E2EHelpers.takeScreenshot(page, 'profile-update');
    }, e2eConfig.timeout);
    
    it('应该上传头像', async () => {
      // 1. 导航到用户中心
      await page.click(selectors.nav.userMenu);
      await page.click(selectors.nav.profileLink);
      await page.waitForSelector(selectors.profile.avatarUpload);
      
      // 2. 模拟文件上传
      const fileInput = await page.$(selectors.profile.avatarUpload);
      if (fileInput) {
        // 创建一个模拟的图片文件
        const buffer = Buffer.from('fake image data');
        await fileInput.uploadFile({
          name: 'avatar.jpg',
          mimeType: 'image/jpeg',
          buffer: buffer
        } as any);
      }
      
      // 3. 等待上传完成
      await E2EHelpers.waitForApiResponse(page, '/api/upload/avatar');
      
      // 4. 验证头像更新
      await page.waitForSelector(selectors.common.successMessage);
      const successText = await page.textContent(selectors.common.successMessage);
      expect(successText).toContain('头像上传成功');
      
      await E2EHelpers.takeScreenshot(page, 'avatar-upload');
    }, e2eConfig.timeout);
  });

  /**
   * 响应式设计测试
   */
  describe('响应式设计测试', () => {
    it('应该在移动设备上正常显示', async () => {
      // 1. 设置移动设备视口
      await page.setViewport({ width: 375, height: 667 });
      
      // 2. 导航到首页
      await page.goto(e2eConfig.baseUrl);
      
      // 3. 验证移动端导航
      const mobileNav = await page.$('[data-testid="mobile-nav"]');
      expect(mobileNav).toBeTruthy();
      
      // 4. 测试课程列表在移动端的显示
      await page.click(selectors.nav.coursesLink);
      await page.waitForSelector(selectors.courses.courseCard);
      
      const courseCards = await page.$$(selectors.courses.courseCard);
      expect(courseCards.length).toBeGreaterThan(0);
      
      await E2EHelpers.takeScreenshot(page, 'mobile-responsive');
    }, e2eConfig.timeout);
    
    it('应该在平板设备上正常显示', async () => {
      // 1. 设置平板设备视口
      await page.setViewport({ width: 768, height: 1024 });
      
      // 2. 导航到首页
      await page.goto(e2eConfig.baseUrl);
      
      // 3. 验证平板端布局
      const tabletLayout = await page.$('[data-testid="tablet-layout"]');
      expect(tabletLayout).toBeTruthy();
      
      await E2EHelpers.takeScreenshot(page, 'tablet-responsive');
    }, e2eConfig.timeout);
  });

  /**
   * 性能测试
   */
  describe('性能测试', () => {
    it('应该在合理时间内加载页面', async () => {
      // 1. 测量首页加载时间
      const startTime = Date.now();
      await page.goto(e2eConfig.baseUrl, { waitUntil: 'networkidle0' });
      const loadTime = Date.now() - startTime;
      
      expect(loadTime).toBeLessThan(5000); // 应该在5秒内加载
      
      // 2. 测量课程列表加载时间
      const courseStartTime = Date.now();
      await page.click(selectors.nav.coursesLink);
      await page.waitForSelector(selectors.courses.courseCard);
      const courseLoadTime = Date.now() - courseStartTime;
      
      expect(courseLoadTime).toBeLessThan(3000); // 应该在3秒内加载
    }, e2eConfig.timeout);
    
    it('应该处理网络慢速连接', async () => {
      // 1. 模拟慢速网络
      await page.emulateNetworkConditions({
        offline: false,
        downloadThroughput: 500 * 1024, // 500KB/s
        uploadThroughput: 500 * 1024,
        latency: 200 // 200ms延迟
      });
      
      // 2. 导航到课程页面
      await page.goto(`${e2eConfig.baseUrl}/courses`);
      
      // 3. 验证加载指示器显示
      const loadingIndicator = await page.$(selectors.common.loading);
      expect(loadingIndicator).toBeTruthy();
      
      // 4. 等待内容加载完成
      await page.waitForSelector(selectors.courses.courseCard, { timeout: 15000 });
      
      await E2EHelpers.takeScreenshot(page, 'slow-network-loading');
    }, e2eConfig.timeout);
  });

  /**
   * 错误处理测试
   */
  describe('错误处理测试', () => {
    it('应该处理网络错误', async () => {
      // 1. 模拟离线状态
      await page.setOfflineMode(true);
      
      // 2. 尝试导航到课程页面
      await page.click(selectors.nav.coursesLink);
      
      // 3. 验证错误消息显示
      await page.waitForSelector(selectors.common.errorMessage);
      const errorText = await page.textContent(selectors.common.errorMessage);
      expect(errorText).toContain('网络连接');
      
      // 4. 恢复网络连接
      await page.setOfflineMode(false);
      
      // 5. 重试加载
      await page.reload({ waitUntil: 'networkidle0' });
      await page.waitForSelector(selectors.courses.courseCard);
      
      await E2EHelpers.takeScreenshot(page, 'network-error-recovery');
    }, e2eConfig.timeout);
    
    it('应该处理404页面', async () => {
      // 1. 导航到不存在的页面
      await page.goto(`${e2eConfig.baseUrl}/nonexistent-page`);
      
      // 2. 验证404页面显示
      const notFoundElement = await page.$('[data-testid="not-found"]');
      expect(notFoundElement).toBeTruthy();
      
      // 3. 点击返回首页链接
      await page.click('[data-testid="back-to-home"]');
      await page.waitForSelector(selectors.nav.logo);
      
      await E2EHelpers.takeScreenshot(page, '404-page');
    }, e2eConfig.timeout);
  });
});