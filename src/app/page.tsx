import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* 头部横幅 */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">深圳市商业美术设计促进会</h1>
            <p className="text-xl mb-6">融汇深圳设计、服务中国智造</p>
            <div className="flex justify-center space-x-8 text-lg">
              <span>服务热线：18128859099</span>
              <span>成立时间：2016年</span>
              <span>4A级协会</span>
            </div>
          </div>
        </div>
      </div>

      {/* 统计数据 */}
      <div className="bg-gray-50 py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-blue-600 mb-2">20万</div>
              <div className="text-gray-600">注册会员</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-blue-600 mb-2">15万</div>
              <div className="text-gray-600">人才库</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-blue-600 mb-2">1000+</div>
              <div className="text-gray-600">组织活动</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-blue-600 mb-2">300+</div>
              <div className="text-gray-600">项目实施</div>
            </div>
          </div>
        </div>
      </div>

      {/* 主要导航区域 */}
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* 协会资讯 */}
          <Link href="/news" className="group">
            <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
              <div className="text-blue-600 text-2xl mb-4">📰</div>
              <h3 className="text-xl font-semibold mb-2 group-hover:text-blue-600">协会资讯</h3>
              <p className="text-gray-600 text-sm">赛事动态、行业动态、最新资讯</p>
            </div>
          </Link>

          {/* 评价与培训 */}
          <Link href="/training" className="group">
            <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
              <div className="text-green-600 text-2xl mb-4">🎓</div>
              <h3 className="text-xl font-semibold mb-2 group-hover:text-green-600">评价与培训</h3>
              <p className="text-gray-600 text-sm">职业技能培训、资格认证</p>
            </div>
          </Link>

          {/* 会员风采 */}
          <Link href="/members" className="group">
            <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
              <div className="text-purple-600 text-2xl mb-4">👥</div>
              <h3 className="text-xl font-semibold mb-2 group-hover:text-purple-600">会员风采</h3>
              <p className="text-gray-600 text-sm">个人风采、企业风采展示</p>
            </div>
          </Link>

          {/* 专业委员会 */}
          <Link href="/committees" className="group">
            <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
              <div className="text-orange-600 text-2xl mb-4">🏛️</div>
              <h3 className="text-xl font-semibold mb-2 group-hover:text-orange-600">专业委员会</h3>
              <p className="text-gray-600 text-sm">各专业领域委员会</p>
            </div>
          </Link>

          {/* 设计人才库 */}
          <Link href="/talents" className="group">
            <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
              <div className="text-red-600 text-2xl mb-4">💼</div>
              <h3 className="text-xl font-semibold mb-2 group-hover:text-red-600">设计人才库</h3>
              <p className="text-gray-600 text-sm">优秀设计人才展示</p>
            </div>
          </Link>

          {/* 品牌推荐 */}
          <Link href="/brands" className="group">
            <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
              <div className="text-indigo-600 text-2xl mb-4">🏆</div>
              <h3 className="text-xl font-semibold mb-2 group-hover:text-indigo-600">品牌推荐</h3>
              <p className="text-gray-600 text-sm">优秀品牌展示推荐</p>
            </div>
          </Link>

          {/* 关于协会 */}
          <Link href="/about" className="group">
            <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
              <div className="text-teal-600 text-2xl mb-4">ℹ️</div>
              <h3 className="text-xl font-semibold mb-2 group-hover:text-teal-600">关于协会</h3>
              <p className="text-gray-600 text-sm">协会介绍、发展历程</p>
            </div>
          </Link>

          {/* 联系我们 */}
          <Link href="/contact" className="group">
            <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
              <div className="text-pink-600 text-2xl mb-4">📞</div>
              <h3 className="text-xl font-semibold mb-2 group-hover:text-pink-600">联系我们</h3>
              <p className="text-gray-600 text-sm">联系方式、地址信息</p>
            </div>
          </Link>
        </div>
      </div>

      {/* 最新资讯预览 */}
      <div className="bg-gray-50 py-12">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-bold">最新资讯</h2>
            <Link href="/news" className="text-blue-600 hover:underline">更多 &gt;</Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="text-sm text-gray-500 mb-2">2024-12-18</div>
              <h3 className="font-semibold mb-2">关于举办2025年广告设计师/室内装饰设计师职业技能等级认定考试的通知</h3>
              <p className="text-gray-600 text-sm">根据广东省职业技能服务指导中心关于印发《广东省社会培训评价组织职业技能等级认定...</p>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="text-sm text-gray-500 mb-2">2024-12-09</div>
              <h3 className="font-semibold mb-2">2024年全球产品包装设计市场规模达到67.5亿元</h3>
              <p className="text-gray-600 text-sm">产品包装设计是指针对产品外部包装进行的创意设计和功能性规划，旨在保护产品...</p>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="text-sm text-gray-500 mb-2">2024-12-09</div>
              <h3 className="font-semibold mb-2">全国工业设计职业技能大赛落幕</h3>
              <p className="text-gray-600 text-sm">近日，由人力资源和社会保障部、中华全国总工会、中国轻工业联合会共同主办的第四...</p>
            </div>
          </div>
        </div>
      </div>

      {/* 页脚 */}
      <footer className="bg-gray-800 text-white py-8">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h4 className="font-semibold mb-4">联系方式</h4>
              <p>会员加入: 18128859099</p>
              <p>商务洽谈: 18503020169</p>
              <p>课程服务: 18923703302</p>
              <p>培训服务: 18128859061</p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">地址</h4>
              <p>广东省深圳市龙岗区龙岗大道雅商综合楼402</p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">快速链接</h4>
              <ul className="space-y-2">
                <li><Link href="/about" className="hover:text-blue-300">关于协会</Link></li>
                <li><Link href="/news" className="hover:text-blue-300">协会资讯</Link></li>
                <li><Link href="/training" className="hover:text-blue-300">培训服务</Link></li>
                <li><Link href="/contact" className="hover:text-blue-300">联系我们</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">关注我们</h4>
              <p>公众号</p>
              <p>学习平台</p>
            </div>
          </div>
          <div className="border-t border-gray-700 mt-8 pt-8 text-center text-sm">
            <p>©2000-2024 深圳商业美术设计促进会版权所有 粤ICP备16047647号</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
