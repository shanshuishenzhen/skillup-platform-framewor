import { NextRequest, NextResponse } from 'next/server';
import { loginUser } from '@/services/userService';
// TODO: Import a JWT library like 'jsonwebtoken' and configure secret key
// import jwt from 'jsonwebtoken';

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

    // If face scan is not needed for this user, issue JWT and send it back
    if (!user.needsFaceScan) {
      // const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
      const fakeToken = "fake-jwt-for-registered-user"; // Placeholder token
      return NextResponse.json({ message: '登录成功', token: fakeToken, user });
    }

    // If face scan is needed, send back a signal to the client to initiate it
    return NextResponse.json({
      message: '需要人脸识别',
      needsFaceScan: true,
      userId: user.id
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '发生未知错误';
    return NextResponse.json({ message: '登录失败', error: errorMessage }, { status: 500 });
  }
}
