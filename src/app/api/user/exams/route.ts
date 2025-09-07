/**
 * 用户考试API路由
 * GET /api/user/exams - 获取用户的考试列表
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyToken } from '@/services/userService';

/**
 * 获取用户的考试列表
 * @param request HTTP请求对象
 * @returns 用户考试列表
 */
export async function GET(request: NextRequest) {
  try {
    // 验证用户身份
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: '未提供有效的认证令牌' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const verifyResult = verifyToken(token);
    
    if (!verifyResult.valid || !verifyResult.userId) {
      return NextResponse.json(
        { error: '无效的认证令牌' },
        { status: 401 }
      );
    }

    const userId = verifyResult.userId as string;
    console.log('获取用户考试列表，用户ID:', userId);

    // 查询用户的考试分配
    const { data: assignments, error } = await supabaseAdmin
      .from('exam_assignments')
      .select(`
        id,
        exam_id,
        assigned_at,
        status,
        exams (
          id,
          title,
          description,
          duration,
          total_questions,
          passing_score,
          created_at
        )
      `)
      .eq('user_id', userId)
      .order('assigned_at', { ascending: false });

    if (error) {
      console.error('查询用户考试分配失败:', error);
      return NextResponse.json(
        { error: '获取考试列表失败' },
        { status: 500 }
      );
    }

    // 格式化返回数据 - 匹配测试脚本期望的格式
    const exams = assignments?.map(assignment => ({
      id: assignment.exam_id, // 测试脚本期望的考试ID字段
      assignmentId: assignment.id,
      title: assignment.exams?.title || '',
      description: assignment.exams?.description || '',
      duration: assignment.exams?.duration || 0,
      totalQuestions: assignment.exams?.total_questions || 0,
      passingScore: assignment.exams?.passing_score || 0,
      assignedAt: assignment.assigned_at,
      status: assignment.status,
      createdAt: assignment.exams?.created_at
    })) || [];

    return NextResponse.json({
      success: true,
      data: exams
    });

  } catch (error) {
    console.error('获取用户考试列表时发生错误:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}