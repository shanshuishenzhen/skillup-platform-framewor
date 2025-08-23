/**
 * 课程服务单元测试
 * 
 * 测试覆盖范围：
 * - 课程创建和管理
 * - 课程内容管理
 * - 课程分类和标签
 * - 课程评价和评分
 * - 课程搜索和筛选
 * - 课程统计和分析
 * - 课程权限控制
 * - 课程缓存管理
 * - 错误处理和数据一致性
 */

import { jest } from '@jest/globals';
import {
  courseService,
  createCourse,
  getCourseById,
  updateCourse,
  deleteCourse,
  searchCourses,
  getCoursesByCategory,
  rateCourse,
  enrollCourse,
  getCourseProgress
} from '../../services/courseService';

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
  course: {
    maxFileSize: 100 * 1024 * 1024, // 100MB
    allowedVideoFormats: ['mp4', 'webm', 'ogg'],
    allowedDocumentFormats: ['pdf', 'doc', 'docx', 'ppt', 'pptx']
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
  sendPushNotification: jest.fn()
};

const mockUserService = {
  getUserById: jest.fn(),
  updateUser: jest.fn(),
  getUserPermissions: jest.fn()
};

const mockFileUploadService = {
  uploadFile: jest.fn(),
  deleteFile: jest.fn(),
  getFileUrl: jest.fn(),
  validateFile: jest.fn()
};

const mockSupabase = {
  from: jest.fn(() => ({
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
  zrem: jest.fn()
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
  toISOString: jest.fn(() => '2024-01-01T00:00:00Z')
}));

const mockLodash = {
  debounce: jest.fn((fn) => fn),
  throttle: jest.fn((fn) => fn),
  pick: jest.fn((obj, keys) => {
    const result = {};
    keys.forEach(key => {
      if (obj[key] !== undefined) result[key] = obj[key];
    });
    return result;
  }),
  omit: jest.fn((obj, keys) => {
    const result = { ...obj };
    keys.forEach(key => delete result[key]);
    return result;
  }),
  merge: jest.fn((target, ...sources) => Object.assign(target, ...sources)),
  cloneDeep: jest.fn((obj) => JSON.parse(JSON.stringify(obj)))
};

// 模拟模块
jest.mock('../../config/envConfig', () => mockEnvConfig);
jest.mock('../../utils/errorHandler', () => mockErrorHandler);
jest.mock('../../services/monitoringService', () => mockMonitoringService);
jest.mock('../../services/notificationService', () => mockNotificationService);
jest.mock('../../services/userService', () => mockUserService);
jest.mock('../../services/fileUploadService', () => mockFileUploadService);
jest.mock('../../config/supabase', () => ({ supabase: mockSupabase }));
jest.mock('../../config/redis', () => ({ redis: mockRedis }));
jest.mock('uuid', () => mockUuid);
jest.mock('moment', () => mockMoment);
jest.mock('lodash', () => mockLodash);

describe('课程服务测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // 设置默认的成功响应
    mockSupabase.from().single.mockResolvedValue({
      data: {
        id: 'course-123',
        title: '测试课程',
        description: '这是一个测试课程',
        instructorId: 'instructor-123',
        categoryId: 'category-123',
        price: 99.99,
        status: 'published',
        createdAt: '2024-01-01T00:00:00Z'
      },
      error: null
    });
    
    mockSupabase.from().mockResolvedValue({
      data: [{
        id: 'course-123',
        title: '测试课程',
        description: '这是一个测试课程'
      }],
      error: null
    });
    
    mockRedis.get.mockResolvedValue(null);
    mockRedis.set.mockResolvedValue('OK');
  });

  describe('服务初始化', () => {
    it('应该成功初始化课程服务', async () => {
      const result = await courseService.initialize();
      
      expect(result.success).toBe(true);
      expect(mockMonitoringService.recordEvent).toHaveBeenCalledWith(
        'course_service_initialized',
        expect.any(Object)
      );
    });

    it('应该加载课程分类配置', async () => {
      await courseService.initialize();
      
      expect(mockSupabase.from).toHaveBeenCalledWith('course_categories');
    });

    it('应该初始化课程缓存', async () => {
      await courseService.initialize();
      
      expect(mockRedis.exists).toHaveBeenCalled();
    });
  });

  describe('课程创建', () => {
    const courseData = {
      title: '新课程',
      description: '课程描述',
      instructorId: 'instructor-123',
      categoryId: 'category-123',
      price: 99.99,
      tags: ['编程', 'JavaScript'],
      difficulty: 'beginner'
    };

    it('应该成功创建课程', async () => {
      const result = await createCourse(courseData);
      
      expect(result.success).toBe(true);
      expect(result.course).toBeDefined();
      expect(result.course.id).toBe('test-uuid-123');
      expect(mockSupabase.from).toHaveBeenCalledWith('courses');
    });

    it('应该验证课程标题', async () => {
      const invalidData = { ...courseData, title: '' };
      
      const result = await createCourse(invalidData);
      
      expect(result.success).toBe(false);
      expect(result.error).toEqual(
        expect.objectContaining({
          type: 'VALIDATION_ERROR',
          message: 'Course title is required'
        })
      );
    });

    it('应该验证讲师权限', async () => {
      mockUserService.getUserPermissions.mockResolvedValue({
        success: true,
        permissions: ['read_courses']
      });
      
      const result = await createCourse(courseData);
      
      expect(result.success).toBe(false);
      expect(result.error).toEqual(
        expect.objectContaining({
          type: 'PERMISSION_DENIED',
          message: 'Insufficient permissions to create course'
        })
      );
    });

    it('应该生成唯一课程ID', async () => {
      await createCourse(courseData);
      
      expect(mockUuid.v4).toHaveBeenCalled();
      expect(mockSupabase.from().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'test-uuid-123'
        })
      );
    });

    it('应该设置默认课程状态', async () => {
      await createCourse(courseData);
      
      expect(mockSupabase.from().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'draft'
        })
      );
    });

    it('应该记录课程创建事件', async () => {
      await createCourse(courseData);
      
      expect(mockMonitoringService.recordEvent).toHaveBeenCalledWith(
        'course_created',
        expect.objectContaining({
          courseId: 'test-uuid-123',
          instructorId: 'instructor-123'
        })
      );
    });
  });

  describe('课程查询', () => {
    beforeEach(() => {
      mockSupabase.from().single.mockResolvedValue({
        data: {
          id: 'course-123',
          title: '测试课程',
          description: '课程描述',
          instructorId: 'instructor-123',
          categoryId: 'category-123',
          price: 99.99,
          status: 'published',
          enrollmentCount: 150,
          rating: 4.5,
          createdAt: '2024-01-01T00:00:00Z'
        },
        error: null
      });
    });

    it('应该根据ID获取课程', async () => {
      const result = await getCourseById('course-123');
      
      expect(result.success).toBe(true);
      expect(result.course).toBeDefined();
      expect(result.course.id).toBe('course-123');
    });

    it('应该使用缓存获取课程', async () => {
      mockRedis.get.mockResolvedValue(JSON.stringify({
        id: 'course-123',
        title: '缓存课程'
      }));
      
      const result = await getCourseById('course-123');
      
      expect(result.success).toBe(true);
      expect(result.course.title).toBe('缓存课程');
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it('应该缓存课程数据', async () => {
      await getCourseById('course-123');
      
      expect(mockRedis.set).toHaveBeenCalledWith(
        'course:course-123',
        expect.any(String),
        'EX',
        3600
      );
    });

    it('应该处理课程不存在', async () => {
      mockSupabase.from().single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' }
      });
      
      const result = await getCourseById('nonexistent-course');
      
      expect(result.success).toBe(false);
      expect(result.error).toEqual(
        expect.objectContaining({
          type: 'COURSE_NOT_FOUND',
          message: 'Course not found'
        })
      );
    });

    it('应该记录课程访问', async () => {
      await getCourseById('course-123');
      
      expect(mockMonitoringService.recordEvent).toHaveBeenCalledWith(
        'course_viewed',
        expect.objectContaining({
          courseId: 'course-123'
        })
      );
    });
  });

  describe('课程更新', () => {
    const updateData = {
      title: '更新的课程标题',
      description: '更新的课程描述',
      price: 129.99
    };

    it('应该成功更新课程', async () => {
      const result = await updateCourse('course-123', updateData);
      
      expect(result.success).toBe(true);
      expect(mockSupabase.from().update).toHaveBeenCalledWith(
        expect.objectContaining(updateData)
      );
    });

    it('应该验证更新权限', async () => {
      mockUserService.getUserPermissions.mockResolvedValue({
        success: true,
        permissions: ['read_courses']
      });
      
      const result = await updateCourse('course-123', updateData);
      
      expect(result.success).toBe(false);
      expect(result.error).toEqual(
        expect.objectContaining({
          type: 'PERMISSION_DENIED'
        })
      );
    });

    it('应该清除课程缓存', async () => {
      await updateCourse('course-123', updateData);
      
      expect(mockRedis.del).toHaveBeenCalledWith('course:course-123');
    });

    it('应该记录课程更新事件', async () => {
      await updateCourse('course-123', updateData);
      
      expect(mockMonitoringService.recordEvent).toHaveBeenCalledWith(
        'course_updated',
        expect.objectContaining({
          courseId: 'course-123',
          changes: expect.any(Object)
        })
      );
    });

    it('应该验证价格格式', async () => {
      const invalidData = { ...updateData, price: -10 };
      
      const result = await updateCourse('course-123', invalidData);
      
      expect(result.success).toBe(false);
      expect(result.error).toEqual(
        expect.objectContaining({
          type: 'VALIDATION_ERROR',
          message: 'Price must be a positive number'
        })
      );
    });
  });

  describe('课程删除', () => {
    it('应该成功删除课程', async () => {
      const result = await deleteCourse('course-123');
      
      expect(result.success).toBe(true);
      expect(mockSupabase.from().delete).toHaveBeenCalled();
    });

    it('应该验证删除权限', async () => {
      mockUserService.getUserPermissions.mockResolvedValue({
        success: true,
        permissions: ['read_courses']
      });
      
      const result = await deleteCourse('course-123');
      
      expect(result.success).toBe(false);
      expect(result.error).toEqual(
        expect.objectContaining({
          type: 'PERMISSION_DENIED'
        })
      );
    });

    it('应该删除相关文件', async () => {
      mockSupabase.from().select.mockResolvedValue({
        data: [{
          id: 'lesson-1',
          videoUrl: 'video-1.mp4',
          documentUrl: 'doc-1.pdf'
        }],
        error: null
      });
      
      await deleteCourse('course-123');
      
      expect(mockFileUploadService.deleteFile).toHaveBeenCalledWith('video-1.mp4');
      expect(mockFileUploadService.deleteFile).toHaveBeenCalledWith('doc-1.pdf');
    });

    it('应该清除课程缓存', async () => {
      await deleteCourse('course-123');
      
      expect(mockRedis.del).toHaveBeenCalledWith('course:course-123');
    });

    it('应该记录课程删除事件', async () => {
      await deleteCourse('course-123');
      
      expect(mockMonitoringService.recordEvent).toHaveBeenCalledWith(
        'course_deleted',
        expect.objectContaining({
          courseId: 'course-123'
        })
      );
    });
  });

  describe('课程搜索', () => {
    const searchParams = {
      query: 'JavaScript',
      category: 'programming',
      difficulty: 'beginner',
      priceRange: { min: 0, max: 100 },
      page: 1,
      limit: 20
    };

    beforeEach(() => {
      mockSupabase.from().mockResolvedValue({
        data: [
          {
            id: 'course-1',
            title: 'JavaScript基础',
            description: '学习JavaScript编程',
            price: 99.99,
            rating: 4.5,
            enrollmentCount: 150
          },
          {
            id: 'course-2',
            title: 'JavaScript进阶',
            description: '深入学习JavaScript',
            price: 149.99,
            rating: 4.8,
            enrollmentCount: 200
          }
        ],
        error: null
      });
    });

    it('应该根据关键词搜索课程', async () => {
      const result = await searchCourses(searchParams);
      
      expect(result.success).toBe(true);
      expect(result.courses).toHaveLength(2);
      expect(mockSupabase.from().ilike).toHaveBeenCalledWith(
        'title',
        '%JavaScript%'
      );
    });

    it('应该按分类筛选课程', async () => {
      await searchCourses(searchParams);
      
      expect(mockSupabase.from().eq).toHaveBeenCalledWith(
        'categoryId',
        'programming'
      );
    });

    it('应该按价格范围筛选', async () => {
      await searchCourses(searchParams);
      
      expect(mockSupabase.from().gte).toHaveBeenCalledWith('price', 0);
      expect(mockSupabase.from().lte).toHaveBeenCalledWith('price', 100);
    });

    it('应该支持分页', async () => {
      await searchCourses(searchParams);
      
      expect(mockSupabase.from().limit).toHaveBeenCalledWith(20);
      expect(mockSupabase.from().offset).toHaveBeenCalledWith(0);
    });

    it('应该缓存搜索结果', async () => {
      await searchCourses(searchParams);
      
      expect(mockRedis.set).toHaveBeenCalledWith(
        expect.stringMatching(/^search:/),
        expect.any(String),
        'EX',
        1800 // 30分钟
      );
    });

    it('应该使用缓存的搜索结果', async () => {
      const cachedResult = {
        courses: [{ id: 'cached-course' }],
        total: 1
      };
      
      mockRedis.get.mockResolvedValue(JSON.stringify(cachedResult));
      
      const result = await searchCourses(searchParams);
      
      expect(result.success).toBe(true);
      expect(result.courses[0].id).toBe('cached-course');
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it('应该记录搜索事件', async () => {
      await searchCourses(searchParams);
      
      expect(mockMonitoringService.recordEvent).toHaveBeenCalledWith(
        'course_search',
        expect.objectContaining({
          query: 'JavaScript',
          filters: expect.any(Object)
        })
      );
    });
  });

  describe('课程分类', () => {
    beforeEach(() => {
      mockSupabase.from().mockResolvedValue({
        data: [
          {
            id: 'category-1',
            name: '编程',
            courseCount: 50
          },
          {
            id: 'category-2',
            name: '设计',
            courseCount: 30
          }
        ],
        error: null
      });
    });

    it('应该获取分类下的课程', async () => {
      const result = await getCoursesByCategory('programming');
      
      expect(result.success).toBe(true);
      expect(result.courses).toBeDefined();
      expect(mockSupabase.from().eq).toHaveBeenCalledWith(
        'categoryId',
        'programming'
      );
    });

    it('应该按热度排序分类课程', async () => {
      await getCoursesByCategory('programming', { sortBy: 'popularity' });
      
      expect(mockSupabase.from().order).toHaveBeenCalledWith(
        'enrollmentCount',
        { ascending: false }
      );
    });

    it('应该按评分排序分类课程', async () => {
      await getCoursesByCategory('programming', { sortBy: 'rating' });
      
      expect(mockSupabase.from().order).toHaveBeenCalledWith(
        'rating',
        { ascending: false }
      );
    });

    it('应该缓存分类课程', async () => {
      await getCoursesByCategory('programming');
      
      expect(mockRedis.set).toHaveBeenCalledWith(
        'category:programming:courses',
        expect.any(String),
        'EX',
        3600
      );
    });
  });

  describe('课程评价', () => {
    const ratingData = {
      courseId: 'course-123',
      userId: 'user-123',
      rating: 5,
      comment: '非常好的课程！'
    };

    it('应该成功提交课程评价', async () => {
      const result = await rateCourse(ratingData);
      
      expect(result.success).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith('course_ratings');
    });

    it('应该验证评分范围', async () => {
      const invalidData = { ...ratingData, rating: 6 };
      
      const result = await rateCourse(invalidData);
      
      expect(result.success).toBe(false);
      expect(result.error).toEqual(
        expect.objectContaining({
          type: 'VALIDATION_ERROR',
          message: 'Rating must be between 1 and 5'
        })
      );
    });

    it('应该检查用户是否已注册课程', async () => {
      mockSupabase.from().single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' }
      });
      
      const result = await rateCourse(ratingData);
      
      expect(result.success).toBe(false);
      expect(result.error).toEqual(
        expect.objectContaining({
          type: 'NOT_ENROLLED',
          message: 'User must be enrolled to rate the course'
        })
      );
    });

    it('应该更新课程平均评分', async () => {
      await rateCourse(ratingData);
      
      expect(mockSupabase.rpc).toHaveBeenCalledWith(
        'update_course_rating',
        { course_id: 'course-123' }
      );
    });

    it('应该清除课程缓存', async () => {
      await rateCourse(ratingData);
      
      expect(mockRedis.del).toHaveBeenCalledWith('course:course-123');
    });
  });

  describe('课程注册', () => {
    const enrollmentData = {
      courseId: 'course-123',
      userId: 'user-123',
      paymentMethod: 'credit_card'
    };

    it('应该成功注册课程', async () => {
      const result = await enrollCourse(enrollmentData);
      
      expect(result.success).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith('course_enrollments');
    });

    it('应该检查重复注册', async () => {
      mockSupabase.from().single.mockResolvedValue({
        data: {
          id: 'enrollment-123',
          userId: 'user-123',
          courseId: 'course-123'
        },
        error: null
      });
      
      const result = await enrollCourse(enrollmentData);
      
      expect(result.success).toBe(false);
      expect(result.error).toEqual(
        expect.objectContaining({
          type: 'ALREADY_ENROLLED',
          message: 'User is already enrolled in this course'
        })
      );
    });

    it('应该检查课程可用性', async () => {
      mockSupabase.from().single.mockResolvedValueOnce({
        data: {
          id: 'course-123',
          status: 'draft',
          maxEnrollments: 100,
          currentEnrollments: 100
        },
        error: null
      });
      
      const result = await enrollCourse(enrollmentData);
      
      expect(result.success).toBe(false);
      expect(result.error).toEqual(
        expect.objectContaining({
          type: 'COURSE_UNAVAILABLE'
        })
      );
    });

    it('应该发送注册确认通知', async () => {
      await enrollCourse(enrollmentData);
      
      expect(mockNotificationService.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: expect.any(String),
          template: 'course_enrollment_confirmation'
        })
      );
    });

    it('应该更新课程注册数量', async () => {
      await enrollCourse(enrollmentData);
      
      expect(mockSupabase.rpc).toHaveBeenCalledWith(
        'increment_enrollment_count',
        { course_id: 'course-123' }
      );
    });
  });

  describe('课程进度', () => {
    beforeEach(() => {
      mockSupabase.from().mockResolvedValue({
        data: [
          {
            id: 'progress-1',
            lessonId: 'lesson-1',
            completed: true,
            completedAt: '2024-01-01T00:00:00Z'
          },
          {
            id: 'progress-2',
            lessonId: 'lesson-2',
            completed: false,
            completedAt: null
          }
        ],
        error: null
      });
    });

    it('应该获取用户课程进度', async () => {
      const result = await getCourseProgress('course-123', 'user-123');
      
      expect(result.success).toBe(true);
      expect(result.progress).toBeDefined();
      expect(result.progress.completionRate).toBe(50);
    });

    it('应该缓存进度数据', async () => {
      await getCourseProgress('course-123', 'user-123');
      
      expect(mockRedis.set).toHaveBeenCalledWith(
        'progress:course-123:user-123',
        expect.any(String),
        'EX',
        1800
      );
    });

    it('应该计算完成百分比', async () => {
      const result = await getCourseProgress('course-123', 'user-123');
      
      expect(result.progress.completionRate).toBe(50);
      expect(result.progress.completedLessons).toBe(1);
      expect(result.progress.totalLessons).toBe(2);
    });
  });

  describe('性能测试', () => {
    it('应该高效处理大量课程查询', async () => {
      const timer = mockMonitoringService.startTimer();
      
      const promises = Array.from({ length: 100 }, (_, i) => 
        getCourseById(`course-${i}`)
      );
      
      await Promise.all(promises);
      
      expect(timer.end).toHaveBeenCalled();
      expect(mockRedis.get).toHaveBeenCalledTimes(100);
    });

    it('应该优化课程搜索性能', async () => {
      const searchParams = {
        query: 'test',
        page: 1,
        limit: 50
      };
      
      await searchCourses(searchParams);
      
      expect(mockSupabase.from().limit).toHaveBeenCalledWith(50);
      expect(mockRedis.set).toHaveBeenCalled();
    });

    it('应该有效管理课程缓存', async () => {
      // 测试缓存命中
      mockRedis.get.mockResolvedValue(JSON.stringify({ id: 'cached-course' }));
      
      await getCourseById('course-123');
      
      expect(mockSupabase.from).not.toHaveBeenCalled();
      expect(mockRedis.get).toHaveBeenCalledWith('course:course-123');
    });

    it('应该优化批量操作性能', async () => {
      const courseIds = ['course-1', 'course-2', 'course-3'];
      
      await courseService.getCoursesByIds(courseIds);
      
      expect(mockSupabase.from().in).toHaveBeenCalledWith('id', courseIds);
    });
  });

  describe('错误处理', () => {
    it('应该处理数据库连接错误', async () => {
      mockSupabase.from().single.mockRejectedValue(new Error('Database connection failed'));
      
      const result = await getCourseById('course-123');
      
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
      
      const result = await getCourseById('course-123');
      
      expect(result.success).toBe(true); // 应该降级到数据库查询
      expect(mockSupabase.from).toHaveBeenCalled();
    });

    it('应该处理文件上传错误', async () => {
      mockFileUploadService.uploadFile.mockResolvedValue({
        success: false,
        error: { type: 'UPLOAD_FAILED' }
      });
      
      const result = await courseService.uploadCourseVideo('course-123', 'video-file');
      
      expect(result.success).toBe(false);
      expect(result.error.type).toBe('UPLOAD_FAILED');
    });

    it('应该处理并发更新冲突', async () => {
      mockSupabase.from().update.mockRejectedValue({
        code: '23505', // 唯一约束冲突
        message: 'Duplicate key value'
      });
      
      const result = await updateCourse('course-123', { title: '新标题' });
      
      expect(result.success).toBe(false);
      expect(result.error).toEqual(
        expect.objectContaining({
          type: 'CONFLICT_ERROR'
        })
      );
    });

    it('应该实现重试机制', async () => {
      mockSupabase.from().single
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValue({
          data: { id: 'course-123' },
          error: null
        });
      
      const result = await getCourseById('course-123');
      
      expect(result.success).toBe(true);
      expect(mockSupabase.from().single).toHaveBeenCalledTimes(2);
    });
  });
});

/**
 * 课程服务便捷函数导出测试
 */
describe('课程服务便捷函数', () => {
  it('应该导出所有必要的函数', () => {
    expect(typeof createCourse).toBe('function');
    expect(typeof getCourseById).toBe('function');
    expect(typeof updateCourse).toBe('function');
    expect(typeof deleteCourse).toBe('function');
    expect(typeof searchCourses).toBe('function');
    expect(typeof getCoursesByCategory).toBe('function');
    expect(typeof rateCourse).toBe('function');
    expect(typeof enrollCourse).toBe('function');
    expect(typeof getCourseProgress).toBe('function');
  });

  it('应该导出课程服务实例', () => {
    expect(courseService).toBeDefined();
    expect(typeof courseService.initialize).toBe('function');
    expect(typeof courseService.createCourse).toBe('function');
    expect(typeof courseService.getCourseById).toBe('function');
    expect(typeof courseService.updateCourse).toBe('function');
    expect(typeof courseService.deleteCourse).toBe('function');
  });
});