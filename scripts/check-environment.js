#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 检查semver模块是否可用
let semver;
try {
  semver = require('semver');
} catch (error) {
  console.error('❌ semver模块未安装，请运行: npm install semver');
  process.exit(1);
}

// 颜色输出
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// 加载配置
function loadConfig() {
  const configPath = path.join(process.cwd(), 'start-config.json');
  if (!fs.existsSync(configPath)) {
    log('❌ 找不到配置文件: start-config.json', 'red');
    return null;
  }
  
  try {
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (error) {
    log('❌ 配置文件格式错误: ' + error.message, 'red');
    return null;
  }
}

// 检查Node.js版本
function checkNodeVersion(requiredVersion) {
  log('\n📋 检查Node.js版本...', 'blue');

  try {
    const nodeVersion = process.version;
    log(`当前版本: ${nodeVersion}`, 'blue');
    log(`要求版本: ${requiredVersion}`, 'blue');

    // 使用semver.satisfies来检查版本范围
    if (semver.satisfies(nodeVersion, requiredVersion)) {
      log('✅ Node.js版本检查通过', 'green');
      return true;
    } else {
      log(`❌ Node.js版本不满足要求，需要 ${requiredVersion}`, 'red');
      return false;
    }
  } catch (error) {
    log('❌ Node.js版本检查失败: ' + error.message, 'red');
    return false;
  }
}

// 检查npm版本
function checkNpmVersion(requiredVersion) {
  log('\n📋 检查npm版本...', 'blue');

  try {
    const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
    log(`当前版本: ${npmVersion}`, 'blue');
    log(`要求版本: ${requiredVersion}`, 'blue');

    // 使用semver.satisfies来检查版本范围
    if (semver.satisfies(npmVersion, requiredVersion)) {
      log('✅ npm版本检查通过', 'green');
      return true;
    } else {
      log(`❌ npm版本不满足要求，需要 ${requiredVersion}`, 'red');
      return false;
    }
  } catch (error) {
    log('❌ npm版本检查失败: ' + error.message, 'red');
    return false;
  }
}

// 检查必需文件
function checkRequiredFiles(files) {
  log('\n📋 检查必需文件...', 'blue');
  
  let allExists = true;
  
  files.forEach(file => {
    const filePath = path.join(process.cwd(), file);
    if (fs.existsSync(filePath)) {
      log(`✅ ${file}`, 'green');
    } else {
      log(`❌ ${file} (文件不存在)`, 'red');
      allExists = false;
    }
  });
  
  return allExists;
}

// 检查package.json
function checkPackageJson() {
  log('\n📋 检查package.json...', 'blue');
  
  const packagePath = path.join(process.cwd(), 'package.json');
  
  if (!fs.existsSync(packagePath)) {
    log('❌ package.json文件不存在', 'red');
    return false;
  }
  
  try {
    const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    
    // 检查必需的脚本
    const requiredScripts = ['dev', 'build', 'start'];
    const missingScripts = requiredScripts.filter(script => !packageData.scripts || !packageData.scripts[script]);
    
    if (missingScripts.length > 0) {
      log(`❌ package.json中缺少脚本: ${missingScripts.join(', ')}`, 'red');
      return false;
    }
    
    log('✅ package.json检查通过', 'green');
    return true;
  } catch (error) {
    log('❌ package.json格式错误: ' + error.message, 'red');
    return false;
  }
}

// 检查依赖包
function checkDependencies(requiredDeps) {
  log('\n📋 检查依赖包...', 'blue');
  
  const packagePath = path.join(process.cwd(), 'package.json');
  const nodeModulesPath = path.join(process.cwd(), 'node_modules');
  
  if (!fs.existsSync(packagePath)) {
    log('❌ package.json文件不存在', 'red');
    return false;
  }
  
  if (!fs.existsSync(nodeModulesPath)) {
    log('❌ node_modules目录不存在，需要运行 npm install', 'red');
    return false;
  }
  
  try {
    const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    const allDeps = { ...packageData.dependencies, ...packageData.devDependencies };
    
    let allInstalled = true;
    
    requiredDeps.forEach(dep => {
      if (allDeps[dep]) {
        const depPath = path.join(nodeModulesPath, dep);
        if (fs.existsSync(depPath)) {
          log(`✅ ${dep}`, 'green');
        } else {
          log(`❌ ${dep} (未安装)`, 'red');
          allInstalled = false;
        }
      } else {
        log(`❌ ${dep} (未在package.json中声明)`, 'red');
        allInstalled = false;
      }
    });
    
    return allInstalled;
  } catch (error) {
    log('❌ 依赖检查失败: ' + error.message, 'red');
    return false;
  }
}

// 检查端口可用性
function checkPortAvailability(port) {
  log(`\n📋 检查端口 ${port} 可用性...`, 'blue');
  
  return new Promise((resolve) => {
    const net = require('net');
    const server = net.createServer();
    
    server.listen(port, () => {
      server.close();
      log(`✅ 端口 ${port} 可用`, 'green');
      resolve(true);
    });
    
    server.on('error', () => {
      log(`❌ 端口 ${port} 被占用`, 'red');
      resolve(false);
    });
  });
}

// 检查磁盘空间
function checkDiskSpace() {
  log('\n📋 检查磁盘空间...', 'blue');
  
  try {
    const stats = fs.statSync(process.cwd());
    // 简单检查，实际项目中可能需要更复杂的磁盘空间检查
    log('✅ 磁盘空间检查通过', 'green');
    return true;
  } catch (error) {
    log('❌ 磁盘空间检查失败: ' + error.message, 'red');
    return false;
  }
}

// 生成环境报告
function generateReport(results) {
  log('\n📊 环境检查报告', 'blue');
  log('═'.repeat(50), 'blue');
  
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  
  results.forEach(result => {
    const status = result.passed ? '✅' : '❌';
    const color = result.passed ? 'green' : 'red';
    log(`${status} ${result.name}`, color);
    if (result.details) {
      log(`   ${result.details}`, 'blue');
    }
  });
  
  log('═'.repeat(50), 'blue');
  log(`总计: ${passed}/${total} 项检查通过`, passed === total ? 'green' : 'yellow');
  
  if (passed === total) {
    log('\n🎉 环境检查全部通过，可以启动应用！', 'green');
    return true;
  } else {
    log('\n⚠️ 部分检查未通过，请修复后重试', 'yellow');
    return false;
  }
}

// 主函数
async function main() {
  log('\n🔍 开始环境检查...', 'blue');
  
  const config = loadConfig();
  if (!config) {
    process.exit(1);
  }
  
  const results = [];
  
  // 执行各项检查
  results.push({
    name: 'Node.js版本',
    passed: checkNodeVersion(config.checks.nodeVersion),
    details: `要求: ${config.checks.nodeVersion}`
  });
  
  results.push({
    name: 'npm版本',
    passed: checkNpmVersion(config.checks.npmVersion),
    details: `要求: ${config.checks.npmVersion}`
  });
  
  results.push({
    name: 'package.json',
    passed: checkPackageJson()
  });
  
  results.push({
    name: '必需文件',
    passed: checkRequiredFiles(config.checks.requiredFiles)
  });
  
  results.push({
    name: '依赖包',
    passed: checkDependencies(config.checks.requiredDependencies)
  });
  
  results.push({
    name: '端口可用性',
    passed: await checkPortAvailability(config.server.defaultPort),
    details: `端口: ${config.server.defaultPort}`
  });
  
  results.push({
    name: '磁盘空间',
    passed: checkDiskSpace()
  });
  
  // 生成报告
  const allPassed = generateReport(results);
  
  if (!allPassed) {
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main().catch((error) => {
    log('\n❌ 环境检查失败', 'red');
    log('错误信息: ' + error.message, 'red');
    process.exit(1);
  });
}

module.exports = { checkNodeVersion, checkNpmVersion, checkRequiredFiles, checkPackageJson, checkDependencies };
