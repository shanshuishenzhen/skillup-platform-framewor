import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * 检查用户在数据库中的角色信息
 * @param request - 包含用户手机号的请求
 * @returns 用户的角色信息和相关数据
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
      .select('id, phone, name, role, status, created_at, updated_at')
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

    // 检查角色是否为管理员
    const isAdmin = user.role === 'admin';
    const expectedRoles = ['admin'];
    
    // 获取所有可能的角色值（用于调试）
    const { data: allRoles } = await supabase
      .from('users')
      .select('role')
      .not('role', 'is', null);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        role: user.role,
        isActive: user.status === 'active',
        createdAt: user.created_at,
        updatedAt: user.updated_at
      },
      roleCheck: {
        currentRole: user.role,
        isAdmin,
        expectedRoles,
        roleValid: expectedRoles.includes(user.role)
      },
      debug: {
        allRolesInSystem: [...new Set(allRoles?.map(r => r.role) || [])],
        userFound: true,
        accountActive: user.status === 'active'
      }
    });

  } catch (error) {
    console.error('检查用户角色时发生错误:', error);
    return NextResponse.json({
      success: false,
      error: '服务器内部错误: ' + error.message,
      debug: {
        errorType: error.constructor.name,
        errorMessage: error.message
      }
    }, { status: 500 });
  }
}