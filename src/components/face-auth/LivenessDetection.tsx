/**
 * 活体检测组件
 * 实现简单的活体检测功能，包括眨眼检测和头部转动检测
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Eye, RotateCw, CheckCircle, Clock } from 'lucide-react';

// 检测动作类型
type DetectionAction = 'blink' | 'turn_left' | 'turn_right' | 'nod';

// 检测步骤接口
interface DetectionStep {
  action: DetectionAction;
  instruction: string;
  icon: React.ReactNode;
  completed: boolean;
}

// 组件属性接口
interface LivenessDetectionProps {
  /** 检测完成回调 */
  onComplete: (result: boolean) => void;
  /** 错误回调 */
  onError: (error: string) => void;
  /** 检测超时时间（秒） */
  timeout?: number;
  /** 是否启用严格模式 */
  strictMode?: boolean;
}

/**
 * 活体检测组件
 */
const LivenessDetection: React.FC<LivenessDetectionProps> = ({
  onComplete,
  onError,
  timeout = 30,
  strictMode = false
}) => {
  // 引用
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 状态管理
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(timeout);
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectionSteps, setDetectionSteps] = useState<DetectionStep[]>([
    {
      action: 'blink',
      instruction: '请眨眼2次',
      icon: <Eye className="w-6 h-6" />,
      completed: false
    },
    {
      action: 'turn_left',
      instruction: '请缓慢向左转头',
      icon: <RotateCw className="w-6 h-6 transform -scale-x-100" />,
      completed: false
    },
    {
      action: 'turn_right',
      instruction: '请缓慢向右转头',
      icon: <RotateCw className="w-6 h-6" />,
      completed: false
    }
  ]);
  const [blinkCount, setBlinkCount] = useState(0);
  const [lastFrameData, setLastFrameData] = useState<ImageData | null>(null);
  const [detectionHistory, setDetectionHistory] = useState<number[]>([]);

  /**
   * 初始化摄像头
   */
  const initializeCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        },
        audio: false
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setIsInitialized(true);
          startDetection();
        };
      }
    } catch (error) {
      console.error('摄像头初始化失败:', error);
      onError('无法访问摄像头，请检查权限设置');
    }
  }, [onError]);

  /**
   * 开始活体检测
   */
  const startDetection = useCallback(() => {
    setIsDetecting(true);
    
    // 设置超时定时器
    timeoutRef.current = setTimeout(() => {
      onError('活体检测超时，请重新尝试');
    }, timeout * 1000);

    // 开始倒计时
    const countdownInterval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // 开始检测循环
    detectionIntervalRef.current = setInterval(() => {
      performDetection();
    }, 200); // 每200ms检测一次
  }, [timeout, onError]);

  /**
   * 执行检测
   */
  const performDetection = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !isInitialized) {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) {
      return;
    }

    // 设置画布尺寸
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // 绘制当前帧
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const currentFrameData = context.getImageData(0, 0, canvas.width, canvas.height);

    // 执行当前步骤的检测
    const currentStep = detectionSteps[currentStepIndex];
    if (currentStep && !currentStep.completed) {
      switch (currentStep.action) {
        case 'blink':
          detectBlink(currentFrameData);
          break;
        case 'turn_left':
        case 'turn_right':
          detectHeadTurn(currentFrameData, currentStep.action);
          break;
        case 'nod':
          detectNod(currentFrameData);
          break;
      }
    }

    setLastFrameData(currentFrameData);
  }, [isInitialized, detectionSteps, currentStepIndex]);

  /**
   * 检测眨眼
   */
  const detectBlink = useCallback((currentFrame: ImageData) => {
    if (!lastFrameData) {
      return;
    }

    // 简单的眨眼检测：比较眼部区域的像素变化
    const eyeRegionDiff = calculateRegionDifference(
      lastFrameData,
      currentFrame,
      0.3, 0.3, 0.4, 0.2 // 眼部区域（相对坐标）
    );

    // 记录检测历史
    setDetectionHistory(prev => {
      const newHistory = [...prev, eyeRegionDiff].slice(-10); // 保留最近10次检测
      
      // 检测眨眼模式：先增大后减小的变化
      if (newHistory.length >= 5) {
        const recent = newHistory.slice(-5);
        const hasBlinkPattern = recent[0] < 0.1 && 
                               recent[1] > 0.2 && 
                               recent[2] > 0.2 && 
                               recent[3] < 0.1 && 
                               recent[4] < 0.1;
        
        if (hasBlinkPattern) {
          setBlinkCount(prev => {
            const newCount = prev + 1;
            if (newCount >= 2) {
              completeCurrentStep();
            }
            return newCount;
          });
        }
      }
      
      return newHistory;
    });
  }, [lastFrameData]);

  /**
   * 检测头部转动
   */
  const detectHeadTurn = useCallback((currentFrame: ImageData, direction: 'turn_left' | 'turn_right') => {
    if (!lastFrameData) {
      return;
    }

    // 检测左右两侧的像素变化
    const leftSideDiff = calculateRegionDifference(
      lastFrameData,
      currentFrame,
      0.1, 0.2, 0.3, 0.6
    );
    
    const rightSideDiff = calculateRegionDifference(
      lastFrameData,
      currentFrame,
      0.6, 0.2, 0.3, 0.6
    );

    // 根据方向判断转头
    const isValidTurn = direction === 'turn_left' 
      ? leftSideDiff > 0.15 && rightSideDiff < 0.1
      : rightSideDiff > 0.15 && leftSideDiff < 0.1;

    if (isValidTurn) {
      // 延迟完成，确保动作持续一定时间
      setTimeout(() => {
        completeCurrentStep();
      }, 1000);
    }
  }, [lastFrameData]);

  /**
   * 检测点头
   */
  const detectNod = useCallback((currentFrame: ImageData) => {
    if (!lastFrameData) {
      return;
    }

    // 检测上下区域的变化
    const topDiff = calculateRegionDifference(
      lastFrameData,
      currentFrame,
      0.2, 0.1, 0.6, 0.3
    );
    
    const bottomDiff = calculateRegionDifference(
      lastFrameData,
      currentFrame,
      0.2, 0.6, 0.6, 0.3
    );

    if (topDiff > 0.1 || bottomDiff > 0.1) {
      setTimeout(() => {
        completeCurrentStep();
      }, 1000);
    }
  }, [lastFrameData]);

  /**
   * 计算区域像素差异
   */
  const calculateRegionDifference = useCallback((
    frame1: ImageData,
    frame2: ImageData,
    x: number,
    y: number,
    width: number,
    height: number
  ): number => {
    const { width: frameWidth, height: frameHeight } = frame1;
    const startX = Math.floor(x * frameWidth);
    const startY = Math.floor(y * frameHeight);
    const endX = Math.floor((x + width) * frameWidth);
    const endY = Math.floor((y + height) * frameHeight);

    let totalDiff = 0;
    let pixelCount = 0;

    for (let py = startY; py < endY; py++) {
      for (let px = startX; px < endX; px++) {
        const index = (py * frameWidth + px) * 4;
        
        const r1 = frame1.data[index];
        const g1 = frame1.data[index + 1];
        const b1 = frame1.data[index + 2];
        
        const r2 = frame2.data[index];
        const g2 = frame2.data[index + 1];
        const b2 = frame2.data[index + 2];
        
        const diff = Math.abs(r1 - r2) + Math.abs(g1 - g2) + Math.abs(b1 - b2);
        totalDiff += diff;
        pixelCount++;
      }
    }

    return pixelCount > 0 ? (totalDiff / pixelCount) / (255 * 3) : 0;
  }, []);

  /**
   * 完成当前步骤
   */
  const completeCurrentStep = useCallback(() => {
    setDetectionSteps(prev => {
      const newSteps = [...prev];
      if (newSteps[currentStepIndex]) {
        newSteps[currentStepIndex].completed = true;
      }
      return newSteps;
    });

    // 移动到下一步骤
    setTimeout(() => {
      if (currentStepIndex < detectionSteps.length - 1) {
        setCurrentStepIndex(prev => prev + 1);
        setBlinkCount(0); // 重置眨眼计数
        setDetectionHistory([]); // 重置检测历史
      } else {
        // 所有步骤完成
        completeDetection(true);
      }
    }, 500);
  }, [currentStepIndex, detectionSteps.length]);

  /**
   * 完成检测
   */
  const completeDetection = useCallback((success: boolean) => {
    setIsDetecting(false);
    
    // 清理定时器
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // 清理摄像头
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    
    onComplete(success);
  }, [onComplete]);

  // 组件挂载时初始化
  useEffect(() => {
    initializeCamera();
    
    return () => {
      // 清理资源
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [initializeCamera]);

  const currentStep = detectionSteps[currentStepIndex];
  const completedSteps = detectionSteps.filter(step => step.completed).length;
  const progress = (completedSteps / detectionSteps.length) * 100;

  return (
    <div className="space-y-6">
      {/* 进度指示器 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">活体检测进度</span>
          <span className="text-gray-600">{completedSteps}/{detectionSteps.length}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>

      {/* 摄像头预览 */}
      <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-video">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          autoPlay
          muted
          playsInline
        />
        
        {/* 检测指示框 */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-48 h-48 border-2 border-blue-400 rounded-full opacity-70 animate-pulse"></div>
        </div>
        
        {/* 倒计时 */}
        <div className="absolute top-4 right-4 bg-black bg-opacity-50 text-white px-3 py-1 rounded-lg flex items-center space-x-2">
          <Clock className="w-4 h-4" />
          <span>{timeRemaining}s</span>
        </div>
      </div>
      
      {/* 隐藏的Canvas */}
      <canvas ref={canvasRef} className="hidden" />

      {/* 当前步骤指示 */}
      {currentStep && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${
              currentStep.completed 
                ? 'bg-green-100 text-green-600' 
                : 'bg-blue-100 text-blue-600'
            }`}>
              {currentStep.completed ? <CheckCircle className="w-6 h-6" /> : currentStep.icon}
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-gray-900">
                {currentStep.completed ? '已完成' : currentStep.instruction}
              </h3>
              {currentStep.action === 'blink' && !currentStep.completed && (
                <p className="text-sm text-gray-600 mt-1">
                  已检测到 {blinkCount}/2 次眨眼
                </p>
              )}
            </div>
            {currentStep.completed && (
              <CheckCircle className="w-6 h-6 text-green-500" />
            )}
          </div>
        </div>
      )}

      {/* 步骤列表 */}
      <div className="space-y-2">
        {detectionSteps.map((step, index) => (
          <div
            key={index}
            className={`flex items-center space-x-3 p-3 rounded-lg border ${
              step.completed
                ? 'bg-green-50 border-green-200'
                : index === currentStepIndex
                ? 'bg-blue-50 border-blue-200'
                : 'bg-gray-50 border-gray-200'
            }`}
          >
            <div className={`p-1 rounded ${
              step.completed
                ? 'bg-green-100 text-green-600'
                : index === currentStepIndex
                ? 'bg-blue-100 text-blue-600'
                : 'bg-gray-100 text-gray-400'
            }`}>
              {step.completed ? <CheckCircle className="w-4 h-4" /> : step.icon}
            </div>
            <span className={`text-sm ${
              step.completed
                ? 'text-green-800'
                : index === currentStepIndex
                ? 'text-blue-800'
                : 'text-gray-600'
            }`}>
              {step.instruction}
            </span>
          </div>
        ))}
      </div>

      {/* 提示信息 */}
      <div className="text-center text-sm text-gray-500">
        <p>请按照指示完成动作，确保面部始终在检测框内</p>
        <p className="mt-1">检测过程中请保持自然，动作不要过快</p>
      </div>

      {/* 跳过按钮（仅在非严格模式下显示） */}
      {!strictMode && (
        <div className="text-center">
          <button
            onClick={() => completeDetection(true)}
            className="text-gray-500 hover:text-gray-700 text-sm underline"
          >
            跳过活体检测
          </button>
        </div>
      )}
    </div>
  );
};

export default LivenessDetection;