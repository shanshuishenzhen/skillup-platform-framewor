/**
 * 用户注册API接口
 * POST /api/auth/register
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { generalRateLimit } from '../../middleware/security';
import { ErrorHandler, AppError, ErrorType } from '@/utils/errorHandler';

const supabase = getSupabaseAdminClient();

/**
 * 用户注册接口
 * @param request HTTP请求对象
 * @returns 注册结果
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, password, idCard } = body;

    // 使用统一的验证码提取函数，支持多种字段名称
    const code = extractVerificationCode(body);

    // 验证请求参数
    if (!phone || !password || !code || !idCard) {
      return NextResponse.json(
        { error: '手机号、密码、身份证号码和验证码不能为空' },
        { status: 400 }
      );
    }

    // 验证手机号格式
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(phone)) {
      return NextResponse.json(
        { error: '手机号格式不正确' },
        { status: 400 }
      );
    }

    // 验证密码强度
    if (password.length < 6) {
      return NextResponse.json(
        { error: '密码长度不能少于6位' },
        { status: 400 }
      );
    }

    // 验证身份证号码格式
    const idCardRegex = /^[1-9]\d{5}(18|19|20)\d{2}((0[1-9])|(1[0-2]))(([0-2][1-9])|10|20|30|31)\d{3}[0-9Xx]$/;
    if (!idCardRegex.test(idCard)) {
      return NextResponse.json(
        { error: '身份证号码格式不正确' },
        { status: 400 }
      );
    }

    // 验证短信验证码格式
    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json(
        { error: '验证码格式不正确' },
        { status: 400 }
      );
    }

    // 调用用户服务进行注册
    const result = await registerUser(phone, password, code, idCard);

    if (result.success) {
      return NextResponse.json({
        success: true,
        data: {
          user: result.user,
          token: (result as any).token
        },
        message: '注册成功'
      });
    } else {
      return NextResponse.json(
        { error: (result as any).error || (result as any).message || '注册失败' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('注册API错误:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}