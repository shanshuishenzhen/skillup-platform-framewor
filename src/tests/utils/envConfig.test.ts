/**
 * 环境配置工具单元测试
 * 
 * 测试环境配置工具，包括：
 * - 配置加载和验证
 * - 环境变量处理
 * - 配置热重载
 * - 配置缓存机制
 * - 配置安全性检查
 * - 配置默认值处理
 * - 配置类型转换
 * - 配置文件监控
 */

import { 
  EnvConfig,
  loadConfig,
  validateConfig,
  getConfig,
  setConfig,
  reloadConfig,
  watchConfig,
  unwatchConfig,
  getConfigValue,
  setConfigValue,
  validateConfigSchema,
  sanitizeConfig,
  encryptSensitiveConfig,
  decryptSensitiveConfig
} from '../../config/envConfig';
import { logger } from '../../utils/logger';
import { cacheService } from '../../services/cacheService';
import { auditService } from '../../services/auditService';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Mock 依赖
jest.mock('../../utils/logger');
jest.mock('../../services/cacheService');
jest.mock('../../services/auditService');
jest.mock('fs');
jest.mock('path');
jest.mock('crypto');

// 类型定义
interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl: boolean;
  poolSize: number;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
}

interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  database: number;
  keyPrefix: string;
  ttl: number;
  maxRetries: number;
  retryDelay: number;
}

interface AuthConfig {
  jwtSecret: string;
  jwtExpiration: string;
  refreshTokenExpiration: string;
  bcryptRounds: number;
  sessionTimeout: number;
  maxLoginAttempts: number;
  lockoutDuration: number;
  passwordMinLength: number;
  passwordRequireSpecialChars: boolean;
}

interface EmailConfig {
  provider: 'smtp' | 'sendgrid' | 'ses';
  host?: string;
  port?: number;
  secure?: boolean;
  username?: string;
  password?: string;
  apiKey?: string;
  fromEmail: string;
  fromName: string;
  replyTo?: string;
  templates: {
    welcome: string;
    resetPassword: string;
    verification: string;
  };
}

interface StorageConfig {
  provider: 'local' | 's3' | 'oss';
  basePath?: string;
  bucket?: string;
  region?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  endpoint?: string;
  maxFileSize: number;
  allowedTypes: string[];
  uploadTimeout: number;
}

interface MonitoringConfig {
  enabled: boolean;
  metricsInterval: number;
  healthCheckInterval: number;
  errorThreshold: number;
  responseTimeThreshold: number;
  memoryThreshold: number;
  cpuThreshold: number;
  diskThreshold: number;
  alertWebhook?: string;
  alertEmail?: string;
}

interface SecurityConfig {
  corsOrigins: string[];
  rateLimitWindow: number;
  rateLimitMax: number;
  helmetEnabled: boolean;
  csrfEnabled: boolean;
  sessionSecret: string;
  encryptionKey: string;
  hashSalt: string;
  ipWhitelist: string[];
  ipBlacklist: string[];
}

interface AppConfig {
  name: string;
  version: string;
  env: 'development' | 'test' | 'staging' | 'production';
  port: number;
  host: string;
  baseUrl: string;
  debug: boolean;
  logLevel: 'error' | 'warn' | 'info' | 'debug';
  timezone: string;
  locale: string;
  maintenance: boolean;
}

interface TestEnvConfig extends EnvConfig {
  app: AppConfig;
  database: DatabaseConfig;
  redis: RedisConfig;
  auth: AuthConfig;
  email: EmailConfig;
  storage: StorageConfig;
  monitoring: MonitoringConfig;
  security: SecurityConfig;
}

// Mock 实例
const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  child: jest.fn().mockReturnThis()
};

const mockCacheService = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  exists: jest.fn(),
  expire: jest.fn(),
  keys: jest.fn()
};

const mockAuditService = {
  log: jest.fn(),
  logConfigChange: jest.fn(),
  logSecurityEvent: jest.fn()
};

const mockFs = {
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  existsSync: jest.fn(),
  watchFile: jest.fn(),
  unwatchFile: jest.fn(),
  statSync: jest.fn()
};

const mockPath = {
  join: jest.fn(),
  resolve: jest.fn(),
  dirname: jest.fn(),
  basename: jest.fn(),
  extname: jest.fn()
};

const mockCrypto = {
  createCipher: jest.fn(),
  createDecipher: jest.fn(),
  randomBytes: jest.fn(),
  createHash: jest.fn(),
  createHmac: jest.fn()
};

// 设置 Mock
(logger as unknown) = mockLogger;
(cacheService as unknown) = mockCacheService;
(auditService as unknown) = mockAuditService;
(fs as unknown) = mockFs;
(path as unknown) = mockPath;
(crypto as unknown) = mockCrypto;

// 测试数据
const validConfig: TestEnvConfig = {
  app: {
    name: 'SkillUp Platform',
    version: '1.0.0',
    env: 'test',
    port: 3000,
    host: 'localhost',
    baseUrl: 'http://localhost:3000',
    debug: true,
    logLevel: 'debug',
    timezone: 'Asia/Shanghai',
    locale: 'zh-CN',
    maintenance: false
  },
  database: {
    host: 'localhost',
    port: 5432,
    database: 'skillup_test',
    username: 'test_user',
    password: 'test_password',
    ssl: false,
    poolSize: 10,
    timeout: 30000,
    retryAttempts: 3,
    retryDelay: 1000
  },
  redis: {
    host: 'localhost',
    port: 6379,
    password: 'redis_password',
    database: 0,
    keyPrefix: 'skillup:test:',
    ttl: 3600,
    maxRetries: 3,
    retryDelay: 1000
  },
  auth: {
    jwtSecret: 'test_jwt_secret_key_very_long_and_secure',
    jwtExpiration: '1h',
    refreshTokenExpiration: '7d',
    bcryptRounds: 10,
    sessionTimeout: 1800,
    maxLoginAttempts: 5,
    lockoutDuration: 900,
    passwordMinLength: 8,
    passwordRequireSpecialChars: true
  },
  email: {
    provider: 'smtp',
    host: 'smtp.test.com',
    port: 587,
    secure: false,
    username: 'test@example.com',
    password: 'email_password',
    fromEmail: 'noreply@skillup.com',
    fromName: 'SkillUp Platform',
    replyTo: 'support@skillup.com',
    templates: {
      welcome: 'welcome.hbs',
      resetPassword: 'reset-password.hbs',
      verification: 'verification.hbs'
    }
  },
  storage: {
    provider: 'local',
    basePath: '/uploads',
    maxFileSize: 10485760, // 10MB
    allowedTypes: ['image/jpeg', 'image/png', 'application/pdf'],
    uploadTimeout: 30000
  },
  monitoring: {
    enabled: true,
    metricsInterval: 60000,
    healthCheckInterval: 30000,
    errorThreshold: 0.05,
    responseTimeThreshold: 1000,
    memoryThreshold: 0.8,
    cpuThreshold: 0.8,
    diskThreshold: 0.9,
    alertWebhook: 'https://hooks.slack.com/test',
    alertEmail: 'alerts@skillup.com'
  },
  security: {
    corsOrigins: ['http://localhost:3000', 'https://skillup.com'],
    rateLimitWindow: 900000, // 15分钟
    rateLimitMax: 100,
    helmetEnabled: true,
    csrfEnabled: true,
    sessionSecret: 'session_secret_key_very_long_and_secure',
    encryptionKey: 'encryption_key_32_characters_long',
    hashSalt: 'hash_salt_16_chars',
    ipWhitelist: ['127.0.0.1', '::1'],
    ipBlacklist: []
  }
};

const invalidConfig = {
  app: {
    name: '', // 无效：空字符串
    port: 'invalid', // 无效：非数字
    env: 'invalid_env' // 无效：不在枚举中
  },
  database: {
    host: '', // 无效：空字符串
    port: -1, // 无效：负数
    password: '123' // 无效：太短
  },
  auth: {
    jwtSecret: 'short', // 无效：太短
    bcryptRounds: 'invalid' // 无效：非数字
  }
};

describe('Environment Configuration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // 设置默认的mock返回值
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue(JSON.stringify(validConfig));
    mockPath.join.mockImplementation((...args) => args.join('/'));
    mockPath.resolve.mockImplementation((...args) => args.join('/'));
    mockCacheService.get.mockResolvedValue(null);
    mockCacheService.set.mockResolvedValue(true);
    mockAuditService.logConfigChange.mockResolvedValue(true);
    
    // 清理环境变量
    delete process.env.NODE_ENV;
    delete process.env.PORT;
    delete process.env.DATABASE_URL;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  /**
   * 配置加载测试
   */
  describe('Configuration Loading', () => {
    it('应该成功加载有效配置', async () => {
      const config = await loadConfig();
      
      expect(config).toBeDefined();
      expect(config.app.name).toBe('SkillUp Platform');
      expect(config.app.env).toBe('test');
      expect(config.database.host).toBe('localhost');
      
      expect(mockFs.readFileSync).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Configuration loaded successfully',
        expect.objectContaining({
          env: 'test',
          configFile: expect.any(String)
        })
      );
    });

    it('应该从环境变量覆盖配置', async () => {
      process.env.NODE_ENV = 'production';
      process.env.PORT = '8080';
      process.env.DATABASE_HOST = 'prod-db.example.com';
      process.env.DATABASE_PASSWORD = 'prod_password';
      
      const config = await loadConfig();
      
      expect(config.app.env).toBe('production');
      expect(config.app.port).toBe(8080);
      expect(config.database.host).toBe('prod-db.example.com');
      expect(config.database.password).toBe('prod_password');
    });

    it('应该处理配置文件不存在', async () => {
      mockFs.existsSync.mockReturnValue(false);
      
      const config = await loadConfig();
      
      expect(config).toBeDefined();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Configuration file not found, using defaults'
      );
    });

    it('应该处理无效的JSON配置文件', async () => {
      mockFs.readFileSync.mockReturnValue('invalid json');
      
      await expect(loadConfig()).rejects.toThrow('Invalid configuration file');
      
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to parse configuration file',
        expect.objectContaining({})
      );
    });

    it('应该加载不同环境的配置文件', async () => {
      process.env.NODE_ENV = 'production';
      
      await loadConfig();
      
      expect(mockFs.readFileSync).toHaveBeenCalledWith(
        expect.stringContaining('config.production.json'),
        'utf8'
      );
    });
  });

  /**
   * 配置验证测试
   */
  describe('Configuration Validation', () => {
    it('应该验证有效配置', () => {
      const result = validateConfig(validConfig);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('应该检测无效配置', () => {
      const result = validateConfig(invalidConfig as unknown);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'app.name',
            message: expect.stringContaining('required')
          }),
          expect.objectContaining({
            field: 'app.port',
            message: expect.stringContaining('number')
          }),
          expect.objectContaining({
            field: 'app.env',
            message: expect.stringContaining('enum')
          })
        ])
      );
    });

    it('应该验证必需字段', () => {
      const incompleteConfig = {
        app: {
          name: 'Test App'
          // 缺少其他必需字段
        }
      };
      
      const result = validateConfig(incompleteConfig as unknown);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'app.env',
            message: expect.stringContaining('required')
          }),
          expect.objectContaining({
            field: 'app.port',
            message: expect.stringContaining('required')
          })
        ])
      );
    });

    it('应该验证数据类型', () => {
      const wrongTypeConfig = {
        ...validConfig,
        app: {
          ...validConfig.app,
          port: '3000', // 应该是数字
          debug: 'true' // 应该是布尔值
        },
        database: {
          ...validConfig.database,
          ssl: 'false' // 应该是布尔值
        }
      };
      
      const result = validateConfig(wrongTypeConfig as unknown);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'app.port',
            message: expect.stringContaining('number')
          }),
          expect.objectContaining({
            field: 'app.debug',
            message: expect.stringContaining('boolean')
          })
        ])
      );
    });

    it('应该验证字符串长度', () => {
      const shortStringConfig = {
        ...validConfig,
        auth: {
          ...validConfig.auth,
          jwtSecret: 'short', // 太短
          sessionSecret: 'also_short' // 太短
        }
      };
      
      const result = validateConfig(shortStringConfig);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'auth.jwtSecret',
            message: expect.stringContaining('minimum length')
          })
        ])
      );
    });

    it('应该验证数值范围', () => {
      const outOfRangeConfig = {
        ...validConfig,
        app: {
          ...validConfig.app,
          port: -1 // 无效端口
        },
        database: {
          ...validConfig.database,
          port: 70000, // 端口超出范围
          poolSize: -5 // 负数
        }
      };
      
      const result = validateConfig(outOfRangeConfig);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'app.port',
            message: expect.stringContaining('range')
          }),
          expect.objectContaining({
            field: 'database.port',
            message: expect.stringContaining('range')
          })
        ])
      );
    });
  });

  /**
   * 配置缓存测试
   */
  describe('Configuration Caching', () => {
    it('应该缓存加载的配置', async () => {
      await loadConfig();
      
      expect(mockCacheService.set).toHaveBeenCalledWith(
        'config:current',
        expect.objectContaining({}),
        expect.any(Number)
      );
    });

    it('应该从缓存获取配置', async () => {
      mockCacheService.get.mockResolvedValue(validConfig);
      
      const config = await getConfig();
      
      expect(config).toEqual(validConfig);
      expect(mockCacheService.get).toHaveBeenCalledWith('config:current');
      expect(mockFs.readFileSync).not.toHaveBeenCalled();
    });

    it('应该在缓存失效时重新加载', async () => {
      mockCacheService.get.mockResolvedValue(null);
      
      const config = await getConfig();
      
      expect(config).toBeDefined();
      expect(mockFs.readFileSync).toHaveBeenCalled();
      expect(mockCacheService.set).toHaveBeenCalled();
    });

    it('应该清除缓存', async () => {
      await reloadConfig();
      
      expect(mockCacheService.del).toHaveBeenCalledWith('config:current');
      expect(mockFs.readFileSync).toHaveBeenCalled();
    });
  });

  /**
   * 配置热重载测试
   */
  describe('Configuration Hot Reload', () => {
    it('应该监控配置文件变化', () => {
      const callback = jest.fn();
      
      watchConfig(callback);
      
      expect(mockFs.watchFile).toHaveBeenCalledWith(
        expect.stringContaining('.json'),
        expect.any(Function)
      );
    });

    it('应该在文件变化时重新加载配置', async () => {
      const callback = jest.fn();
      let fileWatcher: Function;
      
      mockFs.watchFile.mockImplementation((file, watcher) => {
        fileWatcher = watcher;
      });
      
      watchConfig(callback);
      
      // 模拟文件变化
      const newConfig = { ...validConfig, app: { ...validConfig.app, name: 'Updated App' } };
      mockFs.readFileSync.mockReturnValue(JSON.stringify(newConfig));
      
      await fileWatcher!();
      
      expect(callback).toHaveBeenCalledWith(newConfig);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Configuration reloaded due to file change'
      );
    });

    it('应该停止监控配置文件', () => {
      unwatchConfig();
      
      expect(mockFs.unwatchFile).toHaveBeenCalled();
    });

    it('应该处理重载时的错误', async () => {
      const callback = jest.fn();
      let fileWatcher: Function;
      
      mockFs.watchFile.mockImplementation((file, watcher) => {
        fileWatcher = watcher;
      });
      
      watchConfig(callback);
      
      // 模拟文件读取错误
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error('File read error');
      });
      
      await fileWatcher!();
      
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to reload configuration',
        expect.objectContaining({})
      );
      expect(callback).not.toHaveBeenCalled();
    });
  });

  /**
   * 配置值操作测试
   */
  describe('Configuration Value Operations', () => {
    beforeEach(async () => {
      await setConfig(validConfig);
    });

    it('应该获取配置值', () => {
      const appName = getConfigValue('app.name');
      const dbPort = getConfigValue('database.port');
      const nonExistent = getConfigValue('non.existent.key');
      
      expect(appName).toBe('SkillUp Platform');
      expect(dbPort).toBe(5432);
      expect(nonExistent).toBeUndefined();
    });

    it('应该设置配置值', async () => {
      await setConfigValue('app.name', 'New App Name');
      await setConfigValue('database.port', 5433);
      
      const appName = getConfigValue('app.name');
      const dbPort = getConfigValue('database.port');
      
      expect(appName).toBe('New App Name');
      expect(dbPort).toBe(5433);
      
      expect(mockAuditService.logConfigChange).toHaveBeenCalledWith(
        expect.objectContaining({
          key: 'app.name',
          oldValue: 'SkillUp Platform',
          newValue: 'New App Name'
        })
      );
    });

    it('应该处理嵌套路径', () => {
      const emailTemplates = getConfigValue('email.templates');
      const welcomeTemplate = getConfigValue('email.templates.welcome');
      
      expect(emailTemplates).toEqual(validConfig.email.templates);
      expect(welcomeTemplate).toBe('welcome.hbs');
    });

    it('应该提供默认值', () => {
      const nonExistent = getConfigValue('non.existent.key', 'default_value');
      const existingValue = getConfigValue('app.name', 'default_name');
      
      expect(nonExistent).toBe('default_value');
      expect(existingValue).toBe('SkillUp Platform');
    });
  });

  /**
   * 配置安全性测试
   */
  describe('Configuration Security', () => {
    it('应该清理敏感配置信息', () => {
      const sanitized = sanitizeConfig(validConfig);
      
      expect(sanitized.database.password).toBe('[REDACTED]');
      expect(sanitized.redis.password).toBe('[REDACTED]');
      expect(sanitized.auth.jwtSecret).toBe('[REDACTED]');
      expect(sanitized.email.password).toBe('[REDACTED]');
      expect(sanitized.security.sessionSecret).toBe('[REDACTED]');
      expect(sanitized.security.encryptionKey).toBe('[REDACTED]');
      
      // 非敏感信息应该保持不变
      expect(sanitized.app.name).toBe(validConfig.app.name);
      expect(sanitized.database.host).toBe(validConfig.database.host);
    });

    it('应该加密敏感配置', () => {
      const cipher = {
        update: jest.fn().mockReturnValue('encrypted_'),
        final: jest.fn().mockReturnValue('data')
      };
      mockCrypto.createCipher.mockReturnValue(cipher);
      
      const encrypted = encryptSensitiveConfig(validConfig);
      
      expect(mockCrypto.createCipher).toHaveBeenCalledWith(
        'aes-256-cbc',
        expect.stringContaining('config')
      );
      expect(encrypted.database.password).toBe('encrypted_data');
      expect(encrypted.auth.jwtSecret).toBe('encrypted_data');
    });

    it('应该解密敏感配置', () => {
      const decipher = {
        update: jest.fn().mockReturnValue('decrypted_'),
        final: jest.fn().mockReturnValue('data')
      };
      mockCrypto.createDecipher.mockReturnValue(decipher);
      
      const encryptedConfig = {
        ...validConfig,
        database: {
          ...validConfig.database,
          password: 'encrypted_password'
        }
      };
      
      const decrypted = decryptSensitiveConfig(encryptedConfig);
      
      expect(mockCrypto.createDecipher).toHaveBeenCalledWith(
        'aes-256-cbc',
        expect.stringContaining('config')
      );
      expect(decrypted.database.password).toBe('decrypted_data');
    });

    it('应该验证配置完整性', () => {
      const hash = 'config_hash_value';
      mockCrypto.createHash.mockReturnValue({
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue(hash)
      });
      
      const result = validateConfigSchema(validConfig, hash);
      
      expect(result.isValid).toBe(true);
      expect(mockCrypto.createHash).toHaveBeenCalledWith('sha256');
    });
  });

  /**
   * 类型转换测试
   */
  describe('Type Conversion', () => {
    it('应该转换环境变量类型', async () => {
      process.env.PORT = '8080';
      process.env.DEBUG = 'true';
      process.env.DATABASE_SSL = 'false';
      process.env.BCRYPT_ROUNDS = '12';
      process.env.CORS_ORIGINS = 'http://localhost:3000,https://example.com';
      
      const config = await loadConfig();
      
      expect(typeof config.app.port).toBe('number');
      expect(config.app.port).toBe(8080);
      expect(typeof config.app.debug).toBe('boolean');
      expect(config.app.debug).toBe(true);
      expect(typeof config.database.ssl).toBe('boolean');
      expect(config.database.ssl).toBe(false);
      expect(typeof config.auth.bcryptRounds).toBe('number');
      expect(config.auth.bcryptRounds).toBe(12);
      expect(Array.isArray(config.security.corsOrigins)).toBe(true);
      expect(config.security.corsOrigins).toEqual([
        'http://localhost:3000',
        'https://example.com'
      ]);
    });

    it('应该处理无效的类型转换', async () => {
      process.env.PORT = 'invalid_port';
      process.env.DEBUG = 'invalid_boolean';
      
      await expect(loadConfig()).rejects.toThrow('Invalid configuration');
    });
  });

  /**
   * 性能测试
   */
  describe('Performance Tests', () => {
    it('应该快速加载配置', async () => {
      const startTime = Date.now();
      
      await loadConfig();
      
      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(100); // 100ms内完成
    });

    it('应该高效处理大量配置访问', () => {
      const iterations = 10000;
      const startTime = Date.now();
      
      for (let i = 0; i < iterations; i++) {
        getConfigValue('app.name');
        getConfigValue('database.host');
        getConfigValue('auth.jwtSecret');
      }
      
      const accessTime = Date.now() - startTime;
      expect(accessTime).toBeLessThan(100); // 100ms内完成10000次访问
    });

    it('应该有效管理内存使用', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // 加载多次配置
      for (let i = 0; i < 100; i++) {
        await loadConfig();
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024); // 内存增长小于10MB
    });
  });

  /**
   * 边界情况测试
   */
  describe('Edge Cases', () => {
    it('应该处理空配置文件', async () => {
      mockFs.readFileSync.mockReturnValue('');
      
      const config = await loadConfig();
      
      expect(config).toBeDefined();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Empty configuration file, using defaults'
      );
    });

    it('应该处理非常大的配置文件', async () => {
      const largeConfig = {
        ...validConfig,
        largeArray: Array.from({ length: 10000 }, (_, i) => `item_${i}`),
        largeObject: Object.fromEntries(
          Array.from({ length: 1000 }, (_, i) => [`key_${i}`, `value_${i}`])
        )
      };
      
      mockFs.readFileSync.mockReturnValue(JSON.stringify(largeConfig));
      
      const config = await loadConfig();
      
      expect(config).toBeDefined();
      expect(config.largeArray).toHaveLength(10000);
      expect(Object.keys(config.largeObject)).toHaveLength(1000);
    });

    it('应该处理特殊字符', async () => {
      const specialConfig = {
        ...validConfig,
        app: {
          ...validConfig.app,
          name: 'App with 特殊字符 and émojis 🚀'
        }
      };
      
      mockFs.readFileSync.mockReturnValue(JSON.stringify(specialConfig));
      
      const config = await loadConfig();
      
      expect(config.app.name).toBe('App with 特殊字符 and émojis 🚀');
    });

    it('应该处理循环引用', () => {
      const circularConfig: Record<string, unknown> = { ...validConfig };
      circularConfig.self = circularConfig;
      
      const sanitized = sanitizeConfig(circularConfig);
      
      expect(sanitized).toBeDefined();
      expect(sanitized.self).toBeUndefined();
    });
  });
});