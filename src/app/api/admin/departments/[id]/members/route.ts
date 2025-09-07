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

// 添加部门成员验证模式
const AddMemberSchema = z.object({
  user_ids: z.array(z.string().uuid()).min(1, '至少选择一个用户'),
  position: z.string().max(100).optional(),
  is_primary: z.boolean().default(false),
  is_manager: z.boolean().default(false),
  start_date: z.string().optional()
});

// 更新成员信息验证模式
const UpdateMemberSchema = z.object({
  position: z.string().max(100).optional(),
  is_primary: z.boolean().optional(),
  is_manager: z.boolean().optional(),
  status: z.enum(['active', 'inactive', 'transferred']).optional()
});

// 批量操作验证模式
const BatchOperationSchema = z.object({
  user_ids: z.array(z.string().uuid()).min(1, '至少选择一个用户'),
  action: z.enum(['transfer', 'remove', 'set_manager', 'unset_manager', 'set_primary']),
  target_department_id: z.string().uuid().optional(), // 转移时的目标部门
  reason: z.string().optional()
});

// GET /api/admin/departments/[id]/members - 获取部门成员列表
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

    const { id: departmentId } = params;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'active';
    const includeHistory = searchParams.get('include_history') === 'true';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search');

    const supabase = getSupabaseClient();

    // 验证部门是否存在
    const { data: department } = await supabase
      .from('departments')
      .select('id, name')
      .eq('id', departmentId)
      .single();

    if (!department) {
      return NextResponse.json(
        { error: '部门不存在' },
        { status: 404 }
      );
    }

    // 构建查询
    let query = supabase
      .from('user_departments_with_details')
      .select('*', { count: 'exact' })
      .eq('department_id', departmentId);

    // 状态过滤
    if (status !== 'all') {
      query = query.eq('status', status);
    }

    // 搜索过滤
    if (search) {
      query = query.or(`user_name.ilike.%${search}%,user_email.ilike.%${search}%,position.ilike.%${search}%`);
    }

    // 分页
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    // 排序
    query = query.order('is_manager', { ascending: false })
                 .order('is_primary', { ascending: false })
                 .order('user_name');

    const { data: members, error, count } = await query;

    if (error) {
      console.error('获取部门成员失败:', error);
      return NextResponse.json(
        { error: '获取部门成员失败' },
        { status: 500 }
      );
    }

    const result: any = {
      members: members || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit)
      },
      department
    };

    // 包含历史记录
    if (includeHistory) {
      const { data: history } = await supabase
        .from('user_department_history')
        .select(`
          *,
          users!user_id(name, email),
          old_departments:departments!old_department_id(name)
        `)
        .eq('department_id', departmentId)
        .order('created_at', { ascending: false })
        .limit(100);
      
      result.history = history || [];
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error('获取部门成员异常:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

// POST /api/admin/departments/[id]/members - 添加部门成员
export async function POST(
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

    const { id: departmentId } = params;
    const body = await request.json();
    const validatedData = AddMemberSchema.parse(body);

    const supabase = getSupabaseClient();

    // 验证部门是否存在
    const { data: department } = await supabase
      .from('departments')
      .select('id, name')
      .eq('id', departmentId)
      .eq('status', 'active')
      .single();

    if (!department) {
      return NextResponse.json(
        { error: '部门不存在或已停用' },
        { status: 404 }
      );
    }

    // 验证用户是否存在
    const { data: users } = await supabase
      .from('users')
      .select('id, name, email')
      .in('id', validatedData.user_ids);

    if (!users || users.length !== validatedData.user_ids.length) {
      return NextResponse.json(
        { error: '部分用户不存在' },
        { status: 400 }
      );
    }

    // 检查用户是否已在该部门
    const { data: existingMembers } = await supabase
      .from('user_departments')
      .select('user_id')
      .eq('department_id', departmentId)
      .eq('status', 'active')
      .in('user_id', validatedData.user_ids);

    if (existingMembers && existingMembers.length > 0) {
      const existingUserIds = existingMembers.map(m => m.user_id);
      const existingUsers = users.filter(u => existingUserIds.includes(u.id));
      return NextResponse.json(
        { 
          error: '以下用户已在该部门中',
          existing_users: existingUsers.map(u => ({ id: u.id, name: u.name, email: u.email }))
        },
        { status: 400 }
      );
    }

    // 如果设置为管理者，检查是否已有管理者
    if (validatedData.is_manager) {
      const { data: currentManager } = await supabase
        .from('user_departments')
        .select('user_id')
        .eq('department_id', departmentId)
        .eq('is_manager', true)
        .eq('status', 'active')
        .single();

      if (currentManager) {
        return NextResponse.json(
          { error: '该部门已有管理者，请先取消现有管理者权限' },
          { status: 400 }
        );
      }
    }

    // 批量添加成员
    const memberData = validatedData.user_ids.map(userId => ({
      user_id: userId,
      department_id: departmentId,
      position: validatedData.position,
      is_primary: validatedData.is_primary,
      is_manager: validatedData.is_manager,
      start_date: validatedData.start_date || new Date().toISOString().split('T')[0],
      status: 'active',
      created_by: auth.adminUser.id,
      updated_by: auth.adminUser.id
    }));

    const { data: newMembers, error } = await supabase
      .from('user_departments')
      .insert(memberData)
      .select();

    if (error) {
      console.error('添加部门成员失败:', error);
      return NextResponse.json(
        { error: '添加部门成员失败' },
        { status: 500 }
      );
    }

    // 记录历史
    const historyData = validatedData.user_ids.map(userId => ({
      user_id: userId,
      department_id: departmentId,
      action: 'join',
      new_position: validatedData.position,
      reason: '管理员添加',
      effective_date: validatedData.start_date || new Date().toISOString().split('T')[0],
      created_by: auth.adminUser.id
    }));

    await supabase
      .from('user_department_history')
      .insert(historyData);

    // 记录操作日志
    await logOperation(
      supabase,
      'add_department_members',
      auth.adminUser.id,
      {
        department_id: departmentId,
        department_name: department.name,
        user_ids: validatedData.user_ids,
        user_count: validatedData.user_ids.length,
        position: validatedData.position,
        is_manager: validatedData.is_manager,
        is_primary: validatedData.is_primary
      },
      request
    );

    return NextResponse.json({
      message: '部门成员添加成功',
      members: newMembers,
      count: newMembers?.length || 0
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '数据验证失败', details: error.errors },
        { status: 400 }
      );
    }

    console.error('添加部门成员异常:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/departments/[id]/members - 批量操作部门成员
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

    const { id: departmentId } = params;
    const body = await request.json();
    const validatedData = BatchOperationSchema.parse(body);

    const supabase = getSupabaseClient();

    // 验证部门是否存在
    const { data: department } = await supabase
      .from('departments')
      .select('id, name')
      .eq('id', departmentId)
      .single();

    if (!department) {
      return NextResponse.json(
        { error: '部门不存在' },
        { status: 404 }
      );
    }

    // 验证目标部门（转移操作）
    let targetDepartment = null;
    if (validatedData.action === 'transfer' && validatedData.target_department_id) {
      const { data: target } = await supabase
        .from('departments')
        .select('id, name')
        .eq('id', validatedData.target_department_id)
        .eq('status', 'active')
        .single();

      if (!target) {
        return NextResponse.json(
          { error: '目标部门不存在或已停用' },
          { status: 400 }
        );
      }
      targetDepartment = target;
    }

    // 验证用户是否在该部门
    const { data: currentMembers } = await supabase
      .from('user_departments')
      .select('*')
      .eq('department_id', departmentId)
      .eq('status', 'active')
      .in('user_id', validatedData.user_ids);

    if (!currentMembers || currentMembers.length !== validatedData.user_ids.length) {
      return NextResponse.json(
        { error: '部分用户不在该部门中' },
        { status: 400 }
      );
    }

    let updateResult;
    let historyAction;
    let historyData;

    switch (validatedData.action) {
      case 'transfer':
        if (!targetDepartment) {
          return NextResponse.json(
            { error: '转移操作需要指定目标部门' },
            { status: 400 }
          );
        }

        // 结束当前部门关联
        await supabase
          .from('user_departments')
          .update({
            status: 'transferred',
            end_date: new Date().toISOString().split('T')[0],
            updated_by: auth.adminUser.id
          })
          .eq('department_id', departmentId)
          .eq('status', 'active')
          .in('user_id', validatedData.user_ids);

        // 创建新的部门关联
        const transferData = validatedData.user_ids.map(userId => {
          const currentMember = currentMembers.find(m => m.user_id === userId);
          return {
            user_id: userId,
            department_id: validatedData.target_department_id!,
            position: currentMember?.position,
            is_primary: currentMember?.is_primary || false,
            is_manager: false, // 转移时取消管理者权限
            start_date: new Date().toISOString().split('T')[0],
            status: 'active',
            created_by: auth.adminUser.id,
            updated_by: auth.adminUser.id
          };
        });

        updateResult = await supabase
          .from('user_departments')
          .insert(transferData)
          .select();

        historyAction = 'transfer';
        historyData = validatedData.user_ids.map(userId => ({
          user_id: userId,
          department_id: validatedData.target_department_id!,
          old_department_id: departmentId,
          action: historyAction,
          reason: validatedData.reason || '管理员转移',
          effective_date: new Date().toISOString().split('T')[0],
          created_by: auth.adminUser.id
        }));
        break;

      case 'remove':
        updateResult = await supabase
          .from('user_departments')
          .update({
            status: 'inactive',
            end_date: new Date().toISOString().split('T')[0],
            updated_by: auth.adminUser.id
          })
          .eq('department_id', departmentId)
          .eq('status', 'active')
          .in('user_id', validatedData.user_ids)
          .select();

        historyAction = 'leave';
        historyData = validatedData.user_ids.map(userId => ({
          user_id: userId,
          department_id: departmentId,
          action: historyAction,
          reason: validatedData.reason || '管理员移除',
          effective_date: new Date().toISOString().split('T')[0],
          created_by: auth.adminUser.id
        }));
        break;

      case 'set_manager':
        if (validatedData.user_ids.length > 1) {
          return NextResponse.json(
            { error: '一个部门只能有一个管理者' },
            { status: 400 }
          );
        }

        // 取消现有管理者
        await supabase
          .from('user_departments')
          .update({ is_manager: false, updated_by: auth.adminUser.id })
          .eq('department_id', departmentId)
          .eq('is_manager', true)
          .eq('status', 'active');

        // 设置新管理者
        updateResult = await supabase
          .from('user_departments')
          .update({
            is_manager: true,
            updated_by: auth.adminUser.id
          })
          .eq('department_id', departmentId)
          .eq('status', 'active')
          .in('user_id', validatedData.user_ids)
          .select();

        historyAction = 'promote';
        historyData = validatedData.user_ids.map(userId => ({
          user_id: userId,
          department_id: departmentId,
          action: historyAction,
          new_position: '部门管理者',
          reason: validatedData.reason || '管理员设置',
          effective_date: new Date().toISOString().split('T')[0],
          created_by: auth.adminUser.id
        }));
        break;

      case 'unset_manager':
        updateResult = await supabase
          .from('user_departments')
          .update({
            is_manager: false,
            updated_by: auth.adminUser.id
          })
          .eq('department_id', departmentId)
          .eq('status', 'active')
          .in('user_id', validatedData.user_ids)
          .select();

        historyAction = 'demote';
        historyData = validatedData.user_ids.map(userId => ({
          user_id: userId,
          department_id: departmentId,
          action: historyAction,
          old_position: '部门管理者',
          reason: validatedData.reason || '管理员取消',
          effective_date: new Date().toISOString().split('T')[0],
          created_by: auth.adminUser.id
        }));
        break;

      case 'set_primary':
        if (validatedData.user_ids.length > 1) {
          return NextResponse.json(
            { error: '用户只能有一个主要部门' },
            { status: 400 }
          );
        }

        // 取消用户其他部门的主要标记
        await supabase
          .from('user_departments')
          .update({ is_primary: false, updated_by: auth.adminUser.id })
          .in('user_id', validatedData.user_ids)
          .eq('status', 'active');

        // 设置主要部门
        updateResult = await supabase
          .from('user_departments')
          .update({
            is_primary: true,
            updated_by: auth.adminUser.id
          })
          .eq('department_id', departmentId)
          .eq('status', 'active')
          .in('user_id', validatedData.user_ids)
          .select();

        historyAction = 'promote';
        historyData = validatedData.user_ids.map(userId => ({
          user_id: userId,
          department_id: departmentId,
          action: historyAction,
          reason: validatedData.reason || '设置为主要部门',
          effective_date: new Date().toISOString().split('T')[0],
          created_by: auth.adminUser.id
        }));
        break;

      default:
        return NextResponse.json(
          { error: '不支持的操作类型' },
          { status: 400 }
        );
    }

    if (updateResult?.error) {
      console.error('批量操作失败:', updateResult.error);
      return NextResponse.json(
        { error: '批量操作失败' },
        { status: 500 }
      );
    }

    // 记录历史
    if (historyData) {
      await supabase
        .from('user_department_history')
        .insert(historyData);
    }

    // 记录操作日志
    await logOperation(
      supabase,
      `batch_${validatedData.action}_members`,
      auth.adminUser.id,
      {
        department_id: departmentId,
        department_name: department.name,
        target_department_id: validatedData.target_department_id,
        target_department_name: targetDepartment?.name,
        user_ids: validatedData.user_ids,
        user_count: validatedData.user_ids.length,
        action: validatedData.action,
        reason: validatedData.reason
      },
      request
    );

    return NextResponse.json({
      message: '批量操作成功',
      action: validatedData.action,
      affected_count: validatedData.user_ids.length,
      target_department: targetDepartment
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '数据验证失败', details: error.errors },
        { status: 400 }
      );
    }

    console.error('批量操作部门成员异常:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}