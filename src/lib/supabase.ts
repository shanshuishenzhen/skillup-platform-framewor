/**
 * Supabase客户端配置文件
 * 提供前端和后端的Supabase客户端实例
 */

import { createClient } from '@supabase/supabase-js'

// 获取环境变量
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

/**
 * 前端Supabase客户端
 * 使用匿名密钥，适用于客户端操作
 * @returns Supabase客户端实例
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

/**
 * 后端Supabase客户端
 * 使用服务角色密钥，具有管理员权限，仅用于服务端
 * @returns Supabase服务端客户端实例
 */
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

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