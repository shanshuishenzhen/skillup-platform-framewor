#!/usr/bin/env node

/**
 * 部署状态监控和错误处理脚本
 * 功能：实时监控部署状态、错误处理、自动重试、回滚选项
 * 支持：Windows环境、中文日志、详细错误分析
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// 颜色输出工具
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

/**
 * 彩色日志输出
 * @param {string} message - 日志消息
 * @param {string} color - 颜色
 */
function log(message, color = 'reset') {
  const timestamp = new Date().toLocaleString('zh-CN');
  console.log(`${colors[color]}[${timestamp}] ${message}${colors.reset}`);
}

/**
 * 执行命令并返回结果
 * @param {string} command - 要执行的命令
 * @param {object} options - 执行选项
 * @returns {Promise<string>} 命令输出
 */
function executeCommand(command, options = {}) {
  return new Promise((resolve, reject) => {
    try {
      const result = execSync(command, {
        encoding: 'utf8',
        stdio: 'pipe',
        ...options
      });
      resolve(result.trim());
    } catch (error) {
      reject(new Error(`命令执行失败: ${command}\n错误: ${error.message}`));
    }
  });
}

/**
 * HTTP 请求工具
 * @param {string} url - 请求URL
 * @param {object} options - 请求选项
 * @returns {Promise<object>} 响应结果
 */
function httpRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https:') ? https : http;
    const timeout = options.timeout || 10000;
    
    const req = protocol.get(url, {
      timeout,
      ...options
    }, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: data
        });
      });
    });
    
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('请求超时'));
    });
    
    req.on('error', (error) => {
      reject(error);
    });
  });
}

/**
 * 获取 Vercel 部署状态
 * @returns {Promise<Array>} 部署列表
 */
async function getVercelDeployments() {
  try {
    const result = await executeCommand('vercel ls --json');
    return JSON.parse(result);
  } catch (error) {
    log(`获取 Vercel 部署状态失败: ${error.message}`, 'red');
    return [];
  }
}

/**
 * 检查部署健康状态
 * @param {string} url - 部署URL
 * @returns {Promise<object>} 健康检查结果
 */
async function checkDeploymentHealth(url) {
  const healthChecks = [
    { name: '主页', path: '/' },
    { name: '健康检查', path: '/api/health' },
    { name: 'API状态', path: '/api/status' }
  ];
  
  const results = [];
  
  for (const check of healthChecks) {
    try {
      const checkUrl = `${url}${check.path}`;
      const response = await httpRequest(checkUrl, { timeout: 5000 });
      
      results.push({
        name: check.name,
        url: checkUrl,
        status: response.statusCode,
        success: response.statusCode >= 200 && response.statusCode < 400,
        responseTime: Date.now()
      });
      
      log(`✅ ${check.name}: ${response.statusCode}`, 'green');
    } catch (error) {
      results.push({
        name: check.name,
        url: `${url}${check.path}`,
        status: 'ERROR',
        success: false,
        error: error.message
      });
      
      log(`❌ ${check.name}: ${error.message}`, 'red');
    }
  }
  
  return results;
}

/**
 * 监控部署状态
 * @param {object} options - 监控选项
 */
async function monitorDeployment(options = {}) {
  const {
    interval = 30000, // 30秒检查一次
    maxRetries = 3,
    autoRecover = false
  } = options;
  
  log('🔍 开始部署状态监控...', 'cyan');
  
  let retryCount = 0;
  let lastStatus = null;
  
  const monitor = async () => {
    try {
      // 获取最新部署
      const deployments = await getVercelDeployments();
      
      if (deployments.length === 0) {
        log('⚠️  未找到任何部署', 'yellow');
        return;
      }
      
      const latestDeployment = deployments[0];
      const currentStatus = latestDeployment.state;
      
      // 状态变化检测
      if (lastStatus !== currentStatus) {
        log(`📊 部署状态变化: ${lastStatus || '未知'} → ${currentStatus}`, 'blue');
        lastStatus = currentStatus;
      }
      
      // 根据状态执行相应操作
      switch (currentStatus) {
        case 'READY':
          log('✅ 部署成功运行', 'green');
          
          // 执行健康检查
          if (latestDeployment.url) {
            log('🏥 执行健康检查...', 'cyan');
            const healthResults = await checkDeploymentHealth(`https://${latestDeployment.url}`);
            
            const failedChecks = healthResults.filter(r => !r.success);
            if (failedChecks.length > 0) {
              log(`⚠️  ${failedChecks.length} 个健康检查失败`, 'yellow');
              
              if (autoRecover && retryCount < maxRetries) {
                log('🔄 尝试自动恢复...', 'yellow');
                await attemptAutoRecover();
                retryCount++;
              }
            } else {
              log('✅ 所有健康检查通过', 'green');
              retryCount = 0; // 重置重试计数
            }
          }
          break;
          
        case 'ERROR':
          log('❌ 部署失败', 'red');
          
          if (autoRecover && retryCount < maxRetries) {
            log('🔄 尝试自动重新部署...', 'yellow');
            await attemptAutoRecover();
            retryCount++;
          } else {
            log('💥 达到最大重试次数，需要手动干预', 'red');
          }
          break;
          
        case 'BUILDING':
          log('🏗️  正在构建...', 'blue');
          break;
          
        case 'QUEUED':
          log('⏳ 排队等待...', 'yellow');
          break;
          
        default:
          log(`📊 当前状态: ${currentStatus}`, 'blue');
      }
      
      // 生成监控报告
      await generateMonitoringReport({
        deployment: latestDeployment,
        timestamp: new Date().toISOString(),
        retryCount
      });
      
    } catch (error) {
      log(`监控过程出错: ${error.message}`, 'red');
    }
  };
  
  // 立即执行一次
  await monitor();
  
  // 设置定时监控
  const intervalId = setInterval(monitor, interval);
  
  // 优雅退出处理
  process.on('SIGINT', () => {
    log('\n🛑 停止部署监控...', 'yellow');
    clearInterval(intervalId);
    process.exit(0);
  });
  
  log(`🔄 监控已启动，每 ${interval / 1000} 秒检查一次`, 'cyan');
  log('按 Ctrl+C 停止监控', 'yellow');
}

/**
 * 尝试自动恢复
 */
async function attemptAutoRecover() {
  try {
    log('🔧 执行自动恢复流程...', 'cyan');
    
    // 1. 重新部署
    await executeCommand('vercel --prod');
    log('✅ 重新部署完成', 'green');
    
    // 2. 等待部署完成
    await new Promise(resolve => setTimeout(resolve, 30000));
    
    log('✅ 自动恢复完成', 'green');
  } catch (error) {
    log(`自动恢复失败: ${error.message}`, 'red');
  }
}

/**
 * 生成监控报告
 * @param {object} data - 监控数据
 */
async function generateMonitoringReport(data) {
  try {
    const reportPath = path.join(__dirname, '..', 'monitoring-report.json');
    
    let reports = [];
    if (fs.existsSync(reportPath)) {
      const existingData = fs.readFileSync(reportPath, 'utf8');
      reports = JSON.parse(existingData);
    }
    
    reports.push(data);
    
    // 只保留最近100条记录
    if (reports.length > 100) {
      reports = reports.slice(-100);
    }
    
    fs.writeFileSync(reportPath, JSON.stringify(reports, null, 2));
  } catch (error) {
    log(`生成监控报告失败: ${error.message}`, 'yellow');
  }
}

/**
 * 部署回滚
 * @param {string} deploymentId - 要回滚到的部署ID
 */
async function rollbackDeployment(deploymentId) {
  try {
    log(`🔄 开始回滚到部署: ${deploymentId}`, 'cyan');
    
    // 获取部署列表
    const deployments = await getVercelDeployments();
    const targetDeployment = deployments.find(d => d.uid === deploymentId);
    
    if (!targetDeployment) {
      throw new Error(`未找到部署: ${deploymentId}`);
    }
    
    // 执行回滚
    await executeCommand(`vercel promote ${deploymentId}`);
    
    log('✅ 回滚完成', 'green');
    
    // 验证回滚
    if (targetDeployment.url) {
      log('🔍 验证回滚结果...', 'cyan');
      await checkDeploymentHealth(`https://${targetDeployment.url}`);
    }
    
  } catch (error) {
    log(`回滚失败: ${error.message}`, 'red');
    throw error;
  }
}

/**
 * 主函数
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  switch (command) {
    case 'monitor':
      const options = {
        interval: parseInt(args[1]) || 30000,
        maxRetries: parseInt(args[2]) || 3,
        autoRecover: args.includes('--auto-recover')
      };
      await monitorDeployment(options);
      break;
      
    case 'status':
      log('📊 获取部署状态...', 'cyan');
      const deployments = await getVercelDeployments();
      console.table(deployments.map(d => ({
        URL: d.url,
        状态: d.state,
        创建时间: new Date(d.createdAt).toLocaleString('zh-CN')
      })));
      break;
      
    case 'health':
      const url = args[1];
      if (!url) {
        log('❌ 请提供要检查的URL', 'red');
        process.exit(1);
      }
      log(`🏥 检查 ${url} 的健康状态...`, 'cyan');
      await checkDeploymentHealth(url);
      break;
      
    case 'rollback':
      const deploymentId = args[1];
      if (!deploymentId) {
        log('❌ 请提供部署ID', 'red');
        process.exit(1);
      }
      await rollbackDeployment(deploymentId);
      break;
      
    default:
      log('使用方法:', 'cyan');
      log('  node deployment-monitor.js monitor [间隔ms] [最大重试次数] [--auto-recover]', 'yellow');
      log('  node deployment-monitor.js status', 'yellow');
      log('  node deployment-monitor.js health <URL>', 'yellow');
      log('  node deployment-monitor.js rollback <部署ID>', 'yellow');
  }
}

// 启动监控
if (require.main === module) {
  main().catch(error => {
    log(`监控脚本出错: ${error.message}`, 'red');
    process.exit(1);
  });
}

module.exports = {
  monitorDeployment,
  checkDeploymentHealth,
  rollbackDeployment,
  getVercelDeployments
};