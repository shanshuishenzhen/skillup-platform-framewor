// /src/app/api/auth/face-login/route.ts
import { verifyFace } from "@/services/aiService";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { image } = await request.json();

    if (!image) {
      return NextResponse.json({ error: "Image data is required." }, { status: 400 });
    }

    const verificationResult = await verifyFace(image);

    if (verificationResult.success) {
      // In a real app, you'd create a session/JWT for the user.
      // Here, we just return a success message.
      return NextResponse.json({ success: true, message: "Face login successful." });
    } else {
      return NextResponse.json({ success: false, message: "Face not recognized." }, { status: 401 });
    }
  } catch (error) {
    console.error("Face login API error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
