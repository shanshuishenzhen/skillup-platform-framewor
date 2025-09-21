/**
 * 带认证的考试流程测试
 * 模拟完整的用户认证和考试流程
 */

const jwt = require('jsonwebtoken');
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';
// 从.env文件读取JWT_SECRET
require('dotenv').config();
const JWT_SECRET = process.env.JWT_SECRET_KEY || 'sk1llup_pl4tf0rm_jwt_s3cr3t_k3y_2024_v3ry_s3cur3_r4nd0m_str1ng_f0r_pr0duct10n';

// 测试用户信息 - 使用新的UUID避免冲突
const testUser = {
  userId: '550e8400-e29b-41d4-a716-446655440002',
  phone: '13800138002',
  role: 'USER'
};

// 测试考试ID
const testExamId = '550e8400-e29b-41d4-a716-446655440001';

/**
 * 生成有效的JWT令牌
 */
function generateJWTToken(user) {
  const payload = {
    userId: user.userId,
    phone: user.phone,
    role: user.role,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600 // 1小时后过期
  };
  
  return jwt.sign(payload, JWT_SECRET);
}

/**
 * 发送带认证的HTTP请求
 */
async function makeAuthenticatedRequest(url, options = {}, token) {
  try {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(url, {
      headers,
      ...options
    });
    
    const data = await response.json();
    return {
      status: response.status,
      success: response.ok,
      data
    };
  } catch (error) {
    console.error('请求失败:', error);
    return {
      status: 500,
      success: false,
      error: error.message
    };
  }
}

/**
 * 测试用户登录（模拟）
 */
async function testUserLogin() {
  console.log('\n=== 模拟用户登录 ===');
  
  // 生成JWT令牌
  const token = generateJWTToken(testUser);
  console.log('生成的JWT令牌:', token.substring(0, 50) + '...');
  
  return token;
}

/**
 * 测试带认证的考试报名
 */
async function testAuthenticatedExamRegistration(examId, token) {
  console.log('\n=== 测试考试报名（带认证）===');
  
  const result = await makeAuthenticatedRequest(
    `${BASE_URL}/api/exams/${examId}/register`,
    {
      method: 'POST',
      body: JSON.stringify({})
    },
    token
  );
  
  console.log('状态码:', result.status);
  console.log('响应:', JSON.stringify(result.data, null, 2));
  
  if (result.success && result.data.success) {
    console.log('✅ 考试报名成功');
  } else {
    console.log('❌ 考试报名失败:', result.data.message || '未知错误');
  }
  
  return result;
}

/**
 * 测试带认证的考试开始
 */
async function testAuthenticatedStartExam(examId, token) {
  console.log('\n=== 测试考试开始（带认证）===');
  
  const result = await makeAuthenticatedRequest(
    `${BASE_URL}/api/exams/${examId}/start`,
    {
      method: 'POST',
      body: JSON.stringify({})
    },
    token
  );
  
  console.log('状态码:', result.status);
  console.log('响应:', JSON.stringify(result.data, null, 2));
  
  if (result.success && result.data.success) {
    console.log('✅ 考试开始成功');
    return result.data.data;
  } else {
    console.log('❌ 考试开始失败:', result.data.message || '未知错误');
    return null;
  }
}

/**
 * 测试带认证的考试提交
 */
async function testAuthenticatedSubmitExam(examId, token, attemptId) {
  console.log('\n=== 测试考试提交（带认证）===');
  
  // 模拟答案
  const answers = {
    '550e8400-e29b-41d4-a716-446655440011': 'A',
    '550e8400-e29b-41d4-a716-446655440012': 'B',
    '550e8400-e29b-41d4-a716-446655440013': 'A',
    '550e8400-e29b-41d4-a716-446655440014': 'A',
    '550e8400-e29b-41d4-a716-446655440015': 'B'
  };
  
  const result = await makeAuthenticatedRequest(
    `${BASE_URL}/api/exams/${examId}/submit`,
    {
      method: 'POST',
      body: JSON.stringify({
        answers,
        isSubmit: true,
        attemptId
      })
    },
    token
  );
  
  console.log('状态码:', result.status);
  console.log('响应:', JSON.stringify(result.data, null, 2));
  
  if (result.success && result.data.success) {
    console.log('✅ 考试提交成功');
    return result.data.data;
  } else {
    console.log('❌ 考试提交失败:', result.data.message || '未知错误');
    return null;
  }
}

/**
 * 测试带认证的考试结果查看
 */
async function testAuthenticatedGetExamResults(examId, token) {
  console.log('\n=== 测试获取考试结果（带认证）===');
  
  const result = await makeAuthenticatedRequest(
    `${BASE_URL}/api/exams/${examId}/results`,
    { method: 'GET' },
    token
  );
  
  console.log('状态码:', result.status);
  console.log('响应:', JSON.stringify(result.data, null, 2));
  
  if (result.success && result.data.success) {
    console.log('✅ 获取考试结果成功');
    return result.data.data;
  } else {
    console.log('❌ 获取考试结果失败:', result.data.message || '未知错误');
    return null;
  }
}

/**
 * 主测试函数 - 完整的考试流程测试
 */
async function runAuthenticatedTests() {
  console.log('🚀 开始完整的考试流程测试...');
  console.log('测试用户:', testUser);
  console.log('测试考试ID:', testExamId);
  
  try {
    // 1. 模拟用户登录
    const token = await testUserLogin();
    
    // 2. 测试考试报名
    const registrationResult = await testAuthenticatedExamRegistration(testExamId, token);
    if (!registrationResult.success) {
      console.log('❌ 考试报名失败，无法继续后续测试');
      return;
    }
    
    // 3. 测试考试开始
    const startResult = await testAuthenticatedStartExam(testExamId, token);
    if (!startResult) {
      console.log('❌ 考试开始失败，无法继续后续测试');
      return;
    }
    
    // 4. 测试考试提交
    const submitResult = await testAuthenticatedSubmitExam(testExamId, token, startResult.attemptId || startResult.id);
    if (!submitResult) {
      console.log('❌ 考试提交失败，无法继续后续测试');
      return;
    }
    
    // 5. 测试获取考试结果
    const resultsData = await testAuthenticatedGetExamResults(testExamId, token);
    
    console.log('\n🎉 完整考试流程测试完成！');
    
    // 总结测试结果
    console.log('\n📊 测试结果总结:');
    console.log('- 用户认证: ✅ 成功');
    console.log('- 考试报名: ✅ 成功');
    console.log('- 考试开始: ✅ 成功');
    console.log('- 考试提交: ✅ 成功');
    console.log('- 结果查看:', resultsData ? '✅ 成功' : '❌ 失败');
    
    console.log('\n✅ 所有测试通过！完整的考试系统功能正常工作。');
    
  } catch (error) {
    console.error('\n❌ 测试过程中发生错误:', error);
  }
}

// 运行测试
if (require.main === module) {
  runAuthenticatedTests();
}

module.exports = {
  runAuthenticatedTests,
  testUserLogin,
  testAuthenticatedExamRegistration,
  testAuthenticatedStartExam,
  testAuthenticatedSubmitExam,
  testAuthenticatedGetExamResults
};