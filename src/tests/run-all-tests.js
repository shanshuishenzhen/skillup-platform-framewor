/**
 * 自动化测试运行脚本
 * 
 * 提供一键运行所有测试的功能，包括：
 * 1. 单元测试
 * 2. 集成测试
 * 3. 端到端测试
 * 4. 数据库测试
 * 5. 性能测试
 * 6. 测试覆盖率报告
 * 
 * @author SOLO Coding
 * @version 1.0.0
 */

const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

/**
 * 测试配置
 */
const TEST_CONFIG = {
  // 测试套件配置
  suites: {
    unit: {
      name: '单元测试',
      pattern: 'src/tests/**/*.test.ts',
      exclude: ['src/tests/e2e/**', 'src/tests/integration/**', 'src/tests/database/**'],
      timeout: 30000
    },
    integration: {
      name: '集成测试',
      pattern: 'src/tests/integration/**/*.test.ts',
      timeout: 60000
    },
    database: {
      name: '数据库测试',
      pattern: 'src/tests/database/**/*.test.ts',
      timeout: 45000
    },
    e2e: {
      name: '端到端测试',
      pattern: 'src/tests/e2e/**/*.test.ts',
      timeout: 120000
    }
  },
  
  // 报告配置
  reports: {
    coverage: {
      enabled: true,
      threshold: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        }
      },
      outputDir: 'coverage'
    },
    junit: {
      enabled: true,
      outputFile: 'test-results/junit.xml'
    },
    html: {
      enabled: true,
      outputDir: 'test-results/html'
    }
  },
  
  // 环境配置
  environment: {
    NODE_ENV: 'test',
    TEST_TIMEOUT: '60000',
    JEST_WORKERS: '50%'
  }
};

/**
 * 测试结果统计
 */
class TestResults {
  constructor() {
    this.suites = {};
    this.startTime = Date.now();
    this.totalTests = 0;
    this.passedTests = 0;
    this.failedTests = 0;
    this.skippedTests = 0;
  }

  /**
   * 添加测试套件结果
   */
  addSuite(name, result) {
    this.suites[name] = result;
    this.totalTests += result.total || 0;
    this.passedTests += result.passed || 0;
    this.failedTests += result.failed || 0;
    this.skippedTests += result.skipped || 0;
  }

  /**
   * 获取总体结果
   */
  getSummary() {
    const duration = Date.now() - this.startTime;
    const success = this.failedTests === 0;
    
    return {
      success,
      duration,
      total: this.totalTests,
      passed: this.passedTests,
      failed: this.failedTests,
      skipped: this.skippedTests,
      suites: this.suites
    };
  }
}

/**
 * 主测试运行器类
 */
class TestRunner {
  constructor() {
    this.results = new TestResults();
    this.isCI = process.env.CI === 'true';
    this.verbose = process.argv.includes('--verbose');
    this.coverage = !process.argv.includes('--no-coverage');
    this.parallel = !process.argv.includes('--no-parallel');
  }

  /**
   * 运行所有测试
   */
  async runAll() {
    try {
      console.log(chalk.blue.bold('🚀 开始运行自动化测试套件\n'));
      
      // 设置环境变量
      this.setupEnvironment();
      
      // 检查依赖
      await this.checkDependencies();
      
      // 准备测试环境
      await this.setupTestEnvironment();
      
      // 运行测试套件
      await this.runTestSuites();
      
      // 生成报告
      await this.generateReports();
      
      // 显示结果
      this.displayResults();
      
      // 清理环境
      await this.cleanup();
      
      const summary = this.results.getSummary();
      process.exit(summary.success ? 0 : 1);
      
    } catch (error) {
      console.error(chalk.red.bold('❌ 测试运行失败:'), error.message);
      if (this.verbose) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  }

  /**
   * 设置环境变量
   */
  setupEnvironment() {
    Object.assign(process.env, TEST_CONFIG.environment);
    
    if (this.verbose) {
      console.log(chalk.gray('📋 环境变量设置:'));
      Object.entries(TEST_CONFIG.environment).forEach(([key, value]) => {
        console.log(chalk.gray(`  ${key}=${value}`));
      });
      console.log();
    }
  }

  /**
   * 检查依赖
   */
  async checkDependencies() {
    console.log(chalk.yellow('🔍 检查测试依赖...'));
    
    const requiredPackages = [
      'jest',
      '@jest/globals',
      'supertest',
      'puppeteer'
    ];
    
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const allDeps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies
    };
    
    const missing = requiredPackages.filter(pkg => !allDeps[pkg]);
    
    if (missing.length > 0) {
      throw new Error(`缺少必要的测试依赖: ${missing.join(', ')}`);
    }
    
    console.log(chalk.green('✅ 依赖检查通过\n'));
  }

  /**
   * 准备测试环境
   */
  async setupTestEnvironment() {
    console.log(chalk.yellow('🛠️  准备测试环境...'));
    
    // 创建测试结果目录
    const dirs = ['test-results', 'test-results/html', 'coverage'];
    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
    
    // 检查测试数据库连接
    await this.checkDatabaseConnection();
    
    // 启动测试服务器（如果需要）
    if (this.needsTestServer()) {
      await this.startTestServer();
    }
    
    console.log(chalk.green('✅ 测试环境准备完成\n'));
  }

  /**
   * 检查数据库连接
   */
  async checkDatabaseConnection() {
    try {
      const { createClient } = require('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      );
      
      const { error } = await supabase.from('users').select('count').limit(1);
      if (error) {
        throw error;
      }
      
      if (this.verbose) {
        console.log(chalk.gray('  ✅ 数据库连接正常'));
      }
    } catch (error) {
      console.warn(chalk.yellow('  ⚠️  数据库连接检查失败，某些测试可能会跳过'));
      if (this.verbose) {
        console.warn(chalk.gray(`    ${error.message}`));
      }
    }
  }

  /**
   * 检查是否需要测试服务器
   */
  needsTestServer() {
    return process.argv.includes('--with-server') || 
           process.argv.includes('--e2e') ||
           process.argv.includes('--integration');
  }

  /**
   * 启动测试服务器
   */
  async startTestServer() {
    return new Promise((resolve, reject) => {
      console.log(chalk.gray('  🚀 启动测试服务器...'));
      
      const server = spawn('npm', ['run', 'dev'], {
        env: { ...process.env, PORT: '3001' },
        stdio: this.verbose ? 'inherit' : 'pipe'
      });
      
      let started = false;
      const timeout = setTimeout(() => {
        if (!started) {
          server.kill();
          reject(new Error('测试服务器启动超时'));
        }
      }, 30000);
      
      server.stdout?.on('data', (data) => {
        if (data.toString().includes('ready') && !started) {
          started = true;
          clearTimeout(timeout);
          console.log(chalk.gray('  ✅ 测试服务器启动成功'));
          resolve(server);
        }
      });
      
      server.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
      
      // 保存服务器进程以便后续清理
      this.testServer = server;
    });
  }

  /**
   * 运行测试套件
   */
  async runTestSuites() {
    const suiteNames = this.getSuitesToRun();
    
    console.log(chalk.blue.bold(`📝 运行 ${suiteNames.length} 个测试套件\n`));
    
    if (this.parallel && suiteNames.length > 1) {
      await this.runSuitesInParallel(suiteNames);
    } else {
      await this.runSuitesSequentially(suiteNames);
    }
  }

  /**
   * 获取要运行的测试套件
   */
  getSuitesToRun() {
    const args = process.argv.slice(2);
    const suiteFlags = {
      '--unit': 'unit',
      '--integration': 'integration',
      '--database': 'database',
      '--e2e': 'e2e'
    };
    
    const requestedSuites = args
      .filter(arg => suiteFlags[arg])
      .map(arg => suiteFlags[arg]);
    
    return requestedSuites.length > 0 
      ? requestedSuites 
      : Object.keys(TEST_CONFIG.suites);
  }

  /**
   * 并行运行测试套件
   */
  async runSuitesInParallel(suiteNames) {
    console.log(chalk.gray('🔄 并行运行测试套件...\n'));
    
    const promises = suiteNames.map(suiteName => 
      this.runSingleSuite(suiteName)
    );
    
    const results = await Promise.allSettled(promises);
    
    results.forEach((result, index) => {
      const suiteName = suiteNames[index];
      if (result.status === 'fulfilled') {
        this.results.addSuite(suiteName, result.value);
      } else {
        console.error(chalk.red(`❌ ${TEST_CONFIG.suites[suiteName].name} 运行失败:`), result.reason.message);
        this.results.addSuite(suiteName, { failed: 1, error: result.reason.message });
      }
    });
  }

  /**
   * 顺序运行测试套件
   */
  async runSuitesSequentially(suiteNames) {
    for (const suiteName of suiteNames) {
      try {
        const result = await this.runSingleSuite(suiteName);
        this.results.addSuite(suiteName, result);
      } catch (error) {
        console.error(chalk.red(`❌ ${TEST_CONFIG.suites[suiteName].name} 运行失败:`), error.message);
        this.results.addSuite(suiteName, { failed: 1, error: error.message });
      }
    }
  }

  /**
   * 运行单个测试套件
   */
  async runSingleSuite(suiteName) {
    const suite = TEST_CONFIG.suites[suiteName];
    console.log(chalk.cyan(`🧪 运行 ${suite.name}...`));
    
    const startTime = Date.now();
    
    return new Promise((resolve, reject) => {
      const jestArgs = [
        '--testPathPattern', suite.pattern,
        '--testTimeout', suite.timeout.toString(),
        '--passWithNoTests'
      ];
      
      // 添加排除模式
      if (suite.exclude) {
        suite.exclude.forEach(pattern => {
          jestArgs.push('--testPathIgnorePatterns', pattern);
        });
      }
      
      // 添加覆盖率配置
      if (this.coverage && suiteName === 'unit') {
        jestArgs.push('--coverage', '--coverageDirectory', 'coverage');
      }
      
      // 添加报告配置
      if (TEST_CONFIG.reports.junit.enabled) {
        jestArgs.push('--reporters', 'default', '--reporters', 'jest-junit');
      }
      
      const jest = spawn('npx', ['jest', ...jestArgs], {
        stdio: this.verbose ? 'inherit' : 'pipe',
        env: {
          ...process.env,
          JEST_JUNIT_OUTPUT_FILE: `test-results/${suiteName}-junit.xml`
        }
      });
      
      let output = '';
      
      jest.stdout?.on('data', (data) => {
        output += data.toString();
        if (this.verbose) {
          process.stdout.write(data);
        }
      });
      
      jest.stderr?.on('data', (data) => {
        output += data.toString();
        if (this.verbose) {
          process.stderr.write(data);
        }
      });
      
      jest.on('close', (code) => {
        const duration = Date.now() - startTime;
        const result = this.parseJestOutput(output, duration);
        
        if (code === 0) {
          console.log(chalk.green(`✅ ${suite.name} 完成 (${duration}ms)\n`));
          resolve(result);
        } else {
          console.log(chalk.red(`❌ ${suite.name} 失败 (${duration}ms)\n`));
          resolve({ ...result, failed: result.failed || 1 });
        }
      });
      
      jest.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * 解析Jest输出
   */
  parseJestOutput(output, duration) {
    const result = {
      duration,
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0
    };
    
    // 解析测试结果
    const testMatch = output.match(/Tests:\s+(\d+)\s+failed,\s+(\d+)\s+passed,\s+(\d+)\s+total/);
    if (testMatch) {
      result.failed = parseInt(testMatch[1]);
      result.passed = parseInt(testMatch[2]);
      result.total = parseInt(testMatch[3]);
    } else {
      const passMatch = output.match(/Tests:\s+(\d+)\s+passed,\s+(\d+)\s+total/);
      if (passMatch) {
        result.passed = parseInt(passMatch[1]);
        result.total = parseInt(passMatch[2]);
      }
    }
    
    return result;
  }

  /**
   * 生成报告
   */
  async generateReports() {
    console.log(chalk.yellow('📊 生成测试报告...'));
    
    // 生成HTML报告
    if (TEST_CONFIG.reports.html.enabled) {
      await this.generateHtmlReport();
    }
    
    // 生成覆盖率报告
    if (this.coverage && TEST_CONFIG.reports.coverage.enabled) {
      await this.generateCoverageReport();
    }
    
    console.log(chalk.green('✅ 报告生成完成\n'));
  }

  /**
   * 生成HTML报告
   */
  async generateHtmlReport() {
    const summary = this.results.getSummary();
    const html = this.generateHtmlContent(summary);
    
    fs.writeFileSync(
      path.join(TEST_CONFIG.reports.html.outputDir, 'index.html'),
      html
    );
    
    if (this.verbose) {
      console.log(chalk.gray('  ✅ HTML报告已生成'));
    }
  }

  /**
   * 生成HTML内容
   */
  generateHtmlContent(summary) {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>测试报告</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 5px; }
        .success { color: #28a745; }
        .failure { color: #dc3545; }
        .suite { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
        .stats { display: flex; gap: 20px; margin: 10px 0; }
        .stat { padding: 10px; background: #f8f9fa; border-radius: 3px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>自动化测试报告</h1>
        <p>生成时间: ${new Date().toLocaleString()}</p>
        <p class="${summary.success ? 'success' : 'failure'}">
            状态: ${summary.success ? '✅ 通过' : '❌ 失败'}
        </p>
    </div>
    
    <div class="stats">
        <div class="stat">总计: ${summary.total}</div>
        <div class="stat">通过: ${summary.passed}</div>
        <div class="stat">失败: ${summary.failed}</div>
        <div class="stat">跳过: ${summary.skipped}</div>
        <div class="stat">耗时: ${summary.duration}ms</div>
    </div>
    
    <h2>测试套件详情</h2>
    ${Object.entries(summary.suites).map(([name, result]) => `
        <div class="suite">
            <h3>${TEST_CONFIG.suites[name]?.name || name}</h3>
            <p>通过: ${result.passed || 0} | 失败: ${result.failed || 0} | 耗时: ${result.duration || 0}ms</p>
            ${result.error ? `<p class="failure">错误: ${result.error}</p>` : ''}
        </div>
    `).join('')}
</body>
</html>
    `;
  }

  /**
   * 生成覆盖率报告
   */
  async generateCoverageReport() {
    if (fs.existsSync('coverage/lcov-report/index.html')) {
      if (this.verbose) {
        console.log(chalk.gray('  ✅ 覆盖率报告已生成'));
      }
    }
  }

  /**
   * 显示结果
   */
  displayResults() {
    const summary = this.results.getSummary();
    
    console.log(chalk.blue.bold('📋 测试结果汇总'));
    console.log(chalk.blue('='.repeat(50)));
    
    // 总体状态
    const statusColor = summary.success ? chalk.green : chalk.red;
    const statusIcon = summary.success ? '✅' : '❌';
    console.log(statusColor.bold(`${statusIcon} 总体状态: ${summary.success ? '通过' : '失败'}`));
    
    // 统计信息
    console.log(chalk.gray(`⏱️  总耗时: ${summary.duration}ms`));
    console.log(chalk.gray(`📊 测试统计:`));
    console.log(chalk.gray(`   总计: ${summary.total}`));
    console.log(chalk.green(`   通过: ${summary.passed}`));
    console.log(chalk.red(`   失败: ${summary.failed}`));
    console.log(chalk.yellow(`   跳过: ${summary.skipped}`));
    
    // 套件详情
    console.log(chalk.gray('\n📝 套件详情:'));
    Object.entries(summary.suites).forEach(([name, result]) => {
      const suite = TEST_CONFIG.suites[name];
      const icon = (result.failed || 0) > 0 ? '❌' : '✅';
      const color = (result.failed || 0) > 0 ? chalk.red : chalk.green;
      
      console.log(color(`   ${icon} ${suite?.name || name}: ${result.passed || 0}/${result.total || 0} (${result.duration || 0}ms)`));
      
      if (result.error) {
        console.log(chalk.red(`      错误: ${result.error}`));
      }
    });
    
    // 报告位置
    console.log(chalk.gray('\n📊 报告位置:'));
    console.log(chalk.gray(`   HTML报告: test-results/html/index.html`));
    if (this.coverage) {
      console.log(chalk.gray(`   覆盖率报告: coverage/lcov-report/index.html`));
    }
    
    console.log(chalk.blue('='.repeat(50)));
  }

  /**
   * 清理环境
   */
  async cleanup() {
    if (this.testServer) {
      console.log(chalk.gray('🧹 清理测试环境...'));
      this.testServer.kill();
      
      // 等待服务器关闭
      await new Promise(resolve => {
        this.testServer.on('close', resolve);
        setTimeout(resolve, 5000); // 最多等待5秒
      });
    }
  }
}

/**
 * 主函数
 */
async function main() {
  // 显示帮助信息
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log(`
${chalk.blue.bold('自动化测试运行器')}
`);
    console.log('用法: node run-all-tests.js [选项]\n');
    console.log('选项:');
    console.log('  --unit              只运行单元测试');
    console.log('  --integration       只运行集成测试');
    console.log('  --database          只运行数据库测试');
    console.log('  --e2e               只运行端到端测试');
    console.log('  --no-coverage       禁用覆盖率报告');
    console.log('  --no-parallel       禁用并行运行');
    console.log('  --with-server       启动测试服务器');
    console.log('  --verbose           显示详细输出');
    console.log('  --help, -h          显示帮助信息\n');
    console.log('示例:');
    console.log('  node run-all-tests.js                    # 运行所有测试');
    console.log('  node run-all-tests.js --unit --verbose   # 只运行单元测试，显示详细输出');
    console.log('  node run-all-tests.js --e2e --with-server # 运行E2E测试并启动服务器\n');
    return;
  }
  
  const runner = new TestRunner();
  await runner.runAll();
}

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
  console.error(chalk.red.bold('💥 未捕获的异常:'), error.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error(chalk.red.bold('💥 未处理的Promise拒绝:'), reason);
  process.exit(1);
});

// 处理中断信号
process.on('SIGINT', () => {
  console.log(chalk.yellow('\n⚠️  测试被用户中断'));
  process.exit(1);
});

// 运行主函数
if (require.main === module) {
  main().catch(error => {
    console.error(chalk.red.bold('💥 测试运行器启动失败:'), error.message);
    process.exit(1);
  });
}

module.exports = { TestRunner, TestResults };