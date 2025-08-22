// /src/services/baiduFaceService.ts

/**
 * 百度AI人脸识别服务模块
 * 提供人脸检测、比对、注册、搜索等功能
 */

import { envConfig } from '../utils/envConfig';
import {
  ErrorType,
  ErrorSeverity,
  AppError,
  withRetry,
  createError,
  RetryConfig
} from '../utils/errorHandler';

/**
 * 百度人脸识别API响应基础接口
 */
export interface BaiduApiResponse {
  error_code?: number;
  error_msg?: string;
  log_id: number;
  timestamp: number;
  cached: number;
  result?: Record<string, unknown>;
}

/**
 * 人脸检测结果接口
 */
export interface FaceDetectionResult {
  face_num: number;
  face_list: Array<{
    face_token: string;
    location: {
      left: number;
      top: number;
      width: number;
      height: number;
      rotation: number;
    };
    face_probability: number;
    angle: {
      yaw: number;
      pitch: number;
      roll: number;
    };
    age: number;
    beauty: number;
    expression: {
      type: string;
      probability: number;
    };
    face_shape: {
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
    landmark: Array<{
      x: number;
      y: number;
    }>;
    landmark72: Array<{
      x: number;
      y: number;
    }>;
    landmark150: Array<{
      x: number;
      y: number;
    }>;
    quality: {
      occlusion: {
        left_eye: number;
        right_eye: number;
        nose: number;
        mouth: number;
        left_cheek: number;
        right_cheek: number;
        chin_contour: number;
      };
      blur: number;
      illumination: number;
      completeness: number;
    };
  }>;
}

/**
 * 人脸比对结果接口
 */
export interface FaceMatchResult {
  score: number;
  face_list: Array<{
    face_token: string;
  }>;
}

/**
 * 人脸搜索结果接口
 */
export interface FaceSearchResult {
  face_token: string;
  user_list: Array<{
    group_id: string;
    user_id: string;
    user_info: string;
    score: number;
  }>;
}

/**
 * 活体检测结果接口
 */
export interface LivenessResult {
  face_liveness: number;
  thresholds: {
    frr_1e4: number;
    frr_1e3: number;
    frr_1e2: number;
  };
}

/**
 * 百度人脸识别服务错误类（保持向后兼容）
 * @deprecated 请使用 AppError 和 ErrorType.FACE_RECOGNITION_ERROR
 */
export class BaiduFaceServiceError extends AppError {
  constructor(
    message: string,
    code?: string,
    statusCode?: number,
    originalError?: Error | unknown
  ) {
    super(ErrorType.FACE_RECOGNITION_ERROR, message, {
      code,
      statusCode: statusCode || 500,
      severity: ErrorSeverity.HIGH,
      originalError,
      retryable: true
    });
    this.name = 'BaiduFaceServiceError';
  }
}

/**
 * 百度AI人脸识别服务类
 */
class BaiduFaceService {
  private apiKey: string;
  private secretKey: string;
  private accessToken: string | null = null;
  private tokenExpireTime: number = 0;
  private readonly baseUrl = 'https://aip.baidubce.com';
  private readonly authUrl = 'https://aip.baidubce.com/oauth/2.0/token';

  constructor() {
    const config = envConfig.getBaiduAI();
    this.apiKey = config.apiKey;
    this.secretKey = config.secretKey;

    if (!this.apiKey || !this.secretKey) {
      throw createError(
        ErrorType.FACE_RECOGNITION_ERROR,
        '百度AI配置不完整，缺少API Key或Secret Key',
        {
          code: 'MISSING_CREDENTIALS',
          statusCode: 401,
          severity: ErrorSeverity.HIGH
        }
      );
    }
  }

  /**
   * 获取访问令牌
   * @private
   * @returns Promise<string> 访问令牌
   */
  private async getAccessToken(): Promise<string> {
    // 检查token是否过期
    if (this.accessToken && Date.now() < this.tokenExpireTime) {
      return this.accessToken;
    }

    try {
      const response = await withRetry(async () => {
        return await fetch(this.authUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: new URLSearchParams({
            grant_type: 'client_credentials',
            client_id: this.apiKey,
            client_secret: this.secretKey
          })
        });
      }, this.getRetryConfig());

      if (!response.ok) {
        throw createError(
          ErrorType.FACE_RECOGNITION_ERROR,
          `获取访问令牌失败: ${response.status} ${response.statusText}`,
          {
            code: 'TOKEN_REQUEST_FAILED',
            statusCode: response.status,
            severity: ErrorSeverity.HIGH
          }
        );
      }

      const data = await response.json();
      
      if (data.error) {
        throw createError(
          ErrorType.FACE_RECOGNITION_ERROR,
          `百度AI认证失败: ${data.error_description || data.error}`,
          {
            code: data.error,
            statusCode: 401,
            severity: ErrorSeverity.HIGH
          }
        );
      }

      this.accessToken = data.access_token;
      // 提前5分钟过期，确保token有效性
      this.tokenExpireTime = Date.now() + (data.expires_in - 300) * 1000;
      
      return this.accessToken;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw createError(
        ErrorType.FACE_RECOGNITION_ERROR,
        `获取百度AI访问令牌时发生错误: ${error instanceof Error ? error.message : String(error)}`,
        {
          code: 'TOKEN_FETCH_ERROR',
          statusCode: 500,
          severity: ErrorSeverity.HIGH,
          originalError: error instanceof Error ? error : undefined
        }
      );
    }
  }

  /**
   * 获取人脸识别服务重试配置
   * @returns 重试配置
   */
  private getRetryConfig(): RetryConfig {
    return {
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      backoffMultiplier: 2,
      jitter: true,
      retryableErrors: [
        ErrorType.NETWORK_ERROR,
        ErrorType.TIMEOUT_ERROR,
        ErrorType.RATE_LIMIT_ERROR,
        ErrorType.SERVICE_UNAVAILABLE,
        ErrorType.FACE_RECOGNITION_ERROR
      ]
    };
  }

  /**
   * 发送API请求
   * @private
   * @param endpoint API端点
   * @param data 请求数据
   * @returns Promise<BaiduFaceApiResponse> API响应
   */
  private async makeApiRequest(
    endpoint: string,
    data: Record<string, unknown>
  ): Promise<BaiduFaceApiResponse> {
    try {
      const accessToken = await this.getAccessToken();
      const url = `${this.baseUrl}${endpoint}?access_token=${accessToken}`;

      const response = await withRetry(async () => {
        return await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(data)
        });
      }, this.getRetryConfig());

      if (!response.ok) {
        throw createError(
          ErrorType.FACE_RECOGNITION_ERROR,
          `API请求失败: ${response.status} ${response.statusText}`,
          {
            code: 'API_REQUEST_FAILED',
            statusCode: response.status,
            severity: ErrorSeverity.HIGH
          }
        );
      }

      const result = await response.json();
      
      // 检查API错误
      if (result.error_code && result.error_code !== 0) {
        throw createError(
          ErrorType.FACE_RECOGNITION_ERROR,
          `百度AI API错误: ${result.error_msg || '未知错误'}`,
          {
            code: `BAIDU_API_ERROR_${result.error_code}`,
            statusCode: 400,
            severity: ErrorSeverity.HIGH
          }
        );
      }

      return result;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw createError(
        ErrorType.FACE_RECOGNITION_ERROR,
        `发送API请求时发生错误: ${error instanceof Error ? error.message : String(error)}`,
        {
          code: 'API_REQUEST_ERROR',
          statusCode: 500,
          severity: ErrorSeverity.HIGH,
          originalError: error instanceof Error ? error : undefined
        }
      );
    }
  }

  /**
   * 人脸检测
   * @param imageBase64 图像的base64编码（不包含data:image前缀）
   * @param options 检测选项
   * @returns Promise<FaceDetectionResult> 检测结果
   */
  async detectFace(
    imageBase64: string,
    options: {
      faceField?: string;
      maxFaceNum?: number;
    } = {}
  ): Promise<FaceDetectionResult> {
    try {
      const requestData = {
        image: imageBase64,
        image_type: 'BASE64',
        face_field: options.faceField || 'age,beauty,expression,face_shape,gender,glasses,landmark,race,quality,face_type',
        max_face_num: options.maxFaceNum || 1
      };

      const response = await this.makeApiRequest('/rest/2.0/face/v3/detect', requestData);

      if (!response.result || !response.result.face_list || response.result.face_list.length === 0) {
        return {
          success: false,
          message: '未检测到人脸',
          faceCount: 0
        };
      }

      const face = response.result.face_list[0];
      
      return {
        success: true,
        message: '人脸检测成功',
        faceToken: face.face_token,
        faceCount: response.result.face_num || 0,
        quality: face.quality ? {
          blur: face.quality.blur,
          illumination: face.quality.illumination,
          completeness: face.quality.completeness,
          occlusion: {
            left_eye: face.quality.occlusion.left_eye,
            right_eye: face.quality.occlusion.right_eye,
            nose: face.quality.occlusion.nose,
            mouth: face.quality.occlusion.mouth
          }
        } : undefined
      };
    } catch (error) {
      if (error instanceof AppError) {
        return {
          success: false,
          message: error.message
        };
      }
      return {
        success: false,
        message: '人脸检测失败，请稍后重试'
      };
    }
  }

  /**
   * 人脸比对
   * @param imageBase64_1 第一张图像的base64编码
   * @param imageBase64_2 第二张图像的base64编码
   * @returns Promise<FaceCompareResult> 比对结果
   */
  async compareFaces(
    imageBase64_1: string,
    imageBase64_2: string
  ): Promise<FaceCompareResult> {
    try {
      const requestData = [
        {
          image: imageBase64_1,
          image_type: 'BASE64',
          face_type: 'LIVE',
          quality_control: 'LOW'
        },
        {
          image: imageBase64_2,
          image_type: 'BASE64',
          face_type: 'LIVE',
          quality_control: 'LOW'
        }
      ];

      const response = await this.makeApiRequest('/rest/2.0/face/v3/match', requestData);

      if (!response.result || response.result.score === undefined) {
        return {
          success: false,
          message: '人脸比对失败'
        };
      }

      const score = response.result.score;
      const threshold = 80; // 相似度阈值
      const isMatch = score >= threshold;

      return {
        success: true,
        message: isMatch ? '人脸匹配成功' : '人脸不匹配',
        score,
        isMatch
      };
    } catch (error) {
      if (error instanceof AppError) {
        return {
          success: false,
          message: error.message
        };
      }
      return {
        success: false,
        message: '人脸比对失败，请稍后重试'
      };
    }
  }

  /**
   * 人脸注册到人脸库
   * @param imageBase64 图像的base64编码
   * @param userId 用户ID
   * @param groupId 用户组ID
   * @param userInfo 用户信息
   * @returns Promise<FaceRegisterResult> 注册结果
   */
  async registerFace(
    imageBase64: string,
    userId: string,
    groupId: string = 'skillup_users',
    userInfo?: string
  ): Promise<FaceRegisterResult> {
    try {
      const requestData = {
        image: imageBase64,
        image_type: 'BASE64',
        group_id: groupId,
        user_id: userId,
        user_info: userInfo || '',
        quality_control: 'LOW',
        liveness_control: 'NONE'
      };

      const response = await this.makeApiRequest('/rest/2.0/face/v3/faceset/user/add', requestData);

      return {
        success: true,
        message: '人脸注册成功',
        faceToken: response.result?.face_token
      };
    } catch (error) {
      if (error instanceof AppError) {
        return {
          success: false,
          message: error.message
        };
      }
      return {
        success: false,
        message: '人脸注册失败，请稍后重试'
      };
    }
  }

  /**
   * 人脸搜索
   * @param imageBase64 图像的base64编码
   * @param groupIdList 用户组ID列表
   * @returns Promise<FaceSearchResult> 搜索结果
   */
  async searchFace(
    imageBase64: string,
    groupIdList: string[] = ['skillup_users']
  ): Promise<FaceSearchResult> {
    try {
      const requestData = {
        image: imageBase64,
        image_type: 'BASE64',
        group_id_list: groupIdList.join(','),
        quality_control: 'LOW',
        liveness_control: 'NONE',
        user_top_num: 1,
        max_user_num: 1
      };

      const response = await this.makeApiRequest('/rest/2.0/face/v3/search', requestData);

      if (!response.result || !response.result.user_list || response.result.user_list.length === 0) {
        return {
          success: false,
          message: '未找到匹配的人脸'
        };
      }

      const userList = response.result.user_list.map(user => ({
        userId: user.user_id,
        score: user.score,
        groupId: user.group_id
      }));

      return {
        success: true,
        message: '人脸搜索成功',
        userList
      };
    } catch (error) {
      if (error instanceof AppError) {
        return {
          success: false,
          message: error.message
        };
      }
      return {
        success: false,
        message: '人脸搜索失败，请稍后重试'
      };
    }
  }

  /**
   * 活体检测
   * @param imageBase64 图像的base64编码
   * @returns Promise<{ success: boolean; message: string; isLive?: boolean; score?: number }> 活体检测结果
   */
  async livenessDetection(
    imageBase64: string
  ): Promise<{ success: boolean; message: string; isLive?: boolean; score?: number }> {
    try {
      const requestData = {
        image: imageBase64,
        image_type: 'BASE64'
      };

      const response = await this.makeApiRequest('/rest/2.0/face/v1/faceliveness', requestData);

      if (!response.result) {
        return {
          success: false,
          message: '活体检测失败'
        };
      }

      // 百度AI活体检测返回的是一个分数，通常大于0.5认为是活体
      const score = response.result.score || 0;
      const threshold = 0.5;
      const isLive = score >= threshold;

      return {
        success: true,
        message: isLive ? '活体检测通过' : '活体检测未通过',
        isLive,
        score
      };
    } catch (error) {
      if (error instanceof AppError) {
        return {
          success: false,
          message: error.message
        };
      }
      return {
        success: false,
        message: '活体检测失败，请稍后重试'
      };
    }
  }

  /**
   * 检查服务是否可用
   * @returns Promise<boolean> 服务是否可用
   */
  async isServiceAvailable(): Promise<boolean> {
    try {
      await this.getAccessToken();
      return true;
    } catch (error) {
      console.error('百度AI人脸识别服务不可用:', error);
      return false;
    }
  }
}

// 创建单例实例
const baiduFaceService = new BaiduFaceService();

// 导出服务实例和类型
export { baiduFaceService, BaiduFaceService };
export type {
  FaceDetectionResult,
  FaceCompareResult,
  FaceSearchResult,
  FaceRegisterResult,
  BaiduFaceApiResponse
};