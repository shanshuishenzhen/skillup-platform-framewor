/**
 * Supabase客户端配置文件
 * 提供前端和后端的Supabase客户端实例
 */

import { createClient } from '@supabase/supabase-js'

// 导出 createClient 函数供其他模块使用
export { createClient }

// 获取环境变量
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://test.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test-anon-key'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-key'

// 客户端实例缓存
let _supabase: ReturnType<typeof createClient> | null = null
let _supabaseAdmin: ReturnType<typeof createClient> | null = null

/**
 * 获取前端Supabase客户端（单例模式）
 * 用于客户端操作，使用匿名密钥
 * @returns Supabase客户端实例
 */
export function getSupabaseClient() {
  if (!_supabase) {
    _supabase = createClient(supabaseUrl, supabaseAnonKey)
  }
  return _supabase
}

/**
 * 获取后端Supabase客户端（单例模式）
 * 用于服务端操作，使用服务角色密钥
 * @returns Supabase服务端客户端实例
 */
export function getSupabaseAdminClient() {
  if (!_supabaseAdmin) {
    _supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
  }
  return _supabaseAdmin
}

/**
 * 前端Supabase客户端（向后兼容）
 * 用于客户端操作，使用匿名密钥
 * @returns Supabase客户端实例
 */
export const supabase = getSupabaseClient()

/**
 * 后端Supabase客户端（向后兼容）
 * 用于服务端操作，使用服务角色密钥
 * @returns Supabase服务端客户端实例
 */
export const supabaseAdmin = getSupabaseAdminClient()

/**
 * 数据库表名常量
 */
export const TABLES = {
  USERS: 'users',
  COURSES: 'courses',
  INSTRUCTORS: 'instructors',
  CHAPTERS: 'chapters',
  VIDEOS: 'videos',
  ENROLLMENTS: 'enrollments',
  ORDERS: 'orders',
  ORDER_ITEMS: 'order_items',
  FACE_RECORDS: 'face_records'
} as const

/**
 * 用户类型枚举
 */
export enum UserType {
  GUEST = 'guest',
  REGISTERED = 'registered',
  PREMIUM = 'premium'
}

/**
 * 课程难度枚举
 */
export enum CourseDifficulty {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced'
}

/**
 * 订单状态枚举
 */
export enum OrderStatus {
  PENDING = 'pending',
  PAID = 'paid',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded'
}