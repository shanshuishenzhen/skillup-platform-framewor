/**
 * 在admin_users表中创建管理员用户13823738278
 */

const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

// Supabase配置
const supabaseUrl = 'https://dadngnjejmxmoxakrcgj.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhZG5nbmplam14bW94YWtyY2dqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTU0MjQzNywiZXhwIjoyMDcxMTE4NDM3fQ.rQCglJAXUBtoS-QSWRViZxIRjqxBf19MsD73Kh_Xg4o';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createAdminUserCorrect() {
  console.log('🔧 在admin_users表中创建管理员用户13823738278...');
  console.log('=' .repeat(50));
  
  try {
    // 检查admin_users表中是否已存在该用户
    const { data: existingAdmins, error: checkError } = await supabase
      .from('admin_users')
      .select('*')
      .or('username.eq.13823738278,phone.eq.13823738278,email.eq.admin@skillup.com');
    
    if (checkError) {
      console.error('❌ 检查管理员用户失败:', checkError.message);
      return;
    }
    
    if (existingAdmins && existingAdmins.length > 0) {
      console.log('⚠️ 管理员用户已存在:');
      existingAdmins.forEach((admin, index) => {
        console.log(`\n管理员${index + 1}:`);
        console.log('- ID:', admin.id);
        console.log('- 用户名:', admin.username);
        console.log('- 邮箱:', admin.email);
        console.log('- 真实姓名:', admin.real_name);
        console.log('- 手机:', admin.phone);
        console.log('- 角色:', admin.role);
        console.log('- 状态:', admin.status);
      });
      
      // 如果存在但密码可能不对，尝试重置密码
      const admin = existingAdmins[0];
      console.log('\n🔧 重置密码为admin123...');
      
      const passwordHash = await bcrypt.hash('admin123', 12);
      
      const { error: updateError } = await supabase
        .from('admin_users')
        .update({ 
          password_hash: passwordHash,
          password_changed_at: new Date().toISOString()
        })
        .eq('id', admin.id);
      
      if (updateError) {
        console.error('❌ 重置密码失败:', updateError.message);
      } else {
        console.log('✅ 密码已重置为: admin123');
      }
      
      return;
    }
    
    // 生成密码哈希
    const passwordHash = await bcrypt.hash('admin123', 12);
    
    console.log('📝 创建新管理员用户...');
    
    // 在admin_users表中创建管理员
    const { data: newAdmin, error: createError } = await supabase
      .from('admin_users')
      .insert({
        username: '13823738278',
        email: 'admin@skillup.com',
        password_hash: passwordHash,
        real_name: '管理员',
        role: 'super_admin',
        status: 'active',
        phone: '13823738278',
        department: '技术部',
        position: '系统管理员',
        permissions: ['user_management', 'system_settings', 'content_management']
      })
      .select()
      .single();
    
    if (createError) {
      console.error('❌ 创建管理员用户失败:', createError.message);
      return;
    }
    
    console.log('✅ 管理员用户创建成功:');
    console.log('- 用户ID:', newAdmin.id);
    console.log('- 用户名:', newAdmin.username);
    console.log('- 邮箱:', newAdmin.email);
    console.log('- 真实姓名:', newAdmin.real_name);
    console.log('- 手机:', newAdmin.phone);
    console.log('- 角色:', newAdmin.role);
    console.log('- 状态:', newAdmin.status);
    console.log('- 权限:', newAdmin.permissions);
    
    console.log('\n🎯 登录信息:');
    console.log('- 用户名/手机号: 13823738278');
    console.log('- 密码: admin123');
    
  } catch (error) {
    console.error('❌ 创建过程中发生异常:', error.message);
    console.error('错误堆栈:', error.stack);
  }
}

// 运行创建
createAdminUserCorrect().catch(console.error);