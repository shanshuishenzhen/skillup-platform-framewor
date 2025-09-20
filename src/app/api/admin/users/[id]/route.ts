/**
 * 用户管理 API 路由
 * 处理单个用户的 CRUD 操作
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// 用户更新数据验证模式
const updateUserSchema = z.object({
  username: z.string().min(3).max(50).optional(),
  email: z.string().email().optional(),
  fullName: z.string().min(1).max(100).optional(),
  phone: z.string().optional(),
  department: z.string().optional(),
  position: z.string().optional(),
  status: z.enum(['active', 'inactive', 'suspended']).optional(),
  role: z.string().optional(),
  avatar: z.string().url().optional(),
  bio: z.string().max(500).optional(),
  skills: z.array(z.string()).optional(),
  preferences: z.object({
    language: z.string().optional(),
    timezone: z.string().optional(),
    notifications: z.object({
      email: z.boolean().optional(),
      push: z.boolean().optional(),
      sms: z.boolean().optional()
    }).optional()
  }).optional()
});

// 模拟用户数据
const mockUsers = new Map([
  ['1', {
    id: '1',
    username: 'john_doe',
    email: 'john.doe@company.com',
    fullName: '张三',
    phone: '+86 138-0013-8000',
    department: '技术部',
    position: '前端开发工程师',
    status: 'active',
    role: 'user',
    avatar: '/avatars/john.jpg',
    bio: '热爱前端开发，专注于React和TypeScript技术栈',
    skills: ['JavaScript', 'React', 'TypeScript', 'Node.js'],
    preferences: {
      language: 'zh-CN',
      timezone: 'Asia/Shanghai',
      notifications: {
        email: true,
        push: true,
        sms: false
      }
    },
    createdAt: '2024-01-15T08:00:00Z',
    updatedAt: '2024-03-10T10:30:00Z',
    lastLoginAt: '2024-03-15T14:20:00Z'
  }],
  ['2', {
    id: '2',
    username: 'jane_smith',
    email: 'jane.smith@company.com',
    fullName: '李四',
    phone: '+86 139-0013-9000',
    department: '产品部',
    position: '产品经理',
    status: 'active',
    role: 'manager',
    avatar: '/avatars/jane.jpg',
    bio: '专注于用户体验设计和产品策略',
    skills: ['产品设计', '用户研究', '数据分析', '项目管理'],
    preferences: {
      language: 'zh-CN',
      timezone: 'Asia/Shanghai',
      notifications: {
        email: true,
        push: false,
        sms: true
      }
    },
    createdAt: '2024-02-01T09:00:00Z',
    updatedAt: '2024-03-12T16:45:00Z',
    lastLoginAt: '2024-03-16T09:15:00Z'
  }]
]);

/**
 * GET /api/admin/users/[id]
 * 获取单个用户详细信息
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // 验证用户ID
    if (!id) {
      return NextResponse.json(
        { error: '用户ID不能为空' },
        { status: 400 }
      );
    }

    // 查找用户
    const user = mockUsers.get(id);
    if (!user) {
      return NextResponse.json(
        { error: '用户不存在' },
        { status: 404 }
      );
    }

    // 返回用户信息（不包含敏感信息）
    const { ...userInfo } = user;
    
    return NextResponse.json({
      success: true,
      data: userInfo,
      message: '获取用户信息成功'
    });

  } catch (error) {
    console.error('获取用户信息失败:', error);
    return NextResponse.json(
      { 
        success: false,
        error: '服务器内部错误',
        message: '获取用户信息失败，请稍后重试'
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/users/[id]
 * 更新用户信息
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
    const validationResult = updateUserSchema.safeParse(body);
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

    // 查找用户
    const existingUser = mockUsers.get(id);
    if (!existingUser) {
      return NextResponse.json(
        { error: '用户不存在' },
        { status: 404 }
      );
    }

    // 检查邮箱唯一性（如果更新了邮箱）
    if (validationResult.data.email && validationResult.data.email !== existingUser.email) {
      const emailExists = Array.from(mockUsers.values()).some(
        user => user.email === validationResult.data.email && user.id !== id
      );
      if (emailExists) {
        return NextResponse.json(
          { error: '邮箱已被其他用户使用' },
          { status: 409 }
        );
      }
    }

    // 检查用户名唯一性（如果更新了用户名）
    if (validationResult.data.username && validationResult.data.username !== existingUser.username) {
      const usernameExists = Array.from(mockUsers.values()).some(
        user => user.username === validationResult.data.username && user.id !== id
      );
      if (usernameExists) {
        return NextResponse.json(
          { error: '用户名已被其他用户使用' },
          { status: 409 }
        );
      }
    }

    // 更新用户信息
    const updatedUser = {
      ...existingUser,
      ...validationResult.data,
      updatedAt: new Date().toISOString()
    };

    // 保存更新后的用户信息
    mockUsers.set(id, updatedUser);

    // 返回更新后的用户信息
    return NextResponse.json({
      success: true,
      data: updatedUser,
      message: '用户信息更新成功'
    });

  } catch (error) {
    console.error('更新用户信息失败:', error);
    return NextResponse.json(
      { 
        success: false,
        error: '服务器内部错误',
        message: '更新用户信息失败，请稍后重试'
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/users/[id]
 * 删除用户
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // 验证用户ID
    if (!id) {
      return NextResponse.json(
        { error: '用户ID不能为空' },
        { status: 400 }
      );
    }

    // 查找用户
    const user = mockUsers.get(id);
    if (!user) {
      return NextResponse.json(
        { error: '用户不存在' },
        { status: 404 }
      );
    }

    // 检查是否为管理员用户（防止删除管理员）
    if (user.role === 'admin') {
      return NextResponse.json(
        { error: '不能删除管理员用户' },
        { status: 403 }
      );
    }

    // 软删除用户（实际项目中可能需要软删除）
    mockUsers.delete(id);

    return NextResponse.json({
      success: true,
      message: '用户删除成功'
    });

  } catch (error) {
    console.error('删除用户失败:', error);
    return NextResponse.json(
      { 
        success: false,
        error: '服务器内部错误',
        message: '删除用户失败，请稍后重试'
      },
      { status: 500 }
    );
  }
}