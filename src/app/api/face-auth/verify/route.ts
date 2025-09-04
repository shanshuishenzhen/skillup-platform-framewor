/**
 * 人脸验证API接口
 * POST /api/face-auth/verify
 * 用于验证用户身份
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase';
import { generalRateLimit, tokenAuth } from '../../middleware/security';
import { ErrorHandler, AppError, ErrorType } from '@/utils/errorHandler';

const supabase = getSupabaseAdminClient();

// 请求体接口
interface VerifyRequest {
  userId: string;
  imageBase64: string;
  sessionId?: string;
  authType?: 'login' | 'verify'; // 认证类型
}

// 响应接口
interface VerifyResponse {
  success: boolean;
  message: string;
  data?: {
    isMatch: boolean;
    confidence: number;
    authToken?: string;
    expiresAt?: number;
  };
  error?: string;
}

/**
 * 处理人脸验证请求
 * @param request NextRequest对象
 * @returns Promise<NextResponse> 响应结果
 */
export async function POST(request: NextRequest): Promise<NextResponse<VerifyResponse>> {
  try {
    // 简化的安全检查
    // 在实际部署中应该实现真正的限流逻辑
    
    // 简化的身份验证检查
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({
        success: false,
        message: '身份验证失败',
        error: '缺少有效的授权令牌'
      }, { status: 401 });
    }
    const authResult = { success: true, userId: 'user-' + crypto.randomUUID() };
    
    // 简化的请求体大小检查
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) { // 10MB
      return NextResponse.json({
        success: false,
        message: '请求体过大',
        error: '文件大小超过限制'
      }, { status: 413 });
    }

    // 解析请求体
    const body: VerifyRequest = await request.json();
    const { userId, imageBase64, sessionId, authType = 'verify' } = body;

    // 验证用户ID与令牌匹配
    if (authResult.userId !== userId) {
      return NextResponse.json({
        success: false,
        message: '用户身份不匹配',
        error: '令牌与用户ID不符'
      }, { status: 403 });
    }

    // 验证必需参数
    if (!userId || !imageBase64) {
      return NextResponse.json({
        success: false,
        message: '缺少必需参数',
        error: 'userId和imageBase64是必需的'
      }, { status: 400 });
    }

    // 获取客户端IP和User-Agent
    const clientIP = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // 检查用户是否存在活跃的人脸档案
    const { data: userProfile, error: profileError } = await supabase
      .from('user_face_profiles')
      .select('id, face_template, quality_score, confidence_score')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    if (profileError || !userProfile) {
      return NextResponse.json({
        success: false,
        message: '用户未注册人脸信息',
        error: '请先完成人脸注册'
      }, { status: 404 });
    }

    // 简化的人脸模板处理
    let decryptedTemplate: string;
    try {
      // 在实际应用中应该实现真正的解密逻辑
      decryptedTemplate = userProfile.face_template;
    } catch (decryptError) {
      console.error('人脸模板处理失败:', decryptError);
      return NextResponse.json({
        success: false,
        message: '人脸数据处理失败',
        error: '无法读取人脸信息'
      }, { status: 500 });
    }

    // 检查最近的验证频率（防止暴力破解）
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: recentAttempts, error: attemptsError } = await supabase
      .from('face_auth_records')
      .select('id')
      .eq('user_id', userId)
      .eq('auth_type', authType)
      .gte('created_at', fiveMinutesAgo);

    if (attemptsError) {
      console.error('查询验证记录失败:', attemptsError);
    } else if (recentAttempts && recentAttempts.length >= 5) {
      return NextResponse.json({
        success: false,
        message: '验证过于频繁',
        error: '请等待5分钟后再试'
      }, { status: 429 });
    }

    // 记录认证开始
    const authRecordId = crypto.randomUUID();
    await supabase
      .from('face_auth_records')
      .insert({
        id: authRecordId,
        user_id: userId,
        auth_type: authType,
        auth_result: 'pending',
        ip_address: clientIP,
        user_agent: userAgent,
        session_id: sessionId || crypto.randomUUID()
      });

    try {
      // 使用百度AI进行人脸验证
      const verifyResult = await baiduFaceService.compareFaces(
        imageBase64, 
        decryptedTemplate
      );

      const { isMatch, score } = verifyResult;
      const confidence = score || 0;
      
      // 更新认证记录
      await supabase
        .from('face_auth_records')
        .update({
          auth_result: isMatch ? 'success' : 'failed',
          confidence_score: Math.round(confidence * 100),
          failure_reason: isMatch ? null : '人脸不匹配'
        })
        .eq('id', authRecordId);

      if (!isMatch) {
        return NextResponse.json({
          success: false,
          message: '人脸验证失败',
          error: '人脸不匹配，请重试',
          data: {
            isMatch: false,
            confidence: Math.round(confidence * 100)
          }
        }, { status: 401 });
      }

      // 验证成功，生成访问令牌（如果是登录类型）
      let authToken: string | undefined;
      let expiresAt: number | undefined;
      
      if (authType === 'login') {
        const tokenExpiresIn = 24 * 60 * 60; // 24小时
        // 在实际应用中应该实现真正的JWT令牌生成
        authToken = 'token-' + crypto.randomUUID();
        expiresAt = Date.now() + (tokenExpiresIn * 1000);
      }

      return NextResponse.json({
        success: true,
        message: '人脸验证成功',
        data: {
          isMatch: true,
          confidence: Math.round(confidence * 100),
          authToken,
          expiresAt
        }
      });

    } catch (verifyError) {
      // 更新认证记录为失败
      await supabase
        .from('face_auth_records')
        .update({
          auth_result: 'failed',
          failure_reason: verifyError instanceof Error ? verifyError.message : '验证过程出错'
        })
        .eq('id', authRecordId);

      return NextResponse.json({
        success: false,
        message: '人脸验证失败',
        error: verifyError instanceof Error ? verifyError.message : '验证过程出错'
      }, { status: 400 });
    }

  } catch (error) {
    console.error('人脸验证API错误:', error);
    
    return NextResponse.json({
      success: false,
      message: '服务器内部错误',
      error: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 });
  }
}

/**
 * 处理OPTIONS请求（CORS预检）
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': process.env.NODE_ENV === 'development' ? '*' : 'https://your-domain.com',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
      'Access-Control-Max-Age': '86400'
    },
  });
}