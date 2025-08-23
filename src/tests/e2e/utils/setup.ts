/**
 * E2E 测试设置和清理工具
 * 提供测试环境的初始化和清理功能
 */

import { testConfig } from '../config/test-env';

// 扩展 Jest 匹配器
expect.extend({
  toBeValidUUID(received: string) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const pass = uuidRegex.test(received);
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid UUID`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid UUID`,
        pass: false,
      };
    }
  },

  toBeValidEmail(received: string) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const pass = emailRegex.test(received);
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid email`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid email`,
        pass: false,
      };
    }
  },

  toBeValidPhoneNumber(received: string) {
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    const pass = phoneRegex.test(received);
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid phone number`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid phone number`,
        pass: false,
      };
    }
  },

  toHaveValidTimestamp(received: any) {
    const timestamp = new Date(received);
    const pass = !isNaN(timestamp.getTime());
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid timestamp`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid timestamp`,
        pass: false,
      };
    }
  }
});

// 声明自定义匹配器类型
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidUUID(): R;
      toBeValidEmail(): R;
      toBeValidPhoneNumber(): R;
      toHaveValidTimestamp(): R;
    }
  }
}

/**
 * 测试环境设置
 * 在每个测试套件开始前调用
 */
export async function setupTestEnvironment(): Promise<void> {
  console.log('🔧 设置 E2E 测试环境...');
  
  try {
    // 1. 清理之前的测试数据
    await cleanupTestData();
    
    // 2. 初始化测试数据库
    await initializeTestDatabase();
    
    // 3. 创建测试用户
    await createTestUsers();
    
    // 4. 设置测试课程数据
    await setupTestCourses();
    
    // 5. 初始化模拟服务
    await initializeMockServices();
    
    console.log('✅ E2E 测试环境设置完成');
  } catch (error) {
    console.error('❌ E2E 测试环境设置失败:', error);
    throw error;
  }
}

/**
 * 测试环境清理
 * 在每个测试套件结束后调用
 */
export async function cleanupTestEnvironment(): Promise<void> {
  console.log('🧹 清理 E2E 测试环境...');
  
  try {
    // 1. 清理测试数据
    await cleanupTestData();
    
    // 2. 关闭数据库连接
    await closeDatabaseConnections();
    
    // 3. 清理临时文件
    await cleanupTempFiles();
    
    // 4. 停止模拟服务
    await stopMockServices();
    
    console.log('✅ E2E 测试环境清理完成');
  } catch (error) {
    console.error('❌ E2E 测试环境清理失败:', error);
    // 清理失败不应该阻止测试继续
  }
}

/**
 * 初始化测试数据库
 */
async function initializeTestDatabase(): Promise<void> {
  // 这里应该连接到测试数据库并确保表结构正确
  // 实际实现需要根据使用的数据库类型（PostgreSQL/MySQL/SQLite）来调整
  console.log('📊 初始化测试数据库...');
  
  // 模拟数据库初始化
  await new Promise(resolve => setTimeout(resolve, 100));
}

/**
 * 创建测试用户
 */
async function createTestUsers(): Promise<void> {
  console.log('👥 创建测试用户...');
  
  // 这里应该创建测试所需的用户账户
  // 包括普通用户、管理员用户等
  
  const testUsers = [
    {
      id: 'test-user-1',
      email: testConfig.testUsers.regular.email,
      password: testConfig.testUsers.regular.password,
      phone: testConfig.testUsers.regular.phone,
      role: 'user',
      isVerified: true
    },
    {
      id: 'test-admin-1',
      email: testConfig.testUsers.admin.email,
      password: testConfig.testUsers.admin.password,
      role: 'admin',
      isVerified: true
    }
  ];
  
  // 模拟用户创建
  await new Promise(resolve => setTimeout(resolve, 100));
}

/**
 * 设置测试课程数据
 */
async function setupTestCourses(): Promise<void> {
  console.log('📚 设置测试课程数据...');
  
  // 这里应该创建测试所需的课程数据
  const testCourses = [
    {
      id: 'test-course-1',
      title: '测试课程 1',
      description: '这是一个测试课程',
      price: 99.99,
      lessons: [
        {
          id: 'test-lesson-1',
          title: '测试课时 1',
          duration: 600, // 10 分钟
          videoUrl: '/test-videos/lesson1.mp4'
        }
      ]
    }
  ];
  
  // 模拟课程数据创建
  await new Promise(resolve => setTimeout(resolve, 100));
}

/**
 * 初始化模拟服务
 */
async function initializeMockServices(): Promise<void> {
  console.log('🔧 初始化模拟服务...');
  
  // 这里应该启动各种模拟服务
  // 如模拟的短信服务、人脸识别服务、支付服务等
  
  // 模拟服务初始化
  await new Promise(resolve => setTimeout(resolve, 100));
}

/**
 * 清理测试数据
 */
async function cleanupTestData(): Promise<void> {
  console.log('🗑️ 清理测试数据...');
  
  // 这里应该清理所有测试创建的数据
  // 包括用户、课程、订单、学习进度等
  
  // 模拟数据清理
  await new Promise(resolve => setTimeout(resolve, 100));
}

/**
 * 关闭数据库连接
 */
async function closeDatabaseConnections(): Promise<void> {
  console.log('🔌 关闭数据库连接...');
  
  // 这里应该关闭所有数据库连接
  // 包括主数据库、Redis 等
  
  // 模拟连接关闭
  await new Promise(resolve => setTimeout(resolve, 50));
}

/**
 * 清理临时文件
 */
async function cleanupTempFiles(): Promise<void> {
  console.log('📁 清理临时文件...');
  
  // 这里应该清理测试过程中创建的临时文件
  // 如上传的测试图片、生成的报告等
  
  // 模拟文件清理
  await new Promise(resolve => setTimeout(resolve, 50));
}

/**
 * 停止模拟服务
 */
async function stopMockServices(): Promise<void> {
  console.log('⏹️ 停止模拟服务...');
  
  // 这里应该停止所有启动的模拟服务
  
  // 模拟服务停止
  await new Promise(resolve => setTimeout(resolve, 50));
}

/**
 * 等待指定时间
 * @param ms 等待时间（毫秒）
 */
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 重试执行函数
 * @param fn 要执行的函数
 * @param maxAttempts 最大重试次数
 * @param delay 重试间隔（毫秒）
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxAttempts) {
        throw lastError;
      }
      
      console.log(`重试 ${attempt}/${maxAttempts} 失败，${delay}ms 后重试...`);
      await wait(delay);
    }
  }
  
  throw lastError!;
}
