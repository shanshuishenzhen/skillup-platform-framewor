import Link from 'next/link'

export default function BrandsPage() {
  const brands = [
    {
      id: 1,
      name: "华为",
      industry: "科技",
      description: "华为是全球领先的ICT（信息与通信）基础设施和智能终端提供商，致力于把数字世界带入每个人、每个家庭、每个组织，构建万物互联的智能世界。",
      logo: "/api/placeholder/150/150",
      features: ["5G技术领先", "智能终端", "企业服务", "全球布局"],
      awards: ["世界500强企业", "全球最具价值品牌", "技术创新奖"]
    },
    {
      id: 2,
      name: "腾讯",
      industry: "互联网",
      description: "腾讯是一家以互联网为基础的科技与文化公司，通过技术丰富互联网用户的生活，助力企业数字化升级。",
      logo: "/api/placeholder/150/150",
      features: ["社交平台", "游戏娱乐", "云计算", "人工智能"],
      awards: ["中国互联网企业", "全球游戏公司", "科技创新奖"]
    },
    {
      id: 3,
      name: "比亚迪",
      industry: "汽车",
      description: "比亚迪是一家致力于\"用技术创新，满足人们对美好生活的向往\"的高新技术企业，业务横跨汽车、轨道交通、新能源和电子四大产业。",
      logo: "/api/placeholder/150/150",
      features: ["新能源汽车", "电池技术", "轨道交通", "电子制造"],
      awards: ["全球新能源汽车", "电池技术领先", "绿色创新奖"]
    },
    {
      id: 4,
      name: "大疆",
      industry: "无人机",
      description: "大疆创新是全球领先的无人飞行器控制系统及无人机解决方案的研发和生产商，客户遍布全球100多个国家。",
      logo: "/api/placeholder/150/150",
      features: ["无人机技术", "影像系统", "机器人技术", "教育科技"],
      awards: ["全球无人机", "技术创新", "设计大奖"]
    },
    {
      id: 5,
      name: "OPPO",
      industry: "手机",
      description: "OPPO是一家专注于智能终端产品、软件和互联网服务的科技公司，致力于为用户提供极致的产品体验。",
      logo: "/api/placeholder/150/150",
      features: ["智能手机", "影像技术", "快充技术", "IoT生态"],
      awards: ["全球手机品牌", "影像技术", "设计创新奖"]
    },
    {
      id: 6,
      name: "vivo",
      industry: "手机",
      description: "vivo是一家专注于智能终端和智慧服务的科技公司，致力于为用户提供极致的产品体验和优质的服务。",
      logo: "/api/placeholder/150/150",
      features: ["智能手机", "影像系统", "快充技术", "AI技术"],
      awards: ["全球手机品牌", "影像技术", "用户体验奖"]
    },
    {
      id: 7,
      name: "美的",
      industry: "家电",
      description: "美的集团是一家集消费电器、暖通空调、机器人与自动化系统、智能供应链、芯片产业、电梯产业的科技集团。",
      logo: "/api/placeholder/150/150",
      features: ["智能家电", "工业机器人", "暖通空调", "智能制造"],
      awards: ["全球家电品牌", "智能制造", "技术创新奖"]
    },
    {
      id: 8,
      name: "格力",
      industry: "家电",
      description: "格力电器是一家集研发、生产、销售、服务于一体的国际化家电企业，拥有格力、TOSOT、晶弘三大品牌。",
      logo: "/api/placeholder/150/150",
      features: ["空调技术", "智能家电", "工业装备", "新能源"],
      awards: ["全球空调品牌", "技术创新", "质量标杆奖"]
    }
  ]

  const industries = ["全部", "科技", "互联网", "汽车", "无人机", "手机", "家电", "其他"]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 页面头部 */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center space-x-4 mb-6">
            <Link href="/" className="text-blue-600 hover:underline">首页</Link>
            <span>/</span>
            <span className="text-gray-600">品牌推荐</span>
          </div>
          <h1 className="text-3xl font-bold mb-4">品牌推荐</h1>
          <p className="text-gray-600">推荐优秀品牌，展示深圳设计力量</p>
        </div>
      </div>

      {/* 品牌推荐介绍 */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-12">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold mb-4">品牌推荐</h2>
          <p className="text-blue-100 max-w-3xl mx-auto">
            深圳市商业美术设计促进会品牌推荐栏目致力于展示深圳优秀品牌，
            推广深圳设计力量，促进品牌与设计的深度融合，推动深圳品牌走向世界。
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8">
            <div>
              <div className="text-3xl mb-2">🏆</div>
              <h3 className="font-semibold mb-2">优秀品牌</h3>
              <p className="text-blue-100">精选深圳优秀品牌展示</p>
            </div>
            <div>
              <div className="text-3xl mb-2">🎨</div>
              <h3 className="font-semibold mb-2">设计力量</h3>
              <p className="text-blue-100">展示深圳设计创新能力</p>
            </div>
            <div>
              <div className="text-3xl mb-2">🌍</div>
              <h3 className="font-semibold mb-2">全球视野</h3>
              <p className="text-blue-100">推动深圳品牌走向世界</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        {/* 行业筛选 */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-4">
            {industries.map((industry) => (
              <button
                key={industry}
                className="px-6 py-2 rounded-full border border-gray-300 hover:bg-blue-600 hover:text-white transition-colors"
              >
                {industry}
              </button>
            ))}
          </div>
        </div>

        {/* 品牌列表 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {brands.map((brand) => (
            <div key={brand.id} className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-lg transition-shadow">
              <div className="h-48 bg-gray-200 relative flex items-center justify-center">
                <div className="w-32 h-32 bg-gray-300 rounded-lg"></div>
                <div className="absolute top-4 right-4">
                  <span className="px-3 py-1 text-xs font-semibold text-white bg-blue-600 rounded-full">
                    {brand.industry}
                  </span>
                </div>
              </div>
              <div className="p-6">
                <h3 className="font-semibold text-xl mb-3">{brand.name}</h3>
                <p className="text-gray-600 text-sm mb-4 line-clamp-3">{brand.description}</p>
                
                <div className="mb-4">
                  <h4 className="font-semibold text-sm mb-2">核心优势：</h4>
                  <div className="flex flex-wrap gap-2">
                    {brand.features.map((feature, index) => (
                      <span 
                        key={index}
                        className="px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded"
                      >
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mb-6">
                  <h4 className="font-semibold text-sm mb-2">主要荣誉：</h4>
                  <div className="space-y-1">
                    {brand.awards.map((award, index) => (
                      <div key={index} className="text-xs text-gray-500 flex items-center">
                        <span className="w-1 h-1 bg-yellow-500 rounded-full mr-2"></span>
                        {award}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex space-x-3">
                  <button className="flex-1 bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors">
                    了解更多
                  </button>
                  <Link 
                    href={`/brands/${brand.id}`}
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

        {/* 品牌服务 */}
        <div className="mt-16 bg-white rounded-lg p-8 shadow-sm">
          <h2 className="text-2xl font-bold mb-8 text-center">品牌服务</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-4xl mb-4">🎯</div>
              <h3 className="font-semibold mb-2">品牌策划</h3>
              <p className="text-gray-600 text-sm">专业的品牌策划服务</p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-4">🎨</div>
              <h3 className="font-semibold mb-2">视觉设计</h3>
              <p className="text-gray-600 text-sm">品牌视觉形象设计</p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-4">📢</div>
              <h3 className="font-semibold mb-2">品牌推广</h3>
              <p className="text-gray-600 text-sm">多渠道品牌推广服务</p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-4">🤝</div>
              <h3 className="font-semibold mb-2">合作对接</h3>
              <p className="text-gray-600 text-sm">品牌合作资源对接</p>
            </div>
          </div>
        </div>

        {/* 申请推荐 */}
        <div className="mt-12 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">申请品牌推荐</h2>
          <p className="mb-6">如果您希望您的品牌出现在我们的推荐列表中，请联系我们</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
              <div className="text-lg font-semibold mb-2">品牌咨询</div>
              <div className="text-2xl font-bold">18503020169</div>
            </div>
            <div>
              <div className="text-lg font-semibold mb-2">商务洽谈</div>
              <div className="text-2xl font-bold">18128859099</div>
            </div>
          </div>
          <button className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
            立即申请
          </button>
        </div>
      </div>
    </div>
  )
}