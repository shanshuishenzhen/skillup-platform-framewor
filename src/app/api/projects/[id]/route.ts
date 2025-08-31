import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Project, ProjectStatus, ProjectPriority } from '@/types/project';

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
 * 获取单个项目详情
 * GET /api/projects/[id]
 * 包含项目基本信息、成员、任务、文件和活动日志
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: '项目ID不能为空' },
        { status: 400 }
      );
    }

    // 获取项目详情
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select(`
        *,
        owner:users!projects_owner_id_fkey(
          id,
          email,
          name,
          avatar_url
        )
      `)
      .eq('id', id)
      .single();

    if (projectError) {
      if (projectError.code === 'PGRST116') {
        return NextResponse.json(
          { error: '项目不存在' },
          { status: 404 }
        );
      }
      console.error('获取项目失败:', projectError);
      return NextResponse.json(
        { error: '获取项目失败', details: projectError.message },
        { status: 500 }
      );
    }

    // 获取项目成员
    const { data: members, error: membersError } = await supabase
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
      .eq('project_id', id);

    if (membersError) {
      console.error('获取项目成员失败:', membersError);
    }

    // 获取项目任务
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select(`
        *,
        assignee:users(
          id,
          email,
          name,
          avatar_url
        )
      `)
      .eq('project_id', id)
      .order('created_at', { ascending: false });

    if (tasksError) {
      console.error('获取项目任务失败:', tasksError);
    }

    // 获取项目文件
    const { data: files, error: filesError } = await supabase
      .from('project_files')
      .select(`
        *,
        uploaded_by:users(
          id,
          email,
          name,
          avatar_url
        )
      `)
      .eq('project_id', id)
      .order('uploaded_at', { ascending: false });

    if (filesError) {
      console.error('获取项目文件失败:', filesError);
    }

    // 获取活动日志
    const { data: activities, error: activitiesError } = await supabase
      .from('project_activities')
      .select(`
        *,
        user:users(
          id,
          email,
          name,
          avatar_url
        )
      `)
      .eq('project_id', id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (activitiesError) {
      console.error('获取活动日志失败:', activitiesError);
    }

    // 计算项目统计信息
    const totalTasks = tasks?.length || 0;
    const completedTasks = tasks?.filter(task => task.status === 'completed').length || 0;
    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    const projectWithDetails = {
      ...project,
      members: members || [],
      tasks: tasks || [],
      files: files || [],
      activities: activities || [],
      stats: {
        total_tasks: totalTasks,
        completed_tasks: completedTasks,
        progress,
        total_members: members?.length || 0,
        total_files: files?.length || 0
      }
    };

    return NextResponse.json(projectWithDetails);
  } catch (error) {
    console.error('API错误:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

/**
 * 更新项目信息
 * PUT /api/projects/[id]
 * 请求体：要更新的项目字段
 */
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: '项目ID不能为空' },
        { status: 400 }
      );
    }

    const {
      name,
      description,
      status,
      priority,
      start_date,
      end_date,
      budget,
      owner_id,
      user_id // 操作用户ID，用于记录活动日志
    } = body;

    // 验证日期
    if (start_date && end_date && new Date(start_date) > new Date(end_date)) {
      return NextResponse.json(
        { error: '开始日期不能晚于结束日期' },
        { status: 400 }
      );
    }

    // 检查项目是否存在
    const { data: existingProject, error: checkError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .single();

    if (checkError) {
      if (checkError.code === 'PGRST116') {
        return NextResponse.json(
          { error: '项目不存在' },
          { status: 404 }
        );
      }
      console.error('检查项目失败:', checkError);
      return NextResponse.json(
        { error: '检查项目失败', details: checkError.message },
        { status: 500 }
      );
    }

    // 构建更新数据
    const updateData: Partial<Project> = {
      updated_at: new Date().toISOString()
    };

    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) updateData.status = status;
    if (priority !== undefined) updateData.priority = priority;
    if (start_date !== undefined) updateData.start_date = start_date;
    if (end_date !== undefined) updateData.end_date = end_date;
    if (budget !== undefined) updateData.budget = budget;
    if (owner_id !== undefined) updateData.owner_id = owner_id;

    // 更新项目
    const { data: updatedProject, error: updateError } = await supabase
      .from('projects')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('更新项目失败:', updateError);
      return NextResponse.json(
        { error: '更新项目失败', details: updateError.message },
        { status: 500 }
      );
    }

    // 记录活动日志
    if (user_id) {
      const changes = [];
      if (name && name !== existingProject.name) {
        changes.push(`名称从 "${existingProject.name}" 更改为 "${name}"`);
      }
      if (status && status !== existingProject.status) {
        changes.push(`状态从 "${existingProject.status}" 更改为 "${status}"`);
      }
      if (priority && priority !== existingProject.priority) {
        changes.push(`优先级从 "${existingProject.priority}" 更改为 "${priority}"`);
      }

      if (changes.length > 0) {
        await supabase
          .from('project_activities')
          .insert({
            project_id: id,
            user_id,
            action: 'project_updated',
            description: `更新了项目信息：${changes.join('，')}`,
            created_at: new Date().toISOString()
          });
      }
    }

    return NextResponse.json(updatedProject);
  } catch (error) {
    console.error('API错误:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

/**
 * 删除项目
 * DELETE /api/projects/[id]
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: '项目ID不能为空' },
        { status: 400 }
      );
    }

    // 检查项目是否存在
    const { data: existingProject, error: checkError } = await supabase
      .from('projects')
      .select('id, name')
      .eq('id', id)
      .single();

    if (checkError) {
      if (checkError.code === 'PGRST116') {
        return NextResponse.json(
          { error: '项目不存在' },
          { status: 404 }
        );
      }
      console.error('检查项目失败:', checkError);
      return NextResponse.json(
        { error: '检查项目失败', details: checkError.message },
        { status: 500 }
      );
    }

    // 删除相关数据（级联删除）
    try {
      // 1. 删除项目成员
      await supabase
        .from('project_members')
        .delete()
        .eq('project_id', id);

      // 2. 删除任务
      await supabase
        .from('tasks')
        .delete()
        .eq('project_id', id);

      // 3. 删除文件
      await supabase
        .from('project_files')
        .delete()
        .eq('project_id', id);

      // 4. 删除活动日志
      await supabase
        .from('project_activities')
        .delete()
        .eq('project_id', id);

      // 5. 删除项目
      const { error: deleteError } = await supabase
        .from('projects')
        .delete()
        .eq('id', id);

      if (deleteError) {
        console.error('删除项目失败:', deleteError);
        return NextResponse.json(
          { error: '删除项目失败', details: deleteError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        message: `项目 "${existingProject.name}" 删除成功`,
        deletedId: id
      });
    } catch (deleteError) {
      console.error('删除相关数据失败:', deleteError);
      return NextResponse.json(
        { error: '删除项目相关数据失败' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('API错误:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}