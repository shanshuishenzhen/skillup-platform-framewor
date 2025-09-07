import { NextRequest, NextResponse } from 'next/server';
import { loginUser } from '@/services/userService';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { UserRole } from '@/lib/db/schema';

// IMPORTANT: In a real application, this secret should be in a .env file
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-that-is-at-least-32-chars-long';

export async function POST(req: NextRequest) {
  try {
    const { phone, password } = await req.json();
    if (!phone || !password) {
      return NextResponse.json({ message: '手机号和密码不能为空' }, { status: 400 });
    }

    const user = await loginUser(phone, password);

    if (!user) {
      return NextResponse.json({ message: '手机号或密码错误' }, { status: 401 });
    }

    // If face scan is needed for this user, do not issue JWT yet.
    // The client will handle the face scan flow and then call a different endpoint.
    if (user.needsFaceScan) {
      return NextResponse.json({
        message: '需要人脸识别',
        needsFaceScan: true,
        userId: user.id
      });
    }

    // If login is successful and no face scan is needed, issue JWT.
    const token = jwt.sign(
      { id: user.id, role: user.role, phone: user.phone },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Set the token in an HTTP-only cookie for security
    cookies().set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 60 * 60, // 1 hour in seconds
    });

    // Also return user info to the client, excluding sensitive data
    const { status, created_at, updated_at, ...userToReturn } = user;

    return NextResponse.json({
      message: '登录成功',
      user: userToReturn
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '发生未知错误';
    return NextResponse.json({ message: '登录失败', error: errorMessage }, { status: 500 });
  }
}
