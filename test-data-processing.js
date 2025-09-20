const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

// 模拟API中的数据处理逻辑
function processData(rawData) {
  return rawData.map((row) => {
    // 处理可能的字段名变体
    const normalizedRow = {};
    
    console.log('原始行数据:', row);
    console.log('字段名:', Object.keys(row));
    
    Object.keys(row).forEach(key => {
      const normalizedKey = key.toLowerCase().replace(/[\s-_]/g, '');
      console.log(`处理字段: ${key} -> ${normalizedKey}`);
      
      switch (normalizedKey) {
        case 'name':
        case 'username':
        case 'fullname':
        case '姓名':
        case '用户名':
          normalizedRow.name = row[key];
          console.log(`  设置name: ${row[key]}`);
          break;
        case 'email':
        case 'emailaddress':
        case '邮箱':
          normalizedRow.email = row[key];
          console.log(`  设置email: ${row[key]}`);
          break;
        case 'phone':
        case 'phonenumber':
        case 'mobile':
        case '手机号码':
        case '手机号':
          normalizedRow.phone = row[key];
          console.log(`  设置phone: ${row[key]}`);
          break;
        case 'employeeid':
        case 'empid':
        case 'staffid':
        case '工号':
          normalizedRow.employee_id = row[key];
          console.log(`  设置employee_id: ${row[key]}`);
          break;
        case 'department':
        case 'dept':
        case '部门':
          normalizedRow.department = row[key];
          console.log(`  设置department: ${row[key]}`);
          break;
        case 'position':
        case 'title':
        case 'jobtitle':
        case '职位':
          normalizedRow.position = row[key];
          console.log(`  设置position: ${row[key]}`);
          break;
        case 'organization':
        case 'org':
        case 'company':
        case '组织':
          normalizedRow.organization = row[key];
          console.log(`  设置organization: ${row[key]}`);
          break;
        case 'role':
        case 'usertype':
        case '角色':
          normalizedRow.role = row[key];
          console.log(`  设置role: ${row[key]}`);
          break;
        case 'password':
        case 'pwd':
        case '密码':
          normalizedRow.password = row[key];
          console.log(`  设置password: ${row[key]}`);
          break;
        case 'idcard':
        case '身份证号码':
        case '身份证':
          normalizedRow.id_card = row[key];
          console.log(`  设置id_card: ${row[key]}`);
          break;
        case 'status':
        case 'state':
        case '状态':
          normalizedRow.status = row[key];
          console.log(`  设置status: ${row[key]}`);
          break;
        default:
          normalizedRow[key] = row[key];
          console.log(`  保持原字段: ${key} = ${row[key]}`);
      }
    });
    
    console.log('处理后数据:', normalizedRow);
    console.log('---');
    
    return normalizedRow;
  });
}

async function testDataProcessing() {
  console.log('测试数据处理逻辑');
  
  // 读取CSV文件
  const csvPath = path.join(__dirname, 'uploads', 'test-20-users.csv');
  const rawData = [];
  
  await new Promise((resolve, reject) => {
    fs.createReadStream(csvPath)
      .pipe(csv())
      .on('data', (row) => {
        rawData.push(row);
      })
      .on('end', resolve)
      .on('error', reject);
  });
  
  console.log(`读取到 ${rawData.length} 行数据`);
  
  // 只处理前3行数据进行测试
  const testData = rawData.slice(0, 3);
  console.log('\n开始处理数据...');
  
  const processedData = processData(testData);
  
  console.log('\n最终处理结果:');
  processedData.forEach((row, index) => {
    console.log(`第${index + 1}行:`, row);
  });
}

testDataProcessing().catch(console.error);