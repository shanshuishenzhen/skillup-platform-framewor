/**
 * Token刷新API端点
 * 处理JWT token的自动刷新请求
 * 使用Supabase数据库，确保与现有认证系统保持一致
 */

import { NextRequest, NextResponse } from 'next/server';
import * as jwt from 'jsonwebtoken';
import type { SignOptions } from 'jsonwebtoken';
import { supabase } from '@/lib/supabase';

const JWT_SECRET: string = process.env.JWT_SECRET || 'your-secret-key';
const JWT_REFRESH_SECRET: string = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key';
const JWT_EXPIRES_IN: string = process.env.JWT_EXPIRES_IN || '1h';
const JWT_REFRESH_EXPIRES_IN: string = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

/**
 * 验证refresh token的有效性
 * @param refreshToken - 刷新token
 * @returns 解码后的用户信息或null
 */
interface DecodedToken {
  userId: string;
  type: string;
  iat?: number;
  exp?: number;
}

function verifyRefreshToken(refreshToken: string): DecodedToken | null {
  try {
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as DecodedToken;
    console.log('🔍 Refresh token验证成功:', { userId: decoded.userId, type: decoded.type });
    return decoded;
  } catch (error) {
    console.error('❌ Refresh token验证失败:', error);
    return null;
  }
}

/**
 * 生成新的访问token
 * @param userId - 用户ID
 * @param userType - 用户类型
 * @param userRole - 用户角色
 * @returns 新的访问token
 */
function generateAccessToken(userId: string, userType: string, userRole: string): string {
  const payload = { 
    userId, 
    userType,
    role: userRole,
    type: 'access'
  };
  const secret = JWT_SECRET;
  const options: SignOptions = { expiresIn: JWT_EXPIRES_IN as any };
  const token = jwt.sign(payload, secret, options);
  console.log('🔑 生成新的访问token:', { userId, userType, role: userRole });
  return token;
}

/**
 * 生成新的刷新token
 * @param userId - 用户ID
 * @returns 新的刷新token
 */
function generateRefreshToken(userId: string): string {
  const payload = { 
    userId,
    type: 'refresh'
  };
  const secret = JWT_REFRESH_SECRET;
  const options: SignOptions = { expiresIn: JWT_REFRESH_EXPIRES_IN as any };
  return jwt.sign(payload, secret, options);
}

/**
 * POST /api/auth/refresh
 * 刷新访问token
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { refreshToken } = body;

    // 验证请求参数
    if (!refreshToken) {
      return NextResponse.json(
        { error: '缺少refresh token' },
        { status: 400 }
      );
    }

    // 验证refresh token
    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded || decoded.type !== 'refresh') {
      return NextResponse.json(
        { error: 'Refresh token无效或已过期' },
        { status: 401 }
      );
    }

    // 查找用户 - 使用Supabase
    console.log('🔍 查询用户信息:', { userId: decoded.userId });
    const { data: user, error } = await supabase
      .from('users')
      .select('id, phone, name, email, role, user_type, status, is_verified, face_verified, avatar_url, created_at')
      .eq('id', decoded.userId)
      .single();

    if (error || !user) {
      console.error('❌ 用户查询失败:', error);
      return NextResponse.json(
        { error: '用户不存在' },
        { status: 404 }
      );
    }

    // 检查用户状态
    if (user.status && user.status !== 'active') {
      console.error('❌ 用户账户状态异常:', { userId: user.id, status: user.status });
      return NextResponse.json(
        { error: '用户账户已被禁用' },
        { status: 403 }
      );
    }

    // 生成新的token - 确保包含userType
    const userRole = user.role || 'user';
    const userType = user.user_type || 'registered';
    const newAccessToken = generateAccessToken(user.id, userType, userRole);
    const newRefreshToken = generateRefreshToken(user.id);

    // 记录刷新日志
    console.log('✅ Token刷新成功:', { 
      userId: user.id, 
      phone: user.phone, 
      name: user.name, 
      role: userRole,
      userType: userType
    });

    return NextResponse.json({
      success: true,
      message: 'Token刷新成功',
      token: newAccessToken,
      refreshToken: newRefreshToken,
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        email: user.email,
        role: userRole,
        userType: userType,
        isVerified: user.is_verified,
        faceVerified: user.face_verified,
        avatarUrl: user.avatar_url,
        createdAt: user.created_at
      }
    });

  } catch (error) {
    console.error('Token刷新错误:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

/**
 * 其他HTTP方法不支持
 */
export async function GET() {
  return NextResponse.json(
    { error: '方法不允许' },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { error: '方法不允许' },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: '方法不允许' },
    { status: 405 }
  );
}