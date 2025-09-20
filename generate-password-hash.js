/**
 * 生成bcrypt密码hash的脚本
 */

const bcrypt = require('bcryptjs');

async function generatePasswordHash() {
  const password = 'admin123';
  const saltRounds = 10;
  
  try {
    const hash = await bcrypt.hash(password, saltRounds);
    console.log('密码:', password);
    console.log('生成的hash:', hash);
    
    // 验证hash是否正确
    const isValid = await bcrypt.compare(password, hash);
    console.log('验证结果:', isValid ? '✅ 正确' : '❌ 错误');
    
    // 测试与现有hash的比较
    const existingHash = '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi';
    const isExistingValid = await bcrypt.compare(password, existingHash);
    console.log('现有hash验证:', isExistingValid ? '✅ 正确' : '❌ 错误');
    
  } catch (error) {
    console.error('生成hash时发生错误:', error);
  }
}

generatePasswordHash();