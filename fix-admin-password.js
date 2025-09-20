/**
 * 修复管理员密码
 */

const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

// Supabase配置
const supabaseUrl = 'https://dadngnjejmxmoxakrcgj.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhZG5nbmplam14bW94YWtyY2dqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTU0MjQzNywiZXhwIjoyMDcxMTE4NDM3fQ.rQCglJAXUBtoS-QSWRViZxIRjqxBf19MsD73Kh_Xg4o';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixAdminPassword() {
  console.log('🔧 修复管理员密码...');
  console.log('=' .repeat(50));
  
  try {
    const phone = '13823738278';
    const newPassword = 'admin123';
    
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
    
    console.log('📋 当前管理员信息:');
    console.log('- ID:', admin.id);
    console.log('- 用户名:', admin.username);
    console.log('- 真实姓名:', admin.real_name);
    console.log('- 手机:', admin.phone);
    console.log('- 当前密码哈希:', admin.password_hash);
    
    // 测试当前密码
    console.log('\n🔍 测试当前密码...');
    try {
      const isCurrentValid = await bcrypt.compare(newPassword, admin.password_hash);
      console.log('当前密码验证结果:', isCurrentValid ? '✅ 正确' : '❌ 错误');
    } catch (compareError) {
      console.log('密码比较出错:', compareError.message);
    }
    
    // 生成新的密码哈希
    console.log('\n🔐 生成新密码哈希...');
    const newPasswordHash = await bcrypt.hash(newPassword, 12);
    console.log('新密码哈希:', newPasswordHash);
    
    // 验证新哈希
    const isNewHashValid = await bcrypt.compare(newPassword, newPasswordHash);
    console.log('新哈希验证:', isNewHashValid ? '✅ 正确' : '❌ 错误');
    
    // 更新密码
    console.log('\n💾 更新密码...');
    const { error: updateError } = await supabase
      .from('admin_users')
      .update({ 
        password_hash: newPasswordHash,
        updated_at: new Date().toISOString()
      })
      .eq('id', admin.id);
    
    if (updateError) {
      console.error('❌ 更新密码失败:', updateError.message);
      return;
    }
    
    console.log('✅ 密码更新成功!');
    
    // 再次验证
    console.log('\n🔍 验证更新后的密码...');
    const { data: updatedAdmin, error: verifyError } = await supabase
      .from('admin_users')
      .select('password_hash')
      .eq('id', admin.id)
      .single();
    
    if (verifyError) {
      console.error('❌ 查询更新后的用户失败:', verifyError.message);
      return;
    }
    
    const finalVerification = await bcrypt.compare(newPassword, updatedAdmin.password_hash);
    console.log('最终验证结果:', finalVerification ? '✅ 成功' : '❌ 失败');
    
    console.log('\n🎯 登录信息:');
    console.log('- 手机号: 13823738278');
    console.log('- 密码: admin123');
    
  } catch (error) {
    console.error('❌ 修复过程中发生异常:', error.message);
    console.error('错误堆栈:', error.stack);
  }
}

// 运行修复
fixAdminPassword().catch(console.error);