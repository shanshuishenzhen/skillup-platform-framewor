const fs = require('fs');
const FormData = require('form-data');
const fetch = require('node-fetch');
require('dotenv').config();

/**
 * 测试用户导入API
 * 模拟前端上传CSV文件到后端API
 */
async function testUserImport() {
  try {
    console.log('开始测试用户导入API...');
    
    // 检查CSV文件是否存在
    const csvFilePath = './uploads/test-20-users.csv';
    if (!fs.existsSync(csvFilePath)) {
      console.error('CSV文件不存在:', csvFilePath);
      return;
    }
    
    // 创建FormData
    const form = new FormData();
    form.append('file', fs.createReadStream(csvFilePath));
    
    // 发送POST请求到导入API
    const response = await fetch('http://localhost:3000/api/admin/users/import', {
      method: 'POST',
      body: form,
      headers: {
        ...form.getHeaders(),
        // 这里应该添加认证头，但为了测试先跳过
      }
    });
    
    const result = await response.json();
    
    console.log('API响应状态:', response.status);
    console.log('API响应结果:', JSON.stringify(result, null, 2));
    
    if (response.ok) {
      console.log('\n导入结果统计:');
      console.log('- 成功导入:', result.success_count, '个用户');
      console.log('- 失败:', result.error_count, '个用户');
      console.log('- 重复:', result.duplicate_count, '个用户');
      
      if (result.errors && result.errors.length > 0) {
        console.log('\n错误详情:');
        result.errors.forEach(error => {
          console.log(`  第${error.row}行: ${error.error}`);
        });
      }
    } else {
      console.error('导入失败:', result.error || result.message);
    }
    
  } catch (error) {
    console.error('测试失败:', error.message);
  }
}

// 运行测试
testUserImport();