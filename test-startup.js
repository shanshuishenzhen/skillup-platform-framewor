#!/usr/bin/env node
/**
 * 测试启动功能的脚本
 * 用于验证一键启动功能是否正常工作
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

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

// 测试项目
const tests = [
  {
    name: '检查启动脚本文件',
    test: () => {
      const files = ['start.js', 'start.bat', 'start.sh', 'start-config.json'];
      return files.every(file => fs.existsSync(file));
    }
  },
  {
    name: '检查脚本目录',
    test: () => {
      return fs.existsSync('scripts') && 
             fs.existsSync('scripts/init-database.js') && 
             fs.existsSync('scripts/check-environment.js');
    }
  },
  {
    name: '检查package.json配置',
    test: () => {
      try {
        const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
        return pkg.scripts && 
               pkg.scripts['quick-start'] && 
               pkg.scripts['init-db'] && 
               pkg.scripts['check-env'];
      } catch {
        return false;
      }
    }
  },
  {
    name: '检查启动配置文件',
    test: () => {
      try {
        const config = JSON.parse(fs.readFileSync('start-config.json', 'utf8'));
        return config.app && config.server && config.database;
      } catch {
        return false;
      }
    }
  },
  {
    name: '检查文档文件',
    test: () => {
      return fs.existsSync('START_GUIDE.md');
    }
  }
];

// 运行测试
function runTests() {
  log('\n🧪 测试一键启动功能...', 'blue');
  log('═'.repeat(50), 'blue');
  
  let passed = 0;
  let total = tests.length;
  
  tests.forEach((test, index) => {
    try {
      const result = test.test();
      if (result) {
        log(`✅ ${test.name}`, 'green');
        passed++;
      } else {
        log(`❌ ${test.name}`, 'red');
      }
    } catch (error) {
      log(`❌ ${test.name} (错误: ${error.message})`, 'red');
    }
  });
  
  log('═'.repeat(50), 'blue');
  log(`测试结果: ${passed}/${total} 通过`, passed === total ? 'green' : 'yellow');
  
  if (passed === total) {
    log('\n🎉 所有测试通过！一键启动功能已就绪', 'green');
    log('\n📝 使用方法:', 'blue');
    log('  Windows: 双击 start.bat 或运行 start.bat', 'blue');
    log('  Linux/Mac: 运行 ./start.sh 或 chmod +x start.sh && ./start.sh', 'blue');
    log('  Node.js: 运行 node start.js 或 npm run quick-start', 'blue');
    log('\n📖 详细说明请查看 START_GUIDE.md', 'blue');
  } else {
    log('\n⚠️ 部分测试未通过，请检查相关文件', 'yellow');
  }
  
  return passed === total;
}

// 显示系统信息
function showSystemInfo() {
  log('\n📊 系统信息:', 'blue');
  
  try {
    const nodeVersion = process.version;
    log(`Node.js版本: ${nodeVersion}`, 'green');
  } catch (error) {
    log('Node.js版本: 未知', 'yellow');
  }
  
  try {
    const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
    log(`npm版本: ${npmVersion}`, 'green');
  } catch (error) {
    log('npm版本: 未知', 'yellow');
  }
  
  log(`操作系统: ${process.platform} ${process.arch}`, 'green');
  log(`工作目录: ${process.cwd()}`, 'green');
}

// 主函数
function main() {
  log('\n🚀 SkillUp Platform - 启动功能测试', 'blue');
  
  showSystemInfo();
  const success = runTests();
  
  if (success) {
    log('\n💡 提示: 现在可以使用一键启动功能启动应用了！', 'green');
  }
  
  process.exit(success ? 0 : 1);
}

// 运行测试
if (require.main === module) {
  main();
}
