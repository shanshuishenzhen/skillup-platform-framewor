import Link from 'next/link'

export default function TalentsPage() {
  const talents = [
    {
      id: 1,
      name: "张明",
      title: "资深UI设计师",
      experience: "8年",
      skills: ["UI设计", "用户体验", "产品设计", "Figma"],
      description: "专注于移动应用和Web产品的UI设计，曾参与多个知名产品的设计工作，对用户体验设计有深入研究。",
      projects: ["微信小程序设计", "电商平台UI设计", "企业管理系统设计"],
      image: "/api/placeholder/200/200"
    },
    {
      id: 2,
      name: "李华",
      title: "包装设计专家",
      experience: "12年",
      skills: ["包装设计", "品牌设计", "印刷工艺", "Adobe Creative Suite"],
      description: "在包装设计领域有着丰富的经验，擅长食品、化妆品、电子产品等各类产品的包装设计。",
      projects: ["某知名化妆品品牌包装", "食品包装设计", "礼品包装设计"],
      image: "/api/placeholder/200/200"
    },
    {
      id: 3,
      name: "王芳",
      title: "室内设计师",
      experience: "10年",
      skills: ["室内设计", "空间规划", "材料应用", "AutoCAD"],
      description: "专注于商业空间和住宅设计，对空间布局和材料应用有独到见解，作品多次获得行业奖项。",
      projects: ["商业空间设计", "住宅装修设计", "办公空间设计"],
      image: "/api/placeholder/200/200"
    },
    {
      id: 4,
      name: "陈强",
      title: "广告创意总监",
      experience: "15年",
      skills: ["广告创意", "品牌策划", "营销策略", "创意设计"],
      description: "在广告创意领域有着丰富的经验，曾为多个知名品牌提供创意服务，作品多次获得国际奖项。",
      projects: ["品牌广告策划", "营销活动设计", "创意视频制作"],
      image: "/api/placeholder/200/200"
    },
    {
      id: 5,
      name: "刘敏",
      title: "工业设计师",
      experience: "9年",
      skills: ["产品设计", "3D建模", "原型制作", "Rhino"],
      description: "专注于消费电子和家居产品的工业设计，注重产品的功能性和美观性的平衡。",
      projects: ["智能家居产品设计", "消费电子产品设计", "家具设计"],
      image: "/api/placeholder/200/200"
    },
    {
      id: 6,
      name: "赵伟",
      title: "平面设计师",
      experience: "7年",
      skills: ["平面设计", "品牌设计", "插画设计", "Photoshop"],
      description: "擅长品牌视觉设计和插画创作，作品风格独特，深受客户喜爱。",
      projects: ["企业品牌设计", "插画创作", "海报设计"],
      image: "/api/placeholder/200/200"
    },
    {
      id: 7,
      name: "孙丽",
      title: "形象设计师",
      experience: "6年",
      skills: ["形象设计", "色彩搭配", "造型设计", "时尚搭配"],
      description: "专注于个人和企业形象设计，帮助客户打造独特的个人魅力和品牌形象。",
      projects: ["个人形象设计", "企业形象策划", "时尚造型设计"],
      image: "/api/placeholder/200/200"
    },
    {
      id: 8,
      name: "周杰",
      title: "摄影总监",
      experience: "11年",
      skills: ["商业摄影", "产品摄影", "人像摄影", "后期处理"],
      description: "在商业摄影领域有着丰富的经验，擅长产品摄影和人像摄影，作品多次在专业杂志发表。",
      projects: ["产品摄影", "商业人像摄影", "广告摄影"],
      image: "/api/placeholder/200/200"
    }
  ]

  const categories = ["全部", "UI设计", "包装设计", "室内设计", "广告创意", "工业设计", "平面设计", "形象设计", "摄影"]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 页面头部 */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center space-x-4 mb-6">
            <Link href="/" className="text-blue-600 hover:underline">首页</Link>
            <span>/</span>
            <span className="text-gray-600">设计人才库</span>
          </div>
          <h1 className="text-3xl font-bold mb-4">设计人才库</h1>
          <p className="text-gray-600">汇聚优秀设计人才，为企业和项目提供专业服务</p>
        </div>
      </div>

      {/* 人才库介绍 */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-12">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold mb-4">设计人才库</h2>
          <p className="text-blue-100 max-w-3xl mx-auto">
            深圳市商业美术设计促进会设计人才库汇聚了来自各个设计领域的优秀人才，
            包括UI设计师、包装设计师、室内设计师、广告创意总监等。我们致力于为企业和项目提供最专业的设计服务。
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8">
            <div>
              <div className="text-3xl mb-2">👥</div>
              <h3 className="font-semibold mb-2">专业人才</h3>
              <p className="text-blue-100">汇聚各领域专业设计人才</p>
            </div>
            <div>
              <div className="text-3xl mb-2">🎯</div>
              <h3 className="font-semibold mb-2">精准匹配</h3>
              <p className="text-blue-100">根据项目需求精准匹配人才</p>
            </div>
            <div>
              <div className="text-3xl mb-2">💼</div>
              <h3 className="font-semibold mb-2">项目合作</h3>
              <p className="text-blue-100">提供灵活的项目合作模式</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        {/* 分类筛选 */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-4">
            {categories.map((category) => (
              <button
                key={category}
                className="px-6 py-2 rounded-full border border-gray-300 hover:bg-blue-600 hover:text-white transition-colors"
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* 人才列表 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {talents.map((talent) => (
            <div key={talent.id} className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-lg transition-shadow">
              <div className="h-48 bg-gray-200 relative">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-24 h-24 bg-gray-300 rounded-full"></div>
                </div>
                <div className="absolute top-4 right-4">
                  <span className="px-3 py-1 text-xs font-semibold text-white bg-green-600 rounded-full">
                    {talent.experience}经验
                  </span>
                </div>
              </div>
              <div className="p-6">
                <h3 className="font-semibold text-lg mb-2">{talent.name}</h3>
                <p className="text-blue-600 text-sm mb-3">{talent.title}</p>
                <p className="text-gray-600 text-sm mb-4 line-clamp-3">{talent.description}</p>
                
                <div className="mb-4">
                  <h4 className="font-semibold text-sm mb-2">专业技能：</h4>
                  <div className="flex flex-wrap gap-2">
                    {talent.skills.map((skill, index) => (
                      <span 
                        key={index}
                        className="px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mb-6">
                  <h4 className="font-semibold text-sm mb-2">代表项目：</h4>
                  <div className="space-y-1">
                    {talent.projects.map((project, index) => (
                      <div key={index} className="text-xs text-gray-500 flex items-center">
                        <span className="w-1 h-1 bg-blue-600 rounded-full mr-2"></span>
                        {project}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex space-x-3">
                  <button className="flex-1 bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors">
                    联系合作
                  </button>
                  <Link 
                    href={`/talents/${talent.id}`}
                    className="flex-1 border border-blue-600 text-blue-600 py-2 px-4 rounded hover:bg-blue-50 transition-colors text-center"
                  >
                    查看详情
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 分页 */}
        <div className="mt-12 flex justify-center">
          <div className="flex space-x-2">
            <button className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50">上一页</button>
            <button className="px-4 py-2 bg-blue-600 text-white rounded">1</button>
            <button className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50">2</button>
            <button className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50">3</button>
            <button className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50">下一页</button>
          </div>
        </div>

        {/* 人才服务 */}
        <div className="mt-16 bg-white rounded-lg p-8 shadow-sm">
          <h2 className="text-2xl font-bold mb-8 text-center">人才服务</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-4xl mb-4">🔍</div>
              <h3 className="font-semibold mb-2">人才筛选</h3>
              <p className="text-gray-600 text-sm">严格筛选，确保人才质量</p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-4">🤝</div>
              <h3 className="font-semibold mb-2">项目对接</h3>
              <p className="text-gray-600 text-sm">精准匹配项目需求</p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-4">📋</div>
              <h3 className="font-semibold mb-2">合同管理</h3>
              <p className="text-gray-600 text-sm">规范合同，保障双方权益</p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-4">⭐</div>
              <h3 className="font-semibold mb-2">质量监督</h3>
              <p className="text-gray-600 text-sm">全程监督，确保项目质量</p>
            </div>
          </div>
        </div>

        {/* 联系我们 */}
        <div className="mt-12 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">寻找设计人才？</h2>
          <p className="mb-6">我们拥有丰富的设计人才资源，可以为您提供最专业的设计服务</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
              <div className="text-lg font-semibold mb-2">人才咨询</div>
              <div className="text-2xl font-bold">18128859099</div>
            </div>
            <div>
              <div className="text-lg font-semibold mb-2">项目合作</div>
              <div className="text-2xl font-bold">18503020169</div>
            </div>
          </div>
          <button className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
            立即咨询
          </button>
        </div>
      </div>
    </div>
  )
} 