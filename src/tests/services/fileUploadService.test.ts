/**
 * 文件上传服务单元测试
 * 测试文件上传、验证、云存储、进度跟踪等功能
 * 
 * @author SOLO Coding
 * @version 1.0.0
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { Readable } from 'stream';

// 模拟依赖
jest.mock('../../config/envConfig', () => ({
  envConfig: {
    upload: {
      maxFileSize: 10 * 1024 * 1024, // 10MB
      allowedTypes: ['image/jpeg', 'image/png', 'application/pdf'],
      uploadPath: '/uploads',
      tempPath: '/tmp',
      enableVirusScan: true,
      enableCompression: true
    },
    cloud: {
      provider: 'aliyun',
      accessKeyId: 'test_key',
      accessKeySecret: 'test_secret',
      bucket: 'test-bucket',
      region: 'oss-cn-hangzhou',
      endpoint: 'https://oss-cn-hangzhou.aliyuncs.com'
    }
  }
}));

jest.mock('../../utils/errorHandler', () => ({
  errorHandler: {
    handleError: jest.fn(),
    logError: jest.fn(),
    createError: jest.fn((message: string, code?: string) => new Error(message))
  }
}));

jest.mock('../../utils/validator', () => ({
  validator: {
    validateRequired: jest.fn(() => true),
    validateString: jest.fn(() => true),
    validateNumber: jest.fn(() => true),
    validateObject: jest.fn(() => true),
    validateFileType: jest.fn(() => true),
    validateFileSize: jest.fn(() => true)
  }
}));

// 模拟 multer
const mockMulter = {
  single: jest.fn(() => (req: Express.Request, res: Express.Response, next: Express.NextFunction) => {
    req.file = {
      fieldname: 'file',
      originalname: 'test.jpg',
      encoding: '7bit',
      mimetype: 'image/jpeg',
      size: 1024,
      buffer: Buffer.from('test file content'),
      filename: 'test.jpg',
      path: '/tmp/test.jpg'
    };
    next();
  }),
  array: jest.fn(() => (req: Express.Request, res: Express.Response, next: Express.NextFunction) => {
    req.files = [
      {
        fieldname: 'files',
        originalname: 'test1.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        size: 1024,
        buffer: Buffer.from('test file 1'),
        filename: 'test1.jpg',
        path: '/tmp/test1.jpg'
      },
      {
        fieldname: 'files',
        originalname: 'test2.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        size: 2048,
        buffer: Buffer.from('test file 2'),
        filename: 'test2.jpg',
        path: '/tmp/test2.jpg'
      }
    ];
    next();
  }),
  memoryStorage: jest.fn(() => ({})),
  diskStorage: jest.fn(() => ({}))
};

jest.mock('multer', () => jest.fn(() => mockMulter));

// 模拟 fs
const mockFs = {
  promises: {
    access: jest.fn(),
    mkdir: jest.fn(),
    unlink: jest.fn(),
    stat: jest.fn(() => Promise.resolve({ size: 1024, isFile: () => true })),
    readFile: jest.fn(() => Promise.resolve(Buffer.from('test content'))),
    writeFile: jest.fn()
  },
  createReadStream: jest.fn(() => new Readable({
    read() {
      this.push('test content');
      this.push(null);
    }
  })),
  createWriteStream: jest.fn(() => ({
    write: jest.fn(),
    end: jest.fn(),
    on: jest.fn()
  }))
};

jest.mock('fs', () => mockFs);

// 模拟 path
jest.mock('path', () => ({
  join: jest.fn((...args) => args.join('/')),
  extname: jest.fn((filename) => {
    const parts = filename.split('.');
    return parts.length > 1 ? '.' + parts[parts.length - 1] : '';
  }),
  basename: jest.fn((filename) => filename.split('/').pop()),
  dirname: jest.fn((filepath) => filepath.split('/').slice(0, -1).join('/'))
}));

// 模拟 crypto
jest.mock('crypto', () => ({
  randomUUID: jest.fn(() => 'test-uuid-123'),
  createHash: jest.fn(() => ({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn(() => 'test-hash-123')
  }))
}));

// 模拟阿里云OSS
const mockOSS = {
  put: jest.fn(() => Promise.resolve({
    name: 'test.jpg',
    url: 'https://test-bucket.oss-cn-hangzhou.aliyuncs.com/test.jpg',
    res: { status: 200 }
  })),
  delete: jest.fn(() => Promise.resolve({ res: { status: 204 } })),
  head: jest.fn(() => Promise.resolve({
    meta: { size: 1024 },
    res: { status: 200 }
  })),
  get: jest.fn(() => Promise.resolve({
    content: Buffer.from('test content'),
    res: { status: 200 }
  })),
  list: jest.fn(() => Promise.resolve({
    objects: [
      { name: 'test1.jpg', size: 1024 },
      { name: 'test2.jpg', size: 2048 }
    ]
  }))
};

jest.mock('ali-oss', () => jest.fn(() => mockOSS));

// 模拟 sharp (图片处理)
const mockSharp = {
  resize: jest.fn().mockReturnThis(),
  jpeg: jest.fn().mockReturnThis(),
  png: jest.fn().mockReturnThis(),
  webp: jest.fn().mockReturnThis(),
  toBuffer: jest.fn(() => Promise.resolve(Buffer.from('compressed image'))),
  metadata: jest.fn(() => Promise.resolve({
    width: 1920,
    height: 1080,
    format: 'jpeg',
    size: 1024
  }))
};

jest.mock('sharp', () => jest.fn(() => mockSharp));

// 导入要测试的模块
import {
  // 文件上传管理
  initializeUploadService,
  destroyUploadService,
  isUploadServiceInitialized,
  getUploadServiceStatus,
  
  // 文件上传操作
  uploadSingleFile,
  uploadMultipleFiles,
  uploadFromUrl,
  uploadFromBuffer,
  
  // 文件验证
  validateFile,
  validateFileType,
  validateFileSize,
  scanFileForVirus,
  
  // 文件处理
  processImage,
  compressFile,
  generateThumbnail,
  extractMetadata,
  
  // 云存储操作
  uploadToCloud,
  downloadFromCloud,
  deleteFromCloud,
  getCloudFileInfo,
  listCloudFiles,
  
  // 文件管理
  moveFile,
  copyFile,
  deleteFile,
  getFileInfo,
  listFiles,
  
  // 进度跟踪
  trackUploadProgress,
  getUploadProgress,
  cancelUpload,
  
  // 临时文件管理
  createTempFile,
  deleteTempFile,
  cleanupTempFiles,
  
  // 文件安全
  generateSecureUrl,
  validateSecureUrl,
  setFilePermissions,
  
  // 批量操作
  batchUpload,
  batchDelete,
  batchMove,
  
  // 统计和监控
  getUploadStats,
  getStorageUsage,
  getUploadHistory,
  
  // 配置管理
  getUploadConfig,
  updateUploadConfig,
  
  // 类型定义
  UploadConfig,
  FileInfo,
  UploadResult,
  UploadProgress,
  CloudConfig,
  FileMetadata,
  UploadStats,
  
  // 文件上传服务实例
  fileUploadService
} from '../../services/fileUploadService';

describe('文件上传服务测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  /**
   * 文件上传管理测试
   */
  describe('文件上传管理', () => {
    it('应该成功初始化文件上传服务', async () => {
      const result = await initializeUploadService();
      expect(result).toBe(true);
      expect(isUploadServiceInitialized()).toBe(true);
    });

    it('应该处理文件上传服务初始化失败', async () => {
      mockFs.promises.mkdir.mockRejectedValueOnce(new Error('创建目录失败'));
      
      const result = await initializeUploadService();
      expect(result).toBe(false);
    });

    it('应该成功销毁文件上传服务', async () => {
      await initializeUploadService();
      const result = await destroyUploadService();
      expect(result).toBe(true);
      expect(isUploadServiceInitialized()).toBe(false);
    });

    it('应该获取文件上传服务状态', async () => {
      await initializeUploadService();
      const status = await getUploadServiceStatus();
      
      expect(status).toHaveProperty('initialized');
      expect(status).toHaveProperty('uploadsCount');
      expect(status).toHaveProperty('storageUsage');
    });
  });

  /**
   * 文件上传操作测试
   */
  describe('文件上传操作', () => {
    beforeEach(async () => {
      await initializeUploadService();
    });

    it('应该成功上传单个文件', async () => {
      const file = {
        originalname: 'test.jpg',
        mimetype: 'image/jpeg',
        size: 1024,
        buffer: Buffer.from('test content')
      };
      
      const result = await uploadSingleFile(file);
      
      expect(result).toHaveProperty('filename');
      expect(result).toHaveProperty('url');
      expect(result).toHaveProperty('size');
      expect(result.success).toBe(true);
    });

    it('应该成功上传多个文件', async () => {
      const files = [
        {
          originalname: 'test1.jpg',
          mimetype: 'image/jpeg',
          size: 1024,
          buffer: Buffer.from('test content 1')
        },
        {
          originalname: 'test2.jpg',
          mimetype: 'image/jpeg',
          size: 2048,
          buffer: Buffer.from('test content 2')
        }
      ];
      
      const results = await uploadMultipleFiles(files);
      
      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
    });

    it('应该成功从URL上传文件', async () => {
      const testUrl = 'https://example.com/test.jpg';
      
      // 模拟HTTP请求
      global.fetch = jest.fn(() => Promise.resolve({
        ok: true,
        headers: {
          get: jest.fn((header) => {
            if (header === 'content-type') return 'image/jpeg';
            if (header === 'content-length') return '1024';
            return null;
          })
        },
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024))
      })) as jest.Mock;
      
      const result = await uploadFromUrl(testUrl);
      
      expect(result).toHaveProperty('filename');
      expect(result).toHaveProperty('url');
      expect(result.success).toBe(true);
    });

    it('应该成功从Buffer上传文件', async () => {
      const buffer = Buffer.from('test content');
      const filename = 'test.txt';
      const mimetype = 'text/plain';
      
      const result = await uploadFromBuffer(buffer, filename, mimetype);
      
      expect(result).toHaveProperty('filename');
      expect(result).toHaveProperty('url');
      expect(result.success).toBe(true);
    });
  });

  /**
   * 文件验证测试
   */
  describe('文件验证', () => {
    beforeEach(async () => {
      await initializeUploadService();
    });

    it('应该成功验证有效文件', async () => {
      const file = {
        originalname: 'test.jpg',
        mimetype: 'image/jpeg',
        size: 1024,
        buffer: Buffer.from('test content')
      };
      
      const result = await validateFile(file);
      expect(result.valid).toBe(true);
    });

    it('应该拒绝无效文件类型', async () => {
      const file = {
        originalname: 'test.exe',
        mimetype: 'application/x-executable',
        size: 1024,
        buffer: Buffer.from('test content')
      };
      
      const result = await validateFile(file);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('不支持的文件类型');
    });

    it('应该拒绝超大文件', async () => {
      const file = {
        originalname: 'test.jpg',
        mimetype: 'image/jpeg',
        size: 20 * 1024 * 1024, // 20MB
        buffer: Buffer.from('test content')
      };
      
      const result = await validateFile(file);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('文件大小超出限制');
    });

    it('应该验证文件类型', async () => {
      const validType = await validateFileType('image/jpeg');
      expect(validType).toBe(true);
      
      const invalidType = await validateFileType('application/x-executable');
      expect(invalidType).toBe(false);
    });

    it('应该验证文件大小', async () => {
      const validSize = await validateFileSize(1024);
      expect(validSize).toBe(true);
      
      const invalidSize = await validateFileSize(20 * 1024 * 1024);
      expect(invalidSize).toBe(false);
    });

    it('应该扫描文件病毒', async () => {
      const cleanFile = Buffer.from('clean content');
      const result = await scanFileForVirus(cleanFile);
      
      expect(result).toHaveProperty('clean');
      expect(result).toHaveProperty('threats');
      expect(result.clean).toBe(true);
    });
  });

  /**
   * 文件处理测试
   */
  describe('文件处理', () => {
    beforeEach(async () => {
      await initializeUploadService();
    });

    it('应该成功处理图片', async () => {
      const imageBuffer = Buffer.from('image content');
      
      const result = await processImage(imageBuffer, {
        width: 800,
        height: 600,
        quality: 80,
        format: 'jpeg'
      });
      
      expect(result).toHaveProperty('buffer');
      expect(result).toHaveProperty('metadata');
      expect(mockSharp.resize).toHaveBeenCalledWith(800, 600);
    });

    it('应该成功压缩文件', async () => {
      const fileBuffer = Buffer.from('file content');
      
      const result = await compressFile(fileBuffer, 'image/jpeg', {
        quality: 0.8,
        progressive: true
      });
      
      expect(result).toHaveProperty('buffer');
      expect(result).toHaveProperty('originalSize');
      expect(result).toHaveProperty('compressedSize');
      expect(result).toHaveProperty('compressionRatio');
    });

    it('应该成功生成缩略图', async () => {
      const imageBuffer = Buffer.from('image content');
      
      const result = await generateThumbnail(imageBuffer, {
        width: 200,
        height: 200,
        fit: 'cover'
      });
      
      expect(result).toHaveProperty('buffer');
      expect(result).toHaveProperty('width');
      expect(result).toHaveProperty('height');
    });

    it('应该成功提取文件元数据', async () => {
      const file = {
        originalname: 'test.jpg',
        mimetype: 'image/jpeg',
        size: 1024,
        buffer: Buffer.from('image content')
      };
      
      const metadata = await extractMetadata(file);
      
      expect(metadata).toHaveProperty('filename');
      expect(metadata).toHaveProperty('size');
      expect(metadata).toHaveProperty('type');
      expect(metadata).toHaveProperty('hash');
    });
  });

  /**
   * 云存储操作测试
   */
  describe('云存储操作', () => {
    beforeEach(async () => {
      await initializeUploadService();
    });

    it('应该成功上传文件到云存储', async () => {
      const fileBuffer = Buffer.from('test content');
      const filename = 'test.jpg';
      
      const result = await uploadToCloud(fileBuffer, filename, {
        contentType: 'image/jpeg',
        public: true
      });
      
      expect(result).toHaveProperty('url');
      expect(result).toHaveProperty('key');
      expect(result.success).toBe(true);
      expect(mockOSS.put).toHaveBeenCalled();
    });

    it('应该成功从云存储下载文件', async () => {
      const filename = 'test.jpg';
      
      const result = await downloadFromCloud(filename);
      
      expect(result).toHaveProperty('buffer');
      expect(result).toHaveProperty('metadata');
      expect(mockOSS.get).toHaveBeenCalledWith(filename);
    });

    it('应该成功从云存储删除文件', async () => {
      const filename = 'test.jpg';
      
      const result = await deleteFromCloud(filename);
      
      expect(result).toBe(true);
      expect(mockOSS.delete).toHaveBeenCalledWith(filename);
    });

    it('应该成功获取云文件信息', async () => {
      const filename = 'test.jpg';
      
      const info = await getCloudFileInfo(filename);
      
      expect(info).toHaveProperty('size');
      expect(info).toHaveProperty('lastModified');
      expect(mockOSS.head).toHaveBeenCalledWith(filename);
    });

    it('应该成功列出云文件', async () => {
      const prefix = 'uploads/';
      
      const files = await listCloudFiles(prefix);
      
      expect(Array.isArray(files)).toBe(true);
      expect(files.length).toBeGreaterThan(0);
      expect(mockOSS.list).toHaveBeenCalled();
    });
  });

  /**
   * 文件管理测试
   */
  describe('文件管理', () => {
    beforeEach(async () => {
      await initializeUploadService();
    });

    it('应该成功移动文件', async () => {
      const sourcePath = '/tmp/test.jpg';
      const targetPath = '/uploads/test.jpg';
      
      const result = await moveFile(sourcePath, targetPath);
      expect(result).toBe(true);
    });

    it('应该成功复制文件', async () => {
      const sourcePath = '/uploads/test.jpg';
      const targetPath = '/uploads/copy_test.jpg';
      
      const result = await copyFile(sourcePath, targetPath);
      expect(result).toBe(true);
    });

    it('应该成功删除文件', async () => {
      const filePath = '/uploads/test.jpg';
      
      const result = await deleteFile(filePath);
      expect(result).toBe(true);
      expect(mockFs.promises.unlink).toHaveBeenCalledWith(filePath);
    });

    it('应该成功获取文件信息', async () => {
      const filePath = '/uploads/test.jpg';
      
      const info = await getFileInfo(filePath);
      
      expect(info).toHaveProperty('size');
      expect(info).toHaveProperty('created');
      expect(info).toHaveProperty('modified');
      expect(mockFs.promises.stat).toHaveBeenCalledWith(filePath);
    });

    it('应该成功列出文件', async () => {
      const directory = '/uploads';
      
      const files = await listFiles(directory);
      
      expect(Array.isArray(files)).toBe(true);
    });
  });

  /**
   * 进度跟踪测试
   */
  describe('进度跟踪', () => {
    beforeEach(async () => {
      await initializeUploadService();
    });

    it('应该成功跟踪上传进度', async () => {
      const uploadId = 'upload-123';
      const progress = {
        loaded: 512,
        total: 1024,
        percentage: 50
      };
      
      await trackUploadProgress(uploadId, progress);
      
      const trackedProgress = await getUploadProgress(uploadId);
      expect(trackedProgress).toEqual(progress);
    });

    it('应该成功取消上传', async () => {
      const uploadId = 'upload-123';
      
      const result = await cancelUpload(uploadId);
      expect(result).toBe(true);
    });
  });

  /**
   * 临时文件管理测试
   */
  describe('临时文件管理', () => {
    beforeEach(async () => {
      await initializeUploadService();
    });

    it('应该成功创建临时文件', async () => {
      const content = Buffer.from('temp content');
      const extension = '.tmp';
      
      const tempFile = await createTempFile(content, extension);
      
      expect(tempFile).toHaveProperty('path');
      expect(tempFile).toHaveProperty('filename');
      expect(mockFs.promises.writeFile).toHaveBeenCalled();
    });

    it('应该成功删除临时文件', async () => {
      const tempPath = '/tmp/temp-file.tmp';
      
      const result = await deleteTempFile(tempPath);
      expect(result).toBe(true);
      expect(mockFs.promises.unlink).toHaveBeenCalledWith(tempPath);
    });

    it('应该成功清理临时文件', async () => {
      const result = await cleanupTempFiles();
      expect(typeof result).toBe('number');
    });
  });

  /**
   * 文件安全测试
   */
  describe('文件安全', () => {
    beforeEach(async () => {
      await initializeUploadService();
    });

    it('应该成功生成安全URL', async () => {
      const filename = 'test.jpg';
      
      const secureUrl = await generateSecureUrl(filename, {
        expiresIn: 3600,
        permissions: ['read']
      });
      
      expect(secureUrl).toHaveProperty('url');
      expect(secureUrl).toHaveProperty('token');
      expect(secureUrl).toHaveProperty('expiresAt');
    });

    it('应该成功验证安全URL', async () => {
      const token = 'secure-token-123';
      
      const result = await validateSecureUrl(token);
      
      expect(result).toHaveProperty('valid');
      expect(result).toHaveProperty('filename');
      expect(result).toHaveProperty('permissions');
    });

    it('应该成功设置文件权限', async () => {
      const filename = 'test.jpg';
      const permissions = {
        read: ['user1', 'user2'],
        write: ['user1'],
        delete: ['admin']
      };
      
      const result = await setFilePermissions(filename, permissions);
      expect(result).toBe(true);
    });
  });

  /**
   * 批量操作测试
   */
  describe('批量操作', () => {
    beforeEach(async () => {
      await initializeUploadService();
    });

    it('应该成功批量上传文件', async () => {
      const files = [
        {
          originalname: 'test1.jpg',
          mimetype: 'image/jpeg',
          size: 1024,
          buffer: Buffer.from('content 1')
        },
        {
          originalname: 'test2.jpg',
          mimetype: 'image/jpeg',
          size: 2048,
          buffer: Buffer.from('content 2')
        }
      ];
      
      const results = await batchUpload(files);
      
      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
    });

    it('应该成功批量删除文件', async () => {
      const filenames = ['test1.jpg', 'test2.jpg', 'test3.jpg'];
      
      const results = await batchDelete(filenames);
      
      expect(results).toHaveLength(3);
      expect(results.every(r => r.success)).toBe(true);
    });

    it('应该成功批量移动文件', async () => {
      const operations = [
        { source: '/tmp/test1.jpg', target: '/uploads/test1.jpg' },
        { source: '/tmp/test2.jpg', target: '/uploads/test2.jpg' }
      ];
      
      const results = await batchMove(operations);
      
      expect(results).toHaveLength(2);
      expect(results.every(r => r.success)).toBe(true);
    });
  });

  /**
   * 统计和监控测试
   */
  describe('统计和监控', () => {
    beforeEach(async () => {
      await initializeUploadService();
    });

    it('应该获取上传统计信息', async () => {
      const stats = await getUploadStats();
      
      expect(stats).toHaveProperty('totalUploads');
      expect(stats).toHaveProperty('successfulUploads');
      expect(stats).toHaveProperty('failedUploads');
      expect(stats).toHaveProperty('totalSize');
      expect(stats).toHaveProperty('averageFileSize');
    });

    it('应该获取存储使用情况', async () => {
      const usage = await getStorageUsage();
      
      expect(usage).toHaveProperty('totalSize');
      expect(usage).toHaveProperty('usedSize');
      expect(usage).toHaveProperty('availableSize');
      expect(usage).toHaveProperty('fileCount');
    });

    it('应该获取上传历史', async () => {
      
      const history = await getUploadHistory({
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        limit: 100
      });
      
      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBeLessThanOrEqual(100);
    });
  });

  /**
   * 配置管理测试
   */
  describe('配置管理', () => {
    it('应该获取上传配置', async () => {
      const config = await getUploadConfig();
      
      expect(config).toHaveProperty('maxFileSize');
      expect(config).toHaveProperty('allowedTypes');
      expect(config).toHaveProperty('uploadPath');
      expect(config).toHaveProperty('enableVirusScan');
    });

    it('应该成功更新上传配置', async () => {
      const newConfig = {
        maxFileSize: 20 * 1024 * 1024,
        allowedTypes: ['image/jpeg', 'image/png', 'image/gif']
      };
      
      const result = await updateUploadConfig(newConfig);
      expect(result).toBe(true);
    });
  });

  /**
   * 错误处理测试
   */
  describe('错误处理', () => {
    beforeEach(async () => {
      await initializeUploadService();
    });

    it('应该处理文件上传失败', async () => {
      mockFs.promises.writeFile.mockRejectedValueOnce(new Error('写入失败'));
      
      const file = {
        originalname: 'test.jpg',
        mimetype: 'image/jpeg',
        size: 1024,
        buffer: Buffer.from('test content')
      };
      
      await expect(uploadSingleFile(file)).rejects.toThrow('写入失败');
    });

    it('应该处理云存储上传失败', async () => {
      mockOSS.put.mockRejectedValueOnce(new Error('云存储错误'));
      
      const fileBuffer = Buffer.from('test content');
      const filename = 'test.jpg';
      
      await expect(uploadToCloud(fileBuffer, filename)).rejects.toThrow('云存储错误');
    });

    it('应该处理文件不存在错误', async () => {
      mockFs.promises.stat.mockRejectedValueOnce(new Error('文件不存在'));
      
      await expect(getFileInfo('/nonexistent/file.jpg')).rejects.toThrow('文件不存在');
    });

    it('应该处理权限不足错误', async () => {
      mockFs.promises.unlink.mockRejectedValueOnce(new Error('权限不足'));
      
      await expect(deleteFile('/protected/file.jpg')).rejects.toThrow('权限不足');
    });
  });

  /**
   * 性能测试
   */
  describe('性能测试', () => {
    beforeEach(async () => {
      await initializeUploadService();
    });

    it('应该快速处理大量文件上传', async () => {
      const startTime = Date.now();
      const files = [];
      
      for (let i = 0; i < 50; i++) {
        files.push({
          originalname: `test${i}.jpg`,
          mimetype: 'image/jpeg',
          size: 1024,
          buffer: Buffer.from(`content ${i}`)
        });
      }
      
      const results = await batchUpload(files);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(results).toHaveLength(50);
      expect(duration).toBeLessThan(10000); // 应该在10秒内完成
    });

    it('应该高效处理大文件上传', async () => {
      const startTime = Date.now();
      const largeBuffer = Buffer.alloc(5 * 1024 * 1024); // 5MB
      
      const file = {
        originalname: 'large.jpg',
        mimetype: 'image/jpeg',
        size: largeBuffer.length,
        buffer: largeBuffer
      };
      
      const result = await uploadSingleFile(file);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(30000); // 应该在30秒内完成
    });

    it('应该优化内存使用', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // 上传多个大文件
      for (let i = 0; i < 10; i++) {
        const buffer = Buffer.alloc(1024 * 1024); // 1MB
        const file = {
          originalname: `large${i}.jpg`,
          mimetype: 'image/jpeg',
          size: buffer.length,
          buffer
        };
        
        await uploadSingleFile(file);
      }
      
      // 强制垃圾回收
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // 内存增长应该在合理范围内
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // 小于50MB
    });
  });

  /**
   * 导出测试
   */
  describe('文件上传服务导出', () => {
    it('应该导出所有文件上传管理函数', () => {
      expect(typeof initializeUploadService).toBe('function');
      expect(typeof destroyUploadService).toBe('function');
      expect(typeof isUploadServiceInitialized).toBe('function');
      expect(typeof getUploadServiceStatus).toBe('function');
    });

    it('应该导出所有文件上传操作函数', () => {
      expect(typeof uploadSingleFile).toBe('function');
      expect(typeof uploadMultipleFiles).toBe('function');
      expect(typeof uploadFromUrl).toBe('function');
      expect(typeof uploadFromBuffer).toBe('function');
    });

    it('应该导出所有文件验证函数', () => {
      expect(typeof validateFile).toBe('function');
      expect(typeof validateFileType).toBe('function');
      expect(typeof validateFileSize).toBe('function');
      expect(typeof scanFileForVirus).toBe('function');
    });

    it('应该导出所有文件处理函数', () => {
      expect(typeof processImage).toBe('function');
      expect(typeof compressFile).toBe('function');
      expect(typeof generateThumbnail).toBe('function');
      expect(typeof extractMetadata).toBe('function');
    });

    it('应该导出所有云存储操作函数', () => {
      expect(typeof uploadToCloud).toBe('function');
      expect(typeof downloadFromCloud).toBe('function');
      expect(typeof deleteFromCloud).toBe('function');
      expect(typeof getCloudFileInfo).toBe('function');
      expect(typeof listCloudFiles).toBe('function');
    });

    it('应该导出所有文件管理函数', () => {
      expect(typeof moveFile).toBe('function');
      expect(typeof copyFile).toBe('function');
      expect(typeof deleteFile).toBe('function');
      expect(typeof getFileInfo).toBe('function');
      expect(typeof listFiles).toBe('function');
    });

    it('应该导出所有进度跟踪函数', () => {
      expect(typeof trackUploadProgress).toBe('function');
      expect(typeof getUploadProgress).toBe('function');
      expect(typeof cancelUpload).toBe('function');
    });

    it('应该导出所有临时文件管理函数', () => {
      expect(typeof createTempFile).toBe('function');
      expect(typeof deleteTempFile).toBe('function');
      expect(typeof cleanupTempFiles).toBe('function');
    });

    it('应该导出所有文件安全函数', () => {
      expect(typeof generateSecureUrl).toBe('function');
      expect(typeof validateSecureUrl).toBe('function');
      expect(typeof setFilePermissions).toBe('function');
    });

    it('应该导出所有批量操作函数', () => {
      expect(typeof batchUpload).toBe('function');
      expect(typeof batchDelete).toBe('function');
      expect(typeof batchMove).toBe('function');
    });

    it('应该导出所有统计和监控函数', () => {
      expect(typeof getUploadStats).toBe('function');
      expect(typeof getStorageUsage).toBe('function');
      expect(typeof getUploadHistory).toBe('function');
    });

    it('应该导出所有配置管理函数', () => {
      expect(typeof getUploadConfig).toBe('function');
      expect(typeof updateUploadConfig).toBe('function');
    });

    it('应该导出所有类型定义', () => {
      expect(UploadConfig).toBeDefined();
      expect(FileInfo).toBeDefined();
      expect(UploadResult).toBeDefined();
      expect(UploadProgress).toBeDefined();
      expect(CloudConfig).toBeDefined();
      expect(FileMetadata).toBeDefined();
      expect(UploadStats).toBeDefined();
    });

    it('应该导出文件上传服务实例', () => {
      expect(fileUploadService).toBeDefined();
      expect(typeof fileUploadService).toBe('object');
    });
  });
});