/**
 * Playwright端到端测试配置文件
 * 
 * 配置Playwright测试环境，包括：
 * 1. 浏览器设置
 * 2. 测试环境配置
 * 3. 报告生成
 * 4. 并行执行设置
 * 5. 全局设置和清理
 * 
 * @author SOLO Coding
 * @version 1.0.0
 */

import { defineConfig, devices } from '@playwright/test';
import { globalSetup, globalTeardown } from './src/tests/e2e/setup/test-setup';

/**
 * 从环境变量读取配置
 */
const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';
const headless = process.env.PLAYWRIGHT_HEADLESS !== 'false';

export default defineConfig({
  // 测试目录
  testDir: './src/tests/e2e',
  
  // 全局设置和清理
  globalSetup: require.resolve('./src/tests/e2e/setup/test-setup.ts'),
  globalTeardown: require.resolve('./src/tests/e2e/setup/test-teardown.ts'),
  
  // 全局超时设置
  timeout: 30 * 1000,
  expect: {
    timeout: 5000,
  },
  
  // 测试失败时的重试次数
  retries: process.env.CI ? 2 : 1,
  
  // 并行执行的worker数量
  workers: process.env.CI ? 1 : 2,
  
  // 报告配置
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/e2e-results.json' }],
    ['junit', { outputFile: 'test-results/e2e-results.xml' }],
    ['line']
  ],
  
  // 全局设置
  use: {
    // 基础URL
    baseURL: 'http://localhost:3000',
    
    // 浏览器设置
    headless,
    
    // 截图设置
    screenshot: 'only-on-failure',
    
    // 视频录制
    video: 'retain-on-failure',
    
    // 追踪设置
    trace: 'on-first-retry',
    
    // 忽略HTTPS错误
    ignoreHTTPSErrors: true,
  },
  
  // 项目配置 - 不同浏览器
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // 为端到端测试优化的设置
        viewport: { width: 1280, height: 720 },
        launchOptions: {
          args: ['--disable-web-security', '--disable-features=VizDisplayCompositor']
        }
      },
    },
    {
      name: 'firefox',
      use: { 
        ...devices['Desktop Firefox'],
        viewport: { width: 1280, height: 720 }
      },
    },
    {
      name: 'webkit',
      use: { 
        ...devices['Desktop Safari'],
        viewport: { width: 1280, height: 720 }
      },
    },
    // 移动端测试（可选）
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },
  ],
  
  // Web服务器配置（用于开发环境）
  // webServer: {
  //   command: 'npm run dev',
  //   port: 3005,
  //   reuseExistingServer: !process.env.CI,
  //   timeout: 120 * 1000,
  // },
  
  // 输出目录
  outputDir: 'test-results/',
});