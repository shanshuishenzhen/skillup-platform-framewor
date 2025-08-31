'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Search, Filter, Clock, Users, Star, RefreshCw } from 'lucide-react';
import { aiDataGeneratorService } from '@/services/aiDataGeneratorService';
import type { VirtualCourse } from '@/services/aiDataGeneratorService';

const categories = [
  { id: 'all', name: '全部分类' },
  { id: 'technology', name: '科技创新' },
  { id: 'management', name: '管理培训' },
  { id: 'finance', name: '金融投资' },
  { id: 'marketing', name: '市场营销' },
  { id: 'design', name: '设计创意' },
  { id: 'language', name: '语言学习' },
  { id: 'health', name: '健康养生' }
];

const levels = [
  { id: 'all', name: '全部级别' },
  { id: '入门', name: '入门' },
  { id: '进阶', name: '进阶' },
  { id: '专业', name: '专业' },
  { id: '大师', name: '大师' }
];

export default function CoursesPage() {
  const [courses, setCourses] = useState<VirtualCourse[]>([]);
  const [allCourses, setAllCourses] = useState<VirtualCourse[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedLevel, setSelectedLevel] = useState('all');
  const [sortBy, setSortBy] = useState('popular');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // 加载课程数据
  const loadCourses = async () => {
    try {
      setLoading(true);
      const virtualCourses = await aiDataGeneratorService.generateCourses(12);
      setAllCourses(virtualCourses);
      setCourses(virtualCourses);
    } catch (error) {
      console.error('生成课程数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 刷新课程数据
  const refreshCourses = async () => {
    try {
      setRefreshing(true);
      // 清除缓存并重新生成
      const virtualCourses = await aiDataGeneratorService.generateCourses(12);
      setAllCourses(virtualCourses);
      setCourses(virtualCourses);
    } catch (error) {
      console.error('刷新课程数据失败:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // 初始化加载
  useEffect(() => {
    loadCourses();
  }, []);

  // 过滤和排序课程
  useEffect(() => {
    const filteredCourses = allCourses.filter(course => {
      const matchesSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           course.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || course.category === selectedCategory;
      const matchesLevel = selectedLevel === 'all' || course.level === selectedLevel;
      
      return matchesSearch && matchesCategory && matchesLevel;
    });

    // 排序
    switch (sortBy) {
      case 'popular':
        filteredCourses.sort((a, b) => b.studentsCount - a.studentsCount);
        break;
      case 'rating':
        filteredCourses.sort((a, b) => b.rating - a.rating);
        break;
      case 'price-low':
        filteredCourses.sort((a, b) => a.price - b.price);
        break;
      case 'price-high':
        filteredCourses.sort((a, b) => b.price - a.price);
        break;
      default:
        break;
    }

    setCourses(filteredCourses);
  }, [allCourses, searchTerm, selectedCategory, selectedLevel, sortBy]);

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center gap-4 mb-4">
              <h1 className="text-4xl font-bold">课程中心</h1>
              <button
                onClick={refreshCourses}
                disabled={refreshing}
                className="bg-white/20 hover:bg-white/30 text-white p-2 rounded-lg transition-colors duration-200 disabled:opacity-50"
                title="刷新数据"
              >
                <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
            <p className="text-xl text-blue-100 mb-8">
              探索无限可能，与顶尖导师共同成长，开启您的学习之旅
            </p>
            
            {/* 搜索框 */}
            <div className="max-w-2xl mx-auto relative">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="搜索课程..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 过滤器和排序 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-500" />
              <span className="font-medium text-gray-700">筛选：</span>
            </div>
            
            {/* 分类筛选 */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>

            {/* 级别筛选 */}
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {levels.map(level => (
                <option key={level.id} value={level.id}>
                  {level.name}
                </option>
              ))}
            </select>

            {/* 排序 */}
            <div className="ml-auto flex items-center gap-2">
              <span className="font-medium text-gray-700">排序：</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="popular">最受欢迎</option>
                <option value="rating">评分最高</option>
                <option value="price-low">价格从低到高</option>
                <option value="price-high">价格从高到低</option>
              </select>
            </div>
          </div>
        </div>

        {/* 加载状态 */}
        {loading && (
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-600">正在生成课程数据...</p>
          </div>
        )}

        {/* 课程列表 */}
        {!loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {courses.map(course => (
              <div key={course.id} className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-300">
                <div className="relative">
                  <Image
                    src={course.thumbnail}
                    alt={course.title}
                    width={300}
                    height={200}
                    unoptimized
                    className="w-full h-48 object-cover rounded-t-lg"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = 'https://trae-api-sg.mchost.guru/api/ide/v1/text_to_image?prompt=modern%20online%20course%20learning%20education%20technology&image_size=landscape_4_3';
                    }}
                  />
                  <div className="absolute top-4 left-4">
                    <span className="bg-blue-600 text-white px-2 py-1 rounded text-sm font-medium">
                      {course.level}
                    </span>
                  </div>
                  <div className="absolute top-4 right-4">
                    <span className="bg-green-500 text-white px-2 py-1 rounded text-sm font-medium">
                      {course.category}
                    </span>
                  </div>
                </div>
                
                <div className="p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {course.title}
                  </h3>
                  <p className="text-gray-600 mb-4 line-clamp-3">
                    {course.description}
                  </p>
                  
                  <div className="flex items-center text-sm text-gray-500 mb-4">
                    <span className="mr-4">导师：{course.instructor.name}</span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                    <div className="flex items-center">
                      <Clock className="w-4 h-4 mr-1" />
                      <span>{course.duration}</span>
                    </div>
                    <div className="flex items-center">
                      <Users className="w-4 h-4 mr-1" />
                      <span>{course.studentsCount.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center">
                      <Star className="w-4 h-4 mr-1 text-yellow-400 fill-current" />
                      <span>{course.rating}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="text-2xl font-bold text-blue-600">
                      ¥{course.price}
                    </div>
                    <Link
                      href={`/courses/${course.id}`}
                      className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200"
                    >
                      开始学习
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 空状态 */}
        {!loading && courses.length === 0 && (
          <div className="text-center py-16">
            <div className="text-gray-400 mb-4">
              <Search className="w-16 h-16 mx-auto" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              未找到相关课程
            </h3>
            <p className="text-gray-600 mb-4">
              请尝试调整搜索条件或筛选器
            </p>
            <button
              onClick={refreshCourses}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200"
            >
              重新加载课程
            </button>
          </div>
        )}
      </div>
    </div>
  );
}