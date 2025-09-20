/**
 * 用户权限管理 API 路由
 * 处理用户权限的查询、更新和管理
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// 权限更新数据验证模式
const updatePermissionsSchema = z.object({
  permissions: z.array(z.object({
    resource: z.string(),
    actions: z.array(z.string()),
    conditions: z.object({}).optional()
  }))
});

const addPermissionSchema = z.object({
  resource: z.string().min(1),
  actions: z.array(z.string().min(1)),
  conditions: z.object({}).optional(),
  expiresAt: z.string().datetime().optional(),
  notes: z.string().max(500).optional()
});

// 模拟用户权限数据
const mockUserPermissions = new Map([
  ['1', {
    userId: '1',
    permissions: [
      {
        id: 'perm-1',
        resource: 'exams',
        actions: ['read', 'create', 'update'],
        conditions: { department: 'tech' },
        grantedBy: 'admin',
        grantedAt: '2024-01-15T08:00:00Z',
        expiresAt: null,
        notes: '技术部门考试管理权限'
      },
      {
        id: 'perm-2',
        resource: 'users',
        actions: ['read'],
        conditions: {},
        grantedBy: 'admin',
        grantedAt: '2024-01-15T08:00:00Z',
        expiresAt: null,
        notes: '基础用户查看权限'
      },
      {
        id: 'perm-3',
        resource: 'reports',
        actions: ['read', 'export'],
        conditions: { scope: 'department' },
        grantedBy: 'manager',
        grantedAt: '2024-02-01T10:00:00Z',
        expiresAt: '2024-12-31T23:59:59Z',
        notes: '部门报告查看和导出权限'
      }
    ],
    roles: [
      {
        id: 'role-1',
        name: 'exam_creator',
        displayName: '考试创建者',
        description: '可以创建和管理考试',
        assignedBy: 'admin',
        assignedAt: '2024-01-15T08:00:00Z'
      },
      {
        id: 'role-2',
        name: 'department_viewer',
        displayName: '部门查看者',
        description: '可以查看部门相关信息',
        assignedBy: 'manager',
        assignedAt: '2024-02-01T10:00:00Z'
      }
    ],
    groups: [
      {
        id: 'group-1',
        name: 'tech_team',
        displayName: '技术团队',
        description: '技术部门成员组',
        joinedAt: '2024-01-15T08:00:00Z'
      }
    ],
    lastUpdated: '2024-03-10T10:30:00Z'
  }],
  ['2', {
    userId: '2',
    permissions: [
      {
        id: 'perm-4',
        resource: 'products',
        actions: ['read', 'create', 'update', 'delete'],
        conditions: {},
        grantedBy: 'admin',
        grantedAt: '2024-02-01T09:00:00Z',
        expiresAt: null,
        notes: '产品管理完整权限'
      },
      {
        id: 'perm-5',
        resource: 'analytics',
        actions: ['read', 'analyze'],
        conditions: { level: 'advanced' },
        grantedBy: 'admin',
        grantedAt: '2024-02-01T09:00:00Z',
        expiresAt: null,
        notes: '高级数据分析权限'
      }
    ],
    roles: [
      {
        id: 'role-3',
        name: 'product_manager',
        displayName: '产品经理',
        description: '产品管理和策略制定',
        assignedBy: 'admin',
        assignedAt: '2024-02-01T09:00:00Z'
      }
    ],
    groups: [
      {
        id: 'group-2',
        name: 'product_team',
        displayName: '产品团队',
        description: '产品部门成员组',
        joinedAt: '2024-02-01T09:00:00Z'
      }
    ],
    lastUpdated: '2024-03-12T16:45:00Z'
  }]
]);

/**
 * GET /api/admin/users/[id]/permissions
 * 获取用户权限信息
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const { searchParams } = new URL(request.url);
    const includeRoles = searchParams.get('include_roles') === 'true';
    const includeGroups = searchParams.get('include_groups') === 'true';
    const resource = searchParams.get('resource');

    // 验证用户ID
    if (!id) {
      return NextResponse.json(
        { error: '用户ID不能为空' },
        { status: 400 }
      );
    }

    // 获取用户权限信息
    const userPermissions = mockUserPermissions.get(id);
    if (!userPermissions) {
      return NextResponse.json(
        { error: '用户权限信息不存在' },
        { status: 404 }
      );
    }

    // 构建响应数据
    let responseData: any = {
      userId: id,
      permissions: userPermissions.permissions,
      lastUpdated: userPermissions.lastUpdated
    };

    // 根据查询参数过滤权限
    if (resource) {
      responseData.permissions = userPermissions.permissions.filter(
        perm => perm.resource === resource
      );
    }

    // 包含角色信息
    if (includeRoles) {
      responseData.roles = userPermissions.roles;
    }

    // 包含用户组信息
    if (includeGroups) {
      responseData.groups = userPermissions.groups;
    }

    // 计算权限统计
    const stats = {
      totalPermissions: userPermissions.permissions.length,
      totalRoles: userPermissions.roles.length,
      totalGroups: userPermissions.groups.length,
      expiredPermissions: userPermissions.permissions.filter(
        perm => perm.expiresAt && new Date(perm.expiresAt) < new Date()
      ).length,
      resourceCounts: userPermissions.permissions.reduce((acc, perm) => {
        acc[perm.resource] = (acc[perm.resource] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };

    return NextResponse.json({
      success: true,
      data: responseData,
      stats,
      message: '获取用户权限信息成功'
    });

  } catch (error) {
    console.error('获取用户权限信息失败:', error);
    return NextResponse.json(
      { 
        success: false,
        error: '服务器内部错误',
        message: '获取用户权限信息失败，请稍后重试'
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/users/[id]/permissions
 * 更新用户权限
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();

    // 验证用户ID
    if (!id) {
      return NextResponse.json(
        { error: '用户ID不能为空' },
        { status: 400 }
      );
    }

    // 验证请求数据
    const validationResult = updatePermissionsSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: '数据验证失败',
          details: validationResult.error.errors
        },
        { status: 400 }
      );
    }

    // 获取现有权限信息
    const existingPermissions = mockUserPermissions.get(id);
    if (!existingPermissions) {
      return NextResponse.json(
        { error: '用户权限信息不存在' },
        { status: 404 }
      );
    }

    // 更新权限信息
    const updatedPermissions = {
      ...existingPermissions,
      permissions: validationResult.data.permissions.map((perm, index) => ({
        id: `perm-${Date.now()}-${index}`,
        ...perm,
        grantedBy: 'admin', // 实际应用中应该从认证信息中获取
        grantedAt: new Date().toISOString(),
        expiresAt: null
      })),
      lastUpdated: new Date().toISOString()
    };

    // 保存更新后的权限信息
    mockUserPermissions.set(id, updatedPermissions);

    return NextResponse.json({
      success: true,
      data: updatedPermissions,
      message: '用户权限更新成功'
    });

  } catch (error) {
    console.error('更新用户权限失败:', error);
    return NextResponse.json(
      { 
        success: false,
        error: '服务器内部错误',
        message: '更新用户权限失败，请稍后重试'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/users/[id]/permissions
 * 添加用户权限
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();

    // 验证用户ID
    if (!id) {
      return NextResponse.json(
        { error: '用户ID不能为空' },
        { status: 400 }
      );
    }

    // 验证请求数据
    const validationResult = addPermissionSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: '数据验证失败',
          details: validationResult.error.errors
        },
        { status: 400 }
      );
    }

    // 获取现有权限信息
    const existingPermissions = mockUserPermissions.get(id);
    if (!existingPermissions) {
      // 如果用户权限信息不存在，创建新的
      const newUserPermissions = {
        userId: id,
        permissions: [],
        roles: [],
        groups: [],
        lastUpdated: new Date().toISOString()
      };
      mockUserPermissions.set(id, newUserPermissions);
    }

    const userPermissions = mockUserPermissions.get(id)!;

    // 检查权限是否已存在
    const existingPermission = userPermissions.permissions.find(
      perm => perm.resource === validationResult.data.resource &&
              JSON.stringify(perm.actions.sort()) === JSON.stringify(validationResult.data.actions.sort())
    );

    if (existingPermission) {
      return NextResponse.json(
        { error: '相同的权限已存在' },
        { status: 409 }
      );
    }

    // 添加新权限
    const newPermission = {
      id: `perm-${Date.now()}`,
      ...validationResult.data,
      grantedBy: 'admin', // 实际应用中应该从认证信息中获取
      grantedAt: new Date().toISOString()
    };

    userPermissions.permissions.push(newPermission);
    userPermissions.lastUpdated = new Date().toISOString();

    // 保存更新后的权限信息
    mockUserPermissions.set(id, userPermissions);

    return NextResponse.json({
      success: true,
      data: newPermission,
      message: '权限添加成功'
    });

  } catch (error) {
    console.error('添加用户权限失败:', error);
    return NextResponse.json(
      { 
        success: false,
        error: '服务器内部错误',
        message: '添加用户权限失败，请稍后重试'
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/users/[id]/permissions
 * 删除用户权限
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const { searchParams } = new URL(request.url);
    const permissionId = searchParams.get('permission_id');
    const resource = searchParams.get('resource');

    // 验证用户ID
    if (!id) {
      return NextResponse.json(
        { error: '用户ID不能为空' },
        { status: 400 }
      );
    }

    // 验证删除参数
    if (!permissionId && !resource) {
      return NextResponse.json(
        { error: '必须指定权限ID或资源类型' },
        { status: 400 }
      );
    }

    // 获取用户权限信息
    const userPermissions = mockUserPermissions.get(id);
    if (!userPermissions) {
      return NextResponse.json(
        { error: '用户权限信息不存在' },
        { status: 404 }
      );
    }

    let deletedCount = 0;

    if (permissionId) {
      // 删除指定权限
      const initialLength = userPermissions.permissions.length;
      userPermissions.permissions = userPermissions.permissions.filter(
        perm => perm.id !== permissionId
      );
      deletedCount = initialLength - userPermissions.permissions.length;
    } else if (resource) {
      // 删除指定资源的所有权限
      const initialLength = userPermissions.permissions.length;
      userPermissions.permissions = userPermissions.permissions.filter(
        perm => perm.resource !== resource
      );
      deletedCount = initialLength - userPermissions.permissions.length;
    }

    if (deletedCount === 0) {
      return NextResponse.json(
        { error: '未找到要删除的权限' },
        { status: 404 }
      );
    }

    // 更新最后修改时间
    userPermissions.lastUpdated = new Date().toISOString();

    // 保存更新后的权限信息
    mockUserPermissions.set(id, userPermissions);

    return NextResponse.json({
      success: true,
      data: {
        deletedCount,
        remainingPermissions: userPermissions.permissions.length
      },
      message: `成功删除 ${deletedCount} 个权限`
    });

  } catch (error) {
    console.error('删除用户权限失败:', error);
    return NextResponse.json(
      { 
        success: false,
        error: '服务器内部错误',
        message: '删除用户权限失败，请稍后重试'
      },
      { status: 500 }
    );
  }
}