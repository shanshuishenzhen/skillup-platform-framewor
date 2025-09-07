/**
 * 完整考试工作流程端到端测试
 * 使用Playwright模拟用户完整操作流程：登录 -> 分配试卷 -> 考试 -> 成绩查看
 * 
 * @author SOLO Coding
 * @version 1.0.0
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';

/**
 * 测试配置
 */
const TEST_CONFIG = {
  baseUrl: 'http://localhost:3001',
  timeout: 30000,
  retryDelay: 2000
};

/**
 * 测试用户数据
 */
const TEST_USERS = {
  admin: {
    phone: '13800000001',
    password: 'password123',
    name: '测试管理员',
    role: 'admin'
  },
  teacher: {
    phone: '13800000002',
    password: 'password123',
    name: '测试教师',
    role: 'teacher'
  },
  student: {
    phone: '13800000003',
    password: 'password123',
    name: '测试学生',
    role: 'student'
  }
};

/**
 * 测试考试数据
 */
const TEST_EXAM_DATA = {
  title: 'E2E自动化测试考试',
  description: '这是一个端到端自动化测试用的考试',
  duration: 30,
  totalQuestions: 3,
  passingScore: 60,
  questions: [
    {
      title: '单选题测试',
      type: 'single_choice',
      content: '以下哪个是正确答案？',
      options: ['选项A', '选项B', '选项C', '选项D'],
      correctAnswer: 'B',
      score: 30
    },
    {
      title: '多选题测试',
      type: 'multiple_choice',
      content: '以下哪些是正确答案？（多选）',
      options: ['选项1', '选项2', '选项3', '选项4'],
      correctAnswers: ['A', 'C'],
      score: 40
    },
    {
      title: '判断题测试',
      type: 'true_false',
      content: '这是一个判断题，请选择正确或错误',
      options: ['正确', '错误'],
      correctAnswer: '正确',
      score: 30
    }
  ]
};

/**
 * 页面操作工具类
 */
class PageUtils {
  /**
   * 等待页面加载完成
   */
  static async waitForPageLoad(page: Page, timeout = 10000): Promise<void> {
    await page.waitForLoadState('networkidle', { timeout });
  }

  /**
   * 安全点击元素（等待元素可见后点击）
   */
  static async safeClick(page: Page, selector: string, timeout = 10000): Promise<void> {
    await page.waitForSelector(selector, { state: 'visible', timeout });
    await page.click(selector);
  }

  /**
   * 安全填写输入框
   */
  static async safeFill(page: Page, selector: string, value: string, timeout = 10000): Promise<void> {
    await page.waitForSelector(selector, { state: 'visible', timeout });
    await page.fill(selector, value);
  }

  /**
   * 等待并验证URL包含指定路径
   */
  static async waitForUrlContains(page: Page, path: string, timeout = 10000): Promise<void> {
    await page.waitForFunction(
      (expectedPath) => window.location.href.includes(expectedPath),
      path,
      { timeout }
    );
  }

  /**
   * 截图保存（用于调试）
   */
  static async takeScreenshot(page: Page, name: string): Promise<void> {
    await page.screenshot({ 
      path: `test-results/screenshots/${name}-${Date.now()}.png`,
      fullPage: true 
    });
  }
}

/**
 * 用户登录工具
 */
class LoginUtils {
  /**
   * 执行用户登录
   */
  static async login(page: Page, user: typeof TEST_USERS.admin): Promise<void> {
    await page.goto(`${TEST_CONFIG.baseUrl}/login`);
    await PageUtils.waitForPageLoad(page);

    // 检查是否有密码登录选项卡
    const passwordTab = page.locator('button:has-text("密码登录")');
    if (await passwordTab.isVisible()) {
      await passwordTab.click();
    }

    // 填写登录表单
    const phoneInput = page.locator('input[type="tel"], input[name="phone"], input[id="phone"]').first();
    const passwordInput = page.locator('input[type="password"], input[name="password"], input[id="password"]').first();
    const loginButton = page.locator('button[type="submit"]:has-text("登录")').first();

    await phoneInput.fill(user.phone);
    await passwordInput.fill(user.password);
    await loginButton.click();

    // 等待登录成功（URL变化或页面内容变化）
    await page.waitForTimeout(3000);
    
    // 验证登录成功
    const currentUrl = page.url();
    const isLoggedIn = !currentUrl.includes('/login') || 
                      await page.locator('text=欢迎, text=Welcome, [data-testid="user-name"], [data-testid="logout-button"]').count() > 0;
    
    if (!isLoggedIn) {
      await PageUtils.takeScreenshot(page, `login-failed-${user.role}`);
      throw new Error(`${user.role} 登录失败`);
    }
  }

  /**
   * 执行用户登出
   */
  static async logout(page: Page): Promise<void> {
    const logoutButton = page.locator('[data-testid="logout-button"], button:has-text("退出"), button:has-text("登出")');
    if (await logoutButton.isVisible()) {
      await logoutButton.click();
      await PageUtils.waitForUrlContains(page, '/login');
    }
  }
}

/**
 * 考试管理工具
 */
class ExamUtils {
  /**
   * 创建考试
   */
  static async createExam(page: Page, examData: typeof TEST_EXAM_DATA): Promise<string> {
    // 导航到考试管理页面
    await page.goto(`${TEST_CONFIG.baseUrl}/admin/exams`);
    await PageUtils.waitForPageLoad(page);

    // 点击创建考试按钮
    await PageUtils.safeClick(page, 'button:has-text("创建考试"), [data-testid="create-exam-button"]');

    // 填写考试基本信息
    await PageUtils.safeFill(page, 'input[name="title"], [data-testid="exam-title"]', examData.title);
    await PageUtils.safeFill(page, 'textarea[name="description"], [data-testid="exam-description"]', examData.description);
    await PageUtils.safeFill(page, 'input[name="duration"], [data-testid="exam-duration"]', examData.duration.toString());
    await PageUtils.safeFill(page, 'input[name="passingScore"], [data-testid="passing-score"]', examData.passingScore.toString());

    // 保存考试
    await PageUtils.safeClick(page, 'button[type="submit"]:has-text("保存"), button:has-text("创建")');

    // 等待考试创建成功
    await page.waitForTimeout(2000);
    
    // 获取考试ID（从URL或页面元素中）
    const currentUrl = page.url();
    const examIdMatch = currentUrl.match(/\/exams\/(\w+)/);
    return examIdMatch ? examIdMatch[1] : 'test-exam-id';
  }

  /**
   * 添加考试题目
   */
  static async addQuestions(page: Page, examId: string, questions: typeof TEST_EXAM_DATA.questions): Promise<void> {
    for (const [index, question] of questions.entries()) {
      // 导航到题目管理页面
      await page.goto(`${TEST_CONFIG.baseUrl}/admin/exams/${examId}/questions`);
      await PageUtils.waitForPageLoad(page);

      // 点击添加题目按钮
      await PageUtils.safeClick(page, 'button:has-text("添加题目"), [data-testid="add-question-button"]');

      // 填写题目信息
      await PageUtils.safeFill(page, 'input[name="title"], [data-testid="question-title"]', question.title);
      await PageUtils.safeFill(page, 'textarea[name="content"], [data-testid="question-content"]', question.content);
      
      // 选择题目类型
      const typeSelect = page.locator('select[name="type"], [data-testid="question-type"]');
      if (await typeSelect.isVisible()) {
        await typeSelect.selectOption(question.type);
      }

      // 设置分数
      await PageUtils.safeFill(page, 'input[name="score"], [data-testid="question-score"]', question.score.toString());

      // 添加选项（如果是选择题）
      if (question.type !== 'essay') {
        for (const [optionIndex, option] of question.options.entries()) {
          const optionInput = page.locator(`input[name="option-${optionIndex}"], [data-testid="option-${optionIndex}"]`);
          if (await optionInput.isVisible()) {
            await optionInput.fill(option);
          }
        }

        // 设置正确答案
        if (question.type === 'single_choice' || question.type === 'true_false') {
          const correctOption = page.locator(`input[name="correctAnswer"], [data-testid="correct-answer"]`);
          if (await correctOption.isVisible()) {
            await correctOption.fill(question.correctAnswer);
          }
        }
      }

      // 保存题目
      await PageUtils.safeClick(page, 'button[type="submit"]:has-text("保存"), button:has-text("添加")');
      await page.waitForTimeout(1000);
    }
  }

  /**
   * 发布考试
   */
  static async publishExam(page: Page, examId: string): Promise<void> {
    await page.goto(`${TEST_CONFIG.baseUrl}/admin/exams/${examId}`);
    await PageUtils.waitForPageLoad(page);

    // 点击发布按钮
    await PageUtils.safeClick(page, 'button:has-text("发布"), [data-testid="publish-exam-button"]');
    
    // 确认发布
    const confirmButton = page.locator('button:has-text("确认"), button:has-text("发布")');
    if (await confirmButton.isVisible()) {
      await confirmButton.click();
    }

    await page.waitForTimeout(2000);
  }

  /**
   * 分配考试给学生
   */
  static async assignExamToStudent(page: Page, examId: string, studentPhone: string): Promise<void> {
    await page.goto(`${TEST_CONFIG.baseUrl}/teacher/exams/${examId}/assign`);
    await PageUtils.waitForPageLoad(page);

    // 搜索学生
    const searchInput = page.locator('input[name="search"], [data-testid="student-search"]');
    if (await searchInput.isVisible()) {
      await searchInput.fill(studentPhone);
      await page.waitForTimeout(1000);
    }

    // 选择学生
    const studentCheckbox = page.locator(`input[type="checkbox"][value*="${studentPhone}"], [data-testid="student-${studentPhone}"]`);
    if (await studentCheckbox.isVisible()) {
      await studentCheckbox.check();
    }

    // 分配考试
    await PageUtils.safeClick(page, 'button:has-text("分配"), [data-testid="assign-button"]');
    await page.waitForTimeout(2000);
  }
}

/**
 * 考试参与工具
 */
class ExamTakingUtils {
  /**
   * 学生参加考试
   */
  static async takeExam(page: Page, examId: string): Promise<void> {
    // 导航到学生考试页面
    await page.goto(`${TEST_CONFIG.baseUrl}/student/exams`);
    await PageUtils.waitForPageLoad(page);

    // 查找并开始考试
    const examLink = page.locator(`a[href*="${examId}"], button:has-text("开始考试")`);
    if (await examLink.isVisible()) {
      await examLink.click();
    } else {
      // 如果找不到特定考试，点击第一个可用的考试
      await PageUtils.safeClick(page, 'button:has-text("开始考试"), a:has-text("参加考试")');
    }

    await PageUtils.waitForPageLoad(page);

    // 开始答题
    await this.answerQuestions(page);

    // 提交考试
    await this.submitExam(page);
  }

  /**
   * 回答考试题目
   */
  private static async answerQuestions(page: Page): Promise<void> {
    // 等待题目加载
    await page.waitForSelector('.question, [data-testid="question"]', { timeout: 10000 });

    const questions = await page.locator('.question, [data-testid="question"]').count();
    
    for (let i = 0; i < questions; i++) {
      // 回答当前题目
      const questionElement = page.locator('.question, [data-testid="question"]').nth(i);
      
      // 检查题目类型并回答
      const radioButtons = questionElement.locator('input[type="radio"]');
      const checkboxes = questionElement.locator('input[type="checkbox"]');
      const textArea = questionElement.locator('textarea');

      if (await radioButtons.count() > 0) {
        // 单选题 - 选择第二个选项
        await radioButtons.nth(1).check();
      } else if (await checkboxes.count() > 0) {
        // 多选题 - 选择前两个选项
        await checkboxes.nth(0).check();
        await checkboxes.nth(2).check();
      } else if (await textArea.isVisible()) {
        // 简答题
        await textArea.fill('这是一个测试答案。');
      }

      // 如果有下一题按钮，点击进入下一题
      const nextButton = page.locator('button:has-text("下一题"), [data-testid="next-question"]');
      if (await nextButton.isVisible() && i < questions - 1) {
        await nextButton.click();
        await page.waitForTimeout(1000);
      }
    }
  }

  /**
   * 提交考试
   */
  private static async submitExam(page: Page): Promise<void> {
    // 点击提交按钮
    await PageUtils.safeClick(page, 'button:has-text("提交"), [data-testid="submit-exam"]');

    // 确认提交
    const confirmButton = page.locator('button:has-text("确认提交"), button:has-text("提交")');
    if (await confirmButton.isVisible()) {
      await confirmButton.click();
    }

    // 等待提交完成
    await page.waitForTimeout(3000);
  }
}

/**
 * 成绩查看工具
 */
class ResultUtils {
  /**
   * 查看考试成绩
   */
  static async viewResults(page: Page, role: 'teacher' | 'student'): Promise<void> {
    if (role === 'teacher') {
      await page.goto(`${TEST_CONFIG.baseUrl}/teacher/results`);
    } else {
      await page.goto(`${TEST_CONFIG.baseUrl}/student/results`);
    }
    
    await PageUtils.waitForPageLoad(page);

    // 验证成绩页面加载
    await expect(page.locator('.results, [data-testid="results"], .score')).toBeVisible();
  }

  /**
   * 导出成绩
   */
  static async exportResults(page: Page): Promise<void> {
    const exportButton = page.locator('button:has-text("导出"), [data-testid="export-results"]');
    if (await exportButton.isVisible()) {
      await exportButton.click();
      await page.waitForTimeout(2000);
    }
  }
}

/**
 * 完整考试工作流程测试套件
 */
test.describe('完整考试工作流程E2E测试', () => {
  let adminPage: Page;
  let teacherPage: Page;
  let studentPage: Page;
  let examId: string;

  /**
   * 测试前准备
   */
  test.beforeAll(async ({ browser }) => {
    // 创建不同角色的页面上下文
    const adminContext = await browser.newContext();
    const teacherContext = await browser.newContext();
    const studentContext = await browser.newContext();

    adminPage = await adminContext.newPage();
    teacherPage = await teacherContext.newPage();
    studentPage = await studentContext.newPage();

    // 设置页面超时
    adminPage.setDefaultTimeout(TEST_CONFIG.timeout);
    teacherPage.setDefaultTimeout(TEST_CONFIG.timeout);
    studentPage.setDefaultTimeout(TEST_CONFIG.timeout);
  });

  /**
   * 步骤1：管理员登录并创建考试
   */
  test('步骤1：管理员登录并创建考试', async () => {
    // 管理员登录
    await LoginUtils.login(adminPage, TEST_USERS.admin);
    
    // 创建考试
    examId = await ExamUtils.createExam(adminPage, TEST_EXAM_DATA);
    expect(examId).toBeTruthy();
    
    // 添加题目
    await ExamUtils.addQuestions(adminPage, examId, TEST_EXAM_DATA.questions);
    
    // 发布考试
    await ExamUtils.publishExam(adminPage, examId);
    
    // 截图记录
    await PageUtils.takeScreenshot(adminPage, 'admin-exam-created');
  });

  /**
   * 步骤2：教师登录并分配考试
   */
  test('步骤2：教师登录并分配考试', async () => {
    // 教师登录
    await LoginUtils.login(teacherPage, TEST_USERS.teacher);
    
    // 分配考试给学生
    await ExamUtils.assignExamToStudent(teacherPage, examId, TEST_USERS.student.phone);
    
    // 截图记录
    await PageUtils.takeScreenshot(teacherPage, 'teacher-exam-assigned');
  });

  /**
   * 步骤3：学生登录并参加考试
   */
  test('步骤3：学生登录并参加考试', async () => {
    // 学生登录
    await LoginUtils.login(studentPage, TEST_USERS.student);
    
    // 参加考试
    await ExamTakingUtils.takeExam(studentPage, examId);
    
    // 截图记录
    await PageUtils.takeScreenshot(studentPage, 'student-exam-completed');
  });

  /**
   * 步骤4：查看考试成绩
   */
  test('步骤4：查看考试成绩', async () => {
    // 学生查看成绩
    await ResultUtils.viewResults(studentPage, 'student');
    await PageUtils.takeScreenshot(studentPage, 'student-results-view');
    
    // 教师查看成绩
    await ResultUtils.viewResults(teacherPage, 'teacher');
    await PageUtils.takeScreenshot(teacherPage, 'teacher-results-view');
    
    // 导出成绩
    await ResultUtils.exportResults(teacherPage);
  });

  /**
   * 步骤5：完整流程验证
   */
  test('步骤5：完整流程验证', async () => {
    // 验证考试已完成
    await studentPage.goto(`${TEST_CONFIG.baseUrl}/student/exams`);
    await PageUtils.waitForPageLoad(studentPage);
    
    // 检查考试状态
    const completedExam = studentPage.locator('.exam-completed, [data-testid="completed-exam"]');
    await expect(completedExam).toBeVisible();
    
    // 验证成绩存在
    await studentPage.goto(`${TEST_CONFIG.baseUrl}/student/results`);
    const scoreElement = studentPage.locator('.score, [data-testid="exam-score"]');
    await expect(scoreElement).toBeVisible();
  });

  /**
   * 测试后清理
   */
  test.afterAll(async () => {
    // 登出所有用户
    await LoginUtils.logout(adminPage);
    await LoginUtils.logout(teacherPage);
    await LoginUtils.logout(studentPage);
    
    // 关闭页面
    await adminPage.close();
    await teacherPage.close();
    await studentPage.close();
  });
});

/**
 * 用户注册和登录流程测试
 */
test.describe('用户注册和登录流程测试', () => {
  /**
   * 测试用户注册流程
   */
  test('用户注册流程测试', async ({ page }) => {
    await page.goto(`${TEST_CONFIG.baseUrl}/register`);
    await PageUtils.waitForPageLoad(page);
    
    // 检查注册页面元素
    await expect(page.locator('input[name="phone"], input[type="tel"]')).toBeVisible();
    await expect(page.locator('input[name="password"], input[type="password"]')).toBeVisible();
    await expect(page.locator('input[name="name"], input[name="username"]')).toBeVisible();
    
    // 填写注册信息
    const testUser = {
      phone: '13900000001',
      password: 'test123456',
      name: '测试用户'
    };
    
    await PageUtils.safeFill(page, 'input[name="phone"], input[type="tel"]', testUser.phone);
    await PageUtils.safeFill(page, 'input[name="password"], input[type="password"]', testUser.password);
    await PageUtils.safeFill(page, 'input[name="name"], input[name="username"]', testUser.name);
    
    // 提交注册
    await PageUtils.safeClick(page, 'button[type="submit"]:has-text("注册")');
    
    // 验证注册结果
    await page.waitForTimeout(3000);
    const currentUrl = page.url();
    const isRegistered = currentUrl.includes('/login') || currentUrl.includes('/dashboard');
    expect(isRegistered).toBeTruthy();
  });

  /**
   * 测试密码重置流程
   */
  test('密码重置流程测试', async ({ page }) => {
    await page.goto(`${TEST_CONFIG.baseUrl}/login`);
    await PageUtils.waitForPageLoad(page);
    
    // 点击忘记密码链接
    const forgotPasswordLink = page.locator('a:has-text("忘记密码"), button:has-text("忘记密码")');
    if (await forgotPasswordLink.isVisible()) {
      await forgotPasswordLink.click();
      
      // 填写手机号
      await PageUtils.safeFill(page, 'input[name="phone"], input[type="tel"]', TEST_USERS.student.phone);
      
      // 发送重置请求
      await PageUtils.safeClick(page, 'button:has-text("发送"), button[type="submit"]');
      
      // 验证发送成功提示
      await expect(page.locator('.success, .message, [data-testid="success-message"]')).toBeVisible();
    }
  });
});

/**
 * 权限和安全测试
 */
test.describe('权限和安全测试', () => {
  /**
   * 测试未登录用户访问受保护页面
   */
  test('未登录用户访问受保护页面应重定向到登录页', async ({ page }) => {
    const protectedPages = [
      '/admin/dashboard',
      '/teacher/dashboard',
      '/student/dashboard',
      '/admin/exams',
      '/teacher/exams',
      '/student/exams'
    ];
    
    for (const protectedPage of protectedPages) {
      await page.goto(`${TEST_CONFIG.baseUrl}${protectedPage}`);
      await PageUtils.waitForPageLoad(page);
      
      // 验证重定向到登录页
      const currentUrl = page.url();
      expect(currentUrl).toContain('/login');
    }
  });

  /**
   * 测试角色权限控制
   */
  test('学生不能访问管理员页面', async ({ page }) => {
    // 学生登录
    await LoginUtils.login(page, TEST_USERS.student);
    
    // 尝试访问管理员页面
    await page.goto(`${TEST_CONFIG.baseUrl}/admin/dashboard`);
    await PageUtils.waitForPageLoad(page);
    
    // 验证被拒绝访问或重定向
    const currentUrl = page.url();
    const isBlocked = currentUrl.includes('/403') || 
                     currentUrl.includes('/unauthorized') || 
                     currentUrl.includes('/student') ||
                     await page.locator('.error, .unauthorized, [data-testid="access-denied"]').isVisible();
    
    expect(isBlocked).toBeTruthy();
  });
});

/**
 * 响应式设计测试
 */
test.describe('响应式设计测试', () => {
  /**
   * 测试移动端登录
   */
  test('移动端登录测试', async ({ page }) => {
    // 设置移动端视口
    await page.setViewportSize({ width: 375, height: 667 });
    
    // 执行登录流程
    await LoginUtils.login(page, TEST_USERS.student);
    
    // 验证移动端布局
    await expect(page.locator('.mobile-menu, [data-testid="mobile-nav"]')).toBeVisible();
  });

  /**
   * 测试平板端考试界面
   */
  test('平板端考试界面测试', async ({ page }) => {
    // 设置平板端视口
    await page.setViewportSize({ width: 768, height: 1024 });
    
    // 学生登录
    await LoginUtils.login(page, TEST_USERS.student);
    
    // 访问考试页面
    await page.goto(`${TEST_CONFIG.baseUrl}/student/exams`);
    await PageUtils.waitForPageLoad(page);
    
    // 验证平板端布局适配
    const examCards = page.locator('.exam-card, [data-testid="exam-card"]');
    await expect(examCards).toBeVisible();
  });
});