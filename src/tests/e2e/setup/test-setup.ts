import { test as base } from '@playwright/test';
import { setupTestData, cleanupTestData, verifyTestData } from '../test-data/seed';
import { TestHelpers } from '../utils/test-helpers';

/**
 * 扩展的测试类型，包含测试辅助工具
 */
export const test = base.extend<{ testHelpers: TestHelpers }>({
  testHelpers: async ({ page }, use) => {
    const helpers = new TestHelpers(page);
    await use(helpers);
  },
});

export { expect } from '@playwright/test';

/**
 * 全局测试设置
 * 在所有测试开始前运行
 */
export default async function globalSetup() {
  console.log('🚀 开始全局测试设置...');
  
  try {
    // 设置测试数据
    const testData = await setupTestData();
    console.log('✅ 测试数据设置完成');
    
    // 验证测试数据
    const isValid = await verifyTestData();
    if (!isValid) {
      throw new Error('测试数据验证失败');
    }
    console.log('✅ 测试数据验证通过');
    
    // 将测试数据保存到环境变量或文件中，供测试使用
    process.env.TEST_ADMIN_ID = testData.users.adminId;
    process.env.TEST_TEACHER_ID = testData.users.teacherId;
    process.env.TEST_STUDENT_ID = testData.users.studentId;
    process.env.TEST_STUDENT2_ID = testData.users.student2Id;
    process.env.TEST_EXAM_ID = testData.examId;
    
    console.log('🎉 全局测试设置完成');
    return testData;
  } catch (error) {
    console.error('❌ 全局测试设置失败:', error);
    throw error;
  }
}



/**
 * 测试工具函数
 */
export class TestSetup {
  /**
   * 等待服务器启动
   * @param url 服务器URL
   * @param timeout 超时时间（毫秒）
   */
  static async waitForServer(url: string = 'http://localhost:3000', timeout: number = 30000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      try {
        const response = await fetch(url);
        if (response.ok || response.status === 404) {
          console.log(`✅ 服务器已启动: ${url}`);
          return true;
        }
      } catch (error) {
        // 服务器还未启动，继续等待
      }
      
      // 等待1秒后重试
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    throw new Error(`服务器启动超时: ${url}`);
  }
  
  /**
   * 检查数据库连接
   */
  static async checkDatabaseConnection() {
    try {
      const isValid = await verifyTestData();
      if (isValid) {
        console.log('✅ 数据库连接正常');
        return true;
      } else {
        console.log('⚠️ 数据库连接异常，但测试可以继续');
        return false;
      }
    } catch (error) {
      console.error('❌ 数据库连接检查失败:', error);
      return false;
    }
  }
  
  /**
   * 创建测试截图目录
   */
  static async createScreenshotDirectory() {
    const fs = require('fs');
    const path = require('path');
    
    const screenshotDir = path.join(process.cwd(), 'src/tests/e2e/screenshots');
    
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
      console.log('✅ 创建截图目录:', screenshotDir);
    }
  }
  
  /**
   * 清理旧的测试截图
   * @param daysOld 删除多少天前的截图
   */
  static async cleanupOldScreenshots(daysOld: number = 7) {
    const fs = require('fs');
    const path = require('path');
    
    const screenshotDir = path.join(process.cwd(), 'src/tests/e2e/screenshots');
    
    if (!fs.existsSync(screenshotDir)) {
      return;
    }
    
    const files = fs.readdirSync(screenshotDir);
    const cutoffTime = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
    
    let deletedCount = 0;
    
    for (const file of files) {
      const filePath = path.join(screenshotDir, file);
      const stats = fs.statSync(filePath);
      
      if (stats.mtime.getTime() < cutoffTime) {
        fs.unlinkSync(filePath);
        deletedCount++;
      }
    }
    
    if (deletedCount > 0) {
      console.log(`🗑️ 清理了 ${deletedCount} 个旧截图文件`);
    }
  }
}

/**
 * 测试配置常量
 */
export const TEST_CONFIG = {
  baseUrl: 'http://localhost:3000',
  timeout: {
    default: 30000,
    navigation: 10000,
    api: 5000
  },
  retries: {
    ci: 2,
    local: 1
  },
  screenshots: {
    mode: 'only-on-failure' as const,
    fullPage: true
  },
  video: {
    mode: 'retain-on-failure' as const
  }
};

/**
 * 测试数据常量
 */
export const TEST_DATA = {
  // 从环境变量获取测试数据ID
  get adminId() { return process.env.TEST_ADMIN_ID || ''; },
  get teacherId() { return process.env.TEST_TEACHER_ID || ''; },
  get studentId() { return process.env.TEST_STUDENT_ID || ''; },
  get student2Id() { return process.env.TEST_STUDENT2_ID || ''; },
  get examId() { return process.env.TEST_EXAM_ID || ''; }
};

/**
 * 测试标签
 * 用于分类和过滤测试
 */
export const TEST_TAGS = {
  SMOKE: '@smoke',
  REGRESSION: '@regression',
  AUTH: '@auth',
  EXAM: '@exam',
  ADMIN: '@admin',
  TEACHER: '@teacher',
  STUDENT: '@student',
  API: '@api',
  UI: '@ui'
};