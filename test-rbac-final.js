/**
 * 最终RBAC权限验证测试
 */

const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3001';

// 测试用的管理员凭据
const ADMIN_CREDENTIALS = {
  phone: '13823738278',
  password: '123456'
};

/**
 * 测试管理员登录并获取token
 */
async function testAdminLogin() {
  try {
    console.log('🔐 测试管理员登录...');
    
    const response = await fetch(`${BASE_URL}/api/admin/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(ADMIN_CREDENTIALS)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ 登录请求失败 (${response.status}):`, errorText);
      return null;
    }

    const result = await response.json();
    
    if (result.success && result.token) {
      console.log('✅ 管理员登录成功');
      console.log('   用户ID:', result.user.id);
      console.log('   用户名:', result.user.username);
      console.log('   角色:', result.user.role);
      console.log('   Token:', result.token.substring(0, 50) + '...');
      return result.token;
    } else {
      console.error('❌ 登录失败:', result.error || result.message);
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
  try {
    console.log('\n🔒 测试管理员权限验证...');
    
    const response = await fetch(`${BASE_URL}/api/admin/users?page=1&limit=10`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });

    console.log('   响应状态:', response.status);
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ 权限验证成功');
      console.log('   返回数据类型:', typeof result);
      console.log('   数据长度:', Array.isArray(result) ? result.length : 'N/A');
    } else {
      const errorText = await response.text();
      console.error('❌ 权限验证失败:', errorText);
    }
  } catch (error) {
    console.error('❌ 权限验证请求失败:', error.message);
  }
}

/**
 * 主测试函数
 */
async function main() {
  console.log('🚀 开始RBAC权限验证最终测试');
  console.log('请查看开发服务器控制台的调试日志输出\n');
  
  // 测试管理员登录
  const token = await testAdminLogin();
  
  if (!token) {
    console.log('\n❌ 无法获取有效token，测试终止');
    return;
  }
  
  // 测试管理员权限
  await testAdminPermission(token);
  
  console.log('\n🎯 测试完成！请检查开发服务器控制台的RBAC调试日志');
}

// 运行测试
main().catch(console.error);