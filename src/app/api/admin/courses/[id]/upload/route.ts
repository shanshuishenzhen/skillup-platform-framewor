import { NextRequest, NextResponse } from 'next/server';

// Define the parameter types for the route
interface UploadParams {
  id: string;
}

/**
 * API Route for uploading a file (video, materials) for a specific course.
 * Accessible only by users with the 'ADMIN' role.
 * Expects a `multipart/form-data` request.
 *
 * @param req The incoming Next.js request.
 * @param context The route context containing params
 * @returns A Next.js response.
 */
export async function POST(req: NextRequest, context: { params: Promise<UploadParams> }) {
  const params = await context.params;
  // TODO: Implement Admin Role-Based Access Control (RBAC)
  const isAdmin = true; // Placeholder for admin check
  if (!isAdmin) {
    return NextResponse.json({ message: '无权访问' }, { status: 403 });
  }

  try {
    const courseId = params.id;
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const fileType = formData.get('type') as 'video' | 'material' | null;

    if (!file || !fileType) {
      return NextResponse.json({ message: '请求体中必须包含 "file" 和 "type" 字段' }, { status: 400 });
    }

    console.log(`接收到课程 ${courseId} 的文件上传请求`);
    console.log(`文件名: ${file.name}, 大小: ${file.size}, 类型: ${fileType}`);

    // TODO: Upload the file to a cloud storage service (e.g., Aliyun OSS).
    // 1. Get a stream or buffer from the file.
    // 2. Use the cloud storage SDK to upload the content.
    // 3. Get the URL of the uploaded file from the cloud storage service response.

    // TODO: Update the corresponding course record in the database.
    // 1. Find the course by `courseId`.
    // 2. If `fileType` is 'video', update the `full_video_url` or `preview_video_url`.
    // 3. If `fileType` is 'material', update the `materials_url`.
    // await db.courses.update({ where: { id: courseId }, data: { ... } });

    // For now, return a mock URL.
    const mockFileUrl = `https://cdn.skillup.com/${fileType}/${courseId}/${file.name}`;

    return NextResponse.json({ message: '文件上传成功', url: mockFileUrl });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '上传失败';
    return NextResponse.json({ message: '服务器内部错误', error: errorMessage }, { status: 500 });
  }
}
