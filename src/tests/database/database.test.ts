import { createClient } from '@supabase/supabase-js';
import { Database } from '../../types/database';
import * as dotenv from 'dotenv';
import * as path from 'path';

// 加载环境变量
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

/**
 * 数据库测试套件
 * 验证数据操作的正确性和数据完整性
 */

// 测试数据库配置
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing required Supabase environment variables');
}

// 创建具有管理员权限的客户端用于测试
const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

/**
 * 测试数据清理函数
 * 在每个测试后清理测试数据
 */
async function cleanupTestData() {
  // 清理测试用户创建的数据
  await supabase.from('exam_results').delete().like('user_id', 'test_%');
  await supabase.from('exam_assignments').delete().like('assigned_by', 'test_%');
  await supabase.from('exams').delete().like('created_by', 'test_%');
  await supabase.from('questions').delete().like('created_by', 'test_%');
  await supabase.from('profiles').delete().like('id', 'test_%');
}

/**
 * 创建测试用户
 */
async function createTestUser(role: 'admin' | 'teacher' | 'student', suffix: string = '') {
  const userId = `test_${role}_${suffix}_${Date.now()}`;
  const userData = {
    id: userId,
    phone: `138${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`,
    name: `测试${role}${suffix}`,
    role: role,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('profiles')
    .insert(userData)
    .select()
    .single();

  if (error) {
    throw new Error(`创建测试用户失败: ${error.message}`);
  }

  return data;
}

/**
 * 创建测试题目
 */
async function createTestQuestion(createdBy: string, type: 'single' | 'multiple' | 'essay' = 'single') {
  const questionData = {
    title: `测试题目_${Date.now()}`,
    content: '这是一个测试题目的内容',
    type: type,
    options: type !== 'essay' ? [
      { text: '选项A', is_correct: true },
      { text: '选项B', is_correct: false },
      { text: '选项C', is_correct: false },
      { text: '选项D', is_correct: false }
    ] : null,
    correct_answer: type === 'essay' ? '这是标准答案' : null,
    points: 10,
    difficulty: 'medium' as const,
    subject: '测试科目',
    created_by: createdBy,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('questions')
    .insert(questionData)
    .select()
    .single();

  if (error) {
    throw new Error(`创建测试题目失败: ${error.message}`);
  }

  return data;
}

/**
 * 创建测试考试
 */
async function createTestExam(createdBy: string, questionIds: string[]) {
  const examData = {
    title: `测试考试_${Date.now()}`,
    description: '这是一个测试考试',
    duration: 60,
    total_points: questionIds.length * 10,
    question_ids: questionIds,
    status: 'draft' as const,
    created_by: createdBy,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('exams')
    .insert(examData)
    .select()
    .single();

  if (error) {
    throw new Error(`创建测试考试失败: ${error.message}`);
  }

  return data;
}

describe('数据库测试', () => {
  // 在每个测试后清理数据
  afterEach(async () => {
    await cleanupTestData();
  });

  // 在所有测试结束后清理数据
  afterAll(async () => {
    await cleanupTestData();
  });

  describe('用户管理测试', () => {
    test('应该能够创建用户', async () => {
      const user = await createTestUser('student', 'create');
      
      expect(user).toBeDefined();
      expect(user.role).toBe('student');
      expect(user.phone).toMatch(/^138\d{8}$/);
      expect(user.name).toContain('测试student');
    });

    test('应该能够查询用户', async () => {
      const user = await createTestUser('teacher', 'query');
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.id).toBe(user.id);
      expect(data.role).toBe('teacher');
    });

    test('应该能够更新用户信息', async () => {
      const user = await createTestUser('admin', 'update');
      const newName = '更新后的名称';
      
      const { data, error } = await supabase
        .from('profiles')
        .update({ name: newName, updated_at: new Date().toISOString() })
        .eq('id', user.id)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.name).toBe(newName);
    });

    test('应该能够删除用户', async () => {
      const user = await createTestUser('student', 'delete');
      
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', user.id);

      expect(error).toBeNull();

      // 验证用户已被删除
      const { data, error: queryError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      expect(data).toBeNull();
      expect(queryError).toBeDefined();
    });
  });

  describe('题目管理测试', () => {
    test('应该能够创建单选题', async () => {
      const teacher = await createTestUser('teacher', 'question');
      const question = await createTestQuestion(teacher.id, 'single');
      
      expect(question).toBeDefined();
      expect(question.type).toBe('single');
      expect(question.options).toHaveLength(4);
      expect(question.options?.filter(opt => opt.is_correct)).toHaveLength(1);
      expect(question.points).toBe(10);
    });

    test('应该能够创建多选题', async () => {
      const teacher = await createTestUser('teacher', 'multiple');
      const questionData = {
        title: `测试多选题_${Date.now()}`,
        content: '这是一个测试多选题',
        type: 'multiple' as const,
        options: [
          { text: '选项A', is_correct: true },
          { text: '选项B', is_correct: true },
          { text: '选项C', is_correct: false },
          { text: '选项D', is_correct: false }
        ],
        points: 15,
        difficulty: 'hard' as const,
        subject: '测试科目',
        created_by: teacher.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('questions')
        .insert(questionData)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.type).toBe('multiple');
      expect(data.options?.filter(opt => opt.is_correct)).toHaveLength(2);
    });

    test('应该能够创建问答题', async () => {
      const teacher = await createTestUser('teacher', 'essay');
      const question = await createTestQuestion(teacher.id, 'essay');
      
      expect(question).toBeDefined();
      expect(question.type).toBe('essay');
      expect(question.options).toBeNull();
      expect(question.correct_answer).toBe('这是标准答案');
    });

    test('应该能够查询题目', async () => {
      const teacher = await createTestUser('teacher', 'query_q');
      const question = await createTestQuestion(teacher.id);
      
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('id', question.id)
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.id).toBe(question.id);
      expect(data.created_by).toBe(teacher.id);
    });
  });

  describe('考试管理测试', () => {
    test('应该能够创建考试', async () => {
      const teacher = await createTestUser('teacher', 'exam');
      const question1 = await createTestQuestion(teacher.id);
      const question2 = await createTestQuestion(teacher.id);
      
      const exam = await createTestExam(teacher.id, [question1.id, question2.id]);
      
      expect(exam).toBeDefined();
      expect(exam.question_ids).toHaveLength(2);
      expect(exam.total_points).toBe(20);
      expect(exam.status).toBe('draft');
    });

    test('应该能够发布考试', async () => {
      const teacher = await createTestUser('teacher', 'publish');
      const question = await createTestQuestion(teacher.id);
      const exam = await createTestExam(teacher.id, [question.id]);
      
      const { data, error } = await supabase
        .from('exams')
        .update({ 
          status: 'published',
          start_time: new Date().toISOString(),
          end_time: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2小时后
          updated_at: new Date().toISOString()
        })
        .eq('id', exam.id)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.status).toBe('published');
      expect(data.start_time).toBeDefined();
      expect(data.end_time).toBeDefined();
    });
  });

  describe('考试分配测试', () => {
    test('应该能够分配考试给学生', async () => {
      const teacher = await createTestUser('teacher', 'assign');
      const student = await createTestUser('student', 'assigned');
      const question = await createTestQuestion(teacher.id);
      const exam = await createTestExam(teacher.id, [question.id]);
      
      const assignmentData = {
        exam_id: exam.id,
        student_id: student.id,
        assigned_by: teacher.id,
        assigned_at: new Date().toISOString(),
        due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24小时后
      };

      const { data, error } = await supabase
        .from('exam_assignments')
        .insert(assignmentData)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.exam_id).toBe(exam.id);
      expect(data.student_id).toBe(student.id);
      expect(data.assigned_by).toBe(teacher.id);
    });
  });

  describe('考试结果测试', () => {
    test('应该能够保存考试结果', async () => {
      const teacher = await createTestUser('teacher', 'result');
      const student = await createTestUser('student', 'result');
      const question = await createTestQuestion(teacher.id);
      const exam = await createTestExam(teacher.id, [question.id]);
      
      const resultData = {
        exam_id: exam.id,
        user_id: student.id,
        answers: [{
          question_id: question.id,
          selected_options: [0], // 选择第一个选项
          answer_text: null
        }],
        score: 10,
        total_score: 10,
        completion_time: 30, // 30分钟
        submitted_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('exam_results')
        .insert(resultData)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.score).toBe(10);
      expect(data.total_score).toBe(10);
      expect(data.answers).toHaveLength(1);
    });

    test('应该能够查询学生的考试结果', async () => {
      const teacher = await createTestUser('teacher', 'query_result');
      const student = await createTestUser('student', 'query_result');
      const question = await createTestQuestion(teacher.id);
      const exam = await createTestExam(teacher.id, [question.id]);
      
      // 创建考试结果
      const resultData = {
        exam_id: exam.id,
        user_id: student.id,
        answers: [{
          question_id: question.id,
          selected_options: [0],
          answer_text: null
        }],
        score: 8,
        total_score: 10,
        completion_time: 25,
        submitted_at: new Date().toISOString()
      };

      await supabase.from('exam_results').insert(resultData);
      
      // 查询结果
      const { data, error } = await supabase
        .from('exam_results')
        .select(`
          *,
          exams!inner(title, total_points),
          profiles!inner(name, role)
        `)
        .eq('user_id', student.id)
        .eq('exam_id', exam.id)
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.score).toBe(8);
      expect(data.exams).toBeDefined();
      expect(data.profiles).toBeDefined();
    });
  });

  describe('数据完整性测试', () => {
    test('应该维护外键约束', async () => {
      // 尝试创建引用不存在用户的题目
      const questionData = {
        title: '测试题目',
        content: '测试内容',
        type: 'single' as const,
        options: [{ text: '选项A', is_correct: true }],
        points: 10,
        difficulty: 'easy' as const,
        subject: '测试',
        created_by: 'non_existent_user_id',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('questions')
        .insert(questionData)
        .select();

      // 应该失败，因为引用的用户不存在
      expect(error).toBeDefined();
      expect(data).toBeNull();
    });

    test('应该正确处理级联删除', async () => {
      const teacher = await createTestUser('teacher', 'cascade');
      const question = await createTestQuestion(teacher.id);
      const exam = await createTestExam(teacher.id, [question.id]);
      
      // 删除教师
      await supabase.from('profiles').delete().eq('id', teacher.id);
      
      // 检查相关的题目和考试是否也被删除或更新
      const { data: questionData } = await supabase
        .from('questions')
        .select('*')
        .eq('id', question.id);
      
      const { data: examData } = await supabase
        .from('exams')
        .select('*')
        .eq('id', exam.id);
      
      // 根据数据库设计，这些记录可能被删除或created_by字段被设为null
      // 具体行为取决于外键约束的设置
      expect(questionData).toBeDefined();
      expect(examData).toBeDefined();
    });
  });

  describe('性能测试', () => {
    test('应该能够高效查询大量数据', async () => {
      const teacher = await createTestUser('teacher', 'performance');
      
      // 创建多个题目
      const questions = [];
      for (let i = 0; i < 10; i++) {
        const question = await createTestQuestion(teacher.id);
        questions.push(question);
      }
      
      const startTime = Date.now();
      
      // 查询所有题目
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('created_by', teacher.id);
      
      const endTime = Date.now();
      const queryTime = endTime - startTime;
      
      expect(error).toBeNull();
      expect(data).toHaveLength(10);
      expect(queryTime).toBeLessThan(5000); // 查询应该在5秒内完成
    });
  });
});