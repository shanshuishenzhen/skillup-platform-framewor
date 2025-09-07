import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * 考试信息接口
 * @description 定义考试的详细信息
 */
interface ExamInfo {
  id: string
  title: string
  description: string
  duration: number
  totalQuestions: number
  createdAt: string
  updatedAt: string
  status: string
}

/**
 * GET /api/admin/exams/[id]
 * @description 获取指定考试的详细信息
 * @param request HTTP请求对象
 * @param params 路由参数，包含考试ID
 * @returns 考试详细信息
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: examId } = await params

    // 验证考试ID
    if (!examId) {
      return NextResponse.json(
        { error: '考试ID不能为空' },
        { status: 400 }
      )
    }

    // 获取考试信息
    const { data: examData, error: examError } = await supabase
      .from('exams')
      .select(`
        id,
        title,
        description,
        duration,
        total_questions,
        created_at,
        updated_at,
        status
      `)
      .eq('id', examId)
      .single()

    if (examError) {
      console.error('获取考试信息错误:', examError)
      
      if (examError.code === 'PGRST116') {
        return NextResponse.json(
          { error: '考试不存在' },
          { status: 404 }
        )
      }
      
      return NextResponse.json(
        { error: '获取考试信息失败' },
        { status: 500 }
      )
    }

    if (!examData) {
      return NextResponse.json(
        { error: '考试不存在' },
        { status: 404 }
      )
    }

    // 格式化返回数据
    const examInfo: ExamInfo = {
      id: examData.id,
      title: examData.title || '未命名考试',
      description: examData.description || '暂无描述',
      duration: examData.duration || 60,
      totalQuestions: examData.total_questions || 0,
      createdAt: examData.created_at,
      updatedAt: examData.updated_at,
      status: examData.status || 'draft'
    }

    return NextResponse.json({
      success: true,
      ...examInfo
    })

  } catch (error) {
    console.error('获取考试信息API错误:', error)
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/admin/exams/[id]
 * @description 更新指定考试的信息
 * @param request HTTP请求对象
 * @param params 路由参数，包含考试ID
 * @returns 更新结果
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: examId } = await params
    const body = await request.json()
    const { title, description, duration, status } = body

    // 验证考试ID
    if (!examId) {
      return NextResponse.json(
        { error: '考试ID不能为空' },
        { status: 400 }
      )
    }

    // 验证必填字段
    if (!title) {
      return NextResponse.json(
        { error: '考试标题不能为空' },
        { status: 400 }
      )
    }

    // 验证考试时长
    if (duration && (duration < 1 || duration > 480)) {
      return NextResponse.json(
        { error: '考试时长必须在1-480分钟之间' },
        { status: 400 }
      )
    }

    // 验证状态
    const validStatuses = ['draft', 'published', 'archived']
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: '无效的考试状态' },
        { status: 400 }
      )
    }

    // 构建更新数据
    const updateData: any = {
      title,
      updated_at: new Date().toISOString()
    }

    if (description !== undefined) {
      updateData.description = description
    }
    
    if (duration !== undefined) {
      updateData.duration = duration
    }
    
    if (status !== undefined) {
      updateData.status = status
    }

    // 更新考试信息
    const { data: updateResult, error: updateError } = await supabase
      .from('exams')
      .update(updateData)
      .eq('id', examId)
      .select()
      .single()

    if (updateError) {
      console.error('更新考试信息错误:', updateError)
      
      if (updateError.code === 'PGRST116') {
        return NextResponse.json(
          { error: '考试不存在' },
          { status: 404 }
        )
      }
      
      return NextResponse.json(
        { error: '更新考试信息失败' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: '考试信息更新成功',
      exam: updateResult
    })

  } catch (error) {
    console.error('更新考试信息API错误:', error)
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/exams/[id]
 * @description 删除指定考试
 * @param request HTTP请求对象
 * @param params 路由参数，包含考试ID
 * @returns 删除结果
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: examId } = await params

    // 验证考试ID
    if (!examId) {
      return NextResponse.json(
        { error: '考试ID不能为空' },
        { status: 400 }
      )
    }

    // 检查是否有用户已分配该考试
    const { data: assignedUsers, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('assigned_exam_paper', examId)
      .limit(1)

    if (checkError) {
      console.error('检查考试分配错误:', checkError)
      return NextResponse.json(
        { error: '检查考试分配状态失败' },
        { status: 500 }
      )
    }

    if (assignedUsers && assignedUsers.length > 0) {
      return NextResponse.json(
        { error: '该考试已分配给用户，无法删除' },
        { status: 400 }
      )
    }

    // 删除考试
    const { error: deleteError } = await supabase
      .from('exams')
      .delete()
      .eq('id', examId)

    if (deleteError) {
      console.error('删除考试错误:', deleteError)
      
      if (deleteError.code === 'PGRST116') {
        return NextResponse.json(
          { error: '考试不存在' },
          { status: 404 }
        )
      }
      
      return NextResponse.json(
        { error: '删除考试失败' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: '考试删除成功'
    })

  } catch (error) {
    console.error('删除考试API错误:', error)
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    )
  }
}