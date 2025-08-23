/**
 * 章节管理 API 集成测试
 * 测试章节创建、更新、删除、查询、视频上传等功能
 */

import { jest } from '@jest/globals';
import request from 'supertest';
import app from '../../api/app';
import { supabase } from '../../utils/supabase';
import { cacheService } from '../../services/cacheService';
import { auditService } from '../../services/auditService';
import { analyticsService } from '../../services/analyticsService';
import { envConfig } from '../../utils/envConfig';
import { logger } from '../../utils/logger';
import path from 'path';
import fs from 'fs';

// Mock 依赖
jest.mock('../../utils/supabase');
jest.mock('../../services/cacheService');
jest.mock('../../services/auditService');
jest.mock('../../services/analyticsService');
jest.mock('../../utils/envConfig');
jest.mock('../../utils/logger');
jest.mock('fs');

// Mock 对象
const mockSupabase = supabase as jest.Mocked<typeof supabase>;
const mockCacheService = cacheService as jest.Mocked<typeof cacheService>;
const mockAuditService = auditService as jest.Mocked<typeof auditService>;
const mockAnalyticsService = analyticsService as jest.Mocked<typeof analyticsService>;
const mockEnvConfig = envConfig as jest.Mocked<typeof envConfig>;
const mockLogger = logger as jest.Mocked<typeof logger>;
const mockFs = fs as jest.Mocked<typeof fs>;

// 测试数据
const testInstructor = {
  id: 'instructor-123',
  email: 'instructor@example.com',
  role: 'instructor',
  email_verified: true
};

const testStudent = {
  id: 'student-123',
  email: 'student@example.com',
  role: 'student',
  email_verified: true
};

const testAdmin = {
  id: 'admin-123',
  email: 'admin@example.com',
  role: 'admin',
  email_verified: true
};

const testCourse = {
  id: 'course-123',
  title: 'JavaScript 基础教程',
  instructor_id: 'instructor-123',
  status: 'published',
  created_at: '2024-01-01T00:00:00Z'
};

const testChapter = {
  id: 'chapter-123',
  course_id: 'course-123',
  title: '第一章：JavaScript 简介',
  description: '了解 JavaScript 的历史和基本概念',
  order_index: 1,
  duration: 1800, // 30分钟
  video_url: 'https://example.com/chapter-1.mp4',
  content: '# JavaScript 简介\n\nJavaScript 是一种...',
  is_free: true,
  status: 'published',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z'
};

const testProgress = {
  id: 'progress-123',
  user_id: 'student-123',
  chapter_id: 'chapter-123',
  course_id: 'course-123',
  progress: 75.5,
  completed: false,
  watch_time: 1350, // 22.5分钟
  last_position: 1350,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T01:00:00Z'
};

const testNote = {
  id: 'note-123',
  user_id: 'student-123',
  chapter_id: 'chapter-123',
  course_id: 'course-123',
  content: '这里是重要的知识点',
  timestamp: 900, // 15分钟处
  created_at: '2024-01-01T00:00:00Z'
};

// 生成JWT令牌的辅助函数
const generateToken = (user: any) => {
  return `Bearer token-${user.id}`;
};

describe('Chapters API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // 设置环境配置
    mockEnvConfig.get.mockImplementation((key, defaultValue) => {
      const config = {
        NODE_ENV: 'test',
        JWT_SECRET: 'test-jwt-secret',
        UPLOAD_MAX_SIZE: '104857600', // 100MB
        ALLOWED_VIDEO_TYPES: 'video/mp4,video/webm,video/avi',
        VIDEO_PROCESSING_ENABLED: 'true',
        SUPABASE_STORAGE_BUCKET: 'course-videos'
      };
      return config[key] || defaultValue;
    });
    
    // 设置缓存服务
    mockCacheService.get.mockResolvedValue(null);
    mockCacheService.set.mockResolvedValue(undefined);
    mockCacheService.del.mockResolvedValue(undefined);
    
    // 设置审计服务
    mockAuditService.log.mockResolvedValue(undefined);
    
    // 设置分析服务
    mockAnalyticsService.track.mockResolvedValue(undefined);
    
    // 设置日志
    mockLogger.info = jest.fn();
    mockLogger.warn = jest.fn();
    mockLogger.error = jest.fn();
    mockLogger.debug = jest.fn();
    
    // 设置文件系统
    mockFs.existsSync = jest.fn().mockReturnValue(true);
    mockFs.statSync = jest.fn().mockReturnValue({
      size: 1024 * 1024 * 50 // 50MB
    } as any);
  });

  /**
   * 获取课程章节列表测试
   */
  describe('GET /api/courses/:courseId/chapters', () => {
    it('应该返回课程章节列表', async () => {
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: testCourse,
              error: null
            })
          })
        })
      } as any);
      
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: [testChapter],
              error: null
            })
          })
        })
      } as any);
      
      const response = await request(app)
        .get('/api/courses/course-123/chapters');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.chapters).toHaveLength(1);
      expect(response.body.data.chapters[0].id).toBe('chapter-123');
    });

    it('应该检查用户权限（付费章节）', async () => {
      const paidChapter = { ...testChapter, is_free: false };
      
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: testStudent },
        error: null
      });
      
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: testCourse,
              error: null
            })
          })
        })
      } as any);
      
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: [paidChapter],
              error: null
            })
          })
        })
      } as any);
      
      // 检查是否已报名
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { code: 'PGRST116' }
              })
            })
          })
        })
      } as any);
      
      const response = await request(app)
        .get('/api/courses/course-123/chapters')
        .set('Authorization', generateToken(testStudent));
      
      expect(response.status).toBe(200);
      expect(response.body.data.chapters[0].video_url).toBeUndefined(); // 付费内容应该被隐藏
    });

    it('应该缓存章节列表', async () => {
      mockCacheService.get.mockResolvedValue(JSON.stringify({
        chapters: [testChapter]
      }));
      
      const response = await request(app)
        .get('/api/courses/course-123/chapters');
      
      expect(response.status).toBe(200);
      expect(mockSupabase.from).toHaveBeenCalledTimes(1); // 只检查课程存在性
    });

    it('应该处理课程不存在的情况', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116' }
            })
          })
        })
      } as any);
      
      const response = await request(app)
        .get('/api/courses/nonexistent-course/chapters');
      
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  /**
   * 获取单个章节详情测试
   */
  describe('GET /api/courses/:courseId/chapters/:id', () => {
    it('应该返回章节详细信息', async () => {
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  ...testChapter,
                  course: testCourse
                },
                error: null
              })
            })
          })
        })
      } as any);
      
      const response = await request(app)
        .get('/api/courses/course-123/chapters/chapter-123');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.chapter.id).toBe('chapter-123');
      expect(response.body.data.chapter.course).toBeDefined();
    });

    it('应该返回用户学习进度', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: testStudent },
        error: null
      });
      
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  ...testChapter,
                  course: testCourse
                },
                error: null
              })
            })
          })
        })
      } as any);
      
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: testProgress,
                error: null
              })
            })
          })
        })
      } as any);
      
      const response = await request(app)
        .get('/api/courses/course-123/chapters/chapter-123')
        .set('Authorization', generateToken(testStudent));
      
      expect(response.status).toBe(200);
      expect(response.body.data.progress).toBeDefined();
      expect(response.body.data.progress.progress).toBe(75.5);
    });

    it('应该检查付费章节访问权限', async () => {
      const paidChapter = { ...testChapter, is_free: false };
      
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: testStudent },
        error: null
      });
      
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  ...paidChapter,
                  course: testCourse
                },
                error: null
              })
            })
          })
        })
      } as any);
      
      // 检查是否已报名
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { code: 'PGRST116' }
              })
            })
          })
        })
      } as any);
      
      const response = await request(app)
        .get('/api/courses/course-123/chapters/chapter-123')
        .set('Authorization', generateToken(testStudent));
      
      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('enrollment required');
    });
  });

  /**
   * 创建章节测试
   */
  describe('POST /api/courses/:courseId/chapters', () => {
    it('讲师应该能够为自己的课程创建章节', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: testInstructor },
        error: null
      });
      
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: testCourse,
              error: null
            })
          })
        })
      } as any);
      
      mockSupabase.from.mockReturnValueOnce({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue({
            data: [testChapter],
            error: null
          })
        })
      } as any);
      
      const response = await request(app)
        .post('/api/courses/course-123/chapters')
        .set('Authorization', generateToken(testInstructor))
        .send({
          title: '第一章：JavaScript 简介',
          description: '了解 JavaScript 的历史和基本概念',
          order_index: 1,
          duration: 1800,
          content: '# JavaScript 简介\n\nJavaScript 是一种...',
          is_free: true
        });
      
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.chapter.title).toBe('第一章：JavaScript 简介');
      expect(mockAuditService.log).toHaveBeenCalledWith(
        'CHAPTER_CREATE',
        expect.objectContaining({
          chapterId: 'chapter-123',
          courseId: 'course-123'
        })
      );
    });

    it('应该验证章节数据', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: testInstructor },
        error: null
      });
      
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: testCourse,
              error: null
            })
          })
        })
      } as any);
      
      const response = await request(app)
        .post('/api/courses/course-123/chapters')
        .set('Authorization', generateToken(testInstructor))
        .send({
          title: '', // 空标题
          description: 'a'.repeat(2001), // 描述过长
          order_index: -1, // 无效顺序
          duration: -100 // 无效时长
        });
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('其他讲师不应该能够为别人的课程创建章节', async () => {
      const otherInstructor = {
        ...testInstructor,
        id: 'other-instructor-123'
      };
      
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: otherInstructor },
        error: null
      });
      
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: testCourse,
              error: null
            })
          })
        })
      } as any);
      
      const response = await request(app)
        .post('/api/courses/course-123/chapters')
        .set('Authorization', generateToken(otherInstructor))
        .send({
          title: '测试章节',
          description: '测试描述'
        });
      
      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('应该自动设置章节顺序', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: testInstructor },
        error: null
      });
      
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: testCourse,
              error: null
            })
          })
        })
      } as any);
      
      // 查询现有章节数量
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [testChapter], // 已有1个章节
            error: null
          })
        })
      } as any);
      
      mockSupabase.from.mockReturnValueOnce({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue({
            data: [{
              ...testChapter,
              id: 'chapter-124',
              order_index: 2 // 自动设置为2
            }],
            error: null
          })
        })
      } as any);
      
      const response = await request(app)
        .post('/api/courses/course-123/chapters')
        .set('Authorization', generateToken(testInstructor))
        .send({
          title: '第二章',
          description: '第二章内容'
          // 不指定 order_index
        });
      
      expect(response.status).toBe(201);
      expect(response.body.data.chapter.order_index).toBe(2);
    });
  });

  /**
   * 更新章节测试
   */
  describe('PUT /api/courses/:courseId/chapters/:id', () => {
    it('讲师应该能够更新自己课程的章节', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: testInstructor },
        error: null
      });
      
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  ...testChapter,
                  course: testCourse
                },
                error: null
              })
            })
          })
        })
      } as any);
      
      mockSupabase.from.mockReturnValueOnce({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockResolvedValue({
              data: [{
                ...testChapter,
                title: '更新的章节标题'
              }],
              error: null
            })
          })
        })
      } as any);
      
      const response = await request(app)
        .put('/api/courses/course-123/chapters/chapter-123')
        .set('Authorization', generateToken(testInstructor))
        .send({
          title: '更新的章节标题',
          description: '更新的章节描述'
        });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.chapter.title).toBe('更新的章节标题');
    });

    it('应该清除相关缓存', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: testInstructor },
        error: null
      });
      
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  ...testChapter,
                  course: testCourse
                },
                error: null
              })
            })
          })
        })
      } as any);
      
      mockSupabase.from.mockReturnValueOnce({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockResolvedValue({
              data: [testChapter],
              error: null
            })
          })
        })
      } as any);
      
      await request(app)
        .put('/api/courses/course-123/chapters/chapter-123')
        .set('Authorization', generateToken(testInstructor))
        .send({ title: '更新标题' });
      
      expect(mockCacheService.del).toHaveBeenCalledWith(
        expect.stringContaining('chapters:course-123')
      );
      expect(mockCacheService.del).toHaveBeenCalledWith(
        expect.stringContaining('chapter:chapter-123')
      );
    });
  });

  /**
   * 删除章节测试
   */
  describe('DELETE /api/courses/:courseId/chapters/:id', () => {
    it('讲师应该能够删除自己课程的章节', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: testInstructor },
        error: null
      });
      
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  ...testChapter,
                  course: testCourse
                },
                error: null
              })
            })
          })
        })
      } as any);
      
      mockSupabase.from.mockReturnValueOnce({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [testChapter],
            error: null
          })
        })
      } as any);
      
      const response = await request(app)
        .delete('/api/courses/course-123/chapters/chapter-123')
        .set('Authorization', generateToken(testInstructor));
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(mockAuditService.log).toHaveBeenCalledWith(
        'CHAPTER_DELETE',
        expect.objectContaining({
          chapterId: 'chapter-123'
        })
      );
    });

    it('应该重新排序剩余章节', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: testInstructor },
        error: null
      });
      
      const chapterToDelete = { ...testChapter, order_index: 2 };
      
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  ...chapterToDelete,
                  course: testCourse
                },
                error: null
              })
            })
          })
        })
      } as any);
      
      mockSupabase.from.mockReturnValueOnce({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [chapterToDelete],
            error: null
          })
        })
      } as any);
      
      // 更新后续章节的顺序
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            gt: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: [
                  { id: 'chapter-124', order_index: 3 },
                  { id: 'chapter-125', order_index: 4 }
                ],
                error: null
              })
            })
          })
        })
      } as any);
      
      mockSupabase.from.mockReturnValueOnce({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [],
            error: null
          })
        })
      } as any);
      
      const response = await request(app)
        .delete('/api/courses/course-123/chapters/chapter-123')
        .set('Authorization', generateToken(testInstructor));
      
      expect(response.status).toBe(200);
    });
  });

  /**
   * 视频上传测试
   */
  describe('POST /api/courses/:courseId/chapters/:id/video', () => {
    it('应该能够上传章节视频', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: testInstructor },
        error: null
      });
      
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  ...testChapter,
                  course: testCourse
                },
                error: null
              })
            })
          })
        })
      } as any);
      
      // Mock Supabase Storage
      mockSupabase.storage = {
        from: jest.fn().mockReturnValue({
          upload: jest.fn().mockResolvedValue({
            data: {
              path: 'videos/course-123/chapter-123/video.mp4'
            },
            error: null
          }),
          getPublicUrl: jest.fn().mockReturnValue({
            data: {
              publicUrl: 'https://example.com/video.mp4'
            }
          })
        })
      } as any;
      
      mockSupabase.from.mockReturnValueOnce({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockResolvedValue({
              data: [{
                ...testChapter,
                video_url: 'https://example.com/video.mp4'
              }],
              error: null
            })
          })
        })
      } as any);
      
      const response = await request(app)
        .post('/api/courses/course-123/chapters/chapter-123/video')
        .set('Authorization', generateToken(testInstructor))
        .attach('video', Buffer.from('fake video content'), 'test-video.mp4');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.chapter.video_url).toBeDefined();
    });

    it('应该验证视频文件类型', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: testInstructor },
        error: null
      });
      
      const response = await request(app)
        .post('/api/courses/course-123/chapters/chapter-123/video')
        .set('Authorization', generateToken(testInstructor))
        .attach('video', Buffer.from('fake content'), 'test-file.txt');
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid file type');
    });

    it('应该验证视频文件大小', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: testInstructor },
        error: null
      });
      
      // Mock 大文件
      const largeBuffer = Buffer.alloc(200 * 1024 * 1024); // 200MB
      
      const response = await request(app)
        .post('/api/courses/course-123/chapters/chapter-123/video')
        .set('Authorization', generateToken(testInstructor))
        .attach('video', largeBuffer, 'large-video.mp4');
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('File too large');
    });
  });

  /**
   * 学习进度更新测试
   */
  describe('PUT /api/courses/:courseId/chapters/:id/progress', () => {
    it('学生应该能够更新学习进度', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: testStudent },
        error: null
      });
      
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  ...testChapter,
                  course: testCourse
                },
                error: null
              })
            })
          })
        })
      } as any);
      
      // 检查是否已报名
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { id: 'enrollment-123' },
                error: null
              })
            })
          })
        })
      } as any);
      
      mockSupabase.from.mockReturnValueOnce({
        upsert: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue({
            data: [{
              ...testProgress,
              progress: 85.0,
              last_position: 1530
            }],
            error: null
          })
        })
      } as any);
      
      const response = await request(app)
        .put('/api/courses/course-123/chapters/chapter-123/progress')
        .set('Authorization', generateToken(testStudent))
        .send({
          progress: 85.0,
          watch_time: 1530,
          last_position: 1530
        });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.progress.progress).toBe(85.0);
      expect(mockAnalyticsService.track).toHaveBeenCalledWith(
        'chapter_progress_update',
        expect.objectContaining({
          chapter_id: 'chapter-123',
          progress: 85.0
        })
      );
    });

    it('应该验证进度数据', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: testStudent },
        error: null
      });
      
      const response = await request(app)
        .put('/api/courses/course-123/chapters/chapter-123/progress')
        .set('Authorization', generateToken(testStudent))
        .send({
          progress: 150, // 超出范围
          watch_time: -100, // 负数
          last_position: 'invalid' // 无效类型
        });
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('未报名学生不应该能够更新进度', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: testStudent },
        error: null
      });
      
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  ...testChapter,
                  course: testCourse
                },
                error: null
              })
            })
          })
        })
      } as any);
      
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { code: 'PGRST116' }
              })
            })
          })
        })
      } as any);
      
      const response = await request(app)
        .put('/api/courses/course-123/chapters/chapter-123/progress')
        .set('Authorization', generateToken(testStudent))
        .send({ progress: 50 });
      
      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  /**
   * 学习笔记测试
   */
  describe('POST /api/courses/:courseId/chapters/:id/notes', () => {
    it('学生应该能够添加学习笔记', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: testStudent },
        error: null
      });
      
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  ...testChapter,
                  course: testCourse
                },
                error: null
              })
            })
          })
        })
      } as any);
      
      mockSupabase.from.mockReturnValueOnce({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue({
            data: [testNote],
            error: null
          })
        })
      } as any);
      
      const response = await request(app)
        .post('/api/courses/course-123/chapters/chapter-123/notes')
        .set('Authorization', generateToken(testStudent))
        .send({
          content: '这里是重要的知识点',
          timestamp: 900
        });
      
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.note.content).toBe('这里是重要的知识点');
    });

    it('应该验证笔记内容', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: testStudent },
        error: null
      });
      
      const response = await request(app)
        .post('/api/courses/course-123/chapters/chapter-123/notes')
        .set('Authorization', generateToken(testStudent))
        .send({
          content: '', // 空内容
          timestamp: -1 // 无效时间戳
        });
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  /**
   * 获取学习笔记测试
   */
  describe('GET /api/courses/:courseId/chapters/:id/notes', () => {
    it('学生应该能够获取自己的笔记', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: testStudent },
        error: null
      });
      
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: [testNote],
                error: null
              })
            })
          })
        })
      } as any);
      
      const response = await request(app)
        .get('/api/courses/course-123/chapters/chapter-123/notes')
        .set('Authorization', generateToken(testStudent));
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.notes).toHaveLength(1);
    });
  });

  /**
   * 错误处理测试
   */
  describe('错误处理', () => {
    it('应该处理数据库连接错误', async () => {
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Database connection failed');
      });
      
      const response = await request(app)
        .get('/api/courses/course-123/chapters');
      
      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('应该处理无效的章节ID', async () => {
      const response = await request(app)
        .get('/api/courses/course-123/chapters/invalid-id');
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('应该处理视频上传错误', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: testInstructor },
        error: null
      });
      
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  ...testChapter,
                  course: testCourse
                },
                error: null
              })
            })
          })
        })
      } as any);
      
      mockSupabase.storage = {
        from: jest.fn().mockReturnValue({
          upload: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Upload failed' }
          })
        })
      } as any;
      
      const response = await request(app)
        .post('/api/courses/course-123/chapters/chapter-123/video')
        .set('Authorization', generateToken(testInstructor))
        .attach('video', Buffer.from('fake video'), 'test.mp4');
      
      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

  /**
   * 性能测试
   */
  describe('性能测试', () => {
    it('章节列表查询应该在合理时间内完成', async () => {
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: testCourse,
              error: null
            })
          })
        })
      } as any);
      
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: [testChapter],
              error: null
            })
          })
        })
      } as any);
      
      const startTime = Date.now();
      
      await request(app)
        .get('/api/courses/course-123/chapters');
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(1000);
    });

    it('应该正确处理并发进度更新', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: testStudent },
        error: null
      });
      
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  ...testChapter,
                  course: testCourse
                },
                error: null
              })
            })
          })
        }),
        upsert: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue({
            data: [testProgress],
            error: null
          })
        })
      } as any);
      
      const promises = Array.from({ length: 3 }, (_, i) =>
        request(app)
          .put('/api/courses/course-123/chapters/chapter-123/progress')
          .set('Authorization', generateToken(testStudent))
          .send({ progress: 50 + i * 10 })
      );
      
      const responses = await Promise.all(promises);
      
      expect(responses.every(r => r.status === 200 || r.status === 403)).toBe(true);
    });
  });
});