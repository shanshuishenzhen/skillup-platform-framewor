/**
 * 认证结果展示组件
 * 显示人脸认证的结果信息，包括成功、失败状态和相关操作
 */

import React from 'react';
import { CheckCircle, XCircle, AlertTriangle, RotateCcw, ArrowRight, Shield, Clock } from 'lucide-react';
import { AuthType } from './FaceAuthModal';

// 认证结果接口
interface AuthResultData {
  success: boolean;
  message: string;
  confidenceScore?: number;
  accessToken?: string;
  error?: string;
}

// 组件属性接口
interface AuthResultProps {
  /** 认证结果数据 */
  result: AuthResultData;
  /** 认证类型 */
  authType: AuthType;
  /** 重试回调 */
  onRetry: () => void;
  /** 完成回调 */
  onComplete: () => void;
  /** 是否显示详细信息 */
  showDetails?: boolean;
  /** 自动关闭延迟（秒），0表示不自动关闭 */
  autoCloseDelay?: number;
}

/**
 * 获取认证类型的成功消息
 * @param authType 认证类型
 * @returns 成功消息
 */
const getSuccessMessage = (authType: AuthType): string => {
  const messages = {
    register: '人脸注册成功！',
    login: '登录成功！',
    verify: '身份验证成功！',
    exam: '考试认证成功！'
  };
  return messages[authType] || '认证成功！';
};

/**
 * 获取认证类型的失败消息
 * @param authType 认证类型
 * @returns 失败消息
 */
const getFailureMessage = (authType: AuthType): string => {
  const messages = {
    register: '人脸注册失败',
    login: '登录失败',
    verify: '身份验证失败',
    exam: '考试认证失败'
  };
  return messages[authType] || '认证失败';
};

/**
 * 获取置信度等级
 * @param score 置信度分数
 * @returns 等级信息
 */
const getConfidenceLevel = (score: number): { level: string; color: string; description: string } => {
  if (score >= 0.9) {
    return {
      level: '极高',
      color: 'text-green-600',
      description: '匹配度非常高，安全性极佳'
    };
  } else if (score >= 0.8) {
    return {
      level: '高',
      color: 'text-green-500',
      description: '匹配度高，安全性良好'
    };
  } else if (score >= 0.7) {
    return {
      level: '中等',
      color: 'text-yellow-600',
      description: '匹配度中等，建议重新认证'
    };
  } else {
    return {
      level: '低',
      color: 'text-red-600',
      description: '匹配度较低，请重新认证'
    };
  }
};

/**
 * 认证结果展示组件
 */
const AuthResult: React.FC<AuthResultProps> = ({
  result,
  authType,
  onRetry,
  onComplete,
  showDetails = true,
  autoCloseDelay = 0
}) => {
  const [countdown, setCountdown] = React.useState(autoCloseDelay);

  // 自动关闭倒计时
  React.useEffect(() => {
    if (autoCloseDelay > 0 && result.success) {
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            onComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [autoCloseDelay, result.success, onComplete]);

  const confidenceLevel = result.confidenceScore ? getConfidenceLevel(result.confidenceScore) : null;

  return (
    <div className="space-y-6">
      {/* 结果状态 */}
      <div className="text-center space-y-4">
        {/* 状态图标 */}
        <div className="flex justify-center">
          {result.success ? (
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
          ) : (
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <XCircle className="w-10 h-10 text-red-600" />
            </div>
          )}
        </div>

        {/* 状态标题 */}
        <div>
          <h3 className={`text-xl font-semibold ${
            result.success ? 'text-green-800' : 'text-red-800'
          }`}>
            {result.success ? getSuccessMessage(authType) : getFailureMessage(authType)}
          </h3>
          <p className="text-gray-600 mt-2">{result.message}</p>
        </div>
      </div>

      {/* 详细信息 */}
      {showDetails && (
        <div className="space-y-4">
          {/* 置信度信息 */}
          {result.success && result.confidenceScore && confidenceLevel && (
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">匹配置信度</span>
                <span className={`text-sm font-semibold ${confidenceLevel.color}`}>
                  {confidenceLevel.level}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                <div 
                  className="bg-gradient-to-r from-red-400 via-yellow-400 to-green-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${result.confidenceScore * 100}%` }}
                ></div>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>{Math.round(result.confidenceScore * 100)}%</span>
                <span>{confidenceLevel.description}</span>
              </div>
            </div>
          )}

          {/* 认证类型特定信息 */}
          {result.success && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-blue-800 mb-1">
                    {authType === 'register' && '人脸档案已建立'}
                    {authType === 'login' && '登录状态已更新'}
                    {authType === 'verify' && '身份验证已通过'}
                    {authType === 'exam' && '考试权限已获得'}
                  </h4>
                  <p className="text-sm text-blue-600">
                    {authType === 'register' && '您的人脸信息已安全存储，可用于后续快速登录和身份验证'}
                    {authType === 'login' && '您已成功登录，可以访问所有授权功能'}
                    {authType === 'verify' && '身份验证成功，您现在可以访问受保护的内容'}
                    {authType === 'exam' && '身份认证完成，您现在可以开始在线考试'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 访问令牌信息（仅登录时显示） */}
          {result.success && result.accessToken && authType === 'login' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-green-800 mb-1">访问令牌已生成</h4>
                  <p className="text-sm text-green-600">
                    安全令牌已生成，有效期24小时
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 错误详情 */}
          {!result.success && result.error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-red-800 mb-1">错误详情</h4>
                  <p className="text-sm text-red-600">{result.error}</p>
                </div>
              </div>
            </div>
          )}

          {/* 安全提示 */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-sm font-medium text-yellow-800 mb-1">安全提示</h4>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>• 请妥善保护您的账户安全</li>
                  <li>• 如发现异常登录，请及时联系客服</li>
                  <li>• 建议定期更新人脸信息以提高安全性</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 操作按钮 */}
      <div className="flex space-x-3">
        {result.success ? (
          <>
            <button
              onClick={onComplete}
              className="flex-1 bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center justify-center space-x-2"
            >
              <ArrowRight className="w-5 h-5" />
              <span>
                {authType === 'register' && '完成注册'}
                {authType === 'login' && '进入系统'}
                {authType === 'verify' && '继续访问'}
                {authType === 'exam' && '开始考试'}
              </span>
              {countdown > 0 && (
                <span className="ml-2 text-sm">({countdown}s)</span>
              )}
            </button>
            {authType === 'register' && (
              <button
                onClick={onRetry}
                className="px-4 py-3 text-green-600 hover:text-green-800 transition-colors flex items-center space-x-1"
              >
                <RotateCcw className="w-4 h-4" />
                <span>重新注册</span>
              </button>
            )}
          </>
        ) : (
          <>
            <button
              onClick={onRetry}
              className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center space-x-2"
            >
              <RotateCcw className="w-5 h-5" />
              <span>重新尝试</span>
            </button>
            <button
              onClick={onComplete}
              className="px-4 py-3 text-gray-600 hover:text-gray-800 transition-colors"
            >
              取消
            </button>
          </>
        )}
      </div>

      {/* 时间戳 */}
      <div className="text-center text-xs text-gray-400 flex items-center justify-center space-x-1">
        <Clock className="w-3 h-3" />
        <span>认证时间: {new Date().toLocaleString()}</span>
      </div>
    </div>
  );
};

export default AuthResult;