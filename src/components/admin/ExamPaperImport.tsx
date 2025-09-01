import React, { useState, useCallback } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle, Download, Eye, X } from 'lucide-react';
import { parseExamPaperFile, generatePreviewData, convertToSystemQuestions, ExamPaperParseResult } from '../../utils/examPaperParser';
import { Question } from '../../types/exam';
import { toast } from 'sonner';

/**
 * 导入状态枚举
 */
enum ImportState {
  UPLOAD = 'upload',
  PREVIEW = 'preview',
  IMPORTING = 'importing'
}

/**
 * 试卷导入组件属性接口
 */
interface ExamPaperImportProps {
  /** 导入完成回调函数 */
  onImportComplete?: (questions: Question[], examTitle: string) => void;
  /** 关闭组件回调函数 */
  onClose?: () => void;
  /** 是否显示为模态框 */
  isModal?: boolean;
}

/**
 * 试卷导入组件
 * 支持Excel文件上传、解析预览、数据验证和批量导入功能
 * 
 * @param props - 组件属性
 * @returns React组件
 */
export const ExamPaperImport: React.FC<ExamPaperImportProps> = ({
  onImportComplete,
  onClose,
  isModal = false
}) => {
  // 状态管理
  const [currentState, setCurrentState] = useState<ImportState>(ImportState.UPLOAD);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parseResult, setParseResult] = useState<ExamPaperParseResult | null>(null);
  const [previewData, setPreviewData] = useState<any>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showQuestionDetails, setShowQuestionDetails] = useState(false);

  /**
   * 处理文件选择
   * @param file - 选择的文件
   */
  const handleFileSelect = useCallback(async (file: File) => {
    // 验证文件类型
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      toast.error('请选择Excel文件（.xlsx或.xls格式）');
      return;
    }

    // 验证文件大小（限制为10MB）
    if (file.size > 10 * 1024 * 1024) {
      toast.error('文件大小不能超过10MB');
      return;
    }

    setSelectedFile(file);
    setCurrentState(ImportState.PREVIEW);

    try {
      // 解析文件
      const result = await parseExamPaperFile(file);
      setParseResult(result);
      
      // 生成预览数据
      const preview = generatePreviewData(result);
      setPreviewData(preview);

      // 如果有错误，显示错误信息
      if (result.errors.length > 0) {
        toast.error(`解析文件时发现${result.errors.length}个错误`);
      } else if (result.warnings.length > 0) {
        toast.warning(`解析文件时发现${result.warnings.length}个警告`);
      } else {
        toast.success('文件解析成功');
      }
    } catch (error) {
      toast.error('文件解析失败：' + (error instanceof Error ? error.message : '未知错误'));
      setCurrentState(ImportState.UPLOAD);
    }
  }, []);

  /**
   * 处理文件拖拽
   */
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  /**
   * 处理文件输入变化
   */
  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  /**
   * 确认导入
   */
  const handleConfirmImport = useCallback(async () => {
    if (!parseResult || !previewData) {
      toast.error('没有可导入的数据');
      return;
    }

    if (parseResult.errors.length > 0) {
      toast.error('存在错误，无法导入。请修复错误后重试。');
      return;
    }

    setIsImporting(true);

    try {
      // 转换为系统题目格式
      const systemQuestions = convertToSystemQuestions(parseResult.questions, parseResult.typeDistribution);

      // 调用API导入数据
      const response = await fetch('/api/admin/exam-paper-import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          examTitle: parseResult.examTitle,
          typeDistribution: parseResult.typeDistribution,
          questions: systemQuestions
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '导入失败');
      }

      const result = await response.json();
      
      toast.success(`成功导入${systemQuestions.length}道题目`);
      
      // 调用完成回调
      if (onImportComplete) {
        onImportComplete(systemQuestions, parseResult.examTitle || '导入的试卷');
      }

      // 自动关闭对话框
      if (onClose) {
        setTimeout(() => {
          onClose();
        }, 1500);
      }
    } catch (error) {
      toast.error('导入失败：' + (error instanceof Error ? error.message : '未知错误'));
    } finally {
      setIsImporting(false);
    }
  }, [parseResult, previewData, onImportComplete]);

  /**
   * 重新开始
   */
  const handleRestart = useCallback(() => {
    setCurrentState(ImportState.UPLOAD);
    setSelectedFile(null);
    setParseResult(null);
    setPreviewData(null);
    setIsImporting(false);
    setShowQuestionDetails(false);
  }, []);

  /**
   * 下载模板文件
   */
  const handleDownloadTemplate = useCallback(() => {
    // 创建下载链接
    const link = document.createElement('a');
    link.href = '/templates/试卷模板.xlsx';
    link.download = '试卷导入模板.xlsx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('模板下载已开始');
  }, []);

  /**
   * 渲染上传步骤
   */
  const renderUploadStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">上传试卷文件</h3>
        <p className="text-sm text-gray-600">支持Excel格式（.xlsx, .xls），文件大小不超过10MB</p>
      </div>

      {/* 文件拖拽区域 */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragOver
            ? 'border-blue-400 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <div className="space-y-2">
          <p className="text-lg font-medium text-gray-900">拖拽文件到此处</p>
          <p className="text-sm text-gray-600">或者</p>
          <label className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 cursor-pointer">
            <input
              type="file"
              className="hidden"
              accept=".xlsx,.xls"
              onChange={handleFileInputChange}
            />
            选择文件
          </label>
        </div>
      </div>

      {/* 模板下载 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <FileText className="h-5 w-5 text-blue-600 mt-0.5 mr-3" />
          <div className="flex-1">
            <h4 className="text-sm font-medium text-blue-900">需要模板文件？</h4>
            <p className="text-sm text-blue-700 mt-1">
              下载标准的试卷导入模板，包含"题型分布"和"试卷题目"两个工作表
            </p>
            <button
              onClick={handleDownloadTemplate}
              className="mt-2 inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-500"
            >
              <Download className="h-4 w-4 mr-1" />
              下载模板
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  /**
   * 渲染预览步骤
   */
  const renderPreviewStep = () => {
    if (!previewData || !parseResult) return null;

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">数据预览</h3>
          <div className="flex space-x-2">
            <button
              onClick={() => setShowQuestionDetails(!showQuestionDetails)}
              className="inline-flex items-center px-3 py-1 text-sm font-medium text-blue-600 hover:text-blue-500"
            >
              <Eye className="h-4 w-4 mr-1" />
              {showQuestionDetails ? '隐藏' : '查看'}题目详情
            </button>
          </div>
        </div>

        {/* 基本信息 */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-3">试卷信息</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-600">试卷名称：</span>
              <span className="font-medium">{previewData.examTitle}</span>
            </div>
            <div>
              <span className="text-gray-600">题目总数：</span>
              <span className="font-medium">{previewData.totalQuestions}题</span>
            </div>
            <div>
              <span className="text-gray-600">总分：</span>
              <span className="font-medium">{previewData.totalPoints}分</span>
            </div>
            <div>
              <span className="text-gray-600">题型数量：</span>
              <span className="font-medium">{previewData.typeStats.length}种</span>
            </div>
          </div>
        </div>

        {/* 题型统计 */}
        <div>
          <h4 className="font-medium text-gray-900 mb-3">题型分布</h4>
          <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
            <table className="min-w-full divide-y divide-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    题型
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    预期数量
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    实际数量
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    分值
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    状态
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {previewData.typeStats.map((stat: any, index: number) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {stat.type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {stat.expected}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {stat.actual}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {stat.points}分
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {stat.expected === stat.actual ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          正常
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          不匹配
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 错误和警告 */}
        {(previewData.hasErrors || previewData.hasWarnings) && (
          <div className="space-y-3">
            {previewData.hasErrors && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start">
                  <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 mr-3" />
                  <div>
                    <h4 className="text-sm font-medium text-red-900">发现错误</h4>
                    <ul className="mt-2 text-sm text-red-700 space-y-1">
                      {previewData.errors.map((error: string, index: number) => (
                        <li key={index}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
            
            {previewData.hasWarnings && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start">
                  <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 mr-3" />
                  <div>
                    <h4 className="text-sm font-medium text-yellow-900">警告信息</h4>
                    <ul className="mt-2 text-sm text-yellow-700 space-y-1">
                      {previewData.warnings.map((warning: string, index: number) => (
                        <li key={index}>• {warning}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 题目详情 */}
        {showQuestionDetails && (
          <div>
            <h4 className="font-medium text-gray-900 mb-3">题目详情（前10题）</h4>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {parseResult.questions.slice(0, 10).map((question, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-sm font-medium text-gray-900">
                          第{question.questionNumber}题
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          {question.questionType}
                        </span>
                        <span className="text-xs text-gray-500">
                          {question.points}分
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 mb-2">{question.content}</p>
                      {(question.optionA || question.optionB || question.optionC || question.optionD) && (
                        <div className="text-xs text-gray-600 space-y-1">
                          {question.optionA && <div>A. {question.optionA}</div>}
                          {question.optionB && <div>B. {question.optionB}</div>}
                          {question.optionC && <div>C. {question.optionC}</div>}
                          {question.optionD && <div>D. {question.optionD}</div>}
                        </div>
                      )}
                      <div className="mt-2 text-xs">
                        <span className="text-gray-600">答案：</span>
                        <span className="font-medium text-green-600">{question.correctAnswer}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {parseResult.questions.length > 10 && (
                <div className="text-center text-sm text-gray-500">
                  还有{parseResult.questions.length - 10}道题目未显示
                </div>
              )}
            </div>
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex justify-between pt-4">
          <button
            onClick={handleRestart}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            disabled={isImporting}
          >
            重新选择
          </button>
          <button
            onClick={handleConfirmImport}
            disabled={previewData.hasErrors || isImporting}
            className={`px-4 py-2 text-sm font-medium rounded-md ${
              previewData.hasErrors || isImporting
                ? 'text-gray-400 bg-gray-100 cursor-not-allowed'
                : 'text-white bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isImporting ? '导入中...' : '确认导入'}
          </button>
        </div>
      </div>
    );
  };



  /**
   * 根据当前状态渲染内容
   */
  const renderContent = () => {
    switch (currentState) {
      case ImportState.UPLOAD:
        return renderUploadStep();
      case ImportState.PREVIEW:
        return renderPreviewStep();
      default:
        return renderUploadStep();
    }
  };

  const containerClasses = isModal
    ? "fixed inset-0 z-50 overflow-y-auto"
    : "w-full";

  const contentClasses = isModal
    ? "flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0"
    : "";

  const panelClasses = isModal
    ? "relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-4xl sm:p-6"
    : "bg-white rounded-lg shadow-sm border border-gray-200 p-6";

  return (
    <div className={containerClasses}>
      {isModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
      )}
      
      <div className={contentClasses}>
        <div className={panelClasses}>
          {/* 标题栏 */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">试卷导入</h2>
            {isModal && onClose && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-6 w-6" />
              </button>
            )}
          </div>

          {/* 内容区域 */}
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default ExamPaperImport;