'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Search, Users, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

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
 * 考试信息接口
 * @description 定义考试的基本信息
 */
interface ExamInfo {
  id: string
  title: string
  description: string
  duration: number
  totalQuestions: number
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
 * 获取状态显示配置
 * @param status 考试状态
 * @returns 状态的显示配置（颜色、图标、文本）
 */
const getStatusConfig = (status: ExamStatus) => {
  const configs = {
    assigned: { color: 'bg-blue-100 text-blue-800', icon: Clock, text: '已分配' },
    started: { color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle, text: '进行中' },
    completed: { color: 'bg-green-100 text-green-800', icon: CheckCircle, text: '已完成' },
    expired: { color: 'bg-red-100 text-red-800', icon: XCircle, text: '已过期' }
  }
  return configs[status]
}

/**
 * 格式化时间显示
 * @param dateString 时间字符串
 * @returns 格式化后的时间字符串
 */
const formatDateTime = (dateString: string) => {
  return new Date(dateString).toLocaleString('zh-CN')
}

/**
 * 格式化时长显示
 * @param minutes 分钟数
 * @returns 格式化后的时长字符串
 */
const formatDuration = (minutes: number) => {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return hours > 0 ? `${hours}小时${mins}分钟` : `${mins}分钟`
}

/**
 * 考试考生管理页面组件
 * @description 显示指定考试的所有已分配用户列表，包含搜索筛选和状态管理功能
 */
export default function ExamCandidatesPage() {
  const params = useParams()
  const router = useRouter()
  const examId = params.id as string

  // 状态管理
  const [examInfo, setExamInfo] = useState<ExamInfo | null>(null)
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [filteredCandidates, setFilteredCandidates] = useState<Candidate[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<ExamStatus | 'all'>('all')
  const [stats, setStats] = useState<StatusStats>({
    total: 0,
    assigned: 0,
    started: 0,
    completed: 0,
    expired: 0
  })

  /**
   * 获取考试信息
   * @description 从API获取考试的基本信息
   */
  const fetchExamInfo = async () => {
    try {
      const response = await fetch(`/api/admin/exams/${examId}`)
      if (response.ok) {
        const data = await response.json()
        setExamInfo(data)
      } else {
        toast.error('获取考试信息失败')
      }
    } catch (error) {
      console.error('获取考试信息错误:', error)
      toast.error('获取考试信息失败')
    }
  }

  /**
   * 获取考生数据
   * @description 从API获取考试的所有考生信息和状态
   */
  const fetchCandidates = async () => {
    try {
      const response = await fetch(`/api/admin/exams/${examId}/candidates`)
      if (response.ok) {
        const data = await response.json()
        setCandidates(data.candidates || [])
        setStats(data.stats || {
          total: 0,
          assigned: 0,
          started: 0,
          completed: 0,
          expired: 0
        })
      } else {
        toast.error('获取考生数据失败')
      }
    } catch (error) {
      console.error('获取考生数据错误:', error)
      toast.error('获取考生数据失败')
    } finally {
      setLoading(false)
    }
  }

  /**
   * 筛选考生数据
   * @description 根据搜索关键词和状态筛选考生列表
   */
  const filterCandidates = () => {
    let filtered = candidates

    // 按搜索关键词筛选
    if (searchTerm) {
      filtered = filtered.filter(candidate => 
        candidate.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        candidate.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        candidate.department.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // 按状态筛选
    if (statusFilter !== 'all') {
      filtered = filtered.filter(candidate => candidate.status === statusFilter)
    }

    setFilteredCandidates(filtered)
  }

  // 初始化数据加载
  useEffect(() => {
    if (examId) {
      fetchExamInfo()
      fetchCandidates()
    }
  }, [examId])

  // 筛选条件变化时重新筛选
  useEffect(() => {
    filterCandidates()
  }, [candidates, searchTerm, statusFilter])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* 页面头部 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>返回</span>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {examInfo?.title || '考试'} - 考生管理
            </h1>
            <p className="text-gray-600 mt-1">
              {examInfo?.description || '管理考试的所有考生信息和状态'}
            </p>
          </div>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">总考生</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">已分配</p>
                <p className="text-2xl font-bold text-blue-600">{stats.assigned}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="text-sm text-gray-600">进行中</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.started}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">已完成</p>
                <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <XCircle className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-sm text-gray-600">已过期</p>
                <p className="text-2xl font-bold text-red-600">{stats.expired}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 搜索和筛选 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="搜索考生姓名、邮箱或部门..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as ExamStatus | 'all')}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="筛选状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="assigned">已分配</SelectItem>
                <SelectItem value="started">进行中</SelectItem>
                <SelectItem value="completed">已完成</SelectItem>
                <SelectItem value="expired">已过期</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 考生列表 */}
      <Card>
        <CardHeader>
          <CardTitle>考生列表 ({filteredCandidates.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredCandidates.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">暂无考生数据</p>
              <p className="text-sm text-gray-500 mt-1">
                {candidates.length === 0 ? '该考试尚未分配给任何用户' : '没有符合筛选条件的考生'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredCandidates.map((candidate) => {
                const statusConfig = getStatusConfig(candidate.status)
                const StatusIcon = statusConfig.icon
                
                return (
                  <div key={candidate.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="font-semibold text-gray-900">{candidate.name}</h3>
                          <Badge className={statusConfig.color}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusConfig.text}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-gray-600">
                          <div>
                            <span className="font-medium">邮箱：</span>
                            {candidate.email}
                          </div>
                          <div>
                            <span className="font-medium">部门：</span>
                            {candidate.department}
                          </div>
                          <div>
                            <span className="font-medium">分配时间：</span>
                            {formatDateTime(candidate.assignedAt)}
                          </div>
                          {candidate.status === 'started' && candidate.progress !== undefined && (
                            <div>
                              <span className="font-medium">进度：</span>
                              {candidate.progress}%
                            </div>
                          )}
                          {candidate.status === 'completed' && candidate.score !== undefined && (
                            <div>
                              <span className="font-medium">成绩：</span>
                              <span className={candidate.score >= 60 ? 'text-green-600' : 'text-red-600'}>
                                {candidate.score}分
                              </span>
                            </div>
                          )}
                          {candidate.completedAt && (
                            <div>
                              <span className="font-medium">完成时间：</span>
                              {formatDateTime(candidate.completedAt)}
                            </div>
                          )}
                          {candidate.timeSpent && (
                            <div>
                              <span className="font-medium">用时：</span>
                              {formatDuration(candidate.timeSpent)}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}