/**
 * 测试管理员登录和权限验证
 */

const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Supabase配置
const supabaseUrl = 'https://dadngnjejmxmoxakrcgj.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhZG5nbmplam14bW94YWtyY2dqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTU0MjQzNywiZXhwIjoyMDcxMTE4NDM3fQ.rQCglJAXUBtoS-QSWRViZxIRjqxBf19MsD73Kh_Xg4o';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// JWT密钥（需要与后端一致）
const JWT_SECRET = 'your-secret-key-here';

async function testAdminLogin() {
  console.log('🔐 测试管理员登录和权限验证...');
  console.log('=' .repeat(50));
  
  try {
    // 1. 模拟登录验证
    console.log('\n1️⃣ 验证管理员登录...');
    
    const phone = '13823738278';
    const password = 'admin123';
    
    // 查询管理员用户
    const { data: admin, error: adminError } = await supabase
      .from('admin_users')
      .select('*')
      .eq('phone', phone)
      .single();
    
    if (adminError) {
      console.error('❌ 查询管理员失败:', adminError.message);
      return;
    }
    
    if (!admin) {
      console.error('❌ 管理员不存在');
      return;
    }
    
    console.log('✅ 找到管理员用户:');
    console.log('- ID:', admin.id);
    console.log('- 用户名:', admin.username);
    console.log('- 真实姓名:', admin.real_name);
    console.log('- 角色:', admin.role);
    console.log('- 状态:', admin.status);
    console.log('- 权限:', admin.permissions);
    
    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, admin.password_hash);
    
    if (!isPasswordValid) {
      console.error('❌ 密码验证失败');
      return;
    }
    
    console.log('✅ 密码验证成功');
    
    // 2. 生成JWT token
    console.log('\n2️⃣ 生成JWT token...');
    
    const tokenPayload = {
      id: admin.id,
      username: admin.username,
      role: admin.role,
      permissions: admin.permissions,
      type: 'admin'
    };
    
    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '24h' });
    
    console.log('✅ JWT token生成成功');
    console.log('Token payload:', JSON.stringify(tokenPayload, null, 2));
    console.log('Token (前50字符):', token.substring(0, 50) + '...');
    
    // 3. 验证JWT token
    console.log('\n3️⃣ 验证JWT token...');
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      console.log('✅ JWT token验证成功');
      console.log('解码后的payload:', JSON.stringify(decoded, null, 2));
    } catch (jwtError) {
      console.error('❌ JWT token验证失败:', jwtError.message);
      return;
    }
    
    // 4. 测试权限检查
    console.log('\n4️⃣ 测试权限检查...');
    
    const requiredPermissions = ['user_management', 'system_settings'];
    const userPermissions = admin.permissions || [];
    
    console.log('用户权限:', userPermissions);
    console.log('需要权限:', requiredPermissions);
    
    const hasPermission = requiredPermissions.every(perm => 
      userPermissions.includes(perm) || admin.role === 'super_admin'
    );
    
    if (hasPermission) {
      console.log('✅ 权限检查通过');
    } else {
      console.log('❌ 权限检查失败');
    }
    
    // 5. 模拟API请求头
    console.log('\n5️⃣ 模拟API请求头...');
    
    const authHeader = `Bearer ${token}`;
    console.log('Authorization头:', authHeader.substring(0, 70) + '...');
    
    console.log('\n🎯 登录测试总结:');
    console.log('- 用户查询: ✅');
    console.log('- 密码验证: ✅');
    console.log('- JWT生成: ✅');
    console.log('- JWT验证: ✅');
    console.log('- 权限检查:', hasPermission ? '✅' : '❌');
    
  } catch (error) {
    console.error('❌ 测试过程中发生异常:', error.message);
    console.error('错误堆栈:', error.stack);
  }
}

// 运行测试
testAdminLogin().catch(console.error);