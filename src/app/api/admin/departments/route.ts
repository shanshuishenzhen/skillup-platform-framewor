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

// 部门创建/更新验证模式
const DepartmentSchema = z.object({
  name: z.string().min(1, '部门名称不能为空').max(100, '部门名称不能超过100个字符'),
  code: z.string().min(1, '部门编码不能为空').max(50, '部门编码不能超过50个字符'),
  description: z.string().optional(),
  parent_id: z.string().uuid().optional().nullable(),
  manager_id: z.string().uuid().optional().nullable(),
  contact_phone: z.string().max(20).optional().nullable(),
  contact_email: z.string().email('邮箱格式不正确').optional().nullable(),
  address: z.string().optional().nullable(),
  status: z.enum(['active', 'inactive', 'archived']).default('active'),
  sort_order: z.number().int().min(0).default(0)
});

// GET /api/admin/departments - 获取部门列表
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAdminAuth(request);
    if (!auth) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('include_inactive') === 'true';
    const parentId = searchParams.get('parent_id');
    const treeView = searchParams.get('tree_view') === 'true';
    const withStats = searchParams.get('with_stats') === 'true';

    const supabase = getSupabaseClient();
    
    let query = supabase
      .from('departments_with_manager')
      .select('*')
      .order('level')
      .order('sort_order')
      .order('name');

    // 状态过滤
    if (!includeInactive) {
      query = query.eq('status', 'active');
    }

    // 父部门过滤
    if (parentId) {
      if (parentId === 'root') {
        query = query.is('parent_id', null);
      } else {
        query = query.eq('parent_id', parentId);
      }
    }

    const { data: departments, error } = await query;

    if (error) {
      console.error('获取部门列表失败:', error);
      return NextResponse.json(
        { error: '获取部门列表失败' },
        { status: 500 }
      );
    }

    // 如果需要树形结构
    if (treeView) {
      const buildTree = (items: any[], parentId: string | null = null): any[] => {
        return items
          .filter(item => item.parent_id === parentId)
          .map(item => ({
            ...item,
            children: buildTree(items, item.id)
          }));
      };
      
      const tree = buildTree(departments);
      return NextResponse.json({ departments: tree });
    }

    // 如果需要统计信息
    if (withStats) {
      const { data: stats } = await supabase
        .from('department_member_stats')
        .select('*');
      
      const departmentsWithStats = departments.map(dept => {
        const stat = stats?.find(s => s.department_id === dept.id);
        return {
          ...dept,
          stats: stat || {
            active_members: 0,
            managers: 0,
            inactive_members: 0,
            transferred_members: 0,
            total_members: 0
          }
        };
      });
      
      return NextResponse.json({ departments: departmentsWithStats });
    }

    return NextResponse.json({ departments });

  } catch (error) {
    console.error('获取部门列表异常:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

// POST /api/admin/departments - 创建部门
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAdminAuth(request);
    if (!auth) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = DepartmentSchema.parse(body);

    const supabase = getSupabaseClient();

    // 检查部门编码是否已存在
    const { data: existingDept } = await supabase
      .from('departments')
      .select('id')
      .eq('code', validatedData.code)
      .single();

    if (existingDept) {
      return NextResponse.json(
        { error: '部门编码已存在' },
        { status: 400 }
      );
    }

    // 如果指定了父部门，验证父部门是否存在
    if (validatedData.parent_id) {
      const { data: parentDept } = await supabase
        .from('departments')
        .select('id, level')
        .eq('id', validatedData.parent_id)
        .eq('status', 'active')
        .single();

      if (!parentDept) {
        return NextResponse.json(
          { error: '指定的父部门不存在或已停用' },
          { status: 400 }
        );
      }

      // 检查层级深度（最多5层）
      if (parentDept.level >= 5) {
        return NextResponse.json(
          { error: '部门层级不能超过5层' },
          { status: 400 }
        );
      }
    }

    // 创建部门
    const { data: newDepartment, error } = await supabase
      .from('departments')
      .insert({
        ...validatedData,
        created_by: auth.adminUser.id,
        updated_by: auth.adminUser.id
      })
      .select()
      .single();

    if (error) {
      console.error('创建部门失败:', error);
      return NextResponse.json(
        { error: '创建部门失败' },
        { status: 500 }
      );
    }

    // 记录操作日志
    await logOperation(
      supabase,
      'create_department',
      auth.adminUser.id,
      {
        department_id: newDepartment.id,
        department_name: newDepartment.name,
        department_code: newDepartment.code,
        parent_id: newDepartment.parent_id
      },
      request
    );

    return NextResponse.json({
      message: '部门创建成功',
      department: newDepartment
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '数据验证失败', details: error.errors },
        { status: 400 }
      );
    }

    console.error('创建部门异常:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/departments - 批量更新部门排序
export async function PUT(request: NextRequest) {
  try {
    const auth = await verifyAdminAuth(request);
    if (!auth) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { departments } = body;

    if (!Array.isArray(departments)) {
      return NextResponse.json(
        { error: '无效的部门数据' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    // 批量更新部门排序
    const updates = departments.map(dept => ({
      id: dept.id,
      sort_order: dept.sort_order,
      parent_id: dept.parent_id,
      updated_by: auth.adminUser.id
    }));

    const { error } = await supabase
      .from('departments')
      .upsert(updates, { onConflict: 'id' });

    if (error) {
      console.error('更新部门排序失败:', error);
      return NextResponse.json(
        { error: '更新部门排序失败' },
        { status: 500 }
      );
    }

    // 记录操作日志
    await logOperation(
      supabase,
      'update_department_order',
      auth.adminUser.id,
      {
        updated_count: updates.length,
        department_ids: updates.map(u => u.id)
      },
      request
    );

    return NextResponse.json({
      message: '部门排序更新成功'
    });

  } catch (error) {
    console.error('更新部门排序异常:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}