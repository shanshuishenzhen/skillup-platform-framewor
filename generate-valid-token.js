/**
 * 生成有效的JWT token用于测试
 */

const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

// 使用与envConfig.ts相同的默认JWT_SECRET
const JWT_SECRET = 'your-secret-key';

async function generateValidToken() {
  console.log('🔑 生成有效的JWT token用于测试');
  console.log('=' .repeat(50));
  
  try {
    console.log('JWT Secret:', JWT_SECRET);
    
    // 创建token payload
    const payload = {
      userId: 'admin123',
      phone: 'admin123',
      role: 'SUPER_ADMIN',
      rbacRole: 'SUPER_ADMIN', // 添加rbacRole字段
      permissions: [],
      type: 'admin',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24小时后过期
    };
    
    console.log('\n📋 Token Payload:');
    console.log(JSON.stringify(payload, null, 2));
    
    // 生成token
    const token = jwt.sign(payload, JWT_SECRET);
    
    console.log('\n🎯 生成的Token:');
    console.log(token);
    
    // 验证token
    console.log('\n✅ 验证Token:');
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('验证成功:', !!decoded);
    console.log('解码结果:', JSON.stringify(decoded, null, 2));
    
    // 保存到文件
    const tokenData = {
      token: token,
      payload: payload,
      generatedAt: new Date().toISOString()
    };
    
    fs.writeFileSync('valid-token.json', JSON.stringify(tokenData, null, 2));
    console.log('\n💾 Token已保存到 valid-token.json');
    
    // 测试API调用
    console.log('\n🌐 测试API调用:');
    
    const testApiCall = async (endpoint, description) => {
      try {
        console.log(`\n测试 ${description}:`);
        console.log(`- 端点: ${endpoint}`);
        
        const response = await fetch(`http://localhost:3001${endpoint}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log(`- 状态码: ${response.status}`);
        console.log(`- 状态文本: ${response.statusText}`);
        
        if (response.ok) {
          const data = await response.json();
          console.log('- 响应成功 ✅');
          if (data.users) {
            console.log(`- 用户数量: ${data.users.length}`);
          }
          if (data.message) {
            console.log(`- 消息: ${data.message}`);
          }
        } else {
          const errorData = await response.text();
          console.log('- 响应失败 ❌');
          console.log('- 错误信息:', errorData.substring(0, 200));
        }
      } catch (error) {
        console.log('- 请求失败 ❌');
        console.log('- 错误:', error.message);
      }
    };
    
    // 等待一下让服务器准备好
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 测试各个API端点
    await testApiCall('/api/admin/check-permission', '权限检查API');
    await testApiCall('/api/admin/users', '用户列表API');
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ Token生成和测试完成');
    
  } catch (error) {
    console.error('❌ 生成Token过程中发生错误:', error);
  }
}

// 运行生成器
generateValidToken().catch(console.error);