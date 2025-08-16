import { NextRequest, NextResponse } from 'next/server';
import { registerUser } from '@/services/userService';

export async function POST(req: NextRequest) {
  try {
    const { phone, password } = await req.json();
    if (!phone || !password) {
      return NextResponse.json({ message: '手机号和密码不能为空' }, { status: 400 });
    }

    // In a real app, add more validation here (e.g., password strength)

    const user = await registerUser(phone, password);

    // TODO: Generate JWT token upon successful registration
    return NextResponse.json({ message: '注册成功', user }, { status: 201 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '发生未知错误';
    return NextResponse.json({ message: '注册失败', error: errorMessage }, { status: 500 });
  }
}
