#!/usr/bin/env node
/**
 * 更新启动配置脚本
 * 用于动态更新 start-config.json 配置文件
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

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

// 创建readline接口
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// 提问函数
function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

// 加载当前配置
function loadConfig() {
  const configPath = path.join(process.cwd(), 'start-config.json');
  
  if (!fs.existsSync(configPath)) {
    log('❌ 配置文件不存在，将创建新的配置文件', 'yellow');
    return null;
  }
  
  try {
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (error) {
    log('❌ 配置文件格式错误: ' + error.message, 'red');
    return null;
  }
}

// 保存配置
function saveConfig(config) {
  const configPath = path.join(process.cwd(), 'start-config.json');
  
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
    log('✅ 配置已保存', 'green');
    return true;
  } catch (error) {
    log('❌ 保存配置失败: ' + error.message, 'red');
    return false;
  }
}

// 显示当前配置
function showCurrentConfig(config) {
  if (!config) {
    log('当前没有配置文件', 'yellow');
    return;
  }
  
  log('\n📋 当前配置:', 'blue');
  log('═'.repeat(40), 'blue');
  log(`应用名称: ${config.app?.name || '未设置'}`, 'green');
  log(`默认端口: ${config.server?.defaultPort || '未设置'}`, 'green');
  log(`主机地址: ${config.server?.host || '未设置'}`, 'green');
  log(`自动打开浏览器: ${config.server?.autoOpenBrowser ? '是' : '否'}`, 'green');
  log(`数据库类型: ${config.database?.type || '未设置'}`, 'green');
  log(`数据库路径: ${config.database?.path || '未设置'}`, 'green');
  log(`自动初始化数据库: ${config.database?.autoInit ? '是' : '否'}`, 'green');
  log(`插入示例数据: ${config.database?.seedData ? '是' : '否'}`, 'green');
  log('═'.repeat(40), 'blue');
}

// 更新配置向导
async function updateConfigWizard(config) {
  log('\n🔧 配置更新向导', 'blue');
  log('提示: 直接按回车保持当前值不变\n', 'yellow');
  
  // 如果没有配置，创建默认配置
  if (!config) {
    config = {
      app: {},
      server: {},
      database: {},
      environment: {}
    };
  }
  
  // 应用配置
  log('📱 应用配置:', 'blue');
  const appName = await question(`应用名称 [${config.app?.name || 'SkillUp Platform'}]: `);
  if (appName.trim()) config.app.name = appName.trim();
  
  const appVersion = await question(`应用版本 [${config.app?.version || '1.0.0'}]: `);
  if (appVersion.trim()) config.app.version = appVersion.trim();
  
  // 服务器配置
  log('\n🌐 服务器配置:', 'blue');
  const defaultPort = await question(`默认端口 [${config.server?.defaultPort || 3000}]: `);
  if (defaultPort.trim()) config.server.defaultPort = parseInt(defaultPort.trim()) || 3000;
  
  const host = await question(`主机地址 [${config.server?.host || 'localhost'}]: `);
  if (host.trim()) config.server.host = host.trim();
  
  const autoOpenBrowser = await question(`自动打开浏览器 (y/n) [${config.server?.autoOpenBrowser ? 'y' : 'n'}]: `);
  if (autoOpenBrowser.trim()) {
    config.server.autoOpenBrowser = autoOpenBrowser.toLowerCase().startsWith('y');
  }
  
  // 数据库配置
  log('\n🗄️ 数据库配置:', 'blue');
  const dbType = await question(`数据库类型 [${config.database?.type || 'sqlite'}]: `);
  if (dbType.trim()) config.database.type = dbType.trim();
  
  const dbPath = await question(`数据库路径 [${config.database?.path || './data/skillup.db'}]: `);
  if (dbPath.trim()) config.database.path = dbPath.trim();
  
  const autoInit = await question(`自动初始化数据库 (y/n) [${config.database?.autoInit ? 'y' : 'n'}]: `);
  if (autoInit.trim()) {
    config.database.autoInit = autoInit.toLowerCase().startsWith('y');
  }
  
  const seedData = await question(`插入示例数据 (y/n) [${config.database?.seedData ? 'y' : 'n'}]: `);
  if (seedData.trim()) {
    config.database.seedData = seedData.toLowerCase().startsWith('y');
  }
  
  return config;
}

// 主菜单
async function showMainMenu() {
  log('\n🚀 SkillUp Platform - 配置管理工具', 'blue');
  log('═'.repeat(50), 'blue');
  log('1. 查看当前配置', 'green');
  log('2. 更新配置', 'green');
  log('3. 重置为默认配置', 'green');
  log('4. 退出', 'green');
  log('═'.repeat(50), 'blue');
  
  const choice = await question('请选择操作 (1-4): ');
  return choice.trim();
}

// 重置为默认配置
function resetToDefault() {
  return {
    app: {
      name: "SkillUp Platform",
      version: "1.0.0",
      description: "智能在线学习平台"
    },
    server: {
      defaultPort: 3000,
      host: "localhost",
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
    features: {
      hotReload: true,
      typescript: true,
      tailwindcss: true,
      eslint: true
    },
    environment: {
      NODE_ENV: "development",
      NEXT_TELEMETRY_DISABLED: "1"
    },
    logging: {
      level: "info",
      colorOutput: true,
      showTimestamp: true
    }
  };
}

// 主函数
async function main() {
  try {
    while (true) {
      const choice = await showMainMenu();
      
      switch (choice) {
        case '1':
          const currentConfig = loadConfig();
          showCurrentConfig(currentConfig);
          break;
          
        case '2':
          let config = loadConfig();
          config = await updateConfigWizard(config);
          if (saveConfig(config)) {
            log('\n✅ 配置更新完成！', 'green');
          }
          break;
          
        case '3':
          const confirm = await question('确定要重置为默认配置吗？(y/n): ');
          if (confirm.toLowerCase().startsWith('y')) {
            const defaultConfig = resetToDefault();
            if (saveConfig(defaultConfig)) {
              log('\n✅ 已重置为默认配置！', 'green');
            }
          }
          break;
          
        case '4':
          log('\n👋 再见！', 'blue');
          rl.close();
          return;
          
        default:
          log('❌ 无效选择，请重试', 'red');
      }
      
      await question('\n按回车键继续...');
    }
  } catch (error) {
    log('\n❌ 发生错误: ' + error.message, 'red');
    rl.close();
    process.exit(1);
  }
}

// 运行程序
if (require.main === module) {
  main();
}
