/**
 * 测试覆盖率设置文件
 * 配置覆盖率收集的详细设置和钩子函数
 */

// 全局覆盖率配置
global.coverageConfig = {
  // 是否启用覆盖率收集
  enabled: process.env.COVERAGE === 'true' || process.argv.includes('--coverage'),
  
  // 覆盖率阈值警告
  thresholds: {
    statements: 80,
    branches: 70,
    functions: 75,
    lines: 80
  },
  
  // 关键文件列表（需要更高覆盖率）
  criticalFiles: [
    'src/services/userService.ts',
    'src/services/examService.ts',
    'src/services/questionService.ts',
    'src/services/resultService.ts',
    'src/utils/auth.ts',
    'src/utils/validation.ts',
    'src/utils/database.ts'
  ],
  
  // 排除的文件模式
  excludePatterns: [
    '**/*.test.ts',
    '**/*.spec.ts',
    '**/*.d.ts',
    '**/tests/**',
    '**/node_modules/**',
    '**/.next/**',
    '**/coverage/**'
  ]
};

// 覆盖率收集钩子
beforeAll(() => {
  if (global.coverageConfig.enabled) {
    console.log('🔍 启用测试覆盖率收集');
    console.log(`📊 覆盖率阈值: ${JSON.stringify(global.coverageConfig.thresholds)}`);
  }
});

// 覆盖率报告钩子
afterAll(() => {
  if (global.coverageConfig.enabled) {
    console.log('📈 测试覆盖率收集完成');
    console.log('📁 覆盖率报告已生成到 coverage/ 目录');
  }
});

// 覆盖率警告函数
function checkCoverageThresholds(coverage: any) {
  const { thresholds } = global.coverageConfig;
  const warnings: string[] = [];
  
  Object.entries(thresholds).forEach(([metric, threshold]) => {
    if (coverage[metric] && coverage[metric].pct < threshold) {
      warnings.push(`${metric}: ${coverage[metric].pct}% < ${threshold}%`);
    }
  });
  
  if (warnings.length > 0) {
    console.warn('⚠️  覆盖率警告:');
    warnings.forEach(warning => console.warn(`   ${warning}`));
  }
}

// 关键文件覆盖率检查
function checkCriticalFilesCoverage(coverageMap: any) {
  const { criticalFiles } = global.coverageConfig;
  const uncoveredCriticalFiles: string[] = [];
  
  criticalFiles.forEach(file => {
    const fileCoverage = coverageMap[file];
    if (!fileCoverage || fileCoverage.lines.pct < 90) {
      uncoveredCriticalFiles.push(file);
    }
  });
  
  if (uncoveredCriticalFiles.length > 0) {
    console.warn('🚨 关键文件覆盖率不足 (<90%):');
    uncoveredCriticalFiles.forEach(file => {
      console.warn(`   ${file}`);
    });
  }
}

// 导出覆盖率工具函数
export {
  checkCoverageThresholds,
  checkCriticalFilesCoverage
};

// 类型声明
declare global {
  var coverageConfig: {
    enabled: boolean;
    thresholds: {
      statements: number;
      branches: number;
      functions: number;
      lines: number;
    };
    criticalFiles: string[];
    excludePatterns: string[];
  };
}