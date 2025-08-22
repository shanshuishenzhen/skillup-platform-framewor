import Link from 'next/link'

export default function CommitteesPage() {
  const committees = [
    {
      id: 1,
      name: "包装设计专业委员会",
      description: "专注于包装设计领域的专业发展，推动包装设计行业的标准化和创新发展。",
      members: 156,
      activities: ["包装设计大赛", "行业标准制定", "技术交流会议"],
      image: "/api/placeholder/300/200"
    },
    {
      id: 2,
      name: "原创设计专业委员会",
      description: "致力于原创设计的保护和发展，推动设计行业的创新能力和知识产权保护。",
      members: 203,
      activities: ["原创设计展览", "知识产权培训", "设计创新论坛"],
      image: "/api/placeholder/300/200"
    },
    {
      id: 3,
      name: "品牌营销专业委员会",
      description: "专注于品牌营销策略研究，为企业提供专业的品牌建设和营销推广服务。",
      members: 189,
      activities: ["品牌营销峰会", "案例分享会", "营销策略培训"],
      image: "/api/placeholder/300/200"
    },
    {
      id: 4,
      name: "商业摄影专业委员会",
      description: "推动商业摄影行业的发展，提升摄影师的职业技能和行业标准。",
      members: 134,
      activities: ["摄影作品展览", "技术培训课程", "行业交流活动"],
      image: "/api/placeholder/300/200"
    },
    {
      id: 5,
      name: "室内装饰设计专业委员会",
      description: "专注于室内装饰设计领域，推动设计理念的创新和行业标准的提升。",
      members: 245,
      activities: ["设计作品展示", "材料应用研究", "设计趋势发布"],
      image: "/api/placeholder/300/200"
    },
    {
      id: 6,
      name: "广告设计专业委员会",
      description: "致力于广告设计行业的发展，推动创意设计和广告传播的创新。",
      members: 312,
      activities: ["广告创意大赛", "设计作品评选", "行业技术交流"],
      image: "/api/placeholder/300/200"
    },
    {
      id: 7,
      name: "形象设计专业委员会",
      description: "专注于个人和企业形象设计，推动形象设计行业的专业化和标准化。",
      members: 167,
      activities: ["形象设计大赛", "专业培训课程", "行业标准制定"],
      image: "/api/placeholder/300/200"
    },
    {
      id: 8,
      name: "文创产业专业委员会",
      description: "推动文化创意产业的发展，促进传统文化与现代设计的融合创新。",
      members: 198,
      activities: ["文创产品展览", "文化创意论坛", "产业合作对接"],
      image: "/api/placeholder/300/200"
    },
    {
      id: 9,
      name: "美容师专业委员会",
      description: "专注于美容行业的专业发展，提升美容师的专业技能和服务水平。",
      members: 145,
      activities: ["技能培训课程", "行业标准制定", "专业认证考试"],
      image: "/api/placeholder/300/200"
    },
    {
      id: 10,
      name: "智氧生活专业委员会",
      description: "致力于智能生活产品的设计研发，推动科技与生活的融合创新。",
      members: 123,
      activities: ["智能产品展示", "技术研讨会", "创新设计大赛"],
      image: "/api/placeholder/300/200"
    },
    {
      id: 11,
      name: "艺术创意专业委员会",
      description: "推动艺术创意领域的发展，促进艺术与商业的有机结合。",
      members: 178,
      activities: ["艺术作品展览", "创意设计大赛", "艺术交流活动"],
      image: "/api/placeholder/300/200"
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
            <span className="text-gray-600">专业委员会</span>
          </div>
          <h1 className="text-3xl font-bold mb-4">专业委员会</h1>
          <p className="text-gray-600">各专业领域委员会，推动行业专业化发展</p>
        </div>
      </div>

      {/* 委员会介绍 */}
      <div className="bg-blue-600 text-white py-12">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold mb-4">专业委员会介绍</h2>
          <p className="text-blue-100 max-w-3xl mx-auto">
            深圳市商业美术设计促进会下设11个专业委员会，涵盖包装设计、广告设计、室内装饰设计等多个专业领域。
            各专业委员会致力于推动本领域的专业化发展，制定行业标准，组织专业活动，促进技术交流与合作。
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        {/* 委员会列表 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {committees.map((committee) => (
            <div key={committee.id} className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-lg transition-shadow">
              <div className="h-48 bg-gray-200 relative">
                <div className="absolute top-4 right-4">
                  <span className="px-3 py-1 text-xs font-semibold text-white bg-blue-600 rounded-full">
                    {committee.members} 位成员
                  </span>
                </div>
              </div>
              <div className="p-6">
                <h3 className="font-semibold text-xl mb-3">{committee.name}</h3>
                <p className="text-gray-600 text-sm mb-4 line-clamp-3">{committee.description}</p>
                
                <div className="mb-6">
                  <h4 className="font-semibold text-sm mb-2">主要活动：</h4>
                  <div className="space-y-1">
                    {committee.activities.map((activity, index) => (
                      <div key={index} className="text-xs text-gray-500 flex items-center">
                        <span className="w-1 h-1 bg-blue-600 rounded-full mr-2"></span>
                        {activity}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex space-x-3">
                  <button className="flex-1 bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors">
                    申请加入
                  </button>
                  <Link 
                    href={`/committees/${committee.id}`}
                    className="flex-1 border border-blue-600 text-blue-600 py-2 px-4 rounded hover:bg-blue-50 transition-colors text-center"
                  >
                    查看详情
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 委员会优势 */}
        <div className="mt-16 bg-white rounded-lg p-8 shadow-sm">
          <h2 className="text-2xl font-bold mb-8 text-center">专业委员会优势</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-4xl mb-4">🎯</div>
              <h3 className="font-semibold mb-2">专业聚焦</h3>
              <p className="text-gray-600 text-sm">专注于特定领域，提供深度专业服务</p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-4">🤝</div>
              <h3 className="font-semibold mb-2">行业交流</h3>
              <p className="text-gray-600 text-sm">促进同行交流，分享行业经验</p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-4">📚</div>
              <h3 className="font-semibold mb-2">知识分享</h3>
              <p className="text-gray-600 text-sm">组织培训活动，提升专业技能</p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-4">🏆</div>
              <h3 className="font-semibold mb-2">标准制定</h3>
              <p className="text-gray-600 text-sm">参与行业标准制定，推动规范化发展</p>
            </div>
          </div>
        </div>

        {/* 加入委员会 */}
        <div className="mt-12 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">加入专业委员会</h2>
          <p className="mb-6">成为专业委员会成员，享受专业服务，参与行业活动，提升专业技能</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div>
              <div className="text-lg font-semibold mb-2">专业发展</div>
              <p className="text-blue-100 text-sm">参与专业培训，提升技能水平</p>
            </div>
            <div>
              <div className="text-lg font-semibold mb-2">行业交流</div>
              <p className="text-blue-100 text-sm">与同行交流，分享经验心得</p>
            </div>
            <div>
              <div className="text-lg font-semibold mb-2">资源对接</div>
              <p className="text-blue-100 text-sm">获取行业资源，拓展业务机会</p>
            </div>
          </div>
          <div className="text-2xl font-bold">咨询热线：18128859099</div>
        </div>
      </div>
    </div>
  )
} 