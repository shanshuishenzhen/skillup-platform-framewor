// /src/utils/envConfig.ts

/**
 * 环境变量配置接口
 * @interface EnvConfig
 */
interface EnvConfig {
  // Supabase配置
  supabase: {
    url: string;
    anonKey: string;
    serviceRoleKey: string;
  };
  
  // OpenAI配置
  openai: {
    apiKey: string;
    baseURL: string;
    timeout: number;
    maxRetries: number;
    model: string;
  };
  
  // 百度AI配置
  baidu: {
    apiKey: string;
    secretKey: string;
  };
  
  // 安全配置
  security: {
    encryptionKey: string;
    apiSecretKey: string;
    sessionSecret: string;
    jwtExpiresIn: string;
    jwtRefreshExpiresIn: string;
  };
  
  // 应用配置
  app: {
    nodeEnv: string;
    port: number;
    allowedOrigins: string[];
  };
  
  // 限流配置
  rateLimit: {
    windowMs: number;
    maxRequests: number;
    faceAuthMax: number;
  };
  
  // 文件上传配置
  upload: {
    maxFileSizeMB: number;
    maxImageSizeMB: number;
  };
  
  // 人脸识别配置
  faceRecognition: {
    confidenceThreshold: number;
    qualityThreshold: number;
    livenessThreshold: number;
  };
}

/**
 * 环境变量验证错误类
 * @class EnvValidationError
 */
class EnvValidationError extends Error {
  constructor(
    message: string,
    public missingVars: string[] = []
  ) {
    super(message);
    this.name = 'EnvValidationError';
  }
}

/**
 * 环境变量配置管理类
 * @class EnvConfigManager
 */
class EnvConfigManager {
  private config: EnvConfig | null = null;
  private isValidated = false;

  /**
   * 获取环境变量值，支持默认值
   * @private
   * @param key 环境变量键名
   * @param defaultValue 默认值
   * @returns string 环境变量值
   */
  private getEnvVar(key: string, defaultValue?: string): string {
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
  private getEnvNumber(key: string, defaultValue?: number): number {
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
  private getEnvBoolean(key: string, defaultValue?: boolean): boolean {
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
   * 验证必需的环境变量
   * @private
   * @param requiredVars 必需的环境变量列表
   * @throws {EnvValidationError} 当有环境变量缺失时抛出错误
   */
  private validateRequiredVars(requiredVars: string[]): void {
    const missingVars: string[] = [];
    
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
   * 加载和验证环境变量配置
   * @param strict 是否启用严格模式（验证所有必需变量）
   * @returns EnvConfig 环境配置对象
   * @throws {EnvValidationError} 当环境变量验证失败时抛出错误
   */
  loadConfig(strict: boolean = false): EnvConfig {
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

      // 在严格模式下验证必需变量
      if (strict) {
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
        }
      };

      this.isValidated = true;
      return this.config;
    } catch (error) {
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
  isServiceConfigured(service: 'openai' | 'baidu' | 'supabase'): boolean {
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
   * @returns object 配置状态报告
   */
  getConfigStatus(): {
    openai: boolean;
    baidu: boolean;
    supabase: boolean;
    overall: boolean;
  } {
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
   * 重置配置缓存
   */
  resetConfig(): void {
    this.config = null;
    this.isValidated = false;
  }

  /**
   * 获取当前配置（如果已加载）
   * @returns EnvConfig | null 当前配置或null
   */
  getCurrentConfig(): EnvConfig | null {
    return this.config;
  }
}

// 创建单例实例
const envConfigManager = new EnvConfigManager();

/**
 * 获取环境配置的便捷函数
 * @param strict 是否启用严格模式
 * @returns EnvConfig 环境配置对象
 */
export function getEnvConfig(strict: boolean = false): EnvConfig {
  return envConfigManager.loadConfig(strict);
}

/**
 * 检查服务是否已配置的便捷函数
 * @param service 服务名称
 * @returns boolean 服务是否已配置
 */
export function isServiceConfigured(service: 'openai' | 'baidu' | 'supabase'): boolean {
  return envConfigManager.isServiceConfigured(service);
}

/**
 * 获取配置状态的便捷函数
 * @returns object 配置状态报告
 */
export function getConfigStatus() {
  return envConfigManager.getConfigStatus();
}

// 导出类型和实例
export { envConfigManager, EnvConfigManager, EnvValidationError };
export type { EnvConfig };