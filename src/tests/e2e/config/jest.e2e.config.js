/**
 * Jest E2E 测试配置
 * 专门用于端到端测试的 Jest 配置文件
 */

import path from 'path';

export default {
  // 显示名称
  displayName: 'E2E Tests',
  
  // 测试环境
  testEnvironment: 'node',
  
  // 根目录
  rootDir: path.resolve(__dirname, '../../../..'),
  
  // 测试文件匹配模式
  testMatch: [
    '<rootDir>/src/tests/e2e/specs/**/*.test.ts',
    '<rootDir>/src/tests/e2e/specs/**/*.spec.ts'
  ],
  
  // 忽略的测试文件
  testPathIgnorePatterns: [
    '/node_modules/',
    '/build/',
    '/dist/',
    '/.next/'
  ],
  
  // 模块文件扩展名
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  
  // 模块路径映射
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@tests/(.*)$': '<rootDir>/src/tests/$1',
    '^@e2e/(.*)$': '<rootDir>/src/tests/e2e/$1'
  },
  
  // 转换配置
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        jsx: 'react-jsx',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true
      }
    }]
  },
  
  // 转换忽略模式
  transformIgnorePatterns: [
    'node_modules/(?!(.*\\.mjs$|@supabase|@openai))'
  ],
  
  // 设置文件
  setupFilesAfterEnv: [
    '<rootDir>/src/tests/e2e/utils/setup.ts'
  ],
  
  // 全局设置
  globalSetup: '<rootDir>/src/tests/e2e/utils/global-setup.ts',
  globalTeardown: '<rootDir>/src/tests/e2e/utils/global-teardown.ts',
  
  // 超时设置（E2E 测试需要更长时间）
  testTimeout: 60000, // 60 秒
  
  // 并发设置
  maxWorkers: 1, // E2E 测试通常需要串行执行
  
  // 覆盖率配置
  collectCoverage: false, // E2E 测试通常不收集代码覆盖率
  
  // 如果需要覆盖率，可以启用以下配置
  // collectCoverageFrom: [
  //   'src/app/api/**/*.ts',
  //   'src/services/**/*.ts',
  //   'src/lib/**/*.ts',
  //   '!src/**/*.d.ts',
  //   '!src/tests/**/*'
  // ],
  
  // 覆盖率报告格式
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov'
  ],
  
  // 覆盖率输出目录
  coverageDirectory: '<rootDir>/coverage/e2e',
  
  // 覆盖率阈值
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 60,
      lines: 60,
      statements: 60
    }
  },
  
  // 详细输出
  verbose: true,
  
  // 错误时停止
  bail: false,
  
  // 检测打开的句柄
  detectOpenHandles: true,
  
  // 强制退出
  forceExit: true,
  
  // 自定义报告器
  reporters: [
    'default',
    ['jest-html-reporters', {
      publicPath: '<rootDir>/coverage/e2e/html-report',
      filename: 'e2e-test-report.html',
      expand: true,
      hideIcon: false,
      pageTitle: 'SkillUp Platform E2E Test Report'
    }]
  ],
  
  // 环境变量
  setupFiles: [
    '<rootDir>/src/tests/e2e/config/test-env.ts'
  ],
  
  // 模拟配置
  clearMocks: true,
  restoreMocks: true,
  resetMocks: true,
  
  // 错误处理
  errorOnDeprecated: true,
  
  // 缓存
  cache: false, // E2E 测试禁用缓存确保一致性
  
  // 监听模式配置
  watchPathIgnorePatterns: [
    '/node_modules/',
    '/coverage/',
    '/.next/',
    '/build/'
  ],
  
  // 自定义匹配器
  // setupFilesAfterEnv 中会加载自定义匹配器
  
  // 测试结果处理器
  testResultsProcessor: '<rootDir>/src/tests/e2e/utils/results-processor.js'
};
