/**
 * 试卷导入页面
 * 管理员可以通过此页面导入试卷文件
 * 
 * @author SOLO Coding
 * @version 1.0.0
 */

'use client';

import React, { useState, useRef } from 'react';
import { toast } from 'sonner';
import { Upload, FileText, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import AdminPageLayout from '@/components/layout/AdminPageLayout';

interface ImportResult {
  success: boolean;
  message: string;
  data?: {
    paperId: string;
    title: string;
    totalQuestions: number;
  };
}

/**
 * 试卷导入页面组件
 * 提供文件上传和导入功能
 */
export default function ExamPaperImportPage() {
  const [uploading, setUploading] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * 处理文件选择
   * @param event - 文件选择事件
   */
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 验证文件类型
    const allowedTypes = ['.json', '.txt', '.csv'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    
    if (!allowedTypes.includes(fileExtension)) {
      toast.error('请选择支持的文件格式：JSON、TXT 或 CSV');
      return;
    }

    await uploadFile(file);
  };

  /**
   * 上传并导入文件
   * @param file - 要上传的文件
   */
  const uploadFile = async (file: File) => {
    try {
      setUploading(true);
      setImportResult(null);

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/admin/exam-paper-import', {
        method: 'POST',
        body: formData,
      });

      const result: ImportResult = await response.json();

      if (result.success) {
        toast.success('试卷导入成功！');
        setImportResult(result);
      } else {
        toast.error(result.message || '导入失败');
        setImportResult(result);
      }
    } catch (error) {
      console.error('导入失败:', error);
      toast.error('导入过程中发生错误');
      setImportResult({
        success: false,
        message: '导入过程中发生错误'
      });
    } finally {
      setUploading(false);
      // 清空文件输入
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  /**
   * 处理拖拽上传
   */
  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file) {
      const allowedTypes = ['.json', '.txt', '.csv'];
      const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
      
      if (!allowedTypes.includes(fileExtension)) {
        toast.error('请选择支持的文件格式：JSON、TXT 或 CSV');
        return;
      }
      
      uploadFile(file);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  return (
    <AdminPageLayout
      title="试卷导入"
      description="导入试卷文件，支持 JSON、TXT、CSV 格式"
    >
      <div className="max-w-4xl mx-auto space-y-6">
        {/* 上传区域 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Upload className="h-5 w-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900">上传试卷文件</h2>
            </div>
            
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                uploading
                  ? 'border-blue-300 bg-blue-50'
                  : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >
              {uploading ? (
                <div className="space-y-4">
                  <Loader2 className="h-12 w-12 text-blue-600 mx-auto animate-spin" />
                  <div>
                    <p className="text-lg font-medium text-gray-900">正在导入试卷...</p>
                    <p className="text-sm text-gray-500">请稍候，正在处理您的文件</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto" />
                  <div>
                    <p className="text-lg font-medium text-gray-900">拖拽文件到此处或点击选择</p>
                    <p className="text-sm text-gray-500">支持 JSON、TXT、CSV 格式，最大 10MB</p>
                  </div>
                  <button
                    type="button"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    选择文件
                  </button>
                </div>
              )}
            </div>
            
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.txt,.csv"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        </div>

        {/* 导入结果 */}
        {importResult && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                {importResult.success ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-600" />
                )}
                <h2 className="text-lg font-semibold text-gray-900">导入结果</h2>
              </div>
              
              <div className={`p-4 rounded-lg ${
                importResult.success 
                  ? 'bg-green-50 border border-green-200' 
                  : 'bg-red-50 border border-red-200'
              }`}>
                <p className={`font-medium ${
                  importResult.success ? 'text-green-800' : 'text-red-800'
                }`}>
                  {importResult.message}
                </p>
                
                {importResult.success && importResult.data && (
                  <div className="mt-3 space-y-2 text-sm text-green-700">
                    <p><strong>试卷标题：</strong>{importResult.data.title}</p>
                    <p><strong>题目数量：</strong>{importResult.data.totalQuestions} 题</p>
                    <p><strong>试卷ID：</strong>{importResult.data.paperId}</p>
                  </div>
                )}
              </div>
              
              {importResult.success && (
                <div className="flex space-x-3">
                  <button
                    type="button"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    onClick={() => window.location.href = '/admin/exams/create'}
                  >
                    创建考试
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    onClick={() => setImportResult(null)}
                  >
                    继续导入
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 使用说明 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">使用说明</h2>
            
            <div className="space-y-3 text-sm text-gray-600">
              <div>
                <h3 className="font-medium text-gray-900">支持的文件格式：</h3>
                <ul className="mt-1 list-disc list-inside space-y-1">
                  <li><strong>JSON格式：</strong>标准的试卷数据格式</li>
                  <li><strong>TXT格式：</strong>纯文本格式的题目列表</li>
                  <li><strong>CSV格式：</strong>表格格式的题目数据</li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-medium text-gray-900">文件要求：</h3>
                <ul className="mt-1 list-disc list-inside space-y-1">
                  <li>文件大小不超过 10MB</li>
                  <li>文件编码为 UTF-8</li>
                  <li>题目数据格式正确</li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-medium text-gray-900">导入流程：</h3>
                <ol className="mt-1 list-decimal list-inside space-y-1">
                  <li>选择或拖拽试卷文件</li>
                  <li>系统自动解析和验证文件</li>
                  <li>创建试卷记录和题目数据</li>
                  <li>可直接跳转创建考试页面关联试卷</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminPageLayout>
  );
}