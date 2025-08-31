/**
 * 导航功能测试组件
 * 用于测试返回按钮和导航功能
 */

'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft, 
  Home, 
  RefreshCw, 
  Navigation,
  CheckCircle,
  XCircle,
  Info
} from 'lucide-react';
import { 
  smartGoBack, 
  safeGoBack, 
  safeNavigate, 
  getParentNavigationUrl,
  ADMIN_NAVIGATION_MAP 
} from '@/utils/navigationHelper';

export default function NavigationTest() {
  const router = useRouter();
  const pathname = usePathname();

  const testNavigationFunctions = () => {
    console.log('=== 导航功能测试 ===');
    console.log('当前路径:', pathname);
    console.log('父级URL:', getParentNavigationUrl(pathname));
    console.log('历史记录长度:', window.history.length);
    console.log('来源页面:', document.referrer);
    console.log('导航映射:', ADMIN_NAVIGATION_MAP);
  };

  const testSmartGoBack = () => {
    console.log('测试智能返回功能');
    smartGoBack(router, pathname);
  };

  const testSafeGoBack = () => {
    console.log('测试安全返回功能');
    safeGoBack(router, '/admin');
  };

  const testSafeNavigate = (url: string) => {
    console.log('测试安全导航到:', url);
    safeNavigate(router, url);
  };

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Navigation className="w-5 h-5 mr-2" />
          导航功能测试
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 当前状态信息 */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-medium text-blue-900 mb-2 flex items-center">
            <Info className="w-4 h-4 mr-2" />
            当前状态
          </h3>
          <div className="text-sm text-blue-800 space-y-1">
            <p><strong>当前路径:</strong> {pathname}</p>
            <p><strong>父级URL:</strong> {getParentNavigationUrl(pathname)}</p>
            <p><strong>历史记录:</strong> {typeof window !== 'undefined' ? window.history.length : 'N/A'} 条</p>
            <p><strong>来源页面:</strong> {typeof document !== 'undefined' ? document.referrer || '无' : 'N/A'}</p>
          </div>
        </div>

        {/* 测试按钮 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <h3 className="font-medium text-gray-900">返回功能测试</h3>
            
            <Button 
              onClick={testSmartGoBack}
              className="w-full justify-start"
              variant="outline"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              智能返回
            </Button>
            
            <Button 
              onClick={testSafeGoBack}
              className="w-full justify-start"
              variant="outline"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              安全返回
            </Button>
            
            <Button 
              onClick={() => router.back()}
              className="w-full justify-start"
              variant="outline"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              浏览器返回
            </Button>
          </div>

          <div className="space-y-3">
            <h3 className="font-medium text-gray-900">导航功能测试</h3>
            
            <Button 
              onClick={() => testSafeNavigate('/admin')}
              className="w-full justify-start"
              variant="outline"
            >
              <Home className="w-4 h-4 mr-2" />
              管理员首页
            </Button>
            
            <Button 
              onClick={() => testSafeNavigate('/admin?tab=exam-system')}
              className="w-full justify-start"
              variant="outline"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              考试系统
            </Button>
            
            <Button 
              onClick={() => testSafeNavigate('/admin?tab=tools')}
              className="w-full justify-start"
              variant="outline"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              实用工具
            </Button>
          </div>
        </div>

        {/* 调试信息 */}
        <div className="space-y-3">
          <h3 className="font-medium text-gray-900">调试功能</h3>
          
          <Button 
            onClick={testNavigationFunctions}
            className="w-full justify-start"
            variant="outline"
          >
            <Info className="w-4 h-4 mr-2" />
            打印调试信息
          </Button>
        </div>

        {/* 导航映射表 */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-medium text-gray-900 mb-3">导航映射表</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
            {Object.entries(ADMIN_NAVIGATION_MAP).map(([key, value]) => (
              <div key={key} className="flex justify-between">
                <span className="text-gray-600">{key}:</span>
                <span className="text-gray-900 font-mono text-xs">
                  {typeof value === 'function' ? 'function' : value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 使用说明 */}
        <div className="bg-yellow-50 p-4 rounded-lg">
          <h3 className="font-medium text-yellow-900 mb-2">使用说明</h3>
          <ul className="text-sm text-yellow-800 space-y-1">
            <li>• 打开浏览器开发者工具查看控制台输出</li>
            <li>• 测试不同的返回和导航功能</li>
            <li>• 观察URL变化和页面跳转</li>
            <li>• 检查历史记录和来源页面信息</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
