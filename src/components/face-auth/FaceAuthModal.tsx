/**
 * 人脸认证弹窗组件
 * 提供人脸注册和验证的统一界面
 */

import React, { useState, useEffect } from 'react';
import { X, Camera, Shield, AlertCircle, CheckCircle } from 'lucide-react';
import FaceCapture from './FaceCapture';
import LivenessDetection from './LivenessDetection';
import AuthResult from './AuthResult';

// 认证类型枚举
export type AuthType = 'register' | 'login' | 'verify' | 'exam';

// 认证步骤枚举
type AuthStep = 'intro' | 'capture' | 'liveness' | 'processing' | 'result';

// 认证结果接口
interface AuthResult {
  success: boolean;
  message: string;
  confidenceScore?: number;
  accessToken?: string;
  error?: string;
}

// 组件属性接口
interface FaceAuthModalProps {
  /** 是否显示弹窗 */
  isOpen: boolean;
  /** 关闭弹窗回调 */
  onClose: () => void;
  /** 认证类型 */
  authType: AuthType;
  /** 用户ID */
  userId: string;
  /** 认证成功回调 */
  onSuccess?: (result: AuthResult) => void;
  /** 认证失败回调 */
  onError?: (error: string) => void;
  /** 自定义标题 */
  title?: string;
  /** 是否显示跳过按钮 */
  showSkip?: boolean;
  /** 跳过回调 */
  onSkip?: () => void;
}

/**
 * 获取认证类型的显示文本
 * @param authType 认证类型
 * @returns 显示文本
 */
const getAuthTypeText = (authType: AuthType): string => {
  const texts = {
    register: '人脸注册',
    login: '人脸登录',
    verify: '身份验证',
    exam: '考试认证'
  };
  return texts[authType] || '人脸认证';
};

/**
 * 获取认证类型的描述文本
 * @param authType 认证类型
 * @returns 描述文本
 */
const getAuthTypeDescription = (authType: AuthType): string => {
  const descriptions = {
    register: '首次注册人脸信息，用于后续身份验证',
    login: '使用人脸信息快速登录您的账户',
    verify: '验证您的身份以访问受保护的内容',
    exam: '进行身份认证以开始在线考试'
  };
  return descriptions[authType] || '请配合完成人脸认证';
};

/**
 * 人脸认证弹窗组件
 */
const FaceAuthModal: React.FC<FaceAuthModalProps> = ({
  isOpen,
  onClose,
  authType,
  userId,
  onSuccess,
  onError,
  title,
  showSkip = false,
  onSkip
}) => {
  // 状态管理
  const [currentStep, setCurrentStep] = useState<AuthStep>('intro');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [livenessResult, setLivenessResult] = useState<boolean | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [authResult, setAuthResult] = useState<AuthResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 重置状态
  const resetState = () => {
    setCurrentStep('intro');
    setCapturedImage(null);
    setLivenessResult(null);
    setAuthResult(null);
    setIsProcessing(false);
    setError(null);
  };

  // 监听弹窗开关状态
  useEffect(() => {
    if (isOpen) {
      resetState();
    }
  }, [isOpen]);

  // 处理人脸采集完成
  const handleCaptureComplete = (imageData: string) => {
    setCapturedImage(imageData);
    setCurrentStep('liveness');
  };

  // 处理活体检测完成
  const handleLivenessComplete = (result: boolean) => {
    setLivenessResult(result);
    if (result) {
      setCurrentStep('processing');
      performAuthentication();
    } else {
      setError('活体检测失败，请重新尝试');
      setCurrentStep('capture');
    }
  };

  // 执行人脸认证
  const performAuthentication = async () => {
    if (!capturedImage) {
      setError('未获取到人脸图像');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // 根据认证类型选择API端点
      const endpoint = authType === 'register' 
        ? '/api/face-auth/register'
        : '/api/face-auth/verify';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          imageData: capturedImage,
          authType,
          timestamp: Date.now()
        })
      });

      const result = await response.json();

      if (result.success) {
        setAuthResult({
          success: true,
          message: result.message,
          confidenceScore: result.data?.confidenceScore,
          accessToken: result.data?.accessToken
        });
        setCurrentStep('result');
        
        // 调用成功回调
        if (onSuccess) {
          onSuccess({
            success: true,
            message: result.message,
            confidenceScore: result.data?.confidenceScore,
            accessToken: result.data?.accessToken
          });
        }
      } else {
        throw new Error(result.message || '认证失败');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '网络错误，请重试';
      setError(errorMessage);
      setAuthResult({
        success: false,
        message: errorMessage,
        error: errorMessage
      });
      setCurrentStep('result');
      
      // 调用错误回调
      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // 处理重试
  const handleRetry = () => {
    resetState();
    setCurrentStep('capture');
  };

  // 处理完成
  const handleComplete = () => {
    onClose();
  };

  // 如果弹窗未打开，不渲染
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Shield className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {title || getAuthTypeText(authType)}
              </h2>
              <p className="text-sm text-gray-500">
                {getAuthTypeDescription(authType)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* 内容区域 */}
        <div className="p-6">
          {/* 介绍步骤 */}
          {currentStep === 'intro' && (
            <div className="text-center space-y-6">
              <div className="p-4 bg-blue-50 rounded-lg">
                <Camera className="w-12 h-12 text-blue-600 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  准备开始{getAuthTypeText(authType)}
                </h3>
                <p className="text-gray-600 text-sm">
                  请确保您的摄像头正常工作，并在光线充足的环境中进行认证
                </p>
              </div>
              
              <div className="space-y-3 text-left">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                  <span className="text-sm text-gray-600">确保面部清晰可见</span>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                  <span className="text-sm text-gray-600">保持光线充足</span>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                  <span className="text-sm text-gray-600">摘下眼镜和帽子</span>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setCurrentStep('capture')}
                  className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  开始认证
                </button>
                {showSkip && (
                  <button
                    onClick={onSkip}
                    className="px-4 py-3 text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    跳过
                  </button>
                )}
              </div>
            </div>
          )}

          {/* 人脸采集步骤 */}
          {currentStep === 'capture' && (
            <FaceCapture
              onCapture={handleCaptureComplete}
              onError={(error) => setError(error)}
              authType={authType}
            />
          )}

          {/* 活体检测步骤 */}
          {currentStep === 'liveness' && capturedImage && (
            <LivenessDetection
              onComplete={handleLivenessComplete}
              onError={(error) => setError(error)}
            />
          )}

          {/* 处理中步骤 */}
          {currentStep === 'processing' && (
            <div className="text-center space-y-4">
              <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
              <h3 className="text-lg font-medium text-gray-900">正在处理...</h3>
              <p className="text-gray-600">请稍候，正在进行人脸识别验证</p>
            </div>
          )}

          {/* 结果步骤 */}
          {currentStep === 'result' && authResult && (
            <AuthResult
              result={authResult}
              authType={authType}
              onRetry={handleRetry}
              onComplete={handleComplete}
            />
          )}

          {/* 错误提示 */}
          {error && currentStep !== 'result' && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-red-800">操作失败</h4>
                  <p className="text-sm text-red-600 mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FaceAuthModal;