import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import path from 'path';
import { ErrorHandler, AppError, ErrorType, ErrorSeverity } from '@/utils/errorHandler';

// 初始化 Supabase 客户端
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 文件上传验证模式
const FileUploadSchema = z.object({
  title: z.string().min(1, '标题不能为空'),
  description: z.string().optional(),
  category: z.string().min(1, '分类不能为空'),
  tags: z.array(z.string()).optional(),
  courseId: z.string().optional(),
  lessonId: z.string().optional(),
  isPublic: z.boolean().default(true),
  allowDownload: z.boolean().default(true)
});

// 支持的文件类型配置
const FILE_TYPES = {
  video: {
    extensions: ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm'],
    maxSize: 2 * 1024 * 1024 * 1024, // 2GB
    mimeTypes: ['video/mp4', 'video/avi', 'video/quicktime', 'video/x-ms-wmv', 'video/x-flv', 'video/webm']
  },
  audio: {
    extensions: ['.mp3', '.wav', '.aac', '.flac', '.ogg'],
    maxSize: 500 * 1024 * 1024, // 500MB
    mimeTypes: ['audio/mpeg', 'audio/wav', 'audio/aac', 'audio/flac', 'audio/ogg']
  },
  document: {
    extensions: ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx'],
    maxSize: 100 * 1024 * 1024, // 100MB
    mimeTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ]
  },
  image: {
    extensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
    maxSize: 10 * 1024 * 1024, // 10MB
    mimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  }
};

/**
 * 检测文件类型
 */
function detectFileType(filename: string, mimeType: string): string | null {
  const extension = path.extname(filename).toLowerCase();
  
  for (const [type, config] of Object.entries(FILE_TYPES)) {
    if (config.extensions.includes(extension) || config.mimeTypes.includes(mimeType)) {
      return type;
    }
  }
  
  return null;
}

/**
 * 验证文件
 */
function validateFile(file: File): { valid: boolean; error?: string; type?: string } {
  const fileType = detectFileType(file.name, file.type);
  
  if (!fileType) {
    return {
      valid: false,
      error: `不支持的文件类型: ${path.extname(file.name)}`
    };
  }
  
  const config = FILE_TYPES[fileType as keyof typeof FILE_TYPES];
  
  if (file.size > config.maxSize) {
    const maxSizeMB = Math.round(config.maxSize / (1024 * 1024));
    return {
      valid: false,
      error: `文件大小超过限制，最大允许 ${maxSizeMB}MB`
    };
  }
  
  return { valid: true, type: fileType };
}

/**
 * 生成唯一文件名
 */
function generateUniqueFilename(originalName: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const extension = path.extname(originalName);
  const baseName = path.basename(originalName, extension);
  
  return `${baseName}_${timestamp}_${random}${extension}`;
}

/**
 * 上传文件到存储服务
 */
async function uploadFileToStorage(file: File, filename: string, fileType: string): Promise<string> {
  try {
    // 转换文件为 ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);
    
    // 构建存储路径
    const storagePath = `resources/${fileType}/${filename}`;
    
    // 上传到 Supabase Storage
    const { data, error } = await supabase.storage
      .from('learning-resources')
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false
      });
    
    if (error) {
      throw new Error(`文件上传失败: ${error.message}`);
    }
    
    // 获取公共URL
    const { data: urlData } = supabase.storage
      .from('learning-resources')
      .getPublicUrl(storagePath);
    
    return urlData.publicUrl;
    
  } catch (error) {
    throw new Error(`存储服务错误: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}

/**
 * 文件信息接口
 */
interface FileInfo {
  title: string;
  description?: string;
  fileType: string;
  fileName: string;
  originalName: string;
  fileSize: number;
  fileUrl: string;
  mimeType: string;
  category?: string;
  tags?: string[];
  courseId?: string;
  lessonId?: string;
  isPublic: boolean;
  allowDownload: boolean;
}

/**
 * 保存文件信息到数据库
 */
async function saveFileInfo(fileInfo: FileInfo): Promise<string> {
  try {
    const { data, error } = await supabase
      .from('learning_resources')
      .insert({
        title: fileInfo.title,
        description: fileInfo.description,
        file_type: fileInfo.fileType,
        file_name: fileInfo.fileName,
        original_name: fileInfo.originalName,
        file_size: fileInfo.fileSize,
        file_url: fileInfo.fileUrl,
        mime_type: fileInfo.mimeType,
        category: fileInfo.category,
        tags: fileInfo.tags,
        course_id: fileInfo.courseId,
        lesson_id: fileInfo.lessonId,
        is_public: fileInfo.isPublic,
        allow_download: fileInfo.allowDownload,
        upload_status: 'completed',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('id')
      .single();
    
    if (error) {
      throw new Error(`数据库保存失败: ${error.message}`);
    }
    
    return data.id;
    
  } catch (error) {
    throw new Error(`数据保存错误: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}

/**
 * 处理视频文件的特殊逻辑
 */
async function processVideoFile(resourceId: string, fileUrl: string): Promise<void> {
  try {
    // 这里可以添加视频处理逻辑，比如：
    // 1. 生成缩略图
    // 2. 转码为多种清晰度
    // 3. 提取视频信息（时长、分辨率等）
    
    // 更新处理状态
    await supabase
      .from('learning_resources')
      .update({
        processing_status: 'processing',
        updated_at: new Date().toISOString()
      })
      .eq('id', resourceId);
    
    // 模拟视频处理过程
    setTimeout(async () => {
      await supabase
        .from('learning_resources')
        .update({
          processing_status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', resourceId);
    }, 5000);
    
  } catch (error) {
    console.error('视频处理失败:', error);
    
    await supabase
      .from('learning_resources')
      .update({
        processing_status: 'failed',
        updated_at: new Date().toISOString()
      })
      .eq('id', resourceId);
  }
}

/**
 * POST /api/admin/resources/upload
 * 上传学习资源文件
 */
export async function POST(request: NextRequest) {
  const errorHandler = ErrorHandler.getInstance();
  
  try {
    // 检查管理员权限
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { success: false, error: '缺少认证信息' },
        { status: 401 }
      );
    }
    
    // 解析表单数据
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const metadataStr = formData.get('metadata') as string;
    
    if (!file) {
      return NextResponse.json(
        { success: false, error: '请选择要上传的文件' },
        { status: 400 }
      );
    }
    
    // 解析元数据
    let metadata;
    try {
      metadata = JSON.parse(metadataStr || '{}');
    } catch (error) {
      return NextResponse.json(
        { success: false, error: '元数据格式错误' },
        { status: 400 }
      );
    }
    
    // 验证元数据
    const validationResult = FileUploadSchema.safeParse(metadata);
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      return NextResponse.json(
        { success: false, error: `元数据验证失败: ${errors}` },
        { status: 400 }
      );
    }
    
    const validMetadata = validationResult.data;
    
    // 验证文件
    const fileValidation = validateFile(file);
    if (!fileValidation.valid) {
      return NextResponse.json(
        { success: false, error: fileValidation.error },
        { status: 400 }
      );
    }
    
    // 生成唯一文件名
    const uniqueFilename = generateUniqueFilename(file.name);
    
    // 上传文件
    const fileUrl = await uploadFileToStorage(file, uniqueFilename, fileValidation.type!);
    
    // 确保文件类型存在
    if (!fileValidation.type) {
      return NextResponse.json(
        { success: false, error: '无法确定文件类型' },
        { status: 400 }
      );
    }

    // 保存文件信息
    const fileInfo = {
      title: validMetadata.title,
      description: validMetadata.description,
      fileType: fileValidation.type,
      fileName: uniqueFilename,
      originalName: file.name,
      fileSize: file.size,
      fileUrl: fileUrl,
      mimeType: file.type,
      category: validMetadata.category,
      tags: validMetadata.tags,
      courseId: validMetadata.courseId,
      lessonId: validMetadata.lessonId,
      isPublic: validMetadata.isPublic,
      allowDownload: validMetadata.allowDownload
    };
    
    const resourceId = await saveFileInfo(fileInfo);
    
    // 如果是视频文件，启动后台处理
    if (fileValidation.type === 'video') {
      processVideoFile(resourceId, fileUrl);
    }
    
    return NextResponse.json({
      success: true,
      data: {
        id: resourceId,
        title: validMetadata.title,
        fileType: fileValidation.type,
        fileName: uniqueFilename,
        fileSize: file.size,
        fileUrl: fileUrl,
        uploadStatus: 'completed',
        processingStatus: fileValidation.type === 'video' ? 'processing' : 'completed'
      },
      message: '文件上传成功'
    });
    
  } catch (error) {
    console.error('文件上传错误:', error);
    
    // 记录错误
    const appError = error instanceof Error 
      ? new AppError(
          ErrorType.FILE_UPLOAD_ERROR,
          error.message,
          {
            statusCode: 500,
            severity: ErrorSeverity.HIGH,
            retryable: true,
            originalError: error
          }
        )
      : new AppError(
          ErrorType.FILE_UPLOAD_ERROR,
          '文件上传失败',
          {
            statusCode: 500,
            severity: ErrorSeverity.HIGH,
            retryable: true
          }
        );
    
    errorHandler.logError(appError, {
      context: 'file_upload',
      endpoint: '/api/admin/resources/upload'
    });
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '文件上传失败'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/resources/upload/config
 * 获取上传配置信息
 */
export async function GET() {
  try {
    const config = {
      supportedTypes: Object.keys(FILE_TYPES),
      maxSizes: Object.fromEntries(
        Object.entries(FILE_TYPES).map(([type, config]) => [
          type,
          Math.round(config.maxSize / (1024 * 1024)) + 'MB'
        ])
      ),
      allowedExtensions: Object.fromEntries(
        Object.entries(FILE_TYPES).map(([type, config]) => [type, config.extensions])
      ),
      uploadEndpoint: '/api/admin/resources/upload',
      chunkSize: 5 * 1024 * 1024, // 5MB chunks for large files
      maxConcurrentUploads: 3
    };
    
    return NextResponse.json({
      success: true,
      data: config,
      message: '上传配置获取成功'
    });
    
  } catch (error) {
    console.error('获取上传配置错误:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: '获取上传配置失败'
      },
      { status: 500 }
    );
  }
}
