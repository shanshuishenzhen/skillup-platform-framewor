'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
// import { aiDataGeneratorService, VirtualNews } from '@/services/aiDataGeneratorService'

export default function HomePage() {
  const [news, setNews] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 使用静态新闻数据
    setNews([
      {
        id: '1',
        title: '2024年技能提升计划正式启动',
        summary: '为提升全行业技能水平，新一轮技能提升计划正式启动，涵盖多个专业领域。',
        publishedAt: new Date().toISOString(),
        category: '政策解读',
        thumbnail: 'https://trae-api-sg.mchost.guru/api/ide/v1/text_to_image?prompt=professional%20training%20program&image_size=landscape_4_3',
        readTime: 5,
        author: {
          name: '政策研究部',
          avatar: 'https://trae-api-sg.mchost.guru/api/ide/v1/text_to_image?prompt=professional%20avatar&image_size=square',
          title: '政策分析师'
        }
      },
      {
        id: '2', 
        title: '行业数字化转型加速推进',
        summary: '随着技术不断发展，各行业数字化转型步伐加快，对专业人才需求持续增长。',
        publishedAt: new Date(Date.now() - 86400000).toISOString(),
        category: '行业动态',
        thumbnail: 'https://trae-api-sg.mchost.guru/api/ide/v1/text_to_image?prompt=digital%20transformation&image_size=landscape_4_3',
        readTime: 8,
        author: {
          name: '行业分析师',
          avatar: 'https://trae-api-sg.mchost.guru/api/ide/v1/text_to_image?prompt=business%20analyst%20avatar&image_size=square',
          title: '高级分析师'
        }
      },
      {
        id: '3',
        title: '新技能认证标准发布',
        summary: '最新的技能认证标准正式发布，为行业人才评价提供更科学的依据。',
        publishedAt: new Date(Date.now() - 172800000).toISOString(),
        category: '标准发布',
        thumbnail: 'https://trae-api-sg.mchost.guru/api/ide/v1/text_to_image?prompt=certification%20standards&image_size=landscape_4_3',
        readTime: 6,
        author: {
          name: '标准委员会',
          avatar: 'https://trae-api-sg.mchost.guru/api/ide/v1/text_to_image?prompt=committee%20avatar&image_size=square',
          title: '标准制定专家'
        }
      }
    ])
    setLoading(false)
  }, [])

  const refreshData = async () => {
    setLoading(true)
    // 模拟刷新延迟
    setTimeout(() => {
      // 重新生成资讯数据
      generateVirtualNews()
      setLoading(false)
    }, 1000)
  }
  const generateVirtualNews = () => {
    // 重新生成虚拟新闻数据的逻辑
    setNews([
      {
        id: '1',
        title: '2024年技能提升计划正式启动',
        summary: '为提升全行业技能水平，新一轮技能提升计划正式启动，涵盖多个专业领域。',
        publishedAt: new Date().toISOString(),
        category: '政策解读',
        thumbnail: 'https://trae-api-sg.mchost.guru/api/ide/v1/text_to_image?prompt=professional%20training%20program&image_size=landscape_4_3',
        readTime: 5,
        author: {
          name: '政策研究部',
          avatar: 'https://trae-api-sg.mchost.guru/api/ide/v1/text_to_image?prompt=professional%20avatar&image_size=square',
          title: '政策分析师'
        }
      },
      {
        id: '2', 
        title: '行业数字化转型加速推进',
        summary: '随着技术不断发展，各行业数字化转型步伐加快，对专业人才需求持续增长。',
        publishedAt: new Date(Date.now() - 86400000).toISOString(),
        category: '行业动态',
        thumbnail: 'https://trae-api-sg.mchost.guru/api/ide/v1/text_to_image?prompt=digital%20transformation&image_size=landscape_4_3',
        readTime: 8,
        author: {
          name: '行业分析师',
          avatar: 'https://trae-api-sg.mchost.guru/api/ide/v1/text_to_image?prompt=business%20analyst%20avatar&image_size=square',
          title: '高级分析师'
        }
      },
      {
        id: '3',
        title: '新技能认证标准发布',
        summary: '最新的技能认证标准正式发布，为行业人才评价提供更科学的依据。',
        publishedAt: new Date(Date.now() - 172800000).toISOString(),
        category: '标准发布',
        thumbnail: 'https://trae-api-sg.mchost.guru/api/ide/v1/text_to_image?prompt=certification%20standards&image_size=landscape_4_3',
        readTime: 6,
        author: {
          name: '标准委员会',
          avatar: 'https://trae-api-sg.mchost.guru/api/ide/v1/text_to_image?prompt=committee%20avatar&image_size=square',
          title: '标准制定专家'
        }
      }
    ])
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 头部横幅 */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-4">深圳市融略信息科技有限公司</h1>
            <p className="text-lg opacity-90 leading-relaxed mb-6 max-w-4xl mx-auto">
              以专业的咨询定制化培训方案为核心，致力于为企业提供精准的信息技术咨询与企业管理培训服务。
            </p>
            <button
              onClick={refreshData}
              disabled={loading}
              className="bg-white text-blue-600 px-6 py-3 rounded-lg font-medium hover:bg-blue-50 transition-colors disabled:opacity-50 shadow-md"
            >
              🔄 刷新数据
            </button>
          </div>
        </div>
      </div>

      {/* 最新资讯预览 */}
      <div className="bg-white py-8">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-center mb-6">最新资讯</h2>
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-gray-600 text-base">正在加载资讯...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* 政策法规卡片 */}
              <Link href="/policies" className="group">
                <div className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="h-32 bg-gradient-to-br from-red-500 to-red-600 relative overflow-hidden">
                    <div className="absolute inset-0 bg-black bg-opacity-20"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-white">
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold mb-1 line-clamp-2 group-hover:text-red-600 transition-colors text-sm">企业文化政策法规</h3>
                    <p className="text-gray-600 text-xs mb-1 line-clamp-2">最新的政策法规、行业标准和合规指导，助力企业规范发展</p>
                    <div className="flex justify-between items-center text-xs text-gray-500">
                      <span>政策法规</span>
                      <span className="bg-red-100 text-red-600 px-1 py-0.5 rounded text-xs">查看详情</span>
                    </div>
                  </div>
                </div>
              </Link>

              {/* 资讯卡片 */}
              {news.map((item, index) => (
                <div key={item.id} className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="h-32 bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center relative overflow-hidden">
                    <img
                      src={item.thumbnail}
                      alt={item.title}
                      className="absolute inset-0 w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        target.parentElement!.innerHTML = `<div class="absolute inset-0 flex items-center justify-center"><div class="text-4xl text-blue-600">📰</div></div>`;
                      }}
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold mb-1 line-clamp-2 text-sm">{item.title}</h3>
                    <p className="text-gray-600 text-xs mb-1 line-clamp-2">{item.summary}</p>
                    <div className="flex justify-between items-center text-xs text-gray-500">
                      <span>{new Date(item.publishedAt).toLocaleDateString('zh-CN')}</span>
                      <span className="bg-blue-100 text-blue-600 px-1 py-0.5 rounded text-xs">{item.category}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="text-center mt-8">
            <Link href="/news" className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors text-base font-medium shadow-md">
              查看更多资讯
            </Link>
          </div>
        </div>
      </div>

      {/* 主要导航区域 - 3个核心功能模块 */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">核心功能模块</h2>
          <p className="text-base text-gray-600 max-w-3xl mx-auto leading-relaxed">
            专业的企业管理和技能提升平台，为您提供全方位的学习和管理服务
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* 在线学习 */}
          <Link href="/skill-training" className="group">
            <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 overflow-hidden">
              <div className="h-24 bg-gradient-to-br from-blue-500 to-blue-600 relative overflow-hidden">
                <div className="absolute inset-0 bg-black bg-opacity-20"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-white">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.84L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z"/>
                    </svg>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <h3 className="text-lg font-bold mb-3 text-gray-800 group-hover:text-blue-600 transition-colors">在线学习</h3>
                <p className="text-gray-600 mb-4 text-sm leading-relaxed">专业的技能培训课程，涵盖多个行业领域，助力个人职业发展</p>
                <div className="flex items-center text-blue-600 font-semibold group-hover:text-blue-700">
                  <span className="mr-2 text-sm">开始学习</span>
                  <svg className="w-3 h-3 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
              </div>
            </div>
          </Link>

          {/* 在线考试 */}
          <Link href="/skill-exam" className="group">
            <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 overflow-hidden">
              <div className="h-24 bg-gradient-to-br from-green-500 to-green-600 relative overflow-hidden">
                <div className="absolute inset-0 bg-black bg-opacity-20"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-white">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <h3 className="text-lg font-bold mb-3 text-gray-800 group-hover:text-green-600 transition-colors">在线考试</h3>
                <p className="text-gray-600 mb-4 text-sm leading-relaxed">专业的技能等级认证考试，获得权威认证，提升职业竞争力</p>
                <div className="flex items-center text-green-600 font-semibold group-hover:text-green-700">
                  <span className="mr-2 text-sm">参加考试</span>
                  <svg className="w-3 h-3 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
              </div>
            </div>
          </Link>

          {/* 企业OA */}
          <Link href="/oa" className="group">
            <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 overflow-hidden">
              <div className="h-24 bg-gradient-to-br from-purple-500 to-purple-600 relative overflow-hidden">
                <div className="absolute inset-0 bg-black bg-opacity-20"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-white">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4zM18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" />
                    </svg>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <h3 className="text-lg font-bold mb-3 text-gray-800 group-hover:text-purple-600 transition-colors">企业OA</h3>
                <p className="text-gray-600 mb-4 text-sm leading-relaxed">全面的办公自动化系统，包含项目管理、人事管理等企业管理功能</p>
                <div className="flex items-center text-purple-600 font-semibold group-hover:text-purple-700">
                  <span className="mr-2 text-sm">进入系统</span>
                  <svg className="w-3 h-3 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
              </div>
            </div>
          </Link>
        </div>
      </div>

    </div>
  )
}
