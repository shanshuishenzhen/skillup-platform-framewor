/**
 * 学习进度API集成测试
 * 
 * 测试学习进度相关的API端点，包括：
 * - 课程进度跟踪
 * - 课时完成记录
 * - 学习会话管理
 * - 进度统计分析
 * - 学习路径推荐
 * - 成就解锁机制
 * - 学习目标设定
 * - 知识点掌握度
 */

import request from 'supertest';
import { app } from '../../app';
import { supabaseClient } from '../../utils/supabase';
import { cacheService } from '../../services/cacheService';
import { auditService } from '../../services/auditService';
import { analyticsService } from '../../services/analyticsService';
import { learningProgressService } from '../../services/learningProgressService';
import { aiService } from '../../services/aiService';
import { envConfig } from '../../config/envConfig';
import jwt from 'jsonwebtoken';

// Mock 依赖
jest.mock('../../utils/supabase');
jest.mock('../../services/cacheService');
jest.mock('../../services/auditService');
jest.mock('../../services/analyticsService');
jest.mock('../../services/learningProgressService');
jest.mock('../../services/aiService');
jest.mock('../../config/envConfig');
jest.mock('jsonwebtoken');

// 类型定义
interface CourseProgress {
  id: string;
  userId: string;
  courseId: string;
  courseProgressPercentage: number; // 0-100
  status: 'not_started' | 'in_progress' | 'completed' | 'paused';
  startedAt: Date;
  completedAt?: Date;
  lastAccessedAt: Date;
  totalWatchTime: number; // 分钟
  completedLessons: number;
  totalLessons: number;
  currentLessonId?: string;
  metadata: {
    averageScore?: number;
    quizzesPassed?: number;
    assignmentsCompleted?: number;
    certificateEarned?: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

interface LessonProgress {
  id: string;
  userId: string;
  courseId: string;
  lessonId: string;
  progressPercentage: number; // 0-100
  status: 'not_started' | 'in_progress' | 'completed';
  startedAt: Date;
  completedAt?: Date;
  timeSpent: number; // 分钟
  currentTime?: number; // 视频观看时间（秒）
  readingProgress?: number; // 阅读进度百分比
  interactionCount: number; // 互动次数
  lastPosition?: number; // 最后观看/阅读位置
  metadata: {
    notes?: string;
    bookmarks?: number[];
    highlights?: string[];
    quizScore?: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

interface LearningSession {
  id: string;
  userId: string;
  courseId?: string;
  lessonId?: string;
  startTime: Date;
  endTime?: Date;
  duration: number; // 分钟
  activityType: 'video' | 'reading' | 'quiz' | 'assignment' | 'discussion';
  progressPercentage: number;
  metadata: {
    device?: string;
    browser?: string;
    location?: string;
    interactions?: number;
    pauseCount?: number;
    seekCount?: number;
  };
  createdAt: Date;
}

interface LearningGoal {
  id: string;
  userId: string;
  title: string;
  description: string;
  type: 'course_completion' | 'skill_mastery' | 'time_based' | 'custom';
  targetValue: number;
  currentValue: number;
  unit: 'courses' | 'hours' | 'skills' | 'points';
  deadline?: Date;
  status: 'active' | 'completed' | 'paused' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  relatedCourses?: string[];
  relatedSkills?: string[];
  createdAt: Date;
  updatedAt: Date;
}

interface SkillMastery {
  id: string;
  userId: string;
  skillId: string;
  skillName: string;
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  masteryScore: number; // 0-100
  practiceTime: number; // 分钟
  assessmentsPassed: number;
  projectsCompleted: number;
  lastPracticed: Date;
  strengthAreas: string[];
  weaknessAreas: string[];
  recommendedActions: string[];
  createdAt: Date;
  updatedAt: Date;
}

interface LearningPath {
  id: string;
  userId: string;
  title: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedDuration: number; // 小时
  courses: {
    courseId: string;
    order: number;
    isRequired: boolean;
    prerequisites?: string[];
  }[];
  skills: string[];
  courseProgressPercentage: number;
  status: 'not_started' | 'in_progress' | 'completed';
  createdAt: Date;
  updatedAt: Date;
}

// Mock 实例
const mockSupabaseClient = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  neq: jest.fn().mockReturnThis(),
  in: jest.fn().mockReturnThis(),
  gte: jest.fn().mockReturnThis(),
  lte: jest.fn().mockReturnThis(),
  like: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  offset: jest.fn().mockReturnThis(),
  range: jest.fn().mockReturnThis(),
  single: jest.fn(),
  then: jest.fn(),
  count: jest.fn().mockReturnThis(),
  rpc: jest.fn()
};

const mockCacheService = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  mget: jest.fn(),
  mset: jest.fn(),
  expire: jest.fn(),
  zadd: jest.fn(),
  zrange: jest.fn(),
  incr: jest.fn(),
  decr: jest.fn()
};

const mockAuditService = {
  log: jest.fn(),
  logUserActivity: jest.fn()
};

const mockAnalyticsService = {
  track: jest.fn(),
  increment: jest.fn(),
  gauge: jest.fn(),
  histogram: jest.fn()
};

const mockLearningProgressService = {
  startLearningSession: jest.fn(),
  endLearningSession: jest.fn(),
  updateCourseProgress: jest.fn(),
  updateLessonProgress: jest.fn(),
  getUserProgress: jest.fn(),
  getCourseProgress: jest.fn(),
  getLessonProgress: jest.fn(),
  calculateProgress: jest.fn(),
  generateLearningPath: jest.fn(),
  updateSkillMastery: jest.fn(),
  getSkillMastery: jest.fn(),
  createLearningGoal: jest.fn(),
  updateLearningGoal: jest.fn(),
  getLearningGoals: jest.fn(),
  checkGoalProgress: jest.fn(),
  getRecommendations: jest.fn()
};

const mockAiService = {
  generatePersonalizedRecommendations: jest.fn(),
  analyzeLearningPattern: jest.fn(),
  predictLearningOutcome: jest.fn(),
  generateLearningPath: jest.fn(),
  identifyKnowledgeGaps: jest.fn()
};

const mockEnvConfig = {
  progress: {
    sessionTimeout: 30, // 分钟
    autoSaveInterval: 60, // 秒
    maxSessionDuration: 480, // 8小时
    progressUpdateThreshold: 5, // 5%进度变化才更新
    cacheExpiry: 300 // 5分钟
  },
  recommendations: {
    maxRecommendations: 10,
    refreshInterval: 3600, // 1小时
    enableAI: true
  }
};

const mockJwt = {
  verify: jest.fn(),
  sign: jest.fn()
};

// Mock 类型定义已移除

// 设置 Mock
jest.mocked(supabaseClient).mockReturnValue(mockSupabaseClient);
jest.mocked(cacheService).mockReturnValue(mockCacheService);
jest.mocked(auditService).mockReturnValue(mockAuditService);
jest.mocked(analyticsService).mockReturnValue(mockAnalyticsService);
jest.mocked(learningProgressService).mockReturnValue(mockLearningProgressService);
jest.mocked(aiService).mockReturnValue(mockAiService);
jest.mocked(envConfig).mockReturnValue(mockEnvConfig);
jest.mocked(jwt).mockReturnValue(mockJwt);

// 测试数据
const testCourseProgress: CourseProgress = {
  id: 'progress-123',
  userId: 'user-123456',
  courseId: 'course-123',
  progress: 65,
  status: 'in_progress',
  startedAt: new Date('2024-01-01'),
  lastAccessedAt: new Date(),
  totalTimeSpent: 180, // 3小时
  completedLessons: 8,
  totalLessons: 12,
  currentLessonId: 'lesson-9',
  metadata: {
    averageScore: 85,
    quizzesPassed: 6,
    assignmentsCompleted: 3,
    certificateEarned: false
  },
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date()
};

const testLessonProgress: LessonProgress = {
  id: 'lesson-progress-123',
  userId: 'user-123456',
  courseId: 'course-123',
  lessonId: 'lesson-9',
  progress: 75,
  status: 'in_progress',
  startedAt: new Date(),
  timeSpent: 25,
  watchTime: 1200, // 20分钟
  readingProgress: 80,
  interactionCount: 5,
  lastPosition: 1200,
  metadata: {
    notes: '重要概念：闭包的应用',
    bookmarks: [300, 800, 1200],
    highlights: ['闭包', '作用域链'],
    quizScore: 90
  },
  createdAt: new Date(),
  updatedAt: new Date()
};

const testLearningSession: LearningSession = {
  id: 'session-123',
  userId: 'user-123456',
  courseId: 'course-123',
  lessonId: 'lesson-9',
  startTime: new Date(),
  duration: 45,
  activityType: 'video',
  progress: 75,
  metadata: {
    device: 'desktop',
    browser: 'chrome',
    location: 'Beijing',
    interactions: 8,
    pauseCount: 3,
    seekCount: 2
  },
  createdAt: new Date()
};

const testLearningGoal: LearningGoal = {
  id: 'goal-123',
  userId: 'user-123456',
  title: '完成前端开发课程',
  description: '在3个月内完成所有前端开发相关课程',
  type: 'course_completion',
  targetValue: 5,
  currentValue: 2,
  unit: 'courses',
  deadline: new Date('2024-06-01'),
  status: 'active',
  priority: 'high',
  relatedCourses: ['course-123', 'course-456'],
  relatedSkills: ['javascript', 'react', 'css'],
  createdAt: new Date(),
  updatedAt: new Date()
};

const testSkillMastery: SkillMastery = {
  id: 'skill-mastery-123',
  userId: 'user-123456',
  skillId: 'skill-javascript',
  skillName: 'JavaScript',
  level: 'intermediate',
  masteryScore: 75,
  practiceTime: 120,
  assessmentsPassed: 8,
  projectsCompleted: 3,
  lastPracticed: new Date(),
  strengthAreas: ['ES6语法', '异步编程'],
  weaknessAreas: ['设计模式', '性能优化'],
  recommendedActions: ['练习设计模式', '学习性能优化技巧'],
  createdAt: new Date(),
  updatedAt: new Date()
};

// 认证中间件模拟
const mockAuthUser = {
  id: 'user-123456',
  email: 'test@skillup.com',
  role: 'student'
};

describe('Progress API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // 设置默认的mock返回值
    mockCacheService.get.mockResolvedValue(null);
    mockCacheService.set.mockResolvedValue(true);
    mockCacheService.mget.mockResolvedValue([]);
    
    mockAuditService.log.mockResolvedValue(true);
    mockAnalyticsService.track.mockResolvedValue(true);
    
    mockLearningProgressService.getUserProgress.mockResolvedValue(testCourseProgress);
    mockLearningProgressService.getCourseProgress.mockResolvedValue(testCourseProgress);
    mockLearningProgressService.getLessonProgress.mockResolvedValue(testLessonProgress);
    mockLearningProgressService.updateCourseProgress.mockResolvedValue(testCourseProgress);
    mockLearningProgressService.updateLessonProgress.mockResolvedValue(testLessonProgress);
    mockLearningProgressService.startLearningSession.mockResolvedValue(testLearningSession);
    mockLearningProgressService.endLearningSession.mockResolvedValue(testLearningSession);
    
    mockAiService.generatePersonalizedRecommendations.mockResolvedValue([
      {
        type: 'course',
        id: 'course-456',
        title: 'React进阶',
        reason: '基于您的JavaScript基础',
        confidence: 0.85
      }
    ]);
    
    // 设置JWT验证
    mockJwt.verify.mockReturnValue(mockAuthUser);
    
    // 设置Supabase默认返回值
    mockSupabaseClient.single.mockResolvedValue({
      data: testCourseProgress,
      error: null
    });
    
    mockSupabaseClient.then.mockResolvedValue({
      data: [testCourseProgress],
      error: null,
      count: 1
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  /**
   * 课程进度获取测试
   */
  describe('GET /api/progress/courses/:courseId', () => {
    it('应该获取课程进度', async () => {
      const response = await request(app)
        .get('/api/progress/courses/course-123')
        .set('Authorization', 'Bearer jwt-token-123')
        .expect(200);
      
      expect(response.body).toEqual(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            courseId: 'course-123',
            progress: 65,
            status: 'in_progress',
            completedLessons: 8,
            totalLessons: 12
          })
        })
      );
      
      expect(mockLearningProgressService.getCourseProgress).toHaveBeenCalledWith(
        'user-123456',
        'course-123'
      );
    });

    it('应该处理课程不存在的情况', async () => {
      mockLearningProgressService.getCourseProgress.mockResolvedValue(null);
      
      const response = await request(app)
        .get('/api/progress/courses/nonexistent-course')
        .set('Authorization', 'Bearer jwt-token-123')
        .expect(404);
      
      expect(response.body).toEqual(
        expect.objectContaining({
          success: false,
          message: '课程进度不存在'
        })
      );
    });

    it('应该使用缓存', async () => {
      const cacheKey = 'course_progress_user-123456_course-123';
      mockCacheService.get.mockResolvedValue(JSON.stringify(testCourseProgress));
      
      const response = await request(app)
        .get('/api/progress/courses/course-123')
        .set('Authorization', 'Bearer jwt-token-123')
        .expect(200);
      
      expect(mockCacheService.get).toHaveBeenCalledWith(cacheKey);
      expect(response.body.data.progress).toBe(65);
    });
  });

  /**
   * 课程进度更新测试
   */
  describe('PUT /api/progress/courses/:courseId', () => {
    it('应该更新课程进度', async () => {
      const updateData = {
        progress: 75,
        currentLessonId: 'lesson-10',
        timeSpent: 30
      };
      
      const response = await request(app)
        .put('/api/progress/courses/course-123')
        .set('Authorization', 'Bearer jwt-token-123')
        .send(updateData)
        .expect(200);
      
      expect(response.body).toEqual(
        expect.objectContaining({
          success: true,
          message: '课程进度更新成功'
        })
      );
      
      expect(mockLearningProgressService.updateCourseProgress).toHaveBeenCalledWith(
        'user-123456',
        'course-123',
        expect.objectContaining(updateData)
      );
      
      expect(mockAnalyticsService.track).toHaveBeenCalledWith(
        'course.progress.update',
        expect.objectContaining({
          userId: 'user-123456',
          courseId: 'course-123',
          progress: 75
        })
      );
    });

    it('应该验证进度值范围', async () => {
      const response = await request(app)
        .put('/api/progress/courses/course-123')
        .set('Authorization', 'Bearer jwt-token-123')
        .send({
          progress: 150 // 超出范围
        })
        .expect(400);
      
      expect(response.body).toEqual(
        expect.objectContaining({
          success: false,
          message: '请求参数验证失败',
          errors: expect.arrayContaining([
            expect.objectContaining({
              field: 'progress',
              message: '进度值必须在0-100之间'
            })
          ])
        })
      );
    });

    it('应该自动完成课程', async () => {
      const response = await request(app)
        .put('/api/progress/courses/course-123')
        .set('Authorization', 'Bearer jwt-token-123')
        .send({
          progress: 100
        })
        .expect(200);
      
      expect(mockLearningProgressService.updateCourseProgress).toHaveBeenCalledWith(
        'user-123456',
        'course-123',
        expect.objectContaining({
          progress: 100,
          status: 'completed',
          completedAt: expect.any(String)
        })
      );
    });
  });

  /**
   * 课时进度获取测试
   */
  describe('GET /api/progress/lessons/:lessonId', () => {
    it('应该获取课时进度', async () => {
      const response = await request(app)
        .get('/api/progress/lessons/lesson-9')
        .set('Authorization', 'Bearer jwt-token-123')
        .expect(200);
      
      expect(response.body).toEqual(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            lessonId: 'lesson-9',
            progress: 75,
            status: 'in_progress',
            timeSpent: 25,
            watchTime: 1200
          })
        })
      );
    });

    it('应该包含学习元数据', async () => {
      const response = await request(app)
        .get('/api/progress/lessons/lesson-9')
        .set('Authorization', 'Bearer jwt-token-123')
        .expect(200);
      
      expect(response.body.data.metadata).toEqual(
        expect.objectContaining({
          notes: '重要概念：闭包的应用',
          bookmarks: [300, 800, 1200],
          highlights: ['闭包', '作用域链'],
          quizScore: 90
        })
      );
    });
  });

  /**
   * 课时进度更新测试
   */
  describe('PUT /api/progress/lessons/:lessonId', () => {
    it('应该更新课时进度', async () => {
      const updateData = {
        progress: 90,
        watchTime: 1500,
        lastPosition: 1500,
        interactionCount: 8
      };
      
      const response = await request(app)
        .put('/api/progress/lessons/lesson-9')
        .set('Authorization', 'Bearer jwt-token-123')
        .send(updateData)
        .expect(200);
      
      expect(response.body).toEqual(
        expect.objectContaining({
          success: true,
          message: '课时进度更新成功'
        })
      );
      
      expect(mockLearningProgressService.updateLessonProgress).toHaveBeenCalledWith(
        'user-123456',
        'lesson-9',
        expect.objectContaining(updateData)
      );
    });

    it('应该支持添加笔记', async () => {
      const response = await request(app)
        .put('/api/progress/lessons/lesson-9')
        .set('Authorization', 'Bearer jwt-token-123')
        .send({
          metadata: {
            notes: '新增笔记：异步编程的最佳实践'
          }
        })
        .expect(200);
      
      expect(mockLearningProgressService.updateLessonProgress).toHaveBeenCalledWith(
        'user-123456',
        'lesson-9',
        expect.objectContaining({
          metadata: expect.objectContaining({
            notes: '新增笔记：异步编程的最佳实践'
          })
        })
      );
    });

    it('应该支持添加书签', async () => {
      const response = await request(app)
        .put('/api/progress/lessons/lesson-9')
        .set('Authorization', 'Bearer jwt-token-123')
        .send({
          metadata: {
            bookmarks: [300, 800, 1200, 1800]
          }
        })
        .expect(200);
      
      expect(mockLearningProgressService.updateLessonProgress).toHaveBeenCalledWith(
        'user-123456',
        'lesson-9',
        expect.objectContaining({
          metadata: expect.objectContaining({
            bookmarks: [300, 800, 1200, 1800]
          })
        })
      );
    });
  });

  /**
   * 学习会话管理测试
   */
  describe('POST /api/progress/sessions', () => {
    it('应该开始学习会话', async () => {
      const sessionData = {
        courseId: 'course-123',
        lessonId: 'lesson-9',
        activityType: 'video'
      };
      
      const response = await request(app)
        .post('/api/progress/sessions')
        .set('Authorization', 'Bearer jwt-token-123')
        .send(sessionData)
        .expect(201);
      
      expect(response.body).toEqual(
        expect.objectContaining({
          success: true,
          message: '学习会话开始',
          data: expect.objectContaining({
            sessionId: expect.any(String),
            startTime: expect.any(String)
          })
        })
      );
      
      expect(mockLearningProgressService.startLearningSession).toHaveBeenCalledWith(
        'user-123456',
        expect.objectContaining(sessionData)
      );
    });

    it('应该检查并发会话限制', async () => {
      mockLearningProgressService.startLearningSession.mockRejectedValue(
        new Error('用户已有活跃的学习会话')
      );
      
      const response = await request(app)
        .post('/api/progress/sessions')
        .set('Authorization', 'Bearer jwt-token-123')
        .send({
          courseId: 'course-123',
          lessonId: 'lesson-9',
          activityType: 'video'
        })
        .expect(409);
      
      expect(response.body).toEqual(
        expect.objectContaining({
          success: false,
          message: '用户已有活跃的学习会话'
        })
      );
    });
  });

  /**
   * 学习会话结束测试
   */
  describe('PUT /api/progress/sessions/:sessionId/end', () => {
    it('应该结束学习会话', async () => {
      const endData = {
        progress: 85,
        interactions: 12
      };
      
      const response = await request(app)
        .put('/api/progress/sessions/session-123/end')
        .set('Authorization', 'Bearer jwt-token-123')
        .send(endData)
        .expect(200);
      
      expect(response.body).toEqual(
        expect.objectContaining({
          success: true,
          message: '学习会话结束',
          data: expect.objectContaining({
            duration: expect.any(Number),
            progress: 85
          })
        })
      );
      
      expect(mockLearningProgressService.endLearningSession).toHaveBeenCalledWith(
        'session-123',
        expect.objectContaining(endData)
      );
    });

    it('应该自动保存进度', async () => {
      const response = await request(app)
        .put('/api/progress/sessions/session-123/end')
        .set('Authorization', 'Bearer jwt-token-123')
        .send({
          progress: 100
        })
        .expect(200);
      
      expect(mockLearningProgressService.endLearningSession).toHaveBeenCalled();
      expect(mockAnalyticsService.track).toHaveBeenCalledWith(
        'learning.session.complete',
        expect.objectContaining({
          sessionId: 'session-123',
          progress: 100
        })
      );
    });
  });

  /**
   * 用户总体进度获取测试
   */
  describe('GET /api/progress/overview', () => {
    it('应该获取用户学习概览', async () => {
      const overviewData = {
        totalCourses: 15,
        completedCourses: 8,
        inProgressCourses: 7,
        totalLearningTime: 2400,
        streakDays: 15,
        level: 8,
        pointsEarned: 8500,
        recentActivities: []
      };
      
      mockLearningProgressService.getUserProgress.mockResolvedValue(overviewData);
      
      const response = await request(app)
        .get('/api/progress/overview')
        .set('Authorization', 'Bearer jwt-token-123')
        .expect(200);
      
      expect(response.body).toEqual(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            totalCourses: 15,
            completedCourses: 8,
            inProgressCourses: 7,
            totalLearningTime: 2400,
            streakDays: 15,
            level: 8
          })
        })
      );
    });

    it('应该支持时间范围筛选', async () => {
      const response = await request(app)
        .get('/api/progress/overview?period=month')
        .set('Authorization', 'Bearer jwt-token-123')
        .expect(200);
      
      expect(mockLearningProgressService.getUserProgress).toHaveBeenCalledWith(
        'user-123456',
        expect.objectContaining({
          period: 'month'
        })
      );
    });
  });

  /**
   * 学习目标管理测试
   */
  describe('POST /api/progress/goals', () => {
    it('应该创建学习目标', async () => {
      const goalData = {
        title: '掌握React框架',
        description: '在2个月内完成React相关课程',
        type: 'skill_mastery',
        targetValue: 3,
        unit: 'courses',
        deadline: '2024-06-01',
        priority: 'high',
        relatedSkills: ['react', 'javascript']
      };
      
      mockLearningProgressService.createLearningGoal.mockResolvedValue(testLearningGoal);
      
      const response = await request(app)
        .post('/api/progress/goals')
        .set('Authorization', 'Bearer jwt-token-123')
        .send(goalData)
        .expect(201);
      
      expect(response.body).toEqual(
        expect.objectContaining({
          success: true,
          message: '学习目标创建成功',
          data: expect.objectContaining({
            id: expect.any(String),
            title: goalData.title,
            type: goalData.type
          })
        })
      );
    });

    it('应该验证目标数据', async () => {
      const response = await request(app)
        .post('/api/progress/goals')
        .set('Authorization', 'Bearer jwt-token-123')
        .send({
          title: '', // 空标题
          targetValue: -1, // 负数
          deadline: '2020-01-01' // 过去的日期
        })
        .expect(400);
      
      expect(response.body.errors).toContainEqual(
        expect.objectContaining({
          field: 'title',
          message: '目标标题不能为空'
        })
      );
    });
  });

  /**
   * 学习目标获取测试
   */
  describe('GET /api/progress/goals', () => {
    it('应该获取用户学习目标列表', async () => {
      mockLearningProgressService.getLearningGoals.mockResolvedValue([testLearningGoal]);
      
      const response = await request(app)
        .get('/api/progress/goals')
        .set('Authorization', 'Bearer jwt-token-123')
        .expect(200);
      
      expect(response.body).toEqual(
        expect.objectContaining({
          success: true,
          data: expect.arrayContaining([
            expect.objectContaining({
              id: 'goal-123',
              title: '完成前端开发课程',
              status: 'active',
              progress: expect.any(Number)
            })
          ])
        })
      );
    });

    it('应该支持状态筛选', async () => {
      const response = await request(app)
        .get('/api/progress/goals?status=active')
        .set('Authorization', 'Bearer jwt-token-123')
        .expect(200);
      
      expect(mockLearningProgressService.getLearningGoals).toHaveBeenCalledWith(
        'user-123456',
        expect.objectContaining({
          status: 'active'
        })
      );
    });
  });

  /**
   * 技能掌握度测试
   */
  describe('GET /api/progress/skills', () => {
    it('应该获取技能掌握度', async () => {
      mockLearningProgressService.getSkillMastery.mockResolvedValue([testSkillMastery]);
      
      const response = await request(app)
        .get('/api/progress/skills')
        .set('Authorization', 'Bearer jwt-token-123')
        .expect(200);
      
      expect(response.body).toEqual(
        expect.objectContaining({
          success: true,
          data: expect.arrayContaining([
            expect.objectContaining({
              skillName: 'JavaScript',
              level: 'intermediate',
              masteryScore: 75,
              strengthAreas: expect.any(Array),
              weaknessAreas: expect.any(Array)
            })
          ])
        })
      );
    });
  });

  /**
   * 学习推荐测试
   */
  describe('GET /api/progress/recommendations', () => {
    it('应该获取个性化推荐', async () => {
      const response = await request(app)
        .get('/api/progress/recommendations')
        .set('Authorization', 'Bearer jwt-token-123')
        .expect(200);
      
      expect(response.body).toEqual(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            courses: expect.any(Array),
            skills: expect.any(Array),
            learningPaths: expect.any(Array)
          })
        })
      );
      
      expect(mockAiService.generatePersonalizedRecommendations).toHaveBeenCalledWith(
        'user-123456'
      );
    });

    it('应该支持推荐类型筛选', async () => {
      const response = await request(app)
        .get('/api/progress/recommendations?type=courses')
        .set('Authorization', 'Bearer jwt-token-123')
        .expect(200);
      
      expect(mockAiService.generatePersonalizedRecommendations).toHaveBeenCalledWith(
        'user-123456',
        expect.objectContaining({
          type: 'courses'
        })
      );
    });
  });

  /**
   * 学习路径生成测试
   */
  describe('POST /api/progress/learning-paths', () => {
    it('应该生成个性化学习路径', async () => {
      const pathData = {
        targetSkills: ['react', 'nodejs'],
        currentLevel: 'beginner',
        timeAvailable: 10, // 每周小时数
        deadline: '2024-12-31'
      };
      
      const generatedPath = {
        id: 'path-123',
        title: 'Full Stack JavaScript开发路径',
        estimatedDuration: 240, // 小时
        courses: [
          { courseId: 'course-js-basics', order: 1, isRequired: true },
          { courseId: 'course-react', order: 2, isRequired: true },
          { courseId: 'course-nodejs', order: 3, isRequired: true }
        ]
      };
      
      mockAiService.generateLearningPath.mockResolvedValue(generatedPath);
      
      const response = await request(app)
        .post('/api/progress/learning-paths')
        .set('Authorization', 'Bearer jwt-token-123')
        .send(pathData)
        .expect(201);
      
      expect(response.body).toEqual(
        expect.objectContaining({
          success: true,
          message: '学习路径生成成功',
          data: expect.objectContaining({
            title: 'Full Stack JavaScript开发路径',
            estimatedDuration: 240,
            courses: expect.any(Array)
          })
        })
      );
    });
  });

  /**
   * 错误处理测试
   */
  describe('Error Handling', () => {
    it('应该处理服务不可用错误', async () => {
      mockLearningProgressService.getCourseProgress.mockRejectedValue(
        new Error('Service temporarily unavailable')
      );
      
      const response = await request(app)
        .get('/api/progress/courses/course-123')
        .set('Authorization', 'Bearer jwt-token-123')
        .expect(500);
      
      expect(response.body).toEqual(
        expect.objectContaining({
          success: false,
          message: '服务器内部错误'
        })
      );
    });

    it('应该处理无效的课程ID', async () => {
      const response = await request(app)
        .get('/api/progress/courses/invalid-id')
        .set('Authorization', 'Bearer jwt-token-123')
        .expect(400);
      
      expect(response.body).toEqual(
        expect.objectContaining({
          success: false,
          message: '无效的课程ID格式'
        })
      );
    });
  });

  /**
   * 性能测试
   */
  describe('Performance Tests', () => {
    it('应该在合理时间内返回进度数据', async () => {
      const startTime = Date.now();
      
      await request(app)
        .get('/api/progress/overview')
        .set('Authorization', 'Bearer jwt-token-123')
        .expect(200);
      
      const executionTime = Date.now() - startTime;
      expect(executionTime).toBeLessThan(500); // 500ms内完成
    });

    it('应该有效利用缓存', async () => {
      const cacheKey = 'course_progress_user-123456_course-123';
      mockCacheService.get.mockResolvedValue(JSON.stringify(testCourseProgress));
      
      await request(app)
        .get('/api/progress/courses/course-123')
        .set('Authorization', 'Bearer jwt-token-123')
        .expect(200);
      
      expect(mockCacheService.get).toHaveBeenCalledWith(cacheKey);
      expect(mockLearningProgressService.getCourseProgress).not.toHaveBeenCalled();
    });

    it('应该批量处理进度更新', async () => {
      const batchUpdates = [
        { lessonId: 'lesson-1', progress: 100 },
        { lessonId: 'lesson-2', progress: 50 },
        { lessonId: 'lesson-3', progress: 25 }
      ];
      
      const response = await request(app)
        .put('/api/progress/batch')
        .set('Authorization', 'Bearer jwt-token-123')
        .send({ updates: batchUpdates })
        .expect(200);
      
      expect(response.body).toEqual(
        expect.objectContaining({
          success: true,
          message: '批量更新成功',
          data: expect.objectContaining({
            updated: 3,
            failed: 0
          })
        })
      );
    });
  });
});