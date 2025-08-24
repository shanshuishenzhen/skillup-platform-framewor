'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, EyeOff, Phone, Lock, Loader2, MessageSquare } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, adminLogin, isLoggedIn } = useAuth();
  const [formData, setFormData] = useState({
    phone: '',
    password: '',
    smsCode: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loginType, setLoginType] = useState<'password' | 'sms'>('password');
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
          purpose: 'login'
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
      // 检测是否为管理员登录（特定手机号）
      const isAdminLogin = formData.phone === '13823738278';
      
      // 根据登录类型构建请求体
      const requestBody = loginType === 'password' 
        ? { phone: formData.phone, password: formData.password }
        : { phone: formData.phone, verificationCode: formData.smsCode };

      // 根据用户类型选择API端点
      const apiEndpoint = isAdminLogin && loginType === 'password' 
        ? '/api/admin/auth/login' 
        : '/api/auth/login';
      
      // 管理员只支持密码登录
      if (isAdminLogin && loginType === 'sms') {
        setError('管理员账户仅支持密码登录');
        setLoading(false);
        return;
      }

      // 调用API接口进行登录
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();
      
      if (result.success && result.user && result.token) {
        toast.success('登录成功！');
        
        // 登录成功
        if (isAdminLogin) {
          // 使用管理员登录函数
          await adminLogin(result.user, result.token);
          router.push('/admin');
        } else {
          // 使用普通用户登录函数
          await login(result.user, result.token);
          // 根据用户类型和人脸验证状态跳转
          const returnUrl = searchParams.get('returnUrl');
          if (result.user.userType === 'premium' && !result.user.faceVerified) {
            const faceVerifyUrl = returnUrl 
              ? `/face-verification?returnUrl=${encodeURIComponent(returnUrl)}`
              : '/face-verification';
            router.push(faceVerifyUrl);
          } else {
            router.push(returnUrl || '/');
          }
        }
      } else {
        setError(result.error || result.message || '登录失败');
        toast.error(result.error || result.message || '登录失败');
      }
    } catch (error) {
      console.error('登录错误:', error);
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
          <CardTitle className="text-2xl font-bold text-center">登录</CardTitle>
          <CardDescription className="text-center">
            使用手机号登录您的账户
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* 登录方式切换 */}
          <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setLoginType('password')}
              className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
                loginType === 'password'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              disabled={loading}
            >
              密码登录
            </button>
            <button
              type="button"
              onClick={() => setLoginType('sms')}
              className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
                loginType === 'sms'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              disabled={loading}
            >
              验证码登录
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-md">
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
            
            {loginType === 'password' ? (
              <div className="space-y-2">
                <Label htmlFor="password">密码</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="请输入密码"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="pl-10 pr-10"
                    required
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
            ) : (
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
            )}
            
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? '登录中...' : '登录'}
            </Button>
          </form>
          
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              还没有账户？{' '}
              <Link href="/register" className="text-blue-600 hover:underline font-medium">
                立即注册
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
