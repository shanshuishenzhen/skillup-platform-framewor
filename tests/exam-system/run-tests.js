/**
 * 在线考试管理系统自动化测试执行脚本
 * 整合所有测试模块，生成综合测试报告
 */

const fs = require('fs-extra');
const path = require('path');
const TestUtils = require('./utils/test-utils');
const config = require('./config/test-config');

// 导入所有测试模块
const AdminLoginTest = require('./tests/admin-login-test');
const ExamManagementTest = require('./tests/exam-management-test');
const StudentExamTest = require('./tests/student-exam-test');
const GradeStatisticsTest = require('./tests/grade-statistics-test');
const PermissionControlTest = require('./tests/permission-control-test');
const ApiIntegrationTest = require('./tests/api-integration-test');

class TestRunner {
  constructor() {
    this.testUtils = new TestUtils();
    this.allResults = [];
    this.startTime = new Date();
    this.testSuites = {
      adminLogin: new AdminLoginTest(),
      examManagement: new ExamManagementTest(),
      studentExam: new StudentExamTest(),
      gradeStatistics: new GradeStatisticsTest(),
      permissionControl: new PermissionControlTest(),
      apiIntegration: new ApiIntegrationTest()
    };
  }

  /**
   * 执行所有测试套件
   */
  async runAllTests() {
    console.log('\n🚀 开始执行在线考试管理系统完整测试套件');
    console.log('='.repeat(60));
    console.log(`测试开始时间: ${this.startTime.toLocaleString()}`);
    console.log(`测试环境: ${config.environment}`);
    console.log(`API基础地址: ${config.baseUrl}`);
    console.log('='.repeat(60));

    try {
      // 确保报告目录存在
      await this.ensureReportDirectory();

      // 执行各个测试套件
      await this.runTestSuite('管理员登录测试', 'adminLogin');
      await this.runTestSuite('考试管理测试', 'examManagement');
      await this.runTestSuite('学生考试测试', 'studentExam');

      // 生成综合报告
      await this.generateFinalReport();
      
      // 显示测试总结
      this.displayTestSummary();
      
    } catch (error) {
      console.error('\n❌ 测试执行过程中发生错误:', error.message);
      console.error(error.stack);
    }
  }

  /**
   * 执行单个测试套件
   * @param {string} suiteName - 测试套件名称
   * @param {string} suiteKey - 测试套件键名
   */
  async runTestSuite(suiteName, suiteKey) {
    console.log(`\n📋 开始执行: ${suiteName}`);
    console.log('-'.repeat(40));
    
    const startTime = Date.now();
    let suiteResult = {
      name: suiteName,
      key: suiteKey,
      startTime: new Date(startTime),
      endTime: null,
      duration: 0,
      success: false,
      error: null,
      testCount: 0,
      passedCount: 0,
      failedCount: 0
    };

    try {
      const testSuite = this.testSuites[suiteKey];
      if (!testSuite) {
        throw new Error(`测试套件 ${suiteKey} 不存在`);
      }

      // 执行测试套件
      await testSuite.runAllTests();
      
      // 获取测试结果统计
      const stats = testSuite.testUtils.getStats();
      suiteResult.testCount = stats.total;
      suiteResult.passedCount = stats.passed;
      suiteResult.failedCount = stats.failed;
      suiteResult.success = stats.failed === 0;
      
      console.log(`✅ ${suiteName} 执行完成`);
      console.log(`   测试数量: ${stats.total}, 通过: ${stats.passed}, 失败: ${stats.failed}`);
      
    } catch (error) {
      suiteResult.error = error.message;
      suiteResult.success = false;
      console.error(`❌ ${suiteName} 执行失败:`, error.message);
    } finally {
      const endTime = Date.now();
      suiteResult.endTime = new Date(endTime);
      suiteResult.duration = endTime - startTime;
      this.allResults.push(suiteResult);
    }
  }

  /**
   * 确保报告目录存在
   */
  async ensureReportDirectory() {
    const reportDir = path.join(__dirname, 'reports');
    await fs.ensureDir(reportDir);
  }

  /**
   * 生成最终综合报告
   */
  async generateFinalReport() {
    console.log('\n📊 生成综合测试报告...');
    
    const endTime = new Date();
    const totalDuration = endTime.getTime() - this.startTime.getTime();
    
    // 计算总体统计
    const totalStats = this.allResults.reduce((acc, result) => {
      acc.totalTests += result.testCount;
      acc.totalPassed += result.passedCount;
      acc.totalFailed += result.failedCount;
      acc.totalSuites += 1;
      acc.successfulSuites += result.success ? 1 : 0;
      return acc;
    }, {
      totalTests: 0,
      totalPassed: 0,
      totalFailed: 0,
      totalSuites: 0,
      successfulSuites: 0
    });

    const finalReport = {
      testRun: {
        startTime: this.startTime,
        endTime: endTime,
        duration: totalDuration,
        environment: config.environment,
        baseUrl: config.baseUrl
      },
      summary: {
        ...totalStats,
        successRate: totalStats.totalTests > 0 ? 
          Math.round((totalStats.totalPassed / totalStats.totalTests) * 100) : 0,
        suiteSuccessRate: totalStats.totalSuites > 0 ? 
          Math.round((totalStats.successfulSuites / totalStats.totalSuites) * 100) : 0
      },
      testSuites: this.allResults,
      recommendations: this.generateRecommendations(totalStats)
    };

    // 保存JSON报告
    const reportPath = path.join(__dirname, 'reports', `test-report-${this.formatDateTime(this.startTime)}.json`);
    await fs.writeJson(reportPath, finalReport, { spaces: 2 });
    
    // 生成HTML报告
    await this.generateHtmlReport(finalReport);
    
    console.log(`📄 测试报告已生成: ${reportPath}`);
  }

  /**
   * 生成HTML格式的测试报告
   * @param {Object} reportData - 报告数据
   */
  async generateHtmlReport(reportData) {
    const htmlContent = this.generateHtmlContent(reportData);
    const htmlPath = path.join(__dirname, 'reports', `test-report-${this.formatDateTime(this.startTime)}.html`);
    await fs.writeFile(htmlPath, htmlContent, 'utf8');
    console.log(`🌐 HTML报告已生成: ${htmlPath}`);
  }

  /**
   * 生成HTML报告内容
   * @param {Object} data - 报告数据
   * @returns {string} HTML内容
   */
  generateHtmlContent(data) {
    const { summary, testSuites, testRun } = data;
    
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>在线考试管理系统测试报告</title>
    <style>
        body { font-family: 'Microsoft YaHei', Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #e0e0e0; }
        .header h1 { color: #2c3e50; margin: 0; font-size: 2.5em; }
        .header .subtitle { color: #7f8c8d; margin-top: 10px; font-size: 1.1em; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .summary-card { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; text-align: center; }
        .summary-card.success { background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%); }
        .summary-card.warning { background: linear-gradient(135deg, #ff9800 0%, #f57c00 100%); }
        .summary-card.error { background: linear-gradient(135deg, #f44336 0%, #d32f2f 100%); }
        .summary-card h3 { margin: 0 0 10px 0; font-size: 1.2em; }
        .summary-card .number { font-size: 2.5em; font-weight: bold; margin: 10px 0; }
        .test-suites { margin-top: 30px; }
        .suite { margin-bottom: 25px; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; }
        .suite-header { background: #f8f9fa; padding: 15px 20px; border-bottom: 1px solid #e0e0e0; }
        .suite-header h3 { margin: 0; color: #2c3e50; display: flex; align-items: center; }
        .suite-header .status { margin-left: auto; padding: 5px 15px; border-radius: 20px; color: white; font-size: 0.9em; }
        .suite-header .status.success { background: #4CAF50; }
        .suite-header .status.failed { background: #f44336; }
        .suite-content { padding: 20px; }
        .suite-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 15px; margin-bottom: 15px; }
        .stat-item { text-align: center; padding: 10px; background: #f8f9fa; border-radius: 5px; }
        .stat-item .label { font-size: 0.9em; color: #666; margin-bottom: 5px; }
        .stat-item .value { font-size: 1.5em; font-weight: bold; color: #2c3e50; }
        .recommendations { margin-top: 30px; padding: 20px; background: #e8f4fd; border-left: 4px solid #2196F3; border-radius: 5px; }
        .recommendations h3 { color: #1976D2; margin-top: 0; }
        .recommendations ul { margin: 10px 0; padding-left: 20px; }
        .recommendations li { margin-bottom: 8px; color: #424242; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎯 在线考试管理系统测试报告</h1>
            <div class="subtitle">
                测试时间: ${testRun.startTime.toLocaleString()} - ${testRun.endTime.toLocaleString()}<br>
                测试环境: ${testRun.environment} | 耗时: ${Math.round(testRun.duration / 1000)}秒
            </div>
        </div>
        
        <div class="summary">
            <div class="summary-card ${summary.successRate >= 80 ? 'success' : summary.successRate >= 60 ? 'warning' : 'error'}">
                <h3>总体成功率</h3>
                <div class="number">${summary.successRate}%</div>
            </div>
            <div class="summary-card">
                <h3>测试总数</h3>
                <div class="number">${summary.totalTests}</div>
            </div>
            <div class="summary-card success">
                <h3>通过测试</h3>
                <div class="number">${summary.totalPassed}</div>
            </div>
            <div class="summary-card ${summary.totalFailed > 0 ? 'error' : 'success'}">
                <h3>失败测试</h3>
                <div class="number">${summary.totalFailed}</div>
            </div>
        </div>
        
        <div class="test-suites">
            <h2>📋 测试套件详情</h2>
            ${testSuites.map(suite => `
                <div class="suite">
                    <div class="suite-header">
                        <h3>
                            ${suite.success ? '✅' : '❌'} ${suite.name}
                            <span class="status ${suite.success ? 'success' : 'failed'}">
                                ${suite.success ? '通过' : '失败'}
                            </span>
                        </h3>
                    </div>
                    <div class="suite-content">
                        <div class="suite-stats">
                            <div class="stat-item">
                                <div class="label">测试数量</div>
                                <div class="value">${suite.testCount}</div>
                            </div>
                            <div class="stat-item">
                                <div class="label">通过</div>
                                <div class="value" style="color: #4CAF50;">${suite.passedCount}</div>
                            </div>
                            <div class="stat-item">
                                <div class="label">失败</div>
                                <div class="value" style="color: #f44336;">${suite.failedCount}</div>
                            </div>
                            <div class="stat-item">
                                <div class="label">耗时</div>
                                <div class="value">${Math.round(suite.duration / 1000)}s</div>
                            </div>
                        </div>
                        ${suite.error ? `<div style="color: #f44336; margin-top: 10px;"><strong>错误:</strong> ${suite.error}</div>` : ''}
                    </div>
                </div>
            `).join('')}
        </div>
        
        ${data.recommendations.length > 0 ? `
            <div class="recommendations">
                <h3>💡 改进建议</h3>
                <ul>
                    ${data.recommendations.map(rec => `<li>${rec}</li>`).join('')}
                </ul>
            </div>
        ` : ''}
        
        <div class="footer">
            <p>报告生成时间: ${new Date().toLocaleString()} | 在线考试管理系统自动化测试</p>
        </div>
    </div>
</body>
</html>`;
  }

  /**
   * 生成改进建议
   * @param {Object} stats - 统计数据
   * @returns {Array} 建议列表
   */
  generateRecommendations(stats) {
    const recommendations = [];
    
    if (stats.totalFailed > 0) {
      recommendations.push('存在失败的测试用例，建议检查API接口实现和数据库配置');
    }
    
    if (stats.successfulSuites < stats.totalSuites) {
      recommendations.push('部分测试套件执行失败，建议检查系统环境和依赖配置');
    }
    
    if (stats.totalTests === 0) {
      recommendations.push('没有执行任何测试，建议检查测试配置和网络连接');
    }
    
    const successRate = stats.totalTests > 0 ? (stats.totalPassed / stats.totalTests) * 100 : 0;
    
    if (successRate < 50) {
      recommendations.push('测试成功率较低，建议优先修复核心功能问题');
    } else if (successRate < 80) {
      recommendations.push('测试成功率中等，建议逐步完善系统功能');
    } else if (successRate >= 95) {
      recommendations.push('测试成功率很高，系统功能基本完善，可以考虑部署上线');
    }
    
    recommendations.push('建议定期执行自动化测试，确保系统稳定性');
    recommendations.push('可以考虑添加性能测试和安全测试用例');
    
    return recommendations;
  }

  /**
   * 显示测试总结
   */
  displayTestSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 测试执行总结');
    console.log('='.repeat(60));
    
    const totalStats = this.allResults.reduce((acc, result) => {
      acc.totalTests += result.testCount;
      acc.totalPassed += result.passedCount;
      acc.totalFailed += result.failedCount;
      return acc;
    }, { totalTests: 0, totalPassed: 0, totalFailed: 0 });
    
    const successRate = totalStats.totalTests > 0 ? 
      Math.round((totalStats.totalPassed / totalStats.totalTests) * 100) : 0;
    
    console.log(`总测试数量: ${totalStats.totalTests}`);
    console.log(`通过测试: ${totalStats.totalPassed}`);
    console.log(`失败测试: ${totalStats.totalFailed}`);
    console.log(`成功率: ${successRate}%`);
    console.log(`总耗时: ${Math.round((new Date().getTime() - this.startTime.getTime()) / 1000)}秒`);
    
    console.log('\n测试套件结果:');
    this.allResults.forEach(result => {
      const status = result.success ? '✅ 通过' : '❌ 失败';
      console.log(`  ${status} ${result.name} (${result.passedCount}/${result.testCount})`);
    });
    
    if (successRate >= 80) {
      console.log('\n🎉 恭喜！测试成功率较高，系统功能基本正常');
    } else if (successRate >= 60) {
      console.log('\n⚠️  测试成功率中等，建议检查失败的测试用例');
    } else {
      console.log('\n🚨 测试成功率较低，建议优先修复核心功能问题');
    }
    
    console.log('='.repeat(60));
  }

  /**
   * 格式化日期时间为文件名
   * @param {Date} date - 日期对象
   * @returns {string} 格式化的日期时间字符串
   */
  formatDateTime(date) {
    return date.toISOString()
      .replace(/[:.]/g, '-')
      .replace('T', '_')
      .substring(0, 19);
  }
}

// 如果直接运行此文件，执行所有测试
if (require.main === module) {
  const runner = new TestRunner();
  runner.runAllTests().catch(console.error);
}

module.exports = TestRunner;