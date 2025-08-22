import Link from 'next/link'

export default function NewsPage() {
  const newsData = [
    {
      id: 1,
      title: "关于举办2025年广告设计师/室内装饰设计师职业技能等级认定考试的通知",
      category: "赛事动态",
      date: "2024-12-18",
      content: "根据广东省职业技能服务指导中心关于印发《广东省社会培训评价组织职业技能等级认定工作规程》的通知，我会将举办2025年广告设计师/室内装饰设计师职业技能等级认定考试...",
      image: "/api/placeholder/400/250"
    },
    {
      id: 2,
      title: "2024年全球产品包装设计市场规模达到67.5亿元",
      category: "行业动态",
      date: "2024-12-09",
      content: "产品包装设计是指针对产品外部包装进行的创意设计和功能性规划，旨在保护产品、提升品牌形象、增强消费者购买欲望。随着电商和物流行业的快速发展...",
      image: "/api/placeholder/400/250"
    },
    {
      id: 3,
      title: "全国工业设计职业技能大赛落幕",
      category: "赛事动态",
      date: "2024-12-09",
      content: "近日，由人力资源和社会保障部、中华全国总工会、中国轻工业联合会共同主办的第四届全国工业设计职业技能大赛在成都圆满落幕。本次大赛吸引了来自全国各地的优秀设计师参与...",
      image: "/api/placeholder/400/250"
    },
    {
      id: 4,
      title: "【晶报专访】深圳市商业美术设计促进会秘书长郑学华",
      category: "行业动态",
      date: "2024-12-18",
      content: "近日，我会执行会长兼秘书长郑学华接受深圳报业集团晶报社【城市英雄】栏目专访，郑学华执行会长以用设计点亮深圳的绿色未来为主题，分享了深圳设计行业的发展历程...",
      image: "/api/placeholder/400/250"
    },
    {
      id: 5,
      title: "关于举办2024年广东省广告设计师职业技能竞赛的通知",
      category: "赛事动态",
      date: "2024-03-28",
      content: "各有关单位、相关院校及行业从业者: 根据广东省人力资源和社会保障厅《关于做好2024年广东省行业企业职业技能竞赛工作的通知》(粤人社函(2024)XX号)文件精神...",
      image: "/api/placeholder/400/250"
    },
    {
      id: 6,
      title: "关于2024年广东省广告设计师职业技能竞赛的补充通知",
      category: "赛事动态",
      date: "2022-01-21",
      content: "受广东数码艺术研究会邀请及委托，我会将积极参与2024年广东省广告设计师职业技能竞赛的组织工作。本次竞赛旨在提升广告设计行业的整体水平...",
      image: "/api/placeholder/400/250"
    }
  ]

  const categories = ["全部", "赛事动态", "行业动态"]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 页面头部 */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center space-x-4 mb-6">
            <Link href="/" className="text-blue-600 hover:underline">首页</Link>
            <span>/</span>
            <span className="text-gray-600">协会资讯</span>
          </div>
          <h1 className="text-3xl font-bold mb-4">协会资讯</h1>
          <p className="text-gray-600">了解最新的赛事动态、行业资讯和协会活动</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* 分类筛选 */}
        <div className="mb-8">
          <div className="flex space-x-4">
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

        {/* 资讯列表 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {newsData.map((news) => (
            <div key={news.id} className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow">
              <div className="h-48 bg-gray-200 relative">
                <div className="absolute top-4 left-4">
                  <span className="px-3 py-1 text-xs font-semibold text-white bg-blue-600 rounded-full">
                    {news.category}
                  </span>
                </div>
              </div>
              <div className="p-6">
                <div className="text-sm text-gray-500 mb-2">{news.date}</div>
                <h3 className="font-semibold text-lg mb-3 line-clamp-2">{news.title}</h3>
                <p className="text-gray-600 text-sm mb-4 line-clamp-3">{news.content}</p>
                <Link 
                  href={`/news/${news.id}`}
                  className="text-blue-600 hover:underline text-sm font-medium"
                >
                  阅读更多 →
                </Link>
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
      </div>
    </div>
  )
} 