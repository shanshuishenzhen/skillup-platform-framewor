/**
 * 环境配置文件
 * 用于管理应用程序的环境变量和配置
 * 
 * @author SOLO Coding
 * @version 1.0.0
 */

/**
 * 监控配置接口
 */
interface MonitoringConfig {
  enabled: boolean;
  sampleRate: number;
  slowRequestThreshold: number;
  excludePaths: string[];
  includeHeaders: boolean;
  includeBody: boolean;
  maxBodySize: number;
  alertThresholds: {
    errorRate: number;
    responseTime: number;
    requestsPerMinute: number;
  };
  retentionDays: number;
}

/**
 * 环境配置接口
 */
interface EnvConfig {
  nodeEnv: string;
  port: number;
  apiUrl: string;
  monitoring?: MonitoringConfig;
  database: {
    url: string;
    maxConnections: number;
  };
  redis: {
    url: string;
    ttl: number;
  };
  jwt: {
    secret: string;
    expiresIn: string;
  };
  cors: {
    origin: string[];
    credentials: boolean;
  };
}

/**
 * 环境配置对象
 */
export const envConfig: EnvConfig = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  apiUrl: process.env.API_URL || 'http://localhost:3000',
  
  monitoring: {
    enabled: process.env.MONITORING_ENABLED === 'true' || false,
    sampleRate: parseFloat(process.env.MONITORING_SAMPLE_RATE || '1.0'),
    slowRequestThreshold: parseInt(process.env.MONITORING_SLOW_THRESHOLD || '1000', 10),
    excludePaths: (process.env.MONITORING_EXCLUDE_PATHS || '/health,/metrics,/favicon.ico').split(','),
    includeHeaders: process.env.MONITORING_INCLUDE_HEADERS === 'true' || false,
    includeBody: process.env.MONITORING_INCLUDE_BODY === 'true' || false,
    maxBodySize: parseInt(process.env.MONITORING_MAX_BODY_SIZE || '1024', 10),
    alertThresholds: {
      errorRate: parseFloat(process.env.MONITORING_ERROR_RATE_THRESHOLD || '0.05'),
      responseTime: parseInt(process.env.MONITORING_RESPONSE_TIME_THRESHOLD || '2000', 10),
      requestsPerMinute: parseInt(process.env.MONITORING_REQUESTS_PER_MINUTE_THRESHOLD || '1000', 10)
    },
    retentionDays: parseInt(process.env.MONITORING_RETENTION_DAYS || '7', 10)
  },
  
  database: {
    url: process.env.DATABASE_URL || 'postgresql://localhost:5432/skillup',
    maxConnections: parseInt(process.env.DATABASE_MAX_CONNECTIONS || '10', 10)
  },
  
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    ttl: parseInt(process.env.REDIS_TTL || '3600', 10)
  },
  
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  },
  
  cors: {
    origin: (process.env.CORS_ORIGIN || 'http://localhost:3000').split(','),
    credentials: process.env.CORS_CREDENTIALS === 'true' || true
  }
};

/**
 * 验证必需的环境变量
 */
export function validateEnvConfig(): void {
  const requiredVars = [
    'DATABASE_URL',
    'JWT_SECRET'
  ];
  
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.warn('警告: 以下环境变量未设置:', missingVars.join(', '));
    console.warn('应用程序将使用默认值，这可能不适合生产环境。');
  }
}

/**
 * 获取环境特定的配置
 */
export function getEnvSpecificConfig() {
  const isDevelopment = envConfig.nodeEnv === 'development';
  const isProduction = envConfig.nodeEnv === 'production';
  const isTest = envConfig.nodeEnv === 'test';
  
  return {
    isDevelopment,
    isProduction,
    isTest,
    logLevel: isDevelopment ? 'debug' : 'info',
    enableDebugRoutes: isDevelopment,
    enableMetrics: isProduction || isDevelopment
  };
}

// 在模块加载时验证配置
validateEnvConfig();