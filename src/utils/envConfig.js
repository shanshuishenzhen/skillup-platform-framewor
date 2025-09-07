// /src/utils/envConfig.ts

import { EventEmitter } from 'events';
// 注意：fs模块只能在服务端使用，客户端代码不能导入
// fs和path模块将在需要时动态导入

/**
 * 配置验证规则
 * @typedef {Object} ValidationRule
 * @property {boolean} [required] - 是否必需
 * @property {'string'|'number'|'boolean'|'array'} [type] - 数据类型
 * @property {number} [min] - 最小值
 * @property {number} [max] - 最大值
 * @property {RegExp} [pattern] - 正则表达式
 * @property {function} [validator] - 自定义验证函数
 */

/**
 * 配置验证规则映射
 * @typedef {Object.<string, ValidationRule>} ValidationRules
 */

/**
 * 配置变更事件
 * @typedef {Object} ConfigChangeEvent
 * @property {string} key - 配置键
 * @property {*} oldValue - 旧值
 * @property {*} newValue - 新值
 * @property {Date} timestamp - 时间戳
 */

/**
 * 环境变量配置
 * @typedef {Object} EnvConfig
 * @property {Object} supabase - Supabase配置
 * @property {Object} openai - OpenAI配置
 * @property {Object} baidu - 百度AI配置
 * @property {Object} security - 安全配置
 * @property {Object} app - 应用配置
 * @property {Object} rateLimit - 限流配置
 * @property {Object} upload - 文件上传配置
 * @property {Object} faceRecognition - 人脸识别配置
 * @property {Object} analytics - 分析配置
 * @property {Object} audit - 审计配置
 * @property {Object} redis - Redis配置
 */
// 移除EnvConfigSchema，使用JSDoc注释即可

/**
 * 环境变量验证错误类
 * @class EnvValidationError
 */
class EnvValidationError extends Error {
  constructor(message, missingVars = []) {
    super(message);
    this.name = 'EnvValidationError';
    this.missingVars = missingVars;
  }
}

/**
 * 环境变量配置管理类
 * @class EnvConfigManager
 */
class EnvConfigManager extends EventEmitter {
  constructor() {
    super();
    this.config = null;
    this.isValidated = false;
    this.hotReloadEnabled = false;
    this.envFileWatcher = null;
    this.lastConfigHash = '';
    this.validationRules = {};
    this.initValidationRules();
  }
  
  /**
   * 初始化配置验证规则
   * @private
   */
  initValidationRules() {
    this.validationRules = {
      'NEXT_PUBLIC_SUPABASE_URL': {
        required: true,
        type: 'string',
        pattern: /^https?:\/\/.+/,
        validator: (value) => {
          if (typeof value !== 'string' || !value.includes('supabase')) {
            return '必须是有效的Supabase URL';
          }
          return true;
        }
      },
      'NEXT_PUBLIC_SUPABASE_ANON_KEY': {
        required: true,
        type: 'string',
        min: 100,
        validator: (value) => {
          if (typeof value !== 'string' || !value.startsWith('eyJ')) {
            return '必须是有效的Supabase匿名密钥';
          }
          return true;
        }
      },
      'SUPABASE_SERVICE_ROLE_KEY': {
        required: true,
        type: 'string',
        min: 100,
        validator: (value) => {
          if (typeof value !== 'string' || !value.startsWith('eyJ')) {
            return '必须是有效的Supabase服务角色密钥';
          }
          return true;
        }
      },
      'ENCRYPTION_KEY': {
        required: true,
        type: 'string',
        min: 32,
        validator: (value) => {
          if (typeof value !== 'string' || !/^[a-fA-F0-9]{64}$/.test(value)) {
            return '必须是64位十六进制字符串';
          }
          return true;
        }
      },
      'API_SECRET_KEY': {
        required: true,
        type: 'string',
        min: 32
      },
      'SESSION_SECRET': {
        required: true,
        type: 'string',
        min: 32
      },
      'PORT': {
        type: 'number',
        min: 1000,
        max: 65535
      },
      'OPENAI_TIMEOUT': {
        type: 'number',
        min: 1000,
        max: 300000
      },
      'RATE_LIMIT_MAX_REQUESTS': {
        type: 'number',
        min: 1,
        max: 10000
      },
      'MAX_FILE_SIZE_MB': {
        type: 'number',
        min: 1,
        max: 100
      }
    };
  }

  /**
   * 获取环境变量值，支持默认值
   * @private
   * @param key 环境变量键名
   * @param defaultValue 默认值
   * @returns string 环境变量值
   */
  getEnvVar(key, defaultValue) {
    const value = process.env[key];
    if (value === undefined || value === '') {
      if (defaultValue !== undefined) {
        return defaultValue;
      }
      throw new Error(`环境变量 ${key} 未设置`);
    }
    return value;
  }

  /**
   * 获取数字类型的环境变量
   * @private
   * @param key 环境变量键名
   * @param defaultValue 默认值
   * @returns number 环境变量数值
   */
  getEnvNumber(key, defaultValue) {
    const value = process.env[key];
    if (value === undefined || value === '') {
      if (defaultValue !== undefined) {
        return defaultValue;
      }
      throw new Error(`环境变量 ${key} 未设置`);
    }
    const num = parseInt(value, 10);
    if (isNaN(num)) {
      throw new Error(`环境变量 ${key} 不是有效的数字: ${value}`);
    }
    return num;
  }

  /**
   * 获取布尔类型的环境变量
   * @private
   * @param key 环境变量键名
   * @param defaultValue 默认值
   * @returns boolean 环境变量布尔值
   */
  getEnvBoolean(key, defaultValue) {
    const value = process.env[key];
    if (value === undefined || value === '') {
      if (defaultValue !== undefined) {
        return defaultValue;
      }
      throw new Error(`环境变量 ${key} 未设置`);
    }
    return value.toLowerCase() === 'true';
  }

  /**
   * 验证单个环境变量
   * @private
   * @param key 环境变量键名
   * @param value 环境变量值
   * @param rule 验证规则
   * @returns string | null 错误信息或null
   */
  validateEnvVar(key, value, rule) {
    // 检查必需性
    if (rule.required && (!value || value === '')) {
      return `环境变量 ${key} 是必需的`;
    }
    
    // 如果值为空且不是必需的，跳过其他验证
    if (!value || value === '') {
      return null;
    }
    
    // 类型验证
    if (rule.type) {
      switch (rule.type) {
        case 'number':
          const num = Number(value);
          if (isNaN(num)) {
            return `环境变量 ${key} 必须是数字`;
          }
          if (rule.min !== undefined && num < rule.min) {
            return `环境变量 ${key} 不能小于 ${rule.min}`;
          }
          if (rule.max !== undefined && num > rule.max) {
            return `环境变量 ${key} 不能大于 ${rule.max}`;
          }
          break;
        case 'string':
          if (typeof value !== 'string') {
            return `环境变量 ${key} 必须是字符串`;
          }
          if (rule.min !== undefined && value.length < rule.min) {
            return `环境变量 ${key} 长度不能小于 ${rule.min}`;
          }
          if (rule.max !== undefined && value.length > rule.max) {
            return `环境变量 ${key} 长度不能大于 ${rule.max}`;
          }
          break;
        case 'boolean':
          if (typeof value !== 'string' || !['true', 'false', '1', '0'].includes(value.toLowerCase())) {
            return `环境变量 ${key} 必须是布尔值 (true/false/1/0)`;
          }
          break;
        case 'array':
          if (!Array.isArray(value) && typeof value === 'string') {
            // 尝试解析逗号分隔的字符串
            try {
              const parsed = value.split(',').map(v => v.trim());
              if (rule.min !== undefined && parsed.length < rule.min) {
                return `环境变量 ${key} 数组长度不能小于 ${rule.min}`;
              }
              if (rule.max !== undefined && parsed.length > rule.max) {
                return `环境变量 ${key} 数组长度不能大于 ${rule.max}`;
              }
            } catch {
              return `环境变量 ${key} 不是有效的数组格式`;
            }
          }
          break;
      }
    }
    
    // 正则表达式验证
    if (rule.pattern && typeof value === 'string' && !rule.pattern.test(value)) {
      return `环境变量 ${key} 格式不正确`;
    }
    
    // 自定义验证器
    if (rule.validator) {
      const result = rule.validator(value);
      if (result !== true) {
        return typeof result === 'string' ? result : `环境变量 ${key} 验证失败`;
      }
    }
    
    return null;
  }
  
  /**
   * 验证所有环境变量
   * @private
   * @throws {EnvValidationError} 当有环境变量验证失败时抛出错误
   */
  validateAllEnvVars() {
    const errors = [];
    const missingVars = [];
    
    for (const [key, rule] of Object.entries(this.validationRules)) {
      const value = process.env[key];
      const error = this.validateEnvVar(key, value, rule);
      
      if (error) {
        errors.push(error);
        if (rule.required && (!value || value === '')) {
          missingVars.push(key);
        }
      }
    }
    
    if (errors.length > 0) {
      throw new EnvValidationError(
        `环境变量验证失败:\n${errors.join('\n')}`,
        missingVars
      );
    }
  }
  
  /**
   * 验证必需的环境变量
   * @private
   * @param requiredVars 必需的环境变量列表
   * @throws {EnvValidationError} 当有环境变量缺失时抛出错误
   */
  validateRequiredVars(requiredVars) {
    const missingVars = [];
    
    for (const varName of requiredVars) {
      const value = process.env[varName];
      if (!value || value.trim() === '') {
        missingVars.push(varName);
      }
    }
    
    if (missingVars.length > 0) {
      throw new EnvValidationError(
        `以下环境变量未设置或为空: ${missingVars.join(', ')}`,
        missingVars
      );
    }
  }

  /**
   * 生成配置哈希值
   * @private
   * @returns string 配置哈希值
   */
  generateConfigHash() {
    const configKeys = Object.keys(this.validationRules).sort();
    const configValues = configKeys.map(key => `${key}=${process.env[key] || ''}`);
    return Buffer.from(configValues.join('|')).toString('base64');
  }
  
  /**
   * 启用热重载功能
   * @param envFilePath .env文件路径
   */
  enableHotReload(envFilePath) {
    if (this.hotReloadEnabled) {
      return;
    }
    
    // 注意：热重载功能只能在服务端使用，客户端环境不支持fs模块
    if (typeof window !== 'undefined') {
      console.warn('[EnvConfig] 热重载功能仅在服务端环境可用');
      return;
    }
    
    try {
      // 动态导入fs和path模块，避免客户端打包时出错
      // 使用eval来避免打包工具静态分析
      const fs = eval('require')('fs');
      const path = eval('require')('path');
      
      const envPath = envFilePath || path.join(process.cwd(), '.env');
      
      this.envFileWatcher = fs.watch(envPath, (eventType) => {
        if (eventType === 'change') {
          setTimeout(() => {
            this.handleConfigChange();
          }, 100); // 延迟处理，避免文件写入过程中的读取
        }
      });
      
      this.hotReloadEnabled = true;
      console.log(`[EnvConfig] 热重载已启用，监听文件: ${envPath}`);
    } catch (error) {
      console.warn(`[EnvConfig] 无法启用热重载: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }
  
  /**
   * 禁用热重载功能
   */
  disableHotReload() {
    if (this.envFileWatcher) {
      this.envFileWatcher.close();
      this.envFileWatcher = null;
    }
    this.hotReloadEnabled = false;
    console.log('[EnvConfig] 热重载已禁用');
  }
  
  /**
   * 处理配置变更
   * @private
   */
  handleConfigChange() {
    try {
      const newConfigHash = this.generateConfigHash();
      
      if (newConfigHash !== this.lastConfigHash) {
        const oldConfig = this.config ? { ...this.config } : null;
        
        // 重新加载配置
        this.resetConfig();
        const newConfig = this.loadConfig(false);
        
        // 发出配置变更事件
        const changeEvent = {
          key: 'global',
          oldValue: oldConfig,
          newValue: newConfig,
          timestamp: new Date()
        };
        
        this.emit('configChanged', changeEvent);
        console.log('[EnvConfig] 配置已重新加载');
        
        this.lastConfigHash = newConfigHash;
      }
    } catch (error) {
      console.error('[EnvConfig] 配置重新加载失败:', error);
      this.emit('configError', error);
    }
  }
  
  /**
   * 加载和验证环境变量配置
   * @param strict 是否启用严格模式（验证所有必需变量）
   * @param enableValidation 是否启用详细验证
   * @returns EnvConfig 环境配置对象
   * @throws {EnvValidationError} 当环境变量验证失败时抛出错误
   */
  loadConfig(strict = false, enableValidation = true) {
    if (this.config && this.isValidated) {
      return this.config;
    }

    try {
      // 定义必需的环境变量
      const requiredVars = [
        'NEXT_PUBLIC_SUPABASE_URL',
        'NEXT_PUBLIC_SUPABASE_ANON_KEY',
        'SUPABASE_SERVICE_ROLE_KEY',
        'ENCRYPTION_KEY',
        'API_SECRET_KEY',
        'SESSION_SECRET'
      ];

      // 根据模式选择验证方式
      if (enableValidation) {
        // 使用详细验证规则
        this.validateAllEnvVars();
      } else if (strict) {
        // 仅验证必需变量
        this.validateRequiredVars(requiredVars);
      }

      // 构建配置对象
      this.config = {
        supabase: {
          url: this.getEnvVar('NEXT_PUBLIC_SUPABASE_URL'),
          anonKey: this.getEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
          serviceRoleKey: this.getEnvVar('SUPABASE_SERVICE_ROLE_KEY')
        },
        
        openai: {
          apiKey: this.getEnvVar('OPENAI_API_KEY', ''),
          baseURL: this.getEnvVar('OPENAI_BASE_URL', 'https://api.openai.com/v1'),
          timeout: this.getEnvNumber('OPENAI_TIMEOUT', 30000),
          maxRetries: this.getEnvNumber('OPENAI_MAX_RETRIES', 3),
          model: this.getEnvVar('OPENAI_MODEL', 'gpt-3.5-turbo')
        },
        
        baidu: {
          apiKey: this.getEnvVar('BAIDU_API_KEY', ''),
          secretKey: this.getEnvVar('BAIDU_SECRET_KEY', '')
        },
        
        security: {
          encryptionKey: this.getEnvVar('ENCRYPTION_KEY'),
          apiSecretKey: this.getEnvVar('API_SECRET_KEY'),
          sessionSecret: this.getEnvVar('SESSION_SECRET'),
          jwtSecret: this.getEnvVar('JWT_SECRET', 'your-secret-key'),
          jwtExpiresIn: this.getEnvVar('JWT_EXPIRES_IN', '24h'),
          jwtRefreshExpiresIn: this.getEnvVar('JWT_REFRESH_EXPIRES_IN', '7d')
        },
        
        app: {
          nodeEnv: this.getEnvVar('NODE_ENV', 'development'),
          port: this.getEnvNumber('PORT', 3000),
          allowedOrigins: this.getEnvVar('ALLOWED_ORIGINS', 'http://localhost:3000').split(',')
        },
        
        rateLimit: {
          windowMs: this.getEnvNumber('RATE_LIMIT_WINDOW_MS', 900000),
          maxRequests: this.getEnvNumber('RATE_LIMIT_MAX_REQUESTS', 100),
          faceAuthMax: this.getEnvNumber('FACE_AUTH_RATE_LIMIT_MAX', 10)
        },
        
        upload: {
          maxFileSizeMB: this.getEnvNumber('MAX_FILE_SIZE_MB', 10),
          maxImageSizeMB: this.getEnvNumber('MAX_IMAGE_SIZE_MB', 5)
        },
        
        faceRecognition: {
          confidenceThreshold: this.getEnvNumber('FACE_CONFIDENCE_THRESHOLD', 80),
          qualityThreshold: this.getEnvNumber('FACE_QUALITY_THRESHOLD', 70),
          livenessThreshold: parseFloat(this.getEnvVar('LIVENESS_THRESHOLD', '0.8'))
        },
        
        analytics: {
          enabled: this.getEnvBoolean('ANALYTICS_ENABLED', true),
          batchSize: this.getEnvNumber('ANALYTICS_BATCH_SIZE', 100),
          flushInterval: this.getEnvNumber('ANALYTICS_FLUSH_INTERVAL', 5000),
          retentionDays: this.getEnvNumber('ANALYTICS_RETENTION_DAYS', 365)
        },
        
        audit: {
          enabled: this.getEnvBoolean('AUDIT_ENABLED', true),
          logLevel: this.getEnvVar('AUDIT_LOG_LEVEL', 'info'),
          retentionDays: this.getEnvNumber('AUDIT_RETENTION_DAYS', 90),
          batchSize: this.getEnvNumber('AUDIT_BATCH_SIZE', 50),
          flushInterval: this.getEnvNumber('AUDIT_FLUSH_INTERVAL', 10000),
          enableEncryption: this.getEnvBoolean('AUDIT_ENABLE_ENCRYPTION', false),
          enableCompression: this.getEnvBoolean('AUDIT_ENABLE_COMPRESSION', true),
          enableRealTimeAlerts: this.getEnvBoolean('AUDIT_ENABLE_REAL_TIME_ALERTS', false)
        },
        
        redis: {
          host: this.getEnvVar('REDIS_HOST', 'localhost'),
          port: this.getEnvNumber('REDIS_PORT', 6379),
          password: this.getEnvVar('REDIS_PASSWORD', ''),
          db: this.getEnvNumber('REDIS_DB', 0),
          keyPrefix: this.getEnvVar('REDIS_KEY_PREFIX', 'skillup:')
        }
      };

      this.isValidated = true;
      
      // 生成配置哈希
      this.lastConfigHash = this.generateConfigHash();
      
      // 发出配置加载完成事件
      this.emit('configLoaded', this.config);
      
      return this.config;
    } catch (error) {
      // 发出配置加载错误事件
      this.emit('configError', error);
      
      if (error instanceof EnvValidationError) {
        throw error;
      }
      throw new EnvValidationError(
        `环境变量配置加载失败: ${error instanceof Error ? error.message : '未知错误'}`
      );
    }
  }

  /**
   * 检查特定服务的配置是否完整
   * @param service 服务名称
   * @returns boolean 配置是否完整
   */
  isServiceConfigured(service) {
    if (!this.config) {
      this.loadConfig(false);
    }

    if (!this.config) return false;

    switch (service) {
      case 'openai':
        return !!this.config.openai.apiKey && this.config.openai.apiKey !== 'your_openai_api_key_here';
      case 'baidu':
        return !!this.config.baidu.apiKey && 
               !!this.config.baidu.secretKey && 
               this.config.baidu.apiKey !== 'your_baidu_api_key_here';
      case 'supabase':
        return !!this.config.supabase.url && 
               !!this.config.supabase.anonKey && 
               !!this.config.supabase.serviceRoleKey;
      default:
        return false;
    }
  }

  /**
   * 获取服务配置状态报告
   * @returns {Object} 配置状态报告
   */
  getConfigStatus() {
    const openai = this.isServiceConfigured('openai');
    const baidu = this.isServiceConfigured('baidu');
    const supabase = this.isServiceConfigured('supabase');
    
    return {
      openai,
      baidu,
      supabase,
      overall: openai && baidu && supabase
    };
  }

  /**
   * 获取配置验证报告
   * @returns {Object} 详细的验证报告
   */
  getValidationReport() {
    const errors = [];
    const warnings = [];
    const missingRequired = [];
    const configuredServices = [];
    
    // 验证所有环境变量
    for (const [key, rule] of Object.entries(this.validationRules)) {
      const value = process.env[key];
      const error = this.validateEnvVar(key, value, rule);
      
      if (error) {
        if (rule.required) {
          errors.push(error);
          missingRequired.push(key);
        } else {
          warnings.push(error);
        }
      }
    }
    
    // 检查服务配置状态
    const services = ['openai', 'baidu', 'supabase'];
    for (const service of services) {
      if (this.isServiceConfigured(service)) {
        configuredServices.push(service);
      }
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings,
      missingRequired,
      configuredServices
    };
  }
  
  /**
   * 检查环境变量是否存在
   * @param {string} key 环境变量键名
   * @returns {boolean} 是否存在
   */
  hasEnvVar(key) {
    const value = process.env[key];
    return value !== undefined && value !== '';
  }
  
  /**
   * 获取环境变量的安全值（隐藏敏感信息）
   * @param {string} key 环境变量键名
   * @returns {string} 安全的环境变量值
   */
  getSafeEnvVar(key) {
    const value = process.env[key];
    if (!value) return '';
    
    // 敏感信息的键名模式
    const sensitivePatterns = [
      /key/i, /secret/i, /password/i, /token/i, /auth/i
    ];
    
    const isSensitive = sensitivePatterns.some(pattern => pattern.test(key));
    
    if (isSensitive && value.length > 8) {
      return `${value.substring(0, 4)}****${value.substring(value.length - 4)}`;
    }
    
    return value;
  }
  
  /**
   * 强制重新加载配置
   * @param {boolean} enableValidation 是否启用验证
   * @returns {Object} 新的配置对象
   */
  reloadConfig(enableValidation = true) {
    this.resetConfig();
    return this.loadConfig(false, enableValidation);
  }
  
  /**
   * 获取热重载状态
   * @returns {boolean} 是否启用热重载
   */
  isHotReloadEnabled() {
    return this.hotReloadEnabled;
  }
  
  /**
   * 重置配置缓存
   */
  resetConfig() {
    this.config = null;
    this.isValidated = false;
    this.lastConfigHash = '';
  }

  /**
   * 获取当前配置（如果已加载）
   * @returns {Object|null} 当前配置或null
   */
  getCurrentConfig() {
    return this.config;
  }
}

// 创建单例实例
const envConfigManager = new EnvConfigManager();

/**
 * 获取环境配置的便捷函数
 * @param {boolean} strict 是否启用严格模式
 * @param {boolean} enableValidation 是否启用详细验证
 * @returns {Object} 环境配置对象
 */
export function getEnvConfig(strict = false, enableValidation = true) {
  return envConfigManager.loadConfig(strict, enableValidation);
}

/**
 * 检查服务是否已配置的便捷函数
 * @param {string} service 服务名称
 * @returns {boolean} 服务是否已配置
 */
export function isServiceConfigured(service) {
  return envConfigManager.isServiceConfigured(service);
}

/**
 * 获取配置状态的便捷函数
 * @returns {Object} 配置状态报告
 */
export function getConfigStatus() {
  return envConfigManager.getConfigStatus();
}

/**
 * 获取配置验证报告的便捷函数
 * @returns {Object} 详细的验证报告
 */
export function getValidationReport() {
  return envConfigManager.getValidationReport();
}

/**
 * 启用热重载的便捷函数
 * @param {string} envFilePath .env文件路径
 */
export function enableHotReload(envFilePath) {
  envConfigManager.enableHotReload(envFilePath);
}

/**
 * 禁用热重载的便捷函数
 */
export function disableHotReload() {
  envConfigManager.disableHotReload();
}

/**
 * 重新加载配置的便捷函数
 * @param {boolean} enableValidation 是否启用验证
 * @returns {Object} 新的配置对象
 */
export function reloadConfig(enableValidation = true) {
  return envConfigManager.reloadConfig(enableValidation);
}

/**
 * 检查环境变量是否存在的便捷函数
 * @param {string} key 环境变量键名
 * @returns {boolean} 是否存在
 */
export function hasEnvVar(key) {
  return envConfigManager.hasEnvVar(key);
}

/**
 * 获取环境变量安全值的便捷函数
 * @param {string} key 环境变量键名
 * @returns {string} 安全的环境变量值
 */
export function getSafeEnvVar(key) {
  return envConfigManager.getSafeEnvVar(key);
}

/**
 * 监听配置变更事件的便捷函数
 * @param {string} event 事件名称
 * @param {Function} listener 事件监听器
 */
export function onConfigChange(event, listener) {
  envConfigManager.on(event, listener);
}

/**
 * 移除配置变更事件监听器的便捷函数
 * @param {string} event 事件名称
 * @param {Function} listener 事件监听器
 */
export function offConfigChange(event, listener) {
  envConfigManager.off(event, listener);
}

// 导出类和实例
export { envConfigManager, EnvConfigManager, EnvValidationError };