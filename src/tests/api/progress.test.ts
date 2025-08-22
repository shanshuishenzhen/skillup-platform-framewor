/**
 * 学习进度API路由集成测试
 * 测试学习进度的记录、查询、统计等功能
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { NextRequest, NextResponse } from 'next/server';
import { GET, POST, PUT } from '@/app/api/progress/route';
import { GET as GetProgressById } from '@/app/api/progress/[id]/route';
import { GET as GetUserProgress } from '@/app/api/users/[id]/progress/route';
import { POST as UpdateLessonProgress } from '@/app/api/lessons/[id]/progress/route';
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
    upsert: jest.fn(() => ({
      select: jest.fn(() => ({
        single: jest.fn()
      }))
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
  analyzeProgress: jest.fn(),
  generateRecommendations: jest.fn(),
  predictPerformance: jest.fn()
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

describe('学习进度API路由', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // 设置默认的成功响应
    mockSecurity.validateApiKey.mockResolvedValue({ valid: true, keyId: 'test-key' });
    mockSecurity.checkRateLimit.mockResolvedValue({ allowed: true });
    mockSecurity.validatePermissions.mockResolvedValue({ allowed: true });
    mockSecurity.verifyToken.mockResolvedValue({ valid: true, userId: 'user-123' });
  });

  describe('GET /api/progress', () => {
    it('应该成功获取进度列表', async () => {
      const mockProgressList = [
        {
          id: 'progress-1',
          user_id: 'user-123',
          course_id: 'course-1',
          lesson_id: 'lesson-1',
          status: 'completed',
          progress_percentage: 100,
          time_spent: 1800, // 30分钟
          score: 95,
          completed_at: '2024-01-15T10:30:00Z',
          created_at: '2024-01-15T10:00:00Z',
          updated_at: '2024-01-15T10:30:00Z'
        },
        {
          id: 'progress-2',
          user_id: 'user-123',
          course_id: 'course-1',
          lesson_id: 'lesson-2',
          status: 'in_progress',
          progress_percentage: 60,
          time_spent: 900, // 15分钟
          score: null,
          completed_at: null,
          created_at: '2024-01-15T11:00:00Z',
          updated_at: '2024-01-15T11:15:00Z'
        }
      ];
      
      const mockSupabaseResponse = {
        data: mockProgressList,
        error: null,
        count: 2
      };
      
      mockSupabase.from().select().order().limit().range.mockResolvedValue(mockSupabaseResponse);
      
      const request = testUtils.createMockRequest('GET', '/api/progress');
      const response = await GET(request);
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.progress).toHaveLength(2);
      expect(data.data.progress[0].status).toBe('completed');
      expect(data.data.progress[1].status).toBe('in_progress');
      expect(data.data.pagination.total).toBe(2);
      expect(mockApiMonitor.startCall).toHaveBeenCalledWith('GET', '/api/progress');
      expect(mockApiMonitor.endCall).toHaveBeenCalledWith('call-id-123', 200);
    });

    it('应该支持按用户筛选进度', async () => {
      const mockUserProgress = [
        {
          id: 'progress-user-1',
          user_id: 'user-456',
          course_id: 'course-1',
          lesson_id: 'lesson-1',
          status: 'completed',
          progress_percentage: 100
        }
      ];
      
      const mockSupabaseResponse = {
        data: mockUserProgress,
        error: null,
        count: 1
      };
      
      mockSupabase.from().select().eq().order().limit().range.mockResolvedValue(mockSupabaseResponse);
      
      const request = testUtils.createMockRequest('GET', '/api/progress?user_id=user-456');
      const response = await GET(request);
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(200);
      expect(data.data.progress).toHaveLength(1);
      expect(data.data.progress[0].user_id).toBe('user-456');
    });

    it('应该支持按课程筛选进度', async () => {
      const mockCourseProgress = [
        {
          id: 'progress-course-1',
          user_id: 'user-123',
          course_id: 'course-2',
          lesson_id: 'lesson-3',
          status: 'in_progress',
          progress_percentage: 45
        }
      ];
      
      const mockSupabaseResponse = {
        data: mockCourseProgress,
        error: null,
        count: 1
      };
      
      mockSupabase.from().select().eq().order().limit().range.mockResolvedValue(mockSupabaseResponse);
      
      const request = testUtils.createMockRequest('GET', '/api/progress?course_id=course-2');
      const response = await GET(request);
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(200);
      expect(data.data.progress).toHaveLength(1);
      expect(data.data.progress[0].course_id).toBe('course-2');
    });

    it('应该支持按状态筛选进度', async () => {
      const mockCompletedProgress = [
        {
          id: 'progress-completed-1',
          user_id: 'user-123',
          status: 'completed',
          progress_percentage: 100,
          completed_at: '2024-01-15T10:30:00Z'
        }
      ];
      
      const mockSupabaseResponse = {
        data: mockCompletedProgress,
        error: null,
        count: 1
      };
      
      mockSupabase.from().select().eq().order().limit().range.mockResolvedValue(mockSupabaseResponse);
      
      const request = testUtils.createMockRequest('GET', '/api/progress?status=completed');
      const response = await GET(request);
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(200);
      expect(data.data.progress).toHaveLength(1);
      expect(data.data.progress[0].status).toBe('completed');
    });

    it('应该验证用户权限', async () => {
      mockSecurity.validatePermissions.mockResolvedValue({ 
        allowed: false, 
        error: 'Cannot access progress data' 
      });
      
      const request = testUtils.createMockRequest('GET', '/api/progress');
      const response = await GET(request);
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Cannot access progress data');
    });
  });

  describe('POST /api/progress', () => {
    it('应该成功创建学习进度记录', async () => {
      const newProgress = {
        user_id: 'user-123',
        course_id: 'course-1',
        lesson_id: 'lesson-1',
        status: 'in_progress',
        progress_percentage: 25,
        time_spent: 600 // 10分钟
      };
      
      const mockCreatedProgress = {
        id: 'new-progress-123',
        ...newProgress,
        score: null,
        completed_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      mockSupabase.from().insert().select().single.mockResolvedValue({
        data: mockCreatedProgress,
        error: null
      });
      
      const request = testUtils.createMockRequest('POST', '/api/progress', newProgress);
      const response = await POST(request);
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.progress.id).toBe('new-progress-123');
      expect(data.data.progress.user_id).toBe('user-123');
      expect(data.data.progress.progress_percentage).toBe(25);
    });

    it('应该验证必需字段', async () => {
      const invalidProgress = {
        user_id: 'user-123',
        // 缺少 course_id, lesson_id 等必需字段
      };
      
      const request = testUtils.createMockRequest('POST', '/api/progress', invalidProgress);
      const response = await POST(request);
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Missing required field');
    });

    it('应该验证进度百分比范围', async () => {
      const invalidProgress = {
        user_id: 'user-123',
        course_id: 'course-1',
        lesson_id: 'lesson-1',
        status: 'in_progress',
        progress_percentage: 150 // 超出范围
      };
      
      const request = testUtils.createMockRequest('POST', '/api/progress', invalidProgress);
      const response = await POST(request);
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Progress percentage must be between 0 and 100');
    });

    it('应该验证状态值', async () => {
      const invalidProgress = {
        user_id: 'user-123',
        course_id: 'course-1',
        lesson_id: 'lesson-1',
        status: 'invalid_status', // 无效状态
        progress_percentage: 50
      };
      
      const request = testUtils.createMockRequest('POST', '/api/progress', invalidProgress);
      const response = await POST(request);
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid status value');
    });

    it('应该处理重复进度记录', async () => {
      const duplicateProgress = {
        user_id: 'user-123',
        course_id: 'course-1',
        lesson_id: 'lesson-1',
        status: 'in_progress',
        progress_percentage: 30
      };
      
      const duplicateError = {
        code: '23505',
        message: 'duplicate key value violates unique constraint'
      };
      
      mockSupabase.from().insert().select().single.mockResolvedValue({
        data: null,
        error: duplicateError
      });
      
      const request = testUtils.createMockRequest('POST', '/api/progress', duplicateProgress);
      const response = await POST(request);
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(409);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Progress record already exists for this lesson');
    });

    it('应该自动计算完成时间', async () => {
      const completedProgress = {
        user_id: 'user-123',
        course_id: 'course-1',
        lesson_id: 'lesson-1',
        status: 'completed',
        progress_percentage: 100,
        score: 95
      };
      
      const mockCreatedProgress = {
        id: 'completed-progress-123',
        ...completedProgress,
        completed_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      mockSupabase.from().insert().select().single.mockResolvedValue({
        data: mockCreatedProgress,
        error: null
      });
      
      const request = testUtils.createMockRequest('POST', '/api/progress', completedProgress);
      const response = await POST(request);
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.progress.completed_at).toBeTruthy();
      expect(data.data.progress.status).toBe('completed');
    });
  });

  describe('PUT /api/progress', () => {
    it('应该成功更新学习进度', async () => {
      const updateData = {
        id: 'progress-update-123',
        progress_percentage: 75,
        time_spent: 1200, // 20分钟
        status: 'in_progress'
      };
      
      const mockUpdatedProgress = {
        id: 'progress-update-123',
        user_id: 'user-123',
        course_id: 'course-1',
        lesson_id: 'lesson-1',
        status: 'in_progress',
        progress_percentage: 75,
        time_spent: 1200,
        score: null,
        completed_at: null,
        updated_at: new Date().toISOString()
      };
      
      mockSupabase.from().update().eq().select().single.mockResolvedValue({
        data: mockUpdatedProgress,
        error: null
      });
      
      const request = testUtils.createMockRequest('PUT', '/api/progress', updateData);
      const response = await PUT(request);
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.progress.progress_percentage).toBe(75);
      expect(data.data.progress.time_spent).toBe(1200);
    });

    it('应该支持批量更新进度', async () => {
      const batchUpdateData = {
        updates: [
          {
            id: 'progress-1',
            progress_percentage: 80,
            time_spent: 1500
          },
          {
            id: 'progress-2',
            progress_percentage: 90,
            status: 'completed',
            score: 88
          }
        ]
      };
      
      const mockUpdatedProgress = [
        {
          id: 'progress-1',
          progress_percentage: 80,
          time_spent: 1500,
          updated_at: new Date().toISOString()
        },
        {
          id: 'progress-2',
          progress_percentage: 90,
          status: 'completed',
          score: 88,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];
      
      mockSupabase.from().upsert().select.mockResolvedValue({
        data: mockUpdatedProgress,
        error: null
      });
      
      const request = testUtils.createMockRequest('PUT', '/api/progress', batchUpdateData);
      const response = await PUT(request);
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.progress).toHaveLength(2);
      expect(data.data.progress[1].status).toBe('completed');
    });

    it('应该验证更新权限', async () => {
      mockSecurity.validatePermissions.mockResolvedValue({ 
        allowed: false, 
        error: 'Cannot update this progress record' 
      });
      
      const updateData = {
        id: 'progress-update-123',
        progress_percentage: 85
      };
      
      const request = testUtils.createMockRequest('PUT', '/api/progress', updateData);
      const response = await PUT(request);
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Cannot update this progress record');
    });

    it('应该处理进度不存在', async () => {
      const updateData = {
        id: 'non-existent-progress',
        progress_percentage: 85
      };
      
      mockSupabase.from().update().eq().select().single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'The result contains 0 rows' }
      });
      
      const request = testUtils.createMockRequest('PUT', '/api/progress', updateData);
      const response = await PUT(request);
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Progress record not found');
    });
  });

  describe('GET /api/progress/[id]', () => {
    it('应该成功获取进度详情', async () => {
      const mockProgress = {
        id: 'progress-detail-123',
        user_id: 'user-123',
        course_id: 'course-1',
        lesson_id: 'lesson-1',
        status: 'completed',
        progress_percentage: 100,
        time_spent: 1800,
        score: 95,
        completed_at: '2024-01-15T10:30:00Z',
        created_at: '2024-01-15T10:00:00Z',
        updated_at: '2024-01-15T10:30:00Z',
        // 关联数据
        course: {
          id: 'course-1',
          title: '课程标题',
          description: '课程描述'
        },
        lesson: {
          id: 'lesson-1',
          title: '课程章节',
          duration: 1800
        },
        user: {
          id: 'user-123',
          username: 'testuser',
          full_name: '测试用户'
        }
      };
      
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: mockProgress,
        error: null
      });
      
      const request = testUtils.createMockRequest('GET', '/api/progress/progress-detail-123');
      const response = await GetProgressById(request, { params: { id: 'progress-detail-123' } });
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.progress.id).toBe('progress-detail-123');
      expect(data.data.progress.course.title).toBe('课程标题');
      expect(data.data.progress.lesson.title).toBe('课程章节');
    });

    it('应该处理进度不存在', async () => {
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'The result contains 0 rows' }
      });
      
      const request = testUtils.createMockRequest('GET', '/api/progress/non-existent');
      const response = await GetProgressById(request, { params: { id: 'non-existent' } });
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Progress record not found');
    });
  });

  describe('GET /api/users/[id]/progress', () => {
    it('应该成功获取用户学习进度', async () => {
      const mockUserProgress = {
        user_id: 'user-123',
        total_courses: 5,
        completed_courses: 2,
        in_progress_courses: 2,
        not_started_courses: 1,
        total_lessons: 50,
        completed_lessons: 25,
        total_time_spent: 18000, // 5小时
        average_score: 87.5,
        progress_by_course: [
          {
            course_id: 'course-1',
            course_title: '前端开发基础',
            progress_percentage: 100,
            status: 'completed',
            lessons_completed: 10,
            total_lessons: 10,
            time_spent: 7200,
            average_score: 92
          },
          {
            course_id: 'course-2',
            course_title: 'JavaScript进阶',
            progress_percentage: 60,
            status: 'in_progress',
            lessons_completed: 6,
            total_lessons: 10,
            time_spent: 5400,
            average_score: 85
          }
        ],
        recent_activities: [
          {
            id: 'activity-1',
            lesson_id: 'lesson-5',
            lesson_title: 'React组件',
            action: 'completed',
            score: 95,
            timestamp: '2024-01-15T10:30:00Z'
          }
        ]
      };
      
      mockSupabase.rpc.mockResolvedValue({
        data: mockUserProgress,
        error: null
      });
      
      const request = testUtils.createMockRequest('GET', '/api/users/user-123/progress');
      const response = await GetUserProgress(request, { params: { id: 'user-123' } });
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.progress.total_courses).toBe(5);
      expect(data.data.progress.completed_courses).toBe(2);
      expect(data.data.progress.progress_by_course).toHaveLength(2);
      expect(data.data.progress.recent_activities).toHaveLength(1);
    });

    it('应该支持AI分析和建议', async () => {
      const mockUserProgress = {
        user_id: 'user-123',
        total_courses: 3,
        completed_courses: 1,
        in_progress_courses: 2,
        average_score: 78
      };
      
      const mockAiAnalysis = {
        performance_level: 'intermediate',
        strengths: ['前端基础扎实', '学习积极性高'],
        weaknesses: ['JavaScript异步编程需要加强', '项目实践经验不足'],
        recommendations: [
          {
            type: 'course',
            title: 'JavaScript异步编程专项训练',
            reason: '提升异步编程能力',
            priority: 'high'
          },
          {
            type: 'practice',
            title: '完成一个完整的前端项目',
            reason: '增加实践经验',
            priority: 'medium'
          }
        ],
        predicted_completion_time: '2024-03-15',
        difficulty_adjustment: 'maintain' // maintain, increase, decrease
      };
      
      mockSupabase.rpc.mockResolvedValue({
        data: mockUserProgress,
        error: null
      });
      
      mockAiService.analyzeProgress.mockResolvedValue({
        success: true,
        analysis: mockAiAnalysis
      });
      
      const request = testUtils.createMockRequest('GET', '/api/users/user-123/progress?include_ai_analysis=true');
      const response = await GetUserProgress(request, { params: { id: 'user-123' } });
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.ai_analysis.performance_level).toBe('intermediate');
      expect(data.data.ai_analysis.recommendations).toHaveLength(2);
      expect(mockAiService.analyzeProgress).toHaveBeenCalledWith(mockUserProgress);
    });

    it('应该验证用户访问权限', async () => {
      mockSecurity.validatePermissions.mockResolvedValue({ 
        allowed: false, 
        error: 'Cannot access this user progress' 
      });
      
      const request = testUtils.createMockRequest('GET', '/api/users/other-user-123/progress');
      const response = await GetUserProgress(request, { params: { id: 'other-user-123' } });
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Cannot access this user progress');
    });
  });

  describe('POST /api/lessons/[id]/progress', () => {
    it('应该成功更新课程进度', async () => {
      const progressUpdate = {
        progress_percentage: 100,
        time_spent: 1800,
        score: 95,
        status: 'completed'
      };
      
      const mockUpdatedProgress = {
        id: 'lesson-progress-123',
        user_id: 'user-123',
        course_id: 'course-1',
        lesson_id: 'lesson-1',
        status: 'completed',
        progress_percentage: 100,
        time_spent: 1800,
        score: 95,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      mockSupabase.from().upsert().select().single.mockResolvedValue({
        data: mockUpdatedProgress,
        error: null
      });
      
      const request = testUtils.createMockRequest('POST', '/api/lessons/lesson-1/progress', progressUpdate);
      const response = await UpdateLessonProgress(request, { params: { id: 'lesson-1' } });
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.progress.status).toBe('completed');
      expect(data.data.progress.score).toBe(95);
    });

    it('应该自动更新课程整体进度', async () => {
      const progressUpdate = {
        progress_percentage: 100,
        status: 'completed'
      };
      
      const mockLessonProgress = {
        id: 'lesson-progress-123',
        user_id: 'user-123',
        course_id: 'course-1',
        lesson_id: 'lesson-1',
        status: 'completed',
        progress_percentage: 100
      };
      
      const mockCourseProgress = {
        user_id: 'user-123',
        course_id: 'course-1',
        overall_progress: 75, // 课程整体进度
        completed_lessons: 3,
        total_lessons: 4
      };
      
      mockSupabase.from().upsert().select().single.mockResolvedValue({
        data: mockLessonProgress,
        error: null
      });
      
      mockSupabase.rpc.mockResolvedValue({
        data: mockCourseProgress,
        error: null
      });
      
      const request = testUtils.createMockRequest('POST', '/api/lessons/lesson-1/progress', progressUpdate);
      const response = await UpdateLessonProgress(request, { params: { id: 'lesson-1' } });
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.course_progress.overall_progress).toBe(75);
      expect(data.data.course_progress.completed_lessons).toBe(3);
    });

    it('应该验证课程访问权限', async () => {
      mockSecurity.validatePermissions.mockResolvedValue({ 
        allowed: false, 
        error: 'Not enrolled in this course' 
      });
      
      const progressUpdate = {
        progress_percentage: 50
      };
      
      const request = testUtils.createMockRequest('POST', '/api/lessons/lesson-1/progress', progressUpdate);
      const response = await UpdateLessonProgress(request, { params: { id: 'lesson-1' } });
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Not enrolled in this course');
    });

    it('应该处理课程不存在', async () => {
      const progressUpdate = {
        progress_percentage: 50
      };
      
      mockSupabase.from().upsert().select().single.mockResolvedValue({
        data: null,
        error: { code: '23503', message: 'foreign key constraint violation' }
      });
      
      const request = testUtils.createMockRequest('POST', '/api/lessons/non-existent-lesson/progress', progressUpdate);
      const response = await UpdateLessonProgress(request, { params: { id: 'non-existent-lesson' } });
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Lesson not found');
    });
  });

  describe('错误处理和边界情况', () => {
    it('应该处理数据库连接错误', async () => {
      const connectionError = new Error('Database connection failed');
      mockSupabase.from().select().order().limit().range.mockRejectedValue(connectionError);
      
      const request = testUtils.createMockRequest('GET', '/api/progress');
      const response = await GET(request);
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Database connection failed');
      expect(mockApiMonitor.recordError).toHaveBeenCalledWith('call-id-123', connectionError);
    });

    it('应该处理AI服务错误', async () => {
      const mockUserProgress = {
        user_id: 'user-123',
        total_courses: 3
      };
      
      const aiError = new Error('AI service unavailable');
      
      mockSupabase.rpc.mockResolvedValue({
        data: mockUserProgress,
        error: null
      });
      
      mockAiService.analyzeProgress.mockRejectedValue(aiError);
      
      const request = testUtils.createMockRequest('GET', '/api/users/user-123/progress?include_ai_analysis=true');
      const response = await GetUserProgress(request, { params: { id: 'user-123' } });
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.progress).toBeDefined();
      expect(data.data.ai_analysis).toBeUndefined(); // AI分析失败时不包含
      expect(data.warnings).toContain('AI analysis unavailable');
    });

    it('应该处理无效的进度数据', async () => {
      const invalidProgress = {
        user_id: 'user-123',
        course_id: 'course-1',
        lesson_id: 'lesson-1',
        progress_percentage: -10, // 无效值
        time_spent: 'invalid' // 无效类型
      };
      
      const request = testUtils.createMockRequest('POST', '/api/progress', invalidProgress);
      const response = await POST(request);
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid progress data');
    });

    it('应该处理并发更新冲突', async () => {
      const updateData = {
        id: 'progress-123',
        progress_percentage: 80
      };
      
      const conflictError = {
        code: '40001',
        message: 'serialization_failure'
      };
      
      mockSupabase.from().update().eq().select().single.mockResolvedValue({
        data: null,
        error: conflictError
      });
      
      const request = testUtils.createMockRequest('PUT', '/api/progress', updateData);
      const response = await PUT(request);
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(409);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Progress update conflict, please retry');
    });
  });

  describe('性能测试', () => {
    it('应该高效处理大量进度查询', async () => {
      const largeProgressList = Array.from({ length: 100 }, (_, i) => ({
        id: `progress-${i}`,
        user_id: `user-${i % 10}`,
        course_id: `course-${i % 5}`,
        lesson_id: `lesson-${i}`,
        status: i % 3 === 0 ? 'completed' : 'in_progress',
        progress_percentage: Math.floor(Math.random() * 100)
      }));
      
      mockSupabase.from().select().order().limit().range.mockResolvedValue({
        data: largeProgressList,
        error: null,
        count: 100
      });
      
      const startTime = Date.now();
      const request = testUtils.createMockRequest('GET', '/api/progress?limit=100');
      const response = await GET(request);
      const endTime = Date.now();
      
      expect(response.status).toBe(200);
      expect(endTime - startTime).toBeLessThan(2000); // 应该在2秒内完成
    });

    it('应该高效处理批量进度更新', async () => {
      const batchUpdates = Array.from({ length: 50 }, (_, i) => ({
        id: `progress-${i}`,
        progress_percentage: Math.floor(Math.random() * 100),
        time_spent: Math.floor(Math.random() * 3600)
      }));
      
      const batchUpdateData = {
        updates: batchUpdates
      };
      
      mockSupabase.from().upsert().select.mockResolvedValue({
        data: batchUpdates,
        error: null
      });
      
      const startTime = Date.now();
      const request = testUtils.createMockRequest('PUT', '/api/progress', batchUpdateData);
      const response = await PUT(request);
      const endTime = Date.now();
      
      expect(response.status).toBe(200);
      expect(endTime - startTime).toBeLessThan(3000); // 应该在3秒内完成
    });

    it('应该高效处理并发进度更新', async () => {
      const progressUpdate = {
        progress_percentage: 75,
        time_spent: 1200
      };
      
      mockSupabase.from().upsert().select().single.mockResolvedValue({
        data: {
          id: 'concurrent-progress',
          ...progressUpdate,
          updated_at: new Date().toISOString()
        },
        error: null
      });
      
      const promises = Array.from({ length: 10 }, (_, i) => {
        const request = testUtils.createMockRequest('POST', `/api/lessons/lesson-${i}/progress`, progressUpdate);
        return UpdateLessonProgress(request, { params: { id: `lesson-${i}` } });
      });
      
      const startTime = Date.now();
      const responses = await Promise.all(promises);
      const endTime = Date.now();
      
      expect(responses).toHaveLength(10);
      expect(responses.every(r => r.status === 200)).toBe(true);
      expect(endTime - startTime).toBeLessThan(5000); // 应该在5秒内完成
    });
  });
});