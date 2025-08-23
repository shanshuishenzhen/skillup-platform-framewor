#!/usr/bin/env node

/**
 * 安全配置生成脚本
 * 生成生产环境所需的强密钥和安全配置
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step, message) {
  log(`[${step}] ${message}`, 'cyan');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

/**
 * 生成强随机密钥
 * @param {number} length 密钥长度
 * @returns {string} 十六进制密钥
 */
function generateSecureKey(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * 生成Base64密钥
 * @param {number} length 密钥长度
 * @returns {string} Base64密钥
 */
function generateBase64Key(length = 32) {
  return crypto.randomBytes(length).toString('base64');
}

/**
 * 生成JWT密钥
 * @returns {string} JWT密钥
 */
function generateJWTSecret() {
  return crypto.randomBytes(64).toString('base64url');
}

/**
 * 生成API密钥
 * @returns {string} API密钥
 */
function generateAPIKey() {
  const prefix = 'sk-';
  const key = crypto.randomBytes(32).toString('hex');
  return prefix + key;
}

/**
 * 生成人脸模板加密密钥
 * @returns {string} 32字符的加密密钥
 */
function generateFaceTemplateKey() {
  return crypto.randomBytes(32).toString('hex').substring(0, 32);
}

/**
 * 生成会话密钥
 * @returns {string} 会话密钥
 */
function generateSessionSecret() {
  return crypto.randomBytes(48).toString('base64');
}

/**
 * 生成数据库加密密钥
 * @returns {string} 数据库加密密钥
 */
function generateDatabaseEncryptionKey() {
  return crypto.randomBytes(32).toString('base64');
}

/**
 * 生成所有安全配置
 */
function generateSecurityConfig() {
  logStep('1', '生成安全密钥...');
  
  const config = {
    // 基础加密密钥
    encryptionKey: generateSecureKey(32),
    
    // JWT 相关密钥
    jwtSecret: generateJWTSecret(),
    jwtRefreshSecret: generateJWTSecret(),
    
    // API 密钥
    apiSecretKey: generateAPIKey(),
    
    // 会话密钥
    sessionSecret: generateSessionSecret(),
    
    // 人脸模板加密密钥
    faceTemplateSecret: generateFaceTemplateKey(),
    
    // 数据库加密密钥
    databaseEncryptionKey: generateDatabaseEncryptionKey(),
    
    // 监控加密密钥
    monitoringEncryptionKey: generateSecureKey(32),
    
    // CSRF 密钥
    csrfSecret: generateSecureKey(32),
    
    // Cookie 签名密钥
    cookieSecret: generateSecureKey(32),
    
    // 文件上传加密密钥
    fileEncryptionKey: generateSecureKey(32),
    
    // 备份加密密钥
    backupEncryptionKey: generateSecureKey(32),
    
    // 生成时间戳
    generatedAt: new Date().toISOString(),
    
    // 环境标识
    environment: process.env.NODE_ENV || 'production'
  };
  
  logSuccess('安全密钥生成完成');
  return config;
}

/**
 * 创建生产环境配置文件
 */
function createProductionEnvFile(config) {
  logStep('2', '创建生产环境配置文件...');
  
  const envContent = `# SkillUp Platform 生产环境安全配置
# 生成时间: ${config.generatedAt}
# 警告: 请妥善保管这些密钥，不要提交到版本控制系统

# ===========================================
# 基础安全配置
# ===========================================

# 主加密密钥 (32字节十六进制)
ENCRYPTION_KEY=${config.encryptionKey}

# API 密钥
API_SECRET_KEY=${config.apiSecretKey}

# 会话密钥
SESSION_SECRET=${config.sessionSecret}

# ===========================================
# JWT 配置
# ===========================================

# JWT 签名密钥
JWT_SECRET=${config.jwtSecret}

# JWT 刷新令牌密钥
JWT_REFRESH_SECRET=${config.jwtRefreshSecret}

# JWT 过期时间
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# ===========================================
# 人脸识别安全配置
# ===========================================

# 人脸模板加密密钥 (32字符)
FACE_TEMPLATE_SECRET=${config.faceTemplateSecret}

# 人脸识别安全阈值
FACE_CONFIDENCE_THRESHOLD=85
FACE_QUALITY_THRESHOLD=80
LIVENESS_THRESHOLD=0.9

# ===========================================
# 数据库安全配置
# ===========================================

# 数据库加密密钥
DATABASE_ENCRYPTION_KEY=${config.databaseEncryptionKey}

# 数据库连接加密
DATABASE_SSL_MODE=require
DATABASE_SSL_REJECT_UNAUTHORIZED=true

# ===========================================
# 监控安全配置
# ===========================================

# 监控数据加密密钥
MONITORING_ENCRYPTION_KEY=${config.monitoringEncryptionKey}

# 数据脱敏配置
DATA_MASKING_ENABLED=true
MASKED_FIELDS=password,token,secret,key,authorization,ssn,credit_card

# ===========================================
# Web 安全配置
# ===========================================

# CSRF 保护密钥
CSRF_SECRET=${config.csrfSecret}

# Cookie 签名密钥
COOKIE_SECRET=${config.cookieSecret}

# 安全头配置
ENABLE_HTTPS_ONLY=true
ENABLE_SECURITY_HEADERS=true
ENABLE_HSTS=true
ENABLE_CSP=true

# CORS 配置
ALLOWED_ORIGINS=https://skillup.com,https://www.skillup.com
CORS_CREDENTIALS=true

# ===========================================
# 文件安全配置
# ===========================================

# 文件加密密钥
FILE_ENCRYPTION_KEY=${config.fileEncryptionKey}

# 文件上传限制
MAX_FILE_SIZE_MB=50
MAX_IMAGE_SIZE_MB=10
ALLOWED_FILE_TYPES=jpg,jpeg,png,pdf,mp4,mp3

# ===========================================
# 备份安全配置
# ===========================================

# 备份加密密钥
BACKUP_ENCRYPTION_KEY=${config.backupEncryptionKey}

# 备份签名验证
BACKUP_SIGNATURE_VERIFICATION=true

# ===========================================
# 限流和防护配置
# ===========================================

# 启用限流
ENABLE_RATE_LIMITING=true

# API 限流配置
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000

# 人脸识别限流
FACE_AUTH_RATE_LIMIT_MAX=20
FACE_AUTH_RATE_LIMIT_WINDOW=3600000

# 登录尝试限制
LOGIN_ATTEMPT_LIMIT=5
LOGIN_LOCKOUT_DURATION=1800000

# ===========================================
# 日志安全配置
# ===========================================

# 日志级别
LOG_LEVEL=warn

# 敏感信息过滤
LOG_FILTER_SENSITIVE=true
LOG_RETENTION_DAYS=90

# ===========================================
# 第三方服务安全配置
# ===========================================

# 百度AI API（生产环境密钥）
BAIDU_API_KEY=your_production_baidu_api_key
BAIDU_SECRET_KEY=your_production_baidu_secret_key

# OpenAI API（生产环境密钥）
OPENAI_API_KEY=your_production_openai_api_key

# 短信服务（生产环境密钥）
SMS_API_KEY=your_production_sms_api_key
SMS_SECRET_KEY=your_production_sms_secret_key

# 支付服务（生产环境密钥）
PAYMENT_API_KEY=your_production_payment_api_key
PAYMENT_SECRET_KEY=your_production_payment_secret_key

# ===========================================
# 环境标识
# ===========================================

NODE_ENV=production
APP_ENV=production
`;

  const envFile = '.env.production';
  
  try {
    fs.writeFileSync(envFile, envContent);
    logSuccess(`生产环境配置文件已创建: ${envFile}`);
    logWarning('请将此文件安全地部署到生产环境，不要提交到版本控制');
  } catch (error) {
    logError(`创建配置文件失败: ${error.message}`);
    return false;
  }
  
  return true;
}

/**
 * 创建安全配置文档
 */
function createSecurityDocumentation(config) {
  logStep('3', '创建安全配置文档...');
  
  const docContent = `# SkillUp Platform 安全配置文档

## 生成信息
- 生成时间: ${config.generatedAt}
- 环境: ${config.environment}
- 密钥数量: ${Object.keys(config).length - 2}

## 密钥用途说明

### 1. 基础加密密钥
- **ENCRYPTION_KEY**: 主加密密钥，用于通用数据加密
- **API_SECRET_KEY**: API 请求签名和验证
- **SESSION_SECRET**: 用户会话加密

### 2. JWT 相关密钥
- **JWT_SECRET**: JWT 令牌签名密钥
- **JWT_REFRESH_SECRET**: 刷新令牌签名密钥

### 3. 业务特定密钥
- **FACE_TEMPLATE_SECRET**: 人脸模板数据加密
- **DATABASE_ENCRYPTION_KEY**: 数据库敏感字段加密
- **MONITORING_ENCRYPTION_KEY**: 监控数据加密

### 4. Web 安全密钥
- **CSRF_SECRET**: CSRF 攻击防护
- **COOKIE_SECRET**: Cookie 签名验证

### 5. 文件和备份密钥
- **FILE_ENCRYPTION_KEY**: 上传文件加密
- **BACKUP_ENCRYPTION_KEY**: 数据备份加密

## 安全最佳实践

### 1. 密钥管理
- 使用密钥管理服务（如 AWS KMS、Azure Key Vault）
- 定期轮换密钥（建议每 90 天）
- 分离开发、测试、生产环境密钥

### 2. 部署安全
- 使用环境变量或密钥管理服务
- 不要在代码中硬编码密钥
- 限制密钥访问权限

### 3. 监控和审计
- 监控密钥使用情况
- 记录密钥访问日志
- 设置异常访问告警

### 4. 备份和恢复
- 安全备份密钥
- 制定密钥丢失恢复计划
- 测试恢复流程

## 合规性考虑

### 数据保护法规
- GDPR（欧盟通用数据保护条例）
- CCPA（加州消费者隐私法）
- 个人信息保护法

### 行业标准
- ISO 27001 信息安全管理
- SOC 2 Type II 合规
- PCI DSS（如涉及支付）

## 应急响应

### 密钥泄露处理
1. 立即禁用泄露的密钥
2. 生成新的密钥
3. 更新所有相关系统
4. 通知相关人员
5. 调查泄露原因

### 联系信息
- 安全团队: security@skillup.com
- 应急热线: +86-xxx-xxxx-xxxx
`;

  const docFile = 'docs/security-config.md';
  
  try {
    // 确保 docs 目录存在
    const docsDir = path.dirname(docFile);
    if (!fs.existsSync(docsDir)) {
      fs.mkdirSync(docsDir, { recursive: true });
    }
    
    fs.writeFileSync(docFile, docContent);
    logSuccess(`安全配置文档已创建: ${docFile}`);
  } catch (error) {
    logError(`创建文档失败: ${error.message}`);
    return false;
  }
  
  return true;
}

/**
 * 生成密钥清单
 */
function generateKeyInventory(config) {
  logStep('4', '生成密钥清单...');
  
  const inventory = {
    metadata: {
      generatedAt: config.generatedAt,
      environment: config.environment,
      totalKeys: Object.keys(config).length - 2
    },
    keys: [
      { name: 'ENCRYPTION_KEY', purpose: '主加密密钥', length: config.encryptionKey.length, type: 'hex' },
      { name: 'JWT_SECRET', purpose: 'JWT签名', length: config.jwtSecret.length, type: 'base64url' },
      { name: 'JWT_REFRESH_SECRET', purpose: 'JWT刷新令牌', length: config.jwtRefreshSecret.length, type: 'base64url' },
      { name: 'API_SECRET_KEY', purpose: 'API签名', length: config.apiSecretKey.length, type: 'string' },
      { name: 'SESSION_SECRET', purpose: '会话加密', length: config.sessionSecret.length, type: 'base64' },
      { name: 'FACE_TEMPLATE_SECRET', purpose: '人脸模板加密', length: config.faceTemplateSecret.length, type: 'hex' },
      { name: 'DATABASE_ENCRYPTION_KEY', purpose: '数据库加密', length: config.databaseEncryptionKey.length, type: 'base64' },
      { name: 'MONITORING_ENCRYPTION_KEY', purpose: '监控数据加密', length: config.monitoringEncryptionKey.length, type: 'hex' },
      { name: 'CSRF_SECRET', purpose: 'CSRF防护', length: config.csrfSecret.length, type: 'hex' },
      { name: 'COOKIE_SECRET', purpose: 'Cookie签名', length: config.cookieSecret.length, type: 'hex' },
      { name: 'FILE_ENCRYPTION_KEY', purpose: '文件加密', length: config.fileEncryptionKey.length, type: 'hex' },
      { name: 'BACKUP_ENCRYPTION_KEY', purpose: '备份加密', length: config.backupEncryptionKey.length, type: 'hex' }
    ]
  };
  
  const inventoryFile = 'security-key-inventory.json';
  
  try {
    fs.writeFileSync(inventoryFile, JSON.stringify(inventory, null, 2));
    logSuccess(`密钥清单已生成: ${inventoryFile}`);
  } catch (error) {
    logError(`生成清单失败: ${error.message}`);
    return false;
  }
  
  return true;
}

/**
 * 主函数
 */
function main() {
  log('🔐 开始生成 SkillUp Platform 安全配置...', 'bright');
  log('');
  
  try {
    // 生成安全配置
    const config = generateSecurityConfig();
    
    // 创建生产环境配置文件
    const envCreated = createProductionEnvFile(config);
    if (!envCreated) {
      process.exit(1);
    }
    
    // 创建安全文档
    const docCreated = createSecurityDocumentation(config);
    if (!docCreated) {
      process.exit(1);
    }
    
    // 生成密钥清单
    const inventoryCreated = generateKeyInventory(config);
    if (!inventoryCreated) {
      process.exit(1);
    }
    
    log('');
    logSuccess('🎉 安全配置生成完成！');
    log('');
    log('生成的文件:', 'bright');
    log('1. .env.production - 生产环境配置文件');
    log('2. docs/security-config.md - 安全配置文档');
    log('3. security-key-inventory.json - 密钥清单');
    log('');
    log('重要提醒:', 'yellow');
    log('• 请妥善保管生产环境配置文件');
    log('• 不要将密钥提交到版本控制系统');
    log('• 建议使用密钥管理服务');
    log('• 定期轮换密钥');
    
  } catch (error) {
    logError(`安全配置生成失败: ${error.message}`);
    process.exit(1);
  }
}

// 运行主函数
if (require.main === module) {
  main();
}

module.exports = {
  generateSecureKey,
  generateSecurityConfig,
  createProductionEnvFile,
  createSecurityDocumentation,
  generateKeyInventory
};
