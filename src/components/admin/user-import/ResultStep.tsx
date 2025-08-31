/**
 * 用户批量导入 - 结果展示步骤组件
 * 提供导入结果统计、错误处理和操作建议
 */

'use client';

import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Download, RefreshCw, Users, Clock, TrendingUp, FileText, Eye, X } from 'lucide-react';
import type { ImportConfig } from './ConfigStep';

/**
 * 导入结果接口
 */
export interface ImportResult {
  success: boolean;
  totalProcessed: number;
  successCount: number;
  failedCount: number;
  skippedCount: number;
  duration: number;
  errors: ImportError[];
  warnings: string[];
  summary: {
    newUsers: number;
    updatedUsers: number;
    duplicateUsers: number;
  };
}

/**
 * 导入错误接口
 */
interface ImportError {
  row: number;
  field?: string;
  message: string;
  data?: Record<string, string>;
}

/**
 * 结果展示步骤组件属性
 */
interface ResultStepProps {
  result: ImportResult;
  config: ImportConfig;
  onRestart: () => void;
  onFinish: () => void;
}

/**
 * 结果展示步骤组件
 */
export default function ResultStep({ result, config, onRestart, onFinish }: ResultStepProps) {
  const [showErrors, setShowErrors] = useState(false);
  const [showErrorDetails, setShowErrorDetails] = useState<number | null>(null);
  const [downloadingReport, setDownloadingReport] = useState(false);

  /**
   * 计算成功率
   */
  const successRate = result.totalProcessed > 0 
    ? Math.round((result.successCount / result.totalProcessed) * 100) 
    : 0;

  /**
   * 格式化持续时间
   */
  const formatDuration = (seconds: number) => {
    if (seconds < 60) {
      return `${seconds}秒`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}分${remainingSeconds}秒`;
  };

  /**
   * 获取结果状态
   */
  const getResultStatus = () => {
    if (config.validateOnly) {
      return result.failedCount === 0 ? 'validation_success' : 'validation_failed';
    }
    return result.success ? 'import_success' : 'import_failed';
  };

  /**
   * 获取状态配置
   */
  const getStatusConfig = () => {
    const status = getResultStatus();
    
    const configs = {
      validation_success: {
        icon: CheckCircle,
        color: 'green',
        title: '数据验证通过',
        description: '所有数据格式正确，可以进行正式导入'
      },
      validation_failed: {
        icon: XCircle,
        color: 'red',
        title: '数据验证失败',
        description: '发现数据格式错误，请修正后重新上传'
      },
      import_success: {
        icon: CheckCircle,
        color: 'green',
        title: '导入完成',
        description: result.failedCount > 0 ? '部分数据导入成功，请查看错误详情' : '所有数据导入成功'
      },
      import_failed: {
        icon: XCircle,
        color: 'red',
        title: '导入失败',
        description: '导入过程中发生错误，请查看详情并重试'
      }
    };
    
    return configs[status];
  };

  /**
   * 下载错误报告
   */
  const downloadErrorReport = async () => {
    if (result.errors.length === 0) return;
    
    setDownloadingReport(true);
    
    try {
      // 创建错误报告内容
      const headers = ['行号', '字段', '错误信息', '数据内容'];
      const rows = result.errors.map(error => [
        error.row.toString(),
        error.field || '',
        error.message,
        error.data ? Object.values(error.data).join(' | ') : ''
      ]);
      
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');
      
      // 创建并下载文件
      const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `导入错误报告_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
    } catch (error) {
      console.error('下载错误报告失败:', error);
    } finally {
      setDownloadingReport(false);
    }
  };

  /**
   * 下载完整报告
   */
  const downloadFullReport = async () => {
    setDownloadingReport(true);
    
    try {
      const reportContent = [
        '# 用户批量导入报告',
        '',
        `## 基本信息`,
        `- 导入时间: ${new Date().toLocaleString()}`,
        `- 执行模式: ${config.validateOnly ? '验证模式' : '导入模式'}`,
        `- 处理策略: ${config.duplicateStrategy}`,
        `- 批量大小: ${config.batchSize}`,
        '',
        `## 统计结果`,
        `- 总处理数: ${result.totalProcessed}`,
        `- 成功数: ${result.successCount}`,
        `- 失败数: ${result.failedCount}`,
        `- 跳过数: ${result.skippedCount}`,
        `- 成功率: ${successRate}%`,
        `- 处理时间: ${formatDuration(result.duration)}`,
        '',
        `## 详细统计`,
        `- 新增用户: ${result.summary.newUsers}`,
        `- 更新用户: ${result.summary.updatedUsers}`,
        `- 重复用户: ${result.summary.duplicateUsers}`,
        ''
      ];
      
      if (result.warnings.length > 0) {
        reportContent.push('## 警告信息');
        result.warnings.forEach((warning, index) => {
          reportContent.push(`${index + 1}. ${warning}`);
        });
        reportContent.push('');
      }
      
      if (result.errors.length > 0) {
        reportContent.push('## 错误详情');
        result.errors.forEach((error, index) => {
          reportContent.push(`${index + 1}. 行${error.row}: ${error.message}`);
          if (error.field) {
            reportContent.push(`   字段: ${error.field}`);
          }
          if (error.data) {
            reportContent.push(`   数据: ${JSON.stringify(error.data, null, 2)}`);
          }
          reportContent.push('');
        });
      }
      
      const blob = new Blob([reportContent.join('\n')], { type: 'text/plain;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `导入报告_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
    } catch (error) {
      console.error('下载完整报告失败:', error);
    } finally {
      setDownloadingReport(false);
    }
  };

  const statusConfig = getStatusConfig();
  const StatusIcon = statusConfig.icon;

  return (
    <div className="space-y-6">
      {/* 结果概览 */}
      <div className={`p-6 rounded-lg border ${
        statusConfig.color === 'green' 
          ? 'bg-green-50 border-green-200' 
          : 'bg-red-50 border-red-200'
      }`}>
        <div className="flex items-center mb-4">
          <StatusIcon className={`h-8 w-8 mr-3 ${
            statusConfig.color === 'green' ? 'text-green-600' : 'text-red-600'
          }`} />
          <div>
            <h2 className={`text-2xl font-bold ${
              statusConfig.color === 'green' ? 'text-green-900' : 'text-red-900'
            }`}>
              {statusConfig.title}
            </h2>
            <p className={`text-sm ${
              statusConfig.color === 'green' ? 'text-green-700' : 'text-red-700'
            }`}>
              {statusConfig.description}
            </p>
          </div>
        </div>
        
        {/* 统计卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-gray-900">{result.totalProcessed}</div>
            <div className="text-sm text-gray-600">总处理数</div>
          </div>
          
          <div className="bg-white rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{result.successCount}</div>
            <div className="text-sm text-gray-600">成功数</div>
          </div>
          
          <div className="bg-white rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{result.failedCount}</div>
            <div className="text-sm text-gray-600">失败数</div>
          </div>
          
          <div className="bg-white rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{successRate}%</div>
            <div className="text-sm text-gray-600">成功率</div>
          </div>
        </div>
      </div>

      {/* 详细统计 */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <TrendingUp className="h-5 w-5 mr-2" />
          详细统计
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* 处理统计 */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">处理统计</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">处理时间:</span>
                <span className="font-medium">{formatDuration(result.duration)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">跳过数:</span>
                <span className="font-medium">{result.skippedCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">批量大小:</span>
                <span className="font-medium">{config.batchSize}</span>
              </div>
            </div>
          </div>
          
          {/* 用户统计 */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">用户统计</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">新增用户:</span>
                <span className="font-medium text-green-600">{result.summary.newUsers}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">更新用户:</span>
                <span className="font-medium text-blue-600">{result.summary.updatedUsers}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">重复用户:</span>
                <span className="font-medium text-orange-600">{result.summary.duplicateUsers}</span>
              </div>
            </div>
          </div>
          
          {/* 配置信息 */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">配置信息</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">执行模式:</span>
                <span className="font-medium">{config.validateOnly ? '验证' : '导入'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">重复策略:</span>
                <span className="font-medium">
                  {config.duplicateStrategy === 'skip' ? '跳过' : 
                   config.duplicateStrategy === 'update' ? '更新' : '报错'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">自动激活:</span>
                <span className="font-medium">{config.autoActivate ? '是' : '否'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 警告信息 */}
      {result.warnings.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-yellow-900 mb-3 flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2" />
            警告信息
          </h3>
          <ul className="text-yellow-800 space-y-1 text-sm">
            {result.warnings.map((warning, index) => (
              <li key={index}>• {warning}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 错误信息 */}
      {result.errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-red-900 flex items-center">
              <XCircle className="h-5 w-5 mr-2" />
              错误详情 ({result.errors.length})
            </h3>
            
            <div className="flex space-x-2">
              <button
                onClick={() => setShowErrors(!showErrors)}
                className="flex items-center text-red-700 hover:text-red-800 transition-colors"
              >
                <Eye className="h-4 w-4 mr-1" />
                {showErrors ? '隐藏' : '显示'}错误
              </button>
              
              {result.errors.length > 0 && (
                <button
                  onClick={downloadErrorReport}
                  disabled={downloadingReport}
                  className="flex items-center text-red-700 hover:text-red-800 transition-colors disabled:opacity-50"
                >
                  <Download className="h-4 w-4 mr-1" />
                  下载错误报告
                </button>
              )}
            </div>
          </div>
          
          {showErrors && (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {result.errors.map((error, index) => (
                <div key={index} className="bg-white border border-red-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <span className="text-sm font-medium text-red-900">
                          行 {error.row}
                        </span>
                        {error.field && (
                          <span className="ml-2 px-2 py-0.5 text-xs bg-red-100 text-red-800 rounded">
                            {error.field}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-red-800 mb-2">{error.message}</p>
                      
                      {error.data && (
                        <button
                          onClick={() => setShowErrorDetails(showErrorDetails === index ? null : index)}
                          className="text-xs text-red-600 hover:text-red-700 transition-colors"
                        >
                          {showErrorDetails === index ? '隐藏' : '显示'}数据详情
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {showErrorDetails === index && error.data && (
                    <div className="mt-3 p-3 bg-gray-50 rounded border">
                      <div className="text-xs text-gray-600 mb-2">原始数据:</div>
                      <div className="text-xs font-mono text-gray-800">
                        {Object.entries(error.data).map(([key, value]) => (
                          <div key={key} className="mb-1">
                            <span className="text-gray-600">{key}:</span> {value || '(空)'}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 操作建议 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">操作建议</h3>
        <div className="text-blue-800 text-sm space-y-2">
          {config.validateOnly ? (
            result.failedCount === 0 ? (
              <>
                <p>• 数据验证通过，可以进行正式导入</p>
                <p>• 建议保存当前配置，直接进行导入操作</p>
              </>
            ) : (
              <>
                <p>• 请根据错误信息修正数据文件</p>
                <p>• 修正后重新上传文件进行验证</p>
                <p>• 确保所有必填字段格式正确</p>
              </>
            )
          ) : (
            result.success ? (
              result.failedCount > 0 ? (
                <>
                  <p>• 部分数据导入成功，请查看失败记录</p>
                  <p>• 可以修正失败数据后重新导入</p>
                  <p>• 建议下载错误报告进行分析</p>
                </>
              ) : (
                <>
                  <p>• 所有数据导入成功！</p>
                  <p>• 用户可以使用手机号和设置的密码登录</p>
                  <p>• 建议通知用户修改初始密码</p>
                </>
              )
            ) : (
              <>
                <p>• 导入过程中发生错误，请查看错误详情</p>
                <p>• 可以尝试减小批量大小后重新导入</p>
                <p>• 如问题持续，请联系技术支持</p>
              </>
            )
          )}
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex justify-between">
        <div className="space-x-3">
          <button
            onClick={downloadFullReport}
            disabled={downloadingReport}
            className="flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <FileText className="h-4 w-4 mr-2" />
            {downloadingReport ? '生成中...' : '下载完整报告'}
          </button>
          
          <button
            onClick={onRestart}
            className="flex items-center px-4 py-2 border border-blue-300 text-blue-700 rounded-md hover:bg-blue-50 transition-colors"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            重新导入
          </button>
        </div>
        
        <button
          onClick={onFinish}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          完成
        </button>
      </div>
    </div>
  );
}