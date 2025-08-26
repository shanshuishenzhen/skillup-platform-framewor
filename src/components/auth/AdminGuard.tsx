'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, AlertCircle } from 'lucide-react';
import { isJWTTokenValid, hasAdminPermission, parseJWTToken } from '@/utils/jwt';

// Token调试信息可视化组件
const TokenDebugInfo: React.FC = () => {
  const [tokenInfo, setTokenInfo] = useState<any>(null);
  const [showDebug, setShowDebug] = useState(false);
  
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      const payload = parseJWTToken(token);
      const now = Math.floor(Date.now() / 1000);
      
      setTokenInfo({
        hasToken: !!token,
        tokenLength: token.length,
        tokenPreview: `${token.substring(0, 20)}...${token.substring(token.length - 10)}`,
        payload: payload,
        isValid: isJWTTokenValid(token),
        hasAdminPermission: hasAdminPermission(token),
        timeInfo: payload ? {
          issued: payload.iat ? new Date(payload.iat * 1000).toLocaleString() : '未知',
          expires: payload.exp ? new Date(payload.exp * 1000).toLocaleString() : '未知',
          isExpired: payload.exp ? payload.exp < now : false,
          remainingTime: payload.exp ? Math.max(0, payload.exp - now) : 0
        } : null
      });
    }
  }, []);
  
  if (!tokenInfo) return null;
  
  return (
    <div className="mt-6 p-4 bg-gray-100 rounded-lg text-left">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700">🔍 Token调试信息</h3>
        <button
          onClick={() => setShowDebug(!showDebug)}
          className="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          {showDebug ? '隐藏详情' : '显示详情'}
        </button>
      </div>
      
      {/* 基础信息 */}
      <div className="grid grid-cols-2 gap-2 text-xs mb-3">
        <div className="flex items-center">
          <span className={`w-2 h-2 rounded-full mr-2 ${tokenInfo.hasToken ? 'bg-green-500' : 'bg-red-500'}`}></span>
          <span>Token: {tokenInfo.hasToken ? '存在' : '不存在'}</span>
        </div>
        <div className="flex items-center">
          <span className={`w-2 h-2 rounded-full mr-2 ${tokenInfo.isValid ? 'bg-green-500' : 'bg-red-500'}`}></span>
          <span>有效性: {tokenInfo.isValid ? '有效' : '无效'}</span>
        </div>
        <div className="flex items-center">
          <span className={`w-2 h-2 rounded-full mr-2 ${tokenInfo.hasAdminPermission ? 'bg-green-500' : 'bg-red-500'}`}></span>
          <span>管理员权限: {tokenInfo.hasAdminPermission ? '有' : '无'}</span>
        </div>
        <div className="flex items-center">
          <span className={`w-2 h-2 rounded-full mr-2 ${tokenInfo.timeInfo?.isExpired ? 'bg-red-500' : 'bg-green-500'}`}></span>
          <span>过期状态: {tokenInfo.timeInfo?.isExpired ? '已过期' : '未过期'}</span>
        </div>
      </div>
      
      {/* 用户信息 */}
      {tokenInfo.payload && (
        <div className="mb-3 p-2 bg-white rounded border">
          <div className="text-xs font-medium text-gray-600 mb-1">👤 用户信息</div>
          <div className="text-xs space-y-1">
            <div><strong>用户ID:</strong> {tokenInfo.payload.userId || '未知'}</div>
            <div><strong>用户类型:</strong> {tokenInfo.payload.userType || '未知'}</div>
            <div><strong>角色:</strong> 
              <span className={`ml-1 px-2 py-0.5 rounded text-xs ${
                tokenInfo.payload.role === 'admin' || tokenInfo.payload.role === 'super_admin' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {tokenInfo.payload.role || '未设置'}
              </span>
            </div>
          </div>
        </div>
      )}
      
      {/* 时间信息 */}
      {tokenInfo.timeInfo && (
        <div className="mb-3 p-2 bg-white rounded border">
          <div className="text-xs font-medium text-gray-600 mb-1">⏰ 时间信息</div>
          <div className="text-xs space-y-1">
            <div><strong>签发时间:</strong> {tokenInfo.timeInfo.issued}</div>
            <div><strong>过期时间:</strong> {tokenInfo.timeInfo.expires}</div>
            <div><strong>剩余时间:</strong> 
              <span className={tokenInfo.timeInfo.remainingTime > 3600 ? 'text-green-600' : 'text-red-600'}>
                {Math.floor(tokenInfo.timeInfo.remainingTime / 3600)}小时{Math.floor((tokenInfo.timeInfo.remainingTime % 3600) / 60)}分钟
              </span>
            </div>
          </div>
        </div>
      )}
      
      {/* 详细调试信息 */}
      {showDebug && (
        <div className="p-2 bg-gray-800 text-green-400 rounded text-xs font-mono">
          <div className="mb-2"><strong>Token预览:</strong></div>
          <div className="break-all mb-2">{tokenInfo.tokenPreview}</div>
          <div className="mb-2"><strong>完整Payload:</strong></div>
          <pre className="whitespace-pre-wrap">{JSON.stringify(tokenInfo.payload, null, 2)}</pre>
        </div>
      )}
      
      <div className="text-xs text-gray-500 mt-2">
        💡 提示: 打开浏览器控制台查看详细的权限验证日志
      </div>
    </div>
  );
};

interface AdminGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  skipRemoteCheck?: boolean; // 新增：跳过远程检查选项
}

/**
 * 管理员权限保护组件（优化版）
 * 用于保护需要管理员权限的页面和组件
 * 优化了权限检查流程，减少重复验证
 * @param children - 需要保护的子组件
 * @param fallback - 权限不足时显示的组件
 * @param skipRemoteCheck - 是否跳过远程权限检查（用于避免重复验证）
 */
export default function AdminGuard({ children, fallback, skipRemoteCheck = false }: AdminGuardProps) {
  const { user, isLoggedIn, loading, logout } = useAuth();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastCheckTime, setLastCheckTime] = useState<number>(0);
  
  // 优化的认证错误处理函数（增强版）
  const handleAuthError = useCallback((message: string, errorType: 'token_invalid' | 'permission_denied' | 'network_error' | 'token_missing' | 'token_expired' | 'server_error' = 'token_invalid', details?: any) => {
    console.log(`❌ AdminGuard认证错误: ${message} (类型: ${errorType})`);
    console.log('📊 错误详细信息:', {
      errorType,
      message,
      details,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      localStorage: {
        hasToken: !!localStorage.getItem('token'),
        hasUser: !!localStorage.getItem('user'),
        tokenLength: localStorage.getItem('token')?.length || 0
      }
    });
    
    // 根据错误类型设置不同的错误信息
    let userFriendlyMessage = message;
    switch (errorType) {
      case 'token_missing':
        userFriendlyMessage = '登录信息丢失，请重新登录';
        break;
      case 'token_invalid':
        userFriendlyMessage = '登录信息无效，请重新登录';
        break;
      case 'token_expired':
        userFriendlyMessage = '登录已过期，请重新登录';
        break;
      case 'permission_denied':
        userFriendlyMessage = '您没有管理员权限，请联系系统管理员';
        break;
      case 'network_error':
        userFriendlyMessage = '网络连接失败，请检查网络后重试';
        break;
      case 'server_error':
        userFriendlyMessage = '服务器错误，请稍后重试';
        break;
      default:
        userFriendlyMessage = message;
    }
    
    setError(userFriendlyMessage);
    
    // 根据错误类型决定处理策略
    switch (errorType) {
      case 'token_invalid':
      case 'token_missing':
      case 'token_expired':
        // Token无效或过期，需要重新登录
        setIsAdmin(false);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        logout();
        setTimeout(() => {
          router.push('/login?redirect=' + encodeURIComponent(window.location.pathname));
        }, 2000);
        break;
        
      case 'permission_denied':
        // 权限不足，但不清除token，允许用户访问其他页面
        setIsAdmin(false);
        console.log('⚠️ AdminGuard: 权限不足，但保留用户登录状态');
        break;
        
      case 'network_error':
      case 'server_error':
        // 网络错误或服务器错误，不影响用户状态，只显示警告
        console.log('⚠️ AdminGuard: 网络/服务器错误，不影响用户登录状态');
        // 不改变isAdmin状态，让用户继续使用
        break;
    }
  }, [logout, router]);

  useEffect(() => {
    const checkAdminPermission = async () => {
      console.log('🔍 AdminGuard: 开始权限检查');
      console.log('📊 AdminGuard调试信息:', {
          timestamp: new Date().toISOString(),
          isLoggedIn,
          user: user ? { id: user.id, phone: user.phone } : null,
          hasToken: !!localStorage.getItem('token')
        });
      setChecking(true);
      setError(null);
      
      const now = Date.now();
      const CACHE_DURATION = 60 * 60 * 1000; // 60分钟缓存，减少重复验证
      
      // 检查是否需要重新验证（避免频繁检查）
      const currentToken = localStorage.getItem('token');
      const currentTokenHash = currentToken ? btoa(currentToken.substring(0, 20)) : '';
      const lastTokenHash = localStorage.getItem('lastTokenHash') || '';
      
      if (isAdmin === true && (now - lastCheckTime) < CACHE_DURATION && currentTokenHash === lastTokenHash) {
        console.log('✅ AdminGuard: 使用缓存的权限结果');
        setChecking(false);
        return;
      }

      // 1. 检查用户是否登录
      if (!isLoggedIn || !user) {
        console.log('❌ AdminGuard: 用户未登录');
        console.log('📊 登录状态详情:', { isLoggedIn, user });
        handleAuthError('用户未登录，请先登录', 'token_invalid');
        setChecking(false);
        return;
      }

      // 2. 获取并验证token
      const token = localStorage.getItem('token');
      console.log('📊 Token检查:', {
        hasToken: !!token,
        tokenLength: token?.length || 0,
        tokenPreview: token ? `${token.substring(0, 20)}...` : 'null'
      });

      if (!token) {
        console.log('❌ AdminGuard: Token不存在');
        handleAuthError('未找到认证信息，请重新登录', 'token_missing', {
          localStorage: Object.keys(localStorage),
          sessionStorage: Object.keys(sessionStorage)
        });
        setChecking(false);
        return;
      }

      // 检查token格式
      if (!token.startsWith('eyJ')) {
        console.log('❌ AdminGuard: Token格式无效');
        handleAuthError('认证信息格式错误，请重新登录', 'token_invalid', {
          tokenFormat: 'invalid_jwt_format',
          tokenStart: token.substring(0, 10)
        });
        setChecking(false);
        return;
      }
      
      console.log('📊 Token信息:', {
        tokenLength: token.length,
        tokenPrefix: token.substring(0, 20) + '...',
        tokenSuffix: '...' + token.substring(token.length - 10)
      });

      // 3. 本地JWT token验证
      try {
        console.log('🔍 AdminGuard: 开始JWT token验证');
        
        // 首先验证token格式和有效性
        const isTokenValid = isJWTTokenValid(token);
        console.log('📊 Token有效性检查:', {
          isValid: isTokenValid,
          tokenParts: token.split('.').length,
          expectedParts: 3
        });
        
        if (!isTokenValid) {
          console.log('❌ AdminGuard: Token无效或已过期');
          const tokenPayload = parseJWTToken(token);
          const isExpired = tokenPayload?.exp && tokenPayload.exp * 1000 < Date.now();
          handleAuthError(
            isExpired ? '登录已过期，请重新登录' : '认证信息无效，请重新登录',
            isExpired ? 'token_expired' : 'token_invalid',
            {
              tokenExpired: isExpired,
              expTime: tokenPayload?.exp ? new Date(tokenPayload.exp * 1000).toISOString() : null,
              currentTime: new Date().toISOString()
            }
          );
          setChecking(false);
          return;
        }

        // 解析token获取payload - 详细调试版本
        console.log('🔍 开始解析JWT Token...');
        console.log('📊 Token原始信息:', {
          tokenLength: token.length,
          tokenParts: token.split('.').length,
          header: token.split('.')[0],
          payload: token.split('.')[1],
          signature: token.split('.')[2] ? '存在' : '缺失'
        });
        
        const tokenPayload = parseJWTToken(token);
        
        // 详细的Token payload调试信息
        console.log('🔍 Token解析详细结果:');
        console.log('📊 完整Payload内容:', tokenPayload);
        console.log('📊 Payload字段分析:', {
          hasPayload: !!tokenPayload,
          payloadType: typeof tokenPayload,
          payloadKeys: tokenPayload ? Object.keys(tokenPayload) : [],
          userId: tokenPayload?.userId,
          userIdType: typeof tokenPayload?.userId,
          role: tokenPayload?.role,
          roleType: typeof tokenPayload?.role,
          email: tokenPayload?.email,
          exp: tokenPayload?.exp,
          expType: typeof tokenPayload?.exp,
          iat: tokenPayload?.iat,
          currentTime: Math.floor(Date.now() / 1000),
          isExpired: tokenPayload?.exp ? tokenPayload.exp < Math.floor(Date.now() / 1000) : '无法判断',
          timeToExpiry: tokenPayload?.exp ? tokenPayload.exp - Math.floor(Date.now() / 1000) : '无法计算'
        });
        
        // 如果有额外字段，也要显示
        if (tokenPayload) {
          const knownFields = ['userId', 'role', 'email', 'exp', 'iat', 'sub', 'iss', 'aud'];
          const extraFields = Object.keys(tokenPayload).filter(key => !knownFields.includes(key));
          if (extraFields.length > 0) {
            console.log('📊 Token额外字段:', extraFields.reduce((acc, key) => {
              acc[key] = tokenPayload[key];
              return acc;
            }, {} as any));
          }
        }
        
        if (!tokenPayload || !tokenPayload.userId) {
          console.log('❌ AdminGuard: Token解析失败或缺少用户信息');
          handleAuthError('认证信息解析失败，请重新登录', 'token_invalid', {
            payloadExists: !!tokenPayload,
            hasUserId: !!(tokenPayload?.userId),
            payloadKeys: tokenPayload ? Object.keys(tokenPayload) : []
          });
          setChecking(false);
          return;
        }
        
        // 检查是否具有管理员权限 - 详细调试版本
        console.log('🔍 开始管理员权限检查...');
        console.log('📊 权限检查输入参数:', {
          tokenProvided: !!token,
          tokenType: typeof token,
          tokenLength: token?.length,
          payloadRole: tokenPayload?.role,
          payloadRoleType: typeof tokenPayload?.role
        });
        
        // 调用hasAdminPermission函数并记录详细过程
        console.log('🔍 调用hasAdminPermission函数...');
        const hasAdminAccess = hasAdminPermission(token);
        
        console.log('📊 hasAdminPermission函数执行结果:', {
          functionResult: hasAdminAccess,
          resultType: typeof hasAdminAccess,
          inputToken: token ? `${token.substring(0, 20)}...` : 'null',
          payloadRole: tokenPayload?.role,
          expectedRoles: ['admin', 'super_admin'],
          roleMatch: tokenPayload?.role === 'admin' || tokenPayload?.role === 'super_admin',
          detailedAnalysis: {
            isAdmin: tokenPayload?.role === 'admin',
            isSuperAdmin: tokenPayload?.role === 'super_admin',
            roleValue: tokenPayload?.role,
            roleComparison: {
              'admin': tokenPayload?.role === 'admin',
              'super_admin': tokenPayload?.role === 'super_admin'
            }
          }
        });
        
        // 如果权限检查失败，提供详细的失败原因
        if (!hasAdminAccess) {
          console.log('❌ 权限检查失败 - 详细分析:');
          console.log('📊 失败原因分析:', {
            tokenExists: !!token,
            payloadExists: !!tokenPayload,
            roleExists: !!tokenPayload?.role,
            roleValue: tokenPayload?.role,
            roleType: typeof tokenPayload?.role,
            isEmptyRole: tokenPayload?.role === '',
            isNullRole: tokenPayload?.role === null,
            isUndefinedRole: tokenPayload?.role === undefined,
            expectedRoles: ['admin', 'super_admin'],
            possibleIssues: [
              !token && 'Token不存在',
              !tokenPayload && 'Token解析失败',
              !tokenPayload?.role && 'Role字段缺失',
              tokenPayload?.role && !['admin', 'super_admin'].includes(tokenPayload.role) && `Role值不匹配: ${tokenPayload.role}`
            ].filter(Boolean)
          });
        } else {
          console.log('✅ 权限检查成功 - 详细信息:', {
          userRole: tokenPayload?.role,
          hasAdminRole: tokenPayload?.role === 'admin',
          hasSuperAdminRole: tokenPayload?.role === 'super_admin',
          userId: tokenPayload?.userId,
          userType: tokenPayload?.userType
        });
        }
        
        if (!hasAdminAccess) {
          console.log('❌ AdminGuard: 用户不具有管理员权限');
          console.log('📊 权限拒绝详细分析:', {
            currentRole: tokenPayload?.role,
            requiredRoles: ['admin', 'super_admin'],
            userId: tokenPayload?.userId,
            userType: tokenPayload?.userType,
            tokenValid: true,
            payloadValid: !!tokenPayload,
            roleFieldExists: 'role' in (tokenPayload || {}),
            roleValue: tokenPayload?.role,
            roleComparison: {
              isAdmin: tokenPayload?.role === 'admin',
              isSuperAdmin: tokenPayload?.role === 'super_admin',
              isUser: tokenPayload?.role === 'user',
              isOther: tokenPayload?.role && !['admin', 'super_admin', 'user'].includes(tokenPayload.role)
            },
            debugInfo: {
              tokenLength: token.length,
              payloadKeys: tokenPayload ? Object.keys(tokenPayload) : [],
              hasAdminPermissionResult: hasAdminAccess,
              timestamp: new Date().toISOString()
            }
          });
          
          // 显示用户友好的错误信息
          const roleMessage = tokenPayload?.role ? 
            `当前角色: ${tokenPayload.role}，需要: admin 或 super_admin` : 
            '无法获取用户角色信息';
          
          handleAuthError(`您没有管理员权限访问此页面。${roleMessage}`, 'permission_denied', {
            userRole: tokenPayload?.role,
            userId: tokenPayload?.userId,
            userType: tokenPayload?.userType,
            requiredRoles: ['admin', 'super_admin'],
            debugInfo: {
              hasAdminPermissionResult: hasAdminAccess,
              tokenPayload: tokenPayload
            }
          });
          setChecking(false);
          return;
        }

        console.log('✅ AdminGuard: 本地token验证通过');
        console.log('📊 验证成功详情:', {
          userId: tokenPayload?.userId,
          role: tokenPayload?.role,
          tokenValid: true,
          adminAccess: true
        });

        // 4. 优化的权限验证策略：优先信任本地token，减少远程验证依赖
        console.log('✅ AdminGuard: 本地验证通过，设置管理员权限');
        setIsAdmin(true);
        setLastCheckTime(now);
        // 缓存token哈希用于验证token是否变化
        const tokenHash = token ? btoa(token.substring(0, 20)) : '';
        localStorage.setItem('lastTokenHash', tokenHash);
        console.log('💾 AdminGuard: 权限验证结果已缓存（60分钟）');

        // 远程权限验证（可选，基于skipRemoteCheck参数）
        if (!skipRemoteCheck) {
          // 异步执行远程验证，不阻塞用户操作
          setTimeout(async () => {
            try {
              console.log('🔍 AdminGuard: 后台执行远程权限验证');
              console.log('📊 远程验证请求信息:', {
                url: '/api/admin/check-permission',
                method: 'GET',
                hasToken: !!token,
                tokenPrefix: token.substring(0, 20) + '...'
              });
              
              const response = await fetch('/api/admin/check-permission', {
                method: 'GET',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
              });

              console.log('📊 远程验证响应:', {
                status: response.status,
                statusText: response.statusText,
                ok: response.ok,
                headers: Object.fromEntries(response.headers.entries())
              });

              if (response.ok) {
                const data = await response.json();
                console.log('✅ AdminGuard: 后台远程权限验证成功', data);
                console.log('📊 远程验证成功:', {
                  remoteIsAdmin: data.success,
                  localPermission: 'admin',
                  consistent: true
                });
                // 远程验证成功，清除任何之前的错误信息
                setError(null);
              } else if (response.status === 401) {
                console.log('⚠️ AdminGuard: 远程权限验证 - 认证失败');
                console.log('📊 远程验证失败详情:', {
                  status: response.status,
                  statusText: response.statusText,
                  strategy: 'keep_local_permission',
                  reason: 'authentication_failed'
                });
                // 401错误可能表示token在服务器端已失效，但保持本地验证结果
                console.log('⚠️ AdminGuard: 远程认证失败，但保持本地验证结果');
              } else if (response.status === 403) {
                console.log('⚠️ AdminGuard: 远程权限验证 - 权限不足');
                console.log('📊 远程验证失败详情:', {
                  status: response.status,
                  statusText: response.statusText,
                  strategy: 'keep_local_permission',
                  reason: 'permission_denied'
                });
                // 403错误表示权限不足，但保持本地验证结果
                console.log('⚠️ AdminGuard: 远程权限不足，但保持本地验证结果');
              } else if (response.status >= 500) {
                console.log('⚠️ AdminGuard: 远程权限验证 - 服务器错误');
                console.log('📊 远程验证服务器错误:', {
                  status: response.status,
                  statusText: response.statusText,
                  strategy: 'fallback_to_local',
                  reason: 'server_error'
                });
                // 服务器错误，完全忽略，不影响用户体验
              } else {
                console.log('⚠️ AdminGuard: 远程权限验证 - 未知错误');
                console.log('📊 远程验证未知错误:', {
                  status: response.status,
                  statusText: response.statusText,
                  strategy: 'fallback_to_local',
                  reason: 'unknown_error'
                });
              }
            } catch (networkError) {
              console.log('⚠️ AdminGuard: 远程权限验证网络错误:', {
                error: networkError,
                message: networkError instanceof Error ? networkError.message : 'Unknown error',
                name: networkError instanceof Error ? networkError.name : 'UnknownError',
                stack: networkError instanceof Error ? networkError.stack : null,
                timestamp: new Date().toISOString(),
                url: '/api/admin/check-permission',
                strategy: 'fallback_to_local',
                connectionStatus: navigator.onLine ? 'online' : 'offline',
                userAgent: navigator.userAgent
              });
              
              // 根据错误类型提供更详细的诊断信息
              if (networkError instanceof TypeError && networkError.message.includes('fetch')) {
                console.log('🔍 AdminGuard: 网络连接问题 - fetch失败');
              } else if (networkError instanceof Error && networkError.name === 'AbortError') {
                console.log('🔍 AdminGuard: 请求被中止');
              } else {
                console.log('🔍 AdminGuard: 未知网络错误');
              }
              
              // 网络错误，完全忽略，不影响用户体验
            }
          }, 1000); // 延迟1秒执行，避免阻塞界面
        } else {
          // 跳过远程检查，直接使用本地验证结果
          console.log('✅ AdminGuard: 跳过远程检查，使用本地验证结果');
        }
      } catch (tokenError) {
        console.log('❌ AdminGuard: Token解析错误', tokenError);
        console.log('📊 权限检查错误详情:', {
          error: tokenError.message,
          errorType: tokenError.name,
          stack: tokenError.stack,
          timestamp: new Date().toISOString(),
          context: 'permission_check',
          userAgent: navigator.userAgent,
          url: window.location.href,
          localStorage: {
            hasAuthToken: !!localStorage.getItem('authToken'),
            hasUser: !!localStorage.getItem('user'),
            storageKeys: Object.keys(localStorage)
          }
        });
        
        // 根据错误类型提供更详细的处理
        if (tokenError instanceof SyntaxError) {
          console.log('🔍 AdminGuard: JSON解析错误 - 可能是token格式问题');
          handleAuthError('认证信息格式错误，请重新登录', 'token_invalid', {
            errorType: 'json_parse_error',
            originalError: tokenError.message
          });
        } else if (tokenError instanceof TypeError) {
          console.log('🔍 AdminGuard: 类型错误 - 可能是数据结构问题');
          handleAuthError('系统数据错误，请刷新页面重试', 'system_error', {
            errorType: 'type_error',
            originalError: tokenError.message
          });
        } else if (tokenError instanceof ReferenceError) {
          console.log('🔍 AdminGuard: 引用错误 - 可能是代码问题');
          handleAuthError('系统配置错误，请联系技术支持', 'system_error', {
            errorType: 'reference_error',
            originalError: tokenError.message
          });
        } else {
          console.log('🔍 AdminGuard: 未知错误类型');
          handleAuthError('认证信息无效，请重新登录', 'token_invalid', {
            errorType: 'unknown_error',
            originalError: tokenError instanceof Error ? tokenError.message : String(tokenError)
          });
        }
      }

      setChecking(false);
    };

    if (!loading) {
      checkAdminPermission();
    }
  }, [isLoggedIn, user, loading, skipRemoteCheck, handleAuthError]);

  // 正在检查权限
  if (loading || checking) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center p-8 bg-white rounded-lg shadow-sm max-w-2xl mx-auto">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-700 font-medium">正在验证管理员权限...</p>
          <p className="text-gray-500 text-sm mt-2">请稍候，这通常只需要几秒钟</p>
          {error && (
            <p className="text-red-500 text-sm mt-2">调试信息: {error}</p>
          )}
          
          {/* Token调试信息可视化 */}
          <TokenDebugInfo />
        </div>
      </div>
    );
  }

  // 未登录
  if (!isLoggedIn || !user) {
    if (fallback) {
      return <>{fallback}</>;
    }
    
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            需要登录
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            请先登录您的账户以访问此页面。
          </p>
          {error && (
            <p className="text-red-500 text-sm mb-4">错误: {error}</p>
          )}
          <button
            onClick={() => router.push('/login')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            前往登录
          </button>
        </div>
      </div>
    );
  }

  // 权限不足
  if (isAdmin === false) {
    if (fallback) {
      return <>{fallback}</>;
    }
    
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center p-8 bg-white rounded-lg shadow-sm max-w-md">
          <div className="text-amber-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">权限验证失败</h2>
          <p className="text-gray-600 mb-6">
            {error || '无法验证您的管理员权限。这可能是临时的网络问题或权限配置问题。'}
          </p>
          <div className="space-y-3">
            <button
              onClick={() => {
                // 先尝试刷新页面
                window.location.reload();
              }}
              className="w-full bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              刷新页面重试
            </button>
            <button
              onClick={() => {
                // 清除认证信息并重新登录
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                localStorage.removeItem('lastTokenHash');
                window.location.href = '/login';
              }}
              className="w-full bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              重新登录
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 有权限，渲染子组件
  console.log('✅ AdminGuard: 权限验证通过，渲染管理员页面');
  return <>{children}</>;
}

/**
 * 管理员权限检查Hook（修复版）
 * 用于在组件中检查当前用户是否具有管理员权限
 * @returns {object} 包含权限状态和检查函数的对象
 */
export function useAdminPermission() {
  const { user, isLoggedIn } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);

  const checkPermission = async () => {
    if (!isLoggedIn || !user) {
      setIsAdmin(false);
      return false;
    }

    setChecking(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setIsAdmin(false);
        return false;
      }

      const response = await fetch('/api/admin/check-permission', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        const hasPermission = result.success === true;
        setIsAdmin(hasPermission);
        return hasPermission;
      } else {
        setIsAdmin(false);
        return false;
      }
    } catch (error) {
      console.error('检查管理员权限失败:', error);
      setIsAdmin(false);
      return false;
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    checkPermission();
  }, [isLoggedIn, user]);

  return {
    isAdmin,
    checking,
    checkPermission,
    refresh: checkPermission
  };
}