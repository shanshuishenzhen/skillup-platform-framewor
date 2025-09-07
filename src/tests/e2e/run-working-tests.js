#!/usr/bin/env node

/**
 * 运行已验证可工作的端到端测试
 * 这个脚本专门运行我们已经验证可以正常工作的测试文件
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * 颜色输出工具类
 */
class ColorLogger {
  static red(text) {
    return `\x1b[31m${text}\x1b[0m`;
  }

  static green(text) {
    return `\x1b[32m${text}\x1b[0m`;
  }

  static yellow(text) {
    return `\x1b[33m${text}\x1b[0m`;
  }

  static blue(text) {
    return `\x1b[34m${text}\x1b[0m`;
  }

  static cyan(text) {
    return `\x1b[36m${text}\x1b[0m`;
  }

  static bold(text) {
    return `\x1b[1m${text}\x1b[0m`;
  }
}

/**
 * 已验证可工作的测试配置
 */
const WORKING_TESTS = [
  {
    name: '基础功能验证测试',
    file: 'simple-test.spec.ts',
    description: '验证应用基础功能：首页加载、登录页面、404处理'
  },
  {
    name: '认证流程测试',
    file: 'auth-flow.spec.ts',
    description: '验证用户认证相关功能'
  }
];

/**
 * 测试运行器类
 */
class WorkingTestRunner {
  constructor() {
    this.results = {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      tests: []
    };
  }

  /**
   * 运行单个Playwright测试
   */
  async runPlaywrightTest(testConfig) {
    return new Promise((resolve) => {
      const testPath = path.join('src/tests/e2e', testConfig.file);
      
      console.log(ColorLogger.cyan(`\n🧪 运行测试: ${testConfig.name}`));
      console.log(ColorLogger.blue(`📁 文件: ${testConfig.file}`));
      console.log(ColorLogger.blue(`📝 描述: ${testConfig.description}`));
      
      // 检查文件是否存在
      if (!fs.existsSync(testPath)) {
        console.log(ColorLogger.red(`❌ 测试文件不存在: ${testPath}`));
        resolve({
          success: false,
          total: 0,
          passed: 0,
          failed: 1,
          skipped: 0,
          error: '测试文件不存在'
        });
        return;
      }
      
      const command = `npx playwright test ${testPath} --reporter=json`;
      console.log(ColorLogger.yellow(`🚀 执行命令: ${command}`));
      
      const testProcess = spawn(command, {
        shell: true,
        stdio: 'pipe'
      });

      let output = '';
      let errorOutput = '';
      
      testProcess.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      testProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });
      
      testProcess.on('close', (code) => {
        try {
          console.log(ColorLogger.blue(`📊 退出码: ${code}`));
          
          // 尝试解析JSON输出
          const jsonMatch = output.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const result = JSON.parse(jsonMatch[0]);
            console.log(ColorLogger.green('✅ JSON解析成功'));
            
            // Playwright JSON格式解析
            const stats = result.stats || {};
            const total = (stats.expected || 0) + (stats.skipped || 0) + (stats.unexpected || 0) + (stats.flaky || 0);
            const passed = stats.expected || 0;  // Playwright中expected表示通过的测试
            const failed = stats.unexpected || 0; // unexpected表示失败的测试
            const skipped = stats.skipped || 0;
            
            console.log(ColorLogger.blue(`📈 统计: 总计=${total}, 通过=${passed}, 失败=${failed}, 跳过=${skipped}`));
            
            resolve({
              success: code === 0 && failed === 0,
              total: total,
              passed: passed,
              failed: failed,
              skipped: skipped,
              duration: stats.duration || 0,
              details: result
            });
          } else {
            console.log(ColorLogger.yellow('⚠️ 无法解析JSON输出，使用退出码判断'));
            console.log(ColorLogger.yellow(`📄 原始输出: ${output.substring(0, 200)}...`));
            
            resolve({
              success: code === 0,
              total: 1,
              passed: code === 0 ? 1 : 0,
              failed: code === 0 ? 0 : 1,
              skipped: 0,
              error: errorOutput || '无法解析测试输出'
            });
          }
        } catch (error) {
          console.log(ColorLogger.red(`❌ 解析错误: ${error.message}`));
          resolve({
            success: false,
            total: 1,
            passed: 0,
            failed: 1,
            skipped: 0,
            error: error.message
          });
        }
      });
    });
  }

  /**
   * 运行所有已验证的测试
   */
  async runAllWorkingTests() {
    console.log(ColorLogger.bold('🎯 运行已验证可工作的端到端测试'));
    console.log(ColorLogger.bold('=' .repeat(60)));
    
    const startTime = Date.now();
    
    for (const testConfig of WORKING_TESTS) {
      const result = await this.runPlaywrightTest(testConfig);
      
      // 累计结果
      this.results.total += result.total;
      this.results.passed += result.passed;
      this.results.failed += result.failed;
      this.results.skipped += result.skipped;
      
      // 记录测试详情
      this.results.tests.push({
        name: testConfig.name,
        file: testConfig.file,
        result: result
      });
      
      // 显示结果
      if (result.success) {
        console.log(ColorLogger.green(`✅ ${testConfig.name} - 通过`));
        console.log(ColorLogger.green(`   📊 ${result.passed}/${result.total} 测试通过`));
      } else {
        console.log(ColorLogger.red(`❌ ${testConfig.name} - 失败`));
        console.log(ColorLogger.red(`   📊 ${result.failed}/${result.total} 测试失败`));
        if (result.error) {
          console.log(ColorLogger.red(`   🔍 错误: ${result.error}`));
        }
      }
    }
    
    const totalDuration = Date.now() - startTime;
    
    // 生成最终报告
    this.generateFinalReport(totalDuration);
    
    return this.results;
  }

  /**
   * 生成最终测试报告
   */
  generateFinalReport(duration) {
    console.log(ColorLogger.bold('\n📊 最终测试报告'));
    console.log(ColorLogger.bold('=' .repeat(60)));
    
    // 总体统计
    console.log(ColorLogger.blue(`📈 总测试数: ${this.results.total}`));
    console.log(ColorLogger.green(`✅ 通过: ${this.results.passed}`));
    console.log(ColorLogger.red(`❌ 失败: ${this.results.failed}`));
    console.log(ColorLogger.yellow(`⏭️ 跳过: ${this.results.skipped}`));
    console.log(ColorLogger.cyan(`⏱️ 总耗时: ${(duration / 1000).toFixed(2)}秒`));
    
    const passRate = this.results.total > 0 ? 
      ((this.results.passed / this.results.total) * 100).toFixed(2) : 0;
    console.log(ColorLogger.bold(`🎯 通过率: ${passRate}%`));
    
    // 详细结果
    console.log(ColorLogger.bold('\n📋 详细结果:'));
    console.log('-'.repeat(60));
    
    for (const test of this.results.tests) {
      const status = test.result.success ? 
        ColorLogger.green('✅ 通过') : 
        ColorLogger.red('❌ 失败');
      
      console.log(`${test.name}: ${status}`);
      console.log(`  📁 文件: ${test.file}`);
      console.log(`  📊 统计: ${test.result.passed}/${test.result.total} 通过`);
      
      if (test.result.error) {
        console.log(ColorLogger.red(`  🔍 错误: ${test.result.error}`));
      }
    }
    
    // 保存报告
    this.saveReport(duration);
    
    // 最终状态
    if (this.results.failed === 0) {
      console.log(ColorLogger.bold(ColorLogger.green('\n🎉 所有测试通过！')));
    } else {
      console.log(ColorLogger.bold(ColorLogger.red('\n⚠️ 部分测试失败，请检查上述错误信息')));
    }
  }

  /**
   * 保存测试报告
   */
  saveReport(duration) {
    const report = {
      timestamp: new Date().toISOString(),
      duration: duration,
      summary: {
        total: this.results.total,
        passed: this.results.passed,
        failed: this.results.failed,
        skipped: this.results.skipped,
        passRate: this.results.total > 0 ? 
          ((this.results.passed / this.results.total) * 100).toFixed(2) : 0
      },
      tests: this.results.tests,
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch
      }
    };
    
    // 确保目录存在
    const reportDir = 'test-results';
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    
    const reportPath = path.join(reportDir, 'working-tests-report.json');
    
    try {
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      console.log(ColorLogger.green(`\n📄 测试报告已保存: ${reportPath}`));
    } catch (error) {
      console.error(ColorLogger.red(`保存报告失败: ${error.message}`));
    }
  }
}

/**
 * 主函数
 */
async function main() {
  try {
    console.log(ColorLogger.bold('🚀 启动已验证测试运行器'));
    console.log(ColorLogger.blue(`📅 时间: ${new Date().toLocaleString()}`));
    console.log(ColorLogger.blue(`🖥️ 平台: ${process.platform} ${process.arch}`));
    console.log(ColorLogger.blue(`📦 Node.js: ${process.version}`));
    
    const runner = new WorkingTestRunner();
    const results = await runner.runAllWorkingTests();
    
    // 根据结果设置退出码
    process.exit(results.failed > 0 ? 1 : 0);
    
  } catch (error) {
    console.error(ColorLogger.red(`\n❌ 运行器错误: ${error.message}`));
    console.error(ColorLogger.red(error.stack));
    process.exit(1);
  }
}

// 运行主函数
if (require.main === module) {
  main();
}

module.exports = { WorkingTestRunner, WORKING_TESTS };