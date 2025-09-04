/**
 * 查找用户13823738278的详细信息
 */

const { createClient } = require('@supabase/supabase-js');

// Supabase配置
const supabaseUrl = 'https://dadngnjejmxmoxakrcgj.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhZG5nbmplam14bW94YWtyY2dqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTU0MjQzNywiZXhwIjoyMDcxMTE4NDM3fQ.rQCglJAXUBtoS-QSWRViZxIRjqxBf19MsD73Kh_Xg4o';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function findUser() {
  try {
    console.log('=== 查找用户13823738278 ===\n');
    
    const phoneNumber = '13823738278';
    
    // 1. 在users表中查找
    console.log('1. 在users表中查找:');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .eq('phone', phoneNumber);
    
    if (usersError) {
      console.log('❌ 查询users表时发生错误:', usersError);
    } else if (users && users.length > 0) {
      console.log('✅ 在users表中找到用户:');
      users.forEach(user => {
        console.log(JSON.stringify(user, null, 2));
      });
    } else {
      console.log('❌ 在users表中未找到手机号为13823738278的用户');
    }
    
    // 2. 在admin_users表中查找
    console.log('\n2. 在admin_users表中查找:');
    const { data: adminUsers, error: adminError } = await supabase
      .from('admin_users')
      .select('*')
      .eq('phone', phoneNumber);
    
    if (adminError) {
      console.log('❌ 查询admin_users表时发生错误:', adminError);
    } else if (adminUsers && adminUsers.length > 0) {
      console.log('✅ 在admin_users表中找到管理员:');
      adminUsers.forEach(admin => {
        console.log(JSON.stringify(admin, null, 2));
      });
    } else {
      console.log('❌ 在admin_users表中未找到手机号为13823738278的管理员');
    }
    
    // 3. 模糊查找相似的手机号
    console.log('\n3. 查找相似的手机号:');
    const { data: similarUsers, error: similarError } = await supabase
      .from('users')
      .select('id, name, phone, role')
      .like('phone', '%13823738278%');
    
    if (similarError) {
      console.log('❌ 查询相似手机号时发生错误:', similarError);
    } else if (similarUsers && similarUsers.length > 0) {
      console.log('✅ 找到相似的手机号:');
      similarUsers.forEach(user => {
        console.log(`- ${user.name} (${user.phone}) - ${user.role}`);
      });
    } else {
      console.log('❌ 未找到相似的手机号');
    }
    
    // 4. 查找所有包含138的手机号
    console.log('\n4. 查找所有以138开头的手机号:');
    const { data: phone138Users, error: phone138Error } = await supabase
      .from('users')
      .select('id, name, phone, role')
      .like('phone', '138%')
      .limit(10);
    
    if (phone138Error) {
      console.log('❌ 查询138开头手机号时发生错误:', phone138Error);
    } else if (phone138Users && phone138Users.length > 0) {
      console.log('✅ 找到以138开头的手机号:');
      phone138Users.forEach(user => {
        console.log(`- ${user.name} (${user.phone}) - ${user.role}`);
      });
    } else {
      console.log('❌ 未找到以138开头的手机号');
    }
    
    console.log('\n=== 查找完成 ===');
    
  } catch (error) {
    console.error('查找用户时发生错误:', error);
  }
}

findUser();