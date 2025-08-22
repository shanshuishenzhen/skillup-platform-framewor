import Link from 'next/link'

export default function TrainingPage() {
  const trainingCourses = [
    {
      id: 1,
      title: "包装设计师",
      description: "包装设计属于广告设计里面的一个细项，通过培训培养能在商品生产、流通领域，从事包装工艺设计、储运包装设计、销售包装设计等工作的专业人才。",
      duration: "3个月",
      level: "中级",
      price: "¥3,800",
      image: "/api/placeholder/300/200",
      features: ["理论课程", "实操训练", "项目实战", "证书认证"]
    },
    {
      id: 2,
      title: "广告设计师",
      description: "广告设计师指采用现代设计观念、程序和方法从事以平面广告设计为主的策划、创意与制作的专业人员。",
      duration: "4个月",
      level: "中级",
      price: "¥4,200",
      image: "/api/placeholder/300/200",
      features: ["创意设计", "软件应用", "品牌策划", "作品集制作"]
    },
    {
      id: 3,
      title: "美容师",
      description: "美容师是一种专业美容领域的职业称谓，主要工作在能为顾客提供美容服务的场所，工作职责是为顾客提供美容服务，包括皮肤护理、化妆、美甲等。",
      duration: "2个月",
      level: "初级",
      price: "¥2,800",
      image: "/api/placeholder/300/200",
      features: ["基础理论", "实操技能", "产品知识", "服务礼仪"]
    },
    {
      id: 4,
      title: "形象设计师",
      description: "通过提升人的内在素养、协调和美化外在形象，使其更加具有独特魅力的工作统称为形象设计。",
      duration: "3个月",
      level: "中级",
      price: "¥3,600",
      image: "/api/placeholder/300/200",
      features: ["色彩搭配", "风格定位", "造型设计", "形象管理"]
    },
    {
      id: 5,
      title: "室内装饰设计师",
      description: "室内装饰设计师负责室内空间的设计规划，包括空间布局、色彩搭配、材料选择、家具配置等，创造美观实用的室内环境。",
      duration: "6个月",
      level: "高级",
      price: "¥6,800",
      image: "/api/placeholder/300/200",
      features: ["空间设计", "材料应用", "施工管理", "项目管理"]
    },
    {
      id: 6,
      title: "工业设计师",
      description: "工业设计师专注于产品的外观设计、功能设计和用户体验设计，将创意转化为实用的工业产品。",
      duration: "5个月",
      level: "高级",
      price: "¥5,500",
      image: "/api/placeholder/300/200",
      features: ["产品设计", "3D建模", "原型制作", "市场调研"]
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 页面头部 */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center space-x-4 mb-6">
            <Link href="/" className="text-blue-600 hover:underline">首页</Link>
            <span>/</span>
            <span className="text-gray-600">评价与培训</span>
          </div>
          <h1 className="text-3xl font-bold mb-4">评价与培训</h1>
          <p className="text-gray-600">专业的职业技能培训，助力您的职业发展</p>
        </div>
      </div>

      {/* 培训介绍 */}
      <div className="bg-blue-600 text-white py-12">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold mb-4">为什么选择我们的培训？</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8">
            <div>
              <div className="text-3xl mb-2">🎯</div>
              <h3 className="font-semibold mb-2">专业认证</h3>
              <p className="text-blue-100">获得国家认可的职业技能等级证书</p>
            </div>
            <div>
              <div className="text-3xl mb-2">👨‍🏫</div>
              <h3 className="font-semibold mb-2">名师授课</h3>
              <p className="text-blue-100">行业资深专家亲自授课指导</p>
            </div>
            <div>
              <div className="text-3xl mb-2">💼</div>
              <h3 className="font-semibold mb-2">就业保障</h3>
              <p className="text-blue-100">提供就业指导和推荐服务</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        {/* 课程列表 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {trainingCourses.map((course) => (
            <div key={course.id} className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-lg transition-shadow">
              <div className="h-48 bg-gray-200 relative">
                <div className="absolute top-4 right-4">
                  <span className="px-3 py-1 text-xs font-semibold text-white bg-green-600 rounded-full">
                    {course.level}
                  </span>
                </div>
              </div>
              <div className="p-6">
                <h3 className="font-semibold text-xl mb-3">{course.title}</h3>
                <p className="text-gray-600 text-sm mb-4 line-clamp-3">{course.description}</p>
                
                <div className="flex justify-between items-center mb-4">
                  <div className="text-sm text-gray-500">
                    <span>培训时长：{course.duration}</span>
                  </div>
                  <div className="text-lg font-bold text-blue-600">
                    {course.price}
                  </div>
                </div>

                <div className="mb-6">
                  <h4 className="font-semibold text-sm mb-2">课程特色：</h4>
                  <div className="flex flex-wrap gap-2">
                    {course.features.map((feature, index) => (
                      <span 
                        key={index}
                        className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded"
                      >
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex space-x-3">
                  <button className="flex-1 bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors">
                    咨询客服
                  </button>
                  <Link 
                    href={`/training/${course.id}`}
                    className="flex-1 border border-blue-600 text-blue-600 py-2 px-4 rounded hover:bg-blue-50 transition-colors text-center"
                  >
                    查看详情
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 培训优势 */}
        <div className="mt-16 bg-white rounded-lg p-8 shadow-sm">
          <h2 className="text-2xl font-bold mb-8 text-center">培训优势</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-4xl mb-4">📚</div>
              <h3 className="font-semibold mb-2">系统课程</h3>
              <p className="text-gray-600 text-sm">完善的课程体系，理论与实践相结合</p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-4">🎓</div>
              <h3 className="font-semibold mb-2">权威认证</h3>
              <p className="text-gray-600 text-sm">国家认可的职业技能等级证书</p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-4">👥</div>
              <h3 className="font-semibold mb-2">小班教学</h3>
              <p className="text-gray-600 text-sm">小班制教学，确保学习效果</p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-4">💡</div>
              <h3 className="font-semibold mb-2">实战项目</h3>
              <p className="text-gray-600 text-sm">真实项目实战，积累工作经验</p>
            </div>
          </div>
        </div>

        {/* 联系方式 */}
        <div className="mt-12 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">立即咨询报名</h2>
          <p className="mb-6">专业顾问为您提供详细的课程信息和报名指导</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="text-lg font-semibold mb-2">课程咨询</div>
              <div className="text-2xl font-bold">18923703302</div>
            </div>
            <div>
              <div className="text-lg font-semibold mb-2">培训服务</div>
              <div className="text-2xl font-bold">18128859061</div>
            </div>
            <div>
              <div className="text-lg font-semibold mb-2">报考咨询</div>
              <div className="text-2xl font-bold">18823319017</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 