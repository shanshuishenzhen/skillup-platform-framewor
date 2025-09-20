/**
 * 测试覆盖率配置文件
 * 定义代码覆盖率的详细设置和阈值
 */

module.exports = {
  // 覆盖率收集配置
  collectCoverage: true,
  collectCoverageFrom: [
    // 包含的文件
    'src/**/*.{js,jsx,ts,tsx}',
    'api/**/*.{js,jsx,ts,tsx}',
    
    // 排除的文件
    '!src/**/*.d.ts',
    '!src/**/*.test.{js,jsx,ts,tsx}',
    '!src/**/*.spec.{js,jsx,ts,tsx}',
    '!src/tests/**/*',
    '!src/**/__tests__/**/*',
    '!src/**/__mocks__/**/*',
    '!src/**/node_modules/**',
    '!src/**/*.config.{js,ts}',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    '!src/types/**/*',
    '!src/lib/constants.ts',
    '!src/lib/env.ts',
    '!**/index.{js,ts}'
  ],
  
  // 覆盖率报告格式
  coverageReporters: [
    'text',           // 控制台文本报告
    'text-summary',   // 控制台摘要报告
    'html',           // HTML报告
    'lcov',           // LCOV报告（用于CI/CD）
    'json',           // JSON报告
    'json-summary',   // JSON摘要报告
    'cobertura',      // Cobertura XML报告
    'clover'          // Clover XML报告
  ],
  
  // 覆盖率输出目录
  coverageDirectory: 'coverage',
  
  // 覆盖率阈值设置
  coverageThreshold: {
    // 全局阈值
    global: {
      branches: 80,     // 分支覆盖率
      functions: 85,    // 函数覆盖率
      lines: 85,        // 行覆盖率
      statements: 85    // 语句覆盖率
    },
    
    // 服务层阈值（更高要求）
    'src/services/**/*.ts': {
      branches: 90,
      functions: 95,
      lines: 95,
      statements: 95
    },
    
    // 工具函数阈值
    'src/utils/**/*.ts': {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90
    },
    
    // API路由阈值
    'api/**/*.ts': {
      branches: 75,
      functions: 80,
      lines: 80,
      statements: 80
    },
    
    // 组件阈值（相对较低）
    'src/components/**/*.{tsx,ts}': {
      branches: 70,
      functions: 75,
      lines: 75,
      statements: 75
    },
    
    // 页面组件阈值
    'src/pages/**/*.{tsx,ts}': {
      branches: 60,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  
  // 覆盖率提供者
  coverageProvider: 'v8',
  
  // 覆盖率路径忽略模式
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/coverage/',
    '/dist/',
    '/build/',
    '/.next/',
    '/public/',
    '/scripts/',
    '/docs/',
    '\\.config\\.(js|ts)$',
    '\\.d\\.ts$'
  ],
  
  // 强制覆盖率
  forceCoverageMatch: [
    '**/src/services/**/*.ts',
    '**/src/utils/**/*.ts'
  ],
  
  // 覆盖率报告配置
  coverageReporterConfig: {
    html: {
      // HTML报告配置
      subdir: 'html',
      skipCovered: false,
      skipEmpty: false
    },
    lcov: {
      // LCOV报告配置
      outputFile: 'lcov.info'
    },
    text: {
      // 文本报告配置
      maxCols: 120,
      skipCovered: false,
      skipEmpty: false
    },
    'text-summary': {
      // 文本摘要配置
      file: 'coverage-summary.txt'
    },
    json: {
      // JSON报告配置
      file: 'coverage.json'
    },
    'json-summary': {
      // JSON摘要配置
      file: 'coverage-summary.json'
    }
  },
  
  // 自定义覆盖率报告脚本
  customReporters: {
    // 详细的控制台报告
    detailed: {
      reporter: 'text',
      options: {
        maxCols: 120,
        skipCovered: false,
        skipEmpty: false
      }
    },
    
    // 简洁的控制台报告
    summary: {
      reporter: 'text-summary',
      options: {
        skipCovered: true,
        skipEmpty: true
      }
    },
    
    // 团队报告（包含详细信息）
    team: {
      reporter: 'html',
      options: {
        subdir: 'team-report',
        skipCovered: false,
        skipEmpty: false,
        includeTimestamp: true
      }
    }
  },
  
  // 覆盖率分析配置
  analysis: {
    // 未覆盖代码分析
    uncovered: {
      enabled: true,
      threshold: 10, // 未覆盖行数阈值
      reportFile: 'uncovered-analysis.json'
    },
    
    // 覆盖率趋势分析
    trends: {
      enabled: true,
      historyFile: 'coverage-history.json',
      maxHistory: 30 // 保留30次历史记录
    },
    
    // 热点分析（经常变更的文件）
    hotspots: {
      enabled: true,
      threshold: 5, // 变更次数阈值
      reportFile: 'hotspots-analysis.json'
    }
  },
  
  // 覆盖率徽章配置
  badges: {
    enabled: true,
    outputDir: 'coverage/badges',
    formats: ['svg', 'json'],
    thresholds: {
      excellent: 95,
      good: 85,
      acceptable: 75,
      poor: 60
    }
  },
  
  // 集成配置
  integrations: {
    // GitHub Actions
    github: {
      enabled: true,
      commentOnPR: true,
      failOnThreshold: true,
      uploadToCodecov: false
    },
    
    // SonarQube
    sonarqube: {
      enabled: false,
      serverUrl: process.env.SONAR_HOST_URL,
      token: process.env.SONAR_TOKEN
    },
    
    // Codecov
    codecov: {
      enabled: false,
      token: process.env.CODECOV_TOKEN,
      flags: ['unittests', 'integration']
    }
  },
  
  // 通知配置
  notifications: {
    // 覆盖率下降通知
    onDecrease: {
      enabled: true,
      threshold: 2, // 下降超过2%时通知
      channels: ['console', 'file']
    },
    
    // 覆盖率提升通知
    onIncrease: {
      enabled: true,
      threshold: 5, // 提升超过5%时通知
      channels: ['console']
    },
    
    // 阈值未达标通知
    onThresholdFail: {
      enabled: true,
      channels: ['console', 'file'],
      exitOnFail: true
    }
  }
};