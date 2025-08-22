/**
 * 数据加密工具类
 * 提供AES-256加密/解密功能，用于保护敏感数据
 */

import crypto from 'crypto';

// 加密配置
interface EncryptionConfig {
  algorithm: string;
  keyLength: number;
  ivLength: number;
}

class EncryptionService {
  private config: EncryptionConfig;
  private secretKey: string;

  constructor() {
    this.config = {
      algorithm: 'aes-256-cbc',
      keyLength: 32,
      ivLength: 16
    };
    
    // 从环境变量获取密钥，如果没有则使用默认值（生产环境必须设置）
    this.secretKey = process.env.ENCRYPTION_SECRET_KEY || 'default-secret-key-change-in-production';
    
    if (this.secretKey === 'default-secret-key-change-in-production') {
      console.warn('警告: 使用默认加密密钥，生产环境请设置ENCRYPTION_SECRET_KEY环境变量');
    }
  }

  /**
   * 生成密钥
   * @param password 密码字符串
   * @param salt 盐值
   * @returns Buffer 生成的密钥
   */
  private generateKey(password: string, salt: string): Buffer {
    return crypto.scryptSync(password, salt, this.config.keyLength);
  }

  /**
   * 加密数据
   * @param data 要加密的数据
   * @param customKey 自定义密钥（可选）
   * @returns string 加密后的数据（格式：iv:salt:encrypted）
   */
  encrypt(data: string, customKey?: string): string {
    try {
      // 生成随机IV和盐值
      const iv = crypto.randomBytes(this.config.ivLength);
      const salt = crypto.randomBytes(16);
      
      // 使用自定义密钥或默认密钥
      const key = this.generateKey(customKey || this.secretKey, salt.toString('hex'));
      
      // 创建加密器
      const cipher = crypto.createCipheriv(this.config.algorithm, key, iv);
      
      // 加密数据
      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      // 返回格式：iv:salt:encrypted
      return `${iv.toString('hex')}:${salt.toString('hex')}:${encrypted}`;
    } catch (error) {
      throw new Error(`数据加密失败: ${error}`);
    }
  }

  /**
   * 解密数据
   * @param encryptedData 加密的数据（格式：iv:salt:encrypted）
   * @param customKey 自定义密钥（可选）
   * @returns string 解密后的数据
   */
  decrypt(encryptedData: string, customKey?: string): string {
    try {
      // 解析加密数据
      const parts = encryptedData.split(':');
      if (parts.length !== 3) {
        throw new Error('加密数据格式错误');
      }
      
      const iv = Buffer.from(parts[0], 'hex');
      const salt = Buffer.from(parts[1], 'hex');
      const encrypted = parts[2];
      
      // 生成密钥
      const key = this.generateKey(customKey || this.secretKey, salt.toString('hex'));
      
      // 创建解密器
      const decipher = crypto.createDecipheriv(this.config.algorithm, key, iv);
      
      // 解密数据
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      throw new Error(`数据解密失败: ${error}`);
    }
  }

  /**
   * 生成哈希值
   * @param data 要哈希的数据
   * @param algorithm 哈希算法（默认sha256）
   * @returns string 哈希值
   */
  hash(data: string, algorithm: string = 'sha256'): string {
    try {
      return crypto.createHash(algorithm).update(data).digest('hex');
    } catch {
      throw new Error('生成哈希失败');
    }
  }

  /**
   * 生成带盐的哈希值
   * @param data 要哈希的数据
   * @param salt 盐值（可选，如果不提供会自动生成）
   * @returns { hash: string; salt: string } 哈希值和盐值
   */
  hashWithSalt(data: string, salt?: string): { hash: string; salt: string } {
    try {
      const saltValue = salt || crypto.randomBytes(16).toString('hex');
      const hash = crypto.createHash('sha256').update(data + saltValue).digest('hex');
      
      return { hash, salt: saltValue };
    } catch (error) {
      throw new Error(`生成带盐哈希失败: ${error}`);
    }
  }

  /**
   * 验证哈希值
   * @param data 原始数据
   * @param hash 要验证的哈希值
   * @param salt 盐值
   * @returns boolean 验证结果
   */
  verifyHash(data: string, hash: string, salt: string): boolean {
    try {
      const computedHash = crypto.createHash('sha256').update(data + salt).digest('hex');
      return computedHash === hash;
    } catch {
    console.error('Hash verification failed');
    return false;
  }
  }

  /**
   * 生成随机字符串
   * @param length 字符串长度
   * @param charset 字符集（可选）
   * @returns string 随机字符串
   */
  generateRandomString(length: number, charset?: string): string {
    const defaultCharset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const chars = charset || defaultCharset;
    
    let result = '';
    for (let i = 0; i < length; i++) {
      const randomIndex = crypto.randomInt(0, chars.length);
      result += chars[randomIndex];
    }
    
    return result;
  }

  /**
   * 生成UUID
   * @returns string UUID字符串
   */
  generateUUID(): string {
    return crypto.randomUUID();
  }

  /**
   * 生成会话ID
   * @returns string 会话ID
   */
  generateSessionId(): string {
    const timestamp = Date.now().toString();
    const random = this.generateRandomString(16);
    return this.hash(timestamp + random).substring(0, 32);
  }

  /**
   * 加密敏感的人脸数据
   * @param faceData 人脸数据对象
   * @returns string 加密后的人脸数据
   */
  encryptFaceData(faceData: Record<string, unknown>): string {
    const dataString = JSON.stringify(faceData);
    return this.encrypt(dataString, process.env.FACE_DATA_SECRET || this.secretKey);
  }

  /**
   * 解密人脸数据
   * @param encryptedFaceData 加密的人脸数据
   * @returns Record<string, unknown> 解密后的人脸数据对象
   */
  decryptFaceData(encryptedFaceData: string): Record<string, unknown> {
    const dataString = this.decrypt(encryptedFaceData, process.env.FACE_DATA_SECRET || this.secretKey);
    return JSON.parse(dataString);
  }

  /**
   * 生成API访问令牌
   * @param userId 用户ID
   * @param expiresIn 过期时间（秒）
   * @returns string 访问令牌
   */
  generateApiToken(userId: string, expiresIn: number = 3600): string {
    const payload = {
      userId,
      timestamp: Date.now(),
      expiresAt: Date.now() + (expiresIn * 1000),
      nonce: this.generateRandomString(16)
    };
    
    return this.encrypt(JSON.stringify(payload));
  }

  /**
   * 验证API访问令牌
   * @param token 访问令牌
   * @returns { valid: boolean; userId?: string; expired?: boolean } 验证结果
   */
  verifyApiToken(token: string): { valid: boolean; userId?: string; expired?: boolean } {
    try {
      const payloadString = this.decrypt(token);
      const payload = JSON.parse(payloadString);
      
      const now = Date.now();
      const expired = now > payload.expiresAt;
      
      return {
        valid: !expired,
        userId: payload.userId,
        expired
      };
    } catch (error) {
      return { valid: false };
    }
  }
}

const encryptionService = new EncryptionService();
export default encryptionService;