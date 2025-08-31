/**
 * 云存储服务模块
 * 提供统一的文件上传接口，支持多种云存储提供商
 * 包括阿里云OSS、AWS S3、腾讯云COS等
 */

import { 
  withRetry, 
  createError, 
  AppError, 
  ErrorType, 
  ErrorSeverity,
  RetryConfig 
} from '../utils/errorHandler';
import { createOSSClient } from '../lib/alicloud-oss';

/**
 * 云存储提供商类型
 */
export type CloudStorageProvider = 'aliyun' | 'local';

/**
 * 文件类型枚举
 */
export enum FileType {
  IMAGE = 'image',
  VIDEO = 'video',
  DOCUMENT = 'document',
  AUDIO = 'audio',
  MATERIAL = 'material',
  PREVIEW = 'preview',
  AVATAR = 'avatar',
  OTHER = 'other'
}

/**
 * 文件上传配置接口
 */
export interface FileUploadConfig {
  maxSize: number; // 最大文件大小（字节）
  allowedTypes: string[]; // 允许的文件类型
  bucket?: string; // 存储桶名称
  path?: string; // 存储路径
  folder?: string; // 文件夹名称
}

/**
 * 上传结果接口
 */
export interface UploadResult {
  success: boolean;
  url?: string;
  key?: string;
  size?: number;
  contentType?: string;
  uploadedAt?: Date;
  error?: string;
}

/**
 * 上传进度回调接口
 */
export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

/**
 * 云存储服务错误类
 * @deprecated 使用新的统一错误处理机制
 */
export class CloudStorageError extends AppError {
  constructor(
    message: string,
    public code?: string,
    originalError?: Error | unknown
  ) {
    super(
      ErrorType.FILE_UPLOAD_ERROR,
      message,
      {
        code: code || 'CLOUD_STORAGE_ERROR',
        statusCode: 500,
        severity: ErrorSeverity.HIGH,
        originalError: originalError instanceof Error ? originalError : undefined
      }
    );
    this.name = 'CloudStorageError';
  }
}

/**
 * 文件类型配置映射
 */
const FILE_TYPE_CONFIGS: Record<FileType, FileUploadConfig> = {
  [FileType.VIDEO]: {
    maxSize: 500 * 1024 * 1024, // 500MB
    allowedTypes: [
      'video/mp4',
      'video/avi',
      'video/mov',
      'video/wmv',
      'video/webm',
      'video/mkv'
    ],
    folder: 'videos'
  },
  [FileType.MATERIAL]: {
    maxSize: 50 * 1024 * 1024, // 50MB
    allowedTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'text/csv'
    ],
    folder: 'materials'
  },
  [FileType.PREVIEW]: {
    maxSize: 100 * 1024 * 1024, // 100MB
    allowedTypes: [
      'video/mp4',
      'video/avi',
      'video/mov',
      'video/webm'
    ],
    folder: 'previews'
  },
  [FileType.AVATAR]: {
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp'
    ],
    folder: 'avatars'
  },
  [FileType.DOCUMENT]: {
    maxSize: 20 * 1024 * 1024, // 20MB
    allowedTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ],
    folder: 'documents'
  },
  [FileType.IMAGE]: {
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/bmp',
      'image/svg+xml'
    ],
    folder: 'images'
  },
  [FileType.AUDIO]: {
    maxSize: 100 * 1024 * 1024, // 100MB
    allowedTypes: [
      'audio/mp3',
      'audio/wav',
      'audio/aac',
      'audio/flac',
      'audio/ogg',
      'audio/m4a'
    ],
    folder: 'audios'
  },
  [FileType.OTHER]: {
    maxSize: 50 * 1024 * 1024, // 50MB
    allowedTypes: [
      'application/octet-stream',
      'application/zip',
      'application/x-rar-compressed',
      'application/x-7z-compressed'
    ],
    folder: 'others'
  }
};

/**
 * 云存储服务基类
 */
abstract class BaseCloudStorageService {
  protected provider: CloudStorageProvider;
  
  constructor(provider: CloudStorageProvider) {
    this.provider = provider;
  }

  /**
   * 获取重试配置
   * @returns 重试配置
   */
  protected getRetryConfig(): RetryConfig {
    return {
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      backoffMultiplier: 2,
      jitter: true,
      retryableErrors: [
        ErrorType.NETWORK_ERROR,
        ErrorType.TIMEOUT_ERROR,
        ErrorType.RATE_LIMIT_ERROR,
        ErrorType.SERVICE_UNAVAILABLE,
        ErrorType.FILE_UPLOAD_ERROR
      ]
    };
  }

  /**
   * 上传文件到云存储
   * @param file 文件对象
   * @param fileType 文件类型
   * @param options 上传选项
   * @returns 上传结果
   */
  abstract uploadFile(
    file: File,
    fileType: FileType,
    options?: {
      customPath?: string;
      onProgress?: (progress: UploadProgress) => void;
      metadata?: Record<string, string>;
    }
  ): Promise<UploadResult>;

  /**
   * 删除文件
   * @param key 文件唯一标识
   * @returns 删除结果
   */
  abstract deleteFile(key: string): Promise<{ success: boolean; message?: string }>;

  /**
   * 获取文件访问URL
   * @param key 文件唯一标识
   * @param expiresIn 过期时间（秒）
   * @returns 访问URL
   */
  abstract getFileUrl(key: string, expiresIn?: number): Promise<string>;

  /**
   * 验证文件
   * @param file 文件对象
   * @param fileType 文件类型
   * @returns 验证结果
   */
  protected validateFile(file: File, fileType: FileType): { valid: boolean; message?: string } {
    const config = FILE_TYPE_CONFIGS[fileType];
    
    // 检查文件大小
    if (file.size > config.maxSize) {
      return {
        valid: false,
        message: `文件大小超过限制（最大 ${Math.round(config.maxSize / 1024 / 1024)}MB）`
      };
    }
    
    // 检查文件类型
    if (!config.allowedTypes.includes(file.type)) {
      return {
        valid: false,
        message: `不支持的文件类型，支持的类型: ${config.allowedTypes.join(', ')}`
      };
    }
    
    return { valid: true };
  }

  /**
   * 生成文件名
   * @param originalName 原始文件名
   * @param fileType 文件类型
   * @param customPath 自定义路径
   * @returns 生成的文件路径
   */
  protected generateFileName(
    originalName: string,
    fileType: FileType,
    customPath?: string
  ): string {
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const fileExtension = originalName.split('.').pop()?.toLowerCase() || '';
    const config = FILE_TYPE_CONFIGS[fileType];
    
    const fileName = `${timestamp}_${randomStr}.${fileExtension}`;
    
    if (customPath) {
      return `${customPath}/${fileName}`;
    }
    
    return `${config.folder}/${fileName}`;
  }
}

/**
 * 阿里云OSS存储服务
 */
class AliyunOSSService extends BaseCloudStorageService {
  constructor() {
    super('aliyun');
  }

  async uploadFile(
    file: File,
    fileType: FileType,
    options?: {
      customPath?: string;
      onProgress?: (progress: UploadProgress) => void;
      metadata?: Record<string, string>;
    }
  ): Promise<UploadResult> {
    // 验证文件
    const validation = this.validateFile(file, fileType);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.message
      };
    }

    try {
      // 使用重试机制上传文件
      const result = await withRetry(async () => {
        const fileName = this.generateFileName(file.name, fileType, options?.customPath);
        
        // 使用阿里云OSS客户端上传文件
        const ossClient = createOSSClient();
        
        // 模拟进度回调（因为阿里云OSS客户端不支持进度回调）
        if (options?.onProgress) {
          // 模拟上传进度
          for (let i = 0; i <= 100; i += 25) {
            await new Promise(resolve => setTimeout(resolve, 100));
            options.onProgress({
              loaded: (file.size * i) / 100,
              total: file.size,
              percentage: i
            });
          }
        }
        
        const uploadResult = await ossClient.uploadFile(
          file,
          fileName,
          {
            folder: FILE_TYPE_CONFIGS[fileType].folder,
            isPublic: true
          }
        );
        
        // 从文件名推断内容类型
        const getContentType = (fileName: string): string => {
          const ext = fileName.split('.').pop()?.toLowerCase();
          const mimeTypes: Record<string, string> = {
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'gif': 'image/gif',
            'webp': 'image/webp',
            'pdf': 'application/pdf',
            'doc': 'application/msword',
            'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'xls': 'application/vnd.ms-excel',
            'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'txt': 'text/plain',
            'mp4': 'video/mp4',
            'mp3': 'audio/mpeg'
          };
          return mimeTypes[ext || ''] || 'application/octet-stream';
        };
        
        return {
          success: true,
          url: uploadResult.url,
          key: uploadResult.key,
          size: uploadResult.size,
          contentType: getContentType(fileName),
          uploadedAt: new Date()
        };
      }, this.getRetryConfig());
      
      return result;
    } catch (error) {
      console.error('阿里云OSS上传失败:', error);
      throw createError(
        ErrorType.FILE_UPLOAD_ERROR,
        '阿里云OSS上传失败',
        {
          code: 'ALIYUN_UPLOAD_ERROR',
          statusCode: 500,
          severity: ErrorSeverity.HIGH,
          originalError: error instanceof Error ? error : undefined
        }
      );
    }
  }

  async deleteFile(key: string): Promise<{ success: boolean; message?: string }> {
    try {
      const result = await withRetry(async () => {
        // 使用阿里云OSS客户端删除文件
        const ossClient = createOSSClient();
        await ossClient.deleteFile(key);
        return { success: true };
      }, this.getRetryConfig());
      
      return result;
    } catch (error) {
      console.error('阿里云OSS删除失败:', error);
      return { success: false, message: '删除失败' };
    }
  }

  async getFileUrl(key: string, expiresIn: number = 3600): Promise<string> {
    try {
      return await withRetry(async () => {
        // 使用阿里云OSS客户端生成签名URL
        const ossClient = createOSSClient();
        return await ossClient.getSignedUrl(key, expiresIn);
      }, this.getRetryConfig());
    } catch (error) {
      console.error('获取阿里云OSS文件URL失败:', error);
      throw createError(
        ErrorType.FILE_UPLOAD_ERROR,
        '获取文件URL失败',
        {
          code: 'ALIYUN_URL_ERROR',
          statusCode: 500,
          severity: ErrorSeverity.HIGH,
          originalError: error instanceof Error ? error : undefined
        }
      );
    }
  }
}

/**
 * 本地存储服务（开发环境使用）
 */
class LocalStorageService extends BaseCloudStorageService {
  constructor() {
    super('local');
  }

  async uploadFile(
    file: File,
    fileType: FileType,
    options?: {
      customPath?: string;
      onProgress?: (progress: UploadProgress) => void;
      metadata?: Record<string, string>;
    }
  ): Promise<UploadResult> {
    // 验证文件
    const validation = this.validateFile(file, fileType);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.message
      };
    }

    try {
      // 使用重试机制保存文件
      const result = await withRetry(async () => {
        const fileName = this.generateFileName(file.name, fileType, options?.customPath);
        
        // 模拟上传进度
        if (options?.onProgress) {
          for (let i = 0; i <= 100; i += 20) {
            await new Promise(resolve => setTimeout(resolve, 50));
            options.onProgress({
              loaded: (file.size * i) / 100,
              total: file.size,
              percentage: i
            });
          }
        }
        
        // 模拟本地存储
        const mockUrl = `http://localhost:3000/uploads/${fileName}`;
        
        return {
          success: true,
          url: mockUrl,
          key: fileName,
          size: file.size,
          contentType: file.type,
          uploadedAt: new Date()
        };
      }, this.getRetryConfig());
      
      return result;
    } catch (error) {
      console.error('本地存储上传失败:', error);
      throw createError(
        ErrorType.FILE_UPLOAD_ERROR,
        '本地存储上传失败',
        {
          code: 'LOCAL_UPLOAD_ERROR',
          statusCode: 500,
          severity: ErrorSeverity.HIGH,
          originalError: error instanceof Error ? error : undefined
        }
      );
    }
  }

  async deleteFile(key: string): Promise<{ success: boolean; message?: string }> {
    try {
      const result = await withRetry(async () => {
        console.log(`模拟删除本地文件: ${key}`);
        return { success: true };
      }, this.getRetryConfig());
      
      return result;
    } catch (error) {
      console.error('本地文件删除失败:', error);
      return { success: false, message: '删除失败' };
    }
  }

  async getFileUrl(key: string): Promise<string> {
    return await withRetry(async () => {
      return `http://localhost:3000/uploads/${key}`;
    }, this.getRetryConfig());
  }
}

/**
 * 云存储服务工厂类
 */
class CloudStorageServiceFactory {
  private static instance: BaseCloudStorageService | null = null;

  /**
   * 获取云存储服务实例
   * @param provider 云存储提供商
   * @returns 云存储服务实例
   */
  static getInstance(provider?: CloudStorageProvider): BaseCloudStorageService {
    if (!this.instance) {
      const selectedProvider = provider || this.getDefaultProvider();
      
      switch (selectedProvider) {
        case 'aliyun':
          this.instance = new AliyunOSSService();
          break;
        case 'local':
        default:
          this.instance = new LocalStorageService();
          break;
      }
    }
    
    return this.instance;
  }

  /**
   * 重置服务实例
   */
  static resetInstance(): void {
    this.instance = null;
  }

  /**
   * 获取默认云存储提供商
   * @returns 默认提供商
   */
  private static getDefaultProvider(): CloudStorageProvider {
    const env = process.env.NODE_ENV;
    const provider = process.env.CLOUD_STORAGE_PROVIDER as CloudStorageProvider;
    
    if (env === 'development') {
      return 'local';
    }
    
    return provider || 'aliyun';
  }
}

/**
 * 导出云存储服务实例
 */
export const cloudStorageService = CloudStorageServiceFactory.getInstance();

/**
 * 导出工厂类
 */
export { CloudStorageServiceFactory };

/**
 * 导出文件类型配置
 */
export { FILE_TYPE_CONFIGS };

/**
 * 便捷的文件上传函数
 * @param file 文件对象
 * @param fileType 文件类型
 * @param options 上传选项
 * @returns 上传结果
 */
export async function uploadFile(
  file: File,
  fileType: FileType,
  options?: {
    provider?: CloudStorageProvider;
    customPath?: string;
    onProgress?: (progress: UploadProgress) => void;
    metadata?: Record<string, string>;
  }
): Promise<UploadResult> {
  const service = options?.provider 
    ? CloudStorageServiceFactory.getInstance(options.provider)
    : cloudStorageService;
    
  return service.uploadFile(file, fileType, options);
}

/**
 * 便捷的文件删除函数
 * @param key 文件唯一标识
 * @param provider 云存储提供商
 * @returns 删除结果
 */
export async function deleteFile(
  key: string,
  provider?: CloudStorageProvider
): Promise<{ success: boolean; message?: string }> {
  const service = provider 
    ? CloudStorageServiceFactory.getInstance(provider)
    : cloudStorageService;
    
  return service.deleteFile(key);
}

/**
 * 便捷的获取文件URL函数
 * @param key 文件唯一标识
 * @param expiresIn 过期时间（秒）
 * @param provider 云存储提供商
 * @returns 文件访问URL
 */
export async function getFileUrl(
  key: string,
  expiresIn?: number,
  provider?: CloudStorageProvider
): Promise<string> {
  const service = provider 
    ? CloudStorageServiceFactory.getInstance(provider)
    : cloudStorageService;
    
  return service.getFileUrl(key, expiresIn);
}