import { NextRequest, NextResponse } from 'next/server';

/**
 * 测试中间件的API路由
 * GET /api/test-middleware
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'API route reached - middleware should have intercepted this',
    timestamp: new Date().toISOString(),
    url: request.url
  });
}