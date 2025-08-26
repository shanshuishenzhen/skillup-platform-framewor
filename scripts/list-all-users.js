/**
 * 列出所有用户的详细信息脚本
 * 用于查看数据库中所有用户的完整信息
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Supabase配置
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 缺少Supabase配置信息');
  process.exit(1);
}

// 创建Supabase客户端
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * 列出所有用户的详细信息
 */
async function listAllUsers() {
  console.log('🔍 查询所有用户信息...');
  console.log('=' .repeat(80));
  
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('❌ 查询用户失败:', error.message);
      return;
    }
    
    if (!data || data.length === 0) {
      console.log('⚠️  数据库中没有用户');
      return;
    }
    
    console.log(`📊 总共找到 ${data.length} 个用户:\n`);
    
    data.forEach((user, index) => {
      console.log(`👤 用户 ${index + 1}:`);
      console.log(`   - ID: ${user.id}`);
      console.log(`   - 姓名: ${user.name || '未设置'}`);
      console.log(`   - 邮箱: ${user.email}`);
      console.log(`   - 角色: ${user.role || '未设置'}`);
      console.log(`   - 状态: ${user.status || '未设置'}`);
      console.log(`   - 员工ID: ${user.employee_id || '未设置'}`);
      console.log(`   - 部门: ${user.department || '未设置'}`);
      console.log(`   - 职位: ${user.position || '未设置'}`);
      console.log(`   - 创建时间: ${user.created_at}`);
      console.log(`   - 更新时间: ${user.updated_at}`);
      console.log('   ' + '-'.repeat(50));
    });
    
    // 统计角色分布
    console.log('\n📈 角色分布统计:');
    const roleStats = {};
    data.forEach(user => {
      const role = user.role || 'null';
      roleStats[role] = (roleStats[role] || 0) + 1;
    });
    
    Object.entries(roleStats).forEach(([role, count]) => {
      console.log(`   - ${role}: ${count} 个用户`);
    });
    
    // 查找管理员用户
    console.log('\n👑 管理员用户:');
    const adminUsers = data.filter(user => user.role === 'admin' || user.role === 'super_admin');
    if (adminUsers.length > 0) {
      adminUsers.forEach(admin => {
        console.log(`   - ${admin.name || '未命名'} (${admin.email}) - 角色: ${admin.role}`);
      });
    } else {
      console.log('   - 没有找到管理员用户');
    }
    
    // 查找可能的测试管理员
    console.log('\n🔍 查找包含"admin"或"test"的用户:');
    const possibleAdmins = data.filter(user => 
      user.email?.toLowerCase().includes('admin') || 
      user.email?.toLowerCase().includes('test') ||
      user.name?.toLowerCase().includes('admin') ||
      user.name?.toLowerCase().includes('test')
    );
    
    if (possibleAdmins.length > 0) {
      possibleAdmins.forEach(user => {
        console.log(`   - ${user.name || '未命名'} (${user.email}) - 角色: ${user.role}`);
      });
    } else {
      console.log('   - 没有找到相关用户');
    }
    
  } catch (err) {
    console.error('❌ 查询过程中发生错误:', err.message);
  }
}

// 执行主函数
if (require.main === module) {
  listAllUsers().catch(console.error);
}

module.exports = { listAllUsers };