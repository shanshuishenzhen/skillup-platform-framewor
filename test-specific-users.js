const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const fetch = require('node-fetch');

// 配置
const API_BASE_URL = 'http://localhost:3000';
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin123456';

// Supabase配置
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://dadngnjejmxmoxakrcgj.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhZG5nbmplam14bW94YWtyY2dqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTU0MjQzNywiZXhwIjoyMDcxMTE4NDM3fQ.rQCglJAXUBtoS-QSWRViZxIRjqxBf19MsD73Kh_Xg4o';

// 创建只包含范向军和朱金万的CSV内容
const csvContent = `用户名,姓名,身份证号码,角色,密码,手机号码
范向军,范向军,412828198808083537,考评员,123456,13926588494
朱金万,朱金万,440981198201283736,考评员,123456,13142934041`;

// 测试特定用户导入
async function testSpecificUsers() {
  console.log('=== 测试范向军和朱金万导入 ===\n');
  
  try {
    // 1. 管理员登录
    console.log('1. 开始管理员登录...');
    const loginResponse = await fetch('http://localhost:3000/api/admin/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        phone: 'admin',
        password: 'admin123456'
      })
    });
    
    if (!loginResponse.ok) {
      const loginError = await loginResponse.text();
      console.log('登录失败:', loginError);
      return;
    }
    
    const loginResult = await loginResponse.json();
    const authToken = loginResult.token;
    console.log('登录成功，获取到token');
    
    // 2. 创建FormData
    const formData = new FormData();
    formData.append('file', Buffer.from(csvContent, 'utf8'), {
      filename: 'test-specific-users.csv',
      contentType: 'text/csv'
    });
    
    // 3. 调用导入API
    console.log('\n2. 开始导入范向军和朱金万...');
    const importResponse = await fetch('http://localhost:3000/api/admin/users/import', {
      method: 'POST',
      body: formData,
      headers: {
        'Authorization': `Bearer ${authToken}`,
        ...formData.getHeaders()
      }
    });
    
    console.log(`导入API响应状态: ${importResponse.status} ${importResponse.statusText}`);
    
    const responseText = await importResponse.text();
    console.log('\n3. 原始响应内容:');
    console.log(responseText);
    
    let result;
    try {
      result = JSON.parse(responseText);
      console.log('\n4. 解析后的响应:');
      console.log(JSON.stringify(result, null, 2));
    } catch (parseError) {
      console.log('\n4. JSON解析失败:', parseError.message);
      return;
    }
    
    // 4. 详细分析
    console.log('\n=== 详细分析 ===');
    if (result.errors && result.errors.length > 0) {
      console.log('错误详情:');
      result.errors.forEach((error, index) => {
        console.log(`错误 ${index + 1}:`);
        console.log(`  行号: ${error.row}`);
        console.log(`  用户: ${error.email || error.name || '未知'}`);
        console.log(`  错误: ${error.error}`);
        console.log(`  详细信息: ${JSON.stringify(error, null, 2)}`);
        console.log('');
      });
    }
    
    if (result.duplicates && result.duplicates.length > 0) {
      console.log('重复用户详情:');
      result.duplicates.forEach((duplicate, index) => {
        console.log(`重复 ${index + 1}:`);
        console.log(`  行号: ${duplicate.row}`);
        console.log(`  用户: ${duplicate.email || duplicate.name || '未知'}`);
        console.log(`  操作: ${duplicate.action}`);
        console.log('');
      });
    }
    
  } catch (error) {
    console.error('测试过程中发生错误:', error.message);
    console.error('错误堆栈:', error.stack);
  }
}

// 运行测试
testSpecificUsers();