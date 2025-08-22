/**
 * Supabase客户端工具
 * 提供统一的Supabase客户端创建和配置管理
 */

import { createClient } from '@supabase/supabase-js';
import { getEnvConfig } from './envConfig';

/**
 * 数据库表类型定义
 */
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          auth_user_id: string;
          email: string;
          first_name: string;
          last_name: string;
          full_name: string;
          date_of_birth?: string;
          phone_number?: string;
          avatar_url?: string;
          bio?: string;
          location?: string;
          website?: string;
          social_links?: Record<string, any>;
          preferences?: Record<string, any>;
          role: 'student' | 'instructor' | 'admin';
          status: 'active' | 'inactive' | 'suspended';
          email_verified: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          auth_user_id: string;
          email: string;
          first_name: string;
          last_name: string;
          full_name: string;
          date_of_birth?: string;
          phone_number?: string;
          avatar_url?: string;
          bio?: string;
          location?: string;
          website?: string;
          social_links?: Record<string, any>;
          preferences?: Record<string, any>;
          role?: 'student' | 'instructor' | 'admin';
          status?: 'active' | 'inactive' | 'suspended';
          email_verified?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          auth_user_id?: string;
          email?: string;
          first_name?: string;
          last_name?: string;
          full_name?: string;
          date_of_birth?: string;
          phone_number?: string;
          avatar_url?: string;
          bio?: string;
          location?: string;
          website?: string;
          social_links?: Record<string, any>;
          preferences?: Record<string, any>;
          role?: 'student' | 'instructor' | 'admin';
          status?: 'active' | 'inactive' | 'suspended';
          email_verified?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      courses: {
        Row: {
          id: string;
          title: string;
          description: string;
          content?: Record<string, any>;
          difficulty: 'beginner' | 'intermediate' | 'advanced';
          duration: number;
          price: number;
          currency: string;
          thumbnail_url?: string;
          video_url?: string;
          instructor_id: string;
          category_id?: string;
          tags?: string[];
          status: 'draft' | 'published' | 'archived';
          enrollment_count: number;
          rating: number;
          review_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description: string;
          content?: Record<string, any>;
          difficulty?: 'beginner' | 'intermediate' | 'advanced';
          duration: number;
          price: number;
          currency?: string;
          thumbnail_url?: string;
          video_url?: string;
          instructor_id: string;
          category_id?: string;
          tags?: string[];
          status?: 'draft' | 'published' | 'archived';
          enrollment_count?: number;
          rating?: number;
          review_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string;
          content?: Record<string, any>;
          difficulty?: 'beginner' | 'intermediate' | 'advanced';
          duration?: number;
          price?: number;
          currency?: string;
          thumbnail_url?: string;
          video_url?: string;
          instructor_id?: string;
          category_id?: string;
          tags?: string[];
          status?: 'draft' | 'published' | 'archived';
          enrollment_count?: number;
          rating?: number;
          review_count?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}

/**
 * 创建Supabase客户端（服务端使用）
 * 使用服务角色密钥，具有完整的数据库访问权限
 */
export function createServerClient() {
  const config = getEnvConfig();
  const supabaseConfig = config.getSupabase();
  
  if (!supabaseConfig.url || !supabaseConfig.serviceRoleKey) {
    throw new Error('Supabase configuration is missing. Please check your environment variables.');
  }
  
  return createClient<Database>(supabaseConfig.url, supabaseConfig.serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

/**
 * 创建Supabase客户端（客户端使用）
 * 使用匿名密钥，受RLS策略限制
 */
export function createBrowserClient() {
  const config = getEnvConfig();
  const supabaseConfig = config.getSupabase();
  
  if (!supabaseConfig.url || !supabaseConfig.anonKey) {
    throw new Error('Supabase configuration is missing. Please check your environment variables.');
  }
  
  return createClient<Database>(supabaseConfig.url, supabaseConfig.anonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true
    }
  });
}

/**
 * 通用客户端创建函数（根据环境自动选择）
 */
export function createClient() {
  // 在服务端环境使用服务角色密钥
  if (typeof window === 'undefined') {
    return createServerClient();
  }
  
  // 在客户端环境使用匿名密钥
  return createBrowserClient();
}

/**
 * 获取当前用户信息
 */
export async function getCurrentUser() {
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error) {
    throw new Error(`Failed to get current user: ${error.message}`);
  }
  
  return user;
}

/**
 * 验证用户会话
 */
export async function validateSession(token: string) {
  const supabase = createServerClient();
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error) {
    return { valid: false, user: null, error: error.message };
  }
  
  return { valid: true, user, error: null };
}

/**
 * 刷新用户会话
 */
export async function refreshSession(refreshToken: string) {
  const supabase = createClient();
  const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });
  
  if (error) {
    throw new Error(`Failed to refresh session: ${error.message}`);
  }
  
  return data;
}

/**
 * 登出用户
 */
export async function signOut() {
  const supabase = createClient();
  const { error } = await supabase.auth.signOut();
  
  if (error) {
    throw new Error(`Failed to sign out: ${error.message}`);
  }
}

/**
 * 默认导出
 */
export default {
  createClient,
  createServerClient,
  createBrowserClient,
  getCurrentUser,
  validateSession,
  refreshSession,
  signOut
};