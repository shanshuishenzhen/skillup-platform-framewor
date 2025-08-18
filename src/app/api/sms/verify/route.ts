/**
 * 短信验证码验证API接口
 * POST /api/sms/verify
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyCode } from '@/services/smsService';

// 请求体接口定义
interface VerifySmsRequest {
  phone: string;
  code: string;
  purpose: 'register' | 'login' | 'reset_password';
}

// 响应接口定义
interface VerifySmsResponse {
  success: boolean;
  message: string;
  verified?: boolean;
}

/**
 * 处理短信验证码验证请求
 * @param {NextRequest} request - HTTP请求对象
 * @returns {Promise<NextResponse<VerifySmsResponse>>} API响应
 * 
 * @example
 * // 请求示例
 * POST /api/sms/verify
 * {
 *   "phone": "13800138000",
 *   "code": "123456",
 *   "purpose": "register"
 * }
 * 
 * // 响应示例
 * {
 *   "success": true,
 *   "message": "验证码验证成功",
 *   "verified": true
 * }
 */
export async function POST(request: NextRequest): Promise<NextResponse<VerifySmsResponse>> {
  try {
    // 解析请求体
    const body: VerifySmsRequest = await request.json();
    const { phone, code, purpose } = body;

    // 验证必需参数
    if (!phone || !code || !purpose) {
      return NextResponse.json(
        {
          success: false,
          message: '手机号、验证码和用途参数不能为空'
        },
        { status: 400 }
      );
    }

    // 验证用途参数
    const validPurposes = ['register', 'login', 'reset_password'];
    if (!validPurposes.includes(purpose)) {
      return NextResponse.json(
        {
          success: false,
          message: '无效的验证码用途'
        },
        { status: 400 }
      );
    }

    // 验证手机号格式
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(phone)) {
      return NextResponse.json(
        {
          success: false,
          message: '手机号格式不正确'
        },
        { status: 400 }
      );
    }

    // 验证验证码格式（6位数字）
    const codeRegex = /^\d{6}$/;
    if (!codeRegex.test(code)) {
      return NextResponse.json(
        {
          success: false,
          message: '验证码格式不正确，应为6位数字'
        },
        { status: 400 }
      );
    }

    // 调用短信服务验证验证码
    const result = await verifyCode(phone, code, purpose);

    // 根据结果返回相应的HTTP状态码
    const statusCode = result.success ? 200 : 400;

    return NextResponse.json(result, { status: statusCode });

  } catch (error) {
    console.error('短信验证API异常:', error);
    
    return NextResponse.json(
      {
        success: false,
        message: '服务器内部错误，请稍后重试'
      },
      { status: 500 }
    );
  }
}

/**
 * 处理OPTIONS请求（CORS预检）
 * @returns {NextResponse} CORS响应头
 */
export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}