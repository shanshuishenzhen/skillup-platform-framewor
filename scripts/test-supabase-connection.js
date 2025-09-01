/**
 * Supabase连接测试脚本
 * 验证Supabase配置是否正确
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

/**
 * 测试Supabase连接
 */
async function testSupabaseConnection() {
  console.log('🔍 开始测试Supabase连接...');
  
  // 检查环境变量
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  console.log('\n📋 环境变量检查:');
  console.log('- NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅ 已配置' : '❌ 未配置');
  console.log('- NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? '✅ 已配置' : '❌ 未配置');
  console.log('- SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅ 已配置' : '❌ 未配置');
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('\n❌ 缺少必要的Supabase环境变量');
    process.exit(1);
  }
  
  try {
    // 测试匿名客户端连接
    console.log('\n🔗 测试匿名客户端连接...');
    const anonClient = createClient(supabaseUrl, supabaseAnonKey);
    
    // 尝试获取用户信息（测试连接）
    const { data: userData, error: userError } = await anonClient.auth.getUser();
    if (userError && userError.message !== 'Invalid JWT') {
      console.warn('⚠️  匿名客户端连接警告:', userError.message);
    } else {
      console.log('✅ 匿名客户端连接成功');
    }
    
    // 测试服务角色客户端连接（如果配置了）
    if (supabaseServiceKey) {
      console.log('\n🔗 测试服务角色客户端连接...');
      const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      });
      
      // 尝试查询用户表（测试服务角色权限）
      const { data: usersData, error: usersError } = await adminClient
        .from('users')
        .select('count')
        .limit(1);
        
      if (usersError) {
        console.warn('⚠️  服务角色客户端查询警告:', usersError.message);
      } else {
        console.log('✅ 服务角色客户端连接成功');
      }
    }
    
    console.log('\n🎉 Supabase连接测试完成！');
    
  } catch (error) {
    console.error('\n❌ Supabase连接测试失败:', error.message);
    process.exit(1);
  }
}

// 运行测试
testSupabaseConnection();