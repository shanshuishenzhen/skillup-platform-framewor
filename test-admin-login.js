/**
 * 管理员登录功能测试脚本
 * 测试手机号: 13823738278
 * 测试密码: 123456
 * 
 * 功能说明:
 * - 模拟前端登录请求
 * - 验证后端API响应
 * - 输出详细的调试信息
 * - 检查JWT token生成和验证
 */

// 使用Node.js内置的fetch API (Node 18+)
const jwt = require('jsonwebtoken');

// 测试配置
const TEST_CONFIG = {
  baseUrl: 'http://localhost:3000',
  adminPhone: '13823738278',
  adminPassword: '123456',
  loginEndpoint: '/api/admin/auth/login'
};

/**
 * 测试管理员登录API
 * @param {string} phone - 管理员手机号
 * @param {string} password - 管理员密码
 * @returns {Promise<Object>} 登录响应结果
 */
async function testAdminLogin(phone, password) {
  console.log('\n=== 开始测试管理员登录 ===');
  console.log(`测试手机号: ${phone}`);
  console.log(`测试密码: ${password}`);
  console.log(`请求URL: ${TEST_CONFIG.baseUrl}${TEST_CONFIG.loginEndpoint}`);
  
  try {
    const requestBody = {
      phone: phone,
      password: password
    };
    
    console.log('\n--- 发送登录请求 ---');
    console.log('请求体:', JSON.stringify(requestBody, null, 2));
    
    const response = await fetch(`${TEST_CONFIG.baseUrl}${TEST_CONFIG.loginEndpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    console.log('\n--- 响应信息 ---');
    console.log(`状态码: ${response.status}`);
    console.log(`状态文本: ${response.statusText}`);
    console.log('响应头:', Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    console.log('\n--- 响应内容 ---');
    console.log('原始响应:', responseText);
    
    let responseData;
    try {
      responseData = JSON.parse(responseText);
      console.log('解析后的响应:', JSON.stringify(responseData, null, 2));
    } catch (parseError) {
      console.error('JSON解析失败:', parseError.message);
      return { success: false, error: 'JSON解析失败', rawResponse: responseText };
    }
    
    if (response.ok && responseData.success) {
      console.log('\n--- 登录成功 ---');
      console.log('用户信息:', JSON.stringify(responseData.user, null, 2));
      
      if (responseData.token) {
        console.log('\n--- JWT Token 分析 ---');
        console.log('Token:', responseData.token);
        
        try {
          // 解码JWT token（不验证签名）
          const decoded = jwt.decode(responseData.token, { complete: true });
          console.log('Token头部:', JSON.stringify(decoded.header, null, 2));
          console.log('Token载荷:', JSON.stringify(decoded.payload, null, 2));
          
          // 检查token过期时间
          if (decoded.payload.exp) {
            const expirationDate = new Date(decoded.payload.exp * 1000);
            console.log(`Token过期时间: ${expirationDate.toLocaleString()}`);
          }
        } catch (jwtError) {
          console.error('JWT解码失败:', jwtError.message);
        }
      }
      
      return { success: true, data: responseData };
    } else {
      console.log('\n--- 登录失败 ---');
      console.log('错误信息:', responseData.message || responseData.error || '未知错误');
      return { success: false, error: responseData.message || responseData.error, data: responseData };
    }
    
  } catch (error) {
    console.error('\n--- 请求异常 ---');
    console.error('错误类型:', error.constructor.name);
    console.error('错误信息:', error.message);
    console.error('错误堆栈:', error.stack);
    return { success: false, error: error.message };
  }
}

/**
 * 测试前端登录流程模拟
 * 模拟浏览器环境下的登录请求
 */
async function testFrontendLoginFlow() {
  console.log('\n\n=== 模拟前端登录流程 ===');
  
  try {
    // 模拟前端表单数据
    const formData = {
      phone: TEST_CONFIG.adminPhone,
      password: TEST_CONFIG.adminPassword,
      loginType: 'password' // 模拟前端登录类型
    };
    
    console.log('前端表单数据:', JSON.stringify(formData, null, 2));
    
    // 模拟前端fetch请求
    const response = await fetch(`${TEST_CONFIG.baseUrl}${TEST_CONFIG.loginEndpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': `${TEST_CONFIG.baseUrl}/login`,
        'Origin': TEST_CONFIG.baseUrl
      },
      body: JSON.stringify({
        phone: formData.phone,
        password: formData.password
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('✅ 前端登录流程成功');
      console.log('用户角色:', result.user?.role);
      console.log('用户状态:', result.user?.status);
      
      // 模拟前端存储token
      console.log('\n--- 模拟前端Token存储 ---');
      console.log('localStorage.setItem("token", token)');
      console.log('localStorage.setItem("user", userInfo)');
      
      return true;
    } else {
      console.log('❌ 前端登录流程失败');
      console.log('失败原因:', result.message);
      return false;
    }
    
  } catch (error) {
    console.error('前端登录流程异常:', error.message);
    return false;
  }
}

/**
 * 检查服务器状态
 */
async function checkServerStatus() {
  console.log('\n=== 检查服务器状态 ===');
  
  try {
    // 直接测试登录API端点是否可访问
    const response = await fetch(`${TEST_CONFIG.baseUrl}${TEST_CONFIG.loginEndpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });
    
    // 即使返回错误，只要能连接到服务器就说明服务器在运行
    console.log('✅ 服务器运行正常，可以访问API端点');
    return true;
    
  } catch (error) {
    console.log('❌ 无法连接到服务器:', error.message);
    console.log('请确保开发服务器正在运行: npm run dev');
    return false;
  }
}

/**
 * 主测试函数
 */
async function runTests() {
  console.log('🚀 管理员登录功能测试开始');
  console.log('时间:', new Date().toLocaleString());
  
  // 1. 检查服务器状态
  const serverOk = await checkServerStatus();
  if (!serverOk) {
    console.log('\n❌ 测试终止: 服务器不可用');
    return;
  }
  
  // 2. 测试管理员登录API
  const loginResult = await testAdminLogin(TEST_CONFIG.adminPhone, TEST_CONFIG.adminPassword);
  
  // 3. 测试前端登录流程
  const frontendResult = await testFrontendLoginFlow();
  
  // 4. 输出测试总结
  console.log('\n\n=== 测试总结 ===');
  console.log(`API登录测试: ${loginResult.success ? '✅ 通过' : '❌ 失败'}`);
  console.log(`前端流程测试: ${frontendResult ? '✅ 通过' : '❌ 失败'}`);
  
  if (!loginResult.success) {
    console.log('\n🔍 问题诊断建议:');
    console.log('1. 检查数据库中管理员用户是否存在');
    console.log('2. 验证密码哈希是否正确');
    console.log('3. 检查JWT密钥配置');
    console.log('4. 查看服务器日志获取详细错误信息');
  }
  
  if (!frontendResult) {
    console.log('\n🔍 前端问题诊断:');
    console.log('1. 检查前端登录页面的API调用');
    console.log('2. 验证请求头和请求体格式');
    console.log('3. 检查浏览器控制台错误信息');
  }
  
  console.log('\n🏁 测试完成');
}

// 运行测试
if (require.main === module) {
  runTests().catch(error => {
    console.error('测试执行异常:', error);
    process.exit(1);
  });
}

module.exports = {
  testAdminLogin,
  testFrontendLoginFlow,
  checkServerStatus,
  runTests
};