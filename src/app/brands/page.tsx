'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { aiDataGeneratorService, VirtualBrand } from '@/services/aiDataGeneratorService'

export default function BrandsPage() {
  const [brands, setBrands] = useState<VirtualBrand[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedIndustry, setSelectedIndustry] = useState('全部')

  // 加载品牌数据
  const loadBrands = async () => {
    setLoading(true)
    try {
      const virtualBrands = await aiDataGeneratorService.generateBrands(8)
      setBrands(virtualBrands)
    } catch (error) {
      console.error('加载品牌数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  // 刷新品牌数据
  const refreshBrands = () => {
    loadBrands()
  }

  useEffect(() => {
    loadBrands()
  }, [])

  // 获取所有行业分类
  const getAllIndustries = () => {
    const industries = ['全部']
    brands.forEach(brand => {
      if (!industries.includes(brand.industry)) {
        industries.push(brand.industry)
      }
    })
    return industries
  }

  // 过滤品牌
  const filteredBrands = selectedIndustry === '全部' 
    ? brands 
    : brands.filter(brand => brand.industry === selectedIndustry)

  const industries = getAllIndustries()

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      {/* 页面头部 */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center space-x-4 mb-6">
            <Link href="/" className="text-blue-600 hover:underline">首页</Link>
            <span>/</span>
            <span className="text-gray-600">品牌推荐</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-4">品牌推荐</h1>
          <p className="text-gray-600">AI生成的品牌信息，展示多样化的企业形象</p>
            </div>
            <button
              onClick={refreshBrands}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              刷新数据
            </button>
          </div>
        </div>
      </div>

      {/* 品牌推荐介绍 */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-12">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold mb-4">品牌展示</h2>
          <p className="text-blue-100 max-w-3xl mx-auto">
            AI生成的品牌信息展示平台，通过人工智能技术创造多样化的企业形象，
            展示不同行业的品牌特色和创新理念，为用户提供丰富的品牌参考案例。
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8">
            <div>
              <div className="text-3xl mb-2">🤖</div>
              <h3 className="font-semibold mb-2">AI生成</h3>
              <p className="text-blue-100">智能生成品牌信息</p>
            </div>
            <div>
              <div className="text-3xl mb-2">🎯</div>
              <h3 className="font-semibold mb-2">多样化</h3>
              <p className="text-blue-100">涵盖多个行业领域</p>
            </div>
            <div>
              <div className="text-3xl mb-2">🔄</div>
              <h3 className="font-semibold mb-2">动态更新</h3>
              <p className="text-blue-100">支持实时刷新数据</p>
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
                onClick={() => setSelectedIndustry(industry)}
                className={`px-6 py-2 rounded-full border transition-colors ${
                  selectedIndustry === industry
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'border-gray-300 hover:bg-blue-600 hover:text-white'
                }`}
              >
                {industry}
              </button>
            ))}
          </div>
        </div>

        {/* 加载状态 */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">正在加载品牌数据...</p>
          </div>
        )}

        {/* 空状态 */}
        {!loading && filteredBrands.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🏢</div>
            <h3 className="text-xl font-semibold mb-2">暂无品牌信息</h3>
            <p className="text-gray-600 mb-4">当前筛选条件下没有找到相关品牌</p>
            <button
              onClick={refreshBrands}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              重新加载
            </button>
          </div>
        )}

        {/* 品牌列表 */}
        {!loading && filteredBrands.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredBrands.map((brand) => (
            <div key={brand.id} className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-lg transition-shadow">
               <div className="h-48 bg-gray-200 relative flex items-center justify-center">
                 <img
                   src={brand.logo}
                   alt={brand.name}
                   className="w-32 h-32 object-contain rounded-lg"
                   onError={(e) => {
                     const target = e.target as HTMLImageElement
                     target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTI4IiBoZWlnaHQ9IjEyOCIgdmlld0JveD0iMCAwIDEyOCAxMjgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMjgiIGhlaWdodD0iMTI4IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik00MCA0MEg4OFY4OEg0MFY0MFoiIGZpbGw9IiNEMUQ1REIiLz4KPHN2Zz4K'
                   }}
                 />
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
                  <h4 className="font-semibold text-sm mb-2">核心服务：</h4>
                  <div className="flex flex-wrap gap-2">
                    {brand.services.map((service, index) => (
                      <span 
                        key={index}
                        className="px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded"
                      >
                        {service}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mb-6">
                  <h4 className="font-semibold text-sm mb-2">主要成就：</h4>
                  <div className="space-y-1">
                    {brand.achievements.map((achievement, index) => (
                      <div key={index} className="text-xs text-gray-500 flex items-center">
                        <span className="w-1 h-1 bg-yellow-500 rounded-full mr-2"></span>
                        {achievement}
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
         )}

        {/* 分页 */}
        {!loading && filteredBrands.length > 0 && (
          <div className="mt-12 flex justify-center">
            <div className="flex space-x-2">
              <button className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed" disabled>
                上一页
              </button>
              <button className="px-4 py-2 bg-blue-600 text-white rounded">1</button>
              <button className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed" disabled>
                下一页
              </button>
            </div>
          </div>
        )}

        {/* 品牌特色 */}
        <div className="mt-16 bg-white rounded-lg p-8 shadow-sm">
          <h2 className="text-2xl font-bold mb-8 text-center">品牌特色</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-4xl mb-4">🤖</div>
              <h3 className="font-semibold mb-2">AI智能生成</h3>
              <p className="text-gray-600 text-sm">基于AI技术生成品牌信息</p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-4">🎨</div>
              <h3 className="font-semibold mb-2">多样化设计</h3>
              <p className="text-gray-600 text-sm">涵盖各种行业和风格</p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-4">🔄</div>
              <h3 className="font-semibold mb-2">实时更新</h3>
              <p className="text-gray-600 text-sm">支持动态刷新数据</p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-4">📊</div>
              <h3 className="font-semibold mb-2">数据展示</h3>
              <p className="text-gray-600 text-sm">完整的品牌信息展示</p>
            </div>
          </div>
        </div>

        {/* 数据说明 */}
        <div className="mt-12 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">数据说明</h2>
          <p className="mb-6">本页面展示的所有品牌信息均为AI生成的数据，仅用于演示目的</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
              <div className="text-lg font-semibold mb-2">数据来源</div>
              <div className="text-xl font-bold">AI智能生成</div>
            </div>
            <div>
              <div className="text-lg font-semibold mb-2">更新频率</div>
              <div className="text-xl font-bold">实时刷新</div>
            </div>
          </div>
          <button 
            onClick={refreshBrands}
            className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
          >
            刷新数据
          </button>
        </div>
      </div>
    </div>
  )
}