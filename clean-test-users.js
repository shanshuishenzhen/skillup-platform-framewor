/**
 * 清理测试用户脚本
 * 删除数据库中的测试用户，以便重新测试导入功能
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Supabase配置
const SUPABASE_URL = 'https://wnpkmkqtjqjqjqjqjqjq.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InducGtta3F0anFqcWpxanFqcWpxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNTU0NzE5NCwiZXhwIjoyMDUxMTIzMTk0fQ.Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/**
 * 读取CSV文件中的用户手机号
 * @param {string} filePath - CSV文件路径
 * @returns {Array<string>} 手机号数组
 */
function readTestUserPhones(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim());
    const phones = [];
    
    // 跳过标题行，从第二行开始读取
    for (let i = 1; i < lines.length; i++) {
      const columns = lines[i].split(',');
      if (columns.length >= 2) {
        const phone = columns[1].trim().replace(/"/g, ''); // 移除引号
        if (phone) {
          phones.push(phone);
        }
      }
    }
    
    return phones;
  } catch (error) {
    console.error('读取CSV文件失败:', error);
    return [];
  }
}

/**
 * 删除测试用户
 * @param {Array<string>} phones - 要删除的用户手机号数组
 */
async function deleteTestUsers(phones) {
  console.log(`准备删除 ${phones.length} 个测试用户...`);
  
  try {
    // 1. 删除用户资料
    const { data: deletedProfiles, error: profileError } = await supabase
      .from('user_profiles')
      .delete()
      .in('phone', phones);
    
    if (profileError) {
      console.error('删除用户资料失败:', profileError);
    } else {
      console.log('✅ 用户资料删除成功');
    }
    
    // 2. 删除用户记录
    const { data: deletedUsers, error: userError } = await supabase
      .from('users')
      .delete()
      .in('phone', phones);
    
    if (userError) {
      console.error('删除用户记录失败:', userError);
    } else {
      console.log('✅ 用户记录删除成功');
    }
    
    // 3. 查询剩余用户数量
    const { count: remainingCount, error: countError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .in('phone', phones);
    
    if (countError) {
      console.error('查询剩余用户失败:', countError);
    } else {
      console.log(`剩余测试用户数量: ${remainingCount}`);
    }
    
  } catch (error) {
    console.error('删除用户过程中发生错误:', error);
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('=== 清理测试用户 ===');
  
  // 读取测试用户手机号
  const csvPath = path.join(__dirname, 'uploads', 'test-20-users.csv');
  const phones = readTestUserPhones(csvPath);
  
  if (phones.length === 0) {
    console.log('未找到要删除的用户');
    return;
  }
  
  console.log('要删除的用户手机号:', phones);
  
  // 删除测试用户
  await deleteTestUsers(phones);
  
  console.log('\n=== 清理完成 ===');
}

// 运行主函数
main().catch(console.error);