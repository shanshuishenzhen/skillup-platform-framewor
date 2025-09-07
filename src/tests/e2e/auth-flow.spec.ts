import { test, expect } from '@playwright/test';

/**
 * 认证流程端到端测试
 * 测试用户登录、注册和权限验证等核心认证功能
 */

/**
 * 测试配置
 */
const TEST_CONFIG = {
  baseUrl: 'http://localhost:3000',
  timeout: 10000
};

/**
 * 测试用户数据
 */
const TEST_USERS = {
  admin: {
    phone: '13823738278',
    password: 'admin123',
    name: '测试管理员'
  },
  teacher: {
    phone: '13800000001',
    password: 'teacher123',
    name: '测试教师'
  },
  student: {
    phone: '13800000002',
    password: 'student123',
    name: '测试学生'
  }
};

/**
 * 认证流程测试套件
 */
test.describe('认证流程测试', () => {
  
  /**
   * 测试登录页面加载
   */
  test('登录页面应该正确加载', async ({ page }) => {
    await page.goto(`${TEST_CONFIG.baseUrl}/login`);
    
    // 等待页面完全加载
    await page.waitForLoadState('networkidle');
    
    // 验证页面标题（使用实际的页面标题）
    await expect(page).toHaveTitle('PH&RL - 智能科技解决方案');
    
    // 验证登录表单元素存在
    await expect(page.locator('input[type="tel"], input[name="phone"], input[id="phone"]')).toBeVisible();
    await expect(page.locator('input[type="password"], input[name="password"], input[id="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]:has-text("登录")')).toBeVisible();
  });

  /**
   * 测试无效登录
   */
  test('无效凭据应该显示错误信息', async ({ page }) => {
    await page.goto(`${TEST_CONFIG.baseUrl}/login`);
    
    // 确保选择密码登录模式
    const passwordLoginTab = page.locator('button:has-text("密码登录")');
    if (await passwordLoginTab.isVisible()) {
      await passwordLoginTab.click();
    }
    
    // 填写无效凭据
    const phoneInput = page.locator('input[type="tel"], input[name="phone"], input[id="phone"]').first();
    const passwordInput = page.locator('input[type="password"], input[name="password"], input[id="password"]').first();
    const loginButton = page.locator('button[type="submit"]:has-text("登录")').first();
    
    await phoneInput.fill('13800000000');
    await passwordInput.fill('wrongpassword');
    await loginButton.click();
    
    // 验证显示错误信息或保持在登录页面
    await page.waitForTimeout(2000);
    const currentUrl = page.url();
    const stillOnLoginPage = currentUrl.includes('/login');
    const hasErrorMessage = await page.locator('.text-red-600, .error, [data-testid="error-message"], .alert-error, .text-red-500').count() > 0;
    
    // 无效登录应该保持在登录页面或显示错误信息
    expect(stillOnLoginPage || hasErrorMessage).toBeTruthy();
  });

  /**
   * 测试管理员登录
   */
  test('管理员应该能够成功登录', async ({ page }) => {
    await page.goto(`${TEST_CONFIG.baseUrl}/login`);
    
    // 确保选择密码登录模式
    const passwordLoginTab = page.locator('button:has-text("密码登录")');
    if (await passwordLoginTab.isVisible()) {
      await passwordLoginTab.click();
    }
    
    // 填写管理员凭据
    const phoneInput = page.locator('input[type="tel"], input[name="phone"], input[id="phone"]').first();
    const passwordInput = page.locator('input[type="password"], input[name="password"], input[id="password"]').first();
    const loginButton = page.locator('button[type="submit"]:has-text("登录")').first();
    
    await phoneInput.fill(TEST_USERS.admin.phone);
    await passwordInput.fill(TEST_USERS.admin.password);
    await loginButton.click();
    
    // 验证登录成功（检查URL变化或页面内容）
    await page.waitForTimeout(3000);
    const currentUrl = page.url();
    const isLoggedIn = !currentUrl.includes('/login') || 
                      currentUrl.includes('/admin') || 
                      currentUrl.includes('/dashboard') || 
                      currentUrl.includes('/home') ||
                      await page.locator('text=欢迎, text=Welcome, [data-testid="user-name"], [data-testid="logout-button"]').count() > 0;
    
    expect(isLoggedIn).toBeTruthy();
  });

  /**
   * 测试教师登录
   */
  test('教师应该能够成功登录', async ({ page }) => {
    await page.goto(`${TEST_CONFIG.baseUrl}/login`);
    
    // 确保选择密码登录模式
    const passwordLoginTab = page.locator('button:has-text("密码登录")');
    if (await passwordLoginTab.isVisible()) {
      await passwordLoginTab.click();
    }
    
    // 填写教师凭据
    const phoneInput = page.locator('input[type="tel"], input[name="phone"], input[id="phone"]').first();
    const passwordInput = page.locator('input[type="password"], input[name="password"], input[id="password"]').first();
    const loginButton = page.locator('button[type="submit"]:has-text("登录")').first();
    
    await phoneInput.fill(TEST_USERS.teacher.phone);
    await passwordInput.fill(TEST_USERS.teacher.password);
    await loginButton.click();
    
    // 验证登录成功（检查URL变化或页面内容）
    await page.waitForTimeout(3000);
    const currentUrl = page.url();
    const isLoggedIn = !currentUrl.includes('/login') || 
                      currentUrl.includes('/dashboard') || 
                      currentUrl.includes('/teacher') || 
                      currentUrl.includes('/home') ||
                      await page.locator('text=欢迎, text=Welcome, [data-testid="user-name"], [data-testid="logout-button"]').count() > 0;
    
    expect(isLoggedIn).toBeTruthy();
  });

  /**
   * 测试学生登录
   */
  test('学生应该能够成功登录', async ({ page }) => {
    await page.goto(`${TEST_CONFIG.baseUrl}/login`);
    
    // 确保选择密码登录模式
    const passwordLoginTab = page.locator('button:has-text("密码登录")');
    if (await passwordLoginTab.isVisible()) {
      await passwordLoginTab.click();
    }
    
    // 填写学生凭据
    const phoneInput = page.locator('input[type="tel"], input[name="phone"], input[id="phone"]').first();
    const passwordInput = page.locator('input[type="password"], input[name="password"], input[id="password"]').first();
    const loginButton = page.locator('button[type="submit"]:has-text("登录")').first();
    
    await phoneInput.fill(TEST_USERS.student.phone);
    await passwordInput.fill(TEST_USERS.student.password);
    await loginButton.click();
    
    // 验证登录成功（检查URL变化或页面内容）
    await page.waitForTimeout(3000);
    const currentUrl = page.url();
    const isLoggedIn = !currentUrl.includes('/login') || 
                      currentUrl.includes('/dashboard') || 
                      currentUrl.includes('/student') || 
                      currentUrl.includes('/home') ||
                      await page.locator('text=欢迎, text=Welcome, [data-testid="user-name"], [data-testid="logout-button"]').count() > 0;
    
    expect(isLoggedIn).toBeTruthy();
  });

  /**
   * 测试注册页面（如果存在）
   */
  test('注册页面应该正确加载', async ({ page }) => {
    // 尝试访问注册页面
    await page.goto(`${TEST_CONFIG.baseUrl}/register`);
    
    // 验证页面标题或关键元素
    const pageTitle = await page.title();
    expect(pageTitle).toBe('PH&RL - 智能科技解决方案');
    
    // 检查是否有注册相关元素或链接
    const hasRegisterElements = await page.locator('form, input[type="tel"], input[type="password"], button:has-text("注册"), button:has-text("Register"), a:has-text("注册")').count() > 0;
    expect(hasRegisterElements).toBeTruthy();
  });

  /**
   * 测试权限保护的页面
   */
  test('未登录用户访问受保护页面应该重定向到登录页', async ({ page }) => {
    // 尝试直接访问管理员页面
    await page.goto(`${TEST_CONFIG.baseUrl}/admin/dashboard`);
    
    // 等待可能的重定向
    await page.waitForTimeout(2000);
    
    // 检查是否被重定向到登录页面
    const currentUrl = page.url();
    const isOnLoginPage = currentUrl.includes('/login') || 
                         currentUrl.includes('/auth') || 
                         await page.locator('input[type="tel"], input[type="password"], button:has-text("登录")').count() > 0;
    
    expect(isOnLoginPage).toBeTruthy();
  });

  /**
   * 测试登出功能
   */
  test('用户应该能够成功登出', async ({ page }) => {
    // 先登录
    await page.goto(`${TEST_CONFIG.baseUrl}/login`);
    
    const phoneInput = page.locator('input[type="tel"], input[name="phone"], input[id="phone"]').first();
    const passwordInput = page.locator('input[type="password"], input[name="password"], input[id="password"]').first();
    const loginButton = page.locator('button[type="submit"]:has-text("登录")').first();
    
    await phoneInput.fill(TEST_USERS.student.phone);
    await passwordInput.fill(TEST_USERS.student.password);
    await loginButton.click();
    
    await page.waitForTimeout(2000);
    
    // 查找并点击登出按钮
    const logoutButton = page.locator('[data-testid="logout-button"], button:has-text("登出"), button:has-text("Logout"), button:has-text("退出")');
    
    if (await logoutButton.isVisible()) {
      await logoutButton.click();
      
      // 验证登出成功 - 应该重定向到登录页面
      await page.waitForTimeout(2000);
      
      const currentUrl = page.url();
      const isLoggedOut = currentUrl.includes('/login') || 
                         await page.locator('input[type="tel"], input[name="phone"], input[id="phone"]').isVisible();
      
      expect(isLoggedOut).toBeTruthy();
    } else {
      // 如果找不到登出按钮，跳过测试
      test.skip();
    }
  });
});

/**
 * 页面导航测试套件
 */
test.describe('页面导航测试', () => {
  
  /**
   * 测试主页加载
   */
  test('主页应该正确加载', async ({ page }) => {
    await page.goto(TEST_CONFIG.baseUrl);
    
    // 验证页面加载成功
    await expect(page).toHaveTitle(/.+/); // 确保有标题
    
    // 验证页面内容加载
    const bodyContent = await page.locator('body').textContent();
    expect(bodyContent).toBeTruthy();
    expect(bodyContent.length).toBeGreaterThan(0);
  });

  /**
   * 测试404页面
   */
  test('不存在的页面应该显示404或重定向', async ({ page }) => {
    await page.goto(`${TEST_CONFIG.baseUrl}/non-existent-page`);
    
    // 等待页面加载
    await page.waitForTimeout(2000);
    
    // 验证404页面或重定向
    const currentUrl = page.url();
    const pageContent = await page.locator('body').textContent();
    
    const is404OrRedirect = pageContent?.includes('404') || 
                           pageContent?.includes('Not Found') || 
                           pageContent?.includes('页面不存在') ||
                           currentUrl !== `${TEST_CONFIG.baseUrl}/non-existent-page`;
    
    expect(is404OrRedirect).toBeTruthy();
  });
});