/**
 * 人脸认证服务
 * 提供人脸注册、验证、状态查询等功能的前端API调用
 */

export interface FaceAuthResponse {
  success: boolean;
  message: string;
  data?: Record<string, unknown>;
  confidence?: number;
  accessToken?: string;
}

export interface FaceAuthStatus {
  hasProfile: boolean;
  isActive: boolean;
  lastVerifiedAt?: string;
  createdAt?: string;
  verificationCount: number;
  successCount: number;
  failureCount: number;
}

/**
 * 人脸注册
 * @param faceImage 人脸图像（base64格式）
 * @param authType 认证类型
 * @returns 注册结果
 */
export async function registerFace(
  faceImage: string,
  authType: 'register' | 'update' = 'register'
): Promise<FaceAuthResponse> {
  try {
    const response = await fetch('/api/face-auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        faceImage,
        authType
      })
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || '人脸注册失败');
    }

    return result;
  } catch (error) {
    console.error('人脸注册失败:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : '人脸注册失败，请稍后重试'
    };
  }
}

/**
 * 人脸验证
 * @param faceImage 人脸图像（base64格式）
 * @param authType 认证类型
 * @returns 验证结果
 */
export async function verifyFace(
  faceImage: string,
  authType: 'login' | 'verification' | 'exam' = 'verification'
): Promise<FaceAuthResponse> {
  try {
    const response = await fetch('/api/face-auth/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        faceImage,
        authType
      })
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || '人脸验证失败');
    }

    return result;
  } catch (error) {
    console.error('人脸验证失败:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : '人脸验证失败，请稍后重试'
    };
  }
}

/**
 * 获取人脸认证状态
 * @returns 认证状态信息
 */
export async function getFaceAuthStatus(): Promise<{
  success: boolean;
  data?: FaceAuthStatus;
  message?: string;
}> {
  try {
    const response = await fetch('/api/face-auth/status', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || '获取认证状态失败');
    }

    return result;
  } catch (error) {
    console.error('获取人脸认证状态失败:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : '获取认证状态失败，请稍后重试'
    };
  }
}

/**
 * 更新人脸档案状态
 * @param action 操作类型
 * @returns 更新结果
 */
export async function updateFaceProfileStatus(
  action: 'activate' | 'deactivate' | 'delete'
): Promise<FaceAuthResponse> {
  try {
    const response = await fetch('/api/face-auth/status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ action })
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || '更新档案状态失败');
    }

    return result;
  } catch (error) {
    console.error('更新人脸档案状态失败:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : '更新档案状态失败，请稍后重试'
    };
  }
}

/**
 * 将图片文件转换为base64格式
 * @param file 图片文件
 * @returns base64字符串
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // 移除data:image/...;base64,前缀
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * 将canvas转换为base64格式
 * @param canvas Canvas元素
 * @param quality 图片质量（0-1）
 * @returns base64字符串
 */
export function canvasToBase64(canvas: HTMLCanvasElement, quality: number = 0.8): string {
  const dataURL = canvas.toDataURL('image/jpeg', quality);
  // 移除data:image/...;base64,前缀
  return dataURL.split(',')[1];
}

/**
 * 压缩图片
 * @param file 原始图片文件
 * @param maxWidth 最大宽度
 * @param maxHeight 最大高度
 * @param quality 压缩质量（0-1）
 * @returns 压缩后的base64字符串
 */
export function compressImage(
  file: File,
  maxWidth: number = 800,
  maxHeight: number = 600,
  quality: number = 0.8
): Promise<string> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      // 计算压缩后的尺寸
      let { width, height } = img;
      
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      
      if (height > maxHeight) {
        width = (width * maxHeight) / height;
        height = maxHeight;
      }

      canvas.width = width;
      canvas.height = height;

      // 绘制压缩后的图片
      ctx?.drawImage(img, 0, 0, width, height);
      
      // 转换为base64
      const base64 = canvasToBase64(canvas, quality);
      resolve(base64);
    };

    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}