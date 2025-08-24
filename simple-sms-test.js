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
async function testSendSms() {
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
    phone: '13800138002',
    purpose: 'register'
  });

  try {
    const response = await makeRequest(options, requestData);
    console.log('状态码:', response.statusCode);
    console.log('响应体:', response.body);
    
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
      console.log('❌ API请求失败，状态码:', response.statusCode);
      return null;
    }
  } catch (error) {
    console.log('❌ 请求错误:', error.message);
    return null;
  }
}

// 运行测试
async function runTest() {
  console.log('🚀 开始简单短信验证码测试...');
  const code = await testSendSms();
  
  if (code) {
    console.log('\n✅ 测试成功完成');
    console.log('验证码:', code);
  } else {
    console.log('\n❌ 测试失败');
  }
}

runTest().catch(console.error);