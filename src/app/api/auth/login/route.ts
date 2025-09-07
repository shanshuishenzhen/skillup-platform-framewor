/**
 * 用户登录API接口
 * POST /api/auth/login
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase';
import { loginUser, loginUserWithSms } from '@/services/userService';
import { loginAdmin } from '@/services/adminService';
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
      console.log('尝试密码登录:', { phone, passwordLength: password.length });
      
      // 首先尝试管理员登录
      const adminResult = await loginAdmin(phone, password);
      if (adminResult.success) {
        result = adminResult;
        console.log('管理员登录成功');
      } else {
        // 如果管理员登录失败，尝试普通用户登录
        result = await loginUser(phone, password);
        console.log('普通用户登录结果:', { success: result.success, message: result.message });
      }
    }

    if (result.success) {
      console.log('登录成功，返回用户数据');
      return NextResponse.json({
        success: true,
        user: result.user,
        token: result.token,
        refreshToken: result.refreshToken,
        message: '登录成功'
      });
    } else {
      console.log('登录失败:', result.message);
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