/**
 * 学习进度服务单元测试
 * 
 * 测试学习进度服务，包括：
 * - 学习路径管理
 * - 进度跟踪和更新
 * - 成就系统
 * - 学习统计分析
 * - 个性化推荐
 * - 学习计划制定
 * - 知识点掌握度评估
 * - 学习效果分析
 */

import { 
  LearningProgressService,
  createLearningProgressService,
  getLearningProgressService,
  LearningProgress,
  LearningPath,
  Achievement,
  StudySession,
  KnowledgePoint,
  LearningGoal,
  ProgressReport,
  LearningRecommendation,
  StudyPlan,
  SkillAssessment,
  LearningAnalytics
} from '../../services/learningProgressService';
import { logger } from '../../utils/logger';
import { supabaseClient } from '../../utils/supabase';
import { cacheService } from '../../services/cacheService';
import { analyticsService } from '../../services/analyticsService';
import { aiService } from '../../services/aiService';
import { auditService } from '../../services/auditService';
import { envConfig } from '../../config/envConfig';

// Mock 依赖
jest.mock('../../utils/logger');
jest.mock('../../utils/supabase');
jest.mock('../../services/cacheService');
jest.mock('../../services/analyticsService');
jest.mock('../../services/aiService');
jest.mock('../../services/auditService');
jest.mock('../../config/envConfig');

// 类型定义
interface LearningConfig {
  enableProgress: boolean;
  enableAchievements: boolean;
  enableRecommendations: boolean;
  enableAnalytics: boolean;
  progressUpdateInterval: number;
  achievementCheckInterval: number;
  recommendationRefreshInterval: number;
  maxStudySessionDuration: number;
  minStudySessionDuration: number;
  defaultStudyGoalHours: number;
  skillLevels: string[];
  difficultyLevels: string[];
}

interface ProgressMetrics {
  totalStudyTime: number;
  completedCourses: number;
  completedLessons: number;
  achievementsEarned: number;
  currentStreak: number;
  longestStreak: number;
  averageSessionDuration: number;
  skillPoints: number;
  knowledgePointsMastered: number;
  overallProgress: number;
}

interface LearningInsights {
  strongAreas: string[];
  weakAreas: string[];
  recommendedTopics: string[];
  optimalStudyTime: string;
  learningVelocity: number;
  retentionRate: number;
  engagementScore: number;
  difficultyPreference: string;
  learningStyle: string;
}

// Mock 实例
const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  child: jest.fn().mockReturnThis()
};

const mockSupabaseClient = {
  from: jest.fn(),
  rpc: jest.fn(),
  auth: {
    getUser: jest.fn()
  }
};

const mockQueryBuilder = {
  insert: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  upsert: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  neq: jest.fn().mockReturnThis(),
  gt: jest.fn().mockReturnThis(),
  gte: jest.fn().mockReturnThis(),
  lt: jest.fn().mockReturnThis(),
  lte: jest.fn().mockReturnThis(),
  like: jest.fn().mockReturnThis(),
  ilike: jest.fn().mockReturnThis(),
  in: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  range: jest.fn().mockReturnThis(),
  single: jest.fn().mockReturnThis()
};

const mockCacheService = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  keys: jest.fn(),
  mget: jest.fn(),
  mset: jest.fn(),
  incr: jest.fn(),
  expire: jest.fn()
};

const mockAnalyticsService = {
  track: jest.fn(),
  increment: jest.fn(),
  histogram: jest.fn(),
  gauge: jest.fn(),
  timer: jest.fn()
};

const mockAiService = {
  generateRecommendations: jest.fn(),
  analyzeProgress: jest.fn(),
  predictPerformance: jest.fn(),
  generateStudyPlan: jest.fn(),
  assessSkillLevel: jest.fn()
};

const mockAuditService = {
  log: jest.fn(),
  logUserActivity: jest.fn()
};

const mockEnvConfig = {
  learning: {
    enableProgress: true,
    enableAchievements: true,
    enableRecommendations: true,
    enableAnalytics: true,
    progressUpdateInterval: 30000,
    achievementCheckInterval: 60000,
    recommendationRefreshInterval: 3600000,
    maxStudySessionDuration: 14400000, // 4 hours
    minStudySessionDuration: 300000, // 5 minutes
    defaultStudyGoalHours: 2,
    skillLevels: ['beginner', 'intermediate', 'advanced', 'expert'],
    difficultyLevels: ['easy', 'medium', 'hard', 'expert']
  },
  ai: {
    enableRecommendations: true,
    modelVersion: 'v1.0'
  }
};

// 设置 Mock
const mockLoggerTyped = logger as jest.Mocked<typeof logger>;
const mockSupabaseClientTyped = supabaseClient as jest.Mocked<typeof supabaseClient>;
const mockCacheServiceTyped = cacheService as jest.Mocked<typeof cacheService>;
const mockAnalyticsServiceTyped = analyticsService as jest.Mocked<typeof analyticsService>;
const mockAiServiceTyped = aiService as jest.Mocked<typeof aiService>;
const mockAuditServiceTyped = auditService as jest.Mocked<typeof auditService>;
const mockEnvConfigTyped = envConfig as jest.Mocked<typeof envConfig>;

// 测试数据
const testUser = {
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User'
};

const testCourse = {
  id: 'course-123',
  title: 'JavaScript Fundamentals',
  description: 'Learn JavaScript basics',
  difficulty: 'beginner',
  estimatedHours: 20,
  skillPoints: 100
};

const testLesson = {
  id: 'lesson-123',
  courseId: 'course-123',
  title: 'Variables and Data Types',
  content: 'Learn about JavaScript variables',
  duration: 1800, // 30 minutes
  order: 1,
  skillPoints: 10
};

const testLearningProgress: LearningProgress = {
  id: 'progress-123',
  userId: 'user-123',
  courseId: 'course-123',
  lessonId: 'lesson-123',
  status: 'in_progress',
  progress: 75,
  timeSpent: 1350, // 22.5 minutes
  lastAccessedAt: new Date(),
  completedAt: null,
  score: 85,
  attempts: 2,
  notes: 'Good understanding of variables',
  bookmarks: ['concept-1', 'example-2'],
  metadata: {
    device: 'desktop',
    browser: 'chrome',
    studyMode: 'focused'
  }
};

const testStudySession: StudySession = {
  id: 'session-123',
  userId: 'user-123',
  startTime: new Date(Date.now() - 1800000), // 30 minutes ago
  endTime: new Date(),
  duration: 1800,
  coursesStudied: ['course-123'],
  lessonsCompleted: ['lesson-123'],
  skillPointsEarned: 10,
  focusScore: 85,
  interactionCount: 25,
  pauseCount: 2,
  totalPauseTime: 120,
  deviceType: 'desktop',
  studyEnvironment: 'quiet'
};

const testAchievement: Achievement = {
  id: 'achievement-123',
  name: 'First Steps',
  description: 'Complete your first lesson',
  type: 'milestone',
  category: 'progress',
  icon: '🎯',
  points: 50,
  rarity: 'common',
  requirements: {
    lessonsCompleted: 1
  },
  unlockedAt: new Date(),
  progress: 100
};

const testKnowledgePoint: KnowledgePoint = {
  id: 'knowledge-123',
  name: 'JavaScript Variables',
  category: 'programming',
  subcategory: 'javascript',
  difficulty: 'beginner',
  prerequisites: [],
  masteryLevel: 75,
  lastReviewed: new Date(),
  reviewCount: 3,
  correctAnswers: 8,
  totalQuestions: 10,
  timeToMaster: 1800,
  relatedTopics: ['data-types', 'scope']
};

const testLearningGoal: LearningGoal = {
  id: 'goal-123',
  userId: 'user-123',
  title: 'Master JavaScript Basics',
  description: 'Complete all beginner JavaScript courses',
  type: 'course_completion',
  targetValue: 5,
  currentValue: 2,
  deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
  priority: 'high',
  status: 'active',
  createdAt: new Date(),
  updatedAt: new Date(),
  rewards: {
    points: 500,
    badge: 'javascript-master'
  }
};

describe('Learning Progress Service', () => {
  let learningProgressService: LearningProgressService;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // 设置默认的mock返回值
    mockSupabaseClient.from.mockReturnValue(mockQueryBuilder);
    mockQueryBuilder.insert.mockResolvedValue({ data: [testLearningProgress], error: null });
    mockQueryBuilder.select.mockResolvedValue({ data: [testLearningProgress], error: null });
    mockQueryBuilder.update.mockResolvedValue({ data: [testLearningProgress], error: null });
    mockCacheService.get.mockResolvedValue(null);
    mockCacheService.set.mockResolvedValue(true);
    mockAnalyticsService.track.mockResolvedValue(true);
    mockAiService.generateRecommendations.mockResolvedValue([]);
    mockAuditService.logUserActivity.mockResolvedValue(true);
    
    learningProgressService = createLearningProgressService();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  /**
   * 服务初始化测试
   */
  describe('Service Initialization', () => {
    it('应该创建学习进度服务实例', () => {
      expect(learningProgressService).toBeDefined();
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Learning progress service initialized successfully'
      );
    });

    it('应该获取现有的服务实例', () => {
      const service1 = getLearningProgressService();
      const service2 = getLearningProgressService();
      
      expect(service1).toBe(service2);
    });

    it('应该初始化用户学习数据', async () => {
      const userId = 'user-123';
      
      await learningProgressService.initializeUserProgress(userId);
      
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('user_learning_profiles');
      expect(mockQueryBuilder.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: userId,
          total_study_time: 0,
          skill_points: 0,
          current_streak: 0
        })
      );
    });
  });

  /**
   * 学习进度跟踪测试
   */
  describe('Progress Tracking', () => {
    it('应该开始学习会话', async () => {
      const sessionData = {
        userId: 'user-123',
        courseId: 'course-123',
        lessonId: 'lesson-123'
      };
      
      const result = await learningProgressService.startStudySession(sessionData);
      
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('study_sessions');
      expect(mockQueryBuilder.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-123',
          course_id: 'course-123',
          lesson_id: 'lesson-123',
          start_time: expect.any(Date)
        })
      );
      expect(mockAnalyticsService.track).toHaveBeenCalledWith(
        'study_session.started',
        expect.any(Object)
      );
    });

    it('应该结束学习会话', async () => {
      const sessionId = 'session-123';
      const sessionData = {
        skillPointsEarned: 10,
        focusScore: 85,
        interactionCount: 25
      };
      
      mockQueryBuilder.update.mockResolvedValue({ data: [testStudySession], error: null });
      
      const result = await learningProgressService.endStudySession(sessionId, sessionData);
      
      expect(result).toBe(true);
      expect(mockQueryBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          end_time: expect.any(Date),
          duration: expect.any(Number),
          skill_points_earned: 10,
          focus_score: 85,
          interaction_count: 25
        })
      );
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('id', sessionId);
    });

    it('应该更新课程进度', async () => {
      const progressData = {
        userId: 'user-123',
        courseId: 'course-123',
        progress: 75,
        timeSpent: 1800,
        score: 85
      };
      
      const result = await learningProgressService.updateCourseProgress(progressData);
      
      expect(result).toBe(true);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('course_progress');
      expect(mockQueryBuilder.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-123',
          course_id: 'course-123',
          progress: 75,
          time_spent: 1800,
          score: 85
        })
      );
    });

    it('应该更新课程进度', async () => {
      const progressData = {
        userId: 'user-123',
        lessonId: 'lesson-123',
        status: 'completed' as const,
        timeSpent: 1800,
        score: 90
      };
      
      const result = await learningProgressService.updateLessonProgress(progressData);
      
      expect(result).toBe(true);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('lesson_progress');
      expect(mockQueryBuilder.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-123',
          lesson_id: 'lesson-123',
          status: 'completed',
          time_spent: 1800,
          score: 90,
          completed_at: expect.any(Date)
        })
      );
    });

    it('应该获取用户学习进度', async () => {
      const userId = 'user-123';
      const courseId = 'course-123';
      
      const progress = await learningProgressService.getUserProgress(userId, courseId);
      
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('course_progress');
      expect(mockQueryBuilder.select).toHaveBeenCalled();
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('user_id', userId);
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('course_id', courseId);
    });
  });

  /**
   * 成就系统测试
   */
  describe('Achievement System', () => {
    it('应该检查并解锁成就', async () => {
      const userId = 'user-123';
      const activityData = {
        type: 'lesson_completed',
        lessonId: 'lesson-123',
        score: 90
      };
      
      mockQueryBuilder.select.mockResolvedValue({
        data: [testAchievement],
        error: null
      });
      
      const achievements = await learningProgressService.checkAchievements(userId, activityData);
      
      expect(achievements).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            name: expect.any(String),
            unlockedAt: expect.any(Date)
          })
        ])
      );
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('user_achievements');
    });

    it('应该获取用户成就列表', async () => {
      const userId = 'user-123';
      
      mockQueryBuilder.select.mockResolvedValue({
        data: [testAchievement],
        error: null
      });
      
      const achievements = await learningProgressService.getUserAchievements(userId);
      
      expect(achievements).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'achievement-123',
            name: 'First Steps'
          })
        ])
      );
    });

    it('应该计算成就进度', async () => {
      const userId = 'user-123';
      const achievementId = 'achievement-123';
      
      mockSupabaseClient.rpc.mockResolvedValue({
        data: { progress: 75 },
        error: null
      });
      
      const progress = await learningProgressService.getAchievementProgress(
        userId,
        achievementId
      );
      
      expect(progress).toBe(75);
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith(
        'calculate_achievement_progress',
        {
          user_id: userId,
          achievement_id: achievementId
        }
      );
    });

    it('应该创建自定义成就', async () => {
      const achievementData = {
        name: 'Speed Learner',
        description: 'Complete 5 lessons in one day',
        type: 'custom' as const,
        requirements: {
          lessonsPerDay: 5
        },
        points: 100
      };
      
      const result = await learningProgressService.createCustomAchievement(achievementData);
      
      expect(result).toBe(true);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('achievements');
      expect(mockQueryBuilder.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Speed Learner',
          type: 'custom',
          points: 100
        })
      );
    });
  });

  /**
   * 学习分析测试
   */
  describe('Learning Analytics', () => {
    it('应该生成学习报告', async () => {
      const userId = 'user-123';
      const period = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31')
      };
      
      mockSupabaseClient.rpc.mockResolvedValue({
        data: {
          total_study_time: 7200,
          completed_lessons: 15,
          skill_points_earned: 150,
          average_score: 85
        },
        error: null
      });
      
      const report = await learningProgressService.generateProgressReport(userId, period);
      
      expect(report).toEqual(
        expect.objectContaining({
          period: expect.any(Object),
          totalStudyTime: 7200,
          completedLessons: 15,
          skillPointsEarned: 150,
          averageScore: 85,
          insights: expect.any(Object)
        })
      );
    });

    it('应该分析学习模式', async () => {
      const userId = 'user-123';
      
      mockSupabaseClient.rpc.mockResolvedValue({
        data: {
          peak_hours: ['09:00', '14:00', '20:00'],
          preferred_duration: 45,
          learning_velocity: 1.2,
          retention_rate: 0.85
        },
        error: null
      });
      
      const patterns = await learningProgressService.analyzeLearningPatterns(userId);
      
      expect(patterns).toEqual(
        expect.objectContaining({
          peakHours: expect.any(Array),
          preferredDuration: 45,
          learningVelocity: 1.2,
          retentionRate: 0.85
        })
      );
    });

    it('应该计算学习统计', async () => {
      const userId = 'user-123';
      
      mockCacheService.get.mockResolvedValue(null);
      mockSupabaseClient.rpc.mockResolvedValue({
        data: {
          total_courses: 5,
          completed_courses: 2,
          total_lessons: 50,
          completed_lessons: 30,
          total_study_time: 14400,
          current_streak: 7,
          longest_streak: 15
        },
        error: null
      });
      
      const stats = await learningProgressService.getLearningStatistics(userId);
      
      expect(stats).toEqual(
        expect.objectContaining({
          totalCourses: 5,
          completedCourses: 2,
          totalLessons: 50,
          completedLessons: 30,
          totalStudyTime: 14400,
          currentStreak: 7,
          longestStreak: 15
        })
      );
      expect(mockCacheService.set).toHaveBeenCalledWith(
        `learning_stats:${userId}`,
        expect.any(Object),
        300 // 5分钟缓存
      );
    });
  });

  /**
   * 个性化推荐测试
   */
  describe('Personalized Recommendations', () => {
    it('应该生成课程推荐', async () => {
      const userId = 'user-123';
      
      mockAiService.generateRecommendations.mockResolvedValue([
        {
          type: 'course',
          id: 'course-456',
          title: 'Advanced JavaScript',
          reason: 'Based on your progress in JavaScript Fundamentals',
          confidence: 0.85,
          priority: 'high'
        }
      ]);
      
      const recommendations = await learningProgressService.getRecommendations(userId);
      
      expect(recommendations).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'course',
            id: 'course-456',
            confidence: 0.85
          })
        ])
      );
      expect(mockAiService.generateRecommendations).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          context: 'learning_progress'
        })
      );
    });

    it('应该推荐复习内容', async () => {
      const userId = 'user-123';
      
      mockQueryBuilder.select.mockResolvedValue({
        data: [
          {
            knowledge_point_id: 'knowledge-123',
            mastery_level: 60,
            last_reviewed: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 days ago
          }
        ],
        error: null
      });
      
      const reviewItems = await learningProgressService.getReviewRecommendations(userId);
      
      expect(reviewItems).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            knowledgePointId: 'knowledge-123',
            priority: expect.any(String),
            reason: expect.any(String)
          })
        ])
      );
    });

    it('应该推荐学习路径', async () => {
      const userId = 'user-123';
      const targetSkill = 'full-stack-development';
      
      mockAiService.generateStudyPlan.mockResolvedValue({
        path: [
          { courseId: 'course-123', order: 1, estimatedWeeks: 4 },
          { courseId: 'course-456', order: 2, estimatedWeeks: 6 }
        ],
        totalDuration: 10,
        difficulty: 'intermediate'
      });
      
      const learningPath = await learningProgressService.generateLearningPath(
        userId,
        targetSkill
      );
      
      expect(learningPath).toEqual(
        expect.objectContaining({
          targetSkill,
          path: expect.any(Array),
          totalDuration: 10,
          difficulty: 'intermediate'
        })
      );
    });
  });

  /**
   * 学习目标管理测试
   */
  describe('Learning Goals Management', () => {
    it('应该创建学习目标', async () => {
      const goalData = {
        userId: 'user-123',
        title: 'Complete React Course',
        type: 'course_completion' as const,
        targetValue: 1,
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      };
      
      const result = await learningProgressService.createLearningGoal(goalData);
      
      expect(result).toBe(true);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('learning_goals');
      expect(mockQueryBuilder.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-123',
          title: 'Complete React Course',
          type: 'course_completion',
          target_value: 1
        })
      );
    });

    it('应该更新目标进度', async () => {
      const goalId = 'goal-123';
      const progress = 3;
      
      const result = await learningProgressService.updateGoalProgress(goalId, progress);
      
      expect(result).toBe(true);
      expect(mockQueryBuilder.update).toHaveBeenCalledWith({
        current_value: progress,
        updated_at: expect.any(Date)
      });
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('id', goalId);
    });

    it('应该检查目标完成', async () => {
      const userId = 'user-123';
      
      mockQueryBuilder.select.mockResolvedValue({
        data: [
          {
            id: 'goal-123',
            target_value: 5,
            current_value: 5,
            status: 'active'
          }
        ],
        error: null
      });
      
      const completedGoals = await learningProgressService.checkGoalCompletion(userId);
      
      expect(completedGoals).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'goal-123',
            completed: true
          })
        ])
      );
    });

    it('应该获取用户目标列表', async () => {
      const userId = 'user-123';
      
      mockQueryBuilder.select.mockResolvedValue({
        data: [testLearningGoal],
        error: null
      });
      
      const goals = await learningProgressService.getUserGoals(userId);
      
      expect(goals).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'goal-123',
            title: 'Master JavaScript Basics'
          })
        ])
      );
    });
  });

  /**
   * 知识点掌握度测试
   */
  describe('Knowledge Point Mastery', () => {
    it('应该更新知识点掌握度', async () => {
      const masteryData = {
        userId: 'user-123',
        knowledgePointId: 'knowledge-123',
        score: 85,
        timeSpent: 1800,
        correct: true
      };
      
      const result = await learningProgressService.updateKnowledgeMastery(masteryData);
      
      expect(result).toBe(true);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('knowledge_mastery');
      expect(mockQueryBuilder.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-123',
          knowledge_point_id: 'knowledge-123',
          mastery_level: expect.any(Number),
          last_reviewed: expect.any(Date)
        })
      );
    });

    it('应该获取知识图谱', async () => {
      const userId = 'user-123';
      const subject = 'javascript';
      
      mockQueryBuilder.select.mockResolvedValue({
        data: [
          {
            knowledge_point_id: 'knowledge-123',
            name: 'Variables',
            mastery_level: 85,
            prerequisites: [],
            dependents: ['knowledge-456']
          }
        ],
        error: null
      });
      
      const knowledgeMap = await learningProgressService.getKnowledgeMap(userId, subject);
      
      expect(knowledgeMap).toEqual(
        expect.objectContaining({
          nodes: expect.any(Array),
          edges: expect.any(Array),
          masteryOverview: expect.any(Object)
        })
      );
    });

    it('应该识别知识薄弱点', async () => {
      const userId = 'user-123';
      
      mockQueryBuilder.select.mockResolvedValue({
        data: [
          {
            knowledge_point_id: 'knowledge-123',
            name: 'Closures',
            mastery_level: 45,
            difficulty: 'advanced'
          }
        ],
        error: null
      });
      
      const weakPoints = await learningProgressService.identifyWeakPoints(userId);
      
      expect(weakPoints).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            knowledgePointId: 'knowledge-123',
            name: 'Closures',
            masteryLevel: 45,
            priority: expect.any(String)
          })
        ])
      );
    });
  });

  /**
   * 学习计划制定测试
   */
  describe('Study Plan Creation', () => {
    it('应该生成个性化学习计划', async () => {
      const planData = {
        userId: 'user-123',
        targetSkills: ['javascript', 'react'],
        availableHours: 10, // per week
        deadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
        difficulty: 'intermediate' as const
      };
      
      mockAiService.generateStudyPlan.mockResolvedValue({
        weeks: [
          {
            week: 1,
            topics: ['JavaScript Basics'],
            estimatedHours: 8,
            goals: ['Complete variables and functions']
          }
        ],
        totalWeeks: 8,
        totalHours: 60
      });
      
      const studyPlan = await learningProgressService.generateStudyPlan(planData);
      
      expect(studyPlan).toEqual(
        expect.objectContaining({
          userId: 'user-123',
          weeks: expect.any(Array),
          totalWeeks: 8,
          totalHours: 60
        })
      );
      expect(mockAiService.generateStudyPlan).toHaveBeenCalledWith(
        expect.objectContaining({
          targetSkills: ['javascript', 'react'],
          availableHours: 10
        })
      );
    });

    it('应该调整学习计划', async () => {
      const planId = 'plan-123';
      const adjustments = {
        availableHours: 15,
        newDeadline: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000)
      };
      
      const result = await learningProgressService.adjustStudyPlan(planId, adjustments);
      
      expect(result).toBe(true);
      expect(mockQueryBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          available_hours: 15,
          deadline: adjustments.newDeadline,
          updated_at: expect.any(Date)
        })
      );
    });

    it('应该跟踪计划执行', async () => {
      const planId = 'plan-123';
      const weekNumber = 1;
      const completionData = {
        hoursStudied: 8,
        topicsCompleted: ['JavaScript Basics'],
        goalsAchieved: 2
      };
      
      const result = await learningProgressService.trackPlanExecution(
        planId,
        weekNumber,
        completionData
      );
      
      expect(result).toBe(true);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('plan_execution');
      expect(mockQueryBuilder.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          plan_id: planId,
          week_number: weekNumber,
          hours_studied: 8,
          topics_completed: ['JavaScript Basics']
        })
      );
    });
  });

  /**
   * 技能评估测试
   */
  describe('Skill Assessment', () => {
    it('应该进行技能评估', async () => {
      const assessmentData = {
        userId: 'user-123',
        skill: 'javascript',
        questions: [
          {
            id: 'q1',
            answer: 'A',
            correct: true,
            timeSpent: 30
          }
        ]
      };
      
      mockAiService.assessSkillLevel.mockResolvedValue({
        level: 'intermediate',
        score: 75,
        strengths: ['variables', 'functions'],
        weaknesses: ['closures', 'async']
      });
      
      const assessment = await learningProgressService.conductSkillAssessment(assessmentData);
      
      expect(assessment).toEqual(
        expect.objectContaining({
          userId: 'user-123',
          skill: 'javascript',
          level: 'intermediate',
          score: 75,
          strengths: expect.any(Array),
          weaknesses: expect.any(Array)
        })
      );
    });

    it('应该获取技能等级', async () => {
      const userId = 'user-123';
      const skill = 'javascript';
      
      mockQueryBuilder.select.mockResolvedValue({
        data: [{
          skill: 'javascript',
          level: 'intermediate',
          score: 75,
          assessed_at: new Date()
        }],
        error: null
      });
      
      const skillLevel = await learningProgressService.getSkillLevel(userId, skill);
      
      expect(skillLevel).toEqual(
        expect.objectContaining({
          skill: 'javascript',
          level: 'intermediate',
          score: 75
        })
      );
    });

    it('应该更新技能等级', async () => {
      const skillData = {
        userId: 'user-123',
        skill: 'javascript',
        level: 'advanced',
        score: 85,
        evidence: {
          completedCourses: ['course-123'],
          assessmentScores: [85, 90, 88]
        }
      };
      
      const result = await learningProgressService.updateSkillLevel(skillData);
      
      expect(result).toBe(true);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('user_skills');
      expect(mockQueryBuilder.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-123',
          skill: 'javascript',
          level: 'advanced',
          score: 85
        })
      );
    });
  });

  /**
   * 错误处理测试
   */
  describe('Error Handling', () => {
    it('应该处理数据库连接错误', async () => {
      mockQueryBuilder.insert.mockRejectedValue(new Error('Connection failed'));
      
      const result = await learningProgressService.updateCourseProgress({
        userId: 'user-123',
        courseId: 'course-123',
        progress: 50
      });
      
      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to update course progress',
        expect.objectContaining({
          error: 'Connection failed'
        })
      );
    });

    it('应该处理无效数据', async () => {
      interface CourseProgressData {
        userId: string;
        courseId: string;
        progress: number;
      }
      
      const invalidData = {
        userId: '', // 空字符串
        courseId: null, // null值
        progress: -10 // 无效进度
      };
      
      const result = await learningProgressService.updateCourseProgress(invalidData as CourseProgressData);
      
      expect(result).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Invalid progress data',
        expect.objectContaining({
          data: expect.any(Object)
        })
      );
    });

    it('应该处理AI服务错误', async () => {
      mockAiService.generateRecommendations.mockRejectedValue(
        new Error('AI service unavailable')
      );
      
      const recommendations = await learningProgressService.getRecommendations('user-123');
      
      expect(recommendations).toEqual([]);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to generate recommendations',
        expect.objectContaining({
          error: expect.any(String)
        })
      );
    });
  });

  /**
   * 性能测试
   */
  describe('Performance Tests', () => {
    it('应该高效处理批量进度更新', async () => {
      const progressUpdates = Array.from({ length: 100 }, (_, i) => ({
        userId: `user-${i}`,
        courseId: 'course-123',
        progress: Math.floor(Math.random() * 100)
      }));
      
      const startTime = Date.now();
      await learningProgressService.batchUpdateProgress(progressUpdates);
      const executionTime = Date.now() - startTime;
      
      expect(executionTime).toBeLessThan(2000); // 2秒内完成100个更新
      expect(mockQueryBuilder.upsert).toHaveBeenCalledWith(
        expect.arrayContaining(progressUpdates.map(update => 
          expect.objectContaining({
            user_id: update.userId,
            course_id: update.courseId,
            progress: update.progress
          })
        ))
      );
    });

    it('应该有效利用缓存', async () => {
      const userId = 'user-123';
      
      // 第一次调用
      await learningProgressService.getLearningStatistics(userId);
      
      // 第二次调用应该使用缓存
      mockCacheService.get.mockResolvedValue({
        totalCourses: 5,
        completedCourses: 2
      });
      
      await learningProgressService.getLearningStatistics(userId);
      
      expect(mockSupabaseClient.rpc).toHaveBeenCalledTimes(1); // 只调用一次数据库
      expect(mockCacheService.get).toHaveBeenCalledTimes(2); // 两次都检查缓存
    });
  });

  /**
   * 边界情况测试
   */
  describe('Edge Cases', () => {
    it('应该处理零进度情况', async () => {
      const result = await learningProgressService.updateCourseProgress({
        userId: 'user-123',
        courseId: 'course-123',
        progress: 0,
        timeSpent: 0
      });
      
      expect(result).toBe(true);
      expect(mockQueryBuilder.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          progress: 0,
          time_spent: 0
        })
      );
    });

    it('应该处理超过100%的进度', async () => {
      const result = await learningProgressService.updateCourseProgress({
        userId: 'user-123',
        courseId: 'course-123',
        progress: 150 // 超过100%
      });
      
      expect(result).toBe(true);
      expect(mockQueryBuilder.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          progress: 100 // 应该被限制为100%
        })
      );
    });

    it('应该处理非常长的学习会话', async () => {
      const sessionData = {
        userId: 'user-123',
        courseId: 'course-123'
      };
      
      const session = await learningProgressService.startStudySession(sessionData);
      
      // 模拟超长会话（超过4小时）
      const longSessionEnd = {
        skillPointsEarned: 50,
        focusScore: 30 // 长时间学习后专注度下降
      };
      
      const result = await learningProgressService.endStudySession(session.id, longSessionEnd);
      
      expect(result).toBe(true);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Long study session detected',
        expect.objectContaining({
          sessionId: session.id,
          duration: expect.any(Number)
        })
      );
    });
  });
});