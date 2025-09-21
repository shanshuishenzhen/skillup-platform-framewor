/**
 * 调试服务器端JWT配置
 */

require('dotenv').config();
const jwt = require('jsonwebtoken');

console.log('=== 服务器端JWT配置调试 ===');

// 模拟服务器端的getEnvVar逻辑
function getEnvVar(key, defaultValue) {
  const value = process.env[key];
  if (value === undefined || value === '') {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new Error(`环境变量 ${key} 未设置`);
  }
  return value;
}

// 模拟服务器配置
const serverConfig = {
  security: {
    jwtSecret: getEnvVar('JWT_SECRET_KEY') || getEnvVar('JWT_SECRET', 'your-secret-key')
  }
};

console.log('服务器配置的JWT密钥:', serverConfig.security.jwtSecret);

// 创建测试令牌
const testPayload = {
  userId: '550e8400-e29b-41d4-a716-446655440000',
  phone: '13800138000',
  role: 'USER',
  exp: Math.floor(Date.now() / 1000) + 3600
};

const testToken = jwt.sign(testPayload, serverConfig.security.jwtSecret);
console.log('\n生成的测试令牌:', testToken.substring(0, 50) + '...');

// 验证令牌
try {
  const decoded = jwt.verify(testToken, serverConfig.security.jwtSecret);
  console.log('✅ 令牌验证成功');
  console.log('解码后的payload:', { userId: decoded.userId, role: decoded.role });
} catch (error) {
  console.log('❌ 令牌验证失败:', error.message);
}

// 测试与测试文件生成的令牌的兼容性
const testFileSecret = process.env.JWT_SECRET_KEY || 'sk1llup_pl4tf0rm_jwt_s3cr3t_k3y_2024_v3ry_s3cur3_r4nd0m_str1ng_f0r_pr0duct10n';
const testFileToken = jwt.sign(testPayload, testFileSecret);

console.log('\n测试文件生成的令牌:', testFileToken.substring(0, 50) + '...');

try {
  const decoded = jwt.verify(testFileToken, serverConfig.security.jwtSecret);
  console.log('✅ 服务器可以验证测试文件的令牌');
} catch (error) {
  console.log('❌ 服务器无法验证测试文件的令牌:', error.message);
}

console.log('\n密钥比较:');
console.log('服务器密钥:', serverConfig.security.jwtSecret);
console.log('测试文件密钥:', testFileSecret);
console.log('是否相同:', serverConfig.security.jwtSecret === testFileSecret);