/**
 * 用户开始考试API路由
 * POST /api/user/exams/[id]/start - 开始考试
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyToken } from '@/services/userService';

/**
 * 开始考试
 * @param request HTTP请求对象
 * @param params 路由参数
 * @returns 考试详情和题目
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 等待params解析
    const { id: examId } = await params;

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
    console.log('用户开始考试，用户ID:', userId, '考试ID:', examId);

    // 检查用户是否有权限参加此考试
    const { data: assignment, error: assignmentError } = await supabaseAdmin
      .from('exam_assignments')
      .select('*')
      .eq('user_id', userId)
      .eq('exam_id', examId)
      .single();

    if (assignmentError || !assignment) {
      console.error('查询考试分配失败:', assignmentError);
      return NextResponse.json(
        { error: '您没有权限参加此考试' },
        { status: 403 }
      );
    }

    // 获取考试详情和题目
    const { data: exam, error: examError } = await supabaseAdmin
      .from('exams')
      .select(`
        id,
        title,
        description,
        duration,
        total_questions,
        passing_score,
        questions (
          id,
          question_text,
          question_type,
          options,
          correct_answers,
          score
        )
      `)
      .eq('id', examId)
      .single();

    if (examError || !exam) {
      console.error('查询考试详情失败:', examError);
      return NextResponse.json(
        { error: '考试不存在' },
        { status: 404 }
      );
    }

    // 检查是否已经开始过考试
    const { data: existingAttempt, error: attemptError } = await supabaseAdmin
      .from('exam_attempts')
      .select('*')
      .eq('user_id', userId)
      .eq('exam_id', examId)
      .single();

    let attemptId;
    
    if (existingAttempt) {
      // 如果已经有考试记录，使用现有的
      attemptId = existingAttempt.id;
      console.log('使用现有考试记录:', attemptId);
    } else {
      // 创建新的考试记录
      const { data: newAttempt, error: createError } = await supabaseAdmin
        .from('exam_attempts')
        .insert({
          user_id: userId,
          exam_id: examId,
          started_at: new Date().toISOString(),
          status: 'in_progress'
        })
        .select()
        .single();

      if (createError || !newAttempt) {
        console.error('创建考试记录失败:', createError);
        return NextResponse.json(
          { error: '开始考试失败' },
          { status: 500 }
        );
      }

      attemptId = newAttempt.id;
      console.log('创建新考试记录:', attemptId);
    }

    // 格式化题目数据（不包含正确答案）
    const questions = exam.questions?.map(question => ({
      id: question.id,
      questionText: question.question_text,
      type: question.question_type,
      options: question.options,
      score: question.score
    })) || [];

    // 返回考试详情
    const examData = {
      id: exam.id,
      title: exam.title,
      description: exam.description,
      duration: exam.duration,
      totalQuestions: exam.total_questions,
      passingScore: exam.passing_score,
      questions: questions,
      attemptId: attemptId,
      startTime: new Date().toISOString()
    };

    return NextResponse.json({
      success: true,
      data: examData
    });

  } catch (error) {
    console.error('开始考试时发生错误:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}