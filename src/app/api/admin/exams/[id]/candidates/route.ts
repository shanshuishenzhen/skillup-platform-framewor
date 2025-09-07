import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * 考试状态枚举
 * @description 定义考试的各种状态
 */
type ExamStatus = 'assigned' | 'started' | 'completed' | 'expired'

/**
 * 考生信息接口
 * @description 定义考生的基本信息和考试状态
 */
interface Candidate {
  id: string
  name: string
  email: string
  department: string
  assignedAt: string
  status: ExamStatus
  startedAt?: string
  completedAt?: string
  score?: number
  progress?: number
  timeSpent?: number
}

/**
 * 状态统计接口
 * @description 定义各状态的统计数据
 */
interface StatusStats {
  total: number
  assigned: number
  started: number
  completed: number
  expired: number
}

/**
 * 计算考试状态
 * @param assignedAt 分配时间
 * @param startedAt 开始时间
 * @param completedAt 完成时间
 * @param examDuration 考试时长（分钟）
 * @returns 考试状态
 */
function calculateExamStatus(
  assignedAt: string,
  startedAt?: string,
  completedAt?: string,
  examDuration?: number
): ExamStatus {
  if (completedAt) {
    return 'completed'
  }
  
  if (startedAt) {
    // 检查是否超时
    if (examDuration) {
      const startTime = new Date(startedAt).getTime()
      const now = Date.now()
      const elapsedMinutes = (now - startTime) / (1000 * 60)
      
      if (elapsedMinutes > examDuration) {
        return 'expired'
      }
    }
    return 'started'
  }
  
  // 检查是否过期（假设分配后7天过期）
  const assignTime = new Date(assignedAt).getTime()
  const now = Date.now()
  const daysPassed = (now - assignTime) / (1000 * 60 * 60 * 24)
  
  if (daysPassed > 7) {
    return 'expired'
  }
  
  return 'assigned'
}

/**
 * 计算考试进度
 * @param startedAt 开始时间
 * @param totalQuestions 总题目数
 * @param answeredQuestions 已答题目数
 * @returns 进度百分比
 */
function calculateProgress(startedAt?: string, totalQuestions?: number, answeredQuestions?: number): number {
  if (!startedAt || !totalQuestions || totalQuestions === 0) {
    return 0
  }
  
  const answered = answeredQuestions || 0
  return Math.round((answered / totalQuestions) * 100)
}

/**
 * 计算用时
 * @param startedAt 开始时间
 * @param completedAt 完成时间
 * @returns 用时（分钟）
 */
function calculateTimeSpent(startedAt?: string, completedAt?: string): number {
  if (!startedAt) {
    return 0
  }
  
  const endTime = completedAt ? new Date(completedAt).getTime() : Date.now()
  const startTime = new Date(startedAt).getTime()
  
  return Math.round((endTime - startTime) / (1000 * 60))
}

/**
 * GET /api/admin/exams/[id]/candidates
 * @description 获取指定考试的所有考生信息和统计数据
 * @param request HTTP请求对象
 * @param params 路由参数，包含考试ID
 * @returns 考生列表和统计数据
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
      .select('id, title, duration, total_questions')
      .eq('id', examId)
      .single()

    if (examError || !examData) {
      return NextResponse.json(
        { error: '考试不存在' },
        { status: 404 }
      )
    }

    // 获取已分配该考试的用户信息
    const { data: assignmentsData, error: assignmentsError } = await supabase
      .from('users')
      .select(`
        id,
        name,
        email,
        department,
        assigned_exam_id,
        exam_started_at,
        exam_completed_at,
        exam_score,
        exam_answers
      `)
      .eq('assigned_exam_id', examId)

    if (assignmentsError) {
      console.error('获取考生数据错误:', assignmentsError)
      return NextResponse.json(
        { error: '获取考生数据失败' },
        { status: 500 }
      )
    }

    // 处理考生数据
    const candidates: Candidate[] = (assignmentsData || []).map(user => {
      const assignedAt = new Date().toISOString() // 实际应该从分配记录中获取
      const startedAt = user.exam_started_at
      const completedAt = user.exam_completed_at
      const score = user.exam_score
      
      // 计算状态
      const status = calculateExamStatus(
        assignedAt,
        startedAt,
        completedAt,
        examData.duration
      )
      
      // 计算进度（基于已答题目数）
      let answeredQuestions = 0
      if (user.exam_answers) {
        try {
          const answers = JSON.parse(user.exam_answers)
          answeredQuestions = Object.keys(answers).length
        } catch (e) {
          console.error('解析考试答案错误:', e)
        }
      }
      
      const progress = calculateProgress(
        startedAt,
        examData.total_questions,
        answeredQuestions
      )
      
      // 计算用时
      const timeSpent = calculateTimeSpent(startedAt, completedAt)
      
      return {
        id: user.id,
        name: user.name || '未知用户',
        email: user.email || '',
        department: user.department || '未分配部门',
        assignedAt,
        status,
        startedAt,
        completedAt,
        score,
        progress: status === 'started' ? progress : undefined,
        timeSpent: timeSpent > 0 ? timeSpent : undefined
      }
    })

    // 计算统计数据
    const stats: StatusStats = {
      total: candidates.length,
      assigned: candidates.filter(c => c.status === 'assigned').length,
      started: candidates.filter(c => c.status === 'started').length,
      completed: candidates.filter(c => c.status === 'completed').length,
      expired: candidates.filter(c => c.status === 'expired').length
    }

    return NextResponse.json({
      success: true,
      candidates,
      stats,
      examInfo: {
        id: examData.id,
        title: examData.title,
        duration: examData.duration,
        totalQuestions: examData.total_questions
      }
    })

  } catch (error) {
    console.error('获取考生数据API错误:', error)
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/exams/[id]/candidates
 * @description 为考试分配新的考生
 * @param request HTTP请求对象
 * @param params 路由参数，包含考试ID
 * @returns 分配结果
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: examId } = await params
    const body = await request.json()
    const { userIds } = body

    // 验证参数
    if (!examId) {
      return NextResponse.json(
        { error: '考试ID不能为空' },
        { status: 400 }
      )
    }

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { error: '用户ID列表不能为空' },
        { status: 400 }
      )
    }

    // 验证考试是否存在
    const { data: examData, error: examError } = await supabase
      .from('exams')
      .select('id')
      .eq('id', examId)
      .single()

    if (examError || !examData) {
      return NextResponse.json(
        { error: '考试不存在' },
        { status: 404 }
      )
    }

    // 批量分配考试
    const { data: updateData, error: updateError } = await supabase
      .from('users')
      .update({ assigned_exam_id: examId })
      .in('id', userIds)
      .select('id, name, email')

    if (updateError) {
      console.error('分配考试错误:', updateError)
      return NextResponse.json(
        { error: '分配考试失败' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `成功为 ${updateData?.length || 0} 名用户分配考试`,
      assignedUsers: updateData
    })

  } catch (error) {
    console.error('分配考试API错误:', error)
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/exams/[id]/candidates
 * @description 取消考试的考生分配
 * @param request HTTP请求对象
 * @param params 路由参数，包含考试ID
 * @returns 取消分配结果
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: examId } = await params
    const body = await request.json()
    const { userIds } = body

    // 验证参数
    if (!examId) {
      return NextResponse.json(
        { error: '考试ID不能为空' },
        { status: 400 }
      )
    }

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { error: '用户ID列表不能为空' },
        { status: 400 }
      )
    }

    // 取消分配（只能取消未开始的考试）
    const { data: updateData, error: updateError } = await supabase
      .from('users')
      .update({ 
        assigned_exam_id: null,
        exam_started_at: null,
        exam_completed_at: null,
        exam_score: null,
        exam_answers: null
      })
      .in('id', userIds)
      .eq('assigned_exam_id', examId)
      .is('exam_started_at', null) // 只能取消未开始的考试
      .select('id, name, email')

    if (updateError) {
      console.error('取消分配错误:', updateError)
      return NextResponse.json(
        { error: '取消分配失败' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `成功为 ${updateData?.length || 0} 名用户取消考试分配`,
      unassignedUsers: updateData
    })

  } catch (error) {
    console.error('取消分配API错误:', error)
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    )
  }
}