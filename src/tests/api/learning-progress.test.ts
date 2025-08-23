/**
 * 学习进度API集成测试
 * 
 * 测试学习进度相关的API端点，包括：
 * - 学习进度跟踪和更新
 * - 课程完成状态管理
 * - 学习路径推荐
 * - 学习统计分析
 * - 成就和徽章系统
 * - 学习目标设定
 * - 学习提醒管理
 * - 错误处理和边界情况
 */

import request from 'supertest';
import { app } from '../../app';
import { supabase } from '../../config/supabase';
import { jwtService } from '../../services/jwtService';
import { cacheService } from '../../services/cacheService';
import { auditService } from '../../services/auditService';
import { analyticsService } from '../../services/analyticsService';
import { aiService } from '../../services/aiService';
import { notificationService } from '../../services/notificationService';
import { logger } from '../../utils/logger';

// Mock 依赖
jest.mock('../../config/supabase');
jest.mock('../../services/jwtService');
jest.mock('../../services/cacheService');
jest.mock('../../services/auditService');
jest.mock('../../services/analyticsService');
jest.mock('../../services/aiService');
jest.mock('../../services/notificationService');
jest.mock('../../utils/logger');

// 类型定义
interface TestUser {
  id: string;
  email: string;
  username: string;
  displayName: string;
  role: 'student' | 'instructor' | 'admin';
}

interface TestCourse {
  id: string;
  title: string;
  description: string;
  instructorId: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedDuration: number; // 分钟
  totalLessons: number;
  category: string;
  tags: string[];
  prerequisites: string[];
}

interface TestLesson {
  id: string;
  courseId: string;
  title: string;
  description: string;
  duration: number; // 分钟
  order: number;
  type: 'video' | 'text' | 'quiz' | 'assignment';
  content: any;
  isRequired: boolean;
}

interface TestProgress {
  id: string;
  userId: string;
  courseId: string;
  lessonId?: string;
  progress: number; // 0-100
  status: 'not_started' | 'in_progress' | 'completed' | 'paused';
  timeSpent: number; // 分钟
  lastAccessedAt: Date;
  completedAt?: Date;
  score?: number;
  attempts: number;
  notes?: string;
  bookmarks: Array<{
    timestamp: number;
    note: string;
  }>;
}

interface TestLearningPath {
  id: string;
  userId: string;
  title: string;
  description: string;
  courses: Array<{
    courseId: string;
    order: number;
    isRequired: boolean;
    estimatedDuration: number;
  }>;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  totalDuration: number;
  progress: number;
  status: 'active' | 'completed' | 'paused';
  createdAt: Date;
  updatedAt: Date;
}

interface TestAchievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  type: 'course' | 'streak' | 'time' | 'skill' | 'social';
  criteria: {
    type: string;
    value: number;
    operator: 'eq' | 'gt' | 'gte' | 'lt' | 'lte';
  };
  points: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  isActive: boolean;
}

interface TestUserAchievement {
  id: string;
  userId: string;
  achievementId: string;
  earnedAt: Date;
  progress: number;
  isCompleted: boolean;
}

interface TestLearningGoal {
  id: string;
  userId: string;
  title: string;
  description: string;
  type: 'daily' | 'weekly' | 'monthly' | 'custom';
  target: {
    type: 'time' | 'courses' | 'lessons' | 'points';
    value: number;
    unit: string;
  };
  current: number;
  deadline?: Date;
  status: 'active' | 'completed' | 'paused' | 'failed';
  createdAt: Date;
  completedAt?: Date;
}

// Mock 实例
const mockSupabase = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  neq: jest.fn().mockReturnThis(),
  gt: jest.fn().mockReturnThis(),
  gte: jest.fn().mockReturnThis(),
  lt: jest.fn().mockReturnThis(),
  lte: jest.fn().mockReturnThis(),
  like: jest.fn().mockReturnThis(),
  ilike: jest.fn().mockReturnThis(),
  in: jest.fn().mockReturnThis(),
  contains: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  offset: jest.fn().mockReturnThis(),
  range: jest.fn().mockReturnThis(),
  single: jest.fn(),
  maybeSingle: jest.fn(),
  count: jest.fn(),
  rpc: jest.fn()
};

const mockJwtService = {
  verifyAccessToken: jest.fn(),
  generateAccessToken: jest.fn(),
  generateRefreshToken: jest.fn()
};

const mockCacheService = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  mget: jest.fn(),
  mset: jest.fn(),
  expire: jest.fn()
};

const mockAuditService = {
  log: jest.fn(),
  logUserEvent: jest.fn()
};

const mockAnalyticsService = {
  track: jest.fn(),
  increment: jest.fn(),
  timing: jest.fn(),
  identify: jest.fn()
};

const mockAiService = {
  generateLearningPath: jest.fn(),
  recommendCourses: jest.fn(),
  analyzeLearningPattern: jest.fn(),
  predictLearningOutcome: jest.fn()
};

const mockNotificationService = {
  sendNotification: jest.fn(),
  scheduleReminder: jest.fn(),
  cancelReminder: jest.fn()
};

const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
};

// 设置 Mock
(supabase as any) = mockSupabase;
(jwtService as any) = mockJwtService;
(cacheService as any) = mockCacheService;
(auditService as any) = mockAuditService;
(analyticsService as any) = mockAnalyticsService;
(aiService as any) = mockAiService;
(notificationService as any) = mockNotificationService;
(logger as any) = mockLogger;

// 测试数据
const testUser: TestUser = {
  id: 'user_123',
  email: 'test@example.com',
  username: 'testuser',
  displayName: '张三',
  role: 'student'
};

const testInstructor: TestUser = {
  id: 'instructor_123',
  email: 'instructor@example.com',
  username: 'instructor',
  displayName: '李老师',
  role: 'instructor'
};

const testCourse: TestCourse = {
  id: 'course_123',
  title: 'JavaScript 基础教程',
  description: '从零开始学习 JavaScript 编程',
  instructorId: testInstructor.id,
  difficulty: 'beginner',
  estimatedDuration: 1200, // 20小时
  totalLessons: 24,
  category: 'programming',
  tags: ['javascript', 'frontend', 'beginner'],
  prerequisites: []
};

const testLesson: TestLesson = {
  id: 'lesson_123',
  courseId: testCourse.id,
  title: '变量和数据类型',
  description: '学习 JavaScript 中的变量声明和基本数据类型',
  duration: 30,
  order: 1,
  type: 'video',
  content: {
    videoUrl: 'https://example.com/video.mp4',
    transcript: '课程文字稿...'
  },
  isRequired: true
};

const testProgress: TestProgress = {
  id: 'progress_123',
  userId: testUser.id,
  courseId: testCourse.id,
  lessonId: testLesson.id,
  progress: 75,
  status: 'in_progress',
  timeSpent: 22,
  lastAccessedAt: new Date('2024-01-15T10:00:00Z'),
  score: 85,
  attempts: 1,
  notes: '重要知识点：变量提升',
  bookmarks: [
    {
      timestamp: 300,
      note: '变量声明的三种方式'
    },
    {
      timestamp: 600,
      note: '数据类型检测方法'
    }
  ]
};

const testLearningPath: TestLearningPath = {
  id: 'path_123',
  userId: testUser.id,
  title: '前端开发学习路径',
  description: '从零基础到前端工程师的完整学习路径',
  courses: [
    {
      courseId: 'course_123',
      order: 1,
      isRequired: true,
      estimatedDuration: 1200
    },
    {
      courseId: 'course_124',
      order: 2,
      isRequired: true,
      estimatedDuration: 1500
    }
  ],
  difficulty: 'beginner',
  totalDuration: 2700,
  progress: 45,
  status: 'active',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-15')
};

const testAchievement: TestAchievement = {
  id: 'achievement_123',
  name: '初学者',
  description: '完成第一个课程',
  icon: '🎓',
  type: 'course',
  criteria: {
    type: 'courses_completed',
    value: 1,
    operator: 'gte'
  },
  points: 100,
  rarity: 'common',
  isActive: true
};

const testUserAchievement: TestUserAchievement = {
  id: 'user_achievement_123',
  userId: testUser.id,
  achievementId: testAchievement.id,
  earnedAt: new Date('2024-01-10'),
  progress: 100,
  isCompleted: true
};

const testLearningGoal: TestLearningGoal = {
  id: 'goal_123',
  userId: testUser.id,
  title: '每日学习目标',
  description: '每天学习至少1小时',
  type: 'daily',
  target: {
    type: 'time',
    value: 60,
    unit: 'minutes'
  },
  current: 45,
  deadline: new Date('2024-01-15T23:59:59Z'),
  status: 'active',
  createdAt: new Date('2024-01-15T00:00:00Z')
};

const validTokens = {
  student: 'student_token',
  instructor: 'instructor_token'
};

describe('Learning Progress API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // 设置默认 Mock 返回值
    mockSupabase.single.mockResolvedValue({
      data: testProgress,
      error: null
    });
    
    mockSupabase.insert.mockResolvedValue({
      data: [testProgress],
      error: null
    });
    
    mockSupabase.update.mockResolvedValue({
      data: [testProgress],
      error: null
    });
    
    mockSupabase.range.mockResolvedValue({
      data: [testProgress],
      error: null,
      count: 1
    });
    
    // JWT 验证 Mock
    mockJwtService.verifyAccessToken.mockImplementation((token) => {
      if (token === validTokens.student) {
        return Promise.resolve({
          valid: true,
          payload: testUser
        });
      } else if (token === validTokens.instructor) {
        return Promise.resolve({
          valid: true,
          payload: testInstructor
        });
      }
      return Promise.resolve({
        valid: false,
        error: 'Invalid token'
      });
    });
    
    // 缓存 Mock
    mockCacheService.get.mockResolvedValue(null);
    mockCacheService.set.mockResolvedValue(true);
    
    // AI 服务 Mock
    mockAiService.generateLearningPath.mockResolvedValue(testLearningPath);
    mockAiService.recommendCourses.mockResolvedValue([testCourse]);
  });

  /**
   * 获取学习进度测试
   */
  describe('GET /api/learning-progress/courses/:courseId', () => {
    it('应该返回课程学习进度', async () => {
      const authHeader = `Bearer ${validTokens.student}`;
      
      const response = await request(app)
        .get(`/api/learning-progress/courses/${testCourse.id}`)
        .set('Authorization', authHeader)
        .expect(200);
      
      expect(response.body).toEqual({
        success: true,
        data: {
          progress: expect.objectContaining({
            courseId: testCourse.id,
            userId: testUser.id,
            progress: testProgress.progress,
            status: testProgress.status,
            timeSpent: testProgress.timeSpent,
            lastAccessedAt: expect.any(String)
          })
        }
      });
      
      expect(mockSupabase.from).toHaveBeenCalledWith('learning_progress');
      expect(mockSupabase.eq).toHaveBeenCalledWith('user_id', testUser.id);
      expect(mockSupabase.eq).toHaveBeenCalledWith('course_id', testCourse.id);
    });

    it('应该使用缓存提高性能', async () => {
      const authHeader = `Bearer ${validTokens.student}`;
      const cacheKey = `progress:${testUser.id}:${testCourse.id}`;
      
      mockCacheService.get.mockResolvedValue(testProgress);
      
      const response = await request(app)
        .get(`/api/learning-progress/courses/${testCourse.id}`)
        .set('Authorization', authHeader)
        .expect(200);
      
      expect(mockCacheService.get).toHaveBeenCalledWith(cacheKey);
      expect(response.body.data.progress).toEqual(
        expect.objectContaining({
          courseId: testCourse.id,
          progress: testProgress.progress
        })
      );
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it('应该处理课程不存在的情况', async () => {
      const authHeader = `Bearer ${validTokens.student}`;
      const nonExistentCourseId = 'non_existent_course';
      
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'No rows found' }
      });
      
      const response = await request(app)
        .get(`/api/learning-progress/courses/${nonExistentCourseId}`)
        .set('Authorization', authHeader)
        .expect(404);
      
      expect(response.body).toEqual({
        success: false,
        error: 'Progress not found',
        message: 'No learning progress found for this course',
        code: 'PROGRESS_NOT_FOUND'
      });
    });
  });

  /**
   * 更新学习进度测试
   */
  describe('PUT /api/learning-progress/lessons/:lessonId', () => {
    const progressUpdate = {
      progress: 100,
      timeSpent: 30,
      score: 95,
      notes: '课程完成，理解了所有概念',
      bookmarks: [
        {
          timestamp: 450,
          note: '重要的代码示例'
        }
      ]
    };

    it('应该成功更新课程进度', async () => {
      const authHeader = `Bearer ${validTokens.student}`;
      
      const response = await request(app)
        .put(`/api/learning-progress/lessons/${testLesson.id}`)
        .set('Authorization', authHeader)
        .send(progressUpdate)
        .expect(200);
      
      expect(response.body).toEqual({
        success: true,
        message: 'Progress updated successfully',
        data: {
          progress: expect.objectContaining({
            lessonId: testLesson.id,
            progress: progressUpdate.progress,
            timeSpent: progressUpdate.timeSpent,
            score: progressUpdate.score,
            notes: progressUpdate.notes
          })
        }
      });
      
      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          progress: progressUpdate.progress,
          time_spent: progressUpdate.timeSpent,
          score: progressUpdate.score,
          notes: progressUpdate.notes,
          bookmarks: progressUpdate.bookmarks,
          last_accessed_at: expect.any(String)
        })
      );
      
      expect(mockCacheService.del).toHaveBeenCalledWith(
        `progress:${testUser.id}:${testCourse.id}`
      );
    });

    it('应该在课程完成时触发成就检查', async () => {
      const authHeader = `Bearer ${validTokens.student}`;
      const completionUpdate = {
        ...progressUpdate,
        progress: 100,
        status: 'completed'
      };
      
      const response = await request(app)
        .put(`/api/learning-progress/lessons/${testLesson.id}`)
        .set('Authorization', authHeader)
        .send(completionUpdate)
        .expect(200);
      
      expect(mockSupabase.rpc).toHaveBeenCalledWith(
        'check_and_award_achievements',
        {
          user_id: testUser.id,
          event_type: 'lesson_completed',
          event_data: expect.any(Object)
        }
      );
      
      expect(mockAnalyticsService.track).toHaveBeenCalledWith(
        'lesson_completed',
        {
          userId: testUser.id,
          lessonId: testLesson.id,
          courseId: testCourse.id,
          timeSpent: completionUpdate.timeSpent,
          score: completionUpdate.score
        }
      );
    });

    it('应该验证进度数据', async () => {
      const authHeader = `Bearer ${validTokens.student}`;
      const invalidUpdate = {
        progress: 150, // 超过100
        timeSpent: -10, // 负数
        score: 110 // 超过100
      };
      
      const response = await request(app)
        .put(`/api/learning-progress/lessons/${testLesson.id}`)
        .set('Authorization', authHeader)
        .send(invalidUpdate)
        .expect(400);
      
      expect(response.body).toEqual({
        success: false,
        error: 'Validation failed',
        details: expect.arrayContaining([
          expect.objectContaining({
            field: 'progress',
            message: expect.stringContaining('between 0 and 100')
          }),
          expect.objectContaining({
            field: 'timeSpent',
            message: expect.stringContaining('positive number')
          }),
          expect.objectContaining({
            field: 'score',
            message: expect.stringContaining('between 0 and 100')
          })
        ])
      });
    });

    it('应该记录学习活动日志', async () => {
      const authHeader = `Bearer ${validTokens.student}`;
      
      await request(app)
        .put(`/api/learning-progress/lessons/${testLesson.id}`)
        .set('Authorization', authHeader)
        .send(progressUpdate)
        .expect(200);
      
      expect(mockAuditService.logUserEvent).toHaveBeenCalledWith({
        action: 'progress_updated',
        userId: testUser.id,
        resourceType: 'lesson',
        resourceId: testLesson.id,
        details: {
          oldProgress: expect.any(Number),
          newProgress: progressUpdate.progress,
          timeSpent: progressUpdate.timeSpent
        }
      });
    });
  });

  /**
   * 获取学习路径测试
   */
  describe('GET /api/learning-progress/paths', () => {
    it('应该返回用户的学习路径', async () => {
      const authHeader = `Bearer ${validTokens.student}`;
      
      mockSupabase.range.mockResolvedValue({
        data: [testLearningPath],
        error: null,
        count: 1
      });
      
      const response = await request(app)
        .get('/api/learning-progress/paths')
        .set('Authorization', authHeader)
        .expect(200);
      
      expect(response.body).toEqual({
        success: true,
        data: {
          paths: expect.arrayContaining([
            expect.objectContaining({
              id: testLearningPath.id,
              title: testLearningPath.title,
              progress: testLearningPath.progress,
              status: testLearningPath.status,
              totalDuration: testLearningPath.totalDuration
            })
          ]),
          pagination: {
            total: 1,
            page: 1,
            limit: 20,
            totalPages: 1
          }
        }
      });
      
      expect(mockSupabase.from).toHaveBeenCalledWith('learning_paths');
      expect(mockSupabase.eq).toHaveBeenCalledWith('user_id', testUser.id);
    });

    it('应该支持状态筛选', async () => {
      const authHeader = `Bearer ${validTokens.student}`;
      const status = 'active';
      
      const response = await request(app)
        .get('/api/learning-progress/paths')
        .set('Authorization', authHeader)
        .query({ status })
        .expect(200);
      
      expect(mockSupabase.eq).toHaveBeenCalledWith('status', status);
    });
  });

  /**
   * 生成个性化学习路径测试
   */
  describe('POST /api/learning-progress/paths/generate', () => {
    const pathRequest = {
      goals: ['frontend', 'javascript'],
      difficulty: 'beginner',
      timeAvailable: 120, // 每周2小时
      preferences: {
        learningStyle: 'visual',
        pace: 'moderate'
      }
    };

    it('应该生成个性化学习路径', async () => {
      const authHeader = `Bearer ${validTokens.student}`;
      
      const response = await request(app)
        .post('/api/learning-progress/paths/generate')
        .set('Authorization', authHeader)
        .send(pathRequest)
        .expect(201);
      
      expect(response.body).toEqual({
        success: true,
        message: 'Learning path generated successfully',
        data: {
          path: expect.objectContaining({
            id: expect.any(String),
            title: expect.any(String),
            description: expect.any(String),
            courses: expect.arrayContaining([
              expect.objectContaining({
                courseId: expect.any(String),
                order: expect.any(Number),
                isRequired: expect.any(Boolean)
              })
            ]),
            totalDuration: expect.any(Number)
          })
        }
      });
      
      expect(mockAiService.generateLearningPath).toHaveBeenCalledWith({
        userId: testUser.id,
        goals: pathRequest.goals,
        difficulty: pathRequest.difficulty,
        timeAvailable: pathRequest.timeAvailable,
        preferences: pathRequest.preferences
      });
      
      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: testUser.id,
          title: expect.any(String),
          description: expect.any(String),
          courses: expect.any(Array),
          difficulty: pathRequest.difficulty
        })
      );
    });

    it('应该验证路径生成请求', async () => {
      const authHeader = `Bearer ${validTokens.student}`;
      const invalidRequest = {
        goals: [], // 空目标
        difficulty: 'invalid', // 无效难度
        timeAvailable: -10 // 负数时间
      };
      
      const response = await request(app)
        .post('/api/learning-progress/paths/generate')
        .set('Authorization', authHeader)
        .send(invalidRequest)
        .expect(400);
      
      expect(response.body).toEqual({
        success: false,
        error: 'Validation failed',
        details: expect.arrayContaining([
          expect.objectContaining({
            field: 'goals',
            message: expect.stringContaining('at least one goal')
          }),
          expect.objectContaining({
            field: 'difficulty',
            message: expect.stringContaining('valid difficulty')
          }),
          expect.objectContaining({
            field: 'timeAvailable',
            message: expect.stringContaining('positive number')
          })
        ])
      });
    });
  });

  /**
   * 获取成就测试
   */
  describe('GET /api/learning-progress/achievements', () => {
    it('应该返回用户成就列表', async () => {
      const authHeader = `Bearer ${validTokens.student}`;
      
      mockSupabase.range.mockResolvedValue({
        data: [testUserAchievement],
        error: null,
        count: 1
      });
      
      const response = await request(app)
        .get('/api/learning-progress/achievements')
        .set('Authorization', authHeader)
        .expect(200);
      
      expect(response.body).toEqual({
        success: true,
        data: {
          achievements: expect.arrayContaining([
            expect.objectContaining({
              id: testUserAchievement.id,
              achievementId: testUserAchievement.achievementId,
              earnedAt: expect.any(String),
              isCompleted: testUserAchievement.isCompleted
            })
          ]),
          summary: {
            total: 1,
            completed: 1,
            totalPoints: expect.any(Number)
          }
        }
      });
      
      expect(mockSupabase.from).toHaveBeenCalledWith('user_achievements');
      expect(mockSupabase.eq).toHaveBeenCalledWith('user_id', testUser.id);
    });

    it('应该支持成就类型筛选', async () => {
      const authHeader = `Bearer ${validTokens.student}`;
      const type = 'course';
      
      const response = await request(app)
        .get('/api/learning-progress/achievements')
        .set('Authorization', authHeader)
        .query({ type })
        .expect(200);
      
      expect(mockSupabase.eq).toHaveBeenCalledWith('type', type);
    });
  });

  /**
   * 学习目标管理测试
   */
  describe('Learning Goals Management', () => {
    describe('POST /api/learning-progress/goals', () => {
      const goalData = {
        title: '每日学习目标',
        description: '每天学习至少1小时',
        type: 'daily',
        target: {
          type: 'time',
          value: 60,
          unit: 'minutes'
        },
        deadline: '2024-01-31T23:59:59Z'
      };

      it('应该成功创建学习目标', async () => {
        const authHeader = `Bearer ${validTokens.student}`;
        
        const response = await request(app)
          .post('/api/learning-progress/goals')
          .set('Authorization', authHeader)
          .send(goalData)
          .expect(201);
        
        expect(response.body).toEqual({
          success: true,
          message: 'Learning goal created successfully',
          data: {
            goal: expect.objectContaining({
              id: expect.any(String),
              userId: testUser.id,
              title: goalData.title,
              type: goalData.type,
              target: goalData.target,
              status: 'active'
            })
          }
        });
        
        expect(mockSupabase.insert).toHaveBeenCalledWith(
          expect.objectContaining({
            user_id: testUser.id,
            title: goalData.title,
            description: goalData.description,
            type: goalData.type,
            target: goalData.target,
            deadline: goalData.deadline,
            status: 'active'
          })
        );
      });

      it('应该设置学习提醒', async () => {
        const authHeader = `Bearer ${validTokens.student}`;
        const goalWithReminder = {
          ...goalData,
          reminder: {
            enabled: true,
            time: '19:00',
            frequency: 'daily'
          }
        };
        
        await request(app)
          .post('/api/learning-progress/goals')
          .set('Authorization', authHeader)
          .send(goalWithReminder)
          .expect(201);
        
        expect(mockNotificationService.scheduleReminder).toHaveBeenCalledWith({
          userId: testUser.id,
          type: 'learning_goal',
          title: '学习提醒',
          message: expect.stringContaining(goalData.title),
          schedule: {
            time: '19:00',
            frequency: 'daily'
          }
        });
      });
    });

    describe('GET /api/learning-progress/goals', () => {
      it('应该返回用户学习目标', async () => {
        const authHeader = `Bearer ${validTokens.student}`;
        
        mockSupabase.range.mockResolvedValue({
          data: [testLearningGoal],
          error: null,
          count: 1
        });
        
        const response = await request(app)
          .get('/api/learning-progress/goals')
          .set('Authorization', authHeader)
          .expect(200);
        
        expect(response.body).toEqual({
          success: true,
          data: {
            goals: expect.arrayContaining([
              expect.objectContaining({
                id: testLearningGoal.id,
                title: testLearningGoal.title,
                type: testLearningGoal.type,
                target: testLearningGoal.target,
                current: testLearningGoal.current,
                status: testLearningGoal.status
              })
            ])
          }
        });
      });

      it('应该支持状态筛选', async () => {
        const authHeader = `Bearer ${validTokens.student}`;
        const status = 'active';
        
        const response = await request(app)
          .get('/api/learning-progress/goals')
          .set('Authorization', authHeader)
          .query({ status })
          .expect(200);
        
        expect(mockSupabase.eq).toHaveBeenCalledWith('status', status);
      });
    });

    describe('PUT /api/learning-progress/goals/:id/progress', () => {
      it('应该更新目标进度', async () => {
        const authHeader = `Bearer ${validTokens.student}`;
        const progressData = { current: 75 };
        
        const response = await request(app)
          .put(`/api/learning-progress/goals/${testLearningGoal.id}/progress`)
          .set('Authorization', authHeader)
          .send(progressData)
          .expect(200);
        
        expect(response.body).toEqual({
          success: true,
          message: 'Goal progress updated successfully',
          data: {
            goal: expect.objectContaining({
              id: testLearningGoal.id,
              current: progressData.current
            })
          }
        });
        
        expect(mockSupabase.update).toHaveBeenCalledWith(
          expect.objectContaining({
            current: progressData.current,
            updated_at: expect.any(String)
          })
        );
      });

      it('应该在目标完成时发送通知', async () => {
        const authHeader = `Bearer ${validTokens.student}`;
        const completionData = { current: 60 }; // 达到目标值
        
        await request(app)
          .put(`/api/learning-progress/goals/${testLearningGoal.id}/progress`)
          .set('Authorization', authHeader)
          .send(completionData)
          .expect(200);
        
        expect(mockNotificationService.sendNotification).toHaveBeenCalledWith({
          userId: testUser.id,
          type: 'goal_completed',
          title: '目标达成！',
          message: expect.stringContaining(testLearningGoal.title),
          data: {
            goalId: testLearningGoal.id,
            goalTitle: testLearningGoal.title
          }
        });
      });
    });
  });

  /**
   * 学习统计分析测试
   */
  describe('GET /api/learning-progress/analytics', () => {
    const analyticsData = {
      overview: {
        totalCourses: 5,
        completedCourses: 2,
        totalLearningTime: 1200,
        currentStreak: 7,
        totalPoints: 2500
      },
      weeklyProgress: [
        { date: '2024-01-08', timeSpent: 120, coursesCompleted: 0 },
        { date: '2024-01-09', timeSpent: 90, coursesCompleted: 1 },
        { date: '2024-01-10', timeSpent: 150, coursesCompleted: 0 }
      ],
      categoryProgress: [
        { category: 'programming', progress: 75, timeSpent: 800 },
        { category: 'design', progress: 45, timeSpent: 400 }
      ],
      learningPattern: {
        preferredTime: '19:00-21:00',
        averageSessionDuration: 45,
        mostActiveDay: 'Tuesday',
        learningStyle: 'visual'
      }
    };

    it('应该返回学习分析数据', async () => {
      const authHeader = `Bearer ${validTokens.student}`;
      
      mockSupabase.rpc.mockImplementation((functionName) => {
        if (functionName === 'get_learning_analytics') {
          return Promise.resolve({
            data: analyticsData,
            error: null
          });
        }
        return Promise.resolve({ data: null, error: null });
      });
      
      const response = await request(app)
        .get('/api/learning-progress/analytics')
        .set('Authorization', authHeader)
        .expect(200);
      
      expect(response.body).toEqual({
        success: true,
        data: {
          analytics: expect.objectContaining({
            overview: expect.objectContaining({
              totalCourses: analyticsData.overview.totalCourses,
              completedCourses: analyticsData.overview.completedCourses,
              totalLearningTime: analyticsData.overview.totalLearningTime
            }),
            weeklyProgress: expect.arrayContaining([
              expect.objectContaining({
                date: expect.any(String),
                timeSpent: expect.any(Number)
              })
            ]),
            learningPattern: expect.objectContaining({
              preferredTime: expect.any(String),
              averageSessionDuration: expect.any(Number)
            })
          })
        }
      });
      
      expect(mockSupabase.rpc).toHaveBeenCalledWith(
        'get_learning_analytics',
        { user_id: testUser.id }
      );
    });

    it('应该支持时间范围筛选', async () => {
      const authHeader = `Bearer ${validTokens.student}`;
      const startDate = '2024-01-01';
      const endDate = '2024-01-31';
      
      const response = await request(app)
        .get('/api/learning-progress/analytics')
        .set('Authorization', authHeader)
        .query({ startDate, endDate })
        .expect(200);
      
      expect(mockSupabase.rpc).toHaveBeenCalledWith(
        'get_learning_analytics',
        {
          user_id: testUser.id,
          start_date: startDate,
          end_date: endDate
        }
      );
    });
  });

  /**
   * 错误处理测试
   */
  describe('Error Handling', () => {
    it('应该处理数据库连接错误', async () => {
      const authHeader = `Bearer ${validTokens.student}`;
      
      mockSupabase.single.mockRejectedValue(
        new Error('Database connection failed')
      );
      
      const response = await request(app)
        .get(`/api/learning-progress/courses/${testCourse.id}`)
        .set('Authorization', authHeader)
        .expect(500);
      
      expect(response.body).toEqual({
        success: false,
        error: 'Internal server error',
        message: 'Please try again later'
      });
      
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Database error in learning progress API',
        expect.objectContaining({
          error: 'Database connection failed'
        })
      );
    });

    it('应该处理AI服务错误', async () => {
      const authHeader = `Bearer ${validTokens.student}`;
      
      mockAiService.generateLearningPath.mockRejectedValue(
        new Error('AI service unavailable')
      );
      
      const response = await request(app)
        .post('/api/learning-progress/paths/generate')
        .set('Authorization', authHeader)
        .send({
          goals: ['frontend'],
          difficulty: 'beginner',
          timeAvailable: 120
        })
        .expect(500);
      
      expect(response.body).toEqual({
        success: false,
        error: 'AI service error',
        message: 'Unable to generate learning path at this time'
      });
    });

    it('应该处理缓存服务错误', async () => {
      const authHeader = `Bearer ${validTokens.student}`;
      
      mockCacheService.get.mockRejectedValue(
        new Error('Cache service unavailable')
      );
      
      // 应该降级到数据库查询
      const response = await request(app)
        .get(`/api/learning-progress/courses/${testCourse.id}`)
        .set('Authorization', authHeader)
        .expect(200);
      
      expect(mockSupabase.from).toHaveBeenCalledWith('learning_progress');
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Cache service error, falling back to database',
        expect.any(Object)
      );
    });
  });

  /**
   * 性能测试
   */
  describe('Performance Tests', () => {
    it('应该在合理时间内返回学习进度', async () => {
      const authHeader = `Bearer ${validTokens.student}`;
      const startTime = Date.now();
      
      await request(app)
        .get(`/api/learning-progress/courses/${testCourse.id}`)
        .set('Authorization', authHeader)
        .expect(200);
      
      const processingTime = Date.now() - startTime;
      expect(processingTime).toBeLessThan(300); // 应该在300ms内完成
      
      expect(mockAnalyticsService.timing).toHaveBeenCalledWith(
        'learning_progress_duration',
        processingTime
      );
    });

    it('应该高效处理批量进度更新', async () => {
      const authHeader = `Bearer ${validTokens.student}`;
      const updates = Array.from({ length: 5 }, (_, i) => ({
        lessonId: `lesson_${i}`,
        progress: 100,
        timeSpent: 30
      }));
      
      const promises = updates.map(update =>
        request(app)
          .put(`/api/learning-progress/lessons/${update.lessonId}`)
          .set('Authorization', authHeader)
          .send(update)
      );
      
      const startTime = Date.now();
      const responses = await Promise.all(promises);
      const totalTime = Date.now() - startTime;
      
      expect(totalTime).toBeLessThan(1500); // 5个更新应该在1.5秒内完成
      expect(responses.every(res => res.status === 200)).toBe(true);
    });

    it('应该有效利用缓存', async () => {
      const authHeader = `Bearer ${validTokens.student}`;
      
      // 第一次请求
      await request(app)
        .get(`/api/learning-progress/courses/${testCourse.id}`)
        .set('Authorization', authHeader)
        .expect(200);
      
      // 设置缓存返回数据
      mockCacheService.get.mockResolvedValue(testProgress);
      
      // 第二次请求应该使用缓存
      await request(app)
        .get(`/api/learning-progress/courses/${testCourse.id}`)
        .set('Authorization', authHeader)
        .expect(200);
      
      expect(mockCacheService.set).toHaveBeenCalledWith(
        `progress:${testUser.id}:${testCourse.id}`,
        expect.any(Object),
        1800 // 30分钟缓存
      );
    });
  });
});