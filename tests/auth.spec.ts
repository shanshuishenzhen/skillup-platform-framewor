import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  // Use a random phone number for each test run to avoid conflicts
  const standardUserPhone = `139${Math.floor(10000000 + Math.random() * 90000000)}`;
  const paidUserPhone = `138${Math.floor(10000000 + Math.random() * 90000000)}0`; // Ends in 0
  const password = 'password123';

  test('should allow a user to register', async ({ page }) => {
    await page.goto('/register');

    await page.locator('input[id=phone]').fill(standardUserPhone);
    await page.locator('input[id=password]').fill(password);

    // Intercept the API call to check the response
    const responsePromise = page.waitForResponse('**/api/auth/register');
    await page.getByRole('button', { name: '注册' }).click();

    const response = await responsePromise;
    expect(response.status()).toBe(201);

    const body = await response.json();
    expect(body.message).toBe('注册成功');
    expect(body.user.phone).toBe(standardUserPhone);
  });

  test('should allow a standard user to log in', async ({ page }) => {
    // First, create the user by calling the API directly
    await page.request.post('/api/auth/register', {
      data: {
        phone: standardUserPhone,
        password: password,
      },
    });

    await page.goto('/login');

    await page.locator('input[id=phone]').fill(standardUserPhone);
    await page.locator('input[id=password]').fill(password);
    await page.getByRole('button', { name: '登录' }).click();

    // Assert that the user is redirected to the homepage
    await expect(page).toHaveURL('/');
  });

  test('should show an error for incorrect password', async ({ page }) => {
     await page.request.post('/api/auth/register', {
      data: {
        phone: standardUserPhone,
        password: password,
      },
    });

    await page.goto('/login');

    await page.locator('input[id=phone]').fill(standardUserPhone);
    await page.locator('input[id=password]').fill('wrongpassword');
    await page.getByRole('button', { name: '登录' }).click();

    // Assert that the error message is visible
    const errorMessage = page.locator('.text-red-500');
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toContainText('手机号或密码错误');
  });

  test('should trigger face scan modal for a paid user', async ({ page }) => {
    // Register a paid user
    await page.request.post('/api/auth/register', {
      data: {
        phone: paidUserPhone,
        password: password,
      },
    });

    await page.goto('/login');

    await page.locator('input[id=phone]').fill(paidUserPhone);
    await page.locator('input[id=password]').fill(password);

    // Intercept the API call
    const responsePromise = page.waitForResponse('**/api/auth/login');
    await page.getByRole('button', { name: '登录' }).click();
    const response = await responsePromise;

    // Assert the API response indicates face scan is needed
    const body = await response.json();
    expect(body.needsFaceScan).toBe(true);

    // Assert the face scan modal is visible
    const modalTitle = page.getByRole('heading', { name: '人脸识别' });
    await expect(modalTitle).toBeVisible();
  });
});
