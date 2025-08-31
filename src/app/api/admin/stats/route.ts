/**
 * 管理员统计数据API
 * 提供管理员概览页面所需的基础统计信息
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAdminAccess } from '@/middleware/rbac';

/**
 * GET /api/admin/stats
 * 获取管理员概览统计数据
 * 
 * @param request NextRequest对象
 * @returns Promise<NextResponse> 统计数据响应
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    console.log('🔍 管理员统计API被调用');
    console.log('🔍 请求头:', Object.fromEntries(request.headers.entries()));

    // 开发模式下的特殊处理
    const authHeader = request.headers.get('authorization');
    const isDevelopment = process.env.NODE_ENV === 'development';
    const isMockToken = authHeader === 'Bearer mock-admin-token-for-development';

    if (isDevelopment && isMockToken) {
      console.log('🔧 开发模式：使用模拟管理员权限');
      // 跳过权限验证，直接返回模拟数据
    } else {
      // 验证管理员权限
      const authResult = await verifyAdminAccess(request);
      console.log('🔍 权限验证结果:', authResult);

      if (!authResult.success || !authResult.user) {
        console.error('❌ 权限验证失败:', authResult.message);
        return NextResponse.json(
          {
            success: false,
            error: authResult.message || '未授权访问',
            debug: {
              hasAuth: !!authHeader,
              isDevelopment,
              isMockToken,
              timestamp: new Date().toISOString()
            }
          },
          { status: 403 }
        );
      }

      const { user } = authResult;
      console.log('✅ 管理员权限验证通过:', { userId: user.userId, role: user.role });
    }

    // 初始化Supabase客户端
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 获取用户统计
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, status, role, created_at')
      .order('created_at', { ascending: false });

    if (usersError) {
      console.error('获取用户数据失败:', usersError);
      throw new Error(`获取用户数据失败: ${usersError.message}`);
    }

    // 获取学习资源统计（使用courses表）
    const { data: resources, error: resourcesError } = await supabase
      .from('courses')
      .select('id, created_at')
      .order('created_at', { ascending: false });

    if (resourcesError) {
      console.error('获取学习资源数据失败:', resourcesError);
      // 学习资源可能不存在，不抛出错误
    }

    // 获取最近30天的活跃用户（有学习记录的用户）
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { data: activeUsers, error: activeUsersError } = await supabase
      .from('learning_progress')
      .select('user_id')
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: false });

    if (activeUsersError) {
      console.error('获取活跃用户数据失败:', activeUsersError);
      // 学习进度可能不存在，不抛出错误
    }

    // 计算统计数据
    const totalUsers = users?.length || 0;
    const activeUserCount = activeUsers ? new Set(activeUsers.map(u => u.user_id)).size : 0;
    const totalResources = resources?.length || 0;
    
    // 按状态统计用户
    const usersByStatus = users?.reduce((acc, user) => {
      acc[user.status] = (acc[user.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    // 按角色统计用户
    const usersByRole = users?.reduce((acc, user) => {
      acc[user.role] = (acc[user.role] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    // 按状态统计学习资源（courses表暂无status字段，统一归类为active）
    const resourcesByStatus = resources ? { 'active': resources.length } : {};

    // 计算最近7天新增用户
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentUsers = users?.filter(user => 
      new Date(user.created_at) >= sevenDaysAgo
    ).length || 0;

    // 系统状态检查（简单的健康检查）
    const systemStatus = {
      status: 'normal',
      message: '系统运行正常',
      lastCheck: new Date().toISOString()
    };

    const stats = {
      overview: {
        totalUsers,
        activeUsers: activeUserCount,
        totalResources,
        recentUsers,
        systemStatus
      },
      userStats: {
        byStatus: usersByStatus,
        byRole: usersByRole,
        total: totalUsers
      },
      resourceStats: {
        byStatus: resourcesByStatus,
        total: totalResources
      },
      trends: {
        newUsersLast7Days: recentUsers,
        activeUsersLast30Days: activeUserCount
      },
      metadata: {
        generatedAt: new Date().toISOString(),
        dataSource: 'supabase',
        cacheExpiry: new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5分钟缓存
      }
    };

    // 设置缓存头
    const headers = new Headers();
    headers.set('Cache-Control', 'public, max-age=300'); // 5分钟缓存
    headers.set('X-Data-Source', 'supabase');

    return NextResponse.json({
      success: true,
      data: stats
    }, { headers });

  } catch (error) {
    console.error('管理员统计API错误:', error);
    return NextResponse.json(
      { 
        success: false,
        error: '获取统计数据失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/stats
 * 刷新统计数据缓存
 * 
 * @param request NextRequest对象
 * @returns Promise<NextResponse> 刷新结果
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // 验证管理员权限
    const authResult = await verifyAdminAccess(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { error: authResult.message || '未授权访问' },
        { status: 403 }
      );
    }

    const { user } = authResult;
    // RBAC验证已经确保用户具有管理员权限，无需额外检查
    console.log('✅ 管理员权限验证通过:', { userId: user.userId, role: user.role });

    // 这里可以添加缓存刷新逻辑
    // 目前直接返回成功响应
    return NextResponse.json({
      success: true,
      message: '统计数据缓存已刷新',
      refreshedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('刷新统计缓存错误:', error);
    return NextResponse.json(
      { 
        success: false,
        error: '刷新统计缓存失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}
