import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';

/**
 * 验证管理员访问权限
 * @param request - Next.js请求对象
 * @returns Promise<boolean> - 返回是否具有管理员权限
 * @description 检查请求头中的Authorization token，验证用户是否具有管理员权限
 * @example
 * const hasAccess = await verifyAdminAccess(request);
 * if (!hasAccess) {
 *   return new Response('Unauthorized', { status: 401 });
 * }
 */
export async function verifyAdminAccess(request: NextRequest): Promise<boolean> {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return false;
    }
    
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    if (!token) {
      return false;
    }
    
    // 验证JWT token
    const secret = process.env.JWT_SECRET || 'your-secret-key';
    const decoded = jwt.verify(token, secret) as any;
    
    // 检查用户角色是否为管理员
    return decoded && (decoded.role === 'admin' || decoded.isAdmin === true);
  } catch (error) {
    console.error('Admin access verification failed:', error);
    return false;
  }
}

/**
 * 从请求中获取用户信息
 * @param request - Next.js请求对象
 * @returns Promise<any | null> - 返回用户信息或null
 * @description 解析JWT token并返回用户信息
 * @example
 * const user = await getUserFromRequest(request);
 * if (user) {
 *   console.log('User ID:', user.id);
 * }
 */
export async function getUserFromRequest(request: NextRequest): Promise<any | null> {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    
    const token = authHeader.substring(7);
    
    if (!token) {
      return null;
    }
    
    const secret = process.env.JWT_SECRET || 'your-secret-key';
    const decoded = jwt.verify(token, secret);
    
    return decoded;
  } catch (error) {
    console.error('Failed to get user from request:', error);
    return null;
  }
}

/**
 * 验证用户是否已认证
 * @param request - Next.js请求对象
 * @returns Promise<boolean> - 返回是否已认证
 * @description 检查用户是否具有有效的认证token
 * @example
 * const isAuthenticated = await verifyAuthentication(request);
 * if (!isAuthenticated) {
 *   return new Response('Please login', { status: 401 });
 * }
 */
export async function verifyAuthentication(request: NextRequest): Promise<boolean> {
  try {
    const user = await getUserFromRequest(request);
    return user !== null;
  } catch (error) {
    console.error('Authentication verification failed:', error);
    return false;
  }
}