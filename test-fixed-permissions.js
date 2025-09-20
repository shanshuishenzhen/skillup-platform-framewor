/**
 * 测试修复后的权限验证系统
 * 验证RBAC中间件的角色转换和权限检查是否正常工作
 */

const fs = require('fs');
const path = require('path');

// 模拟浏览器环境
global.localStorage = {
  data: {},
  getItem: function(key) {
    return this.data[key] || null;
  },
  setItem: function(key, value) {
    this.data[key] = value;
  },
  removeItem: function(key) {
    delete this.data[key];
  }
};

/**
 * 测试JWT token解析和权限验证
 */
async function testPermissionFix() {
  console.log('🔧 测试修复后的权限验证系统');
  console.log('=' .repeat(50));

  try {
    // 1. 检查localStorage中的token
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJhZG1pbjEyMyIsInBob25lIjoiYWRtaW4xMjMiLCJyb2xlIjoiU1VQRVJfQURNSU4iLCJwZXJtaXNzaW9ucyI6W10sInR5cGUiOiJhZG1pbiIsImlhdCI6MTc1NjIxNzA5MywiZXhwIjoxNzU2MzAzNDkzfQ.signature';
    
    console.log('\n📋 Token信息:');
    console.log('Token存在:', !!token);
    
    if (token) {
      // 解析token payload
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
          console.log('\n🔍 Token Payload:');
          console.log('- 用户ID:', payload.userId);
          console.log('- 手机号:', payload.phone);
          console.log('- 角色:', payload.role);
          console.log('- 角色类型:', typeof payload.role);
          console.log('- 权限:', payload.permissions);
          console.log('- 类型:', payload.type);
          console.log('- 签发时间:', new Date(payload.iat * 1000).toLocaleString());
          console.log('- 过期时间:', new Date(payload.exp * 1000).toLocaleString());
          console.log('- 是否过期:', payload.exp < Math.floor(Date.now() / 1000));
          
          // 2. 测试角色匹配逻辑
          console.log('\n🎯 角色匹配测试:');
          const userRole = payload.role;
          const requiredRoles = ['ADMIN', 'SUPER_ADMIN'];
          
          console.log('- 当前角色:', userRole);
          console.log('- 需要角色:', requiredRoles);
          console.log('- 角色匹配:', requiredRoles.includes(userRole));
          
          // 3. 测试管理员权限检查
          console.log('\n👑 管理员权限检查:');
          const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';
          const isSuperAdmin = userRole === 'SUPER_ADMIN';
          
          console.log('- 是否为管理员:', isAdmin);
          console.log('- 是否为超级管理员:', isSuperAdmin);
          
          // 4. 模拟API请求测试
          console.log('\n🌐 API权限测试:');
          
          const testApiCall = async (endpoint, description) => {
            try {
              console.log(`\n测试 ${description}:`);
              console.log(`- 端点: ${endpoint}`);
              
              const response = await fetch(`http://localhost:3001${endpoint}`, {
                method: 'GET',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                }
              });
              
              console.log(`- 状态码: ${response.status}`);
              console.log(`- 状态文本: ${response.statusText}`);
              
              if (response.ok) {
                const data = await response.json();
                console.log('- 响应成功 ✅');
                if (data.users) {
                  console.log(`- 用户数量: ${data.users.length}`);
                }
              } else {
                const errorData = await response.text();
                console.log('- 响应失败 ❌');
                console.log('- 错误信息:', errorData.substring(0, 200));
              }
            } catch (error) {
              console.log('- 请求失败 ❌');
              console.log('- 错误:', error.message);
            }
          };
          
          // 测试各个API端点
          await testApiCall('/api/admin/check-permission', '权限检查API');
          await testApiCall('/api/admin/users', '用户列表API');
          
        } else {
          console.log('❌ Token格式无效');
        }
      } catch (error) {
        console.log('❌ Token解析失败:', error.message);
      }
    } else {
      console.log('❌ 未找到Token');
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ 权限验证测试完成');
    
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error);
  }
}

// 运行测试
testPermissionFix().catch(console.error);