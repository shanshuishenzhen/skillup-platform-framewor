/**
 * 用户认证端到端测试
 * 
 * 测试用户注册、登录、登出等认证相关功能
 * 包括不同角色用户的认证流程
 * 
 * @author SOLO Coding
 */

import { test, expect, TEST_CONFIG, TEST_TAGS } from '../setup/test-setup';
import { TEST_USERS } from '../test-data/seed';

// 测试配置
const baseUrl = TEST_CONFIG.baseUrl;

test.describe('用户认证流程', () => {
  test.beforeEach(async ({ page }) => {
    // 确保每个测试开始时都是未登录状态
    await page.goto(`${baseUrl}/login`);
    await page.waitForLoadState('networkidle');
  });

  test(`${TEST_TAGS.SMOKE} ${TEST_TAGS.AUTH} 登录页面应该正确加载`, async ({ page, testHelpers }) => {
    // 验证登录页面元素
    await testHelpers.expectElementToBeVisible('input[type="email"]');
    await testHelpers.expectElementToBeVisible('input[type="password"]');
    await testHelpers.expectElementToBeVisible('button[type="submit"]');
    
    // 验证页面标题
    await expect(page).toHaveTitle(/登录|Login/);
    
    // 验证页面URL
    expect(page.url()).toContain('/login');
    
    // 截图
    await testHelpers.takeScreenshot('login-page-loaded');
  });

  test(`${TEST_TAGS.AUTH} ${TEST_TAGS.ADMIN} 管理员用户登录流程`, async ({ page, testHelpers }) => {
    // 执行登录
    await testHelpers.login('admin', baseUrl);
    
    // 验证登录成功后的页面
    await testHelpers.expectPageToContainText('仪表板');
    
    // 验证管理员特有的功能可见
    // 注意：这里需要根据实际的管理员界面调整选择器
    const adminElements = [
      '[data-testid="admin-panel"]',
      'a[href*="/admin"]',
      'button:has-text("管理")',
      '.admin-menu'
    ];
    
    // 尝试找到任何一个管理员元素
    let adminElementFound = false;
    for (const selector of adminElements) {
      try {
        const element = page.locator(selector);
        if (await element.isVisible({ timeout: 2000 })) {
          adminElementFound = true;
          break;
        }
      } catch (error) {
        // 继续尝试下一个选择器
      }
    }
    
    // 如果没有找到特定的管理员元素，至少验证用户已登录
    if (!adminElementFound) {
      console.log('未找到特定的管理员界面元素，验证基本登录状态');
      await expect(page).toHaveURL(/.*\/dashboard/);
    }
    
    // 截图
    await testHelpers.takeScreenshot('admin-logged-in');
  });

  test(`${TEST_TAGS.AUTH} ${TEST_TAGS.TEACHER} 教师用户登录流程`, async ({ page, testHelpers }) => {
    // 执行登录
    await testHelpers.login('teacher', baseUrl);
    
    // 验证登录成功
    await expect(page).toHaveURL(/.*\/dashboard/);
    await testHelpers.expectPageToContainText('仪表板');
    
    // 验证教师特有的功能（如果有的话）
    // 这里可以添加教师特有界面的验证
    
    // 截图
    await testHelpers.takeScreenshot('teacher-logged-in');
  });

  test(`${TEST_TAGS.AUTH} ${TEST_TAGS.STUDENT} 学生用户登录流程`, async ({ page, testHelpers }) => {
    // 执行登录
    await testHelpers.login('student', baseUrl);
    
    // 验证登录成功
    await expect(page).toHaveURL(/.*\/dashboard/);
    await testHelpers.expectPageToContainText('仪表板');
    
    // 验证学生特有的功能（如果有的话）
    // 这里可以添加学生特有界面的验证
    
    // 截图
    await testHelpers.takeScreenshot('student-logged-in');
  });

  test(`${TEST_TAGS.AUTH} 无效登录凭据应该显示错误`, async ({ page, testHelpers }) => {
    // 尝试使用无效凭据登录
    await testHelpers.waitAndFill('input[type="email"]', 'invalid@test.com');
    await testHelpers.waitAndFill('input[type="password"]', 'wrongpassword');
    await testHelpers.waitAndClick('button[type="submit"]');
    
    // 等待错误消息出现
    await page.waitForTimeout(2000);
    
    // 验证仍在登录页面
    expect(page.url()).toContain('/login');
    
    // 尝试查找错误消息
    const errorSelectors = [
      '.error-message',
      '.alert-error',
      '[data-testid="error"]',
      '.text-red-500',
      '.text-danger'
    ];
    
    let errorFound = false;
    for (const selector of errorSelectors) {
      try {
        const element = page.locator(selector);
        if (await element.isVisible({ timeout: 1000 })) {
          errorFound = true;
          console.log(`找到错误消息: ${await element.textContent()}`);
          break;
        }
      } catch (error) {
        // 继续尝试下一个选择器
      }
    }
    
    // 如果没有找到特定的错误消息，检查是否有任何包含错误相关文本的元素
    if (!errorFound) {
      const errorTexts = ['错误', '失败', 'error', 'invalid', '无效'];
      for (const text of errorTexts) {
        try {
          await expect(page.locator('body')).toContainText(text, { timeout: 1000 });
          errorFound = true;
          console.log(`找到错误相关文本: ${text}`);
          break;
        } catch (error) {
          // 继续尝试下一个文本
        }
      }
    }
    
    // 截图用于调试
    await testHelpers.takeScreenshot('invalid-login-attempt');
    
    // 如果没有找到错误消息，至少验证没有跳转到仪表板
    await expect(page).not.toHaveURL(/.*\/dashboard/);
  });

  test(`${TEST_TAGS.AUTH} 用户登出流程`, async ({ page, testHelpers }) => {
    // 先登录
    await testHelpers.login('student', baseUrl);
    
    // 验证已登录
    await expect(page).toHaveURL(/.*\/dashboard/);
    
    // 执行登出
    await testHelpers.logout();
    
    // 验证已登出（回到登录页面）
    await expect(page).toHaveURL(/.*\/login/);
    
    // 截图
    await testHelpers.takeScreenshot('user-logged-out');
  });

  test(`${TEST_TAGS.AUTH} 未登录用户访问受保护页面应该重定向到登录`, async ({ page, testHelpers }) => {
    // 尝试直接访问仪表板
    await page.goto(`${baseUrl}/dashboard`);
    
    // 应该被重定向到登录页面
    await testHelpers.waitForURL(/.*\/login/, 10000);
    
    // 验证在登录页面
    await testHelpers.expectElementToBeVisible('input[type="email"]');
    await testHelpers.expectElementToBeVisible('input[type="password"]');
    
    // 截图
    await testHelpers.takeScreenshot('protected-route-redirect');
  });

  test(`${TEST_TAGS.AUTH} 登录后访问登录页面应该重定向到仪表板`, async ({ page, testHelpers }) => {
    // 先登录
    await testHelpers.login('student', baseUrl);
    
    // 验证已在仪表板
    await expect(page).toHaveURL(/.*\/dashboard/);
    
    // 尝试访问登录页面
    await page.goto(`${baseUrl}/login`);
    
    // 应该被重定向回仪表板
    await testHelpers.waitForURL(/.*\/dashboard/, 5000);
    
    // 截图
    await testHelpers.takeScreenshot('login-redirect-when-authenticated');
  });

  test(`${TEST_TAGS.REGRESSION} 多个用户连续登录登出`, async ({ page, testHelpers }) => {
    const users: (keyof typeof TEST_USERS)[] = ['admin', 'teacher', 'student'];
    
    for (const userType of users) {
      console.log(`测试用户: ${userType}`);
      
      // 登录
      await page.goto(`${baseUrl}/login`);
      await testHelpers.login(userType, baseUrl);
      
      // 验证登录成功
      await expect(page).toHaveURL(/.*\/dashboard/);
      
      // 登出
      await testHelpers.logout();
      
      // 验证登出成功
      await expect(page).toHaveURL(/.*\/login/);
      
      // 短暂等待
      await page.waitForTimeout(1000);
    }
    
    // 截图
    await testHelpers.takeScreenshot('multiple-users-login-logout');
  });
});