/**
 * 检查数据库用户数据脚本
 * 功能：查询 users 表和 admin_users 表的数据，如果没有数据则创建测试用户
 */

const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

// Supabase 配置
const supabaseUrl = 'https://dadngnjejmxmoxakrcgj.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhZG5nbmplam14bW94YWtyY2dqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTU0MjQzNywiZXhwIjoyMDcxMTE4NDM3fQ.rQCglJAXUBtoS-QSWRViZxIRjqxBf19MsD73Kh_Xg4o';

// 创建 Supabase 客户端（使用 service role key 以获得完整权限）
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * 查询用户表数据
 * @returns {Promise<Object>} 查询结果
 */
async function checkUsersTable() {
  console.log('\n=== 检查 users 表 ===');
  
  try {
    const { data, error, count } = await supabase
      .from('users')
      .select('*', { count: 'exact' });
    
    if (error) {
      console.error('查询 users 表失败:', error);
      return { success: false, error };
    }
    
    console.log(`users 表总记录数: ${count}`);
    if (data && data.length > 0) {
      console.log('前5条用户记录:');
      data.slice(0, 5).forEach((user, index) => {
        console.log(`${index + 1}. ID: ${user.id}, 姓名: ${user.name}, 手机: ${user.phone}, 用户类型: ${user.user_type}`);
      });
    } else {
      console.log('users 表中没有数据');
    }
    
    return { success: true, count, data };
  } catch (err) {
    console.error('查询 users 表异常:', err);
    return { success: false, error: err };
  }
}

/**
 * 查询管理员表数据
 * @returns {Promise<Object>} 查询结果
 */
async function checkAdminUsersTable() {
  console.log('\n=== 检查 admin_users 表 ===');
  
  try {
    const { data, error, count } = await supabase
      .from('admin_users')
      .select('*', { count: 'exact' });
    
    if (error) {
      console.error('查询 admin_users 表失败:', error);
      return { success: false, error };
    }
    
    console.log(`admin_users 表总记录数: ${count}`);
    if (data && data.length > 0) {
      console.log('管理员用户记录:');
      data.forEach((admin, index) => {
        console.log(`${index + 1}. ID: ${admin.id}, 用户名: ${admin.username}, 角色: ${admin.role}, 状态: ${admin.status}`);
      });
    } else {
      console.log('admin_users 表中没有数据');
    }
    
    return { success: true, count, data };
  } catch (err) {
    console.error('查询 admin_users 表异常:', err);
    return { success: false, error: err };
  }
}

/**
 * 创建测试用户
 * @param {number} count 创建用户数量
 * @returns {Promise<Object>} 创建结果
 */
async function createTestUsers(count = 5) {
  console.log(`\n=== 创建 ${count} 个测试用户 ===`);
  
  const testUsers = [];
  for (let i = 1; i <= count; i++) {
    const passwordHash = await bcrypt.hash('123456', 10);
    testUsers.push({
      phone: `1380000000${i}`,
      password_hash: passwordHash,
      name: `测试用户${i}`,
      user_type: 'employee',
      is_verified: true,
      role: 'user',
      department: '技术部',
      position: '工程师',
      organization: '测试公司',
      status: 'active'
    });
  }
  
  try {
    const { data, error } = await supabase
      .from('users')
      .insert(testUsers)
      .select();
    
    if (error) {
      console.error('创建测试用户失败:', error);
      return { success: false, error };
    }
    
    console.log(`成功创建 ${data.length} 个测试用户`);
    return { success: true, data };
  } catch (err) {
    console.error('创建测试用户异常:', err);
    return { success: false, error: err };
  }
}

/**
 * 创建测试管理员
 * @returns {Promise<Object>} 创建结果
 */
async function createTestAdmin() {
  console.log('\n=== 创建测试管理员 ===');
  
  const passwordHash = await bcrypt.hash('admin123', 10);
  const testAdmin = {
    username: 'admin',
    password_hash: passwordHash,
    role: 'super_admin',
    permissions: ['user_management', 'system_settings', 'data_analysis'],
    status: 'active'
  };
  
  try {
    const { data, error } = await supabase
      .from('admin_users')
      .insert([testAdmin])
      .select();
    
    if (error) {
      console.error('创建测试管理员失败:', error);
      return { success: false, error };
    }
    
    console.log('成功创建测试管理员:', data[0]);
    return { success: true, data };
  } catch (err) {
    console.error('创建测试管理员异常:', err);
    return { success: false, error: err };
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('开始检查数据库用户数据...');
  
  // 检查 users 表
  const usersResult = await checkUsersTable();
  
  // 检查 admin_users 表
  const adminResult = await checkAdminUsersTable();
  
  // 如果 users 表没有数据，创建测试用户
  if (usersResult.success && usersResult.count === 0) {
    await createTestUsers(5);
    // 重新检查
    await checkUsersTable();
  }
  
  // 如果 admin_users 表没有数据，创建测试管理员
  if (adminResult.success && adminResult.count === 0) {
    await createTestAdmin();
    // 重新检查
    await checkAdminUsersTable();
  }
  
  console.log('\n数据库检查完成！');
}

// 运行主函数
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  checkUsersTable,
  checkAdminUsersTable,
  createTestUsers,
  createTestAdmin
};