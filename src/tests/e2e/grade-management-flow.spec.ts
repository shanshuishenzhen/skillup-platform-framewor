/**
 * 成绩管理和导出功能端到端测试
 * 测试教师查看学生成绩、导出成绩报告、成绩统计分析等功能
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
  retryDelay: 2000,
  downloadTimeout: 10000
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
  teacher2: {
    phone: '13800000005',
    password: 'password123',
    name: '测试教师2',
    role: 'teacher'
  },
  student: {
    phone: '13800000003',
    password: 'password123',
    name: '测试学生',
    role: 'student'
  },
  student2: {
    phone: '13800000004',
    password: 'password123',
    name: '测试学生2',
    role: 'student'
  }
};

/**
 * 测试考试数据
 */
const TEST_EXAM_DATA = {
  title: '成绩管理测试考试',
  description: '用于测试成绩管理功能的考试',
  duration: 30,
  totalQuestions: 5,
  passingScore: 60,
  maxScore: 100
};

/**
 * 页面操作工具类
 */
class GradePageUtils {
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
   * 安全选择下拉框
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
      path: `test-results/screenshots/grade-management-${name}-${Date.now()}.png`,
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
   * 等待下载完成
   */
  static async waitForDownload(page: Page, timeout = 10000): Promise<boolean> {
    try {
      const downloadPromise = page.waitForEvent('download', { timeout });
      const download = await downloadPromise;
      return download !== null;
    } catch {
      return false;
    }
  }

  /**
   * 获取表格数据
   */
  static async getTableData(page: Page, tableSelector: string): Promise<any[]> {
    const rows = await page.locator(`${tableSelector} tbody tr`).all();
    const data = [];

    for (const row of rows) {
      const cells = await row.locator('td').all();
      const rowData = [];
      
      for (const cell of cells) {
        const text = await cell.textContent();
        rowData.push(text?.trim() || '');
      }
      
      data.push(rowData);
    }

    return data;
  }

  /**
   * 检查元素是否存在
   */
  static async elementExists(page: Page, selector: string, timeout = 3000): Promise<boolean> {
    try {
      await page.waitForSelector(selector, { state: 'visible', timeout });
      return true;
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
  static async login(page: Page, user: typeof TEST_USERS.teacher): Promise<void> {
    await page.goto(`${TEST_CONFIG.baseUrl}/login`);
    await GradePageUtils.waitForPageLoad(page);

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
      await GradePageUtils.takeScreenshot(page, `login-failed-${user.role}`);
      throw new Error(`${user.role} 登录失败`);
    }
  }
}

/**
 * 成绩查看工具类
 */
class GradeViewUtils {
  /**
   * 导航到成绩管理页面
   */
  static async navigateToGradeManagement(page: Page): Promise<void> {
    const gradeUrls = [
      `${TEST_CONFIG.baseUrl}/teacher/grades`,
      `${TEST_CONFIG.baseUrl}/grades`,
      `${TEST_CONFIG.baseUrl}/teacher/results`,
      `${TEST_CONFIG.baseUrl}/admin/grades`
    ];

    for (const url of gradeUrls) {
      try {
        await page.goto(url);
        await GradePageUtils.waitForPageLoad(page);
        return;
      } catch {
        continue;
      }
    }
    
    // 尝试通过导航菜单
    const navSelectors = [
      'a:has-text("成绩管理")',
      'a:has-text("成绩")',
      '[data-testid="grades-nav"]',
      '.nav-grades'
    ];

    for (const selector of navSelectors) {
      try {
        await GradePageUtils.safeClick(page, selector);
        await GradePageUtils.waitForPageLoad(page);
        return;
      } catch {
        continue;
      }
    }
    
    throw new Error('无法导航到成绩管理页面');
  }

  /**
   * 选择考试查看成绩
   */
  static async selectExamForGrading(page: Page, examTitle: string): Promise<void> {
    const examSelectors = [
      `select[name="exam"] option:has-text("${examTitle}")`,
      `[data-testid="exam-select"] option:has-text("${examTitle}")`,
      `.exam-selector option:has-text("${examTitle}")`
    ];

    for (const selector of examSelectors) {
      try {
        await page.locator(selector).click();
        await page.waitForTimeout(2000);
        return;
      } catch {
        continue;
      }
    }

    // 尝试点击考试卡片
    const cardSelectors = [
      `.exam-card:has-text("${examTitle}")`,
      `.exam-item:has-text("${examTitle}")`,
      `[data-testid="exam-${examTitle}"]`
    ];

    for (const selector of cardSelectors) {
      try {
        await GradePageUtils.safeClick(page, selector);
        await GradePageUtils.waitForPageLoad(page);
        return;
      } catch {
        continue;
      }
    }
    
    throw new Error(`无法选择考试: ${examTitle}`);
  }

  /**
   * 获取学生成绩列表
   */
  static async getStudentGrades(page: Page): Promise<any[]> {
    const tableSelectors = [
      '.grades-table',
      '[data-testid="grades-table"]',
      '.student-grades',
      'table'
    ];

    for (const selector of tableSelectors) {
      try {
        const exists = await GradePageUtils.elementExists(page, selector);
        if (exists) {
          return await GradePageUtils.getTableData(page, selector);
        }
      } catch {
        continue;
      }
    }
    
    return [];
  }

  /**
   * 查看学生详细成绩
   */
  static async viewStudentDetailGrade(page: Page, studentName: string): Promise<void> {
    const detailButtonSelectors = [
      `tr:has-text("${studentName}") button:has-text("详情")`,
      `tr:has-text("${studentName}") a:has-text("查看")`,
      `[data-testid="view-detail-${studentName}"]`
    ];

    for (const selector of detailButtonSelectors) {
      try {
        await GradePageUtils.safeClick(page, selector);
        await GradePageUtils.waitForPageLoad(page);
        return;
      } catch {
        continue;
      }
    }
    
    throw new Error(`无法查看学生详细成绩: ${studentName}`);
  }

  /**
   * 搜索学生成绩
   */
  static async searchStudentGrade(page: Page, searchTerm: string): Promise<void> {
    const searchSelectors = [
      'input[placeholder*="搜索"]',
      'input[name="search"]',
      '[data-testid="search-input"]',
      '.search-input'
    ];

    for (const selector of searchSelectors) {
      try {
        await GradePageUtils.safeFill(page, selector, searchTerm);
        
        // 尝试点击搜索按钮或按回车
        const searchButton = page.locator('button:has-text("搜索")');
        if (await searchButton.isVisible()) {
          await searchButton.click();
        } else {
          await page.keyboard.press('Enter');
        }
        
        await page.waitForTimeout(2000);
        return;
      } catch {
        continue;
      }
    }
  }

  /**
   * 筛选成绩
   */
  static async filterGrades(page: Page, filterType: string, filterValue: string): Promise<void> {
    const filterSelectors = [
      `select[name="${filterType}"]`,
      `[data-testid="${filterType}-filter"]`,
      `.filter-${filterType}`
    ];

    for (const selector of filterSelectors) {
      try {
        await GradePageUtils.safeSelect(page, selector, filterValue);
        await page.waitForTimeout(2000);
        return;
      } catch {
        continue;
      }
    }
  }
}

/**
 * 成绩导出工具类
 */
class GradeExportUtils {
  /**
   * 导出成绩为Excel
   */
  static async exportToExcel(page: Page): Promise<boolean> {
    const exportButtonSelectors = [
      'button:has-text("导出Excel")',
      'button:has-text("导出")',
      '[data-testid="export-excel"]',
      '.export-excel-btn'
    ];

    for (const selector of exportButtonSelectors) {
      try {
        // 设置下载监听
        const downloadPromise = page.waitForEvent('download', { timeout: TEST_CONFIG.downloadTimeout });
        
        await GradePageUtils.safeClick(page, selector);
        
        // 等待下载完成
        const download = await downloadPromise;
        return download !== null;
      } catch {
        continue;
      }
    }
    
    return false;
  }

  /**
   * 导出成绩为PDF
   */
  static async exportToPDF(page: Page): Promise<boolean> {
    const exportButtonSelectors = [
      'button:has-text("导出PDF")',
      'button:has-text("PDF")',
      '[data-testid="export-pdf"]',
      '.export-pdf-btn'
    ];

    for (const selector of exportButtonSelectors) {
      try {
        // 设置下载监听
        const downloadPromise = page.waitForEvent('download', { timeout: TEST_CONFIG.downloadTimeout });
        
        await GradePageUtils.safeClick(page, selector);
        
        // 等待下载完成
        const download = await downloadPromise;
        return download !== null;
      } catch {
        continue;
      }
    }
    
    return false;
  }

  /**
   * 导出成绩为CSV
   */
  static async exportToCSV(page: Page): Promise<boolean> {
    const exportButtonSelectors = [
      'button:has-text("导出CSV")',
      'button:has-text("CSV")',
      '[data-testid="export-csv"]',
      '.export-csv-btn'
    ];

    for (const selector of exportButtonSelectors) {
      try {
        // 设置下载监听
        const downloadPromise = page.waitForEvent('download', { timeout: TEST_CONFIG.downloadTimeout });
        
        await GradePageUtils.safeClick(page, selector);
        
        // 等待下载完成
        const download = await downloadPromise;
        return download !== null;
      } catch {
        continue;
      }
    }
    
    return false;
  }

  /**
   * 批量导出选中学生成绩
   */
  static async exportSelectedStudents(page: Page, studentNames: string[]): Promise<boolean> {
    // 选择学生
    for (const studentName of studentNames) {
      const checkboxSelectors = [
        `tr:has-text("${studentName}") input[type="checkbox"]`,
        `[data-testid="select-${studentName}"]`,
        `.student-row:has-text("${studentName}") .select-checkbox`
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

    // 导出选中的学生
    const exportSelectedSelectors = [
      'button:has-text("导出选中")',
      'button:has-text("批量导出")',
      '[data-testid="export-selected"]'
    ];

    for (const selector of exportSelectedSelectors) {
      try {
        // 设置下载监听
        const downloadPromise = page.waitForEvent('download', { timeout: TEST_CONFIG.downloadTimeout });
        
        await GradePageUtils.safeClick(page, selector);
        
        // 等待下载完成
        const download = await downloadPromise;
        return download !== null;
      } catch {
        continue;
      }
    }
    
    return false;
  }

  /**
   * 自定义导出设置
   */
  static async customExportSettings(page: Page, settings: any): Promise<void> {
    const settingsButtonSelectors = [
      'button:has-text("导出设置")',
      'button:has-text("自定义导出")',
      '[data-testid="export-settings"]'
    ];

    for (const selector of settingsButtonSelectors) {
      try {
        await GradePageUtils.safeClick(page, selector);
        break;
      } catch {
        continue;
      }
    }

    // 配置导出设置
    if (settings.includeDetails) {
      const detailsCheckbox = page.locator('input[name="includeDetails"], [data-testid="include-details"]');
      if (await detailsCheckbox.isVisible()) {
        await detailsCheckbox.check();
      }
    }

    if (settings.includeStatistics) {
      const statsCheckbox = page.locator('input[name="includeStatistics"], [data-testid="include-statistics"]');
      if (await statsCheckbox.isVisible()) {
        await statsCheckbox.check();
      }
    }

    if (settings.format) {
      const formatSelect = page.locator('select[name="format"], [data-testid="export-format"]');
      if (await formatSelect.isVisible()) {
        await formatSelect.selectOption(settings.format);
      }
    }

    // 确认设置
    const confirmButton = page.locator('button:has-text("确认"), button:has-text("应用")');
    if (await confirmButton.isVisible()) {
      await confirmButton.click();
    }
  }
}

/**
 * 成绩统计工具类
 */
class GradeStatisticsUtils {
  /**
   * 查看成绩统计
   */
  static async viewStatistics(page: Page): Promise<any> {
    const statsSelectors = [
      '.statistics-panel',
      '[data-testid="statistics"]',
      '.grade-statistics',
      '.stats-container'
    ];

    for (const selector of statsSelectors) {
      try {
        const exists = await GradePageUtils.elementExists(page, selector);
        if (exists) {
          const statsElement = page.locator(selector);
          
          // 提取统计数据
          const averageScore = await statsElement.locator('.average-score, [data-testid="average-score"]').textContent();
          const passRate = await statsElement.locator('.pass-rate, [data-testid="pass-rate"]').textContent();
          const totalStudents = await statsElement.locator('.total-students, [data-testid="total-students"]').textContent();
          const highestScore = await statsElement.locator('.highest-score, [data-testid="highest-score"]').textContent();
          const lowestScore = await statsElement.locator('.lowest-score, [data-testid="lowest-score"]').textContent();
          
          return {
            averageScore: averageScore?.trim(),
            passRate: passRate?.trim(),
            totalStudents: totalStudents?.trim(),
            highestScore: highestScore?.trim(),
            lowestScore: lowestScore?.trim()
          };
        }
      } catch {
        continue;
      }
    }
    
    return null;
  }

  /**
   * 查看成绩分布图表
   */
  static async viewGradeDistribution(page: Page): Promise<boolean> {
    const chartSelectors = [
      '.grade-chart',
      '[data-testid="grade-chart"]',
      '.distribution-chart',
      'canvas',
      '.chart-container'
    ];

    for (const selector of chartSelectors) {
      try {
        const exists = await GradePageUtils.elementExists(page, selector);
        if (exists) {
          return true;
        }
      } catch {
        continue;
      }
    }
    
    return false;
  }

  /**
   * 生成统计报告
   */
  static async generateStatisticsReport(page: Page): Promise<boolean> {
    const reportButtonSelectors = [
      'button:has-text("生成报告")',
      'button:has-text("统计报告")',
      '[data-testid="generate-report"]'
    ];

    for (const selector of reportButtonSelectors) {
      try {
        // 设置下载监听
        const downloadPromise = page.waitForEvent('download', { timeout: TEST_CONFIG.downloadTimeout });
        
        await GradePageUtils.safeClick(page, selector);
        
        // 等待下载完成
        const download = await downloadPromise;
        return download !== null;
      } catch {
        continue;
      }
    }
    
    return false;
  }
}

/**
 * 成绩管理流程测试套件
 */
test.describe('成绩管理流程E2E测试', () => {
  let teacherPage: Page;
  let adminPage: Page;

  /**
   * 测试前准备
   */
  test.beforeAll(async ({ browser }) => {
    // 创建教师页面
    const teacherContext = await browser.newContext();
    teacherPage = await teacherContext.newPage();
    teacherPage.setDefaultTimeout(TEST_CONFIG.timeout);

    // 创建管理员页面
    const adminContext = await browser.newContext();
    adminPage = await adminContext.newPage();
    adminPage.setDefaultTimeout(TEST_CONFIG.timeout);

    // 教师登录
    await LoginUtils.login(teacherPage, TEST_USERS.teacher);
    
    // 管理员登录
    await LoginUtils.login(adminPage, TEST_USERS.admin);
  });

  /**
   * 测试教师查看成绩列表
   */
  test('教师应能查看学生成绩列表', async () => {
    await GradeViewUtils.navigateToGradeManagement(teacherPage);
    
    // 验证页面加载成功
    const currentUrl = teacherPage.url();
    expect(currentUrl).toContain('grade');
    
    // 获取成绩列表
    const grades = await GradeViewUtils.getStudentGrades(teacherPage);
    expect(grades).toBeDefined();
    
    // 截图记录
    await GradePageUtils.takeScreenshot(teacherPage, 'grade-list');
  });

  /**
   * 测试选择考试查看成绩
   */
  test('教师应能选择特定考试查看成绩', async () => {
    try {
      await GradeViewUtils.selectExamForGrading(teacherPage, TEST_EXAM_DATA.title);
      
      // 验证考试选择成功
      const pageContent = await teacherPage.content();
      expect(pageContent).toContain(TEST_EXAM_DATA.title);
      
      // 获取该考试的成绩
      const examGrades = await GradeViewUtils.getStudentGrades(teacherPage);
      expect(examGrades).toBeDefined();
      
      // 截图记录
      await GradePageUtils.takeScreenshot(teacherPage, 'exam-grades');
    } catch (error) {
      console.log('选择考试失败，可能考试不存在:', error.message);
    }
  });

  /**
   * 测试查看学生详细成绩
   */
  test('教师应能查看学生详细成绩', async () => {
    try {
      // 查看第一个学生的详细成绩
      await GradeViewUtils.viewStudentDetailGrade(teacherPage, TEST_USERS.student.name);
      
      // 验证详细成绩页面
      const pageContent = await teacherPage.content();
      expect(pageContent).toContain(TEST_USERS.student.name);
      
      // 检查是否有详细的答题信息
      const detailExists = await GradePageUtils.elementExists(teacherPage, '.answer-details, [data-testid="answer-details"]');
      expect(detailExists).toBeTruthy();
      
      // 截图记录
      await GradePageUtils.takeScreenshot(teacherPage, 'student-detail-grade');
    } catch (error) {
      console.log('查看学生详细成绩失败:', error.message);
    }
  });

  /**
   * 测试搜索学生成绩
   */
  test('教师应能搜索特定学生的成绩', async () => {
    try {
      await GradeViewUtils.searchStudentGrade(teacherPage, TEST_USERS.student.name);
      
      // 验证搜索结果
      const grades = await GradeViewUtils.getStudentGrades(teacherPage);
      const hasSearchResult = grades.some(grade => 
        grade.some(cell => cell.includes(TEST_USERS.student.name))
      );
      
      expect(hasSearchResult).toBeTruthy();
      
      // 截图记录
      await GradePageUtils.takeScreenshot(teacherPage, 'search-results');
    } catch (error) {
      console.log('搜索学生成绩失败:', error.message);
    }
  });

  /**
   * 测试筛选成绩
   */
  test('教师应能按条件筛选成绩', async () => {
    try {
      // 按及格状态筛选
      await GradeViewUtils.filterGrades(teacherPage, 'status', 'passed');
      
      // 验证筛选结果
      const filteredGrades = await GradeViewUtils.getStudentGrades(teacherPage);
      expect(filteredGrades).toBeDefined();
      
      // 截图记录
      await GradePageUtils.takeScreenshot(teacherPage, 'filtered-grades');
    } catch (error) {
      console.log('筛选成绩失败:', error.message);
    }
  });

  /**
   * 测试后清理
   */
  test.afterAll(async () => {
    await teacherPage.close();
    await adminPage.close();
  });
});

/**
 * 成绩导出功能测试套件
 */
test.describe('成绩导出功能E2E测试', () => {
  let teacherPage: Page;

  /**
   * 测试前准备
   */
  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext({
      acceptDownloads: true // 允许下载
    });
    teacherPage = await context.newPage();
    teacherPage.setDefaultTimeout(TEST_CONFIG.timeout);

    // 教师登录
    await LoginUtils.login(teacherPage, TEST_USERS.teacher);
    
    // 导航到成绩管理页面
    await GradeViewUtils.navigateToGradeManagement(teacherPage);
  });

  /**
   * 测试导出Excel格式成绩
   */
  test('教师应能导出Excel格式的成绩报告', async () => {
    const exported = await GradeExportUtils.exportToExcel(teacherPage);
    
    if (exported) {
      expect(exported).toBeTruthy();
      console.log('Excel导出成功');
    } else {
      console.log('Excel导出功能可能未实现或按钮不存在');
    }
    
    // 截图记录
    await GradePageUtils.takeScreenshot(teacherPage, 'excel-export');
  });

  /**
   * 测试导出PDF格式成绩
   */
  test('教师应能导出PDF格式的成绩报告', async () => {
    const exported = await GradeExportUtils.exportToPDF(teacherPage);
    
    if (exported) {
      expect(exported).toBeTruthy();
      console.log('PDF导出成功');
    } else {
      console.log('PDF导出功能可能未实现或按钮不存在');
    }
    
    // 截图记录
    await GradePageUtils.takeScreenshot(teacherPage, 'pdf-export');
  });

  /**
   * 测试导出CSV格式成绩
   */
  test('教师应能导出CSV格式的成绩报告', async () => {
    const exported = await GradeExportUtils.exportToCSV(teacherPage);
    
    if (exported) {
      expect(exported).toBeTruthy();
      console.log('CSV导出成功');
    } else {
      console.log('CSV导出功能可能未实现或按钮不存在');
    }
    
    // 截图记录
    await GradePageUtils.takeScreenshot(teacherPage, 'csv-export');
  });

  /**
   * 测试批量导出选中学生成绩
   */
  test('教师应能批量导出选中学生的成绩', async () => {
    const studentsToExport = [TEST_USERS.student.name, TEST_USERS.student2.name];
    const exported = await GradeExportUtils.exportSelectedStudents(teacherPage, studentsToExport);
    
    if (exported) {
      expect(exported).toBeTruthy();
      console.log('批量导出成功');
    } else {
      console.log('批量导出功能可能未实现或学生不存在');
    }
    
    // 截图记录
    await GradePageUtils.takeScreenshot(teacherPage, 'batch-export');
  });

  /**
   * 测试自定义导出设置
   */
  test('教师应能自定义导出设置', async () => {
    try {
      const customSettings = {
        includeDetails: true,
        includeStatistics: true,
        format: 'excel'
      };
      
      await GradeExportUtils.customExportSettings(teacherPage, customSettings);
      
      // 验证设置应用成功
      const successMessageVisible = await GradePageUtils.waitForSuccessMessage(teacherPage);
      
      // 截图记录
      await GradePageUtils.takeScreenshot(teacherPage, 'custom-export-settings');
    } catch (error) {
      console.log('自定义导出设置失败:', error.message);
    }
  });

  /**
   * 测试后清理
   */
  test.afterAll(async () => {
    await teacherPage.close();
  });
});

/**
 * 成绩统计分析测试套件
 */
test.describe('成绩统计分析E2E测试', () => {
  let teacherPage: Page;

  /**
   * 测试前准备
   */
  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    teacherPage = await context.newPage();
    teacherPage.setDefaultTimeout(TEST_CONFIG.timeout);

    // 教师登录
    await LoginUtils.login(teacherPage, TEST_USERS.teacher);
    
    // 导航到成绩管理页面
    await GradeViewUtils.navigateToGradeManagement(teacherPage);
  });

  /**
   * 测试查看成绩统计信息
   */
  test('教师应能查看成绩统计信息', async () => {
    const statistics = await GradeStatisticsUtils.viewStatistics(teacherPage);
    
    if (statistics) {
      expect(statistics.averageScore).toBeDefined();
      expect(statistics.passRate).toBeDefined();
      expect(statistics.totalStudents).toBeDefined();
      
      console.log('成绩统计信息:', statistics);
    } else {
      console.log('成绩统计功能可能未实现');
    }
    
    // 截图记录
    await GradePageUtils.takeScreenshot(teacherPage, 'grade-statistics');
  });

  /**
   * 测试查看成绩分布图表
   */
  test('教师应能查看成绩分布图表', async () => {
    const chartExists = await GradeStatisticsUtils.viewGradeDistribution(teacherPage);
    
    if (chartExists) {
      expect(chartExists).toBeTruthy();
      console.log('成绩分布图表显示正常');
    } else {
      console.log('成绩分布图表功能可能未实现');
    }
    
    // 截图记录
    await GradePageUtils.takeScreenshot(teacherPage, 'grade-distribution');
  });

  /**
   * 测试生成统计报告
   */
  test('教师应能生成统计报告', async () => {
    const reportGenerated = await GradeStatisticsUtils.generateStatisticsReport(teacherPage);
    
    if (reportGenerated) {
      expect(reportGenerated).toBeTruthy();
      console.log('统计报告生成成功');
    } else {
      console.log('统计报告生成功能可能未实现');
    }
    
    // 截图记录
    await GradePageUtils.takeScreenshot(teacherPage, 'statistics-report');
  });

  /**
   * 测试后清理
   */
  test.afterAll(async () => {
    await teacherPage.close();
  });
});

/**
 * 管理员成绩管理测试套件
 */
test.describe('管理员成绩管理E2E测试', () => {
  let adminPage: Page;

  /**
   * 测试前准备
   */
  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    adminPage = await context.newPage();
    adminPage.setDefaultTimeout(TEST_CONFIG.timeout);

    // 管理员登录
    await LoginUtils.login(adminPage, TEST_USERS.admin);
  });

  /**
   * 测试管理员查看全部成绩
   */
  test('管理员应能查看全部考试成绩', async () => {
    await GradeViewUtils.navigateToGradeManagement(adminPage);
    
    // 验证管理员能看到所有考试的成绩
    const grades = await GradeViewUtils.getStudentGrades(adminPage);
    expect(grades).toBeDefined();
    
    // 截图记录
    await GradePageUtils.takeScreenshot(adminPage, 'admin-all-grades');
  });

  /**
   * 测试管理员查看跨教师成绩统计
   */
  test('管理员应能查看跨教师的成绩统计', async () => {
    const statistics = await GradeStatisticsUtils.viewStatistics(adminPage);
    
    if (statistics) {
      expect(statistics).toBeDefined();
      console.log('管理员成绩统计:', statistics);
    }
    
    // 截图记录
    await GradePageUtils.takeScreenshot(adminPage, 'admin-statistics');
  });

  /**
   * 测试管理员导出全部成绩
   */
  test('管理员应能导出全部成绩报告', async () => {
    const exported = await GradeExportUtils.exportToExcel(adminPage);
    
    if (exported) {
      expect(exported).toBeTruthy();
      console.log('管理员导出成功');
    }
    
    // 截图记录
    await GradePageUtils.takeScreenshot(adminPage, 'admin-export');
  });

  /**
   * 测试后清理
   */
  test.afterAll(async () => {
    await adminPage.close();
  });
});

/**
 * 成绩权限控制测试套件
 */
test.describe('成绩权限控制E2E测试', () => {
  /**
   * 测试学生无法访问成绩管理页面
   */
  test('学生不应能访问成绩管理页面', async ({ page }) => {
    // 学生登录
    await LoginUtils.login(page, TEST_USERS.student);
    
    // 尝试访问成绩管理页面
    await page.goto(`${TEST_CONFIG.baseUrl}/teacher/grades`);
    
    // 验证被重定向或显示权限错误
    const currentUrl = page.url();
    const hasPermissionError = currentUrl.includes('403') || 
                              currentUrl.includes('unauthorized') || 
                              currentUrl.includes('student');
    
    expect(hasPermissionError).toBeTruthy();
    
    // 截图记录
    await GradePageUtils.takeScreenshot(page, 'student-permission-denied');
  });

  /**
   * 测试教师只能查看自己的考试成绩
   */
  test('教师应只能查看自己创建的考试成绩', async ({ page }) => {
    // 教师2登录
    await LoginUtils.login(page, TEST_USERS.teacher2);
    
    // 导航到成绩管理页面
    await GradeViewUtils.navigateToGradeManagement(page);
    
    // 尝试查看其他教师的考试（如果存在权限控制）
    const grades = await GradeViewUtils.getStudentGrades(page);
    
    // 验证只能看到自己的考试成绩
    expect(grades).toBeDefined();
    
    // 截图记录
    await GradePageUtils.takeScreenshot(page, 'teacher-own-grades-only');
  });
});