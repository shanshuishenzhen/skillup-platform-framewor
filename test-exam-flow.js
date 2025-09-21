/**
 * 考试流程测试脚本
 * 测试完整的考试功能流程
 */

const BASE_URL = 'http://localhost:3000';

// 模拟用户数据
const testUser = {
  id: 'test-user-123',
  phone: '13800138000',
  role: 'USER'
};

// 测试考试ID
const testExamId = '550e8400-e29b-41d4-a716-446655440001';

/**
 * 发送HTTP请求的辅助函数
 */
async function makeRequest(url, options = {}) {
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
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
 * 生成测试JWT令牌
 */
function generateTestToken() {
  // 这里应该使用实际的JWT库，但为了测试简化处理
  const payload = {
    userId: testUser.id,
    phone: testUser.phone,
    role: testUser.role,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600 // 1小时后过期
  };
  
  // 注意：这里只是模拟，实际应用中需要使用正确的JWT签名
  return 'test-token-' + Buffer.from(JSON.stringify(payload)).toString('base64');
}

/**
 * 测试获取考试列表
 */
async function testGetExams() {
  console.log('\n=== 测试获取考试列表 ===');
  
  const result = await makeRequest(`${BASE_URL}/api/exams`);
  
  console.log('状态码:', result.status);
  console.log('响应:', JSON.stringify(result.data, null, 2));
  
  if (result.success && result.data.success) {
    console.log('✅ 获取考试列表成功');
    return result.data.data.exams;
  } else {
    console.log('❌ 获取考试列表失败');
    return [];
  }
}

/**
 * 测试获取考试详情
 */
async function testGetExamDetail(examId) {
  console.log('\n=== 测试获取考试详情 ===');
  
  const result = await makeRequest(`${BASE_URL}/api/exams/${examId}`);
  
  console.log('状态码:', result.status);
  console.log('响应:', JSON.stringify(result.data, null, 2));
  
  if (result.success && result.data.success) {
    console.log('✅ 获取考试详情成功');
    return result.data.data;
  } else {
    console.log('❌ 获取考试详情失败');
    return null;
  }
}

/**
 * 测试考试报名（不使用认证）
 */
async function testExamRegistrationWithoutAuth(examId) {
  console.log('\n=== 测试考试报名（无认证）===');
  
  const result = await makeRequest(`${BASE_URL}/api/exams/${examId}/register`, {
    method: 'POST',
    body: JSON.stringify({ userId: testUser.id })
  });
  
  console.log('状态码:', result.status);
  console.log('响应:', JSON.stringify(result.data, null, 2));
  
  if (result.success) {
    console.log('✅ 请求发送成功（但可能因认证失败）');
  } else {
    console.log('❌ 请求失败');
  }
  
  return result;
}

/**
 * 测试考试开始
 */
async function testStartExam(examId) {
  console.log('\n=== 测试考试开始 ===');
  
  const result = await makeRequest(`${BASE_URL}/api/exams/${examId}/start`, {
    method: 'POST',
    body: JSON.stringify({ userId: testUser.id })
  });
  
  console.log('状态码:', result.status);
  console.log('响应:', JSON.stringify(result.data, null, 2));
  
  return result;
}

/**
 * 测试考试提交
 */
async function testSubmitExam(examId) {
  console.log('\n=== 测试考试提交 ===');
  
  const answers = {
    'q1': 'A',
    'q2': 'B',
    'q3': 'C'
  };
  
  const result = await makeRequest(`${BASE_URL}/api/exams/${examId}/submit`, {
    method: 'POST',
    body: JSON.stringify({ 
      answers,
      isSubmit: true
    })
  });
  
  console.log('状态码:', result.status);
  console.log('响应:', JSON.stringify(result.data, null, 2));
  
  return result;
}

/**
 * 测试获取考试结果
 */
async function testGetExamResults(examId) {
  console.log('\n=== 测试获取考试结果 ===');
  
  const result = await makeRequest(`${BASE_URL}/api/exams/${examId}/results`);
  
  console.log('状态码:', result.status);
  console.log('响应:', JSON.stringify(result.data, null, 2));
  
  return result;
}

/**
 * 主测试函数
 */
async function runTests() {
  console.log('🚀 开始考试功能测试...');
  console.log('测试用户:', testUser);
  console.log('测试考试ID:', testExamId);
  
  try {
    // 1. 测试获取考试列表
    const exams = await testGetExams();
    
    // 2. 测试获取考试详情
    if (exams.length > 0) {
      await testGetExamDetail(exams[0].id);
    } else {
      await testGetExamDetail(testExamId);
    }
    
    // 3. 测试考试报名
    await testExamRegistrationWithoutAuth(testExamId);
    
    // 4. 测试考试开始
    await testStartExam(testExamId);
    
    // 5. 测试考试提交
    await testSubmitExam(testExamId);
    
    // 6. 测试获取考试结果
    await testGetExamResults(testExamId);
    
    console.log('\n🎉 测试完成！');
    
  } catch (error) {
    console.error('\n❌ 测试过程中发生错误:', error);
  }
}

// 如果直接运行此脚本
if (typeof window === 'undefined') {
  // Node.js环境
  const fetch = require('node-fetch');
  global.fetch = fetch;
  runTests();
} else {
  // 浏览器环境
  window.runExamTests = runTests;
}

// 导出测试函数
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    runTests,
    testGetExams,
    testGetExamDetail,
    testExamRegistrationWithoutAuth,
    testStartExam,
    testSubmitExam,
    testGetExamResults
  };
}