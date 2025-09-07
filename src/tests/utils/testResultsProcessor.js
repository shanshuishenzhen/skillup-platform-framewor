/**
 * 测试结果处理器
 * 
 * 处理和格式化Jest测试结果，包括：
 * 1. 测试结果统计
 * 2. 错误信息格式化
 * 3. 性能指标收集
 * 4. 自定义报告生成
 * 
 * @author SOLO Coding
 * @version 1.0.0
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

/**
 * 测试结果处理器类
 */
class TestResultsProcessor {
  constructor() {
    this.startTime = Date.now();
    this.outputDir = 'test-results';
    this.ensureOutputDir();
  }

  /**
   * 确保输出目录存在
   */
  ensureOutputDir() {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  /**
   * 处理测试结果
   * @param {Object} results - Jest测试结果对象
   * @returns {Object} 处理后的结果
   */
  process(results) {
    try {
      const processedResults = this.processResults(results);
      
      // 生成各种格式的报告
      this.generateJsonReport(processedResults);
      this.generateTextReport(processedResults);
      this.generateCsvReport(processedResults);
      this.generateMarkdownReport(processedResults);
      
      // 输出控制台摘要
      this.printConsoleSummary(processedResults);
      
      return results; // 返回原始结果给Jest
    } catch (error) {
      console.error(chalk.red('测试结果处理失败:'), error.message);
      return results;
    }
  }

  /**
   * 处理测试结果数据
   * @param {Object} results - 原始测试结果
   * @returns {Object} 处理后的结果数据
   */
  processResults(results) {
    const endTime = Date.now();
    const duration = endTime - this.startTime;
    
    const processed = {
      summary: {
        success: results.success,
        startTime: this.startTime,
        endTime: endTime,
        duration: duration,
        numTotalTestSuites: results.numTotalTestSuites,
        numPassedTestSuites: results.numPassedTestSuites,
        numFailedTestSuites: results.numFailedTestSuites,
        numPendingTestSuites: results.numPendingTestSuites,
        numTotalTests: results.numTotalTests,
        numPassedTests: results.numPassedTests,
        numFailedTests: results.numFailedTests,
        numPendingTests: results.numPendingTests,
        numTodoTests: results.numTodoTests,
        openHandles: results.openHandles?.length || 0
      },
      testResults: this.processTestSuites(results.testResults),
      coverageMap: results.coverageMap,
      performance: this.calculatePerformanceMetrics(results),
      errors: this.extractErrors(results),
      warnings: this.extractWarnings(results)
    };
    
    return processed;
  }

  /**
   * 处理测试套件结果
   * @param {Array} testResults - 测试套件结果数组
   * @returns {Array} 处理后的测试套件数据
   */
  processTestSuites(testResults) {
    return testResults.map(suite => {
      const suitePath = suite.testFilePath;
      const relativePath = path.relative(process.cwd(), suitePath);
      
      return {
        filePath: relativePath,
        success: suite.numFailingTests === 0,
        duration: suite.perfStats.end - suite.perfStats.start,
        numTests: suite.numPassingTests + suite.numFailingTests + suite.numPendingTests,
        numPassingTests: suite.numPassingTests,
        numFailingTests: suite.numFailingTests,
        numPendingTests: suite.numPendingTests,
        numTodoTests: suite.numTodoTests,
        tests: this.processIndividualTests(suite.testResults),
        console: suite.console || [],
        failureMessage: suite.failureMessage,
        coverage: this.extractSuiteCoverage(suite)
      };
    });
  }

  /**
   * 处理单个测试结果
   * @param {Array} testResults - 单个测试结果数组
   * @returns {Array} 处理后的测试数据
   */
  processIndividualTests(testResults) {
    return testResults.map(test => ({
      title: test.title,
      fullName: test.fullName,
      status: test.status,
      duration: test.duration || 0,
      failureMessages: test.failureMessages || [],
      ancestorTitles: test.ancestorTitles || [],
      location: test.location,
      numPassingAsserts: test.numPassingAsserts || 0,
      retryReasons: test.retryReasons || []
    }));
  }

  /**
   * 提取套件覆盖率信息
   * @param {Object} suite - 测试套件对象
   * @returns {Object} 覆盖率信息
   */
  extractSuiteCoverage(suite) {
    if (!suite.coverage) return null;
    
    const coverage = suite.coverage;
    return {
      lines: {
        total: coverage.getLineCoverage ? Object.keys(coverage.getLineCoverage()).length : 0,
        covered: coverage.getLineCoverage ? Object.values(coverage.getLineCoverage()).filter(Boolean).length : 0
      },
      functions: {
        total: coverage.getFunctionCoverage ? Object.keys(coverage.getFunctionCoverage()).length : 0,
        covered: coverage.getFunctionCoverage ? Object.values(coverage.getFunctionCoverage()).filter(Boolean).length : 0
      },
      branches: {
        total: coverage.getBranchCoverage ? Object.keys(coverage.getBranchCoverage()).length : 0,
        covered: coverage.getBranchCoverage ? Object.values(coverage.getBranchCoverage()).filter(Boolean).length : 0
      },
      statements: {
        total: coverage.getStatementCoverage ? Object.keys(coverage.getStatementCoverage()).length : 0,
        covered: coverage.getStatementCoverage ? Object.values(coverage.getStatementCoverage()).filter(Boolean).length : 0
      }
    };
  }

  /**
   * 计算性能指标
   * @param {Object} results - 测试结果
   * @returns {Object} 性能指标
   */
  calculatePerformanceMetrics(results) {
    const testDurations = results.testResults
      .map(suite => suite.perfStats.end - suite.perfStats.start)
      .filter(duration => duration > 0);
    
    const totalDuration = testDurations.reduce((sum, duration) => sum + duration, 0);
    const avgDuration = testDurations.length > 0 ? totalDuration / testDurations.length : 0;
    const maxDuration = testDurations.length > 0 ? Math.max(...testDurations) : 0;
    const minDuration = testDurations.length > 0 ? Math.min(...testDurations) : 0;
    
    return {
      totalDuration,
      avgDuration,
      maxDuration,
      minDuration,
      testsPerSecond: results.numTotalTests / (totalDuration / 1000) || 0,
      slowestSuites: this.findSlowestSuites(results.testResults, 5),
      fastestSuites: this.findFastestSuites(results.testResults, 5)
    };
  }

  /**
   * 查找最慢的测试套件
   * @param {Array} testResults - 测试结果数组
   * @param {number} count - 返回数量
   * @returns {Array} 最慢的测试套件
   */
  findSlowestSuites(testResults, count) {
    return testResults
      .map(suite => ({
        path: path.relative(process.cwd(), suite.testFilePath),
        duration: suite.perfStats.end - suite.perfStats.start
      }))
      .sort((a, b) => b.duration - a.duration)
      .slice(0, count);
  }

  /**
   * 查找最快的测试套件
   * @param {Array} testResults - 测试结果数组
   * @param {number} count - 返回数量
   * @returns {Array} 最快的测试套件
   */
  findFastestSuites(testResults, count) {
    return testResults
      .map(suite => ({
        path: path.relative(process.cwd(), suite.testFilePath),
        duration: suite.perfStats.end - suite.perfStats.start
      }))
      .filter(suite => suite.duration > 0)
      .sort((a, b) => a.duration - b.duration)
      .slice(0, count);
  }

  /**
   * 提取错误信息
   * @param {Object} results - 测试结果
   * @returns {Array} 错误信息数组
   */
  extractErrors(results) {
    const errors = [];
    
    results.testResults.forEach(suite => {
      if (suite.failureMessage) {
        errors.push({
          type: 'suite_failure',
          file: path.relative(process.cwd(), suite.testFilePath),
          message: suite.failureMessage
        });
      }
      
      suite.testResults.forEach(test => {
        if (test.failureMessages && test.failureMessages.length > 0) {
          test.failureMessages.forEach(message => {
            errors.push({
              type: 'test_failure',
              file: path.relative(process.cwd(), suite.testFilePath),
              test: test.fullName,
              message: message
            });
          });
        }
      });
    });
    
    return errors;
  }

  /**
   * 提取警告信息
   * @param {Object} results - 测试结果
   * @returns {Array} 警告信息数组
   */
  extractWarnings(results) {
    const warnings = [];
    
    // 检查开放句柄
    if (results.openHandles && results.openHandles.length > 0) {
      warnings.push({
        type: 'open_handles',
        count: results.openHandles.length,
        message: `检测到 ${results.openHandles.length} 个未关闭的句柄`
      });
    }
    
    // 检查慢测试
    results.testResults.forEach(suite => {
      const duration = suite.perfStats.end - suite.perfStats.start;
      if (duration > 10000) { // 超过10秒
        warnings.push({
          type: 'slow_test',
          file: path.relative(process.cwd(), suite.testFilePath),
          duration: duration,
          message: `测试套件运行时间过长: ${duration}ms`
        });
      }
    });
    
    return warnings;
  }

  /**
   * 生成JSON报告
   * @param {Object} results - 处理后的结果
   */
  generateJsonReport(results) {
    const reportPath = path.join(this.outputDir, 'test-results.json');
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  }

  /**
   * 生成文本报告
   * @param {Object} results - 处理后的结果
   */
  generateTextReport(results) {
    const reportPath = path.join(this.outputDir, 'test-results.txt');
    const content = this.formatTextReport(results);
    fs.writeFileSync(reportPath, content);
  }

  /**
   * 格式化文本报告
   * @param {Object} results - 处理后的结果
   * @returns {string} 格式化的文本报告
   */
  formatTextReport(results) {
    const { summary, performance, errors, warnings } = results;
    
    let content = '';
    content += '测试结果报告\n';
    content += '='.repeat(50) + '\n\n';
    
    // 摘要信息
    content += '📊 测试摘要\n';
    content += `-`.repeat(20) + '\n';
    content += `状态: ${summary.success ? '✅ 通过' : '❌ 失败'}\n`;
    content += `总耗时: ${summary.duration}ms\n`;
    content += `测试套件: ${summary.numPassedTestSuites}/${summary.numTotalTestSuites} 通过\n`;
    content += `测试用例: ${summary.numPassedTests}/${summary.numTotalTests} 通过\n`;
    content += `失败用例: ${summary.numFailedTests}\n`;
    content += `跳过用例: ${summary.numPendingTests}\n\n`;
    
    // 性能信息
    content += '⚡ 性能指标\n';
    content += `-`.repeat(20) + '\n';
    content += `平均耗时: ${Math.round(performance.avgDuration)}ms\n`;
    content += `最大耗时: ${Math.round(performance.maxDuration)}ms\n`;
    content += `最小耗时: ${Math.round(performance.minDuration)}ms\n`;
    content += `测试速度: ${Math.round(performance.testsPerSecond)} 测试/秒\n\n`;
    
    // 最慢的测试套件
    if (performance.slowestSuites.length > 0) {
      content += '🐌 最慢的测试套件\n';
      content += `-`.repeat(20) + '\n';
      performance.slowestSuites.forEach((suite, index) => {
        content += `${index + 1}. ${suite.path} (${Math.round(suite.duration)}ms)\n`;
      });
      content += '\n';
    }
    
    // 错误信息
    if (errors.length > 0) {
      content += '❌ 错误信息\n';
      content += `-`.repeat(20) + '\n';
      errors.forEach((error, index) => {
        content += `${index + 1}. [${error.type}] ${error.file}\n`;
        if (error.test) {
          content += `   测试: ${error.test}\n`;
        }
        content += `   错误: ${error.message.split('\n')[0]}\n\n`;
      });
    }
    
    // 警告信息
    if (warnings.length > 0) {
      content += '⚠️ 警告信息\n';
      content += `-`.repeat(20) + '\n';
      warnings.forEach((warning, index) => {
        content += `${index + 1}. [${warning.type}] ${warning.message}\n`;
      });
      content += '\n';
    }
    
    content += '报告生成时间: ' + new Date().toLocaleString() + '\n';
    
    return content;
  }

  /**
   * 生成CSV报告
   * @param {Object} results - 处理后的结果
   */
  generateCsvReport(results) {
    const reportPath = path.join(this.outputDir, 'test-results.csv');
    const content = this.formatCsvReport(results);
    fs.writeFileSync(reportPath, content);
  }

  /**
   * 格式化CSV报告
   * @param {Object} results - 处理后的结果
   * @returns {string} CSV格式的报告
   */
  formatCsvReport(results) {
    let content = 'File,Success,Duration,Total Tests,Passed,Failed,Pending\n';
    
    results.testResults.forEach(suite => {
      content += `"${suite.filePath}",${suite.success},${suite.duration},${suite.numTests},${suite.numPassingTests},${suite.numFailingTests},${suite.numPendingTests}\n`;
    });
    
    return content;
  }

  /**
   * 生成Markdown报告
   * @param {Object} results - 处理后的结果
   */
  generateMarkdownReport(results) {
    const reportPath = path.join(this.outputDir, 'test-results.md');
    const content = this.formatMarkdownReport(results);
    fs.writeFileSync(reportPath, content);
  }

  /**
   * 格式化Markdown报告
   * @param {Object} results - 处理后的结果
   * @returns {string} Markdown格式的报告
   */
  formatMarkdownReport(results) {
    const { summary, performance, errors, warnings } = results;
    
    let content = '';
    content += '# 测试结果报告\n\n';
    
    // 摘要信息
    content += '## 📊 测试摘要\n\n';
    content += `- **状态**: ${summary.success ? '✅ 通过' : '❌ 失败'}\n`;
    content += `- **总耗时**: ${summary.duration}ms\n`;
    content += `- **测试套件**: ${summary.numPassedTestSuites}/${summary.numTotalTestSuites} 通过\n`;
    content += `- **测试用例**: ${summary.numPassedTests}/${summary.numTotalTests} 通过\n`;
    content += `- **失败用例**: ${summary.numFailedTests}\n`;
    content += `- **跳过用例**: ${summary.numPendingTests}\n\n`;
    
    // 性能指标
    content += '## ⚡ 性能指标\n\n';
    content += '| 指标 | 值 |\n';
    content += '|------|-----|\n';
    content += `| 平均耗时 | ${Math.round(performance.avgDuration)}ms |\n`;
    content += `| 最大耗时 | ${Math.round(performance.maxDuration)}ms |\n`;
    content += `| 最小耗时 | ${Math.round(performance.minDuration)}ms |\n`;
    content += `| 测试速度 | ${Math.round(performance.testsPerSecond)} 测试/秒 |\n\n`;
    
    // 测试套件详情
    content += '## 📝 测试套件详情\n\n';
    content += '| 文件 | 状态 | 耗时 | 总计 | 通过 | 失败 | 跳过 |\n';
    content += '|------|------|------|------|------|------|------|\n';
    results.testResults.forEach(suite => {
      const status = suite.success ? '✅' : '❌';
      content += `| ${suite.filePath} | ${status} | ${suite.duration}ms | ${suite.numTests} | ${suite.numPassingTests} | ${suite.numFailingTests} | ${suite.numPendingTests} |\n`;
    });
    content += '\n';
    
    // 错误信息
    if (errors.length > 0) {
      content += '## ❌ 错误信息\n\n';
      errors.forEach((error, index) => {
        content += `### ${index + 1}. ${error.file}\n\n`;
        if (error.test) {
          content += `**测试**: ${error.test}\n\n`;
        }
        content += '```\n';
        content += error.message;
        content += '\n```\n\n';
      });
    }
    
    // 警告信息
    if (warnings.length > 0) {
      content += '## ⚠️ 警告信息\n\n';
      warnings.forEach((warning, index) => {
        content += `${index + 1}. **${warning.type}**: ${warning.message}\n`;
      });
      content += '\n';
    }
    
    content += `---\n*报告生成时间: ${new Date().toLocaleString()}*\n`;
    
    return content;
  }

  /**
   * 打印控制台摘要
   * @param {Object} results - 处理后的结果
   */
  printConsoleSummary(results) {
    const { summary, performance } = results;
    
    console.log('\n' + chalk.blue('📋 测试结果处理完成'));
    console.log(chalk.gray(`📊 报告已生成到: ${this.outputDir}/`));
    console.log(chalk.gray(`⚡ 平均耗时: ${Math.round(performance.avgDuration)}ms`));
    console.log(chalk.gray(`🚀 测试速度: ${Math.round(performance.testsPerSecond)} 测试/秒`));
  }
}

/**
 * 主处理函数
 * @param {Object} results - Jest测试结果
 * @returns {Object} 处理后的结果
 */
function processTestResults(results) {
  const processor = new TestResultsProcessor();
  return processor.process(results);
}

// 导出处理函数
module.exports = processTestResults;