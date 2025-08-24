const http = require('http');

// 简单的HTTP请求函数
function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: body
        });
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (data) {
      req.write(data);
    }
    req.end();
  });
}

// 测试发送短信验证码API
async function testSendSms(phone) {
  console.log('🧪 测试发送短信验证码API...');
  
  const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/sms/send',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  };

  const requestData = JSON.stringify({
    phone: phone,
    purpose: 'register'
  });

  try {
    const response = await makeRequest(options, requestData);
    console.log('发送短信状态码:', response.statusCode);
    console.log('发送短信响应体:', response.body);
    
    if (response.statusCode === 200) {
      const result = JSON.parse(response.body);
      if (result.success) {
        console.log('✅ 发送短信验证码成功');
        console.log('📱 验证码:', result.code);
        return result.code;
      } else {
        console.log('❌ 发送短信验证码失败:', result.message);
        return null;
      }
    } else {
      console.log('❌ 发送短信API请求失败，状态码:', response.statusCode);
      return null;
    }
  } catch (error) {
    console.log('❌ 发送短信请求错误:', error.message);
    return null;
  }
}

// 测试注册API
async function testRegister(phone, password, smsCode) {
  console.log('\n🧪 测试注册API...');
  
  const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/auth/register',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  };

  const requestData = JSON.stringify({
    phone: phone,
    password: password,
    smsCode: smsCode
  });

  try {
    const response = await makeRequest(options, requestData);
    console.log('注册状态码:', response.statusCode);
    console.log('注册响应体:', response.body);
    
    if (response.statusCode === 200) {
      const result = JSON.parse(response.body);
      if (result.success) {
        console.log('✅ 注册成功');
        console.log('👤 用户信息:', result.data.user);
        return true;
      } else {
        console.log('❌ 注册失败:', result.message);
        return false;
      }
    } else {
      console.log('❌ 注册API请求失败，状态码:', response.statusCode);
      try {
        const errorResult = JSON.parse(response.body);
        console.log('错误信息:', errorResult.error);
      } catch (e) {
        console.log('无法解析错误响应');
      }
      return false;
    }
  } catch (error) {
    console.log('❌ 注册请求错误:', error.message);
    return false;
  }
}

// 运行完整测试
async function runFullTest() {
  console.log('🚀 开始完整的注册流程测试...');
  
  const testPhone = '13800138003';
  const testPassword = 'test123456';
  
  // 1. 发送短信验证码
  const smsCode = await testSendSms(testPhone);
  
  if (!smsCode) {
    console.log('\n❌ 测试失败：无法获取短信验证码');
    return;
  }
  
  // 2. 使用验证码进行注册
  const registerSuccess = await testRegister(testPhone, testPassword, smsCode);
  
  if (registerSuccess) {
    console.log('\n✅ 完整测试成功：注册流程正常工作');
  } else {
    console.log('\n❌ 完整测试失败：注册流程存在问题');
  }
}

runFullTest().catch(console.error);