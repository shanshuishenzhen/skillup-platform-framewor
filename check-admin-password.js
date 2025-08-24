/**
 * 检查和修复管理员密码哈希脚本
 * 用于验证手机号13823738278的管理员用户密码是否正确加密存储
 */

const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Supabase配置
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 缺少Supabase配置信息');
  console.error('请确保.env文件中包含:');
  console.error('- NEXT_PUBLIC_SUPABASE_URL');
  console.error('- SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * 检查管理员用户密码哈希
 * @param {string} phone - 手机号
 * @param {string} plainPassword - 明文密码
 */
async function checkAdminPassword(phone, plainPassword) {
  try {
    console.log('🔍 检查管理员用户密码哈希...');
    console.log(`手机号: ${phone}`);
    console.log(`明文密码: ${plainPassword}`);
    console.log('\n' + '='.repeat(50));

    // 查询管理员用户
    const { data: admin, error } = await supabase
      .from('admin_users')
      .select('*')
      .eq('phone', phone)
      .single();

    if (error) {
      console.error('❌ 查询管理员用户失败:', error.message);
      return false;
    }

    if (!admin) {
      console.error('❌ 未找到管理员用户');
      return false;
    }

    console.log('✅ 找到管理员用户:');
    console.log(`- ID: ${admin.id}`);
    console.log(`- 用户名: ${admin.username}`);
    console.log(`- 邮箱: ${admin.email}`);
    console.log(`- 角色: ${admin.role}`);
    console.log(`- 状态: ${admin.status}`);
    console.log(`- 当前密码哈希: ${admin.password_hash}`);
    console.log('\n' + '-'.repeat(30));

    // 验证当前密码
    const isCurrentPasswordValid = await bcrypt.compare(plainPassword, admin.password_hash);
    console.log(`🔐 当前密码验证结果: ${isCurrentPasswordValid ? '✅ 正确' : '❌ 错误'}`);

    if (!isCurrentPasswordValid) {
      console.log('\n🔧 密码验证失败，需要重新生成密码哈希...');
      
      // 生成新的密码哈希
      const saltRounds = 12;
      const newPasswordHash = await bcrypt.hash(plainPassword, saltRounds);
      console.log(`新密码哈希: ${newPasswordHash}`);
      
      // 验证新密码哈希
      const isNewPasswordValid = await bcrypt.compare(plainPassword, newPasswordHash);
      console.log(`新密码哈希验证: ${isNewPasswordValid ? '✅ 正确' : '❌ 错误'}`);
      
      if (isNewPasswordValid) {
        console.log('\n📝 更新数据库中的密码哈希...');
        
        const { error: updateError } = await supabase
          .from('admin_users')
          .update({ 
            password_hash: newPasswordHash,
            updated_at: new Date().toISOString()
          })
          .eq('phone', phone);
        
        if (updateError) {
          console.error('❌ 更新密码哈希失败:', updateError.message);
          return false;
        }
        
        console.log('✅ 密码哈希更新成功!');
        
        // 再次验证更新后的密码
        const { data: updatedAdmin, error: verifyError } = await supabase
          .from('admin_users')
          .select('password_hash')
          .eq('phone', phone)
          .single();
        
        if (verifyError) {
          console.error('❌ 验证更新后的密码失败:', verifyError.message);
          return false;
        }
        
        const isFinalPasswordValid = await bcrypt.compare(plainPassword, updatedAdmin.password_hash);
        console.log(`🔍 最终密码验证: ${isFinalPasswordValid ? '✅ 正确' : '❌ 错误'}`);
        
        return isFinalPasswordValid;
      } else {
        console.error('❌ 新生成的密码哈希验证失败');
        return false;
      }
    } else {
      console.log('✅ 当前密码哈希正确，无需修复');
      return true;
    }
  } catch (error) {
    console.error('❌ 检查密码过程中发生错误:', error.message);
    return false;
  }
}

/**
 * 测试管理员登录
 * @param {string} phone - 手机号
 * @param {string} password - 密码
 */
async function testAdminLogin(phone, password) {
  try {
    console.log('\n' + '='.repeat(50));
    console.log('🧪 测试管理员登录API...');
    
    const response = await fetch('http://localhost:3000/api/admin/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ phone, password }),
    });
    
    const result = await response.json();
    
    console.log(`HTTP状态码: ${response.status}`);
    console.log('响应结果:', JSON.stringify(result, null, 2));
    
    if (response.ok && result.success) {
      console.log('✅ 管理员登录测试成功!');
      return true;
    } else {
      console.log('❌ 管理员登录测试失败');
      return false;
    }
  } catch (error) {
    console.error('❌ 测试登录过程中发生错误:', error.message);
    return false;
  }
}

// 主函数
async function main() {
  console.log('🚀 开始检查管理员密码哈希...');
  console.log('时间:', new Date().toLocaleString());
  console.log('\n');
  
  const phone = '13823738278';
  const password = '123456';
  
  // 检查和修复密码
  const passwordFixed = await checkAdminPassword(phone, password);
  
  if (passwordFixed) {
    // 测试登录
    await testAdminLogin(phone, password);
  }
  
  console.log('\n🏁 检查完成');
}

// 运行脚本
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { checkAdminPassword, testAdminLogin };