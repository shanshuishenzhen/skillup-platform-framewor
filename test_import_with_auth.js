/**
 * 测试用户导入API（带认证）
 * 先获取JWT token，然后测试用户导入功能
 */

const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const fetch = require('node-fetch');
const jwt = require('jsonwebtoken');

// 测试配置
const TEST_CONFIG = {
  baseUrl: 'http://localhost:3000',
  adminPhone: '13823738278',
  adminPassword: '123456',
  loginEndpoint: '/api/admin/auth/login',
  importEndpoint: '/api/admin/users/import',
  csvFilePath: path.join(__dirname, 'uploads', 'test-20-users.csv')
};

/**
 * 获取管理员JWT token
 */
async function getAdminToken() {
  console.log('\n=== 获取管理员认证Token ===');
  
  try {
    const response = await fetch(`${TEST_CONFIG.baseUrl}${TEST_CONFIG.loginEndpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': `${TEST_CONFIG.baseUrl}/login`,
        'Origin': TEST_CONFIG.baseUrl
      },
      body: JSON.stringify({
        phone: TEST_CONFIG.adminPhone,
        password: TEST_CONFIG.adminPassword
      })
    });
    
    const result = await response.json();
    
    if (result.success && result.token) {
      console.log('✅ 成功获取认证Token');
      console.log('用户角色:', result.user?.role);
      console.log('Token:', result.token.substring(0, 50) + '...');
      
      // 解码token查看内容
      try {
        const decoded = jwt.decode(result.token, { complete: true });
        console.log('Token载荷:', JSON.stringify(decoded.payload, null, 2));
      } catch (jwtError) {
        console.log('Token解码失败:', jwtError.message);
      }
      
      return result.token;
    } else {
      console.log('❌ 获取Token失败:', result.message || result.error);
      return null;
    }
    
  } catch (error) {
    console.error('获取Token异常:', error.message);
    return null;
  }
}

/**
 * 测试用户导入API（带认证）
 */
async function testImportWithAuth(token) {
  console.log('\n=== 测试用户导入API（带认证） ===');
  
  // 检查CSV文件是否存在
  if (!fs.existsSync(TEST_CONFIG.csvFilePath)) {
    console.error('❌ CSV文件不存在:', TEST_CONFIG.csvFilePath);
    return false;
  }
  
  console.log('✅ CSV文件存在:', TEST_CONFIG.csvFilePath);
  
  try {
    // 创建FormData
    const formData = new FormData();
    formData.append('file', fs.createReadStream(TEST_CONFIG.csvFilePath));
    
    console.log('\n--- 发送导入请求 ---');
    console.log('请求URL:', `${TEST_CONFIG.baseUrl}${TEST_CONFIG.importEndpoint}`);
    console.log('认证Token:', token.substring(0, 50) + '...');
    
    const response = await fetch(`${TEST_CONFIG.baseUrl}${TEST_CONFIG.importEndpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        ...formData.getHeaders()
      },
      body: formData
    });
    
    console.log('\n--- 响应信息 ---');
    console.log('状态码:', response.status);
    console.log('状态文本:', response.statusText);
    
    const responseText = await response.text();
    console.log('\n--- 响应内容 ---');
    console.log('原始响应:', responseText);
    
    let responseData;
    try {
      responseData = JSON.parse(responseText);
      console.log('解析后的响应:', JSON.stringify(responseData, null, 2));
    } catch (parseError) {
      console.error('JSON解析失败:', parseError.message);
      return false;
    }
    
    if (response.ok && responseData.success) {
      console.log('\n✅ 用户导入成功!');
      console.log('导入统计:');
      console.log('- 成功导入:', responseData.data?.successCount || 0, '个用户');
      console.log('- 导入失败:', responseData.data?.failureCount || 0, '个用户');
      console.log('- 重复用户:', responseData.data?.duplicateCount || 0, '个用户');
      
      if (responseData.data?.errors && responseData.data.errors.length > 0) {
        console.log('\n错误详情:');
        responseData.data.errors.forEach((error, index) => {
          console.log(`${index + 1}. ${error}`);
        });
      }
      
      return true;
    } else {
      console.log('\n❌ 用户导入失败');
      console.log('错误信息:', responseData.message || responseData.error || '未知错误');
      return false;
    }
    
  } catch (error) {
    console.error('\n导入请求异常:', error.message);
    return false;
  }
}

/**
 * 主测试函数
 */
async function runImportTest() {
  console.log('🚀 用户导入API测试开始（带认证）');
  console.log('时间:', new Date().toLocaleString());
  
  // 1. 获取认证Token
  const token = await getAdminToken();
  if (!token) {
    console.log('\n❌ 测试终止: 无法获取认证Token');
    return;
  }
  
  // 2. 测试用户导入API
  const importResult = await testImportWithAuth(token);
  
  // 3. 输出测试总结
  console.log('\n\n=== 测试总结 ===');
  console.log(`用户导入测试: ${importResult ? '✅ 成功' : '❌ 失败'}`);
  
  if (!importResult) {
    console.log('\n🔍 问题诊断建议:');
    console.log('1. 检查CSV文件格式是否正确');
    console.log('2. 验证数据库连接是否正常');
    console.log('3. 检查用户导入API的实现逻辑');
    console.log('4. 查看服务器日志获取详细错误信息');
  }
  
  console.log('\n🏁 测试完成');
}

// 运行测试
if (require.main === module) {
  runImportTest().catch(error => {
    console.error('测试执行异常:', error);
    process.exit(1);
  });
}

module.exports = {
  getAdminToken,
  testImportWithAuth,
  runImportTest
};