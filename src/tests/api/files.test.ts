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
import { cacheService } from '../../services/cacheService';
import { fileUploadService } from '../../services/fileUploadService';
import { analyticsService } from '../../services/analyticsService';
import { auditService } from '../../services/auditService';
import { notificationService } from '../../services/notificationService';
import jwt from 'jsonwebtoken';
import path from 'path';
import fs from 'fs';

// 模拟依赖服务
jest.mock('../../utils/supabase');
jest.mock('../../services/cacheService');
jest.mock('../../services/fileUploadService');
jest.mock('../../services/analyticsService');
jest.mock('../../services/auditService');
jest.mock('../../services/notificationService');
jest.mock('jsonwebtoken');
jest.mock('fs');

// Mock 类型定义
interface MockSupabaseQuery {
  select: jest.MockedFunction<any>;
  insert: jest.MockedFunction<any>;
  update: jest.MockedFunction<any>;
  delete: jest.MockedFunction<any>;
  upsert: jest.MockedFunction<any>;
  eq: jest.MockedFunction<any>;
  neq: jest.MockedFunction<any>;
  in: jest.MockedFunction<any>;
  gte: jest.MockedFunction<any>;
  lte: jest.MockedFunction<any>;
  like: jest.MockedFunction<any>;
  ilike: jest.MockedFunction<any>;
  order: jest.MockedFunction<any>;
  limit: jest.MockedFunction<any>;
  offset: jest.MockedFunction<any>;
  single: jest.MockedFunction<any>;
  then: jest.MockedFunction<any>;
}

interface MockFileStats {
  size: number;
  isFile: () => boolean;
  isDirectory: () => boolean;
}

const mockSupabase = supabase as jest.Mocked<typeof supabase>;
const mockCacheService = cacheService as jest.Mocked<typeof cacheService>;
const mockFileUploadService = fileUploadService as jest.Mocked<typeof fileUploadService>;
const mockAnalyticsService = analyticsService as jest.Mocked<typeof analyticsService>;
const mockAuditService = auditService as jest.Mocked<typeof auditService>;
const mockNotificationService = notificationService as jest.Mocked<typeof notificationService>;
const mockJwt = jwt as jest.Mocked<typeof jwt>;
const mockFs = fs as jest.Mocked<typeof fs>;

describe('文件上传API集成测试', () => {
  // 测试数据
  const testUser = {
    id: 'user-123',
    email: 'user@example.com',
    username: 'testuser',
    role: 'student'
  };
  
  const testInstructor = {
    id: 'instructor-123',
    email: 'instructor@example.com',
    username: 'instructor',
    role: 'instructor'
  };
  
  const testFile = {
    id: 'file-123',
    filename: 'test-document.pdf',
    originalName: 'JavaScript学习资料.pdf',
    mimeType: 'application/pdf',
    size: 1024000, // 1MB
    path: '/uploads/documents/file-123.pdf',
    url: 'https://storage.example.com/uploads/documents/file-123.pdf',
    uploadedBy: testUser.id,
    uploadedAt: new Date().toISOString(),
    category: 'document',
    isPublic: false,
    downloadCount: 0,
    metadata: {
      pages: 50,
      language: 'zh-CN',
      subject: 'JavaScript'
    },
    tags: ['javascript', 'tutorial', 'pdf'],
    status: 'active',
    virusScanStatus: 'clean',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  const testImage = {
    id: 'image-123',
    filename: 'avatar.jpg',
    originalName: '用户头像.jpg',
    mimeType: 'image/jpeg',
    size: 512000, // 512KB
    path: '/uploads/images/image-123.jpg',
    url: 'https://storage.example.com/uploads/images/image-123.jpg',
    uploadedBy: testUser.id,
    uploadedAt: new Date().toISOString(),
    category: 'avatar',
    isPublic: true,
    downloadCount: 5,
    metadata: {
      width: 800,
      height: 600,
      format: 'JPEG',
      colorSpace: 'RGB'
    },
    thumbnails: {
      small: 'https://storage.example.com/uploads/images/thumbnails/image-123-small.jpg',
      medium: 'https://storage.example.com/uploads/images/thumbnails/image-123-medium.jpg',
      large: 'https://storage.example.com/uploads/images/thumbnails/image-123-large.jpg'
    },
    status: 'active',
    virusScanStatus: 'clean',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  const testVideo = {
    id: 'video-123',
    filename: 'lesson-video.mp4',
    originalName: 'JavaScript基础课程.mp4',
    mimeType: 'video/mp4',
    size: 52428800, // 50MB
    path: '/uploads/videos/video-123.mp4',
    url: 'https://storage.example.com/uploads/videos/video-123.mp4',
    uploadedBy: testInstructor.id,
    uploadedAt: new Date().toISOString(),
    category: 'course_video',
    isPublic: false,
    downloadCount: 0,
    metadata: {
      duration: 1800, // 30分钟
      resolution: '1920x1080',
      bitrate: 2000,
      codec: 'H.264',
      fps: 30
    },
    processingStatus: 'completed',
    transcodeFormats: ['720p', '480p', '360p'],
    subtitles: [
      {
        language: 'zh-CN',
        url: 'https://storage.example.com/uploads/subtitles/video-123-zh.vtt'
      }
    ],
    status: 'active',
    virusScanStatus: 'clean',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  const validToken = 'valid-jwt-token-123';
  const instructorToken = 'instructor-jwt-token-123';
  const invalidToken = 'invalid-jwt-token-123';
  
  beforeAll(async () => {
    // 初始化测试环境
  });
  
  afterAll(async () => {
    // 清理测试环境
  });
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // 设置默认模拟返回值
    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      upsert: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      neq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      like: jest.fn().mockReturnThis(),
      ilike: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: testFile, error: null }),
      then: jest.fn()
    } as MockSupabaseQuery);
    
    mockCacheService.get.mockResolvedValue(null);
    mockCacheService.set.mockResolvedValue(true);
    mockCacheService.del.mockResolvedValue(true);
    
    mockFileUploadService.uploadFile.mockResolvedValue(testFile);
    mockFileUploadService.deleteFile.mockResolvedValue(true);
    mockFileUploadService.getFileInfo.mockResolvedValue(testFile);
    mockFileUploadService.generateThumbnails.mockResolvedValue({
      small: 'thumbnail-small.jpg',
      medium: 'thumbnail-medium.jpg',
      large: 'thumbnail-large.jpg'
    });
    mockFileUploadService.scanForVirus.mockResolvedValue({
      isClean: true,
      scanResult: 'No threats detected'
    });
    
    mockJwt.verify.mockImplementation((token: string) => {
      if (token === validToken) {
        return { userId: testUser.id, role: testUser.role };
      } else if (token === instructorToken) {
        return { userId: testInstructor.id, role: testInstructor.role };
      }
      throw new Error('Invalid token');
    });
    
    mockAnalyticsService.track.mockResolvedValue(undefined);
    mockAuditService.log.mockResolvedValue(undefined);
    mockNotificationService.sendNotification.mockResolvedValue({
      sent: true,
      notificationId: 'notification-123'
    });
    
    mockFs.existsSync.mockReturnValue(true);
    mockFs.statSync.mockReturnValue({
      size: 1024000,
      isFile: () => true,
      isDirectory: () => false
    } as MockFileStats);
  });
  
  afterEach(() => {
    jest.resetAllMocks();
  });

  /**
   * 文件上传测试
   */
  describe('POST /api/files/upload', () => {
    it('应该成功上传文档文件', async () => {
      const response = await request(app)
        .post('/api/files/upload')
        .set('Authorization', `Bearer ${validToken}`)
        .attach('file', Buffer.from('PDF content'), 'test.pdf')
        .field('category', 'document')
        .field('isPublic', 'false')
        .field('tags', 'javascript,tutorial')
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.file.filename).toBe(testFile.filename);
      expect(response.body.data.file.uploadedBy).toBe(testUser.id);
      
      // 验证文件上传服务调用
      expect(mockFileUploadService.uploadFile).toHaveBeenCalledWith(
        expect.objectContaining({
          file: expect.any(Object),
          userId: testUser.id,
          category: 'document',
          isPublic: false,
          tags: ['javascript', 'tutorial']
        })
      );
      
      // 验证病毒扫描
      expect(mockFileUploadService.scanForVirus).toHaveBeenCalled();
      
      // 验证分析事件
      expect(mockAnalyticsService.track).toHaveBeenCalledWith(
        'file.uploaded',
        expect.objectContaining({
          userId: testUser.id,
          fileType: 'application/pdf',
          fileSize: expect.any(Number),
          category: 'document'
        })
      );
    });

    it('应该成功上传图片并生成缩略图', async () => {
      mockFileUploadService.uploadFile.mockResolvedValue(testImage);
      
      const response = await request(app)
        .post('/api/files/upload')
        .set('Authorization', `Bearer ${validToken}`)
        .attach('file', Buffer.from('JPEG content'), 'avatar.jpg')
        .field('category', 'avatar')
        .field('isPublic', 'true')
        .expect(200);
      
      expect(response.body.data.file.category).toBe('avatar');
      expect(response.body.data.file.thumbnails).toBeDefined();
      
      // 验证缩略图生成
      expect(mockFileUploadService.generateThumbnails).toHaveBeenCalledWith(
        expect.objectContaining({
          filePath: testImage.path,
          mimeType: 'image/jpeg'
        })
      );
    });

    it('应该成功上传视频文件', async () => {
      mockFileUploadService.uploadFile.mockResolvedValue(testVideo);
      
      const response = await request(app)
        .post('/api/files/upload')
        .set('Authorization', `Bearer ${instructorToken}`)
        .attach('file', Buffer.from('MP4 content'), 'lesson.mp4')
        .field('category', 'course_video')
        .field('isPublic', 'false')
        .expect(200);
      
      expect(response.body.data.file.category).toBe('course_video');
      expect(response.body.data.file.processingStatus).toBe('completed');
      
      // 验证视频处理
      expect(mockFileUploadService.processVideo).toHaveBeenCalledWith(
        expect.objectContaining({
          filePath: testVideo.path,
          formats: ['720p', '480p', '360p']
        })
      );
    });

    it('应该验证文件类型', async () => {
      const response = await request(app)
        .post('/api/files/upload')
        .set('Authorization', `Bearer ${validToken}`)
        .attach('file', Buffer.from('Executable content'), 'malware.exe')
        .field('category', 'document')
        .expect(400);
      
      expect(response.body.error.code).toBe('INVALID_FILE_TYPE');
    });

    it('应该验证文件大小', async () => {
      const response = await request(app)
        .post('/api/files/upload')
        .set('Authorization', `Bearer ${validToken}`)
        .attach('file', Buffer.alloc(100 * 1024 * 1024), 'large-file.pdf') // 100MB
        .field('category', 'document')
        .expect(400);
      
      expect(response.body.error.code).toBe('FILE_TOO_LARGE');
    });

    it('应该处理病毒检测', async () => {
      mockFileUploadService.scanForVirus.mockResolvedValue({
        isClean: false,
        scanResult: 'Malware detected: Trojan.Generic'
      });
      
      const response = await request(app)
        .post('/api/files/upload')
        .set('Authorization', `Bearer ${validToken}`)
        .attach('file', Buffer.from('Malicious content'), 'virus.pdf')
        .field('category', 'document')
        .expect(400);
      
      expect(response.body.error.code).toBe('VIRUS_DETECTED');
      
      // 验证安全日志
      expect(mockAuditService.log).toHaveBeenCalledWith(
        'security.virus_detected',
        expect.objectContaining({
          userId: testUser.id,
          filename: 'virus.pdf',
          scanResult: 'Malware detected: Trojan.Generic'
        })
      );
    });

    it('应该拒绝未认证的请求', async () => {
      const response = await request(app)
        .post('/api/files/upload')
        .attach('file', Buffer.from('Content'), 'test.pdf')
        .expect(401);
      
      expect(response.body.error.code).toBe('AUTHENTICATION_REQUIRED');
    });

    it('应该限制上传频率', async () => {
      // 模拟频繁上传
      const requests = Array(10).fill(null).map(() => 
        request(app)
          .post('/api/files/upload')
          .set('Authorization', `Bearer ${validToken}`)
          .attach('file', Buffer.from('Content'), 'test.pdf')
          .field('category', 'document')
      );
      
      const responses = await Promise.all(requests);
      
      // 应该有部分请求被限制
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  /**
   * 文件列表查询测试
   */
  describe('GET /api/files', () => {
    it('应该返回用户的文件列表', async () => {
      const files = [testFile, testImage];
      
      mockSupabase.from().select().mockResolvedValue({
        data: files,
        error: null
      });
      
      const response = await request(app)
        .get('/api/files')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.files).toHaveLength(2);
      expect(response.body.data.files[0].uploadedBy).toBe(testUser.id);
      
      // 验证查询条件
      expect(mockSupabase.from().eq).toHaveBeenCalledWith('uploadedBy', testUser.id);
    });

    it('应该支持文件类型筛选', async () => {
      const response = await request(app)
        .get('/api/files')
        .set('Authorization', `Bearer ${validToken}`)
        .query({
          category: 'document',
          mimeType: 'application/pdf'
        })
        .expect(200);
      
      // 验证筛选条件
      expect(mockSupabase.from().eq).toHaveBeenCalledWith('category', 'document');
      expect(mockSupabase.from().eq).toHaveBeenCalledWith('mimeType', 'application/pdf');
    });

    it('应该支持搜索功能', async () => {
      const response = await request(app)
        .get('/api/files')
        .set('Authorization', `Bearer ${validToken}`)
        .query({
          search: 'JavaScript',
          tags: 'tutorial'
        })
        .expect(200);
      
      // 验证搜索条件
      expect(mockSupabase.from().ilike).toHaveBeenCalledWith('originalName', '%JavaScript%');
    });

    it('应该支持分页查询', async () => {
      const response = await request(app)
        .get('/api/files')
        .set('Authorization', `Bearer ${validToken}`)
        .query({
          page: 2,
          limit: 10,
          sortBy: 'uploadedAt',
          sortOrder: 'desc'
        })
        .expect(200);
      
      // 验证分页和排序
      expect(mockSupabase.from().order).toHaveBeenCalledWith('uploadedAt', { ascending: false });
      expect(mockSupabase.from().limit).toHaveBeenCalledWith(10);
      expect(mockSupabase.from().offset).toHaveBeenCalledWith(10);
    });

    it('应该使用缓存', async () => {
      const cacheKey = `user_files:${testUser.id}:page:1:limit:20`;
      const cachedFiles = JSON.stringify([testFile]);
      
      mockCacheService.get.mockResolvedValue(cachedFiles);
      
      const response = await request(app)
        .get('/api/files')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);
      
      expect(response.body.data.files).toHaveLength(1);
      expect(mockCacheService.get).toHaveBeenCalledWith(cacheKey);
      
      // 不应该查询数据库
      expect(mockSupabase.from().select).not.toHaveBeenCalled();
    });
  });

  /**
   * 文件详情查询测试
   */
  describe('GET /api/files/:fileId', () => {
    it('应该返回文件详情', async () => {
      const response = await request(app)
        .get(`/api/files/${testFile.id}`)
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.file.id).toBe(testFile.id);
      expect(response.body.data.file.metadata).toBeDefined();
      
      // 验证服务调用
      expect(mockFileUploadService.getFileInfo).toHaveBeenCalledWith(testFile.id);
    });

    it('应该验证文件访问权限', async () => {
      const privateFile = {
        ...testFile,
        uploadedBy: 'other-user-123',
        isPublic: false
      };
      
      mockSupabase.from().select().single.mockResolvedValue({
        data: privateFile,
        error: null
      });
      
      const response = await request(app)
        .get(`/api/files/${testFile.id}`)
        .set('Authorization', `Bearer ${validToken}`)
        .expect(403);
      
      expect(response.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    it('应该允许访问公开文件', async () => {
      const publicFile = {
        ...testFile,
        uploadedBy: 'other-user-123',
        isPublic: true
      };
      
      mockSupabase.from().select().single.mockResolvedValue({
        data: publicFile,
        error: null
      });
      
      const response = await request(app)
        .get(`/api/files/${testFile.id}`)
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);
      
      expect(response.body.data.file.isPublic).toBe(true);
    });

    it('应该处理文件不存在', async () => {
      mockSupabase.from().select().single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' }
      });
      
      const response = await request(app)
        .get('/api/files/nonexistent-file')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(404);
      
      expect(response.body.error.code).toBe('FILE_NOT_FOUND');
    });
  });

  /**
   * 文件下载测试
   */
  describe('GET /api/files/:fileId/download', () => {
    it('应该成功下载文件', async () => {
      const response = await request(app)
        .get(`/api/files/${testFile.id}/download`)
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);
      
      expect(response.headers['content-type']).toBe('application/pdf');
      expect(response.headers['content-disposition']).toContain('attachment');
      
      // 验证下载计数更新
      expect(mockSupabase.from().update).toHaveBeenCalledWith(
        expect.objectContaining({
          downloadCount: testFile.downloadCount + 1
        })
      );
      
      // 验证分析事件
      expect(mockAnalyticsService.track).toHaveBeenCalledWith(
        'file.downloaded',
        expect.objectContaining({
          userId: testUser.id,
          fileId: testFile.id,
          fileType: testFile.mimeType
        })
      );
    });

    it('应该支持范围请求（断点续传）', async () => {
      const response = await request(app)
        .get(`/api/files/${testFile.id}/download`)
        .set('Authorization', `Bearer ${validToken}`)
        .set('Range', 'bytes=0-1023')
        .expect(206);
      
      expect(response.headers['content-range']).toContain('bytes 0-1023');
      expect(response.headers['accept-ranges']).toBe('bytes');
    });

    it('应该验证下载权限', async () => {
      const privateFile = {
        ...testFile,
        uploadedBy: 'other-user-123',
        isPublic: false
      };
      
      mockSupabase.from().select().single.mockResolvedValue({
        data: privateFile,
        error: null
      });
      
      const response = await request(app)
        .get(`/api/files/${testFile.id}/download`)
        .set('Authorization', `Bearer ${validToken}`)
        .expect(403);
      
      expect(response.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    it('应该限制下载频率', async () => {
      // 模拟频繁下载
      const requests = Array(15).fill(null).map(() => 
        request(app)
          .get(`/api/files/${testFile.id}/download`)
          .set('Authorization', `Bearer ${validToken}`)
      );
      
      const responses = await Promise.all(requests);
      
      // 应该有部分请求被限制
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  /**
   * 文件更新测试
   */
  describe('PUT /api/files/:fileId', () => {
    const updateData = {
      originalName: '更新的文件名.pdf',
      tags: ['javascript', 'advanced', 'tutorial'],
      isPublic: true,
      metadata: {
        subject: 'Advanced JavaScript',
        description: '高级JavaScript教程'
      }
    };

    it('应该成功更新文件信息', async () => {
      const updatedFile = {
        ...testFile,
        ...updateData,
        updatedAt: new Date().toISOString()
      };
      
      mockSupabase.from().update().mockResolvedValue({
        data: [updatedFile],
        error: null
      });
      
      const response = await request(app)
        .put(`/api/files/${testFile.id}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send(updateData)
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.file.originalName).toBe(updateData.originalName);
      expect(response.body.data.file.tags).toEqual(updateData.tags);
      
      // 验证缓存清除
      expect(mockCacheService.del).toHaveBeenCalledWith(
        `user_files:${testUser.id}:*`
      );
      
      // 验证审计日志
      expect(mockAuditService.log).toHaveBeenCalledWith(
        'file.updated',
        expect.objectContaining({
          userId: testUser.id,
          fileId: testFile.id,
          changes: updateData
        })
      );
    });

    it('应该验证文件所有权', async () => {
      const otherUserFile = {
        ...testFile,
        uploadedBy: 'other-user-123'
      };
      
      mockSupabase.from().select().single.mockResolvedValue({
        data: otherUserFile,
        error: null
      });
      
      const response = await request(app)
        .put(`/api/files/${testFile.id}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send(updateData)
        .expect(403);
      
      expect(response.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    it('应该验证更新数据', async () => {
      const invalidData = {
        originalName: '', // 空文件名
        tags: ['a'.repeat(100)], // 标签过长
        isPublic: 'invalid' // 无效布尔值
      };
      
      const response = await request(app)
        .put(`/api/files/${testFile.id}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send(invalidData)
        .expect(400);
      
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  /**
   * 文件删除测试
   */
  describe('DELETE /api/files/:fileId', () => {
    it('应该成功删除文件', async () => {
      const response = await request(app)
        .delete(`/api/files/${testFile.id}`)
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      
      // 验证文件删除服务调用
      expect(mockFileUploadService.deleteFile).toHaveBeenCalledWith(testFile.id);
      
      // 验证数据库记录删除
      expect(mockSupabase.from().delete).toHaveBeenCalled();
      
      // 验证缓存清除
      expect(mockCacheService.del).toHaveBeenCalledWith(
        `user_files:${testUser.id}:*`
      );
      
      // 验证审计日志
      expect(mockAuditService.log).toHaveBeenCalledWith(
        'file.deleted',
        expect.objectContaining({
          userId: testUser.id,
          fileId: testFile.id,
          filename: testFile.filename
        })
      );
    });

    it('应该验证删除权限', async () => {
      const otherUserFile = {
        ...testFile,
        uploadedBy: 'other-user-123'
      };
      
      mockSupabase.from().select().single.mockResolvedValue({
        data: otherUserFile,
        error: null
      });
      
      const response = await request(app)
        .delete(`/api/files/${testFile.id}`)
        .set('Authorization', `Bearer ${validToken}`)
        .expect(403);
      
      expect(response.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    it('应该处理文件不存在', async () => {
      mockSupabase.from().select().single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' }
      });
      
      const response = await request(app)
        .delete('/api/files/nonexistent-file')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(404);
      
      expect(response.body.error.code).toBe('FILE_NOT_FOUND');
    });

    it('管理员应该能删除任何文件', async () => {
      const adminToken = 'admin-jwt-token-123';
      
      mockJwt.verify.mockImplementation((token: string) => {
        if (token === adminToken) {
          return { userId: 'admin-123', role: 'admin' };
        }
        throw new Error('Invalid token');
      });
      
      const response = await request(app)
        .delete(`/api/files/${testFile.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
    });
  });

  /**
   * 批量操作测试
   */
  describe('批量文件操作', () => {
    describe('POST /api/files/batch/delete', () => {
      const fileIds = ['file-123', 'file-456', 'file-789'];

      it('应该成功批量删除文件', async () => {
        const files = fileIds.map(id => ({ ...testFile, id, uploadedBy: testUser.id }));
        
        mockSupabase.from().select().in.mockResolvedValue({
          data: files,
          error: null
        });
        
        const response = await request(app)
          .post('/api/files/batch/delete')
          .set('Authorization', `Bearer ${validToken}`)
          .send({ fileIds })
          .expect(200);
        
        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data.deletedCount).toBe(3);
        
        // 验证批量删除调用
        expect(mockFileUploadService.deleteFiles).toHaveBeenCalledWith(fileIds);
      });

      it('应该验证文件所有权', async () => {
        const files = [
          { ...testFile, id: 'file-123', uploadedBy: testUser.id },
          { ...testFile, id: 'file-456', uploadedBy: 'other-user-123' }, // 其他用户的文件
          { ...testFile, id: 'file-789', uploadedBy: testUser.id }
        ];
        
        mockSupabase.from().select().in.mockResolvedValue({
          data: files,
          error: null
        });
        
        const response = await request(app)
          .post('/api/files/batch/delete')
          .set('Authorization', `Bearer ${validToken}`)
          .send({ fileIds })
          .expect(207); // 部分成功
        
        expect(response.body.data.deletedCount).toBe(2);
        expect(response.body.data.errors).toHaveLength(1);
      });
    });

    describe('POST /api/files/batch/update', () => {
      const updateData = {
        fileIds: ['file-123', 'file-456'],
        updates: {
          isPublic: true,
          tags: ['updated', 'batch']
        }
      };

      it('应该成功批量更新文件', async () => {
        const files = updateData.fileIds.map(id => ({ ...testFile, id, uploadedBy: testUser.id }));
        
        mockSupabase.from().select().in.mockResolvedValue({
          data: files,
          error: null
        });
        
        const response = await request(app)
          .post('/api/files/batch/update')
          .set('Authorization', `Bearer ${validToken}`)
          .send(updateData)
          .expect(200);
        
        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data.updatedCount).toBe(2);
        
        // 验证批量更新调用
        expect(mockSupabase.from().update).toHaveBeenCalledWith(
          expect.objectContaining(updateData.updates)
        );
      });
    });
  });

  /**
   * 文件统计测试
   */
  describe('GET /api/files/statistics', () => {
    it('应该返回文件统计信息', async () => {
      const statistics = {
        totalFiles: 25,
        totalSize: 104857600, // 100MB
        filesByCategory: {
          document: 10,
          image: 8,
          video: 5,
          audio: 2
        },
        filesByType: {
          'application/pdf': 8,
          'image/jpeg': 6,
          'video/mp4': 4,
          'audio/mp3': 2
        },
        uploadTrend: {
          daily: [2, 3, 1, 4, 2, 0, 1], // 最近7天
          weekly: [12, 8, 15, 10], // 最近4周
          monthly: [45, 38, 52] // 最近3个月
        },
        storageUsage: {
          used: 104857600,
          limit: 1073741824, // 1GB
          percentage: 9.77
        }
      };
      
      mockFileUploadService.getStatistics.mockResolvedValue(statistics);
      
      const response = await request(app)
        .get('/api/files/statistics')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.statistics.totalFiles).toBe(25);
      expect(response.body.data.statistics.storageUsage.percentage).toBe(9.77);
      
      // 验证服务调用
      expect(mockFileUploadService.getStatistics).toHaveBeenCalledWith(testUser.id);
    });

    it('应该支持时间范围查询', async () => {
      const response = await request(app)
        .get('/api/files/statistics')
        .set('Authorization', `Bearer ${validToken}`)
        .query({
          startDate: '2024-01-01',
          endDate: '2024-01-31'
        })
        .expect(200);
      
      // 验证时间范围参数
      expect(mockFileUploadService.getStatistics).toHaveBeenCalledWith(
        testUser.id,
        expect.objectContaining({
          startDate: '2024-01-01',
          endDate: '2024-01-31'
        })
      );
    });
  });

  /**
   * 安全测试
   */
  describe('安全测试', () => {
    it('应该防止路径遍历攻击', async () => {
      const maliciousPath = '../../../etc/passwd';
      
      const response = await request(app)
        .post('/api/files/upload')
        .set('Authorization', `Bearer ${validToken}`)
        .attach('file', Buffer.from('Content'), maliciousPath)
        .field('category', 'document')
        .expect(400);
      
      expect(response.body.error.code).toBe('INVALID_FILENAME');
    });

    it('应该验证文件内容类型', async () => {
      // 上传伪装成PDF的可执行文件
      const response = await request(app)
        .post('/api/files/upload')
        .set('Authorization', `Bearer ${validToken}`)
        .attach('file', Buffer.from('MZ\x90\x00'), 'fake.pdf') // PE文件头
        .field('category', 'document')
        .expect(400);
      
      expect(response.body.error.code).toBe('CONTENT_TYPE_MISMATCH');
    });

    it('应该限制文件名长度', async () => {
      const longFilename = 'a'.repeat(300) + '.pdf';
      
      const response = await request(app)
        .post('/api/files/upload')
        .set('Authorization', `Bearer ${validToken}`)
        .attach('file', Buffer.from('Content'), longFilename)
        .field('category', 'document')
        .expect(400);
      
      expect(response.body.error.code).toBe('FILENAME_TOO_LONG');
    });

    it('应该防止跨用户文件访问', async () => {
      const otherUserFile = {
        ...testFile,
        uploadedBy: 'other-user-123',
        isPublic: false
      };
      
      mockSupabase.from().select().single.mockResolvedValue({
        data: otherUserFile,
        error: null
      });
      
      const response = await request(app)
        .get(`/api/files/${testFile.id}`)
        .set('Authorization', `Bearer ${validToken}`)
        .expect(403);
      
      expect(response.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });
  });

  /**
   * 性能测试
   */
  describe('性能测试', () => {
    it('文件上传应该快速响应', async () => {
      const startTime = Date.now();
      
      await request(app)
        .post('/api/files/upload')
        .set('Authorization', `Bearer ${validToken}`)
        .attach('file', Buffer.from('Small content'), 'small.txt')
        .field('category', 'document')
        .expect(200);
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(1000); // 应该在1秒内完成
    });

    it('文件列表查询应该快速响应', async () => {
      const startTime = Date.now();
      
      await request(app)
        .get('/api/files')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(300); // 应该在300ms内完成
    });

    it('文件下载应该支持高并发', async () => {
      const concurrentRequests = 10;
      const requests = Array(concurrentRequests).fill(null).map(() => 
        request(app)
          .get(`/api/files/${testFile.id}/download`)
          .set('Authorization', `Bearer ${validToken}`)
      );
      
      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const duration = Date.now() - startTime;
      
      // 所有请求都应该成功
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
      
      // 并发处理应该高效
      expect(duration).toBeLessThan(2000); // 应该在2秒内完成
    });
  });
});