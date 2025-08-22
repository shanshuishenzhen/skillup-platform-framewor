/**
 * Jest测试配置文件
 * 
 * 配置包括：
 * 1. 测试环境设置
 * 2. 文件匹配模式
 * 3. 模块解析配置
 * 4. 覆盖率报告设置
 * 5. 测试超时和重试配置
 */

module.exports = {
  // 测试环境
  testEnvironment: 'node',
  
  // 预设配置
  preset: 'ts-jest',
  
  // 根目录
  rootDir: '.',
  
  // 测试文件匹配模式
  testMatch: [
    '<rootDir>/src/tests/**/*.test.ts',
    '<rootDir>/src/tests/**/*.test.tsx',
    '<rootDir>/src/**/__tests__/**/*.ts',
    '<rootDir>/src/**/__tests__/**/*.tsx'
  ],
  
  // 忽略的测试文件
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/.next/',
    '<rootDir>/dist/',
    '<rootDir>/build/'
  ],
  
  // 模块文件扩展名
  moduleFileExtensions: [
    'ts',
    'tsx',
    'js',
    'jsx',
    'json'
  ],
  
  // 模块名称映射（支持路径别名）
  moduleNameMapper: {
    // TypeScript路径映射
    '^@/(.*)$': '<rootDir>/src/$1',
    
    // 静态资源模拟
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$': '<rootDir>/src/tests/__mocks__/fileMock.js',
    
    // Next.js特定模拟
    '^next/image$': '<rootDir>/src/tests/__mocks__/nextImageMock.js',
    '^next/router$': '<rootDir>/src/tests/__mocks__/nextRouterMock.js',
    '^next/navigation$': '<rootDir>/src/tests/__mocks__/nextNavigationMock.js'
  },
  
  // 模块目录
  moduleDirectories: [
    'node_modules',
    '<rootDir>/src'
  ],
  
  // 设置文件
  setupFilesAfterEnv: [
    '<rootDir>/src/tests/setup.ts'
  ],
  
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
  
  // 覆盖率配置
  collectCoverage: false,
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/tests/**/*',
    '!src/**/__tests__/**/*',
    '!src/**/*.test.{ts,tsx}',
    '!src/**/*.spec.{ts,tsx}',
    '!src/app/layout.tsx',
    '!src/app/page.tsx',
    '!src/app/globals.css',
    '!src/middleware.ts'
  ],
  
  // 覆盖率报告格式
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov',
    'json'
  ],
  
  // 覆盖率输出目录
  coverageDirectory: '<rootDir>/coverage',
  
  // 覆盖率阈值（暂时禁用）
  // coverageThreshold: {
  //   global: {
  //     branches: 30,
  //     functions: 30,
  //     lines: 30,
  //     statements: 30
  //   }
  // },
  
  // 测试超时（毫秒）
  testTimeout: 30000,
  
  // 全局变量
  globals: {},
  
  // 清除模拟
  clearMocks: true,
  restoreMocks: true,
  resetMocks: true,
  
  // 详细输出
  verbose: true,
  
  // 错误时停止
  bail: false,
  
  // 最大工作进程数
  maxWorkers: '50%',
  
  // 缓存目录
  cacheDirectory: '<rootDir>/node_modules/.cache/jest',
  
  // 监听模式配置
  watchPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/.next/',
    '<rootDir>/dist/',
    '<rootDir>/coverage/'
  ],
  
  // 测试结果处理器
  reporters: [
    'default',
    ['jest-html-reporters', {
      publicPath: './coverage/html-report',
      filename: 'report.html',
      expand: true
    }]
  ],
  
  // 错误处理
  errorOnDeprecated: true,
  
  // 强制退出
  forceExit: false,
  
  // 检测打开的句柄
  detectOpenHandles: true,
  
  // 检测泄漏
  detectLeaks: false,
  
  // 随机化测试顺序
  randomize: false,
  
  // 测试序列化器
  snapshotSerializers: [],
  
  // 自定义匹配器
  setupFiles: [],
  
  // 测试环境选项
  testEnvironmentOptions: {
    url: 'http://localhost:3000'
  },
  
};