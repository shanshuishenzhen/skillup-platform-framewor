/**
 * 前端权限状态检查脚本（修正版）
 * 用于诊断浏览器端的管理员权限问题
 * 检查localStorage、sessionStorage、cookies等前端状态
 */

const puppeteer = require('puppeteer');
const path = require('path');

/**
 * 检查前端权限状态
 */
async function checkFrontendPermissionState() {
  console.log('🌐 启动浏览器检查前端权限状态...');
  
  let browser;
  try {
    // 启动浏览器
    browser = await puppeteer.launch({
      headless: false, // 显示浏览器窗口
      devtools: true,  // 打开开发者工具
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // 监听控制台输出
    page.on('console', msg => {
      console.log(`🖥️ 浏览器控制台: ${msg.text()}`);
    });
    
    // 监听网络请求
    page.on('response', response => {
      if (response.url().includes('/api/admin') || response.url().includes('/api/auth')) {
        console.log(`🌐 API请求: ${response.url()} - 状态: ${response.status()}`);
      }
    });
    
    console.log('\n1️⃣ 访问登录页面...');
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle0' });
    
    // 检查页面是否正确加载
    const title = await page.title();
    console.log(`页面标题: ${title}`);
    
    // 等待页面完全加载
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 检查是否有手机号输入框
    const phoneInput = await page.$('#phone');
    if (!phoneInput) {
      console.log('❌ 未找到手机号输入框，尝试其他选择器...');
      const phoneInputAlt = await page.$('input[type="tel"]') || await page.$('input[placeholder*="手机"]');
      if (!phoneInputAlt) {
        console.log('❌ 无法找到手机号输入框');
        return;
      }
    }
    
    // 填写登录表单
    console.log('\n2️⃣ 填写登录表单...');
    await page.type('#phone', '13823738278');
    await page.type('#password', '123456');
    
    // 点击登录按钮
    console.log('\n3️⃣ 点击登录按钮...');
    await page.click('button[type="submit"]');
    
    // 等待登录完成
    console.log('等待登录响应...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // 检查localStorage中的token
    console.log('\n4️⃣ 检查localStorage中的认证信息...');
    const localStorage = await page.evaluate(() => {
      const items = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        items[key] = localStorage.getItem(key);
      }
      return items;
    });
    
    console.log('localStorage内容:');
    Object.entries(localStorage).forEach(([key, value]) => {
      console.log(`  ${key}: ${value ? value.substring(0, 100) + (value.length > 100 ? '...' : '') : 'null'}`);
    });
    
    // 检查当前URL
    const currentUrl = page.url();
    console.log(`\n当前URL: ${currentUrl}`);
    
    // 如果还在登录页面，说明登录可能失败
    if (currentUrl.includes('/login')) {
      console.log('⚠️ 仍在登录页面，检查是否有错误信息...');
      const errorMessage = await page.evaluate(() => {
        const errorElement = document.querySelector('[class*="error"], [class*="alert"], .text-red-500, .text-red-600');
        return errorElement ? errorElement.textContent : null;
      });
      if (errorMessage) {
        console.log(`❌ 登录错误: ${errorMessage}`);
      }
    }
    
    // 尝试直接访问管理员页面
    console.log('\n5️⃣ 尝试访问管理员页面...');
    await page.goto('http://localhost:3000/admin', { waitUntil: 'networkidle0' });
    
    // 等待页面加载
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 检查当前URL
    const adminUrl = page.url();
    console.log(`管理员页面URL: ${adminUrl}`);
    
    // 检查页面内容
    const pageContent = await page.evaluate(() => {
      const body = document.body;
      const text = body.textContent || '';
      
      if (text.includes('权限不足')) {
        return { hasPermissionError: true, content: '页面显示权限不足' };
      }
      if (text.includes('管理员后台') || text.includes('用户管理') || text.includes('管理员')) {
        return { hasAdminContent: true, content: '页面显示管理员后台内容' };
      }
      if (text.includes('加载中') || text.includes('Loading')) {
        return { isLoading: true, content: '页面正在加载中' };
      }
      if (text.includes('登录')) {
        return { needLogin: true, content: '页面要求登录' };
      }
      
      return { content: text.substring(0, 300) };
    });
    
    console.log('页面内容分析:', pageContent);
    
    // 检查网络请求状态
    console.log('\n6️⃣ 手动测试权限检查API...');
    const apiResponse = await page.evaluate(async () => {
      try {
        // 尝试多种可能的token存储key
        const tokenKeys = ['adminToken', 'token', 'authToken', 'accessToken'];
        let token = null;
        
        for (const key of tokenKeys) {
          const value = localStorage.getItem(key);
          if (value) {
            token = value;
            console.log(`找到token，key: ${key}`);
            break;
          }
        }
        
        if (!token) {
          return { error: '未找到任何token' };
        }
        
        const response = await fetch('/api/admin/check-permission', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        const data = await response.text();
        return {
          status: response.status,
          statusText: response.statusText,
          data: data,
          token: token.substring(0, 50) + '...'
        };
      } catch (error) {
        return { error: error.message };
      }
    });
    
    console.log('API测试结果:', apiResponse);
    
    // 检查AdminGuard组件状态
    console.log('\n7️⃣ 检查AdminGuard组件状态...');
    const adminGuardState = await page.evaluate(() => {
      // 检查页面中是否有AdminGuard相关的元素或状态
      const loadingElements = document.querySelectorAll('[class*="loading"], [class*="spinner"]');
      const errorElements = document.querySelectorAll('[class*="error"], [class*="alert"]');
      
      return {
        hasLoadingElements: loadingElements.length > 0,
        hasErrorElements: errorElements.length > 0,
        loadingCount: loadingElements.length,
        errorCount: errorElements.length
      };
    });
    
    console.log('AdminGuard状态:', adminGuardState);
    
    // 截图保存当前状态
    console.log('\n8️⃣ 保存页面截图...');
    await page.screenshot({ path: 'admin-page-debug.png', fullPage: true });
    console.log('截图已保存为: admin-page-debug.png');
    
    // 等待用户查看
    console.log('\n🔍 浏览器窗口已打开，请手动检查页面状态...');
    console.log('页面将保持打开30秒供您检查...');
    
    // 保持浏览器打开30秒供用户检查
    await new Promise(resolve => setTimeout(resolve, 30000));
    
  } catch (error) {
    console.error('❌ 前端检查过程发生错误:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * 检查前端代码中的权限逻辑
 */
function analyzeFrontendCode() {
  console.log('\n📝 分析前端权限相关代码...');
  
  const fs = require('fs');
  const filesToCheck = [
    'src/components/auth/AdminGuard.tsx',
    'src/hooks/useAuth.ts',
    'src/app/admin/page.tsx',
    'src/app/(auth)/login/page.tsx'
  ];
  
  filesToCheck.forEach(file => {
    const fullPath = path.join(__dirname, file);
    if (fs.existsSync(fullPath)) {
      console.log(`\n✅ 检查文件: ${file}`);
      const content = fs.readFileSync(fullPath, 'utf8');
      
      // 检查关键代码模式
      const patterns = [
        { name: 'localStorage使用', regex: /localStorage\.(get|set|remove)Item/g },
        { name: 'API调用', regex: /\/api\/admin/g },
        { name: '权限检查', regex: /(isAdmin|hasPermission|checkPermission)/g },
        { name: 'token处理', regex: /(token|Token|TOKEN)/g },
        { name: '路由跳转', regex: /(router\.|navigate|redirect)/g }
      ];
      
      patterns.forEach(pattern => {
        const matches = content.match(pattern.regex);
        if (matches) {
          console.log(`  - ${pattern.name}: 找到 ${matches.length} 处`);
        }
      });
    } else {
      console.log(`❌ 文件不存在: ${file}`);
    }
  });
}

/**
 * 主函数
 */
async function main() {
  console.log('🚀 开始前端权限状态诊断...');
  console.log('=' .repeat(60));
  
  // 分析前端代码
  analyzeFrontendCode();
  
  // 检查前端状态
  await checkFrontendPermissionState();
  
  console.log('\n' + '=' .repeat(60));
  console.log('📋 前端诊断完成');
  console.log('\n🔧 可能的解决方案:');
  console.log('1. 清除浏览器所有缓存和存储');
  console.log('2. 检查AdminGuard组件的权限检查逻辑');
  console.log('3. 确认token存储和读取的key是否一致');
  console.log('4. 检查API请求的Authorization header格式');
  console.log('5. 验证React组件的状态管理是否正确');
  console.log('6. 检查管理员登录后的token是否正确存储');
  console.log('7. 验证权限检查API是否正常工作');
}

// 运行诊断
if (require.main === module) {
  main().catch(error => {
    console.error('❌ 前端诊断过程发生异常:', error.message);
    console.error(error.stack);
  });
}

module.exports = {
  checkFrontendPermissionState,
  analyzeFrontendCode
};