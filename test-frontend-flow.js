/**
 * 测试前端完整流程：登录 -> 权限检查 -> 用户列表
 * 模拟前端的实际请求流程
 */

const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';
const PHONE = '13823738278';
const PASSWORD = 'admin123';

// 模拟前端的完整流程
async function testFrontendFlow() {
  console.log('🔍 开始测试前端完整流程...');
  console.log('=' .repeat(50));
  
  try {
    // 步骤1: 登录
    console.log('\n📱 步骤1: 用户登录');
    const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phone: PHONE,
        password: PASSWORD
      })
    });
    
    if (!loginResponse.ok) {
      console.error('❌ 登录失败:', loginResponse.status, loginResponse.statusText);
      const errorText = await loginResponse.text();
      console.error('错误详情:', errorText);
      return;
    }
    
    const loginData = await loginResponse.json();
    console.log('✅ 登录成功');
    console.log('- Token存在:', !!loginData.token);
    console.log('- 用户角色:', loginData.user?.role);
    console.log('- 用户ID:', loginData.user?.id);
    
    const token = loginData.token;
    
    // 步骤2: 检查管理员权限
    console.log('\n🔐 步骤2: 检查管理员权限');
    const permissionResponse = await fetch(`${BASE_URL}/api/admin/check-permission`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('- 权限检查状态码:', permissionResponse.status);
    
    if (!permissionResponse.ok) {
      console.error('❌ 权限检查失败:', permissionResponse.status);
      const errorText = await permissionResponse.text();
      console.error('错误详情:', errorText);
      return;
    }
    
    const permissionData = await permissionResponse.json();
    console.log('✅ 权限检查通过');
    console.log('- 权限数据:', JSON.stringify(permissionData, null, 2));
    
    // 步骤3: 访问用户列表（模拟前端请求）
    console.log('\n👥 步骤3: 访问用户列表');
    const userListResponse = await fetch(`${BASE_URL}/api/admin/users?page=1&limit=10`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('- 用户列表请求状态码:', userListResponse.status);
    
    if (!userListResponse.ok) {
      console.error('❌ 用户列表访问失败:', userListResponse.status);
      const errorText = await userListResponse.text();
      console.error('错误详情:', errorText);
      
      // 分析错误类型
      if (userListResponse.status === 401) {
        console.log('\n🔍 401错误分析:');
        console.log('- 可能原因: Token无效或已过期');
        console.log('- 建议: 检查token格式和有效期');
      } else if (userListResponse.status === 403) {
        console.log('\n🔍 403错误分析:');
        console.log('- 可能原因: 权限不足');
        console.log('- 建议: 检查用户角色配置');
      }
      return;
    }
    
    const userListData = await userListResponse.json();
    console.log('✅ 用户列表访问成功');
    console.log('- 用户数量:', userListData.users?.length || 0);
    console.log('- 总数:', userListData.total);
    console.log('- 分页信息:', {
      page: userListData.page,
      limit: userListData.limit,
      totalPages: userListData.totalPages
    });
    
    // 步骤4: 测试其他管理员功能
    console.log('\n⚙️ 步骤4: 测试其他管理员功能');
    
    // 测试课程管理权限
    const courseResponse = await fetch(`${BASE_URL}/api/admin/courses?page=1&limit=5`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('- 课程管理访问状态:', courseResponse.status);
    
    console.log('\n🎉 前端流程测试完成!');
    console.log('=' .repeat(50));
    
  } catch (error) {
    console.error('❌ 测试过程中发生异常:', error.message);
    console.error('错误堆栈:', error.stack);
  }
}

// 运行测试
testFrontendFlow().catch(console.error);