import { NextRequest, NextResponse } from 'next/server';

/**
 * API Route for creating a new course.
 * Accessible only by users with the 'ADMIN' role.
 *
 * @param req The incoming Next.js request.
 * @returns A Next.js response.
 */
export async function POST(req: NextRequest) {
  // TODO: Implement Admin Role-Based Access Control (RBAC)
  // 1. Get the user's JWT from the request headers.
  // 2. Decode the JWT to get the user's role.
  // 3. If the role is not 'ADMIN', return a 403 Forbidden error.
  const isAdmin = true; // Placeholder for admin check
  if (!isAdmin) {
    return NextResponse.json({ message: '无权访问' }, { status: 403 });
  }

  try {
    const courseData = await req.json();

    // TODO: Validate the incoming courseData against a schema (e.g., using Zod).
    // This ensures that all required fields (title, description, price, etc.) are present and correctly formatted.

    // TODO: Save the new course data to the database.
    // const newCourse = await db.courses.create({ data: courseData });

    // For now, we'll just log it and return a mock response.
    console.log("Received new course data:", courseData);
    const newCourse = { id: `course_${Date.now()}`, ...courseData };

    return NextResponse.json({ message: '课程创建成功', course: newCourse }, { status: 201 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '创建课程失败';
    return NextResponse.json({ message: '服务器内部错误', error: errorMessage }, { status: 500 });
  }
}
