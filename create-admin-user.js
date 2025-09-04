/**
 * 创建管理员用户13823738278
 */

const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// Supabase配置
const supabaseUrl = 'https://dadngnjejmxmoxakrcgj.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhZG5nbmplam14bW94YWtyY2dqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTU0MjQzNywiZXhwIjoyMDcxMTE4NDM3fQ.rQCglJAXUBtoS-QSWRViZxIRjqxBf19MsD73Kh_Xg4o';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createAdminUser() {
  console.log('🔧 创建管理员用户13823738278...');
  console.log('=' .repeat(50));
  
  try {
    // 检查用户是否已存在
    const { data: existingUsers, error: checkError } = await supabase
      .from('users')
      .select('*')
      .eq('phone', '13823738278');
    
    if (checkError) {
      console.error('❌ 检查用户失败:', checkError.message);
      return;
    }
    
    if (existingUsers && existingUsers.length > 0) {
      console.log('⚠️ 用户已存在，跳过创建');
      const user = existingUsers[0];
      console.log('- 用户ID:', user.id);
      console.log('- 姓名:', user.name);
      console.log('- 手机:', user.phone);
      
      // 检查是否已是管理员
      const { data: adminUsers, error: adminCheckError } = await supabase
        .from('admin_users')
        .select('*')
        .eq('user_id', user.id);
      
      if (adminCheckError) {
        console.error('❌ 检查管理员状态失败:', adminCheckError.message);
      } else if (adminUsers && adminUsers.length > 0) {
        console.log('✅ 用户已是管理员');
        return;
      } else {
        // 添加到管理员表
        const { error: insertAdminError } = await supabase
          .from('admin_users')
          .insert({
            user_id: user.id,
            permission_level: 'super_admin',
            status: 'active'
          });
        
        if (insertAdminError) {
          console.error('❌ 添加管理员记录失败:', insertAdminError.message);
        } else {
          console.log('✅ 已添加管理员记录');
        }
      }
      return;
    }
    
    // 生成密码哈希
    const passwordHash = await bcrypt.hash('admin123', 12);
    const userId = uuidv4();
    
    console.log('📝 创建新用户...');
    
    // 创建用户
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert({
        id: userId,
        name: '管理员',
        phone: '13823738278',
        email: 'admin@skillup.com',
        password_hash: passwordHash,
        role: 'admin',
        status: 'active'
      })
      .select()
      .single();
    
    if (createError) {
      console.error('❌ 创建用户失败:', createError.message);
      return;
    }
    
    console.log('✅ 用户创建成功:');
    console.log('- 用户ID:', newUser.id);
    console.log('- 姓名:', newUser.name);
    console.log('- 手机:', newUser.phone);
    console.log('- 邮箱:', newUser.email);
    console.log('- 角色:', newUser.role);
    
    // 添加到管理员表
    const { error: insertAdminError } = await supabase
      .from('admin_users')
      .insert({
        user_id: newUser.id,
        permission_level: 'super_admin',
        status: 'active'
      });
    
    if (insertAdminError) {
      console.error('❌ 添加管理员记录失败:', insertAdminError.message);
    } else {
      console.log('✅ 管理员记录创建成功');
    }
    
    console.log('\n🎯 登录信息:');
    console.log('- 手机号: 13823738278');
    console.log('- 密码: admin123');
    
  } catch (error) {
    console.error('❌ 创建过程中发生异常:', error.message);
    console.error('错误堆栈:', error.stack);
  }
}

// 运行创建
createAdminUser().catch(console.error);