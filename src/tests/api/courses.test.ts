/**
 * 课程API集成测试
 * 
 * 测试课程相关的API端点，包括：
 * - 课程CRUD操作
 * - 课程搜索和筛选
 * - 课程分类管理
 * - 课程内容管理
 * - 课程评价和评分
 * - 课程统计和分析
 * - 课程权限控制
 * - 课程缓存机制
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
interface Course {
  id: string;
  title: string;
  description: string;
  shortDescription: string;
  thumbnail: string;
  categoryId: string;
  instructorId: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  duration: number; // 分钟
  price: number;
  originalPrice?: number;
  currency: string;
  language: string;
  status: 'draft' | 'published' | 'archived';
  tags: string[];
  prerequisites: string[];
  learningObjectives: string[];
  targetAudience: string[];
  rating: number;
  reviewCount: number;
  enrollmentCount: number;
  completionRate: number;
  lastUpdated: Date;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface CourseCategory {
  id: string;
  name: string;
  description: string;
  parentId?: string;
  icon: string;
  color: string;
  sortOrder: number;
  isActive: boolean;
  courseCount: number;
  createdAt: Date;
  updatedAt: Date;
}

interface CourseLesson {
  id: string;
  courseId: string;
  chapterId: string;
  title: string;
  description: string;
  content: string;
  videoUrl?: string;
  duration: number;
  sortOrder: number;
  isPreview: boolean;
  resources: CourseResource[];
  quiz?: CourseQuiz;
  createdAt: Date;
  updatedAt: Date;
}

interface CourseChapter {
  id: string;
  courseId: string;
  title: string;
  description: string;
  sortOrder: number;
  lessons: CourseLesson[];
  createdAt: Date;
  updatedAt: Date;
}

interface CourseResource {
  id: string;
  lessonId: string;
  title: string;
  type: 'pdf' | 'video' | 'audio' | 'link' | 'file';
  url: string;
  size?: number;
  downloadable: boolean;
  createdAt: Date;
}

interface CourseQuiz {
  id: string;
  lessonId: string;
  title: string;
  description: string;
  questions: QuizQuestion[];
  passingScore: number;
  timeLimit?: number;
  attempts: number;
  createdAt: Date;
  updatedAt: Date;
}

interface QuizQuestion {
  id: string;
  quizId: string;
  question: string;
  type: 'multiple_choice' | 'true_false' | 'fill_blank' | 'essay';
  options?: string[];
  correctAnswer: string | string[];
  explanation: string;
  points: number;
  sortOrder: number;
}

interface CourseReview {
  id: string;
  courseId: string;
  userId: string;
  rating: number;
  title: string;
  content: string;
  isVerifiedPurchase: boolean;
  helpfulCount: number;
  reportCount: number;
  status: 'published' | 'pending' | 'rejected';
  createdAt: Date;
  updatedAt: Date;
}

interface CourseEnrollment {
  id: string;
  courseId: string;
  userId: string;
  enrolledAt: Date;
  completedAt?: Date;
  progress: number;
  lastAccessedAt: Date;
  certificateIssued: boolean;
  paymentStatus: 'pending' | 'completed' | 'failed' | 'refunded';
  paymentAmount: number;
  paymentMethod: string;
  createdAt: Date;
  updatedAt: Date;
}

interface Instructor {
  id: string;
  userId: string;
  bio: string;
  expertise: string[];
  experience: number;
  rating: number;
  reviewCount: number;
  courseCount: number;
  studentCount: number;
  socialLinks: Record<string, string>;
  isVerified: boolean;
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
  ilike: jest.fn().mockReturnThis(),
  contains: jest.fn().mockReturnThis(),
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
  zrem: jest.fn(),
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
  gauge: jest.fn()
};

const mockLearningProgressService = {
  updateCourseProgress: jest.fn(),
  getCourseProgress: jest.fn(),
  markLessonComplete: jest.fn(),
  getCourseStatistics: jest.fn()
};

const mockAiService = {
  generateCourseRecommendations: jest.fn(),
  analyzeCourseContent: jest.fn(),
  generateCourseSummary: jest.fn(),
  detectContentQuality: jest.fn()
};

const mockEnvConfig = {
  courses: {
    maxFileSize: 100 * 1024 * 1024, // 100MB
    allowedVideoFormats: ['mp4', 'webm', 'ogg'],
    allowedImageFormats: ['jpg', 'jpeg', 'png', 'webp'],
    allowedDocumentFormats: ['pdf', 'doc', 'docx', 'ppt', 'pptx'],
    enableAutoTranscription: true,
    enableContentModeration: true,
    defaultCacheExpiry: 3600, // 1小时
    maxCourseSize: 10 * 1024 * 1024 * 1024, // 10GB
    enableAiRecommendations: true
  },
  pagination: {
    defaultLimit: 20,
    maxLimit: 100
  }
};

const mockJwt = {
  verify: jest.fn()
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
const testCourse: Course = {
  id: 'course-123456',
  title: 'JavaScript 从入门到精通',
  description: '这是一门全面的JavaScript课程，从基础语法到高级特性，帮助你掌握现代JavaScript开发技能。',
  shortDescription: '全面学习JavaScript编程语言',
  thumbnail: 'https://example.com/course-thumbnail.jpg',
  categoryId: 'category-programming',
  instructorId: 'instructor-123',
  level: 'beginner',
  duration: 1200, // 20小时
  price: 299.00,
  originalPrice: 399.00,
  currency: 'CNY',
  language: 'zh-CN',
  status: 'published',
  tags: ['JavaScript', '前端开发', '编程基础'],
  prerequisites: ['HTML基础', 'CSS基础'],
  learningObjectives: [
    '掌握JavaScript基础语法',
    '理解面向对象编程',
    '学会使用现代JavaScript特性',
    '能够开发实际项目'
  ],
  targetAudience: ['编程初学者', '前端开发者', '计算机专业学生'],
  rating: 4.8,
  reviewCount: 1250,
  enrollmentCount: 5680,
  completionRate: 78.5,
  lastUpdated: new Date(),
  publishedAt: new Date('2024-01-01'),
  createdAt: new Date('2023-12-01'),
  updatedAt: new Date()
};

const testCategory: CourseCategory = {
  id: 'category-programming',
  name: '编程开发',
  description: '学习各种编程语言和开发技术',
  parentId: null,
  icon: 'code',
  color: '#3B82F6',
  sortOrder: 1,
  isActive: true,
  courseCount: 156,
  createdAt: new Date(),
  updatedAt: new Date()
};

const testChapter: CourseChapter = {
  id: 'chapter-123',
  courseId: 'course-123456',
  title: '第一章：JavaScript基础',
  description: '学习JavaScript的基本语法和概念',
  sortOrder: 1,
  lessons: [],
  createdAt: new Date(),
  updatedAt: new Date()
};

const testLesson: CourseLesson = {
  id: 'lesson-123',
  courseId: 'course-123456',
  chapterId: 'chapter-123',
  title: '变量和数据类型',
  description: '学习JavaScript中的变量声明和基本数据类型',
  content: '在这节课中，我们将学习...',
  videoUrl: 'https://example.com/lesson-video.mp4',
  duration: 15, // 15分钟
  sortOrder: 1,
  isPreview: true,
  resources: [],
  createdAt: new Date(),
  updatedAt: new Date()
};

const testReview: CourseReview = {
  id: 'review-123',
  courseId: 'course-123456',
  userId: 'user-123',
  rating: 5,
  title: '非常棒的课程！',
  content: '讲解清晰，内容丰富，强烈推荐给想学JavaScript的朋友。',
  isVerifiedPurchase: true,
  helpfulCount: 25,
  reportCount: 0,
  status: 'published',
  createdAt: new Date(),
  updatedAt: new Date()
};

const testEnrollment: CourseEnrollment = {
  id: 'enrollment-123',
  courseId: 'course-123456',
  userId: 'user-123',
  enrolledAt: new Date(),
  progress: 45.5,
  lastAccessedAt: new Date(),
  certificateIssued: false,
  paymentStatus: 'completed',
  paymentAmount: 299.00,
  paymentMethod: 'alipay',
  createdAt: new Date(),
  updatedAt: new Date()
};

const testInstructor: Instructor = {
  id: 'instructor-123',
  userId: 'user-instructor',
  bio: '资深前端开发工程师，拥有10年开发经验',
  expertise: ['JavaScript', 'React', 'Vue.js', 'Node.js'],
  experience: 10,
  rating: 4.9,
  reviewCount: 2340,
  courseCount: 15,
  studentCount: 25680,
  socialLinks: {
    github: 'https://github.com/instructor',
    linkedin: 'https://linkedin.com/in/instructor'
  },
  isVerified: true,
  createdAt: new Date(),
  updatedAt: new Date()
};

// 认证中间件模拟
const mockAuthUser = {
  id: 'user-123',
  email: 'test@skillup.com',
  role: 'student'
};

const mockInstructorUser = {
  id: 'user-instructor',
  email: 'instructor@skillup.com',
  role: 'instructor'
};

const mockAdminUser = {
  id: 'user-admin',
  email: 'admin@skillup.com',
  role: 'admin'
};

describe('Courses API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // 设置默认的mock返回值
    mockCacheService.get.mockResolvedValue(null);
    mockCacheService.set.mockResolvedValue(true);
    mockCacheService.mget.mockResolvedValue([]);
    mockCacheService.mset.mockResolvedValue(true);
    
    mockAuditService.log.mockResolvedValue(true);
    mockAnalyticsService.track.mockResolvedValue(true);
    
    mockLearningProgressService.getCourseProgress.mockResolvedValue({
      progress: 45.5,
      completedLessons: 5,
      totalLessons: 11
    });
    
    mockAiService.generateCourseRecommendations.mockResolvedValue([
      { courseId: 'course-456', score: 0.95 },
      { courseId: 'course-789', score: 0.87 }
    ]);
    
    // 设置JWT验证
    mockJwt.verify.mockReturnValue(mockAuthUser);
    
    // 设置Supabase默认返回值
    mockSupabaseClient.single.mockResolvedValue({
      data: testCourse,
      error: null
    });
    
    mockSupabaseClient.then.mockResolvedValue({
      data: [testCourse],
      error: null,
      count: 1
    });
    
    mockSupabaseClient.count.mockResolvedValue({
      data: null,
      error: null,
      count: 156
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  /**
   * 课程列表测试
   */
  describe('GET /api/courses', () => {
    it('应该获取课程列表', async () => {
      const response = await request(app)
        .get('/api/courses')
        .expect(200);
      
      expect(response.body).toEqual(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            courses: expect.arrayContaining([
              expect.objectContaining({
                id: 'course-123456',
                title: 'JavaScript 从入门到精通',
                level: 'beginner',
                price: 299.00,
                rating: 4.8
              })
            ]),
            pagination: expect.objectContaining({
              page: 1,
              limit: 20,
              total: 156,
              totalPages: 8
            })
          })
        })
      );
      
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('courses');
      expect(mockSupabaseClient.select).toHaveBeenCalled();
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('status', 'published');
    });

    it('应该支持分页参数', async () => {
      const response = await request(app)
        .get('/api/courses?page=2&limit=10')
        .expect(200);
      
      expect(mockSupabaseClient.range).toHaveBeenCalledWith(10, 19);
      expect(response.body.data.pagination).toEqual(
        expect.objectContaining({
          page: 2,
          limit: 10
        })
      );
    });

    it('应该支持分类筛选', async () => {
      await request(app)
        .get('/api/courses?category=programming')
        .expect(200);
      
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('category_id', 'programming');
    });

    it('应该支持难度筛选', async () => {
      await request(app)
        .get('/api/courses?level=beginner,intermediate')
        .expect(200);
      
      expect(mockSupabaseClient.in).toHaveBeenCalledWith('level', ['beginner', 'intermediate']);
    });

    it('应该支持价格范围筛选', async () => {
      await request(app)
        .get('/api/courses?minPrice=100&maxPrice=500')
        .expect(200);
      
      expect(mockSupabaseClient.gte).toHaveBeenCalledWith('price', 100);
      expect(mockSupabaseClient.lte).toHaveBeenCalledWith('price', 500);
    });

    it('应该支持搜索功能', async () => {
      await request(app)
        .get('/api/courses?search=JavaScript')
        .expect(200);
      
      expect(mockSupabaseClient.ilike).toHaveBeenCalledWith('title', '%JavaScript%');
    });

    it('应该支持排序', async () => {
      await request(app)
        .get('/api/courses?sortBy=rating&sortOrder=desc')
        .expect(200);
      
      expect(mockSupabaseClient.order).toHaveBeenCalledWith('rating', { ascending: false });
    });

    it('应该使用缓存', async () => {
      const cacheKey = 'courses_list_page_1_limit_20_published';
      mockCacheService.get.mockResolvedValue(JSON.stringify({
        courses: [testCourse],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 }
      }));
      
      const response = await request(app)
        .get('/api/courses')
        .expect(200);
      
      expect(mockCacheService.get).toHaveBeenCalledWith(cacheKey);
      expect(response.body.data.courses).toHaveLength(1);
    });
  });

  /**
   * 课程详情测试
   */
  describe('GET /api/courses/:id', () => {
    it('应该获取课程详情', async () => {
      const response = await request(app)
        .get('/api/courses/course-123456')
        .expect(200);
      
      expect(response.body).toEqual(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            id: 'course-123456',
            title: 'JavaScript 从入门到精通',
            description: expect.any(String),
            instructor: expect.objectContaining({
              id: 'instructor-123',
              name: expect.any(String)
            }),
            chapters: expect.any(Array),
            reviews: expect.any(Array),
            relatedCourses: expect.any(Array)
          })
        })
      );
      
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('id', 'course-123456');
      expect(mockAnalyticsService.track).toHaveBeenCalledWith(
        'course.view',
        expect.objectContaining({
          courseId: 'course-123456'
        })
      );
    });

    it('应该处理课程不存在', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: null,
        error: { message: 'No rows returned' }
      });
      
      const response = await request(app)
        .get('/api/courses/nonexistent')
        .expect(404);
      
      expect(response.body).toEqual(
        expect.objectContaining({
          success: false,
          message: '课程不存在'
        })
      );
    });

    it('应该显示用户的学习进度（已登录）', async () => {
      const response = await request(app)
        .get('/api/courses/course-123456')
        .set('Authorization', 'Bearer jwt-token-123')
        .expect(200);
      
      expect(response.body.data).toEqual(
        expect.objectContaining({
          userProgress: expect.objectContaining({
            progress: 45.5,
            completedLessons: 5,
            totalLessons: 11
          })
        })
      );
      
      expect(mockLearningProgressService.getCourseProgress).toHaveBeenCalledWith(
        'user-123',
        'course-123456'
      );
    });

    it('应该生成相关课程推荐', async () => {
      const response = await request(app)
        .get('/api/courses/course-123456')
        .expect(200);
      
      expect(response.body.data.relatedCourses).toBeDefined();
      expect(mockAiService.generateCourseRecommendations).toHaveBeenCalledWith(
        'course-123456',
        expect.objectContaining({
          limit: 5,
          excludeEnrolled: false
        })
      );
    });
  });

  /**
   * 课程创建测试（讲师权限）
   */
  describe('POST /api/courses', () => {
    beforeEach(() => {
      mockJwt.verify.mockReturnValue(mockInstructorUser);
    });

    it('应该创建新课程', async () => {
      const courseData = {
        title: '新的JavaScript课程',
        description: '这是一门新的JavaScript课程',
        shortDescription: '学习JavaScript',
        categoryId: 'category-programming',
        level: 'beginner',
        price: 199.00,
        language: 'zh-CN',
        tags: ['JavaScript', '编程'],
        prerequisites: ['HTML基础'],
        learningObjectives: ['掌握JavaScript基础']
      };
      
      mockSupabaseClient.single.mockResolvedValue({
        data: { ...testCourse, ...courseData, id: 'course-new' },
        error: null
      });
      
      const response = await request(app)
        .post('/api/courses')
        .set('Authorization', 'Bearer instructor-token')
        .send(courseData)
        .expect(201);
      
      expect(response.body).toEqual(
        expect.objectContaining({
          success: true,
          message: '课程创建成功',
          data: expect.objectContaining({
            id: 'course-new',
            title: '新的JavaScript课程',
            status: 'draft'
          })
        })
      );
      
      expect(mockSupabaseClient.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '新的JavaScript课程',
          instructor_id: 'user-instructor',
          status: 'draft'
        })
      );
      
      expect(mockAuditService.log).toHaveBeenCalledWith(
        'course.create',
        expect.objectContaining({
          courseId: 'course-new',
          instructorId: 'user-instructor'
        })
      );
    });

    it('应该验证必填字段', async () => {
      const response = await request(app)
        .post('/api/courses')
        .set('Authorization', 'Bearer instructor-token')
        .send({
          title: '', // 空标题
          price: -100 // 负价格
        })
        .expect(400);
      
      expect(response.body).toEqual(
        expect.objectContaining({
          success: false,
          message: '请求参数验证失败',
          errors: expect.arrayContaining([
            expect.objectContaining({
              field: 'title',
              message: '课程标题不能为空'
            }),
            expect.objectContaining({
              field: 'price',
              message: '价格不能为负数'
            })
          ])
        })
      );
    });

    it('应该检查讲师权限', async () => {
      mockJwt.verify.mockReturnValue(mockAuthUser); // 普通用户
      
      const response = await request(app)
        .post('/api/courses')
        .set('Authorization', 'Bearer student-token')
        .send({
          title: '测试课程',
          description: '测试描述'
        })
        .expect(403);
      
      expect(response.body).toEqual(
        expect.objectContaining({
          success: false,
          message: '权限不足，只有讲师可以创建课程'
        })
      );
    });
  });

  /**
   * 课程更新测试
   */
  describe('PUT /api/courses/:id', () => {
    beforeEach(() => {
      mockJwt.verify.mockReturnValue(mockInstructorUser);
      mockSupabaseClient.single.mockResolvedValue({
        data: { ...testCourse, instructorId: 'user-instructor' },
        error: null
      });
    });

    it('应该更新课程信息', async () => {
      const updateData = {
        title: '更新的课程标题',
        price: 399.00,
        description: '更新的课程描述'
      };
      
      const response = await request(app)
        .put('/api/courses/course-123456')
        .set('Authorization', 'Bearer instructor-token')
        .send(updateData)
        .expect(200);
      
      expect(response.body).toEqual(
        expect.objectContaining({
          success: true,
          message: '课程更新成功'
        })
      );
      
      expect(mockSupabaseClient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '更新的课程标题',
          price: 399.00,
          description: '更新的课程描述',
          updated_at: expect.any(String)
        })
      );
      
      expect(mockCacheService.del).toHaveBeenCalledWith(
        'course_detail_course-123456'
      );
    });

    it('应该检查课程所有权', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: { ...testCourse, instructorId: 'other-instructor' },
        error: null
      });
      
      const response = await request(app)
        .put('/api/courses/course-123456')
        .set('Authorization', 'Bearer instructor-token')
        .send({ title: '尝试更新' })
        .expect(403);
      
      expect(response.body).toEqual(
        expect.objectContaining({
          success: false,
          message: '权限不足，只能修改自己的课程'
        })
      );
    });

    it('应该允许管理员更新任何课程', async () => {
      mockJwt.verify.mockReturnValue(mockAdminUser);
      
      const response = await request(app)
        .put('/api/courses/course-123456')
        .set('Authorization', 'Bearer admin-token')
        .send({ title: '管理员更新' })
        .expect(200);
      
      expect(response.body.success).toBe(true);
    });
  });

  /**
   * 课程发布测试
   */
  describe('POST /api/courses/:id/publish', () => {
    beforeEach(() => {
      mockJwt.verify.mockReturnValue(mockInstructorUser);
      mockSupabaseClient.single.mockResolvedValue({
        data: { ...testCourse, status: 'draft', instructorId: 'user-instructor' },
        error: null
      });
    });

    it('应该发布课程', async () => {
      const response = await request(app)
        .post('/api/courses/course-123456/publish')
        .set('Authorization', 'Bearer instructor-token')
        .expect(200);
      
      expect(response.body).toEqual(
        expect.objectContaining({
          success: true,
          message: '课程发布成功'
        })
      );
      
      expect(mockSupabaseClient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'published',
          published_at: expect.any(String)
        })
      );
      
      expect(mockAuditService.log).toHaveBeenCalledWith(
        'course.publish',
        expect.objectContaining({
          courseId: 'course-123456'
        })
      );
    });

    it('应该验证课程完整性', async () => {
      // 模拟课程内容不完整
      mockSupabaseClient.then.mockResolvedValue({
        data: [], // 没有章节
        error: null
      });
      
      const response = await request(app)
        .post('/api/courses/course-123456/publish')
        .set('Authorization', 'Bearer instructor-token')
        .expect(400);
      
      expect(response.body).toEqual(
        expect.objectContaining({
          success: false,
          message: '课程内容不完整，无法发布',
          errors: expect.arrayContaining([
            '课程至少需要包含一个章节'
          ])
        })
      );
    });
  });

  /**
   * 课程删除测试
   */
  describe('DELETE /api/courses/:id', () => {
    beforeEach(() => {
      mockJwt.verify.mockReturnValue(mockInstructorUser);
      mockSupabaseClient.single.mockResolvedValue({
        data: { ...testCourse, instructorId: 'user-instructor' },
        error: null
      });
    });

    it('应该软删除课程', async () => {
      const response = await request(app)
        .delete('/api/courses/course-123456')
        .set('Authorization', 'Bearer instructor-token')
        .expect(200);
      
      expect(response.body).toEqual(
        expect.objectContaining({
          success: true,
          message: '课程删除成功'
        })
      );
      
      expect(mockSupabaseClient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'archived',
          archived_at: expect.any(String)
        })
      );
    });

    it('应该检查是否有学员已报名', async () => {
      mockSupabaseClient.count.mockResolvedValue({
        data: null,
        error: null,
        count: 50 // 有50个学员
      });
      
      const response = await request(app)
        .delete('/api/courses/course-123456')
        .set('Authorization', 'Bearer instructor-token')
        .expect(400);
      
      expect(response.body).toEqual(
        expect.objectContaining({
          success: false,
          message: '课程已有学员报名，无法删除'
        })
      );
    });
  });

  /**
   * 课程报名测试
   */
  describe('POST /api/courses/:id/enroll', () => {
    beforeEach(() => {
      mockJwt.verify.mockReturnValue(mockAuthUser);
    });

    it('应该成功报名免费课程', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: { ...testCourse, price: 0 },
        error: null
      });
      
      // 检查是否已报名
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'No rows returned' }
      });
      
      const response = await request(app)
        .post('/api/courses/course-123456/enroll')
        .set('Authorization', 'Bearer jwt-token-123')
        .expect(201);
      
      expect(response.body).toEqual(
        expect.objectContaining({
          success: true,
          message: '报名成功',
          data: expect.objectContaining({
            enrollmentId: expect.any(String),
            courseId: 'course-123456'
          })
        })
      );
      
      expect(mockSupabaseClient.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          course_id: 'course-123456',
          user_id: 'user-123',
          payment_status: 'completed'
        })
      );
    });

    it('应该处理付费课程报名', async () => {
      const response = await request(app)
        .post('/api/courses/course-123456/enroll')
        .set('Authorization', 'Bearer jwt-token-123')
        .send({
          paymentMethod: 'alipay',
          couponCode: 'DISCOUNT10'
        })
        .expect(200);
      
      expect(response.body).toEqual(
        expect.objectContaining({
          success: true,
          message: '请完成支付',
          data: expect.objectContaining({
            paymentUrl: expect.any(String),
            orderId: expect.any(String),
            amount: expect.any(Number)
          })
        })
      );
    });

    it('应该检查重复报名', async () => {
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: testEnrollment,
        error: null
      });
      
      const response = await request(app)
        .post('/api/courses/course-123456/enroll')
        .set('Authorization', 'Bearer jwt-token-123')
        .expect(409);
      
      expect(response.body).toEqual(
        expect.objectContaining({
          success: false,
          message: '您已经报名了这门课程'
        })
      );
    });
  });

  /**
   * 课程评价测试
   */
  describe('POST /api/courses/:id/reviews', () => {
    beforeEach(() => {
      mockJwt.verify.mockReturnValue(mockAuthUser);
      // 模拟用户已报名
      mockSupabaseClient.single.mockResolvedValue({
        data: testEnrollment,
        error: null
      });
    });

    it('应该创建课程评价', async () => {
      const reviewData = {
        rating: 5,
        title: '非常棒的课程',
        content: '内容丰富，讲解清晰，强烈推荐！'
      };
      
      const response = await request(app)
        .post('/api/courses/course-123456/reviews')
        .set('Authorization', 'Bearer jwt-token-123')
        .send(reviewData)
        .expect(201);
      
      expect(response.body).toEqual(
        expect.objectContaining({
          success: true,
          message: '评价提交成功',
          data: expect.objectContaining({
            id: expect.any(String),
            rating: 5,
            title: '非常棒的课程'
          })
        })
      );
      
      expect(mockSupabaseClient.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          course_id: 'course-123456',
          user_id: 'user-123',
          rating: 5,
          title: '非常棒的课程',
          content: '内容丰富，讲解清晰，强烈推荐！',
          is_verified_purchase: true
        })
      );
    });

    it('应该检查用户是否已报名', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: null,
        error: { message: 'No rows returned' }
      });
      
      const response = await request(app)
        .post('/api/courses/course-123456/reviews')
        .set('Authorization', 'Bearer jwt-token-123')
        .send({
          rating: 5,
          title: '测试评价',
          content: '测试内容'
        })
        .expect(403);
      
      expect(response.body).toEqual(
        expect.objectContaining({
          success: false,
          message: '只有报名学员才能评价课程'
        })
      );
    });

    it('应该验证评分范围', async () => {
      const response = await request(app)
        .post('/api/courses/course-123456/reviews')
        .set('Authorization', 'Bearer jwt-token-123')
        .send({
          rating: 6, // 超出范围
          title: '测试评价',
          content: '测试内容'
        })
        .expect(400);
      
      expect(response.body.errors).toContainEqual(
        expect.objectContaining({
          field: 'rating',
          message: '评分必须在1-5之间'
        })
      );
    });
  });

  /**
   * 课程分类测试
   */
  describe('GET /api/courses/categories', () => {
    it('应该获取课程分类列表', async () => {
      mockSupabaseClient.then.mockResolvedValue({
        data: [testCategory],
        error: null
      });
      
      const response = await request(app)
        .get('/api/courses/categories')
        .expect(200);
      
      expect(response.body).toEqual(
        expect.objectContaining({
          success: true,
          data: expect.arrayContaining([
            expect.objectContaining({
              id: 'category-programming',
              name: '编程开发',
              courseCount: 156
            })
          ])
        })
      );
      
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('is_active', true);
      expect(mockSupabaseClient.order).toHaveBeenCalledWith('sort_order');
    });

    it('应该支持层级分类', async () => {
      const parentCategory = { ...testCategory, id: 'parent-tech' };
      const childCategory = { ...testCategory, id: 'child-js', parentId: 'parent-tech' };
      
      mockSupabaseClient.then.mockResolvedValue({
        data: [parentCategory, childCategory],
        error: null
      });
      
      const response = await request(app)
        .get('/api/courses/categories?includeHierarchy=true')
        .expect(200);
      
      expect(response.body.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'parent-tech',
            children: expect.arrayContaining([
              expect.objectContaining({
                id: 'child-js',
                parentId: 'parent-tech'
              })
            ])
          })
        ])
      );
    });
  });

  /**
   * 课程搜索测试
   */
  describe('GET /api/courses/search', () => {
    it('应该支持全文搜索', async () => {
      const response = await request(app)
        .get('/api/courses/search?q=JavaScript 前端')
        .expect(200);
      
      expect(response.body).toEqual(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            courses: expect.any(Array),
            suggestions: expect.any(Array),
            filters: expect.any(Object)
          })
        })
      );
      
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith(
        'search_courses',
        expect.objectContaining({
          search_query: 'JavaScript 前端'
        })
      );
    });

    it('应该提供搜索建议', async () => {
      mockCacheService.get.mockResolvedValue(JSON.stringify([
        'JavaScript',
        'JavaScript 基础',
        'JavaScript 高级'
      ]));
      
      const response = await request(app)
        .get('/api/courses/search/suggestions?q=Java')
        .expect(200);
      
      expect(response.body).toEqual(
        expect.objectContaining({
          success: true,
          data: expect.arrayContaining([
            'JavaScript',
            'JavaScript 基础',
            'JavaScript 高级'
          ])
        })
      );
    });
  });

  /**
   * 错误处理测试
   */
  describe('Error Handling', () => {
    it('应该处理数据库连接错误', async () => {
      mockSupabaseClient.then.mockRejectedValue(
        new Error('Database connection failed')
      );
      
      const response = await request(app)
        .get('/api/courses')
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
        .get('/api/courses/invalid-id-format')
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
    it('应该在合理时间内返回课程列表', async () => {
      const startTime = Date.now();
      
      await request(app)
        .get('/api/courses')
        .expect(200);
      
      const executionTime = Date.now() - startTime;
      expect(executionTime).toBeLessThan(500); // 500ms内完成
    });

    it('应该有效利用缓存减少数据库查询', async () => {
      const cacheKey = 'course_detail_course-123456';
      mockCacheService.get.mockResolvedValue(JSON.stringify(testCourse));
      
      await request(app)
        .get('/api/courses/course-123456')
        .expect(200);
      
      expect(mockCacheService.get).toHaveBeenCalledWith(cacheKey);
      expect(mockSupabaseClient.from).not.toHaveBeenCalled();
    });

    it('应该支持批量操作', async () => {
      const courseIds = ['course-1', 'course-2', 'course-3'];
      
      const response = await request(app)
        .post('/api/courses/batch')
        .set('Authorization', 'Bearer admin-token')
        .send({
          action: 'publish',
          courseIds
        })
        .expect(200);
      
      expect(response.body).toEqual(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            processed: 3,
            successful: expect.any(Number),
            failed: expect.any(Number)
          })
        })
      );
    });
  });
});