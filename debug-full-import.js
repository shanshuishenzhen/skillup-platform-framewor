require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { createClient } = require('@supabase/supabase-js');
// 导入必要的模块
const { z } = require('zod');

// 角色映射表（与dictionary.ts保持一致）
const ROLE_CHINESE_TO_ENGLISH = {
  '学员': 'student',
  '考生': 'student',
  '教师': 'teacher',
  '管理员': 'admin',
  '专家': 'expert',
  '评分员': 'grader',
  '考评员': 'grader',
  '内部监督员': 'internal_supervisor',
  '内部督导员': 'internal_supervisor',
  '访客': 'guest'
};

// 角色转换函数
function convertChineseRoleToEnglish(chineseRole) {
  return ROLE_CHINESE_TO_ENGLISH[chineseRole] || chineseRole;
}

// 用户导入Schema
const UserImportSchema = z.object({
  name: z.string().min(1, '姓名不能为空'),
  phone: z.string().min(1, '手机号不能为空').regex(/^1[3-9]\d{9}$/, '手机号格式不正确'),
  id_card: z.string().min(1, '身份证号不能为空').regex(/^[1-9]\d{5}(18|19|20)\d{2}((0[1-9])|(1[0-2]))(([0-2][1-9])|10|20|30|31)\d{3}[0-9Xx]$/, '身份证号格式不正确'),
  role: z.enum(['admin', 'expert', 'teacher', 'student', 'grader', 'internal_supervisor', 'guest']),
  password: z.string().min(1, '密码不能为空').min(6, '密码至少6位字符'),
  email: z.string().email('邮箱格式不正确').optional().or(z.literal('')),
  employee_id: z.string().optional(),
  department: z.string().optional(),
  position: z.string().optional(),
  organization: z.string().optional()
});

async function debugFullImport() {
  console.log('=== 完整导入流程调试 ===\n');
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  
  // 步骤1: 读取CSV文件
  console.log('步骤1: 读取CSV文件');
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
  console.log('前3行数据:', rawData.slice(0, 3));
  console.log('');
  
  // 步骤2: 数据转换和验证
  console.log('步骤2: 数据转换和验证');
  const validUsers = [];
  const errors = [];
  
  rawData.forEach((row, index) => {
    console.log(`\n--- 处理第${index + 1}行: ${row['姓名'] || row['用户名'] || '未知'} ---`);
    console.log('原始数据:', row);
    
    try {
      // 转换角色 - 使用中文字段名
      const convertedRole = convertChineseRoleToEnglish(row['角色']);
      console.log(`角色转换: ${row['角色']} -> ${convertedRole}`);
      
      // 构建用户数据 - 使用中文字段名
      const userData = {
        name: row['姓名'] || row['用户名'],
        phone: row['手机号码'],
        id_card: row['身份证号码'],
        role: convertedRole,
        password: row['密码'] || '123456',
        email: row['邮箱'] || '',
        employee_id: row['工号'] || '',
        department: row['部门'] || '',
        position: row['职位'] || '',
        organization: row['组织'] || ''
      };
      
      console.log('转换后数据:', userData);
      
      // 验证数据
      const validatedUser = UserImportSchema.parse(userData);
      validUsers.push(validatedUser);
      console.log('✅ 验证通过');
      
    } catch (error) {
      console.log('❌ 验证失败');
      if (error instanceof z.ZodError) {
        const errorMessages = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
        console.log('错误详情:', errorMessages);
        errors.push({
          row: index + 1,
          name: row.name || '未知',
          error: errorMessages
        });
      } else {
        console.log('未知错误:', error.message);
        errors.push({
          row: index + 1,
          name: row.name || '未知',
          error: error.message
        });
      }
    }
  });
  
  console.log(`\n验证结果: ${validUsers.length} 个用户通过验证, ${errors.length} 个用户验证失败`);
  if (errors.length > 0) {
    console.log('验证失败的用户:');
    errors.forEach(err => {
      console.log(`  - 第${err.row}行 ${err.name}: ${err.error}`);
    });
  }
  console.log('');
  
  // 步骤3: 检查重复用户
  console.log('步骤3: 检查重复用户');
  const emails = validUsers.map(user => user.email).filter(Boolean);
  const phones = validUsers.map(user => user.phone).filter(Boolean);
  const idCards = validUsers.map(user => user.id_card).filter(Boolean);
  const employeeIds = validUsers.map(user => user.employee_id).filter(Boolean);
  
  console.log(`检查范围: ${emails.length}个邮箱, ${phones.length}个手机号, ${idCards.length}个身份证, ${employeeIds.length}个工号`);
  
  // 构建查询条件
  const conditions = [];
  if (emails.length > 0) conditions.push(`email.in.(${emails.join(',')})`); 
  if (phones.length > 0) conditions.push(`phone.in.(${phones.join(',')})`); 
  if (idCards.length > 0) conditions.push(`id_card.in.(${idCards.join(',')})`); 
  if (employeeIds.length > 0) conditions.push(`employee_id.in.(${employeeIds.join(',')})`);
  
  let existingUsers = [];
  
  if (conditions.length > 0) {
    console.log('查询条件:', conditions.join(' OR '));
    const { data, error } = await supabase
      .from('users')
      .select('name, email, phone, id_card, employee_id')
      .or(conditions.join(','));
    
    if (error) {
      console.log('查询错误:', error.message);
    } else {
      existingUsers = data || [];
      console.log(`找到 ${existingUsers.length} 个已存在的用户:`);
      existingUsers.forEach(user => {
        console.log(`  - ${user.name}: 手机${user.phone}, 身份证${user.id_card}`);
      });
    }
  } else {
    console.log('无需检查重复（没有有效的查询条件）');
  }
  
  const existingEmails = new Set(existingUsers.filter(u => u.email).map(u => u.email));
  const existingPhones = new Set(existingUsers.filter(u => u.phone).map(u => u.phone));
  const existingIdCards = new Set(existingUsers.filter(u => u.id_card).map(u => u.id_card));
  const existingEmployeeIds = new Set(existingUsers.filter(u => u.employee_id).map(u => u.employee_id));
  
  const newUsers = [];
  const duplicates = [];
  
  validUsers.forEach((user, index) => {
    let isDuplicate = false;
    let duplicateField = '';
    
    if (user.email && existingEmails.has(user.email)) {
      isDuplicate = true;
      duplicateField = 'email';
    } else if (user.phone && existingPhones.has(user.phone)) {
      isDuplicate = true;
      duplicateField = 'phone';
    } else if (user.id_card && existingIdCards.has(user.id_card)) {
      isDuplicate = true;
      duplicateField = 'id_card';
    } else if (user.employee_id && existingEmployeeIds.has(user.employee_id)) {
      isDuplicate = true;
      duplicateField = 'employee_id';
    }
    
    if (isDuplicate) {
      console.log(`❌ 用户 ${user.name} 重复 (${duplicateField})`);
      duplicates.push({
        row: index + 2,
        name: user.name,
        duplicateField: duplicateField
      });
    } else {
      console.log(`✅ 用户 ${user.name} 无重复`);
      newUsers.push(user);
    }
  });
  
  console.log(`\n重复检查结果: ${newUsers.length} 个新用户, ${duplicates.length} 个重复用户`);
  if (duplicates.length > 0) {
    console.log('重复的用户:');
    duplicates.forEach(dup => {
      console.log(`  - ${dup.name}: ${dup.duplicateField}重复`);
    });
  }
  console.log('');
  
  // 步骤4: 分析最终结果
  console.log('步骤4: 最终分析');
  console.log(`原始数据: ${rawData.length} 个用户`);
  console.log(`验证通过: ${validUsers.length} 个用户`);
  console.log(`验证失败: ${errors.length} 个用户`);
  console.log(`重复跳过: ${duplicates.length} 个用户`);
  console.log(`应该导入: ${newUsers.length} 个用户`);
  
  console.log('\n应该导入的用户列表:');
  newUsers.forEach((user, index) => {
    console.log(`  ${index + 1}. ${user.name} (${user.role})`);
  });
  
  // 检查特定的4个缺失用户
  const missingUsers = ['范向军', '朱金万', '刘明鑫', '崔伟'];
  console.log('\n检查特定缺失用户:');
  missingUsers.forEach(name => {
    const inValid = validUsers.find(u => u.name === name);
    const inNew = newUsers.find(u => u.name === name);
    const inDuplicate = duplicates.find(d => d.name === name);
    const inError = errors.find(e => e.name === name);
    
    console.log(`${name}:`);
    console.log(`  - 验证通过: ${inValid ? '是' : '否'}`);
    console.log(`  - 应该导入: ${inNew ? '是' : '否'}`);
    console.log(`  - 重复跳过: ${inDuplicate ? '是 (' + inDuplicate.duplicateField + ')' : '否'}`);
    console.log(`  - 验证失败: ${inError ? '是 (' + inError.error + ')' : '否'}`);
  });
}

debugFullImport().catch(console.error);