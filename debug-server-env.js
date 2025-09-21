// 简化的环境变量测试
require('dotenv').config();

console.log('🔍 环境变量检查:');
console.log('- JWT_SECRET_KEY:', process.env.JWT_SECRET_KEY);
console.log('- JWT_SECRET:', process.env.JWT_SECRET);
console.log('- ENCRYPTION_KEY:', process.env.ENCRYPTION_KEY);

// 模拟 getEnvVar 函数
function getEnvVar(key, defaultValue = '') {
  const value = process.env[key];
  return value !== undefined && value !== '' ? value : defaultValue;
}

// 模拟 envConfig.ts 中的 jwtSecret 配置逻辑
const jwtSecret = getEnvVar('JWT_SECRET_KEY') || getEnvVar('JWT_SECRET', 'your-secret-key');

console.log('\n📋 配置逻辑测试:');
console.log('- 计算出的 jwtSecret:', jwtSecret);
console.log('- jwtSecret 长度:', jwtSecret.length);

// 检查服务器日志中的神秘密钥
const serverLoggedKey = 'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456';
console.log('\n🔍 神秘密钥分析:');
console.log('- 服务器日志密钥:', serverLoggedKey);
console.log('- 长度:', serverLoggedKey.length);

// 检查是否是某种哈希
const crypto = require('crypto');
const possibleSources = [
  process.env.JWT_SECRET_KEY,
  process.env.JWT_SECRET,
  process.env.ENCRYPTION_KEY,
  'your-secret-key',
  'sk1llup_pl4tf0rm_jwt_s3cr3t_k3y_2024_v3ry_s3cur3_r4nd0m_str1ng_f0r_pr0duct10n'
];

console.log('\n🔍 哈希匹配测试:');
possibleSources.forEach((source, index) => {
  if (source) {
    const md5Hash = crypto.createHash('md5').update(source).digest('hex');
    const sha256Hash = crypto.createHash('sha256').update(source).digest('hex');
    
    console.log(`- 源 ${index + 1} (${source.substring(0, 20)}...)`);
    console.log(`  MD5: ${md5Hash}`);
    console.log(`  SHA256: ${sha256Hash}`);
    console.log(`  匹配服务器密钥: ${md5Hash === serverLoggedKey || sha256Hash === serverLoggedKey}`);
  }
});

// 测试 JWT
const jwt = require('jsonwebtoken');
const testPayload = {
  userId: 'test-user-123',
  role: 'admin',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60)
};

console.log('\n🧪 JWT 测试:');
try {
  const token = jwt.sign(testPayload, jwtSecret);
  console.log('- 使用配置密钥生成令牌成功');
  
  // 尝试用服务器密钥验证
  try {
    jwt.verify(token, serverLoggedKey);
    console.log('- 服务器密钥可以验证令牌');
  } catch (error) {
    console.log('- 服务器密钥无法验证令牌:', error.message);
  }
} catch (error) {
  console.log('- 令牌生成失败:', error.message);
}