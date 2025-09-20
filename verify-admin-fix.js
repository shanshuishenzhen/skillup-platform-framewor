/**
 * 管理员权限修复验证脚本
 * 验证AdminGuard组件修复是否成功
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

/**
 * 验证管理员权限修复
 */
async function verifyAdminFix() {
  console.log('🔍 验证管理员权限修复...');
  console.log('=' .repeat(60));
  
  let browser;
  try {
    browser = await puppeteer.launch({ 
      headless: false,
      defaultViewport: null,
      args: ['--start-maximized']
    });
    
    const page = await browser.newPage();
    
    // 监听控制台日志
    const consoleLogs = [];
    page.on('console', msg => {
      const text = msg.text();
      consoleLogs.push(text);
      if (text.includes('AdminGuard:')) {
        console.log('🔍 AdminGuard日志:', text);
      }
    });
    
    console.log('\n1️⃣ 访问登录页面...');
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle0' });
    
    // 等待页面加载
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('\n2️⃣ 填写管理员登录信息...');
    
    // 填写手机号
    await page.waitForSelector('#phone', { timeout: 10000 });
    await page.type('#phone', '13823738278');
    
    // 填写密码
    await page.waitForSelector('#password', { timeout: 5000 });
    await page.type('#password', '123456');
    
    console.log('\n3️⃣ 提交登录表单...');
    
    // 点击登录按钮
    const loginButton = await page.$('button[type="submit"]');
    if (loginButton) {
      await loginButton.click();
    } else {
      throw new Error('未找到登录按钮');
    }
    
    // 等待登录完成
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('\n4️⃣ 检查登录后的状态...');
    
    // 检查当前URL
    const currentUrl = page.url();
    console.log('当前URL:', currentUrl);
    
    // 检查localStorage中的token
    const token = await page.evaluate(() => localStorage.getItem('token'));
    console.log('Token存在:', !!token);
    
    console.log('\n5️⃣ 访问管理员页面...');
    
    // 访问管理员页面
    await page.goto('http://localhost:3000/admin', { waitUntil: 'networkidle0' });
    
    // 等待页面加载和权限检查
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('\n6️⃣ 检查页面内容...');
    
    // 检查页面是否显示权限不足
    const hasPermissionError = await page.evaluate(() => {
      const text = document.body.innerText;
      return text.includes('权限不足') || text.includes('需要登录');
    });
    
    // 检查是否显示管理员内容
    const hasAdminContent = await page.evaluate(() => {
      const text = document.body.innerText;
      return text.includes('管理后台') || text.includes('用户管理') || text.includes('系统设置');
    });
    
    console.log('\n📋 验证结果:');
    console.log('=' .repeat(40));
    console.log('✅ 登录成功:', !!token);
    console.log('❌ 显示权限错误:', hasPermissionError);
    console.log('✅ 显示管理员内容:', hasAdminContent);
    
    // 分析AdminGuard日志
    const adminGuardLogs = consoleLogs.filter(log => log.includes('AdminGuard:'));
    console.log('\n🔍 AdminGuard调试日志:');
    adminGuardLogs.forEach(log => console.log('  ', log));
    
    // 判断修复是否成功
    const isFixed = !hasPermissionError && hasAdminContent;
    
    console.log('\n🎯 修复状态:', isFixed ? '✅ 成功' : '❌ 失败');
    
    if (isFixed) {
      console.log('\n🎉 恭喜！管理员权限问题已成功修复！');
      console.log('\n✅ 修复效果:');
      console.log('1. 管理员可以正常登录');
      console.log('2. 权限检查API正常工作');
      console.log('3. AdminGuard组件正确验证权限');
      console.log('4. 管理员页面正常显示');
    } else {
      console.log('\n❌ 权限问题仍然存在，需要进一步调试');
      
      if (hasPermissionError) {
        console.log('\n🔍 问题分析:');
        console.log('- 页面仍显示权限不足错误');
        console.log('- 可能的原因:');
        console.log('  1. AdminGuard组件状态更新延迟');
        console.log('  2. API响应处理逻辑问题');
        console.log('  3. React组件重新渲染问题');
        
        console.log('\n🛠️ 建议的调试步骤:');
        console.log('1. 检查浏览器开发者工具的Network标签');
        console.log('2. 查看Console中的详细错误信息');
        console.log('3. 检查AdminGuard组件的状态变化');
        console.log('4. 验证API响应的数据格式');
      }
    }
    
    return {
      success: isFixed,
      hasToken: !!token,
      hasPermissionError,
      hasAdminContent,
      adminGuardLogs
    };
    
  } catch (error) {
    console.error('❌ 验证过程发生错误:', error.message);
    return {
      success: false,
      error: error.message
    };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * 生成修复报告
 */
function generateFixReport(result) {
  console.log('\n📊 生成修复报告...');
  
  const report = {
    timestamp: new Date().toISOString(),
    fixApplied: true,
    verificationResult: result,
    summary: {
      problemIdentified: '前端AdminGuard组件权限检查逻辑问题',
      solutionApplied: '修复AdminGuard组件的状态管理和异步权限检查',
      fixSuccess: result.success,
      nextSteps: result.success ? [
        '权限问题已解决',
        '可以正常使用管理员功能',
        '建议进行完整的功能测试'
      ] : [
        '需要进一步调试AdminGuard组件',
        '检查API响应格式和组件状态',
        '可能需要清除浏览器缓存重试'
      ]
    },
    technicalDetails: {
      modifiedFiles: [
        'src/components/auth/AdminGuard.tsx'
      ],
      backupFiles: [
        'src/components/auth/AdminGuard.tsx.backup'
      ],
      keyChanges: [
        '添加详细的调试日志',
        '修复组件卸载后的状态更新问题',
        '增强错误处理和显示',
        '改进异步权限检查的逻辑',
        '防止竞态条件'
      ]
    }
  };
  
  // 保存报告
  const reportPath = path.join(__dirname, 'admin-permission-fix-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
  console.log('✅ 修复报告已保存:', reportPath);
  
  return report;
}

/**
 * 主函数
 */
async function main() {
  console.log('🚀 管理员权限修复验证工具');
  console.log('=' .repeat(60));
  
  try {
    // 验证修复效果
    const result = await verifyAdminFix();
    
    // 生成报告
    const report = generateFixReport(result);
    
    console.log('\n' + '=' .repeat(60));
    console.log('🏁 验证完成');
    
    if (result.success) {
      console.log('\n🎉 管理员权限问题已成功解决！');
      console.log('\n✅ 现在可以:');
      console.log('1. 使用管理员账户正常登录');
      console.log('2. 访问管理后台页面');
      console.log('3. 执行管理员操作');
    } else {
      console.log('\n⚠️ 权限问题可能仍然存在');
      console.log('\n🔍 建议:');
      console.log('1. 清除浏览器缓存后重试');
      console.log('2. 检查浏览器开发者工具的错误信息');
      console.log('3. 查看AdminGuard组件的调试日志');
    }
    
  } catch (error) {
    console.error('❌ 验证工具执行失败:', error.message);
  }
}

// 运行验证工具
if (require.main === module) {
  main();
}

module.exports = {
  verifyAdminFix,
  generateFixReport
};