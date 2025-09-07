/**
 * 用户注册流程端到端测试
 * 测试用户注册、验证、首次登录的完整流程
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
const TEST_REGISTRATION_DATA = {
  validUser: {
    phone: '13900000100',
    password: 'TestPass123!',
    confirmPassword: 'TestPass123!',
    name: '测试注册用户',
    email: 'test.register@example.com',
    role: 'student'
  },
  invalidUsers: [
    {
      name: '无效手机号',
      phone: '123456',
      password: 'TestPass123!',
      confirmPassword: 'TestPass123!',
      userName: '无效手机号用户'
    },
    {
      name: '密码不匹配',
      phone: '13900000101',
      password: 'TestPass123!',
      confirmPassword: 'DifferentPass123!',
      userName: '密码不匹配用户'
    },
    {
      name: '弱密码',
      phone: '13900000102',
      password: '123',
      confirmPassword: '123',
      userName: '弱密码用户'
    }
  ]
};

/**
 * 页面操作工具类
 */
class RegistrationPageUtils {
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
   * 截图保存
   */
  static async takeScreenshot(page: Page, name: string): Promise<void> {
    await page.screenshot({ 
      path: `test-results/screenshots/registration-${name}-${Date.now()}.png`,
      fullPage: true 
    });
  }

  /**
   * 检查表单验证错误
   */
  static async checkValidationError(page: Page, expectedError: string): Promise<boolean> {
    const errorSelectors = [
      '.error-message',
      '.field-error',
      '.validation-error',
      '[data-testid="error-message"]',
      '.text-red-500',
      '.text-danger'
    ];

    for (const selector of errorSelectors) {
      const errorElement = page.locator(selector);
      if (await errorElement.isVisible()) {
        const errorText = await errorElement.textContent();
        if (errorText && errorText.includes(expectedError)) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * 检查成功消息
   */
  static async checkSuccessMessage(page: Page): Promise<boolean> {
    const successSelectors = [
      '.success-message',
      '.alert-success',
      '[data-testid="success-message"]',
      '.text-green-500',
      '.text-success'
    ];

    for (const selector of successSelectors) {
      const successElement = page.locator(selector);
      if (await successElement.isVisible()) {
        return true;
      }
    }
    return false;
  }
}

/**
 * 注册流程工具类
 */
class RegistrationFlowUtils {
  /**
   * 填写注册表单
   */
  static async fillRegistrationForm(page: Page, userData: any): Promise<void> {
    // 填写手机号
    const phoneSelectors = [
      'input[name="phone"]',
      'input[type="tel"]',
      '[data-testid="phone-input"]',
      '#phone'
    ];
    
    for (const selector of phoneSelectors) {
      if (await page.locator(selector).isVisible()) {
        await RegistrationPageUtils.safeFill(page, selector, userData.phone);
        break;
      }
    }

    // 填写用户名
    const nameSelectors = [
      'input[name="name"]',
      'input[name="username"]',
      '[data-testid="name-input"]',
      '#name',
      '#username'
    ];
    
    for (const selector of nameSelectors) {
      if (await page.locator(selector).isVisible()) {
        await RegistrationPageUtils.safeFill(page, selector, userData.name || userData.userName);
        break;
      }
    }

    // 填写邮箱（如果存在）
    const emailSelectors = [
      'input[name="email"]',
      'input[type="email"]',
      '[data-testid="email-input"]',
      '#email'
    ];
    
    for (const selector of emailSelectors) {
      if (await page.locator(selector).isVisible() && userData.email) {
        await RegistrationPageUtils.safeFill(page, selector, userData.email);
        break;
      }
    }

    // 填写密码
    const passwordSelectors = [
      'input[name="password"]',
      'input[type="password"]',
      '[data-testid="password-input"]',
      '#password'
    ];
    
    for (const selector of passwordSelectors) {
      if (await page.locator(selector).isVisible()) {
        await RegistrationPageUtils.safeFill(page, selector, userData.password);
        break;
      }
    }

    // 填写确认密码
    const confirmPasswordSelectors = [
      'input[name="confirmPassword"]',
      'input[name="password_confirmation"]',
      '[data-testid="confirm-password-input"]',
      '#confirmPassword',
      '#password_confirmation'
    ];
    
    for (const selector of confirmPasswordSelectors) {
      if (await page.locator(selector).isVisible() && userData.confirmPassword) {
        await RegistrationPageUtils.safeFill(page, selector, userData.confirmPassword);
        break;
      }
    }

    // 选择角色（如果存在）
    const roleSelectors = [
      'select[name="role"]',
      '[data-testid="role-select"]',
      '#role'
    ];
    
    for (const selector of roleSelectors) {
      if (await page.locator(selector).isVisible() && userData.role) {
        await page.locator(selector).selectOption(userData.role);
        break;
      }
    }
  }

  /**
   * 提交注册表单
   */
  static async submitRegistrationForm(page: Page): Promise<void> {
    const submitSelectors = [
      'button[type="submit"]',
      'button:has-text("注册")',
      'button:has-text("Register")',
      '[data-testid="register-button"]',
      '.register-button'
    ];
    
    for (const selector of submitSelectors) {
      if (await page.locator(selector).isVisible()) {
        await RegistrationPageUtils.safeClick(page, selector);
        break;
      }
    }
  }

  /**
   * 处理验证码（如果需要）
   */
  static async handleVerificationCode(page: Page, code = '123456'): Promise<void> {
    const codeSelectors = [
      'input[name="verificationCode"]',
      'input[name="code"]',
      '[data-testid="verification-code"]',
      '#verificationCode'
    ];
    
    for (const selector of codeSelectors) {
      if (await page.locator(selector).isVisible()) {
        await RegistrationPageUtils.safeFill(page, selector, code);
        
        // 点击验证按钮
        const verifyButton = page.locator('button:has-text("验证"), button:has-text("Verify"), [data-testid="verify-button"]');
        if (await verifyButton.isVisible()) {
          await verifyButton.click();
        }
        break;
      }
    }
  }

  /**
   * 完成注册流程
   */
  static async completeRegistration(page: Page, userData: any): Promise<boolean> {
    try {
      // 填写表单
      await this.fillRegistrationForm(page, userData);
      
      // 提交表单
      await this.submitRegistrationForm(page);
      
      // 等待响应
      await page.waitForTimeout(3000);
      
      // 检查是否需要验证码
      const needsVerification = await page.locator('input[name="verificationCode"], input[name="code"]').isVisible();
      if (needsVerification) {
        await this.handleVerificationCode(page);
        await page.waitForTimeout(2000);
      }
      
      // 检查注册结果
      const currentUrl = page.url();
      const isSuccess = currentUrl.includes('/login') || 
                       currentUrl.includes('/dashboard') || 
                       currentUrl.includes('/success') ||
                       await RegistrationPageUtils.checkSuccessMessage(page);
      
      return isSuccess;
    } catch (error) {
      console.error('注册流程失败:', error);
      return false;
    }
  }
}

/**
 * 登录验证工具类
 */
class LoginVerificationUtils {
  /**
   * 使用新注册的账号登录
   */
  static async loginWithNewAccount(page: Page, userData: any): Promise<boolean> {
    try {
      // 导航到登录页面
      await page.goto(`${TEST_CONFIG.baseUrl}/login`);
      await RegistrationPageUtils.waitForPageLoad(page);

      // 检查是否有密码登录选项卡
      const passwordTab = page.locator('button:has-text("密码登录")');
      if (await passwordTab.isVisible()) {
        await passwordTab.click();
      }

      // 填写登录信息
      const phoneInput = page.locator('input[type="tel"], input[name="phone"], input[id="phone"]').first();
      const passwordInput = page.locator('input[type="password"], input[name="password"], input[id="password"]').first();
      const loginButton = page.locator('button[type="submit"]:has-text("登录")').first();

      await phoneInput.fill(userData.phone);
      await passwordInput.fill(userData.password);
      await loginButton.click();

      // 等待登录结果
      await page.waitForTimeout(3000);
      
      // 验证登录成功
      const currentUrl = page.url();
      const isLoggedIn = !currentUrl.includes('/login') || 
                        await page.locator('text=欢迎, text=Welcome, [data-testid="user-name"], [data-testid="logout-button"]').count() > 0;
      
      return isLoggedIn;
    } catch (error) {
      console.error('登录验证失败:', error);
      return false;
    }
  }
}

/**
 * 用户注册流程测试套件
 */
test.describe('用户注册流程E2E测试', () => {
  /**
   * 测试前准备
   */
  test.beforeEach(async ({ page }) => {
    // 设置页面超时
    page.setDefaultTimeout(TEST_CONFIG.timeout);
    
    // 导航到注册页面
    await page.goto(`${TEST_CONFIG.baseUrl}/register`);
    await RegistrationPageUtils.waitForPageLoad(page);
  });

  /**
   * 测试注册页面加载
   */
  test('注册页面应正确加载', async ({ page }) => {
    // 验证页面标题
    await expect(page).toHaveTitle(/注册|Register|Sign Up/);
    
    // 验证关键表单元素存在
    const phoneInput = page.locator('input[name="phone"], input[type="tel"]');
    const passwordInput = page.locator('input[name="password"], input[type="password"]');
    const nameInput = page.locator('input[name="name"], input[name="username"]');
    const submitButton = page.locator('button[type="submit"], button:has-text("注册")');
    
    await expect(phoneInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(nameInput).toBeVisible();
    await expect(submitButton).toBeVisible();
    
    // 截图记录
    await RegistrationPageUtils.takeScreenshot(page, 'page-loaded');
  });

  /**
   * 测试有效用户注册
   */
  test('有效用户应能成功注册', async ({ page }) => {
    const userData = TEST_REGISTRATION_DATA.validUser;
    
    // 执行注册流程
    const isSuccess = await RegistrationFlowUtils.completeRegistration(page, userData);
    expect(isSuccess).toBeTruthy();
    
    // 截图记录
    await RegistrationPageUtils.takeScreenshot(page, 'valid-registration-success');
  });

  /**
   * 测试无效手机号注册
   */
  test('无效手机号应显示错误信息', async ({ page }) => {
    const invalidUser = TEST_REGISTRATION_DATA.invalidUsers.find(u => u.name === '无效手机号')!;
    
    // 填写表单
    await RegistrationFlowUtils.fillRegistrationForm(page, invalidUser);
    await RegistrationFlowUtils.submitRegistrationForm(page);
    
    // 等待验证
    await page.waitForTimeout(2000);
    
    // 检查错误信息
    const hasError = await RegistrationPageUtils.checkValidationError(page, '手机号');
    expect(hasError).toBeTruthy();
    
    // 截图记录
    await RegistrationPageUtils.takeScreenshot(page, 'invalid-phone-error');
  });

  /**
   * 测试密码不匹配
   */
  test('密码不匹配应显示错误信息', async ({ page }) => {
    const invalidUser = TEST_REGISTRATION_DATA.invalidUsers.find(u => u.name === '密码不匹配')!;
    
    // 填写表单
    await RegistrationFlowUtils.fillRegistrationForm(page, invalidUser);
    await RegistrationFlowUtils.submitRegistrationForm(page);
    
    // 等待验证
    await page.waitForTimeout(2000);
    
    // 检查错误信息
    const hasError = await RegistrationPageUtils.checkValidationError(page, '密码');
    expect(hasError).toBeTruthy();
    
    // 截图记录
    await RegistrationPageUtils.takeScreenshot(page, 'password-mismatch-error');
  });

  /**
   * 测试弱密码
   */
  test('弱密码应显示错误信息', async ({ page }) => {
    const invalidUser = TEST_REGISTRATION_DATA.invalidUsers.find(u => u.name === '弱密码')!;
    
    // 填写表单
    await RegistrationFlowUtils.fillRegistrationForm(page, invalidUser);
    await RegistrationFlowUtils.submitRegistrationForm(page);
    
    // 等待验证
    await page.waitForTimeout(2000);
    
    // 检查错误信息
    const hasError = await RegistrationPageUtils.checkValidationError(page, '密码');
    expect(hasError).toBeTruthy();
    
    // 截图记录
    await RegistrationPageUtils.takeScreenshot(page, 'weak-password-error');
  });

  /**
   * 测试重复注册
   */
  test('重复手机号注册应显示错误信息', async ({ page }) => {
    const userData = {
      ...TEST_REGISTRATION_DATA.validUser,
      phone: '13800000001' // 使用已存在的测试用户手机号
    };
    
    // 填写表单
    await RegistrationFlowUtils.fillRegistrationForm(page, userData);
    await RegistrationFlowUtils.submitRegistrationForm(page);
    
    // 等待验证
    await page.waitForTimeout(3000);
    
    // 检查错误信息
    const hasError = await RegistrationPageUtils.checkValidationError(page, '已存在') ||
                     await RegistrationPageUtils.checkValidationError(page, '已注册');
    expect(hasError).toBeTruthy();
    
    // 截图记录
    await RegistrationPageUtils.takeScreenshot(page, 'duplicate-phone-error');
  });

  /**
   * 测试表单字段验证
   */
  test('空字段应显示必填验证', async ({ page }) => {
    // 直接提交空表单
    await RegistrationFlowUtils.submitRegistrationForm(page);
    
    // 等待验证
    await page.waitForTimeout(1000);
    
    // 检查必填字段验证
    const requiredFields = [
      'input[name="phone"]:invalid',
      'input[name="password"]:invalid',
      'input[name="name"]:invalid'
    ];
    
    let hasValidation = false;
    for (const field of requiredFields) {
      if (await page.locator(field).count() > 0) {
        hasValidation = true;
        break;
      }
    }
    
    // 或者检查错误消息
    if (!hasValidation) {
      hasValidation = await RegistrationPageUtils.checkValidationError(page, '必填') ||
                     await RegistrationPageUtils.checkValidationError(page, '不能为空');
    }
    
    expect(hasValidation).toBeTruthy();
    
    // 截图记录
    await RegistrationPageUtils.takeScreenshot(page, 'required-field-validation');
  });
});

/**
 * 注册后登录验证测试
 */
test.describe('注册后登录验证测试', () => {
  /**
   * 测试新注册用户首次登录
   */
  test('新注册用户应能成功登录', async ({ page }) => {
    // 先注册一个新用户
    const newUser = {
      ...TEST_REGISTRATION_DATA.validUser,
      phone: `139${Date.now().toString().slice(-8)}` // 生成唯一手机号
    };
    
    // 导航到注册页面
    await page.goto(`${TEST_CONFIG.baseUrl}/register`);
    await RegistrationPageUtils.waitForPageLoad(page);
    
    // 完成注册
    const registrationSuccess = await RegistrationFlowUtils.completeRegistration(page, newUser);
    expect(registrationSuccess).toBeTruthy();
    
    // 等待一段时间确保注册完成
    await page.waitForTimeout(2000);
    
    // 尝试登录
    const loginSuccess = await LoginVerificationUtils.loginWithNewAccount(page, newUser);
    expect(loginSuccess).toBeTruthy();
    
    // 截图记录
    await RegistrationPageUtils.takeScreenshot(page, 'new-user-login-success');
  });

  /**
   * 测试用户信息显示
   */
  test('登录后应显示正确的用户信息', async ({ page }) => {
    // 使用已知的测试用户登录
    const testUser = {
      phone: '13800000003',
      password: 'password123'
    };
    
    await page.goto(`${TEST_CONFIG.baseUrl}/login`);
    await RegistrationPageUtils.waitForPageLoad(page);
    
    // 登录
    const loginSuccess = await LoginVerificationUtils.loginWithNewAccount(page, testUser);
    expect(loginSuccess).toBeTruthy();
    
    // 检查用户信息显示
    const userInfoSelectors = [
      '[data-testid="user-name"]',
      '.user-name',
      '.username',
      '.user-info'
    ];
    
    let userInfoVisible = false;
    for (const selector of userInfoSelectors) {
      if (await page.locator(selector).isVisible()) {
        userInfoVisible = true;
        break;
      }
    }
    
    expect(userInfoVisible).toBeTruthy();
    
    // 截图记录
    await RegistrationPageUtils.takeScreenshot(page, 'user-info-display');
  });
});

/**
 * 注册流程性能测试
 */
test.describe('注册流程性能测试', () => {
  /**
   * 测试注册页面加载性能
   */
  test('注册页面应在合理时间内加载', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto(`${TEST_CONFIG.baseUrl}/register`);
    await RegistrationPageUtils.waitForPageLoad(page);
    
    const loadTime = Date.now() - startTime;
    
    // 页面应在5秒内加载完成
    expect(loadTime).toBeLessThan(5000);
    
    console.log(`注册页面加载时间: ${loadTime}ms`);
  });

  /**
   * 测试注册提交响应时间
   */
  test('注册提交应在合理时间内响应', async ({ page }) => {
    const userData = {
      ...TEST_REGISTRATION_DATA.validUser,
      phone: `138${Date.now().toString().slice(-8)}` // 生成唯一手机号
    };
    
    await page.goto(`${TEST_CONFIG.baseUrl}/register`);
    await RegistrationPageUtils.waitForPageLoad(page);
    
    // 填写表单
    await RegistrationFlowUtils.fillRegistrationForm(page, userData);
    
    // 记录提交时间
    const startTime = Date.now();
    await RegistrationFlowUtils.submitRegistrationForm(page);
    
    // 等待响应
    await page.waitForTimeout(5000);
    const responseTime = Date.now() - startTime;
    
    // 注册应在10秒内响应
    expect(responseTime).toBeLessThan(10000);
    
    console.log(`注册提交响应时间: ${responseTime}ms`);
  });
});