/**
 * 用户批量导入 - 文件上传步骤组件
 * 提供文件选择、格式验证、数据预览功能
 */

'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, FileText, AlertTriangle, CheckCircle, X, Eye, Download, RefreshCw } from 'lucide-react';

/**
 * 文件验证结果接口 (与父组件同步)
 */
interface ValidationResult {
  isValid: boolean;
  data: any[];
  errors: Array<{
    row: number;
    field?: string;
    message: string;
    data?: Record<string, string>;
  }>;
  warnings: string[];
  summary: {
    totalRows: number;
    validRows: number;
    errorRows: number;
  };
}

/**
 * 预览数据行接口
 */
interface PreviewRow {
  rowIndex: number;
  data: Record<string, string>;
  errors: string[];
  isValid: boolean;
}

/**
 * 文件上传步骤组件属性
 */
interface UploadStepProps {
  onComplete: (file: File, validationResult: ValidationResult, previewData: PreviewRow[]) => void;
  onNext: () => void;
  onPrevious: () => void;
}

/**
 * 文件上传步骤组件
 */
export default function UploadStep({ onComplete, onNext, onPrevious }: UploadStepProps) {
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [previewData, setPreviewData] = useState<PreviewRow[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * 支持的文件类型
   */
  const supportedTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel', // .xls
    'text/csv' // .csv
  ];

  /**
   * 必填字段配置
   */
  const requiredFields = ['姓名', '手机号', '身份证号码', '角色', '密码'];
  const optionalFields = ['邮箱', '员工ID', '部门', '职位', '状态'];
  const allFields = [...requiredFields, ...optionalFields];

  /**
   * 处理拖拽事件
   */
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  /**
   * 处理文件拖放
   */
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  }, []);

  /**
   * 处理文件选择
   */
  const handleFileSelect = async (file: File) => {
    // 验证文件类型
    if (!supportedTypes.includes(file.type) && !file.name.toLowerCase().endsWith('.csv')) {
      alert('请选择Excel文件(.xlsx, .xls)或CSV文件(.csv)');
      return;
    }

    // 验证文件大小 (10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('文件大小不能超过10MB');
      return;
    }

    setUploadedFile(file);
    setValidationResult(null);
    setPreviewData([]);
    setShowPreview(false);
    
    // 开始验证文件
    await validateFile(file);
  };

  /**
   * 验证文件内容
   */
  const validateFile = async (file: File) => {
    setIsValidating(true);
    
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());

      if (lines.length < 2) {
        const result: ValidationResult = {
          isValid: false, data: [], errors: [{ row: 1, message: '文件内容为空或格式不正确' }], warnings: [],
          summary: { totalRows: 0, validRows: 0, errorRows: 0 }
        };
        setValidationResult(result);
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      const dataRows = lines.slice(1);
      
      const allData: any[] = [];
      const allErrors: ValidationResult['errors'] = [];
      
      const missingRequired = requiredFields.filter(field => !headers.includes(field));
      if (missingRequired.length > 0) {
        allErrors.push({ row: 1, message: `缺少必填字段：${missingRequired.join('、')}` });
      }
      
      const preview: PreviewRow[] = [];
      let validCount = 0;
      
      dataRows.forEach((row, index) => {
        const values = row.split(',').map(v => v.trim().replace(/"/g, ''));
        const rowData: Record<string, string> = {};
        const rowErrors: string[] = [];
        
        headers.forEach((header, i) => { rowData[header] = values[i] || ''; });
        
        requiredFields.forEach(field => {
          if (!rowData[field] || rowData[field].trim() === '') {
            const msg = `${field}不能为空`;
            allErrors.push({ row: index + 2, field, message: msg, data: rowData });
            rowErrors.push(msg);
          }
        });
        
        if (rowData['手机号'] && !/^1[3-9]\d{9}$/.test(rowData['手机号'])) {
          const msg = '手机号格式不正确';
          allErrors.push({ row: index + 2, field: '手机号', message: msg, data: rowData });
          rowErrors.push(msg);
        }
        
        if (rowData['身份证号码'] && !/^[1-9]\d{5}(18|19|20)\d{2}((0[1-9])|(1[0-2]))(([0-2][1-9])|10|20|30|31)\d{3}[0-9Xx]$/.test(rowData['身份证号码'])) {
          const msg = '身份证号码格式不正确';
          allErrors.push({ row: index + 2, field: '身份证号码', message: msg, data: rowData });
          rowErrors.push(msg);
        }
        
        if (rowData['邮箱'] && rowData['邮箱'].trim() !== '' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rowData['邮箱'])) {
          const msg = '邮箱格式不正确';
          allErrors.push({ row: index + 2, field: '邮箱', message: msg, data: rowData });
          rowErrors.push(msg);
        }
        
        if (rowData['角色'] && !['user', 'admin', 'super_admin'].includes(rowData['角色'])) {
          const msg = '角色必须是：user、admin或super_admin';
          allErrors.push({ row: index + 2, field: '角色', message: msg, data: rowData });
          rowErrors.push(msg);
        }
        
        const isValid = rowErrors.length === 0;
        if (isValid) {
          validCount++;
          allData.push(rowData);
        }
        
        if (index < 50) {
          preview.push({ rowIndex: index + 2, data: rowData, errors: rowErrors, isValid });
        }
      });
      
      const warnings: string[] = [];
      if (dataRows.length > 1000) {
        warnings.push('数据量较大，建议分批导入以提高成功率');
      }
      
      const result: ValidationResult = {
        isValid: allErrors.length === 0,
        data: allData,
        errors: allErrors,
        warnings,
        summary: {
          totalRows: dataRows.length,
          validRows: validCount,
          errorRows: dataRows.length - validCount,
        }
      };
      
      setValidationResult(result);
      setPreviewData(preview);
      
    } catch (error) {
      console.error('文件验证失败:', error);
      const result: ValidationResult = {
        isValid: false, data: [], errors: [{ row: 1, message: '文件解析失败，请检查文件格式' }], warnings: [],
        summary: { totalRows: 0, validRows: 0, errorRows: 0 }
      };
      setValidationResult(result);
    } finally {
      setIsValidating(false);
    }
  };

  /**
   * 重新选择文件
   */
  const resetFile = () => {
    setUploadedFile(null);
    setValidationResult(null);
    setPreviewData([]);
    setShowPreview(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  /**
   * 处理下一步
   */
  const handleNext = () => {
    if (uploadedFile && validationResult && validationResult.isValid) {
      // The validationResult in state now matches the required type
      onComplete(uploadedFile, validationResult, previewData);
      onNext();
    }
  };

  /**
   * 格式化文件大小
   */
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* 文件上传区域 */}
      {!uploadedFile ? (
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            选择或拖拽文件到此处
          </h3>
          <p className="text-gray-600 mb-4">
            支持Excel文件(.xlsx, .xls)和CSV文件(.csv)，最大10MB
          </p>
          
          <div className="space-y-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              选择文件
            </button>
            
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
              className="hidden"
            />
          </div>
        </div>
      ) : (
        /* 文件信息显示 */
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <FileText className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{uploadedFile.name}</h3>
                <p className="text-sm text-gray-600">
                  {formatFileSize(uploadedFile.size)} • {uploadedFile.type || 'CSV文件'}
                </p>
              </div>
            </div>
            
            <button
              onClick={resetFile}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              title="重新选择文件"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          
          {/* 验证状态 */}
          {isValidating ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 text-blue-600 animate-spin mr-3" />
              <span className="text-gray-600">正在验证文件...</span>
            </div>
          ) : validationResult ? (
            <div className="space-y-4">
              {/* 验证结果概览 */}
              <div className={`p-4 rounded-lg ${
                validationResult.isValid
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-red-50 border border-red-200'
              }`}>
                <div className="flex items-center mb-2">
                  {validationResult.isValid ? (
                    <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
                  )}
                  <span className={`font-semibold ${
                    validationResult.isValid ? 'text-green-900' : 'text-red-900'
                  }`}>
                    {validationResult.isValid ? '文件验证通过' : '文件验证失败'}
                  </span>
                </div>
                
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">总行数：</span>
                    <span className="font-medium">{validationResult.summary.totalRows}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">有效行数：</span>
                    <span className="font-medium text-green-600">{validationResult.summary.validRows}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">错误行数：</span>
                    <span className="font-medium text-red-600">{validationResult.summary.errorRows}</span>
                  </div>
                </div>
              </div>
              
              {/* 错误信息 */}
              {validationResult.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="font-semibold text-red-900 mb-2">错误信息（仅显示前5条）：</h4>
                  <ul className="text-sm text-red-800 space-y-1">
                    {validationResult.errors.slice(0, 5).map((error, index) => (
                      <li key={index}>• 行 {error.row}: {error.message} {error.field && `(${error.field})`}</li>
                    ))}
                  </ul>
                  {validationResult.errors.length > 5 && (
                    <p className="text-xs text-red-700 mt-2">...等共 {validationResult.errors.length} 条错误。</p>
                  )}
                </div>
              )}
              
              {/* 警告信息 */}
              {validationResult.warnings.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h4 className="font-semibold text-yellow-900 mb-2">注意事项：</h4>
                  <ul className="text-sm text-yellow-800 space-y-1">
                    {validationResult.warnings.map((warning, index) => (
                      <li key={index}>• {warning}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {/* 数据预览 */}
              {previewData.length > 0 && (
                <div className="border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between p-4 border-b border-gray-200">
                    <h4 className="font-semibold text-gray-900">数据预览</h4>
                    <button
                      onClick={() => setShowPreview(!showPreview)}
                      className="flex items-center text-blue-600 hover:text-blue-700 transition-colors"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      {showPreview ? '隐藏预览' : '显示预览'}
                    </button>
                  </div>
                  
                  {showPreview && (
                    <div className="p-4">
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                          <thead>
                            <tr className="border-b border-gray-200">
                              <th className="text-left py-2 px-3 font-medium text-gray-900">行号</th>
                              <th className="text-left py-2 px-3 font-medium text-gray-900">状态</th>
                              {allFields.map(field => (
                                <th key={field} className="text-left py-2 px-3 font-medium text-gray-900">
                                  {field}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {previewData.slice(0, 10).map((row) => (
                              <tr key={row.rowIndex} className="border-b border-gray-100">
                                <td className="py-2 px-3 text-gray-600">{row.rowIndex}</td>
                                <td className="py-2 px-3">
                                  {row.isValid ? (
                                    <span className="text-green-600 text-xs">✓ 有效</span>
                                  ) : (
                                    <span className="text-red-600 text-xs">✗ 错误</span>
                                  )}
                                </td>
                                {allFields.map(field => (
                                  <td key={field} className="py-2 px-3 text-gray-900 max-w-32 truncate">
                                    {row.data[field] || '-'}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      
                      {previewData.length > 10 && (
                        <p className="text-sm text-gray-600 mt-3 text-center">
                          显示前10行，共{previewData.length}行数据
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}
      
      {/* 操作按钮 */}
      <div className="flex justify-between">
        <button
          onClick={onPrevious}
          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
        >
          上一步
        </button>
        
        <button
          onClick={handleNext}
          disabled={!validationResult?.isValid}
          className={`px-6 py-2 rounded-md font-medium transition-colors ${
            validationResult?.isValid
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          下一步：导入配置
        </button>
      </div>
    </div>
  );
}
