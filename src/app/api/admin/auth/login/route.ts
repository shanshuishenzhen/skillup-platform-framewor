/**
 * 管理员登录API接口
 * POST /api/admin/auth/login
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { ErrorHandler, AppError, ErrorType } from '@/utils/errorHandler';

/**
 * 管理员用户接口定义
 */
interface AdminUser {
  id: string;
  username: string;
  email: string;
  real_name: string;
  role: string;
  permissions: string[];
  status: string;
  phone: string;
  department: string;
  position: string;
  created_at: string;
  updated_at: string;
}

/**
 * 管理员登录结果接口
 */
interface AdminLoginResult {
  success: boolean;
  user?: AdminUser;
  token?: string;
  message?: string;
  error?: string;
}

/**
 * 生成管理员JWT Token
 * @param adminId 管理员ID
 * @param phone 管理员手机号
 * @param role 管理员角色
 * @param permissions 权限列表
 * @returns JWT Token
 */
function generateAdminToken(adminId: string, phone: string, role: string, permissions: string[]): string {
  // 将数据库中的角色映射到RBAC枚举
  let rbacRole = 'ADMIN';
  if (role === 'super_admin') {
    rbacRole = 'SUPER_ADMIN';
  } else if (role === 'admin') {
    rbacRole = 'ADMIN';
  }

  const payload = {
    userId: adminId, // 使用userId字段以匹配RBAC中间件
    phone,
    role: rbacRole, // 使用RBAC枚举格式
    permissions,
    type: 'admin',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24小时过期
  };

  const secret = process.env.JWT_SECRET || 'your-secret-key';
  return jwt.sign(payload, secret);
}

/**
 * 管理员登录函数
 * @param phone 手机号
 * @param password 密码
 * @returns 登录结果
 */
async function loginAdmin(
  phone: string,
  password: string
): Promise<AdminLoginResult> {
  try {
    // 从admin_users表查询管理员用户（支持username或phone字段匹配）
    const { data: admin, error } = await supabaseAdmin
      .from('admin_users')
      .select('*')
      .or(`username.eq.${phone},phone.eq.${phone}`)
      .eq('status', 'active')
      .single();

    if (error || !admin) {
      return {
        success: false,
        message: '管理员账户不存在或已被禁用'
      };
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, admin.password_hash);
    if (!isPasswordValid) {
      return {
        success: false,
        message: '密码错误'
      };
    }

    // 生成JWT token
    const token = generateAdminToken(admin.id, admin.phone, admin.role, admin.permissions || []);

    // 构建管理员用户数据
    const adminUser: AdminUser = {
      id: admin.id,
      username: admin.username,
      email: admin.email,
      real_name: admin.real_name,
      role: admin.role,
      permissions: admin.permissions || [],
      status: admin.status,
      phone: admin.phone,
      department: admin.department,
      position: admin.position,
      created_at: admin.created_at,
      updated_at: admin.updated_at
    };

    // 更新最后登录时间和IP
    await supabaseAdmin
      .from('admin_users')
      .update({
        last_login_at: new Date().toISOString(),
        last_login_ip: '127.0.0.1', // 在实际应用中应该获取真实IP
        login_attempts: 0
      })
      .eq('id', admin.id);

    return {
      success: true,
      user: adminUser,
      token,
      message: '管理员登录成功'
    };
  } catch (error) {
    console.error('管理员登录过程中发生错误:', error);
    return {
      success: false,
      message: '登录失败，请稍后重试'
    };
  }
}

/**
 * 管理员登录接口
 * @param request HTTP请求对象
 * @returns 登录结果
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, password } = body;

    // 验证必填字段
    if (!phone || !password) {
      return NextResponse.json(
        { error: '手机号和密码不能为空' },
        { status: 400 }
      );
    }

    // 允许使用用户名或手机号登录，不强制验证手机号格式

    // 执行管理员登录
    const result = await loginAdmin(phone, password);

    if (result.success) {
      return NextResponse.json({
        success: true,
        user: result.user,
        token: result.token,
        message: result.message
      });
    } else {
      return NextResponse.json(
        { error: result.message },
        { status: 401 }
      );
    }
  } catch (error) {
    // 使用统一的错误处理机制
    if (error instanceof AppError) {
      return ErrorHandler.handleApiError(error);
    }
    
    // 处理未知错误
    const apiError = new AppError(
      '管理员登录失败',
      ErrorType.API_ERROR,
      500,
      'ADMIN_LOGIN_ERROR',
      { originalError: error instanceof Error ? error.message : String(error) }
    );
    
    return ErrorHandler.handleApiError(apiError);
  }
}