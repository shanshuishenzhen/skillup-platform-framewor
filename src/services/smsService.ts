/**
 * 短信验证服务
 * 提供验证码生成、发送、验证等功能
 */

import { supabaseAdmin } from '@/lib/supabase';
import { getEnvConfig } from '@/utils/envConfig';
import { SmsProviderFactory } from './smsProviders';

// 验证码存储接口
/*
interface VerificationCode {
  phone: string;
  code: string;
  purpose: 'register' | 'login' | 'reset_password';
  expiresAt: number;
  verified: boolean;
}
*/

// 数据库验证码记录接口
interface SmsVerificationRecord {
  id: string;
  phone: string;
  code: string;
  purpose: string;
  expires_at: string;
  verified: boolean;
  created_at: string;
  updated_at: string;
}

// 使用管理员客户端进行服务端操作
const supabase = supabaseAdmin;

// 短信验证码接口定义
interface SmsVerificationCode {
  id: string;
  phone: string;
  code: string;
  purpose: 'register' | 'login' | 'reset_password';
  expires_at: string;
  verified: boolean;
  created_at: string;
}

// 短信发送响应接口
interface SmsResponse {
  success: boolean;
  message: string;
  code?: string; // 开发环境下返回验证码
}

// 验证码验证响应接口
/*
interface VerificationResponse {
  success: boolean;
  message: string;
  isValid: boolean;
}
*/

/**
 * 生成6位数字验证码
 * @returns {string} 6位数字验证码
 * @example
 * const code = generateVerificationCode();
 * console.log(code); // "123456"
 */
function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * 验证手机号格式
 * @param {string} phone - 手机号码
 * @returns {boolean} 是否为有效手机号
 * @example
 * const isValid = validatePhoneNumber("13800138000");
 * console.log(isValid); // true
 */
function validatePhoneNumber(phone: string): boolean {
  const phoneRegex = /^1[3-9]\d{9}$/;
  return phoneRegex.test(phone);
}

/**
 * 发送验证码
 * @param {string} phone - 手机号
 * @param {string} purpose - 验证码用途
 * @returns {Promise<SmsResponse>} 发送结果
 * 
 * @example
 * const result = await sendVerificationCode('13800138000', 'register');
 * console.log(result.success); // true
 * console.log(result.code); // '123456' (仅开发环境)
 */
export async function sendVerificationCode(
  phone: string,
  purpose: 'register' | 'login' | 'reset_password'
): Promise<SmsResponse> {
  try {
    // 验证手机号格式
    if (!validatePhoneNumber(phone)) {
       return {
         success: false,
         message: '手机号格式不正确'
       };
     }

    // 检查是否在发送频率限制内（60秒内不能重复发送）
    const { data: recentCodes } = await supabase
      .from('sms_verification_codes')
      .select('*')
      .eq('phone', phone)
      .eq('purpose', purpose)
      .gte('created_at', new Date(Date.now() - 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(1);

    if (recentCodes && recentCodes.length > 0) {
      const lastSentTime = new Date(recentCodes[0].created_at).getTime();
      const remainingTime = Math.ceil((60 * 1000 - (Date.now() - lastSentTime)) / 1000);
      return {
        success: false,
        message: `请等待 ${remainingTime} 秒后再次发送验证码`
      };
    }

    // 生成验证码
    const code = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5分钟后过期

    // 存储验证码到数据库
    const { error: insertError } = await supabase
      .from('sms_verification_codes')
      .insert({
        phone,
        code,
        purpose,
        expires_at: expiresAt.toISOString(),
        verified: false
      });

    if (insertError) {
      console.error('存储验证码失败:', insertError);
      return {
        success: false,
        message: '验证码生成失败，请稍后重试'
      };
    }

    // 使用配置的短信服务提供商发送短信
    const smsProvider = SmsProviderFactory.createProvider();
    const sendResult = await smsProvider.sendSms(phone, code, purpose);
    
    if (!sendResult.success) {
      // 发送失败，删除已存储的验证码
      await supabase
        .from('sms_verification_codes')
        .delete()
        .eq('phone', phone)
        .eq('code', code)
        .eq('purpose', purpose);
      return {
        success: false,
        message: '短信发送失败，请稍后重试'
      };
    }

    // 清理过期的验证码
    await cleanupExpiredCodes();

    return {
      success: true,
      message: '验证码发送成功，请查收短信',
      // 开发环境返回验证码，生产环境不返回
      ...(process.env.NODE_ENV === 'development' && { code })
    };

  } catch (error) {
    console.error('发送验证码失败:', error);
    return {
      success: false,
      message: '验证码发送失败，请稍后重试'
    };
  }
}

/**
 * 验证验证码
 * @param {string} phone - 手机号
 * @param {string} code - 验证码
 * @param {string} purpose - 验证码用途
 * @returns {Promise<SmsResponse>} 验证结果
 * 
 * @example
 * const result = await verifyCode('13800138000', '123456', 'register');
 * console.log(result.success); // true
 * console.log(result.verified); // true
 */
export async function verifyCode(
  phone: string,
  code: string,
  purpose: 'register' | 'login' | 'reset_password'
): Promise<SmsResponse & { verified?: boolean }> {
  try {
    // 验证手机号格式
    if (!validatePhoneNumber(phone)) {
      return {
        success: false,
        message: '手机号格式不正确'
      };
    }

    // 验证验证码格式
    if (!/^\d{6}$/.test(code)) {
      return {
        success: false,
        message: '验证码格式不正确'
      };
    }

    // 测试环境：允许使用固定测试验证码
    if (process.env.NODE_ENV === 'development' && code === '123456') {
      return {
        success: true,
        message: '验证码验证成功（测试模式）',
        verified: true
      };
    }

    // 查找最新的未验证验证码
    const { data: verificationRecord, error } = await supabase
      .from('sms_verification_codes')
      .select('*')
      .eq('phone', phone)
      .eq('code', code)
      .eq('purpose', purpose)
      .eq('verified', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !verificationRecord) {
      return {
        success: false,
        message: '验证码不存在、已过期或已被使用'
      };
    }

    // 检查验证码是否过期
    const expiresAt = new Date(verificationRecord.expires_at).getTime();
    if (Date.now() > expiresAt) {
      return {
        success: false,
        message: '验证码已过期，请重新获取'
      };
    }

    // 标记验证码为已验证
    const { error: updateError } = await supabase
      .from('sms_verification_codes')
      .update({ verified: true })
      .eq('id', verificationRecord.id);

    if (updateError) {
      console.error('更新验证码状态失败:', updateError);
      return {
        success: false,
        message: '验证码验证失败，请稍后重试'
      };
    }

    return {
      success: true,
      message: '验证码验证成功',
      verified: true
    };

  } catch (error) {
    console.error('验证验证码失败:', error);
    return {
      success: false,
      message: '验证码验证失败，请稍后重试'
    };
  }
}

/**
 * 清理过期的验证码
 * @returns {Promise<number>} 清理的验证码数量
 * 
 * @example
 * const cleanedCount = await cleanupExpiredCodes();
 * console.log(`清理了 ${cleanedCount} 个过期验证码`);
 */
export async function cleanupExpiredCodes(): Promise<number> {
  try {
    // 删除过期的验证码记录
    const { error } = await supabase
      .from('sms_verification_codes')
      .delete()
      .lt('expires_at', new Date().toISOString());

    if (error) {
      console.error('清理过期验证码失败:', error);
      return 0;
    }

    // Supabase delete 操作不返回删除的行数，返回成功标识
    return 1;
  } catch (error) {
    console.error('清理过期验证码失败:', error);
    return 0;
  }
}

/**
 * 模拟短信服务（仅用于开发和演示）
 * 在实际项目中应替换为真实的短信服务API调用
 * @param {string} phone - 手机号码
 * @param {string} code - 验证码
 * @param {string} purpose - 用途
 * @returns {Promise<{success: boolean}>} 模拟发送结果
 */
/*
async function simulateSmsService(
  phone: string,
  code: string,
  purpose: string
): Promise<{ success: boolean }> {
  // 模拟网络延迟
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // 模拟发送成功（实际项目中应调用真实短信API）
  console.log(`[模拟短信] 发送到 ${phone}: 验证码 ${code}，用途: ${purpose}`);
  
  // 模拟99%的成功率
  return { success: Math.random() > 0.01 };
}
*/

/**
 * 获取最近的验证码记录
 * @param {string} phone - 手机号
 * @param {string} purpose - 验证码用途
 * @returns {Promise<SmsVerificationRecord | null>} 最近的验证码记录
 * 
 * @example
 * const recentCode = await getRecentVerificationCode('13800138000', 'register');
 * if (recentCode && new Date(recentCode.expires_at) > new Date()) {
 *   console.log('验证码仍然有效');
 * }
 */
export async function getRecentVerificationCode(
  phone: string,
  purpose: 'register' | 'login' | 'reset_password'
): Promise<SmsVerificationRecord | null> {
  try {
    const { data, error } = await supabase
      .from('sms_verification_codes')
      .select('*')
      .eq('phone', phone)
      .eq('purpose', purpose)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return null;
    }

    return data;
  } catch (error) {
    console.error('获取最近验证码记录失败:', error);
    return null;
  }
}

/**
 * 获取用户最近的验证码记录（仅用于调试）
 * @param {string} phone - 手机号码
 * @returns {Promise<SmsVerificationCode[]>} 验证码记录列表
 */
export async function getRecentCodes(phone: string): Promise<SmsVerificationCode[]> {
  try {
    const { data, error } = await supabase
      .from('sms_verification_codes')
      .select('*')
      .eq('phone', phone)
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      console.error('获取验证码记录失败:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('获取验证码记录异常:', error);
    return [];
  }
}

/**
 * 获取短信服务状态
 * @returns {Promise<{provider: string, configured: boolean, available: boolean}>} 服务状态
 */
export async function getSmsServiceStatus(): Promise<{
  provider: string;
  configured: boolean;
  available: boolean;
  message: string;
}> {
  try {
    const provider = process.env.SMS_PROVIDER || 'mock';
    const smsProvider = SmsProviderFactory.createProvider();
    const configured = smsProvider.validateConfig();

    // 对于mock服务，总是可用的
    if (provider === 'mock') {
      return {
        provider,
        configured: true,
        available: true,
        message: '使用模拟短信服务（开发环境）'
      };
    }

    return {
      provider,
      configured,
      available: configured,
      message: configured
        ? `${provider}短信服务已配置且可用`
        : `${provider}短信服务未正确配置，请检查环境变量`
    };
  } catch (error) {
    return {
      provider: 'unknown',
      configured: false,
      available: false,
      message: '短信服务状态检查失败'
    };
  }
}