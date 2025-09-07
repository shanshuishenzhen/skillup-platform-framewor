/**
 * 测试环境设置文件
 * 
 * 配置测试运行时的环境变量和全局设置，包括：
 * 1. 环境变量设置
 * 2. 全局模拟配置
 * 3. 测试数据库配置
 * 4. API端点配置
 * 
 * @author SOLO Coding
 * @version 1.0.0
 */

// 设置Node环境为测试模式
process.env.NODE_ENV = 'test';

// 设置测试环境变量
process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-role-key';

// Redis配置（测试环境）
process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379/1';

// Stripe配置（测试环境）
process.env.STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_test_test_key';
process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_test_key';

// 短信服务配置（测试环境）
process.env.SMS_API_KEY = process.env.SMS_API_KEY || 'test-sms-key';
process.env.SMS_API_SECRET = process.env.SMS_API_SECRET || 'test-sms-secret';

// 邮件服务配置（测试环境）
process.env.EMAIL_API_KEY = process.env.EMAIL_API_KEY || 'test-email-key';
process.env.EMAIL_FROM = process.env.EMAIL_FROM || 'test@example.com';

// 文件上传配置（测试环境）
process.env.UPLOAD_MAX_SIZE = process.env.UPLOAD_MAX_SIZE || '10485760'; // 10MB
process.env.UPLOAD_ALLOWED_TYPES = process.env.UPLOAD_ALLOWED_TYPES || 'image/jpeg,image/png,application/pdf';

// JWT配置（测试环境）
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing-only';
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// 应用配置
process.env.NEXT_PUBLIC_APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
process.env.NEXT_PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

// 测试数据库配置
process.env.TEST_DB_SCHEMA = 'test_schema';
process.env.TEST_DB_PREFIX = 'test_';

// 测试超时配置
process.env.TEST_TIMEOUT = '30000';
process.env.E2E_TIMEOUT = '120000';
process.env.INTEGRATION_TIMEOUT = '60000';

// 测试并发配置
process.env.JEST_WORKERS = '50%';
process.env.TEST_PARALLEL = 'true';

// 日志配置（测试环境通常关闭详细日志）
process.env.LOG_LEVEL = process.env.LOG_LEVEL || 'error';
process.env.DISABLE_LOGGING = 'true';

// 缓存配置（测试环境）
process.env.CACHE_TTL = '300'; // 5分钟
process.env.CACHE_MAX_SIZE = '100';

// 安全配置（测试环境）
process.env.BCRYPT_ROUNDS = '4'; // 降低加密轮数以提高测试速度
process.env.RATE_LIMIT_WINDOW = '60000'; // 1分钟
process.env.RATE_LIMIT_MAX = '1000'; // 测试环境放宽限制

// 文件系统配置
process.env.TEMP_DIR = process.env.TEMP_DIR || './tmp/test';
process.env.UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads/test';

// 外部服务配置（测试环境使用模拟）
process.env.USE_MOCK_SERVICES = 'true';
process.env.MOCK_SMS_SERVICE = 'true';
process.env.MOCK_EMAIL_SERVICE = 'true';
process.env.MOCK_PAYMENT_SERVICE = 'true';

// 测试数据配置
process.env.TEST_USER_EMAIL = 'test@example.com';
process.env.TEST_USER_PASSWORD = 'Test123456!';
process.env.TEST_ADMIN_EMAIL = 'admin@example.com';
process.env.TEST_ADMIN_PASSWORD = 'Admin123456!';

// 性能测试配置
process.env.PERFORMANCE_TEST_ITERATIONS = '100';
process.env.PERFORMANCE_TEST_CONCURRENT = '10';

// 错误处理配置
process.env.SUPPRESS_TEST_ERRORS = 'false';
process.env.DETAILED_ERROR_LOGGING = 'true';

// 浏览器测试配置（E2E）
process.env.HEADLESS_BROWSER = 'true';
process.env.BROWSER_TIMEOUT = '30000';
process.env.BROWSER_SLOW_MO = '0';

// 网络配置
process.env.NETWORK_TIMEOUT = '10000';
process.env.RETRY_ATTEMPTS = '3';
process.env.RETRY_DELAY = '1000';

// 调试配置
process.env.DEBUG_TESTS = process.env.DEBUG_TESTS || 'false';
process.env.VERBOSE_LOGGING = process.env.VERBOSE_LOGGING || 'false';

// 清理配置
process.env.AUTO_CLEANUP = 'true';
process.env.CLEANUP_TIMEOUT = '5000';

// 模拟服务端口配置
process.env.MOCK_SERVER_PORT = '3001';
process.env.MOCK_API_PORT = '3002';
process.env.MOCK_WEBSOCKET_PORT = '3003';

// 数据库连接池配置（测试环境）
process.env.DB_POOL_MIN = '1';
process.env.DB_POOL_MAX = '5';
process.env.DB_POOL_IDLE_TIMEOUT = '10000';

// 会话配置（测试环境）
process.env.SESSION_SECRET = 'test-session-secret-key';
process.env.SESSION_TIMEOUT = '3600000'; // 1小时

// CORS配置（测试环境）
process.env.CORS_ORIGIN = 'http://localhost:3000,http://localhost:3001';
process.env.CORS_CREDENTIALS = 'true';

// 文件处理配置
process.env.IMAGE_QUALITY = '80';
process.env.IMAGE_MAX_WIDTH = '1920';
process.env.IMAGE_MAX_HEIGHT = '1080';

// 通知配置（测试环境关闭）
process.env.DISABLE_NOTIFICATIONS = 'true';
process.env.DISABLE_EMAIL_NOTIFICATIONS = 'true';
process.env.DISABLE_SMS_NOTIFICATIONS = 'true';

// 监控配置（测试环境关闭）
process.env.DISABLE_ANALYTICS = 'true';
process.env.DISABLE_TRACKING = 'true';
process.env.DISABLE_METRICS = 'true';

// 第三方服务配置（测试环境使用模拟）
process.env.GOOGLE_MAPS_API_KEY = 'test-google-maps-key';
process.env.FACEBOOK_APP_ID = 'test-facebook-app-id';
process.env.TWITTER_API_KEY = 'test-twitter-api-key';

// 加密配置
process.env.ENCRYPTION_KEY = 'test-encryption-key-32-characters';
process.env.ENCRYPTION_ALGORITHM = 'aes-256-gcm';

// 备份配置（测试环境关闭）
process.env.DISABLE_BACKUPS = 'true';
process.env.BACKUP_RETENTION_DAYS = '1';

// API版本配置
process.env.API_VERSION = 'v1';
process.env.API_PREFIX = '/api/v1';

// 功能开关（测试环境）
process.env.FEATURE_USER_REGISTRATION = 'true';
process.env.FEATURE_EMAIL_VERIFICATION = 'false'; // 测试环境跳过邮件验证
process.env.FEATURE_SMS_VERIFICATION = 'false'; // 测试环境跳过短信验证
process.env.FEATURE_TWO_FACTOR_AUTH = 'false';
process.env.FEATURE_SOCIAL_LOGIN = 'false';
process.env.FEATURE_PAYMENT_PROCESSING = 'true';
process.env.FEATURE_FILE_UPLOAD = 'true';
process.env.FEATURE_REAL_TIME_UPDATES = 'false';

// 测试特定配置
process.env.SKIP_AUTH_IN_TESTS = 'false';
process.env.USE_REAL_DATABASE = 'false';
process.env.USE_REAL_REDIS = 'false';
process.env.USE_REAL_EXTERNAL_APIS = 'false';

// 性能优化配置（测试环境）
process.env.ENABLE_COMPRESSION = 'false';
process.env.ENABLE_CACHING = 'false';
process.env.ENABLE_MINIFICATION = 'false';

// 安全配置（测试环境放宽）
process.env.CSRF_PROTECTION = 'false';
process.env.XSS_PROTECTION = 'false';
process.env.CONTENT_SECURITY_POLICY = 'false';

// 输出配置信息（仅在调试模式下）
if (process.env.DEBUG_TESTS === 'true') {
  console.log('🔧 测试环境配置已加载');
  console.log('📊 关键配置:');
  console.log(`   NODE_ENV: ${process.env.NODE_ENV}`);
  console.log(`   SUPABASE_URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`);
  console.log(`   API_URL: ${process.env.NEXT_PUBLIC_API_URL}`);
  console.log(`   USE_MOCK_SERVICES: ${process.env.USE_MOCK_SERVICES}`);
  console.log(`   TEST_TIMEOUT: ${process.env.TEST_TIMEOUT}`);
  console.log(`   JEST_WORKERS: ${process.env.JEST_WORKERS}`);
}

// 导出配置对象供其他测试文件使用
module.exports = {
  // 数据库配置
  database: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    schema: process.env.TEST_DB_SCHEMA,
    prefix: process.env.TEST_DB_PREFIX
  },
  
  // Redis配置
  redis: {
    url: process.env.REDIS_URL
  },
  
  // API配置
  api: {
    baseUrl: process.env.NEXT_PUBLIC_API_URL,
    timeout: parseInt(process.env.NETWORK_TIMEOUT),
    retryAttempts: parseInt(process.env.RETRY_ATTEMPTS),
    retryDelay: parseInt(process.env.RETRY_DELAY)
  },
  
  // 测试用户
  testUsers: {
    regular: {
      email: process.env.TEST_USER_EMAIL,
      password: process.env.TEST_USER_PASSWORD
    },
    admin: {
      email: process.env.TEST_ADMIN_EMAIL,
      password: process.env.TEST_ADMIN_PASSWORD
    }
  },
  
  // 超时配置
  timeouts: {
    default: parseInt(process.env.TEST_TIMEOUT),
    integration: parseInt(process.env.INTEGRATION_TIMEOUT),
    e2e: parseInt(process.env.E2E_TIMEOUT),
    browser: parseInt(process.env.BROWSER_TIMEOUT)
  },
  
  // 功能开关
  features: {
    userRegistration: process.env.FEATURE_USER_REGISTRATION === 'true',
    emailVerification: process.env.FEATURE_EMAIL_VERIFICATION === 'true',
    smsVerification: process.env.FEATURE_SMS_VERIFICATION === 'true',
    twoFactorAuth: process.env.FEATURE_TWO_FACTOR_AUTH === 'true',
    socialLogin: process.env.FEATURE_SOCIAL_LOGIN === 'true',
    paymentProcessing: process.env.FEATURE_PAYMENT_PROCESSING === 'true',
    fileUpload: process.env.FEATURE_FILE_UPLOAD === 'true',
    realTimeUpdates: process.env.FEATURE_REAL_TIME_UPDATES === 'true'
  },
  
  // 模拟服务配置
  mocks: {
    enabled: process.env.USE_MOCK_SERVICES === 'true',
    sms: process.env.MOCK_SMS_SERVICE === 'true',
    email: process.env.MOCK_EMAIL_SERVICE === 'true',
    payment: process.env.MOCK_PAYMENT_SERVICE === 'true'
  },
  
  // 调试配置
  debug: {
    enabled: process.env.DEBUG_TESTS === 'true',
    verbose: process.env.VERBOSE_LOGGING === 'true',
    suppressErrors: process.env.SUPPRESS_TEST_ERRORS === 'true',
    detailedErrorLogging: process.env.DETAILED_ERROR_LOGGING === 'true'
  },
  
  // 清理配置
  cleanup: {
    auto: process.env.AUTO_CLEANUP === 'true',
    timeout: parseInt(process.env.CLEANUP_TIMEOUT)
  }
};