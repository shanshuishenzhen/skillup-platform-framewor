import { test, expect } from '@playwright/test';

test.describe('简单测试', () => {
  test('访问登录页面', async ({ page }) => {
    console.log('正在访问: http://localhost:3000/login');
    
    // 访问登录页面
    await page.goto('/login');
    
    // 等待页面加载
    await page.waitForLoadState('networkidle');
    
    // 获取页面标题
    const title = await page.title();
    console.log('页面标题:', title);
    
    // 获取页面URL
    const url = page.url();
    console.log('页面URL:', url);
    
    // 检查页面是否包含登录表单
    const loginForm = await page.locator('form').count();
    console.log('表单数量:', loginForm);
    
    // 基本断言
    expect(title).toBeTruthy();
    expect(url).toContain('/login');
  });
});