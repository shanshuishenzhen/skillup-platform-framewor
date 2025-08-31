/**
 * 用户信息API接口
 * GET /api/user/profile
 */

import { NextResponse } from 'next/server';
import { getUserById } from '@/services/userService';
import jwt from 'jsonwebtoken';

/**
 * 验证JWT token并获取用户ID
 * @param token JWT token
 * @returns 用户ID或null
 */
function verifyToken(token: string): string | null {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as Record<string, unknown>;
    return decoded.userId as string;
  } catch {
    return null;
  }
}

/**
 * 获取用户信息接口
 * @param request HTTP请求对象
 * @returns 用户信息
 */
export async function GET(request: Request) {
  try {
    // 从请求头获取token
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return Response.json(
        { success: false, error: '未提供认证token' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const userId = verifyToken(token);
    
    if (!userId) {
      return NextResponse.json(
        { error: '无效的认证token' },
        { status: 401 }
      );
    }

    // 获取用户信息
    const user = await getUserById(userId);
    
    if (!user) {
      return NextResponse.json(
        { error: '用户不存在' },
        { status: 404 }
      );
    }

    // 返回用户信息
    return NextResponse.json({
      success: true,
      data: user,
      message: '获取用户信息成功'
    });
  } catch (error) {
    console.error('获取用户信息API错误:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}