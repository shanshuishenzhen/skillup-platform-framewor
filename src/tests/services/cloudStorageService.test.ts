/**
 * 云存储服务单元测试
 * 
 * 测试覆盖范围：
 * 1. 文件上传和下载
 * 2. 多云存储提供商支持(阿里云OSS、AWS S3、腾讯云COS)
 * 3. 文件管理和组织
 * 4. 文件安全和权限控制
 * 5. 文件压缩和优化
 * 6. 文件版本控制
 * 7. 文件分享和链接生成
 * 8. 文件统计和分析
 * 9. 文件备份和恢复
 * 10. 错误处理和重试机制
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { testUtils } from '../setup';

// 模拟依赖
jest.mock('@/utils/envConfig');
jest.mock('@/utils/errorHandler');
jest.mock('@/services/monitoringService');
jest.mock('@/services/userService');
jest.mock('@supabase/supabase-js');
jest.mock('@alicloud/oss');
jest.mock('@aws-sdk/client-s3');
jest.mock('cos-nodejs-sdk-v5');
jest.mock('node:crypto');
jest.mock('uuid');
jest.mock('moment');
jest.mock('redis');
jest.mock('lodash');
jest.mock('sharp');
jest.mock('ffmpeg-static');
jest.mock('fluent-ffmpeg');
jest.mock('archiver');
jest.mock('unzipper');
jest.mock('mime-types');
jest.mock('file-type');
jest.mock('node:fs/promises');
jest.mock('node:path');
jest.mock('node:stream');

const mockEnvConfig = {
  NODE_ENV: 'test',
  CLOUD_STORAGE: {
    provider: 'alicloud', // alicloud, aws, tencent
    defaultBucket: 'skillup-storage',
    region: 'oss-cn-hangzhou',
    alicloud: {
      accessKeyId: 'alicloud-access-key',
      accessKeySecret: 'alicloud-secret-key',
      bucket: 'skillup-oss',
      region: 'oss-cn-hangzhou',
      endpoint: 'https://oss-cn-hangzhou.aliyuncs.com',
      customDomain: 'https://cdn.skillup.com'
    },
    aws: {
      accessKeyId: 'aws-access-key',
      secretAccessKey: 'aws-secret-key',
      bucket: 'skillup-s3',
      region: 'us-east-1'
    },
    tencent: {
      secretId: 'tencent-secret-id',
      secretKey: 'tencent-secret-key',
      bucket: 'skillup-cos',
      region: 'ap-guangzhou'
    },
    upload: {
      maxFileSize: 100 * 1024 * 1024, // 100MB
      allowedTypes: ['image/*', 'video/*', 'application/pdf', 'text/*'],
      imageOptimization: {
        enabled: true,
        quality: 80,
        maxWidth: 1920,
        maxHeight: 1080,
        formats: ['webp', 'jpeg']
      },
      videoOptimization: {
        enabled: true,
        maxBitrate: '2M',
        maxResolution: '1080p',
        formats: ['mp4', 'webm']
      }
    },
    security: {
      virusScanning: true,
      contentValidation: true,
      encryptionAtRest: true,
      signedUrls: true,
      urlExpiration: 3600 // 1小时
    },
    backup: {
      enabled: true,
      retention: 30, // 30天
      crossRegion: true
    }
  },
  REDIS: {
    host: 'localhost',
    port: 6379,
    password: 'redis-password',
    db: 5
  },
  SUPABASE: {
    url: 'https://project.supabase.co',
    anonKey: 'supabase-anon-key',
    serviceRoleKey: 'supabase-service-role-key'
  }
};

const mockErrorHandler = {
  createError: jest.fn(),
  logError: jest.fn(),
  handleError: jest.fn()
};

const mockMonitoringService = {
  recordMetric: jest.fn(),
  recordEvent: jest.fn(),
  incrementCounter: jest.fn()
};

const mockUserService = {
  getUserById: jest.fn(),
  updateUserStorage: jest.fn()
};

// Supabase模拟
const mockSupabase = {
  from: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    single: jest.fn(),
    then: jest.fn()
  })),
  storage: {
    from: jest.fn(() => ({
      upload: jest.fn(),
      download: jest.fn(),
      remove: jest.fn(),
      list: jest.fn(),
      createSignedUrl: jest.fn(),
      getPublicUrl: jest.fn()
    }))
  }
};

// 阿里云OSS模拟
const mockAlicloudOss = {
  put: jest.fn(),
  get: jest.fn(),
  delete: jest.fn(),
  list: jest.fn(),
  signatureUrl: jest.fn(),
  copy: jest.fn(),
  head: jest.fn()
};

// AWS S3模拟
const mockAwsS3 = {
  send: jest.fn()
};

// 腾讯云COS模拟
const mockTencentCos = {
  putObject: jest.fn(),
  getObject: jest.fn(),
  deleteObject: jest.fn(),
  getBucket: jest.fn(),
  getObjectUrl: jest.fn()
};

// 其他依赖模拟
const mockCrypto = {
  randomBytes: jest.fn(),
  createHash: jest.fn(() => ({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn()
  })),
  createCipher: jest.fn(),
  createDecipher: jest.fn()
};

const mockUuid = {
  v4: jest.fn()
};

const mockMoment = jest.fn(() => ({
  format: jest.fn(),
  toISOString: jest.fn(),
  valueOf: jest.fn(),
  add: jest.fn().mockReturnThis(),
  subtract: jest.fn().mockReturnThis(),
  isAfter: jest.fn(),
  isBefore: jest.fn()
}));

const mockRedis = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  exists: jest.fn(),
  incr: jest.fn(),
  expire: jest.fn(),
  ttl: jest.fn(),
  hget: jest.fn(),
  hset: jest.fn(),
  hdel: jest.fn(),
  hgetall: jest.fn()
};

const mockLodash = {
  pick: jest.fn(),
  omit: jest.fn(),
  merge: jest.fn(),
  cloneDeep: jest.fn(),
  isString: jest.fn(),
  isObject: jest.fn(),
  isEmpty: jest.fn(),
  get: jest.fn(),
  set: jest.fn()
};

const mockSharp = jest.fn(() => ({
  resize: jest.fn().mockReturnThis(),
  jpeg: jest.fn().mockReturnThis(),
  webp: jest.fn().mockReturnThis(),
  png: jest.fn().mockReturnThis(),
  toBuffer: jest.fn(),
  toFile: jest.fn(),
  metadata: jest.fn()
}));

const mockFfmpeg = jest.fn(() => ({
  input: jest.fn().mockReturnThis(),
  output: jest.fn().mockReturnThis(),
  videoBitrate: jest.fn().mockReturnThis(),
  size: jest.fn().mockReturnThis(),
  format: jest.fn().mockReturnThis(),
  on: jest.fn().mockReturnThis(),
  run: jest.fn()
}));

const mockArchiver = {
  create: jest.fn(() => ({
    append: jest.fn(),
    directory: jest.fn(),
    finalize: jest.fn(),
    pipe: jest.fn(),
    on: jest.fn()
  }))
};

const mockUnzipper = {
  Extract: jest.fn(),
  Parse: jest.fn()
};

const mockMimeTypes = {
  lookup: jest.fn(),
  extension: jest.fn()
};

const mockFileType = {
  fromBuffer: jest.fn(),
  fromFile: jest.fn()
};

const mockFs = {
  readFile: jest.fn(),
  writeFile: jest.fn(),
  unlink: jest.fn(),
  mkdir: jest.fn(),
  stat: jest.fn(),
  access: jest.fn()
};

const mockPath = {
  join: jest.fn(),
  extname: jest.fn(),
  basename: jest.fn(),
  dirname: jest.fn()
};

const mockStream = {
  Readable: jest.fn(),
  Writable: jest.fn(),
  Transform: jest.fn(),
  pipeline: jest.fn()
};

// 导入被测试的模块
import {
  CloudStorageService,
  uploadFile,
  downloadFile,
  deleteFile,
  generateSignedUrl,
  optimizeImage,
  optimizeVideo
} from '@/services/cloudStorageService';

describe('云存储服务', () => {
  let cloudStorageService: CloudStorageService;

  beforeEach(async () => {
    // 重置所有模拟
    jest.clearAllMocks();
    
    // 设置模拟返回值
    const envConfigModule = await import('@/utils/envConfig');
    envConfigModule.envConfig = mockEnvConfig;
    
    const errorHandlerModule = await import('@/utils/errorHandler');
    errorHandlerModule.errorHandler = mockErrorHandler;
    
    const monitoringServiceModule = await import('@/services/monitoringService');
    monitoringServiceModule.monitoringService = mockMonitoringService;
    
    const userServiceModule = await import('@/services/userService');
    userServiceModule.userService = mockUserService;
    
    // 设置Supabase模拟
    const supabaseModule = await import('@supabase/supabase-js');
    supabaseModule.createClient = jest.fn(() => mockSupabase);
    
    // 设置云存储提供商模拟
    const alicloudOssModule = await import('@alicloud/oss');
    alicloudOssModule.default = jest.fn(() => mockAlicloudOss);
    
    const awsS3Module = await import('@aws-sdk/client-s3');
    awsS3Module.S3Client = jest.fn(() => mockAwsS3);
    
    const tencentCosModule = await import('cos-nodejs-sdk-v5');
    tencentCosModule.default = jest.fn(() => mockTencentCos);
    
    // 设置其他依赖模拟
    const cryptoModule = await import('node:crypto');
    cryptoModule.default = mockCrypto;
    
    const uuidModule = await import('uuid');
    uuidModule.default = mockUuid;
    
    const momentModule = await import('moment');
    momentModule.default = mockMoment;
    
    const redisModule = await import('redis');
    redisModule.createClient = jest.fn(() => mockRedis);
    
    const lodashModule = await import('lodash');
    lodashModule.default = mockLodash;
    
    const sharpModule = await import('sharp');
    sharpModule.default = mockSharp;
    
    const ffmpegModule = await import('fluent-ffmpeg');
    ffmpegModule.default = mockFfmpeg;
    
    const archiverModule = await import('archiver');
    archiverModule.default = mockArchiver;
    
    const unzipperModule = await import('unzipper');
    unzipperModule.default = mockUnzipper;
    
    const mimeTypesModule = await import('mime-types');
    mimeTypesModule.default = mockMimeTypes;
    
    const fileTypeModule = await import('file-type');
    fileTypeModule.default = mockFileType;
    
    const fsModule = await import('node:fs/promises');
    fsModule.default = mockFs;
    
    const pathModule = await import('node:path');
    pathModule.default = mockPath;
    
    const streamModule = await import('node:stream');
    streamModule.default = mockStream;
    
    // 创建云存储服务实例
    cloudStorageService = new CloudStorageService();
    
    // 设置默认模拟返回值
    mockUuid.v4.mockReturnValue('file-123');
    
    mockMoment().format.mockReturnValue('2023-01-01T12:00:00Z');
    mockMoment().toISOString.mockReturnValue('2023-01-01T12:00:00.000Z');
    mockMoment().valueOf.mockReturnValue(1672574400000);
    
    mockCrypto.randomBytes.mockReturnValue(Buffer.from('random-bytes'));
    mockCrypto.createHash().digest.mockReturnValue('file-hash');
    
    // Redis默认响应
    mockRedis.get.mockResolvedValue(null);
    mockRedis.set.mockResolvedValue('OK');
    mockRedis.exists.mockResolvedValue(0);
    mockRedis.hgetall.mockResolvedValue({});
    
    // Path默认响应
    mockPath.join.mockImplementation((...args) => args.join('/'));
    mockPath.extname.mockReturnValue('.jpg');
    mockPath.basename.mockReturnValue('image.jpg');
    mockPath.dirname.mockReturnValue('/uploads');
    
    // MIME类型默认响应
    mockMimeTypes.lookup.mockReturnValue('image/jpeg');
    mockMimeTypes.extension.mockReturnValue('jpg');
    
    // 文件类型检测默认响应
    mockFileType.fromBuffer.mockResolvedValue({
      ext: 'jpg',
      mime: 'image/jpeg'
    });
    
    // Sharp图片处理默认响应
    const mockSharpInstance = mockSharp();
    mockSharpInstance.metadata.mockResolvedValue({
      width: 1920,
      height: 1080,
      format: 'jpeg',
      size: 1024000
    });
    mockSharpInstance.toBuffer.mockResolvedValue(Buffer.from('optimized-image'));
    
    // FFmpeg视频处理默认响应
    const mockFfmpegInstance = mockFfmpeg();
    mockFfmpegInstance.on.mockImplementation((event, callback) => {
      if (event === 'end') {
        setTimeout(callback, 100);
      }
      return mockFfmpegInstance;
    });
    
    // 阿里云OSS默认响应
    mockAlicloudOss.put.mockResolvedValue({
      name: 'uploads/image.jpg',
      url: 'https://skillup-oss.oss-cn-hangzhou.aliyuncs.com/uploads/image.jpg',
      res: { status: 200 }
    });
    
    mockAlicloudOss.get.mockResolvedValue({
      content: Buffer.from('file-content'),
      res: { status: 200 }
    });
    
    mockAlicloudOss.delete.mockResolvedValue({
      res: { status: 204 }
    });
    
    mockAlicloudOss.signatureUrl.mockReturnValue(
      'https://skillup-oss.oss-cn-hangzhou.aliyuncs.com/uploads/image.jpg?signature=abc123'
    );
    
    mockAlicloudOss.head.mockResolvedValue({
      meta: {
        size: 1024000,
        lastModified: '2023-01-01T12:00:00.000Z'
      },
      res: { status: 200 }
    });
    
    // AWS S3默认响应
    mockAwsS3.send.mockResolvedValue({
      ETag: '"abc123"',
      Location: 'https://skillup-s3.s3.amazonaws.com/uploads/image.jpg'
    });
    
    // 腾讯云COS默认响应
    mockTencentCos.putObject.mockImplementation((params, callback) => {
      callback(null, {
        statusCode: 200,
        headers: {
          etag: '"abc123"'
        }
      });
    });
    
    mockTencentCos.getObject.mockImplementation((params, callback) => {
      callback(null, {
        statusCode: 200,
        Body: Buffer.from('file-content')
      });
    });
    
    // Supabase默认响应
    mockSupabase.from().insert().mockResolvedValue({
      data: [{ id: 'record-123' }],
      error: null
    });
    
    mockSupabase.from().select().mockResolvedValue({
      data: [],
      error: null
    });
    
    mockSupabase.from().update().mockResolvedValue({
      data: [{ id: 'record-123' }],
      error: null
    });
    
    mockSupabase.storage.from().upload.mockResolvedValue({
      data: {
        path: 'uploads/image.jpg',
        id: 'file-123',
        fullPath: 'skillup-storage/uploads/image.jpg'
      },
      error: null
    });
    
    // User service默认响应
    mockUserService.getUserById.mockResolvedValue({
      id: 'user-123',
      storageUsed: 1024000,
      storageLimit: 1073741824 // 1GB
    });
  });

  afterEach(() => {
    if (cloudStorageService) {
      cloudStorageService.destroy();
    }
  });

  describe('云存储服务初始化', () => {
    it('应该正确初始化云存储服务', async () => {
      await cloudStorageService.initialize();
      
      expect(cloudStorageService).toBeDefined();
      expect(cloudStorageService.provider).toBe('alicloud');
      expect(cloudStorageService.client).toBeDefined();
    });

    it('应该验证配置参数', () => {
      expect(cloudStorageService.config).toBeDefined();
      expect(cloudStorageService.config.CLOUD_STORAGE.provider).toBe('alicloud');
      expect(cloudStorageService.config.CLOUD_STORAGE.defaultBucket).toBe('skillup-storage');
    });

    it('应该初始化阿里云OSS客户端', async () => {
      await cloudStorageService.initialize();
      
      const alicloudOssModule = await import('@alicloud/oss');
      expect(alicloudOssModule.default).toHaveBeenCalledWith(
        expect.objectContaining({
          accessKeyId: 'alicloud-access-key',
          accessKeySecret: 'alicloud-secret-key',
          bucket: 'skillup-oss',
          region: 'oss-cn-hangzhou'
        })
      );
    });

    it('应该初始化AWS S3客户端', async () => {
      // 切换到AWS提供商
      mockEnvConfig.CLOUD_STORAGE.provider = 'aws';
      cloudStorageService = new CloudStorageService();
      
      await cloudStorageService.initialize();
      
      const awsS3Module = await import('@aws-sdk/client-s3');
      expect(awsS3Module.S3Client).toHaveBeenCalledWith(
        expect.objectContaining({
          region: 'us-east-1',
          credentials: {
            accessKeyId: 'aws-access-key',
            secretAccessKey: 'aws-secret-key'
          }
        })
      );
    });

    it('应该初始化腾讯云COS客户端', async () => {
      // 切换到腾讯云提供商
      mockEnvConfig.CLOUD_STORAGE.provider = 'tencent';
      cloudStorageService = new CloudStorageService();
      
      await cloudStorageService.initialize();
      
      const tencentCosModule = await import('cos-nodejs-sdk-v5');
      expect(tencentCosModule.default).toHaveBeenCalledWith(
        expect.objectContaining({
          SecretId: 'tencent-secret-id',
          SecretKey: 'tencent-secret-key'
        })
      );
    });
  });

  describe('文件上传', () => {
    beforeEach(async () => {
      await cloudStorageService.initialize();
    });

    it('应该成功上传文件', async () => {
      const fileData = {
        buffer: Buffer.from('test-file-content'),
        originalName: 'test.jpg',
        mimeType: 'image/jpeg',
        size: 1024000,
        userId: 'user-123'
      };
      
      const result = await uploadFile(fileData);
      
      expect(result.success).toBe(true);
      expect(result.url).toBeDefined();
      expect(result.key).toBeDefined();
      
      expect(mockAlicloudOss.put).toHaveBeenCalledWith(
        expect.stringContaining('uploads/'),
        fileData.buffer,
        expect.objectContaining({
          headers: {
            'Content-Type': 'image/jpeg'
          }
        })
      );
    });

    it('应该验证文件类型', async () => {
      const fileData = {
        buffer: Buffer.from('test-file-content'),
        originalName: 'test.exe',
        mimeType: 'application/x-msdownload',
        size: 1024000,
        userId: 'user-123'
      };
      
      const result = await uploadFile(fileData);
      
      expect(result.success).toBe(false);
      expect(result.error).toEqual(
        expect.objectContaining({
          type: 'INVALID_FILE_TYPE',
          message: 'File type not allowed'
        })
      );
    });

    it('应该验证文件大小', async () => {
      const fileData = {
        buffer: Buffer.from('test-file-content'),
        originalName: 'large-file.jpg',
        mimeType: 'image/jpeg',
        size: 200 * 1024 * 1024, // 200MB，超过限制
        userId: 'user-123'
      };
      
      const result = await uploadFile(fileData);
      
      expect(result.success).toBe(false);
      expect(result.error).toEqual(
        expect.objectContaining({
          type: 'FILE_TOO_LARGE',
          message: 'File size exceeds limit'
        })
      );
    });

    it('应该检查用户存储配额', async () => {
      mockUserService.getUserById.mockResolvedValue({
        id: 'user-123',
        storageUsed: 1073741824, // 1GB已使用
        storageLimit: 1073741824 // 1GB限制
      });
      
      const fileData = {
        buffer: Buffer.from('test-file-content'),
        originalName: 'test.jpg',
        mimeType: 'image/jpeg',
        size: 1024000,
        userId: 'user-123'
      };
      
      const result = await uploadFile(fileData);
      
      expect(result.success).toBe(false);
      expect(result.error).toEqual(
        expect.objectContaining({
          type: 'STORAGE_QUOTA_EXCEEDED',
          message: 'Storage quota exceeded'
        })
      );
    });

    it('应该生成唯一文件名', async () => {
      const fileData = {
        buffer: Buffer.from('test-file-content'),
        originalName: 'test.jpg',
        mimeType: 'image/jpeg',
        size: 1024000,
        userId: 'user-123'
      };
      
      await uploadFile(fileData);
      
      expect(mockUuid.v4).toHaveBeenCalled();
      expect(mockAlicloudOss.put).toHaveBeenCalledWith(
        expect.stringMatching(/uploads\/\d{4}\/\d{2}\/\d{2}\/file-123_test\.jpg/),
        expect.any(Buffer),
        expect.any(Object)
      );
    });

    it('应该优化图片文件', async () => {
      const fileData = {
        buffer: Buffer.from('test-image-content'),
        originalName: 'large-image.jpg',
        mimeType: 'image/jpeg',
        size: 5 * 1024 * 1024, // 5MB
        userId: 'user-123',
        optimize: true
      };
      
      await uploadFile(fileData);
      
      expect(mockSharp).toHaveBeenCalledWith(fileData.buffer);
      expect(mockSharp().resize).toHaveBeenCalledWith(1920, 1080, {
        fit: 'inside',
        withoutEnlargement: true
      });
      expect(mockSharp().jpeg).toHaveBeenCalledWith({ quality: 80 });
    });

    it('应该记录文件上传日志', async () => {
      const fileData = {
        buffer: Buffer.from('test-file-content'),
        originalName: 'test.jpg',
        mimeType: 'image/jpeg',
        size: 1024000,
        userId: 'user-123'
      };
      
      await uploadFile(fileData);
      
      expect(mockSupabase.from).toHaveBeenCalledWith('file_uploads');
      expect(mockSupabase.from().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          originalName: 'test.jpg',
          mimeType: 'image/jpeg',
          size: 1024000,
          key: expect.any(String),
          url: expect.any(String)
        })
      );
    });

    it('应该支持文件夹组织', async () => {
      const fileData = {
        buffer: Buffer.from('test-file-content'),
        originalName: 'document.pdf',
        mimeType: 'application/pdf',
        size: 1024000,
        userId: 'user-123',
        folder: 'documents/contracts'
      };
      
      await uploadFile(fileData);
      
      expect(mockAlicloudOss.put).toHaveBeenCalledWith(
        expect.stringContaining('documents/contracts/'),
        expect.any(Buffer),
        expect.any(Object)
      );
    });
  });

  describe('文件下载', () => {
    beforeEach(async () => {
      await cloudStorageService.initialize();
    });

    it('应该成功下载文件', async () => {
      const fileKey = 'uploads/2023/01/01/file-123_test.jpg';
      
      const result = await downloadFile(fileKey);
      
      expect(result.success).toBe(true);
      expect(result.buffer).toEqual(Buffer.from('file-content'));
      
      expect(mockAlicloudOss.get).toHaveBeenCalledWith(fileKey);
    });

    it('应该处理文件不存在的情况', async () => {
      const fileKey = 'uploads/non-existent.jpg';
      
      mockAlicloudOss.get.mockRejectedValue({
        code: 'NoSuchKey',
        message: 'The specified key does not exist.'
      });
      
      const result = await downloadFile(fileKey);
      
      expect(result.success).toBe(false);
      expect(result.error).toEqual(
        expect.objectContaining({
          type: 'FILE_NOT_FOUND',
          message: 'File not found'
        })
      );
    });

    it('应该验证文件访问权限', async () => {
      const fileKey = 'private/user-456/document.pdf';
      const userId = 'user-123'; // 不同用户
      
      const result = await cloudStorageService.downloadFileWithPermission(fileKey, userId);
      
      expect(result.success).toBe(false);
      expect(result.error).toEqual(
        expect.objectContaining({
          type: 'ACCESS_DENIED',
          message: 'Access denied'
        })
      );
    });

    it('应该支持流式下载', async () => {
      const fileKey = 'uploads/large-file.mp4';
      
      const stream = await cloudStorageService.downloadFileStream(fileKey);
      
      expect(stream).toBeDefined();
      expect(mockAlicloudOss.getStream).toHaveBeenCalledWith(fileKey);
    });

    it('应该记录文件下载日志', async () => {
      const fileKey = 'uploads/2023/01/01/file-123_test.jpg';
      const userId = 'user-123';
      
      await cloudStorageService.downloadFileWithPermission(fileKey, userId);
      
      expect(mockSupabase.from).toHaveBeenCalledWith('file_downloads');
      expect(mockSupabase.from().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          fileKey: fileKey,
          downloadedAt: expect.any(String)
        })
      );
    });
  });

  describe('文件删除', () => {
    beforeEach(async () => {
      await cloudStorageService.initialize();
    });

    it('应该成功删除文件', async () => {
      const fileKey = 'uploads/2023/01/01/file-123_test.jpg';
      
      const result = await deleteFile(fileKey);
      
      expect(result.success).toBe(true);
      
      expect(mockAlicloudOss.delete).toHaveBeenCalledWith(fileKey);
    });

    it('应该验证删除权限', async () => {
      const fileKey = 'private/user-456/document.pdf';
      const userId = 'user-123'; // 不同用户
      
      const result = await cloudStorageService.deleteFileWithPermission(fileKey, userId);
      
      expect(result.success).toBe(false);
      expect(result.error).toEqual(
        expect.objectContaining({
          type: 'ACCESS_DENIED',
          message: 'Access denied'
        })
      );
    });

    it('应该支持批量删除', async () => {
      const fileKeys = [
        'uploads/file1.jpg',
        'uploads/file2.jpg',
        'uploads/file3.jpg'
      ];
      
      const result = await cloudStorageService.deleteMultipleFiles(fileKeys);
      
      expect(result.success).toBe(true);
      expect(result.deleted).toBe(3);
      expect(result.failed).toBe(0);
      
      expect(mockAlicloudOss.delete).toHaveBeenCalledTimes(3);
    });

    it('应该更新用户存储使用量', async () => {
      const fileKey = 'uploads/2023/01/01/file-123_test.jpg';
      const userId = 'user-123';
      const fileSize = 1024000;
      
      mockSupabase.from().select().mockResolvedValue({
        data: [{
          id: 'file-123',
          size: fileSize,
          userId: userId
        }],
        error: null
      });
      
      await cloudStorageService.deleteFileWithPermission(fileKey, userId);
      
      expect(mockUserService.updateUserStorage).toHaveBeenCalledWith(
        userId,
        -fileSize
      );
    });

    it('应该记录文件删除日志', async () => {
      const fileKey = 'uploads/2023/01/01/file-123_test.jpg';
      const userId = 'user-123';
      
      await cloudStorageService.deleteFileWithPermission(fileKey, userId);
      
      expect(mockSupabase.from).toHaveBeenCalledWith('file_deletions');
      expect(mockSupabase.from().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          fileKey: fileKey,
          deletedAt: expect.any(String)
        })
      );
    });
  });

  describe('签名URL生成', () => {
    beforeEach(async () => {
      await cloudStorageService.initialize();
    });

    it('应该生成签名下载URL', async () => {
      const fileKey = 'uploads/2023/01/01/file-123_test.jpg';
      const expiration = 3600; // 1小时
      
      const result = await generateSignedUrl(fileKey, 'download', expiration);
      
      expect(result.success).toBe(true);
      expect(result.url).toBeDefined();
      expect(result.expiresAt).toBeDefined();
      
      expect(mockAlicloudOss.signatureUrl).toHaveBeenCalledWith(
        fileKey,
        expect.objectContaining({
          expires: expiration,
          method: 'GET'
        })
      );
    });

    it('应该生成签名上传URL', async () => {
      const fileKey = 'uploads/2023/01/01/new-file.jpg';
      const expiration = 1800; // 30分钟
      
      const result = await generateSignedUrl(fileKey, 'upload', expiration);
      
      expect(result.success).toBe(true);
      expect(result.url).toBeDefined();
      
      expect(mockAlicloudOss.signatureUrl).toHaveBeenCalledWith(
        fileKey,
        expect.objectContaining({
          expires: expiration,
          method: 'PUT'
        })
      );
    });

    it('应该缓存签名URL', async () => {
      const fileKey = 'uploads/2023/01/01/file-123_test.jpg';
      
      // 第一次生成
      await generateSignedUrl(fileKey, 'download', 3600);
      
      // 第二次生成（应该从缓存获取）
      await generateSignedUrl(fileKey, 'download', 3600);
      
      // 验证只调用了一次OSS API
      expect(mockAlicloudOss.signatureUrl).toHaveBeenCalledTimes(1);
      
      // 验证缓存操作
      expect(mockRedis.set).toHaveBeenCalledWith(
        expect.stringContaining('signed_url:'),
        expect.any(String),
        'EX',
        expect.any(Number)
      );
    });

    it('应该验证URL访问权限', async () => {
      const fileKey = 'private/user-456/document.pdf';
      const userId = 'user-123'; // 不同用户
      
      const result = await cloudStorageService.generateSignedUrlWithPermission(
        fileKey,
        'download',
        3600,
        userId
      );
      
      expect(result.success).toBe(false);
      expect(result.error).toEqual(
        expect.objectContaining({
          type: 'ACCESS_DENIED',
          message: 'Access denied'
        })
      );
    });
  });

  describe('文件优化', () => {
    beforeEach(async () => {
      await cloudStorageService.initialize();
    });

    it('应该优化图片文件', async () => {
      const imageBuffer = Buffer.from('test-image-content');
      
      const result = await optimizeImage(imageBuffer, {
        quality: 80,
        maxWidth: 1920,
        maxHeight: 1080,
        format: 'webp'
      });
      
      expect(result.success).toBe(true);
      expect(result.buffer).toEqual(Buffer.from('optimized-image'));
      
      expect(mockSharp).toHaveBeenCalledWith(imageBuffer);
      expect(mockSharp().resize).toHaveBeenCalledWith(1920, 1080, {
        fit: 'inside',
        withoutEnlargement: true
      });
      expect(mockSharp().webp).toHaveBeenCalledWith({ quality: 80 });
    });

    it('应该生成多种图片格式', async () => {
      const imageBuffer = Buffer.from('test-image-content');
      
      const result = await cloudStorageService.generateImageVariants(imageBuffer, {
        formats: ['webp', 'jpeg'],
        sizes: [
          { width: 1920, height: 1080, suffix: 'large' },
          { width: 800, height: 600, suffix: 'medium' },
          { width: 400, height: 300, suffix: 'small' }
        ]
      });
      
      expect(result.success).toBe(true);
      expect(result.variants).toHaveLength(6); // 2格式 × 3尺寸
      
      expect(mockSharp).toHaveBeenCalledTimes(6);
    });

    it('应该优化视频文件', async () => {
      const videoPath = '/tmp/input-video.mp4';
      const outputPath = '/tmp/output-video.mp4';
      
      const result = await optimizeVideo(videoPath, outputPath, {
        maxBitrate: '2M',
        maxResolution: '1080p',
        format: 'mp4'
      });
      
      expect(result.success).toBe(true);
      
      expect(mockFfmpeg).toHaveBeenCalled();
      expect(mockFfmpeg().videoBitrate).toHaveBeenCalledWith('2M');
      expect(mockFfmpeg().size).toHaveBeenCalledWith('1920x1080');
      expect(mockFfmpeg().format).toHaveBeenCalledWith('mp4');
    });

    it('应该提取视频缩略图', async () => {
      const videoPath = '/tmp/video.mp4';
      const thumbnailPath = '/tmp/thumbnail.jpg';
      
      const result = await cloudStorageService.extractVideoThumbnail(
        videoPath,
        thumbnailPath,
        { timestamp: '00:00:05' }
      );
      
      expect(result.success).toBe(true);
      
      expect(mockFfmpeg).toHaveBeenCalled();
      expect(mockFfmpeg().screenshots).toHaveBeenCalledWith(
        expect.objectContaining({
          timestamps: ['00:00:05'],
          filename: expect.any(String),
          folder: expect.any(String)
        })
      );
    });
  });

  describe('文件管理', () => {
    beforeEach(async () => {
      await cloudStorageService.initialize();
    });

    it('应该列出文件夹内容', async () => {
      const folderPath = 'uploads/2023/01/';
      
      mockAlicloudOss.list.mockResolvedValue({
        objects: [
          {
            name: 'uploads/2023/01/file1.jpg',
            size: 1024000,
            lastModified: '2023-01-01T12:00:00.000Z'
          },
          {
            name: 'uploads/2023/01/file2.pdf',
            size: 2048000,
            lastModified: '2023-01-01T13:00:00.000Z'
          }
        ]
      });
      
      const result = await cloudStorageService.listFiles(folderPath);
      
      expect(result.success).toBe(true);
      expect(result.files).toHaveLength(2);
      expect(result.files[0]).toEqual(
        expect.objectContaining({
          name: 'uploads/2023/01/file1.jpg',
          size: 1024000,
          lastModified: '2023-01-01T12:00:00.000Z'
        })
      );
    });

    it('应该获取文件元数据', async () => {
      const fileKey = 'uploads/2023/01/01/file-123_test.jpg';
      
      const result = await cloudStorageService.getFileMetadata(fileKey);
      
      expect(result.success).toBe(true);
      expect(result.metadata).toEqual(
        expect.objectContaining({
          size: 1024000,
          lastModified: '2023-01-01T12:00:00.000Z'
        })
      );
      
      expect(mockAlicloudOss.head).toHaveBeenCalledWith(fileKey);
    });

    it('应该复制文件', async () => {
      const sourceKey = 'uploads/source.jpg';
      const targetKey = 'uploads/copy.jpg';
      
      const result = await cloudStorageService.copyFile(sourceKey, targetKey);
      
      expect(result.success).toBe(true);
      
      expect(mockAlicloudOss.copy).toHaveBeenCalledWith(
        targetKey,
        sourceKey
      );
    });

    it('应该移动文件', async () => {
      const sourceKey = 'uploads/temp/file.jpg';
      const targetKey = 'uploads/permanent/file.jpg';
      
      const result = await cloudStorageService.moveFile(sourceKey, targetKey);
      
      expect(result.success).toBe(true);
      
      // 验证复制和删除操作
      expect(mockAlicloudOss.copy).toHaveBeenCalledWith(targetKey, sourceKey);
      expect(mockAlicloudOss.delete).toHaveBeenCalledWith(sourceKey);
    });

    it('应该创建文件夹', async () => {
      const folderPath = 'uploads/new-folder/';
      
      const result = await cloudStorageService.createFolder(folderPath);
      
      expect(result.success).toBe(true);
      
      // 验证创建空对象作为文件夹标记
      expect(mockAlicloudOss.put).toHaveBeenCalledWith(
        folderPath,
        Buffer.alloc(0)
      );
    });
  });

  describe('文件压缩和解压', () => {
    beforeEach(async () => {
      await cloudStorageService.initialize();
    });

    it('应该创建ZIP压缩包', async () => {
      const files = [
        { key: 'uploads/file1.jpg', name: 'file1.jpg' },
        { key: 'uploads/file2.pdf', name: 'file2.pdf' }
      ];
      const zipName = 'archive.zip';
      
      const result = await cloudStorageService.createZipArchive(files, zipName);
      
      expect(result.success).toBe(true);
      expect(result.zipKey).toBeDefined();
      
      expect(mockArchiver.create).toHaveBeenCalledWith('zip');
    });

    it('应该解压ZIP文件', async () => {
      const zipKey = 'uploads/archive.zip';
      const extractPath = 'uploads/extracted/';
      
      const result = await cloudStorageService.extractZipArchive(zipKey, extractPath);
      
      expect(result.success).toBe(true);
      expect(result.extractedFiles).toBeDefined();
      
      expect(mockUnzipper.Extract).toHaveBeenCalled();
    });
  });

  describe('文件统计和分析', () => {
    beforeEach(async () => {
      await cloudStorageService.initialize();
    });

    it('应该生成存储使用报告', async () => {
      const userId = 'user-123';
      const reportParams = {
        startDate: '2023-01-01',
        endDate: '2023-01-31',
        groupBy: 'day'
      };
      
      mockSupabase.from().select().mockResolvedValue({
        data: [
          {
            date: '2023-01-01',
            totalFiles: 100,
            totalSize: 1073741824, // 1GB
            uploadCount: 20,
            downloadCount: 50
          }
        ],
        error: null
      });
      
      const report = await cloudStorageService.generateStorageReport(userId, reportParams);
      
      expect(report).toEqual(
        expect.objectContaining({
          period: expect.any(Object),
          summary: expect.objectContaining({
            totalFiles: expect.any(Number),
            totalSize: expect.any(Number),
            averageFileSize: expect.any(Number)
          }),
          data: expect.any(Array)
        })
      );
    });

    it('应该分析文件类型分布', async () => {
      const userId = 'user-123';
      
      mockSupabase.from().select().mockResolvedValue({
        data: [
          { mimeType: 'image/jpeg', count: 50, totalSize: 524288000 },
          { mimeType: 'application/pdf', count: 20, totalSize: 209715200 },
          { mimeType: 'video/mp4', count: 5, totalSize: 1073741824 }
        ],
        error: null
      });
      
      const analysis = await cloudStorageService.analyzeFileTypes(userId);
      
      expect(analysis).toEqual(
        expect.objectContaining({
          distribution: expect.arrayContaining([
            expect.objectContaining({
              mimeType: 'image/jpeg',
              count: 50,
              totalSize: 524288000,
              percentage: expect.any(Number)
            })
          ]),
          summary: expect.objectContaining({
            totalTypes: 3,
            mostCommonType: 'image/jpeg',
            largestType: 'video/mp4'
          })
        })
      );
    });

    it('应该检测重复文件', async () => {
      const userId = 'user-123';
      
      mockSupabase.from().select().mockResolvedValue({
        data: [
          {
            hash: 'abc123',
            files: [
              { key: 'uploads/file1.jpg', size: 1024000 },
              { key: 'uploads/copy.jpg', size: 1024000 }
            ]
          }
        ],
        error: null
      });
      
      const duplicates = await cloudStorageService.findDuplicateFiles(userId);
      
      expect(duplicates).toEqual(
        expect.objectContaining({
          duplicateGroups: expect.arrayContaining([
            expect.objectContaining({
              hash: 'abc123',
              files: expect.any(Array),
              potentialSavings: expect.any(Number)
            })
          ]),
          summary: expect.objectContaining({
            totalDuplicates: expect.any(Number),
            potentialSavings: expect.any(Number)
          })
        })
      );
    });
  });

  describe('云存储服务性能', () => {
    beforeEach(async () => {
      await cloudStorageService.initialize();
    });

    it('应该高效处理大量文件上传', async () => {
      const files = Array.from({ length: 100 }, (_, i) => ({
        buffer: Buffer.from(`test-content-${i}`),
        originalName: `file${i}.txt`,
        mimeType: 'text/plain',
        size: 1024,
        userId: 'user-123'
      }));
      
      const { duration } = await testUtils.performanceUtils.measureTime(async () => {
        return Promise.all(files.map(file => uploadFile(file)));
      });
      
      expect(duration).toBeLessThan(30000); // 应该在30秒内完成
    });

    it('应该优化文件列表查询性能', async () => {
      const folderPath = 'uploads/';
      
      const { duration } = await testUtils.performanceUtils.measureTime(async () => {
        return Promise.all(Array.from({ length: 50 }, () => 
          cloudStorageService.listFiles(folderPath)
        ));
      });
      
      expect(duration).toBeLessThan(5000); // 应该在5秒内完成
    });

    it('应该优化签名URL生成性能', async () => {
      const fileKeys = Array.from({ length: 200 }, (_, i) => `uploads/file${i}.jpg`);
      
      const { duration } = await testUtils.performanceUtils.measureTime(async () => {
        return Promise.all(fileKeys.map(key => 
          generateSignedUrl(key, 'download', 3600)
        ));
      });
      
      expect(duration).toBeLessThan(3000); // 应该在3秒内完成
    });
  });

  describe('错误处理', () => {
    beforeEach(async () => {
      await cloudStorageService.initialize();
    });

    it('应该处理网络连接错误', async () => {
      mockAlicloudOss.put.mockRejectedValue(
        new Error('Network connection failed')
      );
      
      const fileData = {
        buffer: Buffer.from('test-content'),
        originalName: 'test.txt',
        mimeType: 'text/plain',
        size: 1024,
        userId: 'user-123'
      };
      
      const result = await uploadFile(fileData);
      
      expect(result.success).toBe(false);
      expect(result.error).toEqual(
        expect.objectContaining({
          type: 'NETWORK_ERROR',
          message: 'Network connection failed'
        })
      );
      
      expect(mockErrorHandler.logError).toHaveBeenCalled();
    });

    it('应该处理存储空间不足错误', async () => {
      mockAlicloudOss.put.mockRejectedValue({
        code: 'InsufficientStorage',
        message: 'Insufficient storage space'
      });
      
      const fileData = {
        buffer: Buffer.from('test-content'),
        originalName: 'test.txt',
        mimeType: 'text/plain',
        size: 1024,
        userId: 'user-123'
      };
      
      const result = await uploadFile(fileData);
      
      expect(result.success).toBe(false);
      expect(result.error).toEqual(
        expect.objectContaining({
          type: 'STORAGE_ERROR',
          message: 'Insufficient storage space'
        })
      );
    });

    it('应该处理文件损坏错误', async () => {
      mockFileType.fromBuffer.mockRejectedValue(
        new Error('File is corrupted')
      );
      
      const fileData = {
        buffer: Buffer.from('corrupted-content'),
        originalName: 'test.jpg',
        mimeType: 'image/jpeg',
        size: 1024,
        userId: 'user-123'
      };
      
      const result = await uploadFile(fileData);
      
      expect(result.success).toBe(false);
      expect(result.error).toEqual(
        expect.objectContaining({
          type: 'FILE_CORRUPTED',
          message: 'File is corrupted'
        })
      );
    });

    it('应该处理Redis缓存错误', async () => {
      mockRedis.set.mockRejectedValue(new Error('Redis connection failed'));
      
      const fileKey = 'uploads/test.jpg';
      
      // 应该降级到直接生成URL，不使用缓存
      const result = await generateSignedUrl(fileKey, 'download', 3600);
      
      expect(result.success).toBe(true); // 仍然成功生成
      expect(mockErrorHandler.logError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Redis connection failed'
        })
      );
    });
  });
});