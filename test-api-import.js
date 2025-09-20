const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const fetch = require('node-fetch');

// 测试导入API
async function testImportAPI() {
  console.log('=== 测试实际导入API ===\n');
  
  try {
    // 1. 读取CSV文件
    const csvPath = path.join(__dirname, 'uploads', 'test-20-users.csv');
    const csvBuffer = fs.readFileSync(csvPath);
    console.log('1. CSV文件读取成功');
    
    // 2. 创建FormData
    const formData = new FormData();
    formData.append('file', csvBuffer, {
      filename: 'test-20-users.csv',
      contentType: 'text/csv'
    });
    
    console.log('2. FormData创建成功');
    
    // 3. 调用导入API
    console.log('3. 开始调用导入API...');
    const response = await fetch('http://localhost:3000/api/admin/users/import', {
      method: 'POST',
      body: formData,
      headers: {
        // 注意：不要手动设置Content-Type，让FormData自动设置
        ...formData.getHeaders()
      }
    });
    
    console.log(`4. API响应状态: ${response.status} ${response.statusText}`);
    
    // 4. 解析响应
    const responseText = await response.text();
    console.log('5. 原始响应内容:');
    console.log(responseText);
    
    let result;
    try {
      result = JSON.parse(responseText);
      console.log('\n6. 解析后的响应:');
      console.log(JSON.stringify(result, null, 2));
    } catch (parseError) {
      console.log('\n6. JSON解析失败:', parseError.message);
      return;
    }
    
    // 5. 分析结果
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
    
    // 6. 分析具体的缺失用户
    console.log('\n=== 目标用户分析 ===');
    const targetUsers = ['范向军', '朱金万', '刘明鑫', '崔伟'];
    
    if (result.errors) {
      targetUsers.forEach(name => {
        const error = result.errors.find(e => e.email === name);
        if (error) {
          console.log(`${name}: 导入失败 - ${error.error}`);
        } else {
          console.log(`${name}: 未在错误列表中找到`);
        }
      });
    }
    
    if (result.duplicates) {
      targetUsers.forEach(name => {
        const duplicate = result.duplicates.find(d => d.email === name);
        if (duplicate) {
          console.log(`${name}: 重复用户 - ${duplicate.action}`);
        }
      });
    }
    
  } catch (error) {
    console.error('测试过程中发生错误:', error.message);
    console.error('错误堆栈:', error.stack);
  }
}

// 运行测试
testImportAPI();