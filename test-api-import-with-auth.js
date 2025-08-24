const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const fetch = require('node-fetch');

// 配置
const API_BASE_URL = 'http://localhost:3000';
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin123456';
const CSV_FILE_PATH = path.join(__dirname, 'uploads', 'test-20-users.csv');

// Supabase配置
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://dadngnjejmxmoxakrcgj.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhZG5nbmplam14bW94YWtyY2dqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTU0MjQzNywiZXhwIjoyMDcxMTE4NDM3fQ.rQCglJAXUBtoS-QSWRViZxIRjqxBf19MsD73Kh_Xg4o';

// 测试带认证的导入API
async function testImportAPIWithAuth() {
  console.log('=== 测试带认证的导入API ===\n');
  
  try {
    // 1. 先进行管理员登录获取token
    console.log('1. 开始管理员登录...');
    const loginResponse = await fetch('http://localhost:3000/api/admin/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        phone: 'admin', // 使用创建的管理员用户名
        password: 'admin123456' // 使用管理员密码
      })
    });
    
    console.log(`登录响应状态: ${loginResponse.status} ${loginResponse.statusText}`);
    
    if (!loginResponse.ok) {
      const loginError = await loginResponse.text();
      console.log('登录失败:', loginError);
      return;
    }
    
    const loginResult = await loginResponse.json();
    console.log('登录成功:', loginResult.message);
    
    if (!loginResult.success || !loginResult.token) {
      console.log('登录失败，未获取到token');
      return;
    }
    
    const authToken = loginResult.token;
    console.log('获取到认证token:', authToken.substring(0, 50) + '...');
    
    // 2. 读取CSV文件
    console.log('\n2. 读取CSV文件...');
    const csvPath = path.join(__dirname, 'uploads', 'test-20-users.csv');
    const csvBuffer = fs.readFileSync(csvPath);
    console.log('CSV文件读取成功');
    
    // 3. 创建FormData
    const formData = new FormData();
    formData.append('file', csvBuffer, {
      filename: 'test-20-users.csv',
      contentType: 'text/csv'
    });
    
    console.log('FormData创建成功');
    
    // 4. 调用导入API（带认证）
    console.log('\n3. 开始调用导入API（带认证）...');
    const importResponse = await fetch('http://localhost:3000/api/admin/users/import', {
      method: 'POST',
      body: formData,
      headers: {
        'Authorization': `Bearer ${authToken}`,
        ...formData.getHeaders()
      }
    });
    
    console.log(`导入API响应状态: ${importResponse.status} ${importResponse.statusText}`);
    
    // 5. 解析响应
    const responseText = await importResponse.text();
    console.log('\n4. 原始响应内容:');
    console.log(responseText);
    
    let result;
    try {
      result = JSON.parse(responseText);
      console.log('\n5. 解析后的响应:');
      console.log(JSON.stringify(result, null, 2));
    } catch (parseError) {
      console.log('\n5. JSON解析失败:', parseError.message);
      return;
    }
    
    // 6. 分析结果
    console.log('\n=== 导入结果分析 ===');
    if (result.success) {
      console.log(`✓ 导入成功`);
      console.log(`总用户数: ${result.total}`);
      console.log(`成功导入: ${result.imported}`);
      console.log(`导入失败: ${result.failed}`);
      
      if (result.errors && result.errors.length > 0) {
        console.log('\n导入错误详情:');
        result.errors.forEach(error => {
          console.log(`  第${error.row}行 (${error.email}): ${error.error}`);
        });
      }
      
      if (result.duplicates && result.duplicates.length > 0) {
        console.log('\n重复用户详情:');
        result.duplicates.forEach(duplicate => {
          console.log(`  第${duplicate.row}行 (${duplicate.email}): ${duplicate.action}`);
        });
      }
    } else {
      console.log(`✗ 导入失败: ${result.error || '未知错误'}`);
    }
    
    // 7. 分析具体的目标用户
    console.log('\n=== 目标用户分析 ===');
    const targetUsers = ['范向军', '朱金万', '刘明鑫', '崔伟'];
    
    if (result.errors) {
      targetUsers.forEach(name => {
        const error = result.errors.find(e => e.email && e.email.includes(name));
        if (error) {
          console.log(`${name}: 导入失败 - ${error.error}`);
        } else {
          console.log(`${name}: 未在错误列表中找到`);
        }
      });
    }
    
    if (result.duplicates) {
      targetUsers.forEach(name => {
        const duplicate = result.duplicates.find(d => d.email && d.email.includes(name));
        if (duplicate) {
          console.log(`${name}: 重复用户 - ${duplicate.action}`);
        }
      });
    }
    
    // 8. 总结分析
    console.log('\n=== 问题总结 ===');
    if (result.success) {
      const expectedUsers = 20;
      const actualImported = result.imported || 0;
      const actualFailed = result.failed || 0;
      
      console.log(`期望导入用户数: ${expectedUsers}`);
      console.log(`实际导入用户数: ${actualImported}`);
      console.log(`导入失败用户数: ${actualFailed}`);
      
      if (actualImported < expectedUsers) {
        console.log(`\n⚠️  问题分析: 有 ${expectedUsers - actualImported} 个用户未成功导入`);
        
        if (result.errors && result.errors.length > 0) {
          const errorTypes = {};
          result.errors.forEach(error => {
            const errorType = error.error.split(' - ')[0] || error.error;
            errorTypes[errorType] = (errorTypes[errorType] || 0) + 1;
          });
          
          console.log('\n错误类型统计:');
          Object.entries(errorTypes).forEach(([type, count]) => {
            console.log(`  ${type}: ${count} 个用户`);
          });
        }
      } else {
        console.log('\n✅ 所有用户都成功导入');
      }
    }
    
  } catch (error) {
    console.error('测试过程中发生错误:', error.message);
    console.error('错误堆栈:', error.stack);
  }
}

// 运行测试
testImportAPIWithAuth();