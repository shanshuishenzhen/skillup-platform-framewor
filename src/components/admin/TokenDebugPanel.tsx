/**
 * Token调试面板组件
 * 用于显示当前用户的token信息和权限状态，帮助诊断权限问题
 */

'use client';

import { useState, useEffect } from 'react';
import { Eye, EyeOff, RefreshCw, AlertTriangle, CheckCircle, XCircle, Info } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { parseJWTToken, isJWTTokenValid, hasAdminPermission, getJWTTokenInfo } from '@/utils/jwt';

/**
 * Token调试信息接口
 */
interface TokenDebugInfo {
  token: string | null;
  isValid: boolean;
  payload: any;
  hasAdminAccess: boolean;
  tokenInfo: any;
  error: string | null;
}

/**
 * Token调试面板组件
 */
export default function TokenDebugPanel() {
  const [showToken, setShowToken] = useState(false);
  const [debugInfo, setDebugInfo] = useState<TokenDebugInfo | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { user, isLoggedIn } = useAuth();

  /**
   * 获取Token调试信息
   */
  const getTokenDebugInfo = (): TokenDebugInfo => {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        return {
          token: null,
          isValid: false,
          payload: null,
          hasAdminAccess: false,
          tokenInfo: null,
          error: 'Token不存在'
        };
      }

      const isValid = isJWTTokenValid(token);
      const payload = parseJWTToken(token);
      const hasAdminAccess = hasAdminPermission(token);
      const tokenInfo = getJWTTokenInfo(token);

      return {
        token,
        isValid,
        payload,
        hasAdminAccess,
        tokenInfo,
        error: null
      };
    } catch (error) {
      return {
        token: localStorage.getItem('token'),
        isValid: false,
        payload: null,
        hasAdminAccess: false,
        tokenInfo: null,
        error: error instanceof Error ? error.message : '未知错误'
      };
    }
  };

  /**
   * 刷新调试信息
   */
  const refreshDebugInfo = async () => {
    setIsRefreshing(true);
    
    // 添加短暂延迟以显示刷新动画
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const info = getTokenDebugInfo();
    setDebugInfo(info);
    
    console.log('🔍 Token调试信息刷新:', info);
    setIsRefreshing(false);
  };

  /**
   * 组件挂载时获取调试信息
   */
  useEffect(() => {
    refreshDebugInfo();
  }, []);

  /**
   * 格式化显示Token
   */
  const formatToken = (token: string | null) => {
    if (!token) return 'N/A';
    if (!showToken) {
      return `${token.substring(0, 20)}...${token.substring(token.length - 10)}`;
    }
    return token;
  };

  /**
   * 获取状态图标
   */
  const getStatusIcon = (status: boolean, error?: string | null) => {
    if (error) {
      return <XCircle className="h-5 w-5 text-red-500" />;
    }
    return status ? 
      <CheckCircle className="h-5 w-5 text-green-500" /> : 
      <XCircle className="h-5 w-5 text-red-500" />;
  };

  /**
   * 获取状态文本
   */
  const getStatusText = (status: boolean, error?: string | null) => {
    if (error) return '错误';
    return status ? '正常' : '异常';
  };

  /**
   * 获取状态颜色类
   */
  const getStatusColor = (status: boolean, error?: string | null) => {
    if (error) return 'text-red-600';
    return status ? 'text-green-600' : 'text-red-600';
  };

  if (!debugInfo) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="h-6 w-6 text-gray-400 animate-spin mr-2" />
          <span className="text-gray-600">加载调试信息...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {/* 面板头部 */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Info className="h-5 w-5 text-blue-500 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Token调试面板</h3>
          </div>
          <button
            onClick={refreshDebugInfo}
            disabled={isRefreshing}
            className="flex items-center px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
            刷新
          </button>
        </div>
      </div>

      {/* 面板内容 */}
      <div className="p-6 space-y-6">
        {/* 用户信息 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">用户状态</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">登录状态:</span>
                <span className={getStatusColor(isLoggedIn)}>
                  {getStatusIcon(isLoggedIn)} {getStatusText(isLoggedIn)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">用户ID:</span>
                <span className="text-gray-900">{user?.id || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">用户邮箱:</span>
                <span className="text-gray-900">{user?.email || 'N/A'}</span>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">权限状态</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Token有效性:</span>
                <span className={getStatusColor(debugInfo.isValid, debugInfo.error)}>
                  {getStatusIcon(debugInfo.isValid, debugInfo.error)} {getStatusText(debugInfo.isValid, debugInfo.error)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">管理员权限:</span>
                <span className={getStatusColor(debugInfo.hasAdminAccess)}>
                  {getStatusIcon(debugInfo.hasAdminAccess)} {getStatusText(debugInfo.hasAdminAccess)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">用户角色:</span>
                <span className="text-gray-900">{debugInfo.payload?.role || 'N/A'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Token信息 */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-gray-900">Token信息</h4>
            <button
              onClick={() => setShowToken(!showToken)}
              className="flex items-center text-sm text-blue-600 hover:text-blue-800"
            >
              {showToken ? <EyeOff className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
              {showToken ? '隐藏' : '显示'}
            </button>
          </div>
          
          <div className="space-y-3 text-sm">
            <div>
              <span className="text-gray-600 block mb-1">Token值:</span>
              <div className="bg-white p-2 rounded border font-mono text-xs break-all">
                {formatToken(debugInfo.token)}
              </div>
            </div>
            
            {debugInfo.tokenInfo && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span className="text-gray-600 block mb-1">过期时间:</span>
                  <span className="text-gray-900">{debugInfo.tokenInfo.expirationTime || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-gray-600 block mb-1">剩余时间:</span>
                  <span className="text-gray-900">{debugInfo.tokenInfo.remainingTime || 'N/A'}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Payload详情 */}
        {debugInfo.payload && (
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-3">Token Payload</h4>
            <div className="bg-white p-3 rounded border">
              <pre className="text-xs text-gray-800 whitespace-pre-wrap">
                {JSON.stringify(debugInfo.payload, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {/* 错误信息 */}
        {debugInfo.error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
              <h4 className="font-medium text-red-900">错误信息</h4>
            </div>
            <p className="mt-2 text-sm text-red-700">{debugInfo.error}</p>
          </div>
        )}

        {/* 调试建议 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center mb-2">
            <Info className="h-5 w-5 text-blue-500 mr-2" />
            <h4 className="font-medium text-blue-900">调试建议</h4>
          </div>
          <div className="text-sm text-blue-700 space-y-1">
            {!debugInfo.token && (
              <p>• Token不存在，请检查用户是否已登录</p>
            )}
            {debugInfo.token && !debugInfo.isValid && (
              <p>• Token无效或已过期，请重新登录</p>
            )}
            {debugInfo.isValid && !debugInfo.hasAdminAccess && (
              <p>• Token有效但无管理员权限，请检查用户角色设置</p>
            )}
            {debugInfo.isValid && debugInfo.hasAdminAccess && (
              <p>• Token和权限都正常，如仍有问题请检查后端API</p>
            )}
            <p>• 查看浏览器控制台获取更详细的调试日志</p>
          </div>
        </div>
      </div>
    </div>
  );
}