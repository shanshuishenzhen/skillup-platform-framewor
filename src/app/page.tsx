'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { aiDataGeneratorService, VirtualNews } from '@/services/aiDataGeneratorService'

export default function HomePage() {
  const [news, setNews] = useState<VirtualNews[]>([])
  const [stats, setStats] = useState({
    members: '20万',
    talents: '15万', 
    events: '1000+',
    projects: '300+'
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadVirtualData = async () => {
      try {
        setLoading(true)
        // 生成新闻数据
        const virtualNews = await aiDataGeneratorService.generateNews(3)
        setNews(virtualNews)
        
        // 生成统计数据
        const virtualStats = {
          members: `${Math.floor(Math.random() * 50 + 10)}万`,
          talents: `${Math.floor(Math.random() * 30 + 5)}万`,
          events: `${Math.floor(Math.random() * 2000 + 500)}+`,
          projects: `${Math.floor(Math.random() * 800 + 200)}+`
        }
        setStats(virtualStats)
      } catch (error) {
        console.error('加载数据失败:', error)
      } finally {
        setLoading(false)
      }
    }

    loadVirtualData()
  }, [])

  const refreshData = async () => {
    aiDataGeneratorService.clearCache()
    const virtualNews = await aiDataGeneratorService.generateNews(3)
    setNews(virtualNews)
    
    const virtualStats = {
      members: `${Math.floor(Math.random() * 50 + 10)}万`,
      talents: `${Math.floor(Math.random() * 30 + 5)}万`, 
      events: `${Math.floor(Math.random() * 2000 + 500)}+`,
      projects: `${Math.floor(Math.random() * 800 + 200)}+`
    }
    setStats(virtualStats)
  }
  return (
    <div className="min-h-screen bg-white">
      {/* 头部横幅 */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">创新技能发展促进会</h1>
            <p className="text-xl mb-6">推动技能创新，服务人才发展</p>
            <div className="flex justify-center space-x-8 text-lg">
              <span>服务热线：400-888-9999</span>
              <span>成立时间：2018年</span>
              <span>国家级协会</span>
            </div>
            <button 
              onClick={refreshData}
              className="mt-4 px-4 py-2 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30 transition-all"
            >
              🔄 刷新数据
            </button>
          </div>
        </div>
      </div>

      {/* 统计数据 */}
      <div className="bg-gray-50 py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-blue-600 mb-2">{stats.members}</div>
              <div className="text-gray-600">注册会员</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-blue-600 mb-2">{stats.talents}</div>
              <div className="text-gray-600">人才库</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-blue-600 mb-2">{stats.events}</div>
              <div className="text-gray-600">组织活动</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-blue-600 mb-2">{stats.projects}</div>
              <div className="text-gray-600">项目实施</div>
            </div>
          </div>
        </div>
      </div>

      {/* 主要导航区域 */}
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* 行业资讯 */}
          <Link href="/news" className="group">
            <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
              <div className="text-blue-600 text-2xl mb-4">📰</div>
              <h3 className="text-xl font-semibold mb-2 group-hover:text-blue-600">行业资讯</h3>
              <p className="text-gray-600 text-sm">技术动态、行业趋势、最新资讯</p>
            </div>
          </Link>

          {/* 技能培训 */}
          <Link href="/training" className="group">
            <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
              <div className="text-green-600 text-2xl mb-4">🎓</div>
              <h3 className="text-xl font-semibold mb-2 group-hover:text-green-600">技能培训</h3>
              <p className="text-gray-600 text-sm">专业技能培训、认证考试</p>
            </div>
          </Link>

          {/* 会员中心 */}
          <Link href="/members" className="group">
            <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
              <div className="text-purple-600 text-2xl mb-4">👥</div>
              <h3 className="text-xl font-semibold mb-2 group-hover:text-purple-600">会员中心</h3>
              <p className="text-gray-600 text-sm">会员服务、优秀会员展示</p>
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

          {/* 人才服务 */}
          <Link href="/talents" className="group">
            <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
              <div className="text-red-600 text-2xl mb-4">💼</div>
              <h3 className="text-xl font-semibold mb-2 group-hover:text-red-600">人才服务</h3>
              <p className="text-gray-600 text-sm">人才推荐、职业发展</p>
            </div>
          </Link>

          {/* 合作伙伴 */}
          <Link href="/brands" className="group">
            <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
              <div className="text-indigo-600 text-2xl mb-4">🏆</div>
              <h3 className="text-xl font-semibold mb-2 group-hover:text-indigo-600">合作伙伴</h3>
              <p className="text-gray-600 text-sm">优秀企业合作展示</p>
            </div>
          </Link>

          {/* 关于我们 */}
          <Link href="/about" className="group">
            <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
              <div className="text-teal-600 text-2xl mb-4">ℹ️</div>
              <h3 className="text-xl font-semibold mb-2 group-hover:text-teal-600">关于我们</h3>
              <p className="text-gray-600 text-sm">组织介绍、发展历程</p>
            </div>
          </Link>

          {/* 联系我们 */}
          <Link href="/contact" className="group">
            <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
              <div className="text-pink-600 text-2xl mb-4">📞</div>
              <h3 className="text-xl font-semibold mb-2 group-hover:text-pink-600">联系我们</h3>
              <p className="text-gray-600 text-sm">联系方式、服务支持</p>
            </div>
          </Link>
        </div>
      </div>

      {/* 最新资讯预览 */}
      <div className="bg-white py-12">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-8">最新资讯</h2>
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-600">正在加载资讯...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {news.map((item, index) => (
                <div key={item.id} className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="h-48 bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
                    <img 
                      src={item.imageUrl} 
                      alt={item.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        target.parentElement!.innerHTML = `<div class="text-4xl text-blue-600">📰</div>`;
                      }}
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold mb-2 line-clamp-2">{item.title}</h3>
                    <p className="text-gray-600 text-sm mb-2 line-clamp-3">{item.summary}</p>
                    <div className="flex justify-between items-center text-xs text-gray-500">
                      <span>{item.publishDate}</span>
                      <span className="bg-blue-100 text-blue-600 px-2 py-1 rounded">{item.category}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="text-center mt-8">
            <Link href="/news" className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors">
              查看更多资讯
            </Link>
          </div>
        </div>
      </div>

      {/* 核心功能模块 */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-800">核心功能服务</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* 技能培训学习 */}
            <Link href="/skill-training" className="group">
              <div className="bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold mb-4 text-gray-800 group-hover:text-blue-600 transition-colors">技能培训学习</h3>
                  <p className="text-gray-600 mb-6 leading-relaxed">提供专业的技能培训课程，涵盖多个行业领域，助力个人职业发展和技能提升</p>
                  <div className="flex justify-center space-x-4 text-sm text-gray-500 mb-6">
                    <span className="flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      在线学习
                    </span>
                    <span className="flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      实践项目
                    </span>
                    <span className="flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      专家指导
                    </span>
                  </div>
                  <div className="inline-flex items-center text-blue-600 font-semibold group-hover:text-blue-700">
                    开始学习
                    <svg className="w-4 h-4 ml-2 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            </Link>

            {/* 技能等级考试 */}
            <Link href="/skill-exam" className="group">
              <div className="bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold mb-4 text-gray-800 group-hover:text-purple-600 transition-colors">技能等级考试</h3>
                  <p className="text-gray-600 mb-6 leading-relaxed">权威的技能等级认证考试，获得行业认可的专业资格证书，提升职场竞争力</p>
                  <div className="flex justify-center space-x-4 text-sm text-gray-500 mb-6">
                    <span className="flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      权威认证
                    </span>
                    <span className="flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      在线考试
                    </span>
                    <span className="flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      证书颁发
                    </span>
                  </div>
                  <div className="inline-flex items-center text-purple-600 font-semibold group-hover:text-purple-700">
                    报名考试
                    <svg className="w-4 h-4 ml-2 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* 页脚 */}
      <footer className="bg-gray-800 text-white py-8">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-lg font-semibold mb-4">联系我们</h3>
              <p className="text-gray-300 text-sm mb-2">地址：北京市朝阳区建国路88号现代城A座2008</p>
              <p className="text-gray-300 text-sm mb-2">电话：400-888-9999</p>
              <p className="text-gray-300 text-sm mb-2">邮箱：info@skillup-platform.org</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">快速链接</h3>
              <ul className="space-y-2 text-sm">
                <li><Link href="/about" className="text-gray-300 hover:text-white">关于我们</Link></li>
                <li><Link href="/news" className="text-gray-300 hover:text-white">行业资讯</Link></li>
                <li><Link href="/training" className="text-gray-300 hover:text-white">技能培训</Link></li>
                <li><Link href="/members" className="text-gray-300 hover:text-white">会员服务</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">关注我们</h3>
              <p className="text-gray-300 text-sm mb-4">扫码关注官方公众号</p>
              <div className="w-24 h-24 bg-gray-600 rounded flex items-center justify-center">
                <span className="text-2xl">📱</span>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-700 mt-8 pt-8 text-center text-sm text-gray-400">
            <p>&copy; 2024 创新技能发展促进会. 保留所有权利.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
