import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

// 获取Supabase客户端
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, supabaseServiceKey);
}

// 验证管理员权限
async function verifyAdminAuth(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  const supabase = getSupabaseClient();
  
  const { data: session } = await supabase.auth.getUser(token);
  if (!session.user) {
    return null;
  }

  const { data: adminUser } = await supabase
    .from('admin_users')
    .select('*')
    .eq('id', session.user.id)
    .eq('status', 'active')
    .single();

  if (!adminUser || !['super_admin', 'admin'].includes(adminUser.role)) {
    return null;
  }

  return { user: session.user, adminUser };
}

// 记录操作日志
async function logOperation(
  supabase: any,
  operationType: string,
  operatorId: string,
  details: any,
  request: NextRequest
) {
  const clientIp = request.headers.get('x-forwarded-for') || 
                   request.headers.get('x-real-ip') || 
                   'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';

  await supabase.from('operation_logs').insert({
    operation_type: operationType,
    operator_id: operatorId,
    operator_type: 'admin',
    details,
    ip_address: clientIp,
    user_agent: userAgent
  });
}

// 部门更新验证模式
const DepartmentUpdateSchema = z.object({
  name: z.string().min(1, '部门名称不能为空').max(100, '部门名称不能超过100个字符').optional(),
  code: z.string().min(1, '部门编码不能为空').max(50, '部门编码不能超过50个字符').optional(),
  description: z.string().optional().nullable(),
  parent_id: z.string().uuid().optional().nullable(),
  manager_id: z.string().uuid().optional().nullable(),
  contact_phone: z.string().max(20).optional().nullable(),
  contact_email: z.string().email('邮箱格式不正确').optional().nullable(),
  address: z.string().optional().nullable(),
  status: z.enum(['active', 'inactive', 'archived']).optional(),
  sort_order: z.number().int().min(0).optional()
});

// GET /api/admin/departments/[id] - 获取单个部门详情
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await verifyAdminAuth(request);
    if (!auth) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      );
    }

    const { id } = params;
    const { searchParams } = new URL(request.url);
    const includeMembers = searchParams.get('include_members') === 'true';
    const includeChildren = searchParams.get('include_children') === 'true';
    const includeHistory = searchParams.get('include_history') === 'true';

    const supabase = getSupabaseClient();

    // 获取部门基本信息
    const { data: department, error } = await supabase
      .from('departments_with_manager')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !department) {
      return NextResponse.json(
        { error: '部门不存在' },
        { status: 404 }
      );
    }

    const result: any = { department };

    // 包含部门成员信息
    if (includeMembers) {
      const { data: members } = await supabase
        .from('user_departments_with_details')
        .select('*')
        .eq('department_id', id)
        .eq('status', 'active')
        .order('is_manager', { ascending: false })
        .order('user_name');
      
      result.members = members || [];
    }

    // 包含子部门信息
    if (includeChildren) {
      const { data: children } = await supabase
        .from('departments_with_manager')
        .select('*')
        .eq('parent_id', id)
        .order('sort_order')
        .order('name');
      
      result.children = children || [];
    }

    // 包含部门变更历史
    if (includeHistory) {
      const { data: history } = await supabase
        .from('user_department_history')
        .select(`
          *,
          users!user_id(name, email),
          departments!department_id(name),
          old_departments:departments!old_department_id(name)
        `)
        .eq('department_id', id)
        .order('created_at', { ascending: false })
        .limit(50);
      
      result.history = history || [];
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error('获取部门详情异常:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/departments/[id] - 更新部门信息
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await verifyAdminAuth(request);
    if (!auth) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      );
    }

    const { id } = params;
    const body = await request.json();
    const validatedData = DepartmentUpdateSchema.parse(body);

    const supabase = getSupabaseClient();

    // 检查部门是否存在
    const { data: existingDept, error: fetchError } = await supabase
      .from('departments')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existingDept) {
      return NextResponse.json(
        { error: '部门不存在' },
        { status: 404 }
      );
    }

    // 如果更新部门编码，检查是否重复
    if (validatedData.code && validatedData.code !== existingDept.code) {
      const { data: duplicateDept } = await supabase
        .from('departments')
        .select('id')
        .eq('code', validatedData.code)
        .neq('id', id)
        .single();

      if (duplicateDept) {
        return NextResponse.json(
          { error: '部门编码已存在' },
          { status: 400 }
        );
      }
    }

    // 如果更新父部门，进行验证
    if (validatedData.parent_id !== undefined) {
      if (validatedData.parent_id) {
        // 检查父部门是否存在
        const { data: parentDept } = await supabase
          .from('departments')
          .select('id, level, path')
          .eq('id', validatedData.parent_id)
          .eq('status', 'active')
          .single();

        if (!parentDept) {
          return NextResponse.json(
            { error: '指定的父部门不存在或已停用' },
            { status: 400 }
          );
        }

        // 检查是否会形成循环引用
        if (parentDept.path.includes(id)) {
          return NextResponse.json(
            { error: '不能将部门移动到其子部门下' },
            { status: 400 }
          );
        }

        // 检查层级深度
        if (parentDept.level >= 5) {
          return NextResponse.json(
            { error: '部门层级不能超过5层' },
            { status: 400 }
          );
        }
      }
    }

    // 更新部门信息
    const { data: updatedDepartment, error: updateError } = await supabase
      .from('departments')
      .update({
        ...validatedData,
        updated_by: auth.adminUser.id
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('更新部门失败:', updateError);
      return NextResponse.json(
        { error: '更新部门失败' },
        { status: 500 }
      );
    }

    // 记录操作日志
    await logOperation(
      supabase,
      'update_department',
      auth.adminUser.id,
      {
        department_id: id,
        department_name: updatedDepartment.name,
        changes: validatedData,
        old_values: {
          name: existingDept.name,
          code: existingDept.code,
          parent_id: existingDept.parent_id,
          status: existingDept.status
        }
      },
      request
    );

    return NextResponse.json({
      message: '部门更新成功',
      department: updatedDepartment
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '数据验证失败', details: error.errors },
        { status: 400 }
      );
    }

    console.error('更新部门异常:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/departments/[id] - 删除部门
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await verifyAdminAuth(request);
    if (!auth) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      );
    }

    const { id } = params;
    const { searchParams } = new URL(request.url);
    const force = searchParams.get('force') === 'true';

    const supabase = getSupabaseClient();

    // 检查部门是否存在
    const { data: department, error: fetchError } = await supabase
      .from('departments')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !department) {
      return NextResponse.json(
        { error: '部门不存在' },
        { status: 404 }
      );
    }

    // 检查是否有子部门
    const { data: children } = await supabase
      .from('departments')
      .select('id')
      .eq('parent_id', id)
      .eq('status', 'active');

    if (children && children.length > 0 && !force) {
      return NextResponse.json(
        { 
          error: '该部门下还有子部门，无法删除',
          children_count: children.length,
          suggestion: '请先删除或移动子部门，或使用强制删除'
        },
        { status: 400 }
      );
    }

    // 检查是否有活跃成员
    const { data: activeMembers } = await supabase
      .from('user_departments')
      .select('id')
      .eq('department_id', id)
      .eq('status', 'active');

    if (activeMembers && activeMembers.length > 0 && !force) {
      return NextResponse.json(
        { 
          error: '该部门下还有活跃成员，无法删除',
          member_count: activeMembers.length,
          suggestion: '请先转移部门成员，或使用强制删除'
        },
        { status: 400 }
      );
    }

    if (force) {
      // 强制删除：先处理子部门和成员
      if (children && children.length > 0) {
        // 将子部门移动到被删除部门的父部门下
        await supabase
          .from('departments')
          .update({ 
            parent_id: department.parent_id,
            updated_by: auth.adminUser.id
          })
          .eq('parent_id', id);
      }

      if (activeMembers && activeMembers.length > 0) {
        // 将活跃成员状态设为已转移
        await supabase
          .from('user_departments')
          .update({ 
            status: 'transferred',
            end_date: new Date().toISOString().split('T')[0],
            updated_by: auth.adminUser.id
          })
          .eq('department_id', id)
          .eq('status', 'active');
      }
    }

    // 删除部门（软删除：设置状态为archived）
    const { error: deleteError } = await supabase
      .from('departments')
      .update({ 
        status: 'archived',
        updated_by: auth.adminUser.id
      })
      .eq('id', id);

    if (deleteError) {
      console.error('删除部门失败:', deleteError);
      return NextResponse.json(
        { error: '删除部门失败' },
        { status: 500 }
      );
    }

    // 记录操作日志
    await logOperation(
      supabase,
      'delete_department',
      auth.adminUser.id,
      {
        department_id: id,
        department_name: department.name,
        department_code: department.code,
        force_delete: force,
        children_count: children?.length || 0,
        member_count: activeMembers?.length || 0
      },
      request
    );

    return NextResponse.json({
      message: '部门删除成功'
    });

  } catch (error) {
    console.error('删除部门异常:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}