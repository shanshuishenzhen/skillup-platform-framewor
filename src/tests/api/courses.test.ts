/**
 * 课程API路由集成测试
 * 测试课程的CRUD操作、权限控制、数据验证等功能
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { NextRequest, NextResponse } from 'next/server';
import { GET, POST, PUT, DELETE } from '@/app/api/courses/route';
import { GET as GetCourseById, PUT as UpdateCourse, DELETE as DeleteCourse } from '@/app/api/courses/[id]/route';
import { testUtils } from '../setup';

// 模拟依赖
const mockSupabase = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn(),
        order: jest.fn(() => ({
          limit: jest.fn(() => ({
            range: jest.fn()
          }))
        }))
      })),
      order: jest.fn(() => ({
        limit: jest.fn(() => ({
          range: jest.fn()
        }))
      })),
      limit: jest.fn(() => ({
        range: jest.fn()
      })),
      range: jest.fn()
    })),
    insert: jest.fn(() => ({
      select: jest.fn(() => ({
        single: jest.fn()
      }))
    })),
    update: jest.fn(() => ({
      eq: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn()
        }))
      }))
    })),
    delete: jest.fn(() => ({
      eq: jest.fn()
    }))
  }))
};

const mockSecurity = {
  validateApiKey: jest.fn(),
  checkRateLimit: jest.fn(),
  validatePermissions: jest.fn()
};

const mockApiMonitor = {
  startCall: jest.fn(() => 'call-id-123'),
  endCall: jest.fn(),
  recordError: jest.fn()
};

const mockAIService = {
  generateCourse: jest.fn(),
  optimizeContent: jest.fn()
};

jest.mock('@/utils/supabase', () => ({
  createClient: () => mockSupabase
}));

jest.mock('@/middleware/security', () => ({
  security: mockSecurity
}));

jest.mock('@/utils/apiMonitor', () => ({
  apiMonitor: mockApiMonitor
}));

jest.mock('@/services/aiService', () => ({
  aiService: mockAIService
}));

describe('课程API路由', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // 设置默认的成功响应
    mockSecurity.validateApiKey.mockResolvedValue({ valid: true, keyId: 'test-key' });
    mockSecurity.checkRateLimit.mockResolvedValue({ allowed: true });
    mockSecurity.validatePermissions.mockResolvedValue({ allowed: true });
  });

  describe('GET /api/courses', () => {
    it('应该成功获取课程列表', async () => {
      const mockCourses = [
        {
          id: 'course-1',
          title: 'JavaScript基础',
          description: 'JavaScript编程入门课程',
          difficulty: 'beginner',
          duration: 120,
          price: 99.99,
          instructor_id: 'instructor-1',
          category: 'programming',
          status: 'published',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        },
        {
          id: 'course-2',
          title: 'React进阶',
          description: 'React高级开发技巧',
          difficulty: 'advanced',
          duration: 180,
          price: 199.99,
          instructor_id: 'instructor-2',
          category: 'programming',
          status: 'published',
          created_at: '2024-01-02T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z'
        }
      ];
      
      const mockSupabaseResponse = {
        data: mockCourses,
        error: null,
        count: 2
      };
      
      mockSupabase.from().select().order().limit().range.mockResolvedValue(mockSupabaseResponse);
      
      const request = testUtils.createMockRequest('GET', '/api/courses');
      const response = await GET(request);
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.courses).toHaveLength(2);
      expect(data.data.courses[0].title).toBe('JavaScript基础');
      expect(data.data.pagination.total).toBe(2);
      expect(mockApiMonitor.startCall).toHaveBeenCalledWith('GET', '/api/courses');
      expect(mockApiMonitor.endCall).toHaveBeenCalledWith('call-id-123', 200);
    });

    it('应该支持分页查询', async () => {
      const mockCourses = Array.from({ length: 5 }, (_, i) => ({
        id: `course-${i + 1}`,
        title: `课程 ${i + 1}`,
        description: `课程描述 ${i + 1}`,
        difficulty: 'beginner',
        duration: 120,
        price: 99.99
      }));
      
      const mockSupabaseResponse = {
        data: mockCourses,
        error: null,
        count: 25
      };
      
      mockSupabase.from().select().order().limit().range.mockResolvedValue(mockSupabaseResponse);
      
      const request = testUtils.createMockRequest('GET', '/api/courses?page=2&limit=5');
      const response = await GET(request);
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(200);
      expect(data.data.courses).toHaveLength(5);
      expect(data.data.pagination.page).toBe(2);
      expect(data.data.pagination.limit).toBe(5);
      expect(data.data.pagination.total).toBe(25);
      expect(data.data.pagination.totalPages).toBe(5);
      expect(mockSupabase.from().select().order().limit().range).toHaveBeenCalledWith(5, 9);
    });

    it('应该支持课程筛选', async () => {
      const mockFilteredCourses = [
        {
          id: 'course-1',
          title: 'JavaScript基础',
          category: 'programming',
          difficulty: 'beginner',
          price: 99.99
        }
      ];
      
      const mockSupabaseResponse = {
        data: mockFilteredCourses,
        error: null,
        count: 1
      };
      
      mockSupabase.from().select().eq().order().limit().range.mockResolvedValue(mockSupabaseResponse);
      
      const request = testUtils.createMockRequest('GET', '/api/courses?category=programming&difficulty=beginner&maxPrice=100');
      const response = await GET(request);
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(200);
      expect(data.data.courses).toHaveLength(1);
      expect(data.data.courses[0].category).toBe('programming');
      expect(data.data.courses[0].difficulty).toBe('beginner');
    });

    it('应该支持课程搜索', async () => {
      const mockSearchResults = [
        {
          id: 'course-1',
          title: 'JavaScript基础教程',
          description: '从零开始学习JavaScript编程',
          category: 'programming'
        }
      ];
      
      const mockSupabaseResponse = {
        data: mockSearchResults,
        error: null,
        count: 1
      };
      
      mockSupabase.from().select().order().limit().range.mockResolvedValue(mockSupabaseResponse);
      
      const request = testUtils.createMockRequest('GET', '/api/courses?search=JavaScript');
      const response = await GET(request);
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(200);
      expect(data.data.courses).toHaveLength(1);
      expect(data.data.courses[0].title).toContain('JavaScript');
    });

    it('应该处理数据库错误', async () => {
      const mockError = new Error('Database connection failed');
      mockSupabase.from().select().order().limit().range.mockResolvedValue({
        data: null,
        error: mockError
      });
      
      const request = testUtils.createMockRequest('GET', '/api/courses');
      const response = await GET(request);
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to fetch courses');
      expect(mockApiMonitor.recordError).toHaveBeenCalledWith('call-id-123', mockError);
    });

    it('应该验证API密钥', async () => {
      mockSecurity.validateApiKey.mockResolvedValue({ valid: false, error: 'Invalid API key' });
      
      const request = testUtils.createMockRequest('GET', '/api/courses');
      const response = await GET(request);
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid API key');
    });

    it('应该检查速率限制', async () => {
      mockSecurity.checkRateLimit.mockResolvedValue({ 
        allowed: false, 
        error: 'Rate limit exceeded',
        resetTime: Date.now() + 60000
      });
      
      const request = testUtils.createMockRequest('GET', '/api/courses');
      const response = await GET(request);
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(429);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Rate limit exceeded');
    });
  });

  describe('POST /api/courses', () => {
    it('应该成功创建课程', async () => {
      const newCourse = {
        title: '新课程',
        description: '新课程描述',
        difficulty: 'intermediate',
        duration: 150,
        price: 149.99,
        category: 'programming',
        instructor_id: 'instructor-1'
      };
      
      const mockCreatedCourse = {
        id: 'new-course-123',
        ...newCourse,
        status: 'draft',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      mockSupabase.from().insert().select().single.mockResolvedValue({
        data: mockCreatedCourse,
        error: null
      });
      
      const request = testUtils.createMockRequest('POST', '/api/courses', newCourse);
      const response = await POST(request);
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.course.id).toBe('new-course-123');
      expect(data.data.course.title).toBe('新课程');
      expect(data.data.course.status).toBe('draft');
    });

    it('应该验证必需字段', async () => {
      const invalidCourse = {
        description: '缺少标题的课程',
        difficulty: 'beginner'
        // 缺少 title, duration, price 等必需字段
      };
      
      const request = testUtils.createMockRequest('POST', '/api/courses', invalidCourse);
      const response = await POST(request);
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Missing required field');
    });

    it('应该验证数据格式', async () => {
      const invalidCourse = {
        title: 'A', // 太短
        description: '课程描述',
        difficulty: 'invalid-difficulty', // 无效难度
        duration: -10, // 负数
        price: 'not-a-number', // 非数字
        category: 'programming'
      };
      
      const request = testUtils.createMockRequest('POST', '/api/courses', invalidCourse);
      const response = await POST(request);
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Validation failed');
    });

    it('应该检查权限', async () => {
      mockSecurity.validatePermissions.mockResolvedValue({ 
        allowed: false, 
        error: 'Insufficient permissions' 
      });
      
      const newCourse = {
        title: '新课程',
        description: '新课程描述',
        difficulty: 'beginner',
        duration: 120,
        price: 99.99,
        category: 'programming'
      };
      
      const request = testUtils.createMockRequest('POST', '/api/courses', newCourse);
      const response = await POST(request);
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Insufficient permissions');
    });

    it('应该处理重复课程标题', async () => {
      const duplicateError = {
        code: '23505', // PostgreSQL unique violation
        message: 'duplicate key value violates unique constraint'
      };
      
      mockSupabase.from().insert().select().single.mockResolvedValue({
        data: null,
        error: duplicateError
      });
      
      const newCourse = {
        title: '重复课程标题',
        description: '课程描述',
        difficulty: 'beginner',
        duration: 120,
        price: 99.99,
        category: 'programming'
      };
      
      const request = testUtils.createMockRequest('POST', '/api/courses', newCourse);
      const response = await POST(request);
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(409);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Course title already exists');
    });

    it('应该支持AI生成课程内容', async () => {
      const aiGeneratedContent = {
        title: 'AI生成的Python课程',
        description: 'AI生成的详细课程描述',
        modules: [
          {
            title: '模块1：Python基础',
            content: 'AI生成的模块内容',
            duration: 60
          }
        ],
        quiz: [
          {
            question: 'AI生成的问题',
            options: ['选项A', '选项B', '选项C', '选项D'],
            correct: 0
          }
        ]
      };
      
      mockAIService.generateCourse.mockResolvedValue({
        success: true,
        content: aiGeneratedContent
      });
      
      const mockCreatedCourse = {
        id: 'ai-course-123',
        ...aiGeneratedContent,
        difficulty: 'beginner',
        duration: 120,
        price: 99.99,
        category: 'programming',
        status: 'draft'
      };
      
      mockSupabase.from().insert().select().single.mockResolvedValue({
        data: mockCreatedCourse,
        error: null
      });
      
      const request = testUtils.createMockRequest('POST', '/api/courses', {
        useAI: true,
        topic: 'Python编程基础',
        difficulty: 'beginner',
        duration: 120,
        learningObjectives: ['掌握Python语法', '理解面向对象编程']
      });
      
      const response = await POST(request);
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.course.title).toBe('AI生成的Python课程');
      expect(mockAIService.generateCourse).toHaveBeenCalledWith({
        topic: 'Python编程基础',
        difficulty: 'beginner',
        duration: 120,
        learningObjectives: ['掌握Python语法', '理解面向对象编程']
      });
    });
  });

  describe('GET /api/courses/[id]', () => {
    it('应该成功获取单个课程', async () => {
      const mockCourse = {
        id: 'course-123',
        title: '详细课程',
        description: '详细课程描述',
        difficulty: 'intermediate',
        duration: 180,
        price: 199.99,
        category: 'programming',
        status: 'published',
        instructor_id: 'instructor-1',
        modules: [
          {
            id: 'module-1',
            title: '模块1',
            content: '模块内容',
            duration: 60
          }
        ],
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };
      
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: mockCourse,
        error: null
      });
      
      const request = testUtils.createMockRequest('GET', '/api/courses/course-123');
      const response = await GetCourseById(request, { params: { id: 'course-123' } });
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.course.id).toBe('course-123');
      expect(data.data.course.title).toBe('详细课程');
      expect(data.data.course.modules).toHaveLength(1);
    });

    it('应该处理课程不存在', async () => {
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'The result contains 0 rows' }
      });
      
      const request = testUtils.createMockRequest('GET', '/api/courses/non-existent');
      const response = await GetCourseById(request, { params: { id: 'non-existent' } });
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Course not found');
    });

    it('应该验证课程ID格式', async () => {
      const request = testUtils.createMockRequest('GET', '/api/courses/invalid-id-format');
      const response = await GetCourseById(request, { params: { id: 'invalid-id-format' } });
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid course ID format');
    });
  });

  describe('PUT /api/courses/[id]', () => {
    it('应该成功更新课程', async () => {
      const updateData = {
        title: '更新的课程标题',
        description: '更新的课程描述',
        price: 299.99
      };
      
      const mockUpdatedCourse = {
        id: 'course-123',
        title: '更新的课程标题',
        description: '更新的课程描述',
        difficulty: 'intermediate',
        duration: 180,
        price: 299.99,
        category: 'programming',
        status: 'published',
        updated_at: new Date().toISOString()
      };
      
      mockSupabase.from().update().eq().select().single.mockResolvedValue({
        data: mockUpdatedCourse,
        error: null
      });
      
      const request = testUtils.createMockRequest('PUT', '/api/courses/course-123', updateData);
      const response = await UpdateCourse(request, { params: { id: 'course-123' } });
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.course.title).toBe('更新的课程标题');
      expect(data.data.course.price).toBe(299.99);
    });

    it('应该验证更新权限', async () => {
      mockSecurity.validatePermissions.mockResolvedValue({ 
        allowed: false, 
        error: 'Cannot update this course' 
      });
      
      const updateData = {
        title: '尝试更新的标题'
      };
      
      const request = testUtils.createMockRequest('PUT', '/api/courses/course-123', updateData);
      const response = await UpdateCourse(request, { params: { id: 'course-123' } });
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Cannot update this course');
    });

    it('应该处理课程不存在的更新', async () => {
      mockSupabase.from().update().eq().select().single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'The result contains 0 rows' }
      });
      
      const updateData = {
        title: '更新不存在的课程'
      };
      
      const request = testUtils.createMockRequest('PUT', '/api/courses/non-existent', updateData);
      const response = await UpdateCourse(request, { params: { id: 'non-existent' } });
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Course not found');
    });

    it('应该支持AI内容优化', async () => {
      const optimizedContent = {
        description: 'AI优化后的课程描述，更加清晰和吸引人',
        modules: [
          {
            title: 'AI优化的模块标题',
            content: 'AI优化的模块内容，结构更清晰'
          }
        ]
      };
      
      mockAIService.optimizeContent.mockResolvedValue({
        success: true,
        optimizedContent
      });
      
      const mockUpdatedCourse = {
        id: 'course-123',
        title: '原始标题',
        description: optimizedContent.description,
        modules: optimizedContent.modules
      };
      
      mockSupabase.from().update().eq().select().single.mockResolvedValue({
        data: mockUpdatedCourse,
        error: null
      });
      
      const request = testUtils.createMockRequest('PUT', '/api/courses/course-123', {
        optimizeWithAI: true,
        optimizationGoals: ['clarity', 'engagement']
      });
      
      const response = await UpdateCourse(request, { params: { id: 'course-123' } });
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.course.description).toBe(optimizedContent.description);
      expect(mockAIService.optimizeContent).toHaveBeenCalledWith(
        expect.any(Object),
        { goals: ['clarity', 'engagement'] }
      );
    });
  });

  describe('DELETE /api/courses/[id]', () => {
    it('应该成功删除课程', async () => {
      mockSupabase.from().delete().eq.mockResolvedValue({
        data: null,
        error: null
      });
      
      const request = testUtils.createMockRequest('DELETE', '/api/courses/course-123');
      const response = await DeleteCourse(request, { params: { id: 'course-123' } });
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Course deleted successfully');
    });

    it('应该验证删除权限', async () => {
      mockSecurity.validatePermissions.mockResolvedValue({ 
        allowed: false, 
        error: 'Cannot delete this course' 
      });
      
      const request = testUtils.createMockRequest('DELETE', '/api/courses/course-123');
      const response = await DeleteCourse(request, { params: { id: 'course-123' } });
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Cannot delete this course');
    });

    it('应该处理删除不存在的课程', async () => {
      mockSupabase.from().delete().eq.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'The result contains 0 rows' }
      });
      
      const request = testUtils.createMockRequest('DELETE', '/api/courses/non-existent');
      const response = await DeleteCourse(request, { params: { id: 'non-existent' } });
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Course not found');
    });

    it('应该处理有关联数据的课程删除', async () => {
      const constraintError = {
        code: '23503', // PostgreSQL foreign key violation
        message: 'update or delete on table violates foreign key constraint'
      };
      
      mockSupabase.from().delete().eq.mockResolvedValue({
        data: null,
        error: constraintError
      });
      
      const request = testUtils.createMockRequest('DELETE', '/api/courses/course-with-enrollments');
      const response = await DeleteCourse(request, { params: { id: 'course-with-enrollments' } });
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(409);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Cannot delete course with existing enrollments');
    });
  });

  describe('错误处理和边界情况', () => {
    it('应该处理无效的JSON请求体', async () => {
      const request = new NextRequest('http://localhost/api/courses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'test-api-key'
        },
        body: 'invalid-json{'
      });
      
      const response = await POST(request);
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid JSON');
    });

    it('应该处理缺少Content-Type头部', async () => {
      const request = new NextRequest('http://localhost/api/courses', {
        method: 'POST',
        headers: {
          'X-API-Key': 'test-api-key'
        },
        body: JSON.stringify({ title: '测试课程' })
      });
      
      const response = await POST(request);
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Content-Type must be application/json');
    });

    it('应该处理数据库连接超时', async () => {
      const timeoutError = new Error('Connection timeout');
      timeoutError.name = 'TimeoutError';
      
      mockSupabase.from().select().order().limit().range.mockRejectedValue(timeoutError);
      
      const request = testUtils.createMockRequest('GET', '/api/courses');
      const response = await GET(request);
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(504);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Database timeout');
    });

    it('应该处理并发请求', async () => {
      const mockCourses = [{ id: 'course-1', title: '并发测试课程' }];
      mockSupabase.from().select().order().limit().range.mockResolvedValue({
        data: mockCourses,
        error: null,
        count: 1
      });
      
      const promises = Array.from({ length: 10 }, () => {
        const request = testUtils.createMockRequest('GET', '/api/courses');
        return GET(request);
      });
      
      const responses = await Promise.all(promises);
      
      expect(responses).toHaveLength(10);
      expect(responses.every(r => r.status === 200)).toBe(true);
    });
  });

  describe('性能测试', () => {
    it('应该在合理时间内处理课程列表请求', async () => {
      const largeCourseList = Array.from({ length: 100 }, (_, i) => ({
        id: `course-${i}`,
        title: `课程 ${i}`,
        description: `课程描述 ${i}`,
        difficulty: 'beginner',
        duration: 120,
        price: 99.99
      }));
      
      mockSupabase.from().select().order().limit().range.mockResolvedValue({
        data: largeCourseList,
        error: null,
        count: 100
      });
      
      const startTime = Date.now();
      const request = testUtils.createMockRequest('GET', '/api/courses?limit=100');
      const response = await GET(request);
      const endTime = Date.now();
      
      expect(response.status).toBe(200);
      expect(endTime - startTime).toBeLessThan(3000); // 应该在3秒内完成
    });

    it('应该高效处理复杂查询', async () => {
      const complexQueryResult = Array.from({ length: 50 }, (_, i) => ({
        id: `complex-course-${i}`,
        title: `复杂查询课程 ${i}`,
        category: 'programming',
        difficulty: 'advanced',
        price: 199.99
      }));
      
      mockSupabase.from().select().eq().order().limit().range.mockResolvedValue({
        data: complexQueryResult,
        error: null,
        count: 50
      });
      
      const startTime = Date.now();
      const request = testUtils.createMockRequest('GET', '/api/courses?category=programming&difficulty=advanced&minPrice=100&maxPrice=300&search=复杂&sortBy=price&sortOrder=desc');
      const response = await GET(request);
      const endTime = Date.now();
      
      expect(response.status).toBe(200);
      expect(endTime - startTime).toBeLessThan(5000); // 应该在5秒内完成
    });
  });
});