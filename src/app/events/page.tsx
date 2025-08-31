'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, MapPin, Users, Star, ArrowRight, Filter, Search, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { aiDataGeneratorService, VirtualEvent } from '@/services/aiDataGeneratorService';

/**
 * 活动页面组件
 * 展示AI生成的活动信息，包括会议、培训、研讨会等
 */
export default function EventsPage() {
  const [events, setEvents] = useState<VirtualEvent[]>([]);
  const [loading, setLoading] = useState(true);

  /**
   * 加载活动数据
   */
  const loadEvents = async () => {
    setLoading(true);
    try {
      const virtualEvents = await aiDataGeneratorService.generateEvents(6);
      setEvents(virtualEvents);
    } catch (error) {
      console.error('加载活动数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const categories = ['全部', '行业论坛', '技能培训', '职业发展', '技术大会', '网络研讨会'];
  const statusOptions = ['全部', '报名中', '即将开放', '已结束'];



  /**
   * 格式化价格显示
   * @param price 价格
   * @returns 格式化后的价格字符串
   */
  const formatPrice = (price: number) => {
    return price === 0 ? '免费' : `¥${price}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      {/* 页面头部 */}
      <section className="bg-white border-b">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              活动展示
            </h1>
            <p className="text-xl text-gray-600 leading-relaxed mb-6">
              AI生成的活动信息，展示多样化的会议、培训和研讨会内容
            </p>
            <Button 
              onClick={loadEvents}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  生成中...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  刷新数据
                </>
              )}
            </Button>
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
                  placeholder="搜索活动名称、主办方或关键词..."
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

          {/* 分类和状态筛选 */}
          <div className="space-y-3 mt-4">
            <div className="flex flex-wrap gap-2">
              <span className="text-sm font-medium text-gray-700 mr-2">活动类型:</span>
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
            <div className="flex flex-wrap gap-2">
              <span className="text-sm font-medium text-gray-700 mr-2">活动状态:</span>
              {statusOptions.map((status) => (
                <Button
                  key={status}
                  variant={status === '全部' ? 'default' : 'outline'}
                  size="sm"
                  className="rounded-full"
                >
                  {status}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 主要内容区域 */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-4 gap-8">
            {/* 活动列表 */}
            <div className="lg:col-span-3 space-y-8">
              {loading ? (
                <div className="text-center py-12">
                  <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
                  <p className="text-gray-600">正在生成活动数据...</p>
                </div>
              ) : events.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">暂无活动信息</h3>
                  <p className="text-gray-600 mb-4">点击下方按钮重新生成活动数据</p>
                  <Button onClick={loadEvents} className="bg-blue-600 hover:bg-blue-700">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    重新加载
                  </Button>
                </div>
              ) : (
                <>
                  {/* 精选活动 */}
                  {events.slice(0, 2).map((event) => (
                <Card key={event.id} className="overflow-hidden border-0 shadow-lg hover:shadow-xl transition-shadow">
                  <div className="md:flex">
                    <div className="md:w-2/5">
                      <div className="relative h-64 md:h-full">
                        <img
                          src={event.thumbnail}
                          alt={event.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDQwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xNzUgMTIwSDIyNVYxODBIMTc1VjEyMFoiIGZpbGw9IiM5Q0EzQUYiLz4KPHBhdGggZD0iTTE1MCAyMTBIMjUwVjIzMEgxNTBWMjEwWiIgZmlsbD0iIzlDQTNBRiIvPgo8L3N2Zz4K';
                          }}
                        />
                        <div className="absolute top-4 left-4">
                          <Badge className="bg-red-500 text-white">
                            精选活动
                          </Badge>
                        </div>
                        <div className="absolute bottom-4 right-4">
                          <div className="bg-white rounded-lg px-3 py-2 shadow-lg">
                            <div className="text-center">
                              <div className="text-2xl font-bold text-blue-600">
                                {new Date(event.startDate).getDate()}
                              </div>
                              <div className="text-xs text-gray-600">
                                {new Date(event.startDate).toLocaleDateString('zh-CN', { month: 'short' })}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="md:w-3/5 p-6">
                      <CardHeader className="p-0 mb-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">{event.category}</Badge>


                        </div>
                        <CardTitle className="text-xl font-bold hover:text-blue-600 transition-colors">
                          <Link href={`/events/${event.id}`}>
                            {event.title}
                          </Link>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-0">
                        <p className="text-gray-600 mb-4 line-clamp-2">
                          {event.description}
                        </p>
                        
                        <div className="space-y-2 mb-4">
                          <div className="flex items-center text-sm text-gray-600">
                            <Calendar className="w-4 h-4 mr-2" />
                            {event.startDate} {event.startTime}
                          </div>
                          <div className="flex items-center text-sm text-gray-600">
                            <MapPin className="w-4 h-4 mr-2" />
                            {event.location.city}
                          </div>
                          <div className="flex items-center text-sm text-gray-600">
                            <Users className="w-4 h-4 mr-2" />
                            {event.registered}人参与
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="text-2xl font-bold text-blue-600">
                            {formatPrice(event.price)}
                          </div>
                          <Link href={`/events/${event.id}`}>
                            <Button className="bg-blue-600 hover:bg-blue-700">
                              立即报名 <ArrowRight className="w-4 h-4 ml-1" />
                            </Button>
                          </Link>
                        </div>
                      </CardContent>
                    </div>
                  </div>
                </Card>
              ))}

                  {/* 普通活动列表 */}
                  <div className="grid md:grid-cols-2 gap-6">
                    {events.slice(2).map((event) => (
                  <Card key={event.id} className="overflow-hidden border-0 shadow-lg hover:shadow-xl transition-shadow group">
                    <div className="relative h-48">
                      <img
                        src={event.thumbnail}
                        alt={event.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDQwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xNzUgMTIwSDIyNVYxODBIMTc1VjEyMFoiIGZpbGw9IiM5Q0EzQUYiLz4KPHBhdGggZD0iTTE1MCAyMTBIMjUwVjIzMEgxNTBWMjEwWiIgZmlsbD0iIzlDQTNBRiIvPgo8L3N2Zz4K';
                        }}
                      />
                      <div className="absolute top-4 left-4">

                      </div>
                      <div className="absolute bottom-4 right-4">
                        <div className="bg-white rounded-lg px-2 py-1 shadow-lg">
                          <div className="text-center">
                            <div className="text-lg font-bold text-blue-600">
                              {new Date(event.startDate).getDate()}
                            </div>
                            <div className="text-xs text-gray-600">
                              {new Date(event.startDate).toLocaleDateString('zh-CN', { month: 'short' })}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="text-xs">{event.category}</Badge>

                      </div>
                      <CardTitle className="text-lg font-bold line-clamp-2 group-hover:text-blue-600 transition-colors">
                        <Link href={`/events/${event.id}`}>
                          {event.title}
                        </Link>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-gray-600 text-sm line-clamp-2 mb-3">
                        {event.description}
                      </p>
                      
                      <div className="space-y-1 mb-4 text-xs text-gray-600">
                        <div className="flex items-center">
                          <Clock className="w-3 h-3 mr-1" />
                          {event.startTime}
                        </div>
                        <div className="flex items-center">
                          <MapPin className="w-3 h-3 mr-1" />
                          {event.location.city}
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="text-lg font-bold text-blue-600">
                          {formatPrice(event.price)}
                        </div>
                        <Link href={`/events/${event.id}`}>
                          <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                            报名
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                    ))}
                  </div>
                </>
              )}
              </div>
            </div>

            {/* 侧边栏 */}
            <div className="space-y-6">
              {/* 即将开始的活动 */}
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Calendar className="w-5 h-5 mr-2 text-blue-500" />
                    即将开始
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {events.slice(0, 3).map((event) => (
                    <div key={event.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-lg flex flex-col items-center justify-center">
                        <div className="text-sm font-bold text-blue-600">
                          {new Date(event.startDate).getDate()}
                        </div>
                        <div className="text-xs text-blue-500">
                          {new Date(event.startDate).toLocaleDateString('zh-CN', { month: 'short' })}
                        </div>
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-medium line-clamp-2 hover:text-blue-600 transition-colors">
                          <Link href={`/events/${event.id}`}>
                            {event.title}
                          </Link>
                        </h4>
                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                          <MapPin className="w-3 h-3" />
                          {event.location.city}
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* 数据统计 */}
              <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50">
                <CardHeader>
                  <CardTitle className="text-lg">数据统计</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">生成活动</span>
                      <span className="text-lg font-bold text-blue-600">{events.length}场</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">参与</span>
                      <span className="text-lg font-bold text-green-600">{events.reduce((sum, event) => sum + event.registered, 0)}人</span>
                    </div>

                  </div>
                </CardContent>
              </Card>

              {/* 数据说明 */}
              <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-pink-50">
                <CardHeader>
                  <CardTitle className="text-lg">数据说明</CardTitle>
                  <p className="text-sm text-gray-600">本页面展示的所有活动信息均为AI生成的数据</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-start gap-2">
                        <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                        <div>
                          <p className="text-sm font-medium text-gray-700">数据来源</p>
                          <p className="text-xs text-gray-600">AI智能生成的活动信息</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="w-2 h-2 bg-pink-500 rounded-full mt-2 flex-shrink-0"></div>
                        <div>
                          <p className="text-sm font-medium text-gray-700">更新频率</p>
                          <p className="text-xs text-gray-600">每次刷新页面时重新生成</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="w-2 h-2 bg-indigo-500 rounded-full mt-2 flex-shrink-0"></div>
                        <div>
                          <p className="text-sm font-medium text-gray-700">使用目的</p>
                          <p className="text-xs text-gray-600">展示系统功能和界面设计</p>
                        </div>
                      </div>
                    </div>
                    <Button 
                      onClick={loadEvents}
                      disabled={loading}
                      className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                    >
                      {loading ? (
                        <>
                          <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          生成中...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2" />
                          刷新数据
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
          </div>
        </div>
      </section>
    </div>
  );
}