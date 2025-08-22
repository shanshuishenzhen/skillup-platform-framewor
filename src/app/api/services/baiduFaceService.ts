/**
 * 百度AI人脸识别服务
 * 提供人脸检测、比对、活体检测等核心功能
 */

import crypto from 'crypto';

// 百度AI人脸识别API配置
interface BaiduFaceConfig {
  apiKey: string;
  secretKey: string;
  baseUrl: string;
}

// 人脸检测结果接口
interface FaceDetectResult {
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
  landmark: Array<{ x: number; y: number }>;
  landmark72: Array<{ x: number; y: number }>;
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
}

// 人脸比对结果接口
interface FaceMatchResult {
  score: number;
  face_list: Array<{
    face_token: string;
  }>;
}

// 活体检测结果接口
interface LivenessResult {
  face_liveness: number;
  thresholds: {
    frr_1e4: number;
    frr_1e3: number;
    frr_1e2: number;
  };
}

class BaiduFaceService {
  private config: BaiduFaceConfig;
  private accessToken: string | null = null;
  private tokenExpireTime: number = 0;

  constructor() {
    this.config = {
      apiKey: process.env.BAIDU_API_KEY || '',
      secretKey: process.env.BAIDU_SECRET_KEY || '',
      baseUrl: 'https://aip.baidubce.com'
    };

    if (!this.config.apiKey || !this.config.secretKey) {
      throw new Error('百度AI API密钥未配置，请在环境变量中设置BAIDU_API_KEY和BAIDU_SECRET_KEY');
    }
  }

  /**
   * 获取访问令牌
   * @returns Promise<string> 访问令牌
   */
  private async getAccessToken(): Promise<string> {
    // 如果token未过期，直接返回
    if (this.accessToken && Date.now() < this.tokenExpireTime) {
      return this.accessToken;
    }

    try {
      const response = await fetch(
        `${this.config.baseUrl}/oauth/2.0/token?grant_type=client_credentials&client_id=${this.config.apiKey}&client_secret=${this.config.secretKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      const data = await response.json();
      
      if (data.error) {
        throw new Error(`获取访问令牌失败: ${data.error_description}`);
      }

      this.accessToken = data.access_token;
      // 设置过期时间（提前5分钟刷新）
      this.tokenExpireTime = Date.now() + (data.expires_in - 300) * 1000;
      
      return this.accessToken;
    } catch (error) {
      throw new Error(`获取百度AI访问令牌失败: ${error}`);
    }
  }

  /**
   * 人脸检测
   * @param imageBase64 图片的base64编码
   * @param imageType 图片类型：BASE64、URL、FACE_TOKEN
   * @returns Promise<FaceDetectResult[]> 检测到的人脸信息
   */
  async detectFace(imageBase64: string, imageType: string = 'BASE64'): Promise<FaceDetectResult[]> {
    const accessToken = await this.getAccessToken();
    
    try {
      const response = await fetch(
        `${this.config.baseUrl}/rest/2.0/face/v3/detect?access_token=${accessToken}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            image: imageBase64,
            image_type: imageType,
            face_field: 'age,beauty,expression,face_shape,gender,glasses,landmark,landmark72,quality,face_type,face_probability'
          })
        }
      );

      const data = await response.json();
      
      if (data.error_code !== 0) {
        throw new Error(`人脸检测失败: ${data.error_msg}`);
      }

      return data.result.face_list;
    } catch (error) {
      throw new Error(`人脸检测请求失败: ${error}`);
    }
  }

  /**
   * 人脸比对
   * @param imageBase64_1 第一张图片的base64编码
   * @param imageBase64_2 第二张图片的base64编码
   * @param imageType 图片类型
   * @returns Promise<FaceMatchResult> 比对结果
   */
  async matchFace(imageBase64_1: string, imageBase64_2: string, imageType: string = 'BASE64'): Promise<FaceMatchResult> {
    const accessToken = await this.getAccessToken();
    
    try {
      const response = await fetch(
        `${this.config.baseUrl}/rest/2.0/face/v3/match?access_token=${accessToken}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify([
            {
              image: imageBase64_1,
              image_type: imageType,
              face_type: 'LIVE',
              quality_control: 'LOW'
            },
            {
              image: imageBase64_2,
              image_type: imageType,
              face_type: 'LIVE',
              quality_control: 'LOW'
            }
          ])
        }
      );

      const data = await response.json();
      
      if (data.error_code !== 0) {
        throw new Error(`人脸比对失败: ${data.error_msg}`);
      }

      return data.result;
    } catch (error) {
      throw new Error(`人脸比对请求失败: ${error}`);
    }
  }

  /**
   * 活体检测
   * @param imageBase64 图片的base64编码
   * @param imageType 图片类型
   * @returns Promise<LivenessResult> 活体检测结果
   */
  async livenessDetect(imageBase64: string, imageType: string = 'BASE64'): Promise<LivenessResult> {
    const accessToken = await this.getAccessToken();
    
    try {
      const response = await fetch(
        `${this.config.baseUrl}/rest/2.0/face/v1/faceverify?access_token=${accessToken}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            image: imageBase64,
            image_type: imageType
          })
        }
      );

      const data = await response.json();
      
      if (data.error_code !== 0) {
        throw new Error(`活体检测失败: ${data.error_msg}`);
      }

      return data.result;
    } catch (error) {
      throw new Error(`活体检测请求失败: ${error}`);
    }
  }

  /**
   * 生成人脸特征模板
   * @param imageBase64 图片的base64编码
   * @returns Promise<string> 加密后的人脸特征模板
   */
  async generateFaceTemplate(imageBase64: string): Promise<string> {
    const faceList = await this.detectFace(imageBase64);
    
    if (faceList.length === 0) {
      throw new Error('未检测到人脸');
    }

    if (faceList.length > 1) {
      throw new Error('检测到多张人脸，请确保图片中只有一张人脸');
    }

    const face = faceList[0];
    
    // 检查人脸质量
    if (face.face_probability < 0.8) {
      throw new Error('人脸置信度过低，请重新拍摄');
    }

    // 生成人脸特征模板（这里简化处理，实际应该提取更复杂的特征）
    const template = {
      face_token: face.face_token,
      landmark: face.landmark,
      landmark72: face.landmark72,
      quality: face.quality,
      timestamp: Date.now()
    };

    // 使用AES加密模板
    return this.encryptTemplate(JSON.stringify(template));
  }

  /**
   * 加密人脸模板
   * @param template 人脸模板字符串
   * @returns string 加密后的模板
   */
  private encryptTemplate(template: string): string {
    const algorithm = 'aes-256-cbc';
    const key = crypto.scryptSync(process.env.FACE_TEMPLATE_SECRET || 'default-secret', 'salt', 32);
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(template, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return iv.toString('hex') + ':' + encrypted;
  }

  /**
   * 解密人脸模板
   * @param encryptedTemplate 加密的模板
   * @returns string 解密后的模板
   */
  private decryptTemplate(encryptedTemplate: string): string {
    const algorithm = 'aes-256-cbc';
    const key = crypto.scryptSync(process.env.FACE_TEMPLATE_SECRET || 'default-secret', 'salt', 32);
    
    const textParts = encryptedTemplate.split(':');
    const iv = Buffer.from(textParts.shift()!, 'hex');
    const encryptedText = textParts.join(':');
    
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  /**
   * 验证人脸
   * @param currentImageBase64 当前拍摄的图片
   * @param storedTemplate 存储的人脸模板
   * @returns Promise<{ isMatch: boolean; confidence: number }> 验证结果
   */
  async verifyFace(currentImageBase64: string, storedTemplate: string): Promise<{ isMatch: boolean; confidence: number }> {
    try {
      // 解密存储的模板
      const templateData = JSON.parse(this.decryptTemplate(storedTemplate));
      
      // 检测当前图片中的人脸
      const currentFaceList = await this.detectFace(currentImageBase64);
      
      if (currentFaceList.length === 0) {
        throw new Error('未检测到人脸');
      }

      if (currentFaceList.length > 1) {
        throw new Error('检测到多张人脸，请确保图片中只有一张人脸');
      }

      const currentFace = currentFaceList[0];
      
      // 进行活体检测
      const livenessResult = await this.livenessDetect(currentImageBase64);
      
      if (livenessResult.face_liveness < 0.5) {
        throw new Error('活体检测失败，请确保是真人操作');
      }

      // 计算相似度（这里简化处理，实际应该使用更复杂的算法）
      const similarity = this.calculateSimilarity(currentFace, templateData);
      
      return {
        isMatch: similarity > 0.8, // 相似度阈值
        confidence: similarity
      };
    } catch (error) {
      throw new Error(`人脸验证失败: ${error}`);
    }
  }

  /**
   * 计算人脸相似度（简化版本）
   * @param face1 第一张人脸数据
   * @param face2 第二张人脸数据
   * @returns number 相似度分数
   */
  private calculateSimilarity(face1: Record<string, unknown>, face2: Record<string, unknown>): number {
    // 这里是简化的相似度计算，实际应该使用更复杂的算法
    // 比较关键点位置、人脸质量等特征
    
    let similarity = 0;
    let totalFeatures = 0;
    
    // 比较年龄相似度
    if (face1.age && face2.age) {
      const ageDiff = Math.abs(face1.age - face2.age);
      similarity += Math.max(0, 1 - ageDiff / 50); // 年龄差异权重
      totalFeatures++;
    }
    
    // 比较性别
    if (face1.gender && face2.gender && face1.gender.type === face2.gender.type) {
      similarity += 0.1; // 性别匹配加分
    }
    totalFeatures++;
    
    // 比较关键点（简化版本）
    if (face1.landmark && face2.landmark) {
      let landmarkSimilarity = 0;
      const minLength = Math.min(face1.landmark.length, face2.landmark.length);
      
      for (let i = 0; i < minLength; i++) {
        const dist = Math.sqrt(
          Math.pow(face1.landmark[i].x - face2.landmark[i].x, 2) +
          Math.pow(face1.landmark[i].y - face2.landmark[i].y, 2)
        );
        landmarkSimilarity += Math.max(0, 1 - dist / 100); // 距离权重
      }
      
      similarity += landmarkSimilarity / minLength;
      totalFeatures++;
    }
    
    return totalFeatures > 0 ? similarity / totalFeatures : 0;
  }
}

const baiduFaceService = new BaiduFaceService();
export default baiduFaceService;