/**
 * 生成有效的管理员JWT token
 * 用于测试管理员API接口
 */

const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');

// JWT密钥（从环境变量或默认值）
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Supabase 配置
const supabaseUrl = 'https://dadngnjejmxmoxakrcgj.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhZG5nbmplam14bW94YWtyY2dqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTU0MjQzNywiZXhwIjoyMDcxMTE4NDM3fQ.rQCglJAXUBtoS-QSWRViZxIRjqxBf19MsD73Kh_Xg4o';

// 创建 Supabase 客户端
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * 获取管理员用户信息
 * @param {string} username 管理员用户名
 * @returns {Promise<Object>} 管理员用户信息
 */
async function getAdminUser(username = 'superadmin') {
  try {
    const { data, error } = await supabase
      .from('admin_users')
      .select('*')
      .eq('username', username)
      .eq('status', 'active')
      .single();
    
    if (error) {
      console.error('获取管理员用户失败:', error);
      return null;
    }
    
    return data;
  } catch (err) {
    console.error('查询管理员用户异常:', err);
    return null;
  }
}

/**
 * 生成JWT token
 * @param {Object} adminUser 管理员用户信息
 * @returns {string} JWT token
 */
function generateToken(adminUser) {
  const payload = {
    id: adminUser.id,
    username: adminUser.username,
    role: adminUser.role,
    permissions: adminUser.permissions || [],
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24小时过期
  };
  
  return jwt.sign(payload, JWT_SECRET);
}

/**
 * 验证token
 * @param {string} token JWT token
 * @returns {Object} 验证结果
 */
function verifyToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return { success: true, data: decoded };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('开始生成管理员token...');
  
  // 获取管理员用户
  const adminUser = await getAdminUser('superadmin');
  if (!adminUser) {
    console.error('未找到管理员用户');
    return;
  }
  
  console.log('找到管理员用户:', {
    id: adminUser.id,
    username: adminUser.username,
    role: adminUser.role
  });
  
  // 生成token
  const token = generateToken(adminUser);
  console.log('\n生成的JWT token:');
  console.log(token);
  
  // 验证token
  const verification = verifyToken(token);
  if (verification.success) {
    console.log('\nToken验证成功:');
    console.log(JSON.stringify(verification.data, null, 2));
  } else {
    console.error('\nToken验证失败:', verification.error);
  }
  
  // 生成测试命令
  console.log('\n测试命令:');
  console.log(`Invoke-WebRequest -Uri "http://localhost:3000/api/admin/stats" -Method GET -Headers @{"Content-Type"="application/json"; "Authorization"="Bearer ${token}"}`);
}

// 运行主函数
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  getAdminUser,
  generateToken,
  verifyToken
};