/**
 * 考试API集成测试
 * 测试考试相关API接口的完整流程
 */

import request from 'supertest';
import { app } from '../../../api/app';
import { mockSupabaseClient } from '../../setup';

// 模拟Supabase客户端
jest.mock('../../../lib/supabase', () => ({
  supabase: mockSupabaseClient
}));

describe('考试API集成测试', () => {
  // 测试数据
  const mockExam = global.testUtils.createMockExam();
  const mockUser = global.testUtils.createMockUser({ role: 'teacher' });
  const authToken = 'mock-jwt-token';

  beforeEach(() => {
    global.testUtils.resetAllMocks();
    
    // 模拟认证中间件
    mockSupabaseClient.auth.getUser = jest.fn().mockResolvedValue({
      data: { user: mockUser },
      error: null
    });
  });

  /**
   * 考试查询API测试
   */
  describe('GET /api/exams', () => {
    /**
     * 测试获取考试列表
     */
    it('应该能够获取考试列表', async () => {
      const mockExams = [mockExam];
      const mockQuery = global.testUtils.createMockQuery(
        { exams: mockExams, total: 1, totalPages: 1 },
        null
      );
      mockSupabaseClient.from = jest.fn().mockReturnValue(mockQuery);

      const response = await request(app)
        .get('/api/exams')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.exams).toEqual(mockExams);
      expect(response.body.data.total).toBe(1);
    });

    /**
     * 测试分页查询
     */
    it('应该支持分页查询', async () => {
      const mockQuery = global.testUtils.createMockQuery(
        { exams: [mockExam], total: 10, totalPages: 2 },
        null
      );
      mockSupabaseClient.from = jest.fn().mockReturnValue(mockQuery);

      const response = await request(app)
        .get('/api/exams?page=2&limit=5')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.totalPages).toBe(2);
      expect(mockQuery.range).toHaveBeenCalledWith(5, 9); // (page-1)*limit, page*limit-1
    });

    /**
     * 测试搜索功能
     */
    it('应该支持关键词搜索', async () => {
      const mockQuery = global.testUtils.createMockQuery(
        { exams: [mockExam], total: 1, totalPages: 1 },
        null
      );
      mockSupabaseClient.from = jest.fn().mockReturnValue(mockQuery);

      const response = await request(app)
        .get('/api/exams?search=测试')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockQuery.ilike).toHaveBeenCalledWith('title', '%测试%');
    });

    /**
     * 测试状态过滤
     */
    it('应该支持状态过滤', async () => {
      const mockQuery = global.testUtils.createMockQuery(
        { exams: [mockExam], total: 1, totalPages: 1 },
        null
      );
      mockSupabaseClient.from = jest.fn().mockReturnValue(mockQuery);

      const response = await request(app)
        .get('/api/exams?status=published')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockQuery.eq).toHaveBeenCalledWith('status', 'published');
    });

    /**
     * 测试未授权访问
     */
    it('应该拒绝未授权的访问', async () => {
      const response = await request(app)
        .get('/api/exams')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('未授权');
    });
  });

  /**
   * 考试详情API测试
   */
  describe('GET /api/exams/:id', () => {
    /**
     * 测试获取考试详情
     */
    it('应该能够获取考试详情', async () => {
      const mockQuery = global.testUtils.createMockQuery(mockExam, null);
      mockSupabaseClient.from = jest.fn().mockReturnValue(mockQuery);

      const response = await request(app)
        .get(`/api/exams/${mockExam.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockExam);
      expect(mockQuery.eq).toHaveBeenCalledWith('id', mockExam.id);
    });

    /**
     * 测试考试不存在
     */
    it('当考试不存在时应该返回404', async () => {
      const mockQuery = global.testUtils.createMockQuery(null, null);
      mockSupabaseClient.from = jest.fn().mockReturnValue(mockQuery);

      const response = await request(app)
        .get('/api/exams/nonexistent')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('考试不存在');
    });
  });

  /**
   * 考试创建API测试
   */
  describe('POST /api/exams', () => {
    const newExamData = {
      title: '新考试',
      description: '这是一个新考试',
      duration: 90,
      total_score: 100
    };

    /**
     * 测试创建考试
     */
    it('应该能够创建新考试', async () => {
      const createdExam = global.testUtils.createMockExam({
        id: 'exam-new',
        ...newExamData,
        created_by: mockUser.id
      });

      const mockQuery = global.testUtils.createMockQuery(createdExam, null);
      mockSupabaseClient.from = jest.fn().mockReturnValue(mockQuery);

      const response = await request(app)
        .post('/api/exams')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newExamData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(newExamData.title);
      expect(response.body.data.created_by).toBe(mockUser.id);
    });

    /**
     * 测试数据验证
     */
    it('应该验证必填字段', async () => {
      const invalidData = {
        title: '', // 空标题
        description: '描述',
        duration: 60
      };

      const response = await request(app)
        .post('/api/exams')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('标题不能为空');
    });

    /**
     * 测试权限验证
     */
    it('应该验证用户权限', async () => {
      // 模拟学生用户
      const studentUser = global.testUtils.createMockUser({ role: 'student' });
      mockSupabaseClient.auth.getUser = jest.fn().mockResolvedValue({
        data: { user: studentUser },
        error: null
      });

      const response = await request(app)
        .post('/api/exams')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newExamData)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('权限不足');
    });
  });

  /**
   * 考试更新API测试
   */
  describe('PUT /api/exams/:id', () => {
    const updateData = {
      title: '更新后的考试标题',
      description: '更新后的描述'
    };

    /**
     * 测试更新考试
     */
    it('应该能够更新考试信息', async () => {
      const updatedExam = global.testUtils.createMockExam({
        ...mockExam,
        ...updateData
      });

      const mockQuery = global.testUtils.createMockQuery(updatedExam, null);
      mockSupabaseClient.from = jest.fn().mockReturnValue(mockQuery);

      const response = await request(app)
        .put(`/api/exams/${mockExam.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(updateData.title);
      expect(mockQuery.update).toHaveBeenCalledWith(expect.objectContaining(updateData));
    });

    /**
     * 测试更新不存在的考试
     */
    it('当考试不存在时应该返回404', async () => {
      const mockQuery = global.testUtils.createMockQuery(
        null,
        { message: '考试不存在' }
      );
      mockSupabaseClient.from = jest.fn().mockReturnValue(mockQuery);

      const response = await request(app)
        .put('/api/exams/nonexistent')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  /**
   * 考试删除API测试
   */
  describe('DELETE /api/exams/:id', () => {
    /**
     * 测试删除考试
     */
    it('应该能够删除考试', async () => {
      const mockQuery = {
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: null,
          error: null
        })
      };
      mockSupabaseClient.from = jest.fn().mockReturnValue(mockQuery);

      const response = await request(app)
        .delete(`/api/exams/${mockExam.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockQuery.delete).toHaveBeenCalled();
      expect(mockQuery.eq).toHaveBeenCalledWith('id', mockExam.id);
    });

    /**
     * 测试删除不存在的考试
     */
    it('当考试不存在时应该返回404', async () => {
      const mockQuery = {
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: null,
          error: { message: '考试不存在' }
        })
      };
      mockSupabaseClient.from = jest.fn().mockReturnValue(mockQuery);

      const response = await request(app)
        .delete('/api/exams/nonexistent')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  /**
   * 考试状态管理API测试
   */
  describe('考试状态管理API', () => {
    /**
     * 测试发布考试
     */
    it('POST /api/exams/:id/publish - 应该能够发布考试', async () => {
      const publishedExam = global.testUtils.createMockExam({
        ...mockExam,
        status: 'published'
      });

      const mockQuery = global.testUtils.createMockQuery(publishedExam, null);
      mockSupabaseClient.from = jest.fn().mockReturnValue(mockQuery);

      const response = await request(app)
        .post(`/api/exams/${mockExam.id}/publish`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('published');
    });

    /**
     * 测试归档考试
     */
    it('POST /api/exams/:id/archive - 应该能够归档考试', async () => {
      const archivedExam = global.testUtils.createMockExam({
        ...mockExam,
        status: 'archived'
      });

      const mockQuery = global.testUtils.createMockQuery(archivedExam, null);
      mockSupabaseClient.from = jest.fn().mockReturnValue(mockQuery);

      const response = await request(app)
        .post(`/api/exams/${mockExam.id}/archive`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('archived');
    });
  });

  /**
   * 错误处理测试
   */
  describe('错误处理', () => {
    /**
     * 测试数据库错误
     */
    it('应该正确处理数据库错误', async () => {
      const mockQuery = global.testUtils.createMockQuery(
        null,
        { message: '数据库连接失败' }
      );
      mockSupabaseClient.from = jest.fn().mockReturnValue(mockQuery);

      const response = await request(app)
        .get('/api/exams')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('数据库连接失败');
    });

    /**
     * 测试无效的JSON数据
     */
    it('应该正确处理无效的JSON数据', async () => {
      const response = await request(app)
        .post('/api/exams')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('无效的JSON数据');
    });

    /**
     * 测试请求超时
     */
    it('应该正确处理请求超时', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockImplementation(() => {
          return new Promise((_, reject) => {
            setTimeout(() => reject(new Error('请求超时')), 100);
          });
        })
      };
      mockSupabaseClient.from = jest.fn().mockReturnValue(mockQuery);

      const response = await request(app)
        .get('/api/exams')
        .set('Authorization', `Bearer ${authToken}`)
        .timeout(50)
        .expect(500);

      expect(response.body.success).toBe(false);
    }, 10000);
  });

  /**
   * 性能测试
   */
  describe('性能测试', () => {
    /**
     * 测试并发请求
     */
    it('应该能够处理并发请求', async () => {
      const mockQuery = global.testUtils.createMockQuery(
        { exams: [mockExam], total: 1, totalPages: 1 },
        null
      );
      mockSupabaseClient.from = jest.fn().mockReturnValue(mockQuery);

      const requests = Array(10).fill(null).map(() => 
        request(app)
          .get('/api/exams')
          .set('Authorization', `Bearer ${authToken}`)
      );

      const responses = await Promise.all(requests);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    }, 15000);

    /**
     * 测试大数据量查询
     */
    it('应该能够处理大数据量查询', async () => {
      const largeExamList = Array(100).fill(null).map((_, index) => 
        global.testUtils.createMockExam({ id: `exam-${index}` })
      );

      const mockQuery = global.testUtils.createMockQuery(
        { exams: largeExamList, total: 100, totalPages: 10 },
        null
      );
      mockSupabaseClient.from = jest.fn().mockReturnValue(mockQuery);

      const startTime = Date.now();
      const response = await request(app)
        .get('/api/exams?limit=100')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      const endTime = Date.now();

      expect(response.body.data.exams).toHaveLength(100);
      expect(endTime - startTime).toBeLessThan(5000); // 应该在5秒内完成
    }, 10000);
  });
});