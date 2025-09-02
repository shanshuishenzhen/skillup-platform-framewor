// /src/services/baiduFaceService.ts

/**
 * 百度AI人脸识别服务模块
 * 提供人脸检测、比对、注册、搜索等功能
 */

import { getEnvConfig } from '../utils/envConfig';
import {
  ErrorType,
  ErrorSeverity,
  AppError,
  withRetry,
  createError,
  RetryConfig
} from '../utils/errorHandler';
import * as crypto from 'crypto';

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
 * 百度人脸识别API响应接口（别名）
 */
export type BaiduFaceApiResponse = BaiduApiResponse;

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
 * 人脸检测响应接口
 */
export interface FaceDetectionResponse {
  success: boolean;
  message: string;
  faceToken?: string;
  faceCount?: number;
  quality?: {
    blur: number;
    illumination: number;
    completeness: number;
    occlusion: {
      left_eye: number;
      right_eye: number;
      nose: number;
      mouth: number;
    };
  };
}

/**
 * 人脸比对响应接口
 */
export interface FaceCompareResult {
  success: boolean;
  message: string;
  score?: number;
  isMatch?: boolean;
}

/**
 * 人脸注册响应接口
 */
export interface FaceRegisterResult {
  success: boolean;
  message: string;
  faceToken?: string;
}

/**
 * 人脸搜索响应接口
 */
export interface FaceSearchResult {
  success: boolean;
  message: string;
  userList?: Array<{
    userId: string;
    score: number;
    groupId: string;
  }>;
}

/**
 * 人脸特征模板接口
 */
export interface FaceTemplate {
  face_token: string;
  landmark: Array<{ x: number; y: number }>;
  landmark72: Array<{ x: number; y: number }>;
  quality: {
    blur: number;
    illumination: number;
    completeness: number;
    occlusion: Record<string, number>;
  };
  timestamp: number;
  version: string;
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
      originalError: originalError instanceof Error ? originalError : undefined,
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
    const envConfig = getEnvConfig();
    this.apiKey = envConfig.baidu.apiKey;
    this.secretKey = envConfig.baidu.secretKey;

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
      
      if (!this.accessToken) {
        throw createError(
          ErrorType.FACE_RECOGNITION_ERROR,
          '获取访问令牌失败：返回的令牌为空',
          {
            code: 'EMPTY_ACCESS_TOKEN',
            statusCode: 500,
            severity: ErrorSeverity.HIGH
          }
        );
      }
      
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
    data: Record<string, unknown> | unknown[]
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
  ): Promise<FaceDetectionResponse> {
    try {
      const requestData = {
        image: imageBase64,
        image_type: 'BASE64',
        face_field: options.faceField || 'age,beauty,expression,face_shape,gender,glasses,landmark,race,quality,face_type',
        max_face_num: options.maxFaceNum || 1
      };

      const response = await this.makeApiRequest('/rest/2.0/face/v3/detect', requestData);

      if (!response.result || !response.result.face_list || !(response.result.face_list as any[])?.length) {
        return {
          success: false,
          message: '未检测到人脸',
          faceCount: 0
        };
      }

      const face = (response.result.face_list as any[])[0];
      
      return {
        success: true,
        message: '人脸检测成功',
        faceToken: face.face_token,
        faceCount: (response.result.face_num as number) || 0,
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

      const score = response.result.score as number;
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
        faceToken: response.result?.face_token as string
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
   * 删除用户
   * @param groupId 用户组ID
   * @param userId 用户ID
   * @returns Promise<{ success: boolean; message: string }> 删除结果
   */
  async deleteUser(
    groupId: string,
    userId: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const requestData = {
        group_id: groupId,
        user_id: userId
      };

      await this.makeApiRequest('/rest/2.0/face/v3/faceset/user/delete', requestData);

      return {
        success: true,
        message: '用户删除成功'
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
        message: '用户删除失败，请稍后重试'
      };
    }
  }

  /**
   * 添加用户（registerFace 的别名）
   * @param imageBase64 图像的base64编码
   * @param userId 用户ID
   * @param groupId 用户组ID
   * @param userInfo 用户信息
   * @returns Promise<FaceRegisterResult> 注册结果
   */
  async addUser(
    imageBase64: string,
    userId: string,
    groupId: string = 'skillup_users',
    userInfo?: string
  ): Promise<FaceRegisterResult> {
    return this.registerFace(imageBase64, userId, groupId, userInfo);
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

      if (!response.result || !response.result.user_list || !(response.result.user_list as any[])?.length) {
        return {
          success: false,
          message: '未找到匹配的人脸'
        };
      }

      const userList = (response.result.user_list as any[]).map((user: any) => ({
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
      const score = (response.result.score as number) || 0;
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

  /**
   * 生成人脸特征模板
   * @param imageBase64 图片的base64编码
   * @returns Promise<string> 加密后的人脸特征模板
   */
  async generateFaceTemplate(imageBase64: string): Promise<string> {
    try {
      // 首先进行人脸检测
      const requestData = {
        image: imageBase64,
        image_type: 'BASE64',
        face_field: 'landmark,landmark72,quality,face_type',
        max_face_num: 1
      };

      const response = await this.makeApiRequest('/rest/2.0/face/v3/detect', requestData);

      if (!response.result || !response.result.face_list || !(response.result.face_list as any[])?.length) {
        throw createError(
          ErrorType.FACE_RECOGNITION_ERROR,
          '未检测到人脸',
          {
            code: 'NO_FACE_DETECTED',
            statusCode: 400,
            severity: ErrorSeverity.MEDIUM
          }
        );
      }

      if ((response.result.face_list as any[]).length > 1) {
        throw createError(
          ErrorType.FACE_RECOGNITION_ERROR,
          '检测到多张人脸，请确保图片中只有一张人脸',
          {
            code: 'MULTIPLE_FACES_DETECTED',
            statusCode: 400,
            severity: ErrorSeverity.MEDIUM
          }
        );
      }

      const face = (response.result.face_list as any[])[0];

      // 检查人脸质量
      if (face.face_probability < 0.8) {
        throw createError(
          ErrorType.FACE_RECOGNITION_ERROR,
          '人脸置信度过低，请重新拍摄',
          {
            code: 'LOW_FACE_CONFIDENCE',
            statusCode: 400,
            severity: ErrorSeverity.MEDIUM
          }
        );
      }

      // 检查人脸质量指标
      if (face.quality) {
        if (face.quality.blur > 0.7) {
          throw createError(
            ErrorType.FACE_RECOGNITION_ERROR,
            '图片模糊度过高，请重新拍摄',
            {
              code: 'IMAGE_TOO_BLURRY',
              statusCode: 400,
              severity: ErrorSeverity.MEDIUM
            }
          );
        }

        if (face.quality.illumination < 40) {
          throw createError(
            ErrorType.FACE_RECOGNITION_ERROR,
            '光线不足，请在光线充足的环境下拍摄',
            {
              code: 'INSUFFICIENT_LIGHTING',
              statusCode: 400,
              severity: ErrorSeverity.MEDIUM
            }
          );
        }

        if (face.quality.completeness < 0.8) {
          throw createError(
            ErrorType.FACE_RECOGNITION_ERROR,
            '人脸不完整，请确保整张脸都在画面中',
            {
              code: 'INCOMPLETE_FACE',
              statusCode: 400,
              severity: ErrorSeverity.MEDIUM
            }
          );
        }
      }

      // 生成人脸特征模板
      const template: FaceTemplate = {
        face_token: face.face_token,
        landmark: face.landmark || [],
        landmark72: face.landmark72 || [],
        quality: {
          blur: face.quality?.blur || 0,
          illumination: face.quality?.illumination || 0,
          completeness: face.quality?.completeness || 0,
          occlusion: face.quality?.occlusion || {}
        },
        timestamp: Date.now(),
        version: '1.0.0'
      };

      // 使用AES加密模板
      return this.encryptTemplate(JSON.stringify(template));
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw createError(
        ErrorType.FACE_RECOGNITION_ERROR,
        `生成人脸特征模板失败: ${error instanceof Error ? error.message : String(error)}`,
        {
          code: 'TEMPLATE_GENERATION_FAILED',
          statusCode: 500,
          severity: ErrorSeverity.HIGH,
          originalError: error instanceof Error ? error : undefined
        }
      );
    }
  }

  /**
   * 加密人脸模板
   * @param template 人脸模板字符串
   * @returns string 加密后的模板
   */
  private encryptTemplate(template: string): string {
    try {
      const algorithm = 'aes-256-cbc';
      const secretKey = process.env.FACE_TEMPLATE_SECRET || 'skillup-platform-face-secret-key-2024';
      const key = crypto.scryptSync(secretKey, 'salt', 32);
      const iv = crypto.randomBytes(16);

      const cipher = crypto.createCipher(algorithm, key, iv);
      let encrypted = cipher.update(template, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      // 返回 IV + 加密数据的组合
      return iv.toString('hex') + ':' + encrypted;
    } catch (error) {
      throw createError(
        ErrorType.FACE_RECOGNITION_ERROR,
        `人脸模板加密失败: ${error instanceof Error ? error.message : String(error)}`,
        {
          code: 'TEMPLATE_ENCRYPTION_FAILED',
          statusCode: 500,
          severity: ErrorSeverity.HIGH,
          originalError: error instanceof Error ? error : undefined
        }
      );
    }
  }

  /**
   * 解密人脸模板
   * @param encryptedTemplate 加密的模板
   * @returns string 解密后的模板
   */
  private decryptTemplate(encryptedTemplate: string): string {
    try {
      const algorithm = 'aes-256-cbc';
      const secretKey = process.env.FACE_TEMPLATE_SECRET || 'skillup-platform-face-secret-key-2024';
      const key = crypto.scryptSync(secretKey, 'salt', 32);

      const textParts = encryptedTemplate.split(':');
      if (textParts.length !== 2) {
        throw new Error('Invalid encrypted template format');
      }

      const iv = Buffer.from(textParts[0], 'hex');
      const encryptedText = textParts[1];

      const decipher = crypto.createDecipher(algorithm, key, iv);
      let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      throw createError(
        ErrorType.FACE_RECOGNITION_ERROR,
        `人脸模板解密失败: ${error instanceof Error ? error.message : String(error)}`,
        {
          code: 'TEMPLATE_DECRYPTION_FAILED',
          statusCode: 500,
          severity: ErrorSeverity.HIGH,
          originalError: error instanceof Error ? error : undefined
        }
      );
    }
  }

  /**
   * 验证人脸模板
   * @param currentImageBase64 当前拍摄的图片
   * @param storedTemplate 存储的人脸模板
   * @returns Promise<{ isMatch: boolean; confidence: number; message: string }> 验证结果
   */
  async verifyFaceTemplate(
    currentImageBase64: string,
    storedTemplate: string
  ): Promise<{ isMatch: boolean; confidence: number; message: string }> {
    try {
      // 解密存储的模板
      const templateData: FaceTemplate = JSON.parse(this.decryptTemplate(storedTemplate));

      // 检测当前图片中的人脸
      const currentTemplate = await this.generateFaceTemplate(currentImageBase64);
      const currentTemplateData: FaceTemplate = JSON.parse(this.decryptTemplate(currentTemplate));

      // 计算特征相似度（简化版本，实际应该使用更复杂的算法）
      const confidence = this.calculateTemplateSimilarity(templateData, currentTemplateData);

      // 设置匹配阈值
      const threshold = 0.8;
      const isMatch = confidence >= threshold;

      return {
        isMatch,
        confidence,
        message: isMatch ? '人脸验证成功' : '人脸验证失败'
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw createError(
        ErrorType.FACE_RECOGNITION_ERROR,
        `人脸模板验证失败: ${error instanceof Error ? error.message : String(error)}`,
        {
          code: 'TEMPLATE_VERIFICATION_FAILED',
          statusCode: 500,
          severity: ErrorSeverity.HIGH,
          originalError: error instanceof Error ? error : undefined
        }
      );
    }
  }

  /**
   * 计算模板相似度（简化版本）
   * @param template1 模板1
   * @param template2 模板2
   * @returns number 相似度分数 (0-1)
   */
  private calculateTemplateSimilarity(template1: FaceTemplate, template2: FaceTemplate): number {
    try {
      // 检查模板版本兼容性
      if (template1.version !== template2.version) {
        console.warn('Face template versions do not match');
      }

      // 计算关键点相似度
      const landmarkSimilarity = this.calculateLandmarkSimilarity(template1.landmark, template2.landmark);
      const landmark72Similarity = this.calculateLandmarkSimilarity(template1.landmark72, template2.landmark72);

      // 计算质量指标相似度
      const qualitySimilarity = this.calculateQualitySimilarity(template1.quality, template2.quality);

      // 加权平均
      const similarity = (landmarkSimilarity * 0.5) + (landmark72Similarity * 0.3) + (qualitySimilarity * 0.2);

      return Math.max(0, Math.min(1, similarity));
    } catch (error) {
      console.error('Error calculating template similarity:', error);
      return 0;
    }
  }

  /**
   * 计算关键点相似度
   * @param landmarks1 关键点1
   * @param landmarks2 关键点2
   * @returns number 相似度分数
   */
  private calculateLandmarkSimilarity(
    landmarks1: Array<{ x: number; y: number }>,
    landmarks2: Array<{ x: number; y: number }>
  ): number {
    if (!landmarks1 || !landmarks2 || landmarks1.length !== landmarks2.length) {
      return 0;
    }

    let totalDistance = 0;
    for (let i = 0; i < landmarks1.length; i++) {
      const dx = landmarks1[i].x - landmarks2[i].x;
      const dy = landmarks1[i].y - landmarks2[i].y;
      totalDistance += Math.sqrt(dx * dx + dy * dy);
    }

    // 归一化距离（假设图片尺寸为500x500）
    const avgDistance = totalDistance / landmarks1.length;
    const normalizedDistance = avgDistance / 500;

    // 转换为相似度分数
    return Math.max(0, 1 - normalizedDistance);
  }

  /**
   * 计算质量指标相似度
   * @param quality1 质量指标1
   * @param quality2 质量指标2
   * @returns number 相似度分数
   */
  private calculateQualitySimilarity(
    quality1: FaceTemplate['quality'],
    quality2: FaceTemplate['quality']
  ): number {
    const blurSimilarity = 1 - Math.abs(quality1.blur - quality2.blur);
    const illuminationSimilarity = 1 - Math.abs(quality1.illumination - quality2.illumination) / 100;
    const completenessSimilarity = 1 - Math.abs(quality1.completeness - quality2.completeness);

    return (blurSimilarity + illuminationSimilarity + completenessSimilarity) / 3;
  }
}

// 创建单例实例
const baiduFaceService = new BaiduFaceService();

// 导出服务实例和类型
export { baiduFaceService, BaiduFaceService };