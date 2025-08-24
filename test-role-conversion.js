const { convertChineseRoleToEnglish } = require('./src/types/dictionary.ts');

// 测试角色转换
const testRoles = ['考评员', '内部督导员', '学员', '教师'];

console.log('测试角色转换:');
testRoles.forEach(role => {
  const converted = convertChineseRoleToEnglish(role);
  console.log(`${role} -> ${converted}`);
});

// 检查UserImportSchema中允许的角色
const allowedRoles = ['admin', 'expert', 'teacher', 'student', 'grader', 'internal_supervisor', 'guest'];
console.log('\nUserImportSchema允许的角色:', allowedRoles);

// 检查转换后的角色是否在允许列表中
console.log('\n转换结果验证:');
testRoles.forEach(role => {
  const converted = convertChineseRoleToEnglish(role);
  const isAllowed = allowedRoles.includes(converted);
  console.log(`${role} -> ${converted} -> ${isAllowed ? '✓ 允许' : '✗ 不允许'}`);
});