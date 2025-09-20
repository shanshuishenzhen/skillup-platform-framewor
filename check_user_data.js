const { createClient } = require('@supabase/supabase-js');

// Supabase配置
const supabaseUrl = 'https://dadngnjejmxmoxakrcgj.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhZG5nbmplam14bW94YWtyY2dqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTU0MjQzNywiZXhwIjoyMDcxMTE4NDM3fQ.rQCglJAXUBtoS-QSWRViZxIRjqxBf19MsD73Kh_Xg4o';

// 创建Supabase客户端（使用service_role_key以获得完整权限）
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkUserData() {
  console.log('=== 检查用户13823738278的数据 ===\n');
  
  try {
    // 查询admin_users表中的用户数据
    console.log('1. 查询admin_users表中的用户数据:');
    const { data: adminUser, error: adminError } = await supabase
      .from('admin_users')
      .select('phone, role, username, real_name, status, created_at, updated_at')
      .eq('phone', '13823738278')
      .single();
    
    if (adminError) {
      console.log('admin_users表查询错误:', adminError.message);
    } else if (adminUser) {
      console.log('admin_users表中的用户数据:');
      console.log(JSON.stringify(adminUser, null, 2));
    } else {
      console.log('在admin_users表中未找到该用户');
    }
    
    console.log('\n2. 查询admin_users表中所有用户的role分布:');
    const { data: roleDistribution, error: roleError } = await supabase
      .from('admin_users')
      .select('role')
      .then(result => {
        if (result.error) return result;
        const roles = {};
        result.data.forEach(user => {
          roles[user.role] = (roles[user.role] || 0) + 1;
        });
        return { data: roles, error: null };
      });
    
    if (roleError) {
      console.log('role分布查询错误:', roleError.message);
    } else {
      console.log('admin_users表中的role分布:');
      console.log(JSON.stringify(roleDistribution, null, 2));
    }
    
    console.log('\n3. 查询users表中的用户数据:');
    const { data: regularUser, error: userError } = await supabase
      .from('users')
      .select('phone, role, name, created_at')
      .eq('phone', '13823738278')
      .single();
    
    if (userError) {
      console.log('users表查询错误:', userError.message);
    } else if (regularUser) {
      console.log('users表中的用户数据:');
      console.log(JSON.stringify(regularUser, null, 2));
    } else {
      console.log('在users表中未找到该用户');
    }
    
  } catch (error) {
    console.error('查询过程中发生错误:', error.message);
  }
}

// 执行查询
checkUserData().then(() => {
  console.log('\n=== 查询完成 ===');
  process.exit(0);
}).catch(error => {
  console.error('脚本执行失败:', error.message);
  process.exit(1);
});