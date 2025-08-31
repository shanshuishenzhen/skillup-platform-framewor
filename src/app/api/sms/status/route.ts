import { NextRequest, NextResponse } from 'next/server';
import { getSmsServiceStatus } from '@/services/smsService';

/**
 * 获取短信服务状态
 * GET /api/sms/status
 */
export async function GET(request: NextRequest) {
  try {
    const status = await getSmsServiceStatus();
    
    return NextResponse.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('获取短信服务状态失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: '获取短信服务状态失败'
      },
      { status: 500 }
    );
  }
}
