require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkImportedUsers() {
  try {
    // 查询所有导入的用户
    const { data: importedUsers, error } = await supabase
      .from('users')
      .select('name, phone, id_card, role, import_source')
      .eq('import_source', 'excel_import');
    
    if (error) {
      console.error('查询错误:', error);
      return;
    }
    
    console.log('=== 数据库中导入的用户 ===');
    console.log('导入的用户数量:', importedUsers.length);
    console.log('\n导入的用户列表:');
    importedUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name} - ${user.phone} - ${user.role}`);
    });
    
    // 查询所有用户总数
    const { data: allUsers, error: allError } = await supabase
      .from('users')
      .select('name, phone, role, import_source');
    
    if (!allError) {
      console.log('\n=== 数据库中所有用户 ===');
      console.log('总用户数量:', allUsers.length);
      console.log('\n所有用户列表:');
      allUsers.forEach((user, index) => {
        console.log(`${index + 1}. ${user.name} - ${user.phone} - ${user.role} - ${user.import_source || 'manual'}`);
      });
    }
    
  } catch (error) {
    console.error('执行错误:', error);
  }
}

checkImportedUsers();