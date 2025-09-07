/**
 * 认证中间件
 * 用于验证用户身份和权限
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClientWithAuth, getUser, isAdmin } from '@/lib/supabase/server';

/**
 * 验证用户是否已登录
 */
export async function requireAuth(request: NextRequest) {
  try {
    const user = await getUser(request);
    
    if (!user) {
      return NextResponse.json(
        { error: '未授权访问，请先登录' },
        { status: 401 }
      );
    }
    
    return { user, error: null };
  } catch (error) {
    console.error('认证验证失败:', error);
    return NextResponse.json(
      { error: '认证验证失败' },
      { status: 500 }
    );
  }
}

/**
 * 验证管理员权限
 */
export async function requireAdmin(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    
    if (authResult instanceof NextResponse) {
      return authResult; // 返回错误响应
    }
    
    const { user } = authResult;
    const isUserAdmin = await isAdmin(user.id);
    
    if (!isUserAdmin) {
      return NextResponse.json(
        { error: '需要管理员权限' },
        { status: 403 }
      );
    }
    
    return { user, error: null };
  } catch (error) {
    console.error('管理员权限验证失败:', error);
    return NextResponse.json(
      { error: '权限验证失败' },
      { status: 500 }
    );
  }
}

/**
 * 验证特定权限
 */
export async function requirePermission(
  request: NextRequest,
  resource: string,
  action: string
) {
  try {
    const authResult = await requireAuth(request);
    
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    
    const { user } = authResult;
    const hasPermission = await checkUserPermission(user.id, resource, action);
    
    if (!hasPermission) {
      return NextResponse.json(
        { error: `缺少权限: ${resource}:${action}` },
        { status: 403 }
      );
    }
    
    return { user, error: null };
  } catch (error) {
    console.error('权限验证失败:', error);
    return NextResponse.json(
      { error: '权限验证失败' },
      { status: 500 }
    );
  }
}

/**
 * 检查用户权限
 */
async function checkUserPermission(
  userId: string,
  resource: string,
  action: string
): Promise<boolean> {
  try {
    const supabase = await createServerSupabaseClientWithAuth();
    
    // 检查用户是否有直接权限
    const { data: userPermissions, error: userError } = await supabase
      .from('user_permissions')
      .select('*')
      .eq('user_id', userId)
      .eq('resource', resource)
      .eq('action', action)
      .eq('granted', true)
      .eq('is_active', true);
    
    if (userError) {
      console.error('查询用户权限失败:', userError);
      return false;
    }
    
    if (userPermissions && userPermissions.length > 0) {
      return true;
    }
    
    // 检查用户角色权限
    const { data: rolePermissions, error: roleError } = await supabase
      .from('user_roles')
      .select(`
        role_permissions!inner(
          resource,
          action,
          granted
        )
      `)
      .eq('user_id', userId)
      .eq('is_active', true)
      .eq('role_permissions.resource', resource)
      .eq('role_permissions.action', action)
      .eq('role_permissions.granted', true);
    
    if (roleError) {
      console.error('查询角色权限失败:', roleError);
      return false;
    }
    
    return rolePermissions && rolePermissions.length > 0;
  } catch (error) {
    console.error('检查用户权限异常:', error);
    return false;
  }
}

/**
 * 获取请求中的用户ID
 */
export async function getUserIdFromRequest(request: NextRequest): Promise<string | null> {
  try {
    const user = await getUser(request);
    return user?.id || null;
  } catch (error) {
    console.error('获取用户ID失败:', error);
    return null;
  }
}

/**
 * 验证API密钥
 */
export function validateApiKey(request: NextRequest): boolean {
  const apiKey = request.headers.get('x-api-key');
  const validApiKey = process.env.API_SECRET_KEY;
  
  return apiKey === validApiKey;
}

/**
 * 限流中间件
 */
const requestCounts = new Map<string, { count: number; resetTime: number }>();

export function rateLimit(
  request: NextRequest,
  maxRequests: number = 100,
  windowMs: number = 60000
): boolean {
  const clientIp = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
  const now = Date.now();
  const windowStart = now - windowMs;
  
  const clientData = requestCounts.get(clientIp);
  
  if (!clientData || clientData.resetTime < windowStart) {
    requestCounts.set(clientIp, { count: 1, resetTime: now });
    return true;
  }
  
  if (clientData.count >= maxRequests) {
    return false;
  }
  
  clientData.count++;
  return true;
}

/**
 * 验证JWT令牌
 */
export async function verifyToken(request: NextRequest): Promise<{ user: any; error: null } | NextResponse> {
  try {
    const user = await getUser(request);
    
    if (!user) {
      return NextResponse.json(
        { error: '无效的令牌' },
        { status: 401 }
      );
    }
    
    return { user, error: null };
  } catch (error) {
    console.error('令牌验证失败:', error);
    return NextResponse.json(
      { error: '令牌验证失败' },
      { status: 401 }
    );
  }
}