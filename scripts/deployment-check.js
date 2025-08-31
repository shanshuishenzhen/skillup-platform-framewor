/**
 * 部署前检查脚本
 * 验证项目是否准备好进行生产部署
 * 
 * 检查项目包括：
 * - 构建状态
 * - 环境变量配置
 * - 依赖项完整性
 * - 安全配置
 * - 性能优化设置
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 颜色输出
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
 * 日志输出函数
 * @param {string} level - 日志级别
 * @param {string} message - 日志消息
 */
function log(level, message) {
  const timestamp = new Date().toISOString();
  const colorMap = {
    info: colors.blue,
    success: colors.green,
    warning: colors.yellow,
    error: colors.red
  };
  
  console.log(`${colorMap[level] || colors.reset}[${timestamp}] ${level.toUpperCase()}: ${message}${colors.reset}`);
}

/**
 * 检查文件是否存在
 * @param {string} filePath - 文件路径
 * @returns {boolean} 文件是否存在
 */
function fileExists(filePath) {
  return fs.existsSync(path.resolve(filePath));
}

/**
 * 检查必要的配置文件
 * @returns {boolean} 检查是否通过
 */
function checkConfigFiles() {
  log('info', '检查配置文件...');
  
  const requiredFiles = [
    'package.json',
    'next.config.js',
    'vercel.json',
    '.env.example'
  ];
  
  let allFilesExist = true;
  
  for (const file of requiredFiles) {
    if (fileExists(file)) {
      log('success', `✓ ${file} 存在`);
    } else {
      log('error', `✗ ${file} 缺失`);
      allFilesExist = false;
    }
  }
  
  return allFilesExist;
}

/**
 * 检查环境变量配置
 * @returns {boolean} 检查是否通过
 */
function checkEnvironmentVariables() {
  log('info', '检查环境变量配置...');
  
  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'NEXTAUTH_SECRET',
    'SESSION_SECRET'
  ];
  
  let allVarsConfigured = true;
  
  // 检查 .env.production 文件
  if (fileExists('.env.production')) {
    log('success', '✓ .env.production 文件存在');
    
    const envContent = fs.readFileSync('.env.production', 'utf8');
    
    for (const envVar of requiredEnvVars) {
      if (envContent.includes(`${envVar}=`) && !envContent.includes(`${envVar}=your_`)) {
        log('success', `✓ ${envVar} 已配置`);
      } else {
        log('warning', `⚠ ${envVar} 需要在生产环境中配置`);
      }
    }
  } else {
    log('warning', '⚠ .env.production 文件不存在，请确保在Vercel中配置环境变量');
  }
  
  return allVarsConfigured;
}

/**
 * 检查依赖项
 * @returns {boolean} 检查是否通过
 */
function checkDependencies() {
  log('info', '检查依赖项...');
  
  try {
    // 检查 node_modules 是否存在
    if (!fileExists('node_modules')) {
      log('error', '✗ node_modules 不存在，请运行 npm install');
      return false;
    }
    
    // 检查关键依赖
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const criticalDeps = ['next', 'react', 'react-dom'];
    
    for (const dep of criticalDeps) {
      if (packageJson.dependencies[dep]) {
        log('success', `✓ ${dep} 已安装`);
      } else {
        log('error', `✗ ${dep} 缺失`);
        return false;
      }
    }
    
    return true;
  } catch (error) {
    log('error', `依赖检查失败: ${error.message}`);
    return false;
  }
}

/**
 * 检查构建状态
 * @returns {boolean} 检查是否通过
 */
function checkBuildStatus() {
  log('info', '检查构建状态...');
  
  try {
    log('info', '运行构建测试...');
    execSync('npm run build', { stdio: 'pipe' });
    log('success', '✓ 构建成功');
    return true;
  } catch (error) {
    log('error', '✗ 构建失败');
    log('error', error.message);
    return false;
  }
}

/**
 * 检查安全配置
 * @returns {boolean} 检查是否通过
 */
function checkSecurityConfig() {
  log('info', '检查安全配置...');
  
  try {
    const vercelConfig = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
    
    // 检查安全头
    if (vercelConfig.headers && vercelConfig.headers.length > 0) {
      log('success', '✓ 安全头已配置');
    } else {
      log('warning', '⚠ 建议配置安全头');
    }
    
    // 检查HTTPS重定向
    if (vercelConfig.redirects) {
      log('success', '✓ 重定向规则已配置');
    }
    
    return true;
  } catch (error) {
    log('warning', '⚠ 无法检查安全配置');
    return true;
  }
}

/**
 * 主检查函数
 */
function runDeploymentCheck() {
  log('info', '开始部署前检查...');
  console.log('\n' + '='.repeat(50));
  console.log('🚀 部署前检查');
  console.log('='.repeat(50) + '\n');
  
  const checks = [
    { name: '配置文件检查', fn: checkConfigFiles },
    { name: '环境变量检查', fn: checkEnvironmentVariables },
    { name: '依赖项检查', fn: checkDependencies },
    { name: '构建状态检查', fn: checkBuildStatus },
    { name: '安全配置检查', fn: checkSecurityConfig }
  ];
  
  let allChecksPassed = true;
  
  for (const check of checks) {
    console.log(`\n📋 ${check.name}`);
    console.log('-'.repeat(30));
    
    const result = check.fn();
    if (!result) {
      allChecksPassed = false;
    }
  }
  
  console.log('\n' + '='.repeat(50));
  
  if (allChecksPassed) {
    log('success', '🎉 所有检查通过！项目已准备好部署');
    console.log('\n📝 部署建议：');
    console.log('1. 确保在Vercel中配置了所有必要的环境变量');
    console.log('2. 检查域名配置和DNS设置');
    console.log('3. 配置监控和日志记录');
    console.log('4. 设置备份和恢复策略');
    console.log('\n🚀 运行 npm run deploy:vercel 开始部署');
    process.exit(0);
  } else {
    log('error', '❌ 部分检查未通过，请修复问题后重试');
    process.exit(1);
  }
}

// 运行检查
if (require.main === module) {
  runDeploymentCheck();
}

module.exports = {
  runDeploymentCheck,
  checkConfigFiles,
  checkEnvironmentVariables,
  checkDependencies,
  checkBuildStatus,
  checkSecurityConfig
};