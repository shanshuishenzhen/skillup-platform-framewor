/**
 * E2E 测试环境配置
 * 设置测试环境变量和全局配置
 */

// 设置测试环境变量
process.env.NODE_ENV = 'test';
process.env.NEXT_PUBLIC_APP_ENV = 'test';

// 数据库配置
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/skillup_test';
process.env.SUPABASE_URL = process.env.TEST_SUPABASE_URL || 'https://test.supabase.co';
process.env.SUPABASE_ANON_KEY = process.env.TEST_SUPABASE_ANON_KEY || 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY || 'test-service-key';

// API 配置
process.env.NEXTAUTH_URL = 'http://localhost:3000';
process.env.NEXTAUTH_SECRET = 'test-secret-key-for-e2e-testing';

// 第三方服务配置（测试环境使用模拟服务）
process.env.BAIDU_AI_API_KEY = 'test-baidu-api-key';
process.env.BAIDU_AI_SECRET_KEY = 'test-baidu-secret-key';

// 短信服务配置
process.env.SMS_API_KEY = 'test-sms-api-key';
process.env.SMS_SECRET_KEY = 'test-sms-secret-key';

// 邮件服务配置
process.env.SMTP_HOST = 'localhost';
process.env.SMTP_PORT = '1025'; // MailHog 测试端口
process.env.SMTP_USER = 'test@example.com';
process.env.SMTP_PASS = 'test-password';

// 文件存储配置
process.env.UPLOAD_DIR = './uploads/test';
process.env.MAX_FILE_SIZE = '10485760'; // 10MB

// 阿里云 OSS 配置（测试环境）
process.env.ALICLOUD_ACCESS_KEY_ID = 'test-access-key';
process.env.ALICLOUD_ACCESS_KEY_SECRET = 'test-secret-key';
process.env.ALICLOUD_OSS_BUCKET = 'test-bucket';
process.env.ALICLOUD_OSS_REGION = 'oss-cn-hangzhou';

// Redis 配置
process.env.REDIS_URL = 'redis://localhost:6379/1'; // 使用数据库 1 进行测试

// 监控配置
process.env.MONITORING_ENABLED = 'false';
process.env.MONITORING_ENDPOINT = 'http://localhost:8080/api/monitoring';
process.env.MONITORING_API_KEY = 'test-monitoring-key';

// 人脸识别配置
process.env.FACE_TEMPLATE_SECRET = 'test-face-template-secret-key-for-e2e';

// 支付配置（测试环境）
process.env.PAYMENT_GATEWAY_URL = 'http://localhost:8081/api/payment';
process.env.PAYMENT_API_KEY = 'test-payment-api-key';
process.env.PAYMENT_SECRET_KEY = 'test-payment-secret';

// 日志配置
process.env.LOG_LEVEL = 'error'; // 测试时减少日志输出

// 应用配置
process.env.APP_VERSION = '1.0.0-test';
process.env.APP_NAME = 'SkillUp Platform Test';

// 安全配置
process.env.JWT_SECRET = 'test-jwt-secret-key-for-e2e-testing';
process.env.ENCRYPTION_KEY = 'test-encryption-key-32-characters';

// 功能开关
process.env.FEATURE_FACE_AUTH = 'true';
process.env.FEATURE_SMS_VERIFICATION = 'true';
process.env.FEATURE_PAYMENT = 'true';
process.env.FEATURE_AI_RECOMMENDATIONS = 'false'; // 测试时关闭 AI 推荐

// 测试特定配置
process.env.TEST_USER_EMAIL = 'test@skillup.com';
process.env.TEST_USER_PASSWORD = 'Test123456!';
process.env.TEST_USER_PHONE = '+8613800138000';

process.env.TEST_ADMIN_EMAIL = 'admin@skillup.com';
process.env.TEST_ADMIN_PASSWORD = 'Admin123456!';

// 超时配置
process.env.API_TIMEOUT = '30000'; // 30 秒
process.env.DATABASE_TIMEOUT = '10000'; // 10 秒

// 并发配置
process.env.MAX_CONCURRENT_REQUESTS = '10';

// 缓存配置
process.env.CACHE_TTL = '300'; // 5 分钟

// 导出配置对象供测试使用
export const testConfig = {
  database: {
    url: process.env.DATABASE_URL,
    timeout: parseInt(process.env.DATABASE_TIMEOUT || '10000')
  },
  api: {
    baseUrl: process.env.NEXTAUTH_URL,
    timeout: parseInt(process.env.API_TIMEOUT || '30000')
  },
  auth: {
    secret: process.env.NEXTAUTH_SECRET,
    jwtSecret: process.env.JWT_SECRET
  },
  testUsers: {
    regular: {
      email: process.env.TEST_USER_EMAIL,
      password: process.env.TEST_USER_PASSWORD,
      phone: process.env.TEST_USER_PHONE
    },
    admin: {
      email: process.env.TEST_ADMIN_EMAIL,
      password: process.env.TEST_ADMIN_PASSWORD
    }
  },
  services: {
    redis: {
      url: process.env.REDIS_URL
    },
    smtp: {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '1025')
    }
  },
  features: {
    faceAuth: process.env.FEATURE_FACE_AUTH === 'true',
    smsVerification: process.env.FEATURE_SMS_VERIFICATION === 'true',
    payment: process.env.FEATURE_PAYMENT === 'true',
    aiRecommendations: process.env.FEATURE_AI_RECOMMENDATIONS === 'true'
  }
};

// 验证必需的环境变量
const requiredEnvVars = [
  'DATABASE_URL',
  'NEXTAUTH_SECRET',
  'JWT_SECRET'
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Required environment variable ${envVar} is not set for E2E tests`);
  }
}

console.log('✅ E2E 测试环境配置已加载');
