const bcrypt = require('bcrypt');

// admin_users表中的密码哈希值
const adminStoredHash = '$2b$12$cl7r0r9wzv1daGKByNr5leYuGU3l1A78d1QCqSh.mr0HPrcfsMKnO';
// users表中的密码哈希值
const userStoredHash = '$2b$12$hHqOBklFbmQi6KG.Y33nAe5iz8KF3IoBwWY.n8ZKwP8QDZwkrfu12';

// 用户输入的密码
const inputPassword = '123456';

// 验证admin_users表中的密码
console.log('=== 验证admin_users表中的密码 ===');
bcrypt.compare(inputPassword, adminStoredHash, (err, result) => {
  if (err) {
    console.error('admin_users密码验证错误:', err);
    return;
  }
  
  console.log('admin_users密码验证结果:', result);
  console.log('admin_users哈希值:', adminStoredHash);
  console.log('输入的密码:', inputPassword);
  
  if (result) {
    console.log('✅ admin_users密码匹配成功');
  } else {
    console.log('❌ admin_users密码不匹配');
  }
});

// 验证users表中的密码
console.log('\n=== 验证users表中的密码 ===');
bcrypt.compare(inputPassword, userStoredHash, (err, result) => {
  if (err) {
    console.error('users密码验证错误:', err);
    return;
  }
  
  console.log('users密码验证结果:', result);
  console.log('users哈希值:', userStoredHash);
  console.log('输入的密码:', inputPassword);
  
  if (result) {
    console.log('✅ users密码匹配成功');
  } else {
    console.log('❌ users密码不匹配');
  }
});

// 生成新的哈希值进行对比
bcrypt.hash(inputPassword, 12, (err, newHash) => {
  if (err) {
    console.error('生成哈希错误:', err);
    return;
  }
  
  console.log('\n=== 新生成的哈希值对比 ===');
  console.log('新生成的哈希值:', newHash);
  console.log('admin_users哈希值:', adminStoredHash);
  console.log('users哈希值:     ', userStoredHash);
});