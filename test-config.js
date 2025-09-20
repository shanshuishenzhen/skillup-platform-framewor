/**
 * 测试脚本统一配置文件
 * 从环境变量中读取配置，避免硬编码敏感信息
 */

require('dotenv').config();

module.exports = {
  // API配置
  API_BASE_URL: process.env.API_BASE_URL || 'http://localhost:8000',
  
  // JWT配置
  JWT_SECRET: process.env.JWT_SECRET_KEY || 'sk1llup_pl4tf0rm_jwt_s3cr3t_k3y_2024_v3ry_s3cur3_r4nd0m_str1ng_f0r_pr0duct10n',
  
  // Supabase配置
  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dadngnjejmxmoxakrcgj.supabase.co',
  SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhZG5nbmplam14bW94YWtyY2dqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTU0MjQzNywiZXhwIjoyMDcxMTE4NDM3fQ.rQCglJAXUBtoS-QSWRViZxIRjqxBf19MsD73Kh_Xg4o',
  
  // 测试用户配置
  ADMIN_PHONE: process.env.SUPER_ADMIN_PHONE || '13823738278',
  ADMIN_PASSWORD: process.env.SUPER_ADMIN_PASSWORD || '123456',
  
  // 文件路径配置
  UPLOAD_DIR: process.env.UPLOAD_TEMP_DIR || 'temp/uploads',
  
  // 验证配置是否完整
  validate() {
    const requiredVars = [
      'JWT_SECRET',
      'SUPABASE_URL', 
      'SUPABASE_SERVICE_KEY',
      'ADMIN_PHONE',
      'ADMIN_PASSWORD'
    ];
    
    const missing = requiredVars.filter(key => !this[key]);
    
    if (missing.length > 0) {
      console.warn('⚠️ 缺少以下配置项:', missing.join(', '));
      console.warn('请检查环境变量或.env文件');
      return false;
    }
    
    console.log('✅ 测试配置验证通过');
    return true;
  }
};