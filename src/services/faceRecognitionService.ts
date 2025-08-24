/**
 * 人脸识别服务
 * 提供统一的人脸识别接口，封装百度AI人脸识别服务
 */

import { baiduFaceService, BaiduFaceService } from './baiduFaceService';
import { createError, AppError, ErrorType, ErrorSeverity } from '@/utils/errorHandler';
import { getEnvConfig } from '@/utils/envConfig';

/**
 * 人脸识别配置接口
 */
export interface FaceRecognitionConfig {
  confidenceThreshold: number;
  qualityThreshold: number;
  livenessThreshold: number;
  maxFaceSize: number;
  minFaceSize: number;
  enableLivenessDetection: boolean;
}

/**
 * 人脸检测结果接口
 */
export interface FaceDetectionResult {
  success: boolean;
  message: string;
  faceCount: number;
  faces?: Array<{
    faceToken: string;
    location: {
      left: number;
      top: number;
      width: number;
      height: number;
      rotation: number;
    };
    faceQuality: {
      occlusion: {
        leftEye: number;
        rightEye: number;
        nose: number;
        mouth: number;
        leftCheek: number;
        rightCheek: number;
        chin: number;
      };
      blur: number;
      illumination: number;
      completeness: number;
    };
    age: number;
    beauty: number;
    expression: {
      type: string;
      probability: number;
    };
    gender: {
      type: string;
      probability: number;
    };
    glasses: {
      type: string;
      probability: number;
    };
    race: {
      type: string;
      probability: number;
    };
    emotion: {
      type: string;
      probability: number;
    };
  }>;
  quality?: number;
  liveness?: number;
}

/**
 * 人脸比对结果接口
 */
export interface FaceComparisonResult {
  success: boolean;
  message: string;
  score: number;
  isMatch: boolean;
  threshold: number;
}

/**
 * 身份验证结果接口
 */
export interface IdentityVerificationResult {
  success: boolean;
  message: string;
  userId?: string;
  confidence: number;
  isVerified: boolean;
}

/**
 * 人脸识别服务类
 */
export class FaceRecognitionService {
  private config: FaceRecognitionConfig;
  private baiduService: BaiduFaceService;

  constructor(config?: Partial<FaceRecognitionConfig>) {
    const envConfig = getEnvConfig();
    const faceConfig = envConfig.getFaceRecognition();
    
    this.config = {
      confidenceThreshold: faceConfig.confidenceThreshold || 80,
      qualityThreshold: faceConfig.qualityThreshold || 0.7,
      livenessThreshold: faceConfig.livenessThreshold || 0.5,
      maxFaceSize: 1024,
      minFaceSize: 48,
      enableLivenessDetection: false,
      ...config
    };
    
    this.baiduService = baiduFaceService;
  }

  /**
   * 检测人脸
   * @param imageBase64 - 图像的base64编码（不包含data:image前缀）
   * @param options - 检测选项
   * @returns 人脸检测结果
   */
  async detectFace(
    imageBase64: string,
    options?: {
      faceField?: string;
      maxFaceNum?: number;
      faceType?: string;
    }
  ): Promise<FaceDetectionResult> {
    try {
      // 验证输入
      if (!imageBase64 || typeof imageBase64 !== 'string') {
        return {
          success: false,
          message: '无效的图像数据',
          faceCount: 0
        };
      }

      // 调用百度AI人脸检测
      const result = await this.baiduService.detectFace(imageBase64, {
        faceField: options?.faceField || 'age,beauty,expression,gender,glasses,race,quality,emotion',
        maxFaceNum: options?.maxFaceNum || 1,
        faceType: options?.faceType || 'LIVE'
      });

      if (!result.success) {
        return {
          success: false,
          message: result.message || '人脸检测失败',
          faceCount: 0
        };
      }

      // 检查人脸质量
      if (result.faces && result.faces.length > 0) {
        const face = result.faces[0];
        const quality = this.calculateFaceQuality(face);
        
        if (quality < this.config.qualityThreshold) {
          return {
            success: false,
            message: `人脸质量不符合要求，当前质量: ${(quality * 100).toFixed(1)}%，要求: ${(this.config.qualityThreshold * 100).toFixed(1)}%`,
            faceCount: result.faces.length,
            quality
          };
        }

        return {
          success: true,
          message: '人脸检测成功',
          faceCount: result.faces.length,
          faces: result.faces,
          quality
        };
      }

      return {
        success: false,
        message: '未检测到人脸',
        faceCount: 0
      };

    } catch (error) {
      console.error('人脸检测错误:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : '人脸检测服务异常',
        faceCount: 0
      };
    }
  }

  /**
   * 比对两张人脸
   * @param imageBase64_1 - 第一张图像的base64编码
   * @param imageBase64_2 - 第二张图像的base64编码
   * @returns 人脸比对结果
   */
  async compareFaces(
    imageBase64_1: string,
    imageBase64_2: string
  ): Promise<FaceComparisonResult> {
    try {
      // 验证输入
      if (!imageBase64_1 || !imageBase64_2) {
        return {
          success: false,
          message: '缺少比对图像',
          score: 0,
          isMatch: false,
          threshold: this.config.confidenceThreshold
        };
      }

      // 调用百度AI人脸比对
      const result = await this.baiduService.compareFaces([
        { image: imageBase64_1, imageType: 'BASE64' },
        { image: imageBase64_2, imageType: 'BASE64' }
      ]);

      if (!result.success) {
        return {
          success: false,
          message: result.message || '人脸比对失败',
          score: 0,
          isMatch: false,
          threshold: this.config.confidenceThreshold
        };
      }

      const score = result.score || 0;
      const isMatch = score >= this.config.confidenceThreshold;

      return {
        success: true,
        message: isMatch ? '人脸匹配成功' : '人脸不匹配',
        score,
        isMatch,
        threshold: this.config.confidenceThreshold
      };

    } catch (error) {
      console.error('人脸比对错误:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : '人脸比对服务异常',
        score: 0,
        isMatch: false,
        threshold: this.config.confidenceThreshold
      };
    }
  }

  /**
   * 身份验证
   * @param userId - 用户ID
   * @param imageBase64 - 图像的base64编码
   * @returns 身份验证结果
   */
  async verifyIdentity(
    userId: string,
    imageBase64: string
  ): Promise<IdentityVerificationResult> {
    try {
      // 验证输入
      if (!userId || !imageBase64) {
        return {
          success: false,
          message: '缺少用户ID或图像数据',
          confidence: 0,
          isVerified: false
        };
      }

      // 先检测人脸质量
      const detection = await this.detectFace(imageBase64);
      if (!detection.success) {
        return {
          success: false,
          message: detection.message,
          confidence: 0,
          isVerified: false
        };
      }

      // 调用百度AI人脸搜索进行身份验证
      const searchResult = await this.baiduService.searchFace(
        imageBase64,
        [`group_${userId}`],
        {
          maxUserNum: 1,
          qualityControl: 'NORMAL',
          livenessControl: 'NONE'
        }
      );

      if (!searchResult.success || !searchResult.userList || searchResult.userList.length === 0) {
        return {
          success: false,
          message: '身份验证失败，未找到匹配的用户',
          confidence: 0,
          isVerified: false
        };
      }

      const user = searchResult.userList[0];
      const confidence = user.score || 0;
      const isVerified = confidence >= this.config.confidenceThreshold;

      return {
        success: true,
        message: isVerified ? '身份验证成功' : '身份验证失败，置信度不足',
        userId: user.userId,
        confidence,
        isVerified
      };

    } catch (error) {
      console.error('身份验证错误:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : '身份验证服务异常',
        confidence: 0,
        isVerified: false
      };
    }
  }

  /**
   * 注册用户人脸
   * @param userId - 用户ID
   * @param imageBase64 - 图像的base64编码
   * @param userInfo - 用户信息
   * @returns 注册结果
   */
  async registerFace(
    userId: string,
    imageBase64: string,
    userInfo?: string
  ): Promise<{ success: boolean; message: string; faceToken?: string }> {
    try {
      // 验证输入
      if (!userId || !imageBase64) {
        return {
          success: false,
          message: '缺少用户ID或图像数据'
        };
      }

      // 先检测人脸质量
      const detection = await this.detectFace(imageBase64);
      if (!detection.success) {
        return {
          success: false,
          message: detection.message
        };
      }

      // 调用百度AI人脸注册
      const result = await this.baiduService.addUser(
        imageBase64,
        `group_${userId}`,
        userId,
        {
          userInfo: userInfo || '',
          qualityControl: 'NORMAL',
          livenessControl: 'NONE'
        }
      );

      return {
        success: result.success,
        message: result.message || (result.success ? '人脸注册成功' : '人脸注册失败'),
        faceToken: result.faceToken
      };

    } catch (error) {
      console.error('人脸注册错误:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : '人脸注册服务异常'
      };
    }
  }

  /**
   * 删除用户人脸
   * @param userId - 用户ID
   * @returns 删除结果
   */
  async deleteFace(userId: string): Promise<{ success: boolean; message: string }> {
    try {
      if (!userId) {
        return {
          success: false,
          message: '缺少用户ID'
        };
      }

      const result = await this.baiduService.deleteUser(`group_${userId}`, userId);
      
      return {
        success: result.success,
        message: result.message || (result.success ? '人脸删除成功' : '人脸删除失败')
      };

    } catch (error) {
      console.error('人脸删除错误:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : '人脸删除服务异常'
      };
    }
  }

  /**
   * 检查服务是否可用
   * @returns 服务可用性
   */
  async isServiceAvailable(): Promise<boolean> {
    try {
      return await this.baiduService.isServiceAvailable();
    } catch (error) {
      console.error('检查人脸识别服务可用性失败:', error);
      return false;
    }
  }

  /**
   * 获取配置
   * @returns 当前配置
   */
  getConfig(): FaceRecognitionConfig {
    return { ...this.config };
  }

  /**
   * 更新配置
   * @param config - 新配置
   */
  updateConfig(config: Partial<FaceRecognitionConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 计算人脸质量分数
   * @private
   * @param face - 人脸数据
   * @returns 质量分数 (0-1)
   */
  private calculateFaceQuality(face: {
    faceQuality?: {
      blur?: number;
      illumination?: number;
      completeness?: number;
    };
  }): number {
    if (!face.faceQuality) {
      return 0.5; // 默认质量
    }

    const { blur, illumination, completeness } = face.faceQuality;
    
    // 模糊度：值越小越好 (0-1)
    const blurScore = Math.max(0, 1 - (blur || 0));
    
    // 光照：值越接近50越好 (0-255)
    const illuminationScore = Math.max(0, 1 - Math.abs((illumination || 128) - 128) / 128);
    
    // 完整度：值越大越好 (0-1)
    const completenessScore = completeness || 0.5;
    
    // 综合质量分数
    return (blurScore * 0.4 + illuminationScore * 0.3 + completenessScore * 0.3);
  }
}

// 创建默认实例
const faceRecognitionService = new FaceRecognitionService();

/**
 * 检测人脸（便捷函数）
 * @param imageBase64 - 图像的base64编码
 * @param options - 检测选项
 * @returns 人脸检测结果
 */
export async function detectFace(
  imageBase64: string,
  options?: {
    faceField?: string;
    maxFaceNum?: number;
    faceType?: string;
  }
): Promise<FaceDetectionResult> {
  return faceRecognitionService.detectFace(imageBase64, options);
}

/**
 * 比对两张人脸（便捷函数）
 * @param imageBase64_1 - 第一张图像的base64编码
 * @param imageBase64_2 - 第二张图像的base64编码
 * @returns 人脸比对结果
 */
export async function compareFaces(
  imageBase64_1: string,
  imageBase64_2: string
): Promise<FaceComparisonResult> {
  return faceRecognitionService.compareFaces(imageBase64_1, imageBase64_2);
}

/**
 * 身份验证（便捷函数）
 * @param userId - 用户ID
 * @param imageBase64 - 图像的base64编码
 * @returns 身份验证结果
 */
export async function verifyIdentity(
  userId: string,
  imageBase64: string
): Promise<IdentityVerificationResult> {
  return faceRecognitionService.verifyIdentity(userId, imageBase64);
}

/**
 * 注册用户人脸（便捷函数）
 * @param userId - 用户ID
 * @param imageBase64 - 图像的base64编码
 * @param userInfo - 用户信息
 * @returns 注册结果
 */
export async function registerFace(
  userId: string,
  imageBase64: string,
  userInfo?: string
): Promise<{ success: boolean; message: string; faceToken?: string }> {
  return faceRecognitionService.registerFace(userId, imageBase64, userInfo);
}

/**
 * 删除用户人脸（便捷函数）
 * @param userId - 用户ID
 * @returns 删除结果
 */
export async function deleteFace(userId: string): Promise<{ success: boolean; message: string }> {
  return faceRecognitionService.deleteFace(userId);
}

/**
 * 检查服务是否可用（便捷函数）
 * @returns 服务可用性
 */
export async function isServiceAvailable(): Promise<boolean> {
  return faceRecognitionService.isServiceAvailable();
}

// 默认导出
export default faceRecognitionService;