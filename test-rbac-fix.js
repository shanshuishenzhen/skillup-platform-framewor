/**
 * RBAC权限验证修复测试脚本
 * 通过实际API请求测试权限验证是否正常工作
 */

const http = require('http');
const https = require('https');

async function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https:') ? https : http;
    
    const req = protocol.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });
    
    req.on('error', reject);
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

async function testRBACFix() {
  console.log('🚀 开始测试RBAC权限验证修复...');
  
  try {
    const baseUrl = 'http://localhost:3000';
    
    // 1. 首先尝试管理员登录获取token
    console.log('\n=== 步骤1: 管理员登录获取token ===');
    const loginResponse = await makeRequest(`${baseUrl}/api/admin/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        phone: '13800138000',
        password: 'admin123'
      })
    });
    
    console.log('📊 登录响应状态:', loginResponse.statusCode);
    
    if (loginResponse.statusCode === 200) {
      const loginData = JSON.parse(loginResponse.body);
      console.log('✅ 管理员登录成功');
      console.log('🔑 获取到token:', loginData.token ? loginData.token.substring(0, 50) + '...' : '未找到token');
      
      if (loginData.token) {
        // 2. 使用token访问管理员API
        console.log('\n=== 步骤2: 使用token访问用户列表API ===');
        const usersResponse = await makeRequest(`${baseUrl}/api/admin/users`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${loginData.token}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log('📊 用户列表API响应状态:', usersResponse.statusCode);
        console.log('📋 响应头:', usersResponse.headers);
        
        if (usersResponse.statusCode === 200) {
          console.log('\n🎉 测试成功！');
          console.log('✅ RBAC权限验证修复生效');
          console.log('✅ SUPER_ADMIN角色可以正常访问管理员API');
          
          const usersData = JSON.parse(usersResponse.body);
          console.log('📊 用户列表数据:', {
            success: usersData.success,
            userCount: usersData.data ? usersData.data.length : 0
          });
        } else {
          console.log('\n❌ 测试失败！');
          console.log('🔍 用户列表API访问被拒绝，状态码:', usersResponse.statusCode);
          console.log('📋 响应内容:', usersResponse.body);
        }
      } else {
        console.log('❌ 登录响应中未找到token');
      }
    } else {
      console.log('❌ 管理员登录失败，状态码:', loginResponse.statusCode);
      console.log('📋 响应内容:', loginResponse.body);
    }
    
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 提示: 请确保开发服务器正在运行 (npm run dev)');
    }
  }
}

// 运行测试
testRBACFix().then(() => {
  console.log('\n🏁 测试完成');
}).catch(error => {
  console.error('💥 测试执行失败:', error);
  process.exit(1);
});