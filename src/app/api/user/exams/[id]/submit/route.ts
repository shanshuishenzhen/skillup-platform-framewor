import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase';
import jwt from 'jsonwebtoken';

const supabase = getSupabaseAdminClient();

/**
 * 用户提交考试答案API
 * @param request - HTTP请求对象
 * @param params - 路由参数，包含考试ID
 * @returns 提交结果和成绩
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: examId } = await params;
    const body = await request.json();
    const { answers } = body; // answers格式: [{ questionId: string, answer: string }]

    // 验证用户身份
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: '未提供认证令牌' }, { status: 401 });
    }

    let userId: string;
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
      userId = decoded.userId;
    } catch (error) {
      return NextResponse.json({ error: '无效的认证令牌' }, { status: 401 });
    }

    console.log('用户提交考试答案，用户ID:', userId, '考试ID:', examId);

    // 检查用户是否有权限参加此考试
    const { data: assignment, error: assignmentError } = await supabase
      .from('exam_assignments')
      .select('*')
      .eq('user_id', userId)
      .eq('exam_id', examId)
      .single();

    if (assignmentError || !assignment) {
      console.log('考试分配检查失败:', assignmentError);
      return NextResponse.json({ error: '您没有权限参加此考试' }, { status: 403 });
    }

    // 获取考试记录
    const { data: examAttempt, error: attemptError } = await supabase
      .from('exam_attempts')
      .select('*')
      .eq('user_id', userId)
      .eq('exam_id', examId)
      .eq('status', 'in_progress')
      .single();

    if (attemptError || !examAttempt) {
      console.log('考试记录查询失败:', attemptError);
      return NextResponse.json({ error: '未找到进行中的考试记录' }, { status: 404 });
    }

    // 获取考试题目和正确答案
    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select('id, correct_answers, score')
      .eq('exam_id', examId);

    if (questionsError || !questions) {
      console.log('题目查询失败:', questionsError);
      return NextResponse.json({ error: '获取题目信息失败' }, { status: 500 });
    }

    // 计算成绩
    let totalScore = 0;
    let correctCount = 0;
    const answerResults = [];

    for (const answer of answers) {
      const question = questions.find(q => q.id === answer.questionId);
      if (!question) continue;

      const isCorrect = question.correct_answers.includes(answer.answer);
      if (isCorrect) {
        totalScore += question.score;
        correctCount++;
      }

      answerResults.push({
        questionId: answer.questionId,
        userAnswer: answer.answer,
        correctAnswers: question.correct_answers,
        isCorrect,
        score: isCorrect ? question.score : 0
      });

      // 保存用户答案
      await supabase
        .from('exam_answers')
        .insert({
          exam_attempt_id: examAttempt.id,
          question_id: answer.questionId,
          user_answer: answer.answer,
          is_correct: isCorrect,
          score: isCorrect ? question.score : 0
        });
    }

    // 更新考试记录状态和成绩
    const { error: updateError } = await supabase
      .from('exam_attempts')
      .update({
        status: 'completed',
        total_score: totalScore,
        submitted_at: new Date().toISOString()
      })
      .eq('id', examAttempt.id);

    if (updateError) {
      console.log('更新考试记录失败:', updateError);
      return NextResponse.json({ error: '提交考试失败' }, { status: 500 });
    }

    console.log('考试提交成功，总分:', totalScore, '正确题数:', correctCount);

    return NextResponse.json({
      success: true,
      data: {
        examAttemptId: examAttempt.id,
        totalScore,
        correctCount,
        totalQuestions: questions.length,
        percentage: Math.round((correctCount / questions.length) * 100),
        answerResults
      }
    });

  } catch (error) {
    console.error('提交考试时发生错误:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}