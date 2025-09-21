/**
 * 调试HTTP请求和JWT处理
 */

require('dotenv').config();
const jwt = require('jsonwebtoken');
const axios = require('axios');

// 生成JWT令牌
const JWT_SECRET = process.env.JWT_SECRET_KEY || 'sk1llup_pl4tf0rm_jwt_s3cr3t_k3y_2024_v3ry_s3cur3_r4nd0m_str1ng_f0r_pr0duct10n';

const payload = {
  userId: '550e8400-e29b-41d4-a716-446655440000',
  phone: '13800138000',
  role: 'USER'
};

const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
console.log('生成的JWT令牌:', token.substring(0, 50) + '...');
console.log('令牌载荷:', payload);

// 验证令牌
try {
  const decoded = jwt.verify(token, JWT_SECRET);
  console.log('✅ 本地验证成功:', { userId: decoded.userId, role: decoded.role });
} catch (error) {
  console.log('❌ 本地验证失败:', error.message);
}

// 测试HTTP请求
async function testHttpRequest() {
  try {
    console.log('\n=== 测试HTTP请求 ===');
    
    // 测试考试报名
    const response = await axios.post(
      'http://localhost:3000/api/exams/550e8400-e29b-41d4-a716-446655440001/participate',
      {},
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'x-user-id': '550e8400-e29b-41d4-a716-446655440000'
        },
        timeout: 10000
      }
    );
    
    console.log('考试报名响应状态:', response.status);
    console.log('考试报名响应数据:', response.data);
    
  } catch (error) {
    if (error.response) {
      console.log('HTTP错误状态:', error.response.status);
      console.log('HTTP错误数据:', error.response.data);
    } else {
      console.log('请求错误:', error.message);
    }
  }
}

// 等待一下再发送请求，确保服务器已启动
setTimeout(testHttpRequest, 1000);