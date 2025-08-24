'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { BookOpen, Clock, Users, Award, Play, CheckCircle, Star } from 'lucide-react'

/**
 * 培训课程接口定义
 * @interface TrainingCourse
 * @property {string} id - 课程唯一标识
 * @property {string} title - 课程标题
 * @property {string} description - 课程描述
 * @property {string} category - 课程分类
 * @property {string} level - 难度级别
 * @property {number} duration - 课程时长（小时）
 * @property {number} students - 学员数量
 * @property {number} rating - 课程评分
 * @property {string} instructor - 讲师姓名
 * @property {number} price - 课程价格
 * @property {string} image - 课程封面图片
 * @property {string[]} skills - 技能标签
 * @property {boolean} isFree - 是否免费
 */
interface TrainingCourse {
  id: string
  title: string
  description: string
  category: string
  level: string
  duration: number
  students: number
  rating: number
  instructor: string
  price: number
  image: string
  skills: string[]
  isFree: boolean
}

/**
 * 学习进度接口定义
 * @interface LearningProgress
 * @property {string} courseId - 课程ID
 * @property {number} progress - 学习进度百分比
 * @property {number} completedLessons - 已完成课时
 * @property {number} totalLessons - 总课时
 * @property {string} lastStudied - 最后学习时间
 */
interface LearningProgress {
  courseId: string
  progress: number
  completedLessons: number
  totalLessons: number
  lastStudied: string
}

/**
 * 技能培训学习页面组件
 * 提供培训课程浏览、搜索、分类筛选和学习进度管理功能
 * @returns {JSX.Element} 技能培训学习页面
 */
export default function SkillTrainingPage() {
  const [courses, setCourses] = useState<TrainingCourse[]>([])
  const [progress, setProgress] = useState<LearningProgress[]>([])
  const [selectedCategory, setSelectedCategory] = useState('全部')
  const [selectedLevel, setSelectedLevel] = useState('全部')
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)

  // 课程分类
  const categories = ['全部', '前端开发', '后端开发', '数据分析', '人工智能', '项目管理', '设计创意']
  
  // 难度级别
  const levels = ['全部', '初级', '中级', '高级']

  /**
   * 生成模拟培训课程数据
   * @returns {TrainingCourse[]} 培训课程数组
   */
  const generateMockCourses = (): TrainingCourse[] => {
    return [
      {
        id: '1',
        title: 'React 前端开发实战',
        description: '从零开始学习React框架，掌握现代前端开发技能，包括组件开发、状态管理、路由配置等核心知识点。',
        category: '前端开发',
        level: '中级',
        duration: 40,
        students: 1250,
        rating: 4.8,
        instructor: '张老师',
        price: 299,
        image: 'https://trae-api-sg.mchost.guru/api/ide/v1/text_to_image?prompt=React%20frontend%20development%20course%20modern%20web%20programming&image_size=landscape_4_3',
        skills: ['React', 'JavaScript', 'HTML/CSS', '组件开发'],
        isFree: false
      },
      {
        id: '2',
        title: 'Python 数据分析基础',
        description: '学习Python在数据分析领域的应用，掌握pandas、numpy等核心库的使用方法。',
        category: '数据分析',
        level: '初级',
        duration: 30,
        students: 890,
        rating: 4.6,
        instructor: '李老师',
        price: 199,
        image: 'https://trae-api-sg.mchost.guru/api/ide/v1/text_to_image?prompt=Python%20data%20analysis%20programming%20charts%20statistics&image_size=landscape_4_3',
        skills: ['Python', 'Pandas', 'NumPy', '数据可视化'],
        isFree: true
      },
      {
        id: '3',
        title: '机器学习算法实践',
        description: '深入学习机器学习核心算法，通过实际项目掌握模型训练和优化技巧。',
        category: '人工智能',
        level: '高级',
        duration: 60,
        students: 567,
        rating: 4.9,
        instructor: '王老师',
        price: 599,
        image: 'https://trae-api-sg.mchost.guru/api/ide/v1/text_to_image?prompt=Machine%20learning%20artificial%20intelligence%20algorithms%20neural%20networks&image_size=landscape_4_3',
        skills: ['机器学习', 'TensorFlow', '算法优化', '模型部署'],
        isFree: false
      },
      {
        id: '4',
        title: 'Node.js 后端开发',
        description: '掌握Node.js服务端开发技能，学习API设计、数据库操作和服务器部署。',
        category: '后端开发',
        level: '中级',
        duration: 45,
        students: 723,
        rating: 4.7,
        instructor: '陈老师',
        price: 399,
        image: 'https://trae-api-sg.mchost.guru/api/ide/v1/text_to_image?prompt=Node.js%20backend%20development%20server%20programming%20API&image_size=landscape_4_3',
        skills: ['Node.js', 'Express', 'MongoDB', 'API设计'],
        isFree: false
      },
      {
        id: '5',
        title: '敏捷项目管理',
        description: '学习敏捷开发方法论，掌握Scrum框架和项目管理最佳实践。',
        category: '项目管理',
        level: '中级',
        duration: 25,
        students: 445,
        rating: 4.5,
        instructor: '刘老师',
        price: 0,
        image: 'https://trae-api-sg.mchost.guru/api/ide/v1/text_to_image?prompt=Agile%20project%20management%20scrum%20teamwork%20planning&image_size=landscape_4_3',
        skills: ['Scrum', '敏捷开发', '团队协作', '项目规划'],
        isFree: true
      },
      {
        id: '6',
        title: 'UI/UX 设计思维',
        description: '培养设计思维，学习用户体验设计原则和界面设计技巧。',
        category: '设计创意',
        level: '初级',
        duration: 35,
        students: 612,
        rating: 4.4,
        instructor: '赵老师',
        price: 249,
        image: 'https://trae-api-sg.mchost.guru/api/ide/v1/text_to_image?prompt=UI%20UX%20design%20user%20interface%20creative%20modern&image_size=landscape_4_3',
        skills: ['UI设计', 'UX设计', '原型设计', '用户研究'],
        isFree: false
      }
    ]
  }

  /**
   * 生成模拟学习进度数据
   * @returns {LearningProgress[]} 学习进度数组
   */
  const generateMockProgress = (): LearningProgress[] => {
    return [
      {
        courseId: '1',
        progress: 65,
        completedLessons: 13,
        totalLessons: 20,
        lastStudied: '2024-01-15'
      },
      {
        courseId: '2',
        progress: 100,
        completedLessons: 15,
        totalLessons: 15,
        lastStudied: '2024-01-10'
      },
      {
        courseId: '5',
        progress: 30,
        completedLessons: 3,
        totalLessons: 10,
        lastStudied: '2024-01-12'
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
      setCourses(generateMockCourses())
      setProgress(generateMockProgress())
      setLoading(false)
    }
    loadData()
  }, [])

  /**
   * 过滤课程列表
   * 根据分类、级别和搜索关键词过滤课程
   * @returns {TrainingCourse[]} 过滤后的课程列表
   */
  const filteredCourses = courses.filter(course => {
    const matchesCategory = selectedCategory === '全部' || course.category === selectedCategory
    const matchesLevel = selectedLevel === '全部' || course.level === selectedLevel
    const matchesSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         course.description.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesCategory && matchesLevel && matchesSearch
  })

  /**
   * 获取课程学习进度
   * @param {string} courseId - 课程ID
   * @returns {LearningProgress | undefined} 学习进度信息
   */
  const getCourseProgress = (courseId: string): LearningProgress | undefined => {
    return progress.find(p => p.courseId === courseId)
  }

  /**
   * 渲染课程卡片
   * @param {TrainingCourse} course - 课程信息
   * @returns {JSX.Element} 课程卡片组件
   */
  const renderCourseCard = (course: TrainingCourse) => {
    const courseProgress = getCourseProgress(course.id)
    
    return (
      <div key={course.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
        <div className="relative">
          <img 
            src={course.image} 
            alt={course.title}
            className="w-full h-48 object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement
              target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxOCIgZmlsbD0iIzk3YTNiNCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPuivvueoi+WbvueJhzwvdGV4dD48L3N2Zz4='
            }}
          />
          {course.isFree && (
            <span className="absolute top-2 left-2 bg-green-500 text-white px-2 py-1 rounded text-sm font-semibold">
              免费
            </span>
          )}
          <span className={`absolute top-2 right-2 px-2 py-1 rounded text-sm font-semibold ${
            course.level === '初级' ? 'bg-green-100 text-green-800' :
            course.level === '中级' ? 'bg-yellow-100 text-yellow-800' :
            'bg-red-100 text-red-800'
          }`}>
            {course.level}
          </span>
        </div>
        
        <div className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-blue-600 font-semibold">{course.category}</span>
            <div className="flex items-center">
              <Star className="w-4 h-4 text-yellow-400 fill-current" />
              <span className="ml-1 text-sm text-gray-600">{course.rating}</span>
            </div>
          </div>
          
          <h3 className="text-xl font-bold mb-2 text-gray-800">{course.title}</h3>
          <p className="text-gray-600 text-sm mb-4 line-clamp-2">{course.description}</p>
          
          <div className="flex flex-wrap gap-1 mb-4">
            {course.skills.slice(0, 3).map((skill, index) => (
              <span key={index} className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">
                {skill}
              </span>
            ))}
            {course.skills.length > 3 && (
              <span className="text-gray-500 text-xs">+{course.skills.length - 3}</span>
            )}
          </div>
          
          <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
            <div className="flex items-center">
              <Clock className="w-4 h-4 mr-1" />
              <span>{course.duration}小时</span>
            </div>
            <div className="flex items-center">
              <Users className="w-4 h-4 mr-1" />
              <span>{course.students}人学习</span>
            </div>
          </div>
          
          {courseProgress && (
            <div className="mb-4">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>学习进度</span>
                <span>{courseProgress.progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${courseProgress.progress}%` }}
                ></div>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {courseProgress.completedLessons}/{courseProgress.totalLessons} 课时完成
              </div>
            </div>
          )}
          
          <div className="flex items-center justify-between">
            <div className="text-lg font-bold text-gray-800">
              {course.isFree ? '免费' : `¥${course.price}`}
            </div>
            <div className="flex space-x-2">
              {courseProgress ? (
                <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">
                  <Play className="w-4 h-4 mr-1" />
                  继续学习
                </button>
              ) : (
                <button className="flex items-center px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors">
                  <BookOpen className="w-4 h-4 mr-1" />
                  开始学习
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 页面头部 */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="container mx-auto px-4 py-12">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">技能培训学习</h1>
            <p className="text-xl text-blue-100 max-w-3xl mx-auto">
              专业的技能培训课程，助力您的职业发展和技能提升
            </p>
          </div>
        </div>
      </div>

      {/* 统计信息 */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-blue-600 mb-2">{courses.length}</div>
              <div className="text-gray-600">精品课程</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-blue-600 mb-2">
                {courses.reduce((sum, course) => sum + course.students, 0).toLocaleString()}
              </div>
              <div className="text-gray-600">学员总数</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-blue-600 mb-2">
                {progress.length}
              </div>
              <div className="text-gray-600">我的课程</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-blue-600 mb-2">
                {Math.round(progress.reduce((sum, p) => sum + p.progress, 0) / progress.length) || 0}%
              </div>
              <div className="text-gray-600">平均进度</div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* 我的学习进度 */}
        {progress.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">我的学习进度</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {progress.map(p => {
                const course = courses.find(c => c.id === p.courseId)
                if (!course) return null
                
                return (
                  <div key={p.courseId} className="bg-white rounded-lg shadow-md p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-gray-800">{course.title}</h3>
                      {p.progress === 100 && (
                        <CheckCircle className="w-6 h-6 text-green-500" />
                      )}
                    </div>
                    <div className="mb-3">
                      <div className="flex justify-between text-sm text-gray-600 mb-1">
                        <span>进度</span>
                        <span>{p.progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-300 ${
                            p.progress === 100 ? 'bg-green-500' : 'bg-blue-600'
                          }`}
                          style={{ width: `${p.progress}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="text-sm text-gray-500">
                      <div>课时：{p.completedLessons}/{p.totalLessons}</div>
                      <div>最后学习：{p.lastStudied}</div>
                    </div>
                    <button className="w-full mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">
                      {p.progress === 100 ? '复习课程' : '继续学习'}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* 搜索和筛选 */}
        <div className="mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">搜索课程</label>
                <input
                  type="text"
                  placeholder="输入课程名称或关键词"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">课程分类</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">难度级别</label>
                <select
                  value={selectedLevel}
                  onChange={(e) => setSelectedLevel(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {levels.map(level => (
                    <option key={level} value={level}>{level}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <button 
                  onClick={() => {
                    setSearchTerm('')
                    setSelectedCategory('全部')
                    setSelectedLevel('全部')
                  }}
                  className="w-full px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
                >
                  重置筛选
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 课程列表 */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-800">全部课程</h2>
            <div className="text-sm text-gray-600">
              共找到 {filteredCourses.length} 门课程
            </div>
          </div>
          
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-600">正在加载课程...</p>
            </div>
          ) : filteredCourses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCourses.map(renderCourseCard)}
            </div>
          ) : (
            <div className="text-center py-12">
              <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">没有找到符合条件的课程</p>
              <button 
                onClick={() => {
                  setSearchTerm('')
                  setSelectedCategory('全部')
                  setSelectedLevel('全部')
                }}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                查看全部课程
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}