/**
 * 消息通讯页面
 * 显示聊天室列表和消息界面
 */

'use client';

import { useState, useEffect } from 'react';
import SimpleChatInterface from '@/components/chat/SimpleChatInterface';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

// 模拟用户认证hook
function useAuth() {
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 模拟用户数据
    const mockUser = {
      id: 'demo-user-123',
      name: '演示用户',
      email: 'demo@example.com',
      avatar_url: null,
      status: 'active'
    };

    const mockToken = 'demo-token-123';

    // 设置模拟数据
    setUser(mockUser);
    setToken(mockToken);
    setLoading(false);
  }, []);

  return { user, token, loading };
}

export default function MessagesPage() {
  const { user, token, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  if (!user || !token) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20 flex items-center justify-center">
        <Card className="w-96">
          <CardHeader>
            <CardTitle>需要登录</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">请先登录以使用消息功能</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <SimpleChatInterface currentUser={user} />;
}
