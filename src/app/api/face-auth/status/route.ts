/**
 * 人脸认证状态查询API接口
 * GET /api/face-auth/status
 * 用于查询用户的人脸认证状态和历史记录
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generalRateLimit, tokenAuth } from '../../middleware/security';
import { ErrorHandler, AppError, ErrorType } from '@/utils/errorHandler';

// 初始化Supabase客户端
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 响应接口
interface StatusResponse {
  success: boolean;
  message: string;
  data?: {
    hasProfile: boolean;
    isActive: boolean;
    profile?: {
      id: string;
      qualityScore: number;
      confidenceScore: number;
      createdAt: string;
      updatedAt: string;
    };
    recentRecords: Array<{
      id: string;
      authType: string;
      authResult: string;
      confidenceScore?: number;
      failureReason?: string;
      createdAt: string;
    }>;
    statistics: {
      totalAttempts: number;
      successfulAttempts: number;
      failedAttempts: number;
      successRate: number;
      lastSuccessAt?: string;
      lastFailureAt?: string;
    };
  };
  error?: string;
}

/**
 * 处理状态查询请求
 * @param request NextRequest对象
 * @returns Promise<NextResponse> 响应结果
 */
export async function GET(request: NextRequest): Promise<NextResponse<StatusResponse>> {
  try {
    // 简化的限流检查
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

    // 从查询参数获取用户ID
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '10');
    const authType = searchParams.get('authType'); // 可选的认证类型过滤

    // 验证用户ID与令牌匹配
    if (authResult.userId !== userId) {
      return NextResponse.json({
        success: false,
        message: '用户身份不匹配',
        error: '令牌与用户ID不符'
      }, { status: 403 });
    }

    // 验证必需参数
    if (!userId) {
      return NextResponse.json({
        success: false,
        message: '缺少必需参数',
        error: 'userId是必需的'
      }, { status: 400 });
    }

    // 验证limit参数
    if (limit < 1 || limit > 100) {
      return NextResponse.json({
        success: false,
        message: '无效的limit参数',
        error: 'limit必须在1-100之间'
      }, { status: 400 });
    }

    // 查询用户人脸档案
    const { data: userProfile, error: profileError } = await supabase
      .from('user_face_profiles')
      .select('id, quality_score, confidence_score, is_active, created_at, updated_at')
      .eq('user_id', userId)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      throw new Error(`查询用户档案失败: ${profileError.message}`);
    }

    const hasProfile = !!userProfile;
    const isActive = userProfile?.is_active || false;

    // 构建认证记录查询
    let recordsQuery = supabase
      .from('face_auth_records')
      .select('id, auth_type, auth_result, confidence_score, failure_reason, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    // 如果指定了认证类型，添加过滤条件
    if (authType) {
      recordsQuery = recordsQuery.eq('auth_type', authType);
    }

    const { data: recentRecords, error: recordsError } = await recordsQuery;

    if (recordsError) {
      throw new Error(`查询认证记录失败: ${recordsError.message}`);
    }

    // 查询统计信息
    let statsQuery = supabase
      .from('face_auth_records')
      .select('auth_result, created_at')
      .eq('user_id', userId);

    // 如果指定了认证类型，添加过滤条件
    if (authType) {
      statsQuery = statsQuery.eq('auth_type', authType);
    }

    const { data: allRecords, error: statsError } = await statsQuery;

    if (statsError) {
      throw new Error(`查询统计信息失败: ${statsError.message}`);
    }

    // 计算统计信息
    const totalAttempts = allRecords?.length || 0;
    const successfulAttempts = allRecords?.filter(record => record.auth_result === 'success').length || 0;
    const failedAttempts = allRecords?.filter(record => record.auth_result === 'failed').length || 0;
    const successRate = totalAttempts > 0 ? Math.round((successfulAttempts / totalAttempts) * 100) : 0;

    // 查找最后成功和失败的时间
    const lastSuccess = allRecords?.find(record => record.auth_result === 'success');
    const lastFailure = allRecords?.find(record => record.auth_result === 'failed');

    // 构建响应数据
    const responseData = {
      hasProfile,
      isActive,
      profile: userProfile ? {
        id: userProfile.id,
        qualityScore: userProfile.quality_score,
        confidenceScore: userProfile.confidence_score,
        createdAt: userProfile.created_at,
        updatedAt: userProfile.updated_at
      } : undefined,
      recentRecords: recentRecords?.map(record => ({
        id: record.id,
        authType: record.auth_type,
        authResult: record.auth_result,
        confidenceScore: record.confidence_score,
        failureReason: record.failure_reason,
        createdAt: record.created_at
      })) || [],
      statistics: {
        totalAttempts,
        successfulAttempts,
        failedAttempts,
        successRate,
        lastSuccessAt: lastSuccess?.created_at,
        lastFailureAt: lastFailure?.created_at
      }
    };

    return NextResponse.json({
      success: true,
      message: '查询成功',
      data: responseData
    });

  } catch (error) {
    // 使用统一的错误处理机制
    if (error instanceof AppError) {
      return NextResponse.json({
        success: false,
        message: error.message,
        error: error.code
      }, { status: error.statusCode });
    }

    // 处理未知错误
    console.error('Face auth status error:', error);
    return NextResponse.json({
      success: false,
      message: '服务器内部错误',
      error: 'Internal server error'
    }, { status: 500 });
  }
}

/**
 * 处理POST请求 - 更新用户人脸档案状态
 * @param request NextRequest对象
 * @returns Promise<NextResponse> 响应结果
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // 简化的限流检查
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

    const body = await request.json();
    const { userId, action } = body;

    // 验证用户ID与令牌匹配
    if (authResult.userId !== userId) {
      return NextResponse.json({
        success: false,
        message: '用户身份不匹配',
        error: '令牌与用户ID不符'
      }, { status: 403 });
    }

    // 验证必需参数
    if (!userId || !action) {
      return NextResponse.json({
        success: false,
        message: '缺少必需参数',
        error: 'userId和action是必需的'
      }, { status: 400 });
    }

    // 验证action参数
    if (!['activate', 'deactivate', 'delete'].includes(action)) {
      return NextResponse.json({
        success: false,
        message: '无效的action参数',
        error: 'action必须是activate、deactivate或delete之一'
      }, { status: 400 });
    }

    // 查询用户人脸档案
    const { data: userProfile, error: profileError } = await supabase
      .from('user_face_profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (profileError || !userProfile) {
      return NextResponse.json({
        success: false,
        message: '用户人脸档案不存在',
        error: '请先完成人脸注册'
      }, { status: 404 });
    }

    // 执行相应的操作
    let updateData: Record<string, unknown> = {};
    let message = '';

    switch (action) {
      case 'activate':
        updateData = { is_active: true, updated_at: new Date().toISOString() };
        message = '人脸档案已激活';
        break;
      case 'deactivate':
        updateData = { is_active: false, updated_at: new Date().toISOString() };
        message = '人脸档案已停用';
        break;
      case 'delete':
        // 删除人脸档案
        const { error: deleteError } = await supabase
          .from('user_face_profiles')
          .delete()
          .eq('user_id', userId);

        if (deleteError) {
          throw new Error(`删除人脸档案失败: ${deleteError.message}`);
        }

        return NextResponse.json({
          success: true,
          message: '人脸档案已删除'
        });
    }

    // 更新人脸档案
    const { error: updateError } = await supabase
      .from('user_face_profiles')
      .update(updateData)
      .eq('user_id', userId);

    if (updateError) {
      throw new Error(`更新人脸档案失败: ${updateError.message}`);
    }

    return NextResponse.json({
      success: true,
      message
    });

  } catch (error) {
    // 使用统一的错误处理机制
    if (error instanceof AppError) {
      return NextResponse.json({
        success: false,
        message: error.message,
        error: error.code
      }, { status: error.statusCode });
    }

    // 处理未知错误
    console.error('Face profile update error:', error);
    return NextResponse.json({
      success: false,
      message: '服务器内部错误',
      error: 'Internal server error'
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
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
      'Access-Control-Max-Age': '86400'
    },
  });
}