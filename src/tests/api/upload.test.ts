/**
 * 文件上传API集成测试
 * 测试文件上传、下载、管理等功能
 * 
 * @author SOLO Coding
 * @version 1.0.0
 */

import { describe, it, expect, beforeEach, afterEach, jest, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { app } from '../../app';
import { supabase } from '../../utils/supabase';
import { envConfig } from '../../config/envConfig';
import { cacheService } from '../../services/cacheService';
import { auditService } from '../../services/auditService';
import { analyticsService } from '../../services/analyticsService';
import { notificationService } from '../../services/notificationService';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';

// 模拟环境配置
jest.mock('../../config/envConfig', () => ({
  envConfig: {
    jwt: {
      secret: 'test-jwt-secret',
      expiresIn: '24h'
    },
    upload: {
      maxFileSize: 10 * 1024 * 1024, // 10MB
      allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'application/pdf'],
      uploadPath: './uploads',
      enableVirusScan: true,
      enableCompression: true,
      thumbnailSizes: [150, 300, 600]
    },
    storage: {
      provider: 'supabase',
      bucket: 'uploads',
      publicUrl: 'https://example.supabase.co/storage/v1/object/public'
    }
  }
}));

// 模拟Supabase客户端
const mockSupabase = {
  storage: {
    from: jest.fn(() => ({
      upload: jest.fn(),
      download: jest.fn(),
      remove: jest.fn(),
      list: jest.fn(),
      getPublicUrl: jest.fn(),
      createSignedUrl: jest.fn(),
      createSignedUrls: jest.fn(),
      update: jest.fn()
    }))
  },
  from: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    single: jest.fn(),
    maybeSingle: jest.fn()
  }))
};

jest.mock('../../utils/supabase', () => ({
  supabase: mockSupabase
}));

// 模拟缓存服务
const mockCacheService = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  clear: jest.fn(),
  exists: jest.fn(),
  expire: jest.fn()
};

jest.mock('../../services/cacheService', () => ({
  cacheService: mockCacheService
}));

// 模拟审计服务
const mockAuditService = {
  logFileUpload: jest.fn(),
  logFileDownload: jest.fn(),
  logFileDelete: jest.fn(),
  logSecurityEvent: jest.fn()
};

jest.mock('../../services/auditService', () => ({
  auditService: mockAuditService
}));

// 模拟分析服务
const mockAnalyticsService = {
  trackEvent: jest.fn(),
  trackFileUpload: jest.fn(),
  trackFileDownload: jest.fn(),
  getUploadStats: jest.fn()
};

jest.mock('../../services/analyticsService', () => ({
  analyticsService: mockAnalyticsService
}));

// 模拟通知服务
const mockNotificationService = {
  sendNotification: jest.fn(),
  sendUploadNotification: jest.fn()
};

jest.mock('../../services/notificationService', () => ({
  notificationService: mockNotificationService
}));

// 模拟JWT
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(),
  verify: jest.fn(),
  decode: jest.fn()
}));

// 模拟文件系统
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    unlink: jest.fn(),
    mkdir: jest.fn(),
    stat: jest.fn(),
    access: jest.fn()
  },
  createReadStream: jest.fn(),
  createWriteStream: jest.fn(),
  existsSync: jest.fn(),
  mkdirSync: jest.fn()
}));

// 模拟路径模块
jest.mock('path', () => ({
  join: jest.fn((...args) => args.join('/')),
  extname: jest.fn((filename) => {
    const parts = filename.split('.');
    return parts.length > 1 ? '.' + parts[parts.length - 1] : '';
  }),
  basename: jest.fn((filename) => filename.split('/').pop()),
  dirname: jest.fn((filepath) => filepath.split('/').slice(0, -1).join('/'))
}));

describe('文件上传API集成测试', () => {
  const testUser = {
    id: 'user-123',
    email: 'user@example.com',
    username: 'testuser',
    role: 'student',
    permissions: ['upload:create', 'upload:read']
  };
  
  const testInstructor = {
    id: 'instructor-123',
    email: 'instructor@example.com',
    username: 'instructor',
    role: 'instructor',
    permissions: ['upload:*', 'course:manage']
  };
  
  const testAdmin = {
    id: 'admin-123',
    email: 'admin@example.com',
    username: 'admin',
    role: 'admin',
    permissions: ['upload:*', 'admin:*']
  };
  
  const testFile = {
    id: 'file-123',
    filename: 'test-image.jpg',
    originalName: 'my-image.jpg',
    mimeType: 'image/jpeg',
    size: 1024000, // 1MB
    path: 'uploads/2024/01/file-123.jpg',
    url: 'https://example.supabase.co/storage/v1/object/public/uploads/file-123.jpg',
    userId: 'user-123',
    courseId: 'course-123',
    lessonId: null,
    type: 'course_material',
    status: 'uploaded',
    metadata: {
      width: 1920,
      height: 1080,
      thumbnails: {
        small: 'uploads/thumbnails/file-123-150.jpg',
        medium: 'uploads/thumbnails/file-123-300.jpg',
        large: 'uploads/thumbnails/file-123-600.jpg'
      }
    },
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z'
  };
  
  let userToken: string;
  let instructorToken: string;
  let adminToken: string;
  
  beforeAll(async () => {
    // 生成测试用的JWT令牌
    userToken = 'mock-user-token';
    instructorToken = 'mock-instructor-token';
    adminToken = 'mock-admin-token';
  });
  
  afterAll(async () => {
    // 清理测试环境
  });
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // 设置默认模拟返回值
    mockSupabase.from().single.mockResolvedValue({ data: null, error: null });
    mockSupabase.from().maybeSingle.mockResolvedValue({ data: null, error: null });
    mockSupabase.storage.from().upload.mockResolvedValue({ data: { path: 'test-path' }, error: null });
    mockSupabase.storage.from().getPublicUrl.mockReturnValue({ data: { publicUrl: 'test-url' } });
    mockCacheService.get.mockResolvedValue(null);
    mockCacheService.set.mockResolvedValue(true);
    
    // 模拟JWT验证
    (jwt.verify as jest.Mock).mockImplementation((token) => {
      if (token === userToken) {
        return testUser;
      } else if (token === instructorToken) {
        return testInstructor;
      } else if (token === adminToken) {
        return testAdmin;
      }
      throw new Error('Invalid token');
    });
    
    // 模拟文件系统
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.promises.stat as jest.Mock).mockResolvedValue({ size: 1024000 });
  });
  
  afterEach(() => {
    jest.resetAllMocks();
  });

  /**
   * 文件上传测试
   */
  describe('POST /api/upload', () => {
    it('应该能上传图片文件', async () => {
      const uploadResult = {
        file: testFile,
        thumbnails: [
          { size: 150, url: 'thumbnail-150.jpg' },
          { size: 300, url: 'thumbnail-300.jpg' },
          { size: 600, url: 'thumbnail-600.jpg' }
        ]
      };
      
      // 模拟文件上传成功
      mockSupabase.from().insert.mockResolvedValue({ data: [testFile], error: null });
      
      const response = await request(app)
        .post('/api/upload')
        .set('Authorization', `Bearer ${userToken}`)
        .attach('file', Buffer.from('fake image data'), {
          filename: 'test-image.jpg',
          contentType: 'image/jpeg'
        })
        .field('type', 'course_material')
        .field('courseId', 'course-123')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('文件上传成功');
      expect(response.body.data.file.filename).toBe('test-image.jpg');
      
      // 验证记录了上传事件
      expect(mockAuditService.logFileUpload).toHaveBeenCalledWith({
        userId: testUser.id,
        fileId: testFile.id,
        filename: testFile.filename,
        size: testFile.size,
        type: testFile.type
      });
      
      // 验证记录了分析事件
      expect(mockAnalyticsService.trackFileUpload).toHaveBeenCalledWith({
        userId: testUser.id,
        fileType: 'image/jpeg',
        fileSize: testFile.size,
        uploadType: 'course_material'
      });
    });

    it('应该能上传视频文件', async () => {
      const videoFile = {
        ...testFile,
        filename: 'test-video.mp4',
        originalName: 'my-video.mp4',
        mimeType: 'video/mp4',
        size: 5 * 1024 * 1024, // 5MB
        type: 'lesson_video',
        metadata: {
          duration: 300, // 5分钟
          resolution: '1920x1080',
          bitrate: 2000
        }
      };
      
      mockSupabase.from().insert.mockResolvedValue({ data: [videoFile], error: null });
      
      const response = await request(app)
        .post('/api/upload')
        .set('Authorization', `Bearer ${instructorToken}`)
        .attach('file', Buffer.from('fake video data'), {
          filename: 'test-video.mp4',
          contentType: 'video/mp4'
        })
        .field('type', 'lesson_video')
        .field('lessonId', 'lesson-123')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.file.mimeType).toBe('video/mp4');
      expect(response.body.data.file.type).toBe('lesson_video');
    });

    it('应该能上传PDF文档', async () => {
      const pdfFile = {
        ...testFile,
        filename: 'test-document.pdf',
        originalName: 'my-document.pdf',
        mimeType: 'application/pdf',
        size: 2 * 1024 * 1024, // 2MB
        type: 'course_document',
        metadata: {
          pages: 10,
          title: '测试文档',
          author: '作者'
        }
      };
      
      mockSupabase.from().insert.mockResolvedValue({ data: [pdfFile], error: null });
      
      const response = await request(app)
        .post('/api/upload')
        .set('Authorization', `Bearer ${instructorToken}`)
        .attach('file', Buffer.from('fake pdf data'), {
          filename: 'test-document.pdf',
          contentType: 'application/pdf'
        })
        .field('type', 'course_document')
        .field('courseId', 'course-123')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.file.mimeType).toBe('application/pdf');
      expect(response.body.data.file.type).toBe('course_document');
    });

    it('应该拒绝不支持的文件类型', async () => {
      const response = await request(app)
        .post('/api/upload')
        .set('Authorization', `Bearer ${userToken}`)
        .attach('file', Buffer.from('fake data'), {
          filename: 'test.exe',
          contentType: 'application/x-executable'
        })
        .field('type', 'course_material')
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('不支持的文件类型');
    });

    it('应该拒绝超过大小限制的文件', async () => {
      const response = await request(app)
        .post('/api/upload')
        .set('Authorization', `Bearer ${userToken}`)
        .attach('file', Buffer.alloc(15 * 1024 * 1024), { // 15MB
          filename: 'large-file.jpg',
          contentType: 'image/jpeg'
        })
        .field('type', 'course_material')
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('文件大小超过限制');
    });

    it('应该验证必要的字段', async () => {
      const response = await request(app)
        .post('/api/upload')
        .set('Authorization', `Bearer ${userToken}`)
        .attach('file', Buffer.from('fake data'), {
          filename: 'test.jpg',
          contentType: 'image/jpeg'
        })
        // 缺少type字段
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('验证失败');
      expect(response.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'type' })
        ])
      );
    });

    it('应该拒绝未认证的请求', async () => {
      const response = await request(app)
        .post('/api/upload')
        .attach('file', Buffer.from('fake data'), {
          filename: 'test.jpg',
          contentType: 'image/jpeg'
        })
        .expect(401);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('缺少访问令牌');
    });

    it('应该处理病毒扫描', async () => {
      // 模拟病毒扫描发现威胁
      const virusFile = {
        ...testFile,
        status: 'virus_detected',
        metadata: {
          virusScan: {
            status: 'threat_detected',
            threat: 'Test.Virus',
            scannedAt: new Date().toISOString()
          }
        }
      };
      
      mockSupabase.from().insert.mockResolvedValue({ data: [virusFile], error: null });
      
      const response = await request(app)
        .post('/api/upload')
        .set('Authorization', `Bearer ${userToken}`)
        .attach('file', Buffer.from('EICAR-STANDARD-ANTIVIRUS-TEST-FILE'), {
          filename: 'virus-test.txt',
          contentType: 'text/plain'
        })
        .field('type', 'course_material')
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('文件包含恶意内容');
      
      // 验证记录了安全事件
      expect(mockAuditService.logSecurityEvent).toHaveBeenCalledWith({
        userId: testUser.id,
        event: 'virus_detected',
        details: expect.objectContaining({
          filename: 'virus-test.txt',
          threat: 'Test.Virus'
        })
      });
    });
  });

  /**
   * 文件列表查询测试
   */
  describe('GET /api/upload/files', () => {
    it('用户应该能查看自己的文件', async () => {
      const userFiles = [
        testFile,
        {
          ...testFile,
          id: 'file-456',
          filename: 'another-file.pdf',
          mimeType: 'application/pdf'
        }
      ];
      
      mockSupabase.from().mockResolvedValue({ data: userFiles, error: null });
      
      const response = await request(app)
        .get('/api/upload/files')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.files).toHaveLength(2);
      expect(response.body.data.files[0].id).toBe('file-123');
    });

    it('应该支持分页', async () => {
      const response = await request(app)
        .get('/api/upload/files?page=2&limit=10')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);
      
      expect(mockSupabase.from().range).toHaveBeenCalledWith(10, 19);
    });

    it('应该支持文件类型筛选', async () => {
      const response = await request(app)
        .get('/api/upload/files?type=course_material')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);
      
      expect(mockSupabase.from().eq).toHaveBeenCalledWith('type', 'course_material');
    });

    it('应该支持MIME类型筛选', async () => {
      const response = await request(app)
        .get('/api/upload/files?mimeType=image/jpeg')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);
      
      expect(mockSupabase.from().eq).toHaveBeenCalledWith('mimeType', 'image/jpeg');
    });

    it('应该支持文件名搜索', async () => {
      const response = await request(app)
        .get('/api/upload/files?search=test')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);
      
      expect(mockSupabase.from().ilike).toHaveBeenCalledWith('filename', '%test%');
    });

    it('应该支持排序', async () => {
      const response = await request(app)
        .get('/api/upload/files?sortBy=createdAt&sortOrder=desc')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);
      
      expect(mockSupabase.from().order).toHaveBeenCalledWith('createdAt', { ascending: false });
    });

    it('管理员应该能查看所有文件', async () => {
      const response = await request(app)
        .get('/api/upload/files?all=true')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      
      // 管理员查询时不应该添加用户ID筛选
      expect(mockSupabase.from().eq).not.toHaveBeenCalledWith('userId', expect.any(String));
    });
  });

  /**
   * 文件详情查询测试
   */
  describe('GET /api/upload/files/:fileId', () => {
    it('用户应该能查看自己的文件详情', async () => {
      mockSupabase.from().single.mockResolvedValue({ data: testFile, error: null });
      
      const response = await request(app)
        .get(`/api/upload/files/${testFile.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.file).toEqual(testFile);
      
      // 验证查询了正确的文件
      expect(mockSupabase.from().eq).toHaveBeenCalledWith('id', testFile.id);
      expect(mockSupabase.from().eq).toHaveBeenCalledWith('userId', testUser.id);
    });

    it('应该拒绝查看其他用户的文件', async () => {
      const otherUserFile = {
        ...testFile,
        userId: 'other-user-123'
      };
      
      mockSupabase.from().single.mockResolvedValue({ data: null, error: null });
      
      const response = await request(app)
        .get(`/api/upload/files/${testFile.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('文件不存在');
    });

    it('管理员应该能查看任何文件', async () => {
      mockSupabase.from().single.mockResolvedValue({ data: testFile, error: null });
      
      const response = await request(app)
        .get(`/api/upload/files/${testFile.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      
      // 管理员查询时不应该添加用户ID筛选
      expect(mockSupabase.from().eq).not.toHaveBeenCalledWith('userId', expect.any(String));
    });

    it('应该处理不存在的文件', async () => {
      mockSupabase.from().single.mockResolvedValue({ data: null, error: null });
      
      const response = await request(app)
        .get('/api/upload/files/nonexistent-file')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('文件不存在');
    });
  });

  /**
   * 文件下载测试
   */
  describe('GET /api/upload/files/:fileId/download', () => {
    it('应该能下载文件', async () => {
      mockSupabase.from().single.mockResolvedValue({ data: testFile, error: null });
      mockSupabase.storage.from().createSignedUrl.mockResolvedValue({
        data: { signedUrl: 'https://example.com/signed-url' },
        error: null
      });
      
      const response = await request(app)
        .get(`/api/upload/files/${testFile.id}/download`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.downloadUrl).toBe('https://example.com/signed-url');
      
      // 验证记录了下载事件
      expect(mockAuditService.logFileDownload).toHaveBeenCalledWith({
        userId: testUser.id,
        fileId: testFile.id,
        filename: testFile.filename
      });
      
      // 验证记录了分析事件
      expect(mockAnalyticsService.trackFileDownload).toHaveBeenCalledWith({
        userId: testUser.id,
        fileId: testFile.id,
        fileType: testFile.mimeType
      });
    });

    it('应该支持缩略图下载', async () => {
      const response = await request(app)
        .get(`/api/upload/files/${testFile.id}/download?thumbnail=medium`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);
      
      expect(mockSupabase.storage.from().createSignedUrl).toHaveBeenCalledWith(
        testFile.metadata.thumbnails.medium,
        expect.any(Number)
      );
    });

    it('应该设置下载链接过期时间', async () => {
      const response = await request(app)
        .get(`/api/upload/files/${testFile.id}/download?expiresIn=3600`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);
      
      expect(mockSupabase.storage.from().createSignedUrl).toHaveBeenCalledWith(
        testFile.path,
        3600
      );
    });

    it('应该拒绝下载其他用户的文件', async () => {
      mockSupabase.from().single.mockResolvedValue({ data: null, error: null });
      
      const response = await request(app)
        .get(`/api/upload/files/${testFile.id}/download`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('文件不存在');
    });
  });

  /**
   * 文件删除测试
   */
  describe('DELETE /api/upload/files/:fileId', () => {
    it('用户应该能删除自己的文件', async () => {
      mockSupabase.from().single.mockResolvedValue({ data: testFile, error: null });
      mockSupabase.from().delete.mockResolvedValue({ data: [testFile], error: null });
      mockSupabase.storage.from().remove.mockResolvedValue({ data: [], error: null });
      
      const response = await request(app)
        .delete(`/api/upload/files/${testFile.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('文件删除成功');
      
      // 验证删除了数据库记录
      expect(mockSupabase.from().delete).toHaveBeenCalled();
      expect(mockSupabase.from().eq).toHaveBeenCalledWith('id', testFile.id);
      
      // 验证删除了存储文件
      expect(mockSupabase.storage.from().remove).toHaveBeenCalledWith([testFile.path]);
      
      // 验证记录了删除事件
      expect(mockAuditService.logFileDelete).toHaveBeenCalledWith({
        userId: testUser.id,
        fileId: testFile.id,
        filename: testFile.filename
      });
    });

    it('应该拒绝删除其他用户的文件', async () => {
      mockSupabase.from().single.mockResolvedValue({ data: null, error: null });
      
      const response = await request(app)
        .delete(`/api/upload/files/${testFile.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('文件不存在');
    });

    it('管理员应该能删除任何文件', async () => {
      mockSupabase.from().single.mockResolvedValue({ data: testFile, error: null });
      mockSupabase.from().delete.mockResolvedValue({ data: [testFile], error: null });
      mockSupabase.storage.from().remove.mockResolvedValue({ data: [], error: null });
      
      const response = await request(app)
        .delete(`/api/upload/files/${testFile.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      
      // 管理员删除时不应该添加用户ID筛选
      expect(mockSupabase.from().eq).not.toHaveBeenCalledWith('userId', expect.any(String));
    });

    it('应该处理存储删除失败', async () => {
      mockSupabase.from().single.mockResolvedValue({ data: testFile, error: null });
      mockSupabase.storage.from().remove.mockResolvedValue({
        data: null,
        error: { message: 'Storage error' }
      });
      
      const response = await request(app)
        .delete(`/api/upload/files/${testFile.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(500);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('文件删除失败');
    });
  });

  /**
   * 文件更新测试
   */
  describe('PUT /api/upload/files/:fileId', () => {
    it('应该能更新文件信息', async () => {
      const updateData = {
        filename: 'updated-filename.jpg',
        type: 'profile_avatar',
        metadata: {
          description: '更新的描述',
          tags: ['头像', '个人资料']
        }
      };
      
      const updatedFile = {
        ...testFile,
        ...updateData,
        updatedAt: new Date().toISOString()
      };
      
      mockSupabase.from().single.mockResolvedValue({ data: testFile, error: null });
      mockSupabase.from().update.mockResolvedValue({ data: [updatedFile], error: null });
      
      const response = await request(app)
        .put(`/api/upload/files/${testFile.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(updateData)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('文件信息更新成功');
      expect(response.body.data.file.filename).toBe('updated-filename.jpg');
      
      // 验证更新了正确的字段
      expect(mockSupabase.from().update).toHaveBeenCalledWith(
        expect.objectContaining(updateData)
      );
    });

    it('应该验证更新数据', async () => {
      const invalidData = {
        filename: '', // 空文件名
        type: 'invalid_type' // 无效类型
      };
      
      const response = await request(app)
        .put(`/api/upload/files/${testFile.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(invalidData)
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('验证失败');
    });

    it('应该拒绝更新其他用户的文件', async () => {
      mockSupabase.from().single.mockResolvedValue({ data: null, error: null });
      
      const response = await request(app)
        .put(`/api/upload/files/${testFile.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ filename: 'new-name.jpg' })
        .expect(404);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('文件不存在');
    });
  });

  /**
   * 批量操作测试
   */
  describe('POST /api/upload/batch', () => {
    it('应该能批量删除文件', async () => {
      const fileIds = ['file-123', 'file-456', 'file-789'];
      const files = fileIds.map(id => ({ ...testFile, id }));
      
      mockSupabase.from().mockResolvedValue({ data: files, error: null });
      mockSupabase.from().delete.mockResolvedValue({ data: files, error: null });
      mockSupabase.storage.from().remove.mockResolvedValue({ data: [], error: null });
      
      const response = await request(app)
        .post('/api/upload/batch')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          action: 'delete',
          fileIds: fileIds
        })
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('批量删除成功');
      expect(response.body.data.deleted).toBe(3);
      
      // 验证删除了所有文件
      expect(mockSupabase.storage.from().remove).toHaveBeenCalledWith(
        files.map(f => f.path)
      );
    });

    it('应该能批量更新文件类型', async () => {
      const fileIds = ['file-123', 'file-456'];
      const updateData = { type: 'archived' };
      
      const response = await request(app)
        .post('/api/upload/batch')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          action: 'update',
          fileIds: fileIds,
          data: updateData
        })
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('批量更新成功');
      
      // 验证更新了所有文件
      expect(mockSupabase.from().update).toHaveBeenCalledWith(updateData);
      expect(mockSupabase.from().in).toHaveBeenCalledWith('id', fileIds);
    });

    it('应该验证批量操作参数', async () => {
      const response = await request(app)
        .post('/api/upload/batch')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          action: 'invalid_action',
          fileIds: []
        })
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('验证失败');
    });

    it('应该限制批量操作数量', async () => {
      const tooManyIds = Array.from({ length: 101 }, (_, i) => `file-${i}`);
      
      const response = await request(app)
        .post('/api/upload/batch')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          action: 'delete',
          fileIds: tooManyIds
        })
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('批量操作数量超过限制');
    });
  });

  /**
   * 上传统计测试
   */
  describe('GET /api/upload/stats', () => {
    it('用户应该能查看自己的上传统计', async () => {
      const userStats = {
        totalFiles: 25,
        totalSize: 50 * 1024 * 1024, // 50MB
        fileTypes: {
          'image/jpeg': 10,
          'image/png': 8,
          'application/pdf': 5,
          'video/mp4': 2
        },
        uploadsByMonth: [
          { month: '2024-01', count: 15, size: 30 * 1024 * 1024 },
          { month: '2024-02', count: 10, size: 20 * 1024 * 1024 }
        ],
        storageUsed: 45 * 1024 * 1024, // 45MB
        storageLimit: 100 * 1024 * 1024 // 100MB
      };
      
      mockAnalyticsService.getUploadStats.mockResolvedValue(userStats);
      
      const response = await request(app)
        .get('/api/upload/stats')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.stats).toEqual(userStats);
      
      // 验证调用了正确的服务方法
      expect(mockAnalyticsService.getUploadStats).toHaveBeenCalledWith(
        testUser.id
      );
    });

    it('管理员应该能查看全局统计', async () => {
      const globalStats = {
        totalUsers: 1000,
        totalFiles: 25000,
        totalSize: 500 * 1024 * 1024 * 1024, // 500GB
        averageFileSize: 20 * 1024 * 1024, // 20MB
        topFileTypes: [
          { type: 'image/jpeg', count: 10000, percentage: 40 },
          { type: 'video/mp4', count: 7500, percentage: 30 },
          { type: 'application/pdf', count: 5000, percentage: 20 }
        ],
        uploadTrends: [
          { date: '2024-01-01', uploads: 100, size: 2 * 1024 * 1024 * 1024 },
          { date: '2024-01-02', uploads: 120, size: 2.4 * 1024 * 1024 * 1024 }
        ]
      };
      
      mockAnalyticsService.getUploadStats.mockResolvedValue(globalStats);
      
      const response = await request(app)
        .get('/api/upload/stats?global=true')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.stats).toEqual(globalStats);
      
      // 验证调用了全局统计
      expect(mockAnalyticsService.getUploadStats).toHaveBeenCalledWith(
        null, // 全局统计
        { global: true }
      );
    });

    it('应该支持时间范围筛选', async () => {
      const response = await request(app)
        .get('/api/upload/stats?startDate=2024-01-01&endDate=2024-01-31')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);
      
      expect(mockAnalyticsService.getUploadStats).toHaveBeenCalledWith(
        testUser.id,
        {
          startDate: '2024-01-01',
          endDate: '2024-01-31'
        }
      );
    });
  });

  /**
   * 性能测试
   */
  describe('性能测试', () => {
    it('文件上传应该在合理时间内完成', async () => {
      const startTime = Date.now();
      
      await request(app)
        .post('/api/upload')
        .set('Authorization', `Bearer ${userToken}`)
        .attach('file', Buffer.from('test data'), {
          filename: 'test.jpg',
          contentType: 'image/jpeg'
        })
        .field('type', 'course_material')
        .expect(200);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(5000); // 应该在5秒内完成
    });

    it('应该能处理并发文件上传', async () => {
      const requests = Array.from({ length: 10 }, (_, i) => 
        request(app)
          .post('/api/upload')
          .set('Authorization', `Bearer ${userToken}`)
          .attach('file', Buffer.from(`test data ${i}`), {
            filename: `test-${i}.jpg`,
            contentType: 'image/jpeg'
          })
          .field('type', 'course_material')
      );
      
      const responses = await Promise.all(requests);
      
      // 所有请求都应该成功
      responses.forEach(response => {
        expect([200, 400]).toContain(response.status); // 200成功或400验证失败
      });
    });

    it('文件列表查询应该快速响应', async () => {
      const startTime = Date.now();
      
      await request(app)
        .get('/api/upload/files')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(1000); // 应该在1秒内完成
    });
  });

  /**
   * 错误处理测试
   */
  describe('错误处理', () => {
    it('应该处理存储服务错误', async () => {
      mockSupabase.storage.from().upload.mockResolvedValue({
        data: null,
        error: { message: 'Storage service error' }
      });
      
      const response = await request(app)
        .post('/api/upload')
        .set('Authorization', `Bearer ${userToken}`)
        .attach('file', Buffer.from('test data'), {
          filename: 'test.jpg',
          contentType: 'image/jpeg'
        })
        .field('type', 'course_material')
        .expect(500);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('文件上传失败');
    });

    it('应该处理数据库错误', async () => {
      mockSupabase.from().insert.mockResolvedValue({
        data: null,
        error: { message: 'Database error' }
      });
      
      const response = await request(app)
        .post('/api/upload')
        .set('Authorization', `Bearer ${userToken}`)
        .attach('file', Buffer.from('test data'), {
          filename: 'test.jpg',
          contentType: 'image/jpeg'
        })
        .field('type', 'course_material')
        .expect(500);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('服务器内部错误');
    });

    it('应该处理缓存服务错误', async () => {
      mockCacheService.set.mockRejectedValue(new Error('Cache error'));
      
      // 即使缓存失败，也应该能正常上传文件
      mockSupabase.from().insert.mockResolvedValue({ data: [testFile], error: null });
      
      const response = await request(app)
        .post('/api/upload')
        .set('Authorization', `Bearer ${userToken}`)
        .attach('file', Buffer.from('test data'), {
          filename: 'test.jpg',
          contentType: 'image/jpeg'
        })
        .field('type', 'course_material')
        .expect(200);
      
      expect(response.body.success).toBe(true);
    });

    it('应该处理无效的文件ID格式', async () => {
      const response = await request(app)
        .get('/api/upload/files/invalid-id-format')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('无效的文件ID格式');
    });

    it('应该处理磁盘空间不足', async () => {
      mockSupabase.storage.from().upload.mockResolvedValue({
        data: null,
        error: { message: 'Insufficient storage space' }
      });
      
      const response = await request(app)
        .post('/api/upload')
        .set('Authorization', `Bearer ${userToken}`)
        .attach('file', Buffer.from('test data'), {
          filename: 'test.jpg',
          contentType: 'image/jpeg'
        })
        .field('type', 'course_material')
        .expect(507);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('存储空间不足');
    });
  });
});