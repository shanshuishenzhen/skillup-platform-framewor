import { test, expect, Page, Browser } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

/**
 * 端到端测试配置
 */
const TEST_CONFIG = {
  baseUrl: 'http://localhost:5173',
  timeout: 30000,
  headless: false
};

/**
 * 测试用户数据
 */
const TEST_USERS = {
  admin: {
    phone: '13823738278', // 管理员专用手机号
    password: 'admin123',
    name: '测试管理员',
    role: 'admin'
  },
  teacher: {
    phone: '13800000001',
    password: 'teacher123',
    name: '测试教师',
    role: 'teacher'
  },
  student: {
    phone: '13800000002',
    password: 'student123',
    name: '测试学生',
    role: 'student'
  }
};

/**
 * 测试数据
 */
const TEST_DATA = {
  exam: {
    title: 'E2E测试考试',
    description: '这是一个端到端测试考试',
    duration: 60,
    passingScore: 70,
    totalQuestions: 3
  },
  questions: [
    {
      content: 'JavaScript中哪个关键字用于声明变量？',
      type: 'single_choice',
      options: ['var', 'let', 'const', '以上都是'],
      correctAnswer: 3,
      points: 10
    },
    {
      content: 'React中用于管理组件状态的Hook是？',
      type: 'single_choice',
      options: ['useEffect', 'useState', 'useContext', 'useReducer'],
      correctAnswer: 1,
      points: 10
    },
    {
      content: 'TypeScript是JavaScript的什么？',
      type: 'single_choice',
      options: ['替代品', '超集', '框架', '库'],
      correctAnswer: 1,
      points: 10
    }
  ]
};

// 全局变量存储测试过程中创建的数据ID
let createdExamId: string;
let createdQuestionIds: string[] = [];
let supabase: any;

/**
 * 测试前置设置
 */
test.beforeAll(async () => {
  // 初始化Supabase客户端
  const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://localhost:54321';
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'test-key';
  
  supabase = createClient(supabaseUrl, supabaseKey);
  
  // 准备测试数据
  await setupTestData();
});

/**
 * 测试后置清理
 */
test.afterAll(async () => {
  // 清理测试数据
  await cleanupTestData();
});

/**
 * 完整用户旅程测试套件
 */
test.describe('完整用户旅程端到端测试', () => {
  let adminPage: Page;
  let teacherPage: Page;
  let studentPage: Page;

  /**
   * 每个测试前的设置
   */
  test.beforeEach(async ({ browser }) => {
    // 为每个角色创建独立的页面
    adminPage = await browser.newPage();
    teacherPage = await browser.newPage();
    studentPage = await browser.newPage();
    
    // 设置页面超时
    adminPage.setDefaultTimeout(TEST_CONFIG.timeout);
    teacherPage.setDefaultTimeout(TEST_CONFIG.timeout);
    studentPage.setDefaultTimeout(TEST_CONFIG.timeout);
  });

  /**
   * 每个测试后的清理
   */
  test.afterEach(async () => {
    await adminPage?.close();
    await teacherPage?.close();
    await studentPage?.close();
  });

  /**
   * 管理员工作流程测试
   */
  test.describe('管理员工作流程', () => {
    /**
     * 测试管理员登录
     */
    test('管理员应该能够登录系统', async () => {
      await adminPage.goto(`${TEST_CONFIG.baseUrl}/login`);
      
      // 填写登录表单
      await adminPage.fill('[data-testid="phone-input"]', TEST_USERS.admin.phone);
      await adminPage.fill('[data-testid="password-input"]', TEST_USERS.admin.password);
      
      // 点击登录按钮
      await adminPage.click('[data-testid="login-button"]');
      
      // 验证登录成功
      await expect(adminPage).toHaveURL(`${TEST_CONFIG.baseUrl}/admin/dashboard`);
      await expect(adminPage.locator('[data-testid="user-name"]')).toContainText(TEST_USERS.admin.name);
    });

    /**
     * 测试创建考试
     */
    test('管理员应该能够创建考试', async () => {
      // 先登录
      await adminPage.goto(`${TEST_CONFIG.baseUrl}/login`);
      await adminPage.fill('[data-testid="phone-input"]', TEST_USERS.admin.phone);
      await adminPage.fill('[data-testid="password-input"]', TEST_USERS.admin.password);
      await adminPage.click('[data-testid="login-button"]');
      
      // 导航到考试管理页面
      await adminPage.goto(`${TEST_CONFIG.baseUrl}/admin/exams`);
      
      // 点击创建考试按钮
      await adminPage.click('[data-testid="create-exam-button"]');
      
      // 填写考试信息
      await adminPage.fill('[data-testid="exam-title-input"]', TEST_DATA.exam.title);
      await adminPage.fill('[data-testid="exam-description-input"]', TEST_DATA.exam.description);
      await adminPage.fill('[data-testid="exam-duration-input"]', TEST_DATA.exam.duration.toString());
      await adminPage.fill('[data-testid="exam-passing-score-input"]', TEST_DATA.exam.passingScore.toString());
      
      // 提交表单
      await adminPage.click('[data-testid="submit-exam-button"]');
      
      // 验证考试创建成功
      await expect(adminPage.locator('[data-testid="success-message"]')).toContainText('考试创建成功');
      
      // 获取创建的考试ID（从URL或页面元素中）
      const url = adminPage.url();
      const match = url.match(/\/exams\/(\w+)/);
      if (match) {
        createdExamId = match[1];
      }
    });

    /**
     * 测试管理用户
     */
    test('管理员应该能够管理用户', async () => {
      // 先登录
      await adminPage.goto(`${TEST_CONFIG.baseUrl}/login`);
      await adminPage.fill('[data-testid="phone-input"]', TEST_USERS.admin.phone);
      await adminPage.fill('[data-testid="password-input"]', TEST_USERS.admin.password);
      await adminPage.click('[data-testid="login-button"]');
      
      // 导航到用户管理页面
      await adminPage.goto(`${TEST_CONFIG.baseUrl}/admin/users`);
      
      // 验证用户列表显示
      await expect(adminPage.locator('[data-testid="users-table"]')).toBeVisible();
      
      // 验证测试用户存在
      await expect(adminPage.locator('[data-testid="user-row"]')).toContainText(TEST_USERS.teacher.phone);
      await expect(adminPage.locator('[data-testid="user-row"]')).toContainText(TEST_USERS.student.phone);
    });
  });

  /**
   * 教师工作流程测试
   */
  test.describe('教师工作流程', () => {
    /**
     * 测试教师登录
     */
    test('教师应该能够登录系统', async () => {
      await teacherPage.goto(`${TEST_CONFIG.baseUrl}/login`);
      
      // 填写登录表单
      await teacherPage.fill('[data-testid="phone-input"]', TEST_USERS.teacher.phone);
      await teacherPage.fill('[data-testid="password-input"]', TEST_USERS.teacher.password);
      
      // 点击登录按钮
      await teacherPage.click('[data-testid="login-button"]');
      
      // 验证登录成功
      await expect(teacherPage).toHaveURL(`${TEST_CONFIG.baseUrl}/teacher/dashboard`);
      await expect(teacherPage.locator('[data-testid="user-name"]')).toContainText(TEST_USERS.teacher.name);
    });

    /**
     * 测试创建题目
     */
    test('教师应该能够创建题目', async () => {
      // 先登录
      await teacherPage.goto(`${TEST_CONFIG.baseUrl}/login`);
      await teacherPage.fill('[data-testid="phone-input"]', TEST_USERS.teacher.phone);
      await teacherPage.fill('[data-testid="password-input"]', TEST_USERS.teacher.password);
      await teacherPage.click('[data-testid="login-button"]');
      
      // 导航到题目管理页面
      await teacherPage.goto(`${TEST_CONFIG.baseUrl}/teacher/questions`);
      
      // 为每个测试题目创建
      for (const question of TEST_DATA.questions) {
        // 点击创建题目按钮
        await teacherPage.click('[data-testid="create-question-button"]');
        
        // 填写题目信息
        await teacherPage.fill('[data-testid="question-content-input"]', question.content);
        await teacherPage.selectOption('[data-testid="question-type-select"]', question.type);
        await teacherPage.fill('[data-testid="question-points-input"]', question.points.toString());
        
        // 填写选项
        for (let i = 0; i < question.options.length; i++) {
          await teacherPage.fill(`[data-testid="option-${i}-input"]`, question.options[i]);
        }
        
        // 设置正确答案
        await teacherPage.check(`[data-testid="correct-answer-${question.correctAnswer}"]`);
        
        // 提交题目
        await teacherPage.click('[data-testid="submit-question-button"]');
        
        // 验证题目创建成功
        await expect(teacherPage.locator('[data-testid="success-message"]')).toContainText('题目创建成功');
        
        // 等待页面更新
        await teacherPage.waitForTimeout(1000);
      }
    });
  });

  /**
   * 学生工作流程测试
   */
  test.describe('学生工作流程', () => {
    /**
     * 测试学生登录
     */
    test('学生应该能够登录系统', async () => {
      await studentPage.goto(`${TEST_CONFIG.baseUrl}/login`);
      
      // 填写登录表单
      await studentPage.fill('[data-testid="phone-input"]', TEST_USERS.student.phone);
      await studentPage.fill('[data-testid="password-input"]', TEST_USERS.student.password);
      
      // 点击登录按钮
      await studentPage.click('[data-testid="login-button"]');
      
      // 验证登录成功
      await expect(studentPage).toHaveURL(`${TEST_CONFIG.baseUrl}/student/dashboard`);
      await expect(studentPage.locator('[data-testid="user-name"]')).toContainText(TEST_USERS.student.name);
    });

    /**
     * 测试查看可用考试
     */
    test('学生应该能够查看可用考试', async () => {
      // 先登录
      await studentPage.goto(`${TEST_CONFIG.baseUrl}/login`);
      await studentPage.fill('[data-testid="phone-input"]', TEST_USERS.student.phone);
      await studentPage.fill('[data-testid="password-input"]', TEST_USERS.student.password);
      await studentPage.click('[data-testid="login-button"]');
      
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
    test('学生应该能够参加考试', async () => {
      // 先登录
      await studentPage.goto(`${TEST_CONFIG.baseUrl}/login`);
      await studentPage.fill('[data-testid="phone-input"]', TEST_USERS.student.phone);
      await studentPage.fill('[data-testid="password-input"]', TEST_USERS.student.password);
      await studentPage.click('[data-testid="login-button"]');
      
      // 导航到考试列表
      await studentPage.goto(`${TEST_CONFIG.baseUrl}/student/exams`);
      
      // 点击开始考试按钮
      await studentPage.click(`[data-testid="start-exam-button"]`);
      
      // 确认开始考试
      await studentPage.click('[data-testid="confirm-start-exam"]');
      
      // 验证考试页面加载
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
    test('学生应该能够查看考试结果', async () => {
      // 先登录
      await studentPage.goto(`${TEST_CONFIG.baseUrl}/login`);
      await studentPage.fill('[data-testid="phone-input"]', TEST_USERS.student.phone);
      await studentPage.fill('[data-testid="password-input"]', TEST_USERS.student.password);
      await studentPage.click('[data-testid="login-button"]');
      
      // 导航到考试结果页面
      await studentPage.goto(`${TEST_CONFIG.baseUrl}/student/results`);
      
      // 验证结果列表显示
      await expect(studentPage.locator('[data-testid="results-list"]')).toBeVisible();
      
      // 验证结果详情
      await expect(studentPage.locator('[data-testid="exam-title"]')).toContainText(TEST_DATA.exam.title);
      await expect(studentPage.locator('[data-testid="total-score"]')).toBeVisible();
      await expect(studentPage.locator('[data-testid="correct-answers"]')).toBeVisible();
      
      // 验证通过状态（所有答案都是正确的，应该通过）
      await expect(studentPage.locator('[data-testid="pass-status"]')).toContainText('通过');
    });
  });

  /**
   * 完整流程集成测试
   */
  test('完整考试流程：创建->分配->参加->查看结果', async () => {
    // 1. 管理员登录并创建考试
    await adminPage.goto(`${TEST_CONFIG.baseUrl}/login`);
    await adminPage.fill('[data-testid="phone-input"]', TEST_USERS.admin.phone);
    await adminPage.fill('[data-testid="password-input"]', TEST_USERS.admin.password);
    await adminPage.click('[data-testid="login-button"]');
    
    await adminPage.goto(`${TEST_CONFIG.baseUrl}/admin/exams`);
    await adminPage.click('[data-testid="create-exam-button"]');
    await adminPage.fill('[data-testid="exam-title-input"]', TEST_DATA.exam.title);
    await adminPage.fill('[data-testid="exam-description-input"]', TEST_DATA.exam.description);
    await adminPage.fill('[data-testid="exam-duration-input"]', TEST_DATA.exam.duration.toString());
    await adminPage.fill('[data-testid="exam-passing-score-input"]', TEST_DATA.exam.passingScore.toString());
    await adminPage.click('[data-testid="submit-exam-button"]');
    
    await expect(adminPage.locator('[data-testid="success-message"]')).toContainText('考试创建成功');
    
    // 2. 教师登录并创建题目
    await teacherPage.goto(`${TEST_CONFIG.baseUrl}/login`);
    await teacherPage.fill('[data-testid="phone-input"]', TEST_USERS.teacher.phone);
    await teacherPage.fill('[data-testid="password-input"]', TEST_USERS.teacher.password);
    await teacherPage.click('[data-testid="login-button"]');
    
    await teacherPage.goto(`${TEST_CONFIG.baseUrl}/teacher/questions`);
    
    // 创建一个测试题目
    const question = TEST_DATA.questions[0];
    await teacherPage.click('[data-testid="create-question-button"]');
    await teacherPage.fill('[data-testid="question-content-input"]', question.content);
    await teacherPage.selectOption('[data-testid="question-type-select"]', question.type);
    await teacherPage.fill('[data-testid="question-points-input"]', question.points.toString());
    
    for (let i = 0; i < question.options.length; i++) {
      await teacherPage.fill(`[data-testid="option-${i}-input"]`, question.options[i]);
    }
    
    await teacherPage.check(`[data-testid="correct-answer-${question.correctAnswer}"]`);
    await teacherPage.click('[data-testid="submit-question-button"]');
    
    await expect(teacherPage.locator('[data-testid="success-message"]')).toContainText('题目创建成功');
    
    // 3. 学生登录并参加考试
    await studentPage.goto(`${TEST_CONFIG.baseUrl}/login`);
    await studentPage.fill('[data-testid="phone-input"]', TEST_USERS.student.phone);
    await studentPage.fill('[data-testid="password-input"]', TEST_USERS.student.password);
    await studentPage.click('[data-testid="login-button"]');
    
    await studentPage.goto(`${TEST_CONFIG.baseUrl}/student/exams`);
    await expect(studentPage.locator('[data-testid="exam-card"]')).toContainText(TEST_DATA.exam.title);
    
    await studentPage.click('[data-testid="start-exam-button"]');
    await studentPage.click('[data-testid="confirm-start-exam"]');
    
    // 回答题目
    await expect(studentPage.locator('[data-testid="question-content"]')).toContainText(question.content);
    await studentPage.click(`[data-testid="option-${question.correctAnswer}"]`);
    await studentPage.click('[data-testid="submit-exam-button"]');
    await studentPage.click('[data-testid="confirm-submit-button"]');
    
    await expect(studentPage.locator('[data-testid="success-message"]')).toContainText('考试提交成功');
    
    // 4. 验证考试结果
    await studentPage.goto(`${TEST_CONFIG.baseUrl}/student/results`);
    await expect(studentPage.locator('[data-testid="results-list"]')).toBeVisible();
    await expect(studentPage.locator('[data-testid="pass-status"]')).toContainText('通过');
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
        phone: user.phone,
        password: user.password, // 在实际环境中应该加密
        name: user.name,
        role: user.role,
        is_active: true,
        is_verified: true
      });
      
      if (error && !error.message.includes('duplicate')) {
        console.warn(`创建用户 ${user.phone} 失败:`, error.message);
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
      await supabase.from('users').delete().eq('phone', user.phone);
    }
    
    console.log('E2E测试数据清理完成');
  } catch (error) {
    console.error('清理E2E测试数据失败:', error);
  }
}