/**
 * 学习资源批量上传组件
 * 支持视频、音频、文档、图片等多种类型文件的批量上传
 */

'use client';

import React, { useState, useRef } from 'react';
import { Upload, FileText, Video, Music, Image, File, X, CheckCircle, AlertCircle, Trash2 } from 'lucide-react';
import TemplateDownload from './TemplateDownload';

/**
 * 文件类型配置
 */
const FILE_TYPES = {
  video: {
    label: '视频文件',
    icon: Video,
    accept: '.mp4,.avi,.mov,.wmv,.flv,.webm',
    maxSize: 500 * 1024 * 1024, // 500MB
    color: 'text-purple-600'
  },
  audio: {
    label: '音频文件',
    icon: Music,
    accept: '.mp3,.wav,.aac,.flac,.ogg',
    maxSize: 100 * 1024 * 1024, // 100MB
    color: 'text-green-600'
  },
  document: {
    label: '文档文件',
    icon: FileText,
    accept: '.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt',
    maxSize: 50 * 1024 * 1024, // 50MB
    color: 'text-blue-600'
  },
  image: {
    label: '图片文件',
    icon: Image,
    accept: '.jpg,.jpeg,.png,.gif,.bmp,.webp,.svg',
    maxSize: 10 * 1024 * 1024, // 10MB
    color: 'text-orange-600'
  }
};

/**
 * 上传文件接口
 */
interface UploadFile {
  id: string;
  file: File;
  type: keyof typeof FILE_TYPES;
  title: string;
  description: string;
  category: string;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
  url?: string;
}

/**
 * 上传结果接口
 */
interface UploadResult {
  success: boolean;
  message: string;
  uploaded?: number;
  failed?: number;
  files?: Array<{
    filename: string;
    url: string;
    type: string;
  }>;
}

/**
 * 学习资源批量上传组件
 */
export default function ResourceUpload() {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * 获取文件类型
   */
  const getFileType = (file: File): keyof typeof FILE_TYPES => {
    const extension = file.name.toLowerCase().split('.').pop() || '';
    
    if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm'].includes(extension)) {
      return 'video';
    }
    if (['mp3', 'wav', 'aac', 'flac', 'ogg'].includes(extension)) {
      return 'audio';
    }
    if (['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'txt'].includes(extension)) {
      return 'document';
    }
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'].includes(extension)) {
      return 'image';
    }
    
    return 'document'; // 默认为文档类型
  };

  /**
   * 验证文件
   */
  const validateFile = (file: File): string | undefined => {
    const fileType = getFileType(file);
    const config = FILE_TYPES[fileType];
    
    if (file.size > config.maxSize) {
      return `文件大小超过限制 (最大 ${(config.maxSize / 1024 / 1024).toFixed(0)}MB)`;
    }
    
    return undefined;
  };

  /**
   * 处理文件选择
   */
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    
    const newFiles: UploadFile[] = selectedFiles.map(file => {
      const error = validateFile(file);
      const fileType = getFileType(file);
      
      return {
        id: Math.random().toString(36).substr(2, 9),
        file,
        type: fileType,
        title: file.name.replace(/\.[^/.]+$/, ''), // 移除扩展名
        description: '',
        category: '',
        progress: 0,
        status: error ? 'error' : 'pending',
        error
      };
    });
    
    setFiles(prev => [...prev, ...newFiles]);
    setResult(null);
    
    // 清空input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  /**
   * 移除文件
   */
  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  /**
   * 更新文件信息
   */
  const updateFile = (id: string, updates: Partial<UploadFile>) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  /**
   * 清空所有文件
   */
  const clearAllFiles = () => {
    setFiles([]);
    setResult(null);
  };

  /**
   * 上传单个文件
   */
  const uploadSingleFile = async (uploadFile: UploadFile): Promise<boolean> => {
    try {
      updateFile(uploadFile.id, { status: 'uploading', progress: 0 });
      
      const formData = new FormData();
      formData.append('file', uploadFile.file);
      formData.append('type', uploadFile.type);
      formData.append('title', uploadFile.title);
      formData.append('description', uploadFile.description);
      formData.append('category', uploadFile.category);
      
      // 模拟进度更新
      const progressInterval = setInterval(() => {
        updateFile(uploadFile.id, {
          progress: Math.min(90, uploadFile.progress + 10)
        });
      }, 200);
      
      const response = await fetch('/api/admin/resources/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });
      
      clearInterval(progressInterval);
      
      const data = await response.json();
      
      if (response.ok) {
        updateFile(uploadFile.id, {
          status: 'success',
          progress: 100,
          url: data.url
        });
        return true;
      } else {
        updateFile(uploadFile.id, {
          status: 'error',
          progress: 0,
          error: data.error || '上传失败'
        });
        return false;
      }
    } catch (error) {
      console.error('上传失败:', error);
      updateFile(uploadFile.id, {
        status: 'error',
        progress: 0,
        error: '网络错误'
      });
      return false;
    }
  };

  /**
   * 批量上传文件
   */
  const handleBatchUpload = async () => {
    const validFiles = files.filter(f => f.status === 'pending' && !f.error);
    
    if (validFiles.length === 0) {
      alert('没有可上传的文件');
      return;
    }
    
    // 检查必填字段
    const incompleteFiles = validFiles.filter(f => !f.title.trim() || !f.category.trim());
    if (incompleteFiles.length > 0) {
      alert('请填写所有文件的标题和分类');
      return;
    }
    
    setUploading(true);
    setResult(null);
    
    let successCount = 0;
    let failedCount = 0;
    const uploadedFiles: Array<{ filename: string; url: string; type: string }> = [];
    
    // 并发上传（最多3个文件同时上传）
    const concurrency = 3;
    for (let i = 0; i < validFiles.length; i += concurrency) {
      const batch = validFiles.slice(i, i + concurrency);
      const promises = batch.map(uploadSingleFile);
      const results = await Promise.all(promises);
      
      results.forEach((success, index) => {
        if (success) {
          successCount++;
          const file = batch[index];
          uploadedFiles.push({
            filename: file.file.name,
            url: file.url || '',
            type: file.type
          });
        } else {
          failedCount++;
        }
      });
    }
    
    setResult({
      success: successCount > 0,
      message: `上传完成：成功 ${successCount} 个，失败 ${failedCount} 个`,
      uploaded: successCount,
      failed: failedCount,
      files: uploadedFiles
    });
    
    setUploading(false);
  };

  /**
   * 渲染文件类型图标
   */
  const renderFileIcon = (type: keyof typeof FILE_TYPES) => {
    const config = FILE_TYPES[type];
    const IconComponent = config.icon;
    return <IconComponent className={`h-5 w-5 ${config.color}`} />;
  };

  return (
    <div className="space-y-6">
      {/* Excel模板下载 */}
      <TemplateDownload
        onTemplateSelect={(type) => {
          if (type === 'resources') {
            console.log('资源模板已下载');
          }
        }}
        showPreview={true}
      />

      {/* 页面标题 */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center mb-4">
          <Upload className="h-6 w-6 text-blue-600 mr-3" />
          <h2 className="text-xl font-semibold text-gray-900">批量上传学习资源</h2>
        </div>
        <p className="text-gray-600">
          支持批量上传视频、音频、文档、图片等多种类型的学习资源文件。
        </p>
      </div>

      {/* 文件类型说明 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-medium text-blue-800 mb-2">支持的文件类型</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {Object.entries(FILE_TYPES).map(([key, config]) => {
                const IconComponent = config.icon;
                return (
                  <div key={key} className="flex items-center text-sm text-blue-700">
                    <IconComponent className={`h-4 w-4 mr-2 ${config.color}`} />
                    <div>
                      <div className="font-medium">{config.label}</div>
                      <div className="text-xs">最大 {(config.maxSize / 1024 / 1024).toFixed(0)}MB</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 文件选择区域 */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">选择文件</h3>
          {files.length > 0 && (
            <button
              onClick={clearAllFiles}
              className="text-red-600 hover:text-red-700 transition-colors flex items-center text-sm"
              disabled={uploading}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              清空所有
            </button>
          )}
        </div>
        
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
          <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <div className="space-y-2">
            <p className="text-lg font-medium text-gray-900">选择文件上传</p>
            <p className="text-sm text-gray-600">支持多种文件格式，可同时选择多个文件</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={Object.values(FILE_TYPES).map(t => t.accept).join(',')}
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
            disabled={uploading}
          >
            选择文件
          </button>
        </div>
      </div>

      {/* 文件列表 */}
      {files.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            文件列表 ({files.length} 个文件)
          </h3>
          
          <div className="space-y-4">
            {files.map((file) => (
              <div key={file.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start flex-1">
                    <div className="flex items-center mr-4">
                      {renderFileIcon(file.type)}
                      <div className="ml-2">
                        <p className="font-medium text-gray-900">{file.file.name}</p>
                        <p className="text-sm text-gray-600">
                          {FILE_TYPES[file.type].label} • {(file.file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          标题 *
                        </label>
                        <input
                          type="text"
                          value={file.title}
                          onChange={(e) => updateFile(file.id, { title: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="输入资源标题"
                          disabled={uploading || file.status === 'success'}
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          分类 *
                        </label>
                        <input
                          type="text"
                          value={file.category}
                          onChange={(e) => updateFile(file.id, { category: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="输入资源分类"
                          disabled={uploading || file.status === 'success'}
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          描述
                        </label>
                        <input
                          type="text"
                          value={file.description}
                          onChange={(e) => updateFile(file.id, { description: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="输入资源描述"
                          disabled={uploading || file.status === 'success'}
                        />
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => removeFile(file.id)}
                    className="text-gray-400 hover:text-gray-600 transition-colors ml-4"
                    disabled={uploading}
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                
                {/* 状态显示 */}
                <div className="mt-3">
                  {file.status === 'pending' && !file.error && (
                    <div className="flex items-center text-sm text-gray-600">
                      <File className="h-4 w-4 mr-2" />
                      等待上传
                    </div>
                  )}
                  
                  {file.status === 'uploading' && (
                    <div className="space-y-2">
                      <div className="flex items-center text-sm text-blue-600">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                        上传中... {file.progress}%
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${file.progress}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                  
                  {file.status === 'success' && (
                    <div className="flex items-center text-sm text-green-600">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      上传成功
                    </div>
                  )}
                  
                  {(file.status === 'error' || file.error) && (
                    <div className="flex items-center text-sm text-red-600">
                      <AlertCircle className="h-4 w-4 mr-2" />
                      {file.error || '上传失败'}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 上传结果 */}
      {result && (
        <div className={`rounded-lg shadow p-6 ${
          result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
        }`}>
          <div className="flex items-start">
            {result.success ? (
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
            )}
            <div className="flex-1">
              <h3 className={`text-sm font-medium mb-2 ${
                result.success ? 'text-green-800' : 'text-red-800'
              }`}>
                上传结果
              </h3>
              <p className={`text-sm mb-2 ${
                result.success ? 'text-green-700' : 'text-red-700'
              }`}>
                {result.message}
              </p>
              
              {result.files && result.files.length > 0 && (
                <div className="mt-3">
                  <p className="text-sm font-medium text-green-800 mb-1">成功上传的文件:</p>
                  <ul className="text-sm text-green-700 space-y-1">
                    {result.files.map((file, index) => (
                      <li key={index}>• {file.filename} ({FILE_TYPES[file.type as keyof typeof FILE_TYPES]?.label})</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 上传按钮 */}
      {files.length > 0 && (
        <div className="flex justify-end">
          <button
            onClick={handleBatchUpload}
            disabled={uploading || files.filter(f => f.status === 'pending' && !f.error).length === 0}
            className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center"
          >
            {uploading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                上传中...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                开始上传 ({files.filter(f => f.status === 'pending' && !f.error).length} 个文件)
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}