/**
 * 综合诊断管理员权限问题
 * 检查用户13823738278的完整权限链路
 */

const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Supabase配置
const supabaseUrl = 'https://dadngnjejmxmoxakrcgj.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhZG5nbmplam14bW94YWtyY2dqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTU0MjQzNywiZXhwIjoyMDcxMTE4NDM3fQ.rQCglJAXUBtoS-QSWRViZxIRjqxBf19MsD73Kh_Xg4o';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// JWT密钥
const JWT_SECRET = 'sk1llup_pl4tf0rm_jwt_s3cr3t_k3y_2024_v3ry_s3cur3_r4nd0m_str1ng_f0r_pr0duct10n';

// 用户角色枚举
const UserRole = {
  USER: 'USER',
  TEACHER: 'TEACHER',
  ADMIN: 'ADMIN',
  SUPER_ADMIN: 'SUPER_ADMIN'
};

/**
 * 步骤1: 检查数据库中的用户信息
 */
async function checkUserInDatabase() {
  console.log('\n=== 步骤1: 检查数据库中的用户信息 ===');
  
  const phone = '13823738278';
  
  // 检查users表
  console.log('\n📊 检查users表:');
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('*')
    .eq('phone', phone);
    
  if (usersError) {
    console.error('❌ 查询users表失败:', usersError);
  } else {
    console.log('✅ users表查询结果:', users);
  }
  
  // 检查admin_users表
  console.log('\n📊 检查admin_users表:');
  const { data: adminUsers, error: adminError } = await supabase
    .from('admin_users')
    .select('*')
    .eq('phone', phone);
    
  if (adminError) {
    console.error('❌ 查询admin_users表失败:', adminError);
  } else {
    console.log('✅ admin_users表查询结果:', adminUsers);
  }
  
  return { users, adminUsers };
}

/**
 * 步骤2: 模拟登录并生成JWT token
 */
async function simulateLogin() {
  console.log('\n=== 步骤2: 模拟登录并生成JWT token ===');
  
  const phone = '13823738278';
  const password = 'admin123';
  
  // 查询管理员用户
  const { data: adminUser, error } = await supabase
    .from('admin_users')
    .select('*')
    .eq('phone', phone)
    .single();
    
  if (error || !adminUser) {
    console.error('❌ 未找到管理员用户:', error);
    return null;
  }
  
  console.log('📊 找到管理员用户:', {
    id: adminUser.id,
    username: adminUser.username,
    phone: adminUser.phone,
    role: adminUser.role,
    status: adminUser.status
  });
  
  // 验证密码
  const isPasswordValid = await bcrypt.compare(password, adminUser.password_hash);
  console.log('🔐 密码验证结果:', isPasswordValid);
  
  if (!isPasswordValid) {
    console.error('❌ 密码验证失败');
    return null;
  }
  
  // 生成JWT token
  const payload = {
    userId: adminUser.id,
    phone: adminUser.phone,
    role: adminUser.role === 'super_admin' ? UserRole.SUPER_ADMIN : UserRole.ADMIN
  };
  
  console.log('📝 JWT载荷:', payload);
  
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
  console.log('🎫 生成的JWT token:', token.substring(0, 50) + '...');
  
  return { token, user: adminUser, payload };
}

/**
 * 步骤3: 验证JWT token解析
 */
function verifyJWTToken(token) {
  console.log('\n=== 步骤3: 验证JWT token解析 ===');
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('✅ JWT解码成功:', decoded);
    
    // 检查角色类型
    console.log('🔍 角色分析:', {
      role: decoded.role,
      roleType: typeof decoded.role,
      isAdminEnum: decoded.role === UserRole.ADMIN,
      isSuperAdminEnum: decoded.role === UserRole.SUPER_ADMIN,
      enumValues: Object.values(UserRole)
    });
    
    return decoded;
  } catch (error) {
    console.error('❌ JWT验证失败:', error);
    return null;
  }
}

/**
 * 步骤4: 模拟权限检查逻辑
 */
function simulatePermissionCheck(userPayload) {
  console.log('\n=== 步骤4: 模拟权限检查逻辑 ===');
  
  const requiredRoles = [UserRole.ADMIN, UserRole.SUPER_ADMIN];
  
  console.log('📊 权限检查参数:', {
    userRole: userPayload.role,
    userRoleType: typeof userPayload.role,
    requiredRoles,
    requiredRolesTypes: requiredRoles.map(r => typeof r)
  });
  
  // 检查是否具有所需角色
  const hasPermission = requiredRoles.includes(userPayload.role);
  
  console.log('🎯 权限检查结果:', {
    hasPermission,
    matchDetails: requiredRoles.map(role => ({
      requiredRole: role,
      matches: role === userPayload.role,
      strictEquals: role === userPayload.role,
      enumComparison: Object.is(role, userPayload.role)
    }))
  });
  
  return hasPermission;
}

/**
 * 步骤5: 测试用户列表API权限验证
 */
async function testUserListAPIPermission(token) {
  console.log('\n=== 步骤5: 测试用户列表API权限验证 ===');
  
  try {
    const response = await fetch('http://localhost:3000/api/admin/users?page=1&limit=10', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('📊 API响应状态:', response.status);
    
    const responseData = await response.json();
    console.log('📊 API响应数据:', responseData);
    
    if (response.ok) {
      console.log('✅ 用户列表API调用成功');
      console.log('📊 返回用户数量:', responseData.data?.users?.length || 0);
    } else {
      console.error('❌ 用户列表API调用失败:', responseData);
    }
    
    return { success: response.ok, data: responseData };
  } catch (error) {
    console.error('❌ API调用异常:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 步骤6: 检查数据库权限
 */
async function checkDatabasePermissions() {
  console.log('\n=== 步骤6: 检查数据库权限 ===');
  
  try {
    // 检查表权限
    const { data: permissions, error } = await supabase
      .rpc('check_table_permissions');
      
    if (error) {
      console.log('⚠️ 无法检查表权限 (这是正常的):', error.message);
    } else {
      console.log('📊 表权限:', permissions);
    }
    
    // 测试基本查询权限
    const { data: testQuery, error: queryError } = await supabase
      .from('users')
      .select('id')
      .limit(1);
      
    if (queryError) {
      console.error('❌ 基本查询失败:', queryError);
    } else {
      console.log('✅ 基本查询成功');
    }
    
  } catch (error) {
    console.error('❌ 权限检查异常:', error);
  }
}

/**
 * 主诊断函数
 */
async function runComprehensiveDiagnosis() {
  console.log('🔍 开始综合诊断管理员权限问题...');
  console.log('👤 目标用户: 13823738278');
  
  try {
    // 步骤1: 检查数据库用户信息
    const { users, adminUsers } = await checkUserInDatabase();
    
    // 步骤2: 模拟登录
    const loginResult = await simulateLogin();
    if (!loginResult) {
      console.error('❌ 登录失败，无法继续诊断');
      return;
    }
    
    // 步骤3: 验证JWT token
    const decodedToken = verifyJWTToken(loginResult.token);
    if (!decodedToken) {
      console.error('❌ JWT验证失败，无法继续诊断');
      return;
    }
    
    // 步骤4: 模拟权限检查
    const hasPermission = simulatePermissionCheck(decodedToken);
    
    // 步骤5: 测试API调用
    const apiResult = await testUserListAPIPermission(loginResult.token);
    
    // 步骤6: 检查数据库权限
    await checkDatabasePermissions();
    
    // 生成诊断报告
    console.log('\n=== 🎯 诊断报告 ===');
    console.log('📊 用户信息:');
    console.log('  - users表记录:', users?.length || 0);
    console.log('  - admin_users表记录:', adminUsers?.length || 0);
    console.log('🔐 认证状态:');
    console.log('  - 登录成功:', !!loginResult);
    console.log('  - JWT验证:', !!decodedToken);
    console.log('  - 角色:', decodedToken?.role);
    console.log('🛡️ 权限检查:');
    console.log('  - 本地权限验证:', hasPermission);
    console.log('  - API调用结果:', apiResult.success);
    
    if (!hasPermission || !apiResult.success) {
      console.log('\n❌ 发现问题:');
      if (!hasPermission) {
        console.log('  - 本地权限验证失败，可能是角色枚举匹配问题');
      }
      if (!apiResult.success) {
        console.log('  - API权限验证失败:', apiResult.data?.error || apiResult.error);
      }
    } else {
      console.log('\n✅ 所有检查通过，权限配置正常');
    }
    
  } catch (error) {
    console.error('❌ 诊断过程中发生错误:', error);
  }
}

// 运行诊断
runComprehensiveDiagnosis().then(() => {
  console.log('\n🏁 诊断完成');
  process.exit(0);
}).catch(error => {
  console.error('❌ 诊断失败:', error);
  process.exit(1);
});