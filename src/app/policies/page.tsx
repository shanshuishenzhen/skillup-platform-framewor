import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Calendar, Download, Search, Filter, BookOpen, AlertCircle } from 'lucide-react';
import Link from 'next/link';

/**
 * 政策法规页面组件
 * 展示最新的政策法规、行业标准和合规指导
 */
export default function PoliciesPage() {
  // 模拟政策法规数据
  const policiesData = [
    {
      id: 1,
      title: '关于加强职业技能培训工作的指导意见',
      summary: '为深入贯彻落实党中央、国务院关于技能人才工作的决策部署，进一步加强职业技能培训工作。',
      category: '国家政策',
      department: '人力资源社会保障部',
      publishDate: '2024-01-20',
      effectiveDate: '2024-02-01',
      status: '已生效',
      importance: 'high',
      downloadUrl: '#'
    },
    {
      id: 2,
      title: '数字经济促进条例实施细则',
      summary: '为促进数字经济健康发展，规范数字经济活动，保护数字经济参与者合法权益。',
      category: '地方法规',
      department: '深圳市人民政府',
      publishDate: '2024-01-18',
      effectiveDate: '2024-03-01',
      status: '即将生效',
      importance: 'medium',
      downloadUrl: '#'
    },
    {
      id: 3,
      title: '在线教育服务规范标准',
      summary: '规范在线教育服务提供者的服务行为，保障学习者合法权益，促进在线教育健康发展。',
      category: '行业标准',
      department: '教育部',
      publishDate: '2024-01-15',
      effectiveDate: '2024-01-15',
      status: '已生效',
      importance: 'high',
      downloadUrl: '#'
    },
    {
      id: 4,
      title: '职业技能等级认定管理办法',
      summary: '为规范职业技能等级认定工作，建立健全技能人才评价体系，促进技能人才队伍建设。',
      category: '部门规章',
      department: '人力资源社会保障部',
      publishDate: '2024-01-10',
      effectiveDate: '2024-01-10',
      status: '已生效',
      importance: 'medium',
      downloadUrl: '#'
    },
    {
      id: 5,
      title: '个人信息保护法实施指南',
      summary: '为指导个人信息处理者正确理解和执行个人信息保护法，保护个人信息权益。',
      category: '法律解释',
      department: '国家网信办',
      publishDate: '2024-01-08',
      effectiveDate: '2024-01-08',
      status: '已生效',
      importance: 'high',
      downloadUrl: '#'
    }
  ];

  const categories = ['全部', '国家政策', '地方法规', '行业标准', '部门规章', '法律解释'];
  // 重要性级别选项
  // const importanceLevels = [
  //   { value: 'high', label: '重要' },
  //   { value: 'medium', label: '一般' },
  //   { value: 'low', label: '参考' }
  // ]

  /**
   * 获取重要性标签样式
   * @param importance 重要性级别
   * @returns 样式类名
   */
  const getImportanceBadge = (importance: string) => {
    switch (importance) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  /**
   * 获取状态标签样式
   * @param status 状态
   * @returns 样式类名
   */
  const getStatusBadge = (status: string) => {
    switch (status) {
      case '已生效':
        return 'bg-green-100 text-green-800';
      case '即将生效':
        return 'bg-blue-100 text-blue-800';
      case '征求意见':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 页面头部 */}
      <section className="bg-white border-b">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              政策法规
            </h1>
            <p className="text-xl text-gray-600 leading-relaxed">
              及时了解最新政策动态，确保合规经营，把握发展机遇
            </p>
          </div>
        </div>
      </section>

      {/* 搜索和筛选 */}
      <section className="bg-white border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* 搜索框 */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="搜索政策法规标题、内容或发布部门..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            {/* 筛选按钮 */}
            <div className="flex gap-2">
              <Button variant="outline" className="flex items-center">
                <Filter className="w-4 h-4 mr-2" />
                筛选
              </Button>
              <Button variant="outline">
                排序
              </Button>
            </div>
          </div>

          {/* 分类标签 */}
          <div className="flex flex-wrap gap-2 mt-4">
            {categories.map((category) => (
              <Button
                key={category}
                variant={category === '全部' ? 'default' : 'outline'}
                size="sm"
                className="rounded-full"
              >
                {category}
              </Button>
            ))}
          </div>
        </div>
      </section>

      {/* 主要内容区域 */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-4 gap-8">
            {/* 政策法规列表 */}
            <div className="lg:col-span-3 space-y-6">
              {policiesData.map((policy) => (
                <Card key={policy.id} className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-3">
                          <Badge variant="outline">{policy.category}</Badge>
                          <Badge className={getStatusBadge(policy.status)}>
                            {policy.status}
                          </Badge>
                          <Badge className={getImportanceBadge(policy.importance)}>
                            {policy.importance === 'high' ? '重要' : policy.importance === 'medium' ? '一般' : '参考'}
                          </Badge>
                        </div>
                        <CardTitle className="text-xl font-bold hover:text-blue-600 transition-colors mb-2">
                          <Link href={`/policies/${policy.id}`}>
                            {policy.title}
                          </Link>
                        </CardTitle>
                        <CardDescription className="text-gray-600 leading-relaxed">
                          {policy.summary}
                        </CardDescription>
                      </div>
                      <div className="ml-4">
                        <FileText className="w-8 h-8 text-blue-500" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 gap-4 mb-4">
                      <div className="space-y-2">
                        <div className="flex items-center text-sm text-gray-600">
                          <span className="font-medium w-20">发布部门:</span>
                          <span>{policy.department}</span>
                        </div>
                        <div className="flex items-center text-sm text-gray-600">
                          <Calendar className="w-4 h-4 mr-2" />
                          <span className="font-medium w-16">发布日期:</span>
                          <span>{policy.publishDate}</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center text-sm text-gray-600">
                          <span className="font-medium w-20">生效日期:</span>
                          <span>{policy.effectiveDate}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between pt-4 border-t">
                      <Link href={`/policies/${policy.id}`}>
                        <Button variant="outline" size="sm">
                          <BookOpen className="w-4 h-4 mr-2" />
                          查看详情
                        </Button>
                      </Link>
                      <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700">
                        <Download className="w-4 h-4 mr-2" />
                        下载文件
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* 侧边栏 */}
            <div className="space-y-6">
              {/* 重要提醒 */}
              <Card className="border-0 shadow-lg bg-gradient-to-br from-red-50 to-orange-50">
                <CardHeader>
                  <CardTitle className="flex items-center text-red-700">
                    <AlertCircle className="w-5 h-5 mr-2" />
                    重要提醒
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm">
                    <div className="p-3 bg-white rounded-lg border border-red-200">
                      <p className="font-medium text-red-800 mb-1">新政策即将生效</p>
                      <p className="text-red-600">《数字经济促进条例实施细则》将于3月1日正式生效</p>
                    </div>
                    <div className="p-3 bg-white rounded-lg border border-orange-200">
                      <p className="font-medium text-orange-800 mb-1">征求意见中</p>
                      <p className="text-orange-600">《在线培训服务管理办法》正在征求社会意见</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 政策分类 */}
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle>政策分类</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {categories.slice(1).map((category) => (
                      <div key={category} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                        <span className="text-sm font-medium">{category}</span>
                        <Badge variant="secondary" className="text-xs">
                          {Math.floor(Math.random() * 20) + 5}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* 订阅更新 */}
              <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50">
                <CardHeader>
                  <CardTitle className="text-lg">政策订阅</CardTitle>
                  <CardDescription>
                    订阅政策更新通知，第一时间了解最新法规动态
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">选择关注领域:</label>
                      <div className="space-y-1">
                        {['职业教育', '数字经济', '人才培养', '行业标准'].map((field) => (
                          <label key={field} className="flex items-center">
                            <input type="checkbox" className="mr-2" />
                            <span className="text-sm">{field}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <input
                      type="email"
                      placeholder="请输入您的邮箱"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <Button className="w-full bg-blue-600 hover:bg-blue-700">
                      订阅更新
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}