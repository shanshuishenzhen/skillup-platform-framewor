/**
 * 验证数据库users表的角色约束是否已经修复
 * 检查是否可以插入examiner和internal_supervisor角色的用户
 */

const { createClient } = require('@supabase/supabase-js');

// Supabase配置
const SUPABASE_URL = 'https://wnpkmkqtqjqjqjqjqjqj.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InducGtta3F0cWpxanFqcWpxanFqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNTU0NzE4NCwiZXhwIjoyMDUxMTIzMTg0fQ.Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8';

// 创建Supabase客户端
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/**
 * 测试角色约束是否已修复
 * @returns {Promise<boolean>} 返回测试结果
 */
async function testRoleConstraint() {
  console.log('开始测试角色约束...');
  
  // 测试数据
  const testUsers = [
    {
      name: '测试考评员',
      phone: '19900000001',
      id_card: '110101199001010001',
      role: 'examiner',
      password: 'test123456',
      email: 'test_examiner@test.com'
    },
    {
      name: '测试内部督导员',
      phone: '19900000002',
      id_card: '110101199001010002',
      role: 'internal_supervisor',
      password: 'test123456',
      email: 'test_supervisor@test.com'
    }
  ];
  
  let allTestsPassed = true;
  
  for (const user of testUsers) {
    try {
      console.log(`\n测试插入${user.role}角色用户: ${user.name}`);
      
      // 尝试插入用户
      const { data, error } = await supabase
        .from('users')
        .insert(user)
        .select();
      
      if (error) {
        console.error(`❌ 插入${user.role}角色用户失败:`, error.message);
        allTestsPassed = false;
        
        // 检查是否是角色约束错误
        if (error.message.includes('chk_users_role') || error.message.includes('violates check constraint')) {
          console.error('🔍 检测到角色约束错误，需要执行修复迁移');
        }
      } else {
        console.log(`✅ 成功插入${user.role}角色用户:`, data[0].name);
        
        // 清理测试数据
        await supabase
          .from('users')
          .delete()
          .eq('id', data[0].id);
        console.log(`🧹 已清理测试用户: ${user.name}`);
      }
    } catch (err) {
      console.error(`❌ 测试${user.role}角色时发生异常:`, err.message);
      allTestsPassed = false;
    }
  }
  
  return allTestsPassed;
}

/**
 * 检查当前角色约束定义
 */
async function checkCurrentRoleConstraint() {
  console.log('\n检查当前角色约束定义...');
  
  try {
    const { data, error } = await supabase
      .rpc('get_table_constraints', {
        table_name: 'users',
        constraint_type: 'CHECK'
      });
    
    if (error) {
      console.log('无法通过RPC获取约束信息，尝试直接查询...');
      
      // 直接查询约束信息
      const { data: constraintData, error: constraintError } = await supabase
        .from('information_schema.check_constraints')
        .select('*')
        .like('constraint_name', '%role%');
      
      if (constraintError) {
        console.error('查询约束信息失败:', constraintError.message);
      } else {
        console.log('角色相关约束:', constraintData);
      }
    } else {
      console.log('表约束信息:', data);
    }
  } catch (err) {
    console.log('检查约束时发生错误:', err.message);
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('=== 验证数据库users表角色约束修复状态 ===\n');
  
  // 检查当前约束
  await checkCurrentRoleConstraint();
  
  // 测试角色约束
  const testResult = await testRoleConstraint();
  
  console.log('\n=== 测试结果 ===');
  if (testResult) {
    console.log('✅ 所有角色约束测试通过，examiner和internal_supervisor角色可以正常使用');
  } else {
    console.log('❌ 角色约束测试失败，需要执行修复迁移');
    console.log('\n建议执行以下命令修复角色约束:');
    console.log('node -e "const { createClient } = require(\'@supabase/supabase-js\'); const supabase = createClient(\'https://wnpkmkqtqjqjqjqjqjqj.supabase.co\', \'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InducGtta3F0cWpxanFqcWpxanFqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNTU0NzE4NCwiZXhwIjoyMDUxMTIzMTg0fQ.Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8\'); supabase.rpc(\'exec_sql\', { sql: \'ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check; ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role::text = ANY (ARRAY[\\\'admin\\\'::character varying, \\\'expert\\\'::character varying, \\\'teacher\\\'::character varying, \\\'student\\\'::character varying, \\\'user\\\'::character varying, \\\'examiner\\\'::character varying, \\\'internal_supervisor\\\'::character varying]::text[]));\'}).then(console.log).catch(console.error);"');
  }
  
  return testResult;
}

// 执行测试
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testRoleConstraint, checkCurrentRoleConstraint };