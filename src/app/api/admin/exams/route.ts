/**
 * 管理员考试管理API路由
 * 处理管理员的考试CRUD操作和相关业务逻辑
 * 
 * @author SOLO Coding
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { ExamService } from '@/services/examService';
import { ExamPaperService } from '@/services/examPaperService';
import { CreateExamRequest, ExamQueryParams } from '@/types/exam';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyAdminAccess } from '@/middleware/rbac';

// 初始化服务
const examService = new ExamService(supabaseAdmin);
const examPaperService = new ExamPaperService(supabaseAdmin);

/**
 * GET /api/admin/exams
 * 管理员获取考试列表
 * 
 * @param request - Next.js请求对象
 * @returns 考试列表响应
 */
export async function GET(request: NextRequest) {
  try {
    // 验证管理员权限
    const authResult = await verifyAdminAccess(request, ['admin', 'teacher', 'super_admin']);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { success: false, message: authResult.message || '用户未经授权' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    
    // 构建查询参数
    const queryParams: ExamQueryParams = {
      search: searchParams.get('search') || undefined,
      status: searchParams.get('status') as any || undefined,
      difficulty: searchParams.get('difficulty') as any || undefined,
      category: searchParams.get('category') || undefined,
      tags: searchParams.get('tags')?.split(',') || undefined,
      createdBy: searchParams.get('createdBy') || undefined,
      sortBy: searchParams.get('sortBy') || 'created_at',
      sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc',
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20')
    };

    // 获取考试列表
    const result = await examService.getExams(queryParams);
    
    return NextResponse.json({
      success: true,
      data: result,
      message: '获取考试列表成功'
    });
  } catch (error) {
    console.error('获取考试列表失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: '获取考试列表失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/exams
 * 管理员创建新考试
 * 
 * @param request - Next.js请求对象
 * @returns 创建结果响应
 */
export async function POST(request: NextRequest) {
  try {
    // 验证管理员权限
    const authResult = await verifyAdminAccess(request, ['admin', 'teacher', 'super_admin']);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { success: false, message: authResult.message || '用户未经授权' },
        { status: 403 }
      );
    }

    // 解析请求体
    const body: CreateExamRequest & { questions?: any[], paperId?: string } = await request.json();
    
    // 验证必填字段
    if (!body.title || !body.description) {
      return NextResponse.json(
        {
          success: false,
          error: '缺少必填字段',
          details: '标题和描述为必填字段'
        },
        { status: 400 }
      );
    }

    // 处理题目创建或试卷关联
    let questionIds: string[] = [];
    let paperData = null;
    
    if (body.paperId) {
      // 从试卷创建考试
      try {
        paperData = await examPaperService.getExamPaperById(body.paperId);
        if (!paperData) {
          return NextResponse.json(
            {
              success: false,
              error: '试卷不存在',
              details: '指定的试卷ID无效'
            },
            { status: 400 }
          );
        }
        
        // 获取试卷的题目
        const { data: paperQuestions, error: questionError } = await supabaseAdmin
          .from('questions')
          .select('id')
          .eq('paper_id', body.paperId);
        
        if (questionError) {
          throw new Error(`获取试卷题目失败: ${questionError.message}`);
        }
        
        questionIds = paperQuestions?.map(q => q.id) || [];
      } catch (error) {
        console.error('处理试卷失败:', error);
        return NextResponse.json(
          {
            success: false,
            error: '处理试卷失败',
            details: error instanceof Error ? error.message : '未知错误'
          },
          { status: 500 }
        );
      }
    } else if (body.questions && Array.isArray(body.questions) && body.questions.length > 0) {
      // 手动创建题目
      try {
        // 为每个题目创建记录
        const questionsToCreate = body.questions.map((question, index) => {
           // 处理正确答案格式：支持 correctAnswer (单选) 和 correctAnswers (多选)
           let correctAnswers = [];
           if (question.correctAnswers) {
             correctAnswers = question.correctAnswers;
           } else if (question.correctAnswer !== undefined) {
             correctAnswers = [question.correctAnswer];
           }
           
           return {
             question_text: question.question,
             question_type: question.type || 'single_choice',
             options: question.options || [],
             correct_answers: correctAnswers,
             score: question.score || 10,
             order_index: index,
             is_required: true,
             created_at: new Date().toISOString(),
             updated_at: new Date().toISOString()
           };
         });
        
        const { data: createdQuestions, error: questionError } = await supabaseAdmin
          .from('questions')
          .insert(questionsToCreate)
          .select('id');
        
        if (questionError) {
          throw new Error(`创建题目失败: ${questionError.message}`);
        }
        
        questionIds = createdQuestions?.map(q => q.id) || [];
      } catch (error) {
        console.error('创建题目失败:', error);
        return NextResponse.json(
          {
            success: false,
            error: '创建题目失败',
            details: error instanceof Error ? error.message : '未知错误'
          },
          { status: 500 }
        );
      }
    }

    // 设置默认值
    const examData = {
      ...body,
      difficulty: body.difficulty || (paperData?.difficulty) || 'intermediate',
      duration: body.duration || (paperData?.timeLimit) || 60,
      totalQuestions: questionIds.length || body.totalQuestions || (paperData?.totalQuestions) || 10,
      passingScore: body.passingScore || (paperData?.passingScore) || 60,
      totalScore: body.totalScore || (paperData?.totalScore) || 100,
      questionIds: questionIds,
      paperId: body.paperId || null,
      createdBy: authResult.user.id,
      status: 'draft' as const
    };

    // 验证数值字段
    if (examData.duration <= 0 || examData.totalQuestions <= 0 || examData.passingScore < 0 || examData.passingScore > 100) {
      return NextResponse.json(
        {
          success: false,
          error: '参数值无效',
          details: '时长和题目数必须大于0，及格分数必须在0-100之间'
        },
        { status: 400 }
      );
    }

    // 创建考试
    const exam = await examService.createExam(examData, authResult.user.id);

    // 如果有题目，更新题目的exam_id
    if (questionIds.length > 0 && exam?.id) {
      try {
        const { error: updateError } = await supabaseAdmin
          .from('questions')
          .update({ exam_id: exam.id })
          .in('id', questionIds);
        
        if (updateError) {
          console.error('更新题目exam_id失败:', updateError);
          // 不抛出错误，因为考试已经创建成功
        }
      } catch (error) {
        console.error('更新题目exam_id失败:', error);
      }
    }

    return NextResponse.json({
       success: true,
       data: exam,
       message: '考试创建成功'
     }, { status: 201 });
  } catch (error) {
    console.error('创建考试失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: '创建考试失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/exams
 * 管理员批量更新考试
 * 
 * @param request - Next.js请求对象
 * @returns 更新结果响应
 */
export async function PUT(request: NextRequest) {
  try {
    // 验证管理员权限
    const authResult = await verifyAdminAccess(request, ['admin', 'teacher', 'super_admin']);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { success: false, message: authResult.message || '用户未经授权' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { ids, updates } = body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: '无效的考试ID列表'
        },
        { status: 400 }
      );
    }

    // 批量更新考试
    const results = await Promise.all(
      ids.map(id => examService.updateExam({ id, ...updates }))
    );
    
    return NextResponse.json({
      success: true,
      data: results,
      message: `成功更新${results.length}个考试`
    });
  } catch (error) {
    console.error('批量更新考试失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: '批量更新考试失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/exams
 * 管理员批量删除考试
 * 
 * @param request - Next.js请求对象
 * @returns 删除结果响应
 */
export async function DELETE(request: NextRequest) {
  try {
    // 验证管理员权限
    const authResult = await verifyAdminAccess(request, ['admin', 'teacher', 'super_admin']);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { success: false, message: authResult.message || '用户未经授权' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const idsParam = searchParams.get('ids');
    
    if (!idsParam) {
      return NextResponse.json(
        {
          success: false,
          error: '缺少考试ID参数'
        },
        { status: 400 }
      );
    }

    const ids = idsParam.split(',');
    
    // 批量删除考试
    const results = await Promise.all(
      ids.map(id => examService.deleteExam(id))
    );
    
    return NextResponse.json({
      success: true,
      data: results,
      message: `成功删除${results.length}个考试`
    });
  } catch (error) {
    console.error('批量删除考试失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: '批量删除考试失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}