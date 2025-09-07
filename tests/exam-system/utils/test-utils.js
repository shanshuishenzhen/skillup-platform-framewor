/**
 * 测试工具类
 * 提供HTTP请求、断言、日志记录等通用测试功能
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const config = require('../config/test-config');

class TestUtils {
  constructor() {
    this.baseUrl = config.environment.baseUrl;
    this.timeout = config.environment.timeout;
    this.testResults = [];
    this.currentTest = null;
  }

  /**
   * 发送HTTP请求
   * @param {string} method - 请求方法
   * @param {string} url - 请求URL
   * @param {Object} data - 请求数据
   * @param {Object} headers - 请求头
   * @returns {Promise<Object>} 响应数据
   */
  async makeRequest(method, url, data = null, headers = {}) {
    try {
      const fullUrl = url.startsWith('http') ? url : `${this.baseUrl}${url}`;
      
      const config = {
        method,
        url: fullUrl,
        timeout: this.timeout,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        }
      };

      if (data && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
        config.data = data;
      }

      const response = await axios(config);
      
      this.log(`✓ ${method} ${url} - Status: ${response.status}`);
      return {
        success: true,
        status: response.status,
        data: response.data,
        headers: response.headers
      };
    } catch (error) {
      const errorInfo = {
        success: false,
        status: error.response?.status || 0,
        message: error.message,
        data: error.response?.data || null
      };
      
      this.log(`✗ ${method} ${url} - Error: ${error.message}`);
      return errorInfo;
    }
  }

  /**
   * 开始新的测试用例
   * @param {string} testName - 测试名称
   * @param {string} description - 测试描述
   */
  startTest(testName, description = '') {
    this.currentTest = {
      name: testName,
      description,
      startTime: new Date(),
      steps: [],
      status: 'running'
    };
    
    this.log(`\n🧪 开始测试: ${testName}`);
    if (description) {
      this.log(`   描述: ${description}`);
    }
  }

  /**
   * 结束当前测试用例
   * @param {boolean} passed - 测试是否通过
   * @param {string} message - 结果消息
   */
  endTest(passed, message = '') {
    if (!this.currentTest) return;

    this.currentTest.endTime = new Date();
    this.currentTest.duration = this.currentTest.endTime - this.currentTest.startTime;
    this.currentTest.status = passed ? 'passed' : 'failed';
    this.currentTest.message = message;

    const status = passed ? '✅ 通过' : '❌ 失败';
    this.log(`${status}: ${this.currentTest.name} (${this.currentTest.duration}ms)`);
    if (message) {
      this.log(`   ${message}`);
    }

    this.testResults.push({ ...this.currentTest });
    this.currentTest = null;
  }

  /**
   * 添加测试步骤
   * @param {string} step - 步骤描述
   * @param {boolean} success - 步骤是否成功
   * @param {Object} data - 步骤数据
   */
  addStep(step, success = true, data = null) {
    if (!this.currentTest) return;

    const stepInfo = {
      description: step,
      success,
      timestamp: new Date(),
      data
    };

    this.currentTest.steps.push(stepInfo);
    const status = success ? '  ✓' : '  ✗';
    this.log(`${status} ${step}`);
  }

  /**
   * 断言函数
   * @param {boolean} condition - 断言条件
   * @param {string} message - 断言消息
   * @throws {Error} 断言失败时抛出错误
   */
  assert(condition, message) {
    if (!condition) {
      this.addStep(`断言失败: ${message}`, false);
      throw new Error(`断言失败: ${message}`);
    }
    this.addStep(`断言成功: ${message}`, true);
  }

  /**
   * 等待指定时间
   * @param {number} ms - 等待毫秒数
   */
  async wait(ms) {
    this.log(`⏳ 等待 ${ms}ms`);
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 记录日志
   * @param {string} message - 日志消息
   */
  log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage);
  }

  /**
   * 生成测试报告
   * @param {string} testName - 测试名称
   * @param {Object} results - 测试结果
   */
  generateReport(testName, results) {
    const reportPath = path.join(__dirname, '../reports', `${testName.replace(/\s+/g, '-').toLowerCase()}-report.json`);
    
    // 确保报告目录存在
    const reportsDir = path.dirname(reportPath);
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    // 写入报告文件
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
    console.log(`测试报告已生成: ${reportPath}`);
    
    return reportPath;
  }

  /**
   * 获取测试统计信息
   * @returns {Object} 测试统计数据
   */
  getStats() {
    return {
      totalTests: this.testResults.length,
      passedTests: this.testResults.filter(r => r.success).length,
      failedTests: this.testResults.filter(r => !r.success).length,
      duration: this.endTime ? this.endTime - this.startTime : 0
    };
  }

  /**
   * 保存测试报告到文件
   * @param {string} filename - 文件名
   */
  async saveReport(filename = 'test-report.json') {
    const report = this.generateReport();
    const reportDir = path.join(__dirname, '..', 'reports');
    
    // 确保报告目录存在
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    const reportPath = path.join(reportDir, filename);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    this.log(`📊 测试报告已保存: ${reportPath}`);
    return reportPath;
  }

  /**
   * 打印测试摘要
   */
  printSummary() {
    const report = this.generateReport();
    const { summary } = report;

    console.log('\n' + '='.repeat(60));
    console.log('📊 测试执行摘要');
    console.log('='.repeat(60));
    console.log(`总测试数: ${summary.total}`);
    console.log(`通过: ${summary.passed} ✅`);
    console.log(`失败: ${summary.failed} ❌`);
    console.log(`通过率: ${summary.passRate}%`);
    console.log(`总耗时: ${summary.totalDuration}ms`);
    console.log('='.repeat(60));

    if (summary.failed > 0) {
      console.log('\n❌ 失败的测试:');
      report.tests
        .filter(test => test.status === 'failed')
        .forEach(test => {
          console.log(`  - ${test.name}: ${test.message}`);
        });
    }
  }
}

module.exports = TestUtils;