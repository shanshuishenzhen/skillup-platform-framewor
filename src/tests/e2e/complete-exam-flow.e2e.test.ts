/**
 * 完整考试流程端到端测试
 * 
 * 模拟用户完整的考试操作流程：
 * 1. 管理员登录 -> 创建考试 -> 分配给用户
 * 2. 用户登录 -> 参加考试 -> 提交答案
 * 3. 管理员查看成绩 -> 生成报告
/**
 * 完整考试流程端到端测试
 * Playwright 推荐结构，所有功能和测试内容保留
 */

import { test, expect, chromium, Browser, Page } from '@playwright/test';
import { supabase } from '../../lib/supabase';
import { ExamStatus, ExamDifficulty } from '../../types/exam';

const E2E_CONFIG = {
  baseUrl: process.env.TEST_BASE_URL || 'http://localhost:3000',
  timeout: 30000,
  headless: process.env.CI === 'true',
  slowMo: process.env.CI === 'true' ? 0 : 50
};

const TEST_USERS = {
  admin: {
    email: 'admin@test.com',
    password: 'AdminTest123!',
    role: 'admin'
  },
  student: {
    email: 'student@test.com',
    password: 'StudentTest123!',
    role: 'student'
  }
};

const TEST_EXAM = {
  title: 'E2E测试考试',
  description: '这是一个端到端测试用的考试',
  difficulty: ExamDifficulty.INTERMEDIATE,
  duration: 30,
  totalQuestions: 5,
  passingScore: 60
};

let browser: Browser;
let adminPage: Page;
let studentPage: Page;
let examId: string;

// 辅助函数区
async function adminLogin(): Promise<void> {
  await adminPage.goto(`${E2E_CONFIG.baseUrl}/login`);
  await adminPage.waitForSelector('[data-testid="login-form"]');
  await adminPage.type('[data-testid="email-input"]', TEST_USERS.admin.email);
  await adminPage.type('[data-testid="password-input"]', TEST_USERS.admin.password);
  await adminPage.click('[data-testid="login-button"]');
  await adminPage.waitForSelector('[data-testid="admin-dashboard"]');
}

async function studentLogin(): Promise<void> {
  await studentPage.goto(`${E2E_CONFIG.baseUrl}/login`);
  await studentPage.waitForSelector('[data-testid="login-form"]');
  await studentPage.type('[data-testid="email-input"]', TEST_USERS.student.email);
  await studentPage.type('[data-testid="password-input"]', TEST_USERS.student.password);
  await studentPage.click('[data-testid="login-button"]');
  await studentPage.waitForSelector('[data-testid="student-dashboard"]');
}

async function setupTestData(): Promise<void> {
  try {
    await createTestUsers();
    await createTestQuestions();
    console.log('测试数据准备完成');
  } catch (error) {
    console.error('准备测试数据失败:', error);
    throw error;
  }
}

async function cleanupTestData(): Promise<void> {
  try {
    if (examId) {
      await supabase.from('exams').delete().eq('id', examId);
    }
    await supabase.from('users').delete().eq('email', TEST_USERS.admin.email);
    await supabase.from('users').delete().eq('email', TEST_USERS.student.email);
    console.log('测试数据清理完成');
  } catch (error) {
    console.error('清理测试数据失败:', error);
  }
}

async function createTestUsers(): Promise<void> {
  const users = [TEST_USERS.admin, TEST_USERS.student];
  for (const user of users) {
    const { error } = await supabase.from('users').insert({
      email: user.email,
      password: user.password,
      role: user.role,
      is_active: true,
      is_verified: true
    });
    if (error && !error.message.includes('duplicate')) {
      throw error;
    }
  }
}

async function createTestQuestions(): Promise<void> {
  const questions = [
    {
      title: '什么是JavaScript？',
      type: 'multiple_choice',
      content: 'JavaScript是什么类型的语言？',
      options: ['编程语言', '标记语言', '样式语言', '数据库语言'],
      correct_answer: '编程语言',
      difficulty: 'easy',
      category: 'programming'
    },
    {
      title: '解释闭包概念',
      type: 'short_answer',
      content: '请简要解释JavaScript中的闭包概念',
      difficulty: 'medium',
      category: 'programming'
    }
  ];
  for (const question of questions) {
    await supabase.from('questions').insert(question);
  }
}

async function createTestExam(examData: any): Promise<string> {
  const { data, error } = await supabase
    .from('exams')
    .insert({
      ...examData,
      status: ExamStatus.PUBLISHED,
      created_by: TEST_USERS.admin.email
    })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

async function assignExamToStudent(examId: string, studentEmail: string): Promise<void> {
  const { error } = await supabase.from('exam_assignments').insert({
    exam_id: examId,
    user_email: studentEmail,
    assigned_at: new Date().toISOString()
  });
  if (error) throw error;
}

// Playwright 测试钩子
test.beforeAll(async () => {
  browser = await chromium.launch({ headless: E2E_CONFIG.headless, slowMo: E2E_CONFIG.slowMo });
  adminPage = await browser.newPage();
  studentPage = await browser.newPage();
  await adminPage.setViewportSize({ width: 1280, height: 720 });
  await studentPage.setViewportSize({ width: 1280, height: 720 });
  await setupTestData();
  examId = await createTestExam(TEST_EXAM);
  await assignExamToStudent(examId, TEST_USERS.student.email);
// ...已删除多余闭合括号...


  await cleanupTestData();
  await adminPage.close();
  await studentPage.close();
  await browser.close();
});

  studentPage = await browser.newPage();
  await adminPage.goto(E2E_CONFIG.baseUrl);
  await studentPage.goto(E2E_CONFIG.baseUrl);
});

  await studentLogin();
  await adminPage.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await studentPage.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
});

// 测试用例区
test('学生应该能够参加考试并提交答案', async () => {
  await studentLogin();
  await studentPage.click('[data-testid="my-exams"]');
  await studentPage.waitForSelector('[data-testid="exam-list"]');
  const examCard = await studentPage.waitForSelector(`[data-testid="exam-card-${examId}"]`);
  expect(examCard).toBeTruthy();
  await studentPage.click(`[data-testid="start-exam-${examId}"]`);
  await studentPage.waitForSelector('[data-testid="exam-interface"]');
  const examTitle = await studentPage.$eval('[data-testid="exam-title"]', el => el.textContent);
  expect(examTitle).toBe(TEST_EXAM.title);
  const questionCount = await studentPage.$$eval('[data-testid^="question-"]', questions => questions.length);
  expect(questionCount).toBe(TEST_EXAM.totalQuestions);
  for (let i = 0; i < questionCount; i++) {
    const questionSelector = `[data-testid="question-${i}"]`;
    await studentPage.waitForSelector(questionSelector);
    const questionType = await studentPage.$eval(`${questionSelector} [data-testid="question-type"]`, el => el.textContent);
    if (questionType === 'multiple_choice') {
      await studentPage.click(`${questionSelector} [data-testid="option-0"]`);
    } else if (questionType === 'short_answer') {
      await studentPage.type(`${questionSelector} [data-testid="answer-input"]`, '这是测试答案');
    }
    if (i < questionCount - 1) {
      await studentPage.click('[data-testid="next-question"]');
    }
  }
  await studentPage.click('[data-testid="submit-exam"]');
  await studentPage.waitForSelector('[data-testid="confirm-submit"]');
  await studentPage.click('[data-testid="confirm-submit"]');
  await studentPage.waitForSelector('[data-testid="exam-completed"]');
  const completionMessage = await studentPage.$eval('[data-testid="completion-message"]', el => el.textContent);
  expect(completionMessage).toContain('考试已提交');
});

  await studentPage.goto(`${E2E_CONFIG.baseUrl}/exam/${examId}`);
  await adminLogin();
  await adminPage.click('[data-testid="admin-menu"]');
  await adminPage.click('[data-testid="exam-results"]');
  await adminPage.waitForSelector('[data-testid="results-list"]');
  const resultRow = await adminPage.waitForSelector(`[data-testid="result-${examId}"]`);
  expect(resultRow).toBeTruthy();
  await adminPage.click(`[data-testid="view-result-${examId}"]`);
  await adminPage.waitForSelector('[data-testid="result-details"]');
  const studentEmail = await adminPage.$eval('[data-testid="student-email"]', el => el.textContent);
  expect(studentEmail).toBe(TEST_USERS.student.email);
  const examScore = await adminPage.$eval('[data-testid="exam-score"]', el => el.textContent);
  expect(examScore).toBeTruthy();
  await adminPage.click('[data-testid="generate-report"]');
  await adminPage.waitForSelector('[data-testid="report-generated"]');
  const reportMessage = await adminPage.$eval('[data-testid="report-message"]', el => el.textContent);
  expect(reportMessage).toContain('报告已生成');
  const [download] = await Promise.all([
    adminPage.waitForEvent('download'),
    adminPage.click('[data-testid="download-report"]')
  ]);
  expect(await download.suggestedFilename()).toContain('.pdf');
});

  await studentPage.waitForSelector('[data-testid="exam-interface"]');
  await studentLogin();
  const shortExam = { ...TEST_EXAM, duration: 1 };
  const shortExamId = await createTestExam(shortExam);
  await assignExamToStudent(shortExamId, TEST_USERS.student.email);
  await studentPage.goto(`${E2E_CONFIG.baseUrl}/exam/${shortExamId}`);
  await studentPage.waitForSelector('[data-testid="exam-interface"]');
  await studentPage.waitForSelector('[data-testid="exam-timeout"]', { timeout: 70000 });
  const timeoutMessage = await studentPage.$eval('[data-testid="timeout-message"]', el => el.textContent);
  expect(timeoutMessage).toContain('时间已到');
});

  await studentPage.context().setOffline(true);
  await studentLogin();
  await studentPage.goto(`${E2E_CONFIG.baseUrl}/exam/${examId}`);
  await studentPage.waitForSelector('[data-testid="exam-interface"]');
  await studentPage.context().setOffline(true);
  await studentPage.click('[data-testid="next-question"]');
  await studentPage.waitForSelector('[data-testid="offline-warning"]');
  await studentPage.context().setOffline(false);
  await studentPage.waitForSelector('[data-testid="online-status"]');
  const syncMessage = await studentPage.$eval('[data-testid="sync-status"]', el => el.textContent);
  expect(syncMessage).toContain('已同步');
});
  await studentPage.click('[data-testid="next-question"]');
  await studentPage.waitForSelector('[data-testid="offline-warning"]');
  await studentPage.context().setOffline(false);
  await studentPage.waitForSelector('[data-testid="online-status"]');
  const syncMessage = await studentPage.$eval('[data-testid="sync-status"]', el => el.textContent);
  expect(syncMessage).toContain('已同步');
});
  await adminPage.setViewportSize({ width: 1280, height: 720 });
  await studentPage.setViewportSize({ width: 1280, height: 720 });
  await setupTestData();
  examId = await createTestExam(TEST_EXAM);
  await assignExamToStudent(examId, TEST_USERS.student.email);
});

test.afterAll(async () => {
  await cleanupTestData();
  await adminPage.close();
  await studentPage.close();
  await browser.close();
});

test.beforeEach(async () => {
  await adminPage.goto(E2E_CONFIG.baseUrl);
  await studentPage.goto(E2E_CONFIG.baseUrl);
});

test.afterEach(async () => {
  await adminPage.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await studentPage.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
});

// ...existing code...
      await adminPage.type('[data-testid="exam-total-questions"]', TEST_EXAM.totalQuestions.toString());
      await adminPage.type('[data-testid="exam-passing-score"]', TEST_EXAM.passingScore.toString());
test.beforeAll(async ({ browser }) => {
// 辅助函数区
async function adminLogin(): Promise<void> {
  await adminPage.goto(`${E2E_CONFIG.baseUrl}/login`);
  await adminPage.waitForSelector('[data-testid="login-form"]');
  await adminPage.type('[data-testid="email-input"]', TEST_USERS.admin.email);
  await adminPage.type('[data-testid="password-input"]', TEST_USERS.admin.password);
  await adminPage.click('[data-testid="login-button"]');
  await adminPage.waitForSelector('[data-testid="admin-dashboard"]');
}

async function studentLogin(): Promise<void> {
  await studentPage.goto(`${E2E_CONFIG.baseUrl}/login`);
  await studentPage.waitForSelector('[data-testid="login-form"]');
  await studentPage.type('[data-testid="email-input"]', TEST_USERS.student.email);
  await studentPage.type('[data-testid="password-input"]', TEST_USERS.student.password);
  await studentPage.click('[data-testid="login-button"]');
  await studentPage.waitForSelector('[data-testid="student-dashboard"]');
}

async function setupTestData(): Promise<void> {
  try {
    await createTestUsers();
    await createTestQuestions();
    console.log('测试数据准备完成');
  } catch (error) {
    console.error('准备测试数据失败:', error);
    throw error;
  }
}

async function cleanupTestData(): Promise<void> {
  try {
    if (examId) {
      await supabase.from('exams').delete().eq('id', examId);
    }
    await supabase.from('users').delete().eq('email', TEST_USERS.admin.email);
    await supabase.from('users').delete().eq('email', TEST_USERS.student.email);
    console.log('测试数据清理完成');
  } catch (error) {
    console.error('清理测试数据失败:', error);
  }
}

async function createTestUsers(): Promise<void> {
  const users = [TEST_USERS.admin, TEST_USERS.student];
  for (const user of users) {
    const { error } = await supabase.from('users').insert({
      email: user.email,
      password: user.password,
      role: user.role,
      is_active: true,
      is_verified: true
    });
    if (error && !error.message.includes('duplicate')) {
      throw error;
    }
  }
}

async function createTestQuestions(): Promise<void> {
  const questions = [
    {
      title: '什么是JavaScript？',
      type: 'multiple_choice',
      content: 'JavaScript是什么类型的语言？',
      options: ['编程语言', '标记语言', '样式语言', '数据库语言'],
      correct_answer: '编程语言',
      difficulty: 'easy',
      category: 'programming'
    },
    {
      title: '解释闭包概念',
      type: 'short_answer',
      content: '请简要解释JavaScript中的闭包概念',
      difficulty: 'medium',
      category: 'programming'
    }
  ];
  for (const question of questions) {
    await supabase.from('questions').insert(question);
  }
}

async function createTestExam(examData: any): Promise<string> {
  const { data, error } = await supabase
    .from('exams')
    .insert({
      ...examData,
      status: ExamStatus.PUBLISHED,
      created_by: TEST_USERS.admin.email
    })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

async function assignExamToStudent(examId: string, studentEmail: string): Promise<void> {
  const { error } = await supabase.from('exam_assignments').insert({
    exam_id: examId,
    user_email: studentEmail,
    assigned_at: new Date().toISOString()
  });
  if (error) throw error;
}

// 测试用例区
test.beforeAll(async () => {
  browser = await chromium.launch({ headless: E2E_CONFIG.headless, slowMo: E2E_CONFIG.slowMo });
  adminPage = await browser.newPage();
  studentPage = await browser.newPage();
  await adminPage.setViewportSize({ width: 1280, height: 720 });
  await studentPage.setViewportSize({ width: 1280, height: 720 });
  await setupTestData();
  examId = await createTestExam(TEST_EXAM);
  await assignExamToStudent(examId, TEST_USERS.student.email);
});

test.afterAll(async () => {
  await cleanupTestData();
  await adminPage.close();
  await studentPage.close();
  await browser.close();
});

      expect(assignmentMessage).toContain('分配成功');
  await adminPage.goto(E2E_CONFIG.baseUrl);
  await studentPage.goto(E2E_CONFIG.baseUrl);
});

      // 6. 下载报告
  await adminPage.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await studentPage.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
});
      const [download] = await Promise.all([
        adminPage.waitForEvent('download'),
        adminPage.click('[data-testid="download-report"]')
      ]);
      expect(await download.suggestedFilename()).toContain('.pdf');
});

    /**
 * 测试学生参加考试流程 
     */
test('学生应该能够参加考试并提交答案', async () => {
  // 1. 学生登录
  await studentLogin();

  // 2. 导航到考试页面 
      await studentPage.click('[data-testid="my-exams"]');
      await studentPage.waitForSelector('[data-testid="exam-list"]');

      // 3. 找到分配的考试
      const examCard = await studentPage.waitForSelector(
        `[data-testid="exam-card-${examId}"]`
      );
    expect(examCard).toBeTruthy(); 

      // 4. 开始考试
      await studentPage.click(`[data-testid="start-exam-${examId}"]`);
      await studentPage.waitForSelector('[data-testid="exam-interface"]');

      // 验证考试界面加载
      const examTitle = await studentPage.$eval(
        '[data-testid="exam-title"]',
    el => el.textContent 
      );
      expect(examTitle).toBe(TEST_EXAM.title);

      // 5. 回答问题
      const questionCount = await studentPage.$$eval(
        '[data-testid^="question-"]',
    questions => questions.length 
      );
      expect(questionCount).toBe(TEST_EXAM.totalQuestions);

      // 模拟回答每个问题
      for (let i = 0; i < questionCount; i++) {
        const questionSelector = `[data-testid="question-${i}"]`;
    await studentPage.waitForSelector(questionSelector); 

        // 根据题型选择答案
        const questionType = await studentPage.$eval(
          `${questionSelector} [data-testid="question-type"]`,
          el => el.textContent
        );

        if (questionType === 'multiple_choice') {
          // 选择第一个选项
          await studentPage.click(`${questionSelector} [data-testid="option-0"]`);
        } else if (questionType === 'short_answer') {
          // 填写简答题
          await studentPage.type(
            `${questionSelector} [data-testid="answer-input"]`,
            '这是测试答案'
          );
        }

        // 下一题
        if (i < questionCount - 1) {
          await studentPage.click('[data-testid="next-question"]');
        }
      }

      // 6. 提交考试
      await studentPage.click('[data-testid="submit-exam"]');
      await studentPage.waitForSelector('[data-testid="confirm-submit"]');
    await studentPage.click('[data-testid="confirm-submit"]'); 

      // 7. 验证提交成功
      await studentPage.waitForSelector('[data-testid="exam-completed"]');
      const completionMessage = await studentPage.$eval(
        '[data-testid="completion-message"]',
        el => el.textContent
      );
      expect(completionMessage).toContain('考试已提交');
    }, 90000);

    /**
     * 测试管理员查看成绩和生成报告
     */
test('管理员应该能够查看考试成绩和生成报告', async () => {
      // 1. 管理员登录（如果未登录）
      await adminLogin();

      // 2. 导航到成绩管理页面
      await adminPage.click('[data-testid="admin-menu"]');
      await adminPage.click('[data-testid="exam-results"]');
  await adminPage.waitForSelector('[data-testid="results-list"]'); 

      // 3. 查找考试结果
      const resultRow = await adminPage.waitForSelector(
        `[data-testid="result-${examId}"]`
      );
      expect(resultRow).toBeTruthy();

      // 4. 查看详细成绩
      await adminPage.click(`[data-testid="view-result-${examId}"]`);
      await adminPage.waitForSelector('[data-testid="result-details"]');

      // 验证成绩信息
      const studentEmail = await adminPage.$eval(
        '[data-testid="student-email"]',
        el => el.textContent
      );
      expect(studentEmail).toBe(TEST_USERS.student.email);

      const examScore = await adminPage.$eval(
        '[data-testid="exam-score"]',
        el => el.textContent
      );
      expect(examScore).toBeTruthy();

      // 5. 生成考试报告
      await adminPage.click('[data-testid="generate-report"]');
      await adminPage.waitForSelector('[data-testid="report-generated"]');

      // 验证报告生成成功
      const reportMessage = await adminPage.$eval(
        '[data-testid="report-message"]',
            el => el.textContent 
      );
      expect(reportMessage).toContain('报告已生成');

      // 6. 下载报告
      const downloadPromise = adminPage.waitForEvent('download');
      await adminPage.click('[data-testid="download-report"]');
      const download = await downloadPromise;
  expect(download.suggestedFilename()).toContain('.pdf'); 
    }, 60000);
  });

  /**
   * 异常情况测试
   */
  // 异常情况测试：考试时间超时处理
test('应该正确处理考试时间超时', async () => {
  await studentLogin();
  const shortExam = { ...TEST_EXAM, duration: 1 };
  const shortExamId = await createTestExam(shortExam);
  await assignExamToStudent(shortExamId, TEST_USERS.student.email);
  await studentPage.goto(`${E2E_CONFIG.baseUrl}/exam/${shortExamId}`);
  await studentPage.waitForSelector('[data-testid="exam-interface"]');
  await studentPage.waitForSelector('[data-testid="exam-timeout"]', { timeout: 70000 });
  const timeoutMessage = await studentPage.$eval('[data-testid="timeout-message"]', el => el.textContent);
  expect(timeoutMessage).toContain('时间已到');
});

  // 异常情况测试：网络中断恢复
test('应该能够处理网络中断并恢复', async () => {
  await studentLogin();
  await studentPage.goto(`${E2E_CONFIG.baseUrl}/exam/${examId}`);
  await studentPage.waitForSelector('[data-testid="exam-interface"]');
  await studentPage.context().setOffline(true);
  await studentPage.click('[data-testid="next-question"]');
  await studentPage.waitForSelector('[data-testid="offline-warning"]');
  await studentPage.context().setOffline(false);
  await studentPage.waitForSelector('[data-testid="online-status"]');
  const syncMessage = await studentPage.$eval('[data-testid="sync-status"]', el => el.textContent);
  expect(syncMessage).toContain('已同步');
});

  /**
   * 辅助函数：管理员登录
   */
  async function adminLogin(): Promise<void> {
    await adminPage.goto(`${E2E_CONFIG.baseUrl}/login`);
    await adminPage.waitForSelector('[data-testid="login-form"]');
    
    await adminPage.type('[data-testid="email-input"]', TEST_USERS.admin.email);
    await adminPage.type('[data-testid="password-input"]', TEST_USERS.admin.password);
    await adminPage.click('[data-testid="login-button"]');
    
    await adminPage.waitForSelector('[data-testid="admin-dashboard"]');
  }

  /**
   * 辅助函数：学生登录
   */
  async function studentLogin(): Promise<void> {
    await studentPage.goto(`${E2E_CONFIG.baseUrl}/login`);
    await studentPage.waitForSelector('[data-testid="login-form"]');
    
    await studentPage.type('[data-testid="email-input"]', TEST_USERS.student.email);
    await studentPage.type('[data-testid="password-input"]', TEST_USERS.student.password);
    await studentPage.click('[data-testid="login-button"]');
    
    await studentPage.waitForSelector('[data-testid="student-dashboard"]');
  }

  /**
   * 辅助函数：准备测试数据
   */
  async function setupTestData(): Promise<void> {
    try {
      // 创建测试用户
      await createTestUsers();
      
      // 创建测试题目
      await createTestQuestions();
      
      console.log('测试数据准备完成');
    } catch (error) {
      console.error('准备测试数据失败:', error);
      throw error;
    }
  }

  /**
   * 辅助函数：清理测试数据
   */
  async function cleanupTestData(): Promise<void> {
    try {
      // 删除测试考试
      if (examId) {
        await supabase.from('exams').delete().eq('id', examId);
      }
      
      // 删除测试用户
      await supabase.from('users').delete().eq('email', TEST_USERS.admin.email);
      await supabase.from('users').delete().eq('email', TEST_USERS.student.email);
      
      console.log('测试数据清理完成');
    } catch (error) {
      console.error('清理测试数据失败:', error);
    }
  }

  /**
   * 辅助函数：创建测试用户
   */
  async function createTestUsers(): Promise<void> {
    const users = [TEST_USERS.admin, TEST_USERS.student];
    
    for (const user of users) {
      const { error } = await supabase.from('users').insert({
        email: user.email,
        password: user.password, // 在实际环境中应该加密
        role: user.role,
        is_active: true,
        is_verified: true
      });
      
      if (error && !error.message.includes('duplicate')) {
        throw error;
      }
    }
  }

  /**
   * 辅助函数：创建测试题目
   */
  async function createTestQuestions(): Promise<void> {
    const questions = [
      {
        title: '什么是JavaScript？',
        type: 'multiple_choice',
        content: 'JavaScript是什么类型的语言？',
        options: ['编程语言', '标记语言', '样式语言', '数据库语言'],
        correct_answer: '编程语言',
        difficulty: 'easy',
        category: 'programming'
      },
      {
        title: '解释闭包概念',
        type: 'short_answer',
        content: '请简要解释JavaScript中的闭包概念',
        difficulty: 'medium',
        category: 'programming'
      }
    ];
    
    for (const question of questions) {
      await supabase.from('questions').insert(question);
    }
  }

  /**
   * 辅助函数：创建测试考试
   */
  async function createTestExam(examData: any): Promise<string> {
    const { data, error } = await supabase
      .from('exams')
      .insert({
        ...examData,
        status: ExamStatus.PUBLISHED,
        created_by: TEST_USERS.admin.email
      })
      .select('id')
      .single();
    
    if (error) throw error;
    return data.id;
  }

  /**
   * 辅助函数：分配考试给学生
   */
  async function assignExamToStudent(examId: string, studentEmail: string): Promise<void> {
    const { error } = await supabase.from('exam_assignments').insert({
      exam_id: examId,
      user_email: studentEmail,
      assigned_at: new Date().toISOString()
    });
    
    if (error) throw error;
  }
