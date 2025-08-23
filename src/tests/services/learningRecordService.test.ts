/**
 * 学习记录服务单元测试
 * 
 * 测试覆盖范围：
 * - 学习进度跟踪
 * - 学习时长统计
 * - 学习成就和徽章
 * - 学习路径管理
 * - 学习数据分析
 * - 学习提醒和通知
 * - 学习报告生成
 * - 学习数据同步
 * - 学习历史记录
 * - 错误处理和数据一致性
 */

import { jest } from '@jest/globals';
import {
  learningRecordService,
  recordLearningProgress,
  getLearningProgress,
  updateLearningTime,
  getLearningStats,
  generateLearningReport,
  syncLearningData,
  getLearningHistory,
  checkAchievements,
  setLearningReminder
} from '../../services/learningRecordService';

// 模拟依赖
const mockEnvConfig = {
  database: {
    maxConnections: 10,
    connectionTimeout: 5000
  },
  cache: {
    ttl: 3600,
    maxSize: 1000
  },
  learning: {
    minSessionTime: 60, // 最小学习时长（秒）
    maxSessionTime: 7200, // 最大学习时长（秒）
    achievementThresholds: {
      beginner: 10,
      intermediate: 50,
      advanced: 100
    }
  }
};

const mockErrorHandler = {
  handleError: jest.fn(),
  createError: jest.fn((type, message, details) => ({
    type,
    message,
    details,
    timestamp: new Date().toISOString()
  }))
};

const mockMonitoringService = {
  recordMetric: jest.fn(),
  recordEvent: jest.fn(),
  startTimer: jest.fn(() => ({
    end: jest.fn()
  }))
};

const mockNotificationService = {
  sendNotification: jest.fn(),
  sendEmail: jest.fn(),
  sendPushNotification: jest.fn(),
  scheduleNotification: jest.fn()
};

const mockUserService = {
  getUserById: jest.fn(),
  updateUser: jest.fn(),
  getUserPreferences: jest.fn()
};

const mockCourseService = {
  getCourseById: jest.fn(),
  getLessonById: jest.fn(),
  getCourseProgress: jest.fn()
};

const mockSupabase = {
  from: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
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
    contains: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    single: jest.fn(),
    maybeSingle: jest.fn()
  })),
  rpc: jest.fn()
};

const mockRedis = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  exists: jest.fn(),
  expire: jest.fn(),
  hget: jest.fn(),
  hset: jest.fn(),
  hdel: jest.fn(),
  zadd: jest.fn(),
  zrange: jest.fn(),
  zrem: jest.fn(),
  incr: jest.fn(),
  incrby: jest.fn()
};

const mockUuid = {
  v4: jest.fn(() => 'test-uuid-123')
};

const mockMoment = jest.fn(() => ({
  format: jest.fn(() => '2024-01-01T00:00:00Z'),
  add: jest.fn().mockReturnThis(),
  subtract: jest.fn().mockReturnThis(),
  isAfter: jest.fn(() => false),
  isBefore: jest.fn(() => true),
  diff: jest.fn(() => 3600),
  toISOString: jest.fn(() => '2024-01-01T00:00:00Z'),
  unix: jest.fn(() => 1704067200)
}));

const mockLodash = {
  debounce: jest.fn((fn) => fn),
  throttle: jest.fn((fn) => fn),
  groupBy: jest.fn((arr, key) => {
    const result = {};
    arr.forEach(item => {
      const groupKey = typeof key === 'function' ? key(item) : item[key];
      if (!result[groupKey]) result[groupKey] = [];
      result[groupKey].push(item);
    });
    return result;
  }),
  sumBy: jest.fn((arr, key) => {
    return arr.reduce((sum, item) => {
      const value = typeof key === 'function' ? key(item) : item[key];
      return sum + (value || 0);
    }, 0);
  }),
  orderBy: jest.fn((arr, keys, orders) => [...arr].sort()),
  pick: jest.fn((obj, keys) => {
    const result = {};
    keys.forEach(key => {
      if (obj[key] !== undefined) result[key] = obj[key];
    });
    return result;
  })
};

// 模拟模块
jest.mock('../../config/envConfig', () => mockEnvConfig);
jest.mock('../../utils/errorHandler', () => mockErrorHandler);
jest.mock('../../services/monitoringService', () => mockMonitoringService);
jest.mock('../../services/notificationService', () => mockNotificationService);
jest.mock('../../services/userService', () => mockUserService);
jest.mock('../../services/courseService', () => mockCourseService);
jest.mock('../../config/supabase', () => ({ supabase: mockSupabase }));
jest.mock('../../config/redis', () => ({ redis: mockRedis }));
jest.mock('uuid', () => mockUuid);
jest.mock('moment', () => mockMoment);
jest.mock('lodash', () => mockLodash);

describe('学习记录服务测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // 设置默认的成功响应
    mockSupabase.from().single.mockResolvedValue({
      data: {
        id: 'record-123',
        userId: 'user-123',
        courseId: 'course-123',
        lessonId: 'lesson-123',
        progress: 50,
        timeSpent: 1800,
        completed: false,
        createdAt: '2024-01-01T00:00:00Z'
      },
      error: null
    });
    
    mockSupabase.from().mockResolvedValue({
      data: [{
        id: 'record-123',
        userId: 'user-123',
        courseId: 'course-123',
        progress: 50
      }],
      error: null
    });
    
    mockRedis.get.mockResolvedValue(null);
    mockRedis.set.mockResolvedValue('OK');
    mockRedis.incr.mockResolvedValue(1);
  });

  describe('服务初始化', () => {
    it('应该成功初始化学习记录服务', async () => {
      const result = await learningRecordService.initialize();
      
      expect(result.success).toBe(true);
      expect(mockMonitoringService.recordEvent).toHaveBeenCalledWith(
        'learning_record_service_initialized',
        expect.any(Object)
      );
    });

    it('应该加载成就配置', async () => {
      await learningRecordService.initialize();
      
      expect(mockSupabase.from).toHaveBeenCalledWith('achievements');
    });

    it('应该初始化学习统计缓存', async () => {
      await learningRecordService.initialize();
      
      expect(mockRedis.exists).toHaveBeenCalled();
    });
  });

  describe('学习进度记录', () => {
    const progressData = {
      userId: 'user-123',
      courseId: 'course-123',
      lessonId: 'lesson-123',
      progress: 75,
      timeSpent: 1800,
      completed: false
    };

    it('应该成功记录学习进度', async () => {
      const result = await recordLearningProgress(progressData);
      
      expect(result.success).toBe(true);
      expect(result.record).toBeDefined();
      expect(mockSupabase.from).toHaveBeenCalledWith('learning_records');
    });

    it('应该验证进度数据', async () => {
      const invalidData = { ...progressData, progress: 150 };
      
      const result = await recordLearningProgress(invalidData);
      
      expect(result.success).toBe(false);
      expect(result.error).toEqual(
        expect.objectContaining({
          type: 'VALIDATION_ERROR',
          message: 'Progress must be between 0 and 100'
        })
      );
    });

    it('应该验证学习时长', async () => {
      const invalidData = { ...progressData, timeSpent: -100 };
      
      const result = await recordLearningProgress(invalidData);
      
      expect(result.success).toBe(false);
      expect(result.error).toEqual(
        expect.objectContaining({
          type: 'VALIDATION_ERROR',
          message: 'Time spent must be a positive number'
        })
      );
    });

    it('应该更新现有记录', async () => {
      mockSupabase.from().single.mockResolvedValue({
        data: {
          id: 'existing-record',
          progress: 25,
          timeSpent: 900
        },
        error: null
      });
      
      await recordLearningProgress(progressData);
      
      expect(mockSupabase.from().update).toHaveBeenCalledWith(
        expect.objectContaining({
          progress: 75,
          timeSpent: 2700 // 累加时间
        })
      );
    });

    it('应该检查课程完成状态', async () => {
      const completedData = { ...progressData, progress: 100, completed: true };
      
      await recordLearningProgress(completedData);
      
      expect(mockSupabase.from().update).toHaveBeenCalledWith(
        expect.objectContaining({
          completed: true,
          completedAt: expect.any(String)
        })
      );
    });

    it('应该更新缓存统计', async () => {
      await recordLearningProgress(progressData);
      
      expect(mockRedis.incrby).toHaveBeenCalledWith(
        'user:user-123:total_time',
        1800
      );
    });

    it('应该记录学习事件', async () => {
      await recordLearningProgress(progressData);
      
      expect(mockMonitoringService.recordEvent).toHaveBeenCalledWith(
        'learning_progress_recorded',
        expect.objectContaining({
          userId: 'user-123',
          courseId: 'course-123',
          progress: 75
        })
      );
    });
  });

  describe('学习进度查询', () => {
    beforeEach(() => {
      mockSupabase.from().mockResolvedValue({
        data: [
          {
            id: 'record-1',
            lessonId: 'lesson-1',
            progress: 100,
            completed: true,
            timeSpent: 1800
          },
          {
            id: 'record-2',
            lessonId: 'lesson-2',
            progress: 50,
            completed: false,
            timeSpent: 900
          }
        ],
        error: null
      });
    });

    it('应该获取用户学习进度', async () => {
      const result = await getLearningProgress('user-123', 'course-123');
      
      expect(result.success).toBe(true);
      expect(result.progress).toBeDefined();
      expect(result.progress.overallProgress).toBe(75); // (100 + 50) / 2
    });

    it('应该计算完成率', async () => {
      const result = await getLearningProgress('user-123', 'course-123');
      
      expect(result.progress.completionRate).toBe(50); // 1 completed out of 2
      expect(result.progress.completedLessons).toBe(1);
      expect(result.progress.totalLessons).toBe(2);
    });

    it('应该计算总学习时长', async () => {
      const result = await getLearningProgress('user-123', 'course-123');
      
      expect(result.progress.totalTimeSpent).toBe(2700); // 1800 + 900
    });

    it('应该使用缓存数据', async () => {
      mockRedis.get.mockResolvedValue(JSON.stringify({
        overallProgress: 80,
        completionRate: 60
      }));
      
      const result = await getLearningProgress('user-123', 'course-123');
      
      expect(result.success).toBe(true);
      expect(result.progress.overallProgress).toBe(80);
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it('应该缓存进度数据', async () => {
      await getLearningProgress('user-123', 'course-123');
      
      expect(mockRedis.set).toHaveBeenCalledWith(
        'progress:user-123:course-123',
        expect.any(String),
        'EX',
        1800
      );
    });
  });

  describe('学习时长更新', () => {
    const timeData = {
      userId: 'user-123',
      courseId: 'course-123',
      lessonId: 'lesson-123',
      sessionTime: 1800,
      startTime: '2024-01-01T10:00:00Z',
      endTime: '2024-01-01T10:30:00Z'
    };

    it('应该成功更新学习时长', async () => {
      const result = await updateLearningTime(timeData);
      
      expect(result.success).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith('learning_sessions');
    });

    it('应该验证时长范围', async () => {
      const invalidData = { ...timeData, sessionTime: 10 }; // 小于最小时长
      
      const result = await updateLearningTime(invalidData);
      
      expect(result.success).toBe(false);
      expect(result.error).toEqual(
        expect.objectContaining({
          type: 'VALIDATION_ERROR',
          message: 'Session time is too short'
        })
      );
    });

    it('应该检测异常长时间学习', async () => {
      const invalidData = { ...timeData, sessionTime: 10000 }; // 超过最大时长
      
      const result = await updateLearningTime(invalidData);
      
      expect(result.success).toBe(false);
      expect(result.error).toEqual(
        expect.objectContaining({
          type: 'VALIDATION_ERROR',
          message: 'Session time is too long'
        })
      );
    });

    it('应该更新用户总学习时长', async () => {
      await updateLearningTime(timeData);
      
      expect(mockRedis.incrby).toHaveBeenCalledWith(
        'user:user-123:total_time',
        1800
      );
    });

    it('应该更新课程学习时长', async () => {
      await updateLearningTime(timeData);
      
      expect(mockRedis.incrby).toHaveBeenCalledWith(
        'course:course-123:total_time',
        1800
      );
    });

    it('应该记录学习会话', async () => {
      await updateLearningTime(timeData);
      
      expect(mockSupabase.from().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          courseId: 'course-123',
          sessionTime: 1800
        })
      );
    });
  });

  describe('学习统计', () => {
    beforeEach(() => {
      mockSupabase.rpc.mockResolvedValue({
        data: {
          totalCourses: 5,
          completedCourses: 3,
          totalTimeSpent: 18000,
          averageSessionTime: 1800,
          longestStreak: 7,
          currentStreak: 3
        },
        error: null
      });
    });

    it('应该获取用户学习统计', async () => {
      const result = await getLearningStats('user-123');
      
      expect(result.success).toBe(true);
      expect(result.stats).toBeDefined();
      expect(result.stats.totalCourses).toBe(5);
      expect(result.stats.completedCourses).toBe(3);
    });

    it('应该计算学习效率指标', async () => {
      const result = await getLearningStats('user-123');
      
      expect(result.stats.completionRate).toBe(60); // 3/5 * 100
      expect(result.stats.averageSessionTime).toBe(1800);
    });

    it('应该获取学习连续天数', async () => {
      const result = await getLearningStats('user-123');
      
      expect(result.stats.longestStreak).toBe(7);
      expect(result.stats.currentStreak).toBe(3);
    });

    it('应该缓存统计数据', async () => {
      await getLearningStats('user-123');
      
      expect(mockRedis.set).toHaveBeenCalledWith(
        'stats:user-123',
        expect.any(String),
        'EX',
        3600
      );
    });

    it('应该按时间范围筛选统计', async () => {
      const options = {
        startDate: '2024-01-01',
        endDate: '2024-01-31'
      };
      
      await getLearningStats('user-123', options);
      
      expect(mockSupabase.rpc).toHaveBeenCalledWith(
        'get_learning_stats',
        expect.objectContaining({
          user_id: 'user-123',
          start_date: '2024-01-01',
          end_date: '2024-01-31'
        })
      );
    });
  });

  describe('学习报告生成', () => {
    beforeEach(() => {
      mockSupabase.from().mockResolvedValue({
        data: [
          {
            date: '2024-01-01',
            timeSpent: 3600,
            lessonsCompleted: 2,
            coursesAccessed: 1
          },
          {
            date: '2024-01-02',
            timeSpent: 1800,
            lessonsCompleted: 1,
            coursesAccessed: 1
          }
        ],
        error: null
      });
    });

    it('应该生成学习报告', async () => {
      const options = {
        userId: 'user-123',
        period: 'weekly',
        format: 'json'
      };
      
      const result = await generateLearningReport(options);
      
      expect(result.success).toBe(true);
      expect(result.report).toBeDefined();
      expect(result.report.summary).toBeDefined();
    });

    it('应该计算报告摘要', async () => {
      const options = {
        userId: 'user-123',
        period: 'weekly'
      };
      
      const result = await generateLearningReport(options);
      
      expect(result.report.summary.totalTimeSpent).toBe(5400); // 3600 + 1800
      expect(result.report.summary.totalLessonsCompleted).toBe(3); // 2 + 1
      expect(result.report.summary.averageDailyTime).toBe(2700); // 5400 / 2
    });

    it('应该生成学习趋势', async () => {
      const options = {
        userId: 'user-123',
        period: 'monthly'
      };
      
      const result = await generateLearningReport(options);
      
      expect(result.report.trends).toBeDefined();
      expect(result.report.trends.timeSpentTrend).toBeDefined();
      expect(result.report.trends.completionTrend).toBeDefined();
    });

    it('应该支持不同报告格式', async () => {
      const options = {
        userId: 'user-123',
        period: 'weekly',
        format: 'pdf'
      };
      
      const result = await generateLearningReport(options);
      
      expect(result.success).toBe(true);
      expect(result.report.format).toBe('pdf');
      expect(result.report.downloadUrl).toBeDefined();
    });

    it('应该缓存报告数据', async () => {
      const options = {
        userId: 'user-123',
        period: 'weekly'
      };
      
      await generateLearningReport(options);
      
      expect(mockRedis.set).toHaveBeenCalledWith(
        expect.stringMatching(/^report:/),
        expect.any(String),
        'EX',
        7200
      );
    });
  });

  describe('学习数据同步', () => {
    const syncData = {
      userId: 'user-123',
      deviceId: 'device-123',
      records: [
        {
          courseId: 'course-1',
          lessonId: 'lesson-1',
          progress: 75,
          timeSpent: 1800,
          timestamp: '2024-01-01T10:00:00Z'
        },
        {
          courseId: 'course-2',
          lessonId: 'lesson-2',
          progress: 50,
          timeSpent: 900,
          timestamp: '2024-01-01T11:00:00Z'
        }
      ]
    };

    it('应该成功同步学习数据', async () => {
      const result = await syncLearningData(syncData);
      
      expect(result.success).toBe(true);
      expect(result.syncedRecords).toBe(2);
    });

    it('应该验证同步数据格式', async () => {
      const invalidData = {
        ...syncData,
        records: [{ invalidRecord: true }]
      };
      
      const result = await syncLearningData(invalidData);
      
      expect(result.success).toBe(false);
      expect(result.error).toEqual(
        expect.objectContaining({
          type: 'VALIDATION_ERROR',
          message: 'Invalid sync data format'
        })
      );
    });

    it('应该处理数据冲突', async () => {
      // 模拟服务器上有更新的数据
      mockSupabase.from().single.mockResolvedValue({
        data: {
          id: 'record-1',
          progress: 80, // 服务器上的进度更高
          updatedAt: '2024-01-01T12:00:00Z'
        },
        error: null
      });
      
      const result = await syncLearningData(syncData);
      
      expect(result.success).toBe(true);
      expect(result.conflicts).toBeDefined();
      expect(result.conflicts.length).toBeGreaterThan(0);
    });

    it('应该批量更新记录', async () => {
      await syncLearningData(syncData);
      
      expect(mockSupabase.from().upsert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            courseId: 'course-1',
            progress: 75
          }),
          expect.objectContaining({
            courseId: 'course-2',
            progress: 50
          })
        ])
      );
    });

    it('应该记录同步事件', async () => {
      await syncLearningData(syncData);
      
      expect(mockMonitoringService.recordEvent).toHaveBeenCalledWith(
        'learning_data_synced',
        expect.objectContaining({
          userId: 'user-123',
          deviceId: 'device-123',
          recordCount: 2
        })
      );
    });
  });

  describe('学习历史记录', () => {
    beforeEach(() => {
      mockSupabase.from().mockResolvedValue({
        data: [
          {
            id: 'history-1',
            courseId: 'course-1',
            lessonId: 'lesson-1',
            action: 'lesson_completed',
            timestamp: '2024-01-01T10:00:00Z',
            metadata: { timeSpent: 1800 }
          },
          {
            id: 'history-2',
            courseId: 'course-1',
            lessonId: 'lesson-2',
            action: 'lesson_started',
            timestamp: '2024-01-01T11:00:00Z',
            metadata: {}
          }
        ],
        error: null
      });
    });

    it('应该获取用户学习历史', async () => {
      const result = await getLearningHistory('user-123');
      
      expect(result.success).toBe(true);
      expect(result.history).toHaveLength(2);
      expect(result.history[0].action).toBe('lesson_completed');
    });

    it('应该按时间范围筛选历史', async () => {
      const options = {
        startDate: '2024-01-01',
        endDate: '2024-01-31'
      };
      
      await getLearningHistory('user-123', options);
      
      expect(mockSupabase.from().gte).toHaveBeenCalledWith(
        'timestamp',
        '2024-01-01'
      );
      expect(mockSupabase.from().lte).toHaveBeenCalledWith(
        'timestamp',
        '2024-01-31'
      );
    });

    it('应该按课程筛选历史', async () => {
      const options = {
        courseId: 'course-123'
      };
      
      await getLearningHistory('user-123', options);
      
      expect(mockSupabase.from().eq).toHaveBeenCalledWith(
        'courseId',
        'course-123'
      );
    });

    it('应该支持分页查询', async () => {
      const options = {
        page: 2,
        limit: 20
      };
      
      await getLearningHistory('user-123', options);
      
      expect(mockSupabase.from().limit).toHaveBeenCalledWith(20);
      expect(mockSupabase.from().offset).toHaveBeenCalledWith(20);
    });

    it('应该缓存历史数据', async () => {
      await getLearningHistory('user-123');
      
      expect(mockRedis.set).toHaveBeenCalledWith(
        'history:user-123',
        expect.any(String),
        'EX',
        1800
      );
    });
  });

  describe('成就检查', () => {
    beforeEach(() => {
      mockSupabase.from().mockResolvedValue({
        data: [
          {
            id: 'achievement-1',
            name: 'First Course',
            description: 'Complete your first course',
            type: 'course_completion',
            threshold: 1,
            icon: 'trophy'
          },
          {
            id: 'achievement-2',
            name: 'Time Master',
            description: 'Study for 100 hours',
            type: 'study_time',
            threshold: 360000, // 100 hours in seconds
            icon: 'clock'
          }
        ],
        error: null
      });
    });

    it('应该检查用户成就', async () => {
      const result = await checkAchievements('user-123');
      
      expect(result.success).toBe(true);
      expect(result.newAchievements).toBeDefined();
    });

    it('应该检测新获得的成就', async () => {
      // 模拟用户完成了第一门课程
      mockSupabase.rpc.mockResolvedValue({
        data: { completedCourses: 1, totalStudyTime: 18000 },
        error: null
      });
      
      const result = await checkAchievements('user-123');
      
      expect(result.newAchievements).toContainEqual(
        expect.objectContaining({
          id: 'achievement-1',
          name: 'First Course'
        })
      );
    });

    it('应该发送成就通知', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: { completedCourses: 1, totalStudyTime: 18000 },
        error: null
      });
      
      await checkAchievements('user-123');
      
      expect(mockNotificationService.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          type: 'achievement_unlocked',
          data: expect.objectContaining({
            achievementId: 'achievement-1'
          })
        })
      );
    });

    it('应该记录成就获得事件', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: { completedCourses: 1, totalStudyTime: 18000 },
        error: null
      });
      
      await checkAchievements('user-123');
      
      expect(mockMonitoringService.recordEvent).toHaveBeenCalledWith(
        'achievement_unlocked',
        expect.objectContaining({
          userId: 'user-123',
          achievementId: 'achievement-1'
        })
      );
    });

    it('应该避免重复授予成就', async () => {
      // 模拟用户已经获得了成就
      mockSupabase.from().select.mockResolvedValue({
        data: [{
          id: 'user-achievement-1',
          achievementId: 'achievement-1',
          userId: 'user-123'
        }],
        error: null
      });
      
      const result = await checkAchievements('user-123');
      
      expect(result.newAchievements).toHaveLength(0);
    });
  });

  describe('学习提醒', () => {
    const reminderData = {
      userId: 'user-123',
      type: 'daily_study',
      time: '09:00',
      timezone: 'Asia/Shanghai',
      enabled: true,
      message: '该学习了！'
    };

    it('应该设置学习提醒', async () => {
      const result = await setLearningReminder(reminderData);
      
      expect(result.success).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith('learning_reminders');
    });

    it('应该验证提醒时间格式', async () => {
      const invalidData = { ...reminderData, time: '25:00' };
      
      const result = await setLearningReminder(invalidData);
      
      expect(result.success).toBe(false);
      expect(result.error).toEqual(
        expect.objectContaining({
          type: 'VALIDATION_ERROR',
          message: 'Invalid time format'
        })
      );
    });

    it('应该调度通知', async () => {
      await setLearningReminder(reminderData);
      
      expect(mockNotificationService.scheduleNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          type: 'daily_study',
          scheduledTime: expect.any(String)
        })
      );
    });

    it('应该更新现有提醒', async () => {
      mockSupabase.from().single.mockResolvedValue({
        data: {
          id: 'reminder-123',
          userId: 'user-123',
          type: 'daily_study'
        },
        error: null
      });
      
      await setLearningReminder(reminderData);
      
      expect(mockSupabase.from().update).toHaveBeenCalledWith(
        expect.objectContaining({
          time: '09:00',
          enabled: true
        })
      );
    });
  });

  describe('性能测试', () => {
    it('应该高效处理大量学习记录', async () => {
      const timer = mockMonitoringService.startTimer();
      
      const promises = Array.from({ length: 100 }, (_, i) => 
        recordLearningProgress({
          userId: `user-${i}`,
          courseId: 'course-123',
          lessonId: 'lesson-123',
          progress: 50,
          timeSpent: 1800
        })
      );
      
      await Promise.all(promises);
      
      expect(timer.end).toHaveBeenCalled();
    });

    it('应该优化统计查询性能', async () => {
      await getLearningStats('user-123');
      
      expect(mockSupabase.rpc).toHaveBeenCalledWith(
        'get_learning_stats',
        expect.any(Object)
      );
      expect(mockRedis.set).toHaveBeenCalled();
    });

    it('应该有效管理缓存', async () => {
      // 测试缓存命中
      mockRedis.get.mockResolvedValue(JSON.stringify({ overallProgress: 75 }));
      
      await getLearningProgress('user-123', 'course-123');
      
      expect(mockSupabase.from).not.toHaveBeenCalled();
      expect(mockRedis.get).toHaveBeenCalledWith('progress:user-123:course-123');
    });

    it('应该优化批量数据同步', async () => {
      const largeSyncData = {
        userId: 'user-123',
        deviceId: 'device-123',
        records: Array.from({ length: 50 }, (_, i) => ({
          courseId: `course-${i}`,
          lessonId: `lesson-${i}`,
          progress: 50,
          timeSpent: 1800
        }))
      };
      
      await syncLearningData(largeSyncData);
      
      expect(mockSupabase.from().upsert).toHaveBeenCalledWith(
        expect.arrayContaining(largeSyncData.records)
      );
    });
  });

  describe('错误处理', () => {
    it('应该处理数据库连接错误', async () => {
      mockSupabase.from().single.mockRejectedValue(new Error('Database connection failed'));
      
      const result = await getLearningProgress('user-123', 'course-123');
      
      expect(result.success).toBe(false);
      expect(result.error).toEqual(
        expect.objectContaining({
          type: 'DATABASE_ERROR'
        })
      );
      expect(mockErrorHandler.handleError).toHaveBeenCalled();
    });

    it('应该处理Redis连接错误', async () => {
      mockRedis.get.mockRejectedValue(new Error('Redis connection failed'));
      
      const result = await getLearningProgress('user-123', 'course-123');
      
      expect(result.success).toBe(true); // 应该降级到数据库查询
      expect(mockSupabase.from).toHaveBeenCalled();
    });

    it('应该处理数据同步冲突', async () => {
      mockSupabase.from().upsert.mockRejectedValue({
        code: '23505', // 唯一约束冲突
        message: 'Duplicate key value'
      });
      
      const result = await syncLearningData({
        userId: 'user-123',
        deviceId: 'device-123',
        records: [{
          courseId: 'course-123',
          lessonId: 'lesson-123',
          progress: 50
        }]
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toEqual(
        expect.objectContaining({
          type: 'SYNC_CONFLICT'
        })
      );
    });

    it('应该处理通知发送失败', async () => {
      mockNotificationService.sendNotification.mockRejectedValue(
        new Error('Notification service unavailable')
      );
      
      // 成就检查应该继续，即使通知失败
      const result = await checkAchievements('user-123');
      
      expect(result.success).toBe(true);
      expect(mockErrorHandler.handleError).toHaveBeenCalled();
    });

    it('应该实现重试机制', async () => {
      mockSupabase.from().insert
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValue({
          data: [{ id: 'record-123' }],
          error: null
        });
      
      const result = await recordLearningProgress({
        userId: 'user-123',
        courseId: 'course-123',
        lessonId: 'lesson-123',
        progress: 50,
        timeSpent: 1800
      });
      
      expect(result.success).toBe(true);
      expect(mockSupabase.from().insert).toHaveBeenCalledTimes(2);
    });
  });
});

/**
 * 学习记录服务便捷函数导出测试
 */
describe('学习记录服务便捷函数', () => {
  it('应该导出所有必要的函数', () => {
    expect(typeof recordLearningProgress).toBe('function');
    expect(typeof getLearningProgress).toBe('function');
    expect(typeof updateLearningTime).toBe('function');
    expect(typeof getLearningStats).toBe('function');
    expect(typeof generateLearningReport).toBe('function');
    expect(typeof syncLearningData).toBe('function');
    expect(typeof getLearningHistory).toBe('function');
    expect(typeof checkAchievements).toBe('function');
    expect(typeof setLearningReminder).toBe('function');
  });

  it('应该导出学习记录服务实例', () => {
    expect(learningRecordService).toBeDefined();
    expect(typeof learningRecordService.initialize).toBe('function');
    expect(typeof learningRecordService.recordProgress).toBe('function');
    expect(typeof learningRecordService.getProgress).toBe('function');
    expect(typeof learningRecordService.updateTime).toBe('function');
    expect(typeof learningRecordService.getStats).toBe('function');
  });
});