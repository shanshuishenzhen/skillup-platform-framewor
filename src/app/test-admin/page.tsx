/**
 * 管理员API测试页面
 * 用于测试管理员权限和API调用
 */

'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

export default function TestAdminPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const testAPI = async () => {
    setLoading(true);
    try {
      // 设置模拟令牌
      localStorage.setItem('token', 'mock-admin-token-for-development');
      
      const response = await fetch('/api/admin/stats', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer mock-admin-token-for-development'
        }
      });

      const data = await response.json();
      setResult({
        status: response.status,
        data: data
      });

      if (response.ok) {
        toast.success('API调用成功');
      } else {
        toast.error(`API调用失败: ${response.status}`);
      }
    } catch (error) {
      console.error('API调用错误:', error);
      toast.error('API调用错误');
      setResult({
        error: error instanceof Error ? error.message : '未知错误'
      });
    } finally {
      setLoading(false);
    }
  };

  const clearToken = () => {
    localStorage.removeItem('token');
    toast.info('已清除令牌');
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">管理员API测试</h1>
      
      <div className="space-y-4">
        <div className="flex space-x-4">
          <Button onClick={testAPI} disabled={loading}>
            {loading ? '测试中...' : '测试管理员API'}
          </Button>
          <Button onClick={clearToken} variant="outline">
            清除令牌
          </Button>
        </div>

        {result && (
          <Card>
            <CardHeader>
              <CardTitle>API响应结果</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>调试信息</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <p><strong>环境:</strong> {typeof window !== 'undefined' && window.location.hostname === 'localhost' ? 'development' : 'production'}</p>
              <p><strong>当前令牌:</strong> {typeof window !== 'undefined' ? (localStorage.getItem('token') || '无') : '加载中...'}</p>
              <p><strong>测试URL:</strong> /api/admin/stats</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
