console.log('开始测试...');

const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const fetch = require('node-fetch');

// 直接测试
async function directTest() {
  try {
    console.log('1. 测试管理员登录...');
    
    const loginResponse = await fetch('http://localhost:3000/api/admin/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: 'admin',
        password: 'admin123456'
      })
    });
    
    console.log('登录响应状态:', loginResponse.status);
    
    if (loginResponse.ok) {
      const loginResult = await loginResponse.json();
      console.log('登录成功!');
      
      // 测试导入
      console.log('\n2. 测试导入API...');
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
      
      console.log('导入响应状态:', importResponse.status);
      
      const importResult = await importResponse.json();
      console.log('\n导入结果:');
      console.log('成功:', importResult.success);
      console.log('总数:', importResult.total);
      console.log('导入:', importResult.imported);
      console.log('失败:', importResult.failed);
      
      if (importResult.errors) {
        console.log('\n错误详情:');
        importResult.errors.forEach(error => {
          console.log(`- 第${error.row}行: ${error.error}`);
        });
      }
      
    } else {
      const error = await loginResponse.text();
      console.log('登录失败:', error);
    }
    
  } catch (error) {
    console.log('测试错误:', error.message);
  }
}

directTest().then(() => {
  console.log('测试完成');
}).catch(error => {
  console.log('测试异常:', error.message);
});