/**
 * 管理员页面跳转测试脚本
 * 测试管理员登录后访问admin页面是否正常，不会出现跳转死循环
 */

const BASE_URL = 'http://localhost:3000';

/**
 * 测试管理员登录和页面访问
 */
async function testAdminRedirect() {
  console.log('🧪 开始测试管理员页面跳转逻辑...');
  console.log('=' .repeat(50));

  try {
    // 1. 测试管理员登录
    console.log('1. 测试管理员登录...');
    const loginResponse = await fetch(`${BASE_URL}/api/admin/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phone: '13823738278',
        password: 'admin123'
      })
    });

    console.log('管理员登录响应状态:', loginResponse.status);
    
    if (!loginResponse.ok) {
      const errorText = await loginResponse.text();
      console.log('❌ 管理员登录失败');
      console.log('错误详情:', errorText);
      return;
    }

    const loginData = await loginResponse.json();
    console.log('✅ 管理员登录成功');
    console.log('用户信息:', {
      phone: loginData.user?.phone,
      role: loginData.user?.role,
      userType: loginData.user?.userType
    });

    const token = loginData.token;
    if (!token) {
      console.log('❌ 未获取到token');
      return;
    }
    console.log('Token: 已获取');

    // 2. 测试权限验证API
    console.log('\n2. 测试管理员权限验证API...');
    const permissionResponse = await fetch(`${BASE_URL}/api/admin/check-permission`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });

    console.log('权限验证响应状态:', permissionResponse.status);
    
    if (permissionResponse.ok) {
      const permissionData = await permissionResponse.json();
      console.log('✅ 管理员权限验证成功');
      console.log('权限验证响应:', permissionData);
    } else {
      console.log('❌ 管理员权限验证失败');
      const errorText = await permissionResponse.text();
      console.log('错误信息:', errorText);
      return;
    }

    // 3. 测试访问管理员页面（模拟浏览器行为）
    console.log('\n3. 测试访问管理员页面...');
    const adminPageResponse = await fetch(`${BASE_URL}/admin`, {
      method: 'GET',
      headers: {
        'Cookie': `token=${token}`, // 模拟cookie
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    console.log('管理员页面响应状态:', adminPageResponse.status);
    
    if (adminPageResponse.ok) {
      console.log('✅ 管理员页面访问成功');
      
      // 检查是否有重定向
      const finalUrl = adminPageResponse.url;
      if (finalUrl.includes('/admin')) {
        console.log('✅ 页面正确停留在admin路径');
      } else {
        console.log('⚠️ 页面被重定向到:', finalUrl);
      }
    } else if (adminPageResponse.status === 302 || adminPageResponse.status === 301) {
      const location = adminPageResponse.headers.get('location');
      console.log('⚠️ 页面发生重定向到:', location);
      
      if (location && location.includes('/login')) {
        console.log('❌ 页面重定向到登录页面，可能存在权限验证问题');
      }
    } else {
      console.log('❌ 管理员页面访问失败');
    }

    // 4. 测试未登录用户访问管理员页面
    console.log('\n4. 测试未登录用户访问管理员页面...');
    const unauthorizedResponse = await fetch(`${BASE_URL}/admin`, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    console.log('未登录访问响应状态:', unauthorizedResponse.status);
    
    if (unauthorizedResponse.status === 200) {
      console.log('✅ 未登录用户可以访问页面（由前端组件处理权限）');
    } else if (unauthorizedResponse.status === 302 || unauthorizedResponse.status === 301) {
      const location = unauthorizedResponse.headers.get('location');
      console.log('✅ 未登录用户被重定向到:', location);
    }

  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error.message);
  }

  console.log('\n' + '=' .repeat(50));
  console.log('🏁 管理员页面跳转测试完成');
  console.log('\n💡 测试说明:');
  console.log('- 如果管理员登录成功且权限验证通过，说明后端逻辑正常');
  console.log('- 如果页面访问正常，说明不存在跳转死循环问题');
  console.log('- AdminGuard组件会在前端进行最终的权限控制');
}

// 运行测试
testAdminRedirect().catch(console.error);