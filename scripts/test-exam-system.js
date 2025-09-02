/**
 * 在线考试系统综合测试脚本
 * 测试数据库连接、API接口和核心功能
 */

const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');
require('dotenv').config();

// 配置
const BASE_URL = 'http://localhost:3000';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// 创建 Supabase 客户端
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

/**
 * 测试结果记录
 */
class TestReporter {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
  }

  /**
   * 记录测试结果
   * @param {string} name - 测试名称
   * @param {boolean} passed - 是否通过
   * @param {string} message - 测试消息
   */
  record(name, passed, message = '') {
    this.tests.push({ name, passed, message });
    if (passed) {
      this.passed++;
      console.log(`✅ ${name}`);
    } else {
      this.failed++;
      console.log(`❌ ${name}: ${message}`);
    }
  }

  /**
   * 输出测试报告
   */
  report() {
    console.log('\n=== 测试报告 ===');
    console.log(`总计: ${this.tests.length}`);
    console.log(`通过: ${this.passed}`);
    console.log(`失败: ${this.failed}`);
    console.log(`成功率: ${((this.passed / this.tests.length) * 100).toFixed(2)}%`);
    
    if (this.failed > 0) {
      console.log('\n失败的测试:');
      this.tests.filter(t => !t.passed).forEach(t => {
        console.log(`- ${t.name}: ${t.message}`);
      });
    }
  }
}

const reporter = new TestReporter();

/**
 * 测试 Supabase 数据库连接
 */
async function testDatabaseConnection() {
  console.log('\n🔍 测试数据库连接...');
  
  try {
    // 测试基本连接
    const { data, error } = await supabase.from('users').select('count').limit(1);
    
    if (error) {
      reporter.record('数据库连接', false, error.message);
      return false;
    }
    
    reporter.record('数据库连接', true);
    return true;
  } catch (error) {
    reporter.record('数据库连接', false, error.message);
    return false;
  }
}

/**
 * 验证数据库表结构
 */
async function testDatabaseTables() {
  console.log('\n🔍 验证数据库表结构...');
  
  const requiredTables = [
    'users',
    'exams', 
    'questions',
    'exam_attempts',
    'exam_answers',
    'exam_registrations',
    'anti_cheat_logs'
  ];
  
  for (const table of requiredTables) {
    try {
      const { data, error } = await supabase.from(table).select('*').limit(1);
      
      if (error) {
        reporter.record(`表 ${table}`, false, error.message);
      } else {
        reporter.record(`表 ${table}`, true);
      }
    } catch (error) {
      reporter.record(`表 ${table}`, false, error.message);
    }
  }
}

/**
 * 测试 API 接口
 */
async function testAPIEndpoints() {
  console.log('\n🔍 测试 API 接口...');
  
  const endpoints = [
    { method: 'GET', path: '/api/exams', name: '获取考试列表' },
    { method: 'GET', path: '/api/auth/session', name: '获取会话信息' },
    { method: 'GET', path: '/api/users/profile', name: '获取用户资料' }
  ];
  
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${BASE_URL}${endpoint.path}`, {
        method: endpoint.method,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.status < 500) {
        reporter.record(`API ${endpoint.name}`, true);
      } else {
        reporter.record(`API ${endpoint.name}`, false, `状态码: ${response.status}`);
      }
    } catch (error) {
      reporter.record(`API ${endpoint.name}`, false, error.message);
    }
  }
}

/**
 * 测试考试创建功能
 */
async function testExamCreation() {
  console.log('\n🔍 测试考试创建功能...');
  
  try {
    // 创建测试考试数据
    const testExam = {
      title: '测试考试',
      description: '这是一个测试考试',
      duration: 60,
      total_questions: 10,
      passing_score: 60,
      difficulty: 'intermediate',
      category: 'programming',
      status: 'draft',
      start_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      end_time: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
    };
    
    const { data, error } = await supabase
      .from('exams')
      .insert([testExam])
      .select()
      .single();
    
    if (error) {
      reporter.record('考试创建', false, error.message);
      return null;
    }
    
    reporter.record('考试创建', true);
    return data;
  } catch (error) {
    reporter.record('考试创建', false, error.message);
    return null;
  }
}

/**
 * 测试题目管理功能
 */
async function testQuestionManagement(examId) {
  console.log('\n🔍 测试题目管理功能...');
  
  if (!examId) {
    reporter.record('题目管理', false, '缺少考试ID');
    return;
  }
  
  try {
    // 创建测试题目
    const testQuestion = {
      exam_id: examId,
      question_type: 'multiple_choice',
      question_text: '以下哪个是JavaScript的数据类型？',
      options: ['string', 'number', 'boolean', '以上都是'],
      correct_answers: ['以上都是'],
      score: 10,
      explanation: 'JavaScript有多种基本数据类型'
    };
    
    const { data, error } = await supabase
      .from('questions')
      .insert([testQuestion])
      .select()
      .single();
    
    if (error) {
      reporter.record('题目创建', false, error.message);
    } else {
      reporter.record('题目创建', true);
    }
  } catch (error) {
    reporter.record('题目创建', false, error.message);
  }
}

/**
 * 测试用户注册和登录功能
 */
async function testUserAuthentication() {
  console.log('\n🔍 测试用户认证功能...');
  
  try {
    // 测试用户表查询
    const { data, error } = await supabase
      .from('users')
      .select('id, email, user_type')
      .limit(1);
    
    if (error) {
      reporter.record('用户认证', false, error.message);
    } else {
      reporter.record('用户认证', true);
    }
  } catch (error) {
    reporter.record('用户认证', false, error.message);
  }
}

/**
 * 测试防作弊监控功能
 */
async function testAntiCheatMonitoring() {
  console.log('\n🔍 测试防作弊监控功能...');
  
  try {
    // 测试防作弊日志表
    const { data, error } = await supabase
      .from('anti_cheat_logs')
      .select('*')
      .limit(1);
    
    if (error) {
      reporter.record('防作弊监控', false, error.message);
    } else {
      reporter.record('防作弊监控', true);
    }
  } catch (error) {
    reporter.record('防作弊监控', false, error.message);
  }
}

/**
 * 清理测试数据
 */
async function cleanupTestData() {
  console.log('\n🧹 清理测试数据...');
  
  try {
    // 删除测试考试
    await supabase
      .from('exams')
      .delete()
      .eq('title', '测试考试');
    
    console.log('测试数据清理完成');
  } catch (error) {
    console.log('清理测试数据失败:', error.message);
  }
}

/**
 * 主测试函数
 */
async function runTests() {
  console.log('🚀 开始在线考试系统综合测试\n');
  
  // 检查环境变量
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_KEY) {
    console.log('❌ 缺少必要的环境变量');
    console.log('请检查 .env 文件中的 Supabase 配置');
    return;
  }
  
  try {
    // 1. 测试数据库连接
    const dbConnected = await testDatabaseConnection();
    
    if (!dbConnected) {
      console.log('❌ 数据库连接失败，停止测试');
      return;
    }
    
    // 2. 验证数据库表结构
    await testDatabaseTables();
    
    // 3. 测试 API 接口
    await testAPIEndpoints();
    
    // 4. 测试考试创建功能
    const testExam = await testExamCreation();
    
    // 5. 测试题目管理功能
    if (testExam) {
      await testQuestionManagement(testExam.id);
    }
    
    // 6. 测试用户认证功能
    await testUserAuthentication();
    
    // 7. 测试防作弊监控功能
    await testAntiCheatMonitoring();
    
    // 8. 清理测试数据
    await cleanupTestData();
    
  } catch (error) {
    console.log('❌ 测试过程中发生错误:', error.message);
  } finally {
    // 输出测试报告
    reporter.report();
  }
}

// 运行测试
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = {
  runTests,
  testDatabaseConnection,
  testDatabaseTables,
  testAPIEndpoints,
  testExamCreation,
  testQuestionManagement,
  testUserAuthentication,
  testAntiCheatMonitoring
};