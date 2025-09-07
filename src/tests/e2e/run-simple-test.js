#!/usr/bin/env node

/**
 * 简化的端到端测试运行器
 * 用于验证测试框架是否正常工作
 */

const { spawn } = require('child_process');
const path = require('path');

// 颜色输出工具
class Colors {
  static green(text) { return `\x1b[32m${text}\x1b[0m`; }
  static red(text) { return `\x1b[31m${text}\x1b[0m`; }
  static yellow(text) { return `\x1b[33m${text}\x1b[0m`; }
  static blue(text) { return `\x1b[34m${text}\x1b[0m`; }
  static cyan(text) { return `\x1b[36m${text}\x1b[0m`; }
}

/**
 * 运行Playwright测试
 * @param {string} testFile - 测试文件路径
 * @param {Object} options - 测试选项
 * @returns {Promise<boolean>} 测试是否成功
 */
function runPlaywrightTest(testFile, options = {}) {
  return new Promise((resolve) => {
    console.log(Colors.blue(`🧪 运行测试: ${testFile}`));
    
    const args = [
      'playwright',
      'test',
      testFile,
      '--project=chromium',
      '--reporter=line',
      '--timeout=30000'
    ];
    
    if (options.headed) {
      args.push('--headed');
    }
    
    const child = spawn('npx', args, {
      stdio: 'inherit',
      shell: true,
      cwd: process.cwd()
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        console.log(Colors.green(`✅ 测试通过: ${testFile}`));
        resolve(true);
      } else {
        console.log(Colors.red(`❌ 测试失败: ${testFile}`));
        resolve(false);
      }
    });
    
    child.on('error', (error) => {
      console.error(Colors.red(`❌ 测试执行错误: ${error.message}`));
      resolve(false);
    });
  });
}

/**
 * 主函数
 */
async function main() {
  console.log(Colors.cyan('🎯 简化端到端测试运行器'));
  console.log('='.repeat(50));
  
  try {
    // 运行简单测试
    const testFile = 'src/tests/e2e/simple-test.spec.ts';
    const success = await runPlaywrightTest(testFile, { headed: false });
    
    if (success) {
      console.log(Colors.green('\n🎉 测试框架验证成功！'));
      process.exit(0);
    } else {
      console.log(Colors.red('\n❌ 测试框架验证失败'));
      process.exit(1);
    }
  } catch (error) {
    console.error(Colors.red(`❌ 运行错误: ${error.message}`));
    process.exit(1);
  }
}

// 运行主函数
if (require.main === module) {
  main();
}

module.exports = { runPlaywrightTest };