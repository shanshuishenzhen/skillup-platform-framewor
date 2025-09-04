const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');

// 使用正确的JWT密钥（从.env文件中获取）
const JWT_SECRET = 'sk1llup_pl4tf0rm_jwt_s3cr3t_k3y_2024_v3ry_s3cur3_r4nd0m_str1ng_f0r_pr0duct10n';

// Supabase配置
const supabaseUrl = 'https://dadngnjejmxmoxakrcgj.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhZG5nbmplam14bW94YWtyY2dqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTU0MjQzNywiZXhwIjoyMDcxMTE4NDM3fQ.rQCglJAXUBtoS-QSWRViZxIRjqxBf19MsD73Kh_Xg4o';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testJWTWithCorrectSecret() {
  console.log('=== 使用正确JWT密钥测试管理员权限 ===\n');
  
  try {
    // 1. 查询用户信息
    console.log('1. 查询用户 13823738278 的信息...');
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('phone', '13823738278')
      .single();
    
    if (userError) {
      console.error('用户查询失败:', userError);
      return;
    }
    
    console.log('用户信息:', {
      id: userData.id,
      phone: userData.phone,
      role: userData.role,
      name: userData.name
    });
    
    // 2. 查询管理员信息
    console.log('\n2. 查询管理员信息...');
    const { data: adminData, error: adminError } = await supabase
      .from('admin_users')
      .select('*')
      .eq('user_id', userData.id)
      .single();
    
    if (adminError) {
      console.error('管理员查询失败:', adminError);
      return;
    }
    
    console.log('管理员信息:', {
      user_id: adminData.user_id,
      role: adminData.role,
      permissions: adminData.permissions
    });
    
    // 3. 生成JWT token（使用正确的密钥）
    console.log('\n3. 生成JWT token（使用正确密钥）...');
    const payload = {
      userId: userData.id,
      phone: userData.phone,
      role: adminData.role, // 使用admin_users表中的角色
      permissions: adminData.permissions || [],
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24小时过期
    };
    
    const token = jwt.sign(payload, JWT_SECRET);
    console.log('JWT Token生成成功');
    console.log('Token长度:', token.length);
    console.log('Token前50字符:', token.substring(0, 50) + '...');
    
    // 4. 验证JWT token
    console.log('\n4. 验证JWT token...');
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      console.log('JWT验证成功');
      console.log('解码后的payload:', {
        userId: decoded.userId,
        phone: decoded.phone,
        role: decoded.role,
        permissions: decoded.permissions,
        iat: new Date(decoded.iat * 1000).toISOString(),
        exp: new Date(decoded.exp * 1000).toISOString()
      });
    } catch (jwtError) {
      console.error('JWT验证失败:', jwtError.message);
      return;
    }
    
    // 5. 测试用户列表API调用
    console.log('\n5. 测试用户列表API调用...');
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
        console.log('API调用成功');
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
        console.error('API调用失败:', errorText);
        
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
    
    // 6. 测试token在请求头中的格式
    console.log('\n6. 测试不同的Authorization格式...');
    
    // 测试Cookie格式
    try {
      const cookieResponse = await fetch('http://localhost:3000/api/admin/users', {
        method: 'GET',
        headers: {
          'Cookie': `token=${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Cookie格式响应状态:', cookieResponse.status);
      if (!cookieResponse.ok) {
        const errorText = await cookieResponse.text();
        console.log('Cookie格式错误:', errorText.substring(0, 100));
      } else {
        console.log('Cookie格式成功');
      }
    } catch (e) {
      console.error('Cookie格式测试失败:', e.message);
    }
    
  } catch (error) {
    console.error('测试过程中发生错误:', error);
  }
}

// 运行测试
testJWTWithCorrectSecret().catch(console.error);