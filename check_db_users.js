/**
 * 检查数据库中的用户数据
 * 验证导入的20个用户是否真的存在
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// 初始化 Supabase 客户端
const supabase = createClient(
  'https://dadngnjejmxmoxakrcgj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhZG5nbmplam14bW94YWtyY2dqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTU0MjQzNywiZXhwIjoyMDcxMTE4NDM3fQ.rQCglJAXUBtoS-QSWRViZxIRjqxBf19MsD73Kh_Xg4o'
);

async function checkUsers() {
  try {
    console.log('正在检查数据库中的用户数据...');
    
    // 查询所有用户
    const { data: allUsers, error: allError } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (allError) {
      console.error('查询所有用户失败:', allError);
      return;
    }
    
    console.log(`\n数据库中总用户数: ${allUsers.length}`);
    
    // 查询最近24小时内创建的用户
    const { data: recentUsers, error: recentError } = await supabase
      .from('users')
      .select('*')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });
    
    if (recentError) {
      console.error('查询最近用户失败:', recentError);
      return;
    }
    
    console.log(`\n最近24小时内创建的用户数: ${recentUsers.length}`);
    
    if (recentUsers.length > 0) {
      console.log('\n最近创建的用户列表:');
      recentUsers.forEach((user, index) => {
        console.log(`${index + 1}. ${user.name} (${user.phone}) - 角色: ${user.role} - 创建时间: ${user.created_at}`);
      });
    }
    
    // 按导入来源分组统计
    const importStats = {};
    allUsers.forEach(user => {
      const source = user.import_source || 'unknown';
      importStats[source] = (importStats[source] || 0) + 1;
    });
    
    console.log('\n按导入来源统计:');
    Object.entries(importStats).forEach(([source, count]) => {
      console.log(`${source}: ${count} 个用户`);
    });
    
    // 查询Excel导入的用户
    const { data: excelUsers, error: excelError } = await supabase
      .from('users')
      .select('*')
      .eq('import_source', 'excel_import')
      .order('created_at', { ascending: false });
    
    if (excelError) {
      console.error('查询Excel导入用户失败:', excelError);
      return;
    }
    
    console.log(`\nExcel导入的用户数: ${excelUsers.length}`);
    
    if (excelUsers.length > 0) {
      console.log('\nExcel导入的用户列表:');
      excelUsers.forEach((user, index) => {
        console.log(`${index + 1}. ${user.name} (${user.phone}) - 角色: ${user.role} - 导入时间: ${user.import_date}`);
      });
    }
    
  } catch (error) {
    console.error('检查用户数据时发生错误:', error);
  }
}

// 执行检查
checkUsers();