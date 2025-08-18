#!/usr/bin/env node
const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');
const os = require('os');

// 加载配置
let CONFIG;
try {
  const configPath = path.join(__dirname, 'start-config.json');
  if (fs.existsSync(configPath)) {
    CONFIG = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } else {
    // 默认配置
    CONFIG = {
      app: {
        name: "SkillUp Platform",
        version: "1.0.0",
        description: "智能在线学习平台"
      },
      server: {
        defaultPort: 3000,
        host: 'localhost',
        startupTimeout: 30000,
        checkInterval: 1000,
        maxRetries: 5,
        autoOpenBrowser: true
      },
      database: {
        type: "sqlite",
        path: "./data/skillup.db",
        autoInit: true,
        seedData: true
      },
      environment: {
        NODE_ENV: "development",
        NEXT_TELEMETRY_DISABLED: "1"
      }
    };
  }
} catch (error) {
  console.error('❌ 配置文件加载失败:', error.message);
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

// 检查Node.js环境
function checkNodeEnvironment() {
  log('\n📋 检查Node.js环境...', 'blue');
  try {
    const nodeVersion = execSync('node --version', { encoding: 'utf8' }).trim();
    const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
    log(`✅ Node.js版本: ${nodeVersion}`, 'green');
    log(`✅ npm版本: ${npmVersion}`, 'green');
    return true;
  } catch (error) {
    log('❌ Node.js环境检查失败', 'red');
    log('请确保已安装Node.js和npm', 'red');
    return false;
  }
}

// 检查package.json完整性
function checkPackageJson() {
  log('\n📋 检查package.json...', 'blue');
  const packagePath = path.join(process.cwd(), 'package.json');
  
  if (!fs.existsSync(packagePath)) {
    log('❌ package.json文件不存在', 'red');
    return false;
  }

  try {
    const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    
    if (!packageData.scripts || !packageData.scripts.dev) {
      log('❌ package.json中缺少dev脚本', 'red');
      return false;
    }

    log('✅ package.json检查通过', 'green');
    return true;
  } catch (error) {
    log('❌ package.json格式错误', 'red');
    return false;
  }
}

// 检查并安装依赖
function checkAndInstallDependencies() {
  log('\n📦 检查依赖包...', 'blue');

  const nodeModulesPath = path.join(process.cwd(), 'node_modules');
  const packageLockPath = path.join(process.cwd(), 'package-lock.json');

  if (!fs.existsSync(nodeModulesPath) || !fs.existsSync(packageLockPath)) {
    log('🔄 检测到依赖缺失，开始安装...', 'yellow');

    try {
      execSync('npm install', {
        stdio: 'inherit',
        cwd: process.cwd()
      });
      log('✅ 依赖安装完成', 'green');
    } catch (error) {
      log('❌ 依赖安装失败', 'red');
      log('错误信息: ' + error.message, 'red');
      return false;
    }
  } else {
    log('✅ 依赖已安装', 'green');
  }

  return true;
}

// 运行环境检查
function runEnvironmentCheck() {
  log('\n🔍 运行环境检查...', 'blue');

  const checkScript = path.join(__dirname, 'scripts', 'check-environment.js');

  if (!fs.existsSync(checkScript)) {
    log('⚠️ 环境检查脚本不存在，跳过检查', 'yellow');
    return true;
  }

  try {
    execSync(`node "${checkScript}"`, {
      stdio: 'inherit',
      cwd: process.cwd()
    });
    log('✅ 环境检查通过', 'green');
    return true;
  } catch (error) {
    log('❌ 环境检查失败', 'red');
    return false;
  }
}

// 初始化数据库
function initializeDatabase() {
  if (!CONFIG.database.autoInit) {
    log('⚠️ 数据库自动初始化已禁用', 'yellow');
    return true;
  }

  log('\n🗄️ 初始化数据库...', 'blue');

  const initScript = path.join(__dirname, 'scripts', 'init-database.js');

  if (!fs.existsSync(initScript)) {
    log('⚠️ 数据库初始化脚本不存在，跳过初始化', 'yellow');
    return true;
  }

  try {
    execSync(`node "${initScript}"`, {
      stdio: 'inherit',
      cwd: process.cwd()
    });
    log('✅ 数据库初始化完成', 'green');
    return true;
  } catch (error) {
    log('❌ 数据库初始化失败', 'red');
    log('错误信息: ' + error.message, 'red');
    return false;
  }
}

// 设置环境变量
function setupEnvironment() {
  log('\n🌍 设置环境变量...', 'blue');

  if (CONFIG.environment) {
    Object.keys(CONFIG.environment).forEach(key => {
      process.env[key] = CONFIG.environment[key];
      log(`✅ ${key}=${CONFIG.environment[key]}`, 'green');
    });
  }

  return true;
}

// 检查端口是否可用
function checkPort(port) {
  return new Promise((resolve) => {
    const server = http.createServer();
    server.listen(port, CONFIG.server.host, () => {
      server.close();
      resolve(true);
    });
    server.on('error', () => {
      resolve(false);
    });
  });
}

// 等待服务器启动
function waitForServer(port) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const checkServer = () => {
      const req = http.request({
        hostname: CONFIG.host,
        port: port,
        path: '/',
        method: 'GET',
        timeout: 2000
      }, (res) => {
        if (res.statusCode >= 200 && res.statusCode < 400) {
          resolve(true);
        } else {
          setTimeout(checkServer, CONFIG.checkInterval);
        }
      });
      
      req.on('error', () => {
        if (Date.now() - startTime > CONFIG.startupTimeout) {
          reject(new Error('服务器启动超时'));
        } else {
          setTimeout(checkServer, CONFIG.checkInterval);
        }
      });
      
      req.on('timeout', () => {
        req.destroy();
        setTimeout(checkServer, CONFIG.checkInterval);
      });
      
      req.end();
    };
    
    checkServer();
  });
}

// 打开浏览器
function openBrowser(url) {
  log(`\n🌐 正在打开浏览器: ${url}`, 'blue');

  const platform = os.platform();
  let command;

  switch (platform) {
    case 'win32':
      command = `start ${url}`;
      break;
    case 'darwin':
      command = `open ${url}`;
      break;
    case 'linux':
      command = `xdg-open ${url}`;
      break;
    default:
      log('⚠️ 无法自动打开浏览器，请手动访问: ' + url, 'yellow');
      return;
  }

  try {
    execSync(command, { stdio: 'ignore' });
    log('✅ 浏览器已打开', 'green');
  } catch (error) {
    log('⚠️ 无法自动打开浏览器，请手动访问: ' + url, 'yellow');
  }
}

// 查找可用端口
async function findAvailablePort(startPort = CONFIG.server.defaultPort) {
  let port = startPort;
  let retries = 0;

  while (retries < CONFIG.server.maxRetries) {
    const isAvailable = await checkPort(port);
    if (isAvailable) {
      return port;
    }
    port++;
    retries++;
  }

  throw new Error(`无法找到可用端口 (尝试了 ${startPort} 到 ${port - 1})`);
}

// 启动开发服务器
function startDevServer(port) {
  log(`\n🚀 启动开发服务器 (端口: ${port})...`, 'blue');

  const child = spawn('npm', ['run', 'dev', '--', '--port', port.toString()], {
    stdio: 'pipe',
    cwd: process.cwd(),
    shell: true
  });

  let serverStarted = false;

  child.stdout.on('data', (data) => {
    const output = data.toString();
    console.log(output);

    // 检测服务器是否已启动
    if (output.includes('Ready') || output.includes('started server') || output.includes('Local:')) {
      if (!serverStarted) {
        serverStarted = true;
        log('✅ 开发服务器启动成功', 'green');

        // 等待一秒后打开浏览器
        if (CONFIG.server.autoOpenBrowser) {
          setTimeout(() => {
            const url = `http://${CONFIG.server.host}:${port}`;
            openBrowser(url);
          }, 1000);
        }
      }
    }
  });

  child.stderr.on('data', (data) => {
    const output = data.toString();
    if (!output.includes('warn') && !output.includes('Warning')) {
      console.error(output);
    }
  });

  child.on('error', (error) => {
    log('❌ 启动开发服务器失败', 'red');
    log('错误信息: ' + error.message, 'red');
    process.exit(1);
  });

  child.on('close', (code) => {
    if (code !== 0) {
      log(`❌ 开发服务器异常退出 (代码: ${code})`, 'red');
      process.exit(1);
    }
  });

  // 处理进程退出
  process.on('SIGINT', () => {
    log('\n🛑 正在关闭服务器...', 'yellow');
    child.kill('SIGINT');
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    child.kill('SIGTERM');
    process.exit(0);
  });

  return child;
}

// 显示系统信息
function showSystemInfo() {
  log('\n📊 系统信息:', 'blue');
  log(`操作系统: ${os.platform()} ${os.arch()}`, 'green');
  log(`Node.js版本: ${process.version}`, 'green');
  log(`内存使用: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`, 'green');
  log(`工作目录: ${process.cwd()}`, 'green');
}

// 显示启动横幅
function showBanner() {
  console.log(`
${colors.blue}
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║    🚀 SkillUp Platform - 一键启动脚本                        ║
║                                                              ║
║    智能在线学习平台快速启动工具                               ║
║    版本: 1.0.0                                               ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
${colors.reset}
  `);
}

// 主函数
async function main() {
  try {
    showBanner();
    showSystemInfo();

    // 设置环境变量
    if (!setupEnvironment()) {
      process.exit(1);
    }

    // 运行环境检查
    if (!runEnvironmentCheck()) {
      log('\n⚠️ 环境检查未通过，但继续启动...', 'yellow');
    }

    // 基础环境检查
    if (!checkNodeEnvironment()) {
      process.exit(1);
    }

    if (!checkPackageJson()) {
      process.exit(1);
    }

    if (!checkAndInstallDependencies()) {
      process.exit(1);
    }

    // 初始化数据库
    if (!initializeDatabase()) {
      log('\n⚠️ 数据库初始化失败，但继续启动...', 'yellow');
    }

    // 查找可用端口
    log('\n🔍 查找可用端口...', 'blue');
    const port = await findAvailablePort(CONFIG.server.defaultPort);
    log(`✅ 找到可用端口: ${port}`, 'green');

    // 启动服务器
    startDevServer(port);

    // 显示启动完成信息
    log('\n🎉 启动完成!', 'green');
    log(`📱 本地访问: http://${CONFIG.server.host}:${port}`, 'green');
    log(`🌐 网络访问: http://${getLocalIP()}:${port}`, 'green');
    log('\n💡 提示:', 'yellow');
    log('  - 按 Ctrl+C 停止服务器', 'yellow');
    log('  - 修改代码后会自动重新加载', 'yellow');
    log('  - 查看控制台输出了解运行状态', 'yellow');
    log('  - 数据库文件位置: ' + CONFIG.database.path, 'yellow');

  } catch (error) {
    log('\n❌ 启动失败', 'red');
    log('错误信息: ' + error.message, 'red');
    process.exit(1);
  }
}

// 获取本机IP地址
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

// 启动应用
if (require.main === module) {
  main().catch((error) => {
    log('\n❌ 未处理的错误', 'red');
    log('错误信息: ' + error.message, 'red');
    process.exit(1);
  });
}