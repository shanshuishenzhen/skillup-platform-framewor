/**
 * 生成测试用的JWT token
 */
const jwt = require('jsonwebtoken');

// 使用与应用相同的JWT密钥
const JWT_SECRET = 'your-secret-key';

// 创建测试用户payload
const payload = {
  userId: '1c0c29b7-047a-4e3a-a5cd-eb0b0eb8e7d3', // 使用现有的super admin用户ID
  phone: '13823738278',
  role: 'SUPER_ADMIN',
  userType: 'registered',
  type: 'access'
};

// 生成token
const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });

console.log('Generated JWT Token:');
console.log(token);
console.log('\nToken payload:');
console.log(JSON.stringify(payload, null, 2));

// 验证token
try {
  const decoded = jwt.verify(token, JWT_SECRET);
  console.log('\nToken verification successful:');
  console.log(JSON.stringify(decoded, null, 2));
} catch (error) {
  console.error('\nToken verification failed:', error.message);
}