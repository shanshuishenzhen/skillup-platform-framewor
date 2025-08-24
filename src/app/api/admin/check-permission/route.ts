/**
 * 管理员权限检查API
 * 验证用户是否具有管理员权限
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAccess } from '@/middleware/rbac';

/**
 * GET /api/admin/check-permission
 * 检查用户是否具有管理员权限
 * 
 * @param request - Next.js请求对象
 * @returns 权限检查结果
 */
export async function GET(request: NextRequest) {
  try {
    // 验证管理员权限
    const rbacResult = await verifyAdminAccess(request, {
      checkDBRole: true // 从数据库检查最新角色
    });

    if (!rbacResult.success) {
      return NextResponse.json(
        { 
          error: rbacResult.message || '权限验证失败',
          code: 'PERMISSION_DENIED'
        },
        { status: 403 }
      );
    }

    // 返回权限验证成功结果
    return NextResponse.json({
      success: true,
      message: '管理员权限验证成功',
      user: {
        userId: rbacResult.user?.userId,
        phone: rbacResult.user?.phone,
        role: rbacResult.user?.role
      }
    });

  } catch (error) {
    console.error('管理员权限检查失败:', error);
    
    return NextResponse.json(
      { 
        error: '权限检查过程中发生错误',
        code: 'INTERNAL_ERROR'
      },
      { status: 500 }
    );
  }
}

/**
 * 其他HTTP方法不支持
 */
export async function POST() {
  return NextResponse.json(
    { error: '方法不允许' },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { error: '方法不允许' },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: '方法不允许' },
    { status: 405 }
  );
}