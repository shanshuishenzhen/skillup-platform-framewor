/**
 * 数据库用户角色检查脚本
 * 检查用户13823738278在admin_users表和users表中的角色配置
 */

const { createClient } = require('@supabase/supabase-js');

// Supabase配置
const supabaseUrl = 'https://dadngnjejmxmoxakrcgj.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhZG5nbmplam14bW94YWtyY2dqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTU0MjQzNywiZXhwIjoyMDcxMTE4NDM3fQ.rQCglJAXUBtoS-QSWRViZxIRjqxBf19MsD73Kh_Xg4o';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkUserRoles() {
  try {
    console.log('=== 检查用户13823738278的角色配置 ===\n');
    
    const phoneNumber = '13823738278';
    
    // 1. 检查users表中的用户信息
    console.log('1. 检查users表中的用户信息:');
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, phone, name, email, role, status, created_at, updated_at')
      .eq('phone', phoneNumber)
      .single();
    
    if (userError && userError.code !== 'PGRST116') {
      console.log('❌ 查询users表时发生错误:', userError);
    } else if (user) {
      console.log('用户信息:', JSON.stringify(user, null, 2));
    } else {
      console.log('❌ 在users表中未找到手机号为13823738278的用户');
    }
    
    // 2. 检查admin_users表中的管理员信息
    console.log('\n2. 检查admin_users表中的管理员信息:');
    const { data: adminUser, error: adminError } = await supabase
      .from('admin_users')
      .select('id, phone, real_name, email, role, status, permissions, created_at, updated_at')
      .eq('phone', phoneNumber)
      .single();
    
    if (adminError && adminError.code !== 'PGRST116') {
      console.log('❌ 查询admin_users表时发生错误:', adminError);
    } else if (adminUser) {
      console.log('管理员信息:', JSON.stringify(adminUser, null, 2));
    } else {
      console.log('❌ 在admin_users表中未找到手机号为13823738278的管理员');
    }
    
    // 3. 检查是否存在角色不一致的情况
    console.log('\n3. 角色一致性检查:');
    if (user && adminUser) {
      if (user.role === adminUser.role) {
        console.log('✅ users表和admin_users表中的角色一致:', user.role);
      } else {
        console.log('⚠️ 角色不一致!');
        console.log('  users表中的角色:', user.role);
        console.log('  admin_users表中的角色:', adminUser.role);
      }
    } else if (user && !adminUser) {
      console.log('⚠️ 用户存在于users表但不存在于admin_users表');
      console.log('  用户角色:', user.role);
    } else if (!user && adminUser) {
      console.log('⚠️ 管理员存在于admin_users表但不存在于users表');
      console.log('  管理员角色:', adminUser.role);
    }
    
    // 4. 检查所有管理员用户（用于对比）
    console.log('\n4. 所有管理员用户列表:');
    const { data: allAdmins, error: allAdminsError } = await supabase
      .from('admin_users')
      .select('id, phone, real_name, role, status')
      .order('created_at', { ascending: false });
    
    if (allAdminsError) {
      console.log('❌ 查询所有管理员时发生错误:', allAdminsError);
    } else {
      console.log('管理员总数:', allAdmins?.length || 0);
      allAdmins?.forEach((admin, index) => {
        console.log(`${index + 1}. ${admin.phone} - ${admin.real_name} - ${admin.role} - ${admin.status}`);
      });
    }
    
    console.log('\n=== 检查完成 ===');
    
  } catch (error) {
    console.error('检查用户角色时发生错误:', error);
  } finally {
    // Supabase客户端不需要手动断开连接
  }
}