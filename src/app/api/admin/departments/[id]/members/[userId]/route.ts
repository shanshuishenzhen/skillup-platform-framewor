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

// 更新成员信息验证模式
const UpdateMemberSchema = z.object({
  position: z.string().max(100).optional(),
  is_primary: z.boolean().optional(),
  is_manager: z.boolean().optional(),
  status: z.enum(['active', 'inactive', 'transferred']).optional(),
  end_date: z.string().optional(),
  reason: z.string().optional()
});

// GET /api/admin/departments/[id]/members/[userId] - 获取单个部门成员详情
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; userId: string } }
) {
  try {
    const auth = await verifyAdminAuth(request);
    if (!auth) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      );
    }

    const { id: departmentId, userId } = params;
    const { searchParams } = new URL(request.url);
    const includeHistory = searchParams.get('include_history') === 'true';

    const supabase = getSupabaseClient();

    // 获取成员详情
    const { data: member, error } = await supabase
      .from('user_departments_with_details')
      .select('*')
      .eq('department_id', departmentId)
      .eq('user_id', userId)
      .single();

    if (error || !member) {
      return NextResponse.json(
        { error: '成员不存在或不在该部门中' },
        { status: 404 }
      );
    }

    const result: any = { member };

    // 包含历史记录
    if (includeHistory) {
      const { data: history } = await supabase
        .from('user_department_history')
        .select(`
          *,
          departments!department_id(name),
          old_departments:departments!old_department_id(name)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);
      
      result.history = history || [];
    }

    // 获取用户在其他部门的情况
    const { data: otherDepartments } = await supabase
      .from('user_departments_with_details')
      .select('department_id, department_name, position, is_primary, is_manager, status')
      .eq('user_id', userId)
      .neq('department_id', departmentId);
    
    result.other_departments = otherDepartments || [];

    return NextResponse.json(result);

  } catch (error) {
    console.error('获取部门成员详情异常:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/departments/[id]/members/[userId] - 更新部门成员信息
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; userId: string } }
) {
  try {
    const auth = await verifyAdminAuth(request);
    if (!auth) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      );
    }

    const { id: departmentId, userId } = params;
    const body = await request.json();
    const validatedData = UpdateMemberSchema.parse(body);

    const supabase = getSupabaseClient();

    // 验证成员是否存在
    const { data: currentMember } = await supabase
      .from('user_departments')
      .select('*')
      .eq('department_id', departmentId)
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (!currentMember) {
      return NextResponse.json(
        { error: '成员不存在或不在该部门中' },
        { status: 404 }
      );
    }

    // 获取部门和用户信息
    const [departmentResult, userResult] = await Promise.all([
      supabase.from('departments').select('id, name').eq('id', departmentId).single(),
      supabase.from('users').select('id, name, email').eq('id', userId).single()
    ]);

    if (!departmentResult.data || !userResult.data) {
      return NextResponse.json(
        { error: '部门或用户不存在' },
        { status: 404 }
      );
    }

    const department = departmentResult.data;
    const user = userResult.data;

    // 特殊验证
    if (validatedData.is_manager === true) {
      // 检查是否已有其他管理者
      const { data: currentManager } = await supabase
        .from('user_departments')
        .select('user_id')
        .eq('department_id', departmentId)
        .eq('is_manager', true)
        .eq('status', 'active')
        .neq('user_id', userId)
        .single();

      if (currentManager) {
        return NextResponse.json(
          { error: '该部门已有其他管理者，请先取消现有管理者权限' },
          { status: 400 }
        );
      }
    }

    if (validatedData.is_primary === true) {
      // 取消用户在其他部门的主要标记
      await supabase
        .from('user_departments')
        .update({ is_primary: false, updated_by: auth.adminUser.id })
        .eq('user_id', userId)
        .eq('status', 'active')
        .neq('department_id', departmentId);
    }

    // 准备更新数据
    const updateData: any = {
      updated_by: auth.adminUser.id,
      updated_at: new Date().toISOString()
    };

    if (validatedData.position !== undefined) {
      updateData.position = validatedData.position;
    }
    if (validatedData.is_primary !== undefined) {
      updateData.is_primary = validatedData.is_primary;
    }
    if (validatedData.is_manager !== undefined) {
      updateData.is_manager = validatedData.is_manager;
    }
    if (validatedData.status !== undefined) {
      updateData.status = validatedData.status;
      if (validatedData.status !== 'active' && validatedData.end_date) {
        updateData.end_date = validatedData.end_date;
      }
    }

    // 更新成员信息
    const { data: updatedMember, error } = await supabase
      .from('user_departments')
      .update(updateData)
      .eq('department_id', departmentId)
      .eq('user_id', userId)
      .eq('status', 'active')
      .select()
      .single();

    if (error) {
      console.error('更新部门成员失败:', error);
      return NextResponse.json(
        { error: '更新部门成员失败' },
        { status: 500 }
      );
    }

    // 记录历史
    const historyData: any = {
      user_id: userId,
      department_id: departmentId,
      action: 'update',
      reason: validatedData.reason || '管理员更新',
      effective_date: new Date().toISOString().split('T')[0],
      created_by: auth.adminUser.id
    };

    // 记录具体变更
    if (validatedData.position !== undefined && validatedData.position !== currentMember.position) {
      historyData.old_position = currentMember.position;
      historyData.new_position = validatedData.position;
    }
    if (validatedData.is_manager !== undefined && validatedData.is_manager !== currentMember.is_manager) {
      historyData.action = validatedData.is_manager ? 'promote' : 'demote';
    }
    if (validatedData.status !== undefined && validatedData.status !== currentMember.status) {
      historyData.action = validatedData.status === 'active' ? 'reactivate' : 'deactivate';
    }

    await supabase
      .from('user_department_history')
      .insert(historyData);

    // 记录操作日志
    await logOperation(
      supabase,
      'update_department_member',
      auth.adminUser.id,
      {
        department_id: departmentId,
        department_name: department.name,
        user_id: userId,
        user_name: user.name,
        user_email: user.email,
        changes: validatedData,
        old_values: {
          position: currentMember.position,
          is_primary: currentMember.is_primary,
          is_manager: currentMember.is_manager,
          status: currentMember.status
        }
      },
      request
    );

    return NextResponse.json({
      message: '部门成员信息更新成功',
      member: updatedMember
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '数据验证失败', details: error.errors },
        { status: 400 }
      );
    }

    console.error('更新部门成员异常:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/departments/[id]/members/[userId] - 从部门移除成员
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; userId: string } }
) {
  try {
    const auth = await verifyAdminAuth(request);
    if (!auth) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      );
    }

    const { id: departmentId, userId } = params;
    const { searchParams } = new URL(request.url);
    const reason = searchParams.get('reason') || '管理员移除';
    const transferTo = searchParams.get('transfer_to'); // 转移到其他部门

    const supabase = getSupabaseClient();

    // 验证成员是否存在
    const { data: currentMember } = await supabase
      .from('user_departments')
      .select('*')
      .eq('department_id', departmentId)
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (!currentMember) {
      return NextResponse.json(
        { error: '成员不存在或不在该部门中' },
        { status: 404 }
      );
    }

    // 获取部门和用户信息
    const [departmentResult, userResult] = await Promise.all([
      supabase.from('departments').select('id, name').eq('id', departmentId).single(),
      supabase.from('users').select('id, name, email').eq('id', userId).single()
    ]);

    if (!departmentResult.data || !userResult.data) {
      return NextResponse.json(
        { error: '部门或用户不存在' },
        { status: 404 }
      );
    }

    const department = departmentResult.data;
    const user = userResult.data;

    let targetDepartment = null;
    
    // 如果是转移操作，验证目标部门
    if (transferTo) {
      const { data: target } = await supabase
        .from('departments')
        .select('id, name')
        .eq('id', transferTo)
        .eq('status', 'active')
        .single();

      if (!target) {
        return NextResponse.json(
          { error: '目标部门不存在或已停用' },
          { status: 400 }
        );
      }

      // 检查用户是否已在目标部门
      const { data: existingMember } = await supabase
        .from('user_departments')
        .select('id')
        .eq('department_id', transferTo)
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();

      if (existingMember) {
        return NextResponse.json(
          { error: '用户已在目标部门中' },
          { status: 400 }
        );
      }

      targetDepartment = target;
    }

    // 移除当前部门关联
    const { error: removeError } = await supabase
      .from('user_departments')
      .update({
        status: transferTo ? 'transferred' : 'inactive',
        end_date: new Date().toISOString().split('T')[0],
        updated_by: auth.adminUser.id
      })
      .eq('department_id', departmentId)
      .eq('user_id', userId)
      .eq('status', 'active');

    if (removeError) {
      console.error('移除部门成员失败:', removeError);
      return NextResponse.json(
        { error: '移除部门成员失败' },
        { status: 500 }
      );
    }

    // 如果是转移，创建新的部门关联
    if (transferTo && targetDepartment) {
      const { error: transferError } = await supabase
        .from('user_departments')
        .insert({
          user_id: userId,
          department_id: transferTo,
          position: currentMember.position,
          is_primary: currentMember.is_primary,
          is_manager: false, // 转移时取消管理者权限
          start_date: new Date().toISOString().split('T')[0],
          status: 'active',
          created_by: auth.adminUser.id,
          updated_by: auth.adminUser.id
        });

      if (transferError) {
        console.error('转移到新部门失败:', transferError);
        return NextResponse.json(
          { error: '转移到新部门失败' },
          { status: 500 }
        );
      }
    }

    // 记录历史
    const historyData: any = {
      user_id: userId,
      department_id: transferTo || departmentId,
      action: transferTo ? 'transfer' : 'leave',
      reason,
      effective_date: new Date().toISOString().split('T')[0],
      created_by: auth.adminUser.id
    };

    if (transferTo) {
      historyData.old_department_id = departmentId;
    }

    await supabase
      .from('user_department_history')
      .insert(historyData);

    // 记录操作日志
    await logOperation(
      supabase,
      transferTo ? 'transfer_department_member' : 'remove_department_member',
      auth.adminUser.id,
      {
        department_id: departmentId,
        department_name: department.name,
        target_department_id: transferTo,
        target_department_name: targetDepartment?.name,
        user_id: userId,
        user_name: user.name,
        user_email: user.email,
        reason,
        was_manager: currentMember.is_manager,
        was_primary: currentMember.is_primary
      },
      request
    );

    return NextResponse.json({
      message: transferTo ? '部门成员转移成功' : '部门成员移除成功',
      action: transferTo ? 'transfer' : 'remove',
      target_department: targetDepartment
    });

  } catch (error) {
    console.error('移除部门成员异常:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}