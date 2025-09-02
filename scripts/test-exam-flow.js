/**
 * 在线考试系统端到端流程测试
 * 测试完整的考试参与流程：注册 → 报名 → 参加考试 → 提交答案 → 查看结果
 */

const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');
require('dotenv').config();

// 配置
const BASE_URL = 'http://localhost:3000';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// 创建 Supabase 客户端
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

/**
 * 测试结果记录器
 */
class FlowTestReporter {
  constructor() {
    this.steps = [];
    this.passed = 0;
    this.failed = 0;
    this.startTime = Date.now();
  }

  /**
   * 记录测试步骤结果
   * @param {string} step - 步骤名称
   * @param {boolean} passed - 是否通过
   * @param {string} message - 详细信息
   * @param {any} data - 相关数据
   */
  record(step, passed, message = '', data = null) {
    const timestamp = Date.now() - this.startTime;
    this.steps.push({ step, passed, message, data, timestamp });
    
    if (passed) {
      this.passed++;
      console.log(`✅ [${(timestamp/1000).toFixed(1)}s] ${step}`);
      if (message) console.log(`   ${message}`);
    } else {
      this.failed++;
      console.log(`❌ [${(timestamp/1000).toFixed(1)}s] ${step}: ${message}`);
    }
  }

  /**
   * 输出详细测试报告
   */
  report() {
    const totalTime = (Date.now() - this.startTime) / 1000;
    
    console.log('\n=== 端到端流程测试报告 ===');
    console.log(`总耗时: ${totalTime.toFixed(2)}秒`);
    console.log(`总步骤: ${this.steps.length}`);
    console.log(`成功: ${this.passed}`);
    console.log(`失败: ${this.failed}`);
    console.log(`成功率: ${((this.passed / this.steps.length) * 100).toFixed(2)}%`);
    
    if (this.failed > 0) {
      console.log('\n失败的步骤:');
      this.steps.filter(s => !s.passed).forEach(s => {
        console.log(`- [${(s.timestamp/1000).toFixed(1)}s] ${s.step}: ${s.message}`);
      });
    }
    
    console.log('\n详细步骤时间线:');
    this.steps.forEach(s => {
      const status = s.passed ? '✅' : '❌';
      console.log(`${status} [${(s.timestamp/1000).toFixed(1)}s] ${s.step}`);
    });
  }
}

const reporter = new FlowTestReporter();

/**
 * 创建测试用户
 */
async function createTestUser() {
  try {
    const testUser = {
      email: `test_${Date.now()}@example.com`,
      password_hash: 'test_password_hash',
      user_type: 'registered',
      role: 'student',
      name: '测试学生',
      phone: `138${Date.now().toString().slice(-8)}`,
      status: 'active'
    };
    
    const { data, error } = await supabase
      .from('users')
      .insert([testUser])
      .select()
      .single();
    
    if (error) {
      reporter.record('创建测试用户', false, error.message);
      return null;
    }
    
    reporter.record('创建测试用户', true, `用户ID: ${data.id}`);
    return data;
  } catch (error) {
    reporter.record('创建测试用户', false, error.message);
    return null;
  }
}

/**
 * 创建测试考试
 */
async function createTestExam(creatorId) {
  try {
    const testExam = {
      title: `端到端测试考试_${Date.now()}`,
      description: '这是一个端到端流程测试考试',
      category: 'programming',
      difficulty: 'beginner',
      status: 'published',
      duration: 30,
      total_questions: 3,
      total_score: 30,
      passing_score: 18,
      max_attempts: 2,
      shuffle_questions: false,
      shuffle_options: false,
      show_results_immediately: true,
      allow_review: true,
      require_approval: false,
      start_time: new Date(Date.now() - 60000).toISOString(), // 1分钟前开始
      end_time: new Date(Date.now() + 3600000).toISOString(), // 1小时后结束
      created_by: creatorId
    };
    
    const { data, error } = await supabase
      .from('exams')
      .insert([testExam])
      .select()
      .single();
    
    if (error) {
      reporter.record('创建测试考试', false, error.message);
      return null;
    }
    
    reporter.record('创建测试考试', true, `考试ID: ${data.id}`);
    return data;
  } catch (error) {
    reporter.record('创建测试考试', false, error.message);
    return null;
  }
}

/**
 * 为考试添加题目
 */
async function addQuestionsToExam(examId) {
  try {
    const questions = [
      {
        exam_id: examId,
        question_type: 'multiple_choice',
        question_text: 'JavaScript中哪个关键字用于声明变量？',
        options: ['var', 'let', 'const', '以上都是'],
        correct_answers: ['以上都是'],
        explanation: 'JavaScript中var、let、const都可以用于声明变量',
        score: 10,
        order_index: 1
      },
      {
        exam_id: examId,
        question_type: 'true_false',
        question_text: 'JavaScript是一种强类型语言。',
        options: ['true', 'false'],
        correct_answers: ['false'],
        explanation: 'JavaScript是一种弱类型（动态类型）语言',
        score: 10,
        order_index: 2
      },
      {
        exam_id: examId,
        question_type: 'single_choice',
        question_text: '以下哪个不是JavaScript的基本数据类型？',
        options: ['string', 'number', 'array', 'boolean'],
        correct_answers: ['array'],
        explanation: 'array是对象类型，不是基本数据类型',
        score: 10,
        order_index: 3
      }
    ];
    
    const { data, error } = await supabase
      .from('questions')
      .insert(questions)
      .select();
    
    if (error) {
      reporter.record('添加考试题目', false, error.message);
      return null;
    }
    
    reporter.record('添加考试题目', true, `添加了${data.length}道题目`);
    return data;
  } catch (error) {
    reporter.record('添加考试题目', false, error.message);
    return null;
  }
}

/**
 * 用户报名考试
 */
async function registerForExam(examId, userId) {
  try {
    const registration = {
      exam_id: examId,
      user_id: userId,
      status: 'approved' // 直接批准，简化流程
    };
    
    const { data, error } = await supabase
      .from('exam_registrations')
      .insert([registration])
      .select()
      .single();
    
    if (error) {
      reporter.record('用户报名考试', false, error.message);
      return null;
    }
    
    reporter.record('用户报名考试', true, `报名ID: ${data.id}`);
    return data;
  } catch (error) {
    reporter.record('用户报名考试', false, error.message);
    return null;
  }
}

/**
 * 开始考试
 */
async function startExam(examId, userId) {
  try {
    const attempt = {
      exam_id: examId,
      user_id: userId,
      attempt_number: 1,
      status: 'in_progress',
      started_at: new Date().toISOString(),
      ip_address: '127.0.0.1',
      user_agent: 'Test Agent'
    };
    
    const { data, error } = await supabase
      .from('exam_attempts')
      .insert([attempt])
      .select()
      .single();
    
    if (error) {
      reporter.record('开始考试', false, error.message);
      return null;
    }
    
    reporter.record('开始考试', true, `考试尝试ID: ${data.id}`);
    return data;
  } catch (error) {
    reporter.record('开始考试', false, error.message);
    return null;
  }
}

/**
 * 提交答案
 */
async function submitAnswers(attemptId, questions) {
  try {
    const answers = [
      {
        attempt_id: attemptId,
        question_id: questions[0].id,
        answer_data: { selected: ['以上都是'] },
        is_correct: true,
        score_earned: 10,
        time_spent_seconds: 30
      },
      {
        attempt_id: attemptId,
        question_id: questions[1].id,
        answer_data: { selected: ['false'] },
        is_correct: true,
        score_earned: 10,
        time_spent_seconds: 25
      },
      {
        attempt_id: attemptId,
        question_id: questions[2].id,
        answer_data: { selected: ['string'] }, // 故意答错
        is_correct: false,
        score_earned: 0,
        time_spent_seconds: 35
      }
    ];
    
    const { data, error } = await supabase
      .from('exam_answers')
      .insert(answers)
      .select();
    
    if (error) {
      reporter.record('提交答案', false, error.message);
      return null;
    }
    
    reporter.record('提交答案', true, `提交了${data.length}个答案`);
    return data;
  } catch (error) {
    reporter.record('提交答案', false, error.message);
    return null;
  }
}

/**
 * 完成考试
 */
async function completeExam(attemptId) {
  try {
    const totalScore = 20; // 2道题正确，每题10分
    const percentageScore = (totalScore / 30) * 100; // 总分30分
    const isPassed = percentageScore >= 60; // 及格线60%
    
    const { data, error } = await supabase
      .from('exam_attempts')
      .update({
        status: 'completed',
        submitted_at: new Date().toISOString(),
        time_spent_minutes: 5,
        total_score: totalScore,
        percentage_score: percentageScore,
        is_passed: isPassed
      })
      .eq('id', attemptId)
      .select()
      .single();
    
    if (error) {
      reporter.record('完成考试', false, error.message);
      return null;
    }
    
    reporter.record('完成考试', true, 
      `总分: ${totalScore}/30, 百分比: ${percentageScore.toFixed(1)}%, ${isPassed ? '通过' : '未通过'}`);
    return data;
  } catch (error) {
    reporter.record('完成考试', false, error.message);
    return null;
  }
}

/**
 * 测试防作弊监控
 */
async function testAntiCheatMonitoring(attemptId, userId) {
  try {
    const violations = [
      {
        attempt_id: attemptId,
        user_id: userId,
        violation_type: 'tab_switch',
        description: '用户切换了浏览器标签页',
        severity: 'medium',
        metadata: { timestamp: new Date().toISOString(), tab_count: 2 }
      },
      {
        attempt_id: attemptId,
        user_id: userId,
        violation_type: 'copy_paste',
        description: '检测到复制粘贴行为',
        severity: 'high',
        metadata: { content_length: 50, source: 'external' }
      }
    ];
    
    const { data, error } = await supabase
      .from('anti_cheat_logs')
      .insert(violations)
      .select();
    
    if (error) {
      reporter.record('防作弊监控', false, error.message);
      return null;
    }
    
    reporter.record('防作弊监控', true, `记录了${data.length}个违规行为`);
    return data;
  } catch (error) {
    reporter.record('防作弊监控', false, error.message);
    return null;
  }
}

/**
 * 测试API接口
 */
async function testAPIIntegration(examId, userId) {
  try {
    // 测试获取考试详情API
    const examResponse = await fetch(`${BASE_URL}/api/exams/${examId}`);
    if (examResponse.ok) {
      reporter.record('API-获取考试详情', true, `状态码: ${examResponse.status}`);
    } else {
      reporter.record('API-获取考试详情', false, `状态码: ${examResponse.status}`);
    }
    
    // 测试获取考试列表API
    const examsResponse = await fetch(`${BASE_URL}/api/exams`);
    if (examsResponse.ok) {
      reporter.record('API-获取考试列表', true, `状态码: ${examsResponse.status}`);
    } else {
      reporter.record('API-获取考试列表', false, `状态码: ${examsResponse.status}`);
    }
    
  } catch (error) {
    reporter.record('API集成测试', false, error.message);
  }
}

/**
 * 清理测试数据
 */
async function cleanupTestData(examId, userId) {
  try {
    // 删除相关数据（按依赖关系顺序）
    await supabase.from('anti_cheat_logs').delete().eq('user_id', userId);
    await supabase.from('exam_answers').delete().in('attempt_id', 
      supabase.from('exam_attempts').select('id').eq('user_id', userId)
    );
    await supabase.from('exam_attempts').delete().eq('user_id', userId);
    await supabase.from('exam_registrations').delete().eq('user_id', userId);
    await supabase.from('questions').delete().eq('exam_id', examId);
    await supabase.from('exams').delete().eq('id', examId);
    await supabase.from('users').delete().eq('id', userId);
    
    reporter.record('清理测试数据', true, '所有测试数据已清理');
  } catch (error) {
    reporter.record('清理测试数据', false, error.message);
  }
}

/**
 * 主测试流程
 */
async function runEndToEndTest() {
  console.log('🚀 开始端到端考试流程测试\n');
  
  let testUser = null;
  let testExam = null;
  let questions = null;
  let attempt = null;
  
  try {
    // 1. 创建测试用户
    testUser = await createTestUser();
    if (!testUser) return;
    
    // 2. 创建测试考试
    testExam = await createTestExam(testUser.id);
    if (!testExam) return;
    
    // 3. 添加考试题目
    questions = await addQuestionsToExam(testExam.id);
    if (!questions) return;
    
    // 4. 用户报名考试
    const registration = await registerForExam(testExam.id, testUser.id);
    if (!registration) return;
    
    // 5. 开始考试
    attempt = await startExam(testExam.id, testUser.id);
    if (!attempt) return;
    
    // 6. 提交答案
    const answers = await submitAnswers(attempt.id, questions);
    if (!answers) return;
    
    // 7. 测试防作弊监控
    await testAntiCheatMonitoring(attempt.id, testUser.id);
    
    // 8. 完成考试
    const completedAttempt = await completeExam(attempt.id);
    if (!completedAttempt) return;
    
    // 9. 测试API集成
    await testAPIIntegration(testExam.id, testUser.id);
    
    reporter.record('端到端流程测试', true, '所有步骤完成');
    
  } catch (error) {
    reporter.record('端到端流程测试', false, error.message);
  } finally {
    // 10. 清理测试数据
    if (testExam && testUser) {
      await cleanupTestData(testExam.id, testUser.id);
    }
    
    // 输出测试报告
    reporter.report();
  }
}

// 运行测试
if (require.main === module) {
  runEndToEndTest().catch(console.error);
}

module.exports = {
  runEndToEndTest,
  createTestUser,
  createTestExam,
  addQuestionsToExam,
  registerForExam,
  startExam,
  submitAnswers,
  completeExam,
  testAntiCheatMonitoring
};