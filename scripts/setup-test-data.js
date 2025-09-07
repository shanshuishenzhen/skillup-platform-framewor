#!/usr/bin/env node
/**
 * 测试数据设置脚本
 * 
 * 用于在运行端到端测试前设置必要的测试数据
 * 包括创建测试用户、考试、题目等
 * 
 * @author SOLO Coding
 */

const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// 加载环境变量
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

// Supabase 配置
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 缺少 Supabase 配置');
  console.error('请确保 .env.local 文件中包含:');
  console.error('- NEXT_PUBLIC_SUPABASE_URL');
  console.error('- SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// 测试用户数据
const timestamp = Date.now();
const TEST_USERS = {
  admin: {
    email: `admin.${timestamp}@e2etest.com`,
    phone: `138${timestamp.toString().slice(-8)}1`,
    password: 'Test123456!',
    role: 'admin',
    name: '测试管理员'
  },
  teacher: {
    email: `teacher.${timestamp}@e2etest.com`,
    phone: `138${timestamp.toString().slice(-8)}2`,
    password: 'Test123456!',
    role: 'teacher',
    name: '测试教师'
  },
  student: {
    email: `student.${timestamp}@e2etest.com`,
    phone: `138${timestamp.toString().slice(-8)}3`,
    password: 'Test123456!',
    role: 'student',
    name: '测试学生'
  },
  student2: {
    email: `student2.${timestamp}@e2etest.com`,
    phone: `138${timestamp.toString().slice(-8)}4`,
    password: 'Test123456!',
    role: 'student',
    name: '测试学生2'
  }
};

// 测试考试数据
const TEST_EXAM = {
  title: '端到端测试考试',
  description: '用于端到端测试的示例考试',
  duration: 60,
  total_score: 100,
  passing_score: 60,
  start_time: new Date().toISOString(),
  end_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7天后
  status: 'active'
};

// 测试题目数据
const TEST_QUESTIONS = [
  {
    question_text: 'JavaScript中哪个关键字用于声明变量？',
    question_type: 'multiple_choice',
    options: ['var', 'let', 'const', '以上都是'],
    correct_answers: ['以上都是'],
    explanation: 'JavaScript中var、let、const都可以用来声明变量',
    score: 5
  },
  {
    question_text: '以下哪些是JavaScript的数据类型？',
    question_type: 'multiple_choice',
    options: ['string', 'number', 'boolean', 'object'],
    correct_answers: ['string', 'number', 'boolean', 'object'],
    explanation: 'JavaScript有多种基本数据类型',
    score: 5
  },
  {
    question_text: '什么是闭包？',
    question_type: 'short_answer',
    options: null,
    correct_answers: ['闭包是指有权访问另一个函数作用域中变量的函数'],
    explanation: '闭包是JavaScript的重要概念',
    score: 10
  },
  {
    question_text: 'React是一个前端框架',
    question_type: 'true_false',
    options: ['true', 'false'],
    correct_answers: ['true'],
    explanation: 'React是Facebook开发的前端库/框架',
    score: 3
  }
];

/**
 * 创建测试用户
 */
async function createTestUsers() {
  console.log('📝 创建测试用户...');
  const userIds = {};
  
  for (const [key, userData] of Object.entries(TEST_USERS)) {
    try {
      // 创建用户账户
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: userData.email,
        password: userData.password,
        email_confirm: true
      });
      
      if (authError) {
        console.error(`创建用户 ${userData.email} 失败:`, authError.message);
        continue;
      }
      
      const userId = authData.user.id;
      userIds[key + 'Id'] = userId;
      
      // 创建用户记录
      const { error: userError } = await supabase
        .from('users')
        .insert({
          id: userId,
          phone: userData.phone,
          password_hash: 'test_hash', // 临时密码哈希
          email: userData.email,
          name: userData.name,
          role: userData.role,
          face_verified: false,
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      
      if (userError) {
        console.error(`创建用户记录 ${userData.email} 失败:`, userError.message);
      } else {
        console.log(`✅ 创建用户: ${userData.name} (${userData.email})`);
      }
    } catch (error) {
      console.error(`创建用户 ${userData.email} 时出错:`, error.message);
    }
  }
  
  return userIds;
}

/**
 * 创建测试考试
 */
async function createTestExam(teacherId) {
  console.log('📝 创建测试考试...');
  
  try {
    // 如果没有教师ID，使用第一个可用的用户ID
    let creatorId = teacherId;
    if (!creatorId) {
      const { data: users } = await supabase
        .from('users')
        .select('id')
        .limit(1);
      
      if (users && users.length > 0) {
        creatorId = users[0].id;
      } else {
        throw new Error('没有可用的用户来创建考试');
      }
    }
    
    const { data, error } = await supabase
      .from('exams')
      .insert({
        ...TEST_EXAM,
        created_by: creatorId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) {
      throw new Error(`创建考试失败: ${error.message}`);
    }
    
    console.log(`✅ 创建考试: ${TEST_EXAM.title}`);
    return data.id;
  } catch (error) {
    console.error('创建考试时出错:', error.message);
    throw error;
  }
}

/**
 * 创建测试题目
 */
async function createTestQuestions(examId) {
  console.log('📝 创建测试题目...');
  
  try {
    const questionsWithExamId = TEST_QUESTIONS.map((question, index) => ({
      ...question,
      exam_id: examId,
      order_index: index + 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));
    
    const { data, error } = await supabase
      .from('questions')
      .insert(questionsWithExamId)
      .select();
    
    if (error) {
      throw new Error(`创建题目失败: ${error.message}`);
    }
    
    console.log(`✅ 创建 ${data.length} 道题目`);
    return data;
  } catch (error) {
    console.error('创建题目时出错:', error.message);
    throw error;
  }
}

/**
 * 设置测试数据
 */
async function setupTestData() {
  try {
    // 创建测试用户
    const userIds = await createTestUsers();
    
    // 创建测试考试
    const examId = await createTestExam(userIds.teacherId);
    
    // 创建测试题目
    const questions = await createTestQuestions(examId);
    
    return {
      users: userIds,
      examId,
      questions
    };
  } catch (error) {
    console.error('设置测试数据失败:', error.message);
    throw error;
  }
}

/**
 * 清理测试数据
 */
async function cleanupTestData() {
  console.log('🧹 清理测试数据...');
  
  try {
    // 删除测试用户的考试相关数据
    const testEmails = Object.values(TEST_USERS).map(user => user.email);
    
    // 获取测试用户ID
    const { data: users } = await supabase
      .from('users')
      .select('id')
      .in('email', testEmails);
    
    if (users && users.length > 0) {
      const userIds = users.map(user => user.id);
      
      // 删除相关数据（按依赖关系顺序）
      await supabase.from('user_answers').delete().in('user_id', userIds);
      await supabase.from('exam_attempts').delete().in('user_id', userIds);
      await supabase.from('exam_registrations').delete().in('user_id', userIds);
      
      // 删除测试考试的题目
      const { data: exams } = await supabase
        .from('exams')
        .select('id')
        .in('created_by', userIds);
      
      if (exams && exams.length > 0) {
        const examIds = exams.map(exam => exam.id);
        await supabase.from('questions').delete().in('exam_id', examIds);
        await supabase.from('exams').delete().in('id', examIds);
      }
      
      // 删除用户记录
      await supabase.from('users').delete().in('id', userIds);
      
      // 删除认证用户
      for (const userId of userIds) {
        await supabase.auth.admin.deleteUser(userId);
      }
    }
    
    // 清理 Supabase Auth 用户
    for (const userData of Object.values(TEST_USERS)) {
      try {
        // 尝试通过邮箱获取用户并删除
        const { data: authUsers } = await supabase.auth.admin.listUsers();
        const userToDelete = authUsers.users.find(u => u.email === userData.email);
        if (userToDelete) {
          await supabase.auth.admin.deleteUser(userToDelete.id);
          console.log(`🗑️ 删除认证用户: ${userData.email}`);
        }
      } catch (authError) {
        console.log(`⚠️ 清理认证用户失败 ${userData.email}:`, authError.message);
      }
    }
    
    console.log('✅ 测试数据清理完成');
  } catch (error) {
    console.error('清理测试数据失败:', error.message);
    throw error;
  }
}

/**
 * 验证测试数据
 */
async function verifyTestData() {
  console.log('🔍 验证测试数据...');
  
  try {
    const testEmails = Object.values(TEST_USERS).map(user => user.email);
    
    // 验证用户
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .in('email', testEmails);
    
    if (usersError) {
      console.error('验证用户失败:', usersError.message);
      return false;
    }
    
    if (!users || users.length !== Object.keys(TEST_USERS).length) {
      console.error(`用户数量不匹配，期望 ${Object.keys(TEST_USERS).length}，实际 ${users?.length || 0}`);
      return false;
    }
    
    // 验证考试
    const teacherUser = users.find(user => user.role === 'teacher');
    if (!teacherUser) {
      console.error('未找到教师用户');
      return false;
    }
    
    const { data: exams, error: examsError } = await supabase
      .from('exams')
      .select('*')
      .eq('created_by', teacherUser.id);
    
    if (examsError) {
      console.error('验证考试失败:', examsError.message);
      return false;
    }
    
    if (!exams || exams.length === 0) {
      console.error('未找到测试考试');
      return false;
    }
    
    // 验证题目
    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select('*')
      .eq('exam_id', exams[0].id);
    
    if (questionsError) {
      console.error('验证题目失败:', questionsError.message);
      return false;
    }
    
    if (!questions || questions.length !== TEST_QUESTIONS.length) {
      console.error(`题目数量不匹配，期望 ${TEST_QUESTIONS.length}，实际 ${questions?.length || 0}`);
      return false;
    }
    
    console.log('✅ 测试数据验证通过');
    return true;
  } catch (error) {
    console.error('验证测试数据失败:', error.message);
    return false;
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('🚀 开始设置端到端测试数据...');
  
  try {
    // 设置测试数据
    console.log('📝 设置测试数据...');
    const testData = await setupTestData();
    
    console.log('✅ 测试数据设置完成:');
    console.log(`   - 管理员ID: ${testData.users.adminId}`);
    console.log(`   - 教师ID: ${testData.users.teacherId}`);
    console.log(`   - 学生ID: ${testData.users.studentId}`);
    console.log(`   - 学生2ID: ${testData.users.student2Id}`);
    console.log(`   - 考试ID: ${testData.examId}`);
    
    // 验证测试数据
    console.log('🔍 验证测试数据...');
    const isValid = await verifyTestData();
    
    if (isValid) {
      console.log('✅ 测试数据验证通过');
      console.log('🎉 端到端测试数据设置完成，可以开始运行测试');
      process.exit(0);
    } else {
      console.error('❌ 测试数据验证失败');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ 设置测试数据失败:', error);
    
    // 尝试清理可能的部分数据
    try {
      console.log('🧹 清理部分数据...');
      await cleanupTestData();
    } catch (cleanupError) {
      console.error('清理数据时出错:', cleanupError);
    }
    
    process.exit(1);
  }
}

/**
 * 清理测试数据的函数
 */
async function cleanup() {
  console.log('🧹 开始清理端到端测试数据...');
  
  try {
    await cleanupTestData();
    console.log('✅ 测试数据清理完成');
    process.exit(0);
  } catch (error) {
    console.error('❌ 清理测试数据失败:', error);
    process.exit(1);
  }
}

// 检查命令行参数
const args = process.argv.slice(2);
if (args.includes('--cleanup') || args.includes('-c')) {
  cleanup();
} else {
  main();
}

// 导出函数供其他模块使用
module.exports = {
  setupTestData,
  cleanupTestData,
  verifyTestData,
  TEST_USERS,
  TEST_EXAM,
  TEST_QUESTIONS
};