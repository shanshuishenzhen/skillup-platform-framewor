/**
 * 环境配置工具单元测试
 * 
 * 测试环境配置工具的各项功能，包括：
 * - 配置加载和验证
 * - 环境变量解析
 * - 配置热重载
 * - 配置缓存机制
 * - 配置验证规则
 * - 敏感信息处理
 * - 配置覆盖机制
 * - 错误处理
 */

import {
  getEnvConfig,
  loadConfig,
  validateConfig,
  reloadConfig,
  getConfig,
  setConfig,
  resetConfig,
  watchConfig,
  unwatchConfig,
  maskSensitiveData,
  parseEnvValue,
  mergeConfigs
} from '../../utils/envConfig';
import { logger } from '../../utils/logger';
import fs from 'fs/promises';
import path from 'path';
import { EventEmitter } from 'events';

// Mock 依赖
jest.mock('../../utils/logger');
jest.mock('fs/promises');
jest.mock('path');
jest.mock('events');

// 类型定义
interface MockLogger {
  info: jest.MockedFunction<any>;
  warn: jest.MockedFunction<any>;
  error: jest.MockedFunction<any>;
  debug: jest.MockedFunction<any>;
}

interface MockFs {
  readFile: jest.MockedFunction<any>;
  writeFile: jest.MockedFunction<any>;
  access: jest.MockedFunction<any>;
  watch: jest.MockedFunction<any>;
}

// Mock 实例
const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
} as MockLogger;

const mockFs = {
  readFile: jest.fn(),
  writeFile: jest.fn(),
  access: jest.fn(),
  watch: jest.fn()
} as MockFs;

const mockPath = {
  join: jest.fn(),
  resolve: jest.fn(),
  dirname: jest.fn(),
  basename: jest.fn()
} as jest.Mocked<typeof path>;

const mockEventEmitter = {
  on: jest.fn(),
  off: jest.fn(),
  emit: jest.fn(),
  removeAllListeners: jest.fn()
} as jest.Mocked<EventEmitter>;

// 设置 Mock
(logger as any) = mockLogger;
(fs as any) = mockFs;
(path as any) = mockPath;

// 测试环境变量
const originalEnv = process.env;

describe('Environment Configuration', () => {
  // 测试配置数据
  const testEnvConfig = {
    app: {
      name: 'SkillUp Platform',
      version: '1.0.0',
      environment: 'test',
      port: 3000,
      host: 'localhost',
      debug: true,
      cors: {
        enabled: true,
        origins: ['http://localhost:3000'],
        credentials: true
      }
    },
    database: {
      host: 'localhost',
      port: 5432,
      name: 'skillup_test',
      username: 'test_user',
      password: 'test_password',
      ssl: false,
      pool: {
        min: 2,
        max: 10,
        acquireTimeoutMillis: 30000,
        idleTimeoutMillis: 30000
      }
    },
    redis: {
      host: 'localhost',
      port: 6379,
      password: 'redis_password',
      db: 0,
      keyPrefix: 'skillup:test:',
      ttl: 3600
    },
    jwt: {
      secret: 'test_jwt_secret',
      expiresIn: '24h',
      refreshExpiresIn: '7d',
      issuer: 'skillup-platform',
      audience: 'skillup-users'
    },
    email: {
      smtp: {
        host: 'smtp.test.com',
        port: 587,
        secure: false,
        auth: {
          user: 'test@example.com',
          pass: 'email_password'
        }
      },
      from: {
        name: 'SkillUp Platform',
        address: 'noreply@skillup.com'
      }
    },
    storage: {
      provider: 'local',
      local: {
        uploadPath: './uploads',
        maxFileSize: 10485760,
        allowedTypes: ['image/jpeg', 'image/png', 'application/pdf']
      },
      s3: {
        bucket: 'skillup-uploads',
        region: 'us-east-1',
        accessKeyId: 's3_access_key',
        secretAccessKey: 's3_secret_key'
      }
    },
    ai: {
      openai: {
        apiKey: 'openai_api_key',
        baseURL: 'https://api.openai.com/v1',
        model: 'gpt-3.5-turbo',
        maxTokens: 2048,
        temperature: 0.7
      },
      baidu: {
        apiKey: 'baidu_api_key',
        secretKey: 'baidu_secret_key',
        baseURL: 'https://aip.baidubce.com'
      }
    },
    monitoring: {
      enabled: true,
      errorTracking: true,
      performanceTracking: true,
      logLevel: 'debug'
    }
  };

  const testEnvFile = `
# Application Configuration
APP_NAME=SkillUp Platform
APP_VERSION=1.0.0
APP_ENVIRONMENT=test
APP_PORT=3000
APP_HOST=localhost
APP_DEBUG=true

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=skillup_test
DB_USERNAME=test_user
DB_PASSWORD=test_password
DB_SSL=false

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=redis_password
REDIS_DB=0

# JWT Configuration
JWT_SECRET=test_jwt_secret
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# Email Configuration
EMAIL_SMTP_HOST=smtp.test.com
EMAIL_SMTP_PORT=587
EMAIL_SMTP_USER=test@example.com
EMAIL_SMTP_PASS=email_password

# AI Configuration
OPENAI_API_KEY=openai_api_key
BAIDU_API_KEY=baidu_api_key
BAIDU_SECRET_KEY=baidu_secret_key
  `;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // 重置环境变量
    process.env = { ...originalEnv };
    
    // 设置默认 Mock 返回值
    mockPath.join.mockImplementation((...args) => args.join('/'));
    mockPath.resolve.mockImplementation((...args) => '/' + args.join('/'));
    mockFs.access.mockResolvedValue(undefined);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  /**
   * 配置加载测试
   */
  describe('Configuration Loading', () => {
    it('应该成功加载配置文件', async () => {
      mockFs.readFile.mockResolvedValue(testEnvFile);
      
      const config = await loadConfig('.env.test');
      
      expect(config).toEqual(
        expect.objectContaining({
          app: expect.objectContaining({
            name: 'SkillUp Platform',
            environment: 'test',
            port: 3000
          }),
          database: expect.objectContaining({
            host: 'localhost',
            port: 5432,
            name: 'skillup_test'
          })
        })
      );
      
      expect(mockFs.readFile).toHaveBeenCalledWith('.env.test', 'utf8');
    });

    it('应该从环境变量加载配置', () => {
      process.env.APP_NAME = 'Test App';
      process.env.APP_PORT = '4000';
      process.env.DB_HOST = 'db.example.com';
      process.env.JWT_SECRET = 'env_jwt_secret';
      
      const config = loadConfig();
      
      expect(config.app.name).toBe('Test App');
      expect(config.app.port).toBe(4000);
      expect(config.database.host).toBe('db.example.com');
      expect(config.jwt.secret).toBe('env_jwt_secret');
    });

    it('应该处理配置文件不存在的情况', async () => {
      mockFs.readFile.mockRejectedValue(new Error('File not found'));
      
      const config = await loadConfig('.env.missing');
      
      expect(config).toEqual(expect.any(Object));
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Configuration file not found, using environment variables only'
      );
    });

    it('应该支持多个配置文件', async () => {
      const baseConfig = 'APP_NAME=Base App\nAPP_PORT=3000';
      const envConfig = 'APP_NAME=Env App\nDB_HOST=localhost';
      
      mockFs.readFile
        .mockResolvedValueOnce(baseConfig)
        .mockResolvedValueOnce(envConfig);
      
      const config = await loadConfig(['.env', '.env.local']);
      
      expect(config.app.name).toBe('Env App'); // 后加载的配置应该覆盖前面的
      expect(config.app.port).toBe(3000);
      expect(config.database.host).toBe('localhost');
    });
  });

  /**
   * 配置验证测试
   */
  describe('Configuration Validation', () => {
    it('应该验证必需的配置项', () => {
      const invalidConfig = {
        app: {
          name: '',
          port: 'invalid'
        },
        database: {
          host: '',
          password: ''
        }
      };
      
      expect(() => validateConfig(invalidConfig)).toThrow('Configuration validation failed');
    });

    it('应该验证配置项类型', () => {
      const invalidConfig = {
        app: {
          port: 'not_a_number',
          debug: 'not_a_boolean'
        },
        database: {
          port: 'not_a_number',
          ssl: 'not_a_boolean'
        }
      };
      
      expect(() => validateConfig(invalidConfig)).toThrow();
    });

    it('应该验证配置项范围', () => {
      const invalidConfig = {
        app: {
          port: 99999 // 超出有效端口范围
        },
        database: {
          pool: {
            min: -1, // 负数
            max: 0   // 小于最小值
          }
        }
      };
      
      expect(() => validateConfig(invalidConfig)).toThrow();
    });

    it('应该验证URL格式', () => {
      const invalidConfig = {
        ai: {
          openai: {
            baseURL: 'invalid-url'
          }
        },
        app: {
          cors: {
            origins: ['invalid-origin']
          }
        }
      };
      
      expect(() => validateConfig(invalidConfig)).toThrow();
    });

    it('应该通过有效配置验证', () => {
      expect(() => validateConfig(testEnvConfig)).not.toThrow();
    });
  });

  /**
   * 环境变量解析测试
   */
  describe('Environment Variable Parsing', () => {
    it('应该解析字符串值', () => {
      expect(parseEnvValue('hello')).toBe('hello');
      expect(parseEnvValue('"quoted string"')).toBe('quoted string');
    });

    it('应该解析数字值', () => {
      expect(parseEnvValue('123')).toBe(123);
      expect(parseEnvValue('3.14')).toBe(3.14);
      expect(parseEnvValue('-42')).toBe(-42);
    });

    it('应该解析布尔值', () => {
      expect(parseEnvValue('true')).toBe(true);
      expect(parseEnvValue('false')).toBe(false);
      expect(parseEnvValue('TRUE')).toBe(true);
      expect(parseEnvValue('FALSE')).toBe(false);
    });

    it('应该解析数组值', () => {
      expect(parseEnvValue('a,b,c')).toEqual(['a', 'b', 'c']);
      expect(parseEnvValue('1,2,3')).toEqual([1, 2, 3]);
      expect(parseEnvValue('true,false')).toEqual([true, false]);
    });

    it('应该解析JSON值', () => {
      expect(parseEnvValue('{"key":"value"}')).toEqual({ key: 'value' });
      expect(parseEnvValue('[1,2,3]')).toEqual([1, 2, 3]);
    });

    it('应该处理空值', () => {
      expect(parseEnvValue('')).toBe('');
      expect(parseEnvValue('null')).toBe(null);
      expect(parseEnvValue('undefined')).toBe(undefined);
    });
  });

  /**
   * 配置热重载测试
   */
  describe('Configuration Hot Reload', () => {
    it('应该支持配置热重载', async () => {
      const initialConfig = 'APP_NAME=Initial App';
      const updatedConfig = 'APP_NAME=Updated App';
      
      mockFs.readFile
        .mockResolvedValueOnce(initialConfig)
        .mockResolvedValueOnce(updatedConfig);
      
      // 初始加载
      await loadConfig('.env');
      expect(getConfig('app.name')).toBe('Initial App');
      
      // 重新加载
      await reloadConfig();
      expect(getConfig('app.name')).toBe('Updated App');
      
      expect(mockLogger.info).toHaveBeenCalledWith('Configuration reloaded successfully');
    });

    it('应该监听配置文件变化', () => {
      const mockWatcher = {
        on: jest.fn(),
        close: jest.fn()
      };
      
      mockFs.watch.mockReturnValue(mockWatcher as any);
      
      const callback = jest.fn();
      watchConfig('.env', callback);
      
      expect(mockFs.watch).toHaveBeenCalledWith('.env', expect.any(Object));
      expect(mockWatcher.on).toHaveBeenCalledWith('change', expect.any(Function));
    });

    it('应该停止监听配置文件', () => {
      const mockWatcher = {
        on: jest.fn(),
        close: jest.fn()
      };
      
      mockFs.watch.mockReturnValue(mockWatcher as any);
      
      watchConfig('.env', jest.fn());
      unwatchConfig();
      
      expect(mockWatcher.close).toHaveBeenCalled();
    });
  });

  /**
   * 配置访问测试
   */
  describe('Configuration Access', () => {
    beforeEach(() => {
      // 设置测试配置
      setConfig(testEnvConfig);
    });

    it('应该获取配置值', () => {
      expect(getConfig('app.name')).toBe('SkillUp Platform');
      expect(getConfig('app.port')).toBe(3000);
      expect(getConfig('database.host')).toBe('localhost');
    });

    it('应该获取嵌套配置值', () => {
      expect(getConfig('database.pool.max')).toBe(10);
      expect(getConfig('email.smtp.auth.user')).toBe('test@example.com');
      expect(getConfig('ai.openai.model')).toBe('gpt-3.5-turbo');
    });

    it('应该返回默认值', () => {
      expect(getConfig('nonexistent.key', 'default')).toBe('default');
      expect(getConfig('app.nonexistent', 42)).toBe(42);
    });

    it('应该设置配置值', () => {
      setConfig('app.name', 'New App Name');
      expect(getConfig('app.name')).toBe('New App Name');
      
      setConfig('new.nested.key', 'value');
      expect(getConfig('new.nested.key')).toBe('value');
    });

    it('应该重置配置', () => {
      setConfig('app.name', 'Modified Name');
      expect(getConfig('app.name')).toBe('Modified Name');
      
      resetConfig();
      expect(getConfig('app.name')).toBeUndefined();
    });
  });

  /**
   * 敏感信息处理测试
   */
  describe('Sensitive Data Handling', () => {
    it('应该屏蔽敏感配置信息', () => {
      const maskedConfig = maskSensitiveData(testEnvConfig);
      
      expect(maskedConfig.database.password).toBe('***');
      expect(maskedConfig.redis.password).toBe('***');
      expect(maskedConfig.jwt.secret).toBe('***');
      expect(maskedConfig.email.smtp.auth.pass).toBe('***');
      expect(maskedConfig.ai.openai.apiKey).toBe('***');
      expect(maskedConfig.storage.s3.secretAccessKey).toBe('***');
      
      // 非敏感信息应该保持不变
      expect(maskedConfig.app.name).toBe('SkillUp Platform');
      expect(maskedConfig.database.host).toBe('localhost');
    });

    it('应该自定义敏感字段', () => {
      const config = {
        customSecret: 'secret_value',
        publicInfo: 'public_value'
      };
      
      const maskedConfig = maskSensitiveData(config, ['customSecret']);
      
      expect(maskedConfig.customSecret).toBe('***');
      expect(maskedConfig.publicInfo).toBe('public_value');
    });
  });

  /**
   * 配置合并测试
   */
  describe('Configuration Merging', () => {
    it('应该合并配置对象', () => {
      const baseConfig = {
        app: {
          name: 'Base App',
          port: 3000,
          debug: false
        },
        database: {
          host: 'localhost',
          port: 5432
        }
      };
      
      const overrideConfig = {
        app: {
          name: 'Override App',
          debug: true
        },
        database: {
          host: 'remote.db.com'
        },
        newSection: {
          key: 'value'
        }
      };
      
      const merged = mergeConfigs(baseConfig, overrideConfig);
      
      expect(merged).toEqual({
        app: {
          name: 'Override App',
          port: 3000,
          debug: true
        },
        database: {
          host: 'remote.db.com',
          port: 5432
        },
        newSection: {
          key: 'value'
        }
      });
    });

    it('应该深度合并嵌套对象', () => {
      const config1 = {
        level1: {
          level2: {
            key1: 'value1',
            key2: 'value2'
          }
        }
      };
      
      const config2 = {
        level1: {
          level2: {
            key2: 'override2',
            key3: 'value3'
          }
        }
      };
      
      const merged = mergeConfigs(config1, config2);
      
      expect(merged.level1.level2).toEqual({
        key1: 'value1',
        key2: 'override2',
        key3: 'value3'
      });
    });
  });

  /**
   * 错误处理测试
   */
  describe('Error Handling', () => {
    it('应该处理配置文件读取错误', async () => {
      mockFs.readFile.mockRejectedValue(new Error('Permission denied'));
      
      await expect(loadConfig('.env.protected')).rejects.toThrow('Permission denied');
      
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to load configuration:',
        expect.any(Error)
      );
    });

    it('应该处理无效的JSON配置', () => {
      expect(() => parseEnvValue('{invalid json}')).toThrow();
    });

    it('应该处理配置验证错误', () => {
      const invalidConfig = {
        app: {
          port: 'invalid'
        }
      };
      
      expect(() => validateConfig(invalidConfig)).toThrow('Configuration validation failed');
    });

    it('应该处理配置文件监听错误', () => {
      mockFs.watch.mockImplementation(() => {
        throw new Error('Watch failed');
      });
      
      expect(() => watchConfig('.env', jest.fn())).toThrow('Watch failed');
    });
  });

  /**
   * 缓存机制测试
   */
  describe('Configuration Caching', () => {
    it('应该缓存配置值', () => {
      setConfig(testEnvConfig);
      
      // 第一次访问
      const startTime1 = Date.now();
      const value1 = getConfig('app.name');
      const time1 = Date.now() - startTime1;
      
      // 第二次访问（应该使用缓存）
      const startTime2 = Date.now();
      const value2 = getConfig('app.name');
      const time2 = Date.now() - startTime2;
      
      expect(value1).toBe(value2);
      expect(time2).toBeLessThanOrEqual(time1);
    });

    it('应该在配置更新时清除缓存', () => {
      setConfig('app.name', 'Original Name');
      expect(getConfig('app.name')).toBe('Original Name');
      
      setConfig('app.name', 'Updated Name');
      expect(getConfig('app.name')).toBe('Updated Name');
    });
  });

  /**
   * 性能测试
   */
  describe('Performance Tests', () => {
    it('应该快速加载配置', async () => {
      mockFs.readFile.mockResolvedValue(testEnvFile);
      
      const startTime = Date.now();
      await loadConfig('.env');
      const loadTime = Date.now() - startTime;
      
      expect(loadTime).toBeLessThan(100); // 应该在100ms内完成
    });

    it('应该高效访问配置值', () => {
      setConfig(testEnvConfig);
      
      const startTime = Date.now();
      
      // 访问1000次配置值
      for (let i = 0; i < 1000; i++) {
        getConfig('app.name');
        getConfig('database.host');
        getConfig('ai.openai.model');
      }
      
      const accessTime = Date.now() - startTime;
      
      expect(accessTime).toBeLessThan(100); // 应该在100ms内完成
    });

    it('应该高效合并大型配置', () => {
      const largeConfig1 = {};
      const largeConfig2 = {};
      
      // 创建大型配置对象
      for (let i = 0; i < 1000; i++) {
        largeConfig1[`key${i}`] = {
          nested: {
            value: `value${i}`,
            number: i,
            boolean: i % 2 === 0
          }
        };
        
        largeConfig2[`key${i}`] = {
          nested: {
            value: `override${i}`,
            newKey: `new${i}`
          }
        };
      }
      
      const startTime = Date.now();
      const merged = mergeConfigs(largeConfig1, largeConfig2);
      const mergeTime = Date.now() - startTime;
      
      expect(mergeTime).toBeLessThan(1000); // 应该在1秒内完成
      expect(Object.keys(merged)).toHaveLength(1000);
    });
  });
});