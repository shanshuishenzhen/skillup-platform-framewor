require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// 检查管理员表
async function checkAdminTable() {
  console.log('=== 检查管理员表结构 ===');
  
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    // 1. 检查admin_users表是否存在
    console.log('1. 检查admin_users表...');
    const { data: adminUsers, error: adminError } = await supabase
      .from('admin_users')
      .select('*')
      .limit(5);
    
    if (adminError) {
      console.log('admin_users表不存在或查询失败:', adminError.message);
    } else {
      console.log('admin_users表存在，记录数:', adminUsers.length);
      if (adminUsers.length > 0) {
        console.log('示例记录:', adminUsers[0]);
      }
    }
    
    // 2. 检查user_profiles表中的管理员用户
    console.log('\n2. 检查user_profiles表中的管理员...');
    const { data: userProfiles, error: userError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('role', 'admin');
    
    if (userError) {
      console.log('user_profiles表查询失败:', userError.message);
    } else {
      console.log('user_profiles表中的管理员数量:', userProfiles.length);
      userProfiles.forEach((user, index) => {
        console.log(`${index + 1}. ${user.real_name} - ${user.phone} - ${user.role}`);
      });
    }
    
    // 3. 检查是否需要创建admin_users表
    if (adminError && userProfiles && userProfiles.length > 0) {
      console.log('\n3. 建议：需要创建admin_users表或修改登录逻辑');
      console.log('选项1: 创建admin_users表并迁移管理员数据');
      console.log('选项2: 修改登录API使用user_profiles表');
    }
    
  } catch (error) {
    console.error('检查过程中发生错误:', error.message);
  }
}

checkAdminTable();