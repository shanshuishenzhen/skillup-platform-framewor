'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, EyeOff, Phone, Lock, MessageSquare, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isLoggedIn } = useAuth();
  const [formData, setFormData] = useState({
    phone: '',
    password: '',
    smsCode: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);

  // 如果已登录，重定向到首页
  useEffect(() => {
    if (isLoggedIn) {
      const returnUrl = searchParams.get('returnUrl') || '/';
      router.push(returnUrl);
    }
  }, [isLoggedIn, router, searchParams]);

  const handleSendCode = async () => {
    if (!formData.phone) {
      setError('请输入手机号');
      toast.error('请输入手机号');
      return;
    }

    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(formData.phone)) {
      setError('手机号格式不正确');
      toast.error('手机号格式不正确');
      return;
    }

    setError('');
    
    try {
      // 调用短信发送API
      const response = await fetch('/api/sms/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: formData.phone,
          purpose: 'register'
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        setCountdown(60);
        
        // 启动倒计时
        const timer = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(timer);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
        
        toast.success('验证码已发送，请查收短信');
      } else {
        setError(result.error || '发送验证码失败');
        toast.error(result.error || '发送验证码失败');
      }
    } catch (error) {
      console.error('发送验证码错误:', error);
      const errorMessage = '网络错误，请稍后重试';
      setError(errorMessage);
      toast.error(errorMessage);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // 调用API接口进行注册
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: formData.phone,
          password: formData.password,
          verificationCode: formData.smsCode
        }),
      });

      const result = await response.json();
      
      if (result.success && result.data) {
        toast.success('注册成功！');
        
        // 使用useAuth hook进行登录
        login(result.data.user, result.data.token);
        
        // 跳转到返回页面或首页
        const returnUrl = searchParams.get('returnUrl') || '/';
        router.push(returnUrl);
      } else {
        setError(result.error || '注册失败');
        toast.error(result.error || '注册失败');
      }
    } catch (error) {
      console.error('注册错误:', error);
      const errorMessage = '网络错误，请稍后重试';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">注册</CardTitle>
          <CardDescription className="text-center">
            创建您的 SkillUp 账户
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-md">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">{error}</span>
              </div>
            )}
            

            
            <div className="space-y-2">
              <Label htmlFor="phone">手机号</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="phone"
                  type="tel"
                  placeholder="请输入手机号"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="pl-10"
                  required
                  disabled={loading}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="verificationCode">短信验证码</Label>
              <div className="flex space-x-2">
                <div className="relative flex-1">
                  <MessageSquare className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="verificationCode"
                    type="text"
                    placeholder="请输入验证码"
                    value={formData.smsCode}
                    onChange={(e) => setFormData({ ...formData, smsCode: e.target.value })}
                    className="pl-10"
                    required
                    disabled={loading}
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSendCode}
                  disabled={countdown > 0 || !formData.phone || loading}
                  className="whitespace-nowrap"
                >
                  {countdown > 0 ? `${countdown}s` : '发送验证码'}
                </Button>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">密码</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="请输入密码（至少6位）"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="pl-10 pr-10"
                  required
                  minLength={6}
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                  disabled={loading}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  注册中...
                </>
              ) : (
                '注册'
              )}
            </Button>
          </form>
          
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              已有账户？{' '}
              <Link href="/login" className="text-blue-600 hover:underline font-medium">
                立即登录
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
