/**
 * 测试报告生成器
 * 
 * 功能说明：
 * - 生成详细的HTML测试报告
 * - 生成JSON格式的测试结果
 * - 生成测试统计信息
 * - 支持多种报告格式导出
 * 
 * @author SOLO Coding
 * @version 1.0.0
 */

const fs = require('fs');
const path = require('path');
const config = require('../config/test-config');

class TestReportGenerator {
  constructor() {
    this.reportDir = config.report.outputDir;
    this.ensureReportDirectory();
  }

  /**
   * 确保报告目录存在
   */
  ensureReportDirectory() {
    if (!fs.existsSync(this.reportDir)) {
      fs.mkdirSync(this.reportDir, { recursive: true });
    }
  }

  /**
   * 生成完整的测试报告
   * @param {Array} testResults - 所有测试结果
   * @param {Object} summary - 测试摘要信息
   * @returns {Object} 报告生成结果
   */
  async generateReport(testResults, summary) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const reportData = {
        timestamp: new Date().toISOString(),
        summary,
        testResults,
        environment: this.getEnvironmentInfo(),
        configuration: this.getTestConfiguration()
      };

      // 生成不同格式的报告
      const reports = {
        html: await this.generateHTMLReport(reportData, timestamp),
        json: await this.generateJSONReport(reportData, timestamp),
        csv: await this.generateCSVReport(reportData, timestamp),
        summary: await this.generateSummaryReport(reportData, timestamp)
      };

      console.log('\n=== 测试报告生成完成 ===');
      console.log(`HTML报告: ${reports.html}`);
      console.log(`JSON报告: ${reports.json}`);
      console.log(`CSV报告: ${reports.csv}`);
      console.log(`摘要报告: ${reports.summary}`);

      return {
        success: true,
        reports,
        reportData
      };
    } catch (error) {
      console.error('生成测试报告失败:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 生成HTML格式报告
   * @param {Object} reportData - 报告数据
   * @param {string} timestamp - 时间戳
   * @returns {string} HTML报告文件路径
   */
  async generateHTMLReport(reportData, timestamp) {
    const htmlContent = this.generateHTMLContent(reportData);
    const fileName = `exam-system-test-report-${timestamp}.html`;
    const filePath = path.join(this.reportDir, fileName);
    
    fs.writeFileSync(filePath, htmlContent, 'utf8');
    return filePath;
  }

  /**
   * 生成HTML内容
   * @param {Object} reportData - 报告数据
   * @returns {string} HTML内容
   */
  generateHTMLContent(reportData) {
    const { summary, testResults, timestamp, environment } = reportData;
    
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>考试系统自动化测试报告</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
            color: #333;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 2.5em;
            font-weight: 300;
        }
        .header .subtitle {
            margin-top: 10px;
            opacity: 0.9;
            font-size: 1.1em;
        }
        .summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            padding: 30px;
            background: #f8f9fa;
        }
        .summary-card {
            background: white;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .summary-card h3 {
            margin: 0 0 10px 0;
            color: #666;
            font-size: 0.9em;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .summary-card .value {
            font-size: 2em;
            font-weight: bold;
            margin: 10px 0;
        }
        .success { color: #28a745; }
        .danger { color: #dc3545; }
        .warning { color: #ffc107; }
        .info { color: #17a2b8; }
        .content {
            padding: 30px;
        }
        .test-section {
            margin-bottom: 40px;
        }
        .test-section h2 {
            color: #333;
            border-bottom: 2px solid #667eea;
            padding-bottom: 10px;
            margin-bottom: 20px;
        }
        .test-case {
            background: #f8f9fa;
            border-left: 4px solid #dee2e6;
            margin-bottom: 15px;
            border-radius: 0 4px 4px 0;
            overflow: hidden;
        }
        .test-case.passed {
            border-left-color: #28a745;
        }
        .test-case.failed {
            border-left-color: #dc3545;
        }
        .test-case-header {
            padding: 15px 20px;
            background: white;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .test-case-title {
            font-weight: 600;
            color: #333;
        }
        .test-case-status {
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.8em;
            font-weight: 600;
            text-transform: uppercase;
        }
        .status-passed {
            background: #d4edda;
            color: #155724;
        }
        .status-failed {
            background: #f8d7da;
            color: #721c24;
        }
        .test-case-details {
            padding: 15px 20px;
            background: #f8f9fa;
            border-top: 1px solid #dee2e6;
        }
        .test-case-message {
            margin-bottom: 10px;
            color: #666;
        }
        .test-case-data {
            background: #e9ecef;
            padding: 10px;
            border-radius: 4px;
            font-family: 'Courier New', monospace;
            font-size: 0.9em;
            white-space: pre-wrap;
            max-height: 200px;
            overflow-y: auto;
        }
        .environment-info {
            background: #e9ecef;
            padding: 20px;
            border-radius: 8px;
            margin-top: 30px;
        }
        .environment-info h3 {
            margin-top: 0;
            color: #333;
        }
        .env-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 15px;
            margin-top: 15px;
        }
        .env-item {
            background: white;
            padding: 10px 15px;
            border-radius: 4px;
            display: flex;
            justify-content: space-between;
        }
        .env-label {
            font-weight: 600;
            color: #666;
        }
        .footer {
            background: #333;
            color: white;
            text-align: center;
            padding: 20px;
            font-size: 0.9em;
        }
        @media (max-width: 768px) {
            .summary {
                grid-template-columns: 1fr;
            }
            .test-case-header {
                flex-direction: column;
                align-items: flex-start;
                gap: 10px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>考试系统自动化测试报告</h1>
            <div class="subtitle">生成时间: ${new Date(timestamp).toLocaleString('zh-CN')}</div>
        </div>
        
        <div class="summary">
            <div class="summary-card">
                <h3>总测试数</h3>
                <div class="value info">${summary.total}</div>
            </div>
            <div class="summary-card">
                <h3>通过测试</h3>
                <div class="value success">${summary.passed}</div>
            </div>
            <div class="summary-card">
                <h3>失败测试</h3>
                <div class="value danger">${summary.failed}</div>
            </div>
            <div class="summary-card">
                <h3>通过率</h3>
                <div class="value ${summary.passRate >= 80 ? 'success' : summary.passRate >= 60 ? 'warning' : 'danger'}">
                    ${summary.passRate}%
                </div>
            </div>
            <div class="summary-card">
                <h3>执行时间</h3>
                <div class="value info">${summary.duration}ms</div>
            </div>
            <div class="summary-card">
                <h3>测试状态</h3>
                <div class="value ${summary.passRate >= 80 ? 'success' : 'danger'}">
                    ${summary.passRate >= 80 ? '通过' : '失败'}
                </div>
            </div>
        </div>
        
        <div class="content">
            ${this.generateTestSectionsHTML(testResults)}
            
            <div class="environment-info">
                <h3>测试环境信息</h3>
                <div class="env-grid">
                    <div class="env-item">
                        <span class="env-label">操作系统:</span>
                        <span>${environment.os}</span>
                    </div>
                    <div class="env-item">
                        <span class="env-label">Node.js版本:</span>
                        <span>${environment.nodeVersion}</span>
                    </div>
                    <div class="env-item">
                        <span class="env-label">测试开始时间:</span>
                        <span>${new Date(environment.startTime).toLocaleString('zh-CN')}</span>
                    </div>
                    <div class="env-item">
                        <span class="env-label">测试结束时间:</span>
                        <span>${new Date(environment.endTime).toLocaleString('zh-CN')}</span>
                    </div>
                    <div class="env-item">
                        <span class="env-label">基础URL:</span>
                        <span>${environment.baseURL}</span>
                    </div>
                    <div class="env-item">
                        <span class="env-label">浏览器:</span>
                        <span>${environment.browser || 'N/A'}</span>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="footer">
            <p>考试系统自动化测试报告 - 由 SOLO Coding 生成</p>
        </div>
    </div>
</body>
</html>`;
  }

  /**
   * 生成测试章节HTML
   * @param {Array} testResults - 测试结果
   * @returns {string} HTML内容
   */
  generateTestSectionsHTML(testResults) {
    const sections = {};
    
    // 按测试模块分组
    testResults.forEach(result => {
      const module = result.module || '其他测试';
      if (!sections[module]) {
        sections[module] = [];
      }
      sections[module].push(result);
    });

    let html = '';
    Object.keys(sections).forEach(module => {
      const moduleResults = sections[module];
      const passedCount = moduleResults.filter(r => r.passed).length;
      const totalCount = moduleResults.length;
      
      html += `
        <div class="test-section">
            <h2>${module} (${passedCount}/${totalCount} 通过)</h2>
            ${moduleResults.map(result => `
                <div class="test-case ${result.passed ? 'passed' : 'failed'}">
                    <div class="test-case-header">
                        <div class="test-case-title">${result.testName}</div>
                        <div class="test-case-status ${result.passed ? 'status-passed' : 'status-failed'}">
                            ${result.passed ? '通过' : '失败'}
                        </div>
                    </div>
                    <div class="test-case-details">
                        <div class="test-case-message">${result.message}</div>
                        ${result.details ? `
                            <div class="test-case-data">${JSON.stringify(result.details, null, 2)}</div>
                        ` : ''}
                    </div>
                </div>
            `).join('')}
        </div>
      `;
    });

    return html;
  }

  /**
   * 生成JSON格式报告
   * @param {Object} reportData - 报告数据
   * @param {string} timestamp - 时间戳
   * @returns {string} JSON报告文件路径
   */
  async generateJSONReport(reportData, timestamp) {
    const fileName = `exam-system-test-report-${timestamp}.json`;
    const filePath = path.join(this.reportDir, fileName);
    
    fs.writeFileSync(filePath, JSON.stringify(reportData, null, 2), 'utf8');
    return filePath;
  }

  /**
   * 生成CSV格式报告
   * @param {Object} reportData - 报告数据
   * @param {string} timestamp - 时间戳
   * @returns {string} CSV报告文件路径
   */
  async generateCSVReport(reportData, timestamp) {
    const fileName = `exam-system-test-report-${timestamp}.csv`;
    const filePath = path.join(this.reportDir, fileName);
    
    let csvContent = '测试模块,测试名称,测试结果,测试消息,执行时间\n';
    
    reportData.testResults.forEach(result => {
      const module = (result.module || '其他测试').replace(/,/g, ';');
      const testName = result.testName.replace(/,/g, ';');
      const status = result.passed ? '通过' : '失败';
      const message = (result.message || '').replace(/,/g, ';');
      const timestamp = result.timestamp || '';
      
      csvContent += `"${module}","${testName}","${status}","${message}","${timestamp}"\n`;
    });
    
    fs.writeFileSync(filePath, csvContent, 'utf8');
    return filePath;
  }

  /**
   * 生成摘要报告
   * @param {Object} reportData - 报告数据
   * @param {string} timestamp - 时间戳
   * @returns {string} 摘要报告文件路径
   */
  async generateSummaryReport(reportData, timestamp) {
    const fileName = `exam-system-test-summary-${timestamp}.txt`;
    const filePath = path.join(this.reportDir, fileName);
    
    const { summary, testResults, environment } = reportData;
    
    let content = `考试系统自动化测试摘要报告\n`;
    content += `${'='.repeat(50)}\n\n`;
    content += `生成时间: ${new Date(reportData.timestamp).toLocaleString('zh-CN')}\n`;
    content += `测试环境: ${environment.os} - Node.js ${environment.nodeVersion}\n`;
    content += `基础URL: ${environment.baseURL}\n\n`;
    
    content += `测试统计:\n`;
    content += `- 总测试数: ${summary.total}\n`;
    content += `- 通过测试: ${summary.passed}\n`;
    content += `- 失败测试: ${summary.failed}\n`;
    content += `- 通过率: ${summary.passRate}%\n`;
    content += `- 执行时间: ${summary.duration}ms\n`;
    content += `- 整体状态: ${summary.passRate >= 80 ? '通过' : '失败'}\n\n`;
    
    // 按模块统计
    const moduleStats = {};
    testResults.forEach(result => {
      const module = result.module || '其他测试';
      if (!moduleStats[module]) {
        moduleStats[module] = { total: 0, passed: 0 };
      }
      moduleStats[module].total++;
      if (result.passed) {
        moduleStats[module].passed++;
      }
    });
    
    content += `模块测试统计:\n`;
    Object.keys(moduleStats).forEach(module => {
      const stats = moduleStats[module];
      const passRate = Math.round((stats.passed / stats.total) * 100);
      content += `- ${module}: ${stats.passed}/${stats.total} (${passRate}%)\n`;
    });
    
    // 失败测试详情
    const failedTests = testResults.filter(r => !r.passed);
    if (failedTests.length > 0) {
      content += `\n失败测试详情:\n`;
      failedTests.forEach((test, index) => {
        content += `${index + 1}. ${test.testName}\n`;
        content += `   模块: ${test.module || '其他测试'}\n`;
        content += `   原因: ${test.message}\n\n`;
      });
    }
    
    content += `\n报告生成完成。\n`;
    
    fs.writeFileSync(filePath, content, 'utf8');
    return filePath;
  }

  /**
   * 获取环境信息
   * @returns {Object} 环境信息
   */
  getEnvironmentInfo() {
    return {
      os: `${process.platform} ${process.arch}`,
      nodeVersion: process.version,
      startTime: new Date().toISOString(),
      endTime: new Date().toISOString(),
      baseURL: config.baseURL,
      browser: config.browser.name || 'N/A',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };
  }

  /**
   * 获取测试配置信息
   * @returns {Object} 测试配置
   */
  getTestConfiguration() {
    return {
      baseURL: config.baseURL,
      timeout: config.timeout,
      retries: config.retries,
      browser: config.browser,
      accounts: Object.keys(config.accounts),
      reportFormats: ['html', 'json', 'csv', 'summary']
    };
  }

  /**
   * 生成测试执行摘要
   * @param {Array} testResults - 测试结果
   * @param {number} startTime - 开始时间
   * @param {number} endTime - 结束时间
   * @returns {Object} 测试摘要
   */
  generateTestSummary(testResults, startTime, endTime) {
    const total = testResults.length;
    const passed = testResults.filter(r => r.passed).length;
    const failed = total - passed;
    const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;
    const duration = endTime - startTime;
    
    return {
      total,
      passed,
      failed,
      passRate,
      duration,
      startTime: new Date(startTime).toISOString(),
      endTime: new Date(endTime).toISOString()
    };
  }

  /**
   * 打印控制台摘要
   * @param {Object} summary - 测试摘要
   * @param {Array} testResults - 测试结果
   */
  printConsoleSummary(summary, testResults) {
    console.log('\n' + '='.repeat(60));
    console.log('           考试系统自动化测试结果摘要');
    console.log('='.repeat(60));
    console.log(`总测试数: ${summary.total}`);
    console.log(`通过测试: \x1b[32m${summary.passed}\x1b[0m`);
    console.log(`失败测试: \x1b[31m${summary.failed}\x1b[0m`);
    console.log(`通过率: ${summary.passRate >= 80 ? '\x1b[32m' : '\x1b[31m'}${summary.passRate}%\x1b[0m`);
    console.log(`执行时间: ${summary.duration}ms`);
    console.log(`整体状态: ${summary.passRate >= 80 ? '\x1b[32m通过\x1b[0m' : '\x1b[31m失败\x1b[0m'}`);
    
    // 显示失败的测试
    const failedTests = testResults.filter(r => !r.passed);
    if (failedTests.length > 0) {
      console.log('\n失败测试:');
      failedTests.forEach((test, index) => {
        console.log(`  ${index + 1}. \x1b[31m${test.testName}\x1b[0m`);
        console.log(`     ${test.message}`);
      });
    }
    
    console.log('='.repeat(60));
  }
}

module.exports = TestReportGenerator;