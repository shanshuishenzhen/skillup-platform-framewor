import { test, expect } from '@playwright/test';

// 在线考试模块端到端自动化测试

test.describe('在线考试模块 E2E 测试', () => {
  test('管理员登录并创建考试', async ({ page }) => {
    await page.goto('http://localhost:3000/admin/login');
    await page.fill('input[name="username"]', 'admin');
    await page.fill('input[name="password"]', 'admin123456');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*admin/);
    await page.goto('http://localhost:3000/admin/exams');
    await page.click('button:has-text("新建考试")');
    await page.fill('input[name="examName"]', '自动化测试考试');
    await page.click('button:has-text("保存")');
    await expect(page.locator('text=自动化测试考试')).toBeVisible();
  });

  test('添加题目到考试', async ({ page }) => {
    await page.goto('http://localhost:3000/admin/exams');
    await page.click('text=自动化测试考试');
    await page.click('button:has-text("添加题目")');
    await page.fill('textarea[name="content"]', '自动化测试题目内容');
    await page.fill('input[name="optionA"]', '选项A');
    await page.fill('input[name="optionB"]', '选项B');
    await page.fill('input[name="optionC"]', '选项C');
    await page.fill('input[name="optionD"]', '选项D');
    await page.check('input[name="correct_answer"][value="A"]');
    await page.click('button:has-text("保存")');
    await expect(page.locator('text=自动化测试题目内容')).toBeVisible();
  });

  test('学生参与考试并提交', async ({ page }) => {
    await page.goto('http://localhost:3000/login');
    await page.fill('input[name="username"]', 'student1');
    await page.fill('input[name="password"]', 'student123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*dashboard/);
    await page.goto('http://localhost:3000/exams');
    await page.click('text=自动化测试考试');
    await page.check('input[name="answer"][value="A"]');
    await page.click('button:has-text("提交")');
    await expect(page.locator('text=提交成功')).toBeVisible();
  });

  test('管理员查看考试成绩统计', async ({ page }) => {
    await page.goto('http://localhost:3000/admin/login');
    await page.fill('input[name="username"]', 'admin');
    await page.fill('input[name="password"]', 'admin123456');
    await page.click('button[type="submit"]');
    await page.goto('http://localhost:3000/admin/exams');
    await page.click('text=自动化测试考试');
    await page.click('button:has-text("成绩统计")');
    await expect(page.locator('text=考试成绩统计')).toBeVisible();
  });
});
