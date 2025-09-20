require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// 模拟角色转换函数
const ROLE_CHINESE_TO_ENGLISH = {
  '管理员': 'admin',
  '专家': 'expert', 
  '教师': 'teacher',
  '学员': 'student',
  '考评员': 'grader',
  '内部监督员': 'internal_supervisor',
  '内部督导员': 'internal_supervisor',
  '访客': 'guest'
};

function convertChineseRoleToEnglish(chineseRole) {
  return ROLE_CHINESE_TO_ENGLISH[chineseRole] || chineseRole;
}

// 模拟UserImportSchema验证
function validateRole(role) {
  const allowedRoles = ['admin', 'expert', 'teacher', 'student', 'grader', 'internal_supervisor', 'guest'];
  return allowedRoles.includes(role);
}

// 读取原始数据
const csvContent = fs.readFileSync('uploads/test-20-users.csv', 'utf-8');
const lines = csvContent.split('\n').filter(line => line.trim());
const headers = lines[0].split(',');

console.log('=== 调试用户导入过程 ===\n');
console.log('表头:', headers);
console.log('总行数:', lines.length - 1, '个用户\n');

// 处理每个用户
const failedUsers = [];
const successUsers = [];

for (let i = 1; i < lines.length; i++) {
  const values = lines[i].split(',');
  const user = {
    name: values[1],
    role_chinese: values[3],
    role_english: convertChineseRoleToEnglish(values[3]),
    phone: values[5]
  };
  
  console.log(`--- 用户 ${i}: ${user.name} ---`);
  console.log('原始角色:', user.role_chinese);
  console.log('转换后角色:', user.role_english);
  console.log('角色验证:', validateRole(user.role_english) ? '✓ 通过' : '✗ 失败');
  
  if (validateRole(user.role_english)) {
    successUsers.push(user);
  } else {
    failedUsers.push(user);
  }
  console.log('');
}

console.log('=== 总结 ===');
console.log('成功用户数:', successUsers.length);
console.log('失败用户数:', failedUsers.length);

if (failedUsers.length > 0) {
  console.log('\n失败用户详情:');
  failedUsers.forEach(user => {
    console.log(`- ${user.name}: ${user.role_chinese} -> ${user.role_english}`);
  });
}

// 检查数据库中的实际情况
async function checkDatabase() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  
  const { data, error } = await supabase
    .from('users')
    .select('name, role, import_source')
    .eq('import_source', 'excel_import');
  
  if (error) {
    console.log('\n数据库查询错误:', error.message);
    return;
  }
  
  console.log('\n=== 数据库中的导入用户 ===');
  console.log('实际导入用户数:', data.length);
  data.forEach(user => {
    console.log(`- ${user.name}: ${user.role}`);
  });
}

checkDatabase().catch(console.error);