const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

// 使用实际的Supabase配置
const supabaseUrl = 'https://dadngnjejmxmoxakrcgj.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhZG5nbmplam14bW94YWtyY2dqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTU0MjQzNywiZXhwIjoyMDcxMTE4NDM3fQ.rQCglJAXUBtoS-QSWRViZxIRjqxBf19MsD73Kh_Xg4o';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createAdmin() {
  try {
    console.log('开始创建管理员账户...');
    
    // 生成密码哈希
    const password = 'admin123456';
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    // 创建管理员用户
    const adminData = {
      username: 'admin',
      email: 'admin@example.com',
      real_name: '系统管理员',
      role: 'super_admin',
      permissions: [
        'user_management',
        'course_management', 
        'exam_management',
        'financial_management',
        'system_management',
        'admin_management',
        'analytics_view'
      ],
      status: 'active',
      password_hash: passwordHash,
      phone: null,
      department: 'IT部门',
      position: '系统管理员',
      login_attempts: 0,
      last_login_at: null,
      last_login_ip: null,
      password_changed_at: new Date().toISOString(),
      force_password_change: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: null
    };
    
    const { data, error } = await supabase
      .from('admin_users')
      .insert([adminData])
      .select();
    
    if (error) {
      console.error('创建管理员失败:', error);
      return;
    }
    
    console.log('管理员账户创建成功:');
    console.log('用户名: admin');
    console.log('密码: admin123456');
    console.log('创建的管理员数据:', data[0]);
    
  } catch (error) {
    console.error('创建管理员过程中发生错误:', error);
  }
}

createAdmin();