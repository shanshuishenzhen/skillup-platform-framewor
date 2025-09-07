"use client";

import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Camera, Lock, LogIn, Mail, X } from "lucide-react";
import Link from "next/link";
import { useState, useRef, useEffect, FormEvent } from "react";

export default function LoginPage() {
  // State for form fields
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  // State for UI management
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs for camera capture
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // --- Camera Logic ---
  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("Error accessing camera: ", err);
      setError("无法访问摄像头。请检查您的权限设置。");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  useEffect(() => {
    if (isModalOpen) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isModalOpen]);

  // --- Handlers ---
  const handleFaceLoginClick = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleCaptureAndLogin = async () => {
    if (videoRef.current && canvasRef.current) {
      setIsLoading(true);
      setError(null);
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      context?.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);

      const image_data_url = canvas.toDataURL('image/png');

      try {
        const response = await fetch('/api/auth/face-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: image_data_url }),
        });

        const result = await response.json();

        if (response.ok && result.success) {
          alert('人脸识别成功! 即将跳转到首页。');
          window.location.href = '/';
        } else {
          setError(result.message || '人脸识别失败。');
        }
      } catch (err) {
        setError('登录请求失败，请稍后重试。');
      } finally {
        setIsLoading(false);
        handleCloseModal();
      }
    }
  };

  const handlePasswordLogin = async (event: FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password }),
      });

      const result = await response.json();

      if (response.ok) {
        if (result.needsFaceScan) {
          // User needs to perform a face scan, open the modal
          setIsModalOpen(true);
        } else {
          // Login successful, redirect to homepage
          window.location.href = '/';
        }
      } else {
        setError(result.message || '登录失败，请检查您的手机号和密码。');
      }
    } catch (err) {
      setError('登录请求失败，请检查您的网络连接。');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="flex justify-center items-center py-12">
        <Card className="w-full max-w-md mx-auto">
          <CardHeader className="text-center">
            <CardTitle>登录您的 SkillUp 账户</CardTitle>
            <CardDescription>使用您的手机号和密码登录</CardDescription>
          </CardHeader>
          <CardContent>
            {error && <div className="mb-4 text-center text-red-500 bg-red-100 p-3 rounded-md">{error}</div>}
            <form className="space-y-4" onSubmit={handlePasswordLogin}>
              <div className="space-y-2">
                <label htmlFor="phone" className="text-sm font-medium">手机号</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="请输入您的手机号"
                    required
                    className="pl-10"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium">密码</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="请输入您的密码"
                    required
                    className="pl-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>
              <Button type="submit" className="w-full !mt-6 flex items-center justify-center" disabled={isLoading}>
                {isLoading ? '登录中...' : <>
                  <LogIn className="mr-2 h-5 w-5" />
                  登录
                </>}
              </Button>
            </form>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  或者
                </span>
              </div>
            </div>

            <Button variant="outline" className="w-full flex items-center justify-center" onClick={handleFaceLoginClick} disabled={isLoading}>
              <Camera className="mr-2 h-5 w-5" />
              人脸识别登录
            </Button>

            <div className="mt-4 text-center text-sm">
              还没有账户?{" "}
              <Link href="/register" className="underline text-primary hover:text-primary/80">
                立即注册
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
          <div className="bg-background rounded-lg shadow-xl p-6 w-full max-w-md relative">
            <Button variant="ghost" size="icon" className="absolute top-2 right-2" onClick={handleCloseModal}>
              <X className="h-5 w-5" />
            </Button>
            <h3 className="text-lg font-semibold text-center mb-4">人脸识别</h3>
            <div className="aspect-video bg-gray-200 rounded-md overflow-hidden">
              <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline />
              <canvas ref={canvasRef} className="hidden" />
            </div>
            <Button className="w-full mt-4" onClick={handleCaptureAndLogin} disabled={isLoading}>
              {isLoading ? '正在验证...' : '捕获并登录'}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
