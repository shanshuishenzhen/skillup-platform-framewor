/**
 * 学习进度API集成测试
 * 测试学习会话、进度跟踪、学习路径、成就系统等功能
 */

import { jest } from '@jest/globals';
import request from 'supertest';
import { app } from '../../api/app';
import { supabase } from '../../utils/supabase';
import { cacheService } from '../../services/cacheService';
import { learningProgressService } from '../../services/learningProgressService';
import { aiService } from '../../services/aiService';
import { auditService } from '../../services/auditService';
import { analyticsService } from '../../services/analyticsService';
import { envConfig } from '../../utils/envConfig';
import { logger } from '../../utils/logger';
import jwt from 'jsonwebtoken';

// Mock 依赖
jest.mock('../../utils/supabase');
jest.mock('../../services/cacheService');
jest.mock('../../services/learningProgressService');
jest.mock('../../services/aiService');
jest.mock('../../services/auditService');
jest.mock('../../services/analyticsService');
jest.mock('../../utils/envConfig');
jest.mock('../../utils/logger');
jest.mock('jsonwebtoken');

// Mock 对象
const mockSupabase = supabase as jest.Mocked<typeof supabase>;
const mockCacheService = cacheService as jest.Mocked<typeof cacheService>;
const mockLearningProgressService = learningProgressService as jest.Mocked<typeof learningProgressService>;
const mockAiService = aiService as jest.Mocked<typeof aiService>;
const mockAuditService = auditService as jest.Mocked<typeof auditService>;
const mockAnalyticsService = analyticsService as jest.Mocked<typeof analyticsService>;
const mockEnvConfig = envConfig as jest.Mocked<typeof envConfig>;
const mockLogger = logger as jest.Mocked<typeof logger>;
const mockJwt = jwt as jest.Mocked<typeof jwt>;

// Mock 接口定义
interface MockSupabaseQuery {
  select: jest.MockedFunction<any>;
  eq: jest.MockedFunction<any>;
  neq: jest.MockedFunction<any>;
  gt: jest.MockedFunction<any>;
  gte: jest.MockedFunction<any>;
  lt: jest.MockedFunction<any>;
  lte: jest.MockedFunction<any>;
  like: jest.MockedFunction<any>;
  ilike: jest.MockedFunction<any>;
  in: jest.MockedFunction<any>;
  is: jest.MockedFunction<any>;
  order: jest.MockedFunction<any>;
  limit: jest.MockedFunction<any>;
  range: jest.MockedFunction<any>;
  single: jest.MockedFunction<any>;
  mockResolvedValue: jest.MockedFunction<any>;
}

// 测试数据
const testUser = {
  id: 'user-123',
  email: 'test@example.com',
  username: 'testuser',
  role: 'student'
};

const testCourse = {
  id: 'course-123',
  title: 'JavaScript基础教程',
  description: '从零开始学习JavaScript',
  instructor_id: 'instructor-123',
  duration: 3600, // 60分钟
  difficulty: 'beginner',
  category_id: 'category-123',
  status: 'published'
};

const testLesson = {
  id: 'lesson-123',
  course_id: 'course-123',
  title: '变量和数据类型',
  content: '学习JavaScript的基本数据类型',
  duration: 600, // 10分钟
  order_index: 1,
  type: 'video'
};

const testLearningSession = {
  id: 'session-123',
  user_id: 'user-123',
  course_id: 'course-123',
  lesson_id: 'lesson-123',
  start_time: '2024-01-15T10:00:00Z',
  end_time: null,
  duration: 0,
  progress_percentage: 0,
  status: 'active',
  device_info: {
    type: 'desktop',
    os: 'Windows 10',
    browser: 'Chrome 120'
  },
  created_at: '2024-01-15T10:00:00Z',
  updated_at: '2024-01-15T10:00:00Z'
};

const testLearningProgress = {
  id: 'progress-123',
  user_id: 'user-123',
  course_id: 'course-123',
  lesson_id: 'lesson-123',
  progress_percentage: 75,
  time_spent: 450, // 7.5分钟
  completed: false,
  last_accessed: '2024-01-15T10:07:30Z',
  notes: '学习笔记内容',
  bookmarks: [
    {
      timestamp: 180,
      note: '重要知识点'
    }
  ],
  quiz_scores: [
    {
      quiz_id: 'quiz-123',
      score: 85,
      attempts: 1,
      completed_at: '2024-01-15T10:05:00Z'
    }
  ]
};

const testLearningPath = {
  id: 'path-123',
  title: 'Web开发全栈路径',
  description: '从前端到后端的完整学习路径',
  creator_id: 'instructor-123',
  difficulty: 'intermediate',
  estimated_duration: 14400, // 240小时
  courses: [
    {
      course_id: 'course-123',
      order_index: 1,
      required: true
    },
    {
      course_id: 'course-456',
      order_index: 2,
      required: true
    }
  ],
  prerequisites: ['basic-programming'],
  learning_objectives: [
    '掌握HTML/CSS基础',
    '熟练使用JavaScript',
    '了解React框架',
    '掌握Node.js后端开发'
  ],
  tags: ['web-development', 'full-stack', 'javascript'],
  status: 'published',
  enrollment_count: 156,
  completion_rate: 0.68,
  average_rating: 4.7,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-10T00:00:00Z'
};

const testAchievement = {
  id: 'achievement-123',
  name: '学习新手',
  description: '完成第一门课程',
  icon: 'trophy',
  type: 'course_completion',
  criteria: {
    courses_completed: 1
  },
  points: 100,
  rarity: 'common',
  category: 'learning'
};

const testUserAchievement = {
  id: 'user-achievement-123',
  user_id: 'user-123',
  achievement_id: 'achievement-123',
  earned_at: '2024-01-15T10:00:00Z',
  progress: 100,
  metadata: {
    course_id: 'course-123',
    course_title: 'JavaScript基础教程'
  }
};

const validJwtToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoidXNlci0xMjMiLCJyb2xlIjoic3R1ZGVudCIsImlhdCI6MTcwNTMxNDAwMCwiZXhwIjoxNzA1NDAwNDAwfQ.signature';
const instructorJwtToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiaW5zdHJ1Y3Rvci0xMjMiLCJyb2xlIjoiaW5zdHJ1Y3RvciIsImlhdCI6MTcwNTMxNDAwMCwiZXhwIjoxNzA1NDAwNDAwfQ.signature';

describe('Learning API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // 设置环境配置
    mockEnvConfig.get.mockImplementation((key, defaultValue) => {
      const config = {
        'JWT_SECRET': 'test-jwt-secret',
        'LEARNING_SESSION_TIMEOUT': '3600',
        'MAX_CONCURRENT_SESSIONS': '3',
        'PROGRESS_CACHE_TTL': '300',
        'ACHIEVEMENT_CACHE_TTL': '1800',
        'AI_RECOMMENDATIONS_ENABLED': 'true',
        'MIN_LESSON_DURATION': '30',
        'MAX_NOTES_LENGTH': '2000'
      };
      return config[key] || defaultValue;
    });
    
    // 设置JWT验证
    mockJwt.verify.mockImplementation((token) => {
      if (token === validJwtToken) {
        return { user_id: 'user-123', role: 'student' };
      } else if (token === instructorJwtToken) {
        return { user_id: 'instructor-123', role: 'instructor' };
      }
      throw new Error('Invalid token');
    });
    
    // 设置数据库 Mock
    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      neq: jest.fn().mockReturnThis(),
      gt: jest.fn().mockReturnThis(),
      lt: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      like: jest.fn().mockReturnThis(),
      ilike: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: testLearningSession, error: null }),
      mockResolvedValue: jest.fn().mockResolvedValue({ data: [testLearningSession], error: null })
    } as MockSupabaseQuery);
    
    // 设置缓存服务
    mockCacheService.get.mockResolvedValue(null);
    mockCacheService.set.mockResolvedValue(undefined);
    mockCacheService.del.mockResolvedValue(undefined);
    
    // 设置学习进度服务
    mockLearningProgressService.startSession.mockResolvedValue({
      success: true,
      session: testLearningSession
    });
    mockLearningProgressService.updateProgress.mockResolvedValue({
      success: true,
      progress: testLearningProgress
    });
    mockLearningProgressService.endSession.mockResolvedValue({
      success: true
    });
    
    // 设置AI服务
    mockAiService.getPersonalizedRecommendations.mockResolvedValue({
      success: true,
      recommendations: [
        {
          type: 'course',
          id: 'course-456',
          title: 'React进阶教程',
          reason: '基于您的JavaScript学习进度推荐',
          confidence: 0.85
        }
      ]
    });
    
    // 设置审计和分析服务
    mockAuditService.log.mockResolvedValue(undefined);
    mockAnalyticsService.track.mockResolvedValue(undefined);
  });

  /**
   * 开始学习会话测试
   */
  describe('POST /api/learning/sessions', () => {
    const sessionData = {
      course_id: 'course-123',
      lesson_id: 'lesson-123',
      device_info: {
        type: 'desktop',
        os: 'Windows 10',
        browser: 'Chrome 120'
      }
    };

    it('应该成功开始学习会话', async () => {
      // Mock 课程和课时存在
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: testCourse,
        error: null
      }).mockResolvedValueOnce({
        data: testLesson,
        error: null
      });
      
      const response = await request(app)
        .post('/api/learning/sessions')
        .set('Authorization', `Bearer ${validJwtToken}`)
        .send(sessionData)
        .expect(201);
      
      expect(response.body).toEqual({
        success: true,
        message: 'Learning session started successfully',
        data: {
          session: expect.objectContaining({
            id: 'session-123',
            user_id: 'user-123',
            course_id: 'course-123',
            lesson_id: 'lesson-123',
            status: 'active'
          })
        }
      });
      
      expect(mockLearningProgressService.startSession).toHaveBeenCalledWith(
        'user-123',
        'course-123',
        'lesson-123',
        sessionData.device_info
      );
      
      expect(mockAnalyticsService.track).toHaveBeenCalledWith({
        event: 'learning_session_started',
        user_id: 'user-123',
        properties: {
          course_id: 'course-123',
          lesson_id: 'lesson-123'
        }
      });
    });

    it('应该验证课程存在', async () => {
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' }
      });
      
      const response = await request(app)
        .post('/api/learning/sessions')
        .set('Authorization', `Bearer ${validJwtToken}`)
        .send(sessionData)
        .expect(404);
      
      expect(response.body).toEqual({
        success: false,
        error: 'Course not found',
        code: 'COURSE_NOT_FOUND'
      });
    });

    it('应该验证课时存在', async () => {
      mockSupabase.from().select().eq().single
        .mockResolvedValueOnce({ data: testCourse, error: null })
        .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } });
      
      const response = await request(app)
        .post('/api/learning/sessions')
        .set('Authorization', `Bearer ${validJwtToken}`)
        .send(sessionData)
        .expect(404);
      
      expect(response.body.error).toBe('Lesson not found');
    });

    it('应该检查并发会话限制', async () => {
      // Mock 已有活跃会话
      mockSupabase.from().select().eq().eq().mockResolvedValue({
        data: [{ id: 'session-1' }, { id: 'session-2' }, { id: 'session-3' }],
        error: null,
        count: 3
      });
      
      const response = await request(app)
        .post('/api/learning/sessions')
        .set('Authorization', `Bearer ${validJwtToken}`)
        .send(sessionData)
        .expect(400);
      
      expect(response.body).toEqual({
        success: false,
        error: 'Maximum concurrent sessions reached',
        code: 'MAX_SESSIONS_REACHED'
      });
    });

    it('应该验证必填字段', async () => {
      const invalidData = {
        course_id: 'course-123'
        // 缺少 lesson_id
      };
      
      const response = await request(app)
        .post('/api/learning/sessions')
        .set('Authorization', `Bearer ${validJwtToken}`)
        .send(invalidData)
        .expect(400);
      
      expect(response.body.error).toContain('lesson_id is required');
    });
  });

  /**
   * 更新学习进度测试
   */
  describe('PUT /api/learning/sessions/:sessionId/progress', () => {
    const progressData = {
      progress_percentage: 75,
      time_spent: 450,
      notes: '学习笔记内容',
      bookmarks: [
        {
          timestamp: 180,
          note: '重要知识点'
        }
      ]
    };

    it('应该成功更新学习进度', async () => {
      mockSupabase.from().select().eq().eq().single.mockResolvedValue({
        data: testLearningSession,
        error: null
      });
      
      const response = await request(app)
        .put('/api/learning/sessions/session-123/progress')
        .set('Authorization', `Bearer ${validJwtToken}`)
        .send(progressData)
        .expect(200);
      
      expect(response.body).toEqual({
        success: true,
        message: 'Progress updated successfully',
        data: {
          progress: expect.objectContaining({
            progress_percentage: 75,
            time_spent: 450,
            notes: '学习笔记内容'
          })
        }
      });
      
      expect(mockLearningProgressService.updateProgress).toHaveBeenCalledWith(
        'session-123',
        progressData
      );
    });

    it('应该验证会话所有权', async () => {
      const otherUserSession = {
        ...testLearningSession,
        user_id: 'other-user-123'
      };
      
      mockSupabase.from().select().eq().eq().single.mockResolvedValue({
        data: otherUserSession,
        error: null
      });
      
      const response = await request(app)
        .put('/api/learning/sessions/session-123/progress')
        .set('Authorization', `Bearer ${validJwtToken}`)
        .send(progressData)
        .expect(403);
      
      expect(response.body.error).toBe('Access denied to this session');
    });

    it('应该验证进度百分比范围', async () => {
      const invalidProgress = {
        progress_percentage: 150 // 超过100%
      };
      
      const response = await request(app)
        .put('/api/learning/sessions/session-123/progress')
        .set('Authorization', `Bearer ${validJwtToken}`)
        .send(invalidProgress)
        .expect(400);
      
      expect(response.body.error).toContain('Progress percentage must be between 0 and 100');
    });

    it('应该验证笔记长度', async () => {
      const longNotes = {
        notes: 'a'.repeat(2001) // 超过最大长度
      };
      
      const response = await request(app)
        .put('/api/learning/sessions/session-123/progress')
        .set('Authorization', `Bearer ${validJwtToken}`)
        .send(longNotes)
        .expect(400);
      
      expect(response.body.error).toContain('Notes are too long');
    });

    it('应该自动检测课程完成', async () => {
      const completionData = {
        progress_percentage: 100,
        time_spent: 600
      };
      
      mockLearningProgressService.updateProgress.mockResolvedValue({
        success: true,
        progress: { ...testLearningProgress, completed: true },
        achievements: [testUserAchievement]
      });
      
      const response = await request(app)
        .put('/api/learning/sessions/session-123/progress')
        .set('Authorization', `Bearer ${validJwtToken}`)
        .send(completionData)
        .expect(200);
      
      expect(response.body.data.achievements).toBeDefined();
      expect(response.body.data.achievements).toHaveLength(1);
    });
  });

  /**
   * 结束学习会话测试
   */
  describe('POST /api/learning/sessions/:sessionId/end', () => {
    it('应该成功结束学习会话', async () => {
      mockSupabase.from().select().eq().eq().single.mockResolvedValue({
        data: testLearningSession,
        error: null
      });
      
      const response = await request(app)
        .post('/api/learning/sessions/session-123/end')
        .set('Authorization', `Bearer ${validJwtToken}`)
        .expect(200);
      
      expect(response.body).toEqual({
        success: true,
        message: 'Learning session ended successfully',
        data: {
          session_duration: expect.any(Number),
          total_progress: expect.any(Number)
        }
      });
      
      expect(mockLearningProgressService.endSession).toHaveBeenCalledWith('session-123');
      
      expect(mockAnalyticsService.track).toHaveBeenCalledWith({
        event: 'learning_session_ended',
        user_id: 'user-123',
        properties: expect.any(Object)
      });
    });

    it('应该处理已结束的会话', async () => {
      const endedSession = {
        ...testLearningSession,
        status: 'completed',
        end_time: '2024-01-15T11:00:00Z'
      };
      
      mockSupabase.from().select().eq().eq().single.mockResolvedValue({
        data: endedSession,
        error: null
      });
      
      const response = await request(app)
        .post('/api/learning/sessions/session-123/end')
        .set('Authorization', `Bearer ${validJwtToken}`)
        .expect(400);
      
      expect(response.body).toEqual({
        success: false,
        error: 'Session is already ended',
        code: 'SESSION_ALREADY_ENDED'
      });
    });
  });

  /**
   * 获取学习进度测试
   */
  describe('GET /api/learning/progress', () => {
    it('应该返回用户的学习进度', async () => {
      const progressList = [testLearningProgress];
      
      mockSupabase.from().select().eq().order().mockResolvedValue({
        data: progressList,
        error: null
      });
      
      const response = await request(app)
        .get('/api/learning/progress')
        .set('Authorization', `Bearer ${validJwtToken}`)
        .expect(200);
      
      expect(response.body).toEqual({
        success: true,
        data: {
          progress: expect.arrayContaining([
            expect.objectContaining({
              id: 'progress-123',
              course_id: 'course-123',
              progress_percentage: 75
            })
          ])
        }
      });
    });

    it('应该支持课程筛选', async () => {
      const response = await request(app)
        .get('/api/learning/progress?course_id=course-123')
        .set('Authorization', `Bearer ${validJwtToken}`)
        .expect(200);
      
      expect(mockSupabase.from().eq).toHaveBeenCalledWith('course_id', 'course-123');
    });

    it('应该支持完成状态筛选', async () => {
      const response = await request(app)
        .get('/api/learning/progress?completed=true')
        .set('Authorization', `Bearer ${validJwtToken}`)
        .expect(200);
      
      expect(mockSupabase.from().eq).toHaveBeenCalledWith('completed', true);
    });

    it('应该使用缓存', async () => {
      // 第一次请求
      await request(app)
        .get('/api/learning/progress')
        .set('Authorization', `Bearer ${validJwtToken}`)
        .expect(200);
      
      // 第二次请求应该使用缓存
      mockCacheService.get.mockResolvedValue(JSON.stringify([testLearningProgress]));
      
      const response = await request(app)
        .get('/api/learning/progress')
        .set('Authorization', `Bearer ${validJwtToken}`)
        .expect(200);
      
      expect(mockCacheService.get).toHaveBeenCalledWith(
        expect.stringContaining('user:user-123:progress')
      );
    });
  });

  /**
   * 学习路径测试
   */
  describe('GET /api/learning/paths', () => {
    it('应该返回学习路径列表', async () => {
      const paths = [testLearningPath];
      
      mockSupabase.from().select().eq().order().mockResolvedValue({
        data: paths,
        error: null
      });
      
      const response = await request(app)
        .get('/api/learning/paths')
        .set('Authorization', `Bearer ${validJwtToken}`)
        .expect(200);
      
      expect(response.body).toEqual({
        success: true,
        data: {
          paths: expect.arrayContaining([
            expect.objectContaining({
              id: 'path-123',
              title: 'Web开发全栈路径',
              difficulty: 'intermediate'
            })
          ])
        }
      });
    });

    it('应该支持难度筛选', async () => {
      const response = await request(app)
        .get('/api/learning/paths?difficulty=beginner')
        .set('Authorization', `Bearer ${validJwtToken}`)
        .expect(200);
      
      expect(mockSupabase.from().eq).toHaveBeenCalledWith('difficulty', 'beginner');
    });

    it('应该支持标签筛选', async () => {
      const response = await request(app)
        .get('/api/learning/paths?tags=web-development,javascript')
        .set('Authorization', `Bearer ${validJwtToken}`)
        .expect(200);
      
      expect(mockSupabase.from().contains).toHaveBeenCalledWith(
        'tags',
        ['web-development', 'javascript']
      );
    });
  });

  /**
   * 学习路径注册测试
   */
  describe('POST /api/learning/paths/:pathId/enroll', () => {
    it('应该成功注册学习路径', async () => {
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: testLearningPath,
        error: null
      });
      
      // Mock 检查是否已注册
      mockSupabase.from().select().eq().eq().single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' }
      });
      
      mockSupabase.from().insert().select().single.mockResolvedValue({
        data: {
          id: 'enrollment-123',
          user_id: 'user-123',
          path_id: 'path-123',
          enrolled_at: '2024-01-15T10:00:00Z',
          progress_percentage: 0
        },
        error: null
      });
      
      const response = await request(app)
        .post('/api/learning/paths/path-123/enroll')
        .set('Authorization', `Bearer ${validJwtToken}`)
        .expect(201);
      
      expect(response.body).toEqual({
        success: true,
        message: 'Successfully enrolled in learning path',
        data: {
          enrollment: expect.objectContaining({
            user_id: 'user-123',
            path_id: 'path-123',
            progress_percentage: 0
          })
        }
      });
      
      expect(mockAnalyticsService.track).toHaveBeenCalledWith({
        event: 'learning_path_enrolled',
        user_id: 'user-123',
        properties: {
          path_id: 'path-123',
          path_title: 'Web开发全栈路径'
        }
      });
    });

    it('应该处理重复注册', async () => {
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: testLearningPath,
        error: null
      });
      
      // Mock 已经注册
      mockSupabase.from().select().eq().eq().single.mockResolvedValue({
        data: { id: 'enrollment-123' },
        error: null
      });
      
      const response = await request(app)
        .post('/api/learning/paths/path-123/enroll')
        .set('Authorization', `Bearer ${validJwtToken}`)
        .expect(400);
      
      expect(response.body).toEqual({
        success: false,
        error: 'Already enrolled in this learning path',
        code: 'ALREADY_ENROLLED'
      });
    });

    it('应该验证学习路径存在', async () => {
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' }
      });
      
      const response = await request(app)
        .post('/api/learning/paths/path-123/enroll')
        .set('Authorization', `Bearer ${validJwtToken}`)
        .expect(404);
      
      expect(response.body.error).toBe('Learning path not found');
    });
  });

  /**
   * 学习推荐测试
   */
  describe('GET /api/learning/recommendations', () => {
    it('应该返回个性化推荐', async () => {
      const response = await request(app)
        .get('/api/learning/recommendations')
        .set('Authorization', `Bearer ${validJwtToken}`)
        .expect(200);
      
      expect(response.body).toEqual({
        success: true,
        data: {
          recommendations: expect.arrayContaining([
            expect.objectContaining({
              type: 'course',
              id: 'course-456',
              title: 'React进阶教程',
              reason: '基于您的JavaScript学习进度推荐',
              confidence: 0.85
            })
          ])
        }
      });
      
      expect(mockAiService.getPersonalizedRecommendations).toHaveBeenCalledWith(
        'user-123',
        expect.any(Object)
      );
    });

    it('应该支持推荐类型筛选', async () => {
      const response = await request(app)
        .get('/api/learning/recommendations?type=course')
        .set('Authorization', `Bearer ${validJwtToken}`)
        .expect(200);
      
      expect(mockAiService.getPersonalizedRecommendations).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({ type: 'course' })
      );
    });

    it('应该使用缓存', async () => {
      // 第一次请求
      await request(app)
        .get('/api/learning/recommendations')
        .set('Authorization', `Bearer ${validJwtToken}`)
        .expect(200);
      
      // 第二次请求应该使用缓存
      const cachedRecommendations = [
        {
          type: 'course',
          id: 'course-456',
          title: 'React进阶教程',
          reason: '基于您的JavaScript学习进度推荐',
          confidence: 0.85
        }
      ];
      
      mockCacheService.get.mockResolvedValue(JSON.stringify(cachedRecommendations));
      
      const response = await request(app)
        .get('/api/learning/recommendations')
        .set('Authorization', `Bearer ${validJwtToken}`)
        .expect(200);
      
      expect(mockCacheService.get).toHaveBeenCalledWith(
        expect.stringContaining('user:user-123:recommendations')
      );
    });

    it('应该处理AI服务不可用', async () => {
      mockAiService.getPersonalizedRecommendations.mockResolvedValue({
        success: false,
        error: 'AI service unavailable'
      });
      
      // 应该返回默认推荐
      mockSupabase.from().select().eq().order().limit.mockResolvedValue({
        data: [testCourse],
        error: null
      });
      
      const response = await request(app)
        .get('/api/learning/recommendations')
        .set('Authorization', `Bearer ${validJwtToken}`)
        .expect(200);
      
      expect(response.body.data.recommendations).toBeDefined();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'AI recommendations unavailable, using fallback',
        expect.any(Object)
      );
    });
  });

  /**
   * 成就系统测试
   */
  describe('GET /api/learning/achievements', () => {
    it('应该返回用户成就列表', async () => {
      const achievements = [testUserAchievement];
      
      mockSupabase.from().select().eq().order().mockResolvedValue({
        data: achievements,
        error: null
      });
      
      const response = await request(app)
        .get('/api/learning/achievements')
        .set('Authorization', `Bearer ${validJwtToken}`)
        .expect(200);
      
      expect(response.body).toEqual({
        success: true,
        data: {
          achievements: expect.arrayContaining([
            expect.objectContaining({
              id: 'user-achievement-123',
              achievement_id: 'achievement-123',
              earned_at: '2024-01-15T10:00:00Z'
            })
          ])
        }
      });
    });

    it('应该支持分类筛选', async () => {
      const response = await request(app)
        .get('/api/learning/achievements?category=learning')
        .set('Authorization', `Bearer ${validJwtToken}`)
        .expect(200);
      
      expect(mockSupabase.from().eq).toHaveBeenCalledWith('category', 'learning');
    });

    it('应该使用缓存', async () => {
      // 第一次请求
      await request(app)
        .get('/api/learning/achievements')
        .set('Authorization', `Bearer ${validJwtToken}`)
        .expect(200);
      
      // 第二次请求应该使用缓存
      mockCacheService.get.mockResolvedValue(JSON.stringify([testUserAchievement]));
      
      const response = await request(app)
        .get('/api/learning/achievements')
        .set('Authorization', `Bearer ${validJwtToken}`)
        .expect(200);
      
      expect(mockCacheService.get).toHaveBeenCalledWith(
        expect.stringContaining('user:user-123:achievements')
      );
    });
  });

  /**
   * 学习统计测试
   */
  describe('GET /api/learning/stats', () => {
    const statsData = {
      total_study_time: 7200, // 2小时
      courses_completed: 3,
      lessons_completed: 25,
      current_streak: 7,
      longest_streak: 15,
      skill_points: 1250,
      level: 8,
      weekly_progress: {
        study_time: [60, 90, 120, 0, 150, 180, 45],
        lessons_completed: [2, 3, 4, 0, 5, 6, 1]
      },
      monthly_summary: {
        study_hours: 20,
        courses_completed: 1,
        skill_points_earned: 300
      }
    };

    it('应该返回学习统计数据', async () => {
      mockLearningProgressService.getUserStats.mockResolvedValue({
        success: true,
        stats: statsData
      });
      
      const response = await request(app)
        .get('/api/learning/stats')
        .set('Authorization', `Bearer ${validJwtToken}`)
        .expect(200);
      
      expect(response.body).toEqual({
        success: true,
        data: {
          stats: expect.objectContaining({
            total_study_time: 7200,
            courses_completed: 3,
            current_streak: 7,
            level: 8
          })
        }
      });
    });

    it('应该支持时间范围查询', async () => {
      const response = await request(app)
        .get('/api/learning/stats?period=week')
        .set('Authorization', `Bearer ${validJwtToken}`)
        .expect(200);
      
      expect(mockLearningProgressService.getUserStats).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({ period: 'week' })
      );
    });
  });

  /**
   * 错误处理测试
   */
  describe('错误处理', () => {
    it('应该处理数据库连接错误', async () => {
      const dbError = new Error('Database connection failed');
      mockSupabase.from().select.mockRejectedValue(dbError);
      
      const response = await request(app)
        .get('/api/learning/progress')
        .set('Authorization', `Bearer ${validJwtToken}`)
        .expect(500);
      
      expect(response.body).toEqual({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      });
    });

    it('应该处理学习进度服务错误', async () => {
      mockLearningProgressService.startSession.mockResolvedValue({
        success: false,
        error: 'Session creation failed'
      });
      
      const response = await request(app)
        .post('/api/learning/sessions')
        .set('Authorization', `Bearer ${validJwtToken}`)
        .send({
          course_id: 'course-123',
          lesson_id: 'lesson-123'
        })
        .expect(500);
      
      expect(response.body.error).toBe('Session creation failed');
    });

    it('应该处理缓存服务错误', async () => {
      mockCacheService.get.mockRejectedValue(new Error('Cache service unavailable'));
      
      // 应该降级到数据库查询
      const response = await request(app)
        .get('/api/learning/progress')
        .set('Authorization', `Bearer ${validJwtToken}`)
        .expect(200);
      
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Cache service error, falling back to database',
        expect.any(Object)
      );
    });
  });

  /**
   * 性能测试
   */
  describe('性能测试', () => {
    it('学习进度查询应该在合理时间内完成', async () => {
      const startTime = Date.now();
      
      await request(app)
        .get('/api/learning/progress')
        .set('Authorization', `Bearer ${validJwtToken}`)
        .expect(200);
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(300); // 应该在300ms内完成
    });

    it('应该正确处理大量并发学习会话', async () => {
      const promises = [];
      
      for (let i = 0; i < 20; i++) {
        promises.push(
          request(app)
            .post('/api/learning/sessions')
            .set('Authorization', `Bearer ${validJwtToken}`)
            .send({
              course_id: `course-${i}`,
              lesson_id: `lesson-${i}`
            })
        );
      }
      
      const responses = await Promise.allSettled(promises);
      
      // 大部分请求应该成功（除了并发限制）
      const successfulResponses = responses.filter(
        result => result.status === 'fulfilled' && result.value.status === 201
      );
      
      expect(successfulResponses.length).toBeGreaterThan(0);
    });
  });
});