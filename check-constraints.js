const { createClient } = require('@supabase/supabase-js');

// Supabase配置
const SUPABASE_URL = 'https://rnhqfqkqwqjxqxqxqxqx.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJuaHFmcWtxd3FqeHF4cXhxeHF4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNTU0NzE5MSwiZXhwIjoyMDUxMTIzMTkxfQ.Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function checkConstraints() {
  try {
    // 查询约束信息
    const { data, error } = await supabase
      .rpc('sql', {
        query: `
          SELECT 
            constraint_name, 
            check_clause
          FROM information_schema.check_constraints 
          WHERE constraint_name LIKE '%role%' 
            AND constraint_schema = 'public';
        `
      });

    if (error) {
      console.error('查询约束失败:', error);
      return;
    }

    console.log('=== 角色相关约束 ===');
    console.log(JSON.stringify(data, null, 2));

    // 也查询表约束
    const { data: tableConstraints, error: tableError } = await supabase
      .rpc('sql', {
        query: `
          SELECT 
            tc.constraint_name,
            cc.check_clause
          FROM information_schema.table_constraints tc
          JOIN information_schema.check_constraints cc 
            ON tc.constraint_name = cc.constraint_name
          WHERE tc.table_name = 'users' 
            AND tc.constraint_type = 'CHECK'
            AND cc.check_clause LIKE '%role%';
        `
      });

    if (tableError) {
      console.error('查询表约束失败:', tableError);
      return;
    }

    console.log('\n=== users表的角色约束 ===');
    console.log(JSON.stringify(tableConstraints, null, 2));

  } catch (error) {
    console.error('执行失败:', error);
  }
}

checkConstraints();