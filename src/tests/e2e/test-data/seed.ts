import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// 加载环境变量
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase configuration');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * 测试用户数据
 * 包含不同角色的用户用于端到端测试
 */
export const TEST_USERS = {
  admin: {
    email: 'admin@test.com',
    password: 'Test123456!',
    name: '测试管理员',
    role: 'admin',
    phone: '13800000001'
  },
  teacher: {
    email: 'teacher@test.com',
    password: 'Test123456!',
    name: '测试教师',
    role: 'teacher',
    phone: '13800000002'
  },
  student: {
    email: 'student@test.com',
    password: 'Test123456!',
    name: '测试学生',
    role: 'student',
    phone: '13800000003'
  },
  student2: {
    email: 'student2@test.com',
    password: 'Test123456!',
    name: '测试学生2',
    role: 'student',
    phone: '13800000004'
  }
};

/**
 * 测试考试数据
 */
export const TEST_EXAM_DATA = {
  exam: {
    title: '端到端测试考试',
    description: '这是一个用于端到端测试的考试',
    duration: 60, // 60分钟
    total_score: 100,
    passing_score: 60,
    start_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 明天开始
    end_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 一周后结束
    status: 'active'
  },
  questions: [
    {
      question_text: '以下哪个是JavaScript的数据类型？',
      question_type: 'multiple_choice',
      score: 25,
      options: [
        { text: 'string', is_correct: true },
        { text: 'integer', is_correct: false },
        { text: 'float', is_correct: false },
        { text: 'char', is_correct: false }
      ]
    },
    {
      question_text: 'React是什么？',
      question_type: 'multiple_choice',
      score: 25,
      options: [
        { text: '一个JavaScript库', is_correct: true },
        { text: '一个数据库', is_correct: false },
        { text: '一个操作系统', is_correct: false },
        { text: '一个编程语言', is_correct: false }
      ]
    },
    {
      question_text: '请解释什么是闭包？',
      question_type: 'essay',
      score: 25
    },
    {
      question_text: 'HTML的全称是什么？',
      question_type: 'short_answer',
      score: 25
    }
  ]
};

/**
 * 清理测试数据
 * 删除所有测试相关的数据
 */
export async function cleanupTestData() {
  try {
    console.log('开始清理测试数据...');
    
    // 删除测试用户的考试相关数据
    const testEmails = Object.values(TEST_USERS).map(user => user.email);
    
    // 获取测试用户ID
    const { data: testUsers } = await supabase
      .from('users')
      .select('id')
      .in('email', testEmails);
    
    if (testUsers && testUsers.length > 0) {
      const testUserIds = testUsers.map(user => user.id);
      
      // 删除用户答案
      await supabase
        .from('user_answers')
        .delete()
        .in('user_id', testUserIds);
      
      // 删除考试尝试
      await supabase
        .from('exam_attempts')
        .delete()
        .in('user_id', testUserIds);
      
      // 删除考试注册
      await supabase
        .from('exam_registrations')
        .delete()
        .in('user_id', testUserIds);
    }
    
    // 删除测试考试的题目
    const { data: testExams } = await supabase
      .from('exams')
      .select('id')
      .ilike('title', '%端到端测试%');
    
    if (testExams && testExams.length > 0) {
      const testExamIds = testExams.map(exam => exam.id);
      
      // 删除题目
      await supabase
        .from('questions')
        .delete()
        .in('exam_id', testExamIds);
      
      // 删除考试
      await supabase
        .from('exams')
        .delete()
        .in('id', testExamIds);
    }
    
    // 删除测试用户
    await supabase
      .from('users')
      .delete()
      .in('email', testEmails);
    
    // 清理Supabase Auth中的用户
    for (const email of testEmails) {
      try {
        // 获取用户
        const { data: authUsers } = await supabase.auth.admin.listUsers();
        const userToDelete = authUsers.users.find(user => user.email === email);
        
        if (userToDelete) {
          await supabase.auth.admin.deleteUser(userToDelete.id);
          console.log(`删除认证用户: ${email}`);
        }
      } catch (error) {
        console.warn(`删除认证用户失败 (${email}):`, error);
      }
    }
    
    console.log('测试数据清理完成');
  } catch (error) {
    console.error('清理测试数据失败:', error);
    throw error;
  }
}

/**
 * 创建测试用户
 * @param userData 用户数据
 * @returns 创建的用户ID
 */
export async function createTestUser(userData: typeof TEST_USERS.admin) {
  try {
    // 为邮箱添加时间戳确保唯一性
    const timestamp = Date.now().toString().slice(-6);
    const uniqueEmail = userData.email.replace('@', `+${timestamp}@`);
    
    // 首先在Supabase Auth中创建用户
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: uniqueEmail,
      password: userData.password,
      email_confirm: true
    });
    
    if (authError) {
      throw new Error(`创建认证用户失败: ${authError.message}`);
    }
    
    if (!authUser.user) {
      throw new Error('创建认证用户失败: 未返回用户数据');
    }
    
    // 在users表中创建用户记录
    const { data: user, error: userError } = await supabase
      .from('users')
      .insert({
        id: authUser.user.id,
        email: uniqueEmail,
        name: userData.name,
        role: userData.role,
        phone: `${userData.phone}${Date.now().toString().slice(-3)}`,
        password_hash: 'test_hash',
        face_verified: false,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (userError) {
      throw new Error(`创建用户记录失败: ${userError.message}`);
    }
    
    console.log(`创建测试用户成功: ${uniqueEmail} (${userData.role})`);
    return user.id;
  } catch (error) {
    console.error(`创建测试用户失败 (${uniqueEmail}):`, error);
    throw error;
  }
}

/**
 * 创建测试考试
 * @param creatorId 创建者ID（管理员或教师）
 * @returns 创建的考试ID
 */
export async function createTestExam(creatorId: string) {
  try {
    // 创建考试
    const { data: exam, error: examError } = await supabase
      .from('exams')
      .insert({
        ...TEST_EXAM_DATA.exam,
        created_by: creatorId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (examError) {
      throw new Error(`创建考试失败: ${examError.message}`);
    }
    
    // 创建题目
    const questionsToInsert = TEST_EXAM_DATA.questions.map(question => ({
      exam_id: exam.id,
      question_text: question.question_text,
      question_type: question.question_type,
      score: question.score,
      options: question.options || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));
    
    const { error: questionsError } = await supabase
      .from('questions')
      .insert(questionsToInsert);
    
    if (questionsError) {
      throw new Error(`创建题目失败: ${questionsError.message}`);
    }
    
    console.log(`创建测试考试成功: ${exam.title} (ID: ${exam.id})`);
    return exam.id;
  } catch (error) {
    console.error('创建测试考试失败:', error);
    throw error;
  }
}

/**
 * 为学生注册考试
 * @param examId 考试ID
 * @param studentId 学生ID
 */
export async function registerStudentForExam(examId: string, studentId: string) {
  try {
    const { error } = await supabase
      .from('exam_registrations')
      .insert({
        exam_id: examId,
        user_id: studentId,
        registered_at: new Date().toISOString()
      });
    
    if (error) {
      throw new Error(`学生注册考试失败: ${error.message}`);
    }
    
    console.log(`学生注册考试成功: 学生ID ${studentId}, 考试ID ${examId}`);
  } catch (error) {
    console.error('学生注册考试失败:', error);
    throw error;
  }
}

/**
 * 设置完整的测试数据
 * 创建所有必要的测试用户、考试和数据
 */
export async function setupTestData() {
  try {
    console.log('开始设置测试数据...');
    
    // 先清理现有测试数据
    await cleanupTestData();
    
    // 创建测试用户
    const adminId = await createTestUser(TEST_USERS.admin);
    const teacherId = await createTestUser(TEST_USERS.teacher);
    const studentId = await createTestUser(TEST_USERS.student);
    const student2Id = await createTestUser(TEST_USERS.student2);
    
    // 创建测试考试（由管理员创建）
    const examId = await createTestExam(adminId);
    
    // 为学生注册考试
    await registerStudentForExam(examId, studentId);
    await registerStudentForExam(examId, student2Id);
    
    console.log('测试数据设置完成');
    
    return {
      users: {
        adminId,
        teacherId,
        studentId,
        student2Id
      },
      examId
    };
  } catch (error) {
    console.error('设置测试数据失败:', error);
    throw error;
  }
}

/**
 * 验证测试数据
 * 检查所有测试数据是否正确创建
 */
export async function verifyTestData() {
  try {
    console.log('开始验证测试数据...');
    
    // 验证用户
    const testEmails = Object.values(TEST_USERS).map(user => user.email);
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .in('email', testEmails);
    
    if (usersError) {
      throw new Error(`验证用户失败: ${usersError.message}`);
    }
    
    console.log(`验证用户成功: 找到 ${users?.length || 0} 个测试用户`);
    
    // 验证考试
    const { data: exams, error: examsError } = await supabase
      .from('exams')
      .select('*, questions(*)')
      .ilike('title', '%端到端测试%');
    
    if (examsError) {
      throw new Error(`验证考试失败: ${examsError.message}`);
    }
    
    console.log(`验证考试成功: 找到 ${exams?.length || 0} 个测试考试`);
    
    if (exams && exams.length > 0) {
      const exam = exams[0];
      console.log(`考试详情: ${exam.title}, 题目数量: ${exam.questions?.length || 0}`);
    }
    
    console.log('测试数据验证完成');
    return true;
  } catch (error) {
    console.error('验证测试数据失败:', error);
    return false;
  }
}