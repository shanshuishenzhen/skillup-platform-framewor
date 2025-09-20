/**
 * 检查管理员用户数据的脚本
 */
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// 初始化Supabase客户端
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkAdminUsers() {
  try {
    console.log('🔍 查询管理员用户数据...');
    
    const { data, error } = await supabase
      .from('admin_users')
      .select('id, username, email, phone, real_name, role, status, created_at')
      .eq('status', 'active')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('❌ 查询失败:', error);
      return;
    }
    
    if (!data || data.length === 0) {
      console.log('⚠️ 没有找到活跃的管理员用户');
      return;
    }
    
    console.log('✅ 找到以下管理员用户:');
    data.forEach((user, index) => {
      console.log(`\n${index + 1}. 管理员信息:`);
      console.log(`   ID: ${user.id}`);
      console.log(`   用户名: ${user.username}`);
      console.log(`   邮箱: ${user.email}`);
      console.log(`   手机号: ${user.phone || '未设置'}`);
      console.log(`   真实姓名: ${user.real_name}`);
      console.log(`   角色: ${user.role}`);
      console.log(`   状态: ${user.status}`);
      console.log(`   创建时间: ${user.created_at}`);
    });
    
  } catch (error) {
    console.error('❌ 执行过程中发生错误:', error);
  }
}

// 执行查询
checkAdminUsers();