import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { verifyAdminAccess } from '@/lib/auth';
import { QuestionType, ExamDifficulty } from '@/services/examService';

// 更新题目的验证模式
const UpdateQuestionSchema = z.object({
  type: z.nativeEnum(QuestionType).optional(),
  content: z.string().min(1, '题目内容不能为空').optional(),
  options: z.array(z.string()).optional(),
  correct_answer: z.union([
    z.string(),
    z.array(z.string())
  ]).optional(),
  explanation: z.string().optional(),
  difficulty: z.nativeEnum(ExamDifficulty).optional(),
  score: z.number().min(1, '分数必须大于0').optional(),
  tags: z.array(z.string()).optional()
});

/**
 * 获取单个题目详情
 * GET /api/exams/[id]/questions/[questionId]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; questionId: string } }
) {
  try {
    const { id: examId, questionId } = params;

    // 获取题目信息
    const { data: question, error } = await supabase
      .from('questions')
      .select('*')
      .eq('id', questionId)
      .eq('exam_id', examId)
      .single();

    if (error) {
      console.error('获取题目失败:', error);
      return NextResponse.json(
        { message: '题目不存在' },
        { status: 404 }
      );
    }

    // 检查用户权限，决定是否返回答案
    const user = await verifyAdminAccess(request);
    const isAdminOrTeacher = user && ['admin', 'teacher'].includes(user.role);

    // 如果不是管理员或教师，不返回正确答案
    if (!isAdminOrTeacher) {
      const { correct_answer, explanation, ...questionWithoutAnswer } = question;
      return NextResponse.json({
        question: questionWithoutAnswer
      });
    }

    return NextResponse.json({
      question
    });
  } catch (error) {
    console.error('获取题目详情时发生错误:', error);
    return NextResponse.json(
      { message: '服务器内部错误' },
      { status: 500 }
    );
  }
}

/**
 * 更新题目
 * PUT /api/exams/[id]/questions/[questionId]
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; questionId: string } }
) {
  try {
    const { id: examId, questionId } = params;

    // 验证管理员权限
    const user = await verifyAdminAccess(request);
    if (!user || !['admin', 'teacher'].includes(user.role)) {
      return NextResponse.json(
        { message: '权限不足' },
        { status: 403 }
      );
    }

    // 验证请求数据
    const body = await request.json();
    const validatedData = UpdateQuestionSchema.parse(body);

    // 检查题目是否存在
    const { data: existingQuestion, error: checkError } = await supabase
      .from('questions')
      .select('id, exam_id')
      .eq('id', questionId)
      .eq('exam_id', examId)
      .single();

    if (checkError || !existingQuestion) {
      return NextResponse.json(
        { message: '题目不存在' },
        { status: 404 }
      );
    }

    // 检查考试是否存在且用户有权限
    const { data: exam, error: examError } = await supabase
      .from('exams')
      .select('id, created_by')
      .eq('id', examId)
      .single();

    if (examError || !exam) {
      return NextResponse.json(
        { message: '考试不存在' },
        { status: 404 }
      );
    }

    // 检查权限：管理员可以编辑所有题目，教师只能编辑自己创建的考试的题目
    if (user.role === 'teacher' && exam.created_by !== user.id) {
      return NextResponse.json(
        { message: '您只能编辑自己创建的考试题目' },
        { status: 403 }
      );
    }

    // 处理正确答案格式
    let processedCorrectAnswer = validatedData.correct_answer;
    if (validatedData.type === QuestionType.MULTIPLE_CHOICE && typeof processedCorrectAnswer === 'string') {
      processedCorrectAnswer = processedCorrectAnswer.split(';').map(s => s.trim()).filter(s => s);
    }

    // 更新题目
    const updateData = {
      ...validatedData,
      correct_answer: processedCorrectAnswer,
      updated_at: new Date().toISOString()
    };

    const { data: updatedQuestion, error: updateError } = await supabase
      .from('questions')
      .update(updateData)
      .eq('id', questionId)
      .eq('exam_id', examId)
      .select()
      .single();

    if (updateError) {
      console.error('更新题目失败:', updateError);
      return NextResponse.json(
        { message: '更新题目失败' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: '题目更新成功',
      question: updatedQuestion
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          message: '数据验证失败',
          errors: error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
        },
        { status: 400 }
      );
    }

    console.error('更新题目时发生错误:', error);
    return NextResponse.json(
      { message: '服务器内部错误' },
      { status: 500 }
    );
  }
}

/**
 * 删除题目
 * DELETE /api/exams/[id]/questions/[questionId]
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; questionId: string } }
) {
  try {
    const { id: examId, questionId } = params;

    // 验证管理员权限
    const user = await verifyAdminAccess(request);
    if (!user || !['admin', 'teacher'].includes(user.role)) {
      return NextResponse.json(
        { message: '权限不足' },
        { status: 403 }
      );
    }

    // 检查题目是否存在
    const { data: existingQuestion, error: checkError } = await supabase
      .from('questions')
      .select('id, exam_id')
      .eq('id', questionId)
      .eq('exam_id', examId)
      .single();

    if (checkError || !existingQuestion) {
      return NextResponse.json(
        { message: '题目不存在' },
        { status: 404 }
      );
    }

    // 检查考试是否存在且用户有权限
    const { data: exam, error: examError } = await supabase
      .from('exams')
      .select('id, created_by, status')
      .eq('id', examId)
      .single();

    if (examError || !exam) {
      return NextResponse.json(
        { message: '考试不存在' },
        { status: 404 }
      );
    }

    // 检查权限：管理员可以删除所有题目，教师只能删除自己创建的考试的题目
    if (user.role === 'teacher' && exam.created_by !== user.id) {
      return NextResponse.json(
        { message: '您只能删除自己创建的考试题目' },
        { status: 403 }
      );
    }

    // 检查考试状态，已发布的考试不能删除题目
    if (exam.status === 'published') {
      return NextResponse.json(
        { message: '已发布的考试不能删除题目' },
        { status: 400 }
      );
    }

    // 开始事务：删除题目及相关数据
    const { error: deleteError } = await supabase
      .from('questions')
      .delete()
      .eq('id', questionId)
      .eq('exam_id', examId);

    if (deleteError) {
      console.error('删除题目失败:', deleteError);
      return NextResponse.json(
        { message: '删除题目失败' },
        { status: 500 }
      );
    }

    // 删除相关的用户答案记录
    await supabase
      .from('user_answers')
      .delete()
      .eq('question_id', questionId);

    return NextResponse.json({
      message: '题目删除成功'
    });
  } catch (error) {
    console.error('删除题目时发生错误:', error);
    return NextResponse.json(
      { message: '服务器内部错误' },
      { status: 500 }
    );
  }
}

/**
 * 处理预检请求
 * OPTIONS /api/exams/[id]/questions/[questionId]
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}