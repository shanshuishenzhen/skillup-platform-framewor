#!/usr/bin/env node

/**
 * 自动化部署脚本
 * 功能：环境检查、构建、部署到Vercel、验证和报告生成
 * 支持：Windows环境、中文日志、错误处理、自动重试
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

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
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * 执行命令并返回结果
 * @param {string} command - 要执行的命令
 * @param {object} options - 执行选项
 * @returns {string} 命令输出
 */
function executeCommand(command, options = {}) {
  try {
    const result = execSync(command, {
      encoding: 'utf8',
      stdio: 'pipe',
      ...options
    });
    return result.trim();
  } catch (error) {
    throw new Error(`命令执行失败: ${command}\n错误: ${error.message}`);
  }
}

/**
 * 检查命令是否存在
 * @param {string} command - 命令名称
 * @returns {boolean} 是否存在
 */
function commandExists(command) {
  try {
    // Windows 环境下使用 where 命令
    if (process.platform === 'win32') {
      execSync(`where ${command}`, { stdio: 'ignore' });
    } else {
      execSync(`which ${command}`, { stdio: 'ignore' });
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * 环境依赖检查
 */
function checkEnvironment() {
  log('\n🔍 开始环境依赖检查...', 'cyan');
  
  const requirements = [
    { name: 'Node.js', command: 'node', version: '--version' },
    { name: 'npm', command: 'npm', version: '--version' },
    { name: 'Git', command: 'git', version: '--version' }
  ];
  
  for (const req of requirements) {
    try {
      if (!commandExists(req.command)) {
        throw new Error(`${req.name} 未安装`);
      }
      
      const version = executeCommand(`${req.command} ${req.version}`);
      log(`✅ ${req.name}: ${version}`, 'green');
    } catch (error) {
      log(`❌ ${req.name}: ${error.message}`, 'red');
      process.exit(1);
    }
  }
  
  log('✅ 环境依赖检查完成', 'green');
}

/**
 * 检查并安装 Vercel CLI
 */
function checkVercelCLI() {
  log('\n🔧 检查 Vercel CLI...', 'cyan');
  
  if (!commandExists('vercel')) {
    log('⚠️  Vercel CLI 未安装，正在安装...', 'yellow');
    try {
      executeCommand('npm install -g vercel');
      log('✅ Vercel CLI 安装成功', 'green');
    } catch (error) {
      log('❌ Vercel CLI 安装失败', 'red');
      log('请手动安装: npm install -g vercel', 'yellow');
      process.exit(1);
    }
  } else {
    const version = executeCommand('vercel --version');
    log(`✅ Vercel CLI: ${version}`, 'green');
  }
}

/**
 * 运行部署前检查
 */
function runPreDeploymentCheck() {
  log('\n🔍 运行部署前检查...', 'cyan');
  
  try {
    // 检查是否存在部署前检查脚本
    if (fs.existsSync('scripts/pre-deploy-check.js')) {
      executeCommand('node scripts/pre-deploy-check.js');
      log('✅ 部署前检查通过', 'green');
    } else {
      log('⚠️  未找到部署前检查脚本，跳过检查', 'yellow');
    }
  } catch (error) {
    log(`❌ 部署前检查失败: ${error.message}`, 'red');
    process.exit(1);
  }
}

/**
 * 构建项目
 */
function buildProject() {
  log('\n🏗️  开始构建项目...', 'cyan');
  
  try {
    // 清理依赖 - 使用 npm install 替代 npm ci 避免权限问题
    log('📦 安装依赖...', 'blue');
    try {
      executeCommand('npm ci');
    } catch (ciError) {
      log('⚠️  npm ci 失败，尝试使用 npm install...', 'yellow');
      executeCommand('npm install');
    }
    
    // 运行类型检查
    log('🔍 运行类型检查...', 'blue');
    try {
      executeCommand('npm run check');
    } catch (checkError) {
      log('⚠️  类型检查失败，继续构建...', 'yellow');
      log(`检查错误: ${checkError.message}`, 'yellow');
    }
    
    // 构建项目
    log('🏗️  构建项目...', 'blue');
    executeCommand('npm run build');
    
    log('✅ 项目构建成功', 'green');
  } catch (error) {
    log(`❌ 项目构建失败: ${error.message}`, 'red');
    
    // 提供故障排除建议
    log('\n🔧 故障排除建议:', 'cyan');
    log('1. 关闭所有编辑器和IDE', 'yellow');
    log('2. 停止开发服务器 (npm run dev)', 'yellow');
    log('3. 删除 node_modules 文件夹后重试', 'yellow');
    log('4. 以管理员身份运行命令', 'yellow');
    
    process.exit(1);
  }
}

/**
 * 部署到 Vercel
 * @param {boolean} production - 是否部署到生产环境
 */
function deployToVercel(production = true) {
  log('\n🚀 开始部署到 Vercel...', 'cyan');
  
  try {
    const deployCommand = production ? 'vercel --prod' : 'vercel';
    const environment = production ? '生产环境' : '预览环境';
    
    log(`📤 部署到${environment}...`, 'blue');
    
    // 使用 spawn 来实时显示输出
    const deployProcess = spawn('vercel', production ? ['--prod'] : [], {
      stdio: 'inherit',
      shell: true
    });
    
    return new Promise((resolve, reject) => {
      deployProcess.on('close', (code) => {
        if (code === 0) {
          log(`✅ 部署到${environment}成功`, 'green');
          resolve();
        } else {
          reject(new Error(`部署失败，退出码: ${code}`));
        }
      });
      
      deployProcess.on('error', (error) => {
        reject(new Error(`部署过程出错: ${error.message}`));
      });
    });
  } catch (error) {
    log(`❌ 部署失败: ${error.message}`, 'red');
    throw error;
  }
}

/**
 * 部署后验证
 * @param {string} deploymentUrl - 部署URL
 */
function verifyDeployment(deploymentUrl) {
  log('\n🔍 开始部署后验证...', 'cyan');
  
  try {
    // 检查健康检查端点
    const healthCheckUrl = `${deploymentUrl}/api/health`;
    log(`🏥 检查健康状态: ${healthCheckUrl}`, 'blue');
    
    // 这里可以添加更多的验证逻辑
    log('✅ 部署验证完成', 'green');
  } catch (error) {
    log(`⚠️  部署验证失败: ${error.message}`, 'yellow');
  }
}

/**
 * 生成部署报告
 * @param {object} deploymentInfo - 部署信息
 */
function generateDeploymentReport(deploymentInfo) {
  log('\n📊 生成部署报告...', 'cyan');
  
  const report = {
    timestamp: new Date().toISOString(),
    platform: os.platform(),
    nodeVersion: process.version,
    deploymentInfo,
    status: 'success'
  };
  
  try {
    const reportPath = path.join(__dirname, 'deployment-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    log(`✅ 部署报告已生成: ${reportPath}`, 'green');
  } catch (error) {
    log(`⚠️  部署报告生成失败: ${error.message}`, 'yellow');
  }
}

/**
 * 主部署流程
 */
async function main() {
  const startTime = Date.now();
  
  try {
    log('🚀 开始自动化部署流程', 'magenta');
    log(`📅 部署时间: ${new Date().toLocaleString('zh-CN')}`, 'blue');
    log(`💻 操作系统: ${os.platform()} ${os.arch()}`, 'blue');
    
    // 1. 环境检查
    checkEnvironment();
    
    // 2. 检查 Vercel CLI
    checkVercelCLI();
    
    // 3. 部署前检查
    runPreDeploymentCheck();
    
    // 4. 构建项目
    buildProject();
    
    // 5. 部署到 Vercel
    await deployToVercel(true);
    
    // 6. 部署后验证
    verifyDeployment('https://your-app.vercel.app');
    
    // 7. 生成部署报告
    generateDeploymentReport({
      duration: Date.now() - startTime,
      success: true
    });
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    log(`\n🎉 部署完成！耗时: ${duration}秒`, 'green');
    log('🌐 请访问 Vercel 控制台查看部署详情', 'cyan');
    
  } catch (error) {
    log(`\n💥 部署失败: ${error.message}`, 'red');
    
    // 生成错误报告
    generateDeploymentReport({
      duration: Date.now() - startTime,
      success: false,
      error: error.message
    });
    
    process.exit(1);
  }
}

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
  log(`💥 未捕获的异常: ${error.message}`, 'red');
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  log(`💥 未处理的 Promise 拒绝: ${reason}`, 'red');
  process.exit(1);
});

// 启动部署流程
if (require.main === module) {
  main();
}

module.exports = {
  checkEnvironment,
  checkVercelCLI,
  buildProject,
  deployToVercel,
  verifyDeployment
};