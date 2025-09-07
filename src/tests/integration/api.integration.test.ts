/**
 * API集成测试
 * 
 * 测试所有API接口的完整流程，包括：
 * 1. 用户认证API
 * 2. 考试管理API
 * 3. 题目管理API
 * 4. 考试分配API
 * 5. 考试结果API
 * 
 * @author SOLO Coding
 * @version 1.0.0
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { supabase } from '../../lib/supabase';
import { ExamStatus, ExamDifficulty } from '../../types/exam';

/**
 * 测试配置
 */
const TEST_CONFIG = {
  port: process.env.TEST_PORT || 3001,
  timeout: 30000
};

/**
 * 测试用户数据
 */
const TEST_USERS = {
  admin: {
    email: 'api-admin@test.com',
    password: 'AdminTest123!',
    role: 'admin',
    name: 'API测试管理员'
  },
  teacher: {
    email: 'api-teacher@test.com',
    password: 'TeacherTest123!',
    role: 'teacher',
    name: 'API测试教师'
  },
  student: {
    email: 'api-student@test.com',
    password: 'StudentTest123!',
    role: 'student',
    name: 'API测试学生'
  }
};

/**
 * 测试数据
 */
const TEST_DATA = {
  exam: {
    title: 'API集成测试考试',
    description: '这是一个API集成测试用的考试',
    difficulty: ExamDifficulty.MEDIUM,
    duration: 60,
    total_questions: 10,
    passing_score: 70,
    status: ExamStatus.DRAFT
  },
  question: {
    title: 'API测试题目',
    type: 'multiple_choice',
    content: '这是一个API测试题目',
    options: ['选项A', '选项B', '选项C', '选项D'],
    correct_answer: '选项A',
    difficulty: 'medium',
    category: 'api-test'
  }
};

/**
 * API集成测试套件
 */
describe('API集成测试', () => {
  let app: any;
  let server: any;
  let adminToken: string;
  let teacherToken: string;
  let studentToken: string;
  let createdExamId: string;
  let createdQuestionId: string;

  /**
   * 测试套件初始化
   */
  beforeAll(async () => {
    // 创建Next.js应用
    app = next({ dev: false, quiet: true });
    await app.prepare();

    // 创建HTTP服务器
    server = createServer((req, res) => {
      const parsedUrl = parse(req.url!, true);
      app.getRequestHandler()(req, res, parsedUrl);
    });

    // 启动服务器
    await new Promise<void>((resolve) => {
      server.listen(TEST_CONFIG.port, resolve);
    });

    // 准备测试数据
    await setupTestData();

    // 获取认证令牌
    await authenticateUsers();
  }, 60000);

  /**
   * 测试套件清理
   */
  afterAll(async () => {
    // 清理测试数据
    await cleanupTestData();

    // 关闭服务器
    if (server) {
      await new Promise<void>((resolve) => {
        server.close(resolve);
      });
    }

    // 关闭Next.js应用
    if (app) {
      await app.close();
    }
  }, 30000);

  /**
   * 用户认证API测试
   */
  describe('用户认证API', () => {
    /**
     * 测试用户注册
     */
    it('POST /api/auth/register - 应该成功注册新用户', async () => {
      const newUser = {
        email: 'new-user@test.com',
        password: 'NewUser123!',
        name: '新用户',
        role: 'student'
      };

      const response = await request(server)
        .post('/api/auth/register')
        .send(newUser)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(newUser.email);
      expect(response.body.user.role).toBe(newUser.role);

      // 清理创建的用户
      await supabase.from('users').delete().eq('email', newUser.email);
    });

    /**
     * 测试用户登录
     */
    it('POST /api/auth/login - 应该成功登录用户', async () => {
      const loginData = {
        email: TEST_USERS.student.email,
        password: TEST_USERS.student.password
      };

      const response = await request(server)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(loginData.email);
    });

    /**
     * 测试无效登录
     */
    it('POST /api/auth/login - 应该拒绝无效凭据', async () => {
      const invalidLogin = {
        email: TEST_USERS.student.email,
        password: 'wrongpassword'
      };

      const response = await request(server)
        .post('/api/auth/login')
        .send(invalidLogin)
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });

    /**
     * 测试令牌验证
     */
    it('GET /api/auth/verify - 应该验证有效令牌', async () => {
      const response = await request(server)
        .get('/api/auth/verify')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('user');
    });

    /**
     * 测试无效令牌
     */
    it('GET /api/auth/verify - 应该拒绝无效令牌', async () => {
      const response = await request(server)
        .get('/api/auth/verify')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  /**
   * 考试管理API测试
   */
  describe('考试管理API', () => {
    /**
     * 测试创建考试
     */
    it('POST /api/exams - 管理员应该能够创建考试', async () => {
      const response = await request(server)
        .post('/api/exams')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(TEST_DATA.exam)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('exam');
      expect(response.body.exam.title).toBe(TEST_DATA.exam.title);
      
      createdExamId = response.body.exam.id;
    });

    /**
     * 测试获取考试列表
     */
    it('GET /api/exams - 应该返回考试列表', async () => {
      const response = await request(server)
        .get('/api/exams')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('exams');
      expect(Array.isArray(response.body.exams)).toBe(true);
    });

    /**
     * 测试获取单个考试
     */
    it('GET /api/exams/:id - 应该返回指定考试详情', async () => {
      const response = await request(server)
        .get(`/api/exams/${createdExamId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('exam');
      expect(response.body.exam.id).toBe(createdExamId);
    });

    /**
     * 测试更新考试
     */
    it('PUT /api/exams/:id - 应该更新考试信息', async () => {
      const updateData = {
        title: '更新后的考试标题',
        description: '更新后的考试描述'
      };

      const response = await request(server)
        .put(`/api/exams/${createdExamId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.exam.title).toBe(updateData.title);
      expect(response.body.exam.description).toBe(updateData.description);
    });

    /**
     * 测试发布考试
     */
    it('POST /api/exams/:id/publish - 应该发布考试', async () => {
      const response = await request(server)
        .post(`/api/exams/${createdExamId}/publish`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.exam.status).toBe(ExamStatus.PUBLISHED);
    });

    /**
     * 测试学生无权限创建考试
     */
    it('POST /api/exams - 学生应该无权限创建考试', async () => {
      const response = await request(server)
        .post('/api/exams')
        .set('Authorization', `Bearer ${studentToken}`)
        .send(TEST_DATA.exam)
        .expect(403);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
  });

  /**
   * 题目管理API测试
   */
  describe('题目管理API', () => {
    /**
     * 测试创建题目
     */
    it('POST /api/questions - 教师应该能够创建题目', async () => {
      const response = await request(server)
        .post('/api/questions')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(TEST_DATA.question)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('question');
      expect(response.body.question.title).toBe(TEST_DATA.question.title);
      
      createdQuestionId = response.body.question.id;
    });

    /**
     * 测试获取题目列表
     */
    it('GET /api/questions - 应该返回题目列表', async () => {
      const response = await request(server)
        .get('/api/questions')
        .set('Authorization', `Bearer ${teacherToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('questions');
      expect(Array.isArray(response.body.questions)).toBe(true);
    });

    /**
     * 测试按分类筛选题目
     */
    it('GET /api/questions?category=api-test - 应该按分类筛选题目', async () => {
      const response = await request(server)
        .get('/api/questions?category=api-test')
        .set('Authorization', `Bearer ${teacherToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.questions.every((q: any) => q.category === 'api-test')).toBe(true);
    });

    /**
     * 测试更新题目
     */
    it('PUT /api/questions/:id - 应该更新题目信息', async () => {
      const updateData = {
        title: '更新后的题目标题',
        content: '更新后的题目内容'
      };

      const response = await request(server)
        .put(`/api/questions/${createdQuestionId}`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.question.title).toBe(updateData.title);
      expect(response.body.question.content).toBe(updateData.content);
    });

    /**
     * 测试删除题目
     */
    it('DELETE /api/questions/:id - 应该删除题目', async () => {
      const response = await request(server)
        .delete(`/api/questions/${createdQuestionId}`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);

      // 验证题目已删除
      const getResponse = await request(server)
        .get(`/api/questions/${createdQuestionId}`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .expect(404);

      expect(getResponse.body).toHaveProperty('success', false);
    });
  });

  /**
   * 考试分配API测试
   */
  describe('考试分配API', () => {
    /**
     * 测试分配考试给用户
     */
    it('POST /api/exams/:id/assign - 应该分配考试给用户', async () => {
      const assignmentData = {
        userEmails: [TEST_USERS.student.email],
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7天后
      };

      const response = await request(server)
        .post(`/api/exams/${createdExamId}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(assignmentData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('assignments');
      expect(response.body.assignments.length).toBe(1);
    });

    /**
     * 测试获取用户的考试分配
     */
    it('GET /api/users/assignments - 学生应该能够查看自己的考试分配', async () => {
      const response = await request(server)
        .get('/api/users/assignments')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('assignments');
      expect(Array.isArray(response.body.assignments)).toBe(true);
    });

    /**
     * 测试取消考试分配
     */
    it('DELETE /api/exams/:id/assign/:userId - 应该取消考试分配', async () => {
      // 首先获取学生用户ID
      const userResponse = await supabase
        .from('users')
        .select('id')
        .eq('email', TEST_USERS.student.email)
        .single();

      const studentId = userResponse.data?.id;

      const response = await request(server)
        .delete(`/api/exams/${createdExamId}/assign/${studentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
    });
  });

  /**
   * 考试结果API测试
   */
  describe('考试结果API', () => {
    let submissionId: string;

    beforeEach(async () => {
      // 重新分配考试
      await request(server)
        .post(`/api/exams/${createdExamId}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ userEmails: [TEST_USERS.student.email] });
    });

    /**
     * 测试开始考试
     */
    it('POST /api/exams/:id/start - 学生应该能够开始考试', async () => {
      const response = await request(server)
        .post(`/api/exams/${createdExamId}/start`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('submission');
      expect(response.body.submission.status).toBe('in_progress');
      
      submissionId = response.body.submission.id;
    });

    /**
     * 测试提交答案
     */
    it('POST /api/submissions/:id/answer - 应该提交题目答案', async () => {
      const answerData = {
        questionId: createdQuestionId,
        answer: '选项A',
        timeSpent: 30
      };

      const response = await request(server)
        .post(`/api/submissions/${submissionId}/answer`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send(answerData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('answer');
    });

    /**
     * 测试提交考试
     */
    it('POST /api/submissions/:id/submit - 应该提交考试', async () => {
      const response = await request(server)
        .post(`/api/submissions/${submissionId}/submit`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.submission.status).toBe('submitted');
      expect(response.body).toHaveProperty('score');
    });

    /**
     * 测试获取考试结果
     */
    it('GET /api/submissions/:id/result - 应该获取考试结果', async () => {
      const response = await request(server)
        .get(`/api/submissions/${submissionId}/result`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('result');
      expect(response.body.result).toHaveProperty('score');
      expect(response.body.result).toHaveProperty('totalQuestions');
      expect(response.body.result).toHaveProperty('correctAnswers');
    });

    /**
     * 测试管理员查看所有结果
     */
    it('GET /api/exams/:id/results - 管理员应该能够查看考试的所有结果', async () => {
      const response = await request(server)
        .get(`/api/exams/${createdExamId}/results`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('results');
      expect(Array.isArray(response.body.results)).toBe(true);
    });
  });

  /**
   * 错误处理测试
   */
  describe('错误处理', () => {
    /**
     * 测试404错误
     */
    it('GET /api/nonexistent - 应该返回404错误', async () => {
      const response = await request(server)
        .get('/api/nonexistent')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });

    /**
     * 测试无授权访问
     */
    it('GET /api/exams - 无令牌应该返回401错误', async () => {
      const response = await request(server)
        .get('/api/exams')
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });

    /**
     * 测试权限不足
     */
    it('POST /api/exams - 学生创建考试应该返回403错误', async () => {
      const response = await request(server)
        .post('/api/exams')
        .set('Authorization', `Bearer ${studentToken}`)
        .send(TEST_DATA.exam)
        .expect(403);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });

    /**
     * 测试无效数据
     */
    it('POST /api/exams - 无效数据应该返回400错误', async () => {
      const invalidExam = {
        title: '', // 空标题
        duration: -1 // 无效时长
      };

      const response = await request(server)
        .post('/api/exams')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidExam)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
  });

  /**
   * 辅助函数：准备测试数据
   */
  async function setupTestData(): Promise<void> {
    try {
      // 创建测试用户
      for (const [key, user] of Object.entries(TEST_USERS)) {
        const { error } = await supabase.from('users').insert({
          email: user.email,
          password: user.password, // 在实际环境中应该加密
          role: user.role,
          name: user.name,
          is_active: true,
          is_verified: true
        });
        
        if (error && !error.message.includes('duplicate')) {
          console.warn(`创建用户 ${user.email} 失败:`, error.message);
        }
      }
      
      console.log('API测试数据准备完成');
    } catch (error) {
      console.error('准备API测试数据失败:', error);
      throw error;
    }
  }

  /**
   * 辅助函数：清理测试数据
   */
  async function cleanupTestData(): Promise<void> {
    try {
      // 删除测试考试
      if (createdExamId) {
        await supabase.from('exams').delete().eq('id', createdExamId);
      }
      
      // 删除测试用户
      for (const user of Object.values(TEST_USERS)) {
        await supabase.from('users').delete().eq('email', user.email);
      }
      
      console.log('API测试数据清理完成');
    } catch (error) {
      console.error('清理API测试数据失败:', error);
    }
  }

  /**
   * 辅助函数：用户认证
   */
  async function authenticateUsers(): Promise<void> {
    try {
      // 管理员登录
      const adminResponse = await request(server)
        .post('/api/auth/login')
        .send({
          email: TEST_USERS.admin.email,
          password: TEST_USERS.admin.password
        });
      adminToken = adminResponse.body.token;

      // 教师登录
      const teacherResponse = await request(server)
        .post('/api/auth/login')
        .send({
          email: TEST_USERS.teacher.email,
          password: TEST_USERS.teacher.password
        });
      teacherToken = teacherResponse.body.token;

      // 学生登录
      const studentResponse = await request(server)
        .post('/api/auth/login')
        .send({
          email: TEST_USERS.student.email,
          password: TEST_USERS.student.password
        });
      studentToken = studentResponse.body.token;
      
      console.log('用户认证完成');
    } catch (error) {
      console.error('用户认证失败:', error);
      throw error;
    }
  }
});