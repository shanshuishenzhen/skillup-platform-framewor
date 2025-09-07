/**
 * 考试分配API接口
 * POST /api/admin/exams/[id]/assign
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { createErrorResponse } from '@/utils/errorHandler';

/**
 * 考试分配接口
 * @param request HTTP请求对象
 * @param params 路由参数
 * @returns 分配结果
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: examId } = await params;
    const body = await request.json();
    const { userId, userIds } = body;

    // 验证考试是否存在
    const { data: exam, error: examError } = await supabaseAdmin
      .from('exams')
      .select('id, title, status')
      .eq('id', examId)
      .single();

    if (examError || !exam) {
      return NextResponse.json(
        { error: '考试不存在' },
        { status: 404 }
      );
    }

    // 处理单个用户分配
    if (userId) {
      // 验证用户是否存在
      const { data: user, error: userError } = await supabaseAdmin
        .from('users')
        .select('id, name, phone')
        .eq('id', userId)
        .single();

      if (userError || !user) {
        return NextResponse.json(
          { error: '用户不存在' },
          { status: 404 }
        );
      }

      // 检查是否已经分配
      const { data: existingAssignment } = await supabaseAdmin
        .from('exam_assignments')
        .select('id')
        .eq('exam_id', examId)
        .eq('user_id', userId)
        .single();

      if (existingAssignment) {
        return NextResponse.json(
          { error: '用户已经被分配到此考试' },
          { status: 400 }
        );
      }

      // 创建考试分配
      const { data: assignment, error: assignError } = await supabaseAdmin
        .from('exam_assignments')
        .insert({
          exam_id: examId,
          user_id: userId,
          assigned_at: new Date().toISOString(),
          status: 'assigned'
        })
        .select()
        .single();

      if (assignError) {
        console.error('考试分配错误:', assignError);
        return NextResponse.json(
          { error: '考试分配失败' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        data: {
          assignmentId: assignment.id,
          examId: examId,
          userId: userId,
          examTitle: exam.title,
          userName: user.name,
          userPhone: user.phone
        },
        message: '考试分配成功'
      });
    }

    // 处理批量用户分配
    if (userIds && Array.isArray(userIds)) {
      // 验证所有用户是否存在
      const { data: users, error: usersError } = await supabaseAdmin
        .from('users')
        .select('id, name, phone')
        .in('id', userIds);

      if (usersError || !users || users.length !== userIds.length) {
        return NextResponse.json(
          { error: '部分用户不存在' },
          { status: 404 }
        );
      }

      // 检查已存在的分配
      const { data: existingAssignments } = await supabaseAdmin
        .from('exam_assignments')
        .select('user_id')
        .eq('exam_id', examId)
        .in('user_id', userIds);

      const existingUserIds = existingAssignments?.map(a => a.user_id) || [];
      const newUserIds = userIds.filter(id => !existingUserIds.includes(id));

      if (newUserIds.length === 0) {
        return NextResponse.json(
          { error: '所有用户都已经被分配到此考试' },
          { status: 400 }
        );
      }

      // 批量创建考试分配
      const assignments = newUserIds.map(userId => ({
        exam_id: examId,
        user_id: userId,
        assigned_at: new Date().toISOString(),
        status: 'assigned'
      }));

      const { data: createdAssignments, error: assignError } = await supabaseAdmin
        .from('exam_assignments')
        .insert(assignments)
        .select();

      if (assignError) {
        console.error('批量考试分配错误:', assignError);
        return NextResponse.json(
          { error: '批量考试分配失败' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        data: {
          examId: examId,
          examTitle: exam.title,
          assignedCount: createdAssignments?.length || 0,
          skippedCount: existingUserIds.length,
          totalRequested: userIds.length
        },
        message: `成功分配 ${createdAssignments?.length || 0} 个用户到考试`
      });
    }

    return NextResponse.json(
      { error: '请提供 userId 或 userIds 参数' },
      { status: 400 }
    );

  } catch (error) {
    console.error('考试分配API错误:', error);
    const errorResponse = createErrorResponse(error);
    return NextResponse.json(errorResponse.body, { status: errorResponse.status });
  }
}