/**
 * 创建测试管理员用户脚本
 * 用于创建或更新testadmin@example.com管理员用户
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
 * 创建或更新测试管理员用户
 */
async function createTestAdmin() {
  console.log('🚀 开始创建/更新测试管理员用户...');
  console.log('=' .repeat(60));
  
  const adminEmail = 'testadmin@example.com';
  const adminName = '测试管理员';
  const adminRole = 'admin';
  
  try {
    // 1. 首先检查是否已存在该邮箱的用户
    console.log(`\n🔍 检查用户是否已存在: ${adminEmail}`);
    const { data: existingUsers, error: checkError } = await supabase
      .from('users')
      .select('*')
      .eq('email', adminEmail);
    
    if (checkError) {
      console.error('❌ 检查用户失败:', checkError.message);
      return false;
    }
    
    if (existingUsers && existingUsers.length > 0) {
      console.log('✅ 用户已存在，更新角色信息...');
      const user = existingUsers[0];
      
      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update({
          role: adminRole,
          status: 'active',
          name: adminName,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
        .select();
      
      if (updateError) {
        console.error('❌ 更新用户失败:', updateError.message);
        return false;
      }
      
      console.log('✅ 用户更新成功:');
      console.log(`   - ID: ${updatedUser[0].id}`);
      console.log(`   - 姓名: ${updatedUser[0].name}`);
      console.log(`   - 邮箱: ${updatedUser[0].email}`);
      console.log(`   - 角色: ${updatedUser[0].role}`);
      console.log(`   - 状态: ${updatedUser[0].status}`);
      
      return true;
    }
    
    // 2. 用户不存在，创建新用户
    console.log('⚠️  用户不存在，创建新用户...');
    
    const newUser = {
      email: adminEmail,
      name: adminName,
      role: adminRole,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const { data: createdUser, error: createError } = await supabase
      .from('users')
      .insert([newUser])
      .select();
    
    if (createError) {
      console.error('❌ 创建用户失败:', createError.message);
      return false;
    }
    
    console.log('✅ 用户创建成功:');
    console.log(`   - ID: ${createdUser[0].id}`);
    console.log(`   - 姓名: ${createdUser[0].name}`);
    console.log(`   - 邮箱: ${createdUser[0].email}`);
    console.log(`   - 角色: ${createdUser[0].role}`);
    console.log(`   - 状态: ${createdUser[0].status}`);
    
    return true;
    
  } catch (err) {
    console.error('❌ 操作过程中发生错误:', err.message);
    return false;
  }
}

/**
 * 更新现有的niemiao用户邮箱
 */
async function updateNiemiaoUser() {
  console.log('\n🔧 更新niemiao用户邮箱...');
  
  try {
    const { data: updatedUser, error } = await supabase
      .from('users')
      .update({
        email: 'testadmin@example.com',
        status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('name', 'niemiao')
      .eq('role', 'admin')
      .select();
    
    if (error) {
      console.error('❌ 更新niemiao用户失败:', error.message);
      return false;
    }
    
    if (!updatedUser || updatedUser.length === 0) {
      console.log('⚠️  没有找到niemiao用户');
      return false;
    }
    
    console.log('✅ niemiao用户更新成功:');
    console.log(`   - ID: ${updatedUser[0].id}`);
    console.log(`   - 姓名: ${updatedUser[0].name}`);
    console.log(`   - 邮箱: ${updatedUser[0].email}`);
    console.log(`   - 角色: ${updatedUser[0].role}`);
    console.log(`   - 状态: ${updatedUser[0].status}`);
    
    return true;
    
  } catch (err) {
    console.error('❌ 更新niemiao用户时发生错误:', err.message);
    return false;
  }
}

/**
 * 验证最终结果
 */
async function verifyResult() {
  console.log('\n✅ 验证最终结果...');
  
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'testadmin@example.com');
    
    if (error) {
      console.error('❌ 验证失败:', error.message);
      return false;
    }
    
    if (!data || data.length === 0) {
      console.log('❌ 验证失败: testadmin@example.com 用户不存在');
      return false;
    }
    
    const user = data[0];
    console.log('✅ 验证成功:');
    console.log(`   - 邮箱: ${user.email}`);
    console.log(`   - 姓名: ${user.name}`);
    console.log(`   - 角色: ${user.role}`);
    console.log(`   - 状态: ${user.status}`);
    
    if (user.role === 'admin' && user.status === 'active') {
      console.log('🎉 测试管理员用户配置完成！');
      return true;
    } else {
      console.log('⚠️  用户配置不完整，请检查角色和状态');
      return false;
    }
    
  } catch (err) {
    console.error('❌ 验证过程中发生错误:', err.message);
    return false;
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('🎯 测试管理员用户创建/更新流程');
  
  // 方案1: 更新现有的niemiao用户
  console.log('\n📋 方案1: 更新现有的niemiao用户邮箱');
  const updateSuccess = await updateNiemiaoUser();
  
  if (updateSuccess) {
    await verifyResult();
    return;
  }
  
  // 方案2: 创建新的testadmin用户
  console.log('\n📋 方案2: 创建新的testadmin用户');
  const createSuccess = await createTestAdmin();
  
  if (createSuccess) {
    await verifyResult();
  }
  
  console.log('\n🏁 操作完成');
}

// 执行主函数
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  createTestAdmin,
  updateNiemiaoUser,
  verifyResult
};