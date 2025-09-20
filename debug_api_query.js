const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://dadngnjejmxmoxakrcgj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhZG5nbmplam14bW94YWtyY2dqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTU0MjQzNywiZXhwIjoyMDcxMTE4NDM3fQ.rQCglJAXUBtoS-QSWRViZxIRjqxBf19MsD73Kh_Xg4o'
);

async function debugApiQuery() {
  console.log('🔍 调试API查询逻辑...');
  
  try {
    // 模拟API中的完全相同的查询逻辑
    const page = 1;
    const limit = 50;
    const sort_by = 'created_at';
    const sort_order = 'desc';
    
    console.log('\n1. 构建基础查询:');
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
    
    console.log('✅ 基础查询构建完成');
    
    // 没有筛选条件，直接获取总数
    console.log('\n2. 获取总数（count查询）:');
    const countResult = await query.select('*', { count: 'exact', head: true });
    console.log('Count查询结果:', countResult);
    console.log('Count值:', countResult.count);
    console.log('Count错误:', countResult.error);
    
    // 获取数据
    console.log('\n3. 获取数据（带排序和分页）:');
    const dataResult = await query
      .order(sort_by, { ascending: sort_order === 'asc' })
      .range((page - 1) * limit, page * limit - 1);
    
    console.log('数据查询结果:', {
      count: dataResult.data?.length,
      error: dataResult.error,
      firstUser: dataResult.data?.[0] ? {
        id: dataResult.data[0].id,
        name: dataResult.data[0].name,
        role: dataResult.data[0].role
      } : null
    });
    
    // 测试不同的count查询方式
    console.log('\n4. 测试不同的count查询方式:');
    
    // 方式1: 简单count
    const simpleCount = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });
    console.log('简单count:', simpleCount.count, simpleCount.error);
    
    // 方式2: 只选择id的count
    const idCount = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true });
    console.log('ID count:', idCount.count, idCount.error);
    
    // 方式3: 使用相同字段的count
    const sameFieldsCount = await supabase
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
      `, { count: 'exact', head: true });
    console.log('相同字段count:', sameFieldsCount.count, sameFieldsCount.error);
    
  } catch (error) {
    console.error('❌ 调试过程中发生错误:', error);
  }
}

debugApiQuery();