/**
 * 调试JWT密钥配置
 */

require('dotenv').config();

console.log('=== JWT密钥调试 ===');
console.log('process.env.JWT_SECRET:', process.env.JWT_SECRET);
console.log('process.env.JWT_SECRET_KEY:', process.env.JWT_SECRET_KEY);

// 模拟服务器配置逻辑
const serverJwtSecret = process.env.JWT_SECRET_KEY || process.env.JWT_SECRET || 'sk1llup_pl4tf0rm_jwt_s3cr3t_k3y_2024_v3ry_s3cur3_r4nd0m_str1ng_f0r_pr0duct10n';
console.log('服务器应该使用的JWT密钥:', serverJwtSecret);

// 测试文件使用的密钥
const testJwtSecret = process.env.JWT_SECRET_KEY || 'sk1llup_pl4tf0rm_jwt_s3cr3t_k3y_2024_v3ry_s3cur3_r4nd0m_str1ng_f0r_pr0duct10n';
console.log('测试文件使用的JWT密钥:', testJwtSecret);

console.log('\n密钥是否一致:', serverJwtSecret === testJwtSecret ? '✅ 一致' : '❌ 不一致');

// 比较密钥是否一致
const jwt = require('jsonwebtoken');
const testPayload = { userId: 'test', exp: Math.floor(Date.now() / 1000) + 3600 };

const tokenWithTestSecret = jwt.sign(testPayload, testJwtSecret);
console.log('\n使用测试密钥生成的令牌:', tokenWithTestSecret.substring(0, 50) + '...');

try {
  const decoded = jwt.verify(tokenWithTestSecret, serverJwtSecret);
  console.log('✅ 服务器可以验证测试令牌');
} catch (error) {
  console.log('❌ 服务器无法验证测试令牌:', error.message);
}