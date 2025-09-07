import { test, expect } from '@playwright/test';

/**
 * 页面结构检查测试
 * 用于了解应用程序的实际页面结构和元素
 */

test.describe('页面结构检查', () => {
  
  /**
   * 检查主页结构
   */
  test('检查主页结构', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // 等待页面加载
    await page.waitForTimeout(3000);
    
    // 获取页面标题
    const title = await page.title();
    console.log('页面标题:', title);
    
    // 获取页面URL
    const url = page.url();
    console.log('当前URL:', url);
    
    // 获取页面HTML结构
    const bodyHTML = await page.locator('body').innerHTML();
    console.log('页面HTML长度:', bodyHTML.length);
    
    // 检查是否有登录相关元素
    const loginElements = await page.locator('a, button, input').all();
    console.log('页面元素数量:', loginElements.length);
    
    // 查找可能的登录链接或按钮
    const loginLinks = await page.locator('a:has-text("登录"), a:has-text("Login"), button:has-text("登录"), button:has-text("Login")').all();
    console.log('找到的登录元素数量:', loginLinks.length);
    
    for (let i = 0; i < loginLinks.length; i++) {
      const text = await loginLinks[i].textContent();
      const href = await loginLinks[i].getAttribute('href');
      console.log(`登录元素 ${i + 1}: 文本="${text}", href="${href}"`);
    }
    
    // 检查是否直接有登录表单
    const emailInputs = await page.locator('input[type="email"], input[name="email"], input[placeholder*="邮箱"], input[placeholder*="email"]').all();
    const passwordInputs = await page.locator('input[type="password"], input[name="password"], input[placeholder*="密码"], input[placeholder*="password"]').all();
    
    console.log('邮箱输入框数量:', emailInputs.length);
    console.log('密码输入框数量:', passwordInputs.length);
    
    // 如果主页没有登录表单，尝试访问登录页面
    if (emailInputs.length === 0 && passwordInputs.length === 0) {
      console.log('主页没有登录表单，尝试访问 /login 页面');
      
      await page.goto('http://localhost:3000/login');
      await page.waitForTimeout(2000);
      
      const loginPageTitle = await page.title();
      const loginPageUrl = page.url();
      console.log('登录页面标题:', loginPageTitle);
      console.log('登录页面URL:', loginPageUrl);
      
      // 重新检查登录表单元素
      const loginEmailInputs = await page.locator('input[type="email"], input[name="email"], input[placeholder*="邮箱"], input[placeholder*="email"]').all();
      const loginPasswordInputs = await page.locator('input[type="password"], input[name="password"], input[placeholder*="密码"], input[placeholder*="password"]').all();
      const submitButtons = await page.locator('button[type="submit"], button:has-text("登录"), button:has-text("Login"), input[type="submit"]').all();
      
      console.log('登录页面邮箱输入框数量:', loginEmailInputs.length);
      console.log('登录页面密码输入框数量:', loginPasswordInputs.length);
      console.log('登录页面提交按钮数量:', submitButtons.length);
      
      // 输出具体的元素信息
      for (let i = 0; i < loginEmailInputs.length; i++) {
        const placeholder = await loginEmailInputs[i].getAttribute('placeholder');
        const name = await loginEmailInputs[i].getAttribute('name');
        const id = await loginEmailInputs[i].getAttribute('id');
        const className = await loginEmailInputs[i].getAttribute('class');
        console.log(`邮箱输入框 ${i + 1}: placeholder="${placeholder}", name="${name}", id="${id}", class="${className}"`);
      }
      
      for (let i = 0; i < loginPasswordInputs.length; i++) {
        const placeholder = await loginPasswordInputs[i].getAttribute('placeholder');
        const name = await loginPasswordInputs[i].getAttribute('name');
        const id = await loginPasswordInputs[i].getAttribute('id');
        const className = await loginPasswordInputs[i].getAttribute('class');
        console.log(`密码输入框 ${i + 1}: placeholder="${placeholder}", name="${name}", id="${id}", class="${className}"`);
      }
      
      for (let i = 0; i < submitButtons.length; i++) {
        const text = await submitButtons[i].textContent();
        const type = await submitButtons[i].getAttribute('type');
        const className = await submitButtons[i].getAttribute('class');
        console.log(`提交按钮 ${i + 1}: text="${text}", type="${type}", class="${className}"`);
      }
      
      // 如果还是没有找到，输出页面的主要结构
      if (loginEmailInputs.length === 0 && loginPasswordInputs.length === 0) {
        console.log('仍然没有找到登录表单，输出页面主要结构:');
        const allInputs = await page.locator('input').all();
        const allButtons = await page.locator('button').all();
        const allForms = await page.locator('form').all();
        
        console.log('所有输入框数量:', allInputs.length);
        console.log('所有按钮数量:', allButtons.length);
        console.log('所有表单数量:', allForms.length);
        
        // 输出前5个输入框的信息
        for (let i = 0; i < Math.min(5, allInputs.length); i++) {
          const type = await allInputs[i].getAttribute('type');
          const name = await allInputs[i].getAttribute('name');
          const placeholder = await allInputs[i].getAttribute('placeholder');
          console.log(`输入框 ${i + 1}: type="${type}", name="${name}", placeholder="${placeholder}"`);
        }
        
        // 输出前5个按钮的信息
        for (let i = 0; i < Math.min(5, allButtons.length); i++) {
          const text = await allButtons[i].textContent();
          const type = await allButtons[i].getAttribute('type');
          console.log(`按钮 ${i + 1}: text="${text}", type="${type}"`);
        }
      }
    }
    
    // 基本断言确保测试通过
    expect(title).toBeTruthy();
  });
  
  /**
   * 检查其他可能的认证相关页面
   */
  test('检查其他认证页面', async ({ page }) => {
    const authPages = ['/auth', '/signin', '/sign-in', '/auth/login', '/user/login'];
    
    for (const authPage of authPages) {
      try {
        await page.goto(`http://localhost:3000${authPage}`);
        await page.waitForTimeout(2000);
        
        const url = page.url();
        const title = await page.title();
        
        console.log(`页面 ${authPage}: URL="${url}", 标题="${title}"`);
        
        // 检查是否有登录表单
        const emailInputs = await page.locator('input[type="email"], input[name="email"]').count();
        const passwordInputs = await page.locator('input[type="password"], input[name="password"]').count();
        
        if (emailInputs > 0 || passwordInputs > 0) {
          console.log(`在 ${authPage} 找到登录表单: 邮箱输入框=${emailInputs}, 密码输入框=${passwordInputs}`);
        }
      } catch (error) {
        console.log(`访问 ${authPage} 失败:`, error.message);
      }
    }
    
    // 基本断言
    expect(true).toBe(true);
  });
});