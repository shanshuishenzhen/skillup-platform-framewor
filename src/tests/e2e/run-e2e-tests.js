/**
 * 端到端测试运行脚本
 * 统一管理和执行所有的端到端测试，包括测试报告生成和结果汇总
 * 
 * @author SOLO Coding
 * @version 1.0.0
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * 测试配置
 */
const TEST_CONFIG = {
  // 测试超时时间（毫秒）
  timeout: 300000, // 5分钟
  
  // 重试次数
  retries: 2,
  
  // 并行worker数量
  workers: 2,
  
  // 测试报告目录
  reportDir: 'test-results',
  
  // 截图目录
  screenshotDir: 'test-results/screenshots',
  
  // 视频目录
  videoDir: 'test-results/videos',
  
  // 测试服务器配置
  server: {
    port: 3000,
    host: 'localhost',
    startupTimeout: 30000 // 30秒
  },
  
  // 浏览器配置
  browsers: ['chromium', 'firefox', 'webkit'],
  
  // 测试套件配置
  testSuites: {
    auth: {
      name: '认证流程测试',
      files: ['auth-flow.spec.ts'],
      priority: 1
    },
    registration: {
      name: '用户注册测试',
      files: ['user-registration-flow.spec.ts'],
      priority: 2
    },
    examManagement: {
      name: '考试管理测试',
      files: ['exam-management-flow.spec.ts'],
      priority: 3
    },
    examParticipation: {
      name: '学生考试参与测试',
      files: ['student-exam-participation.spec.ts'],
      priority: 4
    },
    gradeManagement: {
      name: '成绩管理测试',
      files: ['grade-management-flow.spec.ts'],
      priority: 5
    },
    completeWorkflow: {
      name: '完整工作流程测试',
      files: ['complete-exam-workflow.spec.ts'],
      priority: 6
    },
    userJourney: {
      name: '用户旅程测试',
      files: ['complete-user-journey.e2e.test.ts'],
      priority: 7
    }
  }
};

/**
 * 颜色输出工具类
 */
class ColorLogger {
  /**
   * 红色输出（错误）
   */
  static red(text) {
    return `\x1b[31m${text}\x1b[0m`;
  }

  /**
   * 绿色输出（成功）
   */
  static green(text) {
    return `\x1b[32m${text}\x1b[0m`;
  }

  /**
   * 黄色输出（警告）
   */
  static yellow(text) {
    return `\x1b[33m${text}\x1b[0m`;
  }

  /**
   * 蓝色输出（信息）
   */
  static blue(text) {
    return `\x1b[34m${text}\x1b[0m`;
  }

  /**
   * 青色输出（提示）
   */
  static cyan(text) {
    return `\x1b[36m${text}\x1b[0m`;
  }

  /**
   * 粗体输出
   */
  static bold(text) {
    return `\x1b[1m${text}\x1b[0m`;
  }
}

/**
 * 测试环境管理类
 */
class TestEnvironment {
  /**
   * 检查Node.js环境
   */
  static checkNodeEnvironment() {
    try {
      const nodeVersion = process.version;
      console.log(ColorLogger.blue(`Node.js版本: ${nodeVersion}`));
      
      if (parseInt(nodeVersion.slice(1)) < 16) {
        throw new Error('需要Node.js 16或更高版本');
      }
      
      return true;
    } catch (error) {
      console.error(ColorLogger.red(`Node.js环境检查失败: ${error.message}`));
      return false;
    }
  }

  /**
   * 检查依赖包
   */
  static checkDependencies() {
    const requiredPackages = [
      '@playwright/test',
      'jest',
      'supertest'
    ];

    console.log(ColorLogger.blue('检查依赖包...'));
    
    for (const pkg of requiredPackages) {
      try {
        require.resolve(pkg);
        console.log(ColorLogger.green(`✓ ${pkg}`));
      } catch (error) {
        console.error(ColorLogger.red(`✗ ${pkg} 未安装`));
        return false;
      }
    }
    
    return true;
  }

  /**
   * 安装Playwright浏览器
   */
  static async installPlaywrightBrowsers() {
    console.log(ColorLogger.blue('安装Playwright浏览器...'));
    
    try {
      execSync('npx playwright install', { 
        stdio: 'inherit',
        timeout: 300000 // 5分钟超时
      });
      
      console.log(ColorLogger.green('Playwright浏览器安装完成'));
      return true;
    } catch (error) {
      console.error(ColorLogger.red(`Playwright浏览器安装失败: ${error.message}`));
      return false;
    }
  }

  /**
   * 创建测试目录
   */
  static createTestDirectories() {
    const directories = [
      TEST_CONFIG.reportDir,
      TEST_CONFIG.screenshotDir,
      TEST_CONFIG.videoDir,
      'test-results/html-report',
      'test-results/json-report',
      'test-results/junit-report'
    ];

    console.log(ColorLogger.blue('创建测试目录...'));
    
    for (const dir of directories) {
      try {
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
          console.log(ColorLogger.green(`✓ 创建目录: ${dir}`));
        }
      } catch (error) {
        console.error(ColorLogger.red(`创建目录失败 ${dir}: ${error.message}`));
        return false;
      }
    }
    
    return true;
  }

  /**
   * 清理旧的测试结果
   */
  static cleanOldResults() {
    console.log(ColorLogger.blue('清理旧的测试结果...'));
    
    try {
      if (fs.existsSync(TEST_CONFIG.reportDir)) {
        const files = fs.readdirSync(TEST_CONFIG.reportDir);
        
        for (const file of files) {
          const filePath = path.join(TEST_CONFIG.reportDir, file);
          const stats = fs.statSync(filePath);
          
          if (stats.isFile()) {
            fs.unlinkSync(filePath);
          }
        }
      }
      
      console.log(ColorLogger.green('旧测试结果清理完成'));
      return true;
    } catch (error) {
      console.error(ColorLogger.red(`清理失败: ${error.message}`));
      return false;
    }
  }
}

/**
 * 服务器管理类
 */
class ServerManager {
  constructor() {
    this.serverProcess = null;
    this.isServerRunning = false;
  }

  /**
   * 检查服务器是否运行
   */
  async checkServerStatus() {
    try {
      const response = await fetch(`http://${TEST_CONFIG.server.host}:${TEST_CONFIG.server.port}`);
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * 启动开发服务器
   */
  async startServer() {
    console.log(ColorLogger.blue('启动开发服务器...'));
    
    // 检查服务器是否已经运行
    const isRunning = await this.checkServerStatus();
    if (isRunning) {
      console.log(ColorLogger.green('服务器已在运行'));
      this.isServerRunning = true;
      return true;
    }

    return new Promise((resolve, reject) => {
      // 启动服务器
      this.serverProcess = spawn('npm', ['run', 'dev'], {
        stdio: 'pipe',
        shell: true
      });

      let output = '';
      
      this.serverProcess.stdout.on('data', (data) => {
        output += data.toString();
        
        // 检查服务器启动成功的标志
        if (output.includes('Local:') || output.includes('localhost') || output.includes('ready')) {
          console.log(ColorLogger.green('开发服务器启动成功'));
          this.isServerRunning = true;
          resolve(true);
        }
      });

      this.serverProcess.stderr.on('data', (data) => {
        console.error(ColorLogger.red(`服务器错误: ${data.toString()}`));
      });

      this.serverProcess.on('error', (error) => {
        console.error(ColorLogger.red(`启动服务器失败: ${error.message}`));
        reject(false);
      });

      // 超时处理
      setTimeout(() => {
        if (!this.isServerRunning) {
          console.error(ColorLogger.red('服务器启动超时'));
          reject(false);
        }
      }, TEST_CONFIG.server.startupTimeout);
    });
  }

  /**
   * 停止服务器
   */
  stopServer() {
    if (this.serverProcess) {
      console.log(ColorLogger.blue('停止开发服务器...'));
      
      if (os.platform() === 'win32') {
        // Windows系统
        execSync(`taskkill /pid ${this.serverProcess.pid} /T /F`, { stdio: 'ignore' });
      } else {
        // Unix系统
        this.serverProcess.kill('SIGTERM');
      }
      
      this.serverProcess = null;
      this.isServerRunning = false;
      
      console.log(ColorLogger.green('服务器已停止'));
    }
  }
}

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
  }

  /**
   * 运行单个测试套件
   */
  async runTestSuite(suiteName, suiteConfig) {
    console.log(ColorLogger.bold(`\n🧪 运行测试套件: ${suiteConfig.name}`));
    
    const startTime = Date.now();
    
    try {
      for (const testFile of suiteConfig.files) {
        console.log(ColorLogger.cyan(`  运行测试文件: ${testFile}`));
        
        const testPath = path.join('src/tests/e2e', testFile);
        
        if (!fs.existsSync(testPath)) {
          console.log(ColorLogger.yellow(`  ⚠️  测试文件不存在: ${testFile}`));
          continue;
        }
        
        // 运行Playwright测试
        const result = await this.runPlaywrightTest(testPath);
        
        // 记录结果
        this.results.suites[suiteName] = {
          name: suiteConfig.name,
          file: testFile,
          result: result,
          duration: Date.now() - startTime
        };
        
        if (result.success) {
          console.log(ColorLogger.green(`  ✓ ${testFile} 通过`));
          this.results.passed += result.passed;
        } else {
          console.log(ColorLogger.red(`  ✗ ${testFile} 失败`));
          this.results.failed += result.failed;
        }
        
        this.results.total += result.total;
        this.results.skipped += result.skipped;
      }
    } catch (error) {
      console.error(ColorLogger.red(`测试套件运行失败: ${error.message}`));
      
      this.results.suites[suiteName] = {
        name: suiteConfig.name,
        result: { success: false, error: error.message },
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * 运行Playwright测试
   */
  async runPlaywrightTest(testPath) {
    return new Promise((resolve) => {
      const command = `npx playwright test ${testPath} --reporter=json`;
      
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
          // 解析JSON输出
          const jsonMatch = output.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const result = JSON.parse(jsonMatch[0]);
            
            // Playwright JSON格式解析
            const stats = result.stats || {};
            const total = (stats.expected || 0) + (stats.skipped || 0) + (stats.unexpected || 0) + (stats.flaky || 0);
            const passed = stats.expected || 0;
            const failed = stats.unexpected || 0;
            const skipped = stats.skipped || 0;
            
            resolve({
              success: code === 0 && failed === 0,
              total: total,
              passed: passed,
              failed: failed,
              skipped: skipped,
              duration: stats.duration || 0
            });
          } else {
            resolve({
              success: code === 0,
              total: 0,
              passed: code === 0 ? 1 : 0,
              failed: code === 0 ? 0 : 1,
              skipped: 0,
              error: errorOutput
            });
          }
        } catch (error) {
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
   * 运行所有测试
   */
  async runAllTests() {
    console.log(ColorLogger.bold('🚀 开始运行端到端测试'));
    
    const startTime = Date.now();
    
    // 按优先级排序测试套件
    const sortedSuites = Object.entries(TEST_CONFIG.testSuites)
      .sort(([,a], [,b]) => a.priority - b.priority);
    
    for (const [suiteName, suiteConfig] of sortedSuites) {
      await this.runTestSuite(suiteName, suiteConfig);
    }
    
    const totalDuration = Date.now() - startTime;
    
    // 生成测试报告
    this.generateReport(totalDuration);
    
    return this.results;
  }

  /**
   * 生成测试报告
   */
  generateReport(duration) {
    console.log(ColorLogger.bold('\n📊 测试报告'));
    console.log('='.repeat(50));
    
    // 总体统计
    console.log(ColorLogger.blue(`总测试数: ${this.results.total}`));
    console.log(ColorLogger.green(`通过: ${this.results.passed}`));
    console.log(ColorLogger.red(`失败: ${this.results.failed}`));
    console.log(ColorLogger.yellow(`跳过: ${this.results.skipped}`));
    console.log(ColorLogger.cyan(`总耗时: ${(duration / 1000).toFixed(2)}秒`));
    
    const passRate = this.results.total > 0 ? 
      ((this.results.passed / this.results.total) * 100).toFixed(2) : 0;
    console.log(ColorLogger.bold(`通过率: ${passRate}%`));
    
    // 详细结果
    console.log('\n📋 详细结果:');
    console.log('-'.repeat(50));
    
    for (const [suiteName, suiteResult] of Object.entries(this.results.suites)) {
      const status = suiteResult.result.success ? 
        ColorLogger.green('✓ 通过') : 
        ColorLogger.red('✗ 失败');
      
      console.log(`${suiteResult.name}: ${status}`);
      
      if (suiteResult.result.error) {
        console.log(ColorLogger.red(`  错误: ${suiteResult.result.error}`));
      }
    }
    
    // 保存JSON报告
    this.saveJsonReport(duration);
    
    // 保存HTML报告
    this.saveHtmlReport(duration);
  }

  /**
   * 保存JSON报告
   */
  saveJsonReport(duration) {
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
      suites: this.results.suites,
      environment: {
        nodeVersion: process.version,
        platform: os.platform(),
        arch: os.arch()
      }
    };
    
    const reportPath = path.join(TEST_CONFIG.reportDir, 'e2e-test-report.json');
    
    try {
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      console.log(ColorLogger.green(`\n📄 JSON报告已保存: ${reportPath}`));
    } catch (error) {
      console.error(ColorLogger.red(`保存JSON报告失败: ${error.message}`));
    }
  }

  /**
   * 保存HTML报告
   */
  saveHtmlReport(duration) {
    const passRate = this.results.total > 0 ? 
      ((this.results.passed / this.results.total) * 100).toFixed(2) : 0;
    
    const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>端到端测试报告</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background-color: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .stat-card { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; border-left: 4px solid #007bff; }
        .stat-card.passed { border-left-color: #28a745; }
        .stat-card.failed { border-left-color: #dc3545; }
        .stat-card.skipped { border-left-color: #ffc107; }
        .stat-number { font-size: 2em; font-weight: bold; margin-bottom: 5px; }
        .stat-label { color: #666; }
        .suites { margin-top: 30px; }
        .suite { background: #f8f9fa; margin-bottom: 15px; padding: 15px; border-radius: 8px; }
        .suite-header { display: flex; justify-content: space-between; align-items: center; }
        .suite-name { font-weight: bold; }
        .suite-status { padding: 5px 10px; border-radius: 4px; color: white; font-size: 0.9em; }
        .suite-status.passed { background-color: #28a745; }
        .suite-status.failed { background-color: #dc3545; }
        .error { color: #dc3545; margin-top: 10px; font-family: monospace; background: #f8f8f8; padding: 10px; border-radius: 4px; }
        .timestamp { color: #666; font-size: 0.9em; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>端到端测试报告</h1>
            <p class="timestamp">生成时间: ${new Date().toLocaleString('zh-CN')}</p>
        </div>
        
        <div class="summary">
            <div class="stat-card">
                <div class="stat-number">${this.results.total}</div>
                <div class="stat-label">总测试数</div>
            </div>
            <div class="stat-card passed">
                <div class="stat-number">${this.results.passed}</div>
                <div class="stat-label">通过</div>
            </div>
            <div class="stat-card failed">
                <div class="stat-number">${this.results.failed}</div>
                <div class="stat-label">失败</div>
            </div>
            <div class="stat-card skipped">
                <div class="stat-number">${this.results.skipped}</div>
                <div class="stat-label">跳过</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${passRate}%</div>
                <div class="stat-label">通过率</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${(duration / 1000).toFixed(2)}s</div>
                <div class="stat-label">总耗时</div>
            </div>
        </div>
        
        <div class="suites">
            <h2>测试套件详情</h2>
            ${Object.entries(this.results.suites).map(([suiteName, suiteResult]) => `
                <div class="suite">
                    <div class="suite-header">
                        <span class="suite-name">${suiteResult.name}</span>
                        <span class="suite-status ${suiteResult.result.success ? 'passed' : 'failed'}">
                            ${suiteResult.result.success ? '通过' : '失败'}
                        </span>
                    </div>
                    ${suiteResult.result.error ? `<div class="error">错误: ${suiteResult.result.error}</div>` : ''}
                </div>
            `).join('')}
        </div>
    </div>
</body>
</html>
    `;
    
    const reportPath = path.join(TEST_CONFIG.reportDir, 'e2e-test-report.html');
    
    try {
      fs.writeFileSync(reportPath, html);
      console.log(ColorLogger.green(`📄 HTML报告已保存: ${reportPath}`));
    } catch (error) {
      console.error(ColorLogger.red(`保存HTML报告失败: ${error.message}`));
    }
  }
}

/**
 * 主函数
 */
async function main() {
  console.log(ColorLogger.bold('🎯 端到端测试运行器'));
  console.log('='.repeat(50));
  
  const serverManager = new ServerManager();
  const testRunner = new TestRunner();
  
  try {
    // 1. 环境检查
    console.log(ColorLogger.bold('\n1️⃣ 环境检查'));
    
    if (!TestEnvironment.checkNodeEnvironment()) {
      process.exit(1);
    }
    
    if (!TestEnvironment.checkDependencies()) {
      console.log(ColorLogger.yellow('请运行 npm install 安装依赖'));
      process.exit(1);
    }
    
    // 2. 安装浏览器
    console.log(ColorLogger.bold('\n2️⃣ 浏览器安装'));
    await TestEnvironment.installPlaywrightBrowsers();
    
    // 3. 准备测试环境
    console.log(ColorLogger.bold('\n3️⃣ 准备测试环境'));
    TestEnvironment.createTestDirectories();
    TestEnvironment.cleanOldResults();
    
    // 4. 启动服务器
    console.log(ColorLogger.bold('\n4️⃣ 启动开发服务器'));
    await serverManager.startServer();
    
    // 5. 运行测试
    console.log(ColorLogger.bold('\n5️⃣ 运行测试'));
    const results = await testRunner.runAllTests();
    
    // 6. 测试完成
    console.log(ColorLogger.bold('\n✅ 测试完成'));
    
    if (results.failed > 0) {
      console.log(ColorLogger.red(`❌ 有 ${results.failed} 个测试失败`));
      process.exit(1);
    } else {
      console.log(ColorLogger.green('🎉 所有测试通过！'));
      process.exit(0);
    }
    
  } catch (error) {
    console.error(ColorLogger.red(`\n❌ 测试运行失败: ${error.message}`));
    console.error(error.stack);
    process.exit(1);
  } finally {
    // 清理资源
    serverManager.stopServer();
  }
}

// 处理进程退出
process.on('SIGINT', () => {
  console.log(ColorLogger.yellow('\n⚠️  收到中断信号，正在清理...'));
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log(ColorLogger.yellow('\n⚠️  收到终止信号，正在清理...'));
  process.exit(0);
});

// 运行主函数
if (require.main === module) {
  main();
}

module.exports = {
  TestEnvironment,
  ServerManager,
  TestRunner,
  TEST_CONFIG
};