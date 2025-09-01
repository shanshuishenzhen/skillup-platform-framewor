/**
 * Vercel部署前检查脚本
 * 验证所有必要的配置和环境变量是否正确设置
 */

const fs = require('fs');
const path = require('path');

// 检查必要的文件是否存在
function checkRequiredFiles() {
  console.log('🔍 检查必要文件...');
  
  const requiredFiles = [
    'package.json',
    'next.config.js',
    'vercel.json',
    '.env.production',
    'tailwind.config.js'
  ];
  
  const missingFiles = [];
  
  requiredFiles.forEach(file => {
    if (!fs.existsSync(path.join(process.cwd(), file))) {
      missingFiles.push(file);
    }
  });
  
  if (missingFiles.length > 0) {
    console.error('❌ 缺少必要文件:', missingFiles.join(', '));
    return false;
  }
  
  console.log('✅ 所有必要文件都存在');
  return true;
}

// 检查package.json配置
function checkPackageJson() {
  console.log('🔍 检查package.json配置...');
  
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    
    // 检查必要的脚本
    const requiredScripts = ['build', 'start', 'dev'];
    const missingScripts = requiredScripts.filter(script => !packageJson.scripts[script]);
    
    if (missingScripts.length > 0) {
      console.error('❌ 缺少必要的npm脚本:', missingScripts.join(', '));
      return false;
    }
    
    // 检查Next.js依赖
    if (!packageJson.dependencies.next) {
      console.error('❌ 缺少Next.js依赖');
      return false;
    }
    
    console.log('✅ package.json配置正确');
    return true;
  } catch (error) {
    console.error('❌ 读取package.json失败:', error.message);
    return false;
  }
}

// 检查vercel.json配置
function checkVercelJson() {
  console.log('🔍 检查vercel.json配置...');
  
  try {
    const vercelJson = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
    
    // 检查基本配置
    if (vercelJson.framework !== 'nextjs') {
      console.warn('⚠️ 建议设置framework为nextjs');
    }
    
    // 检查环境变量配置
    if (!vercelJson.env || Object.keys(vercelJson.env).length === 0) {
      console.warn('⚠️ 未配置环境变量');
    }
    
    console.log('✅ vercel.json配置正确');
    return true;
  } catch (error) {
    console.error('❌ 读取vercel.json失败:', error.message);
    return false;
  }
}

// 检查环境变量配置
function checkEnvironmentVariables() {
  console.log('🔍 检查环境变量配置...');
  
  try {
    const envContent = fs.readFileSync('.env.production', 'utf8');
    
    // 检查关键环境变量
    const requiredEnvVars = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY',
      'JWT_SECRET',
      'API_SECRET_KEY'
    ];
    
    const missingVars = [];
    
    requiredEnvVars.forEach(varName => {
      if (!envContent.includes(varName)) {
        missingVars.push(varName);
      }
    });
    
    if (missingVars.length > 0) {
      console.error('❌ 缺少必要的环境变量:', missingVars.join(', '));
      return false;
    }
    
    console.log('✅ 环境变量配置正确');
    return true;
  } catch (error) {
    console.error('❌ 读取.env.production失败:', error.message);
    return false;
  }
}

// 检查Next.js配置
function checkNextConfig() {
  console.log('🔍 检查Next.js配置...');
  
  try {
    // 简单检查文件是否存在且可读
    const nextConfigContent = fs.readFileSync('next.config.js', 'utf8');
    
    if (nextConfigContent.length === 0) {
      console.error('❌ next.config.js文件为空');
      return false;
    }
    
    console.log('✅ Next.js配置文件存在');
    return true;
  } catch (error) {
    console.error('❌ 读取next.config.js失败:', error.message);
    return false;
  }
}

// 主检查函数
function runDeploymentCheck() {
  console.log('🚀 开始Vercel部署前检查...');
  console.log('=' .repeat(50));
  
  const checks = [
    checkRequiredFiles,
    checkPackageJson,
    checkVercelJson,
    checkEnvironmentVariables,
    checkNextConfig
  ];
  
  let allPassed = true;
  
  checks.forEach(check => {
    if (!check()) {
      allPassed = false;
    }
    console.log('');
  });
  
  console.log('=' .repeat(50));
  
  if (allPassed) {
    console.log('🎉 所有检查通过！项目已准备好部署到Vercel');
    console.log('');
    console.log('📋 下一步操作:');
    console.log('1. 在Vercel控制台中设置环境变量');
    console.log('2. 运行: npm run deploy:vercel');
    console.log('3. 或者直接推送到GitHub让Vercel自动部署');
    process.exit(0);
  } else {
    console.log('❌ 部署检查失败！请修复上述问题后重试');
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  runDeploymentCheck();
}

module.exports = {
  runDeploymentCheck,
  checkRequiredFiles,
  checkPackageJson,
  checkVercelJson,
  checkEnvironmentVariables,
  checkNextConfig
};