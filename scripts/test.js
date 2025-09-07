/**
 * 测试脚本
 * 提供一键运行所有测试的功能
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 颜色输出函数
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function colorLog(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// 测试配置
const testConfigs = {
  unit: {
    name: '单元测试',
    pattern: 'src/tests/unit/**/*.test.ts',
    description: '测试各个服务函数的核心功能'
  },
  integration: {
    name: 'API集成测试',
    pattern: 'src/tests/integration/**/*.test.ts',
    description: '测试API接口的完整流程'
  },
  e2e: {
    name: '端到端测试',
    pattern: 'src/tests/e2e/**/*.test.ts',
    description: '模拟用户完整操作流程'
  },
  database: {
    name: '数据库测试',
    pattern: 'src/tests/database/**/*.test.ts',
    description: '验证数据操作的正确性'
  }
};

/**
 * 运行指定类型的测试
 * @param {string} testType - 测试类型
 * @param {object} options - 运行选项
 */
function runTests(testType, options = {}) {
  const config = testConfigs[testType];
  if (!config) {
    colorLog(`❌ 未知的测试类型: ${testType}`, 'red');
    return false;
  }

  colorLog(`\n🚀 开始运行 ${config.name}`, 'cyan');
  colorLog(`📝 ${config.description}`, 'blue');
  colorLog(`📂 测试文件: ${config.pattern}`, 'yellow');
  
  try {
    const jestArgs = [
      '--testPathPattern=' + config.pattern.replace(/\//g, '\\\\'),
      '--verbose'
    ];

    // 添加覆盖率选项
    if (options.coverage) {
      jestArgs.push('--coverage');
      jestArgs.push('--coverageDirectory=coverage/' + testType);
    }

    // 添加监听模式
    if (options.watch) {
      jestArgs.push('--watch');
    }

    // 添加静默模式
    if (options.silent) {
      jestArgs.push('--silent');
    }

    // 添加最大工作进程数
    if (options.maxWorkers) {
      jestArgs.push(`--maxWorkers=${options.maxWorkers}`);
    }

    const command = `npx jest ${jestArgs.join(' ')}`;
    colorLog(`\n📋 执行命令: ${command}`, 'magenta');
    
    execSync(command, { 
      stdio: 'inherit',
      cwd: process.cwd()
    });
    
    colorLog(`\n✅ ${config.name} 完成`, 'green');
    return true;
  } catch (error) {
    colorLog(`\n❌ ${config.name} 失败`, 'red');
    if (error.status) {
      colorLog(`退出码: ${error.status}`, 'red');
    }
    return false;
  }
}

/**
 * 运行所有测试
 * @param {object} options - 运行选项
 */
function runAllTests(options = {}) {
  colorLog('\n🎯 开始运行所有测试套件', 'bright');
  colorLog('=' .repeat(50), 'cyan');
  
  const results = {};
  const testTypes = Object.keys(testConfigs);
  
  for (const testType of testTypes) {
    const success = runTests(testType, { ...options, coverage: false });
    results[testType] = success;
    
    if (!success && options.failFast) {
      colorLog('\n🛑 检测到测试失败，停止执行 (--fail-fast)', 'red');
      break;
    }
  }
  
  // 显示总结
  colorLog('\n📊 测试结果总结', 'bright');
  colorLog('=' .repeat(50), 'cyan');
  
  let totalPassed = 0;
  let totalFailed = 0;
  
  for (const [testType, success] of Object.entries(results)) {
    const config = testConfigs[testType];
    const status = success ? '✅ 通过' : '❌ 失败';
    const color = success ? 'green' : 'red';
    
    colorLog(`${config.name}: ${status}`, color);
    
    if (success) {
      totalPassed++;
    } else {
      totalFailed++;
    }
  }
  
  colorLog('\n📈 统计信息:', 'bright');
  colorLog(`通过: ${totalPassed}`, 'green');
  colorLog(`失败: ${totalFailed}`, totalFailed > 0 ? 'red' : 'green');
  colorLog(`总计: ${totalPassed + totalFailed}`, 'blue');
  
  if (totalFailed === 0) {
    colorLog('\n🎉 所有测试都通过了！', 'green');
  } else {
    colorLog(`\n⚠️  有 ${totalFailed} 个测试套件失败`, 'red');
  }
  
  return totalFailed === 0;
}

/**
 * 生成测试覆盖率报告
 */
function generateCoverageReport() {
  colorLog('\n📊 生成测试覆盖率报告', 'cyan');
  
  try {
    execSync('npx jest --coverage --coverageDirectory=coverage/all', {
      stdio: 'inherit',
      cwd: process.cwd()
    });
    
    colorLog('\n✅ 覆盖率报告生成完成', 'green');
    colorLog('📁 报告位置: coverage/all/lcov-report/index.html', 'blue');
  } catch (error) {
    colorLog('\n❌ 覆盖率报告生成失败', 'red');
  }
}

/**
 * 清理测试缓存和输出
 */
function cleanTestCache() {
  colorLog('\n🧹 清理测试缓存', 'yellow');
  
  try {
    // 清理Jest缓存
    execSync('npx jest --clearCache', { stdio: 'inherit' });
    
    // 清理覆盖率报告
    const coverageDir = path.join(process.cwd(), 'coverage');
    if (fs.existsSync(coverageDir)) {
      fs.rmSync(coverageDir, { recursive: true, force: true });
      colorLog('🗑️  已删除覆盖率报告目录', 'yellow');
    }
    
    colorLog('✅ 缓存清理完成', 'green');
  } catch (error) {
    colorLog('❌ 缓存清理失败', 'red');
    console.error(error.message);
  }
}

/**
 * 检查测试环境
 */
function checkTestEnvironment() {
  colorLog('\n🔍 检查测试环境', 'cyan');
  
  const checks = [
    {
      name: 'Node.js版本',
      check: () => {
        const version = process.version;
        const major = parseInt(version.slice(1).split('.')[0]);
        return major >= 16;
      },
      message: () => `当前版本: ${process.version}`
    },
    {
      name: 'Jest配置文件',
      check: () => fs.existsSync(path.join(process.cwd(), 'jest.config.js')),
      message: () => 'jest.config.js'
    },
    {
      name: '测试设置文件',
      check: () => fs.existsSync(path.join(process.cwd(), 'src/tests/setup.ts')),
      message: () => 'src/tests/setup.ts'
    },
    {
      name: 'TypeScript配置',
      check: () => fs.existsSync(path.join(process.cwd(), 'tsconfig.json')),
      message: () => 'tsconfig.json'
    }
  ];
  
  let allPassed = true;
  
  for (const check of checks) {
    const passed = check.check();
    const status = passed ? '✅' : '❌';
    const color = passed ? 'green' : 'red';
    
    colorLog(`${status} ${check.name}: ${check.message()}`, color);
    
    if (!passed) {
      allPassed = false;
    }
  }
  
  if (allPassed) {
    colorLog('\n✅ 测试环境检查通过', 'green');
  } else {
    colorLog('\n❌ 测试环境检查失败，请修复上述问题', 'red');
  }
  
  return allPassed;
}

/**
 * 显示帮助信息
 */
function showHelp() {
  colorLog('\n🔧 测试脚本使用说明', 'bright');
  colorLog('=' .repeat(50), 'cyan');
  
  colorLog('\n📋 可用命令:', 'blue');
  colorLog('  npm run test              - 运行所有测试', 'white');
  colorLog('  npm run test:unit         - 运行单元测试', 'white');
  colorLog('  npm run test:integration  - 运行集成测试', 'white');
  colorLog('  npm run test:e2e          - 运行端到端测试', 'white');
  colorLog('  npm run test:database     - 运行数据库测试', 'white');
  colorLog('  npm run test:coverage     - 生成覆盖率报告', 'white');
  colorLog('  npm run test:clean        - 清理测试缓存', 'white');
  colorLog('  npm run test:check        - 检查测试环境', 'white');
  
  colorLog('\n⚙️  可用选项:', 'blue');
  colorLog('  --watch                   - 监听模式', 'white');
  colorLog('  --coverage                - 生成覆盖率', 'white');
  colorLog('  --silent                  - 静默模式', 'white');
  colorLog('  --fail-fast               - 遇到失败立即停止', 'white');
  colorLog('  --max-workers=<number>    - 最大工作进程数', 'white');
  
  colorLog('\n📝 示例:', 'blue');
  colorLog('  node scripts/test.js unit --coverage', 'yellow');
  colorLog('  node scripts/test.js all --fail-fast', 'yellow');
  colorLog('  node scripts/test.js e2e --watch', 'yellow');
}

// 主函数
function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    showHelp();
    return;
  }
  
  const command = args[0];
  const options = {
    watch: args.includes('--watch'),
    coverage: args.includes('--coverage'),
    silent: args.includes('--silent'),
    failFast: args.includes('--fail-fast'),
    maxWorkers: args.find(arg => arg.startsWith('--max-workers='))?.split('=')[1]
  };
  
  switch (command) {
    case 'all':
      if (!checkTestEnvironment()) {
        process.exit(1);
      }
      const success = runAllTests(options);
      process.exit(success ? 0 : 1);
      break;
      
    case 'unit':
    case 'integration':
    case 'e2e':
    case 'database':
      if (!checkTestEnvironment()) {
        process.exit(1);
      }
      const testSuccess = runTests(command, options);
      process.exit(testSuccess ? 0 : 1);
      break;
      
    case 'coverage':
      generateCoverageReport();
      break;
      
    case 'clean':
      cleanTestCache();
      break;
      
    case 'check':
      const envSuccess = checkTestEnvironment();
      process.exit(envSuccess ? 0 : 1);
      break;
      
    default:
      colorLog(`❌ 未知命令: ${command}`, 'red');
      showHelp();
      process.exit(1);
  }
}

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
  colorLog('\n💥 未捕获的异常:', 'red');
  console.error(error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  colorLog('\n💥 未处理的Promise拒绝:', 'red');
  console.error('Promise:', promise);
  console.error('Reason:', reason);
  process.exit(1);
});

// 运行主函数
if (require.main === module) {
  main();
}

module.exports = {
  runTests,
  runAllTests,
  generateCoverageReport,
  cleanTestCache,
  checkTestEnvironment
};