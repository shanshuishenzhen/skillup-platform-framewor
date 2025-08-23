/**
 * 学习分析API集成测试
 * 
 * 测试学习分析相关的API端点，包括：
 * - 学习数据统计
 * - 学习行为分析
 * - 学习效果评估
 * - 学习趋势预测
 * - 个性化洞察
 * - 学习报告生成
 * - 数据可视化
 * - 比较分析
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
interface LearningStats {
  userId: string;
  period: 'day' | 'week' | 'month' | 'year';
  totalLearningTime: number; // 分钟
  coursesCompleted: number;
  lessonsCompleted: number;
  quizzesTaken: number;
  averageScore: number;
  streakDays: number;
  activeHours: number[];
  preferredDevices: string[];
  learningVelocity: number; // 课程/月
  engagementScore: number; // 0-100
  retentionRate: number; // 0-100
  completionRate: number; // 0-100
  createdAt: Date;
  updatedAt: Date;
}

interface LearningBehavior {
  userId: string;
  sessionId: string;
  activityType: 'video' | 'reading' | 'quiz' | 'assignment' | 'discussion';
  duration: number; // 秒
  interactions: number;
  pauseCount: number;
  seekCount: number;
  replayCount: number;
  speedChanges: number;
  notesTaken: number;
  bookmarksAdded: number;
  questionsAsked: number;
  helpRequested: boolean;
  difficultyRating?: number; // 1-5
  satisfactionRating?: number; // 1-5
  timestamp: Date;
  metadata: {
    device: string;
    browser: string;
    screenSize: string;
    connectionSpeed: string;
    location: string;
  };
}

interface LearningInsight {
  id: string;
  userId: string;
  type: 'strength' | 'weakness' | 'opportunity' | 'trend' | 'recommendation';
  category: 'learning_pattern' | 'skill_development' | 'engagement' | 'performance';
  title: string;
  description: string;
  confidence: number; // 0-1
  impact: 'low' | 'medium' | 'high';
  actionable: boolean;
  recommendations: string[];
  supportingData: {
    metrics: Record<string, number>;
    comparisons: Record<string, number>;
    trends: Array<{ date: string; value: number }>;
  };
  generatedAt: Date;
  validUntil: Date;
}

interface LearningReport {
  id: string;
  userId: string;
  type: 'weekly' | 'monthly' | 'quarterly' | 'custom';
  period: {
    start: Date;
    end: Date;
  };
  summary: {
    totalTime: number;
    coursesCompleted: number;
    skillsImproved: number;
    achievementsUnlocked: number;
    overallProgress: number;
  };
  sections: {
    learningActivity: {
      dailyTime: Array<{ date: string; minutes: number }>;
      topCourses: Array<{ courseId: string; title: string; timeSpent: number }>;
      topSkills: Array<{ skillId: string; name: string; improvement: number }>;
    };
    performance: {
      averageScore: number;
      scoreDistribution: Record<string, number>;
      improvementTrend: Array<{ date: string; score: number }>;
      strongAreas: string[];
      weakAreas: string[];
    };
    engagement: {
      sessionCount: number;
      averageSessionLength: number;
      streakDays: number;
      interactionRate: number;
      completionRate: number;
    };
    insights: LearningInsight[];
    recommendations: {
      nextCourses: Array<{ courseId: string; reason: string; priority: number }>;
      skillGaps: Array<{ skill: string; importance: number; resources: string[] }>;
      learningTips: string[];
    };
  };
  generatedAt: Date;
}

interface ComparisonData {
  userId: string;
  comparisonType: 'peer' | 'cohort' | 'global' | 'historical';
  metrics: {
    learningTime: {
      user: number;
      comparison: number;
      percentile: number;
    };
    completionRate: {
      user: number;
      comparison: number;
      percentile: number;
    };
    averageScore: {
      user: number;
      comparison: number;
      percentile: number;
    };
    engagementScore: {
      user: number;
      comparison: number;
      percentile: number;
    };
  };
  insights: string[];
  recommendations: string[];
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
  histogram: jest.fn(),
  getLearningStats: jest.fn(),
  getLearningBehavior: jest.fn(),
  generateInsights: jest.fn(),
  generateReport: jest.fn(),
  getComparisonData: jest.fn(),
  trackEvent: jest.fn(),
  getMetrics: jest.fn(),
  aggregateData: jest.fn()
};

const mockLearningProgressService = {
  getUserProgress: jest.fn(),
  getCourseProgress: jest.fn(),
  getLearningHistory: jest.fn(),
  getSkillProgress: jest.fn(),
  calculateLearningVelocity: jest.fn()
};

const mockAiService = {
  analyzeLearningPattern: jest.fn(),
  predictLearningOutcome: jest.fn(),
  generateInsights: jest.fn(),
  identifyLearningStyle: jest.fn(),
  recommendOptimizations: jest.fn(),
  detectAnomalies: jest.fn()
};

const mockEnvConfig = {
  analytics: {
    retentionPeriod: 365, // 天
    aggregationInterval: 3600, // 秒
    insightRefreshInterval: 86400, // 24小时
    reportGenerationLimit: 10, // 每月
    enableRealTimeTracking: true,
    enablePredictiveAnalytics: true
  },
  privacy: {
    anonymizeData: true,
    dataRetentionDays: 730,
    enableOptOut: true
  }
};

const mockJwt = {
  verify: jest.fn(),
  sign: jest.fn()
};

// 设置 Mock
(supabaseClient as any) = mockSupabaseClient;
(cacheService as any) = mockCacheService;
(auditService as any) = mockAuditService;
(analyticsService as any) = mockAnalyticsService;
(learningProgressService as any) = mockLearningProgressService;
(aiService as any) = mockAiService;
(envConfig as any) = mockEnvConfig;
(jwt as any) = mockJwt;

// 测试数据
const testLearningStats: LearningStats = {
  userId: 'user-123456',
  period: 'month',
  totalLearningTime: 1800, // 30小时
  coursesCompleted: 3,
  lessonsCompleted: 45,
  quizzesTaken: 15,
  averageScore: 85,
  streakDays: 12,
  activeHours: [9, 10, 14, 15, 19, 20, 21],
  preferredDevices: ['desktop', 'mobile'],
  learningVelocity: 1.5,
  engagementScore: 78,
  retentionRate: 92,
  completionRate: 88,
  createdAt: new Date(),
  updatedAt: new Date()
};

const testLearningBehavior: LearningBehavior = {
  userId: 'user-123456',
  sessionId: 'session-123',
  activityType: 'video',
  duration: 1800, // 30分钟
  interactions: 15,
  pauseCount: 3,
  seekCount: 2,
  replayCount: 1,
  speedChanges: 2,
  notesTaken: 5,
  bookmarksAdded: 2,
  questionsAsked: 1,
  helpRequested: false,
  difficultyRating: 3,
  satisfactionRating: 4,
  timestamp: new Date(),
  metadata: {
    device: 'desktop',
    browser: 'chrome',
    screenSize: '1920x1080',
    connectionSpeed: 'high',
    location: 'Beijing'
  }
};

const testLearningInsight: LearningInsight = {
  id: 'insight-123',
  userId: 'user-123456',
  type: 'opportunity',
  category: 'learning_pattern',
  title: '学习时间优化建议',
  description: '您在晚上19-21点的学习效率最高，建议将重要课程安排在这个时间段',
  confidence: 0.85,
  impact: 'medium',
  actionable: true,
  recommendations: [
    '将重要课程安排在19-21点',
    '避免在上午进行复杂的学习任务',
    '利用碎片时间进行复习'
  ],
  supportingData: {
    metrics: {
      eveningEfficiency: 0.92,
      morningEfficiency: 0.65,
      afternoonEfficiency: 0.78
    },
    comparisons: {
      peerAverageEvening: 0.75,
      peerAverageMorning: 0.70
    },
    trends: [
      { date: '2024-01-01', value: 0.85 },
      { date: '2024-01-02', value: 0.90 },
      { date: '2024-01-03', value: 0.88 }
    ]
  },
  generatedAt: new Date(),
  validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7天后
};

const testLearningReport: LearningReport = {
  id: 'report-123',
  userId: 'user-123456',
  type: 'monthly',
  period: {
    start: new Date('2024-01-01'),
    end: new Date('2024-01-31')
  },
  summary: {
    totalTime: 1800,
    coursesCompleted: 3,
    skillsImproved: 8,
    achievementsUnlocked: 5,
    overallProgress: 75
  },
  sections: {
    learningActivity: {
      dailyTime: [
        { date: '2024-01-01', minutes: 60 },
        { date: '2024-01-02', minutes: 90 },
        { date: '2024-01-03', minutes: 45 }
      ],
      topCourses: [
        { courseId: 'course-123', title: 'JavaScript基础', timeSpent: 600 },
        { courseId: 'course-456', title: 'React入门', timeSpent: 480 }
      ],
      topSkills: [
        { skillId: 'javascript', name: 'JavaScript', improvement: 25 },
        { skillId: 'react', name: 'React', improvement: 20 }
      ]
    },
    performance: {
      averageScore: 85,
      scoreDistribution: {
        '90-100': 30,
        '80-89': 45,
        '70-79': 20,
        '60-69': 5
      },
      improvementTrend: [
        { date: '2024-01-01', score: 75 },
        { date: '2024-01-15', score: 80 },
        { date: '2024-01-31', score: 85 }
      ],
      strongAreas: ['逻辑思维', '代码实现'],
      weakAreas: ['算法优化', '设计模式']
    },
    engagement: {
      sessionCount: 25,
      averageSessionLength: 72, // 分钟
      streakDays: 12,
      interactionRate: 0.85,
      completionRate: 0.88
    },
    insights: [testLearningInsight],
    recommendations: {
      nextCourses: [
        { courseId: 'course-789', reason: '基于您的JavaScript基础', priority: 1 }
      ],
      skillGaps: [
        { skill: '算法', importance: 8, resources: ['算法导论', '数据结构课程'] }
      ],
      learningTips: [
        '保持每日学习习惯',
        '多做实践项目',
        '参与技术讨论'
      ]
    }
  },
  generatedAt: new Date()
};

const testComparisonData: ComparisonData = {
  userId: 'user-123456',
  comparisonType: 'peer',
  metrics: {
    learningTime: {
      user: 1800,
      comparison: 1200,
      percentile: 75
    },
    completionRate: {
      user: 88,
      comparison: 75,
      percentile: 80
    },
    averageScore: {
      user: 85,
      comparison: 78,
      percentile: 70
    },
    engagementScore: {
      user: 78,
      comparison: 65,
      percentile: 85
    }
  },
  insights: [
    '您的学习时间超过75%的同龄人',
    '完成率表现优秀',
    '建议提高测验成绩'
  ],
  recommendations: [
    '继续保持学习节奏',
    '重点关注薄弱知识点',
    '参与更多实践项目'
  ]
};

// 认证中间件模拟
const mockAuthUser = {
  id: 'user-123456',
  email: 'test@skillup.com',
  role: 'student'
};

describe('Analytics API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // 设置默认的mock返回值
    mockCacheService.get.mockResolvedValue(null);
    mockCacheService.set.mockResolvedValue(true);
    mockCacheService.mget.mockResolvedValue([]);
    
    mockAuditService.log.mockResolvedValue(true);
    
    mockAnalyticsService.getLearningStats.mockResolvedValue(testLearningStats);
    mockAnalyticsService.getLearningBehavior.mockResolvedValue([testLearningBehavior]);
    mockAnalyticsService.generateInsights.mockResolvedValue([testLearningInsight]);
    mockAnalyticsService.generateReport.mockResolvedValue(testLearningReport);
    mockAnalyticsService.getComparisonData.mockResolvedValue(testComparisonData);
    mockAnalyticsService.track.mockResolvedValue(true);
    
    mockAiService.analyzeLearningPattern.mockResolvedValue({
      pattern: 'evening_learner',
      confidence: 0.85,
      characteristics: ['高效晚间学习', '偏好视频内容']
    });
    
    mockAiService.generateInsights.mockResolvedValue([testLearningInsight]);
    
    // 设置JWT验证
    mockJwt.verify.mockReturnValue(mockAuthUser);
    
    // 设置Supabase默认返回值
    mockSupabaseClient.single.mockResolvedValue({
      data: testLearningStats,
      error: null
    });
    
    mockSupabaseClient.then.mockResolvedValue({
      data: [testLearningStats],
      error: null,
      count: 1
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  /**
   * 学习统计数据获取测试
   */
  describe('GET /api/analytics/stats', () => {
    it('应该获取学习统计数据', async () => {
      const response = await request(app)
        .get('/api/analytics/stats')
        .set('Authorization', 'Bearer jwt-token-123')
        .expect(200);
      
      expect(response.body).toEqual(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            totalLearningTime: 1800,
            coursesCompleted: 3,
            lessonsCompleted: 45,
            averageScore: 85,
            streakDays: 12,
            engagementScore: 78
          })
        })
      );
      
      expect(mockAnalyticsService.getLearningStats).toHaveBeenCalledWith(
        'user-123456',
        expect.objectContaining({
          period: 'month'
        })
      );
    });

    it('应该支持时间范围筛选', async () => {
      const response = await request(app)
        .get('/api/analytics/stats?period=week&startDate=2024-01-01&endDate=2024-01-07')
        .set('Authorization', 'Bearer jwt-token-123')
        .expect(200);
      
      expect(mockAnalyticsService.getLearningStats).toHaveBeenCalledWith(
        'user-123456',
        expect.objectContaining({
          period: 'week',
          startDate: '2024-01-01',
          endDate: '2024-01-07'
        })
      );
    });

    it('应该使用缓存', async () => {
      const cacheKey = 'learning_stats_user-123456_month';
      mockCacheService.get.mockResolvedValue(JSON.stringify(testLearningStats));
      
      const response = await request(app)
        .get('/api/analytics/stats')
        .set('Authorization', 'Bearer jwt-token-123')
        .expect(200);
      
      expect(mockCacheService.get).toHaveBeenCalledWith(cacheKey);
      expect(response.body.data.totalLearningTime).toBe(1800);
    });
  });

  /**
   * 学习行为分析测试
   */
  describe('GET /api/analytics/behavior', () => {
    it('应该获取学习行为数据', async () => {
      const response = await request(app)
        .get('/api/analytics/behavior')
        .set('Authorization', 'Bearer jwt-token-123')
        .expect(200);
      
      expect(response.body).toEqual(
        expect.objectContaining({
          success: true,
          data: expect.arrayContaining([
            expect.objectContaining({
              activityType: 'video',
              duration: 1800,
              interactions: 15,
              pauseCount: 3,
              notesTaken: 5
            })
          ])
        })
      );
    });

    it('应该支持活动类型筛选', async () => {
      const response = await request(app)
        .get('/api/analytics/behavior?activityType=video&limit=10')
        .set('Authorization', 'Bearer jwt-token-123')
        .expect(200);
      
      expect(mockAnalyticsService.getLearningBehavior).toHaveBeenCalledWith(
        'user-123456',
        expect.objectContaining({
          activityType: 'video',
          limit: 10
        })
      );
    });
  });

  /**
   * 学习洞察生成测试
   */
  describe('GET /api/analytics/insights', () => {
    it('应该获取个性化学习洞察', async () => {
      const response = await request(app)
        .get('/api/analytics/insights')
        .set('Authorization', 'Bearer jwt-token-123')
        .expect(200);
      
      expect(response.body).toEqual(
        expect.objectContaining({
          success: true,
          data: expect.arrayContaining([
            expect.objectContaining({
              type: 'opportunity',
              category: 'learning_pattern',
              title: '学习时间优化建议',
              confidence: 0.85,
              actionable: true,
              recommendations: expect.any(Array)
            })
          ])
        })
      );
    });

    it('应该支持洞察类型筛选', async () => {
      const response = await request(app)
        .get('/api/analytics/insights?type=opportunity&category=learning_pattern')
        .set('Authorization', 'Bearer jwt-token-123')
        .expect(200);
      
      expect(mockAnalyticsService.generateInsights).toHaveBeenCalledWith(
        'user-123456',
        expect.objectContaining({
          type: 'opportunity',
          category: 'learning_pattern'
        })
      );
    });

    it('应该定期刷新洞察', async () => {
      const oldInsight = { ...testLearningInsight, generatedAt: new Date(Date.now() - 25 * 60 * 60 * 1000) };
      mockCacheService.get.mockResolvedValue(JSON.stringify([oldInsight]));
      
      const response = await request(app)
        .get('/api/analytics/insights')
        .set('Authorization', 'Bearer jwt-token-123')
        .expect(200);
      
      expect(mockAnalyticsService.generateInsights).toHaveBeenCalled();
      expect(mockCacheService.set).toHaveBeenCalled();
    });
  });

  /**
   * 学习报告生成测试
   */
  describe('POST /api/analytics/reports', () => {
    it('应该生成学习报告', async () => {
      const reportRequest = {
        type: 'monthly',
        period: {
          start: '2024-01-01',
          end: '2024-01-31'
        },
        sections: ['summary', 'performance', 'insights']
      };
      
      const response = await request(app)
        .post('/api/analytics/reports')
        .set('Authorization', 'Bearer jwt-token-123')
        .send(reportRequest)
        .expect(201);
      
      expect(response.body).toEqual(
        expect.objectContaining({
          success: true,
          message: '学习报告生成成功',
          data: expect.objectContaining({
            id: expect.any(String),
            type: 'monthly',
            summary: expect.objectContaining({
              totalTime: 1800,
              coursesCompleted: 3,
              overallProgress: 75
            })
          })
        })
      );
      
      expect(mockAnalyticsService.generateReport).toHaveBeenCalledWith(
        'user-123456',
        expect.objectContaining(reportRequest)
      );
    });

    it('应该验证报告请求参数', async () => {
      const response = await request(app)
        .post('/api/analytics/reports')
        .set('Authorization', 'Bearer jwt-token-123')
        .send({
          type: 'invalid_type',
          period: {
            start: '2024-01-31',
            end: '2024-01-01' // 结束日期早于开始日期
          }
        })
        .expect(400);
      
      expect(response.body).toEqual(
        expect.objectContaining({
          success: false,
          message: '请求参数验证失败',
          errors: expect.arrayContaining([
            expect.objectContaining({
              field: 'type',
              message: '无效的报告类型'
            }),
            expect.objectContaining({
              field: 'period',
              message: '结束日期不能早于开始日期'
            })
          ])
        })
      );
    });

    it('应该检查报告生成限制', async () => {
      mockAnalyticsService.generateReport.mockRejectedValue(
        new Error('已达到月度报告生成限制')
      );
      
      const response = await request(app)
        .post('/api/analytics/reports')
        .set('Authorization', 'Bearer jwt-token-123')
        .send({
          type: 'monthly',
          period: {
            start: '2024-01-01',
            end: '2024-01-31'
          }
        })
        .expect(429);
      
      expect(response.body).toEqual(
        expect.objectContaining({
          success: false,
          message: '已达到月度报告生成限制'
        })
      );
    });
  });

  /**
   * 学习报告获取测试
   */
  describe('GET /api/analytics/reports', () => {
    it('应该获取用户报告列表', async () => {
      mockAnalyticsService.generateReport.mockResolvedValue([testLearningReport]);
      
      const response = await request(app)
        .get('/api/analytics/reports')
        .set('Authorization', 'Bearer jwt-token-123')
        .expect(200);
      
      expect(response.body).toEqual(
        expect.objectContaining({
          success: true,
          data: expect.arrayContaining([
            expect.objectContaining({
              id: 'report-123',
              type: 'monthly',
              summary: expect.any(Object)
            })
          ])
        })
      );
    });

    it('应该支持报告类型筛选', async () => {
      const response = await request(app)
        .get('/api/analytics/reports?type=monthly&limit=5')
        .set('Authorization', 'Bearer jwt-token-123')
        .expect(200);
      
      expect(mockAnalyticsService.generateReport).toHaveBeenCalledWith(
        'user-123456',
        expect.objectContaining({
          type: 'monthly',
          limit: 5
        })
      );
    });
  });

  /**
   * 比较分析测试
   */
  describe('GET /api/analytics/comparison', () => {
    it('应该获取同龄人比较数据', async () => {
      const response = await request(app)
        .get('/api/analytics/comparison?type=peer')
        .set('Authorization', 'Bearer jwt-token-123')
        .expect(200);
      
      expect(response.body).toEqual(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            comparisonType: 'peer',
            metrics: expect.objectContaining({
              learningTime: expect.objectContaining({
                user: 1800,
                comparison: 1200,
                percentile: 75
              })
            }),
            insights: expect.any(Array),
            recommendations: expect.any(Array)
          })
        })
      );
    });

    it('应该支持不同比较类型', async () => {
      const response = await request(app)
        .get('/api/analytics/comparison?type=global&metrics=learningTime,completionRate')
        .set('Authorization', 'Bearer jwt-token-123')
        .expect(200);
      
      expect(mockAnalyticsService.getComparisonData).toHaveBeenCalledWith(
        'user-123456',
        expect.objectContaining({
          type: 'global',
          metrics: ['learningTime', 'completionRate']
        })
      );
    });
  });

  /**
   * 学习模式分析测试
   */
  describe('GET /api/analytics/patterns', () => {
    it('应该分析用户学习模式', async () => {
      const response = await request(app)
        .get('/api/analytics/patterns')
        .set('Authorization', 'Bearer jwt-token-123')
        .expect(200);
      
      expect(response.body).toEqual(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            pattern: 'evening_learner',
            confidence: 0.85,
            characteristics: expect.arrayContaining([
              '高效晚间学习',
              '偏好视频内容'
            ]),
            recommendations: expect.any(Array)
          })
        })
      );
      
      expect(mockAiService.analyzeLearningPattern).toHaveBeenCalledWith('user-123456');
    });

    it('应该提供学习优化建议', async () => {
      mockAiService.recommendOptimizations.mockResolvedValue([
        {
          type: 'schedule',
          suggestion: '将重要课程安排在19-21点',
          impact: 'high',
          effort: 'low'
        }
      ]);
      
      const response = await request(app)
        .get('/api/analytics/patterns?includeOptimizations=true')
        .set('Authorization', 'Bearer jwt-token-123')
        .expect(200);
      
      expect(response.body.data.optimizations).toBeDefined();
      expect(mockAiService.recommendOptimizations).toHaveBeenCalled();
    });
  });

  /**
   * 实时分析数据测试
   */
  describe('GET /api/analytics/realtime', () => {
    it('应该获取实时学习数据', async () => {
      const realtimeData = {
        activeUsers: 1250,
        currentSessions: 89,
        popularCourses: [
          { courseId: 'course-123', activeUsers: 25 },
          { courseId: 'course-456', activeUsers: 18 }
        ],
        systemMetrics: {
          avgResponseTime: 120,
          errorRate: 0.02,
          throughput: 450
        }
      };
      
      mockAnalyticsService.getMetrics.mockResolvedValue(realtimeData);
      
      const response = await request(app)
        .get('/api/analytics/realtime')
        .set('Authorization', 'Bearer jwt-token-123')
        .expect(200);
      
      expect(response.body).toEqual(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            activeUsers: 1250,
            currentSessions: 89,
            popularCourses: expect.any(Array)
          })
        })
      );
    });

    it('应该要求管理员权限', async () => {
      mockJwt.verify.mockReturnValue({ ...mockAuthUser, role: 'student' });
      
      const response = await request(app)
        .get('/api/analytics/realtime')
        .set('Authorization', 'Bearer jwt-token-123')
        .expect(403);
      
      expect(response.body).toEqual(
        expect.objectContaining({
          success: false,
          message: '权限不足，需要管理员权限'
        })
      );
    });
  });

  /**
   * 数据导出测试
   */
  describe('POST /api/analytics/export', () => {
    it('应该导出学习数据', async () => {
      const exportRequest = {
        format: 'csv',
        dataTypes: ['stats', 'behavior', 'progress'],
        period: {
          start: '2024-01-01',
          end: '2024-01-31'
        }
      };
      
      const exportData = {
        downloadUrl: 'https://example.com/exports/user-123456-data.csv',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        fileSize: 1024000
      };
      
      mockAnalyticsService.generateReport.mockResolvedValue(exportData);
      
      const response = await request(app)
        .post('/api/analytics/export')
        .set('Authorization', 'Bearer jwt-token-123')
        .send(exportRequest)
        .expect(200);
      
      expect(response.body).toEqual(
        expect.objectContaining({
          success: true,
          message: '数据导出任务已创建',
          data: expect.objectContaining({
            downloadUrl: expect.any(String),
            expiresAt: expect.any(String),
            fileSize: 1024000
          })
        })
      );
    });

    it('应该验证导出格式', async () => {
      const response = await request(app)
        .post('/api/analytics/export')
        .set('Authorization', 'Bearer jwt-token-123')
        .send({
          format: 'invalid_format',
          dataTypes: []
        })
        .expect(400);
      
      expect(response.body).toEqual(
        expect.objectContaining({
          success: false,
          message: '请求参数验证失败',
          errors: expect.arrayContaining([
            expect.objectContaining({
              field: 'format',
              message: '不支持的导出格式'
            })
          ])
        })
      );
    });
  });

  /**
   * 错误处理测试
   */
  describe('Error Handling', () => {
    it('应该处理分析服务不可用', async () => {
      mockAnalyticsService.getLearningStats.mockRejectedValue(
        new Error('Analytics service temporarily unavailable')
      );
      
      const response = await request(app)
        .get('/api/analytics/stats')
        .set('Authorization', 'Bearer jwt-token-123')
        .expect(500);
      
      expect(response.body).toEqual(
        expect.objectContaining({
          success: false,
          message: '分析服务暂时不可用'
        })
      );
    });

    it('应该处理数据不足的情况', async () => {
      mockAnalyticsService.getLearningStats.mockResolvedValue(null);
      
      const response = await request(app)
        .get('/api/analytics/stats')
        .set('Authorization', 'Bearer jwt-token-123')
        .expect(404);
      
      expect(response.body).toEqual(
        expect.objectContaining({
          success: false,
          message: '暂无足够的学习数据进行分析'
        })
      );
    });

    it('应该处理AI服务错误', async () => {
      mockAiService.analyzeLearningPattern.mockRejectedValue(
        new Error('AI service quota exceeded')
      );
      
      const response = await request(app)
        .get('/api/analytics/patterns')
        .set('Authorization', 'Bearer jwt-token-123')
        .expect(503);
      
      expect(response.body).toEqual(
        expect.objectContaining({
          success: false,
          message: 'AI分析服务暂时不可用'
        })
      );
    });
  });

  /**
   * 性能测试
   */
  describe('Performance Tests', () => {
    it('应该在合理时间内返回统计数据', async () => {
      const startTime = Date.now();
      
      await request(app)
        .get('/api/analytics/stats')
        .set('Authorization', 'Bearer jwt-token-123')
        .expect(200);
      
      const executionTime = Date.now() - startTime;
      expect(executionTime).toBeLessThan(1000); // 1秒内完成
    });

    it('应该有效利用缓存', async () => {
      const cacheKey = 'learning_stats_user-123456_month';
      mockCacheService.get.mockResolvedValue(JSON.stringify(testLearningStats));
      
      await request(app)
        .get('/api/analytics/stats')
        .set('Authorization', 'Bearer jwt-token-123')
        .expect(200);
      
      expect(mockCacheService.get).toHaveBeenCalledWith(cacheKey);
      expect(mockAnalyticsService.getLearningStats).not.toHaveBeenCalled();
    });

    it('应该支持数据聚合优化', async () => {
      const aggregatedData = {
        daily: [{ date: '2024-01-01', value: 60 }],
        weekly: [{ week: '2024-W01', value: 420 }],
        monthly: [{ month: '2024-01', value: 1800 }]
      };
      
      mockAnalyticsService.aggregateData.mockResolvedValue(aggregatedData);
      
      const response = await request(app)
        .get('/api/analytics/stats?aggregate=true')
        .set('Authorization', 'Bearer jwt-token-123')
        .expect(200);
      
      expect(response.body.data.aggregated).toBeDefined();
      expect(mockAnalyticsService.aggregateData).toHaveBeenCalled();
    });
  });

  /**
   * 隐私和安全测试
   */
  describe('Privacy and Security', () => {
    it('应该匿名化敏感数据', async () => {
      const response = await request(app)
        .get('/api/analytics/stats?anonymize=true')
        .set('Authorization', 'Bearer jwt-token-123')
        .expect(200);
      
      expect(mockAnalyticsService.getLearningStats).toHaveBeenCalledWith(
        'user-123456',
        expect.objectContaining({
          anonymize: true
        })
      );
    });

    it('应该记录数据访问审计', async () => {
      await request(app)
        .get('/api/analytics/stats')
        .set('Authorization', 'Bearer jwt-token-123')
        .expect(200);
      
      expect(mockAuditService.log).toHaveBeenCalledWith(
        'analytics.data.access',
        expect.objectContaining({
          userId: 'user-123456',
          dataType: 'learning_stats'
        })
      );
    });

    it('应该支持数据删除请求', async () => {
      const response = await request(app)
        .delete('/api/analytics/data')
        .set('Authorization', 'Bearer jwt-token-123')
        .expect(200);
      
      expect(response.body).toEqual(
        expect.objectContaining({
          success: true,
          message: '数据删除请求已提交'
        })
      );
    });
  });
});