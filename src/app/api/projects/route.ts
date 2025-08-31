import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Project, ProjectStatus, ProjectPriority } from '@/types/project';

// 初始化 Supabase 客户端
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * 获取项目列表
 * GET /api/projects
 * 支持查询参数：
 * - status: 项目状态过滤
 * - priority: 优先级过滤
 * - search: 搜索关键词
 * - page: 页码
 * - limit: 每页数量
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as ProjectStatus | null;
    const priority = searchParams.get('priority') as ProjectPriority | null;
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    // 构建查询
    let query = supabase
      .from('projects')
      .select(`
        *,
        project_members!inner(
          id,
          role,
          user_id,
          users(
            id,
            email,
            name,
            avatar_url
          )
        ),
        tasks(
          id,
          status,
          progress
        )
      `);

    // 应用过滤条件
    if (status) {
      query = query.eq('status', status);
    }

    if (priority) {
      query = query.eq('priority', priority);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    // 应用分页
    query = query.range(offset, offset + limit - 1);

    const { data: projects, error, count } = await query;

    if (error) {
      console.error('获取项目列表失败:', error);
      return NextResponse.json(
        { error: '获取项目列表失败', details: error.message },
        { status: 500 }
      );
    }

    // 计算项目统计信息
    const projectsWithStats = projects?.map(project => {
      const tasks = project.tasks || [];
      const totalTasks = tasks.length;
      const completedTasks = tasks.filter((task: { status: string }) => task.status === 'completed').length;
      const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      return {
        ...project,
        progress,
        task_count: totalTasks,
        completed_task_count: completedTasks
      };
    });

    return NextResponse.json({
      projects: projectsWithStats,
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
 * 创建新项目
 * POST /api/projects
 * 请求体：项目信息
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      description,
      status = 'planning',
      priority = 'medium',
      start_date,
      end_date,
      budget,
      owner_id
    } = body;

    // 验证必填字段
    if (!name || !owner_id) {
      return NextResponse.json(
        { error: '项目名称和负责人为必填字段' },
        { status: 400 }
      );
    }

    // 验证日期
    if (start_date && end_date && new Date(start_date) > new Date(end_date)) {
      return NextResponse.json(
        { error: '开始日期不能晚于结束日期' },
        { status: 400 }
      );
    }

    // 创建项目
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({
        name,
        description,
        status,
        priority,
        start_date,
        end_date,
        budget,
        owner_id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (projectError) {
      console.error('创建项目失败:', projectError);
      return NextResponse.json(
        { error: '创建项目失败', details: projectError.message },
        { status: 500 }
      );
    }

    // 添加项目负责人为成员
    const { error: memberError } = await supabase
      .from('project_members')
      .insert({
        project_id: project.id,
        user_id: owner_id,
        role: 'owner',
        joined_at: new Date().toISOString()
      });

    if (memberError) {
      console.error('添加项目成员失败:', memberError);
      // 不返回错误，因为项目已创建成功
    }

    // 记录活动日志
    await supabase
      .from('project_activities')
      .insert({
        project_id: project.id,
        user_id: owner_id,
        action: 'project_created',
        description: `创建了项目 "${name}"`,
        created_at: new Date().toISOString()
      });

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error('API错误:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

/**
 * 批量删除项目
 * DELETE /api/projects
 * 请求体：{ ids: string[] }
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: '请提供要删除的项目ID列表' },
        { status: 400 }
      );
    }

    // 检查项目是否存在
    const { data: existingProjects, error: checkError } = await supabase
      .from('projects')
      .select('id, name')
      .in('id', ids);

    if (checkError) {
      console.error('检查项目失败:', checkError);
      return NextResponse.json(
        { error: '检查项目失败', details: checkError.message },
        { status: 500 }
      );
    }

    if (!existingProjects || existingProjects.length !== ids.length) {
      return NextResponse.json(
        { error: '部分项目不存在' },
        { status: 404 }
      );
    }

    // 删除相关数据（级联删除）
    // 1. 删除项目成员
    await supabase
      .from('project_members')
      .delete()
      .in('project_id', ids);

    // 2. 删除任务
    await supabase
      .from('tasks')
      .delete()
      .in('project_id', ids);

    // 3. 删除文件
    await supabase
      .from('project_files')
      .delete()
      .in('project_id', ids);

    // 4. 删除活动日志
    await supabase
      .from('project_activities')
      .delete()
      .in('project_id', ids);

    // 5. 删除项目
    const { error: deleteError } = await supabase
      .from('projects')
      .delete()
      .in('id', ids);

    if (deleteError) {
      console.error('删除项目失败:', deleteError);
      return NextResponse.json(
        { error: '删除项目失败', details: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: `成功删除 ${ids.length} 个项目`,
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