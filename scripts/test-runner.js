#!/usr/bin/env node

/**
 * 测试运行脚本
 * 支持一键运行所有测试，包括单元测试、集成测试、API测试、数据库测试和端到端测试
 * 
 * @author SOLO Coding
 * @version 1.0.0
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const chalk = require('chalk');

/**
 * 测试配置
 */
const TEST_CONFIG = {
  // 测试套件定义
  suites: {
    unit: {
      name: '单元测试',
      pattern: 'src/tests/unit/**/*.test.ts',
      timeout: 30000,
      coverage: true
    },
    integration: {
      name: '集成测试',
      pattern: 'src/tests/integration/**/*.test.ts',
      timeout: 60000,
      coverage: true
    },
    api: {
      name: 'API测试',
      pattern: 'src/tests/api/**/*.test.ts',
      timeout: 60000,
      coverage: false
    },
    database: {
      name: '数据库测试',
      pattern: 'src/tests/database/**/*.test.ts',
      timeout: 60000,
      coverage: false
    },
    e2e: {
      name: '端到端测试',
      pattern: 'src/tests/e2e/**/*.test.ts',
      timeout: 120000,
      coverage: false
    },
    performance: {
      name: '性能测试',
      pattern: 'src/tests/performance/**/*.test.ts',
      timeout: 60000,
      coverage: false
    }
  },
  
  // 输出目录
  outputDir: 'test-results',
  coverageDir: 'coverage',
  
  // Jest配置
  jestConfig: 'jest.config.js',
  
  // 环境变量
  env: {
    NODE_ENV: 'test',
    TEST_TIMEOUT: '60000'
  }
};

/**
 * 测试运行器类
 */
class TestRunner {
  constructor() {
    this.results = {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      suites: {}
    };
    this.startTime = Date.now();
  }

  /**
   * 运行所有测试
   * @param {Object} options - 运行选项
   */
  async runAll(options = {}) {
    console.log(chalk.blue.bold('🚀 开始运行自动化测试套件'));
    console.log(chalk.gray('=' .repeat(50)));
    
    try {
      // 准备测试环境
      await this.setupTestEnvironment();
      
      // 运行测试套件
      const suitesToRun = options.suites || Object.keys(TEST_CONFIG.suites);
      
      for (const suiteKey of suitesToRun) {
        if (TEST_CONFIG.suites[suiteKey]) {
          await this.runTestSuite(suiteKey, options);
        }
      }
      
      // 生成测试报告
      await this.generateReport(options);
      
      // 清理测试环境
      await this.cleanupTestEnvironment();
      
    } catch (error) {
      console.error(chalk.red.bold('❌ 测试运行失败:'), error.message);
      process.exit(1);
    }
  }

  /**
   * 运行单个测试套件
   * @param {string} suiteKey - 测试套件键名
   * @param {Object} options - 运行选项
   */
  async runTestSuite(suiteKey, options = {}) {
    const suite = TEST_CONFIG.suites[suiteKey];
    
    console.log(chalk.yellow.bold(`\n📋 运行 ${suite.name}`));
    console.log(chalk.gray(`模式: ${suite.pattern}`));
    
    const startTime = Date.now();
    
    try {
      const result = await this.executeJest(suiteKey, suite, options);
      const duration = Date.now() - startTime;
      
      this.results.suites[suiteKey] = {
        ...result,
        duration,
        name: suite.name
      };
      
      // 更新总计
      this.results.total += result.total;
      this.results.passed += result.passed;
      this.results.failed += result.failed;
      this.results.skipped += result.skipped;
      
      // 显示结果
      this.displaySuiteResult(suiteKey, result, duration);
      
    } catch (error) {
      console.error(chalk.red(`❌ ${suite.name} 运行失败:`), error.message);
      this.results.suites[suiteKey] = {
        total: 0,
        passed: 0,
        failed: 1,
        skipped: 0,
        error: error.message,
        duration: Date.now() - startTime,
        name: suite.name
      };
      this.results.failed += 1;
    }
  }

  /**
   * 执行Jest测试
   * @param {string} suiteKey - 测试套件键名
   * @param {Object} suite - 测试套件配置
   * @param {Object} options - 运行选项
   */
  async executeJest(suiteKey, suite, options) {
    return new Promise((resolve, reject) => {
      const args = [
        '--testPathPattern', suite.pattern,
        '--testTimeout', suite.timeout.toString(),
        '--verbose'
      ];
      
      // 添加覆盖率选项
      if (suite.coverage && !options.noCoverage) {
        args.push('--coverage');
        args.push('--coverageDirectory', path.join(TEST_CONFIG.coverageDir, suiteKey));
      }
      
      // 添加其他选项
      if (options.watch) {
        args.push('--watch');
      }
      
      if (options.updateSnapshots) {
        args.push('--updateSnapshot');
      }
      
      if (options.bail) {
        args.push('--bail');
      }
      
      // 设置环境变量
      const env = {
        ...process.env,
        ...TEST_CONFIG.env
      };
      
      // 运行Jest
      const jest = spawn('npx', ['jest', ...args], {
        stdio: 'pipe',
        env,
        cwd: process.cwd()
      });
      
      let output = '';
      let errorOutput = '';
      
      jest.stdout.on('data', (data) => {
        const text = data.toString();
        output += text;
        if (options.verbose) {
          process.stdout.write(text);
        }
      });
      
      jest.stderr.on('data', (data) => {
        const text = data.toString();
        errorOutput += text;
        if (options.verbose) {
          process.stderr.write(text);
        }
      });
      
      jest.on('close', (code) => {
        const result = this.parseJestOutput(output);
        
        if (code === 0) {
          resolve(result);
        } else {
          reject(new Error(`Jest 退出码: ${code}\n${errorOutput}`));
        }
      });
      
      jest.on('error', (error) => {
        reject(new Error(`Jest 启动失败: ${error.message}`));
      });
    });
  }

  /**
   * 解析Jest输出
   * @param {string} output - Jest输出文本
   */
  parseJestOutput(output) {
    const result = {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0
    };
    
    // 解析测试结果
    const testResultMatch = output.match(/Tests:\s+(\d+)\s+failed,\s+(\d+)\s+passed,\s+(\d+)\s+total/);
    if (testResultMatch) {
      result.failed = parseInt(testResultMatch[1]);
      result.passed = parseInt(testResultMatch[2]);
      result.total = parseInt(testResultMatch[3]);
    } else {
      // 尝试其他格式
      const passedMatch = output.match(/(\d+)\s+passed/);
      const failedMatch = output.match(/(\d+)\s+failed/);
      const totalMatch = output.match(/(\d+)\s+total/);
      
      if (passedMatch) result.passed = parseInt(passedMatch[1]);
      if (failedMatch) result.failed = parseInt(failedMatch[1]);
      if (totalMatch) result.total = parseInt(totalMatch[1]);
    }
    
    // 计算跳过的测试
    result.skipped = result.total - result.passed - result.failed;
    
    return result;
  }

  /**
   * 显示测试套件结果
   * @param {string} suiteKey - 测试套件键名
   * @param {Object} result - 测试结果
   * @param {number} duration - 运行时长
   */
  displaySuiteResult(suiteKey, result, duration) {
    const suite = TEST_CONFIG.suites[suiteKey];
    const durationText = `${(duration / 1000).toFixed(2)}s`;
    
    if (result.failed === 0) {
      console.log(chalk.green(`✅ ${suite.name} 通过`));
    } else {
      console.log(chalk.red(`❌ ${suite.name} 失败`));
    }
    
    console.log(chalk.gray(`   总计: ${result.total}, 通过: ${result.passed}, 失败: ${result.failed}, 跳过: ${result.skipped}`));
    console.log(chalk.gray(`   耗时: ${durationText}`));
  }

  /**
   * 生成测试报告
   * @param {Object} options - 运行选项
   */
  async generateReport(options) {
    const totalDuration = Date.now() - this.startTime;
    
    console.log(chalk.blue.bold('\n📊 测试报告'));
    console.log(chalk.gray('=' .repeat(50)));
    
    // 显示总体结果
    const successRate = this.results.total > 0 ? 
      ((this.results.passed / this.results.total) * 100).toFixed(1) : 0;
    
    console.log(chalk.white.bold('总体结果:'));
    console.log(`  总测试数: ${this.results.total}`);
    console.log(chalk.green(`  通过: ${this.results.passed}`));
    console.log(chalk.red(`  失败: ${this.results.failed}`));
    console.log(chalk.yellow(`  跳过: ${this.results.skipped}`));
    console.log(`  成功率: ${successRate}%`);
    console.log(`  总耗时: ${(totalDuration / 1000).toFixed(2)}s`);
    
    // 显示各套件结果
    console.log(chalk.white.bold('\n各套件详情:'));
    Object.entries(this.results.suites).forEach(([key, suite]) => {
      const status = suite.failed === 0 ? chalk.green('✅') : chalk.red('❌');
      const duration = `${(suite.duration / 1000).toFixed(2)}s`;
      console.log(`  ${status} ${suite.name}: ${suite.passed}/${suite.total} (${duration})`);
      
      if (suite.error) {
        console.log(chalk.red(`    错误: ${suite.error}`));
      }
    });
    
    // 生成JSON报告
    if (!options.noReport) {
      await this.saveJsonReport();
    }
    
    // 显示最终状态
    console.log(chalk.gray('\n' + '=' .repeat(50)));
    if (this.results.failed === 0) {
      console.log(chalk.green.bold('🎉 所有测试通过！'));
    } else {
      console.log(chalk.red.bold('💥 部分测试失败！'));
      process.exit(1);
    }
  }

  /**
   * 保存JSON格式的测试报告
   */
  async saveJsonReport() {
    try {
      const reportDir = TEST_CONFIG.outputDir;
      if (!fs.existsSync(reportDir)) {
        fs.mkdirSync(reportDir, { recursive: true });
      }
      
      const reportData = {
        ...this.results,
        timestamp: new Date().toISOString(),
        duration: Date.now() - this.startTime,
        environment: {
          node: process.version,
          platform: process.platform,
          arch: process.arch
        }
      };
      
      const reportPath = path.join(reportDir, `test-report-${Date.now()}.json`);
      fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
      
      console.log(chalk.gray(`\n📄 测试报告已保存: ${reportPath}`));
    } catch (error) {
      console.warn(chalk.yellow(`⚠️  保存测试报告失败: ${error.message}`));
    }
  }

  /**
   * 准备测试环境
   */
  async setupTestEnvironment() {
    console.log(chalk.gray('🔧 准备测试环境...'));
    
    // 创建输出目录
    if (!fs.existsSync(TEST_CONFIG.outputDir)) {
      fs.mkdirSync(TEST_CONFIG.outputDir, { recursive: true });
    }
    
    if (!fs.existsSync(TEST_CONFIG.coverageDir)) {
      fs.mkdirSync(TEST_CONFIG.coverageDir, { recursive: true });
    }
    
    // 检查Jest配置
    if (!fs.existsSync(TEST_CONFIG.jestConfig)) {
      console.warn(chalk.yellow(`⚠️  Jest配置文件不存在: ${TEST_CONFIG.jestConfig}`));
    }
    
    console.log(chalk.gray('✅ 测试环境准备完成'));
  }

  /**
   * 清理测试环境
   */
  async cleanupTestEnvironment() {
    console.log(chalk.gray('\n🧹 清理测试环境...'));
    
    // 这里可以添加清理逻辑，比如删除临时文件等
    
    console.log(chalk.gray('✅ 测试环境清理完成'));
  }
}

/**
 * 命令行接口
 */
function parseArguments() {
  const args = process.argv.slice(2);
  const options = {
    suites: [],
    verbose: false,
    noCoverage: false,
    noReport: false,
    watch: false,
    updateSnapshots: false,
    bail: false
  };
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--suites':
      case '-s':
        options.suites = args[++i].split(',');
        break;
      case '--verbose':
      case '-v':
        options.verbose = true;
        break;
      case '--no-coverage':
        options.noCoverage = true;
        break;
      case '--no-report':
        options.noReport = true;
        break;
      case '--watch':
      case '-w':
        options.watch = true;
        break;
      case '--update-snapshots':
      case '-u':
        options.updateSnapshots = true;
        break;
      case '--bail':
      case '-b':
        options.bail = true;
        break;
      case '--help':
      case '-h':
        showHelp();
        process.exit(0);
        break;
      default:
        console.error(chalk.red(`未知参数: ${arg}`));
        showHelp();
        process.exit(1);
    }
  }
  
  return options;
}

/**
 * 显示帮助信息
 */
function showHelp() {
  console.log(chalk.blue.bold('测试运行器 - 使用说明'));
  console.log('');
  console.log('用法: node scripts/test-runner.js [选项]');
  console.log('');
  console.log('选项:');
  console.log('  -s, --suites <suites>     指定要运行的测试套件 (逗号分隔)');
  console.log('  -v, --verbose             显示详细输出');
  console.log('  --no-coverage             跳过代码覆盖率收集');
  console.log('  --no-report               跳过生成测试报告');
  console.log('  -w, --watch               监视模式');
  console.log('  -u, --update-snapshots    更新快照');
  console.log('  -b, --bail                遇到失败时立即停止');
  console.log('  -h, --help                显示此帮助信息');
  console.log('');
  console.log('可用的测试套件:');
  Object.entries(TEST_CONFIG.suites).forEach(([key, suite]) => {
    console.log(`  ${key.padEnd(12)} ${suite.name}`);
  });
  console.log('');
  console.log('示例:');
  console.log('  node scripts/test-runner.js                    # 运行所有测试');
  console.log('  node scripts/test-runner.js -s unit,api       # 只运行单元测试和API测试');
  console.log('  node scripts/test-runner.js -v --no-coverage  # 详细输出，不收集覆盖率');
}

/**
 * 主函数
 */
async function main() {
  try {
    const options = parseArguments();
    const runner = new TestRunner();
    await runner.runAll(options);
  } catch (error) {
    console.error(chalk.red.bold('❌ 运行失败:'), error.message);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = { TestRunner, TEST_CONFIG };