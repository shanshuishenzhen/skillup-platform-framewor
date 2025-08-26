/**
 * 用户登录API接口
 * POST /api/auth/login
 */

import { NextRequest, NextResponse } from 'next/server';
import { loginUser, loginUserWithSms } from '@/services/userService';
import { ErrorHandler, AppError, ErrorType } from '@/utils/errorHandler';

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
        { error: result.error },
        { status: 401 }
      );
    }
  } catch (error) {
    // 使用统一的错误处理机制
    if (error instanceof AppError) {
      return ErrorHandler.handleApiError(error);
    }
    
    // 处理未知错误
    const apiError = new AppError(
      '用户登录失败',
      ErrorType.API_ERROR,
      500,
      'USER_LOGIN_ERROR',
      { originalError: error instanceof Error ? error.message : String(error) }
    );
    
    return ErrorHandler.handleApiError(apiError);
  }
}