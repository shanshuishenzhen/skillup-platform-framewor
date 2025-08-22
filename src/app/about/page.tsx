import Link from 'next/link'

export default function AboutPage() {
  const milestones = [
    {
      year: "2015",
      title: "协会筹备成立",
      description: "召开第一次会员大会，开始筹备深圳市商业美术设计促进会"
    },
    {
      year: "2016",
      title: "正式成立",
      description: "深圳市商业美术设计促进会正式成立，承办广东省工业设计师职业技能大赛"
    },
    {
      year: "2017",
      title: "业务拓展",
      description: "开始承办各类职业技能竞赛，拓展培训业务"
    },
    {
      year: "2018",
      title: "专业委员会成立",
      description: "成立多个专业委员会，推动行业专业化发展"
    },
    {
      year: "2019",
      title: "4A级协会认证",
      description: "获得4A级社会组织认证，提升协会影响力"
    },
    {
      year: "2020",
      title: "数字化转型",
      description: "推进数字化转型，建设线上服务平台"
    },
    {
      year: "2021",
      title: "人才库建设",
      description: "建立设计人才库，为行业提供人才服务"
    },
    {
      year: "2022",
      title: "品牌推广",
      description: "开展品牌推荐活动，推广深圳设计力量"
    },
    {
      year: "2023",
      title: "国际化发展",
      description: "加强国际交流合作，推动深圳设计走向世界"
    },
    {
      year: "2024",
      title: "创新发展",
      description: "持续创新发展，为深圳设计行业贡献力量"
    }
  ]

  const services = [
    {
      icon: "🎓",
      title: "职业技能培训",
      description: "提供专业的职业技能培训课程，帮助从业人员提升技能水平"
    },
    {
      icon: "🏆",
      title: "行业竞赛组织",
      description: "组织各类职业技能竞赛，促进行业交流和技术提升"
    },
    {
      icon: "👥",
      title: "会员服务",
      description: "为会员提供专业服务，促进会员间的交流与合作"
    },
    {
      icon: "📚",
      title: "标准制定",
      description: "参与行业标准制定，推动行业规范化发展"
    },
    {
      icon: "🤝",
      title: "资源对接",
      description: "为会员提供资源对接服务，促进业务合作"
    },
    {
      icon: "🌍",
      title: "国际交流",
      description: "组织国际交流活动，推动深圳设计走向世界"
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
            <span className="text-gray-600">关于协会</span>
          </div>
          <h1 className="text-3xl font-bold mb-4">关于协会</h1>
          <p className="text-gray-600">了解深圳市商业美术设计促进会</p>
        </div>
      </div>

      {/* 协会介绍 */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-6">深圳市商业美术设计促进会</h2>
          <p className="text-xl mb-8 max-w-4xl mx-auto">
            深圳市商业美术设计促进会，注册地深圳市龙岗区。是由深圳市从事商业美术设计行业相关的企事业单位自愿组成的地方性、行业性、非营利性的社会组织，
            现有来自装饰设计、文化传播、广告设计、包装、珠宝、工业等设计行业及相关企业会员单位100多家。
          </p>
          <p className="text-lg text-blue-100 max-w-4xl mx-auto">
            促进会立足深圳、辐射湾区，以&ldquo;融汇深圳设计、服务中国智造&rdquo;为理念，积极打造创意设计行业连接互动、分享交流、人才培养的平台，
            赋能深圳设计企业、支撑行业人才培养，引领深圳设计行业高质量发展。
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        {/* 统计数据 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-16">
          <div className="text-center">
            <div className="text-4xl font-bold text-blue-600 mb-2">2016年</div>
            <div className="text-gray-600">成立时间</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-blue-600 mb-2">4A级</div>
            <div className="text-gray-600">协会等级</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-blue-600 mb-2">20万</div>
            <div className="text-gray-600">注册会员</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-blue-600 mb-2">1000+</div>
            <div className="text-gray-600">组织活动</div>
          </div>
        </div>

        {/* 发展历程 */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold mb-8 text-center">发展历程</h2>
          <div className="relative">
            <div className="absolute left-1/2 transform -translate-x-1/2 w-1 bg-blue-200 h-full"></div>
            <div className="space-y-8">
              {milestones.map((milestone, index) => (
                <div key={index} className={`flex items-center ${index % 2 === 0 ? 'flex-row' : 'flex-row-reverse'}`}>
                  <div className="w-1/2 px-8">
                    <div className="bg-white p-6 rounded-lg shadow-sm">
                      <div className="text-2xl font-bold text-blue-600 mb-2">{milestone.year}</div>
                      <h3 className="font-semibold text-lg mb-2">{milestone.title}</h3>
                      <p className="text-gray-600">{milestone.description}</p>
                    </div>
                  </div>
                  <div className="w-4 h-4 bg-blue-600 rounded-full relative z-10"></div>
                  <div className="w-1/2"></div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 服务内容 */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold mb-8 text-center">服务内容</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {services.map((service, index) => (
              <div key={index} className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                <div className="text-4xl mb-4">{service.icon}</div>
                <h3 className="font-semibold text-lg mb-3">{service.title}</h3>
                <p className="text-gray-600">{service.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 组织架构 */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold mb-8 text-center">组织架构</h2>
          <div className="bg-white rounded-lg p-8 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-3xl mb-4">👑</div>
                <h3 className="font-semibold mb-2">理事会</h3>
                <p className="text-gray-600 text-sm">协会最高决策机构</p>
              </div>
              <div className="text-center">
                <div className="text-3xl mb-4">📋</div>
                <h3 className="font-semibold mb-2">秘书处</h3>
                <p className="text-gray-600 text-sm">日常事务管理机构</p>
              </div>
              <div className="text-center">
                <div className="text-3xl mb-4">🏛️</div>
                <h3 className="font-semibold mb-2">专业委员会</h3>
                <p className="text-gray-600 text-sm">专业领域工作机构</p>
              </div>
              <div className="text-center">
                <div className="text-3xl mb-4">👥</div>
                <h3 className="font-semibold mb-2">会员单位</h3>
                <p className="text-gray-600 text-sm">协会成员单位</p>
              </div>
            </div>
          </div>
        </div>

        {/* 联系方式 */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg p-8 text-center">
          <h2 className="text-2xl font-bold mb-6">联系我们</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div>
              <div className="text-lg font-semibold mb-2">地址</div>
              <p className="text-blue-100">广东省深圳市龙岗区中粮祥云2A2605</p>
            </div>
            <div>
              <div className="text-lg font-semibold mb-2">电话</div>
              <p className="text-blue-100">18128859099</p>
            </div>
            <div>
              <div className="text-lg font-semibold mb-2">邮箱</div>
              <p className="text-blue-100">info@szsyms.com</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="font-semibold mb-1">会员加入</div>
              <div>18128859099</div>
            </div>
            <div>
              <div className="font-semibold mb-1">商务洽谈</div>
              <div>18503020169</div>
            </div>
            <div>
              <div className="font-semibold mb-1">课程服务</div>
              <div>18923703302</div>
            </div>
            <div>
              <div className="font-semibold mb-1">培训服务</div>
              <div>18128859061</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}