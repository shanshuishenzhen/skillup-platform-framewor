const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');
const config = require('./test-config');

// 验证配置
if (!config.validate()) {
  process.exit(1);
}

// 使用配置文件中的值
const JWT_SECRET = config.JWT_SECRET;
const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_KEY);

async function testAPIWithParams() {
  console.log('=== 测试带参数的用户列表API ===\n');
  
  try {
    // 1. 通过手机号查询admin_users表
    console.log('1. 查询管理员信息...');
    const { data: adminData, error: adminError } = await supabase
      .from('admin_users')
      .select('*')
      .eq('phone', '13823738278')
      .single();
    
    if (adminError) {
      console.error('管理员查询失败:', adminError);
      return;
    }
    
    console.log('管理员信息:', {
      id: adminData.id,
      username: adminData.username,
      phone: adminData.phone,
      role: adminData.role,
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
    
    // 3. 测试用户列表API调用（带参数）
    console.log('\n3. 测试用户列表API调用（带分页参数）...');
    
    // 构建查询参数
    const params = new URLSearchParams({
      page: '1',
      limit: '10'
    });
    
    const apiUrl = `http://localhost:3000/api/admin/users?${params.toString()}`;
    console.log('请求URL:', apiUrl);
    
    try {
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('API响应状态:', response.status, response.statusText);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ API调用成功！');
        console.log('响应数据结构:', {
          success: data.success,
          total: data.total,
          page: data.page,
          limit: data.limit,
          userCount: data.users ? data.users.length : 0
        });
        
        if (data.users && data.users.length > 0) {
          console.log('\n前3个用户示例:');
          data.users.slice(0, 3).forEach((user, index) => {
            console.log(`${index + 1}. ID: ${user.id}, 手机: ${user.phone || '未设置'}, 角色: ${user.role}, 状态: ${user.status}`);
          });
        }
        
        console.log('\n🎉 权限问题已解决！管理员可以正常访问用户列表。');
        
      } else {
        const errorText = await response.text();
        console.error('❌ API调用失败:', errorText);
        
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
    
    // 4. 测试其他API参数组合
    console.log('\n4. 测试其他参数组合...');
    
    const testCases = [
      { page: '1', limit: '5', search: 'admin' },
      { page: '1', limit: '20', role: 'admin' },
      { page: '1', limit: '10', status: 'active' }
    ];
    
    for (const testCase of testCases) {
      const testParams = new URLSearchParams(testCase);
      const testUrl = `http://localhost:3000/api/admin/users?${testParams.toString()}`;
      
      try {
        const testResponse = await fetch(testUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log(`参数 ${JSON.stringify(testCase)}: ${testResponse.status} ${testResponse.statusText}`);
        
        if (testResponse.ok) {
          const testData = await testResponse.json();
          console.log(`  返回 ${testData.users ? testData.users.length : 0} 个用户`);
        }
      } catch (e) {
        console.log(`参数 ${JSON.stringify(testCase)}: 请求失败`);
      }
    }
    
  } catch (error) {
    console.error('测试过程中发生错误:', error);
  }
}

// 运行测试
testAPIWithParams().catch(console.error);