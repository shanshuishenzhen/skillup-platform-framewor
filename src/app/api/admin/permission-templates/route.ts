/**
 * 权限模板管理API
 * 提供权限模板的创建、查询、更新、删除和应用功能
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { verifyRBAC } from '@/middleware/rbac';
import { UserRole } from '@/types/roles';

// 初始化 Supabase 客户端
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 权限模板验证模式
const PermissionTemplateSchema = z.object({
  name: z.string().min(1, '模板名称不能为空').max(100, '模板名称不能超过100个字符'),
  description: z.string().optional(),
  permissions: z.array(z.string()).min(1, '至少需要包含一个权限'),
  category: z.string().optional(),
  is_system: z.boolean().default(false),
  is_active: z.boolean().default(true)
});

// 模板应用验证模式
const ApplyTemplateSchema = z.object({
  template_id: z.string().min(1, '模板ID不能为空'),
  user_ids: z.array(z.string()).min(1, '至少需要选择一个用户'),
  operation: z.enum(['add', 'replace']).default('add'),
  reason: z.string().optional()
});

/**
 * 预定义系统权限模板
 */
const SYSTEM_TEMPLATES = [
  {
    name: '基础用户权限',
    description: '适用于普通用户的基础权限集合',
    permissions: ['user.view', 'course.view', 'exam.view'],
    category: '用户角色',
    is_system: true
  },
  {
    name: '教师权限',
    description: '适用于教师的权限集合',
    permissions: [
      'user.view', 'course.view', 'course.create', 'course.edit',
      'exam.view', 'exam.create', 'exam.edit', 'exam.grade',
      'content.view', 'content.create', 'content.edit'
    ],
    category: '用户角色',
    is_system: true
  },
  {
    name: '部门管理员',
    description: '适用于部门管理员的权限集合',
    permissions: [
      'user.view', 'user.edit', 'user.batch_update',
      'course.view', 'course.assign',
      'exam.view', 'exam.result',
      'org.view', 'report.view'
    ],
    category: '管理角色',
    is_system: true
  },
  {
    name: '系统管理员',
    description: '适用于系统管理员的完整权限集合',
    permissions: [
      'user.view', 'user.create', 'user.edit', 'user.delete', 'user.import', 'user.export', 'user.batch_update',
      'role.view', 'role.create', 'role.edit', 'role.delete', 'role.assign',
      'course.view', 'course.create', 'course.edit', 'course.delete', 'course.publish', 'course.assign',
      'exam.view', 'exam.create', 'exam.edit', 'exam.delete', 'exam.grade', 'exam.result',
      'org.view', 'org.create', 'org.edit', 'org.delete',
      'report.view', 'report.export', 'report.dashboard',
      'system.config', 'system.backup', 'system.log', 'system.audit',
      'content.view', 'content.create', 'content.edit', 'content.delete', 'content.upload'
    ],
    category: '管理角色',
    is_system: true
  },
  {
    name: '课程管理权限',
    description: '专门用于课程管理的权限集合',
    permissions: [
      'course.view', 'course.create', 'course.edit', 'course.delete', 'course.publish', 'course.assign',
      'content.view', 'content.create', 'content.edit', 'content.upload'
    ],
    category: '功能模块',
    is_system: true
  },
  {
    name: '考试管理权限',
    description: '专门用于考试管理的权限集合',
    permissions: [
      'exam.view', 'exam.create', 'exam.edit', 'exam.delete', 'exam.grade', 'exam.result'
    ],
    category: '功能模块',
    is_system: true
  }
];

/**
 * 初始化系统权限模板
 */
async function initializeSystemTemplates() {
  try {
    for (const template of SYSTEM_TEMPLATES) {
      await supabase
        .from('permission_templates')
        .upsert({
          ...template,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'name',
          ignoreDuplicates: false
        });
    }
  } catch (error) {
    console.error('初始化系统权限模板失败:', error);
  }
}

/**
 * GET /api/admin/permission-templates
 * 获取权限模板列表
 */
export async function GET(request: NextRequest) {
  try {
    // 验证管理员权限
    const rbacResult = await verifyRBAC(request, [UserRole.ADMIN, UserRole.SUPER_ADMIN]);
    if (!rbacResult.success) {
      return NextResponse.json(
        { error: rbacResult.error },
        { status: rbacResult.status }
      );
    }

    // 获取查询参数
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const isSystem = searchParams.get('is_system');
    const isActive = searchParams.get('is_active');
    const search = searchParams.get('search');

    // 构建查询
    let query = supabase
      .from('permission_templates')
      .select(`
        id,
        name,
        description,
        permissions,
        category,
        is_system,
        is_active,
        created_by,
        created_at,
        updated_at,
        creator:users!created_by(name)
      `);

    // 应用过滤条件
    if (category && category !== 'all') {
      query = query.eq('category', category);
    }
    if (isSystem !== null) {
      query = query.eq('is_system', isSystem === 'true');
    }
    if (isActive !== null) {
      query = query.eq('is_active', isActive === 'true');
    }
    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const { data: templates, error } = await query.order('created_at', { ascending: false });

    if (error) {
      throw new Error(`获取权限模板失败: ${error.message}`);
    }

    // 如果没有系统模板，初始化它们
    if (!templates?.some(t => t.is_system)) {
      await initializeSystemTemplates();
      // 重新查询
      const { data: updatedTemplates } = await query.order('created_at', { ascending: false });
      return NextResponse.json({
        success: true,
        data: updatedTemplates || []
      });
    }

    return NextResponse.json({
      success: true,
      data: templates || []
    });

  } catch (error) {
    console.error('获取权限模板失败:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/permission-templates
 * 创建权限模板
 */
export async function POST(request: NextRequest) {
  try {
    // 验证管理员权限
    const rbacResult = await verifyRBAC(request, [UserRole.ADMIN, UserRole.SUPER_ADMIN]);
    if (!rbacResult.success) {
      return NextResponse.json(
        { error: rbacResult.error },
        { status: rbacResult.status }
      );
    }

    const body = await request.json();
    const templateData = PermissionTemplateSchema.parse(body);

    // 检查模板名称是否已存在
    const { data: existingTemplate } = await supabase
      .from('permission_templates')
      .select('id')
      .eq('name', templateData.name)
      .single();

    if (existingTemplate) {
      return NextResponse.json(
        { error: '模板名称已存在' },
        { status: 400 }
      );
    }

    // 创建权限模板
    const { data: template, error } = await supabase
      .from('permission_templates')
      .insert({
        ...templateData,
        created_by: rbacResult.user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      throw new Error(`创建权限模板失败: ${error.message}`);
    }

    return NextResponse.json({
      success: true,
      message: '权限模板创建成功',
      data: template
    });

  } catch (error) {
    console.error('创建权限模板失败:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '请求数据格式错误', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : '服务器内部错误' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/permission-templates
 * 应用权限模板到用户
 */
export async function PUT(request: NextRequest) {
  try {
    // 验证管理员权限
    const rbacResult = await verifyRBAC(request, [UserRole.ADMIN, UserRole.SUPER_ADMIN]);
    if (!rbacResult.success) {
      return NextResponse.json(
        { error: rbacResult.error },
        { status: rbacResult.status }
      );
    }

    const body = await request.json();
    const { template_id, user_ids, operation, reason } = ApplyTemplateSchema.parse(body);

    // 获取权限模板
    const { data: template, error: templateError } = await supabase
      .from('permission_templates')
      .select('id, name, permissions, is_active')
      .eq('id', template_id)
      .single();

    if (templateError || !template) {
      return NextResponse.json(
        { error: '权限模板不存在' },
        { status: 404 }
      );
    }

    if (!template.is_active) {
      return NextResponse.json(
        { error: '权限模板已禁用' },
        { status: 400 }
      );
    }

    const operatorId = rbacResult.user.id;
    const results = [];
    const errors = [];

    // 为每个用户应用权限模板
    for (const userId of user_ids) {
      try {
        // 检查用户是否存在
        const { data: user, error: userError } = await supabase
          .from('users')
          .select('id, name')
          .eq('id', userId)
          .single();

        if (userError) {
          errors.push({ userId, error: '用户不存在' });
          continue;
        }

        if (operation === 'replace') {
          // 替换模式：先删除现有权限，再添加模板权限
          await supabase
            .from('user_permissions')
            .update({ is_active: false })
            .eq('user_id', userId);
        }

        // 添加模板权限
        const permissionRecords = template.permissions.map(permissionId => ({
          user_id: userId,
          permission_id: permissionId,
          granted_by: operatorId,
          granted_at: new Date().toISOString(),
          reason: reason || `应用权限模板: ${template.name}`,
          template_id: template_id,
          is_active: true
        }));

        const { error: insertError } = await supabase
          .from('user_permissions')
          .upsert(permissionRecords, {
            onConflict: 'user_id,permission_id',
            ignoreDuplicates: false
          });

        if (insertError) {
          errors.push({ userId, error: `权限分配失败: ${insertError.message}` });
          continue;
        }

        // 记录权限变更历史
        await supabase
          .from('permission_change_logs')
          .insert({
            user_id: userId,
            operator_id: operatorId,
            operation: `apply_template_${operation}`,
            permissions: template.permissions,
            reason: reason || `应用权限模板: ${template.name}`,
            template_id: template_id,
            created_at: new Date().toISOString()
          });

        results.push({ userId, success: true });
      } catch (error) {
        errors.push({ 
          userId, 
          error: error instanceof Error ? error.message : '操作失败' 
        });
      }
    }

    // 记录模板使用统计
    await supabase
      .from('template_usage_logs')
      .insert({
        template_id,
        operator_id: operatorId,
        user_count: user_ids.length,
        successful_count: results.length,
        failed_count: errors.length,
        operation,
        created_at: new Date().toISOString()
      });

    return NextResponse.json({
      success: true,
      message: '权限模板应用完成',
      data: {
        template_name: template.name,
        total_users: user_ids.length,
        successful: results.length,
        failed: errors.length,
        results,
        errors
      }
    });

  } catch (error) {
    console.error('应用权限模板失败:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '请求数据格式错误', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : '服务器内部错误' },
      { status: 500 }
    );
  }
}