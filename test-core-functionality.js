/**
 * 考试系统核心功能测试脚本
 * 测试考试列表页面、题目管理页面、组件加载和API响应
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

// 配置
const CONFIG = {
  baseUrl: 'http://localhost:3001',
  timeout: 10000
};

// 测试结果
const testResults = {
  pageTests: [],
  apiTests: [],
  componentTests: [],
  overall: {
    passed: 0,
    failed: 0,
    total: 0
  }
};

/**
 * 日志输出函数
 */
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = {
    info: '📋',
    success: '✅',
    error: '❌',
    warning: '⚠️',
    debug: '🔍'
  }[type] || '📋';
  
  console.log(`${prefix} [${timestamp}] ${message}`);
}

/**
 * HTTP请求函数
 */
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'User-Agent': 'Test-Script/1.0',
        'Accept': 'text/html,application/json,*/*',
        ...options.headers
      },
      timeout: CONFIG.timeout
    };

    const req = http.request(requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: data
        });
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (options.body) {
      req.write(options.body);
    }

    req.end();
  });
}

/**
 * 测试页面访问
 */
async function testPageAccess(path, description) {
  try {
    log(`测试页面访问: ${path}`, 'debug');
    const response = await makeRequest(`${CONFIG.baseUrl}${path}`);
    
    const passed = response.statusCode === 200;
    const result = {
      test: description,
      path: path,
      statusCode: response.statusCode,
      passed: passed,
      message: passed ? '页面加载成功' : `HTTP ${response.statusCode}`,
      responseSize: response.data.length,
      hasContent: response.data.length > 1000 // 检查是否有实际内容
    };
    
    testResults.pageTests.push(result);
    testResults.overall.total++;
    
    if (passed) {
      log(`${description}: 通过 (${response.statusCode}, ${response.data.length} bytes)`, 'success');
      testResults.overall.passed++;
    } else {
      log(`${description}: 失败 - HTTP ${response.statusCode}`, 'error');
      testResults.overall.failed++;
    }
    
    return { passed, response };
  } catch (error) {
    const result = {
      test: description,
      path: path,
      statusCode: 'ERROR',
      passed: false,
      message: `请求失败: ${error.message}`,
      error: error.message
    };
    
    testResults.pageTests.push(result);
    testResults.overall.total++;
    testResults.overall.failed++;
    
    log(`${description}: 失败 - ${error.message}`, 'error');
    return { passed: false, error };
  }
}

/**
 * 测试API端点
 */
async function testApiEndpoint(endpoint, description, method = 'GET', expectedStatus = 200) {
  try {
    log(`测试API: ${method} ${endpoint}`, 'debug');
    const response = await makeRequest(`${CONFIG.baseUrl}${endpoint}`, { method });
    
    const passed = response.statusCode === expectedStatus;
    const result = {
      test: description,
      endpoint: endpoint,
      method: method,
      expectedStatus: expectedStatus,
      actualStatus: response.statusCode,
      passed: passed,
      message: passed ? 'API响应正常' : `期望 ${expectedStatus}，实际 ${response.statusCode}`,
      responseSize: response.data.length
    };
    
    // 尝试解析JSON响应
    try {
      const jsonData = JSON.parse(response.data);
      result.hasValidJson = true;
      result.dataStructure = typeof jsonData;
      if (Array.isArray(jsonData)) {
        result.arrayLength = jsonData.length;
      }
    } catch (e) {
      result.hasValidJson = false;
    }
    
    testResults.apiTests.push(result);
    testResults.overall.total++;
    
    if (passed) {
      log(`${description}: 通过 (${response.statusCode})`, 'success');
      testResults.overall.passed++;
    } else {
      log(`${description}: 失败 - 状态码 ${response.statusCode}`, 'error');
      testResults.overall.failed++;
    }
    
    return { passed, response };
  } catch (error) {
    const result = {
      test: description,
      endpoint: endpoint,
      method: method,
      expectedStatus: expectedStatus,
      actualStatus: 'ERROR',
      passed: false,
      message: `请求失败: ${error.message}`,
      error: error.message
    };
    
    testResults.apiTests.push(result);
    testResults.overall.total++;
    testResults.overall.failed++;
    
    log(`${description}: 失败 - ${error.message}`, 'error');
    return { passed: false, error };
  }
}

/**
 * 检查组件文件
 */
function checkComponentFile(filePath, description) {
  try {
    const exists = fs.existsSync(filePath);
    if (!exists) {
      throw new Error('文件不存在');
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    const hasExport = content.includes('export') || content.includes('module.exports');
    const hasReact = content.includes('React') || content.includes('jsx') || content.includes('tsx');
    const hasTypeScript = filePath.endsWith('.ts') || filePath.endsWith('.tsx');
    
    const result = {
      test: description,
      filePath: filePath,
      passed: exists && hasExport,
      fileSize: content.length,
      hasExport: hasExport,
      hasReact: hasReact,
      hasTypeScript: hasTypeScript,
      message: exists && hasExport ? '组件文件正常' : '组件文件存在问题'
    };
    
    testResults.componentTests.push(result);
    testResults.overall.total++;
    
    if (result.passed) {
      log(`${description}: 通过 (${content.length} bytes)`, 'success');
      testResults.overall.passed++;
    } else {
      log(`${description}: 失败 - ${result.message}`, 'error');
      testResults.overall.failed++;
    }
    
    return result;
  } catch (error) {
    const result = {
      test: description,
      filePath: filePath,
      passed: false,
      message: `检查失败: ${error.message}`,
      error: error.message
    };
    
    testResults.componentTests.push(result);
    testResults.overall.total++;
    testResults.overall.failed++;
    
    log(`${description}: 失败 - ${error.message}`, 'error');
    return result;
  }
}

/**
 * 生成测试报告
 */
function generateReport() {
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total: testResults.overall.total,
      passed: testResults.overall.passed,
      failed: testResults.overall.failed,
      successRate: testResults.overall.total > 0 ? 
        Math.round((testResults.overall.passed / testResults.overall.total) * 100) : 0
    },
    details: {
      pageTests: testResults.pageTests,
      apiTests: testResults.apiTests,
      componentTests: testResults.componentTests
    }
  };
  
  // 保存报告到文件
  fs.writeFileSync('./core-functionality-test-report.json', JSON.stringify(report, null, 2));
  
  return report;
}

/**
 * 主测试函数
 */
async function runTests() {
  console.log('\n============================================================');
  console.log('🚀 考试系统核心功能测试开始');
  console.log('============================================================\n');
  
  // 1. 测试页面访问
  log('开始测试页面访问...', 'info');
  await testPageAccess('/', '主页访问');
  await testPageAccess('/exams', '考试列表页面');
  await testPageAccess('/questions', '题目管理页面');
  
  // 2. 测试API端点
  log('开始测试API端点...', 'info');
  await testApiEndpoint('/api/exams', '考试列表API');
  await testApiEndpoint('/api/questions', '题目列表API');
  
  // 3. 检查关键组件
  log('开始检查组件文件...', 'info');
  checkComponentFile('./src/app/exams/page.tsx', '考试列表页面组件');
  checkComponentFile('./src/app/questions/page.tsx', '题目管理页面组件');
  checkComponentFile('./src/components/ExamCard.tsx', '考试卡片组件');
  checkComponentFile('./src/components/QuestionForm.tsx', '题目表单组件');
  checkComponentFile('./src/components/ExamForm.tsx', '考试表单组件');
  
  // 4. 生成报告
  log('生成测试报告...', 'info');
  const report = generateReport();
  
  // 5. 输出摘要
  console.log('\n============================================================');
  console.log('📊 核心功能测试报告摘要');
  console.log('============================================================');
  console.log(`📅 测试时间: ${new Date().toLocaleString('zh-CN')}`);
  console.log(`📈 总测试项: ${report.summary.total}`);
  console.log(`✅ 通过: ${report.summary.passed}`);
  console.log(`❌ 失败: ${report.summary.failed}`);
  console.log(`🎯 成功率: ${report.summary.successRate}%`);
  console.log('============================================================\n');
  
  console.log('📋 详细结果:\n');
  console.log(`🌐 页面访问测试: ${testResults.pageTests.filter(t => t.passed).length}/${testResults.pageTests.length} 通过`);
  console.log(`🔌 API端点测试: ${testResults.apiTests.filter(t => t.passed).length}/${testResults.apiTests.length} 通过`);
  console.log(`🧩 组件文件检查: ${testResults.componentTests.filter(t => t.passed).length}/${testResults.componentTests.length} 通过`);
  
  if (report.summary.failed > 0) {
    console.log('\n❌ 失败项目详情:');
    [...testResults.pageTests, ...testResults.apiTests, ...testResults.componentTests]
      .filter(test => !test.passed)
      .forEach(test => {
        console.log(`   • ${test.test}: ${test.message}`);
      });
  }
  
  console.log(`\n📄 详细报告已保存到: ./core-functionality-test-report.json`);
  
  if (report.summary.successRate >= 90) {
    console.log('\n💡 建议:');
    console.log('   🎉 核心功能测试通过，系统可以正常使用');
  } else {
    console.log('\n💡 建议:');
    console.log('   🔧 存在一些问题需要修复，建议检查失败项目');
  }
  
  return report;
}

// 运行测试
if (require.main === module) {
  runTests().catch(error => {
    console.error('测试运行失败:', error);
    process.exit(1);
  });
}

module.exports = { runTests, testResults };