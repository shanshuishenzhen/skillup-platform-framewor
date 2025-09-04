/**
 * 查看数据库中现有的用户
 */

const { createClient } = require('@supabase/supabase-js');

// Supabase配置
const supabaseUrl = 'https://dadngnjejmxmoxakrcgj.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhZG5nbmplam14bW94YWtyY2dqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTU0MjQzNywiZXhwIjoyMDcxMTE4NDM3fQ.rQCglJAXUBtoS-QSWRViZxIRjqxBf19MsD73Kh_Xg4o';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkExistingUsers() {
  console.log('🔍 查看数据库中现有的用户...');
  console.log('=' .repeat(50));
  
  try {
    // 查询所有用户
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (userError) {
      console.error('❌ 查询用户失败:', userError.message);
      return;
    }
    
    console.log(`✅ 找到${users.length}个用户:`);
    
    users.forEach((user, index) => {
      console.log(`\n用户${index + 1}:`);
      console.log('- ID:', user.id);
      console.log('- 姓名:', user.name);
      console.log('- 邮箱:', user.email);
      console.log('- 手机:', user.phone);
      console.log('- 角色:', user.role);
      console.log('- 状态:', user.status);
      console.log('- 创建时间:', user.created_at);
    });
    
    // 查询管理员用户
    const { data: adminUsers, error: adminError } = await supabase
      .from('admin_users')
      .select(`
        *,
        users!inner(
          id,
          name,
          email,
          phone,
          role
        )
      `);
    
    if (adminError) {
      console.error('❌ 查询管理员用户失败:', adminError.message);
    } else {
      console.log(`\n👑 管理员用户(${adminUsers.length}个):`);
      adminUsers.forEach((admin, index) => {
        console.log(`\n管理员${index + 1}:`);
        console.log('- 用户ID:', admin.user_id);
        console.log('- 姓名:', admin.users.name);
        console.log('- 邮箱:', admin.users.email);
        console.log('- 手机:', admin.users.phone);
        console.log('- 权限级别:', admin.permission_level);
        console.log('- 状态:', admin.status);
      });
    }
    
  } catch (error) {
    console.error('❌ 检查过程中发生异常:', error.message);
    console.error('错误堆栈:', error.stack);
  }
}

// 运行检查
checkExistingUsers().catch(console.error);