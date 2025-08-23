#!/usr/bin/env node

/**
 * 监控服务设置脚本
 * 用于初始化和配置监控服务
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 加载环境变量
require('dotenv').config({ path: '.env.local' });

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
 * 检查环境变量
 */
function checkEnvironmentVariables() {
  logStep('1', '检查环境变量配置...');
  
  const requiredVars = [
    'MONITORING_ENABLED',
    'MONITORING_PROVIDER'
  ];
  
  const missingVars = [];
  
  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      missingVars.push(varName);
    }
  }
  
  if (missingVars.length > 0) {
    logWarning(`缺少以下环境变量: ${missingVars.join(', ')}`);
    log('请参考 .env.monitoring.example 文件配置环境变量');
    return false;
  }
  
  logSuccess('环境变量检查通过');
  return true;
}

/**
 * 安装监控依赖
 */
function installMonitoringDependencies() {
  logStep('2', '安装监控相关依赖...');
  
  const provider = process.env.MONITORING_PROVIDER;
  const dependencies = [];
  
  switch (provider) {
    case 'sentry':
      dependencies.push('@sentry/node', '@sentry/nextjs');
      break;
    case 'datadog':
      dependencies.push('dd-trace', '@datadog/browser-logs');
      break;
    case 'newrelic':
      dependencies.push('newrelic');
      break;
    case 'custom':
      // 自定义监控不需要额外依赖
      break;
    default:
      logWarning(`未知的监控提供商: ${provider}`);
      return false;
  }
  
  if (dependencies.length > 0) {
    try {
      log(`安装依赖: ${dependencies.join(', ')}`);
      execSync(`npm install ${dependencies.join(' ')}`, { stdio: 'inherit' });
      logSuccess('监控依赖安装完成');
    } catch (error) {
      logError(`依赖安装失败: ${error.message}`);
      return false;
    }
  } else {
    logSuccess('无需安装额外依赖');
  }
  
  return true;
}

/**
 * 创建监控配置文件
 */
function createMonitoringConfig() {
  logStep('3', '创建监控配置文件...');
  
  const configDir = path.join(process.cwd(), 'src', 'config');
  const configFile = path.join(configDir, 'monitoring.config.json');
  
  const config = {
    provider: process.env.MONITORING_PROVIDER,
    enabled: process.env.MONITORING_ENABLED === 'true',
    endpoint: process.env.MONITORING_ENDPOINT,
    apiKey: process.env.MONITORING_API_KEY ? '***' : null,
    environment: process.env.NODE_ENV || 'development',
    service: 'skillup-platform',
    version: process.env.APP_VERSION || '1.0.0',
    createdAt: new Date().toISOString()
  };
  
  try {
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    
    fs.writeFileSync(configFile, JSON.stringify(config, null, 2));
    logSuccess(`监控配置文件已创建: ${configFile}`);
  } catch (error) {
    logError(`创建配置文件失败: ${error.message}`);
    return false;
  }
  
  return true;
}

/**
 * 测试监控连接
 */
async function testMonitoringConnection() {
  logStep('4', '测试监控服务连接...');
  
  if (process.env.MONITORING_ENABLED !== 'true') {
    logWarning('监控服务未启用，跳过连接测试');
    return true;
  }
  
  const endpoint = process.env.MONITORING_ENDPOINT;
  const apiKey = process.env.MONITORING_API_KEY;
  
  if (!endpoint || !apiKey) {
    logWarning('监控端点或API密钥未配置，跳过连接测试');
    return true;
  }
  
  try {
    // 使用内置的 fetch（Node.js 18+）或者跳过测试
    if (typeof fetch === 'undefined') {
      logWarning('当前 Node.js 版本不支持内置 fetch，跳过连接测试');
      return true;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(`${endpoint}/health`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'User-Agent': 'skillup-platform/setup-script'
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    
    if (response.ok) {
      logSuccess('监控服务连接测试成功');
      return true;
    } else {
      logWarning(`监控服务响应异常: ${response.status} ${response.statusText}`);
      logWarning('连接测试失败，但不影响配置设置');
      return true; // 连接失败不阻止设置继续
    }
  } catch (error) {
    logWarning(`监控服务连接测试失败: ${error.message}`);
    logWarning('这在开发环境中是正常的，监控服务可能未运行');
    return true; // 连接失败不阻止设置继续
  }
}

/**
 * 创建监控仪表板
 */
function setupDashboard() {
  logStep('5', '设置监控仪表板...');
  
  const dashboardUrl = process.env.MONITORING_DASHBOARD_URL;
  
  if (!dashboardUrl) {
    logWarning('未配置监控仪表板URL');
    return true;
  }
  
  log(`监控仪表板地址: ${dashboardUrl}`);
  log('请手动导入 src/config/monitoring-dashboard.json 到您的监控系统');
  
  logSuccess('监控仪表板配置完成');
  return true;
}

/**
 * 生成监控报告
 */
function generateSetupReport() {
  logStep('6', '生成设置报告...');
  
  const report = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    provider: process.env.MONITORING_PROVIDER,
    enabled: process.env.MONITORING_ENABLED === 'true',
    endpoint: process.env.MONITORING_ENDPOINT,
    dashboardUrl: process.env.MONITORING_DASHBOARD_URL,
    features: {
      errorTracking: true,
      performanceMonitoring: true,
      alerting: process.env.ALERTING_ENABLED === 'true',
      logging: process.env.LOG_TO_MONITORING === 'true'
    }
  };
  
  const reportFile = path.join(process.cwd(), 'monitoring-setup-report.json');
  
  try {
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    logSuccess(`设置报告已生成: ${reportFile}`);
  } catch (error) {
    logError(`生成报告失败: ${error.message}`);
    return false;
  }
  
  return true;
}

/**
 * 主函数
 */
async function main() {
  log('🚀 开始设置 SkillUp Platform 监控服务...', 'bright');
  log('');
  
  const steps = [
    checkEnvironmentVariables,
    installMonitoringDependencies,
    createMonitoringConfig,
    testMonitoringConnection,
    setupDashboard,
    generateSetupReport
  ];
  
  let success = true;
  
  for (const step of steps) {
    try {
      const result = await step();
      if (!result) {
        success = false;
        break;
      }
    } catch (error) {
      logError(`步骤执行失败: ${error.message}`);
      success = false;
      break;
    }
    log('');
  }
  
  log('');
  if (success) {
    logSuccess('✨ 监控服务设置完成！');
    log('');
    log('下一步操作:', 'bright');
    log('1. 检查生成的配置文件');
    log('2. 访问监控仪表板验证数据');
    log('3. 配置告警规则');
    log('4. 测试错误上报功能');
  } else {
    logError('💥 监控服务设置失败！');
    log('');
    log('请检查:', 'bright');
    log('1. 环境变量配置是否正确');
    log('2. 网络连接是否正常');
    log('3. 监控服务是否可用');
    log('4. API 密钥是否有效');
  }
  
  process.exit(success ? 0 : 1);
}

// 运行主函数
if (require.main === module) {
  main().catch(error => {
    logError(`未处理的错误: ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  checkEnvironmentVariables,
  installMonitoringDependencies,
  createMonitoringConfig,
  testMonitoringConnection,
  setupDashboard,
  generateSetupReport
};
