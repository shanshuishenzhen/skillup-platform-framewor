/**
 * Jest测试框架配置文件
 * 
 * 配置Jest测试环境，包括：
 * 1. 测试环境设置
 * 2. 文件匹配模式
 * 3. 模块解析
 * 4. 覆盖率配置
 * 5. 测试设置
 * 
 * @author SOLO Coding
 * @version 1.0.0
 */

// 导出Jest配置
module.exports = {
  // 基础配置
  preset: 'ts-jest',
  testEnvironment: 'node',
  verbose: true,
  
  // 测试文件匹配模式
  testMatch: [
    '<rootDir>/src/tests/**/*.test.{ts,js}'
  ],
  
  // 忽略的测试文件
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/coverage/',
    '<rootDir>/.next/'
  ],
  
  // 模块路径映射
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  
  // 模块文件扩展名
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  
  // 转换配置
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest'
  },
  
  // 忽略转换的模块
  transformIgnorePatterns: [
    'node_modules/(?!(.*\\.mjs$))'
  ],
  
  // 测试环境设置
  setupFilesAfterEnv: ['<rootDir>/src/tests/setup.ts'],
  
  // 覆盖率配置
  collectCoverage: false,
  
  // 测试超时
  testTimeout: 30000,
  
  // 清除模拟
  clearMocks: true,
  restoreMocks: true
};