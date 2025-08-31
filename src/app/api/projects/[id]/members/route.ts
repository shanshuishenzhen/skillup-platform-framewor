import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { MemberRole } from '@/types/project';

// 初始化 Supabase 客户端
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

/**
 * 获取项目成员列表
 * GET /api/projects/[id]/members
 * 支持查询参数：
 * - role: 角色过滤
 * - search: 搜索关键词（姓名或邮箱）
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id: projectId } = await params;
    const { searchParams } = new URL(request.url);
    
    const role = searchParams.get('role') as MemberRole | null;
    const search = searchParams.get('search');

    if (!projectId) {
      return NextResponse.json(
        { error: '项目ID不能为空' },
        { status: 400 }
      );
    }

    // 验证项目是否存在
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .single();

    if (projectError) {
      if (projectError.code === 'PGRST116') {
        return NextResponse.json(
          { error: '项目不存在' },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: '验证项目失败', details: projectError.message },
        { status: 500 }
      );
    }

    // 构建查询
    let query = supabase
      .from('project_members')
      .select(`
        *,
        user:users(
          id,
          email,
          name,
          avatar_url
        )
      `)
      .eq('project_id', projectId);

    // 应用过滤条件
    if (role) {
      query = query.eq('role', role);
    }

    const { data: members, error } = await query.order('joined_at', { ascending: false });

    if (error) {
      console.error('获取项目成员失败:', error);
      return NextResponse.json(
        { error: '获取项目成员失败', details: error.message },
        { status: 500 }
      );
    }

    // 如果有搜索条件，在客户端过滤（因为关联表搜索比较复杂）
    let filteredMembers = members || [];
    if (search) {
      const searchLower = search.toLowerCase();
      filteredMembers = filteredMembers.filter(member =>
        member.user?.name?.toLowerCase().includes(searchLower) ||
        member.user?.email?.toLowerCase().includes(searchLower)
      );
    }

    return NextResponse.json({
      members: filteredMembers,
      total: filteredMembers.length
    });
  } catch (error) {
    console.error('API错误:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

/**
 * 添加项目成员
 * POST /api/projects/[id]/members
 * 请求体：{ user_id: string, role: MemberRole, added_by: string }
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id: projectId } = await params;
    const body = await request.json();
    const { user_id, role = 'member', added_by } = body;

    if (!projectId) {
      return NextResponse.json(
        { error: '项目ID不能为空' },
        { status: 400 }
      );
    }

    // 验证必填字段
    if (!user_id || !added_by) {
      return NextResponse.json(
        { error: '用户ID和添加者ID为必填字段' },
        { status: 400 }
      );
    }

    // 验证项目是否存在
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, name')
      .eq('id', projectId)
      .single();

    if (projectError) {
      if (projectError.code === 'PGRST116') {
        return NextResponse.json(
          { error: '项目不存在' },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: '验证项目失败', details: projectError.message },
        { status: 500 }
      );
    }

    // 验证用户是否存在
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, name')
      .eq('id', user_id)
      .single();

    if (userError) {
      if (userError.code === 'PGRST116') {
        return NextResponse.json(
          { error: '用户不存在' },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: '验证用户失败', details: userError.message },
        { status: 500 }
      );
    }

    // 检查用户是否已经是项目成员
    const { data: existingMember, error: checkError } = await supabase
      .from('project_members')
      .select('id')
      .eq('project_id', projectId)
      .eq('user_id', user_id)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('检查成员状态失败:', checkError);
      return NextResponse.json(
        { error: '检查成员状态失败', details: checkError.message },
        { status: 500 }
      );
    }

    if (existingMember) {
      return NextResponse.json(
        { error: '用户已经是项目成员' },
        { status: 409 }
      );
    }

    // 添加项目成员
    const { data: member, error: memberError } = await supabase
      .from('project_members')
      .insert({
        project_id: projectId,
        user_id,
        role,
        joined_at: new Date().toISOString()
      })
      .select(`
        *,
        user:users(
          id,
          email,
          full_name,
          avatar_url
        )
      `)
      .single();

    if (memberError) {
      console.error('添加项目成员失败:', memberError);
      return NextResponse.json(
        { error: '添加项目成员失败', details: memberError.message },
        { status: 500 }
      );
    }

    // 记录活动日志
    await supabase
      .from('project_activities')
      .insert({
        project_id: projectId,
        user_id: added_by,
        action: 'member_added',
        description: `添加了成员 "${user.name || user.email}" (${role})`,
        created_at: new Date().toISOString()
      });

    return NextResponse.json(member, { status: 201 });
  } catch (error) {
    console.error('API错误:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

/**
 * 更新项目成员角色
 * PUT /api/projects/[id]/members
 * 请求体：{ user_id: string, role: MemberRole, updated_by: string }
 */
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id: projectId } = await params;
    const body = await request.json();
    const { user_id, role, updated_by } = body;

    if (!projectId) {
      return NextResponse.json(
        { error: '项目ID不能为空' },
        { status: 400 }
      );
    }

    // 验证必填字段
    if (!user_id || !role || !updated_by) {
      return NextResponse.json(
        { error: '用户ID、角色和更新者ID为必填字段' },
        { status: 400 }
      );
    }

    // 获取原成员信息
    const { data: originalMember, error: fetchError } = await supabase
      .from('project_members')
      .select(`
        *,
        user:users(
          id,
          email,
          full_name,
          avatar_url
        )
      `)
      .eq('project_id', projectId)
      .eq('user_id', user_id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json(
          { error: '成员不存在' },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: '获取成员信息失败', details: fetchError.message },
        { status: 500 }
      );
    }

    // 更新成员角色
    const { data: updatedMember, error: updateError } = await supabase
      .from('project_members')
      .update({ role })
      .eq('project_id', projectId)
      .eq('user_id', user_id)
      .select(`
        *,
        user:users(
          id,
          email,
          full_name,
          avatar_url
        )
      `)
      .single();

    if (updateError) {
      console.error('更新成员角色失败:', updateError);
      return NextResponse.json(
        { error: '更新成员角色失败', details: updateError.message },
        { status: 500 }
      );
    }

    // 记录活动日志
    if (originalMember.role !== role) {
      await supabase
        .from('project_activities')
        .insert({
          project_id: projectId,
          user_id: updated_by,
          action: 'member_role_changed',
          description: `将成员 "${originalMember.user?.full_name || originalMember.user?.email}" 的角色从 "${originalMember.role}" 更改为 "${role}"`,
          created_at: new Date().toISOString()
        });
    }

    return NextResponse.json(updatedMember);
  } catch (error) {
    console.error('API错误:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

/**
 * 移除项目成员
 * DELETE /api/projects/[id]/members
 * 请求体：{ user_id: string, removed_by: string }
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id: projectId } = await params;
    const body = await request.json();
    const { user_id, removed_by } = body;

    if (!projectId) {
      return NextResponse.json(
        { error: '项目ID不能为空' },
        { status: 400 }
      );
    }

    // 验证必填字段
    if (!user_id || !removed_by) {
      return NextResponse.json(
        { error: '用户ID和移除者ID为必填字段' },
        { status: 400 }
      );
    }

    // 获取要移除的成员信息
    const { data: memberToRemove, error: fetchError } = await supabase
      .from('project_members')
      .select(`
        *,
        user:users(
          id,
          email,
          name,
          avatar_url
        )
      `)
      .eq('project_id', projectId)
      .eq('user_id', user_id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json(
          { error: '成员不存在' },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: '获取成员信息失败', details: fetchError.message },
        { status: 500 }
      );
    }

    // 检查是否为项目负责人（不能移除项目负责人）
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('owner_id')
      .eq('id', projectId)
      .single();

    if (projectError) {
      return NextResponse.json(
        { error: '获取项目信息失败', details: projectError.message },
        { status: 500 }
      );
    }

    if (project.owner_id === user_id) {
      return NextResponse.json(
        { error: '不能移除项目负责人' },
        { status: 400 }
      );
    }

    // 移除项目成员
    const { error: deleteError } = await supabase
      .from('project_members')
      .delete()
      .eq('project_id', projectId)
      .eq('user_id', user_id);

    if (deleteError) {
      console.error('移除项目成员失败:', deleteError);
      return NextResponse.json(
        { error: '移除项目成员失败', details: deleteError.message },
        { status: 500 }
      );
    }

    // 将该成员的任务分配给项目负责人
    await supabase
      .from('tasks')
      .update({ assignee_id: project.owner_id })
      .eq('project_id', projectId)
      .eq('assignee_id', user_id);

    // 记录活动日志
    await supabase
      .from('project_activities')
      .insert({
        project_id: projectId,
        user_id: removed_by,
        action: 'member_removed',
        description: `移除了成员 "${memberToRemove.user?.full_name || memberToRemove.user?.email}"`,
        created_at: new Date().toISOString()
      });

    return NextResponse.json({
      message: '成功移除项目成员',
      removedMember: memberToRemove
    });
  } catch (error) {
    console.error('API错误:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}