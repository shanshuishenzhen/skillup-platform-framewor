'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, XCircle, AlertTriangle, RefreshCw } from 'lucide-react';

/**
 * 管理员登录调试工具页面
 * 用于诊断和修复管理员登录后无法访问管理后台的问题
 */
export default function AdminDebugPage() {
  const [phone, setPhone] = useState('13823738278');
  const [password, setPassword] = useState('123456');
  const [debugResults, setDebugResults] = useState<{
    login?: {
      success: boolean;
      token?: string;
      user?: unknown;
      message?: string;
      error?: string;
      status?: number;
    };
    token?: {
      success: boolean;
      payload?: unknown;
      isExpired?: boolean;
      expiresAt?: string;
      userId?: string;
      phone?: string;
      role?: string;
      error?: string;
    };
    role?: {
      success: boolean;
      error?: string;
    };
    permission?: {
      success: boolean;
      status?: number;
      data?: unknown;
      message?: string;
      error?: string;
    };
    frontend?: {
      success: boolean;
      localStorage?: {
        authToken: string;
        adminToken: string;
        userInfo: unknown;
        adminInfo: unknown;
      };
      currentUrl?: string;
      message?: string;
      error?: string;
    };
    error?: string;
  }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState('');

  /**
   * 执行完整的管理员登录调试流程
   */
  const runFullDebug = async () => {
    setIsLoading(true);
    setDebugResults({});
    
    try {
      // 步骤1: 测试管理员登录API
      setCurrentStep('测试管理员登录API...');
      const loginResult = await testAdminLogin();
      
      if (loginResult.success) {
        // 步骤2: 检查JWT token
        setCurrentStep('检查JWT token...');
        const tokenResult = await checkJWTToken(loginResult.token);
        
        // 步骤3: 验证数据库角色
        setCurrentStep('验证数据库角色...');
        const roleResult = await checkDatabaseRole();
        
        // 步骤4: 测试权限验证API
        setCurrentStep('测试权限验证API...');
        const permissionResult = await testPermissionAPI(loginResult.token);
        
        // 步骤5: 检查前端权限逻辑
        setCurrentStep('检查前端权限逻辑...');
        const frontendResult = await checkFrontendLogic();
        
        setDebugResults({
          login: loginResult,
          token: tokenResult,
          role: roleResult,
          permission: permissionResult,
          frontend: frontendResult
        });
      } else {
        setDebugResults({ login: loginResult });
      }
    } catch (error) {
      console.error('调试过程中发生错误:', error);
      setDebugResults({ error: error.message });
    } finally {
      setIsLoading(false);
      setCurrentStep('');
    }
  };

  /**
   * 测试管理员登录API
   */
  const testAdminLogin = async () => {
    try {
      const response = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone, password }),
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        return {
          success: true,
          token: data.token,
          user: data.user,
          message: '管理员登录成功'
        };
      } else {
        return {
          success: false,
          error: data.error || '登录失败',
          status: response.status
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: '登录API请求失败'
      };
    }
  };

  /**
   * 检查JWT token的有效性和内容
   */
  const checkJWTToken = async (token: string) => {
    try {
      // 解析JWT token payload
      const payload = JSON.parse(atob(token.split('.')[1]));
      
      // 检查token是否过期
      const isExpired = payload.exp * 1000 < Date.now();
      
      return {
        success: true,
        payload,
        isExpired,
        expiresAt: new Date(payload.exp * 1000).toLocaleString(),
        userId: payload.userId,
        phone: payload.phone,
        role: payload.role
      };
    } catch (error) {
      return {
        success: false,
        error: 'JWT token解析失败: ' + error.message
      };
    }
  };

  /**
   * 检查数据库中的用户角色
   */
  const checkDatabaseRole = async () => {
    try {
      const response = await fetch('/api/admin/debug/check-role', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone }),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      return {
        success: false,
        error: '数据库角色检查失败: ' + error.message
      };
    }
  };

  /**
   * 测试权限验证API
   */
  const testPermissionAPI = async (token: string) => {
    try {
      const response = await fetch('/api/admin/check-permission', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      
      return {
        success: response.ok,
        status: response.status,
        data,
        message: response.ok ? '权限验证通过' : '权限验证失败'
      };
    } catch (error) {
      return {
        success: false,
        error: '权限验证API请求失败: ' + error.message
      };
    }
  };

  /**
   * 检查前端权限逻辑
   */
  const checkFrontendLogic = async () => {
    try {
      // 检查localStorage中的认证信息
      const authToken = localStorage.getItem('authToken');
      const adminToken = localStorage.getItem('adminToken');
      const userInfo = localStorage.getItem('userInfo');
      const adminInfo = localStorage.getItem('adminInfo');
      
      return {
        success: true,
        localStorage: {
          authToken: authToken ? '存在' : '不存在',
          adminToken: adminToken ? '存在' : '不存在',
          userInfo: userInfo ? JSON.parse(userInfo) : null,
          adminInfo: adminInfo ? JSON.parse(adminInfo) : null
        },
        currentUrl: window.location.href,
        message: '前端状态检查完成'
      };
    } catch (error) {
      return {
        success: false,
        error: '前端逻辑检查失败: ' + error.message
      };
    }
  };

  /**
   * 修复管理员权限问题
   */
  const fixAdminPermissions = async () => {
    setIsLoading(true);
    setCurrentStep('修复管理员权限...');
    
    try {
      const response = await fetch('/api/admin/debug/fix-permissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone }),
      });

      const data = await response.json();
      
      if (data.success) {
        alert('权限修复成功！请重新登录。');
        // 清除本地存储
        localStorage.clear();
        // 重定向到登录页
        window.location.href = '/login';
      } else {
        alert('权限修复失败: ' + data.error);
      }
    } catch (error) {
      alert('权限修复过程中发生错误: ' + error.message);
    } finally {
      setIsLoading(false);
      setCurrentStep('');
    }
  };

  /**
   * 渲染调试结果
   */
  const renderDebugResults = () => {
    if (!debugResults || Object.keys(debugResults).length === 0) {
      return null;
    }

    return (
      <div className="space-y-4">
        {debugResults.error && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>{debugResults.error}</AlertDescription>
          </Alert>
        )}

        {debugResults.login && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {debugResults.login.success ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
                管理员登录测试
              </CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
                {JSON.stringify(debugResults.login, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}

        {debugResults.token && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {debugResults.token.success ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
                JWT Token 检查
              </CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
                {JSON.stringify(debugResults.token, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}

        {debugResults.role && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {debugResults.role.success ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
                数据库角色检查
              </CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
                {JSON.stringify(debugResults.role, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}

        {debugResults.permission && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {debugResults.permission.success ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
                权限验证API测试
              </CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
                {JSON.stringify(debugResults.permission, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}

        {debugResults.frontend && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {debugResults.frontend.success ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
                前端逻辑检查
              </CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
                {JSON.stringify(debugResults.frontend, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">管理员登录调试工具</h1>
        <p className="text-gray-600">
          用于诊断和修复管理员登录后无法访问管理后台的问题
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>测试配置</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="phone">管理员手机号</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="请输入管理员手机号"
            />
          </div>
          <div>
            <Label htmlFor="password">密码</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入密码"
            />
          </div>
          
          <Separator />
          
          <div className="flex gap-3">
            <Button 
              onClick={runFullDebug} 
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              {isLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              运行完整调试
            </Button>
            
            <Button 
              variant="outline" 
              onClick={fixAdminPermissions}
              disabled={isLoading}
            >
              修复权限问题
            </Button>
          </div>
          
          {currentStep && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{currentStep}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {renderDebugResults()}
    </div>
  );
}