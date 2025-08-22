/**
 * 云存储服务单元测试
 * 测试文件上传、下载、删除等云存储功能
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import {
  CloudStorageService,
  uploadFile,
  downloadFile,
  deleteFile,
  getFileUrl,
  CloudStorageConfig
} from '@/services/cloudStorageService';
import { testUtils } from '../setup';

// 模拟云存储客户端
const mockStorageClient = {
  upload: jest.fn(),
  download: jest.fn(),
  delete: jest.fn(),
  getSignedUrl: jest.fn(),
  listFiles: jest.fn(),
  copyFile: jest.fn(),
  moveFile: jest.fn(),
  getFileInfo: jest.fn()
};

// 模拟环境配置
const mockEnvConfig = {
  getCloudStorage: jest.fn(() => ({
    client: mockStorageClient,
    bucket: 'test-bucket',
    region: 'us-east-1',
    accessKey: 'test-access-key',
    secretKey: 'test-secret-key'
  }))
};

jest.mock('@/utils/envConfig', () => ({
  getEnvConfig: () => mockEnvConfig
}));

// 模拟错误处理器
const mockErrorHandler = {
  withRetry: jest.fn(),
  createError: jest.fn(),
  logError: jest.fn()
};

jest.mock('@/utils/errorHandler', () => ({
  errorHandler: mockErrorHandler
}));

// 模拟文件处理
const mockFileUtils = {
  validateFileType: jest.fn(),
  validateFileSize: jest.fn(),
  generateFileName: jest.fn(),
  getFileExtension: jest.fn(),
  getMimeType: jest.fn(),
  compressImage: jest.fn()
};

jest.mock('@/utils/fileUtils', () => mockFileUtils);

// 模拟安全模块
const mockSecurity = {
  generateUploadToken: jest.fn(),
  validateUploadToken: jest.fn(),
  sanitizeFileName: jest.fn()
};

jest.mock('@/middleware/security', () => ({
  security: mockSecurity
}));

describe('CloudStorageService', () => {
  let storageService: CloudStorageService;

  beforeEach(() => {
    jest.clearAllMocks();
    storageService = new CloudStorageService();
    
    // 设置默认的成功响应
    mockErrorHandler.withRetry.mockImplementation(async (fn) => await fn());
    mockFileUtils.validateFileType.mockReturnValue(true);
    mockFileUtils.validateFileSize.mockReturnValue(true);
    mockFileUtils.generateFileName.mockReturnValue('generated-file-name.jpg');
    mockFileUtils.getFileExtension.mockReturnValue('jpg');
    mockFileUtils.getMimeType.mockReturnValue('image/jpeg');
    mockSecurity.sanitizeFileName.mockImplementation((name) => name);
  });

  describe('uploadFile', () => {
    it('应该成功上传文件', async () => {
      const mockUploadResult = {
        success: true,
        fileId: 'file-123',
        fileName: 'test-image.jpg',
        fileUrl: 'https://storage.example.com/test-bucket/test-image.jpg',
        fileSize: 1024000,
        mimeType: 'image/jpeg',
        uploadedAt: new Date().toISOString(),
        etag: 'abc123def456',
        metadata: {
          originalName: 'original-image.jpg',
          uploadedBy: 'user-123'
        }
      };
      
      mockStorageClient.upload.mockResolvedValue(mockUploadResult);
      
      const file = testUtils.createMockFile('test-image.jpg', 'image/jpeg', 1024000);
      const result = await storageService.uploadFile(file, {
        folder: 'images',
        userId: 'user-123',
        isPublic: true
      });
      
      expect(result.success).toBe(true);
      expect(result.fileId).toBe('file-123');
      expect(result.fileName).toBe('test-image.jpg');
      expect(result.fileUrl).toBe('https://storage.example.com/test-bucket/test-image.jpg');
      expect(result.fileSize).toBe(1024000);
      expect(result.mimeType).toBe('image/jpeg');
      expect(mockStorageClient.upload).toHaveBeenCalledWith(
        expect.objectContaining({
          file,
          folder: 'images',
          isPublic: true
        })
      );
    });

    it('应该处理不同文件类型', async () => {
      const testCases = [
        { name: 'document.pdf', type: 'application/pdf', folder: 'documents' },
        { name: 'video.mp4', type: 'video/mp4', folder: 'videos' },
        { name: 'audio.mp3', type: 'audio/mpeg', folder: 'audio' },
        { name: 'archive.zip', type: 'application/zip', folder: 'archives' }
      ];
      
      for (const testCase of testCases) {
        const mockResult = {
          success: true,
          fileId: `file-${Date.now()}`,
          fileName: testCase.name,
          fileUrl: `https://storage.example.com/test-bucket/${testCase.folder}/${testCase.name}`,
          mimeType: testCase.type
        };
        
        mockStorageClient.upload.mockResolvedValue(mockResult);
        mockFileUtils.getMimeType.mockReturnValue(testCase.type);
        
        const file = testUtils.createMockFile(testCase.name, testCase.type);
        const result = await storageService.uploadFile(file, {
          folder: testCase.folder
        });
        
        expect(result.success).toBe(true);
        expect(result.mimeType).toBe(testCase.type);
      }
    });

    it('应该验证文件类型', async () => {
      mockFileUtils.validateFileType.mockReturnValue(false);
      
      const invalidFile = testUtils.createMockFile('malicious.exe', 'application/x-executable');
      
      await expect(storageService.uploadFile(invalidFile)).rejects.toThrow('Invalid file type');
    });

    it('应该验证文件大小', async () => {
      mockFileUtils.validateFileSize.mockReturnValue(false);
      
      const largeFile = testUtils.createMockFile('large-file.jpg', 'image/jpeg', 100 * 1024 * 1024); // 100MB
      
      await expect(storageService.uploadFile(largeFile)).rejects.toThrow('File size exceeds limit');
    });

    it('应该处理上传错误', async () => {
      const uploadError = new Error('Upload failed: Network timeout');
      mockStorageClient.upload.mockRejectedValue(uploadError);
      mockErrorHandler.withRetry.mockRejectedValue(uploadError);
      
      const file = testUtils.createMockFile('test-image.jpg', 'image/jpeg');
      
      await expect(storageService.uploadFile(file)).rejects.toThrow('Upload failed: Network timeout');
      expect(mockErrorHandler.withRetry).toHaveBeenCalled();
    });

    it('应该支持自定义文件名', async () => {
      const mockResult = {
        success: true,
        fileId: 'custom-file-123',
        fileName: 'custom-name.jpg',
        fileUrl: 'https://storage.example.com/test-bucket/custom-name.jpg'
      };
      
      mockStorageClient.upload.mockResolvedValue(mockResult);
      
      const file = testUtils.createMockFile('original.jpg', 'image/jpeg');
      const result = await storageService.uploadFile(file, {
        customFileName: 'custom-name.jpg'
      });
      
      expect(result.fileName).toBe('custom-name.jpg');
    });

    it('应该支持文件压缩', async () => {
      const compressedBuffer = Buffer.from('compressed-image-data');
      mockFileUtils.compressImage.mockResolvedValue(compressedBuffer);
      
      const mockResult = {
        success: true,
        fileId: 'compressed-file-123',
        fileName: 'compressed-image.jpg',
        fileSize: compressedBuffer.length
      };
      
      mockStorageClient.upload.mockResolvedValue(mockResult);
      
      const file = testUtils.createMockFile('large-image.jpg', 'image/jpeg', 5 * 1024 * 1024);
      const result = await storageService.uploadFile(file, {
        compress: true,
        quality: 80
      });
      
      expect(mockFileUtils.compressImage).toHaveBeenCalledWith(file, { quality: 80 });
      expect(result.success).toBe(true);
    });

    it('应该处理元数据', async () => {
      const metadata = {
        description: 'Test image',
        tags: ['test', 'image'],
        category: 'profile'
      };
      
      const mockResult = {
        success: true,
        fileId: 'metadata-file-123',
        fileName: 'test-image.jpg',
        metadata
      };
      
      mockStorageClient.upload.mockResolvedValue(mockResult);
      
      const file = testUtils.createMockFile('test-image.jpg', 'image/jpeg');
      const result = await storageService.uploadFile(file, {
        metadata
      });
      
      expect(result.metadata).toEqual(metadata);
    });
  });

  describe('downloadFile', () => {
    it('应该成功下载文件', async () => {
      const mockFileData = Buffer.from('file-content-data');
      const mockDownloadResult = {
        success: true,
        fileData: mockFileData,
        fileName: 'downloaded-file.jpg',
        fileSize: mockFileData.length,
        mimeType: 'image/jpeg',
        lastModified: new Date().toISOString(),
        etag: 'download-etag-123'
      };
      
      mockStorageClient.download.mockResolvedValue(mockDownloadResult);
      
      const result = await storageService.downloadFile('file-123');
      
      expect(result.success).toBe(true);
      expect(result.fileData).toEqual(mockFileData);
      expect(result.fileName).toBe('downloaded-file.jpg');
      expect(result.mimeType).toBe('image/jpeg');
      expect(mockStorageClient.download).toHaveBeenCalledWith('file-123');
    });

    it('应该处理文件不存在', async () => {
      const notFoundError = new Error('File not found');
      notFoundError.name = 'NotFoundError';
      mockStorageClient.download.mockRejectedValue(notFoundError);
      
      const result = await storageService.downloadFile('non-existent-file');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('File not found');
    });

    it('应该支持范围下载', async () => {
      const partialData = Buffer.from('partial-content');
      const mockResult = {
        success: true,
        fileData: partialData,
        fileName: 'partial-file.jpg',
        contentRange: 'bytes 0-1023/2048',
        isPartial: true
      };
      
      mockStorageClient.download.mockResolvedValue(mockResult);
      
      const result = await storageService.downloadFile('file-123', {
        range: { start: 0, end: 1023 }
      });
      
      expect(result.success).toBe(true);
      expect(result.isPartial).toBe(true);
      expect(result.contentRange).toBe('bytes 0-1023/2048');
    });

    it('应该处理下载错误', async () => {
      const downloadError = new Error('Download failed: Network error');
      mockStorageClient.download.mockRejectedValue(downloadError);
      mockErrorHandler.withRetry.mockRejectedValue(downloadError);
      
      await expect(storageService.downloadFile('file-123')).rejects.toThrow('Download failed: Network error');
      expect(mockErrorHandler.withRetry).toHaveBeenCalled();
    });
  });

  describe('deleteFile', () => {
    it('应该成功删除文件', async () => {
      const mockDeleteResult = {
        success: true,
        fileId: 'deleted-file-123',
        deletedAt: new Date().toISOString()
      };
      
      mockStorageClient.delete.mockResolvedValue(mockDeleteResult);
      
      const result = await storageService.deleteFile('file-123');
      
      expect(result.success).toBe(true);
      expect(result.fileId).toBe('deleted-file-123');
      expect(mockStorageClient.delete).toHaveBeenCalledWith('file-123');
    });

    it('应该批量删除文件', async () => {
      const fileIds = ['file-1', 'file-2', 'file-3'];
      const mockBatchResult = {
        success: true,
        deletedFiles: fileIds,
        deletedCount: 3,
        failedFiles: []
      };
      
      mockStorageClient.delete.mockResolvedValue(mockBatchResult);
      
      const result = await storageService.deleteFiles(fileIds);
      
      expect(result.success).toBe(true);
      expect(result.deletedCount).toBe(3);
      expect(result.failedFiles).toHaveLength(0);
    });

    it('应该处理部分删除失败', async () => {
      const fileIds = ['file-1', 'file-2', 'file-3'];
      const mockBatchResult = {
        success: false,
        deletedFiles: ['file-1', 'file-3'],
        deletedCount: 2,
        failedFiles: [{
          fileId: 'file-2',
          error: 'File not found'
        }]
      };
      
      mockStorageClient.delete.mockResolvedValue(mockBatchResult);
      
      const result = await storageService.deleteFiles(fileIds);
      
      expect(result.success).toBe(false);
      expect(result.deletedCount).toBe(2);
      expect(result.failedFiles).toHaveLength(1);
      expect(result.failedFiles[0].fileId).toBe('file-2');
    });

    it('应该处理删除错误', async () => {
      const deleteError = new Error('Delete failed: Permission denied');
      mockStorageClient.delete.mockRejectedValue(deleteError);
      
      await expect(storageService.deleteFile('file-123')).rejects.toThrow('Delete failed: Permission denied');
    });
  });

  describe('getFileUrl', () => {
    it('应该生成公共文件URL', async () => {
      const mockUrl = 'https://storage.example.com/test-bucket/public/file-123.jpg';
      mockStorageClient.getSignedUrl.mockResolvedValue(mockUrl);
      
      const result = await storageService.getFileUrl('file-123', {
        isPublic: true
      });
      
      expect(result.success).toBe(true);
      expect(result.url).toBe(mockUrl);
      expect(result.isPublic).toBe(true);
    });

    it('应该生成带过期时间的签名URL', async () => {
      const mockSignedUrl = 'https://storage.example.com/test-bucket/file-123.jpg?signature=abc123&expires=1234567890';
      mockStorageClient.getSignedUrl.mockResolvedValue(mockSignedUrl);
      
      const expiresIn = 3600; // 1小时
      const result = await storageService.getFileUrl('file-123', {
        expiresIn,
        isPublic: false
      });
      
      expect(result.success).toBe(true);
      expect(result.url).toBe(mockSignedUrl);
      expect(result.isPublic).toBe(false);
      expect(result.expiresIn).toBe(expiresIn);
      expect(mockStorageClient.getSignedUrl).toHaveBeenCalledWith(
        'file-123',
        expect.objectContaining({ expiresIn })
      );
    });

    it('应该处理URL生成错误', async () => {
      const urlError = new Error('URL generation failed');
      mockStorageClient.getSignedUrl.mockRejectedValue(urlError);
      
      const result = await storageService.getFileUrl('file-123');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('URL generation failed');
    });
  });

  describe('listFiles', () => {
    it('应该列出文件夹中的文件', async () => {
      const mockFileList = {
        success: true,
        files: [
          {
            fileId: 'file-1',
            fileName: 'image1.jpg',
            fileSize: 1024000,
            mimeType: 'image/jpeg',
            uploadedAt: '2024-01-01T00:00:00Z',
            isPublic: true
          },
          {
            fileId: 'file-2',
            fileName: 'document.pdf',
            fileSize: 2048000,
            mimeType: 'application/pdf',
            uploadedAt: '2024-01-02T00:00:00Z',
            isPublic: false
          }
        ],
        totalCount: 2,
        hasMore: false,
        nextToken: null
      };
      
      mockStorageClient.listFiles.mockResolvedValue(mockFileList);
      
      const result = await storageService.listFiles({
        folder: 'uploads',
        limit: 10
      });
      
      expect(result.success).toBe(true);
      expect(result.files).toHaveLength(2);
      expect(result.totalCount).toBe(2);
      expect(result.hasMore).toBe(false);
    });

    it('应该支持分页', async () => {
      const mockPagedResult = {
        success: true,
        files: Array.from({ length: 5 }, (_, i) => ({
          fileId: `file-${i + 1}`,
          fileName: `file-${i + 1}.jpg`,
          fileSize: 1024000
        })),
        totalCount: 25,
        hasMore: true,
        nextToken: 'next-page-token'
      };
      
      mockStorageClient.listFiles.mockResolvedValue(mockPagedResult);
      
      const result = await storageService.listFiles({
        limit: 5,
        offset: 0
      });
      
      expect(result.success).toBe(true);
      expect(result.files).toHaveLength(5);
      expect(result.hasMore).toBe(true);
      expect(result.nextToken).toBe('next-page-token');
    });

    it('应该支持文件过滤', async () => {
      const mockFilteredResult = {
        success: true,
        files: [
          {
            fileId: 'image-1',
            fileName: 'photo1.jpg',
            mimeType: 'image/jpeg'
          },
          {
            fileId: 'image-2',
            fileName: 'photo2.png',
            mimeType: 'image/png'
          }
        ],
        totalCount: 2
      };
      
      mockStorageClient.listFiles.mockResolvedValue(mockFilteredResult);
      
      const result = await storageService.listFiles({
        mimeTypeFilter: 'image/*',
        nameFilter: 'photo'
      });
      
      expect(result.success).toBe(true);
      expect(result.files.every(f => f.mimeType.startsWith('image/'))).toBe(true);
      expect(result.files.every(f => f.fileName.includes('photo'))).toBe(true);
    });
  });

  describe('copyFile', () => {
    it('应该成功复制文件', async () => {
      const mockCopyResult = {
        success: true,
        sourceFileId: 'source-file-123',
        targetFileId: 'target-file-456',
        targetFileName: 'copied-file.jpg',
        targetUrl: 'https://storage.example.com/test-bucket/copied-file.jpg'
      };
      
      mockStorageClient.copyFile.mockResolvedValue(mockCopyResult);
      
      const result = await storageService.copyFile('source-file-123', {
        targetFolder: 'backups',
        targetFileName: 'copied-file.jpg'
      });
      
      expect(result.success).toBe(true);
      expect(result.sourceFileId).toBe('source-file-123');
      expect(result.targetFileId).toBe('target-file-456');
      expect(result.targetFileName).toBe('copied-file.jpg');
    });

    it('应该处理复制错误', async () => {
      const copyError = new Error('Copy failed: Source file not found');
      mockStorageClient.copyFile.mockRejectedValue(copyError);
      
      await expect(storageService.copyFile('non-existent-file', {
        targetFolder: 'backups'
      })).rejects.toThrow('Copy failed: Source file not found');
    });
  });

  describe('moveFile', () => {
    it('应该成功移动文件', async () => {
      const mockMoveResult = {
        success: true,
        fileId: 'moved-file-123',
        oldPath: 'uploads/old-file.jpg',
        newPath: 'archive/moved-file.jpg',
        newUrl: 'https://storage.example.com/test-bucket/archive/moved-file.jpg'
      };
      
      mockStorageClient.moveFile.mockResolvedValue(mockMoveResult);
      
      const result = await storageService.moveFile('file-123', {
        targetFolder: 'archive',
        targetFileName: 'moved-file.jpg'
      });
      
      expect(result.success).toBe(true);
      expect(result.fileId).toBe('moved-file-123');
      expect(result.newPath).toBe('archive/moved-file.jpg');
    });

    it('应该处理移动错误', async () => {
      const moveError = new Error('Move failed: Target folder does not exist');
      mockStorageClient.moveFile.mockRejectedValue(moveError);
      
      await expect(storageService.moveFile('file-123', {
        targetFolder: 'non-existent-folder'
      })).rejects.toThrow('Move failed: Target folder does not exist');
    });
  });

  describe('getFileInfo', () => {
    it('应该获取文件信息', async () => {
      const mockFileInfo = {
        success: true,
        fileId: 'info-file-123',
        fileName: 'info-file.jpg',
        fileSize: 1024000,
        mimeType: 'image/jpeg',
        uploadedAt: '2024-01-01T00:00:00Z',
        lastModified: '2024-01-01T00:00:00Z',
        etag: 'info-etag-123',
        isPublic: true,
        folder: 'uploads',
        metadata: {
          originalName: 'original-info-file.jpg',
          uploadedBy: 'user-123'
        }
      };
      
      mockStorageClient.getFileInfo.mockResolvedValue(mockFileInfo);
      
      const result = await storageService.getFileInfo('file-123');
      
      expect(result.success).toBe(true);
      expect(result.fileId).toBe('info-file-123');
      expect(result.fileName).toBe('info-file.jpg');
      expect(result.fileSize).toBe(1024000);
      expect(result.metadata).toBeDefined();
    });

    it('应该处理文件信息获取错误', async () => {
      const infoError = new Error('File info not found');
      mockStorageClient.getFileInfo.mockRejectedValue(infoError);
      
      const result = await storageService.getFileInfo('non-existent-file');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('File info not found');
    });
  });

  describe('CloudStorageConfig', () => {
    it('应该使用默认配置', () => {
      const config = new CloudStorageConfig();
      
      expect(config.maxFileSize).toBe(50 * 1024 * 1024); // 50MB
      expect(config.allowedMimeTypes).toContain('image/jpeg');
      expect(config.allowedMimeTypes).toContain('application/pdf');
      expect(config.defaultFolder).toBe('uploads');
      expect(config.enableCompression).toBe(true);
      expect(config.retryAttempts).toBe(3);
      expect(config.timeout).toBe(60000);
    });

    it('应该允许自定义配置', () => {
      const customConfig = new CloudStorageConfig({
        maxFileSize: 10 * 1024 * 1024, // 10MB
        allowedMimeTypes: ['image/jpeg', 'image/png'],
        defaultFolder: 'custom-uploads',
        enableCompression: false,
        retryAttempts: 5,
        timeout: 120000
      });
      
      expect(customConfig.maxFileSize).toBe(10 * 1024 * 1024);
      expect(customConfig.allowedMimeTypes).toEqual(['image/jpeg', 'image/png']);
      expect(customConfig.defaultFolder).toBe('custom-uploads');
      expect(customConfig.enableCompression).toBe(false);
      expect(customConfig.retryAttempts).toBe(5);
      expect(customConfig.timeout).toBe(120000);
    });

    it('应该验证配置参数', () => {
      expect(() => {
        new CloudStorageConfig({
          maxFileSize: -1 // 负值
        });
      }).toThrow('Max file size must be positive');
      
      expect(() => {
        new CloudStorageConfig({
          allowedMimeTypes: [] // 空数组
        });
      }).toThrow('Allowed MIME types cannot be empty');
      
      expect(() => {
        new CloudStorageConfig({
          retryAttempts: -1 // 负值
        });
      }).toThrow('Retry attempts must be non-negative');
    });
  });

  describe('便捷函数', () => {
    it('uploadFile函数应该正常工作', async () => {
      const mockResult = {
        success: true,
        fileId: 'convenience-file-123',
        fileName: 'convenience-test.jpg'
      };
      
      mockStorageClient.upload.mockResolvedValue(mockResult);
      
      const file = testUtils.createMockFile('test.jpg', 'image/jpeg');
      const result = await uploadFile(file);
      
      expect(result.success).toBe(true);
      expect(result.fileId).toBe('convenience-file-123');
    });

    it('downloadFile函数应该正常工作', async () => {
      const mockData = Buffer.from('convenience-download-data');
      const mockResult = {
        success: true,
        fileData: mockData,
        fileName: 'convenience-download.jpg'
      };
      
      mockStorageClient.download.mockResolvedValue(mockResult);
      
      const result = await downloadFile('file-123');
      
      expect(result.success).toBe(true);
      expect(result.fileData).toEqual(mockData);
    });

    it('deleteFile函数应该正常工作', async () => {
      const mockResult = {
        success: true,
        fileId: 'convenience-deleted-123'
      };
      
      mockStorageClient.delete.mockResolvedValue(mockResult);
      
      const result = await deleteFile('file-123');
      
      expect(result.success).toBe(true);
      expect(result.fileId).toBe('convenience-deleted-123');
    });

    it('getFileUrl函数应该正常工作', async () => {
      const mockUrl = 'https://storage.example.com/convenience-url.jpg';
      mockStorageClient.getSignedUrl.mockResolvedValue(mockUrl);
      
      const result = await getFileUrl('file-123');
      
      expect(result.success).toBe(true);
      expect(result.url).toBe(mockUrl);
    });
  });

  describe('边界情况和错误处理', () => {
    it('应该处理空文件', async () => {
      const emptyFile = testUtils.createMockFile('empty.txt', 'text/plain', 0);
      
      await expect(storageService.uploadFile(emptyFile)).rejects.toThrow('File is empty');
    });

    it('应该处理文件名冲突', async () => {
      const conflictError = new Error('File already exists');
      conflictError.name = 'ConflictError';
      mockStorageClient.upload.mockRejectedValue(conflictError);
      
      const file = testUtils.createMockFile('existing-file.jpg', 'image/jpeg');
      
      await expect(storageService.uploadFile(file, {
        overwrite: false
      })).rejects.toThrow('File already exists');
    });

    it('应该处理存储配额耗尽', async () => {
      const quotaError = new Error('Storage quota exceeded');
      quotaError.name = 'QuotaExceededError';
      mockStorageClient.upload.mockRejectedValue(quotaError);
      
      const file = testUtils.createMockFile('test.jpg', 'image/jpeg');
      
      await expect(storageService.uploadFile(file)).rejects.toThrow('Storage quota exceeded');
    });

    it('应该处理并发上传', async () => {
      const mockResults = Array.from({ length: 5 }, (_, i) => ({
        success: true,
        fileId: `concurrent-file-${i}`,
        fileName: `concurrent-${i}.jpg`
      }));
      
      mockStorageClient.upload.mockImplementation((_, index) => 
        Promise.resolve(mockResults[index] || mockResults[0])
      );
      
      const promises = Array.from({ length: 5 }, (_, i) => {
        const file = testUtils.createMockFile(`concurrent-${i}.jpg`, 'image/jpeg');
        return storageService.uploadFile(file);
      });
      
      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(5);
      expect(results.every(r => r.success)).toBe(true);
    });

    it('应该处理网络不稳定', async () => {
      let callCount = 0;
      mockStorageClient.upload.mockImplementation(() => {
        callCount++;
        if (callCount <= 2) {
          return Promise.reject(new Error('Network timeout'));
        }
        return Promise.resolve({
          success: true,
          fileId: 'retry-file-123',
          fileName: 'retry-test.jpg'
        });
      });
      
      mockErrorHandler.withRetry.mockImplementation(async (fn) => {
        let attempts = 0;
        while (attempts < 3) {
          try {
            return await fn();
          } catch (error) {
            attempts++;
            if (attempts >= 3) throw error;
          }
        }
      });
      
      const file = testUtils.createMockFile('test.jpg', 'image/jpeg');
      const result = await storageService.uploadFile(file);
      
      expect(result.success).toBe(true);
      expect(callCount).toBe(3); // 重试了2次后成功
    });
  });

  describe('性能测试', () => {
    it('应该在合理时间内完成文件上传', async () => {
      const mockResult = {
        success: true,
        fileId: 'performance-file-123',
        fileName: 'performance-test.jpg'
      };
      
      mockStorageClient.upload.mockResolvedValue(mockResult);
      
      const startTime = Date.now();
      const file = testUtils.createMockFile('test.jpg', 'image/jpeg', 1024 * 1024); // 1MB
      const result = await storageService.uploadFile(file);
      const endTime = Date.now();
      
      expect(result.success).toBe(true);
      expect(endTime - startTime).toBeLessThan(5000); // 应该在5秒内完成
    });

    it('应该高效处理批量文件操作', async () => {
      const mockResults = Array.from({ length: 20 }, (_, i) => ({
        success: true,
        fileId: `batch-file-${i}`,
        fileName: `batch-${i}.jpg`
      }));
      
      mockStorageClient.upload.mockImplementation((_, index) => 
        Promise.resolve(mockResults[index] || mockResults[0])
      );
      
      const startTime = Date.now();
      const promises = Array.from({ length: 20 }, (_, i) => {
        const file = testUtils.createMockFile(`batch-${i}.jpg`, 'image/jpeg');
        return storageService.uploadFile(file);
      });
      
      const results = await Promise.all(promises);
      const endTime = Date.now();
      
      expect(results).toHaveLength(20);
      expect(results.every(r => r.success)).toBe(true);
      expect(endTime - startTime).toBeLessThan(30000); // 应该在30秒内完成
    });
  });
});