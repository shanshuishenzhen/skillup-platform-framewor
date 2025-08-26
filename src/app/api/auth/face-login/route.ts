// /src/app/api/auth/face-login/route.ts
import { verifyFace } from "@/services/aiService";
import { NextResponse } from "next/server";
// TODO: Import a JWT library like 'jsonwebtoken' and configure secret key
// import jwt from 'jsonwebtoken';

export async function POST(request: Request) {
  try {
    const { userId, image } = await request.json();

    if (!userId || !image) {
      return NextResponse.json({ message: "用户ID和图像数据不能为空" }, { status: 400 });
    }

    const verificationResult = await verifyFace(userId, image);

    if (verificationResult.success) {
      // In a real app, you'd create a session/JWT for the user.
      // This token would be the "real" login token.
      // const token = jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '1h' });
      const fakeToken = `fake-jwt-for-user-${userId}`; // Placeholder token
      return NextResponse.json({ success: true, message: "人脸识别成功", token: fakeToken });
    } else {
      return NextResponse.json({ success: false, message: "人脸识别失败" }, { status: 401 });
    }
  } catch (error) {
    console.error("Face login API error:", error);
    const errorMessage = error instanceof Error ? error.message : '发生未知错误';
    return NextResponse.json({ message: '人脸识别时发生内部错误', error: errorMessage }, { status: 500 });
  }
}
