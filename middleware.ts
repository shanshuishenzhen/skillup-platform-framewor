import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  console.log('🔥 MIDDLEWARE EXECUTED:', request.nextUrl.pathname);
  
  // 对所有请求添加自定义头部
  const response = NextResponse.next();
  response.headers.set('X-Middleware-Test', 'working');
  
  return response;
}

// 最简单的配置
export const config = {
  matcher: '/((?!_next/static|_next/image|favicon.ico).*)',
};