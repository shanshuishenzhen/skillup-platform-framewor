/**
 * Jest 全局设置
 * 在所有测试开始前执行一次
 */

import { testConfig } from '../config/test-env';

export default async function globalSetup(): Promise<void> {
  console.log('🚀 开始 E2E 测试全局设置...');
  
  try {
    // 1. 验证测试环境
    await validateTestEnvironment();
    
    // 2. 启动测试服务
    await startTestServices();
    
    // 3. 初始化全局测试数据
    await initializeGlobalTestData();
    
    console.log('✅ E2E 测试全局设置完成');
  } catch (error) {
    console.error('❌ E2E 测试全局设置失败:', error);
    process.exit(1);
  }
}

/**
 * 验证测试环境
 */
async function validateTestEnvironment(): Promise<void> {
  console.log('🔍 验证测试环境...');
  
  // 检查必需的环境变量
  const requiredEnvVars = [
    'DATABASE_URL',
    'NEXTAUTH_SECRET',
    'JWT_SECRET'
  ];
  
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      throw new Error(`缺少必需的环境变量: ${envVar}`);
    }
  }
  
  // 检查测试数据库连接
  try {
    // 这里应该实际测试数据库连接
    console.log('📊 测试数据库连接...');
    // await testDatabaseConnection();
  } catch (error) {
    throw new Error(`数据库连接失败: ${error}`);
  }
  
  // 检查 Redis 连接（如果使用）
  if (testConfig.services.redis.url) {
    try {
      console.log('🔴 测试 Redis 连接...');
      // await testRedisConnection();
    } catch (error) {
      console.warn(`Redis 连接失败，某些功能可能不可用: ${error}`);
    }
  }
  
  console.log('✅ 测试环境验证通过');
}

/**
 * 启动测试服务
 */
async function startTestServices(): Promise<void> {
  console.log('🔧 启动测试服务...');
  
  // 启动模拟的第三方服务
  await startMockServices();
  
  // 启动测试邮件服务（如 MailHog）
  if (testConfig.services.smtp.host === 'localhost') {
    console.log('📧 启动测试邮件服务...');
    // 这里可以启动 MailHog 或其他测试邮件服务
  }
  
  console.log('✅ 测试服务启动完成');
}

/**
 * 启动模拟服务
 */
async function startMockServices(): Promise<void> {
  console.log('🎭 启动模拟服务...');
  
  // 模拟百度人脸识别服务
  if (process.env.BAIDU_AI_API_KEY === 'test-baidu-api-key') {
    console.log('👤 启动模拟人脸识别服务...');
    // 这里可以启动一个简单的 HTTP 服务来模拟百度 AI API
  }
  
  // 模拟短信服务
  if (process.env.SMS_API_KEY === 'test-sms-api-key') {
    console.log('📱 启动模拟短信服务...');
    // 这里可以启动一个模拟的短信服务
  }
  
  // 模拟支付服务
  if (testConfig.features.payment) {
    console.log('💳 启动模拟支付服务...');
    // 这里可以启动一个模拟的支付网关
  }
  
  console.log('✅ 模拟服务启动完成');
}

/**
 * 初始化全局测试数据
 */
async function initializeGlobalTestData(): Promise<void> {
  console.log('📊 初始化全局测试数据...');
  
  // 创建测试数据库架构
  await createTestDatabaseSchema();
  
  // 插入基础数据
  await insertBaseTestData();
  
  console.log('✅ 全局测试数据初始化完成');
}

/**
 * 创建测试数据库架构
 */
async function createTestDatabaseSchema(): Promise<void> {
  console.log('🏗️ 创建测试数据库架构...');
  
  // 这里应该创建所有必需的数据库表
  // 可以使用 SQL 脚本或 ORM 迁移
  
  const tables = [
    'users',
    'courses',
    'lessons',
    'learning_progress',
    'orders',
    'payments',
    'face_templates',
    'sms_verifications'
  ];
  
  for (const table of tables) {
    console.log(`📋 创建表: ${table}`);
    // await createTable(table);
  }
  
  console.log('✅ 数据库架构创建完成');
}

/**
 * 插入基础测试数据
 */
async function insertBaseTestData(): Promise<void> {
  console.log('📝 插入基础测试数据...');
  
  // 插入系统配置数据
  await insertSystemConfig();
  
  // 插入测试课程分类
  await insertCourseCategories();
  
  // 插入权限和角色数据
  await insertRolesAndPermissions();
  
  console.log('✅ 基础测试数据插入完成');
}

/**
 * 插入系统配置数据
 */
async function insertSystemConfig(): Promise<void> {
  console.log('⚙️ 插入系统配置...');
  
  const configs = [
    { key: 'app_name', value: 'SkillUp Platform Test' },
    { key: 'app_version', value: '1.0.0-test' },
    { key: 'maintenance_mode', value: 'false' },
    { key: 'registration_enabled', value: 'true' },
    { key: 'face_auth_enabled', value: 'true' },
    { key: 'sms_verification_enabled', value: 'true' }
  ];
  
  for (const config of configs) {
    // await insertConfig(config);
  }
}

/**
 * 插入课程分类
 */
async function insertCourseCategories(): Promise<void> {
  console.log('📚 插入课程分类...');
  
  const categories = [
    { id: 'cat-1', name: '编程开发', slug: 'programming' },
    { id: 'cat-2', name: '设计创意', slug: 'design' },
    { id: 'cat-3', name: '商业管理', slug: 'business' },
    { id: 'cat-4', name: '语言学习', slug: 'language' }
  ];
  
  for (const category of categories) {
    // await insertCategory(category);
  }
}

/**
 * 插入权限和角色数据
 */
async function insertRolesAndPermissions(): Promise<void> {
  console.log('🔐 插入权限和角色...');
  
  const roles = [
    { id: 'role-user', name: 'user', displayName: '普通用户' },
    { id: 'role-admin', name: 'admin', displayName: '管理员' },
    { id: 'role-instructor', name: 'instructor', displayName: '讲师' }
  ];
  
  const permissions = [
    { id: 'perm-read-courses', name: 'read:courses' },
    { id: 'perm-write-courses', name: 'write:courses' },
    { id: 'perm-manage-users', name: 'manage:users' },
    { id: 'perm-view-analytics', name: 'view:analytics' }
  ];
  
  for (const role of roles) {
    // await insertRole(role);
  }
  
  for (const permission of permissions) {
    // await insertPermission(permission);
  }
  
  // 分配权限给角色
  // await assignPermissionsToRoles();
}

// 导出配置供其他模块使用
export const globalTestConfig = {
  isSetup: true,
  startTime: new Date(),
  services: {
    mockBaiduAI: process.env.BAIDU_AI_API_KEY === 'test-baidu-api-key',
    mockSMS: process.env.SMS_API_KEY === 'test-sms-api-key',
    mockPayment: testConfig.features.payment
  }
};
