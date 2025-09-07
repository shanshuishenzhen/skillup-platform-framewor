#!/usr/bin/env node

/**
 * 测试报告生成脚本
 * 汇总所有测试结果并生成综合HTML报告
 * 
 * 功能：
 * - 收集各类测试结果
 * - 生成覆盖率汇总
 * - 创建HTML报告
 * - 生成JSON摘要
 * - 发送通知
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * 测试报告生成器类
 */
class TestReportGenerator {
  constructor() {
    this.testResults = {
      unit: { status: 'unknown', coverage: 0, tests: 0, passed: 0, failed: 0, duration: 0 },
      integration: { status: 'unknown', coverage: 0, tests: 0, passed: 0, failed: 0, duration: 0 },
      e2e: { status: 'unknown', coverage: 0, tests: 0, passed: 0, failed: 0, duration: 0 },
      database: { status: 'unknown', coverage: 0, tests: 0, passed: 0, failed: 0, duration: 0 }
    };
    this.overallResults = {
      totalTests: 0,
      totalPassed: 0,
      totalFailed: 0,
      totalDuration: 0,
      overallCoverage: 0,
      status: 'unknown'
    };
    this.reportDir = path.join(process.cwd(), 'test-report');
    this.artifactsDir = path.join(process.cwd(), 'test-artifacts');
  }

  /**
   * 生成完整的测试报告
   */
  async generateReport() {
    try {
      console.log('🚀 开始生成测试报告...');
      
      // 创建报告目录
      this.ensureDirectoryExists(this.reportDir);
      
      // 收集测试结果
      await this.collectTestResults();
      
      // 计算总体结果
      this.calculateOverallResults();
      
      // 生成HTML报告
      await this.generateHTMLReport();
      
      // 生成JSON摘要
      await this.generateJSONSummary();
      
      // 生成覆盖率徽章
      await this.generateCoverageBadges();
      
      // 发送通知
      await this.sendNotifications();
      
      console.log('✅ 测试报告生成完成！');
      console.log(`📊 报告位置: ${this.reportDir}`);
      
    } catch (error) {
      console.error('❌ 生成测试报告失败:', error.message);
      process.exit(1);
    }
  }

  /**
   * 收集各类测试结果
   */
  async collectTestResults() {
    console.log('📊 收集测试结果...');
    
    // 收集单元测试结果
    await this.collectUnitTestResults();
    
    // 收集集成测试结果
    await this.collectIntegrationTestResults();
    
    // 收集端到端测试结果
    await this.collectE2ETestResults();
    
    // 收集数据库测试结果
    await this.collectDatabaseTestResults();
  }

  /**
   * 收集单元测试结果
   */
  async collectUnitTestResults() {
    try {
      const jestResultsPath = path.join(process.cwd(), 'test-results', 'unit', 'jest-results.json');
      const coveragePath = path.join(process.cwd(), 'coverage', 'unit', 'coverage-summary.json');
      
      if (fs.existsSync(jestResultsPath)) {
        const jestResults = JSON.parse(fs.readFileSync(jestResultsPath, 'utf8'));
        this.testResults.unit = {
          status: jestResults.success ? 'passed' : 'failed',
          tests: jestResults.numTotalTests,
          passed: jestResults.numPassedTests,
          failed: jestResults.numFailedTests,
          duration: jestResults.testResults.reduce((sum, result) => sum + result.perfStats.runtime, 0)
        };
      }
      
      if (fs.existsSync(coveragePath)) {
        const coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
        this.testResults.unit.coverage = coverage.total.lines.pct;
      }
      
      console.log(`  ✓ 单元测试: ${this.testResults.unit.tests} 个测试，${this.testResults.unit.passed} 个通过`);
    } catch (error) {
      console.warn(`  ⚠️  收集单元测试结果失败: ${error.message}`);
    }
  }

  /**
   * 收集集成测试结果
   */
  async collectIntegrationTestResults() {
    try {
      const resultsPath = path.join(process.cwd(), 'test-results', 'integration', 'results.json');
      const coveragePath = path.join(process.cwd(), 'coverage', 'integration', 'coverage-summary.json');
      
      if (fs.existsSync(resultsPath)) {
        const results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
        this.testResults.integration = {
          status: results.success ? 'passed' : 'failed',
          tests: results.totalTests,
          passed: results.passedTests,
          failed: results.failedTests,
          duration: results.duration
        };
      }
      
      if (fs.existsSync(coveragePath)) {
        const coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
        this.testResults.integration.coverage = coverage.total.lines.pct;
      }
      
      console.log(`  ✓ 集成测试: ${this.testResults.integration.tests} 个测试，${this.testResults.integration.passed} 个通过`);
    } catch (error) {
      console.warn(`  ⚠️  收集集成测试结果失败: ${error.message}`);
    }
  }

  /**
   * 收集端到端测试结果
   */
  async collectE2ETestResults() {
    try {
      const resultsPath = path.join(process.cwd(), 'test-results', 'e2e', 'results.json');
      const coveragePath = path.join(process.cwd(), 'coverage', 'e2e', 'coverage-summary.json');
      
      if (fs.existsSync(resultsPath)) {
        const results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
        this.testResults.e2e = {
          status: results.success ? 'passed' : 'failed',
          tests: results.totalTests,
          passed: results.passedTests,
          failed: results.failedTests,
          duration: results.duration
        };
      }
      
      if (fs.existsSync(coveragePath)) {
        const coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
        this.testResults.e2e.coverage = coverage.total.lines.pct;
      }
      
      console.log(`  ✓ 端到端测试: ${this.testResults.e2e.tests} 个测试，${this.testResults.e2e.passed} 个通过`);
    } catch (error) {
      console.warn(`  ⚠️  收集端到端测试结果失败: ${error.message}`);
    }
  }

  /**
   * 收集数据库测试结果
   */
  async collectDatabaseTestResults() {
    try {
      const resultsPath = path.join(process.cwd(), 'test-results', 'database', 'results.json');
      const coveragePath = path.join(process.cwd(), 'coverage', 'database', 'coverage-summary.json');
      
      if (fs.existsSync(resultsPath)) {
        const results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
        this.testResults.database = {
          status: results.success ? 'passed' : 'failed',
          tests: results.totalTests,
          passed: results.passedTests,
          failed: results.failedTests,
          duration: results.duration
        };
      }
      
      if (fs.existsSync(coveragePath)) {
        const coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
        this.testResults.database.coverage = coverage.total.lines.pct;
      }
      
      console.log(`  ✓ 数据库测试: ${this.testResults.database.tests} 个测试，${this.testResults.database.passed} 个通过`);
    } catch (error) {
      console.warn(`  ⚠️  收集数据库测试结果失败: ${error.message}`);
    }
  }

  /**
   * 计算总体结果
   */
  calculateOverallResults() {
    console.log('🧮 计算总体结果...');
    
    const testTypes = Object.values(this.testResults);
    
    this.overallResults.totalTests = testTypes.reduce((sum, result) => sum + result.tests, 0);
    this.overallResults.totalPassed = testTypes.reduce((sum, result) => sum + result.passed, 0);
    this.overallResults.totalFailed = testTypes.reduce((sum, result) => sum + result.failed, 0);
    this.overallResults.totalDuration = testTypes.reduce((sum, result) => sum + result.duration, 0);
    
    // 计算加权平均覆盖率
    const totalCoverage = testTypes.reduce((sum, result) => sum + result.coverage * result.tests, 0);
    this.overallResults.overallCoverage = this.overallResults.totalTests > 0 
      ? Math.round(totalCoverage / this.overallResults.totalTests * 100) / 100
      : 0;
    
    // 确定总体状态
    const hasFailures = testTypes.some(result => result.status === 'failed');
    const hasUnknown = testTypes.some(result => result.status === 'unknown');
    
    if (hasFailures) {
      this.overallResults.status = 'failed';
    } else if (hasUnknown) {
      this.overallResults.status = 'partial';
    } else {
      this.overallResults.status = 'passed';
    }
    
    console.log(`  📊 总计: ${this.overallResults.totalTests} 个测试，${this.overallResults.totalPassed} 个通过，覆盖率 ${this.overallResults.overallCoverage}%`);
  }

  /**
   * 生成HTML报告
   */
  async generateHTMLReport() {
    console.log('📄 生成HTML报告...');
    
    const htmlContent = this.generateHTMLContent();
    const htmlPath = path.join(this.reportDir, 'index.html');
    
    fs.writeFileSync(htmlPath, htmlContent, 'utf8');
    
    // 复制静态资源
    await this.copyStaticAssets();
    
    console.log(`  ✓ HTML报告已生成: ${htmlPath}`);
  }

  /**
   * 生成HTML内容
   */
  generateHTMLContent() {
    const timestamp = new Date().toLocaleString('zh-CN');
    const statusIcon = {
      passed: '✅',
      failed: '❌',
      partial: '⚠️',
      unknown: '❓'
    };
    
    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SkillUp Platform - 测试报告</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f7fa; color: #333; }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 12px; margin-bottom: 30px; }
        .header h1 { font-size: 2.5rem; margin-bottom: 10px; }
        .header p { font-size: 1.1rem; opacity: 0.9; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .summary-card { background: white; padding: 25px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .summary-card h3 { font-size: 1.1rem; color: #666; margin-bottom: 10px; }
        .summary-card .value { font-size: 2.5rem; font-weight: bold; margin-bottom: 5px; }
        .summary-card .label { font-size: 0.9rem; color: #888; }
        .status-passed { color: #10b981; }
        .status-failed { color: #ef4444; }
        .status-partial { color: #f59e0b; }
        .status-unknown { color: #6b7280; }
        .test-results { background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); overflow: hidden; }
        .test-results h2 { padding: 25px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; font-size: 1.5rem; }
        .test-table { width: 100%; border-collapse: collapse; }
        .test-table th, .test-table td { padding: 15px; text-align: left; border-bottom: 1px solid #e2e8f0; }
        .test-table th { background: #f8fafc; font-weight: 600; }
        .test-table tr:hover { background: #f8fafc; }
        .progress-bar { width: 100%; height: 8px; background: #e2e8f0; border-radius: 4px; overflow: hidden; }
        .progress-fill { height: 100%; background: linear-gradient(90deg, #10b981, #059669); transition: width 0.3s ease; }
        .badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; font-weight: 500; }
        .badge-success { background: #dcfce7; color: #166534; }
        .badge-error { background: #fecaca; color: #991b1b; }
        .badge-warning { background: #fef3c7; color: #92400e; }
        .badge-info { background: #dbeafe; color: #1e40af; }
        .charts { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin: 30px 0; }
        .chart-card { background: white; padding: 25px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .footer { text-align: center; margin-top: 40px; padding: 20px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${statusIcon[this.overallResults.status]} SkillUp Platform 测试报告</h1>
            <p>生成时间: ${timestamp} | 总体状态: ${this.overallResults.status.toUpperCase()}</p>
        </div>
        
        <div class="summary">
            <div class="summary-card">
                <h3>总测试数</h3>
                <div class="value">${this.overallResults.totalTests}</div>
                <div class="label">个测试用例</div>
            </div>
            <div class="summary-card">
                <h3>通过率</h3>
                <div class="value status-${this.overallResults.totalTests > 0 ? (this.overallResults.totalPassed === this.overallResults.totalTests ? 'passed' : 'partial') : 'unknown'}">
                    ${this.overallResults.totalTests > 0 ? Math.round(this.overallResults.totalPassed / this.overallResults.totalTests * 100) : 0}%
                </div>
                <div class="label">${this.overallResults.totalPassed}/${this.overallResults.totalTests} 通过</div>
            </div>
            <div class="summary-card">
                <h3>代码覆盖率</h3>
                <div class="value status-${this.overallResults.overallCoverage >= 80 ? 'passed' : this.overallResults.overallCoverage >= 60 ? 'partial' : 'failed'}">
                    ${this.overallResults.overallCoverage}%
                </div>
                <div class="label">代码覆盖</div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${this.overallResults.overallCoverage}%"></div>
                </div>
            </div>
            <div class="summary-card">
                <h3>执行时间</h3>
                <div class="value">${Math.round(this.overallResults.totalDuration / 1000)}s</div>
                <div class="label">总耗时</div>
            </div>
        </div>
        
        <div class="test-results">
            <h2>📊 详细测试结果</h2>
            <table class="test-table">
                <thead>
                    <tr>
                        <th>测试类型</th>
                        <th>状态</th>
                        <th>测试数</th>
                        <th>通过</th>
                        <th>失败</th>
                        <th>覆盖率</th>
                        <th>耗时</th>
                    </tr>
                </thead>
                <tbody>
                    ${Object.entries(this.testResults).map(([type, result]) => `
                    <tr>
                        <td><strong>${this.getTestTypeName(type)}</strong></td>
                        <td><span class="badge badge-${this.getBadgeClass(result.status)}">${statusIcon[result.status] || '❓'} ${result.status.toUpperCase()}</span></td>
                        <td>${result.tests}</td>
                        <td class="status-passed">${result.passed}</td>
                        <td class="status-failed">${result.failed}</td>
                        <td>
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <span>${result.coverage}%</span>
                                <div class="progress-bar" style="width: 60px;">
                                    <div class="progress-fill" style="width: ${result.coverage}%"></div>
                                </div>
                            </div>
                        </td>
                        <td>${Math.round(result.duration / 1000)}s</td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        
        <div class="footer">
            <p>🚀 由 SkillUp Platform 自动化测试系统生成</p>
            <p>📈 <a href="./coverage/index.html">查看详细覆盖率报告</a> | 📋 <a href="./test-summary.json">下载JSON摘要</a></p>
        </div>
    </div>
</body>
</html>
    `;
  }

  /**
   * 获取测试类型中文名称
   */
  getTestTypeName(type) {
    const names = {
      unit: '单元测试',
      integration: '集成测试',
      e2e: '端到端测试',
      database: '数据库测试'
    };
    return names[type] || type;
  }

  /**
   * 获取徽章样式类
   */
  getBadgeClass(status) {
    const classes = {
      passed: 'success',
      failed: 'error',
      partial: 'warning',
      unknown: 'info'
    };
    return classes[status] || 'info';
  }

  /**
   * 生成JSON摘要
   */
  async generateJSONSummary() {
    console.log('📋 生成JSON摘要...');
    
    const summary = {
      timestamp: new Date().toISOString(),
      overall: this.overallResults,
      testResults: this.testResults,
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        ci: process.env.CI === 'true',
        branch: process.env.GITHUB_REF_NAME || 'unknown',
        commit: process.env.GITHUB_SHA || 'unknown'
      }
    };
    
    const summaryPath = path.join(this.reportDir, 'test-summary.json');
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2), 'utf8');
    
    // 也写到根目录供CI使用
    const rootSummaryPath = path.join(process.cwd(), 'test-summary.json');
    fs.writeFileSync(rootSummaryPath, JSON.stringify(summary, null, 2), 'utf8');
    
    console.log(`  ✓ JSON摘要已生成: ${summaryPath}`);
  }

  /**
   * 生成覆盖率徽章
   */
  async generateCoverageBadges() {
    console.log('🏷️  生成覆盖率徽章...');
    
    try {
      // 生成总体覆盖率徽章
      const badgeColor = this.overallResults.overallCoverage >= 80 ? 'brightgreen' : 
                         this.overallResults.overallCoverage >= 60 ? 'yellow' : 'red';
      
      const badgeUrl = `https://img.shields.io/badge/coverage-${this.overallResults.overallCoverage}%25-${badgeColor}`;
      
      // 保存徽章信息
      const badgeInfo = {
        coverage: {
          url: badgeUrl,
          markdown: `![Coverage](${badgeUrl})`,
          html: `<img src="${badgeUrl}" alt="Coverage" />`
        },
        tests: {
          url: `https://img.shields.io/badge/tests-${this.overallResults.totalPassed}%2F${this.overallResults.totalTests}-${this.overallResults.status === 'passed' ? 'brightgreen' : 'red'}`,
          markdown: `![Tests](https://img.shields.io/badge/tests-${this.overallResults.totalPassed}%2F${this.overallResults.totalTests}-${this.overallResults.status === 'passed' ? 'brightgreen' : 'red'})`,
          html: `<img src="https://img.shields.io/badge/tests-${this.overallResults.totalPassed}%2F${this.overallResults.totalTests}-${this.overallResults.status === 'passed' ? 'brightgreen' : 'red'}" alt="Tests" />`
        }
      };
      
      const badgePath = path.join(this.reportDir, 'badges.json');
      fs.writeFileSync(badgePath, JSON.stringify(badgeInfo, null, 2), 'utf8');
      
      console.log(`  ✓ 覆盖率徽章已生成: ${badgePath}`);
    } catch (error) {
      console.warn(`  ⚠️  生成覆盖率徽章失败: ${error.message}`);
    }
  }

  /**
   * 复制静态资源
   */
  async copyStaticAssets() {
    try {
      // 复制覆盖率报告
      const coverageDir = path.join(process.cwd(), 'coverage');
      const reportCoverageDir = path.join(this.reportDir, 'coverage');
      
      if (fs.existsSync(coverageDir)) {
        this.copyDirectory(coverageDir, reportCoverageDir);
      }
      
      // 复制测试结果文件
      const testResultsDir = path.join(process.cwd(), 'test-results');
      const reportTestResultsDir = path.join(this.reportDir, 'test-results');
      
      if (fs.existsSync(testResultsDir)) {
        this.copyDirectory(testResultsDir, reportTestResultsDir);
      }
      
    } catch (error) {
      console.warn(`  ⚠️  复制静态资源失败: ${error.message}`);
    }
  }

  /**
   * 发送通知
   */
  async sendNotifications() {
    console.log('📢 发送通知...');
    
    try {
      // Slack 通知
      if (process.env.SLACK_WEBHOOK_URL) {
        await this.sendSlackNotification();
      }
      
      // 邮件通知
      if (process.env.EMAIL_NOTIFICATION_ENABLED === 'true') {
        await this.sendEmailNotification();
      }
      
      // 企业微信通知
      if (process.env.WECHAT_WEBHOOK_URL) {
        await this.sendWeChatNotification();
      }
      
    } catch (error) {
      console.warn(`  ⚠️  发送通知失败: ${error.message}`);
    }
  }

  /**
   * 发送Slack通知
   */
  async sendSlackNotification() {
    // Slack通知实现
    console.log('  📱 发送Slack通知...');
  }

  /**
   * 发送邮件通知
   */
  async sendEmailNotification() {
    // 邮件通知实现
    console.log('  📧 发送邮件通知...');
  }

  /**
   * 发送企业微信通知
   */
  async sendWeChatNotification() {
    // 企业微信通知实现
    console.log('  💬 发送企业微信通知...');
  }

  /**
   * 确保目录存在
   */
  ensureDirectoryExists(dirPath) {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  /**
   * 复制目录
   */
  copyDirectory(src, dest) {
    this.ensureDirectoryExists(dest);
    
    const items = fs.readdirSync(src);
    
    for (const item of items) {
      const srcPath = path.join(src, item);
      const destPath = path.join(dest, item);
      
      if (fs.statSync(srcPath).isDirectory()) {
        this.copyDirectory(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }
}

// 主函数
async function main() {
  const generator = new TestReportGenerator();
  await generator.generateReport();
}

// 如果直接运行此脚本
if (require.main === module) {
  main().catch(error => {
    console.error('❌ 脚本执行失败:', error);
    process.exit(1);
  });
}

module.exports = TestReportGenerator;