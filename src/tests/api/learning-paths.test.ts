/**
 * 学习路径API路由集成测试
 * 测试学习路径的创建、获取、更新、删除和推荐功能
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { NextRequest, NextResponse } from 'next/server';
import { GET, POST, PUT, DELETE } from '@/app/api/learning-paths/route';
import { GET as GetPathById, PUT as UpdatePath, DELETE as DeletePath } from '@/app/api/learning-paths/[id]/route';
import { POST as EnrollPath } from '@/app/api/learning-paths/[id]/enroll/route';
import { GET as GetPathProgress } from '@/app/api/learning-paths/[id]/progress/route';
import { POST as GenerateRecommendations } from '@/app/api/learning-paths/recommendations/route';
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
  })),
  rpc: jest.fn()
};

const mockSecurity = {
  validateApiKey: jest.fn(),
  checkRateLimit: jest.fn(),
  validatePermissions: jest.fn(),
  verifyToken: jest.fn()
};

const mockApiMonitor = {
  startCall: jest.fn(() => 'call-id-123'),
  endCall: jest.fn(),
  recordError: jest.fn()
};

const mockAiService = {
  generateLearningPath: jest.fn(),
  recommendCourses: jest.fn(),
  analyzeUserProgress: jest.fn(),
  adaptPathDifficulty: jest.fn()
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
  aiService: mockAiService
}));

describe('学习路径API路由', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // 设置默认的成功响应
    mockSecurity.validateApiKey.mockResolvedValue({ valid: true, keyId: 'test-key' });
    mockSecurity.checkRateLimit.mockResolvedValue({ allowed: true });
    mockSecurity.validatePermissions.mockResolvedValue({ allowed: true });
    mockSecurity.verifyToken.mockResolvedValue({ valid: true, userId: 'user-123' });
  });

  describe('GET /api/learning-paths', () => {
    it('应该成功获取学习路径列表', async () => {
      const mockPaths = [
        {
          id: 'path-1',
          title: '前端开发完整路径',
          description: '从零基础到高级前端开发工程师',
          category: 'web-development',
          difficulty: 'beginner',
          estimated_duration: 180, // 180天
          total_courses: 8,
          total_lessons: 120,
          prerequisites: [],
          learning_objectives: [
            '掌握HTML/CSS基础',
            '熟练使用JavaScript',
            '掌握React框架',
            '了解前端工程化'
          ],
          is_public: true,
          is_featured: true,
          created_by: 'instructor-1',
          created_at: '2024-01-15T10:00:00Z',
          updated_at: '2024-01-15T10:00:00Z',
          enrollment_count: 1250,
          completion_rate: 0.78,
          average_rating: 4.6
        },
        {
          id: 'path-2',
          title: '数据科学入门',
          description: '数据科学基础知识和实践',
          category: 'data-science',
          difficulty: 'intermediate',
          estimated_duration: 120,
          total_courses: 6,
          total_lessons: 85,
          prerequisites: ['basic-math', 'basic-programming'],
          learning_objectives: [
            '掌握Python数据分析',
            '理解统计学基础',
            '学会机器学习算法',
            '掌握数据可视化'
          ],
          is_public: true,
          is_featured: false,
          created_by: 'instructor-2',
          created_at: '2024-01-15T11:00:00Z',
          updated_at: '2024-01-15T11:00:00Z',
          enrollment_count: 890,
          completion_rate: 0.65,
          average_rating: 4.4
        }
      ];
      
      const mockSupabaseResponse = {
        data: mockPaths,
        error: null,
        count: 2
      };
      
      mockSupabase.from().select().order().limit().range.mockResolvedValue(mockSupabaseResponse);
      
      const request = testUtils.createMockRequest('GET', '/api/learning-paths');
      const response = await GET(request);
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.paths).toHaveLength(2);
      expect(data.data.paths[0].title).toBe('前端开发完整路径');
      expect(data.data.pagination.total).toBe(2);
      expect(mockApiMonitor.startCall).toHaveBeenCalledWith('GET', '/api/learning-paths');
      expect(mockApiMonitor.endCall).toHaveBeenCalledWith('call-id-123', 200);
    });

    it('应该支持按分类筛选学习路径', async () => {
      const mockWebDevPaths = [
        {
          id: 'path-web-1',
          title: 'Web开发路径',
          category: 'web-development',
          difficulty: 'beginner'
        }
      ];
      
      const mockSupabaseResponse = {
        data: mockWebDevPaths,
        error: null,
        count: 1
      };
      
      mockSupabase.from().select().eq().order().limit().range.mockResolvedValue(mockSupabaseResponse);
      
      const request = testUtils.createMockRequest('GET', '/api/learning-paths?category=web-development');
      const response = await GET(request);
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(200);
      expect(data.data.paths).toHaveLength(1);
      expect(data.data.paths[0].category).toBe('web-development');
    });

    it('应该支持按难度筛选学习路径', async () => {
      const mockBeginnerPaths = [
        {
          id: 'path-beginner-1',
          title: '初学者路径',
          difficulty: 'beginner',
          estimated_duration: 90
        }
      ];
      
      const mockSupabaseResponse = {
        data: mockBeginnerPaths,
        error: null,
        count: 1
      };
      
      mockSupabase.from().select().eq().order().limit().range.mockResolvedValue(mockSupabaseResponse);
      
      const request = testUtils.createMockRequest('GET', '/api/learning-paths?difficulty=beginner');
      const response = await GET(request);
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(200);
      expect(data.data.paths).toHaveLength(1);
      expect(data.data.paths[0].difficulty).toBe('beginner');
    });

    it('应该支持搜索学习路径', async () => {
      const mockSearchResults = [
        {
          id: 'path-search-1',
          title: 'React开发路径',
          description: '深入学习React框架',
          category: 'web-development'
        }
      ];
      
      const mockSupabaseResponse = {
        data: mockSearchResults,
        error: null,
        count: 1
      };
      
      mockSupabase.from().select().order().limit().range.mockResolvedValue(mockSearchResults);
      
      const request = testUtils.createMockRequest('GET', '/api/learning-paths?search=React');
      const response = await GET(request);
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(200);
      expect(data.data.paths).toHaveLength(1);
      expect(data.data.paths[0].title).toContain('React');
    });

    it('应该支持获取推荐路径', async () => {
      const mockFeaturedPaths = [
        {
          id: 'path-featured-1',
          title: '推荐路径',
          is_featured: true,
          average_rating: 4.8,
          enrollment_count: 2000
        }
      ];
      
      const mockSupabaseResponse = {
        data: mockFeaturedPaths,
        error: null,
        count: 1
      };
      
      mockSupabase.from().select().eq().order().limit().range.mockResolvedValue(mockSupabaseResponse);
      
      const request = testUtils.createMockRequest('GET', '/api/learning-paths?featured=true');
      const response = await GET(request);
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(200);
      expect(data.data.paths).toHaveLength(1);
      expect(data.data.paths[0].is_featured).toBe(true);
    });
  });

  describe('POST /api/learning-paths', () => {
    it('应该成功创建学习路径', async () => {
      const newPath = {
        title: '新学习路径',
        description: '路径描述',
        category: 'programming',
        difficulty: 'intermediate',
        estimated_duration: 150,
        prerequisites: ['basic-programming'],
        learning_objectives: [
          '掌握高级编程概念',
          '学会设计模式',
          '理解算法和数据结构'
        ],
        courses: [
          {
            course_id: 'course-1',
            order: 1,
            is_required: true
          },
          {
            course_id: 'course-2',
            order: 2,
            is_required: true
          },
          {
            course_id: 'course-3',
            order: 3,
            is_required: false
          }
        ],
        is_public: true
      };
      
      const mockCreatedPath = {
        id: 'new-path-123',
        ...newPath,
        total_courses: 3,
        total_lessons: 45,
        is_featured: false,
        created_by: 'user-123',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        enrollment_count: 0,
        completion_rate: 0,
        average_rating: 0
      };
      
      mockSupabase.from().insert().select().single.mockResolvedValue({
        data: mockCreatedPath,
        error: null
      });
      
      const request = testUtils.createMockRequest('POST', '/api/learning-paths', newPath);
      const response = await POST(request);
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.path.id).toBe('new-path-123');
      expect(data.data.path.title).toBe('新学习路径');
      expect(data.data.path.total_courses).toBe(3);
    });

    it('应该验证必需字段', async () => {
      const invalidPath = {
        title: '路径标题',
        // 缺少 description, category, difficulty 等必需字段
      };
      
      const request = testUtils.createMockRequest('POST', '/api/learning-paths', invalidPath);
      const response = await POST(request);
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Missing required field');
    });

    it('应该验证课程顺序', async () => {
      const invalidPath = {
        title: '路径标题',
        description: '描述',
        category: 'programming',
        difficulty: 'beginner',
        courses: [
          {
            course_id: 'course-1',
            order: 1,
            is_required: true
          },
          {
            course_id: 'course-2',
            order: 1, // 重复的顺序
            is_required: true
          }
        ]
      };
      
      const request = testUtils.createMockRequest('POST', '/api/learning-paths', invalidPath);
      const response = await POST(request);
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid course order');
    });

    it('应该验证创建权限', async () => {
      mockSecurity.validatePermissions.mockResolvedValue({ 
        allowed: false, 
        error: 'Insufficient permissions to create learning path' 
      });
      
      const newPath = {
        title: '路径标题',
        description: '描述',
        category: 'programming',
        difficulty: 'beginner'
      };
      
      const request = testUtils.createMockRequest('POST', '/api/learning-paths', newPath);
      const response = await POST(request);
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Insufficient permissions to create learning path');
    });

    it('应该处理重复标题', async () => {
      const duplicatePath = {
        title: '重复标题',
        description: '描述',
        category: 'programming',
        difficulty: 'beginner'
      };
      
      const duplicateError = {
        code: '23505',
        message: 'duplicate key value violates unique constraint'
      };
      
      mockSupabase.from().insert().select().single.mockResolvedValue({
        data: null,
        error: duplicateError
      });
      
      const request = testUtils.createMockRequest('POST', '/api/learning-paths', duplicatePath);
      const response = await POST(request);
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(409);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Learning path with this title already exists');
    });
  });

  describe('GET /api/learning-paths/[id]', () => {
    it('应该成功获取学习路径详情', async () => {
      const mockPath = {
        id: 'path-detail-123',
        title: '详细学习路径',
        description: '路径详细描述',
        category: 'web-development',
        difficulty: 'intermediate',
        estimated_duration: 120,
        total_courses: 5,
        total_lessons: 75,
        prerequisites: ['html-css', 'javascript-basics'],
        learning_objectives: [
          '掌握React开发',
          '学会状态管理',
          '理解组件设计',
          '掌握路由和导航'
        ],
        is_public: true,
        is_featured: true,
        created_by: 'instructor-1',
        created_at: '2024-01-15T10:00:00Z',
        updated_at: '2024-01-15T10:00:00Z',
        enrollment_count: 1500,
        completion_rate: 0.72,
        average_rating: 4.5,
        // 关联的课程
        courses: [
          {
            id: 'course-1',
            title: 'React基础',
            description: 'React基础知识',
            difficulty: 'beginner',
            estimated_duration: 30,
            order: 1,
            is_required: true,
            completion_rate: 0.85
          },
          {
            id: 'course-2',
            title: 'React进阶',
            description: 'React高级特性',
            difficulty: 'intermediate',
            estimated_duration: 45,
            order: 2,
            is_required: true,
            completion_rate: 0.78
          },
          {
            id: 'course-3',
            title: 'React项目实战',
            description: '实际项目开发',
            difficulty: 'advanced',
            estimated_duration: 60,
            order: 3,
            is_required: false,
            completion_rate: 0.65
          }
        ],
        // 学习者统计
        learner_stats: {
          total_enrolled: 1500,
          active_learners: 450,
          completed_learners: 1080,
          average_completion_time: 95, // 天
          satisfaction_score: 4.5
        },
        // 创建者信息
        creator: {
          id: 'instructor-1',
          name: '讲师1',
          avatar: 'https://example.com/avatar1.jpg',
          expertise: ['React', 'JavaScript', 'Web Development']
        }
      };
      
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: mockPath,
        error: null
      });
      
      const request = testUtils.createMockRequest('GET', '/api/learning-paths/path-detail-123');
      const response = await GetPathById(request, { params: { id: 'path-detail-123' } });
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.path.id).toBe('path-detail-123');
      expect(data.data.path.courses).toHaveLength(3);
      expect(data.data.path.learner_stats.total_enrolled).toBe(1500);
      expect(data.data.path.creator.name).toBe('讲师1');
    });

    it('应该支持获取用户特定的路径信息', async () => {
      const mockPathWithUserData = {
        id: 'path-user-123',
        title: '用户路径',
        courses: [
          {
            id: 'course-1',
            title: '课程1',
            user_progress: {
              is_enrolled: true,
              completion_percentage: 75,
              last_accessed: '2024-01-20T10:00:00Z',
              current_lesson: 'lesson-15'
            }
          },
          {
            id: 'course-2',
            title: '课程2',
            user_progress: {
              is_enrolled: false,
              completion_percentage: 0,
              last_accessed: null,
              current_lesson: null
            }
          }
        ],
        user_enrollment: {
          enrolled_at: '2024-01-10T10:00:00Z',
          progress_percentage: 37.5,
          estimated_completion: '2024-03-15T00:00:00Z',
          current_course: 'course-1',
          completed_courses: 0
        }
      };
      
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: mockPathWithUserData,
        error: null
      });
      
      const request = testUtils.createMockRequest('GET', '/api/learning-paths/path-user-123?include_user_data=true');
      const response = await GetPathById(request, { params: { id: 'path-user-123' } });
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.path.user_enrollment.progress_percentage).toBe(37.5);
      expect(data.data.path.courses[0].user_progress.completion_percentage).toBe(75);
    });

    it('应该处理学习路径不存在', async () => {
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'The result contains 0 rows' }
      });
      
      const request = testUtils.createMockRequest('GET', '/api/learning-paths/non-existent');
      const response = await GetPathById(request, { params: { id: 'non-existent' } });
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Learning path not found');
    });
  });

  describe('PUT /api/learning-paths/[id]', () => {
    it('应该成功更新学习路径', async () => {
      const updateData = {
        title: '更新的路径标题',
        description: '更新的描述',
        difficulty: 'advanced',
        estimated_duration: 180,
        learning_objectives: [
          '掌握高级概念',
          '实现复杂项目',
          '优化性能'
        ]
      };
      
      const mockUpdatedPath = {
        id: 'path-update-123',
        title: '更新的路径标题',
        description: '更新的描述',
        category: 'web-development',
        difficulty: 'advanced',
        estimated_duration: 180,
        updated_at: new Date().toISOString()
      };
      
      mockSupabase.from().update().eq().select().single.mockResolvedValue({
        data: mockUpdatedPath,
        error: null
      });
      
      const request = testUtils.createMockRequest('PUT', '/api/learning-paths/path-update-123', updateData);
      const response = await UpdatePath(request, { params: { id: 'path-update-123' } });
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.path.title).toBe('更新的路径标题');
      expect(data.data.path.difficulty).toBe('advanced');
    });

    it('应该支持更新课程顺序', async () => {
      const updateData = {
        courses: [
          {
            course_id: 'course-2',
            order: 1,
            is_required: true
          },
          {
            course_id: 'course-1',
            order: 2,
            is_required: true
          },
          {
            course_id: 'course-3',
            order: 3,
            is_required: false
          }
        ]
      };
      
      const mockUpdatedPath = {
        id: 'path-reorder-123',
        title: '重新排序的路径',
        courses: updateData.courses,
        updated_at: new Date().toISOString()
      };
      
      mockSupabase.from().update().eq().select().single.mockResolvedValue({
        data: mockUpdatedPath,
        error: null
      });
      
      const request = testUtils.createMockRequest('PUT', '/api/learning-paths/path-reorder-123', updateData);
      const response = await UpdatePath(request, { params: { id: 'path-reorder-123' } });
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.path.courses[0].course_id).toBe('course-2');
      expect(data.data.path.courses[1].course_id).toBe('course-1');
    });

    it('应该验证更新权限', async () => {
      mockSecurity.validatePermissions.mockResolvedValue({ 
        allowed: false, 
        error: 'Cannot update this learning path' 
      });
      
      const updateData = {
        title: '新标题'
      };
      
      const request = testUtils.createMockRequest('PUT', '/api/learning-paths/path-123', updateData);
      const response = await UpdatePath(request, { params: { id: 'path-123' } });
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Cannot update this learning path');
    });

    it('应该处理学习路径不存在', async () => {
      const updateData = {
        title: '新标题'
      };
      
      mockSupabase.from().update().eq().select().single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'The result contains 0 rows' }
      });
      
      const request = testUtils.createMockRequest('PUT', '/api/learning-paths/non-existent', updateData);
      const response = await UpdatePath(request, { params: { id: 'non-existent' } });
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Learning path not found');
    });
  });

  describe('DELETE /api/learning-paths/[id]', () => {
    it('应该成功删除学习路径', async () => {
      mockSupabase.from().delete().eq.mockResolvedValue({
        data: null,
        error: null
      });
      
      const request = testUtils.createMockRequest('DELETE', '/api/learning-paths/path-delete-123');
      const response = await DeletePath(request, { params: { id: 'path-delete-123' } });
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Learning path deleted successfully');
    });

    it('应该验证删除权限', async () => {
      mockSecurity.validatePermissions.mockResolvedValue({ 
        allowed: false, 
        error: 'Cannot delete this learning path' 
      });
      
      const request = testUtils.createMockRequest('DELETE', '/api/learning-paths/path-123');
      const response = await DeletePath(request, { params: { id: 'path-123' } });
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Cannot delete this learning path');
    });

    it('应该处理有学习者的路径', async () => {
      const constraintError = {
        code: '23503',
        message: 'foreign key constraint violation'
      };
      
      mockSupabase.from().delete().eq.mockResolvedValue({
        data: null,
        error: constraintError
      });
      
      const request = testUtils.createMockRequest('DELETE', '/api/learning-paths/path-with-learners');
      const response = await DeletePath(request, { params: { id: 'path-with-learners' } });
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(409);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Cannot delete learning path with active enrollments');
    });
  });

  describe('POST /api/learning-paths/[id]/enroll', () => {
    it('应该成功注册学习路径', async () => {
      const enrollmentData = {
        learning_goals: [
          '提升前端技能',
          '学习React框架',
          '准备求职面试'
        ],
        target_completion_date: '2024-06-01',
        preferred_schedule: {
          hours_per_week: 10,
          preferred_days: ['monday', 'wednesday', 'friday'],
          preferred_time: 'evening'
        }
      };
      
      const mockEnrollment = {
        id: 'enrollment-123',
        user_id: 'user-123',
        learning_path_id: 'path-enroll-123',
        enrolled_at: new Date().toISOString(),
        target_completion_date: '2024-06-01T00:00:00Z',
        progress_percentage: 0,
        current_course: null,
        completed_courses: 0,
        learning_goals: enrollmentData.learning_goals,
        preferred_schedule: enrollmentData.preferred_schedule,
        status: 'active'
      };
      
      mockSupabase.from().insert().select().single.mockResolvedValue({
        data: mockEnrollment,
        error: null
      });
      
      const request = testUtils.createMockRequest('POST', '/api/learning-paths/path-enroll-123/enroll', enrollmentData);
      const response = await EnrollPath(request, { params: { id: 'path-enroll-123' } });
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.enrollment.id).toBe('enrollment-123');
      expect(data.data.enrollment.status).toBe('active');
      expect(data.data.enrollment.learning_goals).toHaveLength(3);
    });

    it('应该处理重复注册', async () => {
      const enrollmentData = {
        learning_goals: ['学习目标']
      };
      
      const duplicateError = {
        code: '23505',
        message: 'duplicate key value violates unique constraint'
      };
      
      mockSupabase.from().insert().select().single.mockResolvedValue({
        data: null,
        error: duplicateError
      });
      
      const request = testUtils.createMockRequest('POST', '/api/learning-paths/path-123/enroll', enrollmentData);
      const response = await EnrollPath(request, { params: { id: 'path-123' } });
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(409);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Already enrolled in this learning path');
    });

    it('应该验证学习路径存在', async () => {
      const enrollmentData = {
        learning_goals: ['学习目标']
      };
      
      const notFoundError = {
        code: '23503',
        message: 'foreign key constraint violation'
      };
      
      mockSupabase.from().insert().select().single.mockResolvedValue({
        data: null,
        error: notFoundError
      });
      
      const request = testUtils.createMockRequest('POST', '/api/learning-paths/non-existent/enroll', enrollmentData);
      const response = await EnrollPath(request, { params: { id: 'non-existent' } });
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Learning path not found');
    });

    it('应该验证用户认证', async () => {
      mockSecurity.verifyToken.mockResolvedValue({ 
        valid: false, 
        error: 'Invalid token' 
      });
      
      const enrollmentData = {
        learning_goals: ['学习目标']
      };
      
      const request = testUtils.createMockRequest('POST', '/api/learning-paths/path-123/enroll', enrollmentData);
      const response = await EnrollPath(request, { params: { id: 'path-123' } });
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Authentication required');
    });
  });

  describe('GET /api/learning-paths/[id]/progress', () => {
    it('应该成功获取学习路径进度', async () => {
      const mockProgress = {
        learning_path_id: 'path-progress-123',
        user_id: 'user-123',
        enrollment: {
          enrolled_at: '2024-01-10T10:00:00Z',
          target_completion_date: '2024-06-01T00:00:00Z',
          progress_percentage: 65,
          current_course: 'course-2',
          completed_courses: 2,
          status: 'active'
        },
        course_progress: [
          {
            course_id: 'course-1',
            course_title: '基础课程',
            completion_percentage: 100,
            completed_at: '2024-02-15T10:00:00Z',
            time_spent: 1800, // 30小时
            quiz_scores: [85, 92, 78],
            average_quiz_score: 85
          },
          {
            course_id: 'course-2',
            course_title: '进阶课程',
            completion_percentage: 75,
            completed_at: null,
            time_spent: 1350, // 22.5小时
            quiz_scores: [88, 91],
            average_quiz_score: 89.5,
            current_lesson: 'lesson-18',
            next_lesson: 'lesson-19'
          },
          {
            course_id: 'course-3',
            course_title: '高级课程',
            completion_percentage: 0,
            completed_at: null,
            time_spent: 0,
            quiz_scores: [],
            average_quiz_score: 0
          }
        ],
        statistics: {
          total_time_spent: 3150, // 52.5小时
          average_daily_time: 45, // 分钟
          streak_days: 12,
          longest_streak: 18,
          completion_rate: 0.65,
          estimated_completion_date: '2024-05-15T00:00:00Z',
          performance_trend: 'improving'
        },
        achievements: [
          {
            id: 'achievement-1',
            title: '坚持学习者',
            description: '连续学习7天',
            earned_at: '2024-01-17T10:00:00Z',
            icon: 'streak'
          },
          {
            id: 'achievement-2',
            title: '测验高手',
            description: '测验平均分超过85分',
            earned_at: '2024-02-01T10:00:00Z',
            icon: 'quiz'
          }
        ],
        recommendations: {
          next_actions: [
            '完成当前课程的剩余内容',
            '复习之前的测验错题',
            '参与讨论区互动'
          ],
          study_tips: [
            '建议每天学习1-2小时',
            '定期复习已学内容',
            '多做练习题巩固知识'
          ],
          difficulty_adjustment: {
            current_level: 'appropriate',
            suggestion: null
          }
        }
      };
      
      mockSupabase.rpc.mockResolvedValue({
        data: mockProgress,
        error: null
      });
      
      const request = testUtils.createMockRequest('GET', '/api/learning-paths/path-progress-123/progress');
      const response = await GetPathProgress(request, { params: { id: 'path-progress-123' } });
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.progress.enrollment.progress_percentage).toBe(65);
      expect(data.data.progress.course_progress).toHaveLength(3);
      expect(data.data.progress.achievements).toHaveLength(2);
      expect(data.data.progress.statistics.total_time_spent).toBe(3150);
    });

    it('应该处理未注册的学习路径', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'The result contains 0 rows' }
      });
      
      const request = testUtils.createMockRequest('GET', '/api/learning-paths/path-123/progress');
      const response = await GetPathProgress(request, { params: { id: 'path-123' } });
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Not enrolled in this learning path');
    });

    it('应该验证用户权限', async () => {
      mockSecurity.verifyToken.mockResolvedValue({ 
        valid: false, 
        error: 'Invalid token' 
      });
      
      const request = testUtils.createMockRequest('GET', '/api/learning-paths/path-123/progress');
      const response = await GetPathProgress(request, { params: { id: 'path-123' } });
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Authentication required');
    });
  });

  describe('POST /api/learning-paths/recommendations', () => {
    it('应该成功生成个性化推荐', async () => {
      const recommendationRequest = {
        user_interests: ['web-development', 'javascript', 'react'],
        current_skill_level: 'intermediate',
        learning_goals: [
          '提升前端技能',
          '学习新框架',
          '准备技术面试'
        ],
        available_time: {
          hours_per_week: 8,
          preferred_schedule: 'evening'
        },
        preferred_difficulty: 'intermediate',
        exclude_completed: true
      };
      
      const mockRecommendations = {
        recommended_paths: [
          {
            id: 'path-rec-1',
            title: 'React高级开发',
            description: '深入学习React高级特性',
            category: 'web-development',
            difficulty: 'intermediate',
            estimated_duration: 90,
            match_score: 0.95,
            match_reasons: [
              '符合您的JavaScript技能水平',
              '包含React进阶内容',
              '适合您的学习时间安排'
            ],
            learning_objectives: [
              '掌握React Hooks',
              '学会性能优化',
              '理解状态管理'
            ],
            enrollment_count: 1200,
            average_rating: 4.7,
            completion_rate: 0.82
          },
          {
            id: 'path-rec-2',
            title: '全栈JavaScript开发',
            description: '从前端到后端的完整开发',
            category: 'full-stack',
            difficulty: 'intermediate',
            estimated_duration: 150,
            match_score: 0.88,
            match_reasons: [
              '扩展您的技能栈',
              '包含前端和后端内容',
              '符合求职准备目标'
            ],
            learning_objectives: [
              '掌握Node.js开发',
              '学会数据库设计',
              '理解API开发'
            ],
            enrollment_count: 980,
            average_rating: 4.5,
            completion_rate: 0.75
          }
        ],
        alternative_paths: [
          {
            id: 'path-alt-1',
            title: 'Vue.js开发路径',
            description: '学习Vue.js框架',
            match_score: 0.75,
            reason: '类似的前端框架，可以扩展技能'
          }
        ],
        personalization_insights: {
          skill_gaps: [
            '后端开发经验',
            '数据库设计',
            '系统架构'
          ],
          strength_areas: [
            'JavaScript基础',
            '前端开发',
            'React框架'
          ],
          learning_style: 'practical', // 基于历史数据分析
          recommended_pace: 'moderate'
        },
        next_steps: [
          '选择一个推荐的学习路径',
          '设置学习计划和目标',
          '开始第一个课程',
          '加入学习社区'
        ]
      };
      
      mockAiService.recommendCourses.mockResolvedValue({
        success: true,
        recommendations: mockRecommendations
      });
      
      const request = testUtils.createMockRequest('POST', '/api/learning-paths/recommendations', recommendationRequest);
      const response = await GenerateRecommendations(request);
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.recommendations.recommended_paths).toHaveLength(2);
      expect(data.data.recommendations.recommended_paths[0].match_score).toBe(0.95);
      expect(data.data.recommendations.personalization_insights.skill_gaps).toHaveLength(3);
      expect(mockAiService.recommendCourses).toHaveBeenCalledWith(recommendationRequest);
    });

    it('应该处理AI推荐服务失败', async () => {
      const recommendationRequest = {
        user_interests: ['programming'],
        current_skill_level: 'beginner'
      };
      
      const aiError = new Error('Recommendation service unavailable');
      mockAiService.recommendCourses.mockRejectedValue(aiError);
      
      const request = testUtils.createMockRequest('POST', '/api/learning-paths/recommendations', recommendationRequest);
      const response = await GenerateRecommendations(request);
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to generate recommendations');
    });

    it('应该验证推荐请求参数', async () => {
      const invalidRequest = {
        user_interests: [], // 空兴趣列表
        current_skill_level: 'invalid_level' // 无效技能水平
      };
      
      const request = testUtils.createMockRequest('POST', '/api/learning-paths/recommendations', invalidRequest);
      const response = await GenerateRecommendations(request);
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid recommendation parameters');
    });

    it('应该支持匿名用户推荐', async () => {
      mockSecurity.verifyToken.mockResolvedValue({ 
        valid: false, 
        userId: null 
      });
      
      const anonymousRequest = {
        user_interests: ['web-development'],
        current_skill_level: 'beginner'
      };
      
      const mockAnonymousRecommendations = {
        recommended_paths: [
          {
            id: 'path-beginner-1',
            title: 'Web开发入门',
            match_score: 0.85,
            match_reasons: ['适合初学者', '包含基础内容']
          }
        ],
        personalization_insights: {
          note: '基于通用推荐算法，注册后可获得个性化推荐'
        }
      };
      
      mockAiService.recommendCourses.mockResolvedValue({
        success: true,
        recommendations: mockAnonymousRecommendations
      });
      
      const request = testUtils.createMockRequest('POST', '/api/learning-paths/recommendations', anonymousRequest);
      const response = await GenerateRecommendations(request);
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.recommendations.recommended_paths).toHaveLength(1);
      expect(data.data.recommendations.personalization_insights.note).toContain('注册后可获得个性化推荐');
    });
  });

  describe('错误处理和边界情况', () => {
    it('应该处理数据库连接错误', async () => {
      const connectionError = new Error('Database connection failed');
      mockSupabase.from().select().order().limit().range.mockRejectedValue(connectionError);
      
      const request = testUtils.createMockRequest('GET', '/api/learning-paths');
      const response = await GET(request);
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Database connection failed');
      expect(mockApiMonitor.recordError).toHaveBeenCalledWith('call-id-123', connectionError);
    });

    it('应该处理AI服务超时', async () => {
      const recommendationRequest = {
        user_interests: ['programming'],
        current_skill_level: 'beginner'
      };
      
      const timeoutError = new Error('AI service timeout');
      mockAiService.recommendCourses.mockRejectedValue(timeoutError);
      
      // 应该返回基础推荐
      const fallbackRecommendations = {
        recommended_paths: [
          {
            id: 'path-fallback-1',
            title: '编程基础',
            match_score: 0.7,
            match_reasons: ['基于分类的通用推荐']
          }
        ]
      };
      
      mockSupabase.from().select().eq().order().limit().range.mockResolvedValue({
        data: fallbackRecommendations.recommended_paths,
        error: null
      });
      
      const request = testUtils.createMockRequest('POST', '/api/learning-paths/recommendations', recommendationRequest);
      const response = await GenerateRecommendations(request);
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.recommendations.recommended_paths).toHaveLength(1);
      expect(data.warnings).toContain('AI recommendations unavailable, using fallback');
    });

    it('应该处理无效的学习路径数据', async () => {
      const invalidPath = {
        title: '', // 空标题
        description: 'A'.repeat(10000), // 过长描述
        category: 'invalid-category',
        difficulty: 'invalid-difficulty',
        estimated_duration: -10 // 负数时长
      };
      
      const request = testUtils.createMockRequest('POST', '/api/learning-paths', invalidPath);
      const response = await POST(request);
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid learning path data');
    });

    it('应该处理并发注册冲突', async () => {
      const enrollmentData = {
        learning_goals: ['学习目标']
      };
      
      const conflictError = {
        code: '40001',
        message: 'serialization_failure'
      };
      
      mockSupabase.from().insert().select().single.mockResolvedValue({
        data: null,
        error: conflictError
      });
      
      const request = testUtils.createMockRequest('POST', '/api/learning-paths/path-123/enroll', enrollmentData);
      const response = await EnrollPath(request, { params: { id: 'path-123' } });
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(409);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Enrollment conflict, please retry');
    });
  });

  describe('性能测试', () => {
    it('应该高效处理大量学习路径查询', async () => {
      const largePathList = Array.from({ length: 100 }, (_, i) => ({
        id: `path-${i}`,
        title: `学习路径 ${i}`,
        category: ['web-development', 'data-science', 'mobile-development'][i % 3],
        difficulty: ['beginner', 'intermediate', 'advanced'][i % 3],
        estimated_duration: Math.floor(Math.random() * 200) + 30
      }));
      
      mockSupabase.from().select().order().limit().range.mockResolvedValue({
        data: largePathList,
        error: null,
        count: 100
      });
      
      const startTime = Date.now();
      const request = testUtils.createMockRequest('GET', '/api/learning-paths?limit=100');
      const response = await GET(request);
      const endTime = Date.now();
      
      expect(response.status).toBe(200);
      expect(endTime - startTime).toBeLessThan(2000); // 应该在2秒内完成
    });

    it('应该高效处理复杂推荐请求', async () => {
      const complexRequest = {
        user_interests: Array.from({ length: 20 }, (_, i) => `interest-${i}`),
        current_skill_level: 'intermediate',
        learning_goals: Array.from({ length: 10 }, (_, i) => `goal-${i}`),
        exclude_completed: true,
        include_prerequisites: true
      };
      
      const mockComplexRecommendations = {
        recommended_paths: Array.from({ length: 50 }, (_, i) => ({
          id: `path-rec-${i}`,
          title: `推荐路径 ${i}`,
          match_score: Math.random()
        }))
      };
      
      mockAiService.recommendCourses.mockResolvedValue({
        success: true,
        recommendations: mockComplexRecommendations
      });
      
      const startTime = Date.now();
      const request = testUtils.createMockRequest('POST', '/api/learning-paths/recommendations', complexRequest);
      const response = await GenerateRecommendations(request);
      const endTime = Date.now();
      
      expect(response.status).toBe(200);
      expect(endTime - startTime).toBeLessThan(5000); // 应该在5秒内完成
    });

    it('应该高效处理并发路径访问', async () => {
      const mockPath = {
        id: 'concurrent-path-123',
        title: '并发路径',
        courses: []
      };
      
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: mockPath,
        error: null
      });
      
      const promises = Array.from({ length: 20 }, () => {
        const request = testUtils.createMockRequest('GET', '/api/learning-paths/concurrent-path-123');
        return GetPathById(request, { params: { id: 'concurrent-path-123' } });
      });
      
      const startTime = Date.now();
      const responses = await Promise.all(promises);
      const endTime = Date.now();
      
      expect(responses).toHaveLength(20);
      expect(responses.every(r => r.status === 200)).toBe(true);
      expect(endTime - startTime).toBeLessThan(3000); // 应该在3秒内完成
    });
  });
});