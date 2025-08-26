/**
 * RBAC权限验证调试测试脚本
 * 测试管理员登录和权限验证的调试日志输出
 */

const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3001';

// 测试用的管理员凭据
const ADMIN_CREDENTIALS = {
  phone: '13823738278',
  password: '123456'
};

/**
 * 测试管理员登录
 */
async function testAdminLogin() {
  console.log('\n🔐 测试管理员登录...');
  
  try {
    const response = await fetch(`${BASE_URL}/api/admin/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(ADMIN_CREDENTIALS)
    });

    const data = await response.json();
    
    if (response.ok && data.success) {
      console.log('✅ 管理员登录成功');
      console.log('Token:', data.token.substring(0, 50) + '...');
      return data.token;
    } else {
      console.log('❌ 管理员登录失败:', data.error || data.message);
      return null;
    }
  } catch (error) {
    console.error('❌ 登录请求失败:', error.message);
    return null;
  }
}

/**
 * 测试管理员权限验证
 */
async function testAdminPermission(token) {
  console.log('\n🔍 测试管理员权限验证...');
  
  try {
    const response = await fetch(`${BASE_URL}/api/admin/users?page=1&limit=5`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });

    const data = await response.json();
    
    console.log('响应状态:', response.status);
    console.log('响应数据:', JSON.stringify(data, null, 2));
    
    if (response.ok && data.success) {
      console.log('✅ 管理员权限验证成功');
      console.log('用户数量:', data.data?.users?.length || 0);
      return true;
    } else {
      console.log('❌ 管理员权限验证失败:', data.error || data.message);
      return false;
    }
  } catch (error) {
    console.error('❌ 权限验证请求失败:', error.message);
    return false;
  }
}

/**
 * 主测试函数
 */
async function runTest() {
  console.log('🚀 开始RBAC权限验证调试测试');
  console.log('请查看开发服务器控制台的调试日志输出');
  
  // 测试管理员登录
  const token = await testAdminLogin();
  
  if (!token) {
    console.log('\n❌ 无法获取有效token，测试终止');
    return;
  }
  
  // 等待一秒让日志输出
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // 测试管理员权限
  const hasPermission = await testAdminPermission(token);
  
  console.log('\n📊 测试结果总结:');
  console.log('- 管理员登录:', token ? '✅ 成功' : '❌ 失败');
  console.log('- 权限验证:', hasPermission ? '✅ 成功' : '❌ 失败');
  console.log('\n💡 请检查开发服务器控制台的RBAC调试日志');
}

// 运行测试
runTest().catch(console.error);