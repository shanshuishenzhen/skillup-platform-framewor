import { Page, expect } from '@playwright/test';
import { TEST_USERS } from '../test-data/seed';

/**
 * 测试辅助工具类
 * 提供端到端测试中常用的操作方法
 */
export class TestHelpers {
  constructor(private page: Page) {}

  /**
   * 用户登录
   * @param userType 用户类型 (admin, teacher, student, student2)
   * @param baseUrl 基础URL
   */
  async login(userType: keyof typeof TEST_USERS, baseUrl: string = 'http://localhost:3000') {
    const user = TEST_USERS[userType];
    
    // 导航到登录页面
    await this.page.goto(`${baseUrl}/login`);
    
    // 等待页面加载
    await this.page.waitForLoadState('networkidle');
    
    // 填写登录表单
    await this.page.fill('input[type="email"]', user.email);
    await this.page.fill('input[type="password"]', user.password);
    
    // 点击登录按钮
    await this.page.click('button[type="submit"]');
    
    // 等待登录成功，检查是否跳转到仪表板
    await this.page.waitForURL('**/dashboard', { timeout: 10000 });
    
    // 验证登录成功
    await expect(this.page).toHaveURL(/.*\/dashboard/);
    
    console.log(`用户 ${user.email} (${user.role}) 登录成功`);
  }

  /**
   * 用户登出
   */
  async logout() {
    // 查找登出按钮或菜单
    const logoutButton = this.page.locator('button:has-text("登出"), button:has-text("退出"), [data-testid="logout"]').first();
    
    if (await logoutButton.isVisible()) {
      await logoutButton.click();
    } else {
      // 如果没有直接的登出按钮，尝试点击用户菜单
      const userMenu = this.page.locator('[data-testid="user-menu"], .user-menu, button:has-text("用户")').first();
      if (await userMenu.isVisible()) {
        await userMenu.click();
        await this.page.click('button:has-text("登出"), button:has-text("退出")');
      }
    }
    
    // 等待跳转到登录页面
    await this.page.waitForURL('**/login', { timeout: 5000 });
    
    console.log('用户登出成功');
  }

  /**
   * 等待元素可见
   * @param selector 选择器
   * @param timeout 超时时间（毫秒）
   */
  async waitForElement(selector: string, timeout: number = 5000) {
    await this.page.waitForSelector(selector, { timeout });
  }

  /**
   * 等待并点击元素
   * @param selector 选择器
   * @param timeout 超时时间（毫秒）
   */
  async waitAndClick(selector: string, timeout: number = 5000) {
    await this.waitForElement(selector, timeout);
    await this.page.click(selector);
  }

  /**
   * 等待并填写输入框
   * @param selector 选择器
   * @param value 值
   * @param timeout 超时时间（毫秒）
   */
  async waitAndFill(selector: string, value: string, timeout: number = 5000) {
    await this.waitForElement(selector, timeout);
    await this.page.fill(selector, value);
  }

  /**
   * 截图
   * @param name 截图名称
   */
  async takeScreenshot(name: string) {
    await this.page.screenshot({ 
      path: `src/tests/e2e/screenshots/${name}-${Date.now()}.png`,
      fullPage: true 
    });
  }

  /**
   * 等待页面加载完成
   */
  async waitForPageLoad() {
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * 检查页面是否包含文本
   * @param text 要检查的文本
   */
  async expectPageToContainText(text: string) {
    await expect(this.page.locator('body')).toContainText(text);
  }

  /**
   * 检查元素是否可见
   * @param selector 选择器
   */
  async expectElementToBeVisible(selector: string) {
    await expect(this.page.locator(selector)).toBeVisible();
  }

  /**
   * 检查元素是否不可见
   * @param selector 选择器
   */
  async expectElementToBeHidden(selector: string) {
    await expect(this.page.locator(selector)).toBeHidden();
  }

  /**
   * 填写表单
   * @param formData 表单数据对象
   */
  async fillForm(formData: Record<string, string>) {
    for (const [field, value] of Object.entries(formData)) {
      // 尝试多种选择器模式
      const selectors = [
        `input[name="${field}"]`,
        `input[id="${field}"]`,
        `textarea[name="${field}"]`,
        `textarea[id="${field}"]`,
        `select[name="${field}"]`,
        `select[id="${field}"]`,
        `[data-testid="${field}"]`
      ];
      
      let filled = false;
      for (const selector of selectors) {
        try {
          const element = this.page.locator(selector);
          if (await element.isVisible()) {
            await element.fill(value);
            filled = true;
            break;
          }
        } catch (error) {
          // 继续尝试下一个选择器
        }
      }
      
      if (!filled) {
        console.warn(`无法找到字段: ${field}`);
      }
    }
  }

  /**
   * 等待并验证URL
   * @param urlPattern URL模式
   * @param timeout 超时时间（毫秒）
   */
  async waitForURL(urlPattern: string | RegExp, timeout: number = 10000) {
    await this.page.waitForURL(urlPattern, { timeout });
  }

  /**
   * 等待API响应
   * @param urlPattern API URL模式
   * @param timeout 超时时间（毫秒）
   */
  async waitForAPIResponse(urlPattern: string | RegExp, timeout: number = 10000) {
    return await this.page.waitForResponse(urlPattern, { timeout });
  }

  /**
   * 模拟文件上传
   * @param selector 文件输入选择器
   * @param filePath 文件路径
   */
  async uploadFile(selector: string, filePath: string) {
    await this.page.setInputFiles(selector, filePath);
  }

  /**
   * 等待元素包含文本
   * @param selector 选择器
   * @param text 文本
   * @param timeout 超时时间（毫秒）
   */
  async waitForElementWithText(selector: string, text: string, timeout: number = 5000) {
    await this.page.waitForSelector(`${selector}:has-text("${text}")`, { timeout });
  }

  /**
   * 滚动到元素
   * @param selector 选择器
   */
  async scrollToElement(selector: string) {
    await this.page.locator(selector).scrollIntoViewIfNeeded();
  }

  /**
   * 等待并选择下拉选项
   * @param selector 下拉选择器
   * @param value 选项值
   */
  async selectOption(selector: string, value: string) {
    await this.page.selectOption(selector, value);
  }

  /**
   * 检查复选框
   * @param selector 复选框选择器
   */
  async checkCheckbox(selector: string) {
    await this.page.check(selector);
  }

  /**
   * 取消复选框
   * @param selector 复选框选择器
   */
  async uncheckCheckbox(selector: string) {
    await this.page.uncheck(selector);
  }

  /**
   * 等待加载状态
   * @param state 加载状态
   */
  async waitForLoadState(state: 'load' | 'domcontentloaded' | 'networkidle' = 'networkidle') {
    await this.page.waitForLoadState(state);
  }

  /**
   * 获取元素文本
   * @param selector 选择器
   */
  async getElementText(selector: string): Promise<string> {
    return await this.page.locator(selector).textContent() || '';
  }

  /**
   * 获取元素属性
   * @param selector 选择器
   * @param attribute 属性名
   */
  async getElementAttribute(selector: string, attribute: string): Promise<string | null> {
    return await this.page.locator(selector).getAttribute(attribute);
  }

  /**
   * 等待元素数量
   * @param selector 选择器
   * @param count 期望数量
   * @param timeout 超时时间（毫秒）
   */
  async waitForElementCount(selector: string, count: number, timeout: number = 5000) {
    await this.page.waitForFunction(
      ({ selector, count }) => document.querySelectorAll(selector).length === count,
      { selector, count },
      { timeout }
    );
  }
}