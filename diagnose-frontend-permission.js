/**
 * 前端权限诊断脚本
 * 模拟前端AdminGuard组件的权限验证流程
 * 用于诊断用户13823738278在前端显示无权限的问题
 */

const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';
const API_BASE_URL = 'http://localhost:3000';

// 测试用的管理员凭据
const ADMIN_CREDENTIALS = {
  phone: '13823738278',
  password: 'admin123'
};

/**
 * 模拟前端登录流程
 */
async function simulateFrontendLogin() {
  console.log('\n=== 步骤1: 模拟前端登录流程 ===');
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/admin/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(ADMIN_CREDENTIALS)
    });
    
    const result = await response.json();
    
    console.log('📊 登录响应状态:', response.status);
    console.log('📊 登录响应数据:', {
      success: result.success,
      hasToken: !!result.token,
      hasUser: !!result.user,
      userRole: result.user?.role,
      userType: result.user?.type
    });
    
    if (!result.success || !result.token) {
      console.log('❌ 前端登录失败');
      return null;
    }
    
    console.log('✅ 前端登录成功');
    
    // 模拟前端存储token和用户信息
    const mockLocalStorage = {
      token: result.token,
      user: JSON.stringify(result.user)
    };
    
    console.log('💾 模拟localStorage存储:', {
      hasToken: !!mockLocalStorage.token,
      hasUser: !!mockLocalStorage.user,
      tokenLength: mockLocalStorage.token.length,
      userInfo: JSON.parse(mockLocalStorage.user)
    });
    
    return {
      token: result.token,
      user: result.user,
      localStorage: mockLocalStorage
    };
    
  } catch (error) {
    console.log('❌ 前端登录异常:', error.message);
    return null;
  }
}

/**
 * 模拟前端JWT Token解析
 */
function simulateFrontendTokenParsing(token) {
  console.log('\n=== 步骤2: 模拟前端JWT Token解析 ===');
  
  try {
    // 模拟前端的JWT解析逻辑
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.log('❌ Token格式无效');
      return null;
    }
    
    console.log('📊 Token结构:', {
      parts: parts.length,
      headerLength: parts[0].length,
      payloadLength: parts[1].length,
      signatureLength: parts[2].length
    });
    
    // 解析payload
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    
    console.log('📊 Token Payload:', {
      userId: payload.userId,
      phone: payload.phone,
      role: payload.role,
      roleType: typeof payload.role,
      exp: payload.exp,
      iat: payload.iat,
      isExpired: payload.exp < Math.floor(Date.now() / 1000)
    });
    
    // 检查token是否过期
    if (payload.exp < Math.floor(Date.now() / 1000)) {
      console.log('❌ Token已过期');
      return null;
    }
    
    console.log('✅ Token解析成功且未过期');
    return payload;
    
  } catch (error) {
    console.log('❌ Token解析失败:', error.message);
    return null;
  }
}

/**
 * 模拟前端hasAdminPermission函数
 */
function simulateHasAdminPermission(tokenPayload) {
  console.log('\n=== 步骤3: 模拟前端hasAdminPermission检查 ===');
  
  if (!tokenPayload) {
    console.log('❌ 无Token Payload');
    return false;
  }
  
  const userRole = tokenPayload.role;
  console.log('📊 角色检查详情:', {
    userRole,
    roleType: typeof userRole,
    isAdmin: userRole === 'admin',
    isSuperAdmin: userRole === 'super_admin',
    isAdminUpperCase: userRole === 'ADMIN',
    isSuperAdminUpperCase: userRole === 'SUPER_ADMIN',
    adminRoleComparison: {
      'admin': userRole === 'admin',
      'super_admin': userRole === 'super_admin',
      'ADMIN': userRole === 'ADMIN',
      'SUPER_ADMIN': userRole === 'SUPER_ADMIN'
    }
  });
  
  // 模拟前端的权限检查逻辑
  const hasAdminAccess = userRole === 'admin' || userRole === 'super_admin' || 
                        userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';
  
  console.log('🎯 权限检查结果:', {
    hasAdminAccess,
    checkLogic: 'userRole === "admin" || userRole === "super_admin" || userRole === "ADMIN" || userRole === "SUPER_ADMIN"'
  });
  
  if (!hasAdminAccess) {
    console.log('❌ 前端权限检查失败');
    console.log('📊 失败原因分析:', {
      expectedRoles: ['admin', 'super_admin', 'ADMIN', 'SUPER_ADMIN'],
      actualRole: userRole,
      possibleIssues: [
        '角色大小写不匹配',
        '角色值不在预期范围内',
        'Token中角色字段缺失或格式错误'
      ]
    });
  } else {
    console.log('✅ 前端权限检查通过');
  }
  
  return hasAdminAccess;
}

/**
 * 模拟前端远程权限验证
 */
async function simulateRemotePermissionCheck(token) {
  console.log('\n=== 步骤4: 模拟前端远程权限验证 ===');
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/admin/check-permission`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('📊 远程权限验证响应:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('📊 远程权限验证结果:', result);
      console.log('✅ 远程权限验证成功');
      return true;
    } else {
      const errorText = await response.text();
      console.log('❌ 远程权限验证失败:', {
        status: response.status,
        error: errorText
      });
      return false;
    }
    
  } catch (error) {
    console.log('❌ 远程权限验证异常:', error.message);
    return false;
  }
}

/**
 * 模拟前端用户列表API调用
 */
async function simulateFrontendUserListAPI(token) {
  console.log('\n=== 步骤5: 模拟前端用户列表API调用 ===');
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/admin/users?page=1&limit=10`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('📊 用户列表API响应:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('📊 用户列表API结果:', {
        success: result.success,
        userCount: result.data?.users?.length || 0,
        total: result.data?.pagination?.total || 0
      });
      console.log('✅ 用户列表API调用成功');
      return true;
    } else {
      const errorText = await response.text();
      console.log('❌ 用户列表API调用失败:', {
        status: response.status,
        error: errorText
      });
      
      // 分析具体的错误原因
      if (response.status === 401) {
        console.log('🔍 错误分析: 认证失败 - Token可能无效或已过期');
      } else if (response.status === 403) {
        console.log('🔍 错误分析: 权限不足 - 用户角色不满足API要求');
      } else if (response.status >= 500) {
        console.log('🔍 错误分析: 服务器错误 - 后端处理异常');
      }
      
      return false;
    }
    
  } catch (error) {
    console.log('❌ 用户列表API调用异常:', error.message);
    return false;
  }
}

/**
 * 模拟前端AdminGuard组件的完整验证流程
 */
async function simulateAdminGuardFlow(loginData) {
  console.log('\n=== 步骤6: 模拟AdminGuard组件验证流程 ===');
  
  const { token, user, localStorage } = loginData;
  
  // 1. 检查用户登录状态
  console.log('🔍 检查用户登录状态:', {
    hasToken: !!localStorage.token,
    hasUser: !!localStorage.user,
    userFromStorage: JSON.parse(localStorage.user)
  });
  
  if (!localStorage.token || !localStorage.user) {
    console.log('❌ AdminGuard: 用户未登录');
    return false;
  }
  
  // 2. 解析和验证Token
  const tokenPayload = simulateFrontendTokenParsing(localStorage.token);
  if (!tokenPayload) {
    console.log('❌ AdminGuard: Token解析失败');
    return false;
  }
  
  // 3. 本地权限检查
  const hasLocalPermission = simulateHasAdminPermission(tokenPayload);
  if (!hasLocalPermission) {
    console.log('❌ AdminGuard: 本地权限检查失败');
    return false;
  }
  
  // 4. 远程权限验证（可选）
  const hasRemotePermission = await simulateRemotePermissionCheck(localStorage.token);
  if (!hasRemotePermission) {
    console.log('⚠️ AdminGuard: 远程权限验证失败，但可能不影响本地验证');
  }
  
  console.log('✅ AdminGuard: 权限验证流程完成');
  return hasLocalPermission;
}

/**
 * 主诊断函数
 */
async function runFrontendDiagnosis() {
  console.log('🚀 开始前端权限诊断...');
  console.log('='.repeat(60));
  
  try {
    // 1. 模拟前端登录
    const loginData = await simulateFrontendLogin();
    if (!loginData) {
      console.log('\n❌ 前端登录失败，无法继续诊断');
      return;
    }
    
    // 2. 模拟AdminGuard验证流程
    const adminGuardResult = await simulateAdminGuardFlow(loginData);
    
    // 3. 测试用户列表API
    const userListResult = await simulateFrontendUserListAPI(loginData.token);
    
    // 4. 生成诊断报告
    console.log('\n=== 🎯 前端权限诊断报告 ===');
    console.log('📊 登录状态:', {
      loginSuccess: !!loginData,
      hasToken: !!loginData?.token,
      hasUser: !!loginData?.user,
      userRole: loginData?.user?.role
    });
    
    console.log('🛡️ AdminGuard验证:', {
      localPermissionCheck: adminGuardResult,
      shouldAllowAccess: adminGuardResult
    });
    
    console.log('📋 API调用测试:', {
      userListAPI: userListResult
    });
    
    // 5. 问题分析和建议
    console.log('\n=== 🔍 问题分析 ===');
    if (adminGuardResult && userListResult) {
      console.log('✅ 前端权限验证正常，可能是浏览器缓存或网络问题');
      console.log('💡 建议解决方案:');
      console.log('   1. 清除浏览器缓存和localStorage');
      console.log('   2. 硬刷新页面 (Ctrl+F5)');
      console.log('   3. 检查浏览器控制台是否有JavaScript错误');
      console.log('   4. 检查网络请求是否被拦截');
    } else if (!adminGuardResult) {
      console.log('❌ 前端本地权限检查失败');
      console.log('💡 可能原因:');
      console.log('   1. Token中的角色字段格式不正确');
      console.log('   2. 前端权限检查逻辑与后端不一致');
      console.log('   3. Token解析过程中角色信息丢失');
    } else if (!userListResult) {
      console.log('❌ 用户列表API调用失败');
      console.log('💡 可能原因:');
      console.log('   1. 后端权限验证逻辑问题');
      console.log('   2. Token在传输过程中被修改');
      console.log('   3. API路由或中间件配置问题');
    }
    
  } catch (error) {
    console.log('❌ 前端权限诊断过程中发生异常:', error.message);
    console.log('📊 错误详情:', error);
  }
  
  console.log('\n🏁 前端权限诊断完成');
}

// 运行诊断
if (require.main === module) {
  runFrontendDiagnosis();
}

module.exports = {
  runFrontendDiagnosis,
  simulateFrontendLogin,
  simulateHasAdminPermission,
  simulateAdminGuardFlow
};