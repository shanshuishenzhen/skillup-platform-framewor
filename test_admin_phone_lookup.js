const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');

// 使用正确的JWT密钥
const JWT_SECRET = 'sk1llup_pl4tf0rm_jwt_s3cr3t_k3y_2024_v3ry_s3cur3_r4nd0m_str1ng_f0r_pr0duct10n';

// Supabase配置
const supabaseUrl = 'https://dadngnjejmxmoxakrcgj.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhZG5nbmplam14bW94YWtyY2dqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTU0MjQzNywiZXhwIjoyMDcxMTE4NDM3fQ.rQCglJAXUBtoS-QSWRViZxIRjqxBf19MsD73Kh_Xg4o';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testAdminPhoneLookup() {
  console.log('=== 通过手机号查询管理员权限测试 ===\n');
  
  try {
    // 1. 直接通过手机号查询admin_users表
    console.log('1. 通过手机号查询admin_users表...');
    const { data: adminData, error: adminError } = await supabase
      .from('admin_users')
      .select('*')
      .eq('phone', '13823738278')
      .single();
    
    if (adminError) {
      console.error('管理员查询失败:', adminError);
      
      // 如果没找到，查看所有管理员的手机号
      console.log('\n查看所有管理员的手机号...');
      const { data: allAdmins, error: allError } = await supabase
        .from('admin_users')
        .select('id, username, phone, role, status')
        .limit(10);
      
      if (allError) {
        console.error('查询所有管理员失败:', allError);
      } else {
        console.log('现有管理员列表:');
        allAdmins.forEach(admin => {
          console.log(`- ID: ${admin.id}, 用户名: ${admin.username}, 手机: ${admin.phone || '未设置'}, 角色: ${admin.role}, 状态: ${admin.status}`);
        });
      }
      return;
    }
    
    console.log('管理员信息:', {
      id: adminData.id,
      username: adminData.username,
      phone: adminData.phone,
      role: adminData.role,
      permissions: adminData.permissions,
      status: adminData.status
    });
    
    // 2. 生成JWT token
    console.log('\n2. 生成JWT token...');
    const payload = {
      userId: adminData.id,
      phone: adminData.phone,
      username: adminData.username,
      role: adminData.role,
      permissions: adminData.permissions || [],
      type: 'admin',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60),
      iss: 'skillup-platform'
    };
    
    const token = jwt.sign(payload, JWT_SECRET);
    console.log('JWT Token生成成功');
    console.log('Token payload:', payload);
    
    // 3. 验证JWT token
    console.log('\n3. 验证JWT token...');
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      console.log('JWT验证成功');
      console.log('解码后的信息:', {
        userId: decoded.userId,
        username: decoded.username,
        phone: decoded.phone,
        role: decoded.role,
        permissions: decoded.permissions,
        type: decoded.type
      });
    } catch (jwtError) {
      console.error('JWT验证失败:', jwtError.message);
      return;
    }
    
    // 4. 测试用户列表API调用
    console.log('\n4. 测试用户列表API调用...');
    try {
      const response = await fetch('http://localhost:3000/api/admin/users', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('API响应状态:', response.status, response.statusText);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ API调用成功');
        console.log('返回用户数量:', data.users ? data.users.length : 0);
        if (data.users && data.users.length > 0) {
          console.log('第一个用户示例:', {
            id: data.users[0].id,
            phone: data.users[0].phone,
            role: data.users[0].role
          });
        }
      } else {
        const errorText = await response.text();
        console.error('❌ API调用失败:', errorText);
        
        // 尝试解析错误信息
        try {
          const errorData = JSON.parse(errorText);
          console.error('错误详情:', errorData);
        } catch (e) {
          console.error('无法解析错误响应');
        }
      }
    } catch (fetchError) {
      console.error('API请求异常:', fetchError.message);
    }
    
  } catch (error) {
    console.error('测试过程中发生错误:', error);
  }
}

// 运行测试
testAdminPhoneLookup().catch(console.error);