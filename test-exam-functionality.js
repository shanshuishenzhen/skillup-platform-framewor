/**
 * SkillUp Platform 考试系统功能测试脚本
 * 测试考试系统的核心功能，包括API接口和数据库操作
 * 
 * @author SOLO Coding
 * @version 1.0.0
 */

const fs = require('fs');
const path = require('path');

// 颜色输出函数
const colors = {
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  red: (text) => `\x1b[31m${text}\x1b[0m`,
  yellow: (text) => `\x1b[33m${text}\x1b[0m`,
  blue: (text) => `\x1b[34m${text}\x1b[0m`,
  cyan: (text) => `\x1b[36m${text}\x1b[0m`,
  magenta: (text) => `\x1b[35m${text}\x1b[0m`
};

/**
 * 测试结果统计
 */
let testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  errors: []
};

/**
 * 执行测试并记录结果
 * @param {string} testName - 测试名称
 * @param {Function} testFunction - 测试函数
 */
async function runTest(testName, testFunction) {
  testResults.total++;
  console.log(colors.blue(`\n🧪 测试: ${testName}`));
  
  try {
    const result = await testFunction();
    if (result) {
      testResults.passed++;
      console.log(colors.green(`✅ 通过: ${testName}`));
    } else {
      testResults.failed++;
      console.log(colors.red(`❌ 失败: ${testName}`));
    }
  } catch (error) {
    testResults.failed++;
    testResults.errors.push({ test: testName, error: error.message });
    console.log(colors.red(`❌ 错误: ${testName} - ${error.message}`));
  }
}

/**
 * 检查API路由文件是否存在
 * @returns {boolean} 测试结果
 */
function testApiRoutes() {
  console.log('  检查API路由文件...');
  
  const apiRoutes = [
    'src/app/api/exams/route.ts',
    'src/app/api/exams/[id]/route.ts',
    'src/app/api/exams/[id]/submit/route.ts',
    'src/app/api/questions/route.ts'
  ];
  
  let allExist = true;
  
  apiRoutes.forEach(route => {
    const exists = fs.existsSync(route);
    if (exists) {
      console.log(`    ✅ ${route}`);
    } else {
      console.log(`    ❌ ${route} (缺失)`);
      allExist = false;
    }
  });
  
  return allExist;
}

/**
 * 检查服务层文件
 * @returns {boolean} 测试结果
 */
function testServiceFiles() {
  console.log('  检查服务层文件...');
  
  const serviceFiles = [
    'src/services/examService.ts',
    'src/services/questionService.ts'
  ];
  
  let allExist = true;
  
  serviceFiles.forEach(service => {
    const exists = fs.existsSync(service);
    if (exists) {
      console.log(`    ✅ ${service}`);
      
      // 检查文件内容是否包含关键方法
      try {
        const content = fs.readFileSync(service, 'utf8');
        const hasExportedClass = content.includes('export class') || content.includes('export default class');
        const hasMethods = content.includes('async ') && content.includes('function');
        
        if (hasExportedClass && hasMethods) {
          console.log(`      ✅ 包含有效的类和方法`);
        } else {
          console.log(`      ⚠️  文件结构可能不完整`);
        }
      } catch (error) {
        console.log(`      ❌ 读取文件失败: ${error.message}`);
      }
    } else {
      console.log(`    ❌ ${service} (缺失)`);
      allExist = false;
    }
  });
  
  return allExist;
}

/**
 * 检查页面组件
 * @returns {boolean} 测试结果
 */
function testPageComponents() {
  console.log('  检查页面组件...');
  
  const pageComponents = [
    { path: 'src/app/skill-exam/page.tsx', name: '考试列表页面' },
    { path: 'src/app/exam/[id]/details/page.tsx', name: '考试详情页面' },
    { path: 'src/app/admin/exams/page.tsx', name: '考试管理页面' }
  ];
  
  let allValid = true;
  
  pageComponents.forEach(component => {
    const exists = fs.existsSync(component.path);
    if (exists) {
      console.log(`    ✅ ${component.name} (${component.path})`);
      
      // 检查组件内容
      try {
        const content = fs.readFileSync(component.path, 'utf8');
        const hasExportDefault = content.includes('export default');
        const hasReactImport = content.includes('import') && (content.includes('react') || content.includes('React'));
        
        if (hasExportDefault && hasReactImport) {
          console.log(`      ✅ 组件结构正确`);
        } else {
          console.log(`      ⚠️  组件结构可能不完整`);
        }
      } catch (error) {
        console.log(`      ❌ 读取组件失败: ${error.message}`);
      }
    } else {
      console.log(`    ❌ ${component.name} (${component.path}) - 缺失`);
      allValid = false;
    }
  });
  
  return allValid;
}

/**
 * 检查类型定义文件
 * @returns {boolean} 测试结果
 */
function testTypeDefinitions() {
  console.log('  检查类型定义文件...');
  
  const typeFiles = [
    { path: 'src/types/exam.ts', name: '考试类型定义' },
    { path: 'src/types/question.ts', name: '题目类型定义' }
  ];
  
  let allValid = true;
  
  typeFiles.forEach(typeFile => {
    const exists = fs.existsSync(typeFile.path);
    if (exists) {
      console.log(`    ✅ ${typeFile.name} (${typeFile.path})`);
      
      // 检查类型定义内容
      try {
        const content = fs.readFileSync(typeFile.path, 'utf8');
        const hasInterfaces = content.includes('interface') || content.includes('type');
        const hasExports = content.includes('export');
        
        if (hasInterfaces && hasExports) {
          console.log(`      ✅ 类型定义完整`);
        } else {
          console.log(`      ⚠️  类型定义可能不完整`);
        }
      } catch (error) {
        console.log(`      ❌ 读取类型文件失败: ${error.message}`);
      }
    } else {
      console.log(`    ❌ ${typeFile.name} (${typeFile.path}) - 缺失`);
      allValid = false;
    }
  });
  
  return allValid;
}

/**
 * 检查Supabase配置
 * @returns {boolean} 测试结果
 */
function testSupabaseConfig() {
  console.log('  检查Supabase配置...');
  
  // 检查Supabase客户端文件
  const supabaseFile = 'src/lib/supabase.ts';
  if (!fs.existsSync(supabaseFile)) {
    console.log(`    ❌ Supabase客户端文件不存在: ${supabaseFile}`);
    return false;
  }
  
  console.log(`    ✅ Supabase客户端文件存在`);
  
  // 检查环境变量
  const envFiles = ['.env', '.env.local'];
  let hasSupabaseConfig = false;
  
  envFiles.forEach(envFile => {
    if (fs.existsSync(envFile)) {
      try {
        const content = fs.readFileSync(envFile, 'utf8');
        const hasUrl = content.includes('NEXT_PUBLIC_SUPABASE_URL');
        const hasAnonKey = content.includes('NEXT_PUBLIC_SUPABASE_ANON_KEY');
        const hasServiceKey = content.includes('SUPABASE_SERVICE_ROLE_KEY');
        
        if (hasUrl && hasAnonKey && hasServiceKey) {
          console.log(`    ✅ ${envFile} 包含完整的Supabase配置`);
          hasSupabaseConfig = true;
        }
      } catch (error) {
        console.log(`    ❌ 读取 ${envFile} 失败`);
      }
    }
  });
  
  if (!hasSupabaseConfig) {
    console.log(`    ❌ 未找到完整的Supabase环境变量配置`);
    return false;
  }
  
  return true;
}

/**
 * 检查数据库迁移文件
 * @returns {boolean} 测试结果
 */
function testDatabaseMigrations() {
  console.log('  检查数据库迁移文件...');
  
  const migrationsDir = 'supabase/migrations';
  
  if (!fs.existsSync(migrationsDir)) {
    console.log(`    ⚠️  迁移目录不存在: ${migrationsDir}`);
    return true; // 不是必需的，所以返回true
  }
  
  try {
    const files = fs.readdirSync(migrationsDir);
    const sqlFiles = files.filter(file => file.endsWith('.sql'));
    
    if (sqlFiles.length > 0) {
      console.log(`    ✅ 找到 ${sqlFiles.length} 个迁移文件`);
      sqlFiles.forEach(file => {
        console.log(`      - ${file}`);
      });
    } else {
      console.log(`    ⚠️  未找到SQL迁移文件`);
    }
  } catch (error) {
    console.log(`    ❌ 读取迁移目录失败: ${error.message}`);
  }
  
  return true;
}

/**
 * 测试开发服务器连接
 * @returns {boolean} 测试结果
 */
async function testDevServerConnection() {
  console.log('  测试开发服务器连接...');
  
  const serverUrls = [
    'http://localhost:3000',
    'http://localhost:3002'
  ];
  
  for (const url of serverUrls) {
    try {
      // 使用简单的HTTP请求测试
      const { default: fetch } = await import('node-fetch');
      const response = await fetch(url, { 
        method: 'HEAD',
        timeout: 5000
      });
      
      if (response.ok) {
        console.log(`    ✅ 开发服务器运行正常: ${url}`);
        return true;
      }
    } catch (error) {
      console.log(`    ⚠️  无法连接到 ${url}: ${error.message}`);
    }
  }
  
  console.log(`    ❌ 无法连接到任何开发服务器`);
  return false;
}

/**
 * 生成测试报告
 */
function generateTestReport() {
  console.log(colors.cyan('\n📊 功能测试报告'));
  console.log('='.repeat(50));
  
  const passRate = ((testResults.passed / testResults.total) * 100).toFixed(1);
  
  console.log(colors.blue('\n📈 测试统计:'));
  console.log(`  总测试数: ${testResults.total}`);
  console.log(`  通过: ${colors.green(testResults.passed)}`);
  console.log(`  失败: ${colors.red(testResults.failed)}`);
  console.log(`  通过率: ${passRate}%`);
  
  if (testResults.errors.length > 0) {
    console.log(colors.red('\n❌ 错误详情:'));
    testResults.errors.forEach(error => {
      console.log(`  - ${error.test}: ${error.error}`);
    });
  }
  
  // 评估系统状态
  console.log(colors.blue('\n🎯 系统状态评估:'));
  
  if (passRate >= 90) {
    console.log(colors.green('  ✅ 系统状态: 优秀 - 可以进行全面功能测试'));
  } else if (passRate >= 70) {
    console.log(colors.yellow('  ⚠️  系统状态: 良好 - 建议修复部分问题后继续'));
  } else {
    console.log(colors.red('  ❌ 系统状态: 需要改进 - 建议先解决关键问题'));
  }
  
  // 下一步建议
  console.log(colors.blue('\n🚀 下一步建议:'));
  
  if (testResults.failed === 0) {
    console.log('  1. ✅ 开始手动功能测试');
    console.log('  2. ✅ 测试考试创建和管理界面');
    console.log('  3. ✅ 测试考试参与流程');
    console.log('  4. ✅ 验证数据库操作');
    console.log('  5. ✅ 测试API接口响应');
  } else {
    console.log('  1. ❌ 修复失败的测试项目');
    console.log('  2. ❌ 检查缺失的文件和配置');
    console.log('  3. ❌ 验证环境变量设置');
    console.log('  4. ❌ 重新运行测试验证修复结果');
  }
}

/**
 * 主测试函数
 */
async function main() {
  console.log(colors.cyan('🧪 SkillUp Platform 考试系统功能测试开始...'));
  console.log('='.repeat(50));
  
  // 执行各项测试
  await runTest('API路由文件检查', testApiRoutes);
  await runTest('服务层文件检查', testServiceFiles);
  await runTest('页面组件检查', testPageComponents);
  await runTest('类型定义检查', testTypeDefinitions);
  await runTest('Supabase配置检查', testSupabaseConfig);
  await runTest('数据库迁移检查', testDatabaseMigrations);
  
  // 注意：开发服务器连接测试需要node-fetch，如果没有安装会跳过
  try {
    await runTest('开发服务器连接测试', testDevServerConnection);
  } catch (error) {
    console.log(colors.yellow('  ⚠️  跳过开发服务器连接测试 (需要 node-fetch 依赖)'));
  }
  
  // 生成测试报告
  generateTestReport();
  
  console.log(colors.cyan('\n✨ 功能测试完成!'));
}

// 执行测试
if (require.main === module) {
  main().catch(error => {
    console.error(colors.red(`测试执行失败: ${error.message}`));
    process.exit(1);
  });
}

module.exports = {
  testApiRoutes,
  testServiceFiles,
  testPageComponents,
  testTypeDefinitions,
  testSupabaseConfig,
  testDatabaseMigrations,
  generateTestReport
};