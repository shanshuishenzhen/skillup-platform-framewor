/**
 * 查询用户角色信息的脚本
 * 用于检查用户13823738278的实际role字段值
 */

const { createClient } = require('@supabase/supabase-js');

// 从环境变量获取Supabase配置
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 缺少Supabase配置信息');
  console.log('请确保设置了以下环境变量:');
  console.log('- NEXT_PUBLIC_SUPABASE_URL');
  console.log('- SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function queryUserRole() {
  try {
    console.log('🔍 开始查询用户角色信息...');
    
    // 查询特定用户的角色信息
    console.log('\n📊 查询用户13823738278的详细信息:');
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, phone, name, role, user_type, status, created_at, updated_at')
      .eq('phone', '13823738278')
      .single();
    
    if (userError) {
      console.error('❌ 查询用户信息失败:', userError);
    } else if (userData) {
      console.log('✅ 用户信息查询成功:');
      console.log('📋 用户详情:', {
        id: userData.id,
        phone: userData.phone,
        name: userData.name,
        role: userData.role,
        user_type: userData.user_type,
        status: userData.status,
        created_at: userData.created_at,
        updated_at: userData.updated_at
      });
      
      // 分析role字段
      console.log('\n🎯 角色分析:');
      console.log('- 当前role值:', userData.role);
      console.log('- role类型:', typeof userData.role);
      console.log('- 是否为admin:', userData.role === 'admin');
      console.log('- 是否为super_admin:', userData.role === 'super_admin');
      console.log('- 是否为ADMIN:', userData.role === 'ADMIN');
      console.log('- 是否为SUPER_ADMIN:', userData.role === 'SUPER_ADMIN');
      
      // 检查权限验证逻辑
      const role = userData.role?.toLowerCase();
      const isAdminRole = role === 'admin' || role === 'super_admin' || 
                         userData.role === 'ADMIN' || userData.role === 'SUPER_ADMIN';
      console.log('\n🔐 权限验证结果:');
      console.log('- 转换后的role:', role);
      console.log('- 是否具有管理员权限:', isAdminRole);
    } else {
      console.log('❌ 未找到手机号为13823738278的用户');
    }
    
    // 查询所有管理员用户
    console.log('\n📊 查询所有管理员用户:');
    const { data: adminUsers, error: adminError } = await supabase
      .from('users')
      .select('id, phone, name, role, user_type, status')
      .eq('role', 'admin')
      .order('created_at', { ascending: false });
    
    if (adminError) {
      console.error('❌ 查询管理员用户失败:', adminError);
    } else {
      console.log('✅ 管理员用户查询成功:');
      console.log('📋 管理员用户列表:', adminUsers);
    }
    
    // 查询所有role值的分布
    console.log('\n📊 查询role字段分布:');
    const { data: roleStats, error: roleError } = await supabase
      .from('users')
      .select('role')
      .not('role', 'is', null);
    
    if (roleError) {
      console.error('❌ 查询role分布失败:', roleError);
    } else {
      // 统计role分布
      const roleCount = {};
      roleStats.forEach(user => {
        const role = user.role;
        roleCount[role] = (roleCount[role] || 0) + 1;
      });
      
      console.log('✅ Role字段分布统计:');
      Object.entries(roleCount)
        .sort(([,a], [,b]) => b - a)
        .forEach(([role, count]) => {
          console.log(`- ${role}: ${count}个用户`);
        });
    }
    
  } catch (error) {
    console.error('❌ 查询过程中发生错误:', error);
  }
}

// 执行查询
queryUserRole().then(() => {
  console.log('\n✅ 查询完成');
  process.exit(0);
}).catch(error => {
  console.error('❌ 脚本执行失败:', error);
  process.exit(1);
});