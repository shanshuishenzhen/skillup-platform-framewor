const fs = require('fs');
const path = require('path');

// 模拟convertChineseRoleToEnglish函数
const ROLE_CHINESE_TO_ENGLISH = {
  '管理员': 'admin',
  '专家': 'expert', 
  '教师': 'teacher',
  '学生': 'student',
  '考评员': 'grader',
  '内部督导员': 'internal_supervisor',
  '访客': 'guest'
};

function convertChineseRoleToEnglish(chineseRole) {
  return ROLE_CHINESE_TO_ENGLISH[chineseRole] || chineseRole;
}

// 模拟getEnglishFieldName函数
const CHINESE_TO_ENGLISH_FIELDS = {
  '用户名': 'username',
  '姓名': 'name',
  '手机号码': 'phone',
  '身份证号码': 'id_card',
  '角色': 'role',
  '密码': 'password',
  '邮箱': 'email',
  '工号': 'employee_id',
  '部门': 'department',
  '职位': 'position',
  '组织': 'organization'
};

function getEnglishFieldName(chineseField) {
  return CHINESE_TO_ENGLISH_FIELDS[chineseField] || chineseField;
}

// 模拟parseFile函数（CSV部分）
function parseFile(buffer, filename) {
  const data = [];
  
  if (filename.endsWith('.csv')) {
    const text = buffer.toString('utf-8');
    const lines = text.split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    const englishHeaders = headers.map(header => getEnglishFieldName(header) || header);
    
    console.log('原始表头:', headers);
    console.log('转换后表头:', englishHeaders);
    
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim()) {
        const values = lines[i].split(',').map(v => v.trim());
        const row = {};
        englishHeaders.forEach((header, index) => {
          let value = values[index] || '';
          value = value.toString().trim();
          
          // 特殊处理角色字段：将中文角色名转换为英文
          if (header === 'role' && value) {
            console.log(`转换角色: "${value}" -> "${convertChineseRoleToEnglish(value)}"`);
            value = convertChineseRoleToEnglish(value);
          }
          
          row[header] = value;
        });
        
        // 确保所有必需的字段都存在
        const requiredFields = ['name', 'phone', 'id_card', 'role', 'password'];
        requiredFields.forEach(field => {
          if (!(field in row)) {
            row[field] = '';
          }
        });
        
        data.push(row);
      }
    }
  }
  
  return data;
}

// 模拟验证函数
function validateUserData(data, startRow = 2) {
  const validUsers = [];
  const errors = [];
  
  data.forEach((row, index) => {
    console.log(`\n验证第${startRow + index}行数据:`);
    console.log('原始数据:', row);
    
    // 检查必填字段
    const requiredFields = ['name', 'phone', 'id_card', 'role', 'password'];
    let isValid = true;
    const missingFields = [];
    
    requiredFields.forEach(field => {
      if (!row[field] || row[field].trim() === '') {
        isValid = false;
        missingFields.push(field);
      }
    });
    
    // 检查角色是否有效
    const validRoles = ['admin', 'expert', 'teacher', 'student', 'grader', 'internal_supervisor', 'guest'];
    if (row.role && !validRoles.includes(row.role)) {
      isValid = false;
      missingFields.push('invalid_role');
    }
    
    // 检查手机号格式
    if (row.phone && !/^1[3-9]\d{9}$/.test(row.phone)) {
      isValid = false;
      missingFields.push('invalid_phone');
    }
    
    // 检查身份证格式
    if (row.id_card && !/^[1-9]\d{13}[0-9Xx]$|^[1-9]\d{16}[0-9Xx]$/.test(row.id_card)) {
      isValid = false;
      missingFields.push('invalid_id_card');
    }
    
    if (isValid) {
      console.log('✓ 验证通过');
      validUsers.push(row);
    } else {
      console.log('✗ 验证失败，缺失/无效字段:', missingFields);
      errors.push({
        row: startRow + index,
        email: row.email || row.name || '未知',
        error: `缺失/无效字段: ${missingFields.join(', ')}`
      });
    }
  });
  
  return { validUsers, errors };
}

// 模拟重复检查（简化版）
function checkDuplicateUsers(users) {
  // 模拟数据库中已存在的用户（基于之前的查询结果）
  const existingPhones = new Set([
    '13800000001', '13800000002', '13800000003', '13800000004',
    '13800000005', '13800000006', '13800000007', '13800000008',
    '13800000009', '13800000010', '13800000011', '13800000012',
    '13800000013', '13800000014', '13800000015', '13800000016'
  ]);
  
  const newUsers = [];
  const duplicates = [];
  
  users.forEach((user, index) => {
    if (user.phone && existingPhones.has(user.phone)) {
      console.log(`用户 ${user.name} (${user.phone}) 手机号重复，跳过`);
      duplicates.push({
        row: index + 2,
        email: user.email || user.name,
        action: 'skipped'
      });
    } else {
      console.log(`用户 ${user.name} (${user.phone}) 是新用户，应该导入`);
      newUsers.push(user);
    }
  });
  
  return { newUsers, duplicates };
}

// 模拟用户创建函数
function createUsers(users, batchId) {
  console.log(`\n开始创建 ${users.length} 个用户...`);
  
  const imported = [];
  const errors = [];
  
  users.forEach((user, index) => {
    try {
      console.log(`创建用户 ${index + 1}: ${user.name} (${user.role})`);
      
      // 模拟创建过程中可能的错误
      if (user.role === 'grader' && Math.random() > 0.5) {
        throw new Error('考评员角色创建失败 - 权限不足');
      }
      
      if (user.role === 'internal_supervisor' && Math.random() > 0.5) {
        throw new Error('内部督导员角色创建失败 - 系统错误');
      }
      
      console.log(`✓ 用户 ${user.name} 创建成功`);
      imported.push(user);
    } catch (error) {
      console.log(`✗ 用户 ${user.name} 创建失败: ${error.message}`);
      errors.push({
        row: index + 2,
        email: user.email || user.name,
        error: error.message
      });
    }
  });
  
  return { imported: imported.length, errors };
}

// 主测试函数
function testCompleteImport() {
  console.log('=== 完整导入流程测试 ===\n');
  
  try {
    // 1. 读取CSV文件
    const csvPath = path.join(__dirname, 'uploads', 'test-20-users.csv');
    const buffer = fs.readFileSync(csvPath);
    console.log('1. 文件读取成功');
    
    // 2. 解析文件
    const rawData = parseFile(buffer, 'test-20-users.csv');
    console.log(`\n2. 文件解析完成，共 ${rawData.length} 行数据`);
    
    // 3. 验证数据
    const { validUsers, errors: validationErrors } = validateUserData(rawData);
    console.log(`\n3. 数据验证完成:`);
    console.log(`   - 验证通过: ${validUsers.length} 个用户`);
    console.log(`   - 验证失败: ${validationErrors.length} 个用户`);
    
    if (validationErrors.length > 0) {
      console.log('\n验证错误详情:');
      validationErrors.forEach(error => {
        console.log(`   第${error.row}行 (${error.email}): ${error.error}`);
      });
    }
    
    // 4. 检查重复用户
    const { newUsers, duplicates } = checkDuplicateUsers(validUsers);
    console.log(`\n4. 重复检查完成:`);
    console.log(`   - 新用户: ${newUsers.length} 个`);
    console.log(`   - 重复用户: ${duplicates.length} 个`);
    
    // 5. 创建用户
    const { imported, errors: creationErrors } = createUsers(newUsers, 'test-batch');
    console.log(`\n5. 用户创建完成:`);
    console.log(`   - 成功创建: ${imported} 个用户`);
    console.log(`   - 创建失败: ${creationErrors.length} 个用户`);
    
    if (creationErrors.length > 0) {
      console.log('\n创建错误详情:');
      creationErrors.forEach(error => {
        console.log(`   第${error.row}行 (${error.email}): ${error.error}`);
      });
    }
    
    // 6. 总结
    console.log(`\n=== 导入总结 ===`);
    console.log(`总用户数: ${rawData.length}`);
    console.log(`验证通过: ${validUsers.length}`);
    console.log(`重复跳过: ${duplicates.length}`);
    console.log(`应该导入: ${newUsers.length}`);
    console.log(`实际导入: ${imported}`);
    console.log(`最终失败: ${validationErrors.length + creationErrors.length}`);
    
    // 7. 分析缺失的用户
    console.log(`\n=== 缺失用户分析 ===`);
    const targetUsers = ['范向军', '朱金万', '刘明鑫', '崔伟'];
    targetUsers.forEach(name => {
      const user = rawData.find(u => u.name === name);
      if (user) {
        const isValid = validUsers.find(u => u.name === name);
        const isDuplicate = duplicates.find(d => d.email === name);
        const isImported = imported > 0 && newUsers.find(u => u.name === name);
        
        console.log(`${name}:`);
        console.log(`  - 原始数据: ✓`);
        console.log(`  - 验证通过: ${isValid ? '✓' : '✗'}`);
        console.log(`  - 重复检查: ${isDuplicate ? '重复跳过' : '新用户'}`);
        console.log(`  - 最终状态: ${isImported ? '已导入' : '未导入'}`);
      } else {
        console.log(`${name}: 原始数据中未找到`);
      }
    });
    
  } catch (error) {
    console.error('测试过程中发生错误:', error.message);
  }
}

// 运行测试
testCompleteImport();