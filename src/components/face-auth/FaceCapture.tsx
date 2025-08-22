/**
 * 人脸采集组件
 * 使用WebRTC调用摄像头进行人脸图像采集
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import { Camera, RotateCcw, Check, AlertCircle } from 'lucide-react';
import { AuthType } from './FaceAuthModal';

// 组件属性接口
interface FaceCaptureProps {
  /** 采集完成回调 */
  onCapture: (imageData: string) => void;
  /** 错误回调 */
  onError: (error: string) => void;
  /** 认证类型 */
  authType: AuthType;
  /** 图像质量要求 */
  quality?: number;
  /** 最大重试次数 */
  maxRetries?: number;
}

// 人脸检测结果接口
interface FaceDetectionResult {
  hasFace: boolean;
  faceCount: number;
  quality: number;
  message: string;
}

/**
 * 人脸采集组件
 */
const FaceCapture: React.FC<FaceCaptureProps> = ({
  onCapture,
  onError,
  quality = 0.8,
  maxRetries = 3
}) => {
  // 引用
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // 状态管理
  const [isInitialized, setIsInitialized] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [cameraPermission, setCameraPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');
  const [faceDetectionResult, setFaceDetectionResult] = useState<FaceDetectionResult | null>(null);

  /**
   * 初始化摄像头
   */
  const initializeCamera = useCallback(async () => {
    try {
      setError(null);
      
      // 检查浏览器支持
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('您的浏览器不支持摄像头功能');
      }

      // 请求摄像头权限
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user' // 前置摄像头
        },
        audio: false
      });

      streamRef.current = stream;
      setCameraPermission('granted');

      // 设置视频流
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setIsInitialized(true);
        };
      }
    } catch (error) {
      console.error('摄像头初始化失败:', error);
      setCameraPermission('denied');
      
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          setError('摄像头权限被拒绝，请允许访问摄像头');
        } else if (error.name === 'NotFoundError') {
          setError('未找到摄像头设备');
        } else if (error.name === 'NotReadableError') {
          setError('摄像头被其他应用占用');
        } else {
          setError(error.message);
        }
      } else {
        setError('摄像头初始化失败');
      }
      
      onError('摄像头初始化失败');
    }
  }, [onError]);

  /**
   * 简单的人脸检测（基于Canvas像素分析）
   * @param imageData 图像数据
   * @returns 检测结果
   */
  const detectFace = (imageData: ImageData): FaceDetectionResult => {
    const { data, width, height } = imageData;
    
    // 简单的肤色检测算法
    let skinPixels = 0;
    let totalPixels = 0;
    const centerX = width / 2;
    const centerY = height / 2;
    const faceRegionSize = Math.min(width, height) * 0.3;
    
    // 检测中心区域的肤色像素
    for (let y = centerY - faceRegionSize / 2; y < centerY + faceRegionSize / 2; y += 2) {
      for (let x = centerX - faceRegionSize / 2; x < centerX + faceRegionSize / 2; x += 2) {
        if (x >= 0 && x < width && y >= 0 && y < height) {
          const index = (Math.floor(y) * width + Math.floor(x)) * 4;
          const r = data[index];
          const g = data[index + 1];
          const b = data[index + 2];
          
          // 简单的肤色检测
          if (r > 95 && g > 40 && b > 20 && 
              Math.max(r, g, b) - Math.min(r, g, b) > 15 &&
              Math.abs(r - g) > 15 && r > g && r > b) {
            skinPixels++;
          }
          totalPixels++;
        }
      }
    }
    
    const skinRatio = totalPixels > 0 ? skinPixels / totalPixels : 0;
    const qualityScore = Math.min(skinRatio * 2, 1); // 归一化到0-1
    
    // 判断是否检测到人脸
    const hasFace = skinRatio > 0.1; // 阈值可调整
    
    return {
      hasFace,
      faceCount: hasFace ? 1 : 0,
      quality: qualityScore,
      message: hasFace 
        ? qualityScore > 0.6 
          ? '人脸检测成功，图像质量良好'
          : '检测到人脸，但图像质量较低'
        : '未检测到人脸，请调整位置'
    };
  };

  /**
   * 捕获图像
   */
  const captureImage = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !isInitialized) {
      setError('摄像头未准备就绪');
      return;
    }

    setIsCapturing(true);
    setError(null);

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (!context) {
        throw new Error('无法获取Canvas上下文');
      }

      // 设置画布尺寸
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // 绘制视频帧到画布
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      // 获取图像数据进行人脸检测
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      const detectionResult = detectFace(imageData);
      setFaceDetectionResult(detectionResult);

      // 检查人脸检测结果
      if (!detectionResult.hasFace) {
        setError('未检测到人脸，请调整位置后重试');
        setIsCapturing(false);
        return;
      }

      if (detectionResult.quality < quality) {
        setError(`图像质量不足（${Math.round(detectionResult.quality * 100)}%），请改善光线条件`);
        setIsCapturing(false);
        return;
      }

      // 转换为Base64格式
      const imageDataUrl = canvas.toDataURL('image/jpeg', 0.9);
      setCapturedImage(imageDataUrl);
      
      // 延迟一下显示效果
      setTimeout(() => {
        setIsCapturing(false);
      }, 500);

    } catch (error) {
      console.error('图像捕获失败:', error);
      setError('图像捕获失败，请重试');
      setIsCapturing(false);
    }
  }, [isInitialized, quality]);

  /**
   * 确认使用当前图像
   */
  const confirmCapture = () => {
    if (capturedImage) {
      onCapture(capturedImage);
    }
  };

  /**
   * 重新拍摄
   */
  const retakePhoto = () => {
    setCapturedImage(null);
    setFaceDetectionResult(null);
    setError(null);
    
    if (retryCount < maxRetries) {
      setRetryCount(prev => prev + 1);
    } else {
      onError('已达到最大重试次数');
    }
  };

  /**
   * 清理资源
   */
  const cleanup = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsInitialized(false);
  }, []);

  // 组件挂载时初始化摄像头
  useEffect(() => {
    initializeCamera();
    return cleanup;
  }, [initializeCamera, cleanup]);

  // 键盘事件处理
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.code === 'Space' && isInitialized && !capturedImage && !isCapturing) {
        event.preventDefault();
        captureImage();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isInitialized, capturedImage, isCapturing, captureImage]);

  return (
    <div className="space-y-4">
      {/* 摄像头预览区域 */}
      <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-video">
        {/* 视频预览 */}
        <video
          ref={videoRef}
          className={`w-full h-full object-cover ${capturedImage ? 'hidden' : ''}`}
          autoPlay
          muted
          playsInline
        />
        
        {/* 捕获的图像预览 */}
        {capturedImage && (
          <Image
            src={capturedImage}
            alt="Captured face"
            fill
            className="object-cover"
          />
        )}
        
        {/* 人脸框指示 */}
        {isInitialized && !capturedImage && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-48 h-48 border-2 border-white border-dashed rounded-full opacity-50"></div>
          </div>
        )}
        
        {/* 加载指示器 */}
        {!isInitialized && cameraPermission === 'granted' && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
            <div className="text-center text-white">
              <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-2"></div>
              <p>正在启动摄像头...</p>
            </div>
          </div>
        )}
        
        {/* 权限被拒绝 */}
        {cameraPermission === 'denied' && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
            <div className="text-center text-white p-4">
              <AlertCircle className="w-12 h-12 mx-auto mb-3 text-red-400" />
              <h3 className="text-lg font-medium mb-2">摄像头访问被拒绝</h3>
              <p className="text-sm text-gray-300 mb-4">
                请在浏览器设置中允许访问摄像头，然后刷新页面重试
              </p>
              <button
                onClick={initializeCamera}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                重新尝试
              </button>
            </div>
          </div>
        )}
        
        {/* 拍摄中效果 */}
        {isCapturing && (
          <div className="absolute inset-0 bg-white opacity-50 animate-pulse"></div>
        )}
      </div>
      
      {/* 隐藏的Canvas用于图像处理 */}
      <canvas ref={canvasRef} className="hidden" />
      
      {/* 人脸检测结果 */}
      {faceDetectionResult && (
        <div className={`p-3 rounded-lg text-sm ${
          faceDetectionResult.hasFace 
            ? 'bg-green-50 text-green-800 border border-green-200'
            : 'bg-yellow-50 text-yellow-800 border border-yellow-200'
        }`}>
          <p>{faceDetectionResult.message}</p>
          {faceDetectionResult.hasFace && (
            <p className="mt-1">质量评分: {Math.round(faceDetectionResult.quality * 100)}%</p>
          )}
        </div>
      )}
      
      {/* 错误提示 */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start space-x-2">
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        </div>
      )}
      
      {/* 操作按钮 */}
      <div className="flex space-x-3">
        {!capturedImage ? (
          <>
            <button
              onClick={captureImage}
              disabled={!isInitialized || isCapturing}
              className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center space-x-2"
            >
              <Camera className="w-5 h-5" />
              <span>{isCapturing ? '拍摄中...' : '拍摄'}</span>
            </button>
            <div className="text-xs text-gray-500 flex items-center">
              按空格键快速拍摄
            </div>
          </>
        ) : (
          <>
            <button
              onClick={retakePhoto}
              className="flex-1 bg-gray-600 text-white py-3 px-4 rounded-lg hover:bg-gray-700 transition-colors font-medium flex items-center justify-center space-x-2"
            >
              <RotateCcw className="w-5 h-5" />
              <span>重新拍摄</span>
            </button>
            <button
              onClick={confirmCapture}
              className="flex-1 bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center justify-center space-x-2"
            >
              <Check className="w-5 h-5" />
              <span>确认使用</span>
            </button>
          </>
        )}
      </div>
      
      {/* 提示信息 */}
      <div className="text-center text-sm text-gray-500">
        <p>请将面部置于圆形框内，确保光线充足且面部清晰可见</p>
        {retryCount > 0 && (
          <p className="mt-1">重试次数: {retryCount}/{maxRetries}</p>
        )}
      </div>
    </div>
  );
};

export default FaceCapture;