const fs = require('fs');
const path = require('path');

// 模拟服务器环境变量加载
require('dotenv').config();

// 模拟 getEnvVar 函数
function getEnvVar(key, defaultValue = '') {
  const value = process.env[key];
  return value !== undefined && value !== '' ? value : defaultValue;
}

console.log('🔍 服务器配置调试:');
console.log('- NODE_ENV:', process.env.NODE_ENV);
console.log('- JWT_SECRET_KEY:', process.env.JWT_SECRET_KEY);
console.log('- JWT_SECRET:', process.env.JWT_SECRET);
console.log('- ENCRYPTION_KEY:', process.env.ENCRYPTION_KEY);

// 模拟 envConfig.ts 中的 jwtSecret 配置逻辑
const jwtSecret = getEnvVar('JWT_SECRET_KEY') || getEnvVar('JWT_SECRET', 'your-secret-key');
console.log('\n📋 配置结果:');
console.log('- 计算出的 jwtSecret:', jwtSecret);
console.log('- jwtSecret 长度:', jwtSecret.length);

// 检查是否意外使用了 ENCRYPTION_KEY
const encryptionKey = getEnvVar('ENCRYPTION_KEY');
console.log('- ENCRYPTION_KEY:', encryptionKey);
console.log('- ENCRYPTION_KEY 长度:', encryptionKey.length);

// 比较密钥
if (jwtSecret === encryptionKey) {
  console.log('\n❌ 错误: JWT密钥和加密密钥相同!');
} else {
  console.log('\n✅ JWT密钥和加密密钥不同');
}

// 检查服务器日志中显示的密钥
const serverLoggedKey = 'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456';
console.log('\n🔍 服务器日志中的密钥分析:');
console.log('- 服务器日志密钥:', serverLoggedKey);
console.log('- 是否匹配 JWT_SECRET_KEY:', jwtSecret === serverLoggedKey);
console.log('- 是否匹配 ENCRYPTION_KEY:', encryptionKey === serverLoggedKey);

// 生成测试令牌
const jwt = require('jsonwebtoken');
const testPayload = {
  userId: 'test-user-123',
  role: 'admin',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60)
};

console.log('\n🧪 令牌测试:');
try {
  const token = jwt.sign(testPayload, jwtSecret);
  console.log('- 使用配置密钥生成令牌成功');
  
  // 尝试用服务器日志中的密钥验证
  try {
    jwt.verify(token, serverLoggedKey);
    console.log('- 服务器日志密钥可以验证令牌');
  } catch (error) {
    console.log('- 服务器日志密钥无法验证令牌:', error.message);
  }
} catch (error) {
  console.log('- 令牌生成失败:', error.message);
}