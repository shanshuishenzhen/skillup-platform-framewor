require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const csv = require('csv-parser');

console.log('=== 检查CSV文件编码和字段名 ===\n');

// 读取原始文件内容
const rawContent = fs.readFileSync('uploads/test-20-users.csv', 'utf-8');
console.log('原始文件前200个字符:');
console.log(rawContent.substring(0, 200));
console.log('\n');

// 检查第一行（表头）
const lines = rawContent.split('\n');
console.log('第一行（表头）:');
console.log(JSON.stringify(lines[0]));
console.log('\n');

// 使用csv-parser解析
const results = [];
fs.createReadStream('uploads/test-20-users.csv')
  .pipe(csv())
  .on('data', (data) => {
    results.push(data);
    if (results.length <= 3) {
      console.log(`第${results.length}行解析结果:`);
      console.log('字段名:', Object.keys(data));
      console.log('数据:', data);
      console.log('角色字段值:', JSON.stringify(data['角色']));
      console.log('---');
    }
  })
  .on('end', () => {
    console.log(`\n总共解析了 ${results.length} 行数据`);
    
    // 检查所有可能的角色字段名
    const firstRow = results[0];
    if (firstRow) {
      console.log('\n第一行的所有字段名:');
      Object.keys(firstRow).forEach((key, index) => {
        console.log(`${index + 1}. "${key}" = "${firstRow[key]}"`);
      });
    }
  });