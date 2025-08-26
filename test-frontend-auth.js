/**
 * 前端权限验证测试脚本
 * 模拟浏览器环境来诊断管理员权限验证问题
 * 
 * 功能：
 * 1. 模拟管理员登录流程
 * 2. 模拟localStorage token存储
 * 3. 测试AdminGuard组件权限检查逻辑
 * 4. 测试useAuth hook权限验证
 * 5. 输出详细调试信息
 */

const fetch = require('node-fetch');
const jwt = require('jsonwebtoken');

// 模拟浏览器localStorage
class MockLocalStorage {
  constructor() {
    this.store = {};
  }

  getItem(key) {
    return this.store[key] || null;
  }

  setItem(key, value) {
    this.store[key] = String(value);
  }

  removeItem(key) {
    delete this.store[key];
  }

  clear() {
    this.store = {};
  }

  // 调试方法：显示所有存储的数据
  debug() {
    console.log('📦 localStorage内容:', this.store);
  }
}

// 创建模拟localStorage实例
const mockLocalStorage = new MockLocalStorage();

/**
 * 模拟管理员登录API调用
 * @param {string} phone - 管理员手机号
 * @param {string} password - 管理员密码
 * @returns {Promise<Object>} 登录结果
 */
async function simulateAdminLogin(phone, password) {
  console.log('\n🔐 开始模拟管理员登录...');
  console.log(`📱 手机号: ${phone}`);
  console.log(`🔑 密码: ${password}`);

  try {
    const response = await fetch('http://localhost:3000/api/admin/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ phone, password })
    });

    console.log(`📡 登录API响应状态: ${response.status}`);

    if (response.ok) {
      const data = await response.json();
      console.log('✅ 登录成功');
      console.log('👤 用户信息:', {
        id: data.user?.id,
        phone: data.user?.phone,
        role: data.user?.role,
        real_name: data.user?.real_name
      });
      
      // 模拟前端存储token到localStorage
      if (data.token) {
        mockLocalStorage.setItem('auth_token', data.token);
        console.log('💾 Token已存储到localStorage');
        
        // 解析并显示token内容
        try {
          const decoded = jwt.decode(data.token);
          console.log('🔍 Token解析结果:', {
            userId: decoded.userId,
            phone: decoded.phone,
            role: decoded.role,
            type: decoded.type,
            exp: new Date(decoded.exp * 1000).toLocaleString()
          });
        } catch (err) {
          console.log('❌ Token解析失败:', err.message);
        }
      }
      
      return { success: true, data };
    } else {
      const errorData = await response.json();
      console.log('❌ 登录失败:', errorData.error);
      return { success: false, error: errorData.error };
    }
  } catch (error) {
    console.log('💥 登录请求异常:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * 模拟useAuth hook的权限检查逻辑
 * @returns {Promise<Object>} 权限检查结果
 */
async function simulateUseAuthCheck() {
  console.log('\n🔍 开始模拟useAuth权限检查...');
  
  // 1. 检查localStorage中的token
  const token = mockLocalStorage.getItem('auth_token');
  if (!token) {
    console.log('❌ localStorage中没有找到auth_token');
    return { isLoggedIn: false, user: null, error: 'No token found' };
  }
  
  console.log('✅ 在localStorage中找到token');
  
  // 2. 验证token格式和有效性
  try {
    const decoded = jwt.decode(token);
    if (!decoded) {
      console.log('❌ Token解码失败');
      return { isLoggedIn: false, user: null, error: 'Invalid token format' };
    }
    
    // 检查token是否过期
    const now = Math.floor(Date.now() / 1000);
    if (decoded.exp && decoded.exp < now) {
      console.log('❌ Token已过期');
      console.log(`⏰ 过期时间: ${new Date(decoded.exp * 1000).toLocaleString()}`);
      console.log(`⏰ 当前时间: ${new Date().toLocaleString()}`);
      return { isLoggedIn: false, user: null, error: 'Token expired' };
    }
    
    console.log('✅ Token格式有效且未过期');
    
    // 3. 构造用户对象（模拟useAuth的逻辑）
    const user = {
      id: decoded.userId,
      phone: decoded.phone,
      role: decoded.role,
      type: decoded.type
    };
    
    console.log('👤 模拟用户对象:', user);
    
    return { isLoggedIn: true, user, error: null };
    
  } catch (error) {
    console.log('❌ Token处理异常:', error.message);
    return { isLoggedIn: false, user: null, error: error.message };
  }
}

/**
 * 模拟AdminGuard组件的权限检查API调用
 * @returns {Promise<Object>} 权限检查结果
 */
async function simulateAdminGuardCheck() {
  console.log('\n🛡️ 开始模拟AdminGuard权限检查...');
  
  const token = mockLocalStorage.getItem('auth_token');
  if (!token) {
    console.log('❌ 没有token，无法进行权限检查');
    return { isAdmin: false, error: 'No token' };
  }
  
  try {
    console.log('📡 调用权限检查API...');
    const response = await fetch('http://localhost:3000/api/admin/check-permission', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`📡 权限检查API响应状态: ${response.status}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ 权限检查成功');
      console.log('🔐 权限检查结果:', data);
      return { isAdmin: true, data };
    } else {
      const errorData = await response.json();
      console.log('❌ 权限检查失败');
      console.log('🚫 错误信息:', errorData);
      return { isAdmin: false, error: errorData };
    }
  } catch (error) {
    console.log('💥 权限检查请求异常:', error.message);
    return { isAdmin: false, error: error.message };
  }
}

/**
 * 模拟前端页面访问流程
 * @returns {Promise<Object>} 页面访问结果
 */
async function simulatePageAccess() {
  console.log('\n🌐 开始模拟前端页面访问流程...');
  
  // 1. 模拟useAuth检查
  const authResult = await simulateUseAuthCheck();
  if (!authResult.isLoggedIn) {
    console.log('🚫 用户未登录，应该重定向到登录页');
    return { 
      canAccess: false, 
      reason: 'Not logged in',
      shouldRedirect: '/admin/login',
      authResult 
    };
  }
  
  console.log('✅ 用户已登录');
  
  // 2. 模拟AdminGuard权限检查
  const adminResult = await simulateAdminGuardCheck();
  if (!adminResult.isAdmin) {
    console.log('🚫 用户没有管理员权限，应该显示权限不足页面');
    return { 
      canAccess: false, 
      reason: 'Insufficient permissions',
      shouldShow: 'Permission denied page',
      authResult,
      adminResult 
    };
  }
  
  console.log('✅ 用户具有管理员权限');
  
  return { 
    canAccess: true, 
    reason: 'All checks passed',
    authResult,
    adminResult 
  };
}

/**
 * 诊断权限验证问题
 * @returns {Promise<void>}
 */
async function diagnosePermissionIssue() {
  console.log('🔧 开始诊断前端权限验证问题...');
  console.log('=' .repeat(60));
  
  // 清空localStorage开始测试
  mockLocalStorage.clear();
  console.log('🧹 已清空localStorage');
  
  // 1. 测试管理员登录
  const loginResult = await simulateAdminLogin('13823738278', '123456');
  if (!loginResult.success) {
    console.log('\n❌ 登录失败，无法继续测试');
    return;
  }
  
  // 2. 显示localStorage状态
  console.log('\n📦 localStorage状态:');
  mockLocalStorage.debug();
  
  // 3. 测试完整的页面访问流程
  const accessResult = await simulatePageAccess();
  
  // 4. 输出诊断结果
  console.log('\n' + '=' .repeat(60));
  console.log('🎯 诊断结果总结:');
  console.log('=' .repeat(60));
  
  if (accessResult.canAccess) {
    console.log('✅ 前端权限验证流程正常');
    console.log('✅ 用户应该能够访问管理员页面');
    console.log('\n🤔 如果浏览器中仍然显示"权限不足"，可能的原因:');
    console.log('   1. 浏览器缓存问题 - 尝试清除缓存或使用无痕模式');
    console.log('   2. 前端代码热重载问题 - 尝试刷新页面');
    console.log('   3. localStorage同步问题 - 检查浏览器开发者工具中的localStorage');
    console.log('   4. 网络请求被拦截 - 检查浏览器网络面板');
  } else {
    console.log('❌ 前端权限验证存在问题');
    console.log(`🚫 失败原因: ${accessResult.reason}`);
    
    if (accessResult.reason === 'Not logged in') {
      console.log('\n🔍 登录状态问题分析:');
      console.log('   - Token存储:', accessResult.authResult.error);
      console.log('   - 建议: 检查登录后token是否正确存储到localStorage');
    } else if (accessResult.reason === 'Insufficient permissions') {
      console.log('\n🔍 权限检查问题分析:');
      console.log('   - 用户登录状态: ✅ 正常');
      console.log('   - 权限检查失败:', accessResult.adminResult.error);
      console.log('   - 建议: 检查权限检查API的实现和数据库中的用户角色');
    }
  }
  
  // 5. 提供调试建议
  console.log('\n🛠️ 调试建议:');
  console.log('1. 在浏览器中打开开发者工具 (F12)');
  console.log('2. 检查Application -> Local Storage -> http://localhost:3000');
  console.log('3. 确认auth_token是否存在且有效');
  console.log('4. 检查Network面板中的API请求和响应');
  console.log('5. 检查Console面板中的错误信息');
  
  console.log('\n📋 测试完成!');
}

// 运行诊断
if (require.main === module) {
  diagnosePermissionIssue().catch(console.error);
}

module.exports = {
  simulateAdminLogin,
  simulateUseAuthCheck,
  simulateAdminGuardCheck,
  simulatePageAccess,
  diagnosePermissionIssue,
  mockLocalStorage
};