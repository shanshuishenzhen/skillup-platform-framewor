import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Task, TaskStatus, TaskPriority } from '@/types/project';

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
 * 获取项目任务列表
 * GET /api/projects/[id]/tasks
 * 支持查询参数：
 * - status: 任务状态过滤
 * - priority: 优先级过滤
 * - assignee_id: 负责人过滤
 * - search: 搜索关键词
 * - page: 页码
 * - limit: 每页数量
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id: projectId } = await params;
    const { searchParams } = new URL(request.url);
    
    const status = searchParams.get('status') as TaskStatus | null;
    const priority = searchParams.get('priority') as TaskPriority | null;
    const assigneeId = searchParams.get('assignee_id');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

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
      .from('tasks')
      .select(`
        *,
        assignee:users(
          id,
          email,
          full_name,
          avatar_url
        ),
        creator:users!tasks_created_by_fkey(
          id,
          email,
          full_name,
          avatar_url
        )
      `, { count: 'exact' })
      .eq('project_id', projectId);

    // 应用过滤条件
    if (status) {
      query = query.eq('status', status);
    }

    if (priority) {
      query = query.eq('priority', priority);
    }

    if (assigneeId) {
      query = query.eq('assignee_id', assigneeId);
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }

    // 应用排序和分页
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: tasks, error, count } = await query;

    if (error) {
      console.error('获取任务列表失败:', error);
      return NextResponse.json(
        { error: '获取任务列表失败', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      tasks: tasks || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
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
 * 创建新任务
 * POST /api/projects/[id]/tasks
 * 请求体：任务信息
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id: projectId } = await params;
    const body = await request.json();

    if (!projectId) {
      return NextResponse.json(
        { error: '项目ID不能为空' },
        { status: 400 }
      );
    }

    const {
      title,
      description,
      status = 'todo',
      priority = 'medium',
      assignee_id,
      start_date,
      due_date,
      estimated_hours,
      created_by
    } = body;

    // 验证必填字段
    if (!title || !created_by) {
      return NextResponse.json(
        { error: '任务标题和创建者为必填字段' },
        { status: 400 }
      );
    }

    // 验证日期
    if (start_date && due_date && new Date(start_date) > new Date(due_date)) {
      return NextResponse.json(
        { error: '开始日期不能晚于截止日期' },
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

    // 创建任务
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .insert({
        project_id: projectId,
        title,
        description,
        status,
        priority,
        assignee_id,
        start_date,
        due_date,
        estimated_hours: estimated_hours || 0,
        actual_hours: 0,
        progress: 0,
        created_by,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select(`
        *,
        assignee:users(
          id,
          email,
          full_name,
          avatar_url
        ),
        creator:users!tasks_created_by_fkey(
          id,
          email,
          full_name,
          avatar_url
        )
      `)
      .single();

    if (taskError) {
      console.error('创建任务失败:', taskError);
      return NextResponse.json(
        { error: '创建任务失败', details: taskError.message },
        { status: 500 }
      );
    }

    // 记录活动日志
    await supabase
      .from('project_activities')
      .insert({
        project_id: projectId,
        user_id: created_by,
        action: 'task_created',
        description: `创建了任务 "${title}"`,
        created_at: new Date().toISOString()
      });

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error('API错误:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

/**
 * 批量更新任务
 * PUT /api/projects/[id]/tasks
 * 请求体：{ tasks: Array<{ id: string, ...updateData }>, user_id: string }
 */
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id: projectId } = await params;
    const body = await request.json();
    const { tasks: tasksToUpdate, user_id } = body;

    if (!projectId) {
      return NextResponse.json(
        { error: '项目ID不能为空' },
        { status: 400 }
      );
    }

    if (!tasksToUpdate || !Array.isArray(tasksToUpdate) || tasksToUpdate.length === 0) {
      return NextResponse.json(
        { error: '请提供要更新的任务列表' },
        { status: 400 }
      );
    }

    const updatedTasks = [];
    const activities = [];

    // 逐个更新任务
    for (const taskUpdate of tasksToUpdate) {
      const { id: taskId, ...updateData } = taskUpdate;

      if (!taskId) {
        continue;
      }

      // 获取原任务信息
      const { data: originalTask } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', taskId)
        .eq('project_id', projectId)
        .single();

      if (!originalTask) {
        continue;
      }

      // 更新任务
      const { data: updatedTask, error: updateError } = await supabase
        .from('tasks')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId)
        .eq('project_id', projectId)
        .select(`
          *,
          assignee:users(
            id,
            email,
            full_name,
            avatar_url
          )
        `)
        .single();

      if (updateError) {
        console.error(`更新任务 ${taskId} 失败:`, updateError);
        continue;
      }

      updatedTasks.push(updatedTask);

      // 记录状态变更活动
      if (updateData.status && updateData.status !== originalTask.status && user_id) {
        activities.push({
          project_id: projectId,
          user_id,
          action: 'task_status_changed',
          description: `将任务 "${originalTask.title}" 状态从 "${originalTask.status}" 更改为 "${updateData.status}"`,
          created_at: new Date().toISOString()
        });
      }
    }

    // 批量插入活动日志
    if (activities.length > 0) {
      await supabase
        .from('project_activities')
        .insert(activities);
    }

    return NextResponse.json({
      message: `成功更新 ${updatedTasks.length} 个任务`,
      tasks: updatedTasks
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
 * 批量删除任务
 * DELETE /api/projects/[id]/tasks
 * 请求体：{ ids: string[], user_id: string }
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id: projectId } = await params;
    const body = await request.json();
    const { ids, user_id } = body;

    if (!projectId) {
      return NextResponse.json(
        { error: '项目ID不能为空' },
        { status: 400 }
      );
    }

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: '请提供要删除的任务ID列表' },
        { status: 400 }
      );
    }

    // 获取要删除的任务信息
    const { data: tasksToDelete, error: fetchError } = await supabase
      .from('tasks')
      .select('id, title')
      .eq('project_id', projectId)
      .in('id', ids);

    if (fetchError) {
      console.error('获取任务信息失败:', fetchError);
      return NextResponse.json(
        { error: '获取任务信息失败', details: fetchError.message },
        { status: 500 }
      );
    }

    if (!tasksToDelete || tasksToDelete.length === 0) {
      return NextResponse.json(
        { error: '未找到要删除的任务' },
        { status: 404 }
      );
    }

    // 删除任务
    const { error: deleteError } = await supabase
      .from('tasks')
      .delete()
      .eq('project_id', projectId)
      .in('id', ids);

    if (deleteError) {
      console.error('删除任务失败:', deleteError);
      return NextResponse.json(
        { error: '删除任务失败', details: deleteError.message },
        { status: 500 }
      );
    }

    // 记录活动日志
    if (user_id && tasksToDelete.length > 0) {
      const activities = tasksToDelete.map(task => ({
        project_id: projectId,
        user_id,
        action: 'task_deleted',
        description: `删除了任务 "${task.title}"`,
        created_at: new Date().toISOString()
      }));

      await supabase
        .from('project_activities')
        .insert(activities);
    }

    return NextResponse.json({
      message: `成功删除 ${tasksToDelete.length} 个任务`,
      deletedIds: ids
    });
  } catch (error) {
    console.error('API错误:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}