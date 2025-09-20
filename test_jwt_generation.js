/**
 * JWT Token生成和验证测试脚本
 * 测试用户13823738278的登录和token生成过程
 */

const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Supabase配置
const supabaseUrl = 'https://dadngnjejmxmoxakrcgj.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhZG5nbmplam14bW94YWtyY2dqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTU0MjQzNywiZXhwIjoyMDcxMTE4NDM3fQ.rQCglJAXUBtoS-QSWRViZxIRjqxBf19MsD73Kh_Xg4o';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// JWT密钥（从环境变量或默认值）
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

/**
 * 模拟管理员登录过程
 */
async function testAdminLogin() {
  try {
    console.log('=== 测试管理员登录和JWT生成 ===\n');
    
    const phone = '13823738278';
    const password = 'admin123'; // 假设的密码
    
    // 1. 查找管理员用户
    console.log('1. 查找管理员用户:');
    const { data: adminUser, error: adminError } = await supabase
      .from('admin_users')
      .select('*')
      .eq('phone', phone)
      .single();
    
    if (adminError) {
      console.log('❌ 查找管理员失败:', adminError);
      return;
    }
    
    console.log('✅ 找到管理员用户:');
    console.log(`- ID: ${adminUser.id}`);
    console.log(`- 用户名: ${adminUser.username}`);
    console.log(`- 手机号: ${adminUser.phone}`);
    console.log(`- 角色: ${adminUser.role}`);
    console.log(`- 状态: ${adminUser.status}`);
    
    // 2. 验证密码（这里我们跳过密码验证，直接生成token）
    console.log('\n2. 生成JWT Token:');
    
    // 模拟generateAdminToken函数的逻辑
    const tokenPayload = {
      id: adminUser.id,
      phone: adminUser.phone,
      username: adminUser.username,
      role: adminUser.role === 'super_admin' ? 'SUPER_ADMIN' : 'ADMIN', // 转换为RBAC枚举
      permissions: adminUser.permissions || [],
      type: 'admin'
    };
    
    const token = jwt.sign(tokenPayload, JWT_SECRET, {
      expiresIn: '24h',
      issuer: 'skillup-platform'
    });
    
    console.log('✅ JWT Token生成成功:');
    console.log('Token Payload:', JSON.stringify(tokenPayload, null, 2));
    console.log('Token:', token.substring(0, 50) + '...');
    
    // 3. 验证token
    console.log('\n3. 验证JWT Token:');
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      console.log('✅ Token验证成功:');
      console.log('Decoded Payload:', JSON.stringify(decoded, null, 2));
    } catch (verifyError) {
      console.log('❌ Token验证失败:', verifyError.message);
    }
    
    // 4. 测试前端权限检查函数
    console.log('\n4. 测试前端权限检查:');
    
    // 模拟hasAdminPermission函数
    function hasAdminPermission(role) {
      const adminRoles = ['admin', 'super_admin', 'ADMIN', 'SUPER_ADMIN'];
      return adminRoles.includes(role);
    }
    
    const frontendCheck1 = hasAdminPermission(tokenPayload.role); // RBAC枚举格式
    const frontendCheck2 = hasAdminPermission(adminUser.role); // 数据库原始格式
    
    console.log(`前端权限检查 (RBAC格式 '${tokenPayload.role}'): ${frontendCheck1 ? '✅ 通过' : '❌ 失败'}`);
    console.log(`前端权限检查 (数据库格式 '${adminUser.role}'): ${frontendCheck2 ? '✅ 通过' : '❌ 失败'}`);
    
    // 5. 测试API调用
    console.log('\n5. 测试API调用:');
    
    // 模拟调用用户列表API
    try {
      const response = await fetch('http://localhost:3000/api/admin/users', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ 用户列表API调用成功');
        console.log(`返回用户数量: ${data.data?.length || 0}`);
      } else {
        console.log('❌ 用户列表API调用失败:', response.status, response.statusText);
        const errorText = await response.text();
        console.log('错误详情:', errorText);
      }
    } catch (fetchError) {
      console.log('❌ API调用异常:', fetchError.message);
    }
    
    console.log('\n=== 测试完成 ===');
    
  } catch (error) {
    console.error('测试过程中发生错误:', error);
  }
}

testAdminLogin();