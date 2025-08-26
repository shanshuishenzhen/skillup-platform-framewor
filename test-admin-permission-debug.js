/**
 * 管理员权限诊断测试脚本
 * 用于诊断管理员登录和权限验证的完整流程
 */

const fetch = require('node-fetch');
const jwt = require('jsonwebtoken');

const BASE_URL = 'http://localhost:3000';
const ADMIN_CREDENTIALS = {
  phone: '13823738278',
  password: '123456'
};

/**
 * 测试管理员登录API
 * @returns {Promise<{success: boolean, token?: string, error?: string}>}
 */
async function testAdminLogin() {
  console.log('\n=== 测试管理员登录API ===');
  console.log(`登录信息: 手机号=${ADMIN_CREDENTIALS.phone}, 密码=${ADMIN_CREDENTIALS.password}`);
  
  try {
    const response = await fetch(`${BASE_URL}/api/admin/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(ADMIN_CREDENTIALS)
    });
    
    const data = await response.json();
    
    console.log(`响应状态: ${response.status}`);
    console.log('响应数据:', JSON.stringify(data, null, 2));
    
    if (response.ok && data.token) {
      console.log('✅ 登录成功');
      return { success: true, token: data.token };
    } else {
      console.log('❌ 登录失败');
      return { success: false, error: data.message || '登录失败' };
    }
  } catch (error) {
    console.log('❌ 登录请求异常:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * 解析JWT token内容
 * @param {string} token - JWT token
 * @returns {object} 解析后的token内容
 */
function parseJWTToken(token) {
  console.log('\n=== 解析JWT Token ===');
  console.log('Token:', token);
  
  try {
    // 解码token（不验证签名）
    const decoded = jwt.decode(token, { complete: true });
    
    if (!decoded) {
      console.log('❌ Token解码失败');
      return null;
    }
    
    console.log('Token Header:', JSON.stringify(decoded.header, null, 2));
    console.log('Token Payload:', JSON.stringify(decoded.payload, null, 2));
    
    const payload = decoded.payload;
    console.log('\n--- Token内容分析 ---');
    console.log(`用户ID: ${payload.userId}`);
    console.log(`手机号: ${payload.phone}`);
    console.log(`角色: ${payload.role}`);
    console.log(`权限: ${JSON.stringify(payload.permissions)}`);
    console.log(`类型: ${payload.type}`);
    console.log(`过期时间: ${new Date(payload.exp * 1000).toLocaleString()}`);
    
    // 检查token是否过期
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) {
      console.log('⚠️ Token已过期');
    } else {
      console.log('✅ Token有效');
    }
    
    return payload;
  } catch (error) {
    console.log('❌ Token解析异常:', error.message);
    return null;
  }
}

/**
 * 测试权限检查API
 * @param {string} token - JWT token
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function testPermissionCheck(token) {
  console.log('\n=== 测试权限检查API ===');
  
  try {
    const response = await fetch(`${BASE_URL}/api/admin/check-permission`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    console.log(`响应状态: ${response.status}`);
    console.log('响应数据:', JSON.stringify(data, null, 2));
    
    if (response.ok) {
      console.log('✅ 权限检查通过');
      return { success: true };
    } else {
      console.log('❌ 权限检查失败');
      return { success: false, error: data.message || '权限检查失败' };
    }
  } catch (error) {
    console.log('❌ 权限检查请求异常:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * 测试访问管理员页面
 * @param {string} token - JWT token
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function testAdminPageAccess(token) {
  console.log('\n=== 测试管理员页面访问 ===');
  
  try {
    const response = await fetch(`${BASE_URL}/admin`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'text/html'
      }
    });
    
    console.log(`响应状态: ${response.status}`);
    console.log(`响应类型: ${response.headers.get('content-type')}`);
    
    if (response.ok) {
      console.log('✅ 管理员页面访问成功');
      return { success: true };
    } else {
      console.log('❌ 管理员页面访问失败');
      return { success: false, error: `HTTP ${response.status}` };
    }
  } catch (error) {
    console.log('❌ 管理员页面访问异常:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * 检查数据库中的管理员用户信息
 * @returns {Promise<void>}
 */
async function checkAdminUserInDB() {
  console.log('\n=== 检查数据库中的管理员用户 ===');
  
  try {
    const response = await fetch(`${BASE_URL}/api/admin/debug/user-info?phone=${ADMIN_CREDENTIALS.phone}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('数据库用户信息:', JSON.stringify(data, null, 2));
    } else {
      console.log('❌ 无法获取数据库用户信息');
    }
  } catch (error) {
    console.log('❌ 检查数据库用户异常:', error.message);
  }
}

/**
 * 主测试函数
 */
async function runDiagnostics() {
  console.log('🔍 开始管理员权限诊断测试...');
  console.log('=' * 50);
  
  // 1. 检查数据库中的管理员用户
  await checkAdminUserInDB();
  
  // 2. 测试管理员登录
  const loginResult = await testAdminLogin();
  if (!loginResult.success) {
    console.log('\n❌ 登录失败，无法继续测试');
    console.log('错误信息:', loginResult.error);
    return;
  }
  
  const token = loginResult.token;
  
  // 3. 解析JWT token
  const tokenPayload = parseJWTToken(token);
  if (!tokenPayload) {
    console.log('\n❌ Token解析失败，无法继续测试');
    return;
  }
  
  // 4. 测试权限检查API
  const permissionResult = await testPermissionCheck(token);
  
  // 5. 测试管理员页面访问
  const pageAccessResult = await testAdminPageAccess(token);
  
  // 6. 输出诊断总结
  console.log('\n' + '=' * 50);
  console.log('🔍 诊断结果总结:');
  console.log(`登录状态: ${loginResult.success ? '✅ 成功' : '❌ 失败'}`);
  console.log(`Token解析: ${tokenPayload ? '✅ 成功' : '❌ 失败'}`);
  console.log(`权限检查: ${permissionResult.success ? '✅ 通过' : '❌ 失败'}`);
  console.log(`页面访问: ${pageAccessResult.success ? '✅ 成功' : '❌ 失败'}`);
  
  if (tokenPayload) {
    console.log('\n📋 Token信息:');
    console.log(`- 用户角色: ${tokenPayload.role}`);
    console.log(`- 用户权限: ${JSON.stringify(tokenPayload.permissions)}`);
    console.log(`- Token类型: ${tokenPayload.type}`);
  }
  
  if (!permissionResult.success) {
    console.log('\n🔧 权限问题可能原因:');
    console.log('1. JWT token格式不正确');
    console.log('2. 用户角色不是admin或super_admin');
    console.log('3. 权限检查API逻辑有误');
    console.log('4. 数据库中用户角色数据不正确');
    console.log('5. Token签名验证失败');
  }
  
  if (!pageAccessResult.success) {
    console.log('\n🔧 页面访问问题可能原因:');
    console.log('1. 前端权限守卫逻辑有误');
    console.log('2. 路由保护配置不正确');
    console.log('3. localStorage中token存储有问题');
    console.log('4. 前端权限检查API调用失败');
  }
  
  console.log('\n✅ 诊断测试完成');
}

// 运行诊断测试
if (require.main === module) {
  runDiagnostics().catch(error => {
    console.error('❌ 诊断测试异常:', error);
    process.exit(1);
  });
}

module.exports = {
  testAdminLogin,
  parseJWTToken,
  testPermissionCheck,
  testAdminPageAccess,
  runDiagnostics
};