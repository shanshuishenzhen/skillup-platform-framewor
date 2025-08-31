/**
 * 用户批量导入主页面
 * 管理导入流程的四个步骤：准备、上传、配置、结果
 */

'use client';

import { useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle } from 'lucide-react';
import PreparationStep from '@/components/admin/user-import/PreparationStep';
import UploadStep from '@/components/admin/user-import/UploadStep';
import ConfigStep, { type ImportConfig } from '@/components/admin/user-import/ConfigStep';
import ResultStep, { type ImportResult } from '@/components/admin/user-import/ResultStep';

/**
 * 验证结果接口
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
 * 导入状态接口
 */
interface ImportState {
  currentStep: number;
  uploadedFile: File | null;
  validationResult: ValidationResult | null;
  importConfig: ImportConfig | null;
  importResult: ImportResult | null;
}

/**
 * 步骤配置
 */
const steps = [
  { id: 1, name: '导入准备', description: '下载模板，了解导入要求' },
  { id: 2, name: '文件上传', description: '选择文件，验证数据格式' },
  { id: 3, name: '导入配置', description: '设置导入选项和策略' },
  { id: 4, name: '结果展示', description: '查看导入结果和统计' }
];

/**
 * 用户批量导入页面
 */
export default function UserImportPage() {
  const [importState, setImportState] = useState<ImportState>({
    currentStep: 1,
    uploadedFile: null,
    validationResult: null,
    importConfig: null,
    importResult: null
  });

  /**
   * 前进到下一步
   */
  const nextStep = () => {
    if (importState.currentStep < steps.length) {
      setImportState(prev => ({
        ...prev,
        currentStep: prev.currentStep + 1
      }));
    }
  };

  /**
   * 返回上一步
   */
  const prevStep = () => {
    if (importState.currentStep > 1) {
      setImportState(prev => ({
        ...prev,
        currentStep: prev.currentStep - 1
      }));
    }
  };

  /**
   * 跳转到指定步骤
   */
  const goToStep = (step: number) => {
    setImportState(prev => ({
      ...prev,
      currentStep: step
    }));
  };

  /**
   * 重置导入流程
   */
  const resetImport = () => {
    setImportState({
      currentStep: 1,
      uploadedFile: null,
      validationResult: null,
      importConfig: null,
      importResult: null
    });
  };

  /**
   * 处理文件上传完成
   */
  const handleFileUploaded = (file: File, validationResult: ValidationResult, previewData: any[]) => {
    setImportState(prev => ({
      ...prev,
      uploadedFile: file,
      validationResult
    }));
  };

  /**
   * 处理配置完成
   */
  const handleConfigCompleted = (config: ImportConfig) => {
    setImportState(prev => ({
      ...prev,
      importConfig: config
    }));
  };

  /**
   * 处理导入完成
   */
  const handleImportCompleted = (result: ImportResult) => {
    setImportState(prev => ({
      ...prev,
      importResult: result
    }));
  };

  /**
   * 检查步骤是否可以前进
   */
  const canProceedToNext = () => {
    switch (importState.currentStep) {
      case 1:
        return true; // 准备步骤总是可以前进
      case 2:
        return importState.validationResult !== null; // 需要完成文件验证
      case 3:
        return importState.importConfig !== null; // 需要完成配置
      case 4:
        return false; // 最后一步不能前进
      default:
        return false;
    }
  };

  /**
   * 检查步骤是否已完成
   */
  const isStepCompleted = (stepId: number) => {
    switch (stepId) {
      case 1:
        return importState.currentStep > 1;
      case 2:
        return importState.validationResult !== null;
      case 3:
        return importState.importConfig !== null;
      case 4:
        return importState.importResult !== null;
      default:
        return false;
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* 页面标题 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">用户批量导入</h1>
        <p className="text-gray-600">
          通过Excel或CSV文件批量导入用户信息，支持新增和更新用户数据
        </p>
      </div>

      {/* 步骤指示器 */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const isActive = step.id === importState.currentStep;
            const isCompleted = isStepCompleted(step.id);
            const isAccessible = step.id <= importState.currentStep;
            
            return (
              <div key={step.id} className="flex items-center">
                {/* 步骤圆圈 */}
                <button
                  onClick={() => isAccessible && goToStep(step.id)}
                  disabled={!isAccessible}
                  className={`
                    flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors
                    ${isCompleted 
                      ? 'bg-green-600 border-green-600 text-white' 
                      : isActive 
                        ? 'bg-blue-600 border-blue-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-500'
                    }
                    ${isAccessible ? 'cursor-pointer hover:border-blue-400' : 'cursor-not-allowed'}
                  `}
                >
                  {isCompleted ? (
                    <CheckCircle className="h-6 w-6" />
                  ) : (
                    <span className="text-sm font-medium">{step.id}</span>
                  )}
                </button>
                
                {/* 步骤信息 */}
                <div className="ml-3 min-w-0 flex-1">
                  <p className={`text-sm font-medium ${
                    isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-500'
                  }`}>
                    {step.name}
                  </p>
                  <p className="text-xs text-gray-500">{step.description}</p>
                </div>
                
                {/* 连接线 */}
                {index < steps.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-4 ${
                    isStepCompleted(step.id) ? 'bg-green-600' : 'bg-gray-300'
                  }`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 步骤内容 */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 min-h-[600px]">
        {importState.currentStep === 1 && (
          <PreparationStep onNext={nextStep} onComplete={nextStep} />
        )}
        
        {importState.currentStep === 2 && (
          <UploadStep 
            onComplete={handleFileUploaded}
            onNext={nextStep}
            onPrevious={prevStep}
          />
        )}
        
        {importState.currentStep === 3 && importState.validationResult && (
          <ConfigStep 
            totalRows={importState.validationResult.summary.totalRows}
            onComplete={handleConfigCompleted}
            onNext={nextStep}
            onPrevious={prevStep}
          />
        )}
        
        {importState.currentStep === 4 && importState.importResult && importState.importConfig && (
          <ResultStep 
            result={importState.importResult}
            config={importState.importConfig}
            onRestart={resetImport}
            onFinish={() => {
              // 可以导航回管理页面或其他操作
              console.log('导入流程完成');
            }}
          />
        )}
      </div>

      {/* 导航按钮 */}
      {importState.currentStep < 4 && (
        <div className="flex justify-between mt-6">
          <button
            onClick={prevStep}
            disabled={importState.currentStep === 1}
            className="flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            上一步
          </button>
          
          <button
            onClick={nextStep}
            disabled={!canProceedToNext()}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            下一步
            <ArrowRight className="h-4 w-4 ml-2" />
          </button>
        </div>
      )}
    </div>
  );
}
