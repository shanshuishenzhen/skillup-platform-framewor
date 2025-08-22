import Link from 'next/link'

export default function ContactPage() {
  const contactInfo = [
    {
      title: "会员加入",
      phone: "18128859099",
      description: "会员申请、会员服务咨询"
    },
    {
      title: "商务洽谈",
      phone: "18503020169",
      description: "商务合作、项目洽谈"
    },
    {
      title: "课程服务",
      phone: "18923703302",
      description: "培训课程、学习咨询"
    },
    {
      title: "培训服务",
      phone: "18128859061",
      description: "职业技能培训、认证考试"
    },
    {
      title: "报考咨询",
      phone: "18823319017",
      description: "考试报名、资格认证"
    }
  ]

  const departments = [
    {
      name: "秘书处",
      description: "协会日常事务管理",
      contact: "18128859099"
    },
    {
      name: "培训部",
      description: "职业技能培训管理",
      contact: "18128859061"
    },
    {
      name: "会员部",
      description: "会员服务与管理",
      contact: "18128859099"
    },
    {
      name: "竞赛部",
      description: "职业技能竞赛组织",
      contact: "18503020169"
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
            <span className="text-gray-600">联系我们</span>
          </div>
          <h1 className="text-3xl font-bold mb-4">联系我们</h1>
          <p className="text-gray-600">欢迎与我们联系，我们期待为您提供专业服务</p>
        </div>
      </div>

      {/* 联系信息 */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-12">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold mb-8">联系方式</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            {contactInfo.map((info, index) => (
              <div key={index} className="bg-white bg-opacity-10 rounded-lg p-6">
                <h3 className="font-semibold text-lg mb-2">{info.title}</h3>
                <div className="text-2xl font-bold mb-2">{info.phone}</div>
                <p className="text-blue-100 text-sm">{info.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* 地址信息 */}
          <div>
            <h2 className="text-2xl font-bold mb-6">地址信息</h2>
            <div className="bg-white rounded-lg p-8 shadow-sm">
              <div className="mb-6">
                <h3 className="font-semibold text-lg mb-4">办公地址</h3>
                <p className="text-gray-600 mb-2">广东省深圳市龙岗区中粮祥云2A2605</p>
                <p className="text-gray-600">邮编：518000</p>
              </div>
              
              <div className="mb-6">
                <h3 className="font-semibold text-lg mb-4">交通指南</h3>
                <div className="space-y-2 text-gray-600">
                  <p><strong>地铁：</strong>3号线龙岗线，龙岗站下车</p>
                  <p><strong>公交：</strong>龙岗大道站，多条公交线路可达</p>
                  <p><strong>自驾：</strong>导航至&quot;龙岗大道雅商综合楼&quot;</p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-4">办公时间</h3>
                <div className="space-y-2 text-gray-600">
                  <p><strong>周一至周五：</strong>9:00-18:00</p>
                  <p><strong>周六：</strong>9:00-17:00</p>
                  <p><strong>周日：</strong>休息</p>
                </div>
              </div>
            </div>
          </div>

          {/* 部门联系 */}
          <div>
            <h2 className="text-2xl font-bold mb-6">部门联系</h2>
            <div className="space-y-4">
              {departments.map((dept, index) => (
                <div key={index} className="bg-white rounded-lg p-6 shadow-sm">
                  <h3 className="font-semibold text-lg mb-2">{dept.name}</h3>
                  <p className="text-gray-600 mb-3">{dept.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-blue-600 font-semibold">{dept.contact}</span>
                    <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors">
                      联系
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 在线留言 */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold mb-6 text-center">在线留言</h2>
          <div className="max-w-2xl mx-auto bg-white rounded-lg p-8 shadow-sm">
            <form className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">姓名</label>
                  <input 
                    type="text" 
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="请输入您的姓名"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">电话</label>
                  <input 
                    type="tel" 
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="请输入您的联系电话"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">邮箱</label>
                <input 
                  type="email" 
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="请输入您的邮箱地址"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">咨询类型</label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option>请选择咨询类型</option>
                  <option>会员申请</option>
                  <option>培训课程</option>
                  <option>商务合作</option>
                  <option>考试报名</option>
                  <option>其他咨询</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">留言内容</label>
                <textarea 
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="请输入您的留言内容"
                ></textarea>
              </div>

              <div className="text-center">
                <button 
                  type="submit"
                  className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                >
                  提交留言
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* 关注我们 */}
        <div className="mt-12 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg p-8 text-center">
          <h2 className="text-2xl font-bold mb-6">关注我们</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <div className="text-4xl mb-4">📱</div>
              <h3 className="font-semibold text-lg mb-2">微信公众号</h3>
              <p className="text-blue-100">关注我们的公众号，获取最新资讯</p>
            </div>
            <div>
              <div className="text-4xl mb-4">💻</div>
              <h3 className="font-semibold text-lg mb-2">学习平台</h3>
              <p className="text-blue-100">访问我们的在线学习平台</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}