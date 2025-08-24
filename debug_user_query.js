const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  'https://dadngnjejmxmoxakrcgj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhZG5nbmplam14bW94YWtyY2dqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTU0MjQzNywiZXhwIjoyMDcxMTE4NDM3fQ.rQCglJAXUBtoS-QSWRViZxIRjqxBf19MsD73Kh_Xg4o'
);

async function debugUserQuery() {
  console.log('🔍 调试用户查询问题...');
  
  try {
    // 1. 直接查询所有用户
    console.log('\n1. 直接查询所有用户:');
    const { data: allUsers, error: allError, count: allCount } = await supabase
      .from('users')
      .select('*', { count: 'exact' });
    
    if (allError) {
      console.error('❌ 查询所有用户失败:', allError);
    } else {
      console.log(`✅ 总用户数: ${allCount}`);
      console.log(`✅ 返回用户数: ${allUsers?.length || 0}`);
      if (allUsers && allUsers.length > 0) {
        console.log('前3个用户:', allUsers.slice(0, 3).map(u => ({ id: u.id, name: u.name, role: u.role })));
      }
    }
    
    // 2. 模拟API查询（带分页）
    console.log('\n2. 模拟API查询（带分页）:');
    let query = supabase
      .from('users')
      .select(`
        id,
        name,
        email,
        phone,
        employee_id,
        department,
        position,
        organization,
        learning_level,
        learning_progress,
        learning_hours,
        last_learning_time,
        exam_permissions,
        exam_history,
        certification_status,
        certification_date,
        role,
        user_type,
        is_verified,
        face_verified,
        import_batch_id,
        import_source,
        import_date,
        sync_status,
        last_sync_time,
        created_at,
        updated_at
      `);
    
    // 获取总数
    const { count } = await query.select('*', { count: 'exact', head: true });
    console.log(`📊 count查询结果: ${count}`);
    
    // 获取数据
    const { data: users, error } = await query
      .order('created_at', { ascending: false })
      .range(0, 49); // 前50个
    
    if (error) {
      console.error('❌ API模拟查询失败:', error);
    } else {
      console.log(`✅ API模拟查询成功，返回用户数: ${users?.length || 0}`);
      if (users && users.length > 0) {
        console.log('前3个用户:', users.slice(0, 3).map(u => ({ id: u.id, name: u.name, role: u.role })));
      }
    }
    
    // 3. 检查字段是否存在问题
    console.log('\n3. 检查特定字段:');
    const { data: fieldCheck, error: fieldError } = await supabase
      .from('users')
      .select('id, name, role, is_verified, import_source')
      .limit(5);
    
    if (fieldError) {
      console.error('❌ 字段检查失败:', fieldError);
    } else {
      console.log('✅ 字段检查成功:');
      console.log(fieldCheck);
    }
    
  } catch (error) {
    console.error('❌ 调试过程中发生错误:', error);
  }
}

debugUserQuery();