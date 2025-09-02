import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/database';

/**
 * Supabase 客户端配置
 * 用于连接和操作 Supabase 数据库
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * 创建 Supabase 客户端实例
 * @description 用于前端应用的 Supabase 客户端，使用匿名密钥
 * @returns Supabase 客户端实例
 */
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

/**
 * 服务端 Supabase 客户端配置
 * 用于服务端操作，具有更高权限
 */
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * 创建服务端 Supabase 客户端实例
 * @description 用于服务端操作的 Supabase 客户端，使用服务角色密钥
 * @returns 服务端 Supabase 客户端实例
 */
export const supabaseAdmin = createClient<Database>(
  supabaseUrl,
  supabaseServiceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

/**
 * 获取当前用户信息
 * @description 获取当前登录用户的信息
 * @returns Promise<User | null> 用户信息或 null
 */
export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

/**
 * 检查用户是否已登录
 * @description 检查当前用户是否已经登录
 * @returns Promise<boolean> 是否已登录
 */
export const isAuthenticated = async (): Promise<boolean> => {
  const user = await getCurrentUser();
  return !!user;
};

/**
 * 用户登出
 * @description 登出当前用户
 * @returns Promise<void>
 */
export const signOut = async (): Promise<void> => {
  await supabase.auth.signOut();
};

/**
 * 获取用户会话
 * @description 获取当前用户的会话信息
 * @returns Promise<Session | null> 会话信息或 null
 */
export const getSession = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
};

export default supabase;