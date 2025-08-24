const fetch = require('node-fetch');

// 测试配置
const baseUrl = 'http://localhost:3000';
const adminPhone = '13823738278';
const adminPassword = '123456';

/**
 * 管理员登录获取JWT token
 */
async function adminLogin() {
  try {
    console.log('🔐 正在进行管理员登录...');
    
    const response = await fetch(`${baseUrl}/api/admin/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phone: adminPhone,
        password: adminPassword
      })
    });

    const data = await response.json();
    console.log('登录响应状态:', response.status, response.statusText);
    console.log('登录响应数据:', JSON.stringify(data, null, 2));
    
    if (response.ok && data.success) {
      console.log('✅ 管理员登录成功');
      return data.token;
    } else {
      console.error('❌ 管理员登录失败:', data.message || '未知错误');
      return null;
    }
  } catch (error) {
    console.error('❌ 登录请求失败:', error.message);
    return null;
  }
}

/**
 * 测试用户列表API
 */
async function testUserListAPI(token) {
  try {
    console.log('\n📋 正在测试用户列表API...');
    
    const response = await fetch(`${baseUrl}/api/admin/users?page=1&limit=50`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });

    console.log(`API响应状态: ${response.status} ${response.statusText}`);
    
    const data = await response.json();
    console.log('解析后的响应:', JSON.stringify(data, null, 2));
    
    if (response.ok && data.success) {
      console.log('\n✅ 用户列表API调用成功!');
      console.log(`总用户数: ${data.users ? data.users.length : 0}`);
      
      if (data.users && data.users.length > 0) {
        console.log('\n用户列表:');
        data.users.forEach((user, index) => {
          console.log(`${index + 1}. ${user.name || user.username || '未知'} (${user.phone || user.email || '无联系方式'}) - 角色: ${user.role || '未知'} - 来源: ${user.import_source || '未知'}`);
        });
        
        // 统计导入来源
        const importSources = {};
        data.users.forEach(user => {
          const source = user.import_source || 'unknown';
          importSources[source] = (importSources[source] || 0) + 1;
        });
        
        console.log('\n按导入来源统计:');
        Object.entries(importSources).forEach(([source, count]) => {
          console.log(`${source}: ${count} 个用户`);
        });
        
        // 检查是否包含Excel导入的用户
        const excelImportedUsers = data.users.filter(user => user.import_source === 'excel_import');
        console.log(`\nExcel导入的用户数: ${excelImportedUsers.length}`);
        
        if (excelImportedUsers.length > 0) {
          console.log('\nExcel导入的用户:');
          excelImportedUsers.forEach((user, index) => {
            console.log(`${index + 1}. ${user.name || user.username || '未知'} (${user.phone || user.email || '无联系方式'}) - 角色: ${user.role || '未知'}`);
          });
        }
      } else {
        console.log('⚠️ 用户列表为空');
      }
      
      return true;
    } else {
      console.error('❌ 用户列表API调用失败:', data.message || '未知错误');
      return false;
    }
  } catch (error) {
    console.error('❌ 用户列表API请求失败:', error.message);
    return false;
  }
}

/**
 * 主测试函数
 */
async function runTests() {
  console.log('🚀 开始测试用户列表API...');
  console.log('='.repeat(50));
  
  // 1. 管理员登录
  const token = await adminLogin();
  if (!token) {
    console.log('\n❌ 无法获取认证token，测试终止');
    return;
  }
  
  // 2. 测试用户列表API
  const listSuccess = await testUserListAPI(token);
  
  console.log('\n' + '='.repeat(50));
  console.log('=== 测试总结 ===');
  console.log(`用户列表API测试: ${listSuccess ? '✅ 成功' : '❌ 失败'}`);
  
  if (listSuccess) {
    console.log('\n🎉 用户列表API工作正常，能够正确返回用户数据');
  } else {
    console.log('\n⚠️ 用户列表API存在问题，需要进一步检查');
  }
  
  console.log('\n🏁 测试完成');
}

// 运行测试
runTests().catch(console.error);