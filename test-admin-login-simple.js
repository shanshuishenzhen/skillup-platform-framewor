/**
 * 简单的管理员登录测试脚本
 */

const fetch = require('node-fetch');

async function testAdminLogin() {
  try {
    console.log('🧪 测试管理员登录...');
    console.log('手机号: 13823738278');
    console.log('密码: 123456');
    console.log('');
    
    const response = await fetch('http://localhost:3000/api/admin/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phone: '13823738278',
        password: '123456'
      }),
    });
    
    const result = await response.json();
    
    console.log(`HTTP状态码: ${response.status}`);
    console.log('响应结果:');
    console.log(JSON.stringify(result, null, 2));
    
    if (response.ok && result.success) {
      console.log('');
      console.log('✅ 管理员登录测试成功!');
      console.log(`管理员ID: ${result.user.id}`);
      console.log(`用户名: ${result.user.username}`);
      console.log(`角色: ${result.user.role}`);
      console.log(`Token: ${result.token.substring(0, 50)}...`);
    } else {
      console.log('');
      console.log('❌ 管理员登录测试失败');
      console.log(`错误信息: ${result.error || result.message}`);
    }
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error.message);
  }
}

// 运行测试
testAdminLogin();