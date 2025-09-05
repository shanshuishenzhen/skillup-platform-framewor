/**
 * 管理员注册API路由
 * POST /api/admin/auth/register - 管理员注册
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import bcrypt from 'bcryptjs';

/**
 * 管理员注册
 * @param request HTTP请求对象
 * @returns 注册结果
 */
export async function POST(request: NextRequest) {
  try {
    const { name, phone, email, password } = await request.json();

    // 验证必填字段
    if (!name || !phone || !email || !password) {
      return NextResponse.json(
        { error: '姓名、手机号、邮箱和密码为必填项' },
        { status: 400 }
      );
    }

    // 验证手机号格式
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(phone)) {
      return NextResponse.json(
        { error: '手机号格式不正确' },
        { status: 400 }
      );
    }

    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: '邮箱格式不正确' },
        { status: 400 }
      );
    }

    // 检查手机号是否已存在
    const { data: existingUser, error: checkError } = await supabaseAdmin
      .from('admin_users')
      .select('id')
      .eq('phone', phone)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('检查管理员是否存在时发生错误:', checkError);
      return NextResponse.json(
        { error: '服务器内部错误' },
        { status: 500 }
      );
    }

    if (existingUser) {
      return NextResponse.json(
        { error: '该手机号已被注册' },
        { status: 409 }
      );
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 12);

    // 创建管理员用户
    const { data: newUser, error: createError } = await supabaseAdmin
      .from('admin_users')
      .insert({
        username: phone, // 使用手机号作为用户名
        real_name: name,
        phone,
        email,
        password_hash: hashedPassword,
        role: 'admin',
        permissions: ['exam:read', 'exam:write', 'user:read', 'user:write'],
        status: 'active',
        department: '系统管理部',
        position: '系统管理员'
      })
      .select('id, username, real_name, phone, email, role, status, created_at')
      .single();

    if (createError) {
      console.error('创建管理员用户失败:', createError);
      return NextResponse.json(
        { error: '创建管理员账户失败' },
        { status: 500 }
      );
    }

    console.log('管理员注册成功:', { userId: newUser.id, phone });

    return NextResponse.json({
      success: true,
      message: '管理员注册成功',
      data: {
        user: {
          id: newUser.id,
          name: newUser.name,
          phone: newUser.phone,
          email: newUser.email,
          role: newUser.role,
          userType: newUser.user_type,
          status: newUser.status,
          createdAt: newUser.created_at
        }
      }
    });

  } catch (error) {
    console.error('管理员注册时发生错误:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}