/**
 * 前端Token状态检查脚本
 * 用于检查浏览器localStorage中的认证信息
 */

const puppeteer = require('puppeteer');

/**
 * 检查前端localStorage中的认证信息
 */
async function checkFrontendTokens() {
  console.log('🔍 开始检查前端Token状态...');
  
  let browser;
  try {
    // 启动浏览器
    browser = await puppeteer.launch({
      headless: false, // 显示浏览器窗口
      defaultViewport: null,
      args: ['--start-maximized']
    });
    
    const page = await browser.newPage();
    
    // 访问管理员登录页面
    console.log('📱 访问管理员登录页面...');
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle0' });

    // 等待页面完全加载
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 检查登录前的localStorage
    console.log('\n=== 登录前localStorage状态 ===');
    const beforeLoginStorage = await page.evaluate(() => {
      const storage = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        storage[key] = localStorage.getItem(key);
      }
      return storage;
    });
    console.log('登录前localStorage:', beforeLoginStorage);

    // 执行登录
    console.log('\n🔐 执行管理员登录...');
    
    // 等待手机号输入框出现并输入
    await page.waitForSelector('input#phone', { timeout: 10000 });
    await page.type('input#phone', '13823738278');
    console.log('✓ 输入手机号');

    // 等待密码输入框出现并输入
    await page.waitForSelector('input#password', { timeout: 10000 });
    await page.type('input#password', '123456');
    console.log('✓ 输入密码');
    
    // 点击登录按钮
    await page.click('button[type="submit"]');
    
    // 等待登录完成
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 检查登录后的localStorage
    console.log('\n=== 登录后localStorage状态 ===');
    const afterLogin = await page.evaluate(() => {
      const storage = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        const value = localStorage.getItem(key);
        storage[key] = value;
      }
      return storage;
    });
    console.log('登录后localStorage:', JSON.stringify(afterLogin, null, 2));
    
    // 解析token
    if (afterLogin.token) {
      console.log('\n=== Token解析 ===');
      const tokenParts = afterLogin.token.split('.');
      if (tokenParts.length === 3) {
        try {
          const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
          console.log('Token Payload:', JSON.stringify(payload, null, 2));
          
          // 检查token是否过期
          const now = Math.floor(Date.now() / 1000);
          if (payload.exp < now) {
            console.log('⚠️ Token已过期');
          } else {
            console.log('✅ Token有效');
          }
        } catch (error) {
          console.log('❌ Token解析失败:', error.message);
        }
      } else {
        console.log('❌ Token格式不正确');
      }
    } else {
      console.log('❌ 未找到token');
    }
    
    // 检查当前页面URL
    const currentUrl = page.url();
    console.log('\n📍 当前页面URL:', currentUrl);
    
    // 尝试访问管理员页面
    console.log('\n🏠 尝试访问管理员主页...');
    await page.goto('http://localhost:3000/admin', { waitUntil: 'networkidle0' });
    
    // 等待页面加载
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 检查页面内容
    const pageContent = await page.evaluate(() => {
      return {
        title: document.title,
        url: window.location.href,
        hasErrorMessage: document.querySelector('.text-red-500') !== null,
        errorText: document.querySelector('.text-red-500')?.textContent || null,
        hasPermissionError: document.body.textContent.includes('权限不足'),
        bodyText: document.body.textContent.substring(0, 500)
      };
    });
    
    console.log('\n=== 管理员页面访问结果 ===');
    console.log('页面标题:', pageContent.title);
    console.log('页面URL:', pageContent.url);
    console.log('是否有错误信息:', pageContent.hasErrorMessage);
    console.log('错误文本:', pageContent.errorText);
    console.log('是否有权限错误:', pageContent.hasPermissionError);
    console.log('页面内容预览:', pageContent.bodyText);
    
    // 在浏览器控制台中测试权限检查API
    console.log('\n=== 浏览器中测试权限检查API ===');
    const apiTestResult = await page.evaluate(async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          return { error: '未找到token' };
        }
        
        const response = await fetch('/api/admin/check-permission', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        const data = await response.json();
        return {
          status: response.status,
          ok: response.ok,
          data: data
        };
      } catch (error) {
        return { error: error.message };
      }
    });
    
    console.log('API测试结果:', JSON.stringify(apiTestResult, null, 2));
    
    // 保持浏览器打开一段时间供手动检查
    console.log('\n⏰ 浏览器将保持打开30秒供手动检查...');
    await new Promise(resolve => setTimeout(resolve, 30000));
    
  } catch (error) {
    console.error('❌ 检查过程中发生错误:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// 运行检查
if (require.main === module) {
  checkFrontendTokens().catch(error => {
    console.error('❌ 检查失败:', error);
    process.exit(1);
  });
}

module.exports = { checkFrontendTokens };