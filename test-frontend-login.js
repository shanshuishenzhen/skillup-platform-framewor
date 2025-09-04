/**
 * 测试前端登录表单提交
 * 模拟浏览器环境下的登录请求
 */

const fetch = require('node-fetch');

/**
 * 测试前端登录流程
 * @param {string} phone - 手机号
 * @param {string} password - 密码
 */
async function testFrontendLogin(phone, password) {
  console.log('🧪 测试前端登录流程...');
  console.log(`手机号: ${phone}`);
  console.log(`密码: ${password}`);
  console.log('=' .repeat(50));
  
  try {
    // 模拟前端登录请求
    const requestBody = {
      phone: phone,
      password: password
    };
    
    console.log('📤 发送请求数据:', JSON.stringify(requestBody, null, 2));
    
    const response = await fetch('http://localhost:3000/api/admin/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      body: JSON.stringify(requestBody)
    });
    
    console.log('📥 响应状态:', response.status, response.statusText);
    
    const result = await response.json();
    console.log('📥 响应数据:', JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log('✅ 登录成功!');
      console.log('👤 用户信息:', result.user?.real_name, result.user?.phone);
      console.log('🔑 Token存在:', !!result.token);
    } else {
      console.log('❌ 登录失败:', result.error || result.message);
    }
    
  } catch (error) {
    console.error('❌ 请求失败:', error.message);
  }
}

/**
 * 测试不同密码
 */
async function testDifferentPasswords() {
  const phone = '13823738278';
  const passwords = ['123456', 'admin123', 'password', '13823738278'];
  
  for (const password of passwords) {
    console.log('\n' + '='.repeat(60));
    console.log(`🔍 测试密码: ${password}`);
    await testFrontendLogin(phone, password);
    
    // 等待一秒避免请求过快
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

// 执行测试
testDifferentPasswords().catch(console.error);