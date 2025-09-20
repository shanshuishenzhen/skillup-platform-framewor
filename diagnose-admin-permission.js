/**
 * 管理员权限问题详细诊断脚本
 * 用于诊断管理员用户13823738278的权限验证问题
 * 检查数据库状态、JWT token生成、权限验证逻辑等
 */

const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fetch = require('node-fetch');

// 环境变量配置
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 缺少必要的环境变量');
  console.error('请确保设置了 NEXT_PUBLIC_SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * 检查管理员用户在数据库中的状态
 * @param {string} phone - 管理员手机号
 * @returns {Promise<Object>} 用户信息和状态
 */
async function checkAdminUserInDatabase(phone) {
  console.log('\n🔍 检查管理员用户数据库状态...');
  console.log(`查询手机号: ${phone}`);
  
  try {
    // 查询admin_users表
    const { data: admin, error } = await supabase
      .from('admin_users')
      .select('*')
      .or(`username.eq.${phone},phone.eq.${phone}`)
      .single();

    if (error) {
      console.error('❌ 查询admin_users表失败:', error.message);
      return { success: false, error: error.message };
    }

    if (!admin) {
      console.error('❌ 未找到管理员用户');
      return { success: false, error: '用户不存在' };
    }

    console.log('✅ 找到管理员用户:');
    console.log(`  - ID: ${admin.id}`);
    console.log(`  - 用户名: ${admin.username}`);
    console.log(`  - 手机号: ${admin.phone}`);
    console.log(`  - 角色: ${admin.role}`);
    console.log(`  - 状态: ${admin.status}`);
    console.log(`  - 权限: ${JSON.stringify(admin.permissions)}`);
    console.log(`  - 创建时间: ${admin.created_at}`);
    console.log(`  - 最后登录: ${admin.last_login_at}`);
    
    return { success: true, admin };
  } catch (error) {
    console.error('❌ 数据库查询异常:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * 验证管理员密码
 * @param {string} password - 明文密码
 * @param {string} passwordHash - 数据库中的密码哈希
 * @returns {Promise<boolean>} 密码是否正确
 */
async function verifyAdminPassword(password, passwordHash) {
  console.log('\n🔐 验证管理员密码...');
  
  try {
    const isValid = await bcrypt.compare(password, passwordHash);
    if (isValid) {
      console.log('✅ 密码验证成功');
    } else {
      console.log('❌ 密码验证失败');
    }
    return isValid;
  } catch (error) {
    console.error('❌ 密码验证异常:', error.message);
    return false;
  }
}

/**
 * 生成管理员JWT Token
 * @param {Object} admin - 管理员用户信息
 * @returns {string} JWT Token
 */
function generateAdminToken(admin) {
  console.log('\n🎫 生成管理员JWT Token...');
  
  try {
    // 将数据库中的角色映射到RBAC枚举
    let rbacRole = 'ADMIN';
    if (admin.role === 'super_admin') {
      rbacRole = 'SUPER_ADMIN';
    } else if (admin.role === 'admin') {
      rbacRole = 'ADMIN';
    }

    const payload = {
      userId: admin.id,
      phone: admin.phone,
      role: rbacRole,
      permissions: admin.permissions || [],
      type: 'admin',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24小时过期
    };

    console.log('Token payload:');
    console.log(JSON.stringify(payload, null, 2));

    const token = jwt.sign(payload, jwtSecret);
    console.log('✅ JWT Token生成成功');
    console.log(`Token长度: ${token.length}`);
    console.log(`Token前50字符: ${token.substring(0, 50)}...`);
    
    return token;
  } catch (error) {
    console.error('❌ JWT Token生成失败:', error.message);
    return null;
  }
}

/**
 * 验证JWT Token
 * @param {string} token - JWT Token
 * @returns {Object} 验证结果
 */
function verifyJWTToken(token) {
  console.log('\n🔍 验证JWT Token...');
  
  try {
    const decoded = jwt.verify(token, jwtSecret);
    console.log('✅ JWT Token验证成功');
    console.log('解码后的payload:');
    console.log(JSON.stringify(decoded, null, 2));
    
    return { success: true, payload: decoded };
  } catch (error) {
    console.error('❌ JWT Token验证失败:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * 测试权限检查API
 * @param {string} token - JWT Token
 * @returns {Promise<Object>} API响应结果
 */
async function testPermissionCheckAPI(token) {
  console.log('\n🌐 测试权限检查API...');
  
  try {
    const response = await fetch('http://localhost:3000/api/admin/check-permission', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log(`API响应状态: ${response.status}`);
    console.log(`API响应状态文本: ${response.statusText}`);
    
    const responseText = await response.text();
    console.log(`API响应内容: ${responseText}`);
    
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      responseData = { raw: responseText };
    }
    
    if (response.ok) {
      console.log('✅ 权限检查API调用成功');
      return { success: true, status: response.status, data: responseData };
    } else {
      console.log('❌ 权限检查API调用失败');
      return { success: false, status: response.status, data: responseData };
    }
  } catch (error) {
    console.error('❌ 权限检查API调用异常:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * 模拟RBAC中间件验证过程
 * @param {string} token - JWT Token
 * @returns {Promise<Object>} 验证结果
 */
async function simulateRBACVerification(token) {
  console.log('\n🛡️ 模拟RBAC中间件验证过程...');
  
  try {
    // 1. 验证JWT Token
    const tokenResult = verifyJWTToken(token);
    if (!tokenResult.success) {
      return { success: false, step: 'token_verification', error: tokenResult.error };
    }
    
    const payload = tokenResult.payload;
    console.log('✅ 步骤1: JWT Token验证通过');
    
    // 2. 检查用户是否存在
    const { data: user, error } = await supabase
      .from('admin_users')
      .select('id, role, status')
      .eq('id', payload.userId)
      .single();
    
    if (error || !user) {
      console.log('❌ 步骤2: 用户不存在或查询失败');
      return { success: false, step: 'user_existence', error: error?.message || '用户不存在' };
    }
    
    console.log('✅ 步骤2: 用户存在检查通过');
    console.log(`  数据库中的用户角色: ${user.role}`);
    console.log(`  数据库中的用户状态: ${user.status}`);
    
    // 3. 检查用户状态
    if (user.status !== 'active') {
      console.log('❌ 步骤3: 用户状态不是active');
      return { success: false, step: 'user_status', error: `用户状态: ${user.status}` };
    }
    
    console.log('✅ 步骤3: 用户状态检查通过');
    
    // 4. 检查角色权限
    const isAdmin = user.role === 'admin' || user.role === 'super_admin';
    if (!isAdmin) {
      console.log('❌ 步骤4: 用户不具有管理员权限');
      return { success: false, step: 'role_check', error: `用户角色: ${user.role}` };
    }
    
    console.log('✅ 步骤4: 角色权限检查通过');
    
    return { success: true, user, payload };
  } catch (error) {
    console.error('❌ RBAC验证过程异常:', error.message);
    return { success: false, step: 'exception', error: error.message };
  }
}

/**
 * 检查环境配置
 */
function checkEnvironmentConfig() {
  console.log('\n⚙️ 检查环境配置...');
  
  console.log(`Supabase URL: ${supabaseUrl}`);
  console.log(`JWT Secret: ${jwtSecret.substring(0, 10)}...`);
  console.log(`Service Role Key: ${supabaseServiceKey.substring(0, 20)}...`);
  
  if (supabaseUrl && supabaseServiceKey && jwtSecret) {
    console.log('✅ 环境配置检查通过');
    return true;
  } else {
    console.log('❌ 环境配置不完整');
    return false;
  }
}

/**
 * 主诊断函数
 */
async function diagnoseAdminPermission() {
  console.log('🚀 开始管理员权限问题诊断...');
  console.log('=' .repeat(60));
  
  const phone = '13823738278';
  const password = '123456';
  
  // 1. 检查环境配置
  if (!checkEnvironmentConfig()) {
    console.log('\n❌ 诊断终止：环境配置不完整');
    return;
  }
  
  // 2. 检查管理员用户数据库状态
  const userResult = await checkAdminUserInDatabase(phone);
  if (!userResult.success) {
    console.log('\n❌ 诊断终止：管理员用户不存在或查询失败');
    return;
  }
  
  const admin = userResult.admin;
  
  // 3. 验证密码
  const passwordValid = await verifyAdminPassword(password, admin.password_hash);
  if (!passwordValid) {
    console.log('\n❌ 诊断终止：密码验证失败');
    return;
  }
  
  // 4. 生成JWT Token
  const token = generateAdminToken(admin);
  if (!token) {
    console.log('\n❌ 诊断终止：JWT Token生成失败');
    return;
  }
  
  // 5. 验证JWT Token
  const tokenVerification = verifyJWTToken(token);
  if (!tokenVerification.success) {
    console.log('\n❌ 诊断终止：JWT Token验证失败');
    return;
  }
  
  // 6. 模拟RBAC验证过程
  const rbacResult = await simulateRBACVerification(token);
  if (!rbacResult.success) {
    console.log(`\n❌ RBAC验证失败在步骤: ${rbacResult.step}`);
    console.log(`错误信息: ${rbacResult.error}`);
  } else {
    console.log('\n✅ RBAC验证模拟成功');
  }
  
  // 7. 测试权限检查API
  const apiResult = await testPermissionCheckAPI(token);
  
  // 8. 输出诊断总结
  console.log('\n' + '=' .repeat(60));
  console.log('📋 诊断总结:');
  console.log(`✅ 管理员用户存在: ${admin.username} (${admin.phone})`);
  console.log(`✅ 用户角色: ${admin.role}`);
  console.log(`✅ 用户状态: ${admin.status}`);
  console.log(`✅ 密码验证: 通过`);
  console.log(`✅ JWT Token生成: 成功`);
  console.log(`✅ JWT Token验证: 成功`);
  console.log(`${rbacResult.success ? '✅' : '❌'} RBAC验证: ${rbacResult.success ? '通过' : '失败'}`);
  console.log(`${apiResult.success ? '✅' : '❌'} 权限检查API: ${apiResult.success ? '通过' : '失败 (状态码: ' + apiResult.status + ')'}`);
  
  if (!apiResult.success) {
    console.log('\n🔧 修复建议:');
    if (apiResult.status === 403) {
      console.log('1. 检查RBAC中间件的实现是否正确');
      console.log('2. 确认JWT Secret在前后端是否一致');
      console.log('3. 检查权限检查API的具体实现');
      console.log('4. 验证数据库连接是否正常');
    } else if (apiResult.status === 401) {
      console.log('1. 检查Authorization header格式是否正确');
      console.log('2. 确认JWT Token是否有效');
    } else {
      console.log('1. 检查服务器是否正常运行');
      console.log('2. 查看服务器日志获取更多信息');
    }
  }
  
  console.log('\n🎯 建议下一步操作:');
  console.log('1. 访问调试页面: http://localhost:3000/admin/debug');
  console.log('2. 使用浏览器开发者工具检查网络请求');
  console.log('3. 检查浏览器localStorage中的token');
  console.log('4. 清除浏览器缓存后重新登录');
}

// 运行诊断
if (require.main === module) {
  diagnoseAdminPermission().catch(error => {
    console.error('❌ 诊断过程发生异常:', error.message);
    console.error(error.stack);
  });
}

module.exports = {
  checkAdminUserInDatabase,
  verifyAdminPassword,
  generateAdminToken,
  verifyJWTToken,
  testPermissionCheckAPI,
  simulateRBACVerification,
  diagnoseAdminPermission
};