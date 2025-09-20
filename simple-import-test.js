const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const fetch = require('node-fetch');

// 简化的导入测试
async function simpleImportTest() {
  console.log('=== 简化导入测试 ===');
  
  try {
    // 1. 管理员登录
    console.log('1. 管理员登录...');
    const loginResponse = await fetch('http://localhost:3000/api/admin/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: '13410511339', // 使用数据库中的管理员账号
        password: 'admin123456'
      })
    });
    
    console.log(`登录状态: ${loginResponse.status}`);
    
    if (!loginResponse.ok) {
      const error = await loginResponse.text();
      console.log('登录失败:', error);
      return;
    }
    
    const loginResult = await loginResponse.json();
    console.log('登录成功，获取token');
    
    // 2. 读取CSV文件并调用导入API
    console.log('\n2. 调用导入API...');
    const csvPath = path.join(__dirname, 'uploads', 'test-20-users.csv');
    const csvBuffer = fs.readFileSync(csvPath);
    
    const formData = new FormData();
    formData.append('file', csvBuffer, {
      filename: 'test-20-users.csv',
      contentType: 'text/csv'
    });
    
    const importResponse = await fetch('http://localhost:3000/api/admin/users/import', {
      method: 'POST',
      body: formData,
      headers: {
        'Authorization': `Bearer ${loginResult.token}`,
        ...formData.getHeaders()
      }
    });
    
    console.log(`导入状态: ${importResponse.status}`);
    
    const result = await importResponse.json();
    console.log('\n3. 导入结果:');
    console.log(JSON.stringify(result, null, 2));
    
    // 3. 分析结果
    if (result.success) {
      console.log(`\n成功导入: ${result.imported}/${result.total}`);
      
      if (result.errors && result.errors.length > 0) {
        console.log('\n导入错误:');
        result.errors.forEach((error, index) => {
          console.log(`${index + 1}. 第${error.row}行: ${error.error}`);
        });
      }
    } else {
      console.log('导入失败:', result.error);
    }
    
  } catch (error) {
    console.error('测试错误:', error.message);
  }
}

simpleImportTest();