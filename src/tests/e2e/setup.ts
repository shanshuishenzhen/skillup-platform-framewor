/**
 * 端到端测试环境设置
 * 配置浏览器环境、测试数据和全局变量
 */

// Playwright 测试环境无需此导入，如有需要请用 test.beforeAll/test.afterAll

// 全局测试配置
const E2E_CONFIG = {
  // 测试超时时间
  timeout: 120000,
  
  // 浏览器配置
  browser: {
    headless: true,
    slowMo: 0,
    devtools: false
  },
  
  // 测试环境URL
  baseUrl: process.env.TEST_BASE_URL || 'http://localhost:3000',
  
  // 数据库配置
  database: {
    testSchema: 'test_e2e',
    cleanupAfterTest: true
  }
};

/**
 * 全局测试前置设置
 * 初始化测试环境、数据库连接等
 */
beforeAll(async () => {
  console.log('🚀 开始端到端测试环境初始化...');
  
  try {
    // 设置测试超时时间
    jest.setTimeout(E2E_CONFIG.timeout);
    
    // 等待应用启动
    await waitForApplication();
    
    // 初始化测试数据库
    await initializeTestDatabase();
    
    console.log('✅ 端到端测试环境初始化完成');
  } catch (error) {
    console.error('❌ 端到端测试环境初始化失败:', error);
    throw error;
  }
}, E2E_CONFIG.timeout);

/**
 * 全局测试后置清理
 * 清理测试数据、关闭连接等
 */
afterAll(async () => {
  console.log('🧹 开始端到端测试环境清理...');
  
  try {
    // 清理测试数据
    await cleanupTestData();
    
    // 关闭数据库连接
    await closeTestDatabase();
    
    console.log('✅ 端到端测试环境清理完成');
  } catch (error) {
    console.error('❌ 端到端测试环境清理失败:', error);
  }
}, 30000);

/**
 * 每个测试前的设置
 * 重置测试状态、准备测试数据等
 */
beforeEach(async () => {
  // 重置测试状态
  await resetTestState();
  
  // 清理浏览器状态（如果使用浏览器测试）
  await clearBrowserState();
});

/**
 * 每个测试后的清理
 * 清理测试数据、重置状态等
 */
afterEach(async () => {
  // 清理当前测试的数据
  await cleanupCurrentTestData();
  
  // 截图（如果测试失败）
  await captureScreenshotOnFailure();
});

/**
 * 等待应用启动
 */
async function waitForApplication(): Promise<void> {
  const maxRetries = 30;
  const retryInterval = 1000;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      // 检查应用是否可访问
      const response = await fetch(E2E_CONFIG.baseUrl + '/api/health');
      if (response.ok) {
        console.log('✅ 应用已启动并可访问');
        return;
      }
    } catch (error) {
      // 忽略连接错误，继续重试
    }
    
    console.log(`⏳ 等待应用启动... (${i + 1}/${maxRetries})`);
    await new Promise(resolve => setTimeout(resolve, retryInterval));
  }
  
  throw new Error('应用启动超时');
}

/**
 * 初始化测试数据库
 */
async function initializeTestDatabase(): Promise<void> {
  // 这里可以添加数据库初始化逻辑
  console.log('📊 初始化测试数据库...');
  
  // 创建测试模式
  // 设置测试数据
  // 配置权限等
}

/**
 * 清理测试数据
 */
async function cleanupTestData(): Promise<void> {
  console.log('🗑️ 清理测试数据...');
  
  // 清理所有测试数据
  // 重置数据库状态
}

/**
 * 关闭测试数据库连接
 */
async function closeTestDatabase(): Promise<void> {
  console.log('🔌 关闭数据库连接...');
  
  // 关闭数据库连接
}

/**
 * 重置测试状态
 */
async function resetTestState(): Promise<void> {
  // 重置全局状态
  // 清理缓存
  // 重置模拟数据
}

/**
 * 清理浏览器状态
 */
async function clearBrowserState(): Promise<void> {
  // 清理 localStorage
  // 清理 sessionStorage
  // 清理 cookies
  // 重置浏览器状态
}

/**
 * 清理当前测试数据
 */
async function cleanupCurrentTestData(): Promise<void> {
  // 清理当前测试产生的数据
}

/**
 * 测试失败时截图
 */
async function captureScreenshotOnFailure(): Promise<void> {
  // 如果测试失败，保存截图
  // 这里可以集成 Playwright 或 Puppeteer
}

// 导出配置供测试使用
export { E2E_CONFIG };

// 导出辅助函数
export {
  waitForApplication,
  initializeTestDatabase,
  cleanupTestData,
  resetTestState
};