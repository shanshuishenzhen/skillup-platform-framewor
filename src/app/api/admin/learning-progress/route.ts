import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase';
import { parseJWTToken } from '@/utils/jwt';

const supabase = getSupabaseAdminClient();

/**
 * 获取学习进度数据
 * GET /api/admin/learning-progress
 */
export async function GET(request: NextRequest) {
  try {
    // 验证JWT token
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const payload = parseJWTToken(token);
    
    if (!payload || payload.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // 查询学习进度数据
    const { data: learningProgress, error } = await supabase
      .from('learning_progress')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error fetching learning progress:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch learning progress' },
        { status: 500 }
      );
    }

    // 统计数据
    const { data: stats, error: statsError } = await supabase
      .from('learning_progress')
      .select('user_id, created_at')
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    if (statsError) {
      console.error('Error fetching stats:', statsError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch stats' },
        { status: 500 }
      );
    }

    const activeUsers = new Set(stats?.map(s => s.user_id)).size;

    return NextResponse.json({
      success: true,
      data: {
        learningProgress,
        stats: {
          totalRecords: learningProgress?.length || 0,
          activeUsersLast30Days: activeUsers
        }
      }
    });

  } catch (error) {
    console.error('Error in learning progress API:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * 创建学习进度记录
 * POST /api/admin/learning-progress
 */
export async function POST(request: NextRequest) {
  try {
    // 验证JWT token
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const payload = parseJWTToken(token);
    
    if (!payload || payload.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { count = 5 } = body; // 创建多少条记录

    // 获取现有用户
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id')
      .limit(10);

    if (usersError || !users || users.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No users found' },
        { status: 400 }
      );
    }

    // 获取现有课程
    const { data: courses, error: coursesError } = await supabase
      .from('courses')
      .select('id')
      .limit(5);

    if (coursesError || !courses || courses.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No courses found' },
        { status: 400 }
      );
    }

    // 创建多条学习进度记录
    const records = [];
    for (let i = 0; i < count; i++) {
      const randomUser = users[Math.floor(Math.random() * users.length)];
      const randomCourse = courses[Math.floor(Math.random() * courses.length)];
      
      records.push({
        user_id: randomUser.id,
        course_id: randomCourse.id,
        lesson_id: crypto.randomUUID(),
        current_time_seconds: Math.floor(Math.random() * 300),
        duration: 300,
        progress_percentage: Math.floor(Math.random() * 100),
        is_completed: Math.random() > 0.7,
        last_updated_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      });
    }

    // 批量插入学习进度记录
    const { data, error } = await supabase
      .from('learning_progress')
      .insert(records)
      .select();

    if (error) {
      console.error('Error creating learning progress:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to create learning progress', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        created: data?.length || 0,
        records: data
      }
    });

  } catch (error) {
    console.error('Error in learning progress creation:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}