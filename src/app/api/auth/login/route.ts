/**
 * 用户登录API接口
 * POST /api/auth/login
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { generalRateLimit } from '../../middleware/security';
import { ErrorHandler, AppError, ErrorType } from '@/utils/errorHandler';

const supabase = getSupabaseAdminClient();

/**
 * 用户登录接口
 * @param request HTTP请求对象
 * @returns 登录结果
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, password, verificationCode } = body;

    // 验证手机号格式
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phone || !phoneRegex.test(phone)) {
      return NextResponse.json(
        { error: '手机号格式不正确' },
        { status: 400 }
      );
    }

    let result;

    // 根据登录方式选择不同的验证逻辑
    if (verificationCode) {
      // 短信验证码登录
      if (!verificationCode.trim()) {
        return NextResponse.json(
          { error: '验证码不能为空' },
          { status: 400 }
        );
      }
      result = await loginUserWithSms(phone, verificationCode);
    } else {
      // 密码登录
      if (!password) {
        return NextResponse.json(
          { error: '密码不能为空' },
          { status: 400 }
        );
      }
      result = await loginUser(phone, password);
    }

    if (result.success) {
      return NextResponse.json({
        success: true,
        data: {
          user: result.user,
          token: result.token,
          refreshToken: result.refreshToken
        },
        message: '登录成功'
      });
    } else {
      return NextResponse.json(
        { error: result.message },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('用户登录API错误:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}