'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { RefreshCw, Calendar, Tag } from 'lucide-react';
import { aiDataGeneratorService } from '@/services/aiDataGeneratorService';
import type { VirtualNews } from '@/services/aiDataGeneratorService';

export default function NewsPage() {
  const [newsData, setNewsData] = useState<VirtualNews[]>([]);
  const [filteredNews, setFilteredNews] = useState<VirtualNews[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('全部');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // 加载虚拟新闻数据
  const loadNews = async () => {
    try {
      setLoading(true);
      const virtualNews = await aiDataGeneratorService.generateNews(12);
      setNewsData(virtualNews);
      setFilteredNews(virtualNews);
    } catch (error) {
      console.error('加载新闻数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 刷新新闻数据
  const refreshNews = async () => {
    try {
      setRefreshing(true);
      const virtualNews = await aiDataGeneratorService.generateNews(12, true);
      setNewsData(virtualNews);
      setFilteredNews(virtualNews);
    } catch (error) {
      console.error('刷新新闻数据失败:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // 初始化加载
  useEffect(() => {
    loadNews();
  }, []);

  // 过滤新闻
  useEffect(() => {
    if (selectedCategory === '全部') {
      setFilteredNews(newsData);
    } else {
      setFilteredNews(newsData.filter(news => news.category === selectedCategory));
    }
  }, [newsData, selectedCategory]);

  // 获取所有分类
  const categories = ["全部", "赛事动态", "行业动态"];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 页面头部 */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">虚拟新闻资讯</h1>
              <p className="mt-2 text-gray-600">AI生成的虚拟行业动态和资讯信息</p>
            </div>
            <button
              onClick={refreshNews}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? '刷新中...' : '刷新数据'}
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* 分类筛选 */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  selectedCategory === category
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* 加载状态 */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">加载中...</span>
          </div>
        )}

        {/* 新闻列表 */}
        {!loading && (
          <div className="grid gap-6">
            {filteredNews.map((news) => (
              <div key={news.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                <div className="md:flex">
                  <div className="md:w-1/3">
                    <div className="relative w-full h-48 md:h-full">
                      <Image
                        src={news.image}
                        alt={news.title}
                        fill
                        className="object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = '/api/placeholder/400/250';
                        }}
                      />
                    </div>
                  </div>
                  <div className="md:w-2/3 p-6">
                    <div className="flex items-center space-x-4 mb-3">
                      <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                        <Tag className="w-3 h-3" />
                        {news.category}
                      </span>
                      <span className="inline-flex items-center gap-1 text-gray-500 text-sm">
                        <Calendar className="w-3 h-3" />
                        {news.date}
                      </span>
                    </div>
                    <h2 className="text-xl font-bold mb-3 text-gray-900 hover:text-blue-600 transition-colors">
                      {news.title}
                    </h2>
                    <p className="text-gray-600 mb-4 line-clamp-3">
                      {news.content}
                    </p>
                    <Link
                      href={`/news/${news.id}`}
                      className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium"
                    >
                      阅读更多
                      <svg className="ml-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        </div>

        {/* 空状态 */}
        {!loading && filteredNews.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">📰</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">暂无新闻</h3>
            <p className="text-gray-500 mb-4">当前分类下没有找到相关新闻</p>
            <button
              onClick={loadNews}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              重新加载
            </button>
          </div>
        )}

        {/* 分页 */}
        {!loading && filteredNews.length > 0 && (
          <div className="flex justify-center mt-12">
            <div className="flex space-x-2">
              <button className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
                上一页
              </button>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-md">
                1
              </button>
              <button className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
                下一页
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}