/**
 * Supabase服务端客户端配置
 * 用于服务端API路由中的数据库操作
 */

import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

/**
 * 创建服务端Supabase客户端（使用Service Role Key）
 * 用于需要管理员权限的操作
 */
export function createServerSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

/**
 * 创建带用户会话的服务端Supabase客户端
 * 用于需要用户认证的操作
 */
export async function createServerSupabaseClientWithAuth() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
  }

  const cookieStore = cookies();
  
  return createClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: any) {
        cookieStore.set({ name, value, ...options });
      },
      remove(name: string, options: any) {
        cookieStore.set({ name, value: '', ...options });
      },
    },
  });
}

/**
 * 默认导出服务端客户端
 */
export const supabase = createServerSupabaseClient();

/**
 * 导出createClient以兼容其他导入
 */
export { createClient } from '@supabase/supabase-js';

/**
 * 验证用户会话
 * @param request Request对象
 * @returns 用户信息或null
 */
export async function getUser(request?: Request) {
  try {
    const client = await createServerSupabaseClientWithAuth();
    const { data: { user }, error } = await client.auth.getUser();
    
    if (error || !user) {
      return null;
    }
    
    return user;
  } catch (error) {
    console.error('获取用户会话失败:', error);
    return null;
  }
}

/**
 * 验证管理员权限
 * @param userId 用户ID
 * @returns 是否为管理员
 */
export async function isAdmin(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('admin_users')
      .select('id')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();
    
    return !error && !!data;
  } catch (error) {
    console.error('验证管理员权限失败:', error);
    return false;
  }
}

/**
 * 获取用户角色
 * @param userId 用户ID
 * @returns 用户角色数组
 */
export async function getUserRoles(userId: string): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('is_active', true);
    
    if (error || !data) {
      return [];
    }
    
    return data.map(item => item.role);
  } catch (error) {
    console.error('获取用户角色失败:', error);
    return [];
  }
}