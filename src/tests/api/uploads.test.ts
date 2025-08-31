/**
 * 文件上传API集成测试
 * 测试文件上传、下载、删除、权限验证等功能
 */

import { jest } from '@jest/globals';
import request from 'supertest';
import { app } from '../../api/app';
import { supabase } from '../../utils/supabase';
import { cacheService } from '../../services/cacheService';
import { auditService } from '../../services/auditService';
import { analyticsService } from '../../services/analyticsService';
import { envConfig } from '../../utils/envConfig';
import { logger } from '../../utils/logger';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import sharp from 'sharp';

// Mock 依赖
jest.mock('../../utils/supabase');
jest.mock('../../services/cacheService');
jest.mock('../../services/auditService');
jest.mock('../../services/analyticsService');
jest.mock('../../utils/envConfig');
jest.mock('../../utils/logger');
jest.mock('jsonwebtoken');
jest.mock('fs');
jest.mock('sharp');

// 类型定义
interface MockSupabaseQuery {
  select: jest.MockedFunction<(columns?: string) => MockSupabaseQuery>;
  eq: jest.MockedFunction<(column: string, value: unknown) => MockSupabaseQuery>;
  limit: jest.MockedFunction<(count: number) => MockSupabaseQuery>;
  range: jest.MockedFunction<(from: number, to: number) => MockSupabaseQuery>;
  single: jest.MockedFunction<() => Promise<{ data: unknown; error: unknown }>>;
  mockResolvedValue: jest.MockedFunction<(value: unknown) => MockSupabaseQuery>;
}

interface MockSupabaseStorage {
  upload: jest.MockedFunction<(path: string, file: File | Buffer, options?: Record<string, unknown>) => Promise<{ data: { path?: string; id?: string; fullPath?: string } | null; error: unknown }>>;
  download: jest.MockedFunction<(path: string) => Promise<{ data: Blob | null; error: unknown }>>;
  remove: jest.MockedFunction<(paths: string | string[]) => Promise<{ data: { path?: string }[] | null; error: unknown }>>;
  getPublicUrl: jest.MockedFunction<(path: string) => { data: { publicUrl: string } }>;
  createSignedUrl: jest.MockedFunction<(path: string, expiresIn: number) => Promise<{ data: { signedUrl?: string } | null; error: unknown }>>;
}

interface MockFileStats {
  size: number;
  isFile: () => boolean;
  isDirectory: () => boolean;
}

interface MockSharpInstance {
  resize: jest.MockedFunction<(width?: number, height?: number, options?: Record<string, unknown>) => MockSharpInstance>;
  jpeg: jest.MockedFunction<(options?: Record<string, unknown>) => MockSharpInstance>;
  png: jest.MockedFunction<(options?: Record<string, unknown>) => MockSharpInstance>;
  webp: jest.MockedFunction<(options?: Record<string, unknown>) => MockSharpInstance>;
  toBuffer: jest.MockedFunction<() => Promise<Buffer>>;
  toFile: jest.MockedFunction<(output: string, options?: Record<string, unknown>) => Promise<void>>;
  metadata: jest.MockedFunction<() => Promise<{ width: number; height: number; format: string; size: number }>>;
}

// Mock 对象
const mockSupabase = supabase as jest.Mocked<typeof supabase>;
const mockCacheService = cacheService as jest.Mocked<typeof cacheService>;
const mockAuditService = auditService as jest.Mocked<typeof auditService>;
const mockAnalyticsService = analyticsService as jest.Mocked<typeof analyticsService>;
const mockEnvConfig = envConfig as jest.Mocked<typeof envConfig>;
const mockLogger = logger as jest.Mocked<typeof logger>;
const mockJwt = jwt as jest.Mocked<typeof jwt>;
const mockFs = fs as jest.Mocked<typeof fs>;
const mockSharp = sharp as jest.Mocked<typeof sharp>;

// 测试数据
const testUser = {
  id: 'user-123',
  email: 'test@example.com',
  username: 'testuser',
  role: 'student',
  profile: {
    first_name: '张',
    last_name: '三',
    avatar_url: null,
    storage_quota: 1024 * 1024 * 100, // 100MB
    storage_used: 1024 * 1024 * 10 // 10MB
  }
};

const testInstructor = {
  id: 'instructor-123',
  email: 'instructor@example.com',
  username: 'instructor',
  role: 'instructor',
  profile: {
    first_name: '李',
    last_name: '老师',
    avatar_url: null,
    storage_quota: 1024 * 1024 * 500, // 500MB
    storage_used: 1024 * 1024 * 50 // 50MB
  }
};

const testFile = {
  id: 'file-123',
  user_id: 'user-123',
  filename: 'test-document.pdf',
  original_name: 'JavaScript高级教程.pdf',
  mime_type: 'application/pdf',
  file_size: 1024 * 1024 * 2, // 2MB
  file_path: '/uploads/documents/2024/01/file-123.pdf',
  file_url: 'https://storage.example.com/uploads/documents/2024/01/file-123.pdf',
  file_hash: 'sha256:abcdef123456789',
  upload_type: 'document',
  upload_context: {
    course_id: 'course-123',
    lesson_id: 'lesson-123'
  },
  access_level: 'private',
  download_count: 0,
  virus_scan_status: 'clean',
  virus_scan_result: null,
  processing_status: 'completed',
  processing_result: {
    thumbnail_url: null,
    preview_url: 'https://storage.example.com/previews/file-123.jpg',
    metadata: {
      pages: 25,
      author: 'JavaScript专家',
      title: 'JavaScript高级教程'
    }
  },
  expires_at: null,
  created_at: '2024-01-15T10:00:00Z',
  updated_at: '2024-01-15T10:00:00Z'
};

const testImageFile = {
  id: 'image-123',
  user_id: 'user-123',
  filename: 'avatar.jpg',
  original_name: '头像.jpg',
  mime_type: 'image/jpeg',
  file_size: 1024 * 512, // 512KB
  file_path: '/uploads/images/2024/01/image-123.jpg',
  file_url: 'https://storage.example.com/uploads/images/2024/01/image-123.jpg',
  file_hash: 'sha256:fedcba987654321',
  upload_type: 'avatar',
  upload_context: {
    user_id: 'user-123'
  },
  access_level: 'public',
  download_count: 5,
  virus_scan_status: 'clean',
  virus_scan_result: null,
  processing_status: 'completed',
  processing_result: {
    thumbnail_url: 'https://storage.example.com/thumbnails/image-123.jpg',
    preview_url: 'https://storage.example.com/previews/image-123.jpg',
    metadata: {
      width: 800,
      height: 600,
      format: 'jpeg',
      exif: {
        camera: 'iPhone 12',
        date_taken: '2024-01-15T09:30:00Z'
      }
    }
  },
  expires_at: null,
  created_at: '2024-01-15T09:30:00Z',
  updated_at: '2024-01-15T09:30:00Z'
};

const testUploadSession = {
  id: 'session-123',
  user_id: 'user-123',
  filename: 'large-video.mp4',
  file_size: 1024 * 1024 * 100, // 100MB
  chunk_size: 1024 * 1024 * 5, // 5MB
  total_chunks: 20,
  uploaded_chunks: 10,
  upload_type: 'video',
  upload_context: {
    course_id: 'course-123',
    lesson_id: 'lesson-123'
  },
  session_token: 'session-token-123',
  status: 'uploading',
  expires_at: '2024-01-15T12:00:00Z',
  created_at: '2024-01-15T10:00:00Z',
  updated_at: '2024-01-15T11:00:00Z'
};

const validJwtToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoidXNlci0xMjMiLCJyb2xlIjoic3R1ZGVudCIsImlhdCI6MTcwNTMxNDAwMCwiZXhwIjoxNzA1NDAwNDAwfQ.signature';
const instructorJwtToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiaW5zdHJ1Y3Rvci0xMjMiLCJyb2xlIjoiaW5zdHJ1Y3RvciIsImlhdCI6MTcwNTMxNDAwMCwiZXhwIjoxNzA1NDAwNDAwfQ.signature';
const adminJwtToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYWRtaW4tMTIzIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzA1MzE0MDAwLCJleHAiOjE3MDU0MDA0MDB9.signature';

// 模拟文件数据
const mockFileBuffer = Buffer.from('mock file content');
const mockImageBuffer = Buffer.from('mock image content');

describe('Uploads API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // 设置环境配置
    mockEnvConfig.get.mockImplementation((key, defaultValue) => {
      const config = {
        'JWT_SECRET': 'test-jwt-secret',
        'UPLOAD_MAX_FILE_SIZE': '10485760', // 10MB
        'UPLOAD_MAX_FILES_PER_REQUEST': '5',
        'UPLOAD_ALLOWED_TYPES': 'image/jpeg,image/png,image/gif,application/pdf,video/mp4,audio/mpeg',
        'UPLOAD_STORAGE_PATH': '/uploads',
        'UPLOAD_TEMP_PATH': '/tmp/uploads',
        'UPLOAD_CHUNK_SIZE': '5242880', // 5MB
        'UPLOAD_SESSION_TIMEOUT': '3600', // 1 hour
        'VIRUS_SCAN_ENABLED': 'true',
        'IMAGE_PROCESSING_ENABLED': 'true',
        'THUMBNAIL_SIZES': '150x150,300x300,600x600',
        'STORAGE_QUOTA_STUDENT': '104857600', // 100MB
        'STORAGE_QUOTA_INSTRUCTOR': '524288000', // 500MB
        'STORAGE_QUOTA_ADMIN': '1073741824' // 1GB
      };
      return config[key] || defaultValue;
    });
    
    // 设置JWT验证
    mockJwt.verify.mockImplementation((token) => {
      if (token === validJwtToken) {
        return { user_id: 'user-123', role: 'student' };
      } else if (token === instructorJwtToken) {
        return { user_id: 'instructor-123', role: 'instructor' };
      } else if (token === adminJwtToken) {
        return { user_id: 'admin-123', role: 'admin' };
      }
      throw new Error('Invalid token');
    });
    
    // 设置数据库 Mock
    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      neq: jest.fn().mockReturnThis(),
      gt: jest.fn().mockReturnThis(),
      lt: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      like: jest.fn().mockReturnThis(),
      ilike: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      is: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: testFile, error: null })
    });
    
    // 设置Supabase存储
    mockSupabase.storage = {
      from: jest.fn().mockReturnValue({
        upload: jest.fn().mockResolvedValue({
          data: { path: 'uploads/file-123.pdf' },
          error: null
        }),
        download: jest.fn().mockResolvedValue({
          data: mockFileBuffer,
          error: null
        }),
        remove: jest.fn().mockResolvedValue({
          data: null,
          error: null
        }),
        getPublicUrl: jest.fn().mockReturnValue({
          data: { publicUrl: 'https://storage.example.com/uploads/file-123.pdf' }
        }),
        createSignedUrl: jest.fn().mockResolvedValue({
          data: { signedUrl: 'https://storage.example.com/uploads/file-123.pdf?token=abc123' },
          error: null
        })
      })
    };
    
    // 设置缓存服务
    mockCacheService.get.mockResolvedValue(null);
    mockCacheService.set.mockResolvedValue(undefined);
    mockCacheService.del.mockResolvedValue(undefined);
    
    // 设置文件系统
    mockFs.existsSync.mockReturnValue(true);
    mockFs.mkdirSync.mockReturnValue(undefined);
    mockFs.writeFileSync.mockReturnValue(undefined);
    mockFs.readFileSync.mockReturnValue(mockFileBuffer);
    mockFs.unlinkSync.mockReturnValue(undefined);
    mockFs.statSync.mockReturnValue({
      size: 1024 * 1024 * 2,
      isFile: () => true,
      isDirectory: () => false
    });
    
    // 设置图片处理
    const mockSharpInstance = {
      resize: jest.fn().mockReturnThis(),
      jpeg: jest.fn().mockReturnThis(),
      png: jest.fn().mockReturnThis(),
      webp: jest.fn().mockReturnThis(),
      toBuffer: jest.fn().mockResolvedValue(mockImageBuffer),
      toFile: jest.fn().mockResolvedValue(undefined),
      metadata: jest.fn().mockResolvedValue({
        width: 800,
        height: 600,
        format: 'jpeg',
        size: 1024 * 512
      })
    };
    
    mockSharp.mockReturnValue(mockSharpInstance);
    
    // 设置审计和分析服务
    mockAuditService.log.mockResolvedValue(undefined);
    mockAnalyticsService.track.mockResolvedValue(undefined);
  });

  /**
   * 文件上传测试
   */
  describe('POST /api/uploads', () => {
    it('应该成功上传文件', async () => {
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: testUser,
        error: null
      });
      
      mockSupabase.from().insert().select().single.mockResolvedValue({
        data: testFile,
        error: null
      });
      
      const response = await request(app)
        .post('/api/uploads')
        .set('Authorization', `Bearer ${validJwtToken}`)
        .attach('file', Buffer.from('test file content'), 'test.pdf')
        .field('upload_type', 'document')
        .field('upload_context', JSON.stringify({ course_id: 'course-123' }))
        .expect(201);
      
      expect(response.body).toEqual({
        success: true,
        message: 'File uploaded successfully',
        data: {
          file: expect.objectContaining({
            id: 'file-123',
            filename: 'test-document.pdf',
            file_size: expect.any(Number),
            file_url: expect.any(String)
          })
        }
      });
      
      expect(mockAnalyticsService.track).toHaveBeenCalledWith({
        event: 'file_uploaded',
        user_id: 'user-123',
        properties: {
          file_id: 'file-123',
          file_type: 'application/pdf',
          file_size: expect.any(Number),
          upload_type: 'document'
        }
      });
    });

    it('应该验证文件类型', async () => {
      const response = await request(app)
        .post('/api/uploads')
        .set('Authorization', `Bearer ${validJwtToken}`)
        .attach('file', Buffer.from('test content'), 'test.exe')
        .field('upload_type', 'document')
        .expect(400);
      
      expect(response.body.error).toContain('File type not allowed');
    });

    it('应该验证文件大小', async () => {
      const largeBuffer = Buffer.alloc(1024 * 1024 * 15); // 15MB
      
      const response = await request(app)
        .post('/api/uploads')
        .set('Authorization', `Bearer ${validJwtToken}`)
        .attach('file', largeBuffer, 'large.pdf')
        .field('upload_type', 'document')
        .expect(400);
      
      expect(response.body.error).toContain('File size exceeds limit');
    });

    it('应该验证存储配额', async () => {
      const userWithFullQuota = {
        ...testUser,
        profile: {
          ...testUser.profile,
          storage_used: 1024 * 1024 * 95 // 95MB used out of 100MB quota
        }
      };
      
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: userWithFullQuota,
        error: null
      });
      
      const response = await request(app)
        .post('/api/uploads')
        .set('Authorization', `Bearer ${validJwtToken}`)
        .attach('file', Buffer.alloc(1024 * 1024 * 10), 'large.pdf') // 10MB file
        .field('upload_type', 'document')
        .expect(400);
      
      expect(response.body.error).toContain('Storage quota exceeded');
    });

    it('应该支持多文件上传', async () => {
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: testUser,
        error: null
      });
      
      const response = await request(app)
        .post('/api/uploads')
        .set('Authorization', `Bearer ${validJwtToken}`)
        .attach('files', Buffer.from('file 1'), 'file1.pdf')
        .attach('files', Buffer.from('file 2'), 'file2.pdf')
        .field('upload_type', 'document')
        .expect(201);
      
      expect(response.body.data.files).toHaveLength(2);
    });

    it('应该处理图片文件并生成缩略图', async () => {
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: testUser,
        error: null
      });
      
      mockSupabase.from().insert().select().single.mockResolvedValue({
        data: testImageFile,
        error: null
      });
      
      const response = await request(app)
        .post('/api/uploads')
        .set('Authorization', `Bearer ${validJwtToken}`)
        .attach('file', mockImageBuffer, 'image.jpg')
        .field('upload_type', 'avatar')
        .expect(201);
      
      expect(response.body.data.file.processing_result.thumbnail_url).toBeDefined();
      expect(mockSharp).toHaveBeenCalled();
    });
  });

  /**
   * 分块上传测试
   */
  describe('POST /api/uploads/chunked/init', () => {
    const initData = {
      filename: 'large-video.mp4',
      file_size: 1024 * 1024 * 100, // 100MB
      chunk_size: 1024 * 1024 * 5, // 5MB
      upload_type: 'video',
      upload_context: {
        course_id: 'course-123',
        lesson_id: 'lesson-123'
      }
    };

    it('应该成功初始化分块上传', async () => {
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: testUser,
        error: null
      });
      
      mockSupabase.from().insert().select().single.mockResolvedValue({
        data: testUploadSession,
        error: null
      });
      
      const response = await request(app)
        .post('/api/uploads/chunked/init')
        .set('Authorization', `Bearer ${validJwtToken}`)
        .send(initData)
        .expect(201);
      
      expect(response.body).toEqual({
        success: true,
        message: 'Chunked upload session created',
        data: {
          session: expect.objectContaining({
            id: 'session-123',
            session_token: 'session-token-123',
            total_chunks: 20,
            chunk_size: 1024 * 1024 * 5
          })
        }
      });
    });

    it('应该验证文件大小限制', async () => {
      const largeFileData = {
        ...initData,
        file_size: 1024 * 1024 * 1024 * 2 // 2GB
      };
      
      const response = await request(app)
        .post('/api/uploads/chunked/init')
        .set('Authorization', `Bearer ${validJwtToken}`)
        .send(largeFileData)
        .expect(400);
      
      expect(response.body.error).toContain('File size exceeds limit');
    });
  });

  describe('POST /api/uploads/chunked/:sessionId/chunk/:chunkIndex', () => {
    it('应该成功上传文件块', async () => {
      mockSupabase.from().select().eq().eq().single.mockResolvedValue({
        data: testUploadSession,
        error: null
      });
      
      const response = await request(app)
        .post('/api/uploads/chunked/session-123/chunk/0')
        .set('Authorization', `Bearer ${validJwtToken}`)
        .attach('chunk', Buffer.alloc(1024 * 1024 * 5), 'chunk-0')
        .expect(200);
      
      expect(response.body).toEqual({
        success: true,
        message: 'Chunk uploaded successfully',
        data: {
          chunk_index: 0,
          uploaded_chunks: 11,
          total_chunks: 20,
          progress: 55
        }
      });
    });

    it('应该验证会话有效性', async () => {
      mockSupabase.from().select().eq().eq().single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' }
      });
      
      const response = await request(app)
        .post('/api/uploads/chunked/invalid-session/chunk/0')
        .set('Authorization', `Bearer ${validJwtToken}`)
        .attach('chunk', Buffer.alloc(1024), 'chunk-0')
        .expect(404);
      
      expect(response.body.error).toBe('Upload session not found');
    });

    it('应该验证块索引', async () => {
      mockSupabase.from().select().eq().eq().single.mockResolvedValue({
        data: testUploadSession,
        error: null
      });
      
      const response = await request(app)
        .post('/api/uploads/chunked/session-123/chunk/25') // 超出总块数
        .set('Authorization', `Bearer ${validJwtToken}`)
        .attach('chunk', Buffer.alloc(1024), 'chunk-25')
        .expect(400);
      
      expect(response.body.error).toContain('Invalid chunk index');
    });
  });

  describe('POST /api/uploads/chunked/:sessionId/complete', () => {
    it('应该成功完成分块上传', async () => {
      const completedSession = {
        ...testUploadSession,
        uploaded_chunks: 20,
        status: 'completed'
      };
      
      mockSupabase.from().select().eq().eq().single.mockResolvedValue({
        data: completedSession,
        error: null
      });
      
      mockSupabase.from().insert().select().single.mockResolvedValue({
        data: testFile,
        error: null
      });
      
      const response = await request(app)
        .post('/api/uploads/chunked/session-123/complete')
        .set('Authorization', `Bearer ${validJwtToken}`)
        .expect(200);
      
      expect(response.body).toEqual({
        success: true,
        message: 'File upload completed successfully',
        data: {
          file: expect.objectContaining({
            id: 'file-123',
            filename: expect.any(String),
            file_url: expect.any(String)
          })
        }
      });
    });

    it('应该验证所有块已上传', async () => {
      const incompleteSession = {
        ...testUploadSession,
        uploaded_chunks: 15 // 缺少5个块
      };
      
      mockSupabase.from().select().eq().eq().single.mockResolvedValue({
        data: incompleteSession,
        error: null
      });
      
      const response = await request(app)
        .post('/api/uploads/chunked/session-123/complete')
        .set('Authorization', `Bearer ${validJwtToken}`)
        .expect(400);
      
      expect(response.body.error).toContain('Upload incomplete');
    });
  });

  /**
   * 文件下载测试
   */
  describe('GET /api/uploads/:fileId/download', () => {
    it('应该成功下载公开文件', async () => {
      const publicFile = {
        ...testFile,
        access_level: 'public'
      };
      
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: publicFile,
        error: null
      });
      
      const response = await request(app)
        .get('/api/uploads/file-123/download')
        .expect(200);
      
      expect(response.headers['content-type']).toBe('application/pdf');
      expect(response.headers['content-disposition']).toContain('JavaScript高级教程.pdf');
    });

    it('应该验证私有文件访问权限', async () => {
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: testFile, // private file
        error: null
      });
      
      const response = await request(app)
        .get('/api/uploads/file-123/download')
        .set('Authorization', `Bearer ${validJwtToken}`)
        .expect(200);
      
      expect(mockSupabase.from().update).toHaveBeenCalledWith({
        download_count: 1,
        updated_at: expect.any(String)
      });
    });

    it('应该拒绝未授权访问私有文件', async () => {
      const otherUserFile = {
        ...testFile,
        user_id: 'other-user-123'
      };
      
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: otherUserFile,
        error: null
      });
      
      const response = await request(app)
        .get('/api/uploads/file-123/download')
        .set('Authorization', `Bearer ${validJwtToken}`)
        .expect(403);
      
      expect(response.body.error).toBe('Access denied to this file');
    });

    it('应该处理文件不存在', async () => {
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' }
      });
      
      const response = await request(app)
        .get('/api/uploads/file-123/download')
        .expect(404);
      
      expect(response.body.error).toBe('File not found');
    });

    it('应该支持范围请求（断点续传）', async () => {
      const publicFile = {
        ...testFile,
        access_level: 'public'
      };
      
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: publicFile,
        error: null
      });
      
      const response = await request(app)
        .get('/api/uploads/file-123/download')
        .set('Range', 'bytes=0-1023')
        .expect(206);
      
      expect(response.headers['content-range']).toContain('bytes 0-1023');
      expect(response.headers['accept-ranges']).toBe('bytes');
    });
  });

  /**
   * 文件信息获取测试
   */
  describe('GET /api/uploads/:fileId', () => {
    it('应该返回文件信息', async () => {
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: testFile,
        error: null
      });
      
      const response = await request(app)
        .get('/api/uploads/file-123')
        .set('Authorization', `Bearer ${validJwtToken}`)
        .expect(200);
      
      expect(response.body).toEqual({
        success: true,
        data: {
          file: expect.objectContaining({
            id: 'file-123',
            filename: 'test-document.pdf',
            original_name: 'JavaScript高级教程.pdf',
            file_size: expect.any(Number),
            mime_type: 'application/pdf'
          })
        }
      });
    });

    it('应该验证文件访问权限', async () => {
      const otherUserFile = {
        ...testFile,
        user_id: 'other-user-123'
      };
      
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: otherUserFile,
        error: null
      });
      
      const response = await request(app)
        .get('/api/uploads/file-123')
        .set('Authorization', `Bearer ${validJwtToken}`)
        .expect(403);
      
      expect(response.body.error).toBe('Access denied to this file');
    });
  });

  /**
   * 文件删除测试
   */
  describe('DELETE /api/uploads/:fileId', () => {
    it('应该成功删除文件', async () => {
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: testFile,
        error: null
      });
      
      const response = await request(app)
        .delete('/api/uploads/file-123')
        .set('Authorization', `Bearer ${validJwtToken}`)
        .expect(200);
      
      expect(response.body).toEqual({
        success: true,
        message: 'File deleted successfully'
      });
      
      expect(mockSupabase.storage.from().remove).toHaveBeenCalledWith(
        ['/uploads/documents/2024/01/file-123.pdf']
      );
      
      expect(mockAnalyticsService.track).toHaveBeenCalledWith({
        event: 'file_deleted',
        user_id: 'user-123',
        properties: {
          file_id: 'file-123',
          file_type: 'application/pdf',
          file_size: expect.any(Number)
        }
      });
    });

    it('应该验证文件所有权', async () => {
      const otherUserFile = {
        ...testFile,
        user_id: 'other-user-123'
      };
      
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: otherUserFile,
        error: null
      });
      
      const response = await request(app)
        .delete('/api/uploads/file-123')
        .set('Authorization', `Bearer ${validJwtToken}`)
        .expect(403);
      
      expect(response.body.error).toBe('Access denied to this file');
    });

    it('管理员应该能删除任何文件', async () => {
      const otherUserFile = {
        ...testFile,
        user_id: 'other-user-123'
      };
      
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: otherUserFile,
        error: null
      });
      
      const response = await request(app)
        .delete('/api/uploads/file-123')
        .set('Authorization', `Bearer ${adminJwtToken}`)
        .expect(200);
      
      expect(response.body.message).toBe('File deleted successfully');
    });
  });

  /**
   * 用户文件列表测试
   */
  describe('GET /api/uploads', () => {
    it('应该返回用户文件列表', async () => {
      const files = [testFile, testImageFile];
      
      mockSupabase.from().select().eq().order().range.mockResolvedValue({
        data: files,
        error: null,
        count: 2
      });
      
      const response = await request(app)
        .get('/api/uploads')
        .set('Authorization', `Bearer ${validJwtToken}`)
        .expect(200);
      
      expect(response.body).toEqual({
        success: true,
        data: {
          files: expect.arrayContaining([
            expect.objectContaining({
              id: 'file-123',
              filename: 'test-document.pdf'
            }),
            expect.objectContaining({
              id: 'image-123',
              filename: 'avatar.jpg'
            })
          ]),
          pagination: {
            page: 1,
            limit: 20,
            total: 2,
            totalPages: 1
          }
        }
      });
    });

    it('应该支持按类型筛选', async () => {
      const response = await request(app)
        .get('/api/uploads?upload_type=image')
        .set('Authorization', `Bearer ${validJwtToken}`)
        .expect(200);
      
      expect(mockSupabase.from().eq).toHaveBeenCalledWith('upload_type', 'image');
    });

    it('应该支持按文件名搜索', async () => {
      const response = await request(app)
        .get('/api/uploads?search=avatar')
        .set('Authorization', `Bearer ${validJwtToken}`)
        .expect(200);
      
      expect(mockSupabase.from().ilike).toHaveBeenCalledWith('original_name', '%avatar%');
    });
  });

  /**
   * 存储统计测试
   */
  describe('GET /api/uploads/stats', () => {
    it('应该返回用户存储统计', async () => {
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: testUser,
        error: null
      });
      
      const response = await request(app)
        .get('/api/uploads/stats')
        .set('Authorization', `Bearer ${validJwtToken}`)
        .expect(200);
      
      expect(response.body).toEqual({
        success: true,
        data: {
          storage_used: 1024 * 1024 * 10,
          storage_quota: 1024 * 1024 * 100,
          storage_percentage: 10,
          file_count: expect.any(Number),
          file_types: expect.any(Object)
        }
      });
    });
  });

  /**
   * 错误处理测试
   */
  describe('错误处理', () => {
    it('应该处理数据库连接错误', async () => {
      const dbError = new Error('Database connection failed');
      mockSupabase.from().select.mockRejectedValue(dbError);
      
      const response = await request(app)
        .get('/api/uploads')
        .set('Authorization', `Bearer ${validJwtToken}`)
        .expect(500);
      
      expect(response.body).toEqual({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      });
    });

    it('应该处理存储服务错误', async () => {
      mockSupabase.storage.from().upload.mockResolvedValue({
        data: null,
        error: { message: 'Storage service unavailable' }
      });
      
      const response = await request(app)
        .post('/api/uploads')
        .set('Authorization', `Bearer ${validJwtToken}`)
        .attach('file', Buffer.from('test'), 'test.pdf')
        .field('upload_type', 'document')
        .expect(500);
      
      expect(response.body.error).toContain('Upload failed');
    });

    it('应该处理病毒扫描错误', async () => {
      // 模拟病毒扫描失败
      mockSupabase.from().insert().select().single.mockResolvedValue({
        data: {
          ...testFile,
          virus_scan_status: 'infected',
          virus_scan_result: {
            threat_name: 'Test.Virus',
            scan_engine: 'ClamAV'
          }
        },
        error: null
      });
      
      const response = await request(app)
        .post('/api/uploads')
        .set('Authorization', `Bearer ${validJwtToken}`)
        .attach('file', Buffer.from('infected content'), 'virus.pdf')
        .field('upload_type', 'document')
        .expect(400);
      
      expect(response.body.error).toContain('File contains malware');
    });

    it('应该处理图片处理错误', async () => {
      mockSharp().metadata.mockRejectedValue(
        new Error('Invalid image format')
      );
      
      const response = await request(app)
        .post('/api/uploads')
        .set('Authorization', `Bearer ${validJwtToken}`)
        .attach('file', Buffer.from('invalid image'), 'image.jpg')
        .field('upload_type', 'avatar')
        .expect(400);
      
      expect(response.body.error).toContain('Image processing failed');
    });
  });

  /**
   * 性能测试
   */
  describe('性能测试', () => {
    it('文件上传应该在合理时间内完成', async () => {
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: testUser,
        error: null
      });
      
      const startTime = Date.now();
      
      await request(app)
        .post('/api/uploads')
        .set('Authorization', `Bearer ${validJwtToken}`)
        .attach('file', Buffer.from('test content'), 'test.pdf')
        .field('upload_type', 'document')
        .expect(201);
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(5000); // 应该在5秒内完成
    });

    it('应该正确处理并发上传', async () => {
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: testUser,
        error: null
      });
      
      const promises = [];
      
      for (let i = 0; i < 5; i++) {
        promises.push(
          request(app)
            .post('/api/uploads')
            .set('Authorization', `Bearer ${validJwtToken}`)
            .attach('file', Buffer.from(`test content ${i}`), `test${i}.pdf`)
            .field('upload_type', 'document')
        );
      }
      
      const responses = await Promise.all(promises);
      
      responses.forEach(response => {
        expect(response.status).toBe(201);
      });
    });

    it('大文件分块上传应该高效处理', async () => {
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: testUser,
        error: null
      });
      
      mockSupabase.from().select().eq().eq().single.mockResolvedValue({
        data: testUploadSession,
        error: null
      });
      
      const startTime = Date.now();
      
      // 模拟上传多个块
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post(`/api/uploads/chunked/session-123/chunk/${i}`)
          .set('Authorization', `Bearer ${validJwtToken}`)
          .attach('chunk', Buffer.alloc(1024 * 1024), `chunk-${i}`)
          .expect(200);
      }
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(10000); // 应该在10秒内完成
    });
  });
});