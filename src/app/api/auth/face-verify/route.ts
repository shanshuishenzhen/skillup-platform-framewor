/**
 * 人脸识别验证API接口
 * POST /api/auth/face-verify
 */

import { NextResponse } from 'next/server';
import { verifyFaceRecognition } from '@/services/userService';
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
 * 人脸识别验证接口
 * @param request HTTP请求对象
 * @returns 验证结果
 */
export async function POST(request: Request): Promise<Response> {
  try {
    const { faceData, token } = await request.json();

    // 验证token
    const userId = verifyToken(token);
    if (!userId) {
      return Response.json(
        { success: false, error: '无效的认证token' },
        { status: 401 }
      );
    }

    // 验证请求参数
    if (!faceData) {
      return NextResponse.json(
        { error: '人脸数据不能为空' },
        { status: 400 }
      );
    }

    // 调用用户服务进行人脸识别验证
    const result = await verifyFaceRecognition(userId, faceData as string);

    if (result.success) {
      return NextResponse.json({
        success: true,
        data: {
          score: result.score
        },
        message: '人脸识别验证成功'
      });
    } else {
      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('人脸识别验证API错误:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}