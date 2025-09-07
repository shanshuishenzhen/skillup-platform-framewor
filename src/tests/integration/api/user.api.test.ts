/**
 * 用户API集成测试
 * 测试用户认证和管理相关API接口的完整流程
 */

import request from 'supertest';
import { app } from '../../../api/app';
import { mockSupabaseClient } from '../../setup';

// 模拟Supabase客户端
jest.mock('../../../lib/supabase', () => ({
  supabase: mockSupabaseClient
}));

describe('用户API集成测试', () => {
  // 测试数据
  const mockUser = global.testUtils.createMockUser();
  const mockTeacher = global.testUtils.createMockUser({ role: 'teacher' });
  const mockAdmin = global.testUtils.createMockUser({ role: 'admin' });
  const authToken = 'mock-jwt-token';

  beforeEach(() => {
    global.testUtils.resetAllMocks();
  });

  /**
   * 用户认证API测试
   */
  describe('用户认证', () => {
    /**
     * 测试用户注册
     */
    describe('POST /api/auth/register', () => {
      const registerData = {
        email: 'test@example.com',
        password: 'password123',
        name: '测试用户',
        role: 'student'
      };

      it('应该能够注册新用户', async () => {
        // 模拟Supabase注册成功
        mockSupabaseClient.auth.signUp = jest.fn().mockResolvedValue({
          data: {
            user: {
              id: 'user-new',
              email: registerData.email,
              user_metadata: {
                name: registerData.name,
                role: registerData.role
              }
            },
            session: {
              access_token: 'new-token',
              refresh_token: 'refresh-token'
            }
          },
          error: null
        });

        // 模拟用户信息插入
        const mockQuery = global.testUtils.createMockQuery(
          global.testUtils.createMockUser({
            id: 'user-new',
            email: registerData.email,
            name: registerData.name,
            role: registerData.role
          }),
          null
        );
        mockSupabaseClient.from = jest.fn().mockReturnValue(mockQuery);

        const response = await request(app)
          .post('/api/auth/register')
          .send(registerData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.user.email).toBe(registerData.email);
        expect(response.body.data.user.name).toBe(registerData.name);
        expect(response.body.data.token).toBe('new-token');
      });

      it('应该验证邮箱格式', async () => {
        const invalidData = {
          ...registerData,
          email: 'invalid-email'
        };

        const response = await request(app)
          .post('/api/auth/register')
          .send(invalidData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('邮箱格式不正确');
      });

      it('应该验证密码强度', async () => {
        const weakPasswordData = {
          ...registerData,
          password: '123'
        };

        const response = await request(app)
          .post('/api/auth/register')
          .send(weakPasswordData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('密码长度至少6位');
      });

      it('应该处理邮箱已存在的情况', async () => {
        mockSupabaseClient.auth.signUp = jest.fn().mockResolvedValue({
          data: { user: null, session: null },
          error: { message: '邮箱已存在' }
        });

        const response = await request(app)
          .post('/api/auth/register')
          .send(registerData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('邮箱已存在');
      });
    });

    /**
     * 测试用户登录
     */
    describe('POST /api/auth/login', () => {
      const loginData = {
        email: 'test@example.com',
        password: 'password123'
      };

      it('应该能够登录用户', async () => {
        // 模拟Supabase登录成功
        mockSupabaseClient.auth.signInWithPassword = jest.fn().mockResolvedValue({
          data: {
            user: {
              id: mockUser.id,
              email: mockUser.email
            },
            session: {
              access_token: authToken,
              refresh_token: 'refresh-token'
            }
          },
          error: null
        });

        // 模拟获取用户详细信息
        const mockQuery = global.testUtils.createMockQuery(mockUser, null);
        mockSupabaseClient.from = jest.fn().mockReturnValue(mockQuery);

        const response = await request(app)
          .post('/api/auth/login')
          .send(loginData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.user.id).toBe(mockUser.id);
        expect(response.body.data.token).toBe(authToken);
      });

      it('应该处理错误的登录凭据', async () => {
        mockSupabaseClient.auth.signInWithPassword = jest.fn().mockResolvedValue({
          data: { user: null, session: null },
          error: { message: '邮箱或密码错误' }
        });

        const response = await request(app)
          .post('/api/auth/login')
          .send(loginData)
          .expect(401);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('邮箱或密码错误');
      });

      it('应该验证必填字段', async () => {
        const incompleteData = {
          email: 'test@example.com'
          // 缺少password
        };

        const response = await request(app)
          .post('/api/auth/login')
          .send(incompleteData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('密码不能为空');
      });
    });

    /**
     * 测试用户登出
     */
    describe('POST /api/auth/logout', () => {
      it('应该能够登出用户', async () => {
        mockSupabaseClient.auth.signOut = jest.fn().mockResolvedValue({
          error: null
        });

        const response = await request(app)
          .post('/api/auth/logout')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toContain('登出成功');
      });

      it('应该处理登出错误', async () => {
        mockSupabaseClient.auth.signOut = jest.fn().mockResolvedValue({
          error: { message: '登出失败' }
        });

        const response = await request(app)
          .post('/api/auth/logout')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(500);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('登出失败');
      });
    });

    /**
     * 测试获取当前用户信息
     */
    describe('GET /api/auth/me', () => {
      it('应该能够获取当前用户信息', async () => {
        // 模拟认证中间件
        mockSupabaseClient.auth.getUser = jest.fn().mockResolvedValue({
          data: { user: mockUser },
          error: null
        });

        const mockQuery = global.testUtils.createMockQuery(mockUser, null);
        mockSupabaseClient.from = jest.fn().mockReturnValue(mockQuery);

        const response = await request(app)
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.id).toBe(mockUser.id);
        expect(response.body.data.email).toBe(mockUser.email);
      });

      it('应该拒绝未授权的访问', async () => {
        const response = await request(app)
          .get('/api/auth/me')
          .expect(401);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('未授权');
      });
    });
  });

  /**
   * 用户管理API测试
   */
  describe('用户管理', () => {
    beforeEach(() => {
      // 模拟管理员认证
      mockSupabaseClient.auth.getUser = jest.fn().mockResolvedValue({
        data: { user: mockAdmin },
        error: null
      });
    });

    /**
     * 测试获取用户列表
     */
    describe('GET /api/users', () => {
      it('应该能够获取用户列表', async () => {
        const mockUsers = [mockUser, mockTeacher];
        const mockQuery = global.testUtils.createMockQuery(
          { users: mockUsers, total: 2, totalPages: 1 },
          null
        );
        mockSupabaseClient.from = jest.fn().mockReturnValue(mockQuery);

        const response = await request(app)
          .get('/api/users')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.users).toHaveLength(2);
        expect(response.body.data.total).toBe(2);
      });

      it('应该支持角色过滤', async () => {
        const mockQuery = global.testUtils.createMockQuery(
          { users: [mockTeacher], total: 1, totalPages: 1 },
          null
        );
        mockSupabaseClient.from = jest.fn().mockReturnValue(mockQuery);

        const response = await request(app)
          .get('/api/users?role=teacher')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(mockQuery.eq).toHaveBeenCalledWith('role', 'teacher');
      });

      it('应该验证管理员权限', async () => {
        // 模拟普通用户
        mockSupabaseClient.auth.getUser = jest.fn().mockResolvedValue({
          data: { user: mockUser },
          error: null
        });

        const response = await request(app)
          .get('/api/users')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(403);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('权限不足');
      });
    });

    /**
     * 测试获取用户详情
     */
    describe('GET /api/users/:id', () => {
      it('应该能够获取用户详情', async () => {
        const mockQuery = global.testUtils.createMockQuery(mockUser, null);
        mockSupabaseClient.from = jest.fn().mockReturnValue(mockQuery);

        const response = await request(app)
          .get(`/api/users/${mockUser.id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.id).toBe(mockUser.id);
      });

      it('当用户不存在时应该返回404', async () => {
        const mockQuery = global.testUtils.createMockQuery(null, null);
        mockSupabaseClient.from = jest.fn().mockReturnValue(mockQuery);

        const response = await request(app)
          .get('/api/users/nonexistent')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('用户不存在');
      });
    });

    /**
     * 测试更新用户信息
     */
    describe('PUT /api/users/:id', () => {
      const updateData = {
        name: '更新后的姓名',
        role: 'teacher'
      };

      it('应该能够更新用户信息', async () => {
        const updatedUser = global.testUtils.createMockUser({
          ...mockUser,
          ...updateData
        });

        const mockQuery = global.testUtils.createMockQuery(updatedUser, null);
        mockSupabaseClient.from = jest.fn().mockReturnValue(mockQuery);

        const response = await request(app)
          .put(`/api/users/${mockUser.id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(updateData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.name).toBe(updateData.name);
        expect(response.body.data.role).toBe(updateData.role);
      });

      it('应该验证角色值的有效性', async () => {
        const invalidData = {
          ...updateData,
          role: 'invalid_role'
        };

        const response = await request(app)
          .put(`/api/users/${mockUser.id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(invalidData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('无效的角色');
      });
    });

    /**
     * 测试删除用户
     */
    describe('DELETE /api/users/:id', () => {
      it('应该能够删除用户', async () => {
        const mockQuery = {
          delete: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({
            data: null,
            error: null
          })
        };
        mockSupabaseClient.from = jest.fn().mockReturnValue(mockQuery);

        const response = await request(app)
          .delete(`/api/users/${mockUser.id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(mockQuery.delete).toHaveBeenCalled();
      });

      it('应该防止删除自己', async () => {
        const response = await request(app)
          .delete(`/api/users/${mockAdmin.id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('不能删除自己');
      });
    });
  });

  /**
   * 密码管理API测试
   */
  describe('密码管理', () => {
    /**
     * 测试修改密码
     */
    describe('PUT /api/auth/password', () => {
      const passwordData = {
        currentPassword: 'oldpassword',
        newPassword: 'newpassword123'
      };

      beforeEach(() => {
        mockSupabaseClient.auth.getUser = jest.fn().mockResolvedValue({
          data: { user: mockUser },
          error: null
        });
      });

      it('应该能够修改密码', async () => {
        mockSupabaseClient.auth.updateUser = jest.fn().mockResolvedValue({
          data: { user: mockUser },
          error: null
        });

        const response = await request(app)
          .put('/api/auth/password')
          .set('Authorization', `Bearer ${authToken}`)
          .send(passwordData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toContain('密码修改成功');
      });

      it('应该验证新密码强度', async () => {
        const weakPasswordData = {
          ...passwordData,
          newPassword: '123'
        };

        const response = await request(app)
          .put('/api/auth/password')
          .set('Authorization', `Bearer ${authToken}`)
          .send(weakPasswordData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('密码长度至少6位');
      });
    });

    /**
     * 测试重置密码
     */
    describe('POST /api/auth/reset-password', () => {
      it('应该能够发送重置密码邮件', async () => {
        mockSupabaseClient.auth.resetPasswordForEmail = jest.fn().mockResolvedValue({
          data: {},
          error: null
        });

        const response = await request(app)
          .post('/api/auth/reset-password')
          .send({ email: 'test@example.com' })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toContain('重置密码邮件已发送');
      });

      it('应该验证邮箱格式', async () => {
        const response = await request(app)
          .post('/api/auth/reset-password')
          .send({ email: 'invalid-email' })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('邮箱格式不正确');
      });
    });
  });

  /**
   * 错误处理和边界情况测试
   */
  describe('错误处理和边界情况', () => {
    /**
     * 测试网络错误
     */
    it('应该正确处理网络错误', async () => {
      mockSupabaseClient.auth.signInWithPassword = jest.fn().mockRejectedValue(
        new Error('网络连接失败')
      );

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        })
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('网络连接失败');
    });

    /**
     * 测试令牌过期
     */
    it('应该正确处理令牌过期', async () => {
      mockSupabaseClient.auth.getUser = jest.fn().mockResolvedValue({
        data: { user: null },
        error: { message: '令牌已过期' }
      });

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer expired-token`)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('令牌已过期');
    });

    /**
     * 测试并发登录
     */
    it('应该能够处理并发登录请求', async () => {
      mockSupabaseClient.auth.signInWithPassword = jest.fn().mockResolvedValue({
        data: {
          user: mockUser,
          session: { access_token: authToken }
        },
        error: null
      });

      const mockQuery = global.testUtils.createMockQuery(mockUser, null);
      mockSupabaseClient.from = jest.fn().mockReturnValue(mockQuery);

      const loginData = {
        email: 'test@example.com',
        password: 'password123'
      };

      const requests = Array(5).fill(null).map(() => 
        request(app)
          .post('/api/auth/login')
          .send(loginData)
      );

      const responses = await Promise.all(requests);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    }, 10000);