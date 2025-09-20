/**
 * Jest 测试覆盖率配置
 * 配置测试覆盖率报告的生成和阈值
 */

module.exports = {
  // 基础配置继承
  ...require('./jest.config.js'),
  
  // 覆盖率收集配置
  collectCoverage: true,
  
  // 覆盖率收集目录
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.test.{js,jsx,ts,tsx}',
    '!src/**/*.spec.{js,jsx,ts,tsx}',
    '!src/tests/**/*',
    '!src/config/**/*',
    '!src/types/**/*',
    '!src/middleware/cors.ts',
    '!src/middleware/security.ts',
    '!src/utils/logger.ts',
    '!src/utils/monitoring.ts',
    '!src/app/layout.tsx',
    '!src/app/page.tsx',
    '!src/app/globals.css',
    '!src/app/api/health/**/*',
    '!src/app/api/monitoring/**/*',
    '!**/node_modules/**',
    '!**/.next/**',
    '!**/coverage/**',
    '!**/dist/**',
    '!**/build/**'
  ],
  
  // 覆盖率报告格式
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov',
    'json',
    'json-summary',
    'clover'
  ],
  
  // 覆盖率输出目录
  coverageDirectory: 'coverage',
  
  // 覆盖率阈值
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 75,
      lines: 80,
      statements: 80
    },
    // 核心服务要求更高的覆盖率
    'src/services/**/*.ts': {
      branches: 80,
      functions: 85,
      lines: 90,
      statements: 90
    },
    // API 路由覆盖率要求
    'src/app/api/**/*.ts': {
      branches: 75,
      functions: 80,
      lines: 85,
      statements: 85
    },
    // 工具函数覆盖率要求
    'src/utils/**/*.ts': {
      branches: 75,
      functions: 80,
      lines: 85,
      statements: 85
    }
  },
  
  // 覆盖率路径映射
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/.next/',
    '/coverage/',
    '/dist/',
    '/build/',
    '/scripts/',
    '/docs/',
    '/public/',
    '\\.d\\.ts$',
    '\\.test\\.(js|jsx|ts|tsx)$',
    '\\.spec\\.(js|jsx|ts|tsx)$'
  ],
  
  // 覆盖率提供者
  coverageProvider: 'v8',
  
  // 强制覆盖率
  forceCoverageMatch: [
    '**/src/services/**/*.ts',
    '**/src/app/api/**/*.ts',
    '**/src/utils/**/*.ts'
  ],
  
  // 覆盖率报告配置
  reporters: [
    'default',
    [
      'jest-html-reporters',
      {
        publicPath: './coverage/html-report',
        filename: 'report.html',
        expand: true,
        hideIcon: false,
        pageTitle: 'SkillUp Platform - 测试覆盖率报告',
        logoImgPath: undefined,
        inlineSource: false
      }
    ],
    [
      'jest-junit',
      {
        outputDirectory: './coverage',
        outputName: 'junit.xml',
        ancestorSeparator: ' › ',
        uniqueOutputName: 'false',
        suiteNameTemplate: '{filepath}',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}'
      }
    ]
  ],
  
  // 详细输出
  verbose: true,
  
  // 静默模式（CI环境使用）
  silent: process.env.CI === 'true',
  
  // 最大工作进程数
  maxWorkers: process.env.CI ? 2 : '50%',
  
  // 测试超时
  testTimeout: 30000,
  
  // 设置文件
  setupFilesAfterEnv: [
    '<rootDir>/src/tests/config/setup.ts',
    '<rootDir>/src/tests/config/coverage-setup.ts'
  ]
};