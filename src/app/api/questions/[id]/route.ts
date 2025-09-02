import { NextRequest, NextResponse } from 'next/server';
import { QuestionService } from '@/services/questionService';
import { createClient } from '@/lib/supabase';

/**
 * 获取单个题目详情
 * @param request - Next.js请求对象
 * @param params - 路由参数，包含题目ID
 * @returns 题目详情数据或错误信息
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const questionService = new QuestionService(supabase);
    
    const questionId = params.id;
    
    if (!questionId) {
      return NextResponse.json(
        { error: '题目ID不能为空' },
        { status: 400 }
      );
    }
    
    const question = await questionService.getQuestionById(questionId);
    
    if (!question) {
      return NextResponse.json(
        { error: '题目不存在' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: question
    });
    
  } catch (error) {
    console.error('获取题目详情失败:', error);
    return NextResponse.json(
      { error: '获取题目详情失败' },
      { status: 500 }
    );
  }
}

/**
 * 更新题目信息
 * @param request - Next.js请求对象，包含更新数据
 * @param params - 路由参数，包含题目ID
 * @returns 更新后的题目数据或错误信息
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const questionService = new QuestionService(supabase);
    
    const questionId = params.id;
    const updateData = await request.json();
    
    if (!questionId) {
      return NextResponse.json(
        { error: '题目ID不能为空' },
        { status: 400 }
      );
    }
    
    // 验证必填字段
    if (updateData.title && updateData.title.trim() === '') {
      return NextResponse.json(
        { error: '题目标题不能为空' },
        { status: 400 }
      );
    }
    
    if (updateData.content && updateData.content.trim() === '') {
      return NextResponse.json(
        { error: '题目内容不能为空' },
        { status: 400 }
      );
    }
    
    // 验证题目类型特定字段
    if (updateData.type) {
      switch (updateData.type) {
        case 'choice':
        case 'multiple_choice':
          if (!updateData.options || !Array.isArray(updateData.options) || updateData.options.length < 2) {
            return NextResponse.json(
              { error: '选择题至少需要2个选项' },
              { status: 400 }
            );
          }
          break;
          
        case 'coding':
          if (!updateData.test_cases || !Array.isArray(updateData.test_cases) || updateData.test_cases.length === 0) {
            return NextResponse.json(
              { error: '编程题需要至少一个测试用例' },
              { status: 400 }
            );
          }
          break;
      }
    }
    
    const updatedQuestion = await questionService.updateQuestion(questionId, updateData);
    
    return NextResponse.json({
      success: true,
      data: updatedQuestion,
      message: '题目更新成功'
    });
    
  } catch (error) {
    console.error('更新题目失败:', error);
    return NextResponse.json(
      { error: '更新题目失败' },
      { status: 500 }
    );
  }
}

/**
 * 删除题目
 * @param request - Next.js请求对象
 * @param params - 路由参数，包含题目ID
 * @returns 删除结果或错误信息
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const questionService = new QuestionService(supabase);
    
    const questionId = params.id;
    
    if (!questionId) {
      return NextResponse.json(
        { error: '题目ID不能为空' },
        { status: 400 }
      );
    }
    
    // 检查题目是否存在
    const existingQuestion = await questionService.getQuestionById(questionId);
    if (!existingQuestion) {
      return NextResponse.json(
        { error: '题目不存在' },
        { status: 404 }
      );
    }
    
    // 检查题目是否被考试使用
    // TODO: 添加检查题目是否被考试使用的逻辑
    
    await questionService.deleteQuestion(questionId);
    
    return NextResponse.json({
      success: true,
      message: '题目删除成功'
    });
    
  } catch (error) {
    console.error('删除题目失败:', error);
    return NextResponse.json(
      { error: '删除题目失败' },
      { status: 500 }
    );
  }
}