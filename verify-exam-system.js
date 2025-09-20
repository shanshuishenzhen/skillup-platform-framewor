/**
 * 考试系统功能验证脚本
 * 用于全面测试考试系统的各项功能
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

// 配置
const CONFIG = {
  baseUrl: 'http://localhost:3001',
  timeout: 10000
};

// 验证结果
const results = {
  projectStructure: [],
  apiEndpoints: [],
  components: [],
  database: [],
  overall: {
    passed: 0,
    failed: 0,
    warnings: 0
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
 * 检查文件是否存在
 */
function checkFileExists(filePath, description) {
  const exists = fs.existsSync(filePath);
  const result = {
    test: description,
    path: filePath,
    passed: exists,
    message: exists ? '文件存在' : '文件不存在'
  };
  
  results.projectStructure.push(result);
  
  if (exists) {
    log(`${description}: 通过`, 'success');
    results.overall.passed++;
  } else {
    log(`${description}: 失败 - ${filePath}`, 'error');
    results.overall.failed++;
  }
  
  return exists;
}

/**
 * 检查目录是否存在
 */
function checkDirectoryExists(dirPath, description) {
  const exists = fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory();
  const result = {
    test: description,
    path: dirPath,
    passed: exists,
    message: exists ? '目录存在' : '目录不存在'
  };
  
  results.projectStructure.push(result);
  
  if (exists) {
    log(`${description}: 通过`, 'success');
    results.overall.passed++;
  } else {
    log(`${description}: 失败 - ${dirPath}`, 'error');
    results.overall.failed++;
  }
  
  return exists;
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
      headers: options.headers || {},
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
 * 测试API端点
 */
async function testApiEndpoint(endpoint, description, expectedStatus = 200) {
  try {
    log(`测试API端点: ${endpoint}`, 'debug');
    const response = await makeRequest(`${CONFIG.baseUrl}${endpoint}`);
    
    const passed = response.statusCode === expectedStatus;
    const result = {
      test: description,
      endpoint: endpoint,
      expectedStatus: expectedStatus,
      actualStatus: response.statusCode,
      passed: passed,
      message: passed ? '响应正常' : `期望状态码 ${expectedStatus}，实际 ${response.statusCode}`,
      responseSize: response.data.length
    };
    
    results.apiEndpoints.push(result);
    
    if (passed) {
      log(`${description}: 通过 (${response.statusCode})`, 'success');
      results.overall.passed++;
    } else {
      log(`${description}: 失败 - 状态码 ${response.statusCode}`, 'error');
      results.overall.failed++;
    }
    
    return { passed, response };
  } catch (error) {
    const result = {
      test: description,
      endpoint: endpoint,
      expectedStatus: expectedStatus,
      actualStatus: 'ERROR',
      passed: false,
      message: `请求失败: ${error.message}`,
      error: error.message
    };
    
    results.apiEndpoints.push(result);
    log(`${description}: 失败 - ${error.message}`, 'error');
    results.overall.failed++;
    
    return { passed: false, error };
  }
}

/**
 * 检查组件文件
 */
function checkComponent(componentPath, description) {
  const exists = checkFileExists(componentPath, description);
  
  if (exists) {
    try {
      const content = fs.readFileSync(componentPath, 'utf8');
      const hasExport = content.includes('export') || content.includes('module.exports');
      const hasReact = content.includes('React') || content.includes('jsx') || content.includes('tsx');
      
      const result = {
        test: `${description} - 代码质量`,
        path: componentPath,
        passed: hasExport,
        message: hasExport ? '包含导出语句' : '缺少导出语句',
        details: {
          hasExport,
          hasReact,
          size: content.length
        }
      };
      
      results.components.push(result);
      
      if (hasExport) {
        results.overall.passed++;
      } else {
        log(`${description}: 警告 - 缺少导出语句`, 'warning');
        results.overall.warnings++;
      }
    } catch (error) {
      log(`${description}: 警告 - 无法读取文件内容`, 'warning');
      results.overall.warnings++;
    }
  }
}

/**
 * 检查项目结构
 */
function checkProjectStructure() {
  log('开始检查项目结构...', 'info');
  
  // 核心目录
  checkDirectoryExists('./src', '源代码目录');
  checkDirectoryExists('./src/app', 'Next.js App目录');
  checkDirectoryExists('./src/components', '组件目录');
  checkDirectoryExists('./src/services', '服务目录');
  checkDirectoryExists('./src/types', '类型定义目录');
  checkDirectoryExists('./src/hooks', 'React Hooks目录');
  checkDirectoryExists('./src/utils', '工具函数目录');
  
  // 核心配置文件
  checkFileExists('./package.json', 'Package.json配置文件');
  checkFileExists('./next.config.js', 'Next.js配置文件');
  checkFileExists('./tailwind.config.js', 'Tailwind配置文件');
  checkFileExists('./tsconfig.json', 'TypeScript配置文件');
  checkFileExists('./.env.local', '环境变量文件');
  
  // API路由
  checkDirectoryExists('./src/app/api', 'API路由目录');
  checkDirectoryExists('./src/app/api/exams', '考试API目录');
  checkDirectoryExists('./src/app/api/questions', '题目API目录');
  
  // 核心服务文件
  checkFileExists('./src/services/examService.ts', '考试服务文件');
  checkFileExists('./src/services/questionService.ts', '题目服务文件');
  checkFileExists('./src/services/supabaseClient.ts', 'Supabase客户端文件');
  
  // 类型定义文件
  checkFileExists('./src/types/exam.ts', '考试类型定义');
  checkFileExists('./src/types/question.ts', '题目类型定义');
}

/**
 * 检查核心组件
 */
function checkCoreComponents() {
  log('开始检查核心组件...', 'info');
  
  // 页面组件
  checkComponent('./src/app/page.tsx', '首页组件');
  checkComponent('./src/app/exams/page.tsx', '考试列表页面');
  checkComponent('./src/app/questions/page.tsx', '题目管理页面');
  
  // 核心组件
  checkComponent('./src/components/ExamCard.tsx', '考试卡片组件');
  checkComponent('./src/components/QuestionForm.tsx', '题目表单组件');
  checkComponent('./src/components/ExamForm.tsx', '考试表单组件');
}

/**
 * 测试API端点
 */
async function testApiEndpoints() {
  log('开始测试API端点...', 'info');
  
  // 基础API测试
  await testApiEndpoint('/api/exams', '获取考试列表API');
  await testApiEndpoint('/api/questions', '获取题目列表API');
  
  // 测试不存在的端点
  await testApiEndpoint('/api/nonexistent', '不存在的API端点', 404);
}

/**
 * 检查数据库连接
 */
async function checkDatabaseConnection() {
  log('开始检查数据库连接...', 'info');
  
  try {
    // 通过API端点间接测试数据库连接
    const examResult = await testApiEndpoint('/api/exams', '数据库连接测试(通过考试API)');
    
    if (examResult.passed) {
      const result = {
        test: '数据库连接状态',
        passed: true,
        message: '数据库连接正常',
        method: '通过API端点测试'
      };
      results.database.push(result);
      log('数据库连接: 正常', 'success');
      results.overall.passed++;
    } else {
      const result = {
        test: '数据库连接状态',
        passed: false,
        message: '数据库连接可能存在问题',
        method: '通过API端点测试'
      };
      results.database.push(result);
      log('数据库连接: 可能存在问题', 'warning');
      results.overall.warnings++;
    }
  } catch (error) {
    const result = {
      test: '数据库连接状态',
      passed: false,
      message: `数据库连接测试失败: ${error.message}`,
      error: error.message
    };
    results.database.push(result);
    log(`数据库连接: 失败 - ${error.message}`, 'error');
    results.overall.failed++;
  }
}

/**
 * 生成详细报告
 */
function generateReport() {
  log('生成验证报告...', 'info');
  
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total: results.overall.passed + results.overall.failed + results.overall.warnings,
      passed: results.overall.passed,
      failed: results.overall.failed,
      warnings: results.overall.warnings,
      successRate: Math.round((results.overall.passed / (results.overall.passed + results.overall.failed)) * 100) || 0
    },
    details: results
  };
  
  // 保存报告到文件
  const reportPath = './exam-system-verification-report.json';
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  // 输出摘要
  console.log('\n' + '='.repeat(60));
  console.log('📊 考试系统验证报告摘要');
  console.log('='.repeat(60));
  console.log(`📅 验证时间: ${new Date().toLocaleString()}`);
  console.log(`📈 总测试项: ${report.summary.total}`);
  console.log(`✅ 通过: ${report.summary.passed}`);
  console.log(`❌ 失败: ${report.summary.failed}`);
  console.log(`⚠️  警告: ${report.summary.warnings}`);
  console.log(`🎯 成功率: ${report.summary.successRate}%`);
  console.log('='.repeat(60));
  
  // 详细结果
  console.log('\n📋 详细结果:');
  console.log(`\n🏗️  项目结构检查: ${results.projectStructure.filter(r => r.passed).length}/${results.projectStructure.length} 通过`);
  console.log(`🔌 API端点测试: ${results.apiEndpoints.filter(r => r.passed).length}/${results.apiEndpoints.length} 通过`);
  console.log(`🧩 组件检查: ${results.components.filter(r => r.passed).length}/${results.components.length} 通过`);
  console.log(`🗄️  数据库连接: ${results.database.filter(r => r.passed).length}/${results.database.length} 通过`);
  
  // 失败项目详情
  const failedTests = [
    ...results.projectStructure.filter(r => !r.passed),
    ...results.apiEndpoints.filter(r => !r.passed),
    ...results.components.filter(r => !r.passed),
    ...results.database.filter(r => !r.passed)
  ];
  
  if (failedTests.length > 0) {
    console.log('\n❌ 失败项目详情:');
    failedTests.forEach(test => {
      console.log(`   • ${test.test}: ${test.message}`);
    });
  }
  
  console.log(`\n📄 详细报告已保存到: ${reportPath}`);
  
  // 建议
  console.log('\n💡 建议:');
  if (report.summary.successRate >= 90) {
    console.log('   🎉 系统状态良好，可以进行功能测试');
  } else if (report.summary.successRate >= 70) {
    console.log('   🔧 系统基本可用，建议修复失败项目后再进行完整测试');
  } else {
    console.log('   🚨 系统存在较多问题，建议优先修复核心功能');
  }
  
  return report;
}

/**
 * 主验证函数
 */
async function main() {
  console.log('🚀 开始考试系统功能验证...');
  console.log(`🌐 测试目标: ${CONFIG.baseUrl}`);
  console.log('='.repeat(60));
  
  try {
    // 1. 检查项目结构
    checkProjectStructure();
    
    // 2. 检查核心组件
    checkCoreComponents();
    
    // 3. 测试API端点
    await testApiEndpoints();
    
    // 4. 检查数据库连接
    await checkDatabaseConnection();
    
    // 5. 生成报告
    const report = generateReport();
    
    // 6. 退出码
    const exitCode = report.summary.failed > 0 ? 1 : 0;
    process.exit(exitCode);
    
  } catch (error) {
    log(`验证过程发生错误: ${error.message}`, 'error');
    console.error(error);
    process.exit(1);
  }
}

// 运行验证
if (require.main === module) {
  main();
}

module.exports = {
  main,
  checkProjectStructure,
  checkCoreComponents,
  testApiEndpoints,
  checkDatabaseConnection,
  generateReport
};