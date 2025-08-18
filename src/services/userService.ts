/**
 * 用户服务模块
 * 处理用户注册、登录、认证等功能
 */

import { supabase } from '@/lib/supabase';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { verifyCode } from '@/services/smsService';

export interface User {
  id: string;
  phone: string;
  name?: string;
  userType: 'guest' | 'registered' | 'premium';
  isVerified: boolean;
  avatarUrl?: string;
  createdAt: string;
}

export interface LoginResult {
  success: boolean;
  user?: User;
  token?: string;
  requiresFaceVerification?: boolean;
  message?: string;
}

export interface RegisterResult {
  success: boolean;
  user?: User;
  message?: string;
}

// JWT密钥 - 实际项目中应该从环境变量获取
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

/**
 * 生成JWT token
 * @param userId 用户ID
 * @param userType 用户类型
 * @returns JWT token
 */
function generateToken(userId: string, userType: string): string {
  return jwt.sign(
    { userId, userType },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

/**
 * 验证短信验证码
 * @param phone 手机号
 * @param code 验证码
 * @param purpose 验证码用途
 * @returns 验证结果
 */
async function verifyPhoneCode(phone: string, code: string, purpose: string = 'register'): Promise<boolean> {
  try {
    const result = await verifyCode(phone, code, purpose);
    return result.success;
  } catch (error) {
    console.error('验证码验证失败:', error);
    return false;
  }
}

/**
 * 用户注册
 * @param phone 手机号
 * @param password 密码
 * @param verificationCode 短信验证码
 * @param name 用户姓名（可选）
 * @returns 注册结果
 */
export async function registerUser(
  phone: string,
  password: string,
  verificationCode: string,
  name?: string
): Promise<RegisterResult> {
  try {
    // 验证短信验证码
    const isCodeValid = await verifyPhoneCode(phone, verificationCode, 'register');
    if (!isCodeValid) {
      return {
        success: false,
        message: '验证码错误或已过期'
      };
    }

    // 检查手机号是否已注册
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('phone', phone)
      .single();

    if (existingUser) {
      return {
        success: false,
        message: '该手机号已注册'
      };
    }

    // 密码哈希处理
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // 保存到数据库
    const { data: newUser, error } = await supabase
      .from('users')
      .insert({
        phone,
        password_hash: passwordHash,
        name: name || `用户${phone.slice(-4)}`,
        user_type: 'registered',
        is_verified: true
      })
      .select()
      .single();

    if (error) {
      console.error('注册失败:', error);
      return {
        success: false,
        message: '注册失败，请稍后重试'
      };
    }

    const user: User = {
      id: newUser.id,
      phone: newUser.phone,
      name: newUser.name,
      userType: newUser.user_type,
      isVerified: newUser.is_verified,
      avatarUrl: newUser.avatar_url,
      createdAt: newUser.created_at
    };

    return {
      success: true,
      user,
      message: '注册成功'
    };
  } catch (error) {
    console.error('注册过程中发生错误:', error);
    return {
      success: false,
      message: '注册失败，请稍后重试'
    };
  }
}

/**
 * 用户登录
 * @param phone 手机号
 * @param password 密码
 * @returns 登录结果
 */
export async function loginUser(
  phone: string,
  password: string
): Promise<LoginResult> {
  try {
    // 从数据库查询用户
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('phone', phone)
      .single();

    if (error || !user) {
      return {
        success: false,
        message: '手机号或密码错误'
      };
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return {
        success: false,
        message: '手机号或密码错误'
      };
    }

    // 生成JWT token
    const token = generateToken(user.id, user.user_type);

    const userData: User = {
      id: user.id,
      phone: user.phone,
      name: user.name,
      userType: user.user_type,
      isVerified: user.is_verified,
      avatarUrl: user.avatar_url,
      createdAt: user.created_at
    };

    // 检查是否为付费用户，需要人脸识别
    const requiresFaceVerification = user.user_type === 'premium';

    return {
      success: true,
      user: userData,
      token,
      requiresFaceVerification,
      message: requiresFaceVerification ? '请进行人脸识别验证' : '登录成功'
    };
  } catch (error) {
    console.error('登录过程中发生错误:', error);
    return {
      success: false,
      message: '登录失败，请稍后重试'
    };
  }
}

/**
 * 短信验证码登录
 * @param phone 手机号
 * @param verificationCode 短信验证码
 * @returns 登录结果
 */
export async function loginUserWithSms(
  phone: string,
  verificationCode: string
): Promise<LoginResult> {
  try {
    // 验证短信验证码
    const isCodeValid = await verifyPhoneCode(phone, verificationCode, 'login');
    if (!isCodeValid) {
      return {
        success: false,
        message: '验证码错误或已过期'
      };
    }

    // 从数据库查询用户
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('phone', phone)
      .single();

    if (error || !user) {
      return {
        success: false,
        message: '用户不存在，请先注册'
      };
    }

    // 生成JWT token
    const token = generateToken(user.id, user.user_type);

    const userData: User = {
      id: user.id,
      phone: user.phone,
      name: user.name,
      userType: user.user_type,
      isVerified: user.is_verified,
      avatarUrl: user.avatar_url,
      createdAt: user.created_at
    };

    // 检查是否为付费用户，需要人脸识别
    const requiresFaceVerification = user.user_type === 'premium';

    return {
      success: true,
      user: userData,
      token,
      requiresFaceVerification,
      message: requiresFaceVerification ? '请进行人脸识别验证' : '登录成功'
    };
  } catch (error) {
    console.error('短信登录过程中发生错误:', error);
    return {
      success: false,
      message: '登录失败，请稍后重试'
    };
  }
}

/**
 * 人脸识别验证
 * @param userId 用户ID
 * @param faceData 人脸数据（base64编码）
 * @returns 验证结果
 */
export async function verifyFaceRecognition(
  userId: string,
  // _faceData: string
): Promise<{ success: boolean; message: string }> {
  try {
    // 获取用户的人脸记录
    const { data: faceRecord, error } = await supabase
      .from('face_records')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !faceRecord) {
      return {
        success: false,
        message: '未找到人脸记录，请先录入人脸信息'
      };
    }

    // TODO: 实现真实的人脸识别逻辑
    // 这里应该调用人脸识别服务API进行比对
    // 目前使用模拟逻辑
    await new Promise(resolve => setTimeout(resolve, 2000)); // 模拟识别时间

    // 模拟人脸识别成功
    const isMatch = true; // 实际应该是人脸比对结果

    if (isMatch) {
      // 更新最后验证时间
      await supabase
        .from('face_records')
        .update({ last_verified_at: new Date().toISOString() })
        .eq('user_id', userId);

      return {
        success: true,
        message: '人脸识别成功'
      };
    } else {
      return {
        success: false,
        message: '人脸识别失败，请重试'
      };
    }
  } catch (error) {
    console.error('人脸识别过程中发生错误:', error);
    return {
      success: false,
      message: '人脸识别失败，请稍后重试'
    };
  }
}

/**
 * 录入人脸信息
 * @param userId 用户ID
 * @param faceData 人脸数据（base64编码）
 * @returns 录入结果
 */
export async function enrollFace(
  userId: string,
  faceData: string
): Promise<{ success: boolean; message: string }> {
  try {
    // TODO: 实际项目中应该调用人脸识别服务提取特征
    const faceEncoding = faceData; // 简化处理，实际应该是特征向量

    // 保存或更新人脸记录
    const { error } = await supabase
      .from('face_records')
      .upsert({
        user_id: userId,
        face_encoding: faceEncoding,
        created_at: new Date().toISOString()
      });

    if (error) {
      console.error('人脸录入失败:', error);
      return {
        success: false,
        message: '人脸录入失败，请稍后重试'
      };
    }

    return {
      success: true,
      message: '人脸录入成功'
    };
  } catch (error) {
    console.error('人脸录入过程中发生错误:', error);
    return {
      success: false,
      message: '人脸录入失败，请稍后重试'
    };
  }
}

/**
 * 验证JWT token
 * @param token JWT token
 * @returns 验证结果和用户信息
 */
export function verifyToken(token: string): Record<string, unknown> {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as Record<string, unknown>;
    return {
      valid: true,
      userId: decoded.userId,
      userType: decoded.userType
    };
  } catch (error) {
    console.error('Token verification error:', error);
    return { valid: false };
  }
}

/**
 * 根据ID获取用户信息
 * @param userId 用户ID
 * @returns 用户信息
 */
export async function getUserById(userId: string): Promise<User | null> {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !user) {
      return null;
    }

    return {
      id: user.id,
      phone: user.phone,
      name: user.name,
      userType: user.user_type,
      isVerified: user.is_verified,
      avatarUrl: user.avatar_url,
      createdAt: user.created_at
    };
  } catch (error) {
    console.error('获取用户信息失败:', error);
    return null;
  }
}
