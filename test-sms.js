/**
 * 短信验证码测试运行脚本
 * 使用方法: node test-sms.js
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');

// 测试配置
const TEST_CONFIG = {
  testPhone: '13800138001',
  testPassword: 'Test123456',
  purpose: 'register',
  baseUrl: 'http://localhost:3001',
  timeout: 10000
};

/**
 * 发送 HTTP 请求的辅助函数
 * @param {string} url 请求URL
 * @param {object} options 请求选项
 * @param {string} data 请求数据
 * @returns {Promise} 响应数据
 */
function makeRequest(url, options = {}, data = null) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const isHttps = parsedUrl.protocol === 'https:';
    const httpModule = isHttps ? https : http;
    
    const requestOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (isHttps ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      timeout: TEST_CONFIG.timeout
    };
    
    if (data) {
      const postData = JSON.stringify(data);
      requestOptions.headers['Content-Length'] = Buffer.byteLength(postData);
    }
    
    const req = httpModule.request(requestOptions, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(responseData);
          resolve({
            statusCode: res.statusCode,
            data: jsonData,
            success: res.statusCode >= 200 && res.statusCode < 300
          });
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            data: responseData,
            success: res.statusCode >= 200 && res.statusCode < 300,
            parseError: error.message
          });
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('请求超时'));
    });
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

/**
 * 测试发送短信验证码 API
 */
async function testSendSmsApi() {
  console.log('\n🧪 测试1: 发送短信验证码 API');
  
  try {
    const response = await makeRequest(
      `${TEST_CONFIG.baseUrl}/api/sms/send`,
      { method: 'POST' },
      {
        phone: TEST_CONFIG.testPhone,
        purpose: TEST_CONFIG.purpose
      }
    );
    
    if (!response.success) {
      throw new Error(`API请求失败: ${response.statusCode} - ${JSON.stringify(response.data)}`);
    }
    
    if (!response.data.success) {
      throw new Error(`API返回失败: ${response.data.message || '未知错误'}`);
    }
    
    console.log('✅ 发送短信验证码 API 测试通过');
    console.log(`📱 验证码: ${response.data.code || '未返回验证码'}`);
    
    return {
      success: true,
      code: response.data.code,
      message: response.data.message
    };
  } catch (error) {
    console.log(`❌ 发送短信验证码 API 测试失败: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 测试注册 API
 */
async function testRegisterApi(verificationCode) {
  console.log('\n🧪 测试2: 注册 API');
  
  if (!verificationCode) {
    console.log('❌ 注册 API 测试跳过: 没有验证码');
    return { success: false, error: '没有验证码' };
  }
  
  try {
    const response = await makeRequest(
      `${TEST_CONFIG.baseUrl}/api/auth/register`,
      { method: 'POST' },
      {
        phone: TEST_CONFIG.testPhone,
        password: TEST_CONFIG.testPassword,
        smsCode: verificationCode
      }
    );
    
    if (!response.success) {
      throw new Error(`API请求失败: ${response.statusCode} - ${JSON.stringify(response.data)}`);
    }
    
    if (!response.data.success) {
      throw new Error(`API返回失败: ${response.data.message || '未知错误'}`);
    }
    
    console.log('✅ 注册 API 测试通过');
    console.log(`👤 用户: ${JSON.stringify(response.data.user, null, 2)}`);
    
    return {
      success: true,
      user: response.data.user,
      token: response.data.token
    };
  } catch (error) {
    console.log(`❌ 注册 API 测试失败: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 检查开发服务器状态
 */
async function checkServerStatus() {
  console.log('🔍 检查开发服务器状态...');
  
  try {
    const response = await makeRequest(`${TEST_CONFIG.baseUrl}/api/health`);
    console.log('✅ 开发服务器运行正常');
    return true;
  } catch (error) {
    console.log('❌ 开发服务器连接失败');
    console.log('💡 请确保运行了: npm run dev');
    return false;
  }
}

/**
 * 主测试函数
 */
async function runTests() {
  console.log('🚀 开始短信验证码功能测试...');
  console.log(`测试手机号: ${TEST_CONFIG.testPhone}`);
  console.log(`测试基础URL: ${TEST_CONFIG.baseUrl}`);
  
  const results = [];
  
  // 检查服务器状态
  const serverOk = await checkServerStatus();
  if (!serverOk) {
    console.log('\n❌ 测试终止: 无法连接到开发服务器');
    process.exit(1);
  }
  
  // 测试1: 发送短信验证码
  const smsResult = await testSendSmsApi();
  results.push(smsResult);
  
  let verificationCode = null;
  if (smsResult.success && smsResult.code) {
    verificationCode = smsResult.code;
  }
  
  // 如果获取到验证码，测试注册流程
  if (verificationCode) {
    // 等待一秒，确保验证码已保存到数据库
    console.log('⏳ 等待验证码保存...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const registerResult = await testRegisterApi(verificationCode);
    results.push(registerResult);
  } else {
    console.log('\n⚠️  未获取到验证码，跳过注册测试');
    results.push({
      success: false,
      error: '未获取到验证码'
    });
  }
  
  // 生成测试报告
  console.log('\n' + '='.repeat(60));
  console.log('📊 测试报告');
  console.log('='.repeat(60));
  
  const totalTests = results.length;
  const passedTests = results.filter(r => r.success).length;
  const failedTests = totalTests - passedTests;
  
  console.log(`总测试数: ${totalTests}`);
  console.log(`通过测试: ${passedTests}`);
  console.log(`失败测试: ${failedTests}`);
  console.log(`成功率: ${((passedTests/totalTests)*100).toFixed(1)}%`);
  
  // 详细结果
  console.log('\n📋 详细结果:');
  results.forEach((result, index) => {
    const status = result.success ? '✅' : '❌';
    const testName = index === 0 ? '发送短信验证码 API' : '注册 API';
    console.log(`${index + 1}. ${status} ${testName}`);
    if (result.error) {
      console.log(`   错误: ${result.error}`);
    }
    if (result.message) {
      console.log(`   消息: ${result.message}`);
    }
  });
  
  // 修复建议
  if (failedTests > 0) {
    console.log('\n🔧 修复建议:');
    console.log('-'.repeat(40));
    
    results.forEach((result, index) => {
      if (!result.success) {
        const testName = index === 0 ? '发送短信验证码 API' : '注册 API';
        console.log(`\n${testName} 失败:`);
        console.log(`错误: ${result.error}`);
        
        if (index === 0) {
          console.log('建议:');
          console.log('- 检查开发服务器是否正在运行 (npm run dev)');
          console.log('- 确认 /api/sms/send 路由是否正确配置');
          console.log('- 检查 Supabase 连接是否正常');
          console.log('- 验证数据库中是否存在 sms_verification_codes 表');
        } else {
          console.log('建议:');
          console.log('- 检查验证码是否有效');
          console.log('- 确认用户是否已存在');
          console.log('- 检查密码格式是否符合要求');
          console.log('- 验证 users 表的权限设置');
        }
      }
    });
  } else {
    console.log('\n🎉 所有测试都通过了！短信验证码功能运行正常。');
  }
  
  console.log('\n' + '='.repeat(60));
  
  return failedTests === 0;
}

// 运行测试
runTests()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('❌ 测试执行失败:', error);
    process.exit(1);
  });