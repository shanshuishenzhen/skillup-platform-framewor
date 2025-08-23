'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { RefreshCw, Users, Calendar } from 'lucide-react'
import { aiDataGeneratorService } from '@/services/aiDataGeneratorService'
import type { VirtualCommittee } from '@/types/virtual'

export default function CommitteesPage() {
  const [committees, setCommittees] = useState<VirtualCommittee[]>([])
  const [loading, setLoading] = useState(true)

  // 加载委员会数据
  const loadCommittees = async () => {
    setLoading(true)
    try {
      const data = await aiDataGeneratorService.generateCommittees(8)
      setCommittees(data)
    } catch (error) {
      console.error('加载委员会数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  // 刷新委员会数据
  const refreshCommittees = () => {
    loadCommittees()
  }

  useEffect(() => {
    loadCommittees()
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 页面头部 */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center space-x-4 mb-6">
            <Link href="/" className="text-blue-600 hover:underline">首页</Link>
            <span>/</span>
            <span className="text-gray-600">虚拟专业委员会</span>
          </div>
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold mb-4">虚拟专业委员会</h1>
              <p className="text-gray-600">AI生成的虚拟专业委员会信息，展示多样化的组织架构</p>
            </div>
            <button
              onClick={refreshCommittees}
              disabled={loading}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>刷新数据</span>
            </button>
          </div>
        </div>
      </div>

      {/* 委员会介绍 */}
      <div className="bg-blue-600 text-white py-12">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold mb-4">虚拟委员会介绍</h2>
          <p className="text-blue-100 max-w-3xl mx-auto">
            本页面展示AI生成的虚拟专业委员会信息，涵盖多个专业领域的组织架构。
            这些虚拟委员会数据用于演示不同类型的专业组织形式，展示多样化的委员会结构和活动内容。
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        {/* 委员会列表 */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-600">正在加载虚拟委员会数据...</p>
          </div>
        ) : committees.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="text-gray-400 mb-4">
              <Users className="w-16 h-16" />
            </div>
            <p className="text-gray-600 mb-4">暂无委员会信息</p>
            <button
              onClick={refreshCommittees}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              重新加载
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {committees.map((committee) => (
              <div key={committee.id} className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-lg transition-shadow">
                <div className="h-48 bg-gradient-to-br from-blue-50 to-purple-50 relative flex items-center justify-center">
                  <img
                    src={committee.image}
                    alt={committee.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.style.display = 'none'
                      target.nextElementSibling!.classList.remove('hidden')
                    }}
                  />
                  <div className="hidden absolute inset-0 flex items-center justify-center">
                    <svg className="w-16 h-16 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="absolute top-4 right-4">
                    <span className="px-3 py-1 text-xs font-semibold text-white bg-blue-600 rounded-full flex items-center space-x-1">
                      <Users className="w-3 h-3" />
                      <span>{committee.memberCount}</span>
                    </span>
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="font-semibold text-xl mb-3">{committee.name}</h3>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-3">{committee.description}</p>
                  
                  <div className="mb-6">
                    <h4 className="font-semibold text-sm mb-2 flex items-center">
                      <Calendar className="w-4 h-4 mr-1" />
                      主要活动：
                    </h4>
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
        )}

        {/* 虚拟委员会特色 */}
        <div className="mt-16 bg-white rounded-lg p-8 shadow-sm">
          <h2 className="text-2xl font-bold mb-8 text-center">虚拟委员会特色</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-4xl mb-4">🤖</div>
              <h3 className="font-semibold mb-2">AI生成</h3>
              <p className="text-gray-600 text-sm">智能生成多样化的委员会信息</p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-4">🔄</div>
              <h3 className="font-semibold mb-2">动态更新</h3>
              <p className="text-gray-600 text-sm">支持实时刷新和数据更新</p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-4">🎨</div>
              <h3 className="font-semibold mb-2">多样展示</h3>
              <p className="text-gray-600 text-sm">展示不同类型的组织架构</p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-4">📊</div>
              <h3 className="font-semibold mb-2">数据演示</h3>
              <p className="text-gray-600 text-sm">用于演示和测试目的</p>
            </div>
          </div>
        </div>

        {/* 虚拟数据说明 */}
        <div className="mt-12 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">虚拟数据说明</h2>
          <p className="mb-6">本页面展示的所有委员会信息均为AI生成的虚拟数据</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div>
              <div className="text-lg font-semibold mb-2">数据来源</div>
              <p className="text-blue-100 text-sm">AI智能生成的虚拟委员会信息</p>
            </div>
            <div>
              <div className="text-lg font-semibold mb-2">更新频率</div>
              <p className="text-blue-100 text-sm">支持实时刷新和动态更新</p>
            </div>
            <div>
              <div className="text-lg font-semibold mb-2">使用目的</div>
              <p className="text-blue-100 text-sm">演示展示、测试开发、界面预览</p>
            </div>
          </div>
          <button 
            onClick={loadCommittees}
            className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
          >
            刷新虚拟数据
          </button>
        </div>
      </div>
    </div>
  )
}