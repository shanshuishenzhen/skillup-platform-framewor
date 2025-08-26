const fetch = require('node-fetch');
const fs = require('fs');

// 读取有效的token
const tokenData = JSON.parse(fs.readFileSync('valid-token.json', 'utf8'));
const token = tokenData.token;

console.log('🧪 测试用户列表API');
console.log('Token:', token.substring(0, 50) + '...');

async function testUserAPI() {
  try {
    // 测试1: 带正确参数的请求
    console.log('\n📋 测试1: 带正确参数的请求');
    const response1 = await fetch('http://localhost:3001/api/admin/users?page=1&limit=10', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('状态码:', response1.status);
    console.log('状态文本:', response1.statusText);
    
    if (response1.ok) {
      const data1 = await response1.json();
      console.log('✅ 响应成功');
      console.log('用户数量:', data1.data?.users?.length || 0);
      console.log('分页信息:', data1.data?.pagination);
    } else {
      const error1 = await response1.text();
      console.log('❌ 响应失败');
      console.log('错误信息:', error1);
    }
    
    // 测试2: 不带参数的请求
    console.log('\n📋 测试2: 不带参数的请求');
    const response2 = await fetch('http://localhost:3001/api/admin/users', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('状态码:', response2.status);
    console.log('状态文本:', response2.statusText);
    
    if (response2.ok) {
      const data2 = await response2.json();
      console.log('✅ 响应成功');
      console.log('用户数量:', data2.data?.users?.length || 0);
      console.log('分页信息:', data2.data?.pagination);
    } else {
      const error2 = await response2.text();
      console.log('❌ 响应失败');
      console.log('错误信息:', error2);
    }
    
  } catch (error) {
    console.error('🚨 测试过程中发生错误:', error.message);
  }
}

testUserAPI();