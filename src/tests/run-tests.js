#!/usr/bin/env node

/**
 * 测试运行脚本
 * 
 * 提供不同类型的测试运行选项：
 * 1. 单元测试
 * 2. 集成测试
 * 3. 端到端测试
 * 4. 覆盖率测试
 * 5. 监听模式测试
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// 颜色输出
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

// 日志函数
const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  title: (msg) => console.log(`\n${colors.bright}${colors.cyan}${msg}${colors.reset}\n`)
};

// 获取项目根目录
const projectRoot = path.resolve(__dirname, '../..');

// 检查Jest配置文件
const jestConfigPath = path.join(projectRoot, 'jest.config.js');
if (!fs.existsSync(jestConfigPath)) {
  log.error('Jest配置文件不存在: jest.config.js');
  process.exit(1);
}

// 测试配置
const testConfigs = {
  unit: {
    name: '单元测试',
    pattern: 'src/tests/{utils,services,middleware}/**/*.test.ts',
    description: '测试工具函数、服务类和中间件'
  },
  integration: {
    name: '集成测试',
    pattern: 'src/tests/api/**/*.test.ts',
    description: '测试API路由和数据库集成'
  },
  e2e: {
    name: '端到端测试',
    pattern: 'src/tests/e2e/**/*.test.ts',
    description: '测试完整的用户流程'
  },
  all: {
    name: '全部测试',
    pattern: 'src/tests/**/*.test.ts',
    description: '运行所有测试用例'
  }
};

// 运行Jest命令
function runJest(args = [], options = {}) {
  return new Promise((resolve, reject) => {
    const jestPath = path.join(projectRoot, 'node_modules/.bin/jest');
    const isWindows = process.platform === 'win32';
    const command = isWindows ? 'npx' : jestPath;
    const jestArgs = isWindows ? ['jest', ...args] : args;
    
    log.info(`运行命令: ${command} ${jestArgs.join(' ')}`);
    
    const child = spawn(command, jestArgs, {
      cwd: projectRoot,
      stdio: 'inherit',
      shell: isWindows,
      ...options
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        resolve(code);
      } else {
        reject(new Error(`Jest进程退出，代码: ${code}`));
      }
    });
    
    child.on('error', (error) => {
      reject(error);
    });
  });
}

// 显示帮助信息
function showHelp() {
  log.title('🧪 测试运行器');
  
  console.log('用法: node run-tests.js [选项] [测试类型]\n');
  
  console.log('测试类型:');
  Object.entries(testConfigs).forEach(([key, config]) => {
    console.log(`  ${colors.green}${key.padEnd(12)}${colors.reset} ${config.description}`);
  });
  
  console.log('\n选项:');
  console.log(`  ${colors.green}--watch${colors.reset}        监听模式，文件变化时自动重新运行测试`);
  console.log(`  ${colors.green}--coverage${colors.reset}     生成覆盖率报告`);
  console.log(`  ${colors.green}--verbose${colors.reset}      详细输出模式`);
  console.log(`  ${colors.green}--silent${colors.reset}       静默模式，减少输出`);
  console.log(`  ${colors.green}--bail${colors.reset}         遇到第一个失败测试时停止`);
  console.log(`  ${colors.green}--maxWorkers${colors.reset}   设置最大工作进程数`);
  console.log(`  ${colors.green}--updateSnapshot${colors.reset} 更新快照`);
  console.log(`  ${colors.green}--help${colors.reset}         显示此帮助信息`);
  
  console.log('\n示例:');
  console.log(`  ${colors.cyan}node run-tests.js unit${colors.reset}                    # 运行单元测试`);
  console.log(`  ${colors.cyan}node run-tests.js integration --coverage${colors.reset}   # 运行集成测试并生成覆盖率`);
  console.log(`  ${colors.cyan}node run-tests.js all --watch${colors.reset}             # 监听模式运行所有测试`);
  console.log(`  ${colors.cyan}node run-tests.js --coverage${colors.reset}              # 运行所有测试并生成覆盖率`);
}

// 解析命令行参数
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    testType: 'all',
    watch: false,
    coverage: false,
    verbose: false,
    silent: false,
    bail: false,
    maxWorkers: null,
    updateSnapshot: false,
    help: false
  };
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--watch' || arg === '-w') {
      options.watch = true;
    } else if (arg === '--coverage' || arg === '-c') {
      options.coverage = true;
    } else if (arg === '--verbose' || arg === '-v') {
      options.verbose = true;
    } else if (arg === '--silent' || arg === '-s') {
      options.silent = true;
    } else if (arg === '--bail' || arg === '-b') {
      options.bail = true;
    } else if (arg === '--updateSnapshot' || arg === '-u') {
      options.updateSnapshot = true;
    } else if (arg === '--maxWorkers') {
      options.maxWorkers = args[++i];
    } else if (testConfigs[arg]) {
      options.testType = arg;
    } else if (!arg.startsWith('-')) {
      // 如果不是选项且不是已知测试类型，假设是自定义模式
      options.testType = arg;
    }
  }
  
  return options;
}

// 构建Jest参数
function buildJestArgs(options) {
  const args = [];
  
  // 测试模式
  if (options.testType && testConfigs[options.testType]) {
    args.push('--testPathPattern', testConfigs[options.testType].pattern);
  }
  
  // 监听模式
  if (options.watch) {
    args.push('--watch');
  }
  
  // 覆盖率
  if (options.coverage) {
    args.push('--coverage');
  }
  
  // 详细输出
  if (options.verbose) {
    args.push('--verbose');
  }
  
  // 静默模式
  if (options.silent) {
    args.push('--silent');
  }
  
  // 遇到失败时停止
  if (options.bail) {
    args.push('--bail');
  }
  
  // 最大工作进程
  if (options.maxWorkers) {
    args.push('--maxWorkers', options.maxWorkers);
  }
  
  // 更新快照
  if (options.updateSnapshot) {
    args.push('--updateSnapshot');
  }
  
  return args;
}

// 检查依赖
function checkDependencies() {
  const packageJsonPath = path.join(projectRoot, 'package.json');
  
  if (!fs.existsSync(packageJsonPath)) {
    log.error('package.json文件不存在');
    return false;
  }
  
  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const devDeps = packageJson.devDependencies || {};
    
    const requiredDeps = ['jest', 'ts-jest', '@types/jest'];
    const missingDeps = requiredDeps.filter(dep => !devDeps[dep]);
    
    if (missingDeps.length > 0) {
      log.error(`缺少必要的依赖: ${missingDeps.join(', ')}`);
      log.info('请运行: npm install --save-dev ' + missingDeps.join(' '));
      return false;
    }
    
    return true;
  } catch (error) {
    log.error('读取package.json失败: ' + error.message);
    return false;
  }
}

// 显示测试统计
function showTestStats() {
  const coverageDir = path.join(projectRoot, 'coverage');
  
  if (fs.existsSync(coverageDir)) {
    log.success('覆盖率报告已生成');
    log.info(`查看报告: file://${path.join(coverageDir, 'lcov-report/index.html')}`);
  }
}

// 主函数
async function main() {
  const options = parseArgs();
  
  if (options.help) {
    showHelp();
    return;
  }
  
  log.title('🧪 开始运行测试');
  
  // 检查依赖
  if (!checkDependencies()) {
    process.exit(1);
  }
  
  // 显示测试配置
  const config = testConfigs[options.testType] || { name: '自定义测试', description: options.testType };
  log.info(`测试类型: ${config.name}`);
  log.info(`描述: ${config.description}`);
  
  if (options.watch) {
    log.info('监听模式: 已启用');
  }
  
  if (options.coverage) {
    log.info('覆盖率报告: 已启用');
  }
  
  try {
    // 构建Jest参数
    const jestArgs = buildJestArgs(options);
    
    // 运行测试
    const startTime = Date.now();
    await runJest(jestArgs);
    const endTime = Date.now();
    
    // 显示结果
    log.success(`测试完成，耗时: ${((endTime - startTime) / 1000).toFixed(2)}秒`);
    
    if (options.coverage) {
      showTestStats();
    }
    
  } catch (error) {
    log.error('测试运行失败: ' + error.message);
    process.exit(1);
  }
}

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
  log.error('未捕获的异常: ' + error.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  log.error('未处理的Promise拒绝: ' + reason);
  process.exit(1);
});

// 处理中断信号
process.on('SIGINT', () => {
  log.warning('\n测试被用户中断');
  process.exit(0);
});

process.on('SIGTERM', () => {
  log.warning('\n测试被终止');
  process.exit(0);
});

// 运行主函数
if (require.main === module) {
  main().catch((error) => {
    log.error('运行失败: ' + error.message);
    process.exit(1);
  });
}

module.exports = {
  runJest,
  testConfigs,
  parseArgs,
  buildJestArgs
};