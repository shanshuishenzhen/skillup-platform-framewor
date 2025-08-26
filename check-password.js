/**
 * 检查管理员密码哈希
 */

const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

// Supabase配置
const supabaseUrl = 'https://dadngnjejmxmoxakrcgj.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhZG5nbmplam14bW94YWtyY2dqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTU0MjQzNywiZXhwIjoyMDcxMTE4NDM3fQ.rQCglJAXUBtoS-QSWRViZxIRjqxBf19MsD73Kh_Xg4o';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkPassword() {
  try {
    console.log('🔍 检查管理员密码哈希...');
    
    // 查询testadmin用户的密码哈希
    const { data: admin, error } = await supabase
      .from('admin_users')
      .select('id, username, phone, password_hash')
      .eq('phone', '13823738278')
      .single();

    if (error) {
      console.error('❌ 查询失败:', error.message);
      return;
    }

    if (!admin) {
      console.log('❌ 未找到该手机号的管理员');
      return;
    }

    console.log('✅ 找到管理员:');
    console.log('   ID:', admin.id);
    console.log('   用户名:', admin.username);
    console.log('   手机号:', admin.phone);
    console.log('   密码哈希:', admin.password_hash);
    
    // 测试常见密码
    const testPasswords = ['admin123', 'password', '123456', 'admin', 'test123'];
    
    console.log('\n🔐 测试常见密码:');
    for (const password of testPasswords) {
      const isMatch = await bcrypt.compare(password, admin.password_hash);
      console.log(`   ${password}: ${isMatch ? '✅ 匹配' : '❌ 不匹配'}`);
      if (isMatch) {
        console.log(`\n🎉 找到正确密码: ${password}`);
        break;
      }
    }
    
  } catch (error) {
    console.error('❌ 检查过程中发生错误:', error.message);
  }
}

checkPassword();