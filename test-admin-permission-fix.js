/**
 * 管理员权限修复验证脚本
 * 用于检查管理员权限问题是否已解决
 */

const fs = require('fs');
const path = require('path');

// 模拟fetch函数（Node.js环境）
const fetch = require('node-fetch').default || require('node-fetch');

// 配置
const BASE_URL = 'http://localhost:3001';
const ADMIN_PHONE = '13823738278';
const ADMIN_PASSWORD = '123456';

console.log('🔍 开始管理员权限修复验证...');
console.log('=' .repeat(50));

/**
 * 测试管理员登录
 */
async function testAdminLogin() {
  console.log('\n1. 测试管理员登录...');
  
  try {
    const response = await fetch(`${BASE_URL}/api/admin/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phone: ADMIN_PHONE,
        password: ADMIN_PASSWORD
      })
    });

    const data = await response.json();
    
    console.log(`   响应状态: ${response.status}`);
    console.log(`   响应数据: ${JSON.stringify(data, null, 2)}`);
    
    if (response.ok && data.success) {
      console.log('✅ 管理员登录成功');
      console.log(`   Token: ${data.token.substring(0, 20)}...`);
      console.log(`   用户ID: ${data.user.id}`);
      console.log(`   角色: ${data.user.role}`);
      return data.token;
    } else {
      console.log('❌ 管理员登录失败');
      console.log(`   错误: ${data.message || data.error || '未知错误'}`);
      return null;
    }
  } catch (error) {
    console.log('❌ 登录请求失败');
    console.log(`   错误: ${error.message}`);
    return null;
  }
}

/**
 * 测试权限检查API
 */
async function testPermissionCheck(token) {
  console.log('\n2. 测试权限检查API...');
  
  if (!token) {
    console.log('❌ 无法测试权限检查 - 缺少token');
    return false;
  }

  try {
    const response = await fetch(`${BASE_URL}/api/admin/check-permission`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });

    const data = await response.json();
    
    if (response.ok && data.success) {
      console.log('✅ 权限检查通过');
      console.log(`   用户ID: ${data.user.id}`);
      console.log(`   角色: ${data.user.role}`);
      console.log(`   权限: ${JSON.stringify(data.user.permissions)}`);
      return true;
    } else {
      console.log('❌ 权限检查失败');
      console.log(`   状态码: ${response.status}`);
      console.log(`   错误: ${data.message || '未知错误'}`);
      return false;
    }
  } catch (error) {
    console.log('❌ 权限检查请求失败');
    console.log(`   错误: ${error.message}`);
    return false;
  }
}

/**
 * 测试用户列表API
 */
async function testUserListAPI(token) {
  console.log('\n3. 测试用户列表API...');
  
  if (!token) {
    console.log('❌ 无法测试用户列表API - 缺少token');
    return false;
  }

  try {
    const response = await fetch(`${BASE_URL}/api/admin/users`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });

    const data = await response.json();
    
    if (response.ok && data.success) {
      console.log('✅ 用户列表API正常');
      console.log(`   用户数量: ${data.users ? data.users.length : 0}`);
      return true;
    } else {
      console.log('❌ 用户列表API失败');
      console.log(`   状态码: ${response.status}`);
      console.log(`   错误: ${data.message || '未知错误'}`);
      return false;
    }
  } catch (error) {
    console.log('❌ 用户列表API请求失败');
    console.log(`   错误: ${error.message}`);
    return false;
  }
}

/**
 * 检查AdminGuard组件文件
 */
function checkAdminGuardComponent() {
  console.log('\n4. 检查AdminGuard组件...');
  
  const adminGuardPath = path.join(__dirname, 'src', 'components', 'auth', 'AdminGuard.tsx');
  
  if (fs.existsSync(adminGuardPath)) {
    console.log('✅ AdminGuard组件文件存在');
    
    const content = fs.readFileSync(adminGuardPath, 'utf8');
    
    // 检查关键功能
    const hasUseAuth = content.includes('useAuth');
    const hasPermissionCheck = content.includes('check-permission');
    const hasErrorHandling = content.includes('权限不足');
    
    console.log(`   包含useAuth: ${hasUseAuth ? '✅' : '❌'}`);
    console.log(`   包含权限检查: ${hasPermissionCheck ? '✅' : '❌'}`);
    console.log(`   包含错误处理: ${hasErrorHandling ? '✅' : '❌'}`);
    
    return hasUseAuth && hasPermissionCheck && hasErrorHandling;
  } else {
    console.log('❌ AdminGuard组件文件不存在');
    return false;
  }
}

/**
 * 检查管理员页面文件
 */
function checkAdminPage() {
  console.log('\n5. 检查管理员页面...');
  
  const adminPagePath = path.join(__dirname, 'src', 'app', 'admin', 'page.tsx');
  
  if (fs.existsSync(adminPagePath)) {
    console.log('✅ 管理员页面文件存在');
    
    const content = fs.readFileSync(adminPagePath, 'utf8');
    
    // 检查是否使用AdminGuard
    const hasAdminGuard = content.includes('AdminGuard');
    
    console.log(`   使用AdminGuard: ${hasAdminGuard ? '✅' : '❌'}`);
    
    return hasAdminGuard;
  } else {
    console.log('❌ 管理员页面文件不存在');
    return false;
  }
}

/**
 * 主函数
 */
async function main() {
  try {
    // 1. 测试管理员登录
    const token = await testAdminLogin();
    
    // 2. 测试权限检查
    const permissionOk = await testPermissionCheck(token);
    
    // 3. 测试用户列表API
    const userListOk = await testUserListAPI(token);
    
    // 4. 检查前端组件
    const adminGuardOk = checkAdminGuardComponent();
    const adminPageOk = checkAdminPage();
    
    // 总结
    console.log('\n' + '='.repeat(50));
    console.log('📊 验证结果总结:');
    console.log(`   管理员登录: ${token ? '✅' : '❌'}`);
    console.log(`   权限检查API: ${permissionOk ? '✅' : '❌'}`);
    console.log(`   用户列表API: ${userListOk ? '✅' : '❌'}`);
    console.log(`   AdminGuard组件: ${adminGuardOk ? '✅' : '❌'}`);
    console.log(`   管理员页面: ${adminPageOk ? '✅' : '❌'}`);
    
    const allOk = token && permissionOk && userListOk && adminGuardOk && adminPageOk;
    
    if (allOk) {
      console.log('\n🎉 所有检查都通过！管理员权限系统正常工作。');
      console.log('\n💡 如果仍然看到权限错误，请尝试:');
      console.log('   1. 清除浏览器缓存和localStorage');
      console.log('   2. 重新登录管理员账号');
      console.log('   3. 检查浏览器控制台是否有JavaScript错误');
    } else {
      console.log('\n⚠️  发现问题，需要进一步修复。');
      
      if (!token) {
        console.log('\n🔧 修复建议 - 登录问题:');
        console.log('   1. 检查管理员账号是否存在于数据库');
        console.log('   2. 验证密码是否正确');
        console.log('   3. 检查登录API实现');
      }
      
      if (!permissionOk) {
        console.log('\n🔧 修复建议 - 权限检查问题:');
        console.log('   1. 检查JWT token是否包含正确的角色信息');
        console.log('   2. 验证RBAC中间件实现');
        console.log('   3. 检查数据库中的用户角色');
      }
      
      if (!adminGuardOk || !adminPageOk) {
        console.log('\n🔧 修复建议 - 前端组件问题:');
        console.log('   1. 重新生成AdminGuard组件');
        console.log('   2. 确保管理员页面正确使用AdminGuard');
        console.log('   3. 检查前端权限验证逻辑');
      }
    }
    
  } catch (error) {
    console.log('\n❌ 验证过程中发生错误:');
    console.log(`   ${error.message}`);
    console.log(`   ${error.stack}`);
  }
}

// 运行验证
main().catch(console.error);