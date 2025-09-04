/**
 * 检查用户13823738278的密码并尝试重置
 */

const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

// Supabase配置
const supabaseUrl = 'https://dadngnjejmxmoxakrcgj.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhZG5nbmplam14bW94YWtyY2dqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTU0MjQzNywiZXhwIjoyMDcxMTE4NDM3fQ.rQCglJAXUBtoS-QSWRViZxIRjqxBf19MsD73Kh_Xg4o';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkAndResetUserPassword() {
  console.log('🔍 检查用户13823738278的密码信息...');
  console.log('=' .repeat(50));
  
  try {
    // 查询用户信息
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('phone', '13823738278');
    
    if (userError) {
      console.error('❌ 查询用户失败:', userError.message);
      return;
    }
    
    if (!users || users.length === 0) {
      console.log('❌ 未找到手机号为13823738278的用户');
      return;
    }
    
    const user = users[0]; // 使用第一个用户
    console.log(`✅ 找到${users.length}个用户:`);
    console.log('- ID:', user.id);
    console.log('- 姓名:', user.name);
    console.log('- 邮箱:', user.email);
    console.log('- 手机:', user.phone);
    console.log('- 角色:', user.role);
    console.log('- 状态:', user.status);
    console.log('- 密码哈希存在:', !!user.password_hash);
    
    // 检查admin_users表
    const { data: adminUsers, error: adminError } = await supabase
      .from('admin_users')
      .select('*')
      .eq('user_id', user.id);
    
    const adminUser = adminUsers && adminUsers.length > 0 ? adminUsers[0] : null;
    
    if (adminError) {
      console.error('❌ 查询管理员信息失败:', adminError.message);
    } else if (adminUser) {
      console.log('\n👑 管理员信息:');
      console.log('- 管理员ID:', adminUser.id);
      console.log('- 权限级别:', adminUser.permission_level);
      console.log('- 状态:', adminUser.status);
    } else {
      console.log('\n⚠️ 该用户不在admin_users表中');
    }
    
    // 尝试验证常见密码
    const commonPasswords = ['admin123', '123456', 'password', '13823738278', 'admin'];
    
    console.log('\n🔐 尝试验证常见密码...');
    let correctPassword = null;
    
    for (const password of commonPasswords) {
      try {
        const isValid = await bcrypt.compare(password, user.password_hash);
        if (isValid) {
          console.log(`✅ 找到正确密码: ${password}`);
          correctPassword = password;
          break;
        } else {
          console.log(`❌ 密码不匹配: ${password}`);
        }
      } catch (error) {
        console.log(`❌ 验证密码${password}时出错:`, error.message);
      }
    }
    
    if (!correctPassword) {
      console.log('\n🔧 未找到正确密码，尝试重置为admin123...');
      
      // 生成新的密码哈希
      const newPasswordHash = await bcrypt.hash('admin123', 12);
      
      // 更新密码
      const { error: updateError } = await supabase
        .from('users')
        .update({ password_hash: newPasswordHash })
        .eq('id', user.id);
      
      if (updateError) {
        console.error('❌ 密码重置失败:', updateError.message);
      } else {
        console.log('✅ 密码已重置为: admin123');
        correctPassword = 'admin123';
      }
    }
    
    // 确保用户在admin_users表中
    if (!adminUser) {
      console.log('\n🔧 将用户添加到admin_users表...');
      
      const { error: insertError } = await supabase
        .from('admin_users')
        .insert({
          user_id: user.id,
          permission_level: 'super_admin',
          status: 'active'
        });
      
      if (insertError) {
        console.error('❌ 添加管理员记录失败:', insertError.message);
      } else {
        console.log('✅ 已添加管理员记录');
      }
    }
    
    console.log('\n🎯 测试建议:');
    console.log(`- 使用手机号: 13823738278`);
    console.log(`- 使用密码: ${correctPassword || 'admin123'}`);
    
  } catch (error) {
    console.error('❌ 检查过程中发生异常:', error.message);
    console.error('错误堆栈:', error.stack);
  }
}

// 运行检查
checkAndResetUserPassword().catch(console.error);