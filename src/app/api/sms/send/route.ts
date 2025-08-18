/**
 * 短信验证码发送API接口
 * POST /api/sms/send
 */

import { NextRequest, NextResponse } from 'next/server';
import { sendVerificationCode } from '@/services/smsService';

// 请求体接口定义
interface SendSmsRequest {
  phone: string;
  purpose: 'register' | 'login' | 'reset_password';
}

// 响应接口定义
interface SendSmsResponse {
  success: boolean;
  message: string;
  code?: string; // 仅在开发环境返回
}

/**
 * 处理短信验证码发送请求
 * @param {NextRequest} request - HTTP请求对象
 * @returns {Promise<NextResponse<SendSmsResponse>>} API响应
 * 
 * @example
 * // 请求示例
 * POST /api/sms/send
 * {
 *   "phone": "13800138000",
 *   "purpose": "register"
 * }
 * 
 * // 响应示例
 * {
 *   "success": true,
 *   "message": "验证码发送成功，请查收短信",
 *   "code": "123456" // 仅开发环境
 * }
 */
export async function POST(request: NextRequest): Promise<NextResponse<SendSmsResponse>> {
  try {
    // 解析请求体
    const body: SendSmsRequest = await request.json();
    const { phone, purpose } = body;

    // 验证必需参数
    if (!phone || !purpose) {
      return NextResponse.json(
        {
          success: false,
          message: '手机号和用途参数不能为空'
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

    // 调用短信服务发送验证码
    const result = await sendVerificationCode(phone, purpose);

    // 根据结果返回相应的HTTP状态码
    const statusCode = result.success ? 200 : 400;

    return NextResponse.json(result, { status: statusCode });

  } catch (error) {
    console.error('短信发送API异常:', error);
    
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