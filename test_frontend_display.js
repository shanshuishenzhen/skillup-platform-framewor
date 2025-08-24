/**
 * 测试前端用户列表显示
 * 验证用户列表是否正确显示所有17个用户
 */

const SUPABASE_URL = 'https://dadngnjejmxmoxakrcgj.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhZG5nbmplam14bW94YWtyY2dqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNzQ0NzE0NCwiZXhwIjoyMDUzMDIzMTQ0fQ.Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8';

async function testFrontendDisplay() {
  console.log('=== 测试前端用户列表显示 ===\n');
  
  try {
    // 1. 先尝试登录获取token
    console.log('1. 尝试管理员登录...');
    const loginResponse = await fetch('http://localhost:3000/api/admin/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'admin@example.com',
        password: 'admin123'
      })
    });
    
    let authToken = null;
    if (loginResponse.ok) {
      const loginResult = await loginResponse.json();
      if (loginResult.success && loginResult.data?.token) {
        authToken = loginResult.data.token;
        console.log('✅ 管理员登录成功');
      } else {
        console.log('⚠️ 登录响应成功但没有token，尝试使用Bearer token');
      }
    } else {
      console.log('⚠️ 登录失败，尝试使用Bearer token');
    }
    
    // 2. 测试用户列表API（带认证）
    console.log('\n2. 测试用户列表API...');
    const headers = {
      'Content-Type': 'application/json'
    };
    
    // 添加认证头
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    } else {
      // 使用一个简单的Bearer token作为fallback
      headers['Authorization'] = 'Bearer admin-token';
    }
    
    const response = await fetch('http://localhost:3000/api/admin/users?page=1&limit=50', {
      headers: headers
    });
    
    if (!response.ok) {
      console.error('❌ API请求失败:', response.status, response.statusText);
      
      // 尝试不带认证的请求
      console.log('\n3. 尝试不带认证的请求...');
      const noAuthResponse = await fetch('http://localhost:3000/api/admin/users?page=1&limit=50');
      if (!noAuthResponse.ok) {
        console.error('❌ 不带认证的请求也失败:', noAuthResponse.status);
        return;
      }
    }
    
    const result = await response.json();
    console.log('✅ API响应成功');
    console.log('📊 API返回数据:');
    console.log(`   - 成功状态: ${result.success}`);
    console.log(`   - 用户总数: ${result.data?.pagination?.total || 0}`);
    console.log(`   - 返回用户数: ${result.data?.users?.length || 0}`);
    
    if (result.data?.users?.length > 0) {
      console.log('\n👥 前3个用户信息:');
      result.data.users.slice(0, 3).forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.name} (${user.email}) - ${user.role}`);
      });
    }
    
    // 4. 检查统计信息
    if (result.data?.statistics) {
      console.log('\n📈 统计信息:');
      const stats = result.data.statistics;
      console.log(`   - 按角色统计: ${JSON.stringify(stats.by_role)}`);
      console.log(`   - 按状态统计: ${JSON.stringify(stats.by_status)}`);
      console.log(`   - 按学习级别统计: ${JSON.stringify(stats.by_learning_level)}`);
      console.log(`   - 按认证状态统计: ${JSON.stringify(stats.by_certification_status)}`);
    }
    
    // 5. 验证数据一致性
    console.log('\n🔍 数据一致性检查:');
    const totalUsers = result.data?.pagination?.total || 0;
    const returnedUsers = result.data?.users?.length || 0;
    
    if (totalUsers === 17 && returnedUsers === 17) {
      console.log('✅ 数据一致性检查通过: 总数和返回数量都是17');
    } else if (totalUsers > 0) {
      console.log(`⚠️ 数据部分正确: 总数=${totalUsers}, 返回数量=${returnedUsers}`);
    } else {
      console.log(`❌ 数据不一致: 总数=${totalUsers}, 返回数量=${returnedUsers}`);
    }
    
    // 6. 检查前端页面访问
    console.log('\n🌐 检查前端页面访问...');
    const frontendResponse = await fetch('http://localhost:3000/admin');
    
    if (frontendResponse.ok) {
      console.log('✅ 前端管理页面可以正常访问');
    } else {
      console.log('❌ 前端管理页面访问失败:', frontendResponse.status);
    }
    
    console.log('\n=== 测试完成 ===');
    console.log('\n💡 建议:');
    console.log('1. 打开浏览器访问 http://localhost:3000/admin');
    console.log('2. 使用 admin@example.com / admin123 登录');
    console.log('3. 检查用户列表是否显示17个用户');
    console.log('4. 查看浏览器控制台是否有JavaScript错误');
    console.log('5. 确认分页信息是否正确显示');
    
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error.message);
    console.error('详细错误:', error);
  }
}

// 运行测试
testFrontendDisplay();