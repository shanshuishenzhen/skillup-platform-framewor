'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { FileText, Clock, Users, Award, Calendar, CheckCircle, AlertCircle, Trophy, BookOpen } from 'lucide-react'

/**
 * 考试信息接口定义
 * @interface Exam
 * @property {string} id - 考试唯一标识
 * @property {string} title - 考试标题
 * @property {string} description - 考试描述
 * @property {string} category - 考试分类
 * @property {string} level - 考试级别
 * @property {number} duration - 考试时长（分钟）
 * @property {number} totalQuestions - 题目总数
 * @property {number} passingScore - 及格分数
 * @property {number} fee - 考试费用
 * @property {string} examDate - 考试日期
 * @property {string} registrationDeadline - 报名截止日期
 * @property {number} registeredCount - 已报名人数
 * @property {number} maxCapacity - 最大容量
 * @property {string} status - 考试状态
 * @property {string[]} skills - 考核技能
 * @property {boolean} isCertified - 是否颁发证书
 */
interface Exam {
  id: string
  title: string
  description: string
  category: string
  level: string
  duration: number
  totalQuestions: number
  passingScore: number
  fee: number
  examDate: string
  registrationDeadline: string
  registeredCount: number
  maxCapacity: number
  status: 'upcoming' | 'registration' | 'closed' | 'completed'
  skills: string[]
  isCertified: boolean
}

/**
 * 考试记录接口定义
 * @interface ExamRecord
 * @property {string} examId - 考试ID
 * @property {string} examTitle - 考试标题
 * @property {number} score - 考试分数
 * @property {number} totalScore - 总分
 * @property {string} status - 考试状态
 * @property {string} examDate - 考试日期
 * @property {string} completedAt - 完成时间
 * @property {boolean} passed - 是否通过
 * @property {string} certificateUrl - 证书链接
 */
interface ExamRecord {
  examId: string
  examTitle: string
  score: number
  totalScore: number
  status: 'completed' | 'registered' | 'in_progress'
  examDate: string
  completedAt?: string
  passed: boolean
  certificateUrl?: string
}

/**
 * 技能等级考试页面组件
 * 提供考试浏览、报名、成绩查询和证书管理功能
 * @returns {JSX.Element} 技能等级考试页面
 */
export default function SkillExamPage() {
  const [exams, setExams] = useState<Exam[]>([])
  const [examRecords, setExamRecords] = useState<ExamRecord[]>([])
  const [selectedCategory, setSelectedCategory] = useState('全部')
  const [selectedLevel, setSelectedLevel] = useState('全部')
  const [selectedStatus, setSelectedStatus] = useState('全部')
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState('available')
  const [loading, setLoading] = useState(true)

  // 考试分类
  const categories = ['全部', '前端开发', '后端开发', '数据分析', '人工智能', '项目管理', '设计创意']
  
  // 考试级别
  const levels = ['全部', '初级', '中级', '高级', '专家级']
  
  // 考试状态
  const statuses = ['全部', '报名中', '即将开始', '已结束']

  /**
   * 生成模拟考试数据
   * @returns {Exam[]} 考试数组
   */
  const generateMockExams = (): Exam[] => {
    return [
      {
        id: '1',
        title: 'React 前端开发工程师认证',
        description: '全面考核React框架开发能力，包括组件设计、状态管理、性能优化等核心技能。',
        category: '前端开发',
        level: '中级',
        duration: 120,
        totalQuestions: 80,
        passingScore: 70,
        fee: 299,
        examDate: '2024-02-15',
        registrationDeadline: '2024-02-10',
        registeredCount: 156,
        maxCapacity: 200,
        status: 'registration',
        skills: ['React', 'JavaScript', 'Redux', '组件开发'],
        isCertified: true
      },
      {
        id: '2',
        title: 'Python 数据分析师认证',
        description: '考核Python在数据分析领域的应用能力，涵盖数据处理、可视化和机器学习基础。',
        category: '数据分析',
        level: '初级',
        duration: 90,
        totalQuestions: 60,
        passingScore: 65,
        fee: 199,
        examDate: '2024-02-20',
        registrationDeadline: '2024-02-15',
        registeredCount: 89,
        maxCapacity: 150,
        status: 'registration',
        skills: ['Python', 'Pandas', 'NumPy', '数据可视化'],
        isCertified: true
      },
      {
        id: '3',
        title: '机器学习工程师认证',
        description: '高级机器学习算法和模型部署能力认证，适合有一定基础的开发者。',
        category: '人工智能',
        level: '高级',
        duration: 180,
        totalQuestions: 100,
        passingScore: 75,
        fee: 599,
        examDate: '2024-03-01',
        registrationDeadline: '2024-02-25',
        registeredCount: 45,
        maxCapacity: 100,
        status: 'upcoming',
        skills: ['机器学习', 'TensorFlow', '深度学习', '模型部署'],
        isCertified: true
      },
      {
        id: '4',
        title: 'Node.js 后端开发认证',
        description: '全面考核Node.js服务端开发技能，包括API设计、数据库操作和系统架构。',
        category: '后端开发',
        level: '中级',
        duration: 150,
        totalQuestions: 90,
        passingScore: 70,
        fee: 399,
        examDate: '2024-01-20',
        registrationDeadline: '2024-01-15',
        registeredCount: 200,
        maxCapacity: 200,
        status: 'completed',
        skills: ['Node.js', 'Express', 'MongoDB', 'API设计'],
        isCertified: true
      },
      {
        id: '5',
        title: 'PMP 项目管理认证',
        description: '国际项目管理专业人士认证，考核项目管理理论和实践能力。',
        category: '项目管理',
        level: '专家级',
        duration: 240,
        totalQuestions: 200,
        passingScore: 80,
        fee: 899,
        examDate: '2024-03-15',
        registrationDeadline: '2024-03-10',
        registeredCount: 23,
        maxCapacity: 50,
        status: 'upcoming',
        skills: ['项目管理', 'PMP', '风险管理', '团队领导'],
        isCertified: true
      },
      {
        id: '6',
        title: 'UI/UX 设计师认证',
        description: '用户界面和用户体验设计能力认证，考核设计思维和实践技能。',
        category: '设计创意',
        level: '中级',
        duration: 120,
        totalQuestions: 70,
        passingScore: 65,
        fee: 349,
        examDate: '2024-02-25',
        registrationDeadline: '2024-02-20',
        registeredCount: 67,
        maxCapacity: 120,
        status: 'registration',
        skills: ['UI设计', 'UX设计', '原型设计', '用户研究'],
        isCertified: true
      }
    ]
  }

  /**
   * 生成模拟考试记录数据
   * @returns {ExamRecord[]} 考试记录数组
   */
  const generateMockExamRecords = (): ExamRecord[] => {
    return [
      {
        examId: '4',
        examTitle: 'Node.js 后端开发认证',
        score: 85,
        totalScore: 100,
        status: 'completed',
        examDate: '2024-01-20',
        completedAt: '2024-01-20 14:30:00',
        passed: true,
        certificateUrl: '#'
      },
      {
        examId: '1',
        examTitle: 'React 前端开发工程师认证',
        score: 0,
        totalScore: 100,
        status: 'registered',
        examDate: '2024-02-15',
        passed: false
      },
      {
        examId: '2',
        examTitle: 'Python 数据分析师认证',
        score: 0,
        totalScore: 100,
        status: 'registered',
        examDate: '2024-02-20',
        passed: false
      }
    ]
  }

  /**
   * 组件初始化时加载数据
   */
  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      // 模拟API调用延迟
      await new Promise(resolve => setTimeout(resolve, 1000))
      setExams(generateMockExams())
      setExamRecords(generateMockExamRecords())
      setLoading(false)
    }
    loadData()
  }, [])

  /**
   * 过滤考试列表
   * 根据分类、级别、状态和搜索关键词过滤考试
   * @returns {Exam[]} 过滤后的考试列表
   */
  const filteredExams = exams.filter(exam => {
    const matchesCategory = selectedCategory === '全部' || exam.category === selectedCategory
    const matchesLevel = selectedLevel === '全部' || exam.level === selectedLevel
    const matchesStatus = selectedStatus === '全部' || 
      (selectedStatus === '报名中' && exam.status === 'registration') ||
      (selectedStatus === '即将开始' && exam.status === 'upcoming') ||
      (selectedStatus === '已结束' && exam.status === 'completed')
    const matchesSearch = exam.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         exam.description.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesCategory && matchesLevel && matchesStatus && matchesSearch
  })

  /**
   * 获取考试状态显示文本
   * @param {string} status - 考试状态
   * @returns {string} 状态显示文本
   */
  const getStatusText = (status: string): string => {
    switch (status) {
      case 'registration': return '报名中'
      case 'upcoming': return '即将开始'
      case 'closed': return '报名截止'
      case 'completed': return '已结束'
      default: return '未知状态'
    }
  }

  /**
   * 获取考试状态样式
   * @param {string} status - 考试状态
   * @returns {string} CSS类名
   */
  const getStatusStyle = (status: string): string => {
    switch (status) {
      case 'registration': return 'bg-green-100 text-green-800'
      case 'upcoming': return 'bg-blue-100 text-blue-800'
      case 'closed': return 'bg-red-100 text-red-800'
      case 'completed': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  /**
   * 渲染考试卡片
   * @param {Exam} exam - 考试信息
   * @returns {JSX.Element} 考试卡片组件
   */
  const renderExamCard = (exam: Exam) => {
    const isRegistrationOpen = exam.status === 'registration'
    const isUpcoming = exam.status === 'upcoming'
    const registrationProgress = (exam.registeredCount / exam.maxCapacity) * 100
    
    return (
      <div key={exam.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-blue-600 font-semibold">{exam.category}</span>
              <span className={`px-2 py-1 rounded text-sm font-semibold ${
                exam.level === '初级' ? 'bg-green-100 text-green-800' :
                exam.level === '中级' ? 'bg-yellow-100 text-yellow-800' :
                exam.level === '高级' ? 'bg-orange-100 text-orange-800' :
                'bg-red-100 text-red-800'
              }`}>
                {exam.level}
              </span>
            </div>
            <span className={`px-2 py-1 rounded text-sm font-semibold ${getStatusStyle(exam.status)}`}>
              {getStatusText(exam.status)}
            </span>
          </div>
          
          <h3 className="text-xl font-bold mb-2 text-gray-800">{exam.title}</h3>
          <p className="text-gray-600 text-sm mb-4 line-clamp-2">{exam.description}</p>
          
          <div className="flex flex-wrap gap-1 mb-4">
            {exam.skills.slice(0, 3).map((skill, index) => (
              <span key={index} className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">
                {skill}
              </span>
            ))}
            {exam.skills.length > 3 && (
              <span className="text-gray-500 text-xs">+{exam.skills.length - 3}</span>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-4 text-sm text-gray-600">
            <div className="flex items-center">
              <Clock className="w-4 h-4 mr-1" />
              <span>{exam.duration}分钟</span>
            </div>
            <div className="flex items-center">
              <FileText className="w-4 h-4 mr-1" />
              <span>{exam.totalQuestions}题</span>
            </div>
            <div className="flex items-center">
              <Calendar className="w-4 h-4 mr-1" />
              <span>{exam.examDate}</span>
            </div>
            <div className="flex items-center">
              <Award className="w-4 h-4 mr-1" />
              <span>及格{exam.passingScore}分</span>
            </div>
          </div>
          
          {exam.isCertified && (
            <div className="flex items-center mb-4 text-sm text-green-600">
              <Trophy className="w-4 h-4 mr-1" />
              <span>通过后颁发认证证书</span>
            </div>
          )}
          
          <div className="mb-4">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>报名进度</span>
              <span>{exam.registeredCount}/{exam.maxCapacity}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-300 ${
                  registrationProgress >= 90 ? 'bg-red-500' :
                  registrationProgress >= 70 ? 'bg-yellow-500' :
                  'bg-green-500'
                }`}
                style={{ width: `${registrationProgress}%` }}
              ></div>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="text-lg font-bold text-gray-800">
              ¥{exam.fee}
            </div>
            <div className="flex space-x-2">
              {isRegistrationOpen ? (
                <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">
                  立即报名
                </button>
              ) : isUpcoming ? (
                <button className="px-4 py-2 bg-gray-400 text-white rounded cursor-not-allowed" disabled>
                  报名已截止
                </button>
              ) : (
                <button className="px-4 py-2 bg-gray-400 text-white rounded cursor-not-allowed" disabled>
                  考试已结束
                </button>
              )}
              <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors">
                查看详情
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  /**
   * 渲染考试记录卡片
   * @param {ExamRecord} record - 考试记录
   * @returns {JSX.Element} 考试记录卡片组件
   */
  const renderExamRecord = (record: ExamRecord) => {
    return (
      <div key={record.examId} className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">{record.examTitle}</h3>
          <span className={`px-2 py-1 rounded text-sm font-semibold ${
            record.status === 'completed' ? 
              (record.passed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800') :
            record.status === 'registered' ? 'bg-blue-100 text-blue-800' :
            'bg-yellow-100 text-yellow-800'
          }`}>
            {record.status === 'completed' ? (record.passed ? '已通过' : '未通过') :
             record.status === 'registered' ? '已报名' : '进行中'}
          </span>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-4 text-sm text-gray-600">
          <div>
            <span className="font-medium">考试日期：</span>
            <span>{record.examDate}</span>
          </div>
          {record.completedAt && (
            <div>
              <span className="font-medium">完成时间：</span>
              <span>{record.completedAt}</span>
            </div>
          )}
        </div>
        
        {record.status === 'completed' && (
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">考试成绩</span>
              <span className={`text-lg font-bold ${
                record.passed ? 'text-green-600' : 'text-red-600'
              }`}>
                {record.score}/{record.totalScore}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-300 ${
                  record.passed ? 'bg-green-500' : 'bg-red-500'
                }`}
                style={{ width: `${(record.score / record.totalScore) * 100}%` }}
              ></div>
            </div>
          </div>
        )}
        
        <div className="flex space-x-2">
          {record.status === 'completed' && record.passed && record.certificateUrl && (
            <button className="flex items-center px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors">
              <Award className="w-4 h-4 mr-1" />
              下载证书
            </button>
          )}
          {record.status === 'registered' && (
            <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">
              <BookOpen className="w-4 h-4 mr-1" />
              开始考试
            </button>
          )}
          <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors">
            查看详情
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 页面头部 */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
        <div className="container mx-auto px-4 py-12">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">技能等级考试</h1>
            <p className="text-xl text-purple-100 max-w-3xl mx-auto">
              专业的技能认证考试，获得行业认可的技能证书
            </p>
          </div>
        </div>
      </div>

      {/* 统计信息 */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-purple-600 mb-2">{exams.length}</div>
              <div className="text-gray-600">认证考试</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-purple-600 mb-2">
                {exams.reduce((sum, exam) => sum + exam.registeredCount, 0).toLocaleString()}
              </div>
              <div className="text-gray-600">报名总数</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-purple-600 mb-2">
                {examRecords.length}
              </div>
              <div className="text-gray-600">我的考试</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-purple-600 mb-2">
                {examRecords.filter(r => r.passed).length}
              </div>
              <div className="text-gray-600">已通过</div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* 标签页导航 */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('available')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'available'
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                可报名考试
              </button>
              <button
                onClick={() => setActiveTab('my-exams')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'my-exams'
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                我的考试
              </button>
            </nav>
          </div>
        </div>

        {activeTab === 'available' && (
          <>
            {/* 搜索和筛选 */}
            <div className="mb-8">
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">搜索考试</label>
                    <input
                      type="text"
                      placeholder="输入考试名称或关键词"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">考试分类</label>
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      {categories.map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">考试级别</label>
                    <select
                      value={selectedLevel}
                      onChange={(e) => setSelectedLevel(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      {levels.map(level => (
                        <option key={level} value={level}>{level}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">考试状态</label>
                    <select
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      {statuses.map(status => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-end">
                    <button 
                      onClick={() => {
                        setSearchTerm('')
                        setSelectedCategory('全部')
                        setSelectedLevel('全部')
                        setSelectedStatus('全部')
                      }}
                      className="w-full px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
                    >
                      重置筛选
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* 考试列表 */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800">可报名考试</h2>
                <div className="text-sm text-gray-600">
                  共找到 {filteredExams.length} 场考试
                </div>
              </div>
              
              {loading ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                  <p className="mt-2 text-gray-600">正在加载考试...</p>
                </div>
              ) : filteredExams.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredExams.map(renderExamCard)}
                </div>
              ) : (
                <div className="text-center py-12">
                  <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">没有找到符合条件的考试</p>
                  <button 
                    onClick={() => {
                      setSearchTerm('')
                      setSelectedCategory('全部')
                      setSelectedLevel('全部')
                      setSelectedStatus('全部')
                    }}
                    className="mt-4 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
                  >
                    查看全部考试
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'my-exams' && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">我的考试记录</h2>
            
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                <p className="mt-2 text-gray-600">正在加载考试记录...</p>
              </div>
            ) : examRecords.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {examRecords.map(renderExamRecord)}
              </div>
            ) : (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">您还没有参加过任何考试</p>
                <button 
                  onClick={() => setActiveTab('available')}
                  className="mt-4 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
                >
                  浏览可报名考试
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}