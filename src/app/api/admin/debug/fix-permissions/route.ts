import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * 修复管理员权限问题
 * @param request - 包含用户手机号的请求
 * @returns 修复结果
 */
export async function POST(request: NextRequest) {
  try {
    const { phone } = await request.json();

    if (!phone) {
      return NextResponse.json({
        success: false,
        error: '手机号不能为空'
      }, { status: 400 });
    }

    // 查询用户信息
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('phone', phone)
      .single();

    if (userError || !user) {
      return NextResponse.json({
        success: false,
        error: '用户不存在',
        phone,
        debug: { supabaseError: userError?.message }
      }, { status: 404 });
    }

    const fixActions = [];
    const updateData: {
      role?: string;
      status?: string;
      password?: string;
    } = {};

    // 检查并修复角色
    if (user.role !== 'admin') {
      updateData.role = 'admin';
      fixActions.push(`角色从 ${user.role} 修改为 admin`);
    }

    // 检查并修复账户状态
    if (user.status !== 'active') {
      updateData.status = 'active';
      fixActions.push('激活账户状态');
    }

    // 检查并修复密码（如果需要）
    const testPassword = '123456';
    const isPasswordValid = await bcrypt.compare(testPassword, user.password);
    
    if (!isPasswordValid) {
      const hashedPassword = await bcrypt.hash(testPassword, 12);
      updateData.password = hashedPassword;
      fixActions.push('重置密码为 123456');
    }

    // 执行更新
    if (Object.keys(updateData).length > 0) {
      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('phone', phone)
        .select('id, phone, name, role, status, updated_at')
        .single();

      if (updateError) {
        throw new Error(`更新用户失败: ${updateError.message}`);
      }

      return NextResponse.json({
        success: true,
        message: '权限修复完成',
        fixActions,
        user: {
          ...updatedUser,
          isActive: updatedUser.status === 'active',
          updatedAt: updatedUser.updated_at
        },
        changes: updateData
      });
    } else {
      return NextResponse.json({
        success: true,
        message: '用户权限正常，无需修复',
        user: {
          id: user.id,
          phone: user.phone,
          name: user.name,
          role: user.role,
          isActive: user.status === 'active'
        },
        fixActions: ['无需修复']
      });
    }

  } catch (error) {
    console.error('修复用户权限时发生错误:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorType = error instanceof Error ? error.constructor.name : 'Unknown';
    return NextResponse.json({
      success: false,
      error: '服务器内部错误: ' + errorMessage,
      debug: {
        errorType,
        errorMessage
      }
    }, { status: 500 });
  }
}