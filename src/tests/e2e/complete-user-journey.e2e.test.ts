/**
 * 完整用户旅程端到端测试
 * 模拟真实用户的完整操作流程
 * 
 * @author SOLO Coding
 * @version 1.0.0
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { chromium, Browser, Page, BrowserContext } from 'playwright';
import { supabase } from '../../lib/supabase';

/**
 * 测试配置
 */
const TEST_CONFIG = {
  baseUrl: process.env.TEST_BASE_URL || 'http://localhost:3000',
  timeout: 30000,
  headless: process.env.CI === 'true',
  slowMo: process.env.CI === 'true' ? 0 : 100
};

/**
 * 测试用户数据
 */
const TEST_USERS = {
  admin: {
    email: 'e2e-admin@test.com',
    password: 'AdminE2E123!',
    name: 'E2E测试管理员',
    role: 'admin'
  },
  teacher: {
    email: 'e2e-teacher@test.com',
    password: 'TeacherE2E123!',
    name: 'E2E测试教师',
    role: 'teacher'
  },
  student: {
    email: 'e2e-student@test.com',
    password: 'StudentE2E123!',
    name: 'E2E测试学生',
    role: 'student'
  }
};

/**
 * 测试数据
 */
const TEST_DATA = {
  exam: {
    title: 'E2E测试考试',
    description: '这是一个端到端测试用的考试',
    duration: 30,
    totalQuestions: 5,
    passingScore: 60
  },
  questions: [
    {
      title: 'E2E测试题目1',
      type: 'multiple_choice',
      content: '这是第一个测试题目',
      options: ['选项A', '选项B', '选项C', '选项D'],
      correctAnswer: '选项A'
    },
    {
      title: 'E2E测试题目2',
      type: 'multiple_choice',
      content: '这是第二个测试题目',
      options: ['选项1', '选项2', '选项3', '选项4'],
      correctAnswer: '选项2'
    },
    {
      title: 'E2E测试题目3',
      type: 'true_false',
      content: '这是一个判断题',
      options: ['正确', '错误'],
      correctAnswer: '正确'
    },
    {
      title: 'E2E测试题目4',
      type: 'multiple_choice',
      content: '这是第四个测试题目',
      options: ['A选项', 'B选项', 'C选项', 'D选项'],
      correctAnswer: 'C选项'
    },
    {
      title: 'E2E测试题目5',
      type: 'multiple_choice',
      content: '这是第五个测试题目',
      options: ['第一个', '第二个', '第三个', '第四个'],
      correctAnswer: '第三个'
    }
  ]
};

/**
 * 完整用户旅程端到端测试套件
 */
describe('完整用户旅程E2E测试', () => {
  let browser: Browser;
  let adminContext: BrowserContext;
  let teacherContext: BrowserContext;
  let studentContext: BrowserContext;
  let adminPage: Page;
  let teacherPage: Page;
  let studentPage: Page;
  let createdExamId: string;
  let createdQuestionIds: string[] = [];

  /**
   * 测试套件初始化
   */
  beforeAll(async () => {
    // 启动浏览器
    browser = await chromium.launch({
      headless: TEST_CONFIG.headless,
      slowMo: TEST_CONFIG.slowMo
    });

    // 创建浏览器上下文
    adminContext = await browser.newContext();
    teacherContext = await browser.newContext();
    studentContext = await browser.newContext();

    // 创建页面
    adminPage = await adminContext.newPage();
    teacherPage = await teacherContext.newPage();
    studentPage = await studentContext.newPage();

    // 设置页面超时
    adminPage.setDefaultTimeout(TEST_CONFIG.timeout);
    teacherPage.setDefaultTimeout(TEST_CONFIG.timeout);
    studentPage.setDefaultTimeout(TEST_CONFIG.timeout);

    // 准备测试数据
    await setupTestData();
  }, 60000);

  /**
   * 测试套件清理
   */
  afterAll(async () => {
    // 清理测试数据
    await cleanupTestData();

    // 关闭浏览器
    if (browser) {
      await browser.close();
    }
  }, 30000);

  /**
   * 每个测试前的准备
   */
  beforeEach(async () => {
    // 清除所有页面的存储
    await adminContext.clearCookies();
    await teacherContext.clearCookies();
    await studentContext.clearCookies();
  });

  /**
   * 管理员工作流程测试
   */
  describe('管理员工作流程', () => {
    /**
     * 测试管理员登录
     */
    it('管理员应该能够登录系统', async () => {
      await adminPage.goto(`${TEST_CONFIG.baseUrl}/login`);
      
      // 填写登录表单
      await adminPage.fill('[data-testid="email-input"]', TEST_USERS.admin.email);
      await adminPage.fill('[data-testid="password-input"]', TEST_USERS.admin.password);
      
      // 点击登录按钮
      await adminPage.click('[data-testid="login-button"]');
      
      // 验证登录成功
      await expect(adminPage).toHaveURL(`${TEST_CONFIG.baseUrl}/dashboard`);
      await expect(adminPage.locator('[data-testid="user-name"]')).toContainText(TEST_USERS.admin.name);
    });

    /**
     * 测试创建考试
     */
    it('管理员应该能够创建考试', async () => {
      // 导航到考试管理页面
      await adminPage.goto(`${TEST_CONFIG.baseUrl}/admin/exams`);
      
      // 点击创建考试按钮
      await adminPage.click('[data-testid="create-exam-button"]');
      
      // 填写考试信息
      await adminPage.fill('[data-testid="exam-title-input"]', TEST_DATA.exam.title);
      await adminPage.fill('[data-testid="exam-description-input"]', TEST_DATA.exam.description);
      await adminPage.fill('[data-testid="exam-duration-input"]', TEST_DATA.exam.duration.toString());
      await adminPage.fill('[data-testid="exam-total-questions-input"]', TEST_DATA.exam.totalQuestions.toString());
      await adminPage.fill('[data-testid="exam-passing-score-input"]', TEST_DATA.exam.passingScore.toString());
      
      // 保存考试
      await adminPage.click('[data-testid="save-exam-button"]');
      
      // 验证考试创建成功
      await expect(adminPage.locator('[data-testid="success-message"]')).toContainText('考试创建成功');
      
      // 获取创建的考试ID
      const examUrl = adminPage.url();
      const examIdMatch = examUrl.match(/\/exams\/(\w+)/);
      if (examIdMatch) {
        createdExamId = examIdMatch[1];
      }
    });

    /**
     * 测试用户管理
     */
    it('管理员应该能够管理用户', async () => {
      // 导航到用户管理页面
      await adminPage.goto(`${TEST_CONFIG.baseUrl}/admin/users`);
      
      // 验证用户列表显示
      await expect(adminPage.locator('[data-testid="users-table"]')).toBeVisible();
      
      // 搜索测试学生
      await adminPage.fill('[data-testid="user-search-input"]', TEST_USERS.student.email);
      await adminPage.click('[data-testid="search-button"]');
      
      // 验证搜索结果
      await expect(adminPage.locator('[data-testid="user-row"]')).toContainText(TEST_USERS.student.email);
      
      // 分配考试给学生
      await adminPage.click('[data-testid="assign-exam-button"]');
      await adminPage.selectOption('[data-testid="exam-select"]', createdExamId);
      await adminPage.click('[data-testid="confirm-assign-button"]');
      
      // 验证分配成功
      await expect(adminPage.locator('[data-testid="success-message"]')).toContainText('考试分配成功');
    });
  });

  /**
   * 教师工作流程测试
   */
  describe('教师工作流程', () => {
    /**
     * 测试教师登录
     */
    it('教师应该能够登录系统', async () => {
      await teacherPage.goto(`${TEST_CONFIG.baseUrl}/login`);
      
      // 填写登录表单
      await teacherPage.fill('[data-testid="email-input"]', TEST_USERS.teacher.email);
      await teacherPage.fill('[data-testid="password-input"]', TEST_USERS.teacher.password);
      
      // 点击登录按钮
      await teacherPage.click('[data-testid="login-button"]');
      
      // 验证登录成功
      await expect(teacherPage).toHaveURL(`${TEST_CONFIG.baseUrl}/dashboard`);
      await expect(teacherPage.locator('[data-testid="user-name"]')).toContainText(TEST_USERS.teacher.name);
    });

    /**
     * 测试创建题目
     */
    it('教师应该能够创建题目', async () => {
      // 导航到题目管理页面
      await teacherPage.goto(`${TEST_CONFIG.baseUrl}/teacher/questions`);
      
      // 为每个测试题目创建题目
      for (const [index, question] of TEST_DATA.questions.entries()) {
        // 点击创建题目按钮
        await teacherPage.click('[data-testid="create-question-button"]');
        
        // 填写题目信息
        await teacherPage.fill('[data-testid="question-title-input"]', question.title);
        await teacherPage.fill('[data-testid="question-content-input"]', question.content);
        await teacherPage.selectOption('[data-testid="question-type-select"]', question.type);
        
        // 添加选项
        for (const [optionIndex, option] of question.options.entries()) {
          await teacherPage.fill(`[data-testid="option-${optionIndex}-input"]`, option);
        }
        
        // 设置正确答案
        await teacherPage.selectOption('[data-testid="correct-answer-select"]', question.correctAnswer);
        
        // 保存题目
        await teacherPage.click('[data-testid="save-question-button"]');
        
        // 验证题目创建成功
        await expect(teacherPage.locator('[data-testid="success-message"]')).toContainText('题目创建成功');
        
        // 返回题目列表
        await teacherPage.click('[data-testid="back-to-list-button"]');
      }
    });

    /**
     * 测试将题目添加到考试
     */
    it('教师应该能够将题目添加到考试', async () => {
      // 导航到考试详情页面
      await teacherPage.goto(`${TEST_CONFIG.baseUrl}/teacher/exams/${createdExamId}`);
      
      // 点击添加题目按钮
      await teacherPage.click('[data-testid="add-questions-button"]');
      
      // 选择所有测试题目
      for (let i = 0; i < TEST_DATA.questions.length; i++) {
        await teacherPage.check(`[data-testid="question-checkbox-${i}"]`);
      }
      
      // 确认添加
      await teacherPage.click('[data-testid="confirm-add-questions-button"]');
      
      // 验证题目添加成功
      await expect(teacherPage.locator('[data-testid="success-message"]')).toContainText('题目添加成功');
      
      // 验证考试题目数量
      const questionCount = await teacherPage.locator('[data-testid="question-item"]').count();
      expect(questionCount).toBe(TEST_DATA.questions.length);
    });
  });

  /**
   * 学生工作流程测试
   */
  describe('学生工作流程', () => {
    /**
     * 测试学生登录
     */
    it('学生应该能够登录系统', async () => {
      await studentPage.goto(`${TEST_CONFIG.baseUrl}/login`);
      
      // 填写登录表单
      await studentPage.fill('[data-testid="email-input"]', TEST_USERS.student.email);
      await studentPage.fill('[data-testid="password-input"]', TEST_USERS.student.password);
      
      // 点击登录按钮
      await studentPage.click('[data-testid="login-button"]');
      
      // 验证登录成功
      await expect(studentPage).toHaveURL(`${TEST_CONFIG.baseUrl}/dashboard`);
      await expect(studentPage.locator('[data-testid="user-name"]')).toContainText(TEST_USERS.student.name);
    });

    /**
     * 测试查看可用考试
     */
    it('学生应该能够查看可用考试', async () => {
      // 导航到考试列表页面
      await studentPage.goto(`${TEST_CONFIG.baseUrl}/student/exams`);
      
      // 验证考试列表显示
      await expect(studentPage.locator('[data-testid="exams-list"]')).toBeVisible();
      
      // 验证测试考试存在
      await expect(studentPage.locator('[data-testid="exam-card"]')).toContainText(TEST_DATA.exam.title);
    });

    /**
     * 测试参加考试
     */
    it('学生应该能够参加考试', async () => {
      // 点击开始考试按钮
      await studentPage.click(`[data-testid="start-exam-${createdExamId}"]`);
      
      // 确认开始考试
      await studentPage.click('[data-testid="confirm-start-exam"]');
      
      // 验证考试页面加载
      await expect(studentPage).toHaveURL(new RegExp(`/student/exams/${createdExamId}/take`));
      await expect(studentPage.locator('[data-testid="exam-title"]')).toContainText(TEST_DATA.exam.title);
      
      // 回答所有题目
      for (let i = 0; i < TEST_DATA.questions.length; i++) {
        const question = TEST_DATA.questions[i];
        
        // 验证题目显示
        await expect(studentPage.locator('[data-testid="question-content"]')).toContainText(question.content);
        
        // 选择正确答案
        await studentPage.click(`[data-testid="option-${question.correctAnswer}"]`);
        
        // 如果不是最后一题，点击下一题
        if (i < TEST_DATA.questions.length - 1) {
          await studentPage.click('[data-testid="next-question-button"]');
        }
      }
      
      // 提交考试
      await studentPage.click('[data-testid="submit-exam-button"]');
      
      // 确认提交
      await studentPage.click('[data-testid="confirm-submit-button"]');
      
      // 验证提交成功
      await expect(studentPage.locator('[data-testid="success-message"]')).toContainText('考试提交成功');
    });

    /**
     * 测试查看考试结果
     */
    it('学生应该能够查看考试结果', async () => {
      // 导航到考试结果页面
      await studentPage.goto(`${TEST_CONFIG.baseUrl}/student/results`);
      
      // 验证结果列表显示
      await expect(studentPage.locator('[data-testid="results-list"]')).toBeVisible();
      
      // 点击查看详细结果
      await studentPage.click(`[data-testid="view-result-${createdExamId}"]`);
      
      // 验证结果详情
      await expect(studentPage.locator('[data-testid="exam-title"]')).toContainText(TEST_DATA.exam.title);
      await expect(studentPage.locator('[data-testid="total-score"]')).toBeVisible();
      await expect(studentPage.locator('[data-testid="correct-answers"]')).toBeVisible();
      await expect(studentPage.locator('[data-testid="total-questions"]')).toContainText(TEST_DATA.questions.length.toString());
      
      // 验证通过状态（所有答案都是正确的，应该通过）
      await expect(studentPage.locator('[data-testid="pass-status"]')).toContainText('通过');
    });
  });

  /**
   * 完整流程集成测试
   */
  describe('完整流程集成测试', () => {
    /**
     * 测试完整的考试流程
     */
    it('应该完成完整的考试流程：创建->分配->参加->查看结果', async () => {
      // 1. 管理员创建考试（已在前面的测试中完成）
      expect(createdExamId).toBeDefined();
      
      // 2. 教师创建题目并添加到考试（已在前面的测试中完成）
      // 验证考试有题目
      await teacherPage.goto(`${TEST_CONFIG.baseUrl}/teacher/exams/${createdExamId}`);
      const questionCount = await teacherPage.locator('[data-testid="question-item"]').count();
      expect(questionCount).toBeGreaterThan(0);
      
      // 3. 管理员分配考试给学生（已在前面的测试中完成）
      // 验证学生可以看到考试
      await studentPage.goto(`${TEST_CONFIG.baseUrl}/student/exams`);
      await expect(studentPage.locator(`[data-testid="exam-card-${createdExamId}"]`)).toBeVisible();
      
      // 4. 学生参加考试（已在前面的测试中完成）
      // 5. 查看考试结果（已在前面的测试中完成）
      
      // 验证整个流程的数据一致性
      await studentPage.goto(`${TEST_CONFIG.baseUrl}/student/results`);
      await expect(studentPage.locator(`[data-testid="result-${createdExamId}"]`)).toBeVisible();
    });
  });

  /**
   * 辅助函数：准备测试数据
   */
  async function setupTestData(): Promise<void> {
    try {
      // 创建测试用户
      for (const [key, user] of Object.entries(TEST_USERS)) {
        const { error } = await supabase.from('users').upsert({
          email: user.email,
          password: user.password, // 在实际环境中应该加密
          name: user.name,
          role: user.role,
          is_active: true,
          is_verified: true
        });
        
        if (error && !error.message.includes('duplicate')) {
          console.warn(`创建用户 ${user.email} 失败:`, error.message);
        }
      }
      
      console.log('E2E测试数据准备完成');
    } catch (error) {
      console.error('准备E2E测试数据失败:', error);
      throw error;
    }
  }

  /**
   * 辅助函数：清理测试数据
   */
  async function cleanupTestData(): Promise<void> {
    try {
      // 删除测试题目
      if (createdQuestionIds.length > 0) {
        await supabase.from('questions').delete().in('id', createdQuestionIds);
      }
      
      // 删除测试考试
      if (createdExamId) {
        await supabase.from('exams').delete().eq('id', createdExamId);
      }
      
      // 删除测试用户
      for (const user of Object.values(TEST_USERS)) {
        await supabase.from('users').delete().eq('email', user.email);
      }
      
      console.log('E2E测试数据清理完成');
    } catch (error) {
      console.error('清理E2E测试数据失败:', error);
    }
  }
});