'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { RefreshCw } from 'lucide-react'
import { aiDataGeneratorService, VirtualUser } from '@/services/aiDataGeneratorService'

// 为会员页面定义类型别名
type VirtualMember = VirtualUser
type VirtualEnterprise = {
  id: string
  name: string
  logo: string
  description: string
  industry: string
  features: string[]
}

/**
 * 会员页面组件
 * 展示AI生成的个人会员和企业会员信息
 */
export default function MembersPage() {
  const [personalMembers, setPersonalMembers] = useState<VirtualMember[]>([])
  const [enterpriseMembers, setEnterpriseMembers] = useState<VirtualEnterprise[]>([])
  const [loading, setLoading] = useState(true)

  /**
   * 生成企业数据
   */
  const generateEnterpriseData = (count: number): VirtualEnterprise[] => {
    const industries = ['科技', '金融', '教育', '医疗', '制造', '零售', '咨询', '媒体']
    const features = [
      ['创新技术', '专业团队', '优质服务'],
      ['资金雄厚', '风险控制', '投资专业'],
      ['教学质量', '师资力量', '课程丰富'],
      ['医疗设备', '专业医师', '服务贴心'],
      ['生产效率', '质量控制', '技术先进'],
      ['商品丰富', '价格优惠', '服务周到'],
      ['专业咨询', '经验丰富', '解决方案'],
      ['内容优质', '传播广泛', '影响力大']
    ]
    
    return Array.from({ length: count }, (_, index) => ({
      id: `enterprise-${Date.now()}-${index}`,
      name: `优秀企业${index + 1}`,
      logo: `https://trae-api-sg.mchost.guru/api/ide/v1/text_to_image?prompt=professional%20company%20logo%20modern%20design&image_size=square`,
      description: `这是一家专业的${industries[index % industries.length]}公司，致力于为客户提供优质的服务和解决方案。`,
      industry: industries[index % industries.length],
      features: features[index % features.length]
    }))
  }

  /**
   * 加载会员数据
   */
  const loadMembers = async () => {
    setLoading(true)
    try {
      const personalData = await aiDataGeneratorService.generateUsers(4, 'student')
      const enterpriseData = generateEnterpriseData(4)
      setPersonalMembers(personalData)
      setEnterpriseMembers(enterpriseData)
    } catch (error) {
      console.error('加载会员数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  /**
   * 刷新会员数据
   */
  const refreshMembers = () => {
    loadMembers()
  }

  useEffect(() => {
    loadMembers()
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      {/* 页面头部 */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center space-x-4 mb-6">
            <Link href="/" className="text-blue-600 hover:underline">首页</Link>
            <span>/</span>
            <span className="text-gray-600">会员展示</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-4">会员展示</h1>
        <p className="text-gray-600">AI生成的会员信息，展示多样化的个人和企业风采</p>
            </div>
            <button
              onClick={refreshMembers}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  生成中...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  刷新数据
                </>
              )}
            </button>
          </div>
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
          <h2 className="text-2xl font-bold mb-8 text-center">个人会员</h2>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-gray-600">正在生成会员数据...</p>
            </div>
          ) : personalMembers.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 mb-4">暂无会员信息</p>
              <button
                onClick={loadMembers}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                重新加载
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {personalMembers.map((member) => (
                <div key={member.id} className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="h-48 bg-gray-200 relative">
                    <img
                      src={member.avatar}
                      alt={member.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxjaXJjbGUgY3g9IjEwMCIgY3k9IjgwIiByPSIzMCIgZmlsbD0iIzlDQTNBRiIvPgo8cGF0aCBkPSJNNjAgMTYwQzYwIDEzNS44IDc1LjggMTIwIDEwMCAxMjBTMTQwIDEzNS44IDE0MCAxNjBINjBaIiBmaWxsPSIjOUNBM0FGIi8+Cjwvc3ZnPgo=';
                      }}
                    />
                  </div>
                  <div className="p-6">
                    <h3 className="font-semibold text-lg mb-2">{member.name}</h3>
                    <p className="text-blue-600 text-sm mb-3">{member.role === 'student' ? '学员' : member.role === 'instructor' ? '讲师' : '管理员'}</p>
                    <p className="text-gray-600 text-sm mb-4 line-clamp-3">{member.bio}</p>
                    
                    <div className="mb-4">
                      <h4 className="font-semibold text-sm mb-2">专业技能：</h4>
                      <div className="flex flex-wrap gap-1">
                        {member.skills.slice(0, 3).map((skill, index) => (
                          <span 
                            key={index}
                            className="px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded-full"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="text-blue-600 hover:underline text-sm font-medium cursor-pointer">
                      查看详情 →
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 企业风采 */}
        <div>
          <h2 className="text-2xl font-bold mb-8 text-center">企业会员</h2>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-gray-600">正在生成企业数据...</p>
            </div>
          ) : enterpriseMembers.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 mb-4">暂无企业信息</p>
              <button
                onClick={loadMembers}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                重新加载
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {enterpriseMembers.map((enterprise) => (
                <div key={enterprise.id} className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="h-48 bg-gray-200 relative">
                    <img
                      src={enterprise.logo}
                      alt={enterprise.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxyZWN0IHg9IjUwIiB5PSI3MCIgd2lkdGg9IjEwMCIgaGVpZ2h0PSI2MCIgZmlsbD0iIzlDQTNBRiIvPgo8L3N2Zz4K';
                      }}
                    />
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

                    <div className="text-blue-600 hover:underline text-sm font-medium cursor-pointer">
                      查看详情 →
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 数据说明 */}
        <div className="mt-16 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">会员数据说明</h2>
          <p className="mb-6">本页面展示的所有会员信息均为AI生成的数据</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div>
              <div className="text-3xl mb-2">✅</div>
              <h3 className="font-semibold mb-2">数据来源</h3>
              <p className="text-blue-100 text-sm">所有会员信息均由AI算法生成</p>
            </div>
            <div>
              <div className="text-3xl mb-2">🔄</div>
              <h3 className="font-semibold mb-2">更新频率</h3>
              <p className="text-blue-100 text-sm">每次刷新都会生成新的数据</p>
            </div>
            <div>
              <div className="text-3xl mb-2">📋</div>
              <h3 className="font-semibold mb-2">使用目的</h3>
              <p className="text-blue-100 text-sm">用于展示系统功能和界面设计</p>
            </div>
          </div>
          <div className="text-lg font-bold">注意：本页面所有数据均为演示信息，仅用于演示目的</div>
        </div>
      </div>
    </div>
  )
}