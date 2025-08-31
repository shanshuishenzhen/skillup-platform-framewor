/**
 * E2E 测试结果处理器
 * 处理和格式化测试结果，生成自定义报告
 */

import fs from 'fs';
import path from 'path';

/**
 * 处理测试结果
 * @param {Object} results Jest 测试结果对象
 * @returns {Object} 处理后的结果
 */
function processResults(results) {
  const timestamp = new Date().toISOString();
  const reportDir = path.join(process.cwd(), 'coverage', 'e2e');
  
  // 确保报告目录存在
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
  
  // 生成简化的测试报告
  const summary = {
    timestamp,
    testResults: {
      total: results.numTotalTests,
      passed: results.numPassedTests,
      failed: results.numFailedTests,
      pending: results.numPendingTests,
      todo: results.numTodoTests
    },
    testSuites: {
      total: results.numTotalTestSuites,
      passed: results.numPassedTestSuites,
      failed: results.numFailedTestSuites,
      pending: results.numPendingTestSuites
    },
    coverage: results.coverageMap ? {
      enabled: true,
      statements: results.coverageMap.getCoverageSummary().statements.pct,
      branches: results.coverageMap.getCoverageSummary().branches.pct,
      functions: results.coverageMap.getCoverageSummary().functions.pct,
      lines: results.coverageMap.getCoverageSummary().lines.pct
    } : { enabled: false },
    duration: results.testResults.reduce((total, suite) => {
      return total + (suite.perfStats ? suite.perfStats.runtime : 0);
    }, 0),
    success: results.success
  };
  
  // 保存测试摘要
  const summaryPath = path.join(reportDir, 'test-summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
  
  // 如果有失败的测试，生成详细的失败报告
  if (results.numFailedTests > 0) {
    const failedTests = [];
    
    results.testResults.forEach(suite => {
      if (suite.testResults) {
        suite.testResults.forEach(test => {
          if (test.status === 'failed') {
            failedTests.push({
              suiteName: suite.testFilePath,
              testName: test.fullName,
              error: test.failureMessages.join('\n'),
              duration: test.duration
            });
          }
        });
      }
    });
    
    const failuresPath = path.join(reportDir, 'test-failures.json');
    fs.writeFileSync(failuresPath, JSON.stringify(failedTests, null, 2));
  }
  
  // 输出控制台摘要
  console.log('\n📊 E2E 测试结果摘要:');
  console.log(`✅ 通过: ${summary.testResults.passed}/${summary.testResults.total}`);
  console.log(`❌ 失败: ${summary.testResults.failed}`);
  console.log(`⏸️  跳过: ${summary.testResults.pending}`);
  console.log(`⏱️  耗时: ${(summary.duration / 1000).toFixed(2)}s`);
  
  if (summary.coverage.enabled) {
    console.log(`📈 覆盖率: ${summary.coverage.statements.toFixed(1)}%`);
  }
  
  console.log(`📄 详细报告: ${reportDir}`);
  
  return results;
}

export default processResults;
