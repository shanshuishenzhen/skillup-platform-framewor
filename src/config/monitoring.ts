/**
 * 监控服务配置
 * 配置错误上报、性能监控和日志收集
 */

import { MonitoringConfig } from '@/utils/errorHandler';

/**
 * 监控服务提供商枚举
 */
export enum MonitoringProvider {
  SENTRY = 'sentry',
  DATADOG = 'datadog',
  NEW_RELIC = 'newrelic',
  CUSTOM = 'custom'
}

/**
 * 监控环境配置
 */
export interface MonitoringEnvironmentConfig {
  provider: MonitoringProvider;
  enabled: boolean;
  config: MonitoringConfig;
  dashboardUrl?: string;
  alertingEnabled: boolean;
  samplingRate: number;
}

/**
 * 获取当前环境的监控配置
 */
export function getMonitoringConfig(): MonitoringEnvironmentConfig {
  const environment = process.env.NODE_ENV || 'development';
  const provider = (process.env.MONITORING_PROVIDER as MonitoringProvider) || MonitoringProvider.CUSTOM;
  
  const baseConfig: MonitoringConfig = {
    enabled: process.env.MONITORING_ENABLED === 'true',
    endpoint: process.env.MONITORING_ENDPOINT,
    apiKey: process.env.MONITORING_API_KEY,
    environment,
    service: 'skillup-platform',
    version: process.env.APP_VERSION || '1.0.0',
    batchSize: parseInt(process.env.MONITORING_BATCH_SIZE || '10'),
    flushInterval: parseInt(process.env.MONITORING_FLUSH_INTERVAL || '5000'),
    retryAttempts: parseInt(process.env.MONITORING_RETRY_ATTEMPTS || '3'),
    timeout: parseInt(process.env.MONITORING_TIMEOUT || '10000')
  };

  switch (environment) {
    case 'production':
      return {
        provider,
        enabled: true,
        config: {
          ...baseConfig,
          enabled: true,
          endpoint: process.env.MONITORING_ENDPOINT || 'https://api.monitoring.skillup.com/v1/events',
          apiKey: process.env.MONITORING_API_KEY || '',
          batchSize: 20,
          flushInterval: 3000,
          retryAttempts: 5
        },
        dashboardUrl: process.env.MONITORING_DASHBOARD_URL || 'https://dashboard.monitoring.skillup.com',
        alertingEnabled: true,
        samplingRate: 1.0
      };

    case 'staging':
      return {
        provider,
        enabled: true,
        config: {
          ...baseConfig,
          enabled: true,
          endpoint: process.env.MONITORING_ENDPOINT || 'https://staging-api.monitoring.skillup.com/v1/events',
          apiKey: process.env.MONITORING_API_KEY || '',
          batchSize: 15,
          flushInterval: 5000,
          retryAttempts: 3
        },
        dashboardUrl: process.env.MONITORING_DASHBOARD_URL || 'https://staging-dashboard.monitoring.skillup.com',
        alertingEnabled: true,
        samplingRate: 0.5
      };

    case 'development':
      return {
        provider,
        enabled: process.env.MONITORING_ENABLED === 'true',
        config: {
          ...baseConfig,
          enabled: process.env.MONITORING_ENABLED === 'true',
          endpoint: process.env.MONITORING_ENDPOINT || 'http://localhost:8080/api/monitoring',
          apiKey: process.env.MONITORING_API_KEY || 'dev-api-key',
          batchSize: 5,
          flushInterval: 10000,
          retryAttempts: 1
        },
        dashboardUrl: process.env.MONITORING_DASHBOARD_URL || 'http://localhost:8080/dashboard',
        alertingEnabled: false,
        samplingRate: 0.1
      };

    case 'test':
      return {
        provider,
        enabled: false,
        config: {
          ...baseConfig,
          enabled: false,
          endpoint: 'http://localhost:8081/api/monitoring',
          apiKey: 'test-api-key',
          batchSize: 1,
          flushInterval: 1000,
          retryAttempts: 1
        },
        dashboardUrl: 'http://localhost:8081/dashboard',
        alertingEnabled: false,
        samplingRate: 0.0
      };

    default:
      return {
        provider: MonitoringProvider.CUSTOM,
        enabled: false,
        config: baseConfig,
        alertingEnabled: false,
        samplingRate: 0.0
      };
  }
}

/**
 * Sentry 配置
 */
export function getSentryConfig() {
  return {
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    release: process.env.APP_VERSION,
    tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'),
    profilesSampleRate: parseFloat(process.env.SENTRY_PROFILES_SAMPLE_RATE || '0.1'),
    beforeSend: (event: Record<string, unknown>) => {
      // 过滤敏感信息
      if (event.request?.headers) {
        delete event.request.headers.authorization;
        delete event.request.headers.cookie;
      }
      return event;
    }
  };
}

/**
 * DataDog 配置
 */
export function getDataDogConfig() {
  return {
    apiKey: process.env.DATADOG_API_KEY,
    appKey: process.env.DATADOG_APP_KEY,
    site: process.env.DATADOG_SITE || 'datadoghq.com',
    service: 'skillup-platform',
    env: process.env.NODE_ENV,
    version: process.env.APP_VERSION,
    logLevel: process.env.DATADOG_LOG_LEVEL || 'info'
  };
}

/**
 * New Relic 配置
 */
export function getNewRelicConfig() {
  return {
    licenseKey: process.env.NEW_RELIC_LICENSE_KEY,
    appName: process.env.NEW_RELIC_APP_NAME || 'SkillUp Platform',
    environment: process.env.NODE_ENV,
    distributedTracing: {
      enabled: true
    },
    logging: {
      enabled: true,
      level: process.env.NEW_RELIC_LOG_LEVEL || 'info'
    }
  };
}

/**
 * 验证监控配置
 */
export function validateMonitoringConfig(config: MonitoringEnvironmentConfig): boolean {
  if (!config.enabled) {
    return true; // 如果监控未启用，配置有效
  }

  // 检查必需的配置项
  if (!config.config.endpoint) {
    console.error('监控配置错误: 缺少 endpoint');
    return false;
  }

  if (!config.config.apiKey) {
    console.error('监控配置错误: 缺少 apiKey');
    return false;
  }

  if (!config.config.service) {
    console.error('监控配置错误: 缺少 service');
    return false;
  }

  return true;
}

/**
 * 初始化监控服务
 */
export async function initializeMonitoring(): Promise<boolean> {
  const config = getMonitoringConfig();
  
  if (!validateMonitoringConfig(config)) {
    return false;
  }

  if (!config.enabled) {
    console.log('监控服务已禁用');
    return true;
  }

  try {
    // 根据提供商初始化相应的监控服务
    switch (config.provider) {
      case MonitoringProvider.SENTRY:
        await initializeSentry();
        break;
      case MonitoringProvider.DATADOG:
        await initializeDataDog();
        break;
      case MonitoringProvider.NEW_RELIC:
        await initializeNewRelic();
        break;
      case MonitoringProvider.CUSTOM:
        await initializeCustomMonitoring();
        break;
    }

    console.log(`✅ 监控服务已初始化 (${config.provider})`);
    return true;
  } catch (error) {
    console.error('❌ 监控服务初始化失败:', error);
    return false;
  }
}

/**
 * 初始化 Sentry
 */
async function initializeSentry(): Promise<void> {
  // 这里会集成 Sentry SDK
  console.log('初始化 Sentry 监控...');
}

/**
 * 初始化 DataDog
 */
async function initializeDataDog(): Promise<void> {
  // 这里会集成 DataDog SDK
  console.log('初始化 DataDog 监控...');
}

/**
 * 初始化 New Relic
 */
async function initializeNewRelic(): Promise<void> {
  // 这里会集成 New Relic SDK
  console.log('初始化 New Relic 监控...');
}

/**
 * 初始化自定义监控
 */
async function initializeCustomMonitoring(): Promise<void> {
  console.log('初始化自定义监控服务...');
  
  // 测试监控端点连接
  const config = getMonitoringConfig();
  if (config.config.endpoint) {
    try {
      const response = await fetch(`${config.config.endpoint}/health`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${config.config.apiKey}`,
          'User-Agent': `${config.config.service}/${config.config.version}`
        },
        signal: AbortSignal.timeout(5000)
      });
      
      if (!response.ok) {
        throw new Error(`监控服务健康检查失败: ${response.status}`);
      }
      
      console.log('✅ 监控服务连接正常');
    } catch (error) {
      console.warn('⚠️ 监控服务连接测试失败:', error);
    }
  }
}

// 导出配置
export const monitoringConfig = getMonitoringConfig();
