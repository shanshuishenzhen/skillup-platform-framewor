/**
 * 用户批量导入组件
 * 提供Excel/CSV文件上传和批量导入用户功能
 */

'use client';

import React, { useState, useRef } from 'react';
import { Upload, Download, Users, AlertCircle, CheckCircle, X, FileText } from 'lucide-react';
import TemplateDownload from './TemplateDownload';

/**
 * 导入结果接口
 */
interface ImportResult {
  success: boolean;
  message: string;
  imported?: number;
  failed?: number;
  errors?: string[];
}

/**
 * 用户批量导入组件
 */
export default function UserImport() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * 处理文件选择
   */
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      // 验证文件类型
      const allowedTypes = [
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/csv'
      ];
      
      if (!allowedTypes.includes(selectedFile.type) && 
          !selectedFile.name.toLowerCase().endsWith('.csv') &&
          !selectedFile.name.toLowerCase().endsWith('.xlsx') &&
          !selectedFile.name.toLowerCase().endsWith('.xls')) {
        alert('请选择Excel文件(.xlsx, .xls)或CSV文件(.csv)');
        return;
      }
      
      // 验证文件大小 (最大10MB)
      if (selectedFile.size > 10 * 1024 * 1024) {
        alert('文件大小不能超过10MB');
        return;
      }
      
      setFile(selectedFile);
      setResult(null);
    }
  };

  /**
   * 清除选择的文件
   */
  const clearFile = () => {
    setFile(null);
    setResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  /**
   * 上传并导入用户
   */
  const handleImport = async () => {
    if (!file) {
      alert('请先选择文件');
      return;
    }

    setUploading(true);
    setProgress(0);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      // 模拟进度更新
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 200);

      const response = await fetch('/api/admin/users/import', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      clearInterval(progressInterval);
      setProgress(100);

      const data = await response.json();

      if (response.ok) {
        setResult({
          success: true,
          message: data.message || '用户导入成功',
          imported: data.imported,
          failed: data.failed,
          errors: data.errors
        });
      } else {
        setResult({
          success: false,
          message: data.error || '导入失败',
          errors: data.errors
        });
      }
    } catch (error) {
      console.error('导入失败:', error);
      setResult({
        success: false,
        message: '网络错误，请稍后重试'
      });
    } finally {
      setUploading(false);
      setTimeout(() => setProgress(0), 2000);
    }
  };

  /**
   * 下载模板文件
   * 调用API接口获取动态生成的Excel模板文件
   */
  const downloadTemplate = async () => {
    try {
      const response = await fetch('/api/admin/users/import', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('下载模板失败');
      }

      // 获取文件blob
      const blob = await response.blob();
      
      // 创建下载链接
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'user-import-template.csv';
      document.body.appendChild(link);
      link.click();
      
      // 清理资源
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('下载模板失败:', error);
      alert('下载模板失败，请稍后重试');
    }
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center mb-4">
          <Users className="h-6 w-6 text-blue-600 mr-3" />
          <h2 className="text-xl font-semibold text-gray-900">批量导入用户</h2>
        </div>
        <p className="text-gray-600">
          通过上传Excel或CSV文件批量导入用户。请确保文件格式正确，包含必要的用户信息字段。
        </p>
      </div>

      {/* 操作说明 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-medium text-blue-800 mb-2">导入说明</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• 支持Excel文件(.xlsx, .xls)和CSV文件(.csv)</li>
              <li>• 文件大小不能超过10MB</li>
              <li>• 必填字段（带*号）：姓名*、手机号*、身份证号码*、角色*、密码*</li>
              <li>• 可选字段：邮箱、员工ID、部门、职位、组织机构</li>
              <li>• 手机号必须为11位数字</li>
              <li>• 身份证号码必须为18位有效格式</li>
              <li>• 角色字段必须使用以下值之一：admin、expert、teacher、student、user</li>
              <li>• 密码至少6位字符</li>
              <li>• 建议先下载模板文件，按照格式填写数据</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Excel模板下载 */}
      <TemplateDownload
        onTemplateSelect={(type) => {
          if (type === 'users') {
            // 模板下载后的回调处理
            console.log('用户模板已下载');
          }
        }}
        showPreview={true}
      />

      {/* 文件上传区域 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">选择导入文件</h3>
        
        {!file ? (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
            <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <div className="space-y-2">
              <p className="text-lg font-medium text-gray-900">选择文件上传</p>
              <p className="text-sm text-gray-600">支持 .xlsx, .xls, .csv 格式，最大10MB</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              选择文件
            </button>
          </div>
        ) : (
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <FileText className="h-8 w-8 text-blue-600 mr-3" />
                <div>
                  <p className="font-medium text-gray-900">{file.name}</p>
                  <p className="text-sm text-gray-600">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <button
                onClick={clearFile}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                disabled={uploading}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 进度条 */}
      {uploading && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-3"></div>
            <span className="text-sm font-medium text-gray-900">正在导入用户...</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="text-sm text-gray-600 mt-2">{progress}% 完成</p>
        </div>
      )}

      {/* 导入结果 */}
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
                {result.success ? '导入成功' : '导入失败'}
              </h3>
              <p className={`text-sm mb-2 ${
                result.success ? 'text-green-700' : 'text-red-700'
              }`}>
                {result.message}
              </p>
              
              {result.success && result.imported !== undefined && (
                <div className="text-sm text-green-700">
                  <p>成功导入: {result.imported} 个用户</p>
                  {result.failed && result.failed > 0 && (
                    <p>导入失败: {result.failed} 个用户</p>
                  )}
                </div>
              )}
              
              {result.errors && result.errors.length > 0 && (
                <div className="mt-3">
                  <p className={`text-sm font-medium mb-1 ${
                    result.success ? 'text-green-800' : 'text-red-800'
                  }`}>
                    错误详情:
                  </p>
                  <ul className={`text-sm space-y-1 ${
                    result.success ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {result.errors.slice(0, 5).map((error, index) => {
                      // 处理错误对象，确保只渲染字符串
                      let errorMessage = '';
                      if (typeof error === 'string') {
                        errorMessage = error;
                      } else if (typeof error === 'object' && error !== null) {
                        const errorObj = error as { error?: string; row?: number };
                        if (errorObj.error) {
                          errorMessage = `第${errorObj.row || '?'}行: ${errorObj.error}`;
                        } else {
                          errorMessage = `第${errorObj.row || '?'}行: 数据格式错误`;
                        }
                      } else {
                        errorMessage = '未知错误';
                      }
                      return <li key={index}>• {errorMessage}</li>;
                    })}
                    {result.errors.length > 5 && (
                      <li>• 还有 {result.errors.length - 5} 个错误...</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 导入按钮 */}
      <div className="flex justify-end">
        <button
          onClick={handleImport}
          disabled={!file || uploading}
          className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center"
        >
          {uploading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              导入中...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              开始导入
            </>
          )}
        </button>
      </div>
    </div>
  );
}