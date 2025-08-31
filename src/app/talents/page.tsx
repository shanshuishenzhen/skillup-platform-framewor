'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { aiDataGeneratorService } from '@/services/aiDataGeneratorService'
import type { VirtualTalent } from '@/types/virtual'

export default function TalentsPage() {
  const [talents, setTalents] = useState<VirtualTalent[]>([])
  const [loading, setLoading] = useState(true)

  const loadTalents = async () => {
    setLoading(true)
    try {
      const virtualTalents = await aiDataGeneratorService.generateTalents(8)
      setTalents(virtualTalents)
    } catch (error) {
      console.error('生成人才数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTalents()
  }, [])

  const categories = ["全部", "UI设计", "包装设计", "室内设计", "广告创意", "工业设计", "平面设计", "形象设计", "摄影"]

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
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
          <h2 className="text-2xl font-bold mb-4">人才展示</h2>
          <p className="text-blue-100 max-w-3xl mx-auto mb-6">
            AI生成的人才信息，展示多样化的专业技能和项目经验
          </p>
          <button
            onClick={loadTalents}
            disabled={loading}
            className="bg-white text-blue-600 px-6 py-2 rounded-lg font-semibold hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                生成中...
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                刷新数据
              </>
            )}
          </button>
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
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-600">正在生成人才数据...</p>
          </div>
        ) : talents.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 mb-4">暂无人才信息</p>
            <button
              onClick={loadTalents}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              重新加载
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {talents.map((talent) => (
              <div key={talent.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                <div className="h-48 bg-gray-200 flex items-center justify-center overflow-hidden">
                  <img
                    src={talent.avatar}
                    alt={talent.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.style.display = 'none'
                      target.parentElement!.innerHTML = `
                        <svg className="w-16 h-16 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                        </svg>
                      `
                    }}
                  />
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{talent.name}</h3>
                  <p className="text-blue-600 font-medium mb-2">{talent.title}</p>
                  <p className="text-gray-600 text-sm mb-3">经验：{talent.experience}</p>
                  <p className="text-gray-700 text-sm mb-4 line-clamp-3">{talent.bio}</p>
                  
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-gray-900 mb-2">核心技能</h4>
                    <div className="flex flex-wrap gap-1">
                      {talent.skills.map((skill, index) => (
                        <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-gray-900 mb-2">代表项目</h4>
                    <ul className="text-xs text-gray-600 space-y-1">
                      {talent.projects.map((project, index) => (
                        <li key={index} className="flex items-start">
                          <span className="w-1 h-1 bg-gray-400 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                          {project}
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <button className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors text-sm font-medium">
                    查看详情
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

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

        {/* 数据说明 */}
        <div className="mt-16 bg-white rounded-lg p-8 shadow-sm">
          <h2 className="text-2xl font-bold mb-8 text-center">数据说明</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-4xl mb-4">🤖</div>
              <h3 className="font-semibold mb-2">专业技能</h3>
              <p className="text-gray-600 text-sm">AI生成的专业技能标签</p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-4">🔄</div>
              <h3 className="font-semibold mb-2">工作经验</h3>
              <p className="text-gray-600 text-sm">模拟真实的工作经历</p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-4">📊</div>
              <h3 className="font-semibold mb-2">项目案例</h3>
              <p className="text-gray-600 text-sm">AI创建的项目案例</p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-4">⚠️</div>
              <h3 className="font-semibold mb-2">评价体系</h3>
              <p className="text-gray-600 text-sm">智能生成的评价体系</p>
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