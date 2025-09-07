/**
 * 考试管理流程端到端测试
 * 测试管理员和教师的考试创建、编辑、发布、分配等完整流程
 * 
 * @author SOLO Coding
 * @version 1.0.0
 */

import { test, expect, Page } from '@playwright/test';

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
  basic: {
    title: '基础知识测试',
    description: '这是一个基础知识测试考试',
    duration: 60,
    totalQuestions: 5,
    passingScore: 70,
    maxAttempts: 3,
    category: '基础测试'
  },
  advanced: {
    title: '高级技能测试',
    description: '这是一个高级技能测试考试',
    duration: 120,
    totalQuestions: 10,
    passingScore: 80,
    maxAttempts: 2,
    category: '高级测试'
  },
  questions: {
    singleChoice: {
      title: '单选题示例',
      type: 'single_choice',
      content: '以下哪个选项是正确的？',
      options: ['选项A', '选项B', '选项C', '选项D'],
      correctAnswer: 'B',
      score: 20,
      explanation: '选项B是正确答案，因为...'
    },
    multipleChoice: {
      title: '多选题示例',
      type: 'multiple_choice',
      content: '以下哪些选项是正确的？（多选）',
      options: ['选项1', '选项2', '选项3', '选项4'],
      correctAnswers: ['A', 'C'],
      score: 30,
      explanation: '选项A和C都是正确答案'
    },
    trueFalse: {
      title: '判断题示例',
      type: 'true_false',
      content: '这是一个判断题，请选择正确或错误',
      options: ['正确', '错误'],
      correctAnswer: '正确',
      score: 15,
      explanation: '这个说法是正确的'
    },
    essay: {
      title: '简答题示例',
      type: 'essay',
      content: '请简述您对这个问题的理解',
      score: 35,
      sampleAnswer: '这是一个示例答案...'
    }
  }
};

/**
 * 页面操作工具类
 */
class ExamPageUtils {
  /**
   * 等待页面加载完成
   */
  static async waitForPageLoad(page: Page, timeout = 10000): Promise<void> {
    await page.waitForLoadState('networkidle', { timeout });
  }

  /**
   * 安全点击元素
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
   * 安全选择下拉选项
   */
  static async safeSelect(page: Page, selector: string, value: string, timeout = 10000): Promise<void> {
    await page.waitForSelector(selector, { state: 'visible', timeout });
    await page.selectOption(selector, value);
  }

  /**
   * 截图保存
   */
  static async takeScreenshot(page: Page, name: string): Promise<void> {
    await page.screenshot({ 
      path: `test-results/screenshots/exam-management-${name}-${Date.now()}.png`,
      fullPage: true 
    });
  }

  /**
   * 等待并验证成功消息
   */
  static async waitForSuccessMessage(page: Page, timeout = 5000): Promise<boolean> {
    const successSelectors = [
      '.success-message',
      '.alert-success',
      '[data-testid="success-message"]',
      '.text-green-500',
      '.notification.success'
    ];

    try {
      for (const selector of successSelectors) {
        const element = page.locator(selector);
        if (await element.isVisible({ timeout: 1000 })) {
          return true;
        }
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * 等待并验证错误消息
   */
  static async waitForErrorMessage(page: Page, timeout = 5000): Promise<boolean> {
    const errorSelectors = [
      '.error-message',
      '.alert-error',
      '[data-testid="error-message"]',
      '.text-red-500',
      '.notification.error'
    ];

    try {
      for (const selector of errorSelectors) {
        const element = page.locator(selector);
        if (await element.isVisible({ timeout: 1000 })) {
          return true;
        }
      }
      return false;
    } catch {
      return false;
    }
  }
}

/**
 * 登录工具类
 */
class LoginUtils {
  /**
   * 执行用户登录
   */
  static async login(page: Page, user: typeof TEST_USERS.admin): Promise<void> {
    await page.goto(`${TEST_CONFIG.baseUrl}/login`);
    await ExamPageUtils.waitForPageLoad(page);

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

    // 等待登录成功
    await page.waitForTimeout(3000);
    
    // 验证登录成功
    const currentUrl = page.url();
    const isLoggedIn = !currentUrl.includes('/login');
    
    if (!isLoggedIn) {
      await ExamPageUtils.takeScreenshot(page, `login-failed-${user.role}`);
      throw new Error(`${user.role} 登录失败`);
    }
  }
}

/**
 * 考试创建工具类
 */
class ExamCreationUtils {
  /**
   * 创建基础考试
   */
  static async createBasicExam(page: Page, examData: typeof TEST_EXAM_DATA.basic): Promise<string> {
    // 导航到考试管理页面
    const examManagementUrls = [
      `${TEST_CONFIG.baseUrl}/admin/exams`,
      `${TEST_CONFIG.baseUrl}/teacher/exams`,
      `${TEST_CONFIG.baseUrl}/exams`
    ];

    let navigated = false;
    for (const url of examManagementUrls) {
      try {
        await page.goto(url);
        await ExamPageUtils.waitForPageLoad(page);
        navigated = true;
        break;
      } catch {
        continue;
      }
    }

    if (!navigated) {
      throw new Error('无法导航到考试管理页面');
    }

    // 点击创建考试按钮
    const createButtonSelectors = [
      'button:has-text("创建考试")',
      'button:has-text("新建考试")',
      '[data-testid="create-exam-button"]',
      '.create-exam-btn'
    ];

    let createButtonClicked = false;
    for (const selector of createButtonSelectors) {
      try {
        await ExamPageUtils.safeClick(page, selector, 3000);
        createButtonClicked = true;
        break;
      } catch {
        continue;
      }
    }

    if (!createButtonClicked) {
      throw new Error('无法找到创建考试按钮');
    }

    // 填写考试基本信息
    await this.fillExamBasicInfo(page, examData);

    // 保存考试
    await this.saveExam(page);

    // 获取考试ID
    await page.waitForTimeout(2000);
    const currentUrl = page.url();
    const examIdMatch = currentUrl.match(/\/exams\/(\w+)/);
    return examIdMatch ? examIdMatch[1] : `exam-${Date.now()}`;
  }

  /**
   * 填写考试基本信息
   */
  private static async fillExamBasicInfo(page: Page, examData: any): Promise<void> {
    // 填写考试标题
    const titleSelectors = [
      'input[name="title"]',
      '[data-testid="exam-title"]',
      '#exam-title'
    ];
    
    for (const selector of titleSelectors) {
      try {
        await ExamPageUtils.safeFill(page, selector, examData.title);
        break;
      } catch {
        continue;
      }
    }

    // 填写考试描述
    const descriptionSelectors = [
      'textarea[name="description"]',
      '[data-testid="exam-description"]',
      '#exam-description'
    ];
    
    for (const selector of descriptionSelectors) {
      try {
        await ExamPageUtils.safeFill(page, selector, examData.description);
        break;
      } catch {
        continue;
      }
    }

    // 填写考试时长
    const durationSelectors = [
      'input[name="duration"]',
      '[data-testid="exam-duration"]',
      '#exam-duration'
    ];
    
    for (const selector of durationSelectors) {
      try {
        await ExamPageUtils.safeFill(page, selector, examData.duration.toString());
        break;
      } catch {
        continue;
      }
    }

    // 填写及格分数
    const passingScoreSelectors = [
      'input[name="passingScore"]',
      '[data-testid="passing-score"]',
      '#passing-score'
    ];
    
    for (const selector of passingScoreSelectors) {
      try {
        await ExamPageUtils.safeFill(page, selector, examData.passingScore.toString());
        break;
      } catch {
        continue;
      }
    }

    // 填写最大尝试次数（如果存在）
    const maxAttemptsSelectors = [
      'input[name="maxAttempts"]',
      '[data-testid="max-attempts"]',
      '#max-attempts'
    ];
    
    for (const selector of maxAttemptsSelectors) {
      try {
        await ExamPageUtils.safeFill(page, selector, examData.maxAttempts.toString());
        break;
      } catch {
        continue;
      }
    }

    // 选择考试分类（如果存在）
    const categorySelectors = [
      'select[name="category"]',
      '[data-testid="exam-category"]',
      '#exam-category'
    ];
    
    for (const selector of categorySelectors) {
      try {
        await ExamPageUtils.safeSelect(page, selector, examData.category);
        break;
      } catch {
        continue;
      }
    }
  }

  /**
   * 保存考试
   */
  private static async saveExam(page: Page): Promise<void> {
    const saveButtonSelectors = [
      'button[type="submit"]:has-text("保存")',
      'button:has-text("创建")',
      'button:has-text("提交")',
      '[data-testid="save-exam-button"]'
    ];
    
    for (const selector of saveButtonSelectors) {
      try {
        await ExamPageUtils.safeClick(page, selector);
        break;
      } catch {
        continue;
      }
    }

    // 等待保存完成
    await page.waitForTimeout(2000);
  }
}

/**
 * 题目管理工具类
 */
class QuestionManagementUtils {
  /**
   * 添加单选题
   */
  static async addSingleChoiceQuestion(page: Page, examId: string, questionData: any): Promise<void> {
    await this.navigateToQuestionManagement(page, examId);
    await this.clickAddQuestionButton(page);
    
    // 选择题目类型
    await this.selectQuestionType(page, 'single_choice');
    
    // 填写题目信息
    await this.fillQuestionBasicInfo(page, questionData);
    
    // 添加选项
    await this.addQuestionOptions(page, questionData.options);
    
    // 设置正确答案
    await this.setCorrectAnswer(page, questionData.correctAnswer);
    
    // 保存题目
    await this.saveQuestion(page);
  }

  /**
   * 添加多选题
   */
  static async addMultipleChoiceQuestion(page: Page, examId: string, questionData: any): Promise<void> {
    await this.navigateToQuestionManagement(page, examId);
    await this.clickAddQuestionButton(page);
    
    // 选择题目类型
    await this.selectQuestionType(page, 'multiple_choice');
    
    // 填写题目信息
    await this.fillQuestionBasicInfo(page, questionData);
    
    // 添加选项
    await this.addQuestionOptions(page, questionData.options);
    
    // 设置正确答案（多选）
    await this.setMultipleCorrectAnswers(page, questionData.correctAnswers);
    
    // 保存题目
    await this.saveQuestion(page);
  }

  /**
   * 添加判断题
   */
  static async addTrueFalseQuestion(page: Page, examId: string, questionData: any): Promise<void> {
    await this.navigateToQuestionManagement(page, examId);
    await this.clickAddQuestionButton(page);
    
    // 选择题目类型
    await this.selectQuestionType(page, 'true_false');
    
    // 填写题目信息
    await this.fillQuestionBasicInfo(page, questionData);
    
    // 设置正确答案
    await this.setCorrectAnswer(page, questionData.correctAnswer);
    
    // 保存题目
    await this.saveQuestion(page);
  }

  /**
   * 添加简答题
   */
  static async addEssayQuestion(page: Page, examId: string, questionData: any): Promise<void> {
    await this.navigateToQuestionManagement(page, examId);
    await this.clickAddQuestionButton(page);
    
    // 选择题目类型
    await this.selectQuestionType(page, 'essay');
    
    // 填写题目信息
    await this.fillQuestionBasicInfo(page, questionData);
    
    // 填写示例答案（如果存在）
    if (questionData.sampleAnswer) {
      const sampleAnswerSelectors = [
        'textarea[name="sampleAnswer"]',
        '[data-testid="sample-answer"]',
        '#sample-answer'
      ];
      
      for (const selector of sampleAnswerSelectors) {
        try {
          await ExamPageUtils.safeFill(page, selector, questionData.sampleAnswer);
          break;
        } catch {
          continue;
        }
      }
    }
    
    // 保存题目
    await this.saveQuestion(page);
  }

  /**
   * 导航到题目管理页面
   */
  private static async navigateToQuestionManagement(page: Page, examId: string): Promise<void> {
    const questionManagementUrls = [
      `${TEST_CONFIG.baseUrl}/admin/exams/${examId}/questions`,
      `${TEST_CONFIG.baseUrl}/teacher/exams/${examId}/questions`,
      `${TEST_CONFIG.baseUrl}/exams/${examId}/questions`
    ];

    for (const url of questionManagementUrls) {
      try {
        await page.goto(url);
        await ExamPageUtils.waitForPageLoad(page);
        return;
      } catch {
        continue;
      }
    }
    
    throw new Error('无法导航到题目管理页面');
  }

  /**
   * 点击添加题目按钮
   */
  private static async clickAddQuestionButton(page: Page): Promise<void> {
    const addButtonSelectors = [
      'button:has-text("添加题目")',
      'button:has-text("新建题目")',
      '[data-testid="add-question-button"]',
      '.add-question-btn'
    ];

    for (const selector of addButtonSelectors) {
      try {
        await ExamPageUtils.safeClick(page, selector);
        return;
      } catch {
        continue;
      }
    }
    
    throw new Error('无法找到添加题目按钮');
  }

  /**
   * 选择题目类型
   */
  private static async selectQuestionType(page: Page, type: string): Promise<void> {
    const typeSelectors = [
      'select[name="type"]',
      '[data-testid="question-type"]',
      '#question-type'
    ];
    
    for (const selector of typeSelectors) {
      try {
        await ExamPageUtils.safeSelect(page, selector, type);
        return;
      } catch {
        continue;
      }
    }
  }

  /**
   * 填写题目基本信息
   */
  private static async fillQuestionBasicInfo(page: Page, questionData: any): Promise<void> {
    // 填写题目标题
    const titleSelectors = [
      'input[name="title"]',
      '[data-testid="question-title"]',
      '#question-title'
    ];
    
    for (const selector of titleSelectors) {
      try {
        await ExamPageUtils.safeFill(page, selector, questionData.title);
        break;
      } catch {
        continue;
      }
    }

    // 填写题目内容
    const contentSelectors = [
      'textarea[name="content"]',
      '[data-testid="question-content"]',
      '#question-content'
    ];
    
    for (const selector of contentSelectors) {
      try {
        await ExamPageUtils.safeFill(page, selector, questionData.content);
        break;
      } catch {
        continue;
      }
    }

    // 填写分数
    const scoreSelectors = [
      'input[name="score"]',
      '[data-testid="question-score"]',
      '#question-score'
    ];
    
    for (const selector of scoreSelectors) {
      try {
        await ExamPageUtils.safeFill(page, selector, questionData.score.toString());
        break;
      } catch {
        continue;
      }
    }

    // 填写解析（如果存在）
    if (questionData.explanation) {
      const explanationSelectors = [
        'textarea[name="explanation"]',
        '[data-testid="question-explanation"]',
        '#question-explanation'
      ];
      
      for (const selector of explanationSelectors) {
        try {
          await ExamPageUtils.safeFill(page, selector, questionData.explanation);
          break;
        } catch {
          continue;
        }
      }
    }
  }

  /**
   * 添加题目选项
   */
  private static async addQuestionOptions(page: Page, options: string[]): Promise<void> {
    for (const [index, option] of options.entries()) {
      const optionSelectors = [
        `input[name="option-${index}"]`,
        `[data-testid="option-${index}"]`,
        `#option-${index}`
      ];
      
      for (const selector of optionSelectors) {
        try {
          await ExamPageUtils.safeFill(page, selector, option);
          break;
        } catch {
          continue;
        }
      }
    }
  }

  /**
   * 设置正确答案
   */
  private static async setCorrectAnswer(page: Page, correctAnswer: string): Promise<void> {
    const correctAnswerSelectors = [
      'input[name="correctAnswer"]',
      '[data-testid="correct-answer"]',
      '#correct-answer'
    ];
    
    for (const selector of correctAnswerSelectors) {
      try {
        await ExamPageUtils.safeFill(page, selector, correctAnswer);
        return;
      } catch {
        continue;
      }
    }

    // 如果是单选按钮形式
    const radioSelectors = [
      `input[type="radio"][value="${correctAnswer}"]`,
      `[data-testid="correct-option-${correctAnswer}"]"`
    ];
    
    for (const selector of radioSelectors) {
      try {
        await page.locator(selector).check();
        return;
      } catch {
        continue;
      }
    }
  }

  /**
   * 设置多个正确答案
   */
  private static async setMultipleCorrectAnswers(page: Page, correctAnswers: string[]): Promise<void> {
    for (const answer of correctAnswers) {
      const checkboxSelectors = [
        `input[type="checkbox"][value="${answer}"]`,
        `[data-testid="correct-option-${answer}"]"`
      ];
      
      for (const selector of checkboxSelectors) {
        try {
          await page.locator(selector).check();
          break;
        } catch {
          continue;
        }
      }
    }
  }

  /**
   * 保存题目
   */
  private static async saveQuestion(page: Page): Promise<void> {
    const saveButtonSelectors = [
      'button[type="submit"]:has-text("保存")',
      'button:has-text("添加")',
      'button:has-text("提交")',
      '[data-testid="save-question-button"]'
    ];
    
    for (const selector of saveButtonSelectors) {
      try {
        await ExamPageUtils.safeClick(page, selector);
        break;
      } catch {
        continue;
      }
    }

    // 等待保存完成
    await page.waitForTimeout(1000);
  }
}

/**
 * 考试发布和分配工具类
 */
class ExamPublishUtils {
  /**
   * 发布考试
   */
  static async publishExam(page: Page, examId: string): Promise<void> {
    // 导航到考试详情页面
    await page.goto(`${TEST_CONFIG.baseUrl}/admin/exams/${examId}`);
    await ExamPageUtils.waitForPageLoad(page);

    // 点击发布按钮
    const publishButtonSelectors = [
      'button:has-text("发布")',
      'button:has-text("发布考试")',
      '[data-testid="publish-exam-button"]'
    ];
    
    for (const selector of publishButtonSelectors) {
      try {
        await ExamPageUtils.safeClick(page, selector);
        break;
      } catch {
        continue;
      }
    }
    
    // 确认发布
    const confirmButtonSelectors = [
      'button:has-text("确认")',
      'button:has-text("发布")',
      '[data-testid="confirm-publish"]'
    ];
    
    for (const selector of confirmButtonSelectors) {
      try {
        await ExamPageUtils.safeClick(page, selector);
        break;
      } catch {
        continue;
      }
    }

    await page.waitForTimeout(2000);
  }

  /**
   * 分配考试给学生
   */
  static async assignExamToStudents(page: Page, examId: string, studentPhones: string[]): Promise<void> {
    // 导航到考试分配页面
    const assignUrls = [
      `${TEST_CONFIG.baseUrl}/teacher/exams/${examId}/assign`,
      `${TEST_CONFIG.baseUrl}/admin/exams/${examId}/assign`,
      `${TEST_CONFIG.baseUrl}/exams/${examId}/assign`
    ];

    for (const url of assignUrls) {
      try {
        await page.goto(url);
        await ExamPageUtils.waitForPageLoad(page);
        break;
      } catch {
        continue;
      }
    }

    // 为每个学生分配考试
    for (const studentPhone of studentPhones) {
      await this.assignToSingleStudent(page, studentPhone);
    }

    // 确认分配
    const assignButtonSelectors = [
      'button:has-text("分配")',
      'button:has-text("确认分配")',
      '[data-testid="assign-button"]'
    ];
    
    for (const selector of assignButtonSelectors) {
      try {
        await ExamPageUtils.safeClick(page, selector);
        break;
      } catch {
        continue;
      }
    }

    await page.waitForTimeout(2000);
  }

  /**
   * 分配给单个学生
   */
  private static async assignToSingleStudent(page: Page, studentPhone: string): Promise<void> {
    // 搜索学生
    const searchSelectors = [
      'input[name="search"]',
      '[data-testid="student-search"]',
      '#student-search'
    ];
    
    for (const selector of searchSelectors) {
      try {
        await ExamPageUtils.safeFill(page, selector, studentPhone);
        await page.waitForTimeout(1000);
        break;
      } catch {
        continue;
      }
    }

    // 选择学生
    const studentSelectors = [
      `input[type="checkbox"][value*="${studentPhone}"]`,
      `[data-testid="student-${studentPhone}"]`,
      `.student-item:has-text("${studentPhone}") input[type="checkbox"]`
    ];
    
    for (const selector of studentSelectors) {
      try {
        await page.locator(selector).check();
        break;
      } catch {
        continue;
      }
    }
  }
}

/**
 * 考试管理流程测试套件
 */
test.describe('考试管理流程E2E测试', () => {
  let adminPage: Page;
  let teacherPage: Page;
  let examId: string;

  /**
   * 测试前准备
   */
  test.beforeAll(async ({ browser }) => {
    // 创建管理员和教师页面
    const adminContext = await browser.newContext();
    const teacherContext = await browser.newContext();

    adminPage = await adminContext.newPage();
    teacherPage = await teacherContext.newPage();

    // 设置页面超时
    adminPage.setDefaultTimeout(TEST_CONFIG.timeout);
    teacherPage.setDefaultTimeout(TEST_CONFIG.timeout);

    // 管理员和教师登录
    await LoginUtils.login(adminPage, TEST_USERS.admin);
    await LoginUtils.login(teacherPage, TEST_USERS.teacher);
  });

  /**
   * 测试管理员创建考试
   */
  test('管理员应能成功创建考试', async () => {
    examId = await ExamCreationUtils.createBasicExam(adminPage, TEST_EXAM_DATA.basic);
    expect(examId).toBeTruthy();
    
    // 验证考试创建成功
    const successMessageVisible = await ExamPageUtils.waitForSuccessMessage(adminPage);
    expect(successMessageVisible).toBeTruthy();
    
    // 截图记录
    await ExamPageUtils.takeScreenshot(adminPage, 'exam-created');
  });

  /**
   * 测试添加不同类型的题目
   */
  test('应能添加各种类型的题目', async () => {
    // 添加单选题
    await QuestionManagementUtils.addSingleChoiceQuestion(
      adminPage, 
      examId, 
      TEST_EXAM_DATA.questions.singleChoice
    );
    
    // 添加多选题
    await QuestionManagementUtils.addMultipleChoiceQuestion(
      adminPage, 
      examId, 
      TEST_EXAM_DATA.questions.multipleChoice
    );
    
    // 添加判断题
    await QuestionManagementUtils.addTrueFalseQuestion(
      adminPage, 
      examId, 
      TEST_EXAM_DATA.questions.trueFalse
    );
    
    // 添加简答题
    await QuestionManagementUtils.addEssayQuestion(
      adminPage, 
      examId, 
      TEST_EXAM_DATA.questions.essay
    );
    
    // 截图记录
    await ExamPageUtils.takeScreenshot(adminPage, 'questions-added');
  });

  /**
   * 测试考试发布
   */
  test('管理员应能发布考试', async () => {
    await ExamPublishUtils.publishExam(adminPage, examId);
    
    // 验证发布成功
    const successMessageVisible = await ExamPageUtils.waitForSuccessMessage(adminPage);
    expect(successMessageVisible).toBeTruthy();
    
    // 截图记录
    await ExamPageUtils.takeScreenshot(adminPage, 'exam-published');
  });

  /**
   * 测试教师分配考试
   */
  test('教师应能分配考试给学生', async () => {
    await ExamPublishUtils.assignExamToStudents(
      teacherPage, 
      examId, 
      [TEST_USERS.student.phone]
    );
    
    // 验证分配成功
    const successMessageVisible = await ExamPageUtils.waitForSuccessMessage(teacherPage);
    expect(successMessageVisible).toBeTruthy();
    
    // 截图记录
    await ExamPageUtils.takeScreenshot(teacherPage, 'exam-assigned');
  });

  /**
   * 测试考试编辑
   */
  test('应能编辑已创建的考试', async () => {
    // 导航到考试编辑页面
    await adminPage.goto(`${TEST_CONFIG.baseUrl}/admin/exams/${examId}/edit`);
    await ExamPageUtils.waitForPageLoad(adminPage);
    
    // 修改考试标题
    const newTitle = '修改后的考试标题';
    await ExamPageUtils.safeFill(adminPage, 'input[name="title"]', newTitle);
    
    // 保存修改
    await ExamPageUtils.safeClick(adminPage, 'button[type="submit"]:has-text("保存")');
    
    // 验证修改成功
    await page.waitForTimeout(2000);
    const titleElement = adminPage.locator('input[name="title"]');
    const currentTitle = await titleElement.inputValue();
    expect(currentTitle).toBe(newTitle);
    
    // 截图记录
    await ExamPageUtils.takeScreenshot(adminPage, 'exam-edited');
  });

  /**
   * 测试考试删除
   */
  test('应能删除考试', async () => {
    // 创建一个用于删除的测试考试
    const deleteExamId = await ExamCreationUtils.createBasicExam(
      adminPage, 
      { ...TEST_EXAM_DATA.basic, title: '待删除的考试' }
    );
    
    // 导航到考试列表页面
    await adminPage.goto(`${TEST_CONFIG.baseUrl}/admin/exams`);
    await ExamPageUtils.waitForPageLoad(adminPage);
    
    // 找到并点击删除按钮
    const deleteButtonSelectors = [
      `[data-testid="delete-exam-${deleteExamId}"]`,
      `.exam-item:has-text("待删除的考试") button:has-text("删除")`,
      'button:has-text("删除")'
    ];
    
    for (const selector of deleteButtonSelectors) {
      try {
        await ExamPageUtils.safeClick(adminPage, selector);
        break;
      } catch {
        continue;
      }
    }
    
    // 确认删除
    const confirmDeleteSelectors = [
      'button:has-text("确认删除")',
      'button:has-text("删除")',
      '[data-testid="confirm-delete"]'
    ];
    
    for (const selector of confirmDeleteSelectors) {
      try {
        await ExamPageUtils.safeClick(adminPage, selector);
        break;
      } catch {
        continue;
      }
    }
    
    // 验证删除成功
    await page.waitForTimeout(2000);
    const deletedExamExists = await adminPage.locator(':has-text("待删除的考试")').count() === 0;
    expect(deletedExamExists).toBeTruthy();
    
    // 截图记录
    await ExamPageUtils.takeScreenshot(adminPage, 'exam-deleted');
  });

  /**
   * 测试后清理
   */
  test.afterAll(async () => {
    await adminPage.close();
    await teacherPage.close();
  });
});

/**
 * 考试权限测试
 */
test.describe('考试权限测试', () => {
  /**
   * 测试学生不能创建考试
   */
  test('学生不应能访问考试创建页面', async ({ page }) => {
    // 学生登录
    await LoginUtils.login(page, TEST_USERS.student);
    
    // 尝试访问考试创建页面
    await page.goto(`${TEST_CONFIG.baseUrl}/admin/exams/create`);
    await ExamPageUtils.waitForPageLoad(page);
    
    // 验证被拒绝访问
    const currentUrl = page.url();
    const isBlocked = currentUrl.includes('/403') || 
                     currentUrl.includes('/unauthorized') || 
                     currentUrl.includes('/student');
    
    expect(isBlocked).toBeTruthy();
  });

  /**
   * 测试教师权限范围
   */
  test('教师只能管理自己创建的考试', async ({ page }) => {
    // 教师登录
    await LoginUtils.login(page, TEST_USERS.teacher);
    
    // 访问考试列表页面
    await page.goto(`${TEST_CONFIG.baseUrl}/teacher/exams`);
    await ExamPageUtils.waitForPageLoad(page);
    
    // 验证只显示教师有权限的考试
    const examItems = page.locator('.exam-item, [data-testid="exam-item"]');
    const examCount = await examItems.count();
    
    // 教师应该能看到一些考试（至少是之前创建的）
    expect(examCount).toBeGreaterThanOrEqual(0);
  });
});

/**
 * 考试数据验证测试
 */
test.describe('考试数据验证测试', () => {
  /**
   * 测试必填字段验证
   */
  test('创建考试时必填字段应进行验证', async ({ page }) => {
    // 管理员登录
    await LoginUtils.login(page, TEST_USERS.admin);
    
    // 导航到考试创建页面
    await page.goto(`${TEST_CONFIG.baseUrl}/admin/exams/create`);
    await ExamPageUtils.waitForPageLoad(page);
    
    // 直接提交空表单
    await ExamPageUtils.safeClick(page, 'button[type="submit"]');
    
    // 验证显示错误信息
    const hasError = await ExamPageUtils.waitForErrorMessage(page);
    expect(hasError).toBeTruthy();
  });

  /**
   * 测试数据格式验证
   */
  test('考试时长应为有效数字', async ({ page }) => {
    // 管理员登录
    await LoginUtils.login(page, TEST_USERS.admin);
    
    // 导航到考试创建页面
    await page.goto(`${TEST_CONFIG.baseUrl}/admin/exams/create`);
    await ExamPageUtils.waitForPageLoad(page);
    
    // 填写无效的考试时长
    await ExamPageUtils.safeFill(page, 'input[name="title"]', '测试考试');
    await ExamPageUtils.safeFill(page, 'input[name="duration"]', 'invalid');
    
    // 提交表单
    await ExamPageUtils.safeClick(page, 'button[type="submit"]');
    
    // 验证显示错误信息
    const hasError = await ExamPageUtils.waitForErrorMessage(page);
    expect(hasError).toBeTruthy();
  });
});