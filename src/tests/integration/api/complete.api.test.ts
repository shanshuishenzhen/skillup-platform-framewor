/**
 * 完整API集成测试
 * 直接测试Next.js API路由，验证完整的请求-响应流程
 * 
 * @author SOLO Coding
 * @version 1.0.0
 */

import { createMocks } from 'node-mocks-http';
import { NextApiRequest, NextApiResponse } from 'next';
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { supabase } from '../../../lib/supabase';

// 导入API路由处理器
import authLoginHandler from '../../../app/api/auth/login/route';
import authRegisterHandler from '../../../app/api/auth/register/route';
import examsHandler from '../../../app/api/exams/route';
import questionsHandler from '../../../app/api/questions/route';

/**
 * 测试配置
 */
const TEST_CONFIG = {
  timeout: 10000,
  cleanup: true
};

/**
 * 测试用户数据
 */
const TEST_USERS = {
  admin: {
    email: 'api-test-admin@test.com',
    password: 'AdminTest123!',
    name: 'API测试管理员',
    role: 'admin'
  },
  teacher: {
    email: 'api-test-teacher@test.com',
    password: 'TeacherTest123!',
    name: 'API测试教师',
    role: 'teacher'
  },
  student: {
    email: 'api-test-student@test.com',
    password: 'StudentTest123!',
    name: 'API测试学生',
    role: 'student'
  }
};

/**
 * 测试数据
 */
const TEST_DATA = {
  exam: {
    title: 'API集成测试考试',
    description: '这是一个API集成测试用的考试',
    difficulty: 'medium',
    duration: 60,
    total_questions: 10,
    passing_score: 70,
    status: 'draft'
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
 * 辅助函数：创建模拟请求和响应
 */
function createMockRequest(method: string, url: string, body?: any, headers?: any) {
  const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
    method,
    url,
    body,
    headers: {
      'content-type': 'application/json',
      ...headers
    }
  });
  return { req, res };
}

/**
 * 辅助函数：执行API请求
 */
async function executeApiRequest(handler: any, req: NextApiRequest, res: NextApiResponse) {
  try {
    await handler(req, res);
    return {
      status: res.statusCode,
      body: res._getData() ? JSON.parse(res._getData()) : null,
      headers: res.getHeaders()
    };
  } catch (error) {
    return {
      status: 500,
      body: { success: false, error: error.message },
      headers: {}
    };
  }
}

/**
 * 完整API集成测试套件
 */
describe('完整API集成测试', () => {
  let testUserIds: string[] = [];
  let testExamIds: string[] = [];
  let testQuestionIds: string[] = [];
  let authTokens: { [key: string]: string } = {};

  /**
   * 测试前准备
 */
  beforeEach(async () => {
    // 清理之前的测试数据
    await cleanupTestData();
    
    // 创建测试用户
    await createTestUsers();
  }, TEST_CONFIG.timeout);

  /**
   * 测试后清理
   */
  afterEach(async () => {
    if (TEST_CONFIG.cleanup) {
      await cleanupTestData();
    }
  }, TEST_CONFIG.timeout);

  /**
   * 用户认证API测试
   */
  describe('用户认证API', () => {
    /**
     * 测试用户注册
     */
    it('POST /api/auth/register - 应该成功注册新用户', async () => {
      const newUser = {
        email: 'new-api-user@test.com',
        password: 'NewUser123!',
        name: '新API用户',
        role: 'student'
      };

      const { req, res } = createMockRequest('POST', '/api/auth/register', newUser);
      const response = await executeApiRequest(authRegisterHandler, req, res);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(newUser.email);
      expect(response.body.data.user.role).toBe(newUser.role);
      expect(response.body.data.token).toBeDefined();

      // 记录用户ID以便清理
      if (response.body.data.user.id) {
        testUserIds.push(response.body.data.user.id);
      }
    });

    /**
     * 测试用户登录
     */
    it('POST /api/auth/login - 应该成功登录用户', async () => {
      const loginData = {
        email: TEST_USERS.student.email,
        password: TEST_USERS.student.password
      };

      const { req, res } = createMockRequest('POST', '/api/auth/login', loginData);
      const response = await executeApiRequest(authLoginHandler, req, res);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(loginData.email);
      expect(response.body.data.token).toBeDefined();

      // 保存令牌用于后续测试
      authTokens.student = response.body.data.token;
    });

    /**
     * 测试无效登录
     */
    it('POST /api/auth/login - 应该拒绝无效凭据', async () => {
      const invalidLogin = {
        email: TEST_USERS.student.email,
        password: 'wrongpassword'
      };

      const { req, res } = createMockRequest('POST', '/api/auth/login', invalidLogin);
      const response = await executeApiRequest(authLoginHandler, req, res);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    /**
     * 测试注册数据验证
     */
    it('POST /api/auth/register - 应该验证注册数据', async () => {
      const invalidUser = {
        email: 'invalid-email',
        password: '123', // 密码太短
        name: '',
        role: 'invalid-role'
      };

      const { req, res } = createMockRequest('POST', '/api/auth/register', invalidUser);
      const response = await executeApiRequest(authRegisterHandler, req, res);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });

  /**
   * 考试管理API测试
   */
  describe('考试管理API', () => {
    beforeEach(async () => {
      // 获取管理员令牌
      const loginData = {
        email: TEST_USERS.admin.email,
        password: TEST_USERS.admin.password
      };
      const { req, res } = createMockRequest('POST', '/api/auth/login', loginData);
      const response = await executeApiRequest(authLoginHandler, req, res);
      authTokens.admin = response.body.data.token;
    });

    /**
     * 测试创建考试
     */
    it('POST /api/exams - 管理员应该能够创建考试', async () => {
      const { req, res } = createMockRequest(
        'POST',
        '/api/exams',
        TEST_DATA.exam,
        { authorization: `Bearer ${authTokens.admin}` }
      );
      const response = await executeApiRequest(examsHandler, req, res);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(TEST_DATA.exam.title);
      expect(response.body.data.id).toBeDefined();

      // 记录考试ID以便清理
      if (response.body.data.id) {
        testExamIds.push(response.body.data.id);
      }
    });

    /**
     * 测试获取考试列表
     */
    it('GET /api/exams - 应该返回考试列表', async () => {
      const { req, res } = createMockRequest(
        'GET',
        '/api/exams',
        null,
        { authorization: `Bearer ${authTokens.admin}` }
      );
      const response = await executeApiRequest(examsHandler, req, res);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.exams).toBeDefined();
      expect(Array.isArray(response.body.data.exams)).toBe(true);
    });

    /**
     * 测试学生无权限创建考试
     */
    it('POST /api/exams - 学生应该无权限创建考试', async () => {
      const { req, res } = createMockRequest(
        'POST',
        '/api/exams',
        TEST_DATA.exam,
        { authorization: `Bearer ${authTokens.student}` }
      );
      const response = await executeApiRequest(examsHandler, req, res);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('权限');
    });

    /**
     * 测试无授权访问
     */
    it('GET /api/exams - 无令牌应该返回401错误', async () => {
      const { req, res } = createMockRequest('GET', '/api/exams');
      const response = await executeApiRequest(examsHandler, req, res);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('授权');
    });
  });

  /**
   * 题目管理API测试
   */
  describe('题目管理API', () => {
    beforeEach(async () => {
      // 获取教师令牌
      const loginData = {
        email: TEST_USERS.teacher.email,
        password: TEST_USERS.teacher.password
      };
      const { req, res } = createMockRequest('POST', '/api/auth/login', loginData);
      const response = await executeApiRequest(authLoginHandler, req, res);
      authTokens.teacher = response.body.data.token;
    });

    /**
     * 测试创建题目
     */
    it('POST /api/questions - 教师应该能够创建题目', async () => {
      const { req, res } = createMockRequest(
        'POST',
        '/api/questions',
        TEST_DATA.question,
        { authorization: `Bearer ${authTokens.teacher}` }
      );
      const response = await executeApiRequest(questionsHandler, req, res);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(TEST_DATA.question.title);
      expect(response.body.data.id).toBeDefined();

      // 记录题目ID以便清理
      if (response.body.data.id) {
        testQuestionIds.push(response.body.data.id);
      }
    });

    /**
     * 测试获取题目列表
     */
    it('GET /api/questions - 应该返回题目列表', async () => {
      const { req, res } = createMockRequest(
        'GET',
        '/api/questions',
        null,
        { authorization: `Bearer ${authTokens.teacher}` }
      );
      const response = await executeApiRequest(questionsHandler, req, res);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.questions).toBeDefined();
      expect(Array.isArray(response.body.data.questions)).toBe(true);
    });

    /**
     * 测试题目数据验证
     */
    it('POST /api/questions - 应该验证题目数据', async () => {
      const invalidQuestion = {
        title: '', // 空标题
        type: 'invalid-type',
        content: '',
        options: [], // 空选项
        correct_answer: '',
        difficulty: 'invalid-difficulty'
      };

      const { req, res } = createMockRequest(
        'POST',
        '/api/questions',
        invalidQuestion,
        { authorization: `Bearer ${authTokens.teacher}` }
      );
      const response = await executeApiRequest(questionsHandler, req, res);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });

  /**
   * 错误处理测试
   */
  describe('错误处理', () => {
    /**
     * 测试方法不支持
     */
    it('应该处理不支持的HTTP方法', async () => {
      const { req, res } = createMockRequest(
        'DELETE',
        '/api/exams',
        null,
        { authorization: `Bearer ${authTokens.admin}` }
      );
      const response = await executeApiRequest(examsHandler, req, res);

      expect(response.status).toBe(405);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('方法不支持');
    });

    /**
     * 测试无效JSON数据
     */
    it('应该处理无效的JSON数据', async () => {
      const { req, res } = createMockRequest(
        'POST',
        '/api/exams',
        'invalid-json',
        { 
          authorization: `Bearer ${authTokens.admin}`,
          'content-type': 'application/json'
        }
      );
      const response = await executeApiRequest(examsHandler, req, res);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });

  /**
   * 辅助函数：创建测试用户
   */
  async function createTestUsers(): Promise<void> {
    try {
      for (const [key, user] of Object.entries(TEST_USERS)) {
        // 检查用户是否已存在
        const { data: existingUser } = await supabase
          .from('users')
          .select('id')
          .eq('email', user.email)
          .single();

        if (!existingUser) {
          // 创建新用户
          const { data: newUser, error } = await supabase
            .from('users')
            .insert({
              email: user.email,
              password: user.password, // 在实际环境中应该加密
              name: user.name,
              role: user.role,
              is_active: true,
              is_verified: true
            })
            .select()
            .single();

          if (error) {
            console.warn(`创建测试用户 ${user.email} 失败:`, error.message);
          } else if (newUser) {
            testUserIds.push(newUser.id);
          }
        }
      }
    } catch (error) {
      console.error('创建测试用户失败:', error);
    }
  }

  /**
   * 辅助函数：清理测试数据
   */
  async function cleanupTestData(): Promise<void> {
    try {
      // 清理测试题目
      if (testQuestionIds.length > 0) {
        await supabase
          .from('questions')
          .delete()
          .in('id', testQuestionIds);
        testQuestionIds = [];
      }

      // 清理测试考试
      if (testExamIds.length > 0) {
        await supabase
          .from('exams')
          .delete()
          .in('id', testExamIds);
        testExamIds = [];
      }

      // 清理测试用户
      const userEmails = Object.values(TEST_USERS).map(user => user.email);
      await supabase
        .from('users')
        .delete()
        .in('email', userEmails);
      
      if (testUserIds.length > 0) {
        await supabase
          .from('users')
          .delete()
          .in('id', testUserIds);
        testUserIds = [];
      }

      // 清理令牌
      authTokens = {};
    } catch (error) {
      console.error('清理测试数据失败:', error);
    }
  }
});