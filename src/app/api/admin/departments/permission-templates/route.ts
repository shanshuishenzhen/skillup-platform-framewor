/**
 * 权限模板管理 API 路由
 * 处理权限模板的获取、创建和应用操作
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requirePermission } from '@/middleware/departmentAuth';

// 初始化 Supabase 客户端
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * 权限模板接口
 */
interface PermissionTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  permissions: PermissionTemplateItem[];
  type: 'predefined' | 'custom';
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

interface PermissionTemplateItem {
  resource: string;
  action: string;
  granted: boolean;
  inherit_from_parent?: boolean;
  override_children?: boolean;
  conditions?: Record<string, any>;
  priority?: number;
}

/**
 * 预定义权限模板
 */
const PREDEFINED_TEMPLATES: PermissionTemplate[] = [
  {
    id: 'admin_full',
    name: '管理员完整权限',
    description: '拥有所有管理功能的完整权限',
    category: '管理员',
    type: 'predefined',
    permissions: [
      { resource: 'admin', action: 'access', granted: true, priority: 100 },
      { resource: 'users', action: 'view', granted: true, priority: 90 },
      { resource: 'users', action: 'create', granted: true, priority: 90 },
      { resource: 'users', action: 'edit', granted: true, priority: 90 },
      { resource: 'users', action: 'delete', granted: true, priority: 90 },
      { resource: 'departments', action: 'view', granted: true, priority: 90 },
      { resource: 'departments', action: 'manage', granted: true, priority: 90 },
      { resource: 'roles', action: 'view', granted: true, priority: 90 },
      { resource: 'roles', action: 'manage', granted: true, priority: 90 },
      { resource: 'permissions', action: 'view', granted: true, priority: 90 },
      { resource: 'permissions', action: 'manage', granted: true, priority: 90 },
      { resource: 'resources', action: 'view', granted: true, priority: 90 },
      { resource: 'resources', action: 'manage', granted: true, priority: 90 },
      { resource: 'reports', action: 'view', granted: true, priority: 90 },
      { resource: 'reports', action: 'export', granted: true, priority: 90 },
      { resource: 'audit', action: 'view', granted: true, priority: 90 }
    ]
  },
  {
    id: 'dept_manager',
    name: '部门经理权限',
    description: '部门管理相关权限，包括用户管理和资源管理',
    category: '部门管理',
    type: 'predefined',
    permissions: [
      { resource: 'users', action: 'view', granted: true, priority: 80, inherit_from_parent: true },
      { resource: 'users', action: 'create', granted: true, priority: 80 },
      { resource: 'users', action: 'edit', granted: true, priority: 80 },
      { resource: 'departments', action: 'view', granted: true, priority: 80 },
      { resource: 'departments', action: 'manage', granted: true, priority: 80, conditions: { scope: 'own_department' } },
      { resource: 'resources', action: 'view', granted: true, priority: 80 },
      { resource: 'resources', action: 'manage', granted: true, priority: 80, conditions: { scope: 'department' } },
      { resource: 'reports', action: 'view', granted: true, priority: 80, conditions: { scope: 'department' } }
    ]
  },
  {
    id: 'hr_specialist',
    name: '人事专员权限',
    description: '人力资源管理相关权限',
    category: '人力资源',
    type: 'predefined',
    permissions: [
      { resource: 'users', action: 'view', granted: true, priority: 70 },
      { resource: 'users', action: 'create', granted: true, priority: 70 },
      { resource: 'users', action: 'edit', granted: true, priority: 70 },
      { resource: 'departments', action: 'view', granted: true, priority: 70 },
      { resource: 'roles', action: 'view', granted: true, priority: 70 },
      { resource: 'roles', action: 'assign', granted: true, priority: 70 },
      { resource: 'reports', action: 'view', granted: true, priority: 70, conditions: { type: 'hr' } },
      { resource: 'reports', action: 'export', granted: true, priority: 70, conditions: { type: 'hr' } }
    ]
  },
  {
    id: 'trainer',
    name: '培训师权限',
    description: '培训资源管理和学员管理权限',
    category: '培训管理',
    type: 'predefined',
    permissions: [
      { resource: 'resources', action: 'view', granted: true, priority: 60 },
      { resource: 'resources', action: 'create', granted: true, priority: 60, conditions: { type: 'training' } },
      { resource: 'resources', action: 'edit', granted: true, priority: 60, conditions: { type: 'training' } },
      { resource: 'users', action: 'view', granted: true, priority: 60, conditions: { scope: 'trainees' } },
      { resource: 'reports', action: 'view', granted: true, priority: 60, conditions: { type: 'training' } },
      { resource: 'exams', action: 'view', granted: true, priority: 60 },
      { resource: 'exams', action: 'manage', granted: true, priority: 60 }
    ]
  },
  {
    id: 'employee_basic',
    name: '普通员工权限',
    description: '基础员工权限，包括查看和学习功能',
    category: '基础权限',
    type: 'predefined',
    permissions: [
      { resource: 'resources', action: 'view', granted: true, priority: 50, conditions: { scope: 'public' } },
      { resource: 'resources', action: 'download', granted: true, priority: 50, conditions: { scope: 'public' } },
      { resource: 'profile', action: 'view', granted: true, priority: 50 },
      { resource: 'profile', action: 'edit', granted: true, priority: 50, conditions: { scope: 'own' } },
      { resource: 'exams', action: 'take', granted: true, priority: 50 },
      { resource: 'reports', action: 'view', granted: true, priority: 50, conditions: { scope: 'own' } }
    ]
  },
  {
    id: 'guest_readonly',
    name: '访客只读权限',
    description: '访客用户的只读权限',
    category: '访客权限',
    type: 'predefined',
    permissions: [
      { resource: 'resources', action: 'view', granted: true, priority: 30, conditions: { scope: 'public', type: 'readonly' } },
      { resource: 'profile', action: 'view', granted: true, priority: 30, conditions: { scope: 'own' } }
    ]
  },
  {
    id: 'auditor',
    name: '审计员权限',
    description: '审计和监督相关权限',
    category: '审计监督',
    type: 'predefined',
    permissions: [
      { resource: 'audit', action: 'view', granted: true, priority: 85 },
      { resource: 'audit', action: 'export', granted: true, priority: 85 },
      { resource: 'reports', action: 'view', granted: true, priority: 85 },
      { resource: 'reports', action: 'export', granted: true, priority: 85 },
      { resource: 'users', action: 'view', granted: true, priority: 85, conditions: { scope: 'audit' } },
      { resource: 'departments', action: 'view', granted: true, priority: 85 },
      { resource: 'permissions', action: 'view', granted: true, priority: 85 }
    ]
  },
  {
    id: 'content_manager',
    name: '内容管理员权限',
    description: '学习资源和内容管理权限',
    category: '内容管理',
    type: 'predefined',
    permissions: [
      { resource: 'resources', action: 'view', granted: true, priority: 75 },
      { resource: 'resources', action: 'create', granted: true, priority: 75 },
      { resource: 'resources', action: 'edit', granted: true, priority: 75 },
      { resource: 'resources', action: 'delete', granted: true, priority: 75 },
      { resource: 'resources', action: 'publish', granted: true, priority: 75 },
      { resource: 'categories', action: 'view', granted: true, priority: 75 },
      { resource: 'categories', action: 'manage', granted: true, priority: 75 },
      { resource: 'reports', action: 'view', granted: true, priority: 75, conditions: { type: 'content' } }
    ]
  }
];

/**
 * 获取权限模板列表
 * GET /api/admin/departments/permission-templates
 */
export async function GET(request: NextRequest) {
  try {
    // 权限验证
    const authResult = await requirePermission('permissions', 'view')(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const type = searchParams.get('type') as 'predefined' | 'custom' | null;
    const includeCustom = searchParams.get('include_custom') !== 'false';
    
    let templates: PermissionTemplate[] = [...PREDEFINED_TEMPLATES];
    
    // 获取自定义模板
    if (includeCustom) {
      try {
        const { data: customTemplates, error } = await supabase
          .from('permission_templates')
          .select(`
            *,
            created_by_user:profiles!permission_templates_created_by_fkey(id, username, full_name)
          `)
          .order('created_at', { ascending: false });
        
        if (!error && customTemplates) {
          const formattedCustomTemplates = customTemplates.map(template => ({
            id: template.id,
            name: template.name,
            description: template.description,
            category: template.category,
            permissions: template.permissions,
            type: 'custom' as const,
            created_by: template.created_by,
            created_at: template.created_at,
            updated_at: template.updated_at
          }));
          
          templates = [...templates, ...formattedCustomTemplates];
        }
      } catch (error) {
        console.error('获取自定义模板失败:', error);
        // 继续使用预定义模板
      }
    }
    
    // 应用筛选条件
    if (category) {
      templates = templates.filter(t => t.category === category);
    }
    
    if (type) {
      templates = templates.filter(t => t.type === type);
    }
    
    // 获取所有分类
    const categories = [...new Set(templates.map(t => t.category))];
    
    return NextResponse.json({
      success: true,
      data: {
        templates,
        categories,
        total: templates.length
      }
    });
    
  } catch (error) {
    console.error('获取权限模板失败:', error);
    return NextResponse.json({
      success: false,
      error: '获取权限模板失败'
    }, { status: 500 });
  }
}

/**
 * 创建自定义权限模板
 * POST /api/admin/departments/permission-templates
 */
export async function POST(request: NextRequest) {
  try {
    // 权限验证
    const authResult = await requirePermission('permissions', 'manage')(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    
    const body = await request.json();
    const { name, description, category, permissions } = body;
    
    // 验证必填字段
    if (!name || !description || !category || !permissions || !Array.isArray(permissions)) {
      return NextResponse.json({
        success: false,
        error: '缺少必填字段：name, description, category, permissions'
      }, { status: 400 });
    }
    
    // 验证权限格式
    for (const permission of permissions) {
      if (!permission.resource || !permission.action || typeof permission.granted !== 'boolean') {
        return NextResponse.json({
          success: false,
          error: '权限格式错误：每个权限必须包含 resource, action, granted 字段'
        }, { status: 400 });
      }
    }
    
    const userId = authResult.user.id;
    const now = new Date().toISOString();
    
    // 创建自定义模板
    const { data: template, error } = await supabase
      .from('permission_templates')
      .insert({
        name,
        description,
        category,
        permissions,
        created_by: userId,
        created_at: now,
        updated_at: now
      })
      .select()
      .single();
    
    if (error) {
      console.error('创建权限模板失败:', error);
      return NextResponse.json({
        success: false,
        error: '创建权限模板失败'
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      data: {
        template,
        message: '权限模板创建成功'
      }
    });
    
  } catch (error) {
    console.error('创建权限模板失败:', error);
    return NextResponse.json({
      success: false,
      error: '创建权限模板失败'
    }, { status: 500 });
  }
}

/**
 * 应用权限模板到部门
 * PUT /api/admin/departments/permission-templates
 */
export async function PUT(request: NextRequest) {
  try {
    // 权限验证
    const authResult = await requirePermission('departments', 'manage')(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    
    const body = await request.json();
    const { template_id, department_id, override_existing = false } = body;
    
    if (!template_id || !department_id) {
      return NextResponse.json({
        success: false,
        error: '模板ID和部门ID不能为空'
      }, { status: 400 });
    }
    
    // 验证部门是否存在
    const { data: department, error: deptError } = await supabase
      .from('departments')
      .select('id, name')
      .eq('id', department_id)
      .single();
    
    if (deptError || !department) {
      return NextResponse.json({
        success: false,
        error: '部门不存在'
      }, { status: 404 });
    }
    
    // 获取权限模板
    let template: PermissionTemplate | null = null;
    
    // 先从预定义模板中查找
    template = PREDEFINED_TEMPLATES.find(t => t.id === template_id) || null;
    
    // 如果不是预定义模板，从数据库中查找
    if (!template) {
      const { data: customTemplate, error: templateError } = await supabase
        .from('permission_templates')
        .select('*')
        .eq('id', template_id)
        .single();
      
      if (templateError || !customTemplate) {
        return NextResponse.json({
          success: false,
          error: '权限模板不存在'
        }, { status: 404 });
      }
      
      template = {
        id: customTemplate.id,
        name: customTemplate.name,
        description: customTemplate.description,
        category: customTemplate.category,
        permissions: customTemplate.permissions,
        type: 'custom',
        created_by: customTemplate.created_by,
        created_at: customTemplate.created_at,
        updated_at: customTemplate.updated_at
      };
    }
    
    if (!template) {
      return NextResponse.json({
        success: false,
        error: '权限模板不存在'
      }, { status: 404 });
    }
    
    const userId = authResult.user.id;
    const now = new Date().toISOString();
    
    // 如果需要覆盖现有权限，先删除现有权限
    if (override_existing) {
      await supabase
        .from('department_permissions')
        .delete()
        .eq('department_id', department_id);
    }
    
    // 准备要创建的权限
    const permissionsToCreate = template.permissions.map(permission => ({
      department_id,
      resource: permission.resource,
      action: permission.action,
      granted: permission.granted,
      inherit_from_parent: permission.inherit_from_parent ?? true,
      override_children: permission.override_children ?? false,
      conditions: permission.conditions,
      priority: permission.priority ?? 50,
      created_by: userId,
      created_at: now,
      updated_at: now
    }));
    
    // 批量创建权限
    const { data: createdPermissions, error: createError } = await supabase
      .from('department_permissions')
      .insert(permissionsToCreate)
      .select();
    
    if (createError) {
      console.error('应用权限模板失败:', createError);
      return NextResponse.json({
        success: false,
        error: '应用权限模板失败'
      }, { status: 500 });
    }
    
    // 记录审计日志
    if (createdPermissions) {
      for (const permission of createdPermissions) {
        await createAuditLog({
          user_id: userId,
          department_id: permission.department_id,
          resource: permission.resource,
          action: permission.action,
          change_type: 'create',
          new_value: {
            granted: permission.granted,
            inherit_from_parent: permission.inherit_from_parent,
            override_children: permission.override_children,
            conditions: permission.conditions,
            priority: permission.priority
          },
          reason: `应用权限模板: ${template.name}`,
          metadata: {
            template_id: template.id,
            template_name: template.name,
            template_type: template.type
          },
          changed_by: userId
        });
      }
    }
    
    return NextResponse.json({
      success: true,
      data: {
        applied_permissions: createdPermissions,
        applied_count: createdPermissions?.length || 0,
        template_name: template.name,
        department_name: department.name,
        message: `成功将模板 "${template.name}" 应用到部门 "${department.name}"`
      }
    });
    
  } catch (error) {
    console.error('应用权限模板失败:', error);
    return NextResponse.json({
      success: false,
      error: '应用权限模板失败'
    }, { status: 500 });
  }
}

/**
 * 删除自定义权限模板
 * DELETE /api/admin/departments/permission-templates
 */
export async function DELETE(request: NextRequest) {
  try {
    // 权限验证
    const authResult = await requirePermission('permissions', 'manage')(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    
    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get('template_id');
    
    if (!templateId) {
      return NextResponse.json({
        success: false,
        error: '模板ID不能为空'
      }, { status: 400 });
    }
    
    // 检查是否为预定义模板
    const isPredefined = PREDEFINED_TEMPLATES.some(t => t.id === templateId);
    if (isPredefined) {
      return NextResponse.json({
        success: false,
        error: '不能删除预定义模板'
      }, { status: 400 });
    }
    
    // 删除自定义模板
    const { error } = await supabase
      .from('permission_templates')
      .delete()
      .eq('id', templateId);
    
    if (error) {
      console.error('删除权限模板失败:', error);
      return NextResponse.json({
        success: false,
        error: '删除权限模板失败'
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      data: {
        message: '权限模板删除成功'
      }
    });
    
  } catch (error) {
    console.error('删除权限模板失败:', error);
    return NextResponse.json({
      success: false,
      error: '删除权限模板失败'
    }, { status: 500 });
  }
}

/**
 * 创建审计日志
 * @param logData 日志数据
 */
async function createAuditLog(logData: any) {
  try {
    await supabase
      .from('permission_audit_logs')
      .insert({
        ...logData,
        created_at: new Date().toISOString()
      });
  } catch (error) {
    console.error('创建审计日志失败:', error);
  }
}