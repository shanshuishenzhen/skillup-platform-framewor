import Link from 'next/link'

export default function MembersPage() {
  const personalMembers = [
    {
      id: 1,
      name: "陈建军",
      title: "深圳大学艺术设计学院二级教授",
      description: "享受国务院政府特殊津贴专家，国务院学位办硕士学位授权评议专家，国家社科基金艺术学通讯评委、中国美术家协会会员。",
      image: "/api/placeholder/200/200",
      achievements: ["享受国务院政府特殊津贴", "国家社科基金艺术学通讯评委", "中国美术家协会会员"]
    },
    {
      id: 2,
      name: "李红兵",
      title: "深圳市乙正形象设计有限公司董事长",
      description: "深圳市设计联合会名誉主席，在形象设计领域有着丰富的经验和深厚的造诣。",
      image: "/api/placeholder/200/200",
      achievements: ["深圳市设计联合会名誉主席", "形象设计领域专家", "资深设计师"]
    },
    {
      id: 3,
      name: "冯家敏",
      title: "中国设计之窗总编",
      description: "深圳市创意设计知识产权促进会会长，中国工艺美术学会会员，资深设计师。出版《引爆设计灵感》、《中国平面设计师必备手册》等著作。",
      image: "/api/placeholder/200/200",
      achievements: ["深圳市创意设计知识产权促进会会长", "中国工艺美术学会会员", "多部设计著作作者"]
    },
    {
      id: 4,
      name: "黄炯青",
      title: "资深设计师",
      description: "深圳设计界和中国CI界的先行者，曾被国家文化部授予中国十大杰出设计师，在海内外二十余种刊物发表作品及论文两百余幅（件）。",
      image: "/api/placeholder/200/200",
      achievements: ["中国十大杰出设计师", "深圳设计界先行者", "发表作品论文两百余幅"]
    }
  ]

  const enterpriseMembers = [
    {
      id: 1,
      name: "深圳德信美印刷有限公司",
      industry: "印刷行业",
      description: "主要从事画册、图书期刊、海报、年历等印刷，具备出版物印刷资格，多年来赢得了很高的知名度和美誉度，特别是在出版、摄影、设计等行业赢得了广泛认可。",
      image: "/api/placeholder/300/200",
      features: ["出版物印刷资格", "专业印刷服务", "高品质产品"]
    },
    {
      id: 2,
      name: "深圳力嘉创意文化产业园",
      industry: "文化创意",
      description: "力嘉创意文化产业园是由力嘉国际集团独资创办的。力嘉国际集团，是一家以生产优质纸制产品、彩印产品为主要业务的国际性集团公司，至今已有50多年历史。",
      image: "/api/placeholder/300/200",
      features: ["50多年历史", "国际性集团公司", "创意文化产业园"]
    },
    {
      id: 3,
      name: "深圳市上员企业策划有限公司",
      industry: "品牌策划",
      description: "上员广告是一个集品牌策划、品牌创意、品牌设计、品牌营销、品牌互动、品牌推广、品牌传播于一体的品牌创新机构，总部位于深圳。",
      image: "/api/placeholder/300/200",
      features: ["品牌创新机构", "全链条服务", "专业策划团队"]
    },
    {
      id: 4,
      name: "深圳市浪尖有限公司",
      industry: "工业设计",
      description: "浪尖，全产业链设计创新服务领导者，中国国家级高新技术企业平台，中国国家中小企业公共服务示范平台，中国工业设计十佳设计服务机构。",
      image: "/api/placeholder/300/200",
      features: ["国家级高新技术企业", "全产业链设计服务", "十佳设计服务机构"]
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
            <span className="text-gray-600">会员风采</span>
          </div>
          <h1 className="text-3xl font-bold mb-4">会员风采</h1>
          <p className="text-gray-600">展示优秀会员的个人风采和企业风采</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        {/* 分类标签 */}
        <div className="flex justify-center mb-12">
          <div className="flex space-x-4 bg-white rounded-lg p-2 shadow-sm">
            <button className="px-6 py-2 bg-blue-600 text-white rounded-md">个人风采</button>
            <button className="px-6 py-2 text-gray-600 hover:bg-gray-100 rounded-md">企业风采</button>
          </div>
        </div>

        {/* 个人风采 */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold mb-8 text-center">个人风采</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {personalMembers.map((member) => (
              <div key={member.id} className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-lg transition-shadow">
                <div className="h-48 bg-gray-200 relative">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-24 h-24 bg-gray-300 rounded-full"></div>
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="font-semibold text-lg mb-2">{member.name}</h3>
                  <p className="text-blue-600 text-sm mb-3">{member.title}</p>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-3">{member.description}</p>
                  
                  <div className="mb-4">
                    <h4 className="font-semibold text-sm mb-2">主要成就：</h4>
                    <div className="space-y-1">
                      {member.achievements.map((achievement, index) => (
                        <div key={index} className="text-xs text-gray-500 flex items-center">
                          <span className="w-1 h-1 bg-blue-600 rounded-full mr-2"></span>
                          {achievement}
                        </div>
                      ))}
                    </div>
                  </div>

                  <Link 
                    href={`/members/personal/${member.id}`}
                    className="text-blue-600 hover:underline text-sm font-medium"
                  >
                    查看详情 →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 企业风采 */}
        <div>
          <h2 className="text-2xl font-bold mb-8 text-center">企业风采</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {enterpriseMembers.map((enterprise) => (
              <div key={enterprise.id} className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-lg transition-shadow">
                <div className="h-48 bg-gray-200 relative">
                  <div className="absolute top-4 left-4">
                    <span className="px-3 py-1 text-xs font-semibold text-white bg-green-600 rounded-full">
                      {enterprise.industry}
                    </span>
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="font-semibold text-xl mb-3">{enterprise.name}</h3>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-3">{enterprise.description}</p>
                  
                  <div className="mb-6">
                    <h4 className="font-semibold text-sm mb-2">企业特色：</h4>
                    <div className="flex flex-wrap gap-2">
                      {enterprise.features.map((feature, index) => (
                        <span 
                          key={index}
                          className="px-3 py-1 text-xs bg-blue-50 text-blue-600 rounded-full"
                        >
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>

                  <Link 
                    href={`/members/enterprise/${enterprise.id}`}
                    className="text-blue-600 hover:underline text-sm font-medium"
                  >
                    查看详情 →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 会员加入 */}
        <div className="mt-16 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">加入我们</h2>
          <p className="mb-6">成为深圳市商业美术设计促进会会员，享受更多专业服务和发展机会</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div>
              <div className="text-3xl mb-2">🤝</div>
              <h3 className="font-semibold mb-2">资源共享</h3>
              <p className="text-blue-100 text-sm">共享行业资源，拓展业务渠道</p>
            </div>
            <div>
              <div className="text-3xl mb-2">📈</div>
              <h3 className="font-semibold mb-2">专业发展</h3>
              <p className="text-blue-100 text-sm">参与专业培训，提升技能水平</p>
            </div>
            <div>
              <div className="text-3xl mb-2">🌟</div>
              <h3 className="font-semibold mb-2">品牌推广</h3>
              <p className="text-blue-100 text-sm">展示企业形象，提升品牌影响力</p>
            </div>
          </div>
          <div className="text-2xl font-bold">会员加入热线：18128859099</div>
        </div>
      </div>
    </div>
  )
} 