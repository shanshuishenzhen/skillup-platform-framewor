/**
 * 测试管理员权限检查API
 */

const fetch = require('node-fetch');

// 从登录测试中获取的有效token
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxYzBjMjliNy0wNDdhLTRlM2EtYTVjZC1lYjBiMGViOGU3ZDMiLCJwaG9uZSI6IjEzODIzNzM4Mjc4Iiwicm9sZSI6IlNVUEVSX0FETUlOIiwicGVybWlzc2lvbnMiOlsidXNlcl9tYW5hZ2VtZW50IiwiY29udGVudF9tYW5hZ2VtZW50Iiwic3lzdGVtX3NldHRpbmdzIiwiZGF0YV9hbmFseXRpY3MiXSwidHlwZSI6ImFkbWluIiwiaWF0IjoxNzU2ODY3MzE1LCJleHAiOjE3NTY5NTM3MTV9.MoNnd_Samjn0_bis0EGl10wMrA9QQ7zyyPdCdMtjlLE';

async function testAdminPermission() {
  console.log('🔍 测试管理员权限检查API...');
  
  try {
    const response = await fetch('http://localhost:3000/api/admin/check-permission', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const result = await response.json();
    
    console.log('响应状态:', response.status);
    console.log('响应结果:', JSON.stringify(result, null, 2));
    
    if (response.ok) {
      console.log('✅ 管理员权限检查API测试通过');
    } else {
      console.log('❌ 管理员权限检查API测试失败');
    }
    
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error.message);
  }
}

async function testUserListAPI() {
  console.log('\n🔍 测试用户列表API...');
  
  try {
    const response = await fetch('http://localhost:3000/api/admin/users', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const result = await response.json();
    
    console.log('响应状态:', response.status);
    console.log('响应结果:', JSON.stringify(result, null, 2));
    
    if (response.ok) {
      console.log('✅ 用户列表API测试通过');
    } else {
      console.log('❌ 用户列表API测试失败');
    }
    
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error.message);
  }
}

async function main() {
  await testAdminPermission();
  await testUserListAPI();
}

main();