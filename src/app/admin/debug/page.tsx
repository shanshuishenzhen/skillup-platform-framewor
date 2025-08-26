/**
 * 管理员权限调试页面
 * 用于诊断和解决管理员权限验证问题
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { AlertCircle, CheckCircle, XCircle, RefreshCw, Trash2, LogIn, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

interface TokenInfo {
  raw: string;
  header?: any;
  payload?: any;
  signature?: string;
  isValid: boolean;
  error?: string;
}

interface PermissionCheckResult {
  success: boolean;
  message?: string;
  error?: string;
  statusCode?: number;
}

/**
 * 管理员权限调试页面组件
 */
export default function AdminDebugPage() {
  const { user, isLoggedIn, loading } = useAuth();
  const router = useRouter();
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [permissionResult, setPermissionResult] = useState<PermissionCheckResult | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [showTokenDetails, setShowTokenDetails] = useState(false);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);

  /**
   * 添加调试日志
   * @param message 日志消息
   */
  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  /**
   * 解析JWT Token
   * @param token JWT token字符串
   * @returns 解析后的token信息
   */
  const parseJWTToken = (token: string): TokenInfo => {
    try {
      if (!token) {
        return { raw: '', isValid: false, error: 'Token为空' };
      }

      const parts = token.split('.');
      if (parts.length !== 3) {
        return { raw: token, isValid: false, error: 'Token格式无效' };
      }

      const header = JSON.parse(atob(parts[0]));
      const payload = JSON.parse(atob(parts[1]));
      const signature = parts[2];

      // 检查token是否过期
      const now = Math.floor(Date.now() / 1000);
      const isExpired = payload.exp && payload.exp < now;

      return {
        raw: token,
        header,
        payload,
        signature,
        isValid: !isExpired,
        error: isExpired ? 'Token已过期' : undefined
      };
    } catch (error) {
      return {
        raw: token,
        isValid: false,
        error: `Token解析失败: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  };

  /**
   * 检查localStorage中的token
   */
  const checkLocalStorageToken = () => {
    addLog('检查localStorage中的token...');
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        addLog('❌ localStorage中没有找到token');
        setTokenInfo({ raw: '', isValid: false, error: 'localStorage中没有token' });
        return;
      }

      addLog('✅ 在localStorage中找到token');
      const parsed = parseJWTToken(token);
      setTokenInfo(parsed);
      
      if (parsed.isValid) {
        addLog('✅ Token格式有效且未过期');
        addLog(`Token角色: ${parsed.payload?.role || '未知'}`);
        addLog(`Token用户ID: ${parsed.payload?.userId || '未知'}`);
      } else {
        addLog(`❌ Token无效: ${parsed.error}`);
      }
    } catch (error) {
      addLog(`❌ 检查token时发生错误: ${error}`);
      setTokenInfo({ raw: '', isValid: false, error: String(error) });
    }
  };

  /**
   * 测试权限检查API
   */
  const testPermissionAPI = async () => {
    setIsChecking(true);
    addLog('测试权限检查API...');
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        addLog('❌ 没有token，无法测试权限API');
        setPermissionResult({ success: false, error: '没有token' });
        return;
      }

      addLog('发送权限检查请求...');
      const response = await fetch('/api/admin/check-permission', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      addLog(`权限API响应状态: ${response.status}`);
      
      if (response.ok) {
        const data = await response.json();
        addLog('✅ 权限检查通过');
        setPermissionResult({ success: true, message: '权限验证成功' });
      } else {
        const errorData = await response.json().catch(() => ({ error: '解析响应失败' }));
        addLog(`❌ 权限检查失败: ${errorData.error || '未知错误'}`);
        setPermissionResult({ 
          success: false, 
          error: errorData.error || '权限验证失败',
          statusCode: response.status
        });
      }
    } catch (error) {
      addLog(`❌ 权限API请求失败: ${error}`);
      setPermissionResult({ success: false, error: String(error) });
    } finally {
      setIsChecking(false);
    }
  };

  /**
   * 清除所有缓存数据
   */
  const clearCache = () => {
    addLog('清除所有缓存数据...');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setTokenInfo(null);
    setPermissionResult(null);
    addLog('✅ 缓存已清除');
    toast.success('缓存已清除');
  };

  /**
   * 跳转到登录页面
   */
  const goToLogin = () => {
    addLog('跳转到管理员登录页面...');
    router.push('/admin/login');
  };

  /**
   * 清除调试日志
   */
  const clearLogs = () => {
    setDebugLogs([]);
  };

  /**
   * 页面加载时自动检查
   */
  useEffect(() => {
    addLog('=== 管理员权限调试开始 ===');
    checkLocalStorageToken();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-6xl mx-auto">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            管理员权限调试工具
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            诊断和解决管理员权限验证问题
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 左侧：状态信息 */}
          <div className="space-y-6">
            {/* 登录状态 */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                <AlertCircle className="h-5 w-5 mr-2" />
                登录状态
              </h2>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">加载状态:</span>
                  <span className={`flex items-center ${loading ? 'text-yellow-600' : 'text-green-600'}`}>
                    {loading ? (
                      <><RefreshCw className="h-4 w-4 mr-1 animate-spin" />加载中</>
                    ) : (
                      <><CheckCircle className="h-4 w-4 mr-1" />已加载</>
                    )}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">登录状态:</span>
                  <span className={`flex items-center ${isLoggedIn ? 'text-green-600' : 'text-red-600'}`}>
                    {isLoggedIn ? (
                      <><CheckCircle className="h-4 w-4 mr-1" />已登录</>
                    ) : (
                      <><XCircle className="h-4 w-4 mr-1" />未登录</>
                    )}
                  </span>
                </div>
                
                {user && (
                  <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded">
                    <p className="text-sm text-gray-600 dark:text-gray-400">用户信息:</p>
                    <p className="font-medium text-gray-900 dark:text-gray-100">手机号: {user.phone}</p>
                    <p className="font-medium text-gray-900 dark:text-gray-100">角色: {user.role}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Token信息 */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                <Eye className="h-5 w-5 mr-2" />
                Token信息
                <button
                  onClick={() => setShowTokenDetails(!showTokenDetails)}
                  className="ml-2 p-1 text-gray-500 hover:text-gray-700"
                >
                  {showTokenDetails ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </h2>
              
              {tokenInfo ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Token状态:</span>
                    <span className={`flex items-center ${tokenInfo.isValid ? 'text-green-600' : 'text-red-600'}`}>
                      {tokenInfo.isValid ? (
                        <><CheckCircle className="h-4 w-4 mr-1" />有效</>
                      ) : (
                        <><XCircle className="h-4 w-4 mr-1" />无效</>
                      )}
                    </span>
                  </div>
                  
                  {tokenInfo.error && (
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
                      <p className="text-red-600 dark:text-red-400 text-sm">{tokenInfo.error}</p>
                    </div>
                  )}
                  
                  {showTokenDetails && tokenInfo.payload && (
                    <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Token Payload:</p>
                      <pre className="text-xs text-gray-800 dark:text-gray-200 overflow-x-auto">
                        {JSON.stringify(tokenInfo.payload, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400">点击"检查Token"按钮开始检查</p>
              )}
            </div>

            {/* 权限检查结果 */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                <CheckCircle className="h-5 w-5 mr-2" />
                权限检查结果
              </h2>
              
              {permissionResult ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400">权限状态:</span>
                    <span className={`flex items-center ${permissionResult.success ? 'text-green-600' : 'text-red-600'}`}>
                      {permissionResult.success ? (
                        <><CheckCircle className="h-4 w-4 mr-1" />通过</>
                      ) : (
                        <><XCircle className="h-4 w-4 mr-1" />失败</>
                      )}
                    </span>
                  </div>
                  
                  {permissionResult.error && (
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
                      <p className="text-red-600 dark:text-red-400 text-sm">
                        {permissionResult.error}
                        {permissionResult.statusCode && ` (状态码: ${permissionResult.statusCode})`}
                      </p>
                    </div>
                  )}
                  
                  {permissionResult.message && (
                    <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded">
                      <p className="text-green-600 dark:text-green-400 text-sm">{permissionResult.message}</p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400">点击"测试权限API"按钮开始测试</p>
              )}
            </div>
          </div>

          {/* 右侧：操作和日志 */}
          <div className="space-y-6">
            {/* 操作按钮 */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                调试操作
              </h2>
              
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={checkLocalStorageToken}
                  className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  检查Token
                </button>
                
                <button
                  onClick={testPermissionAPI}
                  disabled={isChecking}
                  className="flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  {isChecking ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  )}
                  测试权限API
                </button>
                
                <button
                  onClick={clearCache}
                  className="flex items-center justify-center px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  清除缓存
                </button>
                
                <button
                  onClick={goToLogin}
                  className="flex items-center justify-center px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
                >
                  <LogIn className="h-4 w-4 mr-2" />
                  重新登录
                </button>
              </div>
            </div>

            {/* 调试日志 */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  调试日志
                </h2>
                <button
                  onClick={clearLogs}
                  className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  清除日志
                </button>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-700 rounded p-4 h-64 overflow-y-auto">
                {debugLogs.length > 0 ? (
                  <div className="space-y-1">
                    {debugLogs.map((log, index) => (
                      <div key={index} className="text-sm font-mono text-gray-800 dark:text-gray-200">
                        {log}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 text-sm">暂无日志</p>
                )}
              </div>
            </div>

            {/* 解决方案建议 */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                常见问题解决方案
              </h2>
              
              <div className="space-y-3 text-sm">
                <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded">
                  <p className="font-medium text-yellow-800 dark:text-yellow-200">如果显示"权限不足":</p>
                  <ul className="mt-2 text-yellow-700 dark:text-yellow-300 list-disc list-inside space-y-1">
                    <li>检查是否已正确登录管理员账户</li>
                    <li>确认Token是否有效且未过期</li>
                    <li>验证用户角色是否为admin或super_admin</li>
                    <li>尝试清除缓存后重新登录</li>
                  </ul>
                </div>
                
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded">
                  <p className="font-medium text-blue-800 dark:text-blue-200">如果Token无效:</p>
                  <ul className="mt-2 text-blue-700 dark:text-blue-300 list-disc list-inside space-y-1">
                    <li>Token可能已过期，请重新登录</li>
                    <li>检查localStorage中是否存在有效Token</li>
                    <li>确认登录API是否正常工作</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}