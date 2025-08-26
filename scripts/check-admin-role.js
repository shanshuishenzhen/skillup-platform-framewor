/**
 * 数据库管理员角色检查和修复脚本
 * 用于验证和修复管理员用户的角色设置
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Supabase配置
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 缺少Supabase配置信息');
  console.error('请确保.env.local文件中包含:');
  console.error('- NEXT_PUBLIC_SUPABASE_URL');
  console.error('- SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// 创建Supabase客户端（使用service role key以获得完整权限）
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * 检查指定用户的详细信息
 * @param {string} email - 用户邮箱
 * @returns {Promise<Object|null>} 用户信息或null
 */
async function checkUserDetails(email) {
  console.log(`\n🔍 检查用户: ${email}`);
  
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email);
    
    if (error) {
      console.error(`❌ 查询用户失败:`, error.message);
      return null;
    }
    
    if (!data || data.length === 0) {
      console.log(`⚠️  用户不存在: ${email}`);
      return null;
    }
    
    const user = data[0];
    
    console.log(`✅ 用户信息:`);
    console.log(`   - ID: ${user.id}`);
    console.log(`   - 姓名: ${user.name}`);
    console.log(`   - 邮箱: ${user.email}`);
    console.log(`   - 角色: ${user.role}`);
    console.log(`   - 状态: ${user.status}`);
    console.log(`   - 创建时间: ${user.created_at}`);
    console.log(`   - 更新时间: ${user.updated_at}`);
    
    return user;
  } catch (err) {
    console.error(`❌ 检查用户时发生错误:`, err.message);
    return null;
  }
}

/**
 * 获取所有用户的角色分布情况
 * @returns {Promise<void>}
 */
async function checkRoleDistribution() {
  console.log(`\n📊 检查用户角色分布:`);
  
  try {
    const { data, error } = await supabase
      .from('users')
      .select('role')
      .not('role', 'is', null);
    
    if (error) {
      console.error(`❌ 查询角色分布失败:`, error.message);
      return;
    }
    
    // 统计角色分布
    const roleCount = {};
    data.forEach(user => {
      const role = user.role || 'null';
      roleCount[role] = (roleCount[role] || 0) + 1;
    });
    
    console.log(`   总用户数: ${data.length}`);
    Object.entries(roleCount).forEach(([role, count]) => {
      console.log(`   - ${role}: ${count} 个用户`);
    });
    
  } catch (err) {
    console.error(`❌ 检查角色分布时发生错误:`, err.message);
  }
}

/**
 * 更新用户角色为管理员
 * @param {string} email - 用户邮箱
 * @param {string} targetRole - 目标角色
 * @returns {Promise<boolean>} 更新是否成功
 */
async function updateUserRole(email, targetRole = 'admin') {
  console.log(`\n🔧 更新用户角色: ${email} -> ${targetRole}`);
  
  try {
    const { data, error } = await supabase
      .from('users')
      .update({ 
        role: targetRole,
        updated_at: new Date().toISOString()
      })
      .eq('email', email)
      .select();
    
    if (error) {
      console.error(`❌ 更新用户角色失败:`, error.message);
      return false;
    }
    
    if (!data || data.length === 0) {
      console.log(`⚠️  没有找到要更新的用户: ${email}`);
      return false;
    }
    
    console.log(`✅ 用户角色更新成功:`);
    console.log(`   - 邮箱: ${data[0].email}`);
    console.log(`   - 新角色: ${data[0].role}`);
    console.log(`   - 更新时间: ${data[0].updated_at}`);
    
    return true;
  } catch (err) {
    console.error(`❌ 更新用户角色时发生错误:`, err.message);
    return false;
  }
}

/**
 * 验证用户角色更新结果
 * @param {string} email - 用户邮箱
 * @param {string} expectedRole - 期望的角色
 * @returns {Promise<boolean>} 验证是否通过
 */
async function verifyRoleUpdate(email, expectedRole) {
  console.log(`\n✅ 验证角色更新结果:`);
  
  const user = await checkUserDetails(email);
  if (!user) {
    return false;
  }
  
  const isCorrect = user.role === expectedRole;
  if (isCorrect) {
    console.log(`✅ 角色验证通过: ${user.role}`);
  } else {
    console.log(`❌ 角色验证失败: 期望 ${expectedRole}, 实际 ${user.role}`);
  }
  
  return isCorrect;
}

/**
 * 主函数 - 执行完整的检查和修复流程
 */
async function main() {
  console.log('🚀 开始管理员角色检查和修复流程...');
  console.log('=' .repeat(50));
  
  const adminEmail = 'testadmin@example.com';
  const targetRole = 'admin';
  
  try {
    // 1. 检查当前用户信息
    const currentUser = await checkUserDetails(adminEmail);
    
    // 2. 检查所有用户的角色分布
    await checkRoleDistribution();
    
    // 3. 如果用户存在但角色不正确，则更新角色
    if (currentUser) {
      if (currentUser.role !== targetRole) {
        console.log(`\n⚠️  用户角色不正确: ${currentUser.role} (期望: ${targetRole})`);
        
        const updateSuccess = await updateUserRole(adminEmail, targetRole);
        if (updateSuccess) {
          // 4. 验证更新结果
          await verifyRoleUpdate(adminEmail, targetRole);
        }
      } else {
        console.log(`\n✅ 用户角色已正确: ${currentUser.role}`);
      }
    } else {
      console.log(`\n❌ 用户不存在，无法修复角色`);
      console.log(`请确保用户 ${adminEmail} 已在系统中注册`);
    }
    
    // 5. 最终检查
    console.log('\n' + '=' .repeat(50));
    console.log('🎯 最终检查结果:');
    await checkUserDetails(adminEmail);
    
  } catch (error) {
    console.error('❌ 执行过程中发生错误:', error.message);
    process.exit(1);
  }
  
  console.log('\n🏁 检查和修复流程完成');
}

// 执行主函数
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  checkUserDetails,
  checkRoleDistribution,
  updateUserRole,
  verifyRoleUpdate
};