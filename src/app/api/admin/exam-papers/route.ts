import { NextRequest, NextResponse } from 'next/server';
import { examPaperService } from '../../../../services/examPaperService';
import { verifyAdminAccess } from '../../../../utils/auth';

/**
 * GET /api/admin/exam-papers
 * 获取试卷列表
 * 
 * @param request - HTTP请求对象
 * @returns HTTP响应
 */
export async function GET(request: NextRequest) {
  try {
    // 验证管理员权限
    const authResult = await verifyAdminAccess(request, ['admin', 'teacher']);
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, message: authResult.error },
        { status: authResult.status }
      );
    }

    // 获取查询参数
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const difficulty = searchParams.get('difficulty') || '';
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // 调用服务获取试卷列表
    const result = await examPaperService.getExamPapers({
      page,
      limit,
      search,
      category,
      difficulty,
      sortBy,
      sortOrder
    });

    return NextResponse.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
      message: '获取试卷列表成功'
    });

  } catch (error) {
    console.error('获取试卷列表失败:', error);
    return NextResponse.json(
      {
        success: false,
        message: '获取试卷列表失败',
        error: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/exam-papers
 * 创建新试卷
 * 
 * @param request - HTTP请求对象
 * @returns HTTP响应
 */
export async function POST(request: NextRequest) {
  try {
    // 验证管理员权限
    const authResult = await verifyAdminAccess(request, ['admin', 'teacher']);
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, message: authResult.error },
        { status: authResult.status }
      );
    }

    const { user } = authResult;
    const body = await request.json();

    // 验证必填字段
    if (!body.title || !body.title.trim()) {
      return NextResponse.json(
        { success: false, message: '试卷标题不能为空' },
        { status: 400 }
      );
    }

    // 创建试卷
    const examPaper = await examPaperService.createExamPaper(body, user.id);

    return NextResponse.json({
      success: true,
      data: examPaper,
      message: '创建试卷成功'
    });

  } catch (error) {
    console.error('创建试卷失败:', error);
    return NextResponse.json(
      {
        success: false,
        message: '创建试卷失败',
        error: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}